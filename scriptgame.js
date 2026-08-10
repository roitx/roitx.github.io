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

// Mobile Controls (Buttons & Touch Drag)
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

// Canvas Touch Drag support for smooth Mobile Play
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
}

function startGame() {
    resize();
    game = true;
    paused = false;
    score = 0;
    coins = 0;
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
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        const { data, error } = await window.supabaseClient
            .from('game_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data) {
            score = data.score || 0;
            coins = data.coins || 0;
            selectedShip = data.selected_ship || 'pulse';
            updateHUD();
            setActiveShipCard(selectedShip);
        } else {
            await window.supabaseClient.from('game_profiles').insert([{
                id: user.id,
                score: 0,
                coins: 0,
                selected_ship: 'pulse'
            }]);
        }
    } catch (err) {
        console.error("Error loading user data:", err);
    }
}

async function saveUserData() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        await window.supabaseClient
            .from('game_profiles')
            .upsert({
                id: user.id,
                score: score,
                coins: coins,
                selected_ship: selectedShip,
                updated_at: new Date()
            });
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

    // Draw Player Ship (renderers.js)
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
            m.vx += Math.cos(angle)
