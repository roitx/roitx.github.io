/* ROITX PRO ENGINE V4.0 - ULTIMATE SCIENTIFIC SUITE 
   Merged & Optimized for Class 12 Boards (BSEB)
*/

// --- 1. GLOBAL STATE ---
let exp = ""; 
let cursorPos = 0; 
let isDeg = true;
let isShift = false;
let isAlpha = false;
let isHyp = false; 
let lastAnswer = "0"; 
let memory = 0; 
let currentMode = "COMP"; // Modes: COMP, EQN, MAT
let historyIndex = -1;

const exprDiv = document.getElementById("expression");
const resDiv = document.getElementById("result");
const shiftInd = document.getElementById("shiftIndicator");
const alphaInd = document.getElementById("alphaIndicator");

// --- 2. MATH ENGINE ---
function factorial(n) { 
    if (n < 0 || n > 170) return NaN;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
}

function preprocess(raw) {
    let s = raw;
    s = s.replace(/Ans/g, `(${lastAnswer})`);
    s = s.replace(/π/g, "Math.PI").replace(/e/g, "Math.E");

    // Scientific & Inverse
    s = s.replace(/sin⁻¹\(/g, "Math.asin(").replace(/cos⁻¹\(/g, "Math.acos(").replace(/tan⁻¹\(/g, "Math.atan(");
    s = s.replace(/(\d+(\.\d+)?)ᴇ(\d+)/g, "($1*Math.pow(10,$3))");
    s = s.replace(/(\d+(\.\d+)?)⁻¹/g, "(1/$1)");
    
    // Hyperbolic
    s = s.replace(/sinh\(/g, "Math.sinh(").replace(/cosh\(/g, "Math.cosh(").replace(/tanh\(/g, "Math.tanh(");
    
    // nCr/nPr Logic
    s = s.replace(/(\d+)C(\d+)/g, "(factorial($1)/(factorial($2)*factorial($1-$2)))");
    s = s.replace(/(\d+)P(\d+)/g, "(factorial($1)/factorial($1-$2))");

    // Standard Math
    s = s.replace(/×/g, "*").replace(/÷/g, "/").replace(/√\(/g, "Math.sqrt(").replace(/∛\(/g, "Math.cbrt(");
    s = s.replace(/(\d+)²/g, "Math.pow($1,2)").replace(/(\d+)³/g, "Math.pow($1,3)");
    s = s.replace(/\^/g, "**");

    // Implicit Multiplication
    s = s.replace(/(\d)(\()/g, "$1*($2)");
    s = s.replace(/(\))(\d)/g, "$1*$2");
    s = s.replace(/(\d)(Math|π|e|sin|cos|tan|log|ln|√)/g, "$1*$2");

    if (isDeg) {
        s = s.replace(/Math\.(sin|cos|tan)\(([^)]+)\)/g, "Math.$1(($2)*Math.PI/180)");
    }
    return s;
}

/* --- ROITX PRO ENGINE V4.1 - STICKY KEYS & BLINKING CURSOR --- */

// --- 1. CORE LOGIC ---
function btnPress(key) {
    // Note: Yahan se return logic hata di hai taaki SHIFT/ALPHA on hone par bhi 
    // agar koi key map me na ho toh normal key print ho jaye (jaise numbers)
    if (isShift) { handleShift(key); return; }
    if (isAlpha) { handleAlpha(key); return; }

    const map = {
        'SIN': isHyp ? 'sinh(' : 'sin(',
        'COS': isHyp ? 'cosh(' : 'cos(',
        'TAN': isHyp ? 'tanh(' : 'tan(',
        'LOG': 'log(', 'LN': 'ln(', 'SQRT': '√(', 
        'X2': '²', 'X3': '³', 'POW': '^', 'PI': 'π', 
        'NCR': 'C', 'ANS': 'Ans', 'MOD': ',', 'EXP': 'ᴇ'
    };

    if (key === 'ABS') { isHyp = !isHyp; resDiv.innerText = isHyp ? "HYP" : "0"; return; }
    if (key === 'M+') { handleMemory(1); return; }

    let val = map[key] || key;
    insertAtCursor(val);
    if (val.includes('(')) { insertAtCursor(")"); cursorPos = 1; }
    isHyp = false; 
    updateDisplay();
}

// Sticky SHIFT Logic
function handleShift(key) {
    const sMap = {
        'SIN': 'sin⁻¹(', 'COS': 'cos⁻¹(', 'TAN': 'tan⁻¹(',
        'SQRT': '∛(', 'LOG': '10^(', 'LN': 'e^(', 
        'X2': '!', 'NCR': 'P', 'POL': '⁻¹', 'PI': 'e', 'M+': 'M-'
    };
    
    if (key === 'M+') { 
        handleMemory(-1); 
    } else if (sMap[key]) {
        let val = sMap[key];
        insertAtCursor(val);
        if (val.includes('(')) { insertAtCursor(")"); cursorPos = 1; }
    } else {
        // Agar SHIFT on hai par key normal hai (jaise number 7)
        insertAtCursor(key);
    }
    // isShift = false; <-- REMOVED: Manual off hi hoga ab
    updateDisplay();
}

// Sticky ALPHA Logic
function handleAlpha(key) {
    const aMap = {
        '7': 'A', '8': 'B', '9': 'C',
        '4': 'D', '5': 'E', '6': 'F',
        '1': 'X', '2': 'Y', '3': 'M'
    };

    if (aMap[key]) {
        insertAtCursor(aMap[key]);
    } else {
        insertAtCursor(key);
    }
    // isAlpha = false; <-- REMOVED: Manual off hi hoga ab
    updateDisplay();
}

// --- 2. STICKY TOGGLES ---
function toggleShift() { 
    isShift = !isShift; 
    if (isShift) isAlpha = false; 
    updateIndicators(); 
}

function toggleAlpha() { 
    isAlpha = !isAlpha; 
    if (isAlpha) isShift = false; 
    updateIndicators(); 
}

function updateDisplay() {
    // Sabse pehle screen ko puri tarah saaf karo (No space, no pipe)
    exprDiv.innerHTML = ""; 

    // Cursor position fix karo
    let pos = exp.length - cursorPos;
    
    // Do naye text nodes banao (Ye HTML tags ko treat nahi karenge)
    let textBefore = document.createTextNode(exp.slice(0, pos));
    let textAfter = document.createTextNode(exp.slice(pos));

    // Naya cursor element banao
    let cursorSpan = document.createElement("span");
    cursorSpan.className = "cursor";

    // Ab sequence me add karo: Text -> Cursor -> Text
    exprDiv.appendChild(textBefore);
    exprDiv.appendChild(cursorSpan);
    exprDiv.appendChild(textAfter);
}

// Global variable check: Kahin exp ke andar pehle se toh cursor nahi?
function insertAtCursor(v) {
    // Agar v me galti se cursor aa raha ho toh use saaf karo
    let cleanVal = v.replace("|", ""); 
    
    let pos = exp.length - cursorPos;
    exp = exp.slice(0, pos) + cleanVal + exp.slice(pos);
    updateDisplay();
}
function calculate() {
    if (exp === "") return;
    try {
        let result = eval(preprocess(exp));
        resDiv.innerText = result;
        lastAnswer = result.toString();
        saveHistory(exp + "=" + result);
        
        // YAHAN DHAYN DO: exp ko ekdum khali rakho, cursor updateDisplay khud sambhalega
        exp = ""; 
        cursorPos = 0; 
        updateDisplay();
    } catch (e) {
        resDiv.innerText = "Math ERROR";
    }
}

// --- 4. CORE CALCULATIONS (EQN, MAT, COMP) ---
function calculate() {
    if (exp === "") return;
    try {
        let result;
        if (currentMode === "EQN") {
            result = solveEquation(exp);
        } else if (currentMode === "MAT") {
            result = solveMatrix(exp);
        } else {
            let cleanExp = preprocess(exp);
            let raw = eval(cleanExp);
            if (!isFinite(raw)) throw new Error("Math ERROR");
            result = formatFinal(raw);
        }

        resDiv.innerText = result;
        lastAnswer = result.toString();
        saveHistory(exp + "=" + result);
        
        // Success Style
        resDiv.style.color = "var(--accent)";
        setTimeout(() => { resDiv.style.color = "#000"; }, 500);
        
        exp = ""; cursorPos = 0; updateDisplay();
    } catch (e) {
        resDiv.innerText = e.message === "Math ERROR" ? "Math ERROR" : "Syntax ERROR";
    }
}

function solveEquation(input) {
    let vals = input.split(',').map(Number);
    if (vals.length !== 3) return "a,b,c req";
    let [a, b, c] = vals;
    let d = (b * b) - (4 * a * c);
    if (d < 0) return "Complex Roots";
    let x1 = (-b + Math.sqrt(d)) / (2 * a);
    let x2 = (-b - Math.sqrt(d)) / (2 * a);
    return `x1:${x1.toFixed(2)} x2:${x2.toFixed(2)}`;
}

function solveMatrix(input) {
    let v = input.split(',').map(Number);
    if (v.length !== 4) return "a,b,c,d req";
    return "det=" + ((v[0] * v[3]) - (v[1] * v[2]));
}

// --- 5. SYSTEM & UI ---
function powerOn() {
    exprDiv.innerHTML = "";
    resDiv.innerText = "ROITX SCIENTIFIC";
    setTimeout(() => {
        resDiv.innerText = "fx-350MS PRO";
        setTimeout(() => {
            exp = ""; cursorPos = 0; isShift = false;
            resDiv.innerText = "0";
            updateDisplay();
        }, 600);
    }, 600);
}

function toggleMode() {
    const m = ["COMP", "EQN", "MAT"];
    modeIndex = (modeIndex + 1) % m.length;
    currentMode = m[modeIndex];
    resDiv.innerText = "MODE: " + currentMode;
    setTimeout(() => clearAll(), 800);
}



function formatFinal(num) {
    if (Math.abs(num) > 1e12 || (Math.abs(num) < 1e-7 && num !== 0)) return num.toExponential(5);
    return Number.isInteger(num) ? num : parseFloat(num.toFixed(10));
}

// Memory, Navigation & Helpers
function handleMemory(dir) {
    try {
        memory += (eval(preprocess(exp || resDiv.innerText)) * dir);
        resDiv.innerText = "M=" + formatFinal(memory);
        exp = ""; updateDisplay();
    } catch(e) { resDiv.innerText = "Error"; }
}

function navigateHistory(dir) {
    let hist = JSON.parse(localStorage.getItem("calcHistory")) || [];
    if (hist.length === 0) return;
    historyIndex = Math.min(Math.max(-1, historyIndex + dir), hist.length - 1);
    if (historyIndex === -1) { clearAll(); return; }
    exp = hist[hist.length - 1 - historyIndex].split('=')[0];
    cursorPos = 0;
    resDiv.innerText = "HIST " + (historyIndex + 1);
    updateDisplay();
}

function moveCursor(dir) {
    if (dir === -1 && (exp.length - cursorPos) > 0) cursorPos++;
    else if (dir === 1 && cursorPos > 0) cursorPos--;
    updateDisplay();
}

function insertAtCursor(val) {
    let idx = exp.length - cursorPos;
    exp = exp.slice(0, idx) + val + exp.slice(idx);
}

function del() { 
    let idx = exp.length - cursorPos;
    if(idx > 0) exp = exp.slice(0, idx - 1) + exp.slice(idx);
    updateDisplay(); 
}

function clearAll() { exp = ""; cursorPos = 0; resDiv.innerText = "0"; updateDisplay(); }
function toggleShift() { isShift = !isShift; isAlpha = false; updateIndicators(); }
function toggleAlpha() { isAlpha = !isAlpha; isShift = false; updateIndicators(); }
function updateIndicators() { 
    shiftInd.classList.toggle("active", isShift); 
    alphaInd.classList.toggle("active", isAlpha); 
}
function toggleDegRad() { 
    isDeg = !isDeg; 
    document.getElementById("degBtn").innerText = isDeg ? "DEG" : "RAD"; 
}

function saveHistory(t) {
    let h = JSON.parse(localStorage.getItem("calcHistory")) || [];
    h.push(t); if(h.length > 20) h.shift();
    localStorage.setItem("calcHistory", JSON.stringify(h));
}

// Init
powerOn();
