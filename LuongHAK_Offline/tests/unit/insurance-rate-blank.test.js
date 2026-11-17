"use strict";
// Tỷ lệ bảo hiểm NLĐ: ô TRỐNG ≠ 0. Ở mã bảo hiểm đang dùng trong kỳ và có căn cứ đóng, ô trống chặn chốt kỳ; 0 / 0% khai rõ thì được.
// Không đổi cách engine đọc tỷ lệ, công thức, ngưỡng công, truy thu. Dữ liệu giả.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const E = require("../../engine.js"), HR = require("../../hr.js"), G = require("../../core/payroll-gate.js");
const PG = require("../../main/payroll-gate.js");
const { baseDb, ccRow, regressionDataset } = require("../fixtures/build.js");

const clone = (o) => JSON.parse(JSON.stringify(o));
const bhRow = (code, over, from) => Object.assign({ "Mã bảo hiểm": code, "Nội dung": "thử", "DN.BHXH": 0.175, "DN.BHYT": 0.03, "DN.BHTN": 0.01, "DN.KPCD": 0.02,
  "NLD.BHXH": 0.08, "NLD.BHYT": 0.015, "NLD.BHTN": 0.01, "NLD.KPCD": 0, "Hiệu lực từ": from || "2020-01-01" }, over || {});
const person = (ma, ten, code, base) => ({ ma, ten, code, base });
function dataset(catalog, people) {
  const db = baseDb();
  db.dm_baohiem = catalog;
  people = people || [person("NV1", "Nguyễn A", "BHT", "5000000")];
  people.forEach((p) => {
    db.nhanvien.push({ "Mã NV": p.ma, "Họ và tên": p.ten, "Trạng thái": "Đang làm việc" });
    db.hopdong.push({ "Mã NV": p.ma, "Số HĐLĐ": "H-" + p.ma, "Ngày vào làm": "2025-01-01", "Hình thức HĐLĐ": "Xác định thời hạn" });
    db.chitiethd.push({ "Mã NV": p.ma, "Số HĐLĐ": "H-" + p.ma, "Hiệu lực từ": "2025-01-01", "Phòng ban": "01.01", "Chức vụ": "8", "Mã lương": "TG1",
      "Lương thỏa thuận": "10000000", "Lương cơ bản": p.base, "Mức đóng bảo hiểm": p.code, "Thuế TNCN": "MT00", "HTTT": "Chuyển khoản" });
    db.chamcong.push(ccRow(p.ma, 2026, 9, "BT", 1, 24));
  });
  return db;
}
// Cùng thứ tự renderer (app-src/16-tinh-luong.js) và tiến trình chính (main/payroll-gate.js): tính bảng lương, rồi gắn kết quả kiểm tra tỷ lệ.
function run(db, nam, thang) {
  nam = nam || 2026; thang = thang || 9;
  const sp = HR.staffForPayroll(db, nam, thang), kq = E.tinhBangLuong(Object.assign({}, db, { nhansu: sp.list }), nam, thang, false);
  kq.loiTyLeBH = G.insuranceRateIssues({ kq, staff: sp.list, catalog: E.hieuLuc(db.dm_baohiem, "Mã bảo hiểm", nam, thang) });
  return kq;
}
const nld = (kq, ma, part) => kq.bhxh.find((r) => r["Mã NV"] === ma)["NLĐ." + part];
const codes = (kq) => G.blockers(kq).map((b) => b.code);

test("U-BH-BLANK-01 ca bắt buộc: căn cứ đóng 5.000.000đ, BHYT NLĐ 1,5% → khoản trừ 75.000đ, không bị chặn", () => {
  const kq = run(dataset([bhRow("BHT")]));
  assert.equal(nld(kq, "NV1", "BHYT"), 75000); assert.equal(nld(kq, "NV1", "BHXH"), 400000); assert.equal(nld(kq, "NV1", "BHTN"), 50000);
  assert.deepEqual(kq.loiTyLeBH, []); assert.deepEqual(codes(kq), []);
});

test("U-BH-BLANK-02 ca bắt buộc: xóa tỷ lệ → lỗi chặn nêu mã bảo hiểm, tên cột và người bị ảnh hưởng; engine vẫn đọc ô trống như cũ", () => {
  for (const blank of ["", "   ", null, undefined]) {
    const kq = run(dataset([bhRow("BHT", { "NLD.BHYT": blank })]));
    assert.equal(nld(kq, "NV1", "BHYT"), 0, "cách đọc tỷ lệ của engine giữ nguyên: ô trống ra 0đ");
    assert.deepEqual(codes(kq), ["BH_TY_LE_THIEU"], "chặn chốt kỳ: " + JSON.stringify(blank));
    const item = G.blockers(kq)[0].items[0];
    assert.match(item, /Mã bảo hiểm 'BHT'/); assert.match(item, /cột NLD\.BHYT/); assert.match(item, /NV1 Nguyễn A/); assert.match(item, /Ảnh hưởng 1 người/);
  }
  const all = run(dataset([bhRow("BHT", { "NLD.BHXH": "", "NLD.BHYT": "", "NLD.BHTN": "" })]));
  assert.deepEqual(all.loiTyLeBH.map((m) => /cột (NLD\.\w+)/.exec(m)[1]), ["NLD.BHXH", "NLD.BHYT", "NLD.BHTN"], "mỗi cột thiếu một dòng");
});

test("U-BH-BLANK-03 ca bắt buộc: nhập 0 / 0% / '0' / '0,0%' khai rõ → 0đ và không bị chặn", () => {
  for (const zero of [0, "0", "0%", "0,0%", "0.0"]) {
    const kq = run(dataset([bhRow("BHT", { "NLD.BHYT": zero })]));
    assert.equal(nld(kq, "NV1", "BHYT"), 0, "0đ với " + JSON.stringify(zero));
    assert.deepEqual(codes(kq), [], "khai 0 rõ ràng không bị chặn: " + JSON.stringify(zero));
  }
  const raw = run(dataset([bhRow("BHT", { "NLD.BHYT": "1,5%" })]));
  assert.equal(nld(raw, "NV1", "BHYT"), 75000, "cách đọc tỷ lệ hợp lệ giữ nguyên (1,5%)");
});

test("U-BH-BLANK-04 ca bắt buộc: danh mục không dùng trong kỳ, người không có căn cứ đóng, bản cũ hết hiệu lực không chặn kỳ", () => {
  // mã không ai dùng, để trống nhiều cột
  let kq = run(dataset([bhRow("BHT"), bhRow("CU", { "NLD.BHXH": "", "NLD.BHYT": "", "NLD.BHTN": "" })]));
  assert.deepEqual(codes(kq), []);
  // người không khai mã bảo hiểm nào (không dùng mã BHT): mã BHT trống tỷ lệ không chặn
  kq = run(dataset([bhRow("BHT", { "NLD.BHYT": "" })], [person("NV1", "Nguyễn A", "", "5000000")]));
  assert.deepEqual(codes(kq), []);
  // phiên bản cũ (trống) đã hết hiệu lực; phiên bản đang hiệu lực đủ tỷ lệ
  kq = run(dataset([bhRow("BHT", { "NLD.BHYT": "", "Hiệu lực đến": "2025-12-31" }, "2020-01-01"), bhRow("BHT", {}, "2026-01-01")]));
  assert.equal(nld(kq, "NV1", "BHYT"), 75000); assert.deepEqual(codes(kq), []);
  // ngược lại: phiên bản đang hiệu lực trong kỳ bị trống thì chặn
  kq = run(dataset([bhRow("BHT", {}, "2020-01-01"), bhRow("BHT", { "NLD.BHTN": "" }, "2026-01-01")]));
  assert.deepEqual(codes(kq), ["BH_TY_LE_THIEU"]);
  // chỉ xét phía NLĐ: tỷ lệ công ty và KPCĐ để trống không bị chặn bởi luật này
  kq = run(dataset([bhRow("BHT", { "DN.BHXH": "", "DN.BHYT": "", "NLD.KPCD": "", "DN.KPCD": "" })]));
  assert.deepEqual(codes(kq), []);
});

test("U-BH-BLANK-05 nhiều người, nhiều mã: chỉ người dùng mã thiếu mới bị nêu; danh sách đủ tên", () => {
  const db = dataset([bhRow("BHT"), bhRow("BHX", { "NLD.BHTN": "" })], [person("NV1", "Nguyễn A", "BHT", "5000000"), person("NV2", "Trần B", "BHX", "6000000"), person("NV3", "Lê C", "BHX", "7000000")]);
  const kq = run(db);
  assert.equal(kq.loiTyLeBH.length, 1);
  assert.match(kq.loiTyLeBH[0], /'BHX'.*NLD\.BHTN.*Ảnh hưởng 2 người: NV2 Trần B, NV3 Lê C/);
  assert.doesNotMatch(kq.loiTyLeBH[0], /NV1/);
});

test("U-BH-BLANK-06 tiến trình chính tự tính lại và chặn (không tin renderer); điền đủ tỷ lệ thì hết chặn", () => {
  const db = clone(regressionDataset(5));
  const bh = db.dm_baohiem.find((r) => r["Mã bảo hiểm"] === "BH01");
  const blockers = () => PG.blockers(clone(db), "2026-09", {}).map((b) => b.code);
  const before = blockers();
  assert.ok(!before.includes("BH_TY_LE_THIEU"), "dữ liệu đủ tỷ lệ: không chặn");
  bh["NLD.BHXH"] = "";
  const mid = PG.blockers(clone(db), "2026-09", {}).find((b) => b.code === "BH_TY_LE_THIEU");
  assert.ok(mid, "xóa tỷ lệ BHXH NLĐ của BH01 → main chặn"); assert.match(mid.items.join("\n"), /Mã bảo hiểm 'BH01'.*cột NLD\.BHXH/);
  bh["NLD.BHXH"] = 0;
  assert.ok(!blockers().includes("BH_TY_LE_THIEU"), "khai 0 rõ ràng: hết chặn");
});

test("U-BH-BLANK-07 kỳ đã chốt không bị kiểm lại theo danh mục hiện tại; giao diện gắn kiểm tra vào lần tính và hiện ở màn Kiểm tra bảng lương", () => {
  assert.deepEqual(G.blockers({ bangluong: [], bhxh: [] }).map((b) => b.code), [], "bản chốt đã lưu không có loiTyLeBH");
  const src = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8");
  assert.match(src, /var bl = src\.chot \? \[\] : GATE\.blockers\(src\.kq\);/, "kỳ đã chốt: không gọi cổng chặn");
  assert.match(src, /kq\.loiTyLeBH = GATE\.insuranceRateIssues\(\{ kq: kq, staff: sp\.list, catalog: E\.hieuLuc\(db\.dm_baohiem, "Mã bảo hiểm", nam, thang\) \}\)/);
  assert.match(src, /\(kq\.loiTyLeBH \|\| \[\]\)\.forEach\(function \(message, i\) \{[\s\S]*?muc: "ERROR"[\s\S]*?"dm_baohiem"/);
  assert.match(fs.readFileSync(path.join(__dirname, "../../main/payroll-gate.js"), "utf8"), /kq\.loiTyLeBH = GATE\.insuranceRateIssues\(/);
});
