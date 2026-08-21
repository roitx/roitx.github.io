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

    // Visualizer Contexts
    this.vizAudioCtx = null;
    this.vizAnalyser = null;
    this.vizSource = null;

    // Active Widget Tracking
    this.activeWidgetType = null;
    this.widgetClockInterval = null;
    
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
    if (this.els.timerDisplay) {
      this.els.timerDisplay.textContent = this.formatTime(this.timerState.remaining);
    }
    
    // Create UI Components for Widget & Launcher
    this.createFloatingWidgetDOM();
    this.initVisualizer();
  }

  bindElements() {
    this.els = {
      timerDisplay: document.getElementById('timerDisplay'),
      customMinInput: document.getElementById('customMinInput'),
      swDisplay: document.getElementById('stopwatchDisplay'),
      lapsContainer: document.getElementById('lapsList'),
      dailyStats: document.getElementById('dailyStats'),
      taskInput: document.getElementById('taskInput'),
      taskList: document.getElementById('taskList'),
      modal: document.getElementById('sessionModal'),
      waveDesc: document.getElementById('waveDesc'),
      customAudio: document.getElementById('customAudio'),
      audioUrlInput: document.getElementById('audioUrlInput'),
      audioFileInput: document.getElementById('audioFileInput'),
      batteryLvl: document.getElementById('batteryLvl'),
      netStatus: document.getElementById('netStatus'),
      visualizerCanvas: document.getElementById('visualizer')
    };
  }

  attachEventListeners() {
    // Preset Timer Buttons
    document.getElementById('btnPomodoro')?.addEventListener('click', () => this.setTimer(40));
    document.getElementById('btnShortBreak')?.addEventListener('click', () => this.setTimer(5));
    document.getElementById('btnCubeBreak')?.addEventListener('click', () => this.setTimer(3));

    // Custom Minutes Input Button
    document.getElementById('btnSetCustomMin')?.addEventListener('click', () => {
      if (this.els.customMinInput) {
        const val = parseInt(this.els.customMinInput.value.trim());
        if (val && val > 0 && val <= 180) {
          this.setTimer(val);
        } else {
          alert("Kripya 1 se 180 minutes ke beech enter karein.");
        }
      }
    });

    // Main Timer Controls
    document.getElementById('btnStartTimer')?.addEventListener('click', () => this.startTimer());
    document.getElementById('btnPauseTimer')?.addEventListener('click', () => this.pauseTimer());
    document.getElementById('btnResetTimer')?.addEventListener('click', () => this.resetTimer());

    // Stopwatch Controls
    document.getElementById('btnSwStart')?.addEventListener('click', () => this.startStopwatch());
    document.getElementById('btnSwStop')?.addEventListener('click', () => this.stopStopwatch());
    document.getElementById('btnSwLap')?.addEventListener('click', () => this.lapStopwatch());
    document.getElementById('btnSwReset')?.addEventListener('click', () => this.resetStopwatch());

    // Local Device File Upload
    if (this.els.audioFileInput) {
      this.els.audioFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const ytContainer = document.getElementById('ytPlayerContainer');
        if (ytContainer) ytContainer.innerHTML = '';
        
        const fileURL = URL.createObjectURL(file);
        this.els.customAudio.style.display = 'block';
        this.els.customAudio.src = fileURL;
        this.els.customAudio.load();
        this.els.customAudio.play().catch(err => {
          console.error("Local audio error:", err);
          alert("Local file play nahi ho saki!");
        });
      });
    }

    // Smart URL / YouTube Handler
    document.getElementById('btnLoadAudio')?.addEventListener('click', () => {
      const inputVal = this.els.audioUrlInput.value.trim();
      if(!inputVal) return;

      const ytMatch = inputVal.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      
      let container = document.getElementById('ytPlayerContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'ytPlayerContainer';
        this.els.customAudio.parentNode.insertBefore(container, this.els.customAudio);
      }

      if (ytMatch && ytMatch[1]) {
        const videoId = ytMatch[1];
        this.els.customAudio.style.display = 'none';
        container.innerHTML = `<iframe width="100%" height="80" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay"></iframe>`;
      } else {
        container.innerHTML = '';
        this.els.customAudio.style.display = 'block';
        this.els.customAudio.src = inputVal;
        this.els.customAudio.load();
        this.els.customAudio.play().catch(error => {
          console.error("URL audio error:", error);
          alert("Audio stream load nahi ho saka! Valid direct MP3 link ya YouTube link dein.");
        });
      }
    });

    // Brainwaves
    document.querySelectorAll('.wave-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active-toggle'));
        e.target.classList.add('active-toggle');
        this.playBrainwave(e.target.dataset.wave, Number(e.target.dataset.freq));
      });
    });
    
    document.getElementById('btnStopWave')?.addEventListener('click', () => {
      document.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active-toggle'));
      this.stopBrainwave();
    });

    // Utility buttons
    document.getElementById('btnTaskAdd')?.addEventListener('click', () => this.addTask());
    document.getElementById('btnFocus')?.addEventListener('click', (e) => this.toggleFocus(e));
    document.getElementById('btnAmbient')?.addEventListener('click', (e) => this.toggleAmbient(e));
    
    const modalClose = document.getElementById('btnCloseModal') || document.getElementById('btnModalClose');
    if(modalClose) modalClose.addEventListener('click', () => this.closeModal());
  }

  // ==========================================
  // FLOATING WIDGET & LAUNCHER SYSTEM
  // ==========================================
  
  createFloatingWidgetDOM() {
    // 1. Create Launcher Trigger Button
    if (!document.getElementById('roitxLauncher')) {
      const launcher = document.createElement('div');
      launcher.id = 'roitxLauncher';
      launcher.title = 'Add Productivity Widget';
      launcher.innerHTML = '⚡';
      launcher.style.cssText = `
        position: fixed; bottom: 25px; right: 25px; z-index: 999999;
        width: 52px; height: 52px; background: #3b82f6; color: #ffffff;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3); font-size: 22px;
        transition: transform 0.2s, background 0.2s; user-select: none;
      `;
      launcher.onmouseover = () => launcher.style.transform = 'scale(1.1)';
      launcher.onmouseout = () => launcher.style.transform = 'scale(1.0)';
      
      launcher.addEventListener('click', () => this.toggleSelectionMenu());
      document.body.appendChild(launcher);
    }

    // 2. Create Floating Widget Container
    if (!document.getElementById('floatingWidget')) {
      const widget = document.createElement('div');
      widget.id = 'floatingWidget';
      widget.style.cssText = `
        position: fixed; bottom: 25px; right: 25px; z-index: 999999;
        width: 260px; background: #1e293b; color: #f8fafc; border-radius: 12px;
        display: none; box-shadow: 0 10px 25px rgba(0,0,0,0.5); padding: 14px;
        border: 1px solid #334155; font-family: system-ui, -apple-system, sans-serif;
      `;
      document.body.appendChild(widget);
      this.makeWidgetDraggable(widget);
    }
  }

  toggleSelectionMenu() {
    let menu = document.getElementById('roitxMenu');
    if (menu) {
      menu.remove();
      return;
    }

    menu = document.createElement('div');
    menu.id = 'roitxMenu';
    menu.style.cssText = `
      position: fixed; bottom: 85px; right: 25px; z-index: 1000000;
      background: #0f172a; color: #ffffff; padding: 10px; border-radius: 10px;
      box-shadow: 0 10px 20px rgba(0,0,0,0.4); border: 1px solid #334155;
      display: flex; flex-direction: column; gap: 8px; width: 180px;
      font-family: system-ui, -apple-system, sans-serif; font-size: 14px;
    `;

    menu.innerHTML = `
      <div style="font-weight: bold; padding: 4px; color: #94a3b8; font-size: 11px; text-transform: uppercase;">Select Widget</div>
      <button id="optTimer" style="background:#1e293b; color:#fff; border:1px solid #334155; padding:8px; border-radius:6px; cursor:pointer; text-align:left;">⏱️ Timer</button>
      <button id="optSw" style="background:#1e293b; color:#fff; border:1px solid #334155; padding:8px; border-radius:6px; cursor:pointer; text-align:left;">⏱️ Stopwatch</button>
      <button id="optClock" style="background:#1e293b; color:#fff; border:1px solid #334155; padding:8px; border-radius:6px; cursor:pointer; text-align:left;">⏰ Real-Time Clock</button>
    `;

    document.body.appendChild(menu);

    document.getElementById('optTimer').onclick = () => { this.launchWidget('timer'); menu.remove(); };
    document.getElementById('optSw').onclick = () => { this.launchWidget('stopwatch'); menu.remove(); };
    document.getElementById('optClock').onclick = () => { this.launchWidget('clock'); menu.remove(); };
  }

  launchWidget(type) {
    const widget = document.getElementById('floatingWidget');
    const launcher = document.getElementById('roitxLauncher');
    if (!widget || !launcher) return;

    this.activeWidgetType = type;

    // Hide Launcher, Show Widget Window
    launcher.style.display = 'none';
    widget.style.display = 'block';

    // Clear previous clock interval if any
    if (this.widgetClockInterval) clearInterval(this.widgetClockInterval);

    // Build Header
    let titleText = 'Timer';
    if (type === 'stopwatch') titleText = 'Stopwatch';
    if (type === 'clock') titleText = 'Real-Time Clock';

    widget.innerHTML = `
      <div id="widgetDragHandle" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:8px; margin-bottom:10px; cursor:move;">
        <span style="font-weight:bold; font-size: 0.9rem; color:#38bdf8;">🚀 Roitx ${titleText}</span>
        <button id="btnWidgetClose" style="background:transparent; border:none; color:#94a3b8; font-size:16px; cursor:pointer; padding:0 4px;">✕</button>
      </div>
      <div id="widgetBody" style="text-align:center;"></div>
    `;

    const body = widget.querySelector('#widgetBody');

    // Attach Working Close Event
    document.getElementById('btnWidgetClose').addEventListener('click', () => {
      widget.style.display = 'none';
      launcher.style.display = 'flex'; // Bring Launcher back
      if (this.widgetClockInterval) clearInterval(this.widgetClockInterval);
      this.activeWidgetType = null;
    });

    // Populate Widget Body Content
    if (type === 'timer') {
      body.innerHTML = `
        <div id="widgetTimeDisp" style="font-size:2rem; font-weight:bold; margin-bottom:10px; font-family:monospace;">${this.formatTime(this.timerState.remaining)}</div>
        <div style="display:flex; gap:6px;">
          <button id="btnWStart" style="flex:1; background:#3b82f6; color:#fff; border:none; padding:6px; border-radius:4px; cursor:pointer;">Start/Pause</button>
          <button id="btnWReset" style="background:#475569; color:#fff; border:none; padding:6px; border-radius:4px; cursor:pointer;">Reset</button>
        </div>
      `;
      document.getElementById('btnWStart').onclick = () => {
        if (this.timerState.intervalId) this.pauseTimer();
        else this.startTimer();
      };
      document.getElementById('btnWReset').onclick = () => this.resetTimer();
    } 
    else if (type === 'stopwatch') {
      body.innerHTML = `
        <div id="widgetSwDisp" style="font-size:1.8rem; font-weight:bold; margin-bottom:10px; font-family:monospace;">${this.formatStopwatch(this.stopwatchState.elapsed)}</div>
        <div style="display:flex; gap:6px;">
          <button id="btnWSwStart" style="flex:1; background:#10b981; color:#fff; border:none; padding:6px; border-radius:4px; cursor:pointer;">Start</button>
          <button id="btnWSwStop" style="flex:1; background:#ef4444; color:#fff; border:none; padding:6px; border-radius:4px; cursor:pointer;">Stop</button>
          <button id="btnWSwReset" style="background:#475569; color:#fff; border:none; padding:6px; border-radius:4px; cursor:pointer;">Reset</button>
        </div>
      `;
      document.getElementById('btnWSwStart').onclick = () => this.startStopwatch();
      document.getElementById('btnWSwStop').onclick = () => this.stopStopwatch();
      document.getElementById('btnWSwReset').onclick = () => this.resetStopwatch();
    } 
    else if (type === 'clock') {
      body.innerHTML = `
        <div id="widgetClockDisp" style="font-size:1.8rem; font-weight:bold; color:#f59e0b; font-family:monospace; margin:10px 0;">00:00:00</div>
      `;
      const updateClock = () => {
        const cEl = document.getElementById('widgetClockDisp');
        if (cEl) cEl.textContent = new Date().toLocaleTimeString();
      };
      updateClock();
      this.widgetClockInterval = setInterval(updateClock, 1000);
    }
  }

  updateWidgetTime() {
    if (this.activeWidgetType === 'timer') {
      const wTime = document.getElementById('widgetTimeDisp');
      if (wTime) wTime.textContent = this.formatTime(this.timerState.remaining);
    }
  }

  makeWidgetDraggable(widget) {
    let isDragging = false, offsetRight = 0, offsetBottom = 0;

    widget.addEventListener('mousedown', (e) => {
      if (e.target.closest('#widgetDragHandle')) {
        isDragging = true;
        offsetRight = window.innerWidth - e.clientX - widget.offsetWidth;
        offsetBottom = window.innerHeight - e.clientY - widget.offsetHeight;
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      let newRight = window.innerWidth - e.clientX - offsetRight;
      let newBottom = window.innerHeight - e.clientY - offsetBottom;
      widget.style.right = `${Math.max(10, newRight)}px`;
      widget.style.bottom = `${Math.max(10, newBottom)}px`;
    });

    document.addEventListener('mouseup', () => isDragging = false);
  }

  // ==========================================
  // AUDIO VISUALIZER & BRAINWAVE ENGINE
  // ==========================================

  initVisualizer() {
    if (!this.els.customAudio || !this.els.visualizerCanvas) return;
    const canvas = this.els.visualizerCanvas;
    const ctx = canvas.getContext('2d');

    this.els.customAudio.addEventListener('play', () => {
      if (!this.vizAudioCtx) {
        this.vizAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.vizAnalyser = this.vizAudioCtx.createAnalyser();
        this.vizSource = this.vizAudioCtx.createMediaElementSource(this.els.customAudio);
        this.vizSource.connect(this.vizAnalyser);
        this.vizAnalyser.connect(this.vizAudioCtx.destination);
        this.vizAnalyser.fftSize = 128;
      }
      if (this.vizAudioCtx.state === 'suspended') {
        this.vizAudioCtx.resume();
      }
      this.drawVisualizer(canvas, ctx);
    });
  }

  drawVisualizer(canvas, ctx) {
    if (!this.vizAnalyser) return;
    requestAnimationFrame(() => this.drawVisualizer(canvas, ctx));

    const bufferLength = this.vizAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.vizAnalyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / bufferLength) * 2;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 2;
    }
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
    if(this.els.waveDesc) {
      this.els.waveDesc.innerHTML = `<strong>Active:</strong> ${descriptions[type] || 'Binaural Beat'} <br><span style="color:var(--accent-primary)">Playing at ${freqOffset}Hz difference. (Requires Headphones)</span>`;
    }

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
      if(this.els.waveDesc) this.els.waveDesc.textContent = "Audio blocked by browser. Click anywhere on page first.";
    }
  }

  stopBrainwave() {
    if (this.brainwaveCtx) {
      this.brainwaveCtx.close();
      this.brainwaveCtx = null;
    }
    if(this.els.waveDesc) {
      this.els.waveDesc.innerHTML = "Select a frequency to generate Binaural Beats. (Requires Headphones)";
    }
  }

  // ==========================================
  // CORE TIMER & STOPWATCH LOGIC
  // ==========================================

  formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  setTimer(minutes) {
    this.pauseTimer();
    this.timerState.initial = minutes * 60;
    this.timerState.remaining = this.timerState.initial;
    if(this.els.timerDisplay) this.els.timerDisplay.textContent = this.formatTime(this.timerState.remaining);
    this.updateWidgetTime();
  }

  startTimer() {
    if (this.timerState.intervalId) return;
    this.timerState.intervalId = setInterval(() => {
      if (this.timerState.remaining > 0) {
        this.timerState.remaining--;
        if(this.els.timerDisplay) this.els.timerDisplay.textContent = this.formatTime(this.timerState.remaining);
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
    if(this.els.timerDisplay) this.els.timerDisplay.textContent = this.formatTime(this.timerState.remaining);
    this.updateWidgetTime();
    document.title = "Study Timer - Roitx Pro";
  }

  completeSession() {
    this.pauseTimer();
    if(this.els.timerDisplay) this.els.timerDisplay.textContent = "00:00";
    this.updateWidgetTime();
    this.playChime();
    this.sendNotification("Session Complete!", "Great job! Time to track your focus minutes.");
    
    const sessionMins = Math.round(this.timerState.initial / 60);
    this.dailyMinutes += sessionMins;
    localStorage.setItem('roitx_study_mins', this.dailyMinutes);
    this.updateStatsUI();
    this.showModal();
  }

  showModal() { if(this.els.modal) this.els.modal.style.display = 'flex'; }
  closeModal() { if(this.els.modal) this.els.modal.style.display = 'none'; }

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
    if(this.els.swDisplay) this.els.swDisplay.innerHTML = this.formatStopwatch(this.stopwatchState.elapsed);
    
    if (this.activeWidgetType === 'stopwatch') {
      const wSw = document.getElementById('widgetSwDisp');
      if (wSw) wSw.innerHTML = this.formatStopwatch(this.stopwatchState.elapsed);
    }
    
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
    if (!this.stopwatchState.running || !this.els.lapsContainer) return;
    const lapTime = this.formatStopwatch(this.stopwatchState.elapsed);
    const div = document.createElement('div');
    div.className = 'task-item';
    div.innerHTML = `<span>Lap ${this.els.lapsContainer.children.length + 1}</span> <span>${lapTime}</span>`;
    this.els.lapsContainer.prepend(div);
  }

  resetStopwatch() {
    this.stopStopwatch();
    this.stopwatchState.elapsed = 0;
    if(this.els.swDisplay) this.els.swDisplay.innerHTML = `00:00<span class="ms-display">.00</span>`;
    if(this.els.lapsContainer) this.els.lapsContainer.innerHTML = '';
    
    if (this.activeWidgetType === 'stopwatch') {
      const wSw = document.getElementById('widgetSwDisp');
      if (wSw) wSw.innerHTML = `00:00<span class="ms-display">.00</span>`;
    }
  }

  // ==========================================
  // TASK MANAGEMENT & UTILITIES
  // ==========================================

  addTask() {
    if(!this.els.taskInput) return;
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
    if(!this.els.taskList) return;
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
        const updateB = () => { 
          if(this.els.batteryLvl) this.els.batteryLvl.textContent = `${Math.round(b.level*100)}%`; 
        };
        updateB(); b.addEventListener('levelchange', updateB);
      } catch(e) {
        if(this.els.batteryLvl) this.els.batteryLvl.textContent = "Desktop Mode";
      }
    } else {
      if(this.els.batteryLvl) this.els.batteryLvl.textContent = "System Ready";
    }

    const updateN = () => { 
      if(this.els.netStatus) {
        this.els.netStatus.textContent = navigator.onLine ? "Online" : "Offline"; 
      }
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

// Global App Initialization
const app = new ProductivityEngine();
