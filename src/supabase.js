import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tgtyuxtrrafxalajxenw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRndHl1eHRycmFmeGFsYWp4ZW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjMzOTYsImV4cCI6MjA4OTIzOTM5Nn0.ePbGVxCbj_mr_RMLtf4uphnvxdx267QmTfTuMknPhK8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
