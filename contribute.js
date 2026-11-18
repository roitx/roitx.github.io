/* =====================================================================
   contribute.js — User Upload (Notes + Formulas) with HIGH-QUALITY SCAN
   Har page par bas ek line:  <script src="contribute.js"></script>
   (site.js ke BAAD, </body> se pehle)
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- CONFIG (zarurat ho to page me window.CONTRIB_CONFIG se badlo) ---------- */
  const CFG = Object.assign({
    loginUrl: 'login.html',     // <-- apna login page yahan likho
    bucket: 'admin-files',
    maxPdfMB: 15,
    maxImgMB: 10,
    maxPages: 30,
    srcMax: 2800,               // scan ke liye source photo ki max side (px)
    outMax: 2300,               // final page ki max side (px)  ~ A4 pe ~200 DPI
    jpegQ: 0.9
  }, window.CONTRIB_CONFIG || {});

  const IS_FORMULAS = !!document.getElementById('formulaList');
  const sb = () => window.supabaseClient;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mb = n => n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1) + ' MB';

  /* ---------- SVG ICONS (line style, site ke icons jaisa) ---------- */
  const I = (d, z) => `<svg width="${z || 20}" height="${z || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    upload: I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>', 24),
    upload18: I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>', 18),
    scan: I('<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>', 24),
    camera: I('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'),
    image: I('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
    file: I('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>', 18),
    check: I('<polyline points="20 6 9 17 4 12"/>'),
    checkCircle: I('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>', 34),
    rotate: I('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>'),
    back: I('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>'),
    next: I('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'),
    close: I('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
    crop: I('<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>')
  };
  const tick = () => new Promise(r => setTimeout(r, 30));

  let currentSubject = null;     // subject page me jo card tap hua
  const state = { file: null, source: null };

  /* =====================================================================
     CSS
     ===================================================================== */
  const css = `
  .cx-ov{position:fixed;inset:0;z-index:10050;background:rgba(5,8,18,.72);display:flex;align-items:flex-end;justify-content:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .cx-sheet{width:100%;max-width:520px;max-height:92vh;overflow:auto;background:#151a2b;color:#fff;border-radius:20px 20px 0 0;padding:18px 16px 22px;box-shadow:0 -8px 30px rgba(0,0,0,.5);animation:cxUp .25s ease}
  @keyframes cxUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
  .cx-sheet h3{margin:0 0 4px;font-size:18px}
  .cx-sub{margin:0 0 14px;font-size:13px;color:#9fb0cc}
  .cx-opt{display:flex;gap:12px;align-items:center;width:100%;text-align:left;background:#1e2540;border:1px solid rgba(255,255,255,.14);color:#fff;border-radius:14px;padding:14px;margin-bottom:10px;font-size:15px;cursor:pointer}
  .cx-opt b{display:block;font-size:15px}.cx-opt small{color:#9fb0cc;font-size:12px}
  .cx-opt .ic{flex:none;width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:rgba(124,77,255,.16);color:#a9b6ff}
  .cx-btn,.cx-top button{display:inline-flex;align-items:center;justify-content:center;gap:7px}
  .cx-file svg{flex:none;color:#a9b6ff}.cx-file span{display:flex;align-items:center;gap:8px;min-width:0}.cx-file span em{font-style:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .cx-ok{text-align:center;padding:6px 0 4px}.cx-ok svg{color:#8ff0b0}
  .cx-field{margin-bottom:10px}
  .cx-field label{display:block;font-size:12px;color:#9fb0cc;margin-bottom:4px}
  .cx-field select,.cx-field input{width:100%;box-sizing:border-box;padding:12px;background:#0f1424;border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:10px;font-size:15px;outline:none}
  .cx-field select:focus,.cx-field input:focus{border-color:#7c4dff}
  .cx-chip{display:inline-block;background:#0f1424;border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:10px 12px;font-size:14px;width:100%;box-sizing:border-box}
  .cx-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .cx-file{display:flex;justify-content:space-between;align-items:center;gap:8px;background:#0f1424;border:1px dashed #7c4dff;border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:13px}
  .cx-file span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .cx-btn{border:0;border-radius:12px;padding:13px 16px;font-size:15px;font-weight:600;color:#fff;background:linear-gradient(135deg,#7c4dff,#3d5afe);cursor:pointer}
  .cx-btn.sec{background:#262d4a}.cx-btn.full{width:100%}.cx-btn:disabled{opacity:.5}
  .cx-actions{display:flex;gap:10px;margin-top:6px}.cx-actions .cx-btn{flex:1}
  .cx-msg{margin-top:10px;font-size:13px;min-height:18px;color:#ffb4b4}.cx-msg.ok{color:#8ff0b0}
  .cx-fab{display:inline-flex;align-items:center;gap:6px;position:fixed;right:25px;bottom:25px;z-index:9999;height:52px;padding:0 18px;border-radius:26px;border:1px solid rgba(255,255,255,.3);background:linear-gradient(135deg,#7c4dff,#3d5afe);color:#fff;font-weight:600;font-size:14px;box-shadow:0 0 18px rgba(61,90,254,.6),0 6px 15px rgba(0,0,0,.4);cursor:pointer}
  /* scanner */
  .cx-fab svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
  #cx-scan{position:fixed;inset:0;z-index:10100;background:#0b0e18;color:#fff;display:flex;flex-direction:column;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .cx-top{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.1);font-weight:600}
  .cx-top button{background:none;border:0;color:#fff;font-size:15px;padding:6px 8px}
  .cx-main{flex:1;min-height:0;display:flex;flex-direction:column}
  .cx-stage{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#05070d}
  .cx-stage canvas{max-width:100%;max-height:100%;touch-action:none}
  .cx-bar{padding:10px 12px 14px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;border-top:1px solid rgba(255,255,255,.1)}
  .cx-bar .cx-btn{padding:11px 14px;font-size:14px}
  .cx-chips{display:flex;gap:8px;justify-content:center;padding:8px 0 0;width:100%}
  .cx-chips button{flex:1;max-width:120px;padding:9px 6px;border-radius:20px;border:1px solid rgba(255,255,255,.2);background:#1a2038;color:#fff;font-size:13px}
  .cx-chips button.on{background:#3d5afe;border-color:#7c4dff}
  .cx-pages{flex:1;overflow:auto;padding:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-content:start}
  .cx-pg{position:relative;background:#151a2b;border-radius:8px;overflow:hidden;aspect-ratio:3/4;border:1px solid rgba(255,255,255,.12)}
  .cx-pg img{width:100%;height:100%;object-fit:cover}
  .cx-pg i{position:absolute;left:4px;bottom:4px;background:rgba(0,0,0,.65);font-style:normal;font-size:11px;padding:2px 6px;border-radius:8px}
  .cx-pg b{position:absolute;right:4px;top:4px;width:24px;height:24px;border-radius:50%;background:rgba(220,40,60,.9);text-align:center;line-height:24px;font-size:14px}
  .cx-empty{grid-column:1/-1;text-align:center;color:#9fb0cc;padding:50px 10px;font-size:14px}
  .cx-busy{position:absolute;inset:0;background:rgba(5,8,18,.75);display:none;align-items:center;justify-content:center;font-size:15px;z-index:3}
  .cx-tip{font-size:12px;color:#9fb0cc;text-align:center;padding:6px 10px 0}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* =====================================================================
     SMALL HELPERS
     ===================================================================== */
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('Script load nahi hui'));
      document.head.appendChild(s);
    });
  }
  async function getJsPDF() {
    if (!window.jspdf) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    return window.jspdf.jsPDF;
  }
  const blobToDataURL = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
  const canvasToBlob = (c, q) => new Promise(r => c.toBlob(r, 'image/jpeg', q));

  async function loadSourceCanvas(file) {
    let bmp = null;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) {
      bmp = await new Promise((res, rej) => {
        const img = new Image(); const u = URL.createObjectURL(file);
        img.onload = () => { res(img); }; img.onerror = rej; img.src = u;
      });
    }
    const w = bmp.width, h = bmp.height;
    const k = Math.min(1, CFG.srcMax / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(bmp, 0, 0, c.width, c.height);
    if (bmp.close) bmp.close();
    return c;
  }

  /* =====================================================================
     SCAN ENGINE — perspective fix + shadow removal + document filters
     ===================================================================== */

  // 4 corner (TL,TR,BR,BL) se seedha (flat) page banata hai — real perspective warp
  function warp(src, c) {
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    let W = Math.max(dist(c[0], c[1]), dist(c[3], c[2]));
    let Hh = Math.max(dist(c[0], c[3]), dist(c[1], c[2]));
    const k = Math.min(1, CFG.outMax / Math.max(W, Hh));
    W = Math.max(60, Math.round(W * k)); Hh = Math.max(60, Math.round(Hh * k));

    const sw = src.width, sh = src.height;
    const sd = src.getContext('2d').getImageData(0, 0, sw, sh).data;
    const out = document.createElement('canvas'); out.width = W; out.height = Hh;
    const octx = out.getContext('2d');
    const oi = octx.createImageData(W, Hh); const od = oi.data;

    // unit square -> quad homography (Heckbert)
    const [p0, p1, p2, p3] = c;
    const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
    const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
    let A, B, C, D, E, F, G = 0, Hq = 0;
    if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
      A = p1.x - p0.x; B = p2.x - p1.x; C = p0.x; D = p1.y - p0.y; E = p2.y - p1.y; F = p0.y;
    } else {
      const den = dx1 * dy2 - dx2 * dy1;
      G = (dx3 * dy2 - dx2 * dy3) / den; Hq = (dx1 * dy3 - dx3 * dy1) / den;
      A = p1.x - p0.x + G * p1.x; B = p3.x - p0.x + Hq * p3.x; C = p0.x;
      D = p1.y - p0.y + G * p1.y; E = p3.y - p0.y + Hq * p3.y; F = p0.y;
    }
    let o = 0;
    for (let y = 0; y < Hh; y++) {
      const v = y / (Hh - 1);
      for (let x = 0; x < W; x++, o += 4) {
        const u = x / (W - 1);
        const den = G * u + Hq * v + 1;
        let X = (A * u + B * v + C) / den, Y = (D * u + E * v + F) / den;
        if (X < 0) X = 0; else if (X > sw - 1.001) X = sw - 1.001;
        if (Y < 0) Y = 0; else if (Y > sh - 1.001) Y = sh - 1.001;
        const x0 = X | 0, y0 = Y | 0, fx = X - x0, fy = Y - y0;
        const i = (y0 * sw + x0) * 4, j = i + sw * 4;
        const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
        od[o]     = sd[i]     * w00 + sd[i + 4] * w10 + sd[j]     * w01 + sd[j + 4] * w11;
        od[o + 1] = sd[i + 1] * w00 + sd[i + 5] * w10 + sd[j + 1] * w01 + sd[j + 5] * w11;
        od[o + 2] = sd[i + 2] * w00 + sd[i + 6] * w10 + sd[j + 2] * w01 + sd[j + 6] * w11;
        od[o + 3] = 255;
      }
    }
    octx.putImageData(oi, 0, 0);
    return out;
  }

  function rotate90(c) {
    const r = document.createElement('canvas'); r.width = c.height; r.height = c.width;
    const x = r.getContext('2d'); x.translate(r.width, 0); x.rotate(Math.PI / 2); x.drawImage(c, 0, 0);
    return r;
  }

  // Paper ka background estimate (block-wise 70th percentile) -> shadow/pila-pan hatata hai,
  // pen ka rang (neela/kala) waisa hi rehta hai.
  function cleanFilter(srcC, bw) {
    const W = srcC.width, H = srcC.height;
    const ctx = srcC.getContext('2d'); const img = ctx.getImageData(0, 0, W, H); const d = img.data;
    const Bk = Math.max(24, Math.round(Math.max(W, H) / 36));
    const gx = Math.ceil(W / Bk), gy = Math.ceil(H / Bk);
    const bg = [new Float32Array(gx * gy), new Float32Array(gx * gy), new Float32Array(gx * gy)];
    const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    for (let by = 0; by < gy; by++) for (let bx = 0; bx < gx; bx++) {
      hist[0].fill(0); hist[1].fill(0); hist[2].fill(0);
      const x1 = Math.min(W, (bx + 1) * Bk), y1 = Math.min(H, (by + 1) * Bk);
      let n = 0;
      for (let y = by * Bk; y < y1; y += 2) for (let x = bx * Bk; x < x1; x += 2) {
        const i = (y * W + x) * 4; hist[0][d[i]]++; hist[1][d[i + 1]]++; hist[2][d[i + 2]]++; n++;
      }
      const target = n * 0.7;
      for (let ch = 0; ch < 3; ch++) {
        let acc = 0, v = 255;
        for (let k = 0; k < 256; k++) { acc += hist[ch][k]; if (acc >= target) { v = k; break; } }
        bg[ch][by * gx + bx] = Math.max(v, 40);
      }
    }
    // bilinear interpolation weights (precomputed)
    const ix0 = new Int32Array(W), ix1 = new Int32Array(W), wx = new Float32Array(W);
    for (let x = 0; x < W; x++) {
      let f = x / Bk - 0.5; if (f < 0) f = 0; if (f > gx - 1) f = gx - 1;
      const a = f | 0; ix0[x] = a; ix1[x] = Math.min(gx - 1, a + 1); wx[x] = f - a;
    }
    const LO = 45, HI = 225, sc = 255 / (HI - LO);
    for (let y = 0; y < H; y++) {
      let f = y / Bk - 0.5; if (f < 0) f = 0; if (f > gy - 1) f = gy - 1;
      const ya = f | 0, yb = Math.min(gy - 1, ya + 1), wy = f - ya;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4, a = ix0[x], b = ix1[x], w = wx[x];
        const r0 = ya * gx, r1 = yb * gx;
        let r = 0, g = 0, bl = 0;
        for (let ch = 0; ch < 3; ch++) {
          const t = bg[ch];
          const top = t[r0 + a] * (1 - w) + t[r0 + b] * w;
          const bot = t[r1 + a] * (1 - w) + t[r1 + b] * w;
          const bgv = top * (1 - wy) + bot * wy;
          let v = d[i + ch] * 255 / bgv;                 // paper -> 255
          v = (v - LO) * sc;                               // levels
          if (ch === 0) r = v; else if (ch === 1) g = v; else bl = v;
        }
        if (bw) {
          let L = 0.299 * r + 0.587 * g + 0.114 * bl;
          L = (L - 95) / (190 - 95); L = L < 0 ? 0 : L > 1 ? 1 : L;
          L = L * L * (3 - 2 * L) * 255;
          d[i] = d[i + 1] = d[i + 2] = L;
        } else {
          d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
          d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
          d[i + 2] = bl < 0 ? 0 : bl > 255 ? 255 : bl;
        }
      }
    }
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    out.getContext('2d').putImageData(img, 0, 0);
    return out;
  }

  function applyFilter(base, mode) {
    if (mode === 'orig') return base;
    return cleanFilter(base, mode === 'bw');
  }

  async function recompress(blob, scale, q) {
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, c.width, c.height);
    return { blob: await canvasToBlob(c, q), w: c.width, h: c.height };
  }

  async function buildPdf(pages) {
    const jsPDF = await getJsPDF();
    let doc = null;
    for (const p of pages) {
      const land = p.w > p.h;
      const pw = land ? 297 : 210, ph = pw * p.h / p.w;
      if (!doc) doc = new jsPDF({ orientation: land ? 'l' : 'p', unit: 'mm', format: [pw, ph], compress: true });
      else doc.addPage([pw, ph], land ? 'l' : 'p');
      doc.addImage(await blobToDataURL(p.blob), 'JPEG', 0, 0, pw, ph, undefined, 'FAST');
    }
    return doc.output('blob');
  }

  /* =====================================================================
     SCANNER UI
     ===================================================================== */
  function runScanner() {
    return new Promise(resolve => {
      getJsPDF().catch(() => {});                        // pehle se load kar lo
      const pages = [];                                   // {blob,w,h,thumb,file,corners,filter,rot}
      const root = document.createElement('div'); root.id = 'cx-scan';
      document.body.appendChild(root);
      const finish = v => { root.remove(); resolve(v); };

      const camIn = document.createElement('input');
      camIn.type = 'file'; camIn.accept = 'image/*'; camIn.setAttribute('capture', 'environment');
      const galIn = document.createElement('input');
      galIn.type = 'file'; galIn.accept = 'image/*'; galIn.multiple = true;
      camIn.style.display = galIn.style.display = 'none';
      root.append(camIn, galIn);

      async function handleFiles(files) {
        for (const f of files) {
          if (pages.length >= CFG.maxPages) { alert('Max ' + CFG.maxPages + ' pages'); break; }
          const res = await editPage(root, f, null);
          if (res) pages.push(res);
        }
        renderList();
      }
      camIn.onchange = async () => { const f = [...camIn.files]; camIn.value = ''; if (f.length) await handleFiles(f); };
      galIn.onchange = async () => { const f = [...galIn.files]; galIn.value = ''; if (f.length) await handleFiles(f); };

      function renderList() {
        let list = root.querySelector('.cx-list'); if (list) list.remove();
        const wrap = document.createElement('div'); wrap.className = 'cx-list'; wrap.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0';
        wrap.innerHTML = `
          <div class="cx-top"><button id="cxX">${ICON.close} Band</button><span>Scan (${pages.length} page)</span><span style="width:60px"></span></div>
          <div class="cx-pages"></div>
          <div class="cx-tip">Tip: page ko tap karke dobara edit kar sakte ho</div>
          <div class="cx-bar">
            <button class="cx-btn sec" id="cxCam">${ICON.camera} Camera</button>
            <button class="cx-btn sec" id="cxGal">${ICON.image} Gallery</button>
            <button class="cx-btn" id="cxMk" ${pages.length ? '' : 'disabled'}>${ICON.check} PDF banao</button>
          </div>`;
        root.appendChild(wrap);
        const grid = wrap.querySelector('.cx-pages');
        if (!pages.length) grid.innerHTML = '<div class="cx-empty">Abhi koi page nahi.<br>Neeche se camera ya gallery chuno.<br><br>Acchi quality ke liye: roshni me, page ko seedha rakhkar photo lo.</div>';
        pages.forEach((p, i) => {
          const d = document.createElement('div'); d.className = 'cx-pg';
          d.innerHTML = `<img src="${p.thumb}"><i>${i + 1}</i><b>×</b>`;
          d.querySelector('b').onclick = e => { e.stopPropagation(); pages.splice(i, 1); renderList(); };
          d.onclick = async () => { const r = await editPage(root, p.file, p); if (r) pages[i] = r; renderList(); };
          grid.appendChild(d);
        });
        wrap.querySelector('#cxX').onclick = () => { if (!pages.length || confirm('Scan cancel karein? Pages hat jayenge.')) finish(null); };
        wrap.querySelector('#cxCam').onclick = () => camIn.click();
        wrap.querySelector('#cxGal').onclick = () => galIn.click();
        wrap.querySelector('#cxMk').onclick = async () => {
          const btn = wrap.querySelector('#cxMk'); btn.disabled = true; btn.textContent = 'PDF ban rahi hai…';
          try {
            let use = pages.map(p => ({ blob: p.blob, w: p.w, h: p.h }));
            let pdf = await buildPdf(use);
            if (pdf.size > CFG.maxPdfMB * 1048576) {         // zyada bhaari -> thoda compress
              use = []; for (const p of pages) use.push(await recompress(p.blob, 0.75, 0.75));
              pdf = await buildPdf(use);
            }
            if (pdf.size > CFG.maxPdfMB * 1048576) throw new Error('PDF ' + mb(pdf.size) + ' hai, limit ' + CFG.maxPdfMB + ' MB. Pages kam karo.');
            finish(pdf);
          } catch (e) { alert('' + e.message); btn.disabled = false; btn.innerHTML = ICON.check + ' PDF banao'; }
        };
      }
      renderList();
      camIn.click();                                      // seedha camera khol do
    });
  }

  // ---- ek page ka editor: crop (4 corners) -> filter ----
  function editPage(root, file, prev) {
    return new Promise(async resolve => {
      const ed = document.createElement('div'); ed.style.cssText = 'position:absolute;inset:0;background:#0b0e18;display:flex;flex-direction:column;z-index:5';
      ed.innerHTML = `<div class="cx-top"><button id="eBack">${ICON.back} Wapas</button><span id="eTitle">Page kaato</span><span style="width:60px"></span></div>
        <div class="cx-stage" id="eStage"><canvas id="eCv"></canvas><div class="cx-busy" id="eBusy">Processing…</div></div>
        <div id="eBar"></div>`;
      root.appendChild(ed);
      const stage = ed.querySelector('#eStage'), cv = ed.querySelector('#eCv'), busy = ed.querySelector('#eBusy'), bar = ed.querySelector('#eBar');
      const setBusy = b => busy.style.display = b ? 'flex' : 'none';
      const close = v => { ed.remove(); resolve(v); };
      ed.querySelector('#eBack').onclick = () => close(null);

      setBusy(true);
      let src;
      try { src = await loadSourceCanvas(file); }
      catch (e) { alert('Photo load nahi hui'); return close(null); }
      setBusy(false);

      let corners = prev ? prev.corners.map(c => ({ x: c.x * src.width, y: c.y * src.height }))
        : [0.06, 0.06, 0.94, 0.06, 0.94, 0.94, 0.06, 0.94].reduce((a, v, i, arr) => (i % 2 ? a : a.concat({ x: arr[i] * src.width, y: arr[i + 1] * src.height })), []);
      let scale = 1, active = -1;

      /* ---------- STEP 1 : CROP ---------- */
      function layoutCrop() {
        const aw = stage.clientWidth - 24, ah = stage.clientHeight - 24;
        scale = Math.min(aw / src.width, ah / src.height);
        cv.width = Math.round(src.width * scale); cv.height = Math.round(src.height * scale);
        drawCrop();
      }
      function drawCrop() {
        const x = cv.getContext('2d');
        x.clearRect(0, 0, cv.width, cv.height);
        x.drawImage(src, 0, 0, cv.width, cv.height);
        x.save(); x.fillStyle = 'rgba(0,0,0,.55)'; x.beginPath(); x.rect(0, 0, cv.width, cv.height);
        corners.forEach((c, i) => i ? x.lineTo(c.x * scale, c.y * scale) : x.moveTo(c.x * scale, c.y * scale)); x.closePath();
        x.fill('evenodd'); x.restore();
        x.lineWidth = 2; x.strokeStyle = '#7c4dff'; x.beginPath();
        corners.forEach((c, i) => i ? x.lineTo(c.x * scale, c.y * scale) : x.moveTo(c.x * scale, c.y * scale)); x.closePath(); x.stroke();
        corners.forEach(c => { x.beginPath(); x.arc(c.x * scale, c.y * scale, 13, 0, 7); x.fillStyle = 'rgba(255,255,255,.9)'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#3d5afe'; x.stroke(); });
      }
      const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (cv.width / r.width) / scale, y: (e.clientY - r.top) * (cv.height / r.height) / scale }; };
      cv.onpointerdown = e => {
        if (mode !== 'crop') return;
        const p = pos(e); let best = -1, bd = 1e9;
        corners.forEach((c, i) => { const d = Math.hypot(c.x - p.x, c.y - p.y) * scale; if (d < bd) { bd = d; best = i; } });
        if (bd < 55) { active = best; cv.setPointerCapture(e.pointerId); }
      };
      cv.onpointermove = e => {
        if (active < 0 || mode !== 'crop') return;
        const p = pos(e); corners[active] = { x: Math.max(0, Math.min(src.width, p.x)), y: Math.max(0, Math.min(src.height, p.y)) }; drawCrop();
      };
      cv.onpointerup = cv.onpointercancel = () => { active = -1; };

      let mode = 'crop', base = null, result = null, filter = prev ? prev.filter : 'clean', rot = prev ? prev.rot : 0;

      function showCropBar() {
        mode = 'crop'; ed.querySelector('#eTitle').textContent = 'Page kaato';
        bar.innerHTML = `<div class="cx-tip">Kone (corners) kheench kar page ke kinaron par lao</div>
          <div class="cx-bar"><button class="cx-btn sec" id="bFull">${ICON.crop} Poora page</button><button class="cx-btn" id="bNext">Aage ${ICON.next}</button></div>`;
        bar.querySelector('#bFull').onclick = () => { corners = [{ x: 0, y: 0 }, { x: src.width, y: 0 }, { x: src.width, y: src.height }, { x: 0, y: src.height }]; drawCrop(); };
        bar.querySelector('#bNext').onclick = async () => {
          setBusy(true); await tick();
          try { base = warp(src, corners); for (let i = 0; i < rot; i++) base = rotate90(base); }
          catch (e) { setBusy(false); return alert('Error: ' + e.message); }
          await showEnhance();
        };
        layoutCrop();
      }

      /* ---------- STEP 2 : FILTER ---------- */
      async function renderResult() {
        setBusy(true); await tick();
        result = applyFilter(base, filter);
        cv.width = result.width; cv.height = result.height;
        cv.getContext('2d').drawImage(result, 0, 0);
        cv.style.maxWidth = '100%'; cv.style.maxHeight = '100%';
        setBusy(false);
      }
      async function showEnhance() {
        mode = 'enh'; ed.querySelector('#eTitle').textContent = 'Quality / Filter';
        bar.innerHTML = `<div class="cx-bar" style="flex-direction:column;align-items:stretch">
            <div class="cx-chips" id="chips"><button data-f="orig">Original</button><button data-f="clean">Saaf (Best)</button><button data-f="bw">B&amp;W</button></div>
            <div style="display:flex;gap:8px;margin-top:8px"><button class="cx-btn sec" id="bCrop" style="flex:1">${ICON.back} Crop</button><button class="cx-btn sec" id="bRot" style="flex:1">${ICON.rotate} Ghumao</button><button class="cx-btn" id="bSave" style="flex:1.4">${ICON.check} Page save</button></div></div>`;
        const mark = () => bar.querySelectorAll('#chips button').forEach(b => b.classList.toggle('on', b.dataset.f === filter));
        mark();
        bar.querySelectorAll('#chips button').forEach(b => b.onclick = async () => { filter = b.dataset.f; mark(); await renderResult(); });
        bar.querySelector('#bCrop').onclick = () => { base = null; result = null; rot = 0; showCropBar(); };
        bar.querySelector('#bRot').onclick = async () => { base = rotate90(base); rot = (rot + 1) % 4; await renderResult(); };
        bar.querySelector('#bSave').onclick = async () => {
          setBusy(true); await tick();
          const blob = await canvasToBlob(result, CFG.jpegQ);
          const t = document.createElement('canvas'); const k = 240 / Math.max(result.width, result.height);
          t.width = Math.round(result.width * k); t.height = Math.round(result.height * k);
          t.getContext('2d').drawImage(result, 0, 0, t.width, t.height);
          const out = { blob, w: result.width, h: result.height, thumb: t.toDataURL('image/jpeg', 0.7), file,
            corners: corners.map(c => ({ x: c.x / src.width, y: c.y / src.height })), filter, rot };
          close(out);
        };
        await renderResult();
      }

      showCropBar();
      if (prev) { /* re-edit: seedha crop se shuru */ }
    });
  }

  /* =====================================================================
     UPLOAD SHEET  (login check -> source choice -> details -> upload)
     ===================================================================== */
  let ov = null;
  function openSheet(html) {
    if (!ov) {
      ov = document.createElement('div'); ov.className = 'cx-ov';
      ov.innerHTML = '<div class="cx-sheet"></div>';
      ov.addEventListener('click', e => { if (e.target === ov) closeSheet(); });
      document.body.appendChild(ov);
    }
    const sh = $('.cx-sheet', ov); sh.innerHTML = html; return sh;
  }
  function closeSheet() { if (ov) { ov.remove(); ov = null; } state.file = null; state.source = null; }

  async function start() {
    let user = null;
    try { user = (await sb().auth.getUser()).data?.user; } catch (e) {}
    if (!user) {
      const sh = openSheet(`<h3>Login zaroori hai</h3><p class="cx-sub">${IS_FORMULAS ? 'Formula' : 'Notes'} upload karne ke liye pehle login karein.</p>
        <button class="cx-btn full" id="cxLogin">Login karein</button>`);
      $('#cxLogin', sh).onclick = () => { location.href = CFG.loginUrl + (CFG.loginUrl.includes('?') ? '&' : '?') + 'redirect=' + encodeURIComponent(location.href); };
      return;
    }
    showChoice();
  }

  function showChoice() {
    const what = IS_FORMULAS ? 'Formula' : 'Notes';
    const accept = IS_FORMULAS ? '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png' : '.pdf,application/pdf';
    const sh = openSheet(`<h3>${what} add karo</h3><p class="cx-sub">Kaise upload karna hai?</p>
      <button class="cx-opt" id="cxStore"><span class="ic">${ICON.upload}</span><span><b>Storage se upload</b><small>${IS_FORMULAS ? 'PDF ya photo (JPG/PNG)' : 'Sirf PDF'} phone se chuno</small></span></button>
      <button class="cx-opt" id="cxScan"><span class="ic">${ICON.scan}</span><span><b>Scan karo</b><small>Camera se copy scan — saaf, seedha PDF banega</small></span></button>
      <input type="file" id="cxFile" accept="${accept}" style="display:none">`);
    const inp = $('#cxFile', sh);
    $('#cxStore', sh).onclick = () => inp.click();
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      const isImg = /^image\/(jpeg|png)$/.test(f.type);
      if (!(isPdf || (IS_FORMULAS && isImg))) return alert(IS_FORMULAS ? 'Sirf PDF, JPG ya PNG allowed hai' : 'Sirf PDF allowed hai');
      const lim = (isPdf ? CFG.maxPdfMB : CFG.maxImgMB) * 1048576;
      if (f.size > lim) return alert('File bahut badi hai (' + mb(f.size) + '). Limit: ' + mb(lim));
      state.file = f; state.source = 'storage'; showDetails();
    };
    $('#cxScan', sh).onclick = async () => {
      if (ov) ov.style.display = 'none';
      const pdf = await runScanner();
      if (ov) ov.style.display = '';
      if (!pdf) return;
      state.file = new File([pdf], 'scan.pdf', { type: 'application/pdf' }); state.source = 'scan'; showDetails();
    };
  }

  function pageSubjects() {
    const out = [], seen = {};
    document.querySelectorAll('[onclick*="openSubject("]').forEach(c => {
      const m = (c.getAttribute('onclick') || '').match(/openSubject\('([^']+)'\)/);
      if (m && !seen[m[1]]) { seen[m[1]] = 1; const h = c.querySelector('h3'); out.push([m[1], h ? h.textContent.trim() : m[1]]); }
    });
    return out;
  }
  const chapOpts = (sel) => '<option value="">Chapter chuno</option>' + Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}" ${String(sel) === String(i + 1) ? 'selected' : ''}>Chapter ${i + 1}</option>`).join('');
  const numOnly = v => String(v || '').replace(/\D/g, '');

  function showDetails() {
    const f = state.file;
    const fileRow = `<div class="cx-file"><span>${ICON.file}<em>${esc(f.name)} · ${mb(f.size)}</em></span><a href="#" id="cxChg" style="color:#8aa0ff;font-size:13px">Badlo</a></div>`;
    let fields = '';
    if (!IS_FORMULAS) {
      const cls = typeof CURRENT_CLASS !== 'undefined' ? CURRENT_CLASS : '';
      const subs = pageSubjects();
      const subField = currentSubject
        ? `<div class="cx-chip">${esc((subs.find(s => s[0] === currentSubject) || [0, currentSubject])[1])}</div>`
        : `<select id="cxSub"><option value="">Subject chuno</option>${subs.map(s => `<option value="${esc(s[0])}">${esc(s[1])}</option>`).join('')}</select>`;
      fields = `<div class="cx-row"><div class="cx-field"><label>Class</label><div class="cx-chip">Class ${esc(cls)}</div></div>
          <div class="cx-field"><label>Subject</label>${subField}</div></div>
        <div class="cx-field"><label>Chapter</label><select id="cxCh">${chapOpts('')}</select></div>
        <div class="cx-field"><label>Chapter ka naam</label><input id="cxName" placeholder="e.g. Solutions (विलयन)"></div>`;
    } else {
      const pc = ($('#fClass') || {}).value || '', ps = ($('#fSubject') || {}).value || '', pch = numOnly(($('#fChapter') || {}).value), pcat = ($('#fCategory') || {}).value || '';
      const sel = (v, arr) => arr.map(a => `<option value="${a[0]}" ${a[0] === v ? 'selected' : ''}>${a[1]}</option>`).join('');
      fields = `<div class="cx-row"><div class="cx-field"><label>Class</label><select id="cxCls"><option value="">Class chuno</option>${sel(pc, [['9', 'Class 9'], ['10', 'Class 10'], ['11', 'Class 11'], ['12', 'Class 12'], ['jee', 'JEE'], ['neet', 'NEET']])}</select></div>
          <div class="cx-field"><label>Subject</label><select id="cxSub"><option value="">Subject chuno</option>${sel(ps, [['physics', 'Physics'], ['chemistry', 'Chemistry'], ['maths', 'Maths'], ['biology', 'Biology']])}</select></div></div>
        <div class="cx-row"><div class="cx-field"><label>Chapter</label><select id="cxCh">${chapOpts(pch)}</select></div>
          <div class="cx-field"><label>Category</label><select id="cxCat"><option value="">Category chuno</option>${sel(pcat, [['mind_map', 'Mind Map'], ['short_notes', 'Short Notes'], ['other', 'Other']])}</select></div></div>
        <div class="cx-field"><label>Naam</label><input id="cxName" placeholder="e.g. Matrix"></div>`;
    }
    const sh = openSheet(`<h3>Details bharo</h3><p class="cx-sub">Admin check karega, uske baad site par dikhega.</p>${fileRow}${fields}
      <div class="cx-actions"><button class="cx-btn sec" id="cxBack">${ICON.back} Wapas</button><button class="cx-btn" id="cxGo">${ICON.upload18} Upload</button></div><div class="cx-msg" id="cxMsg"></div>`);
    $('#cxChg', sh).onclick = e => { e.preventDefault(); showChoice(); };
    $('#cxBack', sh).onclick = showChoice;
    $('#cxGo', sh).onclick = () => submit(sh);
  }

  async function submit(sh) {
    const msg = $('#cxMsg', sh), go = $('#cxGo', sh);
    const v = id => { const e = $('#' + id, sh); return e ? e.value.trim() : ''; };
    const cls = IS_FORMULAS ? v('cxCls') : String(typeof CURRENT_CLASS !== 'undefined' ? CURRENT_CLASS : '');
    const sub = IS_FORMULAS ? v('cxSub') : (currentSubject || v('cxSub'));
    const ch = v('cxCh'), name = v('cxName'), cat = v('cxCat');
    if (!cls || !sub || !ch || !name || (IS_FORMULAS && !cat)) { msg.className = 'cx-msg'; msg.textContent = 'Saari details bharo'; return; }

    go.disabled = true; msg.className = 'cx-msg'; msg.style.color = '#9fb0cc'; msg.textContent = 'Upload ho raha hai…';
    try {
      const user = (await sb().auth.getUser()).data?.user;
      if (!user) throw new Error('Login expire ho gaya, dobara login karein');
      const f = state.file;
      const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      const ext = isPdf ? 'pdf' : (f.type === 'image/png' ? 'png' : 'jpg');
      const safe = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${IS_FORMULAS ? 'formulas' : 'notes'}/u_${user.id.slice(0, 8)}_${safe(cls)}_${safe(sub)}_ch${ch}_${Date.now()}.${ext}`;

      const up = await sb().storage.from(CFG.bucket).upload(path, f, { upsert: false, contentType: isPdf ? 'application/pdf' : f.type });
      if (up.error) throw new Error('File upload fail: ' + up.error.message);

      let ins;
      if (IS_FORMULAS) {
        ins = await sb().from('formulas').insert([{ user_id: user.id, class: cls, subject: sub, chapter: ch, chapter_name: name,
          type: isPdf ? 'pdf' : 'image', category: cat, formula_text: null, file_path: path, publish: false, status: 'pending' }]);
      } else {
        ins = await sb().from('notes').insert([{ class: cls, subject: sub.toLowerCase(), chapter_number: parseInt(ch, 10), chapter_name: name,
          file_path: path, status: 'pending', uploaded_by: user.id }]);
      }
      if (ins.error) throw new Error('Save fail: ' + ins.error.message);

      openSheet(`<div class="cx-ok">${ICON.checkCircle}</div><h3 style="text-align:center">Upload ho gaya</h3><p class="cx-sub" style="text-align:center">Admin ki approval ke baad ye site par dikhega. Shukriya!</p>
        <button class="cx-btn full" id="cxOk">Theek hai</button>`);
      $('#cxOk', ov).onclick = closeSheet;
    } catch (e) {
      msg.className = 'cx-msg'; msg.style.color = ''; msg.textContent = '' + e.message; go.disabled = false;
    }
  }

  /* =====================================================================
     MOUNT — menu me "Add Notes" jodo (ya formulas page par button)
     ===================================================================== */
  const plus = '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
  function mount() {
    const label = IS_FORMULAS ? 'Add Formula' : 'Add Notes';
    const menu = $('#floatingContainer .floating-menu');
    if (menu) {
      const a = document.createElement('a'); a.href = '#'; a.className = 'menu-item'; a.innerHTML = plus + label;
      a.onclick = e => { e.preventDefault(); const c = $('#floatingContainer'); if (c) c.classList.remove('active'); start(); };
      menu.insertBefore(a, menu.firstChild);
    } else {
      const b = document.createElement('button'); b.className = 'cx-fab'; b.innerHTML = plus + ' ' + label; b.onclick = start;
      document.body.appendChild(b);
    }
    if (typeof window.openSubject === 'function') {         // kaun sa subject khula hai, yaad rakho
      const orig = window.openSubject;
      window.openSubject = function (s) { currentSubject = s; return orig.apply(this, arguments); };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
