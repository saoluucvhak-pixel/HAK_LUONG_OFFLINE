// F01: bộ lọc phòng ban của màn nhập liệu phải theo NGÀY của từng dòng, không theo tổ hiện tại.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const HR = require("../../hr.js");
const D = require("../../ui/input-dept.js");
const { baseDb } = require("../fixtures/build.js");

// A: tổ 02.01 đến 31/10, chuyển 02.02 từ 01/11/2026. B: luôn 02.01. C: hợp đồng vào làm 15/10 (phụ lục đầu từ 15/10).
function fixture() {
  const db = baseDb();
  db.nhanvien = ["A", "B", "C"].map((ma) => ({ "Mã NV": ma, "Họ và tên": "Người " + ma, "Trạng thái": "Đang làm việc" }));
  db.hopdong = [{ "Mã NV": "A", "Số HĐLĐ": "HA", "Ngày vào làm": "2025-01-01" }, { "Mã NV": "B", "Số HĐLĐ": "HB", "Ngày vào làm": "2025-01-01" }, { "Mã NV": "C", "Số HĐLĐ": "HC", "Ngày vào làm": "2026-10-15" }];
  const pl = (ma, so, tu, pb) => ({ "Mã NV": ma, "Số HĐLĐ": so, "Hiệu lực từ": tu, "Phòng ban": pb, "Mã lương": "TG1", "Lương cơ bản": "6000000" });
  db.chitiethd = [pl("A", "HA", "2025-01-01", "02.01"), pl("A", "HA", "2026-11-01", "02.02"), pl("B", "HB", "2025-01-01", "02.01"), pl("C", "HC", "2026-10-15", "02.03")];
  return db;
}
// Cách CŨ (trước sửa): một bản đồ tổ HIỆN TẠI cho mọi dòng — giữ ở đây để chứng minh lỗi đã tái hiện và để so sánh.
const oldMap = (db) => { const ix = HR.buildIndex(db), m = {}; db.nhanvien.forEach((n) => { m[n["Mã NV"]] = HR.hienHanh(db, n["Mã NV"], null, ix).pb || ""; }); return m; };
// Lọc đúng như inputPass: tổ trong tập đã chọn
const visible = (pbOf, filter, rows) => rows.filter((r) => filter.includes(pbOf(r))).map((r) => r.id);

test("U-F01-01 tái hiện lỗi cũ: tạm ứng 02/10 của A bị ẩn khi lọc tổ 02.01 (tra tổ hiện tại = 02.02)", () => {
  const db = fixture(), cu = oldMap(db), rows = [{ id: "TU-1021", ma: "A", ngay: "2026-10-02" }];
  assert.equal(cu.A, "02.02", "tổ hiện tại của A là 02.02");
  assert.deepEqual(visible((r) => cu[r.ma], ["02.01"], rows), [], "lỗi cũ: chứng từ tháng 10 biến mất khi lọc tổ 02.01");
});

test("U-F01-02 sau sửa: kỳ trước chuyển tổ thấy ở tổ 02.01, kỳ sau chuyển tổ thấy ở tổ 02.02", () => {
  const db = fixture(), res = D.create(db, HR);
  const rows = [{ id: "TU-1021", ma: "A", ngay: "2026-10-02" }, { id: "TU-1101", ma: "A", ngay: "2026-11-02" }, { id: "TU-B", ma: "B", ngay: "2026-11-02" }];
  const at = (r) => res.at(r.ma, r.ngay).pb;
  assert.deepEqual(visible(at, ["02.01"], rows), ["TU-1021", "TU-B"]);
  assert.deepEqual(visible(at, ["02.02"], rows), ["TU-1101"]);
});

test("U-F01-03 khoảng lọc băng qua ngày chuyển tổ: mỗi dòng theo tổ của đúng ngày; ngày 31/10 và 01/11 sát mốc", () => {
  const db = fixture(), res = D.create(db, HR);
  const days = ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"];
  assert.deepEqual(days.map((d) => res.at("A", d).pb), ["02.01", "02.01", "02.02", "02.02"]);
  const span = days.map((d) => ({ id: d, ma: "A", ngay: d }));
  assert.deepEqual(visible((r) => res.at(r.ma, r.ngay).pb, ["02.01"], span), ["2026-10-30", "2026-10-31"]);
  assert.deepEqual(visible((r) => res.at(r.ma, r.ngay).pb, ["02.01", "02.02"], span).length, 4, "chọn cả hai tổ thì đủ 4 dòng, không dòng nào biến mất");
});

test("U-F01-04 thiếu căn cứ lịch sử: không có ngày, ngày trước hợp đồng/phụ lục đầu → tổ rỗng, KHÔNG gán tổ hiện tại", () => {
  const db = fixture(), res = D.create(db, HR);
  assert.deepEqual(res.at("A", ""), { pb: "", basis: "no-date" });
  assert.deepEqual(res.at("A", undefined), { pb: "", basis: "no-date" });
  assert.deepEqual(res.at("C", "2026-10-01"), { pb: "", basis: "missing" }, "C chưa vào làm ngày 01/10: không lấy tổ 02.03 hiện tại");
  assert.equal(res.at("C", "2026-10-15").pb, "02.03");
  assert.deepEqual(res.at("ZZ", "2026-10-02"), { pb: "", basis: "missing" }, "mã lạ");
});

test("U-F01-05 kết quả không phụ thuộc thứ tự dòng phụ lục và không đổi dữ liệu gốc", () => {
  const db = fixture(), before = JSON.stringify(db);
  const a = D.create(db, HR).at("A", "2026-10-02").pb;
  db.chitiethd.reverse();
  const b = D.create(db, HR).at("A", "2026-10-02").pb;
  db.chitiethd.reverse();
  assert.equal(a, "02.01"); assert.equal(b, "02.01"); assert.equal(JSON.stringify(db), before);
});

test("U-F01-06 không cần bảng lương: chạy được khi không có công thức/bảng lương và không đọc quyền xem lương", () => {
  const db = fixture(); delete db.chamcong; delete db.congthuc;
  assert.doesNotThrow(() => D.create(db, HR).at("A", "2026-10-02"));
  const src = require("node:fs").readFileSync(require.resolve("../../ui/input-dept.js"), "utf8");
  assert.ok(!/payroll|bangluong|kqKy/.test(src), "module tra tổ không phụ thuộc tính lương");
});
