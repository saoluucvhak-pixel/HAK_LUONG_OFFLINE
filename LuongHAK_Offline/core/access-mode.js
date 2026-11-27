(function (root) {
  "use strict";
  const LOCAL_USER = Object.freeze({ tenDangNhap: "#local", hoTen: "Một người sử dụng", vaiTro: "admin", khoa: false });
  const config = db => db && db.accessSettings;
  const mode = db => {
    const value = config(db);
    if (db && Object.hasOwn(db, "accessSettings")) {
      if (value && value.mode === "direct" && value.owner === undefined) return "direct";
      if (value && value.mode === "account" && typeof value.owner === "string" && value.owner.trim()) return "account";
      return "invalid";
    }
    return (db && db.nguoidung || []).length ? "legacy" : "setup";
  };
  const accounts = db => {
    const state = mode(db), users = Array.isArray(db && db.nguoidung) ? db.nguoidung.filter(u => u && typeof u.tenDangNhap === "string") : [];
    if (state === "legacy") return users;
    if (state === "account") return users.filter(u => u.vaiTro === "admin" && u.tenDangNhap === config(db).owner);
    return [];
  };
  const api = { LOCAL_USER, mode, accounts };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HAKCore.accessMode = api;
})(typeof window !== "undefined" ? window : this);
