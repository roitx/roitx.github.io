/* =====================================================
   ROITX REFBOOK ENGINE — PROFESSIONAL SVG EDITION
   ===================================================== */

const grid = document.getElementById("refBookGrid");
const backBtn = document.getElementById("backBtn");
const homeBtn = document.getElementById("homeBtn");
const topTitle = document.getElementById("topTitle");

// Set premium SVG icons for navigation header
if (backBtn) {
  backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;
}
if (homeBtn) {
  homeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
}

let allBooks = [], currentLevel = "author";
let selectedAuthor = "", selectedClass = "", selectedSubject = "";

// Roman mapping with Part support
const roman = { 
  1: "Part I", 
  2: "Part II", 
  3: "III", 
  4: "IV", 
  5: "V", 
  6: "VI", 
  7: "VII", 
  8: "VIII", 
  9: "IX", 
  10: "X", 
  11: "XI", 
  12: "XII" 
};

const bookPresets = [
  { bg: "linear-gradient(135deg, #ff7e5f, #feb47b)", text: "RD", tilt: "-4deg", ribbon: "#ff4757" },
  { bg: "linear-gradient(135deg, #00c6ff, #0072ff)", text: "HC", tilt: "3deg", ribbon: "#2ed573" },
  { bg: "linear-gradient(135deg, #f7ff00, #db36a4)", text: "TS", tilt: "-2deg", ribbon: "#ffa502" },
  { bg: "linear-gradient(135deg, #b224ef, #7579ff)", text: "DK", tilt: "5deg", ribbon: null },
  { bg: "linear-gradient(135deg, #11998e, #38ef7d)", text: "TR", tilt: "-5deg", ribbon: "#ff6b81" },
  { bg: "linear-gradient(135deg, #fc4a1a, #f7b733)", text: "SG", tilt: "2deg", ribbon: "#48dbfb" }
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
  
  backBtn.style.opacity = "0.2";
  backBtn.style.pointerEvents = "none";
  topTitle.textContent = "Reference Library";
  
  resetGridToGridStyle();
  const authors = [...new Set(allBooks.map(b => b.author))].filter(Boolean);
  
  if (authors.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #8a99ad; padding: 50px; font-size: 13px;">No reference books available.</div>`;
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
      ribbonColor: preset.ribbon,
      index: i,
      callback: () => showClasses(auth)
    });
  });
}

// LEVEL 2: Classes / Parts
function showClasses(author) {
  currentLevel = "class";
  selectedAuthor = author;
  
  backBtn.style.opacity = "1";
  backBtn.style.pointerEvents = "auto";
  topTitle.textContent = author;
  
  resetGridToGridStyle();
  const classes = [...new Set(allBooks.filter(b => b.author === author).map(b => b.class_no))].sort((a,b)=>a-b);
  
  classes.forEach((c, i) => {
    // Check if value represents a Part (1 or 2) or standard Class
    const isPart = (c == 1 || c == 2);
    const displayTitle = isPart ? `Part ${c}` : `Class ${roman[c] || c}`;
    const badge = isPart ? `P${c}` : (roman[c] || c);

    createCard({
      title: displayTitle,
      badgeText: badge,
      coverBg: "linear-gradient(135deg, #2af598, #009efd)",
      tilt: i % 2 === 0 ? "-3deg" : "3deg",
      ribbonColor: "#ff4757",
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
  
  const isPart = (cls == 1 || cls == 2);
  const classLabel = isPart ? `Part ${cls}` : `Class ${roman[cls] || cls}`;
  topTitle.textContent = `${selectedAuthor} • ${classLabel}`;
  
  resetGridToGridStyle();
  const subjects = [...new Set(allBooks.filter(b => b.author === selectedAuthor && b.class_no == cls).map(b => b.subject))];
  
  subjects.forEach((sub, i) => {
    const preset = bookPresets[i % bookPresets.length];
    createCard({
      title: sub,
      badgeText: sub.substring(0, 2).toUpperCase(),
      coverBg: preset.bg,
      tilt: preset.tilt,
      ribbonColor: preset.ribbon,
      index: i,
      callback: () => showChapters(sub)
    });
  });
}

// LEVEL 4: Chapters (Sleek Glassmorphism List View)
function showChapters(sub) {
  currentLevel = "chapter";
  selectedSubject = sub;
  backBtn.style.opacity = "1";
  backBtn.style.pointerEvents = "auto";
  topTitle.textContent = sub;
  grid.innerHTML = "";
  
  grid.style.display = "flex";
  grid.style.flexDirection = "column";
  grid.style.gap = "12px";
  grid.style.padding = "16px";
  grid.style.background = "transparent";

  const chapters = allBooks.filter(b => b.author === selectedAuthor && b.class_no == selectedClass && b.subject === sub)
                           .sort((a,b) => a.chapter_no - b.chapter_no);
  
  chapters.forEach((ch, i) => {
    const card = document.createElement("div");
    card.style.cssText = `
      background: rgba(22, 25, 32, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
      padding: 16px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
      animation: fadeIn 0.4s ease forwards;
      animation-delay: ${i * 0.03}s;
      opacity: 0;
    `;
    
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="width: 40px; height: 40px; background: rgba(0, 210, 255, 0.1); border: 1px solid rgba(0, 210, 255, 0.25); color: #00d2ff; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; box-shadow: inset 0 2px 4px rgba(0,210,255,0.1);">
          ${ch.chapter_no}
        </div>
        <div>
          <div style="font-size: 10px; color: #00d2ff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 3px;">Chapter ${ch.chapter_no}</div>
          <div style="font-size: 14px; font-weight: 600; color: #f1f5f9; line-height: 1.35;">${ch.chapter}</div>
        </div>
      </div>
      <div style="background: linear-gradient(135deg, #00d2ff, #0072ff); color: #fff; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,114,255,0.3); transition: transform 0.2s;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      </div>
    `;

    card.onmouseenter = () => {
      card.style.transform = "translateY(-2px)";
      card.style.borderColor = "rgba(0, 210, 255, 0.3)";
      card.style.background = "rgba(28, 33, 44, 0.9)";
    };
    card.onmouseleave = () => {
      card.style.transform = "translateY(0)";
      card.style.borderColor = "rgba(255, 255, 255, 0.08)";
      card.style.background = "rgba(22, 25, 32, 0.75)";
    };
    
    card.onclick = () => {
      if (!ch.file_url) return;
      const fileName = ch.file_url.split('/').pop();
      const fullPath = `refbooks/class_${selectedClass}/${selectedSubject}/ch_${ch.chapter_no}/${fileName}`;
      window.location.href = `notes-viewer.html?path=${encodeURIComponent(fullPath)}&name=${encodeURIComponent(ch.chapter)}`;
    };
    grid.appendChild(card);
  });
}

function resetGridToGridStyle() {
  grid.innerHTML = "";
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(3, 1fr)";
  grid.style.gap = "12px";
  grid.style.padding = "16px";
}

// Ultra Realistic 3D Book Cards Builder
function createCard({ title, badgeText, coverBg, tilt, ribbonColor, index, callback }) {
  const card = document.createElement("div");
  card.className = "card";
  card.style.cssText = `
    background: rgba(22, 25, 32, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 10px 4px;
    text-align: center;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 110px;
    max-height: 120px;
    border-radius: 12px;
    position: relative;
    box-sizing: border-box;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    animation: fadeIn 0.4s ease forwards;
    animation-delay: ${index * 0.03}s;
    opacity: 0;
    overflow: hidden;
    gap: 6px;
  `;

  let ribbonHTML = ribbonColor ? `<div style="position: absolute; top: -4px; right: 5px; width: 4px; height: 10px; background: ${ribbonColor}; border-radius: 0 0 2px 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.5); z-index: 4;"></div>` : "";
  
  let bookHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 2px; height: 32px; position: relative; width: 100%;">
      <div style="display: flex; flex-direction: column; gap: 1.5px; width: 6px;">
        <span style="display: block; height: 1.5px; background: rgba(255,255,255,0.3); border-radius: 2px; width: 3px; align-self: flex-end;"></span>
        <span style="display: block; height: 1.5px; background: rgba(255,255,255,0.4); border-radius: 2px; width: 6px; align-self: flex-end;"></span>
        <span style="display: block; height: 1.5px; background: rgba(255,255,255,0.3); border-radius: 2px; width: 2px; align-self: flex-end;"></span>
      </div>
      <div style="width: 24px; height: 32px; border-radius: 2px 5px 5px 2px; display: flex; align-items: center; justify-content: center; background: ${coverBg}; transform: rotate(${tilt}); box-shadow: 2px 4px 10px rgba(0,0,0,0.6), inset -1.5px 0 3px rgba(0,0,0,0.3); position: relative; z-index: 2;">
        <div style="position: absolute; left: 2.5px; top: 0; width: 1.5px; height: 100%; background: rgba(0, 0, 0, 0.25); border-radius: 2px 0 0 2px;"></div>
        ${ribbonHTML}
        <span style="font-size: 8.5px; font-weight: 800; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.7); z-index: 3;">${badgeText}</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 1.5px; width: 6px;">
        <span style="display: block; height: 1.5px; background: rgba(255,255,255,0.3); border-radius: 2px; width: 3px; align-self: flex-start;"></span>
        <span style="display: block; height: 1.5px; background: rgba(255,255,255,0.4); border-radius: 2px; width: 6px; align-self: flex-start;"></span>
        <span style="display: block; height: 1.5px; background: rgba(255,255,255,0.3); border-radius: 2px; width: 2px; align-self: flex-start;"></span>
      </div>
    </div>
  `;

  card.innerHTML = `
    ${bookHTML}
    <p style="font-size: 10px; font-weight: 600; color: #f1f5f9; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; width: 100%; padding: 0 2px; margin: 0;">${title}</p>
  `;

  card.onmouseenter = () => {
    card.style.transform = "translateY(-3px)";
    card.style.borderColor = "rgba(0, 210, 255, 0.25)";
    card.style.background = "rgba(28, 33, 44, 0.85)";
  };
  card.onmouseleave = () => {
    card.style.transform = "translateY(0)";
    card.style.borderColor = "rgba(255, 255, 255, 0.06)";
    card.style.background = "rgba(22, 25, 32, 0.6)";
  };

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
