/* greet.js — Hisab site se aane wale users ke liye greeting.
   Hisab ka "We have moved" notification yahan ?from=rhisab ke saath bhejta hai.
   Hata na ho to: index.html se <script src="greet.js"> wali line aur ye file delete kar do. Kuch nahi bigadega. */
(function () {
  // ---- Yahan se edit karo ----
  var CONFIG = {
    param: "from",          // URL parameter ka naam
    value: "rhisab",        // is value par greeting dikhegi
    title: "🙏 Swagat hai!",
    message: "Domain badalne se hui asuvidha ke liye hamein khed hai. Ab sab kuch yahin milega.",
    showMs: 7000            // kitni der dikhe (milliseconds)
  };
  // ----------------------------

  function run() {
    var matched = false;
    try {
      matched = new URLSearchParams(location.search).get(CONFIG.param) === CONFIG.value;
    } catch (e) {}
    if (!matched) return;

    // URL saaf karo, taaki refresh par dobara na aaye
    try {
      var u = new URL(location.href);
      u.searchParams.delete(CONFIG.param);
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch (e) {}

    var toast = document.createElement("div");
    toast.className = "greet-toast";
    toast.style.cssText =
      "position:fixed;top:20px;left:50%;transform:translate(-50%,-20px);z-index:99999;" +
      "width:min(92vw,380px);box-sizing:border-box;background:rgba(15,23,42,0.96);" +
      "backdrop-filter:blur(10px);color:#fff;padding:14px 18px;border-radius:14px;" +
      "border:1px solid rgba(0,198,255,0.4);box-shadow:0 10px 25px rgba(0,0,0,0.5);" +
      "cursor:pointer;opacity:0;transition:all 0.4s ease;";

    var title = document.createElement("div");
    title.style.cssText = "font-size:14px;font-weight:700;color:#00c6ff;";
    title.textContent = CONFIG.title;

    var msg = document.createElement("div");
    msg.style.cssText = "font-size:12.5px;margin-top:4px;color:#cbd5e0;line-height:1.5;";
    msg.textContent = CONFIG.message;

    toast.appendChild(title);
    toast.appendChild(msg);
    document.body.appendChild(toast);

    function hide() {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%,-20px)";
      setTimeout(function () { toast.remove(); }, 400);
    }
    toast.addEventListener("click", hide);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.style.opacity = "1";
        toast.style.transform = "translate(-50%,0)";
      });
    });
    setTimeout(hide, CONFIG.showMs);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
