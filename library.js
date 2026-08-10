document.addEventListener("DOMContentLoaded", () => {
    renderActivityFeed();
});

function getData(key){
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function renderActivityFeed() {
    const recentList = document.getElementById("recentList");
    if (!recentList) return;

    let recent = getData("recentFiles");
    let downloads = getData("downloadedFiles");

    if (!recent.length) {
        recentList.innerHTML = `<div class="empty">No recent activity recorded yet.</div>`;
        return;
    }

    recentList.innerHTML = "";

    recent.forEach(f => {
        let isDownloaded = downloads.some(item => item.url === f.url || item.title === f.title) || f.downloaded;

        // Automatically determine viewer link based on file type/extension
        let viewerPage = "notes-viewer.html";
        let cleanPath = f.url || "";
        
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

        const viewTargetUrl = `${viewerPage}?path=${encodeURIComponent(cleanPath)}&name=${encodeURIComponent(f.title)}`;

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
