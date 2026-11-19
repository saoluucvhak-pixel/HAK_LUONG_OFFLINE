"use strict";
// 012-B1 (issue #113, CEO /giao 012-B): lõi THUẦN của sao lưu/khôi phục THEO KỲ LƯƠNG — phân loại bảng, cắt lát kỳ, kế hoạch khôi phục, áp dụng. Không I/O, dữ liệu giả.
const test = require("node:test"), assert = require("node:assert/strict");
const REPO = require("../../core/repository.js"), P = REPO.period, DG = require("../../main/data-digest.js");
const clone = (x) => JSON.parse(JSON.stringify(x));

// ---- dữ liệu giả: 3 kỳ (08 đã chốt, 09 = kỳ sao lưu, 10 chưa chốt) ----
function mk() {
  const d = {
    nhanvien: [{ "Mã NV": "A", "Họ và tên": "An" }, { "Mã NV": "B", "Họ và tên": "Bình" }, { "Mã NV": "C", "Họ và tên": "Cường" }],
    hopdong: [{ "Mã NV": "A", "Số HĐLĐ": "A/1" }, { "Mã NV": "B", "Số HĐLĐ": "B/1" }],
    chitiethd: [{ "Mã NV": "A", "Số HĐLĐ": "A/1", "Hiệu lực từ": "2026-01-01", "Mã lương": "L1", "Phòng ban": "P1" }, { "Mã NV": "B", "Số HĐLĐ": "B/1", "Hiệu lực từ": "2026-01-01", "Mã lương": "L1", "Phòng ban": "P1" }],
    nhanthan: [], thanhtoan: [], canhan: [],
    dm_luong: [{ "Mã lương": "L1", "Số tiền khoán": 100, "Hiệu lực từ": "2026-01-01" }, { "Mã lương": "L2", "Số tiền khoán": 200, "Hiệu lực từ": "2026-01-01" }],
    dm_phongban: [{ "Mã phòng ban": "P1", "Tên phòng ban": "Tổ 1", "Hiệu lực từ": "2026-01-01" }],
    chamcong: [{ "Kỳ": "2026-08", "Mã NV": "A", "Hình thức công": "BT", "01": 1 }, { "Kỳ": "2026-09", "Mã NV": "A", "Hình thức công": "BT", "01": 1 }, { "Kỳ": "2026-09", "Mã NV": "B", "Hình thức công": "BT", "01": 1 }, { "Kỳ": "2026-10", "Mã NV": "B", "Hình thức công": "BT", "01": 1 }],
    sanluong: [{ "Phiếu cân": "PC1", "Ngày cân": "2026-09-05", "Mã NV": "A", "KL hàng (Tấn)": 10 }, { "Phiếu cân": "PC2", "Ngày cân": "2026-10-05", "Mã NV": "A", "KL hàng (Tấn)": 7 }],
    bandam: [], psluong: [{ "Ngày hạch toán": "2026-09-10", "Số chứng từ": "T1", "Mã NV": "B", "Thưởng": 50 }], ungluong: [], tiencom: [{ "Ngày": "2026-09-02", "Mã NV": "A", "Số suất cơm": 2 }, { "Ngày": "2026-08-02", "Mã NV": "A", "Số suất cơm": 1 }],
    kyluong: [{ ky: "2026-08", version: 1, kq: { bangluong: [{ "Mã NV": "A", "Thực lĩnh": 1000, "Tổng thu nhập": 1200 }] } }], kyluong_lichsu: [],
    payrollApprovals: [{ ky: "2026-09", status: "draft" }], _inputReviews: [{ table: "chamcong", period: "2026-09", kind: "", rows: [] }, { table: "chamcong", period: "2026-10", kind: "", rows: [] }],
    productionAttendance: [{ date: "2026-09-03", ma: "A" }, { date: "2026-10-03", ma: "A" }],
    sl_chuyenky: [{ source: "2026-08", target: "2026-09", id: "x1" }, { source: "2026-09", target: "2026-10", id: "x2" }],
    auditlog: [{ t: 1 }], nguoidung: [{ u: "admin" }], benefitIssues: [{ id: "b1" }]
  };
  return d;
}
const ids = (rows) => rows.map((r) => JSON.stringify(r)).sort();

test("U-PRD-01 phân loại: nhóm kỳ = đúng 12 bảng; nhóm toàn bộ = nhân sự + dm_*; hệ thống (auditlog, nguoidung, benefit*) KHÔNG nằm trong gói", () => {
  assert.deepEqual(P.PERIOD_TABLES.slice().sort(), ["_inputReviews", "bandam", "chamcong", "kyluong", "kyluong_lichsu", "payrollApprovals", "productionAttendance", "psluong", "sanluong", "sl_chuyenky", "tiencom", "ungluong"].sort());
  const s = P.slice(mk(), "2026-09");
  assert.deepEqual(Object.keys(s.global).sort(), ["canhan", "chitiethd", "dm_luong", "dm_phongban", "hopdong", "nhanthan", "nhanvien", "thanhtoan"]);
  ["auditlog", "nguoidung", "benefitIssues"].forEach((t) => { assert.equal(t in s.period, false); assert.equal(t in s.global, false); });
});
test("U-PRD-02 cắt lát kỳ 2026-09 theo rowInKy; sl_chuyenky chỉ target === kỳ; dòng source === kỳ (target khác) chỉ để so sánh (refOnly)", () => {
  const s = P.slice(mk(), "2026-09");
  assert.equal(s.period.chamcong.length, 2); assert.equal(s.period.sanluong.length, 1); assert.equal(s.period.tiencom.length, 1); assert.equal(s.period.psluong.length, 1);
  assert.deepEqual(s.period.sl_chuyenky.map((r) => r.id), ["x1"]); assert.deepEqual(s.refOnly.sl_chuyenky.map((r) => r.id), ["x2"]);
  assert.equal(s.period.payrollApprovals.length, 1); assert.equal(s.period._inputReviews.length, 1); assert.equal(s.period.productionAttendance.length, 1);
  assert.equal(s.period.kyluong.length, 0, "kỳ 09 chưa chốt");
  assert.equal(P.slice(mk(), "2026-08").period.kyluong.length, 1, "kỳ 08 đã chốt: kết quả + bản chốt đi theo");
});
test("U-PRD-03 khôi phục kỳ 09 vào dữ liệu đã sửa kỳ 09 + nhân sự + danh mục: kỳ 09 và nhân sự/danh mục về đúng lúc sao lưu; kỳ KHÁC không đổi MỘT byte", () => {
  const src = mk(), pkg = P.slice(src, "2026-09"), cur = mk();
  cur.chamcong.push({ "Kỳ": "2026-09", "Mã NV": "C", "Hình thức công": "BT", "01": 1 }); cur.chamcong[1]["01"] = 0.5; cur.sanluong.find((r) => r["Phiếu cân"] === "PC1")["KL hàng (Tấn)"] = 99;
  cur.nhanvien[0]["Họ và tên"] = "An (sửa)"; cur.dm_luong[0]["Số tiền khoán"] = 555; cur.dm_luong.push({ "Mã lương": "L3", "Số tiền khoán": 1, "Hiệu lực từ": "2026-01-01" });
  const others = (d) => ({ c8: d.chamcong.filter((r) => r["Kỳ"] === "2026-08"), c10: d.chamcong.filter((r) => r["Kỳ"] === "2026-10"), s10: d.sanluong.filter((r) => r["Ngày cân"].startsWith("2026-10")), kl: d.kyluong, sx: d.sl_chuyenky.filter((r) => r.target !== "2026-09") });
  const before = JSON.stringify(others(cur)), plan = P.plan(cur, pkg, "2026-09"); assert.equal(plan.ok, true, JSON.stringify(plan.errors));
  const r = P.apply(cur, plan, pkg); assert.equal(r.ok, true);
  assert.equal(JSON.stringify(others(cur)), before, "kỳ khác không đổi một byte");
  assert.deepEqual(ids(cur.chamcong.filter((x) => x["Kỳ"] === "2026-09")), ids(src.chamcong.filter((x) => x["Kỳ"] === "2026-09")));
  assert.deepEqual(ids(cur.sanluong.filter((x) => x["Ngày cân"].startsWith("2026-09"))), ids(src.sanluong.filter((x) => x["Ngày cân"].startsWith("2026-09"))));
  assert.equal(cur.nhanvien[0]["Họ và tên"], "An", "nhân sự về như gói"); assert.equal(cur.dm_luong.find((x) => x["Mã lương"] === "L1")["Số tiền khoán"], 100, "danh mục về như gói");
  assert.ok(cur.dm_luong.some((x) => x["Mã lương"] === "L3"), "mặc định KHÔNG xóa hàng mới thêm sau lúc sao lưu");
});
test("U-PRD-04 khôi phục HAI LẦN cho kết quả như một lần (không nhân đôi)", () => {
  const src = mk(), pkg = P.slice(src, "2026-09"), cur = mk(); cur.chamcong.push({ "Kỳ": "2026-09", "Mã NV": "C", "Hình thức công": "BT", "01": 1 });
  P.apply(cur, P.plan(cur, pkg, "2026-09"), pkg); const once = JSON.stringify(cur);
  const p2 = P.plan(cur, pkg, "2026-09"); assert.equal(p2.ok, true); P.apply(cur, p2, pkg);
  assert.equal(JSON.stringify(cur), once);
});
test("U-PRD-05 kỳ đã chốt ở máy → chặn hẳn, dữ liệu không đổi; hủy (không apply) → dữ liệu không đổi", () => {
  const src = mk(), pkg8 = P.slice(src, "2026-08"), cur = mk(), snap = JSON.stringify(cur), plan = P.plan(cur, pkg8, "2026-08");
  assert.equal(plan.ok, false); assert.match(plan.blocked, /đã chốt/); assert.equal(JSON.stringify(cur), snap);
  assert.equal(P.apply(cur, plan, pkg8).ok, false); assert.equal(JSON.stringify(cur), snap, "apply cũng từ chối");
  const plan9 = P.plan(cur, P.slice(src, "2026-09"), "2026-09"); assert.equal(plan9.ok, true); assert.equal(JSON.stringify(cur), snap, "plan() không ghi gì (hủy ở màn xem trước = không đổi)");
});
test("U-PRD-06 kỳ đã chốt không đổi: data-digest snapshot kyluong TRƯỚC = SAU khi nhân sự/danh mục bị ghi đè", () => {
  const src = mk(); src.nhanvien[0]["Họ và tên"] = "An (bản gốc)"; src.dm_luong[0]["Số tiền khoán"] = 1; const pkg = P.slice(src, "2026-09"), cur = mk(), d0 = DG.digest(cur).kyChot, bl0 = JSON.stringify(cur.kyluong[0].kq.bangluong);
  P.apply(cur, P.plan(cur, pkg, "2026-09"), pkg);
  assert.deepEqual(DG.digest(cur).kyChot, d0); assert.equal(JSON.stringify(cur.kyluong[0].kq.bangluong), bl0, "bảng lương kỳ đã chốt giống từng số");
});
test("U-PRD-07 xem trước liệt kê TỪNG thay đổi nhân sự/danh mục (thêm/sửa/xóa, giá trị cũ → mới) và nêu 'ảnh hưởng các kỳ khác chưa chốt'", () => {
  const src = mk(), pkg = P.slice(src, "2026-09"), cur = mk(); cur.nhanvien[0]["Họ và tên"] = "An (sửa)"; cur.nhanvien.push({ "Mã NV": "Z", "Họ và tên": "Mới" }); cur.nhanvien.splice(1, 1); cur.dm_luong[0]["Số tiền khoán"] = 555;
  const pl = P.plan(cur, pkg, "2026-09"), nv = pl.global.nhanvien, dm = pl.global.dm_luong;
  assert.deepEqual(nv.change.map((c) => c.key), ["A"]); assert.equal(nv.change[0].before["Họ và tên"], "An (sửa)"); assert.equal(nv.change[0].after["Họ và tên"], "An"); assert.deepEqual(nv.change[0].fields, ["Họ và tên"]);
  assert.deepEqual(nv.add.map((r) => r["Mã NV"]), ["B"], "B có trong gói, thiếu ở máy → thêm"); assert.deepEqual(nv.remove.map((x) => x.row["Mã NV"]), ["Z"], "Z chỉ có ở máy → ứng viên xóa");
  assert.equal(dm.change[0].before["Số tiền khoán"], 555); assert.equal(dm.change[0].after["Số tiền khoán"], 100);
  assert.deepEqual(pl.otherOpenPeriods, ["2026-10"], "kỳ 10 chưa chốt có dữ liệu → bị ảnh hưởng; kỳ 08 đã chốt không liệt kê"); assert.match(pl.warning, /kỳ khác chưa chốt/);
});
test("U-PRD-08 XÓA: mặc định chỉ thêm+sửa; có ô xóa thì chỉ hàng KHÔNG bị tham chiếu bị xóa; hàng bị kỳ khác tham chiếu KHÔNG BAO GIỜ xóa kể cả khi tích ô", () => {
  const src = mk(), pkg = P.slice(src, "2026-09"); delete pkg.global.nhanvien; pkg.global.nhanvien = src.nhanvien.filter((r) => r["Mã NV"] === "B"); // gói chỉ có B
  const cur = mk(); cur.nhanvien.push({ "Mã NV": "Z", "Họ và tên": "Mới", }); // A bị kỳ 08 (đã chốt) + 10 tham chiếu; C không ai dùng; Z không ai dùng
  const off = P.plan(cur, pkg, "2026-09"); assert.equal(off.deletes.allowed, false);
  const c0 = clone(cur); P.apply(c0, off, pkg); assert.deepEqual(c0.nhanvien.map((r) => r["Mã NV"]).sort(), ["A", "B", "C", "Z"], "tắt ô xóa → không xóa gì");
  const on = P.plan(cur, pkg, "2026-09", { allowDelete: true }), blocked = on.deletes.blocked.map((b) => b.row["Mã NV"]), del = on.deletes.rows.map((x) => x["Mã NV"]).sort();
  assert.deepEqual(blocked, ["A"]); assert.match(on.deletes.blocked[0].reason, /không xóa vì kỳ .*2026-08/); assert.match(on.deletes.blocked[0].reason, /2026-10/);
  assert.deepEqual(del, ["C", "Z"]);
  const c1 = clone(cur); const r = P.apply(c1, on, pkg); assert.deepEqual(c1.nhanvien.map((x) => x["Mã NV"]).sort(), ["A", "B"], "A giữ (bị tham chiếu), C và Z xóa"); assert.equal(r.counts.skippedDeletes, 1);
  assert.equal(c1.kyluong.length, 1, "kết quả kỳ khác không đổi");
});
test("U-PRD-09 danh mục đang được dùng (chitiethd / dữ liệu kỳ khác) không bị xóa dù tích ô; danh mục không dùng thì xóa được", () => {
  const src = mk(), pkg = P.slice(src, "2026-09"); pkg.global.dm_luong = src.dm_luong.filter((r) => r["Mã lương"] === "L2"); // gói không có L1 (đang dùng ở chitiethd)
  const cur = mk(); cur.dm_luong.push({ "Mã lương": "L9", "Số tiền khoán": 1, "Hiệu lực từ": "2026-01-01" });
  const pl = P.plan(cur, pkg, "2026-09", { allowDelete: true });
  assert.deepEqual(pl.deletes.blocked.map((b) => b.row["Mã lương"]), ["L1"]); assert.deepEqual(pl.deletes.rows.map((r) => r["Mã lương"]), ["L9"]);
});
test("U-PRD-10 sl_chuyenky: chỉ target === kỳ được khôi phục; dòng source === kỳ (target khác) GIỮ NGUYÊN, nếu khác gói thì liệt kê 'không khôi phục tự động'", () => {
  const src = mk(), pkg = P.slice(src, "2026-09"), cur = mk(); cur.sl_chuyenky.find((r) => r.id === "x2").note = "sửa ở máy"; cur.sl_chuyenky.push({ source: "2026-09", target: "2026-11", id: "x3" });
  const pl = P.plan(cur, pkg, "2026-09"); P.apply(cur, pl, pkg);
  assert.ok(cur.sl_chuyenky.find((r) => r.id === "x2").note === "sửa ở máy" && cur.sl_chuyenky.some((r) => r.id === "x3"), "source===kỳ giữ nguyên");
  const keys = pl.slOther.map((s) => s.id + ":" + s.status).sort(); assert.deepEqual(keys, ["x2:khác gói", "x3:chỉ có ở máy"]); assert.match(pl.slOther[0].note, /không khôi phục tự động/);
});
test("U-PRD-11 gói giả mạo: dòng không thuộc kỳ, bảng lạ, kỳ sai định dạng, cấu trúc thiếu → plan.ok=false (tiếng Việt), apply không ghi gì", () => {
  const cur = mk(), snap = JSON.stringify(cur), good = P.slice(mk(), "2026-09");
  const bad1 = clone(good); bad1.period.chamcong.push({ "Kỳ": "2026-10", "Mã NV": "B", "Hình thức công": "BT" }); const p1 = P.plan(cur, bad1, "2026-09"); assert.equal(p1.ok, false); assert.match(p1.errors.join(" "), /không thuộc kỳ/);
  const bad2 = clone(good); bad2.period.auditlog = [{ x: 1 }]; assert.equal(P.plan(cur, bad2, "2026-09").ok, false);
  const bad3 = clone(good); bad3.global.nguoidung = [{ u: "x" }]; assert.equal(P.plan(cur, bad3, "2026-09").ok, false);
  assert.equal(P.plan(cur, good, "2026-9").ok, false); assert.equal(P.plan(cur, { period: null }, "2026-09").ok, false);
  [bad1, bad2, bad3].forEach((b) => assert.equal(P.apply(cur, P.plan(cur, b, "2026-09"), b).ok, false)); assert.equal(JSON.stringify(cur), snap);
});
test("U-PRD-12 khôi phục kỳ vào MÁY MỚI (thiếu nhân viên/danh mục): có đủ sau khôi phục, dữ liệu kỳ đúng, digest nhân sự/danh mục/kỳ = máy gốc", () => {
  const src = mk(), pkg = P.slice(src, "2026-09"), fresh = { nhanvien: [], hopdong: [], chitiethd: [], dm_luong: [], dm_phongban: [], chamcong: [], sanluong: [], kyluong: [], sl_chuyenky: [] };
  const pl = P.plan(fresh, pkg, "2026-09"); assert.equal(pl.ok, true); P.apply(fresh, pl, pkg);
  const a = DG.digest(src).tables, b = DG.digest(fresh).tables;
  ["nhanvien", "hopdong", "chitiethd", "dm_luong", "dm_phongban"].forEach((t) => assert.deepEqual(b[t], a[t], t));
  assert.equal(fresh.chamcong.length, 2); assert.equal(fresh.sanluong.length, 1);
});
