import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SU = Deno.env.get("SUPABASE_URL") ?? "";
const SK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const RK = Deno.env.get("RESEND_API_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SU || !SK || !ANON || !RK) {
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userSb = createClient(SU, ANON, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userErr } = await userSb.auth.getUser();
    const caller = userData?.user;
    if (userErr || !caller?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { invitation_id?: string; app_origin?: string };
    try {
      body = (await req.json()) as { invitation_id?: string; app_origin?: string };
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invitationId = typeof body.invitation_id === "string" ? body.invitation_id : "";
    const appOrigin = typeof body.app_origin === "string" ? body.app_origin.replace(/\/$/, "") : "";
    if (!invitationId) {
      return new Response(JSON.stringify({ error: "invitation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSb = createClient(SU, SK, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: inv, error: invErr } = await adminSb
      .from("team_invitations")
      .select("id, admin_id, email, token, accepted_at")
      .eq("id", invitationId)
      .maybeSingle();

    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: "Invitation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (inv.admin_id !== caller.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (inv.accepted_at) {
      return new Response(JSON.stringify({ error: "Invitation already used" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const joinUrl = appOrigin
      ? `${appOrigin}/dashboard?team_invite=${encodeURIComponent(inv.token)}`
      : `(Bitte App-Link manuell oeffnen; Token: ${inv.token})`;

    const subject = "Einladung zum BauAbnahme Team";
    const text =
      "Hallo,\n\n" +
      "du wurdest eingeladen, einem BauAbnahme-Team beizutreten.\n\n" +
      "Melde dich an oder registriere dich, dann oeffne diesen Link:\n" +
      joinUrl +
      "\n\n" +
      "Falls der Link nicht klappt, kopiere den Token und teile ihn dem Administrator.\n\n" +
      "Team BauAbnahme";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + RK, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "noreply@bauabnahme.app",
        to: [inv.email],
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: "Resend failed", detail: t.slice(0, 400) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
