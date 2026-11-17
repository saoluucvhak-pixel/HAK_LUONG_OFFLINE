"use strict";
// Cấp phát: nhân viên chuyển tổ và thu hồi/đổi cỡ phải giữ thông tin phiếu gốc (tổ, tên mặt hàng, đơn vị, cỡ đã lưu tại ngày cấp).
// Ca bắt buộc: A nhận 10 đôi giày ở Tổ 1, chuyển Tổ 2 rồi nhận 5 đôi cùng cỡ → Tổ 1 = 10, Tổ 2 = 5, tổng = 15;
// thu hồi 2 đôi từ phiếu của Tổ 1 sau khi A đã sang Tổ 2 → Tổ 1: đã cấp 10, thu hồi 2, thực cấp 8; Tổ 2: 5, 0, 5. Dữ liệu giả.
const test = require("node:test"), assert = require("node:assert/strict");
const B = require("../../core/benefits.js");

const T1 = { code: "T1", name: "Tổ 1" }, T2 = { code: "T2", name: "Tổ 2" };
// A chuyển từ Tổ 1 sang Tổ 2 từ 15/11/2026; tra cứu "hiện tại" (không kèm ngày đúng) luôn ra Tổ 2
const deptOf = (employee, date) => employee === "A" ? ((date || "9999") < "2026-11-15" ? T1 : T2) : T1;
const db0 = () => ({
  nhanvien: [{ "Mã NV": "A", "Họ và tên": "Nguyễn An" }, { "Mã NV": "B", "Họ và tên": "Trần Bình" }],
  hopdong: ["A", "B"].map((ma) => ({ "Mã NV": ma, "Số HĐLĐ": "H" + ma, "Ngày vào làm": "2026-01-01" })),
  benefitStandards: [{ code: "S1", from: "2026-01-01", items: [{ code: "MILK", name: "Sữa", unit: "hộp", quantity: 30 }] }],
  benefitAssignments: ["A", "B"].map((ma) => ({ employee: ma, contract: "H" + ma, code: "S1", from: "2026-01-01" })),
  benefitPpeItems: [{ code: "GIAY", name: "Giày bảo hộ", group: "Giày", unit: "đôi", spec: "", active: true, sizes: ["39", "40", "41"] }],
  benefitIssues: [], benefitAdjustments: []
});
const issue = (db, input, reviewer) => ({ ...B.buildVoucher(db, { maker: "hr", ...input }, deptOf), status: "issued", reviewer: reviewer || "boss", confirmedAt: "2026-11-20T08:00:00.000Z" });
const adj = (id, ref, lines, extra) => ({ id, ref, kind: "recall", reason: "Trả lại", by: "boss", at: "2026-11-25T09:30:00.000Z", lines, ...extra });
const shoes = (qty) => [{ employee: "A", item: "GIAY", size: "40", quantity: qty }];
function scenario() {
  const db = db0();
  db.benefitIssues = [issue(db, { type: "ppe", id: "BH1", date: "2026-11-03", place: "Kho", lines: shoes(10) }), issue(db, { type: "ppe", id: "BH2", date: "2026-11-20", place: "Kho", lines: shoes(5) })];
  return db;
}
const summary = (db, opts) => B.report(db, { type: "ppe", mode: "summary", deptOf, ...opts }).rows;
const pick = (rows, dept) => rows.find((r) => r["Tổ/Phòng ban"] === dept && !r._total);

test("U-DIS-TR-01 ca bắt buộc: A nhận 10 đôi ở Tổ 1, chuyển Tổ 2 rồi nhận 5 đôi cùng cỡ → Tổ 1 = 10, Tổ 2 = 5, tổng = 15 (không dồn vào tổ đầu hay tổ hiện tại)", () => {
  const db = scenario();
  for (const bySize of [false, true]) {
    const rows = summary(db, { bySize }), t1 = pick(rows, "Tổ 1"), t2 = pick(rows, "Tổ 2"), total = rows.find((r) => r._total);
    assert.deepEqual([t1["Đã cấp"], t1["Thu hồi"], t1["Thực cấp"], t1["Số người nhận"]], [10, 0, 10, 1], "Tổ 1 (bySize=" + bySize + ")");
    assert.deepEqual([t2["Đã cấp"], t2["Thu hồi"], t2["Thực cấp"], t2["Số người nhận"]], [5, 0, 5, 1], "Tổ 2 (bySize=" + bySize + ")");
    assert.deepEqual([total["Đã cấp"], total["Thu hồi"], total["Thực cấp"]], [15, 0, 15]);
    assert.equal(rows.filter((r) => !r._total).length, 2);
  }
});

test("U-DIS-TR-02 lọc từng tổ cho đúng kết quả tương ứng ở tổng hợp VÀ chi tiết", () => {
  const db = scenario();
  const s1 = summary(db, { filters: { dept: ["T1"] } }), s2 = summary(db, { filters: { dept: ["T2"] } });
  assert.deepEqual(s1.filter((r) => !r._total).map((r) => [r["Tổ/Phòng ban"], r["Đã cấp"]]), [["Tổ 1", 10]]);
  assert.deepEqual(s2.filter((r) => !r._total).map((r) => [r["Tổ/Phòng ban"], r["Đã cấp"]]), [["Tổ 2", 5]]);
  assert.equal(s1.find((r) => r._total)["Đã cấp"], 10); assert.equal(s2.find((r) => r._total)["Đã cấp"], 5);
  const d = (dept) => B.report(db, { type: "ppe", mode: "detail", filters: { dept: [dept] }, deptOf }).rows.map((r) => [r["Mã phiếu"], r["Số lượng"], r["Tổ/Phòng ban tại ngày cấp"]]);
  assert.deepEqual(d("T1"), [["BH1", 10, "Tổ 1"]]); assert.deepEqual(d("T2"), [["BH2", 5, "Tổ 2"]]);
});

test("U-DIS-TR-03 phân biệt theo đơn vị tính và mã vật tư: cùng tên mặt hàng khác đơn vị hoặc khác mã không bị gộp; tách cỡ khi bật chế độ tách cỡ", () => {
  const db = scenario(); db.benefitPpeItems = db.benefitPpeItems.concat([{ code: "GIAY2", name: "Giày bảo hộ", group: "Giày", unit: "chiếc", spec: "", active: true, sizes: ["40"] }]);
  db.benefitIssues = db.benefitIssues.concat(issue(db, { type: "ppe", id: "BH3", date: "2026-11-04", lines: [{ employee: "B", item: "GIAY2", size: "40", quantity: 3 }] }),
    issue(db, { type: "ppe", id: "BH4", date: "2026-11-05", lines: [{ employee: "B", item: "GIAY", size: "41", quantity: 2 }] }));
  const merged = summary(db).filter((r) => !r._total);
  assert.deepEqual(merged.map((r) => [r["Tổ/Phòng ban"], r["Đơn vị"]]).sort(), [["Tổ 1", "chiếc"], ["Tổ 1", "đôi"], ["Tổ 2", "đôi"]], "tách theo tổ và đơn vị tính, không gộp mã vật tư khác nhau");
  assert.deepEqual(merged.filter((r) => r["Đơn vị"] === "chiếc").map((r) => r["Đã cấp"]), [3]);
  const t1pairs = merged.find((r) => r["Tổ/Phòng ban"] === "Tổ 1" && r["Đơn vị"] === "đôi");
  assert.equal(t1pairs["Đã cấp"], 12, "Tổ 1: 10 (A cỡ 40) + 2 (B cỡ 41) khi chưa tách cỡ");
  const bySize = summary(db, { bySize: true }).filter((r) => !r._total && r["Tổ/Phòng ban"] === "Tổ 1" && r["Đơn vị"] === "đôi");
  assert.deepEqual(bySize.map((r) => [r["Kích cỡ"], r["Đã cấp"]]).sort(), [["40", 10], ["41", 2]]);
  const totals = summary(db).filter((r) => r._total).map((r) => [r["Đơn vị"], r["Đã cấp"]]).sort();
  assert.deepEqual(totals, [["chiếc", 3], ["đôi", 17]], "cộng riêng theo đơn vị tính");
});

test("U-DIS-TR-04 sữa: người chuyển tổ trong tháng không bị cộng lặp định mức; số đã cấp theo từng tổ, định mức giữ ở cấp nhân viên/tháng và ghi rõ", () => {
  const db = db0();
  db.benefitIssues = [issue(db, { type: "milk", id: "S1", date: "2026-11-03", lines: [{ employee: "A", item: "MILK", quantity: 10 }] }), issue(db, { type: "milk", id: "S2", date: "2026-11-20", lines: [{ employee: "A", item: "MILK", quantity: 6 }] })];
  const rows = B.report(db, { type: "milk", mode: "summary", filters: { thang: "2026-11" }, deptOf }).rows;
  const body = rows.filter((r) => !r._total), total = rows.find((r) => r._total);
  assert.equal(total["Đã cấp"], 16); assert.equal(total["Thực cấp"], 16);
  assert.equal(total["Định mức"], 60, "định mức tháng: A 30 + B 30, mỗi người một lần (A không cộng lặp khi chuyển tổ)");
  assert.equal(total["Còn lại"], 14 + 30); assert.equal(total["Vượt"], 0);
  const given = (dept) => (body.find((r) => r["Tổ/Phòng ban"] === dept) || {})["Đã cấp"];
  assert.equal(given("Tổ 1"), 10 + 0, "Tổ 1: 10 hộp của A (B chưa nhận)"); assert.equal(given("Tổ 2"), 6);
  const multi = body.filter((r) => /chuyển tổ/i.test(r["Tổ/Phòng ban"]));
  assert.equal(multi.length, 1); assert.equal(multi[0]["Định mức"], 30); assert.equal(multi[0]["Còn lại"], 14); assert.match(multi[0]["Ghi chú"], /theo nhân viên\/tháng/);
  assert.equal(body.reduce((n, r) => n + (typeof r["Đã cấp"] === "number" ? r["Đã cấp"] : 0), 0), 16, "không đếm đã cấp hai lần");
});

test("U-DIS-TR-05 ca bắt buộc: thu hồi 2 đôi từ phiếu 10 đôi của Tổ 1 sau khi A đã sang Tổ 2 → Tổ 1: 10/2/8; Tổ 2: 5/0/5; dòng thu hồi mở đúng phiếu gốc, hiện ngày thu hồi và ngày cấp gốc", () => {
  const db = { ...scenario(), benefitAdjustments: [adj("DC1", "BH1", shoes(2))] };
  assert.equal(B.adjustmentProblem(db, db.benefitAdjustments[0]), "");
  const rows = summary(db), t1 = pick(rows, "Tổ 1"), t2 = pick(rows, "Tổ 2"), total = rows.find((r) => r._total);
  assert.deepEqual([t1["Đã cấp"], t1["Thu hồi"], t1["Thực cấp"]], [10, 2, 8]); assert.deepEqual([t2["Đã cấp"], t2["Thu hồi"], t2["Thực cấp"]], [5, 0, 5]);
  assert.deepEqual([total["Đã cấp"], total["Thu hồi"], total["Thực cấp"]], [15, 2, 13]);
  const detail = B.report(db, { type: "ppe", mode: "detail", deptOf }), recall = detail.rows.find((r) => r["Lượt"] === "Thu hồi");
  assert.equal(recall._voucher, "BH1"); assert.equal(recall["Mã phiếu"], "BH1"); assert.equal(recall["Tổ/Phòng ban tại ngày cấp"], "Tổ 1");
  assert.equal(recall["Ngày giao dịch"], "2026-11-25"); assert.equal(recall["Ngày cấp gốc"], "2026-11-03"); assert.equal(recall["Mã điều chỉnh"], "DC1");
  assert.equal(recall["Người xác nhận"], "boss"); assert.match(recall["Ghi chú"], /Trả lại/); assert.match(recall["Ghi chú"], /09:30/, "giữ thời điểm thao tác");
  const issueRow = detail.rows.find((r) => r["Mã phiếu"] === "BH1" && r["Lượt"] === "Cấp"); assert.equal(issueRow["Ngày giao dịch"], "2026-11-03"); assert.equal(issueRow["Ngày cấp gốc"], "2026-11-03"); assert.equal(issueRow["Mã điều chỉnh"], "");
  const t1Detail = B.report(db, { type: "ppe", mode: "detail", filters: { dept: ["T1"] }, deptOf }).rows.map((r) => [r["Lượt"], r["Số lượng"]]);
  assert.deepEqual(t1Detail, [["Cấp", 10], ["Thu hồi", 2]]);
});

test("U-DIS-TR-06 dòng thu hồi / đổi cỡ giữ tên mặt hàng, đơn vị, cỡ và tổ đã ghi trên dòng cấp gốc dù vật tư đổi tên và nhân viên chuyển tổ; lượt cấp thay thế đúng cỡ mới và liên kết phiếu gốc", () => {
  const db = scenario();
  const change = adj("DC2", "BH1", shoes(2), { kind: "resize", to: [{ employee: "A", item: "GIAY", size: "41", quantity: 2 }] });
  const renamed = { ...db, benefitAdjustments: [change], benefitPpeItems: db.benefitPpeItems.map((i) => ({ ...i, name: "Giày an toàn", unit: "cặp" })) };
  assert.equal(B.adjustmentProblem(renamed, change), "");
  const rows = B.report(renamed, { type: "ppe", mode: "detail", deptOf }).rows.filter((r) => r["Mã phiếu"] === "BH1");
  assert.deepEqual(rows.map((r) => [r["Lượt"], r["Kích cỡ"], r["Số lượng"], r["Tổ/Phòng ban tại ngày cấp"], r["Mặt hàng"], r["Đơn vị"]]),
    [["Cấp", "40", 10, "Tổ 1", "Giày bảo hộ", "đôi"], ["Thu hồi", "40", 2, "Tổ 1", "Giày bảo hộ", "đôi"], ["Cấp (đổi cỡ)", "41", 2, "Tổ 1", "Giày bảo hộ", "đôi"]]);
  assert.ok(rows.slice(1).every((r) => r["Mã điều chỉnh"] === "DC2" && r["Ngày cấp gốc"] === "2026-11-03" && r["Ngày giao dịch"] === "2026-11-25"));
  const s = B.report(renamed, { type: "ppe", mode: "summary", bySize: true, deptOf }).rows.filter((r) => !r._total && r["Tổ/Phòng ban"] === "Tổ 1");
  assert.deepEqual(s.map((r) => [r["Kích cỡ"], r["Đã cấp"], r["Thu hồi"], r["Thực cấp"]]).sort(), [["40", 10, 2, 8], ["41", 2, 0, 2]]);
});

test("U-DIS-TR-07 bộ lọc ngày giao dịch đưa thu hồi vào đúng kỳ phát sinh; bộ lọc tháng hưởng dùng tháng hưởng của phiếu gốc (sữa thu hồi sang tháng sau)", () => {
  const db = { ...scenario(), benefitAdjustments: [adj("DC1", "BH1", shoes(2), { at: "2026-12-02T08:00:00.000Z" })] };
  const nov = B.report(db, { type: "ppe", mode: "detail", filters: { tu: "2026-11-01", den: "2026-11-30" }, deptOf }).rows.map((r) => r["Lượt"] + ":" + r["Số lượng"]);
  const dec = B.report(db, { type: "ppe", mode: "detail", filters: { tu: "2026-12-01", den: "2026-12-31" }, deptOf }).rows.map((r) => r["Lượt"] + ":" + r["Số lượng"]);
  assert.deepEqual(nov, ["Cấp:10", "Cấp:5"]); assert.deepEqual(dec, ["Thu hồi:2"]);
  const novSum = summary(db, { filters: { tu: "2026-11-01", den: "2026-11-30" } }).find((r) => r._total), decSum = summary(db, { filters: { tu: "2026-12-01", den: "2026-12-31" } }).find((r) => r._total);
  assert.deepEqual([novSum["Đã cấp"], novSum["Thu hồi"]], [15, 0]); assert.deepEqual([decSum["Đã cấp"], decSum["Thu hồi"], decSum["Thực cấp"]], [0, 2, -2]);
  const milk = db0();
  milk.benefitIssues = [issue(milk, { type: "milk", id: "S1", date: "2026-11-05", lines: [{ employee: "B", item: "MILK", quantity: 4 }] })];
  milk.benefitAdjustments = [adj("DC1", "S1", [{ employee: "B", item: "MILK", quantity: 1 }], { at: "2026-12-03T08:00:00.000Z" })];
  const m = (f) => B.report(milk, { type: "milk", mode: "detail", filters: f, deptOf }).rows.map((r) => r["Lượt"] + ":" + r["Số lượng"]);
  assert.deepEqual(m({ thang: "2026-11" }), ["Cấp:4", "Thu hồi:1"], "tháng hưởng của phiếu gốc");
  assert.deepEqual(m({ tu: "2026-12-01", den: "2026-12-31" }), ["Thu hồi:1"]); assert.deepEqual(m({ thang: "2026-12" }), []);
  assert.equal(B.issued(milk, "2026-11").get(JSON.stringify(["B", "MILK"])), 3);
});

test("U-DIS-TR-08 chặn thu hồi vượt số còn lại qua nhiều lần điều chỉnh; đổi cỡ phải thu hồi và cấp lại đúng số lượng từng người, từng mặt hàng", () => {
  const db = scenario(), one = adj("DC1", "BH1", shoes(6)), two = adj("DC2", "BH1", shoes(4), { at: "2026-11-26T09:00:00.000Z" }), three = adj("DC3", "BH1", shoes(1), { at: "2026-11-27T09:00:00.000Z" });
  assert.equal(B.adjustmentProblem({ ...db, benefitAdjustments: [one, two] }, two), "");
  assert.match(B.adjustmentProblem({ ...db, benefitAdjustments: [one, two, three] }, three), /vượt số lượng còn lại.*còn 0/);
  const bad = adj("DC4", "BH1", shoes(2), { kind: "resize", to: [{ employee: "A", item: "GIAY", size: "41", quantity: 3 }] });
  assert.match(B.adjustmentProblem({ ...db, benefitAdjustments: [bad] }, bad), /phải bằng/);
  const both = adj("DC5", "BH1", [{ employee: "A", item: "GIAY", size: "40", quantity: 2 }], { kind: "resize", to: [{ employee: "A", item: "GIAY", size: "41", quantity: 1 }, { employee: "A", item: "GIAY", size: "39", quantity: 1 }] });
  assert.equal(B.adjustmentProblem({ ...db, benefitAdjustments: [both] }, both), "", "đổi một cỡ cũ sang hai cỡ mới vẫn đúng tổng số lượng của người đó và mặt hàng đó");
});

test("U-DIS-TR-09 phiếu lịch sử thiếu tổ tại ngày cấp: chỉ dùng dữ liệu kiểm chứng được; suy ra từ hồ sơ hợp đồng thì ghi rõ, thiếu căn cứ thì hiển thị để đối chiếu (không dồn vào tổ hiện tại)", () => {
  const db = scenario(), strip = ({ dept, deptName, itemName, unit, employeeName, ...rest }) => rest;
  const legacy = db.benefitIssues.map((doc) => ({ ...doc, lines: doc.lines.map(strip) }));
  const known = B.report({ ...db, benefitIssues: legacy }, { type: "ppe", mode: "detail", deptOf }).rows;
  assert.deepEqual(known.map((r) => r["Tổ/Phòng ban tại ngày cấp"]), ["Tổ 1 (suy ra từ hồ sơ hợp đồng tại ngày cấp)", "Tổ 2 (suy ra từ hồ sơ hợp đồng tại ngày cấp)"], "dòng cũ: tổ theo hồ sơ tại NGÀY CẤP của từng phiếu, có ghi nguồn");
  const nothing = () => null;
  const missing = B.report({ ...db, benefitIssues: legacy }, { type: "ppe", mode: "detail", deptOf: nothing }).rows;
  assert.ok(missing.every((r) => /Thiếu căn cứ/.test(r["Tổ/Phòng ban tại ngày cấp"])), "thiếu căn cứ: hiển thị rõ");
  const s = summary({ ...db, benefitIssues: legacy }, { deptOf: nothing }).filter((r) => !r._total);
  assert.equal(s.length, 1); assert.match(s[0]["Tổ/Phòng ban"], /Thiếu căn cứ/); assert.equal(s[0]["Đã cấp"], 15);
  const snap = B.report(db, { type: "ppe", mode: "detail", deptOf: nothing }).rows;
  assert.deepEqual(snap.map((r) => r["Tổ/Phòng ban tại ngày cấp"]), ["Tổ 1", "Tổ 1"].slice(0, 1).concat(["Tổ 2"]), "dòng có thông tin đã lưu không phụ thuộc deptOf hiện tại");
});
