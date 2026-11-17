  function tabDanhMuc() {
    var w = h("div"), bar = h("div", { class: "bar" });
    if (DM_CAI_DAT[st.dm]) st.dm = Object.keys(DM).filter(function (k) { return !DM_CAI_DAT[k]; })[0];
    Object.keys(DM).filter(function (k) { return !DM_CAI_DAT[k]; }).forEach(function (k) { bar.appendChild(btn(DM[k].ten + (countOf(k) ? " (" + countOf(k) + ")" : ""), st.dm === k ? "pri" : "", function () { if (st.dm !== k && !leaveOk()) return; st.dm = k; st.benefitCatalog = false; saveUi(); render(); })); });
    bar.appendChild(btn("Tiêu chuẩn phúc lợi", st.benefitCatalog ? "pri" : "", function () { if (!leaveOk()) return; st.benefitCatalog = !st.benefitCatalog; render(); }));
    var layout = h("div", { class: "hak-catalog-layout" });
    var side = h("aside", { class: "hak-catalog-side", "aria-label": "Chọn danh mục" });
    side.appendChild(h("div", { class: "hak-catalog-side-title", text: "DANH MỤC HỆ THỐNG" }));
    side.appendChild(bar);
    layout.appendChild(side);
    var workspace = h("section", { class: "hak-catalog-main", "aria-label": "Nội dung danh mục" });
    workspace.appendChild(h("div", { class: "hak-catalog-heading" }, [h("small", { text: "QUẢN LÝ DANH MỤC" }), h("h2", { text: st.benefitCatalog ? "Tiêu chuẩn phúc lợi" : DM[st.dm] ? DM[st.dm].ten : "Danh mục" })]));
    workspace.appendChild(st.benefitCatalog ? benefitCatalog() : st.dm === "dm_tncn" ? thuePanel() : FM_TABLE[st.dm] ? fmUi(FM_TABLE[st.dm]).masterView() : grid(st.dm, DM[st.dm]));
    layout.appendChild(workspace);
    w.appendChild(layout);
    return w;
  }
