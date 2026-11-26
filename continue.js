/* =========================================================
   continue.js  –  Home page ka "Continue where you left off" card
   Sabse last khuli file / PYQ / flashcards / test ko ek tap me resume karta hai.
   Data: localStorage "recentFiles" (+ "activityLog" se time, "pdf_pos_*" se page).
   Link banane ka logic Recent Activities (activity-ui.js) wala hi hai.
   ========================================================= */
(function () {
  var box = document.getElementById("continueCard");
  if (!box) return;

  var P = {
    file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    pyq: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    test: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    flash: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    premium: '<path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>'
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safe(u) { return /^\s*(javascript|data|vbscript):/i.test(String(u || "")) ? "#" : u; }
  function get(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; }
  }
  function clean(s) { return String(s || "").replace(/[^\w\s]/gi, "").toLowerCase().trim(); }

  function describe(f) {
    var raw = f.url || "", low = raw.toLowerCase(), path = raw.split("?")[0], pl = path.toLowerCase();
    var meta = String(f.meta || "");
    var isFlash = f.isFlashcard || low.indexOf("flashcard-reader") > -1 || /flashcard/i.test(meta);
    var isPyq = f.isPyq || low.indexOf("pyq") > -1 || /pyq/i.test(meta);
    var isTest = f.isTest || pl.indexOf("take-test.html") > -1;
    var title = clean(f.title);
    var purchased = f.isPurchased || get("userPurchasedNotes", []).some(function (i) { return clean(i.title) === title; });
    var premium = f.isPremium || pl.indexOf("premium") > -1 || pl.indexOf("paid") > -1;
    var prog = get("readingProgress", {});
    var saved = prog[path] != null ? prog[path] : (prog[f.title] != null ? prog[f.title] : null);
    var idMatch = raw.match(/id=([^&]+)/), id = idMatch ? idMatch[1] : "";
    var q = saved != null ? "&cardIndex=" + saved : "";
    var url = f.url || "#", kind = "file", label = "Notes", cta = "Resume", pdfPath = "";

    if (isFlash) {
      kind = "flash"; label = "Flashcards";
      url = id ? "flashcard-reader.html?id=" + id + q : raw;
    } else if (isPyq) {
      kind = "pyq"; label = "PYQ";
      url = id ? "pyq-reader.html?id=" + id + q
               : "pyq-reader.html?path=" + encodeURIComponent(path) + "&name=" + encodeURIComponent(f.title) + q;
    } else if (isTest) {
      kind = "test"; label = "Test"; cta = "Open";
      url = raw;
    } else if (premium && raw.indexOf("viewer.html") < 0) {
      var img = /\.(jpg|jpeg|png|webp|gif)$/i.test(path);
      kind = img ? "image" : "premium"; label = img ? "Image" : "Premium notes";
      url = (img ? "image-viewer.html" : "notes-viewer.html") + "?path=" + encodeURIComponent(path) +
            "&name=" + encodeURIComponent(f.title) + "&type=premium" + (img ? "" : "&status=premium") + (purchased ? "&purchased=true" : "");
      if (!img) pdfPath = path;
    } else if (/\.(jpg|jpeg|png|webp|gif)$/i.test(path) || meta.indexOf("Image") > -1) {
      kind = "image"; label = "Image";
      var ip = path;
      if (ip.indexOf("formulas/") !== 0 && ip.indexOf("/") < 0) ip = "formulas/" + ip;
      url = "image-viewer.html?path=" + encodeURIComponent(ip) + "&name=" + encodeURIComponent(f.title) + (purchased ? "&purchased=true" : "");
    } else if (raw.indexOf("notes-viewer.html") < 0) {
      label = "PDF";
      var np = path;
      if (np.indexOf("notes/") !== 0 && np.indexOf("/") < 0) np = "notes/" + np;
      url = "notes-viewer.html?path=" + encodeURIComponent(np) + "&name=" + encodeURIComponent(f.title) +
            (purchased ? "&purchased=true" : (premium ? "&type=premium&status=premium" : "")) + (saved != null ? "&scrollIndex=" + saved : "");
      pdfPath = np;
    }
    if (kind === "premium") label = "Premium notes";

    var page = null;
    if (pdfPath) {
      var p = localStorage.getItem("pdf_pos_" + pdfPath);
      if (p == null) p = localStorage.getItem("pdf_pos_" + raw);
      if (p != null && parseInt(p, 10) > 0) page = parseInt(p, 10);
    }
    return { url: url, kind: kind, label: label, cta: cta, page: page };
  }

  function ago(ts) {
    var m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    var h = Math.round(m / 60);
    if (h < 24) return h + " hr ago";
    var d = Math.round(h / 24);
    return d === 1 ? "yesterday" : d + " days ago";
  }

  function render() {
    var recent = get("recentFiles", []);
    var f = Array.isArray(recent) && recent[0];
    if (!f || !f.title) { box.hidden = true; box.innerHTML = ""; return; }

    var d = describe(f);
    var when = f.time || "";
    var log = get("activityLog", []);
    for (var i = 0; i < log.length; i++) {
      if (log[i].type === "file" && log[i].title === f.title && log[i].ts) { when = ago(log[i].ts); break; }
    }
    var sub = [d.label];
    if (d.page) sub.push("Page " + d.page);
    if (when) sub.push(when);

    box.innerHTML =
      '<a href="' + esc(safe(d.url)) + '">' +
        '<div class="cc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (P[d.kind] || P.file) + '</svg></div>' +
        '<div class="cc-body"><span class="cc-kicker">Continue where you left off</span>' +
          '<b class="cc-title">' + esc(f.title) + '</b>' +
          '<span class="cc-sub">' + esc(sub.join(" \u2022 ")) + '</span></div>' +
        '<span class="cc-go">' + d.cta + ' \u2192</span>' +
      '</a>';
    box.hidden = false;
  }

  render();
  window.addEventListener("pageshow", render);
  window.addEventListener("storage", function (e) {
    if (e.key === "recentFiles" || e.key === "activityLog") render();
  });
})();
