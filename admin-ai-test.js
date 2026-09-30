// --- CENTRAL EDGE FUNCTION & SUPABASE AUTH CONFIG ---
window.SUPABASE_FUNCTION_URL = window.SUPABASE_FUNCTION_URL || "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YXN0d2Vobm5xaWNyaWtuZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTk5NTEsImV4cCI6MjA4MDgzNTk1MX0.5_UvwaG0X8k_Emj-cMC0KjEqlvU6hgAt5IsHJdgARvk";

let generatedQuizData = null;

// --- GLOBAL EVENT LISTENERS: DISABLE DBLCLICK & LONG-PRESS (EXCEPT TEXTAREA/INPUT) ---
document.addEventListener('dblclick', function (e) {
  if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('contextmenu', function (e) {
  if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
  }
}, { passive: false });

// Subject Mapping Configuration
const subjectData = {
  class9_10: [
    "Physics", 
    "Chemistry", 
    "Biology", 
    "History", 
    "Political Science (Civics)", 
    "Geography", 
    "Economics", 
    "Mathematics", 
    "Sanskrit", 
    "Hindi", 
    "English"
  ],
  class11_12: {
    science_math: ["Mathematics", "Physics", "Chemistry", "English", "Hindi"],
    science_bio: ["Biology", "Physics", "Chemistry", "English", "Hindi"],
    arts: ["History", "Political Science", "Geography", "Economics", "Hindi", "English"],
    commerce: ["Accountancy", "Business Studies", "Economics", "Entrepreneurship", "English"]
  },
  jee: ["Mathematics", "Physics", "Chemistry"],
  neet: ["Biology (Botany & Zoology)", "Physics", "Chemistry"]
};

// Admin Guard and Initial Load Setup
window.addEventListener('DOMContentLoaded', async () => {
  try {
    if (typeof window.requireAdminAuth === "function") {
      await window.requireAdminAuth();
    } else {
      await verifyAdminStrictly();
    }
    document.body.classList.add('admin-authenticated');
    
    updateSubCategories();
  } catch (authErr) {
    console.error("Admin Authentication Guard Error:", authErr);
  }
});

// Dynamic Dropdown Logic
function updateSubCategories() {
  const category = document.getElementById("targetCategory").value;
  const classSelect = document.getElementById("targetClass");

  classSelect.innerHTML = "";

  if (category === "board") {
    classSelect.innerHTML = `
      <option value="Class 12th Bihar Board" selected>Class 12th (Bihar Board)</option>
      <option value="Class 12th CBSE">Class 12th (CBSE)</option>
      <option value="Class 11th Bihar Board">Class 11th (Bihar Board)</option>
      <option value="Class 11th CBSE">Class 11th (CBSE)</option>
      <option value="Class 10th Board">Class 10th (Board)</option>
      <option value="Class 9th">Class 9th</option>
    `;
  } else {
    classSelect.innerHTML = `
      <option value="NEET UG" selected>NEET UG (Medical)</option>
      <option value="JEE Main">JEE Main</option>
      <option value="JEE Advanced">JEE Advanced</option>
    `;
  }

  updateSubjectOptions();
}

function updateSubjectOptions() {
  const category = document.getElementById("targetCategory").value;
  const targetClass = document.getElementById("targetClass").value;
  const streamGroup = document.getElementById("streamGroup");
  const streamSelect = document.getElementById("streamSelect");
  const subjectSelect = document.getElementById("subjectSelect");

  subjectSelect.innerHTML = "";

  if (category === "board") {
    if (targetClass.includes("11th") || targetClass.includes("12th")) {
      streamGroup.style.display = "block";
      const selectedStream = streamSelect.value;
      const subjects = subjectData.class11_12[selectedStream] || [];
      
      subjects.forEach(sub => {
        const opt = document.createElement("option");
        opt.value = sub;
        opt.innerText = sub;
        subjectSelect.appendChild(opt);
      });
    } else {
      streamGroup.style.display = "none";
      subjectData.class9_10.forEach(sub => {
        const opt = document.createElement("option");
        opt.value = sub;
        opt.innerText = sub;
        subjectSelect.appendChild(opt);
      });
    }
  } else {
    streamGroup.style.display = "none";
    let subjects = [];
    if (targetClass.includes("NEET")) {
      subjects = subjectData.neet;
    } else {
      subjects = subjectData.jee;
    }

    subjects.forEach(sub => {
      const opt = document.createElement("option");
      opt.value = sub;
      opt.innerText = sub;
      subjectSelect.appendChild(opt);
    });
  }
}

// Fallback Strict Admin Checker
async function verifyAdminStrictly() {
  if (!window.supabaseClient) return;

  let currentUser = null;
  if (typeof window.getCurrentUser === 'function') {
    currentUser = await window.getCurrentUser();
  } else {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session) currentUser = session.user;
  }

  if (!currentUser) {
    alert("🔒 Login Required! Only authorized admins can access this tool.");
    window.location.href = "login.html";
    return;
  }

  let isAdmin = false;
  if (typeof window.checkIsAdmin === 'function') {
    isAdmin = await window.checkIsAdmin();
  } else {
    const { data } = await window.supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();
    if (data && data.role === 'admin') isAdmin = true;
  }

  if (!isAdmin) {
    alert("⛔ Access Denied! You do not have admin permissions.");
    window.location.href = "profile.html";
  }
}

function getCorrectIndex(q) {
  var val = q.correct !== undefined ? q.correct : (q.correctAnswer ?? q.ans ?? q.correct_option ?? 0);
  var parsed = parseInt(val);
  return isNaN(parsed) ? 0 : parsed;
}

function cleanOptionText(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\s*\((?:correct\vert{}ans\vert{}answer\vert{}correct answer\vert{}sahi uttar)\)/gi, '')
    .trim();
}

function shuffleQuizQuestions(questions) {
  if (!Array.isArray(questions)) return [];

  return questions.map((q) => {
    let originalOpts = (q.options || q.opts || []).map(cleanOptionText);
    let correctIdx = getCorrectIndex(q);
    let correctAnswerValue = originalOpts[correctIdx];

    let shuffledOpts = [...originalOpts];
    for (let i = shuffledOpts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOpts[i], shuffledOpts[j]] = [shuffledOpts[j], shuffledOpts[i]];
    }

    let newCorrectIdx = shuffledOpts.indexOf(correctAnswerValue);

    return {
      ...q,
      options: shuffledOpts,
      correct: newCorrectIdx !== -1 ? newCorrectIdx : 0
    };
  });
}

// Safe MathJax Formatting Helper
function formatLatexString(str) {
  if (typeof str !== 'string') return str;
  if (!str.includes('\\')) return str;

  return str.replace(/(?<!\$)(?:\\[a-zA-Z]+(?:\{[^{}]*\}\vert{}\[[^\[\]]*\])*|\^[0-9a-zA-Z{}]+|_[0-9a-zA-Z{}]+)+(?!\$)/g, (match) => {
    return `$${match.trim()}$`;
  });
}

// Render Visual Preview with MathJax LaTeX Support
function renderUiPreview(parsedJson) {
  let previewContainer = document.getElementById("uiQuestionsPreview");
  if (!previewContainer) {
    const jsonGroup = document.getElementById("jsonOutput")?.parentElement;
    if (jsonGroup) {
      previewContainer = document.createElement("div");
      previewContainer.id = "uiQuestionsPreview";
      previewContainer.style.cssText = "margin-bottom: 20px;";
      jsonGroup.parentNode.insertBefore(previewContainer, jsonGroup);
    } else {
      return;
    }
  }

  previewContainer.innerHTML = "<h3 style='margin: 15px 0 10px 0; color: #4A00E0; font-size: 15px;'><i class='fa-solid fa-list-check'></i> Live Questions Preview</h3>";

  const questions = parsedJson.questions || parsedJson.questions_data || [];
  if (questions.length === 0) {
    previewContainer.innerHTML += "<p style='color:#a0aec0; font-size:13px;'>No questions generated.</p>";
    return;
  }

  questions.forEach((q, idx) => {
    const qDiv = document.createElement("div");
    qDiv.style.cssText = "background: #ffffff; border-radius: 8px; padding: 12px; margin-bottom: 12px; border: 1px solid #e2e8f0; text-align: left;";

    let optionsHtml = "";
    const opts = q.options || q.opts || [];
    const correctIdx = getCorrectIndex(q);

    opts.forEach((opt, optIdx) => {
      const isCorrect = optIdx === correctIdx;
      const formattedOpt = formatLatexString(opt);
      optionsHtml += `
        <div style="display: flex; align-items: center; margin: 6px 0; font-size: 13px; color: ${isCorrect ? '#276749' : '#2d3748'}; font-weight: ${isCorrect ? 'bold' : 'normal'};">
          <span style="margin-right: 8px; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; background: ${isCorrect ? '#c6f6d5' : '#edf2f7'}; font-size: 11px;">
            ${String.fromCharCode(65 + optIdx)}
          </span>
          <span>${formattedOpt} ${isCorrect ? '✓' : ''}</span>
        </div>`;
    });

    let figureHtml = "";
    if (q.diagram_svg && q.diagram_svg.trim() !== "") {
      figureHtml = `<div style="margin: 10px 0; text-align: center; background: #fafafa; padding: 8px; border-radius: 6px; border: 1px dashed #cbd5e0; overflow-x: auto;">${q.diagram_svg}</div>`;
    } else if (q.image_url && q.image_url !== null) {
      figureHtml = `<div style="margin: 8px 0;"><img src="${q.image_url}" alt="Question Figure" style="max-width: 100%; max-height: 200px; border-radius: 6px; border: 1px solid #cbd5e0;" onError="this.style.display='none';"></div>`;
    }

    const formattedQuestion = formatLatexString(q.question || '');
    const formattedExplanation = formatLatexString(q.explanation || '');

    qDiv.innerHTML = `
      <p style="font-weight: 600; font-size: 14px; margin: 0 0 8px 0; color: #1a202c;">Q${idx + 1}: ${formattedQuestion}</p>
      ${figureHtml}
      <div>${optionsHtml}</div>
      ${q.explanation ? `<div style="font-size: 12px; color: #4a5568; margin-top: 8px; background: #f7fafc; padding: 8px; border-radius: 6px; border-left: 3px solid #8E2DE2;"><strong>Explanation:</strong><div style="margin-top: 4px; white-space: pre-line;">${formattedExplanation}</div></div>` : ''}
    `;

    previewContainer.appendChild(qDiv);
  });

  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    window.MathJax.typesetPromise([previewContainer]).catch((err) => console.log('MathJax error:', err));
  } else if (window.MathJax && typeof window.MathJax.typeset === 'function') {
    window.MathJax.typeset();
  }
}

// JSON Sanitizer for Robust Parsing
function safeParseJson(rawString) {
  let cleaned = rawString.replace(/```json/gi, "").replace(/```/g, "").trim();
  
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Attempt auto-repair for broken unescaped control backslashes
    cleaned = cleaned.replace(/[\u0000-\u001F]+/g, " ");
    return JSON.parse(cleaned);
  }
}

// Single Batch API Call (5 Questions per call)
async function fetchBatchQuestions(chunkCount, startIndex, metaParams) {
  const { targetCategory, targetClass, subject, topic, difficulty, languageInstruction, customPrompt } = metaParams;

  const systemInstruction = `You are a professional senior exam paper setter for ${targetClass}.
Generate EXACTLY ${chunkCount} questions starting from index ${startIndex + 1} for Subject: "${subject}", Topic: "${topic}".
Difficulty: ${difficulty}.
${languageInstruction}
Additional Notes: ${customPrompt || "Standard pattern"}.

CRITICAL JSON & LATEX RULES:
1. Return strictly valid JSON only.
2. Inside strings, do NOT use raw double quotes. Use single quotes for inner text.
3. Keep LaTeX backslashes safe and simple (e.g. "\\\\int", "\\\\frac").

Schema:
{
  "questions": [
    {
      "id": ${startIndex + 1},
      "question": "Question text here",
      "image_url": null,
      "diagram_svg": null,
      "options": ["Opt A", "Opt B", "Opt C", "Opt D"],
      "correct": 0,
      "explanation": "I. Explanation step 1"
    }
  ]
}`;

  const response = await fetch(window.SUPABASE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": window.SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ prompt: systemInstruction })
  });

  const rawHttpResponseText = await response.text();

  if (!response.ok || rawHttpResponseText.trim().startsWith("<") || rawHttpResponseText.toLowerCase().includes("request id")) {
    throw new Error(`Edge Gateway Timeout / Error (Status ${response.status}). Retrying batch...`);
  }

  let data;
  try {
    data = JSON.parse(rawHttpResponseText);
  } catch (e) {
    throw new Error("Invalid response envelope from Server.");
  }

  if (data.error) {
    let errMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
    throw new Error(errMsg);
  }

  let rawText = data.choices?.[0]?.message?.content || 
                data.candidates?.[0]?.content?.parts?.[0]?.text || 
                data.result || data.response || data.output || data.message || "";

  if (!rawText) throw new Error("Empty AI text received.");

  const parsed = safeParseJson(rawText);
  return parsed.questions || parsed.questions_data || [];
}

// Micro-batching generator (Batch size = 5 questions per API call)
async function generateAiQuiz() {
  const targetCategory = document.getElementById("targetCategory").value;
  const targetClass = document.getElementById("targetClass").value;
  const subject = document.getElementById("subjectSelect").value;
  const topic = document.getElementById("topicInput").value.trim();
  const count = parseInt(document.getElementById("questionsCount").value) || 10;
  const difficulty = document.getElementById("difficultySelect").value;
  const language = document.getElementById("languageSelect").value;
  const customPrompt = document.getElementById("customPrompt").value.trim();

  if (!topic) {
    alert("⚠️ Please enter a Chapter or Topic Name first!");
    return;
  }

  let languageInstruction = "";
  if (language === "Hindi") {
    languageInstruction = "STRICT LANGUAGE RULE: Write ALL questions in HINDI (Devanagari).";
  } else if (language === "English") {
    languageInstruction = "STRICT LANGUAGE RULE: Write ALL questions in English.";
  } else {
    languageInstruction = "STRICT LANGUAGE RULE: Write in Hinglish.";
  }

  const loaderBox = document.getElementById("loaderBox");
  const statusMsg = document.getElementById("statusMsg");
  const generateBtn = document.getElementById("generateBtn");

  loaderBox.style.display = "block";
  statusMsg.style.display = "block";
  statusMsg.className = "status-msg";
  generateBtn.disabled = true;

  // Ultra-Safe Micro Batching: 5 Questions per call
  const BATCH_SIZE = 5;
  let aggregatedQuestions = [];

  const metaParams = {
    targetCategory,
    targetClass,
    subject,
    topic,
    difficulty,
    languageInstruction,
    customPrompt
  };

  try {
    const totalBatches = Math.ceil(count / BATCH_SIZE);

    for (let b = 0; b < totalBatches; b++) {
      const currentBatchCount = Math.min(BATCH_SIZE, count - (b * BATCH_SIZE));
      const startIndex = b * BATCH_SIZE;

      statusMsg.innerText = `⏳ Generating Batch ${b + 1} of ${totalBatches} (${aggregatedQuestions.length}/${count} Qs Done)...`;

      let batchQuestions = [];
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          batchQuestions = await fetchBatchQuestions(currentBatchCount, startIndex, metaParams);
          if (batchQuestions && batchQuestions.length > 0) break;
        } catch (batchErr) {
          attempts++;
          console.warn(`Batch ${b + 1} attempt ${attempts} failed: ${batchErr.message}`);
          if (attempts >= maxAttempts) throw new Error(`Batch ${b + 1} failed after ${maxAttempts} retries.`);
        }
      }

      aggregatedQuestions = aggregatedQuestions.concat(batchQuestions);
    }

    // Assign Sequential IDs
    aggregatedQuestions = aggregatedQuestions.map((q, idx) => ({ ...q, id: idx + 1 }));

    // Shuffle options randomly
    aggregatedQuestions = shuffleQuizQuestions(aggregatedQuestions);

    const fullQuizPayload = {
      title: `${subject}: ${topic} Quiz (${aggregatedQuestions.length} Qs)`,
      target_class: targetClass,
      subject: subject,
      topic: topic,
      questions: aggregatedQuestions
    };

    generatedQuizData = fullQuizPayload;

    document.getElementById("finalTestTitle").value = fullQuizPayload.title;
    document.getElementById("jsonOutput").value = JSON.stringify(fullQuizPayload, null, 2);

    renderUiPreview(fullQuizPayload);

    document.getElementById("quizPreviewSection").style.display = "block";
    statusMsg.className = "status-msg success";
    statusMsg.innerText = `🎉 All ${aggregatedQuestions.length} questions generated successfully without errors!`;
    statusMsg.style.display = "block";

    document.getElementById("quizPreviewSection").scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error("AI Generation Error:", err);
    statusMsg.className = "status-msg error";
    statusMsg.innerText = "❌ Generation failed: " + err.message;
    statusMsg.style.display = "block";
  } finally {
    loaderBox.style.display = "none";
    generateBtn.disabled = false;
  }
}

// Save Published Quiz directly to Supabase Table ('tests')
async function saveQuizToSupabase() {
  if (!generatedQuizData) {
    alert("⚠️ Please generate a quiz first!");
    return;
  }

  const saveDbBtn = document.getElementById("saveDbBtn");
  const finalTitle = document.getElementById("finalTestTitle").value.trim();
  let jsonPayload = null;

  try {
    jsonPayload = JSON.parse(document.getElementById("jsonOutput").value);
  } catch (e) {
    alert("❌ Invalid JSON format in the text area!");
    return;
  }

  const statusMsg = document.getElementById("statusMsg");
  statusMsg.className = "status-msg";
  statusMsg.innerText = "Publishing quiz to Supabase database...";
  statusMsg.style.display = "block";
  saveDbBtn.disabled = true;

  const dbPayload = {
    title: finalTitle,
    class_level: document.getElementById("targetClass").value,
    subject: document.getElementById("subjectSelect").value,
    language: document.getElementById("languageSelect").value,
    time_limit_mins: parseInt(document.getElementById("timeLimitInput").value) || 15,
    marks_per_question: parseFloat(document.getElementById("marksPerQueInput").value) || 4,
    negative_marking: parseFloat(document.getElementById("negativeMarkInput").value) || 0,
    questions_data: jsonPayload.questions || jsonPayload.questions_data || jsonPayload,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await window.supabaseClient
      .from('tests')
      .insert([dbPayload]);

    if (error) throw error;

    statusMsg.className = "status-msg success";
    statusMsg.innerText = "🚀 Success! Test published live to Supabase!";
    alert("🎉 Test Database me successfully save ho gaya hai!");
    
    document.getElementById("quizPreviewSection").style.display = "none";
  } catch (err) {
    console.error("Database Save Error:", err);
    statusMsg.className = "status-msg error";
    statusMsg.innerText = "❌ Database Save Failed: " + err.message;
  } finally {
    saveDbBtn.disabled = false;
  }
}
