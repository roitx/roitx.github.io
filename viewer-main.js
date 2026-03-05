const params = new URLSearchParams(location.search);
let fileName = params.get("file");
let pdfDoc = null, pageNum = 1, rotation = 0, scale = 1.3, isScrolling = false;

async function init() {
    if(!fileName) return;
    const path = `notes/${fileName}`;
    document.getElementById("doc-title").innerText = fileName.replace(/_/g, ' ');

    try {
        const { data, error } = await window.supabaseClient.storage.from("admin-files").download(path);
        if (error) throw error;
        
        const sizeDisp = (data.size / 1024).toFixed(1) + " KB";
        const url = URL.createObjectURL(data);
        document.getElementById("dl-link").onclick = () => window.open(url);

        pdfDoc = await pdfjsLib.getDocument(url).promise;
        document.getElementById("total-pages").textContent = pdfDoc.numPages;
        document.getElementById("doc-stats").innerText = `${pdfDoc.numPages} Pages • ${sizeDisp}`;
        renderPage(pageNum);
        
        document.getElementById("loader").style.display = "none";
        startClock();
    } catch (e) { console.error(e); }
}

async function renderPage(num) {
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: scale, rotation: rotation });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const area = document.getElementById("render-area");
    area.innerHTML = ''; area.appendChild(canvas);
    
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    document.getElementById("page-input").value = num;
}

// Zoom Function (Buttons & Pinch)
function changeZoom(delta) {
    scale = Math.min(Math.max(scale + delta, 0.5), 4.0);
    renderPage(pageNum);
}

// Fullscreen Logic
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Auto Scroll Smooth Fix
document.getElementById("auto-scroll-chk").onchange = (e) => {
    isScrolling = e.target.checked;
    if(isScrolling) {
        const step = () => {
            if(!isScrolling) return;
            document.getElementById("viewport").scrollTop += 1;
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }
};

// Side Panel UI
function toggleMenu(s) {
    document.getElementById("side-panel").classList.toggle("active", s);
    document.getElementById("overlay").style.display = s ? "block" : "none";
}

function setTheme(t) {
    document.body.className = t + "-theme";
    toggleMenu(false);
}

function changePage(delta) {
    if (!pdfDoc || pageNum + delta < 1 || pageNum + delta > pdfDoc.numPages) return;
    pageNum += delta; renderPage(pageNum);
    document.getElementById("viewport").scrollTop = 0;
}

function rotateDoc() {
    rotation = (rotation + 90) % 360;
    renderPage(pageNum);
}

function startClock() {
    setInterval(() => {
        document.getElementById("live-clock").innerText = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    }, 1000);
}

init();
