let fetchedHolidays = {};
let dbEvents = {};
let selectedGotoDateKey = null;
let cur = new Date();
cur.setDate(1);

const observanceDays = {
  "02-14": "Valentine's Day", 
  "03-08": "International Women's Day",
  "05-10": "Mother's Day", 
  "06-21": "Father's Day & Yoga Day",
  "08-02": "Friendship Day", 
  "10-31": "Halloween",
  "11-19": "International Men's Day", 
  "12-25": "Christmas Eve / Day",
  "01-01": "New Year's Day"
};

async function getCurrentUser() {
  if (!window.supabaseClient) return null;
  const { data } = await window.supabaseClient.auth.getUser();
  return data?.user ?? null;
}

async function checkAuthUI() {
  const user = await getCurrentUser();
  const formSection = document.getElementById("eventFormSection");

  if (!user && formSection) {
    formSection.innerHTML = `
      <h3 style="margin:0 0 8px 0; color:#3aa0ff;">📌 Create Personal Event</h3>
      <p style="font-size:12px; margin-bottom:10px;">Login to save your personal schedule.</p>
      <button class="cal-btn" onclick="showLoginPopup()" style="width:100%; background:#7b6bff; color:#fff;">Login Required</button>
    `;
  }
}

function showLoginPopup() {
  showPopup("🔒 Login Required!\n\nPlease login to your account first to add personal events.", "login.html");
}

async function fetchHolidays(year) {
  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`);
    if (!response.ok) return;
    const data = await response.json();
    data.forEach(item => {
      fetchedHolidays[item.date] = item.localName || item.name;
    });
  } catch (err) {
    console.error("Holiday API Error:", err);
  }
}

function checkTodayWishBanner() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayKey = `${yyyy}-${mm}-${dd}`;

  const banner = document.getElementById('holidayWishBanner');
  if (banner) {
    if (fetchedHolidays[todayKey]) {
      banner.textContent = `🎉 Happy ${fetchedHolidays[todayKey]}! Wishing you a fantastic day ahead! ✨`;
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

  // 1. Previous Month Days (Low-Fade & Unclickable)
  for (let i = firstIndex - 1; i >= 0; i--) {
    const d = prevDays - i;
    const prevDate = new Date(year, month - 1, d);
    const el = createDayElement(prevDate, d, todayKey, true);
    daysGrid.appendChild(el);
  }

  // 2. Current Month Days
  for (let d = 1; d <= daysInMonth; d++) {
    const currDate = new Date(year, month, d);
    const el = createDayElement(currDate, d, todayKey, false);
    daysGrid.appendChild(el);
  }

  // 3. Next Month Days (Low-Fade & Unclickable)
  const totalSlots = firstIndex + daysInMonth;
  const nextMonthSlots = (totalSlots > 35) ? 42 - totalSlots : 35 - totalSlots;

  for (let d = 1; d <= nextMonthSlots; d++) {
    const nextDate = new Date(year, month + 1, d);
    const el = createDayElement(nextDate, d, todayKey, true);
    daysGrid.appendChild(el);
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

  // Apply persistent yellow glow if date matches selected date
  if (selectedGotoDateKey && selectedGotoDateKey === dateKey && !isOtherMonth) {
    el.classList.add('goto');
  }

  // TODAY CELL & ROITX BADGE
  if (dateKey === todayKey && !isOtherMonth) {
    el.classList.add('today');
    const badge = document.createElement('div');
    badge.className = 'roitx-center-badge';
    badge.innerText = 'roitx';
    el.appendChild(badge);
  }

  let popups = [];

  // Official Holiday (Bright Red Glow) - includes Sundays
  if (dateObj.getDay() === 0) {
    el.classList.add('holiday');
    el.setAttribute('data-holiday', 'Sunday');
    popups.push("Sunday (Weekly Off)");
  }

  if (fetchedHolidays[dateKey]) {
    el.classList.add('holiday');
    el.setAttribute('data-holiday', fetchedHolidays[dateKey]);
    popups.push(fetchedHolidays[dateKey]);
  } 
  // Special Observance Days (Soft Neon Blue Glow)
  else if (observanceDays[monthDayKey]) {
    el.classList.add('observance-day');
    el.setAttribute('data-holiday', observanceDays[monthDayKey]);
    popups.push(observanceDays[monthDayKey]);
  }

  // Events Check (Purple Glow)
  if (dbEvents[dateKey]) {
    el.classList.add('event-glow');
    dbEvents[dateKey].forEach(ev => {
      popups.push(ev.is_global ? `📢 ${ev.event_name}` : `📌 ${ev.event_name}`);
      const tag = document.createElement('span');
      tag.className = 'event-tag';
      tag.innerText = ev.event_name;
      el.appendChild(tag);
    });
  }

  // Bind click listeners only to active current-month dates
  if (!isOtherMonth && popups.length > 0) {
    el.onclick = () => showPopup(popups.join("\n\n"));
  }

  return el;
}

function renderSideEventList() {
  const list = document.getElementById("eventList");
  if (!list) return;
  list.innerHTML = "";
  let count = 0;

  for (const dateKey in dbEvents) {
    dbEvents[dateKey].forEach(ev => {
      count++;
      const row = document.createElement("div");
      row.className = "mini event-item";
      row.style.marginBottom = "6px";
      row.setAttribute("data-date", dateKey);
      row.innerHTML = `<b>${dateKey}</b><br>${ev.is_global ? '📢' : '📌'} ${ev.event_name}`;
      list.appendChild(row);
    });
  }

  if (count === 0) list.innerHTML = "<div class='mini'><em>No events added yet.</em></div>";
}

async function addEvent() {
  const user = await getCurrentUser();
  if (!user) {
    showLoginPopup();
    return;
  }

  const date = document.getElementById("eventDate").value;
  const name = document.getElementById("eventName").value.trim();
  const msg = document.getElementById("eventMsg");

  if (!date || !name) {
    msg.textContent = "❌ Fill date & name";
    msg.style.color = "#ff6464";
    return;
  }

  const { error } = await window.supabaseClient.from("events").insert([{
    user_id: user.id,
    event_date: date,
    event_name: name,
    is_global: false
  }]);

  if (error) {
    msg.textContent = "❌ " + error.message;
    msg.style.color = "#ff6464";
  } else {
    msg.textContent = "✅ Event added!";
    msg.style.color = "#00ffe4";
    document.getElementById("eventName").value = "";
    render();
  }
}

function showPopup(text, redirectUrl = null) {
  document.getElementById('popupText').innerText = text;
  const popup = document.getElementById('holidayPopup');
  const btn = document.getElementById('popupButton');

  if (redirectUrl) {
    btn.innerText = "Login Now";
    btn.onclick = () => { window.location.href = redirectUrl; };
  } else {
    btn.innerText = "Close";
    btn.onclick = () => closePopup();
  }

  popup.style.display = 'flex';
}

function closePopup() {
  document.getElementById('holidayPopup').style.display = 'none';
}

// Goto Date Event Handler
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
  });
});

document.getElementById('prevBtn').onclick = () => { cur.setMonth(cur.getMonth() - 1); render(); };
document.getElementById('nextBtn').onclick = () => { cur.setMonth(cur.getMonth() + 1); render(); };
document.getElementById('todayBtn').onclick = () => { 
  selectedGotoDateKey = null;
  cur = new Date(); 
  cur.setDate(1); 
  render(); 
};

document.addEventListener("DOMContentLoaded", () => {
  checkAuthUI();
  const today = new Date().toISOString().split("T")[0];
  const dateInp = document.getElementById("eventDate");
  if (dateInp) dateInp.value = today;
  render();
});
