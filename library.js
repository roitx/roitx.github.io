let showOnlyDownloaded = false;

document.addEventListener("DOMContentLoaded", () => {
    renderActivityFeed();
});

// Auto-update UI when navigating BACK to library page
window.addEventListener("pageshow", (event) => {
    renderActivityFeed();
});

// Auto-update UI if localStorage changes in another tab
window.addEventListener("storage", (event) => {
    if (event.key === "recentFiles" || event.key === "downloadedFiles" || event.key === "userPurchasedNotes") {
        renderActivityFeed();
    }
});

function getData(key) {
    return JSON.parse(localStorage.getItem(key) || "[]");
}

function toggleFilter() {
    showOnlyDownloaded = !showOnlyDownloaded;
    const btn = document.getElementById("filterToggle");
    if (showOnlyDownloaded) {
        btn.classList.add("active");
        btn.innerHTML = "✨ Showing Downloaded";
    } else {
        btn.classList.remove("active");
        btn.innerHTML = "✨ Downloaded Only";
    }
    renderActivityFeed();
}

// Track Activity Function
function trackActivityLocally(fileData, isDownloaded = false) {
    try {
        let recent = getData("recentFiles");
        let downloads = getData("downloadedFiles");
        let localPurchases = getData("userPurchasedNotes");

        let rawUrl = fileData.url || "";
        let cleanBaseUrl = rawUrl.split('?')[0];
        const isPurchased = fileData.isPurchased || false;

        // PYQ / Test detection
        const isPyqItem = fileData.isPyq || rawUrl.toLowerCase().includes("pyq") || (fileData.meta && fileData.meta.toLowerCase().includes("pyq"));
        const isTestItem = fileData.isTest || cleanBaseUrl.toLowerCase().includes("take-test") || (fileData.meta && fileData.meta.toLowerCase().includes("test"));

        // Only add to downloadedFiles if it is NOT a PYQ paper and explicitly marked downloaded
        if (!isPyqItem && isDownloaded && !downloads.some(f => f.url && f.url.split('?')[0] === cleanBaseUrl)) {
            fileData.timeDownloaded = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            downloads.unshift(fileData);
            localStorage.setItem("downloadedFiles", JSON.stringify(downloads));
        }

        if (isPurchased && !localPurchases.some(f => f.title && f.title.toLowerCase() === (fileData.title || "").toLowerCase())) {
            localPurchases.unshift({ title: fileData.title, url: cleanBaseUrl });
            localStorage.setItem("userPurchasedNotes", JSON.stringify(localPurchases));
        }

        const isCurrentPremium = fileData.isPremium || cleanBaseUrl.toLowerCase().includes("premium") || cleanBaseUrl.toLowerCase().includes("paid");

        let existingIndex = recent.findIndex(f => (f.url && f.url.split('?')[0] === cleanBaseUrl) || f.title === fileData.title);
        let viewCount = 1;
        if (existingIndex !== -1) {
            viewCount = (recent[existingIndex].viewCount || 1) + 1;
            recent.splice(existingIndex, 1);
        }

        let defaultMeta = "Viewer";
        if (isPyqItem) defaultMeta = "PYQ Paper";
        else if (isTestItem) defaultMeta = "Mock Test";

        recent.unshift({
            title: fileData.title,
            url: fileData.url, // Original full URL keep-alive
            meta: fileData.meta || defaultMeta,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloaded: isPyqItem ? false : (downloads.some(f => f.url && f.url.split('?')[0] === cleanBaseUrl) || isDownloaded),
            isPurchased: isPurchased,
            isPremium: isCurrentPremium,
            isTest: isTestItem,
            isPyq: isPyqItem,
            viewCount: viewCount
        });

        recent = recent.slice(0, 20);
        localStorage.setItem("recentFiles", JSON.stringify(recent));
    } catch (e) {
        console.error("Tracking Error: ", e);
    }
}

function cleanTitleString(str) {
    if (!str) return "";
    return str.replace(/[^\w\s]/gi, '').toLowerCase().trim();
}

async function renderActivityFeed() {
    const recentList = document.getElementById("recentList");
    if (!recentList) return;

    let recent = getData("recentFiles");
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

    if (showOnlyDownloaded) {
        recent = recent.filter(f => {
            let cleanPath = f.url ? f.url.split('?')[0] : "";
            let cleanedTitle = cleanTitleString(f.title);
            return !f.isPyq && (downloads.some(item => (item.url && item.url.split('?')[0] === cleanPath) || cleanTitleString(item.title) === cleanedTitle) || f.downloaded);
        });
    }

    if (!recent.length) {
        recentList.innerHTML = `<div class="empty">${showOnlyDownloaded ? "No downloaded files found." : "No recent activity recorded yet."}</div>`;
        return;
    }

    recentList.innerHTML = "";

    const checkSvg = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const lockSvg = `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    const giftSvg = `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

    recent.forEach((f, index) => {
        let viewTargetUrl = f.url || "#";
        let rawUrl = f.url || "";
        let cleanPath = rawUrl.split('?')[0];

        // Type Detection
        let isPyqItem = f.isPyq || rawUrl.toLowerCase().includes("pyq") || (f.meta && f.meta.toLowerCase().includes("pyq"));
        let isTestItem = f.isTest || cleanPath.toLowerCase().includes("take-test.html");

        let viewerPage = "notes-viewer.html";
        const cleanedFileTitle = cleanTitleString(f.title);
        
        let isPurchased = f.isPurchased 
                          || localPurchases.some(item => cleanTitleString(item.title) === cleanedFileTitle) 
                          || supabaseApprovedTitles.some(st => cleanedFileTitle.includes(st) || st.includes(cleanedFileTitle));

        let isDownloaded = !isPyqItem && (downloads.some(item => (item.url && item.url.split('?')[0] === cleanPath) || cleanTitleString(item.title) === cleanedFileTitle) || f.downloaded);
        let isFilePremium = f.isPremium || cleanPath.toLowerCase().includes("premium") || cleanPath.toLowerCase().includes("paid");

        // Target URL Logic
        if (isPyqItem) {
            // FIX: Keep reader URL intact if already present, else fallback correctly
            if (rawUrl.includes("pyq-reader.html")) {
                viewTargetUrl = rawUrl;
            } else if (rawUrl.includes("id=")) {
                let idMatch = rawUrl.match(/id=([^&]+)/);
                viewTargetUrl = `pyq-reader.html?id=${idMatch ? idMatch[1] : ''}`;
            } else {
                viewTargetUrl = `pyq-reader.html?path=${encodeURIComponent(cleanPath)}&name=${encodeURIComponent(f.title)}`;
            }
        } else if (isTestItem) {
            viewTargetUrl = rawUrl;
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
            viewTargetUrl = `${viewerPage}?path=${encodeURIComponent(cleanPath)}&name=${encodeURIComponent(f.title)}${extraParams}`;
        }

        // Action Button Text
        let actionBtnText = isTestItem ? "Re-take Test →" : (isPyqItem ? "Read PYQ →" : "View File →");

        // Access Status Setup
        let accessTagHtml = "";
        let accessStatusText = "Free";
        
        if (isTestItem) {
            accessTagHtml = `<span class="access-tag purchased" title="Attempted">${checkSvg}</span>`;
            accessStatusText = "Test Attempted";
        } else if (isPyqItem) {
            accessTagHtml = `<span class="access-tag free" title="PYQ Paper">${checkSvg}</span>`;
            accessStatusText = "PYQ Available";
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

        // FIX: Download Badge HTML - PYQ cards ke liye Downloaded status badge ko bilkul hide kar diya gaya hai
        let badgeHtml = "";
        if (!isPyqItem) {
            let downloadBadgeClass = isDownloaded ? "downloaded" : "not-downloaded";
            let downloadBadgeText = isTestItem ? "Attempted" : (isDownloaded ? "Downloaded" : "Not Downloaded");
            badgeHtml = `<span class="badge ${downloadBadgeClass}">${downloadBadgeText}</span>`;
        }

        const div = document.createElement("div");
        div.className = "activity-item";

        window.fileDetailsMap = window.fileDetailsMap || {};
        window.fileDetailsMap[index] = {
            title: f.title,
            time: f.time,
            views: f.viewCount || 1,
            downloaded: isPyqItem ? "N/A (PYQ Paper)" : (isDownloaded ? "Yes (Downloaded)" : "No"),
            access: accessStatusText,
            type: isPyqItem ? "Previous Year Question (PYQ)" : (isTestItem ? "Online Test" : "Notes / Document")
        };

        div.innerHTML = `
            <div class="file-info">
                <div class="title-row">
                    <a href="${viewTargetUrl}" title="${f.title}">${f.title}</a>
                    <div class="right-actions">
                        ${accessTagHtml}
                        <button class="info-btn" onclick="openInfoModal(${index})" title="View Details">i</button>
                    </div>
                </div>
                <span>${isTestItem ? 'Attempted' : (isPyqItem ? 'Read' : 'Viewed')} at ${f.time} • ${f.meta}</span>
            </div>
            <div class="badges-group">
                ${badgeHtml}
                <a href="${viewTargetUrl}" class="view-btn">${actionBtnText}</a>
            </div>
        `;

        recentList.appendChild(div);
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
