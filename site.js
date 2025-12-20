// site.js - shared helpers
function goto(page){ window.location.href = page; }
function mailSupport(){ window.location.href = 'mailto:masumboy141@gmail.com?subject=Support'; }

// theme persist simple
(function(){
  const key='rk_theme';
  const t = localStorage.getItem(key);
  if(t==='dark') document.documentElement.style.background='#081226';
  // you can expand theme later
})();

// small helper to get param
function param(name){ return new URLSearchParams(window.location.search).get(name); }
