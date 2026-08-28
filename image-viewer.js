/* =====================================================
   ROITX IMAGE ELITE — ENGINE (SUPABASE + CANVAS ANNOTATOR)
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

        // 🟢 FIX: Purani entry dhoond kar viewCount increment (+1) karne ka logic
        let existingIndex = recent.findIndex(f => f.url === fileData.url);
        let viewCount = 1;

        if (existingIndex !== -1) {
            // Purane view count me 1 add karein
            viewCount = Number(recent[existingIndex].viewCount || 1) + 1;
            recent.splice(existingIndex, 1); // Old record clear karein
        }

        // Top par latest open time aur count ke saath save karein
        recent.unshift({
            title: fileData.title,
            url: fileData.url,
            meta: fileData.meta || "Image Viewer",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloaded: alreadyDownloaded,
            viewCount: viewCount // 🟢 View Count perfectly tracked
        });

        recent = recent.slice(0, 10);
        localStorage.setItem("recentFiles", JSON.stringify(recent));
    } catch (e) {
        console.error("Tracking Error: ", e);
    }
}

let zoomScale = 1.0;
let rotation = 0;
let panX = 0, panY = 0;
let isUIVisible = true;
let isHighlightMode = false;

let canvas, ctx, img;
let drawingHistory = [];
let isDrawing = false;
let currentStroke = [];

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
            setupPinchAndPanEngine();

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

/* TRANSFORM ENGINE WITH PINCH & PAN SUPPORT */
function updateTransform() {
    const wrapper = document.getElementById("imageWrapper");
    wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale}) rotate(${rotation}deg)`;
    
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
    panX = 0;
    panY = 0;
    updateTransform();
};

window.rotateImage = () => {
    rotation = (rotation + 90) % 360;
    updateTransform();
};

/* PINCH ZOOM & PAN ENGINE FOR IMAGE */
function setupPinchAndPanEngine() {
    const viewport = document.getElementById("viewport");
    let initialDist = 0;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };

    viewport.addEventListener('touchstart', (e) => {
        if (isHighlightMode) return;
        
        if (e.touches.length === 2) {
            initialDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        } else if (e.touches.length === 1 && zoomScale > 1) {
            isDragging = true;
            dragStart = { x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY };
        }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
        if (isHighlightMode) return;

        if (e.touches.length === 2 && initialDist > 0) {
            const currentDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const delta = currentDist / initialDist;
            zoomScale = Math.min(Math.max(zoomScale * delta, 0.5), 4.0);
            updateTransform();
            initialDist = currentDist;
        } else if (e.touches.length === 1 && isDragging) {
            panX = e.touches[0].clientX - dragStart.x;
            panY = e.touches[0].clientY - dragStart.y;
            updateTransform();
        }
    }, { passive: true });

    viewport.addEventListener('touchend', () => {
        initialDist = 0;
        isDragging = false;
    });
}

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

async function downloadImage() {
    if (!window.supabaseClient) {
        console.error("Supabase client initialized nahi hai.");
        return;
    }

    const { data: { session } } = await window.supabaseClient.auth.getSession();

    if (!session) {
        alert("Annotated Image download karne ke liye pehle Login karein.");
        sessionStorage.setItem("redirect_after_login", window.location.href);
        window.location.href = "login.html";
        return;
    }

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

    trackActivityLocally({
        title: docName || "Image Asset",
        url: rawPath,
        meta: "Image Viewer"
    }, true);
}

function showError(path) {
    const fileName = docName || (path ? path.split('/').pop() : "Image Document");
    
    const popup = document.createElement('div');
    popup.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: rgba(255, 71, 87, 0.15); color: #ff4757; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 1px solid rgba(255, 71, 87, 0.3);">⚠️</div>
            <div>
                <div style="font-weight: 600; color: #fff; font-size: 13px;">File Not Found</div>
                <div style="font-size: 11px; color: #8a99ad; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fileName}</div>
            </div>
        </div>
    `;
    
    popup.style.cssText = `
        position: fixed; top: 25px; left: 50%; transform: translateX(-50%) translateY(-20px);
        background: rgba(18, 22, 31, 0.85); border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 12px 18px; border-radius: 14px; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
        font-family: 'Inter', sans-serif; z-index: 99999; backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px); opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    
    document.body.appendChild(popup);

    requestAnimationFrame(() => {
        popup.style.opacity = '1';
        popup.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
            window.location.href = "working.html";
        }, 300);
    }, 2000);
}

document.addEventListener("DOMContentLoaded", initImageViewer);
