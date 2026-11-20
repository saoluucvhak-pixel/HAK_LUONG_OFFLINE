// ===== CORE / REPOSITORY — 1 cửa ghi dữ liệu nghiệp vụ (2.0 PR3) =====
// Mọi thêm / sửa / xóa bản ghi đi qua đây để các kiểm tra luôn chạy ĐỦ và ĐÚNG THỨ TỰ, TRƯỚC khi dữ liệu bị thay đổi:
//   1. quyền theo bảng (input.edit / dm.edit / hr.edit)
//   2. ô ngày chấm công hợp lệ (R-03d)
//   3. trùng khóa nghiệp vụ (hồ sơ nhân sự)
//   4. Q-15: phụ lục / hợp đồng đã dùng tính lương kỳ đã chốt → khóa (kể cả Admin)
//   5. kỳ đã chốt (locked) → chặn; hồi tố (retro) → chỉ Admin (Q-14), có thể yêu cầu xác nhận
// Hai bước: plan() chỉ kiểm tra, KHÔNG sửa gì → giao diện hỏi xác nhận nếu cần → apply() kiểm tra lại rồi mới ghi.
// Repository không biết giao diện. Các thao tác nhiều dòng lưu qua giao dịch do app cung cấp.
(function (root) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var V = isNode ? require("./validate.js") : root.HAKCore.validate;
  var GRD = isNode ? require("./period-guard.js") : root.HAKCore.guard;
  var IMP = isNode ? require("./importer.js") : root.HAKCore.importer;
  function faMod() { return isNode ? require("./payroll/formula-approval.js") : root.HAKCore.formulaApproval; } // nạp muộn: trình duyệt tải module công thức sau repository.js

  var MONTHLY = { chamcong: 1, sanluong: 1, bandam: 1, psluong: 1, ungluong: 1, tiencom: 1 };
  // Bảng con của hợp đồng (đổi Số HĐLĐ / xóa hợp đồng thì đổi / xóa theo) — giữ khớp hr.js HD_TABS
  var HD_CHILD_DEFAULT = ["chitiethd", "quyenloiphep", "nghiphep", "nghiom", "khamsk", "khenthuong", "noiquy", "tailieu", "hdld_tailieu"];

  function permFor(table) { return /^dm_/.test(table) ? "dm.edit" : MONTHLY[table] ? "input.edit" : table === "congty" ? "system.admin" : "hr.edit"; }
  function labels(ps) { return ps.map(GRD.label).join(", "); }
  function retroText(imp) {
    return "Dữ liệu này có hiệu lực trong kỳ lương ĐÃ CHỐT: " + labels(imp.periods) + ".\n" +
      "• Bảng lương đã chốt KHÔNG thay đổi.\n• Muốn áp dụng cho kỳ đó: Kỳ lương đã chốt → Mở chốt (ghi lý do) → tính lại → chốt lại (phiên bản mới, có so sánh trước/sau).";
  }
  function identOf(r) {
    if (!r) return "";
    return [r["Mã NV"], r["Số HĐLĐ"], r["Hiệu lực từ"] || r["Từ ngày"] || r["Ngày vào làm"], r["Mã lương"] || r["Mã phụ cấp"] || r["Mã phòng ban"] || r["Mã chức vụ"] || r["Mã công thức"]].filter(Boolean).join(" · ");
  }

  /**
   * @param ctx {
   *   db: function () → dữ liệu hiện tại (app có thể thay cả object khi khôi phục)
   *   can: function (perm) → bool (quyền của người đang đăng nhập)
   *   audit: function (action, detail) — ghi nhật ký (app giữ việc cắt nhật ký + sao lưu)
   *   uid: function () → id mới
   *   tableName: function (table) → tên hiển thị
   *   hdChildren: [bảng con của hợp đồng] (mặc định HD_CHILD_DEFAULT)
   * }
   */
  function createRepo(ctx) {
    var hdChildren = ctx.hdChildren || HD_CHILD_DEFAULT;
    var tname = ctx.tableName || function (t) { return t; };

    function deny(code, msg, extra) { return Object.assign({ ok: false, code: code, msg: msg }, extra || {}); }

    /**
     * Kiểm tra 1 thao tác, KHÔNG sửa dữ liệu.
     * @param op "insert" | "update" | "remove"
     * @param target dòng đang có (update/remove) — đúng object trong db
     * @param values insert: dòng mới; update: các trường thay đổi (patch)
     * @param opts { what: "sửa phụ lục" (dùng trong thông báo), checkDup: true (hồ sơ: chặn trùng khóa) }
     * @returns { ok, code?, msg?, op, table, target, values, before, after, impact, retro, confirmMsg }
     */
    function plan(op, table, target, values, opts) {
      opts = opts || {};
      var db = ctx.db(), what = opts.what || (op === "insert" ? "thêm dữ liệu" : op === "remove" ? "xóa dữ liệu" : "sửa dữ liệu");
      var before = op === "insert" ? null : Object.assign({}, target);
      var after = op === "remove" ? null : op === "insert" ? Object.assign({}, values) : Object.assign({}, target, values);
      var base = { op: op, table: table, target: target, values: values, before: before, after: after, opts: opts };
      if (!Array.isArray(db[table])) return deny("table", "Bảng '" + table + "' không có trong dữ liệu");
      if (op !== "insert" && db[table].indexOf(target) < 0) return deny("stale", "Dòng này không còn trong dữ liệu (đã bị sửa / xóa ở thao tác khác) — hãy tải lại màn hình");
      // 1. quyền
      var perm = permFor(table);
      // Công thức tiền lương: người có quyền duyệt cũng được ghi (việc được phép làm cụ thể do formula-approval.check quyết định)
      if (!ctx.can(perm) && !(table === "dm_congthuc" && ctx.can("formula.approve"))) return deny("perm", "Bạn không có quyền " + what + " (" + tname(table) + ")");
      var inputSafety = isNode ? require('./input-safety.js') : root.HAKCore.inputSafety;
      if (inputSafety) { var unsafe = inputSafety.mutation(db, table, target, after); if (unsafe) return deny('input', unsafe); }
      // 2. ô ngày chấm công
      if (table === "chamcong" && after) {
        var leave = isNode ? require("./leave-reconciliation.js") : root.HAKCore.leaveReconciliation;
        var leaveError = leave && leave.attendanceMutation(db, before, after);
        if (leaveError) return deny("leave", leaveError);
        for (var d = 1; d <= 31; d++) {
          var c = ("0" + d).slice(-2);
          if (before && before[c] === after[c]) continue; // không chặn vì ô CŨ sai mà người dùng không sửa
          var dc = V.dayCell(c, after[c], after["Kỳ"]);
          if (dc.error) return deny("invalid", dc.error);
        }
      }
      var voucher = table === "psluong" || table === "ungluong";
      var crossPeriod = voucher && IMP.crossPeriod(table, before, after);
      if (crossPeriod) return deny("period", crossPeriod);
      // 3. trùng khóa nghiệp vụ
      if ((opts.checkDup || voucher) && after) {
        var k = IMP.keyOf(table, after);
        if (k && db[table].some(function (r) { return r !== target && IMP.keyOf(table, r) === k; }))
          return deny("dup", "Đã có bản ghi trùng (" + (IMP.KEYS[table] || []).join(" + ") + "). Hãy sửa bản ghi đó thay vì thêm mới.");
      }
      // 3b. 013-B: NGHI TRÙNG theo khóa chuẩn hóa (nv01 = NV 01 = ＮＶ01; pc-001 = PC - 001) cho mọi bảng có khóa dò (nhân sự, hợp đồng, sản lượng, ban dăm, tiền cơm, thưởng/trừ, tạm ứng). Chỉ kiểm khi khóa THAY ĐỔI/thêm mới, nên dữ liệu cũ đã lỡ trùng không chặn việc sửa ô khác.
      if (after && V.NEAR_COLS && V.NEAR_COLS[table]) {
        var nearCols = V.NEAR_COLS[table], nk = V.nearKeyOf(table, after), keyChanged = !before || nearCols.some(function (c) { return String(before[c] == null ? "" : before[c]).trim() !== String(after[c] == null ? "" : after[c]).trim(); });
        if (nk && keyChanged) {
          var twin = db[table].filter(function (r) { return r !== target && V.nearKeyOf(table, r) === nk; })[0];
          if (twin) return deny("dup", "Nghi trùng: đã có bản ghi có khóa giống (" + nearCols.map(function (c) { return twin[c]; }).join(" / ") + ") — chỉ khác chữ hoa/thường, khoảng trắng hoặc ký tự. Hãy sửa bản ghi đó thay vì thêm mới.");
        }
      }
      // 4. Q-15
      if (table === "chitiethd" && before) {
        var fz = GRD.frozenAppendix(db, before);
        if (fz.length) return deny("frozen", op === "remove"
          ? "⛔ Không xóa được: phụ lục này đã dùng tính lương kỳ ĐÃ CHỐT " + labels(fz) + " (quy tắc Q-15)."
          : "⛔ Phụ lục này đã dùng để tính lương kỳ ĐÃ CHỐT " + labels(fz) + " — không được sửa (quy tắc Q-15).\nMuốn thay đổi lương/chức vụ/phòng ban: bấm '＋ Thêm' để lập PHỤ LỤC MỚI có ngày hiệu lực từ kỳ chưa chốt.", { periods: fz });
      }
      if (table === "hopdong" && before && (op === "remove" || before["Số HĐLĐ"] !== after["Số HĐLĐ"])) {
        var fzH = GRD.frozenOfContract(db, before["Mã NV"], before["Số HĐLĐ"]);
        if (fzH.length) return deny("frozen", op === "remove"
          ? "⛔ Không xóa được: phụ lục của hợp đồng này đã dùng tính lương kỳ ĐÃ CHỐT " + labels(fzH) + " (quy tắc Q-15)."
          : "⛔ Không đổi được Số HĐLĐ: phụ lục của hợp đồng này đã dùng tính lương kỳ đã chốt " + labels(fzH) + " (Q-15).", { periods: fzH });
      }
      // 4a. R-27 (+ R-44: kiểm ở tầng nghiệp vụ): không đổi Mã NV đã có trong bảng lương ĐÃ CHỐT — kể cả Admin (bản chốt không bao giờ bị sửa)
      if (table === "nhanvien" && op === "update" && before && after && String(before["Mã NV"] || "") !== String(after["Mã NV"] || "")) {
        var refs27 = GRD.references(db, before["Mã NV"]);
        if (refs27.kyluong || refs27.kyluong_lichsu) return deny("frozen", "⛔ Không đổi được Mã NV " + before["Mã NV"] + ": mã này đã có trong bảng lương ĐÃ CHỐT (R-27).");
      }
      // 4b. duyệt & phiên bản công thức tiền lương (Master V5 GĐ2) — kiểm tra ở tầng ghi, không đi vòng được
      var fpatch = null, FA = faMod();
      if (table === FA.TABLE) {
        var fc = FA.check(op, before, after, { can: ctx.can, user: ctx.user ? ctx.user() : "", now: ctx.now ? ctx.now() : null, db: db });
        if (!fc.ok) return deny(fc.code, fc.msg);
        fpatch = fc.patch;
        if (op !== "remove") Object.keys(fpatch).forEach(function (k) { after[k] = fpatch[k]; });
      }
      // 5. kỳ đã chốt / hồi tố — công thức chưa "Hiệu lực" (nháp/chờ duyệt/đã duyệt/ngừng) không ảnh hưởng kỳ nào
      var fHL = function (r) { return r && String(r["Trạng thái"] || "") === "Hiệu lực"; };
      var onlyLink = table === FA.TABLE && op === "update" && Object.keys(after).concat(Object.keys(before)).every(function (k) { return FA.LINKS.indexOf(k) >= 0 || k === "Liên kết lúc" || JSON.stringify(before[k]) === JSON.stringify(after[k]); }); // V10.2: chỉ gán/xóa liên kết cha — không đổi cách tính nên không phải hồi tố
      var imp = table === FA.TABLE && (onlyLink || (!fHL(before) && !fHL(after))) ? { kind: "none", periods: [] } : GRD.impactChange(db, table, before, after);
      if (imp.kind === "locked") return deny("locked", "Không thể " + what + ": dữ liệu thuộc kỳ " + labels(imp.periods) + " đã chốt lương. Hãy mở chốt trước.", { impact: imp });
      if (imp.kind === "retro" && !ctx.can("retro.edit"))
        return deny("retro", "⛔ Không thể " + what + ": dữ liệu có hiệu lực trong kỳ lương đã chốt " + labels(imp.periods) + ".\nChỉ Admin được sửa dữ liệu hồi tố (Q-14).", { impact: imp });
      return Object.assign(base, { ok: true, patch: fpatch || {}, impact: imp, retro: imp.kind === "retro",
        confirmMsg: imp.kind === "retro" ? what.charAt(0).toUpperCase() + what.slice(1) + "?\n\n" + retroText(imp) + "\n\nVẫn lưu thay đổi?" : "" });
    }

    /**
     * Ghi theo kế hoạch đã duyệt. Kiểm tra LẠI (dữ liệu có thể đã đổi trong lúc hỏi xác nhận) rồi mới sửa.
     * @param p kết quả plan() (ok = true)
     * @param o { audit: "always" | "retro" | false (mặc định "always"), action: nhãn nhật ký }
     * @returns { ok, row?, code?, msg? }
     */
    function apply(p, o) {
      o = o || {};
      if (!p || !p.ok) return p || deny("plan", "Chưa kiểm tra thao tác");
      var q = plan(p.op, p.table, p.target, p.values, p.opts);
      if (!q.ok) return q;
      if (q.retro !== p.retro) return deny("changed", "Dữ liệu vừa thay đổi — hãy thử lại");
      var db = ctx.db(), list = db[q.table], row = null;
      // Mọi kiểm tra đã qua → bây giờ mới sửa dữ liệu
      if (q.op === "insert") { row = Object.assign({ _id: ctx.uid() }, q.values, q.patch); list.push(row); }
      else if (q.op === "update") {
        row = q.target;
        var oldHD = q.table === "hopdong" ? q.before["Số HĐLĐ"] : null;
        Object.assign(row, q.values, q.patch);
        if (oldHD != null && oldHD !== row["Số HĐLĐ"])
          hdChildren.forEach(function (k) { (db[k] || []).forEach(function (r) { if (r["Mã NV"] === q.before["Mã NV"] && r["Số HĐLĐ"] === oldHD) r["Số HĐLĐ"] = row["Số HĐLĐ"]; }); });
      } else {
        list.splice(list.indexOf(q.target), 1);
        if (q.table === "hopdong")
          hdChildren.forEach(function (k) {
            if (!db[k]) return;
            // V9.2: liên kết tài liệu HĐLĐ KHÔNG bị xóa theo hợp đồng (file gốc + lịch sử phải còn truy xuất): chỉ đánh dấu "Hợp đồng đã xóa"
            if (k === "hdld_tailieu") { db[k].forEach(function (y) { if (y["Mã NV"] === q.before["Mã NV"] && y["Số HĐLĐ"] === q.before["Số HĐLĐ"] && y["Trạng thái"] === "Hiệu lực") { y["Trạng thái"] = "Hợp đồng đã xóa"; y["Gỡ lúc"] = new Date().toISOString(); } }); return; }
            db[k] = db[k].filter(function (y) { return !(y["Mã NV"] === q.before["Mã NV"] && y["Số HĐLĐ"] === q.before["Số HĐLĐ"]); });
          });
      }
      var mode = o.audit == null ? "always" : o.audit;
      if (mode === "always" || (mode === "retro" && q.retro)) {
        var ch = GRD.changedFields(q.before, q.op === "remove" ? null : row), id = identOf(q.after || q.before);
        ctx.audit(o.action || (q.op === "insert" ? "Thêm" : q.op === "remove" ? "Xóa" : "Sửa") + " dữ liệu",
          tname(q.table) + (id ? " · " + id : "") + (ch.length ? " · " + ch.slice(0, 12).join("; ") : "") +
          (q.retro ? " · [HỒI TỐ kỳ đã chốt " + labels(q.impact.periods) + "]" : ""));
      }
      return { ok: true, row: row, retro: q.retro, impact: q.impact };
    }

    // Batch operations use the same durable transaction as the other multi-table workflows.
    function writeBatch(tables, fn) {
      var value;
      var ok = ctx.transaction(Array.from(new Set(tables)), function () {
        value = fn(ctx.db());
        return true;
      });
      return { ok: ok, value: value };
    }

    var appliedImports = new WeakSet();
    function importWorkbook(plans, fileName, mode, isHr) {
      if (plans.some(function (p) { return appliedImports.has(p); })) return deny("stale", "Kế hoạch nhập đã được ghi. Mở lại bản xem trước nhập Excel.");
      var affected = plans.filter(function (p) {
        return p.items.some(function (item) { return item.action === "add" || item.action === "update"; });
      });
      if (affected.some(function (p) { return !ctx.can(permFor(p.table)); })) return deny("perm", "Không có quyền ghi dữ liệu nhập.");
      var db = ctx.db(), keys = new Map(), retroKy = {};
      for (var p of affected) {
        var rows = db[p.table] || [], tableKeys = keys.get(p.table);
        if (!tableKeys) { tableKeys = new Set(rows.map(function (row) { return IMP.keyOf(p.table, row); })); keys.set(p.table, tableKeys); }
        for (var item of p.items) {
          if (item.action !== "add" && item.action !== "update") continue;
          var before = item.target || null, after = Object.assign({}, before);
          Object.keys(item.row).forEach(function (field) {
            var value = item.row[field];
            if (!before || p.mode === "replace" || (value !== "" && value != null)) after[field] = value;
          });
          var move = IMP.crossPeriod(p.table, before, after);
          if (move) return deny("period", move);
          var impact = GRD.impactChange(db, p.table, before, after), key = IMP.keyOf(p.table, after);
          if (impact.kind === "locked" || (impact.kind === "retro" && !ctx.can("retro.edit")) ||
              (p.table === "chitiethd" && before && GRD.frozenAppendix(db, before).length)) return deny("locked", "Dữ liệu thuộc kỳ đã chốt. Mở lại bản xem trước nhập Excel.");
          if (impact.kind === "retro") impact.periods.forEach(function (k) { retroKy[k] = 1; }); // 004.1b: nhật ký nhập ghi rõ hồi tố như khi sửa tay
          if ((item.action === "update" && rows.indexOf(before) < 0) ||
              (key && tableKeys.has(key) && (!before || IMP.keyOf(p.table, before) !== key))) return deny("stale", "Dữ liệu đã đổi hoặc trùng khóa. Mở lại bản xem trước nhập Excel.");
          if (key) tableKeys.add(key);
        }
      }
      var result = writeBatch(affected.map(function (p) { return p.table; }), function (db) {
        var count = affected.reduce(function (total, p) {
          return total + IMP.apply(db, p, ctx.uid, isHr(p.table));
        }, 0);
        ctx.audit("Nhập Excel", fileName + " (" + (mode === "replace" ? "ghi đè cả dòng" : "bổ sung") + "): " +
          plans.map(function (p) { return p.table + " +" + p.summary.add + "/~" + p.summary.update + (p.summary.merged ? "/gộp " + p.summary.merged : ""); }).join(", ") +
          (Object.keys(retroKy).length ? " · [HỒI TỐ kỳ đã chốt " + labels(Object.keys(retroKy).sort()) + "]" : ""));
        return count;
      });
      if (result.ok) affected.forEach(function (p) { appliedImports.add(p); });
      return result;
    }

    function mergeAttendance() {
      if (!ctx.can("input.edit")) return deny("perm", "Không có quyền gộp chấm công.");
      var integrity = isNode ? require("./integrity.js") : root.HAKCore.integrity;
      return writeBatch(["chamcong"], function (db) {
        var result = integrity.mergeChamCong(db, Object.fromEntries(GRD.closedPeriods(db).map(function (p) { return [p, true]; })));
        ctx.audit("Gộp dòng chấm công trùng", result.groups + " nhóm, bỏ " + result.removed + " dòng thừa" +
          (result.dupDays ? ", " + result.dupDays + " ngày nhập trùng tính 1 lần" : "") + (result.skipped.length ? ", giữ nguyên " + result.skipped.length + " nhóm" : ""));
        return result;
      });
    }

    function createEmployee(input) {
      if (!ctx.can("hr.edit")) return deny("perm", "Không có quyền thêm nhân viên.");
      var creator = isNode ? require("./hr-create.js") : root.HAKCore.hrCreate;
      var errors = creator.validate(input, ctx.db());
      if (errors.length) return deny("invalid", errors.join("; "));
      var rows = creator.build(input, ctx.uid), tables = Object.keys(rows);
      return writeBatch(tables, function (db) {
        tables.forEach(function (table) { rows[table].forEach(function (row) { db[table].push(row); }); });
        ctx.audit("Thêm nhân viên", input.b["Mã NV"] + " — " + input.b["Họ và tên"] +
          " (" + tables.filter(function (table) { return rows[table].length; }).join(", ") + ")");
      });
    }

    function removeEmployee(employee, tables) {
      var db = ctx.db(), ma = employee["Mã NV"];
      if (!ctx.can("hr.edit")) return deny("perm", "Không có quyền xóa nhân viên.");
      if (db.nhanvien.indexOf(employee) < 0) return deny("stale", "Hồ sơ đã thay đổi. Mở lại trước khi xóa.");
      var refs = GRD.references(db, ma), closed = refs.kyluong || refs.kyluong_lichsu;
      if (closed && !ctx.can("retro.edit")) return deny("locked", "Nhân viên có trong kỳ đã chốt. Chỉ Admin được xóa hồ sơ.");
      return writeBatch(tables, function (current) {
        tables.forEach(function (table) { current[table] = (current[table] || []).filter(function (row) { return row["Mã NV"] !== ma; }); });
        ctx.audit("Xóa nhân viên", ma + " — " + employee["Họ và tên"] + (closed ? " [có trong bảng lương đã chốt]" : ""));
      });
    }

    function saveWorkflowRows(table, rows, action, detail) {
      if (!["benefitStandards", "benefitAssignments", "benefitIssues", "benefitPpeItems", "benefitAdjustments", "productionAttendance"].includes(table)) return deny("table", "Bảng nghiệp vụ không hợp lệ.");
      return writeBatch([table], function (current) {
        current[table] = rows;
        ctx.audit(action, detail);
      });
    }

    return { saveWorkflowRows: saveWorkflowRows, plan: plan, apply: apply, importWorkbook: importWorkbook, mergeAttendance: mergeAttendance, createEmployee: createEmployee, removeEmployee: removeEmployee, permFor: permFor, retroText: retroText, identOf: identOf };
  }

  // ===== 012-B1 (issue #113): SAO LƯU / KHÔI PHỤC THEO KỲ LƯƠNG — LÕI THUẦN (không I/O, không giao diện) =====
  // Nhóm A "phát sinh của kỳ" (xóa phần của kỳ rồi ghi lại theo gói; kỳ khác KHÔNG đổi) · nhóm B "toàn bộ" (nhân sự + dm_*: ghi đè bằng bản trong gói).
  // Mặc định chỉ THÊM + SỬA nhóm B; XÓA là tùy chọn (allowDelete) và KHÔNG BAO GIỜ xóa hàng đang được dữ liệu kỳ khác tham chiếu. Kỳ đã chốt ở máy → chặn hẳn.
  var PERIOD_TABLES = ["chamcong", "sanluong", "bandam", "psluong", "ungluong", "tiencom", "kyluong", "kyluong_lichsu", "payrollApprovals", "_inputReviews", "productionAttendance", "sl_chuyenky"];
  var HR_TABLES = ["nhanvien", "hopdong", "chitiethd", "nhanthan", "thanhtoan", "canhan"];
  var isGlobalTable = function (t) { return HR_TABLES.indexOf(t) >= 0 || /^dm_/.test(t); };
  var KY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
  var kyOfDate = function (d) { return (V.normDate(d) || String(d == null ? "" : d)).slice(0, 7); };
  var jc = function (x) { return JSON.parse(JSON.stringify(x)); };
  function canon(v) { if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]"; if (v && typeof v === "object") return "{" + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ":" + canon(v[k]); }).join(",") + "}"; return JSON.stringify(v === undefined ? null : v); }
  /** Kỳ của một dòng (null nếu dòng không thuộc kỳ nào theo quy tắc của bảng). Khớp rowInKy của giao diện. */
  var nk = function (v) { var s0 = String(v == null ? "" : v).trim(); return s0 ? (V.normKy(s0) || s0) : null; }; // "2026-9" = "09/2026" = "2026-09"
  function kyOfRow(t, r) {
    if (!r) return null;
    if (t === "chamcong") return nk(r["Kỳ"]);
    if (t === "sanluong" || t === "bandam") return kyOfDate(r["Ngày cân"]) || null;
    if (t === "psluong" || t === "ungluong") return kyOfDate(r["Ngày hạch toán"]) || null;
    if (t === "tiencom") return kyOfDate(r["Ngày"]) || null;
    if (t === "kyluong" || t === "kyluong_lichsu" || t === "payrollApprovals") return nk(r.ky);
    if (t === "_inputReviews") return nk(r.period);
    if (t === "productionAttendance") return kyOfDate(r.date) || null;
    if (t === "sl_chuyenky") return nk(r.target); // chỉ dòng chuyển VÀO kỳ này thuộc kỳ
    return null;
  }
  var inKy = function (t, r, ky) { return kyOfRow(t, r) === ky; };
  var closedKy = function (db, ky) { return (db.kyluong || []).some(function (k) { return k && nk(k.ky) === ky; }); };
  var srcOut = function (r, ky) { return r && nk(r.source) === ky && nk(r.target) !== ky; }; // sl_chuyenky: chuyển TỪ kỳ này sang kỳ khác
  /** Cắt lát để đóng gói: { period:{bảng:[dòng của kỳ]}, global:{bảng:[toàn bộ]}, refOnly:{sl_chuyenky:[source===kỳ, target khác]} } (bản sao sâu). */
  function periodSlice(db, ky) {
    var out = { period: {}, global: {}, refOnly: { sl_chuyenky: [] } };
    PERIOD_TABLES.forEach(function (t) { if (Array.isArray(db[t])) out.period[t] = jc(db[t].filter(function (r) { return inKy(t, r, ky); })); });
    Object.keys(db).forEach(function (t) { if (Array.isArray(db[t]) && isGlobalTable(t)) out.global[t] = jc(db[t]); });
    out.refOnly.sl_chuyenky = jc((db.sl_chuyenky || []).filter(function (r) { return srcOut(r, ky); }));
    return out;
  }
  // khóa nhận diện một dòng ở bảng nhóm B
  var HR_KEY = { nhanvien: ["Mã NV"], hopdong: ["Mã NV", "Số HĐLĐ"], chitiethd: ["Mã NV", "Số HĐLĐ", "Hiệu lực từ"] };
  function keyCols(t, rows) { if (HR_KEY[t]) return HR_KEY[t]; if (IMP.KEYS && IMP.KEYS[t]) return IMP.KEYS[t]; if (/^dm_/.test(t) && rows.length) { var c0 = Object.keys(rows[0])[0], cols = [c0]; if (c0 !== "Hiệu lực từ" && "Hiệu lực từ" in rows[0]) cols.push("Hiệu lực từ"); return cols; } return null; }
  function keyer(t, a, b) { // khóa theo cột; trùng khóa (hoặc không có cột khóa) → khóa theo NỘI DUNG (chỉ thêm/xóa, không "sửa")
    var cols = keyCols(t, a.concat(b)), byCols = function (r) { return cols.map(function (c) { return String(r[c] == null ? "" : r[c]); }).join("|"); };
    if (cols) { var dup = false; [a, b].forEach(function (rows) { var s = {}; rows.forEach(function (r) { var k = byCols(r); if (s[k]) dup = true; s[k] = 1; }); }); if (!dup) return { fn: byCols, byContent: false, label: function (r) { return cols.map(function (c) { return r[c]; }).join(" / "); } }; }
    return { fn: function (r) { return canon(r); }, byContent: true, dupKeys: !!cols, cols: cols, label: function (r) { return canon(r).slice(0, 80); } };
  }
  var strFields = function (r) { return Object.keys(r || {}).map(function (k) { return r[k]; }).filter(function (v) { return typeof v === "string" && v; }); };
  /** Kỳ khác (≠ ky) đang dùng Mã NV `ma` (dòng phát sinh hoặc bản chốt) */
  function kyUsingMa(db, ky, ma) {
    var set = {};
    PERIOD_TABLES.forEach(function (t) {
      (db[t] || []).forEach(function (r) {
        if (!r) return; var k = kyOfRow(t, r);
        if (t === "kyluong" || t === "kyluong_lichsu") { if (nk(r.ky) !== ky && r.kq && (r.kq.bangluong || []).some(function (x) { return x["Mã NV"] === ma; })) set[r.ky] = 1; }
        else if ((r["Mã NV"] === ma || r.ma === ma) && k && k !== ky) set[k] = 1;
      });
    });
    return Object.keys(set).sort();
  }
  var EXTRA_EMP_TABLES = ["benefitAssignments", "benefitIssues", "benefitAdjustments"];
  function rowUsesEmployee(r, ma) {
    if (!r) return false;
    if (r["Mã NV"] === ma || r.employee === ma || r.ma === ma) return true;
    return Array.isArray(r.lines) && r.lines.some(function (l) { return l && (l.employee === ma || l["Mã NV"] === ma || l.ma === ma); });
  }
  /** Bảng ngoài nhóm kỳ / nhóm toàn bộ đang tham chiếu Mã NV `ma` (tránh xóa làm mồ côi nghiphep, khenthuong, benefitIssues…). */
  function extraRefsUsingMa(db, ma) {
    var set = {}, refs = (GRD && typeof GRD.references === "function") ? GRD.references(db, ma) : {};
    Object.keys(refs).forEach(function (t) {
      if (!isGlobalTable(t) && PERIOD_TABLES.indexOf(t) < 0) set[t] = 1;
    });
    EXTRA_EMP_TABLES.forEach(function (t) {
      if ((db[t] || []).some(function (r) { return rowUsesEmployee(r, ma); })) set[t] = 1;
    });
    return Object.keys(set).sort();
  }
  /** Kỳ khác đang dùng mã danh mục `code` (ở phát sinh kỳ khác) + số dòng chitiethd dùng. */
  function usesOfCode(db, ky, code) {
    var set = {}, hd = 0;
    (db.chitiethd || []).forEach(function (r) { if (strFields(r).indexOf(code) >= 0) hd++; });
    PERIOD_TABLES.forEach(function (t) { if (t === "kyluong" || t === "kyluong_lichsu") return; (db[t] || []).forEach(function (r) { var k = kyOfRow(t, r); if (k && k !== ky && strFields(r).indexOf(code) >= 0) set[k] = 1; }); });
    return { kys: Object.keys(set).sort(), hd: hd };
  }
  function deleteBlock(db, ky, t, row, lookup) { // → "" nếu xóa được, ngược lại lý do tiếng Việt
    if (row && "Mã NV" in row) {
      var ma = row["Mã NV"], kys = kyUsingMa(db, ky, ma), refs = extraRefsUsingMa(db, ma), parts = [];
      if (kys.length) parts.push("kỳ " + kys.join(", "));
      if (refs.length) parts.push("bảng " + refs.join(", "));
      if (parts.length) return "không xóa vì " + parts.join(" và ") + " đang dùng Mã NV " + ma;
      return "";
    }
    if (/^dm_/.test(t)) { var code = String(row[Object.keys(row)[0]] == null ? "" : row[Object.keys(row)[0]]); if (!code) return ""; var u = usesOfCode(lookup, ky, code); var why = []; if (u.hd) why.push("chitiethd (" + u.hd + " dòng)"); if (u.kys.length) why.push("kỳ " + u.kys.join(", ")); if (why.length) return "không xóa vì " + why.join(" và ") + " đang dùng mã " + code; }
    return "";
  }
  function planPeriodRestore(db, payload, ky, opt) {
    opt = opt || {}; db = db || {};
    var out = { ok: true, ky: ky, errors: [], blocked: "", period: {}, global: {}, slOther: [], otherOpenPeriods: [], warning: "", warnings: [], deletes: { allowed: !!opt.allowDelete, rows: [], blocked: [] }, counts: { period: 0, add: 0, change: 0, remove: 0 } };
    var fail = function (m) { out.ok = false; out.errors.push(m); };
    if (!KY_RE.test(String(ky || ""))) { fail("Kỳ '" + ky + "' sai định dạng (cần YYYY-MM)."); return out; }
    if (!payload || typeof payload !== "object" || !payload.period || typeof payload.period !== "object" || !payload.global || typeof payload.global !== "object") { fail("Gói thiếu cấu trúc (period/global) — không dùng được."); return out; }
    Object.keys(payload.period).forEach(function (t) {
      if (PERIOD_TABLES.indexOf(t) < 0) { fail("Gói chứa bảng '" + t + "' không thuộc nhóm phát sinh của kỳ."); return; }
      if (!Array.isArray(payload.period[t])) { fail("Bảng '" + t + "' trong gói không phải danh sách."); return; }
      var stray = payload.period[t].filter(function (r) { return !inKy(t, r, ky); }).length; if (stray) fail("Bảng '" + t + "' có " + stray + " dòng không thuộc kỳ " + ky + " — gói bị sửa hoặc sai kỳ.");
    });
    Object.keys(payload.global).forEach(function (t) { if (!isGlobalTable(t)) fail("Gói chứa bảng '" + t + "' không thuộc nhóm nhân sự/danh mục."); else if (!Array.isArray(payload.global[t])) fail("Bảng '" + t + "' trong gói không phải danh sách."); });
    if (!out.ok) return out;
    if (closedKy(db, ky)) { out.ok = false; out.blocked = "Kỳ " + ky + " đã chốt lương ở máy này — không khôi phục đè. Muốn khôi phục phải mở chốt theo quy trình có sẵn (có lý do) rồi làm lại."; return out; }
    // gói chứa BẢN CHỐT của kỳ (lấy lúc kỳ đã chốt) mà máy đang MỞ kỳ → khôi phục sẽ chốt lại: phải cảnh báo + xác nhận riêng (CEO #123)
    out.reclose = ((payload.period.kyluong || []).some(function (r) { return inKy("kyluong", r, ky); }));
    // nhóm A
    var missingPeriodTables = [];
    PERIOD_TABLES.forEach(function (t) {
      var hasInPkg = Object.prototype.hasOwnProperty.call(payload.period, t);
      var cur = (db[t] || []).filter(function (r) { return inKy(t, r, ky); }), pk = payload.period[t] || [];
      if (!hasInPkg) {
        if (cur.length) out.warnings.push("Cảnh báo: Gói thiếu bảng nhóm kỳ '" + t + "' — khôi phục sẽ xóa " + cur.length + " dòng kỳ " + ky + " hiện có ở máy (trước " + cur.length + " -> sau 0).");
        else missingPeriodTables.push(t);
      }
      if (!cur.length && !pk.length) return;
      out.period[t] = { before: cur.length, after: pk.length };
      out.counts.period += pk.length;
    });
    if (missingPeriodTables.length) {
      out.warnings.push("Cảnh báo: Gói thiếu bảng nhóm kỳ (" + missingPeriodTables.join(", ") + ") — ở máy hiện có 0 dòng kỳ " + ky + ".");
    }
    // sl_chuyenky: dòng source === ky (target khác) giữ nguyên; liệt kê khác biệt với gói
    var ref = (payload.refOnly && payload.refOnly.sl_chuyenky) || [], mine = (db.sl_chuyenky || []).filter(function (r) { return srcOut(r, ky); }), idOf = function (r) { return r.id != null ? String(r.id) : canon(r); }, refMap = {}, mineMap = {};
    ref.forEach(function (r) { refMap[idOf(r)] = r; }); mine.forEach(function (r) { mineMap[idOf(r)] = r; });
    var NOTE = "ảnh hưởng kỳ <target>, không khôi phục tự động";
    Object.keys(refMap).forEach(function (k) { var m = mineMap[k]; if (!m) out.slOther.push({ id: k, target: refMap[k].target, status: "chỉ có ở gói", note: NOTE.replace("<target>", refMap[k].target) }); else if (canon(m) !== canon(refMap[k])) out.slOther.push({ id: k, target: m.target, status: "khác gói", note: NOTE.replace("<target>", m.target) }); });
    Object.keys(mineMap).forEach(function (k) { if (!refMap[k]) out.slOther.push({ id: k, target: mineMap[k].target, status: "chỉ có ở máy", note: NOTE.replace("<target>", mineMap[k].target) }); });
    // nhóm B
    var tables = {}; Object.keys(payload.global).forEach(function (t) { tables[t] = 1; }); Object.keys(db).forEach(function (t) { if (Array.isArray(db[t]) && isGlobalTable(t)) tables[t] = 1; });
    var lookup = db; // tham chiếu tính trên dữ liệu HIỆN CÓ ở máy (dữ liệu kỳ khác không bị đổi nên đủ để quyết định)
    Object.keys(tables).sort().forEach(function (t) {
      var cur = db[t] || [], pk = payload.global[t] || [], K = keyer(t, cur, pk), curMap = {}, pkMap = {}, res = { add: [], change: [], remove: [], byContent: K.byContent };
      if (K.dupKeys) { fail("Bảng '" + t + "' có dòng trùng khóa (" + K.cols.join(" + ") + ") ở máy hoặc trong gói — không ghép được dòng cũ với dòng mới; không khôi phục để tránh nhân đôi. Gộp dòng trùng (Kiểm tra dữ liệu) rồi làm lại."); return; }
      cur.forEach(function (r) { curMap[K.fn(r)] = r; }); pk.forEach(function (r) { pkMap[K.fn(r)] = r; });
      pk.forEach(function (r) { var k = K.fn(r), c = curMap[k]; if (!c) res.add.push(r); else if (canon(c) !== canon(r)) { var f = {}; Object.keys(c).concat(Object.keys(r)).forEach(function (x) { if (canon(c[x]) !== canon(r[x])) f[x] = 1; }); res.change.push({ key: K.label(r), before: c, after: r, fields: Object.keys(f) }); } });
      cur.forEach(function (r) { var k = K.fn(r); if (pkMap[k]) return; var why = deleteBlock(db, ky, t, r, lookup); res.remove.push({ row: r, reason: why, key: K.label(r) }); if (!why) out.deletes.rows.push(Object.assign({}, r)); else out.deletes.blocked.push({ table: t, row: r, reason: why }); });
      if (res.add.length || res.change.length || res.remove.length) { out.global[t] = res; out.counts.add += res.add.length; out.counts.change += res.change.length; out.counts.remove += res.remove.length; }
    });
    if (!out.ok) return out;
    // bảng KHÔNG có khóa (so theo nội dung): dòng máy không có trong gói + dòng gói không có ở máy cùng lúc = có thể là dòng bị SỬA → không đoán, chặn
    Object.keys(out.global).forEach(function (t) { var g = out.global[t]; if (g.byContent && g.add.length && g.remove.length) fail("Bảng '" + t + "' không có khóa nhận diện: " + g.add.length + " dòng trong gói và " + g.remove.length + " dòng ở máy không khớp nhau — không biết dòng nào là bản sửa; không khôi phục để tránh nhân đôi."); });
    if (!out.ok) return out;
    if (out.reclose) out.warning = "Gói chứa BẢN CHỐT của kỳ " + ky + " (lúc sao lưu kỳ đã chốt) — khôi phục sẽ CHỐT LẠI kỳ bằng số liệu lúc sao lưu. Chỉ ghi bản chốt khi xác nhận riêng.";
    // kỳ khác CHƯA chốt có dữ liệu → bị ảnh hưởng nếu nhân sự/danh mục đổi
    var changed = out.counts.add + out.counts.change + (out.deletes.allowed ? out.deletes.rows.length : 0) > 0, others = {};
    PERIOD_TABLES.forEach(function (t) { if (t === "kyluong" || t === "kyluong_lichsu" || t === "sl_chuyenky") return; (db[t] || []).forEach(function (r) { var k = kyOfRow(t, r); if (k && k !== ky && !closedKy(db, k)) others[k] = 1; }); });
    out.otherOpenPeriods = Object.keys(others).sort();
    if (changed && out.otherOpenPeriods.length) out.warning = (out.warning ? out.warning + " " : "") + "Nhân sự, danh mục, công thức được ghi đè theo gói: sẽ ảnh hưởng cả các kỳ khác chưa chốt (" + out.otherOpenPeriods.join(", ") + "). Kỳ đã chốt không đổi (kết quả nằm trong bản chốt).";
    return out;
  }
  function applyPeriodRestore(db, plan, payload, opt) {
    var fresh = planPeriodRestore(db, payload, plan && plan.ky, { allowDelete: !!(plan && plan.deletes && plan.deletes.allowed) }); // kiểm tra LẠI ngay trước khi ghi
    if (!plan || !fresh.ok) return { ok: false, error: (fresh.blocked || fresh.errors.join(" ") || "Kế hoạch không hợp lệ"), counts: null };
    var ky = fresh.ky, skipClose = !!fresh.reclose && !(opt && opt.confirmReclose === true), sum = { period: {}, add: 0, change: 0, remove: 0, skippedDeletes: fresh.deletes.blocked.length, recloseSkipped: skipClose, reclosed: !!fresh.reclose && !skipClose };
    PERIOD_TABLES.forEach(function (t) { if (skipClose && (t === "kyluong" || t === "kyluong_lichsu")) return; var pk = (payload.period || {})[t] || [], hasCur = (db[t] || []).some(function (r) { return inKy(t, r, ky); }); if (!pk.length && !hasCur) return; db[t] = (db[t] || []).filter(function (r) { return !inKy(t, r, ky); }).concat(jc(pk)); sum.period[t] = pk.length; });
    Object.keys(fresh.global).forEach(function (t) {
      var g = fresh.global[t], rows = db[t] || [], K = keyer(t, rows, (payload.global || {})[t] || []), chg = {}; g.change.forEach(function (c) { chg[K.fn(c.before)] = c.after; });
      var del = {}; if (fresh.deletes.allowed) g.remove.forEach(function (x) { if (!x.reason) del[K.fn(x.row)] = 1; });
      var next = []; rows.forEach(function (r) { var k = K.fn(r); if (del[k]) { sum.remove++; return; } if (chg[k]) { next.push(jc(chg[k])); sum.change++; } else next.push(r); });
      g.add.forEach(function (r) { next.push(jc(r)); sum.add++; }); db[t] = next;
    });
    return { ok: true, counts: sum, audit: "Khôi phục kỳ " + ky + ": nhân sự/danh mục thêm " + sum.add + ", sửa " + sum.change + ", xóa " + sum.remove + (sum.skippedDeletes ? " (giữ lại " + sum.skippedDeletes + " hàng đang được dùng)" : "") + (sum.reclosed ? "; CHỐT LẠI kỳ bằng bản chốt trong gói (đã xác nhận)" : sum.recloseSkipped ? "; KHÔNG chốt lại kỳ (gói có bản chốt, chưa xác nhận)" : "") };
  }
  var period = { PERIOD_TABLES: PERIOD_TABLES, HR_TABLES: HR_TABLES, isGlobalTable: isGlobalTable, kyOfRow: kyOfRow, inKy: inKy, closedKy: closedKy, slice: periodSlice, plan: planPeriodRestore, apply: applyPeriodRestore, canon: canon };

  var api = { createRepo: createRepo, permFor: permFor, retroText: retroText, identOf: identOf, HD_CHILD_DEFAULT: HD_CHILD_DEFAULT, period: period };
  if (isNode) module.exports = api;
  else { root.HAKCore = root.HAKCore || {}; root.HAKCore.repo = api; }
})(typeof window !== "undefined" ? window : this);
