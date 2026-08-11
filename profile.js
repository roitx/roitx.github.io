let currentUser = null;
let currentAvatarUrl = null;
let cropper = null;

document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
});

// Load User Profile Data from Supabase
async function loadUserProfile() {
  if (!window.supabaseClient) return;

  const user = await window.getCurrentUser();

  if (!user) {
    window.location.href = window.getPageUrl("login.html");
    return;
  }

  currentUser = user;
  document.getElementById("emailInput").value = user.email || "";

  // 1. Check Admin Authorization
  const isAdmin = await window.checkIsAdmin();
  if (isAdmin) {
    document.getElementById("userRoleBadge").innerHTML = '<i class="fa-solid fa-crown"></i> Platform Admin';
    document.getElementById("adminBtn").style.display = "flex";
    document.getElementById("createFileBtn").style.display = "flex";
  } else {
    document.getElementById("userRoleBadge").innerHTML = '<i class="fa-solid fa-graduation-cap"></i> Active Student';
  }

  // 2. Fetch Profile Record
  try {
    const { data } = await window.supabaseClient
      .from('profiles')
      .select('full_name, country_code, phone, target_class, stream, institution, city, state, avatar_url')
      .eq('id', user.id)
      .single();

    if (data) {
      document.getElementById("fullNameInput").value = data.full_name || "";
      document.getElementById("countryCodeSelect").value = data.country_code || "+91";
      document.getElementById("phoneInput").value = data.phone || "";
      document.getElementById("classSelect").value = data.target_class || "";
      document.getElementById("streamSelect").value = data.stream || "";
      document.getElementById("institutionInput").value = data.institution || "";
      document.getElementById("cityInput").value = data.city || "";
      document.getElementById("stateInput").value = data.state || "";

      document.getElementById("userDisplayName").innerText = data.full_name || user.email.split('@')[0];

      if (data.avatar_url) {
        currentAvatarUrl = data.avatar_url;
        renderAvatarImage(data.avatar_url);
      } else {
        renderInitialAvatar();
      }
    } else {
      document.getElementById("userDisplayName").innerText = user.email.split('@')[0];
      renderInitialAvatar();
    }
  } catch (err) {
    console.warn("Could not fetch profile details:", err);
    document.getElementById("userDisplayName").innerText = user.email.split('@')[0];
    renderInitialAvatar();
  }
}

// Render Initial Letter Avatar
function renderInitialAvatar() {
  currentAvatarUrl = null;
  const name = document.getElementById("fullNameInput").value.trim();
  const email = document.getElementById("emailInput").value.trim();

  let initial = "U";
  if (name) {
    initial = name.charAt(0).toUpperCase();
  } else if (email) {
    initial = email.charAt(0).toUpperCase();
  }

  document.getElementById("avatarContainer").innerText = initial;
  document.getElementById("deletePhotoBtn").style.display = "none";
}

function updateInitialAvatar() {
  if (!currentAvatarUrl) {
    renderInitialAvatar();
  }
}

function renderAvatarImage(url) {
  document.getElementById("avatarContainer").innerHTML = `<img src="${url}" alt="Profile">`;
  document.getElementById("deletePhotoBtn").style.display = "inline-flex";
}

// Photo Selection & Cropper Logic
function triggerPhotoSelect() {
  document.getElementById("avatarFileInput").click();
}

function handleFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const cropImg = document.getElementById("cropTargetImage");
    cropImg.src = e.target.result;

    document.getElementById("cropModal").style.display = "flex";

    if (cropper) {
      cropper.destroy();
    }

    cropper = new Cropper(cropImg, {
      aspectRatio: 1,
      viewMode: 1,
      autoCropArea: 0.9,
      dragMode: 'move'
    });
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function closeCropModal() {
  document.getElementById("cropModal").style.display = "none";
  if (cropper) cropper.destroy();
}

// Crop & Upload Image to Supabase Storage
async function cropAndUpload() {
  if (!cropper || !currentUser) return;

  const canvas = cropper.getCroppedCanvas({
    width: 300,
    height: 300
  });

  closeCropModal();

  const msgBox = document.getElementById("statusMsg");
  msgBox.className = "status-msg";
  msgBox.innerText = "Saving cropped photo...";
  msgBox.style.display = "block";

  canvas.toBlob(async (blob) => {
    const filePath = `${currentUser.id}/avatar_${Date.now()}.png`;

    try {
      const { error: uploadErr } = await window.supabaseClient
        .storage
        .from('avatars')
        .upload(filePath, blob, { contentType: 'image/png', upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: publicData } = window.supabaseClient
        .storage
        .from('avatars')
        .getPublicUrl(filePath);

      currentAvatarUrl = publicData.publicUrl;
      localStorage.setItem("userPhoto", currentAvatarUrl);

      renderAvatarImage(currentAvatarUrl);

      await window.supabaseClient
        .from('profiles')
        .upsert({ id: currentUser.id, avatar_url: currentAvatarUrl, updated_at: new Date() });

      msgBox.className = "status-msg success";
      msgBox.innerText = "✅ Profile photo updated!";
      setTimeout(() => { msgBox.style.display = "none"; }, 3000);

    } catch (err) {
      msgBox.className = "status-msg error";
      msgBox.innerText = "❌ Upload failed: " + err.message;
    }
  }, 'image/png');
}

// Delete Profile Photo
async function deleteAvatarPhoto() {
  if (!currentUser) return;
  if (!confirm("Kya aap photo hatana chahte hain?")) return;

  const msgBox = document.getElementById("statusMsg");
  msgBox.className = "status-msg";
  msgBox.innerText = "Deleting photo...";
  msgBox.style.display = "block";

  try {
    const { error } = await window.supabaseClient
      .from('profiles')
      .update({ avatar_url: null, updated_at: new Date() })
      .eq('id', currentUser.id);

    if (error) throw error;

    localStorage.removeItem("userPhoto");
    renderInitialAvatar();

    msgBox.className = "status-msg success";
    msgBox.innerText = "✅ Profile photo deleted!";
    setTimeout(() => { msgBox.style.display = "none"; }, 3000);
  } catch (err) {
    msgBox.className = "status-msg error";
    msgBox.innerText = "❌ Delete failed: " + err.message;
  }
}

// Save Full Profile Info
async function saveProfileDetails() {
  if (!currentUser) return;

  const msgBox = document.getElementById("statusMsg");
  msgBox.className = "status-msg";
  msgBox.innerText = "Saving profile details...";
  msgBox.style.display = "block";

  const profileData = {
    id: currentUser.id,
    full_name: document.getElementById("fullNameInput").value.trim(),
    country_code: document.getElementById("countryCodeSelect").value,
    phone: document.getElementById("phoneInput").value.trim(),
    target_class: document.getElementById("classSelect").value,
    stream: document.getElementById("streamSelect").value,
    institution: document.getElementById("institutionInput").value.trim(),
    city: document.getElementById("cityInput").value.trim(),
    state: document.getElementById("stateInput").value.trim(),
    avatar_url: currentAvatarUrl,
    updated_at: new Date()
  };

  try {
    const { error } = await window.supabaseClient
      .from('profiles')
      .upsert(profileData);

    if (error) throw error;

    document.getElementById("userDisplayName").innerText = profileData.full_name || currentUser.email.split('@')[0];
    msgBox.className = "status-msg success";
    msgBox.innerText = "✅ Profile info saved successfully!";
    setTimeout(() => { msgBox.style.display = "none"; }, 3000);
  } catch (err) {
    msgBox.className = "status-msg error";
    msgBox.innerText = "❌ Save failed: " + err.message;
  }
}

// Change Account Password
async function setGoogleUserPassword() {
  const newPassword = document.getElementById("newPasswordInput").value;
  if (!newPassword || newPassword.length < 6) {
    alert("Password kam se kam 6 characters ka hona chahiye!");
    return;
  }

  const { error } = await window.supabaseClient.auth.updateUser({ password: newPassword });

  if (error) {
    alert("❌ Password update failed: " + error.message);
  } else {
    alert("✅ Password successfully updated!");
    document.getElementById("newPasswordInput").value = "";
  }
}

// Navigation Actions
function goToAdminPanel() {
  window.location.href = "admin.html";
}

function goToCreateFile() {
  window.location.href = "create-file.html";
}

function goToHome() {
  window.location.href = "index.html";
}

async function logoutUser() {
  await window.supabaseClient.auth.signOut();
  localStorage.clear();
  window.location.href = "login.html";
}
