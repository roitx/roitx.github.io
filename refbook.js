/* ================= DOM ================= */
const grid = document.getElementById("refBookGrid");
const backBtn = document.getElementById("backBtn");
const homeBtn = document.getElementById("homeBtn"); // Naya Home Button
const topTitle = document.getElementById("topTitle");

let allBooks = [], homeBooks = [], currentLevel = "book";
let selectedAuthor = "", selectedClass = "", selectedSubject = "";

/* ================= HOME REDIRECT ================= */
homeBtn.onclick = () => {
  window.location.href = "index.html";
};

/* ================= SHOW BOOKS (MAIN GRID) ================= */
function showBooks(){
  currentLevel = "book";
  
  // Logic: Main grid par Home dikhao, Back chhupao
  homeBtn.style.display = "flex";
  backBtn.style.display = "none";
  
  topTitle.textContent = "Reference Books";
  grid.innerHTML = "";

  homeBooks.forEach(b => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="book" style="background:${getAuthorColor(b.author)}">
        <span style="font-weight:bold; font-size:12px;">${b.author.slice(0,2).toUpperCase()}</span>
      </div>
      <p style="font-weight:bold; color:#fff;">${b.author}</p>`;
    card.onclick = () => showClasses(b.author);
    grid.appendChild(card);
  });
}

/* ================= SHOW CLASSES ================= */
function showClasses(author){
  currentLevel = "class"; selectedAuthor = author;
  
  // Logic: Andar jane par Back dikhao, Home chhupao
  backBtn.style.display = "flex";
  homeBtn.style.display = "none";
  
  topTitle.textContent = author;
  grid.innerHTML = "";

  const classes = [...new Set(allBooks.filter(b => b.author === author).map(b => Number(b.class_no)))].sort((a,b) => a-b);
  classes.forEach(cls => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<div class="roman">${toRoman(cls)}</div><p>Class</p>`;
    card.onclick = () => showSubjects(cls);
    grid.appendChild(card);
  });
}

/* ================= SHOW SUBJECTS ================= */
function showSubjects(cls){
  currentLevel = "subject"; selectedClass = cls;
  grid.innerHTML = "";
  topTitle.textContent = `Class ${toRoman(cls)}`;

  const subjects = [...new Set(allBooks.filter(b => b.author === selectedAuthor && Number(b.class_no) === cls).map(b => b.subject))];
  subjects.forEach(s => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<p style="font-weight:bold;">${s}</p>`;
    card.onclick = () => showChapters(s);
    grid.appendChild(card);
  });
}

/* ================= SHOW CHAPTERS ================= */
function showChapters(subject){
  currentLevel = "chapter"; selectedSubject = subject;
  grid.innerHTML = "";
  topTitle.textContent = subject;

  let chapters = allBooks.filter(b => b.author === selectedAuthor && Number(b.class_no) === selectedClass && b.subject === subject);
  chapters.forEach(ch => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<p style="font-size:14px;"><b>${ch.chapter_no}.</b> ${ch.chapter}</p>`;
    card.onclick = () => window.open(ch.file_url, "_blank");
    grid.appendChild(card);
  });
}

/* ================= BACK LOGIC ================= */
backBtn.onclick = () => {
  if(currentLevel === "chapter") return showSubjects(selectedClass);
  if(currentLevel === "subject") return showClasses(selectedAuthor);
  if(currentLevel === "class") return showBooks();
};

/* ================= HELPER & INIT ================= */
const letterColors={A:"#f94144",B:"#577590",C:"#43aa8b",D:"#f3722c",E:"#f9c74f",F:"#90be6d",G:"#4d908e",H:"#ff5c8a",I:"#277da1",J:"#9d4edd",K:"#3a86ff",L:"#ef476f",M:"#06d6a0",N:"#1d3557",O:"#fb8500",P:"#8338ec",Q:"#6a4c93",R:"#e63946",S:"#2a9d8f",T:"#ffb703",U:"#118ab2",V:"#9b5de5",W:"#adb5bd",X:"#00bbf9",Y:"#ffd166",Z:"#073b4c"};
const romanMap = {1:"I",2:"II",3:"III",4:"IV",5:"V",6:"VI",7:"VII",8:"VIII",9:"IX",10:"X",11:"XI",12:"XII"};
function getAuthorColor(t){ return letterColors[t.trim()[0].toUpperCase()] || "#888"; }
function toRoman(n){ return romanMap[n] || n; }

async function loadRefBooks(){
  const {data,error} = await window.supabaseClient.from("ref_books").select("*");
  if(error) return console.error(error);
  allBooks = data;
  const seen = new Set();
  data.forEach(b => { if(b.author && !seen.has(b.author)){ seen.add(b.author); homeBooks.push(b); } });
  showBooks();
}

document.addEventListener("DOMContentLoaded", loadRefBooks);
