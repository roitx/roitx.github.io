/* =====================================================
   ROITX PLATFORM — AUTHENTICATION ENGINE (auth.js)
   ===================================================== */

// Helper Function: Auth User Metadata ko Profile Table me Auto-Sync karne ke liye
async function syncUserProfileFromAuth(user) {
  if (!user) return;

  try {
    const metaName = user.user_metadata?.full_name || user.user_metadata?.name || "";
    const metaAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    const defaultName = metaName || user.email.split('@')[0];

    const { data: profile } = await window.supabaseClient
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !profile.full_name || !profile.avatar_url) {
      await window.supabaseClient
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: profile?.full_name || defaultName,
          avatar_url: profile?.avatar_url || metaAvatar,
          updated_at: new Date().toISOString()
        });
    }
  } catch (err) {
    console.warn("Auto profile sync error:", err);
  }
}

// Helper Function for Redirect Handling
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
    window.location.href = window.getPageUrl("profile.html");
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

// 2. User Sign Up Handler (Updated with metadata & immediate profile creation)
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
    redirectTo: window.getPageUrl('login.html?reset=true')
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
    window.location.href = window.getPageUrl("login.html");
  }
}

// 5. Google Sign-In Handler
async function signInWithGoogle() {
  const redirectTarget = sessionStorage.getItem("redirect_after_login");
  
  const callbackUrl = redirectTarget 
    ? window.getPageUrl('login.html') 
    : window.getPageUrl('login.html');

  const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl
    }
  });

  if (error) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert(error.message);
  }
}

// Auto-run Sync check jab page load ho
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const user = await window.getCurrentUser();
    if (user) {
      await syncUserProfileFromAuth(user);
    }
  } catch (err) {
    // Silent catch
  }
});

// Global Exports
window.loginUser = loginUser;
window.signUpUser = signUpUser;
window.sendResetLink = sendResetLink;
window.updatePassword = updatePassword;
window.signInWithGoogle = signInWithGoogle;
window.handlePostLoginRedirect = handlePostLoginRedirect;
window.syncUserProfileFromAuth = syncUserProfileFromAuth;
