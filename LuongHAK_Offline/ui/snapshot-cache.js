// ===== UI / HAK SNAPSHOT CACHE (V11.5, v2.1.1) — bộ nhớ đệm bản chụp theo phiên bản dữ liệu (dbRev + chữ ký kho sigNow) =====
// Dùng cho: (1) kết quả tính lương nhiều kỳ (báo cáo 12 tháng / so sánh kỳ không phải tính lại), (2) khung màn hình báo cáo đã dựng
// (quay lại tab báo cáo gần như tức thì). Nguyên tắc AN TOÀN: mọi mục gắn với `rev` — HỄ rev đổi (dữ liệu đổi, kho đổi từ nơi khác,
// đăng nhập/đăng xuất) là XÓA SẠCH, không bao giờ trả bản cũ. Mục còn bị loại theo LRU và theo tổng "trọng lượng" (số dòng) để không phình RAM.
// Không phụ thuộc gì khác; có thể nạp bằng <script> hoặc require() (để test).
/* global performance */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  var ui = root.HAKUI = root.HAKUI || {};
  ui.snapshotCache = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  /**
   * opts: { maxEntries = 8, maxWeight = Infinity, weigh(value) → số (mặc định 1), verify? { compare(cached, fresh) → true nếu khớp, onMismatch(key, cached, fresh) } }
   * get(key, rev, build, o?) → { value, hit, ms }.  o.useCache === false → luôn dựng mới (vẫn ghi đè mục cũ).
   */
  function create(opts) {
    opts = opts || {};
    var maxEntries = opts.maxEntries > 0 ? opts.maxEntries : 8, maxWeight = opts.maxWeight > 0 ? opts.maxWeight : Infinity;
    var weigh = typeof opts.weigh === "function" ? opts.weigh : function () { return 1; };
    var map = new Map(), curRev = null, total = 0, verifyCfg = opts.verify || null;
    var stat = { hits: 0, misses: 0, bypass: 0, clears: 0, evicted: 0, mismatch: 0, lastBuildMs: 0, lastHitMs: 0 };
    var now = typeof performance !== "undefined" && performance.now ? function () { return performance.now(); } : function () { return Date.now(); };

    function drop(key) { var e = map.get(key); if (e) { total -= e.w; map.delete(key); } }
    function clear() { if (map.size) stat.clears++; map.clear(); total = 0; }
    function trim() { while (map.size > maxEntries || (total > maxWeight && map.size > 1)) { var k = map.keys().next().value; drop(k); stat.evicted++; } }
    function sync(rev) { if (rev !== curRev) { clear(); curRev = rev; } } // rev đổi = dữ liệu đổi → bỏ hết

    function get(key, rev, build, o) {
      sync(rev); o = o || {};
      var t0 = now(), e = map.get(key);
      if (e && o.useCache !== false) {
        map.delete(key); map.set(key, e); // LRU: mới dùng → cuối hàng
        stat.hits++;
        if (verifyCfg) {
          var fresh = build();
          if (!verifyCfg.compare(e.value, fresh)) { stat.mismatch++; if (verifyCfg.onMismatch) verifyCfg.onMismatch(key, e.value, fresh); drop(key); put(key, fresh); stat.lastHitMs = now() - t0; return { value: fresh, hit: false, ms: stat.lastHitMs, mismatch: true }; }
        }
        stat.lastHitMs = now() - t0;
        return { value: e.value, hit: true, ms: stat.lastHitMs };
      }
      if (e) stat.bypass++; else stat.misses++;
      var v = build(); put(key, v); stat.lastBuildMs = now() - t0;
      return { value: v, hit: false, ms: stat.lastBuildMs };
    }
    function put(key, v) { drop(key); var w = Math.max(1, +weigh(v) || 1); map.set(key, { value: v, w: w }); total += w; trim(); }

    return {
      get: get,
      setVerify: function (cfg) { verifyCfg = cfg || null; },
      set: function (key, rev, value) { sync(rev); put(key, value); },
      peek: function (key, rev) { sync(rev); var e = map.get(key); return e ? e.value : undefined; },
      has: function (key, rev) { sync(rev); return map.has(key); },
      invalidate: function (key) { drop(key); },
      clear: clear,
      stats: function () { return Object.assign({ size: map.size, weight: total, rev: curRev }, stat); }
    };
  }

  /** JSON có NGÂN SÁCH ký tự: dừng ngay (trả null) khi vượt — không tuần tự hóa cả đối tượng khổng lồ (VD kết quả tính lương) chỉ để biết nó lớn. */
  function smallJson(v, b) {
    if (v === null) return "null";
    var t = typeof v;
    if (t === "string") { b.left -= v.length + 2; return b.left < 0 ? null : JSON.stringify(v); }
    if (t === "number" || t === "boolean") { b.left -= 8; return b.left < 0 ? null : String(v); }
    if (t === "undefined" || t === "function") return "null";
    if (t !== "object") return null;
    var out = [], i;
    if (Array.isArray(v)) { if (v.length > 64) return null; for (i = 0; i < v.length; i++) { var a = smallJson(v[i], b); if (a === null) return null; out.push(a); } return "[" + out.join(",") + "]"; }
    var keys = Object.keys(v); if (keys.length > 50) return null;
    for (i = 0; i < keys.length; i++) { b.left -= keys[i].length + 3; if (b.left < 0) return null; var x = smallJson(v[keys[i]], b); if (x === null) return null; out.push(JSON.stringify(keys[i]) + ":" + x); }
    return "{" + out.join(",") + "}";
  }

  /** Dấu vân tay TRẠNG THÁI hiển thị: chuỗi ổn định từ các trường của `state`. Giá trị nguyên thủy → ghi thẳng; đối tượng nhỏ → JSON;
   *  đối tượng lớn hoặc không tuần tự hóa được → mã định danh theo tham chiếu (đổi đối tượng = đổi dấu vân tay). Bỏ qua các khóa trong `skip`. */
  function fingerprint(state, skip) {
    skip = skip || {};
    var ids = fingerprint._ids || (fingerprint._ids = new WeakMap()), seq = fingerprint._seq || 0, parts = [];
    Object.keys(state || {}).sort().forEach(function (k) {
      if (skip[k]) return;
      var v = state[k], t = typeof v;
      if (v === null || v === undefined || t === "number" || t === "string" || t === "boolean") { parts.push(k + "=" + String(v)); return; }
      if (t === "function") return;
      var s = smallJson(v, { left: 2000 });
      if (s != null) { parts.push(k + ":" + s); return; }
      var id = ids.get(v); if (!id) { id = ++seq; fingerprint._seq = seq; ids.set(v, id); }
      parts.push(k + "#" + id);
    });
    return parts.join("&");
  }

  return { create: create, fingerprint: fingerprint };
});
