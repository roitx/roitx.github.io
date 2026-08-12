/* =====================================================
   ADMIN PANEL — COMPLETE FULLY UPDATED JS SYSTEM
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
    // 1. Total Notes Count
    const { data: notes } = await window.supabaseClient.storage.from("admin-files").list("notes", { limit: 1000 });
    const notesEl = document.getElementById("totalNotesCount");
    if (notesEl && notes) notesEl.innerText = notes.length;

    // 2. Total Formulas Count
    const { data: formulas } = await window.supabaseClient.from("formulas").select("id", { count: 'exact' });
    const formulasEl = document.getElementById("totalFormulasCount");
    if (formulasEl && formulas) formulasEl.innerText = formulas.length;

    // 3. Total Events Count
    const { data: events } = await window.supabaseClient.from("events").select("id", { count: 'exact' });
    const eventsEl = document.getElementById("totalEventsCount");
    if (eventsEl && events) eventsEl.innerText = events.length;

    // 4. Check Pending Orders for Glowing Button Fix
    const { data: orders } = await window.supabaseClient.from("orders").select("id").eq("status", "pending");
    const orderBtn = document.getElementById("adminOrdersBtn"); // या ऑर्डर वाले बटन की आईडी
    if (orders && orders.length > 0) {
        if(orderBtn) orderBtn.classList.add("glow-effect");
    } else {
        if(orderBtn) orderBtn.classList.remove("glow-effect");
    }
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
  
  const fileName = `${classNum}_${sub}_ch${chapterNumber}.pdf`;
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
    .upsert([
      {
        class: classNum,
        subject: sub.toLowerCase().trim(),
        chapter_number: chapterNumber,
        chapter_name: chapterName,
        file_path: filePath
      }
    ], { onConflict: 'class,subject,chapter_number' });

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
    const searchStr = `${note.chapter_name} ${note.subject} class ${note.class}`.toLowerCase();
    const matchSearch = searchStr.includes(search);
    const matchClass = filterCls ? String(note.class) === String(filterCls) : true;
    const matchSubject = filterSub ? note.subject.toLowerCase() === filterSub.toLowerCase() : true;
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
      <span>📄 <b>Class ${note.class}</b> • ${note.subject.toUpperCase()} • Ch ${note.chapter_number}: ${note.chapter_name}</span>
      <div>
        <button style="padding:6px 12px; font-size:12px;" onclick="openFile('${note.file_path}')">Open</button>
        <button class="logout" style="padding:6px 12px; font-size:12px;" onclick="deleteNoteRecord('${note.id}', '${note.file_path}')">🗑</button>
      </div>
    `;
    list.appendChild(row);
  });

  updateStats();
}

async function openFile(filePath) {
  const fileName = filePath.split("/").pop();
  window.location.href = `notes-viewer.html?path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(fileName)}`;
}

async function deleteNoteRecord(id, filePath) {
  if (!confirm("Delete file and record?")) return;
  await window.supabaseClient.storage.from("admin-files").remove([filePath]);
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
    event_name: name
  }]);

  if (error) {
    if (msg) msg.innerText = "❌ Error adding event";
    return;
  }

  if (msg) msg.innerText = "✅ Event added";
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

  const filtered = data.filter(ev => {
    const [year, month] = ev.event_date.split("-");
    const matchSearch = ev.event_name.toLowerCase().includes(search);
    const matchMonth = monthFilter ? month === monthFilter : true;
    const matchYear  = yearFilter ? year === yearFilter : true;
    return matchSearch && matchMonth && matchYear;
  });

  if (filtered.length === 0) {
    list.innerHTML = "<em>No events found for selected filter</em>";
    updateStats();
    return;
  }

  list.innerHTML = "";
  filtered.forEach(ev => {
    const row = document.createElement("div");
    row.innerHTML = `
      <span>📅 <b>${ev.event_date}</b> — ${ev.event_name}</span>
      <div>
        <button class="logout" style="padding:6px 12px; font-size:12px;" onclick="deleteEvent(${ev.id})">🗑</button>
      </div>
    `;
    list.appendChild(row);
  });

  updateStats();
}

async function deleteEvent(id) {
  if (!confirm("Delete event?")) return;
  const { error } = await window.supabaseClient.from("events").delete().eq("id", id);
  if (error) {
    alert("❌ Delete failed");
    return;
  }
  await loadEvents();
  updateStats();
}

/* ---------- PART 4: FORMULAS SYSTEM ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const fClass    = document.getElementById("fClass");
  const fSubject  = document.getElementById("fSubject");
  const fChapter  = document.getElementById("fChapter");
  const fType     = document.getElementById("fType");
  const fCategory = document.getElementById("fCategory");

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

    if (!fClass.value || !fSubject.value || !fChapter.value || !fType.value || !fCategory.value) {
      if (statusBox) statusBox.innerText = "❌ All fields required";
      return;
    }

    const { data: userData } = await window.supabaseClient.auth.getUser();
    if (!userData?.user) return alert("❌ Login required");

    let formulaTextData = null;
    let filePath = null;

    if (fType.value === "text") {
      if (!formulaText.value.trim()) return alert("❌ Enter Formula Text");
      formulaTextData = formulaText.value.trim();
    } else {
      const file = formulaFile.files[0];
      if (!file) return alert("❌ Select File");

      const ext = file.name.split(".").pop();
      filePath = `formulas/${Date.now()}_${fClass.value}_${fSubject.value}.${ext}`;

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
      type: fType.value,
      category: fCategory.value,
      formula_text: formulaTextData,
      file_path: filePath,
      publish: publishCheck ? publishCheck.checked : true
    }]);

    if (error) {
      if (statusBox) statusBox.innerText = "❌ DB Error";
      return;
    }

    if (statusBox) statusBox.innerText = "✅ Formula uploaded";
    if (formulaText) formulaText.value = "";
    if (formulaFile) formulaFile.value = "";
    if (fCategory) fCategory.value = "";
    
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

    const fClassVal = document.getElementById("filterFClass")?.value;
    const fSubVal   = document.getElementById("filterFSubject")?.value;
    const fCatVal   = document.getElementById("filterFCategory")?.value;
    const search    = document.getElementById("searchFormula")?.value.toLowerCase().trim() || "";

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
      const ch   = (f.chapter || "").toLowerCase();
      return text.includes(search) || ch.includes(search);
    });

    if (filtered.length === 0) {
      list.innerHTML = "<em>No matching formulas found</em>";
      updateStats();
      return;
    }

    list.innerHTML = "";
    filtered.forEach(f => {
      const row = document.createElement("div");
      const icon = f.type === "text" ? "📝" : f.type === "pdf" ? "📄" : "🖼️";
      const categoryLabel = f.category ? f.category.replace('_', ' ').toUpperCase() : '';

      row.innerHTML = `
        <span>
          ${icon} <b>Class ${f.class}</b> • ${f.subject.toUpperCase()} • ${f.chapter.toUpperCase()} 
          ${categoryLabel ? `• [${categoryLabel}]` : ''}
          ${f.publish ? "🟢" : "🔒"}
        </span>
        <div>
          <button style="padding:6px 12px; font-size:12px;" onclick="viewFormula('${f.id}')">View</button>
          <button style="padding:6px 12px; font-size:12px;" class="logout" onclick="deleteFormula('${f.id}','${f.file_path || ""}')">🗑</button>
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
    } else if (data.type === "image") {
      const name = data.file_path.split("/").pop();
      window.open(`image-viewer.html?path=${encodeURIComponent(data.file_path)}&name=${encodeURIComponent(name)}`, "_blank");
    } else if (data.type === "pdf") {
      const name = data.file_path.split("/").pop();
      window.open(`notes-viewer.html?path=${encodeURIComponent(data.file_path)}&name=${encodeURIComponent(name)}`, "_blank");
    }
  };

  window.deleteFormula = async function (id, filePath) {
    if (!confirm("Delete formula?")) return;
    if (filePath) await window.supabaseClient.storage.from("admin-files").remove([filePath]);
    const { error } = await window.supabaseClient.from("formulas").delete().eq("id", id);
    if (error) {
      alert("❌ Delete failed");
      return;
    }
    await loadFormulas();
    await updateStats();
  };

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

/* ---------- PART 5: DOUBTS & OVERLAY SYSTEM (FIXED & UPGRADED) ---------- */
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
      doubtList.innerHTML = "❌ Error loading doubts";
      return;
    }

    const pending = data.filter(d => d.status !== "solved").length;
    if (badge) {
      badge.innerText = pending;
      badge.style.display = pending > 0 ? "inline-flex" : "none";
    }

    if (data.length === 0) {
      doubtList.innerHTML = "<div style='padding:10px; text-align:center;'>No doubts found</div>";
      return;
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
            <div style="font-weight:bold; color:#3aa0ff; font-size:12px;">${d.user_name || 'Anonymous'}</div>
            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><b>❓ ${d.question}</b></div>
            <span style="font-size:11px;">${d.status === "solved" ? "🟢 Solved" : "🟡 Pending"}</span>
          </div>
        </div>
      `;
    });
  }

  const viewAllBtn  = document.getElementById("viewAllDoubts");
  const overlay     = document.getElementById("doubtOverlay");
  const closeBtn    = document.getElementById("closeDoubt");
  const overlayList = document.getElementById("doubtOverlayList");

  viewAllBtn?.addEventListener("click", () => {
    if (overlay) overlay.style.display = "flex";
    loadAllDoubts();
  });

  closeBtn?.addEventListener("click", () => {
    if (overlay) overlay.style.display = "none";
  });

  async function loadAllDoubts() {
    if (!overlayList) return;
    overlayList.innerHTML = "⏳ Loading doubts...";

    const { data, error } = await window.supabaseClient
      .from("doubts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      overlayList.innerHTML = "❌ Failed to load";
      return;
    }

    if (data.length === 0) {
      overlayList.innerHTML = "<div style='text-align:center; padding:20px;'>No doubts available</div>";
      return;
    }

    overlayList.innerHTML = "";
    data.forEach(d => {
      const userPhotoHtml = d.user_photo 
        ? `<img src="${d.user_photo}" style="width:38px; height:38px; border-radius:50%; object-fit:cover; margin-right:10px;">` 
        : `<div style="width:38px; height:38px; border-radius:50%; background:#1f3554; display:flex; align-items:center; justify-content:center; margin-right:10px; font-weight:bold; font-size:16px;">${(d.user_name || 'U').charAt(0).toUpperCase()}</div>`;

      overlayList.innerHTML += `
        <div class="admin-doubt-card" style="background:#15263c; border:1px solid #2e4a73; padding:14px; border-radius:10px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; margin-bottom:10px; border-bottom:1px solid #2e4a73; padding-bottom:8px;">
            ${userPhotoHtml}
            <div>
              <div style="font-weight:bold; font-size:14px; color:#e9f2ff;">${d.user_name || 'Anonymous User'}</div>
              <div style="font-size:12px; color:#94a3b8;">📧 ${d.user_email || 'No Email'} • 🕒 ${new Date(d.created_at).toLocaleString()}</div>
            </div>
          </div>
          
          <p style="margin:6px 0 10px 0; color:#e9f2ff; font-size:14px;"><b>❓ Question:</b> ${d.question}</p>
          
          ${d.status === "solved" ? `
            <div style="margin:8px 0; font-size:13px; color:#4ade80; background:#0e1a2a; padding:8px; border-radius:6px;">
              <b>Answer:</b><br>${d.answer ? d.answer.replace(/\n/g,"<br>") : ''}
            </div>
            <div class="admin-actions">
              <button class="delete" onclick="deleteDoubt('${d.id}')">🗑 Delete</button>
            </div>
          ` : `
            <input id="greet_${d.id}" type="text" placeholder="Greeting message (optional)..." style="width:100%; padding:8px; margin-bottom:6px; background:#1f3554; border:1px solid #2e4a73; color:white; border-radius:6px; box-sizing:border-box;">
            <textarea id="ans_${d.id}" placeholder="Type solution/answer here..." style="width:100%; padding:8px; margin-bottom:6px; background:#1f3554; border:1px solid #2e4a73; color:white; border-radius:6px; resize:vertical; box-sizing:border-box; height:60px;"></textarea>
            <div class="admin-actions">
              <button class="publish" onclick="publishAnswer('${d.id}')">✅ Publish Answer</button>
              <button class="delete" onclick="deleteDoubt('${d.id}')">🗑 Delete</button>
            </div>
          `}
        </div>
      `;
    });
  }

  window.loadAllDoubts = loadAllDoubts;
  window.loadMiniDoubts = loadMiniDoubts;

  window.publishAnswer = async function (id) {
    const ansEl = document.getElementById("ans_" + id);
    const greetEl = document.getElementById("greet_" + id);

    if (!ansEl || !ansEl.value.trim()) {
      alert("Type an answer first!");
      return;
    }

    const finalAnswer = (greetEl && greetEl.value.trim() ? greetEl.value.trim() + "\n\n" : "") + ansEl.value.trim();

    const { error } = await window.supabaseClient
      .from("doubts")
      .update({ answer: finalAnswer, status: "solved" })
      .eq("id", id);

    if (error) return alert("❌ Publish failed");

    loadAllDoubts();
    loadMiniDoubts();
  };

  window.deleteDoubt = async function (id) {
    if (!confirm("Delete this doubt?")) return;
    const { error } = await window.supabaseClient.from("doubts").delete().eq("id", id);
    if (error) return alert("❌ Delete failed");

    loadAllDoubts();
    loadMiniDoubts();
  };

  // Page load hote hi doubts load karein taki panel khali na dikhe
  loadMiniDoubts();
});

/* ---------- INITIAL SETUP ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const d = document.getElementById("eventDate");
  if (d) d.value = new Date().toISOString().split("T")[0];
  updateStats();
});
