// P0 (OFFLINE_AUDIT_REPORT.md #P0-1): chotKy() so trước-khi-chốt chỉ dựa vào CLS.totals() (tổng thực lĩnh + số NV)
// → 2 nhân viên đổi lương NGƯỢC DẤU NHAU (A +1tr, B -1tr) làm tổng & số NV y nguyên nhưng bảng lương thực tế
// đã khác người/khác số. CLS.diffDetailed() phải phát hiện được trường hợp này theo TỪNG chỉ tiêu của TỪNG NV.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const CLS = require("../../core/payroll-close.js");

function row(o) {
  return Object.assign({
    "Mã NV": "NV", "Họ và tên": "Test", "Phòng ban": "Văn phòng", "Chức vụ": "NV", "Lương thỏa thuận": 10000000,
    "Công chuẩn": 26, "Tổng công": 26, "Công CN": 0, "Công tăng ca": 0, "Lương thời gian": 10000000, "Lương phụ": 0,
    "Sản lượng (tấn)": 0, "Lương sản lượng": 0, "Lương bù SL": 0, "Số xe bơm dăm": 0, "Lương bơm dăm": 0, "Tiền tăng ca": 0,
    "Phụ cấp": 0, "Phụ cấp công tác": 0, "Lương hỗ trợ": 0, "Ngày cơm": 0, "Tiền cơm": 0, "Thưởng": 0, "Thu nhập khác": 0,
    "Tổng thu nhập": 10000000, "BH trừ NLĐ": 0, "Truy thu BH": 0, "Thuế TNCN": 0, "Trừ khác": 0, "Tạm ứng": 0, "Thực lĩnh": 10000000
  }, o);
}
function kq(rows) { return { bangluong: rows, bhxh: [], tncn: [], canhbao: [] }; }

test("P0-1: tổng thực lĩnh & số NV không đổi, nhưng 2 NV đổi lương ngược dấu nhau → CLS.totals() KHÔNG phát hiện được", () => {
  const before = kq([row({ "Mã NV": "A", "Họ và tên": "A", "Lương thỏa thuận": 10000000, "Lương thời gian": 10000000, "Tổng thu nhập": 10000000, "Thực lĩnh": 10000000 }),
    row({ "Mã NV": "B", "Họ và tên": "B", "Lương thỏa thuận": 10000000, "Lương thời gian": 10000000, "Tổng thu nhập": 10000000, "Thực lĩnh": 10000000 })]);
  const after = kq([row({ "Mã NV": "A", "Họ và tên": "A", "Lương thỏa thuận": 11000000, "Lương thời gian": 11000000, "Tổng thu nhập": 11000000, "Thực lĩnh": 11000000 }),
    row({ "Mã NV": "B", "Họ và tên": "B", "Lương thỏa thuận": 9000000, "Lương thời gian": 9000000, "Tổng thu nhập": 9000000, "Thực lĩnh": 9000000 })]);
  const t1 = CLS.totals(before), t2 = CLS.totals(after);
  assert.equal(t1.thucLinh, t2.thucLinh, "tổng thực lĩnh công ty y nguyên (bù trừ lẫn nhau)");
  assert.equal(t1.soNV, t2.soNV, "số nhân viên y nguyên");
  // CLS.diffDetailed() phải bắt được chênh lệch mà totals() bỏ lỡ
  const rows = CLS.diffDetailed(before, after);
  assert.ok(rows.length > 0, "diffDetailed phải phát hiện chênh lệch dù tổng không đổi");
  const a = rows.filter((r) => r["Mã NV"] === "A"), b = rows.filter((r) => r["Mã NV"] === "B");
  assert.ok(a.some((r) => r["Chỉ tiêu"] === "Thực lĩnh" && r["Chênh lệch"] === 1000000));
  assert.ok(b.some((r) => r["Chỉ tiêu"] === "Thực lĩnh" && r["Chênh lệch"] === -1000000));
});

test("diffDetailed: dữ liệu giống nhau hoàn toàn → không có chênh lệch", () => {
  const r = row({ "Mã NV": "A" });
  assert.deepEqual(CLS.diffDetailed(kq([r]), kq([Object.assign({}, r)])), []);
});

test("diffDetailed: nhân viên mới phát sinh / bị loại khỏi bảng lương được báo riêng", () => {
  const before = kq([row({ "Mã NV": "A" })]);
  const after = kq([row({ "Mã NV": "A" }), row({ "Mã NV": "B", "Họ và tên": "B mới" })]);
  const rows = CLS.diffDetailed(before, after);
  const bRow = rows.find((r) => r["Mã NV"] === "B");
  assert.ok(bRow, "phải báo nhân viên B mới phát sinh");
  assert.equal(bRow["Giá trị tính lại"], "Có trong bảng");
  assert.equal(bRow["Giá trị đang xem"], "");
});

test("diffDetailed: đổi phòng ban (chỉ tiêu dạng chữ) cũng phải phát hiện", () => {
  const before = kq([row({ "Mã NV": "A", "Phòng ban": "01.01" })]);
  const after = kq([row({ "Mã NV": "A", "Phòng ban": "02.01" })]);
  const rows = CLS.diffDetailed(before, after);
  assert.ok(rows.some((r) => r["Chỉ tiêu"] === "Phòng ban" && r["Giá trị đang xem"] === "01.01" && r["Giá trị tính lại"] === "02.01"));
});

test("Closed-period reconciliation uses the snapshot period and top-up method", () => {
  const fs = require("node:fs");
  const vm = require("node:vm");
  const source = fs.readFileSync(require.resolve("../../app.js"), "utf8");
  const start = source.indexOf("  function doiChieu(chot)");
  const handler = source.slice(start, source.indexOf("  function ", start + 3));
  const calls = [];
  const alerts = [];
  const ctx = {
    tinhLuong(...args) { calls.push(args); return { inputErrors: ["Dữ liệu lỗi"] }; },
    kyLabel: String,
    alert: message => alerts.push(message)
  };
  vm.runInNewContext(handler, ctx);
  ctx.doiChieu({ ky: "2026-10", quyChe: "2026", buTheoNgay: "to" });
  ctx.doiChieu({ ky: "2025-12" });
  assert.deepEqual(calls, [[2026, 10, "2026", "to"], [2025, 12, "1.7", false]]);
  assert.equal(alerts.length, 2);
  assert.match(alerts[0], /2026-10.*\nDữ liệu lỗi/);
});

test("Production workbook preserves attendance review and identifies closed payroll sources", async () => {
  const ExcelJS = require("../../exceljs.min.js");
  const { report } = require("../../ui/pbkl-xlsx.js");
  const empty = { byDept: {}, byEmp: {}, dateKeys: [], audit: [], empCount: {} };
  const review = { "Phiếu cân": "PC1", "Người được chia": "NV1 — An", "Người không được chia": "NV2 — Bình" };
  const workbook = report(ExcelJS, {
    sl: empty, bd: empty, raw: {}, attendanceReview: [review],
    ctx: { chot: true, giaKl: 987654 },
    luong: { coChe: "to", note: "Bản chốt", rows: [{ maPB: "T1", ma: "NV1", soCong: null, tan: 1, luongSL: 5000, luongBD: 1000, xe: 1, bu: 0, tong: 6000 }] }
  }, {});
  const reopened = new ExcelJS.Workbook();
  await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
  assert.deepEqual(reopened.getWorksheet("DoiChieuChamCong").getRow(2).values.slice(1), Object.values(review));
  const pay = reopened.getWorksheet("Tien luong va bu luong");
  assert.ok(pay.getColumn(9).values.includes(1000));
  assert.ok(!pay.getColumn(5).values.includes(0));
  const guide = reopened.getWorksheet("Huong dan su dung").getColumn(1).values.join(" ");
  assert.match(guide, /từ bản chốt/);
  assert.match(guide, /phân bổ, đối soát và phiếu gốc cũng lấy từ bản chốt/);
  assert.doesNotMatch(guide, /987[.,]654/);
});

test("Closed-period comparison reports component changes with equal net pay", () => {
  const source = require("node:fs").readFileSync(require.resolve("../../app.js"), "utf8");
  const start = source.indexOf("  function doiChieu(chot)");
  const before = kq([row({ "Tiền tăng ca": 0, "Trừ khác": 0 })]);
  const after = kq([row({ "Tiền tăng ca": 100000, "Trừ khác": 100000 })]);
  let table;
  const ctx = {
    CLS, tinhLuong: () => after, kyLabel: String,
    h: () => ({ appendChild() {} }), modal() {},
    simpleTable(rows) { table = rows; }
  };
  require("node:vm").runInNewContext(source.slice(start, source.indexOf("  function ", start + 3)), ctx);
  ctx.doiChieu({ ky: "2026-10", kq: before });
  assert.deepEqual(Array.from(table, r => r["Chỉ tiêu"]), ["Tiền tăng ca", "Trừ khác"]);
});
