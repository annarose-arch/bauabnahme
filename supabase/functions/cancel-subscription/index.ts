import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12";

serve(async (req) => {
  const SK = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const SU = Deno.env.get("SUPABASE_URL") || "";
  const SS = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const RK = Deno.env.get("RESEND_API_KEY") || "";
  const body = await req.json();
  const uid = body.user_id;
  const act = body.action || "unknown";
  const sb = createClient(SU, SS);
  const r = await sb.auth.admin.getUserById(uid);
  if (!r.data || !r.data.user) return new Response("Not found", { status: 404 });
  const u = r.data.user;
  const cid = u.user_metadata ? u.user_metadata.stripe_customer_id : "";
  if (cid) {
    const stripe = new Stripe(SK, { apiVersion: "2023-10-16" as const });
    const subs = await stripe.subscriptions.list({ customer: cid, status: "active" });
    await Promise.all(subs.data.map((s) => stripe.subscriptions.cancel(s.id)));
  }
  await sb.from("usage_limits").update({ plan: "starter" }).eq("user_id", uid);
  const em = { from: "noreply@bauabnahme.app", to: "support@bauabnahme.app", subject: "BauAbnahme: " + act, html: "<p>User: " + u.email + "</p>" };
  await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Authorization": "Bearer " + RK, "Content-Type": "application/json" }, body: JSON.stringify(em) });
  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
});
