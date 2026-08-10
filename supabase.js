/* =====================================================
   ROITX PLATFORM — CENTRAL SUPABASE & AUTH ENGINE
   ===================================================== */

const SUPABASE_URL = "https://ktastwehnnqicriknewr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_oKvnfYOw9wNk3IsI04nN7g_KQsTfykS";

// Global Supabase Client
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper: GitHub Pages & Dynamic Domain URL Resolver
function getPageUrl(pageName) {
  const currentPath = window.location.pathname;
  const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
  return window.location.origin + basePath + pageName;
}

// Primary Admin Emails List
const ADMIN_EMAILS = [
  "masumboy141@gmail.com",
  "rohitrajgoh91@gmail.com"
];

// Active User Fetcher
async function getCurrentUser() {
  if (!window.supabaseClient) return null;
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  return session ? session.user : null;
}

// Precise Admin Check
async function checkIsAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;

  // 1. Direct App Metadata Check
  if (user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin") {
    return true;
  }

  // 2. Multi-Email Admin Check
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return true;
  }

  // 3. Database Profiles Table Check
  try {
    const { data } = await window.supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return data?.role === "admin";
  } catch (err) {
    console.warn("Profile Role fetch failed, fallback used.", err);
    return false;
  }
}

// Page Route Guards
async function requireAdminAuth() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    alert("⛔ Access Denied! Sirf Admin is page ko access kar sakta hai.");
    window.location.href = getPageUrl("login.html");
  }
}

async function requireUserAuth() {
  const user = await getCurrentUser();
  if (!user) {
    sessionStorage.setItem("redirect_after_login", window.location.href);
    window.location.href = getPageUrl("login.html");
  }
}

// Central Download Guard
async function checkDownloadPermission(downloadCallback) {
  const user = await getCurrentUser();
  
  if (!user) {
    alert("🔒 Download karne ke liye login karna zaroori hai!");
    sessionStorage.setItem("redirect_after_login", window.location.href);
    window.location.href = getPageUrl("login.html");
    return false;
  }

  if (typeof downloadCallback === "function") {
    downloadCallback();
  }
  return true;
}

// Global Exports
window.getPageUrl = getPageUrl;
window.getCurrentUser = getCurrentUser;
window.checkIsAdmin = checkIsAdmin;
window.requireAdminAuth = requireAdminAuth;
window.requireUserAuth = requireUserAuth;
window.checkDownloadPermission = checkDownloadPermission;
