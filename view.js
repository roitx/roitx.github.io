document.addEventListener("DOMContentLoaded", () => {
  const classSelect = document.getElementById("classSelect");
  const subjectSelect = document.getElementById("subjectSelect");
  const chapterSelect = document.getElementById("chapterSelect");
  const msgBox = document.getElementById("msgBox");
  const previewBtn = document.getElementById("previewBtn");
  const viewFullBtn = document.getElementById("viewFullBtn");
  const classIconWrap = document.getElementById("classIconWrap");
  const subjectIconWrap = document.getElementById("subjectIconWrap");
  const chapterIconWrap = document.getElementById("chapterIconWrap");

  // Roman mapping for classes
  const romanClasses = {
    "9": "IX",
    "10": "X",
    "11": "XI",
    "12": "XII"
  };

  // Comprehensive Subject Symbols mapping
  const subjectSymbols = {
    "bio": "🧬",
    "biology": "🧬",
    "math": "𝚺",
    "maths": "𝚺",
    "mathematics": "𝚺",
    "physics": "⚛️",
    "chemistry": "🧪",
    "english": "A",
    "hindi": "अ",
    "history": "🏛️",
    "geography": "🌍",
    "civics": "⚖️",
    "political science": "🗳️",
    "economics": "📈",
    "computer science": "💻",
    "it": "🖥️",
    "accountancy": "📊",
    "business studies": "💼",
    "science": "🔬",
    "social science": "🌐",
    "sanskrit": "ॐ"
  };

  const defaultClassSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8fa8cc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;
  const defaultSubjectSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8fa8cc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
  const defaultChapterSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8fa8cc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;

  function resetSubjects() {
    subjectSelect.innerHTML = '<option value="">Select Class First</option>';
    subjectSelect.disabled = true;
    subjectIconWrap.innerHTML = defaultSubjectSvg;
    resetChapters();
  }

  function resetChapters() {
    chapterSelect.innerHTML = '<option value="">Select Subject First</option>';
    chapterSelect.disabled = true;
    chapterIconWrap.innerHTML = defaultChapterSvg;
    if (previewBtn) previewBtn.disabled = true;
    if (viewFullBtn) viewFullBtn.disabled = true;
    msgBox.textContent = "";
  }

  // Class change handler
  if (classSelect) {
    classSelect.addEventListener("change", async () => {
      const clsVal = classSelect.value.trim();
      resetSubjects();

      if (!clsVal) {
        classIconWrap.innerHTML = defaultClassSvg;
        return;
      }

      // Jo class select ho, uska sahi Roman numeral yaha dynamic dikhega
      const romanClass = romanClasses[clsVal] || clsVal;
      classIconWrap.innerHTML = `<span style="font-size:13px; font-weight:800; color:#4a8bff; letter-spacing:0.5px;">${romanClass}</span>`;

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

      if (!subVal) {
        subjectIconWrap.innerHTML = defaultSubjectSvg;
        return;
      }

      const symbol = subjectSymbols[subVal] || "📖";
      subjectIconWrap.innerHTML = `<span style="font-size:15px; font-weight:bold;">${symbol}</span>`;

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

  // Chapter change handler (Without # symbol, only chapter number)
  if (chapterSelect) {
    chapterSelect.addEventListener("change", () => {
      const chVal = chapterSelect.value.trim();
      if (chVal) {
        if (previewBtn) previewBtn.disabled = false;
        if (viewFullBtn) viewFullBtn.disabled = false;
        chapterIconWrap.innerHTML = `<span style="font-size:13px; font-weight:800; color:#4a8bff;">${chVal}</span>`;
      } else {
        if (previewBtn) previewBtn.disabled = true;
        if (viewFullBtn) viewFullBtn.disabled = true;
        chapterIconWrap.innerHTML = defaultChapterSvg;
      }
    });
  }
});

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

async function openPreviewModal() {
  const details = await getNoteDetails();
  if (!details) return;

  document.getElementById("modalTitle").textContent = details.descriptiveName;
  
  const viewerUrl = 'notes-viewer.html?path=' + encodeURIComponent(details.filePath) + '&name=' + encodeURIComponent(details.descriptiveName);
  
  document.getElementById("previewFrame").src = viewerUrl;
  document.getElementById("previewModal").classList.add("active");
}

function closePreviewModal() {
  document.getElementById("previewModal").classList.remove("active");
  document.getElementById("previewFrame").src = "";
}

async function loadPdf() {
  const details = await getNoteDetails();
  if (!details) return;

  const viewerUrl = 'notes-viewer.html?path=' + encodeURIComponent(details.filePath) + '&name=' + encodeURIComponent(details.descriptiveName);
  window.location.href = viewerUrl;
}
