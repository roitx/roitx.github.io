let currentTest = null, questions = [], currentIndex = 0;
let userAnswers = {}, reviewStatus = {};
let currentPaletteView = 'grid';
let currentResultPaletteView = 'grid';
let timerInterval = null, isTimerPaused = false;
let totalTimeLimitSec = 0, timeRemaining = 0, totalTimeSpentSec = 0;
let currentFilter = 'all';
let currentMode = 'quiz';
let currentAnalysisFilter = 'all';
let currentUserProfile = null;
let isSubmitted = false;

let chartBrief = null, chartAccuracy = null, chartScore = null;

function initTheme() {
    const savedTheme = localStorage.getItem('theme_preference') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = savedTheme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme_preference', newTheme);
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = newTheme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// LIVE NETWORK MONITORING
function setupNetworkMonitor() {
    const banner = document.getElementById('offlineBanner');
    function updateOnlineStatus() {
        if (!navigator.onLine) {
            if (banner) banner.style.display = 'block';
        } else {
            if (banner) banner.style.display = 'none';
        }
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
}

// KEYBOARD NAVIGATION SETUP
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (isSubmitted || (document.getElementById('testArea') && document.getElementById('testArea').style.display === 'none')) return;
        
        // Ignore if user is typing in a prompt or input
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            navigateQuestion(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            handleNextOrSubmit();
        }
    });
}

// DYNAMIC MATHJAX RE-RENDER FUNCTION
function renderMathJax() {
    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
        window.MathJax.typesetPromise().catch((err) => console.warn('MathJax Typeset Error:', err));
    }
}

window.addEventListener('DOMContentLoaded', async function() {
    initTheme();
    setupNetworkMonitor();
    setupKeyboardNavigation();
    await fetchUserProfile();

    const urlParams = new URLSearchParams(window.location.search);
    const testId = urlParams.get('id') || urlParams.get('testid');
    const urlMode = urlParams.get('mode');

    if (urlMode === 'practice' || urlMode === 'quiz') {
        currentMode = urlMode;
    }
    const modeSelector = document.getElementById('modeSelector');
    if (modeSelector) modeSelector.value = currentMode;

    if (testId) { await loadTestDetails(testId); } 
    else { loadDummyTest(); }
});

async function fetchUserProfile() {
    if (!window.supabaseClient) return;
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (user) {
            const { data } = await window.supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (data) currentUserProfile = data;
        }
    } catch (e) {
        console.warn("Could not fetch user profile:", e);
    }
}

function getDraftStorageKey() {
    return currentTest ? `test_draft_${currentTest.id}` : 'test_draft_demo';
}

async function saveProgressToSupabase(draftData) {
    if (isSubmitted || !window.supabaseClient || !currentTest || currentTest.id === 'demo_test') return;
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user || isSubmitted) return;

        await window.supabaseClient
            .from('test_progress')
            .upsert({
                user_id: user.id,
                test_id: currentTest.id,
                user_answers: draftData.userAnswers,
                review_status: draftData.reviewStatus,
                time_remaining: draftData.timeRemaining,
                total_time_spent_sec: draftData.totalTimeSpentSec,
                is_completed: false,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,test_id' });
    } catch (e) {
        console.warn("Error saving progress to Supabase:", e);
    }
}

function saveLocalDraft() {
    if (isSubmitted || !currentTest) return;
    const draftData = {
        testId: currentTest.id,
        userAnswers: userAnswers,
        reviewStatus: reviewStatus,
        timeRemaining: timeRemaining,
        totalTimeSpentSec: totalTimeSpentSec,
        lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem(getDraftStorageKey(), JSON.stringify(draftData));
    saveProgressToSupabase(draftData);
}

async function loadLocalDraft() {
    if (!currentTest) return false;

    if (window.supabaseClient && currentTest.id !== 'demo_test') {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (user) {
                const { data, error } = await window.supabaseClient
                    .from('test_progress')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('test_id', currentTest.id)
                    .maybeSingle();

                if (!error && data) {
                    if (data.is_completed) {
                        clearLocalDraftStorageOnly();
                        return false; 
                    }
                    userAnswers = data.user_answers || {};
                    reviewStatus = data.review_status || {};
                    timeRemaining = data.time_remaining !== undefined ? data.time_remaining : totalTimeLimitSec;
                    totalTimeSpentSec = data.total_time_spent_sec || 0;
                    return true;
                }
            }
        } catch (e) {
            console.warn("Could not load progress from Supabase:", e);
        }
    }

    const key = getDraftStorageKey();
    const raw = localStorage.getItem(key);
    if (raw) {
        try {
            const draft = JSON.parse(raw);
            userAnswers = draft.userAnswers || {};
            reviewStatus = draft.reviewStatus || {};
            timeRemaining = draft.timeRemaining !== undefined ? draft.timeRemaining : totalTimeLimitSec;
            totalTimeSpentSec = draft.totalTimeSpentSec || 0;
            return true;
        } catch (e) {
            console.warn("Invalid draft format:", e);
        }
    }
    return false;
}

function clearLocalDraftStorageOnly() {
    if (!currentTest) return;
    const key = getDraftStorageKey();
    localStorage.removeItem(key);

    for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.includes(currentTest.id)) {
            localStorage.removeItem(k);
        }
    }
}

async function clearLocalDraft() {
    clearLocalDraftStorageOnly();

    if (window.supabaseClient && currentTest && currentTest.id !== 'demo_test') {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (user) {
                await window.supabaseClient
                    .from('test_progress')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('test_id', currentTest.id);
            }
        } catch (e) {
            console.warn("Error clearing cloud progress:", e);
        }
    }
}

function loadDummyTest() {
    currentTest = {
        id: "demo_test",
        title: "Mix Test - 1",
        time_limit_mins: 20,
        marks_per_question: 3,
        negative_marks: 1,
        questions_data: Array.from({ length: 15 }, (_, i) => ({
            question_text: `Sample Question ${i + 1} text goes here with equation \\( E = mc^2 \\)...`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct_option: 0,
            explanation: "Explanation for question " + (i + 1)
        }))
    };
    setupTestInit();
}

async function loadTestDetails(id) {
    try {
        if (!window.supabaseClient) throw new Error("Supabase client not initialized");
        const { data, error } = await window.supabaseClient.from('tests').select('*').eq('id', id).single();
        if (error || !data) throw error;
        currentTest = data;
        await setupTestInit();
    } catch (err) {
        console.error("Failed to load test details from database:", err);
        loadDummyTest();
    }
}

async function setupTestInit() {
    isSubmitted = false;
    const resArea = document.getElementById("resultArea");
    if (resArea) resArea.style.display = "none";

    questions = currentTest.questions_data || [];
    const headingElem = document.getElementById("testHeading");
    if (headingElem) headingElem.innerText = currentTest.title || "Portal Test";
    
    totalTimeLimitSec = (currentTest.time_limit_mins || 20) * 60;

    const urlParams = new URLSearchParams(window.location.search);
    const isReattempt = urlParams.get('reattempt') === 'true';

    if (isReattempt) {
        await clearLocalDraft();
        userAnswers = {};
        reviewStatus = {};
        timeRemaining = totalTimeLimitSec;
        totalTimeSpentSec = 0;
    } else {
        const draftLoaded = await loadLocalDraft();
        const btnStart = document.getElementById("startBtnText");
        if (draftLoaded && btnStart) {
            btnStart.innerText = "Resume Test";
        } else if (btnStart) {
            btnStart.innerText = "Start Test";
        }
    }

    const posMarks = currentTest.marks_per_question !== undefined ? currentTest.marks_per_question : 1;
    const negMarks = currentTest.negative_marks !== undefined ? currentTest.negative_marks : (currentTest.negative_marking || 0);
    const totalMaxMarks = questions.length * posMarks;

    const instDuration = document.getElementById("instDuration");
    if (instDuration) instDuration.innerText = `${currentTest.time_limit_mins || 20} Mins`;
    
    const instMarks = document.getElementById("instMarks");
    if (instMarks) instMarks.innerText = totalMaxMarks;
    
    const instTotalQ = document.getElementById("instTotalQ");
    if (instTotalQ) instTotalQ.innerText = questions.length;
    
    const instTimeText = document.getElementById("instTimeText");
    if (instTimeText) instTimeText.innerText = `${currentTest.time_limit_mins || 20} minutes`;

    const posMarkElem = document.getElementById("instPositiveMarkText");
    if (posMarkElem) posMarkElem.innerText = `+${posMarks} mark${posMarks > 1 ? 's' : ''}`;

    const negRuleElem = document.getElementById("instNegativeMarkRule") || document.getElementById("instNegativeMarkingRule");
    if (negRuleElem) {
        if (negMarks > 0) {
            negRuleElem.innerText = `Negative marking of -${negMarks} marks for each incorrect answer.`;
            negRuleElem.style.color = "#f43f5e";
        } else {
            negRuleElem.innerText = "There is No Negative marking for incorrect answers.";
            negRuleElem.style.color = "#10b981";
        }
    }

    const instModal = document.getElementById("instructionsModal");
    if (instModal) instModal.style.display = "flex";
}

function startTestFromInstructions() {
    const instModal = document.getElementById("instructionsModal");
    if (instModal) instModal.style.display = "none";
    
    const resArea = document.getElementById("resultArea");
    if (resArea) resArea.style.display = "none";

    const tArea = document.getElementById("testArea");
    if (tArea) tArea.style.display = "grid";

    applyModeUI();
    renderPalette();
    switchPaletteView(currentPaletteView);
    loadQuestion(0);
}

function exitExam() { 
    if (!isSubmitted) saveLocalDraft();
    window.location.href = "tests.html"; 
}

function onModeChange(newMode) {
    currentMode = newMode;
    applyModeUI();
    loadQuestion(currentIndex);
}

function applyModeUI() {
    const modeBadge = document.getElementById('modeBadge');
    const clearBtn = document.getElementById('clearBtn');

    if (currentMode === 'practice') {
        if (modeBadge) modeBadge.innerHTML = `<i class="fa-solid fa-book-open"></i> Practice Mode`;
        if (clearBtn) clearBtn.style.display = 'none';
    } else {
        if (modeBadge) modeBadge.innerHTML = `<i class="fa-solid fa-shield-halved"></i> Quiz Mode`;
        if (clearBtn) clearBtn.style.display = 'inline-flex';
    }
    startTimer();
}

function toggleMobilePalette() {
    const box = document.getElementById("paletteBox");
    const backdrop = document.getElementById("drawerBackdrop");
    if (!box || !backdrop) return;
    if (box.classList.contains("open")) closeMobilePalette();
    else { box.classList.add("open"); backdrop.classList.add("active"); }
}

function closeMobilePalette() {
    const box = document.getElementById("paletteBox");
    const backdrop = document.getElementById("drawerBackdrop");
    if (box) box.classList.remove("open");
    if (backdrop) backdrop.classList.remove("active");
}

function switchPaletteView(view) {
    currentPaletteView = view;
    const gridEl = document.getElementById("paletteGrid");
    const listEl = document.getElementById("paletteList");
    const btnGrid = document.getElementById("btnGridView");
    const btnList = document.getElementById("btnListView");

    if (!gridEl || !listEl) return;

    if (view === 'grid') {
        gridEl.style.display = "grid";
        listEl.style.display = "none";
        if (btnGrid) btnGrid.classList.add("active");
        if (btnList) btnList.classList.remove("active");
    } else {
        gridEl.style.display = "none";
        listEl.style.display = "flex";
        if (btnList) btnList.classList.add("active");
        if (btnGrid) btnGrid.classList.remove("active");
    }
}

// RESULT AREA DUAL VIEW TOGGLE (Grid vs List)
function switchResultPaletteView(view) {
    currentResultPaletteView = view;
    const gridEl = document.getElementById("analysisQGrid");
    const listEl = document.getElementById("analysisQList");
    const btnGrid = document.getElementById("btnResGridView");
    const btnList = document.getElementById("btnResListView");

    if (!gridEl || !listEl) return;

    if (view === 'grid') {
        gridEl.style.display = "grid";
        listEl.style.display = "none";
        if (btnGrid) btnGrid.classList.add("active");
        if (btnList) btnList.classList.remove("active");
    } else {
        gridEl.style.display = "none";
        listEl.style.display = "flex";
        if (btnList) btnList.classList.add("active");
        if (btnGrid) btnGrid.classList.remove("active");
    }
}

function renderPalette() {
    const grid = document.getElementById("paletteGrid");
    const list = document.getElementById("paletteList");
    if (!grid || !list) return;

    grid.innerHTML = "";
    list.innerHTML = "";

    questions.forEach((q, idx) => {
        const isAnswered = userAnswers[idx] !== undefined;
        const isReview = reviewStatus[idx];

        if (currentFilter === 'answered' && !isAnswered) return;
        if (currentFilter === 'unanswered' && isAnswered) return;
        if (currentFilter === 'review' && !isReview) return;

        const qClass = getQuestionClass(idx);
        const qText = q.question_text || q.question || `Question ${idx + 1}`;

        const btn = document.createElement("button");
        btn.className = `p-btn ${qClass}`;
        btn.innerText = idx + 1;
        btn.onclick = () => { loadQuestion(idx); closeMobilePalette(); };
        grid.appendChild(btn);

        const listCard = document.createElement("div");
        listCard.className = `p-list-card ${qClass}`;
        listCard.innerHTML = `
            <div class="p-list-num">${idx + 1}.</div>
            <div class="p-list-text">${qText}</div>
        `;
        listCard.onclick = () => { loadQuestion(idx); closeMobilePalette(); };
        list.appendChild(listCard);
    });
    
    renderMathJax();
}

function filterPalette(filter, el) {
    currentFilter = filter;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    renderPalette();
}

function getQuestionClass(idx) {
    let cls = "";
    if (idx === currentIndex) cls += " active";
    if (reviewStatus[idx]) return cls + " review";
    if (userAnswers[idx] !== undefined) return cls + " answered";
    return cls + " unanswered";
}

function loadQuestion(idx) {
    if (idx < 0 || idx >= questions.length) return;
    currentIndex = idx;
    const q = questions[idx];

    const curNum = document.getElementById("currentQNum");
    if (curNum) curNum.innerText = `Question ${idx + 1}`;
    
    const qTextElem = document.getElementById("questionText");
    if (qTextElem) qTextElem.innerText = q.question_text || q.question || '';

    const optionsBox = document.getElementById("optionsContainer");
    if (optionsBox) optionsBox.innerHTML = "";

    const options = q.options || [q.option1, q.option2, q.option3, q.option4];
    const userSelected = userAnswers[idx];
    const correctIdx = parseCorrectOption(q);
    const explanationBox = document.getElementById("practiceExplanation");

    if (optionsBox) {
        options.forEach((opt, oIdx) => {
            const card = document.createElement("div");
            let cardClasses = `option-card`;

            if (currentMode === 'practice' && userSelected !== undefined) {
                cardClasses += ' locked';
                if (oIdx === correctIdx) cardClasses += ' practice-correct';
                else if (oIdx === userSelected) cardClasses += ' practice-incorrect';
            } else {
                if (userSelected === oIdx) cardClasses += ' selected';
            }

            card.className = cardClasses;
            card.onclick = () => selectOption(oIdx);
            card.innerHTML = `<div class="opt-prefix">${String.fromCharCode(65 + oIdx)}</div><div>${opt}</div>`;
            optionsBox.appendChild(card);
        });
    }

    if (explanationBox) {
        if (currentMode === 'practice' && userSelected !== undefined) {
            explanationBox.style.display = 'block';
            const expText = document.getElementById("explanationText");
            if (expText) expText.innerText = q.explanation || "Correct Option: " + String.fromCharCode(65 + correctIdx);
        } else {
            explanationBox.style.display = 'none';
        }
    }

    const nextBtn = document.getElementById("nextBtn");
    if (nextBtn) {
        nextBtn.innerHTML = currentIndex === questions.length - 1 ? `Submit Test <i class="fa-solid fa-paper-plane"></i>` : `Next <i class="fa-solid fa-chevron-right"></i>`;
    }
    renderPalette();
    renderMathJax();
}

function selectOption(oIdx) {
    if (currentMode === 'practice' && userAnswers[currentIndex] !== undefined) return;
    userAnswers[currentIndex] = oIdx;
    delete reviewStatus[currentIndex];
    saveLocalDraft();
    loadQuestion(currentIndex);
}

function clearResponse() {
    delete userAnswers[currentIndex];
    delete reviewStatus[currentIndex];
    saveLocalDraft();
    loadQuestion(currentIndex);
}

function markForReview() {
    reviewStatus[currentIndex] = true;
    saveLocalDraft();
    if (currentIndex < questions.length - 1) navigateQuestion(1);
    else loadQuestion(currentIndex);
}

function navigateQuestion(dir) {
    const nextIdx = currentIndex + dir;
    if (nextIdx >= 0 && nextIdx < questions.length) loadQuestion(nextIdx);
}

function handleNextOrSubmit() {
    if (currentIndex === questions.length - 1) confirmSubmission();
    else navigateQuestion(1);
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (isTimerPaused || isSubmitted) return;
        timeRemaining--;
        totalTimeSpentSec++;

        if (totalTimeSpentSec % 5 === 0) saveLocalDraft();

        let mins = Math.floor(timeRemaining / 60), secs = timeRemaining % 60;
        const tText = document.getElementById("timerText");
        if (tText) tText.innerText = `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
        
        if (timeRemaining <= 0) { 
            clearInterval(timerInterval); 
            timerInterval = null;
            submitTest(); 
        }
    }, 1000);
}

function confirmSubmission() {
    if (confirm(`Aapne ${Object.keys(userAnswers).length}/${questions.length} questions attempt kiye hain. Submit karna chahte hain?`)) {
        submitTest();
    }
}

function parseCorrectOption(q) {
    let val = q.correct_option !== undefined ? q.correct_option : (q.correct !== undefined ? q.correct : 0);
    if (typeof val === 'number') return val;
    let str = val.toString().trim().toUpperCase();
    if (str === 'A' || str === '0') return 0;
    if (str === 'B' || str === '1') return 1;
    if (str === 'C' || str === '2') return 2;
    if (str === 'D' || str === '3') return 3;
    return parseInt(str, 10) || 0;
}

function openExitModal() { 
    const m = document.getElementById("exitModal");
    if (m) m.style.display = "flex"; 
}

function closeExitModal() { 
    const m = document.getElementById("exitModal");
    if (m) m.style.display = "none"; 
}

function exitExamConfirmed() { 
    saveLocalDraft(); 
    window.location.href = "tests.html"; 
}

async function submitTest() {
    isSubmitted = true;
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    await clearLocalDraft();

    let correctCount = 0, wrongCount = 0, skippedCount = 0, reviewCount = 0;

    questions.forEach((q, idx) => {
        let correctIdx = parseCorrectOption(q);
        if (reviewStatus[idx]) reviewCount++;
        if (userAnswers[idx] !== undefined) {
            if (userAnswers[idx] === correctIdx) correctCount++;
            else wrongCount++;
        } else {
            if (!reviewStatus[idx]) skippedCount++;
        }
    });

    let totalQ = questions.length;
    let posMarks = currentTest.marks_per_question !== undefined ? Number(currentTest.marks_per_question) : 1.0;
    let negMarks = currentTest.negative_marks !== undefined ? Number(currentTest.negative_marks) : (Number(currentTest.negative_marking) || 0.0);
    
    let scoreVal = (correctCount * posMarks) - (wrongCount * negMarks);

    let maxPossibleScore = totalQ * posMarks;
    let scorePct = maxPossibleScore > 0 ? Math.round((scoreVal / maxPossibleScore) * 100) : 0;
    let accuracyPct = (correctCount + wrongCount) > 0 ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0;

    const tArea = document.getElementById("testArea");
    if (tArea) tArea.style.display = "none";

    const header = document.querySelector("header");
    if (header) header.style.display = "none";
    
    const rArea = document.getElementById("resultArea");
    if (rArea) {
        rArea.style.display = "block";
        window.scrollTo(0, 0);
    }

    const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    const rName = document.getElementById("resUserName");
    if (rName) rName.innerText = currentUserProfile?.full_name || 'Student';
    
    const rPic = document.getElementById("resUserProfilePic");
    if (rPic) rPic.src = currentUserProfile?.avatar_url || defaultAvatar;

    const rScore = document.getElementById("resScoreVal");
    if (rScore) rScore.innerText = scoreVal.toFixed(2);
    
    const rTotal = document.getElementById("resScoreTotal");
    if (rTotal) rTotal.innerText = `Out of ${maxPossibleScore.toFixed(2)}`;
    
    const rTitle = document.getElementById("resTestTitle");
    if (rTitle) rTitle.innerText = currentTest.title || "Portal Test";
    
    let minsSpent = Math.floor(totalTimeSpentSec / 60);
    let secsSpent = totalTimeSpentSec % 60;
    const rTime = document.getElementById("resTimeTaken");
    if (rTime) rTime.innerText = `${minsSpent < 10 ? '0' : ''}${minsSpent} min, ${secsSpent < 10 ? '0' : ''}${secsSpent} sec`;

    if (document.getElementById("cntCorrectVal")) document.getElementById("cntCorrectVal").innerText = correctCount;
    if (document.getElementById("cntWrongVal")) document.getElementById("cntWrongVal").innerText = wrongCount;
    if (document.getElementById("cntSkippedVal")) document.getElementById("cntSkippedVal").innerText = skippedCount;

    if (document.getElementById("accuracyValText")) document.getElementById("accuracyValText").innerText = `${accuracyPct} %`;
    if (document.getElementById("scoreValText")) document.getElementById("scoreValText").innerText = `${scorePct < 0 ? 0 : scorePct} %`;

    if (document.getElementById("qaCorrect")) document.getElementById("qaCorrect").innerText = correctCount < 10 ? `0${correctCount}` : correctCount;
    if (document.getElementById("qaWrong")) document.getElementById("qaWrong").innerText = wrongCount < 10 ? `0${wrongCount}` : wrongCount;
    if (document.getElementById("qaSkipped")) document.getElementById("qaSkipped").innerText = skippedCount < 10 ? `0${skippedCount}` : skippedCount;

    try { renderQuestionAnalysisGrid(); } catch(e) { console.warn("Question Analysis grid render error:", e); }
    try { renderCharts(correctCount, wrongCount, skippedCount, accuracyPct, scorePct < 0 ? 0 : scorePct); } catch(e) { console.warn("Chart render error:", e); }

    await saveResultAndFetchRank(scoreVal, maxPossibleScore);
    renderMathJax();
}

function renderQuestionAnalysisGrid() {
    const grid = document.getElementById("analysisQGrid");
    const list = document.getElementById("analysisQList");
    if (!grid) return;
    grid.innerHTML = "";
    if (list) list.innerHTML = "";

    questions.forEach((q, idx) => {
        let correctIdx = parseCorrectOption(q);
        let userAns = userAnswers[idx];
        let btn = document.createElement("button");
        btn.className = "q-status-btn";
        btn.innerText = idx + 1;

        let statusClass = "";
        let statusBadgeText = "";

        if (userAns !== undefined) {
            if (userAns === correctIdx) {
                btn.classList.add("correct");
                statusClass = "res-correct";
                statusBadgeText = "✔ Correct";
            } else {
                btn.classList.add("wrong");
                statusClass = "res-wrong";
                statusBadgeText = "✖ Wrong";
            }
        } else if (reviewStatus[idx]) {
            btn.classList.add("review");
            statusClass = "res-review";
            statusBadgeText = "📌 Review";
        } else {
            btn.classList.add("skipped");
            statusClass = "res-skipped";
            statusBadgeText = "⚠ Skipped";
        }

        btn.onclick = () => openQuestionDetailModal(idx);
        grid.appendChild(btn);

        if (list) {
            const listCard = document.createElement("div");
            listCard.className = `res-list-card ${statusClass}`;
            listCard.innerHTML = `
                <div class="res-list-head">
                    <span class="res-list-num">Q${idx + 1}.</span>
                    <span style="font-size: 11px; font-weight: bold;">${statusBadgeText}</span>
                </div>
                <div class="res-list-text">${q.question_text || q.question}</div>
            `;
            listCard.onclick = () => openQuestionDetailModal(idx);
            list.appendChild(listCard);
        }
    });

    switchResultPaletteView(currentResultPaletteView);
}

function openQuestionDetailModal(idx) {
    const q = questions[idx];
    const userAnsIdx = userAnswers[idx];
    const correctIdx = parseCorrectOption(q);
    const options = q.options || [q.option1, q.option2, q.option3, q.option4];

    let userAnsText = userAnsIdx !== undefined ? options[userAnsIdx] : "Not Answered";
    let correctAnsText = options[correctIdx];
    let isCorrect = userAnsIdx === correctIdx;

    let statusText = isCorrect ? "✔ Correct" : (userAnsIdx !== undefined ? "✖ Wrong" : "⚠ Skipped / Not Answered");

    let detailHtml = `
        <div id="qDetailModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); display:flex; justify-content:center; align-items:center; z-index:9999; padding:15px;">
            <div style="background:var(--surface, #1e293b); color:var(--text-main, #fff); border-radius:12px; padding:20px; max-width:500px; width:100%; max-height:85vh; overflow-y:auto; box-shadow:0 8px 32px rgba(0,0,0,0.5);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h3 style="font-size:16px; margin:0;">Question ${idx + 1} Analysis</h3>
                    <button onclick="document.getElementById('qDetailModal').remove()" style="background:none; border:none; color:var(--text-main, #fff); font-size:18px; cursor:pointer;">✖</button>
                </div>
                <div style="font-size:13px; font-weight:700; margin-bottom:10px; color:${isCorrect ? '#10b981' : (userAnsIdx !== undefined ? '#f43f5e' : '#f59e0b')};">${statusText}</div>
                <p style="font-size:14px; margin-bottom:12px; font-weight:600; line-height:1.4;">${q.question_text || q.question}</p>
                
                <div style="font-size:13px; margin-bottom:8px; padding:8px; background:rgba(255,255,255,0.05); border-radius:6px;">
                    <b>Your Choice:</b> <span style="color:${isCorrect ? '#10b981' : '#f43f5e'};">${userAnsText}</span>
                </div>
                
                <div style="font-size:13px; margin-bottom:12px; padding:8px; background:rgba(16,185,129,0.1); border-radius:6px; color:#10b981;">
                    <b>Correct Answer:</b> ${correctAnsText}
                </div>
                
                ${q.explanation || q.solution ? `<div style="font-size:12px; color:#94a3b8; border-top:1px solid #334155; padding-top:8px; margin-top:8px;"><b>Explanation:</b> ${q.explanation || q.solution}</div>` : ''}
                
                <button onclick="document.getElementById('qDetailModal').remove()" style="margin-top:15px; width:100%; padding:10px; background:#007bff; color:#fff; border:none; border-radius:6px; font-weight:700; cursor:pointer;">Close</button>
            </div>
        </div>
    `;

    const existingModal = document.getElementById("qDetailModal");
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', detailHtml);
    renderMathJax();
}

async function saveResultAndFetchRank(scoreVal, totalMarks) {
    const rankValElem = document.getElementById("resRankVal");
    const rankTotalElem = document.getElementById("resRankTotal");

    if (!window.supabaseClient || !currentTest || currentTest.id === 'demo_test') {
        if (rankValElem) rankValElem.innerText = "#1";
        if (rankTotalElem) rankTotalElem.innerText = "Out of 1 (Demo)";
        return;
    }

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            if (rankValElem) rankValElem.innerText = "#1";
            if (rankTotalElem) rankTotalElem.innerText = "Out of 1";
            return;
        }

        let correctCount = 0, wrongCount = 0;
        questions.forEach((q, idx) => {
            let correctIdx = parseCorrectOption(q);
            if (userAnswers[idx] !== undefined) {
                if (userAnswers[idx] === correctIdx) correctCount++;
                else wrongCount++;
            }
        });

        const { error: insertErr } = await window.supabaseClient
            .from('test_results')
            .upsert([{
                user_id: user.id,
                test_id: currentTest.id,
                score: scoreVal.toString(),
                total_marks: totalMarks.toString(),
                correct_answers: correctCount,
                wrong_answers: wrongCount,
                time_taken_sec: totalTimeSpentSec
            }], { onConflict: 'user_id,test_id' });

        if (insertErr) {
            console.error("Error saving test result:", insertErr.message || JSON.stringify(insertErr));
        }

        const { data: results, error } = await window.supabaseClient
            .from('test_results')
            .select('user_id, score, time_taken_sec')
            .eq('test_id', currentTest.id);

        if (error || !results || results.length === 0) {
            if (rankValElem) rankValElem.innerText = "#1";
            if (rankTotalElem) rankTotalElem.innerText = "Out of 1";
            return;
        }

        let userBestMap = {};
        results.forEach(r => {
            const numScore = parseFloat(r.score) || 0;
            if (!userBestMap[r.user_id] || numScore > userBestMap[r.user_id].score) {
                userBestMap[r.user_id] = { ...r, score: numScore };
            }
        });

        let sortedList = Object.values(userBestMap).sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (a.time_taken_sec || 0) - (b.time_taken_sec || 0);
        });

        let myRank = sortedList.findIndex(r => r.user_id === user.id) + 1;
        let totalParticipants = sortedList.length;

        if (rankValElem) rankValElem.innerText = myRank > 0 ? `#${myRank}` : '#1';
        if (rankTotalElem) rankTotalElem.innerText = `Out of ${totalParticipants || 1}`;

    } catch (err) {
        console.warn("Ranking calculation error:", err);
        if (rankValElem) rankValElem.innerText = "#1";
        if (rankTotalElem) rankTotalElem.innerText = "Out of 1";
    }
}

function renderCharts(correct, wrong, skipped, accuracy, score) {
    if (chartBrief) chartBrief.destroy();
    if (chartAccuracy) chartAccuracy.destroy();
    if (chartScore) chartScore.destroy();

    const ctxBrief = document.getElementById('briefAnalysisChart')?.getContext('2d');
    if (ctxBrief) {
        chartBrief = new Chart(ctxBrief, {
            type: 'doughnut',
            data: {
                labels: ['Correct', 'Wrong', 'Skipped'],
                datasets: [{
                    data: [correct, wrong, skipped],
                    backgroundColor: ['#10b981', '#f43f5e', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: { cutout: '70%', plugins: { legend: { display: false } } }
        });
    }

    const ctxAcc = document.getElementById('accuracyChart')?.getContext('2d');
    if (ctxAcc) {
        chartAccuracy = new Chart(ctxAcc, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [accuracy, 100 - accuracy],
                    backgroundColor: ['#10b981', '#f43f5e'],
                    borderWidth: 0
                }]
            },
            options: { cutout: '80%', plugins: { legend: { display: false } } }
        });
    }

    const ctxScore = document.getElementById('scoreChart')?.getContext('2d');
    if (ctxScore) {
        chartScore = new Chart(ctxScore, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [score, 100 - score],
                    backgroundColor: ['#10b981', '#f43f5e'],
                    borderWidth: 0
                }]
            },
            options: { cutout: '80%', plugins: { legend: { display: false } } }
        });
    }
}

function reattemptTest() {
    window.location.href = `take-test.html?id=${currentTest?.id || 'demo_test'}&mode=${currentMode}&reattempt=true`;
}

function viewLeaderboard() {
    const testId = currentTest?.id || 'demo_test';
    window.location.href = `tests.html?tab=leaderboard&test_id=${testId}`;
}

async function shareOnWhatsApp() {
    const resultElement = document.getElementById("resultArea");
    if (!resultElement) return;

    try {
        if (typeof html2canvas === 'undefined') {
            alert("html2canvas library missing hai!");
            return;
        }

        const userName = document.querySelector("#resUserName")?.innerText || "Student";
        const testTitle = typeof currentTest !== 'undefined' && currentTest?.title ? currentTest.title : "Test Result";
        const score = document.getElementById("resScoreVal")?.innerText || "0";
        const rank = document.getElementById("resRankVal")?.innerText || "#1";
        const testId = typeof currentTest !== 'undefined' && currentTest?.id ? currentTest.id : "";

        const shareUrl = `${window.location.host}/take-test.html${testId ? `?id=${testId}` : ''}`;

        const userImgEl = document.querySelector("#resUserProfilePic");
        let avatarSrc = null;

        if (userImgEl && userImgEl.src) {
            try {
                const c = document.createElement("canvas");
                c.width = userImgEl.naturalWidth || userImgEl.width || 100;
                c.height = userImgEl.naturalHeight || userImgEl.height || 100;
                const ctx = c.getContext("2d");
                ctx.drawImage(userImgEl, 0, 0);
                avatarSrc = c.toDataURL("image/png");
            } catch (e) {
                avatarSrc = userImgEl.src;
            }
        }

        const shareCard = document.createElement("div");
        shareCard.style.position = "fixed";
        shareCard.style.left = "-9999px";
        shareCard.style.top = "-9999px";
        shareCard.style.width = "380px";
        shareCard.style.padding = "24px";
        shareCard.style.borderRadius = "20px";
        shareCard.style.background = "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)";
        shareCard.style.color = "#ffffff";
        shareCard.style.fontFamily = "sans-serif";

        const avatarHtml = avatarSrc 
            ? `<img src="${avatarSrc}" style="width: 75px; height: 75px; border-radius: 50%; object-fit: cover; margin: 0 auto 10px; display: block; border: 3px solid #a855f7;" />`
            : `<div style="width: 75px; height: 75px; border-radius: 50%; background: linear-gradient(135deg, #a855f7, #ec4899); margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; color: white;">${userName.charAt(0).toUpperCase()}</div>`;

        shareCard.innerHTML = `
            <div style="text-align: center; margin-bottom: 18px;">
                ${avatarHtml}
                <h3 style="margin: 0; font-size: 20px; color: #f8fafc; font-weight: 700;">${userName}</h3>
                <p style="margin: 4px 0 0; font-size: 13px; color: #c084fc;">${testTitle}</p>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 18px;">
                <div style="flex: 1; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); padding: 12px; border-radius: 12px; text-align: center;">
                    <span style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">SCORE</span>
                    <strong style="font-size: 22px; color: #4ade80;">${score}</strong>
                </div>
                <div style="flex: 1; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); padding: 12px; border-radius: 12px; text-align: center;">
                    <span style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">RANK</span>
                    <strong style="font-size: 22px; color: #60a5fa;">${rank}</strong>
                </div>
            </div>

            <div style="text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 12px;">
                <span style="font-size: 10px; color: #94a3b8; display: block; margin-bottom: 2px;">Take this test at:</span>
                <strong style="font-size: 12px; color: #a7f3d0; word-break: break-all;">${shareUrl}</strong>
            </div>
        `;

        document.body.appendChild(shareCard);

        const canvas = await html2canvas(shareCard, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null
        });

        document.body.removeChild(shareCard);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], `Test_Result.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ files: [file] });
                } catch (e) {
                    console.log("Cancelled", e);
                }
            } else {
                const link = document.createElement('a');
                link.download = `Test_Result.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        }, 'image/png');

    } catch (err) {
        console.error("Error:", err);
    }
}

function shareNative() {
    shareOnWhatsApp();
}

function toggleSolutions() {
    const solContainer = document.getElementById("solutionsContainer");
    if (!solContainer) return;
    if (solContainer.style.display === "none" || solContainer.style.display === "") {
        renderSolutions();
        solContainer.style.display = "block";
        solContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
        solContainer.style.display = "none";
    }
}

function filterSolutions(type, el) {
    currentAnalysisFilter = type;
    if (el) {
        document.querySelectorAll('.analysis-chip').forEach(c => c.classList.remove('active-all', 'active'));
        el.classList.add('active');
    }
    renderSolutions();
}

function renderSolutions() {
    let html = "";
    let cntAll = questions.length;
    let cntCorrect = 0, cntIncorrect = 0, cntSkipped = 0, cntReview = 0;

    questions.forEach((q, idx) => {
        let correctIdx = parseCorrectOption(q);
        let userAnsIdx = userAnswers[idx];
        let isCorrect = userAnsIdx === correctIdx;
        let isUnanswered = userAnsIdx === undefined;
        let isReview = !!reviewStatus[idx];

        if (isCorrect) cntCorrect++;
        else if (!isUnanswered) cntIncorrect++;

        if (isReview) cntReview++;
        else if (isUnanswered) cntSkipped++;

        if (currentAnalysisFilter === 'correct' && !isCorrect) return;
        if (currentAnalysisFilter === 'incorrect' && (isCorrect || isUnanswered)) return;
        if (currentAnalysisFilter === 'skipped' && (!isUnanswered || isReview)) return;
        if (currentAnalysisFilter === 'review' && !isReview) return;

        let options = q.options || [q.option1, q.option2, q.option3, q.option4];
        
        let badgeClass = '';
        let badgeText = '';

        if (isCorrect) {
            badgeClass = 'badge-success';
            badgeText = '✔ Correct';
        } else if (isReview) {
            badgeClass = 'badge-warning';
            badgeText = '📌 Review';
        } else if (isUnanswered) {
            badgeClass = 'badge-warning';
            badgeText = '⚠ Skipped';
        } else {
            badgeClass = 'badge-danger';
            badgeText = '✖ Wrong';
        }

        let exp = q.explanation || q.solution;

        html += `
            <div class="sol-card" style="position: relative; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); padding:12px; border-radius:8px; margin-bottom:12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span class="badge ${badgeClass}" style="font-size:12px; font-weight:bold;">${badgeText}</span>
                    <button onclick="reportBug(${idx})" style="background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
                        <i class="fa-solid fa-bug"></i> Report Bug
                    </button>
                </div>
                <h4 style="margin-bottom: 6px; font-size:13.5px;">Q${idx + 1}. ${q.question_text || q.question || ''}</h4>
                <p style="font-size: 12.5px; margin-bottom: 4px;">
                    <b>Your Choice:</b> ${userAnsIdx !== undefined ? `<span style="color:${isCorrect ? '#10b981' : '#f43f5e'}">${options[userAnsIdx]}</span>` : '<i>Not Answered</i>'}
                </p>
                <p style="font-size: 12.5px; color: #10b981;">
                    <b>Correct Answer:</b> ${options[correctIdx]}
                </p>
                ${exp ? `<p style="font-size: 12px; color: #94a3b8; margin-top: 6px; border-top: 1px dashed #334155; padding-top: 4px;"><b>Explanation:</b> ${exp}</p>` : ''}
            </div>
        `;
    });

    const cAll = document.getElementById('cntAll'); if (cAll) cAll.innerText = cntAll;
    const cCor = document.getElementById('cntCorrect'); if (cCor) cCor.innerText = cntCorrect;
    const cInc = document.getElementById('cntIncorrect'); if (cInc) cInc.innerText = cntIncorrect;
    const cSkp = document.getElementById('cntSkipped'); if (cSkp) cSkp.innerText = cntSkipped;
    const cRev = document.getElementById('cntReview'); if (cRev) cRev.innerText = cntReview;

    const solList = document.getElementById("solutionsList");
    if (solList) {
        solList.innerHTML = html || `<div style="padding: 10px; text-align: center; color: #94a3b8; font-size: 12px;">Is category me koi question nahi hai.</div>`;
    }
    renderMathJax();
}

async function reportBug(questionIdx) {
    const q = questions[questionIdx];
    const userReason = prompt(`Question ${questionIdx + 1} me kya galti hai? Brief me likhein:`);
    if (userReason) {
        if (window.supabaseClient) {
            try {
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                await window.supabaseClient.from('bug_reports').insert([{
                    user_id: user?.id || null,
                    test_id: currentTest ? currentTest.id : 'demo',
                    question_index: questionIdx,
                    question_text: q.question_text || q.question,
                    issue_description: userReason
                }]);
                alert("Aapki bug report submit ho gayi hai! Admin jald ise check karega.");
            } catch (err) {
                console.error("Bug report error:", err);
                alert("Bug report save karne me dikkat hui.");
            }
        } else {
            alert("Bug reported locally!");
        }
    }
}
