let showOnlyDownloaded = false;

document.addEventListener("DOMContentLoaded", () => {
    renderActivityFeed();
});

window.addEventListener("pageshow", (event) => {
    renderActivityFeed();
});

window.addEventListener("storage", (event) => {
    if (["recentFiles", "downloadedFiles", "userPurchasedNotes"].includes(event.key)) {
        renderActivityFeed();
    }
});

function getData(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (e) {
        console.warn(`Error reading ${key} from LocalStorage:`, e);
        return [];
    }
}

function toggleFilter() {
    showOnlyDownloaded = !showOnlyDownloaded;
    const btn = document.getElementById("filterToggle");
    if (btn) {
        if (showOnlyDownloaded) {
            btn.classList.add("active");
            btn.innerHTML = "✨ Showing Downloaded";
        } else {
            btn.classList.remove("active");
            btn.innerHTML = "✨ Downloaded Only";
        }
    }
    renderActivityFeed();
}

function trackActivityLocally(fileData, isDownloaded = false) {
    try {
        let recent = getData("recentFiles");
        let downloads = getData("downloadedFiles");
        let localPurchases = getData("userPurchasedNotes");

        let rawUrl = fileData.url || "";
        let cleanBaseUrl = rawUrl.split('?')[0];
        const isPurchased = fileData.isPurchased || false;

        if (isDownloaded && !downloads.some(f => f.url && f.url.split('?')[0] === cleanBaseUrl)) {
            fileData.timeDownloaded = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            downloads.unshift(fileData);
            localStorage.setItem("downloadedFiles", JSON.stringify(downloads));
        }

        if (isPurchased && !localPurchases.some(f => f.title && f.title.toLowerCase() === (fileData.title || "").toLowerCase())) {
            localPurchases.unshift({ title: fileData.title, url: cleanBaseUrl });
            localStorage.setItem("userPurchasedNotes", JSON.stringify(localPurchases));
        }

        const alreadyDownloaded = downloads.some(f => f.url && f.url.split('?')[0] === cleanBaseUrl) || isDownloaded;
        const isCurrentPremium = fileData.isPremium || cleanBaseUrl.toLowerCase().includes("premium") || cleanBaseUrl.toLowerCase().includes("paid");

        let existingIndex = recent.findIndex(f => (f.url && f.url.split('?')[0] === cleanBaseUrl) || f.title === fileData.title);
        let viewCount = 1;
        if (existingIndex !== -1) {
            viewCount = (recent[existingIndex].viewCount || 1) + 1;
            recent.splice(existingIndex, 1);
        }

        recent.unshift({
            title: fileData.title,
            url: cleanBaseUrl,
            meta: fileData.meta || "Viewer",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloaded: alreadyDownloaded,
            isPurchased: isPurchased,
            isPremium: isCurrentPremium,
            isTest: fileData.isTest || false,
            inProgress: fileData.inProgress || false,
            isCompleted: fileData.isCompleted || false,
            score: fileData.score !== undefined ? fileData.score : null,
            timeTaken: fileData.timeTaken || null,
            viewCount: viewCount
        });

        recent = recent.slice(0, 15);
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
            if (user && user.email) {
                const { data: ordersData, error } = await window.supabaseClient
                    .from('user_orders')
                    .select('note_title, status')
                    .eq('user_email', user.email)
                    .eq('status', 'approved');

                if (!error && ordersData) {
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
        console.log("Supabase fetch skip offline/guest:", err);
    }

    // --- FILTER FIX: Hides Tests when "Downloaded Only" is active ---
    if (showOnlyDownloaded) {
        recent = recent.filter(f => {
            let isTestItem = f.isTest || (f.url && f.url.includes("take-test.html")) || (f.meta && f.meta.includes("Score:"));
            if (isTestItem) return false; // Tests do not count as downloaded files

            let cleanPath = f.url ? f.url.split('?')[0] : "";
            let cleanedTitle = cleanTitleString(f.title);
            return downloads.some(item => (item.url && item.url.split('?')[0] === cleanPath) || cleanTitleString(item.title) === cleanedTitle) || f.downloaded;
        });
    }

    if (!recent.length) {
        recentList.innerHTML = `<div class="empty">${showOnlyDownloaded ? "No downloaded files found." : "No recent activity recorded yet."}</div>`;
        return;
    }

    recentList.innerHTML = "";
    window.fileDetailsMap = {}; 

    const checkSvg = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const lockSvg = `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    const giftSvg = `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

    recent.forEach((f, index) => {
        let viewTargetUrl = "";
        let isTestItem = f.isTest || (f.url && f.url.includes("take-test.html")) || (f.meta && f.meta.includes("Score:"));

        let viewerPage = "notes-viewer.html";
        let rawUrl = f.url || "";
        let cleanPath = rawUrl.split('?')[0];

        const cleanedFileTitle = cleanTitleString(f.title);
        
        let isPurchased = f.isPurchased 
                          || localPurchases.some(item => cleanTitleString(item.title) === cleanedFileTitle) 
                          || supabaseApprovedTitles.some(st => cleanedFileTitle.includes(st) || st.includes(cleanedFileTitle));

        let isDownloaded = downloads.some(item => (item.url && item.url.split('?')[0] === cleanPath) || cleanTitleString(item.title) === cleanedFileTitle) || f.downloaded;
        let isFilePremium = f.isPremium || cleanPath.toLowerCase().includes("premium") || cleanPath.toLowerCase().includes("paid");

        let isTestCompleted = f.isCompleted || (isTestItem && !f.inProgress);
        let isTestInProgress = isTestItem && f.inProgress;

        if (isTestItem) {
            if (isTestInProgress) {
                viewTargetUrl = `${f.url}${f.url.includes('?') ? '&' : '?'}resume=true`;
            } else {
                viewTargetUrl = `${f.url}${f.url.includes('?') ? '&' : '?'}retake=true`;
            }
        } else if (cleanPath.match(/\.(jpg|jpeg|png|webp|gif)$/i) || (f.meta && f.meta.includes("Image"))) {
            viewerPage = "image-viewer.html";
            if (!cleanPath.startsWith("formulas/") && !cleanPath.includes("/")) {
                cleanPath = `formulas/${cleanPath}`;
            }
            let extraParams = isPurchased ? "&purchased=true" : "";
            viewTargetUrl = `${viewerPage}?path=${encodeURIComponent(cleanPath)}&name=${encodeURIComponent(f.title)}${extraParams}`;
        } else {
            if (!cleanPath.startsWith("notes/") && !cleanPath.includes("/")) {
                cleanPath = `notes/${cleanPath}`;
            }
            let extraParams = isPurchased ? "&purchased=true" : (isFilePremium ? "&type=premium&status=premium" : "");
            viewTargetUrl = `${viewerPage}?path=${encodeURIComponent(cleanPath)}&name=${encodeURIComponent(f.title)}${extraParams}`;
        }

        let downloadBadgeClass = isDownloaded ? "downloaded" : "not-downloaded";
        let downloadBadgeText = isDownloaded ? "Downloaded" : "Not Downloaded";
        let actionBtnText = "View File →";

        if (isTestItem) {
            if (isTestInProgress) {
                downloadBadgeClass = "not-downloaded";
                downloadBadgeText = "In Progress";
                actionBtnText = "Continue Test →";
            } else {
                downloadBadgeClass = "downloaded";
                downloadBadgeText = "Completed";
                actionBtnText = "Re-take Test →";
            }
        }

        let accessTagHtml = "";
        let accessStatusText = "Free";
        if (isTestItem) {
            accessTagHtml = `<span class="access-tag purchased" title="Test">${checkSvg}</span>`;
            accessStatusText = isTestInProgress ? "Test In-Progress" : "Test Completed";
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

        window.fileDetailsMap[index] = {
            title: f.title || "Untitled",
            time: f.time || "N/A",
            views: f.viewCount || 1,
            downloaded: isTestItem ? (isTestInProgress ? "No (In Progress)" : "Yes (Completed)") : (isDownloaded ? "Yes (Downloaded)" : "No"),
            access: accessStatusText,
            meta: f.meta || "",
            isTest: isTestItem
        };

        const div = document.createElement("div");
        div.className = "activity-item";
        div.innerHTML = `
            <div class="file-info">
                <div class="title-row">
                    <a href="${viewTargetUrl}" title="${f.title}">${f.title}</a>
                    <div class="right-actions">
                        ${accessTagHtml}
                        <button class="info-btn" onclick="openInfoModal(${index})" title="View Details">i</button>
                    </div>
                </div>
                <span>${f.meta ? f.meta : (isTestItem ? 'Completed' : 'Viewed') + ' at ' + (f.time || 'recently')}</span>
            </div>
            <div class="badges-group">
                <span class="badge ${downloadBadgeClass}">
                    ${downloadBadgeText}
                </span>
                <a href="${viewTargetUrl}" class="view-btn">${actionBtnText}</a>
            </div>
        `;

        recentList.appendChild(div);
    });
}

function openInfoModal(index) {
    if (!window.fileDetailsMap || !window.fileDetailsMap[index]) return;
    const data = window.fileDetailsMap[index];

    const modalContent = document.getElementById("modalContent");
    if (modalContent) {
        let metaRow = data.meta ? `<div class="modal-row"><span>Details/Score:</span> <span>${data.meta}</span></div>` : '';
        modalContent.innerHTML = `
            <div class="modal-row"><span>Title:</span> <span>${data.title}</span></div>
            <div class="modal-row"><span>Last Opened:</span> <span>${data.time}</span></div>
            <div class="modal-row"><span>Total Opens:</span> <span>${data.views} times</span></div>
            <div class="modal-row"><span>Status:</span> <span>${data.downloaded}</span></div>
            <div class="modal-row"><span>Type:</span> <span>${data.access}</span></div>
            ${metaRow}
        `;
    }

    const modal = document.getElementById("infoModal");
    if (modal) modal.style.display = "flex";
}

function closeInfoModal(e) {
    if (!e || e.target.id === "infoModal" || e.target.classList.contains("modal-close")) {
        const modal = document.getElementById("infoModal");
        if (modal) modal.style.display = "none";
    }
}
