"use strict";
// Cấp phát thống nhất (sữa phúc lợi + bảo hộ lao động): kiểm tra phiếu, thu hồi một phần, đổi cỡ, sổ cái, báo cáo tổng hợp/chi tiết, nhập Excel. Dữ liệu giả.
const test = require("node:test"), assert = require("node:assert/strict");
const B = require("../../core/benefits.js");

const items = (...list) => list.map(([code, name, quantity]) => ({ code, name, unit: "hộp", quantity }));
const team = { T1: { code: "T1", name: "Tổ 1" }, T2: { code: "T2", name: "Tổ 2" } };
const deptMap = { A: "T1", B: "T1", C: "T2" };
const deptOf = (employee) => team[deptMap[employee]] || null;
const when = "2026-11-20T08:00:00.000Z";
const base = (over) => Object.assign({
  nhanvien: [{ "Mã NV": "A", "Họ và tên": "Nguyễn An" }, { "Mã NV": "B", "Họ và tên": "Trần Bình" }, { "Mã NV": "C", "Họ và tên": "Lê Công" }],
  hopdong: ["A", "B", "C"].map((ma) => ({ "Mã NV": ma, "Số HĐLĐ": "H" + ma, "Ngày vào làm": "2026-01-01" })),
  benefitStandards: [{ code: "S1", from: "2026-01-01", items: items(["MILK", "Sữa", 30]) }],
  benefitAssignments: ["A", "B", "C"].map((ma) => ({ employee: ma, contract: "H" + ma, code: "S1", from: "2026-01-01" })),
  benefitPpeItems: [
    { code: "GIAY", name: "Giày bảo hộ", group: "Giày", unit: "đôi", spec: "da", active: true, sizes: ["38", "39", "40", "41"] },
    { code: "MUBH", name: "Mũ bảo hộ", group: "Mũ", unit: "cái", spec: "", active: true, sizes: [] }],
  benefitIssues: [], benefitAdjustments: []
}, over || {});
const voucher = (db, input) => B.buildVoucher(db, { maker: "hr", ...input }, deptOf);
const ppe = (id, date, lines, extra) => ({ type: "ppe", id, date, place: "Kho", lines, ...extra });
const issueIt = (doc, reviewer) => ({ ...doc, status: "issued", reviewer: reviewer || "boss", confirmedAt: when });
const adj = (id, ref, lines, extra) => ({ id, ref, kind: "recall", reason: "Trả lại", by: "boss", at: when, lines, ...extra });

test("U-DIS-01 bảo hộ: ca nghiệm thu cấp 10 đôi giày, thu hồi 2 đôi → báo cáo đã cấp 10, thu hồi 2, thực cấp 8 (tổng hợp, tách theo cỡ và chi tiết)", () => {
  let db = base();
  const doc = issueIt(voucher(db, ppe("BH1", "2026-11-10", [{ employee: "A", item: "GIAY", size: "40", quantity: 6 }, { employee: "B", item: "GIAY", size: "39", quantity: 4 }])));
  assert.deepEqual(B.reviewIssue(db, doc).issues, []);
  db = { ...db, benefitIssues: [doc], benefitAdjustments: [adj("DC1", "BH1", [{ employee: "A", item: "GIAY", size: "40", quantity: 2 }])] };
  assert.equal(B.adjustmentProblem(db, db.benefitAdjustments[0]), "");
  const s = B.report(db, { type: "ppe", mode: "summary", deptOf }), row = s.rows.find((r) => r["Tổ/Phòng ban"] === "Tổ 1" && r["Mặt hàng"] === "Giày bảo hộ");
  assert.deepEqual([row["Số người nhận"], row["Đã cấp"], row["Thu hồi"], row["Thực cấp"]], [2, 10, 2, 8]);
  const total = s.rows.find((r) => r._total); assert.deepEqual([total["Đơn vị"], total["Đã cấp"], total["Thu hồi"], total["Thực cấp"]], ["đôi", 10, 2, 8]);
  const bySize = B.report(db, { type: "ppe", mode: "summary", bySize: true, deptOf }).rows.filter((r) => !r._total);
  assert.deepEqual(bySize.map((r) => [r["Kích cỡ"], r["Đã cấp"], r["Thu hồi"], r["Thực cấp"]]).sort(), [["39", 4, 0, 4], ["40", 6, 2, 4]]);
  const d = B.report(db, { type: "ppe", mode: "detail", deptOf }).rows;
  assert.deepEqual(d.map((r) => [r["Lượt"], r["Số lượng"]]), [["Cấp", 6], ["Cấp", 4], ["Thu hồi", 2]]);
  assert.equal(d.filter((r) => r["Lượt"] === "Thu hồi")[0]._voucher, "BH1"); assert.equal(d.filter((r) => r["Lượt"] === "Thu hồi")[0]["Mã phiếu"], "BH1");
});

test("U-DIS-02 bảo hộ: sai cỡ, thiếu cỡ, vật tư không có cỡ mà ghi cỡ, vật tư ngừng sử dụng, trùng dòng, số lượng sai đều bị chặn với thông báo theo dòng", () => {
  const db = base({ benefitPpeItems: base().benefitPpeItems.concat([{ code: "AO", name: "Áo cũ", group: "Quần áo", unit: "cái", spec: "", active: false, sizes: [] }]) });
  const check = (lines) => B.reviewIssue(db, voucher(db, ppe("X", "2026-11-10", lines))).issues.join(" | ");
  assert.match(check([{ employee: "A", item: "GIAY", size: "45", quantity: 1 }]), /Dòng 1.*sai kích cỡ/);
  assert.match(check([{ employee: "A", item: "GIAY", size: "", quantity: 1 }]), /cần chọn kích cỡ/);
  assert.match(check([{ employee: "A", item: "MUBH", size: "M", quantity: 1 }]), /không có kích cỡ/);
  assert.match(check([{ employee: "A", item: "AO", size: "", quantity: 1 }]), /ngừng sử dụng/);
  assert.match(check([{ employee: "A", item: "GIAY", size: "40", quantity: 1 }, { employee: "A", item: "GIAY", size: "40", quantity: 2 }]), /Dòng 2.*trùng/);
  assert.match(check([{ employee: "A", item: "GIAY", size: "40", quantity: 0 }]), /số nguyên dương/);
  assert.match(check([{ employee: "ZZ", item: "GIAY", size: "40", quantity: 1 }]), /không có nhân viên/);
  assert.match(check([{ employee: "A", item: "KHONGCO", size: "", quantity: 1 }]), /chưa có trong danh mục/);
  assert.equal(check([{ employee: "A", item: "GIAY", size: "40", quantity: 1 }, { employee: "A", item: "GIAY", size: "41", quantity: 1 }, { employee: "A", item: "MUBH", size: "", quantity: 1 }]), "", "một người nhiều mặt hàng, nhiều cỡ");
});

test("U-DIS-03 thu hồi một phần: không vượt số còn lại (tính cả các lần thu hồi trước); phải có lý do, người thao tác, thời điểm; chỉ phiếu đã xác nhận", () => {
  let db = base();
  const doc = issueIt(voucher(db, ppe("BH1", "2026-11-10", [{ employee: "A", item: "GIAY", size: "40", quantity: 10 }])));
  db = { ...db, benefitIssues: [doc] };
  const one = adj("DC1", "BH1", [{ employee: "A", item: "GIAY", size: "40", quantity: 6 }]);
  assert.equal(B.adjustmentProblem({ ...db, benefitAdjustments: [one] }, one), "");
  const two = adj("DC2", "BH1", [{ employee: "A", item: "GIAY", size: "40", quantity: 5 }]);
  assert.match(B.adjustmentProblem({ ...db, benefitAdjustments: [one, two] }, two), /vượt số lượng còn lại.*còn 4/);
  assert.match(B.adjustmentProblem({ ...db, benefitAdjustments: [adj("D", "BH1", [{ employee: "A", item: "GIAY", size: "40", quantity: 11 }])] }, adj("D", "BH1", [{ employee: "A", item: "GIAY", size: "40", quantity: 11 }])), /còn 10/);
  assert.match(B.adjustmentProblem(db, adj("E", "BH1", [{ employee: "A", item: "GIAY", size: "40", quantity: 1 }], { reason: " " })), /lý do/);
  assert.match(B.adjustmentProblem(db, adj("E", "BH1", [{ employee: "A", item: "GIAY", size: "40", quantity: 1 }], { at: "hôm qua" })), /thời điểm/);
  assert.match(B.adjustmentProblem(db, adj("E", "BH1", [{ employee: "A", item: "GIAY", size: "39", quantity: 1 }])), /không có trong phiếu/);
  assert.match(B.adjustmentProblem({ ...db, benefitIssues: [{ ...doc, status: "draft" }] }, adj("E", "BH1", [{ employee: "A", item: "GIAY", size: "40", quantity: 1 }])), /đã xác nhận/);
  assert.deepEqual(B.recallable({ ...db, benefitAdjustments: [one] }, "BH1").map((r) => [r.issued, r.recalled, r.remaining]), [[10, 6, 4]]);
});

test("U-DIS-04 đổi cỡ ghi hai lượt: thu hồi cỡ cũ và cấp cỡ mới; số lượng hai bên phải bằng nhau, cỡ mới hợp lệ và khác cỡ cũ", () => {
  let db = base();
  const doc = issueIt(voucher(db, ppe("BH1", "2026-11-10", [{ employee: "A", item: "GIAY", size: "40", quantity: 2 }])));
  db = { ...db, benefitIssues: [doc] };
  const change = adj("DC1", "BH1", [{ employee: "A", item: "GIAY", size: "40", quantity: 2 }], { kind: "resize", to: [{ employee: "A", item: "GIAY", size: "41", quantity: 2 }] });
  assert.equal(B.adjustmentProblem({ ...db, benefitAdjustments: [change] }, change), "");
  const bad = (to) => B.adjustmentProblem(db, { ...change, to });
  assert.match(bad([{ employee: "A", item: "GIAY", size: "99", quantity: 2 }]), /không hợp lệ/);
  assert.match(bad([{ employee: "A", item: "GIAY", size: "40", quantity: 2 }]), /khác cỡ thu hồi/);
  assert.match(bad([{ employee: "A", item: "GIAY", size: "41", quantity: 1 }]), /phải bằng/);
  const withChange = { ...db, benefitAdjustments: [change] };
  const rows = B.report(withChange, { type: "ppe", mode: "detail", deptOf }).rows.map((r) => [r["Lượt"], r["Kích cỡ"], r["Số lượng"]]);
  assert.deepEqual(rows, [["Cấp", "40", 2], ["Thu hồi", "40", 2], ["Cấp (đổi cỡ)", "41", 2]]);
  const sum = B.report(withChange, { type: "ppe", mode: "summary", bySize: true, deptOf }).rows.filter((r) => !r._total);
  assert.deepEqual(sum.map((r) => [r["Kích cỡ"], r["Thực cấp"]]).sort(), [["40", 0], ["41", 2]]);
  assert.match(B.adjustmentProblem({ ...db, benefitIssues: [{ ...db.benefitIssues[0], type: "milk" }] }, change), /Chỉ đổi cỡ cho phiếu bảo hộ/);
});

test("U-DIS-05 nhân viên chuyển tổ: báo cáo lịch sử dùng tổ đã lưu tại ngày cấp, không đổi theo tổ hiện tại; vật tư đổi tên vẫn hiện tên đã lưu", () => {
  const db0 = base();
  const doc = issueIt(voucher(db0, ppe("BH1", "2026-11-10", [{ employee: "A", item: "GIAY", size: "40", quantity: 1 }])));
  const moved = (employee) => employee === "A" ? team.T2 : deptOf(employee);
  const renamed = { ...db0, benefitIssues: [doc], benefitPpeItems: db0.benefitPpeItems.map((i) => i.code === "GIAY" ? { ...i, name: "Giày an toàn" } : i) };
  const r = B.report(renamed, { type: "ppe", mode: "detail", deptOf: moved }).rows[0];
  assert.equal(r["Tổ/Phòng ban tại ngày cấp"], "Tổ 1"); assert.equal(r["Mặt hàng"], "Giày bảo hộ");
  // dòng cũ không có thông tin lịch sử: tạm lấy theo tổ tại ngày cấp và tên trong danh mục hiện tại
  const legacy = { ...doc, lines: doc.lines.map(({ dept, deptName, itemName, unit, employeeName, ...rest }) => rest) };
  const l = B.report({ ...renamed, benefitIssues: [legacy] }, { type: "ppe", mode: "detail", deptOf: moved }).rows[0];
  assert.equal(l["Tổ/Phòng ban tại ngày cấp"], "Tổ 2"); assert.equal(l["Mặt hàng"], "Giày an toàn");
});

test("U-DIS-06 sữa: cấp 4 hộp, mặt hàng không còn định mức vẫn hiện 4 hộp kèm ghi chú; thu hồi một phần trừ vào số thực cấp của tháng", () => {
  let db = base();
  const doc = issueIt(voucher(db, { type: "milk", id: "S1", date: "2026-11-05", place: "Kho", lines: [{ employee: "A", item: "MILK", quantity: 4 }] }));
  db = { ...db, benefitIssues: [doc] };
  const f = { thang: "2026-11" };
  let s = B.report(db, { type: "milk", mode: "summary", filters: f, deptOf }).rows.find((r) => r["Mặt hàng"] === "Sữa" && r["Tổ/Phòng ban"] === "Tổ 1");
  assert.deepEqual([s["Số người nhận"], s["Đã cấp"], s["Thực cấp"], s["Định mức"], s["Còn lại"], s["Vượt"], s["Ghi chú"]], [1, 4, 4, 60, 56, 0, ""]);
  const expired = { ...db, benefitStandards: [{ code: "S1", from: "2026-01-01", until: "2026-10-31", items: items(["MILK", "Sữa", 30]) }] };
  s = B.report(expired, { type: "milk", mode: "summary", filters: f, deptOf }).rows.find((r) => r["Mặt hàng"] === "Sữa");
  assert.deepEqual([s["Đã cấp"], s["Thực cấp"], s["Định mức"], s["Ghi chú"]], [4, 4, 0, "Không còn định mức hiệu lực"]);
  const recalled = { ...db, benefitAdjustments: [adj("DC1", "S1", [{ employee: "A", item: "MILK", quantity: 1 }])] };
  assert.equal(B.issued(recalled, "2026-11").get(JSON.stringify(["A", "MILK"])), 3, "quy tắc chặn cấp vượt dùng số thực cấp sau thu hồi");
  assert.deepEqual(B.monthlyReport(recalled, "2026-11").find((r) => r.employee === "A").given, 3);
});

test("U-DIS-07 phiếu nháp không tính vào thực cấp (chỉ hiện ở chi tiết khi lọc trạng thái nháp); phiếu cấp bảo hộ không lẫn vào sữa", () => {
  const db0 = base();
  const draft = voucher(db0, ppe("D1", "2026-11-10", [{ employee: "A", item: "MUBH", size: "", quantity: 5 }]));
  const db = { ...db0, benefitIssues: [draft, issueIt(voucher(db0, { type: "milk", id: "S1", date: "2026-11-05", lines: [{ employee: "A", item: "MILK", quantity: 2 }] }))] };
  assert.equal(B.report(db, { type: "ppe", mode: "summary", deptOf }).rows.length, 0);
  assert.equal(B.report(db, { type: "ppe", mode: "detail", deptOf }).rows.length, 0);
  const wd = B.report(db, { type: "ppe", mode: "detail", filters: { status: ["draft"] }, deptOf }).rows;
  assert.deepEqual(wd.map((r) => r["Lượt"]), ["Nháp"]);
  assert.equal(B.issued(db, "2026-11").size, 1);
  assert.equal(B.report(db, { type: "all", mode: "summary", filters: { thang: "2026-11" }, deptOf }).rows.filter((r) => !r._total && r["Loại cấp phát"] === "Bảo hộ lao động").length, 0);
});

test("U-DIS-08 bộ lọc: loại, khoảng ngày, tháng, tổ, địa điểm, nhân viên (mã hoặc tên không dấu), mặt hàng, mã phiếu, trạng thái, kích cỡ; chi tiết và tổng hợp cùng bộ lọc", () => {
  const db0 = base();
  const docs = [
    issueIt(voucher(db0, ppe("P1", "2026-11-03", [{ employee: "A", item: "GIAY", size: "40", quantity: 1 }, { employee: "C", item: "GIAY", size: "39", quantity: 2 }], { place: "Kho A" }))),
    issueIt(voucher(db0, ppe("P2", "2026-12-04", [{ employee: "B", item: "MUBH", size: "", quantity: 3 }], { place: "Kho B" })))];
  const db = { ...db0, benefitIssues: docs };
  const n = (filters, mode) => B.report(db, { type: "ppe", mode: mode || "detail", filters, deptOf }).rows.filter((r) => !r._total).length;
  assert.equal(n({}), 3); assert.equal(n({ tu: "2026-11-01", den: "2026-11-30" }), 2); assert.equal(n({ thang: "2026-12" }), 1);
  assert.equal(n({ dept: ["T2"] }), 1); assert.equal(n({ place: ["Kho B"] }), 1); assert.equal(n({ q: "tran binh" }), 1); assert.equal(n({ q: "C" }), 1);
  assert.equal(n({ item: ["MUBH"] }), 1); assert.equal(n({ voucher: "p1" }), 2); assert.equal(n({ status: ["recalled"] }), 0); assert.equal(n({ size: ["39"] }), 1);
  assert.equal(n({ dept: ["T1"], size: ["40"] }), 1);
  assert.equal(n({ dept: ["T2"] }, "summary"), 1, "tổng hợp dùng cùng bộ lọc");
});

test("U-DIS-09 nhập Excel bảo hộ: số dòng Excel trong lỗi (thiếu mã, sai ngày, sai cỡ, trùng dòng, đầu phiếu không nhất quán, số lượng); dòng cùng mã phiếu gom một phiếu nháp", () => {
  const db = base();
  const row = (n, v) => ({ row: n, values: { "Mã phiếu": "P1", "Ngày cấp": "2026-11-10", "Địa điểm": "Kho", "Mã NV": "A", "Mã vật tư": "GIAY", "Kích cỡ": "40", "Số lượng": 2, "Lý do": "Cấp đợt 11", "Ghi chú": "", ...v } });
  const ok = B.planImport(db, "ppe", [row(2, {}), row(3, { "Mã NV": "B", "Kích cỡ": "39" }), row(4, { "Mã vật tư": "MUBH", "Kích cỡ": "" })], "hr", deptOf);
  assert.equal(ok.vouchers.length, 1); assert.equal(ok.vouchers[0].action, "new"); assert.equal(ok.vouchers[0].doc.lines.length, 3); assert.equal(ok.vouchers[0].doc.purpose, "Cấp đợt 11");
  const bad = B.planImport(db, "ppe", [row(2, {}), row(3, { "Kích cỡ": "40" }), row(4, { "Ngày cấp": "31/02/2026", "Mã NV": "B" }), row(5, { "Mã phiếu": "P2", "Mã NV": "B", "Kích cỡ": "99" }),
    row(6, { "Mã phiếu": "P2", "Mã NV": "B", "Kích cỡ": "39", "Số lượng": "x" }), row(7, { "Mã phiếu": "P3", "Mã NV": "", "Mã vật tư": "" }), row(8, { "Mã phiếu": "", "Mã NV": "A" }),
    row(9, { "Mã phiếu": "P4", "Địa điểm": "Kho X" }), row(10, { "Mã phiếu": "P4", "Địa điểm": "Kho Y", "Mã NV": "B" })], "hr", deptOf);
  const all = bad.errors.concat(...bad.vouchers.map((v) => v.issues)).join("\n");
  assert.match(all, /Dòng Excel 8: thiếu mã phiếu/); assert.match(all, /Dòng Excel 3: trùng dòng 2/); assert.match(all, /Dòng Excel 4: ngày cấp/);
  assert.match(all, /Dòng Excel 5.*sai kích cỡ/); assert.match(all, /Dòng Excel 6: số lượng phải là số nguyên dương/); assert.match(all, /Dòng Excel 7: thiếu mã nhân viên/);
  assert.match(all, /Dòng Excel 10: đầu phiếu P4 không nhất quán với dòng 9/);
  assert.ok(bad.vouchers.every((v) => v.action === "error"));
});

test("U-DIS-10 ca nghiệm thu sữa: cấp 4 hộp, nhập lại cùng file → 'same' (không cộng lần hai); xác nhận xong nhập lại vẫn không đổi; nội dung khác với phiếu đã xác nhận bị chặn; nháp cùng mã được cập nhật", () => {
  let db = base();
  const file = [{ row: 2, values: { "Mã phiếu": "S1", "Ngày cấp": "2026-11-05", "Địa điểm": "Kho", "Mã NV": "A", "Mã mặt hàng": "MILK", "Số lượng": 4, "Ghi chú": "" } }];
  let plan = B.planImport(db, "milk", file, "hr", deptOf);
  assert.equal(plan.vouchers[0].action, "new");
  db = { ...db, benefitIssues: [plan.vouchers[0].doc] };
  plan = B.planImport(db, "milk", file, "hr", deptOf); assert.equal(plan.vouchers[0].action, "same");
  db = { ...db, benefitIssues: [issueIt(db.benefitIssues[0])] };
  plan = B.planImport(db, "milk", file, "hr", deptOf); assert.equal(plan.vouchers[0].action, "same");
  assert.equal(B.issued(db, "2026-11").get(JSON.stringify(["A", "MILK"])), 4, "tổng vẫn là 4");
  const changed = [{ row: 2, values: { ...file[0].values, "Số lượng": 6 } }];
  plan = B.planImport(db, "milk", changed, "hr", deptOf); assert.equal(plan.vouchers[0].action, "error"); assert.match(plan.vouchers[0].issues.join(" "), /thu hồi\/điều chỉnh/);
  const draftDb = { ...db, benefitIssues: [{ ...db.benefitIssues[0], status: "draft" }] };
  plan = B.planImport(draftDb, "milk", changed, "hr", deptOf); assert.equal(plan.vouchers[0].action, "replace");
  plan = B.planImport(draftDb, "milk", changed, "khac", deptOf); assert.equal(plan.vouchers[0].action, "error");
  const over = B.planImport(base(), "milk", [{ row: 7, values: { ...file[0].values, "Số lượng": 31 } }], "hr", deptOf);
  assert.match(over.vouchers[0].issues.join(" "), /Dòng Excel 7.*vượt định mức 1/);
  plan = B.planImport(db, "ppe", file.map((r) => ({ row: 2, values: { ...r.values, "Mã vật tư": "GIAY", "Kích cỡ": "40" } })), "hr", deptOf);
  assert.match(plan.vouchers[0].issues.join(" "), /loại cấp phát khác/);
});

test("U-DIS-11 phân quyền bảo hộ (tiến trình chính dùng cùng hàm): lập nháp cần hr.edit; xác nhận phải khác người lập ở chế độ phân quyền; chỉ Quản trị tự xác nhận ở chế độ một người; sửa nháp chỉ người lập", () => {
  const db0 = base(), doc = voucher(db0, ppe("BH1", "2026-11-10", [{ employee: "A", item: "GIAY", size: "40", quantity: 1 }], { maker: "hr" }));
  const check = (before, next, user, perms, mode) => B.validateChanges("benefitIssues", before, next, { user, perms }, mode);
  assert.equal(check(db0, { ...db0, benefitIssues: [doc] }, "hr", ["hr.edit"], "roles"), "");
  assert.match(check(db0, { ...db0, benefitIssues: [doc] }, "boss", ["hr.approve"], "roles"), /Chỉ Nhân sự/);
  const saved = { ...db0, benefitIssues: [doc] }, confirm = { ...doc, status: "issued", reviewer: "boss", confirmedAt: when };
  assert.equal(check(saved, { ...db0, benefitIssues: [confirm] }, "boss", ["hr.approve"], "roles"), "");
  assert.match(check(saved, { ...db0, benefitIssues: [{ ...confirm, reviewer: "hr" }] }, "hr", ["hr.edit", "hr.approve"], "roles"), /khác người lập/, "chặn tự xác nhận");
  assert.equal(check(saved, { ...db0, benefitIssues: [{ ...confirm, reviewer: "admin" }] }, "admin", ["system.admin"], "single"), "");
  const edited = { ...doc, lines: [{ ...doc.lines[0], quantity: 3 }] };
  assert.equal(check(saved, { ...db0, benefitIssues: [edited] }, "hr", ["hr.edit"], "roles"), "", "người lập sửa nháp");
  assert.match(check(saved, { ...db0, benefitIssues: [edited] }, "other", ["hr.edit"], "roles"), /Chỉ người lập được sửa phiếu nháp/);
  assert.match(check(saved, { ...db0, benefitIssues: [{ ...edited, lines: [{ ...edited.lines[0], size: "99" }] }] }, "hr", ["hr.edit"], "roles"), /sai kích cỡ/);
  const issuedDb = { ...db0, benefitIssues: [confirm] };
  assert.match(check(issuedDb, { ...db0, benefitIssues: [{ ...confirm, lines: [{ ...confirm.lines[0], quantity: 9 }] }] }, "boss", ["hr.approve"], "roles"), /Không được sửa nội dung phiếu đã ghi/);
  assert.match(check(saved, { ...db0, benefitIssues: [{ ...doc, type: "khac" }] }, "hr", ["hr.edit"], "roles"), /Loại phiếu/);
});

test("U-DIS-12 danh mục vật tư và điều chỉnh qua tiến trình chính: cần dm.edit; không xóa vật tư (ngừng sử dụng); điều chỉnh chỉ thêm, đúng người thao tác, khác người lập ở chế độ phân quyền", () => {
  const db0 = base(), cat = (rows) => B.validateChanges("benefitPpeItems", db0, { ...db0, benefitPpeItems: rows }, { user: "dm", perms: ["dm.edit"] }, "roles");
  const items0 = db0.benefitPpeItems;
  assert.equal(cat(items0.concat({ code: "AO", name: "Áo mưa", group: "Áo mưa", unit: "cái", spec: "", active: true, sizes: ["M", "L"] })), "");
  assert.match(B.validateChanges("benefitPpeItems", db0, { ...db0, benefitPpeItems: items0 }, { user: "x", perms: ["hr.edit"] }, "roles"), /chưa có quyền/);
  assert.match(cat(items0.concat(items0[0])), /trùng/);
  assert.match(cat(items0.slice(1)), /Ngừng sử dụng/);
  assert.equal(cat(items0.map((i) => i.code === "GIAY" ? { ...i, active: false } : i)), "", "ngừng sử dụng được");
  assert.match(cat(items0.concat({ code: "AO", name: "Áo", group: "Áo mưa", unit: "cái", spec: "", active: true, sizes: ["M", "M"] })), /kích cỡ/);
  assert.match(cat(items0.concat({ code: "AO", name: "", group: "Áo mưa", unit: "cái", spec: "", active: true, sizes: [] })), /mã, tên/);
  const doc = issueIt(voucher(db0, ppe("BH1", "2026-11-10", [{ employee: "A", item: "GIAY", size: "40", quantity: 2 }], { maker: "hr" })));
  const saved = { ...db0, benefitIssues: [doc] }, one = adj("DC1", "BH1", [{ employee: "A", item: "GIAY", size: "40", quantity: 1 }]);
  const run = (next, user, perms, mode) => B.validateChanges("benefitAdjustments", saved, { ...saved, benefitAdjustments: next }, { user, perms }, mode || "roles");
  assert.equal(run([one], "boss", ["hr.approve"]), "");
  assert.match(run([one], "hr", ["hr.approve"]), /khác người lập/);
  assert.match(run([{ ...one, by: "someone" }], "boss", ["hr.approve"]), /tài khoản đang đăng nhập/);
  assert.equal(run([one], "boss", ["system.admin"], "single"), "");
  const savedAdj = { ...saved, benefitAdjustments: [one] };
  assert.match(B.validateChanges("benefitAdjustments", savedAdj, { ...savedAdj, benefitAdjustments: [] }, { user: "boss", perms: ["hr.approve"] }, "roles"), /không được sửa hoặc xóa/);
  assert.match(B.validateChanges("benefitAdjustments", savedAdj, { ...savedAdj, benefitAdjustments: [one, adj("DC2", "BH1", [{ employee: "A", item: "GIAY", size: "40", quantity: 2 }])] }, { user: "boss", perms: ["hr.approve"] }, "roles"), /vượt số lượng còn lại/);
});

test("U-DIS-13 tiến trình chính (write-policy) áp đúng quy tắc phiếu bảo hộ, danh mục vật tư và thu hồi một phần; bảng mới được schema nhận diện", () => {
  const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
  const { createPolicy, fileSig } = require("../../main/write-policy.js"), PG = require("../../main/payroll-gate.js"), P = require("../../core/permissions.js");
  const { baseDb } = require("../fixtures/build.js"), SCH = require("../../core/schema.js");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dispense-wp-")), file = path.join(dir, "data.json");
  const db = baseDb(); Object.assign(db, base());
  db.nguoidung = [{ tenDangNhap: "admin", vaiTro: "admin", hash: "h", salt: "s", iter: 1, khoa: false }];
  db.baomat = [{ khoiPhuc: "x" }]; db.auditlog = [{ luc: "t1", nguoi: "admin", thaoTac: "a" }]; db.kyluong = []; db.kyluong_lichsu = [];
  fs.writeFileSync(file, JSON.stringify(db));
  const pol = createPolicy({ readText: () => fs.readFileSync(file, "utf8"), sigOf: fileSig(file), gate: PG }), admin = { user: "admin", perms: P.ROLES.admin.perms.slice() };
  const clone = (o) => JSON.parse(JSON.stringify(o)), draft = (size) => ({ ...voucher(db, ppe("BH1", "2026-11-10", [{ employee: "A", item: "GIAY", size, quantity: 2 }])), maker: "admin" });
  const bad = clone(db); bad.benefitIssues = [draft("99")];
  const denied = pol.check(JSON.stringify(bad), admin); assert.equal(denied.ok, false); assert.match(JSON.stringify(denied), /sai kích cỡ/);
  const good = clone(db); good.benefitIssues = [draft("40")]; assert.equal(pol.check(JSON.stringify(good), admin).ok, true);
  const noCatalog = clone(db); noCatalog.benefitPpeItems = noCatalog.benefitPpeItems.slice(1); const dn = pol.check(JSON.stringify(noCatalog), admin); assert.equal(dn.ok, false); assert.match(JSON.stringify(dn), /Ngừng sử dụng/);
  const over = clone(good); over.benefitIssues = [{ ...good.benefitIssues[0], status: "issued", reviewer: "admin", confirmedAt: when }];
  fs.writeFileSync(file, JSON.stringify(good));
  assert.equal(createPolicy({ readText: () => fs.readFileSync(file, "utf8"), sigOf: fileSig(file), gate: PG }).check(JSON.stringify(over), admin).ok, true, "Quản trị tự xác nhận ở chế độ một người");
  const known = SCH.validate(good, { tables: [], hrTables: [] });
  assert.ok(!known.info.some((m) => /benefitPpeItems|benefitAdjustments/.test(m)), "schema nhận ra hai bảng mới");
  assert.equal(known.stats.benefitPpeItems, 2); assert.equal(known.stats.benefitAdjustments, 0);
});

test("U-DIS-14 dữ liệu sữa cũ (không có loại phiếu và thông tin lịch sử) vẫn dùng được: giữ mã phiếu, số đã cấp, người xác nhận; hiện ở danh sách chung loại Sữa; mở lại/sao lưu-khôi phục không sinh phiếu trùng", () => {
  const SCH = require("../../core/schema.js");
  const legacy = { id: "PC-2026-11-01", date: "2026-11-05", period: "2026-11", place: "Kho cũ", maker: "hr", status: "issued", reviewer: "boss", confirmedAt: when, lines: [{ employee: "A", item: "MILK", quantity: 4, note: "" }] };
  const cancelled = { id: "PC-2026-11-02", date: "2026-11-06", period: "2026-11", place: "Kho", maker: "hr", status: "recalled", reason: "Nhầm", recalledBy: "boss", lines: [{ employee: "B", item: "MILK", quantity: 9, note: "" }] };
  const recalledAfterIssue = { id: "PC-2026-11-03", date: "2026-11-07", period: "2026-11", place: "Kho", maker: "hr", status: "recalled", reviewer: "boss", confirmedAt: when, recalledBy: "boss", reason: "Thu lại", lines: [{ employee: "C", item: "MILK", quantity: 3, note: "" }] };
  const db = base({ benefitIssues: [legacy, cancelled, recalledAfterIssue] });
  const before = JSON.stringify(db.benefitIssues);
  assert.deepEqual(B.listVouchers(db, { type: "milk", deptOf }).map((r) => [r.id, r.type, r.status, r.people]).sort(), [["PC-2026-11-01", "milk", "issued", 1], ["PC-2026-11-02", "milk", "recalled", 1], ["PC-2026-11-03", "milk", "recalled", 1]]);
  assert.deepEqual(B.listVouchers(db, { type: "ppe", deptOf }), []);
  assert.equal(B.issued(db, "2026-11").get(JSON.stringify(["A", "MILK"])), 4, "số đã cấp giữ nguyên");
  assert.equal(B.issued(db, "2026-11").has(JSON.stringify(["B", "MILK"])), false, "nháp bị hủy chưa từng cấp");
  const d = B.report(db, { type: "milk", mode: "detail", deptOf }).rows.map((r) => [r["Mã phiếu"], r["Lượt"], r["Số lượng"], r["Người xác nhận"]]);
  assert.deepEqual(d, [["PC-2026-11-01", "Cấp", 4, "boss"], ["PC-2026-11-03", "Cấp", 3, "boss"], ["PC-2026-11-03", "Thu hồi", 3, "boss"]]);
  const s = B.report(db, { type: "milk", mode: "summary", filters: { thang: "2026-11" }, deptOf }).rows.filter((r) => !r._total);
  assert.equal(s.reduce((n, r) => n + r["Thực cấp"], 0), 4, "tổng thực cấp = 4 (phiếu thu hồi hết không còn tính)");
  // đọc/tra cứu không ghi gì: dữ liệu cũ không đổi; "chạy lại nâng cấp" (sao lưu rồi khôi phục) giữ nguyên số phiếu
  assert.equal(JSON.stringify(db.benefitIssues), before);
  const restored = JSON.parse(JSON.stringify({ ...db, benefitAdjustments: [adj("DC1", "PC-2026-11-01", [{ employee: "A", item: "MILK", quantity: 1 }])] }));
  assert.equal(restored.benefitIssues.length, 3); assert.equal(restored.benefitAdjustments.length, 1); assert.equal(restored.benefitPpeItems.length, 2);
  const check = SCH.validate(restored, { tables: [], hrTables: [] });
  assert.deepEqual(check.fatal, []); assert.ok(!check.info.some((m) => /benefit/.test(m)));
  assert.equal(B.report(restored, { type: "milk", mode: "detail", deptOf }).rows.filter((r) => r["Lượt"] === "Thu hồi").length, 2, "điều chỉnh và phiếu thu hồi cũ cùng hiện");
});
