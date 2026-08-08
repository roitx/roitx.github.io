// ask-chat.js — Smart Study Assistant with Groq AI & Flexible PDF Commands

  // ---- GROQ API CONFIGURATION ----
  
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

    // Apna Supabase Edge Function ka URL yahan dalein
    const SUPABASE_FUNCTION_URL = "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-worker";

    try {
      const response = await fetch(SUPABASE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
          // Agar Supabase anon key ki zarurat ho to authorization header yahan de sakte hain
        },
        body: JSON.stringify({ userQuery })
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
  

    const systemKnowledge = `
    You are an AI study assistant for Rohit's learning platform. Answer in simple Hindi/Hinglish.

    --- PDF NAMING CONVENTION ---
    All PDF files follow the format: {class}_{subject}_ch{number}.pdf
    Examples:
    - Class 9 Chemistry Chapter 3 -> notes/9_chemistry_ch3.pdf
    - Class 10 Physics Chapter 1 -> notes/10_physics_ch1.pdf
    - Class 11 Biology Chapter 2 -> notes/11_biology_ch2.pdf

    When users ask for any chapter PDF, generate clickable HTML links using this exact viewer URL:
    <a href="notes-viewer.html?path=notes/{class}_{subject}_ch{number}.pdf&name={class}_{subject}_ch{number}.pdf">Open PDF</a>

    --- WEBSITE PAGES DIRECTORY ---
    - Class 9: <a href="subjects-9.html">Class 9 Subjects</a>
    - Class 10: <a href="subjects-10.html">Class 10 Subjects</a>
    - Class 11: <a href="subjects-11.html">Class 11 Streams</a>
    - Class 12: <a href="subjects-12.html">Class 12 Streams</a>
    - Tools: <a href="calculator.html">Calculator</a>, <a href="calendar.html">Calendar</a>, <a href="study-timer.html">Study Timer</a>, <a href="formulas.html">Formulas</a>
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
