/* ROITX Graph Pro — graph (replaces the Graph tab of calc-plus.js)
   Load AFTER calc-plus.js (best: last, after calc-wow.js).
   • Natural math: typing x^2 shows x², sum → Σ, pi → π, sqrt → √, <= → ≤ … plus a typeset preview line under every row
   • Sliders (auto "add slider: a b all"), f(x)=… definitions, a=2 constants, {domain} restrictions
   • Points, parametric (cos(t), sin(t)), polar r=f(theta), inequalities y<x² with shading, implicit curves
   • Σ / Π / ∫ with limits:  sum(f, n, a, b)   prod(f, n, a, b)   int(f, x, a, b)
   • Quick-graph palette: GIF, Weierstrass, Fourier series, Gaussian, heart, cardioid … */
(() => {
"use strict";
const T = window.ROITX_TK, mm = window.math; if (!T || !mm) return;
const { R, $, LS, SV, esc, toast, vals } = T;
const fmt = (n) => (typeof n === "number" && isFinite(n) ? String(+n.toPrecision(8)) : String(n));

/* ---------- styles (theme-neutral, uses currentColor) ---------- */
if (typeof document !== "undefined" && !document.getElementById("gx-style")) {
  const st = document.createElement("style"); st.id = "gx-style";
  st.textContent = `
.gx-row{margin:0 0 6px}.gx-row.off .tk-fn i{opacity:.25}.tk-fn i[data-eye]{cursor:pointer}
.gx-lb{min-width:34px;text-align:center;opacity:.75;font-size:12px}
.gx-pv{padding:2px 10px 2px 40px;font:18px/1.5 "Times New Roman",Cambria,serif;overflow-x:auto;white-space:nowrap}.gx-pv:empty{display:none}
.gx-pv i{font-style:italic}.gx-pv sup,.gx-pv sub{font-size:.7em;line-height:0}.gx-pv sup{vertical-align:.55em}.gx-pv sub{vertical-align:-.4em}
.gx-fr{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;margin:0 3px;font-size:.95em}
.gx-fr>span{padding:0 3px}.gx-fr>span:first-child{border-bottom:1px solid currentColor}
.gx-sq{display:inline-flex;align-items:stretch}.gx-ov{border-top:1px solid currentColor;padding:0 2px;margin-left:1px}
.gx-big{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1;margin:0 4px}
.gx-big .gx-op{font-size:1.9em;line-height:.95}.gx-big .gx-u,.gx-big .gx-d{font-size:.62em}
.gx-rs{opacity:.7;margin-left:10px}.gx-er{color:#ff8a80;font:12px Poppins,sans-serif}
.gx-hint{padding:2px 8px 0 40px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px}.gx-hint:empty{display:none}
.gx-hint button,.gx-sym button,.gx-qc button,.gx-qt button{border:1px solid rgba(128,128,128,.4);background:rgba(128,128,128,.15);color:inherit;border-radius:8px;padding:5px 11px;cursor:pointer;font:inherit}
.gx-hint button{font:italic 15px "Times New Roman",serif}.gx-hint .gx-all{background:#2d70b3;color:#fff;border-color:transparent;font-style:normal}
.gx-sym{display:flex;gap:6px;overflow-x:auto;padding:6px 0}.gx-sym button{min-width:38px;font:17px "Times New Roman",serif}
.gx-qt{display:flex;gap:6px;overflow-x:auto;padding:4px 0}.gx-qt button{white-space:nowrap;font-size:12px}.gx-qt button.on{background:#2d70b3;color:#fff;border-color:transparent}
.gx-qc{display:flex;flex-wrap:wrap;gap:6px;max-height:118px;overflow-y:auto;padding:4px 0 8px}.gx-qc button{font-size:13px}
.gx-sl{border:1px solid rgba(128,128,128,.3);border-radius:10px;padding:6px 8px;margin:6px 0}
.gx-s1,.gx-s2{display:flex;align-items:center;gap:8px}.gx-s2{margin-top:4px;gap:6px}.gx-s1 b{font:italic 18px "Times New Roman",serif}
.gx-s1 button{border:0;background:rgba(128,128,128,.2);color:inherit;border-radius:6px;padding:4px 9px;cursor:pointer}.gx-s1 .gx-pl{margin-left:auto}
.gx-sl input[type=number]{width:62px;background:rgba(128,128,128,.15);color:inherit;border:1px solid rgba(128,128,128,.35);border-radius:6px;padding:3px 6px;font:inherit}
.gx-sl .gx-rg{flex:1;min-width:0}`;
  document.head.append(st);
}

/* ---------- natural-math typing helpers ---------- */
const SUPC = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const toSup = (s) => s.replace(/[0-9+-]/g, (c) => (c === "+" ? "⁺" : c === "-" ? "⁻" : SUPC[+c]));
const fromSup = (s) => [...s].map((c) => (c === "⁺" ? "+" : c === "⁻" ? "-" : String(SUPC.indexOf(c)))).join("");
const WS = { sum: "Σ", prod: "∏", sqrt: "√", theta: "θ", alpha: "α", beta: "β", omega: "ω", pi: "π", inf: "∞", int: "∫" };
const WRE = "(sum|prod|sqrt|theta|alpha|beta|omega|pi|inf|int)";
const bAll = (s) => s.replace(/<=/g, "≤").replace(/>=/g, "≥").replace(/\*/g, "·")
  .replace(/\^(-?)(\d+)(?![\d.])/g, (m, a, d) => toSup(a + d))
  .replace(new RegExp(`(^|[^A-Za-z])${WRE}(?![A-Za-z])`, "g"), (m, p, w) => p + WS[w]);
function beautifyTail(v, pos) {
  let L = v.slice(0, pos), m; const Rr = v.slice(pos);
  if ((m = /(⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)\.$/.exec(L))) L = L.slice(0, m.index) + "^" + fromSup(m[1]) + "."; // x^0.5 : undo superscript when a decimal point follows
  else if ((m = /\^(-?)(\d)$/.exec(L))) L = L.slice(0, m.index) + toSup(m[1] + m[2]);
  else if ((m = /([⁰¹²³⁴⁵⁶⁷⁸⁹])(\d)$/.exec(L))) L = L.slice(0, m.index) + m[1] + toSup(m[2]);   // x^23 → x²³
  else if (/<=$/.test(L)) L = L.slice(0, -2) + "≤";
  else if (/>=$/.test(L)) L = L.slice(0, -2) + "≥";
  else if (/\*$/.test(L)) L = L.slice(0, -1) + "·";
  else if ((m = new RegExp(`(^|[^A-Za-z])${WRE}$`).exec(L))) L = L.slice(0, m.index) + m[1] + WS[m[2]];
  return [L + Rr, L.length];
}
const beautifyAll = (v, pos) => { const l = bAll(v.slice(0, pos)); return [l + bAll(v.slice(pos)), l.length]; };

/* ---------- text → math.js ---------- */
const KW = new Set("ln log gif sgn frac step sinc sigmoid theta pi tau alpha beta omega lambda phi mu sum prod int and or not xor mod to in".split(" "));
let DN = new Set();
const known = (id) => KW.has(id) || DN.has(id) || mm[id] !== undefined;
function norm(s) {
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, (m) => "^(" + fromSup(m) + ")");
  const G = { "π": " pi ", "θ": " theta ", "τ": " tau ", "α": " alpha ", "β": " beta ", "ω": " omega ", "λ": " lambda ", "μ": " mu ", "∑": "sum", "Σ": "sum", "∏": "prod", "Π": "prod", "∫": "int", "∞": " Infinity ", "≤": "<=", "≥": ">=", "·": "*", "×": "*", "⋅": "*", "÷": "/", "−": "-", "–": "-" };
  s = s.replace(/[πθταβωλμ∑Σ∏Π∫∞≤≥·×⋅÷−–]/g, (c) => G[c]);
  s = s.replace(/⌊([^⌋]*)⌋/g, "floor($1)").replace(/⌈([^⌉]*)⌉/g, "ceil($1)");
  s = s.replace(/√\s*\(/g, "sqrt(").replace(/√\s*([A-Za-z0-9.]+)/g, "sqrt($1)");
  s = s.replace(/\bgif\s*\(/g, "floor(").replace(/\bsgn\s*\(/g, "sign(");
  let k = 0; s = s.replace(/\|/g, () => (k++ % 2 ? ")" : "abs("));
  // xy → x y ,  ax → a x  (unknown short words are products of variab)
  s = s.replace(/(^|[^A-Za-z_.])([A-Za-z]{2,4})(?![A-Za-z0-9_(])/g, (m, p, id) => (known(id) ? m : p + id.split("").join(" ")));
  return s;
}
const splitTop = (s, ch) => { const o = []; let d = 0, l = 0; for (let i = 0; i < s.length; i++) { const c = s[i]; if ("([{".includes(c)) d++; else if (")]}".includes(c)) d--; else if (c === ch && !d) { o.push(s.slice(l, i)); l = i + 1; } } o.push(s.slice(l)); return o; };
const matchParen = (s, i) => { let d = 0; for (let k = i; k < s.length; k++) { if (s[k] === "(") d++; else if (s[k] === ")" && --d === 0) return k; } return -1; };
function findRel(s) { let d = 0; for (let i = 0; i < s.length; i++) { const c = s[i]; if ("([{".includes(c)) d++; else if (")]}".includes(c)) d--; else if (!d && (c === "<" || c === ">" || c === "=")) return { i, op: c + (s[i + 1] === "=" ? "=" : "") }; } return null; }

/* Σ / Π / ∫ : sum(f, n, a, b) is compiled once and called through __big(id) */
const reg = [];
const alias = (s) => s.replace(/\blog\s*\(/g, "__lg(").replace(/\bln\s*\(/g, "log(");   //  log = base 10, ln = natural
const cc = (s) => mm.compile(alias(s));
function rewriteBig(s) {
  const re = /\b(sum|prod|int)\s*\(/g; let out = "", last = 0, m;
  while ((m = re.exec(s))) {
    const o = m.index + m[0].length - 1, c = matchParen(s, o); if (c < 0) break;
    const p = splitTop(s.slice(o + 1, c), ",");
    if (p.length !== 4 || !/^[A-Za-z]\w*$/.test(p[1].trim())) { re.lastIndex = o + 1; continue; }
    const id = reg.length;
    reg.push({ k: m[1], v: p[1].trim(), f: cc(rewriteBig(p[0])), a: cc(rewriteBig(p[2])), b: cc(rewriteBig(p[3])) });
    out += s.slice(last, m.index) + `__big(${id})`; last = c + 1; re.lastIndex = c + 1;
  }
  return out + s.slice(last);
}
const cpl = (s) => cc(rewriteBig(s));

/* ---------- scope + evaluation ---------- */
const sc = {}; let ctx = sc;
const num = (v) => (typeof v === "number" && isFinite(v) ? v : NaN);
function big(id) {
  const r = reg[id], s2 = Object.assign({}, ctx), prev = ctx; ctx = s2;
  try {
    const a = num(r.a.evaluate(s2)), b = num(r.b.evaluate(s2)); if (isNaN(a + b)) return NaN;
    const f = (t) => { s2[r.v] = t; return num(r.f.evaluate(s2)); };
    if (r.k === "int") { const N = 80, h = (b - a) / N; let acc = f(a) + f(b); for (let i = 1; i < N; i++) acc += (i % 2 ? 4 : 2) * f(a + i * h); return (acc * h) / 3; }
    const lo = Math.ceil(a), hi = Math.floor(b); if (hi - lo > 20000) return NaN;
    let acc = r.k === "sum" ? 0 : 1; for (let k = lo; k <= hi; k++) { const v = f(k); if (r.k === "sum") acc += v; else acc *= v; } return acc;
  } finally { ctx = prev; }
}
const FN = { __big: big, __lg: (x, b) => (b === undefined ? Math.log10(x) : Math.log(x) / Math.log(b)), frac: (x) => x - Math.floor(x), step: (x) => (x >= 0 ? 1 : 0), sinc: (x) => (x === 0 ? 1 : Math.sin(x) / x), sigmoid: (x) => 1 / (1 + Math.exp(-x)) };
const ev = (c, x, y, t) => { try { sc.x = x; sc.y = y === undefined ? 0 : y; if (t !== undefined) { sc.t = t; sc.theta = t; } ctx = sc; return num(c.evaluate(sc)); } catch (e) { return NaN; } };
const evb = (c, x, y, t) => { try { sc.x = x; sc.y = y === undefined ? 0 : y; if (t !== undefined) { sc.t = t; sc.theta = t; } ctx = sc; const v = c.evaluate(sc); return v === true || (typeof v === "number" && v !== 0); } catch (e) { return false; } };
const mkfn = (o) => (...a) => { const s2 = Object.assign({}, ctx), prev = ctx; o.def.params.forEach((p, i) => (s2[p] = a[i])); ctx = s2; try { return o.fn.evaluate(s2); } finally { ctx = prev; } };

/* ---------- parse a row ---------- */
function symbols(str) {
  const names = new Set(), fns = new Set(), bound = new Set();
  mm.parse(str).traverse((n) => {
    if (n.isFunctionNode) { const nm = n.fn && n.fn.name; fns.add(nm); if ((nm === "sum" || nm === "prod" || nm === "int") && n.args.length === 4 && n.args[1].isSymbolNode) bound.add(n.args[1].name); }
    else if (n.isSymbolNode) names.add(n.name);
  });
  return [...names].filter((k) => !fns.has(k) && !bound.has(k));
}
const freeOf = (strs, res) => { const o = new Set(); strs.forEach((s) => symbols(s).forEach((k) => { if (!res.includes(k) && k !== "x" && k !== "y" && mm[k] === undefined && !DN.has(k) && !KW.has(k)) o.add(k); })); return [...o]; };
function condFn(str) {
  const p = str.split(/(<=|>=|<|>)/); if (p.length < 3) return cpl(str);
  const cs = []; for (let i = 0; i + 2 < p.length; i += 2) cs.push(`(${p[i]}${p[i + 1]}${p[i + 2]})`);
  return cpl(cs.join(" and "));
}
function rangeOf(rs, v) {
  let lo = null, hi = null; const rest = [];
  rs.forEach((c) => {
    let m;
    if ((m = new RegExp(`^(.+?)\\s*(<=|<)\\s*${v}\\s*(<=|<)\\s*(.+)$`).exec(c))) { lo = cpl(m[1]); hi = cpl(m[4]); }
    else if ((m = new RegExp(`^${v}\\s*(<=|<)\\s*(.+)$`).exec(c))) hi = cpl(m[2]);
    else if ((m = new RegExp(`^${v}\\s*(>=|>)\\s*(.+)$`).exec(c))) lo = cpl(m[2]);
    else if ((m = new RegExp(`^(.+?)\\s*(<=|<)\\s*${v}$`).exec(c))) lo = cpl(m[1]);
    else if ((m = new RegExp(`^(.+?)\\s*(>=|>)\\s*${v}$`).exec(c))) hi = cpl(m[1]);
    else rest.push(condFn(c));
  });
  return { lo, hi, rest };
}

/* ---------- typeset preview (math.js AST → HTML) ---------- */
const GR = { pi: "π", theta: "θ", tau: "τ", alpha: "α", beta: "β", omega: "ω", lambda: "λ", mu: "μ", phi: "φ", Infinity: "∞" };
const strip = (n) => { while (n && n.type === "ParenthesisNode") n = n.content; return n; };
const SYM = { "=": "=", "<": "&lt;", ">": "&gt;", "<=": "≤", ">=": "≥" };
function P(n) {
  const t = n.type, a = n.args;
  if (t === "ConstantNode") return esc(String(n.value));
  if (t === "SymbolNode") return n.name.length === 1 || GR[n.name] ? `<i>${GR[n.name] || esc(n.name)}</i>` : esc(n.name);
  if (t === "ParenthesisNode") return "(" + P(n.content) + ")";
  if (t === "ArrayNode") return "[" + n.items.map(P).join(", ") + "]";
  if (t === "OperatorNode") {
    const op = n.op;
    if (a.length === 1) return op === "!" ? P(a[0]) + "!" : (op === "-" ? "−" : esc(op)) + P(a[0]);
    if (op === "/") return `<span class="gx-fr"><span>${P(strip(a[0]))}</span><span>${P(strip(a[1]))}</span></span>`;
    if (op === "^") return `${P(a[0])}<sup>${P(strip(a[1]))}</sup>`;
    if (op === "*") return n.implicit ? P(a[0]) + P(a[1]) : P(a[0]) + "·" + P(a[1]);
    if (op === "+") return P(a[0]) + " + " + P(a[1]);
    if (op === "-") return P(a[0]) + " − " + P(a[1]);
    return P(a[0]) + " " + esc(op) + " " + P(a[1]);
  }
  if (t === "FunctionNode") {
    const nm = (n.fn && n.fn.name) || "";
    if (nm === "sqrt" && a.length === 1) return `<span class="gx-sq">√<span class="gx-ov">${P(strip(a[0]))}</span></span>`;
    if (nm === "cbrt" && a.length === 1) return `<span class="gx-sq"><sup>3</sup>√<span class="gx-ov">${P(strip(a[0]))}</span></span>`;
    if (nm === "nthRoot" && a.length === 2) return `<span class="gx-sq"><sup>${P(strip(a[1]))}</sup>√<span class="gx-ov">${P(strip(a[0]))}</span></span>`;
    if (nm === "abs" && a.length === 1) return "|" + P(strip(a[0])) + "|";
    if (nm === "floor" && a.length === 1) return "⌊" + P(strip(a[0])) + "⌋";
    if (nm === "ceil" && a.length === 1) return "⌈" + P(strip(a[0])) + "⌉";
    if ((nm === "sum" || nm === "prod" || nm === "int") && a.length === 4 && a[1].type === "SymbolNode") {
      const v = P(a[1]), f = strip(a[0]), body = f.type === "OperatorNode" && (f.op === "+" || f.op === "-") && f.args.length === 2 ? "(" + P(f) + ")" : P(f);
      if (nm === "int") return `<span class="gx-big"><span class="gx-u">${P(strip(a[3]))}</span><span class="gx-op">∫</span><span class="gx-d">${P(strip(a[2]))}</span></span>${body} d${v}`;
      return `<span class="gx-big"><span class="gx-u">${P(strip(a[3]))}</span><span class="gx-op">${nm === "sum" ? "Σ" : "∏"}</span><span class="gx-d">${v}=${P(strip(a[2]))}</span></span>${body}`;
    }
    return `${esc(nm)}(${a.map((x) => P(strip(x))).join(", ")})`;
  }
  return esc(n.toString());
}
const pe = (s) => { try { return P(mm.parse(s.trim())); } catch (e) { return esc(s); } };
function prettyRel(s) {
  const parts = [], ops = []; let d = 0, l = 0;
  for (let i = 0; i < s.length; i++) { const c = s[i]; if ("([{".includes(c)) d++; else if (")]}".includes(c)) d--; else if (!d && (c === "<" || c === ">" || c === "=")) { const op = c + (s[i + 1] === "=" ? "=" : ""); parts.push(s.slice(l, i)); ops.push(op); i += op.length - 1; l = i + 1; } }
  parts.push(s.slice(l));
  return parts.map(pe).reduce((acc, p, i) => acc + " " + SYM[ops[i - 1]] + " " + p);
}
function prettyAll(core, rs) {
  const tup = core[0] === "(" && matchParen(core, 0) === core.length - 1 && !findRel(core) && splitTop(core.slice(1, -1), ",").length === 2;
  let h = tup ? "(" + splitTop(core.slice(1, -1), ",").map(pe).join(", ") + ")" : prettyRel(core);
  if (rs.length) h += `<span class="gx-rs">{ ${rs.map(prettyRel).join(", ")} }</span>`;
  return `<span class="gx-m">${h}</span>`;
}

/* ---------- row model ---------- */
const cache = new Map();
function build(text) {
  const key = text + "|" + [...DN].sort().join(",");
  if (cache.has(key)) return cache.get(key);
  if (cache.size > 300) { cache.clear(); reg.length = 0; }
  let o; try { o = build0(text); } catch (e) { o = { type: "err", free: [], pv: "" }; }
  cache.set(key, o); return o;
}
function build0(text) {
  const n1 = norm(text).trim(); if (!n1) return { type: "empty", free: [], pv: "" };
  let core = n1, rs = [];
  if (n1.endsWith("}")) { const k = n1.lastIndexOf("{"); if (k > -1) { rs = splitTop(n1.slice(k + 1, -1), ",").map((z) => z.trim()).filter(Boolean); core = n1.slice(0, k).trim(); } }
  const pv = prettyAll(core, rs), rel = findRel(core), B = { pv, free: [] }, rest = () => rs.map(condFn);
  if (!rel && core[0] === "(" && matchParen(core, 0) === core.length - 1) {
    const ps = splitTop(core.slice(1, -1), ",");
    if (ps.length === 2) {
      const par = symbols(ps[0]).concat(symbols(ps[1])).includes("t"), rg = par ? rangeOf(rs, "t") : null;
      return { ...B, type: par ? "par" : "pt", fx: cpl(ps[0]), fy: cpl(ps[1]), rg, rest: par ? rg.rest : rest(), free: freeOf(ps, par ? ["t"] : []) };
    }
  }
  if (rel) {
    const L = core.slice(0, rel.i).trim(), Rh = core.slice(rel.i + rel.op.length).trim();
    if (rel.op === "=") {
      let m;
      if ((m = /^([A-Za-z]\w*)\s*\(\s*([A-Za-z]\w*(?:\s*,\s*[A-Za-z]\w*)*)\s*\)$/.exec(L)) && typeof mm[m[1]] !== "function" && !KW.has(m[1])) {
        const ps = m[2].split(",").map((z) => z.trim());
        return { ...B, type: "def", def: { name: m[1], params: ps }, pn: ps[0], fn: cpl(Rh), rest: rest(), free: freeOf([Rh], ps) };
      }
      if (/^[A-Za-z]\w*$/.test(L) && !["x", "y", "r", "t", "theta"].includes(L) && mm[L] === undefined && !symbols(Rh).some((k) => k === "x" || k === "y"))
        return { ...B, type: "const", cname: L, fn: cpl(Rh), free: freeOf([Rh], []) };
      if (L === "y") return { ...B, type: "exp", fn: cpl(Rh), rest: rest(), free: freeOf([Rh], []) };
      if (L === "r") { const rg = rangeOf(rs, "theta"); return { ...B, type: "polar", fn: cpl(Rh), rg, rest: rg.rest, free: freeOf([Rh], ["theta"]) }; }
      return { ...B, type: "imp", fn: cpl(`(${L})-(${Rh})`), rest: rest(), free: freeOf([L, Rh], []) };
    }
    return { ...B, type: "ineq", op: rel.op, fn: cpl(`(${L})-(${Rh})`), rest: rest(), free: freeOf([L, Rh], []) };
  }
  return { ...B, type: "exp", fn: cpl(core), rest: rest(), free: freeOf([core], []) };
}
const LAB = { exp: "y =", def: "ƒ", imp: "eq", ineq: "region", pt: "point", par: "param", polar: "r =", err: "⚠", empty: "y =" };

/* ---------- quick graphs ---------- */
const Q = {
  Basic: [["Line", "x"], ["x²", "x^2"], ["x³", "x^3"], ["√x", "sqrt(x)"], ["∛x", "cbrt(x)"], ["1/x", "1/x"], ["1/x²", "1/x^2"], ["|x|", "abs(x)"], ["eˣ", "e^x"], ["2ˣ", "2^x"], ["ln x", "ln(x)"], ["log x", "log(x)"]],
  Step: [["GIF ⌊x⌋", "floor(x)"], ["Ceiling ⌈x⌉", "ceil(x)"], ["Round", "round(x)"], ["Fractional {x}", "x-floor(x)"], ["Sign sgn", "sign(x)"], ["Heaviside", "step(x)"], ["Square wave", "sign(sin(x))"], ["Triangle wave", "asin(sin(x))"], ["x·⌊x⌋", "x*floor(x)"], ["x mod 2", "mod(x,2)"]],
  Trig: [["sin", "sin(x)"], ["cos", "cos(x)"], ["tan", "tan(x)"], ["sin⁻¹", "asin(x)"], ["cos⁻¹", "acos(x)"], ["tan⁻¹", "atan(x)"], ["sec", "1/cos(x)"], ["csc", "1/sin(x)"], ["cot", "1/tan(x)"], ["sinh", "sinh(x)"], ["cosh", "cosh(x)"], ["tanh", "tanh(x)"], ["x sin x", "x*sin(x)"]],
  Special: [["Weierstrass", "sum(0.5^n*cos(7^n*pi*x), n, 0, 8)"], ["Fourier square", "(4/pi)*sum(sin((2*n+1)*x)/(2*n+1), n, 0, 10)"], ["Taylor sin", "sum((-1)^n*x^(2*n+1)/factorial(2*n+1), n, 0, 5)"], ["Gaussian", "e^(-x^2)"], ["Normal pdf", "e^(-x^2/2)/sqrt(2*pi)"], ["Sigmoid", "1/(1+e^(-x))"], ["sinc", "sinc(x)"], ["Gamma Γ", "gamma(x)"], ["erf", "erf(x)"], ["sin(1/x)", "sin(1/x)"], ["x sin(1/x)", "x*sin(1/x)"], ["Witch of Agnesi", "8/(x^2+4)"], ["∫ sin t dt", "int(sin(t), t, 0, x)"]],
  Curves: [["Circle", "x^2+y^2=9"], ["Ellipse", "x^2/16+y^2/4=1"], ["Hyperbola", "x^2/4-y^2/4=1"], ["Sideways parabola", "x=y^2"], ["Cardioid", "r=1+cos(theta)"], ["Rose", "r=2*cos(3*theta)"], ["Spiral", "r=theta{0<=theta<=12}"], ["Lemniscate", "(x^2+y^2)^2=8*(x^2-y^2)"], ["Heart", "(x^2+y^2-1)^3=x^2*y^3"], ["Astroid", "abs(x)^(2/3)+abs(y)^(2/3)=4"], ["Folium", "x^3+y^3=3*x*y"], ["Lissajous", "(sin(3*t), sin(2*t)){0<=t<=6.3}"], ["Cycloid", "(t-sin(t), 1-cos(t)){0<=t<=19}"]],
  Regions: [["y > x²", "y>x^2"], ["Inside circle", "x^2+y^2<=9"], ["y < x + 1", "y<x+1"], ["Domain {x>0}", "x^2{x>0}"], ["Piece", "x^2{-2<=x<=2}"]],
  Sliders: [["ax²+bx+c", "a*x^2+b*x+c"], ["a·sin(bx)", "a*sin(b*x)"], ["Circle (h,k,r)", "(x-h)^2+(y-k)^2=r^2"], ["f(x)=…", "f(x)=x^2-2"], ["Point", "(a, b)"]]
};
const SYMS = [["x²", "^2"], ["xⁿ", "^(§)"], ["√", "√(§)"], ["π", "π"], ["θ", "θ"], ["|a|", "|§|"], ["Σ", "Σ(§, n, 1, 10)"], ["∫", "∫(§, x, 0, 1)"], ["≤", "≤"], ["≥", "≥"], ["( )", "(§)"], ["{ }", "{§}"]];
const cols = ["#00e5ff", "#ff5c8a", "#ffd23f", "#7cff6b", "#c58bff", "#ff9f43", "#4dabff", "#ff6bd6"], MAXR = 8;

/* ================= GRAPH TAB ================= */
R.graph = (b) => {
  const D = { grid: 1, minor: 1, axes: 1, nums: 1, der: 0, tan: 0 }, saved = LS("calcGraph", {});
  const S = { f: (saved.f && saved.f.length ? saved.f : ["sin(x)", "x^2+y^2=9"]).map(bAll), o: Object.assign({}, D, saved.o), h: saved.h || {}, p: saved.p || {} }, V = { x: 0, y: 0, s: 40 };
  let mark = null, models = [], lastIn = null, qtab = "Basic", pts = [];
  const play = {}; let raf = 0, tLast = 0;
  b.innerHTML = `<div id="gf"></div><div id="gsl"></div><div class="tk-row"><button class="tk-b" data-a="add">+ Add</button><button class="tk-b" data-a="pts">Key points</button></div><div class="gx-sym" id="gy"></div><div class="gx-qt" id="gqt"></div><div class="gx-qc" id="gq"></div><div class="tk-gw" id="gw"><canvas class="tk-cv"></canvas><div class="tk-gtools"><button data-a="gin" class="gz" aria-label="Zoom in">+</button><button data-a="gout" class="gz" aria-label="Zoom out">−</button><button data-a="gfs" aria-label="Graph full screen" title="Full screen">⛶</button></div><div class="tk-read" id="gr">Tap the graph to trace a curve.</div></div><div class="tk-chips" id="gc"></div><div class="tk-row"><button class="tk-b" data-a="reset">Reset view</button><button class="tk-b" data-a="png">Save image</button></div><div id="gp"></div><p class="tk-dim">Type like : x^2 → x², sum → Σ, pi → π. Functions: f(x)=x^2 · points (2,3) · parametric (cos(t), sin(t)) · polar r=1+cos(theta) · regions y&lt;x^2 · domain {0&lt;x&lt;5} · Σ Σ(f, n, 1, 10) · log = base 10, ln = natural. Angles in radians.</p>`;
  const cv = $("canvas", b), save = () => SV("calcGraph", { f: S.f, o: S.o, h: S.h, p: S.p });

  /* scope + models */
  const defNames = () => { DN = new Set(S.f.map((f) => (/^\s*([A-Za-z][A-Za-z0-9_]*)\s*(?:\([^)]*\))?\s*=(?!=)/.exec(f) || [])[1]).filter((k) => k && !["x", "y", "r", "t", "theta"].includes(k))); };
  function refresh() {
    defNames();
    for (const k in sc) delete sc[k];
    Object.assign(sc, vals(), FN); for (const k in S.p) sc[k] = S.p[k].v; ctx = sc;
    const ms = S.f.map(build);
    for (let i = 0; i < 3; i++) ms.forEach((o) => { if (o.type === "const") { const v = ev(o.fn, 0, 0); if (!isNaN(v)) sc[o.cname] = v; } });
    ms.forEach((o) => { if (o.type === "def") sc[o.def.name] = mkfn(o); });
    return ms;
  }
  const missing = (o) => o.free.filter((k) => !(k in S.p) && !(k in sc));
  const exy = (o, x) => { if (o.pn) sc[o.pn] = x; return ev(o.fn, x); };
  const isFn = (o) => o && (o.type === "exp" || (o.type === "def" && o.def.params.length === 1));
  const okR = (o, x, y, t) => !o.rest || !o.rest.length || o.rest.every((c) => evb(c, x, y, t));
  const drawable = (o, i) => o && !S.h[i] && ["exp", "def", "imp", "ineq", "pt", "par", "polar"].includes(o.type) && !missing(o).length && !(o.type === "def" && o.def.params.length > 1);

  /* ---------- UI: rows ---------- */
  const rowHTML = (f, i) => `<div class="gx-row${S.h[i] ? " off" : ""}" data-r="${i}"><div class="tk-fn"><i data-eye="${i}" style="background:${cols[i % cols.length]}" title="Show / hide"></i><span class="gx-lb"></span><input data-i="${i}" value="${esc(f)}" placeholder="x²   sin(x)   x²+y²=9   (cos(t), sin(t))   y&lt;x" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done"><button data-rm="${i}" aria-label="Remove">✕</button></div><div class="gx-pv"></div><div class="gx-hint"></div></div>`;
  const rows = () => { $("#gf", b).innerHTML = S.f.map(rowHTML).join(""); updateRows(); };
  function updateRows() {
    models = refresh();
    S.f.forEach((f, i) => {
      const r = $(`.gx-row[data-r="${i}"]`, b); if (!r) return; const o = models[i] || {};
      $(".gx-lb", r).textContent = o.type === "const" ? o.cname + " =" : LAB[o.type] || "y =";
      $(".gx-pv", r).innerHTML = o.type === "err" ? `<span class="gx-er">not understood yet</span>` : o.pv || "";
      const ms = missing(o);
      $(".gx-hint", r).innerHTML = ms.length ? `<span>add slider:</span>${ms.map((k) => `<button data-sl="${esc(k)}">${esc(k)}</button>`).join("")}${ms.length > 1 ? `<button class="gx-all" data-sl="*">all</button>` : ""}` : "";
    });
  }
  const slHTML = (k) => { const p = S.p[k]; return `<div class="gx-sl" data-k="${esc(k)}"><div class="gx-s1"><b>${esc(k)}</b><span>=</span><input class="gx-vl" type="number" step="any" value="${p.v}"><button class="gx-pl" data-pl="${esc(k)}">${play[k] ? "❚❚" : "▶"}</button><button data-sx="${esc(k)}" aria-label="Remove slider">✕</button></div><div class="gx-s2"><input class="gx-mn" type="number" step="any" value="${p.min}"><input class="gx-rg" type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.v}"><input class="gx-mx" type="number" step="any" value="${p.max}"></div></div>`; };
  const sliders = () => { $("#gsl", b).innerHTML = Object.keys(S.p).map(slHTML).join(""); };
  const chips = () => { $("#gc", b).innerHTML = [["grid", "Grid"], ["minor", "Minor lines"], ["axes", "Axes"], ["nums", "Numbers"], ["der", "Derivative"], ["tan", "Tangent"]].map(([k, l]) => `<button class="${S.o[k] ? "on" : ""}" data-o="${k}">${l}</button>`).join(""); };
  const palette = () => {
    $("#gy", b).innerHTML = SYMS.map(([l, v]) => `<button data-ins="${esc(v)}">${esc(l)}</button>`).join("");
    $("#gqt", b).innerHTML = Object.keys(Q).map((k) => `<button class="${k === qtab ? "on" : ""}" data-qt="${k}">${k}</button>`).join("");
    $("#gq", b).innerHTML = Q[qtab].map(([l, v], i) => `<button data-q="${i}">${esc(l)}</button>`).join("");
  };
  const addExpr = (s) => {
    s = bAll(s); const e = S.f.findIndex((z) => !z.trim());
    if (e > -1) S.f[e] = s; else if (S.f.length < MAXR) S.f.push(s); else S.f[S.f.length - 1] = s;
    rows(); save(); draw(); toast("Added");
  };
  function insert(tpl) {
    const el = lastIn && lastIn.isConnected ? lastIn : $(".tk-fn input", b); if (!el) return;
    const k = tpl.indexOf("§"), str = tpl.replace("§", ""), s = el.selectionStart == null ? el.value.length : el.selectionStart, e = el.selectionEnd == null ? s : el.selectionEnd;
    el.value = el.value.slice(0, s) + str + el.value.slice(e); const c = s + (k < 0 ? str.length : k); el.focus(); try { el.setSelectionRange(c, c); } catch (x) {}
    fix(el, true); commit(el);
  }
  function fix(el, full) {
    const v = el.value, pos = el.selectionStart == null ? v.length : el.selectionStart, r = full ? beautifyAll(v, pos) : beautifyTail(v, pos);
    if (r[0] !== v) { el.value = r[0]; try { el.setSelectionRange(r[1], r[1]); } catch (e) {} }
  }
  function commit(el) { const i = +el.dataset.i; S.f[i] = el.value; save(); updateRows(); draw(); }

  /* ---------- sliders ---------- */
  const addSlider = (k) => { if (!(k in S.p)) S.p[k] = { v: 1, min: -10, max: 10, step: 0.01 }; };
  const syncSl = (k) => { const r = $(`.gx-sl[data-k="${k}"]`, b); if (!r) return; const p = S.p[k]; $(".gx-vl", r).value = p.v; $(".gx-rg", r).value = p.v; };
  function tick(ts) {
    if (!b.isConnected) { raf = 0; return; }
    const dt = Math.min(0.05, (ts - tLast) / 1000); tLast = ts;
    Object.keys(play).forEach((k) => { const p = S.p[k]; if (!p) { delete play[k]; return; } p.v = +(p.v + play[k] * (p.max - p.min) * dt / 6).toFixed(4); if (p.v >= p.max) { p.v = p.max; play[k] = -1; } if (p.v <= p.min) { p.v = p.min; play[k] = 1; } syncSl(k); });
    draw(); raf = Object.keys(play).length ? requestAnimationFrame(tick) : 0;
  }

  /* ---------- drawing ---------- */
  function draw() {
    models = refresh(); const w = cv.clientWidth, h = cv.clientHeight; if (!w) return; const d = devicePixelRatio || 1; cv.width = w * d; cv.height = h * d;
    const g = cv.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0);
    const cs = getComputedStyle(document.body), fg = cs.getPropertyValue("--lcd-text").trim() || "#0f6";
    g.fillStyle = cs.getPropertyValue("--lcd-bg").trim() || "#0a120b"; g.fillRect(0, 0, w, h);
    const X = (x) => w / 2 + (x - V.x) * V.s, Y = (y) => h / 2 - (y - V.y) * V.s, ix = (p) => V.x + (p - w / 2) / V.s, iy = (p) => V.y - (p - h / 2) / V.s;
    const raw = 70 / V.s, p10 = 10 ** Math.floor(Math.log10(raw)), st = [1, 2, 5, 10].map((m) => m * p10).find((m) => m >= raw);
    const x0 = ix(0), x1 = ix(w), y0 = iy(h), y1 = iy(0);
    const lines = (step, a) => { g.strokeStyle = `rgba(150,175,165,${a})`; g.lineWidth = 1; g.beginPath(); for (let k = Math.ceil(x0 / step); k * step <= x1; k++) { const q = Math.round(X(k * step)) + 0.5; g.moveTo(q, 0); g.lineTo(q, h); } for (let k = Math.ceil(y0 / step); k * step <= y1; k++) { const q = Math.round(Y(k * step)) + 0.5; g.moveTo(0, q); g.lineTo(w, q); } g.stroke(); };
    if (S.o.grid) { if (S.o.minor) lines(st / 5, 0.09); lines(st, 0.22); }
    const ax = Math.min(Math.max(X(0), 0), w), ay = Math.min(Math.max(Y(0), 0), h);
    if (S.o.axes) { g.strokeStyle = fg; g.globalAlpha = 0.85; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, ay); g.lineTo(w, ay); g.moveTo(ax, 0); g.lineTo(ax, h); g.stroke(); g.globalAlpha = 1; }
    if (S.o.nums) { g.fillStyle = fg; g.globalAlpha = 0.85; g.font = "10px Poppins,sans-serif"; g.textAlign = "center"; for (let k = Math.ceil(x0 / st); k * st <= x1; k++) if (k) g.fillText(+(k * st).toPrecision(6), X(k * st), Math.min(ay + 13, h - 3)); g.textAlign = "left"; for (let k = Math.ceil(y0 / st); k * st <= y1; k++) if (k) g.fillText(+(k * st).toPrecision(6), Math.min(ax + 4, w - 32), Y(k * st) - 3); g.globalAlpha = 1; }

    // does F jump (true discontinuity) between xa and xb ? continuous steep curves converge when we bisect, jumps do not
    const jumpy = (F, xa, xb) => { let a = xa, bb = xb, fa = F(a), fb = F(bb); for (let k = 0; k < 14; k++) { const m = (a + bb) / 2, fm = F(m); if (isNaN(fm)) return true; if (Math.abs(Y(fa) - Y(fm)) > Math.abs(Y(fm) - Y(fb))) { bb = m; fb = fm; } else { a = m; fa = fm; } } return Math.abs(Y(fa) - Y(fb)) > 2.5; };
    const trace = (F, ok, step) => { // draw y = F(x) as a path, breaking at jumps / holes
      let on = false, py = 0;
      for (let px = 0; px <= w; px += step) { const x = ix(px), y = F(x); if (isNaN(y) || !ok(x, y)) { on = false; continue; } const q = Y(y); if (on && !(Math.abs(q - py) > 8 && jumpy(F, ix(px - step), x))) g.lineTo(px, q); else g.moveTo(px, q); on = true; py = q; }
    };
    const grid = (o, n) => { const nc = Math.ceil(w / n) + 1, nr = Math.ceil(h / n) + 1, v = new Float64Array(nc * nr); for (let j = 0; j < nr; j++) for (let k = 0; k < nc; k++) { const x = ix(k * n), y = iy(j * n); v[j * nc + k] = !o.rest.length || okR(o, x, y) ? ev(o.fn, x, y) : NaN; } return { v, nc, nr, n }; };
    const march = ({ v, nc, nr, n }) => {
      for (let j = 0; j < nr - 1; j++) for (let k = 0; k < nc - 1; k++) {
        const a = v[j * nc + k], bb = v[j * nc + k + 1], cc2 = v[(j + 1) * nc + k + 1], dd = v[(j + 1) * nc + k]; if (isNaN(a + bb + cc2 + dd)) continue;
        const px = k * n, py = j * n, q = [];
        if ((a < 0) !== (bb < 0)) q.push([px + (n * a) / (a - bb), py]); if ((bb < 0) !== (cc2 < 0)) q.push([px + n, py + (n * bb) / (bb - cc2)]);
        if ((dd < 0) !== (cc2 < 0)) q.push([px + (n * dd) / (dd - cc2), py + n]); if ((a < 0) !== (dd < 0)) q.push([px, py + (n * a) / (a - dd)]);
        if (q.length >= 2) { g.moveTo(q[0][0], q[0][1]); g.lineTo(q[1][0], q[1][1]); if (q.length === 4) { g.moveTo(q[2][0], q[2][1]); g.lineTo(q[3][0], q[3][1]); } }
      }
    };
    const param = (o, fx, fy, t0, t1, N) => { let on = false, px0 = 0, py0 = 0; for (let k = 0; k <= N; k++) { const t = t0 + ((t1 - t0) * k) / N, x = fx(t), y = fy(t); if (isNaN(x + y) || !okR(o, x, y, t)) { on = false; continue; } const qx = X(x), qy = Y(y); if (on && Math.hypot(qx - px0, qy - py0) < h) g.lineTo(qx, qy); else g.moveTo(qx, qy); on = true; px0 = qx; py0 = qy; } };

    pts = [];
    models.forEach((o, i) => {
      if (!drawable(o, i)) return; const col = cols[i % cols.length]; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.3; g.lineJoin = "round"; g.setLineDash([]);
      if (o.type === "exp" || o.type === "def") {
        const F = (x) => exy(o, x); g.beginPath(); trace(F, (x, y) => okR(o, x, y), 1.5); g.stroke();
        if (S.o.der) { const D1 = (x) => { const e = 1e-5 * Math.max(1, Math.abs(x)); return (F(x + e) - F(x - e)) / (2 * e); }; g.globalAlpha = 0.7; g.setLineDash([6, 5]); g.lineWidth = 1.6; g.beginPath(); trace(D1, () => true, 2); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
      } else if (o.type === "imp") { g.beginPath(); march(grid(o, 5)); g.stroke(); }
      else if (o.type === "ineq") {
        const G = grid(o, 5), strict = o.op === "<" || o.op === ">", lt = o.op[0] === "<"; g.globalAlpha = 0.22; g.beginPath();
        for (let j = 0; j < G.nr; j++) for (let k = 0; k < G.nc; k++) { const v = G.v[j * G.nc + k]; if (!isNaN(v) && (lt ? v < 0 : v > 0)) g.rect(k * 5 - 2.5, j * 5 - 2.5, 5, 5); }
        g.fill(); g.globalAlpha = 1; if (strict) g.setLineDash([7, 6]); g.lineWidth = 1.8; g.beginPath(); march(G); g.stroke(); g.setLineDash([]);
      } else if (o.type === "pt") { const x = ev(o.fx, 0), y = ev(o.fy, 0); if (!isNaN(x + y) && okR(o, x, y)) { g.beginPath(); g.arc(X(x), Y(y), 5.5, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.stroke(); pts.push({ x, y, i }); } }
      else if (o.type === "par") { const t0 = o.rg.lo ? ev(o.rg.lo, 0) : 0, t1 = o.rg.hi ? ev(o.rg.hi, 0) : 2 * Math.PI; if (t1 > t0) { g.beginPath(); param(o, (t) => ev(o.fx, 0, 0, t), (t) => ev(o.fy, 0, 0, t), t0, t1, 1200); g.stroke(); } }
      else if (o.type === "polar") { const t0 = o.rg.lo ? ev(o.rg.lo, 0) : 0, t1 = o.rg.hi ? ev(o.rg.hi, 0) : 2 * Math.PI, rr = (t) => ev(o.fn, 0, 0, t); if (t1 > t0) { g.beginPath(); param(o, (t) => rr(t) * Math.cos(t), (t) => rr(t) * Math.sin(t), t0, t1, 1500); g.stroke(); } }
    });
    if (mark && isFn(models[mark.i]) && drawable(models[mark.i], mark.i)) {
      const c = models[mark.i], F = (x) => exy(c, x), my = F(mark.x), e = 1e-5 * Math.max(1, Math.abs(mark.x)), m = (F(mark.x + e) - F(mark.x - e)) / (2 * e);
      if (S.o.tan && isFinite(m)) { g.strokeStyle = "#fff"; g.globalAlpha = 0.75; g.setLineDash([4, 4]); g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, Y(my + m * (ix(0) - mark.x))); g.lineTo(w, Y(my + m * (ix(w) - mark.x))); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
      g.fillStyle = cols[mark.i % cols.length]; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(X(mark.x), Y(my), 5, 0, 7); g.fill(); g.stroke();
      $("#gr", b).innerHTML = `<b style="color:${cols[mark.i % cols.length]}">●</b> x = ${fmt(mark.x)} &nbsp; y = ${fmt(my)} &nbsp; slope = ${fmt(m)}`;
    }
  }

  /* ---------- key points (roots, extrema, intersections, y-intercept) ---------- */
  function keyPoints() {
    models = refresh();
    const w = cv.clientWidth, x0 = V.x - w / 2 / V.s, x1 = V.x + w / 2 / V.s, N = Math.max(500, w * 2), dx = (x1 - x0) / N, out = [];
    const ex = models.map((c, i) => (isFn(c) && drawable(c, i) ? { c, i } : null)).filter(Boolean), ys = ex.map(({ c }) => Array.from({ length: N + 1 }, (_, k) => exy(c, x0 + k * dx)));
    const bis = (F, a, bb) => { let fa = F(a); for (let k = 0; k < 45; k++) { const m = (a + bb) / 2, fm = F(m); if (fa * fm <= 0) bb = m; else { a = m; fa = fm; } } return (a + bb) / 2; };
    ex.forEach(({ c, i }, j) => {
      const Yv = ys[j], F = (x) => exy(c, x), y00 = F(0); if (isFinite(y00) && x0 <= 0 && x1 >= 0) out.push([i, "y-intercept", 0, y00]);
      for (let k = 0; k < N; k++) {
        if (Yv[k] * Yv[k + 1] < 0 && Math.abs(Yv[k] - Yv[k + 1]) < 1e3) out.push([i, "Root", bis(F, x0 + k * dx, x0 + (k + 1) * dx), 0]);
        if (k) { const p = Yv[k - 1], q = Yv[k], r = Yv[k + 1]; if (isFinite(p + q + r) && (q - p) * (r - q) < 0) { const mx = q > p; let lo = x0 + (k - 1) * dx, hi = x0 + (k + 1) * dx; for (let t = 0; t < 50; t++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if ((F(m1) < F(m2)) === mx) lo = m1; else hi = m2; } const x = (lo + hi) / 2; out.push([i, mx ? "Maximum" : "Minimum", x, F(x)]); } }
      }
    });
    for (let a = 0; a < ex.length; a++) for (let c2 = a + 1; c2 < ex.length; c2++) { const F = (x) => exy(ex[a].c, x) - exy(ex[c2].c, x); for (let k = 0; k < N; k++) { const p = ys[a][k] - ys[c2][k], q = ys[a][k + 1] - ys[c2][k + 1]; if (p * q < 0 && Math.abs(p - q) < 1e3) { const x = bis(F, x0 + k * dx, x0 + (k + 1) * dx); out.push([ex[a].i, "Intersection", x, exy(ex[a].c, x)]); } } }
    $("#gp", b).innerHTML = out.length ? `<div class="tk-grid2">${out.slice(0, 16).map(([i, l, x, y]) => `<button class="tk-stat" data-i="${i}" data-x="${x}" data-y="${y}"><small style="color:${cols[i % cols.length]}">${l}</small><b>(${fmt(x)}, ${fmt(y)})</b></button>`).join("")}</div>` : `<p class="tk-dim">No roots, turning points or intersections in view. Zoom out or add a function.</p>`;
  }

  /* ---------- events ---------- */
  rows(); sliders(); chips(); palette(); requestAnimationFrame(draw);
  const onResize = () => { if (b.isConnected) draw(); else removeEventListener("resize", onResize); }; addEventListener("resize", onResize);
  b.addEventListener("input", (e) => {
    const el = e.target;
    if (el.matches(".tk-fn input")) {
      if (e.isComposing || e.inputType === "insertCompositionText") return;
      if (e.inputType === "insertText" && (e.data || "").length === 1) fix(el, false); else if (!/^delete/.test(e.inputType || "")) fix(el, true);
      commit(el); return;
    }
    const sl = el.closest(".gx-sl"); if (!sl) return; const k = sl.dataset.k, p = S.p[k]; if (!p) return;
    if (el.classList.contains("gx-rg") || el.classList.contains("gx-vl")) { const v = parseFloat(el.value); if (!isNaN(v)) { p.v = v; if (el.classList.contains("gx-vl")) $(".gx-rg", sl).value = v; else $(".gx-vl", sl).value = v; } }
    else if (el.classList.contains("gx-mn") || el.classList.contains("gx-mx")) { const v = parseFloat(el.value); if (!isNaN(v)) { p[el.classList.contains("gx-mn") ? "min" : "max"] = v; const rg = $(".gx-rg", sl); rg.min = p.min; rg.max = p.max; } }
    save(); draw();
  });
  b.addEventListener("compositionend", (e) => { const el = e.target; if (el.matches && el.matches(".tk-fn input")) { fix(el, false); commit(el); } });
  b.addEventListener("focusin", (e) => { if (e.target.matches && e.target.matches(".tk-fn input")) lastIn = e.target; });
  b.addEventListener("focusout", (e) => { const el = e.target; if (el.matches && el.matches(".tk-fn input")) { const v = el.value; fix(el, true); if (el.value !== v) commit(el); } });
  b.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches && e.target.matches(".tk-fn input")) e.target.blur(); });
  $("#gy", b).addEventListener("pointerdown", (e) => e.preventDefault());   // keep the keyboard open while inserting symbols
  b.onclick = (e) => {
    const t = e.target.closest("button, i[data-eye]"); if (!t) return; const ds = t.dataset;
    if (t.classList.contains("tk-stat")) { V.x = +ds.x; V.y = +ds.y; mark = { x: +ds.x, i: +ds.i }; draw(); return; }
    if (ds.eye !== undefined) { const i = +ds.eye; S.h[i] = S.h[i] ? 0 : 1; t.closest(".gx-row").classList.toggle("off", !!S.h[i]); save(); draw(); return; }
    if (ds.rm !== undefined) { S.f.splice(+ds.rm, 1); S.h = {}; mark = null; if (!S.f.length) S.f.push(""); rows(); save(); draw(); return; }
    if (ds.sl !== undefined) { const row = t.closest(".gx-row"), o = models[+row.dataset.r]; (ds.sl === "*" ? missing(o) : [ds.sl]).forEach(addSlider); sliders(); updateRows(); save(); draw(); return; }
    if (ds.sx !== undefined) { delete S.p[ds.sx]; delete play[ds.sx]; sliders(); updateRows(); save(); draw(); return; }
    if (ds.pl !== undefined) { if (play[ds.pl]) delete play[ds.pl]; else play[ds.pl] = 1; t.textContent = play[ds.pl] ? "❚❚" : "▶"; if (!raf && Object.keys(play).length) { tLast = performance.now(); raf = requestAnimationFrame(tick); } return; }
    if (ds.ins !== undefined) { insert(ds.ins); return; }
    if (ds.qt !== undefined) { qtab = ds.qt; palette(); return; }
    if (ds.q !== undefined) { addExpr(Q[qtab][+ds.q][1]); return; }
    if (ds.a === "add") { if (S.f.length < MAXR) { S.f.push(""); rows(); const ins = b.querySelectorAll(".tk-fn input"); ins[ins.length - 1].focus(); } else toast("Max " + MAXR + " rows"); return; }
    if (ds.a === "reset") { Object.assign(V, { x: 0, y: 0, s: 40 }); mark = null; }
    else if (ds.a === "gfs") { const gw = $("#gw", b), on = gw.classList.toggle("full"); document.body.classList.toggle("tk-gfs-lock", on); t.textContent = on ? "✕" : "⛶"; t.title = on ? "Exit full screen" : "Full screen"; requestAnimationFrame(draw); return; }
    else if (ds.a === "gin") zoom(1.3);
    else if (ds.a === "gout") zoom(1 / 1.3);
    else if (ds.a === "pts") { keyPoints(); return; }
    else if (ds.a === "png") { cv.toBlob((bl) => { const a = document.createElement("a"); a.href = URL.createObjectURL(bl); a.download = "roitx-graph.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }); return; }
    else if (ds.o) { S.o[ds.o] = S.o[ds.o] ? 0 : 1; chips(); }
    else return; save(); draw();
  };
  const P2 = new Map(); let start = null; const zoom = (k) => (V.s = Math.min(5000, Math.max(2, V.s * k)));
  cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); P2.set(e.pointerId, [e.clientX, e.clientY]); start = P2.size === 1 ? [e.clientX, e.clientY] : null; };
  cv.onpointermove = (e) => {
    if (!P2.has(e.pointerId)) return; const o = P2.get(e.pointerId), n = [e.clientX, e.clientY];
    if (P2.size === 1) { V.x -= (n[0] - o[0]) / V.s; V.y += (n[1] - o[1]) / V.s; } else { const q = [...P2.entries()].find(([id]) => id !== e.pointerId)[1], d0 = Math.hypot(o[0] - q[0], o[1] - q[1]), d1 = Math.hypot(n[0] - q[0], n[1] - q[1]); if (d0) zoom(d1 / d0); }
    P2.set(e.pointerId, n); draw();
  };
  cv.onpointerup = (e) => { // a tap (not a drag) traces the nearest curve / point
    if (start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) < 6) {
      const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, x = V.x + (px - r.width / 2) / V.s; let best = null;
      const near = pts.find((p) => Math.hypot(r.width / 2 + (p.x - V.x) * V.s - px, r.height / 2 - (p.y - V.y) * V.s - py) < 18);
      if (near) { mark = null; $("#gr", b).innerHTML = `<b style="color:${cols[near.i % cols.length]}">●</b> point (${fmt(near.x)}, ${fmt(near.y)})`; draw(); }
      else {
        models.forEach((c, i) => { if (!isFn(c) || !drawable(c, i)) return; const y = exy(c, x), dd = Math.abs(r.height / 2 - (y - V.y) * V.s - py); if (isFinite(dd) && dd < 40 && (!best || dd < best.d)) best = { d: dd, i }; });
        mark = best ? { x, i: best.i } : null; if (!best) $("#gr", b).textContent = "Tap close to a curve to trace it."; draw();
      }
    }
    P2.delete(e.pointerId); start = null;
  };
  cv.onpointercancel = (e) => { P2.delete(e.pointerId); start = null; };
  cv.addEventListener("wheel", (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); draw(); }, { passive: false });
};

window.ROITX_GP = { norm, bAll, beautifyTail, beautifyAll, splitTop, findRel, rewriteBig };
})();
