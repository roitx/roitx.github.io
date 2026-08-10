/* ==========================================================
   LIBRARY.JS - Home Page Recent Activity Widget Logic
   ========================================================== */

let recentList;

document.addEventListener("DOMContentLoaded", () => {
    recentList = document.getElementById("recentList");
    renderActivityFeed();
});

/* =========================
   STORAGE HELPERS
   ========================= */
function getData(key){
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function saveData(key, data){
  localStorage.setItem(key, JSON.stringify(data));
}

/* =========================
   ADD / UPDATE RECENT ACTIVITY
   ========================= */
function trackActivity(fileData, isDownloaded = false) {
    let recent = getData("recentFiles");
    
    // Check if already in downloads
    let downloads = getData("downloadedFiles");
    let isAlreadyDownloaded = downloads.some(f => f.url === fileData.url) || isDownloaded;

    if (isAlreadyDownloaded && !downloads.some(f => f.url === fileData.url)) {
        downloads.unshift(fileData);
        saveData("downloadedFiles", downloads);
    }

    // Format timestamp
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Remove old instance to move it to the top with updated status
    recent = recent.filter(f => f.url !== fileData.url);
    
    recent.unshift({
        title: fileData.title,
        url: fileData.url,
        meta: fileData.meta || "Viewed recently",
        time: timeString,
        downloaded: isAlreadyDownloaded
    });

    recent = recent.slice(0, 5); // Top 5 recent items
    saveData("recentFiles", recent);
    renderActivityFeed();
}

/* =========================
   RENDER ACTIVITY FEED
   ========================= */
function renderActivityFeed() {
    if (!recentList) return;

    let recent = getData("recentFiles");
    let downloads = getData("downloadedFiles");

    if (!recent.length) {
        recentList.innerHTML = `<div class="empty">No recent activity recorded yet.</div>`;
        return;
    }

    recentList.innerHTML = "";

    recent.forEach(f => {
        // Double check download status across storage
        let isDownloaded = downloads.some(item => item.url === f.url) || f.downloaded;

        const div = document.createElement("div");
        div.className = "activity-item";

        div.innerHTML = `
            <div class="file-info">
                <b>${f.title}</b>
                <span>Viewed at ${f.time} • ${f.meta}</span>
            </div>
            <div class="badges-group">
                <span class="badge ${isDownloaded ? 'downloaded' : 'not-downloaded'}">
                    ${isDownloaded ? 'Downloaded' : 'Not Downloaded'}
                </span>
            </div>
        `;

        recentList.appendChild(div);
    });
}

/* =========================
   TESTING SIMULATIONS
   ========================= */
function simulateViewFile(fileName, shouldDownload) {
    const file = {
        title: fileName,
        url: `#${fileName.toLowerCase().replace(/\s+/g, '-')}`,
        meta: "Document / Asset"
    };

    trackActivity(file, shouldDownload);
}
