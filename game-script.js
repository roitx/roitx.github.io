const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Elements
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('startBtn');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restartBtn');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const levelDisplay = document.getElementById('level');
const finalScore = document.getElementById('final-score');

const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const shootBtn = document.getElementById('shootBtn');

// Game state
let gameRunning = false;
let score = 0;
let lives = 3;
let level = 1;

// Starfield
let stars = [];
for(let i=0;i<200;i++){
  stars.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, size: Math.random()*2, speed: Math.random()*1.5});
}

// Player
const player = { x:canvas.width/2, y:canvas.height-100, width:50, height:50, color:'cyan', speed:7, bullets:[] };

// Controls
const keys = {};
window.addEventListener('keydown', e=>keys[e.key]=true);
window.addEventListener('keyup', e=>keys[e.key]=false);

// Mobile touch events
leftBtn.addEventListener('touchstart',()=>keys['ArrowLeft']=true);
leftBtn.addEventListener('touchend',()=>keys['ArrowLeft']=false);
rightBtn.addEventListener('touchstart',()=>keys['ArrowRight']=true);
rightBtn.addEventListener('touchend',()=>keys['ArrowRight']=false);
shootBtn.addEventListener('touchstart',()=>keys[' ']=true);
shootBtn.addEventListener('touchend',()=>keys[' ']=false);

// Enemies
let enemies = [];
function spawnEnemy() {
  const x = Math.random() * (canvas.width - 50);
  const y = -50;
  const size = 40 + Math.random()*20;
  enemies.push({ x, y, width:size, height:size, color:'red', speed:2 + Math.random()*3 });
}

// Bullets
function shoot() {
  if(!keys[' ']) return;
  player.bullets.push({ x:player.x+player.width/2-5, y:player.y, width:10, height:20, color:'yellow', speed:10 });
}

// Explosions
let particles = [];
function createExplosion(x,y,color){
  for(let i=0;i<15;i++){
    particles.push({
      x, y,
      vx: (Math.random()-0.5)*5,
      vy: (Math.random()-0.5)*5,
      size: Math.random()*4+2,
      color
    });
  }
}

// Game Loop
function update(){
  if(!gameRunning) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Starfield
  stars.forEach(s=>{
    ctx.fillStyle='white';
    ctx.fillRect(s.x,s.y,s.size,s.size);
    s.y+=s.speed;
    if(s.y>canvas.height){ s.y=0; s.x=Math.random()*canvas.width; }
  });

  // Player movement
  if(keys['ArrowLeft'] && player.x>0) player.x -= player.speed;
  if(keys['ArrowRight'] && player.x+player.width<canvas.width) player.x += player.speed;
  if(keys[' ']) shoot();

  // Draw player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x,player.y,player.width,player.height);

  // Bullets
  player.bullets.forEach((b,i)=>{
    b.y -= b.speed;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x,b.y,b.width,b.height);
    if(b.y+b.height<0) player.bullets.splice(i,1);
  });

  // Spawn enemies
  if(Math.random()<0.02+level*0.002) spawnEnemy();

  // Enemies
  enemies.forEach((enemy,i)=>{
    enemy.y += enemy.speed;
    ctx.fillStyle=enemy.color;
    ctx.fillRect(enemy.x,enemy.y,enemy.width,enemy.height);

    // Bullet collision
    player.bullets.forEach((b,j)=>{
      if(b.x<enemy.x+enemy.width && b.x+b.width>enemy.x && b.y<enemy.y+enemy.height && b.y+b.height>enemy.y){
        createExplosion(enemy.x+enemy.width/2, enemy.y+enemy.height/2, 'orange');
        enemies.splice(i,1);
        player.bullets.splice(j,1);
        score+=10;
        scoreDisplay.textContent='Score: '+score;
      }
    });

    // Player collision
    if(player.x<enemy.x+enemy.width && player.x+player.width>enemy.x && player.y<enemy.y+enemy.height && player.y+player.height>enemy.y){
      createExplosion(player.x+player.width/2, player.y+player.height/2,'cyan');
      enemies.splice(i,1);
      lives--;
      livesDisplay.textContent='Lives: '+lives;
      if(lives<=0) gameOver();
    }

    if(enemy.y>canvas.height) enemies.splice(i,1);
  });

  // Particles
  particles.forEach((p,i)=>{
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x,p.y,p.size,p.size);
    p.x+=p.vx; p.y+=p.vy;
    p.size*=0.95;
    if(p.size<0.5) particles.splice(i,1);
  });

  requestAnimationFrame(update);
}

// Start/Restart
function startGame(){
  startScreen.style.display='none';
  gameOverScreen.style.display='none';
  gameRunning=true;
  score=0; lives=3; level=1;
  enemies=[]; player.bullets=[]; particles=[];
  scoreDisplay.textContent='Score:0'; livesDisplay.textContent='Lives:3'; levelDisplay.textContent='Level:1';
  update();
}

function gameOver(){
  gameRunning=false;
  finalScore.textContent='Score: '+score;
  gameOverScreen.style.display='block';
}

startBtn.addEventListener('click',startGame);
restartBtn.addEventListener('click',startGame);
