/* =========================================================
   PM ROITX - MAIN CONTROLLER SCRIPT (PART 1)
   ========================================================= */

// Localhost par CORS error se bachne ke liye condition check
if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
  fetch("https://analytics.digitalplat.org/a/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({"property":"dpa_ljL0RgOwajacQYbgGjK2fheU5hfng00","event":"page_view","url":window.location.href})
  }).catch(err => console.log("Analytics block or failed"));
}

// ---------------------------------------------------------
// FUTURISTIC FADE SCROLL OBSERVER FOR WIDGETS & SECTIONS
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".snap-section");

  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.25
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active-snap");
      } else {
        entry.target.classList.remove("active-snap");
      }
    });
  }, observerOptions);

  sections.forEach(section => observer.observe(section));
});

// ---------------------------------------------------------
// 1. CONSTANTS & UTILITIES
// ---------------------------------------------------------
const GLOBAL_FALLBACK_QUOTES = [
  "Work Hard in Silence Let Success Make Noise",
  "Believe You Can And You Are Halfway There",
  "Push Yourself Because No One Else Is Going To Do It For You",
  "Power ∝ Work • PM Roitx Study Hub",
  "Your Only Limit Is You • Stay Focused"
];

function goto(page) {
  window.location.href = page;
}

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getOrCreateFirstVisitTime() {
  let visitTime = localStorage.getItem("pm_first_visit_time");
  if (!visitTime) {
    visitTime = new Date().toISOString();
    localStorage.setItem("pm_first_visit_time", visitTime);
  }
  return visitTime;
}

// ---------------------------------------------------------
// 2. WATERMARK & CURSOR SPOTLIGHT & INTERACTIONS
// ---------------------------------------------------------
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

document.addEventListener('contextmenu', (e) => e.preventDefault(), false);

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    if (e.cancelable) {
      e.preventDefault();
    }
  }
  lastTouchEnd = now;
}, { passive: true });

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

// ---------------------------------------------------------
// 3. NOTIFICATION & TODAY'S CALENDAR SYSTEM
// ---------------------------------------------------------
const GOOGLE_API_KEY = "AIzaSyC7sf9ZgjLqIos3BEx0uR2_7ytoS-oDgwo";
const INDIAN_HOLIDAY_CALENDAR_ID = "en.indian#holiday@group.v.calendar.google.com";
const observanceDays = {
  // --- Original Days ---
  "01-01": "New Year's Day",
  "02-14": "Valentine's Day", 
  "03-08": "International Women's Day",
  "05-10": "Mother's Day", 
  "06-21": "Father's Day & Yoga Day",
  "08-02": "Friendship Day", 
  "10-31": "Halloween",
  "11-19": "International Men's Day", 
  "12-25": "Christmas Eve / Day",

  // --- New Additions (National & International) ---
  "01-12": "National Youth Day (Swami Vivekananda Jayanti)",
  "01-26": "Republic Day (India)",
  "01-30": "Martyrs' Day (Shaheed Diwas)",
  "02-28": "National Science Day",
  "03-22": "World Water Day",
  "04-07": "World Health Day",
  "04-22": "Earth Day",
  "05-01": "International Labour Day",
  "06-05": "World Environment Day",
  "07-11": "World Population Day",
  "07-26": "Kargil Vijay Diwas",
  "08-15": "Independence Day (India)",
  "08-29": "National Sports Day",
  "09-05": "Teachers' Day",
  "09-14": "Hindi Diwas",
  "09-27": "World Tourism Day",
  "10-02": "Gandhi Jayanti & International Day of Non-Violence",
  "10-08": "Indian Air Force Day",
  "11-14": "Children's Day",
  "11-26": "Constitution Day (India)",
  "12-01": "World AIDS Day",
  "12-04": "Indian Navy Day",
  "12-10": "Human Rights Day",
  "12-23": "National Farmers' Day (Kisan Diwas)"
};


async function checkTodayCalendarNotifications() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayKey = `${yyyy}-${mm}-${dd}`;
  const monthDayKey = `${mm}-${dd}`;

  let fetchedHolidays = {};
  try {
    const timeMin = new Date(`${yyyy}-01-01T00:00:00Z`).toISOString();
    const timeMax = new Date(`${yyyy}-12-31T23:59:59Z`).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(INDIAN_HOLIDAY_CALENDAR_ID)}/events?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&maxResults=2500`;
    
    const res = await fetch(url);
    const data = await res.json();
    if (data.items) {
      data.items.forEach(item => {
        const hDate = item.start.date || (item.start.dateTime ? item.start.dateTime.split("T")[0] : null);
        if (hDate) fetchedHolidays[hDate] = item.summary;
      });
    }
  } catch (e) {
    console.warn("Holiday fetch error:", e);
  }

  let dbEventsList = [];
  if (window.supabaseClient) {
    try {
      let currentUserId = null;
      if (typeof window.getCurrentUser === "function") {
        const user = await window.getCurrentUser();
        if (user) currentUserId = user.id;
      }

      // Calendar.js ki tarah exact query filter: User ke personal events ya phir global/admin events
      let query = window.supabaseClient.from("events").select("*")
        .eq("event_date", todayKey);

      if (currentUserId) {
        query = query.or(`user_id.eq.${currentUserId},is_global.eq.true`);
      } else {
        query = query.eq("is_global", true);
      }

      const { data: evData, error: evErr } = await query;
      if (!evErr && evData) {
        dbEventsList = evData;
      }
    } catch (err) {
      console.warn("DB events fetch error:", err);
    }
  }

  let activeEvents = [];

  // 1. Google Holiday check
  if (fetchedHolidays[todayKey]) {
    activeEvents.push(`🎉 Holiday: ${fetchedHolidays[todayKey]}`);
  }
  // 2. Observance check
  if (observanceDays[monthDayKey]) {
    activeEvents.push(`✨ Observance: ${observanceDays[monthDayKey]}`);
  }
  // 3. Sunday check
  if (today.getDay() === 0) {
    activeEvents.push(`☀️ Sunday (Weekly Off)`);
  }
  // 4. Filtered Database Events check (Admin 📢 & Personal 📌)
  if (dbEventsList.length > 0) {
    dbEventsList.forEach(ev => {
      const icon = ev.is_global ? '📢' : '📌';
      activeEvents.push(`${icon} ${ev.event_name}`);
    });
  }

  if (activeEvents.length > 0) {
    const notifId = `cal-today-${todayKey}`;
    const expiryKey = `notif_expiry_${notifId}`;
    const lastTriggered = localStorage.getItem(expiryKey);
    const nowTime = new Date().getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (!lastTriggered || (nowTime - parseInt(lastTriggered)) > twentyFourHours) {
      if (typeof addNotification === 'function') {
        addNotification(
          notifId, 
          "📅 Aaj Ka Calendar Event & Wish", 
          activeEvents.join(" | "), 
          "calendar.html", 
          true, 
          new Date().toISOString(), 
          "event"
        );
        localStorage.setItem(expiryKey, nowTime.toString());
      }
    }
  }
}

function cleanupOldNotifications() {
  const now = new Date().getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  const notifItems = document.querySelectorAll(".notif-item");
  notifItems.forEach(item => {
    const timeAttr = item.getAttribute("data-time");
    if (timeAttr) {
      const itemTime = new Date(timeAttr).getTime();
      if ((now - itemTime) > twentyFourHours) {
        item.remove();
      }
    }
  });
  updateUnreadCount();
}

let readNotifIds = JSON.parse(localStorage.getItem("read_notifs") || "[]");
let deletedNotifIds = JSON.parse(localStorage.getItem("deleted_notifs") || "[]");

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
    const notifModal = document.getElementById('notifModal');
    if (notifModal) {
      notifModal.classList.add('active');
      notifModal.style.display = 'flex';
    }
  }
}

function markAllAsRead() {
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
  if (modalTime) modalTime.textContent = timestamp ? `Received: ${timeAgo(timestamp)} (${new Date(timestamp).toLocaleString()})` : "";

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

function addNotification(id, title, message, link = "#", isNew = false, createdAt = null, type = "info") {
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
  const formattedTime = timeAgo(timeStr);

  const itemHtml = `
    <div class="notif-item ${isRead ? 'read' : 'unread'}" id="notif-item-${id}" data-id="${id}" data-time="${timeStr}"
         onclick="openNotifModal('${id}', '${safeTitle}', '${safeMessage}', '${safeLink}', '${timeStr}')">
      <div>
        <span class="notif-type-tag ${type}">${type}</span>
        <div style="font-size: 13px; font-weight: 700; color: var(--text, #fff); display: flex; align-items: center; gap: 6px;">
          ${!isRead ? '<span style="width: 6px; height: 6px; background: #00c6ff; border-radius: 50%; display: inline-block;"></span>' : ''}
          ${title}
        </div>
        <div style="font-size: 12px; color: var(--muted, #8a99ad); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${message}</div>
        <div class="notif-time-ago">${formattedTime}</div>
      </div>
      <button class="notif-delete-btn" onclick="deleteNotification(event, '${id}')" title="Delete">✕</button>
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

async function loadSupabaseNotifications() {
  if (!window.supabaseClient) return;

  const firstVisitTime = getOrCreateFirstVisitTime();

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
      .gte('created_at', firstVisitTime)
      .order('created_at', { ascending: true })
      .limit(30);

    if (error) throw error;

    const notifList = document.getElementById("notifList");
    if (notifList && notifications && notifications.length > 0) {
      notifList.innerHTML = "";
      notifications.forEach(n => {
        if (!n.user_id || n.user_id === currentUserId) {
          addNotification(n.id, n.title, n.message, n.link, false, n.created_at, n.type || "info");
        }
      });
    }

    // Call calendar check and cleanup after loading notifications
    checkTodayCalendarNotifications();
    cleanupOldNotifications();

    window.supabaseClient
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        const n = payload.new;
        if (!n.user_id || n.user_id === currentUserId) {
          addNotification(n.id, n.title, n.message, n.link, true, n.created_at, n.type || "info");
        }
      })
      .subscribe();

  } catch (err) {
    console.warn("Error fetching notifications:", err);
  }
}

// ---------------------------------------------------------
// 4. MOTIVATION POPUP & AUTO-CLOSE TRANSLATION
// ---------------------------------------------------------
let currentQuoteFullText = ""; 
let currentQuoteAuthorPart = ""; 

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
      currentQuoteFullText = data.quote || "Stay focused. Stay unstoppable.";
      currentQuoteAuthorPart = data.author ? `— ${data.author}` : "";
    } catch (err) {
      loadFallbackQuoteForPopup();
    }
  } else {
    loadFallbackQuoteForPopup();
  }

  await applySavedLanguagePreference(textElem);

  if (window.motivationTimeout) clearTimeout(window.motivationTimeout);
  window.motivationTimeout = setTimeout(() => {
    popup.style.display = "none";
  }, 7000);
}

function loadFallbackQuoteForPopup() {
  let quotesList = GLOBAL_FALLBACK_QUOTES;
  if (typeof fallbackQuotes !== 'undefined' && Array.isArray(fallbackQuotes) && fallbackQuotes.length > 0) {
    quotesList = fallbackQuotes;
  } else if (window.quotes && Array.isArray(window.quotes) && window.quotes.length > 0) {
    quotesList = window.quotes;
  }
  currentQuoteFullText = quotesList[Math.floor(Math.random() * quotesList.length)] || "Stay focused. Stay unstoppable.";
  currentQuoteAuthorPart = ""; 
}

async function applySavedLanguagePreference(textElem) {
  const savedLang = localStorage.getItem("pm_motivation_lang") || "en";

  if (savedLang === "hi") {
    textElem.textContent = "Translating...";
    const translatedQuote = await translateMotivationText(currentQuoteFullText, "hindi");
    textElem.textContent = currentQuoteAuthorPart ? `"${translatedQuote}" ${currentQuoteAuthorPart}` : `"${translatedQuote}"`;
  } else {
    textElem.textContent = currentQuoteAuthorPart ? `"${currentQuoteFullText}" ${currentQuoteAuthorPart}` : `"${currentQuoteFullText}"`;
  }
}

async function toggleMotivationLanguage() {
  const textElem = document.getElementById("motivationText");
  const currentLang = localStorage.getItem("pm_motivation_lang") || "en";

  if (window.motivationTimeout) clearTimeout(window.motivationTimeout);

  if (currentLang === "en") {
    localStorage.setItem("pm_motivation_lang", "hi");
    textElem.textContent = "Translating...";
    const translatedQuote = await translateMotivationText(currentQuoteFullText, "hindi");
    textElem.textContent = currentQuoteAuthorPart ? `"${translatedQuote}" ${currentQuoteAuthorPart}` : `"${translatedQuote}"`;
  } else {
    localStorage.setItem("pm_motivation_lang", "en");
    textElem.textContent = currentQuoteAuthorPart ? `"${currentQuoteFullText}" ${currentQuoteAuthorPart}` : `"${currentQuoteFullText}"`;
  }

  window.motivationTimeout = setTimeout(() => {
    const popup = document.getElementById("motivationPopup");
    if (popup) popup.style.display = "none";
  }, 7000);
}

async function translateMotivationText(text, targetLang) {
    if (targetLang === "english" || !text) return text;
    try {
        let tlCode = "hi"; 
        let url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tlCode}&dt=t&q=${encodeURIComponent(text)}`;
        let res = await fetch(url);
        let data = await res.json();
        if (data && data[0]) {
            return data[0].map(item => item[0]).join('');
        }
    } catch (e) {
        console.error("Translation error:", e);
    }
    return text;
}

const motivationPopupElem = document.getElementById("motivationPopup");
if (motivationPopupElem) {
  motivationPopupElem.addEventListener("click", (e) => {
    if (e.target.id === "motivationPopup") e.target.style.display = "none";
  });
}

/* =========================================================
   PM ROITX - MAIN CONTROLLER SCRIPT (PART 2)
   ========================================================= */

// ---------------------------------------------------------
// 5. CANVAS ANIMATION & WAVE GRAPHICS
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// 6. INITIALIZATION & DOM READY HANDLER
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  setupDynamicWatermark();
  initCardTilt();
  loadSupabaseNotifications();

  // Close notification box on outside click
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

  // Theme Toggle Mode
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

  // Active Menu Link Highlight
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".side-menu a").forEach(link => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
      link.style.borderLeft = "4px solid var(--accent, #3aa0ff)";
      link.style.background = "rgba(58, 160, 255, 0.12)";
    }
  });

  // Cookies Banner Management
  const cookieBanner = document.getElementById("cookieBanner");
  const acceptBtn = document.getElementById("acceptCookies");
  const declineBtn = document.getElementById("declineCookies");

  if (cookieBanner) {
    const userConsent = localStorage.getItem("cookieConsent");
    if (!userConsent) {
      cookieBanner.style.display = "flex";
    } else {
      cookieBanner.style.display = "none";
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
  }

  // Offline Banner Management
  const banner = document.getElementById('offlineBanner');
  const bannerText = document.getElementById('bannerText');

  if (banner) {
    banner.addEventListener('click', () => {
      window.location.href = 'library.html';
    });

    let hideTimeout;
    const updateOnlineStatus = () => {
      clearTimeout(hideTimeout);
      if (navigator.onLine) {
        banner.classList.add('online');
        if (bannerText) bannerText.textContent = 'Back online';
        banner.classList.add('show');
        hideTimeout = setTimeout(() => {
          banner.classList.remove('show');
        }, 3500);
      } else {
        banner.classList.remove('online');
        if (bannerText) bannerText.textContent = 'Offline • Tap to view Library';
        banner.classList.add('show');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  }

  // Splash Screen Animation Delay
  const letters = document.querySelectorAll('.splash-text .letter');
  letters.forEach((letter, idx) => {
    letter.style.animationDelay = `${0.6 + (idx * 0.08)}s`;
  });

  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 800);
    }
  }, 2600);
});

// Shortcuts & Service Worker Handlers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

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

// ---------------------------------------------------------
// FUTURISTIC SCROLL WIDGETS OBSERVER
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.scroll-widget-row').forEach(row => {
    observer.observe(row);
  });
});

// ---------------------------------------------------------
// FORMAL CARDS MOUSE CURSOR GLOW TRACKER
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.formal-info-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
});

// Dynamic Iframe Auto-Scaling for Mini Screens
function autoFitMiniIframes() {
  document.querySelectorAll('.widget-mini-screen').forEach(container => {
    const iframe = container.querySelector('iframe');
    if (!iframe) return;

    const baseWidth = 1200; 
    const containerWidth = container.clientWidth;
    const scale = containerWidth / baseWidth;

    iframe.style.width = `${baseWidth}px`;
    iframe.style.height = `${800}px`; 
    iframe.style.transform = `scale(${scale})`;
    iframe.style.transformOrigin = 'top left';
    
    container.style.height = `${800 * scale}px`;
  });
}

window.addEventListener('load', autoFitMiniIframes);
window.addEventListener('resize', autoFitMiniIframes);
window.addEventListener('orientationchange', () => {
  setTimeout(autoFitMiniIframes, 200);
});
