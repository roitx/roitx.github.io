// ==========================================
// 1. GLOBAL VARIABLES & CONFIGURATION
// ==========================================
let isMathMode = false;
let currentMathQuestion = null;
let mathDrones = [];
let selectedSubject = "math";
let selectedMedium = "english";
let monsterSpawnCount = 0; // Kitni baar monster aa chuka hai track karne ke liye
let monsterSpawnedAt1000 = false;

window.selectedSubject = "math";
window.selectedMedium = "english";

// Dynamic storage for all subjects API questions
window.dynamicQuestionCache = window.dynamicQuestionCache || {
    science: [],
    math: [],
    reasoning: [],
    currentAffairs: []
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

function resize() { 
    if (!canvas) return;
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
    if (player) {
        let screenHeight = canvas.height || window.innerHeight || 600;
        // -220 ya -240 karne se jet aur upar aa jayega
        player.y = screenHeight - 220; 
        
        if (player.x > canvas.width - player.w) player.x = canvas.width - player.w;
    }
}



window.addEventListener("resize", resize);

const LEVEL_STEP = 1750; // pehle 350 tha -> ab 5x (har 1750 score par level up)
let game = false, paused = false, score = 0, coins = 0, lives = 12, level = 1;
let bullets = [], missiles = [], enemies = [], asteroids = [], particles = [], stars = [], enemyBullets = [], powerups = [], floatingTexts = [], coinDrops = [], shockwaves = [], trails = [];
let controlMode = "buttons", screenShake = 0, combo = 1, comboTimer = 0;
let timeFreeze = false, monsterActive = false, monster = null;
let scenarioEvent = null, scenarioTimer = 0, gridOffset = 0;
let currentUser = null;

// ==========================================
// 2. DOM ELEMENTS & TRANSLATION LOGIC
// ==========================================
const scoreEl = document.getElementById("score"), coinsEl = document.getElementById("coins"), livesEl = document.getElementById("lives"), levelEl = document.getElementById("level"), comboEl = document.getElementById("combo");
const startScreen = document.getElementById("start-screen"), gameOverScreen = document.getElementById("game-over"), shopModal = document.getElementById("shop-modal");
const finalScore = document.getElementById("final-score"), monsterAlert = document.getElementById("monster-alert"), shopCoins = document.getElementById("shop-coins");
const toggleBtn = document.getElementById("toggleControl"), pauseBtn = document.getElementById("pauseBtn"), shopBtn = document.getElementById("shopBtn"), audioBtn = document.getElementById("audioBtn");
const ultiBtn = document.getElementById("ultimateBtn"), gravityBtn = document.getElementById("gravityBtn");
const shipCards = document.querySelectorAll(".ship-card");

const leaderboardScreen = document.getElementById("leaderboard-screen");
const openLeaderboardBtn = document.getElementById("openLeaderboardBtn");
const closeLeaderboardBtn = document.getElementById("closeLeaderboardBtn");
const leaderboardList = document.getElementById("leaderboard-list");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const mathModeCheckbox = document.getElementById("mathModeCheckbox");
const subjectOverrideContainer = document.getElementById("subjectOverrideContainer");

// ==========================================
// DEVANAGARI -> ROMAN (HINGLISH) TRANSLITERATOR
// ==========================================
const DEV_INDEP_VOWELS = {'अ':'a','आ':'a','इ':'i','ई':'i','उ':'u','ऊ':'u','ऋ':'ri','ए':'e','ऐ':'ai','ओ':'o','औ':'au','ऑ':'o','ऍ':'e'};
const DEV_MATRAS = {'ा':'a','ि':'i','ी':'i','ु':'u','ू':'u','ृ':'ri','े':'e','ै':'ai','ो':'o','ौ':'au','ॉ':'o','ॅ':'e'};
const DEV_CONSONANTS = {
    'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'n','च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'n',
    'ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n',
    'प':'p','फ':'f','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h',
    'क़':'q','ख़':'kh','ग़':'g','ज़':'z','ड़':'r','ढ़':'rh','फ़':'f','य़':'y','ळ':'l'
};
const DEV_DIGITS = {'०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9'};

function devanagariWordToRoman(word) {
    // nukta wale precomposed forms ko normalize karo (क + ़ = क़)
    word = word.normalize("NFC").replace(/\u093C/g, "");
    const units = [];   // { c: consonant, v: vowel, schwa: inherent 'a' (deletable) }
    const chars = Array.from(word);
    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        if (DEV_CONSONANTS[ch] !== undefined) {
            const next = chars[i + 1];
            if (next === '्') { units.push({ c: DEV_CONSONANTS[ch], v: '', schwa: false }); i++; }
            else if (next && DEV_MATRAS[next] !== undefined) { units.push({ c: DEV_CONSONANTS[ch], v: DEV_MATRAS[next], schwa: false }); i++; }
            else units.push({ c: DEV_CONSONANTS[ch], v: 'a', schwa: true });
        } else if (DEV_INDEP_VOWELS[ch] !== undefined) {
            units.push({ c: '', v: DEV_INDEP_VOWELS[ch], schwa: false });
        } else if (ch === 'ं' || ch === 'ँ') {
            if (units.length) units[units.length - 1].tail = (units[units.length - 1].tail || '') + 'n';
        } else if (ch === 'ः') {
            if (units.length) units[units.length - 1].tail = (units[units.length - 1].tail || '') + 'h';
        } else if (DEV_DIGITS[ch] !== undefined) {
            units.push({ c: DEV_DIGITS[ch], v: '', schwa: false });
        } else if (ch === '।' || ch === '॥') {
            units.push({ c: '.', v: '', schwa: false });
        } else {
            units.push({ c: ch, v: '', schwa: false });
        }
    }
    // Schwa deletion: word ke end me 'a' hatao, beech me bhi (kamal, rajdhani jaisa)
    const n = units.length;
    if (n > 1 && units[n - 1].schwa) { units[n - 1].v = ''; units[n - 1].schwa = false; }
    for (let i = 1; i < n - 1; i++) {
        const u = units[i], prev = units[i - 1], next = units[i + 1];
        if (u.schwa && prev.v !== '' && next.v !== '') { u.v = ''; u.schwa = false; }
    }
    return units.map(u => u.c + u.v + (u.tail || '')).join('');
}

function devanagariToRoman(text) {
    // sirf Devanagari shabdon ko badlo, baaki (English words, numbers, symbols) jaise ke taise
    return text.replace(/[\u0900-\u097F]+/g, w => devanagariWordToRoman(w));
}

// Google Translate API Helper Function
async function translateText(text, targetLang) {
    if (targetLang === "english" || !text) return text;
    try {
        // english -> hindi; Hinglish ke liye ye Hindi Roman letters me convert hoga
        let tlCode = "hi";
        let url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tlCode}&dt=t&q=${encodeURIComponent(text)}`;
        let res = await fetch(url);
        let data = await res.json();
        if (data && data[0]) {
            let translated = data[0].map(item => item[0]).join('');
            return targetLang === "hinglish" ? devanagariToRoman(translated) : translated;
        }
    } catch (e) {
        console.error("Translation error:", e);
    }
    return text;
}

// Canvas Text Wrapping Helper Function
function wrapText(context, text, x, y, maxWidth, lineHeight) {
    let words = text.split(' ');
    let line = '';
    let lines = [];

    for(let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = context.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    for(let k = 0; k < lines.length; k++) {
        context.fillText(lines[k].trim(), x, y + (k * lineHeight));
    }
    return lines.length;
}

// Launch Button Validator
function updateLaunchButtonState() {
    const mathCheckbox = document.getElementById("mathModeCheckbox");
    const startButton = document.getElementById("startBtn");
    
    if (!mathCheckbox || !startButton) return;

    if (mathCheckbox.checked) {
        if (selectedSubject && selectedMedium) {
            startButton.disabled = false;
            startButton.style.opacity = "1";
            startButton.style.pointerEvents = "auto";
        } else {
            startButton.disabled = true;
            startButton.style.opacity = "0.4";
            startButton.style.pointerEvents = "none";
        }
    } else {
        startButton.disabled = false;
        startButton.style.opacity = "1";
        startButton.style.pointerEvents = "auto";
    }
}

if (mathModeCheckbox && subjectOverrideContainer) {
    mathModeCheckbox.addEventListener("change", () => {
        if (mathModeCheckbox.checked) {
            subjectOverrideContainer.classList.add("show-override");
        } else {
            subjectOverrideContainer.classList.remove("show-override");
        }
        updateLaunchButtonState();
    });
}

const subjectCards = document.querySelectorAll(".subject-card[data-subject]");
subjectCards.forEach(card => {
    card.addEventListener("click", () => {
        subjectCards.forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        selectedSubject = card.dataset.subject;
        window.selectedSubject = selectedSubject;
        updateLaunchButtonState();
    });
});

const mediumCards = document.querySelectorAll(".subject-card[data-medium]");
mediumCards.forEach(card => {
    card.addEventListener("click", () => {
        mediumCards.forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        selectedMedium = card.dataset.medium;
        window.selectedMedium = selectedMedium;
        updateLaunchButtonState();
    });
});

shipCards.forEach(card => {
    card.addEventListener("click", () => {
        shipCards.forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        selectedShip = card.dataset.ship;
        
        if (game) {
            const ship = shipTypes[selectedShip];
            player.speed = ship.speed;
            addFloatingText(player.x, player.y, "SHIP CHANGED!", ship.color);
        }
        queueSave();
    });
});

// ==========================================
// 3. AUDIO SYNTHESIZER
// ==========================================
let audioEnabled = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSynthSound(type) {
    if (!audioEnabled) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'laser') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(1200, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.07);
        gain.gain.setValueAtTime(0.04, now); gain.gain.linearRampToValueAtTime(0, now + 0.07);
        osc.start(now); osc.stop(now + 0.07);
    } else if (type === 'missile') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.08, now); gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'blast') {
        osc.type = 'square'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
        gain.gain.setValueAtTime(0.18, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'gravity') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(420, now); osc.frequency.exponentialRampToValueAtTime(55, now + 0.55);
        gain.gain.setValueAtTime(0.22, now); gain.gain.linearRampToValueAtTime(0, now + 0.55);
        osc.start(now); osc.stop(now + 0.55);
    } else if (type === 'ulti') {
        // NOVA: low charge-up sweep + bright burst
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(60, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);
        osc.frequency.exponentialRampToValueAtTime(2200, now + 0.55);
        gain.gain.setValueAtTime(0.0, now); gain.gain.linearRampToValueAtTime(0.28, now + 0.25);
        gain.gain.linearRampToValueAtTime(0, now + 0.75);
        osc.start(now); osc.stop(now + 0.75);
    }
}

const escH = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

const svgIcons = {
    rocket: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; display:inline-block;"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71 1.1-1.35 1.32-1.92L14.4 12.1a12.98 12.98 0 0 0 5.1-6.1c.36-.91-.32-1.59-1.23-1.23a12.98 12.98 0 0 0-6.1 5.1l-5.48 5.58c-.57.22-1.21.61-1.92 1.32z"/><path d="m12 15 4 4"/><path d="m15 12 4 4"/></svg>`,
    calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; display:inline-block;"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
    star: `<svg width="13" height="13" viewBox="0 0 24 24" fill="#facc15" stroke="#facc15" stroke-width="1" style="vertical-align:middle; display:inline-block;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    coin: `<svg width="12" height="12" viewBox="0 0 24 24" fill="#ffd600" stroke="#b45309" stroke-width="1.5" style="vertical-align:middle; display:inline-block;"><circle cx="12" cy="12" r="9"/><path d="M12 6v12M15 9.5H10.5a1.5 1.5 0 0 0 0 3h3a1.5 1.5 0 0 1 0 3H9"/></svg>`,
    user: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
};

if (audioBtn) {
    audioBtn.onclick = () => {
        audioEnabled = !audioEnabled;
        const l = audioBtn.querySelector(".lbl"); if (l) l.textContent = audioEnabled ? "Audio" : "Muted"; audioBtn.classList.toggle("off", !audioEnabled);
    };
}

const shipTypes = {
    pulse: { speed: 10, hp: 12, fireRate: 5, color: "#10b981", coreColor: "#6ee7b7" },
    titan: { speed: 6.5, hp: 22, fireRate: 10, color: "#f97316", coreColor: "#fdba74" },
    phantom: { speed: 8.5, hp: 14, fireRate: 7, color: "#a855f7", coreColor: "#e9d5ff", triple: true }
};
let selectedShip = "pulse";
let fireBonus = 0;   // shop upgrade, sirf is run ke liye

for(let i = 0; i < 60; i++) {
    stars.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, s: Math.random() * 2 + 1, speed: Math.random() * 2 + 0.5, opacity: Math.random() });
}

const player = { 
    x: 0, y: 0, w: 56, h: 56, 
    speed: 8, cooldown: 0, missileCooldown: 0, shield: false, 
    ultiCooldown: 0, gravityCooldown: 0, triplePower: false,
    invuln: 0, overdrive: 0, magnet: 0 
};
const keys = {};

// ==========================================
// 4. EXTERNAL API QUESTION FETCHER & TRANSLATOR
// ==========================================
// ---- NET se questions: OpenTDB (token = repeat nahi, 5s throttle = 429 nahi) ----
const CAT_MAP = { science: 17, math: 19, reasoning: 18, currentAffairs: 9 };
let _apiToken = null, _lastApi = 0;
const apiSleep = ms => new Promise(r => setTimeout(r, ms));
async function apiThrottle() { const w = 5300 - (Date.now() - _lastApi); if (w > 0) await apiSleep(w); _lastApi = Date.now(); }
async function getApiToken(reset) {
    try {
        await apiThrottle();
        const u = reset && _apiToken ? `https://opentdb.com/api_token.php?command=reset&token=${_apiToken}` : "https://opentdb.com/api_token.php?command=request";
        const d = await (await fetch(u)).json();
        if (d && d.token) _apiToken = d.token;
        console.log("[Questions] 🔑 OpenTDB token " + (reset ? "reset" : "mila") + " (ab repeat nahi aayenge)");
    } catch (e) { console.warn("[Questions] token nahi mila, bina token ke chalega", e); }
}
const seenStore = {
    all() { try { return store.get("seenQ", []); } catch (e) { return []; } },
    has(q) { return this.all().includes(q); },
    add(q) { const a = this.all(); a.push(q); store.set("seenQ", a.slice(-400)); }
};
async function fetchApiQuestions(category = 18, amount = 10, retry = 0) {
    try {
        if (!_apiToken && retry === 0) await getApiToken(false);
        await apiThrottle();
        console.log(`[Questions] 🌐 Net se maang raha hoon (category ${category}, ${amount} questions)…`);
        const r = await fetch(`https://opentdb.com/api.php?amount=${amount}&category=${category}&type=multiple${_apiToken ? "&token=" + _apiToken : ""}`);
        if (r.status === 429 && retry < 2) { console.warn("[Questions] ⏳ Rate limit (429), 5s ruk kar dobara"); await apiSleep(5500); return fetchApiQuestions(category, amount, retry + 1); }
        const data = await r.json();
        const code = data && data.response_code;
        if (code === 3 && retry < 2) { _apiToken = null; await getApiToken(false); return fetchApiQuestions(category, amount, retry + 1); }
        if (code === 4 && retry < 2) { await getApiToken(true); return fetchApiQuestions(category, amount, retry + 1); }
        if (code === 1 && amount > 3 && retry < 2) return fetchApiQuestions(category, Math.floor(amount / 2), retry + 1);
        if (data && data.results && data.results.length) {
            const list = data.results.map(item => {
                const idx = Math.floor(Math.random() * (item.incorrect_answers.length + 1));
                const opts = [...item.incorrect_answers]; opts.splice(idx, 0, item.correct_answer);
                return { question: decodeHTML(item.question), options: opts.map(decodeHTML), correctIndex: idx };
            }).filter(q => !seenStore.has(q.question));
            console.log(`[Questions] ✅ Net se ${list.length} naye questions aaye`);
            return list;
        }
        console.error("[Questions] ❌ OpenTDB ne questions nahi diye, response_code=" + code);
    } catch (err) {
        console.error("[Questions] ❌ Net/API error:", err);
    }
    return null;
}

function decodeHTML(html) {
    let txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

// Study questions: pehle NET (OpenTDB), net na ho tabhi apna bank
const usedBank = {};
const _refilling = {};
function shuffled(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function refillSubject(subj) {
    if (_refilling[subj]) return _refilling[subj];
    const c = window.dynamicQuestionCache;
    c[subj] = c[subj] || [];
    _refilling[subj] = (async () => {
        const fresh = await fetchApiQuestions(CAT_MAP[subj] || 19, 10);
        if (fresh && fresh.length) c[subj].push(...fresh);
        _refilling[subj] = null;
        return !!(fresh && fresh.length);
    })();
    return _refilling[subj];
}

async function loadNextQuestion() {
    const subj = window.selectedSubject || selectedSubject || "math";
    const med = window.selectedMedium || selectedMedium || "english";
    const cache = (window.dynamicQuestionCache[subj] = window.dynamicQuestionCache[subj] || []);

    if (cache.length < 3) refillSubject(subj);                          // background me naye mangwao
    if (!cache.length) await Promise.race([refillSubject(subj), apiSleep(12000)]);

    if (cache.length) {
        const raw = cache.shift();                                       // use hote hi cache se hat jata hai
        seenStore.add(raw.question);
        console.log(`[Questions] 🌐 NET se load hua | subject=${subj} | medium=${med} | cache me bache=${cache.length}${med !== "english" ? " | Google Translate use hua" : ""}`);
        currentMathQuestion = {
            question: await translateText(raw.question, med),
            options: await Promise.all(raw.options.map(o => translateText(o, med))),
            correctIndex: raw.correctIndex
        };
        setupMathDrones();
        return;
    }

    // Offline fallback: apna bank
    const bank = (window.STUDY_BANK && window.STUDY_BANK[subj]) || [];
    if (!bank.length) { console.error("[Questions] ❌ Net bhi nahi chala aur bank bhi nahi hai"); return; }
    if (!usedBank[subj] || usedBank[subj].length >= bank.length) usedBank[subj] = [];
    const left = bank.map((_, i) => i).filter(i => !usedBank[subj].includes(i));
    const pick = left[Math.floor(Math.random() * left.length)];
    usedBank[subj].push(pick);
    const b = bank[pick], hi = med !== "english";
    let text = (hi && b.h) ? b.h : b.q, opts = (hi && b.oh) ? b.oh : b.o;
    if (med === "hinglish") { text = devanagariToRoman(text); opts = opts.map(devanagariToRoman); }
    const items = shuffled(opts.map((t, i) => ({ t, ok: i === b.a })));
    console.warn(`[Questions] 📦 Net nahi chala, OFFLINE BANK se load hua | subject=${subj} | #${pick + 1}/${bank.length}`);
    currentMathQuestion = { question: text, options: items.map(x => x.t), correctIndex: items.findIndex(x => x.ok) };
    setupMathDrones();
}

// ==========================================
// 5. CONTROLS, AUTH & LEADERBOARD SYSTEM
// ==========================================
window.addEventListener("keydown", e => {
    keys[e.key] = true;
    if (e.key === "e" || e.key === "E") triggerUltimate();
    if (e.key === "g" || e.key === "G" || e.key === "Shift") triggerGravity();
});
window.addEventListener("keyup", e => keys[e.key] = false);

async function checkAuthStatus() {
    if (!window.supabaseClient) return false;
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (user) {
            currentUser = user;
            await loadUserData();
            return true;
        }
    } catch (err) {
        console.error("Auth status error:", err);
    }
    currentUser = null;
    return false;
}

if (openLeaderboardBtn) {
    openLeaderboardBtn.onclick = async () => {
        if (!currentUser) {
            alert("Leaderboard dekhne ke liye pehle login karein!");
            return;
        }
        if (startScreen) startScreen.classList.remove("show");
        if (leaderboardScreen) leaderboardScreen.classList.add("show");
        await fetchLeaderboard(selectedShip);
    };
}

if (closeLeaderboardBtn) {
    closeLeaderboardBtn.onclick = () => {
        if (leaderboardScreen) leaderboardScreen.classList.remove("show");
        if (startScreen) startScreen.classList.add("show");
    };
}

async function fetchLeaderboard(shipMode) {
    if (!leaderboardList) return;
    if (!window.supabaseClient) {
        leaderboardList.innerHTML = "<div style='color:#ef4444; text-align:center;'>Supabase connection issue.</div>";
        return;
    }

    try {
        leaderboardList.innerHTML = `<div style='color:#38bdf8; text-align:center;'>Fetching ${shipMode.toUpperCase()} mode rankings...</div>`;
        
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        const isoOneMonthAgo = oneMonthAgo.toISOString();

        const { data: gameData, error: gameErr } = await window.supabaseClient
            .from('game_profiles')
            .select('id, score, coins, selected_ship, name, avatar_url, updated_at')
            .eq('selected_ship', shipMode)
            .gt('score', 0)
            .gte('updated_at', isoOneMonthAgo)
            .order('score', { ascending: false })
            .limit(10);

        if (gameErr) throw gameErr;

        if (gameData && gameData.length > 0) {
            const userIds = gameData.map(g => g.id);
            const { data: profilesData } = await window.supabaseClient
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', userIds);

            const profileMap = {};
            if (profilesData) {
                profilesData.forEach(p => { profileMap[p.id] = p; });
            }

            let html = `
                <div style="text-align:center; font-size:12px; color:#38bdf8; font-weight:bold; margin-bottom:12px; display:flex; align-items:center; justify-content:center; gap:6px;">
                    ${svgIcons.rocket} Mode: <span style="color:#facc15; text-transform:uppercase;">${shipMode}</span> | ${svgIcons.calendar} Last 30 Days Active
                </div>
                <div style="display:flex; flex-direction:column; gap:8px;">
            `;

            gameData.forEach((row, index) => {
                const freshProfile = profileMap[row.id];
                let pilotName = freshProfile?.full_name || row.name || "Cyber Pilot";
                let pilotAvatar = freshProfile?.avatar_url || row.avatar_url;

                let avatarHtml = pilotAvatar 
                    ? `<img src="${escH(pilotAvatar)}" style="width:34px; height:34px; border-radius:50%; object-fit:cover; border: 1px solid #38bdf8;">` 
                    : `<div style="width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg, #0284c7, #0369a1); display:flex; align-items:center; justify-content:center;">${svgIcons.user}</div>`;
                
                html += `
                    <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.05); padding:10px 12px; border-radius:8px; border: 1px solid rgba(56, 189, 248, 0.2);">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-weight:bold; color:#38bdf8; width:22px; font-size:14px;">#${index + 1}</span>
                            ${avatarHtml}
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-size:13px; color:#fff; font-weight:600; max-width:110px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escH(pilotName)}</span>
                                <span style="font-size:10px; color:#38bdf8; display:flex; align-items:center; gap:3px;">${svgIcons.rocket} Mode: ${escH(row.selected_ship)}</span>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <span style="color:#facc15; font-weight:bold; font-size:13px; display:flex; align-items:center; justify-content:flex-end; gap:3px;">${svgIcons.star} ${row.score || 0} pts</span>
                            <span style="font-size:11px; color:#ffd600; display:flex; align-items:center; justify-content:flex-end; gap:3px; margin-top:2px;">${svgIcons.coin} ${row.coins || 0}</span>
                        </div>
                    </div>
                `;
            });
            html += "</div>";
            leaderboardList.innerHTML = html;
        } else {
            leaderboardList.innerHTML = `<div style='color:#94a3b8; text-align:center; padding: 20px 0;'>No active scores recorded in ${shipMode.toUpperCase()} mode over the past 30 days!</div>`;
        }
    } catch (err) {
        console.error("Error fetching leaderboard:", err);
        leaderboardList.innerHTML = "<div style='color:#ef4444; text-align:center;'>Failed to sync leaderboard data.</div>";
    }
}

// Mobile Controls
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

if (leftBtn && rightBtn) {
    leftBtn.ontouchstart = (e) => { if (e.cancelable) e.preventDefault(); keys["ArrowLeft"] = true; };
    leftBtn.ontouchend = (e) => { if (e.cancelable) e.preventDefault(); keys["ArrowLeft"] = false; };
    rightBtn.ontouchstart = (e) => { if (e.cancelable) e.preventDefault(); keys["ArrowRight"] = true; };
    rightBtn.ontouchend = (e) => { if (e.cancelable) e.preventDefault(); keys["ArrowRight"] = false; };
}

if (ultiBtn) ultiBtn.onclick = triggerUltimate;
if (gravityBtn) gravityBtn.onclick = () => triggerGravity();

if (canvas) {
    canvas.addEventListener("touchmove", (e) => {
        if (e.cancelable) e.preventDefault();
        if (!game || paused) return;
        let touch = e.touches[0];
        player.x = touch.clientX - player.w / 2;
        if (player.x < 0) player.x = 0;
        if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
    }, { passive: false });
}

if (toggleBtn) {
    toggleBtn.onclick = async () => {
        const next = controlMode === "buttons" ? "tilt" : "buttons";
        if (next === "tilt" && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
            try { if (await DeviceOrientationEvent.requestPermission() !== "granted") return; } catch (e) { return; }
        }
        controlMode = next;
        const l = toggleBtn.querySelector(".lbl"); if (l) l.textContent = controlMode === "buttons" ? "Buttons" : "Tilt";
        const mc = document.getElementById("manual-controls");
        if (mc) mc.classList.toggle("tilt-mode", controlMode === "tilt");
    };
}

window.addEventListener("deviceorientation", (e) => {
    if (controlMode === "tilt" && game && !paused) {
        let tilt = e.gamma; 
        if (tilt > 5 && player.x + player.w < canvas.width) player.x += player.speed;
        if (tilt < -5 && player.x > 0) player.x -= player.speed;
    }
});

// Shop & Pause Modals
if (shopBtn) {
    shopBtn.onclick = () => {
        if (!game) return;
        paused = true;
        if(shopCoins) shopCoins.textContent = coins;
        if(shopModal) shopModal.classList.add("show");
    };
}

const closeShopBtn = document.getElementById("closeShopBtn");
if (closeShopBtn) {
    closeShopBtn.onclick = () => {
        if(shopModal) shopModal.classList.remove("show");
        paused = false;
        update();
    };
}

const buyFireRate = document.getElementById("buyFireRate");
if (buyFireRate) {
    buyFireRate.onclick = () => {
        if (coins >= 50 && fireBonus < 6) {
            coins -= 50;
            fireBonus += 2;
            if(shopCoins) shopCoins.textContent = coins;
            updateHUD();
            queueSave();
        }
    };
}

const buyShield = document.getElementById("buyShield");
if (buyShield) {
    buyShield.onclick = () => {
        if (coins >= 80 && !player.shield) {
            coins -= 80;
            player.shield = true;
            if(shopCoins) shopCoins.textContent = coins;
            updateHUD();
            queueSave();
        }
    };
}

const buyHealth = document.getElementById("buyHealth");
if (buyHealth) {
    buyHealth.onclick = () => {
        if (coins >= 60) {
            coins -= 60;
            lives += 6;
            if(shopCoins) shopCoins.textContent = coins;
            updateHUD();
            queueSave();
        }
    };
}

const pauseModal = document.getElementById("pause-modal");
const resumeBtn = document.getElementById("resumeBtn");
const restartBtnPause = document.getElementById("restartBtnPause");
const homeBtn = document.getElementById("homeBtn");

if (pauseBtn) {
    pauseBtn.onclick = () => {
        paused = true;
        if (pauseModal) pauseModal.classList.add("show");
    };
}

if (resumeBtn) {
    resumeBtn.onclick = () => {
        paused = false;
        if (pauseModal) pauseModal.classList.remove("show");
        update();
    };
}

if (restartBtnPause) {
    restartBtnPause.onclick = () => {
        if (pauseModal) pauseModal.classList.remove("show");
        startGame();
    };
}

if (homeBtn) {
    homeBtn.onclick = () => {
        paused = false;
        game = false;
        stopMusic();
        if (pauseModal) pauseModal.classList.remove("show");
        if (startScreen) startScreen.classList.add("show");
    };
}

// ==========================================
// 6. GAME MECHANICS & SPAWN LOGIC
// ==========================================
function updateHUD() {
    const setV = (el, val) => { if (!el) return; const v = el.querySelector(".v"); (v || el).textContent = val; };
    setV(scoreEl, score); setV(coinsEl, coins); setV(livesEl, lives);
    setV(levelEl, level); setV(comboEl, "x" + combo);

    // Ring progress for side orbs
    const ring = (el, pct) => { if (el) el.style.setProperty("--p", Math.max(0, Math.min(100, pct))); };
    const maxHp = (typeof shipTypes !== "undefined" && shipTypes[selectedShip]) ? shipTypes[selectedShip].hp : 12;
    const hpPct = (lives / maxHp) * 100;
    ring(livesEl, hpPct);
    if (livesEl) livesEl.dataset.low = hpPct <= 35 ? "1" : "0";
    ring(levelEl, ((score % LEVEL_STEP) / LEVEL_STEP) * 100);
    ring(comboEl, combo * 20);
}


// ==========================================
// LEVEL UP CELEBRATION (banner + reward + sound + orb pop)
// ==========================================
const LEVELUP_REWARD = { coins: 15, hp: 1 };   // <- yahan se reward badal sakte ho

function playLevelUpJingle() {
    if (!audioEnabled) return;
    try {
        if (audioCtx.state === "suspended") audioCtx.resume();
        const now = audioCtx.currentTime;
        [659.25, 880].forEach((f, i) => {           // do halke notes, low volume
            const o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.type = "sine"; o.frequency.setValueAtTime(f, now + i * 0.12);
            g.gain.setValueAtTime(0.0001, now + i * 0.12);
            g.gain.exponentialRampToValueAtTime(0.04, now + i * 0.12 + 0.04);
            g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.35);
            o.connect(g); g.connect(audioCtx.destination);
            o.start(now + i * 0.12); o.stop(now + i * 0.12 + 0.4);
        });
    } catch (e) {}
}

function showLevelUp(lv) {
    // Reward
    coins += LEVELUP_REWARD.coins;
    const maxHp = shipTypes[selectedShip] ? shipTypes[selectedShip].hp : 12;
    let gotHp = 0;
    if (lives < maxHp) { const before = lives; lives = Math.min(maxHp, lives + LEVELUP_REWARD.hp); gotHp = lives - before; }
    updateHUD();

    // Soft banner (no shake / flash / vibration)
    let b = document.getElementById("levelup-banner");
    if (!b) { b = document.createElement("div"); b.id = "levelup-banner"; document.body.appendChild(b); }
    b.innerHTML =
        '<span class="lu-lv">LEVEL ' + lv + ' UP!</span>';
    b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
    clearTimeout(showLevelUp._t);
    showLevelUp._t = setTimeout(() => b.classList.remove("show"), 2600);

    // Gentle orb pulse + quiet sound
    if (levelEl) { levelEl.classList.remove("pop"); void levelEl.offsetWidth; levelEl.classList.add("pop"); }
    playLevelUpJingle();
}

function addFloatingText(x, y, text, color = "#facc15") {
    floatingTexts.push({ x, y, text, color, alpha: 1, vy: -1.6 });
}

function addShockwave(x, y, color = "#06b6d4", maxR = 90) {
    shockwaves.push({ x, y, r: 5, maxR, color, alpha: 1 });
}

// ---------- GRAVITY WELL (NEW ABILITY) ----------
const GRAVITY_COOLDOWN = 620;   // frames (~10s)
const GRAVITY_DURATION = 200;   // frames (~3.3s)
let gravityWell = null;

function showGameToast(html, ms = 4500) {
    const t = document.createElement("div");
    t.className = "game-toast";
    t.innerHTML = html;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, ms);
}

function triggerGravity() {
    if (!game || paused || player.gravityCooldown > 0 || gravityWell) return;
    const R = Math.min(240, canvas.width * 0.55);
    const cx = Math.max(R * 0.4, Math.min(canvas.width - R * 0.4, player.x + player.w / 2));
    const cy = Math.max(130, player.y - 250);
    gravityWell = { x: cx, y: cy, R, life: GRAVITY_DURATION, max: GRAVITY_DURATION, rot: 0, eaten: 0 };
    player.gravityCooldown = GRAVITY_COOLDOWN;

    playSynthSound('gravity');
    addShockwave(cx, cy, "#a855f7", R * 0.6);
    addFloatingText(cx - 55, cy - 30, "GRAVITY WELL!", "#c084fc");
    if (navigator.vibrate) navigator.vibrate([20, 30, 20]);

    store.set("gravitySeen", true);
    if (gravityBtn) gravityBtn.classList.remove("is-new");
}

// Ek enemy kheench liya gaya: score + combo + kabhi kabhi coin
function absorbEnemy(e, w) {
    comboTimer = 130; combo = Math.min(5, combo + 1);
    const pts = 12 * combo;
    score += pts; w.eaten++;
    addFloatingText(e.x, e.y, "+" + pts, "#c084fc");
    if (Math.random() < 0.5) coinDrops.push({ x: w.x - 14, y: w.y, w: 28, h: 28, size: 28 });
    updateHUD();
}

function updateGravityWell() {
    if (!gravityWell) return;
    const w = gravityWell;
    w.life--; w.rot += 0.12;
    const open = Math.min(1, (w.max - w.life) / 20);
    const R = w.R * open;

    // objects ko center ki taraf kheencho; return distance
    const tug = (o, cx, cy, mult) => {
        const dx = w.x - cx, dy = w.y - cy, d = Math.hypot(dx, dy) || 1;
        if (d > R) return d;
        const f = (1.5 + 5 * (1 - d / R)) * mult;
        o.x += dx / d * f; o.y += dy / d * f;
        return d;
    };

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (tug(e, e.x + e.w / 2, e.y + e.h / 2, 1) < 28) { absorbEnemy(e, w); enemies.splice(i, 1); }
    }
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        if (tug(a, a.x + a.w / 2, a.y + a.h / 2, 1) < 30) { explode(a.x + a.w / 2, a.y + a.h / 2, "#a855f7", 6); asteroids.splice(i, 1); }
    }
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        if (tug(b, b.x + (b.w || 6) / 2, b.y + (b.h || 14) / 2, 1.4) < 24) { enemyBullets.splice(i, 1); score += 1; }
    }

    // spiral particles andar ki taraf
    if (particles.length < 160) {
        for (let i = 0; i < 2; i++) {
            const ang = Math.random() * Math.PI * 2, r = R * (0.6 + Math.random() * 0.4);
            particles.push({
                x: w.x + Math.cos(ang) * r, y: w.y + Math.sin(ang) * r,
                vx: -Math.cos(ang) * 3 - Math.sin(ang) * 1.6, vy: -Math.sin(ang) * 3 + Math.cos(ang) * 1.6,
                l: r / 3.2, c: Math.random() < 0.5 ? "#c084fc" : "#22d3ee", s: 2 + Math.random() * 2
            });
        }
    }

    // collapse: aakhir me chhota dhamaka
    if (w.life <= 0) {
        const cr = w.R * 0.8;
        addShockwave(w.x, w.y, "#a855f7", cr * 1.3);
        explode(w.x, w.y, "#a855f7", 40);
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (Math.hypot(e.x + e.w / 2 - w.x, e.y + e.h / 2 - w.y) < cr) { absorbEnemy(e, w); enemies.splice(i, 1); }
        }
        enemyBullets = enemyBullets.filter(b => Math.hypot(b.x - w.x, b.y - w.y) > cr);
        asteroids = asteroids.filter(a => Math.hypot(a.x + a.w / 2 - w.x, a.y + a.h / 2 - w.y) > cr);
        const bonus = w.eaten * 5;
        score += bonus;
        addFloatingText(w.x - 45, w.y - 10, w.eaten ? "SINGULARITY! +" + bonus : "SINGULARITY!", "#facc15");
        screenShake = Math.max(screenShake, 14);
        updateHUD();
        gravityWell = null;
    }
}

function drawGravityWell() {
    if (!gravityWell || !ctx) return;
    const w = gravityWell;
    const k = Math.min((w.max - w.life) / 20, w.life / 20, 1);
    ctx.save();
    ctx.translate(w.x, w.y);

    // pull range (dashed ring)
    ctx.globalAlpha = 0.2 * k; ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 10]); ctx.lineDashOffset = -w.rot * 20;
    ctx.beginPath(); ctx.arc(0, 0, w.R * k, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // purple glow
    const g = ctx.createRadialGradient(0, 0, 8 * k, 0, 0, 80 * k + 1);
    g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.45, "rgba(88,28,135,0.75)"); g.addColorStop(1, "rgba(88,28,135,0)");
    ctx.globalAlpha = 1; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 80 * k, 0, Math.PI * 2); ctx.fill();

    // spinning accretion arcs
    ctx.lineWidth = 3; ctx.strokeStyle = "#22d3ee"; ctx.shadowColor = "#c084fc"; ctx.shadowBlur = 16;
    for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = (0.9 - i * 0.25) * k;
        ctx.beginPath();
        ctx.ellipse(0, 0, (38 + i * 14) * k, (14 + i * 5) * k, w.rot * 0.6 + i * 1.1, 0, Math.PI * 1.4);
        ctx.stroke();
    }

    // event horizon
    ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(0, 0, 20 * k, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function updateGravityButton() {
    if (!gravityBtn) return;
    const pct = player.gravityCooldown <= 0 ? 100 : Math.round((1 - player.gravityCooldown / GRAVITY_COOLDOWN) * 100);
    gravityBtn.style.setProperty("--ready", pct);
    gravityBtn.classList.toggle("ready", player.gravityCooldown <= 0);
    gravityBtn.classList.toggle("active-hole", !!gravityWell);
    gravityBtn.style.opacity = player.gravityCooldown <= 0 || gravityWell ? "1" : "0.6";
}

// ---------- NOVA (replaces old ULTI) ----------
const MAGNET_DURATION = 480;   // frames (~8s)
const MAGNET_RANGE = 300;
const NOVA_COOLDOWN = 480;      // frames (~8s)
const NOVA_INVULN   = 120;      // 2s safe
const NOVA_OVERDRIVE = 360;     // 6s double fire + triple shot
let novaFlash = 0;

function magnetPull(o, w, h, strength) {
    if (player.magnet <= 0) return;
    const dx = (player.x + player.w / 2) - (o.x + w / 2);
    const dy = (player.y + player.h / 2) - (o.y + h / 2);
    const d = Math.hypot(dx, dy);
    if (d > MAGNET_RANGE || d < 1) return;
    const pull = strength * (1 + (MAGNET_RANGE - d) / MAGNET_RANGE * 2.2);
    o.x += dx / d * pull; o.y += dy / d * pull;
}

function triggerUltimate() {
    if (player.ultiCooldown > 0 || !game || paused) return;
    playSynthSound('ulti');
    player.ultiCooldown = NOVA_COOLDOWN;
    player.invuln = NOVA_INVULN;
    player.overdrive = NOVA_OVERDRIVE;
    screenShake = 34;
    novaFlash = 1;

    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    const col = shipTypes[selectedShip].color;
    addShockwave(px, py, "#ffffff", 300);
    addShockwave(px, py, col, 260);
    addShockwave(px, py, "#facc15", 220);
    addFloatingText(player.x - 20, player.y - 20, "⚡ SUPERNOVA!", "#facc15");

    // 1) Saare enemy bullets saaf
    enemyBullets = [];

    // 2) Saare enemies destroy -> score + drops
    let kills = 0;
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        explode(e.x + e.w / 2, e.y + e.h / 2, "#facc15", 10);
        spawnPowerup(e.x, e.y);
        kills++;
    }
    enemies = [];
    if (kills) {
        score += kills * 10 * combo;
        comboTimer = 130; combo = Math.min(5, combo + 1);
        addFloatingText(px - 30, py - 70, "+" + (kills * 10 * combo) + " NOVA", "#facc15");
    }

    // 3) Asteroids bhi destroy (+ coin)
    asteroids.forEach(a => {
        explode(a.x + a.w / 2, a.y + a.h / 2, "#fb923c", 8);
        coinDrops.push({ x: a.x, y: a.y, w: 28, h: 28, size: 28 });
    });
    asteroids = [];
    if (window.asteroids) window.asteroids.length = 0;

    // 4) Monster ko heavy damage
    if (monster) { monster.hp -= 60; explode(monster.x + monster.w / 2, monster.y + monster.h / 2, "#facc15", 25); }

    // 5) Ship-specific bonus
    if (selectedShip === "pulse") {
        for (let i = -100; i <= 100; i += 12) {
            bullets.push({ x: px + i, y: player.y, vx: 0, vy: -18, c: "#10b981", size: 6 });
        }
        addFloatingText(player.x, player.y - 45, "BEAM MATRIX", "#10b981");
    } else if (selectedShip === "titan") {
        lives = Math.min(shipTypes.titan.hp + 10, lives + 2);
        addFloatingText(player.x, player.y - 45, "+2 HP REPAIR", "#f97316");
    } else if (selectedShip === "phantom") {
        timeFreeze = true;
        setTimeout(() => timeFreeze = false, 2500);
        addFloatingText(player.x, player.y - 45, "CHRONO FREEZE", "#a855f7");
    }
    updateHUD();
}

function shoot() {
    if (player.cooldown <= 0) {
        const ship = shipTypes[selectedShip];
        playSynthSound('laser');

        if (ship.triple || player.triplePower || player.overdrive > 0) {
            bullets.push({ x: player.x + player.w / 2, y: player.y, vx: 0, vy: -15, c: ship.color, size: 4 });
            bullets.push({ x: player.x + player.w / 2, y: player.y, vx: -3.8, vy: -14, c: ship.color, size: 4 });
            bullets.push({ x: player.x + player.w / 2, y: player.y, vx: 3.8, vy: -14, c: ship.color, size: 4 });
        } else {
            bullets.push({ x: player.x + player.w / 2, y: player.y, vx: 0, vy: -15, c: ship.color, size: 4 });
        }
        const rate = Math.max(2, ship.fireRate - fireBonus);
        player.cooldown = player.overdrive > 0 ? Math.max(2, Math.floor(rate / 2)) : rate;
    }

    if (player.missileCooldown <= 0) {
        playSynthSound('missile');
        missiles.push({ x: player.x + 8, y: player.y, vx: -2, vy: -4 });
        missiles.push({ x: player.x + player.w - 8, y: player.y, vx: 2, vy: -4 });
        player.missileCooldown = 45;
    }
}

function triggerScenario() {
    if (scenarioEvent || monsterActive || !canvas) return;
    const events = ["asteroid", "warp"];
    scenarioEvent = events[Math.floor(Math.random() * events.length)];
    scenarioTimer = 350;

    if (scenarioEvent === "asteroid") addFloatingText(canvas.width/2 - 80, 150, "⚠️ ASTEROID BELT DETECTED!", "#ef4444");
    if (scenarioEvent === "warp") addFloatingText(canvas.width/2 - 80, 150, "⚡ HYPER WARP SPEED!", "#38bdf8");
}

function spawnEnemy() {
    if (monsterActive || timeFreeze || !canvas) return; 
    const s = 42;
    enemies.push({ 
        x: Math.random() * (canvas.width - s), 
        y: -s, w: s, h: s, 
        speed: 2.4 + level * 0.4,
        sineOffset: Math.random() * 100,
        flankDir: Math.random() > 0.5 ? 1 : -1
    });
}

function spawnAsteroid() {
    if (!canvas) return;
    const size = Math.random() * 14 + 26;
    asteroids.push({
        x: Math.random() * (canvas.width - size),
        y: -size, w: size, h: size,
        speed: Math.random() * 3 + 3,
        rot: 0, vRot: (Math.random() - 0.5) * 0.1
    });
}

function spawnPowerup(x, y) {
    if (Math.random() < 0.28) {
        const types = ["shield", "health", "triple", "magnet"];
        powerups.push({ x, y, type: types[Math.floor(Math.random() * types.length)], size: 24 });
    }
    if (Math.random() < 0.75) {
        coinDrops.push({ x: x, y: y, w: 28, h: 28, size: 28 });

    }
}

function setupMathDrones() {
    mathDrones = [];
    if (!currentMathQuestion || !canvas) return;

    const droneWidth = Math.min(100, Math.floor((canvas.width - 30) / 4));
    const spacing = Math.max(4, (canvas.width - (4 * droneWidth)) / 5);

    currentMathQuestion.options.forEach((optText, index) => {
        mathDrones.push({
            index: index,
            text: optText,
            x: spacing + index * (droneWidth + spacing),
            y: 190,
            w: droneWidth,
            h: 36,
            baseY: 190,
            floatOffset: index * 0.8,
            dir: 1,
            hits: 0,
            solved: false
        });
    });
}

async function spawnMonster() {
    if (!canvas) return;
    monsterActive = true;
    
    if(monsterAlert) {
        monsterAlert.style.display = "block";
        setTimeout(() => { monsterAlert.style.display = "none"; }, 3000);
    }
    
    const maxHp = 90 + (level * 45);
    monster = { x: canvas.width / 2 - 80, y: -150, w: 160, h: 100, hp: maxHp, maxHp: maxHp, speed: 3.5, dir: 1, angle: 0, phase: 1 };

    if (isMathMode) {
        await loadNextQuestion();
    } else {
        currentMathQuestion = null;
        mathDrones = [];
    }
}

function explode(x, y, color, count = 18) {
    playSynthSound('blast');
    addShockwave(x, y, color, 100);
    if (particles.length > 140) particles.splice(0, count);
    for (let i = 0; i < count; i++) {
        particles.push({ 
            x, y, 
            vx: (Math.random() - 0.5) * 12, 
            vy: (Math.random() - 0.5) * 12, 
            l: Math.random() * 28 + 12, 
            c: color,
            s: Math.random() * 5 + 1.5
        });
    }
}

function hitPlayer() {
    if (player.invuln > 0) return;
    if (player.shield) {
        player.shield = false;
        addFloatingText(player.x, player.y, "SHIELD BROKEN!", "#38bdf8");
        return;
    }
    lives--;
    screenShake = 15;
    if (navigator.vibrate) navigator.vibrate(60);
    updateHUD();
    explode(player.x + player.w/2, player.y + player.h/2, "#ef4444", 12);
    if (lives <= 0) gameOver();
}

async function gameOver() {
    game = false;
    stopMusic();
    onRunEnd();
    if (gameOverScreen) gameOverScreen.classList.add("show");
    
    if (currentUser) {
        await saveUserData();
    }
}

async function startGame() {
    const mathCheckbox = document.getElementById("mathModeCheckbox");
    isMathMode = mathCheckbox ? mathCheckbox.checked : false;

    resize();
    game = true;
    paused = false;
    score = 0;
    level = 1;
    lives = shipTypes[selectedShip].hp;
    bullets = []; missiles = []; enemies = []; asteroids = [];
    particles = []; enemyBullets = []; powerups = []; coinDrops = []; mathDrones = [];
    gravityWell = null; player.gravityCooldown = 0;
    player.ultiCooldown = 0; player.invuln = 0; player.overdrive = 0; player.magnet = 0; novaFlash = 0;
    if (!store.get("gravitySeen", false)) setTimeout(() => showGameToast("🌀 <b>NEW · GRAVITY WELL</b><br><small>Enemies, asteroids &amp; bullets get sucked in. Tap ◉ or press G</small>", 5000), 1200);
    monsterActive = false; monster = null; 
    
    // Yahan reset karein
    monsterSpawnCount = 0; 
    monsterSpawnedAt1000 = false;
    fireBonus = 0; combo = 1; comboTimer = 0; player.shield = false; player.triplePower = false;
    if (isMathMode) refillSubject(window.selectedSubject || selectedSubject || "math");   // boss aane tak background me tayyar

          if (canvas) {
    player.x = canvas.width / 2 - player.w / 2;
    // Yahan bhi -220 kar dein
    player.y = Math.min(canvas.height - 220, window.innerHeight - 220); 
}





    player.speed = shipTypes[selectedShip].speed;
    startMusic();
    
    if (startScreen) startScreen.classList.remove("show");
    if (gameOverScreen) gameOverScreen.classList.remove("show");
    updateHUD();
    update();
}

if(startBtn) startBtn.onclick = startGame;
const menuBtnOver = document.getElementById("menuBtnOver");
if (menuBtnOver) menuBtnOver.onclick = () => {
    if (gameOverScreen) gameOverScreen.classList.remove("show");
    if (startScreen) startScreen.classList.add("show");
};
if(restartBtn) restartBtn.onclick = startGame;

// ==========================================
// 7. DATABASE SYNC & INITIALIZATION
// ==========================================
async function loadUserData() {
    try {
        if (!window.supabaseClient || !currentUser) return;

        const { data: profileData } = await window.supabaseClient
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', currentUser.id)
            .maybeSingle();

        let fullName = profileData?.full_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "Cyber Pilot";
        let avatarUrl = profileData?.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || "";

        const { data } = await window.supabaseClient
            .from('game_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (data) {
            coins = data.coins || 0;
            if (data.selected_ship) selectedShip = data.selected_ship;
            updateHUD();
            setActiveShipCard(selectedShip);

            if (data.name !== fullName || data.avatar_url !== avatarUrl) {
                await window.supabaseClient
                    .from('game_profiles')
                    .update({ name: fullName, avatar_url: avatarUrl })
                    .eq('id', currentUser.id);
            }
        } else {
            await window.supabaseClient.from('game_profiles').insert([{
                id: currentUser.id,
                score: 0,
                coins: 0,
                selected_ship: selectedShip,
                name: fullName,
                avatar_url: avatarUrl
            }]);
        }
    } catch (err) {
        console.error("Error loading user data:", err);
    }
}

let _saveT = null;
function queueSave() { if (!currentUser) return; clearTimeout(_saveT); _saveT = setTimeout(saveUserData, 4000); }

async function saveUserData() {
    try {
        if (!window.supabaseClient || !currentUser) return;

        const { data: profileData } = await window.supabaseClient
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', currentUser.id)
            .maybeSingle();

        let fullName = profileData?.full_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "Cyber Pilot";
        let avatarUrl = profileData?.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || "";

        const { data: existingGameProfile } = await window.supabaseClient
            .from('game_profiles')
            .select('score')
            .eq('id', currentUser.id)
            .maybeSingle();

        let highestScore = Math.max(score, existingGameProfile?.score || 0);

        await window.supabaseClient
            .from('game_profiles')
            .upsert({
                id: currentUser.id,
                score: highestScore,
                coins: coins,
                selected_ship: selectedShip,
                name: fullName,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

    } catch (err) {
        console.error("Error saving user data:", err);
    }
}

function setActiveShipCard(shipName) {
    shipCards.forEach(card => {
        if (card.dataset.ship === shipName) {
            card.classList.add("active");
        } else {
            card.classList.remove("active");
        }
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    resize();
    updateLaunchButtonState();
    
    // Apna question bank hai to API ko call hi nahi karte (privacy + speed)
    // Sirf chuna hua subject, aur sirf study mode on ho tab (ek saath 4 request = 429)
    if (mathModeCheckbox && mathModeCheckbox.checked) refillSubject(window.selectedSubject || "math");

    setTimeout(async () => {
        await checkAuthStatus();
    }, 400);
});

// ==========================================
// 8. MAIN GAME LOOP (RENDER & UPDATE)
// ==========================================
// ==========================================
// 🐢 STUDY SLOW-MOTION (jab sawaal screen par ho)
// ==========================================
const STUDY_BULLET_SLOW = 0.22;   // fighter ki bullet speed (bahut kam)
const STUDY_DRONE_SLOW  = 0.45;   // option blocks ki chaal
const STUDY_FX_SLOW     = 0.5;    // particles / effects
const CORRECT_HITS_NEEDED = 3;    // sahi option kitni hit me khatm hoga
const WRONG_ANSWER_SHAKE  = 3;    // galat answer par halka shake

function isStudySlowMo() {
    return !!(isMathMode && currentMathQuestion && mathDrones.length > 0);
}

function rm(arr, o) { const k = arr.indexOf(o); if (k > -1) arr.splice(k, 1); }

function measureLines(c, text, maxWidth) {
    const words = String(text).split(' '); let line = '', n = 1;
    for (let i = 0; i < words.length; i++) {
        const t = line + words[i] + ' ';
        if (c.measureText(t).width > maxWidth && i > 0) { n++; line = words[i] + ' '; } else line = t;
    }
    return n;
}
function fitText(c, text, maxWidth) {
    let t = String(text);
    if (c.measureText(t).width <= maxWidth) return t;
    while (t.length > 1 && c.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
    return t + '…';
}

// ---- Visuals: nebula + boss bar ----
function drawNebula(t) {
    const w = canvas.width, h = canvas.height;
    const blobs = [[0.2, 0.25, 0.55, "rgba(56,189,248,0.10)"], [0.85, 0.6, 0.6, "rgba(124,58,237,0.10)"], [0.5, 0.95, 0.5, "rgba(244,63,94,0.06)"]];
    blobs.forEach((b, i) => {
        const x = w * b[0] + Math.sin(t * 0.0002 + i * 2) * 40, y = h * b[1] + Math.cos(t * 0.00017 + i) * 40, r = Math.max(w, h) * b[2];
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, b[3]); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
}
function drawBossBar() {
    if (!monster) return;
    const w = Math.min(canvas.width - 40, 360), x = (canvas.width - w) / 2, y = 62;
    const pct = Math.max(0, monster.hp / monster.maxHp);
    const col = pct > 0.6 ? "#22c55e" : pct > 0.3 ? "#f59e0b" : "#ef4444";
    ctx.save();
    ctx.fillStyle = "rgba(2,6,23,0.75)"; ctx.fillRect(x - 2, y - 2, w + 4, 12);
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.fillRect(x, y, w * pct, 8);
    ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.strokeRect(x - 2, y - 2, w + 4, 12);
    ctx.fillStyle = "#e2e8f0"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("MOTHERSHIP", canvas.width / 2, y + 22); ctx.textAlign = "left";
    ctx.restore();
}

// Level-up + monster spawn har frame check (pehle sirf enemy kill par hota tha)
function checkProgress() {
    if (!monsterActive && !monsterSpawnedAt1000 && score >= 1000 + monsterSpawnCount * 2500) {
        monsterSpawnedAt1000 = true; monsterSpawnCount++; spawnMonster();
    }
    const nl = 1 + Math.floor(score / LEVEL_STEP);
    if (nl > level) { level = nl; showLevelUp(level); }
}

// ---- Background music (halka, audio button se band hota hai) ----
let musicTimer = null, musicStep = 0;
const MUSIC_NOTES = [220, 261.63, 329.63, 392, 329.63, 261.63, 196, 246.94];
function musicTick() {
    if (!audioEnabled || !game || paused) return;
    try {
        if (audioCtx.state === "suspended") audioCtx.resume();
        const now = audioCtx.currentTime, f = MUSIC_NOTES[musicStep++ % MUSIC_NOTES.length];
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = monsterActive ? "sawtooth" : "triangle"; o.frequency.value = monsterActive ? f / 2 : f;
        g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.02, now + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        o.connect(g); g.connect(audioCtx.destination); o.start(now); o.stop(now + 0.3);
    } catch (e) {}
}
function startMusic() { stopMusic(); musicTimer = setInterval(musicTick, monsterActive ? 260 : 320); }
function stopMusic() { clearInterval(musicTimer); musicTimer = null; }

function update() {
    if (!game || paused || !ctx) return;

    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake *= 0.88;
        if (screenShake < 0.5) screenShake = 0;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawNebula(Date.now());
    if (comboTimer > 0 && --comboTimer === 0 && combo > 1) { combo = 1; updateHUD(); }
    checkProgress();

    ctx.strokeStyle = "rgba(14, 165, 233, 0.08)";
    ctx.lineWidth = 1;
    gridOffset = (gridOffset + (scenarioEvent === "warp" ? 8 : 2)) % 40;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = gridOffset; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    let speedMult = scenarioEvent === "warp" ? 4.5 : 1;
    stars.forEach(s => {
        s.y += s.speed * speedMult;
        if (s.y > canvas.height) s.y = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`;
        ctx.fillRect(s.x, s.y, s.s, s.s * (scenarioEvent === "warp" ? 6 : 1));
    });

    if (Math.random() < 0.003) triggerScenario();
    if (scenarioEvent) {
        scenarioTimer--;
        if (scenarioEvent === "asteroid" && Math.random() < 0.08) spawnAsteroid();
        if (scenarioTimer <= 0) scenarioEvent = null;
    }

    shockwaves.slice().forEach((sw) => {
        sw.r += 4.5; sw.alpha -= 0.03;
        ctx.strokeStyle = sw.color; ctx.lineWidth = 3;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); ctx.stroke();
        if (sw.alpha <= 0) rm(shockwaves, sw);
    });
    ctx.globalAlpha = 1.0;

    trails.slice().forEach((t) => {
        t.y += 2.5; t.alpha -= 0.04; t.size *= 0.91;
        ctx.fillStyle = t.color; ctx.globalAlpha = Math.max(0, t.alpha);
        ctx.beginPath(); ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2); ctx.fill();
        if (t.alpha <= 0) rm(trails, t);
    });
    ctx.globalAlpha = 1.0;

    if (controlMode === "buttons") {
        let speedMultiplier = 1;
        if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed * speedMultiplier;
        if (keys["ArrowRight"] && player.x + player.w < canvas.width) player.x += player.speed * speedMultiplier;
    }
    
    shoot();
    if (player.cooldown > 0) player.cooldown--;
    if (player.missileCooldown > 0) player.missileCooldown--;
    if (player.ultiCooldown > 0) player.ultiCooldown--;
    if (player.gravityCooldown > 0) player.gravityCooldown--;
    if (player.invuln > 0) player.invuln--;
    if (player.overdrive > 0) player.overdrive--;
    if (player.magnet > 0) player.magnet--;

    if (ultiBtn) ultiBtn.style.opacity = player.ultiCooldown <= 0 ? "1" : "0.4";
    updateGravityButton();

    updateGravityWell();
    drawGravityWell();
    if (typeof drawPlayerShip === "function") {
        drawPlayerShip(ctx, player, shipTypes, selectedShip, trails);
    }
    if (player.magnet > 0 && typeof drawMagnetField === "function") drawMagnetField(ctx, player, player.magnet, MAGNET_RANGE);
    if (typeof drawOverdriveAura === "function") drawOverdriveAura(ctx, player, shipTypes[selectedShip]);

    const bulletSlow = isStudySlowMo() ? STUDY_BULLET_SLOW : 1;
    bullets.slice().forEach((b) => {
        b.y += b.vy * bulletSlow; b.x += (b.vx || 0) * bulletSlow;
        if (typeof drawLaser === "function") {
            drawLaser(ctx, { x: b.x - b.size/2, y: b.y, w: b.size, h: 16, isEnemy: false });
        } else {
            ctx.fillStyle = b.c;
            ctx.fillRect(b.x - b.size/2, b.y, b.size, 16);
        }
        if (b.y < -20 || b.x < 0 || b.x > canvas.width) rm(bullets, b);
    });
    
    asteroids.slice().forEach((a) => {
        if (!timeFreeze) { a.y += a.speed; a.rot += a.vRot; }
        if (typeof drawAsteroid === "function") {
            drawAsteroid(ctx, a);
        } else {
            ctx.save();
            ctx.translate(a.x + a.w/2, a.y + a.h/2);
            ctx.rotate(a.rot);
            ctx.fillStyle = "#475569";
            ctx.beginPath(); ctx.arc(0, 0, a.w/2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        if (a.y > canvas.height) rm(asteroids, a);
        if (a.x < player.x + player.w && a.x + a.w > player.x && a.y < player.y + player.h && a.y + a.h > player.y) {
            rm(asteroids, a); hitPlayer();
        }
    });

            coinDrops.slice().forEach((c) => {
        c.y += 2.2;
        magnetPull(c, c.w || 28, c.h || 28, 5);
        
        // 🪙 Yahan hum ensure kar rahe hain ki renderers.js ka 3D function call ho
        if (typeof drawCoin === "function") {
            // Agar coin object me w aur h nahi hai, toh default 28 size set kar do
            c.w = c.w || c.size || 28;
            c.h = c.h || c.size || 28;
            drawCoin(ctx, c);
        } else {
            // Fallback agar function kisi wajah se na mile
            ctx.fillStyle = "#ffd600";
            ctx.beginPath(); 
            ctx.arc(c.x, c.y, (c.size || 28)/2, 0, Math.PI*2); 
            ctx.fill();
        }

        // Player coin collection check
        if (c.x < player.x + player.w && c.x + (c.w || 28) > player.x && c.y < player.y + player.h && c.y + (c.h || 28) > player.y) {
            coins += 10;
            addFloatingText(c.x, c.y, "+10 🪙", "#ffd600");
            rm(coinDrops, c); 
            updateHUD();
            queueSave();
        }
    });



        powerups.slice().forEach((p) => {
        p.y += 1.8;
        magnetPull(p, p.size || 24, p.size || 24, 4);
        if (typeof drawPowerup === "function") {
            drawPowerup(ctx, p);
        } else {
            ctx.fillStyle = p.type === "shield" ? "#38bdf8" : p.type === "health" ? "#22c55e" : "#a855f7";
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        if (p.x < player.x + player.w && p.x + p.size > player.x && p.y < player.y + player.h && p.y + p.size > player.y) {
            if (p.type === "shield") player.shield = true;
            if (p.type === "health") lives = Math.min(shipTypes[selectedShip].hp + 10, lives + 4);
            if (p.type === "magnet") {
                player.magnet = MAGNET_DURATION;
                addFloatingText(player.x, player.y - 20, "🧲 MAGNET!", "#f43f5e");
            }
            if (p.type === "triple") {
                player.triplePower = true;
                setTimeout(() => player.triplePower = false, 7500);
            }
            rm(powerups, p); updateHUD();
        }
    });

    // 🎯 AYA A CODE-SNIPPET MUKVO (ENEMY & MONSTER BULLETS UPDATE):
        enemyBullets.slice().forEach((eb) => {
        eb.y += eb.vy;
        if (typeof drawLaser === "function") {
            drawLaser(ctx, eb);
        } else {
            ctx.fillStyle = eb.isYellowEnemy ? "#facc15" : "#ef4444";
            ctx.fillRect(eb.x, eb.y, eb.w, eb.h);
        }
        
        // Player collision with enemy/monster bullet
        if (eb.x < player.x + player.w && eb.x + eb.w > player.x && eb.y < player.y + player.h && eb.y + eb.h > player.y) {
            rm(enemyBullets, eb);
            if (eb.isYellowEnemy) {
                // Yellow goli kam damage degi: Sirf shield ya choti life ghatayegi bina heavy screen shake ke
                if (player.invuln <= 0) lives = Math.max(0, lives - 0.5); 
                updateHUD();
                if (lives <= 0) gameOver();
            } else {
                hitPlayer(); // Monster ya heavy goli full damage
            }
        }
        if (eb.y > canvas.height) rm(enemyBullets, eb);
    });


    if (!monsterActive && Math.random() < 0.038) spawnEnemy();

        // 👾 Enemies Update Loop ke andar yellow bullet firing add ki gayi hai
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        if (!timeFreeze) {
            e.y += e.speed;
            e.x += Math.sin(e.y * 0.05 + e.sineOffset) * 2 + (e.flankDir * 0.4);

            // 🔥 Normal Enemy bhi ab yellow laser/goli chhodega (Kam frequency par)
            if (Math.random() < 0.015) {
                enemyBullets.push({
                    x: e.x + e.w / 2,
                    y: e.y + e.h,
                    w: 5,
                    h: 14,
                    vx: 0,
                    vy: 4.5, // Thoda dheema taaki kam damage/avoid karna asan ho
                    isEnemy: true,
                    isYellowEnemy: true, // Yellow laser flag
                    damage: 1 // Kam damage
                });
            }
        }

        if (typeof drawEnemy === "function") drawEnemy(ctx, e);
        if (e.y > canvas.height) { enemies.splice(i, 1); hitPlayer(); }

        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            if (b.x < e.x + e.w && b.x + b.size > e.x && b.y < e.y + e.h && b.y + 16 > e.y) {
                comboTimer = 130; combo = Math.min(5, combo + 1);
                addFloatingText(e.x, e.y, "+" + (10 * combo));
                spawnPowerup(e.x, e.y);
                explode(e.x + e.w/2, e.y + e.h/2, "#f43f5e", 10);
                enemies.splice(i, 1); bullets.splice(j, 1);
                score += 10 * combo; 
                updateHUD();
                



break;

            }
        }
    }

           if (monsterActive && monster) {
        if (!timeFreeze) {
            if (monster.y < 80) monster.y += 2;
            else {
                monster.x += monster.speed * monster.dir;
                if (monster.x + monster.w > canvas.width || monster.x < 0) monster.dir *= -1;
            }

            // 🔥 Monster Firing Logic (Simple mode / Normal mode mein monster shoot karega)
            if (Math.random() < 0.04) {
                playSynthSound('laser');
                enemyBullets.push({
                    x: monster.x + monster.w / 2,
                    y: monster.y + monster.h,
                    w: 6,
                    h: 16,
                    vx: 0,
                    vy: 6,
                    isEnemy: true
                });
            }
        }

        if (typeof drawMonster === "function") {
            drawMonster(ctx, monster);
        } else {
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(monster.x, monster.y, monster.w, monster.h);
        }
        
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(monster.x, monster.y - 12, monster.w, 6);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(monster.x, monster.y - 12, (monster.hp / monster.maxHp) * monster.w, 6);
        drawBossBar();

          // Direct bullets damage to Monster + Sound effect + Screen Shake & Particles
        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            if (monster && b.x > monster.x && b.x < monster.x + monster.w && b.y > monster.y && b.y < monster.y + monster.h) {
                bullets.splice(j, 1);
                monster.hp = Math.max(0, monster.hp - 2);
                
                // 💥 Monster ko goli lagne par screen shake aur particles (khoon/explosion)
                screenShake = isStudySlowMo() ? 1.5 : 6;
                explode(b.x, b.y, "#ef4444", 6);
                
                // 🔊 Sound effect
                playSynthSound('blast'); 
                break;
            }
        }


        // Agar Math Mode ON hai
        if (isMathMode && currentMathQuestion) {
            ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 2;
            
            let qBoxWidth = Math.min(canvas.width - 40, 500);
            let qBoxX = (canvas.width - qBoxWidth) / 2;
            let qBoxY = 85;

            ctx.beginPath();
            ctx.font = "bold 12px sans-serif";
            const qLines = Math.min(4, measureLines(ctx, "❓ " + currentMathQuestion.question, qBoxWidth - 20));
            ctx.roundRect(qBoxX, qBoxY, qBoxWidth, 16 + qLines * 16, 10);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            wrapText(ctx, "❓ " + currentMathQuestion.question, canvas.width / 2, qBoxY + 22, qBoxWidth - 20, 16);
            ctx.textAlign = "left";
        }

                if (isMathMode && currentMathQuestion && mathDrones.length > 0) {
            mathDrones.forEach((drone) => {
                if (drone.solved) return;   // 3 hit me khatm ho chuka option
                drone.x += drone.dir * 1.5 * STUDY_DRONE_SLOW;
                if (drone.x < 20 || drone.x + drone.w > canvas.width - 20) drone.dir *= -1;
                drone.floatOffset += 0.04 * STUDY_DRONE_SLOW;
                drone.y = drone.baseY + Math.sin(drone.floatOffset) * 5;

                if (typeof drawStudyBlock === "function") {
                    drawStudyBlock(ctx, drone, drone.index === currentMathQuestion.correctIndex);
                }

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 11px sans-serif";
                ctx.textAlign = "center";
                ctx.font = "bold 10px sans-serif";
                ctx.fillText(fitText(ctx, drone.text, drone.w - 10), drone.x + drone.w / 2, drone.y + 22);
                ctx.textAlign = "left";

                for (let j = bullets.length - 1; j >= 0; j--) {
                    let b = bullets[j];
                    if (b.x > drone.x && b.x < drone.x + drone.w && b.y > drone.y && b.y < drone.y + drone.h) {
                        bullets.splice(j, 1);
                        if (drone.index === currentMathQuestion.correctIndex) {
                            drone.hits = (drone.hits || 0) + 1;
                            if (drone.hits < CORRECT_HITS_NEEDED) {
                                // Abhi option zinda hai: sirf hit count dikhao
                                explode(b.x, b.y, "#22c55e", 6);
                                addFloatingText(drone.x, drone.y, `HIT ${drone.hits}/${CORRECT_HITS_NEEDED}`, "#22c55e");
                            } else {
                                // 3rd hit: sahi option khatm (is par koi score nahi)
                                drone.solved = true;
                                explode(drone.x + drone.w / 2, drone.y + drone.h / 2, "#22c55e", 20);
                                addFloatingText(drone.x, drone.y, "CORRECT! ✅", "#22c55e");
                                monster.hp = Math.max(0, monster.hp - 40);
                                loadNextQuestion();
                            }
                        } else {
                            explode(drone.x + drone.w / 2, drone.y + drone.h / 2, "#ef4444", 8);
                            addFloatingText(drone.x, drone.y, "WRONG! ❌", "#ef4444");
                            screenShake = WRONG_ANSWER_SHAKE;
                        }
                        break;
                    }
                }
            });
        }

        // MONSTER DEFEAT CHECK (Ye monsterActive block ke andar hi hona chahiye)
        if (monster.hp <= 0) {
            monsterActive = false;
            monster = null;
            mathDrones = [];
            currentMathQuestion = null;
            monsterSpawnedAt1000 = false; 
            explode(canvas.width / 2, 100, "#facc15", 35);
            addFloatingText(canvas.width / 2 - 50, 100, "MOTHERSHIP DEFEATED!", "#facc15");
            score += 500; coins += 30; addFloatingText(canvas.width / 2 - 50, 125, "+500  +30 coins", "#ffd600"); updateHUD(); queueSave();
        }
    }

    particles.slice().forEach((p) => {
        const fxSlow = isStudySlowMo() ? STUDY_FX_SLOW : 1;
        p.x += p.vx * fxSlow; p.y += p.vy * fxSlow; p.l--;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.s, p.s);
        if (p.l <= 0) rm(particles, p);
    });

    floatingTexts.slice().forEach((ft) => {
        ft.y += ft.vy; ft.alpha -= 0.02;
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(ft.text, ft.x, ft.y);
        if (ft.alpha <= 0) rm(floatingTexts, ft);
    });
    ctx.globalAlpha = 1.0;

    if (novaFlash > 0) {
        if (typeof drawNovaFlash === "function") drawNovaFlash(ctx, canvas, novaFlash);
        novaFlash = Math.max(0, novaFlash - 0.05);
    }
    ctx.restore();
    requestAnimationFrame(update);
}

// ==========================================
// 9. PRO LAYER: persistence, stats, auto-pause
// ==========================================
const store = {
    get(k, d) { try { const v = localStorage.getItem("co_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("co_" + k, JSON.stringify(v)); } catch (e) {} }
};

function onRunEnd() {
    const prev = store.get("best", 0);
    const isBest = score > prev;
    if (isBest) store.set("best", score);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("final-score", score); set("best-score", Math.max(prev, score)); set("final-level", level); set("start-best", Math.max(prev, score));
    const badge = document.getElementById("newBestBadge");
    if (badge) badge.style.display = isBest && score > 0 ? "inline-block" : "none";
    if (gameOverScreen) gameOverScreen.classList.add("show");
}

// Restore saved settings by replaying the same clicks a user would make
(function restoreSettings() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("start-best", store.get("best", 0));

    audioEnabled = store.get("audio", true);
    if (audioBtn) {
        const l = audioBtn.querySelector(".lbl"); if (l) l.textContent = audioEnabled ? "Audio" : "Muted";
        audioBtn.classList.toggle("off", !audioEnabled);
        const orig = audioBtn.onclick;
        audioBtn.onclick = (e) => { orig && orig(e); store.set("audio", audioEnabled); };
    }

    const clickCard = (sel) => { const c = document.querySelector(sel); if (c) c.click(); };
    const ship = store.get("ship", null); if (ship) clickCard('.ship-card[data-ship="' + ship + '"]');
    const subj = store.get("subject", null); if (subj) clickCard('.subject-card[data-subject="' + subj + '"]');
    const med = store.get("medium", null); if (med) clickCard('.subject-card[data-medium="' + med + '"]');
    if (store.get("studyMode", false) && mathModeCheckbox) {
        mathModeCheckbox.checked = true; mathModeCheckbox.dispatchEvent(new Event("change"));
    }
    document.querySelectorAll(".ship-card").forEach(c => c.addEventListener("click", () => store.set("ship", c.dataset.ship)));
    document.querySelectorAll(".subject-card[data-subject]").forEach(c => c.addEventListener("click", () => store.set("subject", c.dataset.subject)));
    document.querySelectorAll(".subject-card[data-medium]").forEach(c => c.addEventListener("click", () => store.set("medium", c.dataset.medium)));
    if (mathModeCheckbox) mathModeCheckbox.addEventListener("change", () => store.set("studyMode", mathModeCheckbox.checked));
})();

// Auto-pause when the tab/app goes to background
document.addEventListener("visibilitychange", () => {
    if (document.hidden && game && !paused) {
        paused = true;
        if (pauseModal) pauseModal.classList.add("show");
    }
});


// "NEW" badge jab tak user ne Gravity Well use nahi kiya
(function markNewAbility() {
    if (gravityBtn && !store.get("gravitySeen", false)) gravityBtn.classList.add("is-new");
})();

// Subject badalne ya study mode on karne par naye questions background me mangwao
(function prefetchOnChange() {
    const go = () => { if (mathModeCheckbox && mathModeCheckbox.checked) refillSubject(window.selectedSubject || "math"); };
    if (mathModeCheckbox) mathModeCheckbox.addEventListener("change", go);
    document.querySelectorAll(".subject-card[data-subject]").forEach(c => c.addEventListener("click", go));
})();
