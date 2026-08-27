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

// Global helper to track activity cleanly
function trackActivityLocally(fileData, isDownloaded = false) {
    try {
        let recent = getData("recentFiles");
        let downloads = getData("downloadedFiles");

        let rawUrl = fileData.url || "";
        let cleanBaseUrl = rawUrl.split('?')[0];

        if (isDownloaded && !downloads.some(f => f.url && f.url.split('?')[0] === cleanBaseUrl)) {
            fileData.timeDownloaded = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            downloads.unshift(fileData);
            localStorage.setItem("downloadedFiles", JSON.stringify(downloads));
        }

        const alreadyDownloaded = downloads.some(f => f.url && f.url.split('?')[0] === cleanBaseUrl) || isDownloaded;
        const isCurrentPremium = fileData.isPremium || cleanBaseUrl.toLowerCase().includes("premium") || cleanBaseUrl.toLowerCase().includes("paid") || cleanBaseUrl.toLowerCase().includes("locked");

        // Remove duplicate entry
        recent = recent.filter(f => !f.url || f.url.split('?')[0] !== cleanBaseUrl);
        recent.unshift({
            title: fileData.title,
            url: cleanBaseUrl, // Pure Clean URL without params
            meta: fileData.meta || "Viewer",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloaded: alreadyDownloaded,
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
    let localPurchases = getData("userPurchasedNotes") || [];

    // 🌟 1. SUPABASE SYNC: Fetch Supabase purchases if user is logged in
    let supabaseApprovedTitles = [];
    try {
        if (window.supabaseClient && typeof window.getCurrentUser === "function") {
            const user = await window.getCurrentUser();
            if (user) {
                // Fetch approved user_orders
                const { data: ordersData } = await window.supabaseClient
                    .from('user_orders')
                    .select('note_title, status')
                    .eq('user_email', user.email)
                    .eq('status', 'approved');

                if (ordersData) {
                    supabaseApprovedTitles = ordersData.map(o => o.note_title ? o.note_title.toLowerCase() : "");
                }

                // Fetch user_purchases
                const { data: purchaseData } = await window.supabaseClient
                    .from('user_purchases')
                    .select('note_id')
                    .eq('user_id', user.id);

                if (purchaseData && purchaseData.length > 0) {
                    const noteIds = purchaseData.map(p => p.note_id);
                    const { data: notes } = await window.supabaseClient
                        .from('premium_notes')
                        .select('title')
                        .in('id', noteIds);
                    
                    if (notes) {
                        notes.forEach(n => {
                            if (n.title) supabaseApprovedTitles.push(n.title.toLowerCase());
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.log("Supabase fetch skip in activity feed:", err);
    }

    if (showOnlyDownloaded) {
        recent = recent.filter(f => {
            let cleanPath = f.url ? f.url.split('?')[0] : "";
            return downloads.some(item => (item.url && item.url.split('?')[0] === cleanPath) || item.title === f.title) || f.downloaded;
        });
    }

    if (!recent.length) {
        recentList.innerHTML = `<div class="empty">${showOnlyDownloaded ? "No downloaded files found." : "No recent activity recorded yet."}</div>`;
        return;
    }

    recentList.innerHTML = "";

    recent.forEach(f => {
        let viewerPage = "notes-viewer.html";
        let rawUrl = f.url || "";
        
        // 🌟 Clean path (Stripping old query params)
        let cleanPath = rawUrl.split('?')[0];

        let isDownloaded = downloads.some(item => (item.url && item.url.split('?')[0] === cleanPath) || item.title === f.title) || f.downloaded;
        
        // 🌟 Dynamic Purchase Check (Localstorage + Supabase Live Sync)
        const fileTitleLower = (f.title || "").toLowerCase();
        let isPurchased = localPurchases.some(item => (item.url && item.url.split('?')[0] === cleanPath) || (item.title && item.title.toLowerCase() === fileTitleLower)) 
                          || supabaseApprovedTitles.includes(fileTitleLower);

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

        let isFilePremium = f.isPremium || cleanPath.toLowerCase().includes("premium") || cleanPath.toLowerCase().includes("paid") || cleanPath.toLowerCase().includes("locked");

        // 🌟 Dynamic URL Construction: Agar Purchase HO CHUKA HAIN to type=premium NOHI lagega, &purchased=true lagega
        let extraParams = "";
        if (isPurchased || isDownloaded) {
            extraParams = "&purchased=true";
        } else if (isFilePremium) {
            extraParams = "&type=premium&status=premium";
        }

        const viewTargetUrl = `${viewerPage}?path=${encodeURIComponent(cleanPath)}&name=${encodeURIComponent(f.title)}${extraParams}`;

        const div = document.createElement("div");
        div.className = "activity-item";

        div.innerHTML = `
            <div class="file-info">
                <a href="${viewTargetUrl}" title="${f.title}">${f.title}</a>
                <span>Viewed at ${f.time} • ${f.meta}</span>
            </div>
            <div class="badges-group">
                <span class="badge ${isDownloaded ? 'downloaded' : 'not-downloaded'}">
                    ${isDownloaded ? 'Downloaded' : 'Not Downloaded'}
                </span>
                <a href="${viewTargetUrl}" class="view-btn">View File →</a>
            </div>
        `;

        recentList.appendChild(div);
    });
}
