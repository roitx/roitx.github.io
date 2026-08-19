// =========================================================
// ask-chat.js — FULLY UPDATED & ERROR-FREE (Supabase Dynamic Notes & Fixed Download)
// =========================================================
(function () {
  // ---- PREVENT DOUBLE INITIALIZATION ----
  if (window.__askChatInitialized) return;
  window.__askChatInitialized = true;

  // ---- GLOBAL LANGUAGE STATE ----
  let selectedLanguage = 'hi'; 

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

  // ---- INITIALIZATION & USER GREETING ----
  updateNotesCount();
  initUserGreeting();

  sendBtn && sendBtn.addEventListener('click', onSend);
  input && input.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSend(); });

  window.runCommand = (text) => { if (!input) return; input.value = text; onSend(); };

  // ---- FETCH LOGGED-IN USER & SHOW PROFILE-STYLE WELCOME BACK ----
  async function initUserGreeting() {
    let displayName = "Student";
    
    try {
      if (window.supabaseClient) {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (user) {
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
      console.warn("Could not fetch user session for greeting:", err);
    }

    const savedName = localStorage.getItem('userName') || displayName;
    const welcomeMsg = `Hi ${savedName} 👋 — Main aapka Study Assistant hu! Aap koi bhi study question pooch sakte hain ya commands use kar sakte hain (e.g., 'classes', 'open pdf 9 chemistry ch3', 'formula class 10', 'calendar').`;
    addBotMsg(welcomeMsg);
  }

  // ---- UI HELPERS ----
  function addUserMsg(text) {
    if (!chatWindow) return;
    const d = document.createElement('div'); 
    d.className = 'msg user'; 
    d.textContent = text;
    chatWindow.appendChild(d); 
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function cleanAndFormatText(text) {
    if (!text) return "";
    text = text.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, '<b style="color: #60a5fa; display: inline-block; margin: 4px 0;">$1</b>');
    text = text.replace(/\$\s*([^$]+?)\s*\$/g, '<b style="color: #38bdf8;">$1</b>');
    text = text.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, '<b style="color: #38bdf8;">$1</b>');
    text = text.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, '<b style="color: #60a5fa; display: inline-block;">$1</b>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    text = text.replace(/\*(.*?)\*/g, '<i>$1</i>');
    text = text.replace(/\n/g, "<br>");
    return text;
  }

  function renderMathSafely(element) {
    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
      window.MathJax.typesetPromise([element]).catch((err) => console.warn("MathJax error:", err));
    } else if (window.MathJax && typeof window.MathJax.typeset === 'function') {
      window.MathJax.typeset([element]);
    }
  }

  function addBotMsg(htmlContent) {
    if (!chatWindow) return;
    const d = document.createElement('div'); 
    d.className = 'msg bot'; 
    d.innerHTML = htmlContent;
    chatWindow.appendChild(d); 
    chatWindow.scrollTop = chatWindow.scrollHeight;
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

  // ---- SMART COMMAND DISPATCHER ----
  async function handleCommand(raw) {
    const cmd = normalize(raw);

    if (cmd.includes('kiske dwara') || cmd.includes('kisne banaya') || cmd.includes('who made') || cmd.includes('who created') || cmd.includes('developer') || cmd.includes('creator') || cmd.includes('owner') || cmd === 'rohit' || cmd.includes('rohit kaun')) {
      addBotMsg(`
        <div style="border: 1px solid #38bdf8; padding: 10px; border-radius: 8px; background: rgba(56, 189, 248, 0.08); margin-top: 5px;">
          <div style="font-size: 13px; font-weight: bold; color: #38bdf8; margin-bottom: 4px;">👤 Creator Details</div>
          <div style="font-size: 12px; color: #e0e7ff; line-height: 1.5; margin-bottom: 8px;">
            Is application ko <b>Rohit</b> ne banaya hai! Platform ke bare me aur janne ke liye link par click karein:
          </div>
          <a href="about.html" style="display: inline-block; background: #0284c7; color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 5px; font-weight: bold; font-size: 12px;">
            🌐 Visit About Page (about.html)
          </a>
        </div>
      `);
      return;
    }

    if (cmd === 'classes' || cmd === 'class' || cmd === 'all classes' || cmd.includes('kaun si class') || cmd.includes('select class')) {
      addBotMsg(`
        <div style="border: 1px solid #38bdf8; padding: 10px; border-radius: 8px; background: #1e293b; margin-top: 5px;">
          <div style="font-size: 13px; font-weight: bold; color: #38bdf8; margin-bottom: 6px;">📚 Select Your Class / Stream:</div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
            <a href="subjects-9.html" style="background: #0284c7; color: #fff; text-decoration: none; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;">Class 9</a>
            <a href="subjects-10.html" style="background: #0284c7; color: #fff; text-decoration: none; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;">Class 10</a>
            <a href="subjects-11.html" style="background: #059669; color: #fff; text-decoration: none; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;">Class 11</a>
            <a href="subjects-12.html" style="background: #059669; color: #fff; text-decoration: none; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;">Class 12</a>
          </div>
          <a href="classes.html" style="display: inline-block; color: #38bdf8; font-size: 11px; text-decoration: underline;">🌐 View Full Classes Overview (classes.html)</a>
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

    if (cmd.includes('doubt') || cmd.includes('solve') || cmd.includes('samajh') || cmd.includes('question')) {
      addBotMsg(`
        <div style="border: 1px solid #8b5cf6; padding: 10px; border-radius: 8px; background: #1e1b4b; margin-top: 5px;">
          <div style="font-size: 13px; font-weight: bold; color: #a78bfa; margin-bottom: 4px;">❓ Doubt Ya Question Hai?</div>
          <a href="solver.html" style="display: inline-block; background: #7c3aed; color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 5px; font-weight: bold; font-size: 12px; margin-top: 4px;">🔍 Open Doubt Solver Panel</a>
        </div>
      `);
      return;
    }

    // 4. OPEN PDF FROM SUPABASE (DYNAMIC CHAPTER & SUBJECT FETCH)
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

    // 5. FORMULA / SUTRA SEARCH
    if (cmd.includes('formula') || cmd.includes('formulas') || cmd.includes('sutra')) {
      await fetchAndSuggestFormulas(raw);
      return;
    }

    if (cmd.includes('notes') || cmd.includes('note pdf') || cmd.includes('premium')) {
      addBotMsg(`
        <div style="border: 1px solid #00d2ff; padding: 10px; border-radius: 8px; background: rgba(0,210,255,0.05); margin-top: 5px;">
          <div style="font-size: 13px; font-weight: bold; color: #00d2ff; margin-bottom: 4px;">📚 Premium Notes Hub</div>
          <a href="premium-notes.html" style="display: inline-block; background: linear-gradient(135deg, #00d2ff, #0072ff); color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 5px; font-weight: bold; font-size: 12px; margin-top: 4px;">🚀 Open Premium Notes</a>
        </div>
      `);
      return;
    }

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

    if (cmd === 'show notes' || cmd === 'view notes') { showNotesModal(); return; }
    if (cmd === 'download notes' || cmd === 'export notes') { downloadNotesFile(); return; }

    if (cmd.startsWith('create note:') || cmd.startsWith('create note')) {
      const note = raw.split(/create note:?\s*/i)[1] || '';
      if (!note) { addBotMsg('Example: create note: Revise Optics'); return; }
      saveNote(note); addBotMsg('Note saved ✔'); return;
    }

    await askGroqAI(raw);
  }

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

  // ---- SMART OPEN PDF HANDLER (EXACTLY LIKE FORMULAS: CLASS, SUBJECT & CHAPTER NAME) ----
  async function doOpenPDFFromSupabase(arg) {
    if (!arg) { 
      addBotMsg('Kripya PDF ka naam ya details likhein, jaise: <b>open pdf 10 math polynomial</b>'); 
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
      
      let rawTextName = arg.replace(/class\s*\d+/gi, '').replace(/physics|chemistry|maths|biology|hindi|english/gi, '').replace(/ch\s*\d+/gi, '').trim();
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

    addBotMsg(`Opening PDF: <b>${descriptiveName}</b>...`);
    window.location.href = viewer;
  }

  // ---- SUPABASE FORMULA FETCH WITH DYNAMIC CHAPTER NAME ----
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
        <a href="formulas.html" style="display: inline-block; background: #d97706; color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 5px; font-weight: bold; font-size: 12px;">
          📐 Open Full Formulas Page (formulas.html)
        </a>
      </div>
    `;

    addBotMsg(html);
  }

  const systemKnowledge = `
You are an AI study assistant for Rohit's learning platform (roitx.github.io). Answer in simple Hindi/Hinglish.
When asked for classes, study materials, or site pages, generate HTML standard <a> tags using the relative paths below.

--- WORKING HTML PAGES DIRECTORY ---
1. Core & Main Pages:
- <a href="index.html">Home Page</a>
- <a href="classes.html">Classes Overview (Class 9, 10, 11, 12)</a>
- <a href="premium-notes.html">Premium Notes Hub</a>
- <a href="about.html">About Page</a>
- <a href="ask-doubt.html">Ask Doubt & Feedback Page</a>

2. Class & Stream Pages:
- <a href="subjects-9.html">Class 9 Subjects</a>
- <a href="subjects-10.html">Class 10 Subjects</a>
- <a href="subjects-11.html">Class 11 Streams</a>
- <a href="subjects-12.html">Class 12 Streams</a>
- <a href="11-arts-subjects.html">11 Arts</a> | <a href="11-commerce-subjects.html">11 Commerce</a> | <a href="11-science-subjects.html">11 Science</a>
- <a href="12-arts-subjects.html">12 Arts</a> | <a href="12-commerce-subjects.html">12 Commerce</a> | <a href="12-science-subjects.html">12 Science</a>

3. Tools & Utilities:
- <a href="formulas.html">Formulas Page</a>
- <a href="calculator.html">Calculator</a>
- <a href="calendar.html">Calendar</a>
- <a href="study-timer.html">Study Timer</a>
- <a href="solver.html">Doubt Solver Panel</a>

CREATOR RULE:
DO NOT introduce yourself as created by Rohit by default. ONLY if explicitly asked, state created by Rohit and link <a href="about.html">about.html</a>.
`;

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

  function isValidUrl(s) {
    try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
  }

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

  // ---- NOTES MANAGEMENT (WITH DELETE & FIXED DOWNLOAD) ----
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
    let html = '<h2 style="margin-bottom: 12px; color: #38bdf8;">Your Saved Notes</h2>';
    
    if (!notes.length) {
      html += '<div style="color: #9fb7c7; padding: 10px 0;">No notes saved yet.</div>';
    } else {
      html += '<ul style="margin-top:8px; max-height: 250px; overflow-y: auto; padding-right: 5px; list-style: none; padding-left: 0;">';
      notes.forEach((nt, idx) => {
        html += `
          <li style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 8px 12px; margin-bottom: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="word-break: break-word; flex: 1; margin-right: 10px;">
              <strong style="color: #06b6d4;">#${idx + 1}</strong> <span style="color: #e6eef6; font-size: 14px;">${escapeHtml(nt.text)}</span>
            </div>
            <button onclick="deleteNote(${nt.id})" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">Delete</button>
          </li>`;
      });
      html += '</ul>';
    }

    html += `
      <div style="margin-top: 15px; display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
        ${notes.length ? `<button onclick="clearAllNotes()" style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600;">Clear All</button>` : ''}
        ${notes.length ? `<button onclick="downloadNotesFile()" style="background: #0284c7; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600;">Download</button>` : ''}
        <button onclick="closeModal()" style="background: #334155; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
      </div>`;
    
    openModal(html);
  }

  // FIXED DOWNLOAD NOTES FILE FUNCTION
  function downloadNotesFile() {
    const notes = getNotes();
    if (!notes.length) { 
      addBotDownloadAlert('No notes to download'); 
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
    addBotMsg('Notes downloaded successfully ✔');
    closeModal();
  }

  function addBotDownloadAlert(msg) {
    if (modalContent) {
      const alertBox = document.createElement('div');
      alertBox.style.cssText = "color: #f87171; margin-top: 8px; font-size: 13px;";
      alertBox.textContent = msg;
      modalContent.appendChild(alertBox);
      setTimeout(() => alertBox.remove(), 2500);
    } else {
      addBotMsg(msg);
    }
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

  // ---- DIRECT ACTION HELPERS FOR BUTTONS ----
  window.showNotesModalDirect = function() {
    showNotesModal();
  };

  window.downloadNotesFileDirect = function() {
    downloadNotesFile();
  };

  window.showCalendarModalDirect = function() {
    showCalendarModal();
    addBotMsg(`
      <div style="border: 1px solid rgba(255,255,255,0.12); padding: 8px 10px; border-radius: 8px; background: #1e293b;">
        <div style="font-size: 12px; color: #38bdf8; margin-bottom: 6px;">📅 Calendar Modal Opened Successfully!</div>
        <a href="calendar.html" style="background: #0284c7; color: #fff; text-decoration: none; padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;">🌐 Open Calendar Page</a>
      </div>
    `);
  };

  window.promptCreateNote = function() {
    const noteText = prompt("Apna note yahan likhein:");
    if (noteText && noteText.trim() !== "") {
      saveNote(noteText.trim());
      addBotMsg(`Note saved successfully: <b>${escapeHtml(noteText)}</b> ✔`);
    }
  };

  window.askChatSend = onSend;
})();
