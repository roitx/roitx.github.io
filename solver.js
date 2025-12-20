/* =====================================================
   PART 1 — BASIC HELPERS & SAFETY
   ===================================================== */

if (!window.supabaseClient) {
  console.error("❌ Supabase not connected");
}

/* ---------- GET QUESTION ---------- */
function getQuestion() {
  const el = document.getElementById("question");
  return el ? el.value.trim() : "";
}

/* ---------- SET ANSWER ---------- */
function setAnswer(html) {
  const el = document.getElementById("answer");
  if (el) el.innerHTML = html;
}
/* =====================================================
   PART 2 — SESSION ID (NO LOGIN)
   ===================================================== */

function getSessionId() {
  let sid = localStorage.getItem("solver_sid");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("solver_sid", sid);
  }
  return sid;
}
/* =====================================================
   PART 3 — SEND DOUBT TO ADMIN
   ===================================================== */

async function sendToAdmin() {
  const question = getQuestion();
  if (!question) {
    alert("❌ Question empty hai");
    return;
  }

  const { error } = await window.supabaseClient
    .from("doubts")
    .insert([{
      question: question,
      status: "pending",
      session_id: getSessionId()
    }]);

  if (error) {
    alert("❌ Error sending doubt");
    console.error(error);
  } else {
    alert("✅ Question admin ko bhej diya");
  }
}
/* =====================================================
   PART 4 — MY DOUBTS PANEL
   ===================================================== */

function toggleMyDoubt() {
  const panel = document.getElementById("myDoubtPanel");
  if (!panel) return;

  panel.style.display =
    panel.style.display === "block" ? "none" : "block";

  if (panel.style.display === "block") {
    loadMyDoubts();
    hideNotifyDot();
  }
}

async function loadMyDoubts() {
  const list = document.getElementById("doubtList");
  if (!list) return;

  list.innerHTML = "⏳ Loading...";

  const { data, error } = await window.supabaseClient
    .from("doubts")
    .select("*")
    .eq("session_id", getSessionId())
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = "❌ Error loading";
    console.error(error);
    return;
  }

  if (!data.length) {
    list.innerHTML = "<em>No doubts yet</em>";
    return;
  }

  list.innerHTML = "";

  data.forEach(d => {
    const s = d.status || "pending";

    list.innerHTML += `
      <div class="doubt-item ${s}">
        <div><b>Q:</b> ${d.question}</div>
        <div><b>Status:</b> ${s.toUpperCase()}</div>

        ${d.greeting ? `
          <div class="greet-bubble">
            ${d.greeting.replace(/\n/g,"<br>")}
          </div>` : ""}

        ${d.answer ? `
          <div class="answer-box">
            ${d.answer.replace(/\n/g,"<br>")}
          </div>` : ""}
      </div>
    `;
  });
}
/* =====================================================
   PART 5 — SOLVED NOTIFICATION DOT
   ===================================================== */

function hideNotifyDot() {
  const dot = document.getElementById("notifyDot");
  if (dot) dot.style.display = "none";
}

async function checkSolvedNotification() {
  const dot = document.getElementById("notifyDot");
  if (!dot) return;

  const { data } = await window.supabaseClient
    .from("doubts")
    .select("id")
    .eq("session_id", getSessionId())
    .eq("status", "solved");

  if (data && data.length > 0) {
    dot.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", checkSolvedNotification);
/* =====================================================
   PART 6 — STEP BY STEP SOLVER (FINAL)
   ===================================================== */

function solve() {
  const qRaw = getQuestion();
  setAnswer("");

  if (!qRaw) {
    setAnswer("❌ Question likho pehle");
    return;
  }

  let q = qRaw
    .toLowerCase()
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\s+/g, " ")
    .trim();

  /* ---------- SIMPLE CALCULATION ---------- */
  if (/^[0-9+\-*/(). ]+$/.test(q)) {
    try {
      const result = eval(q);
      setAnswer(`
        <div class="step"><b>Step 1:</b> ${q}</div>
        <div class="step"><b>Step 2:</b> BODMAS apply</div>
        <div class="step final"><b>✅ Answer:</b> ${result}</div>
      `);
      return;
    } catch {}
  }

  /* ---------- PERCENTAGE ---------- */
  if (/^(\d+)\s*%\s*of\s*(\d+)$/.test(q)) {
    const [, p, n] = q.match(/^(\d+)\s*%\s*of\s*(\d+)$/);
    setAnswer(`<b>Answer:</b> ${(p/100)*n}`);
    return;
  }

  /* ---------- LINEAR EQUATION ---------- */
  if (/^(\d*)x\s*([\+\-])\s*(\d+)\s*=\s*(\d+)$/.test(q)) {
    const [, a1, op, b, c] =
      q.match(/^(\d*)x\s*([\+\-])\s*(\d+)\s*=\s*(\d+)$/);

    const a = a1 === "" ? 1 : Number(a1);
    const rhs = op === "+" ? c - b : Number(c) + Number(b);

    setAnswer(`<b>Answer:</b> x = ${rhs / a}`);
    return;
  }

  /* ---------- FALLBACK ---------- */
  setAnswer(`
    ❌ Auto solution available nahi hai<br><br>
    <button onclick="sendToAdmin()">📩 Send to Admin</button>
  `);
}