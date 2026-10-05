import { PLANS, TRIAL_DAYS, escapeHtml as e, formatInr } from "./logic.js";

const CRM_LOGIN_URL = `${(process.env.CRM_PUBLIC_URL || "https://crm.marvice.tech").replace(/\/+$/, "")}/login`;

const CSS = `
:root{--ink:#2B2722;--body:#4F4840;--muted:#6E665C;--bg:#FAF7F2;--card:#FFFFFF;--line:#E9E1D4;--accent:#9A6420;--accent-ink:#FFFFFF}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 'DM Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.wrap{max-width:1080px;margin:0 auto;padding:40px 16px 64px}
header{display:flex;align-items:center;gap:12px;margin-bottom:40px}
.logo{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#D4A24C,#8C5A1E);color:#fff;display:grid;place-items:center;font-weight:800}
h1{font-size:clamp(32px,5vw,52px);line-height:1.08;margin:0 0 12px;letter-spacing:-.02em}
.lead{font-size:19px;color:var(--body);max-width:640px;margin:0 0 32px}
.pill{display:inline-block;background:var(--ink);color:#F4F3FA;border-radius:999px;padding:6px 14px;font-weight:700;font-size:14px;margin-bottom:16px}
.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-bottom:40px}
.plan{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:24px;display:flex;flex-direction:column;gap:8px}
.plan.hot{border:2px solid var(--accent)}
.plan h3{margin:0;font-size:22px}.price{font-size:32px;font-weight:800}.price small{font-size:15px;color:var(--muted);font-weight:500}
.plan p{margin:0;color:var(--body)}
form.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:28px;display:grid;gap:14px;max-width:560px}
label{display:grid;gap:6px;font-weight:600;font-size:14px}
input,select{font:inherit;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink)}
input:focus,select:focus{outline:2px solid var(--accent);outline-offset:1px}
button,.btn{font:inherit;font-weight:700;background:var(--accent);color:var(--accent-ink);border:0;border-radius:10px;padding:14px 18px;cursor:pointer;text-decoration:none;text-align:center;display:inline-block}
.note{font-size:13px;color:var(--muted)}
.err{background:#FDECEC;color:#8A1C1C;border-radius:10px;padding:12px 14px}
.ok{background:#E9F7EF;color:#14532D;border-radius:10px;padding:12px 14px}
footer{margin-top:48px;color:var(--muted);font-size:13px}
`;

function layout(title, inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(title)} · Marvice CRM</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;800&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body><div class="wrap">
<header><div class="logo">M</div><strong>Marvice CRM</strong></header>
${inner}
<footer>Marvice Media Pvt Ltd · Prices in INR, excluding GST · Meta API conversation fees billed separately.</footer>
</div></body></html>`;
}

// Plan cards; with chooseUrl each card gets a "Choose" button that preselects it on the subscribe page.
function planCards(chooseUrl) {
  return Object.entries(PLANS).map(([id, p]) => `
<div class="plan${id === "growth" ? " hot" : ""}">
  <h3>${e(p.name)}${id === "growth" ? ' <span class="note">· most popular</span>' : ""}</h3>
  <div class="price">${formatInr(p.priceInr)} <small>/ month</small></div>
  <p>${e(p.blurb)}</p>
  ${chooseUrl ? `<a class="btn" style="margin-top:auto" href="${e(`${chooseUrl}&plan=${id}`)}">Choose ${e(p.name)}</a>` : ""}
</div>`).join("");
}

function planOptions(selected) {
  return Object.entries(PLANS).map(([id, p]) =>
    `<option value="${id}"${id === selected ? " selected" : ""}>${e(p.name)} — ${formatInr(p.priceInr)}/month</option>`).join("");
}

// Step 1: create the account. No plan choice here — plans come after sign-up.
export function landingPage({ errors = [], values = {} } = {}) {
  const v = (k) => e(values[k] ?? "");
  return layout("Create your free account", `
<span class="pill">${TRIAL_DAYS} days free · no card needed</span>
<h1>The AI sales desk for WhatsApp</h1>
<p class="lead">Shared inbox, AI agents that answer and qualify leads, and a CRM pipeline — on your own WhatsApp number. Create your account and start in two minutes.</p>
<form class="card" method="post" action="/trial">
  <h2 style="margin:0">Create your free account</h2>
  ${errors.length ? `<div class="err">${errors.map(e).join("<br>")}</div>` : ""}
  <label>Business name<input name="business_name" required maxlength="200" value="${v("business_name")}"></label>
  <label>Your name<input name="owner_name" required maxlength="200" value="${v("owner_name")}"></label>
  <label>Work email<input name="owner_email" type="email" required maxlength="254" value="${v("owner_email")}"></label>
  <label>WhatsApp number (optional)<input name="phone" inputmode="tel" maxlength="20" placeholder="+91 98765 43210" value="${v("phone")}"></label>
  <button type="submit">Create account and start</button>
  <a class="btn" style="background:#FFFFFF;color:var(--ink);border:1px solid var(--line)" href="${e(CRM_LOGIN_URL)}?signup=google">Sign up with Google</a>
  <p class="note">Every feature is unlocked for ${TRIAL_DAYS} days. Already have an account? <a href="${e(CRM_LOGIN_URL)}">Sign in</a></p>
</form>`);
}

// Step 2: account ready → sign in, and see the plans.
export function trialStartedPage({ businessName, passwordUrl, emailedTo, trialEnds, subscribeUrl }) {
  const access = emailedTo
    ? `<p class="lead">Your ${TRIAL_DAYS}-day free trial runs until <b>${e(trialEnds)}</b>. We've emailed <b>${e(emailedTo)}</b> a link to set your password and sign in.</p>`
    : `<p class="lead">Your ${TRIAL_DAYS}-day free trial runs until <b>${e(trialEnds)}</b>. Set your password to sign in — this link works once.</p>
<p><a class="btn" href="${e(passwordUrl)}">Set password and open the CRM</a></p>`;
  return layout("Your account is ready", `
<h1>${e(businessName)} is ready</h1>
${access}
<h2 style="margin:40px 0 8px">Plans after your free trial</h2>
<p class="note" style="margin:0 0 16px">Choose now or any time before ${e(trialEnds)} — you won't be charged until the trial ends.</p>
<div class="plans">${planCards(subscribeUrl)}</div>`);
}

export function subscribePage({ acc, actionUrl, ready, message, selected }) {
  const ended = new Date(acc.trial_ends_at) <= new Date();
  return layout("Choose your plan", `
<h1>Continue with Marvice CRM</h1>
<p class="lead">${e(acc.business_name)} · ${ended ? "Your trial has ended — subscribe to reopen your workspace." : `Trial ends ${e(new Date(acc.trial_ends_at).toDateString())}. Your first charge happens on that date.`}</p>
${message ? `<div class="${message.kind}">${e(message.text)}</div>` : ""}
<div class="plans">${planCards()}</div>
${ready ? `<form class="card" method="post" action="${e(actionUrl)}">
  <label>Plan<select name="plan">${planOptions(PLANS[selected] ? selected : acc.plan)}</select></label>
  <button type="submit">Continue to secure payment</button>
  <p class="note">Payments by Razorpay: UPI AutoPay, cards and net banking. Cancel anytime.</p>
</form>` : `<div class="err">Online payment is being set up. Reply to your trial email or WhatsApp us and we will activate your plan.</div>`}`);
}

export function messagePage(title, text) {
  return layout(title, `<h1>${e(title)}</h1><p class="lead">${e(text)}</p><p><a class="btn" href="/">Back</a></p>`);
}

export function welcomeEmail({ ownerName, businessName, passwordUrl, trialEnds, subscribeUrl }) {
  return `<p>Hi ${e(ownerName)},</p>
<p>Your Marvice CRM workspace for <b>${e(businessName)}</b> is ready. Your free trial runs until <b>${e(trialEnds)}</b>.</p>
<p><a href="${e(passwordUrl)}">Set your password and sign in</a> (this link works once).</p>
<p>Next: connect your WhatsApp number from the Inbox by scanning the QR code. Ready to continue after the trial? <a href="${e(subscribeUrl)}">Choose your plan</a> — no charge before the trial ends.</p>
<p>— Team Marvice</p>`;
}

// For workspaces created by Google sign-up in the CRM: no password link needed, just the trial and plans.
export function trialStartedEmail({ ownerName, businessName, trialEnds, subscribeUrl }) {
  const plans = Object.values(PLANS).map((p) => `<li><b>${e(p.name)}</b> — ${formatInr(p.priceInr)}/month: ${e(p.blurb)}</li>`).join("");
  return `<p>Hi ${e(ownerName)},</p>
<p>Welcome to Marvice CRM! Your ${TRIAL_DAYS}-day free trial for <b>${e(businessName)}</b> runs until <b>${e(trialEnds)}</b>, with every feature unlocked.</p>
<p>Plans after the trial:</p><ul>${plans}</ul>
<p><a href="${e(subscribeUrl)}">Choose your plan</a> — no charge before the trial ends.</p>
<p>— Team Marvice</p>`;
}

export function reminderEmail({ ownerName, businessName, trialEnds, subscribeUrl }) {
  return `<p>Hi ${e(ownerName)},</p>
<p>Your Marvice CRM free trial for <b>${e(businessName)}</b> ends on <b>${e(trialEnds)}</b>.</p>
<p>To keep your inbox, AI agents and pipeline running without a break, choose a plan and add a payment method. You won't be charged before the trial ends.</p>
<p><a href="${e(subscribeUrl)}">Choose your plan</a></p>
<p>— Team Marvice</p>`;
}
