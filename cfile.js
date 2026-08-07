/* ==========================================================================
   Roitx Studio IDE v5.5 - Pro Engine (cfile.js)
   ========================================================================== */

const STORAGE_KEY_HTML = "roitx_v5_html";
const STORAGE_KEY_CSS = "roitx_v5_css";
const STORAGE_KEY_JS = "roitx_v5_js";

let logCount = 0;

const defaultHTML = `<div class="card">\n  <h1>Roitx Studio v5</h1>\n  <p>CodePen Level IDE Working!</p>\n  <button onclick="sayHello()">Click Me</button>\n</div>`;
const defaultCSS = `body {\n  background: #0a0c10;\n  color: #fff;\n  font-family: sans-serif;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n\n.card {\n  background: #12161f;\n  padding: 30px;\n  border-radius: 12px;\n  border: 1px solid #00f0ff;\n  box-shadow: 0 0 20px rgba(0,240,255,0.2);\n  text-align: center;\n}\n\nh1 { color: #00f0ff; }\nbutton {\n  background: #00ff70;\n  border: none;\n  padding: 10px 20px;\n  font-weight: bold;\n  border-radius: 6px;\n  cursor: pointer;\n}`;
const defaultJS = `function sayHello() {\n  console.log("Button Clicked inside Roitx Studio!");\n  alert("Welcome to Roitx v5 Studio!");\n}`;

let htmlInput, cssInput, jsInput;
let htmlHighlight, cssHighlight, jsHighlight;
let htmlLineNums, cssLineNums, jsLineNums;
let liveFrame, consoleOutput, consoleBadge, autoSaveStatus, editorStats;

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ==========================================================================
   1. Syntax Highlighting Engines
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

/* ==========================================================================
   2. Core Panel Sync & Updates
   ========================================================================== */
function updatePanel(type) {
    let input, highlight, lineNums, parser;

    if (type === 'html') { input = htmlInput; highlight = htmlHighlight; lineNums = htmlLineNums; parser = highlightHTML; }
    else if (type === 'css') { input = cssInput; highlight = cssHighlight; lineNums = cssLineNums; parser = highlightCSS; }
    else { input = jsInput; highlight = jsHighlight; lineNums = jsLineNums; parser = highlightJS; }

    if (!input || !highlight || !lineNums) return;

    const text = input.value;
    const lines = text.split('\n').length;
    lineNums.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
    highlight.innerHTML = parser(text) + "\n";

    if (htmlInput) localStorage.setItem(STORAGE_KEY_HTML, htmlInput.value);
    if (cssInput) localStorage.setItem(STORAGE_KEY_CSS, cssInput.value);
    if (jsInput) localStorage.setItem(STORAGE_KEY_JS, jsInput.value);

    updateGlobalStats();
    triggerLivePreview();
}

function updateGlobalStats() {
    if (!htmlInput || !cssInput || !jsInput) return;
    const totalLines = htmlInput.value.split('\n').length + cssInput.value.split('\n').length + jsInput.value.split('\n').length;
    const totalChars = htmlInput.value.length + cssInput.value.length + jsInput.value.length;
    if (editorStats) editorStats.innerText = `Lines: ${totalLines} \vert{} Characters:${totalChars}`;
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
   3. Smart Keyboard & Auto-Close Brackets / Tags
   ========================================================================== */
function setupSmartKeyboard(input, type) {
    if (!input) return;

    const pairMap = {
        '(': ')',
        '[': ']',
        '{': '}',
        '"': '"',
        "'": "'",
        '`': '`'
    };

    input.addEventListener('keydown', (e) => {
        const start = input.selectionStart;
        const end = input.selectionEnd;

        // Tab Indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            input.value = input.value.substring(0, start) + "  " + input.value.substring(end);
            input.selectionStart = input.selectionEnd = start + 2;
            updatePanel(type);
            return;
        }

        // Auto-Close Quotes & Brackets
        if (pairMap[e.key]) {
            e.preventDefault();
            const closeChar = pairMap[e.key];
            const selectedText = input.value.substring(start, end);
            
            input.value = input.value.substring(0, start) + e.key + selectedText + closeChar + input.value.substring(end);
            input.selectionStart = start + 1;
            input.selectionEnd = start + 1 + selectedText.length;
            updatePanel(type);
            return;
        }

        // Auto-Close HTML Tags
        if (e.key === '>' && type === 'html') {
            const textBefore = input.value.substring(0, start);
            const tagMatch = textBefore.match(/<([a-zA-Z0-9-]+)(?:\s+[^>]*)?$/);
            
            if (tagMatch && !textBefore.endsWith('/')) {
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
    });

    input.addEventListener('input', () => updatePanel(type));
}

/* ==========================================================================
   4. Live Preview & Virtual Console Engine
   ========================================================================== */
function triggerLivePreview() {
    if (!liveFrame) return;
    const source = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>${cssInput ? cssInput.value : ''}</style>
        </head>
        <body>
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
            <\/script>
            <script>${jsInput ? jsInput.value : ''}<\/script>
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
   5. Global Actions & Tab Management
   ========================================================================== */
window.switchEditorTab = function(panelType) {
    const panels = document.querySelectorAll('.editor-panel');
    panels.forEach(panel => panel.classList.remove('active'));

    const tabs = document.querySelectorAll('.editor-tabs-bar .tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));

    const targetPanel = document.getElementById(`${panelType}Panel`);
    if (targetPanel) targetPanel.classList.add('active');

    const activeBtn = document.getElementById(`tabBtn${panelType.charAt(0).toUpperCase() + panelType.slice(1)}`);
    if (activeBtn) activeBtn.classList.add('active');

    updatePanel(panelType);
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

window.switchOutputTab = function(tab) {
    const btnPreview = document.getElementById('btnPreviewTab');
    const btnConsole = document.getElementById('btnConsoleTab');
    const previewWrapper = document.getElementById('previewWrapper');
    const consoleWrapper = document.getElementById('consoleWrapper');

    if (tab === 'preview') {
        if (btnPreview) btnPreview.classList.add('active');
        if (btnConsole) btnConsole.classList.remove('active');
        if (previewWrapper) previewWrapper.classList.remove('hidden');
        if (consoleWrapper) consoleWrapper.classList.add('hidden');
    } else {
        if (btnConsole) btnConsole.classList.add('active');
        if (btnPreview) btnPreview.classList.remove('active');
        if (consoleWrapper) consoleWrapper.classList.remove('hidden');
        if (previewWrapper) previewWrapper.classList.add('hidden');
    }
};

window.clearConsoleLogs = function() {
    if (consoleOutput) consoleOutput.innerHTML = '';
    logCount = 0;
    if (consoleBadge) consoleBadge.innerText = '0';
};

window.clearEditor = function(type) {
    if (confirm(`Clear ${type.toUpperCase()} content?`)) {
        if (type === 'html') htmlInput.value = '';
        if (type === 'css') cssInput.value = '';
        if (type === 'js') jsInput.value = '';
        updatePanel(type);
    }
};

window.formatAllPanels = function() {
    const cleanIndent = (code) => {
        if (!code) return '';
        let lines = code.split('\n');
        let indentLevel = 0;
        
        return lines.map(line => {
            let trimmed = line.trim();
            if (!trimmed) return '';
            
            if (trimmed.startsWith('}') || trimmed.startsWith('</') || trimmed.startsWith(']')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            let formattedLine = '  '.repeat(indentLevel) + trimmed;
            
            if ((trimmed.endsWith('{') || trimmed.endsWith('>') || trimmed.endsWith('[')) && !trimmed.startsWith('</')) {
                indentLevel++;
            }
            
            return formattedLine;
        }).join('\n');
    };

    if (htmlInput) htmlInput.value = cleanIndent(htmlInput.value);
    if (cssInput) cssInput.value = cleanIndent(cssInput.value);
    if (jsInput) jsInput.value = cleanIndent(jsInput.value);

    updatePanel('html');
    updatePanel('css');
    updatePanel('js');
};

window.exportFullProject = function() {
    if (!htmlInput || !cssInput || !jsInput) return;
    const fullSource = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Roitx Export Project</title>\n<style>\n${cssInput.value}\n</style>\n</head>\n<body>\n${htmlInput.value}\n<script>\n${jsInput.value}\n<\/script>\n</body>\n</html>`;

    const blob = new Blob([fullSource], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "roitx_project.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/* ==========================================================================
   6. Initialization & Event Bindings
   ========================================================================== */
function initApp() {
    htmlInput = document.getElementById('htmlInput');
    cssInput = document.getElementById('cssInput');
    jsInput = document.getElementById('jsInput');

    htmlHighlight = document.getElementById('htmlHighlight');
    cssHighlight = document.getElementById('cssHighlight');
    jsHighlight = document.getElementById('jsHighlight');

    htmlLineNums = document.getElementById('htmlLineNums');
    cssLineNums = document.getElementById('cssLineNums');
    jsLineNums = document.getElementById('jsLineNums');

    liveFrame = document.getElementById('liveFrame');
    consoleOutput = document.getElementById('consoleOutput');
    consoleBadge = document.getElementById('consoleBadge');
    autoSaveStatus = document.getElementById('autoSaveStatus');
    editorStats = document.getElementById('editorStats');

    if (htmlInput) htmlInput.value = localStorage.getItem(STORAGE_KEY_HTML) || defaultHTML;
    if (cssInput) cssInput.value = localStorage.getItem(STORAGE_KEY_CSS) || defaultCSS;
    if (jsInput) jsInput.value = localStorage.getItem(STORAGE_KEY_JS) || defaultJS;

    setupScrollSync(htmlInput, htmlHighlight, htmlLineNums);
    setupScrollSync(cssInput, cssHighlight, cssLineNums);
    setupScrollSync(jsInput, jsHighlight, jsLineNums);

    setupSmartKeyboard(htmlInput, 'html');
    setupSmartKeyboard(cssInput, 'css');
    setupSmartKeyboard(jsInput, 'js');

    // Layout Toggle Button Listener
    const layoutBtn = document.getElementById('layoutToggleBtn');
    if (layoutBtn) {
        layoutBtn.addEventListener('click', () => {
            const grid = document.getElementById('workspaceGrid');
            if (grid) grid.classList.toggle('vertical-layout');
        });
    }

    // Theme Toggle Button Listener
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
        });
    }

    updatePanel('html');
    updatePanel('css');
    updatePanel('js');
}

document.addEventListener('DOMContentLoaded', initApp);
