let currentUser = null;
let currentAvatarUrl = null;
let cropper = null;
let dangerHideTimer = null;

// Preset Avatars Data
const PRESET_AVATARS = [
  {
    title: "Student Boy",
    src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><radialGradient id='bg1' cx='50%' cy='30%' r='70%'><stop offset='0%' stop-color='%236366F1'/><stop offset='100%' stop-color='%23312E81'/></radialGradient><filter id='shadow' x='-20%' y='-20%' width='140%' height='140%'><feDropShadow dx='0' dy='4' stdDeviation='4' flood-opacity='0.3'/></filter></defs><circle cx='60' cy='60' r='60' fill='url(%23bg1)'/><g filter='url(%23shadow)'><circle cx='60' cy='48' r='22' fill='%23FDBA74'/><path d='M38 42 C38 25 82 25 82 42 C75 32 45 30 38 42 Z' fill='%231E1B4B'/><ellipse cx='52' cy='48' rx='2.5' ry='3.5' fill='%23334155'/><ellipse cx='68' cy='48' rx='2.5' ry='3.5' fill='%23334155'/><path d='M54 58 Q60 63 66 58' stroke='%23EA580C' stroke-width='2.5' stroke-linecap='round' fill='none'/><path d='M24 110 C24 82 40 70 60 70 C80 70 96 82 96 110 Z' fill='%236366F1'/><path d='M48 70 L72 70 L66 95 L54 95 Z' fill='%23FFFFFF' opacity='0.9'/></g></svg>"
  },
  {
    title: "Student Girl",
    src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><radialGradient id='bg2' cx='50%' cy='30%' r='70%'><stop offset='0%' stop-color='%23EC4899'/><stop offset='100%' stop-color='%23831843'/></radialGradient></defs><circle cx='60' cy='60' r='60' fill='url(%23bg2)'/><path d='M28 58 C22 28 98 28 92 58 C92 80 82 85 82 85 L38 85 C38 85 28 80 28 58 Z' fill='%23271510'/><circle cx='60' cy='50' r='20' fill='%23FED7AA'/><ellipse cx='52' cy='49' rx='2.5' ry='3.5' fill='%231F2937'/><ellipse cx='68' cy='49' rx='2.5' ry='3.5' fill='%231F2937'/><path d='M54 58 Q60 63 66 58' stroke='%23BE123C' stroke-width='2.5' stroke-linecap='round' fill='none'/><path d='M26 110 C26 84 42 72 60 72 C78 72 94 84 94 110 Z' fill='%23F472B6'/></svg>"
  },
  {
    title: "Gamer",
    src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><radialGradient id='bg3' cx='50%' cy='30%' r='70%'><stop offset='0%' stop-color='%238B5CF6'/><stop offset='100%' stop-color='%234C1D95'/></radialGradient></defs><circle cx='60' cy='60' r='60' fill='url(%23bg3)'/><circle cx='60' cy='50' r='21' fill='%23FDBA74'/><rect x='28' y='40' width='14' height='26' rx='7' fill='%2306B6D4'/><rect x='78' y='40' width='14' height='26' rx='7' fill='%2306B6D4'/><path d='M40 38 Q60 28 80 38' stroke='%2306B6D4' stroke-width='5' stroke-linecap='round' fill='none'/><ellipse cx='51' cy='50' rx='2.5' ry='3' fill='%231E293B'/><ellipse cx='69' cy='50' rx='2.5' ry='3' fill='%231E293B'/><path d='M55 60 Q60 63 65 60' stroke='%231E293B' stroke-width='2' fill='none'/><path d='M24 110 C24 82 40 72 60 72 C80 72 96 82 96 110 Z' fill='%230F172A'/><path d='M50 82 L70 82 L60 98 Z' fill='%23A855F7'/></svg>"
  },
  {
    title: "Topper",
    src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><radialGradient id='bg4' cx='50%' cy='30%' r='70%'><stop offset='0%' stop-color='%2310B981'/><stop offset='100%' stop-color='%23064E3B'/></radialGradient></defs><circle cx='60' cy='60' r='60' fill='url(%23bg4)'/><circle cx='60' cy='50' r='22' fill='%231E293B'/><rect x='38' y='42' width='44' height='15' rx='7.5' fill='%23FED7AA'/><circle cx='51' cy='49.5' r='3.5' fill='%230F172A'/><circle cx='69' cy='49.5' r='3.5' fill='%230F172A'/><path d='M34 40 L86 40 L80 28 L40 28 Z' fill='%230F172A'/><rect x='74' y='26' width='20' height='7' rx='3.5' fill='%23EF4444'/><path d='M22 110 C22 82 40 70 60 70 C80 70 98 82 98 110 Z' fill='%230F172A'/></svg>"
  },
  {
    title: "Master",
    src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><radialGradient id='bg5' cx='50%' cy='30%' r='70%'><stop offset='0%' stop-color='%23F59E0B'/><stop offset='100%' stop-color='%2378350F'/></radialGradient></defs><circle cx='60' cy='60' r='60' fill='url(%23bg5)'/><circle cx='60' cy='52' r='21' fill='%23FDBA74'/><path d='M20 28 L60 12 L100 28 L60 42 Z' fill='%231E1B4B'/><rect x='57' y='36' width='6' height='24' fill='%23FBBF24'/><circle cx='49' cy='51' r='8' stroke='%23334155' stroke-width='2.5' fill='none'/><circle cx='71' cy='51' r='8' stroke='%23334155' stroke-width='2.5' fill='none'/><line x1='57' y1='51' x2='63' y2='51' stroke='%23334155' stroke-width='2.5'/><path d='M22 110 C22 84 40 74 60 74 C80 74 98 84 98 110 Z' fill='%23312E81'/></svg>"
  }
];

function renderAvatarGrid() {
  const grid = document.getElementById("avatarGrid");
  if (!grid) return;
  
  grid.innerHTML = PRESET_AVATARS.map((item, index) => {
    return `
      <div class="avatar-card-item" onclick="selectPresetAvatar(${index})">
        <div class="avatar-option-item">
          <img src="${item.src}" alt="${item.title}">
        </div>
        <span class="avatar-label">${item.title}</span>
      </div>
    `;
  }).join('');
}

async function selectPresetAvatar(index) {
  const selected = PRESET_AVATARS[index];
  if (!selected) return;

  closeAvatarSelector();
  
  currentAvatarUrl = selected.src;
  localStorage.setItem("userPhoto", currentAvatarUrl);
  renderAvatarImage(currentAvatarUrl);

  if (currentUser) {
    try {
      await window.supabaseClient
        .from('profiles')
        .upsert({ 
          id: currentUser.id, 
          email: currentUser.email,
          avatar_url: currentAvatarUrl, 
          updated_at: new Date().toISOString()
        });
    } catch (err) {
      console.warn("Avatar DB update error:", err);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
  renderAvatarGrid();
});

// Danger Zone: 5 Seconds Reveal Handler
function toggleDangerDeleteBtn() {
  const wrapper = document.getElementById("dangerDeleteWrapper");
  const notice = document.getElementById("dangerZoneTimerNotice");
  if (!wrapper) return;

  if (dangerHideTimer) clearTimeout(dangerHideTimer);

  wrapper.style.display = "block";
  if (notice) notice.innerText = "(Visible for 5s)";

  let secondsLeft = 5;
  const interval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft > 0) {
      if (notice) notice.innerText = `(Hiding in ${secondsLeft}s)`;
    } else {
      clearInterval(interval);
    }
  }, 1000);

  dangerHideTimer = setTimeout(() => {
    wrapper.style.display = "none";
    if (notice) notice.innerText = "(Tap to unlock)";
  }, 5000);
}

// Calculate Profile Completion %
function getCompletionPercentage() {
  const fields = [
    document.getElementById("fullNameInput")?.value.trim(),
    document.getElementById("phoneInput")?.value.trim(),
    document.getElementById("classSelect")?.value.trim(),
    document.getElementById("streamSelect")?.value.trim(),
    document.getElementById("institutionInput")?.value.trim(),
    document.getElementById("cityInput")?.value.trim(),
    document.getElementById("stateInput")?.value.trim(),
    document.getElementById("pincodeInput")?.value.trim(),
    currentAvatarUrl
  ];

  let filledCount = 0;
  fields.forEach(val => {
    if (val) filledCount++;
  });

  return Math.round((filledCount / fields.length) * 100);
}

// Update Badge UI
function updateProfileProgress() {
  const percentage = getCompletionPercentage();
  const badge = document.getElementById("profileProgressBadge");

  if (badge) {
    if (percentage >= 100) {
      badge.innerHTML = '<i class="fa-solid fa-star"></i>';
      badge.classList.add("completed");
    } else {
      badge.innerText = `${percentage}%`;
      badge.classList.remove("completed");
    }
  }
}

function triggerCongratulationsAnimation() {
  if (typeof confetti === "function") {
    confetti({
      particleCount: 130,
      spread: 80,
      origin: { y: 0.6 }
    });
  }
}

// Bottom Sheet Option Handlers
function openPhotoOptions() {
  const removeBtn = document.getElementById("sheetRemoveBtn");
  if (currentAvatarUrl) {
    removeBtn.style.display = "flex";
  } else {
    removeBtn.style.display = "none";
  }
  document.getElementById("photoOptionsSheet").classList.add("active");
}

function closePhotoOptions(e) {
  if (e) e.stopPropagation();
  document.getElementById("photoOptionsSheet").classList.remove("active");
}

function triggerCamera() {
  closePhotoOptions();
  document.getElementById("avatarFileInputCamera").click();
}

function triggerGallery() {
  closePhotoOptions();
  document.getElementById("avatarFileInputGallery").click();
}

function openAvatarSelector() {
  closePhotoOptions();
  document.getElementById("avatarPickerSheet").classList.add("active");
}

function closeAvatarSelector(e) {
  if (e) e.stopPropagation();
  document.getElementById("avatarPickerSheet").classList.remove("active");
}

// Account Delete Confirmation Modal Handlers
function openDeleteConfirmModal() {
  if (!currentUser || !currentUser.email) return;

  const emailLabel = document.getElementById("confirmEmailLabel");
  const emailInput = document.getElementById("deleteConfirmEmailInput");
  const deleteBtn = document.getElementById("confirmDeleteActionBtn");

  if (emailLabel) emailLabel.innerText = `Type "${currentUser.email}" to confirm:`;
  if (emailInput) emailInput.value = "";
  
  if (deleteBtn) {
    deleteBtn.disabled = true;
    deleteBtn.style.opacity = "0.5";
    deleteBtn.style.cursor = "not-allowed";
  }

  document.getElementById("deleteConfirmModal").style.display = "flex";
}

function closeDeleteConfirmModal() {
  document.getElementById("deleteConfirmModal").style.display = "none";
}

function validateDeleteEmailInput() {
  const emailInput = document.getElementById("deleteConfirmEmailInput").value.trim();
  const deleteBtn = document.getElementById("confirmDeleteActionBtn");

  if (currentUser && emailInput.toLowerCase() === currentUser.email.toLowerCase()) {
    deleteBtn.disabled = false;
    deleteBtn.style.opacity = "1";
    deleteBtn.style.cursor = "pointer";
  } else {
    deleteBtn.disabled = true;
    deleteBtn.style.opacity = "0.5";
    deleteBtn.style.cursor = "not-allowed";
  }
}

// Dynamic Action Buttons Visibility Toggler
function applyRoleBasedUI(role, permissions = {}) {
  const normalizedRole = (role || "student").toLowerCase();
  const userRoleBadge = document.getElementById("userRoleBadge");

  // DOM Elements
  const adminBtn = document.getElementById("adminBtn");
  const manageTeamBtn = document.getElementById("manageTeamBtn");
  const sendNotifBtn = document.getElementById("sendNotifBtn");
  const uploadTestBtn = document.getElementById("uploadTestBtn");
  const aiTestBtn = document.getElementById("aiTestBtn");

  // Reset Display
  if (adminBtn) adminBtn.style.display = "none";
  if (manageTeamBtn) manageTeamBtn.style.display = "none";
  if (sendNotifBtn) sendNotifBtn.style.display = "none";
  if (uploadTestBtn) uploadTestBtn.style.display = "none";
  if (aiTestBtn) aiTestBtn.style.display = "none";

  const isSuperAdmin = (currentUser && currentUser.email && currentUser.email.toLowerCase() === "rohitrajgoh91@gmail.com") || normalizedRole === "superadmin";

  if (isSuperAdmin) {
    if (userRoleBadge) userRoleBadge.innerHTML = '<i class="fa-solid fa-crown"></i> Platform Super Admin';
    
    // Superadmin has permanent access to Admin Panel & Manage Team
    if (adminBtn) adminBtn.style.display = "flex";
    if (manageTeamBtn) manageTeamBtn.style.display = "flex";

    // Other features follow DB permissions (Fallback to true if not specified)
    if (permissions.send_notif !== false && sendNotifBtn) sendNotifBtn.style.display = "flex";
    if (permissions.manage_test !== false && uploadTestBtn) uploadTestBtn.style.display = "flex";
    if (permissions.ai_test !== false && aiTestBtn) aiTestBtn.style.display = "flex";

  } else if (normalizedRole === "admin") {
    if (userRoleBadge) userRoleBadge.innerHTML = '<i class="fa-solid fa-user-gear"></i> Admin';
    
    // Admin gets ALL permissions auto-unlocked/ON by default
    if (adminBtn) adminBtn.style.display = "flex";
    if (manageTeamBtn) manageTeamBtn.style.display = "flex";
    if (sendNotifBtn) sendNotifBtn.style.display = "flex";
    if (uploadTestBtn) uploadTestBtn.style.display = "flex";
    if (aiTestBtn) aiTestBtn.style.display = "flex";

  } else if (normalizedRole === "teammate" || normalizedRole === "moderator") {
    if (userRoleBadge) userRoleBadge.innerHTML = '<i class="fa-solid fa-user-shield"></i> Official Teammate';

    // Strict Rule: Teammate NEVER gets "Manage Teammates"
    if (manageTeamBtn) manageTeamBtn.style.display = "none";

    // Strictly check DB permissions for Teammates
    if (permissions.admin_panel && adminBtn) adminBtn.style.display = "flex";
    if (permissions.send_notif && sendNotifBtn) sendNotifBtn.style.display = "flex";
    if (permissions.manage_test && uploadTestBtn) uploadTestBtn.style.display = "flex";
    if (permissions.ai_test && aiTestBtn) aiTestBtn.style.display = "flex";

  } else {
    if (userRoleBadge) userRoleBadge.innerHTML = '<i class="fa-solid fa-graduation-cap"></i> Active Student';
  }
}

// Load User Profile Data with Role Support
async function loadUserProfile() {
  if (!window.supabaseClient) return;

  const user = await window.getCurrentUser();
  if (!user) {
    window.location.href = window.getPageUrl ? window.getPageUrl("login.html") : "login.html";
    return;
  }

  currentUser = user;
  document.getElementById("emailInput").value = user.email || "";

  try {
    const { data, error } = await window.supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) console.error("Profile Fetch Error:", error);

    const userRole = data?.role || "student";
    const permissions = data?.permissions || {};
    
    applyRoleBasedUI(userRole, permissions);

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

  if (window.applyAccessControl) {
    await window.applyAccessControl();
  }

  updateProfileProgress();
}

function renderInitialAvatar() {
  currentAvatarUrl = null;
  const name = document.getElementById("fullNameInput").value.trim();
  const email = document.getElementById("emailInput").value.trim();

  let initial = "U";
  if (name) initial = name.charAt(0).toUpperCase();
  else if (email) initial = email.charAt(0).toUpperCase();

  document.getElementById("avatarContainer").innerText = initial;
  updateProfileProgress();
}

function renderAvatarImage(url) {
  const cacheBustUrl = url.startsWith("data:") ? url : `${url}?t=${Date.now()}`;
  document.getElementById("avatarContainer").innerHTML = `<img src="${cacheBustUrl}" alt="Profile" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
  updateProfileProgress();
}

function handleFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const cropImg = document.getElementById("cropTargetImage");
    cropImg.src = e.target.result;
    document.getElementById("cropModal").style.display = "flex";

    if (cropper) cropper.destroy();

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

async function cropAndUpload() {
  if (!cropper || !currentUser) return;

  const canvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
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

      if (!publicData || !publicData.publicUrl) throw new Error("Failed to generate Public URL.");

      currentAvatarUrl = publicData.publicUrl;
      localStorage.setItem("userPhoto", currentAvatarUrl);

      renderAvatarImage(currentAvatarUrl);

      await window.supabaseClient
        .from('profiles')
        .upsert({ 
          id: currentUser.id, 
          email: currentUser.email,
          avatar_url: currentAvatarUrl, 
          updated_at: new Date().toISOString()
        });

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

async function deleteAvatarPhoto() {
  closePhotoOptions();
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

async function saveProfileDetails() {
  if (!currentUser) return;

  const msgBox = document.getElementById("statusMsg");
  msgBox.className = "status-msg";

  const phone = document.getElementById("phoneInput").value.trim();

  if (phone !== "" && phone.length !== 10) {
    msgBox.className = "status-msg error";
    msgBox.innerText = "❌ Mobile number exactly 10 digits ka hona chahiye!";
    msgBox.style.display = "block";
    return;
  }

  msgBox.innerText = "Saving profile details...";
  msgBox.style.display = "block";

  const fullName = document.getElementById("fullNameInput").value.trim();
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
    pincode: document.getElementById("pincodeInput") ? document.getElementById("pincodeInput").value.trim() : "",
    avatar_url: currentAvatarUrl,
    updated_at: new Date().toISOString()
  };

  try {
    const { error } = await window.supabaseClient.from('profiles').upsert(profileData);
    if (error) throw error;

    if (fullName) {
      document.getElementById("userDisplayName").innerText = fullName;
    }

    updateProfileProgress();

    if (getCompletionPercentage() >= 100) {
      triggerCongratulationsAnimation();
    }

    msgBox.className = "status-msg success";
    msgBox.innerText = "✅ Profile info saved successfully!";
    setTimeout(() => { msgBox.style.display = "none"; }, 3000);
  } catch (err) {
    msgBox.className = "status-msg error";
    msgBox.innerText = "❌ Save failed: " + err.message;
  }
}

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
async function clearAppCache() {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
    }
    localStorage.clear();
    sessionStorage.clear();
    alert("✅ App cache successfully cleared! Page reload ho raha hai.");
    window.location.reload();
  } catch (err) {
    console.error("Cache clear error:", err);
    alert("❌ Cache clear karne mein error aaya.");
  }
}

async function deleteUserAccount() {
  const emailInput = document.getElementById("deleteConfirmEmailInput").value.trim();
  
  if (!currentUser || emailInput.toLowerCase() !== currentUser.email.toLowerCase()) {
    alert("❌ Email match nahi hua! Account delete nahi kiya gaya.");
    return;
  }

  closeDeleteConfirmModal();

  const msgBox = document.getElementById("statusMsg");
  msgBox.className = "status-msg";
  msgBox.innerText = "Deleting account and cleaning database...";
  msgBox.style.display = "block";

  try {
    if (currentAvatarUrl && currentAvatarUrl.includes(currentUser.id)) {
      try {
        const path = currentAvatarUrl.split('/avatars/')[1];
        if (path) {
          await window.supabaseClient.storage.from('avatars').remove([path]);
        }
      } catch (stErr) {
        console.warn("Storage avatar cleanup skipped:", stErr);
      }
    }

    const { error: profileErr } = await window.supabaseClient
      .from('profiles')
      .delete()
      .eq('id', currentUser.id);

    if (profileErr) throw profileErr;

    // Service Worker Cache Clean-up addition
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    localStorage.clear();
    sessionStorage.clear();
    await window.supabaseClient.auth.signOut();

    alert("✅ Aapka account safaltapoorvak permanently delete kar diya gaya hai.");
    window.location.href = window.getPageUrl ? window.getPageUrl("login.html") : "login.html";

  } catch (err) {
    console.error("Account Delete Error:", err);
    msgBox.className = "status-msg error";
    msgBox.innerText = "❌ Delete failed: " + err.message;
  }
}

// Navigation Helper Functions
function goToAdminPanel() { 
  window.location.href = "admin-panel.html"; 
}

function goToManageTeam() { 
  window.location.href = "manage-team.html"; 
}

function goToSendNotification() { 
  window.location.href = "admin-notification.html"; 
}

function goToUploadTest() { 
  window.location.href = "admin-mange-tests.html"; 
}

function goToAiTestCreator() { 
  window.location.href = "admin-ai-tests.html"; 
}

function goToHome() { 
  window.location.href = "index.html"; 
}

async function logoutUser() {
  await window.supabaseClient.auth.signOut();
  localStorage.clear();
  window.location.href = "login.html";
}
