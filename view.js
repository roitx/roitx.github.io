document.addEventListener("DOMContentLoaded", () => {
  const classSelect = document.getElementById("classSelect");
  const subjectSelect = document.getElementById("subjectSelect");
  const chapterSelect = document.getElementById("chapterSelect");
  const msgBox = document.getElementById("msgBox");

  // Class change hone par available subjects fetch karein
  if (classSelect) {
    classSelect.addEventListener("change", async () => {
      const clsVal = classSelect.value.trim();
      subjectSelect.innerHTML = '<option value="">Select Subject</option>';
      chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
      subjectSelect.disabled = true;
      chapterSelect.disabled = true;
      msgBox.textContent = "";

      if (!clsVal) return;

      if (window.supabaseClient) {
        try {
          msgBox.textContent = "✨ Searching available subjects...";
          const { data, error } = await window.supabaseClient
            .from("notes")
            .select("subject")
            .eq("class", clsVal);

          if (!error && data && data.length > 0) {
            // Unique subjects extract karna
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
            msgBox.textContent = "🥺 Maaf kijiye, is class ke liye abhi koi notes available nahi hain!";
          }
        } catch (err) {
          console.warn("Supabase error:", err);
          msgBox.textContent = "⚠️ Kuch error aa gaya, kripya dobara try karein.";
        }
      }
    });
  }

  // Subject change hone par available chapters fetch karein
  if (subjectSelect) {
    subjectSelect.addEventListener("change", async () => {
      const clsVal = classSelect.value.trim();
      const subVal = subjectSelect.value.trim();
      chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
      chapterSelect.disabled = true;
      msgBox.textContent = "";

      if (!subVal) return;

      if (window.supabaseClient) {
        try {
          msgBox.textContent = "✨ Searching available chapters...";
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
            msgBox.textContent = "🥺 Is subject ke liye abhi koi chapters nahi jude hain!";
          }
        } catch (err) {
          console.warn("Supabase error:", err);
          msgBox.textContent = "⚠️ Chapter load karne me samasya aayi.";
        }
      }
    });
  }
});

// Dropdown se direct notes-viewer.html par bhejne ke liye function
async function loadPdf() {
  const classSelect = document.getElementById("classSelect");
  const subjectSelect = document.getElementById("subjectSelect");
  const chapterSelect = document.getElementById("chapterSelect");

  const clsVal = classSelect ? classSelect.value.trim() : "";
  const subVal = subjectSelect ? subjectSelect.value.trim() : "";
  const chVal = chapterSelect ? chapterSelect.value.trim() : "";

  // Validation
  if (!clsVal || !subVal || !chVal) {
    alert("❌ Kripya Class, Subject aur Chapter teeno select karein.");
    return;
  }

  const cleanClassNum = clsVal;
  const className = `Class ${cleanClassNum}`;
  const subjectName = subVal.toUpperCase();
  const chapterNum = parseInt(chVal) || 1;

  let chapterTitle = `Chapter ${chapterNum}`;
  let filePath = "";

  // Supabase database se actual file_path aur chapter name fetch karna[span_2](start_span)[span_2](end_span)
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
        if (notesData.chapter_name) {
          chapterTitle = notesData.chapter_name; 
        }
        if (notesData.file_path) {
          filePath = notesData.file_path; 
        }
      }
    } catch (err) {
      console.warn("Supabase fetch warning:", err);
    }
  }

  // Fallback agar database me path na mile toh standard format use karenge
  if (!filePath) {
    const finalFileName = `${cleanClassNum}_${subVal}_ch${chapterNum}.pdf`;
    filePath = `notes/${finalFileName}`;
  }

  const descriptiveName = [className, subjectName, `Chapter ${chapterNum} - ${chapterTitle}`].filter(Boolean).join(' • ');
  const viewerUrl = 'notes-viewer.html?path=' + encodeURIComponent(filePath) + '&name=' + encodeURIComponent(descriptiveName);

  window.location.href = viewerUrl;
}
