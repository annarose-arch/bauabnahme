import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  const { email } = await req.json();
  if (!email) return new Response(JSON.stringify({ exists: false }), { headers: { "Content-Type": "application/json" } });
  
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data } = await sb.auth.admin.listUsers();
  const exists = data?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
  
  return new Response(JSON.stringify({ exists }), { 
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
  });
});
