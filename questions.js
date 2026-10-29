// ==========================================
// 🧠 STUDY PLATFORM GAME - QUESTION BANK
// ==========================================

window.dynamicQuestionCache = window.dynamicQuestionCache || {
    science: [],
    math: [],
    reasoning: [],
    currentAffairs: []
};

let usedQuestionIndices = [];

// Complete Question Bank for English, Hindi & Hinglish across all subjects
const studyQuestionBank = {
    math: {
        english: [
            { question: "What is 18 km/h converted to m/s?", options: ["5 m/s", "10 m/s", "18 m/s", "2.5 m/s"], correctIndex: 0 },
            { question: "What is the longest chord of a circle?", options: ["Radius", "Diameter", "Tangent", "Arc"], correctIndex: 1 },
            { question: "What is the square root of 144?", options: ["10", "12", "14", "16"], correctIndex: 1 },
            { question: "If a triangle has angles 60° and 60°, what is the third angle?", options: ["60°", "90°", "45°", "30°"], correctIndex: 0 }
        ],
        hindi: [
            { question: "18 km/h ko m/s mein badalne par kitna hoga?", options: ["5 m/s", "10 m/s", "18 m/s", "2.5 m/s"], correctIndex: 0 },
            { question: "Vritt ki sabse badi jeeva (chord) kya hoti hai?", options: ["Trijya", "Vyas", "Sparsh Rekha", "Chaap"], correctIndex: 1 },
            { question: "144 ka square root kya hai?", options: ["10", "12", "14", "16"], correctIndex: 1 }
        ],
        hinglish: [
            { question: "18 km/h ko m/s me convert karein?", options: ["5 m/s", "10 m/s", "18 m/s", "2.5 m/s"], correctIndex: 0 },
            { question: "Circle ki sabse badi chord kya hoti hai?", options: ["Radius", "Diameter", "Tangent", "Arc"], correctIndex: 1 },
            { question: "144 ka square root kya hota hai?", options: ["10", "12", "14", "16"], correctIndex: 1 }
        ]
    },
    science: {
        english: [
            { question: "Which gas is most abundant in the Earth's atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctIndex: 1 },
            { question: "What is the chemical symbol for Gold?", options: ["Ag", "Fe", "Au", "Pb"], correctIndex: 2 }
        ],
        hindi: [
            { question: "Prithvi ke vayumandal mein sabse adhik matra kis gas ki hai?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctIndex: 1 },
            { question: "Gold ka chemical symbol kya hai?", options: ["Ag", "Fe", "Au", "Pb"], correctIndex: 2 }
        ],
        hinglish: [
            { question: "Earth ke atmosphere me sabse jyada konsi gas hoti hai?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctIndex: 1 },
            { question: "Gold ka chemical symbol kya hai?", options: ["Ag", "Fe", "Au", "Pb"], correctIndex: 2 }
        ]
    },
    reasoning: {
        english: [
            { question: "Find the missing number: 2, 4, 8, 16, ?", options: ["24", "32", "64", "18"], correctIndex: 1 },
            { question: "If CAT is coded as 3120, what is the code for DOG?", options: ["4157", "4125", "3156", "4158"], correctIndex: 0 }
        ],
        hindi: [
            { question: "Agli sankhya kya hogi: 2, 4, 8, 16, ?", options: ["24", "32", "64", "18"], correctIndex: 1 },
            { question: "Agar CAT ko 3120 likha jaye, toh DOG ka code kya hoga?", options: ["4157", "4125", "3156", "4158"], correctIndex: 0 }
        ],
        hinglish: [
            { question: "Missing number find karein: 2, 4, 8, 16, ?", options: ["24", "32", "64", "18"], correctIndex: 1 },
            { question: "Agar CAT ka code 3120 hai, toh DOG ka code kya hoga?", options: ["4157", "4125", "3156", "4158"], correctIndex: 0 }
        ]
    },
    currentAffairs: {
        english: [
            { question: "Which country hosted the Summer Olympics in 2024?", options: ["Japan", "France", "USA", "UK"], correctIndex: 1 },
            { question: "Who is the current Prime Minister of India?", options: ["Narendra Modi", "Rahul Gandhi", "Amit Shah", "Yogi Adityanath"], correctIndex: 0 }
        ],
        hindi: [
            { question: "Varsh 2024 ke Summer Olympics ki mezbani kis desh ne ki thi?", options: ["Japan", "France", "USA", "UK"], correctIndex: 1 },
            { question: "Bharat ke vartaman Pradhanmantri kaun hain?", options: ["Narendra Modi", "Rahul Gandhi", "Amit Shah", "Yogi Adityanath"], correctIndex: 0 }
        ],
        hinglish: [
            { question: "Year 2024 ke Summer Olympics kis country ne host kiye the?", options: ["Japan", "France", "USA", "UK"], correctIndex: 1 },
            { question: "India ke current Prime Minister kaun hain?", options: ["Narendra Modi", "Rahul Gandhi", "Amit Shah", "Yogi Adityanath"], correctIndex: 0 }
        ]
    }
};

// Universal Function jo bina repeat kiye naye questions dega
function getQuestionsForSubject(subject = "math") {
    let lang = window.selectedMedium || "english";
    let cache = window.dynamicQuestionCache;
    
    let bank = (cache[subject] && cache[subject].length > 0 && lang === "english") 
        ? cache[subject] 
        : (studyQuestionBank[subject] && studyQuestionBank[subject][lang] ? studyQuestionBank[subject][lang] : studyQuestionBank['math']['english']);

    let availableQuestions = bank.filter((_, idx) => !usedQuestionIndices.includes(idx));
    
    if (availableQuestions.length === 0) {
        usedQuestionIndices = []; // Reset agar saare questions khatam ho jayein
        availableQuestions = bank;
    }

    let randomIndex = Math.floor(Math.random() * availableQuestions.length);
    let originalIndex = bank.indexOf(availableQuestions[randomIndex]);
    usedQuestionIndices.push(originalIndex);

    return availableQuestions[randomIndex];
}
