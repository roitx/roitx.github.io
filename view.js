// 🔹 DOM
const classSelect   = document.getElementById("classSelect");
const subjectSelect = document.getElementById("subjectSelect");
const chapterSelect = document.getElementById("chapterSelect");

function loadPdf(){

  const cls     = classSelect.value;
  const subject = subjectSelect.value;
  const chapter = chapterSelect.value;

  // 🔴 Validation
  if(!cls || !subject || !chapter){
    alert("❌ Please select Class, Subject and Chapter");
    return;
  }

  // 📄 Build file name
  // Example: 10_physics_ch3.pdf
  const fileName = `${cls}_${subject}_${chapter}.pdf`;

  // 👉 Redirect to notes-viewer.html with file
  window.location.href =
    `notes-viewer.html?file=${encodeURIComponent(fileName)}`;
}