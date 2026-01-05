const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
function resize(){canvas.width=innerWidth;canvas.height=innerHeight}
window.addEventListener("resize",resize); resize();

const scoreEl=document.getElementById("score");
const livesEl=document.getElementById("lives");
const levelEl=document.getElementById("level");

const startScreen=document.getElementById("start-screen");
const gameOverScreen=document.getElementById("game-over");
const finalScore=document.getElementById("final-score");

const startBtn=document.getElementById("startBtn");
const restartBtn=document.getElementById("restartBtn");

let game=false,score=0,lives=3,level=1;
let bullets=[],enemies=[],particles=[],stars=[];

/* Player */
const player={
  x:canvas.width/2,
  y:canvas.height-90,
  w:40,h:40,
  speed:7,
  cooldown:0
};

/* Controls */
const keys={};
onkeydown=e=>keys[e.key]=true;
onkeyup=e=>keys[e.key]=false;

leftBtn.ontouchstart=()=>keys["ArrowLeft"]=true;
leftBtn.ontouchend=()=>keys["ArrowLeft"]=false;
rightBtn.ontouchstart=()=>keys["ArrowRight"]=true;
rightBtn.ontouchend=()=>keys["ArrowRight"]=false;
shootBtn.ontouchstart=()=>keys[" "]=true;
shootBtn.ontouchend=()=>keys[" "]=false;

/* Stars */
for(let i=0;i<200;i++)
stars.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,s:Math.random()*2});

/* Functions */
function shoot(){
  if(player.cooldown>0) return;
  bullets.push({x:player.x+player.w/2-3,y:player.y});
  player.cooldown=12;
}

function spawnEnemy(){
  const s=30+Math.random()*20;
  enemies.push({
    x:Math.random()*(canvas.width-s),
    y:-s,w:s,h:s,
    speed:2+level*.4
  });
}

function explode(x,y){
  for(let i=0;i<15;i++)
    particles.push({x,y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,l:30});
}

/* Loop */
function update(){
if(!game)return;
ctx.clearRect(0,0,canvas.width,canvas.height);

/* Stars */
ctx.fillStyle="white";
stars.forEach(s=>{
  s.y+=1;if(s.y>canvas.height)s.y=0;
  ctx.fillRect(s.x,s.y,s.s,s.s);
});

/* Player */
if(keys["ArrowLeft"]&&player.x>0)player.x-=player.speed;
if(keys["ArrowRight"]&&player.x+player.w<canvas.width)player.x+=player.speed;
if(keys[" "])shoot();
if(player.cooldown>0)player.cooldown--;

ctx.save();
ctx.shadowColor="cyan";
ctx.shadowBlur=20;
ctx.fillStyle="cyan";
ctx.fillRect(player.x,player.y,player.w,player.h);
ctx.restore();

/* Bullets */
bullets.forEach((b,i)=>{
  b.y-=10;
  ctx.fillStyle="yellow";
  ctx.fillRect(b.x,b.y,6,16);
  if(b.y<0)bullets.splice(i,1);
});

/* Enemies */
if(Math.random()<0.02+level*.004)spawnEnemy();
enemies.forEach((e,i)=>{
  e.y+=e.speed;
  ctx.fillStyle="red";
  ctx.fillRect(e.x,e.y,e.w,e.h);

  bullets.forEach((b,j)=>{
    if(b.x<e.x+e.w&&b.x+6>e.x&&b.y<e.y+e.h){
      explode(e.x+e.w/2,e.y+e.h/2);
      enemies.splice(i,1);
      bullets.splice(j,1);
      score+=10;
      scoreEl.textContent="Score: "+score;
      if(score%100===0){level++;levelEl.textContent="Level: "+level;}
    }
  });

  if(e.y>canvas.height){
    enemies.splice(i,1);
    lives--;
    livesEl.textContent="Lives: "+lives;
    if(lives<=0)endGame();
  }
});

/* Particles */
particles.forEach((p,i)=>{
  ctx.fillStyle="orange";
  ctx.fillRect(p.x,p.y,4,4);
  p.x+=p.vx;p.y+=p.vy;p.l--;
  if(p.l<=0)particles.splice(i,1);
});

requestAnimationFrame(update);
}

/* Game Control */
function startGame(){
  startScreen.classList.remove("show");
  gameOverScreen.classList.remove("show");
  score=0;lives=3;level=1;
  bullets=[];enemies=[];particles=[];
  scoreEl.textContent="Score: 0";
  livesEl.textContent="Lives: 3";
  levelEl.textContent="Level: 1";
  game=true;
  update();
}

function endGame(){
  game=false;
  finalScore.textContent="Final Score: "+score;
  gameOverScreen.classList.add("show");
}

startBtn.onclick=startGame;
restartBtn.onclick=startGame;
