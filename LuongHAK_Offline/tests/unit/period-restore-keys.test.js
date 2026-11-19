"use strict";
// 012-B1 — sửa theo /yeu-cau-sua #123 (CEO): (1) bảng nhóm B ghép theo KHÓA NGHIỆP VỤ (IMP.KEYS) nên dòng bị sửa được THAY, không nhân đôi;
// (2) gói chứa bản chốt của kỳ chưa chốt ở máy → cờ reclose + cảnh báo, chỉ ghi bản chốt khi có xác nhận; (3) kỳ được chuẩn hóa (2026-9 = 2026-09). Dữ liệu giả.
const test = require("node:test"), assert = require("node:assert/strict");
const P = require("../../core/repository.js").period;
const KY = "2026-09";

function restore(t, cur, pk, opt) {
  const db = { kyluong: [] }; db[t] = cur;
  const payload = { period: {}, global: {} }; payload.global[t] = pk;
  const plan = P.plan(db, payload, KY, opt || {});
  const res = plan.ok ? P.apply(db, plan, payload, opt || {}) : null;
  return { db, plan, res };
}

const CASES = [
  ["canhan", [{ "Mã NV": "NV01", "Hiệu lực từ": "2026-01-01", "Số CCCD": "111" }], [{ "Mã NV": "NV01", "Hiệu lực từ": "2026-01-01", "Số CCCD": "222" }]],
  ["thanhtoan", [{ "Mã NV": "NV01", "Hiệu lực từ": "2026-01-01", "Số tài khoản": "A" }], [{ "Mã NV": "NV01", "Hiệu lực từ": "2026-01-01", "Số tài khoản": "B" }]],
  ["nhanthan", [{ "Mã NV": "NV01", "Họ tên nhân thân": "Mẹ", "Năm sinh": "1960" }], [{ "Mã NV": "NV01", "Họ tên nhân thân": "Mẹ", "Năm sinh": "1961" }]],
  ["dm_bacthue", [{ "Mã thuế TNCN": "T", "Bậc": "1", "Hiệu lực từ": "2026-01-01", "Thuế suất": "5%" }, { "Mã thuế TNCN": "T", "Bậc": "2", "Hiệu lực từ": "2026-01-01", "Thuế suất": "10%" }],
    [{ "Mã thuế TNCN": "T", "Bậc": "1", "Hiệu lực từ": "2026-01-01", "Thuế suất": "6%" }, { "Mã thuế TNCN": "T", "Bậc": "2", "Hiệu lực từ": "2026-01-01", "Thuế suất": "10%" }]],
  ["dm_cc", [{ "Mã CC": "X", "Hình thức công": "BT", "Hệ số": "1" }, { "Mã CC": "X", "Hình thức công": "TC", "Hệ số": "1.5" }],
    [{ "Mã CC": "X", "Hình thức công": "BT", "Hệ số": "1" }, { "Mã CC": "X", "Hình thức công": "TC", "Hệ số": "2" }]],
  ["dm_luong", [{ "Mã lương": "L1", "Hiệu lực từ": "2026-01-01", "Mức": "5000000" }], [{ "Mã lương": "L1", "Hiệu lực từ": "2026-01-01", "Mức": "6000000" }]]
];
for (const [t, cur, pk] of CASES) {
  test("U-PRD-K1 " + t + ": dòng bị SỬA trong gói thì THAY dòng ở máy (theo khóa nghiệp vụ), số dòng không đổi, giá trị bằng gói — không nhân đôi", () => {
    const { db, plan } = restore(t, JSON.parse(JSON.stringify(cur)), JSON.parse(JSON.stringify(pk)));
    assert.equal(plan.ok, true, JSON.stringify(plan.errors));
    assert.equal(db[t].length, pk.length, "số dòng sau khôi phục: " + JSON.stringify(db[t]));
    assert.deepEqual(db[t].map((r) => JSON.stringify(r)).sort(), pk.map((r) => JSON.stringify(r)).sort());
    assert.equal(plan.counts.add, 0, "không được coi là thêm dòng mới");
    assert.ok(plan.counts.change >= 1, "phải liệt kê là SỬA (cũ → mới) ở xem trước");
  });
}

test("U-PRD-K2 bảng có khóa nhưng dữ liệu máy lỡ TRÙNG khóa → kế hoạch CHẶN (ok=false, nêu bảng), không âm thầm nhân đôi", () => {
  const cur = [{ "Mã NV": "NV01", "Hiệu lực từ": "2026-01-01", "Số CCCD": "111" }, { "Mã NV": "NV01", "Hiệu lực từ": "2026-01-01", "Số CCCD": "333" }];
  const { db, plan } = restore("canhan", cur, [{ "Mã NV": "NV01", "Hiệu lực từ": "2026-01-01", "Số CCCD": "222" }]);
  assert.equal(plan.ok, false); assert.match(plan.errors.join(" "), /canhan/);
  assert.equal(db.canhan.length, 2, "dữ liệu máy không đổi");
});

function recloseCase(opt) {
  const db = { kyluong: [], chamcong: [{ "Kỳ": KY, "Mã NV": "NV01", "01": "1" }] };
  const snap = { ky: KY, version: 1, kq: { bangluong: [{ "Mã NV": "NV01", "Thực lĩnh": 1000 }] } };
  const payload = { period: { kyluong: [snap], kyluong_lichsu: [{ ky: KY, at: 1 }], chamcong: [{ "Kỳ": KY, "Mã NV": "NV01", "01": "0.5" }] }, global: {} };
  const plan = P.plan(db, payload, KY, opt || {}), res = P.apply(db, plan, payload, opt || {});
  return { db, plan, res };
}
test("U-PRD-K3 gói chứa BẢN CHỐT của kỳ chưa chốt ở máy → reclose=true + cảnh báo; KHÔNG xác nhận thì không ghi kyluong/kyluong_lichsu (kỳ vẫn mở), phát sinh vẫn khôi phục", () => {
  const { db, plan, res } = recloseCase({});
  assert.equal(plan.ok, true); assert.equal(plan.reclose, true); assert.match(plan.warning, /CHỐT LẠI/);
  assert.equal(res.ok, true); assert.equal(P.closedKy(db, KY), false, "không xác nhận thì kỳ phải còn MỞ");
  assert.equal((db.kyluong_lichsu || []).length, 0); assert.equal(db.chamcong[0]["01"], "0.5");
  assert.equal(res.counts.recloseSkipped, true);
});
test("U-PRD-K4 có xác nhận confirmReclose → ghi bản chốt, kỳ chốt lại; nhật ký ghi rõ 'chốt lại'", () => {
  const { db, plan, res } = recloseCase({ confirmReclose: true });
  assert.equal(plan.reclose, true); assert.equal(res.ok, true); assert.equal(P.closedKy(db, KY), true);
  assert.match(res.audit, /chốt lại/i);
});
test("U-PRD-K5 kỳ ghi thiếu số 0 ('2026-9', '9/2026') được coi là cùng kỳ 2026-09: đóng gói có, khôi phục thay được", () => {
  assert.equal(P.kyOfRow("chamcong", { "Kỳ": "2026-9" }), KY);
  assert.equal(P.kyOfRow("payrollApprovals", { ky: "2026-9" }), KY);
  assert.equal(P.kyOfRow("_inputReviews", { period: "2026-9" }), KY);
  assert.equal(P.kyOfRow("sl_chuyenky", { source: "2026-08", target: "2026-9" }), KY);
  const db = { kyluong: [], chamcong: [{ "Kỳ": "2026-9", "Mã NV": "NV01", "01": "1" }, { "Kỳ": "2026-10", "Mã NV": "NV01", "01": "1" }] };
  assert.equal(P.slice(db, KY).period.chamcong.length, 1, "dòng '2026-9' phải được đóng gói");
  const payload = { period: { chamcong: [{ "Kỳ": KY, "Mã NV": "NV01", "01": "0.5" }] }, global: {} };
  const plan = P.plan(db, payload, KY, {}); P.apply(db, plan, payload, {});
  assert.equal(db.chamcong.length, 2, "dòng cũ '2026-9' được THAY, không nhân đôi: " + JSON.stringify(db.chamcong));
});
