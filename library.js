let showOnlyDownloaded = false;

document.addEventListener("DOMContentLoaded", () => {
    renderActivityFeed();
});

function getData(key){
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

// Global helper to track and prevent duplicates cleanly
function trackActivityLocally(fileData, isDownloaded = false) {
    try {
        let recent = getData("recentFiles");
        let downloads = getData("downloadedFiles");

        // Clean base URL for duplicate checking
        let cleanBaseUrl = fileData.url ? fileData.url.split('?')[0] : "";

        if (isDownloaded && !downloads.some(f => f.url && f.url.split('?')[0] === cleanBaseUrl)) {
            fileData.timeDownloaded = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            downloads.unshift(fileData);
            localStorage.setItem("downloadedFiles", JSON.stringify(downloads));
        }

        const alreadyDownloaded = downloads.some(f => f.url && f.url.split('?')[0] === cleanBaseUrl) || isDownloaded;

        // Check if current file is premium
        const isCurrentPremium = fileData.isPremium || (fileData.url && (fileData.url.toLowerCase().includes("premium") || fileData.url.toLowerCase().includes("paid") || fileData.url.toLowerCase().includes("locked")));

        // Remove duplicate entry based on clean base URL
        recent = recent.filter(f => !f.url || f.url.split('?')[0] !== cleanBaseUrl);
        recent.unshift({
            title: fileData.title,
            url: fileData.url,
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

function renderActivityFeed() {
    const recentList = document.getElementById("recentList");
    if (!recentList) return;

    let recent = getData("recentFiles");
    let downloads = getData("downloadedFiles");
    let purchasedNotes = getData("userPurchasedNotes"); // Purchase records array

    if (showOnlyDownloaded) {
        recent = recent.filter(f => {
            let cleanPath = f.url ? f.url.split('?')[0] : "";
            let isDownloaded = downloads.some(item => (item.url && item.url.split('?')[0] === cleanPath) || item.title === f.title) || f.downloaded;
            return isDownloaded;
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
        
        // Step 1: Base URL me se purane parameters (&type=premium wagairah) ko clean karein
        let cleanPath = rawUrl.split('?')[0];

        // Step 2: Dynamic Purchase & Download Verification
        let isDownloaded = downloads.some(item => (item.url && item.url.split('?')[0] === cleanPath) || item.title === f.title) || f.downloaded;
        let isPurchased = purchasedNotes.some(item => (item.url && item.url.split('?')[0] === cleanPath) || item.title === f.title);

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

        // Step 3: Check overall premium flag
        let isFilePremium = f.isPremium || cleanPath.toLowerCase().includes("premium") || cleanPath.toLowerCase().includes("paid") || cleanPath.toLowerCase().includes("locked") || cleanPath.toLowerCase().includes("special");

        // Step 4: Agar item Purchase ya Download nahi hua hai TABHI &type=premium attach hoga
        let extraParam = (isFilePremium && !isPurchased && !isDownloaded) ? "&type=premium" : "";

        const viewTargetUrl = `${viewerPage}?path=${encodeURIComponent(cleanPath)}&name=${encodeURIComponent(f.title)}${extraParam}`;

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
