  function tabCaiDat() {
    var w = h("div"), bar = h("div", { class: "bar" });
    var SUBS = [["ct", "Công thức lương / tăng ca / phụ cấp / hỗ trợ"], ["bu", "Phương pháp bù sản lượng"], ["qc", "Quy chế tính lương"]];
    if (!st.cd) st.cd = "ct";
    SUBS.forEach(function (x) { bar.appendChild(btn(x[1], st.cd === x[0] ? "pri" : "", function () { if (st.cd !== x[0] && !leaveOk()) return; st.cd = x[0]; render(); })); });
    w.appendChild(bar);
    if (st.cd === "bu") w.appendChild(buChinhThucPanel());
    else if (st.cd === "qc") {
      var c = h("div", { class: "card" }); c.appendChild(h("h3", { text: "Quy chế tính lương" }));
      c.appendChild(h("div", { class: "hint", text: "Quy chế đang áp dụng: " + qcLabel(quyChe()) + ". Đổi tại màn hình Tính lương theo kỳ; kỳ đã chốt giữ nguyên." })); w.appendChild(c);
    } else w.appendChild(congThucPanel());
    return w;
  }
