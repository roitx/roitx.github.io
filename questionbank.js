// PM Roitx - Cyber Overdrive study bank (class 9-12, BSEB/CBSE level)
// q/o = English, h/oh = Hindi (oh na ho to o hi dikhega), a = sahi option ka index (o me)
window.STUDY_BANK = {
  math: [
    { q: "What is the value of (a + b)²?", h: "(a + b)² का मान क्या है?", o: ["a² + b²", "a² + 2ab + b²", "a² − 2ab + b²", "a² + ab + b²"], a: 1 },
    { q: "Sum of the angles of a triangle is?", h: "त्रिभुज के तीनों कोणों का योग कितना होता है?", o: ["90°", "180°", "270°", "360°"], a: 1 },
    { q: "What is √144?", h: "√144 का मान क्या है?", o: ["10", "11", "12", "14"], a: 2 },
    { q: "Derivative of x² is?", h: "x² का अवकलज (derivative) क्या है?", o: ["x", "2x", "x²", "2"], a: 1 },
    { q: "HCF of 12 and 18 is?", h: "12 और 18 का HCF क्या है?", o: ["3", "6", "9", "12"], a: 1 },
    { q: "Area of a circle of radius 7 (π = 22/7)?", h: "त्रिज्या 7 वाले वृत्त का क्षेत्रफल (π = 22/7)?", o: ["44", "154", "49", "22"], a: 1 },
    { q: "sin 30° equals?", h: "sin 30° का मान क्या है?", o: ["0", "1/2", "√3/2", "1"], a: 1 },
    { q: "Roots of x² − 5x + 6 = 0 are?", h: "x² − 5x + 6 = 0 के मूल क्या हैं?", o: ["1 and 6", "2 and 3", "−2 and −3", "1 and 5"], oh: ["1 और 6", "2 और 3", "−2 और −3", "1 और 5"], a: 1 },
    { q: "15% of 200 is?", h: "200 का 15% कितना होता है?", o: ["20", "25", "30", "35"], a: 2 },
    { q: "Sum of the first 10 natural numbers?", h: "पहली 10 प्राकृत संख्याओं का योग?", o: ["45", "50", "55", "60"], a: 2 },
    { q: "log₁₀ 1000 equals?", h: "log₁₀ 1000 का मान क्या है?", o: ["1", "2", "3", "10"], a: 2 },
    { q: "Distance of point (3, 4) from the origin?", h: "बिंदु (3, 4) की मूल बिंदु से दूरी?", o: ["7", "5", "12", "25"], a: 1 },
    { q: "Mean of 2, 4, 6, 8 is?", h: "2, 4, 6, 8 का माध्य क्या है?", o: ["4", "5", "6", "7"], a: 1 },
    { q: "nth term of an AP is?", h: "समांतर श्रेणी (AP) का nवाँ पद क्या होता है?", o: ["a + nd", "a + (n − 1)d", "a − (n − 1)d", "ard^(n−1)"], a: 1 }
  ],
  science: [
    { q: "Chemical symbol of sodium?", h: "सोडियम का रासायनिक चिह्न क्या है?", o: ["S", "So", "Na", "N"], a: 2 },
    { q: "Powerhouse of the cell is?", h: "कोशिका का ऊर्जा-गृह (powerhouse) कौन है?", o: ["Nucleus", "Mitochondria", "Ribosome", "Golgi body"], oh: ["केंद्रक", "माइटोकॉन्ड्रिया", "राइबोसोम", "गॉल्जी काय"], a: 1 },
    { q: "SI unit of force is?", h: "बल का SI मात्रक क्या है?", o: ["Joule", "Watt", "Newton", "Pascal"], oh: ["जूल", "वाट", "न्यूटन", "पास्कल"], a: 2 },
    { q: "Speed of light is about?", h: "प्रकाश की चाल लगभग कितनी है?", o: ["3×10⁶ m/s", "3×10⁸ m/s", "3×10¹⁰ m/s", "3×10⁵ m/s"], a: 1 },
    { q: "pH of pure water at 25°C?", h: "25°C पर शुद्ध जल का pH कितना होता है?", o: ["0", "5", "7", "14"], a: 2 },
    { q: "Which gas do plants take in for photosynthesis?", h: "प्रकाश संश्लेषण के लिए पौधे कौन सी गैस लेते हैं?", o: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], oh: ["ऑक्सीजन", "नाइट्रोजन", "कार्बन डाइऑक्साइड", "हाइड्रोजन"], a: 2 },
    { q: "Atomic number of carbon?", h: "कार्बन का परमाणु क्रमांक क्या है?", o: ["4", "6", "8", "12"], a: 1 },
    { q: "Ohm's law states?", h: "ओम का नियम क्या कहता है?", o: ["V = IR", "V = I/R", "I = VR", "R = VI"], a: 0 },
    { q: "Vitamin made by the skin in sunlight?", h: "धूप में त्वचा कौन सा विटामिन बनाती है?", o: ["A", "C", "D", "K"], a: 2 },
    { q: "Newton's first law is also called the law of?", h: "न्यूटन के गति के पहले नियम को क्या कहते हैं?", o: ["Gravity", "Inertia", "Momentum", "Energy"], oh: ["गुरुत्वाकर्षण", "जड़त्व", "संवेग", "ऊर्जा"], a: 1 },
    { q: "Most abundant gas in the atmosphere?", h: "वायुमंडल में सबसे अधिक पाई जाने वाली गैस?", o: ["Oxygen", "Nitrogen", "Argon", "Carbon dioxide"], oh: ["ऑक्सीजन", "नाइट्रोजन", "आर्गन", "कार्बन डाइऑक्साइड"], a: 1 },
    { q: "Which lens corrects myopia (short-sightedness)?", h: "निकट दृष्टि दोष (myopia) किस लेंस से ठीक होता है?", o: ["Convex", "Concave", "Bifocal", "Cylindrical"], oh: ["उत्तल", "अवतल", "द्विफोकसी", "बेलनाकार"], a: 1 },
    { q: "SI unit of work and energy?", h: "कार्य और ऊर्जा का SI मात्रक?", o: ["Newton", "Watt", "Joule", "Hertz"], oh: ["न्यूटन", "वाट", "जूल", "हर्ट्ज़"], a: 2 },
    { q: "Which blood group is the universal donor?", h: "सर्वदाता (universal donor) रक्त समूह कौन सा है?", o: ["A", "B", "AB", "O"], a: 3 }
  ],
  reasoning: [
    { q: "Next in series: 2, 4, 8, 16, ?", h: "अगली संख्या: 2, 4, 8, 16, ?", o: ["24", "30", "32", "64"], a: 2 },
    { q: "Odd one out?", h: "बेमेल कौन सा है?", o: ["Apple", "Mango", "Potato", "Banana"], oh: ["सेब", "आम", "आलू", "केला"], a: 2 },
    { q: "If CAT is coded as DBU, DOG is coded as?", h: "यदि CAT को DBU लिखा जाए, तो DOG को क्या लिखेंगे?", o: ["EPH", "DPH", "EOH", "FPH"], a: 0 },
    { q: "Angle between clock hands at 3:00?", h: "3:00 बजे घड़ी की सुइयों के बीच कोण?", o: ["60°", "90°", "120°", "180°"], a: 1 },
    { q: "Next in series: 1, 4, 9, 16, ?", h: "अगली संख्या: 1, 4, 9, 16, ?", o: ["20", "24", "25", "36"], a: 2 },
    { q: "Pointing at a man, Ria says: \"He is the son of my father's only son.\" He is Ria's?", h: "एक आदमी की ओर इशारा कर रिया कहती है: \"यह मेरे पिता के इकलौते पुत्र का बेटा है।\" वह रिया का क्या लगा?", o: ["Brother", "Nephew", "Cousin", "Uncle"], oh: ["भाई", "भतीजा", "चचेरा भाई", "चाचा"], a: 1 },
    { q: "Ram walks 5 km north, 5 km east, then 5 km south. How far is he from the start?", h: "राम 5 किमी उत्तर, फिर 5 किमी पूर्व, फिर 5 किमी दक्षिण चलता है। वह शुरुआत से कितनी दूर है?", o: ["0 km", "5 km", "10 km", "15 km"], oh: ["0 किमी", "5 किमी", "10 किमी", "15 किमी"], a: 1 },
    { q: "Next in series: Z, X, V, T, ?", h: "अगला अक्षर: Z, X, V, T, ?", o: ["S", "R", "Q", "P"], a: 1 },
    { q: "Next in series: 3, 6, 11, 18, 27, ?", h: "अगली संख्या: 3, 6, 11, 18, 27, ?", o: ["36", "38", "40", "42"], a: 1 },
    { q: "If today is Monday, what day will it be after 10 days?", h: "आज सोमवार है, तो 10 दिन बाद कौन सा दिन होगा?", o: ["Wednesday", "Thursday", "Friday", "Saturday"], oh: ["बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"], a: 1 },
    { q: "Odd one out: 2, 3, 5, 9, 11", h: "बेमेल संख्या: 2, 3, 5, 9, 11", o: ["3", "5", "9", "11"], a: 2 },
    { q: "Book : Read :: Food : ?", h: "किताब : पढ़ना :: खाना : ?", o: ["Cook", "Eat", "Buy", "Taste"], oh: ["पकाना", "खाना", "खरीदना", "चखना"], a: 1 },
    { q: "Next in series: ABD, BCE, CDF, ?", h: "अगला पद: ABD, BCE, CDF, ?", o: ["DEG", "DEF", "EFG", "CDE"], a: 0 },
    { q: "A is taller than B, and B is taller than C. Who is the shortest?", h: "A, B से लंबा है और B, C से लंबा है। सबसे छोटा कौन है?", o: ["A", "B", "C", "Cannot say"], oh: ["A", "B", "C", "कह नहीं सकते"], a: 2 }
  ],
  currentAffairs: [
    { q: "Capital of Bihar?", h: "बिहार की राजधानी क्या है?", o: ["Gaya", "Patna", "Ranchi", "Muzaffarpur"], oh: ["गया", "पटना", "रांची", "मुज़फ्फरपुर"], a: 1 },
    { q: "Chairman of the Constitution Drafting Committee?", h: "संविधान प्रारूप समिति के अध्यक्ष कौन थे?", o: ["Nehru", "Dr. B.R. Ambedkar", "Gandhi", "Patel"], oh: ["नेहरू", "डॉ. बी.आर. अंबेडकर", "गांधी", "पटेल"], a: 1 },
    { q: "How many Fundamental Rights does the Indian Constitution give?", h: "भारतीय संविधान कितने मौलिक अधिकार देता है?", o: ["5", "6", "7", "8"], a: 1 },
    { q: "Longest river flowing in India?", h: "भारत में बहने वाली सबसे लंबी नदी कौन सी है?", o: ["Yamuna", "Ganga", "Godavari", "Narmada"], oh: ["यमुना", "गंगा", "गोदावरी", "नर्मदा"], a: 1 },
    { q: "First Prime Minister of India?", h: "भारत के पहले प्रधानमंत्री कौन थे?", o: ["Sardar Patel", "Lal Bahadur Shastri", "Jawaharlal Nehru", "Rajendra Prasad"], oh: ["सरदार पटेल", "लाल बहादुर शास्त्री", "जवाहरलाल नेहरू", "राजेंद्र प्रसाद"], a: 2 },
    { q: "National animal of India?", h: "भारत का राष्ट्रीय पशु कौन सा है?", o: ["Lion", "Elephant", "Tiger", "Leopard"], oh: ["शेर", "हाथी", "बाघ", "तेंदुआ"], a: 2 },
    { q: "ISRO headquarters is in?", h: "ISRO का मुख्यालय कहाँ है?", o: ["Delhi", "Mumbai", "Bengaluru", "Hyderabad"], oh: ["दिल्ली", "मुंबई", "बेंगलुरु", "हैदराबाद"], a: 2 },
    { q: "India became independent in the year?", h: "भारत किस वर्ष स्वतंत्र हुआ?", o: ["1942", "1947", "1950", "1952"], a: 1 },
    { q: "The Constitution of India came into effect on?", h: "भारतीय संविधान कब लागू हुआ?", o: ["15 Aug 1947", "26 Jan 1950", "26 Nov 1949", "2 Oct 1950"], oh: ["15 अगस्त 1947", "26 जनवरी 1950", "26 नवंबर 1949", "2 अक्टूबर 1950"], a: 1 },
    { q: "Bodh Gaya, where Buddha attained enlightenment, is in which state?", h: "बोधगया, जहाँ बुद्ध को ज्ञान मिला, किस राज्य में है?", o: ["Uttar Pradesh", "Jharkhand", "Bihar", "West Bengal"], oh: ["उत्तर प्रदेश", "झारखंड", "बिहार", "पश्चिम बंगाल"], a: 2 },
    { q: "Which institution is India's central bank?", h: "भारत का केंद्रीय बैंक कौन सा है?", o: ["SBI", "RBI", "NABARD", "SEBI"], a: 1 },
    { q: "Highest peak located within India?", h: "भारत के भीतर सबसे ऊँची चोटी कौन सी है?", o: ["Nanda Devi", "Kangchenjunga", "K2", "Mt. Everest"], oh: ["नंदा देवी", "कंचनजंगा", "K2", "माउंट एवरेस्ट"], a: 1 },
    { q: "First woman President of India?", h: "भारत की पहली महिला राष्ट्रपति कौन थीं?", o: ["Indira Gandhi", "Pratibha Patil", "Sarojini Naidu", "Droupadi Murmu"], oh: ["इंदिरा गांधी", "प्रतिभा पाटिल", "सरोजिनी नायडू", "द्रौपदी मुर्मू"], a: 1 },
    { q: "Chandrayaan-3 (2023) landed near which region?", h: "चंद्रयान-3 (2023) कहाँ उतरा?", o: ["Moon's south pole region", "Mars", "Sun", "Venus"], oh: ["चंद्रमा का दक्षिणी ध्रुव क्षेत्र", "मंगल", "सूर्य", "शुक्र"], a: 0 }
  ]
};
