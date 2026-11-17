"use strict";
// Báo cáo cấp phát: Excel và PDF lấy từ CÙNG kết quả với màn hình; có đủ thông tin đầu báo cáo, cột không bị mất, dòng cộng nằm trong bảng. Dữ liệu giả.
const test = require("node:test"), assert = require("node:assert/strict");
const ExcelJS = require("../../exceljs.min.js"), B = require("../../core/benefits.js"), DR = require("../../ui/dispense-report.js"), RX = require("../../ui/report-xlsx.js");
const RH = require("../../core/reporting/report-html.js");

const team = { T1: { code: "T1", name: "Tổ 1 — Đóng gói rất dài để thử cắt tên" } };
const deptOf = () => team.T1;
const db = {
  nhanvien: [{ "Mã NV": "0005", "Họ và tên": "Nguyễn Văn An" }, { "Mã NV": "00123", "Họ và tên": "Trần Thị Bình" }],
  benefitStandards: [], benefitAssignments: [], hopdong: [],
  benefitPpeItems: [{ code: "GIAY", name: "Giày bảo hộ chống trượt", group: "Giày", unit: "đôi", spec: "", active: true, sizes: ["39", "40"] }],
  benefitIssues: [], benefitAdjustments: []
};
const doc = B.buildVoucher(db, { type: "ppe", id: "BH1", date: "2026-11-10", place: "Kho", maker: "hr", lines: [{ employee: "0005", item: "GIAY", size: "40", quantity: 10 }, { employee: "00123", item: "GIAY", size: "39", quantity: 4 }] }, deptOf);
const data = { ...db, benefitIssues: [{ ...doc, status: "issued", reviewer: "boss", confirmedAt: "2026-11-10T08:00:00.000Z" }],
  benefitAdjustments: [{ id: "DC1", ref: "BH1", kind: "recall", reason: "Trả", by: "boss", at: "2026-11-12T08:00:00.000Z", lines: [{ employee: "0005", item: "GIAY", size: "40", quantity: 2 }] }] };
const ctx = (rep, over) => ({ filters: { tu: "2026-11-01", den: "2026-11-30" }, type: "ppe", bySize: true, labels: B.LABEL, fmtDate: (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4), scopeText: "Ngày: 01/11/2026 → 30/11/2026", rep, ...over });
const reports = () => ["summary", "detail"].map((mode) => B.report(data, { type: "ppe", mode, bySize: true, filters: { tu: "2026-11-01", den: "2026-11-30" }, deptOf }));

test("U-DIS-RPT-01 Excel: đầu báo cáo (đơn vị, tên báo cáo, khoảng ngày, phạm vi lọc, ngày xuất), đủ cột, cố định tiêu đề, bộ lọc, dòng cộng trong bảng", async () => {
  for (const rep of reports()) {
    const meta = DR.meta(rep, ctx(rep)), vm = DR.excelVm(rep, meta, { congTy: "CÔNG TY THỬ", user: "hr", now: new Date(2026, 10, 17) });
    const wb = RX.build(ExcelJS, vm, { chuKy: DR.SIGN, nguoiLap: "hr" }), buf = await wb.xlsx.writeBuffer(), re = new ExcelJS.Workbook(); await re.xlsx.load(buf);
    const ws = re.worksheets[0], top = []; ws.eachRow((row, n) => { if (n <= 8) top.push(row.values.filter(Boolean).join(" ")); });
    const head = top.join("\n");
    assert.match(head, /CÔNG TY THỬ/); assert.match(head, /BÁO CÁO CẤP PHÁT/); assert.match(head, /Từ 01\/11\/2026 đến 30\/11\/2026/); assert.match(head, /Phạm vi: .*Bảo hộ lao động.*Ngày: 01\/11\/2026/); assert.match(head, /Ngày lập: 17\/11\/2026/);
    let hr = 0; ws.eachRow((row, n) => { if (!hr && rep.columns.every((c) => row.values.includes(c))) hr = n; });
    assert.ok(hr > 0, "dòng tiêu đề có đủ " + rep.columns.length + " cột: " + rep.columns.join(", "));
    assert.equal(ws.views[0].state, "frozen"); assert.ok(ws.views[0].ySplit >= hr); assert.ok(ws.autoFilter, "có bộ lọc");
    assert.equal(ws.pageSetup.orientation, "landscape"); assert.ok(ws.pageSetup.printTitlesRow, "lặp dòng tiêu đề khi in");
    const body = []; ws.eachRow((row, n) => { if (n > hr && row.getCell(1).value != null && row.getCell(1).value !== "") body.push(row); });
    assert.ok(body.length >= rep.rows.length, "đủ dòng dữ liệu (kể cả dòng cộng)");
    assert.ok(!rep.columns.some((c) => c.charAt(0) === "_") && !JSON.stringify(vm.cols).includes("_voucher"), "không lộ khóa nội bộ");
  }
});

test("U-DIS-RPT-02 Excel và PDF cùng số liệu với bảng trên màn hình (cùng hàm báo cáo): tổng hợp đã cấp 14, thu hồi 2, thực cấp 12; dòng cộng nằm cuối bảng", () => {
  const [summary, detail] = reports(), rows = DR.exportRows(summary);
  assert.equal(rows.length, summary.rows.length);
  const total = rows[rows.length - 1]; assert.deepEqual([total["Đã cấp"], total["Thu hồi"], total["Thực cấp"]], [14, 2, 12]); assert.match(total["Mặt hàng"], /Tổng theo đơn vị tính: đôi/);
  rows.slice(0, -1).forEach((r, i) => assert.deepEqual(r, Object.fromEntries(summary.columns.map((c) => [c, summary.rows[i][c]]))));
  assert.deepEqual(DR.exportRows(detail).map((r) => [r["Lượt"], r["Số lượng"], r["Mã phiếu"]]), detail.rows.map((r) => [r["Lượt"], r["Số lượng"], r["Mã phiếu"]]));
  assert.ok(DR.exportRows(detail).every((r) => !("_voucher" in r)));
});

test("U-DIS-RPT-03 PDF: tên đơn vị, tên báo cáo, kỳ, phạm vi lọc, ngày xuất, tiêu đề cột đủ, tên dài không bị cắt, vùng chữ ký; số 0 đầu của mã NV giữ nguyên", () => {
  for (const rep of reports()) {
    const meta = DR.meta(rep, ctx(rep)), html = RH.sheets(DR.pdfVm(rep, meta, { congTy: "CÔNG TY THỬ", now: new Date(2026, 10, 17) }), { chuKy: DR.SIGN });
    assert.match(html, /CÔNG TY THỬ/); assert.match(html, /BÁO CÁO CẤP PHÁT/); assert.match(html, /Từ 01\/11\/2026 đến 30\/11\/2026/); assert.match(html, /Bộ lọc:.*Bảo hộ lao động/); assert.match(html, /Ngày xuất: 17\/11\/2026/);
    rep.columns.forEach((c) => assert.ok(html.includes("<th>" + c.replace(/&/g, "&amp;") + "</th>"), "thiếu cột " + c));
    assert.match(html, /<thead>/, "tiêu đề bảng nằm trong thead để lặp khi sang trang"); assert.match(html, /Giày bảo hộ chống trượt/); assert.match(html, /Người nhận ký nhận/); assert.match(html, /class="sign"/);
    assert.ok(!/Phần \d+\/\d+/.test(html), "bảng không bị tách phần khiến mất cột");
    if (rep.mode === "detail") { assert.match(html, />0005</); assert.match(html, />00123</); assert.match(html, /Tổ 1 — Đóng gói rất dài để thử cắt tên/); }
  }
});

test("U-DIS-RPT-04 chế độ tổng hợp tách theo cỡ và gộp; tiêu đề nói rõ phạm vi; không có dữ liệu thì PDF báo không có dòng khớp", () => {
  const sep = B.report(data, { type: "ppe", mode: "summary", bySize: true, deptOf }), merged = B.report(data, { type: "ppe", mode: "summary", bySize: false, deptOf });
  assert.ok(sep.columns.includes("Kích cỡ")); assert.ok(!merged.columns.includes("Kích cỡ"));
  assert.match(DR.meta(sep, ctx(sep, { filters: {} })).scope, /tách theo kích cỡ/); assert.equal(DR.meta(sep, ctx(sep, { filters: {} })).ky, "Tất cả thời gian");
  assert.equal(DR.meta(merged, ctx(merged, { filters: { thang: "2026-11" } })).ky, "Tháng hưởng 11/2026");
  const none = B.report(data, { type: "ppe", mode: "summary", filters: { dept: ["KHONGCO"] }, deptOf });
  assert.match(RH.sheets(DR.pdfVm(none, DR.meta(none, ctx(none)), { congTy: "X" }), {}), /Không có dòng nào khớp bộ lọc/);
});
