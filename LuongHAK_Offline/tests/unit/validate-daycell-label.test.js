"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("../../core/validate.js");

test("P2.1 T-09: VAL.dayCell cảnh báo warn với nhãn lạ (abc, x, OT3) và không chặn error", () => {
  for (const v of ["abc", "x", "OT3", "1OT3"]) {
    const res = V.dayCell("03", v, "2026-09");
    assert.equal(res.error, null, `Không được báo error cho "${v}"`);
    assert.ok(res.warn, `Phải có cảnh báo warn cho nhãn lạ "${v}"`);
  }
});

test("P2.1 T-09: VAL.dayCell không warn khi nhãn nằm trong danh mục phụ cấp truyền vào, warn khi ngoài danh mục", () => {
  const known = ["QC", "CT2"];
  const ok1 = V.dayCell("05", "1QC", "2026-09", known);
  assert.equal(ok1.error, null);
  assert.equal(ok1.warn, null);

  const ok2 = V.dayCell("05", "QC", "2026-09", known);
  assert.equal(ok2.error, null);
  assert.equal(ok2.warn, null);

  const bad1 = V.dayCell("05", "OT3", "2026-09", known);
  assert.equal(bad1.error, null);
  assert.ok(bad1.warn, "OT3 không nằm trong danh mục phụ cấp phải warn");

  const numOk = V.dayCell("05", "1.5", "2026-09", known);
  assert.equal(numOk.error, null);
  assert.equal(numOk.warn, null);
});

test("P2.1 T-09: vẫn báo error cứng với -1, 1/2, 1+1, 1;", () => {
  for (const v of ["-1", "1/2", "1+1", "1;"]) {
    const res = V.dayCell("03", v, "2026-09");
    assert.ok(res.error, `Phải báo error cho "${v}"`);
  }
});
