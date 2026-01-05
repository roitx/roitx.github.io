// ================= NAVIGATION =================
function goto(page){ 
  window.location.href = page; 
}

// ================= SIDEMENU =================
const sideMenu = document.getElementById("sideMenu");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");  

/* MENU OPEN / CLOSE */
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
  /* ===== DARK / LIGHT MODE ===== */
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
const modalHTML = `
<div id="motModal" class="modal-overlay">
  <div class="glow-modal">
    <p id="motText"></p>
  </div>
</div>`;
document.body.insertAdjacentHTML('beforeend', modalHTML);

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
  "Losers complain. Winners work."
];

function showMotivation() {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  document.getElementById('motText').innerText = quote;
  const modal = document.getElementById('motModal');
  modal.classList.add('modal-active');
  setTimeout(() => modal.classList.remove('modal-active'), 5000);
}

// Close on overlay click
document.getElementById("motModal").addEventListener("click", (e) => {
  if(e.target.id === "motModal") e.target.classList.remove('modal-active');
});

// ================= BACKGROUND CANVAS =================
const c = document.getElementById("bgCanvas");
const ctx = c.getContext("2d");

let dots = [];
function createDots() {
  const numDots = Math.floor(window.innerWidth / 30);
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

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

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

// ================= WAVE BOTTOM =================
const wavePathBottom = document.getElementById("waveBottomPath");
let t = 0;

function animateWave() {
  t += 0.03;
  const waveHeight = 60;
  const amplitude = 16;
  const bottomLimit = 180;
  let d = `M0 ${waveHeight} `;
  for (let x = 0; x <= window.innerWidth; x += 20) {
    let y = waveHeight + Math.sin(x * 0.01 + t) * amplitude;
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
