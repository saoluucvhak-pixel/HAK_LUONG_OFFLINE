// P1.5 — T-03: Chấm công trùng khóa, khác số công, bị CỘNG DỒN và lọt chốt kỳ
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const RP = require("../../core/repository.js");
const INT = require("../../core/integrity.js");

function createMockDb() {
  return {
    chamcong: [
      { "Mã NV": "NV01", "Kỳ": "2026-09", "Hình thức công": "BT", "01": 1, "02": 1 }
    ],
    psluong: [], ungluong: [], nhanvien: [{ "Mã NV": "NV01", "Họ và tên": "Nguyễn Văn A" }],
    hopdong: [], chitiethd: [], kyluong: []
  };
}

test("U-CC-DUP-01: repo.plan từ chối thêm dòng chamcong trùng khóa (Kỳ + Mã NV + Hình thức công)", () => {
  const db = createMockDb();
  const repo = RP.createRepo({
    db: () => db,
    can: () => true,
    user: () => "admin",
    tableName: (t) => t
  });
  
  // Dòng 2: cùng Kỳ, cùng Mã NV, cùng Hình thức công (hoặc để trống mặc định BT)
  const dupRow = { "Mã NV": "NV01", "Kỳ": "2026-09", "Hình thức công": "bt", "01": 0.5 };
  const p = repo.plan("insert", "chamcong", null, dupRow);
  assert.equal(p.ok, false, "Phải từ chối thêm dòng trùng khóa chamcong");
  assert.equal(p.code, "dup");
  assert.match(p.msg, /đã có dòng chấm công|bản ghi trùng/i);
});

test("U-CC-DUP-02: INT.check với ca CỘNG DỒN (khác số công) bị regex chốt kỳ chặn", () => {
  const db = createMockDb();
  // Giả lập dữ liệu cũ đã có 2 dòng trùng khác số công
  db.chamcong.push({ "Mã NV": "NV01", "Kỳ": "2026-09", "Hình thức công": "BT", "01": 0.5 });
  
  const issues = INT.check(db);
  const regex = /CỘNG (2 LẦN|NHIỀU LẦN|DỒN)/;
  const critIssues = issues.filter(i => i.level === "Critical" || regex.test(i.msg));
  assert.ok(critIssues.length >= 1, "Ca CỘNG DỒN phải khớp regex chặn chốt kỳ");
  assert.ok(critIssues.some(i => i.msg.includes("CỘNG DỒN")));
});
