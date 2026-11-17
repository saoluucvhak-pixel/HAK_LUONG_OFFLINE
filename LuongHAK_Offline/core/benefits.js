// Cấp phát (sữa phúc lợi + bảo hộ lao động): cửa chung gộp ba phần, giữ nguyên tên và hành vi của core/benefits.js cũ.
//   benefits-rules.js   : tiêu chuẩn, định mức, đã cấp, kiểm tra phiếu, thu hồi/đổi cỡ, validateChanges (dùng cả ở tiến trình chính)
//   benefits-ledger.js  : sổ cái lượt cấp/thu hồi, phiếu, báo cáo tổng hợp/chi tiết
//   benefits-import.js  : nhập Excel thành phiếu nháp
(function (root) {
  "use strict";
  const node = typeof module !== "undefined" && module.exports;
  const R = node ? require("./benefits-rules.js") : root.HAKCore.benefitsRules;
  const L = node ? require("./benefits-ledger.js") : root.HAKCore.benefitsLedger;
  const I = node ? require("./benefits-import.js") : root.HAKCore.benefitsImport;
  const api = {
    entitlement: R.entitlement, issued: R.issued, reviewIssue: R.reviewIssue, validateChanges: R.validateChanges, standardAt: R.standardAt, standardProblem: R.standardProblem,
    monthlyReport: R.monthlyReport, NO_STANDARD_NOTE: R.NO_STANDARD_NOTE, GROUPS: R.GROUPS, docType: R.docType, sizeOf: R.sizeOf, ppeItemProblem: R.ppeItemProblem,
    recallable: R.recallable, adjustmentProblem: R.adjustmentProblem,
    LABEL: L.LABEL, STATUS_LABEL: L.STATUS_LABEL, DETAIL_COLUMNS: L.DETAIL_COLUMNS, ledger: L.ledger, report: L.report, detailReport: L.detailReport,
    summaryReport: L.summaryReport, listVouchers: L.listVouchers, buildVoucher: L.buildVoucher, snapshotLine: L.snapshotLine,
    TEMPLATE_COLUMNS: I.TEMPLATE_COLUMNS, planImport: I.planImport
  };
  if (node) module.exports = api; else root.HAKCore.benefits = api;
})(typeof window !== "undefined" ? window : this);
