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
let chartInstance = null;

const exprDiv = document.getElementById("expression");
const resDiv = document.getElementById("result");
const shiftInd = document.getElementById("shiftIndicator");
const alphaInd = document.getElementById("alphaIndicator");

// --- 2. MATH ENGINE (Math.js & Custom Preprocessor) ---
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
    s = s.replace(/π/g, "pi").replace(/e/g, "e");

    // Scientific & Inverse Trig mapping for Math.js
    s = s.replace(/sin⁻¹\(/g, "asin(").replace(/cos⁻¹\(/g, "acos(").replace(/tan⁻¹\(/g, "atan(");
    
    // Hyperbolic mapping
    s = s.replace(/sinh\(/g, "sinh(").replace(/cosh\(/g, "cosh(").replace(/tanh\(/g, "tanh(");
    
    // nCr/nPr Logic
    s = s.replace(/(\d+)C(\d+)/g, "(factorial($1)/(factorial($2)*factorial($1-$2)))");
    s = s.replace(/(\d+)P(\d+)/g, "(factorial($1)/factorial($1-$2))");

    // Standard Math symbols replacement
    s = s.replace(/×/g, "*").replace(/÷/g, "/").replace(/√\(/g, "sqrt(").replace(/∛\(/g, "cbrt(");
    s = s.replace(/(\d+)²/g, "$1^2").replace(/(\d+)³/g, "$1^3");

    // Degree to Radian conversion handling if DEG mode is active
    if (isDeg) {
        s = s.replace(/\b(sin|cos|tan|asin|acos|atan)\(([^)]+)\)/g, (match, fn, angle) => {
            if (fn.startsWith('a')) {
                // Inverse trig output conversion from radians back to degrees if needed, or input angle handling
                return `(${fn}(${angle}) * 180 / pi)`;
            }
            return `${fn}((${angle}) * pi / 180)`;
        });
    }

    return s;
}

// --- 3. CORE LOGIC & BUTTONS ---
function btnPress(key) {
    if (isShift) { handleShift(key); return; }
    if (isAlpha) { handleAlpha(key); return; }

    const map = {
        'SIN': isHyp ? 'sinh(' : 'sin(',
        'COS': isHyp ? 'cosh(' : 'cos(',
        'TAN': isHyp ? 'tanh(' : 'tan(',
        'LOG': 'log10(', 'LN': 'log(', 'SQRT': '√(', 
        'X2': '²', 'X3': '³', 'POW': '^', 'PI': 'π', 
        'NCR': 'C', 'ANS': 'Ans', 'MOD': 'mod', 'EXP': 'e',
        'ABS': '|', 'LOGBASE': 'log('
    };

    if (key === 'ABS') { 
        // Parallel lines for absolute value / modulus
        insertAtCursor('|');
        return; 
    }
    if (key === 'M+') { handleMemory(1); return; }

    let val = map[key] || key;
    insertAtCursor(val);
    if (val.includes('(')) { 
        insertAtCursor(")"); 
        cursorPos++; // Keep cursor inside brackets nicely
    }
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
        if (val.includes('(')) { 
            insertAtCursor(")"); 
            cursorPos++; 
        }
    } else {
        insertAtCursor(key);
    }
    updateDisplay();
}

// Sticky ALPHA Logic
function handleAlpha(key) {
    const aMap = {
        '7': 'A', '8': 'B', '9': 'C',
        '4': 'D', '5': 'E', '6': 'F',
        '1': 'X', '2': 'Y', '3': 'M'
    };

    insertAtCursor(aMap[key] || key);
    updateDisplay();
}

// --- 4. DISPLAY & CURSOR MANAGEMENT ---
function updateDisplay() {
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
    let cleanVal = v.replace("|", ""); 
    let pos = exp.length - cursorPos;
    exp = exp.slice(0, pos) + cleanVal + exp.slice(pos);
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
        resDiv.innerText = result;
        lastAnswer = result.toString();
        saveHistory(exp + "=" + result);
        
        resDiv.style.color = "var(--accent)";
        setTimeout(() => { resDiv.style.color = "#000"; }, 500);
        
        exp = ""; cursorPos = 0; updateDisplay();
    } catch (e) {
        resDiv.innerText = "Math ERROR";
    }
}

function formatFinal(num) {
    if (Math.abs(num) > 1e12 || (Math.abs(num) < 1e-7 && num !== 0)) return num.toExponential(5);
    return Number.isInteger(num) ? num : parseFloat(num.toFixed(10));
}

// --- 5. BILINGUAL AI SOLVER + GRAPH PLOTTING ---
function openAISolver() {
    document.getElementById("aiModal").classList.add("show");
}

function closeAISolver() {
    document.getElementById("aiModal").classList.remove("show");
}

async function askAISolver(lang) {
    let rawPrompt = document.getElementById("aiPrompt").value;
    if (!rawPrompt) return;

    let loader = document.getElementById("aiLoader");
    let resBox = document.getElementById("aiResponse");
    loader.style.display = "block";
    resBox.innerHTML = "";

    let promptText = lang === 'hi' 
        ? `Please solve this and explain step-by-step strictly in Hindi language: ${rawPrompt}` 
        : `Please solve this and explain step-by-step in English language: ${rawPrompt}`;

    let apiUrl = "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
    let apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YXN0d2Vobm5xaWNyaWtuZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTk5NTEsImV4cCI6MjA4MDgzNTk1MX0.5_UvwaG0X8k_Emj-cMC0KjEqlvU6hgAt5IsHJdgARvk";

    try {
        let response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                prompt: promptText,
                language: lang
            })
        });

        let data = await response.json();
        loader.style.display = "none";

        let aiText = "";
        if (data.choices && data.choices[0] && data.choices[0].message) {
            aiText = data.choices[0].message.content;
        } else if (data.result) {
            aiText = data.result;
        } else if (data.answer) {
            aiText = data.answer;
        } else {
            aiText = JSON.stringify(data);
        }

        resBox.innerHTML = aiText.replace(/\n/g, '<br>');
        plotGraph(rawPrompt);

    } catch (err) {
        loader.style.display = "none";
        resBox.innerHTML = "Connection Error! Supabase function tak request nahi pahunch pa rahi hai.";
    }
}

function plotGraph(funcStr) {
    let ctx = document.getElementById('graphCanvas').getContext('2d');
    let labels = [];
    let dataValues = [];

    let cleanFunc = funcStr.replace(/^[a-zA-Z\s:]+graph\s+of\s+/i, '').trim();
    if (!cleanFunc || cleanFunc === "") cleanFunc = "x^2";

    for (let x = -10; x <= 10; x += 1) {
        labels.push(x);
        try {
            const compiled = math.compile(cleanFunc);
            let y = compiled.evaluate({ x: x });
            dataValues.push(isFinite(y) ? y : 0);
        } catch(e) {
            dataValues.push(0);
        }
    }

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Function Graph: ' + cleanFunc,
                data: dataValues,
                borderColor: '#00ff9c',
                backgroundColor: 'rgba(0, 255, 156, 0.1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#fff' }, grid: { color: '#333' } },
                y: { ticks: { color: '#fff' }, grid: { color: '#333' } }
            }
        }
    });
}

// --- 6. HELPERS & SYSTEM CONTROLS ---
function handleMemory(dir) {
    try {
        memory += (math.evaluate(preprocess(exp || resDiv.innerText)) * dir);
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

function del() { 
    let idx = exp.length - cursorPos;
    if(idx > 0) {
        exp = exp.slice(0, idx - 1) + exp.slice(idx);
    }
    updateDisplay(); 
}

function clearAll() { exp = ""; cursorPos = 0; resDiv.innerText = "0"; updateDisplay(); }
function toggleShift() { isShift = !isShift; if (isShift) isAlpha = false; updateIndicators(); }
function toggleAlpha() { isAlpha = !isAlpha; if (isAlpha) isShift = false; updateIndicators(); }
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

powerOn();
