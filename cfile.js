/* ==========================================================================
   Roitx Studio IDE - Pro Engine (HTML, CSS, JS & Python Support) [Complete]
   ========================================================================== */

const STORAGE_KEY_HTML = "roitx_v5_html";
const STORAGE_KEY_CSS = "roitx_v5_css";
const STORAGE_KEY_JS = "roitx_v5_js";
const STORAGE_KEY_PY = "roitx_v5_py";

let logCount = 0;

const defaultHTML = `<div class=\"card\">\n  <h1>Roitx Studio v5</h1>\n  <p>HTML, CSS, JS & Python IDE!</p>\n  <button onclick=\"sayHello()\">Click JS</button>\n</div>`;
const defaultCSS = `body {\n  background: #0a0c10;\n  color: #fff;\n  font-family: sans-serif;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n\n.card {\n  background: #12161f;\n  padding: 30px;\n  border-radius: 12px;\n  border: 1px solid #00f0ff;\n  box-shadow: 0 0 20px rgba(0,240,255,0.2);\n  text-align: center;\n}\n\nh1 { color: #00f0ff; }\nbutton {\n  background: #00ff70;\n  border: none;\n  padding: 10px 20px;\n  font-weight: bold;\n  border-radius: 6px;\n  cursor: pointer;\n}`;
const defaultJS = `function sayHello() {\n  console.log("Button Clicked inside Roitx Studio!");\n  alert("Welcome to Roitx v5 Studio!");\n}`;
const defaultPY = `# Python Script Runner via Brython\ndef greet_user(name):\n    print(f"Hello from Python, {name}!")\n\ngreet_user("Roitx")`;

let htmlInput, cssInput, jsInput, pyInput;
let htmlHighlight, cssHighlight, jsHighlight, pyHighlight;
let htmlLineNums, cssLineNums, jsLineNums, pyLineNums;
let liveFrame, consoleOutput, consoleBadge, autoSaveStatus, editorStats;

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ==========================================================================
   1. Syntax Highlighting Engines (HTML, CSS, JS, Python)
   ========================================================================== */
function highlightHTML(code) {
    let escaped = escapeHTML(code);
    escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hl-comment">$1</span>');
    escaped = escaped.replace(/(&lt;\/?)([a-zA-Z0-9-]+)([^&]*?)(&gt;)/g, function(match, p1, p2, p3, p4) {
        let attrs = p3.replace(/([a-zA-Z0-9-]+)=\s*("[^"]*"|'[^']*')/g, function(m, aName, aVal) {
            return `<span class="hl-attr-name">${aName}</span>=<span class="hl-attr-val">${aVal}</span>`;
        });
        return `${p1}<span class="hl-tag">${p2}</span>${attrs}${p4}`;
    });
    return escaped;
}

function highlightCSS(code) {
    let escaped = escapeHTML(code);
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>');
    escaped = escaped.replace(/([^{]+)\{/g, '<span class="hl-css-selector">$1</span>{');
    escaped = escaped.replace(/([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g, '<span class="hl-css-prop">$1</span>: <span class="hl-attr-val">$2</span>;');
    return escaped;
}

function highlightJS(code) {
    let escaped = escapeHTML(code);
    escaped = escaped.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="hl-string">$1</span>');
    escaped = escaped.replace(/\b(function|let|const|var|return|goto|if|else|for|while|class|import|export|true|false)\b/g, '<span class="hl-keyword">$1</span>');
    escaped = escaped.replace(/\b([a-zA-Z0-9_]+)(?=\()/g, '<span class="hl-function">$1</span>');
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="hl-number">$1</span>');
    escaped = escaped.replace(/(\/\/[^\n]*)/g, '<span class="hl-comment">$1</span>');
    return escaped;
}

function highlightPY(code) {
    let escaped = escapeHTML(code);
    escaped = escaped.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="hl-string">$1</span>');
    escaped = escaped.replace(/\b(def|return|if|else|elif|for|while|import|from|in|as|class|True|False|None|print)\b/g, '<span class="hl-keyword">$1</span>');
    escaped = escaped.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\()/g, '<span class="hl-function">$1</span>');
    escaped = escaped.replace(/(#[^\n]*)/g, '<span class="hl-comment">$1</span>');
    return escaped;
}

/* ==========================================================================
   2. Core Panel Sync & Updates
   ========================================================================== */
function updatePanel(type) {
    let input, highlight, lineNums, parser;

    if (type === 'html') { input = htmlInput; highlight = htmlHighlight; lineNums = htmlLineNums; parser = highlightHTML; }
    else if (type === 'css') { input = cssInput; highlight = cssHighlight; lineNums = cssLineNums; parser = highlightCSS; }
    else if (type === 'js') { input = jsInput; highlight = jsHighlight; lineNums = jsLineNums; parser = highlightJS; }
    else if (type === 'py') { input = pyInput; highlight = pyHighlight; lineNums = pyLineNums; parser = highlightPY; }

    if (!input || !highlight || !lineNums) return;

    const text = input.value;
    const lines = text.split('\n').length;
    lineNums.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
    highlight.innerHTML = parser(text) + "\n";

    if (htmlInput) localStorage.setItem(STORAGE_KEY_HTML, htmlInput.value);
    if (cssInput) localStorage.setItem(STORAGE_KEY_CSS, cssInput.value);
    if (jsInput) localStorage.setItem(STORAGE_KEY_JS, jsInput.value);
    if (pyInput) localStorage.setItem(STORAGE_KEY_PY, pyInput.value);

    updateGlobalStats();
}

function updateGlobalStats() {
    if (!htmlInput || !cssInput || !jsInput || !pyInput) return;
    const totalLines = htmlInput.value.split('\n').length + cssInput.value.split('\n').length + jsInput.value.split('\n').length + pyInput.value.split('\n').length;
    const totalChars = htmlInput.value.length + cssInput.value.length + jsInput.value.length + pyInput.value.length;
    if (editorStats) editorStats.innerText = `Lines: ${totalLines} | Characters: ${totalChars}`;
    if (autoSaveStatus) autoSaveStatus.innerText = "Auto-Saved";
}

function setupScrollSync(input, highlight, lineNums) {
    if (!input || !highlight || !lineNums) return;
    input.addEventListener('scroll', () => {
        highlight.scrollTop = input.scrollTop;
        highlight.scrollLeft = input.scrollLeft;
        lineNums.scrollTop = input.scrollTop;
    });
}
/* ==========================================================================
   9. Save & Export Engine
   ========================================================================== */

// Export Dropdown Toggle
window.toggleExportMenu = function() {
    const menu = document.getElementById('exportMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
};

// Click outside to close dropdown
window.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.export-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        const menu = document.getElementById('exportMenu');
        if (menu) menu.classList.add('hidden');
    }
});

// Generic File Downloader Utility
function triggerDownload(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// 1. Save currently open tab file
window.saveCurrentActiveFile = function() {
    let activeTab = 'html';
    if (document.getElementById('cssPanel').classList.contains('active')) activeTab = 'css';
    if (document.getElementById('jsPanel').classList.contains('active')) activeTab = 'js';
    if (document.getElementById('pyPanel').classList.contains('active')) activeTab = 'py';

    if (activeTab === 'html') {
        triggerDownload('index.html', htmlInput.value, 'text/html');
    } else if (activeTab === 'css') {
        triggerDownload('style.css', cssInput.value, 'text/css');
    } else if (activeTab === 'js') {
        triggerDownload('script.js', jsInput.value, 'text/javascript');
    } else if (activeTab === 'py') {
        triggerDownload('main.py', pyInput.value, 'text/x-python');
    }
    toggleExportMenu();
};

// 2. Export full runnable single HTML file (CSS + JS + Python inside)
window.exportFullHTMLProject = function() {
    const fullSource = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Roitx Exported Project</title>
    <style>
${cssInput.value}
    </style>
    <!-- Brython Engine for Python Support -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/brython/3.11.1/brython.min.js"><\/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/brython/3.11.1/brython_stdlib.js"><\/script>
</head>
<body onload="brython()">

${htmlInput.value}

    <script>
${jsInput.value}
    <\/script>

    <script type="text/python">
${pyInput.value}
    <\/script>
</body>
</html>`;

    triggerDownload('roitx_project.html', fullSource, 'text/html');
    toggleExportMenu();
};

// 3. Export individual files one by one
window.exportAllSeparateFiles = function() {
    triggerDownload('index.html', htmlInput.value, 'text/html');
    setTimeout(() => triggerDownload('style.css', cssInput.value, 'text/css'), 200);
    setTimeout(() => triggerDownload('script.js', jsInput.value, 'text/javascript'), 400);
    if (pyInput.value.trim() !== '') {
        setTimeout(() => triggerDownload('main.py', pyInput.value, 'text/x-python'), 600);
    }
    toggleExportMenu();
};

/* ==========================================================================
   3. Smart Keyboard & Auto-Close Brackets / Tags Engine
   ========================================================================== */
function setupSmartKeyboard(input, type) {
    if (!input) return;

    input.addEventListener('keydown', (e) => {
        const start = input.selectionStart;
        const end = input.selectionEnd;

        if (e.key === 'Tab') {
            e.preventDefault();
            input.value = input.value.substring(0, start) + "    " + input.value.substring(end);
            input.selectionStart = input.selectionEnd = start + 4;
            updatePanel(type);
            return;
        }

        if (e.key === '>' && type === 'html') {
            const textBefore = input.value.substring(0, start);
            const lastOpenBracket = textBefore.lastIndexOf('<');
            
            if (lastOpenBracket !== -1) {
                const tagString = textBefore.substring(lastOpenBracket);
                if (tagString.startsWith('<') && !tagString.startsWith('</') && !tagString.endsWith('/')) {
                    const tagMatch = tagString.match(/^<([a-zA-Z0-9-]+)/);
                    if (tagMatch) {
                        e.preventDefault();
                        const tagName = tagMatch[1];
                        const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'];

                        if (selfClosing.includes(tagName.toLowerCase())) {
                            input.value = input.value.substring(0, start) + '>' + input.value.substring(end);
                            input.selectionStart = input.selectionEnd = start + 1;
                        } else {
                            const closeTag = `></${tagName}>`;
                            input.value = input.value.substring(0, start) + closeTag + input.value.substring(end);
                            input.selectionStart = input.selectionEnd = start + 1;
                        }
                        updatePanel(type);
                        return;
                    }
                }
            }
        }
    });

    input.addEventListener('input', () => updatePanel(type));
}

/* ==========================================================================
   4. Advanced Search, Match Count & Navigation Logic
   ========================================================================== */
let searchMatches = [];
let currentMatchIndex = -1;

window.toggleFindReplaceModal = function() {
    const modal = document.getElementById('findReplaceModal');
    if (modal) {
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
            document.getElementById('findInput').focus();
        }
    }
};

function getActiveEditorTextArea() {
    if (document.getElementById('htmlPanel').classList.contains('active')) return document.getElementById('htmlInput');
    if (document.getElementById('cssPanel').classList.contains('active')) return document.getElementById('cssInput');
    if (document.getElementById('jsPanel').classList.contains('active')) return document.getElementById('jsInput');
    if (document.getElementById('pyPanel').classList.contains('active')) return document.getElementById('pyInput');
    return null;
}

window.handleSearchInput = function() {
    const query = document.getElementById('findInput').value;
    const textArea = getActiveEditorTextArea();
    const counterSpan = document.getElementById('matchCounter');

    searchMatches = [];
    currentMatchIndex = -1;

    if (!query || !textArea) {
        counterSpan.innerText = "0/0";
        return;
    }

    let text = textArea.value;
    let index = text.indexOf(query);

    while (index !== -1) {
        searchMatches.push({ start: index, end: index + query.length });
        index = text.indexOf(query, index + 1);
    }

    if (searchMatches.length > 0) {
        currentMatchIndex = 0;
        counterSpan.innerText = `1/${searchMatches.length}`;
        highlightAndSelectMatch();
    } else {
        counterSpan.innerText = "0/0";
    }
};

window.navigateMatch = function(direction) {
    if (searchMatches.length === 0) return;

    currentMatchIndex += direction;
    if (currentMatchIndex >= searchMatches.length) currentMatchIndex = 0;
    if (currentMatchIndex < 0) currentMatchIndex = searchMatches.length - 1;

    document.getElementById('matchCounter').innerText = `${currentMatchIndex + 1}/${searchMatches.length}`;
    highlightAndSelectMatch();
};

function highlightAndSelectMatch() {
    const textArea = getActiveEditorTextArea();
    if (!textArea || searchMatches.length === 0) return;

    let match = searchMatches[currentMatchIndex];
    textArea.focus();
    textArea.setSelectionRange(match.start, match.end);

    let textLinesBefore = textArea.value.substring(0, match.start).split("\n").length;
    textArea.scrollTop = (textLinesBefore - 3) * 20; 
}

window.executeSingleReplace = function() {
    const query = document.getElementById('findInput').value;
    const replaceText = document.getElementById('replaceInput').value;
    const textArea = getActiveEditorTextArea();

    if (!query || !textArea || searchMatches.length === 0) return;

    let match = searchMatches[currentMatchIndex];
    let text = textArea.value;
    
    textArea.value = text.substring(0, match.start) + replaceText + text.substring(match.end);
    textArea.dispatchEvent(new Event('input'));
    handleSearchInput();
};

window.executeReplaceAll = function() {
    const query = document.getElementById('findInput').value;
    const replaceText = document.getElementById('replaceInput').value;
    const textArea = getActiveEditorTextArea();

    if (!query || !textArea) return;

    let content = textArea.value;
    textArea.value = content.replaceAll(query, replaceText);
    textArea.dispatchEvent(new Event('input'));
    
    document.getElementById('matchCounter').innerText = "0/0";
    searchMatches = [];
    alert('All occurrences replaced successfully!');
};

/* ==========================================================================
   5. Custom Font Size Adjuster (Code Text & Line Numbers Fixed)
   ========================================================================== */
let currentFontSize = 13.5;

window.changeFontSize = function(direction) {
    currentFontSize += direction * 1.5;
    if (currentFontSize < 10) currentFontSize = 10;
    if (currentFontSize > 24) currentFontSize = 24;

    const textareas = document.querySelectorAll('textarea');
    const highlights = document.querySelectorAll('.highlight-layer');
    const lineNumbers = document.querySelectorAll('.line-numbers');

    textareas.forEach(el => {
        el.style.fontSize = currentFontSize + 'px';
        el.style.lineHeight = '1.6';
    });

    highlights.forEach(el => {
        el.style.fontSize = currentFontSize + 'px';
        el.style.lineHeight = '1.6';
    });

    lineNumbers.forEach(el => {
        el.style.fontSize = currentFontSize + 'px';
        el.style.lineHeight = '1.6';
    });
};

/* ==========================================================================
   6. Keyboard Shortcut Toolbar Helper & Device Mode
   ========================================================================== */
   window.toggleThemeMode = function() {
    document.body.classList.toggle('light-theme');
    
    // Icon change logic (Moon <-> Sun)
    const icon = document.querySelector('#mode-toggle i');
    if (icon) {
        if (document.body.classList.contains('light-theme')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun'); // Light mode me Suraj dikhega
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon'); // Dark mode me Chand dikhega
        }
    }
};

window.insertAtCursor = function(textareaId, textToInsert) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    textarea.value = value.substring(0, start) + textToInsert + value.substring(end);
    
    let newCursorPos = start + textToInsert.length;
    if (textToInsert === '()') newCursorPos = start + 1;
    if (textToInsert === '{}') newCursorPos = start + 1;
    if (textToInsert === '""') newCursorPos = start + 1;

    textarea.selectionStart = textarea.selectionEnd = newCursorPos;
    textarea.focus();

    const type = textareaId.replace('Input', '');
    updatePanel(type);
    triggerLivePreview();
};

window.setDeviceMode = function(mode) {
    const previewWrapper = document.getElementById('previewWrapper');
    const btnFull = document.getElementById('btnDeviceFull');
    const btnMobile = document.getElementById('btnDeviceMobile');

    if (mode === 'mobile') {
        if (previewWrapper) previewWrapper.classList.add('mobile-mode');
        if (btnMobile) btnMobile.classList.add('active');
        if (btnFull) btnFull.classList.remove('active');
    } else {
        if (previewWrapper) previewWrapper.classList.remove('mobile-mode');
        if (btnFull) btnFull.classList.add('active');
        if (btnMobile) btnMobile.classList.remove('active');
    }
};

/* ==========================================================================
   7. Live Preview & Virtual Console Engine
   ========================================================================== */
window.runManualCode = function() {
    triggerLivePreview();
};

window.togglePreviewPanel = function() {
    const previewContainer = document.querySelector('.output-container');
    if (previewContainer) {
        previewContainer.classList.toggle('collapsed-preview');
    }
};

window.openPreviewFullscreen = function() {
    if (liveFrame && liveFrame.requestFullscreen) {
        liveFrame.requestFullscreen();
    }
};

function triggerLivePreview() {
    if (!liveFrame) return;
    const source = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>${cssInput ? cssInput.value : ''}</style>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/brython/3.11.1/brython.min.js"><\/script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/brython/3.11.1/brython_stdlib.js"><\/script>
        </head>
        <body onload="brython()">
            ${htmlInput ? htmlInput.value : ''}
            
            <script>
                (function() {
                    var oldLog = console.log;
                    var oldErr = console.error;
                    console.log = function(...args) {
                        window.parent.postMessage({ type: 'log', data: args.join(' ') }, '*');
                        oldLog.apply(console, args);
                    };
                    console.error = function(...args) {
                        window.parent.postMessage({ type: 'error', data: args.join(' ') }, '*');
                        oldErr.apply(console, args);
                    };
                    window.onerror = function(msg, url, line) {
                        window.parent.postMessage({ type: 'error', data: msg + ' (Line ' + line + ')' }, '*');
                    };
                })();

                function __BRYTHON_PRINT__(msg) {
                    window.parent.postMessage({ type: 'log', data: msg }, '*');
                }
            <\/script>

            <script>${jsInput ? jsInput.value : ''}<\/script>

            <script type="text/python">
                import sys
                from browser import document, window

                class ConsoleWriter:
                    def write(self, text):
                        if text.strip():
                            window.__BRYTHON_PRINT__(text.strip())

                sys.stdout = ConsoleWriter()
                sys.stderr = ConsoleWriter()

                try:
                    exec(${JSON.stringify(pyInput ? pyInput.value : '')})
                except Exception as e:
                    window.__BRYTHON_PRINT__("Python Error: " + str(e))
            <\/script>
        </body>
        </html>
    `;
    liveFrame.srcdoc = source;
}

window.addEventListener('message', (e) => {
    if (e.data && e.data.type && consoleOutput) {
        logCount++;
        if (consoleBadge) consoleBadge.innerText = logCount;

        const entry = document.createElement('div');
        entry.className = `log-entry ${e.data.type === 'error' ? 'log-error' : ''}`;
        entry.innerText = `> ${e.data.data}`;
        consoleOutput.appendChild(entry);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
});

/* ==========================================================================
   8. Global Actions, Tabs & Initialization
   ========================================================================== */
window.switchEditorTab = function(tabName) {
    document.querySelectorAll('.editor-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabName + 'Panel').classList.add('active');
    document.getElementById('tabBtn' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).classList.add('active');
};

window.switchOutputTab = function(tabName) {
    const previewWrapper = document.getElementById('previewWrapper');
    const consoleWrapper = document.getElementById('consoleWrapper');
    const btnPreviewTab = document.getElementById('btnPreviewTab');
    const btnConsoleTab = document.getElementById('btnConsoleTab');

    if (tabName === 'preview') {
        previewWrapper.classList.remove('hidden');
        consoleWrapper.classList.add('hidden');
        btnPreviewTab.classList.add('active');
        btnConsoleTab.classList.remove('active');
    } else {
        previewWrapper.classList.add('hidden');
        consoleWrapper.classList.remove('hidden');
        btnConsoleTab.classList.add('active');
        btnPreviewTab.classList.remove('active');
    }
};

window.clearEditor = function(type) {
    if (type === 'html' && htmlInput) { htmlInput.value = ''; updatePanel('html'); }
    else if (type === 'css' && cssInput) { cssInput.value = ''; updatePanel('css'); }
    else if (type === 'js' && jsInput) { jsInput.value = ''; updatePanel('js'); }
    else if (type === 'py' && pyInput) { pyInput.value = ''; updatePanel('py'); }
    triggerLivePreview();
};

window.addEventListener('DOMContentLoaded', () => {
    htmlInput = document.getElementById('htmlInput');
    cssInput = document.getElementById('cssInput');
    jsInput = document.getElementById('jsInput');
    pyInput = document.getElementById('pyInput');

    htmlHighlight = document.getElementById('htmlHighlight');
    cssHighlight = document.getElementById('cssHighlight');
    jsHighlight = document.getElementById('jsHighlight');
    pyHighlight = document.getElementById('pyHighlight');

    htmlLineNums = document.getElementById('htmlLineNums');
    cssLineNums = document.getElementById('cssLineNums');
    jsLineNums = document.getElementById('jsLineNums');
    pyLineNums = document.getElementById('pyLineNums');

    liveFrame = document.getElementById('liveFrame');
    consoleOutput = document.getElementById('consoleOutput');
    consoleBadge = document.getElementById('consoleBadge');
    autoSaveStatus = document.getElementById('autoSaveStatus');
    editorStats = document.getElementById('editorStats');

    if (htmlInput) htmlInput.value = localStorage.getItem(STORAGE_KEY_HTML) || defaultHTML;
    if (cssInput) cssInput.value = localStorage.getItem(STORAGE_KEY_CSS) || defaultCSS;
    if (jsInput) jsInput.value = localStorage.getItem(STORAGE_KEY_JS) || defaultJS;
    if (pyInput) pyInput.value = localStorage.getItem(STORAGE_KEY_PY) || defaultPY;

    setupScrollSync(htmlInput, htmlHighlight, htmlLineNums);
    setupScrollSync(cssInput, cssHighlight, cssLineNums);
    setupScrollSync(jsInput, jsHighlight, jsLineNums);
    setupScrollSync(pyInput, pyHighlight, pyLineNums);

    setupSmartKeyboard(htmlInput, 'html');
    setupSmartKeyboard(cssInput, 'css');
    setupSmartKeyboard(jsInput, 'js');
    setupSmartKeyboard(pyInput, 'py');

    updatePanel('html');
    updatePanel('css');
    updatePanel('js');
    updatePanel('py');

    triggerLivePreview();
});
/* ==========================================================================
   9. Save & Export Engine (With Custom Naming & Extension Support)
   ========================================================================== */

// Export Dropdown Toggle
window.toggleExportMenu = function() {
    const menu = document.getElementById('exportMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
};

// Click outside to close dropdown
window.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.export-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        const menu = document.getElementById('exportMenu');
        if (menu) menu.classList.add('hidden');
    }
});

// Generic File Downloader Utility
function triggerDownload(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// 1. Save Currently Active File (Custom Name & Extension)
window.saveCurrentActiveFile = function() {
    let content = '';
    let defaultName = 'roitx.txt';

    if (document.getElementById('htmlPanel').classList.contains('active')) {
        content = htmlInput ? htmlInput.value : '';
        defaultName = 'index.html';
    } else if (document.getElementById('cssPanel').classList.contains('active')) {
        content = cssInput ? cssInput.value : '';
        defaultName = 'roitx.css';
    } else if (document.getElementById('jsPanel').classList.contains('active')) {
        content = jsInput ? jsInput.value : '';
        defaultName = 'roitx.js';
    } else if (document.getElementById('pyPanel').classList.contains('active')) {
        content = pyInput ? pyInput.value : '';
        defaultName = 'main.py';
    }

    const userFileName = prompt("फ़ाइल का नाम और एक्सटेंशन दर्ज करें (e.g., roitx.txt, mystyle.css):", defaultName);

    if (userFileName && userFileName.trim() !== "") {
        triggerDownload(userFileName.trim(), content, 'text/plain;charset=utf-8');
    }

    toggleExportMenu();
};

// 2. Export Full Web Page File (Custom Name & Extension)
window.exportFullHTMLProject = function() {
    const defaultName = 'roitx_project.html';
    const userFileName = prompt("वेबपेज फ़ाइल का नाम और एक्सटेंशन दर्ज करें (e.g., roitx.html, page.txt):", defaultName);

    if (!userFileName || userFileName.trim() === "") {
        toggleExportMenu();
        return;
    }

    const fullSource = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Roitx Exported Project</title>
    <style>
${cssInput ? cssInput.value : ''}
    </style>
    <!-- Brython Engine for Python Support -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/brython/3.11.1/brython.min.js"><\/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/brython/3.11.1/brython_stdlib.js"><\/script>
</head>
<body onload="brython()">

${htmlInput ? htmlInput.value : ''}

    <script>
${jsInput ? jsInput.value : ''}
    <\/script>

    <script type="text/python">
${pyInput ? pyInput.value : ''}
    <\/script>
</body>
</html>`;

    triggerDownload(userFileName.trim(), fullSource, 'text/plain;charset=utf-8');
    toggleExportMenu();
};

// 3. Export All Separate Files (Custom Base Name Prefix)
window.exportAllSeparateFiles = function() {
    const basePrefix = prompt("फ़ाइलों का मुख्य नाम (Prefix) दर्ज करें:", "roitx");

    if (!basePrefix || basePrefix.trim() === "") {
        toggleExportMenu();
        return;
    }

    const prefix = basePrefix.trim();

    // अब डिफॉल्ट रूप से roitx_index.html, roitx.css, roitx.js नाम से सेव होगा (अगर यूज़र ने 'roitx' रखा)
    triggerDownload(`${prefix}_index.html`, htmlInput ? htmlInput.value : '', 'text/plain;charset=utf-8');
    setTimeout(() => triggerDownload(`${prefix}.css`, cssInput ? cssInput.value : '', 'text/plain;charset=utf-8'), 200);
    setTimeout(() => triggerDownload(`${prefix}.js`, jsInput ? jsInput.value : '', 'text/plain;charset=utf-8'), 400);
    
    if (pyInput && pyInput.value.trim() !== '') {
        setTimeout(() => triggerDownload(`${prefix}_main.py`, pyInput.value, 'text/plain;charset=utf-8'), 600);
    }

    toggleExportMenu();
};
