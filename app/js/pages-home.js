/** pages-home.js — 🏠 Tổng quan: các bước làm lương trong kỳ + tình trạng dữ liệu của đơn vị đang làm. */
(function (root) {
  'use strict';
  const HAK = (root.HAK = root.HAK || {});
  const $ = (s) => document.querySelector(s), esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = () => HAK.Data;
  const period = () => { const p = HAK.Store.get('hak.period', null), d = new Date(); return p || { nam: d.getFullYear(), thang: d.getMonth() + 1 }; };
  const inM = (t, col, p) => D().rows(t).filter((r) => HAK.Payroll.inMonth(r[col], p.nam, p.thang)).length;

  function render() {
    const host = $('#page-home'); if (!host) return;
    const p = period(), unit = HAK.Config.data.companies.find((c) => c.id === D().unit()) || {}, dmEmpty = !D().count('DM_LUONG') && !D().count('DM_BAOHIEM');
    const row = (ico, label, n, hint, go) => '<tr><td>' + ico + '</td><td><b>' + label + '</b><div class="small muted">' + hint + '</div></td><td class="num">' + (n > 0 ? '<span class="badge text-bg-success">' + n + ' dòng</span>' : '<span class="badge text-bg-warning">Chưa có</span>') + '</td><td class="text-end"><a class="btn btn-sm btn-outline-primary" href="#/data" data-go="' + go + '">Mở</a></td></tr>';
    host.innerHTML = '<div class="hero mb-4"><h2>Tính lương offline — ' + esc(unit.short || unit.name || '') + '</h2><p>Kỳ lương <b>' + p.thang + '/' + p.nam + '</b>. Nhập danh mục → nhân sự → chấm công / sản lượng → phát sinh (thưởng, tạm ứng) rồi bấm <b>Tính lương</b>: ra bảng lương, BHXH và thuế TNCN. Dữ liệu nằm trên máy này, không cần mạng.</p><a href="#/payroll" class="btn btn-light btn-lg fw-semibold">💰 Tính lương</a></div>' +
      (dmEmpty ? '<div class="alert alert-info d-flex flex-wrap align-items-center gap-2"><div class="me-auto"><b>Đơn vị này chưa có danh mục lương.</b> Nạp “Quy chế lương hiện hành” của HAK Group (mã lương, phụ cấp, tăng ca, bảo hiểm, biểu thuế…) rồi chỉnh theo thực tế.</div><button class="btn btn-primary btn-sm" id="hmSeed" type="button">Nạp danh mục mẫu</button></div>' : '') +
      '<div class="card mb-3"><div class="card-body"><div class="sec-title mb-2">Tình trạng dữ liệu kỳ ' + p.thang + '/' + p.nam + '</div><table class="table align-middle mb-0"><tbody>' +
      row('1️⃣', 'Danh mục (mã lương, phụ cấp, bảo hiểm, thuế…)', D().count('DM_LUONG') + D().count('DM_BAOHIEM') + D().count('DM_PHUCAP'), 'Có hiệu lực theo ngày — đổi mức thì thêm dòng mới.', 'DM_LUONG') +
      row('2️⃣', 'Nhân sự', D().count('NL_NHANSU'), 'Mã lương, tăng ca, phụ cấp, BHXH, thuế cho từng người.', 'NL_NHANSU') +
      row('3️⃣', 'Chấm công tháng ' + p.thang, inM('NL_CHAMCONG', 'Ngày tính công', p), 'Mỗi dòng = 1 người × 1 hình thức công × 1 tháng.', 'NL_CHAMCONG') +
      row('4️⃣', 'Sản lượng + bơm dăm tháng ' + p.thang, inM('DL_SANLUONG', 'Ngày cân', p) + inM('DL_BANDAM', 'Ngày cân', p), 'Phiếu cân đã gán mã nhân viên (chỉ cho lương sản phẩm).', 'DL_SANLUONG') +
      row('5️⃣', 'Thưởng / trừ khác / tạm ứng tháng ' + p.thang, inM('NL_PSLUONG', 'Ngày hạch toán', p) + inM('NL_UNGLUONG', 'Ngày hạch toán', p), 'Các khoản phát sinh trong kỳ.', 'NL_PSLUONG') +
      '</tbody></table></div></div><div class="small muted">💡 Có sẵn file Excel nhập liệu cũ? Vào <b>Bảng dữ liệu</b> → <b>⬆ Nhập Excel</b>: app tự nhận bảng theo tiêu đề cột.</div>';
    host.onclick = async (e) => {
      const g = e.target.closest('[data-go]'); if (g) { HAK.PagesData.setTable(g.dataset.go); return; }
      if (e.target.id === 'hmSeed') { for (const t of Object.keys(HAK.Sample.dm)) { if (D().count(t)) continue; const today = HAK.UI.todayISO(); await D().setRows(t, HAK.Sample.dm[t].map((r) => Object.assign({ 'Ngày cập nhật': today }, r))); } HAK.UI.toast('Đã nạp danh mục mẫu. Đối chiếu lại mức giảm trừ, biểu thuế, tỷ lệ bảo hiểm theo quy định hiện hành.', 'success', 9000); render(); }
    };
  }
  HAK.PagesHome = { render };
})(typeof window !== 'undefined' ? window : globalThis);
