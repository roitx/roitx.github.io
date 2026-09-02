/* ==========================================
   STATE MANAGEMENT & GLOBAL VARIABLES
   ========================================== */
let studentTests = [];
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
   DATA FETCHING & RENDERING
   ========================================== */
async function fetchStudentTests() {
    const loader = document.getElementById("loaderBox");
    if (loader) loader.style.display = "block";

    try {
        const { data, error } = await window.supabaseClient
            .from('tests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        studentTests = data || [];
        populateLeaderboardTestDropdown(studentTests);
        initLeaderboardStepView(); // Initializes step-by-step filter flow for leaderboard
        renderRecentFiveTests();
    } catch (err) {
        const statusMsg = document.getElementById("statusMsg");
        if (statusMsg) {
            statusMsg.style.display = "block";
            statusMsg.innerText = "❌ Error loading tests: " + err.message;
        }
    } finally {
        if (loader) loader.style.display = "none";
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

// STEP 1: BOARD GENERATION (Tests)
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

// STEP 2: CLASS GENERATION (Tests)
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

// STEP 3: SUBJECT GENERATION (Tests)
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

    if (tests.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #777; width: 100%; grid-column: 1 / -1; margin-top: 30px;">Is selection ke mutabiq koi test nahi mila.</p>`;
        return;
    }

    let html = "";
    tests.forEach(test => {
        let qCount = test.questions_data ? test.questions_data.length : 0;
        let timeMins = test.time_limit_mins || 15;
        let classBadge = test.class_level ? `<span style="background: #edf2f7; color: #4a5568; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 6px;">${test.class_level}</span>` : '';

        // NEW BADGE LOGIC
        let isNew = false;
        if (test.created_at) {
            const testDate = new Date(test.created_at);
            const now = new Date();
            const diffDays = (now - testDate) / (1000 * 60 * 60 * 24);
            if (diffDays <= 7) {
                isNew = true;
            }
        }
        let newBadgeHtml = isNew ? `<span class="badge-new">NEW</span>` : '';

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
                <button onclick="handleStartTest('${test.id}')">Start Test <i class="fa-solid fa-arrow-right"></i></button>
            </div>
        `;
    });

    container.innerHTML = html;
}

/* ==========================================
   AUTH & MODAL HANDLING
   ========================================== */
function handleStartTest(testId) {
    const userLoggedIn = isLoggedIn || localStorage.getItem("isLoggedIn") === "true";

    if (!userLoggedIn) {
        showAuthModal("Test attempt karne ke liye pehle login karein!");
        return;
    }

    window.location.href = `take-test.html?id=${testId}`;
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
   STEP-BY-STEP LEADERBOARD FILTER SYSTEM (NEW STEP FLOW)
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

// Initializing Leaderboard Step Filters
function initLeaderboardStepView() {
    renderLbBoardStep();
    
    // Hide future steps initially
    const classBlock = document.getElementById("lbClassStepBlock");
    const subjectBlock = document.getElementById("lbSubjectStepBlock");
    const testBlock = document.getElementById("lbTestStepBlock");

    if (classBlock) classBlock.style.display = "none";
    if (subjectBlock) subjectBlock.style.display = "none";
    if (testBlock) testBlock.style.display = "none";
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
}

function selectLbBoardStep(b) {
    selectedLbBoard = b;
    selectedLbClass = "ALL";
    selectedLbSubject = "ALL";
    selectedLbTestId = "ALL";

    renderLbBoardStep();

    const classBlock = document.getElementById("lbClassStepBlock");
    const subjectBlock = document.getElementById("lbSubjectStepBlock");
    const testBlock = document.getElementById("lbTestStepBlock");

    if (classBlock) classBlock.style.display = "block";
    if (subjectBlock) subjectBlock.style.display = "none";
    if (testBlock) testBlock.style.display = "none";

    renderLbClassStep();
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
}

function selectLbClassStep(c) {
    selectedLbClass = c;
    selectedLbSubject = "ALL";
    selectedLbTestId = "ALL";

    renderLbClassStep();

    const subjectBlock = document.getElementById("lbSubjectStepBlock");
    const testBlock = document.getElementById("lbTestStepBlock");

    if (subjectBlock) subjectBlock.style.display = "block";
    if (testBlock) testBlock.style.display = "none";

    renderLbSubjectStep();
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
}

function selectLbSubjectStep(s) {
    selectedLbSubject = s;
    selectedLbTestId = "ALL";

    renderLbSubjectStep();

    const testBlock = document.getElementById("lbTestStepBlock");
    if (testBlock) testBlock.style.display = "block";

    renderLbTestStep();
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
    
    if (!container) {
        const lbSection = document.getElementById("leaderboardSection");
        if (!lbSection) return;
        container = document.createElement("div");
        container.id = "podiumContainer";
        container.className = "podium-container";
        const tableContainer = lbSection.querySelector(".table-container");
        if (tableContainer) {
            lbSection.insertBefore(container, tableContainer);
        } else {
            lbSection.appendChild(container);
        }
    }

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
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#e53e3e; font-weight:bold; padding:20px;">⚠️ Leaderboard dekhne ke liye valid Pincode add karna zaroori hai. Page refresh karke dobara try karein.</td></tr>`;
                }
                renderPodiumCards([]);
                return;
            }
        }

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        let query = window.supabaseClient
            .from('test_results')
            .select(`
                score,
                total_marks,
                test_id,
                tests!inner ( title, subject, class_level ),
                profiles!inner ( full_name, pincode, avatar_url, city )
            `)
            .eq('profiles.pincode', currentPincode)
            .gte('created_at', firstDayOfMonth)
            .order('score', { ascending: false })
            .limit(50);

        if (selectedLbTestId && selectedLbTestId !== "ALL") {
            query = query.eq('test_id', selectedLbTestId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Dynamic Filtering
        let filteredData = (data || []).filter(row => {
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

            return matchesBoard && matchesClass && matchesSubject;
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
