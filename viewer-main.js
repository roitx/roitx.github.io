/* =================================================================
   ROITX ELITE VIEWER v12.0 — ULTIMATE SECURE & PRODUCTIVITY SUITE
   ================================================================= */

// PDF.js Worker Setup
const pdfjsVersion = pdfjsLib.version || '2.16.105'; 
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

let isPresentationMode = false;
let isAnimating = false;
let viewMode = 'flip';
let isDualPage = false;

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

// Search & TTS State
let searchMatches = [];
let currentSearchIndex = -1;
let synth = window.speechSynthesis;
let isSpeaking = false;

// Auto-scroll State
let autoScrollInterval = null;
let isAutoScrolling = false;

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

    window.addEventListener('blur', () => { document.body.style.filter = "blur(25px)"; });
    window.addEventListener('focus', () => { document.body.style.filter = "none"; });
    
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            document.body.style.filter = "blur(25px)";
        } else {
            document.body.style.filter = "none";
        }
    });
}

function cleanTitleString(str) {
    if (!str || typeof str !== 'string') return "";
    return str.replace(/[^\w\s]/gi, '').toLowerCase().trim();
}


// SECURE VERIFICATION: Checks Supabase DB & Local Storage
async function verifyPurchaseStatusLocallyOrDB(rawPath, docName) {
    let purchasedList = JSON.parse(localStorage.getItem("purchasedFiles") || "[]");
    let userPurchases = JSON.parse(localStorage.getItem("userPurchasedNotes") || "[]");
    
    const cleanDoc = cleanTitleString(docName);

    if (purchasedList.includes(rawPath) || userPurchases.some(lp => cleanTitleString(lp.title) === cleanDoc)) {
        return true;
    }

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

// MODAL FOR NEXT PAGE & UNLOCK RESTRICTION
function showPurchaseRequiredModal() {
    let existingModal = document.getElementById("purchaseRequiredModal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "purchaseRequiredModal";
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999; animation: fadeIn 0.2s ease-in-out;
    `;

    modal.innerHTML = `
        <div style="background: #161b26; border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; padding: 28px; max-width: 330px; text-align: center; color: #fff; box-shadow: 0 25px 50px rgba(0,0,0,0.6);">
            <div style="font-size: 42px; margin-bottom: 12px;">🔒</div>
            <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700;">Purchase Required</h3>
            <p style="font-size: 14px; color: #a0aec0; margin: 0 0 24px 0; line-height: 1.5;">
                Ise poora padhne aur access karne ke liye aapko is Premium Note ko purchase karna padega.
            </p>
            <div style="display: flex; gap: 12px;">
                <button onclick="document.getElementById('purchaseRequiredModal').remove()" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.08); border: none; border-radius: 12px; color: #fff; font-weight: 600; cursor: pointer;">Close</button>
                <button onclick="window.location.href='premium-notes.html'" style="flex: 1; padding: 12px; background: #3182ce; border: none; border-radius: 12px; color: #fff; font-weight: 600; cursor: pointer;">Buy Now</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function trackActivityLocally(fileData, isDownloaded = false, isUserPurchased = false) {
    try {
        let recent = JSON.parse(localStorage.getItem("recentFiles") || "[]");
        let downloads = JSON.parse(localStorage.getItem("downloadedFiles") || "[]");

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
            isPurchased: isUserPurchased,
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
    updateProgressUI(pageNo);
}

function updateProgressUI(pageNo) {
    if (!pdfDoc) return;
    const isPremiumNote = params.get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("premium") || rawPath.toLowerCase().includes("locked")));
    
    // Page Top Header Info update fix[span_1](start_span)[span_1](end_span)
    const indicator = document.getElementById("page-indicator-top");
    if (indicator) {
        const totalText = (isPremiumNote && !verifyPurchaseStatusLocallyOrDB(rawPath, docName || "")) ? "1 (Preview)" : pdfDoc.numPages;
        indicator.innerText = `Page ${pageNo} of ${totalText}`;
    }

    const percent = Math.round((pageNo / pdfDoc.numPages) * 100);
    const progressEl = document.getElementById("progress-percent");
    if (progressEl) progressEl.innerText = `${percent}%`;
    checkBookmarkState(pageNo);
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
        const titleEl = document.getElementById("doc-title");
        if (titleEl) {
            titleEl.innerText = "No File Selected";
            titleEl.setAttribute("title", "No File Selected");
        }
        return;
    }

    // 1. Path aur Title Setup
    let finalPath = rawPath.includes("/") ? rawPath : `notes/${rawPath}`;
    const displayTitle = docName || "Loading Document...";

    // 2. DOM Title & Click/Tap Event Setup
    const titleEl = document.getElementById("doc-title");

    if (titleEl) {
        titleEl.innerText = displayTitle;
        titleEl.setAttribute("title", displayTitle);

        titleEl.onclick = null; 
        let hideTimer;

        titleEl.onclick = (e) => {
            e.stopPropagation();
            clearTimeout(hideTimer);

            titleEl.classList.toggle('show-full-title');

            if (titleEl.classList.contains('show-full-title')) {
                hideTimer = setTimeout(() => {
                    titleEl.classList.remove('show-full-title');
                }, 4000);
            }
        };
    }

    // Global Click Listener to Close Expanded Title Card
    document.addEventListener('click', () => {
        if (titleEl) titleEl.classList.remove('show-full-title');
    });

    // 3. Supabase File Download Logic
    try {
        const { data, error } = await window.supabaseClient.storage.from("admin-files").download(finalPath);
        
        if (error) {
            if (finalPath.toLowerCase().includes("refbooks")) {
                const alt = finalPath.includes("refbooks") ? finalPath.replace("refbooks", "Refbooks") : finalPath.replace("Refbooks", "refbooks");
                const retry = await window.supabaseClient.storage.from("admin-files").download(alt);
                if (!retry.error) { 
                    startEngine(retry.data); 
                    return; 
                }
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

    const isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");

    trackActivityLocally({
        title: docName || "PDF Document",
        url: rawPath,
        meta: "Notes Viewer",
        isPremium: isPremiumNote
    }, false, isPurchased);

    // DOWNLOAD TRIGGER PROTECTION
    const dl = document.getElementById("download-trigger");
    if (dl) { 
        dl.removeAttribute("href"); 
        dl.onclick = async (e) => {
            e.preventDefault();

            if (isPremiumNote && !isPurchased) {
                showPurchaseRequiredModal();
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
                isPremium: isPremiumNote
            }, true, isPurchased);

            alert("📥 Note successfully downloaded!");
        };
    }

    pdfDoc = await pdfjsLib.getDocument(currentBlobUrl).promise;

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
    loadTOC();
    document.getElementById("master-loader").style.display = "none";
    setupPinchAndPanEngine();
    setupHighlightSelectionListener();
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
        usePortrait: !isDualPage,
        mobileScrollSupport: false,
        flippingTime: 600,
        drawShadow: true,
        clickEventForward: false
    });

    pageFlipInstance.loadFromHTML(document.querySelectorAll(".page-flip-page"));

    // PAGE FLIP & NEXT PAGE PURCHASE CHECK
    pageFlipInstance.on("flip", (e) => {
        const newPageNum = e.data + 1;
        
        if (isPremium && !isPurchased && newPageNum > 1) {
            showPurchaseRequiredModal();
            pageFlipInstance.flip(0); // Cancel flip and return to page 1
            return;
        }

        currentPage = newPageNum;
        playPageTurnSound();
        savePageProgress(currentPage);

        const slider = document.getElementById("page-slider");
        if (slider) slider.value = currentPage;

        lazyRenderPagesAround(currentPage, maxPages);
    });

    const savedPage = getSavedPageProgress();
    const targetPage = (savedPage > maxPages) ? 1 : savedPage;
    currentPage = targetPage;
    
    // Header & local state auto sync execution[span_2](start_span)[span_2](end_span)
    savePageProgress(currentPage);

    const slider = document.getElementById("page-slider");
    if (slider) slider.value = targetPage;

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

        // renderSingleCanvasPage() ke andar Canvas Render ke baad use karein:
ctx.save();
// Canvas ke exact screen center point par translate karein
const centerX = (canvas.width / dpr) / 2;
const centerY = (canvas.height / dpr) / 2;

ctx.translate(centerX, centerY);
ctx.rotate(-45 * Math.PI / 180); // 45 degree angle

// Font styling
ctx.font = "bold 22px Inter, system-ui, sans-serif";
ctx.fillStyle = "rgba(0, 0, 0, 0.12)"; // Soft, secure contrast
ctx.textAlign = "center";
ctx.textBaseline = "middle";

// Watermark Text Render
ctx.fillText("ROITX SECURE • DO NOT SHARE", 0, 0);
ctx.restore();

        pageDiv.innerHTML = '';
        pageDiv.appendChild(canvas);
        applySavedHighlightsToPage(pageNum, ctx, viewport);
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

/* =================================================================
   TABLE OF CONTENTS (TOC)
   ================================================================= */
async function loadTOC() {
    const tocList = document.getElementById("toc-list");
    if (!tocList) return;
    try {
        const outline = await pdfDoc.getOutline();
        if (!outline || outline.length === 0) {
            tocList.innerHTML = `<p class="empty-msg">No chapters found in outline.</p>`;
            return;
        }
        tocList.innerHTML = '';
        for (const item of outline) {
            const div = document.createElement("div");
            div.className = "toc-item";
            div.innerText = item.title;
            div.onclick = async () => {
                if (item.dest) {
                    const pageRef = typeof item.dest === 'string' ? await pdfDoc.getDestination(item.dest) : item.dest;
                    const pageIdx = await pdfDoc.getPageIndex(pageRef[0]);
                    jumpToPage(pageIdx + 1);
                    toggleTOC(false);
                }
            };
            tocList.appendChild(div);
        }
    } catch (e) {
        if (tocList) tocList.innerHTML = `<p class="empty-msg">Failed to load outline.</p>`;
    }
}

window.toggleTOC = (show) => {
    const sidebar = document.getElementById("toc-sidebar");
    if (!sidebar) return;
    const active = show !== undefined ? show : !sidebar.classList.contains("open");
    sidebar.classList.toggle("open", active);
};

/* =================================================================
   HIGHLIGHTER & LOCAL STORAGE PERSISTENCE
   ================================================================= */
function setupHighlightSelectionListener() {
    document.addEventListener('selectionchange', () => {
        const sel = window.getSelection();
        const bar = document.getElementById("highlight-bar");
        if (!bar) return;
        if (sel && sel.toString().trim().length > 0) {
            bar.classList.add("active");
        } else {
            bar.classList.remove("active");
        }
    });
}

function getStoredHighlights() {
    return JSON.parse(localStorage.getItem(`hl_${rawPath}`) || "{}");
}

window.applyHighlight = (color) => {
    let hlData = getStoredHighlights();
    if (!hlData[currentPage]) hlData[currentPage] = [];
    
    hlData[currentPage].push({ color, time: Date.now() });
    localStorage.setItem(`hl_${rawPath}`, JSON.stringify(hlData));
    
    alert("Highlight saved on this page!");
    const bar = document.getElementById("highlight-bar");
    if (bar) bar.classList.remove("active");
};

window.clearPageHighlights = () => {
    let hlData = getStoredHighlights();
    delete hlData[currentPage];
    localStorage.setItem(`hl_${rawPath}`, JSON.stringify(hlData));
    alert("Highlights cleared!");
    const bar = document.getElementById("highlight-bar");
    if (bar) bar.classList.remove("active");
};

function applySavedHighlightsToPage(pageNum, ctx, viewport) {
    const hlData = getStoredHighlights();
    const pageHighlights = hlData[pageNum];
    if (!pageHighlights || pageHighlights.length === 0) return;

    ctx.save();
    pageHighlights.forEach((hl, i) => {
        ctx.fillStyle = hl.color;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(20, 40 + (i * 30), viewport.width - 40, 24);
    });
    ctx.restore();
}

/* =================================================================
   HANDS-FREE AUTO-SCROLL Engine
   ================================================================= */
window.toggleAutoScroll = () => {
    const btn = document.getElementById("btn-autoscroll");
    if (isAutoScrolling) {
        clearInterval(autoScrollInterval);
        isAutoScrolling = false;
        if (btn) btn.style.color = "inherit";
    } else {
        isAutoScrolling = true;
        if (btn) btn.style.color = "var(--accent)";
        autoScrollInterval = setInterval(() => {
            if (viewMode === 'vertical') {
                const scrollContainer = document.getElementById("vertical-scroll-container");
                if (scrollContainer) scrollContainer.scrollTop += 2;
            } else {
                window.navPage('next');
            }
        }, 3000);
    }
};

/* =================================================================
   SEARCH ENGINE & ACCESSIBILITY TOOLS
   ================================================================= */
window.toggleSearchBox = (show) => {
    const box = document.getElementById("search-bar-container");
    if (!box) return;
    const active = show !== undefined ? show : !box.classList.contains("active");
    box.classList.toggle("active", active);
    if (active) {
        const input = document.getElementById("search-input");
        if (input) input.focus();
    }
};

window.handleSearchKey = async (e) => {
    if (e.key === 'Enter') {
        const query = e.target.value.trim().toLowerCase();
        if (!query) return;

        searchMatches = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ").toLowerCase();
            if (pageText.includes(query)) {
                searchMatches.push(i);
            }
        }
        
        currentSearchIndex = searchMatches.length > 0 ? 0 : -1;
        updateSearchCount();
        if (currentSearchIndex !== -1) jumpToPage(searchMatches[0]);
    }
};

window.navigateSearch = (dir) => {
    if (searchMatches.length === 0) return;
    currentSearchIndex = (currentSearchIndex + dir + searchMatches.length) % searchMatches.length;
    updateSearchCount();
    jumpToPage(searchMatches[currentSearchIndex]);
};

function updateSearchCount() {
    const countEl = document.getElementById("search-count");
    if (countEl) countEl.innerText = searchMatches.length > 0 ? `${currentSearchIndex + 1}/${searchMatches.length}` : "0/0";
}

function getBookmarks() { return JSON.parse(localStorage.getItem(`bookmarks_${rawPath}`) || "[]"); }

window.toggleCurrentPageBookmark = () => {
    let bookmarks = getBookmarks();
    if (bookmarks.includes(currentPage)) {
        bookmarks = bookmarks.filter(p => p !== currentPage);
    } else {
        bookmarks.push(currentPage);
    }
    localStorage.setItem(`bookmarks_${rawPath}`, JSON.stringify(bookmarks));
    checkBookmarkState(currentPage);
};

function checkBookmarkState(pageNo) {
    const btn = document.getElementById("btn-bookmark");
    if (!btn) return;
    const isBookmarked = getBookmarks().includes(pageNo);
    btn.classList.toggle("bookmarked", isBookmarked);
}

window.showSavedBookmarks = () => {
    const bookmarks = getBookmarks();
    
    // Purane Modal ko remove karein agar pehle se open ho
    const existingModal = document.getElementById("bookmarksModal");
    if (existingModal) existingModal.remove();

    if (bookmarks.length === 0) { 
        showToast("⚠️ Is note me abhi koi bookmark save nahi hai."); 
        return; 
    }

    // Modal Outer Container
    const modal = document.createElement("div");
    modal.id = "bookmarksModal";
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px); display: flex; align-items: center;
        justify-content: center; z-index: 999999; animation: bookmarkFadeIn 0.25s ease;
    `;

    // Bookmarks List Buttons Generator
    const bookmarkButtonsHTML = bookmarks.map(page => `
        <button class="bm-page-btn" onclick="jumpToBookmarkedPage(${page})" style="
            background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12);
            color: #fff; padding: 12px 16px; border-radius: 12px; font-weight: 600;
            font-size: 14px; cursor: pointer; display: flex; align-items: center;
            justify-content: space-between; transition: all 0.2s ease;">
            <span>📌 Page ${page}</span>
            <span style="font-size: 12px; color: var(--accent, #6366f1); opacity: 0.9;">Jump ➔</span>
        </button>
    `).join('');

    // Inner Card UI
    modal.innerHTML = `
        <div style="background: #12161f; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; 
                    padding: 24px; width: 90%; max-width: 340px; text-align: center; color: #fff; 
                    box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                    📑 Saved Bookmarks
                </h3>
                <span onclick="document.getElementById('bookmarksModal').remove()" 
                      style="cursor: pointer; font-size: 20px; color: #a0aec0; padding: 4px;">✕</span>
            </div>

            <p style="font-size: 12px; color: #a0aec0; margin: 0 0 16px 0; text-align: left;">
                Kise page par jana chahte hain? Click karke jump karein:
            </p>

            <div style="display: flex; flex-direction: column; gap: 10px; max-height: 240px; overflow-y: auto; padding-right: 4px;">
                ${bookmarkButtonsHTML}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    window.toggleSettings(false);
};

// Bookmarked Page par Direct Jump Handler Helper
window.jumpToBookmarkedPage = (pageNo) => {
    jumpToPage(pageNo);
    const modal = document.getElementById("bookmarksModal");
    if (modal) modal.remove();
};

// Toast Notification Helper (Prompt/Alert alternative)
function showToast(message) {
    const toast = document.createElement("div");
    toast.innerText = message;
    toast.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
        background: rgba(22, 27, 38, 0.95); border: 1px solid rgba(255,255,255,0.15);
        color: #fff; padding: 10px 20px; border-radius: 30px; font-size: 13px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 999999; backdrop-filter: blur(10px);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

window.toggleThumbnailGrid = async (show = true) => {
    const modal = document.getElementById("thumbnail-modal");
    if (!modal) return;
    modal.classList.toggle("open", show);
    if (!show) return;

    const grid = document.getElementById("thumbnail-grid");
    if (!grid || grid.children.length > 0) return;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const card = document.createElement("div");
        card.className = "thumb-card";
        card.onclick = () => { jumpToPage(i); toggleThumbnailGrid(false); };

        const canvas = document.createElement("canvas");
        card.appendChild(canvas);

        const span = document.createElement("span");
        span.innerText = `Page ${i}`;
        card.appendChild(span);
        grid.appendChild(card);

        pdfDoc.getPage(i).then(page => {
            const vp = page.getViewport({ scale: 0.2 });
            canvas.width = vp.width;
            canvas.height = vp.height;
            page.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
        });
    }
};

window.toggleStickyNote = (show = true) => {
    const modal = document.getElementById("notes-modal");
    if (!modal) return;
    modal.classList.toggle("open", show);
    if (show) {
        const pageNumEl = document.getElementById("note-page-num");
        if (pageNumEl) pageNumEl.innerText = currentPage;
        const notes = JSON.parse(localStorage.getItem(`notes_${rawPath}`) || "{}");
        const input = document.getElementById("page-note-input");
        if (input) input.value = notes[currentPage] || "";
    }
};

window.saveStickyNote = () => {
    const input = document.getElementById("page-note-input");
    if (!input) return;
    const val = input.value.trim();
    let notes = JSON.parse(localStorage.getItem(`notes_${rawPath}`) || "{}");
    if (val) notes[currentPage] = val;
    else delete notes[currentPage];
    
    localStorage.setItem(`notes_${rawPath}`, JSON.stringify(notes));
    alert("Note saved!");
    toggleStickyNote(false);
};

window.toggleSpeech = async () => {
    const btn = document.getElementById("btn-tts");
    if (isSpeaking) {
        synth.cancel();
        isSpeaking = false;
        if (btn) btn.style.color = "inherit";
        return;
    }

    const page = await pdfDoc.getPage(currentPage);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(" ");

    if (!pageText.trim()) { alert("No readable text found on this page."); return; }

    const utterance = new SpeechSynthesisUtterance(pageText);
    utterance.onend = () => {
        isSpeaking = false;
        if (btn) btn.style.color = "inherit";
    };

    synth.speak(utterance);
    isSpeaking = true;
    if (btn) btn.style.color = "var(--accent)";
};

window.setViewMode = (mode) => {
    viewMode = mode;
    document.body.className = `theme-${document.body.className.split(' ')[0].replace('theme-', '')} ui-visible mode-${mode}`;
    if (mode === 'vertical') renderVerticalView();
    window.toggleSettings(false);
};

async function renderVerticalView() {
    const container = document.getElementById("vertical-scroll-container");
    if (!container || container.children.length > 0) return;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const wrapper = document.createElement("div");
        wrapper.className = "v-page-wrapper";
        const canvas = document.createElement("canvas");
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);

        const page = await pdfDoc.getPage(i);
        const vp = page.getViewport({ scale: 1.2 });
        canvas.width = vp.width;
        canvas.height = vp.height;
        page.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
    }
}

window.togglePageSpread = () => {
    isDualPage = !isDualPage;
    const btn = document.getElementById("btn-spread-toggle");
    if (btn) btn.innerText = isDualPage ? "Dual Page Mode" : "Single Page Mode";
    alert("Re-loading structure for updated spread mode...");
    location.reload();
};

function jumpToPage(pageNo) {
    if (viewMode === 'vertical') {
        const container = document.getElementById("vertical-scroll-container");
        if (container) {
            const pageEl = container.children[pageNo - 1];
            if (pageEl) pageEl.scrollIntoView({ behavior: 'smooth' });
        }
    } else if (pageFlipInstance) {
        pageFlipInstance.turnToPage(pageNo - 1);
    }
}

window.togglePresentationMode = () => {
    isPresentationMode = !isPresentationMode;
    document.body.classList.toggle("presentation-mode", isPresentationMode);
    if (isPresentationMode) {
        document.body.classList.add("ui-hidden");
        window.toggleSettings(false);
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.body.classList.remove("ui-hidden");
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
};

function updateTransform() {
    const wrapper = document.getElementById("canvas-stage");
    if (wrapper) {
        wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale}) rotate(${rotation}deg)`;
    }
    
    const zoomVal = document.getElementById("zoom-val");
    if (zoomVal) zoomVal.innerText = Math.round(zoomScale * 100) + "%";
}

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
    // FIX: Floating toolbar interactions par background UI toggle ko bypass karo
    if (e.target.closest('#highlight-bar') || e.target.closest('#search-bar-container')) return;
    
    if (isPinching || zoomScale > 1.05) return;
    if (isPresentationMode) {
        if (e.clientX > window.innerWidth / 2) window.navPage('next');
        else window.navPage('prev');
        return;
    }
    if (e.clientY < 80 || e.clientY > window.innerHeight - 80) return;
    isUIVisible = !isUIVisible;
    document.body.classList.toggle("ui-hidden", !isUIVisible);
};


window.navPage = (dir) => {
    if (!pageFlipInstance || isPinching || isAnimating) return;
    isAnimating = true;
    setTimeout(() => { isAnimating = false; }, 550);
    
    if (zoomScale > 1.05) window.resetZoom();

    if (dir === 'next') {
        const isParamPremium = params.get("type") === "premium";
        const isInPaidFolder = rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium"));
        const isPremiumNote = isParamPremium || isInPaidFolder;
        
        let purchasedList = JSON.parse(localStorage.getItem("purchasedFiles") || "[]");
        let isPurchased = purchasedList.includes(rawPath);

        if (isPremiumNote && !isPurchased && currentPage >= 1) {
            showPurchaseRequiredModal();
            return;
        }

        pageFlipInstance.flipNext('bottom');
    } else if (dir === 'prev') {
        pageFlipInstance.flipPrev('top');
    }
};

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
                 const isParamPremium = params.get("type") === "premium";
                 const isInPaidFolder = rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium"));
                 const isPremiumNote = isParamPremium || isInPaidFolder;
                 
                 // FIX: Added local & DB verification consistency check
                 let purchasedList = JSON.parse(localStorage.getItem("purchasedFiles") || "[]");
                 let isPurchased = purchasedList.includes(rawPath);

                 if (isPremiumNote && !isPurchased) {
                     showPurchaseRequiredModal();
                     this.value = 1;
                     pageFlipInstance.turnToPage(0); // FIX: Instantly force reset engine to page 1
                     return;
                 }
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
    document.body.className = `theme-${t} ui-visible mode-${viewMode}`;
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

window.closeAllModals = () => {
    toggleSettings(false);
    toggleThumbnailGrid(false);
    toggleStickyNote(false);
    toggleTOC(false);
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
    if (e.key === 'F5') { e.preventDefault(); window.togglePresentationMode(); }
    if (e.key === 'Escape') {
        if (isPresentationMode) window.togglePresentationMode();
        closeAllModals();
    }
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


