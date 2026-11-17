/* ROITX Reference Library — author > class > subject > chapters */
const $ = (id) => document.getElementById(id);
const grid = $("refBookGrid"), backBtn = $("backBtn"), homeBtn = $("homeBtn"), topTitle = $("topTitle"), qInput = $("q");
let books = [], S = { a: "", c: "", s: "" };

const ROMAN = { 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII" };
const isPart = (c) => c == 1 || c == 2;
const clsLabel = (c) => isPart(c) ? `Part ${c}` : `Class ${ROMAN[c] || c}`;
const clsBadge = (c) => isPart(c) ? `P${c}` : (ROMAN[c] || c);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

const PRESETS = [
  { bg: "linear-gradient(160deg,#a63446,#5a1426)", rb: "#e8b44a" },
  { bg: "linear-gradient(160deg,#17808a,#0a3a45)", rb: "#f2cf8a" },
  { bg: "linear-gradient(160deg,#4254b8,#1c2160)", rb: "#e87a5d" },
  { bg: "linear-gradient(160deg,#33854f,#14402a)", rb: "#f2cf8a" },
  { bg: "linear-gradient(160deg,#c98a1e,#7a4a0c)", rb: "#7a1f2b" },
  { bg: "linear-gradient(160deg,#7b3f8f,#3d1a52)", rb: "#f0b27a" }
];

/* ---------- Shelf order (saved in localStorage) ---------- */
const ORD_K = "roitx_ref_order", HINT = " Hold and drag a book to arrange your shelf.";
const pick = (k) => PRESETS[[...String(k)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 6];
const getOrd = () => { try { return JSON.parse(localStorage.getItem(ORD_K) || "{}"); } catch (e) { return {}; } };
const okey = () => `${level()}|${S.a}|${S.c}`;
function ordered(arr) { const o = (getOrd()[okey()] || []).map(String), ix = (v) => { const n = o.indexOf(String(v)); return n < 0 ? 1e9 : n; }; return [...arr].sort((x, y) => ix(x) - ix(y)); }

/* ---------- Theme (same key as AI Tutor) ---------- */
function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  const m = document.querySelector("meta[name=theme-color]");
  if (m) m.content = next === "dark" ? "#080f19" : "#f5f8fd";
  try { localStorage.setItem("roitx_theme", next); } catch (e) {}
}

/* ---------- Navigation state (browser back button works) ---------- */
const level = () => S.s ? "chapter" : S.c !== "" ? "subject" : S.a ? "class" : "author";
function go(a = "", c = "", s = "") { S = { a, c, s }; history.pushState(S, ""); render(); }
addEventListener("popstate", (e) => { S = e.state || { a: "", c: "", s: "" }; render(); });
backBtn.onclick = () => history.back();
homeBtn.onclick = () => (location.href = "index.html");
qInput.oninput = () => {
  const v = qInput.value.trim().toLowerCase(); let n = 0;
  [...grid.children].forEach((el) => { if (el.dataset.t === undefined) return; const ok = el.dataset.t.includes(v); el.hidden = !ok; if (ok) n++; });
  $("none").hidden = n > 0 || !v;
};

/* ---------- Render ---------- */
function render() {
  const lv = level();
  grid.className = "grid" + (lv === "chapter" ? " list" : " case");
  backBtn.disabled = lv === "author";
  qInput.value = ""; $("none").hidden = true; $("resume").innerHTML = "";
  qInput.placeholder = { author: "Search authors…", class: "Search classes…", subject: "Search subjects…", chapter: "Search chapters…" }[lv];
  topTitle.textContent = { author: "Reference Library", class: S.a, subject: `${S.a} • ${clsLabel(S.c)}`, chapter: S.s }[lv];

  const HERO = { author: ["Every reference book, on one shelf.", "Choose an author, then a class, subject and chapter." + HINT], class: [S.a, "Choose a class or part." + HINT], subject: [clsLabel(S.c), `${S.a}: pick a subject.` + HINT], chapter: [S.s, `${S.a}, ${clsLabel(S.c)}. Select a chapter to read.`] }[lv];
  $("heroT").innerHTML = HERO[0].split(" ").map((w, i) => `<span style="--d:${i * 70}ms">${esc(w)}</span> `).join("");
  $("heroP").textContent = HERO[1];
  $("heroP").style.animation = "none"; void $("heroP").offsetWidth; $("heroP").style.animation = "";
  scrollTo({ top: 0, behavior: "instant" });

  // breadcrumbs
  const trail = [["Library", () => go()]];
  if (S.a) trail.push([S.a, () => go(S.a)]);
  if (S.c !== "") trail.push([clsLabel(S.c), () => go(S.a, S.c)]);
  if (S.s) trail.push([S.s, null]);
  $("crumbs").innerHTML = "";
  trail.forEach(([label, fn], i) => {
    const last = i === trail.length - 1;
    const el = document.createElement(last ? "span" : "button");
    el.className = "crumb" + (last ? " on" : ""); el.textContent = label;
    if (!last) el.onclick = fn;
    $("crumbs").append(el);
  });

  grid.innerHTML = "";
  let n = 0, noun = "";
  if (lv === "author") {
    const authors = ordered([...new Set(books.map((b) => b.author))].filter(Boolean));
    authors.forEach((a, i) => {
      const k = new Set(books.filter((b) => b.author === a).map((b) => b.class_no)).size;
      card(a, a.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(), plural(k, "section"), i, PRESETS[i % 6], () => go(a));
    });
    n = authors.length; noun = "authors"; showResume();
  } else if (lv === "class") {
    const cs = ordered([...new Set(books.filter((b) => b.author === S.a).map((b) => b.class_no))].sort((a, b) => a - b));
    cs.forEach((c, i) => {
      const k = new Set(books.filter((b) => b.author === S.a && b.class_no == c).map((b) => b.subject)).size;
      card(clsLabel(c), clsBadge(c), plural(k, "subject"), i, PRESETS[(i + 2) % 6], () => go(S.a, c), String(c));
    });
    n = cs.length; noun = "classes & parts";
  } else if (lv === "subject") {
    const ss = ordered([...new Set(books.filter((b) => b.author === S.a && b.class_no == S.c).map((b) => b.subject))].filter(Boolean));
    ss.forEach((s, i) => {
      const k = books.filter((b) => b.author === S.a && b.class_no == S.c && b.subject === s).length;
      card(s, s.slice(0, 2).toUpperCase(), plural(k, "chapter"), i, PRESETS[i % 6], () => go(S.a, S.c, s));
    });
    n = ss.length; noun = "subjects";
  } else {
    const chs = books.filter((b) => b.author === S.a && b.class_no == S.c && b.subject === S.s).sort((a, b) => a.chapter_no - b.chapter_no);
    chs.forEach((ch, i) => chapterRow(ch, i));
    n = chs.length; noun = "chapters";
  }
  $("meta").textContent = `${n} ${noun}`;
  $("resetOrd").hidden = lv === "chapter" || !getOrd()[okey()];
  if (!n) grid.innerHTML = `<div class="state"><b>Nothing here yet</b><p>No ${noun} available.</p></div>`;
}

function card(title, badge, sub, i, p, fn, k = title) {
  p = pick(k);
  const el = document.createElement("button");
  el.className = "book"; el.style.setProperty("--i", i); el.dataset.t = title.toLowerCase(); el.dataset.k = k;
  el.innerHTML = `<div class="cover-wrap"><div class="bk"><div class="cover" style="background:${p.bg}"><span class="tx"></span><i style="background:${p.rb}"></i><b>${esc(badge)}</b><span class="orn"></span><em></em><span class="imp">Roitx</span><s></s></div></div></div><div class="plate"><div class="t">${esc(title)}</div><div class="s">${esc(sub)}</div></div>`;
  el.onclick = () => { if (Date.now() > noClick) fn(); };
  el.addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse" || D) return; const r = el.getBoundingClientRect(); el.style.setProperty("--px", ((e.clientX - r.left) / r.width - .5).toFixed(2)); el.style.setProperty("--py", ((e.clientY - r.top) / r.height - .5).toFixed(2)); });
  el.addEventListener("pointerleave", () => { el.style.removeProperty("--px"); el.style.removeProperty("--py"); });
  grid.append(el);
}

function chapterRow(ch, i) {
  const el = document.createElement("button");
  el.className = "row" + (ch.file_url ? "" : " off"); el.style.setProperty("--i", i);
  el.dataset.t = `${ch.chapter_no} ${ch.chapter}`.toLowerCase();
  el.innerHTML = `<span class="num">${esc(ch.chapter_no)}</span><span class="info"><small>${ch.file_url ? `Chapter ${esc(ch.chapter_no)}` : "Coming soon"}</small><span class="nm">${esc(ch.chapter)}</span></span>
    <span class="go"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span>`;
  el.onclick = () => {
    if (!ch.file_url) return;
    const file = ch.file_url.split("/").pop();
    const path = `refbooks/class_${S.c}/${S.s}/ch_${ch.chapter_no}/${file}`;
    const url = `notes-viewer.html?path=${encodeURIComponent(path)}&name=${encodeURIComponent(ch.chapter)}`;
    try { localStorage.setItem("roitx_ref_last", JSON.stringify({ url, name: ch.chapter, ctx: `${S.a} • ${clsLabel(S.c)} • ${S.s}` })); } catch (e) {}
    location.href = url;
  };
  grid.append(el);
}

/* ---------- Continue reading ---------- */
function showResume() {
  let last = null;
  try { last = JSON.parse(localStorage.getItem("roitx_ref_last") || "null"); } catch (e) {}
  if (!last || !last.url) return;
  $("resume").innerHTML = `<button class="resume"><span class="rt"><small>Continue reading</small><span class="nm">${esc(last.name)}</span><span class="cx">${esc(last.ctx)}</span></span><span class="pl"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg></span></button>`;
  $("resume").firstChild.onclick = () => (location.href = last.url);
}

/* ---------- Load ---------- */
async function loadRefBooks() {
  grid.className = "grid";
  grid.innerHTML = Array(6).fill('<div class="sk"></div>').join("");
  try {
    const { data, error } = await window.supabaseClient.from("ref_books").select("*");
    if (error) throw error;
    books = data || [];
    history.replaceState(S, "");
    render();
  } catch (e) {
    console.error("Database Error:", e);
    grid.innerHTML = `<div class="state"><b>Couldn't load the library</b><p>Check your connection and try again.</p><button class="retry">Retry</button></div>`;
    grid.querySelector(".retry").onclick = loadRefBooks;
  }
}
document.addEventListener("DOMContentLoaded", loadRefBooks);

addEventListener("scroll", () => document.body.classList.toggle("scrolled", scrollY > 120), { passive: true });
addEventListener("keydown", (e) => { if (e.key === "/" && document.activeElement !== qInput) { e.preventDefault(); qInput.focus(); } });

/* ---------- Drag to rearrange: mouse (drag) + touch (press & hold), keyboard (Alt + arrows) ---------- */
let noClick = 0, D = null, P = null, toastT;
const cells = () => [...grid.querySelectorAll(".book")];
const orderStr = () => cells().map((b) => b.dataset.k).join("|");
function toast(msg) {
  let t = $("toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
  t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 1800);
}
function saveOrder() {
  const all = getOrd(); all[okey()] = cells().map((b) => b.dataset.k);
  try { localStorage.setItem(ORD_K, JSON.stringify(all)); } catch (e) {}
  $("resetOrd").hidden = false; toast("Shelf order saved");
}
$("resetOrd").onclick = () => { const o = getOrd(); delete o[okey()]; try { localStorage.setItem(ORD_K, JSON.stringify(o)); } catch (e) {} render(); toast("Shelf order reset"); };
function flip(fn) { // books glide to their new slots; shelf boards stay put
  const els = cells(), first = els.map((e) => e.getBoundingClientRect()); fn();
  els.forEach((e, i) => { const r = e.getBoundingClientRect(), dx = first[i].left - r.left, dy = first[i].top - r.top; if (dx || dy) e.querySelectorAll(".bk,.plate").forEach((x) => x.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" })); });
}
function startDrag(el, e) {
  const bk = el.querySelector(".bk"), r = bk.getBoundingClientRect(), g = document.createElement("div"), c = bk.cloneNode(true);
  c.style.animation = "none"; g.className = "ghost"; g.style.cssText = `width:${r.width}px;height:${r.height}px;transform:translate3d(${r.left}px,${r.top}px,0)`; g.append(c); document.body.append(g);
  D = { el, g, ox: e.clientX - r.left, oy: e.clientY - r.top, x: e.clientX, y: e.clientY, lock: 0, from: orderStr() };
  el.classList.remove("press"); el.classList.add("ghosted"); document.body.classList.add("dragging");
  requestAnimationFrame(() => g.classList.add("lift")); navigator.vibrate && navigator.vibrate(14); tick();
}
function tick() {
  if (!D) return;
  D.g.style.transform = `translate3d(${D.x - D.ox}px,${D.y - D.oy - 12}px,0)`;
  if (D.y < 90) scrollBy(0, -Math.min(18, (90 - D.y) / 4)); else if (D.y > innerHeight - 90) scrollBy(0, Math.min(18, (D.y - innerHeight + 90) / 4));
  if (performance.now() > D.lock) {
    const t = document.elementFromPoint(D.x, D.y)?.closest(".book");
    if (t && t !== D.el && grid.contains(t)) { flip(() => (cells().indexOf(D.el) < cells().indexOf(t) ? D.el.before(t) : D.el.after(t))); D.lock = performance.now() + 280; }
  }
  D.raf = requestAnimationFrame(tick);
}
function endDrag() {
  const { el, g, raf, from } = D; D = null; cancelAnimationFrame(raf); noClick = Date.now() + 450;
  document.body.classList.remove("dragging"); g.classList.remove("lift");
  const r = el.querySelector(".bk").getBoundingClientRect();
  const done = () => { g.remove(); el.classList.remove("ghosted"); el.querySelector(".bk").animate([{ transform: "translateY(-12px)" }, { transform: "none" }], { duration: 450, easing: "cubic-bezier(.3,1.5,.5,1)" }); };
  g.animate([{ transform: g.style.transform }, { transform: `translate3d(${r.left}px,${r.top}px,0)` }], { duration: 340, easing: "cubic-bezier(.3,1.3,.5,1)", fill: "forwards" }).finished.then(done, done);
  if (orderStr() !== from) saveOrder();
}
const cancelP = () => { if (!P) return; clearTimeout(P.t); P.el.classList.remove("press"); P = null; };
grid.addEventListener("pointerdown", (e) => {
  const el = e.target.closest(".book"); if (!el || D || e.button > 0 || grid.classList.contains("list")) return;
  P = { el, id: e.pointerId, x: e.clientX, y: e.clientY, touch: e.pointerType !== "mouse" };
  if (P.touch) { el.classList.add("press"); P.t = setTimeout(() => { const p = P; P = null; p.el.classList.remove("press"); startDrag(p.el, { clientX: p.x, clientY: p.y }); }, 320); }
});
addEventListener("pointermove", (e) => {
  if (D) { D.x = e.clientX; D.y = e.clientY; return; }
  if (!P || e.pointerId !== P.id) return;
  const d = Math.hypot(e.clientX - P.x, e.clientY - P.y);
  if (P.touch) { if (d > 9) cancelP(); } else if (d > 6) { const p = P; cancelP(); startDrag(p.el, e); }
});
["pointerup", "pointercancel"].forEach((t) => addEventListener(t, () => { if (D) endDrag(); else cancelP(); }));
addEventListener("touchmove", (e) => { if (D) e.preventDefault(); }, { passive: false });
grid.addEventListener("contextmenu", (e) => { if (e.target.closest(".book")) e.preventDefault(); });
grid.addEventListener("keydown", (e) => {
  const el = e.target.closest?.(".book"); if (!el || !e.altKey || !/^Arrow(Left|Right)$/.test(e.key)) return;
  const left = e.key === "ArrowLeft", t = left ? el.previousElementSibling : el.nextElementSibling; if (!t || !t.classList.contains("book")) return;
  e.preventDefault(); flip(() => (left ? t.after(el) : t.before(el))); el.focus(); saveOrder();
});
