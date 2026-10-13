"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("fs"), os = require("os"), path = require("path");
const S = require("../fixtures/synth-digits.js"), F = require("../../core/ocr-learning/features.js"), L = require("../../core/ocr-learning/library.js");
const { createStore } = require("../../main/ocr-library.js");
const bb = (a, b, c, d) => ({ x0: a, y0: b, x1: c, y1: d });
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "ocrlib-"));
function img(label, seed) { const r = S.render(label, S.prng(seed)); return r; }
function P(label, seed, over) { const im = img(label, seed); return Object.assign({ raw: im.g, clean: im.g, w: im.w, h: im.h, cellType: "digit", docId: "DOC-1", page: 1, bbox: bb(10, 10, 40, 60), employeeId: "NV1", ky: "2026-09", before: "", after: label, ocrValue: "", user: "u1", mode: "so" }, over || {}); }

test("U-OCRL-01 đặc trưng: cùng nhãn giống nhau hơn khác nhãn; ô trống bị nhận ra", () => {
  const a = F.extract(img("1", 1).g, 48, 64), b = F.extract(img("1", 2).g, 48, 64), c = F.extract(img("8", 3).g, 48, 64);
  assert.equal(a.vec.length, F.DIM);
  assert.ok(F.similarity(a.vec, b.vec) > F.similarity(a.vec, c.vec));
  assert.equal(F.extract(new Uint8Array(48 * 64).fill(240), 48, 64).blank, true);
});

test("U-OCRL-02 sửa 1→7→1: giữ lịch sử, chỉ mẫu nhãn cuối còn hiệu lực", () => {
  const st = createStore(tmp());
  st.record(P("1", 1, { before: "", after: "1" }));
  st.record(P("7", 2, { before: "1", after: "7" }));
  st.record(P("1", 3, { before: "7", after: "1" }));
  const all = st.lib.list();
  assert.equal(all.length, 3);
  assert.equal(all.filter((s) => s.status === "PENDING_APPROVAL").length, 1);
  assert.equal(all.filter((s) => s.status === "SUPERSEDED").length, 2);
  assert.equal(st.lib.edits().length, 3);
});

test("U-OCRL-03 duyệt bảng: PENDING→VERIFIED; ký hiệu chưa rõ loại nhãn (UNKNOWN) không tự học", () => {
  const st = createStore(tmp());
  st.record(P("5", 1));
  st.record(P("x", 2, { after: "X", mode: "mark", bbox: bb(60, 10, 90, 60) }));
  const r = st.approve({ docId: "DOC-1", user: "u2" });
  assert.equal(r.verified, 1); assert.equal(r.skippedUnknownKind, 1);
  assert.equal(st.lib.list({ status: "VERIFIED" }).length, 1);
});

test("U-OCRL-04 không có ảnh nguồn: chỉ ghi sự kiện sửa, không tạo mẫu; không đổi giá trị: không ghi gì", () => {
  const st = createStore(tmp());
  const p = P("3", 1); delete p.raw; delete p.clean;
  st.record(p); assert.equal(st.lib.size(), 0); assert.equal(st.lib.edits().length, 1);
  st.record(P("3", 1, { before: "3", after: "3" })); assert.equal(st.lib.edits().length, 1);
});

test("U-OCRL-05 ảnh trùng byte không lưu thêm; tải lại từ đĩa giữ nguyên trạng thái", () => {
  const dir = tmp(), st = createStore(dir);
  st.record(P("2", 5, { bbox: bb(1, 1, 2, 2) })); st.record(P("2", 5, { bbox: bb(3, 3, 4, 4) }));
  assert.equal(st.lib.size(), 1);
  st.approve({ docId: "DOC-1" });
  const st2 = createStore(dir); st2.load();
  assert.equal(st2.lib.size(), 1); assert.equal(st2.lib.list()[0].status, "VERIFIED");
  assert.deepEqual(st2.verify().ok, true);
});

test("U-OCRL-06 dòng nhật ký cuối bị cắt dở được bỏ qua, phần còn lại vẫn nạp", () => {
  const dir = tmp(), st = createStore(dir);
  st.record(P("4", 1)); fs.appendFileSync(path.join(dir, "library.jsonl"), '{"t":"sample","id":"SMP-bad');
  const st2 = createStore(dir); st2.load();
  assert.equal(st2.lib.size(), 1); assert.equal(st2.corrupt(), 1);
});

test("U-OCRL-07 ghi thất bại thì trạng thái bộ nhớ không đổi (không báo đã học)", () => {
  const dir = tmp(), st = createStore(dir); st.load();
  fs.writeFileSync(path.join(dir, "images"), "chặn"); // images là file → mkdir thất bại
  assert.throws(() => st.record(P("6", 1)));
  assert.equal(st.lib.size(), 0);
});

test("U-OCRL-08 xung đột: mẫu mới cùng hình nhưng khác nhãn so với mẫu đã VERIFIED → CONFLICT", () => {
  const st = createStore(tmp());
  st.record(P("7", 1, { docId: "A", bbox: bb(0, 0, 1, 1) })); st.approve({ docId: "A" });
  st.record(P("7", 1, { docId: "B", bbox: bb(5, 5, 6, 6), after: "1" })); // cùng ảnh gán nhãn khác
  const r = st.approve({ docId: "B" });
  assert.equal(r.conflict, 1);
  assert.equal(st.lib.list({ status: "CONFLICT" }).length, 1);
});

test("U-OCRL-09 undoCell hủy sửa gần nhất của ô", () => {
  const st = createStore(tmp());
  st.record(P("9", 1)); st.undoCell(Object.assign({}, st.lib.list()[0]).cellKey, "u1");
  assert.equal(st.lib.list({ status: "PENDING_APPROVAL" }).length, 0);
});

test("U-OCRL-10 tra cứu: không bao giờ AUTO_ACCEPT sai trên dữ liệu tổng hợp; mẫu lạ → UNRECOGNIZED/SUGGESTED", () => {
  const st = createStore(tmp()), rng = S.prng(11); let n = 0;
  "0123456789".split("").forEach((l) => { for (let i = 0; i < 8; i++) { const im = S.render(l, rng); st.record({ raw: im.g, clean: im.g, w: im.w, h: im.h, cellType: "digit", docId: "T", page: 1, bbox: bb(n, n, n + 1, n + 1), after: l, before: "", mode: "so" }); n++; } });
  st.approve({ docId: "T" });
  const items = [], truth = [];
  "0123456789".split("").forEach((l) => { for (let i = 0; i < 15; i++) { const im = S.render(l, rng); items.push({ clean: im.g, w: im.w, h: im.h }); truth.push(l); } });
  const res = st.lookup(items);
  let autoWrong = 0, auto = 0;
  res.forEach((r, i) => { if (r.status === "AUTO_ACCEPT") { auto++; if (r.label !== truth[i]) autoWrong++; } });
  assert.equal(autoWrong, 0); assert.ok(auto > 20, "auto=" + auto);
  const blank = st.lookup([{ clean: new Uint8Array(48 * 64).fill(240), w: 48, h: 64 }])[0];
  assert.equal(blank.status, "UNRECOGNIZED");
});

test("U-OCRL-11 verify phát hiện ảnh mẫu bị mất/sửa", () => {
  const dir = tmp(), st = createStore(dir); st.record(P("8", 1));
  const f = st.files().find((x) => x.rel.endsWith(".png")); fs.writeFileSync(f.abs, "hỏng");
  const v = createStore(dir).verify(); assert.equal(v.ok, false); assert.equal(v.bad.length, 1);
});
