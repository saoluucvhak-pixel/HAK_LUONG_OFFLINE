// ===== UI / HAK PAYMENT VOUCHER (v2.1.22) — PHIẾU CHI tiền mặt in được (A6-14 / Q10 phần 3/3, chủ chọn "thêm" 24/11/2026) =====
// Mỗi chứng từ thanh toán TIỀN MẶT (sổ chứng từ db.ttluong) → 1 trang A4 dọc: số, ngày, người nhận, lý do, số tiền + BẰNG CHỮ, khối ký (Người lập phiếu, Kế toán trưởng, Thủ quỹ, Giám đốc, Người nhận tiền).
// Chỉ ĐỌC chứng từ đã lập — không lập/sửa/đổi số tiền. Phiếu chưa duyệt in kèm "CHƯA DUYỆT". Hàm thuần; nạp bằng <script> hoặc require().
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  var ui = root.HAKUI = root.HAKUI || {};
  ui.paymentVoucher = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  var D = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"], UNIT = ["", "nghìn", "triệu", "tỷ"];
  function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function money(v) { var n = Math.round(Number(v) || 0), s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); return (n < 0 ? "-" : "") + s; }
  function dmy(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || "")); return m ? m[3] + "/" + m[2] + "/" + m[1] : String(v || ""); }
  function three(n, full) { // đọc 1 nhóm 3 chữ số; full = có nhóm cao hơn đứng trước (đọc "không trăm", "linh")
    var h = Math.floor(n / 100), t = Math.floor(n / 10) % 10, u = n % 10, out = [];
    if (h > 0 || full) out.push(D[h] + " trăm");
    if (t === 0) { if (u > 0 && (h > 0 || full)) out.push("linh"); } else if (t === 1) out.push("mười"); else out.push(D[t] + " mươi");
    if (u > 0) out.push(u === 1 && t >= 2 ? "mốt" : u === 5 && t >= 1 ? "lăm" : D[u]);
    return out.join(" ");
  }
  /** Số tiền (đồng) → chữ, viết hoa chữ đầu, kết thúc "đồng". Làm tròn đồng; âm/không hợp lệ → "Không đồng". */
  function words(v) {
    var n = Math.round(Number(v)); if (!isFinite(n) || n <= 0) return "Không đồng";
    var groups = []; while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
    var parts = [];
    for (var i = groups.length - 1; i >= 0; i--) {
      var g = groups[i]; if (g === 0) continue;
      var unit = i === 0 ? "" : i <= 3 ? UNIT[i] : (UNIT[i % 3 === 0 ? 3 : i % 3] + (i > 3 ? " " + UNIT[3] : "")); // 1e12 = "nghìn tỷ"
      if (i === 4) unit = "nghìn tỷ"; else if (i === 5) unit = "triệu tỷ"; else if (i === 6) unit = "tỷ tỷ";
      parts.push(three(g, i < groups.length - 1 && true) + (unit ? " " + unit : ""));
    }
    var s = parts.join(" ").replace(/\s+/g, " ").trim(); return s.charAt(0).toUpperCase() + s.slice(1) + " đồng";
  }
  var CSS = "@page{size:A4 portrait;margin:16mm}*{box-sizing:border-box}body{font-family:'Times New Roman',Georgia,serif;font-size:12pt;color:#000;margin:0}" +
    ".pc{page-break-after:always;break-after:page;position:relative;min-height:250mm}.pc:last-child{page-break-after:auto;break-after:auto}" +
    ".top{display:flex;justify-content:space-between;align-items:flex-start}.co{font-weight:700;text-transform:uppercase}.mau{text-align:center;font-size:10pt}h1{text-align:center;font-size:20pt;margin:8mm 0 1mm}" +
    ".sub{text-align:center;margin:0 0 6mm}.row{margin:2.5mm 0;line-height:1.6}.row b{font-weight:700}.dots{border-bottom:1px dotted #000;display:inline-block;min-width:60mm}" +
    ".tien{font-size:14pt;font-weight:700}.date{text-align:right;font-style:italic;margin:8mm 4mm 0 0}.sign{display:flex;justify-content:space-between;text-align:center;margin-top:2mm}.sign div{width:19%}.sign i{font-size:9pt}.sign .sp{height:28mm}" +
    ".stamp{position:absolute;right:6mm;top:34mm;border:2px solid #b00020;color:#b00020;font-weight:700;padding:1mm 3mm;transform:rotate(-8deg)}.note{position:absolute;left:0;right:0;bottom:0;font-size:9pt;border-top:.5px solid #888;padding-top:1.5mm}";
  /** @param vm { congTy, diaChi, vouchers:[{ so, ngay, ky, maNV, hoTen, soTien, lyDo, nguoiLap, nguoiDuyet, trangThai }] } */
  function html(vm) {
    var out = ['<!doctype html><html><head><meta charset="utf-8"><title>Phiếu chi</title><style>' + CSS + "</style></head><body>"];
    (vm.vouchers || []).forEach(function (v) {
      var chua = v.trangThai === "Đã lập";
      var h = '<section class="pc">' + (chua ? '<div class="stamp">CHƯA DUYỆT</div>' : "");
      h += '<div class="top"><div><div class="co">' + esc(vm.congTy || "") + "</div>" + (vm.diaChi ? "<div>" + esc(vm.diaChi) + "</div>" : "") + '</div><div class="mau">Mẫu số 02 - TT<br>(Ban hành theo chế độ kế toán hiện hành)</div></div>';
      h += "<h1>PHIẾU CHI</h1><p class=\"sub\">Ngày " + esc(dmy(v.ngay)) + "<br>Số: " + esc(v.so) + "</p>";
      h += '<div class="row">Họ và tên người nhận tiền: <b>' + esc(v.hoTen) + "</b> · Mã NV: " + esc(v.maNV) + "</div>";
      h += '<div class="row">Lý do chi: ' + esc(v.lyDo || ("Chi lương kỳ " + (v.ky || ""))) + "</div>";
      h += '<div class="row">Số tiền: <span class="tien">' + money(v.soTien) + ' đồng</span></div>';
      h += '<div class="row">Bằng chữ: <b>' + esc(words(v.soTien)) + " chẵn.</b></div>";
      h += '<div class="row">Kèm theo: ……… chứng từ gốc (bảng lương kỳ ' + esc(v.ky || "") + ").</div>";
      h += '<p class="date">Ngày …… tháng …… năm ……</p><div class="sign"><div><b>Người lập phiếu</b><br><i>(Ký, ghi rõ họ tên)</i><div class="sp"></div>' + esc(v.nguoiLap || "") + '</div><div><b>Kế toán trưởng</b><br><i>(Ký, ghi rõ họ tên)</i><div class="sp"></div>' + esc(v.nguoiDuyet || "") + '</div><div><b>Thủ quỹ</b><br><i>(Ký, ghi rõ họ tên)</i><div class="sp"></div></div><div><b>Giám đốc</b><br><i>(Ký, đóng dấu)</i><div class="sp"></div></div><div><b>Người nhận tiền</b><br><i>(Ký, ghi rõ họ tên)</i><div class="sp"></div></div></div>';
      h += '<div class="note">Đã nhận đủ số tiền (viết bằng chữ): ……………………………………………………………………</div></section>';
      out.push(h);
    });
    out.push("</body></html>"); return out.join("");
  }
  /** Chọn chứng từ TIỀN MẶT còn hiệu lực (bỏ đã hủy) từ sổ chứng từ → dạng phiếu. */
  function pick(lines) {
    return (lines || []).filter(function (l) { return l && String(l["Hình thức"] || "") === "Tiền mặt" && l["Trạng thái"] !== "Đã hủy"; }).map(function (l) {
      return { so: l["Số chứng từ"], ngay: l["Ngày thanh toán"] || l["Ngày duyệt"] || l["Ngày lập"], ky: l["Kỳ"], maNV: l["Mã NV"], hoTen: l["Họ và tên"], soTien: l["Số tiền"], lyDo: "Chi lương kỳ " + l["Kỳ"], nguoiLap: l["Người lập"], nguoiDuyet: l["Người duyệt"], trangThai: l["Trạng thái"] };
    });
  }
  function filename(ky, n, so) { return so && n === 1 ? "PhieuChi_" + so + ".pdf" : "PhieuChi_" + ky + "_" + n + "phieu.pdf"; }
  return { words: words, html: html, pick: pick, filename: filename, money: money, esc: esc };
});
