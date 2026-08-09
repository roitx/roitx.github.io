// Dropdown se direct notes-viewer.html par bhejne ke liye function

function loadPdf() {
  const classSelect = document.getElementById("classSelect");
  const subjectSelect = document.getElementById("subjectSelect");
  const chapterSelect = document.getElementById("chapterSelect");

  const cls = classSelect ? classSelect.value.trim() : "";
  const subject = subjectSelect ? subjectSelect.value.trim() : "";
  const chapter = chapterSelect ? chapterSelect.value.trim() : "";

  // Validation
  if (!cls || !subject || !chapter) {
    alert("❌ Kripya Class, Subject aur Chapter teeno select karein.");
    return;
  }

  // Exact same format as ask-chat.js
  const finalFileName = `${cls}_${subject}_${chapter}.pdf`;
  const fullPath = `notes/${finalFileName}`;

  // notes-viewer.html ke sath URL parameters link karein
  const viewerUrl = 'notes-viewer.html?path=' + encodeURIComponent(fullPath) + '&name=' + encodeURIComponent(finalFileName);

  // Redirect to notes-viewer page
  window.location.href = viewerUrl;
}
