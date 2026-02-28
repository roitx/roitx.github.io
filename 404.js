// --- Star Generation System ---
const starsContainer = document.getElementById('stars-container');
const starCount = 200;

function createStars() {
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // Random size and position
        const size = Math.random() * 2.5;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        
        // Random twinkle speed
        const duration = Math.random() * 3 + 1;
        star.style.setProperty('--duration', `${duration}s`);
        
        starsContainer.appendChild(star);
    }
}

// --- 3D Parallax Card Effect ---
const card = document.getElementById('card');
const body = document.querySelector('body');

body.addEventListener('mousemove', (e) => {
    // Mouse coordinates relative to center
    let xAxis = (window.innerWidth / 2 - e.pageX) / 25;
    let yAxis = (window.innerHeight / 2 - e.pageY) / 25;
    
    card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
});

// Reset on Mouse Leave
body.addEventListener('mouseleave', () => {
    card.style.transform = `rotateY(0deg) rotateX(0deg)`;
});

// --- Fake GPS Coordinates Logic ---
function updateCoordinates() {
    const lat = document.getElementById('lat');
    const long = document.getElementById('long');
    
    setInterval(() => {
        let randLat = (Math.random() * 180 - 90).toFixed(4);
        let randLong = (Math.random() * 360 - 180).toFixed(4);
        lat.innerText = randLat;
        long.innerText = randLong;
    }, 2000);
}

// Initialize Everything
window.onload = () => {
    createStars();
    updateCoordinates();
    console.log("%c Roitx Terminal: Page 404 Detected. Requesting Backup...", "color: #00d2ff; font-weight: bold;");
};
