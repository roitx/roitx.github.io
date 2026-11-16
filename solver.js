/* =====================================================
   SOLVER.JS — HYBRID CHATBOT, QUEUE ENGINE & MODAL PANEL
   ===================================================== */

let userMsgCount = 0;    
let currentLanguage = 'hinglish'; 
let selectedSubject = 'General';
let selectedBase64Image = null; 
let cropperInstance = null;      

let isDrawing = false;
let drawColor = '#ef4444'; 
let drawLineWidth = 4;
let strokeHistory = []; 

if (!window.supabaseClient) {
  console.error("❌ Supabase connection missing");
}

// =========================================================
// VOICE / TTS EXTENSION & PRELOAD ENGINE
// =========================================================

let currentUtterance = null;
let isSpeechEnabledGlobally = localStorage.getItem('roitx_speech_pref') !== null 
    ? localStorage.getItem('roitx_speech_pref') === 'true' 
    : true; 

window.activeSpeakerBtn = null;

let isAudioUnlocked = false;
let pendingGreetingText = null;
let windowActiveFirstSpeakerBtn = null;

function unlockAudioEngine() {
    if (isAudioUnlocked) return;
    if ('speechSynthesis' in window) {
        const dummyUtter = new SpeechSynthesisUtterance("");
        window.speechSynthesis.speak(dummyUtter);
        isAudioUnlocked = true;

        if (pendingGreetingText && windowActiveFirstSpeakerBtn) {
            speakText(pendingGreetingText, windowActiveFirstSpeakerBtn, true);
            pendingGreetingText = null;
        }
    }
}

window.addEventListener('click', unlockAudioEngine, { once: true });
window.addEventListener('touchstart', unlockAudioEngine, { once: true });
window.addEventListener('keydown', unlockAudioEngine, { once: true });

function cleanTextForNaturalSpeech(text) {
  if (!text) return "";
  let clean = String(text);
  clean = clean.replace(/<[^>]*>?/gm, '');
  clean = clean.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 batte $2');
  clean = clean.replace(/\\sqrt\{([^}]+)\}/g, 'square root $1');
  clean = clean.replace(/[\$\#\&\_\{\}\[\]\\\^\%\~]/g, ' '); 
  clean = clean.replace(/\\alpha/g, 'alpha');
  clean = clean.replace(/\\beta/g, 'beta');
  clean = clean.replace(/\\times/g, 'guna');
  clean = clean.replace(/\\div/g, 'bhag');
  return clean.replace(/\s+/g, ' ').trim();
}

function stopCurrentSpeech() {
  if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
  }
  if (window.activeSpeakerBtn) {
      window.activeSpeakerBtn.classList.remove('speaking');
      window.activeSpeakerBtn = null;
  }
}

function speakText(rawText, btnElement, forcePlay = false) {
    if (!('speechSynthesis' in window)) return;

    try {
        window.speechSynthesis.cancel();
        if (!isSpeechEnabledGlobally && !forcePlay) return;

        const plainText = cleanTextForNaturalSpeech(rawText);
        if (!plainText) return;

        currentUtterance = new SpeechSynthesisUtterance(plainText);
        currentUtterance.rate = 1.0; 
        currentUtterance.pitch = 1.0; 
        currentUtterance.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';

        if (btnElement) {
            if (window.activeSpeakerBtn && window.activeSpeakerBtn !== btnElement) {
                window.activeSpeakerBtn.classList.remove('speaking');
            }
            btnElement.classList.add('speaking');
            window.activeSpeakerBtn = btnElement;
        }

        currentUtterance.onend = () => {
            if (btnElement) btnElement.classList.remove('speaking');
            if (window.activeSpeakerBtn === btnElement) window.activeSpeakerBtn = null;
        };

        currentUtterance.onerror = () => {
            window.speechSynthesis.cancel();
            if (btnElement) btnElement.classList.remove('speaking');
            if (window.activeSpeakerBtn === btnElement) window.activeSpeakerBtn = null;
        };

        setTimeout(() => {
            window.speechSynthesis.speak(currentUtterance);
        }, 200);

    } catch (err) {
        if (btnElement) btnElement.classList.remove('speaking');
    }
}

/* =====================================================
   TOAST NOTIFICATION POPUP (FOR THUMBS UP/DOWN)
   ===================================================== */
function showToast(message) {
  let toast = document.getElementById("roitxToastPopup");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "roitxToastPopup";
    toast.style.cssText = `
      position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: var(--surface); border: 1px solid var(--border); color: var(--text);
      padding: 10px 20px; border-radius: 30px; font-size: 13px; font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 100000; opacity: 0;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); backdrop-filter: blur(6px);
      display: flex; align-items: center; gap: 8px;
    `;
    document.body.appendChild(toast);
  }
  toast.innerHTML = `✨ ${message}`;
  toast.style.opacity = "1";
  toast.style.transform = "translateX(-50%) translateY(0)";

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(20px)";
  }, 2500);
}

/* =====================================================
   APPEND CHAT MESSAGE (WITH TYPEWRITER, SPEAKER & FEEDBACK)
   ===================================================== */
window.appendChatMessage = function(htmlContent, type = "ai", showTime = true, enableTypewriter = false) {
  const container = document.getElementById("answerHistory");
  if (!container) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-bubble ${type}`;
  
  const speakerBtn = document.createElement('button');
  const contentDiv = document.createElement("div");
  contentDiv.className = "msg-content-body";

  if (type === "ai") {
    const speakerOnSvg = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const speakerOffSvg = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    
    speakerBtn.className = 'msg-speaker-btn';
    speakerBtn.title = "Toggle Voice Output";
    speakerBtn.innerHTML = isSpeechEnabledGlobally ? speakerOnSvg : speakerOffSvg;
    speakerBtn.style.display = "none"; // Shuru me hidden rahega jab tak text complete n ho

    speakerBtn.onclick = (e) => {
        e.stopPropagation();
        if (window.speechSynthesis && window.speechSynthesis.speaking && window.activeSpeakerBtn === speakerBtn) {
            stopCurrentSpeech();
            isSpeechEnabledGlobally = false;
            localStorage.setItem('roitx_speech_pref', 'false');
            speakerBtn.innerHTML = speakerOffSvg;
        } else {
            isSpeechEnabledGlobally = true;
            localStorage.setItem('roitx_speech_pref', 'true');
            speakerBtn.innerHTML = speakerOnSvg;
            speakText(contentDiv.innerText || htmlContent, speakerBtn, true);
        }
    };
    msgDiv.appendChild(speakerBtn);
  }

  msgDiv.appendChild(contentDiv);

  // Thumbs Up / Down Bar for AI responses
  if (type === "ai") {
    const feedbackBar = document.createElement("div");
    feedbackBar.className = "msg-feedback-bar";
    feedbackBar.style.cssText = `
      display: flex; gap: 12px; align-items: center; margin-top: 10px; 
      padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.08);
    `;

    const thumbsUpSvg = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`;
    const thumbsDownSvg = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>`;

    const upBtn = document.createElement("button");
    upBtn.title = "Helpful";
    upBtn.innerHTML = thumbsUpSvg;
    upBtn.style.cssText = "background:transparent; border:none; color:var(--muted); cursor:pointer; display:flex; align-items:center; transition:color 0.2s;";
    upBtn.onmouseover = () => upBtn.style.color = "#4ade80";
    upBtn.onmouseout = () => upBtn.style.color = "var(--muted)";
    upBtn.onclick = () => showToast("Aapka bahut-bahut shukriya! Feedback recorded 👍");

    const downBtn = document.createElement("button");
    downBtn.title = "Not Helpful";
    downBtn.innerHTML = thumbsDownSvg;
    downBtn.style.cssText = "background:transparent; border:none; color:var(--muted); cursor:pointer; display:flex; align-items:center; transition:color 0.2s;";
    downBtn.onmouseover = () => downBtn.style.color = "#f87171";
    downBtn.onmouseout = () => downBtn.style.color = "var(--muted)";
    downBtn.onclick = () => showToast("Feedback note kar liya gaya hai. Isme sudhar kiya jayega 👎");

    feedbackBar.appendChild(upBtn);
    feedbackBar.appendChild(downBtn);
    msgDiv.appendChild(feedbackBar);
  }

  if (showTime) {
    const timeDiv = document.createElement("div");
    timeDiv.innerHTML = `<span class="chat-time">${getCurrentFormattedTime()}</span>`;
    msgDiv.appendChild(timeDiv);
  }

  container.appendChild(msgDiv);
  scrollToBottom();

  if (enableTypewriter && type === "ai") {
    let charIndex = 0;
    contentDiv.innerHTML = ""; 

    function typeWriter() {
        if (charIndex < htmlContent.length) {
            charIndex = Math.min(charIndex + 6, htmlContent.length); // Speed badha di gayi hai taaki text kate nahi
            contentDiv.innerHTML = htmlContent.substring(0, charIndex);
            scrollToBottom();
            setTimeout(typeWriter, 12);
        } else {
            contentDiv.innerHTML = htmlContent; 
            renderMathSafely(msgDiv);
            scrollToBottom();

            // Jab text poora type ho jaye, tabhi speaker button dikhe aur speech chale
            if (speakerBtn) {
              speakerBtn.style.display = "flex";
            }
            if (isSpeechEnabledGlobally) {
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = htmlContent;
              speakText(tempDiv.innerText || htmlContent, speakerBtn, true);
            }
        }
    }
    typeWriter();
  } else {
    contentDiv.innerHTML = htmlContent;
    renderMathSafely(msgDiv);
    if (speakerBtn) speakerBtn.style.display = "flex";
  }
};

/* =====================================================
   SVG ICONS LIBRARY & UTILITIES
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

function getQuestion() {
  const el = document.getElementById("question");
  return el ? el.value.trim() : "";
}

function clearQuestionInput() {
  const el = document.getElementById("question");
  if (el) el.value = "";
}

function getCurrentFormattedTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMathSafely(element) {
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    window.MathJax.typesetPromise([element]).catch((err) => console.warn("MathJax error:", err));
  } else if (window.MathJax && typeof window.MathJax.typeset === 'function') {
    window.MathJax.typeset([element]);
  }
}

function scrollToBottom() {
  const container = document.getElementById("answerHistory");
  if (container) {
    setTimeout(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
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
   MAIN AI SOLVE ENGINE
   ===================================================== */
async function solveWithAI(questionText, imageBase64 = null) {
  const loadingId = "loading-" + Date.now();
  appendChatMessage(`
    <div id="${loadingId}" class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`, "ai", false, false);

  const sendBtn = document.getElementById("solveBtn");
  if (sendBtn) sendBtn.disabled = true;

  const SUPABASE_FUNCTION_URL = window.SUPABASE_FUNCTION_URL || "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YXN0d2Vobm5xaWNyaWtuZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTk5NTEsImV4cCI6MjA4MDgzNTk1MX0.5_UvwaG0X8k_Emj-cMC0KjEqlvU6hgAt5IsHJdgARvk"; 

  let PROMPT = "";
  if (currentLanguage === 'en') {
    PROMPT = `You are an expert tutor for Class 9-12. Subject: ${selectedSubject}. Solve step-by-step in English. Use LaTeX for math.`;
  } else if (currentLanguage === 'hi') {
    PROMPT = `You are an expert tutor for Class 9-12. Subject: ${selectedSubject}. Solve in Hindi Devanagari script. Use LaTeX for math.`;
  } else {
    PROMPT = `You are an expert tutor for Class 9-12. Subject: ${selectedSubject}. Solve in clean Hinglish. Use LaTeX for math.`;
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
        prompt: `${PROMPT}\n\nQuery: ${questionText || "Solve the attached question"}`,
        language: currentLanguage,
        image: imageBase64
      })
    });

    const data = await response.json();

    const loadingElem = document.getElementById(loadingId);
    if (loadingElem && loadingElem.closest('.chat-bubble')) {
      loadingElem.closest('.chat-bubble').remove();
    }

    let rawText = "";
    if (data.choices && data.choices[0]?.message?.content) {
      rawText = data.choices[0].message.content;
    } else if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      rawText = data.candidates[0].content.parts[0].text;
    } else if (data.content) {
      rawText = data.content;
    } else if (data.result || data.response || data.output || data.message) {
      rawText = data.result || data.response || data.output || data.message;
    } else if (data.error) {
      let errMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
      throw new Error(errMsg);
    }

    if (rawText) {
      const cleanContent = cleanAIResponse(rawText);
      let formattedAnswer = typeof marked !== 'undefined' ? marked.parse(cleanContent) : cleanContent.replace(/\n/g, "<br>");
      
      appendChatMessage(`<b>💡 Solution / Answer:</b><br><br>${formattedAnswer}`, "ai", true, true);
    } else {
      appendChatMessage(`⚠️ Server Error: Invalid response structure received.`, "system-error", true, false);
    }

  } catch (err) {
    const loadingElem = document.getElementById(loadingId);
    if (loadingElem && loadingElem.closest('.chat-bubble')) {
      loadingElem.closest('.chat-bubble').remove();
    }
    appendChatMessage(`⚠️ Error: ${err.message || 'Network issue'}.`, "system-error", true, false);
  } finally {
    const sendBtn = document.getElementById("solveBtn");
    if (sendBtn) sendBtn.disabled = false;
  }
}

async function solve() {
  const qRaw = getQuestion();
  const currentImg = selectedBase64Image;

  if (!qRaw && !currentImg) {
    alert("Kripya koi question type karein ya photo upload karein!");
    return;
  }

  userMsgCount++; 
  let userHtml = escapeHtml(qRaw);
  if (currentImg) {
    userHtml = `<div style="margin-bottom:6px;"><img src="${currentImg}" style="max-width:180px; max-height:140px; border-radius:8px; border:1px solid var(--border);"></div>` + userHtml;
  }

  appendChatMessage(userHtml, "user");
  clearQuestionInput();
  removeSelectedImage();
  solveWithAI(qRaw, currentImg);
}

document.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.getElementById("answerHistory");
  if (chatContainer && chatContainer.children.length === 0) {
    renderLanguageSelection();
  }
});


/* =====================================================
   CAMERA vs GALLERY SELECTOR MODAL
   ===================================================== */

function triggerImagePicker() {
  let modal = document.getElementById("imageSourceModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "imageSourceModal";
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.7); display: flex; align-items: center;
      justify-content: center; z-index: 10000; backdrop-filter: blur(4px);
    `;
    modal.innerHTML = `
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; width: 90%; max-width: 340px; padding: 20px; text-align: center; color: var(--text); font-family: system-ui, sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <h4 style="margin: 0 0 14px 0; font-size: 16px; color: var(--accent);">📸 Image Source Chunein</h4>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button onclick="openCameraInput()" style="background: var(--accent); color: #fff; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            📷 Direct Camera Kholein
          </button>
          <button onclick="openGalleryInput()" style="background: var(--hover); color: var(--text); border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            📁 File Manager / Gallery
          </button>
          <button onclick="closeImageSourceModal()" style="background: transparent; color: var(--muted); border: none; padding: 8px; font-size: 13px; cursor: pointer;">
            ✖ Cancel
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.style.display = "flex";
  }
}

function closeImageSourceModal() {
  const modal = document.getElementById("imageSourceModal");
  if (modal) modal.style.display = "none";
}

function openCameraInput() {
  closeImageSourceModal();
  let input = document.getElementById("cameraDirectInput");
  if (!input) {
    input = document.createElement("input");
    input.type = "file";
    input.id = "cameraDirectInput";
    input.accept = "image/*";
    input.capture = "environment";
    input.style.display = "none";
    input.onchange = handleSolverImagePreview;
    document.body.appendChild(input);
  }
  input.click();
}

function openGalleryInput() {
  closeImageSourceModal();
  let input = document.getElementById("solverImageInput");
  if (input) {
    input.removeAttribute("capture");
    input.click();
  }
}

/* =====================================================
   IMAGE UPLOAD, CROP & PENCIL HIGHLIGHT HELPERS
   ===================================================== */

function updateModalTitle(titleText) {
  const modalHeader = document.querySelector("#cropperModal h3") || document.querySelector("#cropperModal .modal-title");
  if (modalHeader) {
    modalHeader.innerText = titleText;
  }
}

function handleSolverImagePreview(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const cropperModal = document.getElementById("cropperModal");
      const cropperImg = document.getElementById("cropperImageSrc");

      if (cropperImg && cropperModal) {
        updateModalTitle("✂️ Question Crop Karein"); 
        
        const oldActions = document.getElementById("cropperActionBtns");
        if(oldActions) oldActions.remove();

        // Enforce parent modal container styling fixes dynamically
        const modalContainer = cropperModal.querySelector('.modal-content') || cropperModal.firstElementChild;
        if (modalContainer) {
          modalContainer.style.cssText = `
            display: flex !important;
            flex-direction: column !important;
            max-height: 90vh !important;
            width: 92% !important;
            max-width: 500px !important;
            overflow-y: auto !important;
            box-sizing: border-box !important;
            padding: 16px !important;
            background: var(--surface) !important;
            border-radius: 12px !important;
          `;
        }

        cropperImg.style.display = "block";
        cropperImg.style.maxWidth = "100%";
        cropperImg.style.maxHeight = "55vh";
        cropperImg.src = e.target.result;
        cropperModal.style.display = "flex";

        if (cropperInstance) {
          cropperInstance.destroy();
        }

        setTimeout(() => {
          if (typeof Cropper !== 'undefined') {
            cropperInstance = new Cropper(cropperImg, {
              viewMode: 1,
              autoCropArea: 0.9,
              responsive: true,
              background: false
            });
          } else {
            selectedBase64Image = e.target.result;
            showPreviewUI(selectedBase64Image);
            closeCropperModal();
          }
        }, 150);
      } else {
        selectedBase64Image = e.target.result;
        showPreviewUI(selectedBase64Image);
      }
    };
    reader.readAsDataURL(file);
  }
}

function applyImageCrop() {
  if (cropperInstance) {
    const croppedCanvas = cropperInstance.getCroppedCanvas({
      maxWidth: 1024,
      maxHeight: 1024
    });

    if (croppedCanvas) {
      setupPencilCanvas(croppedCanvas);
      return;
    }
  }
  closeCropperModal();
}

/* =====================================================
   FIXED RESPONSIVE HIGHLIGHT CANVAS & MODAL LOGIC
   ===================================================== */

function setupPencilCanvas(croppedCanvas) {
  updateModalTitle("✏️ Question Highlight Karein");

  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }

  const cropperImg = document.getElementById("cropperImageSrc");
  if (cropperImg) cropperImg.style.display = "none";

  // 1. Root Modal Body Container Layout Override (Forces Vertical Layout)
  const modalBody = cropperImg ? cropperImg.parentElement : null;
  if (modalBody) {
    modalBody.setAttribute("style", "display: flex !important; flex-direction: column !important; align-items: center !important; width: 100% !important; box-sizing: border-box !important; overflow-y: auto !important;");
  }

  let drawCanvas = document.getElementById("pencilCanvas");
  if (!drawCanvas) {
    drawCanvas = document.createElement("canvas");
    drawCanvas.id = "pencilCanvas";
    if (cropperImg && cropperImg.parentNode) {
      cropperImg.parentNode.appendChild(drawCanvas);
    }
  }

  // Purely Responsive Fixed Layout Settings
  drawCanvas.style.cssText = `
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: 42vh !important;
    border-radius: 8px;
    touch-action: none;
    cursor: crosshair;
    display: block !important;
    margin: 0 auto 12px auto !important;
    object-fit: contain;
    background: var(--bg);
    box-sizing: border-box;
    border: 1px solid var(--border);
  `;

  drawCanvas.width = croppedCanvas.width;
  drawCanvas.height = croppedCanvas.height;
  const ctx = drawCanvas.getContext("2d");
  ctx.drawImage(croppedCanvas, 0, 0);

  strokeHistory = [];
  saveCanvasState(drawCanvas);

  setupDrawingEvents(drawCanvas, ctx);

  let actionBtnGroup = document.getElementById("cropperActionBtns");
  if (!actionBtnGroup) {
    actionBtnGroup = document.createElement("div");
    actionBtnGroup.id = "cropperActionBtns";
    if (drawCanvas.parentNode) {
      drawCanvas.parentNode.appendChild(actionBtnGroup);
    }
  }

  // Force pure vertical layout for controls below canvas
  actionBtnGroup.style.cssText = `
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    margin-top: 8px !important;
    width: 100% !important;
    align-items: center !important;
    box-sizing: border-box !important;
  `;

  actionBtnGroup.innerHTML = `
    <!-- Color Palette & Tools Bar -->
    <div style="display: flex; gap: 8px; align-items: center; justify-content: center; background: var(--bg); padding: 8px 12px; border-radius: 20px; border: 1px solid var(--border); width: 100%; max-width: 100%; box-sizing: border-box; flex-wrap: wrap;">
      <span style="font-size: 12px; color: var(--muted); font-weight: bold; white-space: nowrap;">Color:</span>
      <button type="button" onclick="setDrawColor('#ef4444')" style="width:24px; height:24px; border-radius:50%; background:#ef4444; border:2px solid #fff; cursor:pointer; flex-shrink:0;"></button>
      <button type="button" onclick="setDrawColor('#f59e0b')" style="width:24px; height:24px; border-radius:50%; background:#f59e0b; border:2px solid #fff; cursor:pointer; flex-shrink:0;"></button>
      <button type="button" onclick="setDrawColor('#10b981')" style="width:24px; height:24px; border-radius:50%; background:#10b981; border:2px solid #fff; cursor:pointer; flex-shrink:0;"></button>
      <div style="width: 1px; height: 16px; background: var(--border); margin: 0 4px;"></div>
      <button type="button" onclick="undoLastStroke()" style="background:var(--border); border:none; color:var(--text); padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:bold; white-space:nowrap;">↩️ Undo</button>
      <button type="button" onclick="clearCanvasStrokes()" style="background:var(--border); border:none; color:var(--text); padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:bold; white-space:nowrap;">🗑️ Reset</button>
    </div>

    <!-- Action Buttons Row -->
    <div style="display: flex; gap: 10px; width: 100%; justify-content: space-between; box-sizing: border-box;">
      <button type="button" onclick="saveHighlightedImage()" style="flex: 1; background: var(--accent); color: #fff; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; text-align: center;">✅ Done & Send</button>
      <button type="button" onclick="closeCropperModal()" style="background: var(--hover); color: var(--text); border: none; padding: 12px 18px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold;">✖ Cancel</button>
    </div>
  `;

  const defaultFooter = document.getElementById("cropperDefaultFooter");
  if (defaultFooter) defaultFooter.style.display = "none";
}

  

function setupDrawingEvents(canvas, ctx) {
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function startDraw(e) {
    isDrawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawLineWidth * (canvas.width / 600);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  function draw(e) {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDraw() {
    if (isDrawing) {
      isDrawing = false;
      saveCanvasState(canvas);
    }
  }

  canvas.onmousedown = startDraw;
  canvas.onmousemove = draw;
  canvas.onmouseup = stopDraw;

  canvas.ontouchstart = startDraw;
  canvas.ontouchmove = draw;
  canvas.ontouchend = stopDraw;
}

function setDrawColor(color) {
  drawColor = color;
}

function saveCanvasState(canvas) {
  if (strokeHistory.length > 10) strokeHistory.shift();
  strokeHistory.push(canvas.toDataURL());
}

function undoLastStroke() {
  const drawCanvas = document.getElementById("pencilCanvas");
  if (!drawCanvas || strokeHistory.length <= 1) return;
  
  strokeHistory.pop();
  const previousState = strokeHistory[strokeHistory.length - 1];
  
  const ctx = drawCanvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = previousState;
}

function clearCanvasStrokes() {
  if (strokeHistory.length > 0) {
    const drawCanvas = document.getElementById("pencilCanvas");
    const ctx = drawCanvas.getContext("2d");
    const originalState = strokeHistory[0];
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      ctx.drawImage(img, 0, 0);
      strokeHistory = [originalState];
    };
    img.src = originalState;
  }
}

function saveHighlightedImage() {
  const drawCanvas = document.getElementById("pencilCanvas");
  if (drawCanvas) {
    selectedBase64Image = drawCanvas.toDataURL("image/jpeg", 0.85);
    showPreviewUI(selectedBase64Image);
  }
  closeCropperModal();
}

function showPreviewUI(base64Src) {
  const previewImg = document.getElementById("imagePreview");
  const previewContainer = document.getElementById("imagePreviewContainer");
  if (previewImg) previewImg.src = base64Src;
  if (previewContainer) previewContainer.style.display = "inline-block";
}

function closeCropperModal() {
  const cropperModal = document.getElementById("cropperModal");
  if (cropperModal) cropperModal.style.display = "none";

  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }

  const cropperImg = document.getElementById("cropperImageSrc");
  if (cropperImg) cropperImg.style.display = "block";

  const drawCanvas = document.getElementById("pencilCanvas");
  if (drawCanvas) drawCanvas.remove();

  const actionBtns = document.getElementById("cropperActionBtns");
  if (actionBtns) actionBtns.remove();

  const fileInput = document.getElementById("solverImageInput");
  if (fileInput) fileInput.value = "";

  const camInput = document.getElementById("cameraDirectInput");
  if (camInput) camInput.value = "";
  
  updateModalTitle("✂️ Question Crop Karein"); 
}

function removeSelectedImage() {
  selectedBase64Image = null;
  const previewImg = document.getElementById("imagePreview");
  const previewContainer = document.getElementById("imagePreviewContainer");
  const fileInput = document.getElementById("solverImageInput");
  
  if (previewImg) previewImg.src = "";
  if (previewContainer) previewContainer.style.display = "none";
  if (fileInput) fileInput.value = "";
}

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

function getCurrentFormattedTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMathSafely(element) {
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    window.MathJax.typesetPromise([element]).catch((err) => console.warn("MathJax error:", err));
  } else if (window.MathJax && typeof window.MathJax.typeset === 'function') {
    window.MathJax.typeset([element]);
  }
}

function appendChatMessage(htmlContent, type = "ai", showTime = true) {
  const container = document.getElementById("answerHistory");
  if (!container) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-bubble ${type}`;
  
  const timeStamp = showTime ? `<span class="chat-time">${getCurrentFormattedTime()}</span>` : '';
  msgDiv.innerHTML = htmlContent + timeStamp;

  container.appendChild(msgDiv);
  scrollToBottom();

  renderMathSafely(msgDiv);
}

function scrollToBottom() {
  const container = document.getElementById("answerHistory");
  if (container) {
    setTimeout(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
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
  appendChatMessage(cardHTML, "ai", false);
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
  appendChatMessage(cardHTML, "ai", false);
}

function selectField(field) {
  selectedSubject = field;
  appendChatMessage(field, "user");

  setTimeout(() => {
    let responseText = `Aapka vishay <b>${field}</b> select ho gaya hai! Aap neeche input box me apna sawaal type kijiye ya photo upload karein, main turant solution bhej dunga.`;
    if (currentLanguage === 'hi') {
      responseText = `आपका विषय <b>${field}</b> सेलेक्ट हो गया है! आप नीचे सवाल टाइप करें या फोटो अपलोड करें, मैं तुरंत सॉल्यूशन भेज दूंगा।`;
    } else if (currentLanguage === 'en') {
      responseText = `Your subject <b>${field}</b> is selected! Please type your question or upload an image. I'll provide an instant solution.`;
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
            ${SVG_ICONS.queue} Check Feedback Status
          </button>
          <button class="wa-action-btn" onclick="renderMainMenu()">
            ${SVG_ICONS.home} Main Menu
          </button>
        </div>
      </div>
    `;
    appendChatMessage(cardHTML, "ai", false);
  }, 200);
}

function renderMainMenu() {
  appendChatMessage(currentLanguage === 'hi' ? 'मुख्य मेनू' : 'Main Menu', "user");
  setTimeout(() => {
    renderLanguageSelection();
  }, 200);
}

async function checkQueueStatus() {
  // 1. Pehle chat me user ka action dikhayein
  appendChatMessage("Check Queue Status", "user");

  try {
    const currentSessionId = getSessionId(); 
    const { count, error } = await window.supabaseClient
      .from('doubts')
      .select('*', { count: 'exact' }) 
      .eq('status', 'pending')
      .eq('session_id', currentSessionId); 

    if (error) {
      console.error("Error fetching queue status:", error);
      appendChatMessage("⚠️ Queue status check karne me error aaya.", "ai");
      return;
    }

    // 2. Console ki jagah ab sidha Chat me message bhejein
    let replyText = "";
    if (count > 0) {
      replyText = `🕒 Aapke currently <b>${count}</b> requests pending hain admin queue me.`;
    } else {
      replyText = `✅ Aapka koi bhi doubt queue me pending nahi hai!`;
    }
    
    appendChatMessage(replyText, "ai");
    
  } catch (err) {
    console.error("Queue check fail ho gaya:", err);
    appendChatMessage("⚠️ System me kuch technical error aa gaya.", "ai");
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
      <div style="background: var(--surface); border: 1px solid var(--accent); border-radius: 12px; width: 90%; max-width: 420px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); color: var(--text); font-family: sans-serif;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; color: var(--accent); display: flex; align-items: center; gap: 6px;">
            ${SVG_ICONS.admin} Send Doubt to Admin
          </h3>
          <button onclick="closeAdminDoubtModal()" style="background:none; border:none; color:var(--muted); font-size: 18px; cursor:pointer;">✖</button>
        </div>
        <p style="font-size: 12px; color: var(--muted); margin-bottom: 12px;">
          Apna doubt niche likhein. Humara tutor real-time verification ke baad aapki help karega:
        </p>
        <textarea id="adminDoubtInput" rows="4" style="width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 8px; padding: 10px; font-size: 13px; box-sizing: border-box; outline: none;" placeholder="Apna sawaal detail me likhein..."></textarea>
        <div style="display: flex; gap: 8px; margin-top: 14px; justify-content: flex-end;">
          <button onclick="closeAdminDoubtModal()" style="background: var(--border); border: none; color: var(--muted); padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 12px;">Cancel</button>
          <button onclick="submitAdminDoubtModal()" style="background: var(--accent); border: none; color: #fff; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;">Submit Request</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.style.display = "flex";
  }

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

  const camBtn = document.querySelector(".upload-btn") || document.querySelector("label[for='solverImageInput']");
  if (camBtn) {
    camBtn.setAttribute("onclick", "triggerImagePicker(); return false;");
  }
});

// =====================================================
// SOLVER.JS — UPDATED TYPEWRITER & VOICE ENGINE
// =====================================================

async function solveWithAI(questionText, imageBase64 = null) {
  // "AI Analyzing Request..." hata diya gaya hai taaki direct clean response aaye
  const loadingId = "loading-" + Date.now();
  appendChatMessage(`
    <div id="${loadingId}" class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`, "ai", false, false); // Typewriter aur Speaker shuru me hidden rahenge

  const sendBtn = document.getElementById("solveBtn");
  if (sendBtn) sendBtn.disabled = true;

  const SUPABASE_FUNCTION_URL = window.SUPABASE_FUNCTION_URL || "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YXN0d2Vobm5xaWNyaWtuZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTk5NTEsImV4cCI6MjA4MDgzNTk1MX0.5_UvwaG0X8k_Emj-cMC0KjEqlvU6hgAt5IsHJdgARvk"; 

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
        prompt: `${PROMPT}\n\nQuery: ${questionText || "Solve the attached question/image"}`,
        language: currentLanguage,
        image: imageBase64
      })
    });

    const data = await response.json();

    const loadingElem = document.getElementById(loadingId);
    if (loadingElem && loadingElem.closest('.chat-bubble')) {
      loadingElem.closest('.chat-bubble').remove();
    }

    let rawText = "";

    if (data.choices && data.choices[0]?.message?.content) {
      rawText = data.choices[0].message.content;
    } else if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      rawText = data.candidates[0].content.parts[0].text;
    } else if (data.content) {
      rawText = data.content;
    } else if (data.result || data.response || data.output || data.message) {
      rawText = data.result || data.response || data.output || data.message;
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
      
      // Typewriter ke sath message append hoga
      appendChatMessage(`<b>💡 Solution / Answer:</b><br><br>${formattedAnswer}`, "ai", true, true);
    } else {
      appendChatMessage(`⚠️ Server Error: Invalid response structure received.`, "system-error", true, false);
    }

  } catch (err) {
    console.error("Full Error Debug:", err);
    const loadingElem = document.getElementById(loadingId);
    if (loadingElem && loadingElem.closest('.chat-bubble')) {
      loadingElem.closest('.chat-bubble').remove();
    }
    appendChatMessage(`⚠️ Error: ${err.message || 'Network issue'}.`, "system-error", true, false);
  } finally {
    const sendBtn = document.getElementById("solveBtn");
    if (sendBtn) sendBtn.disabled = false;
  }
}

// ---- UPDATED APPEND CHAT MESSAGE WITH TYPEWRITER & SPEAKER LOGIC ----
window.appendChatMessage = function(htmlContent, type = "ai", showTime = true, enableTypewriter = false) {
  const container = document.getElementById("answerHistory");
  if (!container) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-bubble ${type}`;
  
  const speakerBtn = document.createElement('button');
  const contentDiv = document.createElement("div");
  contentDiv.className = "msg-content-body";

  if (type === "ai") {
    const speakerOnSvg = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const speakerOffSvg = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    
    speakerBtn.className = 'msg-speaker-btn';
    speakerBtn.title = "Toggle Voice Output";
    speakerBtn.innerHTML = isSpeechEnabledGlobally ? speakerOnSvg : speakerOffSvg;
    
    // Shuru me jab tak text pura load na ho, speaker button hidden ya disabled rahega
    speakerBtn.style.display = "none"; 

    speakerBtn.onclick = (e) => {
        e.stopPropagation();
        if (window.speechSynthesis && window.speechSynthesis.speaking && window.activeSpeakerBtn === speakerBtn) {
            stopCurrentSpeech();
            isSpeechEnabledGlobally = false;
            localStorage.setItem('roitx_speech_pref', 'false');
            speakerBtn.innerHTML = speakerOffSvg;
        } else {
            isSpeechEnabledGlobally = true;
            localStorage.setItem('roitx_speech_pref', 'true');
            speakerBtn.innerHTML = speakerOnSvg;
            speakText(contentDiv.innerText || htmlContent, speakerBtn, true);
        }
    };
    msgDiv.appendChild(speakerBtn);
  }

  msgDiv.appendChild(contentDiv);

  if (showTime) {
    const timeDiv = document.createElement("div");
    timeDiv.innerHTML = `<span class="chat-time">${getCurrentFormattedTime()}</span>`;
    msgDiv.appendChild(timeDiv);
  }

  container.appendChild(msgDiv);
  scrollToBottom();

  // Typewriter Effect Logic (Jisse text ekdum smooth print ho)
  if (enableTypewriter && type === "ai") {
    let charIndex = 0;
    contentDiv.innerHTML = ""; 

    function typeWriter() {
        if (charIndex < htmlContent.length) {
            charIndex = Math.min(charIndex + 4, htmlContent.length);
            contentDiv.innerHTML = htmlContent.substring(0, charIndex);
            scrollToBottom();
            setTimeout(typeWriter, 15);
        } else {
            contentDiv.innerHTML = htmlContent; 
            renderMathSafely(msgDiv);
            scrollToBottom();

            // Jab text pura type ho jaye, tabhi speaker button show hoga aur aawaz play hogi
            if (speakerBtn) {
              speakerBtn.style.display = "flex";
            }
           // Jab AI response successfully mil jaye aur type ho jaye:
if (isSpeechEnabledGlobally) {
    // Yahan hum pure HTML tags hata kar sirf clean text pass karenge
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = formattedAnswer;
    const purePlainText = tempDiv.innerText || tempDiv.textContent || "";
    
    speakText(purePlainText, speakerBtn, true);


            }
        }
    }
    typeWriter();
  } else {
    contentDiv.innerHTML = htmlContent;
    renderMathSafely(msgDiv);
    if (speakerBtn) speakerBtn.style.display = "flex";
  }
};

/* =====================================================
   MAIN SOLVE TRIGGER WITH IMAGE & GUEST LIMIT
   ===================================================== */

async function solve() {
  const qRaw = getQuestion();
  const currentImg = selectedBase64Image;

  if (!qRaw && !currentImg) {
    alert("Kripya koi question type karein ya photo upload karein!");
    return;
  }

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

  let userHtml = escapeHtml(qRaw);
  if (currentImg) {
    userHtml = `<div style="margin-bottom:6px;"><img src="${currentImg}" style="max-width:180px; max-height:140px; border-radius:8px; border:1px solid var(--border);"></div>` + userHtml;
  }

  appendChatMessage(userHtml, "user");

  clearQuestionInput();
  removeSelectedImage();

  solveWithAI(qRaw, currentImg);
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


/* =====================================================
   CLAUDE-STYLE CHAT: LOCAL STORAGE HISTORY + ACTION BAR
   (Copy / Like / Dislike / Share / Speaker) — yeh block
   purane appendChatMessage ko override karta hai.
   ===================================================== */
const CHAT_STORE_KEY = 'roitx_chat_history_v1';
const CHAT_STATE_KEY = 'roitx_chat_state_v1';
const CHAT_MAX_MSGS  = 100;
let chatHistory = [];

const ACT_ICONS = {
  copy:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  up:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`,
  down:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>`,
  share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"></line><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"></line></svg>`
};

/* ---------- Storage helpers ---------- */
function loadChatStore() {
  try {
    const arr = JSON.parse(localStorage.getItem(CHAT_STORE_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function persistChat() {
  for (let tries = 0; tries < 6; tries++) {
    try {
      localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(chatHistory));
      localStorage.setItem(CHAT_STATE_KEY, JSON.stringify({ currentLanguage, selectedSubject }));
      return;
    } catch (e) {
      // Quota full: sabse purane messages hata kar dobara try
      chatHistory.splice(0, 10);
    }
  }
}

// Base64 photo localStorage bhar deti hai, isliye save karte waqt hata dete hain
function stripBigImages(html) {
  return String(html).replace(/<img[^>]*src="data:[^"]*"[^>]*>/gi, '<span style="opacity:.7">📷 [Photo]</span>');
}

/* ---------- Text / clipboard / share helpers ---------- */
function htmlToPlainText(html) {
  const prepared = String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '$&\n');
  const d = document.createElement('div');
  d.innerHTML = prepared;
  return (d.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) { return false; }
}

async function shareMessage(text) {
  const url = location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'ROITX AI Tutor', text: text.slice(0, 3000), url });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return; // user ne cancel kiya
    }
  }
  const ok = await copyTextToClipboard(`${text}\n\n— ROITX AI Tutor\n${url}`);
  showToast(ok ? 'Share ke liye text copy ho gaya 📋' : 'Share nahi ho paya');
}

function makeActBtn(extraClass, title, svg) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'msg-act-btn ' + extraClass;
  b.title = title;
  b.innerHTML = svg;
  return b;
}

/* ---------- Main: appendChatMessage (override) ---------- */
window.appendChatMessage = function (htmlContent, type = "ai", showTime = true, enableTypewriter = false, opts = {}) {
  const container = document.getElementById("answerHistory");
  if (!container) return;

  const isTyping = String(htmlContent).includes("typing-indicator");
  const isCard   = String(htmlContent).includes("interactive-card");
  const hasActions = type === "ai" && !isTyping && !isCard;
  const restoring = !!opts.restoring;

  // ---- Save to localStorage (loading / error bubbles save nahi hote) ----
  let record = opts.record || null;
  if (!record && type !== "system-error" && !isTyping) {
    record = {
      id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6),
      type, html: stripBigImages(htmlContent),
      time: getCurrentFormattedTime(), showTime, feedback: null, meta: opts.meta || null
    };
    chatHistory.push(record);
    if (chatHistory.length > CHAT_MAX_MSGS) chatHistory.splice(0, chatHistory.length - CHAT_MAX_MSGS);
    persistChat();
  }

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-bubble ${type}`;

  const contentDiv = document.createElement("div");
  contentDiv.className = "msg-content-body";
  msgDiv.appendChild(contentDiv);

  // ---- Action bar: Copy | Like | Dislike | Share | Speaker ----
  let actionBar = null, speakerBtn = null;
  const plainText = hasActions ? htmlToPlainText(htmlContent) : "";

  if (hasActions) {
    actionBar = document.createElement("div");
    actionBar.className = "msg-actions";

    const copyBtn  = makeActBtn("copy",  "Copy",        ACT_ICONS.copy);
    const upBtn    = makeActBtn("up",    "Helpful",     ACT_ICONS.up);
    const downBtn  = makeActBtn("down",  "Not helpful", ACT_ICONS.down);
    const shareBtn = makeActBtn("share", "Share",       ACT_ICONS.share);

    copyBtn.onclick = async () => {
      const ok = await copyTextToClipboard(plainText);
      if (!ok) return showToast("Copy nahi ho paya");
      copyBtn.innerHTML = ACT_ICONS.check;
      copyBtn.classList.add("done");
      showToast(t('toastCopy'));
      setTimeout(() => { copyBtn.innerHTML = ACT_ICONS.copy; copyBtn.classList.remove("done"); }, 1800);
    };

    const paintFeedback = () => {
      const fb = record ? record.feedback : null;
      upBtn.classList.toggle("active", fb === "up");
      downBtn.classList.toggle("active", fb === "down");
    };
    const setFeedback = (val) => {
      if (!record) return;
      record.feedback = (record.feedback === val) ? null : val;   // dobara tap = hata do
      paintFeedback();
      persistChat();
      sendFeedbackToServer(record, record.feedback);
      if (record.feedback === "up")   showToast(t('toastUp'));
      if (record.feedback === "down") showToast(t('toastDown'));
    };
    upBtn.onclick   = () => setFeedback("up");
    downBtn.onclick = () => setFeedback("down");
    shareBtn.onclick = () => shareMessage(plainText);
    paintFeedback();

    // Speaker (pehle jaisa hi logic, ab action bar ke andar)
    const speakerOnSvg  = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const speakerOffSvg = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    speakerBtn = document.createElement("button");
    speakerBtn.type = "button";
    speakerBtn.className = "msg-speaker-btn";
    speakerBtn.title = "Toggle Voice Output";
    speakerBtn.innerHTML = isSpeechEnabledGlobally ? speakerOnSvg : speakerOffSvg;
    speakerBtn.onclick = (e) => {
      e.stopPropagation();
      if (window.speechSynthesis && window.speechSynthesis.speaking && window.activeSpeakerBtn === speakerBtn) {
        stopCurrentSpeech();
        isSpeechEnabledGlobally = false;
        localStorage.setItem('roitx_speech_pref', 'false');
        speakerBtn.innerHTML = speakerOffSvg;
      } else {
        isSpeechEnabledGlobally = true;
        localStorage.setItem('roitx_speech_pref', 'true');
        speakerBtn.innerHTML = speakerOnSvg;
        speakText(plainText, speakerBtn, true);
      }
    };

    [copyBtn, upBtn, downBtn, shareBtn, speakerBtn].forEach(b => actionBar.appendChild(b));
    msgDiv.appendChild(actionBar);
  }

  if (showTime) {
    const timeDiv = document.createElement("div");
    timeDiv.innerHTML = `<span class="chat-time">${(record && record.time) || getCurrentFormattedTime()}</span>`;
    msgDiv.appendChild(timeDiv);
  }

  container.appendChild(msgDiv);
  if (!restoring) scrollToBottom();

  // ---- Typewriter (sirf naye AI answers par) ----
  if (enableTypewriter && type === "ai" && !restoring) {
    if (actionBar) actionBar.style.display = "none";   // text poora hone ke baad dikhega
    typeHTML(contentDiv, htmlContent, () => {
      renderMathSafely(msgDiv);
      if (actionBar) actionBar.style.display = "flex";
      scrollToBottom();
      if (isSpeechEnabledGlobally && speakerBtn) speakText(plainText, speakerBtn, true);
    });
  } else {
    contentDiv.innerHTML = htmlContent;
    renderMathSafely(msgDiv);
  }
};

/* ---------- Nayi chat ---------- */
function startNewChat() {
  if (chatHistory.length > 1 && !confirm("Poori chat history delete karke nayi chat shuru karein?")) return;
  stopCurrentSpeech();
  chatHistory = [];
  localStorage.removeItem(CHAT_STORE_KEY);
  localStorage.removeItem(CHAT_STATE_KEY);
  currentLanguage = 'hinglish';
  selectedSubject = 'General';
  const c = document.getElementById("answerHistory");
  if (c) c.innerHTML = "";
  renderLanguageSelection();
}

/* ---------- Page load par purani chat wapas laao ---------- */
(function restoreChat() {
  try {
    const st = JSON.parse(localStorage.getItem(CHAT_STATE_KEY) || '{}');
    if (st.currentLanguage) currentLanguage = st.currentLanguage;
    if (st.selectedSubject) selectedSubject = st.selectedSubject;
  } catch (e) {}

  chatHistory = loadChatStore();
  const container = document.getElementById("answerHistory");
  if (!container || !chatHistory.length) return;

  chatHistory.forEach(r => window.appendChatMessage(r.html, r.type, r.showTime !== false, false, { restoring: true, record: r }));
  container.scrollTop = container.scrollHeight;

  // MathJax async load hota hai, isliye page load ke baad poori history ka math render karo
  window.addEventListener('load', () => {
    if (window.MathJax && MathJax.startup && MathJax.startup.promise) {
      MathJax.startup.promise
        .then(() => MathJax.typesetPromise([container]))
        .then(() => { container.scrollTop = container.scrollHeight; })
        .catch(() => {});
    }
  });
})();


/* =====================================================
   THEME TOGGLE (Dark / Light) + CLAUDE-LIKE EXTRAS
   ===================================================== */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.content = t === 'dark' ? '#080f19' : '#f5f8fd';
}
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('roitx_theme', next); } catch (e) {}
}

// Options card: tap karne par chosen option highlight, baaki dim (Claude question picker jaisa)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.wa-action-btn');
  if (!btn) return;
  const card = btn.closest('.interactive-card');
  if (card && !card.classList.contains('answered')) {
    btn.classList.add('selected');
    card.classList.add('answered');
  }
}, true);

// Textarea auto-grow (multi-line sawaal par box badhta hai)
function autoGrowInput() {
  const el = document.getElementById('question');
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}
(function () {
  const el = document.getElementById('question');
  if (el) el.addEventListener('input', autoGrowInput);
  const _clear = clearQuestionInput;
  window.clearQuestionInput = function () { _clear(); autoGrowInput(); if (typeof stopMic === 'function') stopMic(); };
})();


/* =====================================================
   CLAUDE-STYLE: THINKING PANEL, TYPING, ERROR+RETRY, SOUND
   ===================================================== */
let lastRequest = null;

/* ---- Typing animation: tags safe, blinking cursor ---- */
function typeHTML(el, html, onDone) {
  el.innerHTML = html;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = []; let n;
  while ((n = walker.nextNode())) if (n.nodeValue.length) nodes.push({ n, full: n.nodeValue });
  nodes.forEach(o => o.n.nodeValue = '');
  const total = nodes.reduce((a, o) => a + o.full.length, 0);
  const step = Math.max(2, Math.ceil(total / 350));
  const cursor = document.createElement('span');
  cursor.className = 'type-cursor';
  const box = document.getElementById('answerHistory');
  let ni = 0, ci = 0;
  (function tick() {
    let left = step;
    while (left > 0 && ni < nodes.length) {
      const o = nodes[ni], take = Math.min(left, o.full.length - ci);
      ci += take; left -= take;
      o.n.nodeValue = o.full.slice(0, ci);
      if (ci >= o.full.length) { ni++; ci = 0; }
    }
    if (ni < nodes.length) {
      const cur = nodes[ni];
      cur.n.parentNode.insertBefore(cursor, cur.n.nextSibling);
      if (box) box.scrollTop = box.scrollHeight;
      setTimeout(tick, 16);
    } else { cursor.remove(); onDone && onDone(); }
  })();
}

/* ---- Thinking / working panel (Claude jaisa) ---- */
function buildWorkCard(img) {
  const box = document.getElementById('answerHistory');
  const wrap = document.createElement('div');
  wrap.className = 'chat-bubble ai';
  const lang = currentLanguage;
  const steps = [];
  if (img) steps.push(t('s_img'));
  steps.push(t('s_read'), t('s_find', subjLabel(selectedSubject)), t('s_solve'));
  wrap.innerHTML = `
    <div class="work-card">
      <button type="button" class="work-head">
        <span class="work-spinner"></span>
        <span class="work-title">${t('think')}</span>
        <span class="work-time">0s</span>
        <svg class="work-chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
      <div class="work-body">
        <div class="work-cmd"><b>›</b> solve --subject="${escapeHtml(selectedSubject)}" --lang=${lang}${img ? ' --image' : ''}</div>
        <div class="work-steps"></div>
      </div>
    </div>`;
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;

  const card = wrap.querySelector('.work-card');
  const list = wrap.querySelector('.work-steps');
  const title = wrap.querySelector('.work-title');
  const timeEl = wrap.querySelector('.work-time');
  wrap.querySelector('.work-head').onclick = () => card.classList.toggle('collapsed');

  const addStep = (text) => {
    list.querySelectorAll('.work-step.run').forEach(s => s.classList.replace('run', 'ok'));
    const s = document.createElement('div');
    s.className = 'work-step run';
    s.innerHTML = `<span class="dot"></span><span>${text}</span>`;
    list.appendChild(s);
    box.scrollTop = box.scrollHeight;
  };

  let i = 0, secs = 0;
  addStep(steps[i++]);
  const stepTimer = setInterval(() => { if (i < steps.length) addStep(steps[i++]); }, 1300);
  const clock = setInterval(() => { secs++; timeEl.textContent = secs + 's'; }, 1000);

  return {
    finish() {
      clearInterval(stepTimer); clearInterval(clock);
      while (i < steps.length) addStep(steps[i++]);
      addStep(t('s_verify'));
      list.querySelectorAll('.work-step.run').forEach(s => s.classList.replace('run', 'ok'));
      title.textContent = t('done', Math.max(secs, 1));
      card.classList.add('done');
      setTimeout(() => card.classList.add('collapsed'), 500);
    },
    remove() { clearInterval(stepTimer); clearInterval(clock); wrap.remove(); }
  };
}

/* ---- Error card (high demand) + Retry ---- */
function showErrorCard(kind, detail) {
  const M = { demand: [t('errDemandT'), t('errDemandM')], network: [t('errNetT'), t('errNetM')], generic: [t('errGenT'), t('errGenM')] };
  const [tt, m] = M[kind] || M.generic;
  const box = document.getElementById('answerHistory');
  const wrap = document.createElement('div');
  wrap.className = 'chat-bubble ai';
  wrap.innerHTML = `
    <div class="err-card">
      <div class="err-title">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        ${tt}
      </div>
      <div class="err-msg">${m}${kind === 'generic' && detail ? `<br><small>${escapeHtml(String(detail).slice(0, 140))}</small>` : ''}</div>
      <button type="button" class="retry-btn">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10"></path></svg>
        ${t('retry')}
      </button>
    </div>`;
  wrap.querySelector('.retry-btn').onclick = () => {
    wrap.remove();
    if (lastRequest) solveWithAI(lastRequest.q, lastRequest.img);
  };
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

/* ---- Main solve engine (override) ---- */
window.solveWithAI = async function (questionText, imageBase64 = null) {
  lastRequest = { q: questionText, img: imageBase64 };
  const sendBtn = document.getElementById('solveBtn');
  if (sendBtn) sendBtn.disabled = true;
  const work = buildWorkCard(imageBase64);

  const URL_ = window.SUPABASE_FUNCTION_URL || "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
  const KEY_ = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YXN0d2Vobm5xaWNyaWtuZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTk5NTEsImV4cCI6MjA4MDgzNTk1MX0.5_UvwaG0X8k_Emj-cMC0KjEqlvU6hgAt5IsHJdgARvk";
  const styleLine = {
    en: 'Solve the question step-by-step in English.',
    hi: 'Solve in clear Hindi Devanagari script. Put English terms in brackets next to Hindi terms.',
    hinglish: 'Solve in clean Hinglish (Roman Hindi + English).'
  }[currentLanguage] || 'Solve in clean Hinglish.';
  const PROMPT = `You are an expert tutor for Class 9-12. Subject: ${selectedSubject}. ${styleLine} Use LaTeX for math ($...$ inline, $$...$$ display). Direct answer only, no meta chatter.`;
  const demandRe = /quota|rate.?limit|overload|busy|capacity|too many|unavailable|429|503|529/i;

  try {
    const res = await fetch(URL_, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": KEY_, "Authorization": `Bearer ${KEY_}` },
      body: JSON.stringify({
        prompt: `${PROMPT}\n\nQuery: ${questionText || "Solve the attached question/image"}`,
        language: currentLanguage,
        image: imageBase64
      })
    });
    if ([429, 502, 503, 504, 529].includes(res.status)) { const e = new Error('demand'); e.kind = 'demand'; throw e; }

    let data = {};
    try { data = await res.json(); } catch (e) {}

    let raw = "";
    if (data.choices && data.choices[0]?.message?.content) raw = data.choices[0].message.content;
    else if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) raw = data.candidates[0].content.parts[0].text;
    else if (data.content) raw = data.content;
    else if (data.result || data.response || data.output || data.message) raw = data.result || data.response || data.output || data.message;
    else if (data.error) {
      const msg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
      const e = new Error(msg); e.kind = demandRe.test(msg) ? 'demand' : 'generic'; throw e;
    }
    if (!raw) { const e = new Error('Invalid response from server'); e.kind = 'generic'; throw e; }

    work.finish();
    const clean = cleanAIResponse(raw);
    const html = typeof marked !== 'undefined' ? marked.parse(clean) : clean.replace(/\n/g, "<br>");
    playChime();
    appendChatMessage(`<b>💡 Solution / Answer:</b><br><br>${html}`, "ai", true, true, { meta: { q: questionText || (imageBase64 ? '[photo question]' : ''), subject: selectedSubject, lang: currentLanguage } });
  } catch (err) {
    work.remove();
    const kind = err.kind || (err instanceof TypeError ? 'network' : 'generic');
    showErrorCard(kind, err.message);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
};

/* ---- Sound: header toggle + soft chime ---- */
let _audioCtx = null;
function playChime() {
  if (!isSpeechEnabledGlobally) return;
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = _audioCtx.currentTime;
    [660, 880].forEach((f, i) => {
      const o = _audioCtx.createOscillator(), g = _audioCtx.createGain(), s = t + i * 0.09;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.08, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.25);
      o.connect(g); g.connect(_audioCtx.destination);
      o.start(s); o.stop(s + 0.28);
    });
  } catch (e) {}
}
function syncSoundBtn() {
  document.documentElement.setAttribute('data-sound', isSpeechEnabledGlobally ? 'on' : 'off');
}
function toggleSound() {
  isSpeechEnabledGlobally = !isSpeechEnabledGlobally;
  localStorage.setItem('roitx_speech_pref', String(isSpeechEnabledGlobally));
  if (!isSpeechEnabledGlobally) stopCurrentSpeech(); else playChime();
  syncSoundBtn();
  showToast(t(isSpeechEnabledGlobally ? 'soundOn' : 'soundOff'));
}
document.addEventListener('click', (e) => {
  if (e.target.closest('.msg-speaker-btn')) setTimeout(syncSoundBtn, 60);
});
syncSoundBtn();


/* =====================================================
   LANGUAGE PACKS (Hindi = pura Devanagari, English = pure English)
   ===================================================== */
const I18N = {
  hinglish: {
    status:'Online · Saath me padhne ke liye taiyar', ph:'Apna sawaal ya equation likhein, bolein ya photo bhejein...',
    subjQ:'Apna vishay / subject chunein:', math:'Mathematics', phys:'Physics', gen:'General Math & Science Doubt', genS:'General Doubt', menu:'Main Menu',
    picked:f=>`Aapka vishay <b>${f}</b> select ho gaya hai! Neeche sawaal type karein, mic se bolein ya photo bhejein, main turant solution bhej dunga.`,
    admin:'Admin ko doubt bhejein', change:'Subject badlein', qstat:'Queue status dekhein', qecho:'Queue Status', home:'Main Menu',
    qPend:n=>`🕒 Aapke abhi <b>${n}</b> doubt admin queue me pending hain.`, qNone:'✅ Aapka koi doubt pending nahi hai!', qErr:'⚠️ Queue status check karne me error aaya.',
    think:'Soch raha hoon…', s_img:'Photo se question padh raha hoon', s_read:'Sawaal samajh raha hoon', s_find:s=>`${s} ke concepts aur formulas dhoondh raha hoon`, s_solve:'Step-by-step solution bana raha hoon', s_verify:'Answer verify kar raha hoon', done:n=>`Soch kar ${n}s me jawab diya`,
    errDemandT:'ROITX AI par abhi demand bahut zyada hai', errDemandM:'Is waqt bahut saare students sawaal puchh rahe hain. Thodi der baad dobara try karein.',
    errNetT:'Internet connection me problem hai', errNetM:'Apna network check karke dobara try karein.', errGenT:'Kuch gadbad ho gayi', errGenM:'Answer nahi ban paya. Dobara try karein.', retry:'Retry',
    toastCopy:'Copy ho gaya ✅', toastUp:'Shukriya! Feedback record ho gaya 👍', toastDown:'Feedback note kar liya, isme sudhar kiya jayega 👎', soundOn:'Sound on 🔊', soundOff:'Sound off 🔇',
    micDenied:'Mic ki permission dein', micNo:'Is browser me mic support nahi hai', micOn:'Sun raha hoon…'
  },
  hi: {
    status:'ऑनलाइन · साथ में पढ़ने के लिए तैयार', ph:'अपना सवाल या समीकरण लिखें, बोलें या फोटो भेजें...',
    subjQ:'कृपया अपना विषय चुनें:', math:'गणित', phys:'भौतिक विज्ञान', gen:'सामान्य सवाल (गणित और विज्ञान)', genS:'सामान्य सवाल', menu:'मुख्य मेनू',
    picked:f=>`आपका विषय <b>${f}</b> चुन लिया गया है! नीचे सवाल लिखें, माइक से बोलें या फोटो भेजें, मैं तुरंत हल बता दूँगा।`,
    admin:'एडमिन को सवाल भेजें', change:'विषय बदलें', qstat:'कतार की स्थिति देखें', qecho:'कतार की स्थिति', home:'मुख्य मेनू',
    qPend:n=>`🕒 आपके अभी <b>${n}</b> सवाल एडमिन की कतार में लंबित हैं।`, qNone:'✅ आपका कोई भी सवाल लंबित नहीं है!', qErr:'⚠️ कतार की स्थिति जाँचने में त्रुटि हुई।',
    think:'सोच रहा हूँ…', s_img:'फोटो से सवाल पढ़ रहा हूँ', s_read:'सवाल समझ रहा हूँ', s_find:s=>`${s} की अवधारणाएँ और सूत्र खोज रहा हूँ`, s_solve:'चरण-दर-चरण हल तैयार कर रहा हूँ', s_verify:'उत्तर जाँच रहा हूँ', done:n=>`${n} सेकंड सोचकर उत्तर दिया`,
    errDemandT:'ROITX AI पर अभी बहुत अधिक माँग है', errDemandM:'इस समय बहुत से विद्यार्थी सवाल पूछ रहे हैं। कुछ देर बाद फिर से प्रयास करें।',
    errNetT:'इंटरनेट कनेक्शन में समस्या है', errNetM:'अपना नेटवर्क जाँचकर फिर से प्रयास करें।', errGenT:'कुछ गड़बड़ हो गई', errGenM:'उत्तर नहीं बन पाया। फिर से प्रयास करें।', retry:'फिर से प्रयास करें',
    toastCopy:'कॉपी हो गया ✅', toastUp:'धन्यवाद! आपकी प्रतिक्रिया दर्ज हो गई 👍', toastDown:'प्रतिक्रिया दर्ज हो गई, इसमें सुधार किया जाएगा 👎', soundOn:'ध्वनि चालू 🔊', soundOff:'ध्वनि बंद 🔇',
    micDenied:'कृपया माइक की अनुमति दें', micNo:'इस ब्राउज़र में माइक समर्थित नहीं है', micOn:'सुन रहा हूँ…'
  },
  en: {
    status:'Online · Ready to study together', ph:'Type your question or equation, speak, or upload a photo...',
    subjQ:'Please select your study subject:', math:'Mathematics', phys:'Physics', gen:'General Math & Science Doubt', genS:'General Doubt', menu:'Main Menu',
    picked:f=>`Your subject <b>${f}</b> is selected! Type your question, use the mic, or upload a photo and I'll solve it instantly.`,
    admin:'Send doubt to admin', change:'Change subject', qstat:'Check queue status', qecho:'Queue Status', home:'Main Menu',
    qPend:n=>`🕒 You have <b>${n}</b> request(s) pending in the admin queue.`, qNone:'✅ You have no pending doubts in the queue!', qErr:'⚠️ Could not check the queue status.',
    think:'Thinking…', s_img:'Reading the question from the photo', s_read:'Understanding the question', s_find:s=>`Looking up ${s} concepts and formulas`, s_solve:'Building the step-by-step solution', s_verify:'Verifying the answer', done:n=>`Thought for ${n}s`,
    errDemandT:'ROITX AI is experiencing high demand', errDemandM:'Many students are asking questions right now. Please try again in a little while.',
    errNetT:'There is a problem with your internet connection', errNetM:'Check your network and try again.', errGenT:'Something went wrong', errGenM:'Could not generate an answer. Please try again.', retry:'Retry',
    toastCopy:'Copied ✅', toastUp:'Thanks! Your feedback was recorded 👍', toastDown:'Feedback noted, we will work on improving this 👎', soundOn:'Sound on 🔊', soundOff:'Sound off 🔇',
    micDenied:'Please allow microphone access', micNo:'Microphone is not supported in this browser', micOn:'Listening…'
  }
};
function t(k, ...a) {
  const d = I18N[currentLanguage] || I18N.hinglish;
  const v = d[k] !== undefined ? d[k] : I18N.hinglish[k];
  return typeof v === 'function' ? v(...a) : v;
}
function subjLabel(s, short) { return s === 'Mathematics' ? t('math') : s === 'Physics' ? t('phys') : t(short ? 'genS' : 'gen'); }

function applyUiLanguage() {
  const st = document.querySelector('.online-status'); if (st) st.textContent = t('status');
  const q = document.getElementById('question'); if (q) q.placeholder = t('ph');
  const p = document.getElementById('ctxPill'); if (p) p.textContent = subjLabel(selectedSubject, true);
  document.documentElement.lang = currentLanguage === 'en' ? 'en' : 'hi';
}
const _selectLanguageOrig = selectLanguage;
window.selectLanguage = function (l, label) { _selectLanguageOrig(l, label); applyUiLanguage(); };

/* ---- Options cards in chosen language ---- */
function optionsCard(text, buttons) {
  return `<div class="interactive-card"><div class="card-text">${text}</div><div class="interactive-btn-group">` +
    buttons.map(([fn, label]) => `<button class="wa-action-btn" onclick="${fn}">${label}</button>`).join('') +
    `</div></div>`;
}
window.renderFieldSelection = function () {
  applyUiLanguage();
  appendChatMessage(optionsCard(t('subjQ'), [
    ["selectField('Mathematics')", t('math')],
    ["selectField('Physics')", t('phys')],
    ["selectField('General Doubt')", t('gen')],
    ["renderMainMenu()", t('menu')]
  ]), "ai", false);
};
window.selectField = function (field) {
  selectedSubject = field;
  const label = subjLabel(field);
  appendChatMessage(label, "user");
  applyUiLanguage();
  setTimeout(() => appendChatMessage(optionsCard(t('picked', `${subjLabel(field, true)}`), [
    ["openAdminDoubtModal()", t('admin')],
    ["renderFieldSelection()", t('change')],
    ["checkQueueStatus()", t('qstat')],
    ["renderMainMenu()", t('home')]
  ]), "ai", false), 200);
};
window.renderMainMenu = function () {
  appendChatMessage(t('menu'), "user");
  setTimeout(renderLanguageSelection, 200);
};
window.checkQueueStatus = async function () {
  appendChatMessage(t('qecho'), "user");
  try {
    const { count, error } = await window.supabaseClient.from('doubts').select('*', { count: 'exact' }).eq('status', 'pending').eq('session_id', getSessionId());
    if (error) return appendChatMessage(t('qErr'), "ai");
    appendChatMessage(count > 0 ? t('qPend', count) : t('qNone'), "ai");
  } catch (e) { appendChatMessage(t('qErr'), "ai"); }
};

/* =====================================================
   FEEDBACK -> SUPABASE (sirf 👎 -> existing doubts queue)
   ===================================================== */
async function sendFeedbackToServer(record, rating) {
  // Naya table nahi: sirf 👎 par, pehle se bani `doubts` queue me ek row jati hai
  if (rating !== 'down' || record.fbSent || !window.supabaseClient) return;
  try {
    let user = null;
    try {
      user = window.getCurrentUser ? await window.getCurrentUser()
           : ((await window.supabaseClient.auth.getSession()).data.session || {}).user;
    } catch (e) {}
    const m = record.meta || {};
    const ans = htmlToPlainText(record.html).slice(0, 500);
    const { error } = await window.supabaseClient.from('doubts').insert([{
      question: `👎 AI answer galat/adhura laga\nSawaal: ${m.q || '(photo)'}\nAI ka answer: ${ans}`,
      status: 'pending',
      session_id: getSessionId(),
      user_id: (user && user.id) || null,
      user_email: (user && user.email) || null,
      user_name: user && user.email ? user.email.split('@')[0] : 'Guest'
    }]);
    if (error) return console.warn('Feedback save error:', error.message);
    record.fbSent = true;
    persistChat();
  } catch (e) { console.warn('Feedback save failed', e); }
}

/* =====================================================
   MIC (voice input) — Web Speech API
   ===================================================== */
let recog = null, micActive = false;
function stopMic() { if (recog && micActive) { try { recog.stop(); } catch (e) {} } }
function toggleMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return showToast(t('micNo'));
  if (micActive) return stopMic();
  stopCurrentSpeech();
  const ta = document.getElementById('question'), btn = document.getElementById('micBtn');
  const base = ta.value.trim() ? ta.value.trim() + ' ' : '';
  recog = new SR();
  recog.lang = currentLanguage === 'en' ? 'en-IN' : 'hi-IN';
  recog.interimResults = true;
  recog.continuous = false;
  recog.onstart = () => { micActive = true; btn.classList.add('listening'); ta.placeholder = t('micOn'); };
  recog.onresult = (e) => {
    let txt = '';
    for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
    ta.value = base + txt; autoGrowInput();
  };
  recog.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') showToast(t('micDenied')); };
  recog.onend = () => { micActive = false; btn.classList.remove('listening'); applyUiLanguage(); };
  try { recog.start(); } catch (e) {}
}

applyUiLanguage();
