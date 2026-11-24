// v2.1.11 (A6-03, phương án (b)): "Danh sách chuyển khoản" của màn Tính lương trừ số đã chi, kiểm tài khoản, ghi rõ TẠM TÍNH khi kỳ chưa chốt.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const T = require("../../ui/transfer-list.js");
const PL = require("../../core/payment-ledger.js");
const bl = () => [
  { "Mã NV": "A", "Họ và tên": "An", "HTTT": "Chuyển khoản", "Số tài khoản": "0071000123457", "Ngân hàng": "Vietcombank", "Thực lĩnh": 10000000 },
  { "Mã NV": "B", "Họ và tên": "Bình", "HTTT": "Chuyển khoản", "Số tài khoản": "", "Ngân hàng": "", "Thực lĩnh": 8000000 },
  { "Mã NV": "C", "Họ và tên": "Chi", "HTTT": "Chuyển khoản", "Số tài khoản": "0071000123457", "Ngân hàng": "ACB", "Thực lĩnh": 5000000 },
  { "Mã NV": "D", "Họ và tên": "Dũng", "HTTT": "Tiền mặt", "Thực lĩnh": 7000000 },
  { "Mã NV": "E", "Họ và tên": "Em", "HTTT": "Chuyển khoản", "Số tài khoản": "123456789", "Ngân hàng": "BIDV", "Thực lĩnh": 0 }];
const opts = (chot, lines) => ({ chot, lines: lines || [], outstanding: PL.outstanding, isChuyenKhoan: (h) => PL.hinhThucCua(h) === PL.HT.CK });
const line = (ma, ky, tien, tt) => ({ "Kỳ": ky, "Mã NV": ma, "Số tiền": tien, "Trạng thái": tt, "Hình thức": "Chuyển khoản", "Số chứng từ": "CT-" + ma });

test("U-TRF-01 chỉ người chuyển khoản có thực lĩnh > 0; số tiền = thực lĩnh khi chưa chi; có cột Đã thanh toán / Đang chờ chi / Kiểm tra", () => {
  const r = T.build(bl(), "2026-10", opts(true));
  assert.deepEqual(r.rows.map((x) => x["Mã NV"]), ["A", "B", "C"]); assert.equal(r.rows[0]["Số tiền"], 10000000); assert.equal(r.rows[0]["Đã thanh toán"], 0);
  assert.deepEqual(r.cols, T.COLS); assert.equal(r.name, "ChuyenKhoan"); assert.equal(r.tam, false);
});
test("U-TRF-02 đã chi một phần / đang chờ chi được TRỪ; đã chi đủ thì không còn dòng (không chuyển trùng)", () => {
  const sum = (res) => res.rows.reduce((s, x) => s + x["Số tiền"], 0);
  const lines = [line("A", "2026-10", 4000000, "Đã thanh toán"), line("C", "2026-10", 5000000, "Đã thanh toán")];
  const r = T.build(bl(), "2026-10", opts(true, lines)); assert.deepEqual(r.rows.map((x) => x["Mã NV"]), ["A", "B"]); assert.equal(r.rows[0]["Số tiền"], 6000000); assert.equal(r.rows[0]["Đã thanh toán"], 4000000);
  assert.equal(sum(r), 6000000 + 8000000, "tổng đề nghị chi = phần còn lại");
  const w = T.build(bl(), "2026-10", opts(true, [line("A", "2026-10", 3000000, "Chờ chi")])); assert.equal(w.rows[0]["Số tiền"], 7000000); assert.equal(w.rows[0]["Đang chờ chi"], 3000000);
  const other = T.build(bl(), "2026-10", opts(true, [line("A", "2026-09", 10000000, "Đã thanh toán")])); assert.equal(other.rows[0]["Số tiền"], 10000000, "chi của kỳ khác không trừ");
});
test("U-TRF-03 cột Kiểm tra: thiếu/sai STK, thiếu ngân hàng, trùng STK; cảnh báo số dòng cần sửa", () => {
  const r = T.build(bl(), "2026-10", opts(true)); const by = Object.fromEntries(r.rows.map((x) => [x["Mã NV"], x["Kiểm tra"]]));
  assert.equal(by.A, "Đạt"); assert.match(by.B, /CẦN SỬA: thiếu số tài khoản; thiếu ngân hàng/); assert.match(by.C, /trùng số tài khoản với A/);
  assert.ok(r.warnings.some((x) => /2 dòng cần sửa/.test(x)));
  const bad = bl(); bad[0]["Số tài khoản"] = "12"; assert.match(T.build(bad, "2026-10", opts(true)).rows[0]["Kiểm tra"], /số tài khoản không hợp lệ/);
});
test("U-TRF-04 kỳ CHƯA chốt: tên sheet _TAM, cột Trạng thái 'TẠM TÍNH', cảnh báo xem trước", () => {
  const r = T.build(bl(), "2026-10", opts(false)); assert.equal(r.name, "ChuyenKhoan_TAM"); assert.equal(r.tam, true); assert.deepEqual(r.cols, T.COLS_TAM);
  assert.ok(r.rows.every((x) => /TẠM TÍNH/.test(x["Trạng thái"]))); assert.ok(r.warnings.some((x) => /chưa chốt/.test(x)));
});
test("U-TRF-05 excelSheets (app-src/17-chot-ky.js) dùng HAKUI.transferList; index.html nạp ui/transfer-list.js", () => {
  const app = fs.readFileSync(path.join(__dirname, "../../app-src/17-chot-ky.js"), "utf8"), html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8");
  assert.match(app, /HAKUI\.transferList\.build\(r\.bangluong, ky/); assert.match(html, /<script src="ui\/transfer-list\.js"><\/script>/);
});
