/**
 * pages-data.js — 📋 Bảng dữ liệu: sửa trực tiếp các bảng (nhân sự, chấm công, sản lượng, phát sinh, danh mục) như bảng tính; nhập / xuất Excel.
 */
(function (root) {
  'use strict';
  const HAK = (root.HAK = root.HAK || {});
  const $ = (s, r) => (r || document).querySelector(s), esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = () => HAK.Schema, D = () => HAK.Data, NF = () => HAK.NumFmt, toast = (m, t) => HAK.UI.toast(m, t);
  const PAGE = 100;
  const state = { tid: 'NL_NHANSU', month: '', q: '', page: 0 };
  const curMonth = () => { const p = HAK.Store.get('hak.period', null); return p ? p.nam + '-' + ('0' + p.thang).slice(-2) : new Date().toISOString().slice(0, 7); };
  const tab = () => S().byId[state.tid];

  function filtered(t) {
    const q = HAK.Excel.fold(state.q);
    const all = D().rows(t.id), out = [];
    all.forEach((r, i) => {
      if (t.monthCol && state.month && String(r[t.monthCol] || '').slice(0, 7) !== state.month) return;
      if (q && !t.header.some((c) => HAK.Excel.fold(r[c]).indexOf(q) >= 0)) return;
      out.push(i);
    });
    return out;
  }
  const show = (t, c, v) => (t.nums.indexOf(c) >= 0 && v !== '' && v !== null && isFinite(+v) ? NF().txt(+v, 'num') : esc(v == null ? '' : v));
  function cell(t, c, v, i) {
    const attr = 'data-i="' + i + '" data-c="' + esc(c) + '"';
    if (t.dates.indexOf(c) >= 0) return '<input type="date" class="form-control form-control-sm dg-in" ' + attr + ' value="' + esc(v || '') + '">';
    if (t.nums.indexOf(c) >= 0) return '<input type="text" inputmode="decimal" class="form-control form-control-sm dg-in text-end" ' + attr + ' value="' + show(t, c, v) + '">';
    const w = t.day && t.day.indexOf(c) >= 0 ? ' style="min-width:3.2rem;max-width:4rem;padding:2px 4px"' : '';
    return '<input type="text" class="form-control form-control-sm dg-in" ' + attr + w + ' value="' + esc(v == null ? '' : v) + '">';
  }
  function draw() {
    const host = $('#dataMain'); if (!host) return;
    const t = tab(), idx = filtered(t), pages = Math.max(1, Math.ceil(idx.length / PAGE)); if (state.page >= pages) state.page = pages - 1;
    const slice = idx.slice(state.page * PAGE, state.page * PAGE + PAGE), all = D().rows(t.id);
    host.innerHTML = '<div class="d-flex flex-wrap align-items-center gap-2 mb-2"><h6 class="mb-0">' + esc(t.title) + '</h6><span class="badge badge-soft">' + idx.length + ' / ' + all.length + ' dòng</span>' +
      '<span class="ms-auto d-flex flex-wrap gap-2 align-items-center">' + (t.monthCol ? '<label class="small muted mb-0">Tháng <input type="month" class="form-control form-control-sm d-inline-block" style="width:9.5rem" id="dgMonth" value="' + esc(state.month) + '"></label><button class="btn btn-sm btn-outline-secondary" id="dgAllMonths" type="button">Tất cả tháng</button>' : '') +
      '<input class="form-control form-control-sm" style="width:12rem" id="dgQ" placeholder="Tìm trong bảng…" value="' + esc(state.q) + '">' +
      '<button class="btn btn-sm btn-primary" id="dgAdd" type="button">＋ Thêm dòng</button>' +
      '<label class="btn btn-sm btn-outline-primary mb-0">⬆ Nhập Excel<input type="file" id="dgImport" accept=".xlsx,.xlsm" hidden></label>' +
      '<button class="btn btn-sm btn-outline-secondary" id="dgXls" type="button">⬇ Xuất Excel</button>' +
      '<button class="btn btn-sm btn-outline-danger admin-only" id="dgDelAll" type="button" title="Xóa các dòng đang lọc">🗑 Xóa dòng đang lọc</button></span></div>' +
      (t.note ? '<div class="form-text mt-0 mb-2">' + esc(t.note) + '</div>' : '') +
      '<div class="tbl-wrap dg-wrap"><table class="table table-sm align-middle dg"><thead><tr><th class="num">#</th>' + t.header.map((c) => '<th class="text-nowrap">' + esc(c) + '</th>').join('') + '<th></th></tr></thead><tbody>' +
      (slice.length ? slice.map((i) => '<tr><td class="num muted small">' + (i + 1) + '</td>' + t.header.map((c) => '<td>' + cell(t, c, all[i][c], i) + '</td>').join('') + '<td><button class="btn btn-sm btn-outline-danger py-0" data-del="' + i + '" type="button" title="Xóa dòng">✕</button></td></tr>').join('') : '<tr><td colspan="' + (t.header.length + 2) + '" class="muted text-center py-4">Chưa có dòng nào. Bấm ＋ Thêm dòng hoặc ⬆ Nhập Excel.</td></tr>') + '</tbody></table></div>' +
      (pages > 1 ? '<div class="d-flex gap-2 align-items-center mt-2"><button class="btn btn-sm btn-outline-secondary" data-pg="-1" type="button"' + (state.page === 0 ? ' disabled' : '') + '>‹ Trước</button><span class="small">Trang ' + (state.page + 1) + ' / ' + pages + '</span><button class="btn btn-sm btn-outline-secondary" data-pg="1" type="button"' + (state.page >= pages - 1 ? ' disabled' : '') + '>Sau ›</button></div>' : '');
    $('#dataList').innerHTML = S().groups.map((g) => '<div class="small muted fw-semibold text-uppercase mt-3 mb-1 px-2" style="font-size:.7rem;letter-spacing:.06em">' + esc(g) + '</div>' + S().TABLES.filter((x) => x.group === g).map((x) => '<a class="dg-tab' + (x.id === state.tid ? ' active' : '') + '" href="#/data" data-tid="' + x.id + '"><span>' + esc(x.title.replace(/ \(.*$/, '')) + '</span><span class="badge badge-soft">' + D().count(x.id) + '</span></a>').join('')).join('');
  }

  /* ---------- Sửa ô ---------- */
  // Ghi trễ theo TỪNG bảng đã sửa (không theo bảng đang mở): chuyển bảng / đóng app trước 400ms vẫn không mất thay đổi
  const pending = new Set();
  function flush() {
    const ids = Array.from(pending); pending.clear();
    return Promise.all(ids.map((t) => D().save(t).catch((e) => { pending.add(t); toast('Không lưu được bảng ' + t + ': ' + e.message, 'error'); })));
  }
  const saveSoon = HAK.UI.debounce(flush, 400);
  root.addEventListener('pagehide', flush); root.addEventListener('beforeunload', flush);
  function onEdit(e) {
    const el = e.target.closest('.dg-in'); if (!el) return;
    const t = tab(), row = D().rows(t.id)[+el.dataset.i]; if (!row) return;
    const c = el.dataset.c; let v = el.value;
    if (t.nums.indexOf(c) >= 0) { const n = v.trim() === '' ? '' : NF().parse(v, 'num'); if (v.trim() !== '' && n === null) { el.classList.add('is-invalid'); return; } el.classList.remove('is-invalid'); v = n; el.value = n === '' ? '' : NF().txt(+n, 'num'); }
    else if (t.day && t.day.indexOf(c) >= 0) { v = v.trim(); const x = Number(v.replace(',', '.')); if (v !== '' && isFinite(x) && /^[\d.,]+$/.test(v)) v = x; }
    row[c] = v; pending.add(t.id); saveSoon();
  }
  function addRow() {
    const t = tab(), r = {}; t.header.forEach((c) => { r[c] = ''; });
    const today = HAK.UI.todayISO(), m = state.month || curMonth();
    if (t.monthCol) r[t.monthCol] = (m === today.slice(0, 7) ? today : m + '-01');
    if (t.dates.indexOf('Ngày cập nhật') >= 0) r['Ngày cập nhật'] = today;
    D().rows(t.id).push(r); D().save(t.id).then(() => { state.page = Math.max(0, Math.ceil(filtered(t).length / PAGE) - 1); draw(); const ins = document.querySelectorAll('.dg tbody tr:last-child .dg-in'); if (ins[1]) ins[1].focus(); });
  }

  /* ---------- Nhập Excel ---------- */
  async function onImport(file) {
    HAK.UI.Loading.show('Đang đọc file Excel…');
    let sheets; try { sheets = await HAK.Excel.readWorkbook(file); } catch (e) { HAK.UI.Loading.hide(); toast('Không đọc được file: ' + e.message, 'error'); return; }
    HAK.UI.Loading.hide();
    const items = sheets.map((sh) => { const d = HAK.Excel.detect(sh.rows, S().TABLES); return d ? { sheet: sh, d, rows: HAK.Excel.toRows(d.table, sh.rows, d.headerAt) } : null; }).filter((x) => x && x.rows.length);
    if (!items.length) { toast('Không nhận ra bảng nào trong file (cần tiêu đề cột đúng tên như trong app — xuất mẫu bằng nút ⬇ Xuất Excel).', 'warning'); return; }
    const m = ensureModal();
    $('#imBody').innerHTML = '<div class="small muted mb-2">Tìm thấy ' + items.length + ' bảng. Chọn cách nạp cho từng bảng:</div><table class="table table-sm align-middle"><thead><tr><th>Trang tính</th><th>Nhận là bảng</th><th class="num">Số dòng</th><th>Cách nạp</th></tr></thead><tbody>' +
      items.map((it, k) => '<tr><td>' + esc(it.sheet.name) + '</td><td>' + esc(it.d.table.title.replace(/ \(.*$/, '')) + '<div class="small muted">khớp ' + Math.round(it.d.score * 100) + '% cột</div></td><td class="num">' + it.rows.length + '</td><td><select class="form-select form-select-sm" data-k="' + k + '">' +
        '<option value="append"' + (it.d.table.monthCol ? '' : ' selected') + '>Thêm vào (bỏ dòng trùng)</option>' + (it.d.table.monthCol ? '<option value="month" selected>Thay các tháng có trong file</option>' : '') + '<option value="all">Thay toàn bộ bảng</option><option value="skip">Bỏ qua</option></select></td></tr>').join('') + '</tbody></table>';
    $('#imGo').onclick = async () => {
      const sels = Array.from(m.querySelectorAll('select[data-k]')); let n = 0;
      HAK.UI.Loading.show('Đang nạp dữ liệu…');
      try {
        for (const s of sels) {
          const it = items[+s.dataset.k], t = it.d.table, mode = s.value; if (mode === 'skip') continue;
          let cur = D().rows(t.id), add = it.rows;
          if (mode === 'all') cur = []; else if (mode === 'month') { const ms = new Set(add.map((r) => String(r[t.monthCol] || '').slice(0, 7)).filter(Boolean)); cur = cur.filter((r) => !ms.has(String(r[t.monthCol] || '').slice(0, 7))); }   // dòng trống tháng trong file không kéo theo xóa dòng trống tháng đang có
          else { const sig = (r) => JSON.stringify(t.header.map((c) => r[c])); const have = new Set(cur.map(sig)); add = add.filter((r) => { const k = sig(r); if (have.has(k)) return false; have.add(k); return true; }); }
          await D().setRows(t.id, cur.concat(add)); n += add.length;
        }
      } finally { HAK.UI.Loading.hide(); }
      bootstrap.Modal.getOrCreateInstance(m).hide(); toast('Đã nạp ' + n.toLocaleString('vi-VN') + ' dòng.', 'success'); draw();
    };
    bootstrap.Modal.getOrCreateInstance(m).show();
  }
  function ensureModal() {
    let m = $('#imModal'); if (m) return m;
    m = document.createElement('div'); m.className = 'modal fade'; m.id = 'imModal'; m.tabIndex = -1;
    m.innerHTML = '<div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">⬆ Nhập Excel</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button></div><div class="modal-body" id="imBody"></div><div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Hủy</button><button type="button" class="btn btn-primary" id="imGo">Nạp dữ liệu</button></div></div></div>';
    document.body.append(m); return m;
  }
  const unitName = () => { const c = HAK.Config.data.companies.find((x) => x.id === D().unit()); return c ? c.short || c.name : D().unit(); };
  async function exportXls() {
    const t = tab(), idx = filtered(t), all = D().rows(t.id), wb = await HAK.Excel.newWorkbook();
    HAK.Excel.addSheet(wb, t.id, t.title, 'Đơn vị: ' + unitName() + (state.month && t.monthCol ? ' · Tháng ' + state.month : ''), t.header.map((c) => ({ h: c, w: Math.max(10, Math.min(30, c.length + 4)), n: t.nums.indexOf(c) >= 0 ? '#,##0.##' : undefined, d: t.dates.indexOf(c) >= 0 })), idx.map((i) => t.header.map((c) => all[i][c])));
    if (await HAK.Excel.saveWorkbook(wb, t.id + (state.month && t.monthCol ? '_' + state.month : '') + '.xlsx')) toast('Đã xuất ' + idx.length + ' dòng.', 'success');
  }

  function render() {
    const page = $('#page-data'); if (!page) return;
    if (!page.dataset.built) {
      page.dataset.built = '1';
      page.innerHTML = '<div class="row g-3"><div class="col-lg-3"><div class="card"><div class="card-body py-2" id="dataList"></div></div></div><div class="col-lg-9"><div class="card"><div class="card-body" id="dataMain"></div></div></div></div>';
      page.addEventListener('change', (e) => {
        if (e.target.id === 'dgMonth') { state.month = e.target.value; state.page = 0; draw(); return; }
        if (e.target.id === 'dgImport') { const f = e.target.files[0]; e.target.value = ''; if (f) onImport(f); return; }
        onEdit(e);
      });
      page.addEventListener('input', (e) => { if (e.target.id === 'dgQ') { state.q = e.target.value; state.page = 0; clearTimeout(state._q); state._q = setTimeout(() => { draw(); const q = $('#dgQ'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); } });
      page.addEventListener('click', (e) => {
        const tb = e.target.closest('[data-tid]'); if (tb) { e.preventDefault(); flush(); state.tid = tb.dataset.tid; state.page = 0; state.q = ''; draw(); return; }
        const pg = e.target.closest('[data-pg]'); if (pg) { state.page += +pg.dataset.pg; draw(); return; }
        const del = e.target.closest('[data-del]'); if (del) { D().rows(state.tid).splice(+del.dataset.del, 1); D().save(state.tid).then(draw); return; }
        if (e.target.closest('#dgAdd')) addRow();
        else if (e.target.closest('#dgAllMonths')) { state.month = ''; draw(); }
        else if (e.target.closest('#dgXls')) exportXls().catch((x) => toast(x.message || String(x), 'error'));
        else if (e.target.closest('#dgDelAll')) { const b = e.target.closest('#dgDelAll'); HAK.UI.confirmClick(b, () => { const t = tab(), keep = new Set(filtered(t)); D().setRows(t.id, D().rows(t.id).filter((_, i) => !keep.has(i))).then(() => { toast('Đã xóa.', 'success'); draw(); }); }, 'Bấm lần nữa để XÓA'); }
      });
    }
    if (!state.month) state.month = curMonth();
    draw();
  }
  HAK.PagesData = { render, flush, setTable(id) { if (S().byId[id]) { flush(); state.tid = id; } } };
})(typeof window !== 'undefined' ? window : globalThis);
