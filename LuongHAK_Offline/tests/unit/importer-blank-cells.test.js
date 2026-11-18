"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const I = require("../../core/importer.js");

const db = () => ({ nhanvien: [{ "Mã NV": "NV1" }], psluong: [] });
const cols = ["Ngày hạch toán", "Mã NV", "Thưởng"];

test("U-IMP-BLANK-01: dòng chỉ có khoảng trắng bị coi là dòng trống, không thành dòng rác", () => {
  const p = I.plan(db(), "psluong", cols, [{ "Ngày hạch toán": " ", "Mã NV": "  ", "Thưởng": " " }], {});
  assert.equal(p.items.length, 0);
});

test("U-IMP-BLANK-02: ô tiền chỉ có khoảng trắng là TRỐNG, không bị đọc âm thầm thành 0", () => {
  const p = I.plan(db(), "psluong", cols, [{ "Ngày hạch toán": "05/09/2026", "Mã NV": "NV1", "Thưởng": " " }], {});
  assert.equal(p.items.length, 1);
  assert.equal(p.items[0].row["Thưởng"], "");
});

test("U-IMP-BLANK-03: số 0 thật vẫn được giữ là 0", () => {
  const p = I.plan(db(), "psluong", cols, [{ "Ngày hạch toán": "05/09/2026", "Mã NV": "NV1", "Thưởng": 0 }], {});
  assert.equal(p.items[0].row["Thưởng"], "0");
});
