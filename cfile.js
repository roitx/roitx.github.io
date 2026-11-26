/* ==========================================================================
   Roitx Studio IDE v6.0 - Pro Engine (HTML, CSS, JS & Python Support) [Complete]
   ========================================================================== */

const STORAGE_KEY_HTML = "roitx_v5_html";
const STORAGE_KEY_CSS = "roitx_v5_css";
const STORAGE_KEY_JS = "roitx_v5_js";
const STORAGE_KEY_PY = "roitx_v5_py";

let logCount = 0;

const defaultHTML = `<div class=\"card\">\n  <h1>Roitx Studio v5</h1>\n  <p>HTML, CSS, JS, Python & PHP IDE!</p>\n  <button onclick=\"sayHello()\">Click JS</button>\n  <!--php-->\n</div>`;
const defaultCSS = `body {\n  background: #0a0c10;\n  color: #fff;\n  font-family: sans-serif;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n\n.card {\n  background: #12161f;\n  padding: 30px;\n  border-radius: 12px;\n  border: 1px solid #00f0ff;\n  box-shadow: 0 0 20px rgba(0,240,255,0.2);\n  text-align: center;\n}\n\nh1 { color: #00f0ff; }\nbutton {\n  background: #00ff70;\n  border: none;\n  padding: 10px 20px;\n  font-weight: bold;\n  border-radius: 6px;\n  cursor: pointer;\n}`;
const defaultJS = `function sayHello() {\n  console.log("Button Clicked inside Roitx Studio!");\n  alert("Welcome to Roitx v5 Studio!");\n}`;
const defaultPY = `# Python Script Runner via Brython\ndef greet_user(name):\n    print(f"Hello from Python, {name}!")\n\ngreet_user("Roitx")`;

const defaultPHP = `<?php
// Runs in your browser (php-wasm). Output appears where <!--php--> is in the HTML tab.
$langs = ["HTML", "CSS", "JS", "Python", "PHP"];
echo "<p>PHP " . PHP_VERSION . " says hi!</p>";
echo "<small>" . implode(" + ", $langs) . "</small>";`;

let htmlInput, cssInput, jsInput, pyInput, phpInput;
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

// Single-pass tokenizer: har match ek hi baar color hota hai, HTML kabhi corrupt nahi hota
function tokenize(code, re, classes) {
    let out = '', last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(code)) !== null) {
        if (m[0] === '') { re.lastIndex++; continue; }
        out += escapeHTML(code.slice(last, m.index));
        let g = 1; while (g < m.length && m[g] === undefined) g++;
        out += `<span class="${classes[g - 1]}">${escapeHTML(m[0])}</span>`;
        last = m.index + m[0].length;
    }
    return out + escapeHTML(code.slice(last));
}

function highlightJS(code) {
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\[\s\S])*`)|\b(function|let|const|var|return|if|else|for|while|do|switch|case|break|continue|class|extends|new|this|import|export|from|default|try|catch|finally|throw|async|await|typeof|instanceof|in|of|true|false|null|undefined)\b|\b(\d+\.?\d*)\b|\b([A-Za-z_$][\w$]*)(?=\s*\()/g;
    return tokenize(code, re, ['hl-comment', 'hl-string', 'hl-keyword', 'hl-number', 'hl-function']);
}

function highlightPY(code) {
    const re = /("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(#[^\n]*)|(@[A-Za-z_][\w.]*)|\b(def|return|if|else|elif|for|while|import|from|in|as|class|try|except|finally|raise|with|lambda|pass|break|continue|global|nonlocal|del|assert|yield|async|await|and|or|not|is|True|False|None)\b|\b(\d+\.?\d*)\b|\b([A-Za-z_]\w*)(?=\()/g;
    return tokenize(code, re, ['hl-string', 'hl-comment', 'hl-function', 'hl-keyword', 'hl-number', 'hl-function']);
}

/* ==========================================================================
   2. Core Panel Sync, Toast & Auto-Save
   ========================================================================== */
function highlightPHP(code) {
    const re = /(<\?php|<\?=|\?>)|(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*')|(\$[A-Za-z_]\w*)|\b(function|fn|return|if|else|elseif|for|foreach|while|do|switch|case|break|continue|class|interface|trait|extends|implements|new|public|private|protected|static|const|echo|print|use|namespace|try|catch|finally|throw|as|and|or|xor|isset|unset|empty|array|list|match|true|false|null|TRUE|FALSE|NULL|self|parent|abstract|final|global|include|require|include_once|require_once)\b|\b(\d+\.?\d*)\b|\b([A-Za-z_]\w*)(?=\s*\()/g;
    return tokenize(code, re, ['hl-tag', 'hl-comment', 'hl-string', 'hl-attr-name', 'hl-keyword', 'hl-number', 'hl-function']);
}

const LANGS = ['html', 'css', 'js', 'py', 'php'];
const INDENT = '    ';
const ta = (l) => document.getElementById(l + 'Input');
let suspendSave = false, saveTimer = null;

window.toast = function(msg) {
    let t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.add('hidden'), 2200);
};

// Sirf screen par dikhne wali lines (+ buffer) highlight hoti hain -> badi file par bhi lag nahi
const WIN_BUF = 40;
const winState = {};
const PARSERS = { html: highlightHTML, css: highlightCSS, js: highlightJS, py: highlightPY, php: highlightPHP };

function codeLH(el) { return parseFloat(getComputedStyle(el).lineHeight) || 22; }

function renderWindow(type, force) {
    const input = ta(type);
    const code = document.getElementById(type + 'Highlight');
    const lineNums = document.getElementById(type + 'LineNums');
    if (!input || !code || !lineNums) return;

    const st = winState[type] || (winState[type] = { first: -1, last: -1, lines: null });
    if (force || !st.lines) st.lines = input.value.split('\n');
    const total = st.lines.length, LH = codeLH(input);
    const vFirst = Math.max(0, Math.floor((input.scrollTop - 16) / LH));
    const vLast = Math.min(total - 1, Math.ceil((input.scrollTop + (input.clientHeight || 600) - 16) / LH));

    const stale = st.first < 0 || vFirst < st.first || vLast > st.last ||
                  (st.first > 0 && vFirst < st.first + 10) || (st.last < total - 1 && vLast > st.last - 10);
    if (force || stale) {
        st.first = Math.max(0, vFirst - WIN_BUF);
        st.last = Math.min(total - 1, vLast + WIN_BUF);
        code.innerHTML = PARSERS[type](st.lines.slice(st.first, st.last + 1).join('\n')) + '\n';
        let nums = '';
        for (let i = st.first; i <= st.last; i++) nums += (i + 1) + '<br>';
        lineNums.innerHTML = '<div class="ln-inner">' + nums + '</div>';
    }
    const y = st.first * LH - input.scrollTop;
    code.style.transform = `translate(${-input.scrollLeft}px, ${y}px)`;
    if (lineNums.firstElementChild) lineNums.firstElementChild.style.transform = `translateY(${y}px)`;
}

let statsTimer = null;
function updatePanel(type) {
    if (!ta(type)) return;
    renderWindow(type, true);
    scheduleSave();
    scheduleAutoRun();
    clearTimeout(statsTimer);
    statsTimer = setTimeout(updateGlobalStats, 250);
}

function updateGlobalStats() {
    if (!htmlInput || !cssInput || !jsInput || !pyInput || !phpInput) return;
    const totalLines = LANGS.reduce((n, l) => n + ta(l).value.split('\n').length, 0);
    const totalChars = LANGS.reduce((n, l) => n + ta(l).value.length, 0);
    if (editorStats) editorStats.innerText = `Lines: ${totalLines} | Characters: ${totalChars}`;
}

function setupScrollSync(type) {
    const input = ta(type);
    if (!input) return;
    input.addEventListener('scroll', () => renderWindow(type, false));
    if (window.ResizeObserver) new ResizeObserver(() => renderWindow(type, false)).observe(input);
}

/* ==========================================================================
   3. Multi-Project Storage (localStorage)
   ========================================================================== */
const STORE_KEY = 'roitx_projects_v1';
let store = null;

function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function makeProject(name, data) {
    const id = uid();
    return { id, name, html: '', css: '', js: '', py: '', php: '', updated: Date.now(), ...(data || {}) };
}

function loadStore() {
    try {
        const s = JSON.parse(localStorage.getItem(STORE_KEY));
        if (s && s.projects && Object.keys(s.projects).length) {
            if (!s.projects[s.current]) s.current = Object.keys(s.projects)[0];
            return s;
        }
    } catch (e) {}
    // Pehli baar: purana single-project data (agar ho) naye format me migrate karo
    const p = makeProject('My Project', {
        html: localStorage.getItem(STORAGE_KEY_HTML) || defaultHTML,
        css: localStorage.getItem(STORAGE_KEY_CSS) || defaultCSS,
        js: localStorage.getItem(STORAGE_KEY_JS) || defaultJS,
        py: localStorage.getItem(STORAGE_KEY_PY) || defaultPY,
        php: defaultPHP
    });
    return { current: p.id, projects: { [p.id]: p } };
}

function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); return true; }
    catch (e) { toast('Storage full - export your project!'); return false; }
}

function currentProject() { return store.projects[store.current]; }

function scheduleSave() {
    if (suspendSave || !store) return;
    if (autoSaveStatus) autoSaveStatus.innerText = 'Saving...';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(commitSave, 400);
}

function commitSave() {
    clearTimeout(saveTimer);
    if (!store || !htmlInput) return false;
    const p = currentProject();
    if (!p) return false;
    LANGS.forEach(l => { p[l] = ta(l).value; });
    p.updated = Date.now();
    const ok = saveStore();
    if (ok && autoSaveStatus) autoSaveStatus.innerText = 'Auto-Saved';
    return ok;
}

function openProjectInEditors(id) {
    if (store.projects[id] === undefined) return;
    if (store.current !== id) commitSave();
    store.current = id;
    const p = currentProject();
    suspendSave = true;
    LANGS.forEach(l => { ta(l).value = p[l] || ''; updatePanel(l); histReset(l); });
    suspendSave = false;
    saveStore();
    const nameEl = document.getElementById('projectName');
    if (nameEl) nameEl.textContent = p.name;
    triggerLivePreview();
}

window.saveProjectNow = function() {
    if (commitSave()) toast('Project saved: ' + currentProject().name);
    const m = document.getElementById('exportMenu'); if (m) m.classList.add('hidden');
};

/* ---- Projects modal ---- */
function renderProjects() {
    const list = document.getElementById('projectList');
    if (!list) return;
    const items = Object.values(store.projects).sort((a, b) => b.updated - a.updated);
    list.innerHTML = items.map(p => `
        <div class="project-item ${p.id === store.current ? 'current' : ''}" data-id="${p.id}">
            <div class="project-info" data-act="open">
                <div class="project-title">${escapeHTML(p.name)}</div>
                <div class="project-meta">${new Date(p.updated).toLocaleString()}</div>
            </div>
            <button class="mini-btn" data-act="rename" title="Rename"><i class="fas fa-pen"></i></button>
            <button class="mini-btn" data-act="dup" title="Duplicate"><i class="fas fa-copy"></i></button>
            <button class="mini-btn" data-act="del" title="Delete"><i class="fas fa-trash"></i></button>
        </div>`).join('');
}

window.openProjects = function() {
    commitSave();
    renderProjects();
    document.getElementById('projectsModal').classList.remove('hidden');
};
window.closeProjects = function() { document.getElementById('projectsModal').classList.add('hidden'); };

window.newProject = function() {
    const name = prompt('New project ka naam:', 'Untitled ' + (Object.keys(store.projects).length + 1));
    if (!name || !name.trim()) return;
    commitSave();
    const p = makeProject(name.trim(), { html: '<h1>Hello World</h1>\n' });
    store.projects[p.id] = p;
    openProjectInEditors(p.id);
    renderProjects();
};

function handleProjectClick(e) {
    const btn = e.target.closest('[data-act]');
    const row = e.target.closest('.project-item');
    if (!btn || !row) return;
    const id = row.dataset.id, p = store.projects[id], act = btn.dataset.act;
    if (act === 'open') { openProjectInEditors(id); closeProjects(); }
    else if (act === 'rename') {
        const n = prompt('Naya naam:', p.name);
        if (n && n.trim()) {
            p.name = n.trim(); saveStore(); renderProjects();
            if (id === store.current) document.getElementById('projectName').textContent = p.name;
        }
    } else if (act === 'dup') {
        commitSave();
        const c = makeProject(p.name + ' (copy)', { html: p.html, css: p.css, js: p.js, py: p.py, php: p.php, res: p.res ? JSON.parse(JSON.stringify(p.res)) : null });
        store.projects[c.id] = c; saveStore(); renderProjects();
    } else if (act === 'del') {
        if (!confirm(`"${p.name}" delete kar du? Ye wapas nahi aayega.`)) return;
        delete store.projects[id];
        if (!Object.keys(store.projects).length) {
            const f = makeProject('My Project', { html: defaultHTML, css: defaultCSS, js: defaultJS, py: defaultPY, php: defaultPHP });
            store.projects[f.id] = f;
        }
        if (id === store.current) { store.current = null; openProjectInEditors(Object.keys(store.projects)[0]); }
        else saveStore();
        renderProjects();
    }
}
/* ==========================================================================
   4. Editing Engine: undo-safe edits, auto-close brackets, auto-indent, Tab, Emmet
   ========================================================================== */
let _busy = false;

// Apni undo/redo history (execCommand mobile par bharosemand nahi)
const hist = {};
const H = (t) => hist[t] || (hist[t] = { s: [], i: -1, t: 0 });
const typeOf = (el) => el.id.replace('Input', '');
function histReset(type) { const el = ta(type); hist[type] = { s: [{ v: el.value, a: 0, b: 0 }], i: 0, t: 0 }; }
function histPush(type, force) {
    const el = ta(type), h = H(type), now = Date.now();
    if (h.lock) return;
    if (!h.s.length) histReset(type);
    if (h.s[h.i].v === el.value) return;
    const rec = { v: el.value, a: el.selectionStart, b: el.selectionEnd };
    h.s.length = h.i + 1;
    if (!force && h.i > 0 && now - h.t < 700) h.s[h.i] = rec;   // typing burst = 1 undo step
    else { h.s.push(rec); h.i++; if (h.s.length > 200) { h.s.shift(); h.i--; } }
    h.t = force ? 0 : now;
}
function revealCaret(el) {
    const line = el.value.slice(0, el.selectionStart).split('\n').length - 1, LH = codeLH(el);
    const top = line * LH, vh = Math.max(LH, el.clientHeight - 3 * LH);
    if (top < el.scrollTop) el.scrollTop = top; else if (top > el.scrollTop + vh) el.scrollTop = top - vh;
}
function histMove(type, d) {
    const h = H(type), el = ta(type), n = h.i + d;
    if (!h.s.length || n < 0 || n >= h.s.length) { toast(d < 0 ? 'Nothing to undo' : 'Nothing to redo'); return; }
    h.i = n; const r = h.s[n]; h.lock = true;
    el.value = r.v; el.setSelectionRange(r.a, r.b); h.lock = false; h.t = 0;
    updatePanel(type); revealCaret(el);
}
function editText(el, start, end, text, selStart, selEnd) {
    const type = typeOf(el), v = el.value;
    if (document.activeElement !== el) el.focus({ preventScroll: true });
    el.value = v.slice(0, start) + text + v.slice(end);
    const a = selStart === undefined ? start + text.length : selStart;
    el.setSelectionRange(a, selEnd === undefined ? a : selEnd);
    updatePanel(type); histPush(type, true); revealCaret(el);
}

function openTagBefore(src) {
    src = src.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
    const st = [], re = /<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>/g; let m;
    while ((m = re.exec(src))) {
        const n = m[2].toLowerCase();
        if (VOID_TAGS.has(n) || m[3]) continue;
        if (m[1]) { const i = st.lastIndexOf(n); if (i > -1) st.length = i; } else st.push(n);
    }
    return st.length ? st[st.length - 1] : null;
}

const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
const CLOSERS = new Set([')', ']', '}', '"', "'", '`']);
const isWord = (c) => !!c && /[A-Za-z0-9_]/.test(c);

function setupSmartKeyboard(input, type) {
    if (!input) return;

    input.addEventListener('keydown', (e) => {
        const mod = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase();
        if (e.key === 'Tab') { e.preventDefault(); handleTab(input, type, e.shiftKey); }
        else if (mod && k === 'z') { e.preventDefault(); histMove(type, e.shiftKey ? 1 : -1); }
        else if (mod && k === 'y') { e.preventDefault(); histMove(type, 1); }
        else if (mod && !e.shiftKey && k === 'd') { e.preventDefault(); lineOp('dup'); }
        else if (mod && e.shiftKey && k === 'k') { e.preventDefault(); lineOp('del'); }
        else if (mod && e.key === '/') { e.preventDefault(); lineOp('comment'); }
        else if (mod && k === 'g') { e.preventDefault(); gotoLine(); }
        else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); lineOp(e.key === 'ArrowUp' ? 'up' : 'down'); }
    });

    // beforeinput mobile keyboards par bhi chalta hai (keydown wahan 'Unidentified' deta hai)
    input.addEventListener('beforeinput', (e) => {
        if (_busy) return;
        const s = input.selectionStart, en = input.selectionEnd, v = input.value;
        const t = e.inputType;
        if (t === 'historyUndo' || t === 'historyRedo') { e.preventDefault(); histMove(type, t === 'historyUndo' ? -1 : 1); return; }

        // Enter: auto-indent + brackets/tags ke beech me block
        if (t === 'insertLineBreak' || t === 'insertParagraph' || (t === 'insertText' && e.data === '\n')) {
            e.preventDefault();
            const ls = v.lastIndexOf('\n', s - 1) + 1;
            const indent = v.slice(ls, s).match(/^[ \t]*/)[0];
            const prev = v[s - 1], next = v[en];
            const open = '([{'.includes(prev) && prev, pyColon = type === 'py' && /:\s*$/.test(v.slice(ls, s));
            const between = (prev && '([{'.includes(prev) && PAIRS[prev] === next) ||
                            (type === 'html' && prev === '>' && v.slice(en, en + 2) === '</');
            if (between) {
                const mid = '\n' + indent + INDENT;
                editText(input, s, en, mid + '\n' + indent, s + mid.length);
            } else if (open || pyColon) {
                editText(input, s, en, '\n' + indent + INDENT);
            } else {
                editText(input, s, en, '\n' + indent);
            }
            return;
        }

        // Backspace: khali pair () {} [] "" ek saath delete
        if (t === 'deleteContentBackward' && s === en && s > 0) {
            if (PAIRS[v[s - 1]] !== undefined && PAIRS[v[s - 1]] === v[s]) {
                e.preventDefault();
                editText(input, s - 1, s + 1, '');
            }
            return;
        }

        if (t !== 'insertText' || !e.data || e.data.length !== 1) return;
        const ch = e.data;

        // HTML: '>' dabate hi closing tag
        if (ch === '>' && type === 'html' && s === en) {
            const tagString = v.substring(v.lastIndexOf('<', s - 1), s);
            const m = tagString.match(/^<([a-zA-Z][a-zA-Z0-9-]*)/);
            if (m && tagString.indexOf('>') === -1 && !tagString.endsWith('/')) {
                e.preventDefault();
                const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'];
                if (selfClosing.includes(m[1].toLowerCase())) editText(input, s, en, '>');
                else editText(input, s, en, `></${m[1]}>`, s + 1);
                return;
            }
        }

        // HTML: "</" likhte hi nearest khula tag band ho jaye
        if (ch === '/' && type === 'html' && s === en && v[s - 1] === '<') {
            const tag = openTagBefore(v.slice(0, s - 1));
            if (tag) { e.preventDefault(); editText(input, s, en, '/' + tag + '>'); return; }
        }

        // Closing char already aage hai to uske upar se nikal jao
        if (s === en && CLOSERS.has(ch) && v[s] === ch) {
            e.preventDefault();
            input.setSelectionRange(s + 1, s + 1);
            return;
        }

        const close = PAIRS[ch];
        if (!close) return;

        // Selection ho to usse wrap karo
        if (s !== en) {
            e.preventDefault();
            editText(input, s, en, ch + v.slice(s, en) + close, s + 1, en + 1);
            return;
        }
        const prev = v[s - 1], next = v[s];
        const isQuote = ch === close;
        if (isQuote && (isWord(prev) || prev === ch || isWord(next))) return; // don't, it's, '''
        if (!isQuote && next && !/[\s)\]}>,;.:]/.test(next)) return;
        e.preventDefault();
        editText(input, s, en, ch + close, s + 1);
    });

    input.addEventListener('input', () => { updatePanel(type); histPush(type); updateCursorInfo(); });
    ['keyup', 'click', 'focus'].forEach(ev => input.addEventListener(ev, updateCursorInfo));
}

function handleTab(el, type, shift) {
    const s = el.selectionStart, e = el.selectionEnd, v = el.value;
    const multi = s !== e && v.slice(s, e).includes('\n');
    if (multi || shift) {
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        let le = v.indexOf('\n', e);
        if (le === -1) le = v.length;
        if (e > s && v[e - 1] === '\n') le = e - 1;
        const lines = v.slice(ls, le).split('\n');
        const out = lines.map(l => shift ? l.replace(/^( {1,4}|\t)/, '') : (l.trim() ? INDENT + l : l)).join('\n');
        if (s === e) {
            const removed = (le - ls) - out.length;
            editText(el, ls, le, out, Math.max(ls, s - removed));
        } else editText(el, ls, le, out, ls, ls + out.length);
        return;
    }
    if (s === e && ((type === 'html' && tryEmmet(el)) || trySnippet(el, type))) return;
    editText(el, s, e, INDENT);
}

window.tabKey = function() {
    const el = getActiveEditorTextArea();
    if (el) handleTab(el, el.id.replace('Input', ''), false);
};
window.undoEdit = function() { const el = getActiveEditorTextArea(); if (el) histMove(typeOf(el), -1); };
window.redoEdit = function() { const el = getActiveEditorTextArea(); if (el) histMove(typeOf(el), 1); };
window.expandEmmet = function() {
    const el = getActiveEditorTextArea();
    if (!el || el.id !== 'htmlInput') { toast('Emmet sirf HTML tab me chalta hai'); return; }
    el.focus();
    if (!tryEmmet(el)) toast('Emmet abbreviation nahi mila (e.g. div.card>p*3)');
};

/* ---- Emmet (HTML) ---- */
const KNOWN_TAGS = new Set('div span p a ul ol li h1 h2 h3 h4 h5 h6 img input button form label table tr td th thead tbody section article header footer nav main aside select option textarea pre code strong em small br hr video audio canvas iframe'.split(' '));
const VOID_TAGS = new Set(['img', 'input', 'br', 'hr', 'meta', 'link']);
const IMPLICIT = { ul: 'li', ol: 'li', table: 'tr', tbody: 'tr', thead: 'tr', tr: 'td', select: 'option', datalist: 'option', p: 'span', span: 'span', em: 'span', strong: 'span', button: 'span', label: 'span' };
const DEFAULT_ATTRS = { a: [['href', '']], img: [['src', ''], ['alt', '']], input: [['type', 'text']], link: [['rel', 'stylesheet'], ['href', '']], form: [['action', '']] };
const BOILERPLATE = '<!DOCTYPE html>\n<html lang="en">\n<head>\n' + INDENT + '<meta charset="UTF-8">\n' + INDENT + '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' + INDENT + '<title>Document</title>\n</head>\n<body>\n' + INDENT + '\u0001\n</body>\n</html>';

function emmetParse(src) {
    let i = 0;
    const peek = () => src[i];
    const rest = (re) => { const m = re.exec(src.slice(i)); const r = m ? m[0] : ''; i += r.length; return r; };
    const fail = () => { throw new Error('emmet'); };

    function readBlock(open, close) {
        i++; let depth = 1, out = '';
        while (i < src.length) {
            const c = src[i++];
            if (c === open) depth++;
            else if (c === close && --depth === 0) return out;
            out += c;
        }
        fail();
    }
    function parseAttrs(str) {
        const attrs = [], re = /([^\s=]+)(?:=("[^"]*"|'[^']*'|[^\s]*))?/g; let m;
        while ((m = re.exec(str))) attrs.push([m[1], m[2] === undefined ? '' : m[2].replace(/^["']|["']$/g, '')]);
        return attrs;
    }
    function parseUnit() {
        let u;
        if (peek() === '(') {
            i++; const kids = parseExpr();
            if (peek() !== ')') fail();
            i++; u = { group: true, children: kids };
        } else {
            u = { tag: rest(/^[A-Za-z][A-Za-z0-9:-]*/), id: '', classes: [], attrs: [], text: '', children: null };
            for (;;) {
                const c = peek();
                if (c === '.') { i++; const n = rest(/^[\w$@-]+/); if (!n) fail(); u.classes.push(n); }
                else if (c === '#') { i++; u.id = rest(/^[\w$@-]+/); if (!u.id) fail(); }
                else if (c === '[') u.attrs = u.attrs.concat(parseAttrs(readBlock('[', ']')));
                else if (c === '{') u.text = readBlock('{', '}');
                else break;
            }
            if (!u.tag && !u.id && !u.classes.length && !u.attrs.length && !u.text) fail();
        }
        u.count = 1;
        if (peek() === '*') { i++; u.count = parseInt(rest(/^\d+/), 10); if (!u.count || u.count > 100) fail(); }
        return u;
    }
    function parseExpr() {
        const nodes = [];
        for (;;) {
            const u = parseUnit(); nodes.push(u);
            if (peek() === '>') { i++; u.children = parseExpr(); }
            const c = peek();
            if (c === '+') { i++; continue; }
            if (c === '^' && u.children) { i++; if (peek() === '^') return nodes; continue; }
            return nodes;
        }
    }
    const tree = parseExpr();
    if (i < src.length) fail();
    return tree;
}

function emmetRender(nodes, level, parentTag, ctx, k) {
    const pad = INDENT.repeat(level);
    const num = (s) => s.replace(/\$+/g, (m) => String(k).padStart(m.length, '0'));
    let lines = [];
    nodes.forEach(u => {
        for (let n = 1; n <= u.count; n++) {
            const kk = u.count > 1 ? n : k;
            const sub = { ...ctx };
            const nn = (s) => s.replace(/\$+/g, (m) => String(kk).padStart(m.length, '0'));
            if (u.group) { lines = lines.concat(emmetRender(u.children, level, parentTag, ctx, kk)); continue; }
            const tag = u.tag || IMPLICIT[parentTag] || 'div';
            let attrs = '';
            if (u.id) attrs += ` id="${nn(u.id)}"`;
            if (u.classes.length) attrs += ` class="${nn(u.classes.join(' '))}"`;
            const given = u.attrs.map(a => a[0]);
            (DEFAULT_ATTRS[tag] || []).forEach(a => { if (!given.includes(a[0])) attrs += ` ${a[0]}="${a[1]}"`; });
            u.attrs.forEach(a => { attrs += ` ${a[0]}="${nn(a[1])}"`; });
            const open = `<${tag}${attrs}>`;
            if (VOID_TAGS.has(tag)) { lines.push(pad + open); continue; }
            const text = nn(u.text);
            if (!u.children) {
                let inner = text;
                if (!text && !ctx.marked) { inner = '\u0001'; ctx.marked = true; }
                lines.push(pad + open + inner + `</${tag}>`);
            } else {
                lines.push(pad + open);
                if (text) lines.push(pad + INDENT + text);
                lines = lines.concat(emmetRender(u.children, level + 1, tag, ctx, kk));
                lines.push(pad + `</${tag}>`);
            }
        }
    });
    return lines;
}

function findAbbrev(line) {
    let depth = 0, i = line.length;
    while (i > 0) {
        const c = line[i - 1];
        if (c === '}' || c === ']') depth++;
        else if (c === '{' || c === '[') { if (depth === 0) break; depth--; }
        else if (depth === 0 && (/\s/.test(c) || c === '<')) break;
        i--;
    }
    let tok = line.slice(i);
    if (i > 0 && line[i - 1] === '<') {          // "<div>p*3" jaisa case: tag ka hissa kaat do
        const gt = tok.indexOf('>');
        if (gt === -1) return null;
        tok = tok.slice(gt + 1);
    }
    return /^[A-Za-z!.#\[(]/.test(tok) ? tok : null;
}

function tryEmmet(el) {
    const s = el.selectionStart, v = el.value;
    if (v[s] && !/[\s<]/.test(v[s])) return false;
    const ls = v.lastIndexOf('\n', s - 1) + 1;
    const lineBefore = v.slice(ls, s);
    const tok = findAbbrev(lineBefore);
    if (!tok) return false;
    let out;
    if (tok === '!' || tok === 'html:5') out = BOILERPLATE;
    else {
        if (/^[A-Za-z][A-Za-z0-9]*$/.test(tok) && !KNOWN_TAGS.has(tok.toLowerCase())) return false;
        try { out = emmetRender(emmetParse(tok), 0, '', { marked: false }, 1).join('\n'); }
        catch (err) { return false; }
    }
    const baseIndent = lineBefore.match(/^[ \t]*/)[0];
    out = out.split('\n').map((l, idx) => idx === 0 ? l : baseIndent + l).join('\n');
    let cursor = out.indexOf('\u0001');
    out = out.replace('\u0001', '');
    if (cursor === -1) cursor = out.length;
    const from = s - tok.length;
    editText(el, from, s, out, from + cursor);
    return true;
}
/* ==========================================================================
   5. Find & Replace (case-insensitive option, undo-safe)
   ========================================================================== */
let searchMatches = [];
let currentMatchIndex = -1;

window.toggleFindReplaceModal = function() {
    const modal = document.getElementById('findReplaceModal');
    if (!modal) return;
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
        const el = getActiveEditorTextArea();
        const sel = el ? el.value.slice(el.selectionStart, el.selectionEnd) : '';
        const f = document.getElementById('findInput');
        if (sel && !sel.includes('\n')) f.value = sel;
        f.focus(); f.select();
        handleSearchInput();
    }
};

function getActiveEditorTextArea() {
    for (const l of LANGS) if (document.getElementById(l + 'Panel').classList.contains('active')) return ta(l);
    return null;
}

function buildSearchRegex(q) {
    const matchCase = document.getElementById('matchCase');
    return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase && matchCase.checked ? 'g' : 'gi');
}

window.handleSearchInput = function() {
    const query = document.getElementById('findInput').value;
    const textArea = getActiveEditorTextArea();
    const counterSpan = document.getElementById('matchCounter');

    searchMatches = [];
    currentMatchIndex = -1;

    if (!query || !textArea) { counterSpan.innerText = "0/0"; return; }

    const re = buildSearchRegex(query);
    let m;
    while ((m = re.exec(textArea.value)) !== null) {
        searchMatches.push({ start: m.index, end: m.index + m[0].length });
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

// Focus find box me hi rehta hai, taaki typing beech me na ruke
function highlightAndSelectMatch() {
    const textArea = getActiveEditorTextArea();
    if (!textArea || searchMatches.length === 0) return;
    const match = searchMatches[currentMatchIndex];
    textArea.setSelectionRange(match.start, match.end);
    const line = textArea.value.substring(0, match.start).split("\n").length;
    textArea.scrollTop = Math.max(0, (line - 3) * codeLH(textArea));
}

window.executeSingleReplace = function() {
    const replaceText = document.getElementById('replaceInput').value;
    const textArea = getActiveEditorTextArea();
    if (!textArea || searchMatches.length === 0) return;
    const match = searchMatches[currentMatchIndex];
    editText(textArea, match.start, match.end, replaceText);
    handleSearchInput();
};

window.executeReplaceAll = function() {
    const query = document.getElementById('findInput').value;
    const replaceText = document.getElementById('replaceInput').value;
    const textArea = getActiveEditorTextArea();
    if (!query || !textArea) return;

    let count = 0;
    const out = textArea.value.replace(buildSearchRegex(query), () => { count++; return replaceText; });
    if (count) editText(textArea, 0, textArea.value.length, out);

    document.getElementById('matchCounter').innerText = "0/0";
    searchMatches = [];
    toast(count ? `${count} replaced` : 'No matches');
};

/* ==========================================================================
   6. Keyboard Shortcut Toolbar Helper & Device Mode
   ========================================================================== */



/* ==========================================================================
   6. Toolbar Insert Helper (works on active editor, cursor marker "$|")
   ========================================================================== */
window.insertAtCursor = function(textareaId, textToInsert) {
    const el = textareaId ? document.getElementById(textareaId) : getActiveEditorTextArea();
    if (!el) return;

    let text = textToInsert, cursorOffset = text.length;
    const marker = text.indexOf('$|');
    if (marker !== -1) { text = text.replace('$|', ''); cursorOffset = marker; }
    else if (text.length === 2 && PAIRS[text[0]] === text[1]) cursorOffset = 1;

    const start = el.selectionStart;
    editText(el, start, el.selectionEnd, text, start + cursorOffset);
};

/* ==========================================================================
   7. Live Preview & Virtual Console Engine
   ========================================================================== */
/* ---- PHP in the browser (php-wasm / WebAssembly) ----
   Runs fully client-side, so it works on GitHub Pages (no server needed).
   Output of the PHP tab is placed where <!--php--> is in the HTML tab (or appended at the end). */
const PHP_CDN = 'https://cdn.jsdelivr.net/npm/php-wasm/PhpWeb.mjs';
let phpEngine = null, phpLoading = null, phpChain = Promise.resolve(), phpRunId = 0, lastPhpOut = '';
const phpBuf = { out: '', err: '' };
const phpText = (d) => Array.isArray(d) ? d.join('') : String(d == null ? '' : d);

function phpConsole(type, text, line) {
    if (!consoleOutput) return;
    logCount++;
    if (consoleBadge) consoleBadge.innerText = logCount;
    const entry = document.createElement('div');
    entry.className = 'log-entry ' + (type === 'error' ? 'log-error' : type === 'warn' ? 'log-warn' : '');
    entry.textContent = '> ' + text;
    if (line) {
        entry.classList.add('log-link');
        entry.title = 'Tap to jump to PHP line ' + line;
        entry.addEventListener('click', () => jumpToLine('php', line));
    }
    consoleOutput.appendChild(entry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    if (type === 'error' && manualRun && !autoOpened) { autoOpened = true; switchOutputTab('console'); }
}

function getPhp() {
    if (phpEngine) return Promise.resolve(phpEngine);
    if (!phpLoading) {
        toast('Loading PHP engine (first time only)...');
        phpLoading = import(PHP_CDN).then(({ PhpWeb }) => {
            const php = new PhpWeb();
            php.addEventListener('output', (e) => { phpBuf.out += phpText(e.detail); });
            php.addEventListener('error', (e) => { phpBuf.err += phpText(e.detail); });
            return (phpEngine = php);
        }).catch((e) => {
            phpLoading = null;
            throw new Error('PHP engine load nahi hua (internet check karo): ' + ((e && e.message) || e));
        });
    }
    return phpLoading;
}

// Plain-text output (no HTML tags) ko <pre> me dikhao taaki newlines na kharab hon
function phpWrap(out) {
    if (!out || /<[a-z!\/]/i.test(out) || out.indexOf('\n') < 0) return out;
    return '<pre style="font-family:monospace;white-space:pre-wrap;margin:0">' + escapeHTML(out) + '</pre>';
}

function runPhp(code) {
    const job = phpChain.then(async () => {
        const php = await getPhp();
        phpBuf.out = ''; phpBuf.err = '';
        try { await php.run(code); } catch (e) { phpBuf.err += String((e && e.message) || e); }
        const out = phpBuf.out, err = phpBuf.err;
        err.split('\n').filter(l => l.trim()).forEach(l => {
            const m = /on line (\d+)/.exec(l);
            phpConsole('error', 'PHP: ' + l.trim(), m ? parseInt(m[1], 10) : 0);
        });
        const re = /(Parse error|Fatal error|Warning|Notice|Deprecated)\s*:[^\n]*?on line (\d+)/g;
        let m;
        while ((m = re.exec(out)) !== null) {
            phpConsole(/Warning|Notice|Deprecated/.test(m[1]) ? 'warn' : 'error', 'PHP ' + m[0].replace(/<[^>]+>/g, '').trim(), parseInt(m[2], 10));
        }
        return phpWrap(out);
    });
    phpChain = job.catch(() => {});
    return job;
}

// HTML tab ke <!--php--> ki jagah PHP output (marker na ho to end me)
function withPhp(html) {
    if (!phpInput || !phpInput.value.trim()) return html;
    return /<!--\s*php\s*-->/i.test(html) ? html.replace(/<!--\s*php\s*-->/gi, () => lastPhpOut) : html + '\n' + lastPhpOut;
}

let manualRun = false, autoOpened = false;
window.runManualCode = function() { manualRun = true; triggerLivePreview(); };

// togglePreviewPanel / openPreviewFullscreen / setDeviceMode / theme: see section 13

// Ye function iframe ke ANDAR chalta hai (toString() se inject hota hai)
function iframeBootstrap(cfg) {
    function fmt(a) {
        if (typeof a === 'string') return a;
        if (a instanceof Error) return a.name + ': ' + a.message;
        if (typeof a === 'function') return String(a).split('\n')[0] + ' ...';
        if (a === null || typeof a !== 'object') return String(a);
        try {
            const seen = new WeakSet();
            return JSON.stringify(a, function(k, v) {
                if (typeof v === 'bigint') return v + 'n';
                if (typeof v === 'function') return '[Function]';
                if (typeof v === 'undefined') return 'undefined';
                if (v instanceof Map) return { Map: Array.from(v.entries()) };
                if (v instanceof Set) return { Set: Array.from(v) };
                if (typeof Node !== 'undefined' && v instanceof Node) return '<' + v.nodeName.toLowerCase() + '>';
                if (v && typeof v === 'object') {
                    if (seen.has(v)) return '[Circular]';
                    seen.add(v);
                }
                return v;
            }, 2);
        } catch (e) { return String(a); }
    }
    function send(type, data, extra) {
        window.parent.postMessage(Object.assign({ __roitx: 1, type: type, data: data }, extra || {}), '*');
    }
    ['log', 'info', 'debug', 'warn', 'error'].forEach(function(m) {
        const orig = console[m];
        console[m] = function() {
            send(m === 'error' ? 'error' : (m === 'warn' ? 'warn' : 'log'), Array.prototype.map.call(arguments, fmt).join(' '));
            orig.apply(console, arguments);
        };
    });
    window.addEventListener('error', function(e) {
        let line = null;
        if (e.lineno && e.lineno > cfg.off && e.lineno <= cfg.off + cfg.jsLines) line = e.lineno - cfg.off;
        send('error', (e.message || 'Error') + (line ? ' (JS line ' + line + ')' : ''), line ? { line: line, lang: 'js' } : {});
    });
    window.addEventListener('unhandledrejection', function(e) {
        send('error', 'Unhandled promise rejection: ' + fmt(e.reason && e.reason.message ? e.reason.message : e.reason));
    });
    window.roitxPrint = function(msg, type) { send(type || 'log', String(msg)); };
}

const PY_SETUP = `import sys
from browser import window
class _Out:
    def __init__(self, kind):
        self.kind = kind
        self.buf = ''
    def write(self, s):
        if self.kind == 'error':
            if s.strip():
                window.roitxPrint(s.rstrip(), 'error')
            return
        self.buf += s
        while '\\n' in self.buf:
            line, self.buf = self.buf.split('\\n', 1)
            window.roitxPrint(line, 'log')
    def flush(self):
        if self.buf:
            window.roitxPrint(self.buf, 'log')
            self.buf = ''
sys.stdout = _Out('log')
sys.stderr = _Out('error')`;

function buildPreviewSource() {
    const safe = (s) => (s || '').replace(/<\/script/gi, '<\\/script');
    const js = safe(jsInput.value), py = pyInput.value.trim() ? safe(pyInput.value) : '';
    const jsLines = js.split('\n').length;
    const makeBefore = (off) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">${resHead()}
<style>${cssInput.value}</style>${py ? `
<script src="https://cdnjs.cloudflare.com/ajax/libs/brython/3.11.1/brython.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/brython/3.11.1/brython_stdlib.js"><\/script>` : ''}
</head>
<body${py ? ' onload="brython()"' : ''}>
${withPhp(htmlInput.value)}
<script>(${iframeBootstrap.toString()})(${JSON.stringify({ off, jsLines })});<\/script>${resScripts()}
<script>`;
    // User JS ki pehli line se pehle kitni lines hain -> error ka line number sahi nikalta hai
    const off = (makeBefore(0).match(/\n/g) || []).length;
    let src = makeBefore(off) + js + '<\/script>';
    // Python code seedha apne <script> me (exec nahi) -> traceback me asli line number aata hai
    if (py) src += `\n<script type="text/python">${PY_SETUP}<\/script>\n<script type="text/python">${py}<\/script>`;
    return src + '\n</body>\n</html>';
}

function triggerLivePreview() {
    if (!liveFrame || !htmlInput) return;
    clearTimeout(autoTimer);
    if (skipFirstRun) {   // last run never finished (infinite loop?) -> don't freeze the page again
        skipFirstRun = false;
        try { localStorage.removeItem(RUN_FLAG); } catch (e) {}
        toast('Last run did not finish. Preview paused - fix code, then press Run.');
        return;
    }
    autoOpened = false;
    if (settings.clearConsole) clearConsole();
    try { localStorage.setItem(RUN_FLAG, '1'); } catch (e) {}
    if (phpInput && phpInput.value.trim()) {
        const id = ++phpRunId;
        runPhp(phpInput.value)
            .then(out => { lastPhpOut = out; }, err => { lastPhpOut = ''; phpConsole('error', (err && err.message) || String(err)); })
            .then(() => { if (id === phpRunId && liveFrame) liveFrame.srcdoc = buildPreviewSource(); });
    } else {
        phpRunId++; lastPhpOut = '';
        liveFrame.srcdoc = buildPreviewSource();
    }
}

let lastLog = { text: '', time: 0 };

window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || !d.__roitx || !consoleOutput || (liveFrame && e.source !== liveFrame.contentWindow)) return;

    const text = String(d.data);
    const now = Date.now();
    if (d.type === 'error' && text === lastLog.text && now - lastLog.time < 150) return; // duplicate error
    lastLog = { text, time: now };

    let line = d.line, lang = d.lang;
    if (d.type === 'error' && !line) {                       // Python traceback se line nikalo
        const nums = text.match(/line (\d+)/g);
        if (nums && /Error|Traceback/.test(text)) { line = parseInt(nums[nums.length - 1].replace(/\D/g, ''), 10); lang = 'py'; }
    }

    if (manualRun && !autoOpened && (d.type === 'error' || !htmlInput.value.trim())) { autoOpened = true; switchOutputTab('console'); }

    logCount++;
    if (consoleBadge) consoleBadge.innerText = logCount;

    const entry = document.createElement('div');
    entry.className = `log-entry ${d.type === 'error' ? 'log-error' : d.type === 'warn' ? 'log-warn' : ''}`;
    entry.textContent = `> ${text}`;
    if (line && lang) {
        entry.classList.add('log-link');
        entry.title = `Tap to jump to ${lang.toUpperCase()} line ${line}`;
        entry.addEventListener('click', () => jumpToLine(lang, line));
    }
    consoleOutput.appendChild(entry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
});

window.jumpToLine = function(lang, n) {
    switchEditorTab(lang);
    const el = ta(lang), lines = el.value.split('\n');
    if (n < 1 || n > lines.length) return;
    const start = lines.slice(0, n - 1).reduce((a, l) => a + l.length + 1, 0);
    el.focus();
    el.setSelectionRange(start, start + lines[n - 1].length);
    el.scrollTop = Math.max(0, (n - 3) * codeLH(el));
};
/* ==========================================================================
   8. Global Actions, Tabs & Initialization
   ========================================================================== */
window.switchEditorTab = function(tabName) {
    document.querySelectorAll('.editor-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabName + 'Panel').classList.add('active');
    document.getElementById('tabBtn' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).classList.add('active');
    renderWindow(tabName, false);
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
    const el = ta(type);
    if (el && el.value) editText(el, 0, el.value.length, '');   // Ctrl+Z se wapas aa sakta hai
    triggerLivePreview();
};

/* ==========================================================================
   10. ZIP Export (no library, store-only ZIP writer)
   ========================================================================== */
const CRC_TABLE = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
})();
function crc32(bytes) {
    let c = -1;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
}

function makeZip(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    const d = new Date();
    const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    let offset = 0;
    files.forEach(f => {
        const name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
        const lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
        lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
        lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
        parts.push(new Uint8Array(lh.buffer), name, data);
        const ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
        ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true);
        ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
        ch.setUint32(42, offset, true);
        central.push(new Uint8Array(ch.buffer), name);
        offset += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((n, c) => n + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

window.exportZip = function() {
    const p = currentProject();
    const slug = (p.name || 'roitx').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'roitx';
    const hasPy = pyInput.value.trim() !== '';
    const index = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(p.name)}</title>
    ${resHead()}
    <link rel="stylesheet" href="style.css">${hasPy ? `
    <script src="https://cdnjs.cloudflare.com/ajax/libs/brython/3.11.1/brython.min.js"><\/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/brython/3.11.1/brython_stdlib.js"><\/script>` : ''}
</head>
<body${hasPy ? ' onload="brython()"' : ''}>
${withPhp(htmlInput.value)}${resScripts()}
    <script src="script.js"><\/script>${hasPy ? `
    <script type="text/python">
${pyInput.value}
    <\/script>` : ''}
</body>
</html>`;
    const files = [
        { name: 'index.html', data: index },
        { name: 'style.css', data: cssInput.value },
        { name: 'script.js', data: jsInput.value }
    ];
    if (hasPy) files.push({ name: 'main.py', data: pyInput.value });
    if (phpInput.value.trim()) files.push({ name: 'main.php', data: phpInput.value });
    triggerDownload(slug + '.zip', makeZip(files), 'application/zip');
    const m = document.getElementById('exportMenu'); if (m) m.classList.add('hidden');
    toast('ZIP downloaded');
};

/* ==========================================================================
   11. Share Link (code URL hash me compress hota hai, backend nahi chahiye)
   ========================================================================== */
function toB64Url(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64Url(str) {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, c => c.charCodeAt(0));
}
async function pipeBytes(bytes, stream) {
    return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

async function encodeShare() {
    const bytes = new TextEncoder().encode(JSON.stringify({
        n: currentProject().name, h: htmlInput.value, c: cssInput.value, j: jsInput.value, p: pyInput.value, q: phpInput.value, s: projRes()
    }));
    if (window.CompressionStream) return 'z.' + toB64Url(await pipeBytes(bytes, new CompressionStream('deflate-raw')));
    return 'r.' + toB64Url(bytes);
}

async function decodeShare(code) {
    const kind = code.slice(0, 2);
    let bytes = fromB64Url(code.slice(2));
    if (kind === 'z.') bytes = await pipeBytes(bytes, new DecompressionStream('deflate-raw'));
    return JSON.parse(new TextDecoder().decode(bytes));
}

window.copyShareLink = async function() {
    const m = document.getElementById('exportMenu'); if (m) m.classList.add('hidden');
    try {
        const url = location.href.split('#')[0] + '#c=' + await encodeShare();
        try { await navigator.clipboard.writeText(url); toast(url.length > 8000 ? `Link copied (${url.length} chars - bahut lamba)` : 'Share link copied!'); }
        catch (e) { prompt('Link copy karo:', url); }
    } catch (e) { toast('Share link banane me error'); }
};

async function importSharedFromHash() {
    if (!location.hash.startsWith('#c=')) return false;
    try {
        const d = await decodeShare(location.hash.slice(3));
        commitSave();
        const p = makeProject('Shared: ' + (d.n || 'project'), { html: d.h || '', css: d.c || '', js: d.j || '', py: d.p || '', php: d.q || '', res: d.s || null });
        store.projects[p.id] = p;
        openProjectInEditors(p.id);
        toast('Shared project naye project me khul gaya');
        history.replaceState(null, '', location.href.split('#')[0]);
        return true;
    } catch (e) { toast('Share link kharab hai'); return false; }
}

/* ==========================================================================
   12. Keyboard Shortcuts & Initialization
   ========================================================================== */
document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveProjectNow(); }
    else if (mod && e.key === 'Enter') { e.preventDefault(); runManualCode(); }
    else if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFindReplaceModal(); }
    else if (e.key === 'Escape') {
        closeProjects(); closeMenus(); closeSettings();
        const fr = document.getElementById('findReplaceModal');
        if (fr && !fr.classList.contains('hidden')) fr.classList.add('hidden');
    }
});

window.addEventListener('pagehide', () => { if (saveTimer) commitSave(); });

window.addEventListener('DOMContentLoaded', async () => {
    htmlInput = document.getElementById('htmlInput');
    cssInput = document.getElementById('cssInput');
    jsInput = document.getElementById('jsInput');
    pyInput = document.getElementById('pyInput');
    phpInput = document.getElementById('phpInput');

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

    LANGS.forEach(l => {
        setupScrollSync(l);
        setupSmartKeyboard(ta(l), l);
    });

    // Toolbar buttons editor ka focus na churaye (mobile keyboard band na ho)
    const bar = document.querySelector('.shortcut-bar');
    if (bar) bar.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });   // focus na jaye; click chalta rahe

    const list = document.getElementById('projectList');
    if (list) list.addEventListener('click', handleProjectClick);
    const pn = document.getElementById('projectName');

    store = loadStore();
    openProjectInEditors(store.current);
    if (pn) pn.textContent = currentProject().name;

    await importSharedFromHash();
});

/* ==========================================================================
   9. Save & Export Engine (With Custom Naming & Extension Support)
   ========================================================================== */

// Dropdown menus (Export / View): see section 13

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
    } else if (document.getElementById('phpPanel').classList.contains('active')) {
        content = phpInput ? phpInput.value : '';
        defaultName = 'index.php';
    }

    const userFileName = prompt("फ़ाइल का नाम और एक्सटेंशन दर्ज करें (e.g., roitx.txt, mystyle.css):", defaultName);

    if (userFileName && userFileName.trim() !== "") {
        triggerDownload(userFileName.trim(), content, 'text/plain;charset=utf-8');
    }

    closeMenus();
};

// 2. Export Full Web Page File (Custom Name & Extension)
window.exportFullHTMLProject = function() {
    const defaultName = 'roitx_project.html';
    const userFileName = prompt("वेबपेज फ़ाइल का नाम और एक्सटेंशन दर्ज करें (e.g., roitx.html, page.txt):", defaultName);

    if (!userFileName || userFileName.trim() === "") {
        closeMenus();
        return;
    }

    const fullSource = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Roitx Exported Project</title>${resHead()}
    <style>
${cssInput ? cssInput.value : ''}
    </style>
    <!-- Brython Engine for Python Support -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/brython/3.11.1/brython.min.js"><\/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/brython/3.11.1/brython_stdlib.js"><\/script>
</head>
<body onload="brython()">

${htmlInput ? withPhp(htmlInput.value) : ''}
${resScripts()}
    <script>
${jsInput ? jsInput.value : ''}
    <\/script>

    <script type="text/python">
${pyInput ? pyInput.value : ''}
    <\/script>
</body>
</html>`;

    triggerDownload(userFileName.trim(), fullSource, 'text/plain;charset=utf-8');
    closeMenus();
};

// 3. Export All Separate Files (Custom Base Name Prefix)
window.exportAllSeparateFiles = function() {
    const basePrefix = prompt("फ़ाइलों का मुख्य नाम (Prefix) दर्ज करें:", "roitx");

    if (!basePrefix || basePrefix.trim() === "") {
        closeMenus();
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
    if (phpInput && phpInput.value.trim() !== '') {
        setTimeout(() => triggerDownload(`${prefix}_main.php`, phpInput.value, 'text/plain;charset=utf-8'), 800);
    }

    closeMenus();
};

/* ==========================================================================
   13. v6.0 - Working navigation + CodePen-style features
       (menus, layouts, splitter, settings, auto-run, resources, console REPL, format)
   ========================================================================== */
const SETTINGS_KEY = 'roitx_settings_v1';
const RUN_FLAG = 'roitx_run_pending';
const __lastRunCrashed = (() => { try { return localStorage.getItem(RUN_FLAG) === '1'; } catch (e) { return false; } })();
let skipFirstRun = __lastRunCrashed;

let settings = { autoRun: true, clearConsole: true, delay: 800, fontSize: null, layout: 'auto', theme: 'dark' };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}); } catch (e) {}
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} }
const $id = (id) => document.getElementById(id);

/* ---- Dropdown menus (Export / View): fixed position, never clipped, theme-aware ---- */
const MENUS = ['exportMenu', 'viewMenu'];
function closeMenus(exceptId) {
    MENUS.forEach(id => { if (id !== exceptId) { const m = $id(id); if (m) m.classList.add('hidden'); } });
}
function toggleMenu(menuId, btnId, ev) {
    if (ev) ev.stopPropagation();
    const m = $id(menuId), b = $id(btnId);
    if (!m || !b) return;
    closeMenus(menuId);
    if (!m.classList.contains('hidden')) { m.classList.add('hidden'); return; }
    m.classList.remove('hidden');
    const r = b.getBoundingClientRect(), mw = m.offsetWidth;
    m.style.top = (r.bottom + 6) + 'px';
    m.style.left = Math.max(8, Math.min(r.right - mw, window.innerWidth - mw - 8)) + 'px';
}
window.toggleExportMenu = function (ev) { toggleMenu('exportMenu', 'exportBtn', ev); };
window.toggleViewMenu = function (ev) { toggleMenu('viewMenu', 'viewBtn', ev); };
document.addEventListener('click', (e) => { if (!e.target.closest('.menu-wrap')) closeMenus(); });
window.addEventListener('resize', () => closeMenus());

/* ---- Theme (saved) ---- */
function applyTheme() {
    const light = settings.theme === 'light';
    document.body.classList.toggle('light-theme', light);
    const icon = document.querySelector('#mode-toggle i');
    if (icon) { icon.classList.toggle('fa-sun', light); icon.classList.toggle('fa-moon', !light); }
}
window.toggleThemeMode = function () {
    settings.theme = settings.theme === 'light' ? 'dark' : 'light';
    saveSettings(); applyTheme();
};

/* ---- Device preview: full / tablet / mobile ---- */
window.setDeviceMode = function (mode) {
    const pw = $id('previewWrapper');
    if (pw) { pw.classList.toggle('mobile-mode', mode === 'mobile'); pw.classList.toggle('tablet-mode', mode === 'tablet'); }
    [['full', 'btnDeviceFull'], ['tablet', 'btnDeviceTablet'], ['mobile', 'btnDeviceMobile']].forEach(([m, id]) => {
        const b = $id(id); if (b) b.classList.toggle('active', m === mode);
    });
};

/* ---- Layouts (CodePen "Change View") ---- */
let prevLayout = 'auto';
window.setLayout = function (mode) {
    const g = document.querySelector('.workspace-grid');
    if (!g) return;
    if (!['auto', 'lr', 'tb', 'editor', 'preview'].includes(mode)) mode = 'auto';
    if (settings.layout !== 'editor' && settings.layout !== 'preview') prevLayout = settings.layout;
    settings.layout = mode; saveSettings();
    g.dataset.layout = mode;
    g.removeAttribute('data-split');
    document.querySelectorAll('#viewMenu [data-layout]').forEach(b => b.classList.toggle('active', b.dataset.layout === mode));
    closeMenus();
    setTimeout(() => { if (window.updateSplitter) updateSplitter(); LANGS.forEach(l => renderWindow(l, false)); }, 30);
};
window.togglePreviewPanel = function () { setLayout(settings.layout === 'editor' ? (prevLayout || 'auto') : 'editor'); };

window.openPreviewNewTab = function () {
    closeMenus();
    try {
        const url = URL.createObjectURL(new Blob([buildPreviewSource()], { type: 'text/html' }));
        if (!window.open(url, '_blank')) toast('Popup blocked - allow popups for this page');
        setTimeout(() => URL.revokeObjectURL(url), 300000);
    } catch (e) { toast('Could not open preview'); }
};
window.openPreviewFullscreen = function () {
    closeMenus();
    const el = $id('previewWrapper');
    const rf = el && (el.requestFullscreen || el.webkitRequestFullscreen);
    const visible = el && !el.classList.contains('hidden') && el.offsetParent !== null;
    if (rf && visible) {
        try { const p = rf.call(el); if (p && p.catch) p.catch(openPreviewNewTab); return; } catch (e) {}
    }
    openPreviewNewTab();   // iOS Safari / hidden preview: new tab fallback
};

/* ---- Draggable splitter between editor and preview ---- */
function initSplitter() {
    const g = document.querySelector('.workspace-grid'), sp = $id('splitter');
    if (!g || !sp) return;
    const ed = g.querySelector('.editors-wrapper'), out = g.querySelector('.output-container');
    let drag = false;

    window.updateSplitter = function () {
        const hidden = (el) => getComputedStyle(el).display === 'none';
        if (g.dataset.layout === 'editor' || g.dataset.layout === 'preview' || hidden(ed) || hidden(out)) { g.dataset.orient = ''; return; }
        const gr = g.getBoundingClientRect(), er = ed.getBoundingClientRect(), orr = out.getBoundingClientRect();
        const stacked = orr.top > er.top + 4;
        const orient = stacked ? 'v' : 'h';
        if (g.dataset.orient !== orient) g.dataset.orient = orient;
        if (!g.hasAttribute('data-split')) {
            const pct = stacked ? (er.bottom - gr.top) / gr.height : (er.right - gr.left) / gr.width;
            g.style.setProperty('--split', (pct * 100).toFixed(2) + '%');
        }
    };
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => updateSplitter()); [g, ed, out].forEach(el => ro.observe(el)); }
    window.addEventListener('orientationchange', () => setTimeout(updateSplitter, 200));

    sp.addEventListener('pointerdown', (e) => { e.preventDefault(); drag = true; sp.setPointerCapture(e.pointerId); g.classList.add('dragging'); });
    sp.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const gr = g.getBoundingClientRect(), v = g.dataset.orient === 'v';
        let pct = v ? (e.clientY - gr.top) / gr.height : (e.clientX - gr.left) / gr.width;
        pct = Math.min(0.85, Math.max(0.15, pct));
        g.setAttribute('data-split', '');
        g.style.setProperty('--split', (pct * 100).toFixed(2) + '%');
    });
    const end = () => { drag = false; g.classList.remove('dragging'); };
    sp.addEventListener('pointerup', end);
    sp.addEventListener('pointercancel', end);
    sp.addEventListener('dblclick', () => { g.removeAttribute('data-split'); setTimeout(updateSplitter, 30); });
}

/* ---- Font size (CSS variables, works with the windowed highlighter) ---- */
function applyFontSize() {
    const root = document.documentElement;
    if (settings.fontSize) {
        root.style.setProperty('--code-fs', settings.fontSize + 'px');
        root.style.setProperty('--code-lh', Math.round(settings.fontSize * 1.6) + 'px');
    }
    if (htmlInput) LANGS.forEach(l => renderWindow(l, true));
    const v = $id('fsVal');
    const t = document.querySelector('textarea');
    if (v && t) v.textContent = Math.round(parseFloat(getComputedStyle(t).fontSize)) + 'px';
}
window.changeFontSize = function (dir) {
    const t = document.querySelector('textarea');
    const base = settings.fontSize || (t ? parseFloat(getComputedStyle(t).fontSize) : 14);
    settings.fontSize = Math.min(24, Math.max(10, Math.round(base + dir)));
    saveSettings(); applyFontSize();
};

/* ---- Auto-run (live preview while typing) + crash guard ---- */
let autoTimer = null;
function scheduleAutoRun() {
    if (!settings.autoRun || suspendSave) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(triggerLivePreview, settings.delay || 800);
}
window.toggleAutoRun = function () {
    settings.autoRun = !settings.autoRun; saveSettings(); syncPrefsUI();
    toast('Auto-run ' + (settings.autoRun ? 'ON' : 'OFF'));
};

function clearConsole() {
    if (consoleOutput) consoleOutput.innerHTML = '';
    logCount = 0;
    if (consoleBadge) consoleBadge.innerText = '0';
}
window.clearConsole = clearConsole;

/* ---- Project resources: external CSS/JS, <head> stuff, CSS base (CodePen "Pen Settings") ---- */
const NORMALIZE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css';
const RESET_CSS = '*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0}';
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
const LIBS = {
    bootstrap: { name: 'Bootstrap 5', css: [CDN + 'bootstrap/5.3.3/css/bootstrap.min.css'], js: [CDN + 'bootstrap/5.3.3/js/bootstrap.bundle.min.js'] },
    tailwind: { name: 'Tailwind (Play CDN)', css: [], js: ['https://cdn.tailwindcss.com'] },
    jquery: { name: 'jQuery', css: [], js: [CDN + 'jquery/3.7.1/jquery.min.js'] },
    react: { name: 'React 18', css: [], js: [CDN + 'react/18.3.1/umd/react.production.min.js', CDN + 'react-dom/18.3.1/umd/react-dom.production.min.js'] },
    vue: { name: 'Vue 3', css: [], js: [CDN + 'vue/3.4.21/vue.global.prod.min.js'] },
    chartjs: { name: 'Chart.js', css: [], js: [CDN + 'Chart.js/4.4.1/chart.umd.min.js'] },
    gsap: { name: 'GSAP', css: [], js: [CDN + 'gsap/3.12.5/gsap.min.js'] },
    three: { name: 'Three.js r128', css: [], js: [CDN + 'three.js/r128/three.min.js'] },
    p5: { name: 'p5.js', css: [], js: [CDN + 'p5.js/1.9.0/p5.min.js'] },
    d3: { name: 'D3', css: [], js: [CDN + 'd3/7.8.5/d3.min.js'] },
    axios: { name: 'Axios', css: [], js: [CDN + 'axios/1.6.7/axios.min.js'] },
    lodash: { name: 'Lodash', css: [], js: [CDN + 'lodash.js/4.17.21/lodash.min.js'] },
    fa: { name: 'Font Awesome 6', css: [CDN + 'font-awesome/6.4.0/css/all.min.css'], js: [] },
    animate: { name: 'Animate.css', css: [CDN + 'animate.css/4.1.1/animate.min.css'], js: [] }
};

function projRes(p) {
    p = p || currentProject();
    if (!p.res) p.res = { base: 'none', css: '', js: '', head: '' };
    return p.res;
}
const urlList = (s) => (s || '').split(/\r?\n/).map(x => x.trim()).filter(x => /^(https?:)?\/\//i.test(x));
const escAttr = (u) => u.replace(/"/g, '%22').replace(/</g, '%3C').replace(/>/g, '%3E');

function resHead(p) {
    const r = projRes(p);
    let out = '';
    if (r.base === 'normalize') out += `\n<link rel="stylesheet" href="${NORMALIZE_URL}">`;
    else if (r.base === 'reset') out += `\n<style>${RESET_CSS}</style>`;
    urlList(r.css).forEach(u => { out += `\n<link rel="stylesheet" href="${escAttr(u)}">`; });
    if (r.head && r.head.trim()) out += '\n' + r.head;
    return out;
}
function resScripts(p) {
    return urlList(projRes(p).js).map(u => `\n<script src="${escAttr(u)}"><\/script>`).join('');
}

/* ---- Settings modal ---- */
function syncPrefsUI() {
    if ($id('setAutoRun')) $id('setAutoRun').checked = !!settings.autoRun;
    if ($id('setClearConsole')) $id('setClearConsole').checked = !!settings.clearConsole;
    if ($id('setDelay')) $id('setDelay').value = String(settings.delay || 800);
    const ab = $id('autoRunBtn'); if (ab) ab.classList.toggle('on', !!settings.autoRun);
}
function syncResourcesUI() {
    if (!store) return;
    const r = projRes();
    $id('setBase').value = r.base || 'none';
    $id('setCss').value = r.css || '';
    $id('setJs').value = r.js || '';
    $id('setHead').value = r.head || '';
}
window.applySettingsFromUI = function () {
    settings.autoRun = $id('setAutoRun').checked;
    settings.clearConsole = $id('setClearConsole').checked;
    settings.delay = parseInt($id('setDelay').value, 10) || 800;
    saveSettings(); syncPrefsUI();
};
function saveResourcesFromUI() {
    if (!store) return;
    const r = projRes();
    const next = { base: $id('setBase').value, css: $id('setCss').value, js: $id('setJs').value, head: $id('setHead').value };
    const changed = Object.keys(next).some(k => (r[k] || '') !== next[k]);
    if (!changed) return;
    Object.assign(r, next);
    currentProject().updated = Date.now();
    saveStore();
    triggerLivePreview();
    toast('Resources saved');
}
window.openSettings = function () {
    closeMenus(); syncPrefsUI(); syncResourcesUI(); applyFontSize();
    $id('settingsModal').classList.remove('hidden');
};
window.closeSettings = function () {
    const m = $id('settingsModal');
    if (m && !m.classList.contains('hidden')) { saveResourcesFromUI(); m.classList.add('hidden'); }
};
window.addQuickResource = function () {
    const sel = $id('quickAdd'), lib = LIBS[sel.value];
    if (!lib) return;
    const add = (boxId, urls) => {
        const box = $id(boxId);
        urls.forEach(u => { if (!box.value.includes(u)) box.value += (box.value && !box.value.endsWith('\n') ? '\n' : '') + u; });
    };
    add('setCss', lib.css); add('setJs', lib.js);
    sel.value = '';
    toast(lib.name + ' added - tap Done to apply');
};

/* ---- Console: run JS inside the preview (like CodePen's console input) ---- */
function replPrint(cls, text) {
    if (!consoleOutput) return;
    const d = document.createElement('div');
    d.className = 'log-entry ' + cls;
    d.textContent = (cls === 'log-in' ? '> ' : cls === 'log-out' ? '< ' : '') + text;
    consoleOutput.appendChild(d);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}
function fmtResult(v) {
    try {
        if (typeof v === 'string') return JSON.stringify(v);
        if (typeof v === 'function') return String(v).split('\n')[0] + ' ...';
        if (v && typeof v === 'object') return JSON.stringify(v, (k, x) => typeof x === 'bigint' ? x + 'n' : x, 2);
        return String(v);
    } catch (e) { return String(v); }
}
function runInFrame(code) {
    replPrint('log-in', code);
    try {
        const w = liveFrame && liveFrame.contentWindow;
        if (!w) throw new Error('Preview not ready');
        replPrint('log-out', fmtResult(w.eval(code)));
    } catch (err) { replPrint('log-error', (err && err.name ? err.name + ': ' : '') + (err && err.message ? err.message : err)); }
}
function initConsoleInput() {
    const inp = $id('consoleInput');
    if (!inp) return;
    const hist = []; let hi = 0;
    inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const code = inp.value.trim(); if (!code) return;
            hist.push(code); hi = hist.length; inp.value = ''; runInFrame(code);
        } else if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) inp.value = hist[--hi]; }
        else if (e.key === 'ArrowDown') { e.preventDefault(); if (hi < hist.length - 1) inp.value = hist[++hi]; else { hi = hist.length; inp.value = ''; } }
    });
}

/* ---- Format code (Prettier, loaded on demand) ---- */
let prettierLoad = null;
function loadScriptTag(src) {
    return new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load formatter (check internet)'));
        document.head.appendChild(s);
    });
}
function loadPrettier() {
    if (window.prettier && window.prettierPlugins) return Promise.resolve();
    if (!prettierLoad) {
        const B = CDN + 'prettier/2.8.8/';
        prettierLoad = loadScriptTag(B + 'standalone.js')
            .then(() => Promise.all(['parser-babel.js', 'parser-html.js', 'parser-postcss.js'].map(f => loadScriptTag(B + f))))
            .catch(e => { prettierLoad = null; throw e; });
    }
    return prettierLoad;
}
window.formatCode = async function (type) {
    type = type || (getActiveEditorTextArea() || {}).id;
    type = (type || '').replace('Input', '');
    const el = ta(type);
    if (!el || !el.value.trim()) return;
    if (type === 'py' || type === 'php') { toast((type === 'py' ? 'Python' : 'PHP') + ' format abhi supported nahi hai'); return; }
    toast('Formatting...');
    try {
        await loadPrettier();
        const out = await prettier.format(el.value, { parser: { html: 'html', css: 'css', js: 'babel' }[type], plugins: prettierPlugins, tabWidth: 4, printWidth: 100 });
        const clean = out.replace(/\n$/, '');
        if (clean !== el.value) editText(el, 0, el.value.length, clean, 0);
        toast('Formatted');
    } catch (e) { toast('Format failed: ' + String(e.message || e).split('\n')[0].slice(0, 80)); }
};

/* ---- Extra keyboard shortcuts ---- */
document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.shiftKey && e.code === 'KeyF') { e.preventDefault(); formatCode(); }
    else if (e.altKey && /^Digit[1-5]$/.test(e.code)) { e.preventDefault(); switchEditorTab(LANGS[+e.code.slice(5) - 1]); }
    else if (e.altKey && e.code === 'KeyP') { e.preventDefault(); togglePreviewPanel(); }
});

/* ---- Init ---- */
document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    document.addEventListener('selectionchange', updateCursorInfo);
    applyFontSize();
    syncPrefsUI();
    setLayout(settings.layout);
    initSplitter();
    initConsoleInput();
    setTimeout(() => { if (window.updateSplitter) updateSplitter(); }, 60);
    if (liveFrame) liveFrame.addEventListener('load', () => { try { localStorage.removeItem(RUN_FLAG); } catch (e) {} });
});


/* ==========================================================================
   14. v6.1 - Snippets, line operations, clipboard, import, cursor info
   ========================================================================== */
const SNIPPETS = {
    js: { log: 'console.log($|);', fn: 'function $|() {\n    \n}', af: 'const $| = () => {\n    \n};', for: 'for (let i = 0; i < $|; i++) {\n    \n}',
        fe: '$|.forEach((item) => {\n    \n});', if: 'if ($|) {\n    \n}', ife: 'if ($|) {\n    \n} else {\n    \n}', qs: "document.querySelector('$|')",
        qsa: "document.querySelectorAll('$|')", ael: "$|.addEventListener('click', (e) => {\n    \n});",
        fetch: "fetch('$|')\n    .then(r => r.json())\n    .then(data => console.log(data));", st: 'setTimeout(() => {\n    $|\n}, 1000);',
        si: 'setInterval(() => {\n    $|\n}, 1000);', try: 'try {\n    $|\n} catch (err) {\n    console.error(err);\n}', cls: 'class $| {\n    constructor() {\n        \n    }\n}' },
    css: { df: 'display: flex;', dg: 'display: grid;', dn: 'display: none;', jcc: 'justify-content: center;', jcsb: 'justify-content: space-between;',
        aic: 'align-items: center;', fdc: 'flex-direction: column;', pa: 'position: absolute;', pr: 'position: relative;', pf: 'position: fixed;',
        tac: 'text-align: center;', w100: 'width: 100%;', h100: 'height: 100%;', m0: 'margin: 0;', p0: 'padding: 0;', mxa: 'margin: 0 auto;',
        br: 'border-radius: $|px;', bs: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);', trs: 'transition: all 0.3s ease;', ovh: 'overflow: hidden;',
        center: 'display: flex;\njustify-content: center;\nalign-items: center;', mq: '@media (max-width: 600px) {\n    $|\n}',
        kf: '@keyframes $| {\n    from { }\n    to { }\n}', grid3: 'display: grid;\ngrid-template-columns: repeat(3, 1fr);\ngap: 16px;' },
    py: { def: 'def $|():\n    pass', for: 'for i in range($|):\n    pass', if: 'if $|:\n    pass', cls: 'class $|:\n    def __init__(self):\n        pass',
        pr: 'print($|)', try: 'try:\n    $|\nexcept Exception as e:\n    print(e)', main: "if __name__ == '__main__':\n    $|", lc: '[$| for x in range(10)]' },
    php: { echo: 'echo "$|";', ec: 'echo $|;', fn: 'function $|() {\n    \n}', for: 'for ($i = 0; $i < $|; $i++) {\n    \n}',
        fe: 'foreach ($| as $key => $value) {\n    \n}', if: 'if ($|) {\n    \n}', ife: 'if ($|) {\n    \n} else {\n    \n}', arr: '$| = [];',
        vd: 'var_dump($|);', pr: 'print_r($|);', cls: 'class $| {\n    public function __construct() {\n        \n    }\n}',
        try: 'try {\n    $|\n} catch (Exception $e) {\n    echo $e->getMessage();\n}' }
};
function trySnippet(el, type) {
    const tbl = SNIPPETS[type]; if (!tbl) return false;
    const v = el.value, s = el.selectionStart, ls = v.lastIndexOf('\n', s - 1) + 1, before = v.slice(ls, s);
    const m = /[\w-]+$/.exec(before);
    if (!m || !Object.prototype.hasOwnProperty.call(tbl, m[0])) return false;
    const indent = before.match(/^[ \t]*/)[0];
    let out = tbl[m[0]].split('\n').map((l, i) => i ? indent + l : l).join('\n');
    let cur = out.indexOf('$|'); out = out.replace('$|', '');
    if (cur < 0) cur = out.length;
    const from = s - m[0].length;
    editText(el, from, s, out, from + cur);
    return true;
}

window.lineOp = function (op) {
    const el = getActiveEditorTextArea(); if (!el) return;
    const type = typeOf(el), v = el.value, s = el.selectionStart, e = el.selectionEnd;
    const ls = v.lastIndexOf('\n', s - 1) + 1;
    let le = v.indexOf('\n', e > s && v[e - 1] === '\n' ? e - 1 : e); if (le < 0) le = v.length;
    const block = v.slice(ls, le), lines = block.split('\n');
    if (op === 'dup') editText(el, le, le, '\n' + block, s + block.length + 1, e + block.length + 1);
    else if (op === 'del') { if (le < v.length) editText(el, ls, le + 1, '', ls); else { const p = Math.max(0, ls - 1); editText(el, p, le, '', p); } }
    else if (op === 'up') {
        if (ls === 0) return;
        const ps = v.lastIndexOf('\n', ls - 2) + 1, prev = v.slice(ps, ls - 1), d = prev.length + 1;
        editText(el, ps, le, block + '\n' + prev, s - d, e - d);
    } else if (op === 'down') {
        if (le >= v.length) return;
        let ne = v.indexOf('\n', le + 1); if (ne < 0) ne = v.length;
        const next = v.slice(le + 1, ne), d = next.length + 1;
        editText(el, ls, ne, next + '\n' + block, s + d, e + d);
    } else if (op === 'comment') {
        let out;
        if (type === 'html' || type === 'css') {
            const [o, c] = type === 'html' ? ['<!--', '-->'] : ['/*', '*/'], t = block.trim(), ind = block.match(/^\s*/)[0];
            out = t.startsWith(o) && t.endsWith(c) ? ind + t.slice(o.length, t.length - c.length).trim() : ind + o + ' ' + t + ' ' + c;
        } else {
            const mk = type === 'py' ? '#' : '//';
            const all = lines.every(l => !l.trim() || l.trimStart().startsWith(mk));
            out = lines.map(l => !l.trim() ? l : all ? l.replace(new RegExp('^(\\s*)' + mk + ' ?'), '$1') : l.replace(/^(\s*)/, '$1' + mk + ' ')).join('\n');
        }
        editText(el, ls, le, out, ls, ls + out.length);
    }
};

window.gotoLine = function () {
    const el = getActiveEditorTextArea(); if (!el) return;
    const n = parseInt(prompt('Go to line (1-' + el.value.split('\n').length + '):'), 10);
    if (n) jumpToLine(typeOf(el), n);
};

window.clipAction = async function (a) {
    const el = getActiveEditorTextArea(); if (!el) return;
    try {
        if (a === 'all') { el.focus(); el.select(); }
        else if (a === 'copy') { await navigator.clipboard.writeText(el.value.slice(el.selectionStart, el.selectionEnd) || el.value); toast('Copied'); }
        else if (a === 'paste') { const t = await navigator.clipboard.readText(); editText(el, el.selectionStart, el.selectionEnd, t); }
    } catch (err) { toast('Clipboard permission nahi mili'); }
};

window.importFiles = async function (inp) {
    const map = { html: 'html', htm: 'html', css: 'css', js: 'js', py: 'py', php: 'php' };
    for (const f of inp.files) {
        const t = map[f.name.split('.').pop().toLowerCase()];
        if (!t) { toast('Unsupported: ' + f.name); continue; }
        const el = ta(t); editText(el, 0, el.value.length, await f.text(), 0);
        switchEditorTab(t); toast('Imported ' + f.name);
    }
    inp.value = ''; closeMenus();
};

function updateCursorInfo() {
    const el = getActiveEditorTextArea(), c = document.getElementById('cursorInfo');
    if (!el || !c) return;
    const b = el.value.slice(0, el.selectionStart).split('\n'), sel = el.selectionEnd - el.selectionStart;
    c.textContent = `Ln ${b.length}, Col ${b[b.length - 1].length + 1}` + (sel ? ` (${sel} sel)` : '');
}

