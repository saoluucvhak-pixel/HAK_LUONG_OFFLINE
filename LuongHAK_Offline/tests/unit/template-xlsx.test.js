"use strict";
// File Excel mẫu nhập liệu: đẹp hơn (tiêu đề tô màu, cố định dòng đầu, dòng ví dụ nền vàng) nhưng nhập lại vẫn đọc đúng:
// cùng tên sheet, cùng tên cột ở dòng 1, cùng giá trị mẫu (mã có số 0 đầu vẫn là chữ). Dữ liệu giả.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const ExcelJS = require("../../exceljs.min.js"), XLSX = require("../../xlsx.full.min.js"), T = require("../../ui/template-xlsx.js");

const cols = ["Mã NV", "Họ và tên", "Ngày vào làm", "Số tiền", "Hệ số", "01"];
const rows = [{ "Mã NV": "007", "Họ và tên": "Nguyễn Văn An", "Ngày vào làm": "2026-09-01", "Số tiền": 1500000, "Hệ số": 1.5, "01": 1 },
  { "Mã NV": "NV002", "Họ và tên": "Trần Thị Bình", "Ngày vào làm": "2026-09-15", "Số tiền": "", "Hệ số": "", "01": "" }];
const sheets = [{ name: "Nhân viên", cols, rows }, { name: "Hướng dẫn", cols: ["Cột", "Giải thích"], rows: [{ "Cột": "Cách dùng", "Giải thích": "Xóa dòng ví dụ rồi nhập dữ liệu thật." }] }];

test("U-TPL-01 định dạng: tiêu đề tô màu + cố định dòng đầu + bộ lọc + dòng ví dụ nền vàng + sheet hướng dẫn", async () => {
  const wb = T.build(ExcelJS, sheets), ws = wb.getWorksheet("Nhân viên"), guide = wb.getWorksheet("Hướng dẫn");
  assert.equal(ws.views[0].state, "frozen"); assert.equal(ws.views[0].ySplit, 1);
  assert.equal(ws.getCell("A1").fill.fgColor.argb, "FF1F4E79"); assert.equal(ws.getCell("A1").font.bold, true); assert.equal(ws.getCell("A1").font.color.argb, "FFFFFFFF");
  assert.ok(ws.autoFilter, "có bộ lọc ở dòng tiêu đề");
  assert.equal(ws.getCell("A2").fill.fgColor.argb, "FFFFF8E1", "dòng ví dụ nền vàng");
  assert.equal(ws.getCell("D2").numFmt, "#,##0", "cột tiền có dấu phân cách nghìn"); assert.equal(ws.getCell("E2").numFmt, "General");
  assert.ok(String(ws.getCell("A1").note || "").length > 0 && /VÍ DỤ/.test(JSON.stringify(ws.getCell("A1").note)), "ghi chú nhắc xóa dòng ví dụ");
  assert.ok(ws.getColumn(2).width >= 14, "cột họ tên đủ rộng");
  assert.ok(guide.getColumn(2).width >= 80); assert.equal(guide.getCell("A2").font.bold, true);
});

test("U-TPL-02 nhập lại vẫn đọc đúng: cùng tên sheet, cùng tên cột dòng 1, cùng giá trị; mã có số 0 đầu giữ nguyên chữ", async () => {
  const buf = await T.build(ExcelJS, sheets).xlsx.writeBuffer(), book = XLSX.read(buf, { type: "buffer", cellDates: true });
  assert.deepEqual(book.SheetNames, ["Nhân viên", "Hướng dẫn"]);
  const aoa = XLSX.utils.sheet_to_json(book.Sheets["Nhân viên"], { header: 1, defval: "", raw: true });
  assert.deepEqual(aoa[0], cols, "dòng 1 = tên cột, không đổi");
  const back = XLSX.utils.sheet_to_json(book.Sheets["Nhân viên"], { defval: "", raw: true });
  assert.equal(back.length, 2);
  assert.equal(back[0]["Mã NV"], "007"); assert.equal(typeof back[0]["Mã NV"], "string");
  assert.equal(require("../../core/validate.js").normDate(back[0]["Ngày vào làm"]), "2026-09-01", "ngày mẫu là ô ngày thật, đọc ra đúng ngày"); assert.equal(back[0]["Số tiền"], 1500000); assert.equal(back[0]["Hệ số"], 1.5); assert.equal(back[0]["01"], 1);
  assert.equal(back[1]["Số tiền"], ""); assert.equal(back[1]["Mã NV"], "NV002");
  const g = XLSX.utils.sheet_to_json(book.Sheets["Hướng dẫn"], { defval: "" });
  assert.equal(g[0]["Cột"], "Cách dùng");
});

test("U-TPL-03 mẫu không có dòng ví dụ vẫn hợp lệ; tên cột dài và 31 cột ngày được dựng đủ", async () => {
  const days = Array.from({ length: 31 }, (_, i) => ("0" + (i + 1)).slice(-2)), all = ["Kỳ", "Mã NV", "Hình thức công"].concat(days);
  const buf = await T.build(ExcelJS, [{ name: "Chấm công", cols: all, rows: [] }, { name: "Hướng dẫn", cols: ["Cột", "Giải thích"], rows: [] }]).xlsx.writeBuffer();
  const aoa = XLSX.utils.sheet_to_json(XLSX.read(buf, { type: "buffer" }).Sheets["Chấm công"], { header: 1, defval: "" });
  assert.deepEqual(aoa[0], all);
});

test("U-TPL-04 nối vào app: tải file mẫu dùng bản có định dạng, có phương án dự phòng nếu thiếu thư viện; script được nạp và đóng gói", () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, "../..", f), "utf8").replace(/\r\n/g, "\n");
  const app = read("app.js");
  assert.match(app, /if \(kind === "template" && styledTemplate\(filename, sheets\)\) return;/);
  assert.match(app, /function styledTemplate\(filename, sheets\) \{\n\s+if \(!window\.ExcelJS \|\| !window\.HAKUi \|\| !window\.HAKUi\.templateXlsx\) return false;/);
  assert.match(app, /XLSX\.utils\.aoa_to_sheet/, "đường thô cũ vẫn còn làm dự phòng");
  assert.match(read("index.html"), /<script src="ui\/template-xlsx\.js"><\/script>/);
  assert.ok(JSON.parse(read("package.json")).build.files.some((f) => /^ui\/\*\*/.test(f)));
});
