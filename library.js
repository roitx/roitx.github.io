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

        // Ensure isPurchased flag is stored
        const isPurchased = fileData.isPurchased || false;

        // Agar user click kar ke viewer par gaya ya purchase/downloaded state h
        if ((isDownloaded || isPurchased) && !downloads.some(f => f.url && f.url.split('?')[0] === cleanBaseUrl)) {
            fileData.timeDownloaded = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            fileData.isPurchased = true;
            downloads.unshift(fileData);
            localStorage.setItem("downloadedFiles", JSON.stringify(downloads));
        }

        // Offline storage me purchased entry add karo
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

// Helper to normalize strings for comparison (Removes special chars like 💎 and spaces)
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
    let supabaseApprovedNoteIds = [];

    // 🌟 SUPABASE SYNC: Fetch Supabase purchases & user_purchases if user is online
    try {
        if (window.supabaseClient && typeof window.getCurrentUser === "function") {
            const user = await window.getCurrentUser();
            if (user) {
                // Fetch approved orders
                const { data: ordersData } = await window.supabaseClient
                    .from('user_orders')
                    .select('note_id, note_title, status')
                    .eq('user_email', user.email)
                    .eq('status', 'approved');

                // Fetch direct user_purchases
                const { data: userPurchasesData } = await window.supabaseClient
                    .from('user_purchases')
                    .select('note_id')
                    .eq('user_id', user.id);

                if (userPurchasesData) {
                    userPurchasesData.forEach(p => supabaseApprovedNoteIds.push(String(p.note_id)));
                }

                if (ordersData) {
                    ordersData.forEach(o => {
                        if (o.note_id) supabaseApprovedNoteIds.push(String(o.note_id));
                        if (o.note_title) {
                            const cleaned = cleanTitleString(o.note_title);
                            if (cleaned) supabaseApprovedTitles.push(cleaned);
                            
                            // Offline Cache Backup
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
        console.log("Supabase fetch skip in offline mode:", err);
    }

    if (showOnlyDownloaded) {
        recent = recent.filter(f => {
            let cleanPath = f.url ? f.url.split('?')[0] : "";
            let cleanedTitle = cleanTitleString(f.title);

            const isDownloaded = downloads.some(item => (item.url && item.url.split('?')[0] === cleanPath) || cleanTitleString(item.title) === cleanedTitle);
            const isLocalPurchased = localPurchases.some(lp => cleanTitleString(lp.title) === cleanedTitle);
            const isSupabasePurchased = supabaseApprovedTitles.some(st => cleanedTitle.includes(st) || st.includes(cleanedTitle));

            return f.isPurchased || isDownloaded || isLocalPurchased || isSupabasePurchased;
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

        // 🌟 FORCE PURCHASED QUERY PARAMETER: Agar purchased ho chuka hai toh strict purchased=true hi jayega
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
            badgeText = isPurchased ? "Purchased" : "Downloaded";
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
