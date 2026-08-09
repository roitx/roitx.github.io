// 🔹 DOM Elements
const classSelect   = document.getElementById("classSelect");
const subjectSelect = document.getElementById("subjectSelect");
const chapterSelect = document.getElementById("chapterSelect");

function loadPdf() {
  const cls     = classSelect ? classSelect.value : "";
  const subject = subjectSelect ? subjectSelect.value : "";
  const chapter = chapterSelect ? chapterSelect.value : "";

  // 🔴 Validation
  if (!cls || !subject || !chapter) {
    alert("❌ Please select Class, Subject, and Chapter");
    return;
  }

  // 📄 Standard File & Path Format
  // Example: 10_physics_ch3.pdf
  const fileName = `${cls}_${subject}_${chapter}.pdf`;
  const fullPath = `notes/${fileName}`;

  // 👉 Build Viewer URL matching ask-chat.js convention
  const viewerUrl = `notes-viewer.html?path=${encodeURIComponent(fullPath)}&name=${encodeURIComponent(fileName)}`;

  // 🚀 Open in new tab so the main page stays open
  window.open(viewerUrl, '_blank');
}
