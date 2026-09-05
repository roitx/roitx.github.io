/* =====================================================
   ROITX PLATFORM — AUTHENTICATION ENGINE (auth.js)
   ===================================================== */

// Global Helper: Get Active User safely
window.getCurrentUser = async function() {
  if (!window.supabaseClient) return null;
  
  try {
    const { data: sessionData } = await window.supabaseClient.auth.getSession();
    if (sessionData?.session?.user) {
      return sessionData.session.user;
    }
    
    const { data: userData } = await window.supabaseClient.auth.getUser();
    return userData?.user || null;
  } catch (err) {
    console.warn("getCurrentUser Error:", err);
    return null;
  }
};

// Helper: Fetch Live Permissions from Supabase Profiles Table
async function getUserPermissions() {
  try {
    const user = await window.getCurrentUser();
    if (!user) return { role: 'student', permissions: {} };

    // Super Admin Permanent Access Check
    if (user.email && user.email.toLowerCase().trim() === "rohitrajgoh91@gmail.com") {
      return { 
        role: 'superadmin', 
        permissions: { admin_panel: true, manage_team: true, send_notif: true, manage_test: true, ai_test: true } 
      };
    }

    // Fetch from profiles table using schema fields
    const { data: profile, error } = await window.supabaseClient
      .from('profiles')
      .select('role, permissions')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !profile) {
      return { role: 'student', permissions: {} };
    }

    return {
      role: profile.role || 'student',
      permissions: profile.permissions || {}
    };
  } catch (err) {
    console.warn("Permission check error:", err);
    return { role: 'student', permissions: {} };
  }
}

// Helper: Apply UI Access Control automatically
async function applyAccessControl() {
  const { role, permissions } = await getUserPermissions();

  const isSuperAdmin = role === "superadmin";
  const isAdmin = role === "admin" || permissions.admin_panel;

  const superAdminElements = document.querySelectorAll(".super-admin-only");
  const aiTestElements = document.querySelectorAll(".ai-test-btn");
  const manageTestElements = document.querySelectorAll(".manage-test-btn");
  const testAdminElements = document.querySelectorAll(".test-admin-only");

  superAdminElements.forEach(el => {
    el.style.display = isSuperAdmin ? "block" : "none";
  });

  aiTestElements.forEach(el => {
    el.style.display = (isSuperAdmin || permissions.ai_test) ? "block" : "none";
  });

  manageTestElements.forEach(el => {
    el.style.display = (isSuperAdmin || permissions.manage_test) ? "block" : "none";
  });

  testAdminElements.forEach(el => {
    const hasAnyTestAccess = isSuperAdmin || permissions.ai_test || permissions.manage_test;
    el.style.display = hasAnyTestAccess ? "block" : "none";
  });
}

// Helper: Auth User Metadata to Profile DB Auto-Sync (Matching Exact Table Schema)
async function syncUserProfileFromAuth(user, extraMeta = {}) {
  if (!user || !window.supabaseClient) return;

  try {
    const metaName = extraMeta.full_name ||
                     user.user_metadata?.full_name || 
                     user.user_metadata?.name || "";
    
    const metaAvatar = user.user_metadata?.avatar_url || 
                       user.user_metadata?.picture || null;

    const fallbackName = metaName || (user.email ? user.email.split('@')[0] : "User");

    // Fetch current profile fields
    const { data: profile } = await window.supabaseClient
      .from('profiles')
      .select('full_name, avatar_url, phone, pincode, role, permissions')
      .eq('id', user.id)
      .maybeSingle();

    const newFullName = profile?.full_name || fallbackName;
    const newAvatarUrl = profile?.avatar_url || metaAvatar;
    const phone = profile?.phone || extraMeta.phone || null;
    const pincode = profile?.pincode || extraMeta.pincode || null;

    const isOwner = user.email && user.email.toLowerCase().trim() === "rohitrajgoh91@gmail.com";
    const userRole = profile?.role || (isOwner ? 'superadmin' : 'student');
    const userPerms = profile?.permissions || {};

    // Upsert exact matching fields (No is_admin column included)
    await window.supabaseClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: newFullName,
        avatar_url: newAvatarUrl,
        phone: phone,
        pincode: pincode,
        role: userRole,
        permissions: userPerms,
        updated_at: new Date().toISOString()
      });

    if (newAvatarUrl) {
      localStorage.setItem("userPhoto", newAvatarUrl);
    }

  } catch (err) {
    console.warn("Auto profile sync warning:", err);
  }
}

// Helper: Post-Login Redirect Handler
async function handlePostLoginRedirect() {
  try {
    const user = await window.getCurrentUser();
    if (user) {
      await syncUserProfileFromAuth(user);
    }
  } catch (err) {
    console.warn("Redirect sync check failed:", err);
  }

  let redirectTarget = sessionStorage.getItem("redirect_after_login");
  if (!redirectTarget) {
    const urlParams = new URLSearchParams(window.location.search);
    redirectTarget = urlParams.get("redirect");
  }

  if (redirectTarget) {
    sessionStorage.removeItem("redirect_after_login");
    window.location.href = redirectTarget;
  } else {
    window.location.href = window.getPageUrl ? window.getPageUrl("profile.html") : "profile.html";
  }
}

// 1. User Login Handler
async function loginUser() {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert("Kripya email aur password dono daalein.");
    return;
  }

  try {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      if (window.triggerErrorAnim) window.triggerErrorAnim();
      alert(error.message);
      return;
    }

    if (data?.user) {
      await syncUserProfileFromAuth(data.user);
    }

    handlePostLoginRedirect();

  } catch (err) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    console.error("Login Error:", err);
  }
}

// 2. User Sign Up Handler
async function signUpUser() {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const fullName = document.getElementById("fullName")?.value.trim() || email.split('@')[0];
  const phone = document.getElementById("phone")?.value.trim() || "";
  const pincode = document.getElementById("pincode")?.value.trim() || "";

  if (!email || !password) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert("Kripya email aur password dono bharein.");
    return;
  }

  const { data, error } = await window.supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone: phone, pincode: pincode }
    }
  });

  if (error) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    if (error.message.toLowerCase().includes("already registered") || error.status === 400) {
      alert("This email is already registered! Kripya login karein.");
      if (window.switchMode) window.switchMode("login");
      return;
    }
    alert(error.message);
    return;
  }

  if (data?.user) {
    await syncUserProfileFromAuth(data.user, { full_name: fullName, phone, pincode });
  }

  alert("Signup successful! Apne account me login karein.");
  if (window.switchMode) window.switchMode("login");
}

// 3. Reset Password Link Sender
async function sendResetLink() {
  const emailInput = document.getElementById("email");
  if (!emailInput) return;

  const email = emailInput.value.trim();

  if (!email) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert("Kripya apna registered email address daalein.");
    return;
  }

  const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.getPageUrl ? window.getPageUrl('login.html?reset=true') : 'login.html?reset=true'
  });

  if (error) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert(error.message);
  } else {
    alert("Password reset link aapke Gmail par bhej diya gaya hai!");
    if (window.switchMode) window.switchMode("login");
  }
}

// 4. Update Password
async function updatePassword() {
  const passwordInput = document.getElementById("password");
  if (!passwordInput) return;

  const newPassword = passwordInput.value;

  if (!newPassword) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert("Naya password daalein.");
    return;
  }

  const { error } = await window.supabaseClient.auth.updateUser({ password: newPassword });

  if (error) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert(error.message);
  } else {
    alert("Password successfully update ho gaya hai!");
    window.location.href = window.getPageUrl ? window.getPageUrl("login.html") : "login.html";
  }
}

// 5. Google Sign-In Handler
async function signInWithGoogle(forceConsent = false) {
  const targetUrl = window.getPageUrl ? window.getPageUrl('login.html') : window.location.origin + '/login.html';
  const queryParams = { access_type: 'offline' };
  if (forceConsent) queryParams.prompt = 'consent';

  const { error } = await window.supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: targetUrl, queryParams: queryParams }
  });

  if (error) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert(error.message);
  }
}

// Safe Initializer & Auth Change Listener
function initAuthSystem() {
  if (window.supabaseClient && window.supabaseClient.auth) {
    window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        await syncUserProfileFromAuth(session.user);
      }
      applyAccessControl();
    });
  }
  applyAccessControl();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthSystem);
} else {
  initAuthSystem();
}

// Global Exports
window.getUserPermissions = getUserPermissions;
window.applyAccessControl = applyAccessControl;
window.loginUser = loginUser;
window.signUpUser = signUpUser;
window.sendResetLink = sendResetLink;
window.updatePassword = updatePassword;
window.signInWithGoogle = signInWithGoogle;
window.handlePostLoginRedirect = handlePostLoginRedirect;
window.syncUserProfileFromAuth = syncUserProfileFromAuth;
