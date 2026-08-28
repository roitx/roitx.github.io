let showOnlyDownloaded = false;

document.addEventListener("DOMContentLoaded", () => {
    renderActivityFeed();
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

        recent = recent.filter(f => !f.url || f.url.split('?')[0] !== cleanBaseUrl);
        recent.unshift({
            title: fileData.title,
            url: cleanBaseUrl,
            meta: fileData.meta || "Viewer",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloaded: alreadyDownloaded,
            isPurchased: isPurchased,
            isPremium: isCurrentPremium
        });

        recent = recent.slice(0, 10);
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
            return downloads.some(item => (item.url && item.url.split('?')[0] === cleanPath) || cleanTitleString(item.title) === cleanedTitle) || f.downloaded;
        });
    }

    if (!recent.length) {
        recentList.innerHTML = `<div class="empty">${showOnlyDownloaded ? "No downloaded files found." : "No recent activity recorded yet."}</div>`;
        return;
    }

    recentList.innerHTML = "";

    // SVG Icons
    const checkSvg = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const lockSvg = `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    const giftSvg = `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

    recent.forEach(f => {
        let viewerPage = "notes-viewer.html";
        let rawUrl = f.url || "";
        let cleanPath = rawUrl.split('?')[0];

        const cleanedFileTitle = cleanTitleString(f.title);
        
        let isPurchased = f.isPurchased 
                          || localPurchases.some(item => cleanTitleString(item.title) === cleanedFileTitle) 
                          || supabaseApprovedTitles.some(st => cleanedFileTitle.includes(st) || st.includes(cleanedFileTitle));

        let isDownloaded = downloads.some(item => (item.url && item.url.split('?')[0] === cleanPath) || cleanTitleString(item.title) === cleanedFileTitle) || f.downloaded;

        if (cleanPath.match(/\.(jpg|jpeg|png|webp|gif)$/i) || f.meta?.includes("Image")) {
            viewerPage = "image-viewer.html";
            if (!cleanPath.startsWith("formulas/") && !cleanPath.includes("/")) {
                cleanPath = `formulas/${cleanPath}`;
            }
        } else {
            if (!cleanPath.startsWith("notes/") && !cleanPath.includes("/")) {
                cleanPath = `notes/${cleanPath}`;
            }
        }

        let isFilePremium = f.isPremium || cleanPath.toLowerCase().includes("premium") || cleanPath.toLowerCase().includes("paid");

        let extraParams = "";
        if (isPurchased) {
            extraParams = "&purchased=true";
        } else if (isFilePremium) {
            extraParams = "&type=premium&status=premium";
        }

        const viewTargetUrl = `${viewerPage}?path=${encodeURIComponent(cleanPath)}&name=${encodeURIComponent(f.title)}${extraParams}`;

        // Download Status Badge (Only for Downloaded / Not Downloaded)
        let downloadBadgeClass = isDownloaded ? "downloaded" : "not-downloaded";
        let downloadBadgeText = isDownloaded ? "Downloaded" : "Not Downloaded";

        // SVG Access Tag (Purchased / Locked / Free)
        let accessTagHtml = "";
        if (isPurchased) {
            accessTagHtml = `<span class="access-tag purchased" title="Purchased">${checkSvg} Purchased</span>`;
        } else if (isFilePremium) {
            accessTagHtml = `<span class="access-tag locked" title="Premium Locked">${lockSvg} Locked</span>`;
        } else {
            accessTagHtml = `<span class="access-tag free" title="Free Access">${giftSvg} Free</span>`;
        }

        const div = document.createElement("div");
        div.className = "activity-item";

        div.innerHTML = `
            <div class="file-info">
                <div class="title-row">
                    <a href="${viewTargetUrl}" title="${f.title}">${f.title}</a>
                    ${accessTagHtml}
                </div>
                <span>Viewed at ${f.time} • ${f.meta}</span>
            </div>
            <div class="badges-group">
                <span class="badge ${downloadBadgeClass}">
                    ${downloadBadgeText}
                </span>
                <a href="${viewTargetUrl}" class="view-btn">View File →</a>
            </div>
        `;

        recentList.appendChild(div);
    });
}
