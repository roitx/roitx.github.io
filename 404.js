document.addEventListener('DOMContentLoaded', () => {
    
    // --- Starfield Generation ---
    const starfield = document.getElementById('starfield');
    const starCount = 180;

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        const size = Math.random() * 2.8;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        
        // Random opacity for depth
        star.style.opacity = Math.random();
        
        // CSS Animation Duration
        const duration = Math.random() * 5 + 2;
        star.style.animation = `twinkle ${duration}s infinite alternate`;
        
        starfield.appendChild(star);
    }

    // --- Interactive Parallax Scene ---
    const scene = document.getElementById('scene');
    const xLabel = document.getElementById('x-pos');
    const yLabel = document.getElementById('y-pos');

    document.addEventListener('mousemove', (e) => {
        const x = (window.innerWidth / 2 - e.pageX) / 30;
        const y = (window.innerHeight / 2 - e.pageY) / 30;

        scene.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
        
        // Updating Coordinates UI
        xLabel.innerText = Math.round(e.pageX);
        yLabel.innerText = Math.round(e.pageY);
    });

    // --- Security Check ---
    window.addEventListener('keydown', (e) => {
        // Prevent F12, Ctrl+Shift+I, Ctrl+U (Basic protection)
        if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey && e.keyCode == 73) || (e.ctrlKey && e.keyCode == 85)) {
            console.warn("Roitx Firewall: Access Denied.");
            e.preventDefault();
        }
    });

    console.log("%c [SYSTEM]: Roitx 404 Multiverse Loaded.", "color: #00d2ff; font-weight: bold; font-size: 14px;");
});
