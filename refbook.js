/* =====================================================
   ROITX REFBOOK ENGINE — FULL DRIVE FEATURES
   ===================================================== */

const grid = document.getElementById("refBookGrid");
const backBtn = document.getElementById("backBtn");
const topTitle = document.getElementById("topTitle");

let allBooks = [], currentLevel = "author";
let selectedAuthor = "", selectedClass = "", selectedSubject = "";

// Premium Color Palettes (From your preference)
const palettes = [
  { bg: "#f0f9ff", txt: "#0369a1", border: "#bae6fd", badge: "#0ea5e9" },
  { bg: "#fff7ed", txt: "#9a3412", border: "#fed7aa", badge: "#f97316" },
  { bg: "#f0fdf4", txt: "#166534", border: "#bbf7d0", badge: "#22c55e" },
  { bg: "#faf5ff", txt: "#6b21a8", border: "#e9d5ff", badge: "#a855f7" },
  { bg: "#fff1f2", txt: "#9f1239", border: "#fecdd3", badge: "#f43f5e" }
];

const roman = { 1:"I", 2:"II", 3:"III", 4:"IV", 5:"V", 6:"VI", 7:"VII", 8:"VIII", 9:"IX", 10:"X", 11:"XI", 12:"XII" };

async function loadRefBooks() {
  const { data, error } = await window.supabaseClient.from("ref_books").select("*");
  if (error) return console.error("Database Error:", error);
  allBooks = data;
  showAuthors();
}

// LEVEL 1: Authors
function showAuthors() {
  currentLevel = "author";
  backBtn.style.visibility = "hidden";
  topTitle.textContent = "Reference Books";
  grid.innerHTML = "";
  
  const authors = [...new Set(allBooks.map(b => b.author))].filter(Boolean);
  authors.forEach((auth, i) => {
    const p = palettes[i % palettes.length];
    createCard(auth, "Explore Collection", p, () => showClasses(auth));
  });
}

// LEVEL 2: Classes
function showClasses(author) {
  currentLevel = "class";
  selectedAuthor = author;
  backBtn.style.visibility = "visible";
  topTitle.textContent = author;
  grid.innerHTML = "";
  
  const classes = [...new Set(allBooks.filter(b => b.author === author).map(b => b.class_no))].sort((a,b)=>a-b);
  classes.forEach((c, i) => {
    const p = palettes[i % palettes.length];
    createCard(`Class ${roman[c] || c}`, "Select Class", p, () => showSubjects(c));
  });
}

// LEVEL 3: Subjects
function showSubjects(cls) {
  currentLevel = "subject";
  selectedClass = cls;
  topTitle.textContent = `${selectedAuthor} • Class ${cls}`;
  grid.innerHTML = "";
  
  const subjects = [...new Set(allBooks.filter(b => b.author === selectedAuthor && b.class_no == cls).map(b => b.subject))];
  subjects.forEach((sub, i) => {
    const p = palettes[i % palettes.length];
    createCard(sub, "Select Subject", p, () => showChapters(sub));
  });
}

// LEVEL 4: Chapters (Final Click)
function showChapters(sub) {
  currentLevel = "chapter";
  selectedSubject = sub;
  topTitle.textContent = sub;
  grid.innerHTML = "";
  
  const chapters = allBooks.filter(b => b.author === selectedAuthor && b.class_no == selectedClass && b.subject === sub)
                           .sort((a,b) => a.chapter_no - b.chapter_no);
  
  chapters.forEach((ch, i) => {
    const p = palettes[i % palettes.length];
    const card = document.createElement("div");
    card.className = "card chapter-card";
    card.style.cssText = `background:${p.bg}; border:1px solid ${p.border}; color:${p.txt}; padding:15px; border-radius:12px; cursor:pointer;`;
    card.innerHTML = `<div style="background:${p.badge}; color:#fff; font-size:10px; padding:2px 6px; border-radius:4px; width:fit-content; margin-bottom:8px;">CH ${ch.chapter_no}</div>
                      <h4 style="margin:0; font-size:14px;">${ch.chapter}</h4>`;
    
    card.onclick = () => {
      const fileName = ch.file_url.split('/').pop();
      // Universal Path: refbooks/class_1/Physics/ch_1/file.pdf
      const fullPath = `refbooks/class_${selectedClass}/${selectedSubject}/ch_${ch.chapter_no}/${fileName}`;
      window.location.href = `notes-viewer.html?path=${encodeURIComponent(fullPath)}&name=${encodeURIComponent(ch.chapter)}`;
    };
    grid.appendChild(card);
  });
}

function createCard(title, sub, p, callback) {
  const card = document.createElement("div");
  card.className = "card";
  card.style.cssText = `background:${p.bg}; border:1px solid ${p.border}; color:${p.txt}; padding:20px; border-radius:15px; cursor:pointer; transition:0.2s;`;
  card.innerHTML = `<h3 style="margin:0; font-size:16px;">${title}</h3><p style="margin:5px 0 0; font-size:11px; opacity:0.7;">${sub}</p>`;
  card.onclick = callback;
  grid.appendChild(card);
}

backBtn.onclick = () => {
  if (currentLevel === "chapter") showSubjects(selectedClass);
  else if (currentLevel === "subject") showClasses(selectedAuthor);
  else if (currentLevel === "class") showAuthors();
};

document.addEventListener("DOMContentLoaded", loadRefBooks);
