"use strict";
// Tiến trình con cho test kill thật khi KHÔI PHỤC TỪ BẢN CHỤP: tự SIGKILL đúng tại điểm nêu (sau-marker | truoc-doi-ten | sau-doi-ten). Dữ liệu GIẢ.
// Chạy bởi tests/unit/sqlite-snapshot-restore.test.js (bản chụp trong thư mục sao lưu) và fullbackup-snapshot.test.js (bản chụp trong gói Full Backup):
//   node sqlite-restore-kill.cjs <dir> <điểm> [gói Full Backup]
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const dir = process.argv[2], at = process.argv[3], pkg = process.argv[4];
const s = createSqliteStorage(dir, { exportDelayMs: 60000, testHook: (name) => { if (name === at) { console.log("KILL " + name); process.kill(process.pid, "SIGKILL"); } } });
const ld = s.load(); console.log("LOAD " + (ld.ok ? "ok" : "fail"));
const r = pkg ? s.restoreFromPackage(pkg, "kiem-thu", { tmpDir: dir }) : s.restoreFromSnapshot("kiem-thu");
console.log("DONE " + JSON.stringify(r).slice(0, 200));
