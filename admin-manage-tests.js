var allTests = [];
var currentPreviewTest = null;

// Page load hote hi Admin check hoga, uske baad hi tests fetch honge
window.addEventListener('DOMContentLoaded', async function() {
  await checkAdminAuth();
});

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
    // Priority 1: Check via global helper if available
    if (typeof window.requireAdminAuth === "function") {
      try {
        await window.requireAdminAuth();
        fetchPublishedTests();
        return;
      } catch (e) {
        console.warn("Global admin helper failed, falling back to manual check:", e);
      }
    }

    // Priority 2: Direct Session Check with getUser() Fallback
    let currentUser = null;
    
    const { data: sessionData } = await window.supabaseClient.auth.getSession();
    if (sessionData && sessionData.session) {
      currentUser = sessionData.session.user;
    } else {
      const { data: userData } = await window.supabaseClient.auth.getUser();
      if (userData && userData.user) {
        currentUser = userData.user;
      }
    }

    if (!currentUser) {
      alert("⚠️ Unauthorized access! Kripya pehle Admin account se login karein.");
      window.location.href = "login.html";
      return;
    }

    // Role verification from database
    let isAdmin = false;
    if (typeof window.checkIsAdmin === 'function') {
      isAdmin = await window.checkIsAdmin();
    } else {
      const { data: profile, error: profileError } = await window.supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (!profileError && profile && profile.role === 'admin') {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      alert("🚫 Access Denied! Sirf Admin hi is page ko access kar sakte hain.");
      window.location.href = "profile.html";
      return;
    }

    // Authorization successful -> Tests fetch karo
    fetchPublishedTests();

  } catch (err) {
    console.error("Auth Check Error:", err);
    alert("❌ Security Check Error: " + err.message);
    window.location.href = "login.html";
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
      populateDynamicFilters(allTests);
      filterTests(); // Auto filter & render initial list
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

// --- DYNAMICALLY GENERATE FILTER OPTIONS (Like tests.js) ---
function populateDynamicFilters(tests) {
  var classSelect = document.getElementById("filterClass");
  var subjectSelect = document.getElementById("filterSubject");

  var classes = new Set();
  var subjects = new Set();

  tests.forEach(function(test) {
    if (test.class_level) classes.add(test.class_level.trim());
    if (test.subject) subjects.add(test.subject.trim());
  });

  if (classSelect) {
    var classHtml = '<option value="ALL">All Classes</option>';
    classes.forEach(function(c) {
      classHtml += '<option value="' + c + '">' + c + '</option>';
    });
    classSelect.innerHTML = classHtml;
  }

  if (subjectSelect) {
    var subjectHtml = '<option value="ALL">All Subjects</option>';
    subjects.forEach(function(s) {
      subjectHtml += '<option value="' + s + '">' + s + '</option>';
    });
    subjectSelect.innerHTML = subjectHtml;
  }
}

// --- SMART MULTI-FILTER LOGIC (Search + Class + Subject) ---
function filterTests() {
  var searchInput = document.getElementById("searchInput");
  var filterClass = document.getElementById("filterClass");
  var filterSubject = document.getElementById("filterSubject");

  var searchVal = searchInput ? searchInput.value.toLowerCase().trim() : "";
  var classVal = filterClass ? filterClass.value.toLowerCase().trim() : "all";
  var subjectVal = filterSubject ? filterSubject.value.toLowerCase().trim() : "all";

  var filtered = allTests.filter(function(test) {
    var testTitle = (test.title || '').toLowerCase();
    var testClassLevel = (test.class_level || '').toLowerCase();
    var testSubject = (test.subject || '').toLowerCase();

    // 1. Search Query Match
    var matchesSearch = searchVal === "" || testTitle.indexOf(searchVal) !== -1 || testClassLevel.indexOf(searchVal) !== -1;

    // 2. Class Filter Match
    var matchesClass = (classVal === "all" || classVal === "") || testClassLevel === classVal || testClassLevel.indexOf(classVal) !== -1;

    // 3. Subject Filter Match
    var matchesSubject = (subjectVal === "all" || subjectVal === "") || testSubject === subjectVal;

    return matchesSearch && matchesClass && matchesSubject;
  });

  renderTests(filtered);
}

function renderTests(tests) {
  var testsContainer = document.getElementById("testsContainer");
  if (!testsContainer) return;

  testsContainer.innerHTML = "";

  if (!tests || tests.length === 0) {
    testsContainer.innerHTML = '<p style="text-align:center; color:#718096; font-size:13px; padding:20px;">Koi matching test nahi mila.</p>';
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
