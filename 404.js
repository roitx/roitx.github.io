document.addEventListener('DOMContentLoaded', () => {
    
    // Starfield Generator
    const starfield = document.getElementById('starfield');
    if (starfield) {
        const starCount = window.innerWidth < 480 ? 80 : 150;

        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            const size = Math.random() * 2.5 + 0.5;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.opacity = Math.random();
            
            const duration = Math.random() * 4 + 2;
            star.style.animation = `twinkle ${duration}s infinite alternate ease-in-out`;
            
            starfield.appendChild(star);
        }
    }

    // Parallax Effect (Mouse + Touch Support)
    const scene = document.getElementById('scene');
    const xLabel = document.getElementById('x-pos');
    const yLabel = document.getElementById('y-pos');

    function updateParallax(pageX, pageY) {
        if (!scene) return;
        const x = (window.innerWidth / 2 - pageX) / 35;
        const y = (window.innerHeight / 2 - pageY) / 35;

        scene.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
        
        if (xLabel && yLabel) {
            xLabel.innerText = Math.round(pageX);
            yLabel.innerText = Math.round(pageY);
        }
    }

    document.addEventListener('mousemove', (e) => {
        updateParallax(e.pageX, e.pageY);
    });

    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            updateParallax(e.touches[0].pageX, e.touches[0].pageY);
        }
    }, { passive: true });

    // Developer Tools Block (Basic Firewall)
    window.addEventListener('keydown', (e) => {
        if (e.keyCode === 123 || 
           (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || 
           (e.ctrlKey && e.keyCode === 85)) {
            console.warn("Roitx Firewall: Action restricted.");
            e.preventDefault();
        }
    });

    console.log("%c[SYSTEM]: Roitx 404 Page Active.", "color: #00d2ff; font-weight: bold; font-size: 13px;");
});
