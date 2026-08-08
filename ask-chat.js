// ask-chat.js — Smart Study Assistant with Gemini AI & PDF Support
(() => {
  // ---- GEMINI API CONFIGURATION ----
  // aistudio.google.com se apni free API key yahan dalein
  const GEMINI_API_KEY = "AQ.Ab8RN6IWEsmF7UDLnVpN8eXE4eu0MUnmET6zQul4V6HFRzWHvg"; 

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
  addBotMsg("Hi Rohit 👋 — I'm your AI study assistant! Ask me any study question or use commands like 'open pdf ch1.pdf', 'calendar', 'create note: task'.");

  sendBtn && sendBtn.addEventListener('click', onSend);
  input && input.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSend(); });

  window.runCommand = (text) => { if (!input) return; input.value = text; onSend(); };

  // ---- UI HELPERS ----
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

    // 3. PAGE SHORTCUTS
    if (cmd.startsWith('open ')) {
      const target = raw.replace(/^open\s*/i, '').trim();
      if (/class\s*9/.test(target)) { addBotMsg('Opening Class 9 page...'); goto('class9-subjects.html'); return; }
      if (/class\s*11/.test(target)) { addBotMsg('Opening Class 11 page...'); goto('11-streams.html'); return; }
      if (/class\s*12/.test(target)) { addBotMsg('Opening Class 12 page...'); goto('12-streams.html'); return; }
    }

    // 4. CALENDAR
    if (cmd === 'calendar' || cmd.includes('calendar')) {
      showCalendarModal();
      return;
    }

    // 5. TIME / DATE
    if (['time', 'date', 'current time'].some(k => cmd === k || cmd.includes(k))) {
      addBotMsg('Current date & time: ' + new Date().toLocaleString());
      return;
    }

    // 6. NOTES MANAGEMENT
    if (cmd === 'show notes' || cmd === 'notes' || cmd === 'view notes') { showNotesModal(); return; }
    if (cmd === 'download notes' || cmd === 'export notes') { downloadNotesFile(); return; }

    if (cmd.startsWith('create note:') || cmd.startsWith('create note')) {
      const note = raw.split(/create note:?\s*/i)[1] || '';
      if (!note) { addBotMsg('Example: create note: Revise Optics'); return; }
      saveNote(note); addBotMsg('Note saved ✔'); return;
    }

    if (cmd.startsWith('delete note')) {
      const rest = raw.split(/delete note:?\s*/i)[1];
      if (!rest) { addBotMsg('Specify note number or text to delete.'); return; }
      deleteNote(rest); return;
    }

    // DEFAULT: AI AGENT (GEMINI API)
    await askGeminiAI(raw);
  }

  // ---- OPEN PDF HANDLER ----
  function doOpenPDF(arg) {
    if (!arg) { addBotMsg('Specify PDF filename, e.g., open pdf 10_physics_ch1.pdf'); return; }
    if (isValidUrl(arg)) {
      addBotMsg('Opening PDF link...');
      window.open(arg, '_blank');
      return;
    }

    addBotMsg('Opening PDF: ' + arg);
    const fullPath = arg.includes('/') ? arg : `notes/${arg}`;
    const viewer = 'notes-viewer.html?path=' + encodeURIComponent(fullPath) + '&name=' + encodeURIComponent(arg);
    window.location.href = viewer;
  }

  // ---- GEMINI AI INTEGRATION ----
  async function askGeminiAI(userQuery) {
    const typing = showTyping();

    if (!GEMINI_API_KEY || GEMINI_API_KEY === "AQ.Ab8RN6IWEsmF7UDLnVpN8eXE4eu0MUnmET6zQul4V6HFRzWHvg") {
      typing && typing.remove();
      addBotMsg("Please configure a valid Gemini API Key in ask-chat.js to enable AI answers.");
      return;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a helpful and concise AI study assistant for a student platform. Answer in simple, clear Hindi/Hinglish.\n\nUser Question: ${userQuery}`
            }]
          }]
        })
      });

      const data = await response.json();
      typing && typing.remove();

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        addBotMsg(data.candidates[0].content.parts[0].text);
      } else {
        addBotMsg("Kucch error aaya, kripya dobara try karein.");
      }
    } catch (err) {
      typing && typing.remove();
      addBotMsg("AI Server se connect nahi ho paya. Internet connection check karein.");
    }
  }

  // ---- UTILITY FUNCTIONS ----
  function goto(path) {
    try { window.location.href = path; } catch (e) { console.warn(e); }
  }

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
    html += `<div class="calendar-grid" style="margin-top:10px; display:grid; grid-template-columns:repeat(7,1fr); gap:5px; text-align:center;">`;
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

  function deleteNote(spec) {
    const notes = getNotes();
    if (/^\d+$/.test(spec.trim())) {
      const idx = parseInt(spec.trim(), 10) - 1;
      if (idx < 0 || idx >= notes.length) { addBotMsg('Invalid note number'); return; }
      notes.splice(idx, 1);
      localStorage.setItem('rk_notes', JSON.stringify(notes));
      updateNotesCount();
      addBotMsg('Note deleted ✔');
      return;
    }
    const newNotes = notes.filter(n => n.text.toLowerCase() !== spec.toLowerCase());
    localStorage.setItem('rk_notes', JSON.stringify(newNotes));
    updateNotesCount();
    addBotMsg('Note deleted ✔');
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
