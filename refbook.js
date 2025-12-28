if (!window.supabaseClient) {
  console.error("Supabase not ready");
}

/* ================= DOM ELEMENTS ================= */
const grid = document.getElementById("refBookGrid");
const backBtn = document.getElementById("backBtn");
const topTitle = document.getElementById("topTitle");

/* ================= STATE ================= */
let allBooks = [];
let homeBooks = [];
let currentLevel = "book"; // Levels: book, class, subject, chapter

let selectedAuthor = "";
let selectedClass = "";
let selectedSubject = "";

/* ================= COLORS & STYLING ================= */
const letterColors = {
  A: "#f94144", B: "#577590", C: "#43aa8b", D: "#f3722c", E: "#f9c74f", F: "#90be6d",
  G: "#4d908e", H: "#ff5c8a", I: "#277da1", J: "#9d4edd", K: "#3a86ff", L: "#ef476f",
  M: "#06d6a0", N: "#1d3557", O: "#fb8500", P: "#8338ec", Q: "#6a4c93", R: "#e63946",
  S: "#2a9d8f", T: "#ffb703", U: "#118ab2", V: "#9b5de5", W: "#adb5bd", X: "#00bbf9",
  Y: "#ffd166", Z: "#073b4c"
};

function getAuthorColor(text) {
  if (!text) return "#888";
  return letterColors[text.trim()[0].toUpperCase()] || "#888";
}

function glow(text) {
  const c = getAuthorColor(text);
  return `color:${c};text-shadow:0 0 6px ${c},0 0 14px ${c};font-weight:700;`;
}

function topBar(parts) {
  topTitle.innerHTML = parts
    .map(p => `<span style="${glow(p)}">${p}</span>`)
    .join(" • ");
}

/* ================= HELPERS ================= */
const romanMap = {
  1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
  7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII"
};
function toRoman(n) {
  return romanMap[n] || n;
}

/* ================= LOCAL STORAGE ================= */
function getStore(key) {
  return JSON.parse(localStorage.getItem(key) || "[]");
}
function setStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function addRecent(book) {
  let recent = getStore("recentFiles");
  recent = recent.filter(r => r.url !== book.url);
  recent.unshift(book);
  recent = recent.slice(0, 10);
  setStore("recentFiles", recent);
}

/* ================= DATA LOADING ================= */
async function loadRefBooks() {
  const { data, error } = await window.supabaseClient
    .from("ref_books")
    .select("*");

  if (error) {
    console.error("Fetch Error:", error);
    return;
  }

  allBooks = data;

  // Filter unique authors for home screen
  const seen = new Set();
  homeBooks = [];
  allBooks.forEach(b => {
    if (b.author && !seen.has(b.author)) {
      seen.add(b.author);
      homeBooks.push(b);
    }
  });

  showBooks();
}

/* ================= NAVIGATION VIEWS ================= */

// 1. HOME VIEW (Authors)
function showBooks() {
  currentLevel = "book";
  selectedAuthor = "";
  
  // Back button hidden on Home
  backBtn.style.display = "none"; 
  topTitle.textContent = "Reference Books";
  topTitle.style.color = "white"; 
  topTitle.style.textShadow = "none";
  
  grid.innerHTML = "";

  homeBooks.forEach(b => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="book" style="background:${getAuthorColor(b.author)}">
        <span>${b.author.slice(0, 2).toUpperCase()}</span>
      </div>
      <p style="${glow(b.author)}">${b.author}</p>
    `;
    card.onclick = () => showClasses(b.author);
    grid.appendChild(card);
  });
}

// 2. CLASS VIEW
function showClasses(author) {
  currentLevel = "class";
  selectedAuthor = author;
  
  backBtn.style.display = "block"; // Show back button
  topBar([author]);

  const classes = [...new Set(
    allBooks.filter(b => b.author === author)
            .map(b => Number(b.class_no))
  )].sort((a, b) => a - b);

  grid.innerHTML = "";
  classes.forEach(cls => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<div class="roman">${toRoman(cls)}</div><p>Class ${cls}</p>`;
    card.onclick = () => showSubjects(cls);
    grid.appendChild(card);
  });
}

// 3. SUBJECT VIEW
function showSubjects(cls) {
  currentLevel = "subject";
  selectedClass = cls;
  
  backBtn.style.display = "block";
  topBar([selectedAuthor, toRoman(cls)]);

  const subjects = [...new Set(
    allBooks.filter(b => b.author === selectedAuthor && Number(b.class_no) === cls)
            .map(b => b.subject)
  )];

  grid.innerHTML = "";
  subjects.forEach(s => {
    const card = document.createElement("div");
    card.className = "card subject";
    card.innerHTML = `<span>${s}</span>`;
    card.onclick = () => showChapters(s);
    grid.appendChild(card);
  });
}

// 4. CHAPTER VIEW
function showChapters(subject) {
  currentLevel = "chapter";
  selectedSubject = subject;
  
  backBtn.style.display = "block";
  topBar([selectedAuthor, toRoman(selectedClass), subject]);

  let chapters = allBooks.filter(b =>
    b.author === selectedAuthor &&
    Number(b.class_no) === selectedClass &&
    b.subject === subject
  );

  // Remove duplicates
  const uniq = new Map();
  chapters.forEach(ch => {
    const key = `${ch.chapter_no}-${ch.chapter}`;
    if (!uniq.has(key)) uniq.set(key, ch);
  });

  chapters = [...uniq.values()].sort(
    (a, b) => Number(a.chapter_no) - Number(b.chapter_no)
  );

  grid.innerHTML = "";
  chapters.forEach(ch => {
    const card = document.createElement("div");
    card.className = "card chapter";
    card.innerHTML = `<span><b>${ch.chapter_no}.</b> ${ch.chapter}</span>`;

    card.onclick = () => {
      if (!ch.file_url) return;
      const bookData = {
        title: ch.chapter,
        url: ch.file_url,
        meta: `Class ${ch.class_no} • ${ch.subject}`
      };
      addRecent(bookData);
      window.open(ch.file_url, "_blank");
    };

    grid.appendChild(card);
  });
}

/* ================= BACK BUTTON ACTION ================= */
backBtn.onclick = () => {
  if (currentLevel === "chapter") {
    showSubjects(selectedClass);
  } else if (currentLevel === "subject") {
    showClasses(selectedAuthor);
  } else if (currentLevel === "class") {
    showBooks();
  }
};

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", loadRefBooks);
