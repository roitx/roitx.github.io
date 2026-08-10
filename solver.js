/* =====================================================
   PART 1 — BASIC HELPERS & SAFETY
   ===================================================== */

if (!window.supabaseClient) {
  console.error("❌ Supabase not connected");
}

function getQuestion() {
  const el = document.getElementById("question");
  return el ? el.value.trim() : "";
}

function clearQuestionInput() {
  const el = document.getElementById("question");
  if (el) el.value = "";
}

// Append messages continuously to chat container
function appendChatMessage(htmlContent, type = "ai") {
  const container = document.getElementById("answerHistory");
  if (!container) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-bubble ${type}`;
  msgDiv.innerHTML = htmlContent;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
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
   PART 3 — SEND FEEDBACK / QUESTION TO ADMIN (AUTH & USER DETAILS)
   Keep database table name 'doubts' untouched for safety!
   ===================================================== */

async function sendToAdmin(customQuestion = null) {
  // 1. Check if user is logged in
  const user = await window.getCurrentUser();
  if (!user) {
    alert("🔒 Feedback bhejne ke liye login karna zaroori hai!");
    sessionStorage.setItem("redirect_after_login", window.location.href);
    window.location.href = window.getPageUrl ? window.getPageUrl("login.html") : "login.html";
    return;
  }

  const question = customQuestion || getQuestion();
  if (!question) {
    alert("❌ Kripya koi question ya feedback likhein.");
    return;
  }

  // 2. Fetch user profile details (Name & Photo) from 'profiles' table
  let fullName = user.email ? user.email.split('@')[0] : "User";
  let avatarUrl = "";

  try {
    const { data: profileData } = await window.supabaseClient
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileData) {
      if (profileData.full_name) fullName = profileData.full_name;
      if (profileData.avatar_url) avatarUrl = profileData.avatar_url;
    }
  } catch (err) {
    console.warn("Could not fetch user profile details for feedback:", err);
  }

  // 3. Insert into 'doubts' table along with Name, Email & Photo
  const { error } = await window.supabaseClient
    .from("doubts") // Kept as 'doubts' to protect database!
    .insert([{
      question: question,
      status: "pending",
      session_id: getSessionId(),
      user_id: user.id,
      user_email: user.email,
      user_name: fullName,
      user_photo: avatarUrl
    }]);

  if (error) {
    alert("❌ Error sending feedback: " + error.message);
    console.error(error);
  } else {
    alert("✅ Feedback Admin ko bhej diya gaya hai!");
    appendChatMessage(`📩 <i>Feedback Admin ko bhej diya gaya hai: "${escapeHtml(question)}"</i>`, "system-error");
    clearQuestionInput();
  }
}

/* =====================================================
   PART 4 — MY FEEDBACKS PANEL (READ FROM 'doubts' TABLE)
   ===================================================== */

function toggleMyDoubt() {
  const panel = document.getElementById("myDoubtPanel");
  if (!panel) return;

  panel.style.display = panel.style.display === "block" ? "none" : "block";

  if (panel.style.display === "block") {
    loadMyDoubts();
    hideNotifyDot();
  }
}

async function loadMyDoubts() {
  const list = document.getElementById("doubtList");
  if (!list) return;

  list.innerHTML = "⏳ Loading your feedbacks...";

  const { data, error } = await window.supabaseClient
    .from("doubts") // Supabase table preserved
    .select("*")
    .eq("session_id", getSessionId())
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = "❌ Error loading history";
    console.error(error);
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = "<em>Abhi tak koi feedback nahi hai.</em>";
    return;
  }

  list.innerHTML = "";

  data.forEach(d => {
    const s = d.status || "pending";

    list.innerHTML += `
      <div class="doubt-item">
        <div><b>Q:</b> ${escapeHtml(d.question)}</div>
        <div style="margin-top:4px;"><b>Status:</b> <span class="${s}">${s.toUpperCase()}</span></div>

        ${d.greeting ? `
          <div style="margin-top:4px; color:#3aa0ff;">
            ${d.greeting.replace(/\n/g,"<br>")}
          </div>` : ""}

        ${d.answer ? `
          <div style="margin-top:4px; background:#0e1a2a; padding:6px; border-radius:6px; color:#4ade80;">
            ${d.answer.replace(/\n/g,"<br>")}
          </div>` : ""}
      </div>
    `;
  });
}

/* =====================================================
   PART 5 — NOTIFICATION DOT
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
   PART 6 — STEP BY STEP SOLVER WITH GROQ AI FALLBACK
   ===================================================== */

async function solveWithGroq(questionText) {
  // Show temporary loading bubble
  const loadingId = "loading-" + Date.now();
  appendChatMessage(`<span id="${loadingId}">⏳ AI Solution soch raha hai...</span>`, "ai");

  const SUPABASE_FUNCTION_URL = "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YXN0d2Vobm5xaWNyaWtuZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTk5NTEsImV4cCI6MjA4MDgzNTk1MX0.5_UvwaG0X8k_Emj-cMC0KjEqlvU6hgAt5IsHJdgARvk"; 

  const promptText = `
You are an expert study tutor for students.
Please solve this question step-by-step with clear explanations in simple Hindi/Hinglish.
If you do NOT know the exact answer or if the input is unclear/ambiguous, state that you cannot understand it clearly.

Question: ${questionText}
`;

  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ prompt: promptText })
    });

    const data = await response.json();
    const loadingElem = document.getElementById(loadingId);
    
    if (loadingElem) {
      loadingElem.parentElement.remove(); // Remove loading bubble
    }

    if (response.ok && data.choices && data.choices[0]?.message?.content) {
      const aiContent = data.choices[0].message.content;
      
      // Check if AI expresses uncertainty
      if (aiContent.toLowerCase().includes("nahi samajh") || aiContent.toLowerCase().includes("unclear") || aiContent.length < 15) {
        showFallbackAdminOption(questionText);
      } else {
        const formattedAnswer = aiContent.replace(/\n/g, "<br>");
        appendChatMessage(`
          <b>🧠 AI Solution:</b><br><br>
          ${formattedAnswer}
          <br><br>
          <div style="font-size:11px; opacity:0.8; margin-top:6px; border-top:1px solid #374151; padding-top:4px;">
            Kya yeh solution samajh nahi aaya? 
            <a href="#" onclick="sendToAdmin('${escapeHtml(questionText)}'); return false;" style="color:#f59e0b; text-decoration:underline;">Admin ko Feedback bhejeyin</a>
          </div>
        `, "ai");
      }
    } else {
      showFallbackAdminOption(questionText);
    }
  } catch (err) {
    console.error(err);
    const loadingElem = document.getElementById(loadingId);
    if (loadingElem) loadingElem.parentElement.remove();
    showFallbackAdminOption(questionText);
  }
}

function showFallbackAdminOption(qText) {
  const safeQ = escapeHtml(qText);
  appendChatMessage(`
    <b>🤔 Mujhe yeh question samajh nahi aaya.</b><br>
    Kripya ise Feedback ke roop mein Admin ko bhejen, hum ise jald hi solve kar denge!<br><br>
    <button class="feedback-btn" onclick="sendToAdmin('${safeQ}')">📩 Admin Ko Feedback Bhejen</button>
  `, "system-error");
}

/* =====================================================
   MAIN SOLVE TRIGGER (CONTINUOUS FLOW)
   ===================================================== */

function solve() {
  const qRaw = getQuestion();

  if (!qRaw) {
    alert("❌ Kripya pehle question likhein!");
    return;
  }

  // Add User Question to Chat History Stream
  appendChatMessage(escapeHtml(qRaw), "user");
  clearQuestionInput();

  let q = qRaw
    .toLowerCase()
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\s+/g, " ")
    .trim();

  /* ---------- SIMPLE MATH CALCULATION ---------- */
  if (/^[0-9+\-*/(). ]+$/.test(q)) {
    try {
      const result = eval(q);
      appendChatMessage(`
        <b>🔢 Direct Math Calculation:</b><br>
        <b>Step 1:</b> ${q}<br>
        <b>✅ Answer:</b> ${result}
      `, "ai");
      return;
    } catch {}
  }

  /* ---------- PERCENTAGE ---------- */
  if (/^(\d+)\s*%\s*of\s*(\d+)$/.test(q)) {
    const [, p, n] = q.match(/^(\d+)\s*%\s*of\s*(\d+)$/);
    appendChatMessage(`<b>✅ Answer:</b> ${(p/100)*n}`, "ai");
    return;
  }

  /* ---------- LINEAR EQUATION ---------- */
  if (/^(\d*)x\s*([\+\-])\s*(\d+)\s*=\s*(\d+)$/.test(q)) {
    const [, a1, op, b, c] = q.match(/^(\d*)x\s*([\+\-])\s*(\d+)\s*=\s*(\d+)$/);
    const a = a1 === "" ? 1 : Number(a1);
    const rhs = op === "+" ? c - b : Number(c) + Number(b);

    appendChatMessage(`<b>✅ Answer:</b> x = ${rhs / a}`, "ai");
    return;
  }

  /* ---------- AI FALLBACK ---------- */
  solveWithGroq(qRaw);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}
