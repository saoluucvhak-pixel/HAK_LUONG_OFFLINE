// HAK KPI BRIDGE — independent, offline, fail-closed draft calculator.
// NEVER mutates payroll or infers KPI targets from salary paid / BHXH reference.
(function(root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.HAKKPI = root.HAKKPI || {}; root.HAKKPI.bridge = api; }
})(typeof window !== "undefined" ? window : this, function() {
  "use strict";
  function finite(v) { if (v === "" || v == null || typeof v === "boolean") return null; var n = Number(v); return Number.isFinite(n) ? n : null; }
  function weightTotal(rows) { return rows.reduce(function(s,x) { return s + (finite(x.weight) || 0); }, 0); }
  function validRole(role, indicators) {
    if (!role || !role.id || !Array.isArray(indicators)) return false;
    var a = indicators.filter(function(x) { return x.roleId === role.id; });
    return a.length === (role.weights || []).length && a.length >= 4 && new Set(a.map(function(x) { return x.id; })).size === a.length
      && a.every(function(x) { return finite(x.weight) > 0 && finite(x.target) > 0 && x.direction === "CÀNG CAO CÀNG TỐT"; })
      && Math.abs(weightTotal(a) - 100) < 1e-7;
  }
  function scoreMetric(metric, entry) {
    if (!metric || metric.direction !== "CÀNG CAO CÀNG TỐT") return { ok: false, reason: "Chưa có quy tắc chấm được duyệt cho hướng đo này" };
    var target = finite(metric.target), actual = finite(entry && entry.actual);
    if (target === null || target <= 0) return { ok: false, reason: "Mục tiêu không hợp lệ" };
    if (actual === null || actual < 0) return { ok: false, reason: "Thiếu số thực hiện hợp lệ" };
    var score = Math.min(120, Math.max(0, (actual / target) * 100));
    return { ok: true, score: score, target: target, actual: actual };
  }
  function coefficient(score) {
    if (!Number.isFinite(score) || score < 0) return null;
    return score < 70 ? 0.70 : score < 85 ? 0.85 : score < 95 ? 0.95 : score < 105 ? 1 : score < 115 ? 1.05 : 1.10;
  }
  function evaluate(role, catalogIndicators, entries, opts) {
    opts = opts || {}; entries = entries || {};
    var issues = [], detail = [], ready = true;
    var ms = (catalogIndicators || []).filter(function(x) { return role && x.roleId === role.id; }).sort(function(a,b){ return a.order-b.order; });
    if (!validRole(role, ms)) issues.push("Vai trò cần đủ KPI có mục tiêu, hướng đo và tổng trọng số 100%");
    var total = 0;
    ms.forEach(function(m) {
      var e = entries[m.id] || {};
      var result = scoreMetric(m,e);
      if (result.ok) total += result.score * m.weight / 100;
      else { ready = false; issues.push(m.id + ": " + result.reason); }
      if (!String(e.evidence || "").trim()) { ready = false; issues.push(m.id + ": thiếu chứng từ/bằng chứng"); }
      if (e.status !== "APPROVED") { ready = false; issues.push(m.id + ": chưa được phê duyệt"); }
      detail.push({ id:m.id, name:m.name, weight:m.weight, target:m.target, actual:result.actual, score:result.ok ? result.score:null, evidence:String(e.evidence||""), status:e.status||"DRAFT" });
    });
    if (!opts.policyActive) { ready = false; issues.push("Quy chế chưa ban hành/hiệu lực"); }
    if (!opts.assignmentAccepted) { ready = false; issues.push("Chưa xác nhận giao KPI cho cá nhân"); }
    if (role && role.mode !== "KPI_TIME") { ready = false; issues.push("Vai trò chỉ theo dõi hoặc tính theo quyết định kỳ riêng; không tự động trả KPI tháng"); }
    if (issues.length) ready = false;
    return { ok: ready, status: ready ? "APPROVED" : "DRAFT", score: ms.length>0 && detail.every(function(x){return x.score!==null;}) ? Math.round(total*10000)/10000 : null,
      coefficient: ready ? coefficient(total) : null,
      previewCoefficient: ms.length>0 && detail.every(function(x){return x.score!==null;}) ? coefficient(total):null,
      details: detail, issues: issues };
  }
  function timeKpi(params) {
    params=params||{};
    var target=finite(params.target), paid=finite(params.paidDays), standard=finite(params.standardDays);
    if (target===null || target<0) return { ok:false,reason:"Thiếu quỹ KPI mục tiêu đã xác định riêng theo hợp đồng/quy chế" };
    if (paid===null || paid<0 || standard===null || standard<=0) return { ok:false,reason:"Thiếu công hưởng KPI/công chuẩn hợp lệ" };
    var evalr=params.evaluation;
    if (!evalr || !evalr.ok || evalr.coefficient===null) return { ok:false,reason:"Chưa có đánh giá đủ điều kiện duyệt; không được tạo tiền KPI chính thức" };
    if (!params.entitlementConfirmed) return { ok:false,reason:"Chưa xác nhận quyền hưởng KPI theo HĐLĐ/quy chế" };
    var ratio=Math.min(1,paid/standard);
    return { ok:true,ratio:ratio,amount:Math.round(target*ratio*evalr.coefficient),coefficient:evalr.coefficient };
  }
  function bridgeDiff(legacy, components) {
    var a=finite(legacy);
    if(a===null) return {ok:false,reason:"Thiếu tổng lương nguồn để đối chiếu"};
    if(!Array.isArray(components)||!components.length) return {ok:false,reason:"Thiếu các cấu phần lương theo quy chế"};
    var total=0;
    for(var i=0;i<components.length;i++){var v=finite(components[i].amount);if(v===null)return {ok:false,reason:"Thiếu giá trị hợp lệ cho "+String(components[i].name||i)};total+=v;}
    return {ok:true,legacy:a,simulation:Math.round(total*100)/100,difference:Math.round((total-a)*100)/100,mode:"COMPARE_ONLY"};
  }
  return Object.freeze({validRole:validRole,scoreMetric:scoreMetric,coefficient:coefficient,evaluate:evaluate,timeKpi:timeKpi,bridgeDiff:bridgeDiff});
});
