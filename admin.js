/* =====================================================
   ADMIN PANEL — GLOBAL HELPERS & AUTH
   ===================================================== */

const supabase = window.supabaseClient;

// Page Navigation
function goUpload() {
    window.location.href = "refbook.html"; // Aapki reference book file ka naam
}

async function logout() {
    await supabase.auth.signOut();
    window.location.href = "index.html";
}

// Session Guard: Check if user is logged in
(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
        alert("Session expired or No Access");
        window.location.href = "index.html";
    }
})();

/* =====================================================
   PART 2: NOTES UPLOAD & FILE LIST
   ===================================================== */

async function uploadFile() {
    const fileInput = document.getElementById("fileUpload");
    const file = fileInput?.files[0];
    const msg = document.getElementById("uploadMsg");

    if (!file) return alert("❌ PDF select karo");
    if (!file.name.toLowerCase().endsWith(".pdf")) return alert("❌ Sirf PDF allowed");

    const cls = document.getElementById("classSelect").value;
    const sub = document.getElementById("subjectSelect").value;
    const ch = document.getElementById("chapterSelect").value;

    if (!cls || !sub || !ch) return alert("❌ Details select karo");

    const classNum = cls.replace("class", "");
    const fileName = `${classNum}_${sub}_${ch}.pdf`;

    msg.innerText = "⏳ Uploading...";

    const { error } = await supabase.storage
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

async function loadFiles() {
    const list = document.getElementById("fileList");
    if (!list) return;

    list.innerHTML = "⏳ Loading files...";
    const { data, error } = await supabase.storage.from("admin-files").list("notes");

    if (error) return list.innerHTML = "❌ Error loading files";
    if (!data.length) return list.innerHTML = "<em>No files</em>";

    list.innerHTML = "";
    data.forEach(file => {
        const row = document.createElement("div");
        row.innerHTML = `
            <span>${file.name}</span>
            <div>
                <button onclick="openFile('${file.name}')">Open</button>
                <button class="delete-btn" onclick="deleteFile('${file.name}')">🗑</button>
            </div>
        `;
        list.appendChild(row);
    });
}

async function openFile(name) {
    const { data } = await supabase.storage.from("admin-files").createSignedUrl(`notes/${name}`, 60);
    if (data) window.open(data.signedUrl, "_blank");
}

async function deleteFile(name) {
    if (!confirm("Delete file?")) return;
    await supabase.storage.from("admin-files").remove([`notes/${name}`]);
    loadFiles();
}

/* =====================================================
   PART 3: CALENDAR SYSTEM
   ==================================================== */

async function addEvent() {
    const date = document.getElementById("eventDate")?.value;
    const name = document.getElementById("eventName")?.value.trim();
    const msg = document.getElementById("eventMsg");

    if (!date || !name) return alert("Date and Name required");

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("events").insert([{ user_id: user.id, event_date: date, event_name: name }]);

    if (error) return msg.innerText = "❌ Error adding event";
    msg.innerText = "✅ Event added";
    document.getElementById("eventName").value = "";
    loadEvents();
}

async function loadEvents() {
    const list = document.getElementById("eventList");
    if (!list) return;

    const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    if (error) return;

    list.innerHTML = data.length ? "" : "<em>No events</em>";
    data.forEach(ev => {
        const row = document.createElement("div");
        row.innerHTML = `<span><b>${ev.event_date}</b> — ${ev.event_name}</span>
                         <button class="delete-btn" onclick="deleteEvent(${ev.id})">🗑</button>`;
        list.appendChild(row);
    });
}

async function deleteEvent(id) {
    if (confirm("Delete event?")) {
        await supabase.from("events").delete().eq("id", id);
        loadEvents();
    }
}

/* =====================================================
   PART 4: FORMULA SYSTEM
   ==================================================== */

window.uploadFormula = async function () {
    const statusBox = document.getElementById("uploadStatus");
    const fClass = document.getElementById("fClass").value;
    const fType = document.getElementById("fType").value;
    const fSub = document.getElementById("fSubject").value;
    const fCh = document.getElementById("fChapter").value;
    const publish = document.getElementById("publishCheck").checked;

    if (!fClass || !fType) return alert("Select basic fields");

    statusBox.innerText = "⏳ Processing...";
    const { data: { user } } = await supabase.auth.getUser();

    let formulaText = null;
    let filePath = null;

    if (fType === "text") {
        formulaText = document.getElementById("formulaText").value.trim();
        if (!formulaText) return alert("Enter formula text");
    } else {
        const file = document.getElementById("formulaFile").files[0];
        if (!file) return alert("Select file");
        filePath = `formulas/${Date.now()}_${file.name}`;
        await supabase.storage.from("admin-files").upload(filePath, file);
    }

    const { error } = await supabase.from("formulas").insert([{
        user_id: user.id, class: fClass, subject: fSub, chapter: fCh,
        type: fType, formula_text: formulaText, file_path: filePath, publish: publish
    }]);

    if (!error) {
        alert("✅ Uploaded");
        location.reload();
    }
};

/* =====================================================
   PART 5 & 6: DOUBT SYSTEM (MINI & FULL)
   ==================================================== */

// Toggle Mini Doubt Panel
document.addEventListener("DOMContentLoaded", () => {
    const doubtBtn = document.getElementById("doubtBtn");
    const doubtPanel = document.getElementById("doubtPanel");

    if (doubtBtn) {
        doubtBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            doubtPanel.style.display = doubtPanel.style.display === "none" ? "block" : "none";
            loadMiniDoubts();
        });
    }

    document.addEventListener("click", (e) => {
        if (doubtPanel && !doubtPanel.contains(e.target)) doubtPanel.style.display = "none";
    });

    updateDoubtBadge();
});

async function loadMiniDoubts() {
    const list = document.getElementById("doubtList");
    const { data, error } = await supabase.from("doubts").select("*").order("created_at", { ascending: false }).limit(5);
    if (error) return;

    list.innerHTML = "";
    data.forEach(d => {
        list.innerHTML += `<div class="admin-doubt-card"><b>❓ ${d.question}</b><br>
                           <small>${d.status === "solved" ? "🟢 Solved" : "🟡 Pending"}</small></div>`;
    });
}

async function updateDoubtBadge() {
    const badge = document.getElementById("pendingCount");
    const { count, error } = await supabase.from("doubts").select("*", { count: "exact", head: true }).neq("status", "solved");
    if (!error && badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? "inline-flex" : "none";
    }
}

// Full Overlay Toggle
document.addEventListener("DOMContentLoaded", () => {
    const viewAllBtn = document.getElementById("viewAllDoubts");
    const closeBtn = document.getElementById("closeDoubt");
    const overlay = document.getElementById("doubtOverlay");

    if (viewAllBtn) viewAllBtn.addEventListener("click", () => {
        overlay.style.display = "flex";
        loadAllDoubts();
    });
    if (closeBtn) closeBtn.addEventListener("click", () => overlay.style.display = "none");
});

async function loadAllDoubts() {
    const list = document.getElementById("doubtOverlayList");
    const { data, error } = await supabase.from("doubts").select("*").order("created_at", { ascending: false });
    if (error) return;

    list.innerHTML = "";
    data.forEach(d => {
        const isSolved = d.status === "solved";
        list.innerHTML += `
        <div class="admin-doubt-card">
          <p><b>❓ ${d.question}</b></p>
          ${isSolved ? `<p class="solved-badge">🟢 Solved</p><div class="box">${d.answer}</div>` : 
          `<input id="greet_${d.id}" placeholder="Hi Student 😊">
           <textarea id="ans_${d.id}" placeholder="Enter detailed answer"></textarea>
           <button onclick="publishAnswer('${d.id}')">✅ Publish</button>`}
          <button class="delete-btn" style="background:red" onclick="deleteDoubt('${d.id}')">🗑 Delete</button>
        </div>`;
    });
}

/* =====================================================
   PART 7: ACTIONS
   ==================================================== */

window.publishAnswer = async function (id) {
    const ans = document.getElementById("ans_" + id).value.trim();
    const greet = document.getElementById("greet_" + id).value.trim();
    if (!ans) return alert("Answer likho!");

    const finalAnswer = greet ? `${greet}\n\n${ans}` : ans;

    const { error } = await supabase.from("doubts").update({ answer: finalAnswer, status: "solved" }).eq("id", id);
    if (!error) {
        loadAllDoubts();
        updateDoubtBadge();
    }
};

window.deleteDoubt = async function (id) {
    if (confirm("Delete doubt?")) {
        await supabase.from("doubts").delete().eq("id", id);
        loadAllDoubts();
        updateDoubtBadge();
    }
};

// Initial Load
document.addEventListener("DOMContentLoaded", () => {
    loadFiles();
    loadEvents();
});
