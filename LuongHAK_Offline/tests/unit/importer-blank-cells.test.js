"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const I = require("../../core/importer.js"), IB = require("../../core/input-batch.js");
const fs = require("node:fs"), path = require("node:path");
const plan = (d, t, c, rows, o) => I.plan(d, t, c, IB.blankRows(rows), o);

const db = () => ({ nhanvien: [{ "Mã NV": "NV1" }], psluong: [] });
const cols = ["Ngày hạch toán", "Mã NV", "Thưởng"];

test("U-IMP-BLANK-01: dòng chỉ có khoảng trắng bị coi là dòng trống, không thành dòng rác", () => {
  const p = plan(db(), "psluong", cols, [{ "Ngày hạch toán": " ", "Mã NV": "  ", "Thưởng": " " }], {});
  assert.equal(p.items.length, 0);
});

test("U-IMP-BLANK-02: ô tiền chỉ có khoảng trắng là TRỐNG, không bị đọc âm thầm thành 0", () => {
  const p = plan(db(), "psluong", cols, [{ "Ngày hạch toán": "05/09/2026", "Mã NV": "NV1", "Thưởng": " " }], {});
  assert.equal(p.items.length, 1);
  assert.equal(p.items[0].row["Thưởng"], "");
});

test("U-IMP-BLANK-03: số 0 thật vẫn được giữ là 0", () => {
  const p = plan(db(), "psluong", cols, [{ "Ngày hạch toán": "05/09/2026", "Mã NV": "NV1", "Thưởng": 0 }], {});
  assert.equal(p.items[0].row["Thưởng"], "0");
});

test("U-IMP-BLANK-04: blankRows giữ số dòng gốc __line và không đụng giá trị khác", () => {
  const r = Object.defineProperty({ a: " ", b: "x", c: 0, d: "  y " }, "__line", { value: 7 });
  const [o] = IB.blankRows([r]);
  assert.deepEqual(Object.assign({}, o), { a: "", b: "x", c: 0, d: "  y " });
  assert.equal(o.__line, 7); assert.equal(Object.keys(o).includes("__line"), false);
});

test("U-IMP-BLANK-05: mọi đường nhập Excel/OCR/thay thế kỳ đều đi qua blankRows", () => {
  const root = path.join(__dirname, "../..");
  assert.match(fs.readFileSync(path.join(root, "app-src/04-excel-nhap-lieu.js"), "utf8"), /IMP\.plan\(db, k, ALL\[k\]\.cols, C\.inputBatch\.blankRows\(raw\)/);
  assert.match(fs.readFileSync(path.join(root, "app-src/22-ocr-cham-cong.js"), "utf8"), /blankRows\(rr\.chamcong\)[\s\S]*blankRows\(rr\.tiencom\)/);
  assert.match(fs.readFileSync(path.join(root, "core/input-batch.js"), "utf8"), /I\.plan\(d,key,cols,blankRows\(candidates\)/);
});
