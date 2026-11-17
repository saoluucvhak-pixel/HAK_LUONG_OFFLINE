"use strict";
// Báo cáo phúc lợi tháng: mọi khoản ĐÃ CẤP theo phiếu đã xác nhận phải còn trên báo cáo kể cả khi tiêu chuẩn bị thay thế / hết hạn
// và dòng không còn định mức ("Không còn định mức hiệu lực"). Phiếu nháp và phiếu đã thu hồi không cộng. Dữ liệu giả.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const B = require("../../core/benefits.js");

const items = (...list) => list.map(([code, name, quantity]) => ({ code, name, unit: "hộp", quantity }));
const issue = (id, status, lines, period) => ({ id, status, period: period || "2026-11", date: (period || "2026-11") + "-15", place: "Kho", lines });
const line = (employee, item, quantity) => ({ employee, item, quantity, note: "" });
const base = (over) => Object.assign({
  nhanvien: [{ "Mã NV": "A", "Họ và tên": "Nguyễn An" }, { "Mã NV": "B", "Họ và tên": "Trần Bình" }],
  hopdong: [{ "Mã NV": "A", "Số HĐLĐ": "H1", "Ngày vào làm": "2026-01-01" }, { "Mã NV": "B", "Số HĐLĐ": "H2", "Ngày vào làm": "2026-01-01" }],
  benefitStandards: [{ code: "S1", from: "2026-01-01", items: items(["MILK", "Sữa", 30]) }],
  benefitAssignments: [{ employee: "A", contract: "H1", code: "S1", from: "2026-01-01" }, { employee: "B", contract: "H2", code: "S1", from: "2026-01-01" }],
  benefitIssues: []
}, over || {});
const row = (rows, employee, code) => rows.find((r) => r.employee === employee && r.code === code);

test("U-BEN-RPT-01 ca bắt buộc: đã cấp 4 hộp, sau đó tiêu chuẩn bị hiệu chỉnh/hết hạn khiến không còn định mức trong tháng → báo cáo vẫn hiện đủ 4 hộp kèm ghi chú", () => {
  const db = base({ benefitIssues: [issue("PC1", "issued", [line("A", "MILK", 4)])] });
  let r = row(B.monthlyReport(db, "2026-11"), "A", "MILK");
  assert.equal(r.allowance, 30); assert.equal(r.given, 4); assert.equal(r.note, "");
  // hiệu chỉnh tiêu chuẩn: hết hạn 31/10 → từ 01/11 không còn định mức
  const adjusted = { ...db, benefitStandards: [{ code: "S1", from: "2026-01-01", until: "2026-10-31", items: items(["MILK", "Sữa", 30]) }] };
  assert.deepEqual(B.entitlement(adjusted, "A", "2026-11"), [], "không còn định mức hiệu lực");
  r = row(B.monthlyReport(adjusted, "2026-11"), "A", "MILK");
  assert.ok(r, "dòng không được biến mất");
  assert.deepEqual([r.employee, r.name, r.itemName, r.unit, r.given, r.allowance, r.remaining, r.over], ["A", "Nguyễn An", "Sữa", "hộp", 4, 0, 0, 0]);
  assert.equal(r.note, "Không còn định mức hiệu lực"); assert.equal(B.NO_STANDARD_NOTE, r.note); assert.deepEqual(r.docs, ["PC1"]);
  // tiêu chuẩn bị thay bằng bản khác không có mặt hàng này: vẫn giữ số đã cấp
  const replaced = { ...db, benefitStandards: [{ code: "S1", from: "2026-01-01", until: "2026-10-31", items: items(["MILK", "Sữa", 30]) }, { code: "S1", from: "2026-11-01", items: items(["EGG", "Trứng", 10]) }] };
  const rows = B.monthlyReport(replaced, "2026-11");
  assert.equal(row(rows, "A", "MILK").given, 4); assert.equal(row(rows, "A", "MILK").note, "Không còn định mức hiệu lực");
  assert.equal(row(rows, "A", "EGG").allowance, 10); assert.equal(row(rows, "A", "EGG").note, "");
});

test("U-BEN-RPT-02 phiếu nháp và phiếu đã thu hồi không cộng vào số thực cấp; chỉ phiếu đã cấp được tính", () => {
  const db = base({ benefitIssues: [issue("PC1", "issued", [line("A", "MILK", 4)]), issue("PC2", "draft", [line("A", "MILK", 5)]),
    issue("PC3", "recalled", [line("A", "MILK", 6)]), issue("PC4", "issued", [line("A", "MILK", 2)])] });
  const r = row(B.monthlyReport(db, "2026-11"), "A", "MILK");
  assert.equal(r.given, 6); assert.deepEqual(r.docs, ["PC1", "PC4"]);
  // chỉ có phiếu nháp / thu hồi và không còn định mức → không phát sinh dòng nào
  const only = { ...base({ benefitIssues: [issue("D", "draft", [line("A", "MILK", 3)]), issue("R", "recalled", [line("A", "MILK", 3)])] }),
    benefitStandards: [{ code: "S1", from: "2026-01-01", until: "2026-10-31", items: items(["MILK", "Sữa", 30]) }] };
  assert.deepEqual(B.monthlyReport(only, "2026-11"), []);
});

test("U-BEN-RPT-03 khớp hàm issued() hiện có và không đổi hành vi khi còn định mức; vượt định mức vẫn báo Vượt; tháng khác không lẫn", () => {
  const db = base({ benefitIssues: [issue("PC1", "issued", [line("A", "MILK", 35)]), issue("PX", "issued", [line("A", "MILK", 9)], "2026-10")] });
  const r = row(B.monthlyReport(db, "2026-11"), "A", "MILK"), totals = B.issued(db, "2026-11");
  assert.equal(r.given, totals.get(JSON.stringify(["A", "MILK"])));
  assert.deepEqual([r.allowance, r.given, r.remaining, r.over], [30, 35, 0, 5]);
  assert.equal(row(B.monthlyReport(db, "2026-11"), "B", "MILK").given, 0);
  assert.equal(row(B.monthlyReport(db, "2026-10"), "A", "MILK").given, 9);
});

test("U-BEN-RPT-04 nhân viên đã bị xóa khỏi danh sách vẫn giữ số đã cấp; tên mặt hàng lấy từ tiêu chuẩn từng có", () => {
  const db = base({ benefitIssues: [issue("PC1", "issued", [line("Z9", "MILK", 3)])] });
  const r = row(B.monthlyReport(db, "2026-11"), "Z9", "MILK");
  assert.deepEqual([r.name, r.itemName, r.given, r.note], ["", "Sữa", 3, "Không còn định mức hiệu lực"]);
  const orphan = base({ benefitIssues: [issue("PC1", "issued", [line("A", "LOST", 2)])] });
  const l = row(B.monthlyReport(orphan, "2026-11"), "A", "LOST");
  assert.deepEqual([l.itemName, l.unit, l.given], ["LOST", "", 2], "mặt hàng chưa từng có trong tiêu chuẩn: hiện mã");
});

test("U-BEN-RPT-05 báo cáo cấp phát mới thay màn đối chiếu phúc lợi cũ: màn hình, Excel và PDF dùng chung MỘT nguồn dữ liệu và bộ lọc; mỗi dòng chi tiết mở được phiếu gốc", () => {
  const src = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8").replace(/\r\n/g, "\n");
  const from = src.indexOf("  function cpReport()"), end = src.length, part = src.slice(from, end);
  assert.match(part, /C\.benefits\.report\(db, \{ type: s\.type, mode: s\.mode, bySize: s\.bySize, filters: cpFilters\(\), deptOf: cpDeptOf\(\) \}\)/);
  assert.match(part, /cpExportXlsx\(cpReport\(\)\)/); assert.match(part, /cpExportPdf\(cpReport\(\)\)/); assert.match(part, /rep = cpReport\(\); sf\.refresh\(\)/);
  assert.match(part, /cpOpen\(r\._voucher, \{ tab: "capphat", label: "báo cáo" \}\)/);
  assert.doesNotMatch(src, /benefitIssueScreen|entitlement\(db, ma, current\)\.map/, "đã bỏ màn nhập/đối chiếu phúc lợi cũ trùng chức năng");
  assert.match(src, /cpGoto\("milk"\)/, "lối vào cấp phát sữa cũ chuyển về danh sách chung với bộ lọc Sữa phúc lợi");
});
