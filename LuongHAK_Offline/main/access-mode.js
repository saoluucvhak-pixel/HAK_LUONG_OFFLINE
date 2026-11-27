"use strict";
const { randomBytes, pbkdf2Sync } = require("node:crypto");
const HR = require("../hr");
const PERM = require("../core/permissions");
const access = require("../core/access-mode");

function makeCredential(secret) {
  const salt = randomBytes(16).toString("hex"), iter = PERM.ITER;
  return { salt, iter, hash: pbkdf2Sync(secret, Buffer.from(salt, "hex"), iter, 32, "sha256").toString("hex") };
}

function configure(db, request, { who, reauthenticate }) {
  const state = access.mode(db);
  const setup = state === "setup";
  const fail = error => ({ ok: false, error });
  if (!request || !["direct", "account"].includes(request.mode) || state === "invalid") return fail("Chế độ sử dụng không hợp lệ");
  if (!setup && (!who || who.role !== "admin")) return fail("Cần đăng nhập bằng tài khoản quản trị");
  if (request.mode === state) return fail("Ứng dụng đang ở chế độ này");
  if (request.mode === "direct" && !setup) {
    if (typeof request.username !== "string" || request.username.trim().toLowerCase() !== who.user.toLowerCase()) return fail("Nhập tên đăng nhập của tài khoản hiện tại");
    const verified = reauthenticate(request.username.trim(), request.password);
    if (!verified || !verified.ok) return fail(verified && verified.error || "Tên đăng nhập hoặc mật khẩu không đúng");
  }

  const next = { ...db };
  if (setup) { next.nguoidung = []; next.baomat = []; }
  if (setup && !(db.congty || []).length && (request.mode === "account" || request.company || request.companyId)) {
    const company = typeof request.company === "string" ? request.company.trim() : "";
    const companyId = typeof request.companyId === "string" ? request.companyId.trim() : "";
    if (!company || company.length > 200) return fail("Nhập tên công ty (tối đa 200 ký tự)");
    if (!/^[A-Za-z0-9_-]{2,20}$/.test(companyId)) return fail("Mã công ty 2–20 ký tự: chữ không dấu, số, _ hoặc -");
    HR.khoiTaoMoi(next, company, companyId);
  } else if (setup && !(db.congty || []).length) {
    for (const [table, rows] of Object.entries(HR.seedDanhMuc())) if (!(next[table] || []).length) next[table] = rows;
  }

  let recoveryCode;
  const now = new Date().toISOString();
  next.accessSettings = { mode: request.mode };
  if (request.mode === "account") {
    const username = typeof request.username === "string" ? request.username.trim() : "";
    const name = typeof request.name === "string" ? request.name.trim() : "";
    const password = request.password;
    if (!/^[a-z0-9._-]{3,30}$/i.test(username)) return fail("Tên đăng nhập 3–30 ký tự: chữ không dấu, số, . _ -");
    if (!name || name.length > 200) return fail("Nhập họ tên (tối đa 200 ký tự)");
    if (typeof password !== "string" || password.length > 256) return fail("Mật khẩu không hợp lệ");
    const bad = PERM.validatePassword(password);
    if (bad) return fail(bad);
    if (password !== request.confirmPassword) return fail("Hai lần nhập mật khẩu không khớp");
    const users = db.nguoidung || [];
    const same = u => u && typeof u.tenDangNhap === "string" && u.tenDangNhap.trim().toLowerCase() === username.toLowerCase();
    const previous = users.find(same);
    if (previous && state === "legacy" && previous.tenDangNhap !== who.user) return fail("Tên này thuộc một tài khoản cũ. Hãy dùng tên khác");
    const owner = { id: previous && previous.id || HR.uid(), tenDangNhap: username, hoTen: name, vaiTro: "admin", khoa: false, taoLuc: now, ...makeCredential(password) };
    next.nguoidung = users.filter(u => !same(u)).concat(owner);
    next.accessSettings.owner = username;
    recoveryCode = randomBytes(8).toString("hex").toUpperCase();
    next.baomat = [{ khoiPhuc: makeCredential(recoveryCode), taoLuc: now }];
    recoveryCode = recoveryCode.match(/.{4}/g).join("-");
  }
  next.auditlog = (db.auditlog || []).concat({
    luc: now, nguoi: who ? who.user : next.accessSettings.owner || access.LOCAL_USER.tenDangNhap,
    thaoTac: "Đổi chế độ đăng nhập", chiTiet: request.mode === "direct" ? "Một người sử dụng" : "Sử dụng tài khoản đăng nhập"
  });
  return { ok: true, next, recoveryCode };
}

module.exports = { configure };
