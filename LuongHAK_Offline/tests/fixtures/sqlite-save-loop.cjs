"use strict";
// Tiến trình con cho test kill thật: lưu liên tục các "phiên bản" i của tài liệu. Mỗi phiên bản ghi CÙNG LÚC hai bảng (nhanvien và hopdong) cùng nhãn i,
// nên nếu SQLite không nguyên tử thì sau khi bị kill sẽ thấy hai bảng lệch nhãn. In "SAVING i" trước khi lưu và "SAVED i" sau khi lưu trả true.
// Dữ liệu GIẢ. Chạy bởi tests/unit/sqlite-crash-real.test.js.
const path = require("node:path");
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const { regressionDataset } = require("./build.js");
const dir = process.argv[2], N = +process.argv[3] || 1500, start = +process.argv[4] || 1;
const s = createSqliteStorage(dir, { exportDelayMs: 60000 });
const loaded = s.load(); let d;
if (loaded.ok && loaded.text) d = JSON.parse(loaded.text); else { d = regressionDataset(N); }
const tag = (i) => { d.nhanvien.forEach((r) => { r["Nhãn lưu"] = i; }); d.hopdong.forEach((r) => { r["Nhãn lưu"] = i; }); };
for (let i = start; i < start + 100000; i++) {
  tag(i); console.log("SAVING " + i);
  const r = s.save(JSON.stringify(d));
  if (r !== true) { console.log("ERROR " + String(r).slice(0, 200)); process.exit(3); }
  console.log("SAVED " + i);
}
void path;
