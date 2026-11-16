/* =====================================================
   ROITX IMAGE ELITE ENGINE — SECURE DB & LOCAL PURCHASE CHECK
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

// --- SECURE PURCHASE & OWNERSHIP VERIFICATION ---
function cleanTitleString(str) {
    if (!str || typeof str !== 'string') return "";
    return str.replace(/[^\w\s]/gi, '').toLowerCase().trim();
}

async function verifyPurchaseStatusLocallyOrDB(rawPath, docName) {
    let purchasedList = JSON.parse(localStorage.getItem("purchasedFiles") || "[]");
    let userPurchases = JSON.parse(localStorage.getItem("userPurchasedNotes") || "[]");
    
    const cleanDoc = cleanTitleString(docName);

    // 1. Local Storage Check
    if (purchasedList.includes(rawPath) || userPurchases.some(lp => cleanTitleString(lp.title) === cleanDoc)) {
        return true;
    }

    // 2. Direct Supabase Database & Orders Verification (URL tampering bypass proof)
    try {
        if (window.supabaseClient) {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session && session.user && session.user.email) {
                const { data: orders } = await window.supabaseClient
                    .from('user_orders')
                    .select('id, status, note_title')
                    .eq('user_email', session.user.email)
                    .eq('status', 'approved');

                if (orders && orders.length > 0) {
                    const isApprovedInDB = orders.some(o => {
                        const cleanOrderTitle = cleanTitleString(o.note_title);
                        return cleanOrderTitle && (cleanOrderTitle.includes(cleanDoc) || cleanDoc.includes(cleanOrderTitle));
                    });

                    if (isApprovedInDB) {
                        if (!purchasedList.includes(rawPath)) {
                            purchasedList.push(rawPath);
                            localStorage.setItem("purchasedFiles", JSON.stringify(purchasedList));
                        }
                        return true;
                    }
                }
            }
        }
    } catch (err) {
        console.error("Purchase DB Verification Error:", err);
    }

    return false;
}

function showPurchaseRequiredModal() {
    let existingModal = document.getElementById("purchaseRequiredModal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "purchaseRequiredModal";
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(15px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999; animation: fadeIn 0.2s ease-in-out;
    `;

    modal.innerHTML = `
        <div style="background: #161b26; border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; padding: 28px; max-width: 330px; text-align: center; color: #fff; box-shadow: 0 25px 50px rgba(0,0,0,0.6);">
            <div style="font-size: 42px; margin-bottom: 12px;">🔒</div>
            <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700;">Purchase Required</h3>
            <p style="font-size: 14px; color: #a0aec0; margin: 0 0 24px 0; line-height: 1.5;">
                Ise clear dekhne aur access karne ke liye aapko is Premium Material ko purchase karna padega.
            </p>
            <div style="display: flex; gap: 12px;">
                <button onclick="document.getElementById('purchaseRequiredModal').remove()" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.08); border: none; border-radius: 12px; color: #fff; font-weight: 600; cursor: pointer;">Close</button>
                <button onclick="window.location.href='premium-notes.html'" style="flex: 1; padding: 12px; background: #3182ce; border: none; border-radius: 12px; color: #fff; font-weight: 600; cursor: pointer;">Buy Now</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

let zoomScale = 1.0;
let rotation = 0;
let flipH = 1, flipV = 1;
let panX = 0, panY = 0;
let isUIVisible = true;
let isHighlightMode = false;
let isMagnifierActive = false;
let magnifierLens = null;
let previewTimer = null;

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

    const isParamPremium = params.get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium") || rawPath.toLowerCase().includes("pre_")));
    
    // Bucket aur path determination
    const targetBucket = isParamPremium ? "private-premium-files" : "admin-files";
    let finalPath = rawPath;

    if (!isParamPremium && !rawPath.includes("/")) {
        finalPath = `formulas/${rawPath}`;
    }

    document.getElementById("doc-title").innerText = docName || "Image Viewer";
    const isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");

    try {
        const { data, error } = await window.supabaseClient.storage.from(targetBucket).download(finalPath);
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

            if (isParamPremium && !isPurchased) {
                img.style.filter = "none"; 
                previewTimer = setTimeout(async () => {
                    const doubleCheckPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");
                    if (!doubleCheckPurchased) {
                        img.style.filter = "blur(25px)";
                        showPurchaseRequiredModal();
                    }
                }, 5000); 
            } else {
                applyImageFilters();
            }

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

window.addEventListener('beforeunload', () => {
    if (previewTimer) clearTimeout(previewTimer);
});

window.handleViewportClick = async (e) => {
    const isParamPremium = new URLSearchParams(location.search).get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium")));
    const isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");

    if (isParamPremium && !isPurchased) {
        showPurchaseRequiredModal();
        return;
    }

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

function updateTransform() {
    const wrapper = document.getElementById("imageWrapper");
    wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale}) rotate(${rotation}deg) scaleX(${flipH}) scaleY(${flipV})`;
    
    document.getElementById("zoom-val").innerText = Math.round(zoomScale * 100) + "%";
    document.getElementById("zoom-indicator").innerText = Math.round(zoomScale * 100) + "%";
}

window.adjustZoom = async (delta) => {
    const isParamPremium = new URLSearchParams(location.search).get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium")));
    const isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");

    if (isParamPremium && !isPurchased) {
        showPurchaseRequiredModal();
        return;
    }

    zoomScale = Math.min(Math.max(zoomScale + delta, 0.5), 3.5);
    updateTransform();
};

window.resetZoom = async () => {
    const isParamPremium = new URLSearchParams(location.search).get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium")));
    const isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");

    if (isParamPremium && !isPurchased) {
        showPurchaseRequiredModal();
        return;
    }

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
    const isParamPremium = new URLSearchParams(location.search).get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium")));
    
    if (isParamPremium) {
        let purchasedList = JSON.parse(localStorage.getItem("purchasedFiles") || "[]");
        if (!purchasedList.includes(rawPath)) {
            img.style.filter = "none";
            return; 
        }
    } 

    const b = document.getElementById("brightnessSlider").value;
    const c = document.getElementById("contrastSlider").value;
    img.style.filter = `brightness(${b}%) contrast(${c}%)`;
};

function getCanvasRelativeCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let normX = (clientX - (rect.left + rect.width / 2)) / zoomScale;
    let normY = (clientY - (rect.top + rect.height / 2)) / zoomScale;

    const rad = (-rotation * Math.PI) / 180;
    const rotX = normX * Math.cos(rad) - normY * Math.sin(rad);
    const rotY = normX * Math.sin(rad) + normY * Math.cos(rad);

    const finalX = rotX * flipH + canvas.width / 2;
    const finalY = rotY * flipV + canvas.height / 2;

    return { x: finalX, y: finalY };
}

function getImageBookmarks() {
    return JSON.parse(localStorage.getItem("image_bookmarks") || "[]");
}

window.toggleCurrentBookmark = async () => {
    const isParamPremium = new URLSearchParams(location.search).get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium")));
    const isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");

    // Agar premium hai aur purchase nahi kiya, toh bookmark save nahi hoga aur popup aa jayega
    if (isParamPremium && !isPurchased) {
        showPurchaseRequiredModal();
        return;
    }

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
        display: flex; align-items: center; justify-content: center; z-index: 999999;
    `;

    const bookmarkButtonsHTML = bookmarks.map(bm => `
        <div style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); padding: 12px 14px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="text-align: left; overflow: hidden;">
                <div style="font-weight: 600; font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">📌 ${bm.title}</div>
                <div style="font-size: 10px; color: #a0aec0;">Saved: ${bm.date}</div>
            </div>
            <button onclick="openBookmarkedImage('${bm.url}', '${bm.title}')" style="background: var(--accent, #007aff); border: none; color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 11px; cursor: pointer; font-weight: 600;">Open</button>
        </div>
    `).join('');

    modal.innerHTML = `
        <div style="background: #12161f; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 24px; width: 90%; max-width: 360px; text-align: center; color: #fff; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0; font-size: 17px; font-weight: 700;">Saved Bookmarks</h3>
                <span onclick="document.getElementById('bookmarksModal').remove()" style="cursor: pointer; font-size: 20px; color: #a0aec0; padding: 4px;">✕</span>
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

window.toggleMagnifierMode = async () => {
    const isParamPremium = new URLSearchParams(location.search).get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium")));
    const isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");

    if (isParamPremium && !isPurchased) {
        showPurchaseRequiredModal();
        return;
    }

    isMagnifierActive = !isMagnifierActive;
    const btn = document.getElementById("magnifierBtn");

    if (isMagnifierActive) {
        if (isHighlightMode) toggleHighlightMode();
        btn.classList.add("active");
        createMagnifierLens();
        showToast("Magnifier Active");
    } else {
        btn.classList.remove("active");
        destroyMagnifierLens();
        showToast("Magnifier Deactivated");
    }
};

const LENS_SIZE = 150, LENS_MAG = 2.5;
let lensPt = null, lensRAF = 0, lensHandlers = null;

// Screen point -> point inside #imageWrapper (layout px), using the wrapper's live CSS transform
function screenToLocal(cx, cy) {
    const wrap = document.getElementById("imageWrapper");
    const m = new DOMMatrixReadOnly(getComputedStyle(wrap).transform);
    const r = wrap.getBoundingClientRect();
    const det = (m.a * m.d - m.b * m.c) || 1;
    const vx = cx - (r.left + r.width / 2), vy = cy - (r.top + r.height / 2);
    return { m, W: wrap.offsetWidth, H: wrap.offsetHeight,
             x: wrap.offsetWidth / 2 + (m.d * vx - m.c * vy) / det,
             y: wrap.offsetHeight / 2 + (m.a * vy - m.b * vx) / det };
}

function renderLens() {
    lensRAF = 0;
    if (!isMagnifierActive || !magnifierLens || !lensPt) return;
    const cv = magnifierLens, c = cv.getContext("2d"), dpr = cv.width / LENS_SIZE;
    const p = screenToLocal(lensPt.x, lensPt.y), m = p.m, k = LENS_MAG * dpr, mid = cv.width / 2;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = "#12161f";
    c.fillRect(0, 0, cv.width, cv.height);
    c.imageSmoothingQuality = "high";
    // lens pixel = centre + MAG * (same linear transform as the page: zoom, rotate, flip) * (local - touched point)
    c.setTransform(k * m.a, k * m.b, k * m.c, k * m.d, mid - k * (m.a * p.x + m.c * p.y), mid - k * (m.b * p.x + m.d * p.y));
    c.filter = img.style.filter || "none";      // brightness/contrast sliders
    c.drawImage(img, 0, 0, p.W, p.H);
    c.filter = "none";
    drawingHistory.forEach(item => drawSingleStroke(item.points, item.color, c));   // highlights, vector = sharp
    lensRAF = requestAnimationFrame(renderLens); // keeps following pan / zoom / rotate animations
}

function createMagnifierLens() {
    if (document.getElementById("magnifier-glass")) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    magnifierLens = document.createElement("canvas");
    magnifierLens.id = "magnifier-glass";
    magnifierLens.width = magnifierLens.height = LENS_SIZE * dpr;
    magnifierLens.style.cssText = `position:fixed;width:${LENS_SIZE}px;height:${LENS_SIZE}px;border-radius:50%;
        box-shadow:0 0 0 3px var(--accent,#007aff),0 10px 25px rgba(0,0,0,.5);pointer-events:none;display:none;z-index:99999;`;
    document.body.appendChild(magnifierLens);

    const viewport = document.getElementById("viewport");
    viewport.style.touchAction = "none";

    const move = (e) => {
        if (!isMagnifierActive) return;
        const t = e.touches ? e.touches[0] : e;
        if (!t) return;
        if (e.touches && e.cancelable) e.preventDefault();
        lensPt = { x: t.clientX, y: t.clientY };
        let lx = t.clientX - LENS_SIZE / 2;
        let ly = e.touches ? t.clientY - LENS_SIZE - 28 : t.clientY - LENS_SIZE / 2;   // above the finger
        if (e.touches && ly < 8) ly = t.clientY + 28;
        lx = Math.max(4, Math.min(window.innerWidth - LENS_SIZE - 4, lx));
        magnifierLens.style.left = lx + "px";
        magnifierLens.style.top = ly + "px";
        magnifierLens.style.display = "block";
        if (!lensRAF) lensRAF = requestAnimationFrame(renderLens);
    };
    const hide = () => {
        lensPt = null;
        if (magnifierLens) magnifierLens.style.display = "none";
        if (lensRAF) { cancelAnimationFrame(lensRAF); lensRAF = 0; }
    };
    lensHandlers = { move, hide };
    viewport.addEventListener("mousemove", move);
    viewport.addEventListener("mouseleave", hide);
    viewport.addEventListener("touchstart", move, { passive: false });
    viewport.addEventListener("touchmove", move, { passive: false });
    viewport.addEventListener("touchend", hide);
    viewport.addEventListener("touchcancel", hide);
}

function destroyMagnifierLens() {
    const viewport = document.getElementById("viewport");
    if (lensHandlers && viewport) {
        viewport.removeEventListener("mousemove", lensHandlers.move);
        viewport.removeEventListener("mouseleave", lensHandlers.hide);
        viewport.removeEventListener("touchstart", lensHandlers.move);
        viewport.removeEventListener("touchmove", lensHandlers.move);
        viewport.removeEventListener("touchend", lensHandlers.hide);
        viewport.removeEventListener("touchcancel", lensHandlers.hide);
        viewport.style.touchAction = "";
    }
    lensHandlers = null; lensPt = null;
    if (lensRAF) { cancelAnimationFrame(lensRAF); lensRAF = 0; }
    if (magnifierLens) { magnifierLens.remove(); magnifierLens = null; }
}

function setupKeyboardShortcuts() {
    window.addEventListener("keydown", async (e) => {
        if (e.target.tagName === "INPUT") return;
        
        const isParamPremium = new URLSearchParams(location.search).get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium")));
        const isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");

        switch (e.key.toLowerCase()) {
            case "+": case "=": 
                if (isParamPremium && !isPurchased) { showPurchaseRequiredModal(); return; }
                adjustZoom(0.2); 
                break;
            case "-": case "_": 
                if (isParamPremium && !isPurchased) { showPurchaseRequiredModal(); return; }
                adjustZoom(-0.2); 
                break;
            case "r": rotateImage(); break;
            case "h": toggleHighlightMode(); break;
            case "z": undoLastStroke(); break;
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

function setupPinchAndPanEngine() {
    const viewport = document.getElementById("viewport");
    let initialDist = 0;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };

    viewport.addEventListener('touchstart', async (e) => {
        const isParamPremium = new URLSearchParams(location.search).get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium")));
        const isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");

        if (isParamPremium && !isPurchased) {
            e.preventDefault();
            showPurchaseRequiredModal();
            return;
        }

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
    }, { passive: false });

    viewport.addEventListener('touchmove', async (e) => {
        const isParamPremium = new URLSearchParams(location.search).get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium")));
        const isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");

        if (isParamPremium && !isPurchased) {
            e.preventDefault();
            return;
        }

        if (isHighlightMode || isMagnifierActive) return;

        if (e.touches.length === 2 && initialDist > 0) {
            e.preventDefault();
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
    }, { passive: false });

    viewport.addEventListener('touchend', () => {
        initialDist = 0;
        isDragging = false;
    });
}

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
    const startDrawing = async (e) => {
        const isParamPremium = new URLSearchParams(location.search).get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium")));
        const isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");
        if (isParamPremium && !isPurchased) {
            showPurchaseRequiredModal();
            return;
        }
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

function drawSingleStroke(stroke, color, target) {
    const g = target || ctx;
    if (stroke.length < 2) return;
    g.save();
    g.beginPath();
    g.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) g.lineTo(stroke[i].x, stroke[i].y);
    g.globalAlpha = 0.4;
    g.strokeStyle = color;
    g.lineWidth = 14;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.stroke();
    g.restore();
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
    if (!window.supabaseClient) return;

    const isParamPremium = new URLSearchParams(location.search).get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium")));
    const isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");

    if (isParamPremium && !isPurchased) {
        showPurchaseRequiredModal();
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
        opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
