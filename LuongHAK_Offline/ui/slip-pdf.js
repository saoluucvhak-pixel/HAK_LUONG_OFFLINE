// ===== UI / HAK SLIP PDF (v2.1.18) — PHIẾU LƯƠNG PDF TỪNG NGƯỜI (A6-12; chủ chọn "làm luôn" 24/11/2026) =====
// Một trang A4 dọc cho MỖI người: tiêu đề công ty, "PHIẾU LƯƠNG THÁNG mm/yyyy", thông tin người, 3 phần I. Thu nhập · II. Khấu trừ · III. Tạm ứng, THỰC LĨNH, khối ký + "Ngày …… tháng …… năm ……".
// Chỉ ĐỌC số engine đã tính (lines do slipLines() dựng); không tính lại tiền. Kỳ chưa chốt → banner + nền chữ "TẠM TÍNH". Mọi chuỗi đều được escape. Hàm thuần; nạp bằng <script> hoặc require().
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  var ui = root.HAKUI = root.HAKUI || {};
  ui.slipPdf = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function money(v) { var n = Math.round(Number(v) || 0), s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); return (n < 0 ? "-" : "") + s; }
  var CSS = "@page{size:A4 portrait;margin:14mm 14mm 16mm}*{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;color:#111;margin:0}" +
    ".slip{page-break-after:always;break-after:page;position:relative;min-height:255mm}.slip:last-child{page-break-after:auto;break-after:auto}" +
    ".co{font-weight:700;text-transform:uppercase;font-size:12pt}h1{text-align:center;font-size:16pt;margin:6mm 0 3mm}" +
    ".sub{text-align:center;color:#555;margin:0 0 5mm;font-size:10pt}.draft{text-align:center;color:#b00020;font-weight:700;border:1.5px solid #b00020;padding:2mm;margin:0 0 5mm}" +
    ".info{border:1px solid #9aa79f;padding:3mm 4mm;margin-bottom:5mm;line-height:1.5}.info b{font-size:12pt}" +
    "table{width:100%;border-collapse:collapse}td{padding:1.6mm 2mm;border-bottom:.5px solid #cfd6d2}td.m{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}" +
    "tr.sec td{background:#e8f0e8;font-weight:700;border-top:1px solid #9aa79f}tr.tot td{font-weight:700;border-top:1px solid #555}tr.grand td{font-size:13pt;background:#f3f7f3;border-top:2px solid #111;border-bottom:2px solid #111}" +
    ".date{text-align:right;font-style:italic;margin:9mm 4mm 0 0}.sign{display:flex;justify-content:space-around;text-align:center;margin-top:2mm}.sign div{width:42%}.sign i{font-size:9pt;color:#444}.sign .sp{height:24mm}" +
    ".note{position:absolute;left:0;right:0;bottom:0;font-size:8.5pt;color:#666;border-top:.5px solid #bbb;padding-top:1.5mm}" +
    ".wm{position:absolute;left:0;right:0;top:95mm;text-align:center;font-size:64pt;font-weight:800;color:rgba(176,0,32,.10);transform:rotate(-24deg);pointer-events:none;letter-spacing:4mm}" +
    "@media print{.slip{page-break-inside:avoid;break-inside:avoid}}";
  /**
   * @param vm { congTy, ky:"mm/yyyy", chot:bool, nguoiLap, slips:[{ maNV, hoTen, phongBan, tongCong, congChuan, lines:[{sec}|{label,value,tot,grand}] }] }
   * @returns chuỗi HTML đầy đủ (không có <script>)
   */
  function html(vm) {
    var tam = !vm.chot, out = ['<!doctype html><html><head><meta charset="utf-8"><title>Phiếu lương</title><style>' + CSS + "</style></head><body>"];
    (vm.slips || []).forEach(function (b) {
      var h = '<section class="slip">';
      if (tam) h += '<div class="wm">TẠM TÍNH</div>';
      if (vm.congTy) h += '<div class="co">' + esc(vm.congTy) + "</div>";
      h += "<h1>PHIẾU LƯƠNG THÁNG " + esc(vm.ky) + "</h1>";
      if (tam) h += '<div class="draft">BẢN TẠM TÍNH — kỳ lương CHƯA chốt, số liệu có thể thay đổi. Không dùng để thanh toán hoặc ký nhận.</div>';
      else h += '<p class="sub">Bảng lương đã chốt</p>';
      h += '<div class="info"><b>' + esc(b.hoTen) + "</b><br>Mã NV: " + esc(b.maNV) + (b.phongBan ? " · Phòng ban: " + esc(b.phongBan) : "") + "<br>Tổng công: " + esc(b.tongCong) + " / Công chuẩn: " + esc(b.congChuan) + "</div><table>";
      (b.lines || []).forEach(function (l) {
        if (l.sec) h += '<tr class="sec"><td colspan="2">' + esc(l.sec) + "</td></tr>";
        else h += '<tr class="' + (l.grand ? "tot grand" : l.tot ? "tot" : "") + '"><td>' + esc(l.label) + '</td><td class="m">' + money(l.value) + "</td></tr>";
      });
      h += '</table><p class="date">Ngày …… tháng …… năm ……</p><div class="sign"><div><b>Người lập</b><br><i>(Ký, ghi rõ họ tên)</i><div class="sp"></div>' + esc(vm.nguoiLap || "") + '</div><div><b>Người lao động nhận</b><br><i>(Ký, ghi rõ họ tên)</i><div class="sp"></div></div></div>';
      h += '<div class="note">Phiếu này chỉ dành cho người có tên ở trên — vui lòng giữ bí mật. Số liệu lấy từ bảng lương ' + (tam ? "tính tạm" : "đã chốt") + " của kỳ " + esc(vm.ky) + ".</div></section>";
      out.push(h);
    });
    out.push("</body></html>"); return out.join("");
  }
  function filename(ky, opt) { opt = opt || {}; var k = String(ky).replace("/", "-"), m = /^(\d{2})-(\d{4})$/.exec(k); if (m) k = m[2] + "-" + m[1]; return "PhieuLuong_TungNguoi_" + k + (opt.suffix ? "_" + opt.suffix : "") + (opt.chot ? "" : "_TAM") + ".pdf"; }
  return { html: html, filename: filename, esc: esc, money: money };
});
