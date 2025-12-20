/* ======================================================
   UNIVERSAL BACK BUTTON
====================================================== */
function goBack(){
    window.history.back();
}

/* ======================================================
   PAGE NAVIGATION
====================================================== */
function goto(page){
    window.location.href = page;
}

/* ======================================================
   DARK MODE (sync with main mode)
====================================================== */
if(localStorage.getItem("mode") === "dark"){
    document.body.classList.add("dark");
}

function toggleMode(){
    document.body.classList.toggle("dark");

    if(document.body.classList.contains("dark"))
        localStorage.setItem("mode","dark");
    else
        localStorage.setItem("mode","light");
}

/* ======================================================
   SEARCH FUNCTION (for subjects or chapters)
====================================================== */
function filterCards(){
    let input = document.getElementById("searchInput").value.toLowerCase();
    let cards = document.querySelectorAll(".card, .chapter");

    cards.forEach(card=>{
        let text = card.innerText.toLowerCase();
        card.style.display = text.includes(input) ? "block" : "none";
    });
}
