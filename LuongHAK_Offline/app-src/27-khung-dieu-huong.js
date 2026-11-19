  // ---------- Khung & điều hướng ----------
  var NAV = [
    ["grp", "Tổng quan"], ["home", "🏠", "Tổng quan"],
    ["grp", "Nhân sự"], ["nhansu", "👥", "Danh sách nhân viên & hồ sơ"], ["nvns", "📝", "Nghiệp vụ nhân sự"], ["capphat", "📦", "Cấp phát"],
    ["grp", "Chấm công"], ["chamcong", "🗓", "Bảng chấm công"], ["ocr", "📷", "Đọc ảnh chấm công"], ["ocrlib", "🗂", "Thư viện mẫu OCR"],
    ["grp", "Sản lượng"], ["sanluong", "⚖", "Sản lượng"], ["bandam", "🚛", "Ban dăm xuất hàng"], ["rp_sl", "⚖", "Phiếu gốc sản lượng"], ["rp_bd", "🚛", "Phiếu gốc Ban dăm xuất hàng"],
    ["grp", "Nghiệp vụ tiền lương"], ["psluong", "🎁", "Thưởng / Trừ"], ["ungluong", "💵", "Tạm ứng"], ["tiencom", "🍚", "Suất cơm"],
    ["grp", "Tính lương"], ["luong", "▶", "Tính lương theo kỳ"], ["ktbl", "✔", "Kiểm tra bảng lương"], ["kyluong", "🔒", "Kỳ lương đã chốt"], ["doichieu", "↔", "Đối chiếu Excel"],
    ["grp", "Thanh toán lương"], ["rp_thanhtoan", "💼", "Bảng thanh toán lương"], ["rp_cttt", "📒", "Chi tiết thanh toán"], ["rp_soct", "🗂", "Sổ chứng từ thanh toán"], ["rp_ck", "🏦", "Bảng kê chuyển khoản"], ["rp_tm", "💵", "Thanh toán tiền mặt"],
    ["grp", "Báo cáo lương"], ["bangtinh", "📋", "Bảng tính lương"], ["rp_tonghop", "📑", "Bảng tổng hợp lương"], ["rp_ctnv", "📃", "Tổng hợp chi tiết nhân viên"], ["slips", "🧾", "Phiếu lương chi tiết"], ["rp_tncn", "🧮", "Khấu trừ thuế TNCN"],
    ["grp", "Báo cáo khác"], ["rp_pb", "🏢", "Tổng hợp theo phòng ban"], ["baocaoluong", "📈", "Báo cáo lương khác"], ["baocao", "📊", "Báo cáo nhân sự"],
    ["grp", "Báo cáo nghiệp vụ"], ["rp_ns", "👥", "Danh sách nhân sự"], ["rp_th", "🎁", "Bảng kê thưởng / trừ"], ["rp_tu", "💵", "Bảng kê tạm ứng"], ["rp_com", "🍚", "Tổng hợp suất cơm"],
    ["grp", "Danh mục"], ["dm", "📚", "Danh mục"],
    ["grp", "Cài đặt"], ["caidat", "🛠", "Công thức & phương pháp"], ["backup", "⚙", "Công ty & Sao lưu"], ["huongdan", "📖", "Hướng dẫn & Quy chế"]
  ];
  // Tab nào cần quyền xem nào (kiểm tra cả khi mở bằng trạng thái đã lưu, không chỉ ẩn menu)
  var TAB_PERM = { ocr: "input.edit", ocrlib: "input.view", luong: "payroll.view", bangtinh: "payroll.view", slips: "payroll.view", rp_tonghop: "payroll.view", rp_pb: "payroll.view", rp_tncn: "payroll.view", rp_ctnv: "payroll.view", rp_cttt: "payroll.view", rp_soct: "payroll.view", rp_thanhtoan: "payroll.view", rp_ck: "payroll.view", rp_tm: "payroll.view", kyluong: "payroll.view", baocaoluong: "payroll.view", doichieu: "payroll.view", nhansu: "hr.view", nv: "hr.view", baocao: "report.view", nvns: "hr.view", capphat: "hr.view", caidat: "payroll.view", ktbl: "payroll.view" };
  Object.keys(OPS_SCREENS).forEach(function (k) { TAB_PERM[k] = OPS.TYPES[OPS_SCREENS[k]].perm; });
  // @screen tabAllowed
  var TITLES = { nvns: "Nghiệp vụ nhân sự", capphat: "Cấp phát sữa phúc lợi và bảo hộ lao động", ktbl: "Kiểm tra bảng lương", caidat: "Cài đặt — Công thức & phương pháp tính lương", ocr: "Đọc ảnh bảng chấm công / chấm cơm (OCR)", ocrlib: "OCR & Chứng từ — Thư viện mẫu", home: "Tổng quan", luong: "Tính lương", bangtinh: "Bảng tính lương", rp_tonghop: "Bảng tổng hợp lương", rp_pb: "Bảng tổng hợp lương theo phòng ban", rp_tncn: "Báo cáo khấu trừ thuế TNCN", rp_ctnv: "Bảng tổng hợp chi tiết lương toàn bộ nhân viên", rp_thanhtoan: "Bảng thanh toán lương", rp_cttt: "Chi tiết thanh toán", rp_soct: "Sổ chứng từ thanh toán", rp_ck: "Bảng kê chuyển khoản", rp_tm: "Bảng thanh toán lương tiền mặt", slips: "Phiếu lương chi tiết", dm: "Danh mục", backup: "Công ty & Sao lưu", nhansu: "Nhân sự", nv: "Hồ sơ nhân viên", baocao: "Báo cáo nhân sự", rp_ns: "Danh sách nhân sự", rp_sl: "Bảng kê phiếu cân sản lượng", rp_bd: "Bảng kê Ban dăm xuất hàng", rp_th: "Bảng kê thưởng / trừ", rp_tu: "Bảng kê tạm ứng lương", rp_com: "Tổng hợp suất cơm", kyluong: "Kỳ lương đã chốt", baocaoluong: "Báo cáo lương", doichieu: "Đối chiếu lương Power Query", huongdan: "Hướng dẫn & Quy chế lương" };
  function updateNav() { document.querySelectorAll("#nav button[data-k]").forEach(function (b) { var k = b.getAttribute("data-k"), n = $(".n", b); if (n && ALL[k]) n.textContent = countOf(k); }); }
  function periodBox() {
    var m = h("select"), y = h("input", { class: "i", type: "number", style: "width:80px", value: st.nam });
    for (var i = 1; i <= 12; i++) m.appendChild(h("option", { value: i, text: "Tháng " + i }));
    m.value = st.thang;
    var ch = function () { st.thang = +m.value; st.nam = +y.value || st.nam; st.kq = null; st.pg = {}; saveUi(); render(); };
    m.addEventListener("change", ch); y.addEventListener("change", ch);
    return h("div", { class: "period" }, [h("label", { text: "Kỳ lương" }), m, y]);
  }
  function sideFoot(ver) {
    var f = $("#sidefoot"); f.innerHTML = "";
    f.appendChild(h("button", { class: "themebtn", type: "button", on: { click: toggleTheme } }, [curTheme() === "dark" ? "🏖 Giao diện sáng" : "🌙 Giao diện tối"]));
    var skinSelect = h("select", { class: "themebtn hak-skin-select", "aria-label": "Chọn phong cách giao diện", title: "Bộ giao diện HAK Enterprise V10.4" });
    HAK_SKINS.forEach(function (v) { var o = h("option", { value: v[0], text: v[1] }); if (curSkin() === v[0]) o.selected = true; skinSelect.appendChild(o); });
    skinSelect.addEventListener("change", function () { setSkin(skinSelect.value); });
    f.appendChild(skinSelect);
    f.appendChild(h("div", { class: "ver", "data-storage-label": ver, text: ver }));
  }
  /** Tìm nhanh (Ctrl+K): màn hình, nhân viên, báo cáo — gõ không dấu cũng được, Enter để mở. */
  function quickSearch() {
    if (!session || loadError) return;
    var items = [];
    NAV.forEach(function (n) { if (n[0] !== "grp" && tabAllowed(n[0])) items.push({ ic: n[1], t: n[2], s: "Màn hình", go: function () { st.tab = n[0]; } }); });
    if (tabAllowed("baocao")) BC.forEach(function (b) { items.push({ ic: "📊", t: b[1].replace(/^\S+\s/, ""), s: "Báo cáo nhân sự", go: function () { st.tab = "baocao"; st.bc = b[0]; } }); });
    if (tabAllowed("nv")) db.nhanvien.forEach(function (nv) { items.push({ ic: "👤", t: (nv["Mã NV"] || "") + " · " + (nv["Họ và tên"] || ""), s: nv["Trạng thái"] || "Nhân viên", go: function () { st.tab = "nv"; st.nv = nv["Mã NV"]; st.nvTab = "canhan"; } }); });
    items.push({ ic: "🌙", t: "Đổi giao diện sáng / tối", s: "Giao diện", go: null, act: toggleTheme });
    if (FILES) items.push({ ic: "📂", t: "File đã tải (Excel, báo cáo, phiếu lương)", s: "Mở file / thư mục", go: null, act: filesDrawer });
    items.forEach(function (it) { it.k = fold(it.t + " " + it.s); });
    var body = h("div", { class: "cmdk" }), inp = h("input", { type: "search", placeholder: "Gõ tên màn hình, mã / tên nhân viên, báo cáo… (không dấu cũng được)", "aria-label": "Tìm nhanh" }), ul = h("ul", { role: "listbox" });
    body.appendChild(inp); body.appendChild(ul);
    var close = modal("Tìm nhanh", body), shown = [], sel = 0;
    var open = function (it) { close(); if (it.act) { it.act(); return; } it.go(); saveUi(); render(); };
    var draw = function () {
      var q = fold(inp.value).trim().split(/\s+/).filter(Boolean);
      shown = items.filter(function (it) { return q.every(function (w) { return it.k.indexOf(w) >= 0; }); }).slice(0, 40);
      if (sel >= shown.length) sel = 0;
      ul.innerHTML = "";
      if (!shown.length) ul.appendChild(h("li", { class: "empty", text: "Không tìm thấy" }));
      shown.forEach(function (it, i) { ul.appendChild(h("li", {}, [h("button", { type: "button", class: i === sel ? "on" : "", on: { click: function () { open(it); } } }, [it.ic + " " + it.t, h("small", { text: it.s })])])); });
    };
    inp.addEventListener("input", function () { sel = 0; draw(); });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); draw(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
      else if (e.key === "Enter" && shown[sel]) { e.preventDefault(); open(shown[sel]); }
      else if (e.key === "Escape") close();
    });
    draw(); setTimeout(function () { inp.focus(); }, 30);
  }
  // ---------- File đã tải (2.0-α16): Excel / báo cáo / phiếu lương lưu vào 1 thư mục, mở file hoặc mở thư mục ngay trong app ----------
  var FILES = window.hakFiles || null; // chỉ có ở bản cài (.exe); trình duyệt thì tải file theo cách của trình duyệt
  function openFile(name) { if (!FILES.open(name)) fileGone(); }
  function showFile(name) { if (!FILES.show(name)) fileGone(); }
  /** Thẻ báo sau mỗi lần tải: tên file + nơi lưu + [Mở file] [Mở thư mục] */
  function downloadCard(info) {
    var old = $("#dlcard"); if (old) old.remove();
    var c = h("div", { id: "dlcard", class: info.ok ? "" : "bad", role: "status" });
    var close = function () { c.remove(); };
    if (info.ok) {
      c.appendChild(h("div", { class: "t" }, ["✓ Đã lưu file", btn("✕", "ghost", close)]));
      c.appendChild(h("div", { class: "nm", text: info.name, title: info.name }));
      c.appendChild(h("div", { class: "hint", text: "Tại: " + info.dir + (info.opened ? " — đã mở thư mục, chọn sẵn file" : "") }));
      c.appendChild(h("div", { class: "bar" }, [btn("📄 Mở file", "pri", function () { openFile(info.name); close(); }), btn("📂 Mở thư mục", "", function () { showFile(info.name); close(); }), btn("Xem file đã tải", "ghost", function () { close(); filesDrawer(); })]));
    } else {
      c.appendChild(h("div", { class: "t" }, ["⚠ Không lưu được file", btn("✕", "ghost", close)]));
      c.appendChild(h("div", { class: "hint", text: (info.name || "") + " — " + (info.state === "blocked" ? "BỊ CHẶN bởi tiến trình chính: kỳ còn lỗi chặn xuất bảng lương (" + (info.blocked || "") + "). Sửa rồi tính lại." : info.state === "cancelled" ? "đã hủy" : "lỗi khi ghi file (thư mục lưu có thể không ghi được; đổi thư mục trong “File đã tải”)") }));
    }
    ($("#app") || document.body).appendChild(c); // trong #app: icon SVG tự đổi như các nút khác
    clearTimeout(downloadCard.t); downloadCard.t = setTimeout(close, 12000);
  }
  if (FILES) FILES.onDone(downloadCard);
  /** Ngăn "File đã tải": danh sách file trong thư mục lưu, mở / mở thư mục, đổi thư mục lưu */
  function filesDrawer() {
    if (!FILES) return;
    var body = h("div", { class: "files" }), closeFn = null;
    var draw = function () {
      var inf = FILES.info(); body.innerHTML = "";
      if (!inf || !inf.ok) { body.appendChild(h("div", { class: "warn", text: "Không đọc được thư mục lưu: " + ((inf && inf.error) || "") })); return; }
      body.appendChild(h("div", { class: "fdir" }, [h("span", { class: "hint", text: "Thư mục lưu" }), h("b", { text: inf.dir, title: inf.dir })]));
      var cb = h("input", { type: "checkbox" }); cb.checked = inf.openAfterDownload;
      cb.addEventListener("change", function () { FILES.setOpenAfter(cb.checked); toast(cb.checked ? "Tải xong sẽ tự mở thư mục" : "Tải xong chỉ báo trong app, không tự mở thư mục"); });
      body.appendChild(h("label", { class: "chk" }, [cb, " Tự mở thư mục (chọn sẵn file) sau mỗi lần tải"]));
      if (!inf.files.length) { body.appendChild(h("div", { class: "empty", text: "Chưa có file nào. Bấm xuất Excel / báo cáo / phiếu lương — file sẽ lưu vào thư mục trên." })); return; }
      var ul = h("ul", { class: "flist" });
      inf.files.forEach(function (f) {
        var ext = (f.name.split(".").pop() || "").toLowerCase();
        ul.appendChild(h("li", {}, [h("span", { class: "fx x-" + ext, text: ext.toUpperCase() }),
          h("div", { class: "fm" }, [h("b", { text: f.name, title: f.name }), h("small", { text: fmtTime(f.mtime) + " · " + fmtSize(f.size) })]),
          btn("Mở", "", function () { openFile(f.name); }, "Mở bằng Excel / ứng dụng mặc định"), btn("📂", "ghost", function () { showFile(f.name); }, "Mở thư mục, chọn sẵn file này")]));
      });
      body.appendChild(ul);
    };
    draw();
    closeFn = modal("📂 File đã tải", body, function (close) {
      return [btn("📂 Mở thư mục", "pri", function () { if (!FILES.openDir()) toast("Không mở được thư mục"); }),
        btn("Đổi thư mục lưu…", "", function () { var r = FILES.chooseDir(); if (r && r.ok) { toast("Từ giờ file lưu vào: " + r.dir); audit("Đổi thư mục lưu file xuất", ""); draw(); } else if (r && r.error) toast(r.error); }),
        btn("Dùng thư mục mặc định", "ghost", function () { var r = FILES.resetDir(); if (r && r.ok) { toast("Dùng thư mục mặc định: " + r.dir); draw(); } }),
        btn("Đóng", "", close)];
    }, { drawer: true });
    return closeFn;
  }
  /** V9: quyền do TIẾN TRÌNH CHÍNH quyết định. Giao diện chỉ hỏi lại; nếu main đã thu hồi/hết hạn phiên → đăng xuất. */
  var sessChecked = 0;
  function syncSession() {
    if (!store || !store.authState || !session) return;
    var t = Date.now(); if (t - sessChecked < 2000) return; sessChecked = t;
    try { var r = store.authState(); if (r && !r.ok) { session = null; toast("Phiên đăng nhập đã hết hiệu lực hoặc quyền đã bị thu hồi — đăng nhập lại"); } } catch (e) { /* lần vẽ sau thử lại */ }
  }
  function render() {
    if(st.tab !== "backup" && window.hakYears) window.hakYears.release().catch(function(){});
    if (window.HAKUI && window.HAKUI.filter) window.HAKUI.filter.close();
    syncSession();
    try { renderInner(); }
    catch (e) {
      var m = $("#main"); if (!m) return;
      m.innerHTML = "";
      m.appendChild(h("div", { class: "card" }, [h("h3", { text: "⚠ Có lỗi khi hiển thị màn hình này" }),
        h("div", { class: "warn", text: String(e && e.message || e) }),
        h("div", { class: "hint", text: "Dữ liệu KHÔNG bị mất. Hãy quay về Trang chủ; nếu lỗi lặp lại, bấm Sao lưu ra file và gửi file + ảnh màn hình cho người hỗ trợ." }),
        h("div", { class: "bar" }, [btn("🏠 Về Trang chủ", "pri", function () { st.tab = "home"; render(); }), btn("⬇ Sao lưu ra file", "", function () { if (!need("backup.restore", "sao lưu toàn bộ dữ liệu ra file")) return; download("LuongHAK_backup_" + HRM.today() + ".json", "application/json", JSON.stringify(db)); if (store && store.noteExternal) store.noteExternal(); })])]));
      if (window.console) console.error(e);
    }
  }
  function renderInner() {
    applySkin(curSkin()); applyTheme(curTheme());
    if (loadError) { $("#nav").innerHTML = ""; $("#top").innerHTML = "<h2>Khôi phục dữ liệu</h2>"; var mm = $("#main"); mm.innerHTML = ""; mm.appendChild(recoveryScreen()); return; }
    if (!session) {
      // Chưa đăng nhập: không hiện menu, không hiện dữ liệu nào
      $("#nav").innerHTML = ""; var t0 = $("#top"); t0.innerHTML = ""; t0.appendChild(h("h2", { text: !(db.nguoidung || []).length ? "Thiết lập ban đầu" : "Đăng nhập" }));
      var m0 = $("#main"); m0.innerHTML = "";
      m0.appendChild(!(db.nguoidung || []).length ? setupAdminScreen() : st.authView === "recover" ? recoverAdminScreen() : loginScreen());
      sideFoot(""); return;
    }
    if (!readOnly && can("input.edit")) C.inputReview.initialize(db);
    if (!tabAllowed(st.tab)) st.tab = "home";
    var nav = $("#nav"); nav.innerHTML = "";
    var activeNav = st.tab === "slips" && st.kqFull ? "luong" : (st.tab === "nv" ? "nhansu" : st.tab);
    // Navigation accordion: persistent presentation preference, no payroll/database mutation.
    var collapsed = {};
    try { collapsed = JSON.parse(localStorage.getItem(KEY + "_nav_collapsed") || "{}") || {}; } catch (e) { collapsed = {}; }
    var groupKey = "", groupLabel = "", groupIndex = 0;
    NAV.forEach(function (n, i) {
      if (n[0] === "grp") {
        groupKey = "group_" + (++groupIndex);
        groupLabel = n[1];
        var visible = false, containsActive = false, groupCount = 0;
        for (var j = i + 1; j < NAV.length && NAV[j][0] !== "grp"; j++) {
          if (tabAllowed(NAV[j][0])) { visible = true; groupCount++; if (activeNav === NAV[j][0]) containsActive = true; }
        }
        if (visible) {
          let gk = groupKey, gl = groupLabel, gc = groupCount;
          var isClosed = !!collapsed[gk] && !containsActive;
          var heading = h("button", { class: "grp hak-nav-group" + (isClosed ? " is-collapsed" : ""), type: "button", "aria-expanded": isClosed ? "false" : "true", title: "Thu gọn / mở rộng " + gl, on: { click: function () {
            var nowClosed = this.getAttribute("aria-expanded") === "true";
            collapsed[gk] = nowClosed;
            try { localStorage.setItem(KEY + "_nav_collapsed", JSON.stringify(collapsed)); } catch (e) {}
            render();
          } } }, [h("span", { text: gl }), h("span", { class: "hak-nav-group-count", text: String(gc) }), h("span", { class: "hak-nav-chevron", text: isClosed ? "▸" : "▾" })]);
          nav.appendChild(heading);
        }
        return;
      }
      if (!tabAllowed(n[0])) return;
      if (groupKey && collapsed[groupKey] && activeNav !== n[0]) {
        var activeInGroup = false;
        for (var k = i; k >= 0 && NAV[k][0] !== "grp"; k--) if (NAV[k][0] === activeNav) activeInGroup = true;
        if (!activeInGroup) return;
      }
      var b = h("button", { class: activeNav === n[0] ? "on" : "", "data-k": n[0], on: { click: function () { if (!leaveOk()) return; if (st.kqFull) { st.kq = st.kqFull; st.kqFull = null; } st.tab = n[0]; saveUi(); render(); } } }, [h("span", { class: "ic", text: n[1] }), h("span", { text: n[2] })]);
      if (S[n[0]]) b.appendChild(h("span", { class: "n", text: countOf(n[0]) }));
      if (n[0] === "kyluong") b.appendChild(h("span", { class: "n", text: db.kyluong.length }));
      if (n[0] === "nhansu") b.appendChild(h("span", { class: "n", text: db.nhanvien.filter(function (r) { return r["Trạng thái"] !== "Đã nghỉ việc"; }).length }));
      nav.appendChild(b);
    });
    sideFoot(store ? "Tự lưu ra file trên máy" : "Dữ liệu lưu trong trình duyệt");
    var bb = $(".brand small"); if (bb) bb.textContent = congTy()["Tên công ty"] || "Chạy offline";
    var top = $("#top"); top.innerHTML = "";
    var title = TITLES[st.tab] || (S[st.tab] && S[st.tab].ten) || "";
    top.appendChild(h("h2", { title: title, text: ["bangtinh", "rp_tonghop", "rp_pb", "rp_tncn", "rp_ctnv", "rp_thanhtoan", "rp_cttt", "rp_soct", "rp_ck", "rp_tm", "slips", "baocaoluong", "rp_ns", "rp_sl", "rp_bd", "rp_th", "rp_tu", "rp_com"].indexOf(st.tab) >= 0 ? String(title).toLocaleUpperCase("vi-VN") : title }));
    top.appendChild(h("button", { class: "topbtn srch", type: "button", "aria-label": "Tìm kiếm", title: "Tìm nhanh màn hình, nhân viên, báo cáo (Ctrl+K)", on: { click: quickSearch } }, ["🔍 Tìm kiếm", h("kbd", { text: "Ctrl K" })]));
    if (["nhansu", "nv", "dm", "caidat", "backup", "kyluong"].indexOf(st.tab) < 0) top.appendChild(periodBox());
    if (FILES) top.appendChild(h("button", { class: "topbtn", type: "button", "data-files": "1", title: "Xem / mở các file Excel, báo cáo đã tải", "aria-label": "File đã tải", on: { click: filesDrawer } }, ["📂", h("span", { class: "lbl", text: " File đã tải" })])); // 005B-UI001: chữ ẩn khi hẹp, giữ biểu tượng
    var roleName = (PERM.ROLES[session.vaiTro] || {}).ten || "vai trò không hợp lệ — liên hệ Admin";
    top.appendChild(h("span", { class: "who", text: roleName, title: session.hoTen + " · " + roleName, "data-user": session.tenDangNhap }));
    top.appendChild(h("button", { class: "topbtn icon", type: "button", title: "Đổi mật khẩu của " + session.hoTen, "aria-label": "Đổi mật khẩu", on: { click: function () { changePassword(false); } } }, ["🔑"]));
    top.appendChild(h("button", { class: "topbtn", type: "button", "data-logout": "1", title: "Đăng xuất", "aria-label": "Đăng xuất", on: { click: function () { logout(); } } }, ["⏻", h("span", { class: "lbl", text: " Đăng xuất" })]));
    top.appendChild(h("button", { class: "topbtn icon", type: "button", title: "Đổi giao diện sáng / tối", "aria-label": "Đổi giao diện sáng / tối", on: { click: toggleTheme } }, [curTheme() === "dark" ? "🏖" : "🌙"]));
    var m = $("#main"); m.innerHTML = ""; refreshNVList();
    if((db._yearArchives||[]).some(function(r){return r.active&&r.year===Number(st.nam);})&&st.tab!=="backup")m.appendChild(h("div",{class:"warn","data-archived-year-notice":"1"},[document.createTextNode("Hồ sơ năm "+st.nam+" đã nằm trong kho riêng. Dữ liệu năm này không được tải vào vùng đang làm. "),btn("Mở kho hồ sơ năm","",function(){st.tab="backup";saveUi();render();})]));
    if (st.tab === "home") m.appendChild(tabHome());
    else if (st.tab === "luong") m.appendChild(tabLuong());
    else if (st.tab === "bangtinh") m.appendChild(tabBangTinhNoiBo());
    else if (PAY_SCREENS[st.tab]) m.appendChild(tabPayReport(PAY_SCREENS[st.tab]));
    else if (OPS_SCREENS[st.tab]) m.appendChild(tabOpsReport(OPS_SCREENS[st.tab]));
    else if (st.tab === "slips") m.appendChild(tabSlips());
    else if (st.tab === "ocr") m.appendChild(tabOCR());
    else if (st.tab === "ocrlib") m.appendChild(tabOcrLib());
    else if (st.tab === "backup") m.appendChild(tabSaoLuu());
    else if (st.tab === "dm") m.appendChild(tabDanhMuc());
    else if (st.tab === "caidat") m.appendChild(tabCaiDat());
    else if (st.tab === "ktbl") m.appendChild(tabKiemTra());
    else if (st.tab === "nvns") m.appendChild(tabNghiepVuNS());
    else if (st.tab === "capphat") m.appendChild(tabCapPhat());
    else if (st.tab === "nhansu") m.appendChild(tabNhanSu());
    else if (st.tab === "nv") m.appendChild(tabNhanVien());
    else if (st.tab === "baocao") m.appendChild(tabBaoCao());
    else if (st.tab === "kyluong") m.appendChild(tabKyLuong());
    else if (st.tab === "baocaoluong") m.appendChild(tabBaoCaoLuong());
    else if (st.tab === "doichieu") m.appendChild(tabDoiChieu());
    else if (st.tab === "huongdan") m.appendChild(tabHuongDan());
    else if (S[st.tab]) m.appendChild(grid(st.tab, S[st.tab]));
    else { st.tab = "home"; render(); }
    if (st.hdModal) { if (st.tab === "nv" && !$("#modal").classList.contains("hide") && !$("#modal").classList.contains("drawer") && $("#modal").innerHTML) hdReopen(); else if (st.tab !== "nv") st.hdModal = null; }
  }
