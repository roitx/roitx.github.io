const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resize() { 
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
    if (player) {
        player.y = canvas.height - 120;
        if (player.x > canvas.width - player.w) player.x = canvas.width - player.w;
    }
}
window.addEventListener("resize", resize);

// DOM Elements
const scoreEl = document.getElementById("score"), coinsEl = document.getElementById("coins"), livesEl = document.getElementById("lives"), levelEl = document.getElementById("level"), comboEl = document.getElementById("combo");
const startScreen = document.getElementById("start-screen"), gameOverScreen = document.getElementById("game-over"), shopModal = document.getElementById("shop-modal");
const finalScore = document.getElementById("final-score"), monsterAlert = document.getElementById("monster-alert"), shopCoins = document.getElementById("shop-coins");
const toggleBtn = document.getElementById("toggleControl"), pauseBtn = document.getElementById("pauseBtn"), shopBtn = document.getElementById("shopBtn"), audioBtn = document.getElementById("audioBtn");
const ultiBtn = document.getElementById("ultimateBtn"), dashBtn = document.getElementById("dashBtn");
const shipCards = document.querySelectorAll(".ship-card");

// Audio Synthesizer
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

if (audioBtn) {
    audioBtn.onclick = () => {
        audioEnabled = !audioEnabled;
        audioBtn.innerText = audioEnabled ? "🔊 Audio Engine" : "🔇 Muted";
    };
}

// Core Variables
let game = false, paused = false, score = 0, coins = 0, lives = 12, level = 1;
let bullets = [], missiles = [], enemies = [], asteroids = [], particles = [], stars = [], enemyBullets = [], powerups = [], floatingTexts = [], coinDrops = [], shockwaves = [], trails = [];
let controlMode = "buttons", screenShake = 0, combo = 1, comboTimer = 0;
let timeFreeze = false, monsterActive = false, monster = null;
let scenarioEvent = null, scenarioTimer = 0, gridOffset = 0;

const shipTypes = {
    pulse: { speed: 10, hp: 12, fireRate: 5, color: "#10b981", coreColor: "#6ee7b7" },
    titan: { speed: 6.5, hp: 22, fireRate: 10, color: "#f97316", coreColor: "#fdba74" },
    phantom: { speed: 8.5, hp: 14, fireRate: 7, color: "#a855f7", coreColor: "#e9d5ff", triple: true }
};
let selectedShip = "pulse";

// Init Stars Background
for(let i = 0; i < 60; i++) {
    stars.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, s: Math.random() * 2 + 1, speed: Math.random() * 2 + 0.5, opacity: Math.random() });
}

// Dynamic Character Switching
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
        saveUserData();
    });
});

const player = { 
    x: 0, y: 0, w: 56, h: 56, 
    speed: 8, cooldown: 0, missileCooldown: 0, shield: false, 
    ultiCooldown: 0, dashCooldown: 0, isDashing: false, triplePower: false 
};
const keys = {};

// Desktop Controls
window.addEventListener("keydown", e => {
    keys[e.key] = true;
    if (e.key === "e" || e.key === "E") triggerUltimate();
    if (e.key === "Shift") triggerDash();
});
window.addEventListener("keyup", e => keys[e.key] = false);

// Leaderboard Modal Logic
const leaderboardScreen = document.getElementById("leaderboard-screen");
const openLeaderboardBtn = document.getElementById("openLeaderboardBtn");
const closeLeaderboardBtn = document.getElementById("closeLeaderboardBtn");
const leaderboardList = document.getElementById("leaderboard-list");

if (openLeaderboardBtn) {
    openLeaderboardBtn.onclick = async () => {
        if (startScreen) startScreen.classList.remove("show");
        if (leaderboardScreen) leaderboardScreen.classList.add("show");
        await fetchLeaderboard();
    };
}

if (closeLeaderboardBtn) {
    closeLeaderboardBtn.onclick = () => {
        if (leaderboardScreen) leaderboardScreen.classList.remove("show");
        if (startScreen) startScreen.classList.add("show");
    };
}

async function fetchLeaderboard() {
    if (!window.supabaseClient) {
        if (leaderboardList) leaderboardList.innerHTML = "Supabase not connected.";
        return;
    }

    try {
        if (leaderboardList) leaderboardList.innerHTML = "Loading leaderboard...";
        
        const { data, error } = await window.supabaseClient
            .from('game_profiles')
            .select('id, score, selected_ship, name, avatar_url')
            .order('score', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (data && data.length > 0) {
            let html = "<div style='display:flex; flex-direction:column; gap:8px;'>";
            data.forEach((row, index) => {
                let pilotName = row.name || "Unknown Pilot";
                let pilotAvatar = row.avatar_url ? `<img src="${row.avatar_url}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">` : `<div style="width:30px; height:30px; border-radius:50%; background:#0ea5e9; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">👤</div>`;
                
                html += `
                    <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:6px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-weight:bold; color:#38bdf8; width:20px;">#${index + 1}</span>
                            ${pilotAvatar}
                            <span style="font-size:14px; color:#fff; font-weight:500; max-width:110px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${pilotName}</span>
                        </div>
                        <div style="text-align:right;">
                            <span style="color:#facc15; font-weight:bold; font-size:13px; display:block;">⭐ ${row.score || 0}</span>
                            <span style="font-size:10px; color:#94a3b8;">${row.selected_ship || 'pulse'}</span>
                        </div>
                    </div>
                `;
            });
            html += "</div>";
            leaderboardList.innerHTML = html;
        } else {
            leaderboardList.innerHTML = "No scores recorded yet!";
        }
    } catch (err) {
        console.error("Error fetching leaderboard:", err);
        if (leaderboardList) leaderboardList.innerHTML = "Failed to load leaderboard.";
    }
}

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

// Canvas Touch Drag support
canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!game || paused) return;
    let touch = e.touches[0];
    player.x = touch.clientX - player.w / 2;
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
}, { passive: false });

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

// Shop listeners
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
            saveUserData();
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
            saveUserData();
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
            saveUserData();
        }
    };
}

if (pauseBtn) {
    pauseBtn.onclick = () => {
        paused = !paused;
        pauseBtn.innerText = paused ? "▶️" : "⏸️";
        if (!paused) update();
    };
}

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
    if (scenarioEvent || monsterActive) return;
    const events = ["asteroid", "warp"];
    scenarioEvent = events[Math.floor(Math.random() * events.length)];
    scenarioTimer = 350;

    if (scenarioEvent === "asteroid") addFloatingText(canvas.width/2 - 80, 150, "⚠️ ASTEROID BELT DETECTED!", "#ef4444");
    if (scenarioEvent === "warp") addFloatingText(canvas.width/2 - 80, 150, "⚡ HYPER WARP SPEED!", "#38bdf8");
}

function spawnEnemy() {
    if (monsterActive || timeFreeze) return; 
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

function spawnMonster() {
    monsterActive = true;
    if(monsterAlert) {
        monsterAlert.style.display = "block";
        setTimeout(() => { monsterAlert.style.display = "none"; }, 3000);
    }
    const maxHp = 90 + (level * 45);
    monster = { x: canvas.width / 2 - 80, y: -150, w: 160, h: 100, hp: maxHp, maxHp: maxHp, speed: 3.5, dir: 1, angle: 0, phase: 1 };
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

function gameOver() {
    game = false;
    if (finalScore) finalScore.textContent = score;
    if (gameOverScreen) gameOverScreen.classList.add("show");
    saveUserData();
}

function startGame() {
    resize();
    game = true;
    paused = false;
    score = 0;
    level = 1;
    lives = shipTypes[selectedShip].hp;
    bullets = []; missiles = []; enemies = []; asteroids = [];
    particles = []; enemyBullets = []; powerups = []; coinDrops = [];
    monsterActive = false; monster = null;
    
    player.x = canvas.width / 2 - player.w / 2;
    player.y = canvas.height - 120;
    player.speed = shipTypes[selectedShip].speed;
    
    if (startScreen) startScreen.classList.remove("show");
    if (gameOverScreen) gameOverScreen.classList.remove("show");
    updateHUD();
    update();
}

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
if(startBtn) startBtn.onclick = startGame;
if(restartBtn) restartBtn.onclick = startGame;

// --- SUPABASE USER DATA SYNC SYSTEM ---
async function loadUserData() {
    try {
        if (!window.supabaseClient) return;
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        const { data, error } = await window.supabaseClient
            .from('game_profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (data) {
            coins = data.coins || 0;
            selectedShip = data.selected_ship || 'pulse';
            updateHUD();
            setActiveShipCard(selectedShip);
        } else {
            let fullName = user.user_metadata?.full_name || user.user_metadata?.name || "Cyber Pilot";
            let avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";

            const { data: profileData } = await window.supabaseClient
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', user.id)
                .maybeSingle();

            if (profileData) {
                if (profileData.full_name) fullName = profileData.full_name;
                if (profileData.avatar_url) avatarUrl = profileData.avatar_url;
            }

            await window.supabaseClient.from('game_profiles').insert([{
                id: user.id,
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
        if (!window.supabaseClient) return;
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        let fullName = user.user_metadata?.full_name || user.user_metadata?.name || "Cyber Pilot";
        let avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";

        const { data: profileData } = await window.supabaseClient
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', user.id)
            .maybeSingle();

        if (profileData) {
            if (profileData.full_name) fullName = profileData.full_name;
            if (profileData.avatar_url) avatarUrl = profileData.avatar_url;
        }

        // Fetch existing top score so we don't overwrite high scores with a lower current game score
        const { data: existingGameProfile } = await window.supabaseClient
            .from('game_profiles')
            .select('score')
            .eq('id', user.id)
            .maybeSingle();

        let highestScore = Math.max(score, existingGameProfile?.score || 0);

        await window.supabaseClient
            .from('game_profiles')
            .upsert({
                id: user.id,
                score: highestScore,
                coins: coins,
                selected_ship: selectedShip,
                name: fullName,
                avatar_url: avatarUrl,
                updated_at: new Date()
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

// Auto Load profile on page ready
window.addEventListener('DOMContentLoaded', async () => {
    resize();
    setTimeout(loadUserData, 800);
});
// ---------------------------------------

function update() {
    if (!game || paused) return;

    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake *= 0.88;
        if (screenShake < 0.5) screenShake = 0;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid Background
    ctx.strokeStyle = "rgba(14, 165, 233, 0.08)";
    ctx.lineWidth = 1;
    gridOffset = (gridOffset + (scenarioEvent === "warp" ? 8 : 2)) % 40;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = gridOffset; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Parallax Stars
    let speedMult = scenarioEvent === "warp" ? 4.5 : 1;
    stars.forEach(s => {
        s.y += s.speed * speedMult;
        if (s.y > canvas.height) s.y = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`;
        ctx.fillRect(s.x, s.y, s.s, s.s * (scenarioEvent === "warp" ? 6 : 1));
    });

    // Scenario Trigger
    if (Math.random() < 0.003) triggerScenario();
    if (scenarioEvent) {
        scenarioTimer--;
        if (scenarioEvent === "asteroid" && Math.random() < 0.08) spawnAsteroid();
        if (scenarioTimer <= 0) scenarioEvent = null;
    }

    // Shockwaves
    shockwaves.forEach((sw, i) => {
        sw.r += 4.5; sw.alpha -= 0.03;
        ctx.strokeStyle = sw.color; ctx.lineWidth = 3;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); ctx.stroke();
        if (sw.alpha <= 0) shockwaves.splice(i, 1);
    });
    ctx.globalAlpha = 1.0;

    // Thruster Trails
    trails.forEach((t, i) => {
        t.y += 2.5; t.alpha -= 0.04; t.size *= 0.91;
        ctx.fillStyle = t.color; ctx.globalAlpha = Math.max(0, t.alpha);
        ctx.beginPath(); ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2); ctx.fill();
        if (t.alpha <= 0) trails.splice(i, 1);
    });
    ctx.globalAlpha = 1.0;

    // Player Controls
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

    // Draw Player Ship
    if (typeof drawPlayerShip === "function") {
        drawPlayerShip(ctx, player, shipTypes, selectedShip, trails);
    }

    // Bullets
    bullets.forEach((b, i) => {
        b.y += b.vy; b.x += b.vx || 0;
        ctx.shadowBlur = 12; ctx.shadowColor = b.c;
        ctx.fillStyle = b.c;
        ctx.fillRect(b.x - b.size/2, b.y, b.size, 16);
        ctx.shadowBlur = 0;
        if (b.y < -20 || b.x < 0 || b.x > canvas.width) bullets.splice(i, 1);
    });

    // Missiles
    missiles.forEach((m, i) => {
        let target = enemies[0] || monster;
        if (target) {
            let tx = target.x + target.w/2, ty = target.y + target.h/2;
            let angle = Math.atan2(ty - m.y, tx - m.x);
            m.vx += Math.cos(angle) * 0.65;
            m.vy += Math.sin(angle) * 0.65;
        } else {
            m.vy -= 0.3;
        }
        m.x += m.vx; m.y += m.vy;
        ctx.fillStyle = "#facc15"; ctx.fillRect(m.x - 2, m.y - 2, 5, 10);

        if (m.y < -20 || m.y > canvas.height || m.x < 0 || m.x > canvas.width) missiles.splice(i, 1);
    });

    // Asteroids
    asteroids.forEach((a, i) => {
        if (!timeFreeze) { a.y += a.speed; a.rot += a.vRot; }
        ctx.save();
        ctx.translate(a.x + a.w/2, a.y + a.h/2);
        ctx.rotate(a.rot);
        ctx.fillStyle = "#64748b"; ctx.fillRect(-a.w/2, -a.h/2, a.w, a.h);
        ctx.restore();

        if (a.y > canvas.height) asteroids.splice(i, 1);

        if (a.x < player.x + player.w && a.x + a.w > player.x && a.y < player.y + player.h && a.y + a.h > player.y) {
            asteroids.splice(i, 1); hitPlayer();
        }
    });

    // Coins
    coinDrops.forEach((c, i) => {
        c.y += 2.2;
        ctx.fillStyle = "#ffd600";
        ctx.beginPath(); ctx.arc(c.x, c.y, c.size/2, 0, Math.PI*2); ctx.fill();

        if (c.x < player.x + player.w && c.x + c.size > player.x && c.y < player.y + player.h && c.y + c.size > player.y) {
            coins += 10;
            addFloatingText(c.x, c.y, "+10 🪙", "#ffd600");
            coinDrops.splice(i, 1); updateHUD();
            saveUserData();
        }
    });

    // Powerups
    powerups.forEach((p, i) => {
        p.y += 1.8;
        ctx.fillStyle = p.type === "shield" ? "#38bdf8" : p.type === "health" ? "#22c55e" : "#a855f7";
        ctx.fillRect(p.x, p.y, p.size, p.size);

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

    // Enemies Loop
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
                score += 10 * combo; updateHUD();
                if (score > 0 && score % 250 === 0) spawnMonster();
                if (score % 350 === 0) level++;
                break;
            }
        }

        missiles.forEach((m, mIdx) => {
            if (m.x > e.x && m.x < e.x + e.w && m.y > e.y && m.y < e.y + e.h) {
                explode(e.x + e.w/2, e.y + e.h/2, "#facc15", 14);
                enemies.splice(i, 1); missiles.splice(mIdx, 1);
                score += 15 * combo; updateHUD();
            }
        });

        if (e.x < player.x + player.w && e.x + e.w > player.x && e.y < player.y + player.h && e.y + e.h > player.y) {
            enemies.splice(i, 1); hitPlayer();
        }
    }

    // Boss Monster Logic
    if (monsterActive && monster) {
        if (!timeFreeze) {
            if (monster.y < 80) monster.y += 2;
            else {
                monster.x += monster.speed * monster.dir;
                if (monster.x + monster.w > canvas.width || monster.x < 0) monster.dir *= -1;

                monster.angle += 0.14;
                let hpRatio = monster.hp / monster.maxHp;

                if (hpRatio < 0.2) monster.phase = 3;
                else if (hpRatio < 0.55) monster.phase = 2;

                if (Math.random() < (monster.phase === 3 ? 0.22 : 0.13)) {
                    let mCenterX = monster.x + monster.w / 2;
                    let mCenterY = monster.y + monster.h / 2;

                    if (monster.phase === 1) {
                        enemyBullets.push({ x: mCenterX, y: mCenterY, vx: (Math.random() - 0.5) * 5, vy: 4.5 });
                    } else if (monster.phase === 2) {
                        let dx = (player.x + player.w/2) - mCenterX;
                        let dy = (player.y + player.h/2) - mCenterY;
                        let angle = Math.atan2(dy, dx);
                        enemyBullets.push({ x: mCenterX, y: mCenterY, vx: Math.cos(angle) * 5.5, vy: Math.sin(angle) * 5.5 });
                    } else if (monster.phase === 3) {
                        for(let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                            enemyBullets.push({ x: mCenterX, y: mCenterY, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4 });
                        }
                    }
                }
            }
        }

        // Draw Boss
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(monster.x, monster.y, monster.w, monster.h);
        
        // Health bar
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(monster.x, monster.y - 12, monster.w, 6);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(monster.x, monster.y - 12, (monster.hp / monster.maxHp) * monster.w, 6);

        // Player bullets vs Boss
        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            if (b.x > monster.x && b.x < monster.x + monster.w && b.y > monster.y && b.y < monster.y + monster.h) {
                monster.hp -= 2;
                bullets.splice(j, 1);
                explode(b.x, b.y, "#ef4444", 4);
                if (monster.hp <= 0) {
                    explode(monster.x + monster.w/2, monster.y + monster.h/2, "#f43f5e", 40);
                    score += 200;
                    monsterActive = false;
                    monster = null;
                    updateHUD();
                    break;
                }
            }
        }
    }

    // Enemy Bullets Logic
    enemyBullets.forEach((eb, i) => {
        eb.x += eb.vx; eb.y += eb.vy;
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath(); ctx.arc(eb.x, eb.y, 4, 0, Math.PI * 2); ctx.fill();

        if (eb.x < player.x + player.w && eb.x > player.x && eb.y < player.y + player.h && eb.y > player.y) {
            enemyBullets.splice(i, 1);
            hitPlayer();
        }
        if (eb.y > canvas.height || eb.y < 0 || eb.x < 0 || eb.x > canvas.width) enemyBullets.splice(i, 1);
    });

    // Particles Render
    particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.l--;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.s, p.s);
        if (p.l <= 0) particles.splice(i, 1);
    });

    // Floating Text Render
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
