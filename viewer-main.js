/* =====================================================
   ROITX ELITE ENGINE — ADVANCED CORE
   ===================================================== */

const params = new URLSearchParams(location.search);
const fullPath = params.get("path");
const docName = params.get("name");

let pdfDoc = null,
    currentPage = 1,
    zoomScale = window.innerWidth < 768 ? 1.2 : 1.5,
    rotation = 0,
    isUIVisible = true,
    renderTask = null;

/* ---------- INITIALIZATION ---------- */
async function initReader() {
    if (!fullPath) {
        document.getElementById("doc-title").innerText = "No File Selected";
        return;
    }
    
    document.getElementById("doc-title").innerText = docName || "Roitx Reader";

    try {
        const { data, error } = await window.supabaseClient.storage.from("admin-files").download(fullPath);
        if (error) throw error;

        // Metadata Update
        document.getElementById("file-size").innerText = (data.size / (1024 * 1024)).toFixed(2) + " MB";
        
        const blobUrl = URL.createObjectURL(data);
        document.getElementById("download-trigger").href = blobUrl;
        document.getElementById("download-trigger").download = (docName || "document") + ".pdf";

        // Load PDF
        const loadingTask = pdfjsLib.getDocument(blobUrl);
        pdfDoc = await loadingTask.promise;
        
        // Setup Scrub Bar
        const slider = document.getElementById("page-slider");
        slider.max = pdfDoc.numPages;
        document.getElementById("page-indicator-top").innerText = `Page 1 of ${pdfDoc.numPages}`;
        
        renderPage(1);
        document.getElementById("master-loader").style.display = "none";
        
    } catch (err) {
        console.error("Reader Init Error:", err);
        alert("Failed to load document.");
    }
}

/* ---------- HIGH-FIDELITY RENDERING ---------- */
async function renderPage(num) {
    if (!pdfDoc) return;
    currentPage = num;

    // Cancel previous render task if any
    if (renderTask) renderTask.cancel();

    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: zoomScale, rotation: rotation });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    
    // Quality Optimization: Use device pixel ratio for super-sharp text
    const dpr = window.devicePixelRatio || 1;
    canvas.height = viewport.height * dpr;
    canvas.width = viewport.width * dpr;
    canvas.style.height = viewport.height + "px";
    canvas.style.width = viewport.width + "px";
    context.scale(dpr, dpr);

    const stage = document.getElementById("canvas-stage");
    stage.innerHTML = ''; // Clean old page
    stage.appendChild(canvas);

    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };

    renderTask = page.render(renderContext);
    
    // UI Updates
    document.getElementById("page-indicator-top").innerText = `Page ${num} of ${pdfDoc.numPages}`;
    document.getElementById("page-slider").value = num;
    document.getElementById("bubble-tip").innerText = num;
}

/* ---------- INTERACTION LOGIC ---------- */
window.handleViewportClick = (e) => {
    // If clicking the very top or bottom, ignore (they have buttons)
    if (e.clientY < 80 || e.clientY > window.innerHeight - 80) return;

    // Central Toggle for UI
    isUIVisible = !isUIVisible;
    document.body.classList.toggle("ui-hidden", !isUIVisible);
};

window.navPage = (dir) => {
    let next = dir === 'next' ? currentPage + 1 : currentPage - 1;
    if (next > 0 && next <= pdfDoc.numPages) {
        renderPage(next);
        document.getElementById("viewport").scrollTop = 0;
    }
};

window.adjustZoom = (delta) => {
    zoomScale = Math.min(Math.max(zoomScale + delta, 0.5), 4.0);
    document.getElementById("zoom-val").innerText = Math.round(zoomScale * 100) + "%";
    renderPage(currentPage);
};

/* ---------- SETTINGS & THEMES ---------- */
window.toggleSettings = (show = true) => {
    document.getElementById("settings-panel").classList.toggle("open", show);
    document.getElementById("modal-overlay").style.display = show ? "block" : "none";
};

window.setTheme = (t) => {
    document.body.className = `theme-${t} ui-visible`;
    toggleSettings(false);
};

window.rotateCanvas = () => {
    rotation = (rotation + 90) % 360;
    renderPage(currentPage);
};

window.toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
};

/* ---------- SCRUB BAR SLIDER ---------- */
const slider = document.getElementById("page-slider");
const bubble = document.getElementById("bubble-tip");

slider.oninput = function() {
    const val = parseInt(this.value);
    bubble.innerText = val;
    bubble.style.display = "block";
    const percent = (val - 1) / (this.max - 1);
    bubble.style.left = `calc(${percent * 100}% + (${8 - percent * 16}px))`;
};

slider.onchange = function() {
    renderPage(parseInt(this.value));
    bubble.style.display = "none";
};

/* ---------- BOOT ---------- */
document.addEventListener("DOMContentLoaded", initReader);
