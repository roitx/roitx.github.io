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
    "Mathematics", 
    "Science (Physics/Chem/Bio)", 
    "Social Science (SST)", 
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
    
    // Initial dropdown setup call
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
      // Class 9th & 10th
      streamGroup.style.display = "none";
      subjectData.class9_10.forEach(sub => {
        const opt = document.createElement("option");
        opt.value = sub;
        opt.innerText = sub;
        subjectSelect.appendChild(opt);
      });
    }
  } else {
    // Competitive Exams (JEE / NEET)
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

// Smart Helper Function to Extract Correct Index
function getCorrectIndex(q) {
  var val = q.correct !== undefined ? q.correct : (q.correctAnswer ?? q.ans ?? q.correct_option ?? 0);
  var parsed = parseInt(val);
  return isNaN(parsed) ? 0 : parsed;
}

// Function to Shuffle Options & Randomize Correct Index
function shuffleQuizQuestions(questions) {
  if (!Array.isArray(questions)) return [];

  return questions.map((q) => {
    let originalOpts = [...(q.options || q.opts || [])];
    let correctIdx = getCorrectIndex(q);
    let correctAnswerValue = originalOpts[correctIdx];

    // Fisher-Yates Random Shuffle
    let shuffledOpts = [...originalOpts];
    for (let i = shuffledOpts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOpts[i], shuffledOpts[j]] = [shuffledOpts[j], shuffledOpts[i]];
    }

    // Find new correct index
    let newCorrectIdx = shuffledOpts.indexOf(correctAnswerValue);

    return {
      ...q,
      options: shuffledOpts,
      correct: newCorrectIdx !== -1 ? newCorrectIdx : 0
    };
  });
}

// Render Visual Preview directly in the UI
function renderUiPreview(parsedJson) {
  let previewContainer = document.getElementById("uiQuestionsPreview");
  if (!previewContainer) {
    // Dynamically inject visual preview container above JSON Box if not present in HTML
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

    qDiv.innerHTML = `
      <p style="font-weight: 600; font-size: 14px; margin: 0 0 8px 0; color: #1a202c;">Q${idx + 1}: ${q.question || ''}</p>
      <div>${optionsHtml}</div>
      ${q.explanation ? `<p style="font-size: 11px; color: #718096; margin-top: 6px; background: #f7fafc; padding: 6px; border-radius: 4px;"><strong>Explanation:</strong> ${q.explanation}</p>` : ''}
    `;

    previewContainer.appendChild(qDiv);
  });
}

// Sync Preview when JSON Textarea is edited manually
document.addEventListener("DOMContentLoaded", () => {
  const jsonArea = document.getElementById("jsonOutput");
  if (jsonArea) {
    jsonArea.addEventListener("input", () => {
      try {
        const parsed = JSON.parse(jsonArea.value);
        generatedQuizData = parsed;
        renderUiPreview(parsed);
      } catch (e) {
        // Suppress parse errors while typing
      }
    });
  }
});

// Generate AI Quiz via Supabase Edge Function Engine
async function generateAiQuiz() {
  const targetCategory = document.getElementById("targetCategory").value;
  const targetClass = document.getElementById("targetClass").value;
  const subject = document.getElementById("subjectSelect").value;
  const topic = document.getElementById("topicInput").value.trim();
  const count = document.getElementById("questionsCount").value;
  const difficulty = document.getElementById("difficultySelect").value;
  const customPrompt = document.getElementById("customPrompt").value.trim();

  if (!topic) {
    alert("⚠️ Please enter a Chapter or Topic Name first!");
    return;
  }

  const loaderBox = document.getElementById("loaderBox");
  const statusMsg = document.getElementById("statusMsg");
  const generateBtn = document.getElementById("generateBtn");

  loaderBox.style.display = "block";
  statusMsg.style.display = "none";
  generateBtn.disabled = true;

  const systemInstruction = `You are an expert exam paper setter for ${targetClass}.
Generate a high-quality MCQ Quiz with exactly ${count} questions for Subject: "${subject}", Topic: "${topic}".
Exam Type: ${targetCategory}.
Difficulty Level: ${difficulty}.
Additional Notes: ${customPrompt || "Follow exact official latest exam syllabus pattern"}.

STRICT REQUIREMENTS:
1. Respond ONLY with pure, valid JSON. No markdown backticks, no markdown codeblock wrapper, and no introductory text.
2. RANDOMIZE THE CORRECT OPTION INDEX! The "correct" field must be evenly distributed among index values 0, 1, 2, and 3 across questions.

JSON Format Schema:
{
  "title": "${subject}: ${topic} Quiz (${count} Qs)",
  "target_class": "${targetClass}",
  "subject": "${subject}",
  "topic": "${topic}",
  "questions": [
    {
      "id": 1,
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 2,
      "explanation": "Detailed step-by-step solution"
    }
  ]
}`;

  try {
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

    if (!rawText) {
      throw new Error("Empty response received from Edge AI Function.");
    }

    rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

    const parsedJson = JSON.parse(rawText);

    // Auto Shuffle Options & Correct Answer Index
    if (parsedJson.questions && Array.isArray(parsedJson.questions)) {
      parsedJson.questions = shuffleQuizQuestions(parsedJson.questions);
    }

    generatedQuizData = parsedJson;

    document.getElementById("finalTestTitle").value = parsedJson.title || `${subject}: ${topic} Quiz`;
    document.getElementById("jsonOutput").value = JSON.stringify(parsedJson, null, 2);

    // Render Live Preview Section inside Generator UI
    renderUiPreview(parsedJson);

    document.getElementById("quizPreviewSection").style.display = "block";
    statusMsg.className = "status-msg success";
    statusMsg.innerText = "🎉 Quiz generated successfully via Gemini Edge AI!";
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

  // Database Schema Payload
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
    
    // Auto reset preview section
    document.getElementById("quizPreviewSection").style.display = "none";
  } catch (err) {
    console.error("Database Save Error:", err);
    statusMsg.className = "status-msg error";
    statusMsg.innerText = "❌ Database Save Failed: " + err.message;
  } finally {
    saveDbBtn.disabled = false;
  }
}
