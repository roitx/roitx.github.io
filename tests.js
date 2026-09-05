/* ==========================================
   STATE MANAGEMENT & GLOBAL VARIABLES
   ========================================== */
let studentTests = [];
let userTestResultsMap = {}; // Stores test_id -> { score, total_marks, percentage }
let userDraftsMap = {};      // Stores test_id -> draft details
let isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
let isExploreOpen = false;

// Selection State Tracker for Explore Section (Student Tests)
let selectedBoard = "ALL";
let selectedClass = "ALL";
let selectedSubject = "ALL";

// Selection State Tracker for Leaderboard Step-by-Step Filters
let selectedLbBoard = "ALL";
let selectedLbClass = "ALL";
let selectedLbSubject = "ALL";
let selectedLbTestId = "ALL";

// Dynamic CSS Injection for Skeleton & UI Enhancements
(function injectCustomStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes skeleton-pulse {
            0% { background-color: #e2e8f0; }
            50% { background-color: #edf2f7; }
            100% { background-color: #e2e8f0; }
        }
        .skeleton-card {
            background: #ffffff;
            border-radius: 12px;
            padding: 16px;
            border: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            gap: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .skeleton-line {
            height: 14px;
            background-color: #e2e8f0;
            border-radius: 4px;
            animation: skeleton-pulse 1.5s infinite ease-in-out;
        }
        .btn-reattempt {
            background: transparent !important;
            color: #4b5563 !important;
            border: 1.5px solid #cbd5e1 !important;
            transition: all 0.2s ease;
            cursor: pointer;
        }
        .btn-reattempt:hover {
            background: #f1f5f9 !important;
            color: #1e293b !important;
            border-color: #94a3b8 !important;
        }
        .btn-resume {
            background: #f59e0b !important;
            color: #ffffff !important;
            border: none !important;
            font-weight: 700 !important;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3) !important;
            transition: all 0.2s ease;
            cursor: pointer;
        }
        .btn-resume:hover {
            background: #d97706 !important;
        }
        .btn-share {
            background: #25D366;
            color: #ffffff;
            border: none;
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: opacity 0.2s;
        }
        .btn-share:hover { opacity: 0.9; }
    `;
    document.head.appendChild(style);
})();

/* ==========================================
   INITIALIZATION & AUTHENTICATION
   ========================================== */
document.addEventListener("DOMContentLoaded", async () => {
    initDarkModeSupport();

    if (window.supabaseClient) {
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            isLoggedIn = !!(session && session.user);
            localStorage.setItem("isLoggedIn", isLoggedIn ? "true" : "false");

            window.supabaseClient.auth.onAuthStateChange((_event, session) => {
                isLoggedIn = !!(session && session.user);
                localStorage.setItem("isLoggedIn", isLoggedIn ? "true" : "false");
            });
        } catch (e) {
            console.warn("Supabase auth error:", e);
        }
    }

    // Search Bar Real-Time Listener Setup
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", filterStudentTests);
    }

    scanLocalDrafts();
    await fetchUserPreviousResults();
    fetchStudentTests();
});

function initDarkModeSupport() {
    const modeToggle = document.getElementById("modeToggle");
    const isDarkStored = localStorage.getItem("theme") === "dark";

    if (isDarkStored) {
        document.body.classList.add("dark");
        document.body.classList.add("dark-mode");
        if (modeToggle) modeToggle.checked = true;
    }

    if (modeToggle) {
        modeToggle.addEventListener("change", function () {
            if (this.checked) {
                document.body.classList.add("dark");
                document.body.classList.add("dark-mode");
                localStorage.setItem("theme", "dark");
            } else {
                document.body.classList.remove("dark");
                document.body.classList.remove("dark-mode");
                localStorage.setItem("theme", "light");
            }
        });
    }
}

/* ==========================================
   LOCAL DRAFTS DETECTOR (CONTINUE FEATURE)
   ========================================== */
function scanLocalDrafts() {
    userDraftsMap = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("test_draft_")) {
            const testId = key.replace("test_draft_", "");
            try {
                const draftData = JSON.parse(localStorage.getItem(key));
                userDraftsMap[testId] = draftData;
            } catch (e) {
                console.warn("Invalid draft format for key:", key);
            }
        }
    }
}

/* ==========================================
   FETCH USER PREVIOUS TEST RESULTS
   ========================================== */
async function fetchUserPreviousResults() {
    if (!window.supabaseClient) return;

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        const { data, error } = await window.supabaseClient
            .from('test_results')
            .select('test_id, score, total_marks, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        userTestResultsMap = {};
        if (data && data.length > 0) {
            data.forEach(result => {
                if (!userTestResultsMap[result.test_id]) {
                    const total = result.total_marks || 0;
                    const score = result.score || 0;
                    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
                    
                    userTestResultsMap[result.test_id] = {
                        score: score,
                        total_marks: total,
                        percentage: pct
                    };
                }
            });
        }
    } catch (err) {
        console.warn("Error fetching user test history:", err.message);
    }
}

/* ==========================================
   LOADING SKELETON RENDERER & SPINNER HIDER
   ========================================== */
function hideGlobalSpinner() {
    const allSpinners = document.querySelectorAll('.fetching-tests-spinner, [class*="spinner"], [id*="loading"]');
    allSpinners.forEach(el => {
        if (el.id !== "studentTestsContainer") el.remove();
    });

    const allElements = document.body.querySelectorAll('*');
    allElements.forEach(el => {
        if (el.children.length === 0 && el.textContent.includes('Fetching available tests')) {
            el.style.display = 'none';
        }
    });
}

function showLoadingSkeletons() {
    const container = document.getElementById("studentTestsContainer");
    if (!container) return;

    let skeletonHtml = "";
    for (let i = 0; i < 4; i++) {
        skeletonHtml += `
            <div class="skeleton-card">
                <div class="skeleton-line" style="width: 70%; height: 20px;"></div>
                <div class="skeleton-line" style="width: 40%; height: 12px;"></div>
                <div class="skeleton-line" style="width: 100%; height: 35px; margin-top: 10px;"></div>
                <div class="skeleton-line" style="width: 100%; height: 40px; border-radius: 8px;"></div>
            </div>
        `;
    }
    container.innerHTML = skeletonHtml;
}

/* ==========================================
   DATA FETCHING & RENDERING
   ========================================== */
async function fetchStudentTests() {
    showLoadingSkeletons();

    try {
        const { data, error } = await window.supabaseClient
            .from('tests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        studentTests = data || [];
        populateLeaderboardTestDropdown(studentTests);
        initLeaderboardStepView();
        renderRecentFiveTests();
    } catch (err) {
        const statusMsg = document.getElementById("statusMsg");
        if (statusMsg) {
            statusMsg.style.display = "block";
            statusMsg.innerText = "❌ Error loading tests: " + err.message;
        }
    } finally {
        hideGlobalSpinner();
    }
}

function renderRecentFiveTests() {
    const headingTitle = document.getElementById("headingTitle");
    const testCountBadge = document.getElementById("testCountBadge");
    
    if (headingTitle) headingTitle.innerHTML = `<i class="fa-solid fa-bolt" style="color: #f6e05e;"></i> Recently Added Tests`;
    if (testCountBadge) testCountBadge.innerText = "Top 5";

    const recentFive = studentTests.slice(0, 5);
    renderStudentTests(recentFive);
}

/* ==========================================
   EXPLORE & FILTER STEP LOGIC (TESTS SECTION)
   ========================================== */
function toggleExplorePage() {
    const pageView = document.getElementById("explorePageView");
    const chevron = document.getElementById("exploreChevron");
    
    if (!pageView) return;

    if (pageView.style.display === "none" || pageView.style.display === "") {
        pageView.style.display = "block";
        if (chevron) chevron.className = "fa-solid fa-chevron-up";
        isExploreOpen = true;
        renderBoardStep();
    } else {
        pageView.style.display = "none";
        if (chevron) chevron.className = "fa-solid fa-chevron-down";
        isExploreOpen = false;
        renderRecentFiveTests();
    }
}

// STEP 1: BOARD GENERATION
function renderBoardStep() {
    const grid = document.getElementById("boardOptionsGrid");
    if (!grid) return;

    const availableBoards = new Set();
    studentTests.forEach(test => {
        const title = (test.title || "").toUpperCase();
        if (title.includes("BSEB") || title.includes("BIHAR")) availableBoards.add("BSEB");
        else if (title.includes("CBSE")) availableBoards.add("CBSE");
        else if (title.includes("NEET")) availableBoards.add("NEET");
        else if (title.includes("JEE")) availableBoards.add("JEE");
    });

    let html = `<button class="chip-btn ${selectedBoard === 'ALL' ? 'active' : ''}" onclick="selectBoard('ALL')">All Boards</button>`;
    
    availableBoards.forEach(board => {
        const activeClass = selectedBoard === board ? 'active' : '';
        html += `<button class="chip-btn ${activeClass}" onclick="selectBoard('${board}')">${board}</button>`;
    });

    grid.innerHTML = html;
}

function selectBoard(board) {
    selectedBoard = board;
    selectedClass = "ALL";
    selectedSubject = "ALL";

    renderBoardStep();
    
    const classBlock = document.getElementById("classStepBlock");
    const subjectBlock = document.getElementById("subjectStepBlock");

    if (classBlock) classBlock.style.display = "block";
    if (subjectBlock) subjectBlock.style.display = "none";
    
    renderClassStep();
    filterStudentTests();
}

// STEP 2: CLASS GENERATION
function renderClassStep() {
    const grid = document.getElementById("classOptionsGrid");
    if (!grid) return;

    const availableClasses = new Set();
    
    studentTests.forEach(test => {
        const fullText = `${test.title || ''} ${test.class_level || ''}`.toUpperCase();
        
        let boardMatch = (selectedBoard === "ALL") || 
            (selectedBoard === "BSEB" && (fullText.includes("BSEB") || fullText.includes("BIHAR"))) ||
            fullText.includes(selectedBoard.toUpperCase());

        if (boardMatch) {
            if (test.class_level && test.class_level.trim() !== "") {
                availableClasses.add(test.class_level.trim());
            } else if (fullText.includes("12")) availableClasses.add("Class 12th");
            else if (fullText.includes("11")) availableClasses.add("Class 11th");
            else if (fullText.includes("10")) availableClasses.add("Class 10th");
        }
    });

    let html = `<button class="chip-btn ${selectedClass === 'ALL' ? 'active' : ''}" onclick="selectClass('ALL')">All Classes</button>`;
    
    availableClasses.forEach(cls => {
        const activeClass = selectedClass === cls ? 'active' : '';
        html += `<button class="chip-btn ${activeClass}" onclick="selectClass('${cls}')">${cls}</button>`;
    });

    grid.innerHTML = html;
}

function selectClass(cls) {
    selectedClass = cls;
    selectedSubject = "ALL";

    renderClassStep();

    const subjectBlock = document.getElementById("subjectStepBlock");
    if (subjectBlock) subjectBlock.style.display = "block";
    
    renderSubjectStep();
    filterStudentTests();
}

// STEP 3: SUBJECT GENERATION
function renderSubjectStep() {
    const grid = document.getElementById("subjectOptionsGrid");
    if (!grid) return;

    const availableSubjects = new Set();

    studentTests.forEach(test => {
        const fullText = `${test.title || ''} ${test.class_level || ''}`.toUpperCase();
        
        let boardMatch = (selectedBoard === "ALL") || 
            (selectedBoard === "BSEB" && (fullText.includes("BSEB") || fullText.includes("BIHAR"))) ||
            fullText.includes(selectedBoard.toUpperCase());

        let classMatch = (selectedClass === "ALL") ||
            (test.class_level && test.class_level.trim() === selectedClass) ||
            (selectedClass.includes("12") && fullText.includes("12")) ||
            (selectedClass.includes("11") && fullText.includes("11")) ||
            (selectedClass.includes("10") && fullText.includes("10"));

        if (boardMatch && classMatch && test.subject) {
            availableSubjects.add(test.subject.trim());
        }
    });

    let html = `<button class="chip-btn ${selectedSubject === 'ALL' ? 'active' : ''}" onclick="selectSubject('ALL')">All Subjects</button>`;
    
    availableSubjects.forEach(sub => {
        const activeClass = selectedSubject === sub ? 'active' : '';
        html += `<button class="chip-btn ${activeClass}" onclick="selectSubject('${sub}')">${sub}</button>`;
    });

    grid.innerHTML = html;
}

function selectSubject(sub) {
    selectedSubject = sub;
    renderSubjectStep();
    filterStudentTests();
}

function resetExploreSelections() {
    selectedBoard = "ALL";
    selectedClass = "ALL";
    selectedSubject = "ALL";
    
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";
    
    const classBlock = document.getElementById("classStepBlock");
    const subjectBlock = document.getElementById("subjectStepBlock");
    
    if (classBlock) classBlock.style.display = "none";
    if (subjectBlock) subjectBlock.style.display = "none";
    
    renderBoardStep();
    filterStudentTests();
}

/* ==========================================
   DYNAMIC MULTI-FILTER ENGINE (STUDENT TESTS)
   ========================================== */
function filterStudentTests() {
    const searchInput = document.getElementById("searchInput");
    var searchVal = searchInput ? searchInput.value.toLowerCase().trim() : "";

    if (searchVal !== "" && !isExploreOpen) {
        toggleExplorePage();
    }

    if (!isExploreOpen && searchVal === "" && selectedBoard === "ALL" && selectedClass === "ALL" && selectedSubject === "ALL") {
        renderRecentFiveTests();
        return;
    }

    var filtered = studentTests.filter(function(test) {
        var testTitle = (test.title || '').toLowerCase();
        var testClassLevel = (test.class_level || '').toLowerCase();
        var testSubject = (test.subject || '').toLowerCase();

        var combinedSearchText = testTitle + " " + testClassLevel;

        var matchesSearch = searchVal === "" || combinedSearchText.indexOf(searchVal) !== -1;

        var matchesBoard = (selectedBoard === "ALL") ||
                           (selectedBoard === "BSEB" && (combinedSearchText.indexOf("bseb") !== -1 || combinedSearchText.indexOf("bihar") !== -1)) ||
                           combinedSearchText.indexOf(selectedBoard.toLowerCase()) !== -1;

        var matchesClass = (selectedClass === "ALL") ||
                           (test.class_level && test.class_level === selectedClass) ||
                           (selectedClass.indexOf("12") !== -1 && combinedSearchText.indexOf("12") !== -1) ||
                           (selectedClass.indexOf("11") !== -1 && combinedSearchText.indexOf("11") !== -1) ||
                           (selectedClass.indexOf("10") !== -1 && combinedSearchText.indexOf("10") !== -1);

        var matchesSubject = (selectedSubject === "ALL") ||
                             testSubject.indexOf(selectedSubject.toLowerCase()) !== -1;

        return matchesSearch && matchesBoard && matchesClass && matchesSubject;
    });

    const headingTitle = document.getElementById("headingTitle");
    const testCountBadge = document.getElementById("testCountBadge");
    
    if (headingTitle) headingTitle.innerHTML = `<i class="fa-solid fa-list-check" style="color: #4A00E0;"></i> Filtered Tests`;
    if (testCountBadge) testCountBadge.innerText = filtered.length + " Found";

    renderStudentTests(filtered);
}

function renderStudentTests(tests) {
    const container = document.getElementById("studentTestsContainer");
    if (!container) return;

    hideGlobalSpinner();
    scanLocalDrafts();

    // EMPTY STATE WITH GRAPHIC
    if (tests.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px;">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 12px auto; display: block;">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
                <h4 style="color: #475569; font-size: 16px; margin-bottom: 4px;">Koi Test Nahi Mila</h4>
                <p style="color: #94a3b8; font-size: 13px;">Kripya apne filters ya search query badal kar dekhein.</p>
            </div>
        `;
        return;
    }

    let html = "";
    tests.forEach(test => {
        let qCount = test.questions_data ? test.questions_data.length : 0;
        let timeMins = test.time_limit_mins || 15;
        let classBadge = test.class_level ? `<span style="background: #edf2f7; color: #4a5568; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 6px;">${test.class_level}</span>` : '';

        // STRICT 7-DAYS NEW BADGE LOGIC
        let isNew = false;
        if (test.created_at) {
            const testDate = new Date(test.created_at);
            const now = new Date();
            const diffDays = (now - testDate) / (1000 * 60 * 60 * 24);
            if (diffDays >= 0 && diffDays <= 7) {
                isNew = true;
            }
        }
        let newBadgeHtml = isNew ? `<span class="badge-new">NEW</span>` : '';

        // BUTTON STATE DETERMINATION (RESUME vs REATTEMPT vs START)
        let statusBlockHtml = '';
        let buttonText = 'Start Test';
        let buttonIcon = 'fa-arrow-right';
        let buttonClass = 'btn-primary';
        let isReattempt = false;
        let isResume = false;

        const hasDraft = !!userDraftsMap[test.id];
        const prevStats = userTestResultsMap[test.id];

        if (hasDraft) {
            buttonText = 'Resume Test';
            buttonIcon = 'fa-play';
            buttonClass = 'btn-resume';
            isResume = true;

            const draft = userDraftsMap[test.id];
            const attemptedCount = draft.userAnswers ? Object.keys(draft.userAnswers).length : 0;
            
            statusBlockHtml = `
                <div style="margin-top: 10px; padding: 8px 10px; background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; border-radius: 6px; font-size: 11px; font-weight: 700; color: #b45309; display: flex; justify-content: space-between; align-items: center;">
                    <span><i class="fa-solid fa-pause-circle"></i> In Progress (${attemptedCount}/${qCount} Ans)</span>
                    <span style="font-size: 10px; background: #f59e0b; color:#fff; padding:2px 6px; border-radius:4px;">Unfinished</span>
                </div>
            `;
        } else if (prevStats) {
            buttonText = 'Reattempt Test';
            buttonIcon = 'fa-rotate-right';
            buttonClass = 'btn-reattempt';
            isReattempt = true;

            let badgeColor = prevStats.percentage >= 60 ? '#10b981' : (prevStats.percentage >= 40 ? '#f59e0b' : '#ef4444');
            
            statusBlockHtml = `
                <div style="margin-top: 10px; padding: 8px 10px; background: rgba(0,0,0,0.03); border-left: 3px solid ${badgeColor}; border-radius: 6px; font-size: 11px; font-weight: 700; color: #4b5563; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span><i class="fa-solid fa-chart-line" style="color:${badgeColor}; margin-right: 4px;"></i> Last Attempt:</span>
                        <span style="color:${badgeColor}; font-weight: 800; margin-left: 4px;">${prevStats.score}/${prevStats.total_marks} (${prevStats.percentage}%)</span>
                    </div>
                    <button class="btn-share" onclick="shareTestScore('${test.title.replace(/'/g, "\\'")}', ${prevStats.score}, ${prevStats.total_marks}, ${prevStats.percentage}, '${test.id}')">
                        <i class="fa-brands fa-whatsapp"></i> Share Link
                    </button>
                </div>
            `;
        }

        html += `
            <div class="test-card">
                <div class="test-card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>${test.title} ${classBadge}</h3>
                    ${newBadgeHtml}
                </div>
                <div class="test-meta">
                    <span><i class="fa-solid fa-file-alt"></i> ${qCount} Qs</span> • 
                    <span><i class="fa-solid fa-clock"></i> ${timeMins} Mins</span> • 
                    <span><i class="fa-solid fa-book"></i> ${test.subject || 'General'}</span>
                </div>
                ${statusBlockHtml}
                <button class="${buttonClass}" onclick="handleStartTest('${test.id}', ${isReattempt}, ${isResume})" style="margin-top: 12px; width: 100%;">
                    ${buttonText} <i class="fa-solid ${buttonIcon}"></i>
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}
/* ==========================================
   DIRECT WHATSAPP SHARE WITH SCORE & TEST LINK
   ========================================== */
function shareTestScore(testTitle, score, totalMarks, percentage, testId) {
    // Domain ka root origin nikalne ke liye (e.g. https://roitx.qd.je)
    const baseUrl = window.location.origin;
    const testLink = `${baseUrl}/take-test.html?id=${encodeURIComponent(testId)}`;

    const shareText = 
`🏆 *ROITX TESTHUB SCORE CARD* 🏆
--------------------------------
📝 *Test:* ${testTitle}
🎯 *Score:* ${score} / ${totalMarks}
📊 *Percentage:* ${percentage}%
--------------------------------
👉 *Aap bhi ye test attempt karke apna rank dekhein:*
${testLink}`;

    openWhatsAppFallback(shareText);
}

function openWhatsAppFallback(text) {
    const encodedText = encodeURIComponent(text);
    const waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(waUrl, '_blank');
}


/* ==========================================
   AUTH & MODAL HANDLING
   ========================================== */
function handleStartTest(testId, isReattempt = false, isResume = false) {
    const userLoggedIn = isLoggedIn || localStorage.getItem("isLoggedIn") === "true";

    if (!userLoggedIn) {
        showAuthModal("Test attempt karne ke liye pehle login karein!");
        return;
    }

    let urlParams = `id=${testId}`;
    if (isReattempt) urlParams += '&reattempt=true';
    if (isResume) urlParams += '&resume=true';

    window.location.href = `take-test.html?${urlParams}`;
}

function showAuthModal(customMessage) {
    const authModal = document.getElementById("authModal");
    if (authModal) {
        const msgElem = document.getElementById("authModalMsg");
        if (msgElem && customMessage) {
            msgElem.innerText = customMessage;
        }
        authModal.style.display = "flex";
    } else {
        alert(customMessage);
        window.location.href = "login.html";
    }
}

function closeAuthModal() {
    const modal = document.getElementById("authModal");
    if (modal) modal.style.display = "none";
}

function redirectToLogin() {
    window.location.href = "login.html";
}

/* ==========================================
   NAVIGATION & TAB SWITCHING
   ========================================== */
function switchTab(tab) {
    const testsSec = document.getElementById("testsSection");
    const leaderSec = document.getElementById("leaderboardSection");
    const tabTestsBtn = document.getElementById("tabTestsBtn");
    const tabLeaderboardBtn = document.getElementById("tabLeaderboardBtn");

    if (tab === 'tests') {
        if (testsSec) testsSec.style.display = "block";
        if (leaderSec) leaderSec.style.display = "none";
        if (tabTestsBtn) tabTestsBtn.classList.add("active");
        if (tabLeaderboardBtn) tabLeaderboardBtn.classList.remove("active");
    } else {
        const userLoggedIn = isLoggedIn || localStorage.getItem("isLoggedIn") === "true";
        if (!userLoggedIn) {
            showAuthModal("Leaderboard dekhne ke liye pehle login karein!");
            return;
        }

        if (testsSec) testsSec.style.display = "none";
        if (leaderSec) leaderSec.style.display = "block";
        if (tabTestsBtn) tabTestsBtn.classList.remove("active");
        if (tabLeaderboardBtn) tabLeaderboardBtn.classList.add("active");
        loadLeaderboardData();
    }
}

/* ==========================================
   STEP-BY-STEP LEADERBOARD FILTER SYSTEM
   ========================================== */
function toggleLeaderboardFilters() {
    const drawer = document.getElementById('leaderboardFilterDrawer');
    const chevron = document.getElementById('lbChevron');
    if (!drawer) return;

    const isHidden = drawer.style.display === 'none' || drawer.style.display === '';
    drawer.style.display = isHidden ? 'block' : 'none';
    if (chevron) chevron.className = isHidden ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
}

function populateLeaderboardTestDropdown(tests) {
    const lbSelect = document.getElementById("leaderboardFilterTest");
    if (!lbSelect) return;

    let html = `<option value="ALL">All Tests Combined</option>`;
    tests.forEach(t => {
        html += `<option value="${t.id}">${t.title}</option>`;
    });
    lbSelect.innerHTML = html;
}

function initLeaderboardStepView() {
    renderLbBoardStep();
}

// STEP 1: LEADERBOARD BOARDS
function renderLbBoardStep() {
    const boardBox = document.getElementById("lbBoardChips");
    if (!boardBox) return;

    const boards = new Set();
    studentTests.forEach(t => {
        const titleUpper = (t.title || "").toUpperCase();
        if (titleUpper.includes("BSEB") || titleUpper.includes("BIHAR")) boards.add("BSEB");
        else if (titleUpper.includes("CBSE")) boards.add("CBSE");
        else if (titleUpper.includes("NEET")) boards.add("NEET");
        else if (titleUpper.includes("JEE")) boards.add("JEE");
    });

    let html = `<button class="chip-btn ${selectedLbBoard === 'ALL' ? 'active' : ''}" onclick="selectLbBoardStep('ALL')">All Boards</button>`;
    boards.forEach(b => {
        html += `<button class="chip-btn ${selectedLbBoard === b ? 'active' : ''}" onclick="selectLbBoardStep('${b}')">${b}</button>`;
    });

    boardBox.innerHTML = html;
    renderLbClassStep();
}

function selectLbBoardStep(b) {
    selectedLbBoard = b;
    selectedLbClass = "ALL";
    selectedLbSubject = "ALL";
    selectedLbTestId = "ALL";

    renderLbBoardStep();
    loadLeaderboardData();
}

// STEP 2: LEADERBOARD CLASSES
function renderLbClassStep() {
    const classBox = document.getElementById("lbClassChips");
    if (!classBox) return;

    const classes = new Set();
    studentTests.forEach(t => {
        const fullText = `${t.title || ''} ${t.class_level || ''}`.toUpperCase();
        
        let boardMatch = (selectedLbBoard === "ALL") || 
            (selectedLbBoard === "BSEB" && (fullText.includes("BSEB") || fullText.includes("BIHAR"))) ||
            fullText.includes(selectedLbBoard.toUpperCase());

        if (boardMatch) {
            if (t.class_level && t.class_level.trim() !== "") {
                classes.add(t.class_level.trim());
            } else if (fullText.includes("12")) classes.add("Class 12th");
            else if (fullText.includes("11")) classes.add("Class 11th");
            else if (fullText.includes("10")) classes.add("Class 10th");
        }
    });

    let html = `<button class="chip-btn ${selectedLbClass === 'ALL' ? 'active' : ''}" onclick="selectLbClassStep('ALL')">All Classes</button>`;
    classes.forEach(c => {
        html += `<button class="chip-btn ${selectedLbClass === c ? 'active' : ''}" onclick="selectLbClassStep('${c}')">${c}</button>`;
    });

    classBox.innerHTML = html;
    renderLbSubjectStep();
}

function selectLbClassStep(c) {
    selectedLbClass = c;
    selectedLbSubject = "ALL";
    selectedLbTestId = "ALL";

    renderLbClassStep();
    loadLeaderboardData();
}

// STEP 3: LEADERBOARD SUBJECTS
function renderLbSubjectStep() {
    const subjectBox = document.getElementById("lbSubjectChips");
    if (!subjectBox) return;

    const subjects = new Set();
    studentTests.forEach(t => {
        const fullText = `${t.title || ''} ${t.class_level || ''}`.toUpperCase();
        
        let boardMatch = (selectedLbBoard === "ALL") || 
            (selectedLbBoard === "BSEB" && (fullText.includes("BSEB") || fullText.includes("BIHAR"))) ||
            fullText.includes(selectedLbBoard.toUpperCase());

        let classMatch = (selectedLbClass === "ALL") ||
            (t.class_level && t.class_level.trim() === selectedLbClass) ||
            (selectedLbClass.includes("12") && fullText.includes("12")) ||
            (selectedLbClass.includes("11") && fullText.includes("11")) ||
            (selectedLbClass.includes("10") && fullText.includes("10"));

        if (boardMatch && classMatch && t.subject) {
            subjects.add(t.subject.trim());
        }
    });

    let html = `<button class="chip-btn ${selectedLbSubject === 'ALL' ? 'active' : ''}" onclick="selectLbSubjectStep('ALL')">All Subjects</button>`;
    subjects.forEach(s => {
        html += `<button class="chip-btn ${selectedLbSubject === s ? 'active' : ''}" onclick="selectLbSubjectStep('${s}')">${s}</button>`;
    });

    subjectBox.innerHTML = html;
    renderLbTestStep();
}

function selectLbSubjectStep(s) {
    selectedLbSubject = s;
    selectedLbTestId = "ALL";

    renderLbSubjectStep();
    loadLeaderboardData();
}

// STEP 4: LEADERBOARD SPECIFIC TEST
function renderLbTestStep() {
    const testBox = document.getElementById("lbTestChips");
    if (!testBox) return;

    const filteredTests = studentTests.filter(t => {
        const fullText = `${t.title || ''} ${t.class_level || ''}`.toUpperCase();

        let boardMatch = (selectedLbBoard === "ALL") || 
            (selectedLbBoard === "BSEB" && (fullText.includes("BSEB") || fullText.includes("BIHAR"))) ||
            fullText.includes(selectedLbBoard.toUpperCase());

        let classMatch = (selectedLbClass === "ALL") ||
            (t.class_level && t.class_level.trim() === selectedLbClass) ||
            (selectedLbClass.includes("12") && fullText.includes("12")) ||
            (selectedLbClass.includes("11") && fullText.includes("11")) ||
            (selectedLbClass.includes("10") && fullText.includes("10"));

        let subMatch = (selectedLbSubject === "ALL") || 
            (t.subject && t.subject.trim().toLowerCase().includes(selectedLbSubject.toLowerCase()));

        return boardMatch && classMatch && subMatch;
    });

    let html = `<button class="chip-btn ${selectedLbTestId === 'ALL' ? 'active' : ''}" onclick="selectLbTestStep('ALL')">All Tests Combined</button>`;
    filteredTests.forEach(t => {
        html += `<button class="chip-btn ${selectedLbTestId === t.id ? 'active' : ''}" onclick="selectLbTestStep('${t.id}')">${t.title}</button>`;
    });

    testBox.innerHTML = html;
}

function selectLbTestStep(testId) {
    selectedLbTestId = testId;
    renderLbTestStep();
    loadLeaderboardData();
}

function resetLeaderboardFilters() {
    selectedLbBoard = "ALL";
    selectedLbClass = "ALL";
    selectedLbSubject = "ALL";
    selectedLbTestId = "ALL";

    initLeaderboardStepView();
    loadLeaderboardData();
}

/* ==========================================
   PODIUM & LEADERBOARD FETCHING LOGIC
   ========================================== */
function renderPodiumCards(data) {
    let container = document.getElementById("podiumContainer");
    const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    const crownSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#f6e05e"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`;
    
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = "";
        return;
    }

    const top1 = data[0] || null;
    const top2 = data[1] || null;
    const top3 = data[2] || null;

    let html = "";

    if (top2) {
        let photo = top2.profiles?.avatar_url || defaultAvatar;
        html += `
            <div class="podium-card rank-2">
                <img src="${photo}" class="podium-avatar" alt="Rank 2" onerror="this.src='${defaultAvatar}'">
                <div class="podium-badge">2</div>
                <div class="podium-name">${top2.profiles?.full_name || 'Student'}</div>
                <div class="podium-score">${top2.score}/${top2.total_marks}</div>
            </div>
        `;
    }

    if (top1) {
        let photo = top1.profiles?.avatar_url || defaultAvatar;
        html += `
            <div class="podium-card rank-1">
                ${crownSvg}
                <img src="${photo}" class="podium-avatar" alt="Rank 1" onerror="this.src='${defaultAvatar}'">
                <div class="podium-badge">1</div>
                <div class="podium-name">${top1.profiles?.full_name || 'Student'}</div>
                <div class="podium-score">${top1.score}/${top1.total_marks}</div>
            </div>
        `;
    }

    if (top3) {
        let photo = top3.profiles?.avatar_url || defaultAvatar;
        html += `
            <div class="podium-card rank-3">
                <img src="${photo}" class="podium-avatar" alt="Rank 3" onerror="this.src='${defaultAvatar}'">
                <div class="podium-badge">3</div>
                <div class="podium-name">${top3.profiles?.full_name || 'Student'}</div>
                <div class="podium-score">${top3.score}/${top3.total_marks}</div>
            </div>
        `;
    }

    container.innerHTML = html;
}

async function loadLeaderboardData() {
    const tbody = document.getElementById("leaderboardBody");
    const loader = document.getElementById("leaderboardLoader");

    if (loader) loader.style.display = "block";

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            showAuthModal("Leaderboard dekhne ke liye pehle login karein!");
            if (loader) loader.style.display = "none";
            return;
        }

        const { data: userProfile } = await window.supabaseClient
            .from('profiles')
            .select('pincode')
            .eq('id', user.id)
            .maybeSingle();

        let currentPincode = userProfile?.pincode;

        if (!currentPincode || currentPincode.trim() === "") {
            const enteredPin = prompt("📍 Apne ilake ka Leaderboard dekhne ke liye apna 6-digit Pincode darj karein:");
            if (enteredPin && enteredPin.trim().length === 6) {
                currentPincode = enteredPin.trim();
                await window.supabaseClient
                    .from('profiles')
                    .update({ pincode: currentPincode })
                    .eq('id', user.id);
            } else {
                if (tbody) {
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#e53e3e; font-weight:bold; padding:20px;">⚠️ Leaderboard dekhne ke liye valid Pincode add karna zaroori hai.</td></tr>`;
                }
                renderPodiumCards([]);
                return;
            }
        }

        let query = window.supabaseClient
            .from('test_results')
            .select(`
                score,
                total_marks,
                test_id,
                tests ( title, subject, class_level ),
                profiles ( full_name, pincode, avatar_url, city )
            `)
            .order('score', { ascending: false })
            .limit(100);

        if (selectedLbTestId && selectedLbTestId !== "ALL") {
            query = query.eq('test_id', selectedLbTestId);
        }

        const { data, error } = await query;
        if (error) throw error;

        let filteredData = (data || []).filter(row => {
            const rowPincode = row.profiles?.pincode || '';
            const isPincodeMatch = rowPincode === currentPincode;

            const testTitle = (row.tests?.title || '').toLowerCase();
            const testClass = (row.tests?.class_level || '').toLowerCase();
            const testSub = (row.tests?.subject || '').toLowerCase();
            const combinedText = testTitle + " " + testClass;

            const matchesBoard = (selectedLbBoard === "ALL") ||
                (selectedLbBoard === "BSEB" && (combinedText.includes("bseb") || combinedText.includes("bihar"))) ||
                combinedText.includes(selectedLbBoard.toLowerCase());

            const matchesClass = (selectedLbClass === "ALL") ||
                (row.tests?.class_level && row.tests.class_level === selectedLbClass) ||
                (selectedLbClass.includes("12") && combinedText.includes("12")) ||
                (selectedLbClass.includes("11") && combinedText.includes("11")) ||
                (selectedLbClass.includes("10") && combinedText.includes("10"));

            const matchesSubject = (selectedLbSubject === "ALL") ||
                testSub.includes(selectedLbSubject.toLowerCase());

            return isPincodeMatch && matchesBoard && matchesClass && matchesSubject;
        });

        renderPodiumCards(filteredData);

        let html = "";
        const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
        const locationSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="#a0aec0" style="vertical-align: middle; margin-right: 3px;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5-2.5z"/></svg>`;
        const crownSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#f6e05e"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`;

        filteredData.forEach((row, index) => {
            let rankDisplay = index === 0 ? crownSvg : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `#${index + 1}`));
            let userPhoto = row.profiles?.avatar_url || defaultAvatar;
            let areaName = row.profiles?.city || 'N/A';
            let pincodeText = row.profiles?.pincode ? `<div style="font-size: 11px; color: #718096; margin-top: 2px;">${row.profiles.pincode}</div>` : '';

            let percentage = (row.total_marks && row.total_marks > 0) 
                ? Math.round((row.score / row.total_marks) * 100) 
                : 0;

            html += `
                <tr>
                    <td><strong>${rankDisplay}</strong></td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <img src="${userPhoto}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" alt="profile" onerror="this.src='${defaultAvatar}'">
                            <b>${row.profiles?.full_name || 'Student'}</b>
                        </div>
                    </td>
                    <td>
                        <div>${locationSvg}<span style="font-weight: 600;">${areaName}</span></div>
                        ${pincodeText}
                    </td>
                    <td>${row.tests?.title || 'Test'}</td>
                    <td>
                        <span style="color:#007bff; font-weight:800;">${row.score}</span> / ${row.total_marks}
                        <div style="font-size: 11px; color: #10b981; font-weight: bold; margin-top: 2px;">(${percentage}%)</div>
                    </td>
                </tr>
            `;
        });

        if (tbody) {
            tbody.innerHTML = html || `<tr><td colspan="5" style="text-align:center; padding:20px; color:#718096;">Is filter criteria ke liye koi leaderboard entries nahi mili.</td></tr>`;
        }
    } catch (err) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error loading leaderboard: ${err.message}</td></tr>`;
        }
    } finally {
        if (loader) loader.style.display = "none";
    }
}
