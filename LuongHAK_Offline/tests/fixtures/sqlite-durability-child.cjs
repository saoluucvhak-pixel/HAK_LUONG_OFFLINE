"use strict";
// Tiến trình con cho tests/unit/sqlite-durability.test.js (chỉ đạo 003). Dữ liệu GIẢ.
//  commit-die <dir>        : lưu MỘT lần rồi tự SIGKILL NGAY khi lưu trả true (sau commit SQLite, trước mọi phản hồi/ghi tiếp) — mô phỏng chết trước khi giao diện nhận trả lời
//  close-loop <dir> <đầu>  : chốt kỳ liên tục (mỗi lần: snapshot chốt + nhật ký + bảng khác trong MỘT lần lưu); in SAVING/SAVED để cha kill bất kỳ lúc nào
//  wal-write <dir> <sync|delay> : (đã có kho v1 đã checkpoint) lưu v2 CHỈ nằm trong -wal, (sync: xuất data.json ngay), rồi SIGKILL
//  hold <dir>              : mở kho, in READY, giữ phiên mở (khóa phiên ghi) tới khi bị kill
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const CLS = require("../../core/payroll-close.js");
const [mode, dir, arg] = process.argv.slice(2);
if (process.env.HAK_SIM_CKPT === "1") { // MÔ PHỎNG phương án C (issue #91, 6c): checkpoint(TRUNCATE) sau mỗi giao dịch ghi — không phải hành vi sản phẩm hiện tại
  const store = require("../../main/sqlite-store.js"), realTx = store.tx;
  store.tx = (db, fn) => { const r = realTx(db, fn); db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); return r; };
}
const s = createSqliteStorage(dir, { exportDelayMs: 60000, exportSync: false });
const ld = s.load(); if (!ld.ok) { console.log("ERROR " + ld.error); process.exit(3); }
const d = ld.text ? JSON.parse(ld.text) : {};
if (mode === "commit-die") {
  d.nhanvien = (d.nhanvien || []).concat([{ "Mã NV": "SAU-COMMIT", "Họ và tên": "Lưu rồi chết" }]);
  console.log("SAVING");
  const r = s.save(JSON.stringify(d));
  if (r === true) process.kill(process.pid, "SIGKILL");
  console.log("ERROR " + r); process.exit(3);
} else if (mode === "close-loop") {
  const rows = [];
  for (let i = 0; i < 400; i++) rows.push({ "Mã NV": "NV" + String(i).padStart(4, "0"), "Họ và tên": "Người " + i, "Thực lĩnh": 10000000 + i, "Tổng thu nhập": 10000000 + i });
  for (let i = +arg || 1; i < (+arg || 1) + 100000; i++) {
    const ky = "2027-" + String(((i - 1) % 12) + 1).padStart(2, "0") + "-" + i; // khóa kỳ giả duy nhất mỗi vòng
    const snap = CLS.buildSnapshot(d, ky, { bangluong: rows, bhxh: [], tncn: [], canhbao: [] }, []);
    CLS.close(d, snap);
    d.auditlog = (d.auditlog || []).concat([{ luc: "2026-11-18T00:00:00.000Z", nguoi: "kiem-thu", thaoTac: "Chốt kỳ", chiTiet: ky }]);
    d.ttluong = (d.ttluong || []).concat([{ ky, trangThai: "đã chốt" }]);
    console.log("SAVING " + ky);
    const r = s.save(JSON.stringify(d)); if (r !== true) { console.log("ERROR " + String(r).slice(0, 200)); process.exit(3); }
    console.log("SAVED " + ky);
  }
} else if (mode === "wal-write") {
  d.nhanvien = (d.nhanvien || []).concat([{ "Mã NV": "CHI-CO-O-V2", "Họ và tên": "Chỉ có ở v2 (trong -wal)" }]);
  const r = s.save(JSON.stringify(d)); if (r !== true) { console.log("ERROR " + r); process.exit(3); }
  if (arg === "sync") s.syncJson(); // data.json = v2 trước khi chết (cửa sổ xuất đã đóng)
  console.log("SAVED"); process.kill(process.pid, "SIGKILL");
} else if (mode === "hold") {
  console.log("READY"); setInterval(() => {}, 1000);
}
