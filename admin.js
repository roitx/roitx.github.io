/* =====================================================
   ADMIN PANEL — COMPACT & SHORTENED LAYOUT SYSTEM
   ===================================================== */

/* =====================================================
   PART 1: AUTH HELPERS & GLOBAL STATS
   ===================================================== */

function goUpload() {
  window.location.href = "upload.html";
}

async function getCurrentUser() {
  try {
    const { data, error } = await window.supabaseClient.auth.getUser();
    if (error) return null;
    return data?.user || null;
  } catch (e) {
    return null;
  }
}

function logout() {
  window.supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

async function updateStats() {
  try {
    const { count: notesCount } = await window.supabaseClient
      .from("notes")
      .select("id", { count: "exact", head: true });
    const notesEl = document.getElementById("totalNotesCount");
    if (notesEl) notesEl.innerText = notesCount || 0;

    const { count: formulasCount } = await window.supabaseClient
      .from("formulas")
      .select("id", { count: "exact", head: true });
    const formulasEl = document.getElementById("totalFormulasCount");
    if (formulasEl) formulasEl.innerText = formulasCount || 0;

    const { count: eventsCount } = await window.supabaseClient
      .from("events")
      .select("id", { count: "exact", head: true });
    const eventsEl = document.getElementById("totalEventsCount");
    if (eventsEl) eventsEl.innerText = eventsCount || 0;
  } catch (err) {
    console.error("❌ Stats update failed:", err);
  }
}


/* =====================================================
   PART 2: UPLOADED NOTES SYSTEM (COMPACT CARDS)
   ===================================================== */

async function uploadFile() {
  const fileInput = document.getElementById("fileUpload");
  const file = fileInput?.files[0];

  if (!file) return alert("❌ PDF select karo");
  if (!file.name.toLowerCase().endsWith(".pdf")) return alert("❌ Sirf PDF allowed");

  const cls = document.getElementById("classSelect")?.value;
  const sub = document.getElementById("subjectSelect")?.value;
  const chSelect = document.getElementById("chapterSelect")?.value;
  const chapterName = document.getElementById("chapterNameInput")?.value.trim();
  const msg = document.getElementById("uploadMsg");

  if (!cls || !sub || !chSelect || !chapterName) {
    return alert("❌ Please select Class, Subject, Chapter and enter Chapter Name!");
  }

  const chapterNumber = parseInt(chSelect.replace("ch", "")) || 1;
  const classNum = cls.replace("class", "");
  
  const cleanFileName = file.name.replace(/\s+/g, "_");
  const fileName = `${classNum}_${sub}_ch${chapterNumber}_${cleanFileName}`;
  const filePath = `notes/${fileName}`;

  if (msg) msg.innerText = "⏳ Uploading file & saving details...";

  const { error: uploadError } = await window.supabaseClient.storage
    .from("admin-files")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error("Storage Error:", uploadError);
    if (msg) msg.innerText = "❌ Upload failed";
    return;
  }

  const { error: dbError } = await window.supabaseClient
    .from("notes")
    .insert([
      {
        class: classNum,
        subject: sub.toLowerCase().trim(),
        chapter_number: chapterNumber,
        chapter_name: chapterName,
        file_path: filePath
      }
    ]);

  if (dbError) {
    console.error("Database Error:", dbError);
    if (msg) msg.innerText = "⚠️ File uploaded, but database save failed!";
    return;
  }

  if (msg) msg.innerText = "✅ Successfully Uploaded & Saved!";
  if (fileInput) fileInput.value = "";
  const nameInput = document.getElementById("chapterNameInput");
  if (nameInput) nameInput.value = "";
  
  await loadFiles();
  await updateStats();
}

async function loadFiles() {
  const list = document.getElementById("fileList");
  if (!list) return;

  list.innerHTML = "<em style='color:#b9c9e0; font-size:13px;'>⏳ Loading notes...</em>";

  const { data, error } = await window.supabaseClient
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false })
    .order("class", { ascending: true })
    .order("subject", { ascending: true })
    .order("chapter_number", { ascending: true });

  if (error || !data || data.length === 0) {
    list.innerHTML = "<em style='color:#b9c9e0; font-size:13px;'>No files found</em>";
    updateStats();
    return;
  }

  const search = document.getElementById("searchNotes")?.value.toLowerCase().trim() || "";
  const filterCls = document.getElementById("filterNotesClass")?.value || "";
  const filterSub = document.getElementById("filterNotesSubject")?.value.toLowerCase() || "";

  const filtered = data.filter(note => {
    const searchStr = `${note.chapter_name || ""} ${note.subject || ""} class ${note.class || ""}`.toLowerCase();
    const matchSearch = searchStr.includes(search);
    const matchClass = filterCls ? String(note.class) === String(filterCls) : true;
    const matchSubject = filterSub ? (note.subject || "").toLowerCase() === filterSub.toLowerCase() : true;
    return matchSearch && matchClass && matchSubject;
  });

  if (filtered.length === 0) {
    list.innerHTML = "<em style='color:#b9c9e0; font-size:13px;'>No matching notes found</em>";
    updateStats();
    return;
  }

  list.innerHTML = "";
  filtered.forEach(note => {
    const row = document.createElement("div");
    row.className = "note-list-card";
    
    const subShort = (note.subject || "").substring(0, 3).toUpperCase();
    const escapedName = escapeQuotes(note.chapter_name || "");

    row.innerHTML = `
      <div class="note-info-text">
        Class ${note.class} • ${subShort} • Ch ${note.chapter_number} • ${note.chapter_name || "No Name"}
      </div>
      
      <div class="note-action-buttons">
        <button class="btn-view-note" onclick="openFile('${note.file_path}', '${note.class}', '${note.subject}', '${escapedName}')" title="View">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="btn-edit-note" onclick="openNoteEditModal('${note.id}', '${note.class}', '${note.subject}', '${note.chapter_number}', '${escapedName}', '${note.file_path}')" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        </button>
        <button class="btn-delete-note" onclick="deleteNoteRecord('${note.id}', '${note.file_path}')" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    `;
    list.appendChild(row);
  });

  updateStats();
}

function openNoteEditModal(id, cls, sub, chNum, chName, filePath) {
  const idEl = document.getElementById("editNoteId");
  const clsEl = document.getElementById("editNoteClass");
  const subEl = document.getElementById("editNoteSubject");
  const chNumEl = document.getElementById("editNoteChNum");
  const chNameEl = document.getElementById("editNoteChName");

  if (idEl) idEl.value = id;
  if (clsEl) clsEl.value = cls;
  if (subEl) subEl.value = sub;
  if (chNumEl) chNumEl.value = chNum;
  if (chNameEl) chNameEl.value = chName;
  
  const viewBtn = document.getElementById("editNoteViewBtn");
  if (viewBtn) {
    viewBtn.onclick = () => openFile(filePath, cls, sub, chName);
  }
  
  const modal = document.getElementById("editNoteModal");
  if (modal) modal.style.display = "flex";
}

async function openFile(filePath, noteClass, noteSubject, noteChapterName) {
  const className = noteClass ? `Class ${noteClass}` : "";
  const subjectName = noteSubject ? noteSubject.toUpperCase() : "";
  const chapterInfo = noteChapterName ? noteChapterName : "";

  const descriptiveName = [className, subjectName, chapterInfo].filter(Boolean).join(" • ") || "Notes Document";
  window.location.href = `notes-viewer.html?path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(descriptiveName)}`;
}

function closeNoteEditModal() {
  const modal = document.getElementById("editNoteModal");
  if (modal) modal.style.display = "none";
}

async function saveNoteEdit() {
  const id = document.getElementById("editNoteId")?.value;
  const cls = document.getElementById("editNoteClass")?.value;
  const sub = document.getElementById("editNoteSubject")?.value;
  const chNum = parseInt(document.getElementById("editNoteChNum")?.value) || 1;
  const chName = document.getElementById("editNoteChName")?.value.trim();

  if (!chName) return alert("❌ Please enter a chapter name");

  const { error } = await window.supabaseClient
    .from("notes")
    .update({ 
      class: cls,
      subject: sub,
      chapter_number: chNum,
      chapter_name: chName 
    })
    .eq("id", id)
    .select();

  if (error) {
    alert("❌ Update failed: " + error.message);
    return;
  }

  closeNoteEditModal();
  await loadFiles();
  await updateStats();
}

async function deleteNoteRecord(id, filePath) {
  if (!confirm("Delete this note?")) return;
  
  if (filePath) {
    await window.supabaseClient.storage.from("admin-files").remove([filePath]);
  }
  
  if (id) {
    await window.supabaseClient.from("notes").delete().eq("id", id);
  }

  await loadFiles();
  await updateStats();
}


/* =====================================================
   PART 3: CALENDAR EVENTS SYSTEM
   ===================================================== */

async function addEvent() {
  const date = document.getElementById("eventDate")?.value;
  const name = document.getElementById("eventName")?.value.trim();
  const msg  = document.getElementById("eventMsg");

  if (!date || !name) return alert("❌ Fill Date & Name");

  const { data: userData } = await window.supabaseClient.auth.getUser();
  if (!userData?.user) return alert("❌ Login required");

  const { error } = await window.supabaseClient.from("events").insert([{
    user_id: userData.user.id,
    event_date: date,
    event_name: name,
    is_global: true 
  }]);

  if (error) {
    if (msg) msg.innerText = "❌ Error adding event";
    return;
  }

  if (msg) msg.innerText = "✅ Admin Event added";
  if (document.getElementById("eventName")) document.getElementById("eventName").value = "";
  
  await loadEvents();
  await updateStats();
}

async function loadEvents() {
  const list = document.getElementById("eventList");
  if (!list) return;

  list.innerHTML = "<em style='color:#b9c9e0; font-size:13px;'>⏳ Loading events...</em>";

  const { data, error } = await window.supabaseClient
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Events Load Error:", error);
    list.innerHTML = "<em style='color:#b9c9e0; font-size:13px;'>Error loading events</em>";
    updateStats();
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<em style='color:#b9c9e0; font-size:13px;'>No events found</em>";
    updateStats();
    return;
  }

  const search = document.getElementById("searchEvent")?.value.toLowerCase().trim() || "";
  const monthFilter = document.getElementById("filterEventMonth")?.value || "";
  const yearFilter = document.getElementById("filterEventYear")?.value || "";
  const typeFilter = document.getElementById("filterEventType")?.value || "all";

  const filtered = data.filter(ev => {
    const [year, month] = (ev.event_date || "").split("-");
    const matchSearch = (ev.event_name || "").toLowerCase().includes(search);
    const matchMonth = monthFilter ? month === monthFilter : true;
    const matchYear  = yearFilter ? year === yearFilter : true;
    
    let matchType = true;
    if (typeFilter === "global") matchType = ev.is_global === true;
    if (typeFilter === "user") matchType = ev.is_global !== true;

    return matchSearch && matchMonth && matchYear && matchType;
  });

  if (filtered.length === 0) {
    list.innerHTML = "<em style='color:#b9c9e0; font-size:13px;'>No matching events found</em>";
    updateStats();
    return;
  }

  list.innerHTML = "";
  filtered.forEach(ev => {
    const row = document.createElement("div");
    row.className = "note-list-card";
    const escapedEvName = escapeQuotes(ev.event_name || "");

    row.innerHTML = `
      <div class="note-info-text">
        📅 ${ev.event_date} • ${ev.event_name}
      </div>

      <div class="note-action-buttons">
        <button class="btn-edit-note" onclick="openEventEditModal('${ev.id}', '${ev.event_date}', '${escapedEvName}')" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> Edit
        </button>
        <button class="btn-delete-note" onclick="deleteEvent('${ev.id}')" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> Delete
        </button>
      </div>
    `;
    list.appendChild(row);
  });

  updateStats();
}

function openEventEditModal(id, date, name) {
  const idEl = document.getElementById("editEventId");
  const dateEl = document.getElementById("editEventDate");
  const nameEl = document.getElementById("editEventName");

  if (idEl) idEl.value = id;
  if (dateEl) dateEl.value = date;
  if (nameEl) nameEl.value = name;

  const modal = document.getElementById("editEventModal");
  if (modal) modal.style.display = "flex";
}

function closeEventEditModal() {
  const modal = document.getElementById("editEventModal");
  if (modal) modal.style.display = "none";
}

async function saveEventEdit() {
  const id = document.getElementById("editEventId")?.value;
  const date = document.getElementById("editEventDate")?.value;
  const name = document.getElementById("editEventName")?.value.trim();

  if (!date || !name) return alert("❌ Please enter Date and Event Name");

  const { error } = await window.supabaseClient
    .from("events")
    .update({ 
      event_date: date,
      event_name: name 
    })
    .eq("id", id)
    .select();

  if (error) {
    alert("❌ Update failed: " + error.message);
    return;
  }

  closeEventEditModal();
  await loadEvents();
  await updateStats();
}

async function deleteEvent(id) {
  if (!confirm("Delete this event?")) return;
  const { error } = await window.supabaseClient.from("events").delete().eq("id", id);
  if (error) return alert("❌ Delete failed: " + error.message);
  await loadEvents();
  await updateStats();
}


/* =====================================================
   PART 4: FORMULAS SYSTEM & GLOBAL INIT
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const fType = document.getElementById("fType");
  const formulaText = document.getElementById("formulaText");
  const formulaFile = document.getElementById("formulaFile");
  const previewBox = document.getElementById("formulaPreview");
  const toolbar = document.getElementById("mathToolbar");

  fType?.addEventListener("change", () => {
    if (formulaText) formulaText.style.display = "none";
    if (formulaFile) formulaFile.style.display = "none";
    if (toolbar) toolbar.style.display = "none";

    if (fType.value === "text") {
      if (formulaText) formulaText.style.display = "block";
      if (toolbar) toolbar.style.display = "flex";
    } else if (fType.value === "pdf" || fType.value === "image") {
      if (formulaFile) formulaFile.style.display = "block";
    }
  });

  toolbar?.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      if (formulaText) {
        formulaText.value += btn.dataset.sym;
        if (previewBox) previewBox.innerText = formulaText.value.trim() || "Preview will appear here…";
      }
    });
  });

  formulaText?.addEventListener("input", () => {
    if (previewBox) previewBox.innerText = formulaText.value.trim() || "Preview will appear here…";
  });

  // Doubts Panel toggling & Floating Position Fix
  const doubtBtn = document.getElementById("doubtBtn");
  const doubtPanel = document.getElementById("doubtPanel");

  if (doubtBtn && doubtPanel) {
    doubtPanel.style.display = "none";
    
    doubtPanel.style.position = "fixed";
    doubtPanel.style.bottom = "80px";
    doubtPanel.style.right = "20px";
    doubtPanel.style.zIndex = "999999";
    doubtPanel.style.background = "#0f172a";
    doubtPanel.style.border = "1px solid rgba(255, 255, 255, 0.15)";
    doubtPanel.style.borderRadius = "12px";
    doubtPanel.style.padding = "12px";
    doubtPanel.style.width = "320px";
    doubtPanel.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.5)";

    doubtBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = doubtPanel.style.display === "block";
      doubtPanel.style.display = isVisible ? "none" : "block";
      if (!isVisible && typeof window.updateDoubtBadge === "function") {
        window.updateDoubtBadge();
      }
    });

    document.addEventListener("click", (e) => {
      if (!doubtPanel.contains(e.target) && !doubtBtn.contains(e.target)) {
        doubtPanel.style.display = "none";
      }
    });
  }

  // Filter Listeners
  document.getElementById("searchNotes")?.addEventListener("input", loadFiles);
  document.getElementById("filterNotesClass")?.addEventListener("change", loadFiles);
  document.getElementById("filterNotesSubject")?.addEventListener("change", loadFiles);

  document.getElementById("searchEvent")?.addEventListener("input", loadEvents);
  document.getElementById("filterEventMonth")?.addEventListener("change", loadEvents);
  document.getElementById("filterEventYear")?.addEventListener("change", loadEvents);
  document.getElementById("filterEventType")?.addEventListener("change", loadEvents);

  document.getElementById("searchFormula")?.addEventListener("input", loadFormulas);
  document.getElementById("filterFClass")?.addEventListener("change", loadFormulas);
  document.getElementById("filterFSubject")?.addEventListener("change", loadFormulas);
  document.getElementById("filterFCategory")?.addEventListener("change", loadFormulas);

  // Initial Loaders
  loadFiles();
  loadEvents();
  loadFormulas();
  updateStats();
  if (typeof window.updateDoubtBadge === "function") window.updateDoubtBadge();
  if (typeof window.updateOrdersBadge === "function") window.updateOrdersBadge();

  // Periodic Checks
  setInterval(() => { if (typeof window.updateDoubtBadge === "function") window.updateDoubtBadge(); }, 5000);
  setInterval(() => { if (typeof window.updateOrdersBadge === "function") window.updateOrdersBadge(); }, 5000);
});

window.uploadFormula = async function () {
  const fClass = document.getElementById("fClass");
  const fSubject = document.getElementById("fSubject");
  const fChapter = document.getElementById("fChapter");
  const fChapterName = document.getElementById("fChapterNameInput");
  const fType = document.getElementById("fType");
  const fCategory = document.getElementById("fCategory");

  const formulaText = document.getElementById("formulaText");
  const formulaFile = document.getElementById("formulaFile");
  const statusBox = document.getElementById("uploadStatus");
  const publishCheck = document.getElementById("publishCheck");

  if (statusBox) statusBox.innerText = "⏳ Uploading...";

  if (!fClass?.value || !fSubject?.value || !fChapter?.value || !fChapterName?.value.trim() || !fType?.value || !fCategory?.value) {
    if (statusBox) statusBox.innerText = "❌ All fields required";
    return;
  }

  const { data: userData } = await window.supabaseClient.auth.getUser();
  if (!userData?.user) return alert("❌ Login required");

  let formulaTextData = null;
  let filePath = null;

  const chapterNum = parseInt(fChapter.value.replace("ch", "")) || 1;

  if (fType.value === "text") {
    if (!formulaText?.value.trim()) return alert("❌ Enter Formula Text");
    formulaTextData = formulaText.value.trim();
  } else {
    const file = formulaFile?.files[0];
    if (!file) return alert("❌ Select File");

    const cleanFileName = file.name.replace(/\s+/g, "_");
    filePath = `formulas/${fClass.value}_${fSubject.value}_ch${chapterNum}_${cleanFileName}`;

    const { error } = await window.supabaseClient.storage
      .from("admin-files")
      .upload(filePath, file, { upsert: true });

    if (error) {
      if (statusBox) statusBox.innerText = "❌ Upload failed";
      return;
    }
  }

  const { error } = await window.supabaseClient.from("formulas").insert([{
    user_id: userData.user.id,
    class: fClass.value,
    subject: fSubject.value,
    chapter: fChapter.value,
    chapter_name: fChapterName.value.trim(),
    type: fType.value,
    category: fCategory.value,
    formula_text: formulaTextData,
    file_path: filePath,
    publish: publishCheck ? publishCheck.checked : true
  }]);

  if (error) {
    if (statusBox) statusBox.innerText = "❌ DB Error: " + error.message;
    return;
  }

  if (statusBox) statusBox.innerText = "✅ Formula uploaded successfully!";
  if (formulaText) formulaText.value = "";
  if (formulaFile) formulaFile.value = "";
  if (fChapterName) fChapterName.value = "";
  
  await loadFormulas();
  await updateStats();
};

async function loadFormulas() {
  const list = document.getElementById("formulaList");
  if (!list) return;

  list.innerHTML = "<em style='color:#b9c9e0; font-size:13px;'>⏳ Loading...</em>";

  let query = window.supabaseClient
    .from("formulas")
    .select("*")
    .order("created_at", { ascending: false });

  const fClassVal = document.getElementById("filterFClass")?.value;
  const fSubVal = document.getElementById("filterFSubject")?.value;
  const fCatVal = document.getElementById("filterFCategory")?.value;
  const search = document.getElementById("searchFormula")?.value.toLowerCase().trim() || "";

  if (fClassVal) query = query.eq("class", fClassVal);
  if (fSubVal) query = query.eq("subject", fSubVal);
  if (fCatVal) query = query.eq("category", fCatVal);

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    list.innerHTML = "<em style='color:#b9c9e0; font-size:13px;'>No formulas found</em>";
    updateStats();
    return;
  }

  const filtered = data.filter(f => {
    const text = (f.formula_text || "").toLowerCase();
    const chName = (f.chapter_name || "").toLowerCase();
    const ch = (f.chapter || "").toLowerCase();
    return text.includes(search) || chName.includes(search) || ch.includes(search);
  });

  if (filtered.length === 0) {
    list.innerHTML = "<em style='color:#b9c9e0; font-size:13px;'>No formulas found</em>";
    updateStats();
    return;
  }

  list.innerHTML = "";
  filtered.forEach(f => {
    const row = document.createElement("div");
    row.className = "note-list-card";
    
    const subShort = (f.subject || "").substring(0, 3).toUpperCase();
    const chNum = f.chapter ? f.chapter.replace("ch", "") : "1";
    const displayChName = f.chapter_name || f.chapter || "";
    const escapedChName = escapeQuotes(displayChName);

    let catCode = "s";
    if (f.category === "mind_map") catCode = "m";
    else if (f.category === "other") catCode = "o";

    let typeIcon = "📄";
    if (f.type === "image") typeIcon = "🖼️";
    if (f.type === "text") typeIcon = "📝";

    row.innerHTML = `
      <div class="note-info-text">
        ${typeIcon} Class ${f.class} • ${subShort} • Ch ${chNum} • ${displayChName} (${catCode})
      </div>

      <div class="note-action-buttons">
        <button class="btn-view-note" onclick="viewFormula('${f.id}')" title="View">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="btn-edit-note" onclick="openFormulaEditModal('${f.id}', '${f.class}', '${f.subject}', '${chNum}', '${escapedChName}', '${f.category || "other"}')" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        </button>
        <button class="btn-delete-note" onclick="deleteFormula('${f.id}','${f.file_path || ""}')" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    `;
    list.appendChild(row);
  });

  updateStats();
}

window.viewFormula = async function (id) {
  const { data } = await window.supabaseClient.from("formulas").select("*").eq("id", id).single();
  if (!data) return;

  if (data.type === "text") {
    alert("Formula Text:\n\n" + data.formula_text);
  } else {
    const className = data.class ? `Class ${data.class}` : "";
    const subjectName = data.subject ? data.subject.toUpperCase() : "";
    const chapterInfo = data.chapter_name ? data.chapter_name : (data.chapter || "");
    const descriptiveName = [className, subjectName, chapterInfo].filter(Boolean).join(" • ") || "Formula Document";

    const targetViewer = data.type === "image" ? "image-viewer.html" : "notes-viewer.html";
    
    window.location.href = `${targetViewer}?path=${encodeURIComponent(data.file_path)}&name=${encodeURIComponent(descriptiveName)}`;
  }
};

window.openFormulaEditModal = function(id, cls, sub, chNum, chName, category) {
  const idEl = document.getElementById("editFormulaId");
  const clsEl = document.getElementById("editFormulaClass");
  const subEl = document.getElementById("editFormulaSubject");
  const chNumEl = document.getElementById("editFormulaChNum");
  const chNameEl = document.getElementById("editFormulaChName");
  const catEl = document.getElementById("editFormulaCategory");

  if (idEl) idEl.value = id;
  if (clsEl) clsEl.value = cls;
  if (subEl) subEl.value = sub;
  if (chNumEl) chNumEl.value = chNum;
  if (chNameEl) chNameEl.value = chName;
  if (catEl) catEl.value = category;
  
  const viewBtn = document.getElementById("editFormulaViewBtn");
  if (viewBtn) {
    viewBtn.onclick = () => window.viewFormula(id);
  }

  const modal = document.getElementById("editFormulaModal");
  if (modal) modal.style.display = "flex";
};

window.closeFormulaEditModal = function() {
  const modal = document.getElementById("editFormulaModal");
  if (modal) modal.style.display = "none";
};

window.saveFormulaEdit = async function() {
  const id = document.getElementById("editFormulaId")?.value;
  const cls = document.getElementById("editFormulaClass")?.value;
  const sub = document.getElementById("editFormulaSubject")?.value;
  const chNum = parseInt(document.getElementById("editFormulaChNum")?.value) || 1;
  const chName = document.getElementById("editFormulaChName")?.value.trim();
  const category = document.getElementById("editFormulaCategory")?.value;

  if (!chName) return alert("❌ Please enter chapter name");

  const { error } = await window.supabaseClient
    .from("formulas")
    .update({ 
      class: cls,
      subject: sub,
      chapter: `ch${chNum}`,
      chapter_name: chName,
      category: category
    })
    .eq("id", id)
    .select();

  if (error) {
    alert("❌ Update failed: " + error.message);
    return;
  }

  closeFormulaEditModal();
  await loadFormulas();
  await updateStats();
};

window.deleteFormula = async function (id, filePath) {
  if (!confirm("Delete this formula?")) return;
  
  if (filePath && !filePath.startsWith("http")) {
    await window.supabaseClient.storage.from("admin-files").remove([filePath]);
  }
  
  const { error } = await window.supabaseClient.from("formulas").delete().eq("id", id);
  if (error) {
    alert("❌ Delete failed: " + error.message);
    return;
  }

  await loadFormulas();
  await updateStats();
};


/* =====================================================
   PART 5: DOUBTS & OVERLAY SYSTEM (MINI PANEL + EMAIL + THUMBNAIL + HOME OVERLAY)
   ===================================================== */

window.updateDoubtBadge = async function() {
  const badge = document.getElementById("pendingCount");
  const miniPanel = document.getElementById("doubtPanel");

  try {
    const { data, error } = await window.supabaseClient
      .from("doubts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Doubt Load Error:", error.message || error);
      if (miniPanel) miniPanel.innerHTML = "<div style='color:#ff4b4b; padding:10px; font-size:12px;'>Error loading doubts</div>";
      return;
    }

    const pendingItems = (data || []).filter(d => {
      const statusLower = (d.status || "pending").toLowerCase();
      return statusLower !== "solved" && statusLower !== "resolved";
    });

    if (badge) {
      badge.textContent = pendingItems.length;
      badge.style.display = pendingItems.length > 0 ? "inline-flex" : "none";
    }

    if (miniPanel) {
      let itemsHtml = "";
      
      if (!data || data.length === 0) {
        itemsHtml = "<div style='color:#b9c9e0; padding:8px; font-size:12px; text-align:center;'>No doubts yet</div>";
      } else {
        const recentThree = data.slice(0, 3);
        recentThree.forEach(d => {
          const statusLower = (d.status || "pending").toLowerCase();
          const isSolved = statusLower === "solved" || statusLower === "resolved";
          
          const userEmail = d.user_email || "No Email";
          const userName = d.user_name || userEmail.split('@')[0];
          const userInitial = userName.charAt(0).toUpperCase();

          // User Profile Photo / Letter Icon
          const userPhotoHtml = d.user_photo 
            ? `<img src="${d.user_photo}" style="width:26px; height:26px; border-radius:50%; object-fit:cover; margin-right:6px; flex-shrink:0;">` 
            : `<div style="width:26px; height:26px; border-radius:50%; background:#0072ff; color:#fff; display:inline-flex; align-items:center; justify-content:center; margin-right:6px; font-size:10px; font-weight:bold; flex-shrink:0;">${userInitial}</div>`;

          // Doubt Image Thumbnail
          const doubtImgHtml = d.image_url 
            ? `<img src="${d.image_url}" alt="Thumbnail" style="width:36px; height:36px; border-radius:4px; object-fit:cover; margin-left:6px; border:1px solid #38bdf8; flex-shrink:0;">`
            : ``;

          const textContent = d.question || d.feedback || (d.image_url ? "📷 Image doubt" : "No content");
          const shortText = textContent.length > 18 ? textContent.substring(0, 18) + "..." : textContent;

          itemsHtml += `
            <div onclick="openDoubtOverlay('${d.id}')" style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #fff; display:flex; justify-content:space-between; align-items:center; gap:6px; cursor:pointer; transition: background 0.2s; border-radius:6px;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
              <div style="display:flex; align-items:center; flex:1; overflow:hidden;">
                ${userPhotoHtml}
                <div style="flex:1; overflow:hidden;">
                  <div style="font-size:11px; font-weight:bold; color:#ffffff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${userName} <span style="font-size:10px; color:#94a3b8; font-weight:normal;">(${userEmail})</span>
                  </div>
                  <div style="font-size:11px; color:#cbd5e1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${textContent}">
                    💬 ${shortText}
                  </div>
                </div>
              </div>
              ${doubtImgHtml}
            </div>
          `;
        });
      }

      // Mini Panel Header & Footer
      miniPanel.innerHTML = `
        <div style="font-weight:bold; font-size:13px; color:#38bdf8; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px;">
          <span>Recent Doubts</span>
          <span style="font-size:11px; color:#ffc107;">(${pendingItems.length} pending)</span>
        </div>
        <div id="doubtList">${itemsHtml}</div>
        <div style="display:flex; gap:6px; margin-top:10px;">
          <button onclick="openDoubtOverlay()" style="flex:1; background:#0072ff; color:#fff; border:none; padding:6px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer;">
            Open in Home Panel
          </button>
          <button onclick="toggleDoubtFullScreen()" style="background:#1e293b; color:#38bdf8; border:1px solid #38bdf8; padding:6px 10px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer;" title="Full Screen Overlay">
            ⛶ Full Screen
          </button>
        </div>
      `;
    }

  } catch (err) {
    console.error("❌ Exception in updateDoubtBadge:", err);
  }
};

window.filterDoubts = function() {
  openDoubtOverlay();
};

window.openDoubtOverlay = async function(targetDoubtId = null) {
  const overlay = document.getElementById("doubtOverlay");
  const overlayList = document.getElementById("doubtOverlayList");
  const filterSelect = document.getElementById("doubtFilter");

  if (!overlay || !overlayList) return;
  
  // Close mini panel after click
  const miniPanel = document.getElementById("doubtPanel");
  if (miniPanel) miniPanel.style.display = "none";

  overlay.style.display = "flex";
  overlayList.innerHTML = "<div style='color:#b9c9e0; text-align:center; padding:20px;'>⏳ Loading doubts & feedbacks...</div>";

  const { data, error } = await window.supabaseClient
    .from("doubts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Doubt Overlay Load Error:", error.message || error);
    overlayList.innerHTML = "<div style='color:#ff4b4b; text-align:center; padding:20px;'>❌ Failed to load doubts</div>";
    return;
  }

  if (!data || data.length === 0) {
    overlayList.innerHTML = "<div style='color:#b9c9e0; text-align:center; padding:20px;'>✨ No entries found</div>";
    return;
  }

  const selectedFilter = filterSelect?.value || "all";
  let filteredData = data.filter(d => {
    const statusLower = (d.status || "pending").toLowerCase();
    const isSolved = statusLower === "solved" || statusLower === "resolved";
    
    if (selectedFilter === "pending") return !isSolved;
    if (selectedFilter === "solved") return isSolved;
    return true;
  });

  if (targetDoubtId) {
    filteredData = filteredData.filter(d => String(d.id) === String(targetDoubtId));
  }

  if (filteredData.length === 0) {
    overlayList.innerHTML = `<div style='color:#b9c9e0; text-align:center; padding:20px;'>✨ No entries found</div>`;
    return;
  }

  overlayList.innerHTML = "";
  filteredData.forEach(d => {
    const card = document.createElement("div");
    card.className = "doubt-card";
    card.id = `doubt_card_${d.id}`;
    
    const statusLower = (d.status || "pending").toLowerCase();
    const isSolved = statusLower === "solved" || statusLower === "resolved";
    
    const userName = d.user_name || (d.user_email ? d.user_email.split('@')[0] : "Student");
    const userEmail = d.user_email || "No Email";
    const userInitial = userName.charAt(0).toUpperCase();

    const userAvatarHtml = d.user_photo 
      ? `<img src="${d.user_photo}" class="doubt-user-avatar" style="flex-shrink:0;">`
      : `<div style="width:28px; height:28px; border-radius:50%; background:#0072ff; color:#fff; display:inline-flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; flex-shrink:0;">${userInitial}</div>`;

    card.innerHTML = `
      <div class="doubt-card-top" style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; width:100%;">
        <div class="doubt-student-name" style="display:flex; align-items:center; gap:6px; flex:1; min-width:0; flex-wrap:wrap;">
          ${userAvatarHtml}
          <span style="font-weight:bold; color:#ffffff; word-break:break-word;">${userName}</span>
          <small style="color:#b9c9e0; font-weight:400; word-break:break-all;">(${userEmail})</small>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="doubt-status-tag ${isSolved ? "resolved" : "pending"}" style="flex-shrink:0;">
            ${isSolved ? "✓ SOLVED" : "⏳ PENDING"}
          </span>
          <button onclick="toggleCardFullScreen('${d.id}')" style="background:transparent; border:none; color:#38bdf8; cursor:pointer;" title="Toggle Focus Mode">⛶</button>
        </div>
      </div>
      
      <div class="doubt-text" style="word-break:break-word; margin-top:8px;">
        <strong style="color: #ff4b4b;">❓ Question/Feedback:</strong> ${d.question || d.feedback || "No content"}
      </div>

      ${d.image_url ? `<img src="${d.image_url}" style="max-width:100%; max-height:200px; border-radius:8px; object-fit:contain; margin:8px 0; border:1px solid rgba(255,255,255,0.1);">` : ""}

      <input type="text" id="greet_${d.id}" placeholder="Greeting Message (e.g. Hi Rahul,)" value="${d.greeting || ""}">
      <textarea id="ans_${d.id}" placeholder="Type solution/reply here...">${d.answer || d.solution || ""}</textarea>

      <div class="doubt-card-actions">
        <button class="btn-save-resolve" onclick="publishAnswer('${d.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/></svg> Save & Resolve
        </button>
        <button class="btn-delete-doubt" onclick="deleteDoubt('${d.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg> Delete
        </button>
      </div>
    `;
    overlayList.appendChild(card);
  });
};

window.toggleDoubtFullScreen = function() {
  const overlay = document.getElementById("doubtOverlay");
  if (!overlay) return;

  if (overlay.style.position === "fixed" && overlay.style.top === "0px") {
    overlay.style.position = "";
    overlay.style.top = "";
    overlay.style.left = "";
    overlay.style.width = "";
    overlay.style.height = "";
    overlay.style.zIndex = "";
  } else {
    openDoubtOverlay();
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.zIndex = "999999";
    overlay.style.background = "#0b1329";
  }
};

window.toggleCardFullScreen = function(id) {
  const card = document.getElementById(`doubt_card_${id}`);
  if (!card) return;

  if (card.style.position === "fixed") {
    card.style.position = "";
    card.style.top = "";
    card.style.left = "";
    card.style.width = "";
    card.style.height = "";
    card.style.zIndex = "";
  } else {
    card.style.position = "fixed";
    card.style.top = "5%";
    card.style.left = "5%";
    card.style.width = "90vw";
    card.style.height = "90vh";
    card.style.zIndex = "1000000";
    card.style.overflowY = "auto";
  }
};

window.closeDoubtOverlay = function() {
  const overlay = document.getElementById("doubtOverlay");
  if (overlay) overlay.style.display = "none";
};

window.publishAnswer = async function(id) {
  const greetVal = document.getElementById(`greet_${id}`)?.value.trim() || "";
  const ansVal = document.getElementById(`ans_${id}`)?.value.trim() || "";

  if (!ansVal) return alert("❌ Please enter an answer!");

  const { error } = await window.supabaseClient
    .from("doubts")
    .update({
      greeting: greetVal,
      answer: ansVal,
      solution: ansVal,
      status: "solved"
    })
    .eq("id", id);

  if (error) {
    console.error("❌ Error publishing answer:", error.message || error);
    alert("❌ Error saving answer: " + error.message);
    return;
  }

  window.updateDoubtBadge();
  openDoubtOverlay();
};

window.deleteDoubt = async function(id) {
  if (!confirm("Are you sure you want to delete this entry?")) return;

  const { error } = await window.supabaseClient.from("doubts").delete().eq("id", id);
  if (error) {
    console.error("❌ Delete Error:", error.message || error);
    alert("❌ Delete failed: " + error.message);
    return;
  }

  window.updateDoubtBadge();
  openDoubtOverlay();
};


/* =====================================================
   PART 6: ORDERS SYSTEM & UTILS (SAFE SUPABASE FETCH WITH MULTI-TABLE FALLBACK)
   ===================================================== */

window.updateOrdersBadge = async function() {
  const badge = document.getElementById("pendingOrdersCount");
  if (!badge) return;

  try {
    let res = await window.supabaseClient.from("user_orders").select("status");

    if (res.error) {
      res = await window.supabaseClient.from("orders").select("status");
    }

    if (res.error) {
      res = await window.supabaseClient.from("payments").select("status");
    }

    if (res.error) {
      console.warn("⚠️ Orders Badge Fetch Notice:", res.error.message || "Permission restricted");
      badge.textContent = "0";
      badge.style.display = "none";
      return;
    }

    const data = res.data || [];
    const pendingOrders = data.filter(o => {
      const st = (o.status || "pending").toLowerCase();
      return st === "pending" || st === "processing" || st === "unapproved";
    });

    badge.textContent = pendingOrders.length;
    badge.style.display = pendingOrders.length > 0 ? "inline-flex" : "none";
  } catch (err) {
    console.error("❌ Exception updating orders badge:", err);
  }
};

/* ---------- HELPER FUNCTIONS ---------- */

function escapeQuotes(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;")
    .replace(/\r?\n|\r/g, " ");
}
