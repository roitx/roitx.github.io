/* =========================================================
   PM ROITX - MAIN CONTROLLER SCRIPT
   ========================================================= */

// ================= 1. GLOBAL NAVIGATION & HELPERS =================
function goto(page) {
  window.location.href = page;
}

// ================= 2. DYNAMIC WATERMARK & QUOTES SYSTEM =================
function setupDynamicWatermark() {
  const fallbackQuotes = [
    "Work Hard in Silence Let Success Make Noise",
    "Believe You Can And You Are Halfway There",
    "Push Yourself Because No One Else Is Going To Do It For You",
    "Power ∝ Work • PM Roitx Study Hub",
    "Your Only Limit Is You • Stay Focused"
  ];

  let activeQuotes = fallbackQuotes;

  try {
    const storedQuotes = JSON.parse(localStorage.getItem('quotes'));
    if (Array.isArray(storedQuotes) && storedQuotes.length > 0) {
      activeQuotes = storedQuotes;
    } else if (window.quotes && Array.isArray(window.quotes)) {
      activeQuotes = window.quotes;
    }
  } catch (e) {
    console.warn("Using fallback watermark quotes", e);
  }

  const watermarkText = activeQuotes.join(" ✦ ") + " ✦ ";
  document.body.setAttribute('data-watermark', watermarkText);
}

// ================= 3. DISABLE ZOOM, TOUCH & SELECTION =================
document.addEventListener('contextmenu', (e) => e.preventDefault(), false);

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = new Date().getTime();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// ================= 4. CURSOR SPOTLIGHT & CARD 3D TILT =================
const spotlight = document.createElement("div");
spotlight.id = "cursorSpotlight";
document.body.appendChild(spotlight);

function updateCursorPos(x, y) {
  spotlight.style.left = `${x}px`;
  spotlight.style.top = `${y}px`;
  document.body.style.setProperty('--cursor-x', `${x}px`);
  document.body.style.setProperty('--cursor-y', `${y}px`);
}

document.addEventListener("mousemove", (e) => updateCursorPos(e.clientX, e.clientY));
document.addEventListener("touchmove", (e) => {
  if (e.touches.length > 0) {
    updateCursorPos(e.touches[0].clientX, e.touches[0].clientY);
  }
});

// Card 3D Tilt Effect
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    card.style.setProperty('--card-x', `${x}px`);
    card.style.setProperty('--card-y', `${y}px`);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = -((y - centerY) / 12);
    const rotateY = (x - centerX) / 12;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
  });
});

// ================= 5. DOM LOADED (THEME, AUTH, SIDEMENU & HIGHLIGHT) =================
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Dynamic Watermark
  setupDynamicWatermark();

  // Sidemenu Controls
  const sideMenu = document.querySelector(".side-menu");
  const overlay = document.getElementById("overlay");
  const menuBtn = document.getElementById("menuBtn");

  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      sideMenu.classList.toggle("open");
      overlay.classList.toggle("show");
    });
  }

  if (overlay) {
    overlay.addEventListener("click", () => {
      sideMenu.classList.remove("open");
      overlay.classList.remove("show");
    });
  }

  // Dark / Light Theme Toggle
  const modeToggle = document.getElementById("modeToggle");
  if (modeToggle) {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.body.classList.add("light");
      modeToggle.checked = true;
    }
    modeToggle.addEventListener("change", () => {
      document.body.classList.toggle("light", modeToggle.checked);
      localStorage.setItem("theme", modeToggle.checked ? "light" : "dark");
    });
  }

  // Dynamic Auth Sync
  const authContainer = document.getElementById("navAuthContainer");
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  let userName = localStorage.getItem("userName") || "Profile";
  let userPhoto = localStorage.getItem("userPhoto") || "profile.jpg";

  if (isLoggedIn && authContainer) {
    authContainer.innerHTML = `
      <a href="profile.html" class="user-profile-link" style="display: flex; align-items: center; gap: 8px; text-decoration: none; color: inherit;">
        <img src="${userPhoto}" alt="Avatar" class="user-avatar" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--accent);">
        <span style="font-weight: 600;">${userName}</span>
      </a>
    `;
  }

  if (isLoggedIn && window.supabaseClient) {
    try {
      const user = await window.getCurrentUser();
      if (user) {
        const { data } = await window.supabaseClient
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (data && data.full_name) {
          userName = data.full_name;
          localStorage.setItem("userName", userName);
        }

        if (data && data.avatar_url) {
          userPhoto = data.avatar_url;
          localStorage.setItem("userPhoto", userPhoto);
        }

        if (authContainer) {
          authContainer.innerHTML = `
            <a href="profile.html" class="user-profile-link" style="display: flex; align-items: center; gap: 8px; text-decoration: none; color: inherit;">
              <img src="${userPhoto}" alt="Avatar" class="user-avatar" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--accent);">
              <span style="font-weight: 600;">${userName}</span>
            </a>
          `;
        }
      }
    } catch (err) {
      console.warn("Could not fetch profile for navbar:", err);
    }
  }

  // Highlight Active Menu Item
  const currentPath = window.location.pathname.split("/").pop();
  document.querySelectorAll(".side-menu a").forEach(link => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
      link.style.borderLeft = "4px solid var(--accent, #3aa0ff)";
      link.style.background = "rgba(58, 160, 255, 0.12)";
    }
  });

  // Cookie Consent Banner
  const cookieBanner = document.getElementById("cookieBanner");
  const acceptBtn = document.getElementById("acceptCookies");
  const declineBtn = document.getElementById("declineCookies");

  if (cookieBanner && !localStorage.getItem("cookieConsent")) {
    cookieBanner.style.display = "block";
  }

  if (acceptBtn) {
    acceptBtn.addEventListener("click", () => {
      localStorage.setItem("cookieConsent", "accepted");
      cookieBanner.style.display = "none";
    });
  }

  if (declineBtn) {
    declineBtn.addEventListener("click", () => {
      localStorage.setItem("cookieConsent", "declined");
      cookieBanner.style.display = "none";
    });
  }
});

// ================= 6. MOTIVATION POPUP SYSTEM =================
async function showMotivation() {
  const popup = document.getElementById("motivationPopup");
  const textElem = document.getElementById("motivationText");

  if (!popup || !textElem) return;

  textElem.textContent = "Loading motivation...";
  popup.style.display = "flex";

  if (navigator.onLine) {
    try {
      const response = await fetch("https://dummyjson.com/quotes/random");
      const data = await response.json();
      textElem.textContent = `"${data.quote}" — ${data.author}`;
    } catch (err) {
      loadFallbackQuote(textElem);
    }
  } else {
    loadFallbackQuote(textElem);
  }

  setTimeout(() => {
    popup.style.display = "none";
  }, 7000);
}

function loadFallbackQuote(element) {
  if (typeof fallbackQuotes !== "undefined" && fallbackQuotes.length > 0) {
    const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    element.textContent = randomQuote;
  } else {
    element.textContent = "Focus on progress, not perfection!";
  }
}

const motivationPopupElem = document.getElementById("motivationPopup");
if (motivationPopupElem) {
  motivationPopupElem.addEventListener("click", e => {
    if (e.target.id === "motivationPopup") e.target.style.display = "none";
  });
}

// ================= 7. CANVAS BACKGROUND ANIMATION =================
const c = document.getElementById("bgCanvas");
if (c) {
  const ctx = c.getContext("2d");
  let dots = [];

  function createDots() {
    const numDots = Math.floor(window.innerWidth / 25);
    dots = [];
    for (let i = 0; i < numDots; i++) {
      dots.push({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        r: 1.5 + Math.random() * 2,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4
      });
    }
  }

  function resizeCanvas() {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    createDots();
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 200);
  });

  resizeCanvas();

  function animateDots() {
    ctx.clearRect(0, 0, c.width, c.height);
    dots.forEach(d => {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = document.body.classList.contains("light") ? "rgba(37, 99, 235, 0.15)" : "rgba(255,255,255,0.25)";
      ctx.fill();
      d.x += d.dx;
      d.y += d.dy;
      if (d.x < 0 || d.x > c.width) d.dx *= -1;
      if (d.y < 0 || d.y > c.height) d.dy *= -1;
    });
    requestAnimationFrame(animateDots);
  }
  animateDots();
}

// ================= 8. CINEMATIC WAVE ANIMATION =================
const wavePathBottom = document.getElementById("waveBottomPath");
if (wavePathBottom) {
  let t = 0;
  function animateWave() {
    t += 0.015;
    const waveHeight = 120;
    const amplitude1 = 18;
    const amplitude2 = 10;
    const frequency1 = 0.007;
    const frequency2 = 0.014;
    const bottomLimit = 220;

    let d = `M0 ${waveHeight} `;
    for (let x = 0; x <= window.innerWidth; x += 5) {
      const y = waveHeight
        + Math.sin(x * frequency1 + t) * amplitude1
        + Math.sin(x * frequency2 + t * 1.3) * amplitude2;
      d += `L ${x} ${y} `;
    }
    d += `L ${window.innerWidth} ${bottomLimit} L0 ${bottomLimit} Z`;

    wavePathBottom.setAttribute("d", d);
    requestAnimationFrame(animateWave);
  }
  animateWave();
}

// ================= 9. OFFLINE BANNER & SERVICE WORKER =================
window.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('offlineBanner');
  const bannerText = document.getElementById('bannerText');

  if (!banner) return;

  banner.addEventListener('click', () => {
    window.location.href = 'library.html';
  });

  function updateOnlineStatus() {
    if (navigator.onLine) {
      banner.classList.add('online');
      if (bannerText) bannerText.textContent = 'Back online';
      banner.classList.add('show');

      setTimeout(() => {
        banner.classList.remove('show');
      }, 3500);
    } else {
      banner.classList.remove('online');
      if (bannerText) bannerText.textContent = 'Offline • Tap to view Library';
      banner.classList.add('show');
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  if (!navigator.onLine) {
    updateOnlineStatus();
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

// ================= 10. KEYBOARD SHORTCUTS & APP LOAD =================
document.addEventListener("keydown", (e) => {
  if (e.altKey && e.key.toLowerCase() === 't') {
    goto('study-timer.html');
  } else if (e.altKey && e.key.toLowerCase() === 's') {
    goto('solver.html');
  } else if (e.altKey && e.key.toLowerCase() === 'c') {
    goto('classes.html');
  }
});

window.addEventListener("load", () => {
  document.body.classList.add("app-loaded");
});
