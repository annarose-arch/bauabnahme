import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const { member_email, token, admin_email } = await req.json();
  const RK = Deno.env.get("RESEND_API_KEY") || "";
  const inviteUrl = "https://www.bauabnahme.app/join?token=" + token;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + RK, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "noreply@bauabnahme.app", to: member_email, subject: "BauAbnahme Einladung", text: "Hallo! Du wurdest von " + admin_email + " zu BauAbnahme eingeladen. Beitreten: " + inviteUrl }),
  });
  const data = await res(JSON.stringify({ ok: true, data }), { headers: { ...cors, "Content-Type": "application/json" } });
});
