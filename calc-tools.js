/* ROITX Toolkit — drop-in add-on for calculator.js (no changes to the core engine needed) */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const LS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const SV = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const r = String.raw;
let tT; const toast = (m) => { let t = $("#tkToast"); if (!t) { t = document.createElement("div"); t.id = "tkToast"; t.className = "tk-toast"; document.body.append(t); } t.textContent = m; t.classList.add("on"); clearTimeout(tT); tT = setTimeout(() => t.classList.remove("on"), 1600); };
const copy = async (s) => { try { await navigator.clipboard.writeText(s); toast("Copied"); } catch (e) { toast("Copy not allowed here"); } };
const put = (s) => { insertAtCursor(String(s)); updateDisplay(); close(); toast("Added to calculator"); };

/* ---- Variables A-F, X, Y, M: used automatically inside calculations ---- */
const VN = ["A", "B", "C", "D", "E", "F", "X", "Y", "M"];
const vals = () => { const v = LS("calcVars", {}), o = {}; VN.forEach((k) => { if (v[k] !== undefined && v[k] !== "" && isFinite(v[k])) o[k] = +v[k]; }); if (o.M === undefined && typeof memory !== "undefined" && memory) o.M = memory; return o; };
const _pp = window.preprocess;
window.preprocess = (raw) => { const s = _pp(raw), v = vals(); return s.replace(/\b[A-FXYM]\b/g, (m) => (m in v ? `(${v[m]})` : m)); };

/* ---- Shell ---- */
const TABS = [["hist", "History"], ["vars", "Variables"], ["note", "Notebook"], ["graph", "Graph"], ["form", "Formulas"], ["unit", "Units"], ["chem", "Chemistry"]];
let root, cur = "hist", gdraw = null; const R = {};
function build() {
  root = document.createElement("div"); root.className = "tk";
  root.innerHTML = `<div class="tk-sheet" role="dialog" aria-label="ROITX Toolkit"><div class="tk-head"><b>ROITX TOOLKIT</b><span class="tk-hb"><button class="tk-x tk-fs" aria-label="Full screen" title="Full screen">⛶</button><button class="tk-x tk-cl" aria-label="Close">✕</button></span></div><div class="tk-tabs">${TABS.map((t) => `<button data-t="${t[0]}">${t[1]}</button>`).join("")}</div><div class="tk-body"></div></div>`;
  document.body.append(root);
  root.addEventListener("click", (e) => { const fs = e.target.closest(".tk-fs"); if (fs) { const on = $(".tk-sheet", root).classList.toggle("full"); fs.title = on ? "Exit full screen" : "Full screen"; fs.textContent = on ? "⤡" : "⛶"; dispatchEvent(new Event("resize")); return; } if (e.target === root || e.target.closest(".tk-cl")) close(); const b = e.target.closest(".tk-tabs button"); if (b) show(b.dataset.t); });
}
function open(t) { if (!root) build(); root.classList.add("on"); document.body.style.overflow = "hidden"; show(t || cur); }
function close() { if (root) root.classList.remove("on"); document.body.style.overflow = ""; }
function show(t) {
  cur = t; gdraw = null;
  root.querySelectorAll(".tk-tabs button").forEach((b) => { const on = b.dataset.t === t; b.classList.toggle("on", on); if (on) b.scrollIntoView({ inline: "center", block: "nearest" }); });
  const body = $(".tk-body", root), fresh = body.cloneNode(false); body.replaceWith(fresh); R[t](fresh);
}
addEventListener("keydown", (e) => { if (e.key !== "Escape") return; const g = $(".tk-gw.full"); if (g) { $("[data-a=gfs]", g).click(); return; } close(); });
addEventListener("resize", () => gdraw && gdraw());

/* ---- History ---- */
R.hist = (b) => {
  const h = LS("calcHistory", []).slice().reverse();
  if (!h.length) { b.innerHTML = `<div class="tk-empty">No calculations yet.<br>Your last 20 results will appear here.</div>`; return; }
  b.innerHTML = `<div class="tk-row tk-end"><button class="tk-b" data-a="clr">Clear history</button></div>` + h.map((x) => { const i = x.lastIndexOf("="), e = x.slice(0, i), v = x.slice(i + 1); return `<div class="tk-item"><button class="e" data-e="${esc(e)}">${esc(e)}<small>= ${esc(v)}</small></button><button class="u" data-r="${esc(v)}">Use</button></div>`; }).join("");
  b.onclick = (ev) => {
    const t = ev.target.closest("button"); if (!t) return;
    if (t.dataset.a) { SV("calcHistory", []); R.hist(b); }
    else if (t.dataset.e !== undefined) { clearAll(); put(t.dataset.e); }
    else if (t.dataset.r !== undefined) put(t.dataset.r);
  };
};

/* ---- Variables ---- */
R.vars = (b) => {
  const v = LS("calcVars", {});
  b.innerHTML = `<p class="tk-dim" style="margin-bottom:12px">Saved values are used when you press ALPHA + a key (A, B, C, D, E, F, X, Y, M).</p>` + VN.map((k) => `<div class="tk-var"><span>${k}</span><input inputmode="decimal" data-k="${k}" value="${esc(v[k] ?? "")}" placeholder="not set"><button class="u" data-ans="${k}">Ans</button></div>`).join("") + `<div class="tk-row"><span class="tk-dim">Current Ans = <b style="color:var(--accent)">${esc(lastAnswer)}</b></span></div>`;
  const save = (k, val) => { const o = LS("calcVars", {}); o[k] = val; SV("calcVars", o); if (k === "M" && isFinite(val) && val !== "") memory = +val; };
  b.oninput = (e) => { const k = e.target.dataset.k; if (k) save(k, e.target.value.trim()); };
  b.onclick = (e) => { const k = e.target.dataset.ans; if (!k) return; save(k, lastAnswer); $(`[data-k="${k}"]`, b).value = lastAnswer; toast(`${k} = ${lastAnswer}`); };
};

/* ---- Notebook ---- */
R.note = (b) => {
  const draw = () => {
    const n = LS("calcNotes", []);
    b.innerHTML = `<div class="tk-row"><button class="tk-b" data-a="new">+ New note</button><button class="tk-b" data-a="ans">+ Note from Ans</button></div>` + (n.length ? n.map((t, i) => `<div class="tk-note"><textarea data-i="${i}" placeholder="Write here…">${esc(t)}</textarea><button class="d" data-d="${i}" aria-label="Delete note">✕</button></div>`).join("") : `<div class="tk-empty">Keep working steps, formulas and answers here.</div>`);
  };
  draw();
  b.oninput = (e) => { const i = e.target.dataset.i; if (i === undefined) return; const n = LS("calcNotes", []); n[i] = e.target.value; SV("calcNotes", n); };
  b.onclick = (e) => {
    const t = e.target.closest("button"); if (!t) return; const n = LS("calcNotes", []);
    if (t.dataset.a === "new") n.unshift(""); else if (t.dataset.a === "ans") n.unshift("Answer: " + lastAnswer); else if (t.dataset.d !== undefined) n.splice(+t.dataset.d, 1); else return;
    SV("calcNotes", n); draw();
  };
};

/* ---- Formulas ---- */
const F = [
  ["Algebra", "Quadratic roots", r`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`], ["Algebra", "Square of a sum", r`(a+b)^2=a^2+2ab+b^2`], ["Algebra", "Sum of an AP", r`S_n=\frac{n}{2}\left[2a+(n-1)d\right]`], ["Algebra", "Sum of a GP", r`S_n=\frac{a(r^n-1)}{r-1}`],
  ["Trigonometry", "Identity", r`\sin^2\theta+\cos^2\theta=1`], ["Trigonometry", "Double angle", r`\sin 2\theta=2\sin\theta\cos\theta`], ["Trigonometry", "Sum of angles", r`\sin(A+B)=\sin A\cos B+\cos A\sin B`], ["Trigonometry", "Sine rule", r`\frac{a}{\sin A}=\frac{b}{\sin B}=\frac{c}{\sin C}`],
  ["Calculus", "Power rule", r`\frac{d}{dx}x^n=nx^{n-1}`], ["Calculus", "Product rule", r`(uv)'=u'v+uv'`], ["Calculus", "Power integral", r`\int x^n\,dx=\frac{x^{n+1}}{n+1}+C`], ["Calculus", "By parts", r`\int u\,dv=uv-\int v\,du`],
  ["Geometry", "Circle area", r`A=\pi r^2`], ["Geometry", "Sphere volume", r`V=\frac{4}{3}\pi r^3`], ["Geometry", "Cone volume", r`V=\frac{1}{3}\pi r^2h`], ["Geometry", "Distance formula", r`d=\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}`],
  ["Physics", "Equation of motion", r`s=ut+\frac{1}{2}at^2`], ["Physics", "Newton's second law", r`F=ma`], ["Physics", "Ohm's law", r`V=IR`], ["Physics", "Kinetic energy", r`E_k=\frac{1}{2}mv^2`],
  ["Chemistry", "Ideal gas law", r`PV=nRT`], ["Chemistry", "Molarity", r`M=\frac{n_{\text{solute}}}{V_{\text{litre}}}`]
];
R.form = (b) => {
  b.innerHTML = `<input id="fq" type="search" placeholder="Search formulas…" autocomplete="off"><div id="fl"></div>`;
  const list = $("#fl", b), draw = () => {
    const q = $("#fq", b).value.toLowerCase(), it = F.filter((f) => (f[0] + f[1]).toLowerCase().includes(q));
    list.innerHTML = it.length ? it.map((f) => `<button class="tk-fm" data-x="${esc(f[2])}"><small>${f[0]}</small><b>${f[1]}</b><div class="tk-tex">$$${esc(f[2])}$$</div></button>`).join("") : `<div class="tk-empty">No formula found.</div>`;
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([list]).catch(() => {});
  };
  draw(); $("#fq", b).oninput = draw;
  list.onclick = (e) => { const t = e.target.closest("[data-x]"); if (t) copy(t.dataset.x); };
};

/* ---- Unit converter ---- */
const U = { Length: { m: 1, km: 1e3, cm: .01, mm: .001, mile: 1609.344, ft: .3048, inch: .0254 }, Mass: { kg: 1, g: .001, mg: 1e-6, tonne: 1e3, lb: .45359237, oz: .028349523 }, Time: { s: 1, min: 60, hour: 3600, day: 86400, week: 604800, year: 31557600 }, Area: { "m²": 1, "km²": 1e6, "cm²": 1e-4, hectare: 1e4, acre: 4046.8564, "ft²": .09290304 }, Volume: { L: 1, mL: .001, "m³": 1e3, gallon: 3.785411784, cup: .2365882365 }, Speed: { "m/s": 1, "km/h": 1 / 3.6, mph: .44704, knot: .514444 }, Energy: { J: 1, kJ: 1e3, cal: 4.184, kcal: 4184, kWh: 3.6e6, eV: 1.602176634e-19 }, Pressure: { Pa: 1, kPa: 1e3, bar: 1e5, atm: 101325, mmHg: 133.322, psi: 6894.757 }, Data: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824 }, Temperature: { "°C": 0, "°F": 0, K: 0 } };
const conv = (v, f, t, c) => { if (c === "Temperature") { const k = f === "°C" ? v : f === "°F" ? (v - 32) * 5 / 9 : v - 273.15; return t === "°C" ? k : t === "°F" ? k * 9 / 5 + 32 : k + 273.15; } return v * U[c][f] / U[c][t]; };
R.unit = (b) => {
  const cats = Object.keys(U); let cat = LS("calcUnit", "Length");
  b.innerHTML = `<select id="uc">${cats.map((k) => `<option ${k === cat ? "selected" : ""}>${k}</option>`).join("")}</select><div class="tk-conv"><input id="uv" inputmode="decimal" value="1"><select id="uf"></select><button class="tk-sw" id="us" aria-label="Swap units">⇅</button><input id="ur" readonly><select id="ut"></select></div><div class="tk-row"><button class="tk-b" id="ui">Insert result in calculator</button></div>`;
  const uf = $("#uf", b), ut = $("#ut", b), run = () => { const v = parseFloat($("#uv", b).value); $("#ur", b).value = isFinite(v) ? +conv(v, uf.value, ut.value, cat).toPrecision(9) : ""; };
  const units = () => { const k = Object.keys(U[cat]), o = k.map((u) => `<option>${u}</option>`).join(""); uf.innerHTML = ut.innerHTML = o; ut.selectedIndex = 1; run(); };
  $("#uc", b).onchange = (e) => { cat = e.target.value; SV("calcUnit", cat); units(); };
  b.oninput = run; b.onchange = run; units();
  $("#us", b).onclick = () => { const a = uf.selectedIndex; uf.selectedIndex = ut.selectedIndex; ut.selectedIndex = a; run(); };
  $("#ui", b).onclick = () => { const v = $("#ur", b).value; if (v) put(v); };
};

/* ---- Chemistry: molar mass calculator ---- */
const E = { H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999, F: 18.998, Ne: 20.18, Na: 22.99, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.948, K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.63, As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798, Rb: 85.468, Sr: 87.62, Ag: 107.87, Sn: 118.71, I: 126.9, Xe: 131.29, Cs: 132.91, Ba: 137.33, W: 183.84, Pt: 195.08, Au: 196.97, Hg: 200.59, Pb: 207.2, U: 238.03 };
function parseF(f) {
  let i = 0; const num = () => { const m = /^\d+/.exec(f.slice(i)); if (m) { i += m[0].length; return +m[0]; } return 1; };
  const grp = (d) => { const o = {}; while (i < f.length) { const c = f[i]; if (c === "(" || c === "[") { i++; const s = grp(d + 1), n = num(); for (const k in s) o[k] = (o[k] || 0) + s[k] * n; } else if (c === ")" || c === "]") { if (!d) throw 0; i++; return o; } else { const m = /^[A-Z][a-z]?/.exec(f.slice(i)); if (!m) throw 0; i += m[0].length; o[m[0]] = (o[m[0]] || 0) + num(); } } if (d) throw 0; return o; };
  return grp(0);
}
R.chem = (b) => {
  b.innerHTML = `<input id="cf" placeholder="Type a formula, e.g. Ca(OH)2" autocapitalize="off" spellcheck="false"><div class="tk-chips">${["H2O", "CO2", "NaCl", "H2SO4", "Ca(OH)2", "C6H12O6", "KMnO4"].map((x) => `<button data-f="${x}">${x}</button>`).join("")}</div><div id="co"></div><p class="tk-dim">Capital letters matter: Co is cobalt, CO is carbon monoxide.</p>`;
  const run = () => {
    const f = $("#cf", b).value.trim(), o = $("#co", b); if (!f) { o.innerHTML = ""; return; }
    try {
      const m = parseF(f); let tot = 0; const rows = Object.entries(m).map(([k, n]) => { if (!(k in E)) throw k; const w = E[k] * n; tot += w; return [k, n, w]; });
      o.innerHTML = `<div class="tk-big">${+tot.toFixed(3)} <small>g/mol</small></div><table class="tk-t"><tr><th>Element</th><th>Atoms</th><th>Mass</th><th>Share</th></tr>${rows.map(([k, n, w]) => `<tr><td>${k}</td><td>${n}</td><td>${+w.toFixed(3)}</td><td>${(w / tot * 100).toFixed(2)}%</td></tr>`).join("")}</table><div class="tk-row"><button class="tk-b" data-ins="${+tot.toFixed(3)}">Insert molar mass in calculator</button></div>`;
    } catch (e) { o.innerHTML = `<p class="tk-dim" style="margin-top:12px">${typeof e === "string" ? "Element not in table: " + esc(e) : "Check the formula, for example Ca(OH)2."}</p>`; }
  };
  b.oninput = run;
  b.onclick = (e) => { const t = e.target.closest("button"); if (!t) return; if (t.dataset.f) { $("#cf", b).value = t.dataset.f; run(); } else if (t.dataset.ins) put(t.dataset.ins); };
};

/* ---- Screen menu (copy / paste / LaTeX) + Tools button ---- */
const tex = (s) => s.replace(/√\(([^()]*)\)/g, "\\sqrt{$1}").replace(/∛\(([^()]*)\)/g, "\\sqrt[3]{$1}").replace(/×/g, "\\times ").replace(/÷/g, "\\div ").replace(/π/g, "\\pi ").replace(/\b(sin|cos|tan|log)\(/g, "\\$1(").replace(/\^\(([^()]*)\)/g, "^{$1}").replace(/\^(\d+)/g, "^{$1}");
function init() {
  const nav = $(".nav-controls");
  if (nav) { const t = document.createElement("button"); t.type = "button"; t.className = "guide-btn"; t.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg><span>Tools</span>`; t.onclick = () => open(); nav.prepend(t); }
  const lcd = $(".lcd-screen"); if (!lcd) return;
  const dots = document.createElement("button"); dots.className = "tk-dots"; dots.type = "button"; dots.setAttribute("aria-label", "Screen menu"); dots.textContent = "⋮"; lcd.append(dots);
  const m = document.createElement("div"); m.className = "tk-menu"; m.hidden = true; m.innerHTML = `<button data-m="ce">Copy expression</button><button data-m="cr">Copy result</button><button data-m="cl">Copy as LaTeX</button><button data-m="p">Paste</button><button data-m="x">Clear screen</button>`; document.body.append(m);
  dots.onclick = (e) => { e.stopPropagation(); const q = dots.getBoundingClientRect(); m.style.top = q.bottom + 6 + "px"; m.style.right = Math.max(8, innerWidth - q.right) + "px"; m.hidden = !m.hidden; };
  document.addEventListener("click", () => (m.hidden = true));
  m.onclick = async (e) => {
    const a = e.target.dataset.m; if (!a) return;
    if (a === "ce") copy(exp || "0"); else if (a === "cr") copy(resDiv.innerText); else if (a === "cl") copy(tex(exp || resDiv.innerText));
    else if (a === "x") clearAll();
    else if (a === "p") { try { insertAtCursor(await navigator.clipboard.readText()); updateDisplay(); } catch (err) { toast("Paste not allowed here"); } }
  };
}
window.ROITX_TK = { R, TABS, $, LS, SV, esc, toast, copy, put, vals, show: (x) => show(x) };
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
