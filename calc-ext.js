/* ROITX Extended Engine (Part 1)
   Load AFTER calculator.js and BEFORE calc-tools.js.
   Makes every key work: SOLVE, CALC, d/dx, ∫, Σ, Π, logₐb, x⁻¹, cot, (−), ° ′ ″, FACT,
   ÷R, PreAns, ENG, S⇔D, RanInt, Ceil, Intg, Round, Pol, Rec, ∠, i (complex), STO, RCL,
   M+/M−, ab/c, nCr/nPr, ⁿ√, Ran#.  Degree/Radian handled per function (nested brackets safe). */
(() => {
"use strict";
const M = window.math;
if (!M) return;

const D2R = Math.PI / 180;
const baseFmt = formatFinal; // plain 10-digit formatter (Part 2 may change what is *displayed*, never what Ans stores)
const NUM = String.raw`(?:\d+\.?\d*|\.\d+)`;
const ARG = String.raw`(?:${NUM}|\([^()]*\))`;
const TK = () => window.ROITX_TK || null;
const LSget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const LSset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const getVars = () => LSget("calcVars", {});
const setVar = (k, v) => { const o = getVars(); o[k] = String(v); LSset("calcVars", o); if (k === "M" && isFinite(v) && v !== "") memory = +v; };
const say = (m) => { const t = TK(); if (t) t.toast(m); };
{ const m0 = getVars().M; if (m0 !== undefined && m0 !== "" && isFinite(m0)) memory = +m0; }

/* ---------- state ---------- */
let prevAnswer = "0", lastRaw = null, engMode = false, fracMode = false, fracMixed = false, pendingMem = null, stoVal = "0";
let LZ = [], LZC = [];
const resetLZ = () => { LZ = []; LZC = []; };
const lazy = (s) => (LZ.push(s), LZ.length - 1);

/* ---------- numeric helpers ---------- */
function zeta(s) {
  if (s === 1) return Infinity;
  if (s <= 0) return 2 ** s * Math.PI ** (s - 1) * Math.sin(Math.PI * s / 2) * M.gamma(1 - s) * zeta(1 - s);
  // Borwein algorithm for the Dirichlet eta function
  const n = 30, d = [], fa = (m) => { let r = 1; for (let i = 2; i <= m; i++) r *= i; return r; };
  let sum = 0;
  for (let i = 0; i <= n; i++) { sum += n * fa(n + i - 1) * 4 ** i / (fa(n - i) * fa(2 * i)); d.push(sum); }
  const dn = d[n]; let eta = 0;
  for (let k = 0; k < n; k++) eta += (k % 2 ? -1 : 1) * (d[k] - dn) / (k + 1) ** s;
  eta = -eta / dn;
  return eta / (1 - 2 ** (1 - s));
}

function simpson(f, a, b) {
  if (a === b) return 0;
  const sign = a > b ? -1 : 1; if (sign < 0) [a, b] = [b, a];
  const rec = (a, b, fa, fb, fc, S, eps, d) => {
    const c = (a + b) / 2, l = (a + c) / 2, r = (c + b) / 2, fl = f(l), fr = f(r);
    const Sl = (c - a) / 6 * (fa + 4 * fl + fc), Sr = (b - c) / 6 * (fc + 4 * fr + fb), S2 = Sl + Sr;
    if (d <= 0 || Math.abs(S2 - S) <= 15 * eps) return S2 + (S2 - S) / 15;
    return rec(a, c, fa, fc, fl, Sl, eps / 2, d - 1) + rec(c, b, fc, fb, fr, Sr, eps / 2, d - 1);
  };
  const P = 16, h = (b - a) / P; let tot = 0;
  for (let i = 0; i < P; i++) {
    const x0 = a + i * h, x1 = x0 + h, xm = (x0 + x1) / 2, f0 = f(x0), f1 = f(x1), fm = f(xm);
    tot += rec(x0, x1, f0, f1, fm, h / 6 * (f0 + 4 * fm + f1), 1e-11 / P, 30);
  }
  return sign * tot;
}

function factorize(n) {
  const out = []; let x = n;
  for (let p = 2; p * p <= x; p += p === 2 ? 1 : 2) { let e = 0; while (x % p === 0) { x /= p; e++; } if (e) out.push([p, e]); }
  if (x > 1) out.push([x, 1]);
  return out;
}

/* ---------- symbolic  d(f)/dx  and  ∫(f)dx  (used when no point / no limits are given) ---------- */
function prettySym(node) {
  return M.simplify(node).toString()
    .replace(/\bpi\b/g, "π").replace(/\blog\(/g, "ln(")
    .replace(/(\d) \* ([a-zA-Zπ(])/g, "$1$2").replace(/ \* /g, "·").replace(/ \^ /g, "^");
}
function sym(id, kind) {
  const v = TK() ? TK().vals() : {};
  const src = LZ[id].replace(/[A-FXYM]/g, (m) => (m === "X" ? "x" : m in v ? `(${v[m]})` : m));
  try {
    if (kind === "diff") return { _t: "S", text: prettySym(M.derivative(src, "x")) };
    const has = (n) => n.filter((m) => m.isSymbolNode && m.name === "x").length > 0;
    const slope = (u) => { const a = M.simplify(M.derivative(u, "x")); if (has(a)) throw 0; return `(${a.toString()})`; };
    const FN = {
      sin: (u, a) => `-cos(${u})/${a}`, cos: (u, a) => `sin(${u})/${a}`, tan: (u, a) => `-log(abs(cos(${u})))/${a}`,
      cot: (u, a) => `log(abs(sin(${u})))/${a}`, sec: (u, a) => `log(abs(sec(${u})+tan(${u})))/${a}`,
      exp: (u, a) => `exp(${u})/${a}`, sinh: (u, a) => `cosh(${u})/${a}`, cosh: (u, a) => `sinh(${u})/${a}`,
      sqrt: (u, a) => `2*(${u})^(3/2)/(3*${a})`, log: (u, a) => `((${u})*log(${u})-(${u}))/${a}`
    };
    const I = (n) => {
      while (n.isParenthesisNode) n = n.content;
      if (!has(n)) return `(${n})*x`;
      if (n.isSymbolNode) return "x^2/2";
      if (n.isOperatorNode) {
        const [p, q] = n.args;
        switch (n.fn) {
          case "unaryMinus": return `-(${I(p)})`;
          case "unaryPlus": return I(p);
          case "add": return `(${I(p)})+(${I(q)})`;
          case "subtract": return `(${I(p)})-(${I(q)})`;
          case "multiply":
            if (!has(p)) return `(${p})*(${I(q)})`;
            if (!has(q)) return `(${q})*(${I(p)})`;
            break;
          case "divide":
            if (!has(q)) return `(${I(p)})/(${q})`;
            if (!has(p)) return `(${p})*log(abs(${q}))/${slope(q)}`;
            break;
          case "pow":
            if (!has(q)) {
              const a = slope(p); let k; try { k = Number(M.evaluate(q.toString())); } catch (er) { k = NaN; }
              return k === -1 ? `log(abs(${p}))/${a}` : `(${p})^(${q}+1)/((${q}+1)*${a})`;
            }
            if (!has(p)) { const a = slope(q); return p.isSymbolNode && p.name === "e" ? `e^(${q})/${a}` : `(${p})^(${q})/(${a}*log(${p}))`; }
            break;
        }
        throw 0;
      }
      if (n.isFunctionNode && FN[n.fn.name] && n.args.length === 1) return FN[n.fn.name](n.args[0], slope(n.args[0]));
      throw 0;
    };
    let r; try { r = I(M.parse(src)); } catch (e1) { r = I(M.rationalize(src)); } // second try: expand products like x(x+1)
    return { _t: "S", text: prettySym(M.parse(r)) + " + C" };
  } catch (err) { throw new Error(kind === "int" ? "symbolic-int" : "symbolic-diff"); }
}

/* ---------- evaluation scope (angle mode lives here, so nested brackets work) ---------- */
function makeScope() {
  const deg = isDeg;
  const tR = (x) => (deg ? M.multiply(x, D2R) : x);
  const fR = (x) => (deg ? M.divide(x, D2R) : x);
  const more = window.ROITX_MORE && window.ROITX_MORE.scope ? window.ROITX_MORE.scope() : {};
  return Object.assign(more, {
    sin: (x) => M.sin(tR(x)), cos: (x) => M.cos(tR(x)), tan: (x) => M.tan(tR(x)), cot: (x) => M.cot(tR(x)),
    asin: (x) => fR(M.asin(x)), acos: (x) => fR(M.acos(x)), atan: (x) => fR(M.atan(x)), acot: (x) => fR(M.acot(x)),
    ncr: (n, k) => M.combinations(n, k), npr: (n, k) => M.permutations(n, k),
    logab: (a, b) => M.divide(M.log(b), M.log(a)),
    nroot: (n, a) => M.nthRoot(a, n),
    ran: () => Math.floor(Math.random() * 1000) / 1000,
    ranint: (a, b) => M.randomInt(a, b + 1),
    ceil: (x) => M.ceil(x), floor: (x) => M.floor(x), round: (x, n) => M.round(x, n === undefined ? 0 : n),
    divr: (a, b) => { const q = Math.trunc(a / b); return { _t: "R", q, r: a - b * q }; },
    pol: (x, y) => ({ _t: "P", r: Math.hypot(x, y), t: fR(Math.atan2(y, x)) }),
    rec: (r, t) => ({ _t: "X", x: r * Math.cos(tR(t)), y: r * Math.sin(tR(t)) }),
    polar: (r, t) => M.complex({ r, phi: tR(t) }),
    fact: (n) => { if (!Number.isInteger(n) || n < 2 || n > 1e13) throw new Error("fact"); return { _t: "F", n, f: factorize(n) }; },
    zeta, arg: (x) => fR(M.arg(x)),
    integral: (id, a, b) => (a === undefined ? sym(id, "int") : simpson(inner(id), a, b)),
    deriv: (id, x0) => {
      if (x0 === undefined) return sym(id, "diff");
      const f = inner(id), D = (h) => (f(x0 + h) - f(x0 - h)) / (2 * h), h = 1e-3 * Math.max(1, Math.abs(x0));
      const r1 = (4 * D(h / 2) - D(h)) / 3, r2 = (4 * D(h / 4) - D(h / 2)) / 3;
      return (16 * r2 - r1) / 15;
    },
    sumx: (id, a, b) => { const f = inner(id); let s = 0; a = Math.round(a); b = Math.round(b); if (b - a > 1e6) throw new Error("range"); for (let i = a; i <= b; i++) s += f(i); return s; },
    prodx: (id, a, b) => { const f = inner(id); let s = 1; a = Math.round(a); b = Math.round(b); if (b - a > 1e6) throw new Error("range"); for (let i = a; i <= b; i++) s *= f(i); return s; }
  });
}

/* expression used inside ∫ Σ Π d/dx: becomes f(X) */
function inner(id) {
  const code = LZC[id] || (LZC[id] = M.compile(LZ[id]));
  const sc = Object.assign(makeScope(), TK() ? TK().vals() : {});
  return (t) => {
    sc.X = t; sc.x = t;
    const v = code.evaluate(sc);
    if (typeof v === "number") return v;
    if (M.isComplex && M.isComplex(v)) return v.im === 0 ? v.re : NaN;
    return Number(v);
  };
}

/* ---------- display text → math.js text ---------- */
// [opening text, function, optional closing text that follows the bracket]
const LZT = [["∫(", "integral", "dx"], ["Σ(", "sumx", ""], ["Π(", "prodx", ""], ["d/dx(", "deriv", ""], ["d(", "deriv", "/dx"]];
function lazyfy(s) {
  let best = null;
  for (const [t, fn, tail] of LZT) {
    let i = s.indexOf(t);
    // "d(" must stand alone: skip the d inside mod( gcd( Round( …
    while (i > 0 && t === "d(" && /[A-Za-z0-9_]/.test(s[i - 1])) i = s.indexOf(t, i + 1);
    if (i >= 0 && (!best || i < best.i)) best = { i, t, fn, tail };
  }
  if (!best) return s;
  const start = best.i + best.t.length, args = []; let depth = 1, k = start, cur = start;
  for (; k < s.length; k++) {
    const c = s[k];
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (!depth) break; }
    else if (c === "," && depth === 1) { args.push(s.slice(cur, k)); cur = k + 1; }
  }
  args.push(s.slice(cur, k));
  const pa = args.map(lazyfy), id = lazy(pa[0]);
  let rest = s.slice(k + 1);
  if (best.tail && rest.startsWith(best.tail)) rest = rest.slice(best.tail.length); // ∫(…)dx  and  d(…)/dx
  return s.slice(0, best.i) + best.fn + "(" + [id, ...pa.slice(1)].join(",") + ")" + lazyfy(rest);
}

function convert(raw) {
  let s = raw;
  s = s.replace(/PreAns/g, `(${prevAnswer})`).replace(/Ans/g, `(${lastAnswer})`);
  s = s.replace(/π/g, "pi");
  s = s.replace(/sin⁻¹\(/g, "asin(").replace(/cos⁻¹\(/g, "acos(").replace(/tan⁻¹\(/g, "atan(").replace(/cot⁻¹\(/g, "acot(");
  // mixed fraction  a⌟b⌟c  and fraction  a⌟b
  s = s.replace(new RegExp(`(${NUM})⌟(${NUM})⌟(${NUM})`, "g"), "($1+$2/$3)").replace(new RegExp(`(${NUM})⌟(${NUM})`, "g"), "($1/$2)");
  // degrees ° ′ ″
  s = s.replace(new RegExp(`(${NUM})°(?:(${NUM})′)?(?:(${NUM})″)?`, "g"), (m, d, mi, se) => {
    const v = `(${d}+${mi || 0}/60+${se || 0}/3600)`;
    return isDeg ? v : `(${v}*pi/180)`;
  });
  s = s.replace(new RegExp(`(${ARG})∠(-?${ARG})`, "g"), "polar($1,$2)");
  s = s.replace(new RegExp(`(${ARG})C(${ARG})`, "g"), "ncr($1,$2)").replace(new RegExp(`(${ARG})P(${ARG})`, "g"), "npr($1,$2)");
  s = s.replace(/Pol\(/g, "pol(").replace(/Rec\(/g, "rec(").replace(/Fact\(/g, "fact(").replace(/DivR\(/g, "divr(")
    .replace(/Ceil\(/g, "ceil(").replace(/Intg\(/g, "floor(").replace(/Round\(/g, "round(").replace(/RanInt\(/g, "ranint(")
    .replace(/Det\(/g, "det(").replace(/Trn\(/g, "transpose(").replace(/Inv\(/g, "inv(").replace(/Ident\(/g, "identity(")
    .replace(/\bArg\(/g, "arg(").replace(/Conj\(/g, "conj(").replace(/\bRe\(/g, "re(").replace(/\bIm\(/g, "im(")
    .replace(/Ran#/g, "ran()").replace(/ⁿ√\(/g, "nroot(");
  s = s.replace(/√\(/g, "sqrt(").replace(/∛\(/g, "cbrt(").replace(/²/g, "^2").replace(/³/g, "^3");
  s = s.replace(/%/g, "/100").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  return lazyfy(s);
}
window.preprocess = convert; // calc-tools.js adds the A–F, X, Y, M variables on top of this

/* ---------- result formatting ---------- */
function toFrac(x) {
  if (!isFinite(x)) return null;
  const sg = x < 0 ? -1 : 1; x = Math.abs(x);
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x;
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(b), h2 = a * h1 + h0, k2 = a * k1 + k0;
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    if (k1 > 1e6) return null;
    if (Math.abs(x - h1 / k1) < 1e-10 * Math.max(1, x)) return [sg * h1, k1];
    if (b === a) break; b = 1 / (b - a);
  }
  return null;
}
function fracText(x) {
  const f = toFrac(x); if (!f) return null;
  const [n, d] = f; if (d === 1) return String(n);
  if (fracMixed && Math.abs(n) > d) { const w = Math.trunc(n / d), r = Math.abs(n) - Math.abs(w) * d; return `${w} ${r}/${d}`; }
  return `${n}/${d}`;
}
const cparts = (re, im, f = formatFinal) => {
  const a = f(re), b = f(Math.abs(im)), bs = b === 1 ? "" : b;
  if (!im) return String(a);
  const sign = im < 0 ? "-" : "+";
  return re ? `${a}${sign}${bs}i` : `${im < 0 ? "-" : ""}${bs}i`;
};
function fmtResult(raw) {
  if (M.isMatrix && M.isMatrix(raw)) raw = raw.toArray();
  if (Array.isArray(raw) && window.ROITX_MORE && window.ROITX_MORE.showMatrix) return window.ROITX_MORE.showMatrix(raw);
  if (Array.isArray(raw)) { const t = JSON.stringify(raw).replace(/,/g, ", "); return { text: t, machine: "0" }; }
  if (raw && raw._t) {
    if (raw._t === "S") return { text: raw.text, machine: "0" };
    if (raw._t === "R") return { text: `${raw.q} R ${raw.r}`, machine: String(raw.q) };
    if (raw._t === "P") { setVar("X", +baseFmt(raw.r)); setVar("Y", +baseFmt(raw.t)); return { text: `r=${formatFinal(raw.r)} θ=${formatFinal(raw.t)}`, machine: String(baseFmt(raw.r)) }; }
    if (raw._t === "X") { setVar("X", +baseFmt(raw.x)); setVar("Y", +baseFmt(raw.y)); return { text: `x=${formatFinal(raw.x)} y=${formatFinal(raw.y)}`, machine: String(baseFmt(raw.x)) }; }
    if (raw._t === "F") return { text: raw.f.map(([p, e]) => (e > 1 ? `${p}^${e}` : `${p}`)).join("×"), machine: String(raw.n) };
  }
  if (M.isComplex(raw)) { if (!isFinite(raw.re) || !isFinite(raw.im)) throw new Error("Math ERROR"); return { text: cparts(raw.re, raw.im), machine: `(${cparts(raw.re, raw.im, baseFmt)})` }; }
  if (typeof raw !== "number") raw = Number(raw);
  if (!isFinite(raw)) throw new Error("Math ERROR");
  const machine = String(baseFmt(raw));
  let text = String(formatFinal(raw));
  if (fracMode) text = fracText(raw) || machine;
  else if (engMode) text = M.format(raw, { notation: "engineering", precision: 10 });
  return { text, machine };
}
function reformat() { if (lastRaw === null) return; try { resDiv.innerText = fmtResult(lastRaw).text; } catch (e) {} }

/* ---------- equals / solve ---------- */
const evalExp = (e) => { resetLZ(); return M.evaluate(preprocess(e), makeScope()); };
const errText = (e) => (e && e.message === "symbolic-int" ? "Add limits a, b" : e instanceof SyntaxError ? "Syntax ERROR" : "Math ERROR");

function finish(raw, shownExp) {
  const r = fmtResult(raw);
  if (raw && raw._t === "S") { lastRaw = raw; resDiv.innerText = r.text; saveHistory(shownExp + "=" + r.text); return r; } // symbolic answers never become Ans
  prevAnswer = lastAnswer; lastAnswer = r.machine; lastRaw = raw;
  resDiv.innerText = r.text; saveHistory(shownExp + "=" + r.machine);
  return r;
}

window.calculate = function () {
  if (exp === "") return;
  engMode = false; fracMode = false;
  if (exp.includes("=")) { solveNow(); return; }
  try { finish(evalExp(exp), exp); exp = ""; cursorPos = 0; updateDisplay(); }
  catch (e) { resDiv.innerText = errText(e); }
};

function solveNow() {
  try {
    const parts = exp.split("=");
    if (parts.length > 2) throw new SyntaxError("eq");
    const found = [...new Set(exp.match(/\b[A-FXYM]\b/g) || [])];
    if (!found.length) throw new SyntaxError("var");
    const v = found.includes("X") ? "X" : found[0];
    const sub = (t) => t.replace(new RegExp(`\\b${v}\\b`, "g"), "(_v_)");
    resetLZ();
    const code = M.compile(`(${convert(sub(parts[0]))})-(${convert(sub(parts[1] === undefined || parts[1].trim() === "" ? "0" : parts[1]))})`);
    const sc = Object.assign(makeScope(), TK() ? TK().vals() : {});
    const f = (t) => { sc._v_ = t; try { const r = code.evaluate(sc); return typeof r === "number" ? r : NaN; } catch (e) { return NaN; } };
    const roots = [], add = (r) => { if (isFinite(r) && !roots.some((q) => Math.abs(q - r) < 1e-7 * Math.max(1, Math.abs(r)))) roots.push(r); };
    const bis = (a, b) => { let fa = f(a); for (let i = 0; i < 80; i++) { const m = (a + b) / 2, fm = f(m); if (fa * fm <= 0) b = m; else { a = m; fa = fm; } } return (a + b) / 2; };
    const scan = (lo, hi, N) => {
      const st = (hi - lo) / N; let px = lo, pf = f(lo);
      for (let k = 1; k <= N; k++) {
        const x = lo + k * st, fx = f(x);
        if (pf === 0) add(px);
        else if (pf * fx < 0 && Math.abs(pf - fx) < 1e6) add(bis(px, x));
        else if (k > 1 && isFinite(pf) && isFinite(fx) && Math.abs(pf) < 1e-3 * Math.max(1, st)) { // touching root (double root): local minimum of |f| near zero
          const pp = f(px - st);
          if (isFinite(pp) && Math.abs(pf) <= Math.abs(pp) && Math.abs(pf) <= Math.abs(fx)) {
            let a = px - st, b = x;
            for (let i = 0; i < 100; i++) { const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; if (Math.abs(f(m1)) < Math.abs(f(m2))) b = m2; else a = m1; }
            const r = (a + b) / 2; if (Math.abs(f(r)) < 1e-9) add(r);
          }
        }
        px = x; pf = fx;
      }
    };
    scan(-100, 100, 40000); scan(-10000, 10000, 40000);
    // the 4 roots nearest zero (periodic equations have endless roots), shown in ascending order
    const clean = roots.map((r) => (Math.abs(r) < 1e-9 ? 0 : +r.toPrecision(10))).sort((a, b) => Math.abs(a) - Math.abs(b)).slice(0, 4);
    if (!clean.length) { resDiv.innerText = "No real solution"; return; }
    const first = clean[0];
    clean.sort((a, b) => a - b);
    setVar(v, first);
    prevAnswer = lastAnswer; lastAnswer = String(first); lastRaw = first;
    resDiv.innerText = `${v}=${clean.join(" , ")}`;
    saveHistory(exp + "=" + first);
    exp = ""; cursorPos = 0; updateDisplay();
  } catch (e) { resDiv.innerText = errText(e); }
}

/* ---------- memory ---------- */
window.handleMemory = function (dir) {
  try {
    let v = exp ? evalExp(exp) : (lastRaw === null ? Number(lastAnswer) : lastRaw);
    if (typeof v !== "number") v = Number(v);
    if (!isFinite(v)) throw new Error("Math ERROR");
    memory += v * dir; setVar("M", memory);
    resDiv.innerText = "M=" + formatFinal(memory);
    exp = ""; cursorPos = 0; updateDisplay();
  } catch (e) { resDiv.innerText = "Error"; }
};

/* ---------- CALC: ask for the variables, then evaluate ---------- */
function openCalc() {
  if (!exp) return;
  const letters = [...new Set(exp.match(/\b[A-FXYM]\b/g) || [])];
  if (!letters.length) { window.calculate(); return; }
  const old = document.getElementById("cxm"); if (old) old.remove();
  const v = getVars(), el = document.createElement("div");
  el.className = "tk"; el.id = "cxm";
  el.innerHTML = `<div class="tk-sheet" style="height:auto;max-height:82dvh"><div class="tk-head"><b>CALC</b><span class="tk-hb"><button class="tk-x tk-cl" aria-label="Close">✕</button></span></div><div class="tk-body" style="flex:none;overflow-y:auto"><p class="tk-dim" style="margin-bottom:12px;word-break:break-all">${esc(exp)}</p>${letters.map((k) => `<div class="tk-var"><span>${k}</span><input inputmode="decimal" data-k="${k}" value="${esc(v[k] ?? "")}" placeholder="value"><button class="u" data-ans="${k}">Ans</button></div>`).join("")}<div class="tk-big" id="cxr">…</div><div class="tk-row"><button class="tk-b" data-a="use">Use as answer</button></div></div></div>`;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add("on"));
  const out = $q("#cxr", el); let cur = null;
  const run = () => {
    const empty = letters.some((k) => { const x = getVars()[k]; return x === undefined || x === ""; });
    if (empty) { out.textContent = "…"; cur = null; return; }
    try { const raw = evalExp(exp); cur = { raw, r: fmtResult(raw) }; out.textContent = cur.r.text; } catch (e) { cur = null; out.textContent = errText(e); }
  };
  const close = () => { el.classList.remove("on"); setTimeout(() => el.remove(), 260); document.removeEventListener("keydown", esc2); };
  const esc2 = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", esc2);
  el.addEventListener("input", (e) => { const k = e.target.dataset.k; if (k) { setVar(k, e.target.value.trim()); run(); } });
  el.addEventListener("click", (e) => {
    if (e.target === el || e.target.closest(".tk-cl")) { close(); return; }
    const a = e.target.dataset.ans; if (a) { setVar(a, lastAnswer); $q(`[data-k="${a}"]`, el).value = lastAnswer; run(); return; }
    if (e.target.dataset.a === "use" && cur) { finish(cur.raw, exp); close(); }
  });
  const first = $q("input", el); if (first) first.focus();
  run();
}
const $q = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- key handling ---------- */
const CLOSERS = { "∫(": ")dx", "d(": ")/dx" }; // what follows the cursor after the bracket opens
const ins = (val) => {
  insertAtCursor(val);
  if (!val.endsWith("(")) return;
  const tail = CLOSERS[val] || ")";
  if (tail === ")") { insertAtCursor(")"); cursorPos++; return; }
  const pos = exp.length - cursorPos; // add the closing part directly so INS/overwrite mode cannot eat text
  exp = exp.slice(0, pos) + tail + exp.slice(pos); cursorPos += tail.length; updateDisplay();
};

const NORMAL = {
  LOG: "log10(", LN: "log(", SQRT: "√(", X2: "²", X3: "³", POW: "^", PI: "π", NCR: "C", ANS: "Ans", MOD: "%", EXP: "×10^(",
  ABS: "abs(", COMMA: ",", LCM: "lcm(", RND: "Ran#", POL: "Pol(", FRAC: "⌟",
  INTG: "∫(", SIGMA: "Σ(", LOGAB: "logab(", XINV: "^(-1)", COT: "cot(", NEG: "-", DIVR: "DivR(", RANINT: "RanInt("
};
const SHIFTED = {
  SIN: "sin⁻¹(", COS: "cos⁻¹(", TAN: "tan⁻¹(", SQRT: "∛(", LOG: "10^(", LN: "e^(", X2: "!", X3: "^(-1)", POW: "ⁿ√(", NCR: "P",
  POL: "Rec(", PI: "e", ABS: "erf(", HYP: "gamma(", COMMA: "zeta(", LCM: "gcd(", MOD: "mod(",
  INTG: "d(", SIGMA: "Π(", LOGAB: "Ceil(", XINV: "Intg(", COT: "cot⁻¹(", NEG: "∠", DMS: "Fact(", DIVR: "PreAns", ENG: "i", RANINT: "Round("
};
const ALPHA = { "7": "A", "8": "B", "9": "C", "4": "D", "5": "E", "6": "F", "1": "X", "2": "Y", "3": "M" };
const OPS = ["+", "-", "*", "/", "POW", "X2", "X3", "XINV"];

function dms() {
  const pre = exp.slice(0, exp.length - cursorPos);
  if (/\d$/.test(pre)) { if (/′[\d.]+$/.test(pre)) return "″"; if (/°[\d.]+$/.test(pre)) return "′"; }
  return "°";
}
function varValue(k) { const x = getVars()[k]; return x === undefined || x === "" ? (k === "M" ? String(memory) : "0") : x; }

window.btnPress = function (key) {
  const more = window.ROITX_MORE && window.ROITX_MORE.keys && window.ROITX_MORE.keys[key];
  if (more) { if (isShift) toggleShift(); if (isAlpha) { toggleAlpha(); pendingMem = null; } more(); return; }
  if (isShift) { shiftKey(key); return; }
  if (isAlpha) { alphaKey(key); return; }

  if (key === "HYP") { isHyp = true; return; }
  if (key === "M+") { window.handleMemory(1); return; }
  if (key === "CALC") { openCalc(); return; }
  if (key === "ENG") { engMode = !engMode; fracMode = false; reformat(); return; }
  if (key === "SD") { fracMode = !fracMode; engMode = false; reformat(); return; }
  if (key === "STO" || key === "RCL") {
    pendingMem = key;
    if (key === "STO") { try { stoVal = exp ? String(baseFmt(Number(evalExp(exp)))) : lastAnswer; } catch (e) { stoVal = lastAnswer; } }
    resDiv.innerText = key + " →"; isAlpha = true; isShift = false; updateIndicators(); return;
  }

  if (OPS.includes(key) && exp === "" && lastAnswer !== "0") { exp = "Ans"; cursorPos = 0; }

  let val;
  if (key === "SIN") val = isHyp ? "sinh(" : "sin(";
  else if (key === "COS") val = isHyp ? "cosh(" : "cos(";
  else if (key === "TAN") val = isHyp ? "tanh(" : "tan(";
  else if (key === "DMS") val = dms();
  else val = NORMAL[key] || key;
  ins(val); isHyp = false; updateDisplay();
};

function shiftKey(key) {
  if (key === "M+") { window.handleMemory(-1); toggleShift(); return; }
  if (key === "CALC") { toggleShift(); if (exp) { engMode = false; fracMode = false; if (!exp.includes("=")) exp += "=0"; solveNow(); } return; }
  if (key === "FRAC") { fracMixed = !fracMixed; fracMode = true; engMode = false; reformat(); toggleShift(); return; }
  if (key === "SD") { toggleShift(); return; }
  const v = SHIFTED[key];
  if (v) {
    if (["X2", "X3", "XINV"].includes(key) && exp === "" && lastAnswer !== "0") { exp = "Ans"; cursorPos = 0; }
    ins(v);
  }
  toggleShift(); updateDisplay();
}

function alphaKey(key) {
  const letter = ALPHA[key];
  if (pendingMem && letter) {
    if (pendingMem === "STO") { setVar(letter, stoVal); resDiv.innerText = `${letter}=${stoVal}`; }
    else { const x = varValue(letter); insertAtCursor(String(x)); resDiv.innerText = `${letter}=${x}`; }
    pendingMem = null; toggleAlpha(); updateDisplay(); return;
  }
  if (pendingMem) { pendingMem = null; resDiv.innerText = "0"; }
  if (letter) insertAtCursor(letter);
  else if (key === "RND") insertAtCursor("Ran#");
  toggleAlpha(); updateDisplay();
}

window.ROITX_EXT = {
  convert, makeScope, fmtResult, evalExp, solveNow, openCalc, resetLZ,
  last: () => lastRaw,
  resetAns: () => { prevAnswer = "0"; lastRaw = null; },
  setFlags: (o) => { if ("mixed" in o) fracMixed = !!o.mixed; }
};
})();
