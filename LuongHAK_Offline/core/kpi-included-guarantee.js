// HAK KPI Bridge — fixed contractual monthly amount INCLUDES hygiene and KPI.
// Standalone pure simulator: never modifies payroll, BHXH, invoices, or closed periods.
// Do not infer approval, job performance or insurance treatment from a reconciled salary.
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.HAKKPI = root.HAKKPI || {}; root.HAKKPI.included = api; }
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";
  var DEFAULT_RATES = Object.freeze({ A:1, B:0.90, C:0.70, D:0 });
  function number(v) { if (v === "" || v == null || typeof v === "boolean") return null; var n = Number(v); return Number.isFinite(n) ? n : null; }
  function round(n) { return Math.round(n); }
  function read(v, name, errors, zeroAllowed, max) {
    var n = number(v);
    if (n === null || n < (zeroAllowed ? 0 : Number.EPSILON) || (max !== undefined && n > max)) {
      errors.push("Giá trị không hợp lệ: " + name); return null;
    }
    return n;
  }
  // Monthly share is a target allocation, not an instruction to alter contractual pay or BHXH.
  function calc(args) {
    args = args || {};
    var errors=[], warnings=[];
    var M=read(args.guaranteedMonthly,"thu nhập tháng bảo đảm",errors,true);
    var C=read(args.baseMonthly,"lương thời gian theo hợp đồng",errors,true);
    var V=read(args.hygieneTarget,"quỹ vệ sinh tháng",errors,true);
    var P=read(args.kpiTarget,"quỹ KPI tháng nằm trong mức bảo đảm",errors,true);
    var F=read(args.otherInsideTarget==null?0:args.otherInsideTarget,"khoản khác trong mức bảo đảm",errors,true);
    var N=read(args.standardDays,"công chuẩn",errors,false,31);
    var D=read(args.paidDays,"công hưởng hợp lệ",errors,true,31);
    var DV=read(args.hygieneDays,"ngày đủ điều kiện vệ sinh",errors,true,31);
    var DP=read(args.kpiDays,"ngày hưởng KPI",errors,true,31);
    var KV=read(args.hygieneFactor,"hệ số vệ sinh",errors,true,2);
    var KP=read(args.kpiFactor,"hệ số KPI",errors,true,2);
    var H=read(args.guaranteeEntitlementRatio,"tỷ lệ quyền hưởng mức bảo đảm",errors,true,1);
    if (D!==null && DV!==null && DV>D) errors.push("Ngày vệ sinh không được vượt ngày công hưởng");
    if (D!==null && DP!==null && DP>D) errors.push("Ngày KPI không được vượt ngày công hưởng");
    if (N!==null && N>0 && M!==null && C!==null && V!==null && P!==null && F!==null) {
      var diff=round(C+V+P+F-M);
      if (Math.abs(diff)>1) errors.push("Tổng cơ cấu C+V+P+F phải bằng M; hiện lệch "+diff+" đồng");
    }
    if (!errors.length && D>N) warnings.push("Công vượt chuẩn cần phân loại; không mặc nhiên là tăng ca, không cộng công vượt vào các cấu phần dưới đây");
    if (!args.contractVerified) warnings.push("Cần đối chiếu C, M và quyền hưởng bảo đảm với hợp đồng/quy chế");
    if (!args.kpiApproved) warnings.push("KPI và hệ số K_P chưa duyệt; kết quả chỉ là mô phỏng");
    if (!args.hygieneReviewed) warnings.push("K_V và số ngày vệ sinh phải có bảng chấm/biên bản xác nhận");
    if (H!==null && H<1) warnings.push("Giảm tỷ lệ quyền hưởng bảo đảm chỉ theo căn cứ HĐLĐ/nghỉ không lương, không suy từ KPI hay vệ sinh");
    if (errors.length) return {ok:false,mode:"COMPARE_ONLY",status:"INVALID",errors:errors,warnings:warnings,payrollWriteAllowed:false};
    var rD=Math.min(D,N)/N, rV=Math.min(DV,N)/N, rP=Math.min(DP,N)/N;
    var base=round(C*rD),other=round(F*rD),hygiene=round(V*rV*KV),kpi=round(P*rP*KP);
    var preTopup=base+other+hygiene+kpi;
    var floor=round(M*H),topup=Math.max(0,floor-preTopup),total=preTopup+topup;
    var excess=Math.max(0,preTopup-floor);
    if (excess>0) warnings.push("Cấu phần thực đạt vượt mức bảo đảm: cần rà soát quyền hưởng phần vượt, không tự cắt lương đã phát sinh hoặc tự chi thưởng ngoài cam kết");
    return {
      ok:true,mode:"FIXED_INCLUDES_KPI",status:"SIMULATION_ONLY",payrollWriteAllowed:false,
      allocation:{baseMonthly:C,hygieneMonthly:V,kpiMonthly:P,otherMonthly:F,monthlyTotal:M,allocationDifference:round(C+V+P+F-M)},
      ratios:{regular:rD,hygiene:rV,kpi:rP,guaranteeEntitlement:H},
      components:{baseTime:base,otherInside:other,hygieneEarned:hygiene,kpiEarned:kpi,
        beforeTopup:preTopup,guaranteeFloor:floor,guaranteeTopup:topup,afterTopup:total,
        excessBeforeTopup:excess},
      sensitivity:{perHygieneFactor:V*rV,perKpiFactor:P*rP,
        perRegularWorkday:(C+F)/N,perHygieneDay:V*KV/N,perKpiDay:P*KP/N},
      warnings:warnings,errors:[]
    };
  }
  // ObservedPRETOPUP is essential: final guaranteed pay alone does not identify factors.
  function infer(args) {
    args=args||{};
    var observed=number(args.observedBeforeTopup);
    if (observed===null||observed<0)return {ok:false,identifiable:false,reason:"Cần tổng các cấu phần thực đạt TRƯỚC bù bảo đảm; lương cuối kỳ không xác định được hệ số"};
    var fields=Object.assign({},args,{hygieneFactor:1,kpiFactor:1});
    var sim=calc(fields);
    if(!sim.ok)return {ok:false,identifiable:false,reason:sim.errors.join("; ")};
    var knownH=number(args.knownHygieneFactor),knownK=number(args.knownKpiFactor);
    if ((knownH===null)===(knownK===null))
      return {ok:false,identifiable:false,reason:"Phải có đúng một hệ số đã được chứng minh độc lập để suy hệ số còn lại"};
    var fixed=sim.components.baseTime+sim.components.otherInside;
    var hv=sim.sensitivity.perHygieneFactor,pk=sim.sensitivity.perKpiFactor;
    var inferred,kind,denom;
    if(knownH!==null){kind="K_P";denom=pk;inferred=(observed-fixed-hv*knownH)/denom;}
    else{kind="K_V";denom=hv;inferred=(observed-fixed-pk*knownK)/denom;}
    if(denom<=0)return {ok:false,identifiable:false,reason:"Quỹ mục tiêu hoặc công hưởng hệ số cần suy bằng 0"};
    if(!Number.isFinite(inferred)||inferred<0||inferred>2)
      return {ok:false,identifiable:false,reason:"Hệ số suy ra ngoài dải 0–2: rà soát số trước bù hoặc khoản trùng"};
    return {ok:true,identifiable:true,status:"RECONCILIATION_ONLY",factor:kind,value:Math.round(inferred*1e6)/1e6,
      formulaBasis:{observedBeforeTopup:observed,fixedEarned:fixed,hygieneScale:hv,kpiScale:pk},
      warning:"Hệ số suy ra chỉ để đối chiếu, không thay thế điểm KPI hay biên bản vệ sinh được duyệt"};
  }
  return Object.freeze({DEFAULT_RATES:DEFAULT_RATES,calc:calc,infer:infer});
});
