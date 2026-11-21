"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const VAL = require(path.join(root, "core", "validate.js"));
const s07 = fs.readFileSync(path.join(root, "app-src", "07-bang-nhap-lieu.js"), "utf8");

test("T-21: normCell cảnh báo Số suất cơm âm (-2) và vượt ngưỡng (99999), không chặn lưu", () => {
  const neg = VAL.normCell("Số suất cơm", "-2");
  assert.equal(neg.error, undefined);
  assert.equal(neg.value, "-2");
  assert.ok(neg.warn && /âm/i.test(neg.warn), JSON.stringify(neg));

  const big = VAL.normCell("Số suất cơm", "99999");
  assert.equal(big.error, undefined);
  assert.equal(big.value, "99999");
  assert.ok(big.warn && /vượt ngưỡng 3/i.test(big.warn), JSON.stringify(big));

  const ok = VAL.normCell("Số suất cơm", "2");
  assert.equal(ok.error, undefined);
  assert.equal(ok.warn, undefined);
});

test("T-21: normCell cảnh báo Thưởng / Thu nhập khác âm ('khoản âm — kiểm lại'), không chặn lưu", () => {
  const th = VAL.normCell("Thưởng", "-100000");
  assert.equal(th.error, undefined);
  assert.equal(th.value, "-100000");
  assert.match(th.warn || "", /khoản âm — kiểm lại/);

  const tn = VAL.normCell("Thu nhập khác", "-50000");
  assert.equal(tn.error, undefined);
  assert.equal(tn.value, "-50000");
  assert.match(tn.warn || "", /khoản âm — kiểm lại/);

  const ok = VAL.normCell("Thưởng", "100000");
  assert.equal(ok.error, undefined);
  assert.equal(ok.warn, undefined);
});

test("T-21: app-src/07-bang-nhap-lieu.js hiển thị viền cảnh báo và toast khi normCell có warn", () => {
  assert.match(s07, /n\.warn/, "Kiểm tra n.warn khi rời ô");
  assert.match(s07, /warn-cell/, "Gắn class viền cảnh báo warn-cell");
  assert.match(s07, /toast\("⚠ "\s*\+\s*n\.warn\)/, "Hiện toast cảnh báo khi có n.warn");
});
