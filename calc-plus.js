/* ROITX Toolkit Plus — advanced graph + Solve, Matrix, Statistics, Number base */
(() => {
"use strict";
const T = window.ROITX_TK; if (!T) return;
const { R, TABS, $, LS, SV, esc, toast, put, vals } = T;
const fmt = (n) => (typeof n === "number" && isFinite(n) ? String(+n.toPrecision(8)) : String(n));
const nums = (s) => (s.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
TABS.splice(4, 0, ["solve", "Solve"], ["matrix", "Matrix"], ["stats", "Statistics"]); TABS.push(["base", "Number base"]);

/* ================= GRAPH ================= */
R.graph = (b) => {
  const D = { grid: 1, minor: 1, axes: 1, nums: 1, der: 0, tan: 0 }, saved = LS("calcGraph", {});
  const S = { f: saved.f || ["sin(x)", "x^2+y^2=9"], o: Object.assign({}, D, saved.o) }, V = { x: 0, y: 0, s: 40 };
  const cols = ["#00e5ff", "#ff5c8a", "#ffd23f", "#7cff6b"], cache = {}; let mark = null, curves = [];
  b.innerHTML = `<div id="gf"></div><div class="tk-chips" id="gc"></div><div class="tk-gw" id="gw"><canvas class="tk-cv"></canvas><div class="tk-gtools"><button data-a="gin" class="gz" aria-label="Zoom in">+</button><button data-a="gout" class="gz" aria-label="Zoom out">−</button><button data-a="gfs" aria-label="Graph full screen" title="Full screen">⛶</button></div><div class="tk-read" id="gr">Tap the graph to trace a curve.</div></div><div class="tk-row"><button class="tk-b" data-a="pts">Find key points</button><button class="tk-b" data-a="reset">Reset view</button><button class="tk-b" data-a="png">Save image</button></div><div id="gp"></div><p class="tk-dim">Type y = f(x) or any equation like x^2 + y^2 = 9. Angles in radians.</p>`;
  const cv = $("canvas", b), save = () => SV("calcGraph", S);
  const comp = (src) => {
    src = src.trim(); if (!src) return null; if (src in cache) return cache[src];
    let c = null;
    try { const m = /^(.*?)=(.*)$/.exec(src); c = m && !/^\s*y\s*$/i.test(m[1]) ? { imp: true, fn: math.compile(`(${m[1]})-(${m[2]})`) } : { imp: false, fn: math.compile(src.replace(/^y\s*=/i, "")) }; } catch (e) {}
    return (cache[src] = c);
  };
  const sc = {}, refresh = () => { Object.keys(sc).forEach((k) => delete sc[k]); Object.assign(sc, vals()); };
  const ev = (c, x, y = 0) => { try { sc.x = x; sc.y = y; const v = c.fn.evaluate(sc); return typeof v === "number" && isFinite(v) ? v : NaN; } catch (e) { return NaN; } };
  const der = (c, x) => { const h = 1e-5 * Math.max(1, Math.abs(x)); return (ev(c, x + h) - ev(c, x - h)) / (2 * h); };
  const rows = () => { $("#gf", b).innerHTML = S.f.map((f, i) => `<div class="tk-fn"><i style="background:${cols[i]}"></i><span>${/=/.test(f) && !/^\s*y\s*=/i.test(f) ? "eq" : "y ="}</span><input data-i="${i}" value="${esc(f)}" placeholder="x^2 - 3x   or   x^2+y^2=9" autocapitalize="off" spellcheck="false"><button data-rm="${i}" aria-label="Remove">✕</button></div>`).join("") + (S.f.length < 4 ? `<button class="tk-b" data-a="add">+ Add</button>` : ""); };
  const chips = () => { $("#gc", b).innerHTML = [["grid", "Grid"], ["minor", "Minor lines"], ["axes", "Axes"], ["nums", "Numbers"], ["der", "Derivative"], ["tan", "Tangent"]].map(([k, l]) => `<button class="${S.o[k] ? "on" : ""}" data-o="${k}">${l}</button>`).join(""); };

  function draw() {
    refresh(); const w = cv.clientWidth, h = cv.clientHeight; if (!w) return; const d = devicePixelRatio || 1; cv.width = w * d; cv.height = h * d;
    const g = cv.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0);
    const cs = getComputedStyle(document.body), fg = cs.getPropertyValue("--lcd-text").trim() || "#0f6";
    g.fillStyle = cs.getPropertyValue("--lcd-bg").trim() || "#0a120b"; g.fillRect(0, 0, w, h);
    const X = (x) => w / 2 + (x - V.x) * V.s, Y = (y) => h / 2 - (y - V.y) * V.s, ix = (p) => V.x + (p - w / 2) / V.s, iy = (p) => V.y - (p - h / 2) / V.s;
    const raw = 70 / V.s, p10 = 10 ** Math.floor(Math.log10(raw)), st = [1, 2, 5, 10].map((m) => m * p10).find((m) => m >= raw);
    const x0 = ix(0), x1 = ix(w), y0 = iy(h), y1 = iy(0);
    const lines = (step, a) => { g.strokeStyle = `rgba(150,175,165,${a})`; g.lineWidth = 1; g.beginPath(); for (let k = Math.ceil(x0 / step); k * step <= x1; k++) { const q = Math.round(X(k * step)) + .5; g.moveTo(q, 0); g.lineTo(q, h); } for (let k = Math.ceil(y0 / step); k * step <= y1; k++) { const q = Math.round(Y(k * step)) + .5; g.moveTo(0, q); g.lineTo(w, q); } g.stroke(); };
    if (S.o.grid) { if (S.o.minor) lines(st / 5, .09); lines(st, .22); }
    const ax = Math.min(Math.max(X(0), 0), w), ay = Math.min(Math.max(Y(0), 0), h);
    if (S.o.axes) { g.strokeStyle = fg; g.globalAlpha = .85; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, ay); g.lineTo(w, ay); g.moveTo(ax, 0); g.lineTo(ax, h); g.stroke(); g.globalAlpha = 1; }
    if (S.o.nums) { g.fillStyle = fg; g.globalAlpha = .85; g.font = "10px Poppins,sans-serif"; g.textAlign = "center"; for (let k = Math.ceil(x0 / st); k * st <= x1; k++) if (k) g.fillText(+(k * st).toPrecision(6), X(k * st), Math.min(ay + 13, h - 3)); g.textAlign = "left"; for (let k = Math.ceil(y0 / st); k * st <= y1; k++) if (k) g.fillText(+(k * st).toPrecision(6), Math.min(ax + 4, w - 32), Y(k * st) - 3); g.globalAlpha = 1; }
    curves = S.f.map(comp);
    curves.forEach((c, i) => {
      if (!c) return; g.strokeStyle = cols[i]; g.lineWidth = 2.3; g.lineJoin = "round"; g.setLineDash([]); g.beginPath();
      if (c.imp) { // implicit curve: marching squares
        const n = 5, nc = Math.ceil(w / n) + 1, nr = Math.ceil(h / n) + 1, v = new Float64Array(nc * nr);
        for (let j = 0; j < nr; j++) for (let k = 0; k < nc; k++) v[j * nc + k] = ev(c, ix(k * n), iy(j * n));
        for (let j = 0; j < nr - 1; j++) for (let k = 0; k < nc - 1; k++) {
          const a = v[j * nc + k], bb = v[j * nc + k + 1], cc = v[(j + 1) * nc + k + 1], dd = v[(j + 1) * nc + k]; if (isNaN(a + bb + cc + dd)) continue;
          const px = k * n, py = j * n, q = [];
          if ((a < 0) !== (bb < 0)) q.push([px + n * a / (a - bb), py]); if ((bb < 0) !== (cc < 0)) q.push([px + n, py + n * bb / (bb - cc)]);
          if ((dd < 0) !== (cc < 0)) q.push([px + n * dd / (dd - cc), py + n]); if ((a < 0) !== (dd < 0)) q.push([px, py + n * a / (a - dd)]);
          if (q.length >= 2) { g.moveTo(q[0][0], q[0][1]); g.lineTo(q[1][0], q[1][1]); if (q.length === 4) { g.moveTo(q[2][0], q[2][1]); g.lineTo(q[3][0], q[3][1]); } }
        }
        g.stroke(); return;
      }
      let on = false, py = 0;
      for (let px = 0; px <= w; px += 1.5) { const y = ev(c, ix(px)); if (isNaN(y)) { on = false; continue; } const q = Y(y); if (on && Math.abs(q - py) < h * 1.5) g.lineTo(px, q); else g.moveTo(px, q); on = true; py = q; }
      g.stroke();
      if (S.o.der) { g.globalAlpha = .7; g.setLineDash([6, 5]); g.lineWidth = 1.6; g.beginPath(); on = false; for (let px = 0; px <= w; px += 2) { const y = der(c, ix(px)); if (isNaN(y)) { on = false; continue; } const q = Y(y); if (on && Math.abs(q - py) < h * 1.5) g.lineTo(px, q); else g.moveTo(px, q); on = true; py = q; } g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
    });
    if (mark && curves[mark.i] && !curves[mark.i].imp) {
      const c = curves[mark.i], my = ev(c, mark.x), m = der(c, mark.x);
      if (S.o.tan && isFinite(m)) { g.strokeStyle = "#fff"; g.globalAlpha = .75; g.setLineDash([4, 4]); g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, Y(my + m * (ix(0) - mark.x))); g.lineTo(w, Y(my + m * (ix(w) - mark.x))); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
      g.fillStyle = cols[mark.i]; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(X(mark.x), Y(my), 5, 0, 7); g.fill(); g.stroke();
      $("#gr", b).innerHTML = `<b style="color:${cols[mark.i]}">●</b> x = ${fmt(mark.x)} &nbsp; y = ${fmt(my)} &nbsp; slope = ${fmt(m)}`;
    }
  }
  function keyPoints() {
    refresh();
    const w = cv.clientWidth, x0 = V.x - w / 2 / V.s, x1 = V.x + w / 2 / V.s, N = Math.max(500, w * 2), dx = (x1 - x0) / N, out = [];
    const ex = curves.map((c, i) => (c && !c.imp ? { c, i } : null)).filter(Boolean), ys = ex.map(({ c }) => Array.from({ length: N + 1 }, (_, k) => ev(c, x0 + k * dx)));
    const bis = (F, a, bb) => { let fa = F(a); for (let k = 0; k < 45; k++) { const m = (a + bb) / 2, fm = F(m); if (fa * fm <= 0) bb = m; else { a = m; fa = fm; } } return (a + bb) / 2; };
    ex.forEach(({ c, i }, j) => {
      const Y = ys[j], F = (x) => ev(c, x), y00 = F(0); if (isFinite(y00) && x0 <= 0 && x1 >= 0) out.push([i, "y-intercept", 0, y00]);
      for (let k = 0; k < N; k++) {
        if (Y[k] * Y[k + 1] < 0 && Math.abs(Y[k] - Y[k + 1]) < 1e3) out.push([i, "Root", bis(F, x0 + k * dx, x0 + (k + 1) * dx), 0]);
        if (k) { const p = Y[k - 1], q = Y[k], r = Y[k + 1]; if (isFinite(p + q + r) && (q - p) * (r - q) < 0) { const mx = q > p; let lo = x0 + (k - 1) * dx, hi = x0 + (k + 1) * dx; for (let t = 0; t < 50; t++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if ((F(m1) < F(m2)) === mx) lo = m1; else hi = m2; } const x = (lo + hi) / 2; out.push([i, mx ? "Maximum" : "Minimum", x, F(x)]); } }
      }
    });
    for (let a = 0; a < ex.length; a++) for (let c2 = a + 1; c2 < ex.length; c2++) { const F = (x) => ev(ex[a].c, x) - ev(ex[c2].c, x); for (let k = 0; k < N; k++) { const p = ys[a][k] - ys[c2][k], q = ys[a][k + 1] - ys[c2][k + 1]; if (p * q < 0 && Math.abs(p - q) < 1e3) { const x = bis(F, x0 + k * dx, x0 + (k + 1) * dx); out.push([ex[a].i, "Intersection", x, ev(ex[a].c, x)]); } } }
    $("#gp", b).innerHTML = out.length ? `<div class="tk-grid2">${out.slice(0, 14).map(([i, l, x, y]) => `<button class="tk-stat" data-i="${i}" data-x="${x}" data-y="${y}"><small style="color:${cols[i]}">${l}</small><b>(${fmt(x)}, ${fmt(y)})</b></button>`).join("")}</div>` : `<p class="tk-dim">No roots, turning points or intersections in view. Zoom out or add a function.</p>`;
  }
  rows(); chips(); requestAnimationFrame(draw); window.addEventListener("resize", draw);
  b.oninput = (e) => { const i = e.target.dataset.i; if (i === undefined || !e.target.closest(".tk-fn")) return; S.f[i] = e.target.value; save(); draw(); };
  b.onclick = (e) => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.classList.contains("tk-stat")) { V.x = +t.dataset.x; V.y = +t.dataset.y; mark = { x: +t.dataset.x, i: +t.dataset.i }; draw(); return; }
    if (t.dataset.rm !== undefined) { S.f.splice(+t.dataset.rm, 1); mark = null; rows(); }
    else if (t.dataset.a === "add") { S.f.push(""); rows(); }
    else if (t.dataset.a === "reset") { Object.assign(V, { x: 0, y: 0, s: 40 }); mark = null; }
    else if (t.dataset.a === "gfs") { const gw = $("#gw", b), on = gw.classList.toggle("full"); document.body.classList.toggle("tk-gfs-lock", on); t.textContent = on ? "✕" : "⛶"; t.title = on ? "Exit full screen" : "Full screen"; requestAnimationFrame(draw); return; }
    else if (t.dataset.a === "gin") zoom(1.3);
    else if (t.dataset.a === "gout") zoom(1 / 1.3);
    else if (t.dataset.a === "pts") { keyPoints(); return; }
    else if (t.dataset.a === "png") { cv.toBlob((bl) => { const a = document.createElement("a"); a.href = URL.createObjectURL(bl); a.download = "roitx-graph.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }); return; }
    else if (t.dataset.o) S.o[t.dataset.o] = S.o[t.dataset.o] ? 0 : 1, chips();
    else return; save(); draw();
  };
  const P = new Map(); let start = null; const zoom = (k) => (V.s = Math.min(5000, Math.max(2, V.s * k)));
  cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); P.set(e.pointerId, [e.clientX, e.clientY]); start = P.size === 1 ? [e.clientX, e.clientY] : null; };
  cv.onpointermove = (e) => {
    if (!P.has(e.pointerId)) return; const o = P.get(e.pointerId), n = [e.clientX, e.clientY];
    if (P.size === 1) { V.x -= (n[0] - o[0]) / V.s; V.y += (n[1] - o[1]) / V.s; } else { const q = [...P.entries()].find(([id]) => id !== e.pointerId)[1], d0 = Math.hypot(o[0] - q[0], o[1] - q[1]), d1 = Math.hypot(n[0] - q[0], n[1] - q[1]); if (d0) zoom(d1 / d0); }
    P.set(e.pointerId, n); draw();
  };
  cv.onpointerup = (e) => { // a tap (not a drag) traces the nearest curve
    if (start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) < 6) {
      const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, x = V.x + (px - r.width / 2) / V.s; let best = null;
      curves.forEach((c, i) => { if (!c || c.imp) return; const y = ev(c, x), dd = Math.abs(r.height / 2 - (y - V.y) * V.s - py); if (isFinite(dd) && dd < 40 && (!best || dd < best.d)) best = { d: dd, i }; });
      mark = best ? { x, i: best.i } : null; if (!best) $("#gr", b).textContent = "Tap close to a curve to trace it."; draw();
    }
    P.delete(e.pointerId); start = null;
  };
  cv.onpointercancel = (e) => { P.delete(e.pointerId); start = null; };
  cv.addEventListener("wheel", (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); draw(); }, { passive: false });
};

/* ================= SOLVE ================= */
function polyRoots(co) {
  while (co.length && !co[0]) co.shift(); const n = co.length - 1; if (n < 1) return [];
  const a = co.map((c) => c / co[0]), mul = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]], sub = (p, q) => [p[0] - q[0], p[1] - q[1]], div = (p, q) => { const d = q[0] * q[0] + q[1] * q[1]; return [(p[0] * q[0] + p[1] * q[1]) / d, (p[1] * q[0] - p[0] * q[1]) / d]; };
  const rad = 1 + Math.max(...a.slice(1).map(Math.abs)); let z = Array.from({ length: n }, (_, k) => [rad * Math.cos(2 * Math.PI * k / n + .4), rad * Math.sin(2 * Math.PI * k / n + .4)]);
  for (let it = 0; it < 600; it++) for (let i = 0; i < n; i++) { let acc = [1, 0]; for (let k = 1; k <= n; k++) { acc = mul(acc, z[i]); acc[0] += a[k]; } let den = [1, 0]; for (let j = 0; j < n; j++) if (j !== i) den = mul(den, sub(z[i], z[j])); z[i] = sub(z[i], div(acc, den)); }
  return z.map(([re, im]) => [Math.abs(re) < 1e-9 ? 0 : re, Math.abs(im) < 1e-8 * (1 + Math.abs(re)) ? 0 : im]).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}
const cx = ([re, im]) => im ? `${fmt(re)} ${im < 0 ? "−" : "+"} ${fmt(Math.abs(im))}i` : fmt(re);
R.solve = (b) => {
  b.innerHTML = `<p class="tk-dim">Polynomial: coefficients, highest power first</p><input id="sp" value="1, -3, 2" placeholder="1, -3, 2  means x² − 3x + 2" inputmode="text"><div class="tk-row"><button class="tk-b" data-a="p">Solve polynomial</button></div><div id="so1"></div><p class="tk-dim" style="margin-top:18px">Any equation f(x) = 0 (search range below)</p><input id="se" placeholder="cos(x) - x" autocapitalize="off" spellcheck="false"><div class="tk-row"><input id="sl" value="-20" inputmode="decimal" style="width:45%"><input id="sh" value="20" inputmode="decimal" style="width:45%"></div><div class="tk-row"><button class="tk-b" data-a="n">Find roots</button></div><div id="so2"></div>`;
  b.onclick = (e) => {
    const a = e.target.dataset.a;
    if (e.target.dataset.v) return put(e.target.dataset.v);
    if (a === "p") {
      const co = nums($("#sp", b).value), o = $("#so1", b); if (co.length < 2 || co.length > 9 || !co.some((v) => v)) { o.innerHTML = `<p class="tk-dim">Enter 2 to 9 coefficients.</p>`; return; }
      const rt = polyRoots(co.slice()); let st = "";
      if (co.length === 3 && co[0]) { const D = co[1] ** 2 - 4 * co[0] * co[2]; st = `<div class="tk-stat"><small>Discriminant</small><b>D = b² − 4ac = ${fmt(D)} → ${D > 0 ? "two real roots" : D === 0 ? "one repeated root" : "two complex roots"}</b></div>`; }
      o.innerHTML = st + rt.map((r, i) => `<button class="tk-stat" data-v="${fmt(r[0])}"><small>x${i + 1}</small><b>${cx(r)}</b></button>`).join("");
    } else if (a === "n") {
      const o = $("#so2", b); let c; try { c = math.compile($("#se", b).value.replace(/^(.*)=(.*)$/, "($1)-($2)")); } catch (err) { o.innerHTML = `<p class="tk-dim">Check the expression.</p>`; return; }
      const lo = +$("#sl", b).value, hi = +$("#sh", b).value, N = 6000, s = Object.assign({}, vals()), F = (x) => { try { s.x = x; const v = c.evaluate(s); return typeof v === "number" ? v : NaN; } catch (err) { return NaN; } }, out = [];
      let pa = lo, pf = F(lo);
      for (let k = 1; k <= N; k++) { const x = lo + (hi - lo) * k / N, f = F(x); if (pf * f < 0 && Math.abs(pf - f) < 1e3) { let A = pa, B = x, fa = pf; for (let t = 0; t < 50; t++) { const m = (A + B) / 2, fm = F(m); if (fa * fm <= 0) B = m; else { A = m; fa = fm; } } out.push((A + B) / 2); } else if (f === 0) out.push(x); pa = x; pf = f; }
      o.innerHTML = out.length ? out.slice(0, 20).map((r, i) => `<button class="tk-stat" data-v="${fmt(r)}"><small>root ${i + 1}</small><b>x = ${fmt(r)}</b></button>`).join("") : `<p class="tk-dim">No real root found between ${lo} and ${hi}.</p>`;
    }
  };
};

/* ================= MATRIX ================= */
const toM = (s) => s.trim().split(/\n|;/).map((r) => nums(r)).filter((r) => r.length);
R.matrix = (b) => {
  b.innerHTML = `<p class="tk-dim">One row per line, numbers separated by spaces or commas</p><div class="tk-grid2"><div><small class="tk-dim">Matrix A</small><textarea id="ma">1 2\n3 4</textarea></div><div><small class="tk-dim">Matrix B</small><textarea id="mb">5 6\n7 8</textarea></div></div><div class="tk-chips">${[["det", "det A"], ["inv", "A⁻¹"], ["tr", "Aᵀ"], ["add", "A + B"], ["sub", "A − B"], ["mul", "A × B"], ["sol", "Solve A·x = B"]].map(([k, l]) => `<button data-op="${k}">${l}</button>`).join("")}</div><div id="mo"></div>`;
  b.onclick = (e) => {
    const op = e.target.dataset.op, o = $("#mo", b); if (e.target.dataset.v) return put(e.target.dataset.v); if (!op) return;
    try {
      const A = toM($("#ma", b).value), B = toM($("#mb", b).value);
      const r = { det: () => math.det(A), inv: () => math.inv(A), tr: () => math.transpose(A), add: () => math.add(A, B), sub: () => math.subtract(A, B), mul: () => math.multiply(A, B), sol: () => math.lusolve(A, B) }[op]();
      const arr = Array.isArray(r) ? r : r && r.toArray ? r.toArray() : r;
      o.innerHTML = Array.isArray(arr) ? `<table class="tk-t" style="margin-top:12px">${arr.map((row) => `<tr>${[].concat(row).map((v) => `<td style="text-align:center">${fmt(v)}</td>`).join("")}</tr>`).join("")}</table>` : `<button class="tk-stat" data-v="${fmt(arr)}"><small>Result</small><b>${fmt(arr)}</b></button>`;
    } catch (err) { o.innerHTML = `<p class="tk-dim" style="margin-top:12px">${esc(String(err.message || err).split("(")[0])}. Check the sizes: A × B needs A's columns = B's rows; det and inverse need a square A.</p>`; }
  };
};

/* ================= STATISTICS ================= */
R.stats = (b) => {
  b.innerHTML = `<p class="tk-dim">Enter numbers (spaces, commas or lines). Enter two numbers on every line (x y) for regression.</p><textarea id="sd" placeholder="12 15 15 18 21 30">${esc(LS("calcStats", ""))}</textarea><div id="so"></div>`;
  const run = () => {
    const raw = $("#sd", b).value; SV("calcStats", raw); const o = $("#so", b), lines = raw.split("\n").map(nums).filter((l) => l.length), card = (l, v) => `<button class="tk-stat" data-v="${v}"><small>${l}</small><b>${v}</b></button>`;
    if (lines.length >= 2 && lines.every((l) => l.length === 2)) {
      const x = lines.map((l) => l[0]), y = lines.map((l) => l[1]), n = x.length, mx = math.mean(x), my = math.mean(y), sxy = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0), sxx = x.reduce((s, v) => s + (v - mx) ** 2, 0), syy = y.reduce((s, v) => s + (v - my) ** 2, 0), m = sxy / sxx, c = my - m * mx, r = sxy / Math.sqrt(sxx * syy);
      o.innerHTML = `<div class="tk-grid2">${card("pairs (n)", n)}${card("slope b", fmt(m))}${card("intercept a", fmt(c))}${card("correlation r", fmt(r))}${card("r²", fmt(r * r))}${card("mean x, y", fmt(mx) + ", " + fmt(my))}</div><div class="tk-row"><button class="tk-b" data-g="${fmt(c)}+${fmt(m)}*x">Plot line y = a + bx in Graph</button></div>`; return;
    }
    const d = lines.flat(); if (!d.length) { o.innerHTML = ""; return; } const mode = math.mode(d), q = (p) => math.quantileSeq(d, p);
    o.innerHTML = `<div class="tk-grid2">${card("count", d.length)}${card("sum", fmt(math.sum(d)))}${card("mean", fmt(math.mean(d)))}${card("median", fmt(math.median(d)))}${card("mode", mode.length === d.length ? "none" : mode.map(fmt).join(", "))}${card("range", fmt(math.max(d) - math.min(d)))}${card("min", fmt(math.min(d)))}${card("max", fmt(math.max(d)))}${card("Q1", fmt(q(.25)))}${card("Q3", fmt(q(.75)))}${card("std dev (population)", fmt(math.std(d, "uncorrected")))}${card("std dev (sample)", d.length > 1 ? fmt(math.std(d)) : "–")}${card("variance (population)", fmt(math.variance(d, "uncorrected")))}${card("variance (sample)", d.length > 1 ? fmt(math.variance(d)) : "–")}</div>`;
  };
  run(); b.oninput = run;
  b.onclick = (e) => { const t = e.target.closest("button"); if (!t) return; if (t.dataset.v && t.dataset.v !== "none" && t.dataset.v !== "–") put(t.dataset.v); else if (t.dataset.g) { const s = LS("calcGraph", {}); s.f = [t.dataset.g]; SV("calcGraph", s); T.show("graph"); } };
};

/* ================= NUMBER BASE ================= */
R.base = (b) => {
  b.innerHTML = `<div class="tk-conv"><input id="bv" value="255" placeholder="Enter a number" autocapitalize="off" spellcheck="false"><select id="bf"><option value="10">Decimal (10)</option><option value="2">Binary (2)</option><option value="8">Octal (8)</option><option value="16">Hex (16)</option></select></div><div id="bo" style="margin-top:12px"></div>`;
  const run = () => {
    const s = $("#bv", b).value.trim().replace(/^0[xb]/i, "").toUpperCase(), f = +$("#bf", b).value, ok = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9A-F]+$/ }[f], o = $("#bo", b);
    if (!s || !ok.test(s)) { o.innerHTML = `<p class="tk-dim">Use only digits valid for base ${f}.</p>`; return; }
    const n = BigInt(f === 10 ? s : (f === 16 ? "0x" : f === 8 ? "0o" : "0b") + s);
    o.innerHTML = [["Binary", 2], ["Octal", 8], ["Decimal", 10], ["Hexadecimal", 16]].map(([l, bs]) => { const v = n.toString(bs).toUpperCase(); return `<button class="tk-stat" data-v="${v}"><small>${l}</small><b style="word-break:break-all">${v}</b></button>`; }).join("");
  };
  run(); b.oninput = run; b.onchange = run;
  b.onclick = (e) => { const t = e.target.closest("[data-v]"); if (t) T.copy(t.dataset.v); };
};
})();
