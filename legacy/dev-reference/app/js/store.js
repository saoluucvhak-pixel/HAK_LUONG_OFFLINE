/**
 * store.js — HAK.Store: lưu cấu hình nhỏ (localStorage + bản sao ngầm sang IndexedDB kho "kv"); không có localStorage → RAM.
 * Dữ liệu lớn (các bảng lương) KHÔNG nằm ở đây mà ở HAK.Data (IndexedDB).
 */
(function (root) {
  'use strict';
  const HAK = (root.HAK = root.HAK || {});
  const mem = {}, memOnly = new Set();
  HAK.Store = {
    onError: null, lastError: null,
    _fail(key) { this.lastError = { key, at: Date.now() }; if (typeof this.onError === 'function') { try { this.onError(key); } catch (e) { /* noop */ } } },
    get(key, def) {
      if (memOnly.has(key)) return key in mem ? mem[key] : def;
      try { const v = root.localStorage.getItem(key); if (v !== null) return JSON.parse(v); } catch (e) { /* dùng RAM */ }
      return key in mem ? mem[key] : def;
    },
    set(key, val, opts) {
      mem[key] = val;
      let ls = false;
      try { root.localStorage.setItem(key, JSON.stringify(val)); ls = true; } catch (e) { /* đầy / bị chặn */ }
      if (ls) memOnly.delete(key); else memOnly.add(key);
      const db = HAK.DB && HAK.DB.usable() ? HAK.DB : null;
      if (db && !(opts && opts.dbCommitted)) db.kvPut(key, val, ls).catch(() => { if (!ls) this._fail(key); });
      if (!ls && !db) { this._fail(key); return false; }
      return true;
    },
    remove(key) {
      delete mem[key]; memOnly.delete(key);
      try { root.localStorage.removeItem(key); } catch (e) { /* noop */ }
      if (HAK.DB && HAK.DB.usable()) HAK.DB.kvDel(key).catch(() => { /* bỏ qua */ });
    },
    keys() {
      const ks = new Set(Object.keys(mem));
      try { for (let i = 0; i < root.localStorage.length; i++) ks.add(root.localStorage.key(i)); } catch (e) { /* noop */ }
      return Array.from(ks).filter((k) => k.indexOf('hak.') === 0).sort();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
