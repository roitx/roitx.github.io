/* =========================================================
   PM ROITX - MAIN CONTROLLER SCRIPT (FULL NOTIFICATION FIXED)
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

// 5. NOTIFICATION SYSTEM (DROPDOWN + MODAL + BROADCASTS)
let readNotifIds = JSON.parse(localStorage.getItem("read_notifs") || "[]");
let deletedNotifIds = JSON.parse(localStorage.getItem("deleted_notifs") || "[]");

// Helper function to update badge and header text dynamically
function updateUnreadCount() {
  const badge = document.getElementById("notifBadge");
  const countTag = document.getElementById("notifCountTag");
  const allItems = document.querySelectorAll(".notif-item");
  
  let unreadCount = 0;
  allItems.forEach(item => {
    if (item.classList.contains("unread")) {
      unreadCount++;
    }
  });

  if (badge) {
    if (unreadCount > 0) {
      badge.classList.add("active");
      badge.style.display = "block";
    } else {
      badge.classList.remove("active");
      badge.style.display = "none";
    }
  }

  if (countTag) {
    countTag.innerText = unreadCount > 0 ? `${unreadCount} New` : `${allItems.length} Items`;
  }
}

function toggleNotif() {
  const box = document.getElementById("notifBox");
  if (box) {
    box.classList.toggle("show");
  } else {
    // Dropdown na milne par fallback Modal Active trigger
    const notifModal = document.getElementById('notifModal');
    if (notifModal) {
      notifModal.classList.add('active');
      notifModal.style.display = 'flex';
    }
  }
}

function markAllAsRead() {
  const badge = document.getElementById("notifBadge");
  const tag = document.getElementById("notifCountTag");

  const allItems = document.querySelectorAll(".notif-item");
  allItems.forEach(item => {
    const id = item.getAttribute("data-id");
    if (id && !readNotifIds.includes(String(id))) readNotifIds.push(String(id));
    item.classList.remove("unread");
    item.classList.add("read");
    const dot = item.querySelector("span[style*='background: #00c6ff']");
    if (dot) dot.remove();
  });
  localStorage.setItem("read_notifs", JSON.stringify(readNotifIds));
  
  updateUnreadCount();
}

function openNotifModal(id, title, message, link, timestamp) {
  // Dropdown ko hide kar rahe hain taaki Modal background overlay par correctly show ho
  const notifBox = document.getElementById("notifBox");
  if (notifBox) notifBox.classList.remove("show");

  const modal = document.getElementById("notifModal");
  const modalTitle = document.getElementById("modalNotifTitle");
  const modalMsg = document.getElementById("modalNotifMessage");
  const modalTime = document.getElementById("modalNotifTime");
  const linkBtn = document.getElementById("modalNotifLinkBtn");
  const deleteBtn = document.getElementById("modalDeleteBtn");

  if (!modal) return;

  if (modalTitle) modalTitle.textContent = title;
  if (modalMsg) modalMsg.textContent = message;
  if (modalTime) modalTime.textContent = timestamp ? `Received on: ${new Date(timestamp).toLocaleString()}` : "";

  if (link && link !== "#" && link !== "null") {
    linkBtn.style.display = "inline-flex";
    linkBtn.onclick = () => { window.location.href = link; };
  } else {
    linkBtn.style.display = "none";
  }

  if (deleteBtn) {
    deleteBtn.onclick = (e) => {
      deleteNotification(e, id);
      closeNotifModal();
    };
  }

  modal.classList.add("active");
  modal.style.display = "flex";

  if (!readNotifIds.includes(String(id))) {
    readNotifIds.push(String(id));
    localStorage.setItem("read_notifs", JSON.stringify(readNotifIds));
    const itemElem = document.getElementById(`notif-item-${id}`);
    if (itemElem) {
      itemElem.classList.remove("unread");
      itemElem.classList.add("read");
      const dot = itemElem.querySelector("span[style*='background: #00c6ff']");
      if (dot) dot.remove();
    }
    
    // Counter live update
    updateUnreadCount();
  }
}

function closeNotifModal() {
  const modal = document.getElementById("notifModal");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
}

function deleteNotification(e, id) {
  if (e) e.stopPropagation(); 
  const notifItem = document.getElementById(`notif-item-${id}`);
  if (notifItem) {
    notifItem.style.opacity = "0";
    notifItem.style.transform = "translateX(20px)";
    setTimeout(() => {
      notifItem.remove();
      if (!deletedNotifIds.includes(String(id))) deletedNotifIds.push(String(id));
      localStorage.setItem("deleted_notifs", JSON.stringify(deletedNotifIds));

      updateUnreadCount();

      const notifList = document.getElementById("notifList");
      if (notifList && notifList.querySelectorAll(".notif-item").length === 0) {
        notifList.innerHTML = `<div class="notif-empty" style="padding: 15px; text-align: center; color: var(--muted, #8a99ad); font-size: 13px;">Koi naya notification nahi hai.</div>`;
      }
    }, 200);
  }
}

function addNotification(id, title, message, link = "#", isNew = false, createdAt = null) {
  const notifList = document.getElementById("notifList");

  if (!notifList || deletedNotifIds.includes(String(id))) return;

  if (document.getElementById(`notif-item-${id}`)) return;

  const emptyMsg = notifList.querySelector(".notif-empty");
  if (emptyMsg) notifList.innerHTML = "";

  const isRead = readNotifIds.includes(String(id));

  const safeTitle = (title || '').replace(/"/g, '&quot;');
  const safeMessage = (message || '').replace(/"/g, '&quot;');
  const safeLink = link || "#";
  const timeStr = createdAt || new Date().toISOString();

  const itemHtml = `
    <div class="notif-item ${isRead ? 'read' : 'unread'}" id="notif-item-${id}" data-id="${id}" onclick="openNotifModal('${id}', '${safeTitle}', '${safeMessage}', '${safeLink}', '${timeStr}')" style="position: relative; padding: 10px 30px 10px 10px; border-bottom: 1px solid rgba(255,255,255,0.08); transition: all 0.2s ease; cursor: pointer;">
      <div>
        <div style="font-size: 13px; font-weight: 700; color: var(--text, #fff); display: flex; align-items: center; gap: 6px;">
          ${!isRead ? '<span style="width: 6px; height: 6px; background: #00c6ff; border-radius: 50%; display: inline-block;"></span>' : ''}
          ${title}
        </div>
        <div style="font-size: 12px; color: var(--muted, #8a99ad); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${message}</div>
      </div>
      <button onclick="deleteNotification(event, '${id}')" title="Delete" style="position: absolute; right: 5px; top: 10px; background: transparent; border: none; color: #ff4757; cursor: pointer; font-size: 14px; opacity: 0.6;">✕</button>
    </div>
  `;
  
  notifList.insertAdjacentHTML("afterbegin", itemHtml);

  updateUnreadCount();

  if (isNew) {
    showToastNotification(title, message, link);
  }
}

function showToastNotification(title, message, link) {
  const toast = document.createElement("div");
  toast.className = "notif-toast";
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 99999;
    background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px);
    color: #fff; padding: 12px 18px; border-radius: 14px;
    border: 1px solid rgba(0, 198, 255, 0.4);
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    cursor: pointer; transition: all 0.3s ease;
  `;
  toast.innerHTML = `
    <div style="font-size: 13px; font-weight: 700; color: #00c6ff;">🔔 ${title}</div>
    <div style="font-size: 12px; margin-top: 2px; color: #cbd5e0;">${message}</div>
  `;
  
  if (link && link !== "#" && link !== "null") {
    toast.onclick = () => window.location.href = link;
  }
  
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// SUPABASE NOTIFICATION LOADER
async function loadSupabaseNotifications() {
  if (!window.supabaseClient) return;

  try {
    let currentUserId = null;

    if (typeof window.getCurrentUser === "function") {
      try {
        const user = await window.getCurrentUser();
        if (user) currentUserId = user.id;
      } catch (e) {
        console.warn("User fetch error:", e);
      }
    }

    let { data: notifications, error } = await window.supabaseClient
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(30);

    if (error) throw error;

    if (notifications && notifications.length > 0) {
      const notifList = document.getElementById("notifList");
      if (notifList) notifList.innerHTML = "";

      notifications.forEach(n => {
        if (!n.user_id || n.user_id === currentUserId) {
          addNotification(n.id, n.title, n.message, n.link, false, n.created_at);
        }
      });
    }

    window.supabaseClient
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        const n = payload.new;
        if (!n.user_id || n.user_id === currentUserId) {
          addNotification(n.id, n.title, n.message, n.link, true, n.created_at);
        }
      })
      .subscribe();

  } catch (err) {
    console.warn("Error fetching notifications:", err);
  }
}

// 6. DOM INITIALIZATION & EVENT LISTENERS
document.addEventListener("DOMContentLoaded", async () => {
  setupDynamicWatermark();
  initCardTilt();
  
  loadSupabaseNotifications();

  // Close Notif Dropdown on Outside Click
  document.addEventListener("click", (e) => {
    const notifWrapper = document.querySelector(".notif-wrapper");
    const notifBox = document.getElementById("notifBox");
    if (notifWrapper && notifBox && !notifWrapper.contains(e.target)) {
      notifBox.classList.remove("show");
    }
  });

  const notifModal = document.getElementById("notifModal");
  if (notifModal) {
    notifModal.addEventListener("click", (e) => {
      if (e.target === notifModal) closeNotifModal();
    });
  }

  // Theme Toggle Logic
  const modeToggle = document.getElementById("modeToggle");
  if (modeToggle) {
    const slider = modeToggle.parentElement.querySelector(".slider");

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

  // Highlight Active Side Menu Link
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".side-menu a").forEach(link => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
      link.style.borderLeft = "4px solid var(--accent, #3aa0ff)";
      link.style.background = "rgba(58, 160, 255, 0.12)";
    }
  });

  // Cookie Consent Banner Controls
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

// 8. CANVAS BACKGROUND PARTICLES ENGINE
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

// 9. WAVE ANIMATION AT BOTTOM
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

// 10. OFFLINE BANNER CONTROLLER
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

// 11. KEYBOARD SHORTCUTS
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
