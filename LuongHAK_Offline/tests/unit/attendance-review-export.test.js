"use strict";
// v2.1.6: Excel danh sách PHẲNG người × phiếu cần xác nhận chấm công (hàm thuần ui/attendance-review-export.js)
const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("../../exceljs.min");
const X = require("../../ui/attendance-review-export.js");
const RX = require("../../ui/report-xlsx.js");

const emp = (ma, hoTen) => ({ ma, hoTen });
const allocation = {
  attendanceReview: [
    { phieu: "PC-01", ngay: "2026-10-05", maPB: "T1", kl: 30, soNguoi: 3, vang: "", recipients: [emp("A", "An"), emp("B", "Bình"), emp("C", "Chi")], excluded: [emp("D", "Dũng"), emp("E", "Em")], employees: [emp("D", "Dũng"), emp("E", "Em")] },
    { phieu: "PC-02", ngay: "2026-10-06", maPB: "T2", kl: 20, soNguoi: 0, vang: "", recipients: [], excluded: [emp("F", "Phúc")], employees: [emp("F", "Phúc")] }
  ]
};
const base = { allocation, loai: "sanluong", ky: "2026-10", visibleKeys: null, confirmed: [], chamcong: null, plates: { "PC-01|2026-10-05|T1": "51A-111.11" }, deptName: (m) => "Tổ " + m };

test("U-ARX-01 mỗi dòng = 1 người × 1 phiếu (1 phiếu 2 người → 2 dòng)", () => {
  const d = X.build(base);
  assert.equal(d.detail.length, 3);
  assert.deepEqual(d.detail.filter((r) => r["Số phiếu"] === "PC-01").map((r) => r["Mã NV"]), ["D", "E"]);
  assert.equal(d.counts.people, 3); assert.equal(d.counts.receipts, 2);
  const r = d.detail[0];
  assert.equal(r["Biển số xe"], "51A-111.11"); assert.equal(r["Mã tổ"], "T1"); assert.equal(r["Tên tổ"], "Tổ T1");
  assert.equal(r["Số người được chia"], 3); assert.equal(r["Phần mỗi người"], 10); assert.equal(r["Có trong NV vắng của phiếu?"], "Không");
  assert.equal(r["Trạng thái xác nhận"], "Chưa xác nhận"); assert.equal(r["Chủ/Trưởng bộ phận xác nhận (ký)"], "");
  assert.equal(d.detail[2]["Phần mỗi người"], "", "phiếu không ai được chia: không chia cho 0 người");
});

test("U-ARX-02 người đã xác nhận hiển thị đúng + sheet 'Đã xác nhận' chỉ lấy đúng kỳ", () => {
  const confirmed = [{ date: "2026-10-05", team: "T1", employee: "D", reason: "Làm ca dài", user: "admin" }, { date: "2026-09-05", team: "T1", employee: "D", reason: "kỳ khác", user: "x" }];
  const d = X.build(Object.assign({}, base, { confirmed }));
  const dung = d.detail.find((r) => r["Mã NV"] === "D");
  assert.equal(dung["Trạng thái xác nhận"], "Đã xác nhận có làm"); assert.equal(dung["Người xác nhận"], "admin"); assert.equal(dung["Lý do"], "Làm ca dài");
  assert.equal(d.detail.find((r) => r["Mã NV"] === "E")["Trạng thái xác nhận"], "Chưa xác nhận");
  assert.equal(d.confirmed.length, 1); assert.equal(d.confirmed[0]["Mã NV"], "D");
});

test("U-ARX-03 bộ lọc: chỉ xuất phiếu đang hiện; null = tất cả", () => {
  const only = X.build(Object.assign({}, base, { visibleKeys: new Set([X.reviewKey("PC-02", "2026-10-06", "T2")]) }));
  assert.equal(only.detail.length, 1); assert.equal(only.detail[0]["Mã NV"], "F");
  assert.equal(X.build(base).detail.length, 3);
});

test("U-ARX-04 tình trạng công: 0 hay trống theo dữ liệu chấm công; PN/CL/CC không tính", () => {
  const chamcong = [{ "Kỳ": "2026-10", "Mã NV": "D", "Hình thức công": "BT", "05": 0 }, { "Kỳ": "2026-10", "Mã NV": "E", "Hình thức công": "BT", "05": "" }, { "Kỳ": "2026-10", "Mã NV": "E", "Hình thức công": "PN", "05": 0 }];
  const d = X.build(Object.assign({}, base, { chamcong }));
  assert.equal(d.detail.find((r) => r["Mã NV"] === "D")["Tình trạng chấm công ngày đó"], "0");
  assert.equal(d.detail.find((r) => r["Mã NV"] === "E")["Tình trạng chấm công ngày đó"], "Trống");
  assert.equal(X.build(base).detail[0]["Tình trạng chấm công ngày đó"], "0 hoặc trống", "bản chốt cũ thiếu chấm công: không bịa");
});

test("U-ARX-05 tổng hợp theo tổ", () => {
  const t = X.build(base).teams;
  assert.deepEqual(t.map((r) => [r["Mã tổ"], r["Số người cần xác nhận"], r["Số phiếu cần xác nhận"], r["Số dòng chưa xác nhận"]]), [["T1", 2, 1, 2], ["T2", 1, 1, 1]]);
});

test("U-ARX-06 file xlsx: 3 sheet, tiêu đề, đóng băng, bộ lọc, tổng ở chân, ngày dd/mm/yyyy, Mã NV là chữ, BẢN NHÁP", async () => {
  const d = X.build(Object.assign({}, base, { deptName: (m) => "Tổ " + m }));
  const vms = X.toViewModels(d, { loai: "sanluong", ky: "2026-10", congTy: "CTY TEST", kyText: "Kỳ làm việc: 10/2026", trangThai: "Chưa chốt — tính tạm", ngayLap: "23/11/2026", nguoiLap: "admin" });
  const wb = RX.buildMany(ExcelJS, vms, { chuKy: ["Người lập", "Trưởng bộ phận xác nhận", "Chủ sở hữu"], nguoiLap: "admin" });
  assert.deepEqual(wb.worksheets.map((w) => w.name), ["CanXacNhan", "DaXacNhanCoLam", "TongHopTheoTo"]);
  const ws = wb.worksheets[0], hr = ws.views[0].ySplit;
  assert.ok(hr >= 3 && hr <= 7, "đóng băng dưới dòng tiêu đề, ySplit=" + hr);
  assert.ok(ws.autoFilter, "có bộ lọc");
  assert.equal(ws.getCell(hr, 1).value, "STT");
  const dateCol = X.DETAIL_COLS.indexOf("Ngày cân") + 1, maCol = X.DETAIL_COLS.indexOf("Mã NV") + 1;
  assert.equal(ws.getCell(hr + 1, dateCol).numFmt, "dd/mm/yyyy"); assert.ok(ws.getCell(hr + 1, dateCol).value instanceof Date);
  assert.equal(ws.getCell(hr + 1, maCol).numFmt, "@");
  const text = JSON.stringify(ws.getSheetValues());
  assert.match(text, /TỔNG: 3 người-phiếu · 2 phiếu/); assert.match(text, /BẢN NHÁP|tính tạm/i);
  assert.equal(ws.rowCount > hr + 3, true);
});

test("U-ARX-07 tên tệp: loại + kỳ, hậu tố _TAM khi chưa chốt", () => {
  assert.equal(X.filename("sanluong", "2026-10", false), "DoiChieuChamCong_SanLuong_2026-10.xlsx");
  assert.equal(X.filename("bandam", "2026-10", true), "DoiChieuChamCong_BanDam_2026-10_TAM.xlsx");
});

test("U-ARX-08 chỗ ký: cột ký rộng, dòng đủ cao; Mã NV 0 đầu giữ nguyên chữ; chuỗi như công thức bị khiên", () => {
  const al = { attendanceReview: [{ phieu: "PC-9", ngay: "2026-10-05", maPB: "T1", kl: 5, soNguoi: 1, vang: "", recipients: [emp("X", "X")], excluded: [], employees: [emp("00123", "=HYPERLINK(\"http://x\")")] }] };
  const vms = X.toViewModels(X.build(Object.assign({}, base, { allocation: al })), { loai: "sanluong", ky: "2026-10" });
  const ws = RX.buildMany(ExcelJS, vms, {}).worksheets[0], hr = ws.views[0].ySplit;
  const signCol = X.DETAIL_COLS.indexOf("Chủ/Trưởng bộ phận xác nhận (ký)") + 1, maCol = X.DETAIL_COLS.indexOf("Mã NV") + 1, nameCol = X.DETAIL_COLS.indexOf("Họ và tên") + 1;
  assert.ok(ws.getColumn(signCol).width >= 28, "cột ký đủ rộng: " + ws.getColumn(signCol).width);
  assert.ok(ws.getRow(hr + 1).height >= 24, "dòng đủ cao để ký");
  assert.equal(ws.getCell(hr + 1, maCol).value, "00123"); assert.equal(ws.getCell(hr + 1, maCol).numFmt, "@");
  assert.match(String(ws.getCell(hr + 1, nameCol).value), /^'=HYPERLINK/, "khiên công thức");
});

test("U-ARX-09 hiệu năng: 100.000 dòng người × phiếu dựng < 2 s (có chỉ mục chấm công)", () => {
  const N = 5000, people = [], cc = [];
  for (let i = 0; i < N; i++) { people.push(emp("E" + i, "N" + i)); cc.push({ "Kỳ": "2026-10", "Mã NV": "E" + i, "Hình thức công": "BT", "05": 0 }); }
  const al = { attendanceReview: Array.from({ length: 20 }, (_, p) => ({ phieu: "P" + p, ngay: "2026-10-05", maPB: "T", kl: 30, soNguoi: 10, vang: "", recipients: people.slice(0, 10), excluded: [], employees: people })) };
  const t = Date.now(), d = X.build({ allocation: al, loai: "sanluong", ky: "2026-10", chamcong: cc, confirmed: [], deptName: (m) => m, plates: {} });
  assert.equal(d.detail.length, 100000); assert.ok(Date.now() - t < 2000, "mất " + (Date.now() - t) + " ms");
});
