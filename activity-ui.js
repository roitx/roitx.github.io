/* activity-ui.js – Recent Activities page ka UI (library.html + downloads.html). Poora IIFE me: koi global nahi takrayega. */
(function () {
let activeFilter = "all";

// ---- SVG icon set (stroke = currentColor) ----
const ICONS = {
    page:    '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    notif:   '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    file:    '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>',
    image:   '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    pyq:     '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    test:    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    flash:   '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    premium: '<path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>',
    download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    activity:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    empty:   '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'
};
function svgIcon(name, cls) {
    return `<svg class="${cls || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
}
function iconTile(kind) {
    return `<div class="ev-icon t-${kind}">${svgIcon(kind)}</div>`;
}
function fileKind(f, r) {
    if (r.isTestItem) return "test";
    if (r.isPyqItem) return "pyq";
    if (r.isFlashcardItem) return "flash";
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(r.cleanPath) || (f.meta || "").includes("Image")) return "image";
    if (r.isFilePremium) return "premium";
    return "file";
}
function emptyState(text) {
    return `<div class="empty">${svgIcon("empty", "empty-svg")}<div>${esc(text)}</div></div>`;
}
function renderStats(full) {
    const el = document.getElementById("statStrip");
    if (!el) return;
    const start = new Date().setHours(0, 0, 0, 0);
    const today = full.filter(e => e.ts >= start).length;
    const files = full.filter(e => e.type === "file").length;
    const dl = getData("downloadedFiles").length;
    const card = (n, label, icon, cls) => `<div class="stat ${cls}">${svgIcon(icon)}<b>${n}</b><span>${label}</span></div>`;
    el.innerHTML = card(today, "Today", "activity", "s1") + card(files, "Files opened", "file", "s2") + card(dl, "Downloads", "download", "s3");
}


document.addEventListener("DOMContentLoaded", () => { renderActivityFeed(); });
window.addEventListener("pageshow", () => { renderActivityFeed(); });
window.addEventListener("storage", (event) => {
    if (["activityLog", "recentFiles", "downloadedFiles", "userPurchasedNotes"].includes(event.key)) renderActivityFeed();
});

function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---- Context: downloads + purchases (Supabase approved orders ke saath) ----
async function buildCtx() {
    let downloads = getData("downloadedFiles");
    let localPurchases = getData("userPurchasedNotes");

    let supabaseApprovedTitles = [];

    try {
        if (window.supabaseClient && typeof window.getCurrentUser === "function") {
            const user = await window.getCurrentUser();
            if (user) {
                const { data: ordersData } = await window.supabaseClient
                    .from('user_orders')
                    .select('note_title, status')
                    .eq('user_email', user.email)
                    .eq('status', 'approved');

                if (ordersData) {
                    ordersData.forEach(o => {
                        if (o.note_title) {
                            const cleaned = cleanTitleString(o.note_title);
                            if (cleaned) supabaseApprovedTitles.push(cleaned);
                            
                            if (!localPurchases.some(lp => cleanTitleString(lp.title) === cleaned)) {
                                localPurchases.push({ title: o.note_title });
                            }
                        }
                    });
                    localStorage.setItem("userPurchasedNotes", JSON.stringify(localPurchases));
                }
            }
        }
    } catch (err) {
        console.log("Supabase fetch skip offline:", err);
    }


    return { downloads, localPurchases, supabaseApprovedTitles };
}

// ---- File item ka link/type/access nikalna (downloads page bhi use karta hai) ----
function resolveFile(f, ctx) {
    const { downloads, localPurchases, supabaseApprovedTitles } = ctx;
        let viewTargetUrl = f.url || "#";
        let rawUrl = f.url || "";
        let cleanPath = rawUrl.split('?')[0];

        // Type Detection
        let isPyqItem = f.isPyq || rawUrl.toLowerCase().includes("pyq") || (f.meta && f.meta.toLowerCase().includes("pyq"));
        let isTestItem = f.isTest || cleanPath.toLowerCase().includes("take-test.html");
        let isFlashcardItem = f.isFlashcard || rawUrl.toLowerCase().includes("flashcard-reader") || (f.meta && f.meta.toLowerCase().includes("flashcard"));

        let viewerPage = "notes-viewer.html";
        const cleanedFileTitle = cleanTitleString(f.title);
        
        let isPurchased = f.isPurchased 
                          || localPurchases.some(item => cleanTitleString(item.title) === cleanedFileTitle) 
                          || supabaseApprovedTitles.some(st => cleanedFileTitle.includes(st) || st.includes(cleanedFileTitle));

        let isDownloaded = !isPyqItem && !isFlashcardItem && (downloads.some(item => (item.url && item.url.split('?')[0] === cleanPath) || cleanTitleString(item.title) === cleanedFileTitle) || f.downloaded);
        let isFilePremium = f.isPremium || cleanPath.toLowerCase().includes("premium") || cleanPath.toLowerCase().includes("paid");

        // 🌟 Last Read Progress Fetching (LocalStorage se card index ya scroll position nikalna)
        let savedProgressIndex = null;
        try {
            let progressData = JSON.parse(localStorage.getItem("readingProgress") || "{}");
            // Unique key ya URL match karenge
            if (progressData[cleanPath]) {
                savedProgressIndex = progressData[cleanPath];
            } else if (progressData[f.title]) {
                savedProgressIndex = progressData[f.title];
            }
        } catch (err) {
            console.error("Progress fetch error:", err);
        }

        // Target URL Logic with Last Card/Progress index injection
        if (isFlashcardItem) {
            let cardId = '';
            if (rawUrl.includes("id=")) {
                let idMatch = rawUrl.match(/id=([^&]+)/);
                cardId = idMatch ? idMatch[1] : '';
            }
            // Agar saved progress index milti hai toh URL mein cardIndex add kar do
            let indexQuery = (savedProgressIndex !== null && savedProgressIndex !== undefined) ? `&cardIndex=${savedProgressIndex}` : '';
            viewTargetUrl = `flashcard-reader.html?id=${cardId}${indexQuery}`;
        } else if (isPyqItem) {
            let pyqId = '';
            if (rawUrl.includes("id=")) {
                let idMatch = rawUrl.match(/id=([^&]+)/);
                pyqId = idMatch ? idMatch[1] : '';
            }
            let indexQuery = (savedProgressIndex !== null && savedProgressIndex !== undefined) ? `&cardIndex=${savedProgressIndex}` : '';
            if (pyqId) {
                viewTargetUrl = `pyq-reader.html?id=${pyqId}${indexQuery}`;
            } else {
                viewTargetUrl = `pyq-reader.html?path=${encodeURIComponent(cleanPath)}&name=${encodeURIComponent(f.title)}${indexQuery}`;
            }
        } else if (isTestItem) {
            viewTargetUrl = rawUrl;
        } else if (isFilePremium && !rawUrl.includes("viewer.html")) {
            // 💎 PREMIUM: bilkul premium-notes.html ki tarah link.
            // Path ko EXACT waisa hi bhejo jaisa DB me hai (koi "notes/" ya "formulas/" prefix nahi),
            // kyunki premium files 'private-premium-files' bucket ke root me hoti hain.
            const isPremiumImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(cleanPath);
            let premUrl = `${isPremiumImg ? "image-viewer.html" : "notes-viewer.html"}?path=${encodeURIComponent(cleanPath)}&name=${encodeURIComponent(f.title)}&type=premium`;
            if (!isPremiumImg) premUrl += "&status=premium";
            if (isPurchased) premUrl += "&purchased=true";
            viewTargetUrl = premUrl;
        } else if (cleanPath.match(/\.(jpg|jpeg|png|webp|gif)$/i) || f.meta?.includes("Image")) {
            viewerPage = "image-viewer.html";
            if (!cleanPath.startsWith("formulas/") && !cleanPath.includes("/")) {
                cleanPath = `formulas/${cleanPath}`;
            }
            let extraParams = isPurchased ? "&purchased=true" : "";
            viewTargetUrl = `${viewerPage}?path=${encodeURIComponent(cleanPath)}&name=${encodeURIComponent(f.title)}${extraParams}`;
        } else if (!rawUrl.includes("notes-viewer.html")) {
            if (!cleanPath.startsWith("notes/") && !cleanPath.includes("/")) {
                cleanPath = `notes/${cleanPath}`;
            }
            let extraParams = isPurchased ? "&purchased=true" : (isFilePremium ? "&type=premium&status=premium" : "");
            let indexQuery = (savedProgressIndex !== null && savedProgressIndex !== undefined) ? `&scrollIndex=${savedProgressIndex}` : '';
            viewTargetUrl = `${viewerPage}?path=${encodeURIComponent(cleanPath)}&name=${encodeURIComponent(f.title)}${extraParams}${indexQuery}`;
        }


    return { viewTargetUrl, rawUrl, cleanPath, isPyqItem, isTestItem, isFlashcardItem, isPurchased, isDownloaded, isFilePremium };
}

let detailCounter = 0;
function buildFileCard(f, ctx) {
    const index = detailCounter++;
    const r = resolveFile(f, ctx);
    const { viewTargetUrl, isPyqItem, isTestItem, isFlashcardItem, isPurchased, isDownloaded, isFilePremium } = r;
    const checkSvg = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const lockSvg = `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    const giftSvg = `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;


        // Action Button Text
        let actionBtnText = isTestItem ? "Re-take Test →" : (isPyqItem ? "Read PYQ →" : (isFlashcardItem ? "Read Flashcards →" : "View File →"));

        // Badge & Access Status
        let isPyqOrFlashcard = isPyqItem || isFlashcardItem;
        let badgeHtml = "";
        if (!isPyqOrFlashcard) {
            let downloadBadgeClass = isDownloaded ? "downloaded" : "not-downloaded";
            let downloadBadgeText = isTestItem ? "Attempted" : (isDownloaded ? "Downloaded" : "Not Downloaded");
            badgeHtml = `<span class="badge ${downloadBadgeClass}">${downloadBadgeText}</span>`;
        }
        
        let accessTagHtml = "";
        let accessStatusText = "Free";
        
        if (isTestItem) {
            accessTagHtml = `<span class="access-tag purchased" title="Attempted">${checkSvg}</span>`;
            accessStatusText = "Test Attempted";
        } else if (isPyqItem) {
            accessTagHtml = `<span class="access-tag free" title="PYQ Paper">${checkSvg}</span>`;
            accessStatusText = "PYQ Available";
        } else if (isFlashcardItem) {
            accessTagHtml = `<span class="access-tag free" title="Flashcard Set">${checkSvg}</span>`;
            accessStatusText = "Flashcard Available";
        } else if (isPurchased) {
            accessTagHtml = `<span class="access-tag purchased" title="Purchased">${checkSvg}</span>`;
            accessStatusText = "Purchased";
        } else if (isFilePremium) {
            accessTagHtml = `<span class="access-tag locked" title="Locked / Premium">${lockSvg}</span>`;
            accessStatusText = "Locked (Premium)";
        } else {
            accessTagHtml = `<span class="access-tag free" title="Free File">${giftSvg}</span>`;
            accessStatusText = "Free";
        }

        const div = document.createElement("div");
        div.className = "activity-item";

        window.fileDetailsMap = window.fileDetailsMap || {};
        window.fileDetailsMap[index] = {
            title: f.title,
            time: f.time,
            views: f.viewCount || 1,
            downloaded: isPyqOrFlashcard ? "N/A" : (isDownloaded ? "Yes (Downloaded)" : "No"),
            access: accessStatusText,
            type: isPyqItem ? "Previous Year Question (PYQ)" : (isFlashcardItem ? "Flashcard Set" : (isTestItem ? "Online Test" : "Notes / Document"))
        };

        div.innerHTML = `
            ${iconTile(fileKind(f, r))}
            <div class="file-info">
                <div class="title-row">
                    <a href="${viewTargetUrl}" title="${f.title}">${f.title}</a>
                    <div class="right-actions">
                        ${accessTagHtml}
                        <button class="info-btn" onclick="openInfoModal(${index})" title="View Details">i</button>
                    </div>
                </div>
                <span>${isTestItem ? 'Attempted' : (isPyqOrFlashcard ? 'Read' : 'Viewed')} at ${f.time} • ${f.meta}</span>
            </div>
            <div class="badges-group">
                ${badgeHtml}
                <a href="${viewTargetUrl}" class="view-btn">${actionBtnText}</a>
            </div>
        `;


    return div;
}

// ---- Category (filter chips ke liye) ----
function categoryOf(e) {
    if (e.type === "notification") return "notification";
    if (e.type === "page") return "page";
    const f = e.file || {};
    if (f.isPyq || f.isTest || f.isFlashcard) return "practice";
    return "file";
}

function setFilter(cat) {
    activeFilter = cat;
    document.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.cat === cat));
    renderActivityFeed();
}

function clearActivity() {
    if (!confirm("Poori activity history clear kar dein? (Downloads list safe rahegi)")) return;
    if (window.ActivityLog) ActivityLog.clear();
    localStorage.removeItem("recentFiles");
    renderActivityFeed();
}

// Purani recentFiles ko ek baar naye log me le aao
function migrateOnce() {
    if (!window.ActivityLog || localStorage.getItem("activityMigrated")) return;
    const log = ActivityLog.read();
    const old = getData("recentFiles");
    if (!log.length && old.length) {
        const now = Date.now();
        ActivityLog.write(old.map((f, i) => ({
            type: "file", title: f.title, url: f.url, meta: f.meta, file: f, ts: now - i * 60000
        })));
    }
    localStorage.setItem("activityMigrated", "1");
}

function dayLabel(ts) {
    const d = new Date(ts), t = new Date();
    const strip = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((strip(t) - strip(d)) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function buildEventItem(e) {
    const isNotif = e.type === "notification";
    const time = new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const div = document.createElement("div");
    div.className = "activity-item";
    const titleHtml = e.url
        ? `<a href="${esc(e.url)}" title="${esc(e.title)}">${esc(e.title)}</a>`
        : `<a class="nolink">${esc(e.title)}</a>`;
    const sub = isNotif
        ? `Read at ${time}${e.meta ? " \u2022 " + esc(e.meta) : ""}`
        : `Visited at ${time} \u2022 Page`;
    div.innerHTML = `
        ${iconTile(isNotif ? "notif" : "page")}
        <div class="file-info">
            <div class="title-row">${titleHtml}</div>
            <span>${sub}</span>
        </div>
        ${e.url ? `<div class="badges-group"><a href="${esc(e.url)}" class="view-btn">Open \u2192</a></div>` : ""}
    `;
    return div;
}

async function renderActivityFeed() {
    const list = document.getElementById("recentList");
    if (!list) return;
    migrateOnce();

    const full = window.ActivityLog ? ActivityLog.read() : [];
    renderStats(full);
    let log = full;
    if (activeFilter !== "all") log = log.filter(e => categoryOf(e) === activeFilter);

    if (!log.length) {
        list.innerHTML = emptyState("No activity recorded yet. Kuch padhna ya khelna shuru karo!");
        return;
    }

    const ctx = await buildCtx();
    detailCounter = 0;
    window.fileDetailsMap = {};
    list.innerHTML = "";

    let lastDay = "";
    log.forEach(e => {
        const day = dayLabel(e.ts);
        if (day !== lastDay) {
            const h = document.createElement("div");
            h.className = "day-head";
            h.textContent = day;
            list.appendChild(h);
            lastDay = day;
        }
        if (e.type === "file" && e.file) list.appendChild(buildFileCard(e.file, ctx));
        else list.appendChild(buildEventItem(e));
    });
}

function openInfoModal(index) {
    const data = window.fileDetailsMap[index];
    if (!data) return;

    const modalContent = document.getElementById("modalContent");
    modalContent.innerHTML = `
        <div class="modal-row"><span>File Name:</span> <span>${data.title}</span></div>
        <div class="modal-row"><span>Item Type:</span> <span>${data.type}</span></div>
        <div class="modal-row"><span>Last Time:</span> <span>${data.time}</span></div>
        <div class="modal-row"><span>Total Reads/Opens:</span> <span>${data.views} times</span></div>
        <div class="modal-row"><span>Download Status:</span> <span>${data.downloaded}</span></div>
        <div class="modal-row"><span>Access Type:</span> <span>${data.access}</span></div>
    `;

    document.getElementById("infoModal").style.display = "flex";
}

function closeInfoModal() {
    document.getElementById("infoModal").style.display = "none";
}

// inline onclick ke liye + downloads page ke liye
window.setFilter = setFilter;
window.clearActivity = clearActivity;
window.openInfoModal = openInfoModal;
window.closeInfoModal = closeInfoModal;
window.PMUI = { buildCtx: buildCtx, resolveFile: resolveFile, esc: esc, iconTile: iconTile, fileKind: fileKind, emptyState: emptyState };
})();
