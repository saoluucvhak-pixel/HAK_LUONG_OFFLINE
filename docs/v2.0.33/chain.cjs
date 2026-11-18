// Đo chuỗi ghi của tiến trình chính (policy → kho năm → kho SQLite) với dữ liệu GIẢ. Chạy: node docs/v2.0.33/chain.cjs 5000 [parsed]
// "parsed" = dùng đường mới (phân tích một lần, v2.0.33); không có = đường cũ (phân tích lại ở từng bước).
"use strict";
const path = require("path"), fs = require("fs"), os = require("os");
const R = path.resolve(__dirname, "../../LuongHAK_Offline") + path.sep;
const { regressionDataset } = require(R + "tests/fixtures/build.js");
const { createSqliteStorage } = require(R + "main/sqlite-storage.js");
const { createPolicy } = require(R + "main/write-policy.js");
const { createYearArchive } = require(R + "main/year-archive.js");
const N = +process.argv[2] || 5000, USE = process.argv[3] === "parsed", db = regressionDataset(N);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chain-"));
const storage = createSqliteStorage(dir, { exportSync: false }), years = createYearArchive({ storage, dir });
const policy = createPolicy({ readText: () => { const l = storage.load(); return l && l.ok ? l.text : null; }, sigOf: () => storage.sig(), gate: null });
const who = { user: { tenDangNhap: "admin" }, perms: null };
storage.save(JSON.stringify(db));
const tm = (f) => { const t = process.hrtime.bigint(); const r = f(); return [r, Number(process.hrtime.bigint() - t) / 1e6]; };
const rows = [];
for (let i = 0; i < 9; i++) {
  db.nhanvien[i]["Họ và tên"] = "Sửa " + i;
  const text = JSON.stringify(db);
  const [parsed, p0] = tm(() => (USE ? JSON.parse(text) : null)); // đường mới: 1 lần phân tích ở main (tính vào tổng)
  const [v, a] = tm(() => policy.check(text, who, USE ? { parsed } : {}));
  const [, b] = tm(() => years.checkWrite(text, false, USE ? parsed : null));
  const [r, c] = tm(() => storage.save(text, USE ? parsed : undefined));
  if (v.ok && r === true) policy.commit(); else throw new Error("không lưu được: " + (v.error || r));
  rows.push([p0, a, b, c]);
}
const med = (k) => rows.slice(2).map((r) => r[k]).sort((x, y) => x - y)[Math.floor((rows.length - 2) / 2)];
console.log("N=" + N, USE ? "(đường mới)" : "(đường cũ)", "ms: parse", med(0).toFixed(0), "policy", med(1).toFixed(0), "years", med(2).toFixed(0), "save", med(3).toFixed(0), "TỔNG", (med(0) + med(1) + med(2) + med(3)).toFixed(0));
storage.close();
