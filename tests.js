let studentTests = [];
let isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

// 1. AUTOMATIC AUTH SYNC, THEME TOGGLE & DATA INITIALIZATION
document.addEventListener("DOMContentLoaded", async () => {
    initDarkModeSupport();

    if (window.supabaseClient) {
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            isLoggedIn = !!(session && session.user);
            localStorage.setItem("isLoggedIn", isLoggedIn ? "true" : "false");

            window.supabaseClient.auth.onAuthStateChange((event, session) => {
                isLoggedIn = !!(session && session.user);
                localStorage.setItem("isLoggedIn", isLoggedIn ? "true" : "false");
            });
        } catch (e) {
            console.warn("Supabase auth error:", e);
        }
    }
    fetchStudentTests();
});

// DARK MODE SUPPORT LOGIC
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

// 2. FETCH TESTS FROM SUPABASE
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
        populateDynamicFilters(studentTests);
        populateLeaderboardTestDropdown(studentTests);
        renderStudentTests(studentTests);
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

// 3. DYNAMICALLY GENERATE FILTER DROPDOWNS
function populateDynamicFilters(tests) {
    const boardSelect = document.getElementById("filterBoard");
    const classSelect = document.getElementById("filterClass");
    const subjectSelect = document.getElementById("filterSubject");

    const boards = new Set();
    const classes = new Set();
    const subjects = new Set();

    tests.forEach(test => {
        const fullText = `${test.title || ''} ${test.class_level || ''}`.toUpperCase();

        if (fullText.includes("BSEB") || fullText.includes("BIHAR")) boards.add("BSEB");
        if (fullText.includes("CBSE")) boards.add("CBSE");
        if (fullText.includes("NEET")) boards.add("NEET");
        if (fullText.includes("JEE")) boards.add("JEE");

        if (fullText.includes("12")) classes.add("Class 12th");
        else if (fullText.includes("11")) classes.add("Class 11th");
        else if (fullText.includes("10")) classes.add("Class 10th");

        if (test.subject) subjects.add(test.subject.trim());
    });

    if (boardSelect) {
        let html = `<option value="all">All Boards / Exams</option>`;
        boards.forEach(b => { html += `<option value="${b.toLowerCase()}">${b}</option>`; });
        boardSelect.innerHTML = html;
    }

    if (classSelect) {
        let html = `<option value="all">All Classes</option>`;
        classes.forEach(c => { html += `<option value="${c.toLowerCase()}">${c}</option>`; });
        classSelect.innerHTML = html;
    }

    if (subjectSelect) {
        let html = `<option value="all">All Subjects</option>`;
        subjects.forEach(s => { html += `<option value="${s.toLowerCase()}">${s}</option>`; });
        subjectSelect.innerHTML = html;
    }
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

// 4. FILTER TESTS IN REAL-TIME
function filterStudentTests() {
    var searchVal = document.getElementById("searchInput") ? document.getElementById("searchInput").value.toLowerCase().trim() : "";
    var boardVal = document.getElementById("filterBoard") ? document.getElementById("filterBoard").value.toLowerCase().trim() : "all";
    var classVal = document.getElementById("filterClass") ? document.getElementById("filterClass").value.toLowerCase().trim() : "all";
    var subjectVal = document.getElementById("filterSubject") ? document.getElementById("filterSubject").value.toLowerCase().trim() : "all";

    var filtered = studentTests.filter(function(test) {
        var testTitle = (test.title || '').toLowerCase();
        var testClassLevel = (test.class_level || '').toLowerCase();
        var testSubject = (test.subject || '').toLowerCase();

        var combinedSearchText = testTitle + " " + testClassLevel;

        var matchesSearch = searchVal === "" || combinedSearchText.indexOf(searchVal) !== -1;

        var matchesBoard = (boardVal === "all" || boardVal === "") ||
                           (boardVal === "bseb" && (combinedSearchText.indexOf("bseb") !== -1 || combinedSearchText.indexOf("bihar") !== -1)) ||
                           combinedSearchText.indexOf(boardVal) !== -1;

        var matchesClass = (classVal === "all" || classVal === "") ||
                           (classVal.indexOf("12") !== -1 && combinedSearchText.indexOf("12") !== -1) ||
                           (classVal.indexOf("11") !== -1 && combinedSearchText.indexOf("11") !== -1) ||
                           (classVal.indexOf("10") !== -1 && combinedSearchText.indexOf("10") !== -1);

        var matchesSubject = (subjectVal === "all" || subjectVal === "") ||
                             testSubject.indexOf(subjectVal) !== -1;

        return matchesSearch && matchesBoard && matchesClass && matchesSubject;
    });

    renderStudentTests(filtered);
}

// 5. RENDER TEST CARDS
function renderStudentTests(tests) {
    const container = document.getElementById("studentTestsContainer");
    if (!container) return;

    if (tests.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #777; width: 100%; grid-column: 1 / -1; margin-top: 30px;">Koi test active nahi hai.</p>`;
        return;
    }

    let html = "";
    tests.forEach(test => {
        let qCount = test.questions_data ? test.questions_data.length : 0;
        let timeMins = test.time_limit_mins || 15;
        let classBadge = test.class_level ? `<span style="background: #edf2f7; color: #4a5568; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 6px;">${test.class_level}</span>` : '';

        html += `
            <div class="test-card">
                <div class="test-card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>${test.title} ${classBadge}</h3>
                    <span class="badge-new">NEW</span>
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

// 6. AUTH CHECK BEFORE STARTING TEST
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

// 7. TAB SWITCHING LOGIC
function switchTab(tab) {
    const testsSec = document.getElementById("testsSection");
    const leaderSec = document.getElementById("leaderboardSection");
    const tabTestsBtn = document.getElementById("tabTestsBtn");
    const tabLeaderboardBtn = document.getElementById("tabLeaderboardBtn");

    if (tab === 'tests') {
        testsSec.style.display = "block";
        leaderSec.style.display = "none";
        tabTestsBtn.classList.add("active");
        tabLeaderboardBtn.classList.remove("active");
    } else {
        testsSec.style.display = "none";
        leaderSec.style.display = "block";
        tabTestsBtn.classList.remove("active");
        tabLeaderboardBtn.classList.add("active");
        loadLeaderboardData();
    }
}

// 8. HIGH PERFORMANCE RESPONSIVE LEADERBOARD DATA LOADER WITH PHOTO & AREA SUPPORT
async function loadLeaderboardData() {
    const tbody = document.getElementById("leaderboardBody");
    const loader = document.getElementById("leaderboardLoader");
    const filterSelect = document.getElementById("leaderboardFilterTest");
    const selectedTestId = filterSelect ? filterSelect.value : "ALL";

    if (loader) loader.style.display = "block";

    try {
        let query = window.supabaseClient
            .from('test_results')
            .select(`
                score,
                total_marks,
                tests ( title ),
                profiles ( full_name, pincode, avatar_url, city )
            `)
            .order('score', { ascending: false })
            .limit(30);

        if (selectedTestId && selectedTestId !== "ALL") {
            query = query.eq('test_id', selectedTestId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Render Top 3 Podium Cards with Photos
        renderPodiumCards(data || []);

        let html = "";
        const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

        (data || []).forEach((row, index) => {
            let rankClass = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `#${index + 1}`));
            let userPhoto = row.profiles?.avatar_url || defaultAvatar;
            let areaName = row.profiles?.city || row.profiles?.pincode || 'N/A';

            html += `
                <tr>
                    <td><strong>${rankClass}</strong></td>
                    <td>
                        <div class="student-name-cell">
                            <img src="${userPhoto}" class="table-avatar" alt="profile" onerror="this.src='${defaultAvatar}'">
                            <b>${row.profiles?.full_name || 'Student'}</b>
                        </div>
                    </td>
                    <td><i class="fa-solid fa-location-dot" style="color:#a0aec0; font-size:12px;"></i> ${areaName}</td>
                    <td>${row.tests?.title || 'Test'}</td>
                    <td><span style="color:#007bff; font-weight:800;">${row.score}</span> / ${row.total_marks}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html || `<tr><td colspan="5" style="text-align:center;">No leaderboard entries found.</td></tr>`;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error loading leaderboard: ${err.message}</td></tr>`;
    } finally {
        if (loader) loader.style.display = "none";
    }
}
// TOP 3 PODIUM RENDERER WITH PROFILE PHOTOS
function renderPodiumCards(data) {
    let container = document.getElementById("podiumContainer");
    const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    
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

    // Rank 2 Card
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

    // Rank 1 Card
    if (top1) {
        let photo = top1.profiles?.avatar_url || defaultAvatar;
        html += `
            <div class="podium-card rank-1">
                <i class="fa-solid fa-crown" style="color: #f6e05e; position: absolute; top: -14px; font-size: 18px;"></i>
                <img src="${photo}" class="podium-avatar" alt="Rank 1" onerror="this.src='${defaultAvatar}'">
                <div class="podium-badge">1</div>
                <div class="podium-name">${top1.profiles?.full_name || 'Student'}</div>
                <div class="podium-score">${top1.score}/${top1.total_marks}</div>
            </div>
        `;
    }

    // Rank 3 Card
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

// 8. HIGH PERFORMANCE RESPONSIVE LEADERBOARD DATA LOADER
async function loadLeaderboardData() {
    const tbody = document.getElementById("leaderboardBody");
    const loader = document.getElementById("leaderboardLoader");
    const filterSelect = document.getElementById("leaderboardFilterTest");
    const selectedTestId = filterSelect ? filterSelect.value : "ALL";

    if (loader) loader.style.display = "block";

    try {
        let query = window.supabaseClient
            .from('test_results')
            .select(`
                score,
                total_marks,
                tests ( title ),
                profiles ( full_name, pincode, avatar_url, city )
            `)
            .order('score', { ascending: false })
            .limit(30);

        if (selectedTestId && selectedTestId !== "ALL") {
            query = query.eq('test_id', selectedTestId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Render Top 3 Podium Cards
        renderPodiumCards(data || []);

        let html = "";
        const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

        (data || []).forEach((row, index) => {
            let rankClass = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `#${index + 1}`));
            let userPhoto = row.profiles?.avatar_url || defaultAvatar;
            let areaName = row.profiles?.city || row.profiles?.pincode || 'N/A';

            html += `
                <tr>
                    <td><strong>${rankClass}</strong></td>
                    <td>
                        <div class="student-name-cell" style="display: flex; align-items: center; gap: 8px;">
                            <img src="${userPhoto}" class="table-avatar" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" alt="profile" onerror="this.src='${defaultAvatar}'">
                            <b>${row.profiles?.full_name || 'Student'}</b>
                        </div>
                    </td>
                    <td><i class="fa-solid fa-location-dot" style="color:#a0aec0; font-size:12px;"></i> ${areaName}</td>
                    <td>${row.tests?.title || 'Test'}</td>
                    <td><span style="color:#007bff; font-weight:800;">${row.score}</span> / ${row.total_marks}</td>
                </tr>
            `;
        });
        if (tbody) {
            tbody.innerHTML = html || `<tr><td colspan="5" style="text-align:center;">No leaderboard entries found.</td></tr>`;
        }
    } catch (err) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error loading leaderboard: ${err.message}</td></tr>`;
        }
    } finally {
        if (loader) loader.style.display = "none";
    }
   
}
// TOP 3 PODIUM RENDERER WITH SVG ICONS
function renderPodiumCards(data) {
    let container = document.getElementById("podiumContainer");
    const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    
    // SVG Icons
    const crownSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="#f6e05e" style="position: absolute; top: -14px;"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`;
    
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

    // Rank 2 Card
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

    // Rank 1 Card
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

    // Rank 3 Card
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

// 8. LEADERBOARD DATA LOADER (WITH AREA + PINCODE BELOW)
async function loadLeaderboardData() {
    const tbody = document.getElementById("leaderboardBody");
    const loader = document.getElementById("leaderboardLoader");
    const filterSelect = document.getElementById("leaderboardFilterTest");
    const selectedTestId = filterSelect ? filterSelect.value : "ALL";

    if (loader) loader.style.display = "block";

    try {
        let query = window.supabaseClient
            .from('test_results')
            .select(`
                score,
                total_marks,
                tests ( title ),
                profiles ( full_name, pincode, avatar_url, city )
            `)
            .order('score', { ascending: false })
            .limit(30);

        if (selectedTestId && selectedTestId !== "ALL") {
            query = query.eq('test_id', selectedTestId);
        }

        const { data, error } = await query;
        if (error) throw error;

        renderPodiumCards(data || []);

        let html = "";
        const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
        
        // Inline SVG Icons
        const locationSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="#a0aec0" style="vertical-align: middle; margin-right: 3px;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
        const crownSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#f6e05e"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`;

        (data || []).forEach((row, index) => {
            let rankDisplay = index === 0 ? crownSvg : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `#${index + 1}`));
            let userPhoto = row.profiles?.avatar_url || defaultAvatar;
            
            let areaName = row.profiles?.city || 'N/A';
            let pincodeText = row.profiles?.pincode ? `<div style="font-size: 11px; color: #718096; margin-top: 2px;">${row.profiles.pincode}</div>` : '';

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
                    <td><span style="color:#007bff; font-weight:800;">${row.score}</span> / ${row.total_marks}</td>
                </tr>
            `;
        });
        if (tbody) {
            tbody.innerHTML = html || `<tr><td colspan="5" style="text-align:center;">No leaderboard entries found.</td></tr>`;
        }
    } catch (err) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error loading leaderboard: ${err.message}</td></tr>`;
        }
    } finally {
        if (loader) loader.style.display = "none";
    }
}
