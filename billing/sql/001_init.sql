-- Marvice CRM billing: one row per client workspace (CRM organization).
-- Service-role only: RLS on with no policies, so anon/authenticated see nothing.

create table if not exists public.marvice_billing_accounts (
  org_id                   uuid primary key references public.organizations(id) on delete cascade,
  plan                     text not null check (plan in ('starter', 'growth', 'pro')),
  status                   text not null check (status in ('trialing', 'active', 'past_due', 'expired', 'cancelled')),
  business_name            text not null,
  owner_name               text not null,
  owner_email              text not null,
  phone                    text,
  trial_ends_at            timestamptz not null,
  razorpay_subscription_id text unique,
  current_period_end       timestamptz,
  reminded_at              timestamptz,
  suspended_at             timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists marvice_billing_accounts_status_idx
  on public.marvice_billing_accounts (status, trial_ends_at);

-- Razorpay retries webhooks; each event id is processed once.
create table if not exists public.marvice_billing_events (
  event_id    text primary key,
  event_type  text not null,
  received_at timestamptz not null default now()
);

alter table public.marvice_billing_accounts enable row level security;
alter table public.marvice_billing_events enable row level security;
revoke all on public.marvice_billing_accounts, public.marvice_billing_events from anon, authenticated;
grant all on public.marvice_billing_accounts, public.marvice_billing_events to service_role;

-- 002: internal workspaces (an admin is a platform admin) are never billed.
alter table public.marvice_billing_accounts drop constraint if exists marvice_billing_accounts_status_check;
alter table public.marvice_billing_accounts add constraint marvice_billing_accounts_status_check
  check (status in ('trialing', 'active', 'past_due', 'expired', 'cancelled', 'exempt'));
