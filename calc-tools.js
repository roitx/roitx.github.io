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
  root.querySelectorAll(".tk-tabs button").forEach((b) => { const on = b.dataset.t === t; b.classList.toggle("on", on); if (on) b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); });
  const body = $(".tk-body", root), fresh = body.cloneNode(false); body.replaceWith(fresh); R[t](fresh);
}
addEventListener("keydown", (e) => { if (e.key !== "Escape") return; const g = $(".tk-gw.full"); if (g) { $("[data-a=gfs]", g).click(); return; } close(); });
addEventListener("resize", () => gdraw && gdraw());

/* ---- History ---- */
R.hist = (b) => {
  const all = LS("calcHistory", []).slice().reverse(); let pins = LS("calcHistPins", []), q = "";
  if (!all.length && !pins.length) { b.innerHTML = `<div class="tk-empty">No calculations yet.<br>Your last 20 results will appear here.</div>`; return; }
  const row = (x, on) => { const i = x.lastIndexOf("="), e = x.slice(0, i), v = x.slice(i + 1); return `<div class="tk-item"><button class="e" data-e="${esc(e)}">${esc(e)}<small>= ${esc(v)}</small></button><button class="u" data-r="${esc(v)}">Use</button><button class="u" data-p="${esc(x)}" aria-label="${on ? "Unpin" : "Pin"}" style="font-size:17px">${on ? "★" : "☆"}</button></div>`; };
  b.innerHTML = `<input id="hq" type="search" placeholder="Search history…" autocomplete="off"><div class="tk-row tk-end"><button class="tk-b" data-a="clr">Clear history</button></div><div id="hl"></div>`;
  const draw = () => {
    const m = (x) => !q || x.toLowerCase().includes(q), P = pins.filter(m), H = all.filter((x) => !pins.includes(x)).filter(m);
    $("#hl", b).innerHTML = (P.length ? `<p class="tk-dim" style="margin:6px 0">★ Pinned</p>${P.map((x) => row(x, 1)).join("")}` : "") + (H.length ? (P.length ? `<p class="tk-dim" style="margin:10px 0 6px">Recent</p>` : "") + H.map((x) => row(x, 0)).join("") : "") + (!P.length && !H.length ? `<div class="tk-empty">Nothing matches "${esc(q)}".</div>` : "");
  };
  draw();
  $("#hq", b).addEventListener("input", (ev) => { q = ev.target.value.trim().toLowerCase(); draw(); });
  b.onclick = (ev) => {
    const t = ev.target.closest("button"); if (!t) return;
    if (t.dataset.a) { SV("calcHistory", []); R.hist(b); }
    else if (t.dataset.p !== undefined) { const x = t.dataset.p; pins = pins.includes(x) ? pins.filter((y) => y !== x) : [x, ...pins].slice(0, 30); SV("calcHistPins", pins); draw(); }
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
  /* ===== ALGEBRA: exponents ===== */
  ["Algebra", "Product of powers (a^m × a^n)", r`a^m\times a^n=a^{m+n}`],
  ["Algebra", "Quotient of powers (a^m ÷ a^n)", r`\frac{a^m}{a^n}=a^{m-n}`],
  ["Algebra", "Power of a power ((a^m)^n)", r`(a^m)^n=a^{mn}`],
  ["Algebra", "Power of a product", r`(ab)^n=a^n b^n`],
  ["Algebra", "Power of a quotient", r`\left(\frac{a}{b}\right)^n=\frac{a^n}{b^n}`],
  ["Algebra", "Zero exponent", r`a^0=1\quad(a\neq0)`],
  ["Algebra", "Negative exponent", r`a^{-n}=\frac{1}{a^n}`],
  ["Algebra", "Fractional exponent", r`a^{m/n}=\sqrt[n]{a^m}=\left(\sqrt[n]{a}\right)^m`],
  ["Algebra", "Same power, different base (a^m × b^m)", r`a^m b^m=(ab)^m`],
  ["Algebra", "Root of a product", r`\sqrt{ab}=\sqrt{a}\,\sqrt{b}`],
  ["Algebra", "Root of a quotient", r`\sqrt{\frac{a}{b}}=\frac{\sqrt{a}}{\sqrt{b}}`],
  ["Algebra", "Root as power", r`\sqrt[n]{a}=a^{1/n}`],
  /* ===== ALGEBRA: identities ===== */
  ["Algebra", "Square of a sum", r`(a+b)^2=a^2+2ab+b^2`],
  ["Algebra", "Square of a difference", r`(a-b)^2=a^2-2ab+b^2`],
  ["Algebra", "Difference of squares", r`a^2-b^2=(a+b)(a-b)`],
  ["Algebra", "Cube of a sum", r`(a+b)^3=a^3+3a^2b+3ab^2+b^3`],
  ["Algebra", "Cube of a difference", r`(a-b)^3=a^3-3a^2b+3ab^2-b^3`],
  ["Algebra", "Sum of cubes", r`a^3+b^3=(a+b)(a^2-ab+b^2)`],
  ["Algebra", "Difference of cubes", r`a^3-b^3=(a-b)(a^2+ab+b^2)`],
  ["Algebra", "Square of three terms", r`(a+b+c)^2=a^2+b^2+c^2+2ab+2bc+2ca`],
  ["Algebra", "a³+b³+c³−3abc", r`a^3+b^3+c^3-3abc=(a+b+c)(a^2+b^2+c^2-ab-bc-ca)`],
  ["Algebra", "Product of two binomials", r`(x+a)(x+b)=x^2+(a+b)x+ab`],
  ["Algebra", "a²+b² in terms of (a+b)", r`a^2+b^2=(a+b)^2-2ab`],
  ["Algebra", "a²+b² in terms of (a−b)", r`a^2+b^2=(a-b)^2+2ab`],
  ["Algebra", "(a+b)² − (a−b)²", r`(a+b)^2-(a-b)^2=4ab`],
  ["Algebra", "(a+b)² + (a−b)²", r`(a+b)^2+(a-b)^2=2(a^2+b^2)`],
  ["Algebra", "Fourth power difference", r`a^4-b^4=(a^2+b^2)(a+b)(a-b)`],
  ["Algebra", "a²+1/a² identity", r`a^2+\frac{1}{a^2}=\left(a+\frac{1}{a}\right)^2-2`],
  /* ===== ALGEBRA: quadratic ===== */
  ["Algebra", "Quadratic roots", r`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`],
  ["Algebra", "Discriminant", r`D=b^2-4ac`],
  ["Algebra", "Sum of roots", r`\alpha+\beta=-\frac{b}{a}`],
  ["Algebra", "Product of roots", r`\alpha\beta=\frac{c}{a}`],
  ["Algebra", "Quadratic from its roots", r`x^2-(\alpha+\beta)x+\alpha\beta=0`],
  ["Algebra", "Difference of roots", r`|\alpha-\beta|=\frac{\sqrt{D}}{|a|}`],
  ["Algebra", "Vertex of a parabola", r`x=-\frac{b}{2a}`],
  /* ===== ALGEBRA: progressions & series ===== */
  ["Algebra", "AP: nth term", r`a_n=a+(n-1)d`],
  ["Algebra", "Sum of an AP", r`S_n=\frac{n}{2}\left[2a+(n-1)d\right]`],
  ["Algebra", "Sum of an AP (first + last)", r`S_n=\frac{n}{2}(a+l)`],
  ["Algebra", "Arithmetic mean", r`A=\frac{a+b}{2}`],
  ["Algebra", "GP: nth term", r`a_n=ar^{n-1}`],
  ["Algebra", "Sum of a GP", r`S_n=\frac{a(r^n-1)}{r-1}\quad(r\neq1)`],
  ["Algebra", "Sum of infinite GP", r`S_\infty=\frac{a}{1-r}\quad(|r|<1)`],
  ["Algebra", "Geometric mean", r`G=\sqrt{ab}`],
  ["Algebra", "HP: harmonic mean", r`H=\frac{2ab}{a+b}`],
  ["Algebra", "Sum of first n natural numbers", r`1+2+\dots+n=\frac{n(n+1)}{2}`],
  ["Algebra", "Sum of squares", r`1^2+2^2+\dots+n^2=\frac{n(n+1)(2n+1)}{6}`],
  ["Algebra", "Sum of cubes (series)", r`1^3+2^3+\dots+n^3=\left[\frac{n(n+1)}{2}\right]^2`],
  ["Algebra", "Sum of first n odd numbers", r`1+3+5+\dots+(2n-1)=n^2`],
  /* ===== ALGEBRA: logarithms ===== */
  ["Algebra", "Log of a product", r`\log_a(mn)=\log_a m+\log_a n`],
  ["Algebra", "Log of a quotient", r`\log_a\frac{m}{n}=\log_a m-\log_a n`],
  ["Algebra", "Log of a power", r`\log_a m^n=n\log_a m`],
  ["Algebra", "Change of base", r`\log_a b=\frac{\log_c b}{\log_c a}`],
  ["Algebra", "Reciprocal of log base", r`\log_a b=\frac{1}{\log_b a}`],
  ["Algebra", "Log of the base and of 1", r`\log_a a=1,\quad\log_a 1=0`],
  ["Algebra", "a^(log_a x)", r`a^{\log_a x}=x`],
  ["Algebra", "Log to exponent form", r`\log_a x=y\iff a^y=x`],
  ["Algebra", "Natural log and e", r`\ln e=1,\quad e^{\ln x}=x`],
  /* ===== ALGEBRA: binomial, permutations, others ===== */
  ["Algebra", "Binomial theorem", r`(x+y)^n=\sum_{k=0}^{n}\binom{n}{k}x^{n-k}y^k`],
  ["Algebra", "General term of binomial", r`T_{r+1}=\binom{n}{r}x^{n-r}y^r`],
  ["Algebra", "Permutation nPr", r`{}^nP_r=\frac{n!}{(n-r)!}`],
  ["Algebra", "Combination nCr", r`{}^nC_r=\frac{n!}{r!\,(n-r)!}`],
  ["Algebra", "Combination symmetry", r`{}^nC_r={}^nC_{n-r}`],
  ["Algebra", "Pascal's rule", r`{}^nC_r+{}^nC_{r-1}={}^{n+1}C_r`],
  ["Algebra", "Factorial", r`n!=n(n-1)(n-2)\cdots 3\cdot2\cdot1`],
  ["Algebra", "Modulus inequality (less than)", r`|x|<a\iff -a<x<a`],
  ["Algebra", "Modulus inequality (greater than)", r`|x|>a\iff x<-a\ \text{or}\ x>a`],
  ["Algebra", "Simple interest", r`SI=\frac{PRT}{100}`],
  ["Algebra", "Compound interest", r`A=P\left(1+\frac{R}{100}\right)^n`],
  ["Algebra", "Percentage change", r`\%\text{ change}=\frac{\text{new}-\text{old}}{\text{old}}\times100`],
  ["Algebra", "Probability", r`P(A)=\frac{n(A)}{n(S)}`],
  ["Algebra", "Probability of union", r`P(A\cup B)=P(A)+P(B)-P(A\cap B)`],
  ["Algebra", "Conditional probability", r`P(A|B)=\frac{P(A\cap B)}{P(B)}`],
  ["Statistics", "Mean", r`\bar{x}=\frac{\sum x}{n}`],
  ["Statistics", "Variance", r`\sigma^2=\frac{\sum(x-\bar{x})^2}{n}`],
  ["Statistics", "Standard deviation", r`\sigma=\sqrt{\frac{\sum(x-\bar{x})^2}{n}}`],
  /* ===== TRIGONOMETRY: basics ===== */
  ["Trigonometry", "sin, cos, tan ratios", r`\sin\theta=\frac{P}{H},\ \cos\theta=\frac{B}{H},\ \tan\theta=\frac{P}{B}`],
  ["Trigonometry", "tan and cot in sin, cos", r`\tan\theta=\frac{\sin\theta}{\cos\theta},\quad\cot\theta=\frac{\cos\theta}{\sin\theta}`],
  ["Trigonometry", "Reciprocal ratios", r`\operatorname{cosec}\theta=\frac{1}{\sin\theta},\ \sec\theta=\frac{1}{\cos\theta},\ \cot\theta=\frac{1}{\tan\theta}`],
  ["Trigonometry", "Identity 1: sin² + cos²", r`\sin^2\theta+\cos^2\theta=1`],
  ["Trigonometry", "Identity 2: 1 + tan²", r`1+\tan^2\theta=\sec^2\theta`],
  ["Trigonometry", "Identity 3: 1 + cot²", r`1+\cot^2\theta=\operatorname{cosec}^2\theta`],
  ["Trigonometry", "Standard values of sin", r`\sin:\ 0^\circ,30^\circ,45^\circ,60^\circ,90^\circ\ \to\ 0,\ \tfrac12,\ \tfrac{1}{\sqrt2},\ \tfrac{\sqrt3}{2},\ 1`],
  ["Trigonometry", "Standard values of cos", r`\cos:\ 0^\circ,30^\circ,45^\circ,60^\circ,90^\circ\ \to\ 1,\ \tfrac{\sqrt3}{2},\ \tfrac{1}{\sqrt2},\ \tfrac12,\ 0`],
  ["Trigonometry", "Standard values of tan", r`\tan:\ 0^\circ,30^\circ,45^\circ,60^\circ,90^\circ\ \to\ 0,\ \tfrac{1}{\sqrt3},\ 1,\ \sqrt3,\ \infty`],
  ["Trigonometry", "Degrees and radians", r`\pi\ \text{rad}=180^\circ,\quad \text{rad}=\deg\times\frac{\pi}{180}`],
  ["Trigonometry", "Arc length", r`s=r\theta`],
  ["Trigonometry", "Area of a sector", r`A=\frac{1}{2}r^2\theta`],
  /* ===== TRIGONOMETRY: angle relations ===== */
  ["Trigonometry", "Negative angle: sin", r`\sin(-\theta)=-\sin\theta`],
  ["Trigonometry", "Negative angle: cos", r`\cos(-\theta)=\cos\theta`],
  ["Trigonometry", "Negative angle: tan", r`\tan(-\theta)=-\tan\theta`],
  ["Trigonometry", "Complementary angles", r`\sin(90^\circ-\theta)=\cos\theta,\ \cos(90^\circ-\theta)=\sin\theta,\ \tan(90^\circ-\theta)=\cot\theta`],
  ["Trigonometry", "Supplementary angles", r`\sin(180^\circ-\theta)=\sin\theta,\ \cos(180^\circ-\theta)=-\cos\theta,\ \tan(180^\circ-\theta)=-\tan\theta`],
  ["Trigonometry", "90° + θ", r`\sin(90^\circ+\theta)=\cos\theta,\ \cos(90^\circ+\theta)=-\sin\theta,\ \tan(90^\circ+\theta)=-\cot\theta`],
  ["Trigonometry", "180° + θ", r`\sin(180^\circ+\theta)=-\sin\theta,\ \cos(180^\circ+\theta)=-\cos\theta,\ \tan(180^\circ+\theta)=\tan\theta`],
  ["Trigonometry", "360° − θ", r`\sin(360^\circ-\theta)=-\sin\theta,\ \cos(360^\circ-\theta)=\cos\theta`],
  ["Trigonometry", "Periodicity", r`\sin(\theta+2\pi)=\sin\theta,\quad\tan(\theta+\pi)=\tan\theta`],
  /* ===== TRIGONOMETRY: sum, difference, multiple angles ===== */
  ["Trigonometry", "sin(A + B)", r`\sin(A+B)=\sin A\cos B+\cos A\sin B`],
  ["Trigonometry", "sin(A − B)", r`\sin(A-B)=\sin A\cos B-\cos A\sin B`],
  ["Trigonometry", "cos(A + B)", r`\cos(A+B)=\cos A\cos B-\sin A\sin B`],
  ["Trigonometry", "cos(A − B)", r`\cos(A-B)=\cos A\cos B+\sin A\sin B`],
  ["Trigonometry", "tan(A + B)", r`\tan(A+B)=\frac{\tan A+\tan B}{1-\tan A\tan B}`],
  ["Trigonometry", "tan(A − B)", r`\tan(A-B)=\frac{\tan A-\tan B}{1+\tan A\tan B}`],
  ["Trigonometry", "cot(A + B)", r`\cot(A+B)=\frac{\cot A\cot B-1}{\cot A+\cot B}`],
  ["Trigonometry", "sin(A+B) sin(A−B)", r`\sin(A+B)\sin(A-B)=\sin^2A-\sin^2B`],
  ["Trigonometry", "cos(A+B) cos(A−B)", r`\cos(A+B)\cos(A-B)=\cos^2A-\sin^2B`],
  ["Trigonometry", "Double angle: sin 2θ", r`\sin2\theta=2\sin\theta\cos\theta=\frac{2\tan\theta}{1+\tan^2\theta}`],
  ["Trigonometry", "Double angle: cos 2θ", r`\cos2\theta=\cos^2\theta-\sin^2\theta=2\cos^2\theta-1=1-2\sin^2\theta`],
  ["Trigonometry", "cos 2θ in tan", r`\cos2\theta=\frac{1-\tan^2\theta}{1+\tan^2\theta}`],
  ["Trigonometry", "Double angle: tan 2θ", r`\tan2\theta=\frac{2\tan\theta}{1-\tan^2\theta}`],
  ["Trigonometry", "Triple angle: sin 3θ", r`\sin3\theta=3\sin\theta-4\sin^3\theta`],
  ["Trigonometry", "Triple angle: cos 3θ", r`\cos3\theta=4\cos^3\theta-3\cos\theta`],
  ["Trigonometry", "Triple angle: tan 3θ", r`\tan3\theta=\frac{3\tan\theta-\tan^3\theta}{1-3\tan^2\theta}`],
  ["Trigonometry", "Half angle: sin²θ", r`\sin^2\theta=\frac{1-\cos2\theta}{2}`],
  ["Trigonometry", "Half angle: cos²θ", r`\cos^2\theta=\frac{1+\cos2\theta}{2}`],
  ["Trigonometry", "Half angle: sin(θ/2)", r`\sin\frac{\theta}{2}=\pm\sqrt{\frac{1-\cos\theta}{2}}`],
  ["Trigonometry", "Half angle: cos(θ/2)", r`\cos\frac{\theta}{2}=\pm\sqrt{\frac{1+\cos\theta}{2}}`],
  ["Trigonometry", "Half angle: tan(θ/2)", r`\tan\frac{\theta}{2}=\frac{\sin\theta}{1+\cos\theta}=\frac{1-\cos\theta}{\sin\theta}`],
  /* ===== TRIGONOMETRY: product and sum ===== */
  ["Trigonometry", "Product to sum: 2 sin A cos B", r`2\sin A\cos B=\sin(A+B)+\sin(A-B)`],
  ["Trigonometry", "Product to sum: 2 cos A sin B", r`2\cos A\sin B=\sin(A+B)-\sin(A-B)`],
  ["Trigonometry", "Product to sum: 2 cos A cos B", r`2\cos A\cos B=\cos(A+B)+\cos(A-B)`],
  ["Trigonometry", "Product to sum: 2 sin A sin B", r`2\sin A\sin B=\cos(A-B)-\cos(A+B)`],
  ["Trigonometry", "Sum to product: sin C + sin D", r`\sin C+\sin D=2\sin\frac{C+D}{2}\cos\frac{C-D}{2}`],
  ["Trigonometry", "Sum to product: sin C − sin D", r`\sin C-\sin D=2\cos\frac{C+D}{2}\sin\frac{C-D}{2}`],
  ["Trigonometry", "Sum to product: cos C + cos D", r`\cos C+\cos D=2\cos\frac{C+D}{2}\cos\frac{C-D}{2}`],
  ["Trigonometry", "Sum to product: cos C − cos D", r`\cos C-\cos D=-2\sin\frac{C+D}{2}\sin\frac{C-D}{2}`],
  ["Trigonometry", "a sin θ + b cos θ", r`a\sin\theta+b\cos\theta=\sqrt{a^2+b^2}\,\sin(\theta+\phi),\ \tan\phi=\frac{b}{a}`],
  /* ===== TRIGONOMETRY: triangles ===== */
  ["Trigonometry", "Sine rule", r`\frac{a}{\sin A}=\frac{b}{\sin B}=\frac{c}{\sin C}=2R`],
  ["Trigonometry", "Cosine rule", r`a^2=b^2+c^2-2bc\cos A`],
  ["Trigonometry", "Cosine rule (find the angle)", r`\cos A=\frac{b^2+c^2-a^2}{2bc}`],
  ["Trigonometry", "Projection rule", r`a=b\cos C+c\cos B`],
  ["Trigonometry", "Area of a triangle (sine)", r`\Delta=\frac{1}{2}ab\sin C`],
  ["Trigonometry", "Heron's formula", r`\Delta=\sqrt{s(s-a)(s-b)(s-c)},\ s=\frac{a+b+c}{2}`],
  ["Trigonometry", "Angle sum of a triangle", r`A+B+C=180^\circ`],
  /* ===== TRIGONOMETRY: inverse ===== */
  ["Trigonometry", "sin⁻¹ + cos⁻¹", r`\sin^{-1}x+\cos^{-1}x=\frac{\pi}{2}`],
  ["Trigonometry", "tan⁻¹ + cot⁻¹", r`\tan^{-1}x+\cot^{-1}x=\frac{\pi}{2}`],
  ["Trigonometry", "sec⁻¹ + cosec⁻¹", r`\sec^{-1}x+\operatorname{cosec}^{-1}x=\frac{\pi}{2}`],
  ["Trigonometry", "sin⁻¹(−x)", r`\sin^{-1}(-x)=-\sin^{-1}x`],
  ["Trigonometry", "cos⁻¹(−x)", r`\cos^{-1}(-x)=\pi-\cos^{-1}x`],
  ["Trigonometry", "tan⁻¹(−x)", r`\tan^{-1}(-x)=-\tan^{-1}x`],
  ["Trigonometry", "tan⁻¹x + tan⁻¹y", r`\tan^{-1}x+\tan^{-1}y=\tan^{-1}\frac{x+y}{1-xy}`],
  ["Trigonometry", "tan⁻¹x − tan⁻¹y", r`\tan^{-1}x-\tan^{-1}y=\tan^{-1}\frac{x-y}{1+xy}`],
  ["Trigonometry", "2 tan⁻¹x as tan⁻¹", r`2\tan^{-1}x=\tan^{-1}\frac{2x}{1-x^2}`],
  ["Trigonometry", "2 tan⁻¹x as sin⁻¹", r`2\tan^{-1}x=\sin^{-1}\frac{2x}{1+x^2}`],
  ["Trigonometry", "2 tan⁻¹x as cos⁻¹", r`2\tan^{-1}x=\cos^{-1}\frac{1-x^2}{1+x^2}`],
  ["Trigonometry", "sin⁻¹(sin x)", r`\sin^{-1}(\sin x)=x,\ x\in\left[-\tfrac{\pi}{2},\tfrac{\pi}{2}\right]`],
  ["Trigonometry", "Principal value ranges", r`\sin^{-1}:[-\tfrac{\pi}{2},\tfrac{\pi}{2}],\ \cos^{-1}:[0,\pi],\ \tan^{-1}:(-\tfrac{\pi}{2},\tfrac{\pi}{2})`],
  ["Trigonometry", "Inverse trig conversion", r`\sin^{-1}x=\cos^{-1}\sqrt{1-x^2}=\tan^{-1}\frac{x}{\sqrt{1-x^2}}`],
  /* ===== TRIGONOMETRY: general solutions, complex ===== */
  ["Trigonometry", "General solution: sin", r`\sin\theta=\sin\alpha\Rightarrow\theta=n\pi+(-1)^n\alpha`],
  ["Trigonometry", "General solution: cos", r`\cos\theta=\cos\alpha\Rightarrow\theta=2n\pi\pm\alpha`],
  ["Trigonometry", "General solution: tan", r`\tan\theta=\tan\alpha\Rightarrow\theta=n\pi+\alpha`],
  ["Trigonometry", "Euler's formula", r`e^{i\theta}=\cos\theta+i\sin\theta`],
  ["Trigonometry", "De Moivre's theorem", r`(\cos\theta+i\sin\theta)^n=\cos n\theta+i\sin n\theta`],
  ["Trigonometry", "Hyperbolic identity", r`\cosh^2x-\sinh^2x=1`],
  /* ===== CALCULUS: derivatives ===== */
  ["Calculus", "Power rule", r`\frac{d}{dx}x^n=nx^{n-1}`],
  ["Calculus", "Derivative of a constant", r`\frac{d}{dx}(c)=0`],
  ["Calculus", "Derivative of sin x", r`\frac{d}{dx}\sin x=\cos x`],
  ["Calculus", "Derivative of cos x", r`\frac{d}{dx}\cos x=-\sin x`],
  ["Calculus", "Derivative of tan x", r`\frac{d}{dx}\tan x=\sec^2x`],
  ["Calculus", "Derivative of cot x", r`\frac{d}{dx}\cot x=-\operatorname{cosec}^2x`],
  ["Calculus", "Derivative of sec x", r`\frac{d}{dx}\sec x=\sec x\tan x`],
  ["Calculus", "Derivative of cosec x", r`\frac{d}{dx}\operatorname{cosec}x=-\operatorname{cosec}x\cot x`],
  ["Calculus", "Derivative of eˣ", r`\frac{d}{dx}e^x=e^x`],
  ["Calculus", "Derivative of aˣ", r`\frac{d}{dx}a^x=a^x\ln a`],
  ["Calculus", "Derivative of ln x", r`\frac{d}{dx}\ln x=\frac{1}{x}`],
  ["Calculus", "Derivative of log_a x", r`\frac{d}{dx}\log_a x=\frac{1}{x\ln a}`],
  ["Calculus", "Derivative of sin⁻¹x", r`\frac{d}{dx}\sin^{-1}x=\frac{1}{\sqrt{1-x^2}}`],
  ["Calculus", "Derivative of cos⁻¹x", r`\frac{d}{dx}\cos^{-1}x=-\frac{1}{\sqrt{1-x^2}}`],
  ["Calculus", "Derivative of tan⁻¹x", r`\frac{d}{dx}\tan^{-1}x=\frac{1}{1+x^2}`],
  ["Calculus", "Product rule", r`(uv)'=u'v+uv'`],
  ["Calculus", "Quotient rule", r`\left(\frac{u}{v}\right)'=\frac{u'v-uv'}{v^2}`],
  ["Calculus", "Chain rule", r`\frac{dy}{dx}=\frac{dy}{du}\cdot\frac{du}{dx}`],
  /* ===== CALCULUS: integrals ===== */
  ["Calculus", "Power integral", r`\int x^n\,dx=\frac{x^{n+1}}{n+1}+C\quad(n\neq-1)`],
  ["Calculus", "Integral of 1/x", r`\int\frac{1}{x}\,dx=\ln|x|+C`],
  ["Calculus", "Integral of eˣ", r`\int e^x\,dx=e^x+C`],
  ["Calculus", "Integral of aˣ", r`\int a^x\,dx=\frac{a^x}{\ln a}+C`],
  ["Calculus", "Integral of sin x", r`\int\sin x\,dx=-\cos x+C`],
  ["Calculus", "Integral of cos x", r`\int\cos x\,dx=\sin x+C`],
  ["Calculus", "Integral of sec²x", r`\int\sec^2x\,dx=\tan x+C`],
  ["Calculus", "Integral of cosec²x", r`\int\operatorname{cosec}^2x\,dx=-\cot x+C`],
  ["Calculus", "Integral of sec x tan x", r`\int\sec x\tan x\,dx=\sec x+C`],
  ["Calculus", "Integral of tan x", r`\int\tan x\,dx=\ln|\sec x|+C`],
  ["Calculus", "Integral of cot x", r`\int\cot x\,dx=\ln|\sin x|+C`],
  ["Calculus", "Integral of sec x", r`\int\sec x\,dx=\ln|\sec x+\tan x|+C`],
  ["Calculus", "Integral of cosec x", r`\int\operatorname{cosec}x\,dx=\ln|\operatorname{cosec}x-\cot x|+C`],
  ["Calculus", "Integral of ln x", r`\int\ln x\,dx=x\ln x-x+C`],
  ["Calculus", "∫ 1/(x²+a²)", r`\int\frac{dx}{x^2+a^2}=\frac{1}{a}\tan^{-1}\frac{x}{a}+C`],
  ["Calculus", "∫ 1/√(a²−x²)", r`\int\frac{dx}{\sqrt{a^2-x^2}}=\sin^{-1}\frac{x}{a}+C`],
  ["Calculus", "∫ 1/(x²−a²)", r`\int\frac{dx}{x^2-a^2}=\frac{1}{2a}\ln\left|\frac{x-a}{x+a}\right|+C`],
  ["Calculus", "By parts", r`\int u\,dv=uv-\int v\,du`],
  ["Calculus", "Definite integral", r`\int_a^b f(x)\,dx=F(b)-F(a)`],
  ["Calculus", "Limit: sin x / x", r`\lim_{x\to0}\frac{\sin x}{x}=1`],
  ["Calculus", "Limit: (1+1/x)^x", r`\lim_{x\to\infty}\left(1+\frac{1}{x}\right)^x=e`],
  ["Calculus", "Limit: (eˣ−1)/x", r`\lim_{x\to0}\frac{e^x-1}{x}=1`],
  ["Calculus", "Limit: ln(1+x)/x", r`\lim_{x\to0}\frac{\ln(1+x)}{x}=1`],
  ["Calculus", "Maclaurin series of eˣ", r`e^x=1+x+\frac{x^2}{2!}+\frac{x^3}{3!}+\cdots`],
  ["Calculus", "Maclaurin series of sin x", r`\sin x=x-\frac{x^3}{3!}+\frac{x^5}{5!}-\cdots`],
  /* ===== GEOMETRY ===== */
  ["Geometry", "Pythagoras theorem", r`a^2+b^2=c^2`],
  ["Geometry", "Area of a rectangle", r`A=l\times b`],
  ["Geometry", "Area of a triangle", r`A=\frac{1}{2}bh`],
  ["Geometry", "Area of an equilateral triangle", r`A=\frac{\sqrt3}{4}a^2`],
  ["Geometry", "Area of a trapezium", r`A=\frac{1}{2}(a+b)h`],
  ["Geometry", "Area of a rhombus", r`A=\frac{1}{2}d_1d_2`],
  ["Geometry", "Area of a parallelogram", r`A=b\times h`],
  ["Geometry", "Circle area", r`A=\pi r^2`],
  ["Geometry", "Circumference", r`C=2\pi r`],
  ["Geometry", "Cube: volume and surface", r`V=a^3,\quad S=6a^2`],
  ["Geometry", "Cuboid: volume and surface", r`V=lbh,\quad S=2(lb+bh+hl)`],
  ["Geometry", "Cylinder: volume", r`V=\pi r^2h`],
  ["Geometry", "Cylinder: curved and total surface", r`CSA=2\pi rh,\quad TSA=2\pi r(r+h)`],
  ["Geometry", "Cone volume", r`V=\frac{1}{3}\pi r^2h`],
  ["Geometry", "Cone: slant height and surface", r`l=\sqrt{r^2+h^2},\ CSA=\pi rl,\ TSA=\pi r(r+l)`],
  ["Geometry", "Sphere volume", r`V=\frac{4}{3}\pi r^3`],
  ["Geometry", "Sphere surface area", r`S=4\pi r^2`],
  ["Geometry", "Hemisphere", r`V=\frac{2}{3}\pi r^3,\ CSA=2\pi r^2,\ TSA=3\pi r^2`],
  ["Geometry", "Polygon angle sum", r`\text{Sum of interior angles}=(n-2)\times180^\circ`],
  ["Geometry", "Distance formula", r`d=\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}`],
  ["Geometry", "Midpoint formula", r`M=\left(\frac{x_1+x_2}{2},\frac{y_1+y_2}{2}\right)`],
  ["Geometry", "Section formula (internal)", r`P=\left(\frac{mx_2+nx_1}{m+n},\frac{my_2+ny_1}{m+n}\right)`],
  ["Geometry", "Centroid of a triangle", r`G=\left(\frac{x_1+x_2+x_3}{3},\frac{y_1+y_2+y_3}{3}\right)`],
  ["Geometry", "Area of a triangle (coordinates)", r`A=\frac{1}{2}\left|x_1(y_2-y_3)+x_2(y_3-y_1)+x_3(y_1-y_2)\right|`],
  ["Geometry", "Slope of a line", r`m=\frac{y_2-y_1}{x_2-x_1}=\tan\theta`],
  ["Geometry", "Line: slope-intercept form", r`y=mx+c`],
  ["Geometry", "Line: point-slope form", r`y-y_1=m(x-x_1)`],
  ["Geometry", "Line: two-point form", r`\frac{y-y_1}{y_2-y_1}=\frac{x-x_1}{x_2-x_1}`],
  ["Geometry", "Line: intercept form", r`\frac{x}{a}+\frac{y}{b}=1`],
  ["Geometry", "Distance of a point from a line", r`d=\frac{|Ax_1+By_1+C|}{\sqrt{A^2+B^2}}`],
  ["Geometry", "Angle between two lines", r`\tan\theta=\left|\frac{m_1-m_2}{1+m_1m_2}\right|`],
  ["Geometry", "Parallel and perpendicular lines", r`m_1=m_2\ (\parallel),\quad m_1m_2=-1\ (\perp)`],
  ["Geometry", "Circle equation", r`(x-h)^2+(y-k)^2=r^2`],
  ["Geometry", "Parabola", r`y^2=4ax`],
  ["Geometry", "Ellipse", r`\frac{x^2}{a^2}+\frac{y^2}{b^2}=1`],
  ["Geometry", "Hyperbola", r`\frac{x^2}{a^2}-\frac{y^2}{b^2}=1`],
  /* ===== PHYSICS ===== */
  ["Physics", "Speed", r`v=\frac{d}{t}`],
  ["Physics", "First equation of motion", r`v=u+at`],
  ["Physics", "Second equation of motion", r`s=ut+\frac{1}{2}at^2`],
  ["Physics", "Third equation of motion", r`v^2=u^2+2as`],
  ["Physics", "Newton's second law", r`F=ma`],
  ["Physics", "Momentum", r`p=mv`],
  ["Physics", "Impulse", r`J=F\Delta t=\Delta p`],
  ["Physics", "Work done", r`W=Fs\cos\theta`],
  ["Physics", "Power", r`P=\frac{W}{t}`],
  ["Physics", "Kinetic energy", r`E_k=\frac{1}{2}mv^2`],
  ["Physics", "Potential energy", r`E_p=mgh`],
  ["Physics", "Gravitational force", r`F=\frac{Gm_1m_2}{r^2}`],
  ["Physics", "Escape velocity", r`v_e=\sqrt{2gR}`],
  ["Physics", "Centripetal force", r`F=\frac{mv^2}{r}`],
  ["Physics", "Projectile range", r`R=\frac{u^2\sin2\theta}{g}`],
  ["Physics", "Pendulum time period", r`T=2\pi\sqrt{\frac{l}{g}}`],
  ["Physics", "Hooke's law", r`F=-kx`],
  ["Physics", "Pressure", r`P=\frac{F}{A}`],
  ["Physics", "Density", r`\rho=\frac{m}{V}`],
  ["Physics", "Heat", r`Q=mc\Delta T`],
  ["Physics", "Ohm's law", r`V=IR`],
  ["Physics", "Electric power", r`P=VI=I^2R=\frac{V^2}{R}`],
  ["Physics", "Resistors in series", r`R=R_1+R_2+\cdots`],
  ["Physics", "Resistors in parallel", r`\frac{1}{R}=\frac{1}{R_1}+\frac{1}{R_2}+\cdots`],
  ["Physics", "Coulomb's law", r`F=\frac{kq_1q_2}{r^2}`],
  ["Physics", "Wave speed", r`v=f\lambda`],
  ["Physics", "Snell's law", r`n_1\sin\theta_1=n_2\sin\theta_2`],
  ["Physics", "Lens formula", r`\frac{1}{f}=\frac{1}{v}-\frac{1}{u}`],
  ["Physics", "Mirror formula", r`\frac{1}{f}=\frac{1}{v}+\frac{1}{u}`],
  ["Physics", "Mass-energy equivalence", r`E=mc^2`],
  /* ===== CHEMISTRY ===== */
  ["Chemistry", "Ideal gas law", r`PV=nRT`],
  ["Chemistry", "Moles from mass", r`n=\frac{\text{given mass}}{\text{molar mass}}=\frac{w}{M}`],
  ["Chemistry", "Moles from particles", r`n=\frac{N}{N_A},\quad N_A=6.022\times10^{23}`],
  ["Chemistry", "Moles of a gas at STP", r`n=\frac{V}{22.4\ \text{L}}`],
  ["Chemistry", "Molarity", r`M=\frac{n_{\text{solute}}}{V_{\text{litre}}}`],
  ["Chemistry", "Molality", r`m=\frac{n_{\text{solute}}}{\text{kg of solvent}}`],
  ["Chemistry", "Normality", r`N=M\times n\text{-factor}`],
  ["Chemistry", "Mole fraction", r`x_A=\frac{n_A}{n_A+n_B}`],
  ["Chemistry", "Dilution formula", r`M_1V_1=M_2V_2`],
  ["Chemistry", "Percentage composition", r`\%\text{ of element}=\frac{\text{mass of element}}{\text{molar mass}}\times100`],
  ["Chemistry", "Percentage yield", r`\%\text{ yield}=\frac{\text{actual}}{\text{theoretical}}\times100`],
  ["Chemistry", "Equivalent weight", r`E=\frac{M}{n\text{-factor}}`],
  ["Chemistry", "Boyle's law", r`P_1V_1=P_2V_2`],
  ["Chemistry", "Charles's law", r`\frac{V_1}{T_1}=\frac{V_2}{T_2}`],
  ["Chemistry", "Gay-Lussac's law", r`\frac{P_1}{T_1}=\frac{P_2}{T_2}`],
  ["Chemistry", "Combined gas law", r`\frac{P_1V_1}{T_1}=\frac{P_2V_2}{T_2}`],
  ["Chemistry", "Dalton's law of partial pressures", r`P_{\text{total}}=P_1+P_2+\cdots`],
  ["Chemistry", "Graham's law of diffusion", r`\frac{r_1}{r_2}=\sqrt{\frac{M_2}{M_1}}`],
  ["Chemistry", "Density of a gas", r`d=\frac{PM}{RT}`],
  ["Chemistry", "pH", r`\mathrm{pH}=-\log[\mathrm{H^+}]`],
  ["Chemistry", "pOH", r`\mathrm{pOH}=-\log[\mathrm{OH^-}]`],
  ["Chemistry", "pH + pOH", r`\mathrm{pH}+\mathrm{pOH}=14\ (25^\circ\mathrm{C})`],
  ["Chemistry", "Ionic product of water", r`K_w=[\mathrm{H^+}][\mathrm{OH^-}]=10^{-14}`],
  ["Chemistry", "Henderson-Hasselbalch equation", r`\mathrm{pH}=\mathrm{p}K_a+\log\frac{[\text{salt}]}{[\text{acid}]}`],
  ["Chemistry", "Equilibrium constant Kc", r`K_c=\frac{[C]^c[D]^d}{[A]^a[B]^b}`],
  ["Chemistry", "Kp and Kc relation", r`K_p=K_c(RT)^{\Delta n}`],
  ["Chemistry", "First law of thermodynamics", r`\Delta U=q+w`],
  ["Chemistry", "Enthalpy and internal energy", r`\Delta H=\Delta U+\Delta n_gRT`],
  ["Chemistry", "Gibbs free energy", r`\Delta G=\Delta H-T\Delta S`],
  ["Chemistry", "Gibbs energy and K", r`\Delta G^\circ=-RT\ln K`],
  ["Chemistry", "Nernst equation", r`E=E^\circ-\frac{0.0591}{n}\log Q`],
  ["Chemistry", "Gibbs energy and cell EMF", r`\Delta G^\circ=-nFE^\circ`],
  ["Chemistry", "Faraday's first law", r`m=ZIt`],
  ["Chemistry", "Rate law", r`\text{Rate}=k[A]^m[B]^n`],
  ["Chemistry", "First-order integrated rate law", r`k=\frac{2.303}{t}\log\frac{[A]_0}{[A]}`],
  ["Chemistry", "Half-life (first order)", r`t_{1/2}=\frac{0.693}{k}`],
  ["Chemistry", "Arrhenius equation", r`k=Ae^{-E_a/RT}`],
  ["Chemistry", "Planck's equation", r`E=h\nu=\frac{hc}{\lambda}`],
  ["Chemistry", "de Broglie wavelength", r`\lambda=\frac{h}{mv}`],
  ["Chemistry", "Heisenberg uncertainty principle", r`\Delta x\cdot\Delta p\geq\frac{h}{4\pi}`],
  ["Chemistry", "Rydberg formula", r`\frac{1}{\lambda}=RZ^2\left(\frac{1}{n_1^2}-\frac{1}{n_2^2}\right)`],
  ["Chemistry", "Bohr energy levels", r`E_n=-13.6\,\frac{Z^2}{n^2}\ \text{eV}`],
  ["Chemistry", "Bohr radius", r`r_n=0.529\,\frac{n^2}{Z}\ \text{Å}`],
  ["Chemistry", "Raoult's law", r`p_A=x_Ap_A^\circ`],
  ["Chemistry", "Osmotic pressure", r`\pi=CRT`],
  ["Chemistry", "Elevation of boiling point", r`\Delta T_b=K_b\,m`],
  ["Chemistry", "Depression of freezing point", r`\Delta T_f=K_f\,m`],
  ["Chemistry", "Van't Hoff factor", r`i=\frac{\text{observed colligative property}}{\text{calculated colligative property}}`],
  ["Chemistry", "Bond order", r`\text{B.O.}=\frac{N_b-N_a}{2}`],
  ["Chemistry", "Formal charge", r`FC=V-N-\frac{B}{2}`]
];
R.form = (b) => {
  const cats = [...new Set(F.map((f) => f[0]))]; let shown = 30;
  b.innerHTML = `<input id="fq" type="search" placeholder="Search formulas… (e.g. a^m, sin, pH, log)" autocomplete="off"><div class="tk-chips" id="fc"><button data-c="">All</button>${cats.map((c) => `<button data-c="${c}">${c}</button>`).join("")}</div><div id="fl"></div>`;
  const list = $("#fl", b), draw = () => {
    const words = $("#fq", b).value.toLowerCase().replace(/[×*·]/g, " ").split(/\s+/).filter(Boolean), it = F.filter((f) => { const h = (f[0] + " " + f[1]).toLowerCase(); return words.every((w) => h.includes(w)); }), part = it.slice(0, shown);
    list.innerHTML = it.length ? part.map((f) => `<button class="tk-fm" data-x="${esc(f[2])}"><small>${f[0]}</small><b>${esc(f[1])}</b><div class="tk-tex">$$${esc(f[2])}$$</div></button>`).join("") + (it.length > shown ? `<div class="tk-row tk-end"><button class="tk-b" data-more="1">Show more (${it.length - shown} left)</button></div>` : "") : `<div class="tk-empty">No formula found.</div>`;
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([list]).catch(() => {});
  };
  draw(); $("#fq", b).oninput = () => { shown = 30; draw(); };
  $("#fc", b).onclick = (e) => { const t = e.target.closest("[data-c]"); if (t) { $("#fq", b).value = t.dataset.c; shown = 30; draw(); } };
  list.onclick = (e) => { if (e.target.closest("[data-more]")) { shown += 40; draw(); return; } const t = e.target.closest("[data-x]"); if (t) copy(t.dataset.x); };
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
const E = { H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999, F: 18.998, Ne: 20.18, Na: 22.99, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.948, K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.63, As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798, Rb: 85.468, Sr: 87.62, Ag: 107.87, Sn: 118.71, I: 126.9, Xe: 131.29, Cs: 132.91, Ba: 137.33, W: 183.84, Pt: 195.08, Au: 196.97, Hg: 200.59, Pb: 207.2, U: 238.03, Y: 88.906, Zr: 91.224, Nb: 92.906, Mo: 95.95, Ru: 101.07, Rh: 102.91, Pd: 106.42, Cd: 112.41, In: 114.82, Sb: 121.76, Te: 127.6, La: 138.91, Ce: 140.12, Pr: 140.91, Nd: 144.24, Sm: 150.36, Eu: 151.96, Gd: 157.25, Tb: 158.93, Dy: 162.5, Ho: 164.93, Er: 167.26, Tm: 168.93, Yb: 173.05, Lu: 174.97, Hf: 178.49, Ta: 180.95, Re: 186.21, Os: 190.23, Ir: 192.22, Tl: 204.38, Bi: 208.98, Ra: 226, Rn: 222, Th: 232.04, Pu: 244 };
function parseF(f) {
  let i = 0; const num = () => { const m = /^\d+/.exec(f.slice(i)); if (m) { i += m[0].length; return +m[0]; } return 1; };
  const grp = (d) => { const o = {}; while (i < f.length) { const c = f[i]; if (c === "(" || c === "[") { i++; const s = grp(d + 1), n = num(); for (const k in s) o[k] = (o[k] || 0) + s[k] * n; } else if (c === ")" || c === "]") { if (!d) throw 0; i++; return o; } else { const m = /^[A-Z][a-z]?/.exec(f.slice(i)); if (!m) throw 0; i += m[0].length; o[m[0]] = (o[m[0]] || 0) + num(); } } if (d) throw 0; return o; };
  return grp(0);
}
/* Hydrates / double salts: CuSO4·5H2O, CuSO4.5H2O, CuSO4*5H2O, CuSO4 5H2O, K2SO4·Al2(SO4)3·24H2O */
const normF = (f) => f.trim().replace(/\s*[·.•*]\s*|\s+/g, "·");
function parseH(f) {
  const parts = normF(f).split("·").filter(Boolean).map((p) => { const m = /^(\d+)?(.+)$/.exec(p); let g = m[2]; if (/^h2o$/i.test(g)) g = "H2O"; return [m[1] ? +m[1] : 1, g]; });
  if (!parts.length) throw 0;
  const m = {}; parts.forEach(([c, g]) => { const o = parseF(g); for (const k in o) m[k] = (m[k] || 0) + o[k] * c; });
  return { m, parts };
}
R.chem = (b) => {
  b.innerHTML = `<input id="cf" placeholder="Type a formula, e.g. Ca(OH)2 or CuSO4.5H2O" autocapitalize="off" spellcheck="false"><div class="tk-chips">${["H2O", "CO2", "NaCl", "H2SO4", "Ca(OH)2", "C6H12O6", "KMnO4", "CuSO4·5H2O", "FeSO4·7H2O", "Na2CO3·10H2O", "K2SO4·Al2(SO4)3·24H2O"].map((x) => `<button data-f="${x}">${x}</button>`).join("")}</div><div id="co"></div><p class="tk-dim">Capital letters matter: Co is cobalt, CO is carbon monoxide. Hydrates: put · or . or * before the water, e.g. CuSO4·5H2O or CuSO4.5H2O.</p>`;
  const run = () => {
    const f = $("#cf", b).value.trim(), o = $("#co", b); if (!f) { o.innerHTML = ""; return; }
    try {
      const H = parseH(f), m = H.m; let tot = 0; const rows = Object.entries(m).map(([k, n]) => { if (!(k in E)) throw k; const w = E[k] * n; tot += w; return [k, n, w]; });
      const wm = H.parts.slice(1).filter(([, g]) => g === "H2O").reduce((s, [c]) => s + c * (2 * E.H + E.O), 0);
      o.innerHTML = `<div class="tk-big">${+tot.toFixed(3)} <small>g/mol</small></div>${wm ? `<p class="tk-dim">Water of crystallisation: ${+wm.toFixed(3)} g/mol (${(wm / tot * 100).toFixed(2)}%) · Anhydrous part: ${+(tot - wm).toFixed(3)} g/mol</p>` : ""}<table class="tk-t"><tr><th>Element</th><th>Atoms</th><th>Mass</th><th>Share</th></tr>${rows.map(([k, n, w]) => `<tr><td>${k}</td><td>${n}</td><td>${+w.toFixed(3)}</td><td>${(w / tot * 100).toFixed(2)}%</td></tr>`).join("")}</table><div class="tk-row"><button class="tk-b" data-ins="${+tot.toFixed(3)}">Insert molar mass in calculator</button></div>`;
    } catch (e) { o.innerHTML = `<p class="tk-dim" style="margin-top:12px">${typeof e === "string" ? "Element not in table: " + esc(e) : "Check the formula, for example Ca(OH)2."}</p>`; }
  };
  b.oninput = run;
  b.onclick = (e) => { const t = e.target.closest("button"); if (!t) return; if (t.dataset.f) { $("#cf", b).value = t.dataset.f; run(); } else if (t.dataset.ins) put(t.dataset.ins); };
};

/* ---- Screen menu (copy / paste / LaTeX) + Tools button ---- */
const tex = (s) => s.replace(/√\(([^()]*)\)/g, "\\sqrt{$1}").replace(/∛\(([^()]*)\)/g, "\\sqrt[3]{$1}").replace(/×/g, "\\times ").replace(/÷/g, "\\div ").replace(/π/g, "\\pi ").replace(/\b(sin|cos|tan|log)\(/g, "\\$1(").replace(/\^\(([^()]*)\)/g, "^{$1}").replace(/\^(\d+)/g, "^{$1}");
function init() {
  const nav = $(".nav-controls");
  if (nav) { const t = document.createElement("button"); t.type = "button"; t.className = "guide-btn"; t.setAttribute("aria-label", "Tools"); t.title = "Tools"; t.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`; t.onclick = () => open(); nav.prepend(t); }
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
