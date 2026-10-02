/* animination.js - Custom Animations & Clean Layout Handler */
"use strict";

class AnimationManager {
  constructor() {
    this.currentAnim = 'pulse';
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('.btnAnimChoice');
      if (target) {
        const animType = target.dataset.anim;
        this.setClockAnimation(animType);
      }
    });
  }

  setClockAnimation(type) {
    const flipClockWrapper = document.querySelector('.flip-clock-wrapper');
    if (!flipClockWrapper) return;

    flipClockWrapper.classList.remove('anim-pulse', 'anim-ring', 'anim-breathe', 'anim-flip');

    if (type === 'pulse') {
      flipClockWrapper.classList.add('anim-pulse');
    } else if (type === 'ring') {
      flipClockWrapper.classList.add('anim-ring');
    } else if (type === 'breathe') {
      flipClockWrapper.classList.add('anim-breathe');
    } else if (type === 'flip') {
      flipClockWrapper.classList.add('anim-flip');
    }
    
    this.currentAnim = type;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.roitxAnimManager = new AnimationManager();
});
