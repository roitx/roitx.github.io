window.SUPABASE_FUNCTION_URL = window.SUPABASE_FUNCTION_URL || "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YXN0d2Vobm5xaWNyaWtuZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNTk5NTEsImV4cCI6MjA4MDgzNTk1MX0.5_UvwaG0X8k_Emj-cMC0KjEqlvU6hgAt5IsHJdgARvk";

let tempQuestions = null;

async function generateBilingualPYQs() {
  const exam = document.getElementById("examTarget").value;
  const qType = document.getElementById("qType").value;
  const subject = document.getElementById("subject").value.trim();
  const topic = document.getElementById("topic").value.trim();
  const years = document.getElementById("yearRange").value.trim();
  const count = document.getElementById("qCount").value;
  const statusBox = document.getElementById("statusBox");
  const btn = document.getElementById("genBtn");

  if (!subject || !topic) {
    alert("⚠️ Subject aur Topic dono bharna zaroori hai!");
    return;
  }

  btn.disabled = true;
  statusBox.className = "status info";
  statusBox.innerText = "⏳ Gemini AI se English questions + Hindi explanations fetch ho rahe hain...";
  statusBox.style.display = "block";

  const prompt = `Generate exactly ${count} authentic ${qType} asked in Exam: "${exam}", Subject: "${subject}", Topic: "${topic}" between years ${years}.

STRICT REQUIREMENTS:
1. Provide the main Question and Answer in English.
2. Provide a clear Hindi translation/explanation (हिंदी व्याख्या) for BOTH question and answer.
3. Return ONLY valid raw JSON array without markdown code fences.

JSON Format Structure:
[
  {
    "question_en": "What does Mahatma Gandhi say about Indian civilization?",
    "question_hi": "महात्मा गांधी भारतीय सभ्यता के बारे में क्या कहते हैं?",
    "marks": "5 Marks",
    "year_tag": "${exam} 2021",
    "answer_en": "Mahatma Gandhi says that Indian civilization elevates the moral being...",
    "answer_hi": "महात्मा गांधी कहते हैं कि भारतीय सभ्यता नैतिक मूल्य को बढ़ावा देती है..."
  }
]`;

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

    const textResponse = await res.text();
    let parsedData = JSON.parse(textResponse);
    let rawText = parsedData.choices?.[0]?.message?.content || parsedData.candidates?.[0]?.content?.parts?.[0]?.text || parsedData.result || textResponse;
    
    rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

    tempQuestions = JSON.parse(rawText);

    renderPreview(tempQuestions);
    statusBox.className = "status success";
    statusBox.innerText = "✅ English + Hindi Bilingual PYQs Ready!";
    document.getElementById("reviewArea").style.display = "block";
  } catch (err) {
    statusBox.className = "status error";
    statusBox.innerText = "❌ Error: " + err.message;
  } finally {
    btn.disabled = false;
  }
}

function renderPreview(list) {
  const container = document.getElementById("previewList");
  container.innerHTML = "";
  list.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "preview-card";
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span style="color:#38bdf8; font-weight:bold; font-size:12px;">${q.year_tag || 'PYQ'}</span>
        <span style="color:#f59e0b; font-weight:bold; font-size:12px;">${q.marks || ''}</span>
      </div>
      <p style="font-size:14px; font-weight:bold; color:#fff;">Q${i+1}. ${q.question_en}</p>
      <p style="font-size:12px; color:#94a3b8; margin-top:2px;">(हिंदी: ${q.question_hi || ''})</p>
      <div style="font-size:12px; color:#cbd5e1; margin-top:8px; background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; white-space:pre-line;">
        <strong style="color:#10b981;">English Ans:</strong> ${q.answer_en}<br><br>
        <strong style="color:#38bdf8;">हिंदी अर्थ:</strong> ${q.answer_hi}
      </div>
    `;
    container.appendChild(div);
  });
}

async function publishToDatabase() {
  if (!tempQuestions) return;

  const exam = document.getElementById("examTarget").value;
  const subject = document.getElementById("subject").value.trim();
  const topic = document.getElementById("topic").value.trim();
  const years = document.getElementById("yearRange").value.trim();

  try {
    const { error } = await window.supabaseClient
      .from('pyq_database')
      .insert([{
        title: `${subject}: ${topic} (${years})`,
        exam_target: exam,
        subject: subject,
        topic: topic,
        years_range: years,
        questions: tempQuestions
      }]);

    if (error) throw error;

    alert("🚀 Successfully Publish Ho Gaya!");
    location.reload();
  } catch (err) {
    alert("❌ Save Error: " + err.message);
  }
}
