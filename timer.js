"use strict";

class ProductivityEngine {
  constructor() {
    this.timerState = { remaining: 40 * 60, intervalId: null, initial: 40 * 60 };
    this.stopwatchState = { running: false, start: 0, elapsed: 0, rafId: null };
    this.dailyMinutes = Number(localStorage.getItem('roitx_study_mins')) || 0;
    
    // Audio contexts
    this.audioCtx = null;
    this.noiseNode = null;
    
    // Brainwave specific
    this.brainwaveCtx = null;
    this.waveOscLeft = null;
    this.waveOscRight = null;
    
    this.init();
  }

  init() {
    this.bindElements();
    this.attachEventListeners();
    this.startLiveClock();
    this.updateStatsUI();
    this.initHardwareAPIs();
    this.requestNotificationPerm();
    this.loadTasks();
    this.els.timerDisplay.textContent = this.formatTime(this.timerState.remaining);
  }

  bindElements() {
    this.els = {
      timerDisplay: document.getElementById('timerDisplay'),
      swDisplay: document.getElementById('stopwatchDisplay'),
      lapsContainer: document.getElementById('lapsList'),
      dailyStats: document.getElementById('dailyStats'),
      taskInput: document.getElementById('taskInput'),
      taskList: document.getElementById('taskList'),
      ytPlayer: document.getElementById('ytPlayer'),
      modal: document.getElementById('sessionModal'),
      waveDesc: document.getElementById('waveDesc')
    };
  }

  attachEventListeners() {
    // Timer Modes
    document.getElementById('btnPomodoro').addEventListener('click', () => this.setTimer(40));
    document.getElementById('btnShortBreak').addEventListener('click', () => this.setTimer(5));
    document.getElementById('btnCubeBreak').addEventListener('click', () => this.setTimer(3));

    // Core Controls
    document.getElementById('btnStartTimer').addEventListener('click', () => this.startTimer());
    document.getElementById('btnPauseTimer').addEventListener('click', () => this.pauseTimer());
    document.getElementById('btnResetTimer').addEventListener('click', () => this.resetTimer());

    // Stopwatch
    document.getElementById('btnSwStart').addEventListener('click', () => this.startStopwatch());
    document.getElementById('btnSwStop').addEventListener('click', () => this.stopStopwatch());
    document.getElementById('btnSwLap').addEventListener('click', () => this.lapStopwatch());
    document.getElementById('btnSwReset').addEventListener('click', () => this.resetStopwatch());

    // YouTube Controls (Premium 24/7 Streams)
    document.getElementById('btnMusicLofi').addEventListener('click', () => this.changeMusic('jfKfPfyJRdk')); // Lofi Girl
    document.getElementById('btnMusicSynth').addEventListener('click', () => this.changeMusic('4xDzrUhVKVA')); // Synthwave Radio
    document.getElementById('btnMusicDeep').addEventListener('click', () => this.changeMusic('8mAITcNt710')); // Space Ambient

    // Brainwave Entrainment
    document.querySelectorAll('.wave-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active-toggle'));
        e.target.classList.add('active-toggle');
        this.playBrainwave(e.target.dataset.wave, Number(e.target.dataset.freq));
      });
    });
    document.getElementById('btnStopWave').addEventListener('click', () => {
      document.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active-toggle'));
      this.stopBrainwave();
    });

    // Utilities
    document.getElementById('btnTaskAdd').addEventListener('click', () => this.addTask());
    document.getElementById('btnFocus').addEventListener('click', (e) => this.toggleFocus(e));
    document.getElementById('btnAmbient').addEventListener('click', (e) => this.toggleAmbient(e));
    document.getElementById('btnModalClose').addEventListener('click', () => this.closeModal());

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if(e.target.tagName === 'INPUT') return;
      if(e.code === 'Space') { e.preventDefault(); this.stopwatchState.running ? this.stopStopwatch() : this.startStopwatch(); }
      if(e.key.toLowerCase() === 'l') this.lapStopwatch();
    });
  }

  /* --- BRAINWAVE ENTRAINMENT (BINAURAL BEATS) --- */
  playBrainwave(type, freqOffset) {
    this.stopBrainwave(); // Clear existing

    const descriptions = {
      'beta': 'Beta Waves (13-30Hz): Enhances active concentration, analytical thinking, and solving complex problems (Math/Chem).',
      'alpha': 'Alpha Waves (8-12Hz): Promotes relaxation, positive thinking, and smooth learning. Great for reading or sketching.',
      'theta': 'Theta Waves (4-7Hz): Induces deep relaxation and boosts creativity/memory retrieval.',
      'gamma': 'Gamma Waves (30-100Hz): Peak cognitive focus and information processing. Use for intense top-tier studying.',
      'delta': 'Delta Waves (0.5-3Hz): Deep recovery. Use this when completely winding down after a long session.'
    };

    this.els.waveDesc.innerHTML = `<strong>Active:</strong> ${descriptions[type]} <br><span style="color:var(--accent-primary)">Playing at ${freqOffset}Hz difference. Please wear headphones for it to work.</span>`;

    try {
      this.brainwaveCtx = new (window.AudioContext || window.webkitAudioContext)();
      const carrierFreq = 200; // Base pleasant tone

      this.waveOscLeft = this.brainwaveCtx.createOscillator();
      this.waveOscRight = this.brainwaveCtx.createOscillator();
      const merger = this.brainwaveCtx.createChannelMerger(2);
      const gain = this.brainwaveCtx.createGain();

      this.waveOscLeft.type = 'sine';
      this.waveOscRight.type = 'sine';

      this.waveOscLeft.frequency.value = carrierFreq;
      this.waveOscRight.frequency.value = carrierFreq + freqOffset;

      this.waveOscLeft.connect(merger, 0, 0); // Route to Left Ear
      this.waveOscRight.connect(merger, 0, 1); // Route to Right Ear

      merger.connect(gain);
      gain.connect(this.brainwaveCtx.destination);
      gain.gain.value = 0.15; // Soft volume

      this.waveOscLeft.start();
      this.waveOscRight.start();
    } catch(err) {
      this.els.waveDesc.textContent = "Audio blocked by browser. Please click anywhere on the page first.";
    }
  }

  stopBrainwave() {
    if (this.brainwaveCtx) {
      this.brainwaveCtx.close();
      this.brainwaveCtx = null;
    }
    this.els.waveDesc.innerHTML = "Select a frequency to generate Binaural Beats. It plays different tones in each ear to sync your brainwaves. (Requires Headphones)";
  }


  /* --- TIMER LOGIC --- */
  formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  setTimer(minutes) {
    this.pauseTimer();
    this.timerState.initial = minutes * 60;
    this.timerState.remaining = this.timerState.initial;
    this.els.timerDisplay.textContent = this.formatTime(this.timerState.remaining);
  }

  startTimer() {
    if (this.timerState.intervalId) return;
    this.timerState.intervalId = setInterval(() => {
      this.timerState.remaining--;
      if (this.timerState.remaining <= 0) {
        this.completeSession();
      } else {
        this.els.timerDisplay.textContent = this.formatTime(this.timerState.remaining);
        document.title = `${this.formatTime(this.timerState.remaining)} - Study Session`;
      }
    }, 1000);
  }

  pauseTimer() {
    clearInterval(this.timerState.intervalId);
    this.timerState.intervalId = null;
  }

  resetTimer() {
    this.pauseTimer();
    this.timerState.remaining = this.timerState.initial;
    this.els.timerDisplay.textContent = this.formatTime(this.timerState.remaining);
    document.title = "Study Timer - Roitx Pro";
  }

  completeSession() {
    this.pauseTimer();
    this.els.timerDisplay.textContent = "00:00";
    
    this.playChime();
    this.sendNotification("Session Complete!", "Time to take a break or switch subjects.");
    this.showModal();
    
    const sessionMins = Math.round(this.timerState.initial / 60);
    this.dailyMinutes += sessionMins;
    localStorage.setItem('roitx_study_mins', this.dailyMinutes);
    this.updateStatsUI();
  }

  showModal() { this.els.modal.style.display = 'flex'; }
  closeModal() { this.els.modal.style.display = 'none'; }

  /* --- YOUTUBE LOGIC --- */
  changeMusic(videoId) {
    this.els.ytPlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }

  /* --- STOPWATCH LOGIC --- */
  formatStopwatch(ms) {
    const total = Math.max(0, ms);
    const m = String(Math.floor(total / 60000)).padStart(2, '0');
    const s = String(Math.floor((total % 60000) / 1000)).padStart(2, '0');
    const msr = String(Math.floor((total % 1000) / 10)).padStart(2, '0');
    return `${m}:${s}<span class="ms-display">.${msr}</span>`;
  }

  updateStopwatch = () => {
    if(!this.stopwatchState.running) return;
    this.stopwatchState.elapsed = performance.now() - this.stopwatchState.start;
    this.els.swDisplay.innerHTML = this.formatStopwatch(this.stopwatchState.elapsed);
    this.stopwatchState.rafId = requestAnimationFrame(this.updateStopwatch);
  }

  startStopwatch() {
    if (this.stopwatchState.running) return;
    this.stopwatchState.running = true;
    this.stopwatchState.start = performance.now() - this.stopwatchState.elapsed;
    this.stopwatchState.rafId = requestAnimationFrame(this.updateStopwatch);
  }

  stopStopwatch() {
    this.stopwatchState.running = false;
    cancelAnimationFrame(this.stopwatchState.rafId);
  }

  lapStopwatch() {
    if (!this.stopwatchState.running) return;
    const lapTime = this.formatStopwatch(this.stopwatchState.elapsed);
    const div = document.createElement('div');
    div.className = 'task-item';
    div.innerHTML = `<span>Lap ${this.els.lapsContainer.children.length + 1}</span> <span>${lapTime}</span>`;
    this.els.lapsContainer.prepend(div);
  }

  resetStopwatch() {
    this.stopStopwatch();
    this.stopwatchState.elapsed = 0;
    this.els.swDisplay.innerHTML = `00:00<span class="ms-display">.00</span>`;
    this.els.lapsContainer.innerHTML = '';
  }

  /* --- TASKS SYSTEM --- */
  addTask() {
    const text = this.els.taskInput.value.trim();
    if(!text) return;
    const task = { id: Date.now(), text, done: false };
    const tasks = JSON.parse(localStorage.getItem('roitx_tasks') || '[]');
    tasks.push(task);
    localStorage.setItem('roitx_tasks', JSON.stringify(tasks));
    this.els.taskInput.value = '';
    this.renderTasks();
  }
  loadTasks() { this.renderTasks(); }
  renderTasks() {
    const tasks = JSON.parse(localStorage.getItem('roitx_tasks') || '[]');
    this.els.taskList.innerHTML = '';
    tasks.forEach(t => {
      const div = document.createElement('div');
      div.className = `task-item ${t.done ? 'done' : ''}`;
      div.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${t.done ? 'checked' : ''} onchange="app.toggleTask(${t.id})">
        <span>${t.text}</span>
        <button class="delete-btn" onclick="app.deleteTask(${t.id})">✕</button>
      `;
      this.els.taskList.appendChild(div);
    });
  }
  toggleTask(id) {
    let tasks = JSON.parse(localStorage.getItem('roitx_tasks') || '[]');
    tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    localStorage.setItem('roitx_tasks', JSON.stringify(tasks));
    this.renderTasks();
  }
  deleteTask(id) {
    let tasks = JSON.parse(localStorage.getItem('roitx_tasks') || '[]');
    tasks = tasks.filter(t => t.id !== id);
    localStorage.setItem('roitx_tasks', JSON.stringify(tasks));
    this.renderTasks();
  }

  /* --- HARDWARE & UTILITIES --- */
  startLiveClock() {
    setInterval(() => {
      document.getElementById('liveClock').textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }, 1000);
  }
  updateStatsUI() { this.els.dailyStats.textContent = `${this.dailyMinutes} mins focused today`; }
  
  async initHardwareAPIs() {
    if ('getBattery' in navigator) {
      try {
        const b = await navigator.getBattery();
        const updateB = () => { document.getElementById('batteryLvl').textContent = `${Math.round(b.level*100)}%`; };
        updateB(); b.addEventListener('levelchange', updateB);
      } catch(e) {}
    }
    const updateN = () => { document.getElementById('netStatus').textContent = navigator.onLine ? "Online" : "Offline"; };
    window.addEventListener('online', updateN); window.addEventListener('offline', updateN); updateN();
  }

  toggleFocus(e) {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(()=>{});
      e.target.classList.add('active-toggle');
    } else {
      document.exitFullscreen();
      e.target.classList.remove('active-toggle');
    }
  }

  toggleAmbient(e) {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const bufferSize = this.audioCtx.sampleRate * 2;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        this.noiseNode = this.audioCtx.createBufferSource();
        this.noiseNode.buffer = buffer;
        this.noiseNode.loop = true;
        const gain = this.audioCtx.createGain();
        gain.gain.value = 0.02;
        this.noiseNode.connect(gain); gain.connect(this.audioCtx.destination);
        this.noiseNode.start();
        e.target.classList.add('active-toggle');
      } catch(err) { console.error("Audio API blocked"); }
    } else {
      this.audioCtx.close(); this.audioCtx = null;
      e.target.classList.remove('active-toggle');
    }
  }

  playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 1);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 1);
    } catch(e) {}
  }

  requestNotificationPerm() {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }

  sendNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  }
}

const app = new ProductivityEngine();
