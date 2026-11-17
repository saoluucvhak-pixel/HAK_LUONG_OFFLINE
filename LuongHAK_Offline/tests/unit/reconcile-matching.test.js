"use strict";
// Đối chiếu bảng lương Excel khớp ĐÚNG NGƯỜI: có mã NV thì chỉ khớp theo mã; chỉ khớp theo họ tên khi Excel để trống mã. Dữ liệu giả.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const RC = require("../../core/reconcile.js");

const app = (ma, hoTen, thucLinh) => ({ "Mã NV": ma, "Họ và tên": hoTen, "Thực lĩnh": thucLinh, "Công chuẩn": 26 });
const ref = (dong, ma, hoTen, thucLinh) => ({ dong, ma, hoTen, values: { thucLinh } });

test("U-RC-MATCH-01 ca bắt buộc: Excel OLD01, app A01, họ tên và thực lĩnh giống nhau → 'Mã NV không khớp', không tính là dòng khớp", () => {
  const r = RC.compare([app("A01", "Nguyễn Văn An", 5000000)], [ref(7, "OLD01", "Nguyễn Văn An", 5000000)]);
  assert.equal(r.rows.length, 0, "không có dòng đối chiếu nào");
  assert.equal(r.khongKhop.length, 1);
  assert.equal(r.khongKhop[0].loai, RC.LOAI.MA_KHONG_KHOP);
  assert.equal(r.khongKhop[0].dong, 7); assert.equal(r.khongKhop[0].ma, "OLD01"); assert.equal(r.khongKhop[0].hoTen, "Nguyễn Văn An");
  assert.match(r.khongKhop[0].ghiChu, /A01 — Nguyễn Văn An/, "gợi ý mã trong app nhưng KHÔNG tự ghép");
  assert.deepEqual(r.nhom, { "Mã NV không khớp": 1 });
});

test("U-RC-MATCH-02 mã khớp thì so đúng người, kể cả khi họ tên trong Excel khác; không lẫn sang người cùng họ tên khác mã", () => {
  const apps = [app("A01", "Nguyễn Văn An", 5000000), app("A02", "Nguyễn Văn An", 6000000)];
  const r = RC.compare(apps, [ref(2, "A02", "Tên gõ khác", 6000000)]);
  assert.equal(r.khongKhop.length, 0);
  assert.deepEqual(r.rows.map((x) => [x["Mã NV"], x["Dòng Excel"], x["Chênh lệch"]]), [["A02", 2, 0]]);
});

test("U-RC-MATCH-03 chỉ khớp theo họ tên khi Excel để trống mã NV và tên khớp duy nhất (không phân biệt hoa thường/dấu)", () => {
  const apps = [app("A01", "Nguyễn Văn An", 5000000), app("B01", "Trần Thị Bình", 4000000)];
  const r = RC.compare(apps, [ref(2, "", "nguyen van an", 5000000), ref(3, "   ", "TRẦN THỊ BÌNH", 3900000)]);
  assert.equal(r.khongKhop.length, 0);
  assert.deepEqual(r.rows.map((x) => [x["Mã NV"], x["Chênh lệch"]]), [["A01", 0], ["B01", 100000]]);
});

test("U-RC-MATCH-04 tên trùng nhiều người trong app, tên trùng trong file không có mã, tên không có trong app: báo rõ, không đoán", () => {
  const apps = [app("A01", "Lê Văn Cường", 1), app("A02", "Lê Văn Cường", 2), app("C01", "Phạm Dũng", 3)];
  const r = RC.compare(apps, [ref(2, "", "Lê Văn Cường", 1), ref(3, "", "Phạm Dũng", 3), ref(4, "", "Phạm Dũng", 3), ref(5, "", "Người lạ", 9)]);
  assert.equal(r.rows.length, 0);
  const byDong = Object.fromEntries(r.khongKhop.map((x) => [x.dong, x]));
  assert.equal(byDong[2].loai, RC.LOAI.TEN_TRUNG_APP); assert.match(byDong[2].ghiChu, /A01, A02/);
  assert.equal(byDong[3].loai, RC.LOAI.TEN_TRUNG_FILE); assert.equal(byDong[4].loai, RC.LOAI.TEN_TRUNG_FILE);
  assert.equal(byDong[5].loai, RC.LOAI.KHONG_CO_APP);
});

test("U-RC-MATCH-05 mã NV trùng trong file: mọi dòng trùng đều không được đối chiếu, kể cả khi app có mã đó", () => {
  const r = RC.compare([app("A01", "Nguyễn Văn An", 5000000)], [ref(2, "A01", "Nguyễn Văn An", 5000000), ref(9, "A01", "Nguyễn Văn An", 1)]);
  assert.equal(r.rows.length, 0);
  assert.deepEqual(r.khongKhop.map((x) => [x.dong, x.loai]), [[2, RC.LOAI.MA_TRUNG_FILE], [9, RC.LOAI.MA_TRUNG_FILE]]);
  assert.match(r.khongKhop[0].ghiChu, /2 lần/);
});

test("U-RC-MATCH-06 mã có số 0 đầu dạng chữ được giữ; mã dạng số trong Excel không tự khớp mã có số 0 đầu; mã 'constructor' không làm hỏng", () => {
  const sheet = [["Mã NV", "Họ và tên", "Thực lĩnh"], ["007", "Người Bảy", "5.000.000"], [7, "Người Số", 6000000], [0, "Người Không", 1], ["constructor", "Mã lạ", 2], ["__proto__", "Mã lạ 2", 3]];
  const parsed = RC.parseSheet(sheet);
  assert.deepEqual(parsed.rows.map((x) => x.ma), ["007", "7", "0", "constructor", "__proto__"], "chữ giữ nguyên, số 0 không thành rỗng");
  const r = RC.compare([app("007", "Người Bảy", 5000000), app("0", "Người Không", 1)], parsed.rows);
  assert.deepEqual(r.rows.map((x) => x["Mã NV"]), ["007", "0"]);
  assert.deepEqual(r.khongKhop.filter((x) => x.loai === RC.LOAI.MA_KHONG_KHOP).map((x) => x.ma), ["7", "constructor", "__proto__"]);
});

test("U-RC-MATCH-07 số dòng Excel đúng theo vùng dữ liệu; ô tiền và công dạng chữ (đã sửa ở v2.0.22) vẫn đối chiếu đúng", () => {
  const sheet = [["BẢNG LƯƠNG"], ["Mã NV", "Họ và tên", "Công BT", "Thực lĩnh"], ["A01", "Nguyễn Văn An", "26,5", "5.250.000"], ["OLD9", "Nguyễn Văn An", "26,5", "5.250.000"]];
  const parsed = RC.parseSheet(sheet, null, { firstRow: 4 }); // vùng dữ liệu bắt đầu ở dòng Excel 5: tiêu đề báo cáo = dòng 5, dòng tiêu đề cột = dòng 6, hai người = dòng 7 và 8
  assert.deepEqual(parsed.rows.map((x) => x.dong), [7, 8]);
  const a = [{ "Mã NV": "A01", "Họ và tên": "Nguyễn Văn An", "Thực lĩnh": 5250000, "Công chuẩn": 26, _ct: { congBT: 26.5 } }];
  const r = RC.compare(a, parsed.rows);
  assert.deepEqual(r.rows.map((x) => [x["Dòng Excel"], x["Chỉ tiêu"], x["Excel"], x["App"], x["Chênh lệch"]]), [[7, "Công BT", 26.5, 26.5, 0], [7, "Thực lĩnh", 5250000, 5250000, 0]]);
  assert.deepEqual(r.khongKhop.map((x) => [x.dong, x.loai]), [[8, RC.LOAI.MA_KHONG_KHOP]]);
});

test("U-RC-MATCH-08 giao diện: truyền dòng đầu vùng dữ liệu, nhóm theo lý do, nêu số dòng + mã + họ tên và xuất cả ra Excel", () => {
  const src = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8").replace(/\r\n/g, "\n");
  const from = src.indexOf("  function tabDoiChieu("), to = src.indexOf("  function doiChieuSheets(");
  assert.ok(from > 0 && to > from);
  const screen = src.slice(from, src.indexOf("\n  }\n", to + 10) + 5);
  assert.match(screen, /decode_range\(/); assert.match(screen, /firstRow: firstRow/); assert.match(screen, /khongKhopPanel\(cmp\)/);
  assert.match(screen, /"Dòng Excel", "Mã NV", "Họ tên", "Loại", "Ghi chú"/);
  assert.match(screen, /Dòng " \+ \(x\.dong \|\| "\?"\) \+ " · Mã NV: "/);
  assert.match(screen, /Object\.keys\(RC\.LOAI\)/);
});
