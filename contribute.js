/* =====================================================================
   contribute.js - User Upload (Notes + Formulas) with HIGH-QUALITY SCAN
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
  .cx-sl{display:flex;align-items:center;gap:8px;font-size:12px;color:#9fb0cc;padding:5px 4px 0}
  .cx-sl span{width:62px}.cx-sl input{flex:1;min-width:0;accent-color:#7c4dff}.cx-sl b{width:30px;text-align:right;color:#fff;font-weight:600}
  .cx-sl button{background:#1a2038;border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:8px;padding:5px 7px;display:inline-flex}
  .cx-th{display:flex;gap:8px;overflow-x:auto;padding:8px 10px 4px;scrollbar-width:none}
  .cx-th::-webkit-scrollbar{display:none}
  .cx-th button{flex:none;width:64px;background:none;border:0;color:#9fb0cc;font-size:11px;padding:0;text-align:center}
  .cx-th img{display:block;width:64px;height:84px;object-fit:cover;border-radius:9px;border:2px solid transparent;background:#fff}
  .cx-th button.on{color:#fff}.cx-th button.on img{border-color:#7c4dff}
  .cx-th span{display:block;margin-top:3px}
  .cx-tools{display:flex;justify-content:space-around;padding:6px 6px 2px}
  .cx-tools button{background:none;border:0;color:#cfd8ee;font-size:11px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 10px;border-radius:10px}
  .cx-tools button.on{background:#1f2748;color:#fff}
  .cx-brush{display:flex;justify-content:space-around;align-items:center;background:#1a2038;border-radius:30px;margin:8px 14px 0;padding:6px 8px}
  .cx-brush button{width:46px;height:46px;padding:0;border-radius:50%;border:2px solid transparent;background:none;display:flex;align-items:center;justify-content:center}
  .cx-brush button.on{border-color:#fff}.cx-brush i{display:block;flex:none;border-radius:50%;background:#e2e6f3}
  .cx-bar .cx-btn:disabled{opacity:.35}
  .cx-chips button.on{background:#3d5afe;border-color:#7c4dff}
  .cx-pages{flex:1;overflow:auto;padding:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-content:start}
  .cx-pg{position:relative;background:#151a2b;border-radius:8px;overflow:hidden;aspect-ratio:3/4;border:1px solid rgba(255,255,255,.12)}
  .cx-pg img{width:100%;height:100%;object-fit:cover}
  .cx-pg i{position:absolute;left:4px;bottom:4px;background:rgba(0,0,0,.65);font-style:normal;font-size:11px;padding:2px 6px;border-radius:8px}
  .cx-pg b{position:absolute;right:4px;top:4px;width:24px;height:24px;border-radius:50%;background:rgba(220,40,60,.9);text-align:center;line-height:24px;font-size:14px}
  .cx-empty{grid-column:1/-1;text-align:center;color:#9fb0cc;padding:50px 10px;font-size:14px}
  .cx-busy{position:absolute;inset:0;background:rgba(5,8,18,.75);display:none;align-items:center;justify-content:center;font-size:15px;z-index:3}
  .cx-tip{font-size:12px;color:#9fb0cc;text-align:center;padding:6px 10px 0}
  .cx-pg{cursor:pointer}
  .cx-pg{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
  .cx-pg img{pointer-events:none;-webkit-user-drag:none}
  .cx-pg.lift{opacity:.28;outline:2px dashed #7c4dff;outline-offset:-2px}
  .cx-pg.fl{transition:transform .17s ease}
  .cx-pages{overscroll-behavior:contain;grid-auto-rows:max-content;-webkit-overflow-scrolling:touch}
  .cx-pages .cx-pg{width:100%;height:auto;min-height:0;box-sizing:border-box}
  .cx-ghost{position:fixed;left:0;top:0;z-index:10300;pointer-events:none;margin:0;opacity:.95;will-change:transform;box-shadow:0 12px 30px rgba(0,0,0,.6);border-color:#7c4dff!important}
  .cx-pg b{width:28px;height:28px;line-height:28px;font-size:16px}
  .cx-mv{position:absolute;bottom:4px;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.65);border:0;color:#fff;font-size:18px;line-height:26px;padding:0;text-align:center}
  .cx-mv.l{right:36px}.cx-mv.r{right:4px}.cx-mv:disabled{display:none}
  .cx-sub{display:flex;align-items:center;justify-content:space-between;padding:8px 14px 0;font-size:12px;color:#9fb0cc}
  .cx-sub button{background:none;border:0;color:#ff7b8a;font-size:12px;padding:4px 0}
  .cx-big{display:flex;gap:10px;justify-content:center;margin-top:18px}
  .cx-big .cx-btn{flex:1;max-width:160px}
  .cx-toast{position:absolute;left:14px;right:14px;bottom:200px;background:#262d4a;border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-size:13px;z-index:5;box-shadow:0 6px 20px rgba(0,0,0,.4)}
  .cx-toast button{background:none;border:0;color:#9fb0ff;font-weight:700;font-size:13px;padding:2px 6px}
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
     SCAN ENGINE - perspective fix + shadow removal + document filters
     ===================================================================== */

  // 4 corner (TL,TR,BR,BL) se seedha (flat) page banata hai - real perspective warp
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

  /* ---------- Paper (background) estimate: block-wise 70th percentile ---------- */
  function estimateBg(d, W, H) {
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
    return { bg, gx, gy, Bk };
  }
  // y-th row ka smooth (bilinear) background, 3 channel
  function makeBgRows(est, W) {
    const { bg, gx, gy, Bk } = est;
    const ix0 = new Int32Array(W), ix1 = new Int32Array(W), wx = new Float32Array(W);
    for (let x = 0; x < W; x++) {
      let f = x / Bk - 0.5; if (f < 0) f = 0; if (f > gx - 1) f = gx - 1;
      const a = f | 0; ix0[x] = a; ix1[x] = Math.min(gx - 1, a + 1); wx[x] = f - a;
    }
    const rows = [new Float32Array(W), new Float32Array(W), new Float32Array(W)];
    return function (y) {
      let f = y / Bk - 0.5; if (f < 0) f = 0; if (f > gy - 1) f = gy - 1;
      const ya = f | 0, yb = Math.min(gy - 1, ya + 1), wy = f - ya, r0 = ya * gx, r1 = yb * gx;
      for (let ch = 0; ch < 3; ch++) {
        const t = bg[ch], row = rows[ch];
        for (let x = 0; x < W; x++) {
          const a = ix0[x], b = ix1[x], w = wx[x];
          row[x] = (t[r0 + a] * (1 - w) + t[r0 + b] * w) * (1 - wy) + (t[r1 + a] * (1 - w) + t[r1 + b] * w) * wy;
        }
      }
      return rows;
    };
  }

  /* ---------- Filters (Google scanner jaise) ---------- */
  const FILTERS = [['orig', 'Original'], ['auto', 'Auto'], ['color', 'Color'], ['gray', 'Grayscale'], ['bw', 'B&W'], ['shadows', 'Shadows']];
  const PRESET = {
    auto:    { mode: 'color', lo: 45, hi: 225, sat: 1 },
    color:   { mode: 'color', lo: 35, hi: 215, sat: 1.3 },
    gray:    { mode: 'gray',  lo: 45, hi: 225, sat: 1 },
    bw:      { mode: 'bw',    lo: 45, hi: 225, sat: 1 },
    shadows: { mode: 'color', lo: 0,  hi: 250, sat: 1 }      // sirf parchhai hatao, baaki jaisa hai waisa
  };

  function enhance(srcC, o) {
    const W = srcC.width, H = srcC.height;
    const img = srcC.getContext('2d').getImageData(0, 0, W, H), d = img.data;
    const rowsOf = makeBgRows(estimateBg(d, W, H), W);
    const lo = o.lo, sc = 255 / (o.hi - o.lo), sat = o.sat || 1;
    for (let y = 0; y < H; y++) {
      const rows = rowsOf(y), R = rows[0], G = rows[1], B = rows[2];
      for (let x = 0, i = y * W * 4; x < W; x++, i += 4) {
        let r = (d[i] * 255 / R[x] - lo) * sc, g = (d[i + 1] * 255 / G[x] - lo) * sc, b = (d[i + 2] * 255 / B[x] - lo) * sc;
        if (o.mode === 'color') {
          if (sat !== 1) { const L = 0.299 * r + 0.587 * g + 0.114 * b; r = L + (r - L) * sat; g = L + (g - L) * sat; b = L + (b - L) * sat; }
          d[i] = r < 0 ? 0 : r > 255 ? 255 : r; d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g; d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
        } else {
          let L = 0.299 * r + 0.587 * g + 0.114 * b;
          if (o.mode === 'bw') { L = (L - 95) / 95; L = L < 0 ? 0 : L > 1 ? 1 : L; L = L * L * (3 - 2 * L) * 255; }
          else L = L < 0 ? 0 : L > 255 ? 255 : L;
          d[i] = d[i + 1] = d[i + 2] = L;
        }
      }
    }
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    out.getContext('2d').putImageData(img, 0, 0);
    return out;
  }
  function applyFilter(base, mode) {
    if (mode === 'orig' || !PRESET[mode]) return base;
    return enhance(base, PRESET[mode]);
  }

  // Clean (eraser) ke liye: paper ka rang har jagah ka (smooth) - isse daag "paper" se dhak jata hai
  function paperBg(c) {
    const W = c.width, H = c.height;
    const d = c.getContext('2d').getImageData(0, 0, W, H).data;
    const rowsOf = makeBgRows(estimateBg(d, W, H), W);
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const x = out.getContext('2d'), id = x.createImageData(W, H), o = id.data;
    for (let y = 0; y < H; y++) {
      const r = rowsOf(y); let k = y * W * 4;
      for (let xx = 0; xx < W; xx++, k += 4) { o[k] = r[0][xx]; o[k + 1] = r[1][xx]; o[k + 2] = r[2][xx]; o[k + 3] = 255; }
    }
    x.putImageData(id, 0, 0);
    return out;
  }

  // Brightness/Contrast (256-entry table)
  function lutInto(srcC, dst, b, k) {
    const x = dst.getContext('2d'); x.drawImage(srcC, 0, 0);
    const id = x.getImageData(0, 0, dst.width, dst.height), d = id.data;
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) lut[v] = (v - 128) * k + 128 + b;
    for (let i = 0; i < d.length; i += 4) { d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]]; }
    x.putImageData(id, 0, 0);
  }
  function lutCopy(srcC, b, k) { const o = document.createElement('canvas'); o.width = srcC.width; o.height = srcC.height; lutInto(srcC, o, b, k); return o; }

  /* ---------- Automatic crop: paper ko background se alag karke 4 kone dhoondta hai ---------- */
  function boxBlur(g, w, h, r) {                      // patli lines / likhawat ko "paper" me ghol do
    const t = new Float32Array(w * h), o = new Uint8Array(w * h), n = 2 * r + 1;
    for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += g[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { t[y * w + x] = s / n; s += g[y * w + Math.min(w - 1, x + r + 1)] - g[y * w + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { o[y * w + x] = s / n; s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
    return o;
  }
  function detectQuad(g0, w, h) {
    const g = boxBlur(g0, w, h, 3);
    const hist = new Uint32Array(256); for (let i = 0; i < g.length; i++) hist[g[i]]++;
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
    let wB = 0, sB = 0, best = -1, thr = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (!wB) continue; const wF = g.length - wB; if (!wF) break;
      sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
      if (v > best) { best = v; thr = t; }
    }
    // centre ke aas-paas jo zyada hai wahi "paper" maano
    const cx = w >> 1, cy = h >> 1, rad = Math.max(3, Math.round(Math.min(w, h) * 0.1));
    let bright = 0, tot = 0;
    for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) { tot++; if (g[y * w + x] > thr) bright++; }
    const paper = bright * 2 >= tot ? 1 : 0;
    const isP = i => (g[i] > thr ? 1 : 0) === paper;
    let seed = -1;
    for (let r = 0; r <= rad && seed < 0; r++) for (let y = cy - r; y <= cy + r && seed < 0; y++) for (let x = cx - r; x <= cx + r; x++) { if (isP(y * w + x)) { seed = y * w + x; break; } }
    if (seed < 0) return null;
    const seen = new Uint8Array(w * h), q = new Int32Array(w * h); let qh = 0, qt = 0;
    q[qt++] = seed; seen[seed] = 1;
    let area = 0, tl = null, br = null, tr = null, bl = null, mnS = 1e9, mxS = -1e9, mnD = 1e9, mxD = -1e9;
    while (qh < qt) {
      const i = q[qh++], x = i % w, y = (i / w) | 0; area++;
      const s = x + y, dd = x - y;
      if (s < mnS) { mnS = s; tl = [x, y]; } if (s > mxS) { mxS = s; br = [x, y]; }
      if (dd > mxD) { mxD = dd; tr = [x, y]; } if (dd < mnD) { mnD = dd; bl = [x, y]; }
      if (x > 0 && !seen[i - 1] && isP(i - 1)) { seen[i - 1] = 1; q[qt++] = i - 1; }
      if (x < w - 1 && !seen[i + 1] && isP(i + 1)) { seen[i + 1] = 1; q[qt++] = i + 1; }
      if (y > 0 && !seen[i - w] && isP(i - w)) { seen[i - w] = 1; q[qt++] = i - w; }
      if (y < h - 1 && !seen[i + w] && isP(i + w)) { seen[i + w] = 1; q[qt++] = i + w; }
    }
    const ratio = area / (w * h);
    if (ratio < 0.12 || ratio > 0.97) return null;
    const pts = [tl, tr, br, bl];
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) if (Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]) < Math.min(w, h) * 0.1) return null;
    return pts;
  }
  function autoCorners(src) {
    const k = 320 / Math.max(src.width, src.height);
    const w = Math.max(40, Math.round(src.width * k)), h = Math.max(40, Math.round(src.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(src, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data, g = new Uint8Array(w * h);
    for (let i = 0; i < g.length; i++) g[i] = (d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000;
    const q = detectQuad(g, w, h);
    return q ? q.map(p => ({ x: Math.min(src.width, p[0] / k), y: Math.min(src.height, p[1] / k) })) : null;
  }
  function defaultCorners(src) {
    const a = 0.06, W = src.width, H = src.height;
    return [{ x: W * a, y: H * a }, { x: W * (1 - a), y: H * a }, { x: W * (1 - a), y: H * (1 - a) }, { x: W * a, y: H * (1 - a) }];
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

      let dragging = false;
      function refreshTiles(grid) {            // drag ke baad: numbers + ‹ › states, bina poori list dobara banaye
        const kids = [...grid.querySelectorAll('.cx-pg')], n = kids.length;
        kids.forEach((c, k) => {
          c.querySelector('i').textContent = k + 1;
          c.querySelector('.cx-mv.l').disabled = k === 0;
          c.querySelector('.cx-mv.r').disabled = k === n - 1;
        });
        const top = root.querySelector('.cx-top span'); if (top) top.textContent = 'Scan (' + n + ' page)';
      }
      function attachDrag(d, p, grid) {
        let timer = null, sx = 0, sy = 0, ghost = null, ox = 0, oy = 0, raf = 0, dir = 0, lastX = 0, lastY = 0, pid = -1;
        let slots = [], cur = 0, from = 0, gw = 0;
        const stop = () => { clearTimeout(timer); timer = null; };

        function measure() {                     // har slot ki jagah (grid ke andar) - ek baar
          const gr = grid.getBoundingClientRect(), st = grid.scrollTop;
          slots = [...grid.querySelectorAll('.cx-pg')].map(c => { const r = c.getBoundingClientRect(); return { x: r.left - gr.left + grid.scrollLeft, y: r.top - gr.top + st, w: r.width, h: r.height }; });
          gw = gr.width;
        }
        function slotAt(x, y) {                  // finger kis slot par hai (pure math, DOM read nahi)
          const gr = grid.getBoundingClientRect();
          const gx = x - gr.left + grid.scrollLeft, gy = y - gr.top + grid.scrollTop;
          let best = -1, bd = 1e12;
          for (let k = 0; k < slots.length; k++) {
            const s = slots[k];
            const dx = gx - (s.x + s.w / 2), dy = gy - (s.y + s.h / 2);
            const dd = dx * dx + dy * dy;
            if (dd < bd) { bd = dd; best = k; }
          }
          return best;
        }
        function moveTo(k) {
          if (k < 0 || k === cur) return;
          const kids = [...grid.querySelectorAll('.cx-pg')];
          const before = new Map(kids.map((c, idx) => [c, idx]));
          const ref = kids[k];
          grid.insertBefore(d, cur < k ? ref.nextSibling : ref);
          cur = k;
          const after = [...grid.querySelectorAll('.cx-pg')];
          const moved = [];
          after.forEach((c, idx) => {            // FLIP: purani slot se nayi slot tak smooth slide
            const o = before.get(c);
            if (c === d || o === idx) return;
            const a = slots[o], b = slots[idx];
            c.classList.remove('fl'); c.style.transform = `translate(${a.x - b.x}px,${a.y - b.y}px)`; moved.push(c);
          });
          if (moved.length) {
            void grid.offsetWidth;
            moved.forEach(c => { c.classList.add('fl'); c.style.transform = ''; });
            setTimeout(() => moved.forEach(c => c.classList.remove('fl')), 220);
          }
        }
        function tick() {
          raf = 0; if (!dragging) return;
          if (ghost) ghost.style.transform = `translate3d(${lastX - ox}px,${lastY - oy}px,0) scale(1.06)`;
          if (dir) { grid.scrollTop += dir * 10; }
          moveTo(slotAt(lastX, lastY));
          if (dir) raf = requestAnimationFrame(tick);
        }
        const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

        function onMove(e) {
          if (e.pointerId !== pid) return;
          lastX = e.clientX; lastY = e.clientY;
          const gr = grid.getBoundingClientRect();
          dir = lastY < gr.top + 56 ? -1 : lastY > gr.bottom - 56 ? 1 : 0;
          kick();
        }
        function onUp(e) { if (e.pointerId === pid) end(); }
        function end() {
          stop(); cancelAnimationFrame(raf); raf = 0;
          document.removeEventListener('pointermove', onMove, true);
          document.removeEventListener('pointerup', onUp, true);
          document.removeEventListener('pointercancel', onUp, true);
          if (!dragging) return;
          dragging = false;
          if (ghost) { ghost.remove(); ghost = null; }
          d.classList.remove('lift');
          d._justDragged = true; setTimeout(() => { d._justDragged = false; }, 150);
          const to = [...grid.querySelectorAll('.cx-pg')].indexOf(d);
          if (to !== from && to >= 0) { const [it] = pages.splice(from, 1); pages.splice(to, 0, it); }
          refreshTiles(grid);
        }
        d.addEventListener('pointerdown', e => {
          if (e.target.closest('b,.cx-mv') || (e.pointerType === 'mouse' && e.button !== 0) || dragging) return;
          sx = lastX = e.clientX; sy = lastY = e.clientY; pid = e.pointerId;
          stop();
          timer = setTimeout(() => {
            timer = null; dragging = true;
            measure();
            from = cur = pages.indexOf(p);
            const r = d.getBoundingClientRect(); ox = sx - r.left; oy = sy - r.top;
            ghost = d.cloneNode(true); ghost.classList.add('cx-ghost');
            ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
            ghost.style.transform = `translate3d(${r.left}px,${r.top}px,0) scale(1.06)`;
            root.appendChild(ghost);                 // root ke andar: font/colour wahi rahe
            d.classList.add('lift');
            if (navigator.vibrate) navigator.vibrate(12);
            document.addEventListener('pointermove', onMove, true);     // document par: element hilne se bhi event nahi rukte
            document.addEventListener('pointerup', onUp, true);
            document.addEventListener('pointercancel', onUp, true);
            ghost.style.transform = `translate3d(${lastX - ox}px,${lastY - oy}px,0) scale(1.06)`;
          }, 260);
        });
        d.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) stop(); });
        d.addEventListener('pointerup', stop);
        d.addEventListener('pointercancel', stop);
        d.addEventListener('contextmenu', e => e.preventDefault());
      }

      let lockTimer = null;
      function showUndo(item, idx) {
        const old = root.querySelector('.cx-toast'); if (old) old.remove();
        const t = document.createElement('div'); t.className = 'cx-toast';
        t.innerHTML = '<span>Page hata diya</span><button>UNDO</button>';
        t.querySelector('button').onclick = () => { pages.splice(Math.min(idx, pages.length), 0, item); t.remove(); renderList(); };
        root.appendChild(t); setTimeout(() => t.remove(), 4500);
      }

      function renderList() {
        let list = root.querySelector('.cx-list'); if (list) list.remove();
        const n = pages.length;
        const wrap = document.createElement('div'); wrap.className = 'cx-list'; wrap.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0';
        wrap.innerHTML = `
          <div class="cx-top"><button id="cxX">${ICON.close} Band</button><span>Scan (${n} page)</span><span style="width:60px"></span></div>
          ${n ? `<div class="cx-sub"><span>${n}/${CFG.maxPages} pages \u00b7 page ko dabakar pakdo, khischo</span><button id="cxClr">Sab hatao</button></div>` : ''}
          <div class="cx-pages"></div>
          ${n ? '<div class="cx-tip">Tip: page ko tap karke dobara edit kar sakte ho</div>' : ''}
          <div class="cx-bar" style="flex-direction:column;flex-wrap:nowrap;align-items:stretch;gap:10px">
            <div style="font-size:12px;color:#9fb0cc;text-align:center">+ Aur page add karna hai?</div>
            <div style="display:flex;gap:8px">
              <button class="cx-btn sec" id="cxCam" style="flex:1">${ICON.camera} Camera</button>
              <button class="cx-btn sec" id="cxGal" style="flex:1">${ICON.image} Gallery</button>
            </div>
            <div style="border-top:1px dashed rgba(255,255,255,.18);margin:6px 0 0"></div>
            <div style="font-size:12px;color:#9fb0cc;text-align:center">Sab pages ho gaye? Tab hi neeche dabao</div>
            <button class="cx-btn" id="cxMk" style="width:100%" disabled>${ICON.check} PDF banao (${n} page)</button>
          </div>`;
        root.appendChild(wrap);
        // galti se tap na ho: naya page aane ke baad 0.8s tak PDF button locked
        const mk0 = wrap.querySelector('#cxMk');
        clearTimeout(lockTimer);
        if (n) lockTimer = setTimeout(() => { if (mk0.isConnected) mk0.disabled = false; }, 800);
        const grid = wrap.querySelector('.cx-pages');
        if (!n) grid.innerHTML = `<div class="cx-empty">Abhi koi page nahi.<br>Neeche se camera ya gallery chuno.<br><br>Acchi quality ke liye: roshni me, page ko seedha rakhkar photo lo.</div>`;
        grid.addEventListener('touchmove', e => { if (dragging) e.preventDefault(); }, { passive: false });
        pages.forEach((p, i) => {
          const d = document.createElement('div'); d.className = 'cx-pg';
          d.innerHTML = `<img src="${p.thumb}" draggable="false"><i>${i + 1}</i><b>\u00d7</b><button class="cx-mv l" ${i === 0 ? 'disabled' : ''}>\u2039</button><button class="cx-mv r" ${i === n - 1 ? 'disabled' : ''}>\u203a</button>`;
          const idx = () => pages.indexOf(p);
          d.querySelector('b').onclick = e => { e.stopPropagation(); const k = idx(); if (k < 0) return; const [it] = pages.splice(k, 1); renderList(); showUndo(it, k); };
          d.querySelector('.cx-mv.l').onclick = e => { e.stopPropagation(); const k = idx(); if (k > 0) { [pages[k - 1], pages[k]] = [pages[k], pages[k - 1]]; renderList(); } };
          d.querySelector('.cx-mv.r').onclick = e => { e.stopPropagation(); const k = idx(); if (k >= 0 && k < pages.length - 1) { [pages[k + 1], pages[k]] = [pages[k], pages[k + 1]]; renderList(); } };
          d.onclick = async () => { if (d._justDragged) return; const k = idx(); if (k < 0) return; const r = await editPage(root, p.file, p); if (r) pages[k] = r; renderList(); };
          grid.appendChild(d);
          attachDrag(d, p, grid);
        });
        const clr = wrap.querySelector('#cxClr');
        if (clr) clr.onclick = () => { if (confirm('Saare ' + n + ' pages hata dein?')) { pages.length = 0; renderList(); } };
        wrap.querySelector('#cxX').onclick = () => { if (!pages.length || confirm('Scan cancel karein? Pages hat jayenge.')) finish(null); };
        wrap.querySelector('#cxCam').onclick = () => camIn.click();
        wrap.querySelector('#cxGal').onclick = () => galIn.click();
        wrap.querySelector('#cxMk').onclick = async () => {
          const btn = wrap.querySelector('#cxMk'); btn.disabled = true; btn.textContent = 'PDF ban rahi hai...';
          try {
            let use = pages.map(p => ({ blob: p.blob, w: p.w, h: p.h }));
            let pdf = await buildPdf(use);
            if (pdf.size > CFG.maxPdfMB * 1048576) {         // zyada bhaari -> thoda compress
              use = []; for (const p of pages) use.push(await recompress(p.blob, 0.75, 0.75));
              pdf = await buildPdf(use);
            }
            if (pdf.size > CFG.maxPdfMB * 1048576) throw new Error('PDF ' + mb(pdf.size) + ' hai, limit ' + CFG.maxPdfMB + ' MB. Pages kam karo.');
            finish(pdf);
          } catch (e) { alert('' + e.message); btn.disabled = false; btn.innerHTML = ICON.check + ' PDF banao (' + pages.length + ' page)'; }
        };
      }
      renderList();
      camIn.click();                                      // seedha camera khol do
    });
  }

  // ---- ek page ka editor: crop (auto-detect, 4 corners, loupe) -> filters / adjust / clean ----
  const IC2 = {
    auto: I('<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8z"/>'),
    full: I('<path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/>'),
    eraser: I('<path d="M7 21h10"/><path d="M5.5 14.5l8-8a2 2 0 0 1 2.8 0l3 3a2 2 0 0 1 0 2.8L12.8 18.5H9z"/>'),
    sliders: I('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>'),
    undo: I('<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>'),
    redo: I('<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/>')
  };
  const BRUSH = [0.5, 1, 1.8, 3, 4.5];                   // brush size (image width ka %)

  function makeThumbs(b) {
    const k = 150 / Math.max(b.width, b.height), t = document.createElement('canvas');
    t.width = Math.max(24, Math.round(b.width * k)); t.height = Math.max(24, Math.round(b.height * k));
    t.getContext('2d').drawImage(b, 0, 0, t.width, t.height);
    const o = {}; FILTERS.forEach(f => { o[f[0]] = applyFilter(t, f[0]).toDataURL('image/jpeg', 0.6); });
    return o;
  }

  function editPage(root, file, prev) {
    return new Promise(async resolve => {
      const ed = document.createElement('div');
      ed.style.cssText = 'position:absolute;inset:0;background:#0b0e18;display:flex;flex-direction:column;z-index:5';
      ed.innerHTML = `<div class="cx-top"><button id="eBack">${ICON.back} Wapas</button><span id="eTitle">Page kaato</span><span style="width:60px"></span></div>
        <div class="cx-stage" id="eStage"><canvas id="eCv"></canvas><div class="cx-busy" id="eBusy">Processing...</div></div>
        <div id="eBar"></div>`;
      root.appendChild(ed);
      const stage = ed.querySelector('#eStage'), cv = ed.querySelector('#eCv'), busy = ed.querySelector('#eBusy'), bar = ed.querySelector('#eBar');
      const title = t => { ed.querySelector('#eTitle').textContent = t; };
      const setBusy = b => { busy.style.display = b ? 'flex' : 'none'; };
      const close = v => { ed.remove(); resolve(v); };
      let mode = 'crop';
      ed.querySelector('#eBack').onclick = () => { if (mode === 'clean') cancelClean(); else close(null); };

      setBusy(true);
      let src;
      try { src = await loadSourceCanvas(file); } catch (e) { alert('Photo load nahi hui'); return close(null); }
      let srot = prev ? (prev.srot || 0) : 0;
      for (let i = 0; i < srot; i++) src = rotate90(src);
      let corners, autoNote = '';
      if (prev) corners = prev.corners.map(c => ({ x: c.x * src.width, y: c.y * src.height }));
      else { const ac = autoCorners(src); corners = ac || defaultCorners(src); if (!ac) autoNote = 'Page apne aap nahi mila - kone khud kheencho'; }
      setBusy(false);

      let scale = 1, active = -1;

      /* ============ STEP 1 : CROP ============ */
      const DPR = Math.min(window.devicePixelRatio || 1, 3);   // phone ki screen ke hisaab se saaf preview
      const PAD = 18 * DPR;                                    // kinare ke handles kate na dikhein
      function layoutCrop() {
        const aw = stage.clientWidth - 24 - 36, ah = stage.clientHeight - 24 - 36;
        scale = Math.min(aw / src.width, ah / src.height) * DPR;
        cv.width = Math.round(src.width * scale) + 2 * PAD; cv.height = Math.round(src.height * scale) + 2 * PAD;
        cv.style.width = (cv.width / DPR) + 'px'; cv.style.height = (cv.height / DPR) + 'px';
        drawCrop();
      }
      function drawCrop() {
        const x = cv.getContext('2d');
        x.clearRect(0, 0, cv.width, cv.height);
        x.drawImage(src, PAD, PAD, cv.width - 2 * PAD, cv.height - 2 * PAD);
        x.save(); x.fillStyle = 'rgba(0,0,0,.55)'; x.beginPath(); x.rect(0, 0, cv.width, cv.height);
        corners.forEach((c, i) => i ? x.lineTo(c.x * scale + PAD, c.y * scale + PAD) : x.moveTo(c.x * scale + PAD, c.y * scale + PAD)); x.closePath();
        x.fill('evenodd'); x.restore();
        x.lineWidth = 2 * DPR; x.strokeStyle = '#7c4dff'; x.beginPath();
        corners.forEach((c, i) => i ? x.lineTo(c.x * scale + PAD, c.y * scale + PAD) : x.moveTo(c.x * scale + PAD, c.y * scale + PAD)); x.closePath(); x.stroke();
        corners.forEach(c => { x.beginPath(); x.arc(c.x * scale + PAD, c.y * scale + PAD, 13 * DPR, 0, 7); x.fillStyle = 'rgba(255,255,255,.9)'; x.fill(); x.lineWidth = 3 * DPR; x.strokeStyle = '#3d5afe'; x.stroke(); });
        if (active >= 0) {                                       // loupe: ungli ke neeche kona dikhe
          const R = 52 * DPR, z = 2.6, c = corners[active], left = c.x * scale + PAD > cv.width / 2, lx = left ? 10 * DPR : cv.width - R * 2 - 10 * DPR, ly = 10 * DPR, sw = 2 * R / (scale * z);
          x.save(); x.beginPath(); x.arc(lx + R, ly + R, R, 0, 7); x.clip(); x.fillStyle = '#000'; x.fillRect(lx, ly, 2 * R, 2 * R);
          x.drawImage(src, c.x - sw / 2, c.y - sw / 2, sw, sw, lx, ly, 2 * R, 2 * R); x.restore();
          x.beginPath(); x.arc(lx + R, ly + R, R, 0, 7); x.lineWidth = 3 * DPR; x.strokeStyle = '#fff'; x.stroke();
          x.lineWidth = 1.5 * DPR; x.strokeStyle = '#7c4dff'; const ch = 9 * DPR; x.beginPath(); x.moveTo(lx + R - ch, ly + R); x.lineTo(lx + R + ch, ly + R); x.moveTo(lx + R, ly + R - ch); x.lineTo(lx + R, ly + R + ch); x.stroke();
        }
      }
      const pos = e => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) * (cv.width / r.width) - PAD) / scale, y: ((e.clientY - r.top) * (cv.height / r.height) - PAD) / scale }; };
      const imgPos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (cv.width / r.width), (e.clientY - r.top) * (cv.height / r.height)]; };

      cv.onpointerdown = e => {
        if (mode === 'crop') {
          const p = pos(e); let best = -1, bd = 1e9;
          corners.forEach((c, i) => { const d = Math.hypot(c.x - p.x, c.y - p.y) * scale; if (d < bd) { bd = d; best = i; } });
          if (bd < 60 * DPR) { active = best; cv.setPointerCapture(e.pointerId); drawCrop(); }
        } else if (mode === 'clean') startStroke(e);
      };
      cv.onpointermove = e => {
        if (mode === 'crop') {
          if (active < 0) return;
          const p = pos(e); corners[active] = { x: Math.max(0, Math.min(src.width, p.x)), y: Math.max(0, Math.min(src.height, p.y)) }; drawCrop();
        } else if (mode === 'clean' && cur) moveStroke(e);
      };
      cv.onpointerup = cv.onpointercancel = () => {
        if (mode === 'crop') { active = -1; drawCrop(); } else if (mode === 'clean') endStroke();
      };

      let base = null, filter = (prev && FILTERS.some(f => f[0] === prev.filter)) ? prev.filter : 'auto';
      let rot = prev ? (prev.rot || 0) : 0, bright = prev ? (prev.bright || 0) : 0, contrast = prev ? (prev.contrast || 1) : 1;
      let filtered = null, result = null, work = null, thumbs = null;
      let strokes = [], redo = [], erasedCv = null, bgCv = null, bgFor = null, erasePat = null, brush = 2, cur = null, snapshot = null;

      function showCropBar() {
        mode = 'crop'; title('Page kaato');
        bar.innerHTML = `<div class="cx-tip" id="cTip">${autoNote || 'Kone kheench kar page ke kinaron par lao'}<br><b style="color:#cfd8ee;font-weight:500">Preview thoda blur dikh sakta hai - ye normal hai. Kone select karke Aage dabao, final page saaf aayega.</b></div>
          <div class="cx-bar"><button class="cx-btn sec" id="bAuto">${IC2.auto} Auto crop</button><button class="cx-btn sec" id="bFull">${IC2.full} No crop</button><button class="cx-btn sec" id="bRotS">${ICON.rotate} Rotate</button></div>
          <div class="cx-bar" style="border:0;padding-top:0"><button class="cx-btn full" style="width:100%" id="bNext">Aage ${ICON.next}</button></div>`;
        const tip = t => { bar.querySelector('#cTip').innerHTML = t + '<br><b style="color:#cfd8ee;font-weight:500">Preview thoda blur dikh sakta hai - ye normal hai. Kone select karke Aage dabao, final page saaf aayega.</b>'; };
        bar.querySelector('#bAuto').onclick = () => {
          const ac = autoCorners(src);
          if (ac) { corners = ac; drawCrop(); tip('Page mil gaya - zarurat ho to kone adjust karo'); } else tip('Page apne aap nahi mila - kone khud kheencho');
        };
        bar.querySelector('#bFull').onclick = () => { corners = [{ x: 0, y: 0 }, { x: src.width, y: 0 }, { x: src.width, y: src.height }, { x: 0, y: src.height }]; drawCrop(); };
        bar.querySelector('#bRotS').onclick = () => {
          const oh = src.height; src = rotate90(src); srot = (srot + 1) % 4;
          corners = corners.map(c => ({ x: oh - c.y, y: c.x })); layoutCrop();
        };
        bar.querySelector('#bNext').onclick = async () => {
          setBusy(true); await tick();
          try { base = warp(src, corners); for (let i = 0; i < rot; i++) base = rotate90(base); }
          catch (e) { setBusy(false); return alert('Error: ' + e.message); }
          thumbs = null; filtered = null; strokes = []; redo = []; erasedCv = null; bgCv = null;
          await showEnhance();
        };
        layoutCrop();
      }

      /* ============ STEP 2 : FILTER / ADJUST / CLEAN ============ */
      function paint() {
        if (!filtered) return;
        const s = strokes.length ? erasedCv : filtered;
        if (mode === 'clean' || (bright === 0 && contrast === 1)) result = s;
        else {
          if (!work || work.width !== s.width || work.height !== s.height) { work = document.createElement('canvas'); work.width = s.width; work.height = s.height; }
          lutInto(s, work, bright, contrast); result = work;
        }
        cv.style.width = cv.style.height = '';
        cv.width = result.width; cv.height = result.height;
        cv.getContext('2d').drawImage(result, 0, 0);
      }
      async function renderResult() {
        setBusy(true); await tick();
        filtered = applyFilter(base, filter);
        strokes = []; redo = []; erasedCv = null; bgCv = null;
        paint(); setBusy(false);
      }
      function bake() {                                   // Roshni/Contrast ko pakka kar do (Clean se pehle)
        if (bright === 0 && contrast === 1) return;
        filtered = lutCopy(strokes.length ? erasedCv : filtered, bright, contrast);
        strokes = []; redo = []; erasedCv = null; bgCv = null; bright = 0; contrast = 1;
      }

      async function showEnhance() {
        mode = 'enh'; title('Filter / Edit');
        setBusy(true); await tick();
        if (!thumbs) thumbs = makeThumbs(base);
        bar.innerHTML = `<div class="cx-th" id="ths">${FILTERS.map(f => `<button data-f="${f[0]}"><img src="${thumbs[f[0]]}"><span>${f[1]}</span></button>`).join('')}</div>
          <div id="adj" style="display:none">
            <div class="cx-sl"><span>Roshni</span><input type="range" id="slB" min="-60" max="60" step="1" value="${bright}"><b id="vB">${bright}</b></div>
            <div class="cx-sl"><span>Contrast</span><input type="range" id="slC" min="70" max="190" step="1" value="${Math.round(contrast * 100)}"><b id="vC">${Math.round(contrast * 100)}</b><button id="slR" title="Reset" aria-label="Reset">${ICON.rotate}</button></div>
          </div>
          <div class="cx-tools"><button id="bCrop">${IC2.full}<span>Crop</span></button><button id="bRot">${ICON.rotate}<span>Rotate</span></button><button id="bClean">${IC2.eraser}<span>Clean</span></button><button id="bAdj">${IC2.sliders}<span>Adjust</span></button></div>
          <div class="cx-bar" style="border:0;padding-top:0"><button class="cx-btn" style="width:100%" id="bSave">${ICON.check} Page save</button></div>`;
        const mark = () => bar.querySelectorAll('#ths button').forEach(b => b.classList.toggle('on', b.dataset.f === filter));
        mark();
        bar.querySelectorAll('#ths button').forEach(b => b.onclick = async () => { if (b.dataset.f === filter && filtered) return; filter = b.dataset.f; mark(); await renderResult(); });
        let raf = 0; const sched = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); };
        const slB = bar.querySelector('#slB'), slC = bar.querySelector('#slC');
        slB.oninput = () => { bright = +slB.value; bar.querySelector('#vB').textContent = bright; sched(); };
        slC.oninput = () => { contrast = +slC.value / 100; bar.querySelector('#vC').textContent = slC.value; sched(); };
        bar.querySelector('#slR').onclick = () => { bright = 0; contrast = 1; slB.value = 0; slC.value = 100; bar.querySelector('#vB').textContent = 0; bar.querySelector('#vC').textContent = 100; paint(); };
        bar.querySelector('#bAdj').onclick = e => { const a = bar.querySelector('#adj'); const on = a.style.display === 'none'; a.style.display = on ? 'block' : 'none'; e.currentTarget.classList.toggle('on', on); };
        bar.querySelector('#bCrop').onclick = () => { base = null; filtered = null; result = null; work = null; thumbs = null; strokes = []; redo = []; erasedCv = null; bgCv = null; rot = 0; showCropBar(); };
        bar.querySelector('#bRot').onclick = async () => {
          setBusy(true); await tick(); base = rotate90(base); rot = (rot + 1) % 4; thumbs = makeThumbs(base);
          bar.querySelectorAll('#ths button').forEach(b => { b.querySelector('img').src = thumbs[b.dataset.f]; });
          await renderResult();
        };
        bar.querySelector('#bClean').onclick = enterClean;
        bar.querySelector('#bSave').onclick = async () => {
          setBusy(true); await tick(); paint();
          const blob = await canvasToBlob(result, CFG.jpegQ);
          const t = document.createElement('canvas'), k = 240 / Math.max(result.width, result.height);
          t.width = Math.round(result.width * k); t.height = Math.round(result.height * k);
          t.getContext('2d').drawImage(result, 0, 0, t.width, t.height);
          close({ blob, w: result.width, h: result.height, thumb: t.toDataURL('image/jpeg', 0.7), file,
            corners: corners.map(c => ({ x: c.x / src.width, y: c.y / src.height })), filter, rot, bright, contrast, srot });
        };
        if (!filtered) await renderResult(); else { paint(); setBusy(false); }
        setBusy(false);
      }

      /* ============ CLEAN (eraser): daag / pen ke nishaan mitao ============ */
      const brushPx = () => Math.max(4, BRUSH[brush] * filtered.width / 100);
      function strokePath(ex, s) {
        ex.save(); ex.lineCap = 'round'; ex.lineJoin = 'round'; ex.lineWidth = s.w; ex.strokeStyle = erasePat; ex.beginPath();
        ex.moveTo(s.p[0][0], s.p[0][1]);
        if (s.p.length === 1) ex.lineTo(s.p[0][0] + 0.01, s.p[0][1]); else for (let i = 1; i < s.p.length; i++) ex.lineTo(s.p[i][0], s.p[i][1]);
        ex.stroke(); ex.restore();
      }
      function rebuildErased() {
        if (!erasedCv || erasedCv.width !== filtered.width || erasedCv.height !== filtered.height) { erasedCv = document.createElement('canvas'); erasedCv.width = filtered.width; erasedCv.height = filtered.height; }
        const ex = erasedCv.getContext('2d'); ex.drawImage(filtered, 0, 0);
        erasePat = ex.createPattern(bgCv, 'no-repeat');
        strokes.forEach(s => strokePath(ex, s));
      }
      const showErased = () => { cv.style.width = cv.style.height = ''; cv.width = erasedCv.width; cv.height = erasedCv.height; cv.getContext('2d').drawImage(erasedCv, 0, 0); };
      function drawSeg(a, b, w) {
        const ex = erasedCv.getContext('2d');
        ex.save(); ex.lineCap = 'round'; ex.lineJoin = 'round'; ex.lineWidth = w; ex.strokeStyle = erasePat; ex.beginPath();
        ex.moveTo(a[0], a[1]); ex.lineTo(a === b ? b[0] + 0.01 : b[0], b[1]); ex.stroke(); ex.restore();
        const m = w / 2 + 3, x0 = Math.max(0, Math.min(a[0], b[0]) - m), y0 = Math.max(0, Math.min(a[1], b[1]) - m);
        const x1 = Math.min(cv.width, Math.max(a[0], b[0]) + m), y1 = Math.min(cv.height, Math.max(a[1], b[1]) + m);
        cv.getContext('2d').drawImage(erasedCv, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
      }
      function startStroke(e) { cv.setPointerCapture(e.pointerId); const p = imgPos(e); cur = { w: brushPx(), p: [p] }; drawSeg(p, p, cur.w); }
      function moveStroke(e) {
        const p = imgPos(e), l = cur.p[cur.p.length - 1];
        if (Math.hypot(p[0] - l[0], p[1] - l[1]) < 1) return;
        cur.p.push(p); drawSeg(l, p, cur.w);
      }
      function endStroke() { if (cur) { strokes.push(cur); redo = []; cur = null; updUR(); } }
      function updUR() {
        const u = bar.querySelector('#cUndo'), r = bar.querySelector('#cRedo');
        if (u) u.disabled = !strokes.length; if (r) r.disabled = !redo.length;
      }
      async function enterClean() {
        setBusy(true); await tick();
        bake();
        if (!bgCv || bgFor !== filtered) { bgCv = paperBg(filtered); bgFor = filtered; }
        rebuildErased(); snapshot = strokes.slice();
        mode = 'clean'; title('Clean');
        showErased(); showCleanBar(); setBusy(false);
      }
      function showCleanBar() {
        const sz = [10, 15, 21, 28, 36];
        bar.innerHTML = `<div class="cx-tip">Daag / nishaan par ungli ghumao - wo paper ke rang se dhak jayega</div>
          <div class="cx-brush">${sz.map((s, i) => `<button data-b="${i}" class="${i === brush ? 'on' : ''}"><i style="width:${s}px;height:${s}px"></i></button>`).join('')}</div>
          <div class="cx-bar" style="border:0;padding-top:4px"><button class="cx-btn sec" id="cUndo">${IC2.undo}</button><button class="cx-btn sec" id="cRedo">${IC2.redo}</button></div>
          <div class="cx-bar" style="border:0;padding-top:0"><button class="cx-btn sec" id="cReset" style="flex:1">Reset</button><button class="cx-btn" id="cApply" style="flex:1.6">${ICON.check} Apply</button></div>`;
        bar.querySelectorAll('.cx-brush button').forEach(b => b.onclick = () => { brush = +b.dataset.b; bar.querySelectorAll('.cx-brush button').forEach(x => x.classList.toggle('on', x === b)); });
        bar.querySelector('#cUndo').onclick = () => { if (!strokes.length) return; redo.push(strokes.pop()); rebuildErased(); showErased(); updUR(); };
        bar.querySelector('#cRedo').onclick = () => { if (!redo.length) return; strokes.push(redo.pop()); rebuildErased(); showErased(); updUR(); };
        bar.querySelector('#cReset').onclick = () => { strokes = []; redo = []; rebuildErased(); showErased(); updUR(); };
        bar.querySelector('#cApply').onclick = async () => { redo = []; await showEnhance(); };
        updUR();
      }
      async function cancelClean() { strokes = snapshot || []; redo = []; if (strokes.length) rebuildErased(); await showEnhance(); }

      showCropBar();
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
      <button class="cx-opt" id="cxScan"><span class="ic">${ICON.scan}</span><span><b>Scan karo</b><small>Camera se copy scan - saaf, seedha PDF banega</small></span></button>
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

    go.disabled = true; msg.className = 'cx-msg'; msg.style.color = '#9fb0cc'; msg.textContent = 'Upload ho raha hai...';
    try {
      const user = (await sb().auth.getUser()).data?.user;
      if (!user) throw new Error('Login expire ho gaya, dobara login karein');
      const MSG_DUP = 'Aap is class/subject/chapter ke liye pehle hi note upload kar chuke ho. Dobara add nahi kar sakte.';
      if (!IS_FORMULAS) {                                   // file upload se PEHLE check, taaki bekaar file na bache
        const chk = await sb().from('notes').select('id', { count: 'exact', head: true })
          .eq('uploaded_by', user.id).eq('class', cls).eq('subject', sub.toLowerCase()).eq('chapter_number', parseInt(ch, 10));
        if (!chk.error && chk.count > 0) throw new Error(MSG_DUP);
      }
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
      if (ins.error) throw new Error(ins.error.code === '23505' && !IS_FORMULAS ? MSG_DUP : 'Save fail: ' + ins.error.message);

      openSheet(`<div class="cx-ok">${ICON.checkCircle}</div><h3 style="text-align:center">Upload ho gaya</h3><p class="cx-sub" style="text-align:center">Admin ki approval ke baad ye site par dikhega. Shukriya!</p>
        <button class="cx-btn full" id="cxOk">Theek hai</button>`);
      $('#cxOk', ov).onclick = closeSheet;
    } catch (e) {
      msg.className = 'cx-msg'; msg.style.color = ''; msg.textContent = '' + e.message; go.disabled = false;
    }
  }

  /* =====================================================================
     MOUNT - menu me "Add Notes" jodo (ya formulas page par button)
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
