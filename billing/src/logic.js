// Pure billing rules — no I/O, so every decision here is unit-tested.
import { createHmac, timingSafeEqual } from "node:crypto";

export const TRIAL_DAYS = 45;
export const REMIND_DAYS_BEFORE = 5;
export const PLANS = {
  starter: { name: "Starter", priceInr: 1999, blurb: "1 WhatsApp number · 3 users · shared inbox · CRM pipeline · 1 AI agent" },
  growth: { name: "Growth", priceInr: 4499, blurb: "2 numbers · 8 users · AI agents with knowledge base · follow-ups · Google Calendar · Meta Ads tracking" },
  pro: { name: "Pro", priceInr: 8999, blurb: "5 numbers · 20 users · everything in Growth · webhooks and n8n · priority onboarding" },
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function trialEndsAt(now) {
  return new Date(now.getTime() + TRIAL_DAYS * DAY_MS);
}

export function parseSignup(form) {
  const s = (k, max) => String(form[k] ?? "").trim().slice(0, max);
  const out = {
    business_name: s("business_name", 200),
    owner_name: s("owner_name", 200),
    owner_email: s("owner_email", 254).toLowerCase(),
    phone: s("phone", 20),
    plan: s("plan", 20) || "growth",
  };
  const errors = [];
  if (!out.business_name) errors.push("Business name is required.");
  if (!out.owner_name) errors.push("Your name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.owner_email)) errors.push("A valid email is required.");
  if (out.phone && !/^\+?[0-9 ]{8,16}$/.test(out.phone)) errors.push("Phone should be digits, e.g. +91 98765 43210.");
  if (!PLANS[out.plan]) errors.push("Choose a plan.");
  return { value: out, errors };
}

// What the hourly sweep should do with one account row.
export function sweepAction(acc, now) {
  const t = now.getTime();
  if (acc.status === "trialing") {
    const end = new Date(acc.trial_ends_at).getTime();
    if (t >= end) return "expire";
    if (!acc.reminded_at && end - t <= REMIND_DAYS_BEFORE * DAY_MS) return "remind";
    return null;
  }
  if (acc.status === "cancelled" && !acc.suspended_at && acc.current_period_end && t >= new Date(acc.current_period_end).getTime()) {
    return "suspend";
  }
  return null;
}

// Razorpay subscription webhook → row patch + side effect on the CRM workspace.
// effect: "reactivate" | "suspend" | null
export function applySubscriptionEvent(event, entity, acc) {
  const periodEnd = entity.current_end ? new Date(entity.current_end * 1000).toISOString() : acc.current_period_end ?? null;
  const base = { razorpay_subscription_id: entity.id, current_period_end: periodEnd };
  switch (event) {
    case "subscription.authenticated":
    case "subscription.activated":
    case "subscription.charged":
    case "subscription.resumed":
      return { patch: { ...base, status: "active", suspended_at: null }, effect: acc.suspended_at ? "reactivate" : null };
    case "subscription.pending":
      return { patch: { ...base, status: "past_due" }, effect: null };
    case "subscription.halted":
      return { patch: { ...base, status: "past_due" }, effect: acc.suspended_at ? null : "suspend" };
    case "subscription.cancelled":
    case "subscription.completed":
      return { patch: { ...base, status: "cancelled" }, effect: null };
    default:
      return { patch: null, effect: null };
  }
}

// Razorpay may only defer the first charge if start_at is comfortably in the future.
export function subscriptionStartAt(acc, now) {
  const end = new Date(acc.trial_ends_at).getTime();
  return end - now.getTime() > 60 * 60 * 1000 ? Math.floor(end / 1000) : null;
}

export function verifyRazorpaySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && timingSafeEqual(a, b);
}

// Signed, unguessable link to an account's subscribe page (no login needed).
export function subscribeToken(orgId, secret) {
  return createHmac("sha256", secret).update(`subscribe:${orgId}`).digest("hex").slice(0, 32);
}

export function verifySubscribeToken(orgId, token, secret) {
  const a = Buffer.from(subscribeToken(orgId, secret));
  const b = Buffer.from(String(token ?? ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function formatInr(n) {
  return "₹" + n.toLocaleString("en-IN");
}
