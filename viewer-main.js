/* =====================================================
   ROITX ELITE VIEWER — THE PERFECT MERGED ENGINE
   ===================================================== */

const params = new URLSearchParams(location.search);
let rawPath = params.get("path"); 
const docName = params.get("name");

let pdfDoc = null, currentPage = 1, zoomScale = 1.3, rotation = 0, isUIVisible = true, renderTask = null;

async function initReader() {
    if (!rawPath || rawPath === "null") {
        document.getElementById("doc-title").innerText = "No File Selected";
        return;
    }

    // SMART AUTO-FIX: Agar "/" nahi hai (purane notes), toh 'notes/' add karo
    let finalPath = rawPath.includes("/") ? rawPath : `notes/${rawPath}`;

    document.getElementById("doc-title").innerText = docName || "Loading...";
    
    try {
        const { data, error } = await window.supabaseClient.storage.from("admin-files").download(finalPath);
        
        if (error) {
            // Case-Sensitivity Fix for Refbooks
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
    // Setup Download Link
    const dl = document.getElementById("download-trigger");
    if(dl) { dl.href = url; dl.download = (docName || "document") + ".pdf"; }
    
    pdfjsLib.getDocument(url).promise.then(pdf => {
        pdfDoc = pdf;
        document.getElementById("total-pages") ? document.getElementById("total-pages").innerText = pdf.numPages : null;
        const slider = document.getElementById("page-slider");
        if(slider) slider.max = pdf.numPages;
        
        document.getElementById("master-loader").style.display = "none";
        renderPage(1);
    });
}

async function renderPage(num) {
    if (!pdfDoc) return;
    if (renderTask) renderTask.cancel();
    
    currentPage = num;
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: zoomScale, rotation: rotation });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const dpr = window.devicePixelRatio || 1;
    
    canvas.height = viewport.height * dpr;
    canvas.width = viewport.width * dpr;
    canvas.style.height = viewport.height + "px";
    canvas.style.width = viewport.width + "px";
    ctx.scale(dpr, dpr);

    const stage = document.getElementById("canvas-stage");
    stage.innerHTML = ''; stage.appendChild(canvas);
    
    renderTask = page.render({ canvasContext: ctx, viewport: viewport });
    
    // UI Sync
    const indicator = document.getElementById("page-indicator-top");
    if(indicator) indicator.innerText = `Page ${num} of ${pdfDoc.numPages}`;
    const slider = document.getElementById("page-slider");
    if(slider) slider.value = num;
}

// Interactions
window.handleViewportClick = (e) => {
    if (e.clientY < 80 || e.clientY > window.innerHeight - 80) return;
    isUIVisible = !isUIVisible;
    document.body.classList.toggle("ui-hidden", !isUIVisible);
};

window.navPage = (dir) => {
    let next = (dir === 'next') ? currentPage + 1 : currentPage - 1;
    if (pdfDoc && next > 0 && next <= pdfDoc.numPages) {
        renderPage(next);
        document.getElementById("viewport").scrollTop = 0;
    }
};

window.adjustZoom = (delta) => {
    zoomScale = Math.min(Math.max(zoomScale + delta, 0.5), 3.5);
    const zVal = document.getElementById("zoom-val");
    if(zVal) zVal.innerText = Math.round(zoomScale * 100) + "%";
    renderPage(currentPage);
};

window.rotateCanvas = () => { rotation = (rotation + 90) % 360; renderPage(currentPage); };

window.setTheme = (t) => {
    document.body.className = `theme-${t} ui-visible`;
    window.toggleSettings(false);
};

window.toggleSettings = (show = true) => {
    const panel = document.getElementById("settings-panel");
    const overlay = document.getElementById("modal-overlay");
    if(panel) panel.classList.toggle("open", show);
    if(overlay) overlay.style.display = show ? "block" : "none";
};

function showError(path) {
    document.getElementById("doc-title").innerText = "Load Failed";
    document.getElementById("master-loader").innerHTML = `<div style="color:#ff4444; text-align:center; padding:20px;">
        <h3>File Not Found</h3><p style="font-size:12px; opacity:0.6;">Path: ${path}</p>
    </div>`;
}

// Slider logic
const slider = document.getElementById("page-slider");
if(slider) {
    slider.onchange = function() { renderPage(parseInt(this.value)); };
}

document.addEventListener("DOMContentLoaded", initReader);
