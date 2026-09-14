/* =====================================================
   ROITX IMAGE ELITE ENGINE — UPGRADED & PERSISTENT
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

        let existingIndex = recent.findIndex(f => f.url === fileData.url);
        let viewCount = 1;

        if (existingIndex !== -1) {
            viewCount = Number(recent[existingIndex].viewCount || 1) + 1;
            recent.splice(existingIndex, 1);
        }

        recent.unshift({
            title: fileData.title,
            url: fileData.url,
            meta: fileData.meta || "Image Viewer",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloaded: alreadyDownloaded,
            viewCount: viewCount
        });

        recent = recent.slice(0, 10);
        localStorage.setItem("recentFiles", JSON.stringify(recent));
    } catch (e) {
        console.error("Tracking Error: ", e);
    }
}

let zoomScale = 1.0;
let rotation = 0;
let flipH = 1, flipV = 1;
let panX = 0, panY = 0;
let isUIVisible = true;
let isHighlightMode = false;
let isMagnifierActive = false;
let magnifierLens = null;

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
            setupKeyboardShortcuts();
            checkBookmarkState();

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

/* TRANSFORM ENGINE WITH PINCH, PAN & FLIP */
function updateTransform() {
    const wrapper = document.getElementById("imageWrapper");
    wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale}) rotate(${rotation}deg) scaleX(${flipH}) scaleY(${flipV})`;
    
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
    flipH = 1;
    flipV = 1;
    panX = 0;
    panY = 0;
    document.getElementById("brightnessSlider").value = 100;
    document.getElementById("contrastSlider").value = 100;
    applyImageFilters();
    updateTransform();
    showToast("Scale & Filters Reset");
};

window.rotateImage = () => {
    rotation = (rotation + 90) % 360;
    updateTransform();
};

window.flipImage = (axis) => {
    if (axis === 'h') flipH *= -1;
    if (axis === 'v') flipV *= -1;
    updateTransform();
};

window.applyImageFilters = () => {
    const b = document.getElementById("brightnessSlider").value;
    const c = document.getElementById("contrastSlider").value;
    img.style.filter = `brightness(${b}%) contrast(${c}%)`;
};

/* 🟢 HIGHLIGHT DIRECTION FIX ENGINE (Coordinate Mapping Matrix) */
function getCanvasRelativeCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Viewport click relative to canvas center
    let normX = (clientX - (rect.left + rect.width / 2)) / zoomScale;
    let normY = (clientY - (rect.top + rect.height / 2)) / zoomScale;

    // Undo horizontal & vertical flips
    normX *= flipH;
    normY *= flipV;

    // Undo Rotation transformation angle
    const rad = (-rotation * Math.PI) / 180;
    const rotX = normX * Math.cos(rad) - normY * Math.sin(rad);
    const rotY = normX * Math.sin(rad) + normY * Math.cos(rad);

    // Map back to canvas native dimensions
    const finalX = rotX + canvas.width / 2;
    const finalY = rotY + canvas.height / 2;

    return { x: finalX, y: finalY };
}

/* BOOKMARK SYSTEM ENGINE */
function getImageBookmarks() {
    return JSON.parse(localStorage.getItem("image_bookmarks") || "[]");
}

window.toggleCurrentBookmark = () => {
    let bookmarks = getImageBookmarks();
    const existingIndex = bookmarks.findIndex(b => b.url === rawPath);
    
    if (existingIndex !== -1) {
        bookmarks.splice(existingIndex, 1);
        showToast("Bookmark removed!");
    } else {
        bookmarks.push({
            title: docName || "Image Document",
            url: rawPath,
            date: new Date().toLocaleDateString()
        });
        showToast("Bookmark saved!");
    }
    
    localStorage.setItem("image_bookmarks", JSON.stringify(bookmarks));
    checkBookmarkState();
};

function checkBookmarkState() {
    const btn = document.getElementById("btn-bookmark");
    if (!btn) return;
    const isBookmarked = getImageBookmarks().some(b => b.url === rawPath);
    btn.style.color = isBookmarked ? "#ffb703" : "inherit";
}

window.showSavedBookmarks = () => {
    const bookmarks = getImageBookmarks();
    
    const existingModal = document.getElementById("bookmarksModal");
    if (existingModal) existingModal.remove();

    if (bookmarks.length === 0) { 
        showToast("⚠️ Koi bookmarked image save nahi hai."); 
        return; 
    }

    const modal = document.createElement("div");
    modal.id = "bookmarksModal";
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px); display: flex; align-items: center;
        justify-content: center; z-index: 999999; animation: bookmarkFadeIn 0.25s ease;
    `;

    const bookmarkButtonsHTML = bookmarks.map(bm => `
        <div style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12);
                    padding: 12px 14px; border-radius: 12px; display: flex; align-items: center;
                    justify-content: space-between; gap: 8px;">
            <div style="text-align: left; overflow: hidden;">
                <div style="font-weight: 600; font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">📌 ${bm.title}</div>
                <div style="font-size: 10px; color: #a0aec0;">Saved: ${bm.date}</div>
            </div>
            <button onclick="openBookmarkedImage('${bm.url}', '${bm.title}')" style="
                background: var(--accent, #007aff); border: none; color: #fff; padding: 6px 12px;
                border-radius: 8px; font-size: 11px; cursor: pointer; font-weight: 600;">Open</button>
        </div>
    `).join('');

    modal.innerHTML = `
        <div style="background: #12161f; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; 
                    padding: 24px; width: 90%; max-width: 360px; text-align: center; color: #fff; 
                    box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0; font-size: 17px; font-weight: 700;">Saved Bookmarks</h3>
                <span onclick="document.getElementById('bookmarksModal').remove()" 
                      style="cursor: pointer; font-size: 20px; color: #a0aec0; padding: 4px;">✕</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; max-height: 260px; overflow-y: auto; padding-right: 4px;">
                ${bookmarkButtonsHTML}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    window.toggleSettings(false);
};

window.openBookmarkedImage = (url, name) => {
    window.location.href = `?path=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
};

/* 🔍 MAGNIFIER LENS TOOL ENGINE */
window.toggleMagnifierMode = () => {
    isMagnifierActive = !isMagnifierActive;
    const btn = document.getElementById("magnifierBtn");

    if (isMagnifierActive) {
        if (isHighlightMode) toggleHighlightMode(); // Turn off highlighter if active
        btn.classList.add("active");
        createMagnifierLens();
        showToast("Magnifier Active");
    } else {
        btn.classList.remove("active");
        if (magnifierLens) magnifierLens.remove();
        showToast("Magnifier Deactivated");
    }
};

function createMagnifierLens() {
    if (document.getElementById("magnifier-glass")) return;
    magnifierLens = document.createElement("div");
    magnifierLens.id = "magnifier-glass";
    magnifierLens.style.cssText = `
        position: fixed; width: 140px; height: 140px; border-radius: 50%;
        border: 3px solid var(--accent, #007aff); box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        pointer-events: none; display: none; z-index: 99999;
        background-repeat: no-repeat; background-color: #12161f;
    `;
    document.body.appendChild(magnifierLens);

    const viewport = document.getElementById("viewport");
    
    const updateMagnifier = (e) => {
        if (!isMagnifierActive) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        magnifierLens.style.display = "block";
        magnifierLens.style.left = `${clientX - 70}px`;
        magnifierLens.style.top = `${clientY - 70}px`;

        const zoomLevel = 2.5;
        magnifierLens.style.backgroundImage = `url('${img.src}')`;
        magnifierLens.style.backgroundSize = `${img.clientWidth * zoomLevel}px ${img.clientHeight * zoomLevel}px`;
        
        const rect = img.getBoundingClientRect();
        const posX = (clientX - rect.left) * zoomLevel - 70;
        const posY = (clientY - rect.top) * zoomLevel - 70;

        magnifierLens.style.backgroundPosition = `-${posX}px -${posY}px`;
    };

    viewport.addEventListener("mousemove", updateMagnifier);
    viewport.addEventListener("touchmove", updateMagnifier);
    viewport.addEventListener("mouseleave", () => { if(magnifierLens) magnifierLens.style.display = "none"; });
}

/* KEYBOARD SHORTCUTS ENGINE */
function setupKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT") return;
        
        switch (e.key.toLowerCase()) {
            case "+": case "=": adjustZoom(0.2); break;
            case "-": case "_": adjustZoom(-0.2); break;
            case "r": rotateImage(); break;
            case "h": toggleHighlightMode(); break;
            case "z": if (e.ctrlKey || e.metaKey) undoLastStroke(); else undoLastStroke(); break;
            case "escape": 
                toggleSettings(false); 
                const modal = document.getElementById("bookmarksModal");
                if (modal) modal.remove();
                if (isMagnifierActive) toggleMagnifierMode();
                break;
            case "arrowleft": panX += 30; updateTransform(); break;
            case "arrowright": panX -= 30; updateTransform(); break;
            case "arrowup": panY += 30; updateTransform(); break;
            case "arrowdown": panY -= 30; updateTransform(); break;
        }
    });
}

/* PINCH ZOOM & PAN ENGINE FOR IMAGE */
function setupPinchAndPanEngine() {
    const viewport = document.getElementById("viewport");
    let initialDist = 0;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };

    viewport.addEventListener('touchstart', (e) => {
        if (isHighlightMode || isMagnifierActive) return;
        
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
        if (isHighlightMode || isMagnifierActive) return;

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
        if (isMagnifierActive) toggleMagnifierMode();
        btn.classList.add("active");
        canvas.classList.add("drawing-active");
        showToast("Highlight Mode Active");
    } else {
        btn.classList.remove("active");
        canvas.classList.remove("drawing-active");
    }
}

function setupCanvasEvents() {
    const startDrawing = (e) => {
        if (!isHighlightMode) return;
        isDrawing = true;
        const coords = getCanvasRelativeCoords(e);
        currentStroke = [coords];
    };

    const draw = (e) => {
        if (!isDrawing || !isHighlightMode) return;
        e.preventDefault();
        const coords = getCanvasRelativeCoords(e);
        currentStroke.push(coords);

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
    if (drawingHistory.length === 0) return;
    drawingHistory.pop();
    redrawCanvas();
    showToast("Stroke Undone");
}

window.clearCanvasAnnotations = () => {
    if (drawingHistory.length === 0) return;
    drawingHistory = [];
    redrawCanvas();
    showToast("Canvas Cleared");
    window.toggleSettings(false);
};

async function downloadImage() {
    if (!window.supabaseClient) {
        console.error("Supabase client initialized nahi hai.");
        return;
    }

    const { data: { session } } = await window.supabaseClient.auth.getSession();

    if (!session) {
        showToast("Download ke liye Login karein.");
        sessionStorage.setItem("redirect_after_login", window.location.href);
        setTimeout(() => window.location.href = "login.html", 1500);
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

function showToast(message) {
    const toast = document.createElement("div");
    toast.innerText = message;
    toast.style.cssText = `
        position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
        background: rgba(18, 22, 31, 0.9); border: 1px solid rgba(255,255,255,0.15);
        color: #fff; padding: 10px 20px; border-radius: 30px; font-size: 13px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 999999; backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px); animation: bookmarkFadeIn 0.2s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
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
