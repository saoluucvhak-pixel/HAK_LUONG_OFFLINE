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
    ["grp", "Cài đặt"], ["appearance", "🏖", "Giao diện"], ["access", "🔑", "Chế độ đăng nhập"], ["caidat", "🛠", "Công thức & phương pháp"], ["backup", "⚙", "Công ty & Sao lưu"], ["huongdan", "📖", "Hướng dẫn & Quy chế"]
  ];
  // Tab nào cần quyền xem nào (kiểm tra cả khi mở bằng trạng thái đã lưu, không chỉ ẩn menu)
  var TAB_PERM = { ocr: "input.edit", ocrlib: "input.view", luong: "payroll.view", bangtinh: "payroll.view", slips: "payroll.view", rp_tonghop: "payroll.view", rp_pb: "payroll.view", rp_tncn: "payroll.view", rp_ctnv: "payroll.view", rp_cttt: "payroll.view", rp_soct: "payroll.view", rp_thanhtoan: "payroll.view", rp_ck: "payroll.view", rp_tm: "payroll.view", kyluong: "payroll.view", baocaoluong: "payroll.view", doichieu: "payroll.view", nhansu: "hr.view", nv: "hr.view", baocao: "report.view", nvns: "hr.view", capphat: "hr.view", caidat: "payroll.view", ktbl: "payroll.view" };
  Object.keys(OPS_SCREENS).forEach(function (k) { TAB_PERM[k] = OPS.TYPES[OPS_SCREENS[k]].perm; });
  // @screen tabAllowed
  var TITLES = { access: "Chế độ đăng nhập", appearance: "Giao diện", nvns: "Nghiệp vụ nhân sự", capphat: "Cấp phát sữa phúc lợi và bảo hộ lao động", ktbl: "Kiểm tra bảng lương", caidat: "Cài đặt — Công thức & phương pháp tính lương", ocr: "Đọc ảnh bảng chấm công / chấm cơm (OCR)", ocrlib: "OCR & Chứng từ — Thư viện mẫu", home: "Tổng quan", luong: "Tính lương", bangtinh: "Bảng tính lương", rp_tonghop: "Bảng tổng hợp lương", rp_pb: "Bảng tổng hợp lương theo phòng ban", rp_tncn: "Báo cáo khấu trừ thuế TNCN", rp_ctnv: "Bảng tổng hợp chi tiết lương toàn bộ nhân viên", rp_thanhtoan: "Bảng thanh toán lương", rp_cttt: "Chi tiết thanh toán", rp_soct: "Sổ chứng từ thanh toán", rp_ck: "Bảng kê chuyển khoản", rp_tm: "Bảng thanh toán lương tiền mặt", slips: "Phiếu lương chi tiết", dm: "Danh mục", backup: "Công ty & Sao lưu", nhansu: "Nhân sự", nv: "Hồ sơ nhân viên", baocao: "Báo cáo nhân sự", rp_ns: "Danh sách nhân sự", rp_sl: "Bảng kê phiếu cân sản lượng", rp_bd: "Bảng kê Ban dăm xuất hàng", rp_th: "Bảng kê thưởng / trừ", rp_tu: "Bảng kê tạm ứng lương", rp_com: "Tổng hợp suất cơm", kyluong: "Kỳ lương đã chốt", baocaoluong: "Báo cáo lương", doichieu: "Đối chiếu lương Power Query", huongdan: "Hướng dẫn & Quy chế lương" };
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
    f.appendChild(h("button", { class: "themebtn", type: "button", "data-appearance-toggle": "label", text: modeToggleText(false), on: { click: toggleTheme } }));
    f.appendChild(appearanceSelect({ class: "themebtn hak-skin-select", "aria-label": "Chọn phong cách giao diện" }));
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
    var folderChanged = function () {
      STG.data = null;
      STG.info = null;
      STG.ver = null;
      if (st.tab === "backup") render();
      draw();
    };
    closeFn = modal("📂 File đã tải", body, function (close) {
      return [btn("📂 Mở thư mục", "pri", function () { if (!FILES.openDir()) toast("Không mở được thư mục"); }),
        btn("Đổi thư mục lưu…", "", function () { var r = FILES.chooseDir(); if (r && r.ok) { toast("Từ giờ file lưu vào: " + r.dir); audit("Đổi thư mục lưu file xuất", ""); folderChanged(); } else if (r && r.error) toast(r.error); }),
        btn("Dùng thư mục mặc định", "ghost", function () { var r = FILES.resetDir(); if (r && r.ok) { toast("Dùng thư mục mặc định: " + r.dir); folderChanged(); } else if (r && r.error) toast(r.error); }),
        btn("Đóng", "", close)];
    }, { drawer: true });
    return closeFn;
  }
  /** V9: quyền do TIẾN TRÌNH CHÍNH quyết định. Giao diện chỉ hỏi lại; nếu main đã thu hồi/hết hạn phiên → đăng xuất. */
  var sessChecked = 0;
  function syncSession() {
    if (!store || !store.authState || loadError) return;
    if (C.accessMode.mode(db) === "direct" && !session) {
      var local = store.authState();
      if (local && local.ok && local.user === C.accessMode.LOCAL_USER.tenDangNhap) session = C.accessMode.LOCAL_USER;
    }
    if (!session) return;
    var t = Date.now(); if (t - sessChecked < 2000) return; sessChecked = t;
    try { var r = store.authState(); if (r && !r.ok) { session = null; toast("Phiên đăng nhập đã hết hiệu lực hoặc quyền đã bị thu hồi — đăng nhập lại"); } } catch (e) { /* lần vẽ sau thử lại */ }
  }
  // 005B-UI004 (issue #97): bảng chính là khối cuối của trang mà vẫn tràn khỏi màn → khung trang và bảng cùng cuộn (2 thanh cuộn lồng).
  // Sau mỗi lần vẽ / đổi cỡ cửa sổ: thu chiều cao tối đa của bảng đúng bằng phần tràn để chỉ còn thanh cuộn của bảng. Chỉ đổi kích thước hiển thị.
  function fitMainTable() {
    var m = $("#main"); if (!m) return;
    var tws = [].slice.call(m.querySelectorAll(".tw")).filter(function (e) { return e.offsetParent !== null && /(auto|scroll)/.test(window.getComputedStyle(e).overflowY); });
    tws.forEach(function (e) { if (e.dataset.fitH) { e.style.maxHeight = ""; delete e.dataset.fitH; } });
    var tw = tws.sort(function (a, b) { return b.clientHeight - a.clientHeight; })[0]; if (!tw || tw.scrollHeight <= tw.clientHeight + 2) return;
    var over = m.scrollHeight - m.clientHeight; if (over <= 2) return;
    var mb = m.getBoundingClientRect(), below = mb.top + m.scrollHeight - m.scrollTop - tw.getBoundingClientRect().bottom - parseFloat(window.getComputedStyle(m).paddingBottom || 0);
    if (below >= 40) return; // trang nhiều phần (báo cáo): khung trang cuộn là đúng
    var target = tw.clientHeight - over; if (target < 200) return;
    tw.style.maxHeight = target + "px"; tw.dataset.fitH = "1";
  }
  var fitQueued = false;
  function scheduleFit() { if (fitQueued || typeof window.requestAnimationFrame !== "function") return; fitQueued = true; window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { fitQueued = false; try { fitMainTable(); } catch (e) { /* chỉ là bố cục */ } }); }); }
  if (typeof window !== "undefined" && window.addEventListener) window.addEventListener("resize", scheduleFit);
  function render() {
    if(st.tab !== "backup" && window.hakYears) window.hakYears.release().catch(function(){});
    if (window.HAKUI && window.HAKUI.filter) window.HAKUI.filter.close();
    syncSession();
    scheduleFit();
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
  // ---------- v2.1.1: khung màn hình báo cáo đã dựng được nhớ theo dbRev + chữ ký kho + dấu vân tay trạng thái hiển thị ----------
  // CHỈ các tab báo cáo ĐỌC-CHỈ, và CHỈ khi đổi tab bằng thanh điều hướng. Mọi lần vẽ lại do thao tác TRONG màn hình (lọc, đổi kỳ, nút…) luôn dựng mới
  // (như trước) và ghi đè bản nhớ. Dữ liệu đổi / kho đổi từ nơi khác / đăng nhập-đăng xuất → xóa sạch. Tắt hẳn: localStorage "hak_snapshot_off" = "1".
  var navSwitch = false, renderFromNav = false; // navSwitch: do nút điều hướng / báo cáo con đặt, render() lấy rồi xóa → chỉ đúng lần vẽ đó mới được dùng bản nhớ
  // ---------- v2.1.3: đổi tab bằng thanh điều hướng KHÔNG dựng lại cả khung ứng dụng (thanh điều hướng, thanh trên, chân bên) khi chúng không đổi ----------
  // Khung chỉ cập nhật tại chỗ (tô tab đang chọn + tiêu đề) nếu MỌI thứ ảnh hưởng tới khung đều giữ nguyên: người dùng/vai trò/quyền hiển thị tab, kỳ, giao diện,
  // dbRev (số đếm trên menu), nhóm menu thu gọn, và việc có ô "Kỳ lương" hay không. Khác một thứ là dựng lại đủ như trước. Tắt: localStorage "hak_shell_off" = "1".
  var shellState = null, NO_PERIOD_TABS = ["access", "appearance", "nhansu", "nv", "dm", "caidat", "backup", "kyluong"];
  function needPeriodBox() { return NO_PERIOD_TABS.indexOf(st.tab) < 0; }
  function collapsedRaw() { try { return localStorage.getItem(KEY + "_nav_collapsed") || ""; } catch (e) { return "?" + Date.now(); } }
  function shellSig() {
    var allowed = NAV.filter(function (n) { return n[0] !== "grp" && tabAllowed(n[0]); }).map(function (n) { return n[0]; }).join(",");
    return [session.tenDangNhap, session.vaiTro, session.hoTen, readOnly ? 1 : 0, curSkin(), curTheme(), dbRev, st.nam, st.thang, congTy()["Tên công ty"] || "", FILES ? 1 : 0, store ? 1 : 0, collapsedRaw(), allowed].join("|");
  }
  function shellOff() { try { return localStorage.getItem("hak_shell_off") === "1"; } catch (e) { return false; } }
  function canFastShell() {
    if (!renderFromNav || !shellState || shellOff() || loadError || !session) return false;
    if (/true/.test(collapsedRaw())) return false; // có nhóm thu gọn: mục hiện/ẩn theo tab đang chọn → dựng lại như trước
    if (needPeriodBox() !== shellState.period || shellState.sig !== shellSig()) return false;
    var nv = $("#nav"), tp = $("#top"); return !!(nv && nv.firstChild && tp && tp.querySelector("h2") && tp.querySelector(".who"));
  }
  function topTitleEl() {
    var title = TITLES[st.tab] || (S[st.tab] && S[st.tab].ten) || "";
    return h("h2", { title: title, text: ["bangtinh", "rp_tonghop", "rp_pb", "rp_tncn", "rp_ctnv", "rp_thanhtoan", "rp_cttt", "rp_soct", "rp_ck", "rp_tm", "slips", "baocaoluong", "rp_ns", "rp_sl", "rp_bd", "rp_th", "rp_tu", "rp_com"].indexOf(st.tab) >= 0 ? String(title).toLocaleUpperCase("vi-VN") : title });
  }
  function fastShellUpdate() {
    var activeNav = st.tab === "slips" && st.kqFull ? "luong" : (st.tab === "nv" ? "nhansu" : st.tab);
    [].forEach.call($("#nav").querySelectorAll("button[data-k]"), function (b) { b.classList.toggle("on", b.getAttribute("data-k") === activeNav); });
    var top = $("#top"), old = top.querySelector("h2"); top.replaceChild(topTitleEl(), old);
  }
  var SNAP_TABS = { baocao: 1, baocaoluong: 1, rp_tonghop: 1, rp_pb: 1, rp_tncn: 1, rp_ctnv: 1, rp_thanhtoan: 1, rp_cttt: 1, rp_soct: 1, rp_ck: 1, rp_tm: 1, rp_ns: 1, rp_sl: 1, rp_bd: 1, rp_th: 1, rp_tu: 1, rp_com: 1 };
  var screenCache = SC ? SC.create({ maxEntries: 6 }) : null;
  var SNAP_SKIP = { tab: 0, kqVirtual: 1, authView: 1 };
  // Chế độ tự đối chiếu (chẩn đoán/kiểm thử): mỗi lần trúng bản chụp, dựng thêm một bản mới và so HTML; lệch → báo + dùng bản mới.
  // Chữ ký NỘI DUNG của một khung để so sánh: bỏ biểu tượng (khung đã nhớ đã được workspace đổi emoji → SVG, khung mới chưa) và MỌI khoảng trắng (khoảng trắng giữa nút đổi theo biểu tượng);
  // mỗi bảng chỉ lấy tiêu đề + 25 dòng đầu + dòng tổng (bảng ảo hóa dựng cửa sổ khác nhau tùy chiều cao khung lúc đo).
  var SNAP_ICON = /[\u2190-\u2BFF\uFE0F\u200D]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g;
  function snapSig(el) {
    var norm = function (t) { return String(t || "").replace(SNAP_ICON, "").replace(/\s+/g, ""); }, c = el.cloneNode(true);
    [].forEach.call(c.querySelectorAll("tbody"), function (tb) { tb.remove(); });
    var parts = [norm(c.textContent)];
    [].forEach.call(el.querySelectorAll("table"), function (t) {
      var rows = [].filter.call(t.querySelectorAll("tbody tr"), function (r) { return !r.classList.contains("vt-pad"); }), sum = t.querySelector("tbody tr.tr-sum:last-child, tbody tr.tr-sum:last-of-type");
      parts.push(norm(rows.slice(0, 25).map(function (r) { return r.textContent; }).join("|")) + "#" + (sum ? norm(sum.textContent) : ""));
    });
    return parts.join("\u2063");
  }
  // Chế độ tự đối chiếu (chẩn đoán/kiểm thử): mỗi lần trúng bản chụp, dựng thêm một bản mới và so chữ ký nội dung; lệch → báo + dùng bản mới.
  if (screenCache && window) window.__hakSnapshotVerify = function (on) {
    screenCache.setVerify(on ? { compare: function (a, b) { return snapSig(a) === snapSig(b); }, onMismatch: function (k, x, y) { var ha = snapSig(x), hb = snapSig(y), i = 0; while (i < ha.length && ha[i] === hb[i]) i++; window.__hakSnapshotMismatch = (window.__hakSnapshotMismatch || []).concat([String(k).slice(0, 24) + " @" + i + " | nhớ: …" + ha.slice(Math.max(0, i - 40), i + 80) + " | mới: …" + hb.slice(Math.max(0, i - 40), i + 80)]); } } : null);
    window.__hakSnapshotMismatch = [];
  };
  function snapOff() { try { return localStorage.getItem("hak_snapshot_off") === "1"; } catch (e) { return false; } }
  function screenSnap(build) {
    if (!screenCache || !SNAP_TABS[st.tab] || snapOff() || loadError || !session) return build();
    var fromNav = renderFromNav;
    var fpOf = function () { return [st.tab, session.tenDangNhap, session.vaiTro, readOnly ? 1 : 0, new Date().toISOString().slice(0, 10), SC.fingerprint(st, SNAP_SKIP)].join("|"); };
    var fp = fpOf(), rev = dbRev + "|" + storeSig();
    var r = screenCache.get(fp, rev, build, { useCache: fromNav });
    // Màn hình có thể điền giá trị mặc định vào st khi dựng → lần quay lại, trạng thái là bản SAU khi dựng: lưu cả dưới dấu vân tay đó
    if (!r.hit) { var fp2 = fpOf(); if (fp2 !== fp && dbRev + "|" + storeSig() === rev) screenCache.set(fp2, rev, r.value); }
    window.__hakSnapshot = { tab: st.tab, hit: r.hit, mismatch: !!r.mismatch, ms: Math.round(r.ms * 10) / 10 };
    return r.value;
  }
  function renderInner() {
    renderFromNav = navSwitch; navSwitch = false;
    applySkin(curSkin()); applyTheme(curTheme());
    if (loadError) { shellState = null; $("#nav").innerHTML = ""; $("#top").innerHTML = "<h2>Khôi phục dữ liệu</h2>"; var mm = $("#main"); mm.innerHTML = ""; mm.appendChild(recoveryScreen()); return; }
    if (!session) {
      shellState = null;
      // Chưa đăng nhập: không hiện menu, không hiện dữ liệu nào
      $("#nav").innerHTML = ""; var t0 = $("#top"); t0.innerHTML = ""; t0.appendChild(h("h2", { text: C.accessMode.mode(db) === "setup" ? "Thiết lập ban đầu" : "Đăng nhập" }));
      var m0 = $("#main"); m0.innerHTML = "";
      m0.appendChild(C.accessMode.mode(db) === "setup" ? setupAdminScreen() : st.authView === "recover" ? recoverAdminScreen() : loginScreen());
      sideFoot(""); return;
    }
    if (!readOnly && can("input.edit")) C.inputReview.initialize(db);
    if (!tabAllowed(st.tab)) st.tab = "home";
    var fastShell = canFastShell();
    window.__hakShell = fastShell ? "tai-cho" : "dung-lai"; // chẩn đoán/kiểm thử: lần vẽ khung này cập nhật tại chỗ hay dựng lại
    if (fastShell) fastShellUpdate();
    else {
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
      var b = h("button", { class: activeNav === n[0] ? "on" : "", "data-k": n[0], on: { click: function () {
        if (!leaveOk()) return;
        if (st.kqFull) { st.kq = st.kqFull; st.kqFull = null; }
        var mModal = $("#modal");
        if (mModal && !mModal.classList.contains("hide") && !mModal.classList.contains("drawer")) {
          mModal.className = "hide";
          mModal.innerHTML = "";
        }
        st.tab = n[0];
        saveUi();
        navSwitch = true; // chỉ khi QUAY LẠI một tab bằng thanh điều hướng mới dùng khung đã chụp (xem screenSnap)
        render();
      } } }, [h("span", { class: "ic", text: n[1] }), h("span", { text: n[2] })]);
      if (S[n[0]]) b.appendChild(h("span", { class: "n", text: countOf(n[0]) }));
      if (n[0] === "kyluong") b.appendChild(h("span", { class: "n", text: db.kyluong.length }));
      if (n[0] === "nhansu") b.appendChild(h("span", { class: "n", text: db.nhanvien.filter(function (r) { return r["Trạng thái"] !== "Đã nghỉ việc"; }).length }));
      nav.appendChild(b);
    });
    sideFoot(store ? "Tự lưu ra file trên máy" : "Dữ liệu lưu trong trình duyệt");
    var bb = $(".brand small"); if (bb) bb.textContent = congTy()["Tên công ty"] || "Chạy offline";
    var top = $("#top"); top.innerHTML = "";
    top.appendChild(topTitleEl());
    top.appendChild(h("button", { class: "topbtn srch", type: "button", "aria-label": "Tìm kiếm", title: "Tìm nhanh màn hình, nhân viên, báo cáo (Ctrl+K)", on: { click: quickSearch } }, ["🔍 Tìm kiếm", h("kbd", { text: "Ctrl K" })]));
    if (needPeriodBox()) top.appendChild(periodBox());
    if (FILES) top.appendChild(h("button", { class: "topbtn", type: "button", "data-files": "1", title: "Xem / mở các file Excel, báo cáo đã tải", "aria-label": "File đã tải", on: { click: filesDrawer } }, ["📂", h("span", { class: "lbl", text: " File đã tải" })])); // 005B-UI001: chữ ẩn khi hẹp, giữ biểu tượng
    var direct = C.accessMode.mode(db) === "direct";
    var roleName = direct ? "Một người sử dụng" : (PERM.ROLES[session.vaiTro] || {}).ten || "vai trò không hợp lệ — liên hệ Admin";
    top.appendChild(h("span", { class: "who", text: roleName, title: session.hoTen + " · " + roleName, "data-user": session.tenDangNhap }));
    if (!direct) top.appendChild(h("button", { class: "topbtn icon", type: "button", title: "Đổi mật khẩu của " + session.hoTen, "aria-label": "Đổi mật khẩu", on: { click: function () { changePassword(false); } } }, ["🔑"]));
    if (!direct) top.appendChild(h("button", { class: "topbtn", type: "button", "data-logout": "1", title: "Đăng xuất", "aria-label": "Đăng xuất", on: { click: function () { logout(); } } }, ["⏻", h("span", { class: "lbl", text: " Đăng xuất" })]));
    top.appendChild(h("button", { class: "topbtn icon", type: "button", title: "Đổi giao diện sáng / tối", "aria-label": "Đổi giao diện sáng / tối", "data-appearance-toggle": "icon", text: modeToggleText(true), on: { click: toggleTheme } }));
    shellState = { sig: shellSig(), period: needPeriodBox() };
    } // hết nhánh dựng lại cả khung
    var m = $("#main"); m.innerHTML = ""; refreshNVList();
    if((db._yearArchives||[]).some(function(r){return r.active&&r.year===Number(st.nam);})&&st.tab!=="backup")m.appendChild(h("div",{class:"warn","data-archived-year-notice":"1"},[document.createTextNode("Hồ sơ năm "+st.nam+" đã nằm trong kho riêng. Dữ liệu năm này không được tải vào vùng đang làm. "),btn("Mở kho hồ sơ năm","",function(){st.tab="backup";saveUi();render();})]));
    { var SH = window.HAKUi && window.HAKUi.screenHints, sht = SH ? SH.text(st.tab) : ""; if (sht) m.appendChild(h("div", { class: "hint screen-hint", "data-screen-hint": st.tab, text: sht })); } // Q11: bước của quy trình lương
    if (st.tab === "home") m.appendChild(tabHome());
    else if (st.tab === "luong") m.appendChild(tabLuong());
    else if (st.tab === "bangtinh") m.appendChild(tabBangTinhNoiBo());
    else if (PAY_SCREENS[st.tab]) m.appendChild(screenSnap(function () { return tabPayReport(PAY_SCREENS[st.tab]); }));
    else if (OPS_SCREENS[st.tab]) m.appendChild(screenSnap(function () { return tabOpsReport(OPS_SCREENS[st.tab]); }));
    else if (st.tab === "slips") m.appendChild(tabSlips());
    else if (st.tab === "ocr") m.appendChild(tabOCR());
    else if (st.tab === "ocrlib") m.appendChild(tabOcrLib());
    else if (st.tab === "backup") m.appendChild(tabSaoLuu());
    else if (st.tab === "dm") m.appendChild(tabDanhMuc());
    else if (st.tab === "caidat") m.appendChild(tabCaiDat());
    else if (st.tab === "access") m.appendChild(tabAccessMode());
    else if (st.tab === "appearance") m.appendChild(tabGiaoDien());
    else if (st.tab === "ktbl") m.appendChild(tabKiemTra());
    else if (st.tab === "nvns") m.appendChild(tabNghiepVuNS());
    else if (st.tab === "capphat") m.appendChild(tabCapPhat());
    else if (st.tab === "nhansu") m.appendChild(tabNhanSu());
    else if (st.tab === "nv") m.appendChild(tabNhanVien());
    else if (st.tab === "baocao") m.appendChild(screenSnap(tabBaoCao));
    else if (st.tab === "kyluong") m.appendChild(tabKyLuong());
    else if (st.tab === "baocaoluong") m.appendChild(screenSnap(tabBaoCaoLuong));
    else if (st.tab === "doichieu") m.appendChild(tabDoiChieu());
    else if (st.tab === "huongdan") m.appendChild(tabHuongDan());
    else if (S[st.tab]) m.appendChild(grid(st.tab, S[st.tab]));
    else { st.tab = "home"; render(); }
    if (st.hdModal) { if (st.tab === "nv" && !$("#modal").classList.contains("hide") && !$("#modal").classList.contains("drawer") && $("#modal").innerHTML) hdReopen(); else if (st.tab !== "nv") st.hdModal = null; }
  }
