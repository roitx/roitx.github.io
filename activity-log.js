/* =========================================================
   activity-log.js  –  PM Roitx ka shared activity tracker
   Har page par (library.js se pehle) include karo:
     <script src="activity-log.js"></script>
   - Page visit khud log hota hai (home, viewer, login jaise pages skip)
   - recentFiles me jo bhi likhe (viewer, test, pyq, flashcard) wo khud log + downloads me aata hai
   - Baaki jagah se: ActivityLog.add({type, title, url, meta})
       type: 'page' | 'file' | 'notification'
   Data localStorage ke "activityLog" key me, latest 300 entries.
   ========================================================= */
(function () {
  var KEY = 'activityLog', MAX = 300;

  function read() {
    try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function write(a) {
    try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); } catch (e) {}
  }
  function keyOf(e) { return e.type + '|' + (e.refId || e.url || e.title); }

  function add(e) {
    if (!e || !e.title) return;
    var log = read(), now = Date.now();
    e.ts = now;
    var win = e.type === 'page' ? 30000 : 120000;   // same cheez turant dobara = spam nahi
    if (log[0] && keyOf(log[0]) === keyOf(e) && now - log[0].ts < win) log[0] = e;
    else log.unshift(e);
    write(log);
  }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  window.ActivityLog = { add: add, read: read, write: write, clear: clear };

  // ---- Auto page-visit log ----
  var inIframe = false;
  try { inIframe = window.self !== window.top; } catch (e) { inIframe = true; }
  if (inIframe) return;                                  // home ka mini preview log nahi hoga

  // ---- Viewer / test / reader pages apne aap recentFiles me likhte hain.
  //      Yahan se wo write pakad ke activity log me daal dete hain (kisi page ka code badalna nahi padta) ----
  var _set = Storage.prototype.setItem;
  function baseOf(u) { return String(u || '').split('?')[0]; }
  function saveDownload(f) {
    if (/pyq|flashcard|take-test/i.test(f.url || '') || f.isTest || f.isPyq || f.isFlashcard) return;   // practice items download nahi maane jaate
    var d = [];
    try { d = JSON.parse(localStorage.getItem('downloadedFiles') || '[]'); } catch (e) {}
    if (!Array.isArray(d)) d = [];
    for (var i = 0; i < d.length; i++) if (d[i] && baseOf(d[i].url) === baseOf(f.url)) return;
    d.unshift({
      title: f.title, url: f.url, meta: f.meta, isPremium: !!f.isPremium, isPurchased: !!f.isPurchased,
      timeDownloaded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), tsDownloaded: Date.now()
    });
    _set.call(localStorage, 'downloadedFiles', JSON.stringify(d.slice(0, 200)));
  }
  function onStore(k, v) {
    if (k !== 'recentFiles' || window.__pmSilent) return;   // __pmSilent: hum khud (remove) likhen to log mat karo
    var arr = JSON.parse(v), f = Array.isArray(arr) && arr[0];
    if (!f || !f.title) return;
    if (f.downloaded) saveDownload(f);
    add({ type: 'file', title: f.title, url: f.url, meta: f.meta, file: f });
  }
  if (!Storage.prototype.__pmWrapped) {
    Storage.prototype.setItem = function (k, v) {
      var r = _set.apply(this, arguments);
      try { if (this === window.localStorage) onStore(k, v); } catch (e) {}
      return r;
    };
    Storage.prototype.__pmWrapped = true;
  }

  var file = location.pathname.split('/').pop();

  // ---- Home page: yahan se jo bhi page khule (menu / cards / buttons) wo log ho ----
  if (file === '' || /^index\.html$/i.test(file)) {
    var SKIP_LAUNCH = /login|signup|index|library|downloads|^javascript|^https?:|^#|^mailto/i;
    var labelFor = function (url) {
      var f = url.split('#')[0].split('?')[0], links = document.querySelectorAll('#sideMenu a[href]');
      for (var i = 0; i < links.length; i++) {
        if (links[i].getAttribute('href').split('#')[0].split('?')[0] === f)
          return links[i].textContent.replace(/\s+/g, ' ').trim();
      }
      return f.replace(/\.html$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    };
    var logLaunch = function (url) {
      url = String(url || '');
      if (!/\.html/i.test(url) || SKIP_LAUNCH.test(url)) return;
      add({ type: 'page', title: labelFor(url), url: url, meta: 'Page' });
    };
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href]');
      if (a) logLaunch(a.getAttribute('href'));
    }, true);
    document.addEventListener('DOMContentLoaded', function () {
      var g = window.goto;
      if (typeof g === 'function') window.goto = function (u) { try { logLaunch(u); } catch (e) {} return g.apply(this, arguments); };
    });
  }
  var SKIP = /^(index\.html)?$|login|signup|library|downloads|viewer|reader|take-test|admin|upload|manage|preview|offline|404|working|createfile|google/i;
  if (SKIP.test(file)) return;

  document.addEventListener('DOMContentLoaded', function () {
    var title = (document.title || file).replace(/\s*[|\u2013\u2014-]\s*PM Roitx.*$/i, '').trim();
    add({ type: 'page', title: title || file, url: file + location.search, meta: 'Page' });
  });
})();
