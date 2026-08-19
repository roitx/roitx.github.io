// Dropdown se direct notes-viewer.html par bhejne ke liye function (Supabase se Chapter Name fetch karke)
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

  // Class number aur Subject ko clean format me banana
  const cleanClassNum = clsVal.replace("class", "");
  const className = `Class ${cleanClassNum}`;
  const subjectName = subVal.toUpperCase();
  const chapterNum = parseInt(chVal.replace("ch", "")) || 1;

  let chapterTitle = `Chapter ${chapterNum}`;
  let filePath = "";

  // Supabase database se actual chapter_name fetch karte hain
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
          chapterTitle = notesData.chapter_name; // Database wala real chapter name
        }
        if (notesData.file_path) {
          filePath = notesData.file_path; // Database wala exact file path
        }
      }
    } catch (err) {
      console.warn("Supabase fetch warning:", err);
    }
  }

  // Fallback agar database me path na mile toh standard format use karenge
  if (!filePath) {
    const finalFileName = `${cleanClassNum}_${subVal}_${chVal}.pdf`;
    filePath = `notes/${finalFileName}`;
  }

  // Viewer ke upar dikhane ke liye clean descriptive title (Class • Subject • Chapter Name)
  const descriptiveName = [className, subjectName, chapterTitle].filter(Boolean).join(' • ');

  // notes-viewer.html ke sath proper path aur descriptive name link karein
  const viewerUrl = 'notes-viewer.html?path=' + encodeURIComponent(filePath) + '&name=' + encodeURIComponent(descriptiveName);

  // Redirect to notes-viewer page
  window.location.href = viewerUrl;
}
