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
  const saveResult = (nam, thang, res, extra, u) => HAK.DB.put('results', Object.assign({ id: id(u || unit(), periodKey(nam, thang)), nam, thang, at: Date.now(), by: HAK.Auth ? HAK.Auth.who() : '' }, extra || {}, { res }));
  const getResult = (nam, thang, u) => HAK.DB.get('results', id(u || unit(), periodKey(nam, thang)));
  async function listResults(u) { u = u || unit(); return (await HAK.DB.getAll('results')).filter((r) => r.id.indexOf(u + '|') === 0).sort((a, b) => b.id.localeCompare(a.id)); }
  const delResult = (nam, thang, u) => HAK.DB.del('results', id(u || unit(), periodKey(nam, thang)));

  /** Toàn bộ dữ liệu (mọi đơn vị) để sao lưu. */
  async function exportAll() { return { tables: await HAK.DB.getAll('tables'), results: await HAK.DB.getAll('results'), kv: Object.fromEntries(HAK.Store.keys().map((k) => [k, HAK.Store.get(k)])) }; }
  async function importAll(pack, opts) {
    opts = opts || {};
    if (opts.replace) { await HAK.DB.clear('tables'); await HAK.DB.clear('results'); }
    for (const r of pack.tables || []) await HAK.DB.put('tables', r);
    for (const r of pack.results || []) await HAK.DB.put('results', r);
    Object.keys(pack.kv || {}).forEach((k) => { if (k !== 'hak.auth.v1' || opts.withAuth) HAK.Store.set(k, pack.kv[k]); });
    Object.keys(loaded).forEach((k) => delete loaded[k]); Object.keys(cache).forEach((k) => delete cache[k]);
  }
  HAK.Data = { unit, load, rows, save, setRows, addRows, count, saveResult, getResult, listResults, delResult, periodKey, exportAll, importAll, onChange: null };
})(typeof window !== 'undefined' ? window : globalThis);
