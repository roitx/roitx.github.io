// view.js — PDF Viewer Logic aligned with ask-chat.js

(function () {
  // ---- URL PARAMS EXTRACTOR ----
  function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      path: params.get('path'),
      name: params.get('name') || params.get('file')
    };
  }

  // ---- DOM INITIALIZATION & PDF LOADING ----
  document.addEventListener('DOMContentLoaded', () => {
    const { path, name } = getQueryParams();
    const pdfFrame = document.getElementById('pdfFrame');
    const titleEl = document.getElementById('pdfTitle');
    const downloadBtn = document.getElementById('downloadBtn');

    if (!name && !path) {
      if (titleEl) titleEl.textContent = '❌ No PDF Specified';
      alert('PDF file name or path missing!');
      return;
    }

    // Standardize PDF Path (matching ask-chat.js structure)
    let finalPath = path;
    
    if (!finalPath) {
      // If only name/file is provided, wrap it in notes/ directory
      const cleanName = name.startsWith('notes/') ? name : `notes/${name}`;
      finalPath = cleanName;
    }

    // Set Document Title and UI Header
    const displayName = name ? name.replace(/^notes\//, '') : finalPath.replace(/^notes\//, '');
    if (titleEl) titleEl.textContent = displayName;
    document.title = `Viewing: ${displayName}`;

    // Load PDF in iframe or embed viewer
    if (pdfFrame) {
      pdfFrame.src = finalPath;
    }

    // Setup Download Action
    if (downloadBtn) {
      downloadBtn.href = finalPath;
      downloadBtn.setAttribute('download', displayName);
    }
  });
})();
