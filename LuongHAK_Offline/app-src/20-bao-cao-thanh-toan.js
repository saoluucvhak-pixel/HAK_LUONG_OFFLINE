  // ---------- V9.4: BÁO CÁO LƯƠNG — tổng hợp, thanh toán, kê chuyển khoản, tiền mặt + sổ chứng từ thanh toán ----------
  var PLG = C.payledger, PRP = C.payrollReports, OPS = C.opsReports;
  var PAY_SCREENS = { rp_tonghop: "TONG_HOP_NV", rp_pb: "TONG_HOP", rp_tncn: "THUE_TNCN", rp_ctnv: "CHI_TIET_NV", rp_thanhtoan: "THANH_TOAN", rp_cttt: "CHI_TIET_TT", rp_soct: "SO_CHUNG_TU", rp_ck: "CHUYEN_KHOAN", rp_tm: "TIEN_MAT" };
  function payLines() { return db.ttluong || []; }
  function ledgerSet(mut) { var next = payLines().map(function (x) { return Object.assign({}, x); }); mut(next); db.ttluong = next; }
  function nvByMa() { var m = {}; (db.nhanvien || []).forEach(function (r) { if (r["Mã NV"]) m[r["Mã NV"]] = r; }); return m; }
  function payVm(type, src) {
    var bl = src.chot ? [] : GATE.blockers(src.kq);
    var snapshot = src.chot ? kyChot(kyStr()) : null;
    var vm = PRP.build(type, { bangluong: src.kq.bangluong, bhxh: src.kq.bhxh, chot: src.chot, blockers: bl }, { nam: st.nam, thang: st.thang, filter: st.rf, tenCongTy: congTy()["Tên công ty"] || "", lines: payLines(), ngay: new Date().toLocaleDateString("vi-VN"), nguoiLap: session ? session.hoTen : "", nhomPB: type === "TONG_HOP_NV" && !!st.thNhom, nhanVien: type === "THUE_TNCN" ? nvByMa() : null });
    if (snapshot) vm.trangThai += " | v" + (snapshot.version || 1);
    if (type === "CHUYEN_KHOAN" || type === "TIEN_MAT") vm.trangThai += " | Đề nghị chi";
    return vm;
  }
  /** Xuất chính thức chỉ khi không có lỗi nghiêm trọng; bảng thanh toán/kê chỉ xuất từ kỳ ĐÃ CHỐT. */
  function payExportOk(vm, type) {
    if (!need("export", "xuất báo cáo lương")) return false;
    if (!PRP.KHONG_CAN_CHOT[type] && !vm.chot) { alert("⛔ " + vm.title + " chỉ xuất chính thức từ kỳ ĐÃ CHỐT. Kỳ " + vm.ky + " chưa chốt — chốt kỳ rồi xuất."); return false; }
    if (vm.loi.length) { alert("⛔ Không xuất chính thức được — " + vm.loi.length + " lỗi nghiêm trọng:\n\n" + vm.loi.slice(0, 10).map(function (x) { return "• " + x; }).join("\n") + (vm.loi.length > 10 ? "\n…" : "") + "\n\nSửa dữ liệu rồi mở lại báo cáo."); return false; }
    if (!vm.rows.length) { toast("Không có dòng nào để xuất"); return false; }
    return true;
  }
  function payXlsx(vm, type) {
    if (!payExportOk(vm, type)) return;
    if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.reportXlsx) { alert("Thiếu thư viện Excel"); return; }
    var wb = window.HAKUi.reportXlsx.build(window.ExcelJS, vm, { chuKy: type === "TIEN_MAT" || type === "THANH_TOAN" ? ["Người lập", "Kế toán trưởng", "Thủ quỹ", "Giám đốc"] : ["Người lập", "Kế toán trưởng", "Giám đốc"], nguoiLap: vm.nguoiLap });
    wb.xlsx.writeBuffer().then(function (buf) {
      download(vm.file + "_" + vm.kyKey + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
      audit("Xuất Excel " + vm.title, vm.ky + " · " + vm.soDong + " dòng · phạm vi: " + vm.phamVi);
    }, function (e) { alert("Không tạo được file: " + e.message); });
  }
  function payPdf(vm, type) {
    if (!payExportOk(vm, type)) return;
    if (vm.nhom) { exportPdf(Object.assign({}, vm, { groups: vm.nhom }), vm.file + "_" + vm.kyKey + "_theoPhongBan.pdf", { chuKy: ["Người lập", "Kế toán trưởng", "Giám đốc"] }); return; }
    exportSheetsPdf({ title: vm.title, ky: vm.kyText, trangThai: vm.trangThai, loc: vm.loc, sheets: [{ name: vm.title, cols: vm.cols.map(function (c) { return c.label; }), rows: PRP.toRows(vm), groups: vm.groups || null }] }, vm.file + "_" + vm.kyKey + ".pdf",
      { chuKy: type === "TIEN_MAT" || type === "THANH_TOAN" ? ["Người lập", "Kế toán trưởng", "Thủ quỹ", "Giám đốc"] : ["Người lập", "Kế toán trưởng", "Giám đốc"] });
  }
  function payLap(ht, src) {
    if (!need("payment.record", "lập chứng từ thanh toán lương")) return;
    var ky = kyStr(), candidates = RF.apply(src.kq.bangluong, st.rf).rows;
    var pl = PLG.lapChungTu({ ky: ky, ht: ht, rows: candidates, lines: payLines(), nguoi: session ? session.tenDangNhap : "", ngay: HRM.today(), chot: src.chot, blockers: src.chot ? [] : GATE.blockers(src.kq).map(function (b) { return b.code; }) });
    if (!pl.ok) { alert("⛔ " + pl.msg + (pl.boQua && pl.boQua.length ? "\n\nBỏ qua:\n" + pl.boQua.slice(0, 8).map(function (x) { return "• " + x.maNV + ": " + x.ly; }).join("\n") : "")); return; }
    var preview = h("div", { "data-pay-preview": "1" }, [
      h("p", { text: ht + " · " + pl.dong.length + " người · " + fmt(pl.tong) + " đ" }),
      simpleTable(pl.dong.map(function (r) { return { "Mã NV": r["Mã NV"], "Họ và tên": r["Họ và tên"], "Số tiền": r["Số tiền"] }; }))
    ]);
    if (pl.boQua.length) preview.appendChild(h("p", { class: "hint", text: "Bỏ qua " + pl.boQua.length + " người: " + pl.boQua.map(function (r) { return r.maNV + " — " + r.ly; }).join(", ") }));
    modal("Xem trước chứng từ " + pl.so, preview, function (close) {
      return [btn("Hủy", "", close), btn("Lập chứng từ", "pri", function () {
        var lapOk = txn(["ttluong"], function () {
          ledgerSet(function (next) { pl.dong.forEach(function (d) { next.push(d); }); });
          audit("Lập chứng từ thanh toán lương", pl.so + " · " + ht + " · " + pl.dong.length + " người · " + fmt(pl.tong) + " đ");
          return true;
        });
        close(); render(); if (lapOk) toast("Đã lập chứng từ " + pl.so);
      })];
    }, { wide: true });
  }
  function payChuyen(so, to) {
    var mode = C.workflowApproval.mode(db);
    if (!need(to === PLG.TT.DUYET && mode === "roles" ? "payment.approve" : "payment.record", "xử lý chứng từ thanh toán lương")) return;
    var run = function (lyDo) {
      var rs = PLG.chuyen(payLines(), so, to, { nguoi: session ? session.tenDangNhap : "", ngay: HRM.today(), lyDo: lyDo, admin: can("system.admin"), mode: mode });
      if (!rs.ok) { alert("⛔ " + rs.msg); return; }
      txn(["ttluong"], function () {
        ledgerSet(function (next) { next.forEach(function (l, i) { if (l["Số chứng từ"] === so) next[i] = Object.assign({}, l, rs.patch); }); });
        audit("Chứng từ thanh toán lương → " + to, so + (lyDo ? " · lý do: " + lyDo : "")); return true;
      });
      render();
    };
    if (to === PLG.TT.HUY) { askText("Hủy chứng từ " + so, "Chứng từ hủy sẽ trả lại khoản phải thanh toán. Ghi rõ lý do.", { label: "Lý do hủy", required: true }, function (d) { run(d); }); return; }
    if (to === PLG.TT.TRA && !confirm("Xác nhận ĐÃ CHI chứng từ " + so + "? Sau khi ghi nhận, chứng từ bị khóa, không sửa/hủy được.")) return;
    run("");
  }
  /** Master–detail: chứng từ thanh toán (cha) → các dòng nhân viên (con). Cha hiển thị trên đầu, con ở bảng bên trong. */
  function payVoucherModal(so) {
    var L = payLines().filter(function (l) { return l["Số chứng từ"] === so; });
    if (!L.length) return;
    var f = L[0], body = h("div", { "data-voucher-detail": so }), tong = L.reduce(function (a, x) { return a + (+x["Số tiền"] || 0); }, 0);
    var head = h("table", { class: "kv" });
    [["Số chứng từ", so], ["Kỳ", f["Kỳ"]], ["Hình thức", f["Hình thức"]], ["Trạng thái", f["Trạng thái"]], ["Số người", String(L.length)], ["Tổng tiền", fmt(tong) + " đ"], ["Người lập", f["Người lập"] || ""], ["Ngày lập", f["Ngày lập"] || ""], ["Người duyệt", f["Người duyệt"] || ""], ["Ngày duyệt", f["Ngày duyệt"] || ""], ["Người ghi nhận", f["Người ghi nhận"] || ""], ["Ngày thanh toán", f["Ngày thanh toán"] || ""], ["Lý do hủy", f["Lý do hủy"] || ""]].forEach(function (x) { if (x[1]) head.appendChild(h("tr", {}, [h("td", { class: "t", text: x[0] }), h("td", { class: "r", text: x[1] })])); });
    body.appendChild(head); body.appendChild(h("h4", { text: "Các dòng nhân viên (" + L.length + ")" }));
    body.appendChild(simpleTable(L.map(function (x, i) { return { "STT": i + 1, "Mã NV": x["Mã NV"], "Họ và tên": x["Họ và tên"], "Số tiền": fmt(x["Số tiền"]), "Trạng thái": x["Trạng thái"] }; })));
    modal("CHỨNG TỪ " + so, body, function (close) {
      var actions = [btn("Đóng", "", close)];
      if (f["Trạng thái"] === PLG.TT.DUYET && f["Hình thức"] === PLG.HT.CK && can("export")) {
        actions.push(btn("Xuất bảng kê chuyển khoản", "pri", function () {
          if (L.some(function (r) { return !r["Số tài khoản"] || !r["Ngân hàng"]; })) {
            alert("Chứng từ này thiếu thông tin tài khoản đã lưu lúc lập. Kiểm tra chứng từ trước khi chuyển khoản.");
            return;
          }
          var cols = ["Số chứng từ", "Kỳ", "Mã NV", "Họ và tên", "Số tài khoản", "Ngân hàng", "Số tiền"];
          saveXlsx("ChuyenKhoan_" + so + ".xlsx", [{ name: "ChuyenKhoan", cols: cols, rows: L }], "pro");
        }));
      }
      return actions;
    }, { wide: true });
  }
  function payLedgerPanel(type, ky) {
    var ht = type === "CHUYEN_KHOAN" ? PLG.HT.CK : type === "TIEN_MAT" ? PLG.HT.TM : "";
    var ls = payLines().filter(function (l) { return l["Kỳ"] === ky && (!ht || l["Hình thức"] === ht); }), by = {}, ord = [];
    ls.forEach(function (l) { if (!by[l["Số chứng từ"]]) { by[l["Số chứng từ"]] = []; ord.push(l["Số chứng từ"]); } by[l["Số chứng từ"]].push(l); });
    var card = h("div", { class: "card", "data-pay-ledger": "1" });
    card.appendChild(h("h3", { text: "SỔ CHỨNG TỪ THANH TOÁN LƯƠNG KỲ " + st.thang + "/" + st.nam }));
    if (!ord.length) { card.appendChild(h("div", { class: "hint", text: "Chưa có chứng từ nào cho kỳ này. Trạng thái thanh toán chỉ thay đổi khi lập / duyệt / ghi nhận chi chứng từ — không thay đổi khi xuất file." })); return card; }
    var t = h("table"), hr = h("tr");
    card.appendChild(h("p", { class: "hint", text: "Mở Chi tiết để xem từng người nhận. Bảng chi tiết và xuất báo cáo nằm bên dưới." }));
    ["Số chứng từ", "Hình thức", "Số người", "Tổng tiền", "Trạng thái", "Người lập", "Người duyệt", "Ngày thanh toán", ""].forEach(function (x) { hr.appendChild(h("th", { text: x })); });
    t.appendChild(h("thead", {}, [hr])); var tb = h("tbody");
    ord.forEach(function (so) {
      var L = by[so], f = L[0], tr = h("tr", { "data-so": so }), canR = can("payment.record");
      [so, f["Hình thức"], String(L.length), fmt(L.reduce(function (a, x) { return a + (+x["Số tiền"] || 0); }, 0)) + " đ", f["Trạng thái"], f["Người lập"] || "", f["Người duyệt"] || "", f["Ngày thanh toán"] || ""].forEach(function (x, i) { tr.appendChild(h("td", { class: i === 3 ? "r" : "t", text: x })); });
      var act = h("td", { class: "t" });
      act.appendChild(btn("Chi tiết", "ghost", function () { payVoucherModal(so); }));
      if ((C.workflowApproval.mode(db) === "roles" ? can("payment.approve") : canR) && f["Trạng thái"] === PLG.TT.LAP) act.appendChild(btn("Duyệt", "pri", function () { payChuyen(so, PLG.TT.DUYET); }));
      if (canR && f["Trạng thái"] === PLG.TT.DUYET) act.appendChild(btn("Ghi nhận đã chi", "pri", function () { payChuyen(so, PLG.TT.TRA); }));
      if (canR && (f["Trạng thái"] === PLG.TT.LAP || f["Trạng thái"] === PLG.TT.DUYET)) act.appendChild(btn("Hủy", "red ghost", function () { payChuyen(so, PLG.TT.HUY); }));
      tr.appendChild(act); tb.appendChild(tr);
    });
    t.appendChild(tb); card.appendChild(h("div", { class: "tw" }, [t])); return card;
  }
  /** Cửa sổ "CHI TIẾT THANH TOÁN LƯƠNG — [HỌ TÊN]": thu nhập, khấu trừ, thanh toán và các chứng từ của nhân viên trong kỳ. */
  function payDetailModal(r, src) {
    var ky = kyStr(), body = h("div", { "data-pay-detail": r["Mã NV"] });
    function sec(title, keys) {
      var t = h("table", { class: "kv" });
      keys.forEach(function (k) { var v = r[k]; if (v === "" || v == null) return; t.appendChild(h("tr", {}, [h("td", { class: "t", text: k }), h("td", { class: "r", text: typeof v === "number" ? fmt(v) : String(v) })])); });
      body.appendChild(h("h4", { text: title })); body.appendChild(t);
    }
    sec("Nhân viên", ["Mã NV", "Họ và tên", "Công ty", "Phòng ban", "Hình thức lương", "Kỳ lương"]);
    sec("Thu nhập", ["Lương thời gian", "Lương phụ", "Lương sản lượng", "Lương bù SL", "Lương bơm dăm", "Tiền tăng ca", "Phụ cấp", "Phụ cấp công tác", "Lương hỗ trợ", "Tiền cơm", "Thưởng", "Thu nhập khác", "Tổng thu nhập"]);
    sec("Khấu trừ", ["BHXH NLĐ", "BHYT NLĐ", "BHTN NLĐ", "BH trừ NLĐ", "KPCĐ trừ NLĐ", "Truy thu BH", "Thuế TNCN", "Tạm ứng", "Trừ khác", "Tổng khấu trừ"]);
    sec("Thanh toán", ["Thực lĩnh", "Đã thanh toán", "Đang chờ chi", "Còn phải thanh toán", "Có thể lập đề nghị chi", "Hình thức thanh toán", "Ngân hàng", "Số tài khoản", "Trạng thái", "Ghi chú"]);
    var ls = payLines().filter(function (l) { return l["Kỳ"] === ky && l["Mã NV"] === r["Mã NV"]; });
    body.appendChild(h("h4", { text: "Chứng từ liên quan (" + ls.length + ")" }));
    if (!ls.length) body.appendChild(h("div", { class: "hint", text: "Chưa có chứng từ thanh toán nào cho nhân viên này trong kỳ." }));
    else { var t = h("table"), hh = h("tr"); ["Số chứng từ", "Hình thức", "Số tiền", "Trạng thái", "Ngày lập", "Ngày thanh toán", "Lý do hủy"].forEach(function (x) { hh.appendChild(h("th", { text: x })); }); t.appendChild(h("thead", {}, [hh]));
      var tb = h("tbody"); ls.forEach(function (l) { tb.appendChild(h("tr", {}, ["Số chứng từ", "Hình thức", "Số tiền", "Trạng thái", "Ngày lập", "Ngày thanh toán", "Lý do hủy"].map(function (k, i) { return h("td", { class: i === 2 ? "r" : "t", text: i === 2 ? fmt(l[k]) : (l[k] || "") }); }))); }); t.appendChild(tb); body.appendChild(h("div", { class: "tw" }, [t])); }
    modal("CHI TIẾT THANH TOÁN LƯƠNG — " + String(r["Họ và tên"]).toLocaleUpperCase("vi-VN"), body, function (close) { return [btn("Đóng", "pri", close)]; }, { wide: true });
  }
  // @screen tabPayReport

