/**
 * excel-io.js — HAK.Excel: đọc Excel → bảng dữ liệu (tự nhận bảng theo tiêu đề cột), xuất Excel có định dạng, lưu file.
 */
(function (root) {
  'use strict';
  const HAK = (root.HAK = root.HAK || {});
  const pad2 = (n) => ('0' + n).slice(-2);
  const fold = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

  /** Giá trị ô → ISO "YYYY-MM-DD" (Date, số seri Excel, "dd/mm/yyyy", "yyyy-mm-dd"); không đọc được → ''. */
  function toISO(v) {
    if (v === null || v === undefined || v === '') return '';
    if (v instanceof Date) return isNaN(v) ? '' : v.getUTCFullYear() + '-' + pad2(v.getUTCMonth() + 1) + '-' + pad2(v.getUTCDate());
    if (typeof v === 'number') { if (v < 20000 || v > 80000) return ''; const d = new Date(Math.round((v - 25569) * 86400000)); return toISO(d); }
    const s = String(v).trim(); let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]);
    if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/))) return m[3] + '-' + pad2(m[2]) + '-' + pad2(m[1]);
    return '';
  }
  function toNum(v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') return v;
    if (typeof v === 'object' && v.result !== undefined) return toNum(v.result);
    const s = String(v).trim(); if (!s) return '';
    const n = HAK.NumFmt ? HAK.NumFmt.parse(s, 'num') : parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return n === null || n === undefined || !isFinite(n) ? s : n;
  }
  const cellVal = (c) => { let v = c; if (v && typeof v === 'object' && !(v instanceof Date)) { if (v.result !== undefined) v = v.result; else if (v.richText) v = v.richText.map((x) => x.text).join(''); else if (v.text !== undefined) v = v.text; } return v; };

  /** Đọc file Excel → [{ name, rows: [[…]] }] */
  async function readWorkbook(file) {
    await HAK.UI.needLib('exceljs');
    const wb = new root.ExcelJS.Workbook(); await wb.xlsx.load(await file.arrayBuffer());
    return wb.worksheets.map((ws) => {
      const rows = []; ws.eachRow({ includeEmpty: false }, (row) => { const a = []; for (let i = 1; i <= row.cellCount; i++) a.push(cellVal(row.getCell(i).value)); rows.push(a); });
      return { name: ws.name, rows };
    });
  }
  /** Tìm dòng tiêu đề (trong 15 dòng đầu) khớp nhiều cột nhất với bảng t. → { table, score, headerAt } */
  function detect(rows, tables) {
    let best = null;
    for (let h = 0; h < Math.min(rows.length, 15); h++) {
      const set = new Set(rows[h].map(fold));
      tables.forEach((t) => { const hit = t.header.filter((c) => set.has(fold(c))).length, score = hit / t.header.length; if (hit >= 3 && (!best || score > best.score)) best = { table: t, score, hit, headerAt: h }; });
    }
    return best;
  }
  /** Chuyển ma trận → mảng object theo bảng t (chỉ cột khớp tên), chuẩn hóa ngày/số. */
  function toRows(t, matrix, headerAt) {
    const head = matrix[headerAt].map(fold), idx = {}; t.header.forEach((c) => { const i = head.indexOf(fold(c)); if (i >= 0) idx[c] = i; });
    const out = [];
    for (let r = headerAt + 1; r < matrix.length; r++) {
      const row = {}; let any = false;
      t.header.forEach((c) => {
        let v = idx[c] === undefined ? '' : matrix[r][idx[c]]; if (v === undefined || v === null) v = '';
        if (t.dates.indexOf(c) >= 0) v = toISO(v); else if (t.nums.indexOf(c) >= 0) v = toNum(v); else if (t.day && t.day.indexOf(c) >= 0) v = typeof v === 'number' ? v : String(v).trim(); else if (v instanceof Date) v = toISO(v); else v = typeof v === 'number' ? v : String(v).trim();
        if (v !== '' && c !== 'TT') any = true; row[c] = v;
      });
      if (any) out.push(row);
    }
    return out;
  }

  /* ---------- Xuất ---------- */
  const FONT = 'Arial';
  const ARGB_HEAD = 'FF1F4E78';
  /** Thêm 1 trang tính: tiêu đề + dòng mô tả + bảng. cols = [{h, w, n('#,##0'), d(true=ngày)}], rows = mảng object hoặc mảng mảng. */
  function addSheet(wb, name, title, sub, cols, rows, opt) {
    opt = opt || {};
    const ws = wb.addWorksheet(String(name).slice(0, 31)), thin = { style: 'thin', color: { argb: 'FF9E9E9E' } }, B = { top: thin, left: thin, bottom: thin, right: thin };
    ws.columns = cols.map((c) => ({ width: c.w || 14 }));
    ws.mergeCells(1, 1, 1, cols.length); Object.assign(ws.getCell(1, 1), { value: title, font: { name: FONT, size: 13, bold: true } });
    ws.mergeCells(2, 1, 2, cols.length); Object.assign(ws.getCell(2, 1), { value: sub || '', font: { name: FONT, size: 9, italic: true, color: { argb: 'FF555555' } }, alignment: { wrapText: true, vertical: 'top' } });
    cols.forEach((c, i) => Object.assign(ws.getCell(4, i + 1), { value: c.h, font: { name: FONT, size: 9, bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: ARGB_HEAD } }, border: B, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } }));
    ws.getRow(4).height = 36;
    rows.forEach((r, ri) => cols.forEach((c, i) => {
      const cell = ws.getCell(5 + ri, i + 1); let v = Array.isArray(r) ? r[i] : r[c.h];
      if (c.d && typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v)) { v = new Date(v + 'T00:00:00Z'); cell.numFmt = 'dd/mm/yyyy'; }
      cell.value = v === '' || v === undefined ? null : v; cell.border = B; cell.font = { name: FONT, size: 9 };
      if (c.n) { cell.numFmt = c.n; cell.alignment = { horizontal: 'right' }; }
    }));
    let last = 4 + rows.length;
    if (opt.total && rows.length) {
      last++;
      cols.forEach((c, i) => {
        const cell = ws.getCell(last, i + 1); cell.border = { top: { style: 'double', color: { argb: 'FF808080' } }, bottom: { style: 'double', color: { argb: 'FF808080' } }, left: thin, right: thin };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } }; cell.font = { name: FONT, size: 9, bold: true };
        if (i === 0) cell.value = 'TỔNG CỘNG (' + rows.length + ')';
        else if (c.n && c.sum !== false) { const L = colName(i + 1), res = rows.reduce((a, r) => a + (Number(Array.isArray(r) ? r[i] : r[c.h]) || 0), 0); cell.value = { formula: 'SUM(' + L + '5:' + L + (last - 1) + ')', result: res }; cell.numFmt = c.n; cell.alignment = { horizontal: 'right' }; }
      });
    }
    ws.views = [{ state: 'frozen', xSplit: opt.freezeCols || 0, ySplit: 4 }];
    ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    return ws;
  }
  const colName = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  async function newWorkbook() { await HAK.UI.needLib('exceljs'); const wb = new root.ExcelJS.Workbook(); wb.creator = 'HAK Tính lương'; wb.created = new Date(); return wb; }
  const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  async function saveWorkbook(wb, fileName) { return saveBlob(new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_MIME }), fileName); }
  /** Lưu file: hộp thoại "Lưu như" của trình duyệt nếu có, ngược lại tải xuống thường. Trả true nếu đã lưu. */
  async function saveBlob(blob, fileName) {
    if (root.showSaveFilePicker) {
      try {
        const ext = (fileName.match(/\.[A-Za-z0-9]+$/) || ['.xlsx'])[0], h = await root.showSaveFilePicker({ suggestedName: fileName, types: [{ description: 'Tệp', accept: { [blob.type || 'application/octet-stream']: [ext] } }] });
        const w = await h.createWritable(); await w.write(blob); await w.close(); return true;
      } catch (e) { if (e && e.name === 'AbortError') return false; /* lỗi khác → tải thường */ }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); return true;
  }
  HAK.Excel = { readWorkbook, detect, toRows, toISO, toNum, addSheet, newWorkbook, saveWorkbook, saveBlob, fold };
  if (typeof module === 'object' && module.exports) module.exports = HAK.Excel;
})(typeof window !== 'undefined' ? window : globalThis);
