// ================= NAVIGATION =================
function goto(page){ 
  window.location.href = page; 
}

// ================= SIDEMENU =================
const sideMenu = document.querySelector(".side-menu");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");  

menuBtn.addEventListener("click", () => {
  sideMenu.classList.toggle("open");
  overlay.classList.toggle("show");
});

overlay.addEventListener("click", () => {
  sideMenu.classList.remove("open");
  overlay.classList.remove("show");
});

// ================= DOM LOADED =================
document.addEventListener("DOMContentLoaded", () => {
  // Dark / Light Mode
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
});

// ================= YEAR =================
document.getElementById("year").textContent = new Date().getFullYear();

// ================= MOTIVATION POPUP =================
const quotes = [
 "Success = Consistency × Hard Work!",
"Winners are not born, they are built!",
"Focus on progress, not perfection!",
"Work in silence, let success make the noise!",
"Every expert was once a beginner!",
"Small steps every day lead to big results!",
"Stop doubting yourself, work hard and make it happen!",
"Discipline beats motivation every time!",
"Your only limit is your mind!",
"If it was easy, everyone would do it!",
"Dream big. Start small. Act now!",
"Don't stop until you're proud!",
"You don't need to be perfect — just be consistent!",
"The best view comes after the hardest climb!",
"It's never too late to start again!",
"Your future is created by what you do today!",
"Push yourself. Because no one else will!",
"Stay focused. Stay determined. Stay hungry!",
"A little progress each day adds up to big results!",
"Believe in yourself, even when no one else does!",
"Your grind will pay off — trust the process!",
"Don't wait for motivation — create discipline!",
"Learn from yesterday. Work for today. Plan for tomorrow!",
"Focus on your goals, not people.",
"Failure is not opposite of success — it’s part of it!",
"Success starts with self-discipline!",
"Do something today that your future self will thank you for!",
"Make yourself a priority!",
"Study now so life becomes easy later!",
"The harder you work, the luckier you get!",
"You only fail when you stop trying!",
"Don't compare yourself to others — compare with old you!",
"Win in silence so no one can destroy your success!",
"You are stronger than your excuses!",
"Champions keep going even when they are tired!",
"You don’t need a perfect plan, just start!",
"Be addicted to improvement!",
"Dreams don't work unless you do!",
"The moment you feel like quitting is when you must keep going!",
"You are built for greatness!",
"Keep studying — the results are loading!",
"Nothing changes if nothing changes!",
"Do it for the version of you who never gave up!",
"Let your success make the noise!",
"Excuses make today easy but tomorrow hard.",
"Hard work makes today hard but tomorrow easy.",
"Hustle until your haters ask if you're hiring!",
"Stay low, work hard and surprise everyone!",
"You are one decision away from a totally different life!",
"If you're not willing to learn, no one can help you.",
"Be better than you were yesterday!",
"Sacrifice now or regret later — your choice!",
"Losers complain. Winners work.",
"Your success is your responsibility!",
"You have no competition when you focus on yourself!",
"When you feel lazy, remember your goals!",
"Don't wish for it — work for it!",
"Prove yourself to yourself!",
"Success begins with a single step!",
"Make your parents proud!",
"Grow through what you go through!",
"Don't stop when you're tired — stop when you're done!",
"Work until you no longer have to introduce yourself!",
"Pain is temporary, pride is forever!",
"Your habits decide your future!",
"You become what you do daily!",
"Your success will silence them!",
"Time is limited — don’t waste it!",
"Only dead fish go with the flow!",
"Be the hardest worker in the room!",
"The only bad study session is the one you didn’t do!",
"Winners focus on winning, losers focus on winners!",
"Suffer the pain of discipline or suffer the pain of regret!",
"Consistency creates champions!",
"Be the student who wants A+, not the one who wants shortcuts.",
"Kill your excuses before they kill your dreams!",
"Get comfortable being uncomfortable!",
"Success hits different when no one believed in you!",
"Grind in private. Shine in public!",
"Never beg for results — work for them!",
"The world is yours if you're willing to work for it!",
"Wasting time is the biggest disrespect to your future!",
"Stay disciplined — motivation will follow!",
"Set goals. Crush them. Repeat!",
"The road to success is always under construction!",
"If you want something you never had, do something you've never done!",
"You can’t have a million-dollar dream with a lazy mindset!",
"Don't be afraid to start over — it's a new chance!",
"One day or day one — you decide!",
"Study hard so your future self lives better!",
"Be unstoppable — like time!",
"Results require action, not wishes!",
"You are closer than you think — keep going!",
"You were born to win — don’t quit now!",
"You don’t need motivation daily — just consistency!",
"Every minute you study adds power to your future!",
"Give your best today — tomorrow depends on it!",
"You can discipline yourself or disappoint yourself!",
"The grind never ends — only improves!",
"Make yourself someone you’d be proud of!",
];

// Create popup HTML
const popupHTML = `
<div class="popup" id="motivationPopup">
  <div class="popup-content">
    <p id="motivationText"></p>
  </div>
</div>`;
document.body.insertAdjacentHTML("beforeend", popupHTML);

function showMotivation() {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  document.getElementById("motivationText").textContent = quote;
  const popup = document.getElementById("motivationPopup");
  popup.style.display = "flex";
  setTimeout(() => popup.style.display = "none", 7000);
}

// Close popup when clicking outside content
document.getElementById("motivationPopup").addEventListener("click", e => {
  if(e.target.id === "motivationPopup") e.target.style.display = "none";
});
// ================= CANVAS STARS BACKGROUND =================
const c = document.getElementById("bgCanvas");
const ctx = c.getContext("2d");

// Create dots (stars)
let dots = [];
function createDots() {
  const numDots = Math.floor(window.innerWidth / 25); // adjust density
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

// Resize canvas
function resizeCanvas() {
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  createDots();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Animate stars
function animateDots() {
  ctx.clearRect(0, 0, c.width, c.height);
  dots.forEach(d => {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fill();
    d.x += d.dx;
    d.y += d.dy;
    if (d.x < 0 || d.x > c.width) d.dx *= -1;
    if (d.y < 0 || d.y > c.height) d.dy *= -1;
  });
  requestAnimationFrame(animateDots);
}
animateDots();

// ================= FULL-WIDTH CINEMATIC WAVE =================
const wavePathBottom = document.getElementById("waveBottomPath");
let t = 0;

function animateWave() {
  t += 0.015; // speed of wave animation

  const waveHeight = 120;     // base height (higher than before)
  const amplitude1 = 18;      // primary wave
  const amplitude2 = 10;      // secondary wave
  const frequency1 = 0.007;   // controls wavelength
  const frequency2 = 0.014;
  const bottomLimit = 220;    // bottom padding

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
// ================= APP LOAD EFFECT =================
window.addEventListener("load", () => {
  document.body.classList.add("app-loaded");
});
