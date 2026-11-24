// ===== UI / ATTENDANCE-REVIEW-EXPORT — Excel "danh sách cần xác nhận chấm công" (v2.1.6) =====
// Hàm THUẦN (không đụng DOM, không đổi core/production-alloc.js): từ allocation.attendanceReview dựng danh sách PHẲNG
// mỗi dòng = 1 người × 1 phiếu cân để chủ / trưởng bộ phận rà soát và ký xác nhận.
// Điều kiện vào danh sách (do core quyết, KHÔNG đổi ở đây): ngày có phiếu cân của tổ, ô chấm công = 0 hoặc trống, và tên/mã không có trong cột "NV vắng" của phiếu.
(function (root) {
  "use strict";
  var DETAIL_COLS = ["STT", "Kỳ", "Loại", "Ngày cân", "Số phiếu", "Biển số xe", "Mã tổ", "Tên tổ", "KL (tấn) / Số xe", "Mã NV", "Họ và tên", "Phòng ban",
    "Tình trạng chấm công ngày đó", "Có trong NV vắng của phiếu?", "Số người được chia", "Phần mỗi người", "Trạng thái xác nhận", "Người xác nhận", "Lý do", "Chủ/Trưởng bộ phận xác nhận (ký)"];
  // v2.1.16 (mục 6, chủ chọn A4): sheet "CanXacNhan" chỉ 14 cột để vừa A4 ngang (report-xlsx dùng A3 khi > 14 cột). Dữ liệu từng dòng (build) vẫn đủ trường; cột bị bớt đã nằm ở tiêu đề / phạm vi / sheet 2:
  //  Kỳ, Loại → tiêu đề + dòng kỳ; Phòng ban = Tên tổ (trùng); "Có trong NV vắng?" luôn "Không" (là điều kiện vào danh sách, ghi ở phạm vi); Người xác nhận, Lý do → sheet "DaXacNhanCoLam".
  var SHEET_COLS = ["STT", "Ngày cân", "Số phiếu", "Biển số xe", "Mã tổ", "Tên tổ", "KL (tấn) / Số xe", "Mã NV", "Họ và tên", "Tình trạng chấm công ngày đó", "Số người được chia", "Phần mỗi người", "Trạng thái xác nhận", "Chủ/Trưởng bộ phận xác nhận (ký)"];
  var KHONG_DI_LAM = { PN: 1, CL: 1, CC: 1 };
  function loaiLabel(loai) { return loai === "bandam" ? "Ban dăm xuất hàng" : "Sản lượng"; }
  function reviewKey(phieu, ngay, maPB) { return [String(phieu == null ? "" : phieu).trim(), ngay, String(maPB == null ? "" : maPB).trim()].join("|"); }
  function round3(v) { return Math.round((+v || 0) * 1000) / 1000; }
  function confirmKey(date, team, employee) { return JSON.stringify([date, team, employee]); }

  /** Chỉ mục chấm công theo Mã NV của kỳ (1 lần) để tra từng người không phải quét cả bảng. */
  function indexChamcong(chamcong, ky) {
    if (!Array.isArray(chamcong)) return null;
    var idx = {};
    chamcong.forEach(function (r) {
      if (!r || String(r["Kỳ"] || "").slice(0, 7) !== ky) return;
      if (KHONG_DI_LAM[String(r["Hình thức công"] || "BT").trim().toUpperCase()]) return;
      (idx[String(r["Mã NV"])] = idx[String(r["Mã NV"])] || []).push(r);
    });
    return idx;
  }
  /** "0" nếu ô ngày của hình thức công đi làm ghi 0; "Trống" nếu không có ô / để trống; null nếu không có dữ liệu chấm công để kiểm. */
  function dayStatus(chamcong, ky, ma, ngay) {
    var idx = Array.isArray(chamcong) ? indexChamcong(chamcong, ky) : chamcong;
    if (!idx) return null;
    var day = ("0" + String(ngay).slice(8, 10)).slice(-2), zero = false;
    (idx[String(ma)] || []).forEach(function (r) { var v = r[day]; if (v !== "" && v != null && Number(v) === 0) zero = true; });
    return zero ? "0" : "Trống";
  }

  /**
   * @param input { allocation, loai, ky "yyyy-mm", visibleKeys: Set<"phiếu|ngày|tổ"> | null (null = tất cả), confirmed: productionAttendance[], chamcong: rows | null,
   *                plates: { "phiếu|ngày|tổ": biển số }, deptName: (mã tổ) => tên }
   * @returns { detail: rows, confirmed: rows, teams: rows, counts: { people, receipts } }
   */
  function build(input) {
    var al = input.allocation || {}, review = al.attendanceReview || [], loai = input.loai === "bandam" ? "bandam" : "sanluong", ky = String(input.ky || ""),
      deptName = input.deptName || function (ma) { return ma; }, plates = input.plates || {}, confirmed = input.confirmed || [], visible = input.visibleKeys || null;
    var done = new Map(confirmed.map(function (row) { return [confirmKey(row.date, row.team, row.employee), row]; }));
    var detail = [], teamAgg = {}, stt = 0, receipts = 0, ccIndex = indexChamcong(input.chamcong, ky);
    review.forEach(function (rc) {
      var key = reviewKey(rc.phieu, rc.ngay, rc.maPB);
      if (visible && !visible.has(key)) return;
      receipts++;
      var recipients = (rc.recipients || []).length, share = recipients ? round3(rc.kl / recipients) : "";
      (rc.employees || []).forEach(function (e) {
        var c = done.get(confirmKey(rc.ngay, rc.maPB, e.ma));
        stt++;
        detail.push({
          "STT": stt, "Kỳ": ky, "Loại": loaiLabel(loai), "Ngày cân": rc.ngay, "Số phiếu": rc.phieu, "Biển số xe": plates[key] || "",
          "Mã tổ": rc.maPB, "Tên tổ": deptName(rc.maPB) || rc.maPB, "KL (tấn) / Số xe": rc.kl, "Mã NV": e.ma, "Họ và tên": e.hoTen,
          "Phòng ban": deptName(rc.maPB) || rc.maPB, "Tình trạng chấm công ngày đó": dayStatus(ccIndex, ky, e.ma, rc.ngay) || "0 hoặc trống",
          "Có trong NV vắng của phiếu?": "Không", "Số người được chia": rc.soNguoi, "Phần mỗi người": share,
          "Trạng thái xác nhận": c ? "Đã xác nhận có làm" : "Chưa xác nhận", "Người xác nhận": c ? c.user || "" : "", "Lý do": c ? c.reason || "" : "",
          "Chủ/Trưởng bộ phận xác nhận (ký)": ""
        });
        var t = teamAgg[rc.maPB] = teamAgg[rc.maPB] || { people: {}, receipts: {}, open: 0 };
        t.people[e.ma] = 1; t.receipts[rc.phieu + "|" + rc.ngay] = 1; if (!c) t.open++;
      });
    });
    var ky2 = ky;
    var conf = confirmed.filter(function (row) { return String(row.date || "").slice(0, 7) === ky2; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.team + a.employee) < (b.team + b.employee) ? -1 : 1; })
      .map(function (row, i) {
        return { "STT": i + 1, "Ngày phân bổ": row.date, "Mã tổ": row.team, "Tên tổ": deptName(row.team) || row.team, "Mã NV": row.employee, "Lý do": row.reason || "", "Người xác nhận": row.user || "" };
      });
    var teams = Object.keys(teamAgg).sort().map(function (ma, i) {
      var t = teamAgg[ma];
      return { "STT": i + 1, "Mã tổ": ma, "Tên tổ": deptName(ma) || ma, "Số người cần xác nhận": Object.keys(t.people).length, "Số phiếu cần xác nhận": Object.keys(t.receipts).length, "Số dòng chưa xác nhận": t.open };
    });
    return { detail: detail, confirmed: conf, teams: teams, counts: { people: detail.length, receipts: receipts } };
  }

  function filename(loai, ky, draft) { return "DoiChieuChamCong_" + (loai === "bandam" ? "BanDam" : "SanLuong") + "_" + ky + (draft ? "_TAM" : "") + ".xlsx"; }

  function col(label, kind, wrap) { return { key: label, label: label, kind: kind || "text", wrap: !!wrap }; }
  /** View-model cho ui/report-xlsx.js buildMany: sheet đầu = danh sách phẳng (tiêu đề, đóng băng, lọc, tổng ở chân), sheet 2 = đã xác nhận, sheet 3 = tổng hợp theo tổ. */
  function toViewModels(data, info) {
    info = info || {};
    var base = { congTy: info.congTy || "", kyText: info.kyText || "", phamVi: (info.phamVi || "Toàn bộ") + " · Điều kiện: ô công = 0/trống và không có trong NV vắng của phiếu", ngayLap: info.ngayLap || "", nguoiLap: info.nguoiLap || "", trangThai: info.trangThai || "", donVi: "Người / phiếu cân" };
    var d = Object.assign({}, base, {
      sheetName: "CanXacNhan", title: "DANH SÁCH CẦN XÁC NHẬN CHẤM CÔNG — " + loaiLabel(info.loai).toLocaleUpperCase("vi-VN"),
      cols: SHEET_COLS.map(function (l) { return col(l, /^(STT|Số người được chia)$/.test(l) ? "qty" : /^(KL|Phần mỗi người)/.test(l) ? "qty3" : "text", /^(Họ và tên)$/.test(l)); }),
      rows: data.detail, tong: {}, rowHeight: 24, tongNhan: "TỔNG: " + data.counts.people + " người-phiếu · " + data.counts.receipts + " phiếu"
    });
    var c = Object.assign({}, base, {
      sheetName: "DaXacNhanCoLam", title: "ĐÃ XÁC NHẬN CÓ LÀM (KỲ " + (info.ky || "") + ")",
      cols: ["STT", "Ngày phân bổ", "Mã tổ", "Tên tổ", "Mã NV", "Lý do", "Người xác nhận"].map(function (l) { return col(l, l === "STT" ? "qty" : "text", l === "Lý do"); }),
      rows: data.confirmed, tong: {}, tongNhan: "TỔNG: " + data.confirmed.length + " xác nhận"
    });
    var t = Object.assign({}, base, {
      sheetName: "TongHopTheoTo", title: "TỔNG HỢP THEO TỔ",
      cols: ["STT", "Mã tổ", "Tên tổ", "Số người cần xác nhận", "Số phiếu cần xác nhận", "Số dòng chưa xác nhận"].map(function (l) { return col(l, /^(STT|Số)/.test(l) ? "qty" : "text"); }),
      rows: data.teams, tong: {}, tongNhan: "TỔNG"
    });
    t.tong = { "Số người cần xác nhận": data.teams.reduce(function (s, r) { return s + r["Số người cần xác nhận"]; }, 0), "Số phiếu cần xác nhận": data.teams.reduce(function (s, r) { return s + r["Số phiếu cần xác nhận"]; }, 0), "Số dòng chưa xác nhận": data.teams.reduce(function (s, r) { return s + r["Số dòng chưa xác nhận"]; }, 0) };
    return [d, c, t];
  }

  var api = { build: build, toViewModels: toViewModels, filename: filename, reviewKey: reviewKey, dayStatus: dayStatus, DETAIL_COLS: DETAIL_COLS, SHEET_COLS: SHEET_COLS };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else { root.HAKUi = root.HAKUi || {}; root.HAKUi.attendanceReviewExport = api; }
})(typeof window !== "undefined" ? window : this);
