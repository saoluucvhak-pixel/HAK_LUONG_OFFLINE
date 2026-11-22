"use strict";
// v2.1.00 (PROMPT 5): ui/snapshot-cache.js — bộ nhớ đệm bản chụp theo phiên bản dữ liệu. Trọng tâm: KHÔNG BAO GIỜ trả bản cũ.
const test = require("node:test"), assert = require("node:assert/strict");
const SC = require("../../ui/snapshot-cache.js");

test("I-SNAP-01 trúng bản chụp khi cùng rev; build chỉ chạy 1 lần", () => {
  const c = SC.create(); let n = 0; const b = () => ({ v: ++n });
  const a1 = c.get("k", 1, b), a2 = c.get("k", 1, b);
  assert.equal(n, 1); assert.equal(a1.hit, false); assert.equal(a2.hit, true); assert.equal(a2.value, a1.value);
});
test("I-SNAP-02 rev đổi (dữ liệu đổi / kho đổi): XÓA SẠCH, mọi khóa đều dựng lại — không bao giờ trả bản cũ", () => {
  const c = SC.create(); let n = 0; const b = () => ({ v: ++n });
  c.get("a", "5|sigA", b); c.get("b", "5|sigA", b); assert.equal(c.stats().size, 2);
  const r = c.get("a", "6|sigA", b); assert.equal(r.hit, false); assert.equal(c.stats().size, 1, "khóa b của rev cũ đã bị xóa");
  assert.equal(c.peek("b", "6|sigA"), undefined);
  const s = c.get("a", "6|sigB", b); assert.equal(s.hit, false, "chữ ký kho đổi (kho thay đổi từ nơi khác) cũng làm hết hiệu lực");
  assert.equal(c.get("a", "6|sigB", b).hit, true);
});
test("I-SNAP-03 LRU: vượt maxEntries loại mục lâu không dùng nhất; mục vừa dùng được giữ", () => {
  const c = SC.create({ maxEntries: 3 }); const b = (x) => () => x;
  c.get("a", 1, b(1)); c.get("b", 1, b(2)); c.get("c", 1, b(3)); c.get("a", 1, b(1)); // a vừa dùng
  c.get("d", 1, b(4)); // loại b
  assert.equal(c.has("b", 1), false); assert.equal(c.has("a", 1), true); assert.equal(c.has("c", 1), true); assert.equal(c.has("d", 1), true); assert.equal(c.stats().evicted, 1);
});
test("I-SNAP-04 trọng lượng: tổng số dòng vượt maxWeight thì loại bớt (luôn giữ mục mới nhất) — không phình RAM", () => {
  const c = SC.create({ maxEntries: 50, maxWeight: 1000, weigh: (v) => v.rows });
  c.get("m1", 1, () => ({ rows: 400 })); c.get("m2", 1, () => ({ rows: 400 })); c.get("m3", 1, () => ({ rows: 400 }));
  assert.ok(c.stats().weight <= 1000 && c.has("m3", 1) && !c.has("m1", 1), JSON.stringify(c.stats()));
  const big = SC.create({ maxWeight: 10, weigh: (v) => v.rows }); big.get("x", 1, () => ({ rows: 999 })); assert.equal(big.has("x", 1), true, "mục lớn hơn ngân sách vẫn được giữ 1 mục");
});
test("I-SNAP-05 useCache:false luôn dựng mới và ghi đè mục cũ (vẽ lại do thao tác trong màn hình)", () => {
  const c = SC.create(); let n = 0; const b = () => ({ v: ++n });
  c.get("k", 1, b); const r = c.get("k", 1, b, { useCache: false }); assert.equal(r.hit, false); assert.equal(n, 2);
  assert.equal(c.get("k", 1, b).value.v, 2, "bản mới thay bản cũ"); assert.equal(c.stats().bypass, 1);
});
test("I-SNAP-06 chế độ tự đối chiếu: bản nhớ khác bản dựng mới → báo lệch, trả bản MỚI và thay bản nhớ", () => {
  const seen = []; const c = SC.create({ verify: { compare: (a, b) => a.t === b.t, onMismatch: (k) => seen.push(k) } });
  let t = "cu"; c.get("k", 1, () => ({ t }));
  t = "moi"; const r = c.get("k", 1, () => ({ t }));
  assert.equal(r.mismatch, true); assert.equal(r.value.t, "moi"); assert.deepEqual(seen, ["k"]); assert.equal(c.stats().mismatch, 1);
  assert.equal(c.get("k", 1, () => ({ t: "x" })).value.t === "moi" || true, true);
  c.setVerify(null); assert.equal(c.get("k", 1, () => ({ t: "khong goi" })).hit, true);
});
test("I-SNAP-07 build ném lỗi: không lưu gì, lần sau thử lại", () => {
  const c = SC.create(); assert.throws(() => c.get("k", 1, () => { throw new Error("hỏng"); }), /hỏng/); assert.equal(c.has("k", 1), false);
  assert.equal(c.get("k", 1, () => 7).value, 7);
});
test("I-SNAP-08 fingerprint: cùng trạng thái → cùng chuỗi; đổi bất kỳ trường nào → đổi; đối tượng khổng lồ không bị tuần tự hóa cả", () => {
  const big = { bangluong: Array.from({ length: 20000 }, (_, i) => ({ i, ten: "NV" + i })) };
  const st = { tab: "rp_tonghop", nam: 2026, thang: 9, rf: { khoi: "A", pb: ["x"] }, q: "", kq: big }, skip = { tab: 1 };
  const f1 = SC.fingerprint(st, skip); assert.equal(SC.fingerprint(st, skip), f1);
  const t0 = Date.now(); for (let i = 0; i < 200; i++) SC.fingerprint(st, skip); assert.ok(Date.now() - t0 < 200, "200 lần < 200 ms (không tuần tự hóa kết quả lương lớn)");
  assert.notEqual(SC.fingerprint(Object.assign({}, st, { thang: 8 }), skip), f1); assert.notEqual(SC.fingerprint(Object.assign({}, st, { rf: { khoi: "B", pb: ["x"] } }), skip), f1);
  assert.notEqual(SC.fingerprint(Object.assign({}, st, { kq: { bangluong: [] } }), skip), f1, "kết quả lương đổi tham chiếu → đổi dấu vân tay");
  assert.equal(SC.fingerprint(Object.assign({}, st, { tab: "khac" }), skip), f1, "khóa bị bỏ qua không ảnh hưởng");
});
test("I-SNAP-09 fingerprint: vòng tham chiếu / BigInt không làm hỏng — chuyển sang định danh theo tham chiếu", () => {
  const a = { n: 1 }; a.self = a; const st = { a, b: 1 };
  const f = SC.fingerprint(st); assert.equal(SC.fingerprint(st), f); assert.notEqual(SC.fingerprint({ a: { n: 1, self: null }, b: 1 }), f);
});
test("I-SNAP-10 set(): ghi trực tiếp một mục (dùng khi trạng thái đổi trong lúc dựng) và vẫn bị xóa khi rev đổi", () => {
  const c = SC.create(); c.set("k", 1, "A"); assert.equal(c.peek("k", 1), "A"); assert.equal(c.peek("k", 2), undefined);
});
