/* ROITX Polish — new Unit converter page, boxed Notes buttons, formula echo in Chemistry,
   polynomial echo in Solve, matrix preview in Matrix, Number base and Statistics redesign.
   Load AFTER calc-plus.js (best: last, after calc-graph.js). */
(() => {
"use strict";
const T = window.ROITX_TK; if (!T) return;
const { R, $, LS, SV, esc, put } = T;
const nums = (s) => (s.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
const fmtN = (n) => String(+n.toPrecision(8));

/* ---------- styles ---------- */
if (!document.getElementById("pl-style")) {
  const st = document.createElement("style"); st.id = "pl-style";
  st.textContent = `
/* notes buttons: real boxes */
.tk-body .tk-b[data-a="new"],.tk-body .tk-b[data-a="ans"]{box-sizing:border-box;width:calc(50% - 6px);border:1.5px solid var(--pl-acc,#00f5a0);background:rgba(128,128,128,.12);background:color-mix(in srgb,var(--pl-acc,#00f5a0) 10%,transparent);color:var(--pl-acc,#00f5a0);border-radius:12px;padding:13px 8px;font-weight:600;text-align:center;cursor:pointer}
.tk-body .tk-row:has(>[data-a="new"]){display:flex;gap:12px;margin:10px 0 14px}
/* echo boxes */
.pl-echo{margin:12px 0;padding:10px 14px;border:1px dashed var(--pl-acc,#00f5a0);border-radius:12px}.pl-echo:empty{display:none}
.pl-echo small{display:block;opacity:.7;font-size:12px;margin-bottom:4px}
.pl-f{font:22px/1.4 "Times New Roman",Cambria,serif;overflow-x:auto;white-space:nowrap}.pl-f sub,.pl-f sup{font-size:.65em;line-height:0}.pl-f sup{vertical-align:.5em}.pl-f sub{vertical-align:-.3em}
.pl-n{opacity:.8;font-size:13px;margin-top:2px}
.pl-m{display:inline-block;vertical-align:middle;margin:3px 6px;padding:2px 10px;border-left:2px solid currentColor;border-right:2px solid currentColor;border-radius:8px}
.pl-m table{border-collapse:collapse}.pl-m td{padding:2px 8px;text-align:center;font:17px "Times New Roman",serif}
.pl-oplab{margin:12px 0 -4px;font:18px "Times New Roman",serif;opacity:.9}
#mo .tk-t{border-left:2px solid currentColor;border-right:2px solid currentColor;border-radius:8px}
/* unit converter */
.pl-ug{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 4px;padding:8px 0}
.pl-ut{display:flex;flex-direction:column;align-items:center;gap:10px;background:none;border:0;color:inherit;padding:14px 2px;cursor:pointer;font:inherit;font-size:15px;touch-action:manipulation;min-width:0}
.pl-ut svg{width:44px;height:44px;stroke:var(--pl-acc,#00f5a0);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.pl-ut:active{opacity:.6}
.pl-uh{display:flex;align-items:center;gap:12px;padding:4px 0 10px}.pl-uh b{font-size:17px;flex:1}
.pl-uh button{background:none;border:0;color:var(--pl-acc,#00f5a0);font-size:22px;cursor:pointer;padding:4px 8px}.pl-uh .pl-ins{font-size:14px;border:1px solid var(--pl-acc,#00f5a0);border-radius:10px;padding:6px 12px}
.pl-ur{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 4px;border-radius:12px;cursor:pointer}
.pl-ur.on{background:rgba(128,128,128,.12)}
.pl-un{background:none;border:0;color:inherit;font:inherit;font-size:16px;text-align:left;cursor:pointer;padding:6px 0;flex:1;min-width:0}
.pl-uv{font-size:34px;font-weight:300;opacity:.5;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:58%}.pl-ur.on .pl-uv{opacity:1;color:var(--pl-acc,#00f5a0)}
.pl-sw{text-align:center;margin:-4px 0}.pl-sw button{background:none;border:0;color:inherit;opacity:.6;font-size:20px;cursor:pointer}
.pl-pad{display:grid;grid-template-columns:repeat(4,1fr);margin-top:14px}
.pl-pad button{background:none;border:0;color:inherit;font:300 30px/1 inherit;padding:20px 0;cursor:pointer;touch-action:manipulation;border-radius:14px}.pl-pad button:active{background:rgba(128,128,128,.2)}
.pl-pad .pl-c,.pl-pad .pl-bk{color:var(--pl-acc,#00f5a0)}.pl-pad .pl-bk svg{width:30px;height:24px;stroke:currentColor;fill:none;stroke-width:1.8}
.pl-pl{display:flex;flex-direction:column}.pl-pi{display:flex;justify-content:space-between;align-items:center;background:none;border:0;border-bottom:1px solid rgba(128,128,128,.2);color:inherit;font:inherit;font-size:16px;padding:15px 6px;text-align:left;cursor:pointer}.pl-pi.on{color:var(--pl-acc,#00f5a0);font-weight:600}`;
  document.head.append(st);
}
const setAcc = (b) => { const e = document.querySelector(".tk-tabs button.on"); let c = e ? getComputedStyle(e).backgroundColor : ""; if (!c || /,\s*0\)$/.test(c) || c === "transparent") c = "#00f5a0"; b.style.setProperty("--pl-acc", c); };

/* ================= UNIT CONVERTER ================= */
const ICON = {
  Length: '<rect x="6" y="14" width="36" height="20" rx="2"/><path d="M14 14v8M22 14v6M30 14v8M38 14v6"/>',
  Area: '<rect x="10" y="10" width="28" height="28"/><path d="M10 10l28 28"/>',
  Volume: '<path d="M24 6l15 8.5v17L24 42 9 31.5v-17z"/><path d="M9 14.5L24 23l15-8.5M24 23v19"/>',
  Speed: '<path d="M6 32a18 18 0 0136 0z"/><path d="M24 32l9-9"/>',
  Weight: '<rect x="18" y="7" width="12" height="8"/><path d="M13 15h22l4 26H9z"/><path d="M20 30h8"/>',
  Temperature: '<path d="M20 6h8v13a10 10 0 11-8 0z"/><path d="M24 33v.5"/>',
  Power: '<rect x="8" y="9" width="32" height="30"/><path d="M15 19l4 12 5-10 5 10 4-12"/>',
  Pressure: '<circle cx="24" cy="24" r="17"/><path d="M24 24l8-8"/>',
  Time: '<circle cx="24" cy="24" r="17"/><path d="M24 13v11l8 5"/>',
  Energy: '<path d="M27 5L12 27h11l-3 16 17-23H26z"/>',
  Data: '<ellipse cx="24" cy="12" rx="14" ry="5"/><path d="M10 12v24c0 3 6 5 14 5s14-2 14-5V12M10 24c0 3 6 5 14 5s14-2 14-5"/>',
  Angle: '<path d="M8 38h32M8 38L33 14"/><path d="M22 38a14 14 0 00-5-11"/>'
};
// [key, label, factor to the category's base unit]
const UN = {
  Length: [["m", "Meter (m)", 1], ["km", "Kilometer (km)", 1e3], ["cm", "Centimeter (cm)", 0.01], ["mm", "Millimeter (mm)", 0.001], ["um", "Micrometer (µm)", 1e-6], ["nm", "Nanometer (nm)", 1e-9], ["mi", "Mile (mi)", 1609.344], ["yd", "Yard (yd)", 0.9144], ["ft", "Foot (ft)", 0.3048], ["in", "Inch (in)", 0.0254], ["nmi", "Nautical mile (nmi)", 1852]],
  Area: [["m2", "Square meter (m²)", 1], ["km2", "Square kilometer (km²)", 1e6], ["cm2", "Square centimeter (cm²)", 1e-4], ["mm2", "Square millimeter (mm²)", 1e-6], ["ha", "Hectare (ha)", 1e4], ["ac", "Acre (ac)", 4046.8564224], ["ft2", "Square foot (ft²)", 0.09290304], ["in2", "Square inch (in²)", 6.4516e-4], ["yd2", "Square yard (yd²)", 0.83612736], ["mi2", "Square mile (mi²)", 2589988.110336]],
  Volume: [["m3", "Cubic meter (m³)", 1000], ["hl", "Hectoliter (hl)", 100], ["L", "Liter (L)", 1], ["mL", "Milliliter (mL)", 0.001], ["cm3", "Cubic centimeter (cm³)", 0.001], ["gal", "Gallon US (gal)", 3.785411784], ["qt", "Quart US (qt)", 0.946352946], ["pt", "Pint US (pt)", 0.473176473], ["cup", "Cup US", 0.2365882365], ["floz", "Fluid ounce (fl oz)", 0.0295735296], ["tbsp", "Tablespoon", 0.01478676478], ["tsp", "Teaspoon", 0.00492892159]],
  Speed: [["ms", "Meter/second (m/s)", 1], ["kmh", "Kilometer/hour (km/h)", 1 / 3.6], ["mph", "Mile/hour (mph)", 0.44704], ["kn", "Knot (kn)", 0.514444444], ["fts", "Foot/second (ft/s)", 0.3048], ["mach", "Mach", 340.29]],
  Weight: [["kg", "Kilogram (kg)", 1], ["g", "Gram (g)", 0.001], ["mg", "Milligram (mg)", 1e-6], ["t", "Tonne (t)", 1000], ["q", "Quintal (q)", 100], ["lb", "Pound (lb)", 0.45359237], ["oz", "Ounce (oz)", 0.028349523125], ["st", "Stone (st)", 6.35029318], ["ct", "Carat (ct)", 0.0002], ["tola", "Tola", 0.011664]],
  Temperature: [["C", "Celsius (°C)"], ["F", "Fahrenheit (°F)"], ["K", "Kelvin (K)"]],
  Power: [["W", "Watt (W)", 1], ["kW", "Kilowatt (kW)", 1e3], ["MW", "Megawatt (MW)", 1e6], ["hp", "Horsepower (hp)", 745.69987158], ["PS", "Metric horsepower (PS)", 735.49875], ["btuh", "BTU/hour", 0.29307107], ["kcalh", "kcal/hour", 1.163]],
  Pressure: [["Pa", "Pascal (Pa)", 1], ["kPa", "Kilopascal (kPa)", 1e3], ["MPa", "Megapascal (MPa)", 1e6], ["bar", "Bar (bar)", 1e5], ["atm", "Atmosphere (atm)", 101325], ["mmHg", "mmHg", 133.322387415], ["torr", "Torr", 133.322368421], ["psi", "psi", 6894.757293168]],
  Time: [["s", "Second (s)", 1], ["ms", "Millisecond (ms)", 0.001], ["min", "Minute (min)", 60], ["h", "Hour (h)", 3600], ["d", "Day (d)", 86400], ["wk", "Week", 604800], ["mo", "Month (30.44 d)", 2629800], ["yr", "Year (365.25 d)", 31557600]],
  Energy: [["J", "Joule (J)", 1], ["kJ", "Kilojoule (kJ)", 1e3], ["cal", "Calorie (cal)", 4.184], ["kcal", "Kilocalorie (kcal)", 4184], ["Wh", "Watt-hour (Wh)", 3600], ["kWh", "Kilowatt-hour (kWh)", 3.6e6], ["eV", "Electronvolt (eV)", 1.602176634e-19], ["BTU", "BTU", 1055.05585]],
  Data: [["bit", "Bit", 0.125], ["B", "Byte (B)", 1], ["KB", "Kilobyte (KB)", 1024], ["MB", "Megabyte (MB)", 1048576], ["GB", "Gigabyte (GB)", 1073741824], ["TB", "Terabyte (TB)", 1099511627776]],
  Angle: [["deg", "Degree (°)", 1], ["rad", "Radian (rad)", 180 / Math.PI], ["grad", "Gradian (grad)", 0.9], ["turn", "Turn", 360], ["amin", "Arcminute (′)", 1 / 60], ["asec", "Arcsecond (″)", 1 / 3600]]
};
const CATS = Object.keys(UN);
const convU = (v, a, b, cat) => {
  if (cat === "Temperature") { const c = a === "C" ? v : a === "F" ? ((v - 32) * 5) / 9 : v - 273.15; return b === "C" ? c : b === "F" ? (c * 9) / 5 + 32 : c + 273.15; }
  const f = (k) => UN[cat].find((u) => u[0] === k)[2]; return (v * f(a)) / f(b);
};
const showN = (x) => { if (!isFinite(x)) return "—"; if (x === 0) return "0"; const a = Math.abs(x); return a >= 1e12 || a < 1e-6 ? x.toExponential(6).replace(/\.?0+e/, "e") : String(+x.toPrecision(10)); };

R.unit = (b) => {
  setAcc(b);
  const saved = LS("calcUnit2", {}); let cat = null, act = 0, str = "1", pick = -1;
  const sel = (c) => (saved[c] || (saved[c] = [UN[c][0][0], UN[c][1][0]]));
  const lab = (c, k) => (UN[c].find((u) => u[0] === k) || [])[1] || k;
  const val = (i) => { const [ua, ub] = sel(cat), v = parseFloat(str === "" || str === "-" || str === "." ? "0" : str); return i === act ? (str === "" ? "0" : str) : showN(convU(v, sel(cat)[act], sel(cat)[i], cat)); };
  const home = () => { cat = null; pick = -1; b.innerHTML = `<div class="pl-ug">${CATS.map((c) => `<button class="pl-ut" data-c="${c}"><svg viewBox="0 0 48 48">${ICON[c]}</svg><span>${c}</span></button>`).join("")}</div>`; };
  const conv = () => {
    const u = sel(cat), keys = [["7", "8", "9", "C"], ["4", "5", "6", ""], ["1", "2", "3", ""], [cat === "Temperature" ? "±" : "00", "0", ".", "⌫"]];
    b.innerHTML = `<div class="pl-uh"><button data-back aria-label="Back">←</button><b>${cat} Conversion</b><button class="pl-ins" data-use>Insert</button></div>`
      + [0, 1].map((i) => `<div class="pl-ur${act === i ? " on" : ""}" data-r="${i}"><button class="pl-un" data-pick="${i}">${esc(lab(cat, u[i]))} ›</button><div class="pl-uv">${esc(val(i))}</div></div>${i === 0 ? `<div class="pl-sw"><button data-swap aria-label="Swap units">⇅</button></div>` : ""}`).join("")
      + `<div class="pl-pad">${keys.flat().map((k) => k === "" ? "<span></span>" : `<button data-k="${k}" class="${k === "C" ? "pl-c" : k === "⌫" ? "pl-bk" : ""}">${k === "⌫" ? '<svg viewBox="0 0 32 24"><path d="M10 3h18a2 2 0 012 2v14a2 2 0 01-2 2H10L2 12z"/><path d="M15 8l8 8M23 8l-8 8"/></svg>' : k}</button>`).join("")}</div>`;
  };
  const list = () => { const u = sel(cat); b.innerHTML = `<div class="pl-uh"><button data-back2 aria-label="Back">←</button><b>Choose unit</b></div><div class="pl-pl">${UN[cat].map((x) => `<button class="pl-pi${x[0] === u[pick] ? " on" : ""}" data-u="${x[0]}"><span>${esc(x[1])}</span><span>${x[0] === u[pick] ? "✓" : ""}</span></button>`).join("")}</div>`; };
  const key = (k) => {
    if (k === "C") str = ""; else if (k === "⌫") str = str.slice(0, -1);
    else if (k === "±") str = str.startsWith("-") ? str.slice(1) : "-" + str;
    else if (k === ".") { if (!str.includes(".")) str = (str === "" || str === "-" ? str + "0" : str) + "."; }
    else { if (str.replace(/[-.]/g, "").length >= 15) return; str = str === "0" ? k : str === "-0" ? "-" + k : str + k; if (k === "00" && (str === "00" || str === "-00")) str = str.replace(/^(-?)00$/, "$10"); }
  };
  b.onclick = (e) => {
    const t = e.target.closest("button, .pl-ur"); if (!t) return; const d = t.dataset;
    if (d.c) { cat = d.c; act = 0; str = "1"; conv(); }
    else if (d.back !== undefined) home();
    else if (d.back2 !== undefined) { pick = -1; conv(); }
    else if (d.pick !== undefined) { pick = +d.pick; e.stopPropagation(); list(); }
    else if (d.u) { sel(cat)[pick] = d.u; SV("calcUnit2", saved); pick = -1; conv(); }
    else if (d.swap !== undefined) { const u = sel(cat); u.reverse(); SV("calcUnit2", saved); conv(); }
    else if (d.use !== undefined) { const v = val(1 - act); if (v && v !== "—") put(v); }
    else if (d.k) { key(d.k); conv(); }
    else if (d.r !== undefined) { const i = +d.r; if (i !== act) { str = val(i); act = i; conv(); } }
  };
  home();
};

/* ================= NOTES: boxed buttons ================= */
const oNote = R.note; R.note = (b) => { setAcc(b); oNote(b); };

/* ================= CHEMISTRY: show the formula that was typed ================= */
const NAME = { H2O: "Water", CO2: "Carbon dioxide", NaCl: "Sodium chloride (table salt)", H2SO4: "Sulfuric acid", "Ca(OH)2": "Calcium hydroxide (slaked lime)", C6H12O6: "Glucose", KMnO4: "Potassium permanganate", N2O5: "Dinitrogen pentoxide", N2O: "Nitrous oxide", NO2: "Nitrogen dioxide", NH3: "Ammonia", CH4: "Methane", HCl: "Hydrochloric acid", NaOH: "Sodium hydroxide", HNO3: "Nitric acid", H2O2: "Hydrogen peroxide", O2: "Oxygen", O3: "Ozone", N2: "Nitrogen", H2: "Hydrogen", CO: "Carbon monoxide", SO2: "Sulfur dioxide", SO3: "Sulfur trioxide", CaCO3: "Calcium carbonate", NaHCO3: "Sodium bicarbonate (baking soda)", C2H5OH: "Ethanol", CH3COOH: "Acetic acid", C12H22O11: "Sucrose", Fe2O3: "Iron(III) oxide (rust)", H3PO4: "Phosphoric acid", KOH: "Potassium hydroxide", "Al2O3": "Aluminium oxide", "CuSO4": "Copper(II) sulfate", "MgO": "Magnesium oxide", "C2H4": "Ethene", "C2H2": "Ethyne" };
const subF = (f) => esc(f).replace(/\d+/g, (m, off, s) => (off > 0 && /[A-Za-z)\]]/.test(s[off - 1]) ? `<sub>${m}</sub>` : m));
const oChem = R.chem;
R.chem = (b) => {
  setAcc(b); oChem(b);
  const o = $("#co", b), fx = document.createElement("div"); fx.className = "pl-echo"; o.before(fx);
  const upd = () => { const f = $("#cf", b).value.trim(), ok = f && $(".tk-big", o); fx.innerHTML = ok ? `<small>Formula you entered</small><div class="pl-f">${subF(f)}</div>${NAME[f] ? `<div class="pl-n">${esc(NAME[f])}</div>` : ""}` : ""; };
  b.addEventListener("input", upd); b.addEventListener("click", () => setTimeout(upd, 0)); upd();
};

/* ================= SOLVE: write the polynomial / equation below ================= */
const polyHTML = (co) => {
  const n = co.length - 1; let h = "";
  co.forEach((c, i) => { if (!c) return; const p = n - i, a = Math.abs(c); let t = a === 1 && p > 0 ? "" : fmtN(a); t += p === 0 ? "" : p === 1 ? "x" : `x<sup>${p}</sup>`; h += h ? ` ${c < 0 ? "−" : "+"} ${t}` : (c < 0 ? "−" : "") + t; });
  return h ? h + " = 0" : "";
};
const eqHTML = (s) => { s = s.trim(); if (!s) return ""; const t = esc(s).replace(/\^\(?(-?[\w.]+)\)?/g, "<sup>$1</sup>").replace(/\*/g, "·").replace(/-/g, "−"); return /=/.test(s) ? t : t + " = 0"; };
const oSolve = R.solve;
R.solve = (b) => {
  setAcc(b); oSolve(b);
  const q1 = document.createElement("div"), q2 = document.createElement("div"); q1.className = q2.className = "pl-echo";
  $("#so1", b).before(q1); $("#so2", b).before(q2);
  const upd = () => { const co = nums($("#sp", b).value), h = co.length >= 2 ? polyHTML(co) : ""; q1.innerHTML = h ? `<small>Polynomial</small><div class="pl-f">${h}</div>` : ""; const e = eqHTML($("#se", b).value); q2.innerHTML = e ? `<small>Equation</small><div class="pl-f">${e}</div>` : ""; };
  b.addEventListener("input", upd); upd();
};

/* ================= MATRIX: bracket preview + operation label ================= */
const toM = (s) => s.trim().split(/\n|;/).map((r) => nums(r)).filter((r) => r.length);
const mHTML = (name, m) => m.length ? `<span style="white-space:nowrap">${name} =</span><span class="pl-m"><table>${m.map((r) => `<tr>${r.map((v) => `<td>${fmtN(v)}</td>`).join("")}</tr>`).join("")}</table></span>` : "";
const OPL = { det: "det A =", inv: "A⁻¹ =", tr: "Aᵀ =", add: "A + B =", sub: "A − B =", mul: "A × B =", sol: "A·x = B → x =" };
const oMat = R.matrix;
R.matrix = (b) => {
  setAcc(b); oMat(b);
  const pv = document.createElement("div"); pv.className = "pl-echo"; $(".tk-grid2", b).after(pv);
  const upd = () => { const A = toM($("#ma", b).value), B = toM($("#mb", b).value); pv.innerHTML = A.length || B.length ? `<div class="pl-f" style="white-space:normal">${mHTML("A", A)} ${mHTML("B", B)}</div>` : ""; };
  b.addEventListener("input", upd); upd();
  b.addEventListener("click", (e) => { const op = e.target.dataset && e.target.dataset.op, o = $("#mo", b); if (op && o && (o.querySelector(".tk-t") || o.querySelector(".tk-stat"))) o.insertAdjacentHTML("afterbegin", `<div class="pl-oplab">${OPL[op]}</div>`); });
};

/* ================= shared helpers for Number base + Statistics ================= */
const fmt = (n) => (typeof n === "number" && isFinite(n) ? String(+n.toPrecision(8)) : "–");
const css2 = `
.pl-seg{display:flex;border:1.5px solid var(--pl-acc,#00f5a0);border-radius:12px;overflow:hidden;margin:6px 0 10px}
.pl-seg button{flex:1;background:none;border:0;color:inherit;padding:11px 0;font:600 14px inherit;cursor:pointer}.pl-seg button.on{background:var(--pl-acc,#00f5a0);color:#06150f}
.pl-bin{width:100%;box-sizing:border-box;font:600 26px/1.3 "Courier New",monospace;text-align:right;letter-spacing:1px}
.pl-pad.h6{grid-template-columns:repeat(6,1fr);margin-top:8px}.pl-pad.h6+.pl-pad{margin-top:2px}
.pl-bp button{font-size:26px;padding:13px 0}.pl-pad button:disabled{opacity:.18;pointer-events:none}.pl-pad .z{grid-column:span 2}
.pl-bits{display:flex;gap:4px;align-items:center;margin:4px 0}.pl-bits span{width:46px;font-size:11px;opacity:.6}
.pl-bits button{flex:1;aspect-ratio:1;border:1px solid rgba(128,128,128,.4);background:none;color:inherit;border-radius:6px;font:600 14px monospace;cursor:pointer;padding:0}.pl-bits button.on{background:var(--pl-acc,#00f5a0);color:#06150f;border-color:transparent}
.pl-ops{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.pl-ops button,.pl-chip{border:1px solid rgba(128,128,128,.45);background:rgba(128,128,128,.12);color:inherit;border-radius:10px;padding:8px 14px;cursor:pointer;font:inherit}.pl-chip.on{background:var(--pl-acc,#00f5a0);color:#06150f;border-color:transparent}
.pl-bw{display:flex;align-items:center;gap:8px}.pl-bw input{flex:1;font:600 18px monospace}
.pl-cbr{display:flex;align-items:center;gap:8px;margin:12px 0 4px}.pl-cbr input{width:64px}
h4.pl-h{margin:18px 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.65;font-weight:600}
.pl-sorted{font:14px/1.7 monospace;word-break:break-word;opacity:.9}
.pl-svg{width:100%;height:auto;display:block;color:inherit}.pl-svg .bar{fill:var(--pl-acc,#00f5a0);opacity:.85}.pl-svg text{fill:currentColor;font:10px sans-serif;opacity:.75}.pl-svg .ln{stroke:currentColor;fill:none;stroke-width:1.4;opacity:.8}.pl-svg .cv{stroke:var(--pl-acc,#00f5a0);fill:none;stroke-width:2}.pl-svg .dot{fill:var(--pl-acc,#00f5a0)}.pl-svg .box{fill:var(--pl-acc,#00f5a0);fill-opacity:.25;stroke:var(--pl-acc,#00f5a0);stroke-width:1.6}
.pl-pr{display:flex;align-items:center;gap:8px;margin-top:6px}.pl-pr input{width:110px}`;
if (typeof document !== "undefined" && !document.getElementById("pl-style2")) { const st = document.createElement("style"); st.id = "pl-style2"; st.textContent = css2; document.head.append(st); }

/* ================= NUMBER BASE ================= */
const DIG = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function parseB(str, base) {
  let s = str.trim().toUpperCase().replace(/[\s,_]/g, ""), neg = false;
  if (s[0] === "-") { neg = true; s = s.slice(1); }
  const ds = DIG.slice(0, base), m = new RegExp(`^([${ds}]*)(?:\\.([${ds}]*))?$`).exec(s);
  if (!m || (!m[1] && !m[2])) return null;
  const B = BigInt(base); let n = 0n, fn = 0n, fd = 1n;
  for (const c of m[1]) n = n * B + BigInt(DIG.indexOf(c));
  for (const c of m[2] || "") { fn = fn * B + BigInt(DIG.indexOf(c)); fd *= B; }
  return { neg, n, fn, fd };
}
function toBase(p, b2) {
  let s = p.n.toString(b2).toUpperCase(), cut = false;
  if (p.fn) { let num = p.fn, f = "", k = 0; const B = BigInt(b2); while (num && k < 24) { num *= B; f += DIG[Number(num / p.fd)]; num %= p.fd; k++; } s += "." + f; cut = num !== 0n; }
  return { s: (p.neg && (p.n || p.fn) ? "-" : "") + s, cut };
}
const grp = (s, base) => { const gs = { 2: 4, 8: 3, 10: 3, 16: 4 }[base] || 4, neg = s[0] === "-" ? "-" : "", [i, f] = s.replace("-", "").split("."); return neg + i.replace(new RegExp(`\\B(?=(?:\\w{${gs}})+$)`, "g"), "\u2009") + (f !== undefined ? "." + f : ""); };
const widthFor = (n) => [8, 16, 32, 64].find((w) => n < 1n << BigInt(w));

R.base = (b) => {
  setAcc(b);
  const S = Object.assign({ base: 10, str: "255", bs: "15", cb: 5 }, LS("calcBase2", {})), NM = { 2: "Binary", 8: "Octal", 10: "Decimal", 16: "Hexadecimal" }; let lastR = null, decRaw = "";
  const rowsK = [["7", "8", "9", "⌫"], ["4", "5", "6", "C"], ["1", "2", "3", "±"], ["0", "00", ".", ""]];
  b.innerHTML = `<div class="pl-seg" id="bseg">${[[2, "BIN"], [8, "OCT"], [10, "DEC"], [16, "HEX"]].map(([v, l]) => `<button data-b="${v}">${l}</button>`).join("")}</div>
<input id="bv" class="pl-bin" inputmode="none" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="0">
<div class="pl-echo" id="bec"></div>
<div class="pl-pad h6 pl-bp" id="bhx">${"ABCDEF".split("").map((c) => `<button data-k="${c}">${c}</button>`).join("")}</div>
<div class="pl-pad pl-bp">${rowsK.flat().map((k) => (k === "" ? "<span></span>" : `<button data-k="${k}" class="${k === "C" ? "pl-c" : k === "⌫" ? "pl-bk" : ""}">${k}</button>`)).join("")}</div>
<div id="bres" style="margin-top:12px"></div>
<div class="pl-cbr"><span>Any base</span><input id="bcb" type="number" min="2" max="36" value="${S.cb}"></div><div id="bcr"></div>
<div id="bbit"></div>
<div class="pl-echo" id="bpn" style="display:block"><small>Bitwise operations (whole numbers)</small><div class="pl-bw"><span>B =</span><input id="bb" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="second number" value="${esc(S.bs)}"></div><div class="pl-ops">${[["AND", "A AND B"], ["OR", "A OR B"], ["XOR", "A XOR B"], ["NOT", "NOT A"], ["SHL", "A ≪ 1"], ["SHR", "A ≫ 1"]].map(([k, l]) => `<button data-op="${k}">${l}</button>`).join("")}</div><div id="bor"></div></div>`;
  const q = (s) => $(s, b), card = (l, raw, shown) => `<button class="tk-stat" data-v="${esc(raw)}"><small>${l}</small><b style="word-break:break-all">${esc(shown)}</b></button>`;
  const show = (p, bs) => { const r = toBase(p, bs); return [r.s, grp(r.s, bs) + (r.cut ? "…" : "")]; };
  const clean = (raw, pre) => {
    let s = raw.toUpperCase().replace(/[\s,_]/g, ""), sign = ""; if (s[0] === "-") { sign = "-"; s = s.slice(1); }
    const m = pre ? /^0([XBO])/.exec(s) : null; if (m && (m[1] !== "B" || S.base < 12)) { S.base = { X: 16, B: 2, O: 8 }[m[1]]; s = s.slice(2); }
    const ds = DIG.slice(0, S.base); let o = "", dot = false; for (const c of s) { if (ds.includes(c)) o += c; else if (c === "." && !dot) { o += c; dot = true; } } return sign + o;
  };
  function render() {
    SV("calcBase2", S);
    const inp = q("#bv"); if (inp.value !== S.str) inp.value = S.str;
    b.querySelectorAll("#bseg button").forEach((x) => x.classList.toggle("on", +x.dataset.b === S.base));
    q("#bhx").style.display = S.base > 10 ? "" : "none";
    b.querySelectorAll(".pl-bp [data-k]").forEach((x) => { const k = x.dataset.k; x.disabled = /^[0-9A-F]$/.test(k) && DIG.indexOf(k) >= S.base; });
    const t = S.str.trim(), p = t && t !== "-" && t !== "." ? parseB(S.str, S.base) : null, ec = q("#bec"), res = q("#bres"), bits = q("#bbit"), cr = q("#bcr");
    if (!p) { ec.innerHTML = ""; res.innerHTML = t ? `<p class="tk-dim">Use only digits valid for base ${S.base}: ${DIG.slice(0, S.base)}</p>` : ""; bits.innerHTML = ""; cr.innerHTML = ""; decRaw = ""; return; }
    const dec = toBase(p, 10); decRaw = dec.s;
    ec.innerHTML = `<small>You entered</small><div class="pl-f">${esc(grp(t.toUpperCase(), S.base))}<sub>${S.base}</sub> = ${esc(grp(dec.s, 10))}${dec.cut ? "…" : ""}<sub>10</sub></div>`;
    const isInt = !p.fn; let extra = "";
    res.innerHTML = [2, 8, 10, 16].map((bs) => { const [r, sh] = show(p, bs); return card(`${NM[bs]} (${bs})`, r, sh); }).join("");
    if (S.cb >= 2 && S.cb <= 36) { const [r, sh] = show(p, S.cb); cr.innerHTML = card(`Base ${S.cb}`, r, sh); } else cr.innerHTML = "";
    if (isInt) {
      const bs2 = p.n.toString(2), bl = p.n === 0n ? 1 : bs2.length, ones = (bs2.match(/1/g) || []).length;
      extra += `<p class="tk-dim" style="margin:10px 0 4px">${bl} bit${bl > 1 ? "s" : ""} · ${ones} one${ones === 1 ? "" : "s"}</p>`;
      if (p.neg && p.n) { const w = [8, 16, 32, 64, 128].find((w) => p.n <= 1n << BigInt(w - 1)), tc = (1n << BigInt(w)) - p.n, tb = tc.toString(2).padStart(w, "0"), th = tc.toString(16).toUpperCase().padStart(w / 4, "0"); extra += card(`Two's complement ${w}-bit (binary)`, tb, grp(tb, 2)) + card(`Two's complement ${w}-bit (hex)`, th, grp(th, 16)); }
    }
    extra += `<div class="tk-row"><button class="tk-b" data-ins="1">Insert decimal in calculator</button></div>`;
    res.innerHTML += extra;
    const w = isInt && !p.neg ? widthFor(p.n) : null;
    if (w) { let h = `<div class="pl-echo" style="display:block"><small>Bits · tap a bit to flip it · ${w}-bit</small>`; for (let by = w / 8 - 1; by >= 0; by--) { h += `<div class="pl-bits"><span>${by * 8 + 7}–${by * 8}</span>`; for (let i = 7; i >= 0; i--) { const idx = by * 8 + i, on = (p.n >> BigInt(idx)) & 1n; h += `<button data-bit="${idx}" class="${on ? "on" : ""}">${on ? 1 : 0}</button>`; } h += "</div>"; } bits.innerHTML = h + "</div>"; } else bits.innerHTML = "";
  }
  const press = (k) => {
    let s = S.str;
    if (k === "C") s = ""; else if (k === "⌫") s = s.slice(0, -1); else if (k === "±") s = s.startsWith("-") ? s.slice(1) : "-" + s;
    else if (k === ".") { if (!s.includes(".")) s += s === "" || s === "-" ? "0." : "."; } else s += k;
    S.str = s;
  };
  function bitop(op) {
    const pa = parseB(S.str, S.base), pb = parseB(S.bs, S.base), out = q("#bor"); lastR = null;
    const bad = (m) => (out.innerHTML = `<p class="tk-dim">${m}</p>`);
    if (!pa || pa.fn || pa.neg) return bad("A must be a whole number (0 or more).");
    if (["AND", "OR", "XOR"].includes(op) && (!pb || pb.fn || pb.neg)) return bad("B must be a whole number (0 or more), in the selected base.");
    const A = pa.n, B2 = pb && !pb.fn && !pb.neg ? pb.n : 0n, w = widthFor(A > B2 ? A : B2) || 64;
    const r = { AND: A & B2, OR: A | B2, XOR: A ^ B2, NOT: ((1n << BigInt(w)) - 1n) ^ A, SHL: A << 1n, SHR: A >> 1n }[op], lbl = { AND: "A AND B", OR: "A OR B", XOR: "A XOR B", NOT: `NOT A (${w}-bit)`, SHL: "A ≪ 1", SHR: "A ≫ 1" }[op];
    lastR = r; const pr = { neg: false, n: r, fn: 0n, fd: 1n };
    out.innerHTML = `<div class="pl-oplab">${lbl} =</div>` + [2, 10, 16].map((bs) => { const [rw, sh] = show(pr, bs); return card(`${NM[bs]} (${bs})`, rw, sh); }).join("") + `<div class="tk-row"><button class="tk-b" data-use="1">Use result as A</button></div>`;
  }
  b.oninput = (e) => {
    const el = e.target;
    if (el.id === "bv") { S.str = clean(el.value, true); render(); }
    else if (el.id === "bb") { S.bs = clean(el.value, false); if (el.value !== S.bs) el.value = S.bs; SV("calcBase2", S); }
    else if (el.id === "bcb") { const v = Math.round(+el.value); if (v >= 2 && v <= 36) { S.cb = v; render(); } }
  };
  b.onclick = (e) => {
    const t = e.target.closest("button"); if (!t) return; const d = t.dataset;
    if (d.b) { const nb = +d.b, p = parseB(S.str, S.base), pb = parseB(S.bs, S.base); if (p) S.str = toBase(p, nb).s; if (pb) S.bs = toBase(pb, nb).s; S.base = nb; q("#bb").value = S.bs; render(); }
    else if (d.k) { press(d.k); render(); }
    else if (d.bit !== undefined) { const p = parseB(S.str, S.base); if (p) { S.str = (p.n ^ (1n << BigInt(d.bit))).toString(S.base).toUpperCase(); render(); } }
    else if (d.op) bitop(d.op);
    else if (d.use) { if (lastR !== null) { S.str = lastR.toString(S.base).toUpperCase(); render(); } }
    else if (d.ins) { if (decRaw) put(decRaw); }
    else if (d.v) T.copy(d.v);
  };
  render();
};

/* ================= STATISTICS ================= */
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const quant = (a, p) => { const s = a.slice().sort((x, y) => x - y), k = (s.length - 1) * p, f = Math.floor(k), c = Math.ceil(k); return s[f] + (s[c] - s[f]) * (k - f); };
const vr = (a, samp) => { const m = mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - (samp ? 1 : 0)); };
const sdv = (a, samp) => (samp && a.length < 2 ? NaN : Math.sqrt(vr(a, samp)));
const gauss = (A, y) => {
  const n = y.length, M = A.map((r, i) => [...r, y[i]]);
  for (let i = 0; i < n; i++) { let p = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k; if (Math.abs(M[p][i]) < 1e-12) return null; [M[i], M[p]] = [M[p], M[i]]; for (let k = i + 1; k < n; k++) { const f = M[k][i] / M[i][i]; for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j]; } }
  const x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; } return x;
};
const sg = (c) => (c < 0 ? "-" : "+"), sgH = (c) => (c < 0 ? "−" : "+");
const FITS = { lin: "Linear", quad: "Quadratic", exp: "Exponential", pow: "Power", log: "Logarithmic" };
function fitReg(type, x, y) {
  const n = x.length; let tx = x, ty = y;
  if (type === "exp") { if (y.some((v) => v <= 0)) return null; ty = y.map(Math.log); }
  if (type === "pow") { if (x.some((v) => v <= 0) || y.some((v) => v <= 0)) return null; tx = x.map(Math.log); ty = y.map(Math.log); }
  if (type === "log") { if (x.some((v) => v <= 0)) return null; tx = x.map(Math.log); }
  let f, expr, eq, r = null;
  if (type === "quad") {
    if (n < 3) return null; const P = (k) => x.reduce((s, v) => s + v ** k, 0), PY = (k) => x.reduce((s, v, i) => s + v ** k * y[i], 0), co = gauss([[n, P(1), P(2)], [P(1), P(2), P(3)], [P(2), P(3), P(4)]], [PY(0), PY(1), PY(2)]); if (!co) return null;
    const [a, bb, c] = co; f = (v) => a + bb * v + c * v * v; expr = `${fmt(a)}${sg(bb)}${fmt(Math.abs(bb))}*x${sg(c)}${fmt(Math.abs(c))}*x^2`; eq = `y = ${fmt(a)} ${sgH(bb)} ${fmt(Math.abs(bb))}x ${sgH(c)} ${fmt(Math.abs(c))}x<sup>2</sup>`;
  } else {
    const mx = mean(tx), my = mean(ty), sxy = tx.reduce((s, v, i) => s + (v - mx) * (ty[i] - my), 0), sxx = tx.reduce((s, v) => s + (v - mx) ** 2, 0), syy = ty.reduce((s, v) => s + (v - my) ** 2, 0); if (!sxx) return null;
    const bb = sxy / sxx, a = my - bb * mx;
    if (type === "lin") { f = (v) => a + bb * v; expr = `${fmt(a)}${sg(bb)}${fmt(Math.abs(bb))}*x`; eq = `y = ${fmt(a)} ${sgH(bb)} ${fmt(Math.abs(bb))}x`; r = syy ? sxy / Math.sqrt(sxx * syy) : null; }
    else if (type === "exp") { const A = Math.exp(a); f = (v) => A * Math.exp(bb * v); expr = `${fmt(A)}*e^(${fmt(bb)}*x)`; eq = `y = ${fmt(A)}·e<sup>${fmt(bb)}x</sup>`; }
    else if (type === "pow") { const A = Math.exp(a); f = (v) => A * v ** bb; expr = `${fmt(A)}*x^(${fmt(bb)})`; eq = `y = ${fmt(A)}·x<sup>${fmt(bb)}</sup>`; }
    else { f = (v) => a + bb * Math.log(v); expr = `${fmt(a)}${sg(bb)}${fmt(Math.abs(bb))}*ln(x)`; eq = `y = ${fmt(a)} ${sgH(bb)} ${fmt(Math.abs(bb))} ln x`; }
  }
  const my = mean(y), sst = y.reduce((s, v) => s + (v - my) ** 2, 0), sse = y.reduce((s, v, i) => s + (v - f(x[i])) ** 2, 0);
  return { f, expr, eq, r, r2: sst ? 1 - sse / sst : 1, se: n > 2 ? Math.sqrt(sse / (n - 2)) : NaN };
}
const svgHist = (d) => {
  const n = d.length, mn = Math.min(...d), mx = Math.max(...d), k = mn === mx ? 1 : Math.min(20, Math.max(3, Math.ceil(Math.log2(n) + 1))), w = (mx - mn) / k || 1, bins = Array(k).fill(0);
  d.forEach((v) => bins[Math.min(k - 1, Math.floor((v - mn) / w))]++);
  const W = 320, H = 140, pl = 8, pb = 22, pt = 16, bw = (W - 2 * pl) / k, mc = Math.max(...bins);
  return `<svg class="pl-svg" viewBox="0 0 ${W} ${H}">${bins.map((c, i) => { const h = ((H - pt - pb) * c) / mc, x = pl + i * bw; return `<rect class="bar" x="${x + 1}" y="${H - pb - h}" width="${bw - 2}" height="${h}" rx="2"/><text x="${x + bw / 2}" y="${H - pb - h - 3}" text-anchor="middle">${c}</text>`; }).join("")}<line class="ln" x1="${pl}" y1="${H - pb}" x2="${W - pl}" y2="${H - pb}"/><text x="${pl}" y="${H - 6}">${fmt(mn)}</text><text x="${W - pl}" y="${H - 6}" text-anchor="end">${fmt(mx)}</text></svg>`;
};
const svgBox = (d, q1, med, q3) => {
  const mn = Math.min(...d), mx = Math.max(...d), iqr = q3 - q1, lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr, wl = Math.min(...d.filter((v) => v >= lo)), wh = Math.max(...d.filter((v) => v <= hi)), out = d.filter((v) => v < lo || v > hi);
  const W = 320, H = 64, pl = 14, sx = (v) => pl + ((W - 2 * pl) * (v - mn)) / (mx - mn || 1), y = 26;
  return { out, svg: `<svg class="pl-svg" viewBox="0 0 ${W} ${H}"><line class="ln" x1="${sx(wl)}" y1="${y}" x2="${sx(q1)}" y2="${y}"/><line class="ln" x1="${sx(q3)}" y1="${y}" x2="${sx(wh)}" y2="${y}"/><line class="ln" x1="${sx(wl)}" y1="${y - 8}" x2="${sx(wl)}" y2="${y + 8}"/><line class="ln" x1="${sx(wh)}" y1="${y - 8}" x2="${sx(wh)}" y2="${y + 8}"/><rect class="box" x="${sx(q1)}" y="${y - 14}" width="${Math.max(1, sx(q3) - sx(q1))}" height="28" rx="3"/><line class="ln" style="stroke-width:2.4" x1="${sx(med)}" y1="${y - 14}" x2="${sx(med)}" y2="${y + 14}"/>${out.map((v) => `<circle class="dot" cx="${sx(v)}" cy="${y}" r="3"/>`).join("")}<text x="${pl}" y="${H - 6}">${fmt(mn)}</text><text x="${W - pl}" y="${H - 6}" text-anchor="end">${fmt(mx)}</text></svg>` };
};
const svgScatter = (x, y, f) => {
  const W = 320, H = 190, pl = 34, pr = 8, pt = 10, pb = 22; let x0 = Math.min(...x), x1 = Math.max(...x), y0 = Math.min(...y), y1 = Math.max(...y);
  if (x0 === x1) { x0 -= 1; x1 += 1; } if (y0 === y1) { y0 -= 1; y1 += 1; }
  const px = (v) => pl + ((W - pl - pr) * (v - x0)) / (x1 - x0), py = (v) => H - pb - ((H - pt - pb) * (v - y0)) / (y1 - y0); let d = "", on = false;
  if (f) for (let k = 0; k <= 80; k++) { const v = x0 + ((x1 - x0) * k) / 80, r = f(v); if (!isFinite(r) || r < y0 - (y1 - y0) || r > y1 + (y1 - y0)) { on = false; continue; } d += (on ? "L" : "M") + px(v).toFixed(1) + " " + Math.min(H, Math.max(0, py(r))).toFixed(1); on = true; }
  return `<svg class="pl-svg" viewBox="0 0 ${W} ${H}"><line class="ln" x1="${pl}" y1="${H - pb}" x2="${W - pr}" y2="${H - pb}"/><line class="ln" x1="${pl}" y1="${pt}" x2="${pl}" y2="${H - pb}"/>${d ? `<path class="cv" d="${d}"/>` : ""}${x.map((v, i) => `<circle class="dot" cx="${px(v).toFixed(1)}" cy="${py(y[i]).toFixed(1)}" r="3.5"/>`).join("")}<text x="${pl}" y="${H - 7}">${fmt(x0)}</text><text x="${W - pr}" y="${H - 7}" text-anchor="end">${fmt(x1)}</text><text x="${pl - 4}" y="${H - pb}" text-anchor="end">${fmt(y0)}</text><text x="${pl - 4}" y="${pt + 8}" text-anchor="end">${fmt(y1)}</text></svg>`;
};

R.stats = (b) => {
  setAcc(b); let fitT = "lin", px = "";
  b.innerHTML = `<p class="tk-dim">Enter numbers (spaces, commas or new lines). Put two numbers on every line (x y) for regression.</p><textarea id="sd" placeholder="12 15 15 18 21 30">${esc(LS("calcStats", ""))}</textarea><div class="tk-chips"><button data-a="ex1">Example data</button><button data-a="ex2">Example pairs</button><button data-a="clr">Clear</button></div><div id="so"></div>`;
  const card = (l, v) => `<button class="tk-stat" data-v="${v}"><small>${l}</small><b>${v}</b></button>`, grid = (t, c) => `<h4 class="pl-h">${t}</h4><div class="tk-grid2">${c.join("")}</div>`;
  let cur = null;
  const run = () => {
    const raw = $("#sd", b).value; SV("calcStats", raw); const o = $("#so", b), lines = raw.split("\n").map(nums).filter((l) => l.length); cur = null;
    if (lines.length >= 2 && lines.every((l) => l.length === 2)) {
      const x = lines.map((l) => l[0]), y = lines.map((l) => l[1]), n = x.length, ft = fitReg(fitT, x, y);
      const chips = `<div class="tk-chips" style="margin-top:10px">${Object.keys(FITS).map((k) => `<button class="pl-chip${k === fitT ? " on" : ""}" data-fit="${k}">${FITS[k]}</button>`).join("")}</div>`;
      const head = `<div class="pl-echo" style="display:block"><small>${n} pairs (x, y)</small><div class="pl-sorted">${lines.slice(0, 40).map((l) => `(${fmt(l[0])}, ${fmt(l[1])})`).join("  ")}${n > 40 ? " …" : ""}</div></div>`;
      if (!ft) { o.innerHTML = head + chips + `<p class="tk-dim" style="margin-top:12px">${FITS[fitT]} fit needs ${fitT === "quad" ? "at least 3 pairs" : fitT === "exp" ? "all y > 0" : fitT === "pow" ? "all x > 0 and y > 0" : fitT === "log" ? "all x > 0" : "different x values"}.</p>`; return; }
      cur = { ft, x, y }; const yh = px !== "" && isFinite(+px) ? fmt(ft.f(+px)) : "";
      o.innerHTML = head + chips + `<div class="pl-echo" style="display:block"><small>${FITS[fitT]} regression</small><div class="pl-f">${ft.eq}</div></div>`
        + grid("Fit quality", [ft.r !== null ? card("correlation r", fmt(ft.r)) : "", card("r²", fmt(ft.r2)), card("std error of estimate", fmt(ft.se)), card("pairs (n)", n)])
        + grid("Means", [card("mean x", fmt(mean(x))), card("mean y", fmt(mean(y))), card("std dev x (sample)", fmt(sdv(x, true))), card("std dev y (sample)", fmt(sdv(y, true)))])
        + `<h4 class="pl-h">Scatter plot and fitted curve</h4>${svgScatter(x, y, ft.f)}<div class="pl-pr"><span>Predict y for x =</span><input id="spx" inputmode="decimal" value="${esc(px)}" placeholder="x"><b id="spy">${yh ? "= " + yh : ""}</b></div><div class="tk-row"><button class="tk-b" data-pl="1">Plot points and curve in Graph</button></div>`;
      return;
    }
    const d = lines.flat(), n = d.length; if (!n) { o.innerHTML = ""; return; }
    const s = d.slice().sort((a, c) => a - c), mn = s[0], mx = s[n - 1], m = mean(d), q1 = quant(d, 0.25), med = quant(d, 0.5), q3 = quant(d, 0.75), cnt = new Map();
    d.forEach((v) => cnt.set(v, (cnt.get(v) || 0) + 1)); const mc = Math.max(...cnt.values()), modes = mc > 1 ? [...cnt].filter(([, c]) => c === mc).map(([v]) => v) : [];
    const sp = sdv(d, true), pp = sdv(d, false), m2 = vr(d, false), m3 = mean(d.map((v) => (v - m) ** 3)), m4 = mean(d.map((v) => (v - m) ** 4)), bx = svgBox(d, q1, med, q3);
    const fq = cnt.size <= 15 ? `<h4 class="pl-h">Frequency table</h4><table class="tk-t"><tr><th>Value</th><th>Freq</th><th>Rel.</th><th>Cum.</th></tr>${(() => { let c = 0; return [...cnt].sort((a, z) => a[0] - z[0]).map(([v, f]) => { c += f; return `<tr><td>${fmt(v)}</td><td>${f}</td><td>${((f / n) * 100).toFixed(1)}%</td><td>${((c / n) * 100).toFixed(1)}%</td></tr>`; }).join(""); })()}</table>` : "";
    o.innerHTML = `<div class="pl-echo" style="display:block"><small>${n} value${n > 1 ? "s" : ""}, sorted</small><div class="pl-sorted">${s.slice(0, 60).map(fmt).join("  ")}${n > 60 ? " …" : ""}</div></div>`
      + grid("Centre", [card("mean", fmt(m)), card("median", fmt(med)), card("mode", modes.length ? modes.map(fmt).join(", ") : "none"), d.every((v) => v > 0) ? card("geometric mean", fmt(Math.exp(mean(d.map(Math.log))))) : ""])
      + grid("Five-number summary", [card("min", fmt(mn)), card("Q1", fmt(q1)), card("median", fmt(med)), card("Q3", fmt(q3)), card("max", fmt(mx))])
      + `<h4 class="pl-h">Box plot</h4>${bx.svg}${bx.out.length ? `<p class="tk-dim">Outliers: ${bx.out.map(fmt).join(", ")}</p>` : ""}<h4 class="pl-h">Histogram</h4>${svgHist(d)}`
      + grid("Spread", [card("range", fmt(mx - mn)), card("IQR", fmt(q3 - q1)), card("std dev (population)", fmt(pp)), card("std dev (sample)", fmt(sp)), card("variance (population)", fmt(m2)), card("variance (sample)", fmt(n > 1 ? vr(d, true) : NaN)), card("mean abs. deviation", fmt(mean(d.map((v) => Math.abs(v - m))))), card("coeff. of variation %", m && n > 1 ? fmt((sp / Math.abs(m)) * 100) : "–"), card("standard error", n > 1 ? fmt(sp / Math.sqrt(n)) : "–")])
      + grid("Totals and shape", [card("count", n), card("sum Σx", fmt(d.reduce((a, v) => a + v, 0))), card("sum of squares Σx²", fmt(d.reduce((a, v) => a + v * v, 0))), card("skewness", m2 ? fmt(m3 / m2 ** 1.5) : "–"), card("excess kurtosis", m2 ? fmt(m4 / m2 ** 2 - 3) : "–")]) + fq;
  };
  run();
  b.oninput = (e) => {
    if (e.target.id === "spx") { px = e.target.value; const y = $("#spy", b); if (y) y.textContent = cur && px !== "" && isFinite(+px) ? "= " + fmt(cur.ft.f(+px)) : ""; return; }
    run();
  };
  b.onclick = (e) => {
    const t = e.target.closest("button"); if (!t) return; const d = t.dataset;
    if (d.fit) { fitT = d.fit; run(); }
    else if (d.a === "ex1") { $("#sd", b).value = "12 15 15 18 21 30 22 17 15 40"; run(); }
    else if (d.a === "ex2") { $("#sd", b).value = "1 2.1\n2 3.9\n3 6.2\n4 7.8\n5 10.1"; run(); }
    else if (d.a === "clr") { $("#sd", b).value = ""; px = ""; run(); }
    else if (d.pl && cur) { const s = LS("calcGraph", {}); s.f = [cur.ft.expr, `([${cur.x.map(fmt).join(",")}],[${cur.y.map(fmt).join(",")}])`]; SV("calcGraph", s); T.show("graph"); }
    else if (d.v && d.v !== "none" && d.v !== "–") put(d.v);
  };
};

window.ROITX_PL = { parseB, toBase, grp, quant, fitReg, vr };
})();
