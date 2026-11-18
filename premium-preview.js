/* =====================================================
   PM-Roitx — Premium Preview Builder (shared)
   Use: upload-premium.html + preview-maker.html
   Needs: pdf-lib (cdnjs) loaded BEFORE this file for PDFs
   PDF  -> pehle page ki 1-page watermark wali PDF
   IMG  -> max 900px, watermark wala JPEG
   Output path: previews/<file_path bina extension>.pdf|jpg  (bucket: admin-files, public)
   ===================================================== */
(function () {
  const WATERMARK = "PM-ROITX PREVIEW";

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
    const font = await out.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();
    page.drawText(WATERMARK, {
      x: width * 0.10, y: height * 0.30,
      size: Math.min(width, height) / 9,
      font, color: rgb(0.8, 0.1, 0.1), opacity: 0.18, rotate: degrees(35)
    });
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
    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.fillStyle = "rgba(220,30,30,0.22)";
    ctx.font = `bold ${Math.round(c.width / 9)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(WATERMARK, 0, 0);
    ctx.restore();
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
