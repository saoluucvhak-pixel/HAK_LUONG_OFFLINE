// Đo TẠO file Excel báo cáo (ui/report-xlsx.js + ExcelJS, đúng mã ứng dụng dùng) trong Chromium với bảng N dòng × 22 cột kiểu bảng lương.
// In: thời gian dựng + ghi, đỉnh JS heap, kích thước file, và (nếu bật streaming) cùng số đo cho đường ghi từng khối. Dữ liệu giả, không cần Electron.
// Chạy: node tests/perf/excel-build-bench.js [N,N...]   (mặc định 1000,5000,20000)
/* global window, performance, ExcelJS, gc */
"use strict";
const fs = require("fs"), path = require("path"), { chromium } = require("playwright");
const APP = path.resolve(__dirname, "../..");
(async () => {
  const sizes = (process.argv[2] || "1000,5000,20000").split(",").map(Number), out = [];
  const b = await chromium.launch({ args: ["--enable-precise-memory-info", "--js-flags=--expose-gc --max-old-space-size=4096"] });
  for (const n of sizes) for (const mode of (process.env.MODES || "cu").split(",")) {
    const p = await b.newPage(); await p.setContent("<!doctype html><body></body>");
    await p.addScriptTag({ content: fs.readFileSync(path.join(APP, "exceljs.min.js"), "utf8") });
    await p.addScriptTag({ content: fs.readFileSync(path.join(APP, "ui/report-xlsx.js"), "utf8") });
    if (mode !== "cu") await p.addScriptTag({ content: fs.readFileSync(path.join(APP, "ui/xlsx-stream.js"), "utf8") });
    const r = await p.evaluate(async ({ n, mode }) => {
      const COLS = 22, cols = Array.from({ length: COLS }, (_, i) => ({ key: "c" + i, label: i === 0 ? "Mã NV" : i === 1 ? "Họ và tên" : i === 2 ? "Phòng ban" : "Khoản " + i, kind: i < 3 ? "text" : "money" }));
      const rows = Array.from({ length: n }, (_, k) => { const o = {}; cols.forEach((c, i) => { o[c.key] = i === 0 ? "NV" + String(k).padStart(5, "0") : i === 1 ? "Nguyễn Văn " + k : i === 2 ? "PB" + (k % 40) : (k * 7919 + i * 104729) % 90000000; }); return o; });
      const tong = {}; cols.forEach((c) => { if (c.kind === "money") tong[c.key] = rows.reduce((a, r) => a + r[c.key], 0); });
      const vm = { title: "BẢNG LƯƠNG", congTy: "CÔNG TY THỬ", kyText: "Kỳ 09/2026", phamVi: "Tất cả", ngayLap: "22/11/2026", cols, rows, tong };
      gc(); const h0 = performance.memory.totalJSHeapSize, t0 = performance.now(); let size = 0, err = null; // totalJSHeapSize = bộ nhớ đã cấp: đo đỉnh sau khi dựng (setInterval không chạy được trong lúc dựng đồng bộ)
      try {
        const buf = mode === "cu" ? await window.HAKUi.reportXlsx.build(ExcelJS, vm, { chuKy: ["Người lập", "Kế toán trưởng", "Giám đốc"], nguoiLap: "Thử" }).xlsx.writeBuffer() : await window.HAKUi.xlsxStream.write(ExcelJS, vm, { chuKy: ["Người lập", "Kế toán trưởng", "Giám đốc"], nguoiLap: "Thử" });
        size = buf.byteLength || buf.size || 0;
      } catch (e) { err = String(e && e.message || e); }
      const ms = performance.now() - t0, peak = performance.memory.totalJSHeapSize;
      return { ms: Math.round(ms), heapTruoc_MB: Math.round(h0 / 1048576), heapDinh_MB: Math.round(peak / 1048576), sizeKB: Math.round(size / 1024), err };
    }, { n, mode });
    out.push(Object.assign({ dong: n, cach: mode === "cu" ? "hiện tại" : mode }, r)); await p.close();
  }
  console.log(JSON.stringify(out, null, 1)); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
