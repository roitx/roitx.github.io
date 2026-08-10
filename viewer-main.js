/* =====================================================
   ROITX ELITE VIEWER — ADVANCED FIXED & UPGRADED ENGINE
   ===================================================== */

function trackActivityLocally(fileData, isDownloaded = false) {
    try {
        let recent = JSON.parse(localStorage.getItem("recentFiles") || "[]");
        let downloads = JSON.parse(localStorage.getItem("downloadedFiles") || "[]");

        if (isDownloaded && !downloads.some(f => f.url === fileData.url)) {
            fileData.timeDownloaded = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            downloads.unshift(fileData);
            localStorage.setItem("downloadedFiles", JSON.stringify(downloads));
        }

        const alreadyDownloaded = downloads.some(f => f.url === fileData.url) || isDownloaded;

        recent = recent.filter(f => f.url !== fileData.url);
        recent.unshift({
            title: fileData.title,
            url: rawPath,
            meta: "Notes Viewer",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloaded: alreadyDownloaded
        });

        recent = recent.slice(0, 10);
        localStorage.setItem("recentFiles", JSON.stringify(recent));
    } catch (e) {
        console.error("Tracking Error: ", e);
    }
}

const params = new URLSearchParams(location.search);
let rawPath = params.get("path"); 
const docName = params.get("name");

let pdfDoc = null;
let currentPage = 1;
let zoomScale = 1.2;
let rotation = 0;
let isUIVisible = true;
let renderTask = null;
let currentBlobUrl = null;

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
    currentBlobUrl = URL.createObjectURL(blob);
    
    trackActivityLocally({
        title: docName || "PDF Document",
        url: rawPath,
        meta: "Notes Viewer"
    }, false);

    const dl = document.getElementById("download-trigger");
    if (dl) { 
        dl.removeAttribute("href"); 
        dl.onclick = async (e) => {
            e.preventDefault();
            
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) {
                alert("Notes download karne ke liye pehle Login karein.");
                sessionStorage.setItem("redirect_after_login", window.location.href);
                window.location.href = "login.html";
                return;
            }

            const fileName = (docName || "document") + ".pdf";
            
            // Standard reliable download method for notes
            const tempLink = document.createElement("a");
            tempLink.href = currentBlobUrl;
            tempLink.download = fileName;
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);

            trackActivityLocally({
                title: docName || "PDF Document",
                url: rawPath,
                meta: "Notes Viewer"
            }, true);
        };
    }

    pdfjsLib.getDocument(currentBlobUrl).promise.then(pdf => {
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
    
    const indicator = document.getElementById("page-indicator-top");
    if (indicator) indicator.innerText = `Page ${num} of ${pdfDoc.numPages}`;
    
    const slider = document.getElementById("page-slider");
    if (slider) slider.value = num;

    const zoomVal = document.getElementById("zoom-val");
    if (zoomVal) zoomVal.innerText = Math.round(zoomScale * 100) + "%";
}

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
