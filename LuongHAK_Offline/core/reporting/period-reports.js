// Reports shared by on-screen views and exports. Inputs are supplied by the caller.
(function (root) {
  "use strict";
  var node = typeof module !== "undefined" && module.exports;
  var E = node ? require("../../engine.js") : root.LuongEngine;
  var ALLOC = node ? require("../allocation.js") : root.HAKCore.alloc;
  var PLG = node ? require("../payment-ledger.js") : root.HAKCore.payledger;
  var TR = node ? require("./total-row.js") : root.HAKCore.totalRow;

  function n0(value) { return +value || 0; }
  function kyKey(year, month) { return year + "-" + ("0" + month).slice(-2); }
  function kyLabel(ky) { var parts = String(ky).split("-"); return "Tháng " + ("0" + (+parts[1])).slice(-2) + "/" + parts[0]; }

  function addTotal(rows, label) {
    if (!rows.length) return rows;
    var t = {}, keys = Object.keys(rows[0]);
    keys.forEach(function (k, i) {
      if (i === 0) { t[k] = label || "TỔNG"; return; }
      var allNum = rows.every(function (r) { return typeof r[k] === "number" || r[k] === "" || r[k] == null; }) && rows.some(function (r) { return typeof r[k] === "number"; });
      t[k] = allNum && !/STT|Bậc|Số người phụ thuộc/.test(k) ? Math.round(rows.reduce(function (a, r) { return a + n0(r[k]); }, 0) * 1000) / 1000 : "";
    });
    return rows.concat([TR.mark(t)]);
  }

  function tkChiPhi(maPB, tenPB, catalog) {
    var r = catalog.filter(function (x) { return (maPB && x["Mã phòng ban"] === maPB) || (!maPB && tenPB && x["Tên phòng ban"] === tenPB); })[0];
    if (r && r["Tài khoản chi phí"]) return String(r["Tài khoản chi phí"]);
    if (r && /^02|sản xuất/i.test((r["Mã khối"] || "") + " " + (r["Tên khối"] || ""))) return "622";
    return "642";
  }

  function bcCong(attendance, nam, thang, tenNV) {
    var ky = kyKey(nam, thang), m = {};
    attendance.filter(function (r) { return r["Kỳ"] === ky; }).forEach(function (r) {
      var ma = r["Mã NV"]; if (!ma) return;
      var o = m[ma] || (m[ma] = { "Mã NV": ma, "Họ và tên": tenNV(ma), "Công BT": 0, "Phép năm (PN)": 0, "Công lễ (CL)": 0, "Di chuyển/Trung chuyển": 0, "Tổng công tính lương": 0, "Công tăng ca": 0, "Công Chủ nhật": 0, "Ngày cơm (CC)": 0, "Ngày có nhãn": "" });
      var ht = String(r["Hình thức công"] || "BT").trim().toUpperCase(), sum = 0, nh = {};
      for (var d = 1; d <= 31; d++) {
        var t = E.tachCong(r[("0" + d).slice(-2)]); sum += t.soCong; if (t.nhan) nh[t.nhan] = (nh[t.nhan] || 0) + 1;
        if (ht !== "CC" && !/TC/.test(ht) && t.soCong && new Date(nam, thang - 1, d).getDay() === 0 && new Date(nam, thang - 1, d).getMonth() === thang - 1) o["Công Chủ nhật"] += t.soCong;
      }
      if (ht === "CC") o["Ngày cơm (CC)"] += sum;
      else if (/TC/.test(ht)) { o["Công tăng ca"] += sum; o["Tổng công tính lương"] += sum; }
      else {
        o["Tổng công tính lương"] += sum;
        if (ht === "PN") o["Phép năm (PN)"] += sum; else if (ht === "CL") o["Công lễ (CL)"] += sum; else if (ht === "DC" || ht === "TRCH") o["Di chuyển/Trung chuyển"] += sum; else o["Công BT"] += sum;
      }
      var lb = Object.keys(nh).map(function (k) { return k + "×" + nh[k]; }); if (lb.length) o["Ngày có nhãn"] = (o["Ngày có nhãn"] ? o["Ngày có nhãn"] + ", " : "") + lb.join(", ");
    });
    return addTotal(Object.keys(m).sort().map(function (k) { return m[k]; }));
  }

  function bcSanLuong(al, loai) {
    var dv = loai === "bandam" ? "Số xe" : "Sản lượng (tấn)", r3_ = function (x) { return Math.round(x * 1000) / 1000; };
    var pb = Object.keys(al.byDept).sort().map(function (d) { var x = al.byDept[d], o = { "Mã phòng ban": d, "Tên phòng ban": x.tenPB, "Số nhân sự": al.empCount[d] || 0 }; o[dv] = r3_(x.total); o["Chưa phân bổ"] = r3_(x.unallocated); return o; });
    var nv = Object.values(al.byEmpDept).sort(function (a, b) { return a.maPB < b.maPB ? -1 : a.maPB > b.maPB ? 1 : b.total - a.total; })
      .map(function (e) { var o = { "Mã phòng ban": e.maPB, "Mã NV": e.ma, "Họ và tên": e.hoTen, "Số ngày có SL": Object.keys(e.byDay).length }; o[dv] = r3_(e.total); return o; });
    var audit = al.audit.map(function (a) { return { "Phiếu": a.phieu, "Ngày": a.ngay, "Mã phòng ban": a.maPB, "KL / số xe": r3_(a.kl), "Số người nhận": a.soNguoi, "Mỗi người": a.share ? r3_(a.share) : "", "Người nhận": a.names.join(", "), "Ghi chú": a.note }; });
    var chuaGan = al.chuaGan.map(function (r) { return { "Phiếu cân": r["Phiếu cân"] || "", "Ngày cân": r["Ngày cân"] || "", "Biển số": r["Biển số"] || "", "KL": E.num(r["KL hàng (Tấn)"]) }; });
    function employeeLabels(people) {
      return people.map(function (e) { return e.ma + " — " + e.hoTen; }).join(", ");
    }
    var attendanceReview = al.attendanceReview.map(function (r) {
      return { "Phiếu cân": r.phieu, "Ngày cân": r.ngay, "Mã phòng ban": r.maPB, "KL / số xe": r.kl,
        "App chia (người)": r.soNguoi, "Người được chia": employeeLabels(r.recipients) || "Không có",
        "Người không được chia": employeeLabels(r.excluded) || "Không có", "NV vắng trên phiếu": r.vang,
        "Người cần kiểm tra công": employeeLabels(r.employees) };
    });
    return { pb: addTotal(pb), nv: addTotal(nv), audit: audit, attendanceReview: attendanceReview, chuaGan: chuaGan, warnings: al.warnings, al: al };
  }

  function bcHachToan(r, nam, thang, snapshot, departments, paymentLines) {
    var ky = ("0" + thang).slice(-2) + "/" + nam, rows = [], cp = {}, cpBH = {}, sum = function (f) { return r.bangluong.reduce(function (a, x) { return a + n0(x[f]); }, 0); };
    // Q-19 (R-53): chi phí người điều chuyển chia theo công ở từng phòng → đúng TK chi phí của từng phòng
    var period = kyKey(nam, thang);
    var catalog = snapshot && snapshot.input && snapshot.input.danhmuc && snapshot.input.danhmuc.dm_phongban;
    var fallback = !!snapshot && !Array.isArray(catalog);
    if (!Array.isArray(catalog)) catalog = departments || [];
    var cost = ALLOC.costByKey(r, function (maPB, tenPB) { return tkChiPhi(maPB, tenPB, catalog); });
    cp = cost.luong; cpBH = cost.bh;
    var add = function (no, co, dg, tien) { if (Math.round(tien)) rows.push({ "Kỳ": ky, "TK Nợ": no, "TK Có": co, "Diễn giải": dg, "Số tiền": Math.round(tien) }); };
    Object.keys(cp).sort().forEach(function (tk) { add(tk, "334", "Tính lương phải trả kỳ " + ky, cp[tk]); });
    Object.keys(cpBH).sort().forEach(function (tk) { add(tk, "338", "Trích BHXH/BHYT/BHTN/KPCĐ (DN đóng) kỳ " + ky, cpBH[tk]); });
    add("334", "338", "Khấu trừ BH vào lương (NLĐ đóng) kỳ " + ky, sum("BH trừ NLĐ"));
    add("334", "3382", "Khấu trừ KPCĐ vào lương (NLĐ đóng) kỳ " + ky, sum("KPCĐ trừ NLĐ"));
    add("334", "338", "Truy thu BH (chưa đủ ngưỡng công) kỳ " + ky, sum("Truy thu BH"));
    add("334", "3335", "Khấu trừ thuế TNCN kỳ " + ky, sum("Thuế TNCN"));
    add("334", "141", "Trừ tạm ứng lương kỳ " + ky, sum("Tạm ứng"));
    add("334", "1388", "Các khoản trừ khác kỳ " + ky, sum("Trừ khác"));
    var phatSinh334 = rows.filter(function (x) { return x["TK Nợ"] === "334"; }).reduce(function (a, x) { return a + x["Số tiền"]; }, 0);
    var paid = paymentLines.filter(function (line) { return line["Kỳ"] === period && line["Trạng thái"] === PLG.TT.TRA; });
    var byVoucher = new Map(), daChi = 0;
    paid.forEach(function (line) {
      var account = line["Hình thức"] === PLG.HT.CK ? "1121" : "1111";
      var no = line["Số chứng từ"], key = JSON.stringify([no, account]), v = byVoucher.get(key) || { no: no, account: account, amount: 0 };
      v.amount += n0(line["Số tiền"]); daChi += n0(line["Số tiền"]); byVoucher.set(key, v);
    });
    byVoucher.forEach(function (v) { add("334", v.account, "Đã chi theo chứng từ " + v.no, v.amount); });
    return { rows: rows, lech: sum("Tổng thu nhập") - phatSinh334 - sum("Thực lĩnh"),
      phaiTra: sum("Thực lĩnh"), daChi: daChi, conLai: sum("Thực lĩnh") - daChi, fallback: fallback };
  }

  function bcSoSanh(nam, thang, kqKy) {
    var pn = thang === 1 ? nam - 1 : nam, pt = thang === 1 ? 12 : thang - 1;
    var A = kqKy(pn, pt), B = kqKy(nam, thang), a = {}, b = {}, rows = [];
    A.kq.bangluong.forEach(function (x) { a[x["Mã NV"]] = x; }); B.kq.bangluong.forEach(function (x) { b[x["Mã NV"]] = x; });
    Object.keys(b).concat(Object.keys(a).filter(function (k) { return !b[k]; })).forEach(function (k) {
      var x = a[k], y = b[k], ta = x ? n0(x["Thực lĩnh"]) : 0, tb = y ? n0(y["Thực lĩnh"]) : 0;
      rows.push({ "Mã NV": k, "Họ và tên": (y || x)["Họ và tên"], "Công kỳ trước": x ? n0(x["Tổng công"]) : 0, "Công kỳ này": y ? n0(y["Tổng công"]) : 0,
        "Thực lĩnh kỳ trước": ta, "Thực lĩnh kỳ này": tb, "Chênh lệch": tb - ta, "Tỷ lệ": ta ? Math.round((tb - ta) / ta * 1000) / 10 + "%" : "", "Ghi chú": !x ? "Mới" : (!y ? "Không còn trong kỳ này" : "") });
    });
    rows.sort(function (p, q) { return Math.abs(q["Chênh lệch"]) - Math.abs(p["Chênh lệch"]); });
    return { rows: addTotal(rows), prev: kyLabel(kyKey(pn, pt)) + (A.chot ? " (đã chốt)" : " (tạm tính)"), cur: kyLabel(kyKey(nam, thang)) + (B.chot ? " (đã chốt)" : " (tạm tính)") };
  }

  function bc12Thang(nam, kyChot) {
    var rows = [], people = new Set();
    for (var t = 1; t <= 12; t++) {
      var c = kyChot(kyKey(nam, t)), o = { "Tháng": t + "/" + nam, "Trạng thái": c ? "Đã chốt" : "Chưa chốt" };
      var bl = c ? c.kq.bangluong : [], bh = c ? c.kq.bhxh : [], s = function (f) { return bl.reduce(function (a, x) { return a + n0(x[f]); }, 0); };
      bl.forEach(function (row) { if (row["Mã NV"]) people.add(String(row["Mã NV"])); });
      o["Số NV"] = bl.length; o["Tổng thu nhập"] = s("Tổng thu nhập");
      o["BH NLĐ đóng"] = s("BH trừ NLĐ"); o["Truy thu BH"] = s("Truy thu BH");
      o["KPCĐ NLĐ đóng"] = s("KPCĐ trừ NLĐ");
      o["BH công ty đóng"] = bh.reduce(function (a, x) { return a + n0(x["Cộng BH công ty đóng"]); }, 0); o["Thuế TNCN"] = s("Thuế TNCN");
      o["Tạm ứng"] = s("Tạm ứng"); o["Thực lĩnh"] = s("Thực lĩnh"); o["Tổng chi phí lương (TN + BH công ty)"] = o["Tổng thu nhập"] + o["BH công ty đóng"];
      rows.push(o);
    }
    var withTotal = addTotal(rows, "CẢ NĂM (NV duy nhất)");
    withTotal[withTotal.length - 1]["Số NV"] = people.size;
    return withTotal;
  }

  function bcNVNam(ks, field) {
    var m = {};
    ks.forEach(function (k) {
      var t = +k.ky.slice(5);
      k.kq.bangluong.forEach(function (x) {
        var o = m[x["Mã NV"]] || (m[x["Mã NV"]] = (function () { var r = { "Mã NV": x["Mã NV"], "Họ và tên": x["Họ và tên"] }; for (var i = 1; i <= 12; i++) r["T" + i] = ""; r["Cả năm"] = 0; return r; })());
        o["T" + t] = n0(x[field]); o["Cả năm"] += n0(x[field]);
      });
    });
    return addTotal(Object.keys(m).sort().map(function (k) { return m[k]; }));
  }

  function bcThueNam(snapshots) {
    var m = {};
    snapshots.forEach(function (k) {
      k.kq.bangluong.forEach(function (x) {
        var o = m[x["Mã NV"]] || (m[x["Mã NV"]] = { "Mã NV": x["Mã NV"], "Họ và tên": x["Họ và tên"], "Số tháng có lương": 0, "Tổng thu nhập": 0, "Tiền cơm (không chịu thuế)": 0, "BH bắt buộc NLĐ đóng": 0, "KPCĐ NLĐ đóng": 0, "Người phụ thuộc (tối đa)": 0, "Thuế TNCN đã khấu trừ": 0 });
        o["Số tháng có lương"]++; o["Tổng thu nhập"] += n0(x["Tổng thu nhập"]); o["Tiền cơm (không chịu thuế)"] += n0(x["Tiền cơm"]);
        o["BH bắt buộc NLĐ đóng"] += n0(x["BH trừ NLĐ"]); o["KPCĐ NLĐ đóng"] += n0(x["KPCĐ trừ NLĐ"]); o["Thuế TNCN đã khấu trừ"] += n0(x["Thuế TNCN"]);
        o["Người phụ thuộc (tối đa)"] = Math.max(o["Người phụ thuộc (tối đa)"], n0(x["Người phụ thuộc"]));
      });
    });
    return addTotal(Object.keys(m).sort().map(function (k) { return m[k]; }));
  }

  var api = { kyLabel: kyLabel, addTotal: addTotal, bcCong: bcCong, bcSanLuong: bcSanLuong, bcHachToan: bcHachToan,
    bcSoSanh: bcSoSanh, bc12Thang: bc12Thang, bcNVNam: bcNVNam, bcThueNam: bcThueNam };
  if (node) module.exports = api;
  else root.HAKCore.periodReports = api;
})(typeof window !== "undefined" ? window : this);
