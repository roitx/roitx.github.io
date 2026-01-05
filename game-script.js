// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resizeCanvas(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
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
let powerupDisplay = document.getElementById('powerup');
if(!powerupDisplay){
    powerupDisplay = document.createElement('div');
    powerupDisplay.id='powerup';
    powerupDisplay.style.position='absolute';
    powerupDisplay.style.top='10px';
    powerupDisplay.style.right='10px';
    powerupDisplay.style.color='lime';
    powerupDisplay.style.fontSize='3vw';
    powerupDisplay.style.zIndex='10';
    powerupDisplay.textContent='Power-up: None';
    document.body.appendChild(powerupDisplay);
}
const finalScore = document.getElementById('final-score');

const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const shootBtn = document.getElementById('shootBtn');

// Game State
let gameRunning = false;
let score = 0, lives = 3, level = 1;
let stars=[], enemies=[], particles=[], powerups=[];

// Player
const player = { 
  x: canvas.width/2, y: canvas.height-100, width:50, height:50, color:'cyan', speed:7, bullets:[], 
  rapidFire:false, shield:false, shootCooldown:0
};

// Controls
const keys = {};
window.addEventListener('keydown', e => keys[e.key]=true);
window.addEventListener('keyup', e => keys[e.key]=false);
leftBtn.addEventListener('touchstart', ()=>keys['ArrowLeft']=true);
leftBtn.addEventListener('touchend', ()=>keys['ArrowLeft']=false);
rightBtn.addEventListener('touchstart', ()=>keys['ArrowRight']=true);
rightBtn.addEventListener('touchend', ()=>keys['ArrowRight']=false);
shootBtn.addEventListener('touchstart', ()=>keys[' ']=true);
shootBtn.addEventListener('touchend', ()=>keys[' ']=false);

// Initialize starfield
for(let i=0;i<300;i++){
  stars.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, size: Math.random()*2, speed: Math.random()*2});
}

// Utility: Explosion
function createExplosion(x, y, color, count=20){
  for(let i=0;i<count;i++){
    particles.push({
      x, y,
      vx:(Math.random()-0.5)*6,
      vy:(Math.random()-0.5)*6,
      size: Math.random()*4+2,
      color, life: 30 + Math.random()*20
    });
  }
}

// Shoot function
function shootBullet(){
  if(player.shootCooldown>0) return;
  player.bullets.push({x:player.x+player.width/2-5, y:player.y, width:10, height:20, color:'yellow', speed:12});
  player.shootCooldown = player.rapidFire ? 5 : 15; // faster shooting with rapidFire
}

// Spawn enemies (with types)
function spawnEnemy(){
  const type = Math.random();
  let size=40, speed=2, color='red';
  if(type<0.3){ size=50; speed=1.5; color='orange'; } // big slow
  else if(type<0.6){ size=30; speed=3; color='red'; } // small fast
  else { size=40; speed=2; color='purple'; } // medium
  const x=Math.random()*(canvas.width-size);
  enemies.push({x, y:-size, width:size, height:size, color, speed});
}

// Spawn power-ups
function spawnPowerUp(){
  const x = Math.random()*(canvas.width-40);
  const type = Math.random() < 0.5 ? 'rapidFire' : 'shield';
  powerups.push({x, y:-40, width:40, height:40, type, speed:2});
}

// Main game loop
function update(){
  if(!gameRunning) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Starfield
  stars.forEach(s => {
    ctx.fillStyle='white';
    ctx.fillRect(s.x,s.y,s.size,s.size);
    s.y+=s.speed;
    if(s.y>canvas.height){ s.y=0; s.x=Math.random()*canvas.width; }
  });

  // Player movement
  if(keys['ArrowLeft'] && player.x>0) player.x -= player.speed;
  if(keys['ArrowRight'] && player.x+player.width<canvas.width) player.x += player.speed;

  if(keys[' ']) shootBullet();
  if(player.shootCooldown>0) player.shootCooldown--;

  // Draw player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  if(player.shield){ 
      ctx.strokeStyle='yellow'; 
      ctx.lineWidth=4; 
      ctx.strokeRect(player.x, player.y, player.width, player.height); 
  }

  // Bullets
  player.bullets.forEach((b,i)=>{
    b.y-=b.speed;
    ctx.fillStyle=b.color;
    ctx.fillRect(b.x,b.y,b.width,b.height);
    if(b.y+b.height<0) player.bullets.splice(i,1);
  });

  // Random enemy spawn
  if(Math.random()<0.02+level*0.002) spawnEnemy();

  // Random power-up spawn
  if(Math.random()<0.001) spawnPowerUp();

  // Enemies
  enemies.forEach((e,i)=>{
    e.y+=e.speed;
    ctx.fillStyle=e.color;
    ctx.fillRect(e.x,e.y,e.width,e.height);

    // Bullet collisions
    player.bullets.forEach((b,j)=>{
      if(b.x<e.x+e.width && b.x+b.width>e.x && b.y<e.y+e.height && b.y+b.height>e.y){
        createExplosion(e.x+e.width/2, e.y+e.height/2,'orange');
        enemies.splice(i,1);
        player.bullets.splice(j,1);
        score += 10;
        scoreDisplay.textContent='Score: '+score;
      }
    });

    // Player collision
    if(player.x<e.x+e.width && player.x+player.width>e.x && player.y<e.y+e.height && player.y+player.height>e.y){
      if(!player.shield){
        createExplosion(player.x+player.width/2, player.y+player.height/2,'cyan');
        lives--;
        livesDisplay.textContent='Lives: '+lives;
      }
      enemies.splice(i,1);
      if(lives<=0) gameOver();
    }

    if(e.y>canvas.height) enemies.splice(i,1);
  });

  // Power-ups
  powerups.forEach((p,i)=>{
    p.y+=p.speed;
    ctx.fillStyle=p.type==='rapidFire'?'lime':'yellow';
    ctx.fillRect(p.x,p.y,p.width,p.height);

    if(player.x<p.x+p.width && player.x+player.width>p.x && player.y<p.y+p.height && player.y+player.height>p.y){
      if(p.type==='rapidFire') player.rapidFire=true;
      else if(p.type==='shield') player.shield=true;
      powerupDisplay.textContent = 'Power-up: ' + p.type;
      powerups.splice(i,1);
      setTimeout(()=>{ 
        player.rapidFire=false; 
        player.shield=false; 
        powerupDisplay.textContent='Power-up: None';
      }, 5000);
    }

    if(p.y>canvas.height) powerups.splice(i,1);
  });

  // Particles
  particles.forEach((p,i)=>{
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x,p.y,p.size,p.size);
    p.x+=p.vx; p.y+=p.vy;
    p.size*=0.95;
    p.life--;
    if(p.size<0.5 || p.life<=0) particles.splice(i,1);
  });

  requestAnimationFrame(update);
}

// Start game
function startGame(){
  startScreen.style.display='none';
  gameOverScreen.style.display='none';
  gameRunning=true;
  score=0; lives=3; level=1;
  enemies=[]; player.bullets=[]; particles=[]; powerups=[];
  player.rapidFire=false; player.shield=false;
  scoreDisplay.textContent='Score:0'; livesDisplay.textContent='Lives:3'; levelDisplay.textContent='Level:1'; powerupDisplay.textContent='Power-up: None';
  update();
}

// Game over
function gameOver(){
  gameRunning=false;
  finalScore.textContent='Score: '+score;
  gameOverScreen.style.display='block';
}

startBtn.addEventListener('click',startGame);
restartBtn.addEventListener('click',startGame);
