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
  const ch  = document.getElementById("chapterSelect")?.value;
  const msg = document.getElementById("uploadMsg");

  if (!cls || !sub || !ch) return alert("❌ Select Class, Subject & Chapter");

  const classNum = cls.replace("class", "");
  const fileName = `${classNum}_${sub}_${ch}.pdf`;

  if (msg) msg.innerText = "⏳ Uploading...";

  const { error } = await window.supabaseClient.storage
    .from("admin-files")
    .upload(`notes/${fileName}`, file, { upsert: true });

  if (error) {
    if (msg) msg.innerText = "❌ Upload failed";
    return;
  }

  if (msg) msg.innerText = "✅ Uploaded: " + fileName;
  if (fileInput) fileInput.value = "";
  
  // Instant Refresh & Stats Update after upload
  await loadFiles();
  await updateStats();
}

async function loadFiles() {
  const list = document.getElementById("fileList");
  if (!list) return;

  list.innerHTML = "⏳ Loading notes...";

  const { data, error } = await window.supabaseClient.storage
    .from("admin-files")
    .list("notes", { limit: 100 });

  if (error || !data || data.length === 0) {
    list.innerHTML = "<em>No files found</em>";
    updateStats();
    return;
  }

  const search = document.getElementById("searchNotes")?.value.toLowerCase().trim() || "";
  const filterCls = document.getElementById("filterNotesClass")?.value || "";
  const filterSub = document.getElementById("filterNotesSubject")?.value.toLowerCase() || "";

  const filtered = data.filter(file => {
    const fileName = file.name.toLowerCase();
    const matchSearch = fileName.includes(search);
    const matchClass = filterCls ? fileName.startsWith(`${filterCls}_`) : true;
    const matchSubject = filterSub ? fileName.includes(`_${filterSub}_`) : true;
    return matchSearch && matchClass && matchSubject;
  });

  if (filtered.length === 0) {
    list.innerHTML = "<em>No matching notes found</em>";
    updateStats();
    return;
  }

  list.innerHTML = "";
  filtered.forEach(file => {
    const row = document.createElement("div");
    row.innerHTML = `
      <span>📄 <b>${file.name}</b></span>
      <div>
        <button onclick="openFile('${file.name}')">Open</button>
        <button class="logout" style="padding:6px 12px; font-size:12px;" onclick="deleteFile('${file.name}')">🗑</button>
      </div>
    `;
    list.appendChild(row);
  });

  updateStats();
}

async function openFile(name) {
  window.location.href = `notes-viewer.html?path=notes/${encodeURIComponent(name)}&name=${encodeURIComponent(name)}`;
}

async function deleteFile(name) {
  if (!confirm("Delete file?")) return;
  const { error } = await window.supabaseClient.storage.from("admin-files").remove([`notes/${name}`]);
  if (error) {
    alert("❌ Delete failed");
    return;
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
  
  // Instant Refresh & Stats Update
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
  await updateStats();
}

/* ---------- PART 4: FORMULAS SYSTEM ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const fClass   = document.getElementById("fClass");
  const fSubject = document.getElementById("fSubject");
  const fChapter = document.getElementById("fChapter");
  const fType    = document.getElementById("fType");

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

    if (!fClass.value || !fSubject.value || !fChapter.value || !fType.value) {
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
    
    // Instant Refresh & Stats Update
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
    const search    = document.getElementById("searchFormula")?.value.toLowerCase().trim() || "";

    if (fClassVal) query = query.eq("class", fClassVal);
    if (fSubVal) query = query.eq("subject", fSubVal);

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
      row.innerHTML = `
        <span>
          ${icon} <b>Class ${f.class}</b> • ${f.subject.toUpperCase()} • ${f.chapter.toUpperCase()}
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
      doubtList.innerHTML += `
        <div style="padding:8px; border-bottom:1px solid #2f4d77; font-size:13px;">
          <b>❓ ${d.question}</b><br>
          <span style="font-size:11px;">${d.status === "solved" ? "🟢 Solved" : "🟡 Pending"}</span>
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

    overlayList.innerHTML = "";
    data.forEach(d => {
      overlayList.innerHTML += `
        <div class="admin-doubt-card">
          <p><b>❓ ${d.question}</b></p>
          ${d.status === "solved" ? `
            <div style="margin:8px 0; font-size:13px; color:#4ade80;">${d.answer.replace(/\n/g,"<br>")}</div>
            <div class="admin-actions">
              <button class="delete" onclick="deleteDoubt('${d.id}')">🗑 Delete</button>
            </div>
          ` : `
            <input id="greet_${d.id}" type="text" placeholder="Greeting message (optional)...">
            <textarea id="ans_${d.id}" placeholder="Type solution/answer here..."></textarea>
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

  loadMiniDoubts();
});

/* ---------- INITIAL SETUP ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const d = document.getElementById("eventDate");
  if (d) d.value = new Date().toISOString().split("T")[0];
  updateStats();
});
