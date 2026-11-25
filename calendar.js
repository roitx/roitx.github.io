const ICONS = {"pin": "<path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>", "megaphone": "<polygon points=\"11 5 6 9 2 9 2 15 6 15 11 19 11 5\"/><path d=\"M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07\"/>", "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/>", "bar": "<line x1=\"18\" y1=\"20\" x2=\"18\" y2=\"10\"/><line x1=\"12\" y1=\"20\" x2=\"12\" y2=\"4\"/><line x1=\"6\" y1=\"20\" x2=\"6\" y2=\"14\"/>", "sun": "<circle cx=\"12\" cy=\"12\" r=\"5\"/><line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"3\"/><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"23\"/><line x1=\"4.22\" y1=\"4.22\" x2=\"5.64\" y2=\"5.64\"/><line x1=\"18.36\" y1=\"18.36\" x2=\"19.78\" y2=\"19.78\"/><line x1=\"1\" y1=\"12\" x2=\"3\" y2=\"12\"/><line x1=\"21\" y1=\"12\" x2=\"23\" y2=\"12\"/><line x1=\"4.22\" y1=\"19.78\" x2=\"5.64\" y2=\"18.36\"/><line x1=\"18.36\" y1=\"5.64\" x2=\"19.78\" y2=\"4.22\"/>", "calendar": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"/><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"/><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"/><line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"/>", "download": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/>", "keyboard": "<rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"2\"/><path d=\"M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10\"/>", "lock": "<rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>", "check": "<polyline points=\"20 6 9 17 4 12\"/>", "x": "<line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/>", "star": "<polygon points=\"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2\"/>", "gift": "<polyline points=\"20 12 20 22 4 22 4 12\"/><rect x=\"2\" y=\"7\" width=\"20\" height=\"5\"/><line x1=\"12\" y1=\"22\" x2=\"12\" y2=\"7\"/><path d=\"M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z\"/><path d=\"M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z\"/>", "flag": "<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\"/><line x1=\"4\" y1=\"22\" x2=\"4\" y2=\"15\"/>", "bell": "<path d=\"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9\"/><path d=\"M13.73 21a2 2 0 0 1-3.46 0\"/>", "left": "<polyline points=\"15 18 9 12 15 6\"/>", "right": "<polyline points=\"9 18 15 12 9 6\"/>", "back": "<line x1=\"19\" y1=\"12\" x2=\"5\" y2=\"12\"/><polyline points=\"12 19 5 12 12 5\"/>", "help": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\"/><line x1=\"12\" y1=\"17\" x2=\"12.01\" y2=\"17\"/>", "plus": "<line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/>", "trash": "<polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6\"/><path d=\"M10 11v6M14 11v6\"/><path d=\"M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2\"/>"};
function ico(name, size) {
  const s = size ? ` style="width:${size}px;height:${size}px"` : '';
  return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${s} aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

window.fetchedHolidays = {};
let fetchedHolidays = window.fetchedHolidays;

let dbEvents = {};
let selectedGotoDateKey = null;
let cur = new Date();
cur.setDate(1);

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

// 1. Session-based User Fetch
async function getCurrentUser() {
  if (!window.supabaseClient) return null;
  try {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    return session ? session.user : null;
  } catch (e) {
    console.error("Auth session fetch error:", e);
    return null;
  }
}

// 2. Auth UI & Add Event Button Toggle
async function checkAuthUI() {
  const user = await getCurrentUser();
  const formSection = document.getElementById("eventFormSection");

  if (!formSection) return;

  if (!user) {
    formSection.innerHTML = `
      <h3 style="margin:0 0 8px 0; color:#3aa0ff;">${ico('pin')} Personal Events</h3>
      <p style="font-size:12px; margin-bottom:10px;">Login to create & save your personal schedule.</p>
      <button class="cal-btn" onclick="showLoginPopup()" style="width:100%; background:#7b6bff; color:#fff;">Login Required</button>
    `;
  } else {
    formSection.innerHTML = `
      <button id="toggleFormBtn" class="cal-btn" onclick="toggleEventForm()" style="width:100%; background:var(--accent); color:#fff; font-weight:bold;">${ico('plus')} Add Personal Event</button>
      
      <div id="eventFormFields" style="display:none; margin-top:12px;">
        <h3 style="margin:0 0 8px 0; color:#3aa0ff;">${ico('pin')} Create Personal Event</h3>
        <input type="date" id="eventDate" class="event-input" style="width:100%; margin-bottom:6px;">
        <input type="text" id="eventName" class="event-input" placeholder="Event Name" style="width:100%; margin-bottom:6px;">
        
        <div style="display:flex; gap:6px;">
          <button class="cal-btn" onclick="addEvent()" style="flex:1; background:var(--accent); color:#fff;">${ico('check')} Save Event</button>
          <button class="cal-btn" onclick="toggleEventForm()" style="background:#ff4d4d; color:#fff;">${ico('x')} Cancel</button>
        </div>
        <div id="eventMsg" style="margin-top:6px; font-size:12px;"></div>
      </div>
    `;
    const today = new Date().toISOString().split("T")[0];
    const dateInp = document.getElementById("eventDate");
    if (dateInp) dateInp.value = today;
  }
}

function toggleEventForm() {
  const fields = document.getElementById("eventFormFields");
  const btn = document.getElementById("toggleFormBtn");
  if (!fields || !btn) return;

  if (fields.style.display === "none") {
    fields.style.display = "block";
    btn.style.display = "none";
  } else {
    fields.style.display = "none";
    btn.style.display = "block";
  }
}

function showLoginPopup() {
  sessionStorage.setItem("redirect_after_login", window.location.href);
  showPopup("Login Required!\n\nPlease login to your account first to add personal events.", "login.html", "lock");
}

// Google Calendar API Integration
const GOOGLE_API_KEY = "AIzaSyC7sf9ZgjLqIos3BEx0uR2_7ytoS-oDgwo";
const INDIAN_HOLIDAY_CALENDAR_ID = "en.indian#holiday@group.v.calendar.google.com";

async function fetchHolidays(year) {
  const timeMin = new Date(`${year}-01-01T00:00:00Z`).toISOString();
  const timeMax = new Date(`${year}-12-31T23:59:59Z`).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(INDIAN_HOLIDAY_CALENDAR_ID)}/events?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&maxResults=2500`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error("Google API Error Code:", data.error?.code, "| Message:", data.error?.message);
      return;
    }

    if (data.items) {
      data.items.forEach(item => {
        const holidayDate = item.start.date || (item.start.dateTime ? item.start.dateTime.split("T")[0] : null);
        if (holidayDate) {
          fetchedHolidays[holidayDate] = item.summary;
        }
      });
    }
  } catch (err) {
    console.error("Fetch Network Error:", err);
  }
}

// GLOBAL EXPORT FOR CHAT SYSTEM
window.fetchHolidays = fetchHolidays;

function checkTodayWishBanner() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayKey = `${yyyy}-${mm}-${dd}`;

  const banner = document.getElementById('holidayWishBanner');
  if (banner) {
    if (fetchedHolidays[todayKey]) {
      banner.innerHTML = `${ico('gift', 18)} Happy ${esc(fetchedHolidays[todayKey])}! Wishing you a fantastic day ahead! ${ico('star', 16)}`;
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  }
}

async function fetchEventsForRange(startDate, endDate) {
  dbEvents = {};
  if (!window.supabaseClient) return;

  try {
    const user = await getCurrentUser();
    let query = window.supabaseClient.from("events").select("*")
      .gte("event_date", startDate)
      .lte("event_date", endDate);

    if (user) {
      query = query.or(`user_id.eq.${user.id},is_global.eq.true`);
    } else {
      query = query.eq("is_global", true);
    }

    const { data, error } = await query;
    if (!error && data) {
      data.forEach(ev => {
        if (!dbEvents[ev.event_date]) dbEvents[ev.event_date] = [];
        dbEvents[ev.event_date].push(ev);
      });
    }
  } catch (e) {
    console.error("DB Event Error:", e);
  }
}

async function render() {
  const daysGrid = document.getElementById('daysGrid');
  const title = document.getElementById('calTitle');

  if (!daysGrid || !title) return;

  const year = cur.getFullYear();
  const month = cur.getMonth();

  const rangeStart = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const rangeEnd = new Date(year, month + 2, 0).toISOString().split("T")[0];

  await Promise.all([
    fetchHolidays(year),
    fetchHolidays(year - 1),
    fetchHolidays(year + 1),
    fetchEventsForRange(rangeStart, rangeEnd)
  ]);

  checkTodayWishBanner();

  daysGrid.innerHTML = '';
  title.textContent = cur.toLocaleString('default', { month: 'long', year: 'numeric' });

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const firstIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  for (let i = firstIndex - 1; i >= 0; i--) {
    const d = prevDays - i;
    const prevDate = new Date(year, month - 1, d);
    daysGrid.appendChild(createDayElement(prevDate, d, todayKey, true));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const currDate = new Date(year, month, d);
    daysGrid.appendChild(createDayElement(currDate, d, todayKey, false));
  }

  const totalSlots = firstIndex + daysInMonth;
  const nextMonthSlots = (totalSlots > 35) ? 42 - totalSlots : 35 - totalSlots;

  for (let d = 1; d <= nextMonthSlots; d++) {
    const nextDate = new Date(year, month + 1, d);
    daysGrid.appendChild(createDayElement(nextDate, d, todayKey, true));
  }

  renderSideEventList();
}

function createDayElement(dateObj, displayDate, todayKey, isOtherMonth) {
  const el = document.createElement('div');
  el.className = isOtherMonth ? 'day other-month' : 'day';

  const y = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(displayDate).padStart(2, '0');
  const dateKey = `${y}-${mm}-${dd}`;
  const monthDayKey = `${mm}-${dd}`;

  el.setAttribute("data-date-key", dateKey);
  el.innerHTML = `<div class="date">${displayDate}</div>`;

  if (selectedGotoDateKey && selectedGotoDateKey === dateKey && !isOtherMonth) {
    el.classList.add('goto');
  }

  if (dateKey === todayKey && !isOtherMonth) {
    el.classList.add('today');
    const badge = document.createElement('div');
    badge.className = 'roitx-center-badge';
    badge.innerText = 'roitx';
    el.appendChild(badge);
  }

  let popupInfoList = [];

  if (dateObj.getDay() === 0) {
    el.classList.add('holiday');
    el.setAttribute('data-holiday', 'Sunday');
    popupInfoList.push({ type: 'holiday', text: "Sunday (Weekly Off)" });
  }

  if (fetchedHolidays[dateKey]) {
    el.classList.add('holiday');
    el.setAttribute('data-holiday', fetchedHolidays[dateKey]);
    popupInfoList.push({ type: 'holiday', text: fetchedHolidays[dateKey] });
  } 
  else if (observanceDays[monthDayKey]) {
    el.classList.add('observance-day');
    el.setAttribute('data-holiday', observanceDays[monthDayKey]);
    popupInfoList.push({ type: 'observance', text: observanceDays[monthDayKey] });
  }

  if (!isOtherMonth && fetchedHolidays[dateKey] && [1, 5].includes(dateObj.getDay())) {
    const lwb = document.createElement('span');
    lwb.className = 'lw-badge';
    lwb.title = 'Long weekend';
    lwb.innerHTML = ico('sun', 14);
    el.appendChild(lwb);
  }

  if (dbEvents[dateKey]) {
    el.classList.add('event-glow');
    dbEvents[dateKey].forEach(ev => {
      popupInfoList.push({ 
        type: 'event', 
        text: ev.event_name,
        icon: ev.is_global ? 'megaphone' : 'pin',
        id: ev.id,
        is_global: ev.is_global,
        user_id: ev.user_id
      });
      const tag = document.createElement('span');
      tag.className = 'event-tag';
      tag.innerText = ev.event_name;
      el.appendChild(tag);
    });
  }

  if (!isOtherMonth && popupInfoList.length > 0) {
    el.onclick = () => showInteractivePopup(popupInfoList, dateKey);
  }

  return el;
}

/* ===================== NEW FEATURES ===================== */
const pad2 = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function daysLabel(n) {
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return `${n} days`;
}

// Aaj se aage ke holidays + observances (400 din tak)
function getUpcomingSpecial() {
  const now = new Date();
  const out = [];
  for (let i = 0; i <= 400; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const k = keyOf(d);
    const official = fetchedHolidays[k];
    const name = official || observanceDays[`${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`];
    if (name) out.push({ key: k, date: d, name, official: !!official, days: i });
  }
  return out;
}

function getLongWeekends(year, month) {
  const res = [];
  Object.keys(fetchedHolidays).forEach(k => {
    const d = fromKey(k);
    if (d.getFullYear() === year && d.getMonth() === month && [1, 5].includes(d.getDay())) {
      res.push({ key: k, name: fetchedHolidays[k], day: d.getDay() === 5 ? 'Fri–Sun' : 'Sat–Mon' });
    }
  });
  return res.sort((a, b) => a.key.localeCompare(b.key));
}

function renderSideEventList() {
  const list = document.getElementById("eventList");
  if (!list) return;

  const year = cur.getFullYear();
  const month = cur.getMonth();
  const upcoming = getUpcomingSpecial();
  const nextOfficial = upcoming.find(u => u.official && u.days >= 0);
  let html = '';

  // 1. Next holiday countdown
  if (nextOfficial) {
    html += `<div class="side-card countdown-card up-item" data-key="${nextOfficial.key}">
      <div class="cd-label">${ico('clock', 14)} Next Holiday</div>
      <div class="cd-name">${esc(nextOfficial.name)}</div>
      <div class="cd-days">${daysLabel(nextOfficial.days)}</div>
    </div>`;
  }

  // 2. Month overview
  const prefix = `${year}-${pad2(month + 1)}-`;
  const holidayCount = Object.keys(fetchedHolidays).filter(k => k.startsWith(prefix)).length;
  const eventCount = Object.keys(dbEvents).filter(k => k.startsWith(prefix)).reduce((n, k) => n + dbEvents[k].length, 0);
  let sundays = 0;
  for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) if (new Date(year, month, d).getDay() === 0) sundays++;
  const lw = getLongWeekends(year, month);

  html += `<div class="side-card">
    <h4>${ico('bar')} This Month</h4>
    <div class="stat-row">
      <div class="stat"><b style="color:#ff6b6b">${holidayCount}</b><span>Holidays</span></div>
      <div class="stat"><b style="color:#ffc107">${sundays}</b><span>Sundays</span></div>
      <div class="stat"><b style="color:#a48aff">${eventCount}</b><span>Events</span></div>
    </div>
    ${lw.length ? `<div class="lw-list">${lw.map(l => `<div class="up-item" data-key="${l.key}">${ico('sun', 14)} <b>${l.day}</b> long weekend · ${esc(l.name)}</div>`).join('')}</div>` : ''}
  </div>`;

  // 3. Upcoming list
  const next5 = upcoming.filter(u => u.days > 0 || !nextOfficial || u.key !== nextOfficial.key).slice(0, 5);
  if (next5.length) {
    html += `<div class="side-card"><h4>${ico('calendar')} Upcoming</h4>${next5.map(u => `
      <div class="up-item up-row" data-key="${u.key}">
        <span class="up-dot" style="background:${u.official ? '#ff4d4d' : '#00f2fe'}"></span>
        <span class="up-name">${esc(u.name)}</span>
        <span class="up-when">${u.days === 0 ? 'Today' : u.days === 1 ? 'Tmrw' : u.days + 'd'}</span>
      </div>`).join('')}</div>`;
  }

  // 4. Tools
  html += `<div class="side-card"><div class="kbd-hint">${ico('keyboard', 14)} <kbd>←</kbd> <kbd>→</kbd> month · <kbd>T</kbd> today · swipe on mobile</div></div>`;

  list.innerHTML = html;
}

// Upcoming / countdown item par click -> us date par jump + popup (existing gotoDate handler reuse)
document.getElementById('eventList')?.addEventListener('click', e => {
  const item = e.target.closest('.up-item');
  if (!item) return;
  const g = document.getElementById('gotoDate');
  if (!g) return;
  g.value = item.dataset.key;
  g.dispatchEvent(new Event('change'));
});

// Export current month as .ics (Google/Apple Calendar mein import hota hai)
function exportMonthICS() {
  const y = cur.getFullYear(), m = cur.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  const ics = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Roitx Calendar//EN', 'CALSCALE:GREGORIAN'];
  let n = 0;

  for (let d = 1; d <= last; d++) {
    const k = keyOf(new Date(y, m, d));
    const names = [];
    if (fetchedHolidays[k]) names.push(fetchedHolidays[k]);
    else if (observanceDays[`${pad2(m + 1)}-${pad2(d)}`]) names.push(observanceDays[`${pad2(m + 1)}-${pad2(d)}`]);
    (dbEvents[k] || []).forEach(ev => names.push(ev.event_name));

    names.forEach(name => {
      lines.push('BEGIN:VEVENT',
        `UID:roitx-${k}-${n++}@roitx.dpdns.org`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${k.replace(/-/g, '')}`,
        `DTEND;VALUE=DATE:${keyOf(new Date(y, m, d + 1)).replace(/-/g, '')}`,
        `SUMMARY:${ics(name)}`,
        'END:VEVENT');
    });
  }
  lines.push('END:VCALENDAR');

  if (!n) { showPopup('Is mahine mein export karne ke liye koi holiday ya event nahi hai.'); return; }

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `roitx-calendar-${y}-${pad2(m + 1)}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
window.exportMonthICS = exportMonthICS;

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (['input', 'textarea', 'select'].includes(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.getElementById('holidayPopup')?.style.display === 'flex') {
    if (e.key === 'Escape') closePopup();
    return;
  }
  if (e.key === 'ArrowLeft') document.getElementById('prevBtn')?.click();
  else if (e.key === 'ArrowRight') document.getElementById('nextBtn')?.click();
  else if (e.key === 't' || e.key === 'T') document.getElementById('todayBtn')?.click();
});

// Swipe left/right on mobile to change month
(function () {
  const grid = document.getElementById('daysGrid');
  if (!grid) return;
  let sx = 0, sy = 0;
  grid.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  grid.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 40) {
      document.getElementById(dx < 0 ? 'nextBtn' : 'prevBtn')?.click();
    }
  }, { passive: true });
})();

async function addEvent() {
  const user = await getCurrentUser();
  if (!user) {
    showLoginPopup();
    return;
  }

  const dateInp = document.getElementById("eventDate");
  const nameInp = document.getElementById("eventName");
  const msg = document.getElementById("eventMsg");

  if (!dateInp || !nameInp) return;

  const date = dateInp.value;
  const name = nameInp.value.trim();

  if (!date || !name) {
    if (msg) {
      msg.innerHTML = ico("x", 14) + " Fill date & name";
      msg.style.color = "#ff6464";
    }
    return;
  }

  const { error } = await window.supabaseClient.from("events").insert([{
    user_id: user.id,
    event_date: date,
    event_name: name,
    is_global: false
  }]);

  if (error) {
    if (msg) {
      msg.innerHTML = ico("x", 14) + " " + esc(error.message);
      msg.style.color = "#ff6464";
    }
  } else {
    if (msg) {
      msg.innerHTML = ico("check", 14) + " Event added!";
      msg.style.color = "#00ffe4";
    }
    nameInp.value = "";
    toggleEventForm();
    render();
  }
}

async function deleteEvent(eventId) {
  if (!confirm("Kya aap is personal event ko delete karna chahte hain?")) return;
  
  const { error } = await window.supabaseClient.from("events").delete().eq("id", eventId);
  if (error) {
    alert("Delete failed: " + error.message);
  } else {
    closePopup();
    render();
  }
}

async function showInteractivePopup(infoList, dateKey) {
  const popupText = document.getElementById('popupText');
  const popup = document.getElementById('holidayPopup');
  const btn = document.getElementById('popupButton');
  const user = await getCurrentUser();

  if (!popupText || !popup || !btn) return;

  clearPopupExtras();
  const ttl = document.getElementById('popupTitle');
  if (ttl) ttl.innerHTML = ico('calendar') + ' Day Details';
  popupText.innerHTML = `<b style="color:#3aa0ff; font-size:16px;">Date: ${esc(dateKey)}</b><br><br>`;

  infoList.forEach(info => {
    const item = document.createElement("div");
    item.style.cssText = "margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;";

    const iName = info.icon || (info.type === 'holiday' ? 'flag' : info.type === 'observance' ? 'star' : 'pin');
    item.innerHTML = `<span style="font-size:14px; display:flex; gap:8px; align-items:center; text-align:left;">${ico(iName, 16)}<span>${esc(info.text)}</span></span>`;

    if (info.type === 'event' && user && info.user_id === user.id && !info.is_global) {
      const delBtn = document.createElement("button");
      delBtn.innerHTML = ico("trash", 13) + " Delete";
      delBtn.style.cssText = "display:inline-flex; gap:4px; align-items:center; flex-shrink:0; margin-left:8px; background:#ff4d4d; color:#fff; border:none; padding:3px 8px; border-radius:4px; cursor:pointer; font-size:12px;";
      delBtn.onclick = () => deleteEvent(info.id);
      item.appendChild(delBtn);
    }

    popupText.appendChild(item);
  });

  btn.innerText = "Close";
  btn.onclick = () => closePopup();

  popup.style.display = 'flex';
}

function showPopup(text, redirectUrl = null, icon = 'bell') {
  const popupText = document.getElementById('popupText');
  const popup = document.getElementById('holidayPopup');
  const btn = document.getElementById('popupButton');

  if (!popupText || !popup || !btn) return;

  clearPopupExtras();
  const ttl = document.getElementById('popupTitle');
  if (ttl) ttl.innerHTML = ico(icon) + ' Notification';
  popupText.innerText = text;

  if (redirectUrl) {
    btn.innerText = "Login Now";
    btn.onclick = () => { window.location.href = redirectUrl; };
  } else {
    btn.innerText = "Close";
    btn.onclick = () => closePopup();
  }

  popup.style.display = 'flex';
}

function clearPopupExtras() {
  document.getElementById('popupCancel')?.remove();
}

function showConfirm(text, onYes, icon = 'help', yesLabel = 'Haan') {
  const popupText = document.getElementById('popupText');
  const popup = document.getElementById('holidayPopup');
  const btn = document.getElementById('popupButton');
  const ttl = document.getElementById('popupTitle');
  if (!popupText || !popup || !btn) return;

  clearPopupExtras();
  if (ttl) ttl.innerHTML = ico(icon) + ' Confirm';
  popupText.innerText = text;

  btn.innerText = yesLabel;
  btn.onclick = () => { closePopup(); onYes(); };

  const no = document.createElement('button');
  no.id = 'popupCancel';
  no.className = 'secondary';
  no.textContent = 'Nahi';
  no.onclick = closePopup;
  btn.insertAdjacentElement('afterend', no);

  popup.style.display = 'flex';
}

function confirmExport() {
  showConfirm('Kya aap export krna chahte hain?\n\nIs mahine ke holidays aur events .ics file mein download honge.', exportMonthICS, 'download', 'Haan, export karo');
}
window.confirmExport = confirmExport;

function closePopup() {
  clearPopupExtras();
  const popup = document.getElementById('holidayPopup');
  if (popup) popup.style.display = 'none';
}

document.getElementById('gotoDate')?.addEventListener('change', function() {
  const dateVal = this.value;
  if (!dateVal) return;

  const parts = dateVal.split("-");
  const yyyy = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10) - 1;
  const dd = parseInt(parts[2], 10);

  selectedGotoDateKey = dateVal;
  cur = new Date(yyyy, mm, 1);

  render().then(() => {
    const targetCell = document.querySelector(`.day[data-date-key="${selectedGotoDateKey}"]:not(.other-month)`);
    if (targetCell) {
      targetCell.classList.add('goto');
      targetCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // --- YE NAYA CODE POPUP DIRECT TRIGGER KAREGA ---
    const targetDateObj = new Date(yyyy, mm, dd);
    const mmStr = String(mm + 1).padStart(2, '0');
    const ddStr = String(dd).padStart(2, '0');
    const monthDayKey = `${mmStr}-${ddStr}`;

    let popupInfoList = [];

    // Check Sunday
    if (targetDateObj.getDay() === 0) {
      popupInfoList.push({ type: 'holiday', text: "Sunday (Weekly Off)" });
    }

    // Check Google Holiday
    if (fetchedHolidays[dateVal]) {
      popupInfoList.push({ type: 'holiday', text: fetchedHolidays[dateVal] });
    } 
    // Check Observance Day
    else if (observanceDays[monthDayKey]) {
      popupInfoList.push({ type: 'observance', text: observanceDays[monthDayKey] });
    }

    // Check DB Events
    if (dbEvents[dateVal]) {
      dbEvents[dateVal].forEach(ev => {
        popupInfoList.push({ 
          type: 'event', 
          text: ev.event_name,
        icon: ev.is_global ? 'megaphone' : 'pin',
          id: ev.id,
          is_global: ev.is_global,
          user_id: ev.user_id
        });
      });
    }

    // Agar us din koi holiday, observance ya event hoga toh popup direct khul jayega
    if (popupInfoList.length > 0) {
      showInteractivePopup(popupInfoList, dateVal);
    }
  });
});


const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const todayBtn = document.getElementById('todayBtn');

if (prevBtn) prevBtn.onclick = () => { cur.setMonth(cur.getMonth() - 1); render(); };
if (nextBtn) nextBtn.onclick = () => { cur.setMonth(cur.getMonth() + 1); render(); };
if (todayBtn) todayBtn.onclick = () => { 
  selectedGotoDateKey = null;
  cur = new Date(); 
  cur.setDate(1); 
  render(); 
};

// Auto Auth Sync
document.addEventListener("DOMContentLoaded", async () => {
  await checkAuthUI();

  /* ---------------------------------------------------------
     MINI PREVIEW -> FULL SCREEN: month, selected date aur
     adhoora bhara event form wahi se continue
     --------------------------------------------------------- */
  if (window.Mini) {
    Mini.onSnapshot(() => {
      const fields = document.getElementById("eventFormFields");
      const dInp = document.getElementById("eventDate");
      const nInp = document.getElementById("eventName");
      const gInp = document.getElementById("gotoDate");
      return {
        y: cur.getFullYear(),
        m: cur.getMonth(),
        goto: selectedGotoDateKey,
        gotoVal: gInp ? gInp.value : "",
        formOpen: !!fields && fields.style.display !== "none",
        evDate: dInp ? dInp.value : "",
        evName: nInp ? nInp.value : ""
      };
    });

    const saved = Mini.take();
    if (saved) {
      if (Number.isInteger(saved.y) && Number.isInteger(saved.m)) cur = new Date(saved.y, saved.m, 1);
      selectedGotoDateKey = saved.goto || null;

      const gInp = document.getElementById("gotoDate");
      if (gInp && saved.gotoVal) gInp.value = saved.gotoVal;

      // Form sirf logged-in user ko dikhta hai (checkAuthUI ne bana diya hoga)
      const fields = document.getElementById("eventFormFields");
      const toggleBtn = document.getElementById("toggleFormBtn");
      if (fields) {
        const dInp = document.getElementById("eventDate");
        const nInp = document.getElementById("eventName");
        if (dInp && saved.evDate) dInp.value = saved.evDate;
        if (nInp && saved.evName) nInp.value = saved.evName;
        if (saved.formOpen || saved.evName) {
          fields.style.display = "block";
          if (toggleBtn) toggleBtn.style.display = "none";
        }
      }
    }
  }

  render();

  if (window.supabaseClient) {
    window.supabaseClient.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        await checkAuthUI();
        render();
      }
    });
  }
});
