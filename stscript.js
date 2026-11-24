// ---------- Firebase (coaching data: fees, class, plans) ----------
firebase.initializeApp({
  apiKey:"AIzaSyBS-vu5WrKpR-67uJgyV0SuBCP0Lmucx-k",authDomain:"pm-roit.firebaseapp.com",
  databaseURL:"https://pm-roit-default-rtdb.europe-west1.firebasedatabase.app",projectId:"pm-roit",
  storageBucket:"pm-roit.firebasestorage.app",messagingSenderId:"360612536936",appId:"1:360612536936:web:bbfc54f9cf4744abe051dd"
});
const db = firebase.database();

const OWNER_EMAIL = "rohitrajgoh91@gmail.com";
const ACCESS = { isAdmin:false };
let PROFILES = [], RECORDS = {}, selected = new Set(), editId = null;

const $ = id => document.getElementById(id);
const ic = n => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const inr = n => '₹' + (Number(n)||0).toLocaleString('en-IN');
function toast(m){ const t=$('toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }

// ---------- Team access (read-only use of manage-team data) ----------
async function checkAccess(){
  try{
    const user = await window.getCurrentUser();
    if(!user){ location.href="login.html"; return false; }
    const p = (await window.getUserPermissions()) || {};
    const owner = (user.email||"").toLowerCase().trim() === OWNER_EMAIL;
    ACCESS.isAdmin = owner || ["admin","superadmin"].includes(p.role);
    const ok = ACCESS.isAdmin || !!p.permissions?.admin_panel;
    if(!ok){ alert("Unauthorized Access!"); location.href="profile.html"; }
    return ok;
  }catch(e){ location.href="profile.html"; return false; }
}

// Same student list as manage-team (profiles with role student/user)
async function loadProfiles(){
  const { data, error } = await window.supabaseClient.from('profiles').select('*').order('full_name',{ascending:true});
  if(error){ $('studentList').innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  LOADED = true;
  PROFILES = (data||[]).filter(u=>{
    if((u.email||'').toLowerCase()===OWNER_EMAIL) return false;
    const r=(u.role||'student').toLowerCase();
    return r==='student' || r==='user';
  });
  render();
}

// ---------- Subscription base ----------
const ENFORCE = false; // true = lock premium features by plan
const FEATURES = { receipt:"Fee Receipts", bulk:"Bulk Actions", branding:"Custom Branding", reports:"Reports (soon)", reminders:"Fee Reminders (soon)" };
const DEFAULT_PLANS = {
  free:{name:"Free",price:0,days:0,features:{receipt:true}},
  pro:{name:"Pro",price:499,days:30,features:{receipt:true,bulk:true,branding:true,reports:true,reminders:true}}
};
let PLANS = DEFAULT_PLANS;

function loadPlans(){
  db.ref('subscription/plans').on('value', s=>{
    if(!s.exists()){ db.ref('subscription/plans').set(DEFAULT_PLANS); return; }
    PLANS = s.val(); renderPlans();
    const o = Object.keys(PLANS).map(k=>`<option value="${esc(k)}">${esc(PLANS[k].name)}</option>`).join('');
    $('bulkPlan').innerHTML=o; renderPlanRadios();
    render();
  });
}
function renderPlans(){
  $('plansList').innerHTML = Object.keys(PLANS).map(k=>{
    const p=PLANS[k];
    const f=Object.keys(FEATURES).map(x=>`<label class="feat"><input type="checkbox" data-f="${x}" ${p.features?.[x]?'checked':''}>${FEATURES[x]}</label>`).join('');
    return `<div class="plan-box" data-plan="${esc(k)}"><div class="grid">
      <div class="input-group"><label>Name</label><input data-k="name" value="${esc(p.name)}"></div>
      <div class="input-group"><label>Price (₹)</label><input data-k="price" type="number" value="${p.price}"></div>
      <div class="input-group"><label>Validity (days, 0 = none)</label><input data-k="days" type="number" value="${p.days}"></div></div>
      <div class="feat-wrap">${f}</div></div>`;
  }).join('');
}
function savePlans(){
  const out={};
  document.querySelectorAll('.plan-box').forEach(b=>{
    const f={}; b.querySelectorAll('[data-f]').forEach(c=>f[c.dataset.f]=c.checked);
    const v=k=>b.querySelector(`[data-k="${k}"]`).value;
    out[b.dataset.plan]={name:v('name'),price:parseInt(v('price'))||0,days:parseInt(v('days'))||0,features:f};
  });
  db.ref('subscription/plans').set(out).then(()=>toast("Plans saved"));
}
function makeSub(id){
  const p=PLANS[id]||PLANS.free, now=Date.now();
  return {plan:PLANS[id]?id:'free',start:now,expiry:p.days?now+p.days*864e5:null};
}
function subStatus(s){ if(!s||!s.plan||s.plan==='free') return 'free'; return s.expiry&&s.expiry<Date.now()?'expired':'active'; }
function can(feature,rec){ if(!ENFORCE) return true; const p=subStatus(rec?.sub)==='active'?PLANS[rec.sub.plan]:PLANS.free; return !!p?.features?.[feature]; }
function planBadge(r){
  const st=subStatus(r.sub), n=PLANS[r.sub?.plan]?.name||'Free';
  const e=r.sub?.expiry?' · '+new Date(r.sub.expiry).toLocaleDateString():'';
  return `<span class="plan-badge ${st}">${esc(n)}${st==='expired'?' (expired)':e}</span>`;
}

// ---------- Render ----------
let SETTINGS = {}, payId = null, LOADED = false, CUR_TAB = 'students';
const feeState = r => { const t=r.total||0, p=r.paid||0; return t>0&&p>=t ? 'paid' : p>0 ? 'partial' : 'due'; };

function render(){
  if(!LOADED) return;
  const q=($('searchBox')?.value||'').toLowerCase().trim(), cls=$('filterCls').value, st=$('filterSt').value;
  let tot=0,paid=0,act=0;
  PROFILES.forEach(u=>{ const r=RECORDS[u.id]||{}; tot+=r.total||0; paid+=r.paid||0; if(subStatus(r.sub)==='active') act++; });
  $('stTotal').textContent=PROFILES.length; $('stPaid').textContent=inr(paid);
  $('stDue').textContent=inr(Math.max(tot-paid,0)); $('stPlans').textContent=act;

  const rows=PROFILES.filter(u=>{
    const r=RECORDS[u.id]||{};
    if(cls!=='All' && r.class!==cls) return false;
    if(st!=='all' && feeState(r)!==st) return false;
    return !q || (u.full_name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q);
  });
  if(!rows.length){
    $('studentList').innerHTML = PROFILES.length
      ? `<div class="empty-rich">${ic('search')}<b>No matches</b><p>Try a different search or filter.</p><button class="btn btn-ghost" onclick="resetFilters()">Clear filters</button></div>`
      : `<div class="empty-rich">${ic('users')}<b>No students yet</b><p>Students appear here automatically when an account has the <b>Student</b> role in Team Manager.</p><a class="btn btn-primary" href="manage-team.html">Open Team Manager</a></div>`;
    renderHelp(); return; }
  $('studentList').innerHTML=rows.map(u=>{
    const r=RECORDS[u.id]||{}, total=r.total||0, p=r.paid||0, pct=total?Math.min(100,p/total*100):0;
    return `<div class="student-card ${selected.has(u.id)?'selected':''}">
      <input type="checkbox" ${selected.has(u.id)?'checked':''} onchange="toggleSelect('${u.id}')">${avatar(u)}
      <div class="s-main"><strong>${esc(u.full_name||'No name')} ${planBadge(r)}</strong><small>${esc(u.email)}</small></div>
      <span class="chip">${esc(r.class||'—')}</span>
      <div class="fee"><b>${inr(p)}</b> / ${inr(total)}<div class="bar"><i style="width:${pct}%"></i></div></div>
      <div class="acts">
        <button class="icon-btn" data-tip="Add payment" onclick="openPay('${u.id}')">${ic('rupee')}</button>
        <button class="icon-btn" data-tip="Edit fees, class & plan" onclick="openEdit('${u.id}')">${ic('edit')}</button>
        <button class="icon-btn" data-tip="View bill" onclick="showReceipt('${u.id}')">${ic('receipt')}</button>
      </div></div>`;
  }).join('');
  renderHelp();
}
const avatar = u => u.avatar_url ? `<img class="avatar" src="${esc(u.avatar_url)}" alt="">` : `<div class="avatar">${esc((u.full_name||u.email||'U')[0].toUpperCase())}</div>`;

// ---------- Navigation ----------
function openTab(t){
  if(!document.getElementById('p-'+t) || (!ACCESS.isAdmin && ['plans','branding'].includes(t))) t='students';
  document.querySelectorAll('.panel').forEach(p=>p.hidden = p.id!=='p-'+t);
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b.dataset.t===t));
  CUR_TAB=t; history.replaceState(null,'','#'+t); window.scrollTo(0,0);
}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>openTab(b.dataset.t));
function closeModal(id){ $(id).style.display='none'; }
document.addEventListener('keydown',e=>{ if(e.key==='Escape') document.querySelectorAll('.overlay').forEach(o=>o.style.display='none'); });

// ---------- Edit / payments ----------
function openEdit(id){
  editId=id; const u=PROFILES.find(x=>x.id===id), r=RECORDS[id]||{};
  $('editName').textContent=u.full_name||u.email;
  setRadio('eClass',r.class||''); $('eTotal').value=r.total||''; renderPlanRadios(); setRadio('ePlan',r.sub?.plan||'free');
  $('editModal').style.display='flex';
}
function saveEdit(){
  const r=RECORDS[editId]||{}, plan=getRadio('ePlan')||'free';
  db.ref('students/'+editId).update({class:getRadio('eClass'),total:parseInt($('eTotal').value)||0,sub:(r.sub?.plan===plan&&r.sub)?r.sub:makeSub(plan)})
    .then(()=>{ toast("Saved"); closeModal('editModal'); });
}
function addPayment(id,amt,mode,note){
  return db.ref('students/'+id).transaction(d=>{
    d=d||{total:0,paid:0}; d.paid=(d.paid||0)+amt; d.payments=d.payments||{};
    d.payments['p'+Date.now()+Math.floor(Math.random()*999)]={amt,mode,note:note||'',date:Date.now()}; return d;
  });
}
function openPay(id){
  payId=id; const u=PROFILES.find(x=>x.id===id), r=RECORDS[id]||{};
  $('payName').textContent=u.full_name||u.email;
  $('payInfo').textContent=`Paid ${inr(r.paid)} of ${inr(r.total)} · Balance ${inr((r.total||0)-(r.paid||0))}`;
  $('pAmt').value=''; $('pNote').value=''; setRadio('pMode','Cash'); payPreview(); $('payModal').style.display='flex';
}
function savePayment(){
  const amt=parseInt($('pAmt').value); if(!amt||amt<=0) return toast("Enter a valid amount");
  const r=RECORDS[payId]||{}, bal=(r.total||0)-(r.paid||0);
  if(r.total && amt>bal && !confirm(`Amount is more than the balance (${inr(bal)}). Record anyway?`)) return;
  addPayment(payId,amt,getRadio('pMode')||'Cash',$('pNote').value.trim()).then(()=>{ toast("Payment recorded"); closeModal('payModal'); });
}

// ---------- Bulk ----------
function toggleSelect(id){
  selected.has(id)?selected.delete(id):selected.add(id);
  $('bulkBar').style.display=selected.size?'flex':'none';
  $('selCount').textContent=selected.size+' selected'; render();
}
function bulkFeeUpdate(){
  const amt=parseInt($('bulkAmt').value); if(!amt) return toast("Enter amount");
  selected.forEach(id=>addPayment(id,amt,'Cash','Bulk entry')); toast("Payment added"); $('bulkAmt').value='';
}
function bulkAssignPlan(){ const p=$('bulkPlan').value; selected.forEach(id=>db.ref('students/'+id+'/sub').set(makeSub(p))); toast("Plan assigned"); }
function clearSelected(){
  if(!confirm("Clear fees, payments & plan record of selected students? (Accounts stay untouched)")) return;
  selected.forEach(id=>db.ref('students/'+id).remove()); selected.clear(); $('bulkBar').style.display='none';
}
function exportCSV(){
  const rows=[['Name','Email','Class','Total','Paid','Due','Plan','Status']];
  PROFILES.forEach(u=>{ const r=RECORDS[u.id]||{}; rows.push([u.full_name||'',u.email||'',r.class||'',r.total||0,r.paid||0,(r.total||0)-(r.paid||0),PLANS[r.sub?.plan]?.name||'Free',feeState(r)]); });
  const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='students-fees.csv'; a.click();
}

// ---------- Branding assets ----------
function previewImg(input,id){
  const f=input.files[0]; if(!f) return;
  const rd=new FileReader();
  rd.onload=e=>{ const im=new Image(); im.onload=()=>{
    const k=Math.min(1,500/Math.max(im.width,im.height)), c=document.createElement('canvas');
    c.width=im.width*k; c.height=im.height*k; c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    $(id).src=c.toDataURL('image/png'); assetUI(); toast("Image ready — click Save branding"); }; im.src=e.target.result; };
  rd.readAsDataURL(f); input.value='';
}
function removeAsset(id){ $(id).removeAttribute('src'); assetUI(); toast("Removed — click Save branding"); }
function viewAsset(id,title){
  if(!$(id).getAttribute('src')) return toast("Nothing uploaded yet");
  $('viewTitle').textContent=title; $('viewImg').src=$(id).src; $('viewModal').style.display='flex';
}
function assetUI(){
  [['qr','qrPreview'],['sig','sigPreview']].forEach(([k,id])=>{
    const has=!!$(id).getAttribute('src');
    $(id).style.display=has?'block':'none'; $(k+'Ph').style.display=has?'none':'flex';
    $(k+'State').textContent=has?'Uploaded':'Missing'; $(k+'State').className=has?'ok':'';
  });
}
function saveSettings(){
  const d={name:$('cName').value.trim(),phone:$('cPhone').value.trim(),addr:$('cAddr').value.trim(),qr:$('qrPreview').getAttribute('src')||'',sig:$('sigPreview').getAttribute('src')||''};
  db.ref('settings').set(d).then(()=>toast("Branding saved"));
}

// ---------- Bill ----------
function showReceipt(id){
  const u=PROFILES.find(x=>x.id===id), r=RECORDS[id]||{}, b=SETTINGS, total=r.total||0, paid=r.paid||0, bal=total-paid, st=feeState(r);
  const pays=Object.values(r.payments||{}).sort((a,c)=>a.date-c.date), now=new Date();
  const no='PMR-'+now.toISOString().slice(2,10).replace(/-/g,'')+'-'+id.slice(0,4).toUpperCase();
  const av=u.avatar_url?`<img src="${esc(u.avatar_url)}" alt="">`:`<div class="av">${esc((u.full_name||'U')[0].toUpperCase())}</div>`;
  const hist=pays.length?pays.map((p,i)=>`<tr><td>${i+1}</td><td>${new Date(p.date).toLocaleDateString('en-IN')}</td><td>${esc(p.mode||'')}${p.note?' · '+esc(p.note):''}</td><td class="r">${inr(p.amt)}</td></tr>`).join('')
    :`<tr><td colspan="4" style="text-align:center;color:#888">No payments recorded</td></tr>`;
  $('printArea').innerHTML=`
    <div class="rc-top"><div><h2>${esc(b.name||'Your Coaching')}</h2><p>${esc(b.addr||'')}</p><p>${b.phone?'Mob: '+esc(b.phone):''}</p></div>
      <div class="rc-meta"><h3>FEE RECEIPT</h3><p>No: <b>${no}</b></p><p>Date: ${now.toLocaleDateString('en-IN')}</p></div></div>
    <div class="stamp ${st}">${st==='paid'?'PAID':st==='partial'?'PARTIAL':'DUE'}</div>
    <div class="rc-bill">${av}<div><b>${esc(u.full_name||u.email)}</b><span>${esc(u.email)}</span><span>Class: ${esc(r.class||'—')} · Plan: ${esc(PLANS[r.sub?.plan]?.name||'Free')}</span></div></div>
    <table class="rc-table"><tr><th>Description</th><th class="r">Amount</th></tr>
      <tr><td>Total course fees</td><td class="r">${inr(total)}</td></tr>
      <tr><td>Total paid</td><td class="r">${inr(paid)}</td></tr>
      <tr class="tot"><td>Balance due</td><td class="r">${inr(bal)}</td></tr></table>
    <div class="rc-h">Payment history</div>
    <table class="rc-table"><tr><th>#</th><th>Date</th><th>Mode / note</th><th class="r">Amount</th></tr>${hist}</table>
    <div class="receipt-footer">
      <div class="qr-sec">${bal>0&&b.qr?`<img src="${b.qr}" alt=""><span>Scan to pay balance</span>`:''}</div>
      <div class="sig-sec">${b.sig?`<img src="${b.sig}" alt="">`:'<div style="height:40px"></div>'}<span>Authorised signatory</span></div></div>
    <div class="rc-note">This is a computer generated receipt. Please keep it for your records.</div>
    <div class="modal-btns no-print">
      <button class="btn btn-primary" onclick="window.print()">${ic('print')}Print / Save PDF</button>
      <button class="btn btn-danger" onclick="closeModal('receiptModal')">${ic('close')}Close</button></div>`;
  $('receiptModal').style.display='flex';
}

// ---------- Help, onboarding & guidance ----------
function setupItems(){
  const noClass=PROFILES.filter(u=>!(RECORDS[u.id]||{}).class).length;
  return [
    [!!(SETTINGS.name&&SETTINGS.phone),'Coaching name & phone added','branding','Add coaching name & phone'],
    [!!SETTINGS.addr,'Address added','branding','Add your address'],
    [!!SETTINGS.qr,'Payment QR uploaded','branding','Upload payment QR'],
    [!!SETTINGS.sig,'Owner signature uploaded','branding','Upload signature'],
    [Object.keys(PLANS).length>1,'At least one paid plan created','plans','Create a paid plan'],
    [PROFILES.length>0&&noClass===0,PROFILES.length?(noClass?`${noClass} student(s) have no class set`:'All students have a class'):'No students found yet','students','Set student classes']
  ];
}
function renderHelp(){
  const it=setupItems();
  $('checklist').innerHTML=it.map(([ok,t,tab])=>`<div class="check ${ok?'ok':'no'}">${ic(ok?'check':'alert')}<span>${t}</span>${ok?'':`<a onclick="openTab('${tab}')">Fix</a>`}</div>`).join('');
  const done=it.filter(x=>x[0]).length, next=it.find(x=>!x[0]);
  let off=false; try{ off=localStorage.getItem('stBannerOff')==='1'; }catch(e){}
  $('setupBanner').innerHTML = (!next||off||!ACCESS.isAdmin) ? '' : `<div class="banner">
    <div class="banner-main"><b>Finish setup · ${done}/${it.length} done</b><div class="bar"><i style="width:${done/it.length*100}%"></i></div><small>Next: ${next[3]}</small></div>
    <button class="btn btn-light sm" onclick="openTab('${next[2]}')">Go</button>
    <button class="x" aria-label="Dismiss" onclick="try{localStorage.setItem('stBannerOff','1')}catch(e){};renderHelp()">${ic('close')}</button></div>`;
}
const TIPS={
  students:[['rupee','Record a payment','Tap the ₹ icon on a student. Use the quick chips for Full balance or +500.'],['receipt','Print a bill','Tap the receipt icon, then Print / Save PDF.'],['check','Bulk actions','Tick several students to add one payment or plan to all.'],['search','Find fast','Press / on a keyboard to jump to search.']],
  plans:[['gem','Create plans','Set price, validity and tick the features each plan unlocks.'],['info','Locks are off','Nothing is restricted until ENFORCE = true in stscript.js.']],
  branding:[['qr','QR & signature','Upload, then View to check them, and press Save branding.'],['building','Bill details','Name, phone and address appear on every bill.']],
  help:[['help','Need more?','Use the checklist and FAQ on this page.']]
};
function openQuickHelp(){
  $('qhTitle').textContent='Quick help · '+CUR_TAB[0].toUpperCase()+CUR_TAB.slice(1);
  $('qhBody').innerHTML=(TIPS[CUR_TAB]||[]).map(([i,h,t])=>`<div class="tip">${ic(i)}<div><b>${h}</b><p>${t}</p></div></div>`).join('');
  $('quickHelp').style.display='flex';
}
function resetFilters(){ $('searchBox').value=''; $('filterCls').value='All'; $('filterSt').value='all'; render(); }
function setAmt(v){
  const r=RECORDS[payId]||{}, bal=Math.max((r.total||0)-(r.paid||0),0);
  $('pAmt').value = v==='full' ? bal : (parseInt($('pAmt').value)||0)+v; payPreview();
}
function payPreview(){
  const r=RECORDS[payId]||{}, bal=(r.total||0)-(r.paid||0), a=parseInt($('pAmt').value)||0;
  $('payAfter').textContent = a ? `Balance after payment: ${inr(bal-a)}` : '';
  $('payAfter').className = 'after' + (a>bal&&r.total?' warn':'');
}
document.addEventListener('keydown',e=>{
  if(e.key==='/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && CUR_TAB==='students'){ e.preventDefault(); $('searchBox').focus(); }
});

// ---------- Boot ----------
window.onload = async ()=>{
  if(!(await checkAccess())) return;
  document.body.classList.remove('locked');
  if(!ACCESS.isAdmin) document.querySelectorAll('.admin-only').forEach(e=>e.style.display='none');
  openTab(location.hash.slice(1)||'students');
  loadPlans();
  db.ref('students').on('value',s=>{ RECORDS=s.val()||{}; render(); });
  loadProfiles();
  let filled=false;
  db.ref('settings').on('value',s=>{
    SETTINGS=s.val()||{};
    if(!filled){ filled=true;
      $('cName').value=SETTINGS.name||''; $('cPhone').value=SETTINGS.phone||''; $('cAddr').value=SETTINGS.addr||'';
      if(SETTINGS.qr) $('qrPreview').src=SETTINGS.qr; if(SETTINGS.sig) $('sigPreview').src=SETTINGS.sig; assetUI(); }
    renderHelp();
  });
};


// ---------- Radio helpers ----------
const getRadio = n => document.querySelector(`input[name="${n}"]:checked`)?.value ?? '';
const setRadio = (n,v) => { const e=document.querySelector(`input[name="${n}"][value="${v}"]`); if(e) e.checked=true; };
function renderPlanRadios(){
  const box=$('ePlanRadios'); if(!box) return;
  const cur=getRadio('ePlan')||'free';
  box.innerHTML=Object.keys(PLANS).map(k=>`<label class="radio plan"><input type="radio" name="ePlan" value="${esc(k)}"><span><b>${esc(PLANS[k].name)}</b><small>${PLANS[k].price?inr(PLANS[k].price)+(PLANS[k].days?' · '+PLANS[k].days+'d':''):'Free'}</small></span></label>`).join('');
  setRadio('ePlan',cur);
}

// ---------- Signature pad (draw on screen) ----------
let sigStrokes=[], sigCur=null;
const sigC=$('sigCanvas'), sigX=sigC.getContext('2d');
function sigRedraw(){
  const d=window.devicePixelRatio||1;
  sigX.setTransform(1,0,0,1,0,0); sigX.clearRect(0,0,sigC.width,sigC.height); sigX.setTransform(d,0,0,d,0,0);
  sigX.lineCap=sigX.lineJoin='round'; sigX.lineWidth=2.6;
  sigStrokes.forEach(s=>{ sigX.strokeStyle=s.color; sigX.beginPath();
    s.pts.forEach(([x,y],i)=>i?sigX.lineTo(x,y):sigX.moveTo(x,y));
    if(s.pts.length===1) sigX.lineTo(s.pts[0][0]+.1,s.pts[0][1]); sigX.stroke(); });
}
function openSigPad(){
  $('sigModal').style.display='flex';
  const d=window.devicePixelRatio||1; sigC.width=sigC.clientWidth*d; sigC.height=sigC.clientHeight*d;
  sigStrokes=[]; sigRedraw();
}
sigC.addEventListener('pointerdown',e=>{ e.preventDefault(); sigC.setPointerCapture(e.pointerId); sigCur={color:getRadio('sigColor')||'#111827',pts:[[e.offsetX,e.offsetY]]}; sigStrokes.push(sigCur); sigRedraw(); });
sigC.addEventListener('pointermove',e=>{ if(!sigCur) return; sigCur.pts.push([e.offsetX,e.offsetY]); sigRedraw(); });
['pointerup','pointercancel','pointerleave'].forEach(t=>sigC.addEventListener(t,()=>{ sigCur=null; }));
function sigUndo(){ sigStrokes.pop(); sigRedraw(); }
function sigClear(){ sigStrokes=[]; sigRedraw(); }
function sigUse(){
  if(!sigStrokes.length) return toast("Draw your signature first");
  const w=sigC.width,h=sigC.height,px=sigX.getImageData(0,0,w,h).data; let x0=w,y0=h,x1=0,y1=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) if(px[(y*w+x)*4+3]>10){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  const pad=8; x0=Math.max(0,x0-pad); y0=Math.max(0,y0-pad); x1=Math.min(w,x1+pad); y1=Math.min(h,y1+pad);
  const cw=x1-x0, ch=y1-y0, k=Math.min(1,500/cw), o=document.createElement('canvas');
  o.width=cw*k; o.height=ch*k; o.getContext('2d').drawImage(sigC,x0,y0,cw,ch,0,0,o.width,o.height);
  $('sigPreview').src=o.toDataURL('image/png'); assetUI(); closeModal('sigModal'); toast("Signature ready — click Save branding");
}
