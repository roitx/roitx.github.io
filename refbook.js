/* =====================================================
   REFBOOK SYSTEM — PROFESSIONAL UI WITH DEEP PATHS
   ===================================================== */

const grid = document.getElementById("refBookGrid");
const backBtn = document.getElementById("backBtn");
const topTitle = document.getElementById("topTitle");

let allBooks = [], homeBooks = [], currentLevel = "author";
let selectedAuthor = "", selectedClass = "", selectedSubject = "";

const cardPalettes = [
  { bg: "#f0f9ff", txt: "#0369a1", border: "#bae6fd", badge: "#0ea5e9" },
  { bg: "#fff7ed", txt: "#9a3412", border: "#fed7aa", badge: "#f97316" },
  { bg: "#f0fdf4", txt: "#166534", border: "#bbf7d0", badge: "#22c55e" },
  { bg: "#faf5ff", txt: "#6b21a8", border: "#e9d5ff", badge: "#a855f7" }
];

async function loadRefBooks() {
  const { data, error } = await window.supabaseClient.from("ref_books").select("*");
  if (error) return console.error(error);
  allBooks = data;
  const seen = new Set();
  homeBooks = [];
  allBooks.forEach(b => { if (b.author && !seen.has(b.author)) { seen.add(b.author); homeBooks.push(b); } });
  showAuthors();
}

function showAuthors() {
  currentLevel = "author";
  backBtn.style.visibility = "hidden";
  topTitle.textContent = "Reference Books";
  grid.innerHTML = "";
  homeBooks.forEach((b, i) => {
    const pal = cardPalettes[i % cardPalettes.length];
    const card = document.createElement("div");
    card.className = "card";
    card.style.cssText = `background:${pal.bg}; border:1px solid ${pal.border}; color:${pal.txt}; padding:20px; border-radius:15px; cursor:pointer;`;
    card.innerHTML = `<h3>${b.author}</h3><p style="font-size:12px;opacity:0.7">Explore Collection</p>`;
    card.onclick = () => showClasses(b.author);
    grid.appendChild(card);
  });
}

function showClasses(author) {
  currentLevel = "class";
  selectedAuthor = author;
  backBtn.style.visibility = "visible";
  topTitle.textContent = author;
  const classes = [...new Set(allBooks.filter(b => b.author === author).map(b => b.class_no))].sort((a,b)=>a-b);
  grid.innerHTML = "";
  classes.forEach((cls, i) => {
    const pal = cardPalettes[i % cardPalettes.length];
    const card = document.createElement("div");
    card.className = "card";
    card.style.cssText = `background:${pal.bg}; border:1px solid ${pal.border}; color:${pal.txt}; padding:20px; border-radius:15px; cursor:pointer; text-align:center;`;
    card.innerHTML = `<h2 style="margin:0">Class ${cls}</h2>`;
    card.onclick = () => showSubjects(cls);
    grid.appendChild(card);
  });
}

function showSubjects(cls) {
  currentLevel = "subject";
  selectedClass = cls;
  topTitle.textContent = `Class ${cls} Subjects`;
  const subjects = [...new Set(allBooks.filter(b => b.author === selectedAuthor && b.class_no == cls).map(b => b.subject))];
  grid.innerHTML = "";
  subjects.forEach((sub, i) => {
    const pal = cardPalettes[i % cardPalettes.length];
    const card = document.createElement("div");
    card.className = "card";
    card.style.cssText = `background:${pal.bg}; border:1px solid ${pal.border}; color:${pal.txt}; padding:20px; border-radius:15px; cursor:pointer;`;
    card.innerHTML = `<h3>${sub}</h3>`;
    card.onclick = () => showChapters(sub);
    grid.appendChild(card);
  });
}

function showChapters(subject) {
  currentLevel = "chapter";
  selectedSubject = subject;
  topTitle.textContent = subject;
  let chapters = allBooks.filter(b => b.author === selectedAuthor && b.class_no == selectedClass && b.subject === subject).sort((a,b) => a.chapter_no - b.chapter_no);
  grid.innerHTML = "";
  chapters.forEach((ch, i) => {
    const pal = cardPalettes[i % cardPalettes.length];
    const card = document.createElement("div");
    card.className = "card";
    card.style.cssText = `background:${pal.bg}; border:1px solid ${pal.border}; color:${pal.txt}; padding:15px; border-radius:12px; cursor:pointer; position:relative;`;
    card.innerHTML = `<div style="background:${pal.badge}; color:white; font-size:10px; padding:2px 6px; border-radius:4px; width:fit-content; margin-bottom:8px;">CH ${ch.chapter_no}</div><h4>${ch.chapter}</h4>`;
    
    card.onclick = () => {
      const fileName = ch.file_url.split('/').pop();
      // EXACT PATH: refbooks/class_1/Physics/ch_1/filename.pdf
      const fullPath = `refbooks/class_${selectedClass}/${selectedSubject}/ch_${ch.chapter_no}/${fileName}`;
      window.location.href = `notes-viewer.html?path=${encodeURIComponent(fullPath)}&name=${encodeURIComponent(ch.chapter)}`;
    };
    grid.appendChild(card);
  });
}

backBtn.onclick = () => {
  if (currentLevel === "chapter") showSubjects(selectedClass);
  else if (currentLevel === "subject") showClasses(selectedAuthor);
  else if (currentLevel === "class") showAuthors();
};

document.addEventListener("DOMContentLoaded", loadRefBooks);
