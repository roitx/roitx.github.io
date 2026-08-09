/* =====================================================
   ADMIN PANEL — FULL COMPLETE & UPDATED JS SYSTEM
   ===================================================== */

/* ---------- PART 1: AUTH HELPERS ---------- */
function goUpload(){
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

/* ---------- GLOBAL STATS COUNTER ---------- */
async function updateStats() {
  // 1. Count Notes
  const { data: notes } = await window.supabaseClient.storage.from("admin-files").list("notes");
  if (notes) {
    const el = document.getElementById("totalNotesCount");
    if(el) el.innerText = notes.length;
  }

  // 2. Count Formulas
  const { data: formulas } = await window.supabaseClient.from("formulas").select("id");
  if (formulas) {
    const el = document.getElementById("totalFormulasCount");
    if(el) el.innerText = formulas.length;
  }

  // 3. Count Events
  const { data: events } = await window.supabaseClient.from("events").select("id");
  if (events) {
    const el = document.getElementById("totalEventsCount");
    if(el) el.innerText = events.length;
  }
}


/* ---------- PART 2: NOTES SYSTEM (MAX 15 LIMIT) ---------- */
async function uploadFile() {
  const fileInput = document.getElementById("fileUpload");
  const file = fileInput?.files[0];

  if (!file) return alert("❌ PDF select karo");
  if (!file.name.toLowerCase().endsWith(".pdf")) return alert("❌ Sirf PDF allowed");

  const cls = document.getElementById("classSelect").value;
  const sub = document.getElementById("subjectSelect").value;
  const ch  = document.getElementById("chapterSelect").value;
  const msg = document.getElementById("uploadMsg");

  if (!cls || !sub || !ch) return alert("❌ Select Class, Subject & Chapter");

  const classNum = cls.replace("class", "");
  const fileName = `${classNum}_${sub}_${ch}.pdf`;

  msg.innerText = "⏳ Uploading...";

  const { error } = await window.supabaseClient.storage
    .from("admin-files")
    .upload(`notes/${fileName}`, file, { upsert: true });

  if (error) {
    msg.innerText = "❌ Upload failed";
    return;
  }

  msg.innerText = "✅ Uploaded: " + fileName;
  fileInput.value = "";
  loadFiles();
}

async function loadFiles() {
  const list = document.getElementById("fileList");
  if (!list) return;

  list.innerHTML = "⏳ Loading notes...";

  // Limit 15 items to save bandwidth
  const { data, error } = await window.supabaseClient.storage
    .from("admin-files")
    .list("notes", { limit: 15 });

  if (error || !data || data.length === 0) {
    list.innerHTML = "<em>No files found</em>";
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
    return;
  }

  list.innerHTML = "";
  filtered.slice(0, 15).forEach(file => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #333;";
    row.innerHTML = `
      <span>📄 <b>${file.name}</b></span>
      <div>
        <button onclick="openFile('${file.name}')">Open</button>
        <button onclick="deleteFile('${file.name}')">🗑</button>
      </div>
    `;
    list.appendChild(row);
  });

  updateStats();
}

async function openFile(name) {
  window.location.href = `notes-viewer.html?file=${encodeURIComponent(name)}`;
}

async function deleteFile(name) {
  if (!confirm("Delete file?")) return;
  await window.supabaseClient.storage.from("admin-files").remove([`notes/${name}`]);
  loadFiles();
}


/* ---------- PART 3: EVENTS SYSTEM (MONTH & YEAR FILTER, MAX 15 LIMIT) ---------- */
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
    msg.innerText = "❌ Error adding event";
    return;
  }

  msg.innerText = "✅ Event added";
  document.getElementById("eventName").value = "";
  loadEvents();
}

async function loadEvents() {
  const list = document.getElementById("eventList");
  if (!list) return;

  list.innerHTML = "⏳ Loading events...";

  // Limit 15 items to save DB requests
  const { data, error } = await window.supabaseClient
    .from("events")
    .select("*")
    .order("event_date", { ascending: true })
    .limit(15);

  if (error || !data || !data.length) {
    list.innerHTML = "<em>No events</em>";
    return;
  }

  const search = document.getElementById("searchEvent")?.value.toLowerCase().trim() || "";
  const monthFilter = document.getElementById("filterEventMonth")?.value || "";
  const yearFilter = document.getElementById("filterEventYear")?.value || "";

  const filtered = data.filter(ev => {
    // ev.event_date format YYYY-MM-DD
    const [year, month] = ev.event_date.split("-");
    const matchSearch = ev.event_name.toLowerCase().includes(search);
    const matchMonth = monthFilter ? month === monthFilter : true;
    const matchYear  = yearFilter ? year === yearFilter : true;

    return matchSearch && matchMonth && matchYear;
  });

  if (filtered.length === 0) {
    list.innerHTML = "<em>No events found for selected filter</em>";
    return;
  }

  list.innerHTML = "";
  filtered.slice(0, 15).forEach(ev => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #333;";
    row.innerHTML = `
      <span>📅 <b>${ev.event_date}</b> — ${ev.event_name}</span>
      <button onclick="deleteEvent(${ev.id})">🗑</button>
    `;
    list.appendChild(row);
  });

  updateStats();
}

async function deleteEvent(id) {
  if (!confirm("Delete event?")) return;
  await window.supabaseClient.from("events").delete().eq("id", id);
  loadEvents();
}


/* ---------- PART 4: FORMULAS SYSTEM (MAX 15 LIMIT) ---------- */
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
    formulaText.style.display = "none";
    formulaFile.style.display = "none";
    toolbar.style.display = "none";

    if (fType.value === "text") {
      formulaText.style.display = "block";
      toolbar.style.display = "flex";
    } else if (fType.value === "pdf" || fType.value === "image") {
      formulaFile.style.display = "block";
    }
  });

  toolbar?.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      formulaText.value += btn.dataset.sym;
      previewBox.innerText = formulaText.value.trim() || "Preview will appear here…";
    });
  });

  formulaText?.addEventListener("input", () => {
    previewBox.innerText = formulaText.value.trim() || "Preview will appear here…";
  });

  window.uploadFormula = async function () {
    statusBox.innerText = "⏳ Uploading...";

    if (!fClass.value || !fSubject.value || !fChapter.value || !fType.value) {
      statusBox.innerText = "❌ All fields required";
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
        statusBox.innerText = "❌ Upload failed";
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
      publish: publishCheck.checked
    }]);

    if (error) {
      statusBox.innerText = "❌ DB Error";
      return;
    }

    statusBox.innerText = "✅ Formula uploaded";
    formulaText.value = "";
    formulaFile.value = "";
    loadFormulas();
  };

  async function loadFormulas() {
    const list = document.getElementById("formulaList");
    if (!list) return;

    list.innerHTML = "⏳ Loading...";

    // Fetch max 15 formulas from database
    let query = window.supabaseClient
      .from("formulas")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);

    const fClass = document.getElementById("filterFClass")?.value;
    const fSub = document.getElementById("filterFSubject")?.value;
    const search = document.getElementById("searchFormula")?.value.toLowerCase().trim();

    if (fClass) query = query.eq("class", fClass);
    if (fSub) query = query.eq("subject", fSub);

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      list.innerHTML = "<em>No formulas found</em>";
      return;
    }

    const filtered = data.filter(f => {
      const text = (f.formula_text || "").toLowerCase();
      const ch = (f.chapter || "").toLowerCase();
      return text.includes(search) || ch.includes(search);
    });

    list.innerHTML = "";
    filtered.slice(0, 15).forEach(f => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #333;";
      
      const icon = f.type === "text" ? "📝" : f.type === "pdf" ? "📄" : "🖼️";
      row.innerHTML = `
        <span>
          ${icon} <b>Class ${f.class}</b> • ${f.subject.toUpperCase()} • ${f.chapter.toUpperCase()}
          ${f.publish ? "🟢" : "🔒"}
        </span>
        <div>
          <button onclick="viewFormula('${f.id}')">View</button>
          <button onclick="deleteFormula('${f.id}','${f.file_path || ""}')">🗑</button>
        </div>
      `;
      list.appendChild(row);
    });

    updateStats();
  }

  window.viewFormula = async function (id) {
    const { data } = await window.supabaseClient.from("formulas").select("*").eq("id", id).single();
    if (!data) return;

    if (data.type === "text") alert(data.formula_text);
    else {
      const { data: urlData } = await window.supabaseClient.storage.from("admin-files").createSignedUrl(data.file_path, 60);
      window.open(urlData.signedUrl, "_blank");
    }
  };

  window.deleteFormula = async function (id, filePath) {
    if (!confirm("Delete formula?")) return;
    if (filePath) await window.supabaseClient.storage.from("admin-files").remove([filePath]);
    await window.supabaseClient.from("formulas").delete().eq("id", id);
    loadFormulas();
  };

  // Attach Event Listeners for Filters
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
});


/* ---------- PART 5: DOUBTS ENGINE ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const doubtBtn   = document.getElementById("doubtBtn");
  const doubtPanel = document.getElementById("doubtPanel");
  const doubtList  = document.getElementById("doubtList");
  const badge      = document.getElementById("pendingCount");

  if (!doubtBtn || !doubtPanel) return;

  doubtPanel.style.display = "none";

  doubtBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    doubtPanel.style.display = doubtPanel.style.display === "block" ? "none" : "block";
    loadMiniDoubts();
  });

  async function loadMiniDoubts() {
    const { data } = await window.supabaseClient.from("doubts").select("*").order("created_at", { ascending: false });
    if (!data) return;

    const pending = data.filter(d => d.status !== "solved").length;
    badge.innerText = pending;
    badge.style.display = pending ? "inline-flex" : "none";

    doubtList.innerHTML = "";
    data.slice(0, 5).forEach(d => {
      doubtList.innerHTML += `
        <div style="padding:6px; border-bottom:1px solid #444;">
          <b>❓ ${d.question}</b><br>
          ${d.status === "solved" ? "🟢 Solved" : "🟡 Pending"}
        </div>
      `;
    });
  }

  const viewAllBtn  = document.getElementById("viewAllDoubts");
  const overlay     = document.getElementById("doubtOverlay");
  const closeBtn    = document.getElementById("closeDoubt");
  const overlayList = document.getElementById("doubtOverlayList");

  viewAllBtn?.addEventListener("click", () => {
    overlay.style.display = "flex";
    loadAllDoubts();
  });

  closeBtn?.addEventListener("click", () => {
    overlay.style.display = "none";
  });

  async function loadAllDoubts() {
    const { data } = await window.supabaseClient.from("doubts").select("*").order("created_at", { ascending: false });
    if (!data) return;

    overlayList.innerHTML = "";
    data.forEach(d => {
      overlayList.innerHTML += `
        <div style="background:#222; padding:10px; margin-bottom:10px; border-radius:6px;">
          <p><b>❓ ${d.question}</b></p>
          ${d.status === "solved" ? `
            <div>${d.answer.replace(/\n/g,"<br>")}</div>
            <button onclick="deleteDoubt('${d.id}')">🗑 Delete</button>
          ` : `
            <input id="greet_${d.id}" placeholder="Greeting">
            <textarea id="ans_${d.id}" placeholder="Type answer"></textarea><br>
            <button onclick="publishAnswer('${d.id}')">✅ Publish</button>
            <button onclick="deleteDoubt('${d.id}')">🗑 Delete</button>
          `}
        </div>
      `;
    });
  }

  window.publishAnswer = async function (id) {
    const ansEl = document.getElementById("ans_" + id);
    const greetEl = document.getElementById("greet_" + id);
    if (!ansEl?.value.trim()) return alert("Write answer first");

    const finalAnswer = (greetEl?.value.trim() ? greetEl.value.trim() + "\n\n" : "") + ansEl.value.trim();

    await window.supabaseClient.from("doubts").update({ answer: finalAnswer, status: "solved" }).eq("id", id);
    loadAllDoubts();
    loadMiniDoubts();
  };

  window.deleteDoubt = async function (id) {
    if (!confirm("Delete doubt?")) return;
    await window.supabaseClient.from("doubts").delete().eq("id", id);
    loadAllDoubts();
    loadMiniDoubts();
  };
});
