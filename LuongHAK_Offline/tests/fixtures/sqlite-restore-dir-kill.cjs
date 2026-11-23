"use strict";
// Tiến trình con cho test kill thật khi KHÔI PHỤC TỪ ỨNG VIÊN (thư mục SQLite đã chọn): node sqlite-restore-dir-kill.cjs <dir> <điểm> <id>
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const dir = process.argv[2], at = process.argv[3], id = process.argv[4];
const s = createSqliteStorage(dir, { exportDelayMs: 60000, testHook: (name) => { if (name === at) { console.log("KILL " + name); process.kill(process.pid, "SIGKILL"); } } });
const ld = s.load(); console.log("LOAD " + (ld.ok ? "ok" : "fail"));
const r = s.restoreCandidate("kiem-thu", id);
console.log("DONE " + JSON.stringify(r).slice(0, 200));
