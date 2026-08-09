/* =====================================================
   ROITX REFBOOK ENGINE — ULTRA REALISTIC BOOK EDITION
   ===================================================== */

const grid = document.getElementById("refBookGrid");
const backBtn = document.getElementById("backBtn");
const homeBtn = document.getElementById("homeBtn");
const topTitle = document.getElementById("topTitle");

let allBooks = [], currentLevel = "author";
let selectedAuthor = "", selectedClass = "", selectedSubject = "";

const roman = { 1:"I", 2:"II", 3:"III", 4:"IV", 5:"V", 6:"VI", 7:"VII", 8:"VIII", 9:"IX", 10:"X", 11:"XI", 12:"XII" };

// Rich color schemes mimicking physical publication houses & textbooks
const bookPresets = [
  { bg: "linear-gradient(135deg, #f97316, #c2410c)", text: "RD", tilt: "-6deg", type: "normal", ribbon: "#ef4444" },
  { bg: "linear-gradient(135deg, #06b6d4, #0891b2)", text: "HC", tilt: "4deg", type: "normal", ribbon: null },
  { bg: "linear-gradient(135deg, #3b82f6, #1d4ed8)", text: "TS", tilt: "0deg", type: "open", ribbon: "#fbbf24" },
  { bg: "linear-gradient(135deg, #8b5cf6, #6d28d9)", text: "DK", tilt: "-8deg", type: "normal", ribbon: null },
  { bg: "linear-gradient(135deg, #10b981, #047857)", text: "TR", tilt: "6deg", type: "open", ribbon: "#f43f5e" },
  { bg: "linear-gradient(135deg, #ec4899, #be185d)", text: "SG", tilt: "-4deg", type: "normal", ribbon: "#38bdf8" },
  { bg: "linear-gradient(135deg, #6366f1, #4338ca)", text: "MV", tilt: "8deg", type: "normal", ribbon: null },
  { bg: "linear-gradient(135deg, #14b8a6, #0f766e)", text: "SS", tilt: "-2deg", type: "open", ribbon: "#eab308" },
  { bg: "linear-gradient(135deg, #f43f5e, #9f1239)", text: "KC", tilt: "5deg", type: "normal", ribbon: null }
];

async function loadRefBooks() {
  const { data, error } = await window.supabaseClient.from("ref_books").select("*");
  if (error) return console.error("Database Error:", error);
  allBooks = data || [];
  showAuthors();
}

// LEVEL 1: Authors
function showAuthors() {
  currentLevel = "author";
  selectedAuthor = "";
  selectedClass = "";
  selectedSubject = "";
  
  backBtn.style.opacity = "0.3";
  backBtn.style.pointerEvents = "none";
  topTitle.textContent = "Ref Book";
  grid.innerHTML = "";
  
  const authors = [...new Set(allBooks.map(b => b.author))].filter(Boolean);
  
  if (authors.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #9a95a6; padding: 40px;">No books found.</div>`;
    return;
  }

  authors.forEach((auth, i) => {
    const preset = bookPresets[i % bookPresets.length];
    const initials = auth.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    
    createCard({
      title: auth,
      badgeText: initials,
      coverBg: preset.bg,
      tilt: preset.tilt,
      bookType: preset.type,
      ribbonColor: preset.ribbon,
      index: i,
      callback: () => showClasses(auth)
    });
  });
}

// LEVEL 2: Classes
function showClasses(author) {
  currentLevel = "class";
  selectedAuthor = author;
  
  backBtn.style.opacity = "1";
  backBtn.style.pointerEvents = "auto";
  topTitle.textContent = author;
  grid.innerHTML = "";
  
  const classes = [...new Set(allBooks.filter(b => b.author === author).map(b => b.class_no))].sort((a,b)=>a-b);
  
  classes.forEach((c, i) => {
    const romanClass = roman[c] || c;
    createCard({
      title: `Class ${romanClass}`,
      badgeText: romanClass,
      coverBg: "linear-gradient(135deg, #eab308, #ca8a04)",
      tilt: i % 2 === 0 ? "-4deg" : "4deg",
      bookType: "normal",
      ribbonColor: "#22c55e",
      index: i,
      callback: () => showSubjects(c)
    });
  });
}

// LEVEL 3: Subjects
function showSubjects(cls) {
  currentLevel = "subject";
  selectedClass = cls;
  backBtn.style.opacity = "1";
  backBtn.style.pointerEvents = "auto";
  topTitle.textContent = `${selectedAuthor} • Class ${cls}`;
  grid.innerHTML = "";
  
  const subjects = [...new Set(allBooks.filter(b => b.author === selectedAuthor && b.class_no == cls).map(b => b.subject))];
  
  subjects.forEach((sub, i) => {
    createCard({
      title: sub,
      badgeText: sub.charAt(0).toUpperCase(),
      coverBg: "linear-gradient(135deg, #a855f7, #7e22ce)",
      tilt: "0deg",
      bookType: i % 3 === 0 ? "open" : "normal",
      ribbonColor: "#38bdf8",
      index: i,
      callback: () => showChapters(sub)
    });
  });
}

// LEVEL 4: Chapters
function showChapters(sub) {
  currentLevel = "chapter";
  selectedSubject = sub;
  backBtn.style.opacity = "1";
  backBtn.style.pointerEvents = "auto";
  topTitle.textContent = sub;
  grid.innerHTML = "";
  
  const chapters = allBooks.filter(b => b.author === selectedAuthor && b.class_no == selectedClass && b.subject === sub)
                           .sort((a,b) => a.chapter_no - b.chapter_no);
  
  chapters.forEach((ch, i) => {
    const card = document.createElement("div");
    card.className = "card chapter-card";
    card.style.animationDelay = `${i * 0.03}s`;
    
    card.innerHTML = `
      <div class="book-icon-wrapper">
        <div class="realistic-book" style="background: linear-gradient(135deg, #34d399, #059669); transform: rotate(-3deg);">
          <div class="book-spine-line"></div>
          <span>CH</span>
        </div>
        <div class="page-block"><span></span><span></span><span></span></div>
      </div>
      <div class="ch-badge">CHAPTER ${ch.chapter_no}</div>
      <p class="card-title">${ch.chapter}</p>
    `;
    
    card.onclick = () => {
      if (!ch.file_url) return;
      const fileName = ch.file_url.split('/').pop();
      const fullPath = `refbooks/class_${selectedClass}/${selectedSubject}/ch_${ch.chapter_no}/${fileName}`;
      window.location.href = `notes-viewer.html?path=${encodeURIComponent(fullPath)}&name=${encodeURIComponent(ch.chapter)}`;
    };
    grid.appendChild(card);
  });
}

// Realistic Book Builder
function createCard({ title, badgeText, coverBg, tilt, bookType, ribbonColor, index, callback }) {
  const card = document.createElement("div");
  card.className = "card";
  card.style.animationDelay = `${index * 0.03}s`;

  let bookHTML = "";

  if (bookType === "open") {
    // Open Book Rendering with realistic curvature
    bookHTML = `
      <div class="book-icon-wrapper open-book-container">
        <div class="open-leaf left-leaf"></div>
        <div class="realistic-book open-center-book" style="background: ${coverBg};">
          <div class="book-spine-line"></div>
          <span>${badgeText}</span>
        </div>
        <div class="open-leaf right-leaf"></div>
      </div>
    `;
  } else {
    // Realistic Hardcover with Spine and Ribbon Bookmark
    let ribbonHTML = ribbonColor ? `<div class="realistic-ribbon" style="background: ${ribbonColor};"></div>` : "";
    bookHTML = `
      <div class="book-icon-wrapper">
        <div class="page-block left-pages"><span></span><span></span><span></span></div>
        <div class="realistic-book" style="background: ${coverBg}; transform: rotate(${tilt});">
          <div class="book-spine-line"></div>
          ${ribbonHTML}
          <span>${badgeText}</span>
        </div>
        <div class="page-block right-pages"><span></span><span></span><span></span></div>
      </div>
    `;
  }

  card.innerHTML = `
    ${bookHTML}
    <p class="card-title">${title}</p>
  `;

  card.onclick = callback;
  grid.appendChild(card);
}

backBtn.onclick = () => {
  if (currentLevel === "chapter") showSubjects(selectedClass);
  else if (currentLevel === "subject") showClasses(selectedAuthor);
  else if (currentLevel === "class") showAuthors();
};

if(homeBtn) {
  homeBtn.onclick = () => {
    window.location.href = "index.html";
  };
}

document.addEventListener("DOMContentLoaded", loadRefBooks);
