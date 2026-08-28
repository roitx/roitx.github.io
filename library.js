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

// Global helper to track activity cleanly and save offline access
function trackActivityLocally(fileData, isDownloaded = false) {
    try {
        let recent = getData("recentFiles");
        let downloads = getData("downloadedFiles");
        let localPurchases = getData("userPurchasedNotes");

        let rawUrl = fileData.url || "";
        let cleanBaseUrl = rawUrl.split('?')[0];

        // Agar user click kar ke viewer par gaya ya purchase/downloaded state h
        if ((isDownloaded || fileData.isPurchased) && !downloads.some(f => f.url && f.url.split('?')[0] === cleanBaseUrl)) {
            fileData.timeDownloaded = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            downloads.unshift(fileData);
            localStorage.setItem("downloadedFiles", JSON.stringify(downloads));
        }

        // Offline storage me purchased entry add karo
        if (fileData.isPurchased && !localPurchases.some(f => f.title === fileData.title)) {
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
            isPurchased: fileData.isPurchased || false,
            isPremium: isCurrentPremium
        });

        recent = recent.slice(0, 10);
        localStorage.setItem("recentFiles", JSON.stringify(recent));
    } catch (e) {
        console.error("Tracking Error: ", e);
    }
}

async function renderActivityFeed() {
    const recentList = document.getElementById("recentList");
    if (!recentList) return;

    let recent = getData("recentFiles");
    let downloads = getData("downloadedFiles");
    let localPurchases = getData("userPurchasedNotes");

    let supabaseApprovedTitles = [];

    // 🌟 SUPABASE SYNC: Fetch Supabase purchases if user is online
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
                    supabaseApprovedTitles = ordersData.map(o => o.note_title ? o.note_title.toLowerCase() : "");
                    
                    // Offline Cache Backup
                    ordersData.forEach(o => {
                        if (o.note_title && !localPurchases.some(lp => lp.title.toLowerCase() === o.note_title.toLowerCase())) {
                            localPurchases.push({ title: o.note_title });
                        }
                    });
                    localStorage.setItem("userPurchasedNotes", JSON.stringify(localPurchases));
                }
            }
        }
    } catch (err) {
        console.log("Supabase fetch skip in offline mode:", err);
    }

    if (showOnlyDownloaded) {
        recent = recent.filter(f => {
            let cleanPath = f.url ? f.url.split('?')[0] : "";
            let fTitleLower = (f.title || "").toLowerCase();
            return downloads.some(item => (item.url && item.url.split('?')[0] === cleanPath) || item.title === f.title) 
                   || localPurchases.some(lp => lp.title.toLowerCase() === fTitleLower)
                   || supabaseApprovedTitles.includes(fTitleLower);
        });
    }

    if (!recent.length) {
        recentList.innerHTML = `<div class="empty">${showOnlyDownloaded ? "No purchased/downloaded files found." : "No recent activity recorded yet."}</div>`;
        return;
    }

    recentList.innerHTML = "";

    recent.forEach(f => {
        let viewerPage = "notes-viewer.html";
        let rawUrl = f.url || "";
        let cleanPath = rawUrl.split('?')[0];

        const fileTitleLower = (f.title || "").toLowerCase();
        
        let isPurchased = f.isPurchased 
                          || localPurchases.some(item => (item.title && item.title.toLowerCase() === fileTitleLower)) 
                          || supabaseApprovedTitles.includes(fileTitleLower);

        let isDownloaded = downloads.some(item => (item.url && item.url.split('?')[0] === cleanPath) || item.title === f.title) || f.downloaded;

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
        if (isPurchased || isDownloaded) {
            extraParams = "&purchased=true";
        } else if (isFilePremium) {
            extraParams = "&type=premium&status=premium";
        }

        const viewTargetUrl = `${viewerPage}?path=${encodeURIComponent(cleanPath)}&name=${encodeURIComponent(f.title)}${extraParams}`;

        // Dynamic status badge update
        let badgeClass = "not-downloaded";
        let badgeText = "Not Downloaded";

        if (isPurchased || isDownloaded) {
            badgeClass = "downloaded";
            badgeText = isDownloaded ? "Downloaded" : "Purchased";
        }

        const div = document.createElement("div");
        div.className = "activity-item";

        div.innerHTML = `
            <div class="file-info">
                <a href="${viewTargetUrl}" title="${f.title}">${f.title}</a>
                <span>Viewed at ${f.time} • ${f.meta}</span>
            </div>
            <div class="badges-group">
                <span class="badge ${badgeClass}">
                    ${badgeText}
                </span>
                <a href="${viewTargetUrl}" class="view-btn">View File →</a>
            </div>
        `;

        recentList.appendChild(div);
    });
}
