// =========================================================================
// 🔥 FINAL V6 - CLEAN - 1.2x ENEMY + 3D ASTEROID + REAL 3D ROITX COIN
// =========================================================================

window.asteroids = window.asteroids || [];
window.coins = window.coins || [];
window.enemies = window.enemies || [];
window.lasers = window.lasers || [];
window.trails = window.trails || [];

function createSafeLinearGradient(ctx, x1, y1, x2, y2) {
    return ctx.createLinearGradient(x1||0, y1||0, x2||10, y2||10);
}
function createSafeRadialGradient(ctx, x1, y1, r1, x2, y2, r2) {
    return ctx.createRadialGradient(x1||0, y1||0, r1||1, x2||0, y2||0, r2||10);
}
function drawScratches(ctx, x, y, w, h, count=12){
    ctx.save(); ctx.globalAlpha=0.1; ctx.strokeStyle="#fff"; ctx.lineWidth=0.5;
    for(let i=0;i<count;i++){
        let sx=x+Math.random()*w, sy=y+Math.random()*h;
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+Math.random()*20+10, sy+(Math.random()-0.5)*2); ctx.stroke();
    } ctx.restore();
}

// 🚀 1. PLAYER - 1.15x BADA
function drawPlayerShip(ctx, player, shipTypes, selectedShip, trails){
    const ship = shipTypes[selectedShip] || {color:"#38bdf8", accent:"#00ffff"};
    const scale = 1.15;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
    if(Math.random()<0.98){
        for(let i=0;i<2;i++) trails.push({x:cx-10+i*20, y:player.y+player.h+6, size:Math.random()*14+10, color:ship.accent, alpha:1, vx:(Math.random()-0.5)*1, vy:Math.random()*4+6});
    }
    ctx.fillStyle="rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(cx, player.y+player.h+15, player.w*0.6, 8, 0, 0, Math.PI*2); ctx.fill();
    let bodyGrad = createSafeLinearGradient(ctx, player.x, player.y, player.x, player.y+player.h);
    bodyGrad.addColorStop(0,"#e2e8f0"); bodyGrad.addColorStop(0.2,ship.color); bodyGrad.addColorStop(0.6,"#0f172a"); bodyGrad.addColorStop(1,"#020617");
    ctx.fillStyle=bodyGrad; ctx.beginPath(); ctx.moveTo(cx,player.y-35); ctx.lineTo(cx+8,player.y+5); ctx.lineTo(cx+12,player.y+player.h-10); ctx.lineTo(cx-12,player.y+player.h-10); ctx.lineTo(cx-8,player.y+5); ctx.closePath(); ctx.fill();
    let wingGrad = createSafeLinearGradient(ctx, player.x, player.y, player.x, player.y+player.h); wingGrad.addColorStop(0,"#334155"); wingGrad.addColorStop(1,"#020617");
    ctx.fillStyle=wingGrad;
    ctx.beginPath(); ctx.moveTo(player.x+10,player.y+25); ctx.lineTo(player.x-30,player.y+player.h-15); ctx.lineTo(player.x-22,player.y+player.h-5); ctx.lineTo(player.x+15,player.y+player.h-15); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(player.x+player.w-10,player.y+25); ctx.lineTo(player.x+player.w+30,player.y+player.h-15); ctx.lineTo(player.x+player.w+22,player.y+player.h-5); ctx.lineTo(player.x+player.w-15,player.y+player.h-15); ctx.closePath(); ctx.fill();
    for(let i=0;i<2;i++){ let ex=cx-8+i*16; ctx.fillStyle="#475569"; ctx.fillRect(ex-6,player.y+player.h-8,12,10); ctx.fillStyle=ship.accent; ctx.globalAlpha=0.6; ctx.beginPath(); ctx.moveTo(ex-6,player.y+player.h+2); ctx.lineTo(ex,player.y+player.h+22); ctx.lineTo(ex+6,player.y+player.h+2); ctx.fill(); ctx.globalAlpha=1; ctx.fillStyle="#fff"; ctx.beginPath(); ctx.moveTo(ex-3,player.y+player.h+2); ctx.lineTo(ex,player.y+player.h+12); ctx.lineTo(ex+3,player.y+player.h+2); ctx.fill(); }
    let canopyGrad = createSafeRadialGradient(ctx,cx,player.y+18,0,cx,player.y+18,12); canopyGrad.addColorStop(0,"#fff"); canopyGrad.addColorStop(0.3,"#06b6d4"); canopyGrad.addColorStop(1,"#020617");
    ctx.fillStyle=canopyGrad; ctx.beginPath(); ctx.ellipse(cx,player.y+20,7,14,0,0,Math.PI*2); ctx.fill(); 
    ctx.restore();
}

// 🛸 2. ENEMY
function drawEnemy(ctx, e){
    ctx.save();
    const cx=e.x+e.w/2, cy=e.y+e.h/2;
    const type = e.type || Math.floor(e.x % 3);
    const scale = 0.8;
    ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy);

    let base = type==0 ? "#f87171" : type==1 ? "#60a5fa" : "#a1a1aa";
    let bodyMid = type==0 ? "#991b1b" : type==1 ? "#1e40af" : "#52525b";
    let glowCol = type==0 ? "#fca5a5" : type==1 ? "#7dd3fc" : "#d4d4d8";

    ctx.fillStyle="rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.ellipse(cx, cy+14, e.w*0.55, 8, 0, 0, Math.PI*2); ctx.fill();

    let bodyGrad = createSafeLinearGradient(ctx, e.x, e.y-10, e.x, e.y+e.h+20);
    bodyGrad.addColorStop(0, "#e4e4e7");
    bodyGrad.addColorStop(0.12, base);
    bodyGrad.addColorStop(0.30, bodyMid);
    bodyGrad.addColorStop(0.65, "#3f3f46");
    bodyGrad.addColorStop(1, "#27272a");
    ctx.fillStyle=bodyGrad;

    ctx.beginPath();
    ctx.moveTo(cx, e.y+e.h+22);
    ctx.lineTo(cx+8, e.y+e.h+8);
    ctx.lineTo(cx+14, e.y+e.h-2);
    ctx.lineTo(e.x+e.w+38, e.y+6);
    ctx.lineTo(e.x+e.w+18, e.y+14);
    ctx.lineTo(cx+6, e.y+10);
    ctx.lineTo(cx-6, e.y+10);
    ctx.lineTo(e.x-18, e.y+14);
    ctx.lineTo(e.x-38, e.y+6);
    ctx.lineTo(cx-14, e.y+e.h-2);
    ctx.lineTo(cx-8, e.y+e.h+8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.35)"; ctx.lineWidth=1; ctx.stroke();

    let noseGrad = createSafeRadialGradient(ctx, cx, e.y+e.h+18, 0, cx, e.y+e.h+18, 14);
    noseGrad.addColorStop(0, "#ffffff");
    noseGrad.addColorStop(0.15, "#fca5a5");
    noseGrad.addColorStop(0.35, "#ef4444");
    noseGrad.addColorStop(0.7, "#b91c1c");
    noseGrad.addColorStop(1, "#7f1d1d");
    ctx.fillStyle=noseGrad;
    ctx.beginPath();
    ctx.moveTo(cx, e.y+e.h+22);
    ctx.lineTo(cx+7, e.y+e.h+10);
    ctx.lineTo(cx-7, e.y+e.h+10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle="#3f3f46";
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx-12, e.y+2, 24, 6, 2) : ctx.rect(cx-12, e.y+2, 24, 6); ctx.fill();
    
    for(let i=0;i<2;i++){
        let ex = cx-6 + i*12;
        ctx.fillStyle=glowCol; ctx.globalAlpha=0.6;
        ctx.beginPath(); ctx.ellipse(ex, e.y+3, 9, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
        ctx.fillStyle="#ffffff"; ctx.beginPath(); ctx.ellipse(ex, e.y+3, 4, 1.8, 0, 0, Math.PI*2); ctx.fill();
    }

    let sensorGrad = createSafeRadialGradient(ctx, cx, cy+2, 0, cx, cy+2, 7);
    sensorGrad.addColorStop(0, "#ffffff");
    sensorGrad.addColorStop(0.25, glowCol);
    sensorGrad.addColorStop(0.6, "#52525b");
    sensorGrad.addColorStop(1, "#27272a");
    ctx.fillStyle=sensorGrad;
    ctx.beginPath(); ctx.arc(cx, cy+2, 6, 0, Math.PI*2); ctx.fill();
    ctx.restore();
}

// 👾 3. MONSTER
function drawMonster(ctx, m){
    ctx.save();
    const cx = m.x + m.w / 2; const cy = m.y + m.h / 2;
    if(m.fireTimer === undefined) m.fireTimer = 0; m.fireTimer++;
    let isFiring = (m.fireTimer % 80) < 18;
    ctx.translate(cx, cy);
    let bodyGrad = createSafeLinearGradient(ctx, -m.w*0.2, -m.h*0.3, m.w*0.2, m.h*0.3);
    bodyGrad.addColorStop(0, "#e2e8f0"); bodyGrad.addColorStop(0.15, "#38bdf8"); bodyGrad.addColorStop(0.4, "#1e293b"); bodyGrad.addColorStop(0.8, "#7f1d1d"); bodyGrad.addColorStop(1, "#000000");
    ctx.fillStyle=bodyGrad; ctx.strokeStyle="rgba(255,255,255,0.15)"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(0, m.h*0.75); ctx.lineTo(14, m.h*0.25); ctx.lineTo(m.w*0.6, m.h*0.15); ctx.lineTo(m.w*0.4, -m.h*0.1); ctx.lineTo(20, -m.h*0.35); ctx.lineTo(-20, -m.h*0.35); ctx.lineTo(-m.w*0.4, -m.h*0.1); ctx.lineTo(-m.w*0.6, m.h*0.15); ctx.lineTo(-14, m.h*0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
    let wingGrad = createSafeLinearGradient(ctx, -m.w*0.5, 0, m.w*0.5, 0); wingGrad.addColorStop(0, "#334155"); wingGrad.addColorStop(0.5, "#0f172a"); wingGrad.addColorStop(1, "#334155"); ctx.fillStyle=wingGrad;
    ctx.beginPath(); ctx.moveTo(-14, m.h*0.18); ctx.lineTo(-m.w*0.75, m.h*0.08); ctx.lineTo(-m.w*0.6, -m.h*0.12); ctx.lineTo(-18, -m.h*0.18); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(14, m.h*0.18); ctx.lineTo(m.w*0.75, m.h*0.08); ctx.lineTo(m.w*0.6, -m.h*0.12); ctx.lineTo(18, -m.h*0.18); ctx.closePath(); ctx.fill();
    let canopyGrad = createSafeRadialGradient(ctx, 0, m.h*0.28, 0, 0, m.h*0.28, 18); canopyGrad.addColorStop(0, "#fff"); canopyGrad.addColorStop(0.3, "#06b6d4"); canopyGrad.addColorStop(1, "#020617"); ctx.fillStyle=canopyGrad; ctx.beginPath(); ctx.ellipse(0, m.h*0.26, 15, 24, 0, 0, Math.PI*2); ctx.fill();
    for(let i=0;i<2;i++){ let ex=-14+i*28; let ey=-m.h*0.38; if(isFiring){ let fireH=45+Math.random()*20; let fGrad=createSafeLinearGradient(ctx, ex, ey, ex, ey-fireH); fGrad.addColorStop(0, "#fff"); fGrad.addColorStop(0.25, "#f59e0b"); fGrad.addColorStop(0.6, "#ef4444"); fGrad.addColorStop(1, "transparent"); ctx.fillStyle=fGrad; ctx.beginPath(); ctx.moveTo(ex-7, ey); ctx.lineTo(ex, ey-fireH); ctx.lineTo(ex+7, ey); ctx.fill(); } }
    ctx.restore();
}

// ☄️ 4. ASTEROID - FINAL CLEAN - CHHOTA + HALKA SLOW + KAM
function drawAsteroid(ctx, ast){
    ctx.save();
    const cx=ast.x+ast.w/2, cy=ast.y+ast.h/2, r=ast.w/2;

    if(!ast._init){
        ast._init=true;
        let t = ast.type ?? Math.floor(Math.random()*3);
        ast.type = t;
        // SPEED THODI KAM KAR DI - 1.35x only
        if(t==0){ // RED - FAST
            ast.flame="#ef4444"; ast.flame2="#f87171"; ast.crack="#fbbf24";
            ast.speed = (6.5 + Math.random()*1.5) * 1.35; // 8.7 - 10.8
        } else if(t==1){ // YELLOW - MEDIUM
            ast.flame="#facc15"; ast.flame2="#fde047"; ast.crack="#fb923c";
            ast.speed = (4.2 + Math.random()*1) * 1.35; // 5.6 - 7.0
        } else { // BLUE - SLOW
            ast.flame="#22d3ee"; ast.flame2="#38bdf8"; ast.crack="#22d3ee";
            ast.speed = (2.2 + Math.random()*0.8) * 1.35; // 2.9 - 4.0
        }
        ast._pts=[]; for(let i=0;i<6;i++){ let ang=(i/6)*Math.PI*2; ast._pts.push({ang:ang, dist:r*(0.7+Math.random()*0.3)}); }
        ast.cracks=[]; for(let i=0;i<2;i++){ ast.cracks.push({ x1:(Math.random()-0.5)*r*0.5, y1:(Math.random()-0.5)*r*0.5, x2:(Math.random()-0.5)*r*0.6, y2:(Math.random()-0.5)*r*0.6, w: 1 }); }
        ast.zRot=0; ast.yRot=0; ast.zSpeed=0.05; ast.ySpeed=0.12; ast.hitRot=0; ast.isHit=false;
    }

    // FLAME STATIC
    ctx.save(); ctx.globalAlpha=0.7; // thoda halka
    let trailLen = ast.speed * 0.4;
    let flameGrad = createSafeLinearGradient(ctx, cx, cy-r*0.3, cx, cy-r*trailLen*6);
    flameGrad.addColorStop(0, ast.flame); flameGrad.addColorStop(1, "transparent");
    ctx.fillStyle=flameGrad; ctx.beginPath(); ctx.moveTo(cx-r*0.35, cy-r*0.1); ctx.quadraticCurveTo(cx, cy-r*trailLen*3.5, cx+r*0.35, cy-r*0.1); ctx.closePath(); ctx.fill(); ctx.restore();

    // ROCK 3D ROTATION - AUR CHHOTA
    ctx.save();
    const scale = 0.36; // 0.42 se 0.36 - AUR CHHOTA
    ctx.translate(cx, cy);
    if(ast.isHit){ ast.hitRot+=0.3; ctx.rotate(ast.hitRot); }
    else { ast.zRot+=ast.zSpeed; ast.yRot+=ast.ySpeed; ctx.rotate(ast.zRot); }
    let yScale = Math.cos(ast.yRot);
    ctx.scale(yScale*scale, scale);

    ctx.strokeStyle=ast.flame2; ctx.lineWidth=1.8; ctx.globalAlpha=0.7; ctx.beginPath(); ast._pts.forEach((p,i)=>{ let x=Math.cos(p.ang)*p.dist; let y=Math.sin(p.ang)*p.dist; if(i==0)ctx.moveTo(x,y);else ctx.lineTo(x,y); }); ctx.closePath(); ctx.stroke(); ctx.globalAlpha=1;

    let rockGrad = createSafeRadialGradient(ctx, -r*0.2, -r*0.2, r*0.1, 0, 0, r);
    rockGrad.addColorStop(0, "#a8a29e"); rockGrad.addColorStop(1, "#1c1917");
    ctx.fillStyle=rockGrad; ctx.beginPath(); ast._pts.forEach((p,i)=>{ let x=Math.cos(p.ang)*p.dist; let y=Math.sin(p.ang)*p.dist; if(i==0)ctx.moveTo(x,y);else ctx.lineTo(x,y); }); ctx.closePath(); ctx.fill();

    ast.cracks.forEach(cr=>{
        ctx.strokeStyle=ast.crack; ctx.lineWidth=cr.w; ctx.beginPath(); ctx.moveTo(cr.x1, cr.y1); ctx.lineTo(cr.x2, cr.y2); ctx.stroke();
    });
    ctx.restore();
    ctx.restore();
}

// SPAWN - BILKUL KAM
function spawnAsteroid(){
    // SCREEN PAR MAX 4 SE JYADA NA HO
    if(window.asteroids.length >= 4) return;

    let rand = Math.random()*100; let type;
    if(rand < 55) type = 2; else if(rand < 85) type = 1; else type = 0;
    let ast = { x: Math.random()*(canvas.width-40), y: -60, w: 32, h: 32, type: type }; // FIXED CHHOTA SIZE 32
    window.asteroids.push(ast);
}

// 🪙 5.  👛 COIN - REAL 3D GOLD + ROITX (Aapka manga hua renderer wala coin)
function drawCoin(ctx, c){
    ctx.save();
    const cx=c.x+c.w/2, cy=c.y+c.h/2, r=c.w/2;
    if(c.zRot===undefined){ 
        c.zRot=0; 
        c.yRot=0; 
        c.zSpeed=0.045; 
        c.ySpeed=0.11;
    }
    c.zRot+=c.zSpeed; 
    c.yRot+=c.ySpeed;

    ctx.translate(cx, cy);
    ctx.rotate(c.zRot);
    
    let yScale = Math.cos(c.yRot);
    let isSide = Math.abs(yScale) < 0.28;

    if(isSide){
        let thick = 7;
        ctx.fillStyle="#422006"; ctx.fillRect(-r, -thick/2, r*2, thick);
        ctx.fillStyle="#a16207"; ctx.fillRect(-r, -thick/2, r*2, thick);
        ctx.fillStyle="#facc15"; ctx.fillRect(-r, -thick/2, r*2, 2.5);
        ctx.fillStyle="#713f12"; ctx.fillRect(-r, thick/2-2.5, r*2, 2.5);
    } else {
        ctx.scale(yScale, 1);
        ctx.fillStyle="#78350f"; ctx.beginPath(); ctx.arc(1.2, 1.5, r, 0, Math.PI*2); ctx.fill();
        let goldGrad = createSafeRadialGradient(ctx, -r*0.35, -r*0.35, r*0.1, 0, 0, r);
        goldGrad.addColorStop(0, "#fefce8"); goldGrad.addColorStop(0.1, "#fef9c3"); goldGrad.addColorStop(0.22, "#fde047"); goldGrad.addColorStop(0.4, "#facc15"); goldGrad.addColorStop(0.62, "#eab308"); goldGrad.addColorStop(0.85, "#a16207"); goldGrad.addColorStop(1, "#713f12");
        ctx.fillStyle=goldGrad; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle="rgba(255,255,255,0.5)"; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(0, 0, r*0.92, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle="#fde047"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(0, 0, r*0.72, 0, Math.PI*2); ctx.stroke();
        
        if(yScale > 0){
            ctx.save(); ctx.scale(1/Math.abs(yScale), 1);
            ctx.font=`bold ${r*0.33}px Arial`; ctx.textAlign="center"; ctx.textBaseline="middle";
            ctx.fillStyle="#78350f"; ctx.fillText("ROITX", 0.9, 0.9);
            ctx.fillStyle="#fffbeb"; ctx.fillText("ROITX", 0, 0);
            ctx.restore();
        } else {
            ctx.save(); ctx.scale(1/Math.abs(yScale), 1);
            ctx.fillStyle="#422006"; ctx.font=`bold ${r*0.7}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("$", 0, 0);
            ctx.restore();
        }
        ctx.fillStyle="rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.ellipse(-r*0.28, -r*0.3, r*0.28, r*0.12, -0.6, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
}

// 🔋 6. POWERUP
function drawPowerup(ctx, p){
    ctx.save(); const pw=p.w||36, ph=p.h||42, cx=p.x+pw/2, cy=p.y+ph/2; const bob=Math.sin(Date.now()*0.003+p.x)*4; ctx.translate(cx, cy+bob);
    let col=p.type==="shield"?"#06b6d4":p.type==="health"?"#10b981":"#f59e0b"; let liquidCol=p.type==="shield"?"#22d3ee":p.type==="health"?"#34d399":"#fbbf24";
    ctx.fillStyle=col; ctx.globalAlpha=0.25; ctx.shadowBlur=30; ctx.shadowColor=col; ctx.beginPath(); ctx.arc(0,8,pw*0.6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; ctx.globalAlpha=1;
    let glassGrad=createSafeLinearGradient(ctx,-pw*0.4,-ph*0.4,pw*0.4,ph*0.4); glassGrad.addColorStop(0,"rgba(255,255,255,0.9)"); glassGrad.addColorStop(0.2,"rgba(200,200,200,0.3)"); glassGrad.addColorStop(0.5,"rgba(100,100,100,0.15)"); glassGrad.addColorStop(1,"rgba(50,50,50,0.4)"); ctx.fillStyle=glassGrad; ctx.strokeStyle="rgba(255,255,255,0.4)"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(-pw*0.18,-ph*0.5); ctx.lineTo(-pw*0.18,-ph*0.35); ctx.lineTo(-pw*0.35,-ph*0.2); ctx.lineTo(-pw*0.35,ph*0.4); ctx.quadraticCurveTo(-pw*0.35,ph*0.5,0,ph*0.5); ctx.quadraticCurveTo(pw*0.35,ph*0.5,pw*0.35,ph*0.4); ctx.lineTo(pw*0.35,-ph*0.2); ctx.lineTo(pw*0.18,-ph*0.35); ctx.lineTo(pw*0.18,-ph*0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    let liqGrad=createSafeLinearGradient(ctx,-pw*0.3,0,pw*0.3,0); liqGrad.addColorStop(0,liquidCol); liqGrad.addColorStop(0.5,"#ffffff"); liqGrad.addColorStop(1,liquidCol); ctx.fillStyle=liqGrad; ctx.beginPath(); ctx.moveTo(-pw*0.3,ph*0.1); ctx.lineTo(-pw*0.3,ph*0.38); ctx.quadraticCurveTo(0,ph*0.45,pw*0.3,ph*0.38); ctx.lineTo(pw*0.3,ph*0.1); ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawLaser(ctx, l){ 
    ctx.save(); 
    let isE = l.isEnemy; 
    let isYellow = l.isYellowEnemy;
    // Agar yellow enemy laser hai toh yellow color, warna red/cyan
    ctx.fillStyle = isYellow ? "#facc15" : (isE ? "#ff4444" : "#22d3ee"); 
    ctx.shadowBlur = 20; 
    ctx.shadowColor = ctx.fillStyle; 
    ctx.fillRect(l.x, l.y, l.w, l.h); 
    ctx.restore(); 
}

function drawStudyBlock(ctx, b, ok){ 
    ctx.save(); 
    let g = createSafeLinearGradient(ctx, b.x, b.y, b.x, b.y+b.h); 
    g.addColorStop(0, "#1e293b"); 
    g.addColorStop(1, "#020617"); 
    ctx.fillStyle = g; 
    ctx.beginPath(); 
    ctx.roundRect ? ctx.roundRect(b.x, b.y, b.w, b.h, 14) : ctx.rect(b.x, b.y, b.w, b.h); 
    ctx.fill(); 
    ctx.restore(); 
}
