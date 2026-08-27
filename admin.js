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
      .select("*", { count: "exact", head: true });
    const notesEl = document.getElementById("totalNotesCount");
    if (notesEl) notesEl.innerText = notesCount || 0;

    const { count: formulasCount } = await window.supabaseClient
      .from("formulas")
      .select("*", { count: "exact", head: true });
    const formulasEl = document.getElementById("totalFormulasCount");
    if (formulasEl) formulasEl.innerText = formulasCount || 0;

    const { count: eventsCount } = await window.supabaseClient
      .from("events")
      .select("*", { count: "exact", head: true });
    const eventsEl = document.getElementById("totalEventsCount");
    if (eventsEl) eventsEl.innerText = eventsCount || 0;
  } catch (err) {
    console.error("Stats update failed:", err);
  }
}


/* =====================================================
   PART 2: UPLOADED NOTES SYSTEM
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

  list.innerHTML = "⏳ Loading notes...";

  const { data, error } = await window.supabaseClient
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false })
    .order("class", { ascending: true })
    .order("subject", { ascending: true })
    .order("chapter_number", { ascending: true });

  if (error || !data || data.length === 0) {
    list.innerHTML = "<em>No files found</em>";
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
    list.innerHTML = "<em>No matching notes found</em>";
    updateStats();
    return;
  }

  list.innerHTML = "";
  filtered.forEach(note => {
    const row = document.createElement("div");
    row.style.cssText = "padding:10px; margin-bottom:10px; background:rgba(255, 255, 255, 0.04); border:1px solid #2e4a73; border-radius:10px; width:100%; box-sizing:border-box;";
    
    const subShort = (note.subject || "").substring(0, 3).toUpperCase();

    row.innerHTML = `
      <div style="font-size:13px; color:#ffffff; font-weight:600; margin-bottom:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%;">
        ${note.class} • ${subShort} • ${note.chapter_number} • ${note.chapter_name || "No Name"}
      </div>
      
      <div style="display:flex; gap:6px; align-items:center; width:100%;">
        <button style="flex:1; padding:4px 0; font-size:13px; border-radius:6px; border:none; background:#3b82f6; color:#ffffff; cursor:pointer;" onclick="openFile('${note.file_path}', '${note.class}', '${note.subject}', '${escapeQuotes(note.chapter_name || "")}')" title="View">👁️</button>
        <button style="flex:1; padding:4px 0; font-size:13px; border-radius:6px; border:none; background:#f59e0b; color:#ffffff; cursor:pointer;" onclick="openNoteEditModal('${note.id}', '${note.class}', '${note.subject}', '${note.chapter_number}', '${escapeQuotes(note.chapter_name || "")}', '${note.file_path}')" title="Edit">🖋️</button>
        <button style="flex:1; padding:4px 0; font-size:13px; border-radius:6px; border:none; background:#ef4444; color:#ffffff; cursor:pointer;" onclick="deleteNoteRecord('${note.id}', '${note.file_path}')" title="Delete">🗑️</button>
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

  // Pehle modal band aur instant UI reload execute karo
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

  list.innerHTML = "⏳ Loading events...";

  // Sort directly by event_date
  const { data, error } = await window.supabaseClient
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Events Load Error:", error);
    list.innerHTML = "<em>Error loading events</em>";
    updateStats();
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<em>No events found</em>";
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
    list.innerHTML = "<em>No matching events found</em>";
    updateStats();
    return;
  }

  list.innerHTML = "";
  filtered.forEach(ev => {
    const row = document.createElement("div");
    row.style.cssText = "padding:10px; margin-bottom:10px; background:rgba(255, 255, 255, 0.04); border:1px solid #2e4a73; border-radius:10px; width:100%; box-sizing:border-box;";

    row.innerHTML = `
      <div style="font-size:13px; color:#ffffff; font-weight:600; margin-bottom:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%;">
        📅 ${ev.event_date} • ${ev.event_name}
      </div>

      <div style="display:flex; gap:6px; align-items:center; width:100%;">
        <button style="flex:1; padding:4px 0; font-size:13px; border-radius:6px; border:none; background:#f59e0b; color:#ffffff; cursor:pointer;" onclick="openEventEditModal('${ev.id}', '${ev.event_date}', '${escapeQuotes(ev.event_name)}')" title="Edit">✏️ Edit</button>
        <button style="flex:1; padding:4px 0; font-size:13px; border-radius:6px; border:none; background:#ef4444; color:#ffffff; cursor:pointer;" onclick="deleteEvent('${ev.id}')" title="Delete">🗑️ Delete</button>
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
  const name = document.getElementById("editEventName")?.value.trim() || document.getElementById("eventName")?.value;

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

  // Instant UI Reloading (Modal closure pehle)
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
   PART 4: FORMULAS SYSTEM
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const fClass       = document.getElementById("fClass");
  const fSubject     = document.getElementById("fSubject");
  const fChapter     = document.getElementById("fChapter");
  const fChapterName = document.getElementById("fChapterNameInput");
  const fType        = document.getElementById("fType");
  const fCategory    = document.getElementById("fCategory");

  const formulaText  = document.getElementById("formulaText");
  const formulaFile  = document.getElementById("formulaFile");
  const previewBox   = document.getElementById("formulaPreview");
  const statusBox    = document.getElementById("uploadStatus");
  const toolbar      = document.getElementById("mathToolbar");
  const publishCheck = document.getElementById("publishCheck");

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

  window.uploadFormula = async function () {
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

    list.innerHTML = "⏳ Loading...";

    let query = window.supabaseClient
      .from("formulas")
      .select("*")
      .order("created_at", { ascending: false });

    const fClassVal  = document.getElementById("filterFClass")?.value;
    const fSubVal    = document.getElementById("filterFSubject")?.value;
    const fCatVal    = document.getElementById("filterFCategory")?.value;
    const search     = document.getElementById("searchFormula")?.value.toLowerCase().trim() || "";

    if (fClassVal) query = query.eq("class", fClassVal);
    if (fSubVal) query = query.eq("subject", fSubVal);
    if (fCatVal) query = query.eq("category", fCatVal);

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      list.innerHTML = "<em>No formulas found</em>";
      updateStats();
      return;
    }

    const filtered = data.filter(f => {
      const text = (f.formula_text || "").toLowerCase();
      const chName = (f.chapter_name || "").toLowerCase();
      const ch   = (f.chapter || "").toLowerCase();
      return text.includes(search) || chName.includes(search) || ch.includes(search);
    });

    if (filtered.length === 0) {
      list.innerHTML = "<em>No formulas found</em>";
      updateStats();
      return;
    }
    list.innerHTML = "";
    filtered.forEach(f => {
      const row = document.createElement("div");
      row.style.cssText = "padding:10px; margin-bottom:10px; background:rgba(255, 255, 255, 0.04); border:1px solid #2e4a73; border-radius:10px; width:100%; box-sizing:border-box;";
      
      const subShort = (f.subject || "").substring(0, 3).toUpperCase();
      const chNum = f.chapter ? f.chapter.replace("ch", "") : "1";
      const displayChName = f.chapter_name || f.chapter || "";
      
      let catCode = "s";
      if (f.category === "mind_map") catCode = "m";
      else if (f.category === "other") catCode = "o";

      let typeIcon = "📄";
      if (f.type === "image") typeIcon = "🖼️";
      if (f.type === "text") typeIcon = "📝";

      row.innerHTML = `
        <div style="font-size:13px; color:#ffffff; font-weight:600; margin-bottom:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%;">
          ${typeIcon} ${f.class} • ${subShort} • ${chNum} • ${displayChName} (${catCode})
        </div>

        <div style="display:flex; gap:6px; align-items:center; width:100%;">
          <button style="flex:1; padding:4px 0; font-size:13px; border-radius:6px; border:none; background:#3b82f6; color:#ffffff; cursor:pointer;" onclick="viewFormula('${f.id}')" title="View">👁️</button>
          <button style="flex:1; padding:4px 0; font-size:13px; border-radius:6px; border:none; background:#f59e0b; color:#ffffff; cursor:pointer;" onclick="openFormulaEditModal('${f.id}', '${f.class}', '${f.subject}', '${chNum}', '${escapeQuotes(f.chapter_name || "")}', '${f.category || "other"}')" title="Edit">🖋️</button>
          <button style="flex:1; padding:4px 0; font-size:13px; border-radius:6px; border:none; background:#ef4444; color:#ffffff; cursor:pointer;" onclick="deleteFormula('${f.id}','${f.file_path || ""}')" title="Delete">🗑️</button>
        </div>
      `;
      list.appendChild(row);
    });

    updateStats();
  };

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

    // Modal pehle band hoga fir non-blocking UI loading chalegi
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

  // Event Listeners for Filters
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

  loadFiles();
  loadEvents();
  loadFormulas();
  updateStats();
});


/* =====================================================
   PART 5: DOUBTS & OVERLAY SYSTEM (DIRECT USER_PHOTO FIX)
   ===================================================== */

async function updateDoubtBadge() {
  const badge = document.getElementById("pendingCount");
  if (!badge) return;

  try {
    const { count, error } = await window.supabaseClient
      .from("doubts")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    if (!error && count !== null) {
      badge.innerText = count;
      badge.style.display = count > 0 ? "inline-block" : "none";
    }
  } catch (err) {
    console.error("Error updating doubt badge:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateDoubtBadge();
  setInterval(updateDoubtBadge, 5000);

  const doubtBtn   = document.getElementById("doubtBtn");
  const doubtPanel = document.getElementById("doubtPanel");
  const doubtList  = document.getElementById("doubtList");
  const badge      = document.getElementById("pendingCount");

  if (doubtBtn && doubtPanel) {
    doubtPanel.style.display = "none";

    doubtBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      doubtPanel.style.display = doubtPanel.style.display === "block" ? "none" : "block";
      loadMiniDoubts();
    });

    document.addEventListener("click", (e) => {
      if (!doubtPanel.contains(e.target) && !doubtBtn.contains(e.target)) {
        doubtPanel.style.display = "none";
      }
    });
  }

  async function loadMiniDoubts() {
    if (!doubtList) return;
    doubtList.innerHTML = "⏳ Loading...";

    const { data, error } = await window.supabaseClient
      .from("doubts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      doubtList.innerHTML = "❌ Error loading";
      return;
    }

    const pending = data.filter(d => d.status !== "solved").length;
    if (badge) {
      badge.innerText = pending;
      badge.style.display = pending > 0 ? "inline-flex" : "none";
    }

    doubtList.innerHTML = "";
    data.slice(0, 5).forEach(d => {
      const userName = d.user_name || (d.user_email ? d.user_email.split('@')[0] : "Student");
      const userInitial = userName.charAt(0).toUpperCase();

      const userPhotoHtml = d.user_photo 
        ? `<img src="${d.user_photo}" style="width:26px; height:26px; border-radius:50%; object-fit:cover; margin-right:6px;">` 
        : `<div style="width:26px; height:26px; border-radius:50%; background:#1f3554; color:#fff; display:inline-flex; align-items:center; justify-content:center; margin-right:6px; font-size:11px; font-weight:bold;">${userInitial}</div>`;

      doubtList.innerHTML += `
        <div style="padding:8px; border-bottom:1px solid #2f4d77; font-size:13px; display:flex; align-items:flex-start;">
          <div>${userPhotoHtml}</div>
          <div style="flex:1; overflow:hidden;">
            <div style="font-weight:bold; color:#3aa0ff; font-size:12px;">${userName}</div>
            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#cbd5e1;">${d.question || "Image doubt"}</div>
          </div>
        </div>
      `;
    });
  }
});

window.openDoubtOverlay = async function() {
  const overlay = document.getElementById("doubtOverlay");
  const overlayList = document.getElementById("doubtOverlayList");

  if (!overlay || !overlayList) return;
  overlay.style.display = "flex";
  overlayList.innerHTML = "⏳ Loading all doubts...";

  const { data, error } = await window.supabaseClient
    .from("doubts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    overlayList.innerHTML = "<em>No doubts found</em>";
    return;
  }

  overlayList.innerHTML = "";
  data.forEach(d => {
    const card = document.createElement("div");
    card.className = "admin-doubt-card";
    
    const isSolved = d.status === "solved";

    const userName = d.user_name || (d.user_email ? d.user_email.split('@')[0] : "Student");
    const userEmail = d.user_email || "";
    const userInitial = userName.charAt(0).toUpperCase();

    const userAvatarHtml = d.user_photo 
      ? `<img src="${d.user_photo}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">`
      : `<div style="width:36px; height:36px; border-radius:50%; background:#5a2eff; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px;">${userInitial}</div>`;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          ${userAvatarHtml}
          <div>
            <div style="font-weight:bold; font-size:14px; color:#fff;">${userName}</div>
            ${userEmail ? `<div style="font-size:11px; color:#94a3b8;">${userEmail}</div>` : ""}
          </div>
        </div>
        <span class="status ${isSolved ? "solved" : "pending"}">${isSolved ? "✅ Solved" : "⏳ Pending"}</span>
      </div>
      
      <p style="margin-top:8px;"><b>❓ Question:</b> ${d.question || "No text content"}</p>
      ${d.image_url ? `<img src="${d.image_url}" style="max-width:100%; max-height:200px; border-radius:8px; margin-top:8px; margin-bottom:8px;">` : ""}

      <input type="text" id="greet_${d.id}" placeholder="Greeting Message (e.g. Hi Rahul,)" value="${d.greeting || ""}">
      <textarea id="ans_${d.id}" placeholder="Type solution/answer here...">${d.answer || ""}</textarea>

      <div class="admin-actions">
        <button class="publish" onclick="publishAnswer('${d.id}')">💾 Save & Resolve</button>
        <button class="delete" onclick="deleteDoubt('${d.id}')">🗑️ Delete</button>
      </div>
    `;
    overlayList.appendChild(card);
  });
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
      status: "solved"
    })
    .eq("id", id);

  if (error) {
    alert("❌ Error saving answer: " + error.message);
    return;
  }

  openDoubtOverlay();
};

window.deleteDoubt = async function(id) {
  if (!confirm("Are you sure you want to delete this doubt?")) return;

  const { error } = await window.supabaseClient.from("doubts").delete().eq("id", id);
  if (error) {
    alert("❌ Delete failed: " + error.message);
    return;
  }

  openDoubtOverlay();
};
/* =====================================================
   PART 6: ORDERS SYSTEM & UTILS (FINAL FIX FOR BADGE COUNT)
   ===================================================== */

async function updateOrdersBadge() {
  const badge = document.getElementById("pendingOrdersCount");
  if (!badge) return;

  try {
    // Check pending orders from user_orders or orders table
    let count = 0;
    
    // Query 1: Check 'user_orders' table (used in premium notes)
    const { data: userOrders, error: err1 } = await window.supabaseClient
      .from("user_orders")
      .select("id")
      .eq("status", "pending");

    if (!err1 && userOrders) {
      count += userOrders.length;
    } else {
      // Query 2: Fallback to 'orders' table
      const { data: mainOrders, error: err2 } = await window.supabaseClient
        .from("orders")
        .select("id")
        .eq("status", "pending");

      if (!err2 && mainOrders) {
        count += mainOrders.length;
      }
    }

    // Set count text and display badge
    badge.innerText = count;
    if (count > 0) {
      badge.style.display = "flex";
      badge.style.alignItems = "center";
      badge.style.justifyContent = "center";
    } else {
      badge.style.display = "none";
    }

  } catch (err) {
    console.error("Error updating orders badge:", err);
  }
}

// Automatic Run on Load & Polling
document.addEventListener("DOMContentLoaded", () => {
  updateOrdersBadge();
  setInterval(updateOrdersBadge, 3000);
});


/* ---------- HELPER FUNCTIONS ---------- */

function escapeQuotes(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;");
}
