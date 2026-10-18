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
    const time = Date.now() * 0.025;

    ctx.save();

    // High-Density Supersonic Afterburner Trails with Neon Glow
    if (Math.random() < 0.99) {
        trails.push({
            x: cx - 10 + Math.random() * 20,
            y: player.y + player.h + 2,
            size: Math.random() * 8 + 3,
            color: player.isDashing ? "#00ffff" : (Math.random() > 0.3 ? ship.color : "#fb923c"),
            alpha: 1.0
        });
    }

    // Active Hexagonal Energy Shield Matrix (Pulsing Shield)
    if (player.shield) {
        ctx.save();
        ctx.shadowBlur = 60;
        ctx.shadowColor = "#00ffff";
        let shieldPulse = Math.sin(time * 6) * 8;
        let sGrad = createSafeRadialGradient(ctx, cx, cy, player.w * 0.3, cx, cy, player.w * 1.0 + shieldPulse);
        sGrad.addColorStop(0, "rgba(0, 240, 255, 0.08)");
        sGrad.addColorStop(0.5, "rgba(0, 240, 255, 0.35)");
        sGrad.addColorStop(0.85, "rgba(56, 189, 248, 0.9)");
        sGrad.addColorStop(1, "rgba(255, 255, 255, 1)");

        ctx.fillStyle = sGrad;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, player.w * 0.9 + shieldPulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rotating Hex Grid ring inside shield
        ctx.strokeStyle = "rgba(0, 240, 255, 0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, player.w * 0.7 + Math.sin(time*4)*4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Photorealistic Supersonic Fighter Fuselage (Multi-layered Metallic Gradient)
    ctx.shadowBlur = player.isDashing ? 70 : 40;
    ctx.shadowColor = player.isDashing ? "#00ffff" : ship.color;

    let jetGrad = createSafeLinearGradient(ctx, player.x, player.y, player.x + player.w, player.y + player.h);
    jetGrad.addColorStop(0, "#ffffff");
    jetGrad.addColorStop(0.25, ship.color);
    jetGrad.addColorStop(0.65, "#0f172a");
    jetGrad.addColorStop(1, "#020617");

    ctx.fillStyle = jetGrad;
    ctx.beginPath();
    ctx.moveTo(cx, player.y - 24); // Sharp Supersonic Nose Cone
    ctx.lineTo(player.x + player.w + 18, player.y + player.h - 4); // Swept Right Wing
    ctx.lineTo(cx + 12, player.y + player.h); // Right Nozzle
    ctx.lineTo(cx - 12, player.y + player.h); // Left Nozzle
    ctx.lineTo(player.x - 18, player.y + player.h - 4); // Swept Left Wing
    ctx.closePath();
    ctx.fill();

    // Intense Dual Plasma Afterburner Plumes
    let flameGrad = createSafeLinearGradient(ctx, cx, player.y + player.h, cx, player.y + player.h + 22);
    flameGrad.addColorStop(0, "#ffffff");
    flameGrad.addColorStop(0.3, "#38bdf8");
    flameGrad.addColorStop(1, "transparent");
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 10, player.y + player.h);
    ctx.lineTo(cx, player.y + player.h + 20 + Math.random() * 8);
    ctx.lineTo(cx + 10, player.y + player.h);
    ctx.closePath();
    ctx.fill();

    // Armored Cockpit Canopy (Holographic Sapphire Glass)
    let canopyGrad = createSafeLinearGradient(ctx, cx - 6, player.y + 12, cx + 6, player.y + 32);
    canopyGrad.addColorStop(0, "#38bdf8");
    canopyGrad.addColorStop(0.5, "#0284c7");
    canopyGrad.addColorStop(1, "#020617");
    ctx.fillStyle = canopyGrad;
    ctx.beginPath();
    ctx.ellipse(cx, player.y + 20, 6, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    drawSpecularHighlight(ctx, cx - 1, player.y + 17, 3.5, "rgba(255, 255, 255, 0.95)");

    // High-Frequency Blinking Wingtip Lights
    ctx.fillStyle = Math.sin(time * 10) > 0 ? "#ef4444" : "#22c55e";
    ctx.beginPath();
    ctx.arc(player.x - 16, player.y + player.h - 6, 3, 0, Math.PI * 2);
    ctx.arc(player.x + player.w + 16, player.y + player.h - 6, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawEnemy(ctx, e) {
    ctx.save();
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;

    ctx.shadowBlur = 40;
    ctx.shadowColor = "#f43f5e";

    let enemyGrad = createSafeLinearGradient(ctx, e.x, e.y, e.x + e.w, e.y + e.h);
    enemyGrad.addColorStop(0, "#ffe4e6");
    enemyGrad.addColorStop(0.35, "#e11d48");
    enemyGrad.addColorStop(1, "#090103");

    ctx.fillStyle = enemyGrad;
    ctx.beginPath();
    ctx.moveTo(cx, e.y + e.h + 16);
    ctx.lineTo(e.x + e.w + 16, e.y);
    ctx.lineTo(cx, e.y - 8);
    ctx.lineTo(e.x - 16, e.y);
    ctx.closePath();
    ctx.fill();

    // Crimson Target Sensor
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 25;
    ctx.shadowColor = "#ff0000";
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawMonster(ctx, monster) {
    ctx.save();
    const cx = monster.x + monster.w / 2;
    const cy = monster.y + monster.h / 2;
    const pulse = Math.sin(Date.now() * 0.018) * 14;

    ctx.shadowBlur = 80;
    ctx.shadowColor = monster.phase === 3 ? "#e879f9" : "#ef4444";

    let bossGrad = createSafeLinearGradient(ctx, monster.x, monster.y, monster.x + monster.w, monster.y + monster.h);
    bossGrad.addColorStop(0, "#fca5a5");
    bossGrad.addColorStop(0.4, "#991b1b");
    bossGrad.addColorStop(1, "#020617");

    ctx.fillStyle = bossGrad;
    ctx.beginPath();
    ctx.roundRect(monster.x - pulse / 2, monster.y, monster.w + pulse, monster.h, 34);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 5;
    ctx.stroke();

    // Twin Plasma Cannons
    ctx.fillStyle = "#38bdf8";
    ctx.shadowBlur = 35;
    ctx.shadowColor = "#38bdf8";
    ctx.beginPath();
    ctx.arc(cx - 38, cy - 12, 12, 0, Math.PI * 2);
    ctx.arc(cx + 38, cy - 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing Antimatter Core
    drawSpecularHighlight(ctx, cx, cy + 12, 30, "rgba(239, 68, 68, 0.85)");

    ctx.restore();
}

function drawAsteroid(ctx, ast) {
    ctx.save();
    const cx = ast.x + ast.w / 2;
    const cy = ast.y + ast.h / 2;

    let rockGrad = createSafeRadialGradient(ctx, cx - ast.w * 0.3, cy - ast.h * 0.3, 2, cx, cy, ast.w * 0.65);
    rockGrad.addColorStop(0, "#e2e8f0");
    rockGrad.addColorStop(0.5, "#475569");
    rockGrad.addColorStop(1, "#020617");

    ctx.shadowBlur = 20;
    ctx.shadowColor = "rgba(0, 0, 0, 0.95)";

    ctx.fillStyle = rockGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, ast.w / 2, 0, Math.PI * 2);
    ctx.fill();

    // Craters
    ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
    ctx.beginPath();
    ctx.arc(cx - ast.w * 0.18, cy + ast.w * 0.15, ast.w * 0.16, 0, Math.PI * 2);
    ctx.arc(cx + ast.w * 0.22, cy - ast.w * 0.12, ast.w * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Mineral Vein
    ctx.fillStyle = "#38bdf8";
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#38bdf8";
    ctx.beginPath();
    ctx.ellipse(cx + ast.w * 0.1, cy + ast.w * 0.05, ast.w * 0.07, ast.w * 0.035, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawPowerup(ctx, p) {
    ctx.save();
    const pw = p.w || p.size || 34;
    const ph = p.h || p.size || 34;
    const cx = p.x + pw / 2;
    const cy = p.y + ph / 2;

    let pColor = p.type === "shield" ? "#38bdf8" : p.type === "health" ? "#22c55e" : "#facc15";
    ctx.shadowBlur = 45;
    ctx.shadowColor = pColor;

    let pGrad = createSafeRadialGradient(ctx, cx, cy, 2, cx, cy, pw);
    pGrad.addColorStop(0, "#ffffff");
    pGrad.addColorStop(0.45, pColor);
    pGrad.addColorStop(1, "#020617");

    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, pw, ph, 16);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let symbol = p.type === "shield" ? "🛡" : p.type === "health" ? "✚" : "⚡";
    ctx.fillText(symbol, cx, cy);

    ctx.restore();
}

function drawLaser(ctx, laser) {
    ctx.save();
    ctx.shadowBlur = 35;
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
    ctx.shadowBlur = 35;
    ctx.shadowColor = block.color || "#38bdf8";

    let blockGrad = createSafeLinearGradient(ctx, block.x, block.y, block.x + block.w, block.y + block.h);
    blockGrad.addColorStop(0, "#38bdf8");
    blockGrad.addColorStop(0.4, "#0284c7");
    blockGrad.addColorStop(1, "#0f172a");

    ctx.fillStyle = blockGrad;
    ctx.strokeStyle = isCorrectSelected ? "#22c55e" : "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = isCorrectSelected ? 6 : 3.5;

    ctx.beginPath();
    ctx.roundRect(block.x, block.y, block.w, block.h, 20);
    ctx.fill();
    ctx.stroke();

    drawSpecularHighlight(ctx, block.x + 28, block.y + 14, 22, "rgba(255, 255, 255, 0.4)");

    ctx.restore();
}
