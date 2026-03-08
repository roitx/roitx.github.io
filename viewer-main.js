/* =====================================================
   ROITX ELITE ENGINE — UNIVERSAL MERGED Edition
   Handles: Notes (notes/...) & Refbooks (refbooks/...)
   ===================================================== */

const params = new URLSearchParams(location.search);
const fullPath = params.get("path"); // Pure path from URL
const docName = params.get("name");

let pdfDoc = null,
    currentPage = 1,
    zoomScale = window.innerWidth < 768 ? 1.2 : 1.5,
    rotation = 0,
    isUIVisible = true,
    renderTask = null;

/* ---------- 1. INITIALIZATION & SMART FETCH ---------- */
async function initReader() {
    // 1. Path Validation
    if (!fullPath || fullPath === "null" || fullPath === "undefined") {
        document.getElementById("doc-title").innerText = "No File Selected";
        console.error("Critical: URL parameter 'path' is missing.");
        return;
    }
    
    document.getElementById("doc-title").innerText = docName || "Roitx Reader";

    try {
        // 2. Supabase Connection & Download
        // Bucket name 'admin-files' as per your provided links
        const { data, error } = await window.supabaseClient.storage
            .from("admin-files") 
            .download(fullPath);

        if (error) {
            console.error("Supabase Error:", error);
            document.getElementById("doc-title").innerText = "Load Failed";
            document.getElementById("master-loader").innerHTML = `<p style="color:#ff4444">Error: File not found in storage.</p>`;
            return;
        }

        // 3. Metadata & Offline Download Setup
        const fileSizeMB = (data.size / (1024 * 1024)).toFixed(2);
        document.getElementById("file-size").innerText = `${fileSizeMB} MB`;
        
        const blobUrl = URL.createObjectURL(data);
        const dlBtn = document.getElementById("download-trigger");
        if(dlBtn) {
            dlBtn.href = blobUrl;
            dlBtn.download = (docName || "Document") + ".pdf";
        }

        // 4. PDF.js Engine Boot
        const loadingTask = pdfjsLib.getDocument(blobUrl);
        pdfDoc = await loadingTask.promise;
        
        // UI Setup
        const slider = document.getElementById("page-slider");
        if(slider) slider.max = pdfDoc.numPages;
        document.getElementById("page-indicator-top").innerText = `Page 1 of ${pdfDoc.numPages}`;
        
        // Initial Render
        renderPage(1);
        document.getElementById("master-loader").style.display = "none";
        
    } catch (err) {
        console.error("Global Engine Error:", err);
        document.getElementById("doc-title").innerText = "Engine Error";
    }
}

/* ---------- 2. HD RENDERING ENGINE (ZOOM FIX) ---------- */
async function renderPage(num) {
    if (!pdfDoc) return;
    currentPage = num;

    // Cancel current rendering if user is scrolling fast
    if (renderTask) renderTask.cancel();

    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: zoomScale, rotation: rotation });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    
    // High-DPI Sharpness (Retina Ready)
    const dpr = window.devicePixelRatio || 1;
    canvas.height = viewport.height * dpr;
    canvas.width = viewport.width * dpr;
    canvas.style.height = viewport.height + "px";
    canvas.style.width = viewport.width + "px";
    context.scale(dpr, dpr);

    const stage = document.getElementById("canvas-stage");
    stage.innerHTML = ''; // Clear previous page
    stage.appendChild(canvas);

    // Render Process
    renderTask = page.render({ canvasContext: context, viewport: viewport });
    
    // Sync UI elements
    document.getElementById("page-indicator-top").innerText = `Page ${num} of ${pdfDoc.numPages}`;
    const slider = document.getElementById("page-slider");
    if(slider) slider.value = num;
}

/* ---------- 3. UI INTERACTION & GESTURES ---------- */
window.handleViewportClick = (e) => {
    // Top aur Bottom bars ke clicks ko ignore karein
    if (e.clientY < 80 || e.clientY > window.innerHeight - 80) return;

    isUIVisible = !isUIVisible;
    document.body.classList.toggle("ui-hidden", !isUIVisible);
};

window.navPage = (dir) => {
    let next = (dir === 'next') ? currentPage + 1 : currentPage - 1;
    if (next > 0 && next <= pdfDoc.numPages) {
        renderPage(next);
        document.getElementById("viewport").scrollTop = 0;
    }
};

window.adjustZoom = (delta) => {
    // Zoom limits: 0.5x to 4.0x
    zoomScale = Math.min(Math.max(zoomScale + delta, 0.5), 4.0);
    const zoomDisp = document.getElementById("zoom-val");
    if(zoomDisp) zoomDisp.innerText = Math.round(zoomScale * 100) + "%";
    renderPage(currentPage);
};

/* ---------- 4. SETTINGS & THEMES ---------- */
window.toggleSettings = (show = true) => {
    const panel = document.getElementById("settings-panel");
    const overlay = document.getElementById("modal-overlay");
    if(panel) panel.classList.toggle("open", show);
    if(overlay) overlay.style.display = show ? "block" : "none";
};

window.setTheme = (t) => {
    // Themes: light, sepia, dark, oled
    document.body.className = `theme-${t} ui-visible`;
    toggleSettings(false);
};

window.rotateCanvas = () => {
    rotation = (rotation + 90) % 360;
    renderPage(currentPage);
};

window.toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
        document.exitFullscreen();
    }
};

/* ---------- 5. SCRUB BAR SLIDER LOGIC ---------- */
const slider = document.getElementById("page-slider");
if(slider) {
    slider.oninput = function() {
        // Scrubbing (Optional: Add bubble tooltip logic here)
    };
    slider.onchange = function() {
        renderPage(parseInt(this.value));
    };
}

// Kickstart the engine
document.addEventListener("DOMContentLoaded", initReader);
