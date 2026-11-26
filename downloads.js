// downloads.js – sirf downloaded files ki chhoti list (library.js ke helpers use karta hai)
async function renderDownloads() {
    const list = document.getElementById("downloadList");
    const countTag = document.getElementById("dlCount");
    if (!list) return;

    const downloads = getData("downloadedFiles");
    countTag.textContent = downloads.length ? "(" + downloads.length + ")" : "";

    if (!downloads.length) {
        list.innerHTML = emptyState("No downloaded files yet.");
        return;
    }

    const ctx = await buildCtx();
    list.innerHTML = "";

    downloads.forEach((d, i) => {
        const r = resolveFile(d, ctx);
        const when = d.tsDownloaded
            ? new Date(d.tsDownloaded).toLocaleDateString([], { day: "numeric", month: "short" }) + ", " + (d.timeDownloaded || "")
            : (d.timeDownloaded || "");

        const row = document.createElement("div");
        row.className = "item";
        row.innerHTML = `
            ${iconTile(fileKind(d, r) === "file" || fileKind(d, r) === "image" || fileKind(d, r) === "premium" ? fileKind(d, r) : "file")}
            <div class="info">
                <a href="${esc(r.viewTargetUrl)}" title="${esc(d.title)}">${esc(d.title)}</a>
                <span>Downloaded ${esc(when)}${d.meta ? " \u2022 " + esc(d.meta) : ""}</span>
            </div>
            <div class="actions">
                <a class="open-btn" href="${esc(r.viewTargetUrl)}">Open \u2192</a>
                <button class="rm-btn" onclick="removeDownload(${i})"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Remove</button>
            </div>`;
        list.appendChild(row);
    });
}

// Sirf list se hatata hai, device ki file ko nahi chhuta
function removeDownload(i) {
    const downloads = getData("downloadedFiles");
    downloads.splice(i, 1);
    localStorage.setItem("downloadedFiles", JSON.stringify(downloads));
    renderDownloads();
}

document.addEventListener("DOMContentLoaded", renderDownloads);
window.addEventListener("pageshow", renderDownloads);
