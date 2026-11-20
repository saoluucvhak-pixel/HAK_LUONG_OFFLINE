// T-01 (rà soát 5 agent): biểu ngữ "Kiểm tra tất cả bản sao lưu" phải đếm bản hỏng theo TRẠNG THÁI THÔ (row.b.status), không theo chữ hiển thị. Dữ liệu giả.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const APP = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8");
function fn() {
  const i = APP.indexOf("// BK-BAD-BEGIN"), j = APP.indexOf("// BK-BAD-END"); if (i < 0 || j < i) return null;
  const c = {}; vm.createContext(c); vm.runInContext(APP.slice(i, j) + "\nthis.f = countBadBackups;", c); return c.f;
}
const STATUS = { ok: "✓ Nguyên vẹn (SHA-256)", mismatch: "✕ HỎNG / bị sửa", invalid: "✕ Không đọc được" };
const row = (st) => ({ kind: "json", status: st ? STATUS[st] : "—", b: { status: st } });
test("U-BKV-01 đếm bản hỏng: mismatch + invalid tính, ok/chưa kiểm/hàng SQLite (không có .b) không tính", () => {
  const f = fn(); assert.ok(f, "thiếu hàm countBadBackups (mốc BK-BAD-BEGIN/END) trong app.js");
  assert.equal(f([row("ok"), row("mismatch"), row("invalid"), row(""), { kind: "sqlite", status: "✓ đã kiểm" }]), 2);
  assert.equal(f([row("ok"), { kind: "sqlite", status: "x" }]), 0);
});
test("U-BKV-02 màn Sao lưu dùng countBadBackups cho biểu ngữ (không còn so chuỗi hiển thị với 'mismatch')", () => {
  const src = fs.readFileSync(path.join(__dirname, "../../app-src/25-khoi-phuc-kiem-tra.js"), "utf8");
  assert.ok(!/list\.filter\(function \(b\) \{ return b\.status === "mismatch"/.test(src), "vẫn đếm theo chữ hiển thị");
  assert.match(src, /countBadBackups\(list\)/);
});
