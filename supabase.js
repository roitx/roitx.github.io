/* =====================================================
   ROITX PLATFORM — CENTRAL SUPABASE & AUTH ENGINE
   ===================================================== */

const SUPABASE_URL = "https://ktastwehnnqicriknewr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_oKvnfYOw9wNk3IsI04nN7g_KQsTfykS";

// Global Supabase Client
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper: Dynamic Domain URL Resolver
function getPageUrl(pageName) {
  const currentPath = window.location.pathname;
  const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
  return window.location.origin + basePath + pageName;
}

// Primary Admin Emails List
const ADMIN_EMAILS = [
  "rohitrajgoh91@gmail.com"
];

// Active Auth User Fetcher
async function getCurrentUser() {
  if (!window.supabaseClient) return null;
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  return session ? session.user : null;
}

// Centralized Profile Data Fetcher
async function getUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  let fallbackName = user.email ? user.email.split('@')[0] : "User";
  let profileData = {
    id: user.id,
    email: user.email,
    displayName: fallbackName,
    avatarUrl: null,
    role: 'student'
  };

  try {
    const { data, error } = await window.supabaseClient
      .from('profiles')
      .select('full_name, avatar_url, role')
      .eq('id', user.id)
      .single();

    if (data && !error) {
      if (data.full_name && data.full_name.trim() !== "") {
        profileData.displayName = data.full_name;
      }
      if (data.avatar_url) {
        profileData.avatarUrl = data.avatar_url;
      }
      if (data.role) {
        profileData.role = data.role;
      }
    }
  } catch (err) {
    console.warn("Error fetching user profile:", err);
  }

  return profileData;
}

// Precise Admin & Permission Check
async function checkIsAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;

  // 1. Email Whitelist
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return true;
  }

  // 2. Database Check (role & JSON permissions)
  try {
    const { data } = await window.supabaseClient
      .from('profiles')
      .select('role, permissions')
      .eq('id', user.id)
      .single();

    if (!data) return false;

    const role = (data.role || '').toLowerCase();
    const perms = data.permissions || {};

    return role === "admin" || role === "superadmin" || role === "teammate" || !!perms.admin_panel;
  } catch (err) {
    console.warn("Profile Role fetch failed, fallback used.", err);
    return false;
  }
}

// Page Route Guards
async function requireAdminAuth() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    alert("⛔ Access Denied! Sirf Admin ya Teammate is page ko access kar sakta hai.");
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
window.getUserProfile = getUserProfile;
window.checkIsAdmin = checkIsAdmin;
window.requireAdminAuth = requireAdminAuth;
window.requireUserAuth = requireUserAuth;
window.checkDownloadPermission = checkDownloadPermission;
