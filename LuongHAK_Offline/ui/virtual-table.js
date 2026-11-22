// ===== UI / HAK VIRTUAL TABLE (V11.3, v2.0.98) — bảng ảo hóa: chỉ dựng các dòng đang nhìn thấy =====
// Mục tiêu: bảng 1.000+ dòng không dựng 1.000 × số cột ô DOM (RAM, thời gian vẽ, cuộn giật).
// Giữ nguyên <table> thật: <thead> sticky, cột đầu sticky (class "stk"), <tfoot> do màn hình tự dựng.
// Dòng ngoài tầm nhìn được thay bằng 2 dòng đệm (chiều cao tổng) nên thanh cuộn đúng như bảng đầy đủ.
// KHÔNG đụng dữ liệu/công thức: màn hình đưa vào mảng dòng đã tính + hàm dựng <tr>; module chỉ quyết định dòng nào được dựng.
// Dưới ngưỡng minRows hoặc khi In (beforeprint) → dựng đủ mọi dòng, nên bản in và bảng nhỏ y như cũ.
// Không phụ thuộc gì khác; chạy offline; có thể nạp bằng <script> hoặc require() (để test).
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  var ui = root.HAKUI = root.HAKUI || {};
  ui.virtualTable = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  var DEFAULTS = { minRows: 150, overscan: 14, rowHeight: 28 };

  /** Phần thuần (kiểm bằng test đơn vị): dòng nào cần dựng khi cuộn tới scrollTop trong khung cao viewH.
   *  Trả { start, end, padTop, padBottom } — dòng [start, end) được dựng; padTop/padBottom là chiều cao (px) phần đệm. */
  function windowRange(total, scrollTop, viewH, rowH, overscan) {
    total = Math.max(0, total | 0);
    rowH = rowH > 0 ? rowH : DEFAULTS.rowHeight;
    overscan = overscan >= 0 ? overscan | 0 : DEFAULTS.overscan;
    if (!total) return { start: 0, end: 0, padTop: 0, padBottom: 0 };
    scrollTop = isFinite(scrollTop) ? scrollTop : 0; viewH = isFinite(viewH) ? viewH : 0;
    var first = Math.floor(Math.max(0, scrollTop) / rowH);
    var visible = Math.ceil(Math.max(0, viewH) / rowH) + 1;
    var start = Math.max(0, Math.min(first - overscan, total - 1));
    var end = Math.min(total, first + visible + overscan);
    if (end <= start) end = Math.min(total, start + 1);
    return { start: start, end: end, padTop: start * rowH, padBottom: (total - end) * rowH };
  }

  // Registry In dùng chung: MỘT cặp beforeprint/afterprint cho mọi bảng; giữ bảng bằng WeakRef nên bảng đã bỏ (bị thay khi vẽ lại) được thu gom,
  // không rò rỉ lắng nghe. Bảng đang nằm trong bộ nhớ đệm màn hình (không gắn vào trang) bị bỏ qua khi In; gắn lại thì tự đúng.
  var reg = new Set(), hooked = new WeakSet();
  function register(win, handlers) {
    var ref = typeof WeakRef === "function" ? new WeakRef(handlers) : { deref: function () { return handlers; } };
    handlers._ref = ref; reg.add(ref);
    if (reg.size > 200) reg.forEach(function (r) { if (!r.deref()) reg.delete(r); });
    if (win.addEventListener && !hooked.has(win)) {
      hooked.add(win);
      win.addEventListener("beforeprint", function () { reg.forEach(function (r) { var x = r.deref(); if (!x) reg.delete(r); else x.before(); }); });
      win.addEventListener("afterprint", function () { reg.forEach(function (r) { var x = r.deref(); if (x) x.after(); }); });
    }
  }
  function unregister(handlers) { if (handlers._ref) reg.delete(handlers._ref); }

  /** Gắn bảng ảo hóa.
   *  opts: { scroller (div.tw cuộn), tbody, rows (mảng), renderRow(row, index) → <tr>, cols (số cột, cho dòng đệm), tail? (mảng <tr> cố định cuối bảng, VD dòng TỔNG),
   *          rowHeight?, overscan?, minRows? }
   *  Trả { refresh(), destroy(), renderAll(), stats() }. stats().rendered = số <tr> dữ liệu đang có trong DOM. */
  function attach(opts) {
    var scroller = opts.scroller, tbody = opts.tbody, rows = opts.rows || [];
    var doc = tbody.ownerDocument, overscan = opts.overscan >= 0 ? opts.overscan : DEFAULTS.overscan;
    var minRows = opts.minRows >= 0 ? opts.minRows : DEFAULTS.minRows;
    var rowH = opts.rowHeight > 0 ? opts.rowHeight : DEFAULTS.rowHeight;
    var handlers = null, tails = opts.tail || [], cols = opts.cols || 1, measured = false, all = false, rendered = 0, raf = 0, last = null;
    var win = scroller.ownerDocument.defaultView || {};

    function spacer(kind) {
      var tr = doc.createElement("tr"), td = doc.createElement("td");
      tr.className = "vt-pad"; tr.setAttribute("aria-hidden", "true"); tr.setAttribute("data-vt-pad", kind);
      td.colSpan = cols; td.style.cssText = "padding:0;border:0;height:0"; tr.appendChild(td);
      return tr;
    }
    var top = spacer("top"), bottom = spacer("bottom");

    // Cập nhật tăng dần: giữ các <tr> đã có trong cửa sổ mới, chỉ bỏ dòng rơi ra ngoài và dựng dòng mới ở hai đầu (cuộn mượt, ít việc mỗi khung).
    function draw(from, to) {
      var ok = last && !last.full && from < last.end && to > last.start; // cửa sổ mới chồng lên cũ → dùng lại
      if (!ok) {
        var frag = doc.createDocumentFragment();
        for (var i = from; i < to; i++) frag.appendChild(opts.renderRow(rows[i], i));
        tbody.textContent = ""; tbody.appendChild(top); tbody.appendChild(frag); tbody.appendChild(bottom); tails.forEach(function (tr) { tbody.appendChild(tr); });
      } else {
        var k;
        for (k = last.start; k < Math.min(from, last.end); k++) tbody.removeChild(top.nextSibling);
        for (k = last.end - 1; k >= to && k >= from; k--) tbody.removeChild(bottom.previousSibling);
        var head = doc.createDocumentFragment();
        for (k = from; k < Math.min(last.start, to); k++) head.appendChild(opts.renderRow(rows[k], k));
        if (head.firstChild) tbody.insertBefore(head, top.nextSibling);
        var tail = doc.createDocumentFragment();
        for (k = Math.max(last.end, from); k < to; k++) tail.appendChild(opts.renderRow(rows[k], k));
        if (tail.firstChild) tbody.insertBefore(tail, bottom);
      }
      top.firstChild.style.height = (from * rowH) + "px";
      bottom.firstChild.style.height = ((rows.length - to) * rowH) + "px";
      rendered = to - from; last = { start: from, end: to };
    }
    function renderAll() {
      all = true; tbody.textContent = "";
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < rows.length; i++) frag.appendChild(opts.renderRow(rows[i], i));
      tbody.appendChild(frag); tails.forEach(function (tr) { tbody.appendChild(tr); }); rendered = rows.length; last = { start: 0, end: rows.length, full: true };
    }
    function measure() {
      if (measured || !rendered) return;
      var first = tbody.querySelector("tr:not(.vt-pad)");
      var hgt = first && first.getBoundingClientRect ? first.getBoundingClientRect().height : 0;
      if (hgt > 4) { measured = true; if (Math.abs(hgt - rowH) > 0.5) { rowH = hgt; refresh(true); } }
    }
    function refresh(force) {
      if (all) return;
      var r = windowRange(rows.length, scroller.scrollTop, scroller.clientHeight || 600, rowH, overscan);
      // Trễ (hysteresis): vùng đang có trong DOM còn phủ vùng nhìn thấy (+2 dòng) thì KHÔNG dựng lại → cuộn chậm không tốn khung hình.
      if (!force && last) {
        var vs = Math.floor(Math.max(0, scroller.scrollTop) / rowH), ve = Math.ceil((Math.max(0, scroller.scrollTop) + (scroller.clientHeight || 600)) / rowH);
        if (last.start <= Math.max(0, vs - 2) && last.end >= Math.min(rows.length, ve + 2)) return;
      }
      draw(r.start, r.end); measure();
    }
    function onScroll() { if (raf) return; raf = (win.requestAnimationFrame ? win.requestAnimationFrame.bind(win) : function (f) { return setTimeout(f, 16); })(function () { raf = 0; refresh(false); }); }
    function onBeforePrint() { if (scroller.isConnected !== false) renderAll(); }
    function onAfterPrint() { if (scroller.isConnected !== false && all && rows.length > minRows) { all = false; refresh(true); } }

    if (rows.length <= minRows) { renderAll(); all = true; }
    else {
      all = false; refresh(true);
      scroller.addEventListener("scroll", onScroll, { passive: true });
      handlers = { before: onBeforePrint, after: onAfterPrint }; scroller.__hakVt = handlers; // giữ mạnh theo phần tử cuộn: bảng còn thì lắng nghe còn, bảng bị bỏ thì thu gom
      register(win, handlers); // bộ lắng nghe In DÙNG CHUNG (xem registry) — không gắn thêm lắng nghe vào cửa sổ cho mỗi bảng
    }
    return {
      refresh: function () { refresh(true); },
      renderAll: renderAll,
      stats: function () { return { total: rows.length, rendered: rendered, virtual: rows.length > minRows && !all, rowHeight: rowH }; },
      destroy: function () {
        scroller.removeEventListener("scroll", onScroll); if (handlers) unregister(handlers);
      }
    };
  }

  return { windowRange: windowRange, attach: attach, DEFAULTS: DEFAULTS };
});
