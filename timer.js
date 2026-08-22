"use strict";

/**
 * ROITX SUITE PRO - MASTER PRODUCTIVITY & WIDGET ENGINE
 * Complete Replaceable Script File
 */
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
    this.applyTheme(localStorage.getItem('roitx_theme') || 'dark');
    
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

    // Custom Minutes
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
        if (this.els.customAudio) {
          this.els.customAudio.style.display = 'block';
          this.els.customAudio.src = fileURL;
          this.els.customAudio.load();
        }
        
        this.currentTrackName = file.name.replace(/\.[^/.]+$/, "");
        this.isPlayingMusic = true;
        this.updateWidgetMusicUI();

        this.els.customAudio?.play().catch(() => alert("Local file play nahi ho saki!"));
      });
    }

    // SMART MUSIC LINK HANDLER (YouTube + MP3 Support)
    document.getElementById('btnLoadAudio')?.addEventListener('click', () => {
      const inputVal = this.els.audioUrlInput?.value.trim();
      if (!inputVal) return;

      const ytMatch = inputVal.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      
      let container = document.getElementById('ytPlayerContainer');
      if (!container && this.els.customAudio) {
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
        if (container) {
          container.innerHTML = `<iframe width="100%" height="160" src="https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="border-radius:8px; margin-top:10px;"></iframe>`;
        }
        
        this.currentTrackName = "YouTube Stream (" + videoId + ")";
        this.isPlayingMusic = true;
        this.updateWidgetMusicUI();
      } else {
        if (container) container.innerHTML = '';
        if (this.els.customAudio) {
          this.els.customAudio.style.display = 'block';
          this.els.customAudio.src = inputVal;
          this.els.customAudio.load();
          
          this.currentTrackName = inputVal.split('/').pop().split('?')[0] || "MP3 Track";
          this.isPlayingMusic = true;
          this.updateWidgetMusicUI();

          this.els.customAudio.play().catch(() => {
            alert("Direct MP3 link play nahi ho saka!");
          });
        }
      }
    });

    // Audio Pause/Play Events
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
    if (modalClose) modalClose.addEventListener('click', () => this.closeModal());
  }

  // ==========================================
  // FLOATING DRAGGABLE WIDGET ENGINE & THEMES
  // ==========================================
  
  createFloatingWidgetDOM() {
    let launcher = document.getElementById('roitxLauncher');
    if (!launcher) {
      launcher = document.createElement('div');
      launcher.id = 'roitxLauncher';
      launcher.title = 'Widget Options (Drag Me Anywhere)';
      launcher.innerHTML = '⚡';
      launcher.style.cssText = `
        position: fixed; bottom: 30px; right: 30px; z-index: 999999;
        width: 58px; height: 58px; background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center;
        cursor: move; box-shadow: 0 8px 25px rgba(59, 130, 246, 0.5); font-size: 26px;
        user-select: none; touch-action: none; border: 2px solid rgba(255, 255, 255, 0.3);
      `;
      document.body.appendChild(launcher);
    }

    // Bind dragging & clicking safely
    this.makeElementDraggable(launcher, null, () => this.toggleSelectionMenu());

    if (!document.getElementById('floatingWidget')) {
      const widget = document.createElement('div');
      widget.id = 'floatingWidget';
      widget.style.cssText = `
        position: fixed; bottom: 95px; right: 30px; z-index: 999998;
        width: 270px; background: rgba(10, 17, 40, 0.95); color: #f8fafc; border-radius: 16px;
        display: none; box-shadow: 0 10px 30px rgba(0,0,0,0.6); padding: 16px;
        border: 1px solid #3b82f6; font-family: system-ui, -apple-system, sans-serif;
        touch-action: none; backdrop-filter: blur(16px);
      `;
      document.body.appendChild(widget);
    }

    if (!document.getElementById('widgetWaveStyle')) {
      const style = document.createElement('style');
      style.id = 'widgetWaveStyle';
      style.innerHTML = `
        @keyframes soundWaveBar {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        .wave-bar { width: 3px; background: #38bdf8; border-radius: 2px; height: 4px; }
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
      position: fixed; bottom: 95px; right: 30px; z-index: 1000000;
      background: #0f172a; color: #ffffff; padding: 12px; border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6); border: 1px solid #334155;
      display: flex; flex-direction: column; gap: 8px; width: 210px;
      font-family: system-ui, -apple-system, sans-serif; font-size: 14px;
    `;

    menu.innerHTML = `
      <div style="font-weight: bold; color: #94a3b8; font-size: 11px; text-transform: uppercase;">Widgets</div>
      <button id="optTimer" style="background:#1e293b; color:#fff; border:1px solid #334155; padding:8px; border-radius:6px; cursor:pointer; text-align:left;">⏱️ Timer Widget</button>
      <button id="optSw" style="background:#1e293b; color:#fff; border:1px solid #334155; padding:8px; border-radius:6px; cursor:pointer; text-align:left;">⏱️ Stopwatch Widget</button>
      <button id="optClock" style="background:#1e293b; color:#fff; border:1px solid #334155; padding:8px; border-radius:6px; cursor:pointer; text-align:left;">⏰ Live Clock</button>
      
      <div style="font-weight: bold; color: #94a3b8; font-size: 11px; text-transform: uppercase; margin-top:6px;">Themes</div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
        <button class="btnTheme" data-theme="dark" style="background:#0f172a; color:#fff; border:1px solid #334155; border-radius:6px; padding:6px; font-size:11px; cursor:pointer;">Dark</button>
        <button class="btnTheme" data-theme="cyberpunk" style="background:#150050; color:#00f6ff; border:1px solid #ff007f; border-radius:6px; padding:6px; font-size:11px; cursor:pointer;">Neon</button>
        <button class="btnTheme" data-theme="emerald" style="background:#022c22; color:#a7f3d0; border:1px solid #059669; border-radius:6px; padding:6px; font-size:11px; cursor:pointer;">Emerald</button>
        <button class="btnTheme" data-theme="amber" style="background:#291002; color:#fef3c7; border:1px solid #d97706; border-radius:6px; padding:6px; font-size:11px; cursor:pointer;">Amber</button>
      </div>
    `;

    document.body.appendChild(menu);

    document.getElementById('optTimer').onclick = () => { this.launchWidget('timer'); menu.remove(); };
    document.getElementById('optSw').onclick = () => { this.launchWidget('stopwatch'); menu.remove(); };
    document.getElementById('optClock').onclick = () => { this.launchWidget('clock'); menu.remove(); };

    menu.querySelectorAll('.btnTheme').forEach(b => {
      b.onclick = (e) => {
        this.applyTheme(e.target.dataset.theme);
        menu.remove();
      };
    });
  }

  applyTheme(theme) {
    document.body.classList.remove('theme-cyberpunk', 'theme-emerald', 'theme-amber');
    if (theme !== 'dark') document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('roitx_theme', theme);
  }

  launchWidget(type) {
    const widget = document.getElementById('floatingWidget');
    const launcher = document.getElementById('roitxLauncher');
    if (!widget || !launcher) return;

    this.activeWidgetType = type;
    launcher.style.display = 'none';
    widget.style.display = 'block';

    if (this.widgetClockInterval) clearInterval(this.widgetClockInterval);

    let titleText = type === 'stopwatch' ? 'Stopwatch' : (type === 'clock' ? 'Clock' : 'Timer');

    widget.innerHTML = `
      <div id="widgetDragHandle" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:8px; margin-bottom:10px; cursor:move;">
        <span style="font-weight:bold; font-size: 0.85rem; color:#38bdf8; user-select:none;">🚀 Roitx ${titleText}</span>
        <button id="btnWidgetClose" style="background:transparent; border:none; color:#94a3b8; font-size:16px; cursor:pointer; padding:0 4px;">✕</button>
      </div>
      <div id="widgetBody" style="text-align:center;"></div>
      
      <div style="margin-top:12px; padding-top:8px; border-top:1px solid #334155; display:flex; align-items:center; justify-content:space-between; font-size:0.75rem; color:#94a3b8;">
        <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;" id="wTrackName">🎵 ${this.currentTrackName}</div>
        <div id="wWaveBox" class="${this.isPlayingMusic ? 'wave-active' : ''}" style="display:flex; gap:2px; align-items:flex-end; height:16px;">
          <div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div>
        </div>
      </div>
    `;

    this.makeElementDraggable(widget, widget.querySelector('#widgetDragHandle'));

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
          <button id="btnWStart" style="flex:1; background:#3b82f6; color:#fff; border:none; padding:6px; border-radius:6px; cursor:pointer;">Start/Pause</button>
          <button id="btnWReset" style="background:#475569; color:#fff; border:none; padding:6px; border-radius:6px; cursor:pointer;">Reset</button>
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
          <button id="btnWSwStart" style="flex:1; background:#10b981; color:#fff; border:none; padding:6px; border-radius:6px; cursor:pointer;">Start</button>
          <button id="btnWSwStop" style="flex:1; background:#ef4444; color:#fff; border:none; padding:6px; border-radius:6px; cursor:pointer;">Stop</button>
          <button id="btnWSwReset" style="background:#475569; color:#fff; border:none; padding:6px; border-radius:6px; cursor:pointer;">Reset</button>
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

  // UNIVERSAL MOUSE & TOUCH DRAGGING ENGINE WITH CLICK DISTINCTION
  makeElementDraggable(element, handleTarget = null, onClickCallback = null) {
    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    let movedDistance = 0;
    const handle = handleTarget || element;

    const onStart = (clientX, clientY) => {
      isDragging = true;
      movedDistance = 0;
      startX = clientX;
      startY = clientY;
      const rect = element.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
    };

    const onMove = (clientX, clientY) => {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      movedDistance = Math.hypot(dx, dy);

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxLeft = window.innerWidth - element.offsetWidth - 10;
      const maxTop = window.innerHeight - element.offsetHeight - 10;

      element.style.left = `${Math.max(10, Math.min(newLeft, maxLeft))}px`;
      element.style.top = `${Math.max(10, Math.min(newTop, maxTop))}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';
    };

    const onEnd = () => {
      if (isDragging && movedDistance < 5 && typeof onClickCallback === 'function') {
        onClickCallback();
      }
      isDragging = false;
    };

    // Mouse Events
    handle.addEventListener('mousedown', (e) => {
      onStart(e.clientX, e.clientY);
      const onMouseMove = (ev) => onMove(ev.clientX, ev.clientY);
      const onMouseUp = () => {
        onEnd();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Touch Events
    handle.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    handle.addEventListener('touchend', () => onEnd());
  }

  updateWidgetMusicUI() {
    const wTrack = document.getElementById('wTrackName');
    const wBox = document.getElementById('wWaveBox');

    if (wTrack) wTrack.textContent = `🎵 ${this.currentTrackName}`;
    if (wBox) {
      if (this.isPlayingMusic) wBox.classList.add('wave-active');
      else wBox.classList.remove('wave-active');
    }
  }

  // ==========================================
  // TIMER CORE LOGIC
  // ==========================================
  
  setTimer(mins) {
    this.pauseTimer();
    this.timerState.initial = mins * 60;
    this.timerState.remaining = mins * 60;
    this.updateTimerDisplay();
  }

  startTimer() {
    if (this.timerState.intervalId) return;

    this.timerState.intervalId = setInterval(() => {
      if (this.timerState.remaining > 0) {
        this.timerState.remaining--;
        this.updateTimerDisplay();
      } else {
        this.timerComplete();
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
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const formatted = this.formatTime(this.timerState.remaining);
    if (this.els.timerDisplay) this.els.timerDisplay.textContent = formatted;
    
    const widgetDisp = document.getElementById('widgetTimeDisp');
    if (widgetDisp) widgetDisp.textContent = formatted;

    document.title = `${formatted} - Study Focus`;
  }

  timerComplete() {
    this.pauseTimer();
    this.playNotificationSound();
    
    const addedMins = Math.round(this.timerState.initial / 60);
    this.dailyMinutes += addedMins;
    localStorage.setItem('roitx_study_mins', this.dailyMinutes);
    this.updateStatsUI();

    if (this.els.modal) this.els.modal.style.display = 'flex';

    if (Notification.permission === 'granted') {
      new Notification('Session Complete! 🎉', {
        body: `Aapne ${addedMins} minutes ka focus session successfully poora kar liya hai.`,
        icon: 'study.png'
      });
    }
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
      this.updateStopwatchDisplay();
      this.stopwatchState.rafId = requestAnimationFrame(update);
    };
    this.stopwatchState.rafId = requestAnimationFrame(update);
  }

  stopStopwatch() {
    this.stopwatchState.running = false;
    if (this.stopwatchState.rafId) cancelAnimationFrame(this.stopwatchState.rafId);
  }

  resetStopwatch() {
    this.stopStopwatch();
    this.stopwatchState.elapsed = 0;
    this.updateStopwatchDisplay();
    if (this.els.lapsContainer) this.els.lapsContainer.innerHTML = '';
  }

  lapStopwatch() {
    if (!this.stopwatchState.running || !this.els.lapsContainer) return;
    const li = document.createElement('li');
    li.style.cssText = "padding:6px 12px; border-bottom:1px solid #334155; font-family:monospace; font-size:0.9rem;";
    li.textContent = `Lap ${this.els.lapsContainer.children.length + 1}: ${this.formatStopwatch(this.stopwatchState.elapsed)}`;
    this.els.lapsContainer.prepend(li);
  }

  updateStopwatchDisplay() {
    const formatted = this.formatStopwatch(this.stopwatchState.elapsed);
    if (this.els.swDisplay) this.els.swDisplay.innerHTML = formatted;

    const widgetSwDisp = document.getElementById('widgetSwDisp');
    if (widgetSwDisp) widgetSwDisp.textContent = this.formatTime(Math.floor(this.stopwatchState.elapsed / 1000));
  }

  formatStopwatch(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}<span class="ms-display">.${String(milliseconds).padStart(2, '0')}</span>`;
  }

  // ==========================================
  // AUDIO VISUALIZER ENGINE
  // ==========================================
  
  initVisualizer() {
    if (!this.els.visualizerCanvas || !this.els.customAudio) return;
    
    const canvas = this.els.visualizerCanvas;
    const ctx = canvas.getContext('2d');

    const setupContext = () => {
      if (this.vizAudioCtx) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.vizAudioCtx = new AudioCtx();
        this.vizAnalyser = this.vizAudioCtx.createAnalyser();
        this.vizSource = this.vizAudioCtx.createMediaElementSource(this.els.customAudio);

        this.vizSource.connect(this.vizAnalyser);
        this.vizAnalyser.connect(this.vizAudioCtx.destination);

        this.vizAnalyser.fftSize = 64;
      } catch (e) {
        console.warn("Visualizer audio context binding error:", e);
      }
    };

    this.els.customAudio.addEventListener('play', () => {
      setupContext();
      if (this.vizAudioCtx && this.vizAudioCtx.state === 'suspended') {
        this.vizAudioCtx.resume();
      }
      renderFrame();
    });

    const renderFrame = () => {
      if (!this.vizAnalyser) return;
      const bufferLength = this.vizAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      this.vizAnalyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgb(56, 189, 248)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
      }

      if (this.isPlayingMusic) {
        requestAnimationFrame(renderFrame);
      }
    };
  }

  // ==========================================
  // BINAURAL BEATS & WHITE NOISE SOUNDS
  // ==========================================
  
  playBrainwave(type, targetFreq) {
    this.stopBrainwave();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.brainwaveCtx = new AudioCtx();

      const baseFreq = 200;
      const merger = this.brainwaveCtx.createChannelMerger(2);

      this.waveOscLeft = this.brainwaveCtx.createOscillator();
      this.waveOscRight = this.brainwaveCtx.createOscillator();

      this.waveOscLeft.frequency.value = baseFreq;
      this.waveOscRight.frequency.value = baseFreq + targetFreq;

      this.waveOscLeft.connect(merger, 0, 0);
      this.waveOscRight.connect(merger, 0, 1);

      merger.connect(this.brainwaveCtx.destination);

      this.waveOscLeft.start();
      this.waveOscRight.start();

      if (this.els.waveDesc) {
        this.els.waveDesc.textContent = `Playing ${type.toUpperCase()} Waves (${targetFreq}Hz). Headphone zaroori hain!`;
      }
    } catch (e) {
      alert("Audio Synth initialization failed.");
    }
  }

  stopBrainwave() {
    if (this.waveOscLeft) { this.waveOscLeft.stop(); this.waveOscLeft.disconnect(); }
    if (this.waveOscRight) { this.waveOscRight.stop(); this.waveOscRight.disconnect(); }
    if (this.brainwaveCtx) { this.brainwaveCtx.close(); this.brainwaveCtx = null; }
    if (this.els.waveDesc) {
      this.els.waveDesc.textContent = "Select a frequency to generate Binaural Beats. (Requires Headphones)";
    }
  }

  toggleAmbient(e) {
    const btn = e.target;
    if (this.noiseNode) {
      this.noiseNode.stop();
      this.noiseNode.disconnect();
      this.noiseNode = null;
      btn.classList.remove('active-toggle');
    } else {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = this.audioCtx || new AudioCtx();

        const bufferSize = this.audioCtx.sampleRate * 2;
        const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        this.noiseNode = this.audioCtx.createBufferSource();
        this.noiseNode.buffer = noiseBuffer;
        this.noiseNode.loop = true;

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 0.05; // Gentle White Noise

        this.noiseNode.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        this.noiseNode.start();
        btn.classList.add('active-toggle');
      } catch (err) {
        alert("Audio Noise generator fail ho gaya.");
      }
    }
  }

  // ==========================================
  // TASK MANAGER & HELPERS
  // ==========================================
  
  addTask() {
    if (!this.els.taskInput) return;
    const text = this.els.taskInput.value.trim();
    if (!text) return;

    const tasks = JSON.parse(localStorage.getItem('roitx_tasks') || '[]');
    tasks.push({ id: Date.now(), text, done: false });
    localStorage.setItem('roitx_tasks', JSON.stringify(tasks));

    this.els.taskInput.value = '';
    this.renderTasks(tasks);
  }

  loadTasks() {
    const tasks = JSON.parse(localStorage.getItem('roitx_tasks') || '[]');
    this.renderTasks(tasks);
  }

  renderTasks(tasks) {
    if (!this.els.taskList) return;
    this.els.taskList.innerHTML = '';

    tasks.forEach(t => {
      const li = document.createElement('li');
      li.className = `task-item ${t.done ? 'done' : ''}`;
      li.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${t.done ? 'checked' : ''}>
        <span>${this.escapeHTML(t.text)}</span>
        <button class="delete-btn">&times;</button>
      `;

      li.querySelector('.task-checkbox').addEventListener('change', (e) => {
        t.done = e.target.checked;
        localStorage.setItem('roitx_tasks', JSON.stringify(tasks));
        li.classList.toggle('done', t.done);
      });

      li.querySelector('.delete-btn').addEventListener('click', () => {
        const updated = tasks.filter(item => item.id !== t.id);
        localStorage.setItem('roitx_tasks', JSON.stringify(updated));
        this.renderTasks(updated);
      });

      this.els.taskList.appendChild(li);
    });
  }

  toggleFocus(e) {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      e.target.classList.add('active-toggle');
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      e.target.classList.remove('active-toggle');
    }
  }

  playNotificationSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {}
  }

  startLiveClock() {
    const update = () => {
      const clockEl = document.getElementById('liveClock');
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    };
    update();
    setInterval(update, 1000);
  }

  updateStatsUI() {
    if (this.els.dailyStats) {
      this.els.dailyStats.textContent = `${this.dailyMinutes} mins focused today`;
    }
  }

  initHardwareAPIs() {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        const updateBat = () => {
          if (this.els.batteryLvl) {
            this.els.batteryLvl.textContent = `${Math.round(battery.level * 100)}%`;
          }
        };
        updateBat();
        battery.addEventListener('levelchange', updateBat);
      }).catch(() => {
        if (this.els.batteryLvl) this.els.batteryLvl.textContent = "N/A";
      });
    }

    const updateNet = () => {
      if (this.els.netStatus) {
        this.els.netStatus.textContent = navigator.onLine ? "Online" : "Offline";
      }
    };
    window.addEventListener('online', updateNet);
    window.addEventListener('offline', updateNet);
    updateNet();
  }

  requestNotificationPerm() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  closeModal() {
    if (this.els.modal) this.els.modal.style.display = 'none';
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
}

// Instantiate Engine on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  window.roitxEngine = new ProductivityEngine();
});
