/* =====================================================
   ROITX PLATFORM — AUTHENTICATION ENGINE (auth.js)
   ===================================================== */

// Helper: Enhanced Auth User Metadata to Profile DB Auto-Sync
async function syncUserProfileFromAuth(user) {
  if (!user || !window.supabaseClient) return;

  try {
    const metaName = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.user_metadata?.custom_name || "";
    
    const metaAvatar = user.user_metadata?.avatar_url || 
                      user.user_metadata?.picture || 
                      null;

    const fallbackName = metaName || (user.email ? user.email.split('@')[0] : "User");

    // Check existing profile record
    const { data: profile } = await window.supabaseClient
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    const newFullName = profile?.full_name || fallbackName;
    const newAvatarUrl = profile?.avatar_url || metaAvatar;

    // Upsert to ensure complete sync on every login/OAuth callback
    await window.supabaseClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: newFullName,
        avatar_url: newAvatarUrl,
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

  const redirectTarget = sessionStorage.getItem("redirect_after_login");
  if (redirectTarget) {
    sessionStorage.removeItem("redirect_after_login");
    window.location.href = redirectTarget;
  } else {
    window.location.href = window.getPageUrl ? window.getPageUrl("profile.html") : "profile.html";
  }
}

// 1. User Login Handler
async function loginUser() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

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
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert("Kripya email aur password dono bharein.");
    return;
  }

  const defaultName = email.split('@')[0];

  const { data, error } = await window.supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: defaultName
      }
    }
  });

  if (error) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert(error.message);
  } else {
    if (data?.user) {
      await syncUserProfileFromAuth(data.user);
    }
    alert("Signup successful! Apne account me login karein.");
    if (window.switchMode) window.switchMode("login");
  }
}

// 3. Reset Password Link Sender
async function sendResetLink() {
  const email = document.getElementById("email").value.trim();

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
    alert("Password reset link aapke Gmail par bhej diya gaya hai! Link par click karein.");
    if (window.switchMode) window.switchMode("login");
  }
}

// 4. Update Password
async function updatePassword() {
  const newPassword = document.getElementById("password").value;

  if (!newPassword) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert("Naya password daalein.");
    return;
  }

  const { error } = await window.supabaseClient.auth.updateUser({
    password: newPassword
  });

  if (error) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert(error.message);
  } else {
    alert("Password successfully update ho gaya hai!");
    window.location.href = window.getPageUrl ? window.getPageUrl("login.html") : "login.html";
  }
}

// 5. Google Sign-In Handler
async function signInWithGoogle() {
  const targetUrl = window.getPageUrl ? window.getPageUrl('login.html') : window.location.origin + '/login.html';

  const { error } = await window.supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: targetUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });

  if (error) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert(error.message);
  }
}

// Session state listener & Automatic Sync Engine initialization
if (window.supabaseClient) {
  window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
      await syncUserProfileFromAuth(session.user);
    }
  });
}

// Global Exports
window.loginUser = loginUser;
window.signUpUser = signUpUser;
window.sendResetLink = sendResetLink;
window.updatePassword = updatePassword;
window.signInWithGoogle = signInWithGoogle;
window.handlePostLoginRedirect = handlePostLoginRedirect;
window.syncUserProfileFromAuth = syncUserProfileFromAuth;
