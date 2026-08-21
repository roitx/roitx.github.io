"use strict";

class ProductivityEngine {
  constructor() {
    this.timerState = { remaining: 40 * 60, intervalId: null, initial: 40 * 60 };
    this.stopwatchState = { running: false, start: 0, elapsed: 0, rafId: null };
    this.dailyMinutes = Number(localStorage.getItem('roitx_study_mins')) || 0;
    
    this.audioCtx = null;
    this.noiseNode = null;
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
    this.createFloatingWidgetDOM();
  }

  bindElements() {
    this.els = {
      timerDisplay: document.getElementById('timerDisplay'),
      swDisplay: document.getElementById('stopwatchDisplay'),
      lapsContainer: document.getElementById('lapsList'),
      dailyStats: document.getElementById('dailyStats'),
      taskInput: document.getElementById('taskInput'),
      taskList: document.getElementById('taskList'),
      modal: document.getElementById('sessionModal'),
      waveDesc: document.getElementById('waveDesc'),
      customAudio: document.getElementById('customAudio'),
      audioUrlInput: document.getElementById('audioUrlInput'),
      audioFileInput: document.getElementById('audioFileInput')
    };
  }

  attachEventListeners() {
    document.getElementById('btnPomodoro').addEventListener('click', () => this.setTimer(40));
    document.getElementById('btnShortBreak').addEventListener('click', () => this.setTimer(5));
    document.getElementById('btnCubeBreak').addEventListener('click', () => this.setTimer(3));

    document.getElementById('btnStartTimer').addEventListener('click', () => this.startTimer());
    document.getElementById('btnPauseTimer').addEventListener('click', () => this.pauseTimer());
    document.getElementById('btnResetTimer').addEventListener('click', () => this.resetTimer());
    document.getElementById('btnPipWidget').addEventListener('click', () => this.toggleFloatingWidget());

    document.getElementById('btnSwStart').addEventListener('click', () => this.startStopwatch());
    document.getElementById('btnSwStop').addEventListener('click', () => this.stopStopwatch());
    document.getElementById('btnSwLap').addEventListener('click', () => this.lapStopwatch());
    document.getElementById('btnSwReset').addEventListener('click', () => this.resetStopwatch());

    // 1. Local Device File Upload Handler
    this.els.audioFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fileURL = URL.createObjectURL(file);
      this.els.customAudio.src = fileURL;
      this.els.customAudio.load();
      this.els.customAudio.play().catch(err => {
        console.error("Local audio error:", err);
        alert("Local file play nahi ho saki!");
      });
    });

    // 2. Direct URL Load Handler
    document.getElementById('btnLoadAudio').addEventListener('click', () => {
      const url = this.els.audioUrlInput.value.trim();
      if(!url) return;
      this.els.customAudio.src = url;
      this.els.customAudio.load();
      this.els.customAudio.play().catch(error => {
        console.error("URL audio error:", error);
        alert("Audio stream load nahi ho saka! Valid direct MP3 link dein.");
      });
    });

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

    document.getElementById('btnTaskAdd').addEventListener('click', () => this.addTask());
    document.getElementById('btnFocus').addEventListener('click', (e) => this.toggleFocus(e));
    document.getElementById('btnAmbient').addEventListener('click', (e) => this.toggleAmbient(e));
    document.getElementById('btnModalClose').addEventListener('click', () => this.closeModal());
  }

  createFloatingWidgetDOM() {
    if (document.getElementById('floatingWidget')) return;
    const widget = document.createElement('div');
    widget.id = 'floatingWidget';
    widget.innerHTML = `
      <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Roitx Mini Widget</div>
      <div class="widget-time" id="widgetTimeDisp">40:00</div>
      <button class="btn primary" id="btnWidgetClose" style="padding: 6px; font-size: 0.75rem; width: 100%;">Close Widget</button>
    `;
    document.body.appendChild(widget);
    document.getElementById('btnWidgetClose').addEventListener('click', () => {
      widget.style.display = 'none';
    });
  }

  toggleFloatingWidget() {
    const widget = document.getElementById('floatingWidget');
    if (!widget) return;
    widget.style.display = (widget.style.display === 'block') ? 'none' : 'block';
  }

  updateWidgetTime() {
    const wTime = document.getElementById('widgetTimeDisp');
    if (wTime) wTime.textContent = this.formatTime(this.timerState.remaining);
  }

  playBrainwave(type, freqOffset) {
    this.stopBrainwave();
    const descriptions = {
      'beta': 'Beta Waves (13-30Hz): Enhances active concentration.',
      'alpha': 'Alpha Waves (8-12Hz): Promotes relaxation and learning.',
      'theta': 'Theta Waves (4-7Hz): Deep memory retrieval.',
      'gamma': 'Gamma Waves (30-100Hz): Peak focus.',
      'delta': 'Delta Waves (0.5-3Hz): Deep recovery.'
    };
    this.els.waveDesc.innerHTML = `<strong>Active:</strong> ${descriptions[type]} <br><span style="color:var(--accent-primary)">Playing at ${freqOffset}Hz difference. (Requires Headphones)</span>`;

    try {
      this.brainwaveCtx = new (window.AudioContext || window.webkitAudioContext)();
      const carrierFreq = 200;
      this.waveOscLeft = this.brainwaveCtx.createOscillator();
      this.waveOscRight = this.brainwaveCtx.createOscillator();
      const merger = this.brainwaveCtx.createChannelMerger(2);
      const gain = this.brainwaveCtx.createGain();

      this.waveOscLeft.type = 'sine';
      this.waveOscRight.type = 'sine';
      this.waveOscLeft.frequency.value = carrierFreq;
      this.waveOscRight.frequency.value = carrierFreq + freqOffset;

      this.waveOscLeft.connect(merger, 0, 0);
      this.waveOscRight.connect(merger, 0, 1);
      merger.connect(gain);
      gain.connect(this.brainwaveCtx.destination);
      gain.gain.value = 0.15;

      this.waveOscLeft.start();
      this.waveOscRight.start();
    } catch(err) {
      this.els.waveDesc.textContent = "Audio blocked by browser. Click anywhere on page first.";
    }
  }

  stopBrainwave() {
    if (this.brainwaveCtx) {
      this.brainwaveCtx.close();
      this.brainwaveCtx = null;
    }
    this.els.waveDesc.innerHTML = "Select a frequency to generate Binaural Beats. (Requires Headphones)";
  }

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
    this.updateWidgetTime();
  }

  startTimer() {
    if (this.timerState.intervalId) return;
    this.timerState.intervalId = setInterval(() => {
      if (this.timerState.remaining > 0) {
        this.timerState.remaining--;
        this.els.timerDisplay.textContent = this.formatTime(this.timerState.remaining);
        this.updateWidgetTime();
        document.title = `${this.formatTime(this.timerState.remaining)} - Study Session`;
      }
      if (this.timerState.remaining <= 0) {
        this.completeSession();
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
    this.updateWidgetTime();
    document.title = "Study Timer - Roitx Pro";
  }

  completeSession() {
    this.pauseTimer();
    this.els.timerDisplay.textContent = "00:00";
    this.updateWidgetTime();
    this.playChime();
    this.sendNotification("Session Complete!", "Great job! Time to track your focus minutes.");
    
    const sessionMins = Math.round(this.timerState.initial / 60);
    this.dailyMinutes += sessionMins;
    localStorage.setItem('roitx_study_mins', this.dailyMinutes);
    this.updateStatsUI();
    this.showModal();
  }

  showModal() { this.els.modal.style.display = 'flex'; }
  closeModal() { this.els.modal.style.display = 'none'; }

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

  startLiveClock() {
    setInterval(() => {
      const clockEl = document.getElementById('liveClock');
      if(clockEl) clockEl.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }, 1000);
  }

  updateStatsUI() { 
    if(this.els.dailyStats) {
      this.els.dailyStats.textContent = `${this.dailyMinutes} mins focused today`; 
    }
  }

  async initHardwareAPIs() {
    if ('getBattery' in navigator) {
      try {
        const b = await navigator.getBattery();
        const updateB = () => { document.getElementById('batteryLvl').textContent = `${Math.round(b.level*100)}%`; };
        updateB(); b.addEventListener('levelchange', updateB);
      } catch(e) {
        document.getElementById('batteryLvl').textContent = "Desktop Mode";
      }
    } else {
      document.getElementById('batteryLvl').textContent = "System Ready";
    }

    const updateN = () => { 
      const netEl = document.getElementById('netStatus');
      if(netEl) netEl.textContent = navigator.onLine ? "Online" : "Offline"; 
    };
    window.addEventListener('online', updateN); 
    window.addEventListener('offline', updateN); 
    updateN();
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
        this.noiseNode.connect(gain); 
        gain.connect(this.audioCtx.destination);
        this.noiseNode.start();
        e.target.classList.add('active-toggle');
      } catch(err) {}
    } else {
      this.audioCtx.close(); 
      this.audioCtx = null;
      e.target.classList.remove('active-toggle');
    }
  }

  playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle'; 
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 1);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      osc.connect(gain); 
      gain.connect(ctx.destination);
      osc.start(); 
      osc.stop(ctx.currentTime + 1);
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
