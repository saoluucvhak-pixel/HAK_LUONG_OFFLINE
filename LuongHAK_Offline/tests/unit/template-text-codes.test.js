"use strict";
// File mẫu nhập liệu: cột Mã NV, số tài khoản, các mã định danh định dạng Text cho CẢ CỘT (nhập "0005" giữ nguyên số 0 đầu);
// dòng ví dụ có cột đánh dấu "Dòng ví dụ = VÍ DỤ" nên app bỏ qua khi nhập; dòng dữ liệu thật trùng giá trị mẫu vẫn được giữ.
// Tên sheet và tiêu đề cột không đổi nên mẫu cũ vẫn đọc được. Dữ liệu giả.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const ExcelJS = require("../../exceljs.min.js"), XLSX = require("../../xlsx.full.min.js"), T = require("../../ui/template-xlsx.js");
const IMP = require("../../core/importer.js");
const { baseDb } = require("../fixtures/build.js");

const cols = ["Mã NV", "Họ và tên", "Số tài khoản", "Số CCCD", "Ngày tạo hồ sơ", "Lương cơ bản"];
const sample = { "Mã NV": "NV001", "Họ và tên": "Nguyễn Văn An", "Số tài khoản": "0123456789", "Số CCCD": "049090001234", "Ngày tạo hồ sơ": "2024-03-01", "Lương cơ bản": 5000000 };
const sheets = [{ name: "Nhân viên", cols, rows: [sample], sampleMark: true }, { name: "Hướng dẫn", cols: ["Cột", "Giải thích"], rows: [{ "Cột": "a", "Giải thích": "b" }] }];

test("U-TPL-TXT-01 cột định danh định dạng Text cho cả cột (kể cả ô trống bên dưới); cột số/ngày không bị Text; tiêu đề giữ General", async () => {
  const ws = T.build(ExcelJS, sheets).getWorksheet("Nhân viên");
  ["Mã NV", "Số tài khoản", "Số CCCD"].forEach((c) => {
    const n = cols.indexOf(c) + 1;
    assert.equal(ws.getColumn(n).numFmt, "@", c + ": cả cột là Text");
    assert.equal(ws.getCell(50, n).numFmt, "@", c + ": ô nhập mới ở dòng 50 là Text");
  });
  assert.notEqual(ws.getColumn(cols.indexOf("Lương cơ bản") + 1).numFmt, "@");
  assert.equal(ws.getCell(1, 1).numFmt, "General", "ô tiêu đề không là Text");
  assert.ok(T.TEXT_COL.test("Mã phòng ban") && T.TEXT_COL.test("Số HĐLĐ") && !T.TEXT_COL.test("Số tiền") && !T.TEXT_COL.test("Số suất cơm"));
});

test("U-TPL-TXT-02 ca bắt buộc: mở mẫu, nhập '0005' và '00123' vào dòng mới, lưu rồi nhập lại → giữ đúng số 0 đầu", async () => {
  const buf = await T.build(ExcelJS, sheets).xlsx.writeBuffer();
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
  const ws = wb.getWorksheet("Nhân viên");
  assert.equal(ws.getCell("A3").numFmt, "@", "sau khi mở lại file, ô dòng mới vẫn là Text");
  ws.getCell("A3").value = "0005"; ws.getCell("C3").value = "00123"; ws.getCell("B3").value = "Lê Thị Mai";
  const saved = await wb.xlsx.writeBuffer(), book = XLSX.read(saved, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json(book.Sheets["Nhân viên"], { raw: true, defval: "" });
  assert.equal(rows[1]["Mã NV"], "0005"); assert.equal(typeof rows[1]["Mã NV"], "string");
  assert.equal(rows[1]["Số tài khoản"], "00123");
  assert.equal(rows[0]["Số tài khoản"], "0123456789", "dòng ví dụ giữ số 0 đầu");
});

test("U-TPL-TXT-03 dòng ví dụ có dấu nhận diện rõ (cột 'Dòng ví dụ' = VÍ DỤ, nền vàng); tên sheet và tiêu đề cột cũ vẫn nguyên", async () => {
  const buf = await T.build(ExcelJS, sheets).xlsx.writeBuffer(), book = XLSX.read(buf, { type: "buffer" });
  assert.deepEqual(book.SheetNames, ["Nhân viên", "Hướng dẫn"]);
  const aoa = XLSX.utils.sheet_to_json(book.Sheets["Nhân viên"], { header: 1, defval: "" });
  assert.deepEqual(aoa[0].slice(0, cols.length), cols, "các cột cũ giữ nguyên thứ tự và tên");
  assert.equal(aoa[0][cols.length], T.SAMPLE_COL); assert.equal(aoa[1][cols.length], T.SAMPLE_VALUE);
  const ws = T.build(ExcelJS, sheets).getWorksheet("Nhân viên");
  assert.equal(ws.getCell(2, 1).fill.fgColor.argb, "FFFFF8E1"); assert.equal(ws.getCell(2, cols.length + 1).font.bold, true);
  // mẫu không có dòng ví dụ (vd mẫu cấp phát rỗng) thì không thêm cột đánh dấu
  const empty = T.build(ExcelJS, [{ name: "X", cols, rows: [], sampleMark: true }]).getWorksheet("X");
  assert.equal(empty.columnCount, cols.length);
});

// Lấy đúng các hàm nhập của app.js để kiểm tra việc bỏ qua dòng ví dụ (không dựng cả giao diện)
function importHelpers(samples, all) {
  const src = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8").replace(/\r\n/g, "\n");
  const from = src.indexOf('  var SAMPLE_COL = "Dòng ví dụ";'), to = src.indexOf("  // Thứ tự nhập:", from);
  assert.ok(from > 0 && to > from);
  const fold = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return new Function("fold", "SAMPLES", "ALL", src.slice(from, to) + "\nreturn { isSampleMarked, stripSampleAoa, sampleLookalikes };")(fold, samples, all);
}

test("U-TPL-TXT-04 nhập: bỏ qua dòng đánh dấu VÍ DỤ; giữ dòng thật trùng giá trị mẫu (chỉ cảnh báo); mẫu cũ không có cột đánh dấu vẫn đọc bình thường", () => {
  const H = importHelpers({ nhanvien: [sample] }, { nhanvien: { cols } });
  const marked = Object.assign({}, sample, { "Dòng ví dụ": "VÍ DỤ" }), real = Object.assign({}, sample, { "Mã NV": "0005", "Số tài khoản": "00123" });
  assert.equal(H.isSampleMarked(marked), true); assert.equal(H.isSampleMarked(real), false); assert.equal(H.isSampleMarked({ "Dòng ví dụ": " ví dụ " }), true);
  // dòng thật có đúng giá trị mẫu nhưng đã bị xóa dấu → vẫn là dữ liệu thật, chỉ được cảnh báo
  const twin = Object.assign({}, sample);
  assert.deepEqual(H.sampleLookalikes("nhanvien", [marked, real, twin]).map((r) => r["Mã NV"]), ["NV001"]);
  assert.deepEqual(H.sampleLookalikes("nhanvien", [real]), []);
  // dạng bảng 2 chiều (sản lượng / bơm dăm)
  const aoa = [["Tiêu đề", ""], cols.concat(["Dòng ví dụ"]), ["NV001", "x", "", "", "", 1, "VÍ DỤ"], ["0005", "y", "", "", "", 2, ""]];
  const r = H.stripSampleAoa(aoa);
  assert.equal(r.skipped, 1); assert.equal(r.aoa.length, 3); assert.equal(r.aoa[2][0], "0005");
  const old = H.stripSampleAoa([cols, ["NV001", "x", "", "", "", 1]]);
  assert.equal(old.skipped, 0); assert.equal(old.aoa.length, 2);
});

test("U-TPL-TXT-05 từ file mẫu mới đến kế hoạch nhập: dòng ví dụ không vào kế hoạch; '0005' được ghi đúng, giữ số 0 đầu", async () => {
  const buf = await T.build(ExcelJS, sheets).xlsx.writeBuffer(), wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
  const ws = wb.getWorksheet("Nhân viên"); ws.getCell("A3").value = "0005"; ws.getCell("B3").value = "Lê Thị Mai"; ws.getCell("C3").value = "00123";
  const book = XLSX.read(await wb.xlsx.writeBuffer(), { type: "buffer", cellDates: true });
  const raw = XLSX.utils.sheet_to_json(book.Sheets["Nhân viên"], { raw: true, defval: "" });
  const H = importHelpers({ nhanvien: [sample] }, { nhanvien: { cols } }), kept = raw.filter((r) => !H.isSampleMarked(r));
  assert.equal(raw.length, 2); assert.equal(kept.length, 1);
  const plan = IMP.plan(baseDb(), "nhanvien", ["Mã NV", "Họ và tên", "Số CCCD", "Ngày tạo hồ sơ", "Trạng thái"], kept, { lockedPeriods: {}, defaultKy: "2026-09", extraEmployees: {}, mode: "merge" });
  const added = plan.items.filter((i) => i.action === "add");
  assert.equal(added.length, 1); assert.equal(added[0].row["Mã NV"], "0005"); assert.equal(typeof added[0].row["Mã NV"], "string");
});

test("U-TPL-TXT-06 nối vào app: mẫu gắn dấu ví dụ, import bỏ qua và báo trong bản xem trước, hướng dẫn nhắc số 0 đầu", () => {
  const app = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8").replace(/\r\n/g, "\n");
  assert.match(app, /sampleMark: true, rows:/);
  assert.match(app, /p\.sampleSkipped = skipped; p\.sampleLike = sampleLookalikes\(k, raw\);/);
  assert.match(app, /data-imp-sample": "skipped"/); assert.match(app, /data-imp-sample": "lookalike"/);
  assert.match(app, /Số 0 đầu/);
});
