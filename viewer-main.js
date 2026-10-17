/* =================================================================
   ROITX ELITE VIEWER v12.8 — TURN.JS REAL 3D BOOK FLIP SUITE
   ================================================================= */
// Preload Page Flip Audio from auth folder
const flipAudio = new Audio('auth/flipsound.mp3');
flipAudio.preload = 'auto';

// Sound Settings State (Default: Enabled/true)
let isSoundEnabled = localStorage.getItem('pageFlipSound') !== 'false';

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
    if (rawPath && pageNo > 0 && pageNo <= pdfDoc.numPages) {
        localStorage.setItem(`pdf_pos_${rawPath}`, pageNo);
    }
    updateProgressUI(pageNo);
}

function updateProgressUI(pageNo) {
    if (!pdfDoc) return;
    const actualPage = Math.min(pageNo, pdfDoc.numPages);
    const isPremiumNote = params.get("type") === "premium" || (rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("premium") || rawPath.toLowerCase().includes("locked")));
    
    const indicator = document.getElementById("page-indicator-top");
    if (indicator) {
        const totalText = (isPremiumNote && !verifyPurchaseStatusLocallyOrDB(rawPath, docName || "")) ? "1 (Preview)" : pdfDoc.numPages;
        
        if (isDualPage && actualPage < pdfDoc.numPages) {
            const nextPairPage = actualPage + 1;
            indicator.innerText = `Pages ${actualPage}-${nextPairPage} of ${totalText}`;
        } else {
            indicator.innerText = `Page ${actualPage} of ${totalText}`;
        }
    }

    const percent = Math.round((actualPage / pdfDoc.numPages) * 100);
    const progressEl = document.getElementById("progress-percent");
    if (progressEl) progressEl.innerText = `${percent}%`;

    const slider = document.getElementById("page-slider");
    if (slider && parseInt(slider.value) !== actualPage) {
        slider.value = actualPage;
    }

    checkBookmarkState(actualPage);
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
    if (!isSoundEnabled) return;
    try {
        flipAudio.currentTime = 0;
        flipAudio.play().catch(e => {
            console.warn("Audio play blocked or failed:", e);
        });
    } catch (e) {
        console.warn("Custom sound failed", e);
    }
}

async function initReader() {
    enableContentProtection();

    const toggleSwitch = document.getElementById('sound-toggle-switch');
    if (toggleSwitch) {
        toggleSwitch.classList.toggle('active', isSoundEnabled);
    }

    if (!rawPath || rawPath === "null") {
        const titleEl = document.getElementById("doc-title");
        if (titleEl) {
            titleEl.innerText = "No File Selected";
            titleEl.setAttribute("title", "No File Selected");
        }
        return;
    }

    let finalPath = rawPath.includes("/") ? rawPath : `notes/${rawPath}`;
    const displayTitle = docName || "Loading Document...";

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

    document.addEventListener('click', () => {
        if (titleEl) titleEl.classList.remove('show-full-title');
    });

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

    await setupTurnJSStructure(maxAllowedPages, isPremiumNote, isPurchased);
    loadTOC();
    document.getElementById("master-loader").style.display = "none";
    setupPinchAndPanEngine();
    setupHighlightSelectionListener();
}

async function setupTurnJSStructure(maxPages, isPremium, isPurchased) {
    const bookContainer = $("#book-container");
    
    if (bookContainer.data('turn')) {
        bookContainer.turn('destroy');
    }
    bookContainer.html('');

    const vpElement = document.getElementById("viewport");
    const containerWidth = vpElement.clientWidth || window.innerWidth;
    const containerHeight = vpElement.clientHeight || (window.innerHeight - 155);

    const firstPage = await pdfDoc.getPage(1);
    const unscaledVp = firstPage.getViewport({ scale: 1.0 });

    const scaleY = (containerHeight * 0.92) / unscaledVp.height;
    const scaleX = (containerWidth * 0.92) / (isDualPage ? unscaledVp.width * 2 : unscaledVp.width);
    globalFitScale = Math.min(scaleX, scaleY);

    globalPageW = Math.floor(unscaledVp.width * globalFitScale);
    globalPageH = Math.floor(unscaledVp.height * globalFitScale);

    bookContainer.css({
        width: isDualPage ? globalPageW * 2 : globalPageW,
        height: globalPageH
    });

    // STRICT SECURITY: Agar premium hai aur purchased nahi hai, toh max pages sirf 1 hi honge taaki dual mode me bhi leak na ho
    let effectiveMaxPages = maxPages;
    const isParamPremium = params.get("type") === "premium";
    const isInPaidFolder = rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium"));
    if ((isParamPremium || isInPaidFolder) && !isPurchased) {
        effectiveMaxPages = 1;
    }

    let totalDOMPages = effectiveMaxPages;
    if (isDualPage && totalDOMPages % 2 !== 0) {
        totalDOMPages += 1;
    }

    for (let i = 1; i <= totalDOMPages; i++) {
        const pageDiv = $(`<div class="page-flip-page" data-page-num="${i}"></div>`);
        if (i <= effectiveMaxPages) {
            const placeholder = $(`<div class="page-loader-placeholder">Loading Page ${i}...</div>`);
            pageDiv.append(placeholder);
        } else {
            pageDiv.css("background", "#ffffff");
        }
        bookContainer.append(pageDiv);
    }

    let savedPage = getSavedPageProgress();
    if (savedPage > effectiveMaxPages) savedPage = effectiveMaxPages;
    
    if (isDualPage && savedPage > 1) {
        if (savedPage % 2 === 0) {
            savedPage = savedPage - 1; 
        }
    }

    currentPage = savedPage;
    
    let renderPromises = [renderSingleCanvasPage(currentPage)];
    if (isDualPage && currentPage > 1) {
        renderPromises.push(renderSingleCanvasPage(currentPage - 1));
    }
    if (currentPage < effectiveMaxPages) {
        renderPromises.push(renderSingleCanvasPage(currentPage + 1));
    }
    await Promise.all(renderPromises);
    lazyRenderPagesAround(currentPage, effectiveMaxPages);

    bookContainer.turn({
        width: isDualPage ? globalPageW * 2 : globalPageW,
        height: globalPageH,
        autoCenter: true,
        elevation: 80,
        gradients: true,
        display: isDualPage ? 'double' : 'single',
        page: currentPage,
        when: {
    turning: function(e, page, view) {
        if (page < 1 || page > effectiveMaxPages) {
            e.preventDefault();
            return;
        }
        
        // Manual drag/swipe ya turn par bhi strict block
        const isParamPremium = params.get("type") === "premium";
        const isInPaidFolder = rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium"));
        
        if ((isParamPremium || isInPaidFolder) && !isPurchased && page > 1) {
            e.preventDefault();
            showPurchaseRequiredModal();
            return;
        }

        currentPage = page;
        playPageTurnSound();
        savePageProgress(currentPage);
       

                let turnPromises = [renderSingleCanvasPage(page)];
                if (isDualPage && page > 1) {
                    turnPromises.push(renderSingleCanvasPage(page - 1));
                }
                if (page < effectiveMaxPages) {
                    turnPromises.push(renderSingleCanvasPage(page + 1));
                }
                Promise.all(turnPromises);
                lazyRenderPagesAround(currentPage, effectiveMaxPages);
            }
        }
    });

    savePageProgress(currentPage);
    const slider = document.getElementById("page-slider");
    if (slider) {
        slider.max = effectiveMaxPages;
        slider.value = currentPage;
    }
}

async function activateDualMode(targetPage) {
    isDualPage = true;
    const btn = document.getElementById("btn-spread-toggle");
    if (btn) btn.innerText = "Single Page Mode";

    const isParamPremium = params.get("type") === "premium";
    const isInPaidFolder = rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium"));
    let isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");
    
    let maxPages = pdfDoc ? pdfDoc.numPages : 1;
    if ((isParamPremium || isInPaidFolder) && !isPurchased) {
        maxPages = 1;
        targetPage = 1; // Forcefully restrict to page 1 preview
    }

    let safeTarget = Math.min(targetPage, maxPages);
    if (safeTarget > 1 && safeTarget % 2 === 0) {
        safeTarget = safeTarget - 1;
    }

    currentPage = safeTarget;

    let renderPromises = [renderSingleCanvasPage(currentPage)];
    if (currentPage > 1) {
        renderPromises.pageDiv?.(renderSingleCanvasPage(currentPage - 1));
    }
    if (currentPage < maxPages) {
        renderPromises.push(renderSingleCanvasPage(currentPage + 1));
    }
    await Promise.all(renderPromises);

    setupTurnJSStructure(maxPages, (isParamPremium || isInPaidFolder), isPurchased);
    showToast("📖 Dual Page Book Mode Activated");
}

async function renderSingleCanvasPage(pageNum) {
    if (!pageNum || pageNum > pdfDoc.numPages) return;
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

        ctx.save();
        const centerX = (canvas.width / dpr) / 2;
        const centerY = (canvas.height / dpr) / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((-45 + rotation) * Math.PI / 180);

        ctx.font = "bold 22px Inter, system-ui, sans-serif";
        ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
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
    const range = [current - 3, current - 2, current - 1, current, current + 1, current + 2, current + 3, current + 4];
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
    
    showToast("✨ Highlight saved successfully!");
    const bar = document.getElementById("highlight-bar");
    if (bar) bar.classList.remove("active");
};

window.clearPageHighlights = () => {
    let hlData = getStoredHighlights();
    delete hlData[currentPage];
    localStorage.setItem(`hl_${rawPath}`, JSON.stringify(hlData));
    showToast("🗑️ Page highlights cleared!");
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
   AUTO-SCROLL Engine
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
        showToast(`📌 Bookmark removed from Page ${currentPage}`);
    } else {
        bookmarks.push(currentPage);
        showToast(`🔖 Page ${currentPage} bookmarked successfully! ✨`);
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
    const existingModal = document.getElementById("bookmarksModal");
    if (existingModal) existingModal.remove();

    if (bookmarks.length === 0) { 
        showToast("⚠️ Is note me abhi koi bookmark save nahi hai."); 
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
                Kis page par jana chahte hain? Click karke jump karein:
            </p>

            <div style="display: flex; flex-direction: column; gap: 10px; max-height: 240px; overflow-y: auto; padding-right: 4px;">
                ${bookmarkButtonsHTML}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    window.toggleSettings(false);
};

window.jumpToBookmarkedPage = (pageNo) => {
    jumpToPage(pageNo);
    const modal = document.getElementById("bookmarksModal");
    if (modal) modal.remove();
};

function showToast(message) {
    const oldToast = document.getElementById("roitx-custom-toast");
    if (oldToast) oldToast.remove();

    const toast = document.createElement("div");
    toast.id = "roitx-custom-toast";
    toast.innerText = message;
    toast.style.cssText = `
        position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%) translateY(20px);
        background: rgba(20, 25, 38, 0.95); border: 1px solid rgba(99, 102, 241, 0.4);
        color: #fff; padding: 12px 24px; border-radius: 30px; font-size: 13.5px; font-weight: 500;
        box-shadow: 0 15px 35px rgba(0,0,0,0.6); z-index: 999999; backdrop-filter: blur(12px);
        opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
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
    showToast("📝 Sticky note saved!");
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

    if (!pageText.trim()) { showToast("⚠️ No readable text found on this page."); return; }

    const utterance = new SpeechSynthesisUtterance(pageText);
    utterance.onend = () => {
        isSpeaking = false;
        if (btn) btn.style.color = "inherit";
    };

    synth.speak(utterance);
    isSpeaking = true;
    if (btn) btn.style.color = "var(--accent)";
    showToast("🔊 Reading page aloud...");
};

window.setViewMode = (mode) => {
    viewMode = mode;
    document.body.className = `theme-${document.body.className.split(' ')[0].replace('theme-', '')} ui-visible mode-${mode}`;
    if (mode === 'vertical') {
        renderVerticalView();
    } else if (mode === 'flip') {
        jumpToPage(currentPage);
    }
    window.toggleSettings(false);
};

async function renderVerticalView() {
    const container = document.getElementById("vertical-scroll-container");
    if (!container) return;
    
    if (container.children.length === 0) {
        const isParamPremium = params.get("type") === "premium";
        const isInPaidFolder = rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium"));
        const isPremiumNote = isParamPremium || isInPaidFolder;
        const isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");

        let maxPagesToRender = pdfDoc.numPages;
        if (isPremiumNote && !isPurchased) {
            maxPagesToRender = 1;
        }

        for (let i = 1; i <= maxPagesToRender; i++) {
            const wrapper = document.createElement("div");
            wrapper.className = "v-page-wrapper";
            wrapper.setAttribute("data-page-num", i);
            const canvas = document.createElement("canvas");
            wrapper.appendChild(canvas);
            container.appendChild(wrapper);

            const page = await pdfDoc.getPage(i);
            const vp = page.getViewport({ scale: 1.2 });
            canvas.width = vp.width;
            canvas.height = vp.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        }
    }
    setupVerticalScrollObserver();
}

function setupVerticalScrollObserver() {
    const container = document.getElementById("vertical-scroll-container");
    if (!container) return;
    const wrappers = container.querySelectorAll(".v-page-wrapper");

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const pageNum = parseInt(entry.target.getAttribute("data-page-num"));
                if (pageNum) {
                    currentPage = pageNum;
                    updateProgressUI(currentPage);
                }
            }
        });
    }, { root: container, threshold: 0.35 });

    wrappers.forEach(w => observer.observe(w));
}

// SMART DUAL PAGE MODE TOGGLE WITH CONFIRMATION PROMPT
window.togglePageSpread = async () => {
    window.toggleSettings(false);

    // Strict Security Check: Agar premium note hai aur purchased nahi hai, toh dual page mode enable mat hone do!
    const isParamPremium = params.get("type") === "premium";
    const isInPaidFolder = rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium"));
    let isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");

    if ((isParamPremium || isInPaidFolder) && !isPurchased) {
        showPurchaseRequiredModal();
        return; // Yahin rok do, dual mode on nahi hoga!
    }

    if (isDualPage) {
        isDualPage = false;
        const btn = document.getElementById("btn-spread-toggle");
        if (btn) btn.innerText = "Dual Page Mode";
        applyDualModeState();
        showToast("📄 Single Page Mode Activated");
        return;
    }

    if (currentPage > 1) {
        showDualModePrompt();
    } else {
        activateDualMode(1);
    }
};


function showDualModePrompt() {
    let existingModal = document.getElementById("dualPromptModal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "dualPromptModal";
    modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: center; z-index: 999999;
        animation: fadeIn 0.2s ease-in-out;
    `;

    modal.innerHTML = `
        <div style="background: #161b26; border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; padding: 26px; max-width: 340px; text-align: center; color: #fff; box-shadow: 0 25px 50px rgba(0,0,0,0.6);">
            <div style="font-size: 38px; margin-bottom: 10px;">📖</div>
            <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">Dual Page View Mode</h3>
            <p style="font-size: 13.5px; color: #a0aec0; margin: 0 0 22px 0; line-height: 1.5;">
                Aap abhi <b>Page ${currentPage}</b> par hain. Kya aap shuruat (Page 1) se book view shuru karna chahte hain ya yahin se?
            </p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button id="btnStartFrom1" style="width: 100%; padding: 12px; background: var(--accent, #6366f1); border: none; border-radius: 12px; color: #fff; font-weight: 600; cursor: pointer;">Shuruat (Page 1) se karein</button>
                <button id="btnStartFromCurrent" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; color: #fff; font-weight: 600; cursor: pointer;">Yahin se (Page ${currentPage})</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("btnStartFrom1").onclick = () => {
        modal.remove();
        activateDualMode(1);
    };

    document.getElementById("btnStartFromCurrent").onclick = () => {
        modal.remove();
        let target = currentPage;
        if (target > 1 && target % 2 === 0) {
            target = target - 1;
        }
        activateDualMode(target);
    };
}

async function activateDualMode(targetPage) {
    isDualPage = true;
    const btn = document.getElementById("btn-spread-toggle");
    if (btn) btn.innerText = "Single Page Mode";

    const isParamPremium = params.get("type") === "premium";
    const isInPaidFolder = rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium"));
    let maxPages = pdfDoc ? pdfDoc.numPages : 1;
    if ((isParamPremium || isInPaidFolder) && !verifyPurchaseStatusLocallyOrDB(rawPath, docName || "")) {
        maxPages = 1;
    }

    let safeTarget = Math.min(targetPage, maxPages);
    if (safeTarget > 1 && safeTarget % 2 === 0) {
        safeTarget = safeTarget - 1;
    }

    currentPage = safeTarget;

    let renderPromises = [renderSingleCanvasPage(currentPage)];
    if (currentPage > 1) {
        renderPromises.push(renderSingleCanvasPage(currentPage - 1));
    }
    if (currentPage < maxPages) {
        renderPromises.push(renderSingleCanvasPage(currentPage + 1));
    }
    await Promise.all(renderPromises);

    setupTurnJSStructure(maxPages, isParamPremium, verifyPurchaseStatusLocallyOrDB(rawPath, docName || ""));
    showToast("📖 Dual Page Book Mode Activated");
}

async function applyDualModeState() {
    const isParamPremium = params.get("type") === "premium";
    const isInPaidFolder = rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium"));
    let maxPages = pdfDoc ? pdfDoc.numPages : 1;
    if ((isParamPremium || isInPaidFolder) && !verifyPurchaseStatusLocallyOrDB(rawPath, docName || "")) {
        maxPages = 1;
    }
    setupTurnJSStructure(maxPages, isParamPremium, verifyPurchaseStatusLocallyOrDB(rawPath, docName || ""));
}

window.togglePageSound = () => {
    isSoundEnabled = !isSoundEnabled;
    localStorage.setItem('pageFlipSound', isSoundEnabled);
    
    const toggleSwitch = document.getElementById('sound-toggle-switch');
    if (toggleSwitch) {
        toggleSwitch.classList.toggle('active', isSoundEnabled);
    }
    showToast(isSoundEnabled ? "🔊 Flip Sound Enabled" : "🔇 Flip Sound Muted");
};

// FULLY ROBUST JUMP TO PAGE FUNCTION FOR ALL MODES
async function jumpToPage(pageNo) {
    if (!pdfDoc) return;
    
    const isParamPremium = params.get("type") === "premium";
    const isInPaidFolder = rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium"));
    let maxAllowed = pdfDoc.numPages;
    
    let isPurchased = await verifyPurchaseStatusLocallyOrDB(rawPath, docName || "");
    if ((isParamPremium || isInPaidFolder) && !isPurchased) {
        maxAllowed = Math.min(maxAllowed, 1);
    }

    let target = Math.min(Math.max(1, pageNo), maxAllowed);

    if (viewMode === 'vertical') {
        const container = document.getElementById("vertical-scroll-container");
        if (container) {
            const pageEl = container.querySelector(`.v-page-wrapper[data-page-num="${target}"]`);
            if (pageEl) {
                pageEl.scrollIntoView({ behavior: 'smooth' });
                currentPage = target;
                updateProgressUI(currentPage);
            }
        }
        return;
    }

    // Flip or Dual Mode Handling
    try {
        if (isDualPage && target > 1 && target % 2 === 0) {
            target = target - 1; 
        }
        
        currentPage = target;
        let jumpPromises = [renderSingleCanvasPage(target)];
        if (isDualPage && target > 1) {
            jumpPromises.push(renderSingleCanvasPage(target - 1));
        }
        if (target < maxAllowed) {
            jumpPromises.push(renderSingleCanvasPage(target + 1));
        }
        await Promise.all(jumpPromises);
        lazyRenderPagesAround(target, maxAllowed);
        
        const bookContainer = $("#book-container");
        if (bookContainer.data('turn')) {
            bookContainer.turn('page', target);
        }
        savePageProgress(target);
    } catch (e) {
        console.warn("Jump page range error caught safely:", e);
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
    if (isPinching || isAnimating) return;
    
    if (isDualPage && dir === 'next' && currentPage >= pdfDoc.numPages) {
        showToast("📖 Ye aakhiri page hai.");
        return;
    }

    isAnimating = true;
    setTimeout(() => { isAnimating = false; }, 550);
    
    if (zoomScale > 1.05) window.resetZoom();

    if (viewMode === 'vertical') {
        const step = dir === 'next' ? 1 : -1;
        const target = Math.min(Math.max(1, currentPage + step), pdfDoc.numPages);
        jumpToPage(target);
        return;
    }

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

        try {
            $("#book-container").turn('next');
        } catch(e) { console.warn(e); }
    } else if (dir === 'prev') {
        try {
            $("#book-container").turn('previous');
        } catch(e) { console.warn(e); }
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
        const targetPage = parseInt(this.value);
        if (pdfDoc && targetPage >= 1 && targetPage <= pdfDoc.numPages) {
            jumpToPage(targetPage);
        }
    };
    pageSlider.onchange = function() {
        if (bubble) bubble.style.display = "none";
        if (zoomScale > 1.05) window.resetZoom();
        const targetPage = parseInt(this.value);
        
        const isParamPremium = params.get("type") === "premium";
        const isInPaidFolder = rawPath && (rawPath.toLowerCase().includes("paid") || rawPath.toLowerCase().includes("locked") || rawPath.toLowerCase().includes("premium"));
        const isPremiumNote = isParamPremium || isInPaidFolder;
        
        let purchasedList = JSON.parse(localStorage.getItem("purchasedFiles") || "[]");
        let isPurchased = purchasedList.includes(rawPath);

        if (isPremiumNote && !isPurchased && targetPage > 1) {
            showPurchaseRequiredModal();
            this.value = 1;
            jumpToPage(1);
            return;
        }
        jumpToPage(targetPage);
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
    if (viewMode === 'vertical') {
        const container = document.getElementById("vertical-scroll-container");
        if (container) {
            container.style.transform = `rotate(${rotation}deg)`;
            container.style.transformOrigin = 'center center';
        }
    } else {
        updateTransform();
    }
    showToast(`🔄 Rotated ${rotation}°`);
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
document.addEventListener('keydown', (e) => {
    // F12 block karne ke liye
    if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        alert("⚠️ Developer tools are disabled!");
        return false;
    }

    // Ctrl + Shift + I / J / C (Dev tools shortcuts) block karne ke liye
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'i' || e.key === 'j' || e.key === 'c')) {
        e.preventDefault();
        return false;
    }

    // Ctrl + U (View Page Source) block karne ke liye
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return false;
    }
});

// Right-click menu block karne ke liye (Inspect element rokne ke liye)
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});
