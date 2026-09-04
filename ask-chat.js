// =========================================================
// ask-chat.js — FULL UPDATED WITH CREATOR & PRIVACY RULES
// =========================================================
(function () {
  // ---- PREVENT DOUBLE INITIALIZATION ----
  if (window.__askChatInitialized) return;
  window.__askChatInitialized = true;

  // ---- GLOBAL STATE ----
  let selectedLanguage = 'hi'; 
  let miniCalCurDate = new Date();

  window.setAskChatLanguage = function(lang) {
    if (lang === 'hi' || lang === 'en') {
      selectedLanguage = lang;
      console.log("🌐 ask-chat.js Language Updated To:", selectedLanguage);
    }
  };

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

  // ---- FULL SVG ICONS TOOLKIT ----
  const SVG = {
    user: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    book: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    mail: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    external: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    calculator: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/></svg>`,
    pdf: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    share: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
    delete: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  };

  // ---- INITIALIZATION ----
  updateNotesCount();
  initUserGreeting();

  sendBtn && sendBtn.addEventListener('click', onSend);
  input && input.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSend(); });

  window.runCommand = (text) => { if (!input) return; input.value = text; onSend(); };

  // ---- USER WELCOME GREETING ----
  async function initUserGreeting() {
    let displayName = "Student";

    try {
      if (window.supabaseClient) {
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        if (session && session.user && !error) {
          const user = session.user;
          const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

          if (profile && profile.full_name && profile.full_name.trim() !== "") {
            displayName = profile.full_name.trim();
          } else if (user.email) {
            displayName = user.email.split('@')[0];
          }
        }
      }
    } catch (err) {
      console.warn("User session greeting error:", err);
    }

    addBotMsg(`
      <div style="background: linear-gradient(135deg, rgba(6,182,212,0.1), rgba(59,130,246,0.1)); border: 1px solid rgba(6,182,212,0.3); border-radius: 10px; padding: 12px;">
        <div style="font-weight: bold; color: #38bdf8; font-size: 14px; display: flex; align-items: center; gap: 6px;">
          ${SVG.user} Namaste, ${escapeHtml(displayName)}!
        </div>
        <div style="font-size: 12px; color: #e2e8f0; margin-top: 6px;">
          Main aapka <b>Roitx AI Assistant</b> hu. Books, PDF Notes, Formulas, Calculator, ya PDF Export tools accessibility active hain.
        </div>
      </div>
    `);
  }

  // ---- UI MESSAGING & MATH RENDERING HELPERS ----
  function addUserMsg(text) {
    if (!chatWindow) return;
    const d = document.createElement('div'); 
    d.className = 'msg user'; 
    d.textContent = text;
    chatWindow.appendChild(d); 
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  // SAFE MATHJAX RENDERER FUNCTION
  function renderMathSafely(element) {
    if (window.MathJax) {
      if (typeof window.MathJax.typesetPromise === 'function') {
        window.MathJax.typesetPromise([element]).catch((err) => console.warn("MathJax error:", err));
      } else if (typeof window.MathJax.typeset === 'function') {
        window.MathJax.typeset([element]);
      }
    }
  }

  function cleanAndFormatText(text) {
    if (!text) return "";

    // 1. Markdown Headings and Lines
    text = text.replace(/#{1,6}\s*(.*)/g, '<b>$1</b>');
    text = text.replace(/---/g, '<hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:8px 0;">');

    // 2. Bold and Italic
    text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    text = text.replace(/\*(.*?)\*/g, '<i>$1</i>');

    // 3. Convert Newlines to <br>
    text = text.replace(/\n/g, "<br>");

    return text;
  }

  function addBotMsg(htmlContent) {
    if (!chatWindow) return;
    const d = document.createElement('div'); 
    d.className = 'msg bot'; 
    d.innerHTML = htmlContent;
    chatWindow.appendChild(d); 
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Trigger MathJax Render
    renderMathSafely(d);
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

  function onSend() {
    if (!input) return;
    const raw = input.value.trim();
    if (!raw) return;
    addUserMsg(raw);
    input.value = '';
    handleCommand(raw);
  }

  function normalize(s) { return String(s || '').trim().toLowerCase(); }
  function isValidUrl(s) {
    try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
  }

  // ---- SMART COMMAND DISPATCHER ----
  async function handleCommand(raw) {
    const cmd = normalize(raw);

    // 1. CREATOR DETAILS
    if (cmd.includes('kiske dwara') || cmd.includes('kisne banaya') || cmd.includes('who made') || cmd.includes('who created') || cmd.includes('developer') || cmd.includes('creator') || cmd.includes('owner') || cmd === 'rohit' || cmd.includes('rohit kaun')) {
      addBotMsg(`
        <div style="border: 1px solid #38bdf8; padding: 10px; border-radius: 8px; background: rgba(56, 189, 248, 0.08); margin-top: 5px;">
          <div style="font-size: 13px; font-weight: bold; color: #38bdf8; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            ${SVG.user} Creator Details
          </div>
          <div style="font-size: 12px; color: #e0e7ff; line-height: 1.5; margin-bottom: 8px;">
            Is application ko <b>Rohit</b> ne banaya hai! Platform ke bare me aur janne ke liye link par click karein:
          </div>
          <a href="about.html" style="display: inline-flex; align-items: center; gap: 4px; background: #0284c7; color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 5px; font-weight: bold; font-size: 12px;">
            ${SVG.external} Visit About Page (about.html)
          </a>
        </div>
      `);
      return;
    }

    // 2. PDF EXPORT / SHARE COMMANDS
    if (cmd.includes('pdf bhej') || cmd.includes('share pdf') || cmd.includes('export pdf') || cmd.includes('wa bhej')) {
      addBotMsg(`
        <div style="border: 1px solid #10b981; padding: 12px; border-radius: 10px; background: rgba(16, 185, 129, 0.1);">
          <div style="font-size: 13px; font-weight: bold; color: #34d399; display: flex; align-items: center; gap: 6px;">
            ${SVG.pdf} Saved Notes PDF Manager
          </div>
          <div style="font-size: 12px; color: #e0e7ff; margin: 6px 0;">
            Aapke saare saved notes safe hain. Inhe PDF me download karke WhatsApp ya Message se share kar sakte hain:
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
            <button onclick="downloadNotesFileDirect()" style="display: inline-flex; align-items: center; gap: 4px; background: #059669; color: #fff; border: none; padding: 6px 10px; border-radius: 5px; font-weight: bold; font-size: 11px; cursor: pointer;">
              ${SVG.pdf} Download Notes
            </button>
            <button onclick="shareViaWhatsApp()" style="display: inline-flex; align-items: center; gap: 4px; background: #25d366; color: #fff; border: none; padding: 6px 10px; border-radius: 5px; font-weight: bold; font-size: 11px; cursor: pointer;">
              ${SVG.share} Share via WhatsApp
            </button>
          </div>
        </div>
      `);
      return;
    }

    // 3. REFERENCE BOOKS DIRECTORY
    if (cmd.includes('book') || cmd.includes('books') || cmd.includes('sinha') || cmd.includes('sharma') || cmd.includes('ncert') || cmd.includes('ref')) {
      addBotMsg(`
        <div style="border: 1px solid #06b6d4; background: #0f172a; padding: 12px; border-radius: 10px;">
          <div style="font-size: 13px; font-weight: bold; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
            ${SVG.book} Reference Books Library
          </div>
          <div style="font-size: 12px; color: #cbd5e1; margin: 8px 0;">KC Sinha, RD Sharma, NCERT and other Reference Books dekhne ke liye RefBook open karein:</div>
          <a href="refbook.html?search=${encodeURIComponent(raw)}" style="display: inline-flex; align-items: center; gap: 6px; background: #0284c7; color: #fff; text-decoration: none; padding: 7px 12px; border-radius: 6px; font-weight: bold; font-size: 12px;">
            ${SVG.external} Open RefBook Page (refbook.html)
          </a>
        </div>
      `);
      return;
    }

           // 4. CALENDAR ACTION & HOLIDAY POPUP INTEGRATION
    if (cmd.includes('calendar') || cmd.includes('date') || cmd.includes('holiday') || cmd.includes('chhutti') || cmd.includes('tyohar')) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayKey = `${yyyy}-${mm}-${dd}`;

      const processHolidayResponse = () => {
        const holidayName = window.fetchedHolidays ? window.fetchedHolidays[todayKey] : null;

        if (holidayName) {
          addBotMsg(`
            <div style="border: 1px solid #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 12px; border-radius: 10px; margin-top: 5px;">
              <div style="font-weight: bold; color: #38bdf8; font-size: 14px;">🎉 Aaj Ka Holiday!</div>
              <div style="font-size: 13px; color: #fff; margin: 6px 0;"><b>${holidayName}</b> (${todayKey})</div>
              <div style="display: flex; gap: 6px; margin-top: 8px;">
                <button onclick="showCalendarModalDirect()" style="background: #0284c7; color: #fff; border: none; padding: 6px 10px; border-radius: 5px; font-size: 11px; font-weight: bold; cursor: pointer;">
                  📅 Mini Calendar
                </button>
                <a href="calendar.html" style="background: #059669; color: #fff; text-decoration: none; padding: 6px 10px; border-radius: 5px; font-size: 11px; font-weight: bold;">
                  🌐 Full Calendar Page
                </a>
              </div>
            </div>
          `);

          if (typeof showInteractivePopup === 'function') {
            showInteractivePopup([{ type: 'holiday', text: holidayName }], todayKey);
          }
        } else {
          addBotMsg(`
            <div style="border: 1px solid rgba(255,255,255,0.12); padding: 10px; border-radius: 8px; background: #1e293b; margin-top: 5px;">
              <div style="font-size: 13px; color: #e2e8f0; margin-bottom: 8px;">📅 Aaj (${todayKey}) koi official holiday nahi hai.</div>
              <button onclick="showCalendarModalDirect()" style="background: #0284c7; color: #fff; border: none; padding: 6px 10px; border-radius: 5px; font-size: 11px; font-weight: bold; cursor: pointer;">
                Open Mini Calendar
              </button>
            </div>
          `);
        }
      };

      // Ensure holidays are fetched before responding
      if (!window.fetchedHolidays || Object.keys(window.fetchedHolidays).length === 0) {
        if (typeof window.fetchHolidays === 'function') {
          window.fetchHolidays(yyyy).then(() => processHolidayResponse()).catch(() => processHolidayResponse());
        } else {
          processHolidayResponse();
        }
      } else {
        processHolidayResponse();
      }

      return;
    }




    // 5. CALCULATOR COMMAND
    if (cmd.includes('calc') || cmd.includes('calculator')) {
      showCalculatorModalDirect();
      return;
    }

    // 6. CLASSES & STREAMS OVERVIEW
    if (cmd === 'classes' || cmd === 'class' || cmd === 'all classes' || cmd.includes('kaun si class') || cmd.includes('select class')) {
      addBotMsg(`
        <div style="border: 1px solid #38bdf8; padding: 10px; border-radius: 8px; background: #1e293b; margin-top: 5px;">
          <div style="font-size: 13px; font-weight: bold; color: #38bdf8; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            ${SVG.book} Select Your Class / Stream:
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
            <a href="subjects-9.html" style="background: #0284c7; color: #fff; text-decoration: none; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;">Class 9</a>
            <a href="subjects-10.html" style="background: #0284c7; color: #fff; text-decoration: none; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;">Class 10</a>
            <a href="subjects-11.html" style="background: #059669; color: #fff; text-decoration: none; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;">Class 11</a>
            <a href="subjects-12.html" style="background: #059669; color: #fff; text-decoration: none; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;">Class 12</a>
          </div>
          <a href="classes.html" style="display: inline-flex; align-items: center; gap: 4px; color: #38bdf8; font-size: 11px; text-decoration: underline;">
            ${SVG.external} View Full Classes Overview (classes.html)
          </a>
        </div>
      `);
      return;
    }

    // 7. DOUBT SOLVER & FEEDBACK
    if (cmd.includes('doubt') || cmd.includes('solve') || cmd.includes('samajh') || cmd.includes('question')) {
      addBotMsg(`
        <div style="border: 1px solid #8b5cf6; padding: 10px; border-radius: 8px; background: #1e1b4b; margin-top: 5px;">
          <div style="font-size: 13px; font-weight: bold; color: #a78bfa; margin-bottom: 4px;">❓ Doubt Ya Question Hai?</div>
          <a href="solver.html" style="display: inline-flex; align-items: center; gap: 6px; background: #7c3aed; color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 5px; font-weight: bold; font-size: 12px; margin-top: 4px;">
            ${SVG.external} Open Doubt Solver Panel
          </a>
        </div>
      `);
      return;
    }

    if (cmd.includes('feedback') || cmd.includes('sujhav') || cmd.includes('review') || cmd.includes('kisi ko batana')) {
      addBotMsg(`
        <div style="border: 1px solid #06b6d4; padding: 10px; border-radius: 8px; background: rgba(6,182,212,0.05); margin-top: 5px;">
          <div style="font-size: 13px; font-weight: bold; color: #06b6d4; margin-bottom: 4px;">💬 Feedback Kaise Bhejein?</div>
          <div style="font-size: 12px; color: #e0e7ff; line-height: 1.5; margin-bottom: 8px;">
            1. Profile ke <b>i (info)</b> button dwara <a href="about.html" style="color: #38bdf8;">about.html</a> par jayein.<br>
            2. Ya <a href="ask-doubt.html" style="color: #38bdf8;">ask-doubt.html</a> par direct feedback dein.
          </div>
        </div>
      `);
      return;
    }

    // 8. SUPPORT MAIL
    if (cmd.includes('mail') || cmd.includes('email') || cmd.includes('contact') || cmd.includes('legal')) {
      addBotMsg(`
        <div style="border: 1px solid #a855f7; padding: 12px; border-radius: 10px; background: rgba(168, 85, 247, 0.1);">
          <div style="font-size: 13px; font-weight: bold; color: #c084fc; display: flex; align-items: center; gap: 6px;">
            ${SVG.mail} Support Mail
          </div>
          <div style="font-size: 12px; color: #e0e7ff; margin: 6px 0;">Kisi bhi query ya help ke liye humein mail karein:</div>
          <a href="mailto:legal@roitx.qd.je" style="color: #fff; background: #9333ea; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: bold; display: inline-flex; align-items: center; gap: 6px;">
            ${SVG.mail} legal@roitx.qd.je
          </a>
        </div>
      `);
      return;
    }

    // 9. OPEN PDF FROM SUPABASE
    if (/^open\s+pdf/i.test(raw) || cmd.startsWith('open pdf') || cmd.startsWith('pdf ')) {
      let arg = raw
        .replace(/^open\s*pdf\s*/i, '')
        .replace(/^pdf\s*/i, '')
        .replace(/\s*pdf$/i, '')
        .replace(/^open\s*/i, '')
        .trim();
      await doOpenPDFFromSupabase(arg);
      return;
    }

    // 10. FORMULA SEARCH
    if (cmd.includes('formula') || cmd.includes('formulas') || cmd.includes('sutra')) {
      await fetchAndSuggestFormulas(raw);
      return;
    }

    // 11. PREMIUM NOTES HUB
    if (cmd.includes('notes') || cmd.includes('note pdf') || cmd.includes('premium')) {
      addBotMsg(`
        <div style="border: 1px solid #00d2ff; padding: 10px; border-radius: 8px; background: rgba(0,210,255,0.05); margin-top: 5px;">
          <div style="font-size: 13px; font-weight: bold; color: #00d2ff; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            ${SVG.book} Premium Notes Hub
          </div>
          <a href="premium-notes.html" style="display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #00d2ff, #0072ff); color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 5px; font-weight: bold; font-size: 12px; margin-top: 4px;">
            ${SVG.external} Open Premium Notes
          </a>
        </div>
      `);
      return;
    }

    // 12. GENERAL CLASS QUERY DETECTION
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

    // 13. OPEN LINK COMMAND
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

    // 14. NOTES MANAGEMENT
    if (cmd === 'show notes' || cmd === 'view notes') { showNotesModal(); return; }
    if (cmd === 'download notes' || cmd === 'export notes' || cmd === 'export pdf') { downloadNotesFile(); return; }

    if (cmd.startsWith('create note:') || cmd.startsWith('create note')) {
      const note = raw.split(/create note:?\s*/i)[1] || '';
      if (!note) { addBotMsg('Example: create note: Revise Optics'); return; }
      saveNote(note); addBotMsg('Note saved ✔'); return;
    }

    // DEFAULT: AI QUERY EXECUTION
    await askGroqAI(raw);
  }

  // ---- CALCULATOR POPUP ----
  window.showCalculatorModalDirect = function() {
    const calcHtml = `
      <div style="background: #0b1329; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 16px; color: #fff; max-width: 320px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 15px; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
            ${SVG.calculator} Calculator
          </h3>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="calcDisplay" readonly style="width: 100%; padding: 12px; font-size: 22px; text-align: right; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: #040914; color: #38bdf8; font-family: monospace; box-sizing: border-box;" value="0">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
            <button onclick="clearCalc()" style="padding: 12px; border-radius: 6px; border: none; background: #ef4444; color: #fff; font-weight: bold; cursor: pointer;">C</button>
            <button onclick="appendCalc('/')" style="padding: 12px; border-radius: 6px; border: none; background: #334155; color: #38bdf8; font-weight: bold; cursor: pointer;">/</button>
            <button onclick="appendCalc('*')" style="padding: 12px; border-radius: 6px; border: none; background: #334155; color: #38bdf8; font-weight: bold; cursor: pointer;">*</button>
            <button onclick="deleteCalc()" style="padding: 12px; border-radius: 6px; border: none; background: #334155; color: #f59e0b; font-weight: bold; cursor: pointer;">⌫</button>
            
            <button onclick="appendCalc('7')" style="padding: 12px; border-radius: 6px; border: none; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">7</button>
            <button onclick="appendCalc('8')" style="padding: 12px; border-radius: 6px; border: none; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">8</button>
            <button onclick="appendCalc('9')" style="padding: 12px; border-radius: 6px; border: none; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">9</button>
            <button onclick="appendCalc('-')" style="padding: 12px; border-radius: 6px; border: none; background: #334155; color: #38bdf8; font-weight: bold; cursor: pointer;">-</button>
            
            <button onclick="appendCalc('4')" style="padding: 12px; border-radius: 6px; border: none; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">4</button>
            <button onclick="appendCalc('5')" style="padding: 12px; border-radius: 6px; border: none; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">5</button>
            <button onclick="appendCalc('6')" style="padding: 12px; border-radius: 6px; border: none; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">6</button>
            <button onclick="appendCalc('+')" style="padding: 12px; border-radius: 6px; border: none; background: #334155; color: #38bdf8; font-weight: bold; cursor: pointer;">+</button>
            
            <button onclick="appendCalc('1')" style="padding: 12px; border-radius: 6px; border: none; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">1</button>
            <button onclick="appendCalc('2')" style="padding: 12px; border-radius: 6px; border: none; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">2</button>
            <button onclick="appendCalc('3')" style="padding: 12px; border-radius: 6px; border: none; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">3</button>
            <button onclick="calculateResult()" style="grid-row: span 2; padding: 12px; border-radius: 6px; border: none; background: #0284c7; color: #fff; font-weight: bold; cursor: pointer; font-size: 18px;">=</button>
            
            <button onclick="appendCalc('0')" style="grid-column: span 2; padding: 12px; border-radius: 6px; border: none; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">0</button>
            <button onclick="appendCalc('.')" style="padding: 12px; border-radius: 6px; border: none; background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;">.</button>
          </div>
        </div>
        <div style="margin-top: 12px; text-align: center;">
          <a href="calculator.html" style="display: flex; align-items: center; justify-content: center; gap: 6px; background: rgba(56, 189, 248, 0.1); border: 1px dashed rgba(56, 189, 248, 0.5); color: #38bdf8; text-decoration: none; padding: 8px 12px; border-radius: 6px; font-weight: bold; font-size: 12px;">
            ${SVG.external} View Full Modal
          </a>
        </div>
      </div>
    `;
    openModal(calcHtml);
  };

  window.appendCalc = function(val) {
    const display = document.getElementById("calcDisplay");
    if (!display) return;
    if (display.value === "0" || display.value === "Error") {
      display.value = val;
    } else {
      display.value += val;
    }
  };

  window.clearCalc = function() {
    const display = document.getElementById("calcDisplay");
    if (display) display.value = "0";
  };

  window.deleteCalc = function() {
    const display = document.getElementById("calcDisplay");
    if (!display) return;
    display.value = display.value.slice(0, -1);
    if (display.value === "") display.value = "0";
  };

  window.calculateResult = function() {
    const display = document.getElementById("calcDisplay");
    if (!display) return;
    try {
      display.value = Function('"use strict"; return (' + display.value + ')')();
    } catch (e) {
      display.value = "Error";
    }
  };

  // ---- GENERAL SUGGESTION MENU FOR CLASS/SUBJECT QUERIES ----
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

    const chapMatch = clean.match(/(?:chapter\s*|chap\s*|ch\s*|c\s*)(\d+)/i);
    const chNum = chapMatch ? chapMatch[1] : null;

    let html = `
      <div style="border: 1px solid rgba(255,255,255,0.12); padding: 8px 10px; border-radius: 8px; background: #1e293b;">
        <div style="font-size: 12px; font-weight: 600; color: #38bdf8; margin-bottom: 6px;">
          🤔 Class ${cls} ${subDisplay} ${chNum ? '(Ch ' + chNum + ')' : ''}
        </div>
        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
          <button onclick="runCommand('formula ${rawQuery}')" style="background: #d97706; color: #fff; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">📐 Formulas</button>
          <button onclick="runCommand('open pdf ${cls} ${subKey} ch${chNum || 1}')" style="background: #0284c7; color: #fff; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">📖 PDF</button>
          <a href="subjects-${cls}.html" style="background: #059669; color: #fff; text-decoration: none; padding: 5px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">🌐 Subjects</a>
        </div>
      </div>
    `;
    addBotMsg(html);
  }

  // ---- DYNAMIC SUPABASE PDF OPENER ----
  async function doOpenPDFFromSupabase(arg) {
    if (!arg) { 
      addBotMsg('Kripya PDF ka naam ya details likhein, jaise: <b>open pdf 9 bio ch1</b> ya <b>open pdf 10 math polynomial</b>'); 
      return; 
    }
    if (isValidUrl(arg)) { window.open(arg, '_blank'); return; }

    if (!window.supabaseClient) {
      addBotMsg('❌ Database client missing.');
      return; 
    }

    const typing = showTyping();
    const cleanQuery = arg.toLowerCase();

    const classMatch = cleanQuery.match(/(?:class\s*|c\s*|\b)(9|10|11|12)\b/i);
    const targetClass = classMatch ? classMatch[1] : null;

    let targetSubject = null;
    let subDisplay = '';
    if (cleanQuery.includes('phy')) { targetSubject = 'physics'; subDisplay = 'Physics'; }
    else if (cleanQuery.includes('chem')) { targetSubject = 'chemistry'; subDisplay = 'Chemistry'; }
    else if (cleanQuery.includes('math')) { targetSubject = 'maths'; subDisplay = 'Maths'; }
    else if (cleanQuery.includes('bio')) { targetSubject = 'biology'; subDisplay = 'Biology'; }
    else if (cleanQuery.includes('hindi')) { targetSubject = 'hindi'; subDisplay = 'Hindi'; }
    else if (cleanQuery.includes('eng')) { targetSubject = 'english'; subDisplay = 'English'; }

    const chapNumMatch = cleanQuery.match(/(?:chapter\s*|chap\s*|ch\s*)(\d+)/i);
    const targetChapNum = chapNumMatch ? parseInt(chapNumMatch[1]) : null;

    let query = window.supabaseClient.from('notes').select('*');
    if (targetClass) query = query.eq('class', targetClass);
    if (targetSubject) query = query.ilike('subject', `%${targetSubject}%`);
    if (targetChapNum) query = query.eq('chapter_number', targetChapNum);

    const { data: notesData, error } = await query;
    typing && typing.remove();

    if (error) {
      addBotMsg('❌ Notes fetch karne me error aaya.');
      return;
    }

    let descriptiveName = '';
    let filePath = '';

    if (notesData && notesData.length > 0) {
      const matchNote = notesData[0];
      filePath = matchNote.file_path || matchNote.file_url || '';
      
      const className = matchNote.class ? `Class ${matchNote.class}` : '';
      const subjectName = matchNote.subject ? matchNote.subject.toUpperCase() : '';
      
      let chapterInfo = '';
      if (matchNote.chapter_name) {
        chapterInfo = matchNote.chapter_number ? `Chapter ${matchNote.chapter_number}: ${matchNote.chapter_name}` : matchNote.chapter_name;
      } else if (matchNote.chapter_number) {
        chapterInfo = `Chapter ${matchNote.chapter_number}`;
      }

      descriptiveName = [className, subjectName, chapterInfo].filter(Boolean).join(' ');
    }

    if (!descriptiveName) {
      let cFormatted = targetClass ? `Class ${targetClass}` : '';
      let sFormatted = subDisplay;
      let chFormatted = targetChapNum ? `Chapter ${targetChapNum}` : '';
      
      let rawTextName = arg.replace(/class\s*\d+/gi, '').replace(/physics|chemistry|maths|biology|hindi|english|bio|phy|chem/gi, '').replace(/ch\s*\d+/gi, '').trim();
      if (rawTextName) {
        chFormatted = rawTextName.charAt(0).toUpperCase() + rawTextName.slice(1);
      }

      descriptiveName = [cFormatted, sFormatted, chFormatted].filter(Boolean).join(' ') || arg;
    }

    if (!filePath) {
      let clean = arg.replace(/\.pdf$/i, '').trim().toLowerCase()
        .replace(/class\s*/g, '').replace(/chapter\s*/g, 'ch').replace(/chap\s*/g, 'ch').replace(/[\s\-\.]+/g, '_').replace(/_+/g, '_');
      filePath = `notes/${clean}.pdf`;
    }

    const viewer = 'notes-viewer.html?path=' + encodeURIComponent(filePath) + '&name=' + encodeURIComponent(descriptiveName);

    addBotMsg(`Opening PDF: <b>${escapeHtml(descriptiveName)}</b>...`);
    window.location.href = viewer;
  }

  // ---- FORMULAS FETCH ----
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
    if (cleanQuery.includes('phy')) targetSubject = 'physics';
    else if (cleanQuery.includes('chem')) targetSubject = 'chemistry';
    else if (cleanQuery.includes('math')) targetSubject = 'maths';

    let query = window.supabaseClient.from('formulas').select('*').eq('publish', true).order('created_at', { ascending: false });
    if (targetClass) query = query.eq('class', targetClass);
    if (targetSubject) query = query.ilike('subject', `%${targetSubject}%`);

    const { data: formulaData, error } = await query;
    typing && typing.remove();

    if (error) { addBotMsg('❌ Data load karne me error aaya.'); return; }

    let html = '';
    if (formulaData && formulaData.length > 0) {
      html += `<b>📐 Formulas Found (${formulaData.length}):</b><br><br>`;
      formulaData.forEach(f => {
        const subjectName = f.subject ? f.subject.toUpperCase() : 'GENERAL';
        const className = f.class ? `Class ${f.class}` : '';
        const chapterName = f.chapter_name ? `• ${f.chapter_name}` : (f.chapter_number ? `• Chapter ${f.chapter_number}` : '');
        const subTitle = [className, subjectName, chapterName].filter(Boolean).join(' ');

        const descriptiveName = [className, subjectName, chapterName].filter(Boolean).join(' ') || 'Formula';
        const targetViewer = f.type === 'image' ? 'image-viewer.html' : 'notes-viewer.html';
        const viewerUrl = `${targetViewer}?path=${encodeURIComponent(f.file_path || '')}&name=${encodeURIComponent(descriptiveName)}`;
        
        html += `<div style="border: 1px solid #374151; padding: 10px; margin-bottom: 8px; border-radius: 8px; background: #1f2937; cursor: pointer; transition: 0.2s;" onclick="window.location.href='${viewerUrl}'">`;
        html += `<div style="font-size:11px; color:#38bdf8; font-weight: bold; margin-bottom: 4px;">📚 ${subTitle}</div>`;
        
        if (f.type === 'text') {
          html += `<div style="color: #f3f4f6; font-size: 13px;">📝 ${cleanAndFormatText(f.formula_text)}</div>`;
        } else {
          html += `<div style="color: #f3f4f6; font-size: 13px;">📄 View Formula Document</div>`;
        }
        html += `</div>`;
      });
    } else {
      html += `<div style="text-align: center;">✨ Is query ke liye koi formula nahi mila ✨</div>`;
    }

    html += `
      <div style="margin-top: 10px; text-align: center;">
        <a href="formulas.html" style="display: inline-flex; align-items: center; gap: 4px; background: #d97706; color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 5px; font-weight: bold; font-size: 12px;">
          ${SVG.external} Open Full Formulas Page (formulas.html)
        </a>
      </div>
    `;

    addBotMsg(html);
  }

  // ---- SYSTEM KNOWLEDGE & SAFETY RULES FOR GROQ AI ----
  const systemKnowledge = `
You are 'Roitx AI', an advanced, highly intelligent study assistant built for Rohit's educational platform (roitx.github.io).

### 🎯 CORE IDENTITY & TONE
- Respond in clear, simple, and friendly **Hindi / Hinglish** (mix of English and Hindi script/Latin text).
- Be encouraging, precise, and highly accurate with academic concepts.
- Avoid unnecessarily long explanations unless explicitly requested. Use bullet points for steps or multi-part answers.

### 🔗 NAVIGATION & HTML LINK RULES
When a user asks for classes, study materials, subjects, tools, or website navigation, ALWAYS generate valid, standard HTML inline <a> tags using the exact relative paths listed below.
- ALWAYS use exact relative paths (e.g., <a href="subjects-10.html">Class 10</a>).
- NEVER invent or fabricate new page URLs/paths that are not in the directory below.
- Do NOT wrap HTML links in markdown code blocks (\`\`\`). Render them as clean raw HTML strings.
- Example: "Aap Class 10 ke subjects <a href="subjects-10.html">yahan dekh sakte hain</a>."

--- WORKING HTML PAGES DIRECTORY ---
1. Core & Main Pages:
   - Home Page: <a href="index.html">Home</a>
   - Classes Directory: <a href="classes.html">All Classes</a>
   - Premium Notes: <a href="premium-notes.html">Premium Notes Hub</a>
   - Creator Details: <a href="about.html">About Developer</a>
   - About Platform: <a href="aboutus.html">About Us</a>
   - Privacy Policy: <a href="aboutus.html#privacy">Privacy Policy</a>
   - Terms & Conditions: <a href="aboutus.html#terms">Terms & Conditions</a>
   - Doubt & Feedback: <a href="solver.html">Doubt Solver & Feedback</a>

2. Class & Stream Specifics:
   - Class 9: <a href="subjects-9.html">Class 9 Subjects</a>
   - Class 10: <a href="subjects-10.html">Class 10 Subjects</a>
   - Class 11 Main: <a href="subjects-11.html">Class 11 Overview</a>
   - Class 11 Streams: <a href="11-science-subjects.html">11th Science</a> | <a href="11-commerce-subjects.html">11th Commerce</a> | <a href="11-arts-subjects.html">11th Arts</a>
   - Class 12 Main: <a href="subjects-12.html">Class 12 Overview</a>
   - Class 12 Streams: <a href="12-science-subjects.html">12th Science</a> | <a href="12-commerce-subjects.html">12th Commerce</a> | <a href="12-arts-subjects.html">12th Arts</a>

3. Tools & Utilities:
   - Formulas Sheet: <a href="formulas.html">Formulas Hub</a>
   - Calculator: <a href="calculator.html">Scientific Calculator</a>
   - Calendar & Schedule: <a href="calendar.html">Study Calendar</a>
   - Focus Timer: <a href="study-timer.html">Pomodoro / Study Timer</a>
   - Doubt Solver: <a href="solver.html">Instant Doubt Solver</a>

--- STRICT SAFETY, CREATOR & FALLBACK RULES ---
1. CREATOR PRIVACY: Do NOT mention "Rohit" or "Created by Rohit" in normal academic answers. Include developer details ONLY if the user explicitly asks "who created this", "who built this", "developer info", or "Rohit kaun hai". When asked, direct them to <a href="about.html">About Developer</a>.
2. UNCERTAINTY / FALLBACK: If you are unsure about a complex question or lack exact study material, answer to the best of your ability and suggest posting the query on <a href="solver.html">Doubt Solver</a>.
3. OUT OF SCOPE: If a user asks a query completely unrelated to studies/learning or website navigation, politely redirect them back to study topics.
4. FORMATTING: Use bold formatting (**like this**) for key terms, definitions, and mathematical formulas.
`;

  // ---- GROQ AI API CALL ----
  async function askGroqAI(userQuery) {
    const typing = showTyping();
    const SUPABASE_FUNCTION_URL = "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YXN0d2Vobm5xaWNyaWtuZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTk5NTEsImV4cCI6MjA4MDgzNTk1MX0.5_UvwaG0X8k_Emj-cMC0KjEqlvU6hgAt5IsHJdgARvk"; 

    const fullPrompt = `SYSTEM INSTRUCTIONS & KNOWLEDGE:
${systemKnowledge}

PREFERRED LANGUAGE: ${selectedLanguage === 'en' ? 'English' : 'Hindi / Hinglish'}

USER QUESTION:
${userQuery}`;

    try {
      const response = await fetch(SUPABASE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ 
          prompt: fullPrompt,
          language: selectedLanguage,
          provider: 'groq'
        })
      });

      const data = await response.json();
      typing && typing.remove();

      let answerText = "";
      if (data.choices && data.choices[0]?.message?.content) {
        answerText = data.choices[0].message.content;
      } else if (data.error) {
        addBotMsg(`⚠️ Error: ${data.error.message || JSON.stringify(data.error)}`);
        return;
      }

      if (answerText) {
        const cleanFormatted = cleanAndFormatText(answerText);
        addBotMsg(cleanFormatted);
      } else {
        addBotMsg("⚠️ Server se response structure empty mila.");
      }

    } catch (err) {
      typing && typing.remove();
      addBotMsg(`⚠️ Network Error: ${err.message || 'Connection issue'}`);
    }
  }

  // ---- INTERACTIVE MINI CALENDAR POPUP ----
  window.showCalendarModalDirect = function() {
    renderMiniCalendar(miniCalCurDate);
  };

  function renderMiniCalendar(dateObj) {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

    let gridHtml = '';
    for (let i = 0; i < firstDayIndex; i++) {
      gridHtml += `<div style="padding: 6px; opacity: 0.2;"></div>`;
    }

    for (let d = 1; d <= totalDays; d++) {
      const currentCellDate = new Date(year, month, d);
      const isSunday = currentCellDate.getDay() === 0;
      const isToday = `${year}-${month}-${d}` === todayKey;

      let cellStyle = "padding: 8px 2px; border-radius: 6px; font-size: 11px; font-weight: bold; text-align: center; background: rgba(255,255,255,0.03); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.05);";

      if (isSunday) {
        cellStyle += " border-color: rgba(255, 183, 3, 0.6); color: #ffc107; box-shadow: 0 0 6px rgba(255,183,3,0.3);";
      }

      if (isToday) {
        cellStyle += " background: linear-gradient(135deg, #3aa0ff, #7b6bff) !important; color: #fff !important; box-shadow: 0 0 10px #3aa0ff;";
      }

      gridHtml += `<div style="${cellStyle}">${d}</div>`;
    }

    const modalHtml = `
      <div style="background: #04101a; border: 1px solid rgba(58,160,255,0.3); border-radius: 12px; padding: 14px; color: #e9f5ff;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="font-weight: 800; font-size: 14px; color: #3aa0ff; display: flex; align-items: center; gap: 6px;">
            ${SVG.calendar} ${escapeHtml(monthName)}
          </div>
          <div style="display: flex; gap: 4px;">
            <button onclick="changeMiniMonth(-1)" style="background: rgba(255,255,255,0.1); border: none; color: #fff; border-radius: 4px; padding: 2px 8px; cursor: pointer;">◀</button>
            <button onclick="changeMiniMonth(1)" style="background: rgba(255,255,255,0.1); border: none; color: #fff; border-radius: 4px; padding: 2px 8px; cursor: pointer;">▶</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; font-size: 10px; font-weight: bold; color: #94a3b8; margin-bottom: 6px;">
          <div style="color: #ffc107;">Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
          ${gridHtml}
        </div>

        <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
          <a href="calendar.html" style="color: #38bdf8; font-size: 11px; text-decoration: none; font-weight: bold; display: flex; align-items: center; gap: 4px;">
            Full Calendar Page ${SVG.external}
          </a>
          <button onclick="closeModal()" style="background: #334155; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;">Close</button>
        </div>
      </div>
    `;

    openModal(modalHtml);
  }

  window.changeMiniMonth = function(dir) {
    miniCalCurDate.setMonth(miniCalCurDate.getMonth() + dir);
    renderMiniCalendar(miniCalCurDate);
  };

  // ---- LOCAL NOTES EXPORT SYSTEM ----
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

  window.deleteNote = function(id) {
    let notes = getNotes();
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem('rk_notes', JSON.stringify(notes));
    updateNotesCount();
    showNotesModal();
  };

  window.clearAllNotes = function() {
    if (confirm("Kya aap apne saare saved notes delete karna chahte hain?")) {
      localStorage.removeItem('rk_notes');
      updateNotesCount();
      showNotesModal();
      addBotMsg("Saare notes delete kar diye gaye hain 🗑️");
    }
  };

  function showNotesModal() {
    const notes = getNotes();
    let html = '<h3 style="margin-bottom: 12px; color: #38bdf8;">Your Saved Notes</h3>';
    
    if (!notes.length) {
      html += '<div style="color: #9fb7c7; padding: 10px 0;">No notes saved yet.</div>';
    } else {
      html += '<ul style="margin-top:8px; max-height: 250px; overflow-y: auto; padding-left: 0; list-style: none;">';
      notes.forEach((nt, idx) => {
        html += `
          <li style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 8px 12px; margin-bottom: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="word-break: break-word; flex: 1; margin-right: 10px; font-size: 13px; color: #e6eef6;">
              <strong style="color: #06b6d4;">#${idx + 1}</strong> ${escapeHtml(nt.text)}
            </div>
            <button onclick="deleteNote(${nt.id})" style="display: inline-flex; align-items: center; gap: 4px; background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
              ${SVG.delete} Delete
            </button>
          </li>`;
      });
      html += '</ul>';
    }

    html += `
      <div style="margin-top: 15px; display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
        ${notes.length ? `<button onclick="clearAllNotes()" style="display: inline-flex; align-items: center; gap: 4px; background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;">${SVG.delete} Clear All</button>` : ''}
        ${notes.length ? `<button onclick="downloadNotesFile()" style="display: inline-flex; align-items: center; gap: 4px; background: #0284c7; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;">${SVG.pdf} Export PDF/TXT</button>` : ''}
        ${notes.length ? `<button onclick="shareViaWhatsApp()" style="display: inline-flex; align-items: center; gap: 4px; background: #25d366; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;">${SVG.share} Share WA</button>` : ''}
        <button onclick="closeModal()" style="background: #334155; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;">Close</button>
      </div>`;
    
    openModal(html);
  }

  function downloadNotesFile() {
    const notes = getNotes();
    if (!notes.length) {
      addBotMsg('⚠️ Koi saved notes nahi mila export karne ke liye.');
      return;
    }
    const txt = notes.map((n, i) => `#${i + 1} [${new Date(n.created).toLocaleString()}]\n${n.text}\n\n`).join('');
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = 'rohit_notes.txt';
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a); 
    URL.revokeObjectURL(url);
    addBotMsg('Notes PDF export ready and downloaded successfully ✔');
    closeModal();
  }

  window.shareViaWhatsApp = function() {
    const notes = getNotes();
    if (!notes.length) {
      addBotMsg('⚠️ Share karne ke liye koi notes record nahi hai.');
      return;
    }
    const txt = notes.map((n, i) => `${i + 1}. ${n.text}`).join('\n');
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent('📋 Roitx Notes:\n' + txt)}`;
    window.open(waUrl, '_blank');
  };

  // ---- MODAL HELPERS ----
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

  // ---- EXPORTED ACTION HELPERS ----
  window.showNotesModalDirect = showNotesModal;
  window.downloadNotesFileDirect = downloadNotesFile;
  window.promptCreateNote = function() {
    const noteText = prompt("Apna note yahan likhein:");
    if (noteText && noteText.trim() !== "") {
      saveNote(noteText.trim());
      addBotMsg(`Note saved successfully: <b>${escapeHtml(noteText)}</b> ✔`);
    }
  };
  window.askChatSend = onSend;
})();
