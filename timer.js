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

    // Visualizer & Track State
    this.vizAudioCtx = null;
    this.vizAnalyser = null;
    this.vizSource = null;
    this.currentTrackName = "No Track Playing";
    this.isPlayingMusic = false;

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

    // Local Audio Upload
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
        
        this.currentTrackName = file.name.replace(/\.[^/.]+$/, "");
        this.isPlayingMusic = true;
        this.updateWidgetMusicUI();

        this.els.customAudio.play().catch(() => alert("Local file play nahi ho saki!"));
      });
    }

    // SMART MUSIC LINK HANDLER (MP3 + YouTube Auto Detect)
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
        if (this.els.customAudio) {
          this.els.customAudio.pause();
          this.els.customAudio.style.display = 'none';
        }
        container.innerHTML = `<iframe width="100%" height="160" src="https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="border-radius:8px; margin-top:10px;"></iframe>`;
        
        this.currentTrackName = "YouTube Track (" + videoId + ")";
        this.isPlayingMusic = true;
        this.updateWidgetMusicUI();
      } else {
        container.innerHTML = '';
        if (this.els.customAudio) {
          this.els.customAudio.style.display = 'block';
          this.els.customAudio.src = inputVal;
          this.els.customAudio.load();
          
          this.currentTrackName = inputVal.split('/').pop().split('?')[0] || "MP3 Track";
          this.isPlayingMusic = true;
          this.updateWidgetMusicUI();

          this.els.customAudio.play().catch(() => {
            alert("Direct MP3 link play nahi ho saka! Check karein ki link sahi hai.");
          });
        }
      }
    });

    // Audio Pause Events
    if (this.els.customAudio) {
      this.els.customAudio.addEventListener('pause', () => {
        this.isPlayingMusic = false;
        this.updateWidgetMusicUI();
      });
      this.els.customAudio.addEventListener('play', () => {
        this.isPlayingMusic = true;
        this.updateWidgetMusicUI();
      });
    }

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

    // Task Manager
    document.getElementById('btnTaskAdd')?.addEventListener('click', () => this.addTask());
    document.getElementById('btnFocus')?.addEventListener('click', (e) => this.toggleFocus(e));
    document.getElementById('btnAmbient')?.addEventListener('click', (e) => this.toggleAmbient(e));
    
    const modalClose = document.getElementById('btnCloseModal') || document.getElementById('btnModalClose');
    if(modalClose) modalClose.addEventListener('click', () => this.closeModal());
  }

  // ==========================================
  // FLOATING WIDGET (POSITIONED BOTTOM-RIGHT)
  // ==========================================
  
  createFloatingWidgetDOM() {
    if (!document.getElementById('roitxLauncher')) {
      const launcher = document.createElement('div');
      launcher.id = 'roitxLauncher';
      launcher.title = 'Add Widget';
      launcher.innerHTML = '⚡';
      launcher.style.cssText = `
        position: fixed; bottom: 25px; right: 25px; z-index: 999999;
        width: 55px; height: 55px; background: #3b82f6; color: #ffffff;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        cursor: pointer; box-shadow: 0 4px 18px rgba(0,0,0,0.4); font-size: 24px;
        transition: transform 0.2s; user-select: none;
      `;
      launcher.onmouseover = () => launcher.style.transform = 'scale(1.1)';
      launcher.onmouseout = () => launcher.style.transform = 'scale(1.0)';
      
      launcher.addEventListener('click', () => this.toggleSelectionMenu());
      document.body.appendChild(launcher);
    }

    if (!document.getElementById('floatingWidget')) {
      const widget = document.createElement('div');
      widget.id = 'floatingWidget';
      widget.style.cssText = `
        position: fixed; bottom: 90px; right: 25px; z-index: 999999;
        width: 270px; background: #1e293b; color: #f8fafc; border-radius: 12px;
        display: none; box-shadow: 0 10px 25px rgba(0,0,0,0.5); padding: 14px;
        border: 1px solid #334155; font-family: system-ui, -apple-system, sans-serif;
      `;
      document.body.appendChild(widget);
      this.makeWidgetDraggable(widget);
    }

    // Dynamic Wave Styles
    if (!document.getElementById('widgetWaveStyle')) {
      const style = document.createElement('style');
      style.id = 'widgetWaveStyle';
      style.innerHTML = `
        @keyframes soundWaveBar {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        .wave-bar {
          width: 3px; background: #38bdf8; border-radius: 2px; height: 4px;
        }
        .wave-active .wave-bar:nth-child(1) { animation: soundWaveBar 0.6s infinite ease-in-out; }
        .wave-active .wave-bar:nth-child(2) { animation: soundWaveBar 0.8s infinite ease-in-out 0.2s; }
        .wave-active .wave-bar:nth-child(3) { animation: soundWaveBar 0.5s infinite ease-in-out 0.1s; }
        .wave-active .wave-bar:nth-child(4) { animation: soundWaveBar 0.7s infinite ease-in-out 0.3s; }
      `;
      document.head.appendChild(style);
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
      position: fixed; bottom: 90px; right: 25px; z-index: 1000000;
      background: #0f172a; color: #ffffff; padding: 10px; border-radius: 10px;
      box-shadow: 0 10px 20px rgba(0,0,0,0.4); border: 1px solid #334155;
      display: flex; flex-direction: column; gap: 8px; width: 180px;
      font-family: system-ui, -apple-system, sans-serif; font-size: 14px;
    `;

    menu.innerHTML = `
      <div style="font-weight: bold; padding: 2px; color: #94a3b8; font-size: 11px; text-transform: uppercase;">Select Widget</div>
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

    launcher.style.display = 'none';
    widget.style.display = 'block';

    if (this.widgetClockInterval) clearInterval(this.widgetClockInterval);

    let titleText = type === 'stopwatch' ? 'Stopwatch' : (type === 'clock' ? 'Real-Time Clock' : 'Timer');

    widget.innerHTML = `
      <div id="widgetDragHandle" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:8px; margin-bottom:10px; cursor:move;">
        <span style="font-weight:bold; font-size: 0.85rem; color:#38bdf8; user-select:none;">🚀 Roitx ${titleText}</span>
        <button id="btnWidgetClose" style="background:transparent; border:none; color:#94a3b8; font-size:16px; cursor:pointer; padding:0 4px;">✕</button>
      </div>
      <div id="widgetBody" style="text-align:center;"></div>
      
      <!-- Music Info Bar + Animated Sound Wave -->
      <div style="margin-top:12px; padding-top:8px; border-top:1px solid #334155; display:flex; align-items:center; justify-content:space-between; font-size:0.75rem; color:#94a3b8;">
        <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;" id="wTrackName">🎵 ${this.currentTrackName}</div>
        <div id="wWaveBox" class="${this.isPlayingMusic ? 'wave-active' : ''}" style="display:flex; gap:2px; align-items:flex-end; height:16px;">
          <div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div>
        </div>
      </div>
    `;

    const body = widget.querySelector('#widgetBody');

    document.getElementById('btnWidgetClose').addEventListener('click', () => {
      widget.style.display = 'none';
      launcher.style.display = 'flex';
      if (this.widgetClockInterval) clearInterval(this.widgetClockInterval);
      this.activeWidgetType = null;
    });

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

  // SMOOTH 2D DRAGGING LOGIC
  makeWidgetDraggable(widget) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    widget.addEventListener('mousedown', (e) => {
      if (e.target.closest('#widgetDragHandle')) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = widget.offsetLeft;
        initialTop = widget.offsetTop;
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxLeft = window.innerWidth - widget.offsetWidth - 10;
      const maxTop = window.innerHeight - widget.offsetHeight - 10;

      widget.style.left = `${Math.max(10, Math.min(newLeft, maxLeft))}px`;
      widget.style.top = `${Math.max(10, Math.min(newTop, maxTop))}px`;
      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => isDragging = false);
  }

  updateWidgetMusicUI() {
    const tName = document.getElementById('wTrackName');
    const wWaveBox = document.getElementById('wWaveBox');

    if (tName) tName.textContent = `🎵 ${this.currentTrackName}`;
    if (wWaveBox) {
      if (this.isPlayingMusic) {
        wWaveBox.classList.add('wave-active');
      } else {
        wWaveBox.classList.remove('wave-active');
      }
    }
  }

  updateWidgetTime() {
    if (this.activeWidgetType === 'timer') {
      const wTime = document.getElementById('widgetTimeDisp');
      if (wTime) wTime.textContent = this.formatTime(this.timerState.remaining);
    }
  }

  // ==========================================
  // TIMER CORE LOGIC
  // ==========================================

  setTimer(mins) {
    this.pauseTimer();
    this.timerState.initial = mins * 60;
    this.timerState.remaining = mins * 60;
    if (this.els.timerDisplay) this.els.timerDisplay.textContent = this.formatTime(this.timerState.remaining);
    this.updateWidgetTime();
  }

  startTimer() {
    if (this.timerState.intervalId) return;
    this.timerState.intervalId = setInterval(() => {
      if (this.timerState.remaining > 0) {
        this.timerState.remaining--;
        if (this.els.timerDisplay) this.els.timerDisplay.textContent = this.formatTime(this.timerState.remaining);
        this.updateWidgetTime();
      } else {
        this.pauseTimer();
        this.onTimerComplete();
      }
    }, 1000);
  }

  pauseTimer() {
    if (this.timerState.intervalId) {
      clearInterval(this.timerState.intervalId);
      this.timerState.intervalId = null;
    }
  }

  resetTimer() {
    this.pauseTimer();
    this.timerState.remaining = this.timerState.initial;
    if (this.els.timerDisplay) this.els.timerDisplay.textContent = this.formatTime(this.timerState.remaining);
    this.updateWidgetTime();
  }

  onTimerComplete() {
    const elapsedMins = Math.round(this.timerState.initial / 60);
    this.dailyMinutes += elapsedMins;
    localStorage.setItem('roitx_study_mins', this.dailyMinutes);
    this.updateStatsUI();

    if (Notification.permission === 'granted') {
      new Notification("Roitx Engine", { body: "Time's up! Great study session." });
    }
    this.showModal(`Session Ended! You logged ${elapsedMins} minutes of productivity.`);
  }

  formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // ==========================================
  // STOPWATCH LOGIC
  // ==========================================

  startStopwatch() {
    if (this.stopwatchState.running) return;
    this.stopwatchState.running = true;
    this.stopwatchState.start = performance.now() - this.stopwatchState.elapsed;
    
    const update = () => {
      if (!this.stopwatchState.running) return;
      this.stopwatchState.elapsed = performance.now() - this.stopwatchState.start;
      const formatted = this.formatStopwatch(this.stopwatchState.elapsed);
      
      if (this.els.swDisplay) this.els.swDisplay.textContent = formatted;
      const wSw = document.getElementById('widgetSwDisp');
      if (wSw) wSw.textContent = formatted;

      this.stopwatchState.rafId = requestAnimationFrame(update);
    };
    update();
  }

  stopStopwatch() {
    this.stopwatchState.running = false;
    if (this.stopwatchState.rafId) cancelAnimationFrame(this.stopwatchState.rafId);
  }

  lapStopwatch() {
    if (!this.stopwatchState.elapsed || !this.els.lapsContainer) return;
    const li = document.createElement('li');
    li.style.cssText = "padding: 4px 0; border-bottom: 1px dashed #334155; font-family: monospace;";
    li.textContent = `Lap ${this.els.lapsContainer.children.length + 1}: ${this.formatStopwatch(this.stopwatchState.elapsed)}`;
    this.els.lapsContainer.prepend(li);
  }

  resetStopwatch() {
    this.stopStopwatch();
    this.stopwatchState.elapsed = 0;
    const formatted = "00:00:00.00";
    if (this.els.swDisplay) this.els.swDisplay.textContent = formatted;
    if (this.els.lapsContainer) this.els.lapsContainer.innerHTML = '';
    const wSw = document.getElementById('widgetSwDisp');
    if (wSw) wSw.textContent = formatted;
  }

  formatStopwatch(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const millis = Math.floor((ms % 1000) / 10);

    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
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
      'beta': 'Beta Waves (13-30Hz): Enhances active concentration and logical processing.',
      'alpha': 'Alpha Waves (8-12Hz): Promotes relaxed focus and deep learning state.',
      'theta': 'Theta Waves (4-7Hz): Deep meditation, intuition, and memory recall.',
      'gamma': 'Gamma Waves (30-100Hz): High-level cognitive processing and problem-solving.'
    };

    if (this.els.waveDesc) {
      this.els.waveDesc.textContent = descriptions[type] || 'Binaural beats active.';
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.brainwaveCtx = new AudioContext();

    const baseFreq = 200;
    const merger = this.brainwaveCtx.createChannelMerger(2);

    this.waveOscLeft = this.brainwaveCtx.createOscillator();
    this.waveOscRight = this.brainwaveCtx.createOscillator();

    this.waveOscLeft.frequency.value = baseFreq;
    this.waveOscRight.frequency.value = baseFreq + freqOffset;

    this.waveOscLeft.connect(merger, 0, 0);
    this.waveOscRight.connect(merger, 0, 1);

    merger.connect(this.brainwaveCtx.destination);

    this.waveOscLeft.start();
    this.waveOscRight.start();
  }

  stopBrainwave() {
    if (this.waveOscLeft) { this.waveOscLeft.stop(); this.waveOscLeft.disconnect(); }
    if (this.waveOscRight) { this.waveOscRight.stop(); this.waveOscRight.disconnect(); }
    if (this.brainwaveCtx) { this.brainwaveCtx.close(); }
    this.brainwaveCtx = null;
    if (this.els.waveDesc) this.els.waveDesc.textContent = 'Select a wave frequency to generate binaural tones.';
  }

  toggleAmbient(e) {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
      
      const bufferSize = this.audioCtx.sampleRate * 2;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.noiseNode = this.audioCtx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;
      this.noiseNode.connect(this.audioCtx.destination);
      this.noiseNode.start();
      e.target.classList.add('active-toggle');
      e.target.textContent = '🔊 Ambient Noise: ON';
    } else {
      this.noiseNode.stop();
      this.audioCtx.close();
      this.audioCtx = null;
      e.target.classList.remove('active-toggle');
      e.target.textContent = '🌧️ Pink Noise';
    }
  }

  // ==========================================
  // TASKS, STATS, HARDWARE & UTILS
  // ==========================================

  addTask() {
    if (!this.els.taskInput) return;
    const val = this.els.taskInput.value.trim();
    if (!val) return;

    const tasks = JSON.parse(localStorage.getItem('roitx_tasks')) || [];
    tasks.push({ id: Date.now(), text: val, completed: false });
    localStorage.setItem('roitx_tasks', JSON.stringify(tasks));

    this.els.taskInput.value = '';
    this.loadTasks();
  }

  loadTasks() {
    if (!this.els.taskList) return;
    const tasks = JSON.parse(localStorage.getItem('roitx_tasks')) || [];
    this.els.taskList.innerHTML = '';

    tasks.forEach(t => {
      const li = document.createElement('li');
      li.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding: 6px; border-bottom: 1px solid #334155;";
      li.innerHTML = `
        <span style="text-decoration: ${t.completed ? 'line-through' : 'none'}; color: ${t.completed ? '#64748b' : '#f8fafc'};">${t.text}</span>
        <div>
          <button style="background:none; border:none; cursor:pointer;" onclick="app.toggleTask(${t.id})">✔️</button>
          <button style="background:none; border:none; cursor:pointer;" onclick="app.deleteTask(${t.id})">🗑️</button>
        </div>
      `;
      this.els.taskList.appendChild(li);
    });
  }

  toggleTask(id) {
    let tasks = JSON.parse(localStorage.getItem('roitx_tasks')) || [];
    tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    localStorage.setItem('roitx_tasks', JSON.stringify(tasks));
    this.loadTasks();
  }

  deleteTask(id) {
    let tasks = JSON.parse(localStorage.getItem('roitx_tasks')) || [];
    tasks = tasks.filter(t => t.id !== id);
    localStorage.setItem('roitx_tasks', JSON.stringify(tasks));
    this.loadTasks();
  }

  toggleFocus(e) {
    document.body.classList.toggle('focus-mode');
    if (document.body.classList.contains('focus-mode')) {
      e.target.textContent = '☀️ Exit Focus Mode';
    } else {
      e.target.textContent = '🌙 Deep Focus Mode';
    }
  }

  updateStatsUI() {
    if (this.els.dailyStats) {
      this.els.dailyStats.textContent = `${this.dailyMinutes} mins logged today`;
    }
  }

  startLiveClock() {
    const clockEl = document.getElementById('liveClock');
    if (clockEl) {
      setInterval(() => {
        clockEl.textContent = new Date().toLocaleTimeString();
      }, 1000);
    }
  }

  initHardwareAPIs() {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(b => {
        const updateB = () => {
          if (this.els.batteryLvl) this.els.batteryLvl.textContent = `${Math.round(b.level * 100)}%`;
        };
        updateB();
        b.addEventListener('levelchange', updateB);
      });
    }
    window.addEventListener('online', () => this.updateNetStatus());
    window.addEventListener('offline', () => this.updateNetStatus());
    this.updateNetStatus();
  }

  updateNetStatus() {
    if (this.els.netStatus) {
      this.els.netStatus.textContent = navigator.onLine ? 'Online 🟢' : 'Offline 🔴';
    }
  }

  requestNotificationPerm() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  showModal(msg) {
    if (this.els.modal) {
      const msgEl = this.els.modal.querySelector('p') || this.els.modal;
      msgEl.textContent = msg;
      this.els.modal.style.display = 'flex';
    } else {
      alert(msg);
    }
  }

  closeModal() {
    if (this.els.modal) this.els.modal.style.display = 'none';
  }
}

// Global App Initialization
const app = new ProductivityEngine();
