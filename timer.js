let mode = 'clock', style = 'flip', is24 = false;
let swRunning = false, swStartTime = 0, swElapsedTime = 0, swInterval = null, lapCount = 0, lastLapTime = 0;
let tmRunning = false, tmTotalSec = 1500, tmRemSec = 1500, tmInterval = null;
let prev = { h: '', m: '', s: '' };

// Task & Wave Globals
let tasks = JSON.parse(localStorage.getItem('studio_tasks')) || [];
let currentFilter = 'all';
let audioCtx = null, oscLeft = null, oscRight = null, gainNode = null;
let isWavePlaying = false, currentBeatFreq = 40, baseFreq = 200, volumeVal = 0.3;

// YouTube Globals
const YOUTUBE_API_KEY = 'AIzaSyDWIrD-DAAnwHx9VOPdBJ06QsDTEnBuAow';
let ytPlayer = null;
let isYtPlaying = false, isYtLooping = false, ytTimerInterval;
let searchResults = [];

function init() {
  requestAnimationFrame(mainRenderLoop);
  renderTasks();
}

function mainRenderLoop() {
  if (mode === 'clock') {
    const now = new Date();
    if (style === 'minimal') {
      const ms = now.getMilliseconds();
      const s = now.getSeconds() + ms / 1000;
      const m = now.getMinutes() + s / 60;
      const h = (now.getHours() % 12) + m / 60;

      const hrEl = document.getElementById('wh-hour');
      const minEl = document.getElementById('wh-minute');
      const secEl = document.getElementById('wh-second');
      if (hrEl) hrEl.style.transform = `rotate(${h * 30}deg)`;
      if (minEl) minEl.style.transform = `rotate(${m * 6}deg)`;
      if (secEl) secEl.style.transform = `rotate(${s * 6}deg)`;
    } else {
      let h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      let ampm = '';
      if (!is24) { ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; }
      const hStr = String(h).padStart(2, '0');

      const ampmEl = document.getElementById('ampm-text');
      if (ampmEl) ampmEl.textContent = ampm;
      flip('fh', hStr); flip('fm', m); flip('fs', s);
    }
  }
  requestAnimationFrame(mainRenderLoop);
}

function flip(prefix, val) {
  if (prev[prefix] === val) return;
  const top = document.getElementById(`${prefix}-top`);
  const bot = document.getElementById(`${prefix}-bot`);
  const leaf = document.getElementById(`${prefix}-leaf`);
  const leafNum = document.getElementById(`${prefix}-leaf-num`);
  if (!top || !bot || !leaf || !leafNum) return;

  leafNum.textContent = prev[prefix] || val;
  top.textContent = val;

  leaf.classList.remove('animate');
  void leaf.offsetWidth;
  leaf.classList.add('animate');

  setTimeout(() => { bot.textContent = val; }, 200);
  prev[prefix] = val;
}

function setMode(m) {
  mode = m;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${m}`);
  if (activeNav) activeNav.classList.add('active');

  const styleBox = document.getElementById('style-box');
  if (styleBox) {
    styleBox.style.display = (m === 'tasks' || m === 'youtube') ? 'none' : 'flex';
  }
  updateViewDisplay();
}

function setStyle(s) {
  style = s;
  document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
  const activeStyleBtn = document.getElementById(s === 'flip' ? 'btn-flip' : 'btn-wall');
  if (activeStyleBtn) activeStyleBtn.classList.add('active');
  updateViewDisplay();
}

function updateViewDisplay() {
  document.getElementById('flip-view').style.display = 'none';
  document.getElementById('wall-view').style.display = 'none';
  document.getElementById('sw-minimal-view').style.display = 'none';
  document.getElementById('tm-minimal-view').style.display = 'none';
  document.getElementById('tasks-waves-view').style.display = 'none';
  document.getElementById('youtube-tab-view').style.display = 'none';
  document.getElementById('yt-bottom-player').style.display = 'none';
  document.getElementById('laps-box').style.display = 'none';
  document.getElementById('presets-box').style.display = 'none';
  document.getElementById('action-bar-el').style.display = 'none';
  document.getElementById('ampm-text').style.display = 'none';

  if (mode === 'clock') {
    if (style === 'flip') {
      document.getElementById('flip-view').style.display = 'flex';
      document.getElementById('ampm-text').style.display = 'block';
    } else {
      document.getElementById('wall-view').style.display = 'flex';
    }
  } else if (mode === 'stopwatch') {
    document.getElementById('action-bar-el').style.display = 'flex';
    document.getElementById('laps-box').style.display = 'block';
    if (style === 'flip') {
      document.getElementById('flip-view').style.display = 'flex';
      renderFlipStopwatch();
    } else {
      document.getElementById('sw-minimal-view').style.display = 'flex';
    }
  } else if (mode === 'timer') {
    document.getElementById('action-bar-el').style.display = 'flex';
    document.getElementById('presets-box').style.display = 'flex';
    if (style === 'flip') {
      document.getElementById('flip-view').style.display = 'flex';
      renderFlipTimer();
    } else {
      document.getElementById('tm-minimal-view').style.display = 'flex';
    }
  } else if (mode === 'tasks') {
    document.getElementById('tasks-waves-view').style.display = 'flex';
  } else if (mode === 'youtube') {
    document.getElementById('youtube-tab-view').style.display = 'flex';
    document.getElementById('yt-bottom-player').style.display = 'flex';
  }
  updateButtonsUI();
}

function updateStopwatch() {
  swElapsedTime = Date.now() - swStartTime;
  const s = Math.floor((swElapsedTime / 1000) % 60);
  const m = Math.floor((swElapsedTime / (1000 * 60)) % 60);
  const h = Math.floor(swElapsedTime / (1000 * 60 * 60));

  const hStr = String(h).padStart(2,'0');
  const mStr = String(m).padStart(2,'0');
  const sStr = String(s).padStart(2,'0');

  if (style === 'flip' && mode === 'stopwatch') {
    flip('fh', hStr); flip('fm', mStr); flip('fs', sStr);
  } else {
    const swDisp = document.getElementById('sw-display');
    if (swDisp) swDisp.textContent = `${hStr}:${mStr}:${sStr}`;
    const ms = Math.floor((swElapsedTime % 1000) / 10);
    const swDot = document.getElementById('sw-dot');
    if (swDot) swDot.style.transform = `rotate(${(s + ms/100) * 6}deg)`;
  }
}

function renderFlipStopwatch() {
  const s = Math.floor((swElapsedTime / 1000) % 60);
  const m = Math.floor((swElapsedTime / (1000 * 60)) % 60);
  const h = Math.floor(swElapsedTime / (1000 * 60 * 60));
  flip('fh', String(h).padStart(2,'0'));
  flip('fm', String(m).padStart(2,'0'));
  flip('fs', String(s).padStart(2,'0'));
}

function renderTimerDisplay() {
  const h = Math.floor(tmRemSec / 3600);
  const m = Math.floor((tmRemSec % 3600) / 60);
  const s = tmRemSec % 60;

  const hStr = String(h).padStart(2, '0');
  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(2, '0');

  if (style === 'flip' && mode === 'timer') {
    flip('fh', hStr); flip('fm', mStr); flip('fs', sStr);
  } else {
    const tmDisp = document.getElementById('tm-display');
    if (tmDisp) tmDisp.innerHTML = `${hStr}:${mStr}:<span class="sec-highlight">${sStr}</span>`;
    const offset = 850 - (tmRemSec / tmTotalSec) * 850;
    const prog = document.getElementById('timer-progress');
    if (prog) prog.style.strokeDashoffset = offset;
  }
}

function renderFlipTimer() { renderTimerDisplay(); }

function setPreset(sec) {
  tmTotalSec = sec; tmRemSec = sec;
  tmRunning = false; clearInterval(tmInterval);
  renderTimerDisplay();
  updateButtonsUI();
  document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');
}

function updateButtonsUI() {
  const resetBtn = document.getElementById('reset-btn');
  const leftBtn = document.getElementById('left-btn');
  const rightBtn = document.getElementById('right-btn');

  if (mode === 'stopwatch') {
    if (resetBtn) resetBtn.style.display = 'block';
    if (leftBtn) leftBtn.textContent = 'Lap';
    if (rightBtn) rightBtn.textContent = swRunning ? 'Pause' : 'Start';
  } else if (mode === 'timer') {
    if (resetBtn) resetBtn.style.display = 'none';
    if (leftBtn) leftBtn.textContent = 'Cancel';
    if (rightBtn) rightBtn.textContent = tmRunning ? 'Pause' : 'Start';
  } else {
    if (resetBtn) resetBtn.style.display = 'none';
    if (leftBtn) leftBtn.style.display = 'none';
    if (rightBtn) rightBtn.style.display = 'none';
  }
}

function handleLeftBtn() {
  if (mode === 'stopwatch' && swRunning) {
    lapCount++;
    const currentLapTime = swElapsedTime;
    const splitTime = currentLapTime - lastLapTime;
    lastLapTime = currentLapTime;

    const list = document.getElementById('laps-list');
    if (list) {
      const item = document.createElement('div');
      item.className = 'lap-item';
      item.innerHTML = `
        <span class="lap-no">Lap ${String(lapCount).padStart(2, '0')}</span>
        <span class="lap-split">+${formatTimeMs(splitTime)}</span>
        <span class="lap-time">${formatTimeMs(currentLapTime)}</span>
      `;
      list.prepend(item);
    }
  } else if (mode === 'timer') {
    tmRunning = false; clearInterval(tmInterval);
    tmRemSec = tmTotalSec; renderTimerDisplay();
    updateButtonsUI();
  }
}

function handleRightBtn() {
  if (mode === 'stopwatch') {
    swRunning = !swRunning;
    if (swRunning) {
      swStartTime = Date.now() - swElapsedTime;
      swInterval = setInterval(updateStopwatch, 10);
    } else {
      clearInterval(swInterval);
    }
  } else if (mode === 'timer') {
    tmRunning = !tmRunning;
    if (tmRunning) {
      tmInterval = setInterval(() => {
        if (tmRemSec > 0) {
          tmRemSec--; renderTimerDisplay();
        } else {
          clearInterval(tmInterval); tmRunning = false; alert("Timer Completed!");
        }
      }, 1000);
    } else {
      clearInterval(tmInterval);
    }
  }
  updateButtonsUI();
}

function handleResetBtn() {
  if (mode === 'stopwatch') {
    swRunning = false; clearInterval(swInterval);
    swElapsedTime = 0; lapCount = 0; lastLapTime = 0;
    const list = document.getElementById('laps-list');
    if (list) list.innerHTML = '';
    updateStopwatch();
    updateButtonsUI();
  }
}

function formatTimeMs(ms) {
  const s = Math.floor((ms / 1000) % 60);
  const m = Math.floor((ms / (1000 * 60)) % 60);
  const h = Math.floor(ms / (1000 * 60 * 60));
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// Tasks Functions
function saveTasks() {
  localStorage.setItem('studio_tasks', JSON.stringify(tasks));
  renderTasks();
}

function addTask() {
  const input = document.getElementById('task-in');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  tasks.push({ id: Date.now(), text, completed: false });
  input.value = '';
  saveTasks();
}

function toggleTask(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
  saveTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
}

function filterTasks(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTasks();
}

function renderTasks() {
  const container = document.getElementById('tasks-container');
  if (!container) return;
  container.innerHTML = '';

  const filtered = tasks.filter(t => {
    if (currentFilter === 'active') return !t.completed;
    if (currentFilter === 'completed') return t.completed;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; color: var(--muted); font-size:12px; padding:15px;">No tasks found</div>`;
    return;
  }

  filtered.forEach(t => {
    const item = document.createElement('div');
    item.className = `task-item ${t.completed ? 'completed' : ''}`;
    item.innerHTML = `
      <div class="task-left">
        <div class="check-circle" onclick="toggleTask(${t.id})">
          <i class="fa-solid fa-check"></i>
        </div>
        <span>${t.text}</span>
      </div>
      <button class="del-btn" onclick="deleteTask(${t.id})"><i class="fa-solid fa-trash"></i></button>
    `;
    container.appendChild(item);
  });
}

// Brain Waves Audio Synth Functions
function selectWave(type, freq, btn) {
  currentBeatFreq = freq;
  document.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  if (isWavePlaying) {
    stopWave();
    startWave();
  }
}

function toggleAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (isWavePlaying) {
    stopWave();
  } else {
    startWave();
  }
}

function startWave() {
  if (!audioCtx) return;
  gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(volumeVal, audioCtx.currentTime);

  const merger = audioCtx.createChannelMerger(2);
  oscLeft = audioCtx.createOscillator();
  oscRight = audioCtx.createOscillator();

  oscLeft.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
  oscRight.frequency.setValueAtTime(baseFreq + currentBeatFreq, audioCtx.currentTime);

  oscLeft.connect(merger, 0, 0);
  oscRight.connect(merger, 0, 1);
  merger.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscLeft.start();
  oscRight.start();

  isWavePlaying = true;
  const playIcon = document.getElementById('wave-play-icon');
  const statusEl = document.getElementById('wave-status');
  if (playIcon) playIcon.className = "fa-solid fa-pause";
  if (statusEl) statusEl.textContent = `Playing ${currentBeatFreq} Hz Beat`;
}

function stopWave() {
  if (oscLeft) { oscLeft.stop(); oscLeft.disconnect(); }
  if (oscRight) { oscRight.stop(); oscRight.disconnect(); }
  isWavePlaying = false;
  const playIcon = document.getElementById('wave-play-icon');
  const statusEl = document.getElementById('wave-status');
  if (playIcon) playIcon.className = "fa-solid fa-play";
  if (statusEl) statusEl.textContent = "Audio Idle";
}

function setVolume(val) {
  volumeVal = val;
  if (gainNode && audioCtx) {
    gainNode.gain.setValueAtTime(val, audioCtx.currentTime);
  }
}

// YouTube Player Logic
function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('yt-player', {
    playerVars: { 'autoplay': 1, 'controls': 1, 'modestbranding': 1, 'rel': 0 },
    events: { 'onStateChange': onYtPlayerStateChange }
  });
}

function onYtPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    isYtPlaying = true;
    document.getElementById('yt-play-btn').innerHTML = '<i class="fa-solid fa-pause"></i>';
    startYtTimer();
  } else if (event.data === YT.PlayerState.PAUSED) {
    isYtPlaying = false;
    document.getElementById('yt-play-btn').innerHTML = '<i class="fa-solid fa-play"></i>';
    stopYtTimer();
  } else if (event.data === YT.PlayerState.ENDED) {
    if (isYtLooping && ytPlayer) {
      ytPlayer.seekTo(0);
      ytPlayer.playVideo();
    } else {
      isYtPlaying = false;
      document.getElementById('yt-play-btn').innerHTML = '<i class="fa-solid fa-play"></i>';
      stopYtTimer();
    }
  }
}

function loadVideoDetails(videoId, title, artist, shouldPlay = true) {
  document.getElementById('placeholder').style.display = 'none';
  document.getElementById('yt-player').style.display = 'block';

  document.getElementById('current-title').textContent = title;
  document.getElementById('now-playing-title').textContent = (shouldPlay ? "Playing: " : "Loaded: ") + title;
  document.getElementById('current-artist').textContent = artist;
  
  const artImg = document.getElementById('current-art');
  artImg.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  artImg.style.display = 'block';

  if (ytPlayer && ytPlayer.loadVideoById) {
    if (shouldPlay) ytPlayer.loadVideoById(videoId);
    else ytPlayer.cueVideoById(videoId);
  }
}

const ytSearchInput = document.getElementById('yt-search-input');
const ytSearchBtn = document.getElementById('yt-search-btn');
const ytSuggestionsList = document.getElementById('yt-suggestions-list');

if (ytSearchInput) {
  ytSearchInput.addEventListener('input', () => {
    const query = ytSearchInput.value.trim();
    if (!query) { ytSuggestionsList.style.display = 'none'; return; }

    const script = document.createElement('script');
    window.handleSuggestions = (data) => {
      const suggestions = data[1] || [];
      renderYtSuggestions(suggestions);
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    script.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}&jsonp=handleSuggestions`;
    document.body.appendChild(script);
  });
}

function renderYtSuggestions(suggestions) {
  if (!suggestions.length) { ytSuggestionsList.style.display = 'none'; return; }
  ytSuggestionsList.innerHTML = suggestions.map(item => `
    <li><i class="fa-solid fa-magnifying-glass" style="color: #aaa;"></i> ${item[0]}</li>
  `).join('');
  ytSuggestionsList.style.display = 'block';

  Array.from(ytSuggestionsList.children).forEach((li, index) => {
    li.addEventListener('click', () => {
      ytSearchInput.value = suggestions[index][0];
      ytSuggestionsList.style.display = 'none';
      performYtSearch();
    });
  });
}

if (ytSearchBtn) {
  ytSearchBtn.addEventListener('click', performYtSearch);
  ytSearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performYtSearch(); });
}

async function performYtSearch() {
  const query = ytSearchInput.value.trim();
  if (!query) return;
  ytSuggestionsList.style.display = 'none';

  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      searchResults = data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle
      }));
      renderYtSearchResults();
      loadVideoDetails(searchResults[0].id, searchResults[0].title, searchResults[0].artist, true);
    } else {
      alert('Koi result nahi mila.');
    }
  } catch (error) {
    console.error('Search Error:', error);
  }
}

function renderYtSearchResults() {
  const container = document.getElementById('results-container');
  container.innerHTML = '';
  searchResults.forEach((song) => {
    const item = document.createElement('div');
    item.className = 'song-item';
    item.innerHTML = `
      <img src="https://img.youtube.com/vi/${song.id}/hqdefault.jpg" alt="${song.title}">
      <div class="song-info">
        <div class="title">${song.title}</div>
        <div class="artist">${song.artist}</div>
      </div>
    `;
    item.addEventListener('click', () => {
      loadVideoDetails(song.id, song.title, song.artist, true);
      document.getElementById('results-drawer').classList.remove('open');
    });
    container.appendChild(item);
  });
}

const resultsDrawer = document.getElementById('results-drawer');
const listBtn = document.getElementById('list-btn');
const closeDrawerBtn = document.getElementById('close-drawer-btn');

if (listBtn) {
  listBtn.addEventListener('click', () => resultsDrawer.classList.toggle('open'));
  closeDrawerBtn.addEventListener('click', () => resultsDrawer.classList.remove('open'));
}

const ytPlayBtn = document.getElementById('yt-play-btn');
const progressBar = document.getElementById('progress-bar');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const volumeBar = document.getElementById('volume-bar');
const muteBtn = document.getElementById('mute-btn');
const repeatBtn = document.getElementById('repeat-btn');
const rewindBtn = document.getElementById('rewind-btn');
const forwardBtn = document.getElementById('forward-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');

if (ytPlayBtn) {
  ytPlayBtn.addEventListener('click', () => {
    if (!ytPlayer) return;
    if (isYtPlaying) ytPlayer.pauseVideo();
    else ytPlayer.playVideo();
  });

  rewindBtn.addEventListener('click', () => {
    if (ytPlayer && ytPlayer.getCurrentTime) ytPlayer.seekTo(Math.max(0, ytPlayer.getCurrentTime() - 10), true);
  });

  forwardBtn.addEventListener('click', () => {
    if (ytPlayer && ytPlayer.getCurrentTime) ytPlayer.seekTo(ytPlayer.getCurrentTime() + 10, true);
  });

  repeatBtn.addEventListener('click', () => {
    isYtLooping = !isYtLooping;
    repeatBtn.classList.toggle('active', isYtLooping);
  });

  fullscreenBtn.addEventListener('click', () => {
    const iframe = document.getElementById('yt-player');
    if (iframe.requestFullscreen) iframe.requestFullscreen();
  });

  progressBar.addEventListener('input', (e) => {
    if (ytPlayer && ytPlayer.getDuration) {
      ytPlayer.seekTo((e.target.value / 100) * ytPlayer.getDuration(), true);
    }
  });

  volumeBar.addEventListener('input', (e) => {
    if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(e.target.value);
  });

  muteBtn.addEventListener('click', () => {
    if (!ytPlayer) return;
    if (ytPlayer.isMuted()) {
      ytPlayer.unMute();
      muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    } else {
      ytPlayer.mute();
      muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    }
  });
}

function startYtTimer() {
  stopYtTimer();
  ytTimerInterval = setInterval(() => {
    if (ytPlayer && ytPlayer.getCurrentTime) {
      const curr = ytPlayer.getCurrentTime();
      const dur = ytPlayer.getDuration();
      if (dur > 0) {
        progressBar.value = (curr / dur) * 100;
        currentTimeEl.textContent = formatTime(curr);
        durationEl.textContent = formatTime(dur);
      }
    }
  }, 500);
}

function stopYtTimer() { clearInterval(ytTimerInterval); }

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function toggleFormat() {
  is24 = !is24;
  const fmtLbl = document.getElementById('fmt-lbl');
  if (fmtLbl) fmtLbl.textContent = is24 ? '24H' : '12H';
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      document.body.classList.add('clean-fullscreen');
    }).catch(err => {
      console.error("Fullscreen error:", err);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    document.body.classList.remove('clean-fullscreen');
  }
}

// Fullscreen exit hone par UI elements ko wapas laane ke liye listener
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove('clean-fullscreen');
  }
});


function handleGlobalClick(e) {
  if (document.fullscreenElement && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
    document.body.classList.toggle('clean-fullscreen');
  }
}

init();
