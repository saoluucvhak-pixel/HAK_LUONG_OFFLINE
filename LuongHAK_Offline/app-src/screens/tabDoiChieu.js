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
      var parsed = RC.parseSheet(arr);
      if (parsed.headerRow < 0) {
        card.appendChild(h("div", { class: "warn", text: "Không nhận ra dòng tiêu đề (cần có cột 'Mã NV' hoặc 'Họ và tên') trong sheet '" + st.dcSheet + "'. Thử chọn sheet khác." }));
      } else {
        card.appendChild(h("div", { class: "hint", html: "Đã đọc <b>" + parsed.rows.length + "</b> dòng, nhận ra <b>" + parsed.matched.length + "</b> chỉ tiêu: " + esc(parsed.matched.join(", ") || "(không có)") + (parsed.unmatched.length ? ". Cột KHÔNG nhận ra (bỏ qua): " + esc(parsed.unmatched.slice(0, 15).join(", ")) + (parsed.unmatched.length > 15 ? "…" : "") : "") }));
        var cmp = RC.compare(src.kq.bangluong, parsed.rows);
        var lech = cmp.rows.filter(function (r) { return r["Chênh lệch"] !== 0; });
        card.appendChild(h("div", { class: lech.length ? "warn" : "ok", text: lech.length ? lech.length + " dòng chênh lệch, trên " + cmp.rows.length + " dòng đã đối chiếu (" + parsed.rows.length + " người trong file Excel)." : cmp.rows.length ? "Khớp hoàn toàn trên " + cmp.rows.length + " dòng đã đối chiếu." : "Không có chỉ tiêu nào đối chiếu được — kiểm tra lại cột trong file." }));
        if (cmp.khongKhop.length) card.appendChild(h("div", { class: "warn", html: "<b>⚠ " + cmp.khongKhop.length + " người trong file Excel KHÔNG khớp được với app</b> (không có Mã NV khớp, hoặc trùng họ tên nhiều người — không tự đoán):<br>" + cmp.khongKhop.slice(0, 20).map(function (x) { return esc(x.hoTen || x.ma); }).join(", ") + (cmp.khongKhop.length > 20 ? "…" : "") }));
        if (lech.length) {
          var onlyLech = h("input", { type: "checkbox" }); onlyLech.checked = st.dcOnlyLech !== false;
          onlyLech.addEventListener("change", function () { st.dcOnlyLech = onlyLech.checked; render(); });
          card.appendChild(h("label", { class: "chk" }, [onlyLech, " Chỉ hiện dòng lệch"]));
        }
        var showRows = (st.dcOnlyLech !== false) ? lech : cmp.rows;
        card.appendChild(simpleTable(showRows));
        if (cmp.rows.length) card.appendChild(btn("⬇ Xuất Excel đối chiếu", "", function () {
          var sheets = [{ name: "DoiChieu", cols: Object.keys(cmp.rows[0]), rows: cmp.rows }];
          if (cmp.khongKhop.length) sheets.push({ name: "KhongKhopNguoi", cols: ["ma", "hoTen"], rows: cmp.khongKhop });
          saveXlsx("DoiChieu_" + kyKey(st.nam, st.thang) + ".xlsx", sheets);
          audit("Xuất Excel đối chiếu lương", kyLabel(kyKey(st.nam, st.thang)) + " · file nguồn: " + st.dcFile);
        }));
        // Riêng tăng ca: đối chiếu chi tiết hơn nếu file có đủ cột (mục XVII)
        var parsedTC = RC.parseSheet(arr, RC.CHI_TIEU_TANGCA);
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
