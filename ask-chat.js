// ask-chat.js — Smart Study Assistant with Groq AI & Website Knowledge
(() => {
  // ---- GROQ API CONFIGURATION ----
  const GROQ_API_KEY = "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"; // Apni Groq API Key yahan dalein

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
  addBotMsg("Hi Rohit 👋 — I'm your AI study assistant! Ask me about any class, subject, or notes, and I will give you direct links.");

  sendBtn && sendBtn.addEventListener('click', onSend);
  input && input.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSend(); });

  window.runCommand = (text) => { if (!input) return; input.value = text; onSend(); };

  // ---- UI HELPERS ----
  function addUserMsg(text) {
    if (!chatWindow) return;
    const d = document.createElement('div'); d.className = 'msg user'; d.textContent = text;
    chatWindow.appendChild(d); chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  // Updated to support HTML and Clickable links properly
  function addBotMsg(htmlContent) {
    if (!chatWindow) return;
    const d = document.createElement('div'); 
    d.className = 'msg bot'; 
    d.innerHTML = htmlContent; // innerHTML use kiya taki links clickable rahein
    chatWindow.appendChild(d); 
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function showTyping() {
    if (!chatWindow) return null;
    const el = document.createElement('div'); el.className = 'msg bot typing';
    el.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    chatWindow.appendChild(el); chatWindow.scrollTop = chatWindow.scrollHeight;
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

  // ---- COMMAND DISPATCHER ----
  async function handleCommand(raw) {
    const cmd = normalize(raw);

    // 1. OPEN PDF
    if (cmd.startsWith('open pdf') || cmd.includes('open pdf ')) {
      const arg = raw.replace(/^open\s*pdf\s*/i, '').trim();
      doOpenPDF(arg);
      return;
    }

    // 2. OPEN LINK / URL
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

    // 3. CALENDAR
    if (cmd === 'calendar' || cmd.includes('calendar')) {
      showCalendarModal();
      return;
    }

    // 4. NOTES MANAGEMENT
    if (cmd === 'show notes' || cmd === 'notes' || cmd === 'view notes') { showNotesModal(); return; }
    if (cmd === 'download notes' || cmd === 'export notes') { downloadNotesFile(); return; }

    if (cmd.startsWith('create note:') || cmd.startsWith('create note')) {
      const note = raw.split(/create note:?\s*/i)[1] || '';
      if (!note) { addBotMsg('Example: create note: Revise Optics'); return; }
      saveNote(note); addBotMsg('Note saved ✔'); return;
    }

    // DEFAULT: GROQ AI WITH FULL WEBSITE KNOWLEDGE
    await askGroqAI(raw);
  }

  // ---- OPEN PDF HANDLER (FIXED) ----
  function doOpenPDF(arg) {
    if (!arg) { addBotMsg('Specify PDF filename, e.g., open pdf 10_physics_ch1.pdf'); return; }
    if (isValidUrl(arg)) {
      window.open(arg, '_blank');
      return;
    }
    const fullPath = arg.includes('/') ? arg : `notes/${arg}`;
    const viewer = 'notes-viewer.html?path=' + encodeURIComponent(fullPath) + '&name=' + encodeURIComponent(arg);
    window.location.href = viewer;
  }

  // ---- GROQ AI INTEGRATION (WITH FULL WEBSITE KNOWLEDGE) ----
  async function askGroqAI(userQuery) {
    const typing = showTyping();

    if (!GROQ_API_KEY || GROQ_API_KEY === "gsk_your_groq_api_key_here") {
      typing && typing.remove();
      addBotMsg("Please configure a valid Groq API Key in ask-chat.js.");
      return;
    }

    const systemKnowledge = `
    You are an AI study assistant for Rohit's educational platform. Answer user questions in simple Hindi/Hinglish.
    When users ask for specific classes, subjects, notes, or tools, you MUST provide direct, clickable HTML links using the exact filenames from the website structure below.

    --- WEBSITE PAGES & LINKS DIRECTORY ---
    Class 9:
    - Subjects Home: <a href="subjects-9.html">Class 9 Subjects</a>
    - Science & SST: <a href="9-science-chapters.html">Science Chapters</a>, <a href="9-sst-chapters.html">SST Chapters</a>
    - Subjects: <a href="9-maths-chapters.html">Maths</a>, <a href="9-physics-chapters.html">Physics</a>, <a href="9-chemistry-chapters.html">Chemistry</a>, <a href="9-biology-chapters.html">Biology</a>, <a href="9-english-chapters.html">English</a>, <a href="9-hindi-chapters.html">Hindi</a>, <a href="9-history-chapters.html">History</a>, <a href="9-geography-chapters.html">Geography</a>, <a href="9-civics-chapters.html">Civics</a>, <a href="9-economics-chapters.html">Economics</a>, <a href="9-sanskrit-chapters.html">Sanskrit</a>

    Class 10:
    - Subjects Home: <a href="subjects-10.html">Class 10 Subjects</a>
    - Subjects: <a href="10-maths-chapters.html">Maths</a>, <a href="10-physics-chapters.html">Physics</a>, <a href="10-chemistry-chapters.html">Chemistry</a>, <a href="10-biology-chapters.html">Biology</a>, <a href="10-english-chapters.html">English</a>, <a href="10-hindi-chapters.html">Hindi</a>, <a href="10-history-chapters.html">History</a>, <a href="10-geography-chapters.html">Geography</a>, <a href="10-civics-chapters.html">Civics</a>, <a href="10-economics-chapters.html">Economics</a>, <a href="10-sanskrit-chapters.html">Sanskrit</a>

    Class 11:
    - Streams Home: <a href="subjects-11.html">Class 11 Streams</a> (<a href="11-science-subjects.html">Science</a>, <a href="11-commerce-subjects.html">Commerce</a>, <a href="11-arts-subjects.html">Arts</a>)
    - Subjects: <a href="11-physics-chapters.html">Physics</a>, <a href="11-chemistry-chapters.html">Chemistry</a>, <a href="11-maths-chapters.html">Maths</a>, <a href="11-biology-chapters.html">Biology</a>, <a href="11-computer-chapters.html">Computer</a>, <a href="11-accountancy-chapters.html">Accountancy</a>, <a href="11-economics-chapters.html">Economics</a>, <a href="11-history-chapters.html">History</a>, <a href="11-geography-chapters.html">Geography</a>, <a href="11-civics-chapters.html">Civics</a>, <a href="11-english-chapters.html">English</a>, <a href="11-hindi-chapters.html">Hindi</a>

    Class 12:
    - Streams Home: <a href="subjects-12.html">Class 12 Streams</a> (<a href="12-science-subjects.html">Science</a>, <a href="12-commerce-subjects.html">Commerce</a>, <a href="12-arts-subjects.html">Arts</a>)
    - Subjects: <a href="12-physics-chapters.html">Physics</a>, <a href="12-chemistry-chapters.html">Chemistry</a>, <a href="12-maths-chapters.html">Maths</a>, <a href="12-biology-chapters.html">Biology</a>, <a href="12-computer-chapters.html">Computer</a>, <a href="12-accountancy-chapters.html">Accountancy</a>, <a href="12-economics-chapters.html">Economics</a>, <a href="12-history-chapters.html">History</a>, <a href="12-geography-chapters.html">Geography</a>, <a href="12-civics-chapters.html">Civics</a>, <a href="12-english-chapters.html">English</a>, <a href="12-hindi-chapters.html">Hindi</a>

    Tools & Features:
    - Utilities: <a href="calculator.html">Calculator</a>, <a href="calendar.html">Calendar</a>, <a href="study-timer.html">Study Timer</a>, <a href="formulas.html">Formulas</a>, <a href="solver.html">Problem Solver</a>, <a href="tests.html">Tests</a>, <a href="refbook.html">Reference Books</a>

    --- RULES ---
    1. Always include working HTML anchor tags (e.g. <a href="page.html">Link Name</a>) when suggesting sections.
    2. Keep responses friendly, helpful, and concise.
    `;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY.trim()}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemKnowledge },
            { role: "user", content: userQuery }
          ],
          temperature: 0.5
        })
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
