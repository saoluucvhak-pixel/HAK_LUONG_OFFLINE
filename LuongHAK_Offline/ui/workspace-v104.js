// Presentation adapter for the inherited app. No payroll state or storage bridge is accessed.
(function () {
  'use strict';
  const VERSION = 'V10.4 · v2.0.0-alpha.47';
  const NAV_KEY = 'luonghak_db_v1_nav_collapsed';
  const main = document.querySelector('#main'), nav = document.querySelector('#nav');
  if (!main || !nav) return;
  const make = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text != null) el.textContent = text; return el; };
  let scheduled = false, hadDrawer = false, returnCode = '';
  function groups() {
    try { const value = JSON.parse(localStorage.getItem(NAV_KEY) || '{}'); return value && typeof value === 'object' ? value : {}; } catch (_) { return {}; }
  }
  function navigation() {
    const labels = ['Tổng quan', 'Nhân sự', 'Chấm công', 'Sản lượng', 'Nghiệp vụ tiền lương', 'Tính lương', 'Thanh toán lương', 'Báo cáo lương', 'Báo cáo khác', 'Báo cáo theo loại', 'Danh mục', 'Cài đặt'];
    const saved = groups(); let closed = false;
    for (const el of nav.children) {
      if (el.classList.contains('hak-nav-group')) {
        const label = el.querySelector('span').textContent.trim(), group = labels.indexOf(label) + 1;
        closed = group > 0 && !!saved['group_' + group];
        el.setAttribute('aria-expanded', String(!closed));
        el.classList.toggle('is-collapsed', closed);
        const arrow = el.querySelector('.hak-nav-chevron');
        if (arrow && arrow.textContent !== (closed ? '▸' : '▾')) arrow.textContent = closed ? '▸' : '▾';
      } else el.hidden = closed;
    }
  }
  function dashboard() {
    const page = main.querySelector('.hak-dashboard');
    if (!page || page.dataset.workspaceReady) return;
    page.dataset.workspaceReady = '1';
    const heading = make('div', 'hak-page-heading'), title = make('div');
    title.append(make('small', '', 'HAK WORKSPACE / TỔNG QUAN'), make('h1', '', 'Trung tâm điều hành lương'));
    heading.append(title, make('span', 'hak-release', 'V10.4')); page.prepend(heading);
    const hero = page.querySelector('.hero');
    if (hero) {
      hero.classList.add('hak-period-overview');
      const oldTitle = hero.querySelector('h1'), oldTotals = hero.querySelector('dl');
      if (oldTitle) oldTitle.replaceWith(make('h2', '', 'Chuẩn bị và hoàn tất kỳ lương'));
      if (oldTotals) oldTotals.remove(); // Four existing metrics remain the single summary.
      const text = hero.querySelector('p');
      if (text) text.textContent = 'Theo dõi hồ sơ, dữ liệu đầu vào và kết quả kỳ lương tại một nơi. Chọn bước cần làm để tiếp tục công việc.';
    }
    const flow = page.querySelector('.flow');
    if (flow) {
      const total = flow.children.length, done = flow.querySelectorAll('.done').length;
      const panel = make('section', 'hak-workflow'), header = make('div', 'hak-section-heading'), copy = make('div');
      panel.setAttribute('aria-label', 'Tiến độ chuẩn bị kỳ lương');
      copy.append(make('h3', '', 'Lộ trình kỳ lương'), make('p', '', 'Các mốc phản ánh dữ liệu hiện có; vẫn cần kiểm tra trước khi chốt.'));
      header.append(copy, make('span', 'hak-step-count', done + '/' + total + ' mốc có dữ liệu'));
      const progress = make('progress'); progress.max = total || 1; progress.value = done; progress.setAttribute('aria-label', 'Số mốc đã có dữ liệu');
      flow.replaceWith(panel); panel.append(header, progress, flow);
    }
    const quick = page.querySelector('.sec-title'); if (quick) quick.textContent = 'Không gian làm việc';
  }
  function masterDetail() {
    const workspace = main.querySelector('[data-ot-master]'); if (!workspace) return;
    if (!workspace.dataset.workspaceReady) {
      workspace.dataset.workspaceReady = '1'; workspace.classList.add('is-compact');
      const guide = workspace.querySelector('.hak-master-guide');
      if (guide) {
        const details = make('details'), summary = make('summary', '', 'Hướng dẫn cha–con và quy tắc kỳ lương');
        const content = make('div', 'hak-guide-content'); content.append(...guide.childNodes);
        details.append(summary, content); guide.replaceChildren(details);
      }
      const button = make('button', 'b ghost', 'Xem đầy đủ cột'); button.type = 'button'; button.dataset.otDensity = '1'; button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => { const compact = workspace.classList.toggle('is-compact'); button.textContent = compact ? 'Xem đầy đủ cột' : 'Thu gọn cột'; button.setAttribute('aria-pressed', String(!compact)); });
      workspace.querySelector('.hak-workspace-toolbar').append(button);
      const hero = workspace.querySelector('.hak-workspace-hero');
      const actions = make('div', 'hak-catalog-actions');
      for (const action of workspace.querySelectorAll('.hak-workspace-toolbar > button:not([data-ot-density])')) actions.append(action);
      hero.append(actions);
      const metrics = make('div', 'hak-catalog-metrics');
      hero.after(metrics);
      workspace.querySelector('.hak-workspace-master').prepend(workspace.querySelector('.hak-workspace-toolbar'));
      hero.querySelector('div').append(make('div', 'hak-catalog-breadcrumb', 'Tiền lương  ›  Danh mục  ›  ' + hero.querySelector('h2').textContent));
    }
    const table = workspace.querySelector('[data-ot-table]');
    if (table && !table.dataset.workspaceReady) {
      table.dataset.workspaceReady = '1';
      const heads = [...table.querySelectorAll('th')];
      const keep = new Set(heads.map((th, i) => /Công thức đang áp dụng|Số phiên bản/.test(th.textContent) ? -1 : i));
      for (const row of table.querySelectorAll('tr')) [...row.children].forEach((cell, i) => cell.classList.toggle('hak-col-extra', !keep.has(i)));
    }
    const metrics = workspace.querySelector('.hak-catalog-metrics');
    const rows = [...workspace.querySelectorAll('[data-ot-row]')];
    const active = rows.filter(row => row.textContent.includes('Đang hiệu lực')).length;
    const versions = rows.reduce((sum, row) => { const cells = [...row.children]; return sum + (Number(cells[cells.length - 2]?.textContent) || 0); }, 0);
    const values = [['▤', 'Mã đang hiển thị', rows.length], ['✓', 'Đang hiệu lực', active], ['◷', 'Phiên bản công thức', versions], ['⇄', 'Không gian quản lý', 'Cha – con']];
    const signature = JSON.stringify(values);
    if (metrics && metrics.dataset.signature !== signature) {
      metrics.dataset.signature = signature; metrics.replaceChildren();
      values.forEach(([icon, label, value], i) => { const card = make('div', 'hak-catalog-metric tone-' + i), copy = make('div'); copy.append(make('small', '', label), make('strong', '', String(value))); card.append(make('span', 'hak-metric-icon', icon), copy); metrics.append(card); });
    }
  }
  function returnFocus() {
    const drawer = document.querySelector('[data-ot-modal]');
    if (drawer) returnCode = drawer.getAttribute('data-ot-modal');
    if (hadDrawer && !drawer && document.activeElement === document.body) {
      const row = [...main.querySelectorAll('[data-ot-row]')].find(el => el.getAttribute('data-ot-row') === returnCode);
      const target = row || main.querySelector('[data-ot-q]'); if (target) target.focus();
    }
    hadDrawer = !!drawer;
  }
  function enhance() {
    scheduled = false; navigation(); dashboard(); masterDetail(); returnFocus();
    const top = document.querySelector('#top');
    if (top?.querySelector('.srch') && !top.querySelector('.hak-skin-select')) {
      const skins = document.querySelector('#sidefoot .hak-skin-select');
      if (skins) top.insertBefore(skins, top.querySelector('.who'));
    }
    const search = top?.querySelector('.srch');
    if (search && !search.dataset.referenceReady) { search.dataset.referenceReady = '1'; search.replaceChildren(make('span', '', '⌕ Tìm nhân viên, mã tăng ca, công thức…'), make('kbd', '', 'Ctrl K')); }

    const version = document.querySelector('#sidefoot .ver');
    if (version && !version.textContent.startsWith(VERSION)) version.textContent = version.textContent.replace(/^V10\.4 · v[\w.-]+/, VERSION);
    const palette = document.querySelector('.hak-skin-select option[value="luxe"]');
    if (palette && palette.textContent !== 'Luxury · HAK Enterprise') palette.textContent = 'Luxury · HAK Enterprise';
  }
  // Finish presentation changes before the next input event, avoiding a one-frame layout race.
  const observer = new MutationObserver(() => { if (!scheduled) { scheduled = true; queueMicrotask(enhance); } });
  observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
  observer.observe(document.querySelector('#modal'), { childList: true, subtree: true });
  enhance();
})();
