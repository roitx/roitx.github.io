/* =========================================================
   PM ROITX - MAIN CONTROLLER SCRIPT (PART 1)
   ========================================================= */

const isLocalHost = location.hostname.includes('localhost') || location.hostname.includes('127.0.0.1');

function sendPageView() {
  if (isLocalHost) return;
  fetch("https://analytics.digitalplat.org/a/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({"property":"dpa_ljL0RgOwajacQYbgGjK2fheU5hfng00","event":"page_view","url":location.href})
  }).catch(() => {});
}

// Sirf tab jab user ne pehle Accept kiya ho
if (localStorage.getItem("cookieConsent") === "accepted") sendPageView();
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

// Mini preview (iframe) se full screen kholna: user jis page/state par hai wahi se aage badhe.
// - iframe ka current URL use hota hai (jaise classes.html -> subjects-10.html)
// - iframe se uski state ka snapshot leke sessionStorage me rakhta hai
function openFull(btn, fallback) {
  const card = btn && btn.closest ? btn.closest('.slide-inner-card') : null;
  const frame = card ? card.querySelector('.widget-mini-screen iframe') : null;
  let target = fallback;

  if (frame) {
    try {
      const w = frame.contentWindow;
      const loc = w.location;
      // sirf apni site ka page; about:blank ya error page par fallback
      if (loc.origin === location.origin && loc.pathname && loc.pathname !== '/') {
        const params = new URLSearchParams(loc.search);
        // reattempt=true hota to full page par draft mit jata, isliye hata do
        params.delete('reattempt');
        const q = params.toString();
        target = loc.pathname + (q ? '?' + q : '') + loc.hash;

        // purana snapshot hatao, phir fresh snapshot lo
        try { sessionStorage.removeItem('mini_state:' + loc.pathname); } catch (e) {}
        if (typeof w.__miniSnapshot === 'function') w.__miniSnapshot();
        // test chal raha ho to uska draft turant save karwa do
        if (typeof w.saveLocalDraft === 'function') { try { w.saveLocalDraft(); } catch (e) {} }

        sessionStorage.setItem('mini_handoff', JSON.stringify({ path: loc.pathname, t: Date.now() }));
      }
    } catch (e) { /* cross-origin ya koi dikkat: fallback page khulega */ }
  }

  goto(target);
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

/**
 * Card tilt effect (single definition).
 * Applies a subtle 3D tilt on mouse move for .card and .card-tilt elements.
 */

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


// Local date -> "YYYY-MM-DD"
function fmtDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Repeat wale event (weekly / monthly / yearly) kisi din par aata hai ya nahi
function eventOccursOn(ev, key) {
  const parse = k => { const p = String(k).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const o = parse(ev.event_date), d = parse(key);
  if (d < o) return false;
  if (ev.repeat === "weekly") {
    return Math.round((d - o) / 864e5) % 7 === 0;
  }
  if (ev.repeat === "monthly") {
    return d.getDate() === o.getDate();
  }
  if (ev.repeat === "yearly") {
    return d.getDate() === o.getDate() && d.getMonth() === o.getMonth();
  }
  return false;
}

// Har calendar event ab apni alag notification banta hai (aaj + kal ke events).
// Notification har page-load par drawer me add hoti hai (delete na ki ho to),
// lekin toast sirf pehli baar dikhta hai.
async function checkTodayCalendarNotifications() {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const todayKey = fmtDateKey(today);
  const tomorrowKey = fmtDateKey(tomorrow);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  let fetchedHolidays = {};
  try {
    const yyyy = today.getFullYear();
    const timeMin = new Date(`${yyyy}-01-01T00:00:00Z`).toISOString();
    const timeMax = new Date(`${yyyy + 1}-01-02T00:00:00Z`).toISOString();
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
      const scope = q => currentUserId
        ? q.or(`user_id.eq.${currentUserId},is_global.eq.true`)
        : q.eq("is_global", true);

      const [{ data: evData, error: evErr }, { data: repData, error: repErr }] = await Promise.all([
        scope(window.supabaseClient.from("events").select("*").in("event_date", [todayKey, tomorrowKey])),
        // repeat wale events (column na ho to ye query error degi, jise ignore kiya jata hai)
        scope(window.supabaseClient.from("events").select("*").neq("repeat", "none").lte("event_date", tomorrowKey))
      ]);

      if (!evErr && evData) {
        dbEventsList = evData.filter(ev => !ev.repeat || ev.repeat === "none" || repErr);
      }
      if (!repErr && repData) {
        repData.forEach(ev => {
          [todayKey, tomorrowKey].forEach(k => {
            if (eventOccursOn(ev, k)) dbEventsList.push(Object.assign({}, ev, { event_date: k }));
          });
        });
      }
    } catch (err) {
      console.warn("DB events fetch error:", err);
    }
  }

  // ---- Saare calendar items ek list me ----
  const items = [];
  const pushDay = (dateKey, dateObj, label) => {
    const prefix = label === "today" ? "" : "Kal: ";
    const idBase = `cal-${dateKey}`;
    const mmdd = `${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

    if (fetchedHolidays[dateKey]) {
      items.push({ id: `${idBase}-holiday`, title: `🎉 ${prefix}Holiday`, message: fetchedHolidays[dateKey] });
    }
    if (observanceDays[mmdd]) {
      items.push({ id: `${idBase}-observance`, title: `✨ ${prefix}Special Day`, message: observanceDays[mmdd] });
    }
    if (label === "today" && dateObj.getDay() === 0) {
      items.push({ id: `${idBase}-sunday`, title: "☀️ Sunday", message: "Aaj weekly off hai." });
    }
    dbEventsList.filter(ev => ev.event_date === dateKey).forEach(ev => {
      items.push({
        id: `${idBase}-ev-${ev.id}`,
        title: ev.is_global ? `📢 ${prefix}Announcement` : `📌 ${prefix}Your Event`,
        message: ev.event_name + (ev.event_time ? " • " + String(ev.event_time).slice(0, 5) : "")
      });
    });
  };
  pushDay(todayKey, today, "today");
  pushDay(tomorrowKey, tomorrow, "tomorrow");

  // ---- Drawer me add karo; toast sirf naye ke liye ----
  let toasted = [];
  try { toasted = JSON.parse(localStorage.getItem("cal_toasted") || "[]"); } catch (e) {}
  const newOnes = [];

  items.forEach(it => {
    addNotification(it.id, it.title, it.message, "calendar.html", false, startOfToday, "event");
    if (!toasted.includes(it.id) && !deletedNotifIds.includes(it.id)) newOnes.push(it);
  });

  if (newOnes.length > 0) {
    const first = newOnes[0];
    showToastNotification(
      newOnes.length === 1 ? first.title : `📅 ${newOnes.length} naye calendar updates`,
      newOnes.length === 1 ? first.message : newOnes.map(n => n.message).slice(0, 2).join(" • ") + (newOnes.length > 2 ? " ..." : ""),
      "calendar.html"
    );
    // purane keys hata kar sirf last ~60 rakho
    toasted = toasted.concat(newOnes.map(n => n.id)).slice(-60);
    localStorage.setItem("cal_toasted", JSON.stringify(toasted));
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
  applyNotifFilter();
}

function showNotifHint(msg) {
  const box = document.getElementById("notifBox");
  if (!box) return;
  let h = document.getElementById("notifPermHint");
  if (!h) {
    h = document.createElement("div");
    h.id = "notifPermHint";
    box.insertBefore(h, box.children[1] || null);
  }
  h.innerHTML = msg;
}
function clearNotifHint() { const h = document.getElementById("notifPermHint"); if (h) h.remove(); }

window.askNotifPermission = function () {
  sessionStorage.setItem("notifAsked", "1");
  Notification.requestPermission().then(p => {
    if (p === "granted") { clearNotifHint(); subscribeUserToPushSilently(); }
    else showNotifHint('🔔 Updates ke liye notifications <b>Allow</b> karein. <button onclick="askNotifPermission()">Allow karein</button>');
  });
};

window.toggleNotif = function () {
  const box = document.getElementById("notifBox");
  if (box) box.classList.toggle("show");
  else {
    const m = document.getElementById("notifModal");
    if (m) { m.classList.add("active"); m.style.display = "flex"; }
  }
  if (box && !box.classList.contains("show")) return;   // panel band hua

  if (typeof Notification === "undefined") {
    showNotifHint("Is browser me notifications support nahi hain. iPhone par site ko <b>Add to Home Screen</b> karke kholein."); return;
  }
  if (Notification.permission === "granted") { clearNotifHint(); subscribeUserToPushSilently(); return; }
  if (Notification.permission === "denied") {
    showNotifHint("🔕 Notifications band hain. Chrome me <b>⋮ → Site settings → Notifications</b> me jaakar <b>Allow</b> karein."); return;
  }
  if (!sessionStorage.getItem("notifAsked")) askNotifPermission();      // pehli baar: seedha popup
  else showNotifHint('🔔 Notifications abhi band hain. <button onclick="askNotifPermission()" style="margin-top:6px;padding:6px 12px;border-radius:8px;border:0;background:#3b82f6;color:#fff">Allow karein</button>');
};

// ---- Fullscreen notification view ----
let currentNotifFilter = "all";

function setNotifFullscreen(on) {
  const box = document.getElementById("notifBox");
  if (!box) return;
  const wrapper = document.querySelector(".notif-wrapper");

  if (on) {
    // body me shift: taaki header ke transform/blur se fixed position na bigde
    document.body.appendChild(box);
    box.classList.add("show", "notif-fullscreen");
    document.body.style.overflow = "hidden";
  } else {
    box.classList.remove("notif-fullscreen");
    if (wrapper) wrapper.appendChild(box);
    document.body.style.overflow = "";
    setNotifFilter("all");
  }

  const btn = document.getElementById("notifFullscreenBtn");
  if (btn) {
    btn.title = on ? "Exit full screen" : "Full screen";
    btn.querySelector(".ic-expand").style.display = on ? "none" : "block";
    btn.querySelector(".ic-collapse").style.display = on ? "block" : "none";
  }
}

function toggleNotifFullscreen() {
  const box = document.getElementById("notifBox");
  if (!box) return;
  setNotifFullscreen(!box.classList.contains("notif-fullscreen"));
}

function setNotifFilter(filter) {
  currentNotifFilter = filter;
  document.querySelectorAll("#notifFilters .notif-filter-chip").forEach(c => {
    c.classList.toggle("active", c.dataset.filter === filter);
  });
  applyNotifFilter();
}

function applyNotifFilter() {
  const list = document.getElementById("notifList");
  if (!list) return;
  let visible = 0;
  list.querySelectorAll(".notif-item").forEach(item => {
    let show = true;
    if (currentNotifFilter === "unread") show = item.classList.contains("unread");
    else if (currentNotifFilter === "event") show = item.dataset.type === "event";
    item.style.display = show ? "" : "none";
    if (show) visible++;
  });
  let msg = document.getElementById("notifFilterEmpty");
  if (!msg) {
    msg = document.createElement("div");
    msg.id = "notifFilterEmpty";
    msg.className = "notif-empty";
    msg.style.display = "none";
    msg.textContent = "Is filter me koi notification nahi hai.";
    list.appendChild(msg);
  }
  const total = list.querySelectorAll(".notif-item").length;
  msg.style.display = (total > 0 && visible === 0) ? "block" : "none";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const box = document.getElementById("notifBox");
    const modal = document.getElementById("notifModal");
    const modalOpen = modal && modal.style.display === "flex";
    if (modalOpen) return; // pehle modal band hoga (existing behaviour)
    if (box && box.classList.contains("notif-fullscreen")) setNotifFullscreen(false);
  }
});

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
  if (notifBox && !notifBox.classList.contains("notif-fullscreen")) notifBox.classList.remove("show");

  const modal = document.getElementById("notifModal");
  const modalTitle = document.getElementById("modalNotifTitle");
  const modalMsg = document.getElementById("modalNotifMessage");
  const modalTime = document.getElementById("modalNotifTime");
  const linkBtn = document.getElementById("modalNotifLinkBtn");
  const deleteBtn = document.getElementById("modalDeleteBtn");

  if (!modal) return;

  // Activity log: kaun sa notification padha
  if (window.ActivityLog) {
    ActivityLog.add({ type: "notification", title: title || "Notification", refId: String(id),
      url: (link && link !== "#" && link !== "null") ? link : "", meta: String(message || "").slice(0, 70) });
  }

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

const notifStore = {};

function bindNotifListEvents(notifList) {
  if (notifList.dataset.bound) return;
  notifList.dataset.bound = "1";
  notifList.addEventListener("click", (e) => {
    const item = e.target.closest(".notif-item");
    if (!item) return;
    const id = item.getAttribute("data-id");
    if (e.target.closest(".notif-delete-btn")) {
      deleteNotification(e, id);
      return;
    }
    const n = notifStore[id];
    if (n) openNotifModal(id, n.title, n.message, n.link, n.time);
  });
}

function addNotification(id, title, message, link = "#", isNew = false, createdAt = null, type = "info") {
  const notifList = document.getElementById("notifList");

  if (!notifList || deletedNotifIds.includes(String(id))) return;
  if (document.getElementById(`notif-item-${id}`)) return;
  bindNotifListEvents(notifList);

  const emptyMsg = notifList.querySelector(".notif-empty");
  if (emptyMsg && !notifList.querySelector(".notif-item")) notifList.innerHTML = "";

  const isRead = readNotifIds.includes(String(id));
  const timeStr = createdAt || new Date().toISOString();
  const formattedTime = timeAgo(timeStr);
  notifStore[id] = { title: title || "", message: message || "", link: link || "#", time: timeStr };

  const itemHtml = `
    <div class="notif-item ${isRead ? 'read' : 'unread'}" id="notif-item-${escapeHtml(id)}" data-id="${escapeHtml(id)}" data-type="${escapeHtml(type)}" data-time="${escapeHtml(timeStr)}">
      <div>
        <span class="notif-type-tag ${escapeHtml(type)}">${escapeHtml(type)}</span>
        <div style="font-size: 13px; font-weight: 700; color: var(--text, #fff); display: flex; align-items: center; gap: 6px;">
          ${!isRead ? '<span style="width: 6px; height: 6px; background: #00c6ff; border-radius: 50%; display: inline-block;"></span>' : ''}
          ${escapeHtml(title)}
        </div>
        <div class="notif-msg" style="font-size: 12px; color: var(--muted, #8a99ad); margin-top: 2px;">${escapeHtml(message)}</div>
        <div class="notif-time-ago">${escapeHtml(formattedTime)}</div>
      </div>
      <button class="notif-delete-btn" title="Delete">✕</button>
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
    <div style="font-size: 13px; font-weight: 700; color: #00c6ff;">🔔 ${escapeHtml(title)}</div>
    <div style="font-size: 12px; margin-top: 2px; color: #cbd5e0;">${escapeHtml(message)}</div>
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
  if (!window.supabaseClient) {
    // Supabase na ho tab bhi calendar/holiday notifications dikhne chahiye
    await checkTodayCalendarNotifications();
    cleanupOldNotifications();
    return;
  }

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
    // DB fail ho to bhi calendar notifications dikhao
    await checkTodayCalendarNotifications();
    cleanupOldNotifications();
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
await checkAndSyncSecureStreak();
  // Close notification box on outside click
  document.addEventListener("click", (e) => {
    const notifWrapper = document.querySelector(".notif-wrapper");
    const notifBox = document.getElementById("notifBox");
    if (notifWrapper && notifBox && !notifWrapper.contains(e.target) && !notifBox.contains(e.target)
        && !e.target.closest(".notif-toast") && !notifBox.classList.contains("notif-fullscreen")) {
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

    // ---- Auto theme: din (DAY_START se NIGHT_START tak) = light, raat = dark.
    //      User ne toggle dabaya (localStorage "theme" set) to wahi chalega.
    //      Cache / site data clear hone par "theme" hat jata hai aur auto mode wapas shuru. ----
    const HINT_MS = 5 * 1000; // "Auto on: long tap" hint 3 minute tak
    const DAY_START = 6;    // subah 6 baje se light
    const NIGHT_START = 18; // shaam 6 baje se dark
    const manualTheme = () => {
      const v = localStorage.getItem("theme");
      return v === "light" || v === "dark" ? v : null;
    };
    const wantLight = () => {
      const m = manualTheme();
      if (m) return m === "light";
      const h = new Date().getHours();
      return h >= DAY_START && h < NIGHT_START;
    };
    const applyTheme = () => {
      const isLight = wantLight();
      document.body.classList.toggle("light", isLight);
      modeToggle.checked = isLight;
      updateThemeIcon(isLight);
      // Auto mode me knob ke andar "A" dikhta hai (manual me nahi)
      const swEl = modeToggle.closest(".switch");
      if (swEl) swEl.classList.toggle("auto-on", !manualTheme());
      // Auto mode off hone par toggle ke niche hint dikhao
      if (swEl) {
        let hint = swEl.querySelector(".auto-hint");
        if (!hint) {
          hint = document.createElement("span");
          hint.className = "auto-hint";
          hint.textContent = "Auto on: long tap";
          swEl.appendChild(hint);
        }
        // Hint sirf kuchh minute (HINT_MS) dikhe: manual mode shuru hone ke baad
        let until = parseInt(localStorage.getItem("theme_hint_until") || "0", 10);
        if (manualTheme() && !until) {
          until = Date.now() + HINT_MS;
          localStorage.setItem("theme_hint_until", String(until));
        }
        const showHint = manualTheme() && Date.now() < until;
        hint.style.display = showHint ? "block" : "none";
        clearTimeout(window.__themeHintTimer);
        if (showHint) window.__themeHintTimer = setTimeout(() => { hint.style.display = "none"; }, until - Date.now());
      }
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", isLight ? "#f4f7fc" : "#0a1b3d");
    };

    applyTheme();

    // Auto mode user ne khud on kiya to chhota message aaye aur 2 sec me khud chala jaye
    let themeToastEl = null, themeToastTimer = null;
    const showThemeToast = (msg) => {
      if (themeToastEl) themeToastEl.remove();
      clearTimeout(themeToastTimer);
      const el = document.createElement("div");
      el.setAttribute("role", "status");
      el.innerHTML = '<b style="display:block;font-size:13px">' + msg + '</b>';
      el.style.cssText = "position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 70px);" +
        "transform:translate(-50%,-8px);opacity:0;z-index:99999;padding:10px 18px;border-radius:14px;" +
        "text-align:center;pointer-events:none;color:var(--text);background:var(--glass);" +
        "border:1px solid var(--glass-border);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);" +
        "box-shadow:0 10px 30px rgba(0,0,0,.28);transition:opacity .25s,transform .25s;";
      document.body.appendChild(el);
      themeToastEl = el;
      requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "translate(-50%,0)"; });
      themeToastTimer = setTimeout(() => {
        el.style.opacity = "0"; el.style.transform = "translate(-50%,-8px)";
        setTimeout(() => { el.remove(); if (themeToastEl === el) themeToastEl = null; }, 300);
      }, 2200);
    };

    // Toggle ko long press (0.6s) karne par Auto mode wapas on: manual choice hat jata hai
    const sw = modeToggle.closest(".switch") || modeToggle.parentElement;
    if (sw) {
      let pressTimer = null, longPressed = false, sx = 0, sy = 0;
      const cancel = () => { clearTimeout(pressTimer); pressTimer = null; };
      sw.title = "Long press: Auto theme (din me light, raat me dark)";
      sw.addEventListener("pointerdown", (e) => {
        longPressed = false; sx = e.clientX; sy = e.clientY; cancel();
        pressTimer = setTimeout(() => {
          longPressed = true;
          localStorage.removeItem("theme");
          localStorage.removeItem("theme_hint_until");
          applyTheme();
          showThemeToast("Auto theme mode on");
          if (navigator.vibrate) { try { navigator.vibrate(35); } catch (_) {} }
        }, 600);
      });
      sw.addEventListener("pointermove", (e) => {
        if (pressTimer && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) cancel();
      });
      ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => sw.addEventListener(ev, cancel));
      // long press ke baad aane wala click toggle na palte
      sw.addEventListener("click", (e) => {
        if (longPressed) { e.preventDefault(); e.stopPropagation(); longPressed = false; }
      }, true);
      sw.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    modeToggle.addEventListener("change", () => {
      const wasAuto = !manualTheme();
      if (wasAuto) showThemeToast("Auto theme mode off");
      localStorage.setItem("theme", modeToggle.checked ? "light" : "dark"); // manual choice
      localStorage.setItem("theme_hint_until", String(Date.now() + HINT_MS));
      applyTheme();
    });

    // Auto mode me hon to din/raat badalte hi theme khud badle
    setInterval(() => { if (!manualTheme()) applyTheme(); }, 60000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && !manualTheme()) applyTheme(); });
    window.addEventListener("storage", (e) => { if (e.key === "theme") applyTheme(); });
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
  sendPageView();   // <- ye nayi line
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

  // Splash screen: full 2.6s branding on first visit only.
  // Repeat visitors skip it (the `repeat-visit` class is set in <head> before paint).
  const splash = document.getElementById('splashScreen');
  const isRepeatVisit = document.documentElement.classList.contains('repeat-visit');

  if (splash && isRepeatVisit) {
    splash.remove();
  } else if (splash) {
    document.querySelectorAll('.splash-text .letter').forEach((letter, idx) => {
      letter.style.animationDelay = `${0.6 + (idx * 0.08)}s`;
    });

    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 800);
      // Mark as visited only after the branding was actually shown.
      try { localStorage.setItem('hasVisitedBefore', '1'); } catch (e) { /* ignore */ }
    }, 2600);
  }
});

// ---------------------------------------------------------
// SERVICE WORKER UPDATE HANDLER (no surprise reloads)
// ---------------------------------------------------------
(function initServiceWorkerUpdateHandler() {
  if (!('serviceWorker' in navigator)) return;

  const IDLE_MS = 30000;   // reload automatically only after 30s of inactivity
  const CHECK_MS = 5000;   // how often we re-check the idle conditions
  const FIELD_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

  // On a first-ever install there is no old controller, so nothing to refresh.
  const hadController = !!navigator.serviceWorker.controller;
  let updateShown = false;
  let reloading = false;
  let lastActivity = Date.now();
  const dirtyFields = new Set();

  // --- Activity + dirty form tracking -----------------------------------
  const markActive = () => { lastActivity = Date.now(); };
  ['keydown', 'input', 'focusin'].forEach(evt => document.addEventListener(evt, markActive, true));

  document.addEventListener('input', (e) => {
    if (e.target && e.target.matches && e.target.matches(FIELD_SELECTOR)) dirtyFields.add(e.target);
  }, true);

  // A submitted / reset form no longer holds unsaved input.
  const clearFormFields = (e) => {
    if (e.target && e.target.elements) Array.from(e.target.elements).forEach(el => dirtyFields.delete(el));
  };
  document.addEventListener('submit', clearFormFields, true);
  document.addEventListener('reset', clearFormFields, true);

  function hasFocusedField() {
    const el = document.activeElement;
    return !!(el && el !== document.body && el.matches && el.matches(FIELD_SELECTOR));
  }

  function hasUnsavedInput() {
    for (const el of dirtyFields) {
      if (!el.isConnected) { dirtyFields.delete(el); continue; }
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.checked !== el.defaultChecked) return true;
      } else if (el.isContentEditable) {
        if (el.textContent.trim() !== '') return true;
      } else if (el.value !== (el.defaultValue || '')) {
        return true;
      }
    }
    return false;
  }

  function isSafeToReload() {
    return !hasFocusedField()
      && !hasUnsavedInput()
      && (Date.now() - lastActivity) >= IDLE_MS;
  }

  function reloadNow() {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  }

  // --- Non-intrusive toast ------------------------------------------------
  function showUpdateToast() {
    if (updateShown) return;
    updateShown = true;

    const toast = document.createElement('div');
    toast.className = 'sw-update-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const text = document.createElement('span');
    text.className = 'sw-update-text';
    text.textContent = 'Update Available';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sw-update-btn';
    btn.textContent = 'Refresh';
    btn.addEventListener('click', reloadNow);

    toast.append(text, btn);
    document.body.appendChild(toast);

    // Auto-refresh only once the user is idle and has no unsaved input.
    setInterval(() => { if (isSafeToReload()) reloadNow(); }, CHECK_MS);
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    showUpdateToast();
  });
})();

// Keyboard shortcuts

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

// ---------------------------------------------------------
// MINI PREVIEWS: lightweight image first, real <iframe> only on tap
// ---------------------------------------------------------
const MINI_BASE_WIDTH = 1200;
const MINI_BASE_HEIGHT = 800;

// Scales the container (and a live iframe, if loaded) to the available width.
function autoFitMiniIframes() {
  document.querySelectorAll('.widget-mini-screen').forEach(container => {
    const scale = container.clientWidth / MINI_BASE_WIDTH;
    container.style.height = `${MINI_BASE_HEIGHT * scale}px`;

    const iframe = container.querySelector('iframe');
    if (!iframe) return;

    iframe.style.width = `${MINI_BASE_WIDTH}px`;
    iframe.style.height = `${MINI_BASE_HEIGHT}px`;
    iframe.style.transform = `scale(${scale})`;
    iframe.style.transformOrigin = 'top left';
  });
}

// Replaces the preview image + button with the real page (once, on user action).
function loadMiniIframe(container) {
  if (container.querySelector('iframe')) return;

  const iframe = document.createElement('iframe');
  iframe.src = container.dataset.src;
  iframe.title = container.dataset.title || 'Preview';
  iframe.loading = 'lazy';
  container.appendChild(iframe);

  container.querySelectorAll('.mini-preview-img, .mini-play-btn').forEach(el => el.remove());
  autoFitMiniIframes();
}

function initLazyMiniPreviews() {
  const containers = document.querySelectorAll('.widget-mini-screen[data-src]');
  if (!containers.length) return;

  // Load the preview image only when its card is close to the viewport.
  const loadImage = (img) => {
    if (img.dataset.src) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    }
  };
  const images = Array.from(containers, c => c.querySelector('.mini-preview-img')).filter(Boolean);

  if ('IntersectionObserver' in window) {
    const imgObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        loadImage(entry.target);
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '300px 0px' });
    images.forEach(img => imgObserver.observe(img));
  } else {
    images.forEach(loadImage); // very old browsers: just load them
  }

  // The real iframe loads ONLY after the user taps the preview.
  containers.forEach(container => {
    const btn = container.querySelector('.mini-play-btn');
    const img = container.querySelector('.mini-preview-img');
    if (btn) btn.addEventListener('click', () => loadMiniIframe(container));
    if (img) img.addEventListener('click', () => loadMiniIframe(container));
  });
}

document.addEventListener('DOMContentLoaded', initLazyMiniPreviews);
window.addEventListener('load', autoFitMiniIframes);
window.addEventListener('resize', autoFitMiniIframes);
window.addEventListener('orientationchange', () => {
  setTimeout(autoFitMiniIframes, 200);
});

// --- NATIVE NOTIFICATION PERMISSION & PUSH SETUP ---
const VAPID_PUBLIC_KEY = 'BMYEkoJeS0XfUioxCbOxw74ZpQmow8-OaGLrYiB3Bolh2Fl4U5AXNFA-5QJ16skwIMxlc2ZzsAi9XenHbfyivEs';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Background me push subscription save karne ke liye helper function
async function subscribeUserToPushSilently() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription && Notification.permission === 'granted') {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    if (subscription && window.supabaseClient) {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      const userId = session ? session.user.id : null;

      // Database ki push_subscriptions table me token save karna
      await window.supabaseClient
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          subscription: JSON.parse(JSON.stringify(subscription)),
          updated_at: new Date().toISOString()
        }, { onConflict: 'subscription' });
    }
  } catch (err) {
    console.warn('Push silent subscription error:', err);
  }
}


// App khulne par background me silent subscription sync
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    subscribeUserToPushSilently();
  }
});

// App khulne par badge clear karne ke liye
window.addEventListener('focus', async () => {
  if ('clearAppBadge' in navigator) {
    try {
      await navigator.clearAppBadge();
    } catch (e) {
      console.log('Badge clear failed:', e);
    }
  }
});
function initCardTilt() {
  document.querySelectorAll('.card, .card-tilt').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = -((y - centerY) / 10);
      const rotateY = (x - centerX) / 10;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
    });
  });
 
}

// WHY CHOOSE US CARDS STAGGERED SCROLL OBSERVER
document.addEventListener("DOMContentLoaded", () => {
  const whySection = document.getElementById("whyChooseUsSection");
  if (!whySection) return;

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const cards = whySection.querySelectorAll('.formal-info-card');
        cards.forEach((card, index) => {
          // Har card ko thode-thode delay ke sath active class dena
          setTimeout(() => {
            card.style.animationPlayState = 'running';
          }, index * 120); // 120ms ka gap har card ke beech me
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(whySection);
});


// ---------------------------------------------------------
// SECURE STREAK SYSTEM WITH SMART TOUCH/CLICK TRIGGER
// ---------------------------------------------------------
let isStreakTriggered = false;

async function checkAndSyncSecureStreak() {
  if (typeof window.supabaseClient === 'undefined') return;

  try {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) return;

    const userId = session.user.id;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(todayStr);

    let { data: profile, error } = await window.supabaseClient
      .from('profiles')
      .select('current_streak, last_active_date, grace_leaves_left')
      .eq('id', userId)
      .single();

    if (error) return;

    let currentStreak = profile?.current_streak || 0;
    let lastActive = profile?.last_active_date ? profile.last_active_date.split('T')[0] : null;
    let graceLeaves = profile?.grace_leaves_left ?? 3; 

    const lastFireAnimKey = `pm_fire_played_${userId}_${todayStr}`;
    let isNewDayIncrement = false;

    if (lastActive === todayStr) {
      updateUIStreak(currentStreak);
      return;
    }

    if (lastActive) {
      const lastDate = new Date(lastActive);
      const diffTime = Math.abs(todayDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays === 1) {
        currentStreak += 1;
        isNewDayIncrement = true;
        checkMilestoneAlert(currentStreak);
      } else if (diffDays > 1 && diffDays <= 4 && graceLeaves > 0) {
        graceLeaves -= (diffDays - 1);
        if (graceLeaves < 0) graceLeaves = 0;
        currentStreak += 1; 
        isNewDayIncrement = true;
        showGraceWarningNotification(diffDays - 1);
      } else {
        currentStreak = 1;
        graceLeaves = 3; 
        isNewDayIncrement = true;
        showRedWarningNotification();
      }
    } else {
      currentStreak = 1;
      isNewDayIncrement = true;
    }

    // Database update
    await window.supabaseClient
      .from('profiles')
      .update({
        current_streak: currentStreak,
        last_active_date: todayStr,
        grace_leaves_left: graceLeaves
      })
      .eq('id', userId);

    updateUIStreak(currentStreak);

    // Smart Play: Agar naya din hai aur abhi tak animation play nahi hua, toh user interaction ka wait karenge
    if (isNewDayIncrement && !localStorage.getItem(lastFireAnimKey)) {
      const handleFirstInteraction = async () => {
  if (isStreakTriggered) return;
  isStreakTriggered = true;

  const played = await triggerStreakFireEffect();

  if (played) {
    // Sound chal gaya, ab hi "played" mark karo aur listeners hatao
    localStorage.setItem(lastFireAnimKey, 'true');
    window.removeEventListener('click', handleFirstInteraction);
    window.removeEventListener('touchend', handleFirstInteraction);
    window.removeEventListener('keydown', handleFirstInteraction);
  } else {
    // Block hua to agle gesture par dobara try karenge
    isStreakTriggered = false;
  }
};

window.addEventListener('click', handleFirstInteraction);
window.addEventListener('touchend', handleFirstInteraction);  // touchstart nahi
window.addEventListener('keydown', handleFirstInteraction);
    }

  } catch (err) {
    console.warn("Streak sync error:", err);
  }
}

function runFireAnimation() {
  const badgeEl = document.getElementById('streakBadgeTop');
  if (badgeEl) {
    const normalSpan = badgeEl.querySelector('.fire-normal');
    const flippedSpan = badgeEl.querySelector('.fire-flipped');

    if (normalSpan && flippedSpan) {
      let count = 0;
      const flameInterval = setInterval(() => {
        if (normalSpan.style.display === 'none') {
          normalSpan.style.display = 'inline';
          flippedSpan.style.display = 'none';
        } else {
          normalSpan.style.display = 'none';
          flippedSpan.style.display = 'inline';
        }
        count++;
        if (count > 12) {
          clearInterval(flameInterval);
          normalSpan.style.display = 'inline';
          flippedSpan.style.display = 'none';
        }
      }, 150);
    }
  }
}

function triggerStreakFireEffect() {
  runFireAnimation();

  try {
    const audio = new Audio('auth/fire.mp3');
    audio.volume = 0.7;
    return audio.play()
      .then(() => true)
      .catch(e => { console.warn("Fire sound blocked:", e); return false; });
  } catch (err) {
    console.warn("Fire audio error:", err);
    return Promise.resolve(false);
  }
}

function updateUIStreak(streak) {
  const countEl = document.getElementById('streakCountVal');
  const badgeEl = document.getElementById('streakBadgeTop');
  const weekLabelEl = document.getElementById('streakWeekLabel');
  
  if (!countEl || !badgeEl) return;
  countEl.innerText = streak;

  // Original class name 'pm-top-streak-btn' ko barkarar rakhein taaki design na bigde
  badgeEl.className = "pm-top-streak-btn";

  if (streak <= 7) {
    badgeEl.classList.add('week-1');
  } else if (streak <= 14) {
    badgeEl.classList.add('week-2');
  } else if (streak <= 21) {
    badgeEl.classList.add('week-3');
  } else {
    badgeEl.classList.add('week-gold');
  }

  // Agar kabhi weekLabelEl page par hua tabhi text change hoga, warna error nahi aayega
  if (weekLabelEl) {
    if (streak <= 7) {
      weekLabelEl.innerText = "Week 1";
    } else if (streak <= 14) {
      weekLabelEl.innerText = "Week 2";
    } else if (streak <= 21) {
      weekLabelEl.innerText = "Week 3";
    } else {
      weekLabelEl.innerText = "Elite 🌟";
    }
  }
}


function checkMilestoneAlert(streak) {
  if (streak === 7 || streak === 14 || streak === 21) {
    showCustomModal(`🎉 Amazing Milestone!`, `Waaah! Aapne ${streak} din ka continuous streak achieve kar liya hai! Aapka dedication level next-level hai. Keep it up! 🔥`);
  }
}

function showGraceWarningNotification(missedDays) {
  showCustomModal(`🛡️ Streak Saved!`, `Aapne pichhle ${missedDays} din miss kiye the, lekin aapke 3-day grace allowance ki wajah se aapka streak tootne se bach gaya! Padhaai jaari rakhein!`);
}

function showRedWarningNotification() {
  showCustomModal(`⚠️ Streak Reset Warning!`, `Aapne bahut lambe samay se app nahi khola, isliye aapka purana streak reset ho gaya hai. Aaj se nayi shuruat karein aur apna target achieve karein! 🚀`, true);
}
async function openPmStreakModal() {
  if (typeof closeNotifModal === 'function') closeNotifModal();
  if (typeof closeRateModal === 'function') closeRateModal();
  const motPopup = document.getElementById("motivationPopup");
  if (motPopup) motPopup.style.display = "none";

  const modal = document.getElementById('pmStreakModal');
  const numElem = document.getElementById('pmStreakNum');
  const levelBadge = document.getElementById('pmStreakLevelBadge');
  const progressFill = document.getElementById('pmProgressBarFill');
  const progressText = document.getElementById('pmMilestoneProgressText');
  const nextMilestoneEl = document.getElementById('pmNextMilestone');
  
  // Get current streak count value safely
  const currentCount = parseInt(document.getElementById('streakCountVal')?.innerText || '1', 10);
  if (numElem) numElem.innerText = currentCount;

  // Dynamic Level Badge & Next Milestone Calculation
  let nextTarget = 7;
  let levelTitle = "Week 1 Beginner 🌱";
  
  if (currentCount > 21) {
    nextTarget = 30;
    levelTitle = "Elite Legend 🌟";
  } else if (currentCount > 14) {
    nextTarget = 21;
    levelTitle = "Week 3 Master 👑";
  } else if (currentCount > 7) {
    nextTarget = 14;
    levelTitle = "Week 2 Pro 🔥";
  } else {
    nextTarget = 7;
    levelTitle = "Week 1 Warrior ⚡";
  }

  if (levelBadge) levelBadge.innerText = levelTitle;
  if (nextMilestoneEl) nextMilestoneEl.innerText = `${nextTarget} Days`;

  // Progress Bar Percentage Calculation
  const progressPercent = Math.min(Math.round((currentCount % nextTarget || nextTarget) / nextTarget * 100), 100);
  if (progressFill) progressFill.style.width = `${progressPercent}%`;
  if (progressText) progressText.innerText = `${currentCount % nextTarget || nextTarget} / ${nextTarget} Days`;

  // Fix: Sirf utne hi din active honge jitna user ka current streak hai (maximum 7 days tak)
  const todayDayIndex = (new Date().getDay() + 6) % 7; // 0 for Monday, 6 for Sunday
  const dayCircles = document.querySelectorAll('#pmWeekTrackerContainer .pm-day-circle');
  
  dayCircles.forEach((circle, idx) => {
    circle.innerHTML = '';
    circle.classList.remove('active');
    
    // Calculate karein ki yeh din active streak ke andar aata hai ya nahi
    // Jaise agar streak 1 hai, toh sirf aaj ka din active hoga.
    const streakDaysActive = Math.min(currentCount, 7);
    const startActiveIdx = Math.max(0, (todayDayIndex - streakDaysActive + 1));
    
    if (idx >= startActiveIdx && idx <= todayDayIndex) {
      circle.classList.add('active');
      circle.innerHTML = '🔥';
    }
  });

  if (modal) modal.style.display = 'flex';
}

function closePmStreakModal() {
  const modal = document.getElementById('pmStreakModal');
  if (modal) modal.style.display = 'none';
}

function openStreakInfo() {
  showCustomModal("ℹ️ What is a Study Streak?", "Rozana PM Roitx par aakar padhaai karne ya notes/tests access karne par aapka streak count badhta hai. Lagataar padhne se aapka focus aur memory level boost hota hai! 🔥");
}

function shareStreakAchievement() {
  const streakNum = document.getElementById('pmStreakNum')?.innerText || '1';
  const shareText = `🔥 Mera PM Roitx Study Hub par ${streakNum} din ka continuous streak ho gaya hai! Aap bhi apni padhaai shuru karein: https://roitx.dpdns.org/`;
  
  if (navigator.share) {
    navigator.share({
      title: 'PM Roitx Streak Achievement',
      text: shareText,
      url: 'https://roitx.dpdns.org/'
    }).catch(err => console.log('Share canceled', err));
  } else {
    navigator.clipboard.writeText(shareText);
    alert('Streak achievement link copied to clipboard! 🎉');
  }
}
// ---------------------------------------------------------
// HELPER FUNCTIONS FOR MODALS & ALERTS
// ---------------------------------------------------------
function showCustomModal(title, message, isWarning = false) {
  // Purana agar koi custom modal ho toh use hata dein
  let existingModal = document.getElementById('customAlertModal');
  if (existingModal) existingModal.remove();

  const modalHtml = `
    <div id="customAlertModal" class="pm-modal-overlay" style="display: flex; z-index: 99999;">
      <div class="pm-streak-card" style="border-color: ${isWarning ? '#ff4757' : '#00d2ff'}; max-width: 380px; text-align: center;">
        <div style="font-size: 36px; margin-bottom: 10px;">${isWarning ? '⚠️' : '🎉'}</div>
        <h3 style="color: ${isWarning ? '#ff4757' : '#ffb703'}; font-size: 18px; margin-bottom: 10px; font-weight: 700;">${escapeHtml(title)}</h3>
        <p style="color: #cbd5e1; font-size: 13.5px; line-height: 1.5; margin-bottom: 20px;">${escapeHtml(message)}</p>
        <button class="pm-btn-primary" onclick="document.getElementById('customAlertModal').remove()" style="width: 100%;">Theek Hai</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}
// Modal ke baahar background par click karne se modal close karne ka handler
document.addEventListener("DOMContentLoaded", () => {
  const pmStreakModal = document.getElementById("pmStreakModal");
  if (pmStreakModal) {
    pmStreakModal.addEventListener("click", (e) => {
      if (e.target === pmStreakModal) {
        closePmStreakModal();
      }
    });
  }
});

// Aasaan Hisaab ke "We have moved" popup se aane par (?from=rhisab) ek baar swagat dikhao.
// Param turant URL se hata dete hain, taaki refresh par message dobara na aaye.
document.addEventListener("DOMContentLoaded", () => {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("from") !== "rhisab") return;
    url.searchParams.delete("from");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
    if (typeof showToastNotification === "function") {
      showToastNotification("Swagat hai!", "Aasaan Hisaab se aane ke liye shukriya. PM Roitx par aapka swagat hai.", "#");
    }
  } catch (e) {}
});
