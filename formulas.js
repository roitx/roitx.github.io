// =========================================================
// formulas.js — CLEAN ALIGNED VIEW (HEADER + CATEGORY BADGE)
// =========================================================

const fClass = document.getElementById("fClass");
const fSubject = document.getElementById("fSubject");
const fChapter = document.getElementById("fChapter");
const fCategory = document.getElementById("fCategory"); 
const formulaList = document.getElementById("formulaList");

async function loadFormulas() {
  if (!formulaList) return;
  formulaList.innerHTML = "<div style='text-align:center; padding:25px; color:#94a3b8;'>⏳ Loading formulas...</div>";

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
    formulaList.innerHTML = "<div style='text-align:center; padding:25px; color:#ff4b5c;'>❌ Error loading formulas</div>";
    console.error(error);
    return;
  }

  if (!data || !data.length) {
    formulaList.innerHTML = "<div style='text-align:center; padding:25px; color:#94a3b8;'><em>No formulas found</em></div>";
    return;
  }

  formulaList.innerHTML = "";

  for (const f of data) {
    const card = document.createElement("div");
    card.className = "formula-card";

    // 1. Top Left Info Format: 10 • CHEM • CH1
    const classNum = f.class ? `${f.class}` : '';
    const subjectName = f.subject ? f.subject.toUpperCase() : '';
    const chNum = f.chapter ? f.chapter.replace('ch', 'CH ') : '';
    
    const leftHeaderText = [classNum, subjectName, chNum].filter(Boolean).join(' • ');

    // 2. Main Title inside box (Chapter Name or Fallback)
    const mainTitle = f.chapter_name || leftHeaderText || 'Formula Document';

    // 3. Full Name for Viewers
    const fullViewerName = [leftHeaderText, f.chapter_name].filter(Boolean).join(' - ');

    let content = "";

    // TYPE 1: TEXT FORMULA
    if (f.type === "text") {
      const cleanText = encodeURIComponent(f.formula_text);
      content = `
        <div class="formula-text" onclick="openTextViewer('${cleanText}')">
          <span class="box-title">📝 ${f.formula_text}</span>
          <span class="click-hint">➔</span>
        </div>`;
    }

    // TYPE 2: IMAGE FORMULA
    if (f.type === "image") {
      const viewerUrl = `image-viewer.html?path=${encodeURIComponent(f.file_path)}&name=${encodeURIComponent(fullViewerName)}`;
      content = `
        <div class="formula-media-box" onclick="window.location.href='${viewerUrl}'">
          <span class="box-title">🖼️ ${mainTitle}</span>
          <span class="btn-action">➔</span>
        </div>`;
    }

    // TYPE 3: PDF FORMULA
    if (f.type === "pdf") {
      const viewerUrl = `notes-viewer.html?path=${encodeURIComponent(f.file_path)}&name=${encodeURIComponent(fullViewerName)}`;
      content = `
        <button class="pdf-btn" onclick="window.location.href='${viewerUrl}'">
          <span class="box-title">📄 ${mainTitle}</span>
          <span class="btn-action">➔</span>
        </button>`;
    }

    // Category Badge (Top Right)
    const categoryBadge = f.category ? `<span class="cat-tag">${f.category.replace('_', ' ').toUpperCase()}</span>` : '';

    // Final Card Structure
    card.innerHTML = `
      <div class="card-top-bar">
        <span class="card-info-left">${leftHeaderText}</span>
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

// ---------- EVENT LISTENERS ----------
if (fClass) fClass.addEventListener("change", loadFormulas);
if (fSubject) fSubject.addEventListener("change", loadFormulas);
if (fChapter) fChapter.addEventListener("change", loadFormulas);
if (fCategory) fCategory.addEventListener("change", loadFormulas);

// Initial Auto Load
loadFormulas();
