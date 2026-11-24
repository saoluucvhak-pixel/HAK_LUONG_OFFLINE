"use strict";
// v2.1.12 (mục 8, Q-15 / T-05): khôi phục THEO KỲ không được ghi đè/xóa phụ lục hợp đồng (chitiethd) mà một kỳ ĐÃ CHỐT đang dùng để tính lương. Chủ chọn "chặn" (24/11/2026). Dữ liệu giả.
const test = require("node:test"), assert = require("node:assert/strict");
const REPO = require("../../core/repository.js"), P = REPO.period;
const clone = (x) => JSON.parse(JSON.stringify(x));
const base = (closed) => ({
  nhanvien: [{ "Mã NV": "A", "Họ và tên": "An" }], hopdong: [{ "Mã NV": "A", "Số HĐLĐ": "A/1" }],
  chitiethd: [{ "Mã NV": "A", "Số HĐLĐ": "A/1", "Hiệu lực từ": "2026-01-01", "Mã lương": "L1", "Phòng ban": "P1" }], nhanthan: [], thanhtoan: [], canhan: [],
  dm_luong: [{ "Mã lương": "L1", "Số tiền khoán": 100, "Hiệu lực từ": "2026-01-01" }, { "Mã lương": "L2", "Số tiền khoán": 200, "Hiệu lực từ": "2026-01-01" }],
  dm_phongban: [{ "Mã phòng ban": "P1", "Tên phòng ban": "T", "Hiệu lực từ": "2026-01-01" }],
  chamcong: [], sanluong: [], bandam: [], psluong: [], ungluong: [], tiencom: [],
  kyluong: closed ? [{ ky: "2026-08", version: 1, kq: { bangluong: [{ "Mã NV": "A", "Thực lĩnh": 1000 }] } }] : [], kyluong_lichsu: [], payrollApprovals: [], _inputReviews: [], productionAttendance: [], sl_chuyenky: [] });
const pkgOf = (db, edit) => { const p = clone(db); edit(p); return P.slice(p, "2026-09"); };

test("U-FRZ-01 gói đổi phụ lục mà kỳ đã chốt 2026-08 đang dùng → CHẶN, nêu kỳ + phụ lục + cách làm; không ghi gì", () => {
  const db = base(true), before = JSON.stringify(db), payload = pkgOf(db, (p) => { p.chitiethd[0]["Mã lương"] = "L2"; });
  const pl = P.plan(db, payload, "2026-09");
  assert.equal(pl.ok, false); assert.match(pl.blocked, /2026-08/); assert.match(pl.blocked, /phụ lục/); assert.match(pl.blocked, /A\/1/); assert.match(pl.blocked, /mở chốt|phụ lục mới/);
  const ap = P.apply(db, pl, payload); assert.equal(ap.ok, false); assert.equal(JSON.stringify(db), before, "dữ liệu không đổi");
});
test("U-FRZ-02 apply kiểm lại ngay trước khi ghi: kế hoạch lập khi CHƯA chốt, sau đó kỳ 08 được chốt → apply vẫn chặn", () => {
  const open = base(false), payload = pkgOf(open, (p) => { p.chitiethd[0]["Mã lương"] = "L2"; }), pl = P.plan(open, payload, "2026-09"); assert.equal(pl.ok, true, "chưa chốt: khôi phục được");
  const nowClosed = base(true), snap = JSON.stringify(nowClosed), ap = P.apply(nowClosed, pl, payload);
  assert.equal(ap.ok, false); assert.equal(JSON.stringify(nowClosed), snap);
});
test("U-FRZ-03 xóa phụ lục đã khóa: dòng được GIỮ (deleteBlock đã chặn vì kỳ chốt đang dùng Mã NV) cả khi allowDelete; apply không xóa", () => {
  const db = base(true), payload = pkgOf(db, (p) => { p.chitiethd = []; }), pl = P.plan(db, payload, "2026-09", { allowDelete: true });
  assert.equal(pl.deletes.rows.length, 0, "không có dòng nào được phép xóa"); assert.ok(pl.deletes.blocked.some((x) => x.table === "chitiethd" && /2026-08/.test(x.reason)));
  const ap = P.apply(db, pl, payload); assert.equal(ap.ok, true); assert.equal(db.chitiethd.length, 1, "phụ lục còn nguyên");
});
test("U-FRZ-04 KHÔNG chặn oan: thêm phụ lục mới, đổi danh mục (dm_luong), kỳ chưa có kỳ chốt nào", () => {
  const db = base(true);
  const addNew = pkgOf(db, (p) => { p.chitiethd.push({ "Mã NV": "A", "Số HĐLĐ": "A/1", "Hiệu lực từ": "2026-09-01", "Mã lương": "L2", "Phòng ban": "P1" }); });
  assert.equal(P.plan(db, addNew, "2026-09").ok, true, "thêm phụ lục mới (hiệu lực sau kỳ chốt)");
  const dm = pkgOf(db, (p) => { p.dm_luong[1]["Số tiền khoán"] = 250; }); assert.equal(P.plan(db, dm, "2026-09").ok, true, "đổi danh mục không phải phụ lục");
  const noClosed = base(false), edit = pkgOf(noClosed, (p) => { p.chitiethd[0]["Mã lương"] = "L2"; }); assert.equal(P.plan(noClosed, edit, "2026-09").ok, true, "chưa có kỳ chốt: khôi phục bình thường");
});
