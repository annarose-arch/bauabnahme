import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const ADMIN_EMAIL = "support@bauabnahme.app";

serve(async (req) => {
  const signature = req.headers.get("stripe-signature") || "";
  const body = await req.text();
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let event;
  try {
    const crypto = await import("https://deno.land/std@0.168.0/crypto/mod.ts");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const parts = signature.split(",");
    const ts = parts.find((p) => p.startsWith("t="))?.slice(2) || "";
    const sig = parts.find((p) => p.startsWith("v1="))?.slice(3) || "";
    const payload = ts + "." + body;
    const sigBytes = Uint8Array.from(sig.match(/.{2}/g)?.map((b) => parseInt(b, 16)) || []);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
    if (!valid) return new Response("Invalid signature", { status: 400 });
    event = JSON.parse(body);
  } catch {
    return new Response("Webhook Error", { status: 400 });
  }

  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
    const customerId = event.data.object.customer;
    const users = await sb.auth.admin.listUsers();
    const user = users.data?.users?.find((u) => u.user_metadata?.stripe_customer_id === customerId);
    if (user) {
      await sb.from("usage_limits").update({ plan: "starter" }).eq("user_id", user.id);
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "noreply@bauabnahme.app", to: ADMIN_EMAIL, subject: "BauAbnahme: Abo " + event.type, html: "<p>User: " + user.email + "<br/>Event: " + event.type + "</p>" })
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
