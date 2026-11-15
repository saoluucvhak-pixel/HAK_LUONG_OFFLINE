(function (root) {
  "use strict";
  function kyBounds(year, month) {
    var ky = year + "-" + String(month).padStart(2, "0");
    return { dau: ky + "-01", cuoi: ky + "-" + new Date(Date.UTC(year, month, 0)).getUTCDate() };
  }
  function addDay(date) {
    return new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);
  }
  var V = typeof module !== "undefined" && module.exports ? require("./validate.js") : root.HAKCore.validate;
  var E = typeof module !== "undefined" && module.exports ? require("../engine.js") : root.LuongEngine;
  function reconcileLeave(db, ky) {
    var HR = typeof module !== "undefined" && module.exports ? require("../hr.js") : root.HRM;
    var year = ky.slice(0, 4), bounds = kyBounds(+year, +ky.slice(5));
    var days = new Map(), limits = new Map(), archived = new Map(), undated = [];
    function day(ma, date) {
      var key = ma + "|" + date;
      if (!days.has(key)) days.set(key, { ma: ma, date: date, pn: 0, pnCount: 0, work: 0, holiday: 0, forms: Object.create(null), extra: 0, annual: [], other: [], pending: [], cancelled: [] });
      return days.get(key);
    }
    (db.kyluong || []).forEach(function (snap) {
      var period = snap && V.normKy(snap.ky || snap["Kỳ"]);
      var data = snap && snap.input && snap.input.data;
      if (period && period.slice(0, 4) === year && period <= ky && data && Array.isArray(data.chamcong)) archived.set(period, data.chamcong);
    });
    var attendance = (db.chamcong || []).filter(function (row) { return !archived.has(V.normKy(row["Kỳ"])); });
    archived.forEach(function (rows) { attendance = attendance.concat(rows); });
    attendance.forEach(function (row) {
      var month = V.normKy(row["Kỳ"]), ma = row["Mã NV"], kind = String(row["Hình thức công"] || "BT").trim().toUpperCase();
      if (!ma || !month || month.slice(0, 4) !== year || month > ky) return;
      var end = +kyBounds(+year, +month.slice(5)).cuoi.slice(8);
      for (var d = 1; d <= end; d++) {
        var field = ("0" + d).slice(-2), amount = E.tachCong(row[field]).soCong;
        if (amount > 0) {
          var item = day(ma, month + "-" + field);
          var fieldKind = kind === "PN" ? "pn" : kind === "CL" ? "holiday" : kind === "CC" || /^TC/.test(kind) ? "extra" : "work";
          item[fieldKind] += amount;
          item.forms[kind] = (Object.prototype.hasOwnProperty.call(item.forms, kind) ? item.forms[kind] : 0) + amount;
          if (kind === "PN") item.pnCount++;
        }
      }
    });
    ["nghiphep", "nghiom"].forEach(function (table) {
      (db[table] || []).forEach(function (row) {
        var start = V.normDate(row["Từ ngày"]), end = V.normDate(row["Đến ngày"]), ma = row["Mã NV"];
        if (!start || !ma || start > bounds.cuoi || (end && (end < start || end < year + "-01-01"))) return;
        var status = row["Trạng thái duyệt"], raw = String(row["Số ngày nghỉ"] ?? "").trim();
        var total = Number(raw.replace(",", "."));
        var span = end ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1 : 0;
        var amount = raw && total > 0 && total <= 1 && span === 1 ? total : raw && span > 1 && total === span ? 1 : null;
        if (table === "nghiom" && !raw && span === 1) amount = 1;
        var first = start < year + "-01-01" ? year + "-01-01" : start;
        var last = end && end < bounds.cuoi ? end : bounds.cuoi;
        var annual = table === "nghiphep" && (!row["Loại nghỉ"] || row["Loại nghỉ"] === "Nghỉ hằng năm");
        var type = table === "nghiom" ? "Nghỉ ốm" : row["Loại nghỉ"] || "Nghỉ hằng năm";
        if (annual && status === "Đã duyệt" && amount === null) undated.push({ row: row, start: start, end: end, total: total, span: span });
        for (var date = first; date <= last; date = addDay(date)) {
          var item = day(ma, date), order = { table: table, row: row, type: type, amount: amount };
          (status === "Đã duyệt" ? (annual ? item.annual : item.other) : status === "Chờ duyệt" ? item.pending : item.cancelled).push(order);
        }
      });
    });
    (db.quyenloiphep || []).forEach(function (row) {
      var ma = row["Mã NV"], contract = String(row["Số HĐLĐ"] || "");
      if (String(row["Năm áp dụng"]) !== year || !ma || String(row["Số ngày được cấp"] ?? "").trim() === "") return;
      var n = Number(String(row["Số ngày được cấp"]).replace(",", "."));
      var carry = Number(String(row["Số ngày cộng dồn năm trước"] || "0").replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || !Number.isFinite(carry) || carry < 0) return;
      if (!limits.has(ma)) limits.set(ma, new Map());
      var grants = limits.get(ma);
      grants.set(contract, (grants.get(contract) || 0) + n + carry);
    });
    var entries = [], used = new Map(), activeUsage = new Set();
    function markActive(ma, contract) { activeUsage.add(JSON.stringify([ma, contract])); }
    days.forEach(function (item) {
      var orders = item.annual.concat(item.other);
      var paidOther = item.other.length === 1 && item.other[0].type === "Nghỉ việc riêng có hưởng lương";
      var paidOrder = item.annual.length === 1 ? item.annual[0] : paidOther ? item.other[0] : null;
      var expected = paidOrder ? paidOrder.amount : null;
      var consumption = paidOther && !item.annual.length ? 0 : Math.max(item.pn, item.annual.length ? expected || 0 : 0);
      var grants = limits.get(item.ma);
      if (grants) {
        var contract = item.annual.length === 1 && item.annual[0].row["Số HĐLĐ"];
        if (!contract) {
          var active = HR.activeHD(db, item.ma, item.date, item.date);
          contract = active ? active["Số HĐLĐ"] : grants.size === 1 ? grants.keys().next().value : "";
        }
        if (!grants.has(contract) && grants.has("")) contract = "";
        if (grants.has(contract)) {
          item.contract = contract;
          item.consumption = consumption;
          if (consumption > 0 && item.date.slice(0, 7) === ky) markActive(item.ma, contract);
          if (!used.has(item.ma)) used.set(item.ma, new Map());
          var totals = used.get(item.ma);
          totals.set(contract, (totals.get(contract) || 0) + consumption);
        }
      }
      if (item.date.slice(0, 7) !== ky || (!orders.length && !item.pn && !item.pending.length)) return;
      item.orders = orders.length ? orders : item.pending.concat(item.cancelled);
      item.expected = expected;
      var occupied = item.pn + item.work + item.holiday;
      var restDay = item.holiday || new Date(item.date + "T00:00:00").getDay() === 0;
      if (item.pnCount > 1) { item.status = "Nhiều dòng PN cùng ngày"; item.block = true; }
      else if (orders.length > 1) { item.status = "Nhiều đơn đã duyệt cùng ngày"; item.block = orders.some(function (o) { return paidLeave(o.type) ? item.work || item.holiday || item.extra : occupied || item.extra; }); }
      else if (item.pn > 0 && occupied > 1.000001) { item.status = "Công làm, lễ và phép vượt 1 công/ngày"; item.block = true; }
      else if (item.other.length && !paidOther) {
        var other = item.other[0];
        item.block = occupied > 0 || item.extra > 0;
        item.status = item.block ? "Có công xung đột với " + other.type : "Không phát sinh công";
      } else if (paidOrder) {
        if (item.work || item.holiday || item.extra) { item.status = "Ngày nghỉ có lương chỉ được ghi PN"; item.block = true; }
        else if (expected === null) item.status = "Đơn chưa xác định số công theo ngày";
        else if (item.pn && Math.abs(item.pn - expected) > 0.000001) { item.status = "Lệch số công nghỉ có lương"; item.block = true; }
        else if (occupied - item.pn + expected > 1.000001 || (expected === 1 && item.extra > 0)) { item.status = "Công xung đột với nghỉ có lương"; item.block = true; }
        else if (item.pn) item.status = "Khớp";
        else if (restDay) item.status = "Ngày lễ hoặc Chủ nhật — kiểm tra lịch làm";
        else if (paidOther) item.status = "Thiếu công nghỉ có lương — kiểm tra trước khi chấm";
        else { item.status = "Thiếu công phép"; item.apply = true; }
      } else if (item.pn) item.status = item.pending.length ? "Đơn đang chờ duyệt" : item.cancelled.length ? "Đơn không còn hiệu lực" : "Thiếu đơn nghỉ đã duyệt";
      else item.status = "Đơn đang chờ duyệt";
      entries.push(item);
    });
    var ambiguous = [];
    undated.forEach(function (order) {
      var ma = order.row["Mã NV"], grants = limits.get(ma);
      if (!grants) return;
      var contract = order.row["Số HĐLĐ"] || (grants.size === 1 ? grants.keys().next().value : "");
      if (!grants.has(contract) && grants.has("")) contract = "";
      if (!grants.has(contract)) return;
      if (!order.end || !Number.isFinite(order.total) || order.total <= 0 || order.total > order.span || order.start.slice(0, 4) !== order.end.slice(0, 4)) {
        ambiguous.push({ ma: ma, contract: contract });
        return;
      }
      // A declared total can be reserved for the year without guessing which days are off.
      // For a monthly cutoff inside the interval only already recorded PN is known.
      if (order.end > bounds.cuoi) return;
      var matched = 0;
      for (var date = order.start; date <= order.end; date = addDay(date)) {
        var item = days.get(ma + "|" + date);
        if (item && item.contract === contract && item.annual.length === 1) matched += item.consumption || 0;
      }
      if (!used.has(ma)) used.set(ma, new Map());
      var totals = used.get(ma);
      var remaining = Math.max(0, order.total - matched);
      totals.set(contract, (totals.get(contract) || 0) + remaining);
      if (remaining > 0 && order.end.slice(0, 7) === ky) markActive(ma, contract);
    });
    var balances = [];
    limits.forEach(function (contracts, ma) {
      contracts.forEach(function (limit, contract) {
        var amount = used.get(ma)?.get(contract) || 0;
        balances.push({ ma: ma, contract: contract, used: amount, limit: limit, excess: amount - limit });
      });
    });
    var warnings = balances.filter(function (x) { return x.excess > 0.000001; });
    entries.sort(function (a, b) { return a.ma.localeCompare(b.ma) || a.date.localeCompare(b.date); });
    return { entries: entries, warnings: warnings, balances: balances, ambiguous: ambiguous,
      quotaBlockers: warnings.filter(function (item) { return activeUsage.has(JSON.stringify([item.ma, item.contract])); }),
      blockers: entries.filter(function (item) { return item.block; }) };
  }

  function isAnnual(row) {
    return row["Loại nghiệp vụ"] === "Nghỉ phép năm" ||
      (!row["Loại nghiệp vụ"] && (!row["Loại nghỉ"] || row["Loại nghỉ"] === "Nghỉ hằng năm"));
  }

  function checkRequest(db, row, excluded) {
    if (!isAnnual(row) || row["Trạng thái duyệt"] === "Từ chối") return "";
    var start = V.normDate(row["Từ ngày"]), end = V.normDate(row["Đến ngày"]);
    var days = Number(String(row["Số ngày nghỉ"] ?? row["Số ngày"] ?? "").replace(",", "."));
    if (!start || !end || end < start || days <= 0 || !Number.isFinite(days) || days > (Date.parse(end) - Date.parse(start)) / 86400000 + 1) {
      return "Phép năm cần ngày bắt đầu, ngày kết thúc và số ngày nghỉ hợp lệ.";
    }
    var year = start.slice(0, 4);
    if (year !== end.slice(0, 4)) return "Tách đơn phép năm theo từng năm để kiểm tra đúng hạn mức.";
    var HR = typeof module !== "undefined" && module.exports ? require("../hr.js") : root.HRM;
    var contract = row["Số HĐLĐ"] || HR.activeHD(db, row["Mã NV"], start, start)?.["Số HĐLĐ"] || "";
    if (!row["Số HĐLĐ"] && contract !== (HR.activeHD(db, row["Mã NV"], end, end)?.["Số HĐLĐ"] || "")) return "Tách đơn theo hợp đồng để kiểm tra đúng hạn mức.";
    var old = (db.nghiphep || []).filter(function (r) { return r !== excluded; });
    var overlaps = old.some(function (r) {
      return r["Mã NV"] === row["Mã NV"] && isAnnual(r) && r["Trạng thái duyệt"] === "Đã duyệt" &&
        V.normDate(r["Từ ngày"]) <= end && (V.normDate(r["Đến ngày"]) || "9999-12-31") >= start;
    });
    if (overlaps) return "Khoảng nghỉ trùng đơn phép năm đã duyệt. Mở lại đơn hoặc sửa khoảng ngày.";
    var base = Object.assign({}, db, { nghiphep: old }), current = reconcileLeave(base, year + "-12");
    function balance(result) {
      return result.balances.find(function (x) { return x.ma === row["Mã NV"] && x.contract === contract; }) ||
        result.balances.find(function (x) { return x.ma === row["Mã NV"] && !x.contract; });
    }
    var before = balance(current);
    if (!before) return "Chưa có hạn mức phép năm " + year + " trong Quyền lợi phép của hợp đồng.";
    if (current.ambiguous.some(function (x) { return x.ma === before.ma && x.contract === before.contract; })) return "Cần xác định số ngày của đơn phép năm đã duyệt trước khi lập thêm.";
    var proposed = { "Mã NV": row["Mã NV"], "Số HĐLĐ": contract, "Từ ngày": start, "Đến ngày": end, "Số ngày nghỉ": days, "Trạng thái duyệt": "Đã duyệt" };
    var projected = balance(reconcileLeave(Object.assign({}, base, { nghiphep: old.concat(proposed) }), year + "-12"));
    if (projected.excess > 0.000001) {
      var fmt = function (n) { return n.toLocaleString("vi-VN", { maximumFractionDigits: 4 }); };
      return "Vượt hạn mức phép năm " + year + ": đã dùng hoặc duyệt " + fmt(before.used) + "/" + fmt(before.limit) +
        " ngày, sau đơn này vượt " + fmt(projected.excess) + " ngày. Phần vượt phải lập loại nghỉ phù hợp: nghỉ không lương, nghỉ ốm hoặc nghỉ thai sản.";
    }
    return "";
  }

  function attendanceLeaveRanges(db, ma) {
    return ["nghiphep", "nghiom"].flatMap(function (table) {
      return (db[table] || []).filter(function (r) {
        return r["Mã NV"] === ma && r["Trạng thái duyệt"] === "Đã duyệt";
      }).map(function (r) {
        var start = V.normDate(r["Từ ngày"]), end = V.normDate(r["Đến ngày"]) || "9999-12-31";
        var type = table === "nghiom" ? "Nghỉ ốm" : r["Loại nghỉ"] || "Nghỉ hằng năm";
        return start && end >= start ? { start: start, end: end, type: type, paid: table !== "nghiom" && paidLeave(type) } : null;
      }).filter(Boolean);
    });
  }

  function paidLeave(type) {
    return type === "Nghỉ hằng năm" || type === "Nghỉ việc riêng có hưởng lương";
  }

  function attendanceMutation(db, before, after) {
    if (!after || !after["Mã NV"]) return "";
    var ky = V.normKy(after["Kỳ"]), ma = after["Mã NV"];
    if (!ky) return "";
    var ranges = attendanceLeaveRanges(db, ma);
    if (!ranges.length) return "";
    var kind = function (r) { return String(r["Hình thức công"] || "BT").trim().toUpperCase(); };
    var same = before && before["Mã NV"] === ma && V.normKy(before["Kỳ"]) === ky && kind(before) === kind(after);
    var end = +kyBounds(+ky.slice(0, 4), +ky.slice(5)).cuoi.slice(8);
    for (var d = 1; d <= end; d++) {
      var field = String(d).padStart(2, "0"), date = ky + "-" + field;
      var prev = same ? E.tachCong(before[field]).soCong : 0;
      if (E.tachCong(after[field]).soCong <= Math.max(0, prev)) continue;
      var conflict = ranges.find(function (r) { return date >= r.start && date <= r.end && (!r.paid || kind(after) !== "PN"); });
      if (conflict) return ma + " · " + date + ": đã duyệt " + conflict.type.toLowerCase() +
        ". Không thể nhập công " + kind(after) + "." + (conflict.paid ? " Ngày này chỉ ghi công PN." : "");
    }
    return "";
  }

  var api = { reconcile: reconcileLeave, isAnnual: isAnnual, checkRequest: checkRequest, attendanceMutation: attendanceMutation };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HAKCore.leaveReconciliation = api;
})(typeof window !== "undefined" ? window : this);
