/**
 * db.js — HAK.DB: lớp IndexedDB (DB "hak-luong").
 *  - "kv": bản sao ngầm của mọi khóa HAK.Store.
 *  - "tables": mỗi bảng dữ liệu của 1 đơn vị = 1 bản ghi { id: 'đơnvị|BẢNG', rows:[…], ts } (xem data.js).
 *  - "results": kết quả tính lương đã lưu của 1 kỳ { id: 'đơnvị|YYYY-MM', … }.
 * Không có IndexedDB → backend 'mem' (vẫn chạy, không lưu bền).
 */
(function (root) {
  'use strict';
  const HAK = (root.HAK = root.HAK || {});
  const NAME = 'hak-luong', VER = 1, STORES = { kv: 'key', tables: 'id', results: 'id' };
  const memStores = {}, state = { backend: root.indexedDB ? 'idb' : 'mem', error: null };
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((ok) => {
      let done = false;
      const fin = (db) => { if (!done) { done = true; clearTimeout(timer); ok(db); } else if (db) db.close(); };
      const timer = setTimeout(() => { if (!done) { state.backend = 'mem'; state.error = 'timeout'; fin(null); } }, 4000);
      try {
        if (!root.indexedDB) { state.backend = 'mem'; return fin(null); }
        const rq = root.indexedDB.open(NAME, VER);
        rq.onupgradeneeded = (ev) => { const d = rq.result; if (ev.oldVersion < 1) Object.keys(STORES).forEach((s) => d.createObjectStore(s, { keyPath: STORES[s] })); };
        rq.onsuccess = () => { const d = rq.result; d.onversionchange = () => { d.close(); dbp = null; }; fin(d); };
        rq.onerror = () => { state.backend = 'mem'; state.error = String(rq.error || 'error'); fin(null); };
      } catch (e) { state.backend = 'mem'; state.error = String(e); fin(null); }
    });
    return dbp;
  }
  const reqP = (rq) => new Promise((ok, no) => { rq.onsuccess = () => ok(rq.result); rq.onerror = () => no(rq.error); });
  const txDone = (tx) => new Promise((ok, no) => { tx.oncomplete = () => ok(); tx.onerror = tx.onabort = () => no(tx.error || new Error('Không ghi được IndexedDB')); });
  const mem = (st) => memStores[st] || (memStores[st] = new Map());
  async function put(store, val) { const db = await open(); if (!db) { mem(store).set(val[STORES[store]], val); return; } const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(val); return txDone(tx); }
  async function get(store, key) { const db = await open(); if (!db) return mem(store).get(key); return reqP(db.transaction(store, 'readonly').objectStore(store).get(key)); }
  async function getAll(store) { const db = await open(); if (!db) return Array.from(mem(store).values()); return reqP(db.transaction(store, 'readonly').objectStore(store).getAll()); }
  async function del(store, key) { const db = await open(); if (!db) { mem(store).delete(key); return; } const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(key); return txDone(tx); }
  async function clear(store) { const db = await open(); if (!db) { mem(store).clear(); return; } const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).clear(); return txDone(tx); }
  const kvPut = (key, val, ls) => put('kv', { key, val, ls: ls !== false, ts: Date.now() });
  const kvDel = (key) => del('kv', key);
  const kvAll = () => getAll('kv');
  async function status() {
    const out = { backend: state.backend, persisted: null, usage: null, quota: null }; await open(); out.backend = state.backend;
    try { if (navigator.storage && navigator.storage.persisted) out.persisted = await navigator.storage.persisted(); } catch (e) { /* bỏ qua */ }
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); out.usage = e.usage; out.quota = e.quota; } } catch (e) { /* bỏ qua */ }
    return out;
  }
  const requestPersist = async () => { try { return !!(navigator.storage && navigator.storage.persist && await navigator.storage.persist()); } catch (e) { return false; } };
  HAK.DB = { open, put, get, getAll, del, clear, kvPut, kvDel, kvAll, status, requestPersist, usable: () => state.backend === 'idb', get backend() { return state.backend; } };
})(typeof window !== 'undefined' ? window : globalThis);
