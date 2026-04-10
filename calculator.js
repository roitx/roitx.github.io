/* ROITX PRO ENGINE V22 - THE FINAL FRONTIER
   Everything included: Implicit Multi, x√, Mode, Glow, History, Ans
*/

let exp = ""; 
let cursorPos = 0; 
let isDeg = true;
let isShift = false;
let isAlpha = false;
let currentMode = "COMP";
let lastAnswer = "0"; // For 'Ans' button
let history = JSON.parse(localStorage.getItem("calcHistory")) || [];

const exprDiv = document.getElementById("expression");
const resDiv = document.getElementById("result");
const shiftInd = document.getElementById("shiftIndicator");
const alphaInd = document.getElementById("alphaIndicator");

// 1. RING LIGHT GLOW
function triggerGlow() {
    const ring = document.getElementById("ring");
    if(!ring) return;
    ring.style.boxShadow = "0 0 25px var(--accent), inset 0 0 15px var(--accent)";
    ring.style.borderColor = "var(--accent)";
    setTimeout(() => { ring.style.boxShadow = ""; ring.style.borderColor = "#000"; }, 300);
}

// 2. INPUT HANDLER
function btnPress(key) {
    if (isShift) { handleShift(key); return; }
    if (isAlpha) { handleAlpha(key); return; }

    const map = {
        'SIN': 'sin(', 'COS': 'cos(', 'TAN': 'tan(', 'LOG': 'log(', 'LN': 'ln(',
        'SQRT': '√(', 'ABS': 'abs(', 'X2': '²', 'X3': '³', 'POW': '^',
        'PI': 'π', 'FRAC': '⌟', 'ANS': 'Ans', 'MOD': '%', 'EXP': 'e', 'M+': 'M+'
    };

    let val = map[key] || key;
    
    // Check if operator is pressed right after '=' to continue
    if (exp === "" && ["+", "*", "/", "^", "²", "³"].includes(val)) {
        exp = "Ans";
    }

    insertAtCursor(val);
    if (val.includes('(')) { insertAtCursor(")"); cursorPos = 1; }
    updateDisplay();
}

function handleShift(key) {
    const sMap = {
        'SIN': 'sin⁻¹(', 'COS': 'cos⁻¹(', 'TAN': 'tan⁻¹(', 'SQRT': '∛(',
        'LOG': '10^(', 'LN': 'e^(', 'X2': '!', 'X3': 'pow(', 'POW': 'x√',
        'PI': 'e', 'NCR': 'nPr', 'MOD': 'mod'
    };
    let val = sMap[key] || key;
    insertAtCursor(val);
    if (val.includes('(')) { insertAtCursor(")"); cursorPos = 1; }
    isShift = false;
    updateIndicators();
    updateDisplay();
}

function handleAlpha(key) {
    const aMap = {'7':'A', '8':'B', '9':'C', '4':'D', '5':'E', '6':'F'};
    if(aMap[key]) insertAtCursor(aMap[key]);
    isAlpha = false;
    updateIndicators();
    updateDisplay();
}

function insertAtCursor(val) {
    let index = exp.length - cursorPos;
    exp = exp.slice(0, index) + val + exp.slice(index);
}

// 3. VISUAL DISPLAY
function updateDisplay() {
    let view = exp;
    let pos = view.length - cursorPos;
    exprDiv.innerText = view.slice(0, pos) + "|" + view.slice(pos) || "|";
    exprDiv.scrollLeft = exprDiv.scrollWidth;
}

// 4. CALCULATION ENGINE (THE BRAIN)
function factorial(n) { 
    if (n < 0) return NaN;
    return (n < 2) ? 1 : n * factorial(n - 1); 
}

function calculate() {
    try {
        let runExp = exp;

        // Replace Ans with value
        runExp = runExp.replace(/Ans/g, `(${lastAnswer})`);

        // Implicit Multiplication (e.g., 2π -> 2*π, 2(3) -> 2*(3))
        runExp = runExp.replace(/(\d)(\()/g, "$1*($2)");
        runExp = runExp.replace(/(\))(\d)/g, "$1*$2");
        runExp = runExp.replace(/(\d)(Math|π|e|sin|cos|tan|log|ln|√)/g, "$1*$2");

        // Basic Visual to Math
        runExp = runExp.replace(/π/g, "Math.PI").replace(/e/g, "Math.E");
        runExp = runExp.replace(/sin\(/g, "Math.sin(").replace(/sin⁻¹\(/g, "Math.asin(");
        runExp = runExp.replace(/cos\(/g, "Math.cos(").replace(/cos⁻¹\(/g, "Math.acos(");
        runExp = runExp.replace(/tan\(/g, "Math.tan(").replace(/tan⁻¹\(/g, "Math.atan(");
        runExp = runExp.replace(/log\(/g, "Math.log10(").replace(/ln\(/g, "Math.log(");
        runExp = runExp.replace(/√\(/g, "Math.sqrt(").replace(/∛\(/g, "Math.cbrt(");
        runExp = runExp.replace(/abs\(/g, "Math.abs(");
        
        // Advanced Powers
        runExp = runExp.replace(/(\d+(\.\d+)?)²/g, "Math.pow($1,2)");
        runExp = runExp.replace(/(\d+(\.\d+)?)³/g, "Math.pow($1,3)");
        runExp = runExp.replace(/\^/g, "**");
        runExp = runExp.replace(/(\d+(\.\d+)?)x√(\d+(\.\d+)?)/g, "Math.pow($3, 1/$1)");

        // Percentage, Mod, Factorial
        runExp = runExp.replace(/(\d+)!/g, "factorial($1)");
        runExp = runExp.replace(/(\d+)%/g, "($1/100)");
        runExp = runExp.replace(/mod/g, "%");

        // Operators & Fractions
        runExp = runExp.replace(/×/g, "*").replace(/÷/g, "/").replace(/⌟/g, "/");

        // Trig Degrees
        if (isDeg) {
            runExp = runExp.replace(/Math\.(sin|cos|tan)\(([^)]+)\)/g, "Math.$1(($2)*Math.PI/180)");
            runExp = runExp.replace(/Math\.(asin|acos|atan)\(([^)]+)\)/g, "(180/Math.PI*Math.$1($2))");
        }

        let result = eval(runExp);
        if (isNaN(result) || !isFinite(result)) throw "Error";

        let final = Number.isInteger(result) ? result : parseFloat(result.toFixed(10));
        
        resDiv.innerText = final;
        saveHistory(exp + "=" + final);
        lastAnswer = final.toString();
        exp = ""; // Reset for next fresh entry or continuation
        cursorPos = 0;
        updateDisplay();
    } catch (e) { 
        resDiv.innerText = "Math ERROR"; 
    }
}

// 5. SYSTEM CONTROLS
function toggleMode() {
    triggerGlow();
    const modes = ["COMP", "SD", "REG"];
    currentMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
    resDiv.innerText = currentMode;
    setTimeout(() => { if(resDiv.innerText === currentMode) resDiv.innerText = "0"; }, 800);
}

function del() { 
    let index = exp.length - cursorPos;
    if(index > 0) exp = exp.slice(0, index - 1) + exp.slice(index);
    updateDisplay(); 
}

function clearAll() { exp = ""; cursorPos = 0; resDiv.innerText = "0"; updateDisplay(); }
function toggleShift() { isShift = !isShift; isAlpha = false; updateIndicators(); }
function toggleAlpha() { isAlpha = !isAlpha; isShift = false; updateIndicators(); }
function updateIndicators() { 
    shiftInd.classList.toggle("active", isShift); 
    alphaInd.classList.toggle("active", isAlpha); 
}
function toggleDegRad() { isDeg = !isDeg; document.getElementById("degBtn").innerText = isDeg ? "DEG" : "RAD"; }

function moveCursor(dir) { 
    triggerGlow();
    if (dir === 1 && cursorPos > 0) cursorPos--; 
    else if (dir === -1 && cursorPos < exp.length) cursorPos++; 
    updateDisplay(); 
}

function navigateHistory() {
    triggerGlow();
    if(history.length > 0) { 
        exp = history[history.length-1].split('=')[0]; 
        cursorPos = 0; 
        updateDisplay(); 
    }
}

function openSide() { document.getElementById("sideMenu").classList.add("show"); document.getElementById("overlay").classList.add("show"); }
function closeSide() { document.getElementById("sideMenu").classList.remove("show"); document.getElementById("overlay").classList.remove("show"); }
function saveHistory(t) { history.push(t); if(history.length > 20) history.shift(); localStorage.setItem("calcHistory", JSON.stringify(history)); }

updateDisplay();
