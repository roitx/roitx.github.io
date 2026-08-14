// site.js - shared helpers & notes loader system

function goto(page) { 
  window.location.href = page; 
}

function mailSupport() { 
  window.location.href = 'mailto:masumboy141@gmail.com?subject=Support'; 
}

// theme persist simple
(function() {
  const key = 'rk_theme';
  const t = localStorage.getItem(key);
  if (t === 'dark') document.documentElement.style.background = '#081226';
})();

// small helper to get param
function param(name) { 
  return new URLSearchParams(window.location.search).get(name); 
}

/* =====================================================
   UNIVERSAL SUBJECT NOTES CHECKER & CENTER POPUP SYSTEM
   ===================================================== */

async function openSubject(subjectName) {
  if (typeof CURRENT_CLASS === "undefined") {
    alert("❌ Error: CURRENT_CLASS variable missing!");
    return;
  }

  // 1. Center Screen Popup / Modal Create Karein
  const existingModal = document.getElementById("searchPopupModal");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = "searchPopupModal";
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(8, 18, 38, 0.85);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.2s ease-in-out;
  `;

  modal.innerHTML = `
    <div style="background: #1f3554; padding: 30px 40px; border-radius: 16px; border: 1px solid rgba(58, 160, 255, 0.4); text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); max-width: 320px; width: 90%;">
      <div style="width: 45px; height: 45px; border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid #3aa0ff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px auto;"></div>
      <h3 style="color: #ffffff; margin: 0 0 8px 0; font-size: 18px; font-family: inherit;">Searching Notes...</h3>
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">Class ${CURRENT_CLASS} • ${subjectName.toUpperCase()}</p>
    </div>
    <style>
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    </style>
  `;

  document.body.appendChild(modal);

  try {
    // Thoda sa smooth delay taaki popup achhe se dikhe
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Supabase Database me Search
    const { data: notes, error } = await window.supabaseClient
      .from("notes")
      .select("*")
      .eq("class", String(CURRENT_CLASS))
      .eq("subject", subjectName.toLowerCase().trim())
      .order("chapter_number", { ascending: true });

    // Popup ko hata dein
    modal.remove();

    // 3. Agar Notes nahi mile ya Error aaya -> working.html par redirect
    if (error || !notes || notes.length === 0) {
      window.location.href = "working.html";
      return;
    }

    // 4. Agar Notes mil gaye -> Container me Display Karein (Exact same format as loadPdf)
    const container = document.getElementById("notesContainer");
    if (container) {
      container.innerHTML = `<h3 style="color:#3aa0ff; margin-top:20px; margin-bottom: 15px;">📄 ${subjectName.toUpperCase()} Chapters</h3>`;
      
      notes.forEach(note => {
        // Filename aur fullPath construct karein bilkul loadPdf ki tarah
        const finalFileName = `${note.file_name || (CURRENT_CLASS + '_' + subjectName + '_' + note.chapter_number + '.pdf')}`;
        const fullPath = note.file_path ? note.file_path : `notes/${finalFileName}`;
        const displayName = note.chapter_name || `Chapter ${note.chapter_number}`;

        const row = document.createElement("div");
        row.style.cssText = "margin-bottom:12px; padding:14px 18px; background:#1f3554; border-radius:10px; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";
        row.innerHTML = `
          <div>
            <span style="font-size:11px; background:#3aa0ff; color:#081226; padding:3px 8px; border-radius:4px; font-weight:bold; text-transform:uppercase;">Chapter ${note.chapter_number}</span>
            <h4 style="margin:8px 0 0 0; color:#fff; font-size: 16px;">${displayName}</h4>
          </div>
          <button class="btn" style="padding:8px 16px; cursor:pointer;" onclick="openCustomViewer('${fullPath}', '${finalFileName}')">📖 Read</button>
        `;
        container.appendChild(row);
      });

      // Automatically thoda sa scroll karke chapters ki taraf le jayega
      container.scrollIntoView({ behavior: 'smooth' });
    }

  } catch (err) {
    console.error("Fetch failure:", err);
    if (modal) modal.remove();
    window.location.href = "working.html";
  }
}

// Helper function to handle viewer redirection identically to loadPdf
function openCustomViewer(fullPath, finalFileName) {
  const viewerUrl = 'notes-viewer.html?path=' + encodeURIComponent(fullPath) + '&name=' + encodeURIComponent(finalFileName);
  window.location.href = viewerUrl;
}
