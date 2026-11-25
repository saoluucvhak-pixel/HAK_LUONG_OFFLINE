// Đối chiếu báo cáo BẢO HIỂM: tổng hợp ↔ theo phòng ban ↔ chi tiết cộng đúng cùng một nguồn (bảng BHXH engine đã tính), và Excel giữ nguyên số.
// Từng cột/từng khoản, không chấp nhận tổng khớp nhờ sai lệch bù nhau. Dữ liệu giả.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const X = require("../../exceljs.min.js");
const BH = require("../../core/bh-report.js");
const BX = require("../../ui/bh-xlsx.js");
const TRm = require("../../core/reporting/total-row.js");

const row = (ma, pb, luong, du) => {
  const r = { "Mã NV": ma, "Họ và tên": ma + " Tên", "Phòng ban": pb, "Lương đóng BHXH": luong,
    "CTY.BHXH": luong * 0.175, "CTY.BHYT": luong * 0.03, "CTY.BHTN": luong * 0.01, "CTY.KPCĐ": luong * 0.02,
    "NLĐ.BHXH": luong * 0.08, "NLĐ.BHYT": luong * 0.015, "NLĐ.BHTN": luong * 0.01 };
  r["Cộng BH công ty đóng"] = r["CTY.BHXH"] + r["CTY.BHYT"] + r["CTY.BHTN"] + r["CTY.KPCĐ"];
  r["Cộng BH NLĐ đóng"] = r["NLĐ.BHXH"] + r["NLĐ.BHYT"] + r["NLĐ.BHTN"];
  r["Truy thu bảo hiểm"] = du ? 0 : r["Cộng BH công ty đóng"];
  r["Ghi chú"] = du ? "Đủ ngưỡng" : "Chưa đủ ngưỡng (2/14 công)";
  return r;
};
const kq = { bhxh: [row("NV001", "Văn phòng", 6000000, true), row("NV002", "Xưởng", 5000000, true), row("TỔNG-03", "Xưởng", 4000000, false), row("00123", "Văn phòng", 4500000, true)] };
const sum = (rows, k) => rows.reduce((a, r) => a + (+r[k] || 0), 0);
const body = (rows) => rows.filter((r) => !TRm.is(r));
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-6, m + ": " + a + " ≠ " + b);

test("U-PARITY-BH-01: chi tiết giữ đủ người (kể cả 'TỔNG-03' và mã số 0 đầu), tổng = cộng đúng các dòng", () => {
  const ct = BH.chiTiet(kq), data = body(ct);
  assert.equal(data.length, 4); assert.ok(data.some((r) => r["Mã NV"] === "TỔNG-03"), "dòng thật 'TỔNG-03' không bị coi là dòng tổng");
  assert.ok(data.some((r) => r["Mã NV"] === "00123"), "mã số 0 đầu giữ nguyên");
  const tot = ct.filter((r) => TRm.is(r));
  assert.equal(tot.length, 1, "đúng một dòng tổng được đánh dấu");
  for (const k of ["Cộng BH NLĐ đóng", "Cộng BH công ty đóng"]) if (k in tot[0]) near(tot[0][k], sum(data, k), "chi tiết cột " + k);
});

test("U-PARITY-BH-02: theo phòng ban cộng lại = chi tiết, từng phòng ban và từng cột", () => {
  const pb = BH.theoPhongBan(kq), ct = BH.chiTiet(kq), data = body(pb);
  assert.equal(data.length, 2, "2 phòng ban");
  const cd = body(ct);
  for (const r of data) {
    const tenPB = r["Phòng ban"], mine = cd.filter((x) => x["Phòng ban"] === tenPB);
    assert.equal(r["Số người"], mine.length, tenPB + ": số người");
    near(r["Cộng BH NLĐ đóng"], sum(mine, "Cộng BH NLĐ đóng"), tenPB + ": NLĐ");
  }
  near(sum(data, "Cộng BH NLĐ đóng"), sum(cd, "Cộng BH NLĐ đóng"), "tổng các phòng ban = tổng chi tiết");
});

test("U-PARITY-BH-03: tổng hợp theo khoản: công ty/NLĐ từng khoản = cộng cột tương ứng của chi tiết; TỔNG = cộng các khoản", () => {
  const t = BH.tongHop(kq), by = Object.fromEntries(t.rows.map((r) => [r["Khoản"], r]));
  near(by.BHXH["Công ty đóng"], sum(kq.bhxh, "CTY.BHXH"), "BHXH công ty"); near(by.BHXH["Người lao động đóng (trừ lương)"], sum(kq.bhxh, "NLĐ.BHXH"), "BHXH NLĐ");
  near(by.BHYT["Công ty đóng"], sum(kq.bhxh, "CTY.BHYT"), "BHYT công ty"); near(by.BHTN["Công ty đóng"], sum(kq.bhxh, "CTY.BHTN"), "BHTN công ty");
  const khoan = t.rows.filter((r) => r["Khoản"] !== "TỔNG");
  near(by["TỔNG"]["Công ty đóng"], sum(khoan, "Công ty đóng"), "TỔNG công ty = cộng các khoản");
  near(by["TỔNG"]["Người lao động đóng (trừ lương)"], sum(khoan, "Người lao động đóng (trừ lương)"), "TỔNG NLĐ = cộng các khoản");
  near(by["TỔNG"]["Công ty đóng"], sum(kq.bhxh, "Cộng BH công ty đóng"), "TỔNG công ty = cột 'Cộng' của chi tiết");
});

test("U-PARITY-BH-04: Excel (4 sheet) giữ nguyên từng giá trị của báo cáo — vòng ghi/đọc", async () => {
  const data = [{ name: "TongHop", rows: BH.tongHop(kq).rows }, { name: "TangGiam", rows: [] }, { name: "TheoPhongBan", rows: BH.theoPhongBan(kq) }, { name: "ChiTiet", rows: BH.chiTiet(kq) }];
  const wb = BX.build(X, data, { congTy: "CT TEST", kyText: "THÁNG 09/2026", ngayLap: "01/10/2026" }), buf = await wb.xlsx.writeBuffer(), out = new X.Workbook(); await out.xlsx.load(buf);
  const ws = out.getWorksheet("ChiTiet"), vals = []; ws.eachRow((r) => r.eachCell((c) => vals.push(c.value)));
  for (const r of body(BH.chiTiet(kq))) {
    assert.ok(vals.includes(r["Mã NV"]), "Mã NV " + r["Mã NV"] + " có trong Excel (kiểu chữ, giữ số 0 đầu)");
    for (const k of ["Cộng BH NLĐ đóng", "Cộng BH công ty đóng"]) if (k in r) assert.ok(vals.some((v) => typeof v === "number" && Math.abs(v - r[k]) < 1e-6), r["Mã NV"] + " " + k + " có trong Excel");
  }
});

test("bộ lọc bảo hiểm dùng cùng tập dòng cho tổng kỳ, phòng ban, chi tiết và Excel", async () => {
  const report = BH.filteredReport(kq, { bhxh: [row("QA-LEFT", "Xưởng", 3000000, true)] }, { phongBan: ["Xưởng"] });
  const people = body(report.people);
  assert.deepEqual(people.map(r => r["Mã NV"]), ["NV002", "TỔNG-03"]);
  assert.ok(report.movement.some(r => r["Mã NV"] === "QA-LEFT" && r.Loại.startsWith("Giảm")));
  const expected = sum(people, "Cộng BH NLĐ đóng");
  assert.equal(report.totals.soNguoi, people.length);
  assert.equal(report.totals.rows.at(-1)["Người lao động đóng (trừ lương)"], expected);
  assert.equal(report.departments.at(-1)["Cộng BH NLĐ đóng"], expected);
  const sheets = [{ name: "TongHop", rows: report.totals.rows }, { name: "ChiTiet", rows: people }];
  const book = new X.Workbook();
  await book.xlsx.load(await BX.build(X, sheets, { phamVi: "Xưởng" }).xlsx.writeBuffer());
  assert.equal(book.getWorksheet("TongHop").getCell("C10").value, expected);
  assert.ok(book.getWorksheet("ChiTiet").getColumn(2).values.includes("TỔNG-03"));
  const html = require("../../core/reporting/report-html").sheets({ title: "Bảo hiểm", sheets });
  assert.match(html, /TỔNG-03/);
  assert.doesNotMatch(html, /NV001|00123/);
  assert.equal(BH.filteredReport(kq, {}, { maNV: ["UNKNOWN"] }).totals.soNguoi, 0);
  assert.ok(BH.filteredReport(kq, {}, { thucLinhTu: 1000 }).skipped.includes("Khoảng thực lĩnh"));
});

test("Excel bảo hiểm lưu ngày kiểu Date, giữ số sổ và hai tiêu đề ở sheet rỗng", async () => {
  const entry = { ...BH.chiTiet(kq)[0], "Số sổ BHXH": "0000000001", "Ngày sinh": "29/02/2000" };
  for (const rows of [[entry], []]) {
    const out = new X.Workbook();
    await out.xlsx.load(await BX.build(X, [{ name: "ChiTiet", rows }], { notes: ["Nguồn: hồ sơ hiện tại"] }).xlsx.writeBuffer());
    const ws = out.getWorksheet("ChiTiet"), header = ws.getRow(5).values;
    assert.ok(header.includes("Số sổ BHXH") && header.includes("Ngày sinh"));
    assert.match(ws.getCell("A4").value, /hồ sơ hiện tại/);
    if (!rows.length) continue;
    assert.equal(ws.getCell(6, header.indexOf("Số sổ BHXH")).value, "0000000001");
    const birth = ws.getCell(6, header.indexOf("Ngày sinh"));
    assert.equal(birth.value.toISOString().slice(0, 10), "2000-02-29");
    assert.equal(birth.numFmt, "dd/mm/yyyy");
    assert.equal(birth.alignment.horizontal, "center");
  }
});
