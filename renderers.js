// ==========================================
// 🌟 NEXT-GEN CINEMATIC AAA CANVAS RENDER ENGINE 🌟
// ==========================================

function createSafeLinearGradient(ctx, x1, y1, x2, y2) {
    return ctx.createLinearGradient(
        isFinite(x1) ? x1 : 0, 
        isFinite(y1) ? y1 : 0, 
        isFinite(x2) ? x2 : 10, 
        isFinite(y2) ? y2 : 10
    );
}

function createSafeRadialGradient(ctx, x1, y1, r1, x2, y2, r2) {
    return ctx.createRadialGradient(
        isFinite(x1) ? x1 : 0, isFinite(y1) ? y1 : 0, isFinite(r1) ? r1 : 1,
        isFinite(x2) ? x2 : 0, isFinite(y2) ? y2 : 0, isFinite(r2) ? r2 : 10
    );
}

function drawSpecularHighlight(ctx, x, y, radius, color) {
    let spec = createSafeRadialGradient(ctx, x, y, 0, x, y, radius);
    spec.addColorStop(0, "rgba(255, 255, 255, 1)");
    spec.addColorStop(0.4, color || "rgba(255, 255, 255, 0.85)");
    spec.addColorStop(1, "transparent");
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawPlayerShip(ctx, player, shipTypes, selectedShip, trails) {
    const ship = shipTypes[selectedShip] || { color: "#38bdf8", accent: "#00ffff" };
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const time = Date.now() * 0.02;

    ctx.save();

    // High-Density Supersonic Afterburner Trails
    if (Math.random() < 0.99) {
        trails.push({
            x: cx - 8 + Math.random() * 16,
            y: player.y + player.h + 2,
            size: Math.random() * 7 + 3,
            color: player.isDashing ? "#00ffff" : (Math.random() > 0.3 ? "#38bdf8" : "#fb923c"),
            alpha: 1.0
        });
    }

    // Active Hexagonal Energy Shield Matrix
    if (player.shield) {
        ctx.save();
        ctx.shadowBlur = 50;
        ctx.shadowColor = "#00ffff";
        let shieldPulse = Math.sin(time * 5) * 6;
        let sGrad = createSafeRadialGradient(ctx, cx, cy, player.w * 0.3, cx, cy, player.w * 0.95 + shieldPulse);
        sGrad.addColorStop(0, "rgba(0, 240, 255, 0.05)");
        sGrad.addColorStop(0.5, "rgba(0, 240, 255, 0.3)");
        sGrad.addColorStop(0.85, "rgba(56, 189, 248, 0.85)");
        sGrad.addColorStop(1, "rgba(255, 255, 255, 1)");

        ctx.fillStyle = sGrad;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(cx, cy, player.w * 0.85 + shieldPulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Hexagonal grid ring overlay inside shield
        ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, player.w * 0.65 + Math.sin(time*3)*3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Photorealistic Supersonic Fighter Fuselage
    ctx.shadowBlur = player.isDashing ? 60 : 35;
    ctx.shadowColor = player.isDashing ? "#00ffff" : ship.color;

    let jetGrad = createSafeLinearGradient(ctx, player.x, player.y, player.x + player.w, player.y + player.h);
    jetGrad.addColorStop(0, "#ffffff");
    jetGrad.addColorStop(0.2, ship.color);
    jetGrad.addColorStop(0.6, "#1e293b");
    jetGrad.addColorStop(1, "#020617");

    ctx.fillStyle = jetGrad;
    ctx.beginPath();
    ctx.moveTo(cx, player.y - 20); // Needle-sharp supersonic nose cone
    ctx.lineTo(player.x + player.w + 16, player.y + player.h - 6); // Swept right wing tip
    ctx.lineTo(cx + 10, player.y + player.h); // Right afterburner nozzle
    ctx.lineTo(cx - 10, player.y + player.h); // Left afterburner nozzle
    ctx.lineTo(player.x - 16, player.y + player.h - 6); // Swept left wing tip
    ctx.closePath();
    ctx.fill();

    // Dynamic Afterburner Flame Plumes
    let flameGrad = createSafeLinearGradient(ctx, cx, player.y + player.h, cx, player.y + player.h + 18);
    flameGrad.addColorStop(0, "#ffffff");
    flameGrad.addColorStop(0.4, "#38bdf8");
    flameGrad.addColorStop(1, "transparent");
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 8, player.y + player.h);
    ctx.lineTo(cx, player.y + player.h + 16 + Math.random() * 6);
    ctx.lineTo(cx + 8, player.y + player.h);
    ctx.closePath();
    ctx.fill();

    // Carbon-fiber panel lines
    ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, player.y - 12);
    ctx.lineTo(cx, player.y + player.h - 8);
    ctx.stroke();

    // Armored Cockpit Canopy (Deep Sapphire Glass)
    let canopyGrad = createSafeLinearGradient(ctx, cx - 5, player.y + 10, cx + 5, player.y + 28);
    canopyGrad.addColorStop(0, "#7dd3fc");
    canopyGrad.addColorStop(0.5, "#0284c7");
    canopyGrad.addColorStop(1, "#020617");
    ctx.fillStyle = canopyGrad;
    ctx.beginPath();
    ctx.ellipse(cx, player.y + 18, 5, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    drawSpecularHighlight(ctx, cx - 1, player.y + 15, 3, "rgba(255, 255, 255, 0.95)");

    // Blinking Wingtip Navigation Lights (Red/Green)
    ctx.fillStyle = Math.sin(time * 8) > 0 ? "#ef4444" : "#22c55e";
    ctx.beginPath();
    ctx.arc(player.x - 14, player.y + player.h - 8, 2.5, 0, Math.PI * 2);
    ctx.arc(player.x + player.w + 14, player.y + player.h - 8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawEnemy(ctx, e) {
    ctx.save();
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;

    ctx.shadowBlur = 35;
    ctx.shadowColor = "#f43f5e";

    let enemyGrad = createSafeLinearGradient(ctx, e.x, e.y, e.x + e.w, e.y + e.h);
    enemyGrad.addColorStop(0, "#fecdd3");
    enemyGrad.addColorStop(0.3, "#e11d48");
    enemyGrad.addColorStop(1, "#180206");

    ctx.fillStyle = enemyGrad;
    ctx.beginPath();
    ctx.moveTo(cx, e.y + e.h + 14);
    ctx.lineTo(e.x + e.w + 14, e.y + 2);
    ctx.lineTo(cx, e.y - 6);
    ctx.lineTo(e.x - 14, e.y + 2);
    ctx.closePath();
    ctx.fill();

    // High-Intensity Crimson Target Sensor
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ff0000";
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawMonster(ctx, monster) {
    ctx.save();
    const cx = monster.x + monster.w / 2;
    const cy = monster.y + monster.h / 2;
    const pulse = Math.sin(Date.now() * 0.015) * 12;

    ctx.shadowBlur = 70;
    ctx.shadowColor = monster.phase === 3 ? "#e879f9" : "#ef4444";

    // Dreadnought Capital Warship Hull
    let bossGrad = createSafeLinearGradient(ctx, monster.x, monster.y, monster.x + monster.w, monster.y + monster.h);
    bossGrad.addColorStop(0, "#f87171");
    bossGrad.addColorStop(0.4, "#991b1b");
    bossGrad.addColorStop(1, "#020617");

    ctx.fillStyle = bossGrad;
    ctx.beginPath();
    ctx.roundRect(monster.x - pulse / 2, monster.y, monster.w + pulse, monster.h, 30);
    ctx.fill();

    // Armored Steel Bevels and Panel Grooves
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 4.5;
    ctx.stroke();

    // Twin Heavy Plasma Turrets
    ctx.fillStyle = "#38bdf8";
    ctx.shadowBlur = 30;
    ctx.shadowColor = "#38bdf8";
    ctx.beginPath();
    ctx.arc(cx - 32, cy - 12, 10, 0, Math.PI * 2);
    ctx.arc(cx + 32, cy - 12, 10, 0, Math.PI * 2);
    ctx.fill();

    // Central Pulsing Antimatter Core
    drawSpecularHighlight(ctx, cx, cy + 12, 26, "rgba(239, 68, 68, 0.8)");

    ctx.restore();
}

function drawAsteroid(ctx, ast) {
    ctx.save();
    const cx = ast.x + ast.w / 2;
    const cy = ast.y + ast.h / 2;

    let rockGrad = createSafeRadialGradient(ctx, cx - ast.w * 0.3, cy - ast.h * 0.3, 2, cx, cy, ast.w * 0.65);
    rockGrad.addColorStop(0, "#cbd5e1");
    rockGrad.addColorStop(0.5, "#475569");
    rockGrad.addColorStop(1, "#020617");

    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(0, 0, 0, 0.95)";

    ctx.fillStyle = rockGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, ast.w / 2, 0, Math.PI * 2);
    ctx.fill();

    // Deep Impact Craters with shadows
    ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
    ctx.beginPath();
    ctx.arc(cx - ast.w * 0.18, cy + ast.w * 0.15, ast.w * 0.15, 0, Math.PI * 2);
    ctx.arc(cx + ast.w * 0.22, cy - ast.w * 0.12, ast.w * 0.11, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Alien Mineral / Crystal Vein embedded in rock
    ctx.fillStyle = "#38bdf8";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#38bdf8";
    ctx.beginPath();
    ctx.ellipse(cx + ast.w * 0.1, cy + ast.w * 0.05, ast.w * 0.06, ast.w * 0.03, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawPowerup(ctx, p) {
    ctx.save();
    const pw = p.w || p.size || 32;
    const ph = p.h || p.size || 32;
    const cx = p.x + pw / 2;
    const cy = p.y + ph / 2;

    let pColor = p.type === "shield" ? "#38bdf8" : p.type === "health" ? "#22c55e" : "#facc15";
    ctx.shadowBlur = 40;
    ctx.shadowColor = pColor;

    let pGrad = createSafeRadialGradient(ctx, cx, cy, 2, cx, cy, pw);
    pGrad.addColorStop(0, "#ffffff");
    pGrad.addColorStop(0.45, pColor);
    pGrad.addColorStop(1, "#020617");

    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, pw, ph, 14);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let symbol = p.type === "shield" ? "🛡" : p.type === "health" ? "✚" : "⚡";
    ctx.fillText(symbol, cx, cy);

    ctx.restore();
}

function drawLaser(ctx, laser) {
    ctx.save();
    ctx.shadowBlur = 30;
    ctx.shadowColor = laser.isEnemy ? "#ef4444" : "#00ffff";

    let beamGrad = createSafeLinearGradient(ctx, laser.x, laser.y, laser.x, laser.y + laser.h);
    beamGrad.addColorStop(0, "#ffffff");
    beamGrad.addColorStop(0.5, laser.isEnemy ? "#f87171" : "#38bdf8");
    beamGrad.addColorStop(1, laser.isEnemy ? "#dc2626" : "#0284c7");

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.roundRect(laser.x, laser.y, laser.w, laser.h, 6);
    ctx.fill();
    ctx.restore();
}

function drawStudyBlock(ctx, block, isCorrectSelected) {
    ctx.save();
    ctx.shadowBlur = 32;
    ctx.shadowColor = block.color || "#38bdf8";

    let blockGrad = createSafeLinearGradient(ctx, block.x, block.y, block.x + block.w, block.y + block.h);
    blockGrad.addColorStop(0, "#38bdf8");
    blockGrad.addColorStop(0.4, "#0284c7");
    blockGrad.addColorStop(1, "#0f172a");

    ctx.fillStyle = blockGrad;
    ctx.strokeStyle = isCorrectSelected ? "#22c55e" : "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = isCorrectSelected ? 5 : 3;

    ctx.beginPath();
    ctx.roundRect(block.x, block.y, block.w, block.h, 18);
    ctx.fill();
    ctx.stroke();

    drawSpecularHighlight(ctx, block.x + 26, block.y + 14, 20, "rgba(255, 255, 255, 0.35)");

    ctx.restore();
}
