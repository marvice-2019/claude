import { createServer } from "node:http";
import { loadConfig, razorpayReady } from "./config.js";
import { crm, mailer, razorpay, supabase } from "./clients.js";
import {
  PLANS, applySubscriptionEvent, parseSignup, subscribeToken, subscriptionStartAt,
  sweepAction, trialEndsAt, verifyRazorpaySignature, verifySubscribeToken,
} from "./logic.js";
import { landingPage, messagePage, reminderEmail, subscribePage, trialStartedPage, welcomeEmail } from "./pages.js";

const cfg = loadConfig();
const log = (msg, extra = {}) => console.log(JSON.stringify({ ts: new Date().toISOString(), msg, ...extra }));
const db = supabase(cfg);
const crmApi = crm(cfg);
const mail = mailer(cfg, log);
const rzp = razorpay(cfg);

const subscribeUrl = (orgId) => `${cfg.publicUrl}/subscribe?org=${orgId}&t=${subscribeToken(orgId, cfg.linkSecret)}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

// Abuse guard on public sign-ups: 5 per IP per hour (in memory; one instance).
const signupHits = new Map();
function allowSignup(ip) {
  const now = Date.now();
  const hits = (signupHits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (hits.length >= 5) return false;
  hits.push(now);
  signupHits.set(ip, hits);
  return true;
}

async function readBody(req, limit = 256 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error("body too large"), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

const send = (res, status, body, type = "text/html; charset=utf-8", headers = {}) => {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", ...headers });
  res.end(body);
};

async function startTrial(req, res) {
  const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "").split(",")[0].trim();
  const form = Object.fromEntries(new URLSearchParams((await readBody(req, 16 * 1024)).toString("utf8")));
  const { value, errors } = parseSignup(form);
  if (errors.length) return send(res, 400, landingPage({ errors, values: value }));
  if (!allowSignup(ip)) return send(res, 429, landingPage({ errors: ["Too many sign-ups from this network. Try again in an hour."], values: value }));

  let orgId;
  try {
    orgId = await crmApi.provision(value);
  } catch (err) {
    if (err.status === 409) {
      return send(res, 409, landingPage({ errors: ["This email already has a Marvice CRM account. Sign in instead, or use another email."], values: value }));
    }
    throw err;
  }
  // Provisioning is idempotent per email: a repeat sign-up returns the same workspace.
  // Never hand out a fresh password link for a workspace that already exists (account takeover).
  if (await db.getAccount(orgId)) {
    return send(res, 409, landingPage({ errors: ["This email already has a Marvice CRM workspace. Sign in, or use “Forgot password” on the login page."], values: value }));
  }
  const trialEnd = trialEndsAt(new Date());
  await db.insertAccount({ org_id: orgId, plan: value.plan, status: "trialing", business_name: value.business_name,
    owner_name: value.owner_name, owner_email: value.owner_email, phone: value.phone || null, trial_ends_at: trialEnd.toISOString() });
  const link = await db.passwordLink(value.owner_email);
  await Promise.allSettled([db.setOrgLocale(orgId, "en"), link.userId ? db.setUserLocale(link.userId, "en") : null]);
  log("trial started", { orgId, plan: value.plan });

  const page = { businessName: value.business_name, trialEnds: fmtDate(trialEnd), subscribeUrl: subscribeUrl(orgId) };
  // With email configured, the link goes to the inbox — which also proves the person owns the address.
  const emailed = await mail.send({
    to: value.owner_email, subject: "Your Marvice CRM workspace is ready",
    html: welcomeEmail({ ownerName: value.owner_name, businessName: value.business_name, passwordUrl: link.url, trialEnds: page.trialEnds, subscribeUrl: page.subscribeUrl }),
  }).catch((e) => { log("welcome email failed", { orgId, error: e.message }); return false; });
  return send(res, 200, trialStartedPage({ ...page, passwordUrl: emailed ? null : link.url, emailedTo: emailed ? value.owner_email : null }));
}

async function subscribe(req, res, url) {
  const orgId = url.searchParams.get("org") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(orgId) || !verifySubscribeToken(orgId, url.searchParams.get("t"), cfg.linkSecret)) {
    return send(res, 404, messagePage("Link not valid", "This subscribe link is incomplete or expired. Contact Marvice for a new one."));
  }
  const acc = await db.getAccount(orgId);
  if (!acc) return send(res, 404, messagePage("Account not found", "We couldn't find this workspace."));
  const ready = razorpayReady(cfg);
  if (req.method === "GET") {
    const message = acc.status === "active" ? { kind: "ok", text: "Your subscription is active. Thank you!" } : null;
    return send(res, 200, subscribePage({ acc, actionUrl: url.pathname + url.search, ready, message }));
  }
  if (!ready) return send(res, 503, subscribePage({ acc, actionUrl: "", ready }));
  const form = Object.fromEntries(new URLSearchParams((await readBody(req, 4096)).toString("utf8")));
  const plan = PLANS[form.plan] ? form.plan : acc.plan;
  const planId = cfg.razorpay.plans[plan];
  if (!planId) throw new Error(`no Razorpay plan id configured for ${plan}`);

  // Reuse a not-yet-paid subscription for the same plan instead of creating duplicates.
  if (acc.razorpay_subscription_id) {
    const sub = await rzp.getSubscription(acc.razorpay_subscription_id);
    if (sub.status === "created" && sub.plan_id === planId && sub.short_url) return send(res, 303, "", "text/plain", { Location: sub.short_url });
  }
  const startAt = subscriptionStartAt(acc, new Date());
  const sub = await rzp.createSubscription({
    plan_id: planId, total_count: 120, customer_notify: 1, quantity: 1,
    ...(startAt ? { start_at: startAt } : {}),
    notes: { org_id: orgId, plan, business: acc.business_name.slice(0, 200) },
  });
  await db.updateAccount(orgId, { plan, razorpay_subscription_id: sub.id });
  log("subscription created", { orgId, plan, subscription: sub.id, startAt });
  return send(res, 303, "", "text/plain", { Location: sub.short_url });
}

async function razorpayWebhook(req, res) {
  const raw = await readBody(req);
  if (!verifyRazorpaySignature(raw, req.headers["x-razorpay-signature"], cfg.razorpay.webhookSecret)) {
    log("webhook rejected: bad signature");
    return send(res, 400, "bad signature", "text/plain");
  }
  const payload = JSON.parse(raw.toString("utf8"));
  const event = payload.event;
  const entity = payload.payload?.subscription?.entity;
  if (!entity) return send(res, 200, "ignored", "text/plain");
  const eventId = String(req.headers["x-razorpay-event-id"] ?? `${event}:${entity.id}:${payload.created_at}`);
  if (!(await db.claimEvent(eventId, event))) return send(res, 200, "duplicate", "text/plain");

  const acc = (await db.getAccountBySubscription(entity.id)) ?? (entity.notes?.org_id ? await db.getAccount(entity.notes.org_id) : null);
  if (!acc) {
    log("webhook for unknown subscription", { event, subscription: entity.id });
    return send(res, 200, "unknown", "text/plain");
  }
  const { patch, effect } = applySubscriptionEvent(event, entity, acc);
  if (patch) await db.updateAccount(acc.org_id, patch);
  if (effect === "reactivate") await db.reactivateOrg(acc.org_id);
  if (effect === "suspend") {
    await db.suspendOrg(acc.org_id, "Payment failed — subscription halted");
    await db.updateAccount(acc.org_id, { suspended_at: new Date().toISOString() });
  }
  log("webhook applied", { event, orgId: acc.org_id, effect });
  return send(res, 200, "ok", "text/plain");
}

async function sweep() {
  const now = new Date();
  for (const acc of await db.accountsToSweep()) {
    const action = sweepAction(acc, now);
    try {
      if (action === "remind") {
        await mail.send({ to: acc.owner_email, subject: `Your Marvice CRM trial ends ${fmtDate(acc.trial_ends_at)}`,
          html: reminderEmail({ ownerName: acc.owner_name, businessName: acc.business_name, trialEnds: fmtDate(acc.trial_ends_at), subscribeUrl: subscribeUrl(acc.org_id) }) });
        await db.updateAccount(acc.org_id, { reminded_at: now.toISOString() });
        log("trial reminder", { orgId: acc.org_id });
      } else if (action === "expire" || action === "suspend") {
        await db.suspendOrg(acc.org_id, action === "expire" ? "Free trial ended" : "Subscription cancelled");
        await db.updateAccount(acc.org_id, { status: action === "expire" ? "expired" : "cancelled", suspended_at: now.toISOString() });
        log("workspace suspended", { orgId: acc.org_id, reason: action });
      }
    } catch (err) {
      log("sweep error", { orgId: acc.org_id, action, error: err.message });
    }
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, cfg.publicUrl);
  try {
    if (req.method === "GET" && url.pathname === "/") return send(res, 200, landingPage());
    if (req.method === "GET" && url.pathname === "/healthz") return send(res, 200, "ok", "text/plain");
    if (req.method === "POST" && url.pathname === "/trial") return await startTrial(req, res);
    if ((req.method === "GET" || req.method === "POST") && url.pathname === "/subscribe") return await subscribe(req, res, url);
    if (req.method === "POST" && url.pathname === "/webhooks/razorpay") return await razorpayWebhook(req, res);
    return send(res, 404, messagePage("Not found", "This page does not exist."));
  } catch (err) {
    log("request failed", { path: url.pathname, error: err.message });
    if (!res.headersSent) send(res, err.status === 413 ? 413 : 500, messagePage("Something went wrong", "Please try again in a minute. If it keeps happening, contact Marvice."));
  }
});

server.listen(cfg.port, () => log("billing listening", { port: cfg.port, razorpay: razorpayReady(cfg) }));
setTimeout(() => sweep().catch((e) => log("sweep failed", { error: e.message })), 30_000);
setInterval(() => sweep().catch((e) => log("sweep failed", { error: e.message })), cfg.sweepMinutes * 60_000);
