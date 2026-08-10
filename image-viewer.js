/* =====================================================
   ROITX IMAGE ELITE — ENGINE (SUPABASE + CANVAS ANNOTATOR)
   ===================================================== */

// 1. Activity Tracking Helper Function
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
            url: fileData.url,
            meta: fileData.meta || "Image Viewer",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloaded: alreadyDownloaded
        });

        recent = recent.slice(0, 10);
        localStorage.setItem("recentFiles", JSON.stringify(recent));
    } catch (e) {
        console.error("Tracking Error: ", e);
    }
}

let zoomScale = 1.0;
let rotation = 0;
let isUIVisible = true;
let isHighlightMode = false;

let canvas, ctx, img;
let drawingHistory = [];
let isDrawing = false;
let currentStroke = [];

// Global scope variables taaki download aur view dono me track ho sake
let rawPath = "";
let docName = "";

async function initImageViewer() {
    canvas = document.getElementById("drawCanvas");
    ctx = canvas.getContext("2d");
    img = document.getElementById("mainImage");

    const params = new URLSearchParams(location.search);
    rawPath = params.get("path");
    docName = params.get("name");

    if (!rawPath || rawPath === "null") {
        showError("No File Selected");
        return;
    }

    const finalPath = rawPath.includes("/") ? rawPath : `formulas/${rawPath}`;
    document.getElementById("doc-title").innerText = docName || "Image Viewer";

    try {
        const { data, error } = await window.supabaseClient.storage.from("admin-files").download(finalPath);
        if (error) throw error;

        const url = URL.createObjectURL(data);
        img.src = url;

        img.onload = () => {
            img.style.display = "block";
            canvas.width = img.clientWidth;
            canvas.height = img.clientHeight;
            document.getElementById("master-loader").style.display = "none";
            setupCanvasEvents();

            // ⚡ Track View Activity (Image Opened)
            trackActivityLocally({
                title: docName || "Image Asset",
                url: rawPath,
                meta: "Image Viewer"
            }, false);
        };
    } catch (err) {
        showError(finalPath);
    }
}

/* UI INTERACTIONS & SETTINGS */
window.handleViewportClick = (e) => {
    if (e.clientY < 80 || e.clientY > window.innerHeight - 80) return;
    isUIVisible = !isUIVisible;
    document.body.classList.toggle("ui-hidden", !isUIVisible);
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

/* TRANSFORM ENGINE */
function updateTransform() {
    const wrapper = document.getElementById("imageWrapper");
    wrapper.style.transform = `scale(${zoomScale}) rotate(${rotation}deg)`;
    
    document.getElementById("zoom-val").innerText = Math.round(zoomScale * 100) + "%";
    document.getElementById("zoom-indicator").innerText = Math.round(zoomScale * 100) + "%";
}

window.adjustZoom = (delta) => {
    zoomScale = Math.min(Math.max(zoomScale + delta, 0.5), 3.5);
    updateTransform();
};

window.resetZoom = () => {
    zoomScale = 1.0;
    rotation = 0;
    updateTransform();
};

window.rotateImage = () => {
    rotation = (rotation + 90) % 360;
    updateTransform();
};

/* HIGHLIGHTING CANVAS ENGINE */
function toggleHighlightMode() {
    isHighlightMode = !isHighlightMode;
    const btn = document.getElementById("highlightBtn");
    
    if (isHighlightMode) {
        btn.classList.add("active");
        canvas.classList.add("drawing-active");
    } else {
        btn.classList.remove("active");
        canvas.classList.remove("drawing-active");
    }
}

function setupCanvasEvents() {
    const getCoords = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const startDrawing = (e) => {
        if (!isHighlightMode) return;
        isDrawing = true;
        const { x, y } = getCoords(e);
        currentStroke = [{ x, y }];
    };

    const draw = (e) => {
        if (!isDrawing || !isHighlightMode) return;
        e.preventDefault();
        const { x, y } = getCoords(e);
        currentStroke.push({ x, y });

        redrawCanvas();
        drawSingleStroke(currentStroke, document.getElementById("penColor").value);
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        isDrawing = false;
        if (currentStroke.length > 0) {
            drawingHistory.push({
                points: currentStroke,
                color: document.getElementById("penColor").value
            });
        }
        currentStroke = [];
    };

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);

    canvas.addEventListener("touchstart", startDrawing);
    canvas.addEventListener("touchmove", draw);
    canvas.addEventListener("touchend", stopDrawing);
}

function drawSingleStroke(stroke, color) {
    if (stroke.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);

    for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
    }

    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingHistory.forEach(item => {
        drawSingleStroke(item.points, item.color);
    });
}

function undoLastStroke() {
    drawingHistory.pop();
    redrawCanvas();
}

/* EXPORT / DOWNLOAD WITH AUTH CONTROL */
async function downloadImage() {
    if (!window.supabaseClient) {
        console.error("Supabase client initialized nahi hai.");
        return;
    }

    // 1. Session verify karein
    const { data: { session } } = await window.supabaseClient.auth.getSession();

    if (!session) {
        alert("Annotated Image download karne ke liye pehle Login karein.");
        sessionStorage.setItem("redirect_after_login", window.location.href);
        window.location.href = "login.html";
        return;
    }

    // 2. Logged-in user ke liye canvas + image merge aur export
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = img.naturalWidth;
    exportCanvas.height = img.naturalHeight;

    const exportCtx = exportCanvas.getContext("2d");
    exportCtx.drawImage(img, 0, 0);
    exportCtx.drawImage(canvas, 0, 0, img.naturalWidth, img.naturalHeight);

    const fileName = `roitx_${docName || "annotated"}.png`;
    
    const link = document.createElement("a");
    link.download = fileName;
    link.href = exportCanvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // ⚡ Track Download Activity (Marked as Downloaded with correct path)
    trackActivityLocally({
        title: docName || "Image Asset",
        url: rawPath,
        meta: "Image Viewer"
    }, true);
}

function showError(path) {
    document.getElementById("doc-title").innerText = "Load Failed";
    document.getElementById("master-loader").innerHTML = `<div style="color:#ff4444; text-align:center; padding:20px;">
        <h3>Image Not Found</h3><p style="font-size:12px; opacity:0.6;">Path: ${path}</p>
    </div>`;
}

document.addEventListener("DOMContentLoaded", initImageViewer);
