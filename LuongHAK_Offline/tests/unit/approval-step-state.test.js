"use strict";
// Thanh 7 bước (app-src/18-bao-cao-luong.js): ở chế độ phân quyền phải nói rõ trạng thái duyệt trước khi chốt.
// Chạy đúng đoạn mã của app (cắt từ app.js) với phụ thuộc giả, cùng cách các test giao diện khác trong repo.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const WA = require("../../core/workflow-approval.js"), PS = require("../../core/payroll-steps.js");
const src = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8");
const from = src.indexOf("  function approvalStateIn("), to = src.indexOf("  function luongSteps(");
assert.ok(from > 0 && to > from, "phải tìm thấy approvalStateIn và luongStepsIn trong app.js");

function setup(over) {
  const ky = "2026-09", ctx = Object.assign({
    db: { workflowSettings: [{ mode: "roles" }], payrollApprovals: [], ttluong: [] },
    st: { kq: { ky }, kqStale: false }, dbRev: 1, STEP_CACHE: { key: "", v: null },
    kyStr: () => ky, approvalDigest: () => "D1", INT: { check: () => [] }, GATE: { blockers: () => [] },
    PLG: { outstanding: () => [], TT: { HUY: "Hủy" } }, C: { workflowApproval: WA, payrollSteps: PS }
  }, over || {});
  vm.createContext(ctx); vm.runInContext(src.slice(from, to), ctx);
  return ctx;
}
const ticket = (o) => Object.assign({ ky: "2026-09", digest: "D1", preparer: "a", approver: "" }, o);

test("U-STEP-APPROVAL-01 trạng thái duyệt: không phân quyền → null; chưa gửi → chua_gui; chờ → cho_duyet; đã duyệt → da_duyet", () => {
  assert.equal(setup({ db: { workflowSettings: [], payrollApprovals: [] } }).approvalStateIn("2026-09"), null);
  const c = setup();
  assert.equal(c.approvalStateIn("2026-09"), "chua_gui");
  c.db.payrollApprovals = [ticket()]; assert.equal(c.approvalStateIn("2026-09"), "cho_duyet");
  c.db.payrollApprovals = [ticket({ approver: "b", approvedAt: "2026-09-30T01:00:00.000Z" })]; assert.equal(c.approvalStateIn("2026-09"), "da_duyet");
});
test("U-STEP-APPROVAL-02 dữ liệu đã đổi sau khi gửi duyệt (mã băm lệch) hoặc không tính được mã băm → het_hieu_luc, kể cả khi đã có người duyệt", () => {
  const c = setup({ approvalDigest: () => "KHAC" });
  c.db.payrollApprovals = [ticket({ approver: "b" })]; assert.equal(c.approvalStateIn("2026-09"), "het_hieu_luc");
  c.db.payrollApprovals = [ticket()]; assert.equal(c.approvalStateIn("2026-09"), "het_hieu_luc");
  const boom = setup({ approvalDigest: () => { throw new Error("x"); } }); boom.db.payrollApprovals = [ticket({ approver: "b" })];
  assert.equal(boom.approvalStateIn("2026-09"), "het_hieu_luc");
  const legacy = setup({ approvalDigest: (ky, kq, legacy) => legacy ? "D1" : "MOI" }); legacy.db.payrollApprovals = [ticket({ approver: "b" })];
  assert.equal(legacy.approvalStateIn("2026-09"), "da_duyet", "chấp nhận mã băm kiểu cũ như savePayrollApproval()");
});
test("U-STEP-APPROVAL-03 thanh bước: chỉ nhắc duyệt khi đã tính, không còn lỗi chặn; còn lỗi chặn hoặc đã chốt thì giữ nguyên", () => {
  const c = setup(), text = (steps) => steps[3].ly + " | " + steps[4].ly;
  assert.match(text(c.luongStepsIn(null)), /Cần gửi duyệt/);
  c.STEP_CACHE.key = ""; c.db.payrollApprovals = [ticket()]; assert.match(text(c.luongStepsIn(null)), /chờ người khác duyệt/);
  c.STEP_CACHE.key = ""; c.db.payrollApprovals = [ticket({ approver: "b" })]; assert.match(text(c.luongStepsIn(null)), /Đã duyệt — có thể chốt/);
  const blocked = setup({ GATE: { blockers: () => [{}] } }); assert.doesNotMatch(text(blocked.luongStepsIn(null)), /duyệt/i);
  const none = setup({ db: { workflowSettings: [], payrollApprovals: [], ttluong: [] } }); assert.match(none.luongStepsIn(null)[3].ly, /có thể chốt/);
  const notCalc = setup({ st: { kq: null, kqStale: false } }); assert.doesNotMatch(notCalc.luongStepsIn(null).map((x) => x.ly).join(" "), /duyệt/i);
});
