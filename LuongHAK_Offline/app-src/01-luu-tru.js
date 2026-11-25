  // ---------- Lưu trữ ----------
  // Bản cài (.exe): lưu ra file data.json trong thư mục dữ liệu của app (window.hakStore, xem preload.js).
  // Mở bằng trình duyệt: lưu trong localStorage.
  var store = window.hakStore || null, fromLocal = false, loadError = null, readOnly = false;
  var db = (function () {
    if (store) {
      var res = store.load();
      if (res && res.ok === false) { loadError = res; readOnly = true; return {}; } // file hỏng: KHÔNG ghi đè, chuyển sang màn hình khôi phục
      if (res && res.text) { try { return JSON.parse(res.text); } catch (e) { loadError = { error: "Không đọc được dữ liệu: " + e.message, backups: store.listBackups() }; readOnly = true; return {}; } }
    }
    var s = null; try { s = localStorage.getItem(KEY); } catch (e) { s = null; }
    if (s) {
      // Dữ liệu trong trình duyệt bị hỏng: KHÔNG coi là rỗng (sẽ bị ghi đè) — chuyển sang màn hình khôi phục
      try { fromLocal = !!store; return JSON.parse(s); } catch (e) { loadError = { error: "Dữ liệu lưu trong trình duyệt bị hỏng: " + e.message, backups: [] }; readOnly = true; return {}; }
    }
    return {};
  })();
  // Kiểm tra CẤU TRÚC trước khi nâng cấp/chuẩn hóa: bảng sai kiểu, file của bản mới hơn… → chỉ xem, không ghi đè
  var schemaReport = null;
  if (!readOnly) {
    schemaReport = SCH.validate(db, { tables: Object.keys(ALL), hrTables: Object.keys(HRT) });
    if (schemaReport.fatal.length) { loadError = { error: "Cấu trúc dữ liệu không an toàn để mở:\n- " + schemaReport.fatal.join("\n- "), backups: store && store.listBackups ? store.listBackups() : [], schema: schemaReport }; readOnly = true; }
  }
  // Sao lưu TRƯỚC NÂNG CẤP: chụp nguyên trạng file dữ liệu của bản cũ trước khi chuyển đổi (1 lần cho mỗi lần nâng schema)
  if (!readOnly && store && store.backup && db && Object.keys(db).length && (!db.schemaVersion || db.schemaVersion < 2)) { try { store.backup("truoc-nang-cap"); } catch (e) { /* không chặn mở app */ } }
  /** Làm sạch dữ liệu đưa vào từ hệ thống cũ: chữ "null" trong ô chấm công → ô trống; dòng Tổng (Total) lẫn trong Sản lượng / Bơm dăm → loại bỏ. Trả danh sách thông báo. */
  var migMsg = [];
  if (!readOnly) {
    try { migMsg = HRM.migrate(db).concat(INT.normalizeDataset(db).messages, cleanImportedData(db)); }
    catch (e) { loadError = { error: "Lỗi khi chuyển đổi dữ liệu cũ: " + e.message + " — dữ liệu KHÔNG bị ghi đè", backups: store && store.listBackups ? store.listBackups() : [] }; readOnly = true; }
  }
  // Chỉ TẠO bảng còn thiếu; bảng có nhưng sai kiểu đã bị chặn ở bước kiểm tra cấu trúc (không bao giờ thay bằng bảng rỗng)
  function ensureTables() {
    Object.keys(ALL).concat(["sl_chuyenky", "congty", "kyluong", "kyluong_lichsu", "auditlog", "nguoidung", "baomat", "chungtu", "ocr_ten", "chungtu_lienket", "hdld_tailieu", "ttluong"]).forEach(function (k) {
      if (db[k] === undefined) db[k] = [];
      else if (!Array.isArray(db[k])) throw new Error("Bảng " + k + " sai cấu trúc — không tự thay thế");
    });
    db.schemaVersion = Math.max(2,db.schemaVersion||2);
  }
  if (!readOnly) {
    // Không để lỗi cấu trúc thoát ra làm sập cả app khi khởi động → chuyển sang chế độ chỉ xem / khôi phục (như bước chuyển đổi ở trên)
    try { ensureTables(); }
    catch (e) { loadError = { error: "Lỗi khi kiểm tra bảng dữ liệu: " + e.message + " — dữ liệu KHÔNG bị ghi đè", backups: store && store.listBackups ? store.listBackups() : [] }; readOnly = true; }
  }
  // Phiên bản kho mà giao diện đã nạp/lưu gần nhất; gửi kèm mỗi lần lưu để tiến trình chính từ chối ghi đè khi kho đã đổi ở nơi khác (STALE_BASE).
  var baseSig; try { baseSig = (store && !loadError && store.sig) ? String(store.sig()) : undefined; } catch (e) { baseSig = undefined; }
  var hadInputReviewsOnLoad = !(db && (db.schemaVersion < 5 || db._inputReviews === undefined));
  var lastSaveStale = false, staleDeclined = false, closingNow = false;
  function isStale(r) { return (typeof r === "string" && r.indexOf("STALE_BASE") === 0) || (r && typeof r === "object" && (r.conflict === true || r.code === "STALE_BASE")); }
  /** Kho đã đổi ở nơi khác: bản trong bộ nhớ là bản CŨ. Không ghi; hỏi tải lại (bỏ thay đổi chưa lưu ở màn hình này) hoặc giữ màn hình để xử lý tay. */
  function onStaleBase() {
    if (staleDeclined) return;
    if (confirm("Dữ liệu đã được thay đổi ở nơi khác (ví dụ khôi phục, lưu trữ năm hoặc thao tác khác) nên bản đang mở là bản CŨ. App KHÔNG ghi để tránh ghi đè dữ liệu mới.\n\nBấm OK để tải lại dữ liệu mới (thay đổi chưa lưu ở màn hình này sẽ bị bỏ).\nBấm Hủy để giữ màn hình này (sao lưu ra file nếu cần).")) { dirty = false; clearTimeout(saveTimer); window.location.reload(); }
    else staleDeclined = true;
  }
  var saveTimer = null, dirty = false, lastSaveError = "", lastTxnError = "";
  /** Ghi dữ liệu xuống nơi lưu bền vững. Trả true nếu chắc chắn đã lưu. */
  function saveNow() {
    clearTimeout(saveTimer);
    lastSaveError = "";
    if (readOnly) { lastSaveError = "Đang ở chế độ khôi phục — chưa ghi dữ liệu"; toast("⚠ " + lastSaveError); return false; }
    var str = JSON.stringify(db);
    if (store) { var r; lastSaveStale = false; try { r = store.save(str, baseSig); } catch (e) { r = e && e.message || String(e); } if (r !== true) { lastSaveError = String(r && r.error || r || "Nơi lưu dữ liệu không xác nhận đã ghi thành công"); dirty = true; if (isStale(r)) { lastSaveStale = true; toast("⛔ " + lastSaveError); if (!closingNow) onStaleBase(); return false; } toast("⚠ KHÔNG LƯU ĐƯỢC dữ liệu: " + lastSaveError); return false; } try { if (store.sig) baseSig = String(store.sig()); } catch (e) { /* giữ baseSig cũ */ } dirty = false; hadInputReviewsOnLoad = true; return true; }
    try { localStorage.setItem(KEY, str); dirty = false; hadInputReviewsOnLoad = true; return true; } catch (e) { lastSaveError = "Không ghi được bộ nhớ trình duyệt: " + (e && e.message || String(e)); dirty = true; toast("⚠ " + lastSaveError + " — hãy bấm Sao lưu ra file ngay!"); return false; }
  }
  function saveDelta(mutation) {
    if (readOnly) { lastSaveError = "Đang ở chế độ khôi phục — chưa ghi dữ liệu"; toast("⚠ " + lastSaveError); return { ok: false, error: lastSaveError }; }
    if (mutation && !mutation.baseSig && baseSig) mutation.baseSig = baseSig;
    if (mutation && !mutation.schemaVersion && db && db.schemaVersion) {
      if (db.schemaVersion < 5 || db._inputReviews !== undefined || mutation.table === "_inputReviews" || (mutation.tables && mutation.tables._inputReviews)) {
        mutation.schemaVersion = db.schemaVersion;
      }
    }
    if (store && store.saveDelta) {
      var r;
      lastSaveStale = false;
      try { r = store.saveDelta(mutation, baseSig); } catch (e) { r = { ok: false, error: e && e.message || String(e) }; }
      if (!r || r.ok === false) {
        lastSaveError = String((r && (r.error || r.message)) || "Nơi lưu dữ liệu không xác nhận đã ghi delta thành công");
        dirty = true;
        if (isStale(r)) {
          lastSaveStale = true;
          toast("⛔ " + lastSaveError);
          if (!closingNow) onStaleBase();
          return { ok: false, conflict: true, code: "STALE_BASE", error: lastSaveError };
        }
        toast("⚠ KHÔNG LƯU ĐƯỢC dữ liệu: " + lastSaveError);
        return { ok: false, error: lastSaveError };
      }
      if (r.baseSig) baseSig = String(r.baseSig);
      else if (store.sig) { try { baseSig = String(store.sig()); } catch (e) {} }
      dirty = false;
      if (mutation && mutation.tables && mutation.tables._inputReviews) hadInputReviewsOnLoad = true;
      dbRev++;
      st.kqStale = true;
      return r;
    }
    var ok = saveNow();
    return { ok: ok, baseSig: baseSig, fallback: true };
  }
  var dbRev = 0; // V9.4: tăng mỗi lần dữ liệu đổi → làm hết hiệu lực bản tính lương tạm đang nhớ (kqKy)
  /** V10.1: giao dịch nhiều bước. Chụp các bảng liên quan (+ nhật ký), chạy fn; fn thất bại/ném lỗi HOẶC tiến trình chính từ chối lưu ⇒ HOÀN TÁC toàn bộ trong bộ nhớ.
   * Ghi xuống đĩa NGAY trong một lần lưu duy nhất — main thấy trọn bộ thay đổi (vd. duyệt nghỉ việc = phiếu + hợp đồng + nhân viên) hoặc không thấy gì. */
  function txn(tables, fn) {
    lastTxnError = "";
    var names = tables.concat(["auditlog"]), snap = {}, ok = false, wasDirty = dirty, sessionName = session && session.tenDangNhap;
    names.forEach(function (k) { snap[k] = JSON.stringify(db[k] || []); });
    try { ok = fn() !== false; if (!ok) lastTxnError = "Thao tác kiểm tra dữ liệu không cho phép ghi"; } catch (e) { ok = false; lastTxnError = String(e && e.message || e); toast("⛔ Lỗi khi xử lý: " + lastTxnError); }
    if (ok) {
      var hasReviews = (typeof hadInputReviewsOnLoad !== "undefined" ? hadInputReviewsOnLoad : !(db && (db.schemaVersion < 5 || db._inputReviews === undefined)));
      if (!wasDirty && hasReviews && typeof store !== "undefined" && store && store.saveDelta && !(typeof window !== "undefined" && window && window.HAK_SAVE === "full") && (typeof readOnly !== "undefined" ? !readOnly : true) && typeof saveDelta === "function") {
        var deltaTables = {};
        names.forEach(function (k) { deltaTables[k] = db[k] || []; });
        var res = saveDelta({ tables: deltaTables, baseSig: typeof baseSig !== "undefined" ? baseSig : undefined });
        if (res && res.ok) {
          ok = true;
        } else if (res && (res.conflict || isStale(res))) {
          ok = false;
          lastTxnError = lastSaveError;
        } else {
          ok = saveNow();
          if (ok) { dbRev++; st.kqStale = true; }
          if (!ok) lastTxnError = lastSaveError;
        }
      } else {
        ok = saveNow();
        if (ok) { dbRev++; st.kqStale = true; }
        if (!ok) lastTxnError = lastSaveError;
      }
    } // dữ liệu đã đổi → làm hết hiệu lực bản tính lương tạm
    if (!ok) { names.forEach(function (k) { db[k] = JSON.parse(snap[k]); }); dbRev++; st.kqStale = true; dirty = wasDirty; if (names.indexOf("nguoidung") >= 0) session = sessionName ? PERM.findUser(db, sessionName) : null; if (wasDirty) { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 400); } }
    return ok;
  }
  function save() { dbRev++; dirty = true; st.kqStale = true; clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 400); }
  function backupNow(tag) { if (!store || !store.backup) return null; if (dirty && !saveNow()) return null; return store.backup(tag); }
  // P0: backupNow() có thể âm thầm thất bại (đĩa đầy, mất quyền ghi…) và trả null — các hành động KHÔNG THỂ
  // HOÀN TÁC (xóa hẳn dữ liệu) phải DỪNG LẠI khi sao lưu thất bại, không được tiếp tục xóa như chưa có gì xảy ra.
  function backupOrBlock(tag, label) {
    var n = backupNow(tag);
    // Máy mới chưa có file dữ liệu (khôi phục/nhập lần đầu): không có gì để sao lưu — không phải lỗi đĩa, đừng chặn
    if (!n && !dirty && store && store.hasDataFile && store.hasDataFile() === false) return true;
    if (!n) { alert("⛔ KHÔNG tạo được bản sao lưu trước khi " + label + " — dữ liệu CHƯA bị xóa, để tránh mất không thể khôi phục.\nKiểm tra dung lượng đĩa / quyền ghi ở Công ty & Sao lưu rồi thử lại."); return false; }
    return true;
  }
  // Người thực hiện: tên người dùng khai báo trên máy này (Công ty & Sao lưu) hoặc tài khoản Windows
  var winUser = (function () { try { return store && store.whoami ? store.whoami() : null; } catch (e) { return null; } })();
