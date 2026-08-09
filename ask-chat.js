// ask-chat.js — Smart Study Assistant with Groq AI & Flexible PDF Commands
(function () {
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
  addBotMsg("Hi Rohit 👋 — I'm your AI study assistant! Ask me any study question or use commands like 'open pdf 9 chemistry ch3', 'calendar', 'create note: task'.");

  sendBtn && sendBtn.addEventListener('click', onSend);
  input && input.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSend(); });

  window.runCommand = (text) => { if (!input) return; input.value = text; onSend(); };

  // ---- UI HELPERS ----
  function addUserMsg(text) {
    if (!chatWindow) return;
    const d = document.createElement('div'); d.className = 'msg user'; d.textContent = text;
    chatWindow.appendChild(d); chatWindow.scrollTop = chatWindow.scrollHeight;
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

  // ---- SMART COMMAND DISPATCHER ----
  async function handleCommand(raw) {
    const cmd = normalize(raw);

    // 1. FLEXIBLE OPEN PDF COMMAND MATCHING
    if (/^open\s+pdf/i.test(raw) || /pdf$/i.test(raw) || /^pdf\s+/i.test(raw) || cmd.includes('open pdf')) {
      let arg = raw
        .replace(/^open\s*pdf\s*/i, '')
        .replace(/^pdf\s*/i, '')
        .replace(/\s*pdf$/i, '')
        .replace(/^open\s*/i, '')
        .trim();
      
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

    // DEFAULT: AI AGENT WITH WEBSITE & PDF KNOWLEDGE
    await askGroqAI(raw);
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

    // Clean text & format into standard class_subject_chX pattern
    let clean = arg.replace(/\.pdf$/i, '').trim().toLowerCase();

    clean = clean
      .replace(/class\s*/g, '')          // 'class 9' -> '9'
      .replace(/chapter\s*/g, 'ch')       // 'chapter 3' -> 'ch3'
      .replace(/chap\s*/g, 'ch')          // 'chap 3' -> 'ch3'
      .replace(/[\s\-\.]+/g, '_')         // Spaces, dashes, dots -> '_'
      .replace(/_+/g, '_');               // Multiple '_' -> single '_'

    const finalFileName = `${clean}.pdf`;
    const fullPath = `notes/${finalFileName}`;
    const viewer = 'notes-viewer.html?path=' + encodeURIComponent(fullPath) + '&name=' + encodeURIComponent(finalFileName);

    addBotMsg(`Opening PDF: <b>${finalFileName}</b>...`);
    window.location.href = viewer;
  }

  // ---- GROQ AI INTEGRATION (SECURED VIA SUPABASE BACKEND) ----
  async function askGroqAI(userQuery) {
    const typing = showTyping();

    const SUPABASE_FUNCTION_URL = "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";

    try {
      const response = await fetch(SUPABASE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt: userQuery }) // Edge Function ke liye 'prompt' bheja ja raha hai
      });

      const data = await response.json();
      typing && typing.remove();

      if (response.ok && data.choices && data.choices[0]?.message?.content) {
        addBotMsg(data.choices[0].message.content);
      } else {
        addBotMsg("Kucch error आया, kripya dobara try karein.");
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
