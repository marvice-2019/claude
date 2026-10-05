// One-time: create the three monthly plans in Razorpay and print the env lines for Coolify.
// Usage: RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... node scripts/create-plans.js
import { razorpay } from "../src/clients.js";
import { PLANS } from "../src/logic.js";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
if (!keyId || !keySecret) {
  console.error("Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET first.");
  process.exit(1);
}
const rzp = razorpay({ razorpay: { keyId, keySecret } });
for (const [id, p] of Object.entries(PLANS)) {
  const plan = await rzp.createPlan({
    period: "monthly",
    interval: 1,
    item: { name: `Marvice CRM ${p.name}`, amount: p.priceInr * 100, currency: "INR", description: p.blurb.slice(0, 200) },
    notes: { marvice_plan: id },
  });
  console.log(`RAZORPAY_PLAN_${id.toUpperCase()}=${plan.id}`);
}
