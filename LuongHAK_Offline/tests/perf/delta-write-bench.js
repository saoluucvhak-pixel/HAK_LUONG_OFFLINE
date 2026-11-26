// Đo chuỗi ghi với dữ liệu giả. structuredClone mô phỏng sao chép payload, không đo IPC/Electron.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { performance } = require("node:perf_hooks");
const { regressionDataset } = require("../fixtures/build.js");
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const { createPolicy } = require("../../main/write-policy.js");
const { createYearArchive } = require("../../main/year-archive.js");

const count = 5000, rounds = 20;
const baseline = regressionDataset(count);
const who = { user: { tenDangNhap: "admin" }, perms: null };

function measure(useDelta) {
  const db = structuredClone(baseline);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bench-delta-"));
  const storage = createSqliteStorage(dir, { exportSync: false });
  const years = createYearArchive({ storage, dir });
  const policy = createPolicy({
    readText: () => storage.load().text,
    readObj: () => storage.currentDoc(),
    sigOf: () => storage.sig()
  });
  const times = [];
  try {
    assert.equal(storage.save(JSON.stringify(db)), true);
    for (let i = 0; i < rounds; i++) {
      const name = "Sửa " + i;
      db.nhanvien[i]["Họ và tên"] = name;
      db.auditlog = db.auditlog || [];
      db.auditlog.push({ thaoTac: "sua-nv", chiTiet: String(i) });
      const before = storage.currentDoc().doc, revision = storage.sig();
      assert.notEqual(before.nhanvien[i]["Họ và tên"], name);
      const start = performance.now();
      if (useDelta) {
        const packet = structuredClone({ tables: { nhanvien: db.nhanvien, auditlog: db.auditlog }, baseSig: revision });
        const next = { ...before, ...packet.tables };
        const checked = policy.check("", who, { parsed: next });
        assert.equal(checked.ok, true, checked.error);
        years.checkWrite("", false, next);
        const result = storage.saveDelta(packet);
        assert.ok(result.ok && result.written > 0, result.error || "Delta không ghi dòng nào");
      } else {
        const text = JSON.stringify(db), parsed = JSON.parse(text);
        const checked = policy.check(text, who, { parsed });
        assert.equal(checked.ok, true, checked.error);
        years.checkWrite(text, false, parsed);
        assert.equal(storage.save(text, parsed, policy.rowsFor(parsed)), true);
      }
      policy.commit();
      times.push(performance.now() - start);
      assert.notEqual(storage.sig(), revision);
      assert.equal(storage.currentDoc().doc.nhanvien[i]["Họ và tên"], name);
    }
    const sorted = times.slice(2).sort((a, b) => a - b);
    const percentile = p => Number(sorted[Math.ceil(sorted.length * p) - 1].toFixed(2));
    return { p50: percentile(0.5), p95: percentile(0.95), roundsVerified: rounds };
  } finally {
    storage.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

console.log(JSON.stringify({ platform: process.platform, node: process.version, employees: count, full: measure(false), delta: measure(true) }, null, 2));
