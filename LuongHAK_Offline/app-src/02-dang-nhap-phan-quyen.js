  // ---------- Đăng nhập & phân quyền (core/permissions.js) ----------
  var session = null, lastActive = Date.now(), IDLE_MS = 30 * 60 * 1000;
  function currentUser() {
    var w = winUser ? winUser.user + "@" + winUser.host : "";
    if (session) return session.hoTen + " [" + session.tenDangNhap + "]" + (w ? " (" + w + ")" : "");
    return w || "Người dùng trình duyệt";
  }
  function can(p) { return PERM.can(session, p); }
  /** Q-24: được thấy lương cá nhân (lương thỏa thuận / lương cơ bản) nếu có quyền Xem bảng lương hoặc Sửa hồ sơ (Nhân sự cần để lập phụ lục) */
  function canSeePay() { return can("payroll.view") || can("hr.edit"); }
  /** Kiểm tra quyền ở tầng nghiệp vụ — gọi ở đầu mọi thao tác ghi/xuất dữ liệu. Trả false (và báo) nếu không có quyền. */
  function need(p, what) {
    try { PERM.need(session, p, what); return true; } catch (e) { alert("⛔ " + e.message + "."); return false; }
  }
  // Băm mật khẩu: bản cài dùng tiến trình chính (Node crypto); bản trình duyệt dùng WebCrypto
  var AUTH = {
    salt: function () {
      if (store && store.authSalt) return store.authSalt();
      var a = new Uint8Array(16); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    },
    hash: function (pw, salt, iter) {
      if (store && store.authHash) return Promise.resolve(store.authHash(pw, salt, iter));
      var enc = new TextEncoder(), sb = new Uint8Array(salt.match(/../g).map(function (x) { return parseInt(x, 16); }));
      return crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]).then(function (k) {
        return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sb, iterations: iter }, k, 256);
      }).then(function (bits) { return Array.prototype.map.call(new Uint8Array(bits), function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); });
    },
    verify: function (pw, u) {
      if (store && store.authVerify) return Promise.resolve(store.authVerify(pw, u.salt, u.iter, u.hash));
      return AUTH.hash(pw, u.salt, u.iter).then(function (h0) { return h0 === u.hash; });
    },
    make: function (pw) { var salt = AUTH.salt(), iter = PERM.ITER; return AUTH.hash(pw, salt, iter).then(function (hash) { return { salt: salt, iter: iter, hash: hash }; }); }
  };
  function randomCode() { var a = AUTH.salt().toUpperCase(); return a.slice(0, 4) + "-" + a.slice(4, 8) + "-" + a.slice(8, 12) + "-" + a.slice(12, 16); }
  /** V9: xin tiến trình chính cấp phiên tin cậy (main tự kiểm mật khẩu với dữ liệu đã lưu trên đĩa). Bản trình duyệt không có main → true. */
  function mainLogin(name, pw) {
    if (!store || !store.login) return true;
    try { var r = store.login(name, pw); if (r && r.ok) return true; toast("⛔ " + ((r && r.error) || "Tiến trình chính từ chối phiên đăng nhập")); } catch (e) { toast("⛔ Không thiết lập được phiên đăng nhập tin cậy"); }
    return false;
  }
  function logout(reason, forceLock) {
    var pendingFailed = !readOnly && dirty && !saveNow();
    if (pendingFailed && !forceLock) { alert("Chưa đăng xuất: chưa lưu được thay đổi. " + lastSaveError + "\nGiữ ứng dụng mở để thử lưu lại."); return false; }
    if (!pendingFailed && !readOnly && session && !txn([], function () { audit("Đăng xuất", reason || ""); }) && !forceLock) { alert("Chưa đăng xuất: " + lastTxnError); return false; }
    try { if (store && store.logout) store.logout(); } catch (e) { /* main hết phiên cũng được */ }
    session = null; st.kq = null; render();
    if (pendingFailed) toast("Đã khóa phiên; còn thay đổi chưa lưu — giữ app mở và đăng nhập lại để lưu.");
    return true;
  }
  var sessionActivityAt = 0;
  function noteUserActivity(e) {
    if (!e.isTrusted) return;
    lastActive = Date.now();
    if (!session || !store || !store.activity || lastActive - sessionActivityAt < 60000) return;
    sessionActivityAt = lastActive;
    try {
      var r = store.activity();
      if (!r || !r.ok) toast("Phiên đăng nhập đã hết hiệu lực — giữ lại nội dung đang nhập và đăng nhập lại trước khi lưu");
    } catch (err) { toast("Không liên lạc được với phiên đăng nhập — giữ lại nội dung đang nhập trước khi thử lại"); }
  }
  ["mousedown", "keydown"].forEach(function (ev) { document.addEventListener(ev, noteUserActivity, true); });
  // Ctrl+F: nhảy tới ô tìm kiếm của màn hình đang mở (nếu có)
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "k" || e.key === "K") && session && !loadError) { e.preventDefault(); quickSearch(); return; }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "f" || e.key === "F")) { var sb = document.querySelector("#main input.search, main input.search"); if (sb) { e.preventDefault(); sb.focus(); sb.select(); } }
  });
  setInterval(function () { if (session && Date.now() - lastActive > IDLE_MS) { logout("tự khóa sau 30 phút không thao tác", true); toast("Đã tự khóa sau 30 phút không thao tác — đăng nhập lại"); } }, 30000);
  var AUDIT_MAX = 20000;
  function audit(action, detail) {
    db.auditlog.push({ luc: new Date().toISOString(), nguoi: currentUser(), thaoTac: action, chiTiet: detail || "" });
    if (db.auditlog.length > AUDIT_MAX) {
      // Không xóa im lặng: chuyển phần cũ ra bản sao lưu nhật ký trước khi cắt bớt
      if (store && store.backup) { try { store.backup("nhat-ky-truoc-cat"); } catch (e) { /* vẫn cắt để file không phình vô hạn */ } }
      db.auditlog.splice(0, db.auditlog.length - AUDIT_MAX);
    }
  }
  window.hakFlushBeforeClose = function () {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    closingNow = true; var okSave = !dirty || saveNow(); closingNow = false;
    if (okSave) return true;
    // Bản nền cũ (kho đã đổi ở nơi khác): KHÔNG ghi đè; cho đóng nếu người dùng đồng ý bỏ thay đổi chưa lưu của màn hình này, nếu không giữ cửa sổ.
    if (lastSaveStale) { if (confirm("Dữ liệu đã được thay đổi ở nơi khác nên bản đang mở là bản CŨ; app không ghi để tránh ghi đè dữ liệu mới.\n\nBấm OK để ĐÓNG và bỏ thay đổi chưa lưu của màn hình này. Bấm Hủy để giữ cửa sổ.")) { dirty = false; return true; } return false; }
    toast("Chưa lưu được dữ liệu — app giữ cửa sổ mở. " + lastSaveError); return false;
  };
  window.addEventListener("beforeunload", function (e) {
    if (!dirty) return;
    closingNow = true; var okSave = saveNow(); closingNow = false;
    if (okSave) return;
    // Bản nền cũ (kho đã đổi ở nơi khác, thường vì chính app vừa khôi phục/lưu trữ rồi tải lại giao diện): KHÔNG ghi đè và KHÔNG giữ trang.
    // Chromium chặn hộp thoại confirm() trong beforeunload nên không hỏi ở đây (đường đóng cửa sổ hỏi ở hakFlushBeforeClose; đường lưu thường hỏi ở onStaleBase).
    if (lastSaveStale) { dirty = false; return; }
    e.preventDefault(); e.returnValue = false; toast("Chưa lưu được dữ liệu — giữ app mở để thử lại hoặc sao lưu. " + lastSaveError);
  });
  if (!readOnly && (fromLocal || migMsg.length)) saveNow();
  var now = new Date();
  var st = { tab: "home", dm: "dm_luong", nam: now.getFullYear(), thang: now.getMonth() + 1, bu: "to", kq: null, compact: true, q: "", qs: {}, pg: {}, pageSize: 100 };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY + "_ui") || "{}"), { kq: null, q: "", pg: {} }); } catch (e) {}
  if (!st.qs || typeof st.qs !== "object") st.qs = {};
  if ([50, 100, 200, 500].indexOf(+st.pageSize) < 0) st.pageSize = 100;
  function saveUi() { try { localStorage.setItem(KEY + "_ui", JSON.stringify({ tab: st.tab === "nv" ? "nhansu" : st.tab === "slips" && st.kqFull ? "luong" : st.tab, dm: st.dm, nam: st.nam, thang: st.thang, bu: st.bu, compact: st.compact, qs: st.qs, pageSize: st.pageSize })); } catch (e) {} }
  // Giao diện sáng / tối (2.0-α15): ghi nhớ theo máy, mặc định sáng
  function curTheme() { try { return localStorage.getItem(KEY + "_theme") === "dark" ? "dark" : "light"; } catch (e) { return "light"; } }
  function toggleTheme() { var t = curTheme() === "dark" ? "light" : "dark"; try { localStorage.setItem(KEY + "_theme", t); } catch (e) { /* vẫn đổi cho phiên này */ } applyTheme(t); render(); }
  var HAK_SKINS = [["luxe", "Luxury V10.3"], ["classic", "Xanh ngọc"], ["neutral", "Trung tính"], ["champagne", "Vàng champagne"]];
  function curSkin() { try { var k = localStorage.getItem(KEY + "_skin"); return HAK_SKINS.some(function (v) { return v[0] === k; }) ? k : "luxe"; } catch (e) { return "luxe"; } }
  function applySkin(k) { document.documentElement.setAttribute("data-skin", HAK_SKINS.some(function (v) { return v[0] === k; }) ? k : "luxe"); }
  function setSkin(k) { if (!HAK_SKINS.some(function (v) { return v[0] === k; })) return; try { localStorage.setItem(KEY + "_skin", k); } catch (e) {} applySkin(k); render(); }
  applySkin(curSkin());
  applyTheme(curTheme());
