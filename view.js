document.addEventListener("DOMContentLoaded", () => {
  const classSelect = document.getElementById("classSelect");
  const subjectSelect = document.getElementById("subjectSelect");
  const chapterSelect = document.getElementById("chapterSelect");
  const msgBox = document.getElementById("msgBox");
  const previewBtn = document.getElementById("previewBtn");
  const viewFullBtn = document.getElementById("viewFullBtn");

  // Helper function to reset and disable buttons & dependent selects
  function resetSubjects() {
    subjectSelect.innerHTML = '<option value="">Select Class First</option>';
    subjectSelect.disabled = true;
    resetChapters();
  }

  function resetChapters() {
    chapterSelect.innerHTML = '<option value="">Select Subject First</option>';
    chapterSelect.disabled = true;
    if (previewBtn) previewBtn.disabled = true;
    if (viewFullBtn) viewFullBtn.disabled = true;
    msgBox.textContent = "";
  }

  // Class change handler
  if (classSelect) {
    classSelect.addEventListener("change", async () => {
      const clsVal = classSelect.value.trim();
      resetSubjects();

      if (!clsVal) return;

      if (window.supabaseClient) {
        try {
          msgBox.textContent = "✨ Searching subjects...";
          const { data, error } = await window.supabaseClient
            .from("notes")
            .select("subject")
            .eq("class", clsVal);

          if (!error && data && data.length > 0) {
            const uniqueSubjects = [...new Set(data.map(item => item.subject.toLowerCase()))];
            subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            uniqueSubjects.forEach(sub => {
              const opt = document.createElement("option");
              opt.value = sub;
              opt.textContent = sub.charAt(0).toUpperCase() + sub.slice(1);
              subjectSelect.appendChild(opt);
            });
            subjectSelect.disabled = false;
            msgBox.textContent = "";
          } else {
            msgBox.textContent = "🥺 Is class ke liye abhi koi notes available nahi hain!";
          }
        } catch (err) {
          console.warn("Supabase error:", err);
          msgBox.textContent = "⚠️ Error loading subjects.";
        }
      }
    });
  }

  // Subject change handler
  if (subjectSelect) {
    subjectSelect.addEventListener("change", async () => {
      const clsVal = classSelect.value.trim();
      const subVal = subjectSelect.value.trim();
      resetChapters();

      if (!subVal) return;

      if (window.supabaseClient) {
        try {
          msgBox.textContent = "✨ Searching chapters...";
          const { data, error } = await window.supabaseClient
            .from("notes")
            .select("chapter_number, chapter_name")
            .eq("class", clsVal)
            .ilike("subject", subVal)
            .order("chapter_number", { ascending: true });

          if (!error && data && data.length > 0) {
            chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
            data.forEach(item => {
              const opt = document.createElement("option");
              opt.value = item.chapter_number;
              opt.textContent = `Chapter ${item.chapter_number}: ${item.chapter_name || 'Untitled'}`;
              chapterSelect.appendChild(opt);
            });
            chapterSelect.disabled = false;
            msgBox.textContent = "";
          } else {
            msgBox.textContent = "🥺 Is subject ke liye chapters nahi jude hain!";
          }
        } catch (err) {
          console.warn("Supabase error:", err);
          msgBox.textContent = "⚠️ Error loading chapters.";
        }
      }
    });
  }

  // Chapter change handler (Enable/Disable Buttons)
  if (chapterSelect) {
    chapterSelect.addEventListener("change", () => {
      const chVal = chapterSelect.value.trim();
      if (chVal) {
        if (previewBtn) previewBtn.disabled = false;
        if (viewFullBtn) viewFullBtn.disabled = false;
      } else {
        if (previewBtn) previewBtn.disabled = true;
        if (viewFullBtn) viewFullBtn.disabled = true;
      }
    });
  }
});

// Helper function to resolve file path & details securely
async function getNoteDetails() {
  const classSelect = document.getElementById("classSelect");
  const subjectSelect = document.getElementById("subjectSelect");
  const chapterSelect = document.getElementById("chapterSelect");

  const clsVal = classSelect ? classSelect.value.trim() : "";
  const subVal = subjectSelect ? subjectSelect.value.trim() : "";
  const chVal = chapterSelect ? chapterSelect.value.trim() : "";

  if (!clsVal || !subVal || !chVal) {
    alert("❌ Kripya pehle Class, Subject aur Chapter select karein.");
    return null;
  }

  const cleanClassNum = clsVal;
  const className = `Class ${cleanClassNum}`;
  const subjectName = subVal.toUpperCase();
  const chapterNum = parseInt(chVal) || 1;

  let chapterTitle = `Chapter ${chapterNum}`;
  let filePath = "";

  if (window.supabaseClient) {
    try {
      const { data: notesData, error } = await window.supabaseClient
        .from("notes")
        .select("*")
        .eq("class", cleanClassNum)
        .ilike("subject", subVal)
        .eq("chapter_number", chapterNum)
        .maybeSingle();

      if (!error && notesData) {
        if (notesData.chapter_name) chapterTitle = notesData.chapter_name;
        if (notesData.file_path) filePath = notesData.file_path;
      }
    } catch (err) {
      console.warn("Supabase fetch warning:", err);
    }
  }

  if (!filePath) {
    filePath = `notes/${cleanClassNum}_${subVal}_ch${chapterNum}.pdf`;
  }

  const descriptiveName = [className, subjectName, `Chapter ${chapterNum} - ${chapterTitle}`].filter(Boolean).join(' • ');
  return { filePath, descriptiveName };
}

// Open Preview Modal (Using notes-viewer.html with viewer-main.js engine)
async function openPreviewModal() {
  const details = await getNoteDetails();
  if (!details) return;

  document.getElementById("modalTitle").textContent = details.descriptiveName;
  
  const viewerUrl = 'notes-viewer.html?path=' + encodeURIComponent(details.filePath) + '&name=' + encodeURIComponent(details.descriptiveName);
  
  document.getElementById("previewFrame").src = viewerUrl;
  document.getElementById("previewModal").classList.add("active");
}

// Close Preview Modal
function closePreviewModal() {
  document.getElementById("previewModal").classList.remove("active");
  document.getElementById("previewFrame").src = ""; // Stop background loading
}

// Redirect to full notes viewer page
async function loadPdf() {
  const details = await getNoteDetails();
  if (!details) return;

  const viewerUrl = 'notes-viewer.html?path=' + encodeURIComponent(details.filePath) + '&name=' + encodeURIComponent(details.descriptiveName);
  window.location.href = viewerUrl;
}
