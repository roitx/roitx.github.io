/* =====================================================
   PM-Roitx — Premium Preview Builder (shared)
   Use: upload-premium.html + preview-maker.html
   Needs: pdf-lib (cdnjs) loaded BEFORE this file for PDFs
   PDF  -> pehle page ki 1-page watermark wali PDF
   IMG  -> max 900px, watermark wala JPEG
   Output path: previews/<file_path bina extension>.pdf|jpg  (bucket: admin-files, public)
   ===================================================== */
(function () {
  // 🖼️ Watermark logo (site ke root me). Naam badalna ho to sirf yahi line badlo.
  const LOGO_URL = "profile.png";
  const WATERMARK = "PM-ROITX PREVIEW";   // logo na mile to ye text watermark lagega

  let _logoBytes = null;   // cache (None = abhi load nahi, false = mila nahi)
  async function getLogoBytes() {
    if (_logoBytes !== null) return _logoBytes;
    try {
      const r = await fetch(LOGO_URL, { cache: "force-cache" });
      if (!r.ok) throw new Error("logo not found");
      _logoBytes = await r.arrayBuffer();
    } catch (e) {
      console.warn("Watermark logo load nahi hua, text watermark use hoga:", e.message);
      _logoBytes = false;
    }
    return _logoBytes;
  }

  function isPdfName(name, blob) {
    return /\.pdf$/i.test(name || "") || (blob && blob.type === "application/pdf");
  }

  function previewPathFor(filePath, isPdf) {
    const base = String(filePath || "").replace(/^.*\//, "").replace(/\.[^.]+$/, "");
    return `previews/${base}.${isPdf ? "pdf" : "jpg"}`;
  }

  async function buildPdfPreview(blob) {
    if (!window.PDFLib) throw new Error("pdf-lib load nahi hua (internet check karein)");
    const { PDFDocument, StandardFonts, rgb, degrees } = window.PDFLib;
    const src = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true });
    if (src.getPageCount() < 1) throw new Error("PDF me koi page nahi hai");
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(src, [0]);
    out.addPage(page);
    const { width, height } = page.getSize();

    // Logo embed (PNG, nahi to JPG)
    let logo = null;
    const bytes = await getLogoBytes();
    if (bytes) {
      try { logo = await out.embedPng(bytes); }
      catch (e) { try { logo = await out.embedJpg(bytes); } catch (e2) { logo = null; } }
    }

    if (logo) {
      const ratio = logo.width / logo.height;

      // 1) Bada logo beech me (halka)
      let w = width * 0.55, h = w / ratio;
      if (h > height * 0.55) { h = height * 0.55; w = h * ratio; }
      page.drawImage(logo, { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h, opacity: 0.12 });

      // 2) Chhote logo ki jaali (crop karke hatana mushkil)
      const tw = width * 0.14, th = tw / ratio;
      const gx = tw * 2.4, gy = th * 2.4;
      for (let y = gy * 0.4; y < height; y += gy) {
        for (let x = gx * 0.4; x < width; x += gx) {
          page.drawImage(logo, { x, y, width: tw, height: th, opacity: 0.07, rotate: degrees(20) });
        }
      }
    } else {
      const font = await out.embedFont(StandardFonts.HelveticaBold);
      page.drawText(WATERMARK, {
        x: width * 0.10, y: height * 0.30,
        size: Math.min(width, height) / 9,
        font, color: rgb(0.8, 0.1, 0.1), opacity: 0.18, rotate: degrees(35)
      });
    }
    return new Blob([await out.save()], { type: "application/pdf" });
  }

  async function buildImagePreview(blob) {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, 900 / bmp.width);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * scale));
    c.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = c.getContext("2d");
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    let logoBmp = null;
    const bytes = await getLogoBytes();
    if (bytes) {
      try { logoBmp = await createImageBitmap(new Blob([bytes])); } catch (e) { logoBmp = null; }
    }

    if (logoBmp) {
      const ratio = logoBmp.width / logoBmp.height;

      // 1) Bada logo beech me (halka)
      let w = c.width * 0.55, h = w / ratio;
      if (h > c.height * 0.55) { h = c.height * 0.55; w = h * ratio; }
      ctx.globalAlpha = 0.12;
      ctx.drawImage(logoBmp, (c.width - w) / 2, (c.height - h) / 2, w, h);

      // 2) Chhote logo ki jaali
      const tw = c.width * 0.14, th = tw / ratio;
      const gx = tw * 2.4, gy = th * 2.4;
      ctx.globalAlpha = 0.07;
      for (let y = gy * 0.4; y < c.height; y += gy) {
        for (let x = gx * 0.4; x < c.width; x += gx) {
          ctx.save();
          ctx.translate(x + tw / 2, y + th / 2);
          ctx.rotate(-Math.PI / 9);
          ctx.drawImage(logoBmp, -tw / 2, -th / 2, tw, th);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.save();
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate(-Math.PI / 6);
      ctx.fillStyle = "rgba(220,30,30,0.22)";
      ctx.font = `bold ${Math.round(c.width / 9)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(WATERMARK, 0, 0);
      ctx.restore();
    }
    const out = await new Promise(r => c.toBlob(r, "image/jpeg", 0.6));
    if (!out) throw new Error("Image preview nahi ban payi");
    return out;
  }

  // file: File/Blob, fileName: premium file ka naam/path (extension se type pata chalta hai)
  async function build(file, fileName) {
    const pdf = isPdfName(fileName, file);
    const blob = pdf ? await buildPdfPreview(file) : await buildImagePreview(file);
    return {
      blob,
      path: previewPathFor(fileName, pdf),
      contentType: pdf ? "application/pdf" : "image/jpeg"
    };
  }

  window.PremiumPreview = { build, previewPathFor };
})();
