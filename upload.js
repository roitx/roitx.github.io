const fileInput = document.getElementById("bookFile");
const preview   = document.getElementById("previewName");
const statusBox = document.getElementById("status");
const bookList  = document.getElementById("bookList");

/* AUTO NAME BUILDER */
function buildAutoName(author, subject, cls, chapterNo, chapter){
  if(!author || !chapterNo || !chapter) return "";
  return `${author}_${subject}_Class${cls}_Ch${chapterNo}-${chapter}`;
}

/* LIVE PREVIEW & INPUT LISTENERS */
["authorInput","subjectSelect","classSelect","chapter_noInput","chapterInput"]
.forEach(id=>{
  const el = document.getElementById(id);
  if(el){
    el.addEventListener("input",()=>{
      const author = document.getElementById("authorInput").value.trim();
      const subject = document.getElementById("subjectSelect").value;
      const cls = document.getElementById("classSelect").value;
      const chapterNo = document.getElementById("chapter_noInput").value.trim();
      const chapter = document.getElementById("chapterInput").value.trim();
      
      const name = buildAutoName(author, subject, cls, chapterNo, chapter);
      if(preview) preview.innerText = name ? "📘 " + name : "Select values to generate name";
    });
  }
});

/* AUTHOR DROPDOWN SE INPUT FIELD AUTO-FILL KARNA */
document.getElementById("authorSelect")?.addEventListener("change", (e) => {
  if (e.target.value) {
    const authorInput = document.getElementById("authorInput");
    authorInput.value = e.target.value;
    authorInput.dispatchEvent(new Event("input"));
  }
});

/* DYNAMIC STATS CARDS GENERATOR (MAX 5 LOWEST UPLOADED AUTHORS + TOTAL CARD) */
function renderStatsCards(allBooks) {
  const container = document.getElementById("statsDashboard");
  if (!container) return;

  if (!allBooks || allBooks.length === 0) {
    container.innerHTML = "";
    return;
  }

  // 1. Author wise count aggregate
  const authorCounts = {};
  allBooks.forEach(b => {
    if (b.author) {
      authorCounts[b.author] = (authorCounts[b.author] || 0) + 1;
    }
  });

  // 2. Sort Ascending (Sabse Kam Pehle) & Pick Top 5
  const sortedAuthors = Object.entries(authorCounts)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5);

  const totalBooks = allBooks.length;
  const totalAuthors = Object.keys(authorCounts).length;

  // Clean SVG Icons for Stat Cards
  const svgTotal = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
  const svgBook  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;

  let html = `
    <!-- TOTAL CARD -->
    <div class="stat-card total-card" onclick="filterByAuthor('')">
      <div class="stat-title" style="display:flex; align-items:center; gap:4px;">${svgTotal} Total Books</div>
      <div class="stat-value">${totalBooks}</div>
      <div class="stat-badge">${totalAuthors} Authors</div>
    </div>
  `;

  // 3. Render Top 5 Lowest Upload Cards
  sortedAuthors.forEach(([author, count]) => {
    html += `
      <div class="stat-card" onclick="filterByAuthor('${escapeQuotes(author)}')">
        <div class="stat-title" title="${author}" style="display:flex; align-items:center; gap:4px;">${svgBook} ${author}</div>
        <div class="stat-value">${count}</div>
        <div class="stat-badge">Low Uploads</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/* Quick Author Filter Trigger via Cards */
function filterByAuthor(authorName) {
  const filterAuthorSelect = document.getElementById("filterAuthor");
  if (filterAuthorSelect) {
    filterAuthorSelect.value = authorName;
    filterAuthorSelect.dispatchEvent(new Event("change"));
  }
}

/* UPLOAD BOOK */
async function uploadBook(){
  if(!window.supabaseClient) return alert("Supabase not ready");

  const file = fileInput.files[0];
  const author = document.getElementById("authorInput").value.trim();
  const subject = document.getElementById("subjectSelect").value;
  const cls = document.getElementById("classSelect").value;
  const chapterNo = document.getElementById("chapter_noInput").value.trim();
  const chapter = document.getElementById("chapterInput").value.trim();

  if(!file || !author || !chapterNo || !chapter){
    return alert("❌ Author, Chapter No, Chapter Name & File required");
  }

  const bookName = buildAutoName(author, subject, cls, chapterNo, chapter);
  const safeName = bookName.replace(/[^a-z0-9_-]/gi,"_");
  const ext = file.name.split(".").pop();

  if(statusBox) statusBox.innerText = "⏳ Uploading book...";

  const storagePath = `refbooks/class_${cls}/${subject}/ch_${chapterNo}/${safeName}.${ext}`;

  const { error: uploadError } = await window.supabaseClient.storage
    .from("admin-files")
    .upload(storagePath, file, { upsert:false });

  if(uploadError){
    if(statusBox) statusBox.innerText = "❌ Storage upload failed";
    return console.error(uploadError);
  }

  const { data: urlData } = window.supabaseClient.storage
    .from("admin-files")
    .getPublicUrl(storagePath);

  const { error: dbError } = await window.supabaseClient
    .from("ref_books")
    .insert([{
      name: bookName,
      author: author,
      subject: subject,
      class_no: cls,
      chapter_no: chapterNo,
      chapter: chapter,
      file_url: urlData.publicUrl,
      storage_path: storagePath
    }]);

  if(dbError){
    if(statusBox) statusBox.innerText = "❌ Database error";
    return console.error(dbError);
  }

  if(statusBox) statusBox.innerText = "✅ Book uploaded successfully";
  
  // Form Reset
  fileInput.value = "";
  document.getElementById("authorInput").value = "";
  const authorSelect = document.getElementById("authorSelect");
  if(authorSelect) authorSelect.value = "";
  if(preview) preview.innerText = "Select values to generate name";

  await loadBooks();
}

/* UPDATE BOTH AUTHOR DROPDOWNS (UPLOAD FORM & LIST FILTER) */
function updateAuthorDropdown(data) {
  const filterAuthorSelect = document.getElementById("filterAuthor");
  const uploadAuthorSelect = document.getElementById("authorSelect");
  
  if (!filterAuthorSelect && !uploadAuthorSelect) return;

  const currentFilterSelected = filterAuthorSelect ? filterAuthorSelect.value : "";
  const currentUploadSelected = uploadAuthorSelect ? uploadAuthorSelect.value : "";
  
  const authors = [...new Set(data.map(b => b.author))].filter(Boolean).sort();

  if (filterAuthorSelect) {
    filterAuthorSelect.innerHTML = '<option value="">All Authors</option>';
    authors.forEach(author => {
      const opt = document.createElement("option");
      opt.value = author;
      opt.textContent = author;
      if (author === currentFilterSelected) opt.selected = true;
      filterAuthorSelect.appendChild(opt);
    });
  }

  if (uploadAuthorSelect) {
    uploadAuthorSelect.innerHTML = '<option value="">-- Or Select Existing Author --</option>';
    authors.forEach(author => {
      const opt = document.createElement("option");
      opt.value = author;
      opt.textContent = author;
      if (author === currentUploadSelected) opt.selected = true;
      uploadAuthorSelect.appendChild(opt);
    });
  }
}

/* LOAD BOOK LIST WITH FIXED SVG ICONS */
async function loadBooks(){
  if(!bookList) return;
  bookList.innerHTML = "⏳ Loading books...";

  const { data, error } = await window.supabaseClient
    .from("ref_books")
    .select("*")
    .order("class_no",{ ascending:true })
    .order("subject",{ ascending:true })
    .order("chapter_no",{ ascending:true });

  if(error || !data || data.length === 0){
    bookList.innerHTML = error ? "❌ Failed to load books" : "<em>No books uploaded yet</em>";
    renderStatsCards([]);
    return;
  }

  // Calculate & Render Dashboard Stat Cards
  renderStatsCards(data);

  updateAuthorDropdown(data);

  const searchVal = document.getElementById("searchBook")?.value.toLowerCase().trim() || "";
  const authorVal = document.getElementById("filterAuthor")?.value || "";
  const classVal  = document.getElementById("filterClass")?.value || "";
  const subVal    = document.getElementById("filterSubject")?.value || "";

  const filtered = data.filter(b => {
    const textMatch = `${b.author} ${b.subject} ${b.chapter} Class ${b.class_no}`.toLowerCase().includes(searchVal);
    const authorMatch = authorVal === "" || b.author === authorVal;
    const classMatch  = classVal === "" || String(b.class_no) === String(classVal);
    const subMatch    = subVal === "" || b.subject === subVal;
    return textMatch && authorMatch && classMatch && subMatch;
  });

  if(filtered.length === 0){
    bookList.innerHTML = "<em>No matching books found</em>";
    return;
  }

  bookList.innerHTML = "";
  filtered.forEach(b => {
    const div = document.createElement("div");
    div.className = "book-item";

    const targetPath = b.storage_path || `refbooks/class_${b.class_no}/${b.subject}/ch_${b.chapter_no}/${b.name}.pdf`;
    const fileName = `${b.name}.pdf`;

    // Valid SVG Vectors for View, Edit, and Delete
    const svgView  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const svgEdit  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
    const svgTrash = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

    div.innerHTML = `
      <div class="book-info">
        <b>${b.author} • Class ${b.class_no} • ${b.subject}</b>
        <div class="meta">Chapter ${b.chapter_no} — ${b.chapter}</div>
      </div>
      <div class="book-actions">
        <button class="view-btn" onclick="openPdfViewer('${encodeURIComponent(targetPath)}', '${encodeURIComponent(fileName)}')">
          ${svgView} View
        </button>
        <button class="edit-btn" title="Edit Book" onclick="openBookEditModal('${b.id}', '${escapeQuotes(b.author)}', '${b.class_no}', '${b.subject}', '${b.chapter_no}', '${escapeQuotes(b.chapter)}')">
          ${svgEdit}
        </button>
        <button class="danger" title="Delete Book" onclick="deleteBook('${b.id}','${b.storage_path}')">
          ${svgTrash}
        </button>
      </div>
    `;
    bookList.appendChild(div);
  });
}

function openPdfViewer(encodedPath, encodedName) {
  window.location.href = `notes-viewer.html?path=${encodedPath}&name=${encodedName}`;
}

/* EDIT MODAL FUNCTIONS */
function openBookEditModal(id, author, cls, sub, chNo, chapter) {
  document.getElementById("editBookId").value = id;
  document.getElementById("editAuthorInput").value = author;
  document.getElementById("editClassSelect").value = cls;
  document.getElementById("editSubjectSelect").value = sub;
  document.getElementById("editChapterNoInput").value = chNo;
  document.getElementById("editChapterInput").value = chapter;
  
  document.getElementById("editBookModal").style.display = "flex";
}

function closeBookEditModal() {
  document.getElementById("editBookModal").style.display = "none";
}

async function saveBookEdit() {
  const id = document.getElementById("editBookId").value;
  const author = document.getElementById("editAuthorInput").value.trim();
  const cls = document.getElementById("editClassSelect").value;
  const sub = document.getElementById("editSubjectSelect").value;
  const chNo = document.getElementById("editChapterNoInput").value.trim();
  const chapter = document.getElementById("editChapterInput").value.trim();

  if(!author || !chNo || !chapter) return alert("❌ All fields required");

  const newName = buildAutoName(author, sub, cls, chNo, chapter);

  const { error } = await window.supabaseClient
    .from("ref_books")
    .update({
      name: newName,
      author: author,
      class_no: cls,
      subject: sub,
      chapter_no: chNo,
      chapter: chapter
    })
    .eq("id", id);

  if(error) return alert("❌ Update failed: " + error.message);

  closeBookEditModal();
  await loadBooks();
}

/* DELETE BOOK */
async function deleteBook(id, path){
  if(!confirm("Delete this book permanently?")) return;

  if(path) await window.supabaseClient.storage.from("admin-files").remove([path]);
  
  const { error } = await window.supabaseClient.from("ref_books").delete().eq("id", id);
  if(error) return alert("❌ Delete failed");

  await loadBooks();
}

function escapeQuotes(str) {
  if (!str) return "";
  return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", () => {
  loadBooks();
  document.getElementById("searchBook")?.addEventListener("input", loadBooks);
  document.getElementById("filterAuthor")?.addEventListener("change", loadBooks);
  document.getElementById("filterClass")?.addEventListener("change", loadBooks);
  document.getElementById("filterSubject")?.addEventListener("change", loadBooks);
});
