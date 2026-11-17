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


/* thin theme-coloured light that circles the navigation pad (refresh-style) */
.rx-orbit{position:absolute;inset:-3px;border-radius:50%;pointer-events:none;z-index:3;opacity:0;filter:drop-shadow(0 0 3px color-mix(in srgb,var(--accent,#00e676) 70%,transparent))}
.rx-orbit::before{content:"";position:absolute;inset:0;border-radius:50%;
  background:conic-gradient(from 0deg,transparent 0deg,transparent 170deg,color-mix(in srgb,var(--accent,#00e676) 45%,transparent) 290deg,var(--accent,#00e676) 360deg);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2.5px));
  mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2.5px))}
.replayer.rx-glow .rx-orbit{animation:rxSpin 1.05s cubic-bezier(.4,.1,.3,1) both}
@keyframes rxSpin{0%{opacity:0;transform:rotate(0)}15%{opacity:1}80%{opacity:1}100%{opacity:0;transform:rotate(540deg)}}

@media (prefers-reduced-motion:reduce){.replayer.rx-glow .rx-orbit{animation:none}.calculator-frame button,.rx-themes{transition:none;animation:none}.rx-theming,.rx-theming *{transition:none!important}}
`;
{ const st = document.createElement("style"); st.id = "rx-wow-css"; st.textContent = css; document.head.append(st); }

/* ---------- 0b. Ring pulse (power ON, theme change, "=", angle/mode change) ---------- */
let ringTimer = null;
function ring() {
  const el = $(".replayer"); if (!el) return;
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  if (!$(".rx-orbit", el)) { const o = document.createElement("span"); o.className = "rx-orbit"; o.setAttribute("aria-hidden", "true"); el.append(o); }
  el.classList.remove("rx-glow"); void el.offsetWidth; el.classList.add("rx-glow");
  clearTimeout(ringTimer); ringTimer = setTimeout(() => el.classList.remove("rx-glow"), 1150);
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

/* ---------- 2. Theme picker popover (falls back to the native select if anything fails) ---------- */
const pickBtn = $(".theme-pick"), pickSel = $(".theme-select");
let pop = null;
if (pickBtn && pickSel) {
  pop = document.createElement("div");
  pop.className = "rx-themes"; pop.hidden = true; pop.setAttribute("role", "menu");
  pop.innerHTML = THEMES.map(([v, n, g]) => `<button type="button" role="menuitemradio" data-t="${v}"><i style="background:${g}"></i>${n}<b>✓</b></button>`).join("");
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
  pop.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; window.changeTheme(b.dataset.t); close(); pickBtn.focus({ preventScroll: true }); });
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
window.calculate = function () { ring(); clearTimeout(timer); shown = null; if (resEl) resEl.classList.remove("rx-prev"); return _calculate.apply(this, arguments); };

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
