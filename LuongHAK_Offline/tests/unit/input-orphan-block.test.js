// v2.1.16 (mục 7, chủ chọn "chặn" 24/11/2026): Thưởng/Trừ, Tạm ứng, Suất cơm không được LƯU với Mã NV sai hoa/thường hoặc không có trong Nhân sự (trước đây bị engine bỏ qua im lặng). Dữ liệu giả.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../../core/input-safety.js");
const R = require("../../core/repository.js");
const P = require("../../core/permissions.js");
const HR = require("../../hr.js");
const F = require("../fixtures/build.js");
const mk = () => ({ nhanvien: [{ "Mã NV": "NVA1" }, { "Mã NV": "NVB2" }], psluong: [], ungluong: [], tiencom: [], chamcong: [], sanluong: [], bandam: [] });

test("U-OBK-01 chặn ở cả 3 bảng: sai hoa/thường (gợi ý mã gần giống), có khoảng trắng, không tồn tại", () => {
  for (const t of ["psluong", "ungluong", "tiencom"]) {
    const db = mk();
    assert.match(S.mutation(db, t, null, { "Mã NV": "nva1", "Ngày hạch toán": "2026-10-05" }), /Mã NV "nva1" không khớp Nhân sự.*gần giống "NVA1"/, t);
    assert.match(S.mutation(db, t, null, { "Mã NV": "NVA1 ", "Ngày hạch toán": "2026-10-05" }), /gần giống "NVA1"/, t + " khoảng trắng");
    assert.match(S.mutation(db, t, null, { "Mã NV": "NVXX", "Ngày hạch toán": "2026-10-05" }), /không tồn tại/, t);
    assert.equal(S.mutation(db, t, null, { "Mã NV": "NVA1", "Ngày hạch toán": "2026-10-05" }), "", t + " mã đúng → cho lưu");
  }
});
test("U-OBK-02 không chặn oan: Mã NV để trống (dòng chưa nhập mã), bảng khác, và SỬA ô khác của dòng cũ đã có mã mồ côi (không bắt người dùng sửa dữ liệu cũ)", () => {
  const db = mk();
  assert.equal(S.mutation(db, "ungluong", null, { "Ngày hạch toán": "2026-10-05", "Tạm ứng": 1 }), "", "trống");
  const old = { "Mã NV": "NVCU", "Ngày hạch toán": "2026-10-05", "Tạm ứng": 1 };
  assert.equal(S.mutation(db, "ungluong", old, Object.assign({}, old, { "Tạm ứng": 2 })), "", "sửa ô khác, Mã NV cũ không đổi");
  assert.match(S.mutation(db, "ungluong", old, Object.assign({}, old, { "Mã NV": "NVZZ" })), /không tồn tại/, "đổi sang mã sai thì chặn");
  assert.equal(S.mutation(db, "ungluong", old, Object.assign({}, old, { "Mã NV": "NVB2" })), "", "đổi sang mã đúng thì cho");
  assert.equal(S.mutation(db, "chamcong", null, { "Mã NV": "NVXX", "Kỳ": "2026-10" }), "", "bảng khác không bị ảnh hưởng ở đây");
});
test("U-OBK-03 repository.insert/update chặn với mã lỗi 'input', dữ liệu giữ nguyên từng byte", () => {
  const db = F.baseDb(); ["auditlog"].forEach((k) => { db[k] = []; }); db.nhanvien.push({ "Mã NV": "NV001", "Họ và tên": "A", "Trạng thái": "Đang làm việc" }); db.ungluong = db.ungluong || [];
  const user = { tenDangNhap: "admin", vaiTro: "admin" }; let n = 0;
  const repo = R.createRepo({ db: () => db, can: (p) => P.can(user, p), audit: (a, d) => db.auditlog.push({ thaoTac: a, chiTiet: d }), uid: () => "id" + (++n), hdChildren: HR.HD_TABS });
  const snap = JSON.stringify(db), bad = repo.insert("ungluong", { "Mã NV": "nv001", "Ngày hạch toán": "2026-10-05", "Số chứng từ": "TU1", "Tạm ứng": 1000000 });
  assert.equal(bad.ok, false); assert.equal(bad.code, "input"); assert.match(bad.error || bad.msg || bad.message || "", /không khớp Nhân sự/); assert.equal(JSON.stringify(db), snap);
  const good = repo.insert("ungluong", { "Mã NV": "NV001", "Ngày hạch toán": "2026-10-05", "Số chứng từ": "TU1", "Tạm ứng": 1000000 }); assert.equal(good.ok, true, JSON.stringify(good).slice(0, 200));
});
