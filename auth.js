/* =====================================================
   ROITX PLATFORM — AUTHENTICATION ENGINE (auth.js)
   ===================================================== */

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

    // Direct Redirect to profile.html for ALL users (User & Admin both)
    const redirectTarget = sessionStorage.getItem("redirect_after_login");

    if (redirectTarget) {
      sessionStorage.removeItem("redirect_after_login");
      window.location.href = redirectTarget;
    } else {
      window.location.href = window.getPageUrl("profile.html");
    }

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

  const { error } = await window.supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert(error.message);
  } else {
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
  const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.getPageUrl('login.html')
    }
  });

  if (error) {
    if (window.triggerErrorAnim) window.triggerErrorAnim();
    alert(error.message);
  }
}

// Global Exports
window.loginUser = loginUser;
window.signUpUser = signUpUser;
window.sendResetLink = sendResetLink;
window.updatePassword = updatePassword;
window.signInWithGoogle = signInWithGoogle;
