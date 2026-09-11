let currentTest = null, questions = [], currentIndex = 0;
let userAnswers = {}, reviewStatus = {};
let timerInterval = null, isTimerPaused = false;
let totalTimeLimitSec = 0, timeRemaining = 0, totalTimeSpentSec = 0;
let currentFilter = 'all';
let currentMode = 'quiz';
let currentAnalysisFilter = 'all';
let currentUserProfile = null;

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

window.addEventListener('DOMContentLoaded', async function() {
    initTheme();
    await fetchUserProfile();

    const urlParams = new URLSearchParams(window.location.search);
    const testId = urlParams.get('id');
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

/* --- SUPABASE SYNC LOGIC --- */

async function saveProgressToSupabase(draftData) {
    if (!window.supabaseClient || !currentTest || currentTest.id === 'demo_test') return;
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        await window.supabaseClient
            .from('test_progress')
            .upsert({
                user_id: user.id,
                test_id: currentTest.id,
                user_answers: draftData.userAnswers,
                review_status: draftData.reviewStatus,
                time_remaining: draftData.timeRemaining,
                total_time_spent_sec: draftData.totalTimeSpentSec,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,test_id' });
    } catch (e) {
        console.warn("Error saving progress to Supabase:", e);
    }
}

function saveLocalDraft() {
    if (!currentTest) return;
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

async function clearLocalDraft() {
    if (!currentTest) return;

    // 1. Clear LocalStorage Key
    localStorage.removeItem(getDraftStorageKey());

    // Safely sweep all draft instances for this test
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.includes(currentTest.id) && k.startsWith("test_draft_")) {
            localStorage.removeItem(k);
        }
    }

    // 2. Clear Cloud Draft Sync
    if (window.supabaseClient && currentTest.id !== 'demo_test') {
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
            question_text: `Sample Question ${i + 1} text goes here...`,
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
        if (draftLoaded) {
            const btnStart = document.getElementById("startBtnText");
            if (btnStart) btnStart.innerText = "Resume Test";
        } else {
            timeRemaining = totalTimeLimitSec;
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

    document.getElementById("instructionsModal").style.display = "flex";
}

function startTestFromInstructions() {
    document.getElementById("instructionsModal").style.display = "none";
    document.getElementById("testArea").style.display = "grid";
    applyModeUI();
    renderPalette();
    loadQuestion(0);
}

function exitExam() { 
    saveLocalDraft();
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
        modeBadge.innerHTML = `<i class="fa-solid fa-book-open"></i> Practice Mode`;
        clearBtn.style.display = 'none';
    } else {
        modeBadge.innerHTML = `<i class="fa-solid fa-shield-halved"></i> Quiz Mode`;
        clearBtn.style.display = 'inline-flex';
    }
    startTimer();
}

function toggleMobilePalette() {
    const box = document.getElementById("paletteBox");
    const backdrop = document.getElementById("drawerBackdrop");
    if (box.classList.contains("open")) closeMobilePalette();
    else { box.classList.add("open"); backdrop.classList.add("active"); }
}

function closeMobilePalette() {
    document.getElementById("paletteBox").classList.remove("open");
    document.getElementById("drawerBackdrop").classList.remove("active");
}

function renderPalette() {
    const grid = document.getElementById("paletteGrid");
    if (!grid) return;
    grid.innerHTML = "";

    questions.forEach((_, idx) => {
        const isAnswered = userAnswers[idx] !== undefined;
        const isReview = reviewStatus[idx];

        if (currentFilter === 'answered' && !isAnswered) return;
        if (currentFilter === 'unanswered' && isAnswered) return;
        if (currentFilter === 'review' && !isReview) return;

        const btn = document.createElement("button");
        btn.className = `p-btn ${getQuestionClass(idx)}`;
        btn.innerText = idx + 1;
        btn.onclick = () => { loadQuestion(idx); closeMobilePalette(); };
        grid.appendChild(btn);
    });
}

function filterPalette(filter, el) {
    currentFilter = filter;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
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

    document.getElementById("currentQNum").innerText = `Question ${idx + 1}`;
    document.getElementById("questionText").innerText = q.question_text || q.question || '';

    const optionsBox = document.getElementById("optionsContainer");
    optionsBox.innerHTML = "";
    const options = q.options || [q.option1, q.option2, q.option3, q.option4];

    const userSelected = userAnswers[idx];
    const correctIdx = parseCorrectOption(q);
    const explanationBox = document.getElementById("practiceExplanation");

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

    if (currentMode === 'practice' && userSelected !== undefined) {
        explanationBox.style.display = 'block';
        document.getElementById("explanationText").innerText = q.explanation || "Correct Option: " + String.fromCharCode(65 + correctIdx);
    } else {
        explanationBox.style.display = 'none';
    }

    const nextBtn = document.getElementById("nextBtn");
    nextBtn.innerHTML = currentIndex === questions.length - 1 ? `Submit Test <i class="fa-solid fa-paper-plane"></i>` : `Next <i class="fa-solid fa-chevron-right"></i>`;
    renderPalette();
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
        if (isTimerPaused) return;
        timeRemaining--;
        totalTimeSpentSec++;

        if (totalTimeSpentSec % 5 === 0) saveLocalDraft();

        let mins = Math.floor(timeRemaining / 60), secs = timeRemaining % 60;
        document.getElementById("timerText").innerText = `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
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

function openExitModal() { document.getElementById("exitModal").style.display = "flex"; }
function closeExitModal() { document.getElementById("exitModal").style.display = "none"; }
function exitExamConfirmed() { saveLocalDraft(); window.location.href = "tests.html"; }

/* SUBMIT & GENERATE DETAILED RESULTS */
async function submitTest() {
    // 1. Stop background timer immediately
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // 2. Clear local & cloud drafts immediately before DB operations
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

    document.getElementById("testArea").style.display = "none";
    document.getElementById("resultArea").style.display = "block";

    const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    document.getElementById("resUserName").innerText = currentUserProfile?.full_name || 'Student';
    document.getElementById("resUserProfilePic").src = currentUserProfile?.avatar_url || defaultAvatar;

    document.getElementById("resScoreVal").innerText = scoreVal.toFixed(2);
    document.getElementById("resScoreTotal").innerText = `Out of ${maxPossibleScore.toFixed(2)}`;
    document.getElementById("resTestTitle").innerText = currentTest.title || "Portal Test";
    
    let minsSpent = Math.floor(totalTimeSpentSec / 60);
    let secsSpent = totalTimeSpentSec % 60;
    document.getElementById("resTimeTaken").innerText = `${minsSpent < 10 ? '0' : ''}${minsSpent} min, ${secsSpent < 10 ? '0' : ''}${secsSpent} sec`;

    document.getElementById("cntCorrectVal").innerText = correctCount;
    document.getElementById("cntWrongVal").innerText = wrongCount;
    document.getElementById("cntSkippedVal").innerText = skippedCount;

    document.getElementById("accuracyValText").innerText = `${accuracyPct} %`;
    document.getElementById("scoreValText").innerText = `${scorePct < 0 ? 0 : scorePct} %`;

    if (document.getElementById("qaCorrect")) document.getElementById("qaCorrect").innerText = correctCount < 10 ? `0${correctCount}` : correctCount;
    if (document.getElementById("qaWrong")) document.getElementById("qaWrong").innerText = wrongCount < 10 ? `0${wrongCount}` : wrongCount;
    if (document.getElementById("qaSkipped")) document.getElementById("qaSkipped").innerText = skippedCount < 10 ? `0${skippedCount}` : skippedCount;

    renderQuestionAnalysisGrid();
    renderCharts(correctCount, wrongCount, skippedCount, accuracyPct, scorePct < 0 ? 0 : scorePct);

    // Save result to Supabase
    await saveResultAndFetchRank(scoreVal, maxPossibleScore);
}

function renderQuestionAnalysisGrid() {
    const grid = document.getElementById("analysisQGrid");
    if (!grid) return;
    grid.innerHTML = "";

    questions.forEach((q, idx) => {
        let correctIdx = parseCorrectOption(q);
        let userAns = userAnswers[idx];
        let btn = document.createElement("button");
        btn.className = "q-status-btn";
        btn.innerText = idx + 1;

        if (userAns !== undefined) {
            if (userAns === correctIdx) btn.classList.add("correct");
            else btn.classList.add("wrong");
        } else if (reviewStatus[idx]) {
            btn.classList.add("review");
        } else {
            btn.classList.add("skipped");
        }

        btn.onclick = () => openQuestionDetailModal(idx);
        grid.appendChild(btn);
    });
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
            <div style="background:var(--bg-card, #1e293b); color:var(--text, #fff); border-radius:12px; padding:20px; max-width:500px; width:100%; max-height:85vh; overflow-y:auto; box-shadow:0 8px 32px rgba(0,0,0,0.5);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h3 style="font-size:16px; margin:0;">Question ${idx + 1} Analysis</h3>
                    <button onclick="document.getElementById('qDetailModal').remove()" style="background:none; border:none; color:#fff; font-size:18px; cursor:pointer;">✖</button>
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

        // Calculate correct and wrong counts
        let correctCount = 0, wrongCount = 0;
        questions.forEach((q, idx) => {
            let correctIdx = parseCorrectOption(q);
            if (userAnswers[idx] !== undefined) {
                if (userAnswers[idx] === correctIdx) correctCount++;
                else wrongCount++;
            }
        });

        // Using UPSERT to handle duplicate keys safely without throwing unique constraint error
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

function shareOnWhatsApp() {
    const text = encodeURIComponent(`My Score: ${document.getElementById("resScoreVal").innerText} on ${currentTest ? currentTest.title : "Test"}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

function shareNative() {
    if (navigator.share) {
        navigator.share({ title: 'Test Result', text: `My Score: ${document.getElementById("resScoreVal").innerText}` });
    }
}

function toggleSolutions() {
    const solContainer = document.getElementById("solutionsContainer");
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
