  // ---------- Đọc ảnh bảng chấm công / chấm cơm (OCR offline, 2.0-α20) ----------
  // Ảnh / PDF → tìm ô (core/table-grid) → Tesseract ở tiến trình chính (window.hakOcr) → bảng xem trước SỬA ĐƯỢC
  // → Xuất Excel, hoặc đưa vào Chấm công / Suất cơm qua màn hình xem trước nhập Excel (khóa kỳ chốt, quyền, sao lưu như nhập Excel).
  var OCRS = { pages: [], more: [], sel: 0, busy: false, reading: false, stop: false, mode: "so" }; // reading: đang chạy hàng đợi đọc; stop: người dùng bấm Dừng đọc
  // Cách đọc ô ngày (α22, chủ sở hữu duyệt): số công viết tay · dấu x = 1 công (xx = 2, xxx = 3), ô ghi giờ = giờ / 8 · lịch ca: 1 ca = 1 công, "1+2" = 2 công
  var OCR_MODES = [["so", "Số công (1, 0,5…)"], ["mark", "Dấu x (x = 1 công) · giờ / 8"], ["ca", "Số ca (1 ca = 1 công, 1+2 = 2)"]];
  var OCR_KIND = [["Công", "Chấm công — BT"], ["Tăng ca", "Chấm công — TC"], ["Cơm", "Suất cơm"], ["", "(bỏ qua dòng)"]];
  var OCR_CHUNK = 30; // số trang PDF dựng ảnh mỗi lượt (giữ bộ nhớ ổn định); phần còn lại đọc tiếp bằng nút "Đọc tiếp" — KHÔNG bỏ trang nào
  function renderPdfPages(src) {
    var pdf = src.pdf, end = Math.min(pdf.numPages, src.next + OCR_CHUNK - 1), out = [], chainP = Promise.resolve();
    for (var i = src.next; i <= end; i++) (function (i) {
      chainP = chainP.then(function () { return OCRS.stop ? null : pdf.getPage(i); }).then(function (pg) {
        if (!pg) return; // đã bấm Dừng đọc
        var v0 = pg.getViewport({ scale: 1 }), sc = Math.min(4, 2400 / Math.max(v0.width, v0.height)), vp = pg.getViewport({ scale: sc }), cv = canvasOf(Math.round(vp.width), Math.round(vp.height));
        var cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height);
        return pg.render({ canvasContext: cx, viewport: vp }).promise.then(function () {
          // lớp chữ của PDF (nếu có): đổi sang toạ độ ảnh trang để dựng bảng không cần OCR
          return (pg.getTextContent ? pg.getTextContent().then(function (tc) { return tc.items.filter(function (it) { return it.str && it.transform; }).map(function (it) { return C.pdfText.toRect(it, vp.transform); }); }, function () { return null; }) : Promise.resolve(null)).then(function (ti) {
            out.push({ name: src.file.name + " — trang " + i, canvas: cv, docId: src.docId || "", trang: i, textItems: ti, pdfScale: sc }); src.next = i + 1;
          });
        });
      });
    })(i);
    return chainP.then(function () {
      if (src.next <= pdf.numPages && !OCRS.stop) OCRS.more.push(src); // còn trang chưa dựng → chờ "Đọc tiếp"
      return out;
    });
  }
  function fileToPages(file, docId) {
    var name = file.name;
    if (/\.pdf$/i.test(name) || file.type === "application/pdf") {
      return loadScript("vendor/pdfjs/pdf.min.js").then(function () {
        var lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.js";
        return file.arrayBuffer().then(function (buf) { return lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true }).promise; });
      }).then(function (pdf) { return renderPdfPages({ file: file, pdf: pdf, next: 1, docId: docId }); });
    }
    return window.createImageBitmap(file).then(function (bm) { var cv = canvasOf(bm.width, bm.height); cv.getContext("2d").drawImage(bm, 0, 0); return [{ name: name, canvas: cv, docId: docId || "", trang: 1 }]; });
  }
  // ===== Liên kết ô chấm công ↔ chứng từ gốc (V8): AttendanceRecordID → DocumentID → PageNumber → CellKey → OCRRunID (→ SampleID tra theo CellKey) =====
  // AttendanceRecordID là khóa tự nhiên ổn định: CC|kỳ|mã NV|hình thức công (chấm công) hoặc SC|ngày|mã NV (suất cơm). Lưu trong db.chungtu_lienket nên đi cùng dữ liệu & Full Backup.
  // Nhập lại ô đó từ chứng từ khác: liên kết cũ được GIỮ (current=false) làm lịch sử, liên kết mới là hiện hành.
  function linkMapNow() { return C.attLinks.mapOf(db.chungtu_lienket); }
  function recordCellLinks(cells, batchId) { db.chungtu_lienket = db.chungtu_lienket || []; return C.attLinks.record(db.chungtu_lienket, cells, { batchId: batchId, by: currentUser(), makeId: function (n) { return "LK-" + Date.now().toString(36) + "-" + n; } }); }
  /** Mở lại ảnh/PDF gốc của 1 ô chấm công, khoanh đúng vị trí ô OCR đã đọc. */
  function openCellSource(link) {
    if (!window.hakDocs) { alert("Xem chứng từ gốc chỉ có trong bản cài (.exe)."); return; }
    if (!can("input.view")) { alert("Bạn không có quyền xem chứng từ gốc."); return; }
    var hist = C.attLinks.history(db.chungtu_lienket, link.recordId, link.day);
    var body = h("div"), cv = h("canvas", { style: "max-width:100%;border:1px solid var(--bd,#ccc)" }), meta = h("div", { class: "hint" });
    body.appendChild(meta);
    body.appendChild(h("div", { class: "hint", text: "Giá trị đã nhập: " + link.value + " · ngày " + link.day + " · bản ghi " + link.recordId }));
    body.appendChild(cv);
    if (hist.length > 1) body.appendChild(h("div", { class: "hint", text: "Lịch sử nguồn của ô này: " + hist.map(function (l) { return l.docId + " tr." + l.page + " (" + fmtTime(l.at) + (l.current === false ? ", đã thay" : ", hiện hành") + ")"; }).join(" → ") }));
    modal("Chứng từ gốc của ô", body, function (close) { return [btn("Đóng", "pri", close)]; });
    meta.textContent = "Đang mở " + link.docId + " trang " + link.page + "…";
    window.hakDocs.read(link.docId).then(function (r) {
      if (!r || !r.ok) { meta.textContent = "⚠ Không mở được chứng từ " + link.docId + ": " + ((r && r.error) || "mất file"); return; }
      var m = r.meta || {}, bytes = new Uint8Array(r.data), isPdf = /pdf/i.test(m.ext || "") || (bytes[0] === 0x25 && bytes[1] === 0x50);
      meta.textContent = (m.name || link.docId) + " · trang " + link.page + " · nhập lúc " + fmtTime(link.at) + " bởi " + (link.by || "");
      var draw = function (srcCanvas) {
        var W = link.imgW || srcCanvas.width, H = link.imgH || srcCanvas.height, rot = ((link.rot || 0) % 360 + 360) % 360, swap = rot === 90 || rot === 270;
        cv.width = W; cv.height = H; var cx = cv.getContext("2d"), sw = swap ? srcCanvas.height : srcCanvas.width, sh = swap ? srcCanvas.width : srcCanvas.height;
        cx.save(); cx.translate(W / 2, H / 2); cx.rotate(rot * Math.PI / 180); cx.scale(W / sw, H / sh); cx.drawImage(srcCanvas, -srcCanvas.width / 2, -srcCanvas.height / 2); cx.restore();
        if (link.bbox) { cx.strokeStyle = "#e11d48"; cx.lineWidth = Math.max(3, W / 300); cx.strokeRect(link.bbox.x0, link.bbox.y0, link.bbox.x1 - link.bbox.x0, link.bbox.y1 - link.bbox.y0); }
      };
      if (!isPdf) { window.createImageBitmap(new Blob([bytes])).then(function (bm) { var c0 = canvasOf(bm.width, bm.height); c0.getContext("2d").drawImage(bm, 0, 0); draw(c0); }, function () { meta.textContent = "⚠ Không giải mã được ảnh"; }); return; }
      loadScript("vendor/pdfjs/pdf.min.js").then(function () {
        var lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.js";
        return lib.getDocument({ data: bytes }).promise;
      }).then(function (pdf) { return pdf.getPage(link.page || 1); }).then(function (pg) {
        var vp = pg.getViewport({ scale: link.pdfScale || 2 }), c1 = canvasOf(Math.ceil(vp.width), Math.ceil(vp.height));
        return pg.render({ canvasContext: c1.getContext("2d"), viewport: vp }).promise.then(function () { draw(c1); });
      }).catch(function (e) { meta.textContent = "⚠ Không dựng được trang PDF: " + (e && e.message || e); });
    });
  }
  /** Lưu NGUYÊN BẢN file vào kho chứng từ (SHA-256, không xóa) và ghi siêu dữ liệu vào db.chungtu. Lỗi lưu → báo, KHÔNG chặn đọc OCR. */
  function archiveOriginal(file) {
    if (!window.hakDocs) return Promise.resolve("");
    return file.arrayBuffer().then(function (buf) { return window.hakDocs.add(new Uint8Array(buf), { name: file.name, user: currentUser(), note: "OCR chấm công kỳ " + kyStr(), ky: kyStr(), company: congTy()["Mã công ty"] || "HAK", docType: "BANGCONG", dept: "ALL" }); }).then(function (r) {
      if (!r || !r.ok) { toast("Chưa lưu được bản gốc " + file.name + ": " + ((r && r.error) || "lỗi không rõ")); return ""; }
      if (!db.chungtu.some(function (c) { return c.id === r.id; })) {
        db.chungtu.push({ id: r.id, sha256: r.sha256, name: file.name, size: r.size, addedAt: new Date().toISOString(), addedBy: currentUser(), nguon: "OCR", ky: kyStr() });
        audit("Lưu chứng từ gốc", r.id + " · " + file.name + " · SHA-256 " + r.sha256.slice(0, 12) + "…"); save();
      } else if (r.duplicate) toast("File " + file.name + " đã có trong kho chứng từ (" + r.id + ") — dùng lại bản đã lưu");
      if (r.sameNameDifferent && r.sameNameDifferent.length) toast("⚠ Đã có chứng từ CÙNG TÊN \"" + file.name + "\" nhưng NỘI DUNG KHÁC (" + r.sameNameDifferent.join(", ") + ") — bản mới được lưu thêm, không ghi đè");
      return r.id;
    }, function (e) { toast("Chưa lưu được bản gốc: " + e.message); return ""; });
  }
  function nvChoices() { return db.nhanvien.filter(function (n) { return n["Trạng thái"] !== "Đã nghỉ việc"; }).concat(db.nhanvien.filter(function (n) { return n["Trạng thái"] === "Đã nghỉ việc"; })).map(function (n) { return { ma: n["Mã NV"], ten: n["Họ và tên"] || "" }; }); }
  // Tự học từ chỉnh sửa (V7): mỗi ô OCR người dùng sửa tự ghi 1 mẫu "chờ duyệt"; duyệt khi ghi bảng vào Chấm công
  var OCRL = null;
  function ocrLearn() { if (!OCRL && window.hakOcrLib && C.ocrLearn) OCRL = C.ocrLearn.createService({ api: window.hakOcrLib, user: function () { return session ? session.tenDangNhap : currentUser(); }, cfg: function () { return { saveConfirmed: !!congTy()["OCR lưu mẫu xác nhận"] }; }, ocrVersion: "tsocr-v10.4+mnist-cnn-v1" }); if (OCRL && !OCRL._restored) { OCRL._restored = true; OCRL.restoreQueue().then(function (r) { if (r && r.restored) { toast("⚠ Có " + r.restored + " mẫu học từ lần trước chưa ghi vào thư viện — đã nạp lại, bấm \"Thử lại\" ở màn OCR"); } }); } return OCRL; }
  // ---- Trạng thái lưu mẫu OCR hiển thị cho người dùng (V9.4) ----
  var OCR_ST = { saved: ["lrn-saved", "Đã ghi mẫu — chờ xác minh (PENDING_VERIFICATION)"], missing: ["lrn-miss", "Thiếu ảnh nguồn — chỉ ghi lịch sử sửa, chưa tạo mẫu"], queued: ["lrn-q", "Chưa ghi được — đang giữ để thử lại"], error: ["lrn-err", "Lỗi lưu mẫu — hãy bấm Thử lại"] };
  /** Khóa ổn định của ô: dòng chưa ghép NV vẫn có khóa riêng theo vị trí dòng (không trùng nhau). */
  function ocrMark(inp, ref) {
    var lr = ocrLearn(), e = lr && lr.stateOf ? lr.stateOf(ref) : null; if (!e || !inp) return;
    Object.keys(OCR_ST).forEach(function (k) { inp.classList.remove(OCR_ST[k][0]); });
    var st2 = OCR_ST[e.state]; if (st2) { inp.classList.add(st2[0]); inp.title = st2[1] + (e.error ? " — " + e.error : ""); inp.setAttribute("data-learn", e.state); }
    var bar = document.querySelector("[data-ocr-learn-status]"); if (bar) ocrStatusFill(bar);
  }
  function ocrStatusFill(box) {
    var lr = ocrLearn(); box.innerHTML = ""; if (!lr || !lr.stats) return;
    var s2 = lr.stats(), tot = s2.saved + s2.missing + s2.queued + s2.error;
    if (!tot) { box.appendChild(h("span", { class: "hint", style: "margin:0", text: "Sửa một ô OCR → hệ thống tự ghi mẫu (không cần bấm Lưu mẫu). Mẫu mới ở trạng thái chờ xác minh và chưa được dùng để tự quyết định công." })); return; }
    box.appendChild(h("b", { text: "Mẫu học từ ô đã sửa: " }));
    [["saved", "đã ghi (chờ xác minh)"], ["missing", "thiếu ảnh nguồn"], ["queued", "đang thử lại"], ["error", "lỗi lưu"]].forEach(function (x) { if (s2[x[0]]) box.appendChild(h("span", { class: "chip " + OCR_ST[x[0]][0], text: s2[x[0]] + " " + x[1] })); });
    box.appendChild(btn("Mở thư viện mẫu", "ghost", function () { OLS.tab = "cho"; OLS.page = 0; OLS.loaded = false; st.tab = "ocrlib"; render(); }, "Xem các mẫu vừa ghi trong Thư viện mẫu OCR"));
  }
  /** Tra cứu thư viện mẫu cho các ô số: AUTO_ACCEPT → dùng nhãn thư viện (ghi rõ nguồn); SUGGESTED → đánh dấu "không chắc" + gợi ý; còn lại giữ nguyên kết quả OCR. */
  /** So khớp bố cục bảng với thư viện bố cục: MISMATCH → không tự nhận ô bằng thư viện và không học từ trang này (trừ khi người dùng xác nhận bố cục mới) */
  function analyzePage(pg, rot) {
    pg.status = "Đang đọc…"; pg.err = ""; pg.stopped = false; OCRS.busy = true; render();
    var t0 = Date.now();
    var onErr = function (e) { if (e === OCR_STOP || /OCR_CANCELLED/.test(String(e && e.message || e))) { markStopped(pg); return; } pg.status = "Lỗi"; pg.err = String(e && e.message || e); }, onDone = function () { OCRS.busy = false; render(); };
    var gimg = grayOf(pg.canvas), tx = pg.textItems && !pg.noText && C.pdfText ? C.pdfText.analyze(pg.textItems, { w: gimg.w, h: gimg.h }) : null;
    pg.srcKind = tx && tx.usable ? "pdf-text" : "ocr"; pg.srcNote = tx && !tx.usable && pg.textItems && pg.textItems.length ? tx.reason : "";
    if (tx && tx.usable) { // chữ lấy thẳng từ PDF: chính xác tuyệt đối, bỏ qua OCR ảnh
      var resT = { rot: 0, scale: pg.pdfScale || 1, g: gimg.g, clean: gimg.g, w: gimg.w, h: gimg.h, cells: tx.cells, table: tx.table, title: tx.title, period: tx.period || (tx.table && tx.table.period) || "", box: tx.box, cellMode: pg.mode || "so", textLayer: true };
      return Promise.resolve(resT).then(function (res) { return layoutCheck(res, pg).then(function () { return res; }); }).then(function (res) { return finishPage(pg, res, t0); }).then(null, onErr).then(onDone);
    }
    return C.tsocr.analyze(gimg, { ocr: function (items) { return OCRS.stop ? Promise.reject(OCR_STOP) : window.hakOcr.batch(items, function (p) { var el = $("#ocr-status"); if (el) el.textContent = "Đang đọc ô " + p.done + "/" + p.total; }).then(function (r) { if (OCRS.stop) throw OCR_STOP; return r; }); } }, { rotate: rot, cellMode: pg.mode || "so", onProgress: function (m) { pg.status = m; var el = $("#ocr-status"); if (el) el.textContent = m; } }).then(function (res) { return layoutCheck(res, pg).then(function () { return res; }); }).then(function (res) { var lr = ocrLearn(); return lr && pg.layoutStatus !== "MISMATCH" ? libEnrich(lr, res, pg).then(function () { return res; }, function () { return res; }) : res; }).then(function (res) { return finishPage(pg, res, t0); }, onErr).then(onDone);
  }
  function finishPage(pg, res, t0) {
      pg.formDraft = null; pg.res = res; pg.rot = res.rot; pg.view = grayCanvas(res.g, res.w, res.h); pg.ms = Date.now() - t0; pg.runId = "RUN-" + t0.toString(36); pg.page = pg.trang || 1; pg.layoutSuspect = !res.table || !res.table.layout;
      var T = res.table, list = nvChoices(), nm0 = T.layout === "B" ? titleName(res.title) : "";
      pg.lines = (T.lines || []).map(function (l) {
        var nm = l.name || nm0, sug = C.tsparse.matchName(nm, list), memo = C.ocrNameMemory && C.ocrNameMemory.suggest(db.ocr_ten || [], nm, list);
        // V9: bộ nhớ tên đã xác nhận → đưa lên đầu gợi ý (chỉ chọn sẵn khi xác nhận ≥ 2 chứng từ, không trùng tên, không xung đột)
        if (memo && memo.ma) { sug = [{ ma: memo.ma, ten: memo.ten, score: memo.preselect ? 0.99 : 0.59, memo: memo.why }].concat(sug.filter(function (x) { return x.ma !== memo.ma; })); }
        // V9: hai người cùng điểm cao nhất (trùng họ tên) → không tự chọn, người dùng chọn theo mã
        var nameDup = sug.length > 1 && sug[0].score >= 0.6 && sug[1].score === sug[0].score && C.ocrNameMemory && C.ocrNameMemory.fold(sug[0].ten) === C.ocrNameMemory.fold(sug[1].ten);
        // bảng dọc: tiêu đề cột viết tay không đọc được nhưng cột có ≥ 5 ô có số (cách đọc dấu x / số ca) → coi là cột chấm công của 1 người
        var nNum = Object.keys(l.values).filter(function (d) { return typeof l.values[d] === "number" && l.values[d] > 0; }).length;
        var kind = T.layout === "B" ? l.kind || (!l.skip && pg.mode && pg.mode !== "so" && nNum >= 5 ? "Công" : "") : (l.kind || "Công");
        var vals = {}; T.days.forEach(function (d) { var v = l.values[d]; vals[d] = v == null ? "" : (typeof v === "number" && isFinite(v) ? String(v).replace(".", ",") : "?"); });
        return { src: l, name: nm, rawName: nm, ma: !nameDup && sug[0] && sug[0].score >= 0.6 ? sug[0].ma : "", maAuto: !nameDup && sug[0] && sug[0].score >= 0.6 ? sug[0].ma : "", nameDup: nameDup, memo: memo ? memo.why : "", sug: sug.slice(0, 5), kind: kind, vals: vals, orig: Object.assign({}, vals) };
      });
      pg.days = T.days.slice(); pg.ky = pg.ky || res.period || kyStr();
      pg.status = !T.layout && res.documentReview && res.documentReview.kind !== "UNKNOWN" ? "Đã nhận diện biểu mẫu · " + res.documentReview.candidates.length + " trường chờ đối chiếu" : T.layout ? "Đã đọc " + pg.lines.length + " dòng · " + Math.round(pg.ms / 1000) + " giây" : "Không dựng được bảng";
      if (window.console && res.table.warnings && res.table.warnings.length) console.info("OCR:", res.table.warnings.join(" | "));
  }
  var OCR_STOP = { stop: true };
  /** Đọc lần lượt các trang chưa đọc; bấm Dừng đọc → trang đang đọc dừng sau lô ô hiện tại, các trang sau không đọc */
  function readQueue(single) {
    OCRS.stop = false; OCRS.reading = true; render();
    var todo = single ? [single.pg] : OCRS.pages.filter(function (p) { return !p.res && !p.err && !p.stopped; });
    return todo.reduce(function (p, pg) { return p.then(function () { if (OCRS.stop) { markStopped(pg); return; } return analyzePage(pg, single ? single.rot : undefined); }); }, Promise.resolve())
      // ⚠ "st" ĐÃ ĐỔI TÊN (trước là "var st = OCRS.stop;") — "st" là biến trạng thái
      // render TOÀN CỤC của module (khai báo đầu file: "var st = { tab: ... }").
      // Tên trùng che khuất biến toàn cục trong scope này — chưa gây lỗi vì không
      // ai đọc "st" (toàn cục) ở đây, nhưng là cái bẫy cho người sửa code sau.
      .then(function () { var wasStop = OCRS.stop; OCRS.reading = false; OCRS.stop = false; render(); if (wasStop) toast("Đã dừng đọc — trang đã đọc xong vẫn giữ nguyên"); });
  }
  function ocrNum(v) { if (C.ocrRules && C.ocrRules.number) return C.ocrRules.number(v); var s0 = String(v == null ? "" : v).trim(); if (!s0) return null; var n = +s0.replace(",", "."); return isFinite(n) ? n : NaN; }
  function lineSum(L, days) { var s0 = 0, bad = 0; days.forEach(function (d) { var n = ocrNum(L.vals[d]); if (n == null) return; if (isNaN(n)) bad++; else s0 += n; }); return { sum: Math.round(s0 * 100) / 100, bad: bad }; }
  /** Dòng dữ liệu sẵn sàng ghi: { chamcong: [...], tiencom: [...], skip: [...] } */
  function ocrRows(pages) {
    var cc = [], tc = [], skip = [], review = [], mcc = [], mtc = [];
    var maSet = {}; db.nhanvien.forEach(function (nv) { maSet[nv["Mã NV"]] = 1; });
    pages.forEach(function (pg) {
      var check = C.ocrRules.check({ ky: pg.ky || kyStr(), mode: pg.mode, days: pg.days, lines: pg.lines }, { maSet: maSet, sumOf: function (line) { return lineSum(line, pg.days).sum; } });
      if (check.layoutSuspect) { skip.push(pg.name + ": " + check.issues.filter(function (i) { return i.struct; }).map(function (i) { return i.msg; }).join("; ")); return; }
      check.issues.filter(function (i) { return i.level === "WARN" && i.code !== "CHUA_CHON_NV"; }).forEach(function (i) { review.push(pg.name + ": " + i.msg); });
      (pg.lines || []).forEach(function (L, lineIndex) {
        var blocked = check.issues.filter(function (i) { return i.level === "ERROR" && i.line === lineIndex; });
        if (blocked.length) { skip.push(pg.name + ": " + blocked.map(function (i) { return i.msg; }).join("; ")); return; }
        if (!L.kind) return;
        if (!L.ma) { skip.push(pg.name + ": " + (L.name || "(không tên)") + " — chưa chọn nhân viên"); return; }
        var bad = pg.days.filter(function (d) { var n = ocrNum(L.vals[d]); return n !== null && (isNaN(n) || n < 0); });
        if (bad.length) { skip.push(pg.name + ": " + (L.name || L.ma) + " — ô ngày " + bad.join(", ") + " chưa sửa (dấu ?)"); return; }
        var ky = pg.ky || kyStr();
        var nameEv = nameEventOf(pg, L, ky);
        // meta[] song song với dòng ghi: __line = vị trí+1 → sau khi nhập biết CHÍNH XÁC ô OCR nào đã được ghi (ImportBatch → ô → mẫu)
        function cellsOf(days, recId) {
          var out = [];
          days.forEach(function (d) {
            var cell = L.src && L.src.cells ? L.src.cells[d] : null, v = String(L.vals[d] == null ? "" : L.vals[d]).trim();
            if (!v) return;
            out.push({ key: C.ocrLearn.cellKey(pg.docId, pg.trang || 1, cell, pg.rot || 0, L.ma + "|" + d), value: v, day: ("0" + d).slice(-2), recordId: recId, docId: pg.docId || "", page: pg.trang || 1, runId: pg.runId || "",
              bbox: cell ? { x0: cell.x0, y0: cell.y0, x1: cell.x1, y1: cell.y1 } : null, imgW: pg.res ? pg.res.w : 0, imgH: pg.res ? pg.res.h : 0, rot: pg.rot || 0, pdfScale: pg.pdfScale || 0, srcName: pg.name || "" });
          });
          return out;
        }
        if (L.kind === "Cơm") pg.days.forEach(function (d) { var n = ocrNum(L.vals[d]); if (n) { mtc.push({ cells: cellsOf([d], ["SC", ky + "-" + ("0" + d).slice(-2), L.ma].join("|")), nameEv: nameEv }); tc.push({ "Ngày": ky + "-" + ("0" + d).slice(-2), "Mã NV": L.ma, "Số suất cơm": n, "Ghi chú": "OCR: " + pg.name, __line: mtc.length }); } });
        else {
          var row = { "Kỳ": ky, "Mã NV": L.ma, "Hình thức công": L.kind === "Tăng ca" ? "TC" : "BT" }, any = false;
          pg.days.forEach(function (d) { var n = ocrNum(L.vals[d]); if (n != null) { row[("0" + d).slice(-2)] = String(n).replace(".", ","); any = true; } });
          if (any) { mcc.push({ cells: cellsOf(pg.days, ["CC", ky, L.ma, row["Hình thức công"]].join("|")), nameEv: nameEv }); row.__line = mcc.length; cc.push(row); }
        }
      });
    });
    return { chamcong: cc, tiencom: tc, skip: skip, review: review, meta: { chamcong: mcc, tiencom: mtc } };
  }
  /** Sự kiện "chuỗi tên trên giấy ↔ Mã NV" của 1 dòng OCR (chỉ ghi vào bộ nhớ khi dòng đã được nhập thật). */
  function nameEventOf(pg, L, ky) {
    var raw = String(L.rawName || (L.src && L.src.name) || L.name || "").trim(); if (!raw || !L.ma) return null;
    var emp = db.nhanvien.filter(function (n) { return n["Mã NV"] === L.ma; })[0], nc = L.src && L.src.nameCell;
    return { raw: raw, typed: L.name, ma: L.ma, tenDM: emp ? emp["Họ và tên"] : "", docId: pg.docId || "", page: pg.trang || 1, runId: pg.runId || "", ky: ky,
      cellKey: C.ocrLearn.cellKey(pg.docId, pg.trang || 1, nc || null, pg.rot || 0, "name|" + (pg.lines ? pg.lines.indexOf(L) : 0)), sua: L.ma !== L.maAuto || String(L.name).trim() !== raw,
      bbox: nc ? { x0: nc.x0, y0: nc.y0, x1: nc.x1, y1: nc.y1 } : null };
  }
  function recordNameLinks(plans, meta) {
    if (!C.ocrNameMemory) return 0; db.ocr_ten = db.ocr_ten || []; var n = 0, who = session ? session.tenDangNhap : currentUser();
    (plans || []).forEach(function (p) { var m = meta[p.table]; if (!m) return; p.items.forEach(function (it) { if (it.action !== "add" && it.action !== "update" && it.action !== "merged") return; var mm = m[(it.line || 0) - 1]; if (mm && mm.nameEv && C.ocrNameMemory.record(db.ocr_ten, Object.assign({ user: who }, mm.nameEv))) n++; }); });
    return n;
  }
  /** Ô OCR đã THỰC SỰ nằm trong dữ liệu vừa ghi (dòng add/update/merged của kế hoạch nhập đã commit) — dòng lỗi/bỏ qua/trùng/khóa không tính. */
  function ocrApply(pages) {
    if (!need("input.edit", "ghi chấm công / suất cơm")) return;
    var rr = ocrRows(pages);
    if (!rr.chamcong.length && !rr.tiencom.length) { alert("Chưa có dòng nào ghi được." + (rr.skip.length ? "\n\n" + rr.skip.join("\n") : "")); return; }
    if (rr.review.length && !confirm("HAK OCR Engine — cần đối chiếu trước khi ghi:\n" + rr.review.slice(0, 20).join("\n") + (rr.review.length > 20 ? "\n… và " + (rr.review.length - 20) + " cảnh báo khác" : "") + "\n\nBạn đã đối chiếu với chứng từ và muốn mở bảng xem trước?")) return;
    var lrChk = ocrLearn(); if (lrChk && lrChk.pending() && !confirm("⚠ Còn " + lrChk.pending() + " mẫu học từ các ô đã sửa CHƯA ghi vào thư viện OCR (lỗi: " + lrChk.lastError() + ").\nChấm công vẫn ghi được, nhưng những mẫu này chưa được tính là đã học và sẽ không được duyệt.\n\nVẫn tiếp tục ghi chấm công?")) return;
    if (rr.skip.length && !confirm("Các dòng sau CHƯA ghi được (sửa xong bấm lại):\n" + rr.skip.join("\n") + "\n\nVẫn ghi các dòng còn lại?")) return;
    importPreview(function (mode) {
      var pl = [];
      if (rr.chamcong.length) { var p1 = IMP.plan(db, "chamcong", ALL.chamcong.cols, rr.chamcong, { lockedPeriods: lockedMap(), defaultKy: kyStr(), mode: mode }); p1.sheet = "Ảnh chấm công"; pl.push(p1); }
      if (rr.tiencom.length) { var p2 = IMP.plan(db, "tiencom", ALL.tiencom.cols, rr.tiencom, { lockedPeriods: lockedMap(), defaultKy: kyStr(), mode: mode }); p2.sheet = "Ảnh chấm cơm"; pl.push(p2); }
      return pl;
    }, "OCR " + pages.map(function (p) { return p.name + (p.docId ? " [" + p.docId + "]" : ""); }).join(", "), function (ok, donePlans) { if (ok && window.hakOcrLib && window.hakOcrLib.layoutSave) pages.forEach(function (p) { if (p.layoutSig && p.layoutStatus !== "MISMATCH" && !p.layoutSuspect) window.hakOcrLib.layoutSave(p.layoutSig, "", session ? session.tenDangNhap : ""); }); var lr = ok && ocrLearn(); if (lr) { var nNames = recordNameLinks(donePlans, rr.meta); if (nNames) save(); var impCells = ocrImportedCells(donePlans, rr.meta), batchId = "IMP-" + Date.now().toString(36); if (recordCellLinks(impCells, batchId)) save(); lr.approveCells(impCells, batchId).then(function (r) { if (r && (r.verified || r.unsaved)) toast((r.verified ? "Thư viện mẫu OCR: " + r.verified + " mẫu của ô đã nhập được xác nhận" + (r.conflict ? " · " + r.conflict + " mẫu xung đột cần xem" : "") : "") + (r.unsaved ? " · ⚠ còn " + r.unsaved + " mẫu học CHƯA ghi được — bấm \"Thử lại\" ở màn OCR" : "")); }); } render(); });
  }
  function ocrExport(pages) {
    var sheets = pages.filter(function (p) { return p.lines && p.lines.length; }).map(function (pg, i) {
      var nm = {}; db.nhanvien.forEach(function (n) { nm[n["Mã NV"]] = n["Họ và tên"]; });
      var rows = pg.lines.map(function (L) {
        var o = { "Tên trên giấy": L.name, "Mã NV": L.ma, "Họ tên (app)": nm[L.ma] || "", "Loại": L.kind || "(bỏ qua)" }, ls = lineSum(L, pg.days);
        pg.days.forEach(function (d) { o[String(d)] = ocrNum(L.vals[d]) == null ? "" : (isNaN(ocrNum(L.vals[d])) ? "?" : ocrNum(L.vals[d])); });
        o["Tổng tính"] = ls.sum; Object.keys(L.src.totals || {}).forEach(function (k) { o["Tổng trên giấy (" + k + ")"] = L.src.totals[k] == null || isNaN(L.src.totals[k]) ? "" : L.src.totals[k]; });
        o["Ô chưa đọc được"] = ls.bad; return o;
      });
      var cols = []; rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
      return { name: ("T" + (i + 1) + " " + pg.name).replace(/[\\/?*[\]:]/g, " ").slice(0, 31), cols: cols, rows: rows };
    });
    if (!sheets.length) { toast("Chưa có trang nào đọc xong"); return; }
    saveXlsx("OCR_ChamCong_" + kyStr() + ".xlsx", sheets);
  }
  function modeSel(v, label, onCh) {
    var s0 = h("select", { "aria-label": label, title: "Số công: ô ghi 1 / 0,5 · Dấu x: x = 1 công, xx = 2, xxx = 3, ô ghi giờ (7h→15h) = giờ / 8 · Số ca: 1 ca = 1 công, \"1+2\" = 2 công, X = nghỉ" });
    OCR_MODES.forEach(function (o) { s0.appendChild(h("option", { value: o[0], text: o[1] })); }); s0.value = v;
    s0.addEventListener("change", function () { onCh(s0.value); }); return s0;
  }
