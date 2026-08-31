let currentUser = null;
let currentAvatarUrl = null;
let cropper = null;

document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
});

// 1. Load User Profile Data from Supabase
async function loadUserProfile() {
  if (!window.supabaseClient) return;

  const user = await window.getCurrentUser();

  if (!user) {
    window.location.href = window.getPageUrl("login.html");
    return;
  }

  currentUser = user;
  document.getElementById("emailInput").value = user.email || "";

  // Check Admin Authorization & Show Admin-Only Buttons
  const isAdmin = await window.checkIsAdmin();
  if (isAdmin) {
    document.getElementById("userRoleBadge").innerHTML = '<i class="fa-solid fa-crown"></i> Platform Admin';
    
    // Admin Only Buttons Show Logic
    if (document.getElementById("adminBtn")) document.getElementById("adminBtn").style.display = "flex";
    if (document.getElementById("sendNotifBtn")) document.getElementById("sendNotifBtn").style.display = "flex";
    if (document.getElementById("uploadTestBtn")) document.getElementById("uploadTestBtn").style.display = "flex";
    if (document.getElementById("aiTestBtn")) document.getElementById("aiTestBtn").style.display = "flex";
  } else {
    document.getElementById("userRoleBadge").innerHTML = '<i class="fa-solid fa-graduation-cap"></i> Active Student';
  }

  // Fetch Profile Record (Including Pincode)
  try {
    const { data, error } = await window.supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      document.getElementById("fullNameInput").value = data.full_name || "";
      document.getElementById("countryCodeSelect").value = data.country_code || "+91";
      document.getElementById("phoneInput").value = data.phone || "";
      document.getElementById("classSelect").value = data.target_class || "";
      document.getElementById("streamSelect").value = data.stream || "";
      document.getElementById("institutionInput").value = data.institution || "";
      document.getElementById("cityInput").value = data.city || "";
      document.getElementById("stateInput").value = data.state || "";
      if (document.getElementById("pincodeInput")) {
        document.getElementById("pincodeInput").value = data.pincode || "";
      }

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

// 2. Render Initial Letter Avatar
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

// Render Avatar Image with Cache Busting
function renderAvatarImage(url) {
  const cacheBustUrl = `${url}?t=${Date.now()}`;
  document.getElementById("avatarContainer").innerHTML = `<img src="${cacheBustUrl}" alt="Profile" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
  document.getElementById("deletePhotoBtn").style.display = "inline-flex";
}

// 3. Photo Selection & Cropper Logic
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

// 4. Crop & Upload Image to Supabase Storage
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
    const fileExt = "png";
    const filePath = `${currentUser.id}/avatar_${Date.now()}.${fileExt}`;

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

      if (!publicData || !publicData.publicUrl) {
        throw new Error("Failed to generate Public URL for Avatar.");
      }

      currentAvatarUrl = publicData.publicUrl;
      localStorage.setItem("userPhoto", currentAvatarUrl);

      renderAvatarImage(currentAvatarUrl);

      const { error: dbErr } = await window.supabaseClient
        .from('profiles')
        .upsert({ 
          id: currentUser.id, 
          email: currentUser.email,
          avatar_url: currentAvatarUrl, 
          updated_at: new Date().toISOString()
        });

      if (dbErr) throw dbErr;

      msgBox.className = "status-msg success";
      msgBox.innerText = "✅ Profile photo updated!";
      setTimeout(() => { msgBox.style.display = "none"; }, 3000);

    } catch (err) {
      console.error("Avatar Error:", err);
      msgBox.className = "status-msg error";
      msgBox.innerText = "❌ Upload failed: " + err.message;
    }
  }, 'image/png');
}

// 5. Delete Profile Photo
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
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
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

// 6. Save Full Profile Info (Strict 10-Digit Mobile & Pincode Validation)
async function saveProfileDetails() {
  if (!currentUser) return;

  const msgBox = document.getElementById("statusMsg");
  msgBox.className = "status-msg";

  const phone = document.getElementById("phoneInput").value.trim();

  // Strict 10-Digit Validation
  if (phone !== "" && phone.length !== 10) {
    msgBox.className = "status-msg error";
    msgBox.innerText = "❌ Mobile number exactly 10 digits ka hona chahiye!";
    msgBox.style.display = "block";
    return;
  }

  msgBox.innerText = "Saving profile details...";
  msgBox.style.display = "block";

  const fullName = document.getElementById("fullNameInput").value.trim();
  const pincodeVal = document.getElementById("pincodeInput") ? document.getElementById("pincodeInput").value.trim() : "";

  const profileData = {
    id: currentUser.id,
    email: currentUser.email,
    full_name: fullName,
    country_code: document.getElementById("countryCodeSelect").value,
    phone: phone,
    target_class: document.getElementById("classSelect").value,
    stream: document.getElementById("streamSelect").value,
    institution: document.getElementById("institutionInput").value.trim(),
    city: document.getElementById("cityInput").value.trim(),
    state: document.getElementById("stateInput").value.trim(),
    pincode: pincodeVal,
    avatar_url: currentAvatarUrl,
    updated_at: new Date().toISOString()
  };

  try {
    const { error } = await window.supabaseClient
      .from('profiles')
      .upsert(profileData);

    if (error) throw error;

    if (fullName) {
      document.getElementById("userDisplayName").innerText = fullName;
    }

    msgBox.className = "status-msg success";
    msgBox.innerText = "✅ Profile info saved successfully!";
    setTimeout(() => { msgBox.style.display = "none"; }, 3000);
  } catch (err) {
    msgBox.className = "status-msg error";
    msgBox.innerText = "❌ Save failed: " + err.message;
  }
}

// Password Actions
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
function goToAdminPanel() { window.location.href = "admin-panel.html"; }
function goToSendNotification() { window.location.href = "admin-notifications.html"; }
function goToUploadTest() { window.location.href = "admin-manage-tests.html"; }
function goToAiTestCreator() { window.location.href = "admin-ai-test.html"; }
function goToHome() { window.location.href = "index.html"; }

async function logoutUser() {
  await window.supabaseClient.auth.signOut();
  localStorage.clear();
  window.location.href = "login.html";
}
