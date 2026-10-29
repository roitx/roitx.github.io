// =========================================================================
// 🌌 FULL AAA REALISTIC ENGINE - ALL OBJECTS UPDATED
// =========================================================================

function createSafeLinearGradient(ctx, x1, y1, x2, y2) {
    return ctx.createLinearGradient(x1||0, y1||0, x2||10, y2||10);
}
function createSafeRadialGradient(ctx, x1, y1, r1, x2, y2, r2) {
    return ctx.createRadialGradient(x1||0, y1||0, r1||1, x2||0, y2||0, r2||10);
}

// --- REAL METAL SCRATCH HELPER ---
function drawScratches(ctx, x, y, w, h, count=12){
    ctx.save(); ctx.globalAlpha=0.1; ctx.strokeStyle="#fff"; ctx.lineWidth=0.5;
    for(let i=0;i<count;i++){
        let sx=x+Math.random()*w, sy=y+Math.random()*h;
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+Math.random()*20+10, sy+(Math.random()-0.5)*2); ctx.stroke();
    } ctx.restore();
}

// 🚀 1. PLAYER - REAL JET WITH SIDE WINGS
function drawPlayerShip(ctx, player, shipTypes, selectedShip, trails){
    const ship = shipTypes[selectedShip] || {color:"#38bdf8", accent:"#00ffff"};
    const cx = player.x+player.w/2, cy = player.y+player.h/2;
    ctx.save();
    if(Math.random()<0.98){
        for(let i=0;i<2;i++) trails.push({x:cx-10+i*20, y:player.y+player.h+6, size:Math.random()*12+8, color:ship.accent, alpha:1, vx:(Math.random()-0.5)*1, vy:Math.random()*4+6});
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
    ctx.fillStyle=canopyGrad; ctx.beginPath(); ctx.ellipse(cx,player.y+20,7,14,0,0,Math.PI*2); ctx.fill(); ctx.restore();
}

// 🛸 2. ENEMY - REAL STEALTH FIGHTER DRONE WITH WINGS
function drawEnemy(ctx, e){
    ctx.save();
    const cx=e.x+e.w/2, cy=e.y+e.h/2;
    // Body
    let g = createSafeLinearGradient(ctx,e.x,e.y,e.x,e.y+e.h); g.addColorStop(0,"#475569"); g.addColorStop(1,"#020617");
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.moveTo(cx, e.y+e.h+12); // nose
    ctx.lineTo(cx+10, e.y+5);
    ctx.lineTo(e.x+e.w+28, e.y+8); // right wing
    ctx.lineTo(e.x+e.w+18, e.y+18);
    ctx.lineTo(cx+8, e.y+e.h-5);
    ctx.lineTo(cx-8, e.y+e.h-5);
    ctx.lineTo(e.x-18, e.y+18);
    ctx.lineTo(e.x-28, e.y+8);
    ctx.lineTo(cx-10, e.y+5);
    ctx.closePath(); ctx.fill();

    // Panel line
    ctx.strokeStyle="rgba(255,255,255,0.1)"; ctx.lineWidth=1; ctx.stroke();

    // Twin vertical fins
    ctx.fillStyle="#1e293b";
    ctx.beginPath(); ctx.moveTo(cx+8, e.y+2); ctx.lineTo(cx+14, e.y-12); ctx.lineTo(cx+12, e.y+5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx-8, e.y+2); ctx.lineTo(cx-14, e.y-12); ctx.lineTo(cx-12, e.y+5); ctx.fill();

    // Engine glow
    ctx.fillStyle="rgba(239,68,68,0.5)"; ctx.beginPath(); ctx.ellipse(cx, e.y-2, 10, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle="#ff0000"; ctx.shadowBlur=12; ctx.shadowColor="#f00"; ctx.beginPath(); ctx.arc(cx, e.y-2, 4, 0, Math.PI*2); ctx.fill();
    
    // Cockpit sensor
    ctx.shadowBlur=0; ctx.fillStyle="#000"; ctx.beginPath(); ctx.ellipse(cx, cy, 6, 3, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
}

// ☄️ 4. ASTEROID - REAL NASA STYLE WITH IRREGULAR SHAPE & CRATERS
function drawAsteroid(ctx, ast){
    ctx.save();
    const cx=ast.x+ast.w/2, cy=ast.y+ast.h/2, r=ast.w/2;
    // Irregular asteroid shape
    ctx.beginPath();
    let points=8;
    for(let i=0;i<points;i++){
        let ang = (i/points)*Math.PI*2;
        let rad = r * (0.85 + Math.random()*0.3 + (ast.seed ? Math.sin(ast.seed+i)*0.1 : 0));
        // Use fixed seed if available, else random wobble once
        let x = cx + Math.cos(ang)*rad;
        let y = cy + Math.sin(ang)*rad;
        if(i==0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath();
    let rg = createSafeRadialGradient(ctx, cx-r*0.4, cy-r*0.4, r*0.1, cx, cy, r);
    rg.addColorStop(0,"#e2e8f0"); rg.addColorStop(0.3,"#94a3b8"); rg.addColorStop(0.7,"#334155"); rg.addColorStop(1,"#020617");
    ctx.fillStyle=rg; ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,0.4)"; ctx.lineWidth=1; ctx.stroke();

    // Real craters with inner shadow
    let craters = [
        {x:cx-r*0.2, y:cy+r*0.1, s:r*0.22},
        {x:cx+r*0.25, y:cy-r*0.15, s:r*0.15},
        {x:cx, y:cy+r*0.3, s:r*0.12}
    ];
    craters.forEach(c=>{
        // Outer shadow
        ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.arc(c.x+2, c.y+2, c.s, 0, Math.PI*2); ctx.fill();
        // Crater hole
        let cg = createSafeRadialGradient(ctx, c.x- c.s*0.2, c.y- c.s*0.2, c.s*0.1, c.x, c.y, c.s);
        cg.addColorStop(0,"#475569"); cg.addColorStop(1,"#0f172a");
        ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(c.x, c.y, c.s, 0, Math.PI*2); ctx.fill();
        // Rim highlight
        ctx.strokeStyle="rgba(255,255,255,0.15)"; ctx.lineWidth=1; ctx.stroke();
    });

    // Ice crystal glint
    ctx.fillStyle="#22d3ee"; ctx.shadowBlur=10; ctx.shadowColor="#22d3ee";
    ctx.beginPath(); ctx.ellipse(cx-r*0.1, cy-r*0.25, r*0.12, r*0.04, Math.PI/4, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
}

// 🔋 5. POWERUP - REAL HOLOGRAPHIC CRATE
function drawPowerup(ctx, p){
    ctx.save();
    const pw=p.w||36, ph=p.h||36, cx=p.x+pw/2, cy=p.y+ph/2;
    let col = p.type==="shield" ? "#06b6d4" : p.type==="health" ? "#10b981" : "#f59e0b";
    // Outer glow
    ctx.fillStyle=col; ctx.globalAlpha=0.2; ctx.beginPath(); ctx.arc(cx,cy,pw*0.7,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    // Real metal crate
    let g = createSafeLinearGradient(ctx,p.x,p.y,p.x,p.y+ph); g.addColorStop(0,"#334155"); g.addColorStop(1,"#020617");
    ctx.fillStyle=g; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x,p.y,pw,ph,6) : ctx.rect(p.x,p.y,pw,ph); ctx.fill();
    // Hologram line
    ctx.strokeStyle=col; ctx.lineWidth=2; ctx.strokeRect(p.x+4,p.y+4,pw-8,ph-8);
    ctx.fillStyle="#fff"; ctx.font="bold 18px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.shadowBlur=10; ctx.shadowColor="#fff";
    let sym = p.type==="shield" ? "🛡" : p.type==="health" ? "✚" : "⚡";
    ctx.fillText(sym,cx,cy);
    ctx.restore();
}

// ⚡ 6. LASER - REAL PLASMA WITH TRAIL
function drawLaser(ctx, l){
    ctx.save();
    let isE=l.isEnemy;
    // Trail
    ctx.fillStyle=isE?"rgba(239,68,68,0.15)":"rgba(56,189,248,0.15)";
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(l.x-6, l.y- (isE ? -10 : 10), l.w+12, l.h+10, 8) : ctx.rect(l.x-6,l.y,l.w+12,l.h+10); ctx.fill();
    // Core
    ctx.fillStyle=isE?"#ff4444":"#22d3ee"; ctx.shadowBlur=20; ctx.shadowColor=ctx.fillStyle;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(l.x,l.y,l.w,l.h,6) : ctx.rect(l.x,l.y,l.w,l.h); ctx.fill();
    // Hot center
    ctx.shadowBlur=0; ctx.fillStyle="#fff"; ctx.fillRect(l.x+l.w/2-1, l.y, 2, l.h);
    ctx.restore();
}

// 🟦 7. STUDY BLOCK - REAL SCI-FI LANDING PAD
function drawStudyBlock(ctx, b, ok){
    ctx.save();
    // AO shadow
    ctx.fillStyle="rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(b.x+b.w/2, b.y+b.h+8, b.w*0.5, 8, 0, 0, Math.PI*2); ctx.fill();
    // Base
    let g = createSafeLinearGradient(ctx,b.x,b.y,b.x,b.y+b.h); g.addColorStop(0,"#1e293b"); g.addColorStop(1,"#020617");
    ctx.fillStyle=g; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(b.x,b.y,b.w,b.h,14) : ctx.rect(b.x,b.y,b.w,b.h); ctx.fill();
    // Top light strip
    ctx.strokeStyle= ok ? "#10b981" : "#38bdf8"; ctx.lineWidth=3; ctx.shadowBlur=15; ctx.shadowColor=ctx.strokeStyle;
    ctx.beginPath(); ctx.moveTo(b.x+15, b.y+10); ctx.lineTo(b.x+b.w-15, b.y+10); ctx.stroke();
    ctx.shadowBlur=0; drawScratches(ctx,b.x,b.y,b.w,b.h,8);
    ctx.restore();
}

// 👾 3. MOTHERSHIP - BADA SPACESHIP
function drawMonster(ctx, m){
    ctx.save();
    const cx=m.x+m.w/2, cy=m.y+m.h/2, pulse=Math.sin(Date.now()*0.002)*4;
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(cx, m.y+m.h+20, m.w*0.7, 20, 0, 0, Math.PI*2); ctx.fill();
    let hullGrad=createSafeLinearGradient(ctx,m.x,m.y,m.x,m.y+m.h); hullGrad.addColorStop(0,"#475569"); hullGrad.addColorStop(0.4,"#1e293b"); hullGrad.addColorStop(1,"#020617");
    ctx.fillStyle=hullGrad;
    ctx.beginPath(); ctx.moveTo(cx,m.y-10); ctx.lineTo(m.x+m.w*0.8,m.y+20); ctx.lineTo(m.x+m.w+30,m.y+m.h*0.6); ctx.lineTo(m.x+m.w*0.6,m.y+m.h); ctx.lineTo(m.x+m.w*0.4,m.y+m.h); ctx.lineTo(m.x-30,m.y+m.h*0.6); ctx.lineTo(m.x+m.w*0.2,m.y+20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle="rgba(56,189,248,0.3)"; ctx.lineWidth=2; ctx.setLineDash([10,10]); ctx.beginPath(); ctx.moveTo(cx,m.y+10); ctx.lineTo(cx,m.y+m.h-20); ctx.stroke(); ctx.setLineDash([]);
    for(let i=0;i<4;i++){ let tx=m.x+(i%2==0?-20:m.w+5), ty=m.y+30+i*25; ctx.fillStyle="#334155"; ctx.fillRect(tx,ty,18,10); ctx.fillStyle="#38bdf8"; ctx.shadowBlur=10; ctx.shadowColor="#38bdf8"; ctx.beginPath(); ctx.arc(tx+(i%2==0?0:18),ty+5,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }
    for(let i=0;i<3;i++){ let ex=m.x+m.w*0.3+i*m.w*0.2, ey=m.y+m.h-5; ctx.fillStyle="#0f172a"; ctx.beginPath(); ctx.arc(ex,ey,14,0,Math.PI*2); ctx.fill(); let eGrad=createSafeRadialGradient(ctx,ex,ey,0,ex,ey+10,25); eGrad.addColorStop(0,"#fff"); eGrad.addColorStop(0.3,"#38bdf8"); eGrad.addColorStop(1,"transparent"); ctx.fillStyle=eGrad; ctx.beginPath(); ctx.arc(ex,ey+12,18+Math.random()*6,0,Math.PI*2); ctx.fill(); }
    ctx.fillStyle="#1e293b"; ctx.beginPath(); ctx.roundRect?ctx.roundRect(cx-20,m.y+15,40,25,5):ctx.rect(cx-20,m.y+15,40,25); ctx.fill(); ctx.fillStyle="#fde047"; ctx.fillRect(cx-15,m.y+22,30,4);
    let coreGrad=createSafeRadialGradient(ctx,cx,cy,0,cx,cy,30+pulse); coreGrad.addColorStop(0,"#fff"); coreGrad.addColorStop(0.3,"#ef4444"); coreGrad.addColorStop(1,"transparent"); ctx.fillStyle=coreGrad; ctx.beginPath(); ctx.arc(cx,cy,30+pulse,0,Math.PI*2); ctx.fill(); ctx.restore();
}