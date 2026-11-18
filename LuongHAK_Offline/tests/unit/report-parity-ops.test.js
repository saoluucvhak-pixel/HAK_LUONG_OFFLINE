// Đối chiếu bảng ↔ Excel ↔ HTML in cho báo cáo VẬN HÀNH (nhân sự, sản lượng, bơm dăm, thưởng/trừ, tạm ứng, suất cơm), có và không có bộ lọc.
// Kiểm từng dòng, từng cột tiền (tổng = cộng các dòng), không chấp nhận tổng khớp nhờ sai lệch bù nhau. Dữ liệu giả; module thật.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const X = require("../../exceljs.min.js");
const E = require("../../engine.js");
const HR = require("../../hr.js");
const FX = require("../fixtures/build.js");
const OPS = require("../../core/reporting/ops-reports.js");
const RX = require("../../ui/report-xlsx.js");
const RH = require("../../core/reporting/report-html.js");

const PB1 = "01.01", PB2 = "02.01";
function mkDb() {
  const db = FX.baseDb();
  [["NV001", "Nguyễn Văn A", PB1], ["NV002", "Trần Thị B", PB1], ["NV003", "Lê Văn C", PB2], ["TỔNG-04", "Phạm Văn D", PB2]].forEach(([ma, ten, pb], i) => {
    db.nhanvien.push({ "Mã NV": ma, "Họ và tên": ten, "Trạng thái": "Đang làm việc" });
    db.hopdong.push({ "Mã NV": ma, "Số HĐLĐ": ma + "/HĐ01", "Ngày vào làm": "2025-0" + (i + 1) + "-01", "Hình thức HĐLĐ": "Xác định thời hạn", "Ngày hết hạn": "2027-12-31" });
    db.chitiethd.push({ "Mã NV": ma, "Số HĐLĐ": ma + "/HĐ01", "Hiệu lực từ": "2025-01-01", "Phòng ban": pb, "Chức vụ": "8", "Vị trí việc làm": "Công nhân", "Lương thỏa thuận": "9999999" });
    db.canhan.push({ "Mã NV": ma, "Hiệu lực từ": "2025-01-01", "Giới tính": i % 2 ? "Nữ" : "Nam", "Ngày sinh": "1990-0" + (i + 1) + "-15", "Số CCCD": "079000000" + i });
  });
  db.sanluong.push(
    { "Phiếu cân": "P1", "Ngày cân": "2026-09-02", "Biển số": "43C-1", "KL hàng (Tấn)": "28,345", "Mã NV": "NV001" },
    { "Phiếu cân": "P2", "Ngày cân": "2026-09-03", "Biển số": "43C-2", "KL hàng (Tấn)": "30", "Mã NV": "NV003" },
    { "Phiếu cân": "P3", "Ngày cân": "2026-09-04", "Biển số": "43C-3", "KL hàng (Tấn)": "10", "Mã NV": "TỔNG-04" });
  db.bandam.push({ "Phiếu cân": "B1", "Ngày cân": "2026-09-10", "KL hàng (Tấn)": "1", "Mã NV": "NV003" }, { "Phiếu cân": "B2", "Ngày cân": "2026-09-11", "KL hàng (Tấn)": "2", "Mã NV": "NV001" });
  db.psluong.push(
    { "Ngày hạch toán": "2026-09-30", "Số chứng từ": "QĐ-1", "Mã NV": "NV001", "Diễn giải": "Chuyên cần", "Thưởng": 500000, "Thu nhập khác": 100000, "Trừ khác": 50000 },
    { "Ngày hạch toán": "2026-09-15", "Số chứng từ": "QĐ-2", "Mã NV": "TỔNG-04", "Diễn giải": "Lễ", "Thưởng": 200000, "Thu nhập khác": 0, "Trừ khác": 0 });
  db.ungluong.push(
    { "Ngày hạch toán": "2026-09-05", "Số chứng từ": "PC-1", "Mã NV": "NV001", "Diễn giải": "Kỳ 1", "Tạm ứng": 2000000 },
    { "Ngày hạch toán": "2026-09-21", "Số chứng từ": "PC-3", "Mã NV": "TỔNG-04", "Tạm ứng": 800000 });
  return db;
}
const bl = [{ "Mã NV": "NV001", "Thưởng": 500000, "Thu nhập khác": 100000, "Trừ khác": 50000, "Tổng thu nhập": 9000000, "Thực lĩnh": 8000000, "Tạm ứng": 2000000 }, { "Mã NV": "TỔNG-04", "Thưởng": 200000, "Thu nhập khác": 0, "Trừ khác": 0, "Tổng thu nhập": 9000000, "Thực lĩnh": 8000000, "Tạm ứng": 800000 }];
const base = (extra) => Object.assign({ nam: 2026, thang: 9, tenCongTy: "CÔNG TY TEST", ngay: "01/10/2026", nguoiLap: "ketoan", hr: HR, num: E.num, money: E.money, homNay: "2026-10-14", bangluong: bl }, extra || {});

const cellValues = (ws) => { const out = []; ws.eachRow((row) => row.eachCell((c) => { const v = c.value; out.push(v && typeof v === "object" && "result" in v ? v.result : v); })); return out; };
const str = (v) => (v == null ? "" : String(v));

for (const type of ["NHAN_SU", "SAN_LUONG", "BOM_DAM", "THUONG", "TAM_UNG", "SUAT_COM"]) {
  for (const [label, extra] of [["không lọc", {}], ["lọc từ khóa NV001", { tuKhoa: "NV001" }]]) {
    test("U-PARITY-OPS-" + type + " (" + label + "): dòng bảng = Excel = HTML; tổng từng cột tiền = cộng các dòng", () => {
      const db = mkDb(), vm = OPS.build(type, db, base(extra));
      assert.equal(vm.soDong, vm.rows.length, "soDong = số dòng bảng");
      // 1) tổng từng cột tiền = cộng đúng các dòng (không bù trừ)
      for (const c of vm.cols.filter((c) => c.kind === "money" && vm.tong && vm.tong[c.key] != null)) {
        const sum = vm.rows.reduce((a, r) => a + (+r[c.key] || 0), 0);
        assert.ok(Math.abs(sum - vm.tong[c.key]) < 1e-6, type + " cột '" + c.label + "': tổng " + vm.tong[c.key] + " ≠ cộng dòng " + sum);
      }
      // 2) Excel: mọi giá trị chữ/tiền của từng dòng có mặt trong sheet đầu
      const wb = RX.build(X, vm, { chuKy: vm.chuKy }), vals = cellValues(wb.worksheets[0]);
      const have = new Set(vals.map(str));
      for (const r of vm.rows) for (const c of vm.cols) {
        const v = r[c.key]; if (v == null || v === "" || c.label === "STT") continue;
        if (typeof v === "string" && /^\d{4}-\d\d-\d\d$/.test(v)) { // ngày ISO: Excel hiển thị dd/mm/yyyy hoặc giữ kiểu ngày
          const [y, m, d] = v.split("-"), vn = d + "/" + m + "/" + y;
          assert.ok(have.has(v) || have.has(vn) || vals.some((x) => x instanceof Date && x.toISOString().slice(0, 10) === v), type + ": ngày '" + v + "' (cột " + c.label + ") thiếu trong Excel");
          continue;
        }
        assert.ok(have.has(str(v)) || (typeof v === "number" && vals.some((x) => typeof x === "number" && Math.abs(x - v) < 1e-6)), type + ": giá trị '" + v + "' (cột " + c.label + ") thiếu trong Excel");
      }
      // 3) tổng hiển thị trong Excel khớp vm.tong
      for (const c of vm.cols.filter((c) => c.kind === "money" && vm.tong && vm.tong[c.key] != null)) {
        assert.ok(vals.some((x) => typeof x === "number" && Math.abs(x - vm.tong[c.key]) < 1e-6) || vm.rows.length === 0, type + ": tổng '" + c.label + "' thiếu trong Excel");
      }
      // 4) HTML in dựng từ cùng dữ liệu: có từng mã dòng văn bản, và không còn dòng nào ngoài bảng
      const html = RH.sheets({ title: vm.title, ky: vm.kyText || "", loc: vm.loc || [], sheets: [{ name: "S", rows: OPS.toRows(vm) }] }, {});
      for (const r of vm.rows) for (const c of vm.cols.filter((c) => c.kind === "text")) { const v = r[c.key]; if (v) assert.ok(html.includes(String(v).replace(/&/g, "&amp;")), type + ": '" + v + "' thiếu trong HTML in"); }
      // 5) số dòng dữ liệu trong bản xuất (trừ dòng tổng) = số dòng bảng
      const ex = OPS.toRows(vm), TRm = require("../../core/reporting/total-row.js");
      assert.equal(ex.filter((r) => !TRm.is(r)).length, vm.rows.length, type + ": số dòng xuất ≠ số dòng bảng");
    });
  }
}

test("U-PARITY-OPS-LOC: lọc không làm mất dòng thật 'TỔNG-04' (C01) ở báo cáo vận hành", () => {
  const db = mkDb();
  for (const type of ["SAN_LUONG", "THUONG", "TAM_UNG"]) {
    const vm = OPS.build(type, db, base({ tuKhoa: "TỔNG-04" }));
    assert.ok(vm.rows.length >= 1, type + ": 'TỔNG-04' phải còn sau khi lọc theo chính mã đó");
  }
});
