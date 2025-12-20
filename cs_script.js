/* cs_script.js
   Shared JS for classes.html, subjects.html, chapters.html
   - handles query params
   - breadcrumb + back button
   - sidebar toggle
   - top search (filters visible items)
   - card tilt (mouse) + touch fallback
   - click navigation: classes -> subjects -> chapters
*/

/* ---------- small helpers ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
function qs(name){ // get query string param
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/* ---------- sidebar open/close ---------- */
(function sidebar(){
  const menuBtn = document.getElementById('menuBtn');
  const side = document.getElementById('sideMenu');
  const overlay = document.querySelector('.overlay');
  if(!menuBtn || !side) return;
  menuBtn.addEventListener('click', ()=>{
    side.classList.toggle('open');
    overlay.style.display = side.classList.contains('open') ? 'block' : 'none';
  });
  overlay.addEventListener('click', ()=>{ side.classList.remove('open'); overlay.style.display='none'; });
})();

/* ---------- breadcrumb/back button ---------- */
(function breadcrumbSetup(){
  const bcTrail = $('.breadcrumb .trail');
  const backBtn = $('.breadcrumb .back');
  if(!bcTrail || !backBtn) return;
  // Construct trail from query params:
  const cls = qs('class'), subj = qs('subject');
  const parts = ['Home'];
  if(cls) parts.push(cls);
  if(subj) parts.push(subj);
  bcTrail.textContent = parts.join(' » ');
  backBtn.addEventListener('click', ()=>{
    if(subj) {
      // on chapter page -> go to subject page
      const target = `subjects.html?class=${encodeURIComponent(cls)}`;
      window.location.href = target;
    } else if (cls) {
      // on subject page -> go to classes page
      window.location.href = 'classes.html';
    } else {
      window.history.back();
    }
  });
})();

/* ---------- quick search filter (works for .card3d elements) ---------- */
(function quickSearch(){
  const input = $('.search-input');
  if(!input) return;
  input.addEventListener('input', ()=>{
    const q = input.value.trim().toLowerCase();
    const cards = $$('.card3d');
    cards.forEach(card=>{
      const txt = (card.innerText || '').toLowerCase();
      card.style.display = txt.includes(q) ? '' : 'none';
    });
  });
})();

/* ---------- dynamic page content + navigation data ---------- */
const DATA = {
  classes: [
    { id:'Class 9', desc:'Foundation classes' },
    { id:'Class 10', desc:'Board exam focused' },
    { id:'Class 11', desc:'Higher secondary part 1' },
    { id:'Class 12', desc:'Higher secondary part 2' }
  ],
  subjects: {
    'Class 9': [
      { id:'Physics', icon:'🔭' }, { id:'Maths', icon:'📐' }, { id:'Chemistry', icon:'🧪' }, { id:'English', icon:'📘' }, { id:'Sanskrit', icon:'🕉️' }
    ],
    'Class 10': [
      { id:'Physics', icon:'🔭' },{ id:'Maths', icon:'📐' },{ id:'Chemistry', icon:'🧪' },{ id:'History', icon:'📜' }
    ],
    'Class 11': [
      { id:'Physics', icon:'🔭' },{ id:'Maths', icon:'📐' },{ id:'Biology', icon:'🌿' }
    ],
    'Class 12': [
      { id:'Physics', icon:'🔭' },{ id:'Maths', icon:'📐' },{ id:'Economics', icon:'💰' }
    ]
  },
  chapters: {
    'Physics': ['Motion','Force','Work & Energy','Waves'],
    'Maths': ['Algebra','Geometry','Trigonometry','Calculus'],
    'Chemistry': ['Atoms','Bonding','Acids & Bases'],
    'Biology': ['Cell','Tissues','Human Body'],
    'English': ['Prose','Poetry','Comprehension'],
    'History': ['Ancient','Medieval','Modern'],
    'Sanskrit': ['Parichay','Varnamala','Sandhi'],
    'Economics': ['Basics','Demand & Supply','Markets']
  }
};

/* ---------- render helpers for each page ---------- */
(function renderPage(){
  // detect page by body id or filename
  const path = location.pathname.split('/').pop();
  const page = path || 'index.html';

  if(page.includes('classes.html')){
    renderClasses();
  } else if(page.includes('subjects.html')){
    renderSubjects();
  } else if(page.includes('chapters.html')){
    renderChapters();
  } else {
    // nothing
  }
})();

function createCard({emoji, title, meta, badge}, clickHandler){
  const a = document.createElement('a');
  a.className = 'card3d';
  a.href = '#';
  if(badge){
    const b = document.createElement('div'); b.className='badge '+(badge==='New'?'new':''); b.textContent = badge;
    a.appendChild(b);
  }
  const top = document.createElement('div'); top.className='card-top';
  const e = document.createElement('div'); e.className='emoji'; e.textContent = emoji||'📘';
  top.appendChild(e);
  a.appendChild(top);

  const nm = document.createElement('div'); nm.className='name'; nm.textContent = title;
  a.appendChild(nm);
  if(meta){
    const mt = document.createElement('div'); mt.className='meta'; mt.textContent = meta; a.appendChild(mt);
  }

  a.addEventListener('click', (ev)=>{
    ev.preventDefault();
    if(typeof clickHandler === 'function') clickHandler();
  });

  // add tilt interactivity
  a.addEventListener('mousemove', (e)=>{
    const rect = a.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const rx = ((y / rect.height) - 0.5) * -8;
    const ry = ((x / rect.width) - 0.5) * 8;
    a.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px) scale(1.02)`;
  });
  a.addEventListener('mouseleave', ()=> a.style.transform = '');

  return a;
}

/* ---------- Classes page rendering ---------- */
function renderClasses(){
  const wrap = $('.container');
  if(!wrap) return;
  wrap.innerHTML = `
    <div class="breadcrumb"><button class="back">Back</button><div class="trail">Home » Classes</div></div>
    <div class="banner"><h2>Choose Class</h2><p>Select your class to view subjects & chapters</p></div>
    <div class="search-wrap"><input class="search-input" placeholder="Search classes..."><button class="search-btn">Search</button></div>
    <div class="cards" id="classesGrid"></div>
  `;

  const grid = $('#classesGrid');
  DATA.classes.forEach((c, idx)=>{
    const card = createCard({emoji:'🏫', title:c.id, meta:c.desc, badge: idx<2 ? 'New' : null}, ()=>{
      window.location.href = `subjects.html?class=${encodeURIComponent(c.id)}`;
    });
    grid.appendChild(card);
  });

  // re-hook search
  document.querySelector('.search-input').addEventListener('input', (e)=>{
    const q = e.target.value.toLowerCase();
    $$('#classesGrid .card3d').forEach(card => {
      card.style.display = card.querySelector('.name').textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  // back button functionality
  $('.breadcrumb .back').addEventListener('click', ()=> history.back());
}

/* ---------- Subjects page rendering ---------- */
function renderSubjects(){
  const cls = qs('class') || 'Class 11';
  const wrap = $('.container');
  if(!wrap) return;
  wrap.innerHTML = `
    <div class="breadcrumb"><button class="back">Back</button><div class="trail">Home » ${cls} » Subjects</div></div>
    <div class="banner"><h2>${cls} — Subjects</h2><p>Tap a subject to open chapters</p></div>
    <div class="subject-banner"><div class="icon">📚</div><div class="title">${cls} Subjects</div></div>
    <div class="search-wrap"><input class="search-input" placeholder="Search subjects..."><button class="search-btn">Search</button></div>
    <div class="cards" id="subjectsGrid"></div>
  `;

  const list = DATA.subjects[cls] || [];
  const grid = $('#subjectsGrid');
  list.forEach(s=>{
    const card = createCard({emoji: s.icon || '📘', title: s.id, meta: `${cls} subject`, badge: Math.random()<0.33 ? 'New' : null}, ()=>{
      window.location.href = `chapters.html?class=${encodeURIComponent(cls)}&subject=${encodeURIComponent(s.id)}`;
    });
    grid.appendChild(card);
  });

  // search hook
  document.querySelector('.search-input').addEventListener('input', (e)=>{
    const q = e.target.value.toLowerCase();
    $$('#subjectsGrid .card3d').forEach(card => {
      card.style.display = card.querySelector('.name').textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  $('.breadcrumb .back').addEventListener('click', ()=> window.location.href = 'classes.html');
}

/* ---------- Chapters page rendering ---------- */
function renderChapters(){
  const cls = qs('class') || 'Class 11';
  const subj = qs('subject') || 'Physics';
  const wrap = $('.container');
  if(!wrap) return;
  wrap.innerHTML = `
    <div class="breadcrumb"><button class="back">Back</button><div class="trail">Home » ${cls} » ${subj} » Chapters</div></div>
    <div class="banner"><h2>${subj} — Chapters</h2><p>Click a chapter to open notes (PDF)</p></div>
    <div class="subject-banner"><div class="icon">🎯</div><div class="title">${subj}</div></div>
    <div class="search-wrap"><input class="search-input" placeholder="Search chapters..."><button class="search-btn">Search</button></div>
    <div class="cards" id="chaptersGrid"></div>
  `;

  const chlist = DATA.chapters[subj] || ['Chapter 1','Chapter 2'];
  const grid = $('#chaptersGrid');
  chlist.forEach((ch,i)=>{
    const card = createCard({emoji:'📄', title:ch, meta:`Chapter ${i+1}`, badge: i===0 ? 'New' : null}, ()=>{
      // open notes.html with query param (notes.html?file=physics_ch1.pdf)
      window.location.href = `notes.html?class=${encodeURIComponent(cls)}&subject=${encodeURIComponent(subj)}&chapter=${encodeURIComponent(ch)}`;
    });
    grid.appendChild(card);
  });

  // search hook
  document.querySelector('.search-input').addEventListener('input', (e)=>{
    const q = e.target.value.toLowerCase();
    $$('#chaptersGrid .card3d').forEach(card => {
      card.style.display = card.querySelector('.name').textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  $('.breadcrumb .back').addEventListener('click', ()=> window.location.href = `subjects.html?class=${encodeURIComponent(cls)}`);
}

/* ---------- accessibility basic: keyboard navigation for cards ---------- */
(function keyboardNav(){
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape'){
      // close sidebar if open
      const side = document.getElementById('sideMenu');
      if(side && side.classList.contains('open')){ side.classList.remove('open'); document.querySelector('.overlay').style.display='none'; }
    }
  });
})();
