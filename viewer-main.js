/* =====================================================
   ROITX ELITE VIEWER — ADVANCED FIXED & UPGRADED ENGINE
   ===================================================== */

const params = new URLSearchParams(location.search);
let rawPath = params.get("path"); 
const docName = params.get("name");

let pdfDoc = null;
let currentPage = 1;
let zoomScale = 1.2;
let rotation = 0;
let isUIVisible = true;
let renderTask = null;

async function initReader() {
    if (!rawPath || rawPath === "null") {
        document.getElementById("doc-title").innerText = "No File Selected";
        return;
    }

    let finalPath = rawPath.includes("/") ? rawPath : `notes/${rawPath}`;
    document.getElementById("doc-title").innerText = docName || "Loading Document...";
    
    try {
        const { data, error } = await window.supabaseClient.storage.from("admin-files").download(finalPath);
        
        if (error) {
            if (finalPath.toLowerCase().includes("refbooks")) {
                const alt = finalPath.includes("refbooks") ? finalPath.replace("refbooks", "Refbooks") : finalPath.replace("Refbooks", "refbooks");
                const retry = await window.supabaseClient.storage.from("admin-files").download(alt);
                if (!retry.error) { startEngine(retry.data); return; }
            }
            throw error;
        }
        startEngine(data);
    } catch (err) {
        showError(finalPath);
    }
}

function startEngine(blob) {
    const url = URL.createObjectURL(blob);
    const dl = document.getElementById("download-trigger");
    if (dl) { dl.href = url; dl.download = (docName || "document") + ".pdf"; }
    
    pdfjsLib.getDocument(url).promise.then(pdf => {
        pdfDoc = pdf;
        
        const slider = document.getElementById("page-slider");
        if (slider) {
            slider.max = pdf.numPages;
            slider.value = 1;
        }
        
        document.getElementById("master-loader").style.display = "none";
        renderPage(1);
    });
}

async function renderPage(num) {
    if (!pdfDoc) return;
    if (renderTask) {
        try { renderTask.cancel(); } catch(e){}
    }
    
    currentPage = num;
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: zoomScale, rotation: rotation });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const dpr = window.devicePixelRatio || 1;
    
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.style.height = Math.floor(viewport.height) + "px";
    canvas.style.width = Math.floor(viewport.width) + "px";
    
    ctx.scale(dpr, dpr);

    const stage = document.getElementById("canvas-stage");
    stage.innerHTML = ''; 
    stage.appendChild(canvas);
    
    renderTask = page.render({ canvasContext: ctx, viewport: viewport });
    
    // UI Updates
    const indicator = document.getElementById("page-indicator-top");
    if (indicator) indicator.innerText = `Page ${num} of ${pdfDoc.numPages}`;
    
    const slider = document.getElementById("page-slider");
    if (slider) slider.value = num;

    const zoomVal = document.getElementById("zoom-val");
    if (zoomVal) zoomVal.innerText = Math.round(zoomScale * 100) + "%";
}

/* UI INTERACTIONS & NAVIGATION */
window.handleViewportClick = (e) => {
    if (e.clientY < 80 || e.clientY > window.innerHeight - 80) return;
    isUIVisible = !isUIVisible;
    document.body.classList.toggle("ui-hidden", !isUIVisible);
};

window.navPage = (dir) => {
    let next = (dir === 'next') ? currentPage + 1 : currentPage - 1;
    if (pdfDoc && next > 0 && next <= pdfDoc.numPages) {
        renderPage(next);
        const vp = document.getElementById("viewport");
        if (vp) vp.scrollTop = 0;
    }
};

/* FIXED & REFACTOR ZOOM CONTROLS */
window.adjustZoom = (delta) => {
    const newZoom = parseFloat((zoomScale + delta).toFixed(2));
    if (newZoom >= 0.5 && newZoom <= 3.5) {
        zoomScale = newZoom;
        renderPage(currentPage);
    }
};

window.rotateCanvas = () => { 
    rotation = (rotation + 90) % 360; 
    renderPage(currentPage); 
};

window.setTheme = (t) => {
    document.body.className = `theme-${t} ui-visible`;
    window.toggleSettings(false);
};

window.toggleSettings = (show = true) => {
    const panel = document.getElementById("settings-panel");
    const overlay = document.getElementById("modal-overlay");
    if (panel) panel.classList.toggle("open", show);
    if (overlay) overlay.style.display = show ? "block" : "none";
};

window.toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
};

function showError(path) {
    document.getElementById("doc-title").innerText = "Load Failed";
    document.getElementById("master-loader").innerHTML = `<div style="color:#ff4444; text-align:center; padding:20px;">
        <h3>File Not Found</h3><p style="font-size:12px; opacity:0.6;">Path: ${path}</p>
    </div>`;
}

// Slider logic with live bubble update
const slider = document.getElementById("page-slider");
if (slider) {
    const bubble = document.getElementById("bubble-tip");
    slider.oninput = function() {
        if (bubble) {
            bubble.innerText = this.value;
            bubble.style.display = "block";
            bubble.style.left = `${(this.value / this.max) * 100}%`;
        }
    };
    slider.onchange = function() {
        if (bubble) bubble.style.display = "none";
        renderPage(parseInt(this.value));
    };
}

document.addEventListener("DOMContentLoaded", initReader);
