// Đối chiếu bảng ↔ dòng xuất (Excel/PDF dùng toRows) sau khi lọc, cho từng loại báo cáo lương. Dữ liệu giả; module thật.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const PR = require("../../core/reporting/payroll-reports.js");
const RH = require("../../core/reporting/report-html.js");
const TR = require("../../core/reporting/total-row.js");

const emp = (ma, pb, tl) => ({ "Mã NV": ma, "Họ và tên": "Người " + ma, "Phòng ban": pb, "HTTT": "Chuyển khoản", "Tổng thu nhập": tl, "Thực lĩnh": tl });
const L = (so, ma, tien) => ({ "Số chứng từ": so, "Kỳ": "2026-10", "Hình thức": "Chuyển khoản", "Mã NV": ma, "Họ và tên": "x", "Số tiền": tien, "Trạng thái": "Đã thanh toán" });
const bangluong = [emp("NV01", "Tổ 1", 100), emp("TỔNG-02", "Tổ 1", 200), emp("NV03", "Tổ 2", 50)];
const lines = [L("PC-1", "NV01", 100), L("PC-2", "TỔNG-02", 200)];
const base = { nam: 2026, thang: 10, tenCongTy: "CT TEST", ngay: "2026-11-01", nguoiLap: "ketoan", lines };
const src = { bangluong, chot: true, blockers: [] };

for (const type of Object.keys(PR.TYPES)) {
  test("U-PARITY-" + type + ": sau lọc, bảng = dòng xuất = HTML in; số dòng gốc không đổi; không mất dòng 'TỔNG-02'", () => {
    const all = PR.build(type, src, base), f = PR.build(type, src, Object.assign({ filter: { phongBan: ["Tổ 1"] } }, base));
    assert.equal(f.soDongGoc, bangluong.length, "số dòng nguồn không đổi dù lọc");
    assert.equal(all.soDongGoc, bangluong.length);
    assert.equal(f.soDong, f.rows.length, "soDong khớp số dòng bảng");
    assert.ok(f.soDong <= all.soDong);
    const ex = PR.toRows(f);
    const body = ex.filter((r) => !TR.is(r));
    // Excel/PDF: mọi dòng bảng đều có mặt trong dòng xuất (cộng tối đa các dòng nhóm/tổng)
    assert.ok(ex.length >= f.rows.length, "dòng xuất không ít hơn bảng");
    assert.equal(body.length, f.rows.length, "dòng xuất (không tính tổng) = dòng bảng");
    if (f.rows.length) assert.ok(TR.is(ex[ex.length - 1]), "dòng cuối của bản xuất là dòng tổng");
    // HTML in dựng từ cùng dòng xuất
    const html = RH.sheets({ title: f.title, ky: f.kyText, loc: f.loc || [], sheets: [{ name: "S", rows: ex }] }, {});
    if (f.rows.length) assert.ok(/<table/.test(html));
    // Nếu báo cáo có cột Mã NV và còn dòng thì NV 'TỔNG-02' không được rơi
    if (f.cols.some((c) => (c.key || c) === "Mã NV") && all.rows.some((r) => r["Mã NV"] === "TỔNG-02")) {
      assert.ok(f.rows.some((r) => r["Mã NV"] === "TỔNG-02"), "NV 'TỔNG-02' phải còn sau lọc phòng ban Tổ 1");
      assert.ok(html.includes("TỔNG-02"), "và có trong HTML in");
    }
  });
}
