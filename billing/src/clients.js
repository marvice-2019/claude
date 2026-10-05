// Thin HTTP clients: Supabase (REST + GoTrue admin), the CRM provisioning API, Razorpay, Resend.

async function http(url, init, what) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const err = new Error(`${what} failed: HTTP ${res.status} ${typeof body === "string" ? body.slice(0, 300) : JSON.stringify(body).slice(0, 300)}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export function supabase(cfg) {
  const h = { apikey: cfg.serviceRoleKey, Authorization: `Bearer ${cfg.serviceRoleKey}`, "Content-Type": "application/json" };
  const rest = `${cfg.supabaseUrl}/rest/v1`;
  return {
    getAccount: async (orgId) =>
      (await http(`${rest}/marvice_billing_accounts?org_id=eq.${encodeURIComponent(orgId)}&select=*`, { headers: h }, "get account"))[0] ?? null,
    getAccountBySubscription: async (subId) =>
      (await http(`${rest}/marvice_billing_accounts?razorpay_subscription_id=eq.${encodeURIComponent(subId)}&select=*`, { headers: h }, "get account by sub"))[0] ?? null,
    insertAccount: (row) =>
      http(`${rest}/marvice_billing_accounts`, { method: "POST", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify(row) }, "insert account"),
    updateAccount: (orgId, patch) =>
      http(`${rest}/marvice_billing_accounts?org_id=eq.${encodeURIComponent(orgId)}`, {
        method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
      }, "update account"),
    accountsToSweep: () =>
      http(`${rest}/marvice_billing_accounts?status=in.(trialing,cancelled)&select=*`, { headers: h }, "list accounts"),
    // true = first time we see this event id; false = duplicate delivery.
    claimEvent: async (eventId, eventType) => {
      try {
        await http(`${rest}/marvice_billing_events`, { method: "POST", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ event_id: eventId, event_type: eventType }) }, "claim event");
        return true;
      } catch (e) {
        if (e.status === 409) return false;
        throw e;
      }
    },
    setOrgLocale: (orgId, locale) =>
      http(`${rest}/organizations?id=eq.${encodeURIComponent(orgId)}`, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ locale }) }, "set org locale"),
    suspendOrg: (orgId, reason) =>
      http(`${rest}/rpc/fn_suspender_organizacao`, { method: "POST", headers: h, body: JSON.stringify({ p_org: orgId, p_kind: "cobranca", p_motivo: reason, p_ator: null }) }, "suspend org"),
    reactivateOrg: (orgId) =>
      http(`${rest}/rpc/fn_reativar_organizacao`, { method: "POST", headers: h, body: JSON.stringify({ p_org: orgId, p_kind_exigido: "cobranca", p_ator: null }) }, "reactivate org"),
    // One-time "set your password" link for the new workspace owner.
    passwordLink: async (email) => {
      const r = await http(`${cfg.supabaseUrl}/auth/v1/admin/generate_link`, { method: "POST", headers: h, body: JSON.stringify({ type: "recovery", email }) }, "generate link");
      const hashed = r?.hashed_token ?? r?.properties?.hashed_token;
      const userId = r?.id ?? r?.user?.id;
      if (!hashed) throw new Error("generate link: no hashed_token in response");
      return { url: `${cfg.crmPublicUrl}/auth/confirm?token_hash=${encodeURIComponent(hashed)}&type=recovery`, userId };
    },
    setUserLocale: (userId, locale) =>
      http(`${cfg.supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: "PUT", headers: h, body: JSON.stringify({ user_metadata: { locale } }) }, "set user locale"),
  };
}

export function crm(cfg) {
  return {
    provision: async ({ business_name, owner_name, owner_email }) => {
      const r = await http(`${cfg.crmInternalUrl}/api/v1/tenants/provision`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.provisioningSecret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ integration: "marvice-billing", external_id: owner_email, organization_name: business_name, owner_email, owner_name }),
      }, "provision workspace");
      const orgId = r?.data?.organization_id ?? r?.organization_id;
      if (!orgId) throw new Error("provision workspace: no organization_id in response");
      return orgId;
    },
  };
}

export function razorpay(cfg) {
  const auth = "Basic " + Buffer.from(`${cfg.razorpay.keyId}:${cfg.razorpay.keySecret}`).toString("base64");
  const h = { Authorization: auth, "Content-Type": "application/json" };
  const api = "https://api.razorpay.com/v1";
  return {
    createSubscription: (body) => http(`${api}/subscriptions`, { method: "POST", headers: h, body: JSON.stringify(body) }, "razorpay create subscription"),
    getSubscription: (id) => http(`${api}/subscriptions/${encodeURIComponent(id)}`, { headers: h }, "razorpay get subscription"),
    createPlan: (body) => http(`${api}/plans`, { method: "POST", headers: h, body: JSON.stringify(body) }, "razorpay create plan"),
  };
}

export function mailer(cfg, log) {
  return {
    send: async ({ to, subject, html }) => {
      if (!cfg.mail.resendKey || !cfg.mail.from) {
        log("mail not configured; would send", { to, subject });
        return false;
      }
      await http("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.mail.resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: cfg.mail.from, to: [to], subject, html }),
      }, "send email");
      return true;
    },
  };
}
