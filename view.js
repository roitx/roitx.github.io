// Dropdown se direct notes-viewer.html par bhejne ke liye function (Proper Name Format ke sath)
function loadPdf() {
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
  
  // Chapter ko proper format dena (jaise ch3 ko Chapter 3 banana)
  const chapterNum = chVal.replace("ch", "");
  const chapterInfo = `Chapter ${chapterNum}`;

  // Viewer ke upar dikhane ke liye clean descriptive title
  const descriptiveName = [className, subjectName, chapterInfo].filter(Boolean).join(' • ');

  // File path ka format
  const finalFileName = `${cleanClassNum}_${subVal}_${chVal}.pdf`;
  const fullPath = `notes/${finalFileName}`;

  // notes-viewer.html ke sath proper path aur descriptive name link karein
  const viewerUrl = 'notes-viewer.html?path=' + encodeURIComponent(fullPath) + '&name=' + encodeURIComponent(descriptiveName);

  // Redirect to notes-viewer page
  window.location.href = viewerUrl;
}
