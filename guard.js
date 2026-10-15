// Modern & Premium UI Popup Modal Function for Access Denied
function showAccessDeniedModal(message) {
  // Agar pehle se koi modal hai toh use hata dein
  const existingModal = document.getElementById('customAccessModal');
  if (existingModal) existingModal.remove();

  // CSS Animation Inject Karein
  if (!document.getElementById('modalAnimations')) {
    const style = document.createElement('style');
    style.id = 'modalAnimations';
    style.innerHTML = `
      @keyframes modalScaleIn {
        0% { transform: scale(0.9); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 20px rgba(255, 71, 87, 0.2); }
        50% { box-shadow: 0 0 35px rgba(255, 71, 87, 0.4); }
      }
    `;
    document.head.appendChild(style);
  }

  const modalHtml = `
    <div id="customAccessModal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(5, 8, 17, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 999999; padding: 20px;">
      <div style="background: linear-gradient(145deg, #161f33, #0f172a); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 24px; padding: 32px 24px; width: 100%; max-width: 410px; text-align: center; box-shadow: 0 25px 60px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.1); color: #f8fafc; font-family: 'Inter', system-ui, -apple-system, sans-serif; animation: modalScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards, pulseGlow 3s infinite;">
        
        <!-- Animated Icon Container -->
        <div style="width: 68px; height: 68px; background: linear-gradient(135deg, rgba(255, 71, 87, 0.2), rgba(255, 71, 87, 0.05)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; border: 1px solid rgba(255, 71, 87, 0.35); box-shadow: inset 0 2px 4px rgba(255,71,87,0.2);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff4757" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        <span style="display: inline-block; background: rgba(255, 71, 87, 0.12); color: #ff4757; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; border: 1px solid rgba(255, 71, 87, 0.25);">
          Security Notice
        </span>

        <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #fff; letter-spacing: -0.3px;">Access Restricted</h3>
        <p style="font-size: 13.5px; color: #94a3b8; margin-bottom: 26px; line-height: 1.6;">${message}</p>
        
        <button onclick="window.location.href='profile.html'" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; padding: 13px 22px; border-radius: 14px; font-weight: 700; font-size: 13.5px; cursor: pointer; width: 100%; box-shadow: 0 8px 20px rgba(99, 102, 241, 0.45); transition: all 0.25s ease; display: flex; align-items: center; justify-content: center; gap: 8px;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 12px 25px rgba(99, 102, 241, 0.6)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 20px rgba(99, 102, 241, 0.45)';">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Wapas Profile Par Jayein
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Main Permission Check Function
async function requirePermission(requiredPermission) {
  try {
    if (!window.supabaseClient) {
      console.error("Supabase client not initialized!");
      window.location.href = "profile.html";
      return;
    }

    const { data: { user }, error: userErr } = await window.supabaseClient.auth.getUser();
    if (userErr || !user) {
      window.location.href = "login.html";
      return;
    }

    // 1. Superadmin email bypass check
    const isSuperAdmin = user.email && user.email.toLowerCase().trim() === "rohitrajgoh91@gmail.com";
    if (isSuperAdmin) {
      return; 
    }

    // 2. Database se user ka role aur permissions fetch karein
    const { data: profile, error: profileErr } = await window.supabaseClient
      .from('profiles')
      .select('role, permissions')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      window.location.href = "profile.html";
      return;
    }

    const role = (profile.role || 'student').toLowerCase();
    const permissions = profile.permissions || {};

    // 3. Agar role 'admin' hai toh sabhi pages allow hain
    if (role === 'admin') {
      return;
    }

    const currentPage = window.location.pathname.split("/").pop();

    // 4. Strict Security Rule: Teammates kabhi bhi 'manage-team.html' access nahi kar sakte
    if (currentPage === "manage-team.html" && role !== 'superadmin' && role !== 'admin') {
      showAccessDeniedModal("Aapke paas 'Manage Team' page ko access karne ki anumati nahi hai.");
      return;
    }

    // 5. Strict Rule for Teammates (Inhe sirf 4 pages allowed hain)
    if (role === 'teammate' || role === 'moderator') {
      const allowedPagesForTeammate = [
        "admin-ai-test.html", 
        "admin-mange-tests.html", 
        "admin-pyq-generator.html", 
        "manage-pyqs.html"
      ];

      if (!allowedPagesForTeammate.includes(currentPage)) {
        showAccessDeniedModal("Aapke account role ke mutabiq yeh page restricted hai.");
        return;
      }
    }

    // 6. Agar koi specific permission required hai
    if (requiredPermission && !permissions[requiredPermission]) {
      showAccessDeniedModal("Aapke account par yeh specific feature locked hai.");
      return;
    }

  } catch (err) {
    console.error("Access validation error:", err);
    window.location.href = "profile.html";
  }
}
