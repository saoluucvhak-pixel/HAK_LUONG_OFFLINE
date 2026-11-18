"use strict";
// Script CHỈ ĐỌC liệt kê Suất cơm đã lưu không phải số (009-1): đúng dòng, đúng mã thoát, KHÔNG sửa tệp.
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path"), cp = require("node:child_process");
const SCRIPT = path.resolve(__dirname, "../../../docs/v2.0.40/liet-ke-suat-com-khong-phai-so.cjs");
const run = (f) => cp.spawnSync(process.execPath, [SCRIPT, f], { encoding: "utf8" });
const tmp = (obj) => { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "hak-liet-ke-")), "data.json"); fs.writeFileSync(f, typeof obj === "string" ? obj : JSON.stringify(obj)); return f; };

test("U-SCOM-01 liệt kê đúng các dòng suất cơm không phải số (kèm kỳ, ngày, mã NV, giá trị, kỳ đã chốt), thoát 1, không sửa tệp", () => {
  const db = { kyluong: [{ ky: "2026-09" }], tiencom: [{ "Ngày": "2026-09-05", "Mã NV": "A", "Số suất cơm": "hai" }, { "Ngày": "2026-10-05", "Mã NV": "B", "Số suất cơm": "2" }, { "Ngày": "2026-10-06", "Mã NV": "C", "Số suất cơm": "1,5" }, { "Ngày": "2026-10-07", "Mã NV": "D", "Số suất cơm": "ba suất" }, { "Ngày": "2026-10-08", "Mã NV": "E", "Số suất cơm": "" }] };
  const f = tmp(db), before = fs.readFileSync(f, "utf8"), r = run(f);
  assert.equal(r.status, 1); assert.match(r.stdout, /2 dòng có 'Số suất cơm' không phải số/);
  assert.match(r.stdout, /dòng 1 · kỳ 2026-09 \[ĐÃ CHỐT — không tự sửa\] · ngày 2026-09-05 · NV A · giá trị "hai"/); assert.match(r.stdout, /dòng 4 · kỳ 2026-10 · ngày 2026-10-07 · NV D · giá trị "ba suất"/);
  assert.doesNotMatch(r.stdout, /NV B|NV C|NV E/); assert.equal(fs.readFileSync(f, "utf8"), before, "không sửa tệp");
});
test("U-SCOM-02 dữ liệu sạch → thoát 0; tệp hỏng/thiếu → thoát 2", () => {
  assert.equal(run(tmp({ tiencom: [{ "Ngày": "2026-10-05", "Mã NV": "B", "Số suất cơm": "2" }] })).status, 0);
  assert.equal(run(tmp({})).status, 0);
  assert.equal(run(tmp("không phải JSON")).status, 2);
  assert.equal(cp.spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" }).status, 2);
});
