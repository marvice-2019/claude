function req(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}
const opt = (name) => process.env[name]?.trim() || "";

export function loadConfig() {
  return {
    port: Number(process.env.PORT || 3100),
    publicUrl: req("BILLING_PUBLIC_URL").replace(/\/+$/, ""),
    crmPublicUrl: req("CRM_PUBLIC_URL").replace(/\/+$/, ""),
    crmInternalUrl: (opt("CRM_INTERNAL_URL") || "http://app:3000").replace(/\/+$/, ""),
    provisioningSecret: req("TENANT_PROVISIONING_SECRET"),
    supabaseUrl: req("SUPABASE_URL").replace(/\/+$/, ""),
    serviceRoleKey: req("SUPABASE_SERVICE_ROLE_KEY"),
    linkSecret: req("BILLING_LINK_SECRET"),
    razorpay: {
      keyId: opt("RAZORPAY_KEY_ID"),
      keySecret: opt("RAZORPAY_KEY_SECRET"),
      webhookSecret: opt("RAZORPAY_WEBHOOK_SECRET"),
      plans: { starter: opt("RAZORPAY_PLAN_STARTER"), growth: opt("RAZORPAY_PLAN_GROWTH"), pro: opt("RAZORPAY_PLAN_PRO") },
    },
    mail: { resendKey: opt("RESEND_API_KEY"), from: opt("MAIL_FROM") },
    sweepMinutes: Number(process.env.SWEEP_MINUTES || 60),
  };
}

export const razorpayReady = (cfg) => Boolean(cfg.razorpay.keyId && cfg.razorpay.keySecret);
