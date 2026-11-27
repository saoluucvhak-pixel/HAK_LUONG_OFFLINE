(function (root) {
  "use strict";
  const node = typeof module !== "undefined" && module.exports;
  const CLS = node ? require("./payroll-close.js") : root.HAKCore.close;
  const access = node ? require("./access-mode.js") : root.HAKCore.accessMode;
  const mode = db => ["direct", "account"].includes(access.mode(db)) ? "single" : ((db.workflowSettings || [])[0] || {}).mode || "";
  const account = value => String(value || "").trim().toLowerCase();
  const ticket = (db, ky) => (db.payrollApprovals || []).find(row => row.ky === ky);

  function readiness(db) {
    const permissions = node ? require("./permissions.js") : root.HAKCore.perm;
    const users = db.nguoidung || [];
    const canPair = (write, approve) => users.some(maker =>
      account(maker.tenDangNhap) && permissions.can(maker, write) && users.some(reviewer =>
        account(reviewer.tenDangNhap) && account(reviewer.tenDangNhap) !== account(maker.tenDangNhap) && permissions.can(reviewer, approve)));
    const missing = [];
    if (!canPair("payroll.calc", "payroll.approve")) missing.push("người lập và người duyệt bảng lương");
    if (!canPair("payment.record", "payment.approve")) missing.push("người lập và người duyệt chứng từ thanh toán");
    return missing.length ? "Cần hai tài khoản hoạt động, khác nhau và có quyền tương ứng cho: " + missing.join("; ") + ". Vào Công ty & Sao lưu → Người dùng để bổ sung hoặc mở khóa tài khoản." : "";
  }

  function validApprovalTime(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
      Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
  }

  function approvalRecord(row, version) {
    if (!row || !row.preparer || !row.approver || row.preparer === row.approver || !validApprovalTime(row.approvedAt)) return null;
    return { preparer: row.preparer, approver: row.approver, approvedAt: row.approvedAt, version: version, digest: row.digest };
  }

  function fingerprint(db, snap, legacy) {
    const input = CLS.buildSnapshot(db, snap.ky, { bangluong: [], bhxh: [], tncn: [], canhbao: [] }, [], {}).input;
    if (!legacy) {
      for (const company of input.danhmuc.congty) {
        for (const field of ["Tên công ty", "Địa chỉ", "Mã số thuế", "Số điện thoại", "Người đại diện pháp luật"]) delete company[field];
      }
      input.danhmuc.congty = input.danhmuc.congty.filter(row => Object.keys(row).length);
    }
    return CLS.checksum({
      settings: db.workflowSettings, ky: snap.ky, version: snap.version, method: snap.buTheoNgay,
      rule: snap.quyChe, engineVersion: snap.engineVersion, input,
      result: ["bangluong", "bhxh", "tncn"].map(table => snap.kq[table])
    });
  }

  function checkApprovalChanges(before, next, who) {
    const old = before.payrollApprovals || [], rows = next.payrollApprovals || [], me = account(who.user);
    if (mode(before) !== "roles" || !me || !Array.isArray(rows)) return "Cần bật phân quyền và đăng nhập để gửi/duyệt bảng lương.";
    if (new Set(rows.map(row => row && row.ky)).size !== rows.length ||
        old.some(row => !ticket(next, row.ky))) return "Không được xóa hoặc tạo trùng yêu cầu duyệt.";
    for (const row of rows) {
      const prior = row && ticket(before, row.ky);
      if (JSON.stringify(prior) === JSON.stringify(row)) continue;
      if (!row || !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.ky) || !/^[a-f0-9]{8}$/.test(row.digest) || CLS.current(before, row.ky)) return "Yêu cầu duyệt kỳ lương không hợp lệ.";
      if (row.approver === "") {
        if (!who.perms.includes("payroll.calc") || row.preparer !== me) return "Chỉ người lập được gửi yêu cầu duyệt bằng tài khoản của mình.";
      } else if (!who.perms.includes("payroll.approve") || !prior || prior.approver ||
          row.approver !== me || prior.preparer === me || !validApprovalTime(row.approvedAt) ||
          JSON.stringify(row) !== JSON.stringify(Object.assign({}, prior, { approver: me, approvedAt: row.approvedAt }))) {
        return "Người duyệt phải có quyền duyệt, khác người lập và duyệt đúng yêu cầu đã gửi.";
      }
    }
    return "";
  }

  function matchesFingerprint(db, snap, digest) {
    return digest === fingerprint(db, snap) || digest === fingerprint(db, snap, true);
  }

  const api = { mode, account, ticket, readiness, approvalRecord, fingerprint, matchesFingerprint, checkApprovalChanges };
  if (node) module.exports = api; else root.HAKCore.workflowApproval = api;
})(typeof window !== "undefined" ? window : this);
