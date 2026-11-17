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
      var db = ctx.db(), keys = new Map();
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
          plans.map(function (p) { return p.table + " +" + p.summary.add + "/~" + p.summary.update + (p.summary.merged ? "/gộp " + p.summary.merged : ""); }).join(", "));
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
      if (!["benefitStandards", "benefitAssignments", "benefitIssues", "productionAttendance"].includes(table)) return deny("table", "Bảng nghiệp vụ không hợp lệ.");
      return writeBatch([table], function (current) {
        current[table] = rows;
        ctx.audit(action, detail);
      });
    }

    return { saveWorkflowRows: saveWorkflowRows, plan: plan, apply: apply, importWorkbook: importWorkbook, mergeAttendance: mergeAttendance, createEmployee: createEmployee, removeEmployee: removeEmployee, permFor: permFor, retroText: retroText, identOf: identOf };
  }

  var api = { createRepo: createRepo, permFor: permFor, retroText: retroText, identOf: identOf, HD_CHILD_DEFAULT: HD_CHILD_DEFAULT };
  if (isNode) module.exports = api;
  else { root.HAKCore = root.HAKCore || {}; root.HAKCore.repo = api; }
})(typeof window !== "undefined" ? window : this);
