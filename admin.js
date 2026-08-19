/* =====================================================
   ADMIN PANEL — COMPLETE & FULLY REPLACEABLE JS SYSTEM (WITH PROPER VIEWER TITLES)
   ===================================================== */

/* ---------- PART 1: AUTH HELPERS & GLOBAL STATS ---------- */
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
    const { count: notesCount } = await window.supabaseClient.from("notes").select("*", { count: 'exact', head: true });
    const notesEl = document.getElementById("totalNotesCount");
    if (notesEl) notesEl.innerText = notesCount || 0;

    const { count: formulasCount } = await window.supabaseClient.from("formulas").select("*", { count: 'exact', head: true });
    const formulasEl = document.getElementById("totalFormulasCount");
    if (formulasEl) formulasEl.innerText = formulasCount || 0;

    const { count: eventsCount } = await window.supabaseClient.from("events").select("*", { count: 'exact', head: true });
    const eventsEl = document.getElementById("totalEventsCount");
    if (eventsEl) eventsEl.innerText = eventsCount || 0;
  } catch (err) {
    console.error("Stats update failed:", err);
  }
}

/* ---------- PART 2: UPLOADED NOTES SYSTEM ---------- */
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
  
  const cleanFileName = file.name.replace(/\s+/g, '_');
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
    const searchStr = `${note.chapter_name || ''} ${note.subject || ''} class ${note.class || ''}`.toLowerCase();
    const matchSearch = searchStr.includes(search);
    const matchClass = filterCls ? String(note.class) === String(filterCls) : true;
    const matchSubject = filterSub ? (note.subject || '').toLowerCase() === filterSub.toLowerCase() : true;
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
    row.style.cssText = "padding:10px; border-bottom:1px solid #2e4a73; display:flex; justify-content:space-between; align-items:center;";
    row.innerHTML = `
      <span>📄 <b>Class ${note.class}</b> • ${(note.subject || '').toUpperCase()} • Ch ${note.chapter_number}: ${note.chapter_name || 'No Name'}</span>
      <div style="display:flex; gap:6px;">
        <button style="padding:6px 10px; font-size:12px;" onclick="openFile('${note.file_path}', '${note.class}', '${note.subject}', '${note.chapter_name}')">Open</button>
        <button style="padding:6px 10px; font-size:12px; background:#d97706; color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="updateNoteChapter('${note.id}', '${note.chapter_name || ''}')">✏️ Edit</button>
        <button class="logout" style="padding:6px 10px; font-size:12px;" onclick="deleteNoteRecord('${note.id}', '${note.file_path}')">🗑</button>
      </div>
    `;
    list.appendChild(row);
  });

  updateStats();
}

async function openFile(filePath, noteClass, noteSubject, noteChapterName) {
  const className = noteClass ? `Class ${noteClass}` : '';
  const subjectName = noteSubject ? noteSubject.toUpperCase() : '';
  const chapterInfo = noteChapterName ? noteChapterName : '';

  const descriptiveName = [className, subjectName, chapterInfo].filter(Boolean).join(' • ') || 'Notes Document';
  window.location.href = `notes-viewer.html?path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(descriptiveName)}`;
}

async function updateNoteChapter(id, currentName) {
  const newName = prompt("Naya Chapter Name enter karein:", currentName);
  if (!newName || newName.trim() === "") return;

  const { error } = await window.supabaseClient
    .from("notes")
    .update({ chapter_name: newName.trim() })
    .eq("id", id);

  if (error) {
    alert("❌ Update failed: " + error.message);
    return;
  }

  alert("✅ Chapter name updated successfully!");
  await loadFiles();
}

async function deleteNoteRecord(id, filePath) {
  if (!confirm("Kya aap is note ko database aur storage bucket dono se delete karna chahte hain?")) return;
  
  if (filePath) {
    await window.supabaseClient.storage.from("admin-files").remove([filePath]);
  }
  
  if (id) {
    await window.supabaseClient.from("notes").delete().eq("id", id);
  }

  await loadFiles();
  await updateStats();
}

/* ---------- PART 3: CALENDAR EVENTS SYSTEM ---------- */
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

  const { data, error } = await window.supabaseClient
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error || !data || !data.length) {
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
    list.innerHTML = "<em>No events found for selected filter</em>";
    updateStats();
    return;
  }

  list.innerHTML = "";
  filtered.forEach(ev => {
    const row = document.createElement("div");
    row.style.cssText = "padding:8px; border-bottom:1px solid #2e4a73; display:flex; justify-content:space-between; align-items:center;";

    const isAdminEvent = ev.is_global === true;
    const badgeHtml = isAdminEvent 
      ? `<span style="background:#00ffe4; color:#000; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">📢 ADMIN</span>`
      : `<span style="background:#7b6bff; color:#fff; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">👤 USER</span>`;

    const actionBtnHtml = `<button class="logout" style="padding:4px 10px; font-size:12px;" onclick="deleteEvent('${ev.id}')">🗑 Delete</button>`;

    row.innerHTML = `
      <div>
        <b>${ev.event_date}</b> — ${ev.event_name} ${badgeHtml}
      </div>
      <div>${actionBtnHtml}</div>
    `;
    list.appendChild(row);
  });

  updateStats();
}

async function deleteEvent(id) {
  if (!confirm("Delete this event?")) return;

  const { error } = await window.supabaseClient.from("events").delete().eq("id", id);
  if (error) {
    alert("❌ Delete failed: " + error.message);
    return;
  }

  await loadEvents();
  await updateStats();
}

/* ---------- PART 4: FORMULAS SYSTEM ---------- */
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

    if (!fClass.value || !fSubject.value || !fChapter.value || !fChapterName?.value.trim() || !fType.value || !fCategory.value) {
      if (statusBox) statusBox.innerText = "❌ All fields including Chapter Name & Category are required";
      return;
    }

    const { data: userData } = await window.supabaseClient.auth.getUser();
    if (!userData?.user) return alert("❌ Login required");

    let formulaTextData = null;
    let filePath = null;

    const chapterNum = parseInt(fChapter.value.replace("ch", "")) || 1;

    if (fType.value === "text") {
      if (!formulaText.value.trim()) return alert("❌ Enter Formula Text");
      formulaTextData = formulaText.value.trim();
    } else {
      const file = formulaFile.files[0];
      if (!file) return alert("❌ Select File");

      const cleanFileName = file.name.replace(/\s+/g, '_');
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
      chapter_number: chapterNum,
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
      list.innerHTML = "<em>No matching formulas found</em>";
      updateStats();
      return;
    }

    list.innerHTML = "";
    filtered.forEach(f => {
      const row = document.createElement("div");
      row.style.cssText = "padding:10px; border-bottom:1px solid #2e4a73; display:flex; justify-content:space-between; align-items:center;";
      const icon = f.type === "text" ? "📝" : f.type === "pdf" ? "📄" : "🖼️";
      const displayCh = f.chapter_name ? `${f.chapter_name}` : (f.chapter || '');
      
      row.innerHTML = `
        <span>
          ${icon} <b>Class ${f.class}</b> • ${(f.subject || '').toUpperCase()} • ${displayCh} [${f.category || 'other'}]
          ${f.publish ? "🟢" : "🔒"}
        </span>
        <div style="display:flex; gap:6px;">
          <button style="padding:6px 10px; font-size:12px;" onclick="viewFormula('${f.id}')">View</button>
          <button style="padding:6px 10px; font-size:12px; background:#d97706; color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="updateFormulaChapter('${f.id}', '${f.chapter_name || ''}')">✏️ Edit</button>
          <button style="padding:6px 10px; font-size:12px;" class="logout" onclick="deleteFormula('${f.id}','${f.file_path || ""}')">🗑</button>
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
      const className = data.class ? `Class ${data.class}` : '';
      const subjectName = data.subject ? data.subject.toUpperCase() : '';
      const chapterInfo = data.chapter_name ? data.chapter_name : (data.chapter || '');
      const descriptiveName = [className, subjectName, chapterInfo].filter(Boolean).join(' • ') || 'Formula Document';

      const targetViewer = data.type === "image" ? "image-viewer.html" : "notes-viewer.html";
      window.open(`${targetViewer}?path=${encodeURIComponent(data.file_path)}&name=${encodeURIComponent(descriptiveName)}`, "_blank");
    }
  };

  window.updateFormulaChapter = async function (id, currentName) {
    const newName = prompt("Naya Chapter Name enter karein:", currentName);
    if (!newName || newName.trim() === "") return;

    const { error } = await window.supabaseClient
      .from("formulas")
      .update({ chapter_name: newName.trim() })
      .eq("id", id);

    if (error) {
      alert("❌ Update failed: " + error.message);
      return;
    }

    alert("✅ Formula chapter name updated successfully!");
    await loadFormulas();
  };

  window.deleteFormula = async function (id, filePath) {
    if (!confirm("Kya aap is formula ko database aur storage bucket dono se delete karna chahte hain?")) return;
    
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

  document.getElementById("searchFormula")?.addEventListener("input", loadFormulas);
  document.getElementById("filterFClass")?.addEventListener("change", loadFormulas);
  document.getElementById("filterFSubject")?.addEventListener("change", loadFormulas);
  document.getElementById("filterFCategory")?.addEventListener("change", loadFormulas);

  loadFiles();
  loadEvents();
  loadFormulas();
  updateStats();
});

/* ---------- PART 5: DOUBTS & OVERLAY SYSTEM ---------- */
document.addEventListener("DOMContentLoaded", () => {
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
      const userPhotoHtml = d.user_photo 
        ? `<img src="${d.user_photo}" style="width:26px; height:26px; border-radius:50%; object-fit:cover; margin-right:6px;">` 
        : `<div style="width:26px; height:26px; border-radius:50%; background:#1f3554; display:inline-flex; align-items:center; justify-content:center; margin-right:6px; font-size:11px; font-weight:bold;">${(d.user_name || 'U').charAt(0).toUpperCase()}</div>`;

      doubtList.innerHTML += `
        <div style="padding:8px; border-bottom:1px solid #2f4d77; font-size:13px; display:flex; align-items:flex-start;">
          <div>${userPhotoHtml}</div>
          <div style="flex:1; overflow:hidden;">
            <div style="font-weight:bold; color:#3aa0ff; font-size:12px;">${d.user_name || 'Student'}</div>
            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#cbd5e1;">${d.question_text || 'Image doubt'}</div>
          </div>
        </div>
      `;
    });
  }
});
