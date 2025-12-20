const recentList   = document.getElementById("recentList");
const downloadList = document.getElementById("downloadList");

/* =========================
   STORAGE HELPERS
   ========================= */
function getData(key){
  return JSON.parse(localStorage.getItem(key) || "[]");
}
function saveData(key,data){
  localStorage.setItem(key,JSON.stringify(data));
}

/* =========================
   ADD RECENT VIEW
   ========================= */
function addRecent(file){
  let recent = getData("recentFiles");
  recent = recent.filter(f=>f.url!==file.url);
  recent.unshift(file);
  recent = recent.slice(0,10);
  saveData("recentFiles",recent);
}

/* =========================
   ADD DOWNLOAD
   ========================= */
function addDownload(file){
  let downloads = getData("downloadedFiles");
  if(!downloads.some(f=>f.url===file.url)){
    downloads.unshift(file);
    saveData("downloadedFiles",downloads);
  }
}

/* =========================
   RENDER
   ========================= */
function render(){
  renderList(recentList,getData("recentFiles"),"recent");
  renderList(downloadList,getData("downloadedFiles"),"download");
}

function renderList(container,data,type){
  if(!data.length){
    container.innerHTML=`<p class="empty">No ${type} files</p>`;
    return;
  }

  container.innerHTML="";
  data.forEach(f=>{
    const div=document.createElement("div");
    div.className="file";
    div.innerHTML=`
      <div class="icon">${f.title.slice(0,2).toUpperCase()}</div>
      <div class="file-info">
        <b>${f.title}</b>
        <span>${f.meta || ""}</span>
      </div>
    `;

    div.onclick=()=>window.open(f.url,"_blank");
    container.appendChild(div);
  });
}

/* =========================
   INIT
   ========================= */
document.addEventListener("DOMContentLoaded",render);