// =========================================================
// formulas.js — CLEAN & MODERN UI FORMATTING
// =========================================================
const fClass = document.getElementById("fClass");
const fSubject = document.getElementById("fSubject");
const fChapter = document.getElementById("fChapter");
const fCategory = document.getElementById("fCategory"); 
const formulaList = document.getElementById("formulaList");

async function loadFormulas() {
  if (!formulaList) return;
  formulaList.innerHTML = "⏳ Loading formulas...";

  let query = window.supabaseClient
    .from("formulas")
    .select("*")
    .eq("publish", true)
    .order("created_at", { ascending: false })
    .limit(40);

  if (fClass && fClass.value) query = query.eq("class", fClass.value);
  if (fSubject && fSubject.value) query = query.eq("subject", fSubject.value);
  if (fChapter && fChapter.value) query = query.eq("chapter", fChapter.value);
  if (fCategory && fCategory.value) query = query.eq("category", fCategory.value);

  const { data, error } = await query;

  if (error) {
    formulaList.innerHTML = "❌ Error loading formulas";
    console.error(error);
    return;
  }

  if (!data || !data.length) {
    formulaList.innerHTML = "<em>No formulas found</em>";
    return;
  }

  formulaList.innerHTML = "";

  for (const f of data) {
    const card = document.createElement("div");
    card.className = "formula-card";

    // Clean & Proper Descriptive Name formatting
    const className = f.class ? `Class ${f.class}` : '';
    const subjectName = f.subject ? f.subject.toUpperCase() : '';
    
    let chapterInfo = '';
    if (f.chapter_name) {
      chapterInfo = f.chapter_name;
    } else if (f.chapter) {
      chapterInfo = f.chapter.replace('ch', 'Chapter ');
    }

    const descriptiveName = [className, subjectName, chapterInfo].filter(Boolean).join(' • ') || 'Formula Document';

    let content = "";

    // 1. TEXT FORMULA
    if (f.type === "text") {
      const cleanText = encodeURIComponent(f.formula_text);
      content = `
        <div class="formula-text" onclick="openTextViewer('${cleanText}')">
          📝 ${f.formula_text}
          <span class="click-hint">🔍 Tap to View Full</span>
        </div>`;
    }

    // 2. IMAGE FORMULA
    if (f.type === "image") {
      const viewerUrl = `image-viewer.html?path=${encodeURIComponent(f.file_path)}&name=${encodeURIComponent(descriptiveName)}`;

      content = `
        <div class="formula-media-box" onclick="window.location.href='${viewerUrl}'">
          🖼️ <span>${descriptiveName}</span>
        </div>`;
    }

    // 3. PDF FORMULA
    if (f.type === "pdf") {
      const viewerUrl = `notes-viewer.html?path=${encodeURIComponent(f.file_path)}&name=${encodeURIComponent(descriptiveName)}`;

      content = `
        <button class="pdf-btn" onclick="window.location.href='${viewerUrl}'">
          📄 ${descriptiveName}
        </button>`;
    }

    // Clean Category Badge Without Brackets
    const categoryBadge = f.category ? `<span class="cat-tag">${f.category.replace('_', ' ').toUpperCase()}</span>` : '';

    card.innerHTML = `
      <div class="formula-head">
        <span>${className} • ${subjectName} • ${chapterInfo.toUpperCase()}</span>
        ${categoryBadge}
      </div>
      ${content}
    `;

    formulaList.appendChild(card);
  }
}

/* ---------- TEXT VIEWER POPUP FUNCTIONS ---------- */
function openTextViewer(encodedText) {
  const text = decodeURIComponent(encodedText);
  const modalText = document.getElementById("modalTextContent");
  const modal = document.getElementById("textViewerModal");
  if (modalText && modal) {
    modalText.innerText = text;
    modal.style.display = "flex";
  }
}

function closeTextViewer() {
  const modal = document.getElementById("textViewerModal");
  if (modal) modal.style.display = "none";
}

// Event Listeners
if (fClass) fClass.addEventListener("change", loadFormulas);
if (fSubject) fSubject.addEventListener("change", loadFormulas);
if (fChapter) fChapter.addEventListener("change", loadFormulas);
if (fCategory) fCategory.addEventListener("change", loadFormulas);

// AUTO LOAD
loadFormulas();
