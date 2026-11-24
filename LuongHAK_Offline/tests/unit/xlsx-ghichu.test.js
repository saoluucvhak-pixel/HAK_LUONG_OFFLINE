// v2.1.21 (A6-24 / Q10 phần 2/3): cảnh báo (vd. thiếu Mã số thuế) được IN trong Excel báo cáo lương như đã in ở PDF. Ghi chú nằm DƯỚI bảng (không làm tăng vùng đóng băng).
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const ExcelJS = require("../../exceljs.min.js");
const RX = require("../../ui/report-xlsx.js");
const vm = (ghiChu) => ({ title: "KHẤU TRỪ THUẾ", congTy: "X", kyText: "K", ngayLap: "24/11/2026", cols: [{ key: "a", label: "Mã NV", kind: "text" }, { key: "b", label: "Mã số thuế", kind: "text" }, { key: "c", label: "Thuế", kind: "money" }], rows: [{ a: "NV1", b: "", c: 200000 }], tong: { c: 200000 }, ghiChu });
const texts = (ws) => { const o = []; ws.eachRow((row, n) => row.eachCell((c) => o.push([n, String(c.value || "")]))); return o; };

test("U-GCX-01 có ghiChu → mỗi dòng ghi chú là 1 hàng 'Cảnh báo: …' nằm SAU dòng tổng và TRƯỚC khối chữ ký", () => {
  const ws = RX.build(ExcelJS, vm(["1 người có khấu trừ thuế nhưng chưa có mã số thuế: NV1 — An"]), { chuKy: ["Người lập"] }).worksheets[0], t = texts(ws);
  const note = t.find(([, v]) => /Cảnh báo: 1 người có khấu trừ thuế nhưng chưa có mã số thuế/.test(v)), tot = t.find(([, v]) => /TỔNG CỘNG/.test(v)), sig = t.find(([, v]) => v === "Người lập");
  assert.ok(note && tot && sig, JSON.stringify(t)); assert.ok(note[0] > tot[0] && note[0] < sig[0], "thứ tự tổng " + tot[0] + " < ghi chú " + note[0] + " < ký " + sig[0]);
});
test("U-GCX-02 không ghiChu → không có hàng cảnh báo; vùng đóng băng (ySplit) không đổi giữa có/không ghiChu", () => {
  const a = RX.build(ExcelJS, vm(undefined), {}).worksheets[0], b = RX.build(ExcelJS, vm(["x"]), {}).worksheets[0];
  assert.equal(texts(a).some(([, v]) => /Cảnh báo:/.test(v)), false); assert.equal(a.views[0].ySplit, b.views[0].ySplit);
});
test("U-GCX-03 payXlsx (app-src/20) truyền ghiChu: vm.canhbao cho Excel", () => {
  assert.match(fs.readFileSync(path.join(__dirname, "../../app-src/20-bao-cao-thanh-toan.js"), "utf8"), /reportXlsx\.build\(window\.ExcelJS, Object\.assign\(\{\}, vm, \{ ghiChu: vm\.canhbao/);
});
