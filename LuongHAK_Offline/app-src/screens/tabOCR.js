  function tabOCR() {
    var w = h("div");
    if (!window.hakOcr) { w.appendChild(h("div", { class: "card" }, [h("div", { class: "warn", text: "Chỉ có trong bản cài (.exe) — OCR chạy offline trên máy." })])); return w; }
    var card = h("div", { class: "card" }), bar = h("div", { class: "bar" });
    if (window.hakOcr.options) {
      var umiToggle = h("input", { type: "checkbox", "aria-label": "Đọc thêm bằng Umi-OCR" });
      umiToggle.disabled = true;
      window.hakOcr.options().then(function (o) { umiToggle.checked = o.enabled; umiToggle.disabled = !o.available || OCRS.reading || OCRS.busy; });
      umiToggle.addEventListener("change", function () { umiToggle.disabled = true; window.hakOcr.options(umiToggle.checked).then(function (o) { umiToggle.checked = o.enabled; umiToggle.disabled = !o.available; }); });
      bar.appendChild(h("label", { title: "Ý kiến thứ hai cho ô số; chỉ trên máy này. Thiết lập áp dụng trong phiên mở app." }, [umiToggle, document.createTextNode(" Đọc thêm bằng Umi-OCR")]));
    }
    // ⚠ LỖI THẬT ĐÃ PHÁT HIỆN VÀ SỬA: nút này trước đây KHÔNG BAO GIỜ bị khoá khi
    // đang xử lý (OCRS.busy — đọc file thành trang ảnh; OCRS.reading — đang OCR
    // từng trang) — bấm lại trong lúc đó mở thêm 1 luồng đọc file độc lập, rồi gọi
    // readQueue() lần 2 chạy SONG SONG với luồng đầu trên CÙNG các trang (điều
    // kiện lọc "chưa đọc" của readQueue() không phân biệt được 2 luồng), kết quả
    // cuối phụ thuộc luồng nào ghi đè pg.res sau cùng. Khoá nút trong lúc đang xử
    // lý — mở lại ngay khi cả 2 cờ về false (render() đã gọi ở mọi nơi đổi cờ).
    var pickBtn = btn("📂 Chọn ảnh / PDF…", "pri", function () {
      var f = h("input", { type: "file", accept: "image/*,.pdf,application/pdf", multiple: "multiple" });
      f.addEventListener("change", function () {
        var files = Array.prototype.slice.call(f.files || []); if (!files.length) return;
        var big = files.filter(function (x) { return x.size > 40 * 1048576; }); if (big.length) { alert("File quá lớn (> 40 MB): " + big.map(function (x) { return x.name; }).join(", ")); return; }
        OCRS.busy = true; OCRS.stop = false; OCRS.reading = true; render();
        files.reduce(function (p, file) { return p.then(function () { if (OCRS.stop) return; return archiveOriginal(file).then(function (docId) { return fileToPages(file, docId); }).then(function (pgs) { pgs.forEach(function (x) { x.mode = OCRS.mode; OCRS.pages.push(x); }); }); }); }, Promise.resolve())
          .then(function () {
            OCRS.busy = false;
            if (OCRS.stop) { OCRS.pages.forEach(function (x) { if (!x.res && !x.err) x.stopped = true; }); OCRS.reading = false; OCRS.stop = false; render(); toast("Đã dừng — chưa mở hết các file đã chọn; trang chưa đọc bấm Đọc lại khi cần"); return; }
            return readQueue(); // đọc lần lượt các trang mới
          }, function (e) { OCRS.busy = false; OCRS.reading = false; alert("Không mở được file: " + e.message); render(); });
      });
      f.click();
    }, "Ảnh chụp (JPG, PNG) hoặc PDF quét — nhiều file cùng lúc");
    pickBtn.disabled = OCRS.busy || OCRS.reading;
    bar.appendChild(pickBtn);
    bar.appendChild(h("label", { text: "Cách đọc ô " })); bar.appendChild(modeSel(OCRS.mode, "Cách đọc ô cho file mới", function (v) { OCRS.mode = v; }));
    if (OCRS.reading) bar.appendChild(btn(OCRS.stop ? "Đang dừng…" : "■ Dừng đọc", "red", function () { OCRS.stop = true; if (window.hakOcr.cancel) window.hakOcr.cancel(); render(); }, "Dừng sau ô đang đọc; các trang đã đọc xong giữ nguyên, trang chưa đọc bấm Đọc lại sau"));
    if (OCRS.more.length && !OCRS.reading) {
      var left = OCRS.more.reduce(function (n, m) { return n + (m.pdf.numPages - m.next + 1); }, 0);
      bar.appendChild(btn("▶ Đọc tiếp " + Math.min(left, OCR_CHUNK) + " trang (còn " + left + ")", "pri", function () {
        var src = OCRS.more.shift(); OCRS.busy = true; OCRS.stop = false; OCRS.reading = true; render();
        renderPdfPages(src).then(function (pgs) { pgs.forEach(function (x) { x.mode = OCRS.mode; OCRS.pages.push(x); }); OCRS.busy = false; if (OCRS.stop) { OCRS.reading = false; OCRS.stop = false; OCRS.more.unshift(src); render(); return; } return readQueue(); }, function (e) { OCRS.busy = false; OCRS.reading = false; alert("Không dựng được trang: " + e.message); render(); });
      }, "PDF nhiều trang được mở từng lượt " + OCR_CHUNK + " trang để không đầy bộ nhớ — không trang nào bị bỏ"));
    }
    if (OCRS.pages.length) {
      bar.appendChild(btn("⬇ Xuất Excel", "", function () { ocrExport(OCRS.pages); }, "Mỗi trang 1 sheet: tên, nhân viên, ngày 1…31, tổng"));
      bar.appendChild(btn("Xuất phiếu nghiệm thu OCR", "ghost", function () {
        var stamp = Date.now().toString(36), pages = OCRS.pages.filter(function (p) { return p.res && p.lines && p.lines.length; }).map(function (p, pi) {
          var cells = [];
          p.lines.forEach(function (L, li) { p.days.forEach(function (d) {
            var c = L.src.cells && L.src.cells[d], candidate = c && c.handwriting;
            var raw = String(L.orig && L.orig[d] != null ? L.orig[d] : L.vals[d]);
            var entry = { row: "row-" + (li + 1), day: d, expected: null, read: raw, aligned: null,
              needsReview: raw === "?" || ocrNum(raw) > 3 || !!(c && (c.conf < 60 || c.unsure || c.src === "nét")) || !!(candidate && (candidate.offered || candidate.status === "NEEDS_REVIEW" || candidate.status === "UNSUPPORTED")) || !!(c && c.secondOpinion && c.secondOpinion.offered) };
            if (candidate && candidate.status === "CANDIDATE" && (!p.mode || p.mode === "so")) entry.suggestion = candidate.text;
            cells.push(entry);
          }); });
          return { id: stamp + "-page-" + (pi + 1), group: "SET_DOCUMENT_WRITER_GROUP", split: "test", quality: "SET_clear_OR_hard", cells: cells };
        });
        if (!pages.length) { toast("Chưa có trang nào đọc xong"); return; }
        download("ocr-acceptance-private-" + stamp + ".json", "application/json", JSON.stringify({ schema: 1, kind: "unclassified", version: "2.0.0-alpha.39", pages: pages }, null, 2));
        toast("Đã xuất phiếu không chứa tên hoặc ảnh. Người kiểm tra cần điền đáp án, xác nhận người/ngày và phân nhóm tài liệu trước khi đánh giá; giữ file riêng, không đưa lên repo.");
      }, "Xuất kết quả OCR ban đầu theo dòng/ngày, không chứa tên hoặc ảnh; đáp án và bố cục để trống cho người nghiệm thu"));
      bar.appendChild(btn("✔ Đưa vào Chấm công / Suất cơm…", "pri", function () { ocrApply(OCRS.pages); }, "Qua màn hình xem trước như nhập Excel"));
      if (!OCRS.reading) bar.appendChild(btn("Xóa danh sách", "ghost", function () { if (confirm("Xóa các trang đã đọc khỏi màn hình này? (Dữ liệu đã ghi vào Chấm công không bị ảnh hưởng)")) { OCRS.pages = []; OCRS.more = []; OCRS.sel = 0; render(); } }));
    }
    bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("Kiểm tra OCR", "ghost", function () { window.hakOcr.selfTest().then(function (r) {
      var u = r.umi, umiTxt = !u ? "" : u.ok ? "\nUmi-OCR: đang chạy trên máy này — ô số được đọc thêm làm ý kiến thứ hai (" + (u.languages || []).join(", ") + ")" : u.disabled ? "\nUmi-OCR: đã tắt" : "\nUmi-OCR: không thấy (tuỳ chọn — cài và chạy Umi-OCR để có ý kiến thứ hai cho ô số)";
      alert((r.ok ? "OCR hoạt động — đọc thử được \"" + r.text + "\" trong " + r.ms + " ms" : "OCR lỗi: " + r.error) + umiTxt); }); }));
    card.appendChild(bar);
    card.appendChild(h("div", { class: "hint", text: "Đọc được: bảng chấm công / chấm cơm có KẺ Ô — dòng = người, cột = ngày 1…31 (có thể có Tổng công, Tổng cơm, Công / Tăng ca), hoặc dòng = ngày, cột = Công / Cơm (Lịch làm) hay mỗi cột 1 người (bảng tay của tổ, có thể 2 khối ngày 1–15 và 16–31). Chọn Cách đọc ô: số công, dấu x (x = 1 công, xx = 2, xxx = 3; ô ghi giờ = giờ / 8) hoặc số ca (1 ca = 1 công, 1+2 = 2 công). Chữ in đọc tốt; chữ viết tay và ảnh chụp nhỏ / nghiêng đọc kém hơn — ô nghi ngờ tô vàng, ô không đọc được có dấu ?, dòng lệch tổng tô đỏ. Luôn xem lại trước khi ghi. Ảnh nên chụp thẳng, đủ sáng, bảng chiếm gần hết khung (hoặc quét PDF ≥ 200 dpi)." }));
    if (OCRS.busy) card.appendChild(h("div", { class: "ok", id: "ocr-status", text: (OCRS.pages[OCRS.sel] && OCRS.pages[OCRS.sel].status) || "Đang xử lý…" }));
    w.appendChild(card);
    if (!OCRS.pages.length) return w;
    var tabs = h("div", { class: "subtabs" });
    OCRS.pages.forEach(function (pg, i) {
      var cls = pg.err ? " bad" : !pg.res ? " wait" : "";
      tabs.appendChild(h("button", { class: (OCRS.sel === i ? "on" : "") + cls, on: { click: function () { OCRS.sel = i; render(); } } }, [document.createTextNode((i + 1) + ". " + pg.name), h("span", { class: "n", text: pg.res ? String((pg.lines || []).length) : pg.err ? "!" : pg.stopped ? "■" : "…" })]));
    });
    w.appendChild(tabs);
    var pg = OCRS.pages[Math.min(OCRS.sel, OCRS.pages.length - 1)], pc = h("div", { class: "card ocrpage", "data-ocr-page": String(OCRS.sel) });
    w.appendChild(pc);
    var tb = h("div", { class: "bar" });
    tb.appendChild(h("b", { text: pg.name }));
    tb.appendChild(h("span", { class: "hint", style: "margin:0", text: pg.status || "" }));
    tb.appendChild(h("span", { class: "sp" }));
    if ((pg.res || pg.err || pg.stopped) && !OCRS.reading) {
      tb.appendChild(btn("↺ Xoay trái", "ghost", function () { readQueue({ pg: pg, rot: ((pg.rot || 0) + 3) % 4 }); }, "Đọc lại sau khi xoay ảnh 90° ngược chiều kim đồng hồ"));
      tb.appendChild(btn("↻ Xoay phải", "ghost", function () { readQueue({ pg: pg, rot: ((pg.rot || 0) + 1) % 4 }); }));
      tb.appendChild(modeSel(pg.mode || "so", "Cách đọc ô của trang", function (v) { pg.mode = v; readQueue({ pg: pg, rot: pg.res ? pg.rot || 0 : undefined }); }));
      tb.appendChild(btn("↶ Hoàn tác ô đã sửa", "ghost", function () {
        var u = (pg.undo || []).pop(); if (!u) { toast("Chưa có ô nào để hoàn tác"); return; }
        var lr = ocrLearn(); u.L.vals[u.d] = u.prev; u.inp.value = u.prev;
        if (lr && window.hakOcrLib) window.hakOcrLib.undo(C.ocrLearn.cellKey(pg.docId, pg.trang || 1, u.cell, pg.rot || 0, ocrRef(u.L, u.li, u.d)), session ? session.tenDangNhap : "").then(function () { toast("Đã hoàn tác ô và mẫu học của lần sửa đó"); });
        render();
      }, "Trả ô về giá trị trước khi sửa; mẫu học của lần sửa gần nhất chuyển sang 'Bị từ chối' (vẫn giữ lịch sử)"));
      var lrq = ocrLearn(); if (lrq && lrq.pending()) tb.appendChild(btn("⚠ " + lrq.pending() + " mẫu học chưa ghi được — Thử lại", "ghost", function () { lrq.flush().then(function (r) { toast(r.left ? "Vẫn còn " + r.left + " mẫu chưa ghi được: " + lrq.lastError() : "Đã ghi " + r.sent + " mẫu"); render(); }); }));
      if (pg.srcKind === "pdf-text") tb.appendChild(btn("Đọc lại bằng OCR ảnh", "ghost", function () { pg.noText = true; readQueue({ pg: pg, rot: pg.rot || 0 }); }, "Trang này lấy chữ trực tiếp từ lớp chữ của PDF; bấm để bỏ qua lớp chữ và nhận dạng ảnh"));
      tb.appendChild(btn("Đọc lại", "ghost", function () { readQueue({ pg: pg, rot: pg.stopped && !pg.res ? undefined : pg.rot || 0 }); }));
    }
    pc.appendChild(tb);
    var lbox = h("div", { class: "bar", "data-ocr-learn-status": "1" }); if(pg.res && pg.res.documentReview) lbox.appendChild(h("div",{class:"hint",text:"Trường biểu mẫu chỉ dùng trong phiếu đối chiếu; không tự học vào thư viện ô công."})); else ocrStatusFill(lbox); pc.appendChild(lbox);
    if (pg.err) { pc.appendChild(h("div", { class: "warn", text: "Lỗi khi đọc: " + pg.err })); return w; }
    if (!pg.res) { pc.appendChild(h("div", { class: "hint", text: pg.stopped ? "Trang này chưa đọc (đã bấm Dừng đọc). Bấm Đọc lại khi cần." : "Đang chờ đọc…" })); return w; }
    var T = pg.res.table;
    (T.warnings || []).forEach(function (x) { pc.appendChild(h("div", { class: "warn", text: "⚠ " + x })); });
    if (!T.layout && pg.res.documentReview) {
      var dr=pg.res.documentReview;
      var titles={FINGERPRINT_EXCEPTION:"Giấy xác nhận vân tay",OVERTIME_SLIP:"Phiếu xác nhận tăng ca",OVERTIME_SUMMARY:"Danh sách tổng giờ tăng ca",UNKNOWN:"Chưa xác định loại hồ sơ"};
      var review=h("section",{class:"card","data-document-review":"1"});
      review.appendChild(h("h3",{text:(titles[dr.kind]||titles.UNKNOWN)+" · Chờ đối chiếu"}));
      review.appendChild(h("div",{class:"warn",text:"Gợi ý OCR chưa được xác nhận. Đối chiếu ảnh gốc; không tự ghi vào chấm công, không tự tính giờ qua đêm và không xác nhận chữ ký."}));
      if(!pg.formDraft)pg.formDraft=dr.candidates.map(function(c){return {field:c.field,value:c.value,source:c.source,confirmed:false};});
      var rt=h("table");rt.appendChild(h("tr",{},["Trường","Gợi ý / giá trị đã sửa","Dòng nguồn OCR","Đã đối chiếu ảnh"].map(function(t){return h("th",{text:t});})));
      pg.formDraft.forEach(function(c){
        var value=h("input",{class:"i",value:c.value,"aria-label":"Giá trị "+c.field});
        var checked=h("input",{type:"checkbox","aria-label":"Đã đối chiếu "+c.field});checked.checked=c.confirmed;
        value.addEventListener("input",function(){c.value=value.value;c.confirmed=false;checked.checked=false;});checked.addEventListener("change",function(){c.confirmed=checked.checked;});
        rt.appendChild(h("tr",{},[h("td",{text:({date:"Ngày",time:"Giờ",name:"Họ tên"})[c.field]||c.field}),h("td",{},[value]),h("td",{text:c.source}),h("td",{},[checked])]));
      });review.appendChild(h("div",{class:"tw"},[rt]));
      var addFields=h("div",{class:"bar"});
      [["name","Thêm họ tên"],["date","Thêm ngày"],["time","Thêm giờ"]].forEach(function(item){addFields.appendChild(btn(item[1],"ghost",function(){pg.formDraft.push({field:item[0],value:"",source:"Người dùng bổ sung từ ảnh gốc",confirmed:false});render();}));});review.appendChild(addFields);
      if(!pg.formDraft.length)review.appendChild(h("div",{class:"hint",text:"Chưa đọc được trường đáng tin để gợi ý. Xem chữ OCR bên dưới và nhập hồ sơ theo ảnh gốc; không coi đây là kết quả trống hợp lệ."}));
      var raw=h("details",{},[h("summary",{text:"Xem toàn bộ chữ OCR để đối chiếu"}),h("pre",{text:dr.rawText,style:"white-space:pre-wrap;max-height:260px;overflow:auto"})]);review.appendChild(raw);
      if(can("export"))review.appendChild(btn("Xuất phiếu đối chiếu JSON","",function(){download("HAK_OCR_DoiChieu_"+Date.now()+".json","application/json",JSON.stringify({kind:dr.kind,status:"REVIEW_ONLY",canAutoImport:false,source:pg.name,fields:pg.formDraft},null,2));}));
      pc.appendChild(review);
    } else if (!T.layout) { pc.appendChild(h("div", { class: "hint", text: "Thử xoay ảnh hoặc chụp lại rõ hơn; trang chưa dựng được bảng, không tự nhập dữ liệu." })); }

    var meta = h("div", { class: "bar" }), kyI = h("input", { class: "i", type: "month", value: pg.ky || kyStr(), "aria-label": "Kỳ của trang", style: "width:170px" });
    kyI.addEventListener("change", function () { pg.ky = kyI.value; });
    meta.appendChild(h("label", { text: "Kỳ " })); meta.appendChild(kyI);
    if (pg.srcKind === "pdf-text") meta.appendChild(h("span", { class: "hint", "data-src-kind": "pdf-text", style: "margin:0", text: "Nguồn: lớp chữ của PDF (không OCR ảnh)" }));
    else if (pg.srcNote) meta.appendChild(h("span", { class: "hint", style: "margin:0", text: "Lớp chữ PDF không dùng được: " + pg.srcNote }));
    if (pg.res.title && pg.res.title.length) meta.appendChild(h("span", { class: "hint", style: "margin:0", text: "Tiêu đề đọc được: " + pg.res.title.join(" · ") }));
    pc.appendChild(meta);
    if (!pg.lines || !pg.lines.length) return w;
    // ảnh gốc (đã xoay) + ô đang chọn
    var reviewInputs = [], reviewIndex = -1;
    var prevBox = h("div", { class: "ocrprev", "data-ocr-review": "1", role: "region", "aria-label": "Đối chiếu ô chấm công" }), zoom = canvasOf(10, 10), zcap = h("div", { class: "hint", "aria-live": "polite", text: "Bấm vào 1 ô để xem ảnh gốc của ô đó" });
    var reviewBar = h("div", { class: "bar" }), reviewCount = h("span", { class: "hint" });
    function nextReview() {
      if (!reviewInputs.length) return;
      reviewIndex = (reviewIndex + 1) % reviewInputs.length;
      reviewInputs[reviewIndex].focus();
      reviewInputs[reviewIndex].scrollIntoView({ block: "nearest", inline: "center" });
      reviewCount.textContent = "Ô cần đối chiếu " + (reviewIndex + 1) + "/" + reviewInputs.length + " · xem ảnh rồi sửa nếu cần";
    }
    reviewBar.appendChild(btn("Ô cần kiểm tra tiếp theo", "ghost", nextReview, "Chuyển đến ô chưa đọc được, độ tin cậy thấp hoặc có gợi ý chữ tay; không tự xác nhận ô"));
    reviewBar.appendChild(reviewCount); prevBox.appendChild(reviewBar);
    prevBox.appendChild(zoom); prevBox.appendChild(zcap);
    var showCell = function (cell, label) {
      if (!cell || !pg.view) { zcap.textContent = label + " — không có ảnh ô"; return; }
      var pad = 6, x0 = Math.max(0, cell.x0 - pad), y0 = Math.max(0, cell.y0 - pad), cw = Math.min(pg.view.width, cell.x1 + pad) - x0, ch = Math.min(pg.view.height, cell.y1 + pad) - y0, sc0 = Math.min(6, 120 / Math.max(1, ch));
      zoom.width = Math.round(cw * sc0); zoom.height = Math.round(ch * sc0);
      var zx = zoom.getContext("2d"); zx.imageSmoothingEnabled = true; zx.drawImage(pg.view, x0, y0, cw, ch, 0, 0, zoom.width, zoom.height);
      zcap.textContent = label + " · OCR: \"" + (cell.text || "") + "\" · tin cậy " + (cell.conf || 0) + (cell.handwriting && cell.handwriting.text ? " · gợi ý chữ tay: " + cell.handwriting.text + " (chưa xác nhận)" : "") + (cell.secondOpinion && cell.secondOpinion.status === "DISAGREE" ? " · Umi-OCR đọc KHÁC: " + cell.secondOpinion.text + " (xem lại)" : cell.secondOpinion && cell.secondOpinion.status === "AGREE" ? " · Umi-OCR đọc giống" : "") + (cell.src === "nét" ? " · nhận theo nét (số 1 viết tay)" : "") + (cell.valSrc ? " · tính: " + cell.valSrc : "") + (cell.libStatus === "AUTO" ? " · thư viện mẫu tự nhận (" + Math.round(cell.libScore * 100) + "%)" + (cell.libFrom != null ? ", OCR đọc: " + cell.libFrom : "") : cell.libStatus === "SUG" ? " · thư viện gợi ý: " + cell.libLabel + " (" + Math.round(cell.libScore * 100) + "%)" : "") + (cell.unsure ? " · không chắc — xem lại" : "");
    };
    var tw = h("div", { class: "tw ocrgrid" }), t = h("table"), hr = h("tr");
    ["Tên trên giấy", "Nhân viên", "Loại"].concat(pg.days.map(String), ["Tổng tính", "Tổng giấy"]).forEach(function (x) { hr.appendChild(h("th", { text: x })); });
    hr.appendChild(h("th", { text: "" })); // cột "Bỏ dòng"
    t.appendChild(h("thead", {}, [hr]));
    var tbody = h("tbody"), list = nvChoices();
    pg.lines.forEach(function (L, li) {
      var tr = h("tr"), sel = h("select", { "aria-label": "Nhân viên dòng " + (li + 1) });
      sel.appendChild(h("option", { value: "", text: "— chọn —" }));
      var seen = {};
      L.sug.forEach(function (s0) { seen[s0.ma] = 1; sel.appendChild(h("option", { value: s0.ma, text: "≈ " + s0.ma + " · " + s0.ten + (s0.memo ? " — " + s0.memo : " (" + Math.round(s0.score * 100) + "%)") })); });
      list.forEach(function (n) { if (!seen[n.ma]) sel.appendChild(h("option", { value: n.ma, text: n.ma + " · " + n.ten })); });
      sel.value = L.ma; if (L.nameDup) sel.title = "Trùng họ tên với nhân viên khác — hãy chọn đúng theo MÃ NV"; sel.addEventListener("change", function () { L.ma = sel.value; tr.classList.toggle("nomatch", !L.ma); });
      var ks = h("select", { "aria-label": "Loại dòng " + (li + 1) }); OCR_KIND.forEach(function (o) { ks.appendChild(h("option", { value: o[0], text: o[1] })); }); ks.value = L.kind; ks.addEventListener("change", function () { L.kind = ks.value; });
      var nmI = h("input", { class: "i", value: L.name, style: "width:150px" }); nmI.addEventListener("change", function () { L.name = nmI.value; });
      nmI.addEventListener("focus", function () { showCell(L.src.nameCell, "Tên"); });
      tr.appendChild(h("td", {}, [nmI])); tr.appendChild(h("td", {}, [sel])); tr.appendChild(h("td", {}, [ks]));
      var sumTd = h("td", { class: "r" }), totTd = h("td", { class: "r" });
      var upd = function () {
        var ls = lineSum(L, pg.days), tk = Object.keys(L.src.totals || {}).filter(function (k) { var f = C.tsparse.fold(k); return L.kind === "Cơm" ? /com/.test(f) : !/com/.test(f) || /cong/.test(f); })[0];
        var tv = tk != null ? L.src.totals[tk] : null;
        sumTd.textContent = String(ls.sum).replace(".", ",") + (ls.bad ? " (+" + ls.bad + " ?)" : "");
        totTd.textContent = tv == null || isNaN(tv) ? "" : String(tv).replace(".", ",");
        tr.classList.toggle("mismatch", tv != null && !isNaN(tv) && Math.abs(tv - ls.sum) > 0.01);
      };
      pg.days.forEach(function (d) {
        var cell = L.src.cells ? L.src.cells[d] : null, inp = h("input", { class: "i oc", value: L.vals[d], "data-day": String(d) });
        if (String(L.vals[d]).trim() && ((cell && (cell.conf < 60 || cell.src === "nét" || cell.unsure)) || ocrNum(L.vals[d]) > 3)) inp.classList.add("low"); // > 3 công / suất 1 ngày: hay là "0.5" mất dấu chấm
        if (L.vals[d] === "?") inp.classList.add("bad");
        inp.addEventListener("paste", function (ev) { // dán nhiều ô (từ Excel): tab = sang ô kế, xuống dòng = sang dòng kế; mỗi ô đổi giá trị đều đi qua đường sửa ô thường (ghi mẫu)
          var txt = (ev.clipboardData || window.clipboardData || {}).getData ? (ev.clipboardData || window.clipboardData).getData("text") : ""; if (!/[\t\n]/.test(txt.replace(/\n$/, ""))) return;
          ev.preventDefault(); var rowsT = txt.replace(/\r/g, "").replace(/\n$/, "").split("\n").map(function (r) { return r.split("\t"); });
          var trs = [].slice.call(tbody.querySelectorAll("tr")), r0 = trs.indexOf(inp.closest("tr")), days = pg.days, d0 = days.indexOf(d);
          rowsT.forEach(function (cells, ri) { var tr2 = trs[r0 + ri]; if (!tr2) return; cells.forEach(function (v, ci) { var dd = days[d0 + ci]; if (dd == null) return; var t2 = tr2.querySelector("input[data-day='" + dd + "']"); if (t2 && t2.value !== v.trim()) { t2.value = v.trim(); t2.dispatchEvent(new window.Event("change")); } }); });
        });
        inp.addEventListener("focus", function () { inp._viewed = true; inp._changed = false; showCell(cell, (L.name || "Dòng " + (li + 1)) + " · ngày " + d); });
        inp.addEventListener("blur", function () { var lr = ocrLearn(); if (lr && cell && inp._viewed && !inp._changed && String(L.vals[d]).trim() && String(L.vals[d]) === String(L.orig ? L.orig[d] : "")) lr.onViewedUnchanged({ res: pg.res, cell: cell, pg: pg, ma: L.ma, value: L.vals[d] }); inp._viewed = false; });
        inp.addEventListener("change", function () { var prevV = L.vals[d]; inp._changed = true; if (prevV !== inp.value.trim()) { (pg.undo = pg.undo || []).push({ L: L, d: d, prev: prevV, cell: cell, inp: inp }); } L.vals[d] = inp.value.trim(); var lr = ocrLearn(); if (lr) lr.onEdit({ res: pg.res, cell: cell, ref: ocrRef(L, li, d), pg: pg, ma: L.ma, before: prevV, after: L.vals[d], ocrValue: L.orig ? L.orig[d] : prevV }).then(function (r) { ocrMark(inp, ocrRef(L, li, d)); if (r && r.ok === false) toast("⚠ Chưa lưu được mẫu học từ ô vừa sửa — " + (r.durable ? "đã giữ lại trên đĩa, sẽ thử lại" : "CHỈ giữ tạm trong bộ nhớ, hãy bấm Thử lại trước khi đóng") + " (" + (r.error || "") + ")"); else if (r && r.missingSource) toast("Ô này không có ảnh nguồn — chỉ ghi lịch sử sửa, chưa tạo mẫu học"); }); inp.classList.remove("low"); inp.classList.toggle("bad", isNaN(ocrNum(L.vals[d])) && ocrNum(L.vals[d]) !== null); upd(); });
        var contents = [inp], candidate = cell && cell.handwriting;
        if (inp.classList.contains("low") || inp.classList.contains("bad") || (candidate && (candidate.offered || candidate.status === "NEEDS_REVIEW" || candidate.status === "UNSUPPORTED"))) reviewInputs.push(inp);
        if ((!pg.mode || pg.mode === "so") && candidate && candidate.offered && candidate.status === "CANDIDATE" && ocrNum(L.vals[d]) !== ocrNum(candidate.text)) {
          var useCandidate = btn("✎ " + candidate.text, "ghost", function () {
            showCell(cell, (L.name || "Dòng " + (li + 1)) + " · ngày " + d);
            inp.value = candidate.text; inp.dispatchEvent(new window.Event("change"));
            useCandidate.disabled = true; useCandidate.textContent = "Đã chọn " + candidate.text;
          }, "Gợi ý chữ số viết tay CNN: " + candidate.text + ". " + candidate.warning + " Điểm mô hình không phải xác nhận độ chính xác.");
          useCandidate.setAttribute("data-handwriting-candidate", candidate.text);
          useCandidate.setAttribute("aria-label", "Dùng gợi ý chữ tay " + candidate.text + " cho ngày " + d);
          contents.push(useCandidate);
        }
        // Umi-OCR (tuỳ chọn) đọc ô số KHÁC Tesseract → tô vàng, đưa vào "Ô cần kiểm tra tiếp theo", nút gợi ý (không tự thay)
        var second = cell && cell.secondOpinion;
        if ((!pg.mode || pg.mode === "so") && second && second.offered && second.status === "DISAGREE" && ocrNum(L.vals[d]) !== ocrNum(second.text)) {
          inp.classList.add("low"); inp.title = "Tesseract đọc \"" + (cell.text || "") + "\", Umi-OCR đọc \"" + second.text + "\" — xem ảnh ô rồi chọn";
          if (reviewInputs.indexOf(inp) < 0) reviewInputs.push(inp);
          var useSecond = btn("⇄ " + second.text, "ghost", function () {
            showCell(cell, (L.name || "Dòng " + (li + 1)) + " · ngày " + d);
            inp.value = second.text; inp.dispatchEvent(new window.Event("change"));
            useSecond.disabled = true; useSecond.textContent = "Đã chọn " + second.text;
          }, "Umi-OCR (engine thứ hai, chạy trên máy này) đọc ô này là " + second.text + ", khác Tesseract. Đối chiếu ảnh ô trước khi chọn.");
          useSecond.setAttribute("data-umi-candidate", second.text);
          useSecond.setAttribute("aria-label", "Dùng kết quả Umi-OCR " + second.text + " cho ngày " + d);
          contents.push(useSecond);
        }
        tr.appendChild(h("td", { class: "oc" }, contents));
      });
      tr.appendChild(sumTd); tr.appendChild(totTd); upd();
      tr.appendChild(h("td", {}, [btn("✕ Bỏ dòng", "ghost", function () { if (!confirm("Bỏ dòng \"" + (L.name || "(không tên)") + "\" khỏi trang này? (Chỉ bỏ khỏi màn hình, không ảnh hưởng ảnh gốc và chưa ghi vào Chấm công.)")) return; pg.lines.splice(li, 1); render(); }, "Bỏ dòng này khỏi trang OCR (không ghi vào Chấm công)")]));
      if (!L.ma) tr.classList.add("nomatch");
      tbody.appendChild(tr);
    });
    t.appendChild(tbody); tw.appendChild(t);
    if ((!pg.mode || pg.mode === "so") && pg.res && pg.res.cells && pg.res.cells.some(function (c) { return c.handwriting && c.handwriting.model; })) pc.appendChild(h("div", { class: "hint", "data-handwriting-model": "1", text: "Nhận dạng chữ số viết tay chạy offline. Nút ✎ gợi ý chữ số đơn hoặc số thập phân có dấu phân cách và các chữ số tách rời. Chỉ khi bạn chọn thì giá trị ô mới đổi. Chưa hỗ trợ tên tiếng Việt hoặc chữ số dính nét; cần đối chiếu ảnh gốc." }));
    if (C.ocrRules) { // kiểm tra nghiệp vụ (V7): kỳ, ngày trong tháng, mã NV, trùng dòng, ô không phải số — lỗi cấu trúc thì KHÔNG học mẫu từ trang này
      var maSet = {}; list.forEach(function (n) { maSet[n.ma] = 1; });
      var chk = C.ocrRules.check({ ky: pg.ky, mode: pg.mode, days: pg.days, lines: pg.lines.map(function (L) { return { name: L.name, ma: L.ma, kind: L.kind, vals: L.vals, src: L.src }; }) }, { maSet: maSet, sumOf: function (L) { return lineSum(L, pg.days).sum; } });
      pg.layoutSuspect = !!(chk.layoutSuspect || pg.layoutStatus === "MISMATCH" || (pg.res && pg.res.table && !pg.res.table.layout));
      if (pg.layoutStatus === "MISMATCH") pc.appendChild(h("div", { class: "warn", "data-ocr-layout": "1" }, [document.createTextNode("Bố cục bảng " + pg.layoutInfo + " — thư viện mẫu không tự nhận ô và KHÔNG học từ trang này. "), btn("Đây là bố cục mới — lưu", "ghost", function () { window.hakOcrLib.layoutSave(pg.layoutSig, "", session ? session.tenDangNhap : "").then(function (r) { if (r && r.ok) { pg.layoutStatus = "MATCH"; pg.layoutId = r.id; pg.layoutSuspect = false; toast("Đã lưu bố cục mới"); OLS.loaded = false; render(); } }); })]));
      if (chk.issues.length) pc.appendChild(h("div", { class: chk.errors ? "warn" : "hint", "data-ocr-rules": "1", html: "<b>Kiểm tra nghiệp vụ · HAK OCR Engine:</b> " + chk.errors + " lỗi, " + chk.warns + " cảnh báo" + (chk.layoutSuspect ? " — <b>nghi lỗi bố cục: trang này không được dùng để học mẫu</b>" : "") + "<br>" + chk.issues.slice(0, 8).map(function (i) { return esc(i.msg); }).join("<br>") + (chk.issues.length > 8 ? "<br>… và " + (chk.issues.length - 8) + " mục nữa" : "") }));
    }
    pc.appendChild(h("div", { class: "legend", html: "<span><i class='low'>1</i>OCR không chắc / nhận theo nét</span><span><i class='bad'>?</i>không đọc được — nhập lại</span><span><i class='mm'>&nbsp;</i>dòng lệch tổng trên giấy</span><span><i class='nm'>&nbsp;</i>chưa chọn nhân viên</span>" }));
    reviewCount.textContent = reviewInputs.length + " ô cần đối chiếu · không tự xác nhận";
    pc.appendChild(prevBox);
    pc.appendChild(tw);
    return w;
  }
