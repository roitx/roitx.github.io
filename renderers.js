// ==========================================
// 🚀 PRO MAX GRAPHICS & VISUAL ENGINE 🚀
// ==========================================

// 1. DYNAMIC PLAYER SHIP RENDERER
function drawPlayerShip(ctx, player, shipTypes, selectedShip, trails) {
    const ship = shipTypes[selectedShip];
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;

    ctx.save();

    // Engine Exhaust Particles Generation
    if (Math.random() < 0.75) {
        trails.push({
            x: cx + (Math.random() - 0.5) * 14,
            y: player.y + player.h - 6,
            size: Math.random() * 6 + 3,
            color: player.isDashing ? "#06b6d4" : ship.color,
            alpha: 0.9
        });
    }

    // Shield Aura Effects
    if (player.shield) {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#38bdf8";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(cx, cy, player.w * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
        ctx.fill();
        ctx.restore();
    }

    // Glow Effect Engine Active
    ctx.shadowBlur = player.isDashing ? 28 : 16;
    ctx.shadowColor = player.isDashing ? "#06b6d4" : ship.color;

    if (selectedShip === "pulse") {
        // --- SHIP 1: PULSE (Sleek Speedster) ---
        ctx.fillStyle = ship.color;
        ctx.beginPath();
        ctx.moveTo(cx, player.y); // Nose
        ctx.lineTo(player.x + player.w, player.y + player.h); // Right Wing
        ctx.lineTo(cx, player.y + player.h - 12); // Engine Notch
        ctx.lineTo(player.x, player.y + player.h); // Left Wing
        ctx.closePath();
        ctx.fill();

        // Inner Cockpit Core
        ctx.fillStyle = ship.coreColor;
        ctx.beginPath();
        ctx.arc(cx, player.y + player.h * 0.45, 6, 0, Math.PI * 2);
        ctx.fill();

    } else if (selectedShip === "titan") {
        // --- SHIP 2: TITAN (Heavy Armored Warship) ---
        ctx.fillStyle = ship.color;
        // Main Body
        ctx.beginPath();
        ctx.moveTo(cx, player.y - 4);
        ctx.lineTo(player.x + player.w + 6, player.y + player.h * 0.6);
        ctx.lineTo(player.x + player.w - 8, player.y + player.h);
        ctx.lineTo(player.x + 8, player.y + player.h);
        ctx.lineTo(player.x - 6, player.y + player.h * 0.6);
        ctx.closePath();
        ctx.fill();

        // Armor Side Plates
        ctx.fillStyle = "#fb923c";
        ctx.fillRect(player.x - 4, player.y + 18, 8, 22);
        ctx.fillRect(player.x + player.w - 4, player.y + 18, 8, 22);

        // Cockpit Glass Glow
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(cx - 8, player.y + 14, 16, 12);

    } else if (selectedShip === "phantom") {
        // --- SHIP 3: PHANTOM (Cyber Dual-Wing Stealth) ---
        ctx.fillStyle = ship.color;
        // Forward Split Nose
        ctx.beginPath();
        ctx.moveTo(cx - 6, player.y);
        ctx.lineTo(cx - 16, player.y + 20);
        ctx.lineTo(player.x, player.y + player.h);
        ctx.lineTo(cx - 4, player.y + player.h - 8);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + 6, player.y);
        ctx.lineTo(cx + 16, player.y + 20);
        ctx.lineTo(player.x + player.w, player.y + player.h);
        ctx.lineTo(cx + 4, player.y + player.h - 8);
        ctx.closePath();
        ctx.fill();

        // Reactor Core
        ctx.fillStyle = "#f0abfc";
        ctx.beginPath();
        ctx.arc(cx, player.y + player.h * 0.6, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    // Engine Flames Glow Draw
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#f97316";
    ctx.fillStyle = "#ffdd00";
    ctx.beginPath();
    ctx.moveTo(cx - 8, player.y + player.h - 6);
    ctx.lineTo(cx, player.y + player.h + 12 + Math.random() * 8);
    ctx.lineTo(cx + 8, player.y + player.h - 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// 2. DYNAMIC ENEMY SHIPS RENDERER
function drawEnemy(ctx, e) {
    ctx.save();
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;

    ctx.shadowBlur = 12;
    ctx.shadowColor = "#f43f5e";

    // Alien Invader Geometry
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.moveTo(cx, e.y + e.h); // Nose points down
    ctx.lineTo(e.x + e.w, e.y);
    ctx.lineTo(cx, e.y + 10);
    ctx.lineTo(e.x, e.y);
    ctx.closePath();
    ctx.fill();

    // Alien Eye Glow
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(cx, e.y + e.h * 0.45, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// 3. BOSS MONSTER HIGH-DEF RENDERER
function drawMonster(ctx, monster) {
    ctx.save();
    const cx = monster.x + monster.w / 2;
    const cy = monster.y + monster.h / 2;

    // Glowing Pulse Energy
    ctx.shadowBlur = 25;
    ctx.shadowColor = monster.phase === 3 ? "#a855f7" : "#ef4444";

    // Base Frame
    ctx.fillStyle = monster.phase === 3 ? "#581c87" : "#991b1b";
    ctx.fillRect(monster.x, monster.y, monster.w, monster.h);

    // Cyber Metal Plates
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(monster.x + 10, monster.y + 10, monster.w - 20, monster.h - 20);

    // Glowing Core Reactor (Animates)
    const corePulse = Math.sin(monster.angle || 0) * 4;
    ctx.fillStyle = monster.phase === 3 ? "#e879f9" : "#f87171";
    ctx.beginPath();
    ctx.arc(cx, cy, 22 + corePulse, 0, Math.PI * 2);
    ctx.fill();

    // Canon Turrets
    ctx.fillStyle = "#facc15";
    ctx.fillRect(monster.x - 8, monster.y + monster.h - 15, 16, 22);
    ctx.fillRect(monster.x + monster.w - 8, monster.y + monster.h - 15, 16, 22);

    ctx.restore();
}
