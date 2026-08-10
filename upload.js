/* =====================================================
   ROITX • REFERENCE BOOK UPLOAD (CHAPTER VERSION)
   FULLY UPDATED WITH DYNAMIC AUTHOR, CLASS, SUBJECT FILTERS
   ===================================================== */

const fileInput = document.getElementById("bookFile");
const preview   = document.getElementById("previewName");
const statusBox = document.getElementById("status");
const bookList  = document.getElementById("bookList");

/* =====================================================
   AUTO NAME BUILDER
   ===================================================== */
function buildAutoName(){
  const author    = document.getElementById("authorInput").value.trim();
  const subject   = document.getElementById("subjectSelect").value;
  const cls       = document.getElementById("classSelect").value;
  const chapterNo = document.getElementById("chapter_noInput").value.trim();
  const chapter   = document.getElementById("chapterInput").value.trim();

  if(!author || !chapterNo || !chapter) return "";

  return `${author}_${subject}_Class${cls}_Ch${chapterNo}-${chapter}`;
}

/* LIVE PREVIEW */
["authorInput","subjectSelect","classSelect","chapter_noInput","chapterInput"]
.forEach(id=>{
  const el = document.getElementById(id);
  if(el){
    el.addEventListener("input",()=>{
      const name = buildAutoName();
      if(preview) preview.innerText = name ? "📘 " + name : "Select values to generate name";
    });
  }
});

/* =====================================================
   UPLOAD BOOK
   ===================================================== */
async function uploadBook(){

  if(!window.supabaseClient){
    alert("Supabase not ready");
    return;
  }

  const file      = fileInput.files[0];
  const author    = document.getElementById("authorInput").value.trim();
  const subject   = document.getElementById("subjectSelect").value;
  const cls       = document.getElementById("classSelect").value;
  const chapterNo = document.getElementById("chapter_noInput").value.trim();
  const chapter   = document.getElementById("chapterInput").value.trim();

  if(!file || !author || !chapterNo || !chapter){
    alert("❌ Author, Chapter No, Chapter Name & File required");
    return;
  }

  const bookName = buildAutoName();
  const safeName = bookName.replace(/[^a-z0-9_-]/gi,"_");
  const ext      = file.name.split(".").pop();

  if(statusBox) statusBox.innerText = "⏳ Uploading book...";

  /* STORAGE PATH */
  const storagePath =
    `refbooks/class_${cls}/${subject}/ch_${chapterNo}/${safeName}.${ext}`;

  /* -------- STORAGE UPLOAD -------- */
  const { error: uploadError } =
    await window.supabaseClient.storage
      .from("admin-files")
      .upload(storagePath, file, { upsert:false });

  if(uploadError){
    if(statusBox) statusBox.innerText = "❌ Storage upload failed";
    console.error(uploadError);
    return;
  }

  /* -------- PUBLIC URL -------- */
  const { data: urlData } =
    window.supabaseClient.storage
      .from("admin-files")
      .getPublicUrl(storagePath);

  /* -------- DATABASE INSERT -------- */
  const { error: dbError } =
    await window.supabaseClient
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
    console.error(dbError);
    return;
  }

  if(statusBox) statusBox.innerText = "✅ Book uploaded successfully";
  fileInput.value = "";
  if(preview) preview.innerText = "Select values to generate name";

  // Instant Refresh after upload
  await loadBooks();
}

/* =====================================================
   POPULATE AUTHOR DROPDOWN DYNAMICALLY
   ===================================================== */
function updateAuthorDropdown(data) {
  const authorSelect = document.getElementById("filterAuthor");
  if (!authorSelect) return;

  const currentSelected = authorSelect.value;
  
  // Unique authors extract karna
  const authors = [...new Set(data.map(b => b.author))].sort();

  authorSelect.innerHTML = '<option value="">All Authors</option>';
  authors.forEach(author => {
    const opt = document.createElement("option");
    opt.value = author;
    opt.textContent = author;
    if (author === currentSelected) opt.selected = true;
    authorSelect.appendChild(opt);
  });
}

/* =====================================================
   LOAD BOOK LIST (WITH SEARCH, DYNAMIC AUTHORS & LIMIT 20)
   ===================================================== */
async function loadBooks(){
  if(!bookList) return;

  bookList.innerHTML = "⏳ Loading books...";

  let query = window.supabaseClient
    .from("ref_books")
    .select("*")
    .order("class_no",{ ascending:true })
    .order("subject",{ ascending:true })
    .order("chapter_no",{ ascending:true })
    .limit(20);

  const { data, error } = await query;

  if(error){
    bookList.innerHTML = "❌ Failed to load books";
    console.error(error);
    return;
  }

  if(!data || data.length === 0){
    bookList.innerHTML = "<em>No books uploaded yet</em>";
    return;
  }

  // Update author dropdown options based on available data
  updateAuthorDropdown(data);

  // Get values from filters
  const searchVal  = document.getElementById("searchBook")?.value.toLowerCase().trim() || "";
  const authorVal  = document.getElementById("filterAuthor")?.value || "";
  const classVal   = document.getElementById("filterClass")?.value || "";
  const subVal     = document.getElementById("filterSubject")?.value || "";

  // Apply filters logic
  const filtered = data.filter(b => {
    const textMatch  = `${b.author} ${b.subject} ${b.chapter} Class ${b.class_no}`.toLowerCase().includes(searchVal);
    const authorMatch= authorVal === "" || b.author === authorVal;
    const classMatch = classVal === "" || String(b.class_no) === String(classVal);
    const subMatch   = subVal === "" || b.subject === subVal;

    return textMatch && authorMatch && classMatch && subMatch;
  });

  if(filtered.length === 0){
    bookList.innerHTML = "<em>No matching books found</em>";
    return;
  }

  bookList.innerHTML = "";

  filtered.forEach(b=>{
    const div = document.createElement("div");
    div.className = "book-item";

    // Notes-viewer par redirect karne ke liye path handle karna
    // Agar aapke paas storage_path hai toh use karenge, warna file_url
    const targetPath = b.storage_path || `refbooks/class_${b.class_no}/${b.subject}/ch_${b.chapter_no}/${b.name}.pdf`;
    const fileName = `${b.name}.pdf`;

    div.innerHTML = `
      <div class="book-info">
        <b>${b.author} • Class ${b.class_no} • ${b.subject}</b>
        <div class="meta">
          Chapter ${b.chapter_no} — ${b.chapter}
        </div>
      </div>

      <div class="book-actions">
        <button class="view-btn" onclick="openPdfViewer('${encodeURIComponent(targetPath)}', '${encodeURIComponent(fileName)}')">
          👀 View
        </button>
        <button class="danger" onclick="deleteBook('${b.id}','${b.storage_path}')">
          🗑
        </button>
      </div>
    `;

    bookList.appendChild(div);
  });
}

/* =====================================================
   OPEN PDF VIEWER (NOTES-VIEWER.HTML)
   ===================================================== */
function openPdfViewer(encodedPath, encodedName) {
  const viewerUrl = `notes-viewer.html?path=${encodedPath}&name=${encodedName}`;
  window.location.href = viewerUrl;
}

/* =====================================================
   DELETE BOOK
   ===================================================== */
async function deleteBook(id,path){
  if(!confirm("Delete this book permanently?")) return;

  const { error: storageError } = await window.supabaseClient.storage
    .from("admin-files")
    .remove([path]);

  if(storageError) {
    console.error(storageError);
  }

  const { error: dbError } = await window.supabaseClient
    .from("ref_books")
    .delete()
    .eq("id",id);

  if(dbError){
    alert("❌ Delete failed");
    return;
  }

  await loadBooks();
}

/* INIT & FILTER EVENT LISTENERS */
document.addEventListener("DOMContentLoaded", () => {
  loadBooks();
  
  document.getElementById("searchBook")?.addEventListener("input", loadBooks);
  document.getElementById("filterAuthor")?.addEventListener("change", loadBooks);
  document.getElementById("filterClass")?.addEventListener("change", loadBooks);
  document.getElementById("filterSubject")?.addEventListener("change", loadBooks);
});
