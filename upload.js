/* =====================================================
   ROITX • REFERENCE BOOK UPLOAD (CHAPTER VERSION)
   UPDATED WITH chapter_no
   ===================================================== */

/* DOM */
const fileInput = document.getElementById("bookFile");
const preview   = document.getElementById("previewName");
const statusBox = document.getElementById("status");
const bookList  = document.getElementById("bookList");

/* =====================================================
   AUTO NAME BUILDER
   Format:
   AUTHOR_Subject_ClassX_ChNo-ChName
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
  document.getElementById(id).addEventListener("input",()=>{
    const name = buildAutoName();
    preview.innerText = name ? "📘 " + name : "Select values to generate name";
  });
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

  statusBox.innerText = "⏳ Uploading book...";

  /* STORAGE PATH */
  const storagePath =
    `refbooks/class_${cls}/${subject}/ch_${chapterNo}/${safeName}.${ext}`;

  /* -------- STORAGE UPLOAD -------- */
  const { error: uploadError } =
    await window.supabaseClient.storage
      .from("admin-files")
      .upload(storagePath, file, { upsert:false });

  if(uploadError){
    statusBox.innerText = "❌ Storage upload failed";
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
        chapter_no: chapterNo,   // ✅ NEW
        chapter: chapter,
        file_url: urlData.publicUrl,
        storage_path: storagePath
      }]);

  if(dbError){
    statusBox.innerText = "❌ Database error";
    console.error(dbError);
    return;
  }

  statusBox.innerText = "✅ Book uploaded successfully";
  fileInput.value="";
  preview.innerText="Select values to generate name";

  loadBooks();
}

/* =====================================================
   LOAD BOOK LIST (ORDER BY chapter_no)
   ===================================================== */
async function loadBooks(){
  if(!bookList) return;

  bookList.innerHTML = "⏳ Loading books...";

  const { data, error } =
    await window.supabaseClient
      .from("ref_books")
      .select("*")
      .order("class_no",{ ascending:true })
      .order("subject",{ ascending:true })
      .order("chapter_no",{ ascending:true }); // ✅ FIXED ORDER

  if(error){
    bookList.innerHTML = "❌ Failed to load books";
    console.error(error);
    return;
  }

  if(!data.length){
    bookList.innerHTML = "<em>No books uploaded yet</em>";
    return;
  }

  bookList.innerHTML = "";

  data.forEach(b=>{
    const div = document.createElement("div");
    div.className = "book-item";

    div.innerHTML = `
      <div class="book-info">
        <b>${b.author} • Class ${b.class_no} • ${b.subject}</b>
        <div class="meta">
          Chapter ${b.chapter_no} — ${b.chapter}
        </div>
      </div>

      <div class="book-actions">
  <a href="${b.file_url}" target="_blank" class="view-btn">
    👀 View
  </a>
</div>
        <button class="danger"
          onclick="deleteBook('${b.id}','${b.storage_path}')">
          🗑
        </button>
      </div>
    `;

    bookList.appendChild(div);
  });
}

/* =====================================================
   DELETE BOOK
   ===================================================== */
async function deleteBook(id,path){
  if(!confirm("Delete this book permanently?")) return;

  await window.supabaseClient.storage
    .from("admin-files")
    .remove([path]);

  await window.supabaseClient
    .from("ref_books")
    .delete()
    .eq("id",id);

  loadBooks();
}

/* INIT */
document.addEventListener("DOMContentLoaded", loadBooks);