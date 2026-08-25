/* =====================================================
   SOLVER.JS — HYBRID CHATBOT, QUEUE ENGINE & MODAL PANEL
   ===================================================== */

let userMsgCount = 0;    
let currentLanguage = 'hinglish'; 
let selectedSubject = 'General';

if (!window.supabaseClient) {
  console.error("❌ Supabase connection missing");
}

/* =====================================================
   INLINE SVG ICONS LIBRARY
   ===================================================== */
const SVG_ICONS = {
  math: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19l4-14 4 14 4-14 4 14"></path></svg>`,
  physics: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
  help: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  menu: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>`,
  refresh: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>`,
  queue: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  home: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
  lang: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
  admin: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>`
};

/* =====================================================
   DRAGGABLE MOVABLE FAB BUTTON LOGIC
   ===================================================== */
function makeFABMovable() {
  const fab = document.querySelector(".doubt-fab");
  if (!fab) return;

  let isDragging = false;
  let hasMoved = false;
  let currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

  function dragStart(e) {
    hasMoved = false;
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
      hasMoved = true;
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

  fab.addEventListener("click", (e) => {
    if (hasMoved) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  fab.addEventListener("touchstart", dragStart, { passive: false });
  fab.addEventListener("touchend", dragEnd, { passive: false });
  fab.addEventListener("touchmove", drag, { passive: false });

  fab.addEventListener("mousedown", dragStart, false);
  window.addEventListener("mouseup", dragEnd, false);
  window.addEventListener("mousemove", drag, false);
}

/* =====================================================
   HELPER UTILITIES
   ===================================================== */

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
  scrollToBottom();

  renderMathSafely(msgDiv);
}

function scrollToBottom() {
  const container = document.getElementById("answerHistory");
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
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

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* =====================================================
   INTERACTIVE MENU FLOW & ADMIN DOUBT MODAL
   ===================================================== */

function renderLanguageSelection() {
  const cardHTML = `
    <div class="interactive-card">
      <div class="card-text">
        Namaste 🙏 Welcome to ROITX AI Tutor.<br>
        Kripya apni pasandida bhasha chunein / Choose your language:
      </div>
      <div class="interactive-btn-group">
        <button class="wa-action-btn" onclick="selectLanguage('hinglish', 'Hinglish (Mix)')">
          ${SVG_ICONS.lang} Hinglish (Mix)
        </button>
        <button class="wa-action-btn" onclick="selectLanguage('hi', 'हिंदी (Hindi)')">
          ${SVG_ICONS.lang} हिंदी (Hindi)
        </button>
        <button class="wa-action-btn" onclick="selectLanguage('en', 'English')">
          ${SVG_ICONS.lang} English
        </button>
      </div>
    </div>
  `;
  appendChatMessage(cardHTML, "ai");
}

function selectLanguage(lang, label) {
  currentLanguage = lang;
  appendChatMessage(label, "user");

  setTimeout(() => {
    renderFieldSelection();
  }, 200);
}

function renderFieldSelection() {
  let promptText = "Apna vishay / subject chunein:";
  let mainText = "Main Menu";

  if (currentLanguage === 'hi') {
    promptText = "कृपया अपना विषय (Subject) चुनें:";
    mainText = "मुख्य मेनू (Main Menu)";
  } else if (currentLanguage === 'en') {
    promptText = "Please select your study subject:";
    mainText = "Main Menu";
  }

  const cardHTML = `
    <div class="interactive-card">
      <div class="card-text">${promptText}</div>
      <div class="interactive-btn-group">
        <button class="wa-action-btn" onclick="selectField('Mathematics')">
          ${SVG_ICONS.math} Mathematics (गणित)
        </button>
        <button class="wa-action-btn" onclick="selectField('Physics')">
          ${SVG_ICONS.physics} Physics (भौतिक विज्ञान)
        </button>
        <button class="wa-action-btn" onclick="selectField('General Doubt')">
          ${SVG_ICONS.help} General Math & Science Doubt
        </button>
        <button class="wa-action-btn" onclick="renderMainMenu()">
          ${SVG_ICONS.menu} ${mainText}
        </button>
      </div>
    </div>
  `;
  appendChatMessage(cardHTML, "ai");
}

function selectField(field) {
  selectedSubject = field;
  appendChatMessage(field, "user");

  setTimeout(() => {
    let responseText = `Aapka vishay <b>${field}</b> select ho gaya hai! Aap neeche input box me apna sawaal type kijiye, main realtime read kar raha hu aur turant solution bhej dunga.`;
    if (currentLanguage === 'hi') {
      responseText = `आपका विषय <b>${field}</b> सेलेक्ट हो गया है! आप नीचे इनपुट बॉक्स में अपना सवाल टाइप कीजिए, मैं रियल-टाइम रीड कर रहा हूँ और तुरंत सॉल्यूशन भेज दूंगा।`;
    } else if (currentLanguage === 'en') {
      responseText = `Your subject <b>${field}</b> is selected! Please type your question in the input box below. I'm reading in real-time and will provide an instant solution.`;
    }

    const cardHTML = `
      <div class="interactive-card">
        <div class="card-text">${responseText}</div>
        <div class="interactive-btn-group">
          <button class="wa-action-btn" onclick="openAdminDoubtModal()">
            ${SVG_ICONS.admin} Send Doubt to Admin
          </button>
          <button class="wa-action-btn" onclick="renderFieldSelection()">
            ${SVG_ICONS.refresh} Change Subject
          </button>
          <button class="wa-action-btn" onclick="checkQueueStatus()">
            ${SVG_ICONS.queue} Check Queue Status
          </button>
          <button class="wa-action-btn" onclick="renderMainMenu()">
            ${SVG_ICONS.home} Main Menu
          </button>
        </div>
      </div>
    `;
    appendChatMessage(cardHTML, "ai");
  }, 200);
}

function renderMainMenu() {
  appendChatMessage(currentLanguage === 'hi' ? 'मुख्य मेनू' : 'Main Menu', "user");
  setTimeout(() => {
    renderLanguageSelection();
  }, 200);
}

// QUEUE STATUS CHECKER
async function checkQueueStatus() {
  try {
    const { count, error } = await window.supabaseClient
      .from('doubts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) throw error;
    
    const waitTime = (count || 0) * 2;
    appendChatMessage(`📊 <b>Live Queue Status:</b><br>• Pending Requests: <b>${count || 0}</b><br>• Estimated Wait Time: <b>~${waitTime} mins</b>`, "ai");
  } catch (err) {
    appendChatMessage("📊 Abhi Queue clear hai. Aapka sawal turant process hoga!", "ai");
  }
}

/* =====================================================
   ADMIN DOUBT MODAL & LOGIN CHECK LOGIC
   ===================================================== */

async function openAdminDoubtModal() {
  let currentUser = null;
  try {
    if (window.getCurrentUser) {
      currentUser = await window.getCurrentUser();
    } else if (window.supabaseClient && window.supabaseClient.auth) {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session) currentUser = session.user;
    }
  } catch (e) {
    console.warn("Auth check error:", e);
  }

  // LOGIN CHECK
  if (!currentUser) {
    alert("🔒 Admin ko doubt bhejne ke liye pehle Login / Signup karein!");
    sessionStorage.setItem("redirect_after_login", window.location.href);
    if (window.getPageUrl) {
      window.location.href = window.getPageUrl("login.html");
    } else {
      window.location.href = "login.html";
    }
    return;
  }

  // Create Modal if not already injected
  let modal = document.getElementById("adminDoubtModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "adminDoubtModal";
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.7); display: flex; align-items: center;
      justify-content: center; z-index: 9999; backdrop-filter: blur(4px);
    `;
    modal.innerHTML = `
      <div style="background: #1e293b; border: 1px solid #3b82f6; border-radius: 12px; width: 90%; max-width: 420px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); color: #f8fafc; font-family: sans-serif;">
        <div style="display:flex; justify-between; align-items:center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; color: #60a5fa; display: flex; align-items: center; gap: 6px;">
            ${SVG_ICONS.admin} Send Doubt to Admin
          </h3>
          <button onclick="closeAdminDoubtModal()" style="background:none; border:none; color:#94a3b8; font-size: 18px; cursor:pointer;">✖</button>
        </div>
        <p style="font-size: 12px; color: #cbd5e1; margin-bottom: 12px;">
          Apna doubt niche likhein. Humara tutor real-time verification ke baad aapki help karega:
        </p>
        <textarea id="adminDoubtInput" rows="4" style="width: 100%; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 8px; padding: 10px; font-size: 13px; box-sizing: border-box; outline: none;" placeholder="Apna sawaal detail me likhein..."></textarea>
        <div style="display: flex; gap: 8px; margin-top: 14px; justify-content: flex-end;">
          <button onclick="closeAdminDoubtModal()" style="background: #334155; border: none; color: #cbd5e1; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 12px;">Cancel</button>
          <button onclick="submitAdminDoubtModal()" style="background: #2563eb; border: none; color: #fff; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;">Submit Request</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.style.display = "flex";
  }

  // Pre-fill input if user had typed something in main input
  const mainInput = getQuestion();
  if (mainInput) {
    const modalInput = document.getElementById("adminDoubtInput");
    if (modalInput) modalInput.value = mainInput;
  }
}

function closeAdminDoubtModal() {
  const modal = document.getElementById("adminDoubtModal");
  if (modal) modal.style.display = "none";
}

async function submitAdminDoubtModal() {
  const modalInput = document.getElementById("adminDoubtInput");
  const question = modalInput ? modalInput.value.trim() : "";

  if (!question) {
    alert("⚠️ Kripya pehle doubt type karein!");
    return;
  }

  let user = null;
  if (window.getCurrentUser) {
    user = await window.getCurrentUser();
  } else if (window.supabaseClient && window.supabaseClient.auth) {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session) user = session.user;
  }

  if (!user) {
    alert("🔒 Queue me request bhejne ke liye login karna zaroori hai!");
    closeAdminDoubtModal();
    return;
  }

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

  closeAdminDoubtModal();

  if (!error) {
    alert("✅ Aapka Doubt Admin Support Queue me bhej diya gaya hai!");
    appendChatMessage(`📩 <b>Request Submitted:</b> Admin Queue me aapka doubt chala gaya hai:<br><i>"${escapeHtml(question)}"</i>`, "ai");
  } else {
    alert("❌ Request submit me error aaya: " + error.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.getElementById("answerHistory");
  if (chatContainer && chatContainer.children.length === 0) {
    renderLanguageSelection();
  }
  checkSolvedNotification();
  makeFABMovable();
});

/* =====================================================
   UNIFIED FAST AI SOLVER ENGINE
   ===================================================== */

async function solveWithAI(questionText) {
  const loadingId = "loading-" + Date.now();
  appendChatMessage(`<span id="${loadingId}">⏳ AI Reading & Solving in real-time...</span>`, "ai");

  const sendBtn = document.getElementById("solveBtn");
  if (sendBtn) sendBtn.disabled = true;

  const SUPABASE_FUNCTION_URL = "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YXN0d2Vobm5xaWNyaWtuZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTk5NTEsImV4cCI6MjA4MDgzNTk1MX0.5_UvwaG0X8k_Emj-cMC0KjEqlvU6hgAt5IsHJdgARvk"; 

  let PROMPT = "";
  if (currentLanguage === 'en') {
    PROMPT = `You are an expert tutor for Class 9-12. Subject: ${selectedSubject}. 
Solve the question step-by-step in English. Use LaTeX for math ($...$ inline, $$...$$ display). No meta chatter.`;
  } else if (currentLanguage === 'hi') {
    PROMPT = `You are an expert tutor for Class 9-12. Subject: ${selectedSubject}. 
Solve in clear Hindi Devanagari script. Put English terms in brackets next to Hindi terms (e.g. "विभवांतर (Potential Difference)"). Use LaTeX for math. No extra chatter.`;
  } else {
    PROMPT = `You are an expert tutor for Class 9-12. Subject: ${selectedSubject}. 
Solve in clean Hinglish (Roman Hindi + English). Use LaTeX for math ($...$ inline, $$...$$ display). Direct answer only.`;
  }

  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ 
        prompt: `${PROMPT}\n\nQuery: ${questionText}`,
        language: currentLanguage 
      })
    });

    const data = await response.json();

    const loadingElem = document.getElementById(loadingId);
    if (loadingElem && loadingElem.parentElement) loadingElem.parentElement.remove();

    let rawText = "";

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
      let formattedAnswer = typeof marked !== 'undefined' ? marked.parse(cleanContent) : cleanContent.replace(/\n/g, "<br>");
      appendChatMessage(`<b>💡 Solution / Answer:</b><br><br>${formattedAnswer}`, "ai");
    } else {
      appendChatMessage(`⚠️ Server Error: Invalid response structure received.`, "system-error");
    }

  } catch (err) {
    console.error("Full Error Debug:", err);
    const loadingElem = document.getElementById(loadingId);
    if (loadingElem && loadingElem.parentElement) loadingElem.parentElement.remove();
    appendChatMessage(`⚠️ Error: ${err.message || 'Network issue'}.`, "system-error");
  } finally {
    const sendBtn = document.getElementById("solveBtn");
    if (sendBtn) sendBtn.disabled = false;
  }
}

/* =====================================================
   MAIN SOLVE TRIGGER WITH GUEST LIMIT
   ===================================================== */

async function solve() {
  const qRaw = getQuestion();
  if (!qRaw) return;

  let currentUser = null;
  try {
    if (window.getCurrentUser) {
      currentUser = await window.getCurrentUser();
    } else if (window.supabaseClient && window.supabaseClient.auth) {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session) currentUser = session.user;
    }
  } catch (e) {
    console.warn("Auth check error:", e);
  }

  if (!currentUser) {
    const hasSentGuestMsg = localStorage.getItem("guest_has_sent_msg");
    
    if (hasSentGuestMsg) {
      alert("🔒 Unlimited sawaal poochhne ke liye kripya pehle Login/Signup karein!");
      sessionStorage.setItem("redirect_after_login", window.location.href);
      if (window.getPageUrl) {
        window.location.href = window.getPageUrl("login.html");
      } else {
        window.location.href = "login.html";
      }
      return;
    } else {
      localStorage.setItem("guest_has_sent_msg", "true");
    }
  }

  userMsgCount++; 
  appendChatMessage(escapeHtml(qRaw), "user");
  clearQuestionInput();

  solveWithAI(qRaw);
}

/* =====================================================
   DOUBT QUEUE PANEL LOGIC
   ===================================================== */

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
    list.innerHTML = "<em>Abhi tak koi request queue me nahi hai.</em>";
    return;
  }

  list.innerHTML = "";
  data.forEach((d, idx) => {
    const s = d.status || "pending";
    list.innerHTML += `
      <div class="doubt-item">
        <div><b>Q:</b> ${escapeHtml(d.question)}</div>
        <div style="margin-top:4px;"><b>Status:</b> <span class="${s}">${s.toUpperCase()}</span> ${s === 'pending' ? `(Pos: #${idx+1})` : ''}</div>
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
