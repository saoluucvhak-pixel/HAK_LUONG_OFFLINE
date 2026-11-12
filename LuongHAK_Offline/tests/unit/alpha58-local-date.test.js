// alpha.58: Kiểm tra dữ liệu dùng ngày theo GIỜ MÁY (trước đây UTC — trước 7 giờ sáng giờ Việt Nam bị lùi 1 ngày)
"use strict";
process.env.TZ = "Asia/Ho_Chi_Minh"; // phải đặt trước khi tạo Date đầu tiên
const test = require("node:test");
const assert = require("node:assert/strict");
const INT = require("../../core/integrity.js");

const dbWith = (ngayCap) => ({ nhanthan: [{ "Mã NV": "A", "Họ tên nhân thân": "X", "Ngày cấp CCCD": ngayCap }] });
const future = (db, now) => INT.check(db, { now }).filter((i) => /Ngày cấp CCCD ở tương lai/.test(i.msg)).length;

// Dùng mốc năm 2030 để kết quả không phụ thuộc ngày chạy test.
test("01:00 sáng 10/03 giờ Việt Nam (UTC còn là 09/03): 'hôm nay' là 10/03", () => {
  const now = new Date("2030-03-09T18:00:00Z");
  assert.equal(now.getDate(), 10);
  assert.equal(future(dbWith("2030-03-09"), now), 0);
  assert.equal(future(dbWith("2030-03-10"), now), 0); // hôm nay theo giờ máy — bản cũ (UTC) báo nhầm là tương lai
  assert.equal(future(dbWith("2030-03-11"), now), 1); // ngày mai vẫn bị báo
});
test("không truyền now: vẫn chạy với ngày hiện tại của máy", () => {
  assert.equal(future(dbWith("2000-01-01")), 0);
  assert.equal(INT.check(dbWith("2999-01-01")).filter((i) => /tương lai/.test(i.msg)).length, 1);
});
