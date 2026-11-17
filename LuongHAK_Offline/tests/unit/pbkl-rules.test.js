// F02: tham số đơn giá/mức sàn/ngưỡng công trong file Excel phân bổ phải theo hiệu lực của kỳ, không theo thứ tự dòng.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../../engine.js");
const R = require("../../ui/pbkl-rules.js");

const row = (code, tu, gia, san, nguong, den) => ({ "Mã lương": code, "Hiệu lực từ": tu, "Hiệu lực đến": den || "", "Số tiền khoán": gia, "Đơn giá bù lương": san, "Ngưỡng công bù theo tổ": nguong });
const catalog = (extra) => ({ dm_luong: [row("SP", "2026-01-01", 100, 10, 15), row("SP", "2026-10-01", 200, 20, 18), row("BD", "2026-01-01", 5000, 0, 0)].concat(extra || []) });
// Cách CŨ (trước sửa): SP lấy dòng CUỐI mảng, BD lấy dòng ĐẦU — giữ lại để chứng minh lỗi đã tái hiện.
const oldPick = (c) => { let sp = {}; c.dm_luong.forEach((r) => { if (r["Mã lương"] === "SP") sp = r; }); return { giaKl: E.money(sp["Số tiền khoán"]), mucSan: E.money(sp["Đơn giá bù lương"]) }; };

test("U-F02-01 tái hiện lỗi cũ: xuất tháng 9 nhận đơn giá 200 / sàn 20 của tháng 10", () => {
  assert.deepEqual(oldPick(catalog()), { giaKl: 200, mucSan: 20 });
});
test("U-F02-02 sau sửa: tháng 9 → 100/10/15; tháng 10 → 200/20/18", () => {
  const sep = R.resolve(E, catalog(), 2026, 9), oct = R.resolve(E, catalog(), 2026, 10);
  assert.deepEqual([sep.giaKl, sep.mucSan, sep.nguong, sep.giaBd], [100, 10, 15, 5000]);
  assert.deepEqual([oct.giaKl, oct.mucSan, oct.nguong, oct.giaBd], [200, 20, 18, 5000]);
  assert.equal(sep.multi, false); assert.deepEqual(sep.missing, []);
});
test("U-F02-03 đảo thứ tự danh mục, thêm dòng tương lai: kết quả không đổi", () => {
  const future = row("SP", "2026-12-01", 999, 99, 9), c1 = catalog([future]), c2 = { dm_luong: catalog([future]).dm_luong.slice().reverse() };
  for (const c of [c1, c2]) {
    const sep = R.resolve(E, c, 2026, 9), oct = R.resolve(E, c, 2026, 10), dec = R.resolve(E, c, 2026, 12);
    assert.deepEqual([sep.giaKl, sep.mucSan, sep.nguong], [100, 10, 15]);
    assert.deepEqual([oct.giaKl, oct.mucSan, oct.nguong], [200, 20, 18], "dòng tương lai không lọt vào tháng 10");
    assert.deepEqual([dec.giaKl, dec.mucSan, dec.nguong], [999, 99, 9]);
  }
});
test("U-F02-04 giống hệt API tính lương: kết quả bằng E.hieuLuc của engine", () => {
  const c = catalog([row("SP", "2026-11-16", 300, 30, 20)]);
  for (const m of [9, 10, 11]) { const hl = E.hieuLuc(c.dm_luong, "Mã lương", 2026, m).SP; assert.equal(R.resolve(E, c, 2026, m).giaKl, E.money(hl["Số tiền khoán"])); }
});
test("U-F02-05 đổi giá GIỮA tháng: nêu đủ từng mức hiệu lực, không trình bày một mức chung", () => {
  const c = { dm_luong: [row("SP", "2026-01-01", 100, 10, 15), row("SP", "2026-10-16", 200, 20, 18)] };
  const oct = R.resolve(E, c, 2026, 10);
  assert.equal(oct.multi, true); assert.equal(oct.giaKl, 200);
  assert.match(oct.lines.join("\n"), /2 mức hiệu lực.*01\/01\/2026.*100 đ.*16\/10\/2026.*200 đ/);
  assert.equal(R.resolve(E, c, 2026, 9).multi, false);
});
test("U-F02-06 bản chốt đọc danh mục đã lưu: danh mục hiện hành đổi sau chốt không ảnh hưởng; snapshot thiếu danh mục thì báo thiếu căn cứ", () => {
  const saved = catalog(), live = catalog([row("SP", "2026-10-20", 777, 77, 7)]);
  assert.equal(R.resolve(E, saved, 2026, 10).giaKl, 200, "bản chốt");
  assert.equal(R.resolve(E, live, 2026, 10).giaKl, 777, "danh mục hiện hành khác — chỉ dùng cho kỳ chưa chốt");
  const none = R.resolve(E, {}, 2026, 10);
  assert.equal(none.noCatalog, true); assert.deepEqual(none.missing, ["SP", "BD"]); assert.match(none.lines[0], /Thiếu căn cứ.*không tính lại/);
  const noBd = R.resolve(E, { dm_luong: [row("SP", "2026-01-01", 100, 10, 15)] }, 2026, 9);
  assert.deepEqual(noBd.missing, ["BD"]); assert.match(noBd.lines.join(" "), /không có mã BD/);
});
test("U-F02-07 không sửa danh mục đầu vào", () => {
  const c = catalog(), before = JSON.stringify(c); R.resolve(E, c, 2026, 10); assert.equal(JSON.stringify(c), before);
});

test("U-F02-08 chỉ báo thiếu mã BD khi kỳ có ban dăm (need)", () => {
  const c = { dm_luong: [row("SP", "2026-01-01", 100, 10, 15)] };
  assert.deepEqual(R.resolve(E, c, 2026, 9, { need: ["SP"] }).missing, []);
  assert.deepEqual(R.resolve(E, c, 2026, 9, { need: ["SP", "BD"] }).missing, ["BD"]);
});

test("U-F02-09 file Excel thật: kỳ chưa chốt in đúng đơn giá của kỳ + các mức; kỳ chốt thiếu danh mục chỉ báo thiếu căn cứ, không in đơn giá", async () => {
  const ExcelJS = require("../../exceljs.min.js"), { report } = require("../../ui/pbkl-xlsx.js");
  const empty = { byDept: {}, byEmp: {}, dateKeys: [], audit: [], empCount: {} };
  const L = { coChe: "to", note: "x", rows: [{ maPB: "T1", ma: "NV1", soCong: 1, tan: 1, luongSL: 5000, luongBD: 0, xe: 0, bu: 0, tong: 5000 }] };
  const guideOf = async (ctx) => { const wb = report(ExcelJS, { sl: empty, bd: empty, raw: {}, luong: L, ctx }, {}), re = new ExcelJS.Workbook(); await re.xlsx.load(await wb.xlsx.writeBuffer()); return re.getWorksheet("Huong dan su dung").getColumn(1).values.join(" "); };
  const c = { dm_luong: [row("SP", "2026-01-01", 100, 10, 15), row("SP", "2026-09-16", 150, 12, 15)] };
  const sep = R.resolve(E, c, 2026, 9), live = await guideOf({ coChe: "to", chot: false, giaKl: sep.giaKl, mucSan: sep.mucSan, rules: sep, soNgay: 30 });
  assert.match(live, /Đơn giá khối lượng: 150 đ\/tấn/); assert.match(live, /Mức sàn bù lương: 12 đ/); assert.match(live, /2 mức hiệu lực/);
  const none = R.resolve(E, {}, 2026, 9, { need: ["SP"] }), closed = await guideOf({ coChe: "to", chot: true, giaKl: 0, rules: none });
  assert.match(closed, /THAM SỐ ĐÃ LƯU TRONG BẢN CHỐT/); assert.match(closed, /Thiếu căn cứ/); assert.doesNotMatch(closed, /Đơn giá khối lượng/);
});
