var allTests = [];
var currentPreviewTest = null;

// Subject Mapping Configuration
const editSubjectData = {
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

window.addEventListener('DOMContentLoaded', async function() {
  await checkAdminAuth();
  fetchBugReportsCount();
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
    if (typeof window.requireAdminAuth === "function") {
      try {
        await window.requireAdminAuth();
        fetchPublishedTests();
        return;
      } catch (e) {
        console.warn("Global admin helper failed, falling back to manual check:", e);
      }
    }

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
      filterTests();
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

    var matchesSearch = searchVal === "" || testTitle.indexOf(searchVal) !== -1 || testClassLevel.indexOf(searchVal) !== -1;
    var matchesClass = (classVal === "all" || classVal === "") || testClassLevel === classVal || testClassLevel.indexOf(classVal) !== -1;
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

function getCorrectIndex(q) {
  var val = q.correct !== undefined ? q.correct : (q.correctAnswer ?? q.ans ?? q.correct_option ?? 0);
  var parsed = parseInt(val);
  return isNaN(parsed) ? 0 : parsed;
}

// --- DYNAMIC DROPDOWNS FOR EDIT MODAL ---
function updateEditSubCategories() {
  const category = document.getElementById("editCategory").value;
  const classSelect = document.getElementById("editClass");
  classSelect.innerHTML = "";

  if (category === "board") {
    classSelect.innerHTML = `
      <option value="Class 12th Bihar Board">Class 12th (Bihar Board)</option>
      <option value="Class 12th CBSE">Class 12th (CBSE)</option>
      <option value="Class 11th Bihar Board">Class 11th (Bihar Board)</option>
      <option value="Class 11th CBSE">Class 11th (CBSE)</option>
      <option value="Class 10th Board">Class 10th (Board)</option>
      <option value="Class 9th">Class 9th</option>
    `;
  } else {
    classSelect.innerHTML = `
      <option value="NEET UG">NEET UG (Medical)</option>
      <option value="JEE Main">JEE Main</option>
      <option value="JEE Advanced">JEE Advanced</option>
    `;
  }
  updateEditSubjectOptions();
}

function updateEditSubjectOptions() {
  const category = document.getElementById("editCategory").value;
  const targetClass = document.getElementById("editClass").value;
  const streamGroup = document.getElementById("editStreamGroup");
  const streamSelect = document.getElementById("editStream");
  const subjectSelect = document.getElementById("editSubject");

  subjectSelect.innerHTML = "";

  if (category === "board") {
    if (targetClass.includes("11th") || targetClass.includes("12th")) {
      streamGroup.style.display = "block";
      const selectedStream = streamSelect.value;
      const subjects = editSubjectData.class11_12[selectedStream] || [];
      subjects.forEach(sub => {
        const opt = document.createElement("option");
        opt.value = sub;
        opt.innerText = sub;
        subjectSelect.appendChild(opt);
      });
    } else {
      streamGroup.style.display = "none";
      editSubjectData.class9_10.forEach(sub => {
        const opt = document.createElement("option");
        opt.value = sub;
        opt.innerText = sub;
        subjectSelect.appendChild(opt);
      });
    }
  } else {
    streamGroup.style.display = "none";
    let subjects = targetClass.includes("NEET") ? editSubjectData.neet : editSubjectData.jee;
    subjects.forEach(sub => {
      const opt = document.createElement("option");
      opt.value = sub;
      opt.innerText = sub;
      subjectSelect.appendChild(opt);
    });
  }
}

// --- OPEN FULL EDIT MODAL ---
function openEditModal(testId) {
  var test = allTests.find(function(t) { return t.id === testId; });
  if (!test) return;

  document.getElementById("editTestId").value = test.id;
  document.getElementById("editTitle").value = test.title || '';
  
  const isCompetitive = (test.class_level || '').includes("JEE") || (test.class_level || '').includes("NEET");
  document.getElementById("editCategory").value = isCompetitive ? "competitive" : "board";
  
  updateEditSubCategories();

  if (test.class_level) {
    document.getElementById("editClass").value = test.class_level;
  }
  
  updateEditSubjectOptions();

  if (test.subject) {
    document.getElementById("editSubject").value = test.subject;
  }

  if (test.language) {
    document.getElementById("editLanguage").value = test.language;
  }

  document.getElementById("editTimeLimit").value = test.time_limit_mins || 15;
  document.getElementById("editMarks").value = test.marks_per_question || 4;
  document.getElementById("editNegativeMark").value = test.negative_marking || 0;

  document.getElementById("editQuestionsJson").value = JSON.stringify(test.questions_data || [], null, 2);

  document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
}

// --- SAVE ALL UPDATED FIELDS TO SUPABASE ---
function saveTestChanges() {
  var testId = document.getElementById("editTestId").value;
  var newTitle = document.getElementById("editTitle").value.trim();
  var newClass = document.getElementById("editClass").value;
  var newSubject = document.getElementById("editSubject").value;
  var newLanguage = document.getElementById("editLanguage").value;
  var newTime = parseInt(document.getElementById("editTimeLimit").value) || 15;
  var newMarks = parseFloat(document.getElementById("editMarks").value) || 4;
  var newNegative = parseFloat(document.getElementById("editNegativeMark").value) || 0;

  var updatedQuestions = null;
  try {
    updatedQuestions = JSON.parse(document.getElementById("editQuestionsJson").value);
  } catch (e) {
    alert("❌ Invalid JSON format in Questions Payload!");
    return;
  }

  window.supabaseClient
    .from('tests')
    .update({
      title: newTitle,
      class_level: newClass,
      subject: newSubject,
      language: newLanguage,
      time_limit_mins: newTime,
      marks_per_question: newMarks,
      negative_marking: newNegative,
      questions_data: updatedQuestions
    })
    .eq('id', testId)
    .then(function(res) {
      if (res.error) throw res.error;
      alert("✅ Test details & Questions updated successfully!");
      closeEditModal();
      fetchPublishedTests();
    })
    .catch(function(err) {
      alert("❌ Update error: " + err.message);
    });
}

// --- PREVIEW MODAL FUNCTIONS ---
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

// --- ADMIN BUG REPORTS MANAGER ---
async function fetchBugReportsCount() {
  if (!window.supabaseClient) return;
  try {
    const { count, error } = await window.supabaseClient
      .from('bug_reports')
      .select('*', { count: 'exact', head: true });
    
    if (!error && count > 0) {
      const badge = document.getElementById('bugBadge');
      if (badge) {
        badge.innerText = count;
        badge.style.display = 'flex';
      }
    }
  } catch(e) {
    console.warn("Bug reports count error:", e);
  }
}

async function openBugReportsModal() {
  document.getElementById("bugReportsModal").style.display = "flex";
  const container = document.getElementById("bugReportsContainer");
  container.innerHTML = `<p style="text-align: center; color: #8E2DE2; font-weight: 600;"><i class="fa-solid fa-spinner fa-spin"></i> Fetching reports...</p>`;

  try {
    const { data: reports, error } = await window.supabaseClient
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!reports || reports.length === 0) {
      container.innerHTML = `<p style="text-align: center; color: #10b981; font-weight: 600; padding: 20px;">🎉 Koi bug report nahi mili!</p>`;
      return;
    }

    let html = "";
    reports.forEach(r => {
      html += `
        <div style="background: #ffffff; border-radius: 12px; padding: 14px; border: 1px solid #cbd5e1; position: relative;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px; display: flex; justify-content: space-between;">
            <span>Test ID: <b>${r.test_id || 'N/A'}</b> | Q Index: <b>${(r.question_index ?? 0) + 1}</b></span>
            <span>${new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          <p style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">Q: ${r.question_text || 'No Text'}</p>
          <p style="font-size: 12.5px; color: #dc2626; background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 8px;">
            <b>Issue:</b> ${r.issue_description}
          </p>
          <button onclick="resolveBugReport(${r.id})" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
            <i class="fa-solid fa-check"></i> Mark Resolved
          </button>
        </div>
      `;
    });
    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `<p style="color: #ef4444; text-align: center;">Error loading reports: ${err.message}</p>`;
  }
}

function closeBugReportsModal() {
  document.getElementById("bugReportsModal").style.display = "none";
}

async function resolveBugReport(reportId) {
  if (!confirm("Is bug report ko resolve karke delete karna chahte hain?")) return;
  try {
    await window.supabaseClient.from('bug_reports').delete().eq('id', reportId);
    openBugReportsModal();
    fetchBugReportsCount();
  } catch (err) {
    alert("Error deleting report: " + err.message);
  }
}
