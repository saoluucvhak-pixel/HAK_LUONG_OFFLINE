/**
 * pages-payroll.js — 💰 Tính lương: chọn kỳ → kiểm tra dữ liệu → tính → xem Bảng lương / BHXH / Thuế TNCN → xuất Excel; lưu kết quả từng kỳ.
 */
(function (root) {
  'use strict';
  const HAK = (root.HAK = root.HAK || {});
  const $ = (s) => document.querySelector(s), esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = () => HAK.Data, NF = () => HAK.NumFmt, toast = (m, t) => HAK.UI.toast(m, t);
  const state = { tab: 'BANGLUONG', result: null, meta: null };
  const money = (v) => (v === '' || v === null || v === undefined || !isFinite(+v) ? '' : NF().txt(Math.round(+v * 100) / 100, 'num'));
  const NOSUM = ['Đơn giá lương TG', 'Đơn giá SL', 'Số người phụ thuộc'];
  const FRACTION = ['Công chuẩn', 'Công tính LTG', 'Tổng công', 'Công Chủ nhật', 'Công tăng ca', 'Sản lượng (tấn)', 'Ngày cơm', 'Số xe bơm dăm'];
  const period = () => { const p = HAK.Store.get('hak.period', null); const d = new Date(); return p || { nam: d.getFullYear(), thang: d.getMonth() + 1, bu: 'THANG' }; };
  const setPeriod = (p) => HAK.Store.set('hak.period', p);

  /** Kiểm tra nhanh dữ liệu đầu vào của kỳ → danh sách cảnh báo. */
  function checks(nam, thang) {
    const P = HAK.Payroll, ns = D().rows('NL_NHANSU'), out = [];
    if (!ns.length) { out.push(['err', 'Chưa có Nhân sự — nhập ở 📋 Bảng dữ liệu → Nhân sự.']); return out; }
    const cc = D().rows('NL_CHAMCONG').filter((r) => P.inMonth(r['Ngày tính công'], nam, thang));
    if (!cc.length) out.push(['err', 'Chưa có Chấm công tháng ' + thang + '/' + nam + '.']);
    const hasCC = new Set(cc.map((r) => r['Mã NV'])), maNS = new Set(ns.map((r) => r['Mã nhân viên']));
    const thieuCC = ns.filter((r) => r['Mã nhân viên'] && !hasCC.has(r['Mã nhân viên'])).length; if (cc.length && thieuCC) out.push(['warn', thieuCC + ' nhân viên chưa có dòng chấm công trong tháng.']);
    const la = cc.filter((r) => r['Mã NV'] && !maNS.has(r['Mã NV'])).map((r) => r['Mã NV']); if (la.length) out.push(['warn', 'Chấm công có mã NV không có trong Nhân sự: ' + Array.from(new Set(la)).slice(0, 8).join(', ') + (new Set(la).size > 8 ? '…' : '')]);
    const dmL = P.locTheoHieuLuc(D().rows('DM_LUONG'), 'Mã lương', nam, thang), dmB = P.locTheoHieuLuc(D().rows('DM_BAOHIEM'), 'Mã bảo hiểm', nam, thang), dmPC = P.locTheoHieuLuc(D().rows('DM_PHUCAP'), 'Mã phụ cấp', nam, thang);
    const miss = (col, map, label) => { const s = new Set(ns.filter((r) => r[col] && !map[r[col]]).map((r) => r[col])); if (s.size) out.push(['warn', label + ' chưa có trong danh mục (hoặc hết hiệu lực): ' + Array.from(s).slice(0, 8).join(', ')]); };
    miss('Mã tiền lương 1', dmL, 'Mã lương'); miss('Mã BHXH', dmB, 'Mã BHXH'); miss('Mã phụ cấp', dmPC, 'Mã phụ cấp');
    if (!D().rows('DM_TNCN').length && ns.some((r) => r['Mã TNCN'] && r['Mã TNCN'] !== 'TNCN0' && r['Mã TNCN'] !== 'TNCN1')) out.push(['warn', 'Chưa có Biểu thuế TNCN luỹ tiến trong danh mục.']);
    const sl = D().rows('DL_SANLUONG').filter((r) => P.inMonth(r['Ngày cân'], nam, thang) && !r['Mã NV']).length; if (sl) out.push(['warn', sl + ' phiếu cân trong tháng chưa gán Mã NV (không được tính vào lương sản lượng).']);
    if (!out.length) out.push(['ok', 'Dữ liệu đầu vào đủ để tính.']);
    return out;
  }

  function compute() {
    const nam = +$('#plNam').value, thang = +$('#plThang').value, bu = $('#plBu').value;
    if (!nam || !(thang >= 1 && thang <= 12)) { toast('Chọn kỳ lương hợp lệ.', 'warning'); return; }
    setPeriod({ nam, thang, bu });
    const T = {}; HAK.Schema.TABLES.forEach((t) => { T[t.id] = D().rows(t.id); });
    const res = HAK.Payroll.tinhBangLuong({ nam, thang, buTheoNgay: bu === 'NGAY', t: T });
    state.result = res; state.meta = { nam, thang, bu, at: Date.now(), by: HAK.Auth.who() };
    D().saveResult(nam, thang, res, { bu }).then(() => toast('Đã tính lương ' + thang + '/' + nam + ': ' + res.soNguoi + ' người, tổng thực lĩnh ' + money(res.tongThucLinh) + ' đ.', 'success')).catch((e) => toast('Tính xong nhưng chưa lưu được: ' + e.message, 'warning'));
    draw();
  }
  async function loadSaved() {
    const p = period(); const r = await D().getResult(p.nam, p.thang);
    state.result = r ? r.res : null; state.meta = r ? { nam: r.nam, thang: r.thang, bu: r.bu, at: r.at, by: r.by } : null;
  }
  const sum = (arr, k) => arr.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  function table(name) {
    const cols = HAK.Schema.OUT[name], rows = state.result[{ BANGLUONG: 'bangLuong', BHXH: 'bhxh', TNCN: 'tncn' }[name]];
    if (!rows.length) return '<div class="muted text-center py-4">' + (name === 'BHXH' ? 'Không có nhân viên nào khai Mã BHXH hợp lệ.' : name === 'TNCN' ? 'Không có ai phải nộp thuế TNCN tháng này.' : 'Không có dữ liệu.') + '</div>';
    const text = HAK.Schema.TEXT_OUT;
    return '<div class="tbl-wrap pl-wrap"><table class="table table-sm align-middle dg pl"><thead><tr>' + cols.map((c, i) => '<th class="' + (text.indexOf(c) < 0 ? 'num ' : '') + (i < 2 ? 'pl-s' + i : '') + '">' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map((r) => '<tr>' + cols.map((c, i) => '<td class="' + (text.indexOf(c) < 0 ? 'num text-nowrap ' : '') + (i < 2 ? 'pl-s' + i + ' ' : '') + (c === 'Thực lĩnh' ? 'fw-semibold' : '') + '">' + (text.indexOf(c) < 0 ? money(r[c]) : esc(r[c])) + '</td>').join('') + '</tr>').join('') +
      '</tbody><tfoot><tr class="fw-semibold table-light">' + cols.map((c, i) => '<td class="' + (text.indexOf(c) < 0 ? 'num text-nowrap' : '') + (i < 2 ? ' pl-s' + i : '') + '">' + (i === 0 ? 'TỔNG (' + rows.length + ')' : text.indexOf(c) < 0 && FRACTION.indexOf(c) < 0 && NOSUM.indexOf(c) < 0 ? money(sum(rows, c)) : '') + '</td>').join('') + '</tr></tfoot></table></div>';
  }
  const card = (l, v, s) => '<div class="col-6 col-md-3 col-xl"><div class="border rounded p-2 h-100"><div class="small muted">' + l + '</div><div class="fw-semibold fs-5">' + v + '</div>' + (s ? '<div class="small muted">' + s + '</div>' : '') + '</div></div>';

  function draw() {
    const host = $('#plBody'); if (!host) return;
    const p = period(), chk = checks(p.nam, p.thang), r = state.result;
    let html = '<div class="mb-3">' + chk.map((c) => '<div class="small ' + (c[0] === 'err' ? 'text-danger' : c[0] === 'warn' ? 'text-warning-emphasis' : 'text-success') + '">' + (c[0] === 'err' ? '✖ ' : c[0] === 'warn' ? '⚠ ' : '✔ ') + esc(c[1]) + '</div>').join('') + '</div>';
    if (!r) html += '<div class="muted text-center py-4">Chưa tính lương kỳ ' + p.thang + '/' + p.nam + '. Bấm <b>Tính lương</b>.</div>';
    else {
      const bl = r.bangLuong;
      html += '<div class="small muted mb-2">Kết quả kỳ <b>' + state.meta.thang + '/' + state.meta.nam + '</b> — phương án bù sản lượng: ' + (state.meta.bu === 'NGAY' ? 'theo ngày' : 'theo tháng') + ' · tính lúc ' + new Date(state.meta.at).toLocaleString('vi-VN') + (state.meta.by ? ' · ' + esc(state.meta.by) : '') + '</div>' +
        '<div class="row g-2 mb-3">' + card('Số người', r.soNguoi) + card('Tổng thu nhập', money(sum(bl, 'Tổng thu nhập (trước trừ)')) + ' đ') + card('BH trừ NLĐ', money(sum(bl, 'BHXH/BHYT/BHTN trừ NLĐ') + sum(bl, 'KPCĐ trừ NLĐ')) + ' đ', 'truy thu BH ' + money(sum(bl, 'Truy thu bảo hiểm'))) + card('Thuế TNCN', money(sum(bl, 'Thuế TNCN')) + ' đ') + card('Tạm ứng + trừ khác', money(sum(bl, 'Tạm ứng') + sum(bl, 'Trừ khác')) + ' đ') + card('THỰC LĨNH', '<span class="text-success">' + money(r.tongThucLinh) + ' đ</span>') + '</div>' +
        '<ul class="nav nav-pills mb-2">' + [['BANGLUONG', '📄 Bảng lương'], ['BHXH', '🛡 BHXH / BHYT / BHTN'], ['TNCN', '🧾 Thuế TNCN']].map((x) => '<li class="nav-item"><button class="nav-link py-1' + (state.tab === x[0] ? ' active' : '') + '" data-pt="' + x[0] + '" type="button">' + x[1] + '</button></li>').join('') + '</ul>' + table(state.tab);
    }
    host.innerHTML = html; const xb = $('#plXls'); if (xb) xb.disabled = !r;
  }
  async function exportXls() {
    const r = state.result; if (!r) return; const m = state.meta, wb = await HAK.Excel.newWorkbook();
    const unit = (HAK.Config.data.companies.find((c) => c.id === D().unit()) || {}).name || D().unit(), sub = unit + ' · Kỳ ' + m.thang + '/' + m.nam + ' · Bù sản lượng ' + (m.bu === 'NGAY' ? 'theo ngày' : 'theo tháng');
    const colsOf = (name) => HAK.Schema.OUT[name].map((c) => ({ h: c, w: c === 'Họ và tên' ? 24 : c === 'Ghi chú ngưỡng công' ? 40 : HAK.Schema.TEXT_OUT.indexOf(c) >= 0 ? 16 : 14, n: HAK.Schema.TEXT_OUT.indexOf(c) >= 0 ? undefined : FRACTION.indexOf(c) >= 0 ? '#,##0.00' : '#,##0', sum: FRACTION.indexOf(c) < 0 && NOSUM.indexOf(c) < 0 }));
    HAK.Excel.addSheet(wb, 'Bảng lương', 'BẢNG LƯƠNG THÁNG ' + m.thang + '/' + m.nam, sub, colsOf('BANGLUONG'), r.bangLuong, { total: true, freezeCols: 2 });
    HAK.Excel.addSheet(wb, 'BHXH', 'CÁC KHOẢN TRÍCH THEO LƯƠNG THÁNG ' + m.thang + '/' + m.nam, sub, colsOf('BHXH'), r.bhxh, { total: true, freezeCols: 2 });
    HAK.Excel.addSheet(wb, 'Thuế TNCN', 'THUẾ TNCN THÁNG ' + m.thang + '/' + m.nam, sub, colsOf('TNCN'), r.tncn, { total: true, freezeCols: 2 });
    if (await HAK.Excel.saveWorkbook(wb, 'BangLuong_' + (D().unit()) + '_' + m.nam + '-' + ('0' + m.thang).slice(-2) + '.xlsx')) toast('Đã xuất bảng lương.', 'success');
  }
  async function render() {
    const page = $('#page-payroll'); if (!page) return;
    if (!page.dataset.built) {
      page.dataset.built = '1';
      page.innerHTML = '<div class="card"><div class="card-body"><div class="d-flex flex-wrap align-items-end gap-2 mb-3"><div><label class="form-label small mb-0" for="plThang">Tháng</label><input type="number" min="1" max="12" class="form-control form-control-sm" style="width:5rem" id="plThang"></div>' +
        '<div><label class="form-label small mb-0" for="plNam">Năm</label><input type="number" min="2000" max="2100" class="form-control form-control-sm" style="width:6rem" id="plNam"></div>' +
        '<div><label class="form-label small mb-0" for="plBu">Bù sản lượng</label><select class="form-select form-select-sm" id="plBu"><option value="THANG">Theo tháng (bình quân)</option><option value="NGAY">Theo từng ngày</option></select></div>' +
        '<button class="btn btn-primary" id="plGo" type="button">💰 Tính lương</button><button class="btn btn-success" id="plXls" type="button" disabled>📊 Xuất Excel</button></div><div id="plBody"></div></div></div>';
      page.addEventListener('click', (e) => {
        if (e.target.closest('#plGo')) compute();
        else if (e.target.closest('#plXls')) exportXls().catch((x) => toast(x.message || String(x), 'error'));
        const pt = e.target.closest('[data-pt]'); if (pt) { state.tab = pt.dataset.pt; draw(); }
      });
      page.addEventListener('change', async (e) => { if (e.target.id === 'plThang' || e.target.id === 'plNam') { const p = period(); p.nam = +$('#plNam').value || p.nam; p.thang = +$('#plThang').value || p.thang; setPeriod(p); await loadSaved(); draw(); } if (e.target.id === 'plBu') { const p = period(); p.bu = e.target.value; setPeriod(p); } });
    }
    const p = period(); $('#plThang').value = p.thang; $('#plNam').value = p.nam; $('#plBu').value = p.bu || 'THANG';
    await loadSaved(); draw();
  }
  HAK.PagesPayroll = { render, checks };
})(typeof window !== 'undefined' ? window : globalThis);
