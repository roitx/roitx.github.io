let exp="",DEG=true,sci=false;
const expr=expression,res=result,hist=historyList;
const side=sideMenu,over=overlay,degBtn=document.getElementById("degBtn");

/* BASIC */
function append(v){exp+=v;expr.innerText=exp}
function clearAll(){exp="";expr.innerText="";res.innerText="0"}
function del(){exp=exp.slice(0,-1);expr.innerText=exp}

/* CALC */
function calculate(){
 try{
  let e=exp;
  if(DEG){
    e=e.replace(/Math\.sin\(/g,"Math.sin(Math.PI/180*")
       .replace(/Math\.cos\(/g,"Math.cos(Math.PI/180*")
       .replace(/Math\.tan\(/g,"Math.tan(Math.PI/180*");
  }
  const r=eval(e);
  res.innerText=r;
  addHistory(exp+" = "+r);
  exp=""+r;expr.innerText="";
 }catch{res.innerText="Error";exp="";expr.innerText=""}
}

/* HISTORY */
function addHistory(t){
 const d=document.createElement("div");
 d.innerText=t;
 d.onclick=()=>{exp=t.split("=")[0].trim();expr.innerText=exp;closeSide()};
 hist.prepend(d);
}
function clearHistory(){hist.innerHTML=""}

/* MENU */
menuBtn.onclick=()=>{side.classList.add("show");over.classList.add("show")}
over.onclick=closeSide;
function closeSide(){side.classList.remove("show");over.classList.remove("show")}

/* SCI */
function toggleSci(){
 sci=!sci;
 sciPanel.classList.toggle("show",sci);
}

/* DEG/RAD */
function toggleDegRad(){
 DEG=!DEG;
 degBtn.innerText=DEG?"DEG":"RAD";
}

/* COPY + DOUBLE TAP */
let lastTap=0;
res.onclick=()=>{
 navigator.clipboard.writeText(res.innerText);
 const now=Date.now();
 if(now-lastTap<300)clearAll();
 lastTap=now;
}

/* GESTURES */
let sx=0;
document.addEventListener("touchstart",e=>sx=e.touches[0].clientX);
document.addEventListener("touchend",e=>{
 let dx=e.changedTouches[0].clientX-sx;
 if(dx>80){side.classList.add("show");over.classList.add("show")}
 if(dx<-80)closeSide();
});

/* THEME */
themeSelect.onchange=()=>{
 document.body.className=themeSelect.value;
};