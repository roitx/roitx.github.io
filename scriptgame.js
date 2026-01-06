const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
window.addEventListener("resize", resize); resize();

// Elements
const scoreEl = document.getElementById("score"), livesEl = document.getElementById("lives"), levelEl = document.getElementById("level");
const startScreen = document.getElementById("start-screen"), gameOverScreen = document.getElementById("game-over");
const finalScore = document.getElementById("final-score"), monsterAlert = document.getElementById("monster-alert");
const toggleBtn = document.getElementById("toggleControl"), pauseBtn = document.getElementById("pauseBtn");

let game = false, paused = false, score = 0, lives = 10, level = 1;
let bullets = [], enemies = [], particles = [], stars = [], enemyBullets = [];
let controlMode = "buttons"; 
let monsterActive = false, monster = null;

const player = { x: canvas.width / 2, y: canvas.height - 120, w: 45, h: 45, speed: 7, cooldown: 0 };
const keys = {};

// Controls
window.onkeydown = e => keys[e.key] = true;
window.onkeyup = e => keys[e.key] = false;

document.getElementById("leftBtn").ontouchstart = () => keys["ArrowLeft"] = true;
document.getElementById("leftBtn").ontouchend = () => keys["ArrowLeft"] = false;
document.getElementById("rightBtn").ontouchstart = () => keys["ArrowRight"] = true;
document.getElementById("rightBtn").ontouchend = () => keys["ArrowRight"] = false;

toggleBtn.onclick = () => {
    controlMode = controlMode === "buttons" ? "tilt" : "buttons";
    toggleBtn.innerText = controlMode === "buttons" ? "🕹️ Mode: Buttons" : "📱 Mode: Tilt";
};

window.addEventListener("deviceorientation", (e) => {
    if (controlMode === "tilt" && game && !paused) {
        let tilt = e.gamma; 
        if (tilt > 5 && player.x + player.w < canvas.width) player.x += 7;
        if (tilt < -5 && player.x > 0) player.x -= 7;
    }
});

pauseBtn.onclick = () => {
    paused = !paused;
    pauseBtn.innerText = paused ? "▶️" : "⏸️";
    if (!paused) update();
};

function spawnMonster() {
    monsterActive = true;
    monsterAlert.style.display = "block";
    setTimeout(() => { monsterAlert.style.display = "none"; }, 3000);
    // Monster health level ke hisaab se badhegi
    const maxHp = 20 + (level * 10);
    monster = { x: canvas.width / 2 - 60, y: -120, w: 120, h: 90, hp: maxHp, maxHp: maxHp, speed: 2.5, dir: 1 };
}

function shoot() {
    if (player.cooldown > 0) return;
    bullets.push({ x: player.x + player.w / 2 - 2, y: player.y });
    player.cooldown = 12; // Auto-shoot speed
}

function spawnEnemy() {
    if (monsterActive) return; 
    const s = 35;
    enemies.push({ x: Math.random() * (canvas.width - s), y: -s, w: s, h: s, speed: 2 + level * 0.4 });
}

function explode(x, y, color, count = 12) {
    for (let i = 0; i < count; i++)
        particles.push({ 
            x, y, 
            vx: (Math.random() - 0.5) * 8, 
            vy: (Math.random() - 0.5) * 8, 
            l: Math.random() * 30 + 10, 
            c: color,
            s: Math.random() * 4 + 1
        });
}

function update() {
    if (!game || paused) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Stars
    ctx.fillStyle = "white";
    stars.forEach(s => {
        s.y += 1.5; if (s.y > canvas.height) s.y = 0;
        ctx.fillRect(s.x, s.y, s.s, s.s);
    });

    // Player Movement
    if (controlMode === "buttons") {
        if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed;
        if (keys["ArrowRight"] && player.x + player.w < canvas.width) player.x += player.speed;
    }
    shoot();
    if (player.cooldown > 0) player.cooldown--;

    // Draw Player
    ctx.shadowBlur = 15; ctx.shadowColor = "cyan";
    ctx.fillStyle = "white";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.shadowBlur = 0;

    // --- Boss Monster Logic ---
    if (monsterActive && monster) {
        if (monster.y < 80) monster.y += 2;
        else {
            monster.x += monster.speed * monster.dir;
            if (monster.x + monster.w > canvas.width || monster.x < 0) monster.dir *= -1;
            if (Math.random() < 0.05) enemyBullets.push({ x: monster.x + monster.w/2, y: monster.y + monster.h, speed: 5 + level });
        }

        // Draw Boss
        ctx.fillStyle = "#ff1744";
        ctx.shadowBlur = 20; ctx.shadowColor = "red";
        ctx.fillRect(monster.x, monster.y, monster.w, monster.h);
        ctx.shadowBlur = 0;

        // Health Bar above monster
        ctx.fillStyle = "#444";
        ctx.fillRect(monster.x, monster.y - 20, monster.w, 10);
        ctx.fillStyle = "#00ff00";
        let healthW = (monster.hp / monster.maxHp) * monster.w;
        ctx.fillRect(monster.x, monster.y - 20, healthW, 10);

        // Bullets hitting Boss
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            if (b.x > monster.x && b.x < monster.x + monster.w && b.y < monster.y + monster.h && b.y > monster.y) {
                monster.hp--;
                explode(b.x, b.y, "red", 5);
                bullets.splice(i, 1);
                
                if (monster.hp <= 0) {
                    score += 150;
                    lives += 5; // Reward
                    explode(monster.x + monster.w/2, monster.y + monster.h/2, "orange", 40);
                    monsterActive = false;
                    monster = null;
                    updateHUD();
                }
            }
        }
    }

    // Player Bullets
    bullets.forEach((b, i) => {
        b.y -= 12;
        ctx.fillStyle = "yellow";
        ctx.fillRect(b.x, b.y, 4, 15);
        if (b.y < -20) bullets.splice(i, 1);
    });

    // Enemy Bullets logic
    enemyBullets.forEach((eb, i) => {
        eb.y += eb.speed;
        ctx.fillStyle = "#ff5252";
        ctx.fillRect(eb.x, eb.y, 8, 15);
        if (eb.y > canvas.height) enemyBullets.splice(i, 1);
        if (eb.x < player.x + player.w && eb.x + 8 > player.x && eb.y < player.y + player.h && eb.y + 15 > player.y) {
            enemyBullets.splice(i, 1); lives--; 
            explode(player.x + player.w/2, player.y, "white", 10);
            updateHUD();
        }
    });

    // Regular Enemies Logic
    if (!monsterActive && Math.random() < 0.02) spawnEnemy();
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        e.y += e.speed;
        ctx.fillStyle = "#9b7cff";
        ctx.fillRect(e.x, e.y, e.w, e.h);

        if (e.y > canvas.height) { enemies.splice(i, 1); lives--; updateHUD(); }

        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            if (b.x < e.x + e.w && b.x + 4 > e.x && b.y < e.y + e.h && b.y + 15 > e.y) {
                explode(e.x + e.w/2, e.y + e.h/2, "#9b7cff");
                enemies.splice(i, 1); 
                bullets.splice(j, 1);
                score += 10; 
                updateHUD();
                if (score > 0 && score % 250 === 0) spawnMonster();
                if (score % 400 === 0) level++;
            }
        }
        
        if (e.x < player.x + player.w && e.x + e.w > player.x && e.y < player.y + player.h && e.y + e.h > player.y) {
            enemies.splice(i, 1); lives--; 
            explode(player.x + player.w/2, player.y, "white", 15);
            updateHUD();
        }
    }

    // Particles logic (Explosions)
    particles.forEach((p, i) => {
        ctx.globalAlpha = p.l / 40;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.s, p.s);
        p.x += p.vx; p.y += p.vy; p.l--;
        if (p.l <= 0) particles.splice(i, 1);
    });
    ctx.globalAlpha = 1.0;

    if (lives <= 0) endGame();
    else requestAnimationFrame(update);
}

function updateHUD() {
    scoreEl.textContent = "Score: " + score;
    livesEl.textContent = "❤️ " + lives;
    levelEl.textContent = "Lvl: " + level;
}

function startGame() {
    startScreen.classList.remove("show");
    gameOverScreen.classList.remove("show");
    score = 0; lives = 10; level = 1; 
    monsterActive = false; monster = null;
    bullets = []; enemies = []; enemyBullets = []; particles = [];
    updateHUD();
    game = true; paused = false;
    update();
}

function endGame() {
    game = false;
    finalScore.textContent = "Final Score: " + score;
    gameOverScreen.classList.add("show");
}

for (let i = 0; i < 80; i++) stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, s: Math.random() * 2 });

document.getElementById("startBtn").onclick = startGame;
document.getElementById("restartBtn").onclick = startGame;
