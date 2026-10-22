/**
 * data.js — HAK.Data: kho dữ liệu theo ĐƠN VỊ (IndexedDB). Mỗi bảng = mảng object {Tên cột: giá trị}; giữ trong RAM, ghi khi sửa.
 * API: unit(), rows(tableId), setRows(tableId, rows), addRows, load(), results (kết quả tính lương đã lưu của kỳ), exportAll/importAll (sao lưu).
 */
(function (root) {
  'use strict';
  const HAK = (root.HAK = root.HAK || {});
  const cache = {}, loaded = {};
  const unit = () => (HAK.Auth && HAK.Auth.company && HAK.Auth.company()) || 'hak';
  const id = (u, t) => u + '|' + t;

  /** Nạp mọi bảng của đơn vị hiện tại từ IndexedDB (gọi 1 lần sau khi đăng nhập / đổi đơn vị). */
  async function load(u) {
    u = u || unit();
    if (loaded[u]) return;
    cache[u] = {};
    const all = (await HAK.DB.getAll('tables')).filter((r) => r.id.indexOf(u + '|') === 0);
    all.forEach((r) => { cache[u][r.id.slice(u.length + 1)] = r.rows; });
    loaded[u] = true;
  }
  function rows(t, u) { u = u || unit(); cache[u] = cache[u] || {}; return cache[u][t] || (cache[u][t] = []); }
  async function save(t, u) { u = u || unit(); await HAK.DB.put('tables', { id: id(u, t), rows: rows(t, u), ts: Date.now() }); HAK.Data.onChange && HAK.Data.onChange(t); }
  async function setRows(t, list, u) { u = u || unit(); cache[u] = cache[u] || {}; cache[u][t] = list; await save(t, u); }
  async function addRows(t, list, u) { u = u || unit(); rows(t, u).push.apply(rows(t, u), list); await save(t, u); }
  const count = (t, u) => rows(t, u).length;

  /* Kết quả tính lương đã lưu theo kỳ */
  const periodKey = (nam, thang) => nam + '-' + ('0' + thang).slice(-2);
  const HISTORY = 5;                                                       // số lần tính trước được giữ lại cho mỗi kỳ
  const who = () => (HAK.Auth && HAK.Auth.who ? HAK.Auth.who() : '');
  /** Lưu kết quả kỳ; kỳ ĐÃ CHỐT thì từ chối. Kết quả cũ chuyển vào history (mới nhất trước). */
  async function saveResult(nam, thang, res, extra, u) {
    const key = id(u || unit(), periodKey(nam, thang)), prev = await HAK.DB.get('results', key);
    if (prev && prev.locked) throw new Error('Kỳ ' + thang + '/' + nam + ' đã chốt — Quản trị mở chốt trước khi tính lại.');
    const history = prev ? [{ at: prev.at, by: prev.by, bu: prev.bu, res: prev.res }].concat(prev.history || []).slice(0, HISTORY) : [];
    const rec = Object.assign({ id: key, nam, thang, at: Date.now(), by: who() }, extra || {}, { res, history, lockLog: (prev && prev.lockLog) || [] });
    await HAK.DB.put('results', rec);
    return rec;
  }
  /** Chốt / mở chốt kết quả 1 kỳ; mỗi lần ghi vào lockLog. */
  async function lockResult(nam, thang, locked, u) {
    const key = id(u || unit(), periodKey(nam, thang)), r = await HAK.DB.get('results', key);
    if (!r) throw new Error('Kỳ ' + thang + '/' + nam + ' chưa tính lương — chưa chốt được.');
    const at = Date.now(), by = who();
    Object.assign(r, { locked: !!locked, lockedAt: locked ? at : null, lockedBy: locked ? by : '', lockLog: (r.lockLog || []).concat({ locked: !!locked, at, by }) });
    await HAK.DB.put('results', r);
    return r;
  }
  const getResult = (nam, thang, u) => HAK.DB.get('results', id(u || unit(), periodKey(nam, thang)));
  async function listResults(u) { u = u || unit(); return (await HAK.DB.getAll('results')).filter((r) => r.id.indexOf(u + '|') === 0).sort((a, b) => b.id.localeCompare(a.id)); }
  const delResult = (nam, thang, u) => HAK.DB.del('results', id(u || unit(), periodKey(nam, thang)));

  /** Toàn bộ dữ liệu (mọi đơn vị) để sao lưu. */
  async function exportAll() { return { tables: await HAK.DB.getAll('tables'), results: await HAK.DB.getAll('results'), kv: Object.fromEntries(HAK.Store.keys().map((k) => [k, HAK.Store.get(k)])) }; }
  /** Kiểm tra file sao lưu trước khi nạp → { ok, errors[], units[], tables, results, kv }. Không đụng dữ liệu. */
  function checkBackup(pack) {
    const errors = [], units = new Set(), known = (HAK.Schema && HAK.Schema.byId) || {};
    if (!pack || typeof pack !== 'object' || Array.isArray(pack)) return { ok: false, errors: ['Không phải file sao lưu (nội dung không phải đối tượng JSON).'], units: [], tables: 0, results: 0, kv: 0 };
    if (pack.app !== 'hak-luong') errors.push('Không phải file sao lưu của app Tính lương (app = ' + JSON.stringify(pack.app === undefined ? null : pack.app) + ').');
    if (pack.v !== 1) errors.push('Phiên bản file sao lưu không hỗ trợ: ' + JSON.stringify(pack.v === undefined ? null : pack.v) + '.');
    const tables = Array.isArray(pack.tables) ? pack.tables : null, results = Array.isArray(pack.results) ? pack.results : null;
    if (!tables) errors.push('Thiếu danh sách bảng dữ liệu (tables).');
    if (!results) errors.push('Thiếu danh sách kết quả lương (results).');
    (tables || []).forEach((r, i) => {
      const m = r && typeof r.id === 'string' ? r.id.match(/^([^|]+)\|([A-Z_]+)$/) : null;
      if (!m || !known[m[2]] || !Array.isArray(r.rows) || r.rows.some((x) => !x || typeof x !== 'object' || Array.isArray(x))) errors.push('Bảng thứ ' + (i + 1) + ' không hợp lệ' + (r && r.id ? ' (' + String(r.id).slice(0, 40) + ')' : '') + '.');
      else units.add(m[1]);
    });
    (results || []).forEach((r, i) => { if (!r || typeof r.id !== 'string' || !/^[^|]+\|\d{4}-\d\d$/.test(r.id) || !r.res || !Array.isArray(r.res.bangLuong)) errors.push('Kết quả lương thứ ' + (i + 1) + ' không hợp lệ.'); });
    if (pack.kv !== undefined && (typeof pack.kv !== 'object' || pack.kv === null || Array.isArray(pack.kv))) errors.push('Phần cài đặt (kv) không hợp lệ.');
    return { ok: !errors.length, errors: errors.slice(0, 10), units: Array.from(units).sort(), tables: (tables || []).length, results: (results || []).length, kv: Object.keys(pack.kv || {}).filter((k) => k.indexOf('hak.') === 0).length };
  }
  async function importAll(pack, opts) {
    opts = opts || {};
    const chk = checkBackup(pack); if (!chk.ok) throw new Error(chk.errors.join(' '));
    if (opts.replace) { await HAK.DB.clear('tables'); await HAK.DB.clear('results'); }
    for (const r of pack.tables || []) await HAK.DB.put('tables', r);
    for (const r of pack.results || []) await HAK.DB.put('results', r);
    Object.keys(pack.kv || {}).forEach((k) => { if (k.indexOf('hak.') === 0 && (k !== 'hak.auth.v1' || opts.withAuth)) HAK.Store.set(k, pack.kv[k]); });
    Object.keys(loaded).forEach((k) => delete loaded[k]); Object.keys(cache).forEach((k) => delete cache[k]);
  }
  HAK.Data = { unit, load, rows, save, setRows, addRows, count, saveResult, lockResult, getResult, listResults, delResult, periodKey, exportAll, checkBackup, importAll, onChange: null };
  if (typeof module === 'object' && module.exports) module.exports = HAK.Data;
})(typeof window !== 'undefined' ? window : globalThis);
