// Đối chiếu báo cáo CẤP PHÁT: bảng tổng hợp = bảng chi tiết (từng mặt hàng/cỡ), thực cấp = đã cấp − thu hồi, tổng = cộng dòng; Excel giữ nguyên số. Dữ liệu giả.
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const ExcelJS = require("../../exceljs.min.js"), B = require("../../core/benefits.js"), DR = require("../../ui/dispense-report.js"), RX = require("../../ui/report-xlsx.js");

const team = { T1: { code: "T1", name: "Tổ 1" } }, deptOf = () => team.T1;
const db = {
  nhanvien: [{ "Mã NV": "0005", "Họ và tên": "Nguyễn Văn An" }, { "Mã NV": "00123", "Họ và tên": "Trần Thị Bình" }],
  benefitStandards: [], benefitAssignments: [], hopdong: [],
  benefitPpeItems: [{ code: "GIAY", name: "Giày", group: "Giày", unit: "đôi", spec: "", active: true, sizes: ["39", "40"] }, { code: "NON", name: "Nón", group: "Nón", unit: "cái", spec: "", active: true, sizes: [] }],
  benefitIssues: [], benefitAdjustments: []
};
const doc = B.buildVoucher(db, { type: "ppe", id: "BH1", date: "2026-11-10", place: "Kho", maker: "hr", lines: [
  { employee: "0005", item: "GIAY", size: "40", quantity: 10 }, { employee: "00123", item: "GIAY", size: "39", quantity: 3 }, { employee: "00123", item: "NON", size: "", quantity: 4 }] });
const data = { ...db, benefitIssues: [{ ...doc, status: "issued", reviewer: "boss", confirmedAt: "2026-11-10T08:00:00.000Z" }],
  benefitAdjustments: [{ id: "DC1", ref: "BH1", kind: "recall", reason: "Trả", by: "boss", at: "2026-11-12T08:00:00.000Z", lines: [{ employee: "0005", item: "GIAY", size: "40", quantity: 2 }] }] };
const rep = (mode) => B.report(data, { type: "ppe", mode, bySize: true, filters: { tu: "2026-11-01", den: "2026-11-30" }, deptOf });
const isTotal = (r) => r._total === true || /^CỘNG$/.test(r["Tổ/Phòng ban"] || "");

test("U-PARITY-DIS-01: tổng hợp = chi tiết cho từng (mặt hàng, cỡ): đã cấp, thu hồi, thực cấp, số người", () => {
  const sum = rep("summary"), det = rep("detail");
  const rows = sum.rows.filter((r) => !isTotal(r)), lines = det.rows;
  for (const s of rows) {
    const mine = lines.filter((l) => l["Mặt hàng"] === s["Mặt hàng"] && String(l["Kích cỡ"]) === String(s["Kích cỡ"]));
    const cap = mine.filter((l) => l["Lượt"] === "Cấp").reduce((a, l) => a + l["Số lượng"], 0), thu = mine.filter((l) => l["Lượt"] !== "Cấp").reduce((a, l) => a + Math.abs(l["Số lượng"]), 0);
    assert.equal(s["Đã cấp"], cap, s["Mặt hàng"] + " " + s["Kích cỡ"] + ": đã cấp");
    assert.equal(s["Thu hồi"], thu, s["Mặt hàng"] + " " + s["Kích cỡ"] + ": thu hồi");
    assert.equal(s["Thực cấp"], cap - thu, s["Mặt hàng"] + " " + s["Kích cỡ"] + ": thực cấp = đã cấp − thu hồi");
    assert.equal(s["Số người nhận"], new Set(mine.filter((l) => l["Lượt"] === "Cấp").map((l) => l["Mã NV"])).size, "số người nhận");
  }
});

test("U-PARITY-DIS-02: dòng cộng theo từng đơn vị tính = cộng đúng các dòng cùng đơn vị (không cộng đôi với cái)", () => {
  const sum = rep("summary");
  for (const t of sum.totals) {
    const dv = t["Đơn vị"], mine = sum.rows.filter((r) => !isTotal(r) && r["Đơn vị"] === dv);
    for (const k of ["Đã cấp", "Thu hồi", "Thực cấp"]) assert.equal(t[k], mine.reduce((a, r) => a + r[k], 0), "đơn vị " + dv + " cột " + k);
  }
  assert.ok(sum.totals.length >= 2, "có tổng riêng cho đôi và cái");
});

test("U-PARITY-DIS-03: Excel của cả hai chế độ giữ nguyên mã NV số 0 đầu và mọi số lượng của dòng", async () => {
  for (const mode of ["summary", "detail"]) {
    const r = rep(mode), meta = DR.meta(r, { filters: { tu: "2026-11-01", den: "2026-11-30" }, type: "ppe", bySize: true, labels: B.LABEL, fmtDate: (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4), scopeText: "x", rep: r });
    const vm = DR.excelVm(r, meta, { congTy: "CT", user: "hr", now: new Date(2026, 10, 17) });
    const wb = RX.build(ExcelJS, vm, { chuKy: DR.SIGN, nguoiLap: "hr" }), buf = await wb.xlsx.writeBuffer(), re = new ExcelJS.Workbook(); await re.xlsx.load(buf);
    const vals = []; re.worksheets[0].eachRow((row) => row.eachCell((c) => vals.push(c.value)));
    if (mode === "detail") for (const l of r.rows) { assert.ok(vals.includes(l["Mã NV"]), "Mã NV " + l["Mã NV"] + " (chữ, giữ số 0 đầu)"); assert.ok(vals.some((v) => typeof v === "number" && Math.abs(v - l["Số lượng"]) < 1e-9), "số lượng " + l["Số lượng"]); }
    else for (const l of r.rows.filter((x) => !isTotal(x))) for (const k of ["Đã cấp", "Thu hồi", "Thực cấp"]) assert.ok(vals.some((v) => typeof v === "number" && v === l[k]), mode + " " + k + " " + l[k]);
  }
});
