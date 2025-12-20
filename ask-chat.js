// ask-chat.js — Smart tools engine with safe math functions (sin, cos, tan, log, sqrt, ^)
// No eval for math, safe tokenizer + shunting-yard + RPN evaluator
(() => {
  // ---- DOM elements (must exist in ask-chat.html) ----
  const chatWindow = document.getElementById('chatWindow');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modalContent');
  const notesCount = document.getElementById('notesCount');

  if (!chatWindow || !input || !sendBtn) {
    console.warn('ask-chat.js: Required DOM elements missing (chatWindow/chatInput/sendBtn).');
  }

  // ---- Initialization ----
  updateNotesCount();
  addBotMsg("Hi Rohit 👋 — I'm your study assistant. Try commands like: 'open pdf ch1.pdf', 'calendar', 'calculate 23*7', 'create note: todo', or math like sin(90), log(100), sqrt(144).");

  sendBtn && sendBtn.addEventListener('click', onSend);
  input && input.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSend(); });

  // expose quick-run for buttons
  window.runCommand = (text) => { if (!input) return; input.value = text; onSend(); };

  // ---- UI helpers ----
  function addUserMsg(text) {
    if (!chatWindow) return;
    const d = document.createElement('div'); d.className = 'msg user'; d.textContent = text;
    chatWindow.appendChild(d); chatWindow.scrollTop = chatWindow.scrollHeight;
  }
  function addBotMsg(text) {
    if (!chatWindow) return;
    const d = document.createElement('div'); d.className = 'msg bot'; d.textContent = text;
    chatWindow.appendChild(d); chatWindow.scrollTop = chatWindow.scrollHeight;
  }
  function showTyping() {
    if (!chatWindow) return null;
    const el = document.createElement('div'); el.className = 'msg bot typing';
    el.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    chatWindow.appendChild(el); chatWindow.scrollTop = chatWindow.scrollHeight;
    return el;
  }

  // ---- Main send handler ----
  function onSend() {
    if (!input) return;
    const raw = input.value.trim();
    if (!raw) return;
    addUserMsg(raw);
    input.value = '';
    handleCommand(raw);
  }

  // ---- Normalizer ----
  function normalize(s) { return String(s || '').trim().toLowerCase(); }

  // ---- COMMAND DISPATCHER ----
  async function handleCommand(raw) {
    const cmd = normalize(raw);

    // open pdf
    if (cmd.startsWith('open pdf') || cmd.includes('open pdf ')) {
      const arg = raw.replace(/^open\s*pdf\s*/i,'').trim();
      await doOpenPDF(arg);
      return;
    }

    // explicit open link
    if (cmd.startsWith('open link') || /^open\s+https?:\/\//i.test(raw)) {
      const url = raw.replace(/^open(link)?\s*/i,'').trim();
      if (isValidUrl(url)) {
        addBotMsg('Opening link...');
        window.open(url, '_blank');
      } else addBotMsg('No valid URL found. Use: open link https://example.com');
      return;
    }

    // generic "open" may be for pages
    if (cmd.startsWith('open ')) {
      const target = raw.replace(/^open\s*/i,'').trim();
      // class/page shortcuts
      if (/class\s*9/.test(target)) { addBotMsg('Opening Class 9 page...'); goto('class9-subjects.html'); return; }
      if (/class\s*11/.test(target)) { addBotMsg('Opening Class 11 page...'); goto('11-streams.html'); return; }
      if (/class\s*12/.test(target)) { addBotMsg('Opening Class 12 page...'); goto('12-streams.html'); return; }
      // else try url
      if (isValidUrl(target)) { addBotMsg('Opening link...'); window.open(target, '_blank'); return; }
      addBotMsg('Could not identify what to open. Try "open pdf <filename>" or "open link https://..."');
      return;
    }

    // calendar
    if (cmd === 'calendar' || cmd === 'show calendar' || cmd.includes('calendar')) {
      showCalendarModal();
      return;
    }

    // time / date
    if (['time','date','what time','what is time','current time'].some(k => cmd === k || cmd.includes(k))) {
      const now = new Date();
      addBotMsg('Current date & time: ' + now.toLocaleString());
      return;
    }

    // download / export notes
    if (cmd === 'download notes' || cmd === 'export notes') { downloadNotesFile(); return; }

    // show notes
    if (cmd === 'show notes' || cmd === 'notes' || cmd === 'view notes') { showNotesModal(); return; }

    // create note
    if (cmd.startsWith('create note:') || cmd.startsWith('create note')) {
      const note = raw.split(/create note:?\s*/i)[1] || '';
      if (!note) { addBotMsg('Please provide note text. Example: create note: Revise optics'); return; }
      saveNote(note); addBotMsg('Note saved ✔'); return;
    }

    // delete note
    if (cmd.startsWith('delete note')) {
      const rest = raw.split(/delete note:?\s*/i)[1];
      if (!rest) { addBotMsg('Specify note number or exact text to delete. e.g., delete note 2'); return; }
      deleteNote(rest); return;
    }

    // calculation shorthand: "calculate ..." or expression starts with digits or function names
    if (cmd.startsWith('calculate') || cmd.startsWith('calc') || /^[0-9\-\+\(\.]/.test(cmd) || /^\s*(sin|cos|tan|log|sqrt|ln)\b/.test(cmd)) {
      const expr = raw.replace(/^(calculate|calc)\s*/i, '');
      const typing = showTyping();
      setTimeout(()=>{
        typing && typing.remove();
        const out = trySolveMath(expr);
        if (out.ok) addBotMsg(`${expr} = ${out.value}`);
        else addBotMsg('Calculation error: ' + out.error + ' (use examples: sin(90), cos(0), sqrt(144), log(100), 2^8, (12+3)/5 )');
      }, 250);
      return;
    }

    // open pdf by "chapter" mention: open chapter 3
    const mChapter = cmd.match(/chapter\s+(\d+)/);
    if (mChapter) {
      const filename = `ch${mChapter[1]}.pdf`;
      await doOpenPDF(filename);
      return;
    }

    // fallback to conversational responder
    conversationalReply(raw);
  }

  // ---- TOOLS IMPLEMENTATION ----

  // navigate helper (simple)
  function goto(path) {
    try { window.location.href = path; } catch(e){ console.warn(e); }
  }

  // 1) Open PDF handler
  async function doOpenPDF(arg) {
    if (!arg) { addBotMsg('Specify PDF filename or url, e.g., open pdf 12-phy-ch1.pdf or open pdf https://...'); return; }
    if (isValidUrl(arg)) {
      addBotMsg('Opening PDF link...');
      window.open(arg, '_blank'); return;
    }
    // assume local file name
    const filename = arg;
    addBotMsg('Opening PDF: ' + filename);
    const viewer = 'notes-viewer.html?file=' + encodeURIComponent(filename);
    window.open(viewer, '_blank');
  }

  // 2) Calendar modal
  function showCalendarModal() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();

    let html = `<h2>Calendar — ${today.toLocaleString(undefined, {month:'long'})} ${year}</h2>`;
    html += `<div>Today: ${today.toDateString()}</div>`;
    html += `<div class="calendar-grid" style="margin-top:10px">`;
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    for (let d of dayNames) html += `<div class="cal-day" style="font-weight:700">${d}</div>`;
    for (let i=0;i<startDay;i++) html += `<div class="cal-day"></div>`;
    for (let d=1; d<=daysInMonth; d++) {
      const cls = (d===today.getDate()) ? 'style="background:linear-gradient(90deg,#06b6d4,#0ee6c6);color:#021018;font-weight:700;border-radius:6px"' : '';
      html += `<div class="cal-day" ${cls}>${d}</div>`;
    }
    html += `</div>`;
    openModal(html);
  }

  // 3) NOTES (localStorage)
  function saveNote(text) {
    const notes = getNotes();
    notes.push({ id: Date.now(), text: String(text), created: new Date().toISOString() });
    localStorage.setItem('rk_notes', JSON.stringify(notes));
    updateNotesCount();
  }
  function getNotes() { try { return JSON.parse(localStorage.getItem('rk_notes')||'[]'); } catch { return []; } }
  function updateNotesCount() { const n = getNotes().length; notesCount && (notesCount.textContent = 'Notes: ' + n); }
  function showNotesModal() {
    const notes = getNotes();
    let html = '<h2>Your Notes</h2>';
    if (!notes.length) html += '<div>No notes saved yet.</div>';
    else {
      html += '<ul style="margin-top:8px">';
      notes.forEach((nt, idx) => {
        html += `<li style="margin-bottom:8px"><strong>#${idx+1}</strong> ${escapeHtml(nt.text)} <div style="font-size:12px;color:#9fb7c7">saved: ${new Date(nt.created).toLocaleString()}</div></li>`;
      });
      html += '</ul>';
    }
    html += `<div style="margin-top:12px"><button onclick="closeModal();">Close</button> <button onclick="downloadNotesFile();">Download Notes</button></div>`;
    openModal(html);
  }
  function deleteNote(spec) {
    const notes = getNotes();
    if (/^\d+$/.test(spec.trim())) {
      const idx = parseInt(spec.trim(),10)-1;
      if (idx<0 || idx>=notes.length) { addBotMsg('Invalid note number'); return; }
      notes.splice(idx,1); localStorage.setItem('rk_notes', JSON.stringify(notes)); updateNotesCount(); addBotMsg('Note deleted'); return;
    }
    const newNotes = notes.filter(n => n.text.toLowerCase() !== spec.toLowerCase());
    if (newNotes.length === notes.length) { addBotMsg('No matching note found'); return; }
    localStorage.setItem('rk_notes', JSON.stringify(newNotes)); updateNotesCount(); addBotMsg('Note deleted (matching text)');
  }
  function downloadNotesFile() {
    const notes = getNotes();
    if (!notes.length) { addBotMsg('No notes to download'); return; }
    const txt = notes.map((n,i)=>`#${i+1} [${new Date(n.created).toLocaleString()}]\n${n.text}\n\n`).join('');
    const blob = new Blob([txt], {type:'text/plain'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rohit_notes.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    addBotMsg('Notes downloaded ✔');
  }

  // 4) Modal helpers
  function openModal(innerHtml) { if (!modal || !modalContent) return; modalContent.innerHTML = innerHtml; modal.style.display = 'flex'; modal.setAttribute('aria-hidden','false'); }
  window.closeModal = () => { if (!modal || !modalContent) return; modal.style.display='none'; modal.setAttribute('aria-hidden','true'); modalContent.innerHTML=''; };

  // 5) URL validator
  function isValidUrl(s) { try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } }

  // 6) Conversational fallback
  function conversationalReply(raw) {
    const t = showTyping();
    setTimeout(()=> {
      t && t.remove();
      const q = normalize(raw);
      if (q.includes('how to open pdf') || q.includes('open pdf')) { addBotMsg("Use: open pdf <filename> or open link <https://...>. If PDF uploaded in site folder, use exact filename."); return; }
      if (q.includes('timer') || q.includes('pomodoro')) { addBotMsg("Use Study Timer page or ask 'start timer 25' (feature on timer page)."); return; }
      if (q.includes('contact') || q.includes('support')) { addBotMsg("Contact via email: masumboy141@gmail.com"); return; }
      if (q.includes('hello')||q.includes('hi')) { addBotMsg('Hello! How can I help with notes, PDFs, calendar or calculations?'); return; }
      if (q.includes('thanks')||q.includes('thank')) { addBotMsg('You’re welcome!'); return; }
      addBotMsg("I can open PDFs, show calendar, calculate expressions (sin/cos/tan/log/sqrt/^), save notes, and open links. Examples: 'open pdf ch1.pdf', 'calendar', 'calculate sin(90)', 'create note: Revise optics'.");
    }, 600);
  }

  // 7) Utilities
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]); }

  // ---- SAFE MATH PARSER / EVALUATOR (functions + degrees for trig) ----
  // Supported functions: sin, cos, tan, asin, acos, atan, log (base10), ln (natural), sqrt
  // Operators: + - * / % ^ (power)
  // Unary minus supported.

  const MATH_FNS = {
    'sin': (x)=> Math.sin(x * Math.PI / 180),
    'cos': (x)=> Math.cos(x * Math.PI / 180),
    'tan': (x)=> Math.tan(x * Math.PI / 180),
    'asin': (x)=> (Math.asin(x) * 180 / Math.PI),
    'acos': (x)=> (Math.acos(x) * 180 / Math.PI),
    'atan': (x)=> (Math.atan(x) * 180 / Math.PI),
    'sqrt': (x)=> Math.sqrt(x),
    'ln': (x)=> Math.log(x),
    'log': (x)=> Math.log10 ? Math.log10(x) : Math.log(x)/Math.LN10
  };

  const OPERATORS = {
    '+': {prec:1,assoc:'L',fn:(a,b)=>a+b},
    '-': {prec:1,assoc:'L',fn:(a,b)=>a-b},
    '*': {prec:2,assoc:'L',fn:(a,b)=>a*b},
    '/': {prec:2,assoc:'L',fn:(a,b)=>a/b},
    '%': {prec:2,assoc:'L',fn:(a,b)=>a%b},
    '^': {prec:3,assoc:'R',fn:(a,b)=>Math.pow(a,b)}
  };

  function trySolveMath(rawExpr) {
    try {
      const s = preprocessMath(rawExpr);
      const tokens = tokenize(s);
      const rpn = toRPN(tokens);
      const val = evalRPN(rpn);
      if (Number.isFinite(val)) return { ok:true, value: formatNumber(val) };
      return { ok:false, error: 'Non-finite result' };
    } catch (e) { return { ok:false, error: e.message || 'Invalid expression' }; }
  }

  function formatNumber(v) {
    // show integer as integer, else 6 decimal places trimmed
    if (Math.abs(v - Math.round(v)) < 1e-12) return Math.round(v).toString();
    return parseFloat(v.toFixed(8)).toString();
  }

  // allow functions names and replace common unicode operators
  function preprocessMath(s) {
    if (typeof s !== 'string') throw new Error('Not a string');
    s = s.replace(/×/g,'*').replace(/÷/g,'/').replace(/√/g,'sqrt').replace(/—/g,'-').replace(/–/g,'-');
    // ensure function names are lower-case and remove trailing words
    return s.trim();
  }

  function tokenize(s) {
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      // whitespace
      if (/\s/.test(ch)) { i++; continue; }
      // number (including decimal)
      if (/[0-9.]/.test(ch)) {
        let num = ch; i++;
        while (i < s.length && /[0-9.]/.test(s[i])) { num += s[i++]; }
        if (num.split('.').length > 2) throw new Error('Invalid number');
        tokens.push({type:'number', value: parseFloat(num) });
        continue;
      }
      // letter => function name or constant
      if (/[a-zA-Z]/.test(ch)) {
        let name = ch; i++;
        while (i < s.length && /[a-zA-Z0-9]/.test(s[i])) { name += s[i++]; }
        name = name.toLowerCase();
        if (name === 'pi') tokens.push({type:'number', value: Math.PI});
        else if (name === 'e') tokens.push({type:'number', value: Math.E});
        else tokens.push({type:'fn', value: name});
        continue;
      }
      // operators & parentheses & commas
      if (ch === ',' ) { tokens.push({type:'comma'}); i++; continue; }
      if (ch === '(' || ch === ')') { tokens.push({type: ch}); i++; continue; }
      if (['+','-','*','/','%','^'].includes(ch)) {
        // handle unary minus: if at start or after '(' or another operator
        if (ch === '-' ) {
          const prev = tokens.length ? tokens[tokens.length-1] : null;
          if (!prev || (prev.type === 'operator' || prev === '(' || prev.type === '(' || prev.type === 'comma')) {
            // unary minus token
            tokens.push({type:'operator', value:'u-'});
            i++; continue;
          }
        }
        tokens.push({type:'operator', value: ch});
        i++; continue;
      }
      throw new Error('Invalid char: ' + ch);
    }
    return tokens;
  }

  function toRPN(tokens) {
    const out = [];
    const stack = [];
    for (let t of tokens) {
      if (t.type === 'number') out.push(t);
      else if (t.type === 'fn') {
        stack.push(t);
      } else if (t.type === 'operator') {
        if (t.value === 'u-') {
          // represent unary minus as function 'neg'
          stack.push({type:'fn', value:'neg'});
          continue;
        }
        while (stack.length) {
          const top = stack[stack.length-1];
          if (top.type === 'operator') {
            const o2 = top.value;
            const o1 = t.value;
            if ( (OPERATORS[o2] && OPERATORS[o1] && ((OPERATORS[o1].assoc === 'L' && OPERATORS[o1].prec <= OPERATORS[o2].prec) || (OPERATORS[o1].assoc === 'R' && OPERATORS[o1].prec < OPERATORS[o2].prec))) ) {
              out.push(stack.pop());
              continue;
            }
          }
          if (top.type === 'fn' || (top.type === 'operator' && top.value === 'u-')) {
            // functions have higher precedence: break? we'll handle below
          }
          break;
        }
        stack.push(t);
      } else if (t === '(' || t.type === '(') {
        stack.push({type:'paren', value:'('});
      } else if (t === ')' || t.type === ')') {
        // pop until '('
        while (stack.length && stack[stack.length-1].type !== 'paren') out.push(stack.pop());
        if (!stack.length) throw new Error('Mismatched parentheses');
        stack.pop(); // remove '('
        // if function on top, pop it to output
        if (stack.length && stack[stack.length-1].type === 'fn') out.push(stack.pop());
      } else if (t.type === 'comma') {
        // pop until '('
        while (stack.length && stack[stack.length-1].type !== 'paren') out.push(stack.pop());
        if (!stack.length) throw new Error('Misplaced comma');
      } else {
        // unknown token type
        throw new Error('Unknown token in toRPN: ' + JSON.stringify(t));
      }
    }
    while (stack.length) {
      const x = stack.pop();
      if (x.type === 'paren') throw new Error('Mismatched parentheses');
      out.push(x);
    }
    return out;
  }

  function evalRPN(rpn) {
    const st = [];
    for (let tok of rpn) {
      if (tok.type === 'number') { st.push(tok.value); continue; }
      if (tok.type === 'operator') {
        const op = tok.value;
        if (!OPERATORS[op]) throw new Error('Unknown operator ' + op);
        const b = st.pop(); const a = st.pop();
        if (a === undefined || b === undefined) throw new Error('Invalid expression');
        st.push(OPERATORS[op].fn(a,b));
        continue;
      }
      if (tok.type === 'fn') {
        const name = tok.value;
        if (name === 'neg') {
          const v = st.pop();
          if (v === undefined) throw new Error('Invalid unary');
          st.push(-v);
          continue;
        }
        const fn = MATH_FNS[name];
        if (!fn) throw new Error('Unknown function ' + name);
        // arity 1
        const v = st.pop();
        if (v === undefined) throw new Error('Function ' + name + ' missing arg');
        st.push(fn(v));
        continue;
      }
      // If token is plain operator object popped from earlier stack (legacy)
      if (tok.value && OPERATORS[tok.value]) {
        const op = tok.value;
        const b = st.pop(); const a = st.pop();
        st.push(OPERATORS[op].fn(a,b));
        continue;
      }
      throw new Error('Unhandled RPN token: ' + JSON.stringify(tok));
    }
    if (st.length !== 1) throw new Error('Invalid expression after eval');
    return st[0];
  }

  // ---- Wrapper to accept direct math expressions or text containing expr ----
  function sanitizeMathInput(s) {
    if (!s || typeof s !== 'string') return null;
    // remove "calculate" or leading words
    s = s.replace(/^(calculate|calc)\s*/i,'').trim();
    return s;
  }

  // try solve and return {ok, value, error}
  function trySolveMath(exprRaw) {
    const expr = sanitizeMathInput(exprRaw);
    if (!expr) return { ok:false, error:'Empty expression' };
    try {
      const pre = preprocessMath(expr);
      const tokens = tokenize(pre);
      const rpn = toRPN(tokens);
      const val = evalRPN(rpn);
      if (!Number.isFinite(val)) return { ok:false, error:'Result not finite' };
      return { ok:true, value: formatNumber(val) };
    } catch (e) {
      return { ok:false, error: e.message || 'Parse error' };
    }
  }

  // --- formatNumber helper re-used ---
  function formatNumber(v) {
    if (Math.abs(v - Math.round(v)) < 1e-12) return Math.round(v).toString();
    return parseFloat(v.toFixed(8)).toString();
  }

  // ---- END MATH PARSER ----

  // ------------------------------------------------
  // Now expose simple button-binding so UI works
  // ------------------------------------------------
  // (Bind send button already added above)
  // Also allow quick test on load
  // ------------------------------------------------

  // optional: quick examples appended to chat for first-time users
  (function showQuickTips(){
    // show nothing if already have messages
    if (!chatWindow) return;
    // don't spam if messages already present
    if (chatWindow.children.length > 2) return;
    const tips = [
      "Try: calculate sin(90)",
      "Try: calculate cos(60)",
      "Try: calculate 2^8",
      "Try: open pdf 11-phy-ch1.pdf",
      "Try: create note: revise optics"
    ];
    addBotMsg('Quick examples: ' + tips.join(' • '));
  })();

  // make send available as global for quick testing
  window.askChatSend = onSend;

  // expose trySolveMath globally for debug
  window.trySolveMath = trySolveMath;

})();
