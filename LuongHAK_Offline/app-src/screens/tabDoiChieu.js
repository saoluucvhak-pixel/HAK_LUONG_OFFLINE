  function tabDoiChieu() {
    var w = h("div"), src = kqKy(st.nam, st.thang);
    var card = h("div", { class: "card" });
    card.appendChild(h("div", { class: "hint", html: "Nhập bảng lương Excel <b>đã xác nhận đúng</b> (vd file công cụ cũ, Power Query) để so với kết quả app — theo từng nhân viên, từng chỉ tiêu, không chỉ so tổng. App tự nhận cột theo tiêu đề (không phân biệt hoa/thường/dấu); cột lạ sẽ báo rõ để biết đã bỏ qua, không âm thầm bỏ sót." }));
    if (!RC) { card.appendChild(h("div", { class: "warn", text: "Thiếu module đối chiếu (core/reconcile.js)." })); w.appendChild(card); return w; }
    if (!src.kq || !src.kq.bangluong.length) { card.appendChild(h("div", { class: "empty", text: "Chưa có bảng lương kỳ " + st.thang + "/" + st.nam + " — vào Tính lương trước." })); w.appendChild(card); return w; }
    card.appendChild(h("div", { class: src.chot ? "locked" : "warn", text: src.chot ? "🔒 Đang đối chiếu với bảng lương ĐÃ CHỐT " + kyLabel(kyKey(st.nam, st.thang)) + "." : "⚠ Kỳ " + st.thang + "/" + st.nam + " chưa chốt — đang đối chiếu với số tính tạm, có thể thay đổi." }));
    var bar = h("div", { class: "bar" });
    bar.appendChild(btn("⬆ Chọn file Excel đối chiếu", "pri", function () {
      readWorkbook(function (wb, fileName) {
        st.dcFile = fileName; st.dcWb = wb;
        st.dcSheet = wb.SheetNames.map(function (n) { return { n: n, len: (XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 }) || []).length }; }).sort(function (a, b) { return b.len - a.len; })[0].n;
        render();
      });
    }));
    if (st.dcWb) {
      if (st.dcWb.SheetNames.length > 1) {
        var selS = h("select");
        st.dcWb.SheetNames.forEach(function (n) { selS.appendChild(h("option", { value: n, text: n })); });
        selS.value = st.dcSheet; selS.addEventListener("change", function () { st.dcSheet = selS.value; render(); });
        bar.appendChild(h("label", { text: "Sheet " })); bar.appendChild(selS);
      }
      bar.appendChild(h("span", { class: "hint", text: st.dcFile }));
    }
    card.appendChild(bar);
    if (st.dcWb) {
      var arr = XLSX.utils.sheet_to_json(st.dcWb.Sheets[st.dcSheet], { header: 1 });
      var ref = XLSX.utils.decode_range(st.dcWb.Sheets[st.dcSheet]["!ref"] || "A1"), firstRow = ref.s.r; // dòng Excel thật = chỉ số mảng + dòng đầu của vùng dữ liệu
      var parsed = RC.parseSheet(arr, null, { firstRow: firstRow });
      if (parsed.headerRow < 0) {
        card.appendChild(h("div", { class: "warn", text: "Không nhận ra dòng tiêu đề (cần có cột 'Mã NV' hoặc 'Họ và tên') trong sheet '" + st.dcSheet + "'. Thử chọn sheet khác." }));
      } else {
        card.appendChild(h("div", { class: "hint", html: "Đã đọc <b>" + parsed.rows.length + "</b> dòng, nhận ra <b>" + parsed.matched.length + "</b> chỉ tiêu: " + esc(parsed.matched.join(", ") || "(không có)") + (parsed.unmatched.length ? ". Cột KHÔNG nhận ra (bỏ qua): " + esc(parsed.unmatched.slice(0, 15).join(", ")) + (parsed.unmatched.length > 15 ? "…" : "") : "") }));
        var cmp = RC.compare(src.kq.bangluong, parsed.rows), tk = cmp.tongKet;
        var lech = cmp.rows.filter(function (r) { return r["Chênh lệch"] !== 0; });
        var sach = !lech.length && !tk.thieuTrongExcel && !tk.khongKhopApp && cmp.rows.length;
        card.appendChild(h("div", { class: sach ? "ok" : "warn", "data-dc-tongket": "1", html: "<b>Tổng kết đối chiếu</b>: app có <b>" + tk.tongApp + "</b> nhân viên, Excel có <b>" + tk.tongExcel + "</b> dòng người · đã đối chiếu <b>" + tk.daDoiChieu + "</b> người · thiếu trong Excel <b>" + tk.thieuTrongExcel + "</b> · Excel không khớp app <b>" + tk.khongKhopApp + "</b> · có chênh lệch <b>" + tk.coChenhLech + "</b> người (<b>" + lech.length + "</b> dòng chênh lệch trên " + cmp.rows.length + " dòng chỉ tiêu đã đối chiếu)." + (sach ? " Khớp hoàn toàn." : "") + (!cmp.rows.length ? " Không có chỉ tiêu nào đối chiếu được — kiểm tra lại cột trong file." : "") }));
        if (cmp.thieuTrongExcel.length) card.appendChild(thieuTrongExcelPanel(cmp));
        if (cmp.khongKhop.length) card.appendChild(khongKhopPanel(cmp));
        if (lech.length) {
          var onlyLech = h("input", { type: "checkbox" }); onlyLech.checked = st.dcOnlyLech !== false;
          onlyLech.addEventListener("change", function () { st.dcOnlyLech = onlyLech.checked; render(); });
          card.appendChild(h("label", { class: "chk" }, [onlyLech, " Chỉ hiện dòng lệch"]));
        }
        var showRows = (st.dcOnlyLech !== false) ? lech : cmp.rows;
        card.appendChild(simpleTable(showRows));
        card.appendChild(btn("⬇ Xuất Excel đối chiếu", "", function () {
          saveXlsx("DoiChieu_" + kyKey(st.nam, st.thang) + ".xlsx", doiChieuSheets(cmp));
          audit("Xuất Excel đối chiếu lương", kyLabel(kyKey(st.nam, st.thang)) + " · file nguồn: " + st.dcFile);
        }));
        // Riêng tăng ca: đối chiếu chi tiết hơn nếu file có đủ cột (mục XVII)
        var parsedTC = RC.parseSheet(arr, RC.CHI_TIEU_TANGCA, { firstRow: firstRow });
        if (parsedTC.matched.length) {
          var cmpTC = RC.compare(src.kq.bangluong, parsedTC.rows, RC.CHI_TIEU_TANGCA);
          var lechTC = cmpTC.rows.filter(function (r) { return r["Chênh lệch"] !== 0; });
          card.appendChild(h("div", { class: "fh", text: "Đối chiếu chi tiết tăng ca" }));
          card.appendChild(h("div", { class: lechTC.length ? "warn" : "ok", text: lechTC.length ? lechTC.length + " dòng chênh lệch tăng ca." : "Khớp hoàn toàn." }));
          card.appendChild(simpleTable(lechTC.length ? lechTC : cmpTC.rows));
        }
      }
    }
    card.appendChild(h("div", { class: "hint", style: "margin-top:10px", text: "Chưa hỗ trợ đối chiếu Đại Hiệp theo từng ngày ở màn hình này — dùng sheet \"Bu luong theo ngay - DH\" trong file Excel Phân bổ khối lượng (Báo cáo lương → Sản lượng) để so sánh thủ công theo ngày." }));
    w.appendChild(card); return w;
  }
  /** Các dòng Excel không đối chiếu được, nhóm theo lý do; mỗi dòng nêu số dòng Excel, mã NV và họ tên để đối chiếu với file. */
  function khongKhopPanel(cmp) {
    var box = h("div", { class: "warn", "data-dc-khongkhop": "1" }, [h("div", { html: "<b>⚠ Có trong Excel, không khớp app: " + cmp.khongKhop.length + " dòng KHÔNG đối chiếu được</b> — không tự đoán người; sửa mã NV hoặc họ tên trong file rồi đối chiếu lại:" })]);
    Object.keys(RC.LOAI).map(function (k) { return RC.LOAI[k]; }).forEach(function (loai) {
      var items = cmp.khongKhop.filter(function (x) { return x.loai === loai; }); if (!items.length) return;
      box.appendChild(h("div", { class: "fh", text: loai + " (" + items.length + ")" }));
      var list = h("ul");
      items.slice(0, 30).forEach(function (x) {
        list.appendChild(h("li", { text: "Dòng " + (x.dong || "?") + " · Mã NV: " + (x.ma || "(trống)") + " · " + (x.hoTen || "(không có họ tên)") + (x.ghiChu ? " — " + x.ghiChu : "") }));
      });
      if (items.length > 30) list.appendChild(h("li", { text: "… và " + (items.length - 30) + " dòng nữa (xem đầy đủ trong file Excel đối chiếu)." }));
      box.appendChild(list);
    });
    return box;
  }
  /** Người có trong app nhưng không có dòng Excel nào khớp (chiều ngược lại của "không khớp app"). */
  function thieuTrongExcelPanel(cmp) {
    var items = cmp.thieuTrongExcel, box = h("div", { class: "warn", "data-dc-thieu": "1" }, [h("div", { html: "<b>⚠ Có trong app, thiếu trong Excel: " + items.length + " người</b> — chưa có dòng Excel nào được đối chiếu với họ (kể cả khi các số còn lại đều khớp):" })]);
    var list = h("ul");
    items.slice(0, 30).forEach(function (x) { list.appendChild(h("li", { text: (x.ma || "(không có mã)") + " · " + (x.hoTen || "(không có họ tên)") + (x.ghiChu ? " — " + x.ghiChu : "") })); });
    if (items.length > 30) list.appendChild(h("li", { text: "… và " + (items.length - 30) + " người nữa (xem đầy đủ trong file Excel đối chiếu)." }));
    box.appendChild(list);
    return box;
  }
  /** Các sheet của file Excel đối chiếu — cùng số liệu với màn hình (tổng kết, thiếu trong Excel, không khớp app, chênh lệch). */
  function doiChieuSheets(cmp) {
    var tk = cmp.tongKet, sheets = [{ name: "TongKet", cols: ["Chỉ tiêu", "Số lượng"], rows: [
      { "Chỉ tiêu": "Nhân viên trong app", "Số lượng": tk.tongApp }, { "Chỉ tiêu": "Dòng người trong Excel", "Số lượng": tk.tongExcel },
      { "Chỉ tiêu": "Đã đối chiếu (người)", "Số lượng": tk.daDoiChieu }, { "Chỉ tiêu": "Có trong app, thiếu trong Excel (người)", "Số lượng": tk.thieuTrongExcel },
      { "Chỉ tiêu": "Có trong Excel, không khớp app (dòng)", "Số lượng": tk.khongKhopApp }, { "Chỉ tiêu": "Người có chênh lệch", "Số lượng": tk.coChenhLech }] }];
    sheets.push({ name: "ThieuTrongExcel", cols: ["Mã NV", "Họ tên", "Ghi chú"], rows: cmp.thieuTrongExcel.map(function (x) { return { "Mã NV": x.ma, "Họ tên": x.hoTen, "Ghi chú": x.ghiChu }; }) });
    sheets.push({ name: "KhongKhopNguoi", cols: ["Dòng Excel", "Mã NV", "Họ tên", "Loại", "Ghi chú"], rows: cmp.khongKhop.map(function (x) { return { "Dòng Excel": x.dong || "", "Mã NV": x.ma, "Họ tên": x.hoTen, "Loại": x.loai, "Ghi chú": x.ghiChu }; }) });
    sheets.push({ name: "DoiChieu", cols: cmp.rows.length ? Object.keys(cmp.rows[0]) : ["Dòng Excel", "Mã NV", "Họ và tên", "Chỉ tiêu", "Excel", "App", "Chênh lệch", "Loại lệch"], rows: cmp.rows });
    return sheets;
  }
