/* ROITX Extended Engine (Part 2)
   Load AFTER calc-ext.js.  CONST, CONV, MATRIX, CMPLX, MODE, CLR (SHIFT+AC), INS (SHIFT+DEL),
   Fix / Sci / Norm display, saved DEG/RAD, fixed ▲▼ history for equations.
   Uses the Toolkit's theme classes (.tk, .tk-sheet …) so it looks the same in all 4 themes. */
(() => {
"use strict";
const E = window.ROITX_EXT;
if (!E || !window.math) return;
const M = window.math;
const $q = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const LSget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const LSset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const say = (m) => { const t = window.ROITX_TK; if (t) t.toast(m); };
const baseF = window.formatFinal;
const put = (text) => { insertAtCursor(text); if (text.endsWith("(")) { insertAtCursor(")"); cursorPos++; } updateDisplay(); };

/* ---------- generic bottom sheet ---------- */
let sheetEl = null, escFn = null;
function closeSheet() {
  if (!sheetEl) return;
  const el = sheetEl; sheetEl = null; el.classList.remove("on"); setTimeout(() => el.remove(), 260);
  if (escFn) { document.removeEventListener("keydown", escFn); escFn = null; }
}
function sheet(title, html, tall) {
  closeSheet();
  const old = document.getElementById("rxs"); if (old) old.remove();
  const el = document.createElement("div"); el.className = "tk"; el.id = "rxs"; el.style.zIndex = 920;
  el.innerHTML = `<div class="tk-sheet" style="${tall ? "" : "height:auto;"}max-height:88dvh"><div class="tk-head"><b>${title}</b><span class="tk-hb"><button class="tk-x tk-cl" aria-label="Close">✕</button></span></div><div class="tk-body" style="${tall ? "" : "flex:0 1 auto;min-height:0"}">${html}</div></div>`;
  document.body.append(el); sheetEl = el;
  requestAnimationFrame(() => el.classList.add("on"));
  el.addEventListener("click", (e) => { if (e.target === el || e.target.closest(".tk-cl")) closeSheet(); });
  escFn = (e) => { if (e.key === "Escape") closeSheet(); };
  document.addEventListener("keydown", escFn);
  return el;
}

/* ---------- CONST ---------- */
const CONSTS = [
  ["Speed of light", "c", "299792458", "m/s"], ["Planck constant", "h", "6.62607015e-34", "J·s"], ["Reduced Planck", "ħ", "1.054571817e-34", "J·s"],
  ["Elementary charge", "e", "1.602176634e-19", "C"], ["Boltzmann constant", "k", "1.380649e-23", "J/K"], ["Avogadro number", "Nₐ", "6.02214076e23", "1/mol"],
  ["Gas constant", "R", "8.314462618", "J/(mol·K)"], ["Gravitational constant", "G", "6.6743e-11", "m³/(kg·s²)"], ["Standard gravity", "g", "9.80665", "m/s²"],
  ["Vacuum permittivity", "ε₀", "8.8541878128e-12", "F/m"], ["Vacuum permeability", "μ₀", "1.25663706212e-6", "N/A²"], ["Electron mass", "mₑ", "9.1093837015e-31", "kg"],
  ["Proton mass", "mₚ", "1.67262192369e-27", "kg"], ["Neutron mass", "mₙ", "1.67492749804e-27", "kg"], ["Atomic mass unit", "u", "1.6605390666e-27", "kg"],
  ["Stefan–Boltzmann", "σ", "5.670374419e-8", "W/(m²·K⁴)"], ["Faraday constant", "F", "96485.33212", "C/mol"], ["Rydberg constant", "R∞", "10973731.56816", "1/m"],
  ["Bohr radius", "a₀", "5.29177210903e-11", "m"], ["Fine-structure constant", "α", "7.2973525693e-3", ""], ["Standard atmosphere", "atm", "101325", "Pa"],
  ["Molar volume (STP)", "Vₘ", "0.02241396954", "m³/mol"], ["Wien displacement", "b", "2.897771955e-3", "m·K"], ["Bohr magneton", "μB", "9.2740100783e-24", "J/T"],
  ["Coulomb constant", "kₑ", "8.9875517923e9", "N·m²/C²"], ["Electron volt", "eV", "1.602176634e-19", "J"], ["Earth mass", "M⊕", "5.9722e24", "kg"],
  ["Earth radius", "R⊕", "6371000", "m"], ["Astronomical unit", "AU", "149597870700", "m"], ["Light-year", "ly", "9460730472580800", "m"]
];
function openConst() {
  const draw = (q) => CONSTS.filter((c) => (c[0] + c[1]).toLowerCase().includes(q)).map((c) => `<button class="tk-fm" data-v="${c[2]}"><small>${esc(c[1])} · ${esc(c[3])}</small><b>${esc(c[0])}</b><span class="tk-dim">${esc(c[2])}</span></button>`).join("") || `<div class="tk-empty">No constant found.</div>`;
  const el = sheet("CONSTANTS", `<input id="rq" type="search" placeholder="Search constants…" autocomplete="off"><div id="rl">${draw("")}</div>`, true);
  $q("#rq", el).oninput = (e) => { $q("#rl", el).innerHTML = draw(e.target.value.toLowerCase()); };
  $q("#rl", el).onclick = (e) => { const t = e.target.closest("[data-v]"); if (t) { closeSheet(); put(t.dataset.v); } };
}

/* ---------- CONV ---------- */
const U = { Length: { m: 1, km: 1e3, cm: .01, mm: .001, mile: 1609.344, yard: .9144, ft: .3048, inch: .0254, "nautical mile": 1852 }, Mass: { kg: 1, g: .001, mg: 1e-6, tonne: 1e3, lb: .45359237, oz: .028349523 }, Time: { s: 1, min: 60, hour: 3600, day: 86400, week: 604800, year: 31557600 }, Area: { "m²": 1, "km²": 1e6, "cm²": 1e-4, hectare: 1e4, acre: 4046.8564, "ft²": .09290304 }, Volume: { L: 1, mL: .001, "m³": 1e3, gallon: 3.785411784, cup: .2365882365 }, Speed: { "m/s": 1, "km/h": 1 / 3.6, mph: .44704, knot: .514444 }, Energy: { J: 1, kJ: 1e3, cal: 4.184, kcal: 4184, kWh: 3.6e6, eV: 1.602176634e-19 }, Pressure: { Pa: 1, kPa: 1e3, bar: 1e5, atm: 101325, mmHg: 133.322, psi: 6894.757 }, Power: { W: 1, kW: 1e3, hp: 745.699872 }, Angle: { "°": 1, rad: 180 / Math.PI, grad: .9 }, Temperature: { "°C": 0, "°F": 0, K: 0 } };
const convert = (v, f, t, c) => { if (c === "Temperature") { const k = f === "°C" ? v : f === "°F" ? (v - 32) * 5 / 9 : v - 273.15; return t === "°C" ? k : t === "°F" ? k * 9 / 5 + 32 : k + 273.15; } return v * U[c][f] / U[c][t]; };
function openConv() {
  let start = "1";
  try { if (exp) { const v = E.evalExp(exp); if (typeof v === "number" && isFinite(v)) start = String(+v.toPrecision(10)); } else if (isFinite(lastAnswer)) start = lastAnswer; } catch (e) {}
  let cat = LSget("calcUnit", "Length"); if (!U[cat]) cat = "Length";
  const el = sheet("CONV", `<select id="uc">${Object.keys(U).map((k) => `<option ${k === cat ? "selected" : ""}>${k}</option>`).join("")}</select><div class="tk-conv"><input id="uv" inputmode="decimal" value="${esc(start)}"><select id="uf"></select><button class="tk-sw" id="us" aria-label="Swap units">⇅</button><input id="ur" readonly><select id="ut"></select></div><div class="tk-row"><button class="tk-b" id="ui">Insert result</button></div>`);
  const uf = $q("#uf", el), ut = $q("#ut", el);
  const run = () => { const v = parseFloat($q("#uv", el).value); $q("#ur", el).value = isFinite(v) ? +convert(v, uf.value, ut.value, cat).toPrecision(10) : ""; };
  const units = () => { const o = Object.keys(U[cat]).map((u) => `<option>${u}</option>`).join(""); uf.innerHTML = ut.innerHTML = o; ut.selectedIndex = Math.min(1, ut.options.length - 1); run(); };
  $q("#uc", el).onchange = (e) => { cat = e.target.value; LSset("calcUnit", cat); units(); };
  el.addEventListener("input", run); el.addEventListener("change", run); units();
  $q("#us", el).onclick = () => { const a = uf.selectedIndex; uf.selectedIndex = ut.selectedIndex; ut.selectedIndex = a; run(); };
  $q("#ui", el).onclick = () => { const v = $q("#ur", el).value; if (v) { closeSheet(); put(v); } };
}

/* ---------- MATRIX ---------- */
let matAns = null;
const blank = (r, c) => Array.from({ length: r }, () => Array(c).fill("0"));
const mats = () => { const m = LSget("calcMats", {}); ["A", "B", "C"].forEach((k) => { if (!Array.isArray(m[k])) m[k] = blank(2, 2); }); return m; };
const numM = (a) => a.map((r) => r.map((v) => { const n = Number(v); return isFinite(n) ? n : 0; }));
const cell = (v) => (v && typeof v === "object" && "re" in v ? String(E.fmtResult(v).text) : String(+Number(v).toPrecision(8)));
function matrixHTML(arr) {
  return `<table class="tk-t" style="margin:8px 0">${arr.map((r) => `<tr>${r.map((v) => `<td style="text-align:center">${esc(cell(v))}</td>`).join("")}</tr>`).join("")}</table>`;
}
function showMatrix(raw) {
  const a = raw.map((r) => (Array.isArray(r) ? r : [r]));
  matAns = a;
  setTimeout(() => {
    const el = sheet("MATRIX RESULT", `<p class="tk-dim">MatAns · ${a.length}×${a[0].length}</p>${matrixHTML(a)}<div class="tk-row"><button class="tk-b" data-s="A">Save to MatA</button><button class="tk-b" data-s="B">Save to MatB</button><button class="tk-b" data-s="C">Save to MatC</button></div><div class="tk-row"><button class="tk-b" data-i="MatAns">Insert MatAns</button></div>`);
    el.addEventListener("click", (e) => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.s) { const m = mats(); m[t.dataset.s] = a.map((r) => r.map(cell)); LSset("calcMats", m); say(`Saved to Mat${t.dataset.s}`); }
      else if (t.dataset.i) { closeSheet(); put(t.dataset.i); }
    });
  }, 0);
  return { text: `Mat ${a.length}×${a[0].length}`, machine: "0" };
}
function openMatrix() {
  let cur = "A";
  const el = sheet("MATRIX", `<div class="tk-chips" id="mt"></div><div class="tk-row"><span class="tk-dim">Rows</span><select id="mr" style="width:70px"></select><span class="tk-dim">Cols</span><select id="mc" style="width:70px"></select><button class="tk-b" data-a="id">Identity</button><button class="tk-b" data-a="zero">Clear</button></div><div id="mg"></div><p class="tk-dim" style="margin-top:12px">Insert in calculator:</p><div class="tk-chips" id="mi"></div><p class="tk-dim">Example: <b>MatA × MatB</b> or <b>Det(MatA)</b>, then press =. Matrix answers open in a sheet.</p>`);
  const sel = (id, n) => { $q(id, el).innerHTML = [1, 2, 3, 4].map((v) => `<option ${v === n ? "selected" : ""}>${v}</option>`).join(""); };
  const draw = () => {
    const m = mats()[cur], r = m.length, c = m[0].length;
    $q("#mt", el).innerHTML = ["A", "B", "C"].map((k) => `<button class="${k === cur ? "on" : ""}" data-t="${k}">Mat${k}</button>`).join("");
    sel("#mr", r); sel("#mc", c);
    $q("#mg", el).innerHTML = `<div style="display:grid;grid-template-columns:repeat(${c},1fr);gap:6px">${m.map((row, i) => row.map((v, j) => `<input inputmode="decimal" data-i="${i}" data-j="${j}" value="${esc(v)}" style="text-align:center;padding:9px 4px">`).join("")).join("")}</div>`;
    $q("#mi", el).innerHTML = ["MatA", "MatB", "MatC", "MatAns", "Det(", "Trn(", "Inv(", "Ident(", "×", "+", "−"].map((t) => `<button data-p="${t}">${t}</button>`).join("");
  };
  const resize = () => {
    const all = mats(), r = +$q("#mr", el).value, c = +$q("#mc", el).value, old = all[cur];
    all[cur] = Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => (old[i] && old[i][j] !== undefined ? old[i][j] : "0")));
    LSset("calcMats", all); draw();
  };
  el.addEventListener("change", (e) => { if (e.target.id === "mr" || e.target.id === "mc") resize(); });
  el.addEventListener("input", (e) => { const i = e.target.dataset.i; if (i === undefined) return; const all = mats(); all[cur][+i][+e.target.dataset.j] = e.target.value.trim() || "0"; LSset("calcMats", all); });
  el.addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.t) { cur = t.dataset.t; draw(); }
    else if (t.dataset.p) { closeSheet(); put(t.dataset.p); }
    else if (t.dataset.a) {
      const all = mats(), r = all[cur].length, c = all[cur][0].length;
      all[cur] = t.dataset.a === "id" ? Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => (i === j ? "1" : "0"))) : blank(r, c);
      LSset("calcMats", all); draw();
    }
  });
  draw();
}

/* ---------- CMPLX ---------- */
function openCmplx() {
  const items = [["i", "i", "imaginary unit"], ["∠", "∠", "polar entry  r∠θ"], ["abs(", "Abs", "modulus"], ["Arg(", "Arg", "argument (angle)"], ["Conj(", "Conj", "conjugate"], ["Re(", "Re", "real part"], ["Im(", "Im", "imaginary part"]];
  const el = sheet("COMPLEX", `<p class="tk-dim">Type numbers like 3+4i, then press =</p><div class="tk-grid2">${items.map(([v, l, d]) => `<button class="tk-stat" data-p="${v}"><small>${d}</small><b>${l}</b></button>`).join("")}</div><p class="tk-dim" style="margin-top:14px">Convert last answer:</p><div class="tk-row"><button class="tk-b" data-c="pol">▶ r∠θ</button><button class="tk-b" data-c="rect">▶ a+bi</button></div>`);
  el.addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.p) { closeSheet(); put(t.dataset.p); return; }
    if (!t.dataset.c) return;
    const z = E.last(); if (!z || typeof z !== "object" || !("re" in z)) { say("Last answer is not complex"); return; }
    closeSheet();
    if (t.dataset.c === "pol") { const th = isDeg ? Math.atan2(z.im, z.re) * 180 / Math.PI : Math.atan2(z.im, z.re); resDiv.innerText = `${baseF(Math.hypot(z.re, z.im))}∠${baseF(th)}`; }
    else resDiv.innerText = E.fmtResult(z).text;
  });
}

/* ---------- MODE: angle, display digits, fractions ---------- */
let mode = Object.assign({ deg: true, disp: "norm", n: 4, mixed: false }, LSget("calcMode", {}));
const saveMode = () => LSset("calcMode", mode);
window.formatFinal = (n) => {
  if (mode.disp === "fix") return Number(n).toFixed(mode.n);
  if (mode.disp === "sci") return Number(n).toExponential(Math.max(0, mode.n - 1));
  return baseF(n);
};
const inds = {};
function mkInd(id, txt) {
  const box = $q(".status-indicators"); if (!box) return;
  const s = document.createElement("span"); s.className = "indicator"; s.id = id; s.textContent = txt; s.style.display = "none"; box.append(s); inds[id] = s;
}
mkInd("dispInd", "FIX"); mkInd("insInd", "INS");
function paintInd() {
  const d = inds.dispInd; if (d) { d.style.display = mode.disp === "norm" ? "none" : ""; d.textContent = mode.disp === "fix" ? "FIX" : "SCI"; d.classList.add("active"); }
}
function applyMode() {
  if (isDeg !== mode.deg) toggleDegRad();
  E.setFlags({ mixed: mode.mixed }); paintInd();
}
const _tdr = window.toggleDegRad;
window.toggleDegRad = () => { _tdr(); mode.deg = isDeg; saveMode(); };
function openMode() {
  const seg = (name, opts, curv) => `<div class="tk-chips" data-g="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(curv) ? "on" : ""}">${l}</button>`).join("")}</div>`;
  const el = sheet("MODE", `<p class="tk-dim">Angle unit</p>${seg("deg", [[1, "Degree"], [0, "Radian"]], mode.deg ? 1 : 0)}<p class="tk-dim">Number display</p>${seg("disp", [["norm", "Norm"], ["fix", "Fix"], ["sci", "Sci"]], mode.disp)}<div class="tk-row" id="mdr" style="${mode.disp === "norm" ? "display:none" : ""}"><span class="tk-dim">Digits</span><input id="mdn" inputmode="numeric" value="${mode.n}" style="width:80px"></div><p class="tk-dim">Fraction result</p>${seg("mixed", [[0, "Improper  7/3"], [1, "Mixed  2 1/3"]], mode.mixed ? 1 : 0)}`);
  el.addEventListener("click", (e) => {
    const t = e.target.closest("[data-v]"); if (!t) return;
    const g = t.parentElement.dataset.g, v = t.dataset.v;
    if (g === "deg") { mode.deg = v === "1"; } else if (g === "disp") { mode.disp = v; } else if (g === "mixed") { mode.mixed = v === "1"; }
    t.parentElement.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === t));
    $q("#mdr", el).style.display = mode.disp === "norm" ? "none" : "";
    saveMode(); applyMode();
  });
  el.addEventListener("input", (e) => { if (e.target.id === "mdn") { const n = parseInt(e.target.value, 10); if (n >= 0 && n <= 9) { mode.n = n; saveMode(); } } });
}

/* ---------- CLR (also SHIFT + AC) ---------- */
function openClr() {
  const el = sheet("CLEAR", `<div class="tk-grid2">${[["mem", "Memory (M, Ans)"], ["vars", "Variables A–F X Y M"], ["mat", "Matrices"], ["hist", "History"], ["setup", "Setup (MODE)"], ["all", "Everything"]].map(([k, l]) => `<button class="tk-stat" data-k="${k}"><small>Clear</small><b>${l}</b></button>`).join("")}</div>`);
  el.addEventListener("click", (e) => {
    const t = e.target.closest("[data-k]"); if (!t) return; const k = t.dataset.k, all = k === "all";
    if (k === "mem" || all) { memory = 0; lastAnswer = "0"; E.resetAns(); const v = LSget("calcVars", {}); delete v.M; LSset("calcVars", v); }
    if (k === "vars" || all) { LSset("calcVars", {}); memory = 0; }
    if (k === "mat" || all) { LSset("calcMats", {}); matAns = null; }
    if (k === "hist" || all) LSset("calcHistory", []);
    if (k === "setup" || all) { mode = { deg: true, disp: "norm", n: 4, mixed: false }; saveMode(); applyMode(); }
    if (all) { exp = ""; cursorPos = 0; resDiv.innerText = "0"; updateDisplay(); }
    closeSheet(); say("Cleared");
  });
}

/* ---------- INS (SHIFT + DEL) overwrite mode ---------- */
let ovr = false;
const _insert = window.insertAtCursor;
window.insertAtCursor = (v) => {
  if (ovr && cursorPos > 0 && v !== ")") { const pos = exp.length - cursorPos, k = Math.min(cursorPos, v.length); exp = exp.slice(0, pos) + exp.slice(pos + k); cursorPos -= k; }
  _insert(v);
};
const _del = window.del;
window.del = () => { if (isShift) { toggleShift(); ovr = !ovr; if (inds.insInd) { inds.insInd.style.display = ovr ? "" : "none"; inds.insInd.classList.add("active"); } say(ovr ? "Overwrite mode" : "Insert mode"); return; } _del(); };
const _clr = window.clearAll;
window.clearAll = () => { if (isShift) { toggleShift(); openClr(); return; } _clr(); };

/* ---------- ▲ ▼ history that keeps "=" inside equations ---------- */
window.navigateHistory = (dir) => {
  const h = LSget("calcHistory", []); if (!h.length) return;
  historyIndex = Math.min(Math.max(-1, historyIndex + dir), h.length - 1);
  if (historyIndex === -1) { window.clearAll(); return; }
  const item = h[h.length - 1 - historyIndex];
  exp = item.slice(0, item.lastIndexOf("=")); cursorPos = 0;
  resDiv.innerText = "HIST " + (historyIndex + 1); updateDisplay();
};

/* ---------- connect to calc-ext.js ---------- */
window.ROITX_MORE = {
  keys: { CONST: openConst, CONV: openConv, MATRIX: openMatrix, CMPLX: openCmplx, MODE: openMode, CLR: openClr },
  scope: () => { const m = mats(), o = { MatA: numM(m.A), MatB: numM(m.B), MatC: numM(m.C) }; if (matAns) o.MatAns = numM(matAns); return o; },
  showMatrix
};
applyMode();
})();
