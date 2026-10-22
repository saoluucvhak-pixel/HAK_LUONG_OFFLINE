/**
 * numfmt.js — ô nhập số kiểu Việt: tự thêm dấu "." hàng nghìn và "," thập phân khi rời ô (blur).
 *  - data-numfmt="num"  : kg / tấn / tiền — parseNum ("6.500" = 6500, "13.010,81", "0,123" = 0.123, "1,234,567" = 1234567).
 *  - data-numfmt="dec"  : độ ẩm, hệ số… không có dấu nghìn — dấu "," hoặc "." đơn luôn là dấu thập phân ("49,981" = 49,981).
 * Giá trị máy đọc (parse) luôn từ HAK.NumFmt.parse; ô chỉ hiển thị đã định dạng.
 */
(function (root) {
  'use strict';
  const HAK = (root.HAK = root.HAK || {});
  /** Số kiểu Việt → Number (null nếu không phải số). Có "," → "," là thập phân, "." là nghìn; chỉ có "." → nghìn khi đúng dạng nhóm 3 số
   *  (1.234 / 20.800.000), ngược lại là thập phân (1.5, 0.123); nhiều "," dạng nhóm 3 số (dán từ Excel tiếng Anh) → nghìn. */
  function parseNum(s) {
    if (typeof s === 'number') return isFinite(s) ? s : null;
    let t = String(s == null ? '' : s).trim().replace(/\s+/g, '');
    if (!t) return null;
    if (/^-?[1-9]\d{0,2}(,\d{3}){2,}$/.test(t)) t = t.replace(/,/g, '');
    else if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
  }
  /** "dec": 1 dấu , hoặc . → thập phân; còn lại (cả hai dấu / nhiều dấu) nhường cho parseNum. */
  function parseDec(s) {
    const t = String(s == null ? '' : s).trim().replace(/\s+/g, '');
    if (!t) return null;
    if (/^-?\d+[.,]\d+$/.test(t)) { const n = parseFloat(t.replace(',', '.')); return isFinite(n) ? n : null; }
    return parseNum(t);
  }
  function parse(s, mode) { const n = mode === 'dec' ? parseDec(s) : parseNum(s); return n === null || n === undefined || !isFinite(n) ? null : n; }
  /** Số → chữ Việt: nghìn "." thập phân ","; đúng 3 chữ số lẻ ở chế độ num thì thêm "0" (54,1230) để không bị đọc nhầm là dấu nghìn. */
  function txt(n, mode) {
    if (n === null || n === undefined || n === '' || !isFinite(+n)) return '';
    const s = String(Number((+n).toFixed(6))), neg = s[0] === '-', [i, d] = s.replace('-', '').split('.');
    const dec = d ? (mode !== 'dec' && d.length === 3 && i !== '0' ? d + '0' : d) : '';   // "0,123" không mơ hồ → không cần thêm 0
    return (neg ? '-' : '') + (mode === 'dec' ? i : i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')) + (dec ? ',' + dec : '');
  }
  /** Định dạng lại 1 ô; ô trống / không phải số thì giữ nguyên (không xóa chữ người dùng gõ). */
  function format(el) {
    const mode = el.dataset.numfmt === 'dec' ? 'dec' : 'num', v = el.value.trim();
    if (!v) return;
    const n = parse(v, mode);
    el.classList.toggle('is-invalid', n === null);
    if (n !== null) { const t = txt(n, mode); if (t !== el.value) { el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); } }
  }
  /** Gắn 1 lần cho cả vùng (ủy quyền focusout) — dùng cho trang biên bản và hộp thoại Danh mục. */
  function attach(container) {
    if (!container || container.__numfmt) return;
    container.__numfmt = true;
    container.addEventListener('focusout', (e) => { const el = e.target; if (el && el.dataset && el.dataset.numfmt) format(el); });
  }
  HAK.NumFmt = { parse, txt, format, attach };
  if (typeof module !== 'undefined' && module.exports) module.exports = HAK.NumFmt;
})(typeof window !== 'undefined' ? window : globalThis);
