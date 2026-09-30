// --- CENTRAL EDGE FUNCTION & SUPABASE AUTH CONFIG ---
window.SUPABASE_FUNCTION_URL = window.SUPABASE_FUNCTION_URL || "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YXN0d2Vobm5xaWNyaWtuZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTk5NTEsImV4cCI6MjA4MDgzNTk1MX0.5_UvwaG0X8k_Emj-cMC0KjEqlvU6hgAt5IsHJdgARvk";

let generatedQuizData = null;

// --- GLOBAL EVENT LISTENERS: DISABLE DBLCLICK & LONG-PRESS ---
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
    "Physics", "Chemistry", "Biology", "History", 
    "Political Science (Civics)", "Geography", "Economics", 
    "Mathematics", "Sanskrit", "Hindi", "English"
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
    let subjects = targetClass.includes("NEET") ? subjectData.neet : subjectData.jee;

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

// Render Preview UI
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
      optionsHtml += `
        <div style="display: flex; align-items: center; margin: 6px 0; font-size: 13px; color: ${isCorrect ? '#276749' : '#2d3748'}; font-weight: ${isCorrect ? 'bold' : 'normal'};">
          <span style="margin-right: 8px; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; background: ${isCorrect ? '#c6f6d5' : '#edf2f7'}; font-size: 11px;">
            ${String.fromCharCode(65 + optIdx)}
          </span>
          <span>${opt} ${isCorrect ? '✓' : ''}</span>
        </div>`;
    });

    let figureHtml = "";
    if (q.diagram_svg && q.diagram_svg.trim() !== "") {
      figureHtml = `<div style="margin: 10px 0; text-align: center; background: #fafafa; padding: 8px; border-radius: 6px; border: 1px dashed #cbd5e0; overflow-x: auto;">${q.diagram_svg}</div>`;
    } else if (q.image_url && q.image_url !== null) {
      figureHtml = `<div style="margin: 8px 0;"><img src="${q.image_url}" alt="Question Figure" style="max-width: 100%; max-height: 200px; border-radius: 6px; border: 1px solid #cbd5e0;" onError="this.style.display='none';"></div>`;
    }

    qDiv.innerHTML = `
      <p style="font-weight: 600; font-size: 14px; margin: 0 0 8px 0; color: #1a202c;">Q${idx + 1}: ${q.question || ''}</p>
      ${figureHtml}
      <div>${optionsHtml}</div>
      ${q.explanation ? `<div style="font-size: 12px; color: #4a5568; margin-top: 8px; background: #f7fafc; padding: 8px; border-radius: 6px; border-left: 3px solid #8E2DE2;"><strong>Explanation:</strong><div style="margin-top: 4px; white-space: pre-line;">${q.explanation}</div></div>` : ''}
    `;

    previewContainer.appendChild(qDiv);
  });

  if (window.MathJax && typeof window.MathJax.typeset === 'function') {
    window.MathJax.typeset();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const jsonArea = document.getElementById("jsonOutput");
  if (jsonArea) {
    jsonArea.addEventListener("input", () => {
      try {
        const parsed = JSON.parse(jsonArea.value);
        generatedQuizData = parsed;
        renderUiPreview(parsed);
      } catch (e) {}
    });
  }
});

// Helper Function: Robust Text Sanitization for LaTeX & Invalid JSON Characters
function cleanAndParseJson(rawText) {
  if (!rawText) throw new Error("Empty raw text received.");

  // Remove markdown code fence blocks
  let cleanStr = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Extract content strictly between first '{' and last '}'
  const firstBrace = cleanStr.indexOf('{');
  const lastBrace = cleanStr.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanStr = cleanStr.substring(firstBrace, lastBrace + 1);
  }

  // Sanitize invalid backslashes for Math/LaTeX inside string values
  cleanStr = cleanStr.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

  try {
    return JSON.parse(cleanStr);
  } catch (err) {
    console.error("JSON Parsing Failed on String:", cleanStr);
    throw new Error("Unable to parse AI response into valid JSON.");
  }
}

// Fetch Batch Questions with Strict Prompting
async function fetchBatchQuestions(batchSize, startIdx, config) {
  const { targetCategory, targetClass, subject, topic, difficulty, languageInstruction, customPrompt } = config;

  const systemInstruction = `STRICT SYSTEM ROLE: You are an API endpoint that outputs RAW JSON ONLY.
Generate EXACTLY ${batchSize} multiple choice questions for ${targetClass}, Subject: "${subject}", Topic: "${topic}".
Exam Level: ${targetCategory}, Difficulty: ${difficulty}.
${languageInstruction}
Custom Request: ${customPrompt || "Standard Exam Pattern"}.

FORMAT & ESCAPING RULES:
1. Return strictly JSON starting with { and ending with }.
2. NO intro text, NO conversational text like "Here are the questions", NO markdown codeblocks.
3. Math LaTeX formulas MUST use double backslashes (e.g. "\\\\int f(x) dx", "\\\\frac{a}{b}", "\\\\sqrt{x}"). Do not use unescaped single backslashes.

JSON STRUCTURE:
{
  "questions": [
    {
      "id": ${startIdx},
      "question": "Question text with double-escaped LaTeX",
      "image_url": null,
      "diagram_svg": null,
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Step-by-step solution"
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
    body: JSON.stringify({
      prompt: systemInstruction
    })
  });

  const data = await response.json();

  if (data.error) {
    let errMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
    throw new Error(errMsg);
  }

  let rawText = data.choices?.[0]?.message?.content || 
                data.candidates?.[0]?.content?.parts?.[0]?.text || 
                data.result || data.response || data.output || data.message || "";

  const parsedJson = cleanAndParseJson(rawText);
  return parsedJson.questions || parsedJson.questions_data || [];
}

// Generate AI Quiz in Batches
async function generateAiQuiz() {
  const targetCategory = document.getElementById("targetCategory").value;
  const targetClass = document.getElementById("targetClass").value;
  const subject = document.getElementById("subjectSelect").value;
  const topic = document.getElementById("topicInput").value.trim();
  const totalCount = parseInt(document.getElementById("questionsCount").value);
  const difficulty = document.getElementById("difficultySelect").value;
  const language = document.getElementById("languageSelect").value;
  const customPrompt = document.getElementById("customPrompt").value.trim();

  if (!topic) {
    alert("⚠️ Please enter a Chapter or Topic Name first!");
    return;
  }

  let languageInstruction = "";
  if (language === "Hindi") {
    languageInstruction = "STRICT LANGUAGE RULE: Write questions, options, and explanations in clean Devanagari HINDI.";
  } else if (language === "English") {
    languageInstruction = "STRICT LANGUAGE RULE: Write in standard English.";
  } else {
    languageInstruction = "STRICT LANGUAGE RULE: Write in Hinglish (Roman Hindi + English technical terms).";
  }

  const loaderBox = document.getElementById("loaderBox");
  const loaderText = document.getElementById("loaderText");
  const statusMsg = document.getElementById("statusMsg");
  const generateBtn = document.getElementById("generateBtn");

  loaderBox.style.display = "block";
  statusMsg.style.display = "none";
  generateBtn.disabled = true;

  const config = { targetCategory, targetClass, subject, topic, difficulty, languageInstruction, customPrompt };
  
  let allQuestions = [];
  const BATCH_SIZE = 10; // Batch size of 10 keeps LaTeX generation safe from context truncation

  try {
    for (let current = 0; current < totalCount; current += BATCH_SIZE) {
      const currentBatchSize = Math.min(BATCH_SIZE, totalCount - current);
      const startIdx = current + 1;

      if (loaderText) {
        loaderText.innerText = `Processing questions ${startIdx} to ${startIdx + currentBatchSize - 1} of ${totalCount}...`;
      }

      const batchQuestions = await fetchBatchQuestions(currentBatchSize, startIdx, config);
      if (Array.isArray(batchQuestions) && batchQuestions.length > 0) {
        allQuestions = allQuestions.concat(batchQuestions);
      } else {
        throw new Error(`Batch starting at index ${startIdx} returned empty or invalid question structure.`);
      }
    }

    // Assign sequential IDs
    allQuestions.forEach((q, index) => {
      q.id = index + 1;
    });

    let shuffledQuestions = shuffleQuizQuestions(allQuestions);

    const finalResult = {
      title: `${subject}: ${topic} Quiz (${shuffledQuestions.length} Qs)`,
      target_class: targetClass,
      subject: subject,
      topic: topic,
      questions: shuffledQuestions
    };

    generatedQuizData = finalResult;

    document.getElementById("finalTestTitle").value = finalResult.title;
    document.getElementById("jsonOutput").value = JSON.stringify(finalResult, null, 2);

    renderUiPreview(finalResult);

    document.getElementById("quizPreviewSection").style.display = "block";
    statusMsg.className = "status-msg success";
    statusMsg.innerText = `🎉 Successfully generated all ${shuffledQuestions.length} questions without errors!`;
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

// Save Published Quiz directly to Supabase
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
