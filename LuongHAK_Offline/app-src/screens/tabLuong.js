  function tabLuong() {
    var box = h("div"), chot = kyChot(kyStr());
    var hub = h("div", { class: "card", "data-payroll-hub": "1", "data-payroll-closed": chot ? "1" : "0" });
    hub.appendChild(h("h3", { text: "Kỳ lương " + st.thang + "/" + st.nam }));
    hub.appendChild(h("p", { class: "hint", text: (chot ? "Đã chốt · v" + (chot.version || 1) + " · " + fmtTime(chot.ngayChot) : "Chưa chốt") +
      " · " + buLabel(chot ? chot.buTheoNgay || false : st.bu) }));
    hub.appendChild(luongSteps(chot));
    var links = h("div", { class: "bar" });
    [["chamcong", "Đầu vào chấm công"], ["sanluong", "Đầu vào sản lượng"], ["ktbl", "Kiểm tra"],
      ["rp_tonghop", "Báo cáo lương"], ["rp_thanhtoan", "Thanh toán"], ["rp_soct", "Sổ chứng từ"]].forEach(function (item) {
      if (tabAllowed(item[0])) links.appendChild(btn(item[1], "ghost", function () {
        if (!leaveOk()) return;
        st.tab = item[0]; saveUi(); render();
      }));
    });
    hub.appendChild(links);
    if (!chot) {
      var work = h("div", { class: "bar", "data-period-work": "1" });
      C.inputReview.pending(db, kyStr()).forEach(function (r) {
        if (!tabAllowed(r.table)) return;
        work.appendChild(btn("Nháp: " + ALL[r.table].ten + " · " + kyLabel(r.period), "ghost", function () {
          if (!leaveOk()) return;
          st.tab = r.table; st.nam = +r.period.slice(0, 4); st.thang = +r.period.slice(5, 7);
          if (r.kind) st.pumpMode = r.kind;
          saveUi(); render();
        }));
      });
      if (st.kt && st.kt.ky === kyStr() && st.kt.rev === dbRev) {
        [["ERROR", "lỗi chặn"], ["WARNING", "cảnh báo"]].forEach(function (m) {
          var count = st.kt.rows.filter(function (row) { return row.muc === m[0]; }).length;
          if (count && tabAllowed("ktbl")) work.appendChild(btn(count + " " + m[1], m[0] === "ERROR" ? "red ghost" : "ghost", function () {
            st.ktSev = m[0]; ktDi(["ktbl"]);
          }));
        });
      }
      if (st.kq && st.kqStale) work.appendChild(h("span", { class: "warn", text: "Dữ liệu đã đổi. Tính lương lại trước khi chốt." }));
      if (work.childNodes.length) hub.appendChild(work);
    }
    if (!chot && C.workflowApproval.mode(db) === "roles") {
      var approval = C.workflowApproval.ticket(db, kyStr()), actions = h("div", { class: "bar" });
      var reviewState = !approval ? "Chưa gửi duyệt" : approval.approver ? "Người lập: " + approval.preparer + " · Người duyệt: " + approval.approver : "Chờ duyệt · Người lập: " + approval.preparer;
      if (approval && approval.approver && !approval.approvedAt) reviewState = "Cần gửi duyệt lại để ghi nhận thời điểm duyệt";
      if (approval && st.kq && st.kq.ky === kyStr() && approval.digest !== approvalDigest(kyStr(), st.kq) && approval.digest !== approvalDigest(kyStr(), st.kq, true)) reviewState = "Cần gửi duyệt lại · Bảng hiện tại khác bản đã gửi";
      actions.appendChild(h("span", { class: "hint", text: reviewState }));
      if (st.kq && can("payroll.calc")) actions.appendChild(btn(approval ? "Gửi duyệt lại" : "Gửi duyệt", "", function () { savePayrollApproval(false); }));
      if (st.kq && approval && !approval.approver && can("payroll.approve") && approval.preparer !== C.workflowApproval.account(session.tenDangNhap)) {
        actions.appendChild(btn("Duyệt bảng lương", "pri", function () { savePayrollApproval(true); }));
      }
      hub.appendChild(actions);
    }
    box.appendChild(hub);
    var card = h("div", { class: "card" }), bar = h("div", { class: "bar" });
    if (chot) {
      st.kq = Object.assign({ ky: chot.ky }, chot.kq);
      hub.appendChild(h("p", { class: "hint", text: "Quy chế: " + qcLabel(chot.quyChe || "") + (chot.ghiChu ? " · " + chot.ghiChu : "") }));
      var approvalInfo = payrollApprovalInfo(chot);
      if (approvalInfo) hub.appendChild(h("p", { class: "hint", text: approvalInfo }));
      hub.appendChild(h("div", { class: "bar" }, [
        btn("⬇ Xuất trọn bộ Excel", "pri", function () { exportAll(chot.kq, chot.ky); }),
        btn("In trọn bộ PDF kỳ lương", "", function () { exportPayrollBundlePdf(chot.kq, chot.ky); }),
        btn("🔍 Đối chiếu với dữ liệu hiện tại", "", function () { doiChieu(chot); }),
        btn("🔓 Mở chốt để sửa", "red ghost", function () { moChot(chot.ky); })
      ]));
      card.appendChild(bar);
      return renderKq(box, card, bar);
    }
    var sel = h("select", { "aria-label": "Cách bù lương sản lượng" }); BU_OPTS.forEach(function (o) { sel.appendChild(h("option", { value: o[0], text: o[1] })); });
    if (!buMethodOf(st.bu)) sel.appendChild(h("option", { value: String(st.bu), text: buLabel(st.bu) }));
    sel.value = String(st.bu); sel.addEventListener("change", function () { selectTopupMethod(sel.value); });
    var calcPermission = !can("payroll.calc") && C.workflowApproval.mode(db) === "roles" ? "payroll.approve" : "payroll.calc";
    if (can(calcPermission)) bar.appendChild(btn((calcPermission === "payroll.approve" ? "Xem bảng để duyệt · " : "▶ Tính lương tháng ") + st.thang + "/" + st.nam, "pri big", function () {
      if (!need(calcPermission)) return;
      if (!db.nhanvien.length) { alert("Chưa có nhân viên. Hãy nhập ở mục Nhân sự trước."); return; }
      var invalid = C.inputSafety.problems(db, kyStr()); if (invalid.length) { alert("Chưa tính lương: " + invalid.join("; ")); return; }
      var reviewMessage = C.inputReview.message(db, kyStr()); if (reviewMessage) { alert("Chưa tính lương: " + reviewMessage + " còn Nháp. Mở bảng và bấm Lưu để tính lương."); return; }
      if (st.dangTinh) return; st.dangTinh = true;
      try { st.kq = tinhLuong(); st.kqStale = false; } finally { st.dangTinh = false; }
      render(); toast("Đã tính xong " + st.kq.bangluong.length + " nhân viên");
    }));
    bar.appendChild(sel);
    bar.appendChild(btn("Xem cách bù", "", function () { var m = buMethodOf(st.bu); if (m) xemCachTinhBu(m); else alert(buLabel(st.bu)); }));
    var qs = h("select", { "aria-label": "Quy chế tính lương", title: "Áp dụng cho mọi kỳ chưa chốt của dữ liệu này (kỳ đã chốt giữ nguyên số)" }); QC_OPTS.forEach(function (o) { qs.appendChild(h("option", { value: o[0], text: o[1] })); });
    qs.value = quyChe();
    qs.addEventListener("change", function () {
      if (!need("dm.edit", "đổi quy chế tính lương")) { qs.value = quyChe(); return; }
      var cu = quyChe(); db.congty = [Object.assign({}, congTy(), { "Quy chế tính lương": qs.value })]; save();
      audit("Đổi quy chế tính lương", qcLabel(cu) + " → " + qcLabel(qs.value)); st.kq = null; render(); toast("Đã đổi: " + qcLabel(qs.value) + " — bấm Tính lương lại");
    });
    bar.appendChild(qs); bar.appendChild(btn("Xem quy chế", "", function () { xemQuyChe(qs.value); })); card.appendChild(bar);
    // Mục VIII: lựa chọn "Cách bù lương sản lượng" ở trên chỉ để XEM THỬ/so sánh — khi Chốt kỳ, app
    // kiểm tra phương pháp đã dùng để tính khớp bản "Hiệu lực" trong Cài đặt.
    // Chỉ hiện khi công ty này có dùng lương sản phẩm (mã hình thức lương chứa SP) — không làm phiền
    // công ty không bù sản lượng.
    if (db.dm_luong.some(function (l) { return /SP/.test(l["Mã hình thức lương"] || ""); })) {
      var qcBu = E.quyCheBuChinhThuc(db.dm_quychebu, st.nam, st.thang);
      if (qcBu) {
        var dungPP = String(qcBu["Cách bù"]) === String(st.bu);
        card.appendChild(h("div", { class: dungPP ? "hint" : "warn", "data-bu-trial": dungPP ? "0" : "1", text: (dungPP ? "✓ " : "⚠ ") + "Phương pháp bù sản lượng CHÍNH THỨC kỳ " + st.thang + "/" + st.nam + ": " + buLabel(qcBu["Cách bù"]) + (dungPP ? " — đang xem đúng phương pháp này." : " — đang XEM THỬ phương pháp khác (" + buLabel(st.bu) + ") để so sánh; chưa được chốt. Bạn cần chọn phương pháp chính thức, bấm Tính lương và kiểm tra lại trước khi chốt.") }));
      } else card.appendChild(h("div", { class: "warn", text: "⚠ Chưa có Phương pháp bù sản lượng CHÍNH THỨC (Cài đặt → Phương pháp bù sản lượng) cho kỳ " + st.thang + "/" + st.nam + " — lựa chọn ở trên chỉ để xem thử/so sánh. Nếu kỳ này có sản lượng cần bù, sẽ KHÔNG chốt được cho đến khi khai báo quy chế." }));
    }
    if (!st.kq) {
      card.appendChild(h("div", { class: "hint", text: "Kiểm tra dữ liệu kỳ " + st.thang + "/" + st.nam + " rồi bấm nút xanh. Có thể tính lại bất cứ lúc nào." }));
      var cc = db.chamcong.filter(function (r) { return r["Kỳ"] === kyStr(); }).length;
      var sp = staffPay(st.nam, st.thang);
      card.appendChild(h("div", { class: cc ? "ok" : "warn", html: "Chấm công kỳ này: <b>" + cc + "</b> dòng · Nhân viên có hợp đồng hiệu lực trong kỳ: <b>" + sp.list.length + "</b> người" + (cc ? "" : " — <b>chưa có dữ liệu chấm công kỳ này</b>.") }));
      if (sp.warn.length) card.appendChild(h("div", { class: "warn", html: "<b>⚠ Hồ sơ cần bổ sung:</b><br>" + sp.warn.map(esc).join("<br>") }));
      box.appendChild(card); return box;
    }
    if (can("payroll.close")) bar.appendChild(btn("🔒 Chốt kỳ lương", "pri", chotKy, "Lưu bảng lương kỳ này để xem lại về sau và khóa dữ liệu kỳ"));
    var qcOf = db.dm_luong.some(function (l) { return /SP/.test(l["Mã hình thức lương"] || ""); }) ? E.quyCheBuChinhThuc(db.dm_quychebu, st.nam, st.thang) : null;
    if (qcOf && String(qcOf["Cách bù"]) !== String(st.kq.cheDoBu)) box.appendChild(h("div", { class: "warn", "data-bu-result-trial": "1", html: "<b>⚠ KẾT QUẢ XEM THỬ</b> — bảng dưới tính theo <b>" + esc(buLabel(st.kq.cheDoBu)) + "</b>, KHÔNG phải phương pháp chính thức (<b>" + esc(buLabel(qcOf["Cách bù"])) + "</b>). Không dùng số này để thanh toán; app chặn chốt bảng xem thử. Hãy chọn phương pháp chính thức, bấm Tính lương và kiểm tra lại trước khi chốt." }));
    return renderKq(box, card, bar);
  }
