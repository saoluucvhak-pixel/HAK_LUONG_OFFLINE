  function tabSlips() {
    var w = h("div"), bar = h("div", { class: "bar" });
    var single = !!st.kqFull, fresh = st.kq && st.kq.ky === kyStr() && !st.kqStale && !kyChot(kyStr());
    var src = single ? { kq: st.kq, chot: !!kyChot(kyStr()) } : fresh ? { kq: st.kq, chot: false } : kqKy(st.nam, st.thang); // vừa tính ở Tính lương → dùng đúng kết quả đó
    var all = (src.kq && src.kq.bangluong) || [];
    if (single) bar.appendChild(btn("← Quay lại bảng lương", "", function () { st.kq = st.kqFull; st.kqFull = null; st.tab = "luong"; render(); }));
    var pbs = []; all.forEach(function (b) { if (b["Phòng ban"] && pbs.indexOf(b["Phòng ban"]) < 0) pbs.push(b["Phòng ban"]); });
    var selPB = h("select", { "aria-label": "Phòng ban" }); selPB.appendChild(h("option", { value: "", text: "Tất cả phòng ban" }));
    pbs.sort().forEach(function (p) { selPB.appendChild(h("option", { value: p, text: p })); });
    selPB.value = st.slipPB || ""; selPB.addEventListener("change", function () { st.slipPB = selPB.value; render(); });
    var q = h("input", { class: "i", type: "search", placeholder: "Tìm mã / tên nhân viên…", value: st.slipQ || "", style: "width:220px" });
    q.addEventListener("change", function () { st.slipQ = q.value; render(); });
    var gon = h("input", { type: "checkbox" }); gon.checked = !!st.slipGon; gon.addEventListener("change", function () { st.slipGon = gon.checked; render(); });
    var qq = fold(st.slipQ || "").trim();
    var list = all.filter(function (b) { return (single || !st.slipPB || b["Phòng ban"] === st.slipPB) && (single || !qq || fold(b["Mã NV"] + " " + b["Họ và tên"]).indexOf(qq) >= 0); });
    if (!single) { bar.appendChild(selPB); bar.appendChild(q); }
    bar.appendChild(h("label", { class: "chk", title: "Bỏ ngắt trang sau mỗi phiếu — in nhiều phiếu trên 1 tờ A4 rồi cắt" }, [gon, " In gọn (nhiều phiếu / trang)"]));
    bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("⬇ Xuất Excel", "", function () {
      if (!list.length) { toast("Không có phiếu nào"); return; }
      var cols = ["Mã NV", "Họ và tên", "Phòng ban", "Tổng công", "Công chuẩn"].concat(SLIP_LINES.map(function (l) { return l[0]; }));
      var fileP = "PhieuLuong_" + kyStr() + (st.slipPB && !single ? "_" + slug(st.slipPB) : "") + ".xlsx";
      if (window.ExcelJS && window.HAKUi && window.HAKUi.slipXlsx) {
        if (!need("export", "xuất phiếu lương")) return;
        var vmP = { congTy: congTy()["Tên công ty"] || "", kyText: "tháng " + ("0" + st.thang).slice(-2) + "/" + st.nam, trangThai: src.chot ? "Bảng lương đã chốt" : "Chưa chốt — tính tạm",
          rawCols: cols, rawRows: list, slips: list.map(function (b) { return { maNV: b["Mã NV"], hoTen: b["Họ và tên"], phongBan: b["Phòng ban"], tongCong: b["Tổng công"], congChuan: b["Công chuẩn"], sanLuong: b["Sản lượng (tấn)"],
            lines: slipLines(b) }; }) };
        window.HAKUi.slipXlsx.build(window.ExcelJS, vmP, { perPage: st.slipGon ? 2 : 1, rawName: "PhieuLuong_" + kyStr(), nguoiLap: currentUser() }).xlsx.writeBuffer().then(function (buf) {
          download(fileP, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
        }, function (e) { alert("Không tạo được file: " + e.message); });
      } else saveXlsx(fileP, [{ name: "PhieuLuong_" + kyStr(), cols: cols, rows: list.map(function (b) { var o = {}; cols.forEach(function (c) { o[c] = b[c] == null ? "" : b[c]; }); return o; }) }]);
      audit("Xuất phiếu lương Excel", kyLabel(kyStr()) + " · " + list.length + " phiếu");
    }));
    bar.appendChild(btn("⬇ PDF", "", function () {
      if (!list.length) { toast("Không có phiếu nào"); return; }
      var colsP = ["Mã NV", "Họ và tên", "Phòng ban", "Tổng công", "Công chuẩn"].concat(SLIP_LINES.map(function (l) { return l[0]; }));
      exportSheetsPdf({ title: "Phiếu lương", ky: "Kỳ " + ("0" + st.thang).slice(-2) + "/" + st.nam, trangThai: src.chot ? "Đã chốt" : "Chưa chốt — tính tạm", loc: st.slipPB ? ["Phòng ban: " + st.slipPB] : [], sheets: [{ name: "PhieuLuong", rows: list.map(function (b) { var o = {}; colsP.forEach(function (c) { o[c] = b[c] == null ? "" : b[c]; }); return o; }) }] }, "PhieuLuong_" + kyStr() + (st.slipPB && !single ? "_" + slug(st.slipPB) : "") + ".pdf");
    }, "PDF danh sách phiếu theo đúng bộ lọc đang chọn"));
    bar.appendChild(btn("🖨 In " + list.length + " phiếu", "pri", function () { if (!list.length) { toast("Không có phiếu nào"); return; } audit("In phiếu lương", kyLabel(kyStr()) + " · " + list.length + " phiếu"); window.print(); }));
    w.appendChild(bar);
    var kyPad = ("0" + st.thang).slice(-2) + "/" + st.nam;
    if (!single) w.appendChild(h("div", { class: src.chot ? "locked noprint" : "warn noprint", html: src.chot ? "🔒 Phiếu lương <b>tháng " + kyPad + "</b> lấy từ bảng lương <b>đã chốt</b>." : "⚠ Tháng " + kyPad + " <b>chưa chốt</b> — phiếu tính tạm từ dữ liệu hiện tại, có thể thay đổi. Nên chốt kỳ trước khi gửi phiếu cho người lao động." }));
    if (!all.length) { w.appendChild(h("div", { class: "card" }, [h("div", { class: "empty", text: "Chưa có bảng lương tháng " + kyPad + " (chưa có nhân viên / chấm công)." })])); return w; }
    var box = h("div", { class: "slips" + (st.slipGon ? " gon" : ""), "data-slips": String(list.length) });
    if (!list.length) box.appendChild(h("div", { class: "card" }, [h("div", { class: "empty", text: "Không có phiếu nào khớp bộ lọc." })]));
    list.forEach(function (b) { var c = h("div", { class: "card" }); c.appendChild(slipEl(b)); box.appendChild(c); });
    w.appendChild(box);
    return w;
  }
