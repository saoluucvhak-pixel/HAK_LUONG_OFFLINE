// Các báo cáo cần in PDF kèm DÒNG MONG ĐỢI lấy từ dữ liệu báo cáo (không lấy từ HTML) — dùng để so với văn bản trích từ PDF thật. Dữ liệu GIẢ, module thật.
"use strict";
const E = require("../../engine.js"), HR = require("../../hr.js"), FX = require("./build.js");
const OPS = require("../../core/reporting/ops-reports.js"), BH = require("../../core/bh-report.js"), B = require("../../core/benefits.js");
const IPAY = require("../../core/reporting/internal-payroll.js"), RH = require("../../core/reporting/report-html.js"), TRm = require("../../core/reporting/total-row.js");

// ---- định dạng số của bản in (viết lại ĐỘC LẬP với report-html.js để không "tự kiểm chính mình") ----
const grp = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const int = (v) => (v < 0 ? "-" : "") + grp(String(Math.abs(Math.round(v))));
const dec = (v) => { const r = Math.round(Math.abs(v) * 1000) / 1000, [a, b] = String(r).split("."); return (v < 0 ? "-" : "") + grp(a) + (b ? "," + b : ""); };
const cellText = (v, col) => (v == null || v === "" ? null : typeof v === "number" ? (v === 0 ? null : Number.isInteger(v) ? int(v) : dec(v)) : (/^Ngày/.test(String(col || "").trim()) && /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v).slice(8, 10) + "/" + String(v).slice(5, 7) + "/" + String(v).slice(0, 4) : String(v)));

/** Một bảng (như app truyền cho exportSheetsPdf: { name, cols?, rows }) → HTML in thật + dòng mong đợi theo ĐÚNG thứ tự cột của bảng. */
function fromRows(name, title, rows, extra) {
  const cols = (extra && extra.cols) || Object.keys(rows[0] || {}).filter((k) => k.charAt(0) !== "_");
  const html = RH.sheets({ title, ky: "Kỳ 2026-09", congTy: "CÔNG TY TEST", loc: (extra && extra.loc) || [], sheets: [{ name: "S", cols, rows }] }, {});
  const expect = rows.map((r) => cols.map((c) => cellText(r[c], c)).filter((x) => x != null));
  return { name, title, html, expect, wide: cols.length > 16 };
}

// ---- dữ liệu như bộ test đối chiếu báo cáo vận hành ----
function opsDb() {
  const db = FX.baseDb();
  [["NV001", "Nguyễn Văn Ánh", "01.01"], ["NV002", "Trần Thị Bích", "01.01"], ["NV003", "Lê Đức Cường", "02.01"], ["TỔNG-04", "Phạm Văn Dũng", "02.01"]].forEach(([ma, ten, pb], i) => {
    db.nhanvien.push({ "Mã NV": ma, "Họ và tên": ten, "Trạng thái": "Đang làm việc" });
    db.hopdong.push({ "Mã NV": ma, "Số HĐLĐ": ma + "/HĐ01", "Ngày vào làm": "2025-0" + (i + 1) + "-01", "Hình thức HĐLĐ": "Xác định thời hạn", "Ngày hết hạn": "2027-12-31" });
    db.chitiethd.push({ "Mã NV": ma, "Số HĐLĐ": ma + "/HĐ01", "Hiệu lực từ": "2025-01-01", "Phòng ban": pb, "Chức vụ": "8", "Vị trí việc làm": "Công nhân", "Lương thỏa thuận": "9999999" });
    db.canhan.push({ "Mã NV": ma, "Hiệu lực từ": "2025-01-01", "Giới tính": i % 2 ? "Nữ" : "Nam", "Ngày sinh": "1990-0" + (i + 1) + "-15", "Số CCCD": "079000000" + i });
  });
  db.sanluong.push({ "Phiếu cân": "P1", "Ngày cân": "2026-09-02", "Biển số": "43C-1", "KL hàng (Tấn)": "28,345", "Mã NV": "NV001" }, { "Phiếu cân": "P2", "Ngày cân": "2026-09-03", "Biển số": "43C-2", "KL hàng (Tấn)": "30", "Mã NV": "NV003" }, { "Phiếu cân": "P3", "Ngày cân": "2026-09-04", "Biển số": "43C-3", "KL hàng (Tấn)": "10", "Mã NV": "TỔNG-04" });
  db.bandam.push({ "Phiếu cân": "B1", "Ngày cân": "2026-09-10", "KL hàng (Tấn)": "1", "Mã NV": "NV003" }, { "Phiếu cân": "B2", "Ngày cân": "2026-09-11", "KL hàng (Tấn)": "2", "Mã NV": "NV001" });
  db.psluong.push({ "Ngày hạch toán": "2026-09-30", "Số chứng từ": "QĐ-1", "Mã NV": "NV001", "Diễn giải": "Chuyên cần", "Thưởng": 500000, "Thu nhập khác": 100000, "Trừ khác": 50000 }, { "Ngày hạch toán": "2026-09-15", "Số chứng từ": "QĐ-2", "Mã NV": "TỔNG-04", "Diễn giải": "Lễ", "Thưởng": 200000, "Thu nhập khác": 0, "Trừ khác": 0 });
  db.ungluong.push({ "Ngày hạch toán": "2026-09-05", "Số chứng từ": "PC-1", "Mã NV": "NV001", "Diễn giải": "Kỳ 1", "Tạm ứng": 2000000 }, { "Ngày hạch toán": "2026-09-21", "Số chứng từ": "PC-3", "Mã NV": "TỔNG-04", "Tạm ứng": 800000 });
  db.tiencom.push({ "Ngày": "2026-09-05", "Mã NV": "NV001", "Số suất cơm": 2, "Ghi chú": "Ca ngày" }, { "Ngày": "2026-09-06", "Mã NV": "NV003", "Số suất cơm": 1, "Ghi chú": "Ca đêm" });
  return db;
}
const bl = [{ "Mã NV": "NV001", "Thưởng": 500000, "Thu nhập khác": 100000, "Trừ khác": 50000, "Tổng thu nhập": 9000000, "Thực lĩnh": 8000000, "Tạm ứng": 2000000 }, { "Mã NV": "TỔNG-04", "Thưởng": 200000, "Thu nhập khác": 0, "Trừ khác": 0, "Tổng thu nhập": 7000000, "Thực lĩnh": 6000000, "Tạm ứng": 800000 }];
const opsBase = (extra) => Object.assign({ nam: 2026, thang: 9, tenCongTy: "CÔNG TY TEST", ngay: "01/10/2026", nguoiLap: "ketoan", hr: HR, num: E.num, money: E.money, homNay: "2026-10-14", bangluong: bl }, extra || {});

// ---- bảo hiểm ----
const bhRow = (ma, pb, luong, du) => {
  const r = { "Mã NV": ma, "Họ và tên": ma + " Tên", "Phòng ban": pb, "Lương đóng BHXH": luong, "CTY.BHXH": luong * 0.175, "CTY.BHYT": luong * 0.03, "CTY.BHTN": luong * 0.01, "CTY.KPCĐ": luong * 0.02, "NLĐ.BHXH": luong * 0.08, "NLĐ.BHYT": luong * 0.015, "NLĐ.BHTN": luong * 0.01 };
  r["Cộng BH công ty đóng"] = r["CTY.BHXH"] + r["CTY.BHYT"] + r["CTY.BHTN"] + r["CTY.KPCĐ"]; r["Cộng BH NLĐ đóng"] = r["NLĐ.BHXH"] + r["NLĐ.BHYT"] + r["NLĐ.BHTN"];
  r["Truy thu bảo hiểm"] = du ? 0 : r["Cộng BH công ty đóng"]; r["Ghi chú"] = du ? "Đủ ngưỡng" : "Chưa đủ ngưỡng (2/14 công)"; return r;
};
const bhKq = { bhxh: [bhRow("NV001", "Văn phòng", 6000000, true), bhRow("NV002", "Xưởng", 5000000, true), bhRow("TỔNG-03", "Xưởng", 4000000, false), bhRow("00123", "Văn phòng", 4500000, true)] };

// ---- cấp phát ----
function dispenseReport(mode) {
  const team = { T1: { code: "T1", name: "Tổ 1" } }, deptOf = () => team.T1;
  const db = { nhanvien: [{ "Mã NV": "0005", "Họ và tên": "Nguyễn Văn An" }, { "Mã NV": "00123", "Họ và tên": "Trần Thị Bình" }], benefitStandards: [], benefitAssignments: [], hopdong: [],
    benefitPpeItems: [{ code: "GIAY", name: "Giày", group: "Giày", unit: "đôi", spec: "", active: true, sizes: ["39", "40"] }, { code: "NON", name: "Nón", group: "Nón", unit: "cái", spec: "", active: true, sizes: [] }], benefitIssues: [], benefitAdjustments: [] };
  const doc = B.buildVoucher(db, { type: "ppe", id: "BH1", date: "2026-11-10", place: "Kho", maker: "hr", lines: [{ employee: "0005", item: "GIAY", size: "40", quantity: 10 }, { employee: "00123", item: "GIAY", size: "39", quantity: 3 }, { employee: "00123", item: "NON", size: "", quantity: 4 }] });
  const data = Object.assign({}, db, { benefitIssues: [Object.assign({}, doc, { status: "issued", reviewer: "boss", confirmedAt: "2026-11-10T08:00:00.000Z" })], benefitAdjustments: [{ id: "DC1", ref: "BH1", kind: "recall", reason: "Trả", by: "boss", at: "2026-11-12T08:00:00.000Z", lines: [{ employee: "0005", item: "GIAY", size: "40", quantity: 2 }] }] });
  return B.report(data, { type: "ppe", mode, bySize: true, filters: { tu: "2026-11-01", den: "2026-11-30" }, deptOf });
}

// ---- bảng lương nội bộ (nhóm theo phòng ban) ----
function payrollCase() {
  const db = FX.baseDb(); db.nhansu = [FX.staff({ "Mã nhân viên": "N1", "Họ và tên": "Nguyễn Thị Đào", "Mã tiền lương 1": "TG1", "Lương thỏa thuận": "9000000", "Mã PB": "01.01", "Mã hỗ trợ": "HT.01", "Mã BHXH": "BH01", "Lương cơ bản": "5000000" }), FX.staff({ "Mã nhân viên": "N2", "Họ và tên": "Đỗ Văn Hai", "Mã tiền lương 1": "TG1", "Lương thỏa thuận": "9000000", "Mã PB": "01.06" })];
  db.chamcong = ["N1", "N2"].map((m) => FX.ccRow(m, 2026, 9, "BT", 1, 20)).concat([FX.ccRow("N1", 2026, 9, "CC", 1, 10)]);
  db.psluong = [{ "Ngày hạch toán": "2026-09-28", "Mã NV": "N1", "Thưởng": "500000", "Thu nhập khác": "0", "Trừ khác": "100000" }];
  const kq = E.tinhBangLuong(db, 2026, 9, false), vm = IPAY.build(kq, { nam: 2026, thang: 9, tenCongTy: "CÔNG TY TEST" });
  const html = RH.table(vm, { chuKy: ["Người lập"] }), cols = vm.cols.filter((c) => !(c.key === "Phòng ban" && vm.groups && vm.groups.length));
  const expect = []; vm.groups.forEach((g) => g.rows.forEach((r) => expect.push(cols.map((c) => cellText(c.kind === "money" || c.kind === "qty" ? (c.kind === "money" ? Math.round(+r[c.key] || 0) : +r[c.key]) : r[c.key])).filter((x) => x != null))));
  return { name: "Bảng lương nội bộ (nhóm phòng ban)", title: vm.title, html, expect, wide: false };
}

function cases() {
  const out = [];
  for (const type of ["NHAN_SU", "SAN_LUONG", "BOM_DAM", "THUONG", "TAM_UNG", "SUAT_COM"]) for (const [lab, extra] of [["không lọc", {}], ["lọc từ khóa NV001", { tuKhoa: "NV001" }]]) {
    const vm = OPS.build(type, opsDb(), opsBase(extra));
    OPS.toSheets(vm).forEach((sh, i) => { if (sh.rows.length) out.push(fromRows("Vận hành " + type + " (" + lab + ")" + (i ? " — " + sh.name : ""), vm.title, sh.rows, { cols: sh.cols, loc: vm.loc })); }); // đúng như app: OPS.toSheets (có cols tường minh)
  }
  const ct = BH.chiTiet(bhKq), pb = BH.theoPhongBan(bhKq), th = BH.tongHop(bhKq).rows;
  out.push(fromRows("Bảo hiểm — chi tiết", "Báo cáo bảo hiểm chi tiết", ct), fromRows("Bảo hiểm — theo phòng ban", "Báo cáo bảo hiểm theo phòng ban", pb), fromRows("Bảo hiểm — tổng hợp theo khoản", "Báo cáo bảo hiểm tổng hợp", th));
  for (const mode of ["summary", "detail"]) { const r = dispenseReport(mode); out.push(fromRows("Cấp phát — " + (mode === "summary" ? "tổng hợp" : "chi tiết"), "Báo cáo cấp phát", r.rows.filter((x) => !TRm.is(x)), { cols: r.columns })); }
  out.push(payrollCase());
  return out;
}
module.exports = { cases, cellText };
