// ==========================================
// 🧠 STUDY PLATFORM GAME - QUESTION BANK
// ==========================================

// Global dynamic storage variable
let dynamicQuestionCache = {
    science: [],
    math: [],
    reasoning: [],
    currentAffairs: [] // Ise jorna zaroori hai
};


// Yeh function check karega ki dynamic data hai ya nahi, warna local questions dega
function getQuestionsForSubject(subject = "math") {
    // Agar API se fetched questions available hain is category mein
    if (dynamicQuestionCache[subject] && dynamicQuestionCache[subject].length > 0) {
        return dynamicQuestionCache[subject];
    }
    
    // Warna questions.js file se local backup use karega
    if (typeof studyQuestionBank !== 'undefined' && studyQuestionBank[subject]) {
        return studyQuestionBank[subject];
    }
    
    // Default safe fallback
    return [
        {
            question: "18 km/h ko m/s mein badalne par kitna hoga?",
            options: ["5 m/s", "10 m/s", "18 m/s", "2.5 m/s"],
            correctIndex: 0,
            concept: "Speed Conversion: km/h ko 5/18 se multiply kiya jata hai."
        }
    ];
}

// Local Backup Question Bank
const studyQuestionBank = {
    math: [
        {
            question: "18 km/h ko m/s mein badalne par kitna hoga?",
            options: ["5 m/s", "10 m/s", "18 m/s", "2.5 m/s"],
            correctIndex: 0,
            concept: "Speed Conversion: km/h ko 5/18 se multiply kiya jata hai."
        },
        {
            question: "Vritt (Circle) ki sabse badi jeeva (chord) kya hoti hai?",
            options: ["Trijya (Radius)", "Vyas (Diameter)", "Sparsh Rekha", "Chaap"],
            correctIndex: 1,
            concept: "Diameter sabse lambi chord hoti hai jo center se pass hoti hai."
        },
        {
            question: "Samkon tribhuj mein sin(90°) ka maan kya hota hai?",
            options: ["0", "0.5", "1", "Anant"],
            correctIndex: 2,
            concept: "Trigonometry standard table ke anusaar sin(90°) = 1 hota hai."
        },
        {
            question: "Samikaran x² - 16 = 0 ke mool (roots) kya honge?",
            options: ["4", "-4", "+4 ya -4", "16"],
            correctIndex: 2,
            concept: "x² = 16, isliye x = +4 ya -4 dono honge."
        }
    ],
    science: [
        {
            question: "Prakash ki chaal (Speed of Light) vacuum me kitni hoti hai?",
            options: ["3 x 10^8 m/s", "3 x 10^6 m/s", "3000 km/s", "10^8 m/s"],
            correctIndex: 0,
            concept: "Light ki vacuum mein speed lagbhag 300,000 km/s hoti hai."
        },
        {
            question: "Human body mein sabse ladi haddi (bone) kaun si hai?",
            options: ["Femur", "Stapes", "Tibia", "Humerus"],
            correctIndex: 0,
            concept: "Femur (jaangh ki haddi) sharir ki sabse lambi bone hai."
        },
        {
            question: "Paani (Water) ka chemical formula kya hota hai?",
            options: ["CO2", "H2O", "NaCl", "O2"],
            correctIndex: 1,
            concept: "Paani do hydrogen aur ek oxygen atom se milkar banta hai."
        }
    ],
    reasoning: [
        {
            question: "Agar A = 1, CAT = 24 hai, toh DOG kya hoga?",
            options: ["26", "28", "30", "32"],
            correctIndex: 0,
            concept: "Alphabets ke position values ka sum (D=4, O=15, G=7 -> 4+15+7 = 26)."
        },
        {
            question: "Agli sankhya kya hogi: 2, 6, 12, 20, 30, ?",
            options: ["38", "40", "42", "46"],
            correctIndex: 2,
            concept: "Difference +4, +6, +8, +10 badh raha hai, toh 30 + 12 = 42."
        }
    ]
};
