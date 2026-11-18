// =========================================================
// formulas.js — DYNAMIC CASCADING FILTERS + LIVE SEARCH
// =========================================================

const fSearch = document.getElementById("fSearch");
const fClass = document.getElementById("fClass");
const fSubject = document.getElementById("fSubject");
const fChapter = document.getElementById("fChapter");
const fCategory = document.getElementById("fCategory"); 
const formulaList = document.getElementById("formulaList");

let searchDebounceTimer = null;

// Logged-in user ki id: uski apni pending upload bhi (badge ke saath) usi ko dikhe
let _uid;
async function getUid() {
  if (_uid !== undefined) return _uid;
  try { _uid = (await window.supabaseClient.auth.getUser()).data?.user?.id || null; } catch (e) { _uid = null; }
  return _uid;
}
const pubVis = () => _uid ? `publish.eq.true,and(status.eq.pending,user_id.eq.${_uid})` : 'publish.eq.true';

// safety helpers
const escHtml = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const encAttr = v => encodeURIComponent(v).replace(/'/g, '%27');
const isSafePath = p => { p = String(p || ''); return p.length > 0 && !/['"\\<>`\r\n]/.test(p); };

// Initialization: Fetch available options from Database
document.addEventListener("DOMContentLoaded", () => {
  loadClasses();
  loadFormulas();
});

/* ---------- CASCADING DYNAMIC FLOW LOGIC ---------- */

// 1. Fetch Unique Classes
async function loadClasses() {
  if (!fClass) return;
  await getUid();
  const { data, error } = await window.supabaseClient
    .from("formulas")
    .select("class")
    .or(pubVis());

  if (error || !data) return;

  const uniqueClasses = [...new Set(data.map(item => item.class).filter(Boolean))].sort();
  
  fClass.innerHTML = '<option value="">All Classes</option>';
  uniqueClasses.forEach(cls => {
    const opt = document.createElement("option");
    opt.value = cls;
    opt.textContent = isNaN(cls) ? cls.toUpperCase() : `Class ${cls}`;
    fClass.appendChild(opt);
  });
}

// 2. Class Changed -> Fetch Subjects for selected Class
async function onClassChange() {
  await getUid();
  const selectedClass = fClass.value;
  
  // Reset downstream filters
  fSubject.innerHTML = '<option value="">All Subjects</option>';
  fChapter.innerHTML = '<option value="">All Chapters</option>';
  fCategory.innerHTML = '<option value="">All Categories</option>';
  
  fSubject.disabled = !selectedClass;
  fChapter.disabled = true;
  fCategory.disabled = true;

  if (selectedClass) {
    const { data } = await window.supabaseClient
      .from("formulas")
      .select("subject")
      .or(pubVis())
      .eq("class", selectedClass);

    if (data) {
      const uniqueSubjects = [...new Set(data.map(i => i.subject).filter(Boolean))].sort();
      uniqueSubjects.forEach(sub => {
        const opt = document.createElement("option");
        opt.value = sub;
        opt.textContent = sub.toUpperCase();
        fSubject.appendChild(opt);
      });
    }
  }

  loadFormulas();
}

// 3. Subject Changed -> Fetch Chapters for selected Class & Subject
async function onSubjectChange() {
  await getUid();
  const selectedClass = fClass.value;
  const selectedSubject = fSubject.value;

  fChapter.innerHTML = '<option value="">All Chapters</option>';
  fCategory.innerHTML = '<option value="">All Categories</option>';

  fChapter.disabled = !selectedSubject;
  fCategory.disabled = true;

  if (selectedClass && selectedSubject) {
    const { data } = await window.supabaseClient
      .from("formulas")
      .select("chapter, chapter_name")
      .or(pubVis())
      .eq("class", selectedClass)
      .eq("subject", selectedSubject);

    if (data) {
      const chapterMap = new Map();
      data.forEach(i => {
        if (i.chapter) {
          const label = i.chapter_name ? `${i.chapter.toUpperCase()} - ${i.chapter_name}` : i.chapter.toUpperCase();
          chapterMap.set(i.chapter, label);
        }
      });

      chapterMap.forEach((label, val) => {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = label;
        fChapter.appendChild(opt);
      });
    }
  }

  loadFormulas();
}

// 4. Chapter Changed -> Fetch Categories for selected Class, Subject & Chapter
async function onChapterChange() {
  await getUid();
  const selectedClass = fClass.value;
  const selectedSubject = fSubject.value;
  const selectedChapter = fChapter.value;

  fCategory.innerHTML = '<option value="">All Categories</option>';
  fCategory.disabled = !selectedChapter;

  if (selectedClass && selectedSubject && selectedChapter) {
    const { data } = await window.supabaseClient
      .from("formulas")
      .select("category")
      .or(pubVis())
      .eq("class", selectedClass)
      .eq("subject", selectedSubject)
      .eq("chapter", selectedChapter);

    if (data) {
      const uniqueCategories = [...new Set(data.map(i => i.category).filter(Boolean))].sort();
      uniqueCategories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat.replace('_', ' ').toUpperCase();
        fCategory.appendChild(opt);
      });
    }
  }

  loadFormulas();
}

/* ---------- SEARCH BAR DEBOUNCE HANDLING ---------- */
function handleSearchInput() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    loadFormulas();
  }, 300); // Typing rukhne ke 300ms baad fetch karega
}

/* ---------- MAIN FORMULA FETCHING FUNCTION ---------- */
async function loadFormulas() {
  if (!formulaList) return;
  await getUid();
  formulaList.innerHTML = "<div style='text-align:center; padding:25px; color:#94a3b8;'>⏳ Loading formulas...</div>";

  let query = window.supabaseClient
    .from("formulas")
    .select("*")
    .or(pubVis())
    .order("created_at", { ascending: false })
    .limit(40);

  // Apply Filter Dropdowns
  if (fClass && fClass.value) query = query.eq("class", fClass.value);
  if (fSubject && fSubject.value) query = query.eq("subject", fSubject.value);
  if (fChapter && fChapter.value) query = query.eq("chapter", fChapter.value);
  if (fCategory && fCategory.value) query = query.eq("category", fCategory.value);

  // Apply Text Search Filter
  if (fSearch && fSearch.value.trim()) {
    const term = `%${fSearch.value.trim()}%`;
    query = query.or(`formula_text.ilike.${term},chapter_name.ilike.${term},subject.ilike.${term}`);
  }

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
    if ((f.type === 'pdf' || f.type === 'image') && !isSafePath(f.file_path)) continue;
    const card = document.createElement("div");
    card.className = "formula-card";

    const classNum = f.class ? (isNaN(f.class) ? f.class.toUpperCase() : `Class ${f.class}`) : '';
    const subjectName = f.subject ? f.subject.toUpperCase() : '';
    const chNum = f.chapter ? f.chapter.replace('ch', 'CH ') : '';
    
    const leftHeaderText = [classNum, subjectName, chNum].filter(Boolean).join(' • ');
    const mainTitle = f.chapter_name || leftHeaderText || 'Formula Document';
    const fullViewerName = [leftHeaderText, f.chapter_name].filter(Boolean).join(' - ');

    let content = "";

    if (f.type === "text") {
      const cleanText = encAttr(f.formula_text);
      content = `
        <div class="formula-text" onclick="openTextViewer('${cleanText}')">
          <span class="box-title">📝 ${escHtml(f.formula_text)}</span>
          <span class="click-hint">➔</span>
        </div>`;
    }

    if (f.type === "image") {
      const viewerUrl = `image-viewer.html?path=${encodeURIComponent(f.file_path)}&name=${encAttr(fullViewerName)}`;
      content = `
        <div class="formula-media-box" onclick="window.location.href='${viewerUrl}'">
          <span class="box-title">🖼️ ${escHtml(mainTitle)}</span>
          <span class="btn-action">➔</span>
        </div>`;
    }

    if (f.type === "pdf") {
      const viewerUrl = `notes-viewer.html?path=${encodeURIComponent(f.file_path)}&name=${encAttr(fullViewerName)}`;
      content = `
        <button class="pdf-btn" onclick="window.location.href='${viewerUrl}'">
          <span class="box-title">📄 ${escHtml(mainTitle)}</span>
          <span class="btn-action">➔</span>
        </button>`;
    }

    const categoryBadge = f.category ? `<span class="cat-tag">${escHtml(f.category.replace('_', ' ').toUpperCase())}</span>` : '';
    const pendingBadge = f.status === 'pending' ? `<span class="cat-tag" style="background:#f5a524;color:#2b1a00">APPROVAL PENDING</span>` : '';

    card.innerHTML = `
      <div class="card-top-bar">
        <span class="card-info-left">${escHtml(leftHeaderText)}</span>
        ${pendingBadge}${categoryBadge}
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
