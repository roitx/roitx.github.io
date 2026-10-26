// ==========================================
// 1. GLOBAL VARIABLES & CONFIGURATION
// ==========================================
let isMathMode = false;
let currentMathQuestion = null;
let mathDrones = [];
let selectedSubject = "math";
let selectedMedium = "english";
let monsterSpawnedAt2500 = false;

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
        player.y = canvas.height - 120;
        if (player.x > canvas.width - player.w) player.x = canvas.width - player.w;
    }
}
window.addEventListener("resize", resize);

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
const ultiBtn = document.getElementById("ultimateBtn"), dashBtn = document.getElementById("dashBtn");
const shipCards = document.querySelectorAll(".ship-card");

const leaderboardScreen = document.getElementById("leaderboard-screen");
const openLeaderboardBtn = document.getElementById("openLeaderboardBtn");
const closeLeaderboardBtn = document.getElementById("closeLeaderboardBtn");
const leaderboardList = document.getElementById("leaderboard-list");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const mathModeCheckbox = document.getElementById("mathModeCheckbox");
const subjectOverrideContainer = document.getElementById("subjectOverrideContainer");

// Google Translate API Helper Function
async function translateText(text, targetLang) {
    if (targetLang === "english" || !text) return text;
    try {
        let tlCode = "hi"; 
        let url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tlCode}&dt=t&q=${encodeURIComponent(text)}`;
        let res = await fetch(url);
        let data = await res.json();
        if (data && data[0]) {
            return data[0].map(item => item[0]).join('');
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
        if (currentUser) saveUserData();
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
    } else if (type === 'ulti') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(80, now); osc.frequency.exponentialRampToValueAtTime(1800, now + 0.7);
        gain.gain.setValueAtTime(0.3, now); gain.gain.linearRampToValueAtTime(0, now + 0.7);
        osc.start(now); osc.stop(now + 0.7);
    }
}

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
        audioBtn.innerText = audioEnabled ? "🔊 Audio" : "🔇 Muted";
    };
}

const shipTypes = {
    pulse: { speed: 10, hp: 12, fireRate: 5, color: "#10b981", coreColor: "#6ee7b7" },
    titan: { speed: 6.5, hp: 22, fireRate: 10, color: "#f97316", coreColor: "#fdba74" },
    phantom: { speed: 8.5, hp: 14, fireRate: 7, color: "#a855f7", coreColor: "#e9d5ff", triple: true }
};
let selectedShip = "pulse";

for(let i = 0; i < 60; i++) {
    stars.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, s: Math.random() * 2 + 1, speed: Math.random() * 2 + 0.5, opacity: Math.random() });
}

const player = { 
    x: 0, y: 0, w: 56, h: 56, 
    speed: 8, cooldown: 0, missileCooldown: 0, shield: false, 
    ultiCooldown: 0, dashCooldown: 0, isDashing: false, triplePower: false 
};
const keys = {};

// ==========================================
// 4. EXTERNAL API QUESTION FETCHER & TRANSLATOR
// ==========================================
async function fetchApiQuestions(category = 18, amount = 10) {
    try {
        let response = await fetch(`https://opentdb.com/api.php?amount=${amount}&category=${category}&type=multiple`);
        let data = await response.json();
        
        if (data && data.results && data.results.length > 0) {
            return data.results.map(item => {
                let incorrects = item.incorrect_answers;
                let randomIndex = Math.floor(Math.random() * (incorrects.length + 1));
                let optionsList = [...incorrects];
                optionsList.splice(randomIndex, 0, item.correct_answer);
                
                return {
                    question: decodeHTML(item.question),
                    options: optionsList.map(opt => decodeHTML(opt)),
                    correctIndex: randomIndex
                };
            });
        }
    } catch (err) {
        console.error("API fetch error:", err);
    }
    return null;
}

function decodeHTML(html) {
    let txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

async function loadNextQuestion() {
    let activeSubject = window.selectedSubject || selectedSubject || "math";
    let activeMedium = window.selectedMedium || selectedMedium || "english";
    
    let cacheList = window.dynamicQuestionCache[activeSubject];
    if (!cacheList || cacheList.length === 0) {
        let catMap = { science: 17, math: 19, reasoning: 18, currentAffairs: 9 };
        let catId = catMap[activeSubject] || 19;
        let freshData = await fetchApiQuestions(catId, 10);
        if (freshData && freshData.length > 0) {
            window.dynamicQuestionCache[activeSubject] = freshData;
            cacheList = freshData;
        } else {
            cacheList = window.dynamicQuestionCache['math'] || [];
        }
    }
    
    if (cacheList && cacheList.length > 0) {
        let rawQ = cacheList[Math.floor(Math.random() * cacheList.length)];
        
        let translatedQ = await translateText(rawQ.question, activeMedium);
        let translatedOptions = await Promise.all(rawQ.options.map(opt => translateText(opt, activeMedium)));

        currentMathQuestion = {
            question: translatedQ,
            options: translatedOptions,
            correctIndex: rawQ.correctIndex
        };
        setupMathDrones();
    }
}

// ==========================================
// 5. CONTROLS, AUTH & LEADERBOARD SYSTEM
// ==========================================
window.addEventListener("keydown", e => {
    keys[e.key] = true;
    if (e.key === "e" || e.key === "E") triggerUltimate();
    if (e.key === "Shift") triggerDash();
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
                    ? `<img src="${pilotAvatar}" style="width:34px; height:34px; border-radius:50%; object-fit:cover; border: 1px solid #38bdf8;">` 
                    : `<div style="width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg, #0284c7, #0369a1); display:flex; align-items:center; justify-content:center;">${svgIcons.user}</div>`;
                
                html += `
                    <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.05); padding:10px 12px; border-radius:8px; border: 1px solid rgba(56, 189, 248, 0.2);">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-weight:bold; color:#38bdf8; width:22px; font-size:14px;">#${index + 1}</span>
                            ${avatarHtml}
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-size:13px; color:#fff; font-weight:600; max-width:110px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${pilotName}</span>
                                <span style="font-size:10px; color:#38bdf8; display:flex; align-items:center; gap:3px;">${svgIcons.rocket} Mode: ${row.selected_ship}</span>
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
    leftBtn.ontouchstart = (e) => { e.preventDefault(); keys["ArrowLeft"] = true; };
    leftBtn.ontouchend = (e) => { e.preventDefault(); keys["ArrowLeft"] = false; };
    rightBtn.ontouchstart = (e) => { e.preventDefault(); keys["ArrowRight"] = true; };
    rightBtn.ontouchend = (e) => { e.preventDefault(); keys["ArrowRight"] = false; };
}

if (ultiBtn) ultiBtn.onclick = triggerUltimate;
if (dashBtn) dashBtn.onclick = triggerDash;

if (canvas) {
    canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        if (!game || paused) return;
        let touch = e.touches[0];
        player.x = touch.clientX - player.w / 2;
        if (player.x < 0) player.x = 0;
        if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
    }, { passive: false });
}

if (toggleBtn) {
    toggleBtn.onclick = () => {
        controlMode = controlMode === "buttons" ? "tilt" : "buttons";
        toggleBtn.innerText = controlMode === "buttons" ? "🕹️ Buttons" : "📱 Tilt";
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
        if (coins >= 50) {
            coins -= 50;
            shipTypes[selectedShip].fireRate = Math.max(2, shipTypes[selectedShip].fireRate - 2);
            if(shopCoins) shopCoins.textContent = coins;
            updateHUD();
            if (currentUser) saveUserData();
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
            if (currentUser) saveUserData();
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
            if (currentUser) saveUserData();
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
        if (pauseModal) pauseModal.classList.remove("show");
        if (startScreen) startScreen.classList.add("show");
    };
}

// ==========================================
// 6. GAME MECHANICS & SPAWN LOGIC
// ==========================================
function updateHUD() {
    if (scoreEl) scoreEl.textContent = score;
    if (coinsEl) coinsEl.textContent = coins;
    if (livesEl) livesEl.textContent = lives;
    if (levelEl) levelEl.textContent = level;
    if (comboEl) comboEl.textContent = "x" + combo;
}

function addFloatingText(x, y, text, color = "#facc15") {
    floatingTexts.push({ x, y, text, color, alpha: 1, vy: -1.6 });
}

function addShockwave(x, y, color = "#06b6d4", maxR = 90) {
    shockwaves.push({ x, y, r: 5, maxR, color, alpha: 1 });
}

function triggerDash() {
    if (player.dashCooldown > 0 || !game) return;
    player.isDashing = true;
    player.dashCooldown = 110;
    addShockwave(player.x + player.w/2, player.y + player.h/2, "#06b6d4", 70);
    addFloatingText(player.x, player.y, "TACTICAL DASH!", "#06b6d4");
    setTimeout(() => player.isDashing = false, 320);
}

function triggerUltimate() {
    if (player.ultiCooldown > 0 || !game) return;
    playSynthSound('ulti');
    player.ultiCooldown = 380;
    screenShake = 30;
    addShockwave(player.x + player.w/2, player.y + player.h/2, "#f43f5e", 220);

    if (selectedShip === "pulse") {
        addFloatingText(player.x, player.y, "HYPER BEAM MATRIX!", "#10b981");
        for (let i = -100; i <= 100; i += 10) {
            bullets.push({ x: player.x + player.w / 2 + i, y: player.y, vx: 0, vy: -18, c: "#10b981", size: 6 });
        }
    } else if (selectedShip === "titan") {
        addFloatingText(player.x, player.y, "EMP NUKE!", "#f97316");
        enemyBullets = [];
        enemies.forEach(e => explode(e.x + e.w/2, e.y + e.h/2, "#f97316", 12));
        enemies = [];
        if (monster) monster.hp -= 45;
        explode(player.x + player.w/2, player.y + player.h/2, "#f97316", 90);
    } else if (selectedShip === "phantom") {
        addFloatingText(player.x, player.y, "CHRONO WARP!", "#a855f7");
        timeFreeze = true;
        setTimeout(() => timeFreeze = false, 5500);
    }
}

function shoot() {
    if (player.cooldown <= 0) {
        const ship = shipTypes[selectedShip];
        playSynthSound('laser');

        if (ship.triple || player.triplePower) {
            bullets.push({ x: player.x + player.w / 2, y: player.y, vx: 0, vy: -15, c: ship.color, size: 4 });
            bullets.push({ x: player.x + player.w / 2, y: player.y, vx: -3.8, vy: -14, c: ship.color, size: 4 });
            bullets.push({ x: player.x + player.w / 2, y: player.y, vx: 3.8, vy: -14, c: ship.color, size: 4 });
        } else {
            bullets.push({ x: player.x + player.w / 2, y: player.y, vx: 0, vy: -15, c: ship.color, size: 4 });
        }
        player.cooldown = ship.fireRate;
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
    const size = Math.random() * 30 + 25;
    asteroids.push({
        x: Math.random() * (canvas.width - size),
        y: -size, w: size, h: size,
        speed: Math.random() * 3 + 3,
        rot: 0, vRot: (Math.random() - 0.5) * 0.1
    });
}

function spawnPowerup(x, y) {
    if (Math.random() < 0.28) {
        const types = ["shield", "health", "triple"];
        powerups.push({ x, y, type: types[Math.floor(Math.random() * types.length)], size: 24 });
    }
    if (Math.random() < 0.75) {
        coinDrops.push({ x, y, size: 14 });
    }
}

function setupMathDrones() {
    mathDrones = [];
    if (!currentMathQuestion || !canvas) return;

    const droneWidth = 90;
    const spacing = (canvas.width - (4 * droneWidth)) / 5;

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
            dir: 1
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
    if (player.isDashing) return;
    if (player.shield) {
        player.shield = false;
        addFloatingText(player.x, player.y, "SHIELD BROKEN!", "#38bdf8");
        return;
    }
    lives--;
    screenShake = 15;
    updateHUD();
    explode(player.x + player.w/2, player.y + player.h/2, "#ef4444", 12);
    if (lives <= 0) gameOver();
}

async function gameOver() {
    game = false;
    if (finalScore) finalScore.textContent = score;
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
    monsterActive = false; monster = null; monsterSpawnedAt2500 = false;
    
    // Game shuru hote hi turant active subject ke questions preload karwa lo taaki 2500 score par bina delay ke monster aaye
    if (isMathMode) {
        let activeSubject = window.selectedSubject || selectedSubject || "math";
        let cacheList = window.dynamicQuestionCache[activeSubject];
        if (!cacheList || cacheList.length === 0) {
            let catMap = { science: 17, math: 19, reasoning: 18, currentAffairs: 9 };
            let catId = catMap[activeSubject] || 19;
            let freshData = await fetchApiQuestions(catId, 10);
            if (freshData && freshData.length > 0) {
                window.dynamicQuestionCache[activeSubject] = freshData;
            }
        }
        await loadNextQuestion();
    }

    if (canvas) {
        player.x = canvas.width / 2 - player.w / 2;
        player.y = canvas.height - 120;
    }
    player.speed = shipTypes[selectedShip].speed;
    
    if (startScreen) startScreen.classList.remove("show");
    if (gameOverScreen) gameOverScreen.classList.remove("show");
    updateHUD();
    update();
}

if(startBtn) startBtn.onclick = startGame;
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
    
    // Fetching questions for ALL subjects with respective OpenTDB categories
    let scienceData = await fetchApiQuestions(17, 10); // Category 17: Science & Nature
    if (scienceData) window.dynamicQuestionCache['science'] = scienceData;

    let mathData = await fetchApiQuestions(19, 10); // Category 19: Mathematics
    if (mathData) window.dynamicQuestionCache['math'] = mathData;

    let reasoningData = await fetchApiQuestions(18, 10); // Category 18: Science: Computers (Logic/Reasoning fallback)
    if (reasoningData) window.dynamicQuestionCache['reasoning'] = reasoningData;

    let gkData = await fetchApiQuestions(9, 10); // Category 9: General Knowledge (Current Affairs fallback)
    if (gkData) window.dynamicQuestionCache['currentAffairs'] = gkData;

    console.log("All subjects API questions loaded into cache successfully!");

    setTimeout(async () => {
        await checkAuthStatus();
    }, 400);
});

// ==========================================
// 8. MAIN GAME LOOP (RENDER & UPDATE)
// ==========================================
function update() {
    if (!game || paused || !ctx) return;

    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake *= 0.88;
        if (screenShake < 0.5) screenShake = 0;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    shockwaves.forEach((sw, i) => {
        sw.r += 4.5; sw.alpha -= 0.03;
        ctx.strokeStyle = sw.color; ctx.lineWidth = 3;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); ctx.stroke();
        if (sw.alpha <= 0) shockwaves.splice(i, 1);
    });
    ctx.globalAlpha = 1.0;

    trails.forEach((t, i) => {
        t.y += 2.5; t.alpha -= 0.04; t.size *= 0.91;
        ctx.fillStyle = t.color; ctx.globalAlpha = Math.max(0, t.alpha);
        ctx.beginPath(); ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2); ctx.fill();
        if (t.alpha <= 0) trails.splice(i, 1);
    });
    ctx.globalAlpha = 1.0;

    if (controlMode === "buttons") {
        let speedMultiplier = player.isDashing ? 2.3 : 1;
        if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed * speedMultiplier;
        if (keys["ArrowRight"] && player.x + player.w < canvas.width) player.x += player.speed * speedMultiplier;
    }
    
    shoot();
    if (player.cooldown > 0) player.cooldown--;
    if (player.missileCooldown > 0) player.missileCooldown--;
    if (player.ultiCooldown > 0) player.ultiCooldown--;
    if (player.dashCooldown > 0) player.dashCooldown--;

    if (ultiBtn) ultiBtn.style.opacity = player.ultiCooldown <= 0 ? "1" : "0.4";
    if (dashBtn) dashBtn.style.opacity = player.dashCooldown <= 0 ? "1" : "0.4";

    if (typeof drawPlayerShip === "function") {
        drawPlayerShip(ctx, player, shipTypes, selectedShip, trails);
    }

    bullets.forEach((b, i) => {
        b.y += b.vy; b.x += b.vx || 0;
        if (typeof drawLaser === "function") {
            drawLaser(ctx, { x: b.x - b.size/2, y: b.y, w: b.size, h: 16, isEnemy: false });
        } else {
            ctx.fillStyle = b.c;
            ctx.fillRect(b.x - b.size/2, b.y, b.size, 16);
        }
        if (b.y < -20 || b.x < 0 || b.x > canvas.width) bullets.splice(i, 1);
    });
    
    asteroids.forEach((a, i) => {
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
        if (a.y > canvas.height) asteroids.splice(i, 1);
        if (a.x < player.x + player.w && a.x + a.w > player.x && a.y < player.y + player.h && a.y + a.h > player.y) {
            asteroids.splice(i, 1); hitPlayer();
        }
    });

    coinDrops.forEach((c, i) => {
        c.y += 2.2;
        ctx.fillStyle = "#ffd600";
        ctx.beginPath(); ctx.arc(c.x, c.y, c.size/2, 0, Math.PI*2); ctx.fill();
        if (c.x < player.x + player.w && c.x + c.size > player.x && c.y < player.y + player.h && c.y + c.size > player.y) {
            coins += 10;
            addFloatingText(c.x, c.y, "+10 🪙", "#ffd600");
            coinDrops.splice(i, 1); updateHUD();
            if (currentUser) saveUserData();
        }
    });

    powerups.forEach((p, i) => {
        p.y += 1.8;
        if (typeof drawPowerup === "function") {
            drawPowerup(ctx, p);
        } else {
            ctx.fillStyle = p.type === "shield" ? "#38bdf8" : p.type === "health" ? "#22c55e" : "#a855f7";
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        if (p.x < player.x + player.w && p.x + p.size > player.x && p.y < player.y + player.h && p.y + p.size > player.y) {
            if (p.type === "shield") player.shield = true;
            if (p.type === "health") lives = Math.min(shipTypes[selectedShip].hp + 10, lives + 4);
            if (p.type === "triple") {
                player.triplePower = true;
                setTimeout(() => player.triplePower = false, 7500);
            }
            powerups.splice(i, 1); updateHUD();
        }
    });

    if (!monsterActive && Math.random() < 0.038) spawnEnemy();
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        if (!timeFreeze) {
            e.y += e.speed;
            e.x += Math.sin(e.y * 0.05 + e.sineOffset) * 2 + (e.flankDir * 0.4);
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

// Yahan exact match ki jagah >= use karo aur flag check lagao
if (score >= 2500 && !monsterSpawnedAt2500 && !monsterActive) {
    monsterSpawnedAt2500 = true;
    spawnMonster();
}

if (score % 350 === 0) level++;
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

        if (isMathMode && currentMathQuestion) {
            ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 2;
            
            let qBoxWidth = Math.min(canvas.width - 40, 500);
            let qBoxX = (canvas.width - qBoxWidth) / 2;
            let qBoxY = 85;

            ctx.beginPath();
            ctx.roundRect(qBoxX, qBoxY, qBoxWidth, 65, 10);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            wrapText(ctx, "❓ " + currentMathQuestion.question, canvas.width / 2, qBoxY + 22, qBoxWidth - 20, 16);
            ctx.textAlign = "left";
        }

        if (isMathMode && currentMathQuestion && mathDrones.length > 0) {
            mathDrones.forEach((drone) => {
                drone.x += drone.dir * 1.5;
                if (drone.x < 20 || drone.x + drone.w > canvas.width - 20) drone.dir *= -1;
                drone.floatOffset += 0.04;
                drone.y = drone.baseY + Math.sin(drone.floatOffset) * 5;

                if (typeof drawStudyBlock === "function") {
                    drawStudyBlock(ctx, drone, drone.index === currentMathQuestion.correctIndex);
                }

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 11px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(drone.text, drone.x + drone.w / 2, drone.y + 22);
                ctx.textAlign = "left";

                for (let j = bullets.length - 1; j >= 0; j--) {
                    let b = bullets[j];
                    if (b.x > drone.x && b.x < drone.x + drone.w && b.y > drone.y && b.y < drone.y + drone.h) {
                        bullets.splice(j, 1);
                        if (drone.index === currentMathQuestion.correctIndex) {
    explode(drone.x + drone.w / 2, drone.y + drone.h / 2, "#22c55e", 20);
    
    // Normal enemy ka score (10 * combo) ka 1.5 guna (dedh guna) calculate hoga
    let monsterReward = Math.floor(10 * combo * 1.5);
    
    addFloatingText(drone.x, drone.y, `CORRECT! +${monsterReward} ⚡`, "#22c55e");
    monster.hp -= 40;
    score += monsterReward;
    updateHUD();
    loadNextQuestion();
}
                         else {
                            explode(drone.x + drone.w / 2, drone.y + drone.h / 2, "#ef4444", 15);
                            addFloatingText(drone.x, drone.y, "WRONG! ❌", "#ef4444");
                            screenShake = 14;
                        }
                        break;
                    }
                }
            });
        }
    }

    particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.l--;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.s, p.s);
        if (p.l <= 0) particles.splice(i, 1);
    });

    floatingTexts.forEach((ft, i) => {
        ft.y += ft.vy; ft.alpha -= 0.02;
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(ft.text, ft.x, ft.y);
        if (ft.alpha <= 0) floatingTexts.splice(i, 1);
    });
    ctx.globalAlpha = 1.0;

    ctx.restore();
    requestAnimationFrame(update);
}
