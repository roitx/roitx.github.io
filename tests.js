// DARK MODE
const modeToggle = document.getElementById("modeToggle");
modeToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark", modeToggle.checked);
});

// TEST POPUP
function startTest(type) {
    const title = {
        chapter: "Chapter Test",
        unit: "Unit Test",
        full: "Full Syllabus Test"
    };

    document.getElementById("testTitle").innerText = title[type];
    document.getElementById("testPopup").style.display = "flex";
}

function closePopup() {
    document.getElementById("testPopup").style.display = "none";
}

// 3D Hover Effect
document.querySelectorAll(".test-card").forEach(card => {
    card.addEventListener("mousemove", e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const rotateY = ((x / rect.width) - 0.5) * 20;
        const rotateX = ((y / rect.height) - 0.5) * -20;

        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    });

    card.addEventListener("mouseleave", () => {
        card.style.transform = "rotateX(0) rotateY(0) scale(1)";
    });
});
