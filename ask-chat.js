// ==========================================
// ask-chat.js — PART 1: CORE ROUTER & UI
// ==========================================
(function () {
  // ---- PREVENT DOUBLE INITIALIZATION ----
  if (window.__askChatInitialized) return;
  window.__askChatInitialized = true;

  // ---- DOM ELEMENTS ----
  const chatWindow = document.getElementById('chatWindow');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modalContent');
  const notesCount = document.getElementById('notesCount');

  if (!chatWindow || !input || !sendBtn) {
    console.warn('ask-chat.js: Required DOM elements missing.');
  }

  // ---- INITIALIZATION ----
  updateNotesCount();
  addBotMsg("Hi 👋 — I'm your AI study assistant! Ask me any study question or use commands like 'open pdf 9 chemistry ch3', 'formula class 10', 'calendar', 'create note: task'.");

  sendBtn && sendBtn.addEventListener('click', onSend);
  input && input.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSend(); });

  window.runCommand = (text) => { if (!input) return; input.value = text; onSend(); };

  // ---- UI HELPERS ----
  function addUserMsg(text) {
    if (!chatWindow) return;
    const d = document.createElement('div'); 
    d.className = 'msg user'; 
    d.textContent = text;
    chatWindow.appendChild(d); 
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function addBotMsg(htmlContent) {
    if (!chatWindow) return;
    const d = document.createElement('div'); 
    d.className = 'msg bot'; 
    d.innerHTML = htmlContent;
    chatWindow.appendChild(d); 
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function showTyping() {
    if (!chatWindow) return null;
    const el = document.createElement('div'); 
    el.className = 'msg bot typing';
    el.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    chatWindow.appendChild(el); 
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return el;
  }

  // ---- MAIN SEND HANDLER ----
  function onSend() {
    if (!input) return;
    const raw = input.value.trim();
    if (!raw) return;
    addUserMsg(raw);
    input.value = '';
    handleCommand(raw);
  }

  function normalize(s) { return String(s || '').trim().toLowerCase(); }

  // ---- SMART COMMAND DISPATCHER ----
  async function handleCommand(raw) {
    const cmd = normalize(raw);

    // 1. DOUBT SOLVER REDIRECT
    if (cmd.includes('doubt') || cmd.includes('solve') || cmd.includes('samajh') || cmd.includes('question')) {
      addBotMsg(`
        <div style="border: 1px solid #8b5cf6; padding: 10px; border-radius: 8px; background: #1e1b4b; margin-top: 5px;">
          <div style="font-size: 13px; font-weight: bold; color: #a78bfa; margin-bottom: 4px;">
            ❓ Doubt Ya Question Hai?
          </div>
          <div style="font-size: 12px; color: #e0e7ff; margin-bottom: 8px;">
            Doubt solve karne ke liye hamare panel par jayein:
          </div>
          <a href="solver.html" style="display: inline-block; background: #7c3aed; color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 5px; font-weight: bold; font-size: 12px;">
            🔍 Open Doubt Solver Panel
          </a>
        </div>
      `);
      return;
    }

    // 2. OPEN PDF COMMAND MATCHING
    if (/^open\s+pdf/i.test(raw) || cmd.startsWith('open pdf') || cmd.startsWith('pdf ')) {
      let arg = raw
        .replace(/^open\s*pdf\s*/i, '')
        .replace(/^pdf\s*/i, '')
        .replace(/\s*pdf$/i, '')
        .replace(/^open\s*/i, '')
        .trim();
      
      doOpenPDF(arg);
      return;
    }

    // 3. FORMULA / SUTRA SEARCH
    if (cmd.includes('formula') || cmd.includes('formulas') || cmd.includes('sutra')) {
      await fetchAndSuggestFormulas(raw);
      return;
    }

    // 4. NOTES & PREMIUM NOTES SEARCH
    if (cmd.includes('notes') || cmd.includes('note pdf') || cmd.includes('premium')) {
      addBotMsg(`
        <div style="border: 1px solid #00d2ff; padding: 10px; border-radius: 8px; background: rgba(0,210,255,0.05); margin-top: 5px;">
          <div style="font-size: 13px; font-weight: bold; color: #00d2ff; margin-bottom: 4px;">
            📚 Premium Notes Hub
          </div>
          <div style="font-size: 12px; color: #e0e7ff; margin-bottom: 8px;">
            Sabhi chapters aur notes ke liye hamare Premium Notes par jayein:
          </div>
          <a href="premium-notes.html" style="display: inline-block; background: linear-gradient(135deg, #00d2ff, #0072ff); color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 5px; font-weight: bold; font-size: 12px;">
            🚀 Open Premium Notes
          </a>
        </div>
      `);
      return;
    }

    // 5. GENERAL CLASS & SUBJECT SEARCH
    const isGeneralClassQuery = /\b(9|10|11|12)\b/.test(cmd) && 
                                (cmd.includes('phy') || cmd.includes('physics') || 
                                 cmd.includes('math') || cmd.includes('maths') || 
                                 cmd.includes('chem') || cmd.includes('chemistry') || 
                                 cmd.includes('bio') || cmd.includes('biology') ||
                                 cmd.includes('hindi') || cmd.includes('english') ||
                                 cmd.includes('sst') || cmd.includes('history') ||
                                 cmd.includes('civics') || cmd.includes('geography') ||
                                 cmd.includes('economics') || cmd.includes('sanskrit') ||
                                 cmd.includes('account') || cmd.includes('computer') || cmd.includes('comp'));

    if (isGeneralClassQuery && !cmd.startsWith('open link') && !cmd.startsWith('create note')) {
      showGeneralSuggestionMenu(raw);
      return;
    }

    // 6. OPEN LINK / URL
    if (cmd.startsWith('open link') || /^open\s+https?:\/\//i.test(raw)) {
      const url = raw.replace(/^open(link)?\s*/i, '').trim();
      if (isValidUrl(url)) {
        addBotMsg('Opening link...');
        window.open(url, '_blank');
      } else {
        addBotMsg('Invalid URL. Use: open link https://example.com');
      }
      return;
    }

    // 7. CALENDAR
    if (cmd === 'calendar' || cmd.includes('calendar')) {
      showCalendarModal();
      addBotMsg(`
        <div style="border: 1px solid rgba(255,255,255,0.12); padding: 8px 10px; border-radius: 8px; background: #1e293b;">
          <div style="font-size: 12px; color: #38bdf8; margin-bottom: 6px;">📅 Calendar Modal Opened Successfully!</div>
          <a href="calendar.html" style="background: #0284c7; color: #fff; text-decoration: none; padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;">
            🌐 Open Full Calendar Page (calendar.html)
          </a>
        </div>
      `);
      return;
    }

    // 8. NOTES MANAGEMENT
    if (cmd === 'show notes' || cmd === 'view notes') { showNotesModal(); return; }
    if (cmd === 'download notes' || cmd === 'export notes') { downloadNotesFile(); return; }

    if (cmd.startsWith('create note:') || cmd.startsWith('create note')) {
      const note = raw.split(/create note:?\s*/i)[1] || '';
      if (!note) { addBotMsg('Example: create note: Revise Optics'); return; }
      saveNote(note); addBotMsg('Note saved ✔'); return;
    }

    // DEFAULT: AI AGENT WITH WEBSITE & PDF KNOWLEDGE
    await askGroqAI(raw);
  }
// ==========================================
// ask-chat.js — PART 2: PDF, MENU & SUPABASE FORMULAS
// ==========================================

  // ---- HELPER: ULTRA-COMPACT GENERAL MENU ----
  function showGeneralSuggestionMenu(rawQuery) {
    const clean = rawQuery.toLowerCase();
    
    const classMatch = clean.match(/(?:class\s*|c\s*|\b)(9|10|11|12)\b/i);
    const cls = classMatch ? classMatch[1] : '10';

    let subKey = 'maths';
    let subDisplay = 'Maths';

    if (clean.includes('phy')) { subKey = 'physics'; subDisplay = 'Physics'; }
    else if (clean.includes('chem')) { subKey = 'chemistry'; subDisplay = 'Chemistry'; }
    else if (clean.includes('bio')) { subKey = 'biology'; subDisplay = 'Biology'; }
    else if (clean.includes('math')) { subKey = 'maths'; subDisplay = 'Maths'; }
    else if (clean.includes('hindi')) { subKey = 'hindi'; subDisplay = 'Hindi'; }
    else if (clean.includes('eng')) { subKey = 'english'; subDisplay = 'English'; }
    else if (clean.includes('hist')) { subKey = 'history'; subDisplay = 'History'; }
    else if (clean.includes('civic')) { subKey = 'civics'; subDisplay = 'Civics'; }
    else if (clean.includes('geo')) { subKey = 'geography'; subDisplay = 'Geography'; }
    else if (clean.includes('eco')) { subKey = 'economics'; subDisplay = 'Economics'; }
    else if (clean.includes('sansk')) { subKey = 'sanskrit'; subDisplay = 'Sanskrit'; }
    else if (clean.includes('account')) { subKey = 'accountancy'; subDisplay = 'Accountancy'; }
    else if (clean.includes('computer') || clean.includes('comp')) { subKey = 'computer'; subDisplay = 'Computer'; }

    const chapMatch = clean.match(/(?:chapter\s*|chap\s*|ch\s*|c\s*)(\d+)/i);
    const chNum = chapMatch ? chapMatch[1] : null;
    
    const subjectPageUrl = `subjects-${cls}.html`;
    const premiumNotesUrl = `premium-notes.html`;

    let html = `
      <div style="border: 1px solid rgba(255,255,255,0.12); padding: 8px 10px; border-radius: 8px; background: #1e293b; max-width: 100%;">
        <div style="font-size: 12px; font-weight: 600; color: #38bdf8; margin-bottom: 6px;">
          🤔 Class ${cls} ${subDisplay} ${chNum ? '(Ch ' + chNum + ')' : ''}
        </div>

        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
          <button onclick="runCommand('formula ${rawQuery}')" style="background: #d97706; color: #fff; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">
            📐 Formulas
          </button>

          <button onclick="runCommand('open pdf ${cls} ${subKey} ch${chNum || 1}')" style="background: #0284c7; color: #fff; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">
            📖 PDF
          </button>

          <a href="${subjectPageUrl}" style="background: #059669; color: #fff; text-decoration: none; padding: 5px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;">
            🌐 Subjects
          </a>

          <a href="${premiumNotesUrl}" style="background: #7c3aed; color: #fff; text-decoration: none; padding: 5px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;">
            ⭐ Premium Notes
          </a>
        </div>
      </div>
    `;

    addBotMsg(html);
  }

  // ---- SMART OPEN PDF HANDLER ----
  function doOpenPDF(arg) {
    if (!arg) { 
      addBotMsg('Kripya PDF ka naam ya details likhein, jaise: <b>open pdf 9 chemistry ch3</b>'); 
      return; 
    }

    if (isValidUrl(arg)) {
      window.open(arg, '_blank');
      return;
    }

    let clean = arg.replace(/\.pdf$/i, '').trim().toLowerCase();

    clean = clean
      .replace(/class\s*/g, '')          
      .replace(/chapter\s*/g, 'ch')       
      .replace(/chap\s*/g, 'ch')          
      .replace(/[\s\-\.]+/g, '_')         
      .replace(/_+/g, '_');               

    const finalFileName = `${clean}.pdf`;
    const fullPath = `notes/${finalFileName}`;
    const viewer = 'notes-viewer.html?path=' + encodeURIComponent(fullPath) + '&name=' + encodeURIComponent(finalFileName);

    addBotMsg(`Opening PDF: <b>${finalFileName}</b>...`);
    window.location.href = viewer;
  }

  // ---- SUPABASE FORMULA FETCH & SMART FILTER HANDLER ----
  async function fetchAndSuggestFormulas(queryText) {
    if (!window.supabaseClient) {
      addBotMsg('❌ Database client missing. Kripya Supabase connection check karein.');
      return;
    }

    const typing = showTyping();
    const cleanQuery = queryText.toLowerCase();

    const classMatch = cleanQuery.match(/(?:class\s*|c\s*|\b)(9|10|11|12)\b/i);
    const targetClass = classMatch ? classMatch[1] : null;

    let targetSubject = null;
    if (cleanQuery.includes('phy') || cleanQuery.includes('physics')) targetSubject = 'physics';
    else if (cleanQuery.includes('chem') || cleanQuery.includes('chemistry')) targetSubject = 'chemistry';
    else if (cleanQuery.includes('math') || cleanQuery.includes('maths') || cleanQuery.includes('mat')) targetSubject = 'maths';
    else if (cleanQuery.includes('bio') || cleanQuery.includes('biology')) targetSubject = 'biology';
    else if (cleanQuery.includes('account')) targetSubject = 'accountancy';
    else if (cleanQuery.includes('computer') || cleanQuery.includes('comp')) targetSubject = 'computer';

    const chapMatch = cleanQuery.match(/(?:chapter\s*|chap\s*|ch\s*|c\s*)(\d+)/i);
    const targetChapter = chapMatch ? chapMatch[1] : null;

    let query = window.supabaseClient
      .from('formulas')
      .select('*')
      .eq('publish', true)
      .order('created_at', { ascending: false });

    if (targetClass) query = query.eq('class', targetClass);
    if (targetSubject) query = query.ilike('subject', `%${targetSubject}%`);
    if (targetChapter) query = query.or(`chapter.ilike.%ch${targetChapter}%,chapter.ilike.%${targetChapter}%`);

    const { data: formulaData, error } = await query;
    typing && typing.remove();

    if (error) {
      console.error(error);
      addBotMsg('❌ Data load karne me error aaya.');
      return;
    }

    let html = '';

    if (formulaData && formulaData.length > 0) {
      html += `<b>📐 Direct Formulas Found (${formulaData.length}):</b><br><br>`;
      formulaData.forEach(f => {
        html += `<div style="border: 1px solid #374151; padding: 10px; margin-bottom: 8px; border-radius: 8px; background: #1f2937;">`;
        html += `<div style="font-size:11px; color:#9ca3af; margin-bottom:6px; text-transform:uppercase;"><b>CLASS ${f.class} • ${f.subject || ''} • ${f.chapter || ''}</b></div>`;

        if (f.type === 'text') {
          html += `<div style="color: #60a5fa; font-size: 15px; font-weight: 600; background: #111827; padding: 6px; border-radius: 4px;">📝 ${f.formula_text}</div>`;
        } else if (f.type === 'image') {
          const fileName = f.file_path ? f.file_path.split('/').pop() : 'Formula Image';
          const viewerUrl = `image-viewer.html?path=${encodeURIComponent(f.file_path)}&name=${encodeURIComponent(fileName)}`;
          html += `<a href="${viewerUrl}" style="display:inline-block; padding: 6px 12px; background: #d97706; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 13px;">🖼️ View Image Formula</a>`;
        } else if (f.type === 'pdf') {
          const fileName = f.file_path ? f.file_path.split('/').pop() : 'Formula PDF';
          const viewerUrl = `notes-viewer.html?path=${encodeURIComponent(f.file_path)}&name=${encodeURIComponent(fileName)}`;
          html += `<a href="${viewerUrl}" style="display:inline-block; padding: 6px 12px; background: #059669; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 13px;">📄 Open PDF Formula</a>`;
        }
        html += `</div>`;
      });
    } else {
      let details = [];
      if (targetClass) details.push(`Class ${targetClass}`);
      if (targetSubject) details.push(targetSubject.toUpperCase());
      if (targetChapter) details.push(`Chapter ${targetChapter}`);
      const searchContext = details.length ? details.join(' • ') : 'ise';

      html += `
        <div style="border: 1px dashed #06b6d4; padding: 12px; border-radius: 10px; background: rgba(6, 182, 212, 0.05); text-align: center;">
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">✨ Formula Abhi Upload Nahi Hua Hai ✨</div>
          <div style="color: #cbd5e1; font-size: 12px; line-height: 1.4;">
            Aapne <b>${searchContext}</b> ke liye search kiya, par abhi iska formula database me add nahi hua hai. 🌸
          </div>
        </div>
      `;
    }

    addBotMsg(html);
  }
// ==========================================
// ask-chat.js — PART 3: AI INTEGRATION, UTILS & NOTES
// ==========================================

  // ---- CLEAN SYSTEM KNOWLEDGE (Dead Chapters Removed) ----
  const systemKnowledge = `
You are an AI study assistant for Rohit's learning platform (roitx.github.io). Answer in simple Hindi/Hinglish. When asked for pages or links, generate HTML standard <a> tags using the relative paths below.

--- WORKING HTML PAGES DIRECTORY ---

1. Core & Main Pages:
- <a href="index.html">Home</a>
- <a href="classes.html">Classes Selection</a>
- <a href="login.html">Login</a>
- <a href="admin-panel.html">Admin Panel</a>
- <a href="premium-notes.html">Premium Notes</a>

2. Main Class & Subject/Stream Selection Pages:
- <a href="subjects-9.html">Class 9 Subjects</a>
- <a href="subjects-10.html">Class 10 Subjects</a>
- <a href="subjects-11.html">Class 11 Streams</a>
- <a href="subjects-12.html">Class 12 Streams</a>
- <a href="11-arts-subjects.html">11 Arts</a>
- <a href="11-commerce-subjects.html">11 Commerce</a>
- <a href="11-science-subjects.html">11 Science</a>
- <a href="12-arts-subjects.html">12 Arts</a>
- <a href="12-commerce-subjects.html">12 Commerce</a>
- <a href="12-science-subjects.html">12 Science</a>

3. Study Tools & Utilities:
- <a href="formulas.html">Formulas Page</a>
- <a href="calculator.html">Calculator</a>
- <a href="calendar.html">Calendar</a>
- <a href="study-timer.html">Study Timer</a>
- <a href="tests.html">Tests Page</a>
- <a href="refbook.html">Reference Books</a>
- <a href="solver.html">Doubt Solver</a>
- <a href="fun.html">Fun & Games</a>
`;

  // ---- GROQ AI INTEGRATION ----
  async function askGroqAI(userQuery) {
    const typing = showTyping();

    const SUPABASE_FUNCTION_URL = "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YXN0d2Vobm5xaWNyaWtuZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTk5NTEsImV4cCI6MjA4MDgzNTk1MX0.5_UvwaG0X8k_Emj-cMC0KjEqlvU6hgAt5IsHJdgARvk"; 

    const fullPrompt = `${systemKnowledge}\n\nUser Question: ${userQuery}`;

    try {
      const response = await fetch(SUPABASE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ prompt: fullPrompt })
      });

      const data = await response.json();
      typing && typing.remove();

      if (response.ok && data.choices && data.choices[0]?.message?.content) {
        addBotMsg(data.choices[0].message.content);
      } else {
        addBotMsg("Kucch error aaya, kripya dobara try karein.");
      }
    } catch (err) {
      typing && typing.remove();
      addBotMsg("Network Error: Internet connection check karein.");
    }
  }

  // ---- UTILITY FUNCTIONS ----
  function isValidUrl(s) {
    try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
  }

  // ---- CALENDAR MODAL ----
  function showCalendarModal() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = `<h2>Calendar — ${today.toLocaleString(undefined, { month: 'long' })} ${year}</h2>`;
    html += `<div>Today: ${today.toDateString()}</div>`;
    html += `<div style="margin-top:10px; display:grid; grid-template-columns:repeat(7,1fr); gap:5px; text-align:center;">`;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let d of dayNames) html += `<div style="font-weight:700">${d}</div>`;
    for (let i = 0; i < startDay; i++) html += `<div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const style = (d === today.getDate()) ? 'background:#06b6d4; color:#fff; font-weight:700; border-radius:4px;' : 'padding:4px;';
      html += `<div style="${style}">${d}</div>`;
    }
    html += `</div>`;
    openModal(html);
  }

  // ---- NOTES MANAGEMENT ----
  function saveNote(text) {
    const notes = getNotes();
    notes.push({ id: Date.now(), text: String(text), created: new Date().toISOString() });
    localStorage.setItem('rk_notes', JSON.stringify(notes));
    updateNotesCount();
  }

  function getNotes() {
    try { return JSON.parse(localStorage.getItem('rk_notes') || '[]'); } catch { return []; }
  }

  function updateNotesCount() {
    const n = getNotes().length;
    if (notesCount) notesCount.textContent = 'Notes: ' + n;
  }

  function showNotesModal() {
    const notes = getNotes();
    let html = '<h2>Your Notes</h2>';
    if (!notes.length) html += '<div>No notes saved yet.</div>';
    else {
      html += '<ul style="margin-top:8px">';
      notes.forEach((nt, idx) => {
        html += `<li style="margin-bottom:8px"><strong>#${idx + 1}</strong> ${escapeHtml(nt.text)}</li>`;
      });
      html += '</ul>';
    }
    html += `<div style="margin-top:12px"><button onclick="closeModal();">Close</button> <button onclick="downloadNotesFile();">Download</button></div>`;
    openModal(html);
  }

  function downloadNotesFile() {
    const notes = getNotes();
    if (!notes.length) { addBotMsg('No notes to download'); return; }
    const txt = notes.map((n, i) => `#${i + 1} [${new Date(n.created).toLocaleString()}]\n${n.text}\n\n`).join('');
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rohit_notes.txt';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    addBotMsg('Notes downloaded ✔');
  }

  function openModal(innerHtml) {
    if (!modal || !modalContent) return;
    modalContent.innerHTML = innerHtml;
    modal.style.display = 'flex';
  }

  window.closeModal = () => {
    if (!modal || !modalContent) return;
    modal.style.display = 'none';
    modalContent.innerHTML = '';
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
  }

  window.askChatSend = onSend;
})();
