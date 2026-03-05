const params = new URLSearchParams(location.search);
const fileName = params.get("file");
let pdfDoc = null, pageNum = 1, rotation = 0, scrollInterval = null;

// Initialize Supabase & PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

async function init() {
    if(!fileName) return;
    const path = fileName.includes('/') ? fileName : `notes/${fileName}`;
    document.getElementById("doc-title").innerText = fileName.split('/').pop();

    try {
        const { data, error } = await window.supabaseClient.storage.from("admin-files").download(path);
        if (error) throw error;
        
        const url = URL.createObjectURL(data);
        document.getElementById("dl-link").onclick = () => window.open(url);

        if (/\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
            renderImage(url);
            document.querySelector(".bottom-console").style.display = "none";
        } else {
            pdfDoc = await pdfjsLib.getDocument(url).promise;
            document.getElementById("total-pages").textContent = pdfDoc.numPages;
            renderPage(pageNum);
        }
        document.getElementById("loader").style.display = "none";
        startClock();
    } catch (e) { console.error("Load failed", e); }
}

// Rendering Logic
async function renderPage(num) {
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: 1.5, rotation: rotation });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Performance: Device Pixel Ratio optimization
    const dpr = window.devicePixelRatio || 1;
    canvas.height = viewport.height * dpr;
    canvas.width = viewport.width * dpr;
    canvas.style.width = viewport.width + "px";
    canvas.style.height = viewport.height + "px";
    ctx.scale(dpr, dpr);

    const area = document.getElementById("render-area");
    area.innerHTML = ''; area.appendChild(canvas);
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    
    document.getElementById("page-input").value = num;
    document.getElementById("top-progress").style.width = (num/pdfDoc.numPages*100) + "%";
}

function renderImage(url) {
    const img = document.createElement("img");
    img.src = url;
    img.style.transform = `rotate(${rotation}deg)`;
    const area = document.getElementById("render-area");
    area.innerHTML = ''; area.appendChild(img);
}

// 50+ Smart Features Implementation
function changePage(delta) {
    if (!pdfDoc || pageNum + delta < 1 || pageNum + delta > pdfDoc.numPages) return;
    pageNum += delta; renderPage(pageNum);
    document.getElementById("viewport").scrollTop = 0;
}

function toggleMenu(show) {
    document.getElementById("side-panel").classList.toggle("active", show);
    document.getElementById("overlay").style.display = show ? "block" : "none";
}

function setTheme(t) {
    document.body.className = t + "-theme";
    toggleMenu(false);
}

// Feature: Auto Scroll
document.getElementById("auto-scroll-chk").onchange = (e) => {
    if(e.target.checked) scrollInterval = setInterval(() => document.getElementById("viewport").scrollTop += 1, 40);
    else clearInterval(scrollInterval);
};

// Feature: Reading Ruler
document.getElementById("ruler-chk").onchange = (e) => {
    document.getElementById("reading-ruler").style.display = e.target.checked ? "block" : "none";
};

// Feature: Focus Mode
document.getElementById("focus-chk").onchange = (e) => {
    document.getElementById("focus-mode-overlay").style.display = e.target.checked ? "block" : "none";
};

// Feature: Wake Lock
async function toggleWakeLock(active) {
    if (active && 'wakeLock' in navigator) {
        try { await navigator.wakeLock.request('screen'); } catch(e){}
    }
}
document.getElementById("awake-chk").onchange = (e) => toggleWakeLock(e.target.checked);

function rotateDoc() {
    rotation = (rotation + 90) % 360;
    pdfDoc ? renderPage(pageNum) : renderImage(document.querySelector("#render-area img").src);
}

function startClock() {
    setInterval(() => {
        document.getElementById("live-clock").innerText = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }, 1000);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
}

function startTimer() {
    let mins = document.getElementById("pomo-val").value;
    alert(`Pomodoro started for ${mins} minutes. Stay focused!`);
    setTimeout(() => alert("Time's up! Take a break."), mins * 60000);
}

// Init execution
init();
