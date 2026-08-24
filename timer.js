"use strict";

/**
 * ROITX SUITE PRO - FULL ENGINE SCRIPT
 */
class ProductivityEngine {
  constructor() {
    this.timerState = { remaining: 40 * 60, intervalId: null, initial: 40 * 60 };
    this.stopwatchState = { running: false, start: 0, elapsed: 0, rafId: null, laps: [] };
    this.dailyMinutes = Number(localStorage.getItem('roitx_study_mins')) || 0;
    
    // Audio Contexts
    this.audioCtx = null;
    this.noiseNode = null;
    this.brainwaveCtx = null;
    this.waveOscLeft = null;
    this.waveOscRight = null;
    this.activeWaveFreq = 0;

    // Advanced Visualizer State
    this.vizAudioCtx = null;
    this.vizAnalyser = null;
    this.vizSource = null;
    this.currentTrackName = "No Track Playing";
    this.isPlayingMusic = false;

    // Torch / Flash State
    this.flashTrack = null;
    this.isFlashOn = false;

    // Cross-Page Widget Tracking
    this.activeWidgetType = localStorage.getItem('roitx_widget_type') || null;
    this.widgetClockInterval = null;
    
    this.init();
  }

  init() {
    this.bindElements();
    this.attachEventListeners();
    this.preventLongTap();
    this.startLiveClock();
    this.updateStatsUI();
    this.initHardwareAPIs();
    this.requestNotificationPerm();
    this.loadTasks();
    this.applyTheme(localStorage.getItem('roitx_theme') || 'dark');
    
    if (this.els.timerDisplay) {
      this.els.timerDisplay.textContent = this.formatTime(this.timerState.remaining);
    }
    
    this.setupLauncherEvents();
    this.initVisualizer();
    this.restoreGlobalWidgetState();
  }

  preventLongTap() {
    document.querySelectorAll('button, .day, .global-roitx-widget').forEach(el => {
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  setupLauncherEvents() {
    const launcher = document.getElementById('roitxLauncher');
    if (!launcher) return;

    let isTouchActive = false;

    launcher.addEventListener('touchstart', (e) => {
      isTouchActive = true;
      e.preventDefault();
      this.toggleSelectionMenu();
    }, { passive: false });

    launcher.addEventListener('click', () => {
      if (isTouchActive) {
        isTouchActive = false;
        return;
      }
      this.toggleSelectionMenu();
    });

    this.makeElementDraggable(launcher, null);
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
    document.getElementById('btnPomodoro')?.addEventListener('click', () => this.setTimer(40));
    document.getElementById('btnShortBreak')?.addEventListener('click', () => this.setTimer(5));
    document.getElementById('btnCubeBreak')?.addEventListener('click', () => this.setTimer(3));

    // Flashlight ⚡ Toggle
    const flashBtn = document.getElementById('btnFlash') || document.getElementById('btnTorch');
    flashBtn?.addEventListener('click', () => this.toggleFlashlight());

    document.getElementById('btnSetCustomMin')?.addEventListener('click', () => {
      if (this.els.customMinInput) {
        const val = parseInt(this.els.customMinInput.value.trim());
        if (val && val > 0 && val <= 180) {
          this.setTimer(val);
        } else {
          alert("Kripya 1 se 180 minutes enter karein.");
        }
      }
    });

    document.getElementById('btnStartTimer')?.addEventListener('click', () => this.startTimer());
    document.getElementById('btnPauseTimer')?.addEventListener('click', () => this.pauseTimer());
    document.getElementById('btnResetTimer')?.addEventListener('click', () => this.resetTimer());

    document.getElementById('btnSwStart')?.addEventListener('click', () => this.startStopwatch());
    document.getElementById('btnSwStop')?.addEventListener('click', () => this.stopStopwatch());
    document.getElementById('btnSwLap')?.addEventListener('click', () => this.lapStopwatch());
    document.getElementById('btnSwReset')?.addEventListener('click', () => this.resetStopwatch());

    // Local Music File Selection
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

        this.setupAudioContextForVisualizer();
        this.els.customAudio?.play().catch(() => {});
      });
    }

    // Audio Link Stream
    document.getElementById('btnLoadAudio')?.addEventListener('click', () => {
      const inputVal = this.els.audioUrlInput?.value.trim();
      if (!inputVal) return;

      const ytMatch = inputVal.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      let container = document.getElementById('ytPlayerContainer');

      if (ytMatch && ytMatch[1]) {
        const videoId = ytMatch[1];
        if (this.els.customAudio) {
          this.els.customAudio.pause();
          this.els.customAudio.style.display = 'none';
        }
        if (container) {
          container.innerHTML = `
            <iframe width="100%" height="200" 
              src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1" 
              title="Roitx Music Player" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen 
              style="border-radius:12px; border:1px solid var(--accent-primary, #38bdf8); margin-top:10px;">
            </iframe>`;
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
          
          this.currentTrackName = inputVal.split('/').pop().split('?')[0] || "Web Audio Track";
          this.isPlayingMusic = true;
          this.updateWidgetMusicUI();

          this.setupAudioContextForVisualizer();
          this.els.customAudio.play().catch(() => {
            alert("Audio Link Stream nahi kiya ja saka!");
          });
        }
      }
    });

    if (this.els.customAudio) {
      this.els.customAudio.addEventListener('pause', () => {
        this.isPlayingMusic = false;
        this.updateWidgetMusicUI();
      });
      this.els.customAudio.addEventListener('play', () => {
        this.isPlayingMusic = true;
        this.setupAudioContextForVisualizer();
        this.updateWidgetMusicUI();
      });
    }

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

    document.getElementById('btnTaskAdd')?.addEventListener('click', () => this.addTask());
    document.getElementById('btnFocus')?.addEventListener('click', (e) => this.toggleFocus(e));
    document.getElementById('btnAmbient')?.addEventListener('click', (e) => this.toggleAmbient(e));
    
    const modalClose = document.getElementById('btnCloseModal');
    if (modalClose) modalClose.addEventListener('click', () => this.closeModal());
  }

  // Camera Torch Toggle ⚡
  async toggleFlashlight() {
    const flashBtn = document.getElementById('btnFlash') || document.getElementById('btnTorch');
    try {
      if (this.isFlashOn && this.flashTrack) {
        await this.flashTrack.applyConstraints({ advanced: [{ torch: false }] });
        this.flashTrack.stop();
        this.flashTrack = null;
        this.isFlashOn = false;
        flashBtn?.classList.remove('active-toggle');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};

      if (capabilities.torch) {
        await track.applyConstraints({ advanced: [{ torch: true }] });
        this.flashTrack = track;
        this.isFlashOn = true;
        flashBtn?.classList.add('active-toggle');
      } else {
        alert("Mobile Hardware Torch API support nahi kar raha hai.");
        track.stop();
      }
    } catch (err) {
      alert("Flashlight access denied ya mobile me supported nahi hai.");
    }
  }

  setupAudioContextForVisualizer() {
    if (this.vizSource || !this.els.customAudio) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.vizAudioCtx = new AudioCtx();
      this.vizAnalyser = this.vizAudioCtx.createAnalyser();
      this.vizSource = this.vizAudioCtx.createMediaElementSource(this.els.customAudio);

      this.vizSource.connect(this.vizAnalyser);
      this.vizAnalyser.connect(this.vizAudioCtx.destination);
      this.vizAnalyser.fftSize = 64;
    } catch (e) {}
  }

  initVisualizer() {
    if (!this.els.visualizerCanvas) return;
    
    const canvas = this.els.visualizerCanvas;
    const ctx = canvas.getContext('2d');

    const renderFrame = () => {
      requestAnimationFrame(renderFrame);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let bufferLength = 32;
      let dataArray = new Uint8Array(bufferLength);

      if (this.vizAudioCtx && this.vizAudioCtx.state === 'suspended' && this.isPlayingMusic) {
        this.vizAudioCtx.resume();
      }

      // Priority 1: Real Local Music Data
      if (this.vizAnalyser && this.isPlayingMusic) {
        this.vizAnalyser.getByteFrequencyData(dataArray);
      } 
      // Priority 2: Dynamic Wave sync when Brainwave is Active
      else if (this.activeWaveFreq > 0) {
        for (let i = 0; i < bufferLength; i++) {
          const wavePulse = Math.sin(Date.now() * (this.activeWaveFreq * 0.002) + i * 0.4);
          dataArray[i] = Math.abs(wavePulse) * 160 + 20;
        }
      } 
      // Default / Idle Mode
      else {
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.abs(Math.sin(Date.now() * 0.003 + i * 0.2)) * 30 + 5;
        }
      }

      const barWidth = (canvas.width / bufferLength) * 1.8;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const audioIntensity = dataArray[i] / 255;
        const barHeight = audioIntensity * canvas.height * 0.9 + 4;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        
        if (this.isPlayingMusic) {
          gradient.addColorStop(0, '#ff007f');
          gradient.addColorStop(0.5, '#7000ff');
          gradient.addColorStop(1, '#00f6ff');
        } else if (this.activeWaveFreq > 0) {
          gradient.addColorStop(0, '#00f6ff');
          gradient.addColorStop(1, '#10b981');
        } else {
          gradient.addColorStop(0, '#38bdf8');
          gradient.addColorStop(1, '#0284c7');
        }

        ctx.fillStyle = gradient;
        ctx.shadowColor = audioIntensity > 0.4 ? '#00f6ff' : 'transparent';
        ctx.shadowBlur = audioIntensity * 12;

        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 3;
      }
    };

    renderFrame();
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
      position: fixed; bottom: 95px; right: 20px; z-index: 1000000;
      background: #0f172a; color: #ffffff; padding: 12px; border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6); border: 1px solid #334155;
      display: flex; flex-direction: column; gap: 8px; width: 210px;
      font-family: system-ui, -apple-system, sans-serif; font-size: 14px;
    `;

    menu.innerHTML = `
      <div style="font-weight: bold; color: #94a3b8; font-size: 11px; text-transform: uppercase;">Global Widgets</div>
      <button id="optTimer" style="background:#1e293b; color:#fff; border:1px solid #334155; padding:8px; border-radius:6px; cursor:pointer; text-align:left;">⏱️ Focus Timer</button>
      <button id="optSw" style="background:#1e293b; color:#fff; border:1px solid #334155; padding:8px; border-radius:6px; cursor:pointer; text-align:left;">⏱️ Stopwatch</button>
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

  restoreGlobalWidgetState() {
    const savedType = localStorage.getItem('roitx_widget_type');
    const isClosed = localStorage.getItem('roitx_widget_closed') === 'true';

    if (savedType && !isClosed) {
      this.launchWidget(savedType, true);
    }
  }

  launchWidget(type, isRestoring = false) {
    let widget = document.getElementById('floatingWidget');
    const launcher = document.getElementById('roitxLauncher');

    if (!widget) {
      widget = document.createElement('div');
      widget.id = 'floatingWidget';
      widget.className = 'global-roitx-widget';
      document.body.appendChild(widget);
    }

    this.activeWidgetType = type;
    localStorage.setItem('roitx_widget_type', type);
    localStorage.setItem('roitx_widget_closed', 'false');

    if (launcher) launcher.style.display = 'none';
    widget.style.display = 'block';

    const savedPos = JSON.parse(localStorage.getItem('roitx_widget_pos') || '{"top":"80px","left":"20px"}');
    widget.style.top = savedPos.top;
    widget.style.left = savedPos.left;

    if (this.widgetClockInterval) clearInterval(this.widgetClockInterval);

    let titleText = type === 'stopwatch' ? 'Stopwatch' : (type === 'clock' ? 'Clock' : 'Timer');

    widget.innerHTML = `
      <div id="widgetDragHandle" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:8px; margin-bottom:10px; cursor:move;">
        <span style="font-weight:bold; font-size: 0.85rem; color:#38bdf8; user-select:none;">🚀 Roitx ${titleText}</span>
        <button id="btnWidgetClose" style="background:transparent; border:none; color:#94a3b8; font-size:16px; cursor:pointer; padding:0 4px;">✕</button>
      </div>
      <div id="widgetBody" style="text-align:center;"></div>
      
      <div style="margin-top:12px; padding-top:8px; border-top:1px solid #334155; display:flex; align-items:center; justify-content:space-between; font-size:0.75rem; color:#94a3b8;">
        <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:140px;" id="wTrackName">🎵 ${this.currentTrackName}</div>
        <div id="wWaveBox" class="${this.isPlayingMusic ? 'wave-active' : ''}" style="display:flex; gap:2px; align-items:flex-end; height:16px;">
          <div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div>
        </div>
      </div>
    `;

    this.makeElementDraggable(widget, widget.querySelector('#widgetDragHandle'));

    const body = widget.querySelector('#widgetBody');

    document.getElementById('btnWidgetClose').addEventListener('click', () => {
      widget.style.display = 'none';
      if (launcher) launcher.style.display = 'flex';
      if (this.widgetClockInterval) clearInterval(this.widgetClockInterval);
      this.activeWidgetType = null;
      localStorage.setItem('roitx_widget_closed', 'true');
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
        <div id="widgetSwDisp" style="font-size:1.8rem; font-weight:bold; margin-bottom:10px; font-family:monospace;">${this.formatStopwatchRaw(this.stopwatchState.elapsed)}</div>
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

  makeElementDraggable(element, handleTarget = null) {
    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    const handle = handleTarget || element;

    const onStart = (clientX, clientY) => {
      isDragging = true;
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

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxLeft = window.innerWidth - element.offsetWidth - 10;
      const maxTop = window.innerHeight - element.offsetHeight - 10;

      const leftPx = `${Math.max(10, Math.min(newLeft, maxLeft))}px`;
      const topPx = `${Math.max(10, Math.min(newTop, maxTop))}px`;

      element.style.left = leftPx;
      element.style.top = topPx;
      element.style.right = 'auto';
      element.style.bottom = 'auto';

      if (element.id === 'floatingWidget') {
        localStorage.setItem('roitx_widget_pos', JSON.stringify({ top: topPx, left: leftPx }));
      }
    };

    const onEnd = () => { isDragging = false; };

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

    handle.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
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

  playBrainwave(type, targetFreq) {
    this.stopBrainwave();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.brainwaveCtx = new AudioCtx();

      const baseFreq = 200;
      this.activeWaveFreq = targetFreq;

      const merger = this.brainwaveCtx.createChannelMerger(2);

      this.waveOscLeft = this.brainwaveCtx.createOscillator();
      this.waveOscRight = this.brainwaveCtx.createOscillator();

      this.waveOscLeft.frequency.value = baseFreq;
      this.waveOscRight.frequency.value = baseFreq + targetFreq;

      const gainNode = this.brainwaveCtx.createGain();
      gainNode.gain.value = 0.18;

      this.waveOscLeft.connect(merger, 0, 0);
      this.waveOscRight.connect(merger, 0, 1);
      merger.connect(gainNode);
      gainNode.connect(this.brainwaveCtx.destination);

      this.waveOscLeft.start();
      this.waveOscRight.start();

      if (this.els.waveDesc) {
        this.els.waveDesc.textContent = `Playing ${type.toUpperCase()} Beats (${targetFreq}Hz). Dynamic Brainwaves Active!`;
      }
    } catch (e) {}
  }

  stopBrainwave() {
    this.activeWaveFreq = 0;
    if (this.waveOscLeft) { this.waveOscLeft.stop(); this.waveOscLeft.disconnect(); }
    if (this.waveOscRight) { this.waveOscRight.stop(); this.waveOscRight.disconnect(); }
    if (this.brainwaveCtx) { this.brainwaveCtx.close(); this.brainwaveCtx = null; }
    if (this.els.waveDesc) {
      this.els.waveDesc.textContent = "Select a frequency to generate Binaural Beats. (Works alongside YouTube & Local Player)";
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
        gainNode.gain.value = 0.05;

        this.noiseNode.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        this.noiseNode.start();
        btn.classList.add('active-toggle');
      } catch (err) {}
    }
  }

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
    this.stopwatchState.laps = [];
    this.updateStopwatchDisplay();
    if (this.els.lapsContainer) this.els.lapsContainer.innerHTML = '';
  }

  lapStopwatch() {
    if (!this.stopwatchState.running || !this.els.lapsContainer) return;
    
    const lapTimeFormatted = this.formatStopwatchRaw(this.stopwatchState.elapsed);
    this.stopwatchState.laps.unshift(lapTimeFormatted);

    const card = document.createElement('div');
    card.className = 'lap-badge-card';
    card.innerHTML = `
      <span class="lap-title">Lap ${this.stopwatchState.laps.length}</span>
      <span class="lap-time">${lapTimeFormatted}</span>
    `;

    this.els.lapsContainer.prepend(card);
  }

  updateStopwatchDisplay() {
    const formatted = this.formatStopwatch(this.stopwatchState.elapsed);
    if (this.els.swDisplay) this.els.swDisplay.innerHTML = formatted;

    const widgetSwDisp = document.getElementById('widgetSwDisp');
    if (widgetSwDisp) widgetSwDisp.textContent = this.formatStopwatchRaw(this.stopwatchState.elapsed);
  }

  formatStopwatch(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}<span class="ms-display">.${String(milliseconds).padStart(2, '0')}</span>`;
  }

  formatStopwatchRaw(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
  }

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
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);

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

document.addEventListener('DOMContentLoaded', () => {
  window.roitxEngine = new ProductivityEngine();
});
