# Marvice CRM billing

Subscriptions and 45-day free trials for Marvice CRM, served at `billing.marvice.tech`.
Zero dependencies (Node 22). Runs next to the CRM in the Coolify stack (`deploy/deskcomm-crm`).

## Flow

1. **Trial** — `POST /trial` creates a CRM workspace through the CRM's `/api/v1/tenants/provision`,
   records it in `marvice_billing_accounts` (status `trialing`, ends in 45 days) and gives the owner a
   one-time set-password link (emailed when `RESEND_API_KEY` is set, otherwise shown on screen).
2. **Subscribe** — `/subscribe?org=…&t=…` (signed link) creates a Razorpay subscription. While the trial is
   running, `start_at` = trial end, so the first charge happens when the trial ends.
3. **Webhooks** — `POST /webhooks/razorpay` (signature-verified, idempotent per event id):
   `authenticated/activated/charged/resumed` → active (+ reactivate the workspace if it was suspended);
   `pending` → past_due; `halted` → past_due + suspend; `cancelled/completed` → cancelled.
4. **Sweep (every 10 min)** — new workspaces created in the CRM directly (Google sign-up) are enrolled
   in a trial (internal ones, with a platform admin, are `exempt`). 5 days before trial end: reminder email. Trial over without a subscription:
   workspace suspended (CRM billing suspension, `fn_suspender_organizacao(..., 'cobranca', ...)`).
   Cancelled and paid period over: suspended. Data is never deleted automatically.

## Go-live checklist

1. Razorpay Dashboard → enable **Subscriptions**; create API keys (test mode first).
2. Create plans: `RAZORPAY_KEY_ID=… RAZORPAY_KEY_SECRET=… npm run create-plans` → paste the three
   `RAZORPAY_PLAN_*` lines into Coolify.
3. Razorpay → Webhooks → `https://billing.marvice.tech/webhooks/razorpay`, events `subscription.*`,
   set a secret → `RAZORPAY_WEBHOOK_SECRET`.
4. Resend (or swap `mailer` in `src/clients.js`): verify the sending domain → `RESEND_API_KEY`, `MAIL_FROM`.
5. Restart the stack in Coolify.

## Develop

`npm test` — unit tests for every billing rule (`src/logic.js`).
