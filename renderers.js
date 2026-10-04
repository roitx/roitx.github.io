// ==========================================
// 🚀 AAA ULTRA-REALISTIC CANVAS RENDER ENGINE 🚀
// ==========================================

// Helper: Metallic Specular Shading
function drawSpecularHighlight(ctx, x, y, radius, color) {
    let spec = ctx.createRadialGradient(x, y, 0, x, y, radius);
    spec.addColorStop(0, "rgba(255, 255, 255, 0.85)");
    spec.addColorStop(0.3, color || "rgba(255, 255, 255, 0.3)");
    spec.addColorStop(1, "transparent");
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

// Helper: Carbon Fiber Texture Pattern Simulation
function applyHullPanels(ctx, x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 6) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i, y + h);
        ctx.stroke();
    }
    ctx.restore();
}

// 1. ULTRA-REALISTIC PLAYER SHIPS RENDERER
function drawPlayerShip(ctx, player, shipTypes, selectedShip, trails) {
    const ship = shipTypes[selectedShip];
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const now = Date.now() * 0.005;

    ctx.save();

    // Thruster Particle Generation with Mach Diamond plume
    if (Math.random() < 0.9) {
        trails.push({
            x: cx + (Math.random() - 0.5) * 14,
            y: player.y + player.h + 2,
            size: Math.random() * 8 + 4,
            color: player.isDashing ? "#00f0ff" : ship.color,
            alpha: 1.0
        });
    }

    // Realistic Multi-Layer Force Shield
    if (player.shield) {
        ctx.save();
        ctx.shadowBlur = 30;
        ctx.shadowColor = "#00f0ff";
        
        let shieldPulse = Math.sin(now * 3) * 3;
        let sGrad = ctx.createRadialGradient(cx, cy, player.w * 0.2, cx, cy, player.w * 0.8 + shieldPulse);
        sGrad.addColorStop(0, "rgba(0, 240, 255, 0.02)");
        sGrad.addColorStop(0.6, "rgba(0, 240, 255, 0.15)");
        sGrad.addColorStop(0.9, "rgba(56, 189, 248, 0.6)");
        sGrad.addColorStop(1, "rgba(255, 255, 255, 0.9)");

        ctx.fillStyle = sGrad;
        ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, player.w * 0.78 + shieldPulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Hexagon/Energy Grid lines on shield
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, player.w * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Engine Ambient Bloom Shading
    ctx.shadowBlur = player.isDashing ? 35 : 22;
    ctx.shadowColor = player.isDashing ? "#00f0ff" : ship.color;

    if (selectedShip === "pulse") {
        // --- PULSE: INTERCEPTOR (Chiseled Aero Metal Body) ---
        let hullGrad = ctx.createLinearGradient(player.x, player.y, player.x + player.w, player.y + player.h);
        hullGrad.addColorStop(0, "#0369a1");
        hullGrad.addColorStop(0.3, "#38bdf8");
        hullGrad.addColorStop(0.7, "#0284c7");
        hullGrad.addColorStop(1, "#0f172a");

        ctx.fillStyle = hullGrad;
        ctx.beginPath();
        ctx.moveTo(cx, player.y - 2); // Nose tip
        ctx.lineTo(player.x + player.w + 2, player.y + player.h - 6);
        ctx.lineTo(cx + 12, player.y + player.h - 12);
        ctx.lineTo(cx, player.y + player.h - 18); // Center Engine Cavity
        ctx.lineTo(cx - 12, player.y + player.h - 12);
        ctx.lineTo(player.x - 2, player.y + player.h - 6);
        ctx.closePath();
        ctx.fill();

        // Carbon Texture Line Overlays
        applyHullPanels(ctx, player.x + 8, player.y + 15, player.w - 16, player.h - 25);

        // Chrome Edge Bevel Speculars
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx, player.y - 2);
        ctx.lineTo(player.x + 4, player.y + player.h - 10);
        ctx.moveTo(cx, player.y - 2);
        ctx.lineTo(player.x + player.w - 4, player.y + player.h - 10);
        ctx.stroke();

        // Glassy Cockpit Canopy with 3D Depth
        let glassGrad = ctx.createLinearGradient(cx, player.y + 14, cx, player.y + 32);
        glassGrad.addColorStop(0, "#ffffff");
        glassGrad.addColorStop(0.2, "#7dd3fc");
        glassGrad.addColorStop(0.8, "#0284c7");
        glassGrad.addColorStop(1, "#075985");

        ctx.fillStyle = glassGrad;
        ctx.beginPath();
        ctx.ellipse(cx, player.y + 22, 6, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Specular Glint on Cockpit Glass
        drawSpecularHighlight(ctx, cx - 2, player.y + 17, 3, "#ffffff");

        // Wingtip Strobes (Blinking Navigation Lights)
        let strobeColor = Math.sin(now * 10) > 0 ? "#ef4444" : "#22c55e";
        drawSpecularHighlight(ctx, player.x - 2, player.y + player.h - 8, 4, strobeColor);
        drawSpecularHighlight(ctx, player.x + player.w + 2, player.y + player.h - 8, 4, strobeColor);

    } else if (selectedShip === "titan") {
        // --- TITAN: HEAVY ARMOR WARSHIP ---
        let mainBody = ctx.createLinearGradient(player.x - 8, player.y, player.x + player.w + 8, player.y + player.h);
        mainBody.addColorStop(0, "#9a3412");
        mainBody.addColorStop(0.4, "#f97316");
        mainBody.addColorStop(0.8, "#ea580c");
        mainBody.addColorStop(1, "#431407");

        ctx.fillStyle = mainBody;
        ctx.beginPath();
        ctx.moveTo(cx, player.y - 4);
        ctx.lineTo(player.x + player.w + 8, player.y + 18);
        ctx.lineTo(player.x + player.w - 2, player.y + player.h + 2);
        ctx.lineTo(player.x + 2, player.y + player.h + 2);
        ctx.lineTo(player.x - 8, player.y + 18);
        ctx.closePath();
        ctx.fill();

        // Heavy Reinforced Composite Plates
        ctx.fillStyle = "#334155";
        ctx.fillRect(player.x - 8, player.y + 18, 10, 28);
        ctx.fillRect(player.x + player.w - 2, player.y + 18, 10, 28);

        // Armor Plate Rivets Detail
        ctx.fillStyle = "#cbd5e1";
        [player.y + 22, player.y + 32, player.y + 40].forEach(ry => {
            ctx.beginPath(); ctx.arc(player.x - 3, ry, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(player.x + player.w + 3, ry, 1.5, 0, Math.PI * 2); ctx.fill();
        });

        // Reactor Core Shimmer Window
        let coreGlow = ctx.createRadialGradient(cx, player.y + 24, 1, cx, player.y + 24, 12);
        coreGlow.addColorStop(0, "#ffffff");
        coreGlow.addColorStop(0.5, "#facc15");
        coreGlow.addColorStop(1, "#b45309");

        ctx.fillStyle = coreGlow;
        ctx.fillRect(cx - 8, player.y + 18, 16, 14);
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 8, player.y + 18, 16, 14);

    } else if (selectedShip === "phantom") {
        // --- PHANTOM: DUAL BLADE CYBER STEALTH ---
        let stealthGrad = ctx.createLinearGradient(player.x, player.y, player.x + player.w, player.y + player.h);
        stealthGrad.addColorStop(0, "#581c87");
        stealthGrad.addColorStop(0.5, "#a855f7");
        stealthGrad.addColorStop(1, "#1e1b4b");

        ctx.fillStyle = stealthGrad;

        // Left Razor Blade Wing
        ctx.beginPath();
        ctx.moveTo(cx - 4, player.y - 2);
        ctx.lineTo(cx - 20, player.y + 24);
        ctx.lineTo(player.x - 2, player.y + player.h);
        ctx.lineTo(cx - 8, player.y + player.h - 12);
        ctx.closePath();
        ctx.fill();

        // Right Razor Blade Wing
        ctx.beginPath();
        ctx.moveTo(cx + 4, player.y - 2);
        ctx.lineTo(cx + 20, player.y + 24);
        ctx.lineTo(player.x + player.w + 2, player.y + player.h);
        ctx.lineTo(cx + 8, player.y + player.h - 12);
        ctx.closePath();
        ctx.fill();

        // Laser Knife Edge Specular Line
        ctx.strokeStyle = "#f0abfc";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 4, player.y - 2); ctx.lineTo(player.x - 2, player.y + player.h);
        ctx.moveTo(cx + 4, player.y - 2); ctx.lineTo(player.x + player.w + 2, player.y + player.h);
        ctx.stroke();

        // Singularity Plasma Engine Field
        let plasmaGrad = ctx.createRadialGradient(cx, cy + 4, 1, cx, cy + 4, 12);
        plasmaGrad.addColorStop(0, "#ffffff");
        plasmaGrad.addColorStop(0.4, "#e879f9");
        plasmaGrad.addColorStop(1, "#7e22ce");

        ctx.fillStyle = plasmaGrad;
        ctx.beginPath();
        ctx.arc(cx, cy + 4, 9, 0, Math.PI * 2);
        ctx.fill();
    }

    // Mach Plume Engine Flames (Shock Diamonds Effect)
    ctx.shadowBlur = 25;
    ctx.shadowColor = "#ff3300";
    
    let thrusterLength = 16 + Math.random() * 10;
    let flameGrad = ctx.createLinearGradient(cx, player.y + player.h - 6, cx, player.y + player.h + thrusterLength);
    flameGrad.addColorStop(0, "#ffffff");
    flameGrad.addColorStop(0.2, "#ffea00");
    flameGrad.addColorStop(0.6, "#ff3300");
    flameGrad.addColorStop(1, "transparent");

    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 9, player.y + player.h - 6);
    ctx.lineTo(cx, player.y + player.h + thrusterLength);
    ctx.lineTo(cx + 9, player.y + player.h - 6);
    ctx.closePath();
    ctx.fill();

    // Shock Diamond White Core
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, player.y + player.h + 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// 2. ULTRA-REALISTIC BIOMECHANICAL ALIEN ENEMY
function drawEnemy(ctx, e) {
    ctx.save();
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    const pulse = Math.sin(Date.now() * 0.008) * 2;

    ctx.shadowBlur = 20;
    ctx.shadowColor = "#f43f5e";

    // Chitin Armor Shell Gradient
    let chitinGrad = ctx.createLinearGradient(e.x, e.y, e.x + e.w, e.y + e.h);
    chitinGrad.addColorStop(0, "#be123c");
    chitinGrad.addColorStop(0.5, "#fb7185");
    chitinGrad.addColorStop(1, "#4c0519");

    ctx.fillStyle = chitinGrad;

    // Biomechanical Hive Geometry
    ctx.beginPath();
    ctx.moveTo(cx, e.y + e.h + 6); // Downward Stinger Head
    ctx.lineTo(e.x + e.w + 4, e.y + 2);
    ctx.lineTo(cx + 8, e.y + 14);
    ctx.lineTo(cx, e.y + 4);
    ctx.lineTo(cx - 8, e.y + 14);
    ctx.lineTo(e.x - 4, e.y + 2);
    ctx.closePath();
    ctx.fill();

    // Sharp Metal Edge Highlights
    ctx.strokeStyle = "#ffe4e6";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, e.y + e.h + 6); ctx.lineTo(e.x + e.w + 4, e.y + 2);
    ctx.moveTo(cx, e.y + e.h + 6); ctx.lineTo(e.x - 4, e.y + 2);
    ctx.stroke();

    // Bio-Glow Central Eye Core
    let bioEye = ctx.createRadialGradient(cx, cy + 2, 1, cx, cy + 2, 7 + pulse);
    bioEye.addColorStop(0, "#ffffff");
    bioEye.addColorStop(0.4, "#fde047");
    bioEye.addColorStop(1, "#ca8a04");

    ctx.fillStyle = bioEye;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 5 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// 3. AAA SCI-FI DREADNOUGHT BOSS MONSTER
function drawMonster(ctx, monster) {
    ctx.save();
    const cx = monster.x + monster.w / 2;
    const cy = monster.y + monster.h / 2;
    const time = Date.now() * 0.004;

    // Dreadnought Ambient Threat Lighting
    ctx.shadowBlur = 35;
    ctx.shadowColor = monster.phase === 3 ? "#d946ef" : "#ef4444";

    // Heavy Plated Chassis
    let hullGrad = ctx.createLinearGradient(monster.x, monster.y, monster.x + monster.w, monster.y + monster.h);
    if (monster.phase === 3) {
        hullGrad.addColorStop(0, "#4c1d95");
        hullGrad.addColorStop(0.5, "#a855f7");
        hullGrad.addColorStop(1, "#0f172a");
    } else {
        hullGrad.addColorStop(0, "#7f1d1d");
        hullGrad.addColorStop(0.5, "#dc2626");
        hullGrad.addColorStop(1, "#18181b");
    }

    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.roundRect(monster.x, monster.y, monster.w, monster.h, 18);
    ctx.fill();

    // Tech Panel Cutouts
    ctx.fillStyle = "#090d16";
    ctx.beginPath();
    ctx.roundRect(monster.x + 10, monster.y + 10, monster.w - 20, monster.h - 20, 12);
    ctx.fill();

    // Industrial Warning Stripe Trim
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(monster.x + 16, monster.y + 14, monster.w - 32, 6);
    ctx.setLineDash([]);

    // Rotating Energy Reactor Core Ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time);
    ctx.strokeStyle = monster.phase === 3 ? "#f0abfc" : "#fca5a5";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();

    // Glowing Core Sphere
    const corePulse = Math.sin(time * 3) * 4;
    let reactorGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 24 + corePulse);
    reactorGrad.addColorStop(0, "#ffffff");
    reactorGrad.addColorStop(0.4, monster.phase === 3 ? "#e879f9" : "#f87171");
    reactorGrad.addColorStop(1, monster.phase === 3 ? "#7e22ce" : "#991b1b");

    ctx.fillStyle = reactorGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 20 + corePulse, 0, Math.PI * 2);
    ctx.fill();

    // Twin Heavy Laser Turrets with Heat Ventilation
    let turretColor = "#f59e0b";
    ctx.fillStyle = turretColor;
    ctx.fillRect(monster.x - 12, monster.y + monster.h - 24, 18, 30);
    ctx.fillRect(monster.x + monster.w - 6, monster.y + monster.h - 24, 18, 30);

    // Laser Sight Beams (Phase 2 & 3)
    if (monster.phase >= 2) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(monster.x - 3, monster.y + monster.h + 6);
        ctx.lineTo(monster.x - 3, monster.y + canvas.height);
        ctx.moveTo(monster.x + monster.w + 3, monster.y + monster.h + 6);
        ctx.lineTo(monster.x + monster.w + 3, monster.y + canvas.height);
        ctx.stroke();
    }

    ctx.restore();
}
// ==========================================
// 🚀 AAA ULTRA-REALISTIC ENVIRONMENT & ITEM RENDERER
// ==========================================

// 4. REALISTIC ASTEROIDS & SPACE DEBRIS RENDERER
function drawAsteroid(ctx, ast) {
    ctx.save();
    const cx = ast.x + ast.w / 2;
    const cy = ast.y + ast.h / 2;

    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";

    // Volumetric Rocky Surface Gradient
    let rockGrad = ctx.createRadialGradient(cx - ast.w * 0.2, cy - ast.h * 0.2, 2, cx, cy, ast.w * 0.6);
    rockGrad.addColorStop(0, "#94a3b8");  // Specular Highlight
    rockGrad.addColorStop(0.5, "#475569"); // Base Slate Rock
    rockGrad.addColorStop(1, "#0f172a");   // Dark Shadow Side

    ctx.fillStyle = rockGrad;
    ctx.beginPath();
    
    // Irregular Polygon Rock Geometry
    const points = ast.points || 8;
    const radius = ast.w / 2;
    for (let i = 0; i < points; i++) {
        let angle = (i / points) * Math.PI * 2;
        let dist = radius * (0.85 + Math.sin(i * 3 + (ast.seed || 0)) * 0.15);
        let px = cx + Math.cos(angle) * dist;
        let py = cy + Math.sin(angle) * dist;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Crater Details
    ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 3, radius * 0.25, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy + 5, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// 5. HIGH-TECH GLOWING BLOCKS (MATH & TARGET CUBES)
function drawBlock(ctx, block) {
    ctx.save();
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;

    ctx.shadowBlur = 20;
    ctx.shadowColor = block.color || "#00f0ff";

    // Glassy Hologram Core Gradient
    let glassGrad = ctx.createLinearGradient(block.x, block.y, block.x + block.w, block.y + block.h);
    glassGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    glassGrad.addColorStop(0.2, block.color || "#00f0ff");
    glassGrad.addColorStop(0.8, "#0369a1");
    glassGrad.addColorStop(1, "#090d16");

    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.roundRect(block.x, block.y, block.w, block.h, 8);
    ctx.fill();

    // Metallic Rim Frame
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(block.x + 2, block.y + 2, block.w - 4, block.h - 4);

    // Neon Inner Grid Cross
    ctx.strokeStyle = block.color || "#00f0ff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(block.x + 6, cy); ctx.lineTo(block.x + block.w - 6, cy);
    ctx.moveTo(cx, block.y + 6); ctx.lineTo(cx, block.y + block.h - 6);
    ctx.stroke();

    ctx.restore();
}

// 6. SCI-FI BOOSTERS & POWER-UPS (SHIELD / MULTIPLIER / HEALTH / ULT)
function drawPowerup(ctx, p) {
    ctx.save();
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const pulse = Math.sin(Date.now() * 0.01) * 3;

    // Glowing Hologram Capsule
    let pColor = p.type === "shield" ? "#38bdf8" : p.type === "health" ? "#22c55e" : "#facc15";
    ctx.shadowBlur = 22;
    ctx.shadowColor = pColor;

    let pGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 16 + pulse);
    pGrad.addColorStop(0, "#ffffff");
    pGrad.addColorStop(0.5, pColor);
    pGrad.addColorStop(1, "transparent");

    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 14 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Metallic Outer Energy Ring
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

// 7. HIGH-VOLTAGE LASERS & PROJECTILES
function drawLaser(ctx, laser) {
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = laser.isEnemy ? "#ef4444" : "#00f0ff";

    // Multi-Layer Core Laser Ray
    let beamGrad = ctx.createLinearGradient(laser.x, laser.y, laser.x, laser.y + laser.h);
    beamGrad.addColorStop(0, "#ffffff");
    beamGrad.addColorStop(0.5, laser.isEnemy ? "#f87171" : "#38bdf8");
    beamGrad.addColorStop(1, "transparent");

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.roundRect(laser.x, laser.y, laser.w, laser.h, 4);
    ctx.fill();

    // Hot White Laser Core Line
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(laser.x + laser.w * 0.3, laser.y, laser.w * 0.4, laser.h);

    ctx.restore();
}
