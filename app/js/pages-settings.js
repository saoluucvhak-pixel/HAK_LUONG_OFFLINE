/** pages-settings.js — ⚙️ Cài đặt: Đơn vị, Tài khoản (auth.js), Sao lưu / khôi phục, tình trạng bộ nhớ. */
(function (root) {
  'use strict';
  const HAK = (root.HAK = root.HAK || {});
  const $ = (s) => document.querySelector(s), esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, t) => HAK.UI.toast(m, t);

  function drawUnits() {
    const list = HAK.Config.data.companies;
    $('#stUnits').innerHTML = '<div class="small muted mb-2">Mỗi đơn vị có dữ liệu lương riêng. Tài khoản Nhân viên chỉ làm được đơn vị được gán (ở tab Tài khoản).</div><div class="tbl-wrap"><table class="table table-sm align-middle"><thead><tr><th>Mã</th><th>Tên đơn vị</th><th>Tên ngắn</th><th>Loại</th><th>MST</th><th></th></tr></thead><tbody>' +
      list.map((c, i) => '<tr><td><code>' + esc(c.id) + '</code></td><td><input class="form-control form-control-sm" data-u="' + i + '" data-f="name" value="' + esc(c.name) + '"></td><td><input class="form-control form-control-sm" data-u="' + i + '" data-f="short" value="' + esc(c.short) + '"></td><td><select class="form-select form-select-sm" data-u="' + i + '" data-f="kind"><option' + (c.kind === 'Công ty' ? ' selected' : '') + '>Công ty</option><option' + (c.kind === 'Chi nhánh' ? ' selected' : '') + '>Chi nhánh</option></select></td><td><input class="form-control form-control-sm" data-u="' + i + '" data-f="tax" value="' + esc(c.tax || '') + '"></td><td><button class="btn btn-sm btn-outline-danger" data-udel="' + i + '" type="button">✕</button></td></tr>').join('') + '</tbody></table></div><button class="btn btn-sm btn-primary" id="stUAdd" type="button">＋ Thêm đơn vị</button>';
  }
  async function drawBackup() {
    const st = await HAK.DB.status(), mb = (n) => (n == null ? '?' : (n / 1048576).toFixed(1) + ' MB');
    $('#stBackup').innerHTML = '<div class="row g-3"><div class="col-md-6"><div class="card h-100"><div class="card-body"><h6>💾 Sao lưu toàn bộ</h6><div class="small muted mb-2">Một file .json chứa dữ liệu lương của mọi đơn vị, kết quả các kỳ và cài đặt. Nên sao lưu cuối mỗi kỳ.</div><button class="btn btn-primary btn-sm" id="bkOut" type="button">⬇ Sao lưu ra file</button></div></div></div>' +
      '<div class="col-md-6"><div class="card h-100 admin-only"><div class="card-body"><h6>♻️ Khôi phục từ file</h6><div class="small muted mb-2">Gộp / thay dữ liệu từ file sao lưu (không đụng tới tài khoản đăng nhập của máy này).</div><label class="btn btn-outline-primary btn-sm mb-0">Chọn file sao lưu…<input type="file" id="bkIn" accept=".json" hidden></label> <label class="small ms-2"><input type="checkbox" id="bkReplace"> thay thế toàn bộ</label></div></div></div></div>' +
      '<div class="small muted mt-3">Bộ nhớ: ' + (st.backend === 'idb' ? 'IndexedDB' : '<b class="text-danger">chỉ RAM — dữ liệu sẽ mất khi đóng</b>') + ' · đã dùng ' + mb(st.usage) + ' / ' + mb(st.quota) + (st.persisted ? ' · đã yêu cầu giữ bền ✔' : ' · <a href="#/settings" id="bkPersist">yêu cầu giữ bền</a>') + '</div>';
  }
  function render() {
    const host = $('#page-settings'); if (!host) return;
    if (!host.dataset.built) {
      host.dataset.built = '1';
      host.innerHTML = '<ul class="nav nav-pills mb-3"><li class="nav-item admin-only"><button class="nav-link active" data-bs-toggle="pill" data-bs-target="#tab-units" type="button">🏢 Đơn vị</button></li><li class="nav-item"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-account" type="button">👤 Tài khoản</button></li><li class="nav-item"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-backup" type="button">💾 Sao lưu</button></li></ul>' +
        '<div class="tab-content"><div class="tab-pane fade show active admin-only" id="tab-units"><div class="card"><div class="card-body" id="stUnits"></div></div></div><div class="tab-pane fade" id="tab-account"><div id="authAccount"></div></div><div class="tab-pane fade" id="tab-backup"><div class="card"><div class="card-body" id="stBackup"></div></div></div></div>';
      host.addEventListener('change', (e) => {
        const u = e.target.dataset && e.target.dataset.u; if (u !== undefined && e.target.dataset.f) { HAK.Config.data.companies[+u][e.target.dataset.f] = e.target.value; HAK.Config.save(); return; }
        if (e.target.id === 'bkIn') {
          const f = e.target.files[0]; e.target.value = ''; if (!f) return;
          f.text().then(async (t) => { const pack = JSON.parse(t); await HAK.Data.importAll(pack, { replace: $('#bkReplace') && $('#bkReplace').checked }); toast('Đã khôi phục. Đang tải lại…', 'success'); setTimeout(() => location.reload(), 900); }).catch((x) => toast('File không hợp lệ: ' + x.message, 'error'));
        }
      });
      host.addEventListener('click', async (e) => {
        if (e.target.id === 'stUAdd') { HAK.Config.data.companies.push({ id: 'u' + Date.now().toString(36), kind: 'Công ty', name: 'Đơn vị mới', short: 'Mới', tax: '', address: '' }); HAK.Config.save(); drawUnits(); }
        const d = e.target.closest('[data-udel]'); if (d) { const c = HAK.Config.data.companies; if (c.length <= 1) { toast('Phải còn ít nhất 1 đơn vị.', 'warning'); return; } HAK.UI.confirmClick(d, () => { c.splice(+d.dataset.udel, 1); HAK.Config.save(); drawUnits(); }, 'Xóa?'); }
        if (e.target.id === 'bkOut') {
          const pack = await HAK.Data.exportAll(); delete pack.kv['hak.auth.v1'];
          const blob = new Blob([JSON.stringify({ app: 'hak-luong', v: 1, at: new Date().toISOString(), ...pack })], { type: 'application/json' });
          if (await HAK.Excel.saveBlob(blob, 'SaoLuu_HakLuong_' + new Date().toISOString().slice(0, 10) + '.json')) toast('Đã sao lưu.', 'success');
        }
        if (e.target.id === 'bkPersist') { e.preventDefault(); toast((await HAK.DB.requestPersist()) ? 'Trình duyệt đã đồng ý giữ dữ liệu bền.' : 'Trình duyệt chưa cấp quyền giữ bền.', 'info'); drawBackup(); }
      });
    }
    drawUnits(); drawBackup(); HAK.Auth.renderAccount();
  }
  HAK.PagesSettings = { render };
})(typeof window !== 'undefined' ? window : globalThis);
