const params = new URLSearchParams(location.search);
const fileName = params.get("file");
let pdfDoc = null, pageNum = 1, scale = 1.3, rotation = 0;
let autoScrollInterval = null;
let lastTap = 0;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

async function init() {
    if(!fileName) return;
    const fullPath = fileName.includes('/') ? fileName : `notes/${fileName}`;
    document.getElementById("fname").innerText = fileName.split('/').pop();

    try {
        const { data, error } = await window.supabaseClient.storage.from("admin-files").download(fullPath);
        if (error) throw error;
        
        const url = URL.createObjectURL(data);
        document.getElementById("down-link").href = url;

        pdfDoc = await pdfjsLib.getDocument(url).promise;
        document.getElementById("pcount").textContent = pdfDoc.numPages;
        document.getElementById("read-time").textContent = `Est. Read: ${pdfDoc.numPages * 2} min`;
        
        renderPage(pageNum);
        updateStatus();
        document.getElementById("loader").style.display = "none";
    } catch (e) { console.error(e); }
}

async function renderPage(num) {
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: scale, rotation: rotation });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.height = viewport.height * dpr;
    canvas.width = viewport.width * dpr;
    canvas.style.width = viewport.width + "px";
    canvas.style.height = viewport.height + "px";
    ctx.scale(dpr, dpr);

    const wrapper = document.getElementById('canvas-wrapper');
    wrapper.innerHTML = '';
    wrapper.appendChild(canvas);

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    document.getElementById("pnum").textContent = num;
    updateProgress();
}

function changePage(delta) {
    if (!pdfDoc || pageNum + delta < 1 || pageNum + delta > pdfDoc.numPages) return;
    pageNum += delta;
    renderPage(pageNum);
}

// 20+ Smart Features Functions
function setTheme(mode) {
    document.body.className = mode;
}

function updateProgress() {
    let perc = (pageNum / pdfDoc.numPages) * 100;
    document.getElementById("progress-bar").style.width = perc + "%";
}

function toggleAutoScroll(active) {
    if(active) {
        autoScrollInterval = setInterval(() => {
            document.getElementById("main-container").scrollTop += 1;
        }, 50);
    } else {
        clearInterval(autoScrollInterval);
    }
}

function rotatePDF() {
    rotation = (rotation + 90) % 360;
    renderPage(pageNum);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
}

function handleDoubleTap(e) {
    let now = new Date().getTime();
    if (now - lastTap < 300) {
        scale = scale === 1.3 ? 2.5 : 1.3;
        renderPage(pageNum);
    }
    lastTap = now;
}

function updateStatus() {
    // Battery Info
    navigator.getBattery?.().then(b => {
        document.getElementById("battery-info").innerText = `Battery: ${Math.round(b.level*100)}%`;
    });
    // Clock
    setInterval(() => {
        document.getElementById("current-time").innerText = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }, 1000);
}

function startPomodoro() {
    let time = 25 * 60;
    const btn = document.getElementById("pomo-btn");
    let timer = setInterval(() => {
        let min = Math.floor(time/60);
        let sec = time % 60;
        btn.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        if(time-- <= 0) { clearInterval(timer); alert("Time to take a break!"); btn.innerText = "Start 25m"; }
    }, 1000);
}

async function toggleWakeLock(active) {
    if (active && 'wakeLock' in navigator) {
        try { await navigator.wakeLock.request('screen'); } catch (err) {}
    }
}

init();
