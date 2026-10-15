// Function jo check karega ki user ke paas page ka access hai ya nahi
async function requirePermission(requiredPermission) {
  try {
    if (!window.supabaseClient) {
      console.error("Supabase client not initialized!");
      window.location.href = "profile.html";
      return;
    }

    // 1. Current authenticated user fetch karein
    const { data: { user }, error: userErr } = await window.supabaseClient.auth.getUser();
    if (userErr || !user) {
      window.location.href = "login.html";
      return;
    }

    // 2. Superadmin email bypass check (jaise profile.js mein hai)[span_1](start_span)[span_1](end_span)
    const isSuperAdmin = user.email && user.email.toLowerCase().trim() === "rohitrajgoh91@gmail.com";
    if (isSuperAdmin) {
      return; // Superadmin ko sabhi pages ka full access hai[span_2](start_span)[span_2](end_span)
    }

    // 3. Database se user ka role aur permissions fetch karein[span_3](start_span)[span_3](end_span)
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

    // 4. Agar role 'admin' hai toh sabhi pages allow hain[span_4](start_span)[span_4](end_span)
    if (role === 'admin') {
      return;
    }

    // 5. Strict Security Rule: Teammates kabhi bhi 'manage-team.html' access nahi kar sakte[span_5](start_span)[span_5](end_span)
    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage === "manage-team.html" && role !== 'superadmin' && role !== 'admin') {
      alert("❌ Unauthorized: Teammates cannot access Manage Team page!");
      window.location.href = "profile.html";
      return;
    }

    // 6. Agar koi specific permission required hai, toh wo check karein
    if (requiredPermission && !permissions[requiredPermission]) {
      alert("❌ Aapke paas is page ko access karne ki permission nahi hai!");
      window.location.href = "profile.html";
      return;
    }

  } catch (err) {
    console.error("Access validation error:", err);
    window.location.href = "profile.html";
  }
}
