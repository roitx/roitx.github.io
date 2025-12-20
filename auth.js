async function signUpUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await window.supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) alert(error.message);
  else {
    alert("Signup successful! Login now.");
    window.location.href = "index.html";
  }
}

async function loginUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await window.supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) alert(error.message);
  else window.location.href = "admin-panel.html";
}

