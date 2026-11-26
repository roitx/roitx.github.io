/* =========================================================
   activity-log.js  –  PM Roitx ka shared activity tracker
   Har page par (library.js se pehle) include karo:
     <script src="activity-log.js"></script>
   - Page visit khud log hota hai (home, viewer, login jaise pages skip)
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

  var file = location.pathname.split('/').pop();
  var SKIP = /^(index\.html)?$|login|signup|library|downloads|viewer|reader|take-test/i;
  if (SKIP.test(file)) return;

  document.addEventListener('DOMContentLoaded', function () {
    var title = (document.title || file).replace(/\s*[|\u2013\u2014-]\s*PM Roitx.*$/i, '').trim();
    add({ type: 'page', title: title || file, url: file + location.search, meta: 'Page' });
  });
})();
