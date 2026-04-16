import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SU = Deno.env.get("SUPABASE_URL") ?? "";
const SK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RK = Deno.env.get("RESEND_API_KEY") ?? "";
const ADMIN = "anna.rose@gmx.ch";

/** Send plain text only (no HTML) to avoid Resend/template parsing issues. */
async function mail(
  to: string,
  subject: string,
  text: string,
): Promise<{ ok: boolean; status: number; body?: string }> {
  if (!RK) {
    return { ok: false, status: 0, body: "missing RESEND_API_KEY" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + RK, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "noreply@bauabnahme.app",
      to,
      subject,
      text,
    }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 500) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SU || !SK) {
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SU, SK, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profiles, error: listErr } = await sb
      .from("profiles")
      .select("id")
      .eq("scheduled_for_deletion", true);
    if (listErr) throw listErr;

    const processed: string[] = [];
    const errors: { id: string; step: string; message: string }[] = [];
    const mailLog: { to: string; subject: string; ok: boolean }[] = [];

    for (const profile of profiles ?? []) {
      const userRes = await sb.auth.admin.getUserById(profile.id);
      const user = userRes.data?.user;
      if (!user?.id) {
        errors.push({ id: profile.id, step: "getUser", message: "auth user not found" });
        continue;
      }

      const uid = user.id;
      const email = user.email ?? "";

      const { error: repErr } = await sb.from("reports").delete().eq("user_id", uid);
      if (repErr) {
        errors.push({ id: uid, step: "reports", message: repErr.message });
        continue;
      }

      const { error: custErr } = await sb.from("customers").delete().eq("user_id", uid);
      if (custErr) {
        errors.push({ id: uid, step: "customers", message: custErr.message });
        continue;
      }

      const { error: profErr } = await sb.from("profiles").delete().eq("id", uid);
      if (profErr) {
        errors.push({ id: uid, step: "profiles", message: profErr.message });
        continue;
      }

      const { error: delUserErr } = await sb.auth.admin.deleteUser(uid);
      if (delUserErr) {
        errors.push({ id: uid, step: "deleteUser", message: delUserErr.message });
        continue;
      }

      if (email) {
        const userSubject = "Dein BauAbnahme Konto wurde geloescht";
        const userText =
          "Hallo,\n\nDein Konto wurde erfolgreich geloescht.\n\nTeam BauAbnahme";
        const u = await mail(email, userSubject, userText);
        mailLog.push({ to: email, subject: userSubject, ok: u.ok });
        if (!u.ok) {
          errors.push({ id: uid, step: "mail_user", message: u.body ?? String(u.status) });
        }
      }

      const adminSubject = "Konto geloescht: " + (email || uid);
      const adminText =
        "Ein Nutzer hat sein Konto geloescht.\n\nE-Mail: " +
        (email || "(keine)") +
        "\nUser-ID: " +
        uid;
      const a = await mail(ADMIN, adminSubject, adminText);
      mailLog.push({ to: ADMIN, subject: adminSubject, ok: a.ok });
      if (!a.ok) {
        errors.push({ id: uid, step: "mail_admin", message: a.body ?? String(a.status) });
      }

      processed.push(uid);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: processed.length,
        processed,
        errors,
        mailLog,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
