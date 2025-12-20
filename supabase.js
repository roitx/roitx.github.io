const SUPABASE_URL = "https://ktastwehnnqicriknewr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_oKvnfYOw9wNk3IsI04nN7g_KQsTfykS";

window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log("✅ Supabase client ready", window.supabaseClient);