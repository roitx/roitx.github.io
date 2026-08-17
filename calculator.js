// --- GLOBAL CALCULATOR ENGINE ---
let exp = ""; 
let cursorPos = 0; 
let isDeg = true;
let isShift = false;
let isAlpha = false;
let isHyp = false; 
let lastAnswer = "0"; 
let memory = 0; 
let historyIndex = -1;
let currentAIMode = "text"; // 'text', 'pad', or 'scan'

const exprDiv = document.getElementById("expression");
const resDiv = document.getElementById("result");
const shiftInd = document.getElementById("shiftIndicator");
const alphaInd = document.getElementById("alphaIndicator");
const degInd = document.getElementById("degIndicator");
const radInd = document.getElementById("radIndicator");

// --- CANVAS DRAWING ENGINE ---
let canvas, ctx, isDrawing = false;

function initCanvas() {
  canvas = document.getElementById("mathCanvas");
  if (!canvas) return;
  ctx = canvas.getContext("2d");
  ctx.strokeStyle = "#00ff9c";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  // Touch & Mouse Events
  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseleave", stopDrawing);

  canvas.addEventListener("touchstart", (e) => { e.preventDefault(); startDrawing(e.touches[0]); });
  canvas.addEventListener("touchmove", (e) => { e.preventDefault(); draw(e.touches[0]); });
  canvas.addEventListener("touchend", stopDrawing);
}

function startDrawing(e) {
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  ctx.beginPath();
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  ctx.stroke();
}

function stopDrawing() { isDrawing = false; }

function clearCanvas() {
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// --- CANVAS COMPRESSION HELPER ---
function getCompressedCanvasImage() {
  if (!canvas) return null;
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  const maxWidth = 400;
  const scale = Math.min(1, maxWidth / canvas.width);
  tempCanvas.width = canvas.width * scale;
  tempCanvas.height = canvas.height * scale;

  tempCtx.fillStyle = "#000000";
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

  return tempCanvas.toDataURL('image/jpeg', 0.5);
}

// FULLSCREEN TOGGLE CONTROLLER
function toggleAISolverFullscreen() {
  const content = document.getElementById("aiContent");
  if (content) {
    content.classList.toggle("fullscreen");
  }
}

// --- FAST SUBMIT AI SOLVER ---
async function submitAISolver(lang) {
  let loader = document.getElementById("aiLoader");
  let resBox = document.getElementById("aiResponse");
  
  if (loader) loader.style.display = "block";
  if (resBox) resBox.innerHTML = "";

  const systemInstruction = `You are a pure math engine.
Write ONLY the direct mathematical derivation and answer in ${lang === 'hi' ? 'Hindi' : 'English'}.
RULES:
1. Absolutely NO thinking process, rules analysis, or extra chatter.
2. Start DIRECTLY with Step 1 or the main equation.
3. Use MathJax/LaTeX ($...$ for inline, $$...$$ for display).`;

  let userText = document.getElementById("aiPrompt")?.value.trim() || "Solve equation";
  let base64Img = null;

  if (currentAIMode !== 'text') {
    base64Img = (currentAIMode === 'pad') ? getCompressedCanvasImage() : document.getElementById("imagePreview")?.src;
  }

  const apiUrl = "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
  const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YXN0d2Vobm5xaWNyaWtuZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTk5NTEsImV4cCI6MjA4MDgzNTk1MX0.5_UvwaG0X8k_Emj-cMC0KjEqlvU6hgAt5IsHJdgARvk";

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ 
        prompt: systemInstruction + "\n\nTask: " + userText,
        language: lang, 
        image: base64Img,
        generationConfig: { max_output_tokens: 300, temperature: 0.1 }
      })
    });

    const data = await response.json();
    if (loader) loader.style.display = "none";

    if (data.choices && data.choices[0]?.message?.content) {
      let content = data.choices[0].message.content;

      if (resBox) resBox.innerHTML = content.replace(/\n/g, "<br>");
      
      if (window.MathJax) {
        MathJax.typesetPromise([resBox]);
      }
    } else {
      if (resBox) resBox.innerText = "Error: Invalid AI Response.";
    }
  } catch (err) {
    if (loader) loader.style.display = "none";
    if (resBox) resBox.innerText = "Error loading response.";
  }
}

// --- AI MODE & PHOTO PREVIEW HELPERS ---
function switchAIMode(mode) {
  currentAIMode = mode;
  document.getElementById("tabText")?.classList.toggle("active", mode === 'text');
  document.getElementById("tabPad")?.classList.toggle("active", mode === 'pad');
  document.getElementById("tabScan")?.classList.toggle("active", mode === 'scan');

  if (document.getElementById("aiTextSec")) document.getElementById("aiTextSec").style.display = mode === 'text' ? 'block' : 'none';
  if (document.getElementById("aiPadSec")) document.getElementById("aiPadSec").style.display = mode === 'pad' ? 'block' : 'none';
  if (document.getElementById("aiScanSec")) document.getElementById("aiScanSec").style.display = mode === 'scan' ? 'block' : 'none';

  if (mode === 'pad' && !canvas) {
    setTimeout(initCanvas, 100);
  }
}

function handleImagePreview(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const previewImg = document.getElementById("imagePreview");
      const previewContainer = document.getElementById("imagePreviewContainer");
      if (previewImg) previewImg.src = e.target.result;
      if (previewContainer) previewContainer.style.display = "block";
    };
    reader.readAsDataURL(file);
  }
}

// --- GUIDE MODAL CONTROLLERS ---
function openGuideModal() {
  const m = document.getElementById("guideModal");
  if (m) m.style.display = "flex";
}

function closeGuideModal() {
  const m = document.getElementById("guideModal");
  if (m) m.style.display = "none";
}

window.addEventListener("click", function(e) {
  const m = document.getElementById("guideModal");
  if (e.target === m) m.style.display = "none";
});

// --- MATH & CALCULATOR CORE FUNCTIONS ---
function preprocess(raw) {
  let s = raw;
  s = s.replace(/Ans/g, `(${lastAnswer})`);
  s = s.replace(/π/g, "pi").replace(/e/g, "e");

  s = s.replace(/sin⁻¹\(/g, "asin(").replace(/cos⁻¹\(/g, "acos(").replace(/tan⁻¹\(/g, "atan(");
  s = s.replace(/sinh\(/g, "sinh(").replace(/cosh\(/g, "cosh(").replace(/tanh\(/g, "tanh(");
  s = s.replace(/erf\(/g, "erf(").replace(/gamma\(/g, "gamma(").replace(/zeta\(/g, "zeta(");
  s = s.replace(/lcm\(/g, "lcm(").replace(/gcd\(/g, "gcd(");
  
  s = s.replace(/(\d+)C(\d+)/g, "(factorial($1)/(factorial($2)*factorial($1-$2)))");
  s = s.replace(/(\d+)P(\d+)/g, "(factorial($1)/factorial($1-$2))");

  s = s.replace(/×/g, "*").replace(/÷/g, "/").replace(/√\(/g, "sqrt(").replace(/∛\(/g, "cbrt(");
  s = s.replace(/(\d+)²/g, "$1^2").replace(/(\d+)³/g, "$1^3");

  if (isDeg) {
    s = s.replace(/\b(sin|cos|tan|asin|acos|atan)\(([^)]+)\)/g, (match, fn, angle) => {
      if (fn.startsWith('a')) return `(${fn}(${angle}) * 180 / pi)`;
      return `${fn}((${angle}) * pi / 180)`;
    });
  }
  return s;
}

function btnPress(key) {
  if (isShift) { handleShift(key); return; }
  if (isAlpha) { handleAlpha(key); return; }

  const map = {
    'SIN': isHyp ? 'sinh(' : 'sin(',
    'COS': isHyp ? 'cosh(' : 'cos(',
    'TAN': isHyp ? 'tanh(' : 'tan(',
    'LOG': 'log10(', 'LN': 'log(', 'SQRT': '√(', 
    'X2': '²', 'X3': '³', 'POW': '^', 'PI': 'π', 
    'NCR': 'C', 'ANS': 'Ans', 'MOD': '%', 'EXP': 'e',
    'ABS': 'abs(', 'HYP': 'hyp', 'COMMA': ',',
    'LCM': 'lcm(', 'RND': 'random()'
  };

  if (key === 'HYP') { isHyp = true; return; }
  if (key === 'M+') { handleMemory(1); return; }

  let val = map[key] || key;
  insertAtCursor(val);
  if (val.endsWith('(')) { insertAtCursor(")"); cursorPos++; }
  isHyp = false; 
  updateDisplay();
}

function handleShift(key) {
  const sMap = {
    'SIN': 'sin⁻¹(', 'COS': 'cos⁻¹(', 'TAN': 'tan⁻¹(',
    'SQRT': '∛(', 'LOG': '10^(', 'LN': 'e^(', 
    'X2': '!', 'X3': '^-1', 'POW': '^(1/', 'NCR': 'P', 
    'POL': 'Rec(', 'PI': 'e', 'M+': 'M-', 'ABS': 'erf(',
    'HYP': 'gamma(', 'COMMA': 'zeta(', 'LCM': 'gcd(', 'MOD': 'mod('
  };
  
  if (key === 'M+') { handleMemory(-1); } 
  else if (sMap[key]) {
    let val = sMap[key];
    insertAtCursor(val);
    if (val.endsWith('(')) { insertAtCursor(")"); cursorPos++; }
  }
  toggleShift(); 
  updateDisplay();
}

function handleAlpha(key) {
  const aMap = {
    '7': 'A', '8': 'B', '9': 'C',
    '4': 'D', '5': 'E', '6': 'F',
    '1': 'X', '2': 'Y', '3': 'M',
    'RND': 'rand()'
  };
  if (aMap[key]) insertAtCursor(aMap[key]);
  toggleAlpha(); 
  updateDisplay();
}

function toggleShift() { isShift = !isShift; if (isShift) isAlpha = false; updateIndicators(); }
function toggleAlpha() { isAlpha = !isAlpha; if (isAlpha) isShift = false; updateIndicators(); }

function updateIndicators() { 
  if (shiftInd) shiftInd.classList.toggle("active", isShift); 
  if (alphaInd) alphaInd.classList.toggle("active", isAlpha); 
  document.body.classList.toggle("shift-mode-active", isShift);
  document.body.classList.toggle("alpha-mode-active", isAlpha);
}

function toggleDegRad() { 
  isDeg = !isDeg; 
  if (degInd) degInd.classList.toggle("active", isDeg);
  if (radInd) radInd.classList.toggle("active", !isDeg);
}

function updateDisplay() {
  if (!exprDiv) return;
  exprDiv.innerHTML = ""; 
  let pos = exp.length - cursorPos;
  let textBefore = document.createTextNode(exp.slice(0, pos));
  let textAfter = document.createTextNode(exp.slice(pos));
  let cursorSpan = document.createElement("span");
  cursorSpan.className = "cursor";

  exprDiv.appendChild(textBefore);
  exprDiv.appendChild(cursorSpan);
  exprDiv.appendChild(textAfter);
}

function insertAtCursor(v) {
  let pos = exp.length - cursorPos;
  exp = exp.slice(0, pos) + v + exp.slice(pos);
  updateDisplay();
}

function calculate() {
  if (exp === "") return;
  try {
    let cleanExp = preprocess(exp);
    let raw = math.evaluate(cleanExp);
    if (typeof raw === 'object' && raw.entries) raw = raw.entries[0];
    if (!isFinite(raw)) throw new Error("Math ERROR");
    
    let result = formatFinal(raw);
    if (resDiv) resDiv.innerText = result;
    lastAnswer = result.toString();
    saveHistory(exp + "=" + result);
    
    exp = ""; cursorPos = 0; updateDisplay();
  } catch (e) {
    if (resDiv) resDiv.innerText = "Math ERROR";
  }
}

function formatFinal(num) {
  if (Math.abs(num) > 1e12 || (Math.abs(num) < 1e-7 && num !== 0)) return num.toExponential(5);
  return Number.isInteger(num) ? num : parseFloat(num.toFixed(10));
}

function openAISolver() {
  const modal = document.getElementById("aiModal");
  if (modal) modal.style.display = "flex";
  switchAIMode('text');
}

function closeAISolver() {
  const modal = document.getElementById("aiModal");
  if (modal) modal.style.display = "none";
}

function changeTheme(themeClass) { document.body.className = themeClass; updateIndicators(); }

function handleMemory(dir) {
  try {
    memory += (math.evaluate(preprocess(exp || (resDiv ? resDiv.innerText : "0"))) * dir);
    if (resDiv) resDiv.innerText = "M=" + formatFinal(memory);
    exp = ""; updateDisplay();
  } catch(e) { if (resDiv) resDiv.innerText = "Error"; }
}

function navigateHistory(dir) {
  let hist = JSON.parse(localStorage.getItem("calcHistory")) || [];
  if (hist.length === 0) return;
  historyIndex = Math.min(Math.max(-1, historyIndex + dir), hist.length - 1);
  if (historyIndex === -1) { clearAll(); return; }
  exp = hist[hist.length - 1 - historyIndex].split('=')[0];
  cursorPos = 0;
  if (resDiv) resDiv.innerText = "HIST " + (historyIndex + 1);
  updateDisplay();
}

function moveCursor(dir) {
  if (dir === -1 && (exp.length - cursorPos) > 0) cursorPos++;
  else if (dir === 1 && cursorPos > 0) cursorPos--;
  updateDisplay();
}

function del() { 
  let idx = exp.length - cursorPos;
  if(idx > 0) exp = exp.slice(0, idx - 1) + exp.slice(idx);
  updateDisplay(); 
}

function clearAll() { exp = ""; cursorPos = 0; if (resDiv) resDiv.innerText = "0"; updateDisplay(); }

function saveHistory(t) {
  let h = JSON.parse(localStorage.getItem("calcHistory")) || [];
  h.push(t); if(h.length > 20) h.shift();
  localStorage.setItem("calcHistory", JSON.stringify(h));
}

function powerOn() {
  if (exprDiv) exprDiv.innerHTML = "";
  if (resDiv) resDiv.innerText = "ROITX SCIENTIFIC";
  isShift = false; isAlpha = false;
  updateIndicators();
  setTimeout(() => {
    if (resDiv) resDiv.innerText = "fx-350MS PRO";
    setTimeout(() => {
      exp = ""; cursorPos = 0;
      if (resDiv) resDiv.innerText = "0";
      updateDisplay();
    }, 500);
  }, 500);
}

powerOn();
