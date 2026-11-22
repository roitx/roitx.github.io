/* =========================================================
   mini-state.js
   Home page ke mini preview (iframe) se full screen kholne par
   user ka kaam wahi se jaari rakhne ke liye chhota helper.

   Kaise kaam karta hai:
   1. Mini page (iframe) Mini.onSnapshot(fn) se apni state dene wala
      function register karta hai.
   2. Home page ka openFull() button dabne par iframe se snapshot
      leta hai aur sessionStorage me rakhta hai, phir full page kholta hai.
   3. Full page start hote hi Mini.take() se wo state wapas leta hai.

   sessionStorage use hota hai: tab band hote hi saaf, aur purani state
   normal visit me kabhi nahi aati (sirf handoff ke 60 sec ke andar).
   ========================================================= */
(function () {
  var inIframe = false;
  try { inIframe = window.self !== window.top; } catch (e) { inIframe = true; }

  var KEY = 'mini_state:' + location.pathname;
  var HANDOFF_KEY = 'mini_handoff';
  var MAX_AGE = 30 * 60 * 1000;   // snapshot 30 min tak valid
  var HANDOFF_AGE = 60 * 1000;    // handoff flag 60 sec tak valid
  var snapFn = null;

  function writeSnap() {
    if (!inIframe || !snapFn) return;
    try {
      var d = snapFn();
      if (d) sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: d }));
    } catch (e) { /* storage full / blocked: chup-chap ignore */ }
  }

  window.Mini = {
    inIframe: inIframe,

    // Page apni state ka snapshot dene wala function yaha register kare.
    onSnapshot: function (fn) {
      snapFn = fn;
      window.__miniSnapshot = writeSnap;  // parent (index.html) isse call karta hai
    },

    // Full page start par: mini se aayi hui state (ya null).
    take: function () {
      try {
        var h = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || 'null');
        if (!h || h.path !== location.pathname || Date.now() - h.t > HANDOFF_AGE) return null;
        var raw = JSON.parse(sessionStorage.getItem(KEY) || 'null');
        sessionStorage.removeItem(HANDOFF_KEY);
        sessionStorage.removeItem(KEY);
        if (!raw || Date.now() - raw.t > MAX_AGE) return null;
        return raw.d;
      } catch (e) { return null; }
    },

    // Condition poora hone tak wait (async dropdown wagairah ke liye)
    waitFor: function (cond, timeout) {
      timeout = timeout || 6000;
      return new Promise(function (resolve) {
        var start = Date.now();
        (function poll() {
          var ok = false;
          try { ok = !!cond(); } catch (e) {}
          if (ok) return resolve(true);
          if (Date.now() - start > timeout) return resolve(false);
          setTimeout(poll, 100);
        })();
      });
    }
  };

  // Backup: iframe band/navigate hone par bhi state save ho jaye.
  window.addEventListener('pagehide', writeSnap);
})();
