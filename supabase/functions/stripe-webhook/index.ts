import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ADMIN_EMAIL = "anna.rose@gmx.ch";

async function sendEmail(to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "noreply@bauabnahme.app", to, subject, html })
  });
}

serve(async (req) => {
  const body = await req.text();
  let event;
  try { event = JSON.parse(body); } catch { return new Response("Error", { status: 400 }); }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const obj = event.data.object;

  if (event.type === "checkout.session.completed") {
    const email = obj.customer_email || obj.customer_details?.email;
    const amount = obj.amount_total || 0;
    const plan = amount >= 7900 ? "team" : amount >= 2900 ? "pro" : "starter";
    if (email) {
      const { data: users } = await sb.auth.admin.listUsers();
      const user = users?.users?.find(u => u.email === email);
      if (user) {
        await sb.from("usage_limits").upsert({ user_id: user.id, plan }, { onConflict: "user_id" });
        await sb.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, plan, stripe_customer_id: obj.customer } });
      }
      await sendEmail(ADMIN_EMAIL, "Neues Abo: " + plan, "<p>User: " + email + "<br/>Plan: " + plan + "</p>");
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const customerId = obj.customer;
    const { data: users } = await sb.auth.admin.listUsers();
    const user = users?.users?.find(u => u.user_metadata?.stripe_customer_id === customerId);
    if (user) {
      await sb.from("usage_limits").update({ plan: "starter" }).eq("user_id", user.id);
      await sendEmail(ADMIN_EMAIL, "Abo gekuendigt", "<p>User: " + user.email + "</p>");
    }
  }

  if (event.type === "invoice.payment_failed") {
    const customerId = obj.customer;
    const { data: users } = await sb.auth.admin.listUsers();
    const user = users?.users?.find(u => u.user_metadata?.stripe_customer_id === customerId);
    if (user) {
      await sendEmail(user.email, "Zahlung fehlgeschlagen", "<p>Deine Zahlung fuer BauAbnahme konnte nicht verarbeitet werden. Bitte aktualisiere deine Zahlungsmethode.</p><p><a href='https://www.bauabnahme.app'>Jetzt aktualisieren</a></p>");
      await sendEmail(ADMIN_EMAIL, "Zahlung fehlgeschlagen", "<p>User: " + user.email + "</p>");
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
