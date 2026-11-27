"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const access = require("../../core/access-mode");
const workflow = require("../../core/workflow-approval");
const { configure } = require("../../main/access-mode");
const { createPolicy } = require("../../main/write-policy");
const { KNOWN } = require("../../main/ipc-guard");

const owner = { id: "legacy", tenDangNhap: "admin", hoTen: "Chủ hồ sơ", vaiTro: "admin", khoa: false };
const old = { nguoidung: [owner, { tenDangNhap: "staff", vaiTro: "nhansu" }], nhanvien: [{ "Mã NV": "A" }],
  workflowSettings: [{ mode: "roles" }], kyluong: [{ ky: "2026-08", version: 1 }] };
const admin = { user: "admin", role: "admin", perms: KNOWN };
const reauthenticate = (name, password) => ({ ok: name === "admin" && password === "Existing2026" });

test("Đổi dữ liệu cũ sang sử dụng trực tiếp cần đúng tài khoản hiện tại", () => {
  for (const [who, username, password] of [[null, "admin", "Existing2026"], [admin, "staff", "Existing2026"], [admin, "admin", "Wrong2026"]]) {
    assert.equal(configure(old, { mode: "direct", username, password }, { who, reauthenticate }).ok, false);
  }
  const result = configure(old, { mode: "direct", username: "admin", password: "Existing2026" }, { who: admin, reauthenticate });
  assert.equal(result.ok, true);
  assert.equal(access.mode(result.next), "direct");
  assert.deepEqual(access.accounts(result.next), []);
  assert.equal(workflow.mode(result.next), "single");
  assert.equal(workflow.mode(old), "roles");
  assert.deepEqual(result.next.kyluong, old.kyluong);
  assert.deepEqual(result.next.nguoidung, old.nguoidung);
});

test("Hồ sơ sử dụng trực tiếp chỉ bật được một tài khoản mới với mật khẩu hợp lệ", () => {
  const direct = { ...old, accessSettings: { mode: "direct" } };
  const who = { user: access.LOCAL_USER.tenDangNhap, role: "admin" };
  const request = { mode: "account", username: "owner", name: "Chủ hồ sơ", password: "Secure2026", confirmPassword: "NotMatching2026" };
  assert.equal(configure(direct, request, { who }).ok, false);
  const { next, recoveryCode } = configure(direct, { ...request, confirmPassword: request.password }, { who });
  assert.deepEqual(access.accounts(next).map(u => u.tenDangNhap), ["owner"]);
  assert.match(access.accounts(next)[0].hash, /^[0-9a-f]{64}$/);
  assert.match(recoveryCode, /^(?:[0-9A-F]{4}-){3}[0-9A-F]{4}$/);
  assert.equal(JSON.stringify(next).includes(request.password), false);
});

test("Lưu dữ liệu thông thường không thể đổi chế độ hoặc tạo thêm tài khoản", () => {
  const direct = { accessSettings: { mode: "direct" }, nguoidung: [], auditlog: [] };
  const local = { user: access.LOCAL_USER.tenDangNhap, role: "admin", perms: KNOWN };
  const check = doc => createPolicy({ readText: () => JSON.stringify(direct) }).check(JSON.stringify(doc), local);
  assert.equal(check({ ...direct, accessSettings: { mode: "account", owner: "admin" } }).ok, false);
  assert.equal(check({ ...direct, nguoidung: [owner] }).ok, false);
  assert.equal(check({ ...direct, nhanvien: [{ "Mã NV": "A" }] }).ok, true);
});
