"use strict";
// Tiêu chuẩn phúc lợi: phiên bản phải có hiệu lực tại ngày bắt đầu áp dụng (giao diện và tiến trình chính dùng chung C.benefits),
// hết hạn thì ngừng áp dụng, không tự quay lại định mức cũ. Dữ liệu giả.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const B = require("../../core/benefits.js");
const { createPolicy, fileSig } = require("../../main/write-policy.js");
const PG = require("../../main/payroll-gate.js");
const P = require("../../core/permissions.js");
const { baseDb } = require("../fixtures/build.js");

const clone = (o) => JSON.parse(JSON.stringify(o));
const items = (...list) => list.map(([code, name, quantity]) => ({ code, name, unit: "hộp", quantity }));
const base = () => ({
  hopdong: [{ "Mã NV": "A", "Số HĐLĐ": "H1", "Ngày vào làm": "2026-01-01" }, { "Mã NV": "B", "Số HĐLĐ": "H2", "Ngày vào làm": "2026-01-01" }],
  benefitStandards: [{ code: "S1", from: "2026-01-01", until: "2026-10-31", items: items(["MILK", "Sữa", 30]) }],
  benefitAssignments: [], benefitIssues: []
});
const hrEdit = { user: "hr", perms: ["hr.edit", "dm.edit"] };
const assign = (db, row) => ({ ...db, benefitAssignments: [...db.benefitAssignments, { employee: "A", contract: "H1", ...row }] });
const check = (db, next) => B.validateChanges("benefitAssignments", db, next, hrEdit, "roles");

test("U-BEN-VAL-01 ca bắt buộc: tiêu chuẩn hết hạn 31/10, gắn từ 01/11 bị chặn; gắn từ 31/10 hoặc có phiên bản mới thì được", () => {
  const db = base();
  assert.match(check(db, assign(db, { code: "S1", from: "2026-11-01" })), /hết hạn ngày 2026-10-31.*Tạo phiên bản hiệu lực mới/);
  assert.equal(check(db, assign(db, { code: "S1", from: "2026-10-31" })), "");
  const renewed = { ...db, benefitStandards: [...db.benefitStandards, { code: "S1", from: "2026-11-01", items: items(["MILK", "Sữa", 20]) }] };
  assert.equal(check(renewed, assign(renewed, { code: "S1", from: "2026-11-01" })), "");
  assert.match(check(db, assign(db, { code: "S1", from: "2025-12-31" })), /chưa có phiên bản hiệu lực từ ngày 2025-12-31/);
  assert.match(check(db, assign(db, { code: "KHONGCO", from: "2026-05-01" })), /chưa có phiên bản/);
  assert.match(check(db, assign(db, { code: "S1", from: "2026-05-01", employee: "A", contract: "KHONGCO" })), /Không tìm thấy hợp đồng/);
});

test("U-BEN-VAL-02 tiến trình chính từ chối đúng điều giao diện chặn (cùng một hàm kiểm tra)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "benefit-wp-")), file = path.join(dir, "data.json");
  const db = baseDb(); Object.assign(db, base());
  db.nguoidung = [{ tenDangNhap: "admin", vaiTro: "admin", hash: "h", salt: "s", iter: 1, khoa: false }];
  db.baomat = [{ khoiPhuc: "x" }]; db.auditlog = [{ luc: "t1", nguoi: "admin", thaoTac: "a" }]; db.kyluong = []; db.kyluong_lichsu = [];
  fs.writeFileSync(file, JSON.stringify(db));
  const pol = createPolicy({ readText: () => fs.readFileSync(file, "utf8"), sigOf: fileSig(file), gate: PG });
  const admin = { user: "admin", perms: P.ROLES.admin.perms.slice() };
  const bad = clone(db); bad.benefitAssignments = [{ employee: "A", contract: "H1", code: "S1", from: "2026-11-01" }];
  const denied = pol.check(JSON.stringify(bad), admin);
  assert.equal(denied.ok, false); assert.match(denied.reason || denied.msg || JSON.stringify(denied), /hết hạn ngày 2026-10-31/);
  const good = clone(db); good.benefitAssignments = [{ employee: "A", contract: "H1", code: "S1", from: "2026-10-01" }];
  assert.equal(pol.check(JSON.stringify(good), admin).ok, true);
});

test("U-BEN-VAL-03 phiên bản mới hết hạn thì dừng tại ngày hết hạn, không quay lại định mức cũ; có phiên bản mới thì có lại", () => {
  const db = { ...base(), benefitStandards: [
    { code: "S1", from: "2026-10-01", items: items(["MILK", "Sữa", 15]) },
    { code: "S1", from: "2026-10-16", until: "2026-10-31", items: items(["MILK", "Sữa", 30]) }] };
  const withAssignment = { ...db, benefitAssignments: [{ employee: "A", contract: "H1", code: "S1", from: "2026-10-01" }] };
  // tháng 10: 15 ngày × 15 + 16 ngày × 30 = 705 → 705/31 = 22,7 → làm tròn xuống một lần = 22
  assert.equal(B.entitlement(withAssignment, "A", "2026-10")[0].allowance, 22);
  assert.deepEqual(B.entitlement(withAssignment, "A", "2026-11"), [], "bản mới hết hạn 31/10: sang 11/2026 không còn định mức, không quay lại bản 15 hộp");
  assert.equal(B.standardAt(withAssignment, "S1", "2026-11-05").status, "expired");
  const renewed = { ...withAssignment, benefitStandards: [...withAssignment.benefitStandards, { code: "S1", from: "2026-11-01", items: items(["MILK", "Sữa", 24]) }] };
  assert.equal(B.entitlement(renewed, "A", "2026-11")[0].allowance, 24, "tạo phiên bản hiệu lực mới thì áp dụng lại");
  assert.equal(B.entitlement(renewed, "A", "2026-10")[0].allowance, 22, "tháng 10 không đổi khi thêm bản mới");
});

test("U-BEN-VAL-04 đổi tiêu chuẩn giữa tháng; làm tròn xuống MỘT lần theo từng mặt hàng", () => {
  const db = { ...base(), hopdong: [{ "Mã NV": "A", "Số HĐLĐ": "H1", "Ngày vào làm": "2026-10-10" }],
    benefitStandards: [{ code: "S1", from: "2026-10-01", items: items(["MILK", "Sữa", 15], ["EGG", "Trứng", 10]) },
      { code: "S2", from: "2026-10-01", items: items(["MILK", "Sữa", 30], ["EGG", "Trứng", 20]) }],
    benefitAssignments: [{ employee: "A", contract: "H1", code: "S1", from: "2026-10-01" }, { employee: "A", contract: "H1", code: "S2", from: "2026-10-21" }] };
  // vào làm 10/10: 11 ngày S1 (10→20/10) + 11 ngày S2 (21→31/10); sữa (11×15 + 11×30)/31 = 15,97 → 15 ; trứng (11×10 + 11×20)/31 = 10,64 → 10
  const r = Object.fromEntries(B.entitlement(db, "A", "2026-10").map((x) => [x.code, x.allowance]));
  assert.deepEqual(r, { MILK: 15, EGG: 10 });
  // làm tròn theo từng mặt hàng một lần: tổng từng ngày rồi mới chia, không làm tròn từng ngày
  assert.notEqual(r.MILK, 11 * Math.floor(15 / 31) + 11 * Math.floor(30 / 31));
});

test("U-BEN-VAL-05 số đã cấp trên phiếu đã xác nhận vẫn tra cứu được sau khi tiêu chuẩn hết hạn hoặc đổi; dòng cũ không bị chặn ngược", () => {
  const issued = { id: "P1", period: "2026-10", date: "2026-10-12", status: "issued", maker: "hr", reviewer: "boss", confirmedAt: "2026-10-12T01:00:00.000Z", lines: [{ employee: "A", item: "MILK", quantity: 7 }] };
  let db = { ...base(), benefitAssignments: [{ employee: "A", contract: "H1", code: "S1", from: "2026-10-01" }], benefitIssues: [issued] };
  const before = B.issued(db, "2026-10").get(JSON.stringify(["A", "MILK"]));
  assert.equal(before, 7);
  // sau đó thêm phiên bản làm tiêu chuẩn hết hạn sớm hơn: số đã cấp vẫn là số đã lưu trên phiếu
  db = { ...db, benefitStandards: [...db.benefitStandards, { code: "S1", from: "2026-10-05", until: "2026-10-06", items: items(["MILK", "Sữa", 1]) }] };
  assert.equal(B.issued(db, "2026-10").get(JSON.stringify(["A", "MILK"])), 7);
  assert.equal(db.benefitIssues[0].lines[0].quantity, 7, "phiếu đã xác nhận không bị sửa");
  // dòng gắn cũ (đã lưu) không bị kiểm lại: gắn thêm người khác vẫn qua nếu phiên bản của người đó hợp lệ
  const other = { ...db, benefitStandards: [...db.benefitStandards, { code: "S9", from: "2026-01-01", items: items(["MILK", "Sữa", 10]) }] };
  const next = { ...other, benefitAssignments: [...other.benefitAssignments, { employee: "B", contract: "H2", code: "S9", from: "2026-10-01" }] };
  assert.equal(check(other, next), "");
});

test("U-BEN-VAL-06 giao diện: hiện mặt hàng, định mức, khoảng hiệu lực và xác nhận trước khi lưu; dùng cùng hàm kiểm tra với main", () => {
  const src = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8").replace(/\r\n/g, "\n");
  const from = src.indexOf("  function benefitContractPanel("), to = src.indexOf("  var BENEFIT_COLUMNS");
  assert.ok(from > 0 && to > from);
  const panel = src.slice(from, to);
  assert.match(panel, /C\.benefits\.standardProblem\(/); assert.match(panel, /C\.benefits\.standardAt\(/);
  assert.match(panel, /data-benefit-preview/); assert.match(panel, /Định mức\/tháng/); assert.match(panel, /rangeText\(/);
  assert.match(panel, /modal\("Xác nhận gắn tiêu chuẩn"/);
  assert.ok(panel.indexOf("standardProblem(db, row.code, row.from)") < panel.indexOf('modal("Xác nhận gắn tiêu chuẩn"') && panel.indexOf('modal("Xác nhận gắn tiêu chuẩn"') < panel.indexOf('benefitSave("benefitAssignments"'),
    "kiểm tra → xác nhận → mới lưu");
});
