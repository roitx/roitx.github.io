/* =========================================================
   library.js  –  sirf TRACKING (viewer / test / download pages ke liye)
   Purane naam same hain: getData, trackActivityLocally, cleanTitleString
   Koi naya global let/const nahi, taaki kisi page ke script se na takraye.
   Recent Activities ka UI activity-ui.js me hai (sirf library.html me).
   ========================================================= */
function getData(key) {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { return []; }
}

// Unified activity log me entry (activity-log.js load na ho tab bhi chalega)
function pmLogActivity(e) {
    if (window.ActivityLog) { window.ActivityLog.add(e); return; }
    try {
        var log = JSON.parse(localStorage.getItem("activityLog") || "[]");
        if (!Array.isArray(log)) log = [];
        e.ts = Date.now();
        var k = function (x) { return x.type + "|" + (x.refId || x.url || x.title); };
        if (log[0] && k(log[0]) === k(e) && e.ts - log[0].ts < 120000) log[0] = e; else log.unshift(e);
        localStorage.setItem("activityLog", JSON.stringify(log.slice(0, 300)));
    } catch (err) {}
}

// Track Activity Function
function trackActivityLocally(fileData, isDownloaded = false) {
    try {
        let recent = getData("recentFiles");
        let downloads = getData("downloadedFiles");
        let localPurchases = getData("userPurchasedNotes");

        let rawUrl = fileData.url || "";
        let cleanBaseUrl = rawUrl.split('?')[0];
        const isPurchased = fileData.isPurchased || false;

        // PYQ / Test / Flashcard detection
        const isPyqItem = fileData.isPyq || rawUrl.toLowerCase().includes("pyq") || (fileData.meta && fileData.meta.toLowerCase().includes("pyq"));
        const isTestItem = fileData.isTest || cleanBaseUrl.toLowerCase().includes("take-test") || (fileData.meta && fileData.meta.toLowerCase().includes("test"));
        const isFlashcardItem = rawUrl.toLowerCase().includes("flashcard-reader") || (fileData.meta && fileData.meta.toLowerCase().includes("flashcard"));

        // Only add to downloadedFiles if it is NOT a PYQ/Flashcard paper and explicitly marked downloaded
        if (!isPyqItem && !isFlashcardItem && isDownloaded && !downloads.some(f => f.url && f.url.split('?')[0] === cleanBaseUrl)) {
            fileData.timeDownloaded = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            fileData.tsDownloaded = Date.now();
            downloads.unshift(fileData);
            localStorage.setItem("downloadedFiles", JSON.stringify(downloads));
        }

        if (isPurchased && !localPurchases.some(f => f.title && f.title.toLowerCase() === (fileData.title || "").toLowerCase())) {
            localPurchases.unshift({ title: fileData.title, url: cleanBaseUrl });
            localStorage.setItem("userPurchasedNotes", JSON.stringify(localPurchases));
        }

        const isCurrentPremium = fileData.isPremium || cleanBaseUrl.toLowerCase().includes("premium") || cleanBaseUrl.toLowerCase().includes("paid");

        let existingIndex = recent.findIndex(f => (f.url && f.url.split('?')[0] === cleanBaseUrl) || f.title === fileData.title);
        let viewCount = 1;
        if (existingIndex !== -1) {
            viewCount = (recent[existingIndex].viewCount || 1) + 1;
            recent.splice(existingIndex, 1);
        }

        let defaultMeta = "Viewer";
        if (isPyqItem) defaultMeta = "PYQ Paper";
        else if (isTestItem) defaultMeta = "Mock Test";
        else if (isFlashcardItem) defaultMeta = "Flashcard Set";

        recent.unshift({
            title: fileData.title,
            url: fileData.url, 
            meta: fileData.meta || defaultMeta,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            downloaded: (isPyqItem || isFlashcardItem) ? false : (downloads.some(f => f.url && f.url.split('?')[0] === cleanBaseUrl) || isDownloaded),
            isPurchased: isPurchased,
            isPremium: isCurrentPremium,
            isTest: isTestItem,
            isPyq: isPyqItem,
            isFlashcard: isFlashcardItem,
            viewCount: viewCount
        });

        recent = recent.slice(0, 20);
        localStorage.setItem("recentFiles", JSON.stringify(recent));

        // Unified activity log me bhi daalo
        console.debug("[PM Roitx] activity saved:", fileData.title);
        pmLogActivity({ type: "file", title: fileData.title, url: fileData.url, meta: recent[0].meta, file: recent[0] });
    } catch (e) {
        console.error("Tracking Error: ", e);
    }
}


function cleanTitleString(str) {
    if (!str) return "";
    return str.replace(/[^\w\s]/gi, '').toLowerCase().trim();
}


