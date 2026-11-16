  function tabCaiDat() {
    var w = h("div"), bar = h("div", { class: "bar" });
    var SUBS = [["ct", "Công thức lương / tăng ca / phụ cấp / hỗ trợ"], ["bu", "Phương pháp bù sản lượng"], ["qc", "Quy chế tính lương"], ["workflow", "Chế độ sử dụng"]];
    if (!st.cd) st.cd = "ct";
    SUBS.forEach(function (x) { bar.appendChild(btn(x[1], st.cd === x[0] ? "pri" : "", function () { if (st.cd !== x[0] && !leaveOk()) return; st.cd = x[0]; render(); })); });
    w.appendChild(bar);
    if (st.cd === "bu") w.appendChild(buChinhThucPanel());
    else if (st.cd === "workflow") {
      var panel = h("div", { class: "card" }), mode = C.workflowApproval.mode(db);
      panel.appendChild(h("h3", { text: "Chế độ sử dụng" }));
      panel.appendChild(h("p", { class: "hint", text: mode === "roles" ? "Đang sử dụng phân quyền. Bảng lương và chứng từ chi cần người duyệt khác người lập." :
        mode === "single" ? "Một người sử dụng. Quản trị có thể chốt kỳ và tự duyệt chứng từ do mình lập." : "Đang dùng quy trình hiện có. Quản trị có thể chọn chế độ phù hợp." }));
      if (can("system.admin")) {
        var notReady = C.workflowApproval.readiness(db);
        if (notReady) panel.appendChild(h("p", { class: "warn", text: notReady }));
      }
      if (can("system.admin")) [["single", "Một người sử dụng"], ["roles", "Sử dụng phân quyền"]].forEach(function (option) {
        if (option[0] === mode) return;
        panel.appendChild(btn(option[1], "", function () {
          if (option[0] === "roles") {
            var error = C.workflowApproval.readiness(db);
            if (error) { alert(error); return; }
          }
          askText(option[1], "Thay đổi áp dụng cho các kỳ chưa chốt và chứng từ chưa duyệt.", { label: "Lý do thay đổi", required: true }, function (reason) {
            reason = String(reason || "").trim();
            if (!reason || !need("system.admin")) { if (!reason) alert("Cần nhập lý do thay đổi."); return; }
            if (!saveNow()) { alert(lastSaveError); return; }
            if (!txn(["workflowSettings"], function () {
              db.workflowSettings = [{ mode: option[0], reason: reason, user: C.workflowApproval.account(session.tenDangNhap), changedAt: new Date().toISOString() }];
              audit("Đổi chế độ sử dụng", option[1] + " · " + reason);
            })) { alert(lastTxnError); return; }
            render();
          });
        }));
      });
      w.appendChild(panel);
    } else if (st.cd === "qc") {
      var c = h("div", { class: "card" }); c.appendChild(h("h3", { text: "Quy chế tính lương" }));
      c.appendChild(h("div", { class: "hint", text: "Quy chế đang áp dụng: " + qcLabel(quyChe()) + ". Đổi tại màn hình Tính lương theo kỳ; kỳ đã chốt giữ nguyên." })); w.appendChild(c);
    } else w.appendChild(congThucPanel());
    return w;
  }
