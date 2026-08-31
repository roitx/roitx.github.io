var allTests = [];
var currentPreviewTest = null;

// Page load hote hi Admin check hoga, uske baad hi tests fetch honge
window.onload = function() {
  checkAdminAuth();
};

// --- STRICT ADMIN AUTHENTICATION CHECK ---
async function checkAdminAuth() {
  var loaderBox = document.getElementById("loaderBox");
  var statusMsg = document.getElementById("statusMsg");

  if (!window.supabaseClient) {
    alert("❌ Supabase client initialize nahi hua hai!");
    window.location.href = "index.html";
    return;
  }

  try {
    // 1. Session check
    const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();
    
    if (sessionError || !session) {
      alert("⚠️ Unauthorized access! Kripya pehle Admin account se login karein.");
      window.location.href = "index.html";
      return;
    }

    // 2. Profile se Role verify karna
    const { data: profile, error: profileError } = await window.supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      alert("🚫 Access Denied! Sirf Admin hi is page ko access kar sakte hain.");
      window.location.href = "index.html";
      return;
    }

    // Authorization successful -> Tests fetch karo
    fetchPublishedTests();

  } catch (err) {
    console.error("Auth Check Error:", err);
    alert("❌ Security Check Error: " + err.message);
    window.location.href = "index.html";
  }
}

function fetchPublishedTests() {
  var loaderBox = document.getElementById("loaderBox");
  var testsContainer = document.getElementById("testsContainer");
  var statusMsg = document.getElementById("statusMsg");

  if (loaderBox) loaderBox.style.display = "block";
  if (testsContainer) testsContainer.innerHTML = "";
  if (statusMsg) statusMsg.style.display = "none";

  window.supabaseClient
    .from('tests')
    .select('*')
    .order('created_at', { ascending: false })
    .then(function(response) {
      if (loaderBox) loaderBox.style.display = "none";
      if (response.error) throw response.error;

      allTests = response.data || [];
      renderTests(allTests);
    })
    .catch(function(err) {
      console.error("Fetch Error:", err);
      if (loaderBox) loaderBox.style.display = "none";
      if (statusMsg) {
        statusMsg.className = "status-msg error";
        statusMsg.innerText = "❌ Database Error: " + err.message;
        statusMsg.style.display = "block";
      }
    });
}

function renderTests(tests) {
  var testsContainer = document.getElementById("testsContainer");
  if (!testsContainer) return;

  testsContainer.innerHTML = "";

  if (!tests || tests.length === 0) {
    testsContainer.innerHTML = '<p style="text-align:center; color:#718096; font-size:13px; padding:20px;">Koi published test nahi mila.</p>';
    return;
  }

  tests.forEach(function(test) {
    var qCount = Array.isArray(test.questions_data) ? test.questions_data.length : 0;
    var testCard = document.createElement("div");
    testCard.className = "test-item";
    testCard.innerHTML = 
      '<div class="test-info">' +
        '<h3>' + (test.title || 'Untitled Test') + '</h3>' +
        '<div class="test-badges">' +
          '<span class="badge">' + (test.class_level || 'General') + '</span>' +
          '<span class="badge">' + (test.subject || 'Subject') + '</span>' +
          '<span class="badge">' + qCount + ' Qs</span>' +
          '<span class="badge">' + (test.time_limit_mins || 15) + ' Mins</span>' +
        '</div>' +
      '</div>' +
      '<div style="display: flex; gap: 8px;">' +
        '<button class="btn-delete" title="Preview Test" onclick="openPreviewModal(\'' + test.id + '\')" style="color: #2b6cb0;">' +
          '<i class="fa-solid fa-eye"></i>' +
        '</button>' +
        '<button class="btn-delete" title="Edit Test Details" onclick="openEditModal(\'' + test.id + '\')" style="color: #4A00E0;">' +
          '<i class="fa-solid fa-pen-to-square"></i>' +
        '</button>' +
        '<button class="btn-delete" title="Delete Test" onclick="deleteTest(\'' + test.id + '\')">' +
          '<i class="fa-solid fa-trash-can"></i>' +
        '</button>' +
      '</div>';
    testsContainer.appendChild(testCard);
  });
}

// --- Smart Helper Function for Correct Option Key ---
function getCorrectIndex(q) {
  var val = q.correct !== undefined ? q.correct : (q.correctAnswer ?? q.ans ?? q.correct_option ?? 0);
  var parsed = parseInt(val);
  return isNaN(parsed) ? 0 : parsed;
}

// --- Preview Functionality ---
function openPreviewModal(testId) {
  var test = allTests.find(function(t) { return t.id === testId; });
  if (!test) return;

  currentPreviewTest = test;
  document.getElementById("previewTitle").innerText = "Preview: " + (test.title || "Untitled");
  document.getElementById("previewMeta").innerText = "Class: " + (test.class_level || 'N/A') + " | Subject: " + (test.subject || 'N/A') + " | Time: " + (test.time_limit_mins || 15) + " mins";

  var container = document.getElementById("previewQuestionsContainer");
  container.innerHTML = "";

  var questions = Array.isArray(test.questions_data) ? test.questions_data : [];
  if (questions.length === 0) {
    container.innerHTML = "<p style='color: #a0aec0; text-align: center;'>Is test me koi question add nahi hai.</p>";
  } else {
    questions.forEach(function(q, idx) {
      var qDiv = document.createElement("div");
      qDiv.style.cssText = "background: #ffffff; border-radius: 8px; padding: 12px; margin-bottom: 12px; border: 1px solid #e2e8f0; text-align: left;";
      
      var optionsHtml = "";
      var opts = q.options || q.opts || [];
      opts.forEach(function(opt, optIdx) {
        optionsHtml += 
          '<label style="display: flex; align-items: center; margin: 6px 0; font-size: 13px; cursor: pointer; color: #2d3748;">' +
            '<input type="radio" name="preview_q_' + idx + '" value="' + optIdx + '" style="margin-right: 8px;">' +
            '<span>' + opt + '</span>' +
          '</label>';
      });

      var correctIdx = getCorrectIndex(q);
      var correctText = opts[correctIdx] ? ' (' + opts[correctIdx] + ')' : '';

      qDiv.innerHTML = 
        '<p style="font-weight: 600; font-size: 14px; margin: 0 0 8px 0; color: #1a202c;">Q' + (idx + 1) + ': ' + (q.question || q.qText || q.title || '') + '</p>' +
        '<div>' + optionsHtml + '</div>' +
        '<p style="font-size: 12px; color: #38a169; font-weight: bold; margin-top: 8px;">Correct Answer: Option ' + (correctIdx + 1) + correctText + '</p>';
      
      container.appendChild(qDiv);
    });
  }

  document.getElementById("previewModal").style.display = "flex";
}

function closePreviewModal() {
  document.getElementById("previewModal").style.display = "none";
  currentPreviewTest = null;
}

// Preview test submit (Only shows score locally, does NOT write to database)
function submitTestPreview() {
  if (!currentPreviewTest) return;

  var questions = Array.isArray(currentPreviewTest.questions_data) ? currentPreviewTest.questions_data : [];
  var totalQuestions = questions.length;
  var correctCount = 0;

  questions.forEach(function(q, idx) {
    var selected = document.querySelector('input[name="preview_q_' + idx + '"]:checked');
    var correctIdx = getCorrectIndex(q);
    
    if (selected && parseInt(selected.value) === correctIdx) {
      correctCount++;
    }
  });

  var marksPerQ = currentPreviewTest.marks_per_question || 4;
  var score = correctCount * marksPerQ;
  var totalScore = totalQuestions * marksPerQ;

  alert("🧪 MOCK TEST PREVIEW RESULT\n\nCorrect: " + correctCount + "/" + totalQuestions + "\nScore: " + score + "/" + totalScore + "\n\n(Note: Ye safe preview hai, database me koi record save nahi hua.)");
}

// --- Search & Filter ---
function filterTests() {
  var searchInput = document.getElementById("searchInput");
  var filterSubject = document.getElementById("filterSubject");

  var searchVal = searchInput ? searchInput.value.toLowerCase() : "";
  var subjectVal = filterSubject ? filterSubject.value : "ALL";

  var filtered = allTests.filter(function(test) {
    var matchesSearch = (test.title || '').toLowerCase().indexOf(searchVal) !== -1;
    var matchesSubject = subjectVal === "ALL" || test.subject === subjectVal;
    return matchesSearch && matchesSubject;
  });

  renderTests(filtered);
}

// --- Edit Modal Controls ---
function openEditModal(testId) {
  var test = allTests.find(function(t) { return t.id === testId; });
  if (!test) return;

  document.getElementById("editTestId").value = test.id;
  document.getElementById("editTitle").value = test.title || '';
  document.getElementById("editClass").value = test.class_level || '';
  document.getElementById("editSubject").value = test.subject || '';
  document.getElementById("editTimeLimit").value = test.time_limit_mins || 15;
  document.getElementById("editMarks").value = test.marks_per_question || 4;

  document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
}

function saveTestChanges() {
  var testId = document.getElementById("editTestId").value;
  var newTitle = document.getElementById("editTitle").value.trim();
  var newClass = document.getElementById("editClass").value.trim();
  var newSubject = document.getElementById("editSubject").value.trim();
  var newTime = parseInt(document.getElementById("editTimeLimit").value) || 15;
  var newMarks = parseFloat(document.getElementById("editMarks").value) || 4;

  window.supabaseClient
    .from('tests')
    .update({
      title: newTitle,
      class_level: newClass,
      subject: newSubject,
      time_limit_mins: newTime,
      marks_per_question: newMarks
    })
    .eq('id', testId)
    .then(function(res) {
      if (res.error) throw res.error;
      alert("✅ Test updated successfully!");
      closeEditModal();
      fetchPublishedTests();
    })
    .catch(function(err) {
      alert("❌ Update error: " + err.message);
    });
}

// --- Delete Test ---
function deleteTest(testId) {
  if (!confirm("Kya aap sach me is test ko delete karna chahte hain?")) return;

  window.supabaseClient
    .from('tests')
    .delete()
    .eq('id', testId)
    .then(function(res) {
      if (res.error) throw res.error;
      allTests = allTests.filter(function(t) { return t.id !== testId; });
      filterTests();
      alert("🗑️ Test deleted!");
    })
    .catch(function(err) {
      alert("❌ Delete error: " + err.message);
    });
}
