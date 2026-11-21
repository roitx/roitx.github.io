/* ROITX Polish — new Unit converter page, boxed Notes buttons, formula echo in Chemistry,
   polynomial echo in Solve, matrix preview in Matrix.
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
})();
