/** main.js — khởi động: Store/DB → đăng nhập (đơn vị) → nạp dữ liệu → điều hướng giữa các trang. */
(function (root) {
  'use strict';
  const HAK = (root.HAK = root.HAK || {});
  const { $, $$, toast, setTheme, toggleTheme } = HAK.UI;
  const TITLES = { home: 'Tổng quan', data: 'Bảng dữ liệu', payroll: 'Tính lương', settings: 'Cài đặt', help: 'Hướng dẫn' };
  const HELP = '<div class="card"><div class="card-body"><h5>Cách làm lương một kỳ</h5><ol><li><b>Tổng quan → Nạp danh mục mẫu</b> (lần đầu cho mỗi đơn vị), rồi chỉnh mã lương, phụ cấp, bảo hiểm, biểu thuế ở <b>Bảng dữ liệu</b>.</li><li><b>Nhân sự</b>: mỗi người một dòng — Mã tiền lương, Lương thỏa thuận, Mã tăng ca, Mã phụ cấp, Mã BHXH, Mã TNCN. Chi tiết nhân sự: người phụ thuộc, mã giảm trừ.</li><li><b>Chấm công</b> (và Sản lượng, Tiền cơm, Thưởng / Tạm ứng): nhập tay hoặc <b>⬆ Nhập Excel</b> — app tự nhận bảng theo tiêu đề cột.</li><li><b>Tính lương</b>: chọn tháng / năm, kiểm tra cảnh báo, bấm <b>Tính lương</b> → xem Bảng lương, BHXH, Thuế TNCN → <b>Xuất Excel</b>.</li></ol><h6 class="mt-3">Mã công trong chấm công</h6><p class="mb-1">BT = công bình thường · CL = lễ · PN = phép năm · CC = công tính cơm · TC… = tăng ca. Ô ngày có thể ghi <code>1QC</code> = 1 công + nhãn công tác QC (tự cộng phụ cấp công tác theo mã phụ cấp QC).</p><h6 class="mt-3">Lưu ý</h6><ul><li>Dữ liệu nằm trên máy này (IndexedDB) — <b>sao lưu</b> cuối mỗi kỳ ở Cài đặt → Sao lưu.</li><li>Danh mục có hiệu lực theo ngày: đổi mức lương = thêm dòng mới với “Hiệu lực từ”, dòng cũ đặt “Hiệu lực đến”. Kỳ cũ tính lại vẫn ra đúng mức của kỳ đó.</li><li>Mức giảm trừ gia cảnh, biểu thuế TNCN, tỷ lệ bảo hiểm trong danh mục mẫu cần đối chiếu theo quy định hiện hành.</li></ul></div></div>';

  function route() {
    const key = ((location.hash.match(/^#\/(\w+)/) || [])[1]) || 'home', k = TITLES[key] ? key : 'home';
    if (HAK.PagesData && HAK.PagesData.flush) HAK.PagesData.flush();   // ghi ngay các ô vừa sửa trước khi rời trang
    $$('.page').forEach((p) => { p.hidden = p.id !== 'page-' + k; });
    $$('.sb-link').forEach((a) => a.classList.toggle('active', a.dataset.nav === k));
    $('#pageTitle').textContent = TITLES[k]; document.title = 'HAK · TÍNH LƯƠNG — ' + TITLES[k];
    $('#sidebar').classList.remove('open'); $('#sbBackdrop').classList.remove('show');
    const r = { home: HAK.PagesHome, data: HAK.PagesData, payroll: HAK.PagesPayroll, settings: HAK.PagesSettings }[k];
    if (r) r.render(); else if (k === 'help') $('#page-help').innerHTML = HELP;
    window.scrollTo(0, 0);
  }
  async function boot() {
    HAK.Store.onError = () => toast('Không lưu được cài đặt (bộ nhớ trình duyệt đầy hoặc bị chặn).', 'error');
    // khôi phục khóa Store từ IndexedDB nếu localStorage bị xóa
    try { const kv = await HAK.DB.kvAll(); kv.forEach((r) => { if (HAK.Store.get(r.key, undefined) === undefined) HAK.Store.set(r.key, r.val, { dbCommitted: true }); }); } catch (e) { /* bỏ qua */ }
    HAK.Config.data.companies = (HAK.Store.get('hak.config.v1', null) || {}).companies || HAK.Config.data.companies;
    $('#btnTheme').addEventListener('click', toggleTheme); $('#btnThemeSb').addEventListener('click', toggleTheme);
    $('#btnMenu').addEventListener('click', () => { $('#sidebar').classList.toggle('open'); $('#sbBackdrop').classList.toggle('show'); }); $('#sbBackdrop').addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#sbBackdrop').classList.remove('show'); });
    HAK.DB.requestPersist();
    await HAK.Auth.require();
    HAK.Auth.init();
    await HAK.Data.load();
    window.addEventListener('hashchange', route); route();
  }
  document.addEventListener('DOMContentLoaded', () => boot().catch((e) => { console.error(e); toast('Lỗi khởi động: ' + (e.message || e), 'error'); }));
})(window);
