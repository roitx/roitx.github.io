/* =====================================================
   REFBOOK SYSTEM — PROFESSIONAL CARD UI (UPDATED)
   ===================================================== */

if(!window.supabaseClient){
  console.error("Supabase not ready");
}

/* ---------- DOM ELEMENTS ---------- */
const grid = document.getElementById("refBookGrid");
const backBtn = document.getElementById("backBtn");
const topTitle = document.getElementById("topTitle");

/* ---------- STATE ---------- */
let allBooks = [];
let homeBooks = [];
let currentLevel = "book";
let selectedAuthor = "";
let selectedClass = "";
let selectedSubject = "";

/* ---------- COLORS & STYLING ---------- */
// Professional palette for cards
const cardPalettes = [
  { bg: "#f0f9ff", txt: "#0369a1", border: "#bae6fd", badge: "#0ea5e9" }, // Sky
  { bg: "#fff7ed", txt: "#9a3412", border: "#fed7aa", badge: "#f97316" }, // Orange
  { bg: "#f0fdf4", txt: "#166534", border: "#bbf7d0", badge: "#22c55e" }, // Green
  { bg: "#faf5ff", txt: "#6b21a8", border: "#e9d5ff", badge: "#a855f7" }, // Purple
  { bg: "#fff1f2", txt: "#9f1239", border: "#fecdd3", badge: "#f43f5e" }  // Rose
];

/* ---------- ROMAN CONVERTER ---------- */
const romanMap = { 1:"I", 2:"II", 3:"III", 4:"IV", 5:"V", 6:"VI", 7:"VII", 8:"VIII", 9:"IX", 10:"X", 11:"XI", 12:"XII" };
function toRoman(n){ return romanMap[n] || n; }

/* ---------- LOAD DATA ---------- */
async function loadRefBooks(){
  const {data, error} = await window.supabaseClient.from("ref_books").select("*");
  if(error) return console.error(error);

  allBooks = data;
  const seen = new Set();
  homeBooks = [];
  allBooks.forEach(b => {
    if(b.author && !seen.has(b.author)){
      seen.add(b.author);
      homeBooks.push(b);
    }
  });
  showAuthors();
}

/* ---------- 1. AUTHOR VIEW (HOME) ---------- */
function showAuthors(){
  currentLevel = "book";
  backBtn.style.visibility = "hidden";
  topTitle.textContent = "Reference Books";
  grid.innerHTML = "";

  homeBooks.forEach((b, i) => {
    const pal = cardPalettes[i % cardPalettes.length];
    const card = document.createElement("div");
    card.className = "card author-card";
    card.style.cssText = `background:${pal.bg}; border:1px solid ${pal.border}; color:${pal.txt};`;
    
    card.innerHTML = `
      <div class="card-icon" style="background:${pal.badge}">
        ${b.author.charAt(0).toUpperCase()}
      </div>
      <h3 style="margin:10px 0 5px">${b.author}</h3>
      <p style="font-size:11px; opacity:0.8;">Explore Publications</p>
    `;
    card.onclick = () => showClasses(b.author);
    grid.appendChild(card);
  });
}

/* ---------- 2. CLASS VIEW ---------- */
function showClasses(author){
  currentLevel = "class";
  selectedAuthor = author;
  backBtn.style.visibility = "visible";
  topTitle.textContent = author;

  const classes = [...new Set(allBooks.filter(b => b.author === author).map(b => Number(b.class_no)))].sort((a,b)=>a-b);
  grid.innerHTML = "";

  classes.forEach((cls, i) => {
    const pal = cardPalettes[i % cardPalettes.length];
    const card = document.createElement("div");
    card.className = "card class-card";
    card.style.cssText = `background:${pal.bg}; border:1px solid ${pal.border}; color:${pal.txt};`;
    card.innerHTML = `<div class="roman-num">${toRoman(cls)}</div><p>Class</p>`;
    card.onclick = () => showSubjects(cls);
    grid.appendChild(card);
  });
}

/* ---------- 3. SUBJECT VIEW ---------- */
function showSubjects(cls){
  currentLevel = "subject";
  selectedClass = cls;
  topTitle.textContent = `${selectedAuthor} • Class ${toRoman(cls)}`;

  const subjects = [...new Set(allBooks.filter(b => b.author === selectedAuthor && Number(b.class_no) === cls).map(b => b.subject))];
  grid.innerHTML = "";

  subjects.forEach((sub, i) => {
    const pal = cardPalettes[i % cardPalettes.length];
    const card = document.createElement("div");
    card.className = "card subject-card";
    card.style.cssText = `background:${pal.bg}; border:1px solid ${pal.border}; color:${pal.txt};`;
    card.innerHTML = `<h3>${sub}</h3>`;
    card.onclick = () => showChapters(sub);
    grid.appendChild(card);
  });
}

/* ---------- 4. CHAPTER VIEW (FINAL LINK) ---------- */
function showChapters(subject){
  currentLevel = "chapter";
  selectedSubject = subject;
  topTitle.textContent = `${selectedSubject} (Class ${selectedClass})`;

  let chapters = allBooks.filter(b => 
    b.author === selectedAuthor && 
    Number(b.class_no) === selectedClass && 
    b.subject === subject
  ).sort((a,b) => Number(a.chapter_no) - Number(b.chapter_no));

  grid.innerHTML = "";
  chapters.forEach((ch, i) => {
    const pal = cardPalettes[i % cardPalettes.length];
    const card = document.createElement("div");
    card.className = "card chapter-card";
    card.style.cssText = `background:${pal.bg}; border:1px solid ${pal.border}; color:${pal.txt};`;
    
    card.innerHTML = `
      <div class="ch-badge" style="background:${pal.badge}">CH ${ch.chapter_no}</div>
      <h4>${ch.chapter}</h4>
      <div class="read-btn">Tap to Read</div>
    `;

    card.onclick = () => {
      if(!ch.file_url) return alert("File not ready");
      
      const fileName = ch.file_url.split('/').pop();
      // PATH STRUCTURE: Refbooks/class_12/Math/ch_1/file.pdf
      const fullPath = `Refbooks/class_${selectedClass}/${selectedSubject}/ch_${ch.chapter_no}/${fileName}`;
      
      window.location.href = `notes-viewer.html?path=${encodeURIComponent(fullPath)}&name=${encodeURIComponent(ch.chapter)}`;
    };
    grid.appendChild(card);
  });
}

/* ---------- BACK NAVIGATION ---------- */
backBtn.onclick = () => {
  if(currentLevel === "chapter") return showSubjects(selectedClass);
  if(currentLevel === "subject") return showClasses(selectedAuthor);
  if(currentLevel === "class") return showAuthors();
};

document.addEventListener("DOMContentLoaded", loadRefBooks);
