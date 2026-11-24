// v2.1.11 (A2-03 / T-02): Mã NV mồ côi ở Thưởng/Trừ, Tạm ứng, Suất cơm của kỳ → phát hiện để CHẶN CHỐT (không tự sửa dữ liệu).
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const O = require("../../ui/input-orphans.js");
const V = require("../../core/validate.js");
const db = () => ({ nhanvien: [{ "Mã NV": "NVA1" }, { "Mã NV": "NVB2" }],
  psluong: [{ "Mã NV": "NVA1 ", "Ngày hạch toán": "2026-10-05", "Thưởng": 1 }, { "Mã NV": "NVB2", "Ngày hạch toán": "2026-10-06", "Thưởng": 1 }],
  ungluong: [{ "Mã NV": "nva1", "Ngày hạch toán": "2026-10-07", "Tạm ứng": 1000000 }, { "Mã NV": "NVXX", "Ngày hạch toán": "2026-10-08", "Tạm ứng": 5 }, { "Mã NV": "NVXX", "Ngày hạch toán": "2026-10-09", "Tạm ứng": 5 }],
  tiencom: [{ "Mã NV": "NVZZ", "Ngày": "2026-09-30" }] });
const deps = { rowPeriod: (t, r) => V.rowPeriod(t, r) };

test("U-ORP-01 phát hiện Mã NV sai hoa/thường, có khoảng trắng và không tồn tại; gom theo bảng + mã", () => {
  const r = O.audit(db(), "2026-10", deps);
  assert.deepEqual(r.map((x) => x.table + ":" + x.ma + ":" + x.gan), ["psluong:NVA1 :NVA1", "ungluong:nva1:NVA1", "ungluong:NVXX:"], "NVXX 2 dòng chỉ báo 1 lần");
  assert.match(r[1].msg, /Tạm ứng: Mã NV "nva1" không khớp Nhân sự \(gần giống "NVA1"/); assert.match(r[2].msg, /mã không tồn tại/); assert.match(r[2].msg, /BỎ QUA khi tính lương/);
});
test("U-ORP-02 chỉ xét ĐÚNG kỳ: dòng của kỳ khác không chặn kỳ này", () => {
  assert.equal(O.audit(db(), "2026-10", deps).some((x) => x.table === "tiencom"), false);
  assert.deepEqual(O.audit(db(), "2026-09", deps).map((x) => x.ma), ["NVZZ"]);
});
test("U-ORP-03 dữ liệu sạch → không báo; không sửa dữ liệu đầu vào", () => {
  const d = db(); d.psluong = [{ "Mã NV": "NVA1", "Ngày hạch toán": "2026-10-05" }]; d.ungluong = []; d.tiencom = []; const snap = JSON.stringify(d);
  assert.deepEqual(O.audit(d, "2026-10", deps), []); assert.equal(JSON.stringify(d), snap);
  assert.deepEqual(O.audit({}, "2026-10", deps), []);
});
test("U-ORP-04 cổng chốt kỳ (app-src/17-chot-ky.js) dùng inputOrphans và index.html nạp ui/input-orphans.js", () => {
  const app = fs.readFileSync(path.join(__dirname, "../../app-src/17-chot-ky.js"), "utf8"), html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8");
  assert.match(app, /HAKUI\.inputOrphans\.audit\(db, kyKey\(st\.nam, st\.thang\)/); assert.match(html, /<script src="ui\/input-orphans\.js"><\/script>/);
});
