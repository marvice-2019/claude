import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  applySubscriptionEvent, enrollment, escapeHtml, parseSignup, subscribeToken, subscriptionStartAt,
  sweepAction, trialEndsAt, verifyRazorpaySignature, verifySubscribeToken,
} from "../src/logic.js";

const DAY = 86400000;
const now = new Date("2026-10-05T10:00:00Z");

test("trial is 45 days", () => {
  assert.equal(trialEndsAt(now).getTime() - now.getTime(), 45 * DAY);
});

test("signup validation", () => {
  const ok = parseSignup({ business_name: " Cafe ", owner_name: "Ravi", owner_email: "RAVI@Cafe.in", plan: "pro" });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.value.owner_email, "ravi@cafe.in");
  assert.equal(parseSignup({ business_name: "x", owner_name: "y", owner_email: "z@z.co" }).value.plan, "growth");
  const bad = parseSignup({ business_name: "", owner_name: "", owner_email: "nope", phone: "abc", plan: "gold" });
  assert.equal(bad.errors.length, 5);
});

test("sweep: trial remind window, expiry, cancelled end", () => {
  const trial = (daysLeft, extra = {}) => ({ status: "trialing", trial_ends_at: new Date(now.getTime() + daysLeft * DAY).toISOString(), ...extra });
  assert.equal(sweepAction(trial(10), now), null);
  assert.equal(sweepAction(trial(4), now), "remind");
  assert.equal(sweepAction(trial(4, { reminded_at: now.toISOString() }), now), null);
  assert.equal(sweepAction(trial(0), now), "expire");
  assert.equal(sweepAction(trial(-3, { reminded_at: "x" }), now), "expire");
  const past = new Date(now.getTime() - DAY).toISOString();
  assert.equal(sweepAction({ status: "cancelled", current_period_end: past }, now), "suspend");
  assert.equal(sweepAction({ status: "cancelled", current_period_end: past, suspended_at: past }, now), null);
  assert.equal(sweepAction({ status: "active", trial_ends_at: past }, now), null);
});

test("webhook events map to status and CRM effect", () => {
  const entity = { id: "sub_1", current_end: 1800000000 };
  const fresh = { suspended_at: null };
  const suspended = { suspended_at: "2026-10-01T00:00:00Z" };
  assert.deepEqual(applySubscriptionEvent("subscription.activated", entity, fresh).effect, null);
  assert.equal(applySubscriptionEvent("subscription.charged", entity, suspended).effect, "reactivate");
  assert.equal(applySubscriptionEvent("subscription.charged", entity, fresh).patch.status, "active");
  assert.equal(applySubscriptionEvent("subscription.halted", entity, fresh).effect, "suspend");
  assert.equal(applySubscriptionEvent("subscription.halted", entity, suspended).effect, null);
  assert.equal(applySubscriptionEvent("subscription.pending", entity, fresh).patch.status, "past_due");
  assert.equal(applySubscriptionEvent("subscription.cancelled", entity, fresh).patch.status, "cancelled");
  assert.equal(applySubscriptionEvent("payment.captured", entity, fresh).patch, null);
  assert.equal(applySubscriptionEvent("subscription.charged", entity, fresh).patch.current_period_end, new Date(1800000000 * 1000).toISOString());
});

test("first charge deferred to trial end only while trial is running", () => {
  const end = new Date(now.getTime() + 10 * DAY);
  assert.equal(subscriptionStartAt({ trial_ends_at: end.toISOString() }, now), Math.floor(end.getTime() / 1000));
  assert.equal(subscriptionStartAt({ trial_ends_at: new Date(now.getTime() - DAY).toISOString() }, now), null);
  assert.equal(subscriptionStartAt({ trial_ends_at: new Date(now.getTime() + 10 * 60000).toISOString() }, now), null);
});

test("razorpay signature", () => {
  const body = Buffer.from('{"event":"subscription.charged"}');
  const sig = createHmac("sha256", "whsec").update(body).digest("hex");
  assert.equal(verifyRazorpaySignature(body, sig, "whsec"), true);
  assert.equal(verifyRazorpaySignature(body, sig, "other"), false);
  assert.equal(verifyRazorpaySignature(body, undefined, "whsec"), false);
  assert.equal(verifyRazorpaySignature(body, sig, ""), false);
});

test("subscribe link token", () => {
  const org = "11111111-2222-3333-4444-555555555555";
  const t = subscribeToken(org, "s3cret");
  assert.equal(verifySubscribeToken(org, t, "s3cret"), true);
  assert.equal(verifySubscribeToken(org, t, "other"), false);
  assert.equal(verifySubscribeToken("11111111-2222-3333-4444-555555555556", t, "s3cret"), false);
  assert.equal(verifySubscribeToken(org, null, "s3cret"), false);
});

test("html escaping", () => {
  assert.equal(escapeHtml(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
});

test("enrollment of workspaces created outside the billing page", () => {
  const created = "2026-10-01T00:00:00.000Z";
  assert.deepEqual(enrollment({ createdAt: created, internal: true }).status, "exempt");
  const t = enrollment({ createdAt: created, internal: false });
  assert.equal(t.status, "trialing");
  assert.equal(new Date(t.trial_ends_at).getTime() - new Date(created).getTime(), 45 * DAY);
});
