/* admin-pending.js — admin-panel.html me "Pending Uploads" section khud jod deta hai.
   admin-panel.html me admin.js ke BAAD ye line daalo:  <script src="admin-pending.js"></script> */
(function () {
  'use strict';
  const BUCKET = 'admin-files';
  const sb = () => window.supabaseClient;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // line-style SVG icons
  const I = d => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px" aria-hidden="true">${d}</svg>`;
  const IC = {
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    formula: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h4"/>'
  };

  const sec = document.createElement('section');
  sec.className = 'box';
  sec.id = 'pendingBox';
  sec.innerHTML = `<h3>${I(IC.clock)}Pending Uploads <span id="pendCount" class="badge" style="position:static;display:inline-block">0</span>
    <button id="pendRefresh" title="Refresh" aria-label="Refresh" style="float:right;padding:6px 10px;display:inline-flex;align-items:center">${I(IC.refresh).replace('margin-right:5px', 'margin-right:0')}</button></h3><div id="pendList">Loading...</div>`;
  const first = document.querySelector('section.box');
  if (first && first.parentNode) first.parentNode.insertBefore(sec, first); else document.body.appendChild(sec);
  document.getElementById('pendRefresh').addEventListener('click', () => pendLoad());

  let rows = [];

  async function pendLoad() {
    const list = document.getElementById('pendList');
    list.innerHTML = 'Loading...';
    const [n, f] = await Promise.all([
      sb().from('notes').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      sb().from('formulas').select('*').eq('status', 'pending').order('created_at', { ascending: false })
    ]);
    if (n.error || f.error) { list.innerHTML = 'Error: ' + esc((n.error || f.error).message); return; }
    rows = [
      ...(n.data || []).map(r => ({ t: 'notes', r, title: `Class ${r.class} · ${r.subject} · Ch ${r.chapter_number}`, name: r.chapter_name, by: r.uploaded_by })),
      ...(f.data || []).map(r => ({ t: 'formulas', r, title: `Class ${r.class} · ${r.subject} · Ch ${r.chapter} · ${r.category}`, name: r.chapter_name, by: r.user_id }))
    ];
    document.getElementById('pendCount').textContent = rows.length;
    if (!rows.length) { list.innerHTML = '<em style="color:#b9c9e0">Koi pending upload nahi</em>'; return; }

    // id uuid bhi ho sakti hai, isliye buttons me sirf index (data-i) jaata hai
    list.innerHTML = rows.map((x, i) => `
      <div style="background:#0f1424;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px;margin-bottom:8px">
        <div style="font-size:12px;color:#9fb0cc">${I(x.t === 'notes' ? IC.note : IC.formula)}${x.t === 'notes' ? 'Notes' : 'Formula'} · user ${esc(String(x.by || '').slice(0, 8))}</div>
        <div style="font-weight:600;margin:2px 0">${esc(x.name)}</div>
        <div style="font-size:13px;color:#b9c9e0">${esc(x.title)}</div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
          <button data-act="view" data-i="${i}">${I(IC.eye)}Dekho</button>
          <button data-act="ok" data-i="${i}">${I(IC.check)}Approve</button>
          <button data-act="no" data-i="${i}">${I(IC.trash)}Reject</button>
        </div></div>`).join('');
  }
  window.pendLoad = pendLoad;


  /* ---------- EDIT + APPROVE PANEL ---------- */
  const CLASSES_N = [['9', 'Class 9'], ['10', 'Class 10'], ['11', 'Class 11'], ['12', 'Class 12']];
  const CLASSES_F = CLASSES_N.concat([['jee', 'JEE'], ['neet', 'NEET']]);
  const SUBJ_N = [['physics', 'Physics'], ['chemistry', 'Chemistry'], ['maths', 'Maths'], ['biology', 'Biology'], ['history', 'History'], ['geography', 'Geography'], ['civics', 'Civics'], ['economics', 'Economics'], ['hindi', 'Hindi'], ['english', 'English']];
  const SUBJ_F = SUBJ_N.slice(0, 4);
  const CATS = [['mind_map', 'Mind Map'], ['short_notes', 'Short Notes'], ['other', 'Other']];
  const CHAPS = Array.from({ length: 20 }, (_, i) => [String(i + 1), 'Chapter ' + (i + 1)]);

  function opts(list, val) {
    const l = list.slice(); val = val == null ? '' : String(val);
    if (val && !l.some(o => o[0] === val)) l.unshift([val, val]);        // user ne jo likha wo bhi dikhe
    return '<option value="">Chuno</option>' + l.map(o => `<option value="${esc(o[0])}" ${o[0] === val ? 'selected' : ''}>${esc(o[1])}</option>`).join('');
  }

  function openEdit(x) {
    const r = x.r, isF = x.t === 'formulas';
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(5,8,18,.8);display:flex;align-items:flex-end;justify-content:center';
    const f = 'width:100%;box-sizing:border-box;padding:12px;background:#0f1424;border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:10px;font-size:15px;outline:none';
    const lab = 'display:block;font-size:12px;color:#9fb0cc;margin:10px 0 4px';
    ov.innerHTML = `<div style="width:100%;max-width:520px;max-height:92vh;overflow:auto;background:#151a2b;color:#fff;border-radius:20px 20px 0 0;padding:18px 16px 22px">
      <h3 style="margin:0 0 2px">${I(IC.check)}Check karke Approve karo</h3>
      <div style="font-size:13px;color:#9fb0cc">${isF ? 'Formula' : 'Notes'} · user ${esc(String(x.by || '').slice(0, 8))} — galat ho to yahin sahi kar do</div>
      <label style="${lab}">Class</label><select id="pdCls" style="${f}">${opts(isF ? CLASSES_F : CLASSES_N, r.class)}</select>
      <label style="${lab}">Subject</label><select id="pdSub" style="${f}">${opts(isF ? SUBJ_F : SUBJ_N, (r.subject || '').toLowerCase())}</select>
      <label style="${lab}">Chapter</label><select id="pdCh" style="${f}">${opts(CHAPS, isF ? String(r.chapter || '').replace(/\D/g, '') : r.chapter_number)}</select>
      ${isF ? `<label style="${lab}">Category</label><select id="pdCat" style="${f}">${opts(CATS, r.category)}</select>` : ''}
      <label style="${lab}">Naam</label><input id="pdName" style="${f}" value="${esc(r.chapter_name)}">
      <div style="display:flex;gap:10px;margin-top:16px">
        <button id="pdView" style="flex:1;padding:12px">${I(IC.eye)}Dekho</button>
        <button id="pdCancel" style="flex:1;padding:12px">Cancel</button>
        <button id="pdOk" style="flex:1.4;padding:12px">${I(IC.check)}Approve</button></div>
      <div id="pdMsg" style="margin-top:10px;font-size:13px;color:#ffb4b4;min-height:16px"></div></div>`;
    document.body.appendChild(ov);
    const q = id => ov.querySelector('#' + id);
    const close = () => ov.remove();
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    q('pdCancel').onclick = close;
    q('pdView').onclick = () => {
      const name = [r.class ? 'Class ' + r.class : '', (r.subject || '').toUpperCase(), r.chapter_name || ''].filter(Boolean).join(' \u2022 ') || 'Document';
      const viewer = (isF && r.type === 'image') ? 'image-viewer.html' : 'notes-viewer.html';
      location.href = `${viewer}?path=${encodeURIComponent(r.file_path)}&name=${encodeURIComponent(name)}`;
    };
    q('pdOk').onclick = async () => {
      const cls = q('pdCls').value, sub = q('pdSub').value, ch = q('pdCh').value, name = q('pdName').value.trim(), cat = isF ? q('pdCat').value : 'x';
      const msg = q('pdMsg');
      if (!cls || !sub || !ch || !name || !cat) { msg.textContent = 'Saari details bharo'; return; }
      const btn = q('pdOk'); btn.disabled = true; msg.style.color = '#9fb0cc'; msg.textContent = 'Save ho raha hai...';
      const patch = isF
        ? { class: cls, subject: sub, chapter: ch, chapter_name: name, category: cat, status: 'approved', publish: true }
        : { class: cls, subject: sub, chapter_number: parseInt(ch, 10), chapter_name: name, status: 'approved' };
      const { data: done, error } = await sb().from(x.t).update(patch).eq('id', r.id).select('id');
      if (error || !done || !done.length) {
        btn.disabled = false; msg.style.color = '#ffb4b4';
        msg.textContent = error ? 'Fail: ' + error.message : 'Permission nahi mili (admin email check karo)';
        return;
      }
      close(); await pendLoad();
      try { if (window.updateStats) updateStats(); if (!isF && window.loadFiles) loadFiles(); if (isF && window.loadFormulas) loadFormulas(); } catch (_) {}
    };
  }

  document.getElementById('pendList').addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const x = rows[+b.dataset.i]; if (!x) return;
    const act = b.dataset.act, r = x.r;

    if (act === 'view') {
      const name = [r.class ? 'Class ' + r.class : '', (r.subject || '').toUpperCase(), r.chapter_name || ''].filter(Boolean).join(' \u2022 ') || 'Document';
      const viewer = (x.t === 'formulas' && r.type === 'image') ? 'image-viewer.html' : 'notes-viewer.html';
      location.href = `${viewer}?path=${encodeURIComponent(r.file_path)}&name=${encodeURIComponent(name)}`;
      return;
    }
    if (act === 'ok') { openEdit(x); return; }
    b.disabled = true;
    if (act === 'no') {
      if (!confirm('Reject karke file delete kar dein?')) { b.disabled = false; return; }
      if (r.file_path) await sb().storage.from(BUCKET).remove([r.file_path]);
      const { data: gone, error } = await sb().from(x.t).delete().eq('id', r.id).select('id');
      if (error) { b.disabled = false; return alert('Reject fail: ' + error.message); }
      if (!gone || !gone.length) { b.disabled = false; return alert('Reject nahi hua: permission nahi mili (admin email check karo).'); }
      pendLoad();
    }
  });

  // admin pehchaan check: agar database aapko admin nahi maanta to yahan warning dikhegi
  sb().rpc('is_admin').then(({ data, error }) => {
    if (error || data === true) return;
    const w = document.createElement('div');
    w.style.cssText = 'background:#3a1620;border:1px solid #ff6b81;color:#ffd0d8;border-radius:10px;padding:10px;margin-bottom:10px;font-size:13px';
    w.textContent = 'Warning: database aapko admin nahi maan raha. uploads.sql me jo email likha hai wo isi login ke email se match nahi kar raha, isliye Approve kaam nahi karega.';
    sec.insertBefore(w, document.getElementById('pendList'));
  });

  pendLoad();
})();
