const fClass = document.getElementById("fClass");
const fSubject = document.getElementById("fSubject");
const fChapter = document.getElementById("fChapter");
const formulaList = document.getElementById("formulaList");

async function loadFormulas() {
  formulaList.innerHTML = "⏳ Loading formulas...";

  let query = window.supabaseClient
    .from("formulas")
    .select("*")
    .eq("publish", true)
    .order("created_at", { ascending: false });

  if (fClass.value) query = query.eq("class", fClass.value);
  if (fSubject.value) query = query.eq("subject", fSubject.value);
  if (fChapter.value) query = query.eq("chapter", fChapter.value);

  const { data, error } = await query;

  if (error) {
    formulaList.innerHTML = "❌ Error loading formulas";
    console.error(error);
    return;
  }

  if (!data.length) {
    formulaList.innerHTML = "<em>No formulas found</em>";
    return;
  }

  formulaList.innerHTML = "";

  for (const f of data) {
    const card = document.createElement("div");
    card.className = "formula-card";

    let content = "";

    // TEXT
    if (f.type === "text") {
      content = `<div class="formula-text">${f.formula_text}</div>`;
    }

    // IMAGE
    if (f.type === "image") {
      const { data: urlData } =
        await window.supabaseClient.storage
          .from("admin-files")
          .createSignedUrl(f.file_path, 120);

      content = `<img src="${urlData.signedUrl}" class="formula-img">`;
    }

    // PDF
    if (f.type === "pdf") {
      const { data: urlData } =
        await window.supabaseClient.storage
          .from("admin-files")
          .createSignedUrl(f.file_path, 120);

      content = `<a class="pdf-btn" target="_blank" href="${urlData.signedUrl}">📄 Open PDF</a>`;
    }

    card.innerHTML = `
      <div class="formula-head">
        Class ${f.class} • ${f.subject} • ${f.chapter}
      </div>
      ${content}
    `;

    formulaList.appendChild(card);
  }
}

// AUTO LOAD
loadFormulas();