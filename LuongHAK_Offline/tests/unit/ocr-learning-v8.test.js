"use strict";
// V8 P0-2: xóa / sửa lại / hoàn tác ô OCR — mẫu cũ không được "sống" sau khi ô đã đổi
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("fs"), os = require("os"), path = require("path");
const S = require("../fixtures/synth-digits.js");
const { createStore } = require("../../main/ocr-library.js");
const bb = (a, b, c, d) => ({ x0: a, y0: b, x1: c, y1: d });
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "ocrlib8-"));
function P(label, seed, over) { const im = S.render(label, S.prng(seed)); return Object.assign({ raw: im.g, clean: im.g, w: im.w, h: im.h, cellType: "digit", docId: "D1", page: 1, bbox: bb(10, 10, 40, 60), employeeId: "NV1", ky: "2026-09", before: "", after: label, user: "u" }, over || {}); }
const key = (st) => st.lib.edits()[0].cellKey;
const act = (st) => st.lib.list().filter((s) => s.status === "PENDING_APPROVAL" || s.status === "VERIFIED");

test("U-OCR8-01 A: 1→7→xóa trống: giữ lịch sử, mẫu '7' không còn hiệu lực, không có mẫu nhãn trống", () => {
  const st = createStore(tmp());
  st.record(P("1", 1)); st.record(P("7", 2, { before: "1", after: "7" }));
  const r = st.record(P("7", 3, { before: "7", after: "", raw: null, clean: null }));
  assert.equal(r.sampleId, null);
  assert.equal(act(st).length, 0, "không mẫu nào còn hiệu lực");
  assert.equal(st.lib.list().filter((s) => s.label === "").length, 0, "không tạo ảnh nhãn rỗng");
  assert.equal(st.lib.edits().length, 3);
  assert.equal(st.lib.cellSample(key(st)), null);
  assert.ok(st.lib.list().every((s) => s.status === "SUPERSEDED"));
});

test("U-OCR8-02 B: 1→7→1 chỉ mẫu cuối hiệu lực; ô được gán đúng mẫu cuối", () => {
  const st = createStore(tmp());
  st.record(P("1", 1)); st.record(P("7", 2, { before: "1", after: "7" })); const r = st.record(P("1", 3, { before: "7", after: "1" }));
  assert.equal(act(st).length, 1); assert.equal(st.lib.cellSample(key(st)), r.sampleId);
});

test("U-OCR8-03 C: 0,5→0,6→Undo: ô về 0,5, mẫu 0,5 hiệu lực lại, sự kiện UNDO được ghi", () => {
  const st = createStore(tmp());
  const a = st.record(P("5", 1, { before: "", after: "0,5" })), b = st.record(P("6", 2, { before: "0,5", after: "0,6" }));
  const u = st.undoCell(key(st), "u");
  assert.equal(u.value, "0.5"); // nhãn đã chuẩn hóa dấu phẩy → chấm
  assert.equal(st.lib.cellSample(key(st)), a.sampleId);
  assert.equal(st.lib.get(a.sampleId).status, "PENDING_APPROVAL");
  assert.equal(st.lib.get(b.sampleId).status, "REJECTED");
  assert.equal(st.lib.edits().filter((e) => e.kind === "UNDO").length, 1);
});

test("U-OCR8-04 D: khởi động lại nạp từ đĩa → lịch sử, trạng thái, gán ô giống hệt", () => {
  const dir = tmp(), st = createStore(dir);
  st.record(P("5", 1, { after: "0,5" })); st.record(P("6", 2, { before: "0,5", after: "0,6" })); st.undoCell(key(st), "u");
  st.record(P("1", 3, { docId: "D2", after: "1" })); st.record(P("1", 3, { docId: "D2", before: "1", after: "", raw: null, clean: null }));
  const st2 = createStore(dir); st2.load();
  assert.deepEqual(st2.lib.list().map((s) => s.status), st.lib.list().map((s) => s.status));
  assert.equal(st2.lib.edits().length, st.lib.edits().length);
  assert.equal(st2.lib.cellSample(key(st2)), st.lib.cellSample(key(st)));
});

test("U-OCR8-05 sửa khi thiếu ảnh nguồn vẫn gỡ mẫu cũ và đánh dấu MISSING_SOURCE_IMAGE", () => {
  const st = createStore(tmp());
  st.record(P("1", 1)); const r = st.record(P("7", 2, { before: "1", after: "7", raw: null, clean: null }));
  assert.ok(r.missingSource); assert.equal(act(st).length, 0);
  assert.deepEqual(st.lib.edits()[1].flags, ["MISSING_SOURCE_IMAGE"]);
});

test("U-OCR8-06 ảnh dùng chung cho 2 ô: xóa 1 ô không vô hiệu mẫu của ô còn lại", () => {
  const st = createStore(tmp());
  const a = st.record(P("7", 5, { bbox: bb(0, 0, 30, 50) })), b = st.record(P("7", 5, { bbox: bb(100, 0, 130, 50), employeeId: "NV2" }));
  assert.equal(a.sampleId, b.sampleId);
  const k1 = st.lib.edits()[0].cellKey;
  st.record(P("7", 5, { bbox: bb(0, 0, 30, 50), before: "7", after: "", raw: null, clean: null }));
  assert.equal(st.lib.get(a.sampleId).status, "PENDING_APPROVAL");
  assert.equal(st.lib.cellSample(k1), null);
  st.record(P("7", 5, { bbox: bb(100, 0, 130, 50), before: "7", after: "", raw: null, clean: null }));
  assert.equal(st.lib.get(a.sampleId).status, "SUPERSEDED");
});

test("U-OCR8-07 sửa lặp 100 lần cùng ô: đúng 1 mẫu hiệu lực, 100 sự kiện", () => {
  const st = createStore(tmp()); let before = "";
  for (let i = 0; i < 100; i++) { const l = String(i % 2 ? 7 : 1); st.record(P(l, 10 + i, { before, after: l })); before = l; }
  assert.equal(act(st).length, 1); assert.equal(st.lib.edits().length, 100);
});
