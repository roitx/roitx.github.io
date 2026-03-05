const params = new URLSearchParams(location.search);
let fileName = params.get("file");
let pdfDoc = null, pageNum = 1, rotation = 0, currentScale = 1.5, isScrolling = false, lastTap = 0;

async function init() {
    if(!fileName) return;
    const path = fileName.includes('/') ? fileName : `notes/${fileName}`;
    document.getElementById("doc-title").innerText = fileName.split('/').pop().replace(/_/g, ' ');

    try {
        const { data, error } = await window.supabaseClient.storage.from("admin-files").download(path);
        if (error) throw error;

        // File Size Calculation
        const sizeKB = (data.size / 1024).toFixed(1);
        const sizeDisp = sizeKB > 1024 ? (sizeKB/1024).toFixed(2) + " MB" : sizeKB + " KB";
        
        const url = URL.createObjectURL(data);
        document.getElementById("dl-link").onclick = () => window.open(url);

        if (/\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
            renderImage(url);
            document.getElementById("doc-stats").innerText = `Image • ${sizeDisp}`;
            document.querySelector(".bottom-console").style.display = "none";
        } else {
            pdfDoc = await pdfjsLib.getDocument(url).promise;
            document.getElementById("total-pages").textContent = pdfDoc.numPages;
            document.getElementById("doc-stats").innerText = `${pdfDoc.numPages} Pages • ${sizeDisp}`;
            renderPage(pageNum);
        }
        document.getElementById("loader").style.display = "none";
        startClock();
    } catch (e) { console.error(e); }
}

async function renderPage(num) {
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: currentScale, rotation: rotation });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    const area = document.getElementById("render-area");
    area.innerHTML = ''; area.appendChild(canvas);
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    document.getElementById("page-input").value = num;
    document.getElementById("top-progress").style.width = (num/pdfDoc.numPages*100) + "%";
}

function renderImage(url) {
    const img = document.createElement("img");
    img.src = url; img.style.transform = `rotate(${rotation}deg)`;
    const area = document.getElementById("render-area");
    area.innerHTML = ''; area.appendChild(img);
}

// Controls
function changePage(delta) {
    if (!pdfDoc || pageNum + delta < 1 || pageNum + delta > pdfDoc.numPages) return;
    pageNum += delta; renderPage(pageNum);
    document.getElementById("viewport").scrollTop = 0;
}

// Double Tap to Zoom
document.getElementById("viewport").addEventListener('click', (e) => {
    let now = Date.now();
    if (now - lastTap < 300) {
        currentScale = currentScale === 1.5 ? 2.5 : 1.5;
        if(pdfDoc) renderPage(pageNum);
    }
    lastTap = now;
});

// Auto Scroll Logic
document.getElementById("auto-scroll-chk").onchange = (e) => {
    isScrolling = e.target.checked;
    if(isScrolling) {
        const scroll = () => {
            if(!isScrolling) return;
            document.getElementById("viewport").scrollTop += 1;
            requestAnimationFrame(scroll);
        };
        requestAnimationFrame(scroll);
    }
};

// Ruler Logic
document.getElementById("viewport").addEventListener('mousemove', (e) => {
    if(document.getElementById("ruler-chk").checked)
        document.getElementById("reading-ruler").style.top = e.clientY - 15 + "px";
});
document.getElementById("ruler-chk").onchange = (e) => {
    document.getElementById("reading-ruler").style.display = e.target.checked ? "block" : "none";
};

function toggleMenu(s) {
    document.getElementById("side-panel").classList.toggle("active", s);
    document.getElementById("overlay").style.display = s ? "block" : "none";
}
function setTheme(t) { document.body.className = t + "-theme"; toggleMenu(false); }
function rotateDoc() { rotation = (rotation + 90) % 360; pdfDoc ? renderPage(pageNum) : renderImage(document.querySelector("img").src); }
function startClock() { setInterval(() => { document.getElementById("live-clock").innerText = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }, 1000); }
function toggleFullscreen() { if(!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }

init();
