/* ROITX Extras — responsive (phone + desktop) polish.
   Theme picker popover, aesthetic theme styling, theme memory, live result preview,
   keyboard input, tap-to-copy, haptics, first-visit tip.
   Self-contained: injects its own CSS. Load LAST (after calc-more.js). */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const TK = () => window.ROITX_TK || null;
const toast = (m) => { const t = TK(); if (t) t.toast(m); };
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
};
const touchFirst = window.matchMedia && matchMedia("(hover: none)").matches;

/* ---------- 0. Styles (mobile-first; every effect is visual-only, no layout changes) ---------- */
const css = `
/* touch targets + tiny screens */
@media (pointer:coarse){.nav-controls .guide-btn,.theme-pick{width:40px!important;height:40px!important}}
@media (max-width:360px){.nav-controls{gap:6px}.nav-controls .guide-btn,.theme-pick{width:36px!important;height:36px!important}}

/* keys: tactile press, no text-selection / tap flash, hover only where a mouse exists */
.calculator-frame button{transition:transform .08s ease,filter .15s ease,box-shadow .2s ease;-webkit-tap-highlight-color:transparent;touch-action:manipulation;-webkit-user-select:none;user-select:none}
.calculator-frame button:active{transform:scale(.94);filter:brightness(1.18)}
.calculator-frame button:focus-visible{outline:2px solid var(--accent,#00e676);outline-offset:2px}
@media (hover:hover){.calculator-frame .button-grid button:hover{filter:brightness(1.12);box-shadow:0 0 12px color-mix(in srgb,var(--accent,#00e676) 35%,transparent)}}

/* frame + LCD glow */
.calculator-frame{box-shadow:0 18px 50px rgba(0,0,0,.45),0 0 0 1px color-mix(in srgb,var(--accent,#00e676) 22%,transparent),0 0 38px color-mix(in srgb,var(--accent,#00e676) 12%,transparent)}
.lcd-screen{box-shadow:inset 0 2px 14px rgba(0,0,0,.55),inset 0 0 22px color-mix(in srgb,var(--lcd-text,#0f6) 10%,transparent)}
.res-layer,.exp-layer{font-variant-numeric:tabular-nums}
.site-label{text-shadow:0 0 14px color-mix(in srgb,var(--accent,#00e676) 55%,transparent)}

/* aesthetic backdrops per theme (background-image only, your colours stay) */
body{background-repeat:no-repeat;background-attachment:scroll}
body.theme-dark{background-image:radial-gradient(900px 520px at 50% -10%,rgba(56,189,248,.10),transparent 60%),radial-gradient(700px 420px at 100% 100%,rgba(99,102,241,.09),transparent 60%)}
body.theme-neon{background-image:radial-gradient(820px 500px at 50% -10%,rgba(0,255,156,.14),transparent 60%),radial-gradient(620px 420px at 0 100%,rgba(0,255,156,.07),transparent 60%)}
body.theme-cyberpunk{background-image:radial-gradient(820px 500px at 15% -10%,rgba(255,43,214,.18),transparent 60%),radial-gradient(720px 440px at 100% 100%,rgba(0,229,255,.14),transparent 60%)}
body.theme-retro{background-repeat:repeat;background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.035) 0 2px,transparent 2px 6px),radial-gradient(820px 520px at 50% -10%,rgba(255,255,255,.12),transparent 60%)}

/* smooth cross-fade only while the theme is switching */
.rx-theming,.rx-theming *{transition:background-color .35s ease,color .35s ease,border-color .35s ease,box-shadow .35s ease!important}

/* theme picker popover */
.theme-pick.rx-pop select{pointer-events:none}
.rx-themes{position:fixed;z-index:950;min-width:190px;max-width:calc(100vw - 16px);padding:6px;border-radius:16px;background:color-mix(in srgb,var(--lcd-bg,#0a120b) 35%,#05080a);border:1px solid color-mix(in srgb,var(--accent,#00e676) 40%,transparent);box-shadow:0 14px 40px rgba(0,0,0,.6);transform-origin:top right;animation:rxpop .16s ease-out}
.rx-themes[hidden]{display:none}
@keyframes rxpop{from{opacity:0;transform:scale(.94) translateY(-4px)}to{opacity:1;transform:none}}
.rx-themes button{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;border-radius:10px;cursor:pointer;color:#e8f1ec;font:500 13.5px Poppins,sans-serif;-webkit-tap-highlight-color:transparent}
.rx-themes button:hover,.rx-themes button:focus-visible{background:rgba(255,255,255,.09)}
.rx-themes button[aria-checked=true]{background:color-mix(in srgb,var(--accent,#00e676) 18%,transparent)}
.rx-themes i{width:22px;height:22px;border-radius:50%;flex:none;border:1px solid rgba(255,255,255,.35)}
.rx-themes b{margin-left:auto;color:var(--accent,#00e676);opacity:0}
.rx-themes button[aria-checked=true] b{opacity:1}
.rx-themes .rx-cols{margin-top:6px;padding:10px 8px 6px;border-top:1px solid rgba(255,255,255,.12)}
.rx-cols-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 4px 8px;font:600 11px Poppins,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#9fb3a8}
.rx-cols-h small{font:500 10.5px Poppins,sans-serif;letter-spacing:0;text-transform:none;opacity:.7}
.rx-cols-r{display:flex;gap:6px}
.rx-themes .rx-cols button{all:unset;box-sizing:border-box;flex:1;display:grid;place-items:center;gap:2px;padding:8px 0 7px;border-radius:10px;cursor:pointer;color:#e8f1ec;font:600 15px Poppins,sans-serif;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);-webkit-tap-highlight-color:transparent}
.rx-themes .rx-cols button:hover,.rx-themes .rx-cols button:focus-visible{background:rgba(255,255,255,.1)}
.rx-themes .rx-cols button[aria-pressed=true]{background:color-mix(in srgb,var(--accent,#00e676) 20%,transparent);border-color:var(--accent,#00e676);color:var(--accent,#00e676)}
.button-grid[hidden]{display:none!important}
.rx-flow{grid-template-columns:repeat(var(--rx-n,6),minmax(0,1fr))!important;column-gap:5px;row-gap:4px}
.rx-flow .btn-wrapper{min-width:0}
.rx-flow .shift-label{font-size:calc(8px*var(--rx-k,1));max-width:100%;overflow:hidden}
.rx-flow button{font-size:calc(11px*var(--rx-k,1))!important;padding:calc(7px*var(--rx-k,1)) 0;letter-spacing:-.2px;white-space:nowrap;overflow:hidden}
body.shift-mode-active .rx-flow .btn-wrapper.has-shift .shift-label{font-size:calc(9.5px*var(--rx-k,1))}


/* thin theme-coloured light that circles the navigation pad (refresh-style) */
.rx-orbit{position:absolute;inset:-3px;border-radius:50%;pointer-events:none;z-index:3;opacity:0;filter:drop-shadow(0 0 3px color-mix(in srgb,var(--accent,#00e676) 70%,transparent))}
.rx-orbit::before{content:"";position:absolute;inset:0;border-radius:50%;
  background:conic-gradient(from 0deg,transparent 0deg,transparent 170deg,color-mix(in srgb,var(--accent,#00e676) 45%,transparent) 290deg,var(--accent,#00e676) 360deg);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2.5px));
  mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2.5px))}
.replayer.rx-glow .rx-orbit{animation:rxSpin 1.05s cubic-bezier(.4,.1,.3,1) both}
/* math error: red light, anticlockwise */
.replayer.rx-err .rx-orbit{--accent:#ff2b2b;animation:rxSpinR 1.05s cubic-bezier(.4,.1,.3,1) both}
.replayer.rx-err .rx-orbit::before{transform:scaleX(-1)}
@keyframes rxSpinR{0%{opacity:0;transform:rotate(0)}15%{opacity:1}80%{opacity:1}100%{opacity:0;transform:rotate(-540deg)}}
@keyframes rxSpin{0%{opacity:0;transform:rotate(0)}15%{opacity:1}80%{opacity:1}100%{opacity:0;transform:rotate(540deg)}}

@media (prefers-reduced-motion:reduce){.replayer.rx-glow .rx-orbit,.replayer.rx-err .rx-orbit{animation:none}.calculator-frame button,.rx-themes{transition:none;animation:none}.rx-theming,.rx-theming *{transition:none!important}}
`;
{ const st = document.createElement("style"); st.id = "rx-wow-css"; st.textContent = css; document.head.append(st); }

/* ---------- 0b. Ring pulse (power ON, theme change, "=", angle/mode change) ---------- */
let ringTimer = null;
function ring(isErr) {
  const el = $(".replayer"); if (!el) return;
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  if (!$(".rx-orbit", el)) { const o = document.createElement("span"); o.className = "rx-orbit"; o.setAttribute("aria-hidden", "true"); el.append(o); }
  el.classList.remove("rx-glow", "rx-err"); void el.offsetWidth; el.classList.add(isErr ? "rx-err" : "rx-glow");
  clearTimeout(ringTimer); ringTimer = setTimeout(() => el.classList.remove("rx-glow", "rx-err"), 1150);
}

/* ---------- 1. Theme: remembered + smooth switch ---------- */
const THEMES = [
  ["theme-dark", "Dark Classic", "linear-gradient(135deg,#1b2433,#38bdf8)"],
  ["theme-neon", "Neon Matrix", "linear-gradient(135deg,#021a0a,#00ff9c)"],
  ["theme-cyberpunk", "Cyberpunk", "linear-gradient(135deg,#1a0b2e,#ff2bd6 55%,#00e5ff)"],
  ["theme-retro", "Retro Gray", "linear-gradient(135deg,#8d8d87,#dcd6c8)"]
];
const _changeTheme = window.changeTheme;
let themeTimer = null;
window.changeTheme = (t) => {
  const root = document.documentElement;
  root.classList.add("rx-theming"); clearTimeout(themeTimer);
  themeTimer = setTimeout(() => root.classList.remove("rx-theming"), 450);
  _changeTheme(t); store.set("calcTheme", t); ring();
  const sel = $(".theme-select"); if (sel) sel.value = t;
};
{
  const saved = store.get("calcTheme"), sel = $(".theme-select");
  if (saved && THEMES.some((x) => x[0] === saved)) { _changeTheme(saved); if (sel) sel.value = saved; }
}

/* ---------- 1b. Keypad columns: the 42 scientific keys re-flow into 6 (default), 7 or 8 per row ---------- */
const COLS = [6, 7, 8];
const gridApi = (() => {
  const rows = [...document.querySelectorAll(".button-grid.scientific")];   // the 7 rows of 6 keys; the 5-column number pad is left alone
  const DEF = 6;
  if (!rows.length) return { has: false, def: DEF, get: () => DEF, set: () => DEF };
  const cells = rows.map((r) => [...r.children]);                           // remember which row each key came from
  let flow = null, cur = DEF;
  const unflow = () => {
    if (!flow) return;
    rows.forEach((r, i) => { cells[i].forEach((c) => { c.style.removeProperty("grid-column"); r.append(c); }); r.hidden = false; });
    flow.remove(); flow = null;
  };
  const apply = (n) => {
    n = COLS.includes(n) ? n : DEF;
    if (n === DEF) { unflow(); cur = DEF; store.set("calcCols", String(DEF)); return cur; }
    if (!flow) {
      flow = document.createElement("div"); flow.className = "button-grid scientific rx-flow";
      rows[0].before(flow);
      cells.forEach((row) => row.forEach((c) => flow.append(c)));
      rows.forEach((r) => { r.hidden = true; });
    }
    const all = cells.flat(); all.forEach((c) => c.style.removeProperty("grid-column"));
    const rem = all.length % n;                                            // keys left over in the last row stretch to fill it
    if (rem) { const base = Math.floor(n / rem), extra = n % rem; all.slice(-rem).forEach((c, i) => { c.style.gridColumn = "span " + (base + (i < extra ? 1 : 0)); }); }
    flow.style.setProperty("--rx-n", n);
    flow.style.setProperty("--rx-k", (DEF / n).toFixed(3));
    cur = n; store.set("calcCols", String(n));
    return cur;
  };
  const saved = parseInt(store.get("calcCols"), 10);
  if (COLS.includes(saved) && saved !== DEF) apply(saved);
  return { has: true, def: DEF, get: () => cur, set: apply };
})();
window.ROITX_GRID = gridApi;

/* ---------- 2. Theme picker popover (falls back to the native select if anything fails) ---------- */
const pickBtn = $(".theme-pick"), pickSel = $(".theme-select");
let pop = null;
if (pickBtn && pickSel) {
  pop = document.createElement("div");
  pop.className = "rx-themes"; pop.hidden = true; pop.setAttribute("role", "menu");
  pop.innerHTML = THEMES.map(([v, n, g]) => `<button type="button" role="menuitemradio" data-t="${v}"><i style="background:${g}"></i>${n}<b>✓</b></button>`).join("");
  if (gridApi.has) {
    const sec = document.createElement("div"); sec.className = "rx-cols"; sec.setAttribute("role", "group"); sec.setAttribute("aria-label", "Keys per row");
    sec.innerHTML = `<div class="rx-cols-h">Keys per row<small>default ${gridApi.def}</small></div><div class="rx-cols-r">${COLS.map((n) => `<button type="button" data-n="${n}" aria-pressed="false">${n}</button>`).join("")}</div>`;
    const sync = () => sec.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.n === gridApi.get())));
    sec.addEventListener("click", (e) => { const x = e.target.closest("button"); if (!x) return; e.stopPropagation(); gridApi.set(+x.dataset.n); sync(); ring(); });
    sync(); pop.append(sec);
  }
  document.body.append(pop);
  pickBtn.classList.add("rx-pop"); pickBtn.setAttribute("role", "button"); pickBtn.setAttribute("aria-haspopup", "menu"); pickBtn.tabIndex = 0;
  const mark = () => pop.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.t === pickSel.value)));
  const place = () => {
    const r = pickBtn.getBoundingClientRect(), w = pop.offsetWidth || 200;
    pop.style.top = r.bottom + 8 + "px";
    pop.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + "px";
  };
  const open = () => { mark(); pop.hidden = false; place(); const on = pop.querySelector('[aria-checked="true"]'); if (on && !touchFirst) on.focus({ preventScroll: true }); };
  const close = () => { pop.hidden = true; };
  const toggle = () => (pop.hidden ? open() : close());
  pickBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
  pickBtn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  pop.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b || b.closest(".rx-cols")) return; window.changeTheme(b.dataset.t); close(); pickBtn.focus({ preventScroll: true }); });
  document.addEventListener("click", (e) => { if (!pop.hidden && !pop.contains(e.target)) close(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !pop.hidden) close(); });
  addEventListener("resize", () => { if (!pop.hidden) place(); });
}

/* ---------- 2b. About dialog (ⓘ button) ---------- */
{
  const about = $("#rxAbout"), infoBtn = $(".rx-info");
  if (about && infoBtn) {
    const open = () => { about.classList.add("on"); document.body.style.overflow = "hidden"; const x = $(".rx-about-x", about); if (x) x.focus({ preventScroll: true }); };
    const close = () => { about.classList.remove("on"); document.body.style.overflow = ""; infoBtn.focus({ preventScroll: true }); };
    infoBtn.addEventListener("click", open);
    about.addEventListener("click", (e) => { if (e.target === about || e.target.closest(".rx-about-x")) close(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && about.classList.contains("on")) close(); });
  }
}

/* ---------- 3. Haptic tick on key press (phones) ---------- */
document.addEventListener("pointerdown", (e) => {
  if (navigator.vibrate && e.target.closest && e.target.closest(".calculator-frame button")) navigator.vibrate(8);
}, { passive: true });

/* ---------- 4. Tap the result to copy ---------- */
const resEl = $("#result");
if (resEl) {
  resEl.title = "Tap to copy";
  resEl.addEventListener("click", () => {
    const t = resEl.innerText.trim();
    if (!t || t === "0" || /ERROR|^ROITX|^fx-|→$/.test(t)) return;
    const T = TK(); if (T) T.copy(t);
  });
}

/* ---------- 5. Live preview while typing ---------- */
const E = window.ROITX_EXT;
const HEAVY = /[∫ΣΠ=]|d\/dx|(^|[^A-Za-z0-9_])d\(|Ran|MatAns|Pol\(|Rec\(|Fact\(|DivR\(/;
let timer = null, base = null, shown = null;
function restore() {
  if (shown !== null && resEl.innerText === shown && base !== null) resEl.innerText = base;
  if (resEl) resEl.classList.remove("rx-prev");
  shown = null;
}
function run() {
  if (!E || !resEl || !exp || HEAVY.test(exp)) { restore(); return; }
  if (/→$/.test(resEl.innerText)) return; // STO / RCL prompt is showing
  if (resEl.innerText !== shown) { resEl.classList.remove("rx-prev"); base = resEl.innerText; shown = null; }
  try {
    const v = E.evalExp(exp);
    if (typeof v !== "number" || !isFinite(v)) throw 0;
    const t = String(window.formatFinal(v));
    shown = t; resEl.innerText = t; resEl.classList.add("rx-prev");
  } catch (e) { restore(); }
}
function schedule() {
  clearTimeout(timer);
  if (!exp) { restore(); return; }
  timer = setTimeout(run, touchFirst ? 300 : 220); // a little calmer on phones
}
const _updateDisplay = window.updateDisplay;
window.updateDisplay = function () { _updateDisplay.apply(this, arguments); schedule(); };
const _calculate = window.calculate;
window.calculate = function () {
  clearTimeout(timer); shown = null; if (resEl) resEl.classList.remove("rx-prev");
  const r = _calculate.apply(this, arguments);
  ring(!!resEl && /ERROR/i.test(resEl.innerText)); // red + anticlockwise on math error
  return r;
};

/* ---------- 5b. More ring triggers: ON key, DEG/RAD, MODE sheet options ---------- */
{
  const _on = window.powerOn;
  if (_on) window.powerOn = function () { ring(); return _on.apply(this, arguments); };
  const _tdr = window.toggleDegRad;
  if (_tdr) window.toggleDegRad = function () { const r = _tdr.apply(this, arguments); ring(); return r; };
  document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#rxs [data-g] button")) ring(); });
  setTimeout(ring, 400); // greets the page load
}

/* ---------- 6. Physical keyboard (desktop, tablets with keyboard) ---------- */
function blocked() {
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
  if (a && a.closest && a.closest(".rx-themes,.theme-pick")) return true;
  if (pop && !pop.hidden) return true;
  if ($(".tk.on, .rx-about.on")) return true;
  return ["aiModal", "guideModal", "keysGuideModal", "authModal"].some((id) => {
    const m = document.getElementById(id);
    return m && m.style.display && m.style.display !== "none";
  });
}
const KEYS = { "^": "POW", ",": "COMMA", "%": "MOD" };
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || blocked()) return;
  const k = e.key; let done = true;
  if (/^[0-9.+\-*\/()]$/.test(k)) window.btnPress(k);
  else if (KEYS[k]) window.btnPress(KEYS[k]);
  else if (k === "Enter" || k === "=") window.calculate();
  else if (k === "Backspace") window.del();
  else if (k === "Escape") window.clearAll();
  else if (k === "ArrowLeft") window.moveCursor(-1);
  else if (k === "ArrowRight") window.moveCursor(1);
  else if (k === "ArrowUp") window.navigateHistory(1);
  else if (k === "ArrowDown") window.navigateHistory(-1);
  else done = false;
  if (done) e.preventDefault(); // also stops Enter from re-clicking a focused key
});

/* ---------- 7. One-time tip (wording fits the device) ---------- */
if (!store.get("calcTip")) {
  setTimeout(() => {
    toast(touchFirst ? "Tip: tap the result to copy it · 🎨 changes theme" : "Tip: type on your keyboard · click the result to copy");
    store.set("calcTip", "1");
  }, 2200);
}
})();
