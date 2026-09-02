let currentUser = null;
let currentAvatarUrl = null;
let cropper = null;
let dangerHideTimer = null;

// High-Quality 3D Realistic Avatars (URL-encoded Clean Data URIs)
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

// Toggle Eye SVG Password Visibility Function
function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";

  // Eye and Eye-Slash SVG Paths
  const eyeOpenSvg = `<svg class="eye-icon" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
  const eyeClosedSvg = `<svg class="eye-icon" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.17c0-1.66-1.34-3-3-3l-.17.02z"/></svg>`;

  btnEl.innerHTML = isPassword ? eyeClosedSvg : eyeOpenSvg;
}

// Reveal Confirm Password Box dynamically when typing starts
function handleNewPasswordInput() {
  const newPass = document.getElementById("newPasswordInput").value;
  const confirmGroup = document.getElementById("confirmPasswordGroup");

  if (newPass.length > 0) {
    confirmGroup.classList.add("visible");
  } else {
    confirmGroup.classList.remove("visible");
    document.getElementById("confirmPasswordInput").value = "";
  }
}

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

// Load User Profile Data with Reliable Fallbacks
async function loadUserProfile() {
  if (!window.supabaseClient) return;

  const user = await window.getCurrentUser();
  if (!user) {
    window.location.href = window.getPageUrl ? window.getPageUrl("login.html") : "login.html";
    return;
  }

  currentUser = user;
  document.getElementById("emailInput").value = user.email || "";

  // Dynamic Name Resolution (Meta Google Name > Meta Full Name > Saved DB Name > Fallback)
  const metaGoogleName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.custom_name || "";
  const metaAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  const isAdmin = await window.checkIsAdmin();
  if (isAdmin) {
    document.getElementById("userRoleBadge").innerHTML = '<i class="fa-solid fa-crown"></i> Platform Admin';
    if (document.getElementById("adminBtn")) document.getElementById("adminBtn").style.display = "flex";
    if (document.getElementById("sendNotifBtn")) document.getElementById("sendNotifBtn").style.display = "flex";
    if (document.getElementById("uploadTestBtn")) document.getElementById("uploadTestBtn").style.display = "flex";
    if (document.getElementById("aiTestBtn")) document.getElementById("aiTestBtn").style.display = "flex";
  } else {
    document.getElementById("userRoleBadge").innerHTML = '<i class="fa-solid fa-graduation-cap"></i> Active Student';
  }

  try {
    const { data } = await window.supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const resolvedName = data?.full_name || metaGoogleName || user.email.split('@')[0];
    const resolvedAvatar = data?.avatar_url || metaAvatar;

    document.getElementById("fullNameInput").value = data?.full_name || metaGoogleName || "";
    document.getElementById("countryCodeSelect").value = data?.country_code || "+91";
    document.getElementById("phoneInput").value = data?.phone || "";
    document.getElementById("classSelect").value = data?.target_class || "";
    document.getElementById("streamSelect").value = data?.stream || "";
    document.getElementById("institutionInput").value = data?.institution || "";
    document.getElementById("cityInput").value = data?.city || "";
    document.getElementById("stateInput").value = data?.state || "";
    if (document.getElementById("pincodeInput")) {
      document.getElementById("pincodeInput").value = data?.pincode || "";
    }

    document.getElementById("userDisplayName").innerText = resolvedName;

    if (resolvedAvatar) {
      currentAvatarUrl = resolvedAvatar;
      renderAvatarImage(resolvedAvatar);
    } else {
      renderInitialAvatar();
    }

    // Auto sync back to DB if meta was retrieved
    if ((!data || !data.full_name || !data.avatar_url) && (metaGoogleName || metaAvatar)) {
      window.syncUserProfileFromAuth(user);
    }

  } catch (err) {
    console.warn("Could not fetch profile details:", err);
    document.getElementById("userDisplayName").innerText = metaGoogleName || user.email.split('@')[0];
    if (metaAvatar) {
      renderAvatarImage(metaAvatar);
    } else {
      renderInitialAvatar();
    }
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

// Updated Password Change Execution Function with Confirmation Check
async function setGoogleUserPassword() {
  const newPassword = document.getElementById("newPasswordInput").value;
  const confirmPassword = document.getElementById("confirmPasswordInput").value;

  if (!newPassword || newPassword.length < 6) {
    alert("❌ Password kam se kam 6 characters ka hona chahiye!");
    return;
  }

  if (newPassword !== confirmPassword) {
    alert("❌ Dono passwords match nahi kar rahe hain! Kripya re-check karein.");
    return;
  }

  const msgBox = document.getElementById("statusMsg");
  msgBox.className = "status-msg";
  msgBox.innerText = "Updating password...";
  msgBox.style.display = "block";

  const { error } = await window.supabaseClient.auth.updateUser({ password: newPassword });

  if (error) {
    msgBox.className = "status-msg error";
    msgBox.innerText = "❌ Password update failed: " + error.message;
  } else {
    msgBox.className = "status-msg success";
    msgBox.innerText = "✅ Password successfully updated!";
    document.getElementById("newPasswordInput").value = "";
    document.getElementById("confirmPasswordInput").value = "";
    document.getElementById("confirmPasswordGroup").classList.remove("visible");
    setTimeout(() => { msgBox.style.display = "none"; }, 3000);
  }
}

// Account Deletion Execution Function
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
