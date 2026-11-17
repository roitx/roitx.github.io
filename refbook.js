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
  { bg: "linear-gradient(135deg,#ff7e5f,#feb47b)", tilt: "-4deg", rb: "#ff4757" },
  { bg: "linear-gradient(135deg,#00c6ff,#0072ff)", tilt: "3deg", rb: "#2ed573" },
  { bg: "linear-gradient(135deg,#f7971e,#db36a4)", tilt: "-2deg", rb: "#ffa502" },
  { bg: "linear-gradient(135deg,#b224ef,#7579ff)", tilt: "5deg", rb: null },
  { bg: "linear-gradient(135deg,#11998e,#38ef7d)", tilt: "-5deg", rb: "#ff6b81" },
  { bg: "linear-gradient(135deg,#fc4a1a,#f7b733)", tilt: "2deg", rb: "#48dbfb" }
];

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
  grid.className = "grid" + (lv === "chapter" ? " list" : "");
  backBtn.disabled = lv === "author";
  qInput.value = ""; $("none").hidden = true; $("resume").innerHTML = "";
  qInput.placeholder = { author: "Search authors…", class: "Search classes…", subject: "Search subjects…", chapter: "Search chapters…" }[lv];
  topTitle.textContent = { author: "Reference Library", class: S.a, subject: `${S.a} • ${clsLabel(S.c)}`, chapter: S.s }[lv];

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
    const authors = [...new Set(books.map((b) => b.author))].filter(Boolean);
    authors.forEach((a, i) => {
      const k = new Set(books.filter((b) => b.author === a).map((b) => b.class_no)).size;
      card(a, a.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(), plural(k, "section"), i, PRESETS[i % 6], () => go(a));
    });
    n = authors.length; noun = "authors"; showResume();
  } else if (lv === "class") {
    const cs = [...new Set(books.filter((b) => b.author === S.a).map((b) => b.class_no))].sort((a, b) => a - b);
    cs.forEach((c, i) => {
      const k = new Set(books.filter((b) => b.author === S.a && b.class_no == c).map((b) => b.subject)).size;
      card(clsLabel(c), clsBadge(c), plural(k, "subject"), i, { bg: "linear-gradient(135deg,#2af598,#009efd)", tilt: i % 2 ? "3deg" : "-3deg", rb: "#ff4757" }, () => go(S.a, c));
    });
    n = cs.length; noun = "classes & parts";
  } else if (lv === "subject") {
    const ss = [...new Set(books.filter((b) => b.author === S.a && b.class_no == S.c).map((b) => b.subject))].filter(Boolean);
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
  if (!n) grid.innerHTML = `<div class="state"><b>Nothing here yet</b><p>No ${noun} available.</p></div>`;
}

function card(title, badge, sub, i, p, fn) {
  const el = document.createElement("button");
  el.className = "book"; el.style.setProperty("--i", i); el.dataset.t = title.toLowerCase();
  el.innerHTML = `<div class="cover-wrap"><div class="cover" style="background:${p.bg}">${p.rb ? `<i style="background:${p.rb}"></i>` : ""}<b>${esc(badge)}</b><em></em></div></div><div class="t">${esc(title)}</div><div class="s">${esc(sub)}</div>`;
  el.onclick = fn;
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
