window.SUPABASE_FUNCTION_URL = window.SUPABASE_FUNCTION_URL || "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YXN0d2Vobm5xaWNyaWtuZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTk5NTEsImV4cCI6MjA4MDgzNTk1MX0.5_UvwaG0X8k_Emj-cMC0KjEqlvU6hgAt5IsHJdgARvk";

let generatedPyqData = null;

async function generatePyqFromAi() {
  const category = document.getElementById("pyqCategory").value;
  const subject = document.getElementById("pyqSubject").value;
  const topic = document.getElementById("pyqTopic").value.trim();
  const years = document.getElementById("pyqYears").value.trim();
  const count = document.getElementById("pyqCount").value;

  if (!topic) {
    alert("⚠️ Kripya Topic ya Chapter ka naam darj karein!");
    return;
  }

  const loaderBox = document.getElementById("loaderBox");
  const statusMsg = document.getElementById("statusMsg");
  const btn = document.getElementById("generatePyqBtn");

  loaderBox.style.display = "block";
  statusMsg.style.display = "none";
  btn.disabled = true;

  const prompt = `You are an expert board/competitive exam PYQ curator.
Generate exactly ${count} authentic/real Previous Year Questions (PYQs) for Exam: "${category}", Subject: "${subject}", Topic: "${topic}", asked between years ${years}.

STRICT REQUIREMENTS:
1. Respond ONLY in pure, valid JSON (No markdown syntax).
2. Each item MUST include: question, options, correct index (0-3), detailed solution/explanation, and specific year/exam tag (e.g., "BSEB 2022" or "JEE Main 2021").

JSON Schema:
{
  "title": "${subject}: ${topic} PYQs (${years})",
  "target_class": "${category}",
  "subject": "${subject}",
  "topic": "${topic}",
  "questions": [
    {
      "id": 1,
      "question": "Question text...",
      "options": ["A", "B", "C", "D"],
      "correct": 1,
      "year_tag": "BSEB 2023",
      "explanation": "Detailed step-by-step solution here..."
    }
  ]
}`;

  try {
    const res = await fetch(window.SUPABASE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": window.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ prompt: prompt })
    });

    const data = await res.json();
    let rawText = data.choices?.[0]?.message?.content || data.candidates?.[0]?.content?.parts?.[0]?.text || data.result || "";
    rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

    generatedPyqData = JSON.parse(rawText);

    document.getElementById("finalPyqTitle").value = generatedPyqData.title;
    renderPyqUiPreview(generatedPyqData);

    document.getElementById("pyqPreviewSection").style.display = "block";
    statusMsg.className = "status-msg success";
    statusMsg.innerText = "🎉 PYQs successfuly generated!";
    statusMsg.style.display = "block";
  } catch (err) {
    statusMsg.className = "status-msg error";
    statusMsg.innerText = "❌ Error: " + err.message;
    statusMsg.style.display = "block";
  } finally {
    loaderBox.style.display = "none";
    btn.disabled = false;
  }
}

function renderPyqUiPreview(data) {
  const container = document.getElementById("uiPyqPreview");
  container.innerHTML = "<h3><i class='fa-solid fa-eye'></i> PYQs Preview</h3>";

  (data.questions || []).forEach((q, idx) => {
    const item = document.createElement("div");
    item.style.cssText = "background:#fff; border:1px solid #e2e8f0; padding:12px; border-radius:8px; margin-bottom:10px; color:#2d3748;";
    item.innerHTML = `
      <p><strong>Q${idx + 1} (${q.year_tag || 'PYQ'}):</strong> ${q.question}</p>
      <p style="color:#276749; font-size:12px;"><strong>Answer:</strong> ${q.options[q.correct]} </p>
      <p style="color:#718096; font-size:11px;"><strong>Solution:</strong> ${q.explanation}</p>
    `;
    container.appendChild(item);
  });
}

async function savePyqToDatabase() {
  if (!generatedPyqData) return;
  const title = document.getElementById("finalPyqTitle").value.trim();

  const payload = {
    title: title,
    class_level: document.getElementById("pyqCategory").value,
    subject: document.getElementById("pyqSubject").value,
    topic: document.getElementById("pyqTopic").value,
    is_pyq: true,
    questions_data: generatedPyqData.questions,
    created_at: new Date().toISOString()
  };

  try {
    const { error } = await window.supabaseClient.from('pyq_sets').insert([payload]);
    if (error) throw error;
    alert("🚀 PYQ Set successfully database me publish ho gaya!");
    location.reload();
  } catch (err) {
    alert("❌ Failed to save: " + err.message);
  }
}
