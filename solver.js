/* =====================================================
   SOLVER.JS — MANUAL LANGUAGE SELECTION & CHAT ENGINE
   ===================================================== */

let userMsgCount = 0;    
let currentLanguage = 'hi'; // Default Language: Hinglish ('hi' ya 'en')

if (!window.supabaseClient) {
  console.error("❌ Supabase connection missing");
}

// ---- LANGUAGE TOGGLE HANDLER ----
function setLanguage(lang) {
  currentLanguage = lang;
  const btnHi = document.getElementById("langHi");
  const btnEn = document.getElementById("langEn");

  if (!btnHi || !btnEn) return;

  if (lang === 'hi') {
    btnHi.style.background = "#0284c7";
    btnHi.style.color = "#fff";
    btnHi.style.fontWeight = "bold";
    btnEn.style.background = "#334155";
    btnEn.style.color = "#cbd5e1";
    btnEn.style.fontWeight = "normal";
  } else {
    btnEn.style.background = "#0284c7";
    btnEn.style.color = "#fff";
    btnEn.style.fontWeight = "bold";
    btnHi.style.background = "#334155";
    btnHi.style.color = "#cbd5e1";
    btnHi.style.fontWeight = "normal";
  }
}

function getQuestion() {
  const el = document.getElementById("question");
  return el ? el.value.trim() : "";
}

function clearQuestionInput() {
  const el = document.getElementById("question");
  if (el) el.value = "";
}

function renderMathSafely(element) {
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    window.MathJax.typesetPromise([element]).catch((err) => console.warn("MathJax error:", err));
  } else if (window.MathJax && typeof window.MathJax.typeset === 'function') {
    window.MathJax.typeset([element]);
  }
}

function appendChatMessage(htmlContent, type = "ai") {
  const container = document.getElementById("answerHistory");
  if (!container) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-bubble ${type}`;
  msgDiv.innerHTML = htmlContent;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;

  renderMathSafely(msgDiv);
}

function cleanAIResponse(rawText) {
  let text = rawText || "";
  if (text.includes("Step 1") || text.includes("Step1") || text.includes("चरण 1")) {
    const matchIdx = text.search(/(Step 1|Step1|चरण 1|Given|दिया गया)/i);
    if (matchIdx !== -1) text = text.substring(matchIdx);
  }
  return text
    .replace(/I need to follow.*?\n/gi, "")
    .replace(/Let's look at.*?\n/gi, "")
    .replace(/Drafting response.*?\n/gi, "")
    .replace(/Strict instructions.*?\n/gi, "")
    .trim();
}

function getSessionId() {
  let sid = localStorage.getItem("solver_sid");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("solver_sid", sid);
  }
  return sid;
}

/* =====================================================
   DRAGGABLE MOVABLE FAB BUTTON LOGIC
   ===================================================== */
function makeFABMovable() {
  const fab = document.querySelector(".doubt-fab");
  if (!fab) return;

  let isDragging = false;
  let currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

  function dragStart(e) {
    if (e.type === "touchstart") {
      initialX = e.touches[0].clientX - xOffset;
      initialY = e.touches[0].clientY - yOffset;
    } else {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
    }
    if (e.target === fab || fab.contains(e.target)) {
      isDragging = true;
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      if (e.type === "touchmove") {
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;
      } else {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
      }
      xOffset = currentX;
      yOffset = currentY;
      setTranslate(currentX, currentY, fab);
    }
  }

  function dragEnd() {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }

  fab.addEventListener("touchstart", dragStart, false);
  fab.addEventListener("touchend", dragEnd, false);
  fab.addEventListener("touchmove", drag, false);

  fab.addEventListener("mousedown", dragStart, false);
  fab.addEventListener("mouseup", dragEnd, false);
  fab.addEventListener("mousemove", drag, false);
}

/* =====================================================
   WELCOME MENU & BUTTON HANDLERS
   ===================================================== */

function renderWelcomeMenu() {
  const welcomeHtml = `
    <b>👋 Welcome to ROITX AI Assistant!</b><br>
    Main aapka personal study tutor hu. Aap mujhse kisi bhi subject ke <b>Numerical Problems, Theory, Definitions, ya Concepts</b> pooch sakte hain.<br><br>
    <i>Upar diye gaye language button se language select karein aur niche question type karein:</i>
    
    <div class="option-buttons" style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
      <button class="menu-btn" onclick="triggerMenuAction('math')">📐 Solve Math / Physics</button>
      <button class="menu-btn" onclick="triggerMenuAction('theory')">📚 Explain Theory</button>
      <button class="menu-btn" onclick="triggerMenuAction('help')">❓ Help & Guidance</button>
    </div>
  `;
  appendChatMessage(welcomeHtml, "ai");
}

function triggerMenuAction(action) {
  if (action === 'math') {
    appendChatMessage("📐 Kripya apna Math, Physics ya Chemistry ka problem/equation neeche box me likhein.", "ai");
  } else if (action === 'theory') {
    appendChatMessage("📚 Aap Biology, Chemistry, Physics ya kisi bhi subject ki theory/definition pooch sakte hain. Type karein!", "ai");
  } else if (action === 'help') {
    appendChatMessage("❓ Main Class 9th-12th ke sabhi subjects ke doubt solve kar sakta hu. Seedhe type karke puchhein!", "ai");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderWelcomeMenu();
  checkSolvedNotification();
  makeFABMovable();
});

/* =====================================================
   SINGLE & UNIFIED AI SOLVER ENGINE
   ===================================================== */

async function solveWithAI(questionText) {
  const loadingId = "loading-" + Date.now();
  appendChatMessage(`<span id="${loadingId}">⏳ Processing solution...</span>`, "ai");

  const sendBtn = document.getElementById("solveBtn");
  if (sendBtn) sendBtn.disabled = true;

  const SUPABASE_FUNCTION_URL = "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YXN0d2Vobm5xaWNyaWtuZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTk5NTEsImV4cCI6MjA4MDgzNTk1MX0.5_UvwaG0X8k_Emj-cMC0KjEqlvU6hgAt5IsHJdgARvk"; 

  const targetLangStr = currentLanguage === 'en' ? 'English' : 'Hindi / Hinglish';
  const PROMPT = `You are an expert study tutor for Class 9-12 students.
Task: Explain and solve the following user query clearly in ${targetLangStr}.
INSTRUCTIONS:
1. If MATH/PHYSICS NUMERICAL: Give step-by-step mathematical derivation using LaTeX ($...$ for inline, $$...$$ for display).
2. If THEORY/CONCEPT: Explain clearly with bullet points and bold subheadings.
3. Absolutely NO thinking process, rules analysis, or extra chatter. Start DIRECTLY with the main concept or solution.`;

  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ 
        prompt: `${PROMPT}\n\nTask: ${questionText}`,
        language: currentLanguage // Manual selected language yahan pass ho rahi hai
      })
    });

    const data = await response.json();
    console.log("Response Data:", data);

    const loadingElem = document.getElementById(loadingId);
    if (loadingElem) loadingElem.parentElement.remove();

    let rawText = "";

    // Dual Parser for both OpenAI & Gemini structures
    if (data.choices && data.choices[0]?.message?.content) {
      rawText = data.choices[0].message.content;
    } else if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      rawText = data.candidates[0].content.parts[0].text;
    } else if (data.content) {
      rawText = data.content;
    } else if (data.error) {
      let errMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
      if (errMsg.includes("Quota exceeded") || errMsg.includes("rate-limits")) {
        throw new Error("⏳ AI Rate Limit Full: Kripya kuch samay rukiye aur dobara try karein.");
      }
      throw new Error(errMsg);
    }

    if (rawText) {
      const cleanContent = cleanAIResponse(rawText);
      let formattedAnswer = cleanContent.replace(/\n/g, "<br>");

      let adminFooter = "";
      if (userMsgCount >= 6) {
        adminFooter = `
          <br><br>
          <div style="font-size:11px; opacity:0.8; margin-top:6px; border-top:1px solid #374151; padding-top:4px;">
            Kya aapko jawab samajh nahi aaya? 
            <a href="#" onclick="sendToAdmin(&quot;${escapeHtml(questionText)}&quot;); return false;" style="color:#f59e0b; text-decoration:underline;">Admin ko Feedback bhejen</a>
          </div>`;
      }

      appendChatMessage(`<b>💡 Solution / Answer:</b><br><br>${formattedAnswer}${adminFooter}`, "ai");
    } else {
      appendChatMessage(`⚠️ Server Error: Invalid response structure received.`, "system-error");
    }

  } catch (err) {
    console.error("Full Error Debug:", err);
    const loadingElem = document.getElementById(loadingId);
    if (loadingElem) loadingElem.parentElement.remove();
    appendChatMessage(`⚠️ Error: ${err.message || 'Network issue'}.`, "system-error");
  } finally {
    const sendBtn = document.getElementById("solveBtn");
    if (sendBtn) sendBtn.disabled = false;
  }
}

/* =====================================================
   MAIN SOLVE TRIGGER
   ===================================================== */

function solve() {
  const qRaw = getQuestion();
  if (!qRaw) return;

  userMsgCount++; 
  appendChatMessage(escapeHtml(qRaw), "user");
  clearQuestionInput();

  solveWithAI(qRaw);
}

/* =====================================================
   ADMIN FEEDBACK & PANEL LOGIC
   ===================================================== */

async function sendToAdmin(customQuestion = null) {
  const user = await window.getCurrentUser();
  if (!user) {
    alert("🔒 Feedback bhejne ke liye login karna zaroori hai!");
    sessionStorage.setItem("redirect_after_login", window.location.href);
    window.location.href = window.getPageUrl ? window.getPageUrl("login.html") : "login.html";
    return;
  }

  const question = customQuestion || getQuestion();
  if (!question) return;

  let fullName = user.email ? user.email.split('@')[0] : "User";
  let avatarUrl = "";

  try {
    const { data: profileData } = await window.supabaseClient
      .from('profiles').select('full_name, avatar_url').eq('id', user.id).single();
    if (profileData) {
      if (profileData.full_name) fullName = profileData.full_name;
      if (profileData.avatar_url) avatarUrl = profileData.avatar_url;
    }
  } catch (err) {}

  const { error } = await window.supabaseClient.from("doubts").insert([{
    question: question,
    status: "pending",
    session_id: getSessionId(),
    user_id: user.id,
    user_email: user.email,
    user_name: fullName,
    user_photo: avatarUrl
  }]);

  if (!error) {
    alert("✅ Feedback Admin ko bhej diya gaya hai!");
    appendChatMessage(`📩 <i>Feedback Admin ko bhej diya gaya hai: "${escapeHtml(question)}"</i>`, "system-error");
  }
}

function toggleMyDoubt() {
  const panel = document.getElementById("myDoubtPanel");
  if (!panel) return;
  panel.style.display = panel.style.display === "block" ? "none" : "block";
  if (panel.style.display === "block") { loadMyDoubts(); hideNotifyDot(); }
}

async function loadMyDoubts() {
  const list = document.getElementById("doubtList");
  if (!list) return;
  list.innerHTML = "⏳ Loading...";

  const { data, error } = await window.supabaseClient
    .from("doubts").select("*").eq("session_id", getSessionId()).order("created_at", { ascending: false });

  if (error || !data || !data.length) {
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
        ${d.answer ? `<div style="margin-top:4px; color:#4ade80;">${d.answer.replace(/\n/g,"<br>")}</div>` : ""}
      </div>`;
  });
}

function hideNotifyDot() {
  const dot = document.getElementById("notifyDot");
  if (dot) dot.style.display = "none";
}

async function checkSolvedNotification() {
  const dot = document.getElementById("notifyDot");
  if (!dot) return;
  const { data } = await window.supabaseClient.from("doubts").select("id").eq("session_id", getSessionId()).eq("status", "solved");
  if (data && data.length > 0) dot.style.display = "block";
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
