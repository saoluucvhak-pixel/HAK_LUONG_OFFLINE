// Dòng TỔNG của báo cáo được ĐÁNH DẤU rõ ràng khi dựng (mark), không đoán từ chữ trong dữ liệu (mã NV/tên bắt đầu bằng "TỔNG", "CẢ NĂM", "TOTAL"… là dữ liệu thật).
// Dấu là thuộc tính KHÔNG liệt kê được: không lộ thành cột, không vào JSON/Excel/PDF, không đổi khi sao chép bằng Object.assign — nên nơi nào sao chép dòng tổng
// phải gọi mark() lại (addTotal làm việc đó). Dòng không có dấu luôn là dòng dữ liệu.
(function (root) {
  "use strict";
  var KEY = "_tong";
  function mark(row) { if (row && typeof row === "object" && row[KEY] !== true) Object.defineProperty(row, KEY, { value: true, enumerable: false, configurable: true }); return row; }
  function is(row) { return !!row && typeof row === "object" && row[KEY] === true; }
  var api = { mark: mark, is: is, KEY: KEY };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else { root.HAKCore = root.HAKCore || {}; root.HAKCore.totalRow = api; }
})(typeof window !== "undefined" ? window : this);
