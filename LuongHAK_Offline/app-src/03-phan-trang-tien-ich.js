  // ---------- Phân trang + tìm kiếm (PERF-03: 1.000 NV mở lưới chấm công 6,9 s, gõ 4 ký tự 19,9 s khi vẽ toàn bộ) ----------
  var PAGE_SIZES = [50, 100, 200, 500];
  function qOf(key) { return fold(String(st.qs[key] || "").trim()); }
  /** Thanh phân trang. Trả { start, end, el }; trang hiện tại nhớ theo bảng trong phiên làm việc. */
  function pager(key, total, onChange) {
    var size = +st.pageSize || 100, pages = Math.max(1, Math.ceil(total / size));
    var p = Math.min(Math.max(0, st.pg[key] || 0), pages - 1); st.pg[key] = p;
    var go = function (x) { st.pg[key] = Math.min(Math.max(0, x), pages - 1); onChange(); };
    var sel = h("select", { title: "Số dòng mỗi trang" }); PAGE_SIZES.forEach(function (n) { sel.appendChild(h("option", { value: n, text: n + " dòng/trang" })); }); sel.value = size;
    sel.addEventListener("change", function () { var first = p * size; st.pageSize = +sel.value; st.pg[key] = Math.floor(first / st.pageSize); saveUi(); onChange(); });
    var el = total <= PAGE_SIZES[0] ? null : h("div", { class: "pager noprint" }, [
      btn("«", "ghost", function () { go(0); }, "Trang đầu"), btn("‹", "ghost", function () { go(p - 1); }, "Trang trước"),
      h("span", { text: "Trang " + (p + 1) + "/" + pages + " · dòng " + (p * size + 1) + "–" + Math.min(total, (p + 1) * size) + " / " + total }),
      btn("›", "ghost", function () { go(p + 1); }, "Trang sau"), btn("»", "ghost", function () { go(pages - 1); }, "Trang cuối"), sel]);
    return { start: p * size, end: Math.min(total, (p + 1) * size), el: el };
  }

  // ---------- Tiện ích ----------
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "on") Object.keys(attrs.on).forEach(function (ev) { el.addEventListener(ev, attrs.on[ev]); });
      else if (k === "text") el.textContent = (typeof attrs[k] === "number" && isFinite(attrs[k]) && !Number.isInteger(attrs[k])) ? qtyText(attrs[k]) : attrs[k]; else if (k === "html") el.innerHTML = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }); // chữ → nút văn bản (icon emoji đầu chuỗi vẫn được đổi)
    return el;
  }
  function btn(text, cls, fn, title) { return h("button", { class: "b " + (cls || ""), text: text, title: title || "", on: { click: fn } }); }
  /** Số lượng (tấn…): làm tròn 3 số lẻ, dấu phẩy thập phân, dấu chấm hàng nghìn — không để lộ sai số dấu phẩy động (17.049999999999997). */
  function ky2() { return ("0" + st.thang).slice(-2); }
  function kyStr() { return st.nam + "-" + ky2(); }
  function rowInKy(r, def) {
    if (def.kyCol) return r[def.kyCol] === kyStr();
    if (def.dateCol) return (VAL.normDate(r[def.dateCol]) || "").slice(0, 7) === kyStr();
    return true;
  }
  function tenNV(ma) { for (var i = 0; i < db.nhanvien.length; i++) if (db.nhanvien[i]["Mã NV"] === ma) return db.nhanvien[i]["Họ và tên"] || ""; return ""; }
  function download(name, mime, content) {
    if(/^LuongHAK_backup_.*\.json$/.test(name)&&(db._yearArchives||[]).length){alert("Dữ liệu có kho hồ sơ năm. Hãy dùng Full Backup để mang theo cả hồ sơ năm và chứng từ khi đổi máy.");return;}
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type: mime })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
