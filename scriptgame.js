const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
window.addEventListener("resize", resize); resize();

// Elements
const scoreEl = document.getElementById("score"), livesEl = document.getElementById("lives"), levelEl = document.getElementById("level");
const startScreen = document.getElementById("start-screen"), gameOverScreen = document.getElementById("game-over");
const finalScore = document.getElementById("final-score"), monsterAlert = document.getElementById("monster-alert");
const toggleBtn = document.getElementById("toggleControl"), pauseBtn = document.getElementById("pauseBtn");

let game = false, paused = false, score = 0, lives = 3, level = 1;
let bullets = [], enemies = [], particles = [], stars = [], enemyBullets = [];
let controlMode = "buttons"; // "buttons" or "tilt"
let monsterActive = false, monster = null;

const player = { x: canvas.width / 2, y: canvas.height - 120, w: 45, h: 45, speed: 5, cooldown: 0 };
const keys = {};

// --- Controls Logic ---
window.onkeydown = e => keys[e.key] = true;
window.onkeyup = e => keys[e.key] = false;

document.getElementById("leftBtn").ontouchstart = () => keys["ArrowLeft"] = true;
document.getElementById("leftBtn").ontouchend = () => keys["ArrowLeft"] = false;
document.getElementById("rightBtn").ontouchstart = () => keys["ArrowRight"] = true;
document.getElementById("rightBtn").ontouchend = () => keys["ArrowRight"] = false;

// Mode Toggle
toggleBtn.onclick = () => {
    controlMode = controlMode === "buttons" ? "tilt" : "buttons";
    toggleBtn.innerText = controlMode === "buttons" ? "🕹️ Mode: Buttons" : "📱 Mode: Tilt";
    if (controlMode === "tilt") requestTiltPermission();
};

function requestTiltPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission();
    }
}

window.addEventListener("deviceorientation", (e) => {
    if (controlMode === "tilt" && game && !paused) {
        let tilt = e.gamma; // Left/Right tilt
        if (tilt > 5 && player.x + player.w < canvas.width) player.x += 4;
        if (tilt < -5 && player.x > 0) player.x -= 4;
    }
});

pauseBtn.onclick = () => {
    paused = !paused;
    pauseBtn.innerText = paused ? "▶️" : "⏸️";
    if (!paused) update();
};

// --- Game Logic ---
function spawnMonster() {
    monsterActive = true;
    monsterAlert.style.display = "block";
    setTimeout(() => monsterAlert.style.display = "none", 3000);
    monster = { x: canvas.width / 2 - 50, y: -100, w: 100, h: 80, hp: 20 + level * 5, speed: 1.5, dir: 1 };
}

function shoot() {
    if (player.cooldown > 0) return;
    bullets.push({ x: player.x + player.w / 2 - 3, y: player.y });
    player.cooldown = 20; // Auto-shoot timing (slow & steady)
}

function spawnEnemy() {
    if (monsterActive) return;
    const s = 30 + Math.random() * 20;
    enemies.push({ x: Math.random() * (canvas.width - s), y: -s, w: s, h: s, speed: 1.5 + level * 0.2 });
}

function explode(x, y, color) {
    for (let i = 0; i < 10; i++)
        particles.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, l: 25, c: color });
}

// --- Main Loop ---
function update() {
    if (!game || paused) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    stars.forEach(s => {
        s.y += 0.5; if (s.y > canvas.height) s.y = 0;
        ctx.fillRect(s.x, s.y, s.s, s.s);
    });

    // Player Movement
    if (controlMode === "buttons") {
        if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed;
        if (keys["ArrowRight"] && player.x + player.w < canvas.width) player.x += player.speed;
    }
    shoot(); // Auto-fire
    if (player.cooldown > 0) player.cooldown--;

    // Draw Player (Glow)
    ctx.shadowBlur = 15; ctx.shadowColor = "#3d5afe";
    ctx.fillStyle = "#fff";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.shadowBlur = 0;

    // Monster Logic
    if (monsterActive && monster) {
        monster.y < 80 ? monster.y += 1 : monster.x += monster.speed * monster.dir;
        if (monster.x + monster.w > canvas.width || monster.x < 0) monster.dir *= -1;

        // Monster Attack
        if (Math.random() < 0.03) enemyBullets.push({ x: monster.x + monster.w / 2, y: monster.y + monster.h, speed: 4 });

        ctx.fillStyle = "#ff1744";
        ctx.fillRect(monster.x, monster.y, monster.w, monster.h);
        
        // Monster Hit detection
        bullets.forEach((b, i) => {
            if (b.x < monster.x + monster.w && b.x + 6 > monster.x && b.y < monster.y + monster.h) {
                monster.hp--;
                bullets.splice(i, 1);
                explode(b.x, b.y, "red");
                if (monster.hp <= 0) {
                    score += 500; monsterActive = false; monster = null;
                }
            }
        });
    }

    // Bullets
    bullets.forEach((b, i) => {
        b.y -= 7;
        ctx.fillStyle = "#00e5ff";
        ctx.fillRect(b.x, b.y, 4, 12);
        if (b.y < 0) bullets.splice(i, 1);
    });

    // Enemy Bullets
    enemyBullets.forEach((eb, i) => {
        eb.y += eb.speed;
        ctx.fillStyle = "#ff5252";
        ctx.fillRect(eb.x, eb.y, 6, 12);
        if (eb.y > canvas.height) enemyBullets.splice(i, 1);
        // Hit Player
        if (eb.x < player.x + player.w && eb.x + 6 > player.x && eb.y < player.y + player.h) {
            enemyBullets.splice(i, 1); lives--; updateHUD();
        }
    });

    // Enemies
    if (Math.random() < 0.015) spawnEnemy();
    enemies.forEach((e, i) => {
        e.y += e.speed;
        ctx.fillStyle = "#7c4dff";
        ctx.fillRect(e.x, e.y, e.w, e.h);

        if (e.y > canvas.height) { enemies.splice(i, 1); lives--; updateHUD(); }
        
        // Collision
        bullets.forEach((b, j) => {
            if (b.x < e.x + e.w && b.x + 6 > e.x && b.y < e.y + e.h) {
                explode(e.x + e.w/2, e.y + e.h/2, "purple");
                enemies.splice(i, 1); bullets.splice(j, 1);
                score += 10; updateHUD();
                if (score > 0 && score % 1000 === 0 && !monsterActive) spawnMonster();
                if (score % 200 === 0) level++;
            }
        });
    });

    // Particles
    particles.forEach((p, i) => {
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, 3, 3);
        p.x += p.vx; p.y += p.vy; p.l--;
        if (p.l <= 0) particles.splice(i, 1);
    });

    if (lives <= 0) endGame();
    requestAnimationFrame(update);
}

function updateHUD() {
    scoreEl.textContent = "Score: " + score;
    livesEl.textContent = "❤️ " + lives;
    levelEl.textContent = "Lvl: " + level;
}

function startGame() {
    startScreen.classList.remove("show");
    gameOverScreen.classList.remove("show");
    score = 0; lives = 3; level = 1; monsterActive = false;
    bullets = []; enemies = []; enemyBullets = [];
    updateHUD();
    game = true; paused = false;
    update();
}

function endGame() {
    game = false;
    finalScore.textContent = "Final Score: " + score;
    gameOverScreen.classList.add("show");
}

for (let i = 0; i < 100; i++) stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, s: Math.random() * 2 });

startBtn.onclick = startGame;
restartBtn.onclick = startGame;
