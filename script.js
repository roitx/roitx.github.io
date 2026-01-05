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
  "Believe in yourself, even when no one else does!"
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
  setTimeout(() => popup.style.display = "none", 5000);
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
