  // ---------- Thư viện mẫu OCR (V7): xem / duyệt / từ chối / đổi nhãn / khôi phục — KHÔNG có thao tác xóa mẫu ----------
  var OLS = { tab: "so", loaded: false, loading: false, samples: [], edits: [], stats: null, confusions: [], page: 0, q: "", err: "", urls: {} };
  var OL_TABS = [["so", "Số"], ["kyhieu", "Ký hiệu"], ["chu", "Chữ viết tay"], ["bocuc", "Bố cục"], ["cho", "Chờ xác nhận"], ["nham", "Dễ nhầm"], ["xuly", "Cần xử lý"], ["lichsu", "Lịch sử sửa"], ["thongke", "Thống kê"]];
  var OL_ST = { PENDING_APPROVAL: "Chờ xác nhận", VERIFIED: "Đã xác nhận", SUPERSEDED: "Đã bị thay thế", REJECTED: "Bị từ chối", CONFLICT: "Xung đột" };
  function olLoad(force) {
    if (!window.hakOcrLib || OLS.loading || (OLS.loaded && !force)) return;
    OLS.loading = true;
    Promise.all([window.hakOcrLib.list({}), window.hakOcrLib.edits(), window.hakOcrLib.layouts ? window.hakOcrLib.layouts() : Promise.resolve({ ok: true, layouts: [] })]).then(function (r) {
      OLS.loading = false; OLS.loaded = true; OLS.err = r[0] && r[0].ok ? "" : (r[0] && r[0].error || "không đọc được thư viện");
      if (r[0] && r[0].ok) { OLS.samples = r[0].samples; OLS.stats = r[0].stats; OLS.confusions = r[0].confusions; }
      if (r[1] && r[1].ok) OLS.edits = r[1].edits; OLS.layouts = r[2] && r[2].ok ? r[2].layouts : [];
      if (st.tab === "ocrlib") render();
    }, function (e) { OLS.loading = false; OLS.err = String(e && e.message || e); if (st.tab === "ocrlib") render(); });
  }
  function olThumb(sha) {
    var im = h("img", { class: "olthumb", alt: "ảnh ô mẫu", style: "height:44px;max-width:90px;image-rendering:pixelated;background:#fff;border:1px solid var(--bd,#ccc)" });
    if (OLS.urls[sha]) { im.src = OLS.urls[sha]; return im; }
    window.hakOcrLib.image(sha).then(function (r) { if (r && r.ok && r.data) { OLS.urls[sha] = URL.createObjectURL(new Blob([r.data], { type: "image/png" })); im.src = OLS.urls[sha]; } });
    return im;
  }
  function olAct(fn, msg) { return function () { if (!need("ocr.library", "quản lý thư viện mẫu OCR")) return; fn().then(function (r) { if (r && r.ok) { audit("Thư viện mẫu OCR", msg); OLS.loaded = false; olLoad(true); } else toast("⚠ " + ((r && r.error) || "không thực hiện được")); }); }; }
  // @screen tabOcrLib
  function olPager(c, n) { if (n <= 50) return; c.appendChild(h("div", { class: "bar" }, [btn("‹ Trước", "ghost", function () { if (OLS.page > 0) { OLS.page--; render(); } }), h("span", { class: "hint", text: "Trang " + (OLS.page + 1) + "/" + Math.ceil(n / 50) }), btn("Sau ›", "ghost", function () { if ((OLS.page + 1) * 50 < n) { OLS.page++; render(); } })])); }

  // @screen tabOCR

