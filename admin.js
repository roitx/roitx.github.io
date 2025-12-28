/* =====================================================
   ADMIN PANEL — PART 1
   AUTH + BASIC HELPERS
   ===================================================== */

/* ---------- GET CURRENT USER ---------- */
  function goUpload(){
    window.location.href = "upload.html";
  }
async function getCurrentUser() {
  try {
    const { data, error } =
      await window.supabaseClient.auth.getUser();

    if (error) {
      console.error("Auth error:", error.message);
      return null;
    }

    return data?.user || null;
  } catch (e) {
    console.error("getCurrentUser failed:", e);
    return null;
  }
}

/* ---------- LOGOUT ---------- */
function logout() {
  window.supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

/* ---------- SAFE DOM READY ---------- */
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Admin JS loaded (PART 1)");
});
/* =====================================================
   ADMIN PANEL — PART 2
   NOTES UPLOAD + FILE LIST + DELETE
   ===================================================== */

/* ---------- UPLOAD PDF ---------- */
async function uploadFile() {
  const fileInput = document.getElementById("fileUpload");
  const file = fileInput?.files[0];

  if (!file) return alert("❌ PDF select karo");
  if (!file.name.toLowerCase().endsWith(".pdf"))
    return alert("❌ Sirf PDF allowed");

  const cls  = document.getElementById("classSelect").value;
  const sub  = document.getElementById("subjectSelect").value;
  const ch   = document.getElementById("chapterSelect").value;
  const msg  = document.getElementById("uploadMsg");

  if (!cls || !sub || !ch)
    return alert("❌ Class, Subject, Chapter select karo");

  const classNum = cls.replace("class", "");
  const fileName = `${classNum}_${sub}_${ch}.pdf`;

  msg.innerText = "⏳ Uploading...";

  const { error } =
    await window.supabaseClient.storage
      .from("admin-files")
      .upload(`notes/${fileName}`, file, { upsert: true });

  if (error) {
    msg.innerText = "❌ Upload failed";
    console.error(error);
    return;
  }

  msg.innerText = "✅ Uploaded: " + fileName;
  loadFiles();
}

/* ---------- LOAD FILES ---------- */
async function loadFiles() {
  const list = document.getElementById("fileList");
  if (!list) return;

  list.innerHTML = "⏳ Loading files...";

  const { data, error } =
    await window.supabaseClient.storage
      .from("admin-files")
      .list("notes");

  if (error) {
    list.innerHTML = "❌ Error loading files";
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<em>No files</em>";
    return;
  }

  list.innerHTML = "";

  data.forEach(file => {
    const row = document.createElement("div");

    row.innerHTML = `
      <span>${file.name}</span>
      <div>
        <button onclick="openFile('${file.name}')">Open</button>
        <button onclick="deleteFile('${file.name}')">🗑</button>
      </div>
    `;

    list.appendChild(row);
  });
}

/* ---------- OPEN FILE ---------- */
async function openFile(name) {
  const { data } =
    await window.supabaseClient.storage
      .from("admin-files")
      .createSignedUrl(`notes/${name}`, 60);

  window.open(data.signedUrl, "_blank");
}

/* ---------- DELETE FILE ---------- */
async function deleteFile(name) {
  if (!confirm("Delete file?")) return;

  const { error } =
    await window.supabaseClient.storage
      .from("admin-files")
      .remove([`notes/${name}`]);

  if (error) {
    alert("❌ Delete failed");
    return;
  }

  loadFiles();
}

/* ---------- AUTO LOAD ---------- */
document.addEventListener("DOMContentLoaded", () => {
  loadFiles();
});
/* =====================================================
   ADMIN PANEL — PART 3
   EVENT / CALENDAR SYSTEM
   ===================================================== */

/* ---------- ADD EVENT ---------- */
async function addEvent() {
  const date = document.getElementById("eventDate")?.value;
  const name = document.getElementById("eventName")?.value.trim();
  const msg  = document.getElementById("eventMsg");

  if (!date || !name) {
    msg.innerText = "❌ Date aur name dono chahiye";
    return;
  }

  const { data: userData } =
    await window.supabaseClient.auth.getUser();

  if (!userData?.user) {
    msg.innerText = "❌ Login required";
    return;
  }

  const { error } =
    await window.supabaseClient
      .from("events")
      .insert([{
        user_id: userData.user.id,
        event_date: date,
        event_name: name
      }]);

  if (error) {
    msg.innerText = "❌ Error adding event";
    console.error(error);
    return;
  }

  msg.innerText = "✅ Event added";
  document.getElementById("eventName").value = "";

  loadEvents();
}

/* ---------- LOAD EVENTS ---------- */
async function loadEvents() {
  const list = document.getElementById("eventList");
  if (!list) return;

  list.innerHTML = "⏳ Loading events...";

  const { data, error } =
    await window.supabaseClient
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

  if (error) {
    list.innerHTML = "❌ Error loading events";
    return;
  }

  if (!data.length) {
    list.innerHTML = "<em>No events</em>";
    return;
  }

  list.innerHTML = "";

  data.forEach(ev => {
    const row = document.createElement("div");

    row.innerHTML = `
      <span><b>${ev.event_date}</b> — ${ev.event_name}</span>
      <button onclick="deleteEvent(${ev.id})">🗑</button>
    `;

    list.appendChild(row);
  });
}

/* ---------- DELETE EVENT ---------- */
async function deleteEvent(id) {
  if (!confirm("Delete event?")) return;

  const { error } =
    await window.supabaseClient
      .from("events")
      .delete()
      .eq("id", id);

  if (error) {
    alert("❌ Delete failed");
    console.error(error);
    return;
  }

  loadEvents();
}

/* ---------- AUTO LOAD ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const d = document.getElementById("eventDate");
  if (d) d.value = new Date().toISOString().split("T")[0];

  loadEvents();
});
/* =====================================================
   ADMIN PANEL — PART 4
   FORMULA SYSTEM (UPLOAD + LIST + DELETE)
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {

  const fClass   = document.getElementById("fClass");
  const fSubject = document.getElementById("fSubject");
  const fChapter = document.getElementById("fChapter");
  const fType    = document.getElementById("fType");

  const formulaText  = document.getElementById("formulaText");
  const formulaFile  = document.getElementById("formulaFile");
  const previewBox   = document.getElementById("formulaPreview");
  const statusBox    = document.getElementById("uploadStatus");
  const formulaList  = document.getElementById("formulaList");
  const toolbar      = document.getElementById("mathToolbar");
  const publishCheck = document.getElementById("publishCheck");

  /* ---------- TYPE CHANGE ---------- */
  fType.addEventListener("change", () => {
    formulaText.style.display = "none";
    formulaFile.style.display = "none";
    toolbar.style.display = "none";

    if (fType.value === "text") {
      formulaText.style.display = "block";
      toolbar.style.display = "flex";
    }

    if (fType.value === "pdf" || fType.value === "image") {
      formulaFile.style.display = "block";
    }

    previewBox.innerHTML = "<em>Preview will appear here…</em>";
    statusBox.innerText = "";
  });

  /* ---------- MATH SYMBOL INSERT ---------- */
  toolbar.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const sym = btn.dataset.sym;
      formulaText.value += sym;
      updatePreview();
    });
  });

  function updatePreview() {
    previewBox.innerText =
      formulaText.value.trim() || "Preview will appear here…";
  }

  formulaText.addEventListener("input", updatePreview);

  /* ---------- UPLOAD FORMULA ---------- */
  window.uploadFormula = async function () {
    statusBox.innerText = "⏳ Uploading...";

    if (!fClass.value || !fSubject.value || !fChapter.value || !fType.value) {
      statusBox.innerText = "❌ All fields required";
      return;
    }

    const { data: userData } =
      await window.supabaseClient.auth.getUser();

    if (!userData?.user) {
      statusBox.innerText = "❌ Login required";
      return;
    }

    let formulaTextData = null;
    let filePath = null;

    if (fType.value === "text") {
      if (!formulaText.value.trim()) {
        statusBox.innerText = "❌ Formula text required";
        return;
      }
      formulaTextData = formulaText.value.trim();
    }

    if (fType.value !== "text") {
      const file = formulaFile.files[0];
      if (!file) {
        statusBox.innerText = "❌ File required";
        return;
      }

      const ext = file.name.split(".").pop();
      const fileName =
        `${Date.now()}_${fClass.value}_${fSubject.value}_${fChapter.value}.${ext}`;

      filePath = `formulas/${fileName}`;

      const { error } =
        await window.supabaseClient.storage
          .from("admin-files")
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type
          });

      if (error) {
        statusBox.innerText = "❌ Upload failed";
        console.error(error);
        return;
      }
    }

    const { error } =
      await window.supabaseClient
        .from("formulas")
        .insert([{
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
      console.error(error);
      return;
    }

    statusBox.innerText = "✅ Formula uploaded";
    formulaText.value = "";
    formulaFile.value = "";
    updatePreview();

    loadFormulas();
  };

  /* ---------- LOAD FORMULAS ---------- */
  async function loadFormulas() {
    formulaList.innerHTML = "⏳ Loading...";

    const { data, error } =
      await window.supabaseClient
        .from("formulas")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
      formulaList.innerHTML = "❌ Error loading";
      return;
    }

    if (!data.length) {
      formulaList.innerHTML = "<em>No formulas</em>";
      return;
    }

    formulaList.innerHTML = "";

    data.forEach(f => {
      const row = document.createElement("div");
      row.innerHTML = `
        <span>
          Class ${f.class} • ${f.subject} • ${f.chapter}
          • ${f.type.toUpperCase()}
          ${f.publish ? "🟢" : "🔒"}
        </span>
        <div>
          <button onclick="viewFormula('${f.id}')">View</button>
          <button onclick="deleteFormula('${f.id}','${f.file_path || ""}')">🗑</button>
        </div>
      `;
      formulaList.appendChild(row);
    });
  }

  /* ---------- VIEW FORMULA ---------- */
  window.viewFormula = async function (id) {
    const { data } =
      await window.supabaseClient
        .from("formulas")
        .select("*")
        .eq("id", id)
        .single();

    if (!data) return;

    if (data.type === "text") {
      alert(data.formula_text);
    } else {
      const { data: urlData } =
        await window.supabaseClient.storage
          .from("admin-files")
          .createSignedUrl(data.file_path, 60);

      window.open(urlData.signedUrl, "_blank");
    }
  };

  /* ---------- DELETE FORMULA ---------- */
  window.deleteFormula = async function (id, filePath) {
    if (!confirm("Delete formula?")) return;

    if (filePath) {
      await window.supabaseClient.storage
        .from("admin-files")
        .remove([filePath]);
    }

    await window.supabaseClient
      .from("formulas")
      .delete()
      .eq("id", id);

    loadFormulas();
  };

  loadFormulas();
});
/* =====================================================
   ADMIN PANEL — PART 5
   MINI DOUBT PANEL (BUTTON + COUNTER)
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {

  const doubtBtn   = document.getElementById("doubtBtn");
  const doubtPanel = document.getElementById("doubtPanel");
  const doubtList  = document.getElementById("doubtList");
  const badge      = document.getElementById("pendingCount");

  if (!doubtBtn || !doubtPanel || !doubtList || !badge) {
    console.warn("⚠ PART 5: Doubt elements missing");
    return;
  }

  doubtPanel.style.display = "none";

  doubtBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    doubtPanel.style.display =
      doubtPanel.style.display === "block" ? "none" : "block";
    loadMiniDoubts();
  });

  document.addEventListener("click", (e) => {
    if (!doubtPanel.contains(e.target) && !doubtBtn.contains(e.target)) {
      doubtPanel.style.display = "none";
    }
  });

  async function loadMiniDoubts() {
    doubtList.innerHTML = "⏳ Loading...";

    const { data, error } = await window.supabaseClient
      .from("doubts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      doubtList.innerHTML = "❌ Failed";
      return;
    }

    const pending = data.filter(d => d.status !== "solved").length;
    badge.innerText = pending;
    badge.style.display = pending ? "inline-flex" : "none";

    doubtList.innerHTML = "";

    data.slice(0, 5).forEach(d => {
      doubtList.innerHTML += `
        <div class="admin-doubt-card">
          <b>❓ ${d.question}</b><br>
          ${d.status === "solved" ? "🟢 Solved" : "🟡 Pending"}
        </div>
      `;
    });
  }

  window.loadMiniDoubts = loadMiniDoubts;

  async function updateDoubtBadge() {
    const { count, error } = await window.supabaseClient
      .from("doubts")
      .select("*", { count: "exact", head: true })
      .neq("status", "solved");

    if (!error) {
      badge.innerText = count;
      badge.style.display = count > 0 ? "inline-flex" : "none";
    }
  }

  updateDoubtBadge();
});
/* =====================================================
   ADMIN PANEL — PART 6
   FULL SCREEN DOUBT OVERLAY
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {

  const viewAllBtn  = document.getElementById("viewAllDoubts");
  const overlay     = document.getElementById("doubtOverlay");
  const closeBtn    = document.getElementById("closeDoubt");
  const overlayList = document.getElementById("doubtOverlayList");

  if (!viewAllBtn || !overlay || !closeBtn || !overlayList) {
    console.warn("⚠ PART 6: Overlay elements missing");
    return;
  }

  viewAllBtn.addEventListener("click", () => {
    overlay.style.display = "flex";
    loadAllDoubts();
  });

  closeBtn.addEventListener("click", () => {
    overlay.style.display = "none";
  });

  async function loadAllDoubts() {
    overlayList.innerHTML = "⏳ Loading doubts...";

    const { data, error } = await window.supabaseClient
      .from("doubts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      overlayList.innerHTML = "❌ Failed";
      return;
    }

    overlayList.innerHTML = "";

    data.forEach(d => {
      overlayList.innerHTML += `
        <div class="admin-doubt-card">
          <p><b>❓ ${d.question}</b></p>

          ${d.status === "solved"
  ? `
    <div class="answer-box">${d.answer.replace(/\n/g,"<br>")}</div>

    <div class="admin-actions">
      <span class="solved-badge">🟢 Solved</span>

      <button class="danger"
        onclick="deleteDoubt('${d.id}')">
        🗑 Delete
      </button>
    </div>
  `
  : `
    <input id="greet_${d.id}" placeholder="Greeting (Hi 😊)">
    <textarea id="ans_${d.id}" placeholder="Type answer"></textarea>

    <div class="admin-actions">
      <button onclick="publishAnswer('${d.id}')">✅ Publish</button>

      <button class="danger"
        onclick="deleteDoubt('${d.id}')">
        🗑 Delete
      </button>
              <span class="pending-badge">🟡 Pending</span>
            `}
        </div>
      `;
    });
  }

  window.loadAllDoubts = loadAllDoubts;
});
/* =====================================================
   ADMIN PANEL — PART 7
   PUBLISH & DELETE ACTIONS (FIXED)
   ===================================================== */

window.publishAnswer = async function (id) {
  const ansEl = document.getElementById("ans_" + id);
  const greetEl = document.getElementById("greet_" + id);

  if (!ansEl || !ansEl.value.trim()) {
    alert("Answer likho pehle");
    return;
  }

  const finalAnswer =
    (greetEl && greetEl.value.trim()
      ? greetEl.value.trim() + "\n\n"
      : "") + ansEl.value.trim();

  const { error } = await window.supabaseClient
    .from("doubts")
    .update({
      answer: finalAnswer,
      status: "solved"
    })
    .eq("id", id);

  if (error) {
    alert("❌ Publish failed");
    console.error(error);
    return;
  }

  loadAllDoubts();
  loadMiniDoubts();
  loadDoubts();
updateDoubtBadge(); // ✅ ADD
};

window.deleteDoubt = async function (id) {
  if (!confirm("Delete this doubt?")) return;

  const { error } = await window.supabaseClient
    .from("doubts")
    .delete()
    .eq("id", id);

  if (error) {
    alert("❌ Delete failed");
    return;
  }

  loadAllDoubts();
  loadMiniDoubts();
  loadDoubts();
updateDoubtBadge(); // ✅ ADD
};
/* =====================================================
   ADMIN PANEL — PART 8
   GLOBAL SAFETY & AUTH GUARD
   ===================================================== */

(async () => {
  const { data } = await window.supabaseClient.auth.getUser();
  if (!data?.user) {
    alert("Session expired");
    location.href = "index.html";
  }
})();

window.addEventListener("error", e => {
  console.error("ADMIN JS ERROR:", e.message);
});

console.log("✅ Admin Panel JS loaded cleanly");
console.log("SUPABASE:", window.supabaseClient);
