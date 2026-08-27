/* =========================================================
   PM ROITX - MAIN CONTROLLER SCRIPT (WITH SUPABASE NOTIF)
   ========================================================= */

// Global Fallback Quotes
const GLOBAL_FALLBACK_QUOTES = [
  "Work Hard in Silence Let Success Make Noise",
  "Believe You Can And You Are Halfway There",
  "Push Yourself Because No One Else Is Going To Do It For You",
  "Power ∝ Work • PM Roitx Study Hub",
  "Your Only Limit Is You • Stay Focused"
];

// 1. NAVIGATION & UTILITIES
function goto(page) {
  window.location.href = page;
}

// 2. DYNAMIC WATERMARK & QUOTES SYSTEM
function setupDynamicWatermark() {
  let activeQuotes = GLOBAL_FALLBACK_QUOTES;
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

// 3. DISABLE CONTEXT MENU & DOUBLE-TAP ZOOM
document.addEventListener('contextmenu', (e) => e.preventDefault(), false);

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// 4. CURSOR SPOTLIGHT & CARD 3D TILT
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

// Card 3D Tilt Effect Initialization
function initCardTilt() {
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
}

// 5. NOTIFICATION SYSTEM (UPDATED WITH SUPABASE)
function toggleNotif() {
  const notifBox = document.getElementById("notifBox");
  const badge = document.getElementById("notifBadge");

  if (!notifBox) return;
  notifBox.classList.toggle("active");

  if (notifBox.classList.contains("active") && badge) {
    badge.classList.remove("active");
  }
}

document.addEventListener("click", (e) => {
  const notifBtn = document.getElementById("notifBtn");
  const notifBox = document.getElementById("notifBox");

  if (notifBtn && notifBox) {
    if (!notifBtn.contains(e.target) && !notifBox.contains(e.target)) {
      notifBox.classList.remove("active");
    }
  }
});

function addNotification(title, message, link = "#") {
  const badge = document.getElementById("notifBadge");
  const notifList = document.getElementById("notifList");
  const notifCountTag = document.getElementById("notifCountTag");

  if (!notifList) return;

  if (badge) badge.classList.add("active");

  const emptyMsg = notifList.querySelector(".notif-empty");
  if (emptyMsg) notifList.innerHTML = "";

  const linkAttr = (link && link !== "#") ? `onclick="window.location.href='${link}'" style="cursor: pointer;"` : '';

  const itemHtml = `
    <div class="notif-item" ${linkAttr} style="padding: 10px 0; border-bottom: 1px solid var(--glass-border, rgba(255,255,255,0.1));">
      <div style="font-size: 13px; font-weight: 700; color: var(--text, #333);">${title}</div>
      <div style="font-size: 12px; color: var(--muted, #666); margin-top: 2px;">${message}</div>
    </div>
  `;
  notifList.insertAdjacentHTML("afterbegin", itemHtml);

  const totalItems = notifList.querySelectorAll(".notif-item").length;
  if (notifCountTag) notifCountTag.innerText = `${totalItems} New`;
}

// Supabase Notifications Loader & Realtime Listener
async function loadSupabaseNotifications() {
  if (!window.supabaseClient) return;

  try {
    const { data: notifications, error } = await window.supabaseClient
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (notifications && notifications.length > 0) {
      // Clear initial dummy text
      const notifList = document.getElementById("notifList");
      if (notifList) notifList.innerHTML = "";

      notifications.reverse().forEach(n => {
        addNotification(n.title, n.message, n.link);
      });
    }

    // Subscribe to Realtime Updates (New broadcast arrives live)
    window.supabaseClient
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        const newNotif = payload.new;
        addNotification(newNotif.title, newNotif.message, newNotif.link);
      })
      .subscribe();

  } catch (err) {
    console.warn("Error fetching notifications:", err);
  }
}

// 6. DOM LOADED INITIALIZATIONS
document.addEventListener("DOMContentLoaded", async () => {
  setupDynamicWatermark();
  initCardTilt();
  
  // Load Supabase Notifications for Bell Icon
  loadSupabaseNotifications();

  // Sidemenu Controls
  const sideMenu = document.querySelector(".side-menu");
  const overlay = document.getElementById("overlay");
  const menuBtn = document.getElementById("menuBtn");

  if (menuBtn && sideMenu && overlay) {
    menuBtn.addEventListener("click", () => {
      sideMenu.classList.toggle("open");
      overlay.classList.toggle("show");
    });

    overlay.addEventListener("click", () => {
      sideMenu.classList.remove("open");
      overlay.classList.remove("show");
    });
  }

  // Dark / Light Theme Toggle + SUN & MOON ICON GENERATOR
  const modeToggle = document.getElementById("modeToggle");
  if (modeToggle) {
    const slider = modeToggle.parentElement.querySelector(".slider");

    // Inject Sun/Moon icons dynamically if not present
    if (slider && !slider.querySelector(".theme-icon")) {
      slider.innerHTML = `<span class="theme-icon" style="position: absolute; right: 5px; top: 3px; font-size: 12px; transition: 0.3s;">🌙</span>`;
    }

    const updateThemeIcon = (isLight) => {
      const icon = slider ? slider.querySelector(".theme-icon") : null;
      if (icon) {
        icon.textContent = isLight ? "☀️" : "🌙";
        icon.style.left = isLight ? "5px" : "auto";
        icon.style.right = isLight ? "auto" : "5px";
      }
    };

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      document.body.classList.add("light");
      modeToggle.checked = true;
      updateThemeIcon(true);
    }

    modeToggle.addEventListener("change", () => {
      const isLight = modeToggle.checked;
      document.body.classList.toggle("light", isLight);
      localStorage.setItem("theme", isLight ? "light" : "dark");
      updateThemeIcon(isLight);
    });
  }

  // Dynamic Auth Sync
  const authContainer = document.getElementById("navAuthContainer");
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  let userName = localStorage.getItem("userName") || "Profile";
  let userPhoto = localStorage.getItem("userPhoto") || "profile.jpg";

  const renderAuthUser = (name, photo) => {
    if (!authContainer) return;
    authContainer.innerHTML = `
      <a href="profile.html" class="user-profile-link" style="display: flex; align-items: center; gap: 8px; text-decoration: none; color: inherit;">
        <img src="${photo}" alt="Avatar" class="user-avatar" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--accent);">
        <span style="font-weight: 600;">${name}</span>
      </a>
    `;
  };

  if (isLoggedIn) {
    renderAuthUser(userName, userPhoto);

    if (window.supabaseClient && typeof window.getCurrentUser === "function") {
      try {
        const user = await window.getCurrentUser();
        if (user) {
          const { data } = await window.supabaseClient
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', user.id)
            .single();

          if (data) {
            if (data.full_name) {
              userName = data.full_name;
              localStorage.setItem("userName", userName);
            }
            if (data.avatar_url) {
              userPhoto = data.avatar_url;
              localStorage.setItem("userPhoto", userPhoto);
            }
            renderAuthUser(userName, userPhoto);
          }
        }
      } catch (err) {
        console.warn("Could not fetch profile for navbar:", err);
      }
    }
  }

  // Highlight Active Side Menu Item
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
      if (cookieBanner) cookieBanner.style.display = "none";
    });
  }

  if (declineBtn) {
    declineBtn.addEventListener("click", () => {
      localStorage.setItem("cookieConsent", "declined");
      if (cookieBanner) cookieBanner.style.display = "none";
    });
  }
});

// 7. MOTIVATION POPUP SYSTEM
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
  const randomQuote = GLOBAL_FALLBACK_QUOTES[Math.floor(Math.random() * GLOBAL_FALLBACK_QUOTES.length)];
  element.textContent = randomQuote || "Focus on progress, not perfection!";
}

const motivationPopupElem = document.getElementById("motivationPopup");
if (motivationPopupElem) {
  motivationPopupElem.addEventListener("click", (e) => {
    if (e.target.id === "motivationPopup") e.target.style.display = "none";
  });
}

// 8. CANVAS BACKGROUND ANIMATION
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

// 9. CINEMATIC WAVE ANIMATION
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

// 10. OFFLINE BANNER & SERVICE WORKER
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

// 11. KEYBOARD SHORTCUTS & APP LOAD
document.addEventListener("keydown", (e) => {
  if (e.altKey) {
    const key = e.key.toLowerCase();
    if (key === 't') goto('study-timer.html');
    if (key === 's') goto('solver.html');
    if (key === 'c') goto('classes.html');
  }
});

window.addEventListener("load", () => {
  document.body.classList.add("app-loaded");
});
