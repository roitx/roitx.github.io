
const ADMIN_USER="rohit-x";
const ADMIN_PASS="12/07/2008";

function login(){
  const u=user.value,p=pass.value;
  if(u===ADMIN_USER && p===ADMIN_PASS){
    localStorage.admin=true; location.href='notes.html';
  } else msg.textContent="Wrong login";
}
function toggleEye(){
  pass.type = pass.type==="password"?"text":"password";
  eye.textContent = pass.type==="password"?"🙈":"👁";
}
function upload(){
  alert("Demo upload (admin only)");
}
window.onload=()=>{
  if(localStorage.admin) document.getElementById("uploadArea")?.style.display="block";
  const t=document.getElementById("modeToggle");
  if(t){
    t.checked=localStorage.dark==="1";
    document.body.classList.toggle("dark",t.checked);
    t.onchange=()=>{document.body.classList.toggle("dark",t.checked);localStorage.dark=t.checked?1:0;}
  }
}
