// v2.1.19 (A6-14 / Q10): báo cáo Bảo hiểm chi tiết có thêm Số sổ BHXH và Ngày sinh (để đối chiếu/kê khai). Chỉ GHÉP thêm cột theo Mã NV; không đổi số tiền.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../../ui/bh-person-fields.js");
const rows = () => [{ "STT": 1, "Mã NV": "NV01", "Họ và tên": "An", "Phòng ban": "P1", "Cộng BH NLĐ đóng": 100 }, { "STT": 2, "Mã NV": "NV02", "Họ và tên": "Bình", "Phòng ban": "P1", "Cộng BH NLĐ đóng": 200 }, { "STT": "", "Mã NV": "", "Họ và tên": "TỔNG CỘNG (2 người)", "Cộng BH NLĐ đóng": 300, _isTotal: true }];
const staff = [{ "Mã nhân viên": "NV01", "Số sổ BHXH": "0123456789" }, { "Mã nhân viên": "NV02", "Số sổ BHXH": "" }];
const canhan = [{ "Mã NV": "NV01", "Ngày sinh": "1990-03-15", "Hiệu lực từ": "2020-01-01" }, { "Mã NV": "NV01", "Ngày sinh": "1990-03-16", "Hiệu lực từ": "2026-05-01" }, { "Mã NV": "NV02", "Ngày sinh": "1985-12-01", "Hiệu lực từ": "2030-01-01" }];

test("U-BHP-01 thêm 2 cột ngay sau 'Họ và tên'; lấy Số sổ từ danh sách tính lương, Ngày sinh từ hồ sơ cá nhân hiệu lực đến cuối kỳ", () => {
  const out = B.enrich(rows(), staff, canhan, "2026-10-31");
  assert.deepEqual(Object.keys(out[0]).slice(0, 6), ["STT", "Mã NV", "Họ và tên", "Số sổ BHXH", "Ngày sinh", "Phòng ban"]);
  assert.equal(out[0]["Số sổ BHXH"], "0123456789"); assert.equal(out[0]["Ngày sinh"], "16/03/1990", "bản hiệu lực mới nhất ≤ cuối kỳ, hiển thị dd/mm/yyyy");
  assert.equal(out[1]["Số sổ BHXH"], ""); assert.equal(out[1]["Ngày sinh"], "", "bản hiệu lực SAU cuối kỳ không dùng");
});
test("U-BHP-02 không đổi số tiền; dòng tổng giữ cờ _isTotal và có 2 ô trống; không sửa mảng gốc", () => {
  const src = rows(), snap = JSON.stringify(src), out = B.enrich(src, staff, canhan, "2026-10-31");
  assert.equal(JSON.stringify(src), snap); assert.equal(out[2]["Cộng BH NLĐ đóng"], 300); assert.equal(out[2]._isTotal, true); assert.equal(out[2]["Số sổ BHXH"], ""); assert.equal(out[1]["Cộng BH NLĐ đóng"], 200);
});
test("U-BHP-03 thiếu dữ liệu: không có staff/canhan → 2 cột rỗng; Mã NV không có trong nguồn → rỗng; thiếu Số sổ được đếm để cảnh báo", () => {
  const out = B.enrich(rows(), null, null, "2026-10-31"); assert.ok(out.every((r) => r["Số sổ BHXH"] === "" && r["Ngày sinh"] === ""));
  assert.equal(B.missing(B.enrich(rows(), staff, canhan, "2026-10-31")).soSo, 1, "NV02 thiếu Số sổ"); assert.equal(B.missing(B.enrich(rows(), staff, canhan, "2026-10-31")).ngaySinh, 1);
});
test("U-BHP-04 báo cáo bảo hiểm (tabBaoCaoLuong) gọi HAKUI.bhPersonFields.enrich; index.html nạp ui/bh-person-fields.js", () => {
  const fs = require("node:fs"), path = require("node:path");
  assert.match(fs.readFileSync(path.join(__dirname, "../../app-src/screens/tabBaoCaoLuong.js"), "utf8"), /HAKUI\.bhPersonFields\.enrich\(/); assert.match(fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8"), /ui\/bh-person-fields\.js/);
});
