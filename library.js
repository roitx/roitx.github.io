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

        if (isDownloaded && !downloads.some(f => f.url === fileData.url)) {
            fileData.timeDownloaded = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            downloads.unshift(fileData);
            localStorage.setItem("downloadedFiles", JSON.stringify(downloads));
        }

        const alreadyDownloaded = downloads.some(f => f.url === fileData.url) || isDownloaded;

        // Remove duplicate entry so it only appears once at the top
        recent = recent.filter(f => f.url !== fileData.url);
        recent.unshift({
            title: fileData.title,
            url: fileData.url,
            meta: fileData.meta || "Viewer",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloaded: alreadyDownloaded
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

    if (showOnlyDownloaded) {
        recent = recent.filter(f => {
            let isDownloaded = downloads.some(item => item.url === f.url || item.title === f.title) || f.downloaded;
            return isDownloaded;
        });
    }

    if (!recent.length) {
        recentList.innerHTML = `<div class="empty">${showOnlyDownloaded ? "No downloaded files found." : "No recent activity recorded yet."}</div>`;
        return;
    }

    recentList.innerHTML = "";

    recent.forEach(f => {
        let isDownloaded = downloads.some(item => item.url === f.url || item.title === f.title) || f.downloaded;

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
