/* =================================================================
   ROITX ELITE VIEWER v8.0 — FULL 3D FLIP (FORWARD & REVERSE FIX)
   ================================================================= */

// PDF.js Worker Setup (Fixes TT: undefined function & lag)
const pdfjsVersion = pdfjsLib.version || '2.16.105'; 
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

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
        
        if (isPurchasedFromUrl && !purchasedList.includes(rawPath)) {
            purchasedList.push(rawPath);
            localStorage.setItem("purchasedFiles", JSON.stringify(purchasedList));
        }

        const isAlreadyPurchased = purchasedList.includes(rawPath) || isPurchasedFromUrl;
        const alreadyDownloaded = downloads.some(f => f.url === fileData.url) || isDownloaded;
        const isCurrentPremium = params.get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("premium") || rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked")));

        let existingIndex = recent.findIndex(f => f.url === rawPath);
        let viewCount = 1;

        if (existingIndex !== -1) {
            viewCount = Number(recent[existingIndex].viewCount || 1) + 1;
            recent.splice(existingIndex, 1);
        }

        recent.unshift({
            title: fileData.title,
            url: rawPath,
            meta: "Notes Viewer",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloaded: alreadyDownloaded,
            isPremium: isCurrentPremium,
            isPurchased: isAlreadyPurchased,
            viewCount: viewCount
        });

        recent = recent.slice(0, 10);
        localStorage.setItem("recentFiles", JSON.stringify(recent));
    } catch (e) {
        console.error("Tracking Error: ", e);
    }
}

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
let currentBlobUrl = null;
let audioCtx = null;
let pageFlipInstance = null;
let renderedPagesMap = new Map();
let globalFitScale = 1.0;
let globalPageW = 0, globalPageH = 0;
let isPinching = false;

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

async function startEngine(blob) {
    currentBlobUrl = URL.createObjectURL(blob);
    
    try {
        const sizeInMB = (blob.size / (1024 * 1024)).toFixed(1);
        const fileSizeEl = document.getElementById("file-size");
        if (fileSizeEl) fileSizeEl.innerText = sizeInMB + " MB";
    } catch (e) {
        console.error("Size calculation error:", e);
    }

    const isParamPremium = params.get("type") === "premium";
    const isInPaidFolder = rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium"));
    const isPremiumNote = isParamPremium || isInPaidFolder;

    trackActivityLocally({
        title: docName || "PDF Document",
        url: rawPath,
        meta: "Notes Viewer",
        isPremium: isPremiumNote
    }, false);

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

            trackActivityLocally({
                title: docName || "PDF Document",
                url: rawPath,
                meta: "Notes Viewer",
                isPremium: isPremium
            }, true);

            alert("📥 Note successfully downloaded!");
        };
    }

    pdfDoc = await pdfjsLib.getDocument(currentBlobUrl).promise;

    const isPurchased = params.get("purchased") === "true";
    let maxAllowedPages = pdfDoc.numPages;
    if (isPremiumNote && !isPurchased) {
        maxAllowedPages = Math.min(pdfDoc.numPages, 1);
    }

    const slider = document.getElementById("page-slider");
    if (slider) {
        slider.max = maxAllowedPages;
        slider.value = 1;
    }

    await setupFlipEngineStructure(maxAllowedPages, isPremiumNote, isPurchased);

    document.getElementById("master-loader").style.display = "none";
    setupPinchAndPanEngine();
}

async function setupFlipEngineStructure(maxPages, isPremium, isPurchased) {
    const bookContainer = document.getElementById("book-container");
    bookContainer.innerHTML = '';

    const vpElement = document.getElementById("viewport");
    const containerWidth = vpElement.clientWidth || window.innerWidth;
    const containerHeight = vpElement.clientHeight || (window.innerHeight - 155);

    const firstPage = await pdfDoc.getPage(1);
    const unscaledVp = firstPage.getViewport({ scale: 1.0 });

    const scaleY = (containerHeight * 0.92) / unscaledVp.height;
    const scaleX = (containerWidth * 0.92) / unscaledVp.width;
    globalFitScale = Math.min(scaleX, scaleY);

    globalPageW = Math.floor(unscaledVp.width * globalFitScale);
    globalPageH = Math.floor(unscaledVp.height * globalFitScale);

    for (let i = 1; i <= maxPages; i++) {
        const pageDiv = document.createElement("div");
        pageDiv.className = "page-flip-page";
        pageDiv.dataset.pageNum = i;
        
        const placeholder = document.createElement("div");
        placeholder.className = "page-loader-placeholder";
        placeholder.innerText = `Loading Page ${i}...`;
        pageDiv.appendChild(placeholder);

        bookContainer.appendChild(pageDiv);
    }

    pageFlipInstance = new St.PageFlip(bookContainer, {
        width: globalPageW,
        height: globalPageH,
        size: "fixed",
        minWidth: 200,
        maxWidth: 1000,
        minHeight: 300,
        maxHeight: 1200,
        maxShadowOpacity: 0.3,
        showCover: true,
        usePortrait: true,
        mobileScrollSupport: false,
        flippingTime: 600,
        drawShadow: true,
        clickEventForward: false
    });

    pageFlipInstance.loadFromHTML(document.querySelectorAll(".page-flip-page"));

    pageFlipInstance.on("flip", (e) => {
        const newPageNum = e.data + 1;
        
        if (isPremium && !isPurchased && newPageNum > 1) {
            alert("🔒 Complete document dekhne ke liye is Note ko Unlock / Purchase karein!");
            pageFlipInstance.flip(0);
            return;
        }

        currentPage = newPageNum;
        playPageTurnSound();
        savePageProgress(currentPage);

        const indicator = document.getElementById("page-indicator-top");
        if (indicator) {
            const totalText = (isPremium && !isPurchased) ? "1 (Preview)" : maxPages;
            indicator.innerText = `Page ${currentPage} of ${totalText}`;
        }

        const slider = document.getElementById("page-slider");
        if (slider) slider.value = currentPage;

        lazyRenderPagesAround(currentPage, maxPages);
    });

    const savedPage = getSavedPageProgress();
    const targetPage = (savedPage > maxPages) ? 1 : savedPage;
    
    await renderSingleCanvasPage(targetPage);
    lazyRenderPagesAround(targetPage, maxPages);

    if (targetPage > 1) {
        setTimeout(() => pageFlipInstance.flip(targetPage - 1), 200);
    }
}

async function renderSingleCanvasPage(pageNum) {
    if (renderedPagesMap.has(pageNum)) return;

    const pageDiv = document.querySelector(`.page-flip-page[data-page-num="${pageNum}"]`);
    if (!pageDiv) return;

    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: globalFitScale * 1.5 });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { alpha: false });
        const dpr = window.devicePixelRatio || 1;

        canvas.height = Math.floor(viewport.height * dpr);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.style.width = globalPageW + "px";
        canvas.style.height = globalPageH + "px";

        ctx.scale(dpr, dpr);
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        pageDiv.innerHTML = '';
        pageDiv.appendChild(canvas);
        renderedPagesMap.set(pageNum, true);
    } catch (e) {
        console.error(`Page ${pageNum} render error:`, e);
    }
}

function lazyRenderPagesAround(current, maxPages) {
    const range = [current - 1, current, current + 1, current + 2];
    range.forEach(p => {
        if (p >= 1 && p <= maxPages) {
            renderSingleCanvasPage(p);
        }
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

/* HIGH-PRECISION PINCH ZOOM & GESTURE CONFLICT RESOLVER */
function setupPinchAndPanEngine() {
    const viewport = document.getElementById("viewport");
    let initialDist = 0;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };

    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            isPinching = true;
            initialDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            e.stopPropagation();
        } else if (e.touches.length === 1 && zoomScale > 1.05) {
            isDragging = true;
            dragStart = { x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY };
            e.stopPropagation();
        }
    }, { capture: true, passive: false });

    viewport.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && initialDist > 0) {
            e.preventDefault();
            e.stopPropagation();
            
            const currentDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const delta = currentDist / initialDist;
            
            const newScale = Math.min(Math.max(zoomScale * delta, 1.0), 4.0);
            if (newScale === 1.0) {
                panX = 0;
                panY = 0;
            }
            zoomScale = newScale;
            updateTransform();
            initialDist = currentDist;
        } else if (e.touches.length === 1 && isDragging && zoomScale > 1.05) {
            e.preventDefault();
            e.stopPropagation();
            panX = e.touches[0].clientX - dragStart.x;
            panY = e.touches[0].clientY - dragStart.y;
            updateTransform();
        }
    }, { capture: true, passive: false });

    viewport.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            initialDist = 0;
            setTimeout(() => { isPinching = false; }, 100);
        }
        if (e.touches.length === 0) {
            isDragging = false;
        }
    });
}

window.handleViewportClick = (e) => {
    if (isPinching || zoomScale > 1.05) return;
    if (e.clientY < 80 || e.clientY > window.innerHeight - 80) return;
    isUIVisible = !isUIVisible;
    document.body.classList.toggle("ui-hidden", !isUIVisible);
};

/* GUARANTEED 3D REVERSE & FORWARD PAGE NAVIGATION */
window.navPage = (dir) => {
    if (!pageFlipInstance || isPinching) return;
    
    if (zoomScale > 1.05) window.resetZoom();

    if (dir === 'next') {
        pageFlipInstance.flipNext('bottom');
    } else if (dir === 'prev') {
        pageFlipInstance.flipPrev('top');
    }
};

/* COMBINED SLIDER NAVIGATION HANDLER WITH REAL 3D ANIMATION */
const pageSlider = document.getElementById("page-slider");
if (pageSlider) {
    const bubble = document.getElementById("bubble-tip");
    pageSlider.oninput = function() {
        if (bubble) {
            bubble.innerText = this.value;
            bubble.style.display = "block";
            bubble.style.left = `${(this.value / this.max) * 100}%`;
        }
    };
    pageSlider.onchange = function() {
        if (bubble) bubble.style.display = "none";
        if (pageFlipInstance) {
            if (zoomScale > 1.05) window.resetZoom();
            const targetIndex = parseInt(this.value) - 1;
            const currentIndex = pageFlipInstance.getCurrentPageIndex();
            
            if (targetIndex < currentIndex) {
                 pageFlipInstance.flipPrev('top');
            } else if (targetIndex > currentIndex) {
                 pageFlipInstance.flipNext('bottom');
            }
        }
    };
}

window.adjustZoom = (delta) => {
    zoomScale = Math.min(Math.max(zoomScale + delta, 1.0), 4.0);
    if (zoomScale === 1.0) { panX = 0; panY = 0; }
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
        if (isPinching) return;
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
