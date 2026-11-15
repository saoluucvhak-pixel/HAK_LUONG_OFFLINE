"use strict";
// Kho bộ lọc đã lưu (localStorage "hak.sf.presets") bị lỗi hoặc do phiên bản khác ghi: KHÔNG ghi đè.
// Người dùng phải chủ động "Sao lưu kho cũ và tạo kho mới" (discardCorrupt) — đồng bộ với HAK_SMART_FILTER e99bb7e.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const SF = require("../../core/smart-filter.js");
const KEY = "hak.sf.presets";
const storageOf = (mem) => ({ getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } });
const state = () => SF.setField(SF.empty(), { id: "pb", label: "Phòng ban", type: "multi" }, ["Sản xuất"]);

test("U-SFC-01 kho khác phiên bản: lưu và xóa đều bị từ chối, nội dung kho giữ nguyên từng ký tự", () => {
  const newer = JSON.stringify({ schema: 99, screens: { nhansu: { "Của bản mới": { state: {}, savedAt: "" } } } });
  const mem = { [KEY]: newer }, P = SF.presets(storageOf(mem));
  assert.equal(P.isCorrupt(), true);
  const r = P.save("nhansu", "Thử", state());
  assert.equal(r.ok, false); assert.equal(r.corrupt, true);
  assert.equal(P.remove("nhansu", "Của bản mới"), false);
  assert.equal(mem[KEY], newer);
  assert.equal(Object.keys(mem).length, 1, "không tạo thêm khóa nào khi chưa được yêu cầu");
});
test("U-SFC-02 kho JSON hỏng: không ghi đè; discardCorrupt chép nguyên văn sang khóa .bak rồi mới tạo kho trống; sau đó lưu được", () => {
  const mem = { [KEY]: "{hỏng" }, P = SF.presets(storageOf(mem));
  assert.equal(P.save("nhansu", "Thử", state()).ok, false); assert.equal(mem[KEY], "{hỏng");
  assert.deepEqual(P.discardCorrupt(), { ok: true, backedUp: true, backupKey: KEY + ".bak" });
  assert.equal(mem[KEY + ".bak"], "{hỏng", "bản cũ còn nguyên");
  assert.deepEqual(JSON.parse(mem[KEY]), { schema: SF.SCHEMA, screens: {} });
  assert.equal(P.isCorrupt(), false);
  assert.deepEqual(P.save("nhansu", "Thử", state(), "2026-11-15T00:00:00Z"), { ok: true });
  assert.deepEqual(P.list("nhansu"), ["Thử"]);
});
test("U-SFC-03 kho bình thường hoặc chưa có: discardCorrupt không làm gì, không tạo bản sao lưu", () => {
  const mem = {}, P = SF.presets(storageOf(mem));
  assert.deepEqual(P.discardCorrupt(), { ok: true, backedUp: false }); assert.deepEqual(mem, {});
  P.save("nhansu", "A", state(), "2026-11-15T00:00:00Z"); const before = mem[KEY];
  assert.deepEqual(P.discardCorrupt(), { ok: true, backedUp: false }); assert.equal(mem[KEY], before); assert.equal(KEY + ".bak" in mem, false);
});
test("U-SFC-04 không sao lưu được (đĩa đầy): báo lỗi, kho cũ không bị đụng", () => {
  const mem = { [KEY]: "{hỏng" }, P = SF.presets({ getItem: (k) => mem[k] ?? null, setItem: () => { throw new Error("đầy"); } });
  assert.equal(P.discardCorrupt().ok, false); assert.equal(mem[KEY], "{hỏng");
});
test("U-SFC-05 giao diện: bảng Bộ lọc đã lưu báo kho lỗi và chỉ tạo kho mới khi người dùng bấm nút", () => {
  const ui = fs.readFileSync(path.join(__dirname, "../../ui/smart-filter.js"), "utf8");
  assert.match(ui, /if \(ps\.isCorrupt\(\)\) \{/);
  assert.match(ui, /Sao lưu kho cũ và tạo kho mới/);
  assert.equal(ui.split("ps.discardCorrupt()").length, 2, "discardCorrupt chỉ được gọi ở một chỗ: trong nút bấm");
  assert.doesNotMatch(ui, /Dùng discardCorrupt\(\)/, "không hiện tên hàm cho người dùng");
});
