  function tabNhanVien() {
    var nv = db.nhanvien.filter(function (r) { return r["Mã NV"] === st.nv; })[0];
    if (!nv) { st.tab = "nhansu"; return tabNhanSu(); }
    var ma = nv["Mã NV"], today = HRM.today(), hh = HRM.hienHanh(db, ma, today), w = h("div");
    var active = HRM.activeHD(db, ma, today, today);
    var effective = hh.ct && (!hh.ct["Hiệu lực từ"] || VAL.normDate(hh.ct["Hiệu lực từ"]) <= today) ? hh.ct : null;
    var endDate = hh.hd && VAL.normDate(hh.hd["Ngày chấm dứt"]);
    var expiry = active && VAL.normDate(active["Ngày hết hạn"]);
    var head = h("div", { class: "card nvhead" });
    head.appendChild(h("div", { class: "bar", style: "margin:0" }, [
      btn("← Danh sách", "", function () { st.tab = "nhansu"; render(); }),
      h("div", { class: "avatar", text: String(nv["Họ và tên"] || "?").trim().split(/\s+/).pop().charAt(0).toUpperCase() }),
      h("div", { html: "<b style='font-size:18px'>" + esc(nv["Họ và tên"]) + "</b> <span class='tag " + (nv["Trạng thái"] === "Đã nghỉ việc" ? "off" : "on") + "'>" + esc(nv["Trạng thái"] || "") + "</span><br><span class='hint' style='margin:0'>" +
        esc(ma) + (hh.tenPB ? " · " + esc(hh.tenPB) : "") + (hh.tenCV ? " · " + esc(hh.tenCV) : "") + (hh.hd ? " · HĐ " + esc(hh.hd["Số HĐLĐ"]) + " (" + esc(hh.hd["Hình thức HĐLĐ"] || "") + ")" : " · chưa có hợp đồng") +
        (active && effective && canSeePay() ? " · Lương " + fmt(E.money(effective["Lương thỏa thuận"])) : "") + "</span>" }),
      h("span", { class: "sp" }),
      active && can("hr.edit") ? btn("Lập phụ lục lương", "pri", function () { bienDongForm(nv, active); }) : null,
      active && can("hr.edit") ? btn("Đề nghị điều chuyển", "", function () { nvnsForm(null, { "Mã NV": ma, "Loại nghiệp vụ": "Điều chuyển bộ phận" }); }) : null,
      btn("✎ Sửa cơ bản", "", function () { editBaseNV(nv); }),
      btn("🕘 Lịch sử", "", function () { lichSuNV(nv); }),
      nv["Trạng thái"] !== "Đã nghỉ việc" && can("hr.edit") ? btn("Đề nghị nghỉ việc", "", function () { nvnsForm(null, { "Mã NV": ma, "Loại nghiệp vụ": "Nghỉ việc" }); }) : null,
      btn("🗑", "red", function () {
        if (!need("hr.edit", "xóa nhân viên")) return;
        var refs = GRD.references(db, ma), inClosed = refs.kyluong || refs.kyluong_lichsu;
        if (inClosed && !can("retro.edit")) { alert("⛔ Nhân viên " + ma + " đã có trong bảng lương ĐÃ CHỐT. Chỉ Admin được xóa hồ sơ này (bảng lương đã chốt vẫn giữ nguyên)."); return; }
        if (!confirm("XÓA hẳn nhân viên " + nv["Họ và tên"] + " và toàn bộ hồ sơ (không xóa chấm công/sản lượng)?" + (inClosed ? "\n\n⚠ Nhân viên này có trong " + inClosed + " bảng lương đã chốt — số đã chốt KHÔNG đổi, nhưng hồ sơ gốc sẽ không còn để đối chiếu." : ""))) return;
        if (!backupOrBlock("truoc-xoa-nhan-vien", "xóa nhân viên")) return;
        var result = REPO.removeEmployee(nv, Object.keys(HR));
        if (!result.ok) { alert("Chưa xóa nhân viên: " + (result.msg || lastTxnError)); render(); return; }
        st.tab = "nhansu"; render();
      }, "Xóa nhân viên")]));
    w.appendChild(head);
    var horizon = new Date(today + "T00:00:00Z");
    horizon.setUTCDate(horizon.getUTCDate() + 30);
    var notice = !hh.hd ? "Chưa có hợp đồng lao động."
      : !active ? "Hồ sơ đang hiển thị hợp đồng gần nhất. Hôm nay không có hợp đồng hiệu lực."
      : !effective ? "Hợp đồng chưa có phụ lục lương hiệu lực hôm nay."
      : endDate && endDate >= today ? "Ngày chấm dứt hợp đồng: " + endDate + "."
      : expiry && expiry < today ? "Hợp đồng đã quá hạn: " + expiry + "."
      : expiry && expiry <= horizon.toISOString().slice(0, 10) ? "Hợp đồng sắp hết hạn: " + expiry + "."
      : "";
    if (notice) w.appendChild(h("div", { class: "warn" }, [
      h("span", { text: notice + " " }),
      btn("Mở hợp đồng", "ghost", function () { st.nvTab = "hopdong"; st.hd = hh.hd ? hh.hd["Số HĐLĐ"] : null; render(); })
    ]));
    if (active && effective) head.appendChild(h("p", { class: "hint", text: "Phụ lục hiện hành" +
      (effective["Mã công tác"] ? " " + effective["Mã công tác"] : "") +
      (effective["Hiệu lực từ"] ? " · Hiệu lực từ " + effective["Hiệu lực từ"] : "") }));
    var tabs = h("div", { class: "subtabs" });
    st.nvTab = st.nvTab || "canhan";
    HRM.NV_TABS.forEach(function (k) {
      var n = (db[k] || []).filter(function (r) { return r["Mã NV"] === ma; }).length;
      tabs.appendChild(h("button", { class: st.nvTab === k ? "on" : "", on: { click: function () { st.nvTab = k; render(); } } }, [document.createTextNode(HR[k].icon + " " + HR[k].ten), n ? h("span", { class: "n", text: n }) : null]));
    });
    var upcoming = db.chitiethd.filter(function (row) {
      return row["Mã NV"] === ma && VAL.normDate(row["Hiệu lực từ"]) > today;
    }).sort(function (a, b) { return String(a["Hiệu lực từ"]).localeCompare(String(b["Hiệu lực từ"])); });
    if (upcoming.length) {
      var next = upcoming[0];
      w.appendChild(h("div", { class: "hint", "data-hr-upcoming": "1" }, [
        h("span", { text: "Sắp hiệu lực: " + fmtDate(next["Hiệu lực từ"]) + " · " + (next["Loại biến động"] || "Phụ lục") +
          " · " + (HRM.refName(db, "dm_phongban", next["Phòng ban"]) || next["Phòng ban"] || "") + " " }),
        btn("Xem phụ lục", "ghost", function () { st.nvTab = "hopdong"; st.hd = next["Số HĐLĐ"]; st.hdTab = "chitiethd"; render(); })
      ]));
    }
    w.appendChild(tabs);
    if (st.nvTab === "nhanthan") {
      var nptRows = db.nhanthan.filter(function (r) { return r["Mã NV"] === ma; });
      var nc = h("div", { class: "card", "data-npt-master": ma });
      nc.appendChild(h("div", { class: "bar", style: "margin:0" }, [
        h("div", { html: "Nhân viên <b>" + esc(ma) + "</b> có <b>" + nptRows.length + "</b> người thân / người phụ thuộc đã khai." }),
        h("span", { class: "sp" }),
        btn("Chi tiết người phụ thuộc", "pri", function () { if (!leaveOk()) return; nptModal(ma); }, "Mở cửa sổ cha–con để xem, thêm, sửa người phụ thuộc của nhân viên này")]));
      if (nptRows.length) {
        var nt = h("table"); nt.appendChild(h("tr", {}, [h("th", { text: "Họ tên" }), h("th", { text: "Quan hệ" })]));
        nptRows.forEach(function (r) { nt.appendChild(h("tr", {}, [h("td", { class: "t", text: r["Họ tên nhân thân"] || "" }), h("td", { class: "t", text: r["Quan hệ"] || "" })])); });
        nc.appendChild(h("div", { class: "tw" }, [nt]));
      }
      w.appendChild(nc); return w;
    }
    if (st.nvTab !== "hopdong") { w.appendChild(subTable(st.nvTab, { "Mã NV": ma })); return w; }
    // Tab hợp đồng: danh sách HĐ + mục con của HĐ đang chọn
    var hds = db.hopdong.filter(function (r) { return r["Mã NV"] === ma; });
    var cur = hds.filter(function (r) { return r["Số HĐLĐ"] === st.hd; })[0] || hh.hd || hds[0];
    w.appendChild(subTable("hopdong", { "Mã NV": ma }, { selected: cur, onPick: function (r) { st.hd = r["Số HĐLĐ"]; render(); } }));
    if (!cur) return w;
    st.hd = cur["Số HĐLĐ"];
    var nPL = db.chitiethd.filter(function (r) { return r["Mã NV"] === ma && r["Số HĐLĐ"] === cur["Số HĐLĐ"]; }).length;
    var mc = h("div", { class: "card", "data-hd-master": cur["Số HĐLĐ"] });
    mc.appendChild(h("div", { class: "bar", style: "margin:0" }, [
      h("div", { html: "Hợp đồng đang chọn: <b>" + esc(cur["Số HĐLĐ"]) + "</b> (" + esc(cur["Hình thức HĐLĐ"] || "") + ") · " + nPL + " dòng lương & phụ lục. Bấm vào hợp đồng khác ở bảng trên để chuyển." }),
      h("span", { class: "sp" }),
      btn("📂 Chi tiết hợp đồng", "pri", function () { if (!leaveOk()) return; hdChiTietModal(ma, cur["Số HĐLĐ"]); }, "Mở cửa sổ cha–con: lương & phụ lục, nghỉ phép, tài liệu… của đúng hợp đồng này")]));
    w.appendChild(mc);
    return w;
  }
