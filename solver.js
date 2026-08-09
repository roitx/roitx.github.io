/* =====================================================
   PART 6 — STEP BY STEP SOLVER (WITH GROQ AI FALLBACK)
   ===================================================== */

async function solveWithGroq(questionText) {
  setAnswer("⏳ AI Step-by-Step Solution तैयार कर रहा है...");

  const SUPABASE_FUNCTION_URL = "https://ktastwehnnqicriknewr.supabase.co/functions/v1/smart-task";
  
  // Apni Supabase Public Anon Key yahan rakhein
  const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE"; 

  const promptText = `
You are an expert tutor for students. 
Please solve this question step-by-step with clear explanations in simple Hindi/Hinglish.
If it involves math or science, explain each step clearly.

Question: ${questionText}
`;

  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ prompt: promptText })
    });

    const data = await response.json();

    if (response.ok && data.choices && data.choices[0]?.message?.content) {
      const formattedAnswer = data.choices[0].message.content.replace(/\n/g, "<br>");
      setAnswer(`
        <div class="ai-solution">
          <b>🧠 AI Step-by-Step Solution:</b><br><br>
          ${formattedAnswer}
        </div>
      `);
    } else {
      showFallbackAdminButton();
    }
  } catch (err) {
    console.error(err);
    showFallbackAdminButton();
  }
}

function showFallbackAdminButton() {
  setAnswer(`
    ❌ Auto solution available nahi hai.<br><br>
    <button onclick="sendToAdmin()">📩 Send to Admin</button>
  `);
}

function solve() {
  const qRaw = getQuestion();
  setAnswer("");

  if (!qRaw) {
    setAnswer("❌ Question likho pehle");
    return;
  }

  let q = qRaw
    .toLowerCase()
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\s+/g, " ")
    .trim();

  /* ---------- SIMPLE CALCULATION ---------- */
  if (/^[0-9+\-*/(). ]+$/.test(q)) {
    try {
      const result = eval(q);
      setAnswer(`
        <div class="step"><b>Step 1:</b> ${q}</div>
        <div class="step"><b>Step 2:</b> BODMAS apply</div>
        <div class="step final"><b>✅ Answer:</b> ${result}</div>
      `);
      return;
    } catch {}
  }

  /* ---------- PERCENTAGE ---------- */
  if (/^(\d+)\s*%\s*of\s*(\d+)$/.test(q)) {
    const [, p, n] = q.match(/^(\d+)\s*%\s*of\s*(\d+)$/);
    setAnswer(`<b>Answer:</b> ${(p/100)*n}`);
    return;
  }

  /* ---------- LINEAR EQUATION ---------- */
  if (/^(\d*)x\s*([\+\-])\s*(\d+)\s*=\s*(\d+)$/.test(q)) {
    const [, a1, op, b, c] = q.match(/^(\d*)x\s*([\+\-])\s*(\d+)\s*=\s*(\d+)$/);
    const a = a1 === "" ? 1 : Number(a1);
    const rhs = op === "+" ? c - b : Number(c) + Number(b);

    setAnswer(`<b>Answer:</b> x = ${rhs / a}`);
    return;
  }

  /* ---------- GROQ AI FALLBACK ---------- */
  solveWithGroq(qRaw);
}
