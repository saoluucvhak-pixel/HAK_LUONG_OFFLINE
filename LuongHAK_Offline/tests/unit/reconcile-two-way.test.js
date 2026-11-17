"use strict";
// Đối chiếu bảng lương Excel HAI CHIỀU: "Có trong app, thiếu trong Excel" và "Có trong Excel, không khớp app".
// Giữ quy tắc v2.0.23 (mã NV → khớp theo mã; chỉ khớp tên khi Excel trống mã và tên khớp duy nhất). Dữ liệu giả.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const RC = require("../../core/reconcile.js");

const app = (ma, ten, thucLinh) => ({ "Mã NV": ma, "Họ và tên": ten, "Thực lĩnh": thucLinh });
const sheet = (rows) => RC.parseSheet([["Mã NV", "Họ và tên", "Thực lĩnh"]].concat(rows), null, { firstRow: 0 });
const run = (appRows, excelRows) => RC.compare(appRows, sheet(excelRows).rows);

test("U-RC-2W-01 ca bắt buộc: app có A và B, Excel chỉ có A khớp số tiền → báo B thiếu trong Excel dù chênh lệch của A = 0", () => {
  const r = run([app("A", "Nguyễn An", 1000000), app("B", "Trần Bình", 2000000)], [["A", "Nguyễn An", "1.000.000"]]);
  assert.equal(r.rows.filter((x) => x["Chênh lệch"] !== 0).length, 0, "A khớp, không chênh lệch");
  assert.deepEqual(r.thieuTrongExcel.map((x) => [x.ma, x.hoTen]), [["B", "Trần Bình"]]);
  assert.deepEqual(r.tongKet, { tongApp: 2, tongExcel: 1, daDoiChieu: 1, thieuTrongExcel: 1, khongKhopApp: 0, coChenhLech: 0 });
});

test("U-RC-2W-02 tổng kết: số người đã đối chiếu, thiếu mỗi bên, có chênh lệch (đếm theo người, không theo dòng chỉ tiêu)", () => {
  const appRows = [app("A", "An", 100), app("B", "Bình", 200), app("C", "Cường", 300), app("D", "Dũng", 400)];
  const r = run(appRows, [["A", "An", "100"], ["B", "Bình", "250"], ["X9", "Người lạ", "5"]]);
  assert.deepEqual(r.tongKet, { tongApp: 4, tongExcel: 3, daDoiChieu: 2, thieuTrongExcel: 2, khongKhopApp: 1, coChenhLech: 1 });
  assert.deepEqual(r.thieuTrongExcel.map((x) => x.ma), ["C", "D"]);
  assert.deepEqual(r.khongKhop.map((x) => [x.ma, x.loai]), [["X9", RC.LOAI.MA_KHONG_KHOP]]);
});

test("U-RC-2W-03 ca OLD01 vs A01: Excel báo 'Mã NV không khớp' VÀ app báo A01 thiếu trong Excel, kèm gợi ý cùng họ tên; không tính là dòng khớp", () => {
  const r = run([app("A01", "Lê Mai", 500)], [["OLD01", "Lê Mai", "500"]]);
  assert.equal(r.rows.length, 0); assert.equal(r.tongKet.daDoiChieu, 0);
  assert.equal(r.khongKhop[0].loai, RC.LOAI.MA_KHONG_KHOP);
  assert.deepEqual(r.thieuTrongExcel.map((x) => x.ma), ["A01"]);
  assert.match(r.thieuTrongExcel[0].ghiChu, /dòng 2.*cùng họ tên.*mã OLD01.*Mã NV không khớp/i);
});

test("U-RC-2W-04 mã trùng trong file: người của app có mã đó nằm ở 'thiếu trong Excel' kèm lý do; tên trùng nhiều người trong app cũng vậy", () => {
  let r = run([app("A", "An", 1)], [["A", "An", "1"], ["A", "An", "1"]]);
  assert.equal(r.tongKet.daDoiChieu, 0); assert.match(r.thieuTrongExcel[0].ghiChu, /mã A ở 2 dòng/);
  r = run([app("P1", "Phạm Tú", 1), app("P2", "Phạm Tú", 2)], [["", "Phạm Tú", "1"]]);
  assert.deepEqual(r.thieuTrongExcel.map((x) => x.ma), ["P1", "P2"]); assert.equal(r.khongKhop[0].loai, RC.LOAI.TEN_TRUNG_APP);
});

test("U-RC-2W-05 giữ quy tắc v2.0.23: Excel trống mã + tên duy nhất → khớp theo tên; số 0 đầu giữ nguyên chữ", () => {
  let r = run([app("A", "Đỗ Văn", 1000)], [["", "Đỗ Văn", "1000"]]);
  assert.equal(r.tongKet.daDoiChieu, 1); assert.equal(r.thieuTrongExcel.length, 0);
  r = run([app("0005", "Ông Năm", 7)], [["0005", "Ông Năm", "7"]]);
  assert.equal(r.tongKet.daDoiChieu, 1);
  r = run([app("0005", "Ông Năm", 7)], [["5", "Ông Năm", "7"]]);
  assert.equal(r.tongKet.daDoiChieu, 0, "mã 5 ≠ 0005");
});

test("U-RC-2W-06 ô tiền dạng chữ (v2.0.22) vẫn đọc đúng trong đối chiếu hai chiều", () => {
  const r = run([app("A", "An", 500000), app("B", "Bình", 1)], [["A", "An", "500.000"]]);
  assert.equal(r.rows.find((x) => x["Chỉ tiêu"] === "Thực lĩnh").Excel, 500000);
  assert.equal(r.tongKet.coChenhLech, 0); assert.equal(r.tongKet.thieuTrongExcel, 1);
});

test("U-RC-2W-07 giao diện và file xuất dùng chung kết quả: tổng kết, panel thiếu trong Excel, sheet TongKet/ThieuTrongExcel/KhongKhopNguoi/DoiChieu", () => {
  const src = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8").replace(/\r\n/g, "\n");
  const from = src.indexOf("  function tabDoiChieu("), end = src.indexOf("\n  }\n", src.indexOf("  function doiChieuSheets(") + 10) + 5;
  const screen = src.slice(from, end);
  assert.match(screen, /tk = cmp\.tongKet/); assert.match(screen, /thieuTrongExcelPanel\(cmp\)/); assert.match(screen, /doiChieuSheets\(cmp\)/);
  assert.match(screen, /Có trong app, thiếu trong Excel/); assert.match(screen, /Có trong Excel, không khớp app/);
  for (const name of ["TongKet", "ThieuTrongExcel", "KhongKhopNguoi", "DoiChieu"]) assert.match(screen, new RegExp('name: "' + name + '"'));
  assert.match(screen, /saveXlsx\("DoiChieu_" \+ kyKey\(st\.nam, st\.thang\) \+ "\.xlsx", doiChieuSheets\(cmp\)\)/);
  assert.doesNotMatch(screen, /if \(cmp\.rows\.length\) card\.appendChild\(btn\("⬇ Xuất Excel/, "xuất Excel không còn phụ thuộc có dòng lệch");
});
