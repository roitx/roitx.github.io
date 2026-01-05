// NAVIGATION 
function goto(page){ window.location.href = page; }

// SIDEMENU

const sideMenu = document.getElementById("sideMenu");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");  

/* MENU OPEN */
menuBtn.addEventListener("click", () => {
  sideMenu.classList.toggle("open");
  overlay.classList.toggle("show");
});

/* MENU CLOSE by overlay tap */
overlay.addEventListener("click", () => {
  sideMenu.classList.remove("open");
  overlay.classList.remove("show");
});

// ========= DOM LOADED =========
document.addEventListener("DOMContentLoaded", () => {

  /* ===== DARK / LIGHT MODE ===== */
  const modeToggle = document.getElementById("modeToggle");

  if (modeToggle) {
    // load saved mode
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.body.classList.add("light");
      modeToggle.checked = true;
    }

    // toggle on change
    modeToggle.addEventListener("change", () => {
      document.body.classList.toggle("light", modeToggle.checked);
      localStorage.setItem(
        "theme",
        modeToggle.checked ? "light" : "dark"
      );
    });
  }

});
// YEAR
document.getElementById("year").textContent = new Date().getFullYear();

// MOTIVATION
const modalHTML = `
<div id="motModal" class="modal-overlay">
  <div class="glow-modal">
    <p id="motText"></p>
    <button class="close-btn" onclick="closeMot()">Close</button>
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
"Winners are not born, they are built!",
"Focus on progress, not perfection!",
"Small steps every day = big success!",
"Discipline beats motivation every time!",
"Your only limit is your mind!",
"Don’t stop until you're proud!",
"Every expert was once a beginner!",
"The best view comes after the hardest climb!",
"Push yourself — no one else will!",
];
function showMotivation() {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  document.getElementById('motText').innerText = quote;
  const modal = document.getElementById('motModal');
  modal.classList.add('modal-active');

  setTimeout(() => modal.classList.remove('modal-active'), 5000);
}
function closeMot() {
 document.getElementById('motModal').classList.remove('modal-active');
}

// BACKGROUND CANVAS ANIMATION
const c = document.getElementById("bgCanvas");
const ctx = c.getContext("2d");

let dots = [];
const numDots = Math.floor(window.innerWidth / 30); // screen size ke hisaab se dots

function createDots() {
  dots = [];
  for(let i = 0; i < numDots; i++){
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
  createDots(); // resize me new positions
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function animateDots() {
  ctx.clearRect(0, 0, c.width, c.height);
  dots.forEach(d => {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fill();

    d.x += d.dx;
    d.y += d.dy;

    if(d.x < 0 || d.x > c.width) d.dx *= -1;
    if(d.y < 0 || d.y > c.height) d.dy *= -1;
  });

  requestAnimationFrame(animateDots);
}
animateDots();


// WAVE BOTTOM (BACKGROUND STYLE)
const wavePathBottom = document.getElementById("waveBottomPath");
let t = 0;

function animateWave() {
  t += 0.03;
  let d = "M0 60 ";
  for(let x = 0; x <= window.innerWidth; x += 20){
    let y = 60 + Math.sin(x*0.01 + t)*12;
    d += `L ${x} ${y} `;
  }
  d += `L ${window.innerWidth} 120 L0 120 Z`;
  wavePathBottom.setAttribute("d", d);

  requestAnimationFrame(animateWave);
}
animateWave();
//app load//
window.addEventListener("load", () => {
  document.body.classList.add("app-loaded");
});




