"use strict";

/**
 * ROITX SUITE PRO - MASTER ENGINE SCRIPT
 */
class ProductivityEngine {
  constructor() {
    this.timerState = { remaining: 40 * 60, intervalId: null, initial: 40 * 60, isPaused: false, isRunning: false };
    this.stopwatchState = { running: false, start: 0, elapsed: 0, rafId: null, laps: [] };
    this.dailyMinutes = Number(localStorage.getItem('roitx_study_mins')) || 0;
    
    // Audio & Brainwaves
    this.audioCtx = null;
    this.noiseNode = null;
    this.brainwaveCtx = null;
    this.waveOscLeft = null;
    this.waveOscRight = null;
    this.activeWaveFreq = 0;

    // Visualizer & Player State
    this.vizAudioCtx = null;
    this.vizAnalyser = null;
    this.vizSource = null;
    this.isPlayingMusic = false;
    this.ytPlayer = null;
    this.isYtReady = false;
    this.audioSourceType = null;
    
    this.searchDebounceTimer = null;

    this.init();
  }

  init() {
    this.bindElements();
    this.attachEventListeners();
    this.startLiveClock();
    this.updateStatsUI();
    this.initHardwareAPIs();
    this.loadTasks();
    this.applyTheme(localStorage.getItem('roitx_theme') || 'dark');
    this.setupYouTubeAPI();
    
    if (this.els.timerDisplay) {
      this.els.timerDisplay.textContent = this.formatTime(this.timerState.remaining);
    }
    
    this.initVisualizer();
  }

  bindElements() {
    this.els = {
      timerDisplay: document.getElementById('timerDisplay'),
      btnStartTimer: document.getElementById('btnStartTimer'),
      customMinInput: document.getElementById('customMinInput'),
      swDisplay: document.getElementById('stopwatchDisplay'),
      btnSwStart: document.getElementById('btnSwStart'),
      lapsContainer: document.getElementById('lapsList'),
      dailyStats: document.getElementById('dailyStats'),
      taskInput: document.getElementById('taskInput'),
      taskList: document.getElementById('taskList'),
      modal: document.getElementById('sessionModal'),
      waveDesc: document.getElementById('waveDesc'),
      waveBenefitsCard: document.getElementById('waveBenefitsCard'),
      activeWaveTitle: document.getElementById('activeWaveTitle'),
      activeWaveDesc: document.getElementById('activeWaveDesc'),
      customAudio: document.getElementById('customAudio'),
      directAudioUrlInput: document.getElementById('directAudioUrlInput'),
      audioUrlInput: document.getElementById('audioUrlInput'),
      audioFileInput: document.getElementById('audioFileInput'),
      ytSuggestions: document.getElementById('ytSuggestions'),
      trackTitle: document.getElementById('trackTitle'),
      batteryLvl: document.getElementById('batteryLvl'),
      netStatus: document.getElementById('netStatus'),
      visualizerCanvas: document.getElementById('visualizer'),
      themeDrawer: document.getElementById('themeMenuModal'),
      aodOverlay: document.getElementById('aodOverlay'),
      aodAmPm: document.getElementById('aodAmPm'),
      flipHours: document.getElementById('flipHours'),
      flipMinutes: document.getElementById('flipMinutes'),
      aodDateText: document.getElementById('aodDateText'),
      aodTimerText: document.getElementById('aodTimerText'),
      aodSwText: document.getElementById('aodSwText'),
      zenOverlay: document.getElementById('zenOverlay'),
      zenDisplayText: document.getElementById('zenDisplayText'),
      zenSubText: document.getElementById('zenSubText')
    };
  }

  attachEventListeners() {
    document.getElementById('btnPomodoro')?.addEventListener('click', () => this.setTimer(40));
    document.getElementById('btnShortBreak')?.addEventListener('click', () => this.setTimer(5));
    document.getElementById('btnCubeBreak')?.addEventListener('click', () => this.setTimer(3));

    // Theme Drawer Toggle
    document.getElementById('btnSettingsToggle')?.addEventListener('click', () => {
      if (this.els.themeDrawer) {
        const isHidden = getComputedStyle(this.els.themeDrawer).display === 'none';
        this.els.themeDrawer.style.display = isHidden ? 'block' : 'none';
      }
    });

    document.getElementById('btnCloseThemeDrawer')?.addEventListener('click', () => {
      if (this.els.themeDrawer) this.els.themeDrawer.style.display = 'none';
    });

    document.querySelectorAll('.btnTheme[data-theme]').forEach(b => {
      b.addEventListener('click', (e) => {
        this.applyTheme(e.currentTarget.dataset.theme);
        if (this.els.themeDrawer) this.els.themeDrawer.style.display = 'none';
      });
    });

    // AOD & Fullscreen Controls
    document.getElementById('btnOpenAOD')?.addEventListener('click', () => {
      if (this.els.aodOverlay) this.els.aodOverlay.style.display = 'flex';
      if (this.els.themeDrawer) this.els.themeDrawer.style.display = 'none';
    });

    document.getElementById('btnCloseAOD')?.addEventListener('click', () => {
      if (this.els.aodOverlay) this.els.aodOverlay.style.display = 'none';
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    });

    document.getElementById('btnAodFullscreen')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        if (this.els.aodOverlay?.requestFullscreen) {
          this.els.aodOverlay.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      }
    });

    document.querySelectorAll('.aod-tab[data-aod]').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.aod-tab[data-aod]').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.aod-view').forEach(v => v.classList.remove('active'));
        
        e.currentTarget.classList.add('active');
        const viewMode = e.currentTarget.dataset.aod;
        if (viewMode === 'clock') document.getElementById('aodClockView')?.classList.add('active');
        if (viewMode === 'timer') document.getElementById('aodTimerView')?.classList.add('active');
        if (viewMode === 'stopwatch') document.getElementById('aodStopwatchView')?.classList.add('active');
      });
    });

    // AOD Direct Actions
    document.getElementById('btnAodTimerToggle')?.addEventListener('click', () => this.toggleTimerState());
    document.getElementById('btnAodTimerReset')?.addEventListener('click', () => this.resetTimer());
    document.getElementById('btnAodSwToggle')?.addEventListener('click', () => {
      if (!this.stopwatchState.running) this.startStopwatch(); else this.stopStopwatch();
    });
    document.getElementById('btnAodSwReset')?.addEventListener('click', () => this.resetStopwatch());

    // Zen Mode Controls
    document.getElementById('btnZenMode')?.addEventListener('click', () => {
      if (this.els.zenOverlay) this.els.zenOverlay.style.display = 'flex';
    });

    this.els.zenOverlay?.addEventListener('click', () => {
      if (this.els.zenOverlay) this.els.zenOverlay.style.display = 'none';
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.els.zenOverlay && this.els.zenOverlay.style.display === 'flex') {
        this.els.zenOverlay.style.display = 'none';
      }
    });

    document.getElementById('btnSetCustomMin')?.addEventListener('click', () => {
      if (this.els.customMinInput) {
        const val = parseInt(this.els.customMinInput.value.trim(), 10);
        if (val && val > 0 && val <= 180) {
          this.setTimer(val);
        } else {
          alert("Kripya 1 se 180 minutes enter karein.");
        }
      }
    });

    // Timer Controls
    this.els.btnStartTimer?.addEventListener('click', () => this.toggleTimerState());
    document.getElementById('btnResetTimer')?.addEventListener('click', () => this.resetTimer());

    // Stopwatch Controls
    this.els.btnSwStart?.addEventListener('click', () => {
      if (!this.stopwatchState.running) {
        this.startStopwatch();
      } else {
        this.stopStopwatch();
      }
    });
    document.getElementById('btnSwLap')?.addEventListener('click', () => this.lapStopwatch());
    document.getElementById('btnSwReset')?.addEventListener('click', () => this.resetStopwatch());

    // Audio File Upload
    if (this.els.audioFileInput) {
      this.els.audioFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        this.stopYtMusic();
        
        const fileURL = URL.createObjectURL(file);
        if (this.els.customAudio) {
          this.els.customAudio.src = fileURL;
          this.els.customAudio.load();
        }
        this.audioSourceType = 'local';
        this.isPlayingMusic = true;
        if (this.els.trackTitle) this.els.trackTitle.textContent = `🎵 Local Track: ${file.name}`;
        this.setupAudioContextForVisualizer();
        this.els.customAudio?.play().catch(() => {});
      });
    }

    // Direct Stream Support
    document.getElementById('btnLoadDirectAudio')?.addEventListener('click', () => {
      const url = this.els.directAudioUrlInput?.value.trim();
      if (!url) return;
      this.stopYtMusic();

      if (this.els.customAudio) {
        this.els.customAudio.src = url;
        this.els.customAudio.load();
      }
      this.audioSourceType = 'local';
      this.isPlayingMusic = true;
      if (this.els.trackTitle) this.els.trackTitle.textContent = `🌐 Stream: ${url.split('/').pop() || 'Audio Link'}`;
      this.setupAudioContextForVisualizer();
      this.els.customAudio?.play().catch(() => alert("Could not play audio. Check URL format."));
    });

    // YouTube Live Suggestions
    if (this.els.audioUrlInput) {
      this.els.audioUrlInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(this.searchDebounceTimer);
        
        if (query.length < 2 || /^https?:\/\//.test(query)) {
          if (this.els.ytSuggestions) this.els.ytSuggestions.style.display = 'none';
          return;
        }

        this.searchDebounceTimer = setTimeout(() => {
          this.fetchYTSuggestions(query);
        }, 300);
      });
    }

    document.getElementById('btnLoadAudio')?.addEventListener('click', () => {
      const inputVal = this.els.audioUrlInput?.value.trim();
      if (!inputVal) return;
      this.loadYtAudioOnly(inputVal);
    });

    document.getElementById('btnPlayPauseMusic')?.addEventListener('click', () => this.toggleMusicPlayPause());
    document.getElementById('btnStopMusic')?.addEventListener('click', () => this.stopAllMusic());

    document.querySelectorAll('.wave-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active-toggle'));
        e.currentTarget.classList.add('active-toggle');
        this.playBrainwave(e.currentTarget.dataset.wave, Number(e.currentTarget.dataset.freq));
      });
    });
    
    document.getElementById('btnStopWave')?.addEventListener('click', () => {
      document.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active-toggle'));
      this.stopBrainwave();
    });

    document.getElementById('btnTaskAdd')?.addEventListener('click', () => this.addTask());
    this.els.taskInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addTask();
    });

    document.getElementById('btnFocus')?.addEventListener('click', (e) => this.toggleFocus(e));
    document.getElementById('btnAmbient')?.addEventListener('click', (e) => this.toggleAmbient(e));
    
    document.getElementById('btnCloseModal')?.addEventListener('click', () => this.closeModal());
  }

  toggleTimerState() {
    if (!this.timerState.isRunning) {
      this.startTimer();
    } else if (this.timerState.isRunning && !this.timerState.isPaused) {
      this.pauseTimer();
    } else if (this.timerState.isPaused) {
      this.resumeTimer();
    }
  }

/* YOUTUBE EMBED API INTEGRATION - FIXED */
setupYouTubeAPI() {
  window.onYouTubeIframeAPIReady = () => {
    this.ytPlayer = new YT.Player('ytHiddenPlayerContainer', {
      height: '0',
      width: '0',
      // Standard host domain for seamless postMessage iframe communication
      host: 'https://www.youtube.com',
      playerVars: {
        'autoplay': 1,
        'controls': 0,
        'enablejsapi': 1,
        'origin': window.location.origin
      },
      events: {
        'onReady': (event) => { 
          this.isYtReady = true; 
        },
        'onStateChange': (e) => {
          if (e.data === YT.PlayerState.PLAYING) {
            this.isPlayingMusic = true;
          } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
            this.isPlayingMusic = false;
          }
        },
        'onError': (e) => {
          console.warn('YouTube Player Error:', e.data);
        }
      }
    });
  };
}

loadYtAudioOnly(inputVal) {
  if (this.els.ytSuggestions) this.els.ytSuggestions.style.display = 'none';
  if (this.els.customAudio) this.els.customAudio.pause();

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = inputVal.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;

  this.audioSourceType = 'yt';

  if (!this.ytPlayer || !this.isYtReady) {
    alert("YouTube Player abhi load ho raha hai. 2 second baad dobara try karein.");
    return;
  }

  if (videoId) {
    this.ytPlayer.loadVideoById(videoId);
    if (this.els.trackTitle) this.els.trackTitle.textContent = `▶️ YT Track ID: ${videoId}`;
  } else {
    // Search & Play single video query instead of playlist listType search error
    this.ytPlayer.loadPlaylist({
      listType: 'search',
      list: inputVal,
      index: 0
    });
    if (this.els.trackTitle) this.els.trackTitle.textContent = `🔍 YT Playing: ${inputVal}`;
  }
  this.isPlayingMusic = true;
}

/* YOUTUBE SUGGESTIONS SEARCH - FIXED & ENHANCED */
/* YOUTUBE SUGGESTIONS SEARCH - SAFE & FIXED */
fetchYTSuggestions(query) {
  const oldScript = document.getElementById('yt-suggestion-script');
  if (oldScript) oldScript.remove();

  window.handleYTSugg = (data) => {
    // Safety check added using optional chaining
    if (!data?.[1] || !this.els?.ytSuggestions) return;
    
    const suggestions = data[1].slice(0, 5);
    this.els.ytSuggestions.innerHTML = '';
    
    if (suggestions.length === 0) {
      this.els.ytSuggestions.style.display = 'none';
      return;
    }

    suggestions.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item[0];
      li.onmousedown = (e) => {
        e.preventDefault();
        if (this.els.audioUrlInput) this.els.audioUrlInput.value = item[0];
        if (this.els.ytSuggestions) this.els.ytSuggestions.style.display = 'none';
        this.loadYtAudioOnly(item[0]);
      };
      this.els.ytSuggestions.appendChild(li);
    });
    this.els.ytSuggestions.style.display = 'block';
  };

  const script = document.createElement('script');
  script.id = 'yt-suggestion-script';
  script.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}&jsonp=handleYTSugg`;
  script.onerror = () => {
    // If script is blocked by AdBlocker/Extension
    if (this.els?.ytSuggestions) this.els.ytSuggestions.style.display = 'none';
  };
  document.body.appendChild(script);
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
      if (canvas.clientWidth !== canvas.width) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bufferLength = 32;
      const dataArray = new Uint8Array(bufferLength);

      if (this.vizAnalyser && this.isPlayingMusic && this.audioSourceType === 'local') {
        this.vizAnalyser.getByteFrequencyData(dataArray);
      } else if (this.isPlayingMusic) {
        for (let i = 0; i < bufferLength; i++) {
          const wavePulse = Math.sin(Date.now() * 0.005 + i * 0.3);
          dataArray[i] = Math.abs(wavePulse) * 180 + 30;
        }
      } else if (this.activeWaveFreq > 0) {
        for (let i = 0; i < bufferLength; i++) {
          const wavePulse = Math.sin(Date.now() * (this.activeWaveFreq * 0.002) + i * 0.4);
          dataArray[i] = Math.abs(wavePulse) * 160 + 20;
        }
      } else {
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.abs(Math.sin(Date.now() * 0.003 + i * 0.2)) * 30 + 5;
        }
      }

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const audioIntensity = dataArray[i] / 255;
        const barHeight = audioIntensity * canvas.height * 0.85 + 4;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#38bdf8');
        gradient.addColorStop(1, '#00f6ff');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 3;
      }
    };

    renderFrame();
  }

  applyTheme(theme) {
    document.body.classList.remove('theme-cyberpunk', 'theme-emerald', 'theme-amber');
    if (theme !== 'dark') document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('roitx_theme', theme);
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
        this.els.waveDesc.textContent = `Playing ${type.toUpperCase()} Beats (${targetFreq}Hz).`;
      }

      if (this.els.waveBenefitsCard) {
        this.els.waveBenefitsCard.style.display = 'block';
        if (type === 'alpha') {
          if (this.els.activeWaveTitle) this.els.activeWaveTitle.textContent = "🧠 Alpha Waves (8-12Hz) Active";
          if (this.els.activeWaveDesc) this.els.activeWaveDesc.textContent = "Deep focus aur fast memory retrieval me help karta hai.";
        } else if (type === 'theta') {
          if (this.els.activeWaveTitle) this.els.activeWaveTitle.textContent = "🧠 Theta Waves (4-8Hz) Active";
          if (this.els.activeWaveDesc) this.els.activeWaveDesc.textContent = "Creative thinking aur deep meditative state active karta hai.";
        } else if (type === 'beta') {
          if (this.els.activeWaveTitle) this.els.activeWaveTitle.textContent = "🧠 Beta Waves (12-30Hz) Active";
          if (this.els.activeWaveDesc) this.els.activeWaveDesc.textContent = "High alertness aur analytical problem solving booster.";
        }
      }
    } catch (e) {}
  }

  stopBrainwave() {
    this.activeWaveFreq = 0;
    if (this.waveOscLeft) { this.waveOscLeft.stop(); this.waveOscLeft.disconnect(); }
    if (this.waveOscRight) { this.waveOscRight.stop(); this.waveOscRight.disconnect(); }
    if (this.brainwaveCtx) { this.brainwaveCtx.close(); this.brainwaveCtx = null; }
    
    if (this.els.waveDesc) {
      this.els.waveDesc.textContent = "Select a frequency to generate Binaural Beats.";
    }
    if (this.els.waveBenefitsCard) {
      this.els.waveBenefitsCard.style.display = 'none';
    }
  }

  toggleAmbient(e) {
    const btn = e.currentTarget;
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
    this.resetTimer();
    this.timerState.initial = mins * 60;
    this.timerState.remaining = mins * 60;
    this.updateTimerDisplay();
  }

  startTimer() {
    if (this.timerState.intervalId) return;

    this.timerState.isRunning = true;
    this.timerState.isPaused = false;
    if (this.els.btnStartTimer) {
      this.els.btnStartTimer.textContent = "Pause Session";
      this.els.btnStartTimer.className = "btn warning";
    }

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
    this.timerState.isPaused = true;
    if (this.els.btnStartTimer) {
      this.els.btnStartTimer.textContent = "Resume Session";
      this.els.btnStartTimer.className = "btn primary";
    }
  }

  resumeTimer() {
    this.startTimer();
  }

  resetTimer() {
    if (this.timerState.intervalId) {
      clearInterval(this.timerState.intervalId);
      this.timerState.intervalId = null;
    }
    this.timerState.isRunning = false;
    this.timerState.isPaused = false;
    this.timerState.remaining = this.timerState.initial;
    this.updateTimerDisplay();

    if (this.els.btnStartTimer) {
      this.els.btnStartTimer.textContent = "Start Session";
      this.els.btnStartTimer.className = "btn primary";
    }
  }

  updateTimerDisplay() {
    const formatted = this.formatTime(this.timerState.remaining);
    if (this.els.timerDisplay) this.els.timerDisplay.textContent = formatted;
    if (this.els.aodTimerText) this.els.aodTimerText.textContent = formatted;
    if (this.els.zenDisplayText) this.els.zenDisplayText.textContent = formatted;
    document.title = `${formatted} - Study Focus`;
  }

  timerComplete() {
    this.resetTimer();
    this.playNotificationSound();
    
    const addedMins = Math.round(this.timerState.initial / 60);
    this.dailyMinutes += addedMins;
    localStorage.setItem('roitx_study_mins', this.dailyMinutes);
    this.updateStatsUI();

    if (this.els.modal) this.els.modal.style.display = 'flex';
  }

  startStopwatch() {
    if (this.stopwatchState.running) return;
    this.stopwatchState.running = true;
    this.stopwatchState.start = performance.now() - this.stopwatchState.elapsed;
    if (this.els.btnSwStart) this.els.btnSwStart.textContent = "Pause";
    
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
    if (this.els.btnSwStart) this.els.btnSwStart.textContent = "Resume";
    if (this.stopwatchState.rafId) cancelAnimationFrame(this.stopwatchState.rafId);
  }

  resetStopwatch() {
    this.stopStopwatch();
    this.stopwatchState.elapsed = 0;
    this.stopwatchState.laps = [];
    if (this.els.btnSwStart) this.els.btnSwStart.textContent = "Start";
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
      <span>Lap ${this.stopwatchState.laps.length}</span>
      <span>${lapTimeFormatted}</span>
    `;

    this.els.lapsContainer.prepend(card);
  }

  updateStopwatchDisplay() {
    const formatted = this.formatStopwatch(this.stopwatchState.elapsed);
    if (this.els.swDisplay) this.els.swDisplay.innerHTML = formatted;
    if (this.els.aodSwText) this.els.aodSwText.textContent = this.formatStopwatchRaw(this.stopwatchState.elapsed);
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
      e.currentTarget.classList.add('active-toggle');
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      e.currentTarget.classList.remove('active-toggle');
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
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';

      hours = hours % 12;
      hours = hours ? hours : 12; // 02 format
      const hrsStr = String(hours);

      // Update Flip Clock Cards
      if (this.els.flipHours) {
        const top = this.els.flipHours.querySelector('.top');
        const bottom = this.els.flipHours.querySelector('.bottom');
        if (top) top.textContent = hrsStr;
        if (bottom) bottom.textContent = hrsStr;
      }

      if (this.els.flipMinutes) {
        const top = this.els.flipMinutes.querySelector('.top');
        const bottom = this.els.flipMinutes.querySelector('.bottom');
        if (top) top.textContent = minutes;
        if (bottom) bottom.textContent = minutes;
      }

      if (this.els.aodAmPm) {
        this.els.aodAmPm.textContent = ampm;
      }

      const liveClockEl = document.getElementById('liveClock');
      if (liveClockEl) liveClockEl.textContent = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

      if (this.els.aodDateText) this.els.aodDateText.textContent = now.toDateString();
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
        if (this.els.batteryLvl) this.els.batteryLvl.textContent = "100%";
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
// Clean & Safe Click Event Handler
document.addEventListener('click', (e) => {
  const suggestionsEl = document.getElementById('ytSuggestions');
  if (suggestionsEl && !e.target.closest('#audioUrlInput') && !e.target.closest('#ytSuggestions')) {
    suggestionsEl.style.display = 'none';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  window.roitxEngine = new ProductivityEngine();
});
