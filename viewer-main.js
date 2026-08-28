/* =================================================================
   ROITX ELITE VIEWER v5.0 — FULL IMAGE ARCHITECTURE ENGINE
   ================================================================= */

function enableContentProtection() {
    document.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('keydown', e => {
        if (e.key === 'PrintScreen' || e.keyCode === 44) {
            e.preventDefault();
            alert("⚠️ Screenshots are disabled for security reasons.");
            return false;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
            e.preventDefault();
            alert("⚠️ Printing is disabled.");
            return false;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
            return false;
        }
        if (e.shiftKey && e.metaKey && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
            return false;
        }
    });

    window.addEventListener('blur', () => { document.body.style.filter = "blur(20px)"; });
    window.addEventListener('focus', () => { document.body.style.filter = "none"; });
}
function trackActivityLocally(fileData, isDownloaded = false) {
    try {
        let recent = JSON.parse(localStorage.getItem("recentFiles") || "[]");
        let downloads = JSON.parse(localStorage.getItem("downloadedFiles") || "[]");
        let purchasedList = JSON.parse(localStorage.getItem("purchasedFiles") || "[]");

        const isPurchasedFromUrl = params.get("purchased") === "true";
        
        // Save purchased status locally if present in URL
        if (isPurchasedFromUrl && !purchasedList.includes(rawPath)) {
            purchasedList.push(rawPath);
            localStorage.setItem("purchasedFiles", JSON.stringify(purchasedList));
        }

        const isAlreadyPurchased = purchasedList.includes(rawPath) || isPurchasedFromUrl;
        const alreadyDownloaded = downloads.some(f => f.url === fileData.url) || isDownloaded;
        const isCurrentPremium = params.get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("premium") || rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked")));

        // 🟢 FIX: Purane viewCount ko preserve aur increment (+1) karne ka logic
        let existingIndex = recent.findIndex(f => f.url === rawPath);
        let viewCount = 1;

        if (existingIndex !== -1) {
            // Agar file pehle se recent me hai, toh count 1 badha do
            viewCount = Number(recent[existingIndex].viewCount || 1) + 1;
            recent.splice(existingIndex, 1); // Delete old entry
        }

        // Top par nayi update entry add karo
        recent.unshift({
            title: fileData.title,
            url: rawPath,
            meta: "Notes Viewer",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloaded: alreadyDownloaded,
            isPremium: isCurrentPremium,
            isPurchased: isAlreadyPurchased, // Persistent Purchase Status
            viewCount: viewCount // 🟢 Counter Value Stored Properly
        });

        recent = recent.slice(0, 10);
        localStorage.setItem("recentFiles", JSON.stringify(recent));
    } catch (e) {
        console.error("Tracking Error: ", e);
    }
}

/* SMART PAGE POSITION MEMORY */
function savePageProgress(pageNo) {
    if (rawPath) {
        localStorage.setItem(`pdf_pos_${rawPath}`, pageNo);
    }
}

function getSavedPageProgress() {
    if (rawPath) {
        return parseInt(localStorage.getItem(`pdf_pos_${rawPath}`)) || 1;
    }
    return 1;
}

const params = new URLSearchParams(location.search);
let rawPath = params.get("path"); 
const docName = params.get("name");

let pdfDoc = null;
let currentPage = 1;
let zoomScale = 1.0;
let rotation = 0;
let panX = 0, panY = 0;
let isUIVisible = true;
let renderTask = null;
let currentBlobUrl = null;
let audioCtx = null;

function playPageTurnSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioCtx) audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const bufferSize = audioCtx.sampleRate * 0.12;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850, audioCtx.currentTime);
        filter.Q.setValueAtTime(1.2, audioCtx.currentTime);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        whiteNoise.start();
    } catch (e) {
        console.warn("Audio Context sound failed", e);
    }
}

async function initReader() {
    enableContentProtection();

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
    
    try {
        const sizeInMB = (blob.size / (1024 * 1024)).toFixed(1);
        const fileSizeEl = document.getElementById("file-size");
        if (fileSizeEl) fileSizeEl.innerText = sizeInMB + " MB";
    } catch (e) {
        console.error("Size calculation error:", e);
    }

    // 1. View activity track (Only views note, marks isDownloaded = false)
    const isParamPremium = params.get("type") === "premium";
    const isInPaidFolder = rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium"));
    const isPremiumNote = isParamPremium || isInPaidFolder;

    trackActivityLocally({
        title: docName || "PDF Document",
        url: rawPath,
        meta: "Notes Viewer",
        isPremium: isPremiumNote
    }, false);

    // 2. Download button logic setup
    const dl = document.getElementById("download-trigger");
    if (dl) { 
        dl.removeAttribute("href"); 
        dl.onclick = async (e) => {
            e.preventDefault();
            
            const isPurchased = params.get("purchased") === "true";
            const isPremium = isPremiumNote;

            if (isPremium && !isPurchased) {
                alert("🔒 Yeh ek Premium Note hai! Bina purchase kiye aap ise download nahi kar sakte.");
                return;
            }

            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) {
                alert("Notes download karne ke liye pehle Login karein.");
                sessionStorage.setItem("redirect_after_login", window.location.href);
                window.location.href = "login.html";
                return;
            }

            const fileName = (docName || "document") + ".pdf";
            
            const tempLink = document.createElement("a");
            tempLink.href = currentBlobUrl;
            tempLink.download = fileName;
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);

            // Marks isDownloaded = true ONLY when user actually clicks download
            trackActivityLocally({
                title: docName || "PDF Document",
                url: rawPath,
                meta: "Notes Viewer",
                isPremium: isPremium
            }, true);

            alert("📥 Note successfully downloaded!");
        };
    }

    pdfjsLib.getDocument(currentBlobUrl).promise.then(pdf => {
        pdfDoc = pdf;

        const isPurchased = params.get("purchased") === "true";
        const isPremium = isPremiumNote;

        let maxAllowedPages = pdf.numPages;
        if (isPremium && !isPurchased) {
            maxAllowedPages = Math.min(pdf.numPages, 1);
        }

        const slider = document.getElementById("page-slider");
        if (slider) {
            slider.max = maxAllowedPages;
            slider.value = 1;
        }
        document.getElementById("master-loader").style.display = "none";
        setupPinchAndPanEngine();
        
        // Auto Resume Last Read Page
        const savedPage = getSavedPageProgress();
        renderPage(savedPage > maxAllowedPages ? 1 : savedPage);
    });
}

function updateTransform() {
    const wrapper = document.getElementById("canvas-stage");
    if (wrapper) {
        wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale}) rotate(${rotation}deg)`;
    }
    
    const zoomVal = document.getElementById("zoom-val");
    if (zoomVal) zoomVal.innerText = Math.round(zoomScale * 100) + "%";
}

async function renderPage(num, playSound = false, direction = 'next') {
    if (!pdfDoc) return;

    const isPurchased = params.get("purchased") === "true";
    const isInPaidFolder = rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("special") || rawPath.toLowerCase().includes("premium"));
    const isParamPremium = params.get("type") === "premium";
    const isPremium = isParamPremium || isInPaidFolder;

    if (isPremium && !isPurchased && num > 1) {
        alert("🔒 Complete document dekhne ke liye is Note ko Unlock / Purchase karein!");
        return;
    }

    if (playSound) playPageTurnSound();

    if (renderTask) {
        try { renderTask.cancel(); } catch(e){}
    }
    
    currentPage = num;
    savePageProgress(num); // Save Reading Progress
    
    const page = await pdfDoc.getPage(num);
    
    const vpElement = document.getElementById("viewport");
    let stage = document.getElementById("canvas-stage");

    const containerWidth = vpElement.clientWidth || window.innerWidth;
    const containerHeight = vpElement.clientHeight || (window.innerHeight - 155);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    
    const scaleX = (containerWidth * 0.94) / unscaledViewport.width;
    const scaleY = (containerHeight * 0.94) / unscaledViewport.height;
    const fitScale = Math.min(scaleX, scaleY);

    const viewport = page.getViewport({ scale: fitScale * 1.5 });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const dpr = window.devicePixelRatio || 1;
    
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.style.height = Math.floor(viewport.height / 1.5) + "px";
    canvas.style.width = Math.floor(viewport.width / 1.5) + "px";

    ctx.scale(dpr, dpr);

    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 0.2s ease-in-out";

    stage.innerHTML = ''; 
    stage.appendChild(canvas);

    requestAnimationFrame(() => {
        canvas.style.opacity = "1";
    });
    
    renderTask = page.render({ canvasContext: ctx, viewport: viewport });
    
    const indicator = document.getElementById("page-indicator-top");
    if (indicator) {
        const totalText = (isPremium && !isPurchased) ? "1 (Preview)" : pdfDoc.numPages;
        indicator.innerText = `Page ${num} of ${totalText}`;
    }
    
    const slider = document.getElementById("page-slider");
    if (slider) slider.value = num;

    updateTransform();
}

/* PINCH ZOOM, PAN & SWIPE ENGINE */
function setupPinchAndPanEngine() {
    const viewport = document.getElementById("viewport");
    let initialDist = 0;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let swipeStartX = 0;

    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        } else if (e.touches.length === 1) {
            swipeStartX = e.touches[0].clientX;
            if (zoomScale > 1) {
                isDragging = true;
                dragStart = { x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY };
            }
        }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
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

    viewport.addEventListener('touchend', (e) => {
        if (zoomScale === 1 && e.changedTouches.length === 1) {
            const diffX = e.changedTouches[0].clientX - swipeStartX;
            if (diffX < -60) window.navPage('next');
            if (diffX > 60) window.navPage('prev');
        }
        initialDist = 0;
        isDragging = false;
    });
}

window.handleViewportClick = (e) => {
    if (e.clientY < 80 || e.clientY > window.innerHeight - 80) return;
    isUIVisible = !isUIVisible;
    document.body.classList.toggle("ui-hidden", !isUIVisible);
};

window.navPage = (dir) => {
    let next = (dir === 'next') ? currentPage + 1 : currentPage - 1;
    if (pdfDoc && next > 0 && next <= pdfDoc.numPages) {
        panX = 0; panY = 0;
        renderPage(next, true, dir);
    }
};

window.adjustZoom = (delta) => {
    zoomScale = Math.min(Math.max(zoomScale + delta, 0.5), 4.0);
    updateTransform();
};

window.resetZoom = () => {
    zoomScale = 1.0;
    rotation = 0;
    panX = 0;
    panY = 0;
    updateTransform();
};

window.rotateCanvas = () => {
    rotation = (rotation + 90) % 360;
    updateTransform();
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
    const fileName = docName || (path ? path.split('/').pop() : "Document");
    
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
        renderPage(parseInt(this.value), true);
    };
}

document.addEventListener("DOMContentLoaded", initReader);

/* KEYBOARD SHORTCUTS */
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') window.navPage('next');
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') window.navPage('prev');
    if (e.key === '+' || e.key === '=') window.adjustZoom(0.2);
    if (e.key === '-') window.adjustZoom(-0.2);
    if (e.key === '0') window.resetZoom();
});

/* DOUBLE TAP TO ZOOM TOGGLE */
let lastTap = 0;
const viewportEl = document.getElementById("viewport");

if (viewportEl) {
    viewportEl.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
            e.preventDefault();
            if (zoomScale > 1.2) {
                window.resetZoom();
            } else {
                zoomScale = 2.0;
                updateTransform();
            }
        }
        lastTap = currentTime;
    });
}
