// HAK KPI Bridge — wage-time sanitation/maintenance decomposition (comparison ONLY).
// Salary/BHXH labels never determine legal insurance treatment; missing evidence is not pay approval.
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.HAKKPI = root.HAKKPI || {}; root.HAKKPI.timeStructure = api; }
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";
  var CATEGORIES = Object.freeze({
    CN_VS: "Công nhân – vệ sinh, chuyên cần (theo công việc được giao)",
    TX_VS_XE: "Tài xế – vệ sinh, kiểm tra xe",
    CK_VS_TB: "Cơ khí – vệ sinh, bảo dưỡng thiết bị",
    CG_BD_VS_XE: "Cơ giới – bảo dưỡng, vệ sinh xe, máy",
    TK_VS_KHO: "Thủ kho – vệ sinh kho, bãi, khu vực bảo quản và sắp xếp vật tư"
  });
  function number(v) {
    if (v === "" || v == null || typeof v === "boolean") return null;
    var n = Number(v); return Number.isFinite(n) ? n : null;
  }
  function round(n) { return Math.round(n); }
  var CARE_LEVELS = Object.freeze({ A:1, B:0.90, C:0.70, D:0 });
  function careByLevel(options) {
    options=options||{};
    var errors=[], issues=[], mode=String(options.mode||""), rates=options.rates||CARE_LEVELS;
    var monthly=number(options.monthlyAmount), std=number(options.standardDays), days=number(options.paidDays);
    if(mode!=="BY_DAY" && mode!=="MONTH") errors.push("Chọn cách xếp mức theo ngày hoặc theo tháng");
    if(monthly===null||monthly<0) errors.push("Thiếu mức vệ sinh/bảo dưỡng tháng được duyệt");
    if(std===null||std<=0||std>31||days===null||days<0||days>31) errors.push("Công chuẩn hoặc ngày hưởng không hợp lệ");
    var keys=["A","B","C","D"], kRate={};
    keys.forEach(function(key){var k=number(rates[key]);if(k===null||k<0||k>1)errors.push("Hệ số mức "+key+" phải từ 0 đến 1");else kRate[key]=k;});
    var eligible=options.eligibleDays===undefined||options.eligibleDays===null||options.eligibleDays===""?
      (std===null||days===null?null:Math.min(days,std)):number(options.eligibleDays);
    if(eligible===null||eligible<0||(std!==null&&days!==null&&eligible>Math.min(days,std)+1e-9))
      errors.push("Ngày đủ điều kiện hưởng vệ sinh không được vượt MIN(công hưởng, công chuẩn)");
    var perLevel={}, credited=0, graded=0;
    if(mode==="MONTH"){
      var level=String(options.level||"");
      if(keys.indexOf(level)<0)errors.push("Mức cả tháng phải là A, B, C hoặc D");
      else if(eligible!==null) {credited=eligible*kRate[level];graded=eligible;perLevel[level]=eligible;}
    } else if(mode==="BY_DAY"){
      var counts=options.daysByLevel||{};
      keys.forEach(function(key){
        var n=number(counts[key]);if(n===null||n<0)errors.push("Ngày mức "+key+" thiếu hoặc âm");
        else {perLevel[key]=n;graded+=n;credited+=n*kRate[key];}
      });
      if(eligible!==null&&graded>eligible+1e-9)errors.push("Tổng ngày A/B/C/D vượt ngày đủ điều kiện hưởng; không cộng vượt công chuẩn");
      if(eligible!==null&&graded<eligible-1e-9)issues.push("Còn ngày hưởng chưa được xếp mức: không tự tính mức A");
    }
    if(errors.length)return {ok:false,status:"INVALID",errors:errors,mode:"COMPARE_ONLY"};
    var amount=round(monthly*credited/std);
    return {ok:true,status:"SIMULATION_ONLY",mode:mode,amount:amount,
      gradedDays:graded,eligibleDays:eligible,pendingDays:Math.max(0,eligible-graded),
      weightedDays:credited,averageCoefficient:graded>0?credited/graded:0,
      monthlyRate:monthly,standardDays:std,rates:kRate,daysByLevel:perLevel,
      amountPerAdditionalDay:Object.fromEntries(keys.map(function(key){return [key,monthly*kRate[key]/std];})),
      issues:issues,payrollWriteAllowed:false};
  }
  function compute(input) {
    input = input || {};
    var base = number(input.insuranceBase), target = number(input.monthlyTarget);
    var days = number(input.paidDays), std = number(input.standardDays);
    var k = number(input.careCoefficient), ke = number(input.extraCoefficient);
    var care = number(input.careMonthly), other = number(input.otherMonthly);
    var warnings = [], errors = [];
    var category = String(input.category || "");
    if (!Object.prototype.hasOwnProperty.call(CATEGORIES, category)) errors.push("Phải chọn đúng loại công việc vệ sinh/bảo dưỡng");
    if (base === null || base < 0 || target === null || target < 0) errors.push("Thiếu mức lương BHXH tham chiếu hoặc mức lương tháng mục tiêu");
    if (base !== null && target !== null && target < base) errors.push("Mức mục tiêu thấp hơn mức BHXH tham chiếu: cần rà soát HĐLĐ, không tự tính phần chênh âm");
    if (std === null || std <= 0 || std > 31) errors.push("Công chuẩn phải được xác nhận trong khoảng 1–31");
    if (days === null || days < 0 || days > 31) errors.push("Ngày công phải trong khoảng 0–31 và có bảng chấm công");
    if (k === null || k < 0 || k > 2) errors.push("Hệ số vệ sinh/bảo dưỡng chỉ nhận 0–2 cho mô phỏng");
    if (ke === null || ke < 0 || ke > 5) errors.push("Hệ số công vượt chuẩn chỉ nhận 0–5 cho mô phỏng");
    if (care !== null && care < 0) errors.push("Mức vệ sinh/bảo dưỡng không được âm");
    if (other !== null && other < 0) errors.push("Mức khoản khác không được âm");
    var eligibleDays = input.careEligibleDays === "" || input.careEligibleDays == null
      ? days : number(input.careEligibleDays);
    if (eligibleDays === null || eligibleDays < 0 || (days !== null && eligibleDays > days)) {
      errors.push("Ngày đủ điều kiện vệ sinh không thể vượt số công hưởng hợp lệ");
    }
    if (errors.length) return { ok:false, status:"INVALID", errors:errors, warnings:warnings, mode:"COMPARE_ONLY" };
    var regularDays = Math.min(days, std), extraDays = Math.max(0, days-std);
    var regularRatio = regularDays/std, careRatio = Math.min(eligibleDays,std)/std;
    var allowance = care === null ? 0 : care, extraFixed = other === null ? 0 : other;
    var gap = target-base, unallocated = round(gap-allowance-extraFixed);
    if (gap-allowance-extraFixed < -0.5) errors.push("Tổng phần đã phân bổ vượt chênh lệch mức lương tháng; kiểm tra mức và tên khoản");
    if (care === null) warnings.push("Chưa xác định mức vệ sinh được phê duyệt: chênh lệch lương không tự trở thành tiền vệ sinh");
    if (other === null) warnings.push("Chưa xác nhận các khoản cố định khác trong cấu trúc lương");
    if (unallocated > 0) warnings.push("Còn phần chênh lệch chưa phân loại: không được tự đẩy vào vệ sinh hoặc KPI");
    if (std === 24) warnings.push("Mốc 24 công là cấu hình mô phỏng, phải đối chiếu lịch chuẩn từng nhân viên/kỳ");
    if (extraDays > 0) warnings.push("Công vượt chuẩn không tự động là tăng ca: phải phân loại ngày/giờ và kiểm tra khoản TC đã trả để tránh cộng hai lần");
    if (!input.policyApproved) warnings.push("Quy chế vệ sinh/bảo dưỡng chưa được phê duyệt");
    if (!input.evidenceReviewed) warnings.push("Chưa có xác nhận công việc và chứng từ vệ sinh/bảo dưỡng");
    if (!input.contractVerified) warnings.push("Mức lương BHXH và tháng mục tiêu chưa được đối chiếu hồ sơ HĐLĐ");
    var levelMode=String(input.careLevelMode||"MANUAL");
    var levelResult=null;
    if(levelMode!=="MANUAL"&&levelMode!=="MONTH"&&levelMode!=="BY_DAY")
      return {ok:false,status:"INVALID",errors:["Cách xếp mức hưởng vệ sinh không hợp lệ"],warnings:warnings,mode:"COMPARE_ONLY"};
    if(levelMode!=="MANUAL"){
      if(care===null)return {ok:false,status:"INVALID",errors:["Xếp mức A/B/C/D yêu cầu nhập mức vệ sinh tháng"],warnings:warnings,mode:"COMPARE_ONLY"};
      levelResult=careByLevel({mode:levelMode,monthlyAmount:care,standardDays:std,
        paidDays:days,eligibleDays:input.careEligibleDays,level:input.careLevel,
        daysByLevel:input.careLevelDays,rates:input.careLevelRates});
      if(!levelResult.ok)return {ok:false,status:"INVALID",errors:levelResult.errors,warnings:warnings,mode:"COMPARE_ONLY"};
      warnings=warnings.concat(levelResult.issues);
    }
    var basePart = round(base*regularRatio);
    var carePart = levelResult?levelResult.amount:round(allowance*careRatio*k);
    var otherPart = round(extraFixed*regularRatio);
    var extraPart = round(extraDays*(target/std)*ke);
    var total = basePart+carePart+otherPart+extraPart;
    var denom=allowance*careRatio;
    // A diagnostic sensitivity / implied coefficient, NEVER an approval instruction.
    var implied = denom > 0 ? (target - basePart - otherPart - extraPart)/denom : null;
    var marginalRegular = (base+extraFixed+allowance*(levelResult?levelResult.averageCoefficient:k))/std;
    if (errors.length) return { ok:false,status:"INVALID",errors:errors,warnings:warnings,mode:"COMPARE_ONLY",unallocatedMonthly:unallocated };
    return {
      ok:true, status:"SIMULATION_ONLY", mode:"COMPARE_ONLY", category:category, categoryName:CATEGORIES[category],
      inputs:{insuranceBase:base,monthlyTarget:target,standardDays:std,paidDays:days,careEligibleDays:eligibleDays,careCoefficient:k,extraCoefficient:ke,careMonthly:care,otherMonthly:other},
      days:{regular:regularDays,extra:extraDays,careEligible:eligibleDays,regularRatio:regularRatio,careRatio:careRatio},
      components:{baseTime:basePart,careMaintenance:carePart,otherFixed:otherPart,overStandardPreview:extraPart},
      careLevels:levelResult,
      comparison:{targetMonthly:target,monthlyGap:round(gap),suggestedCareCeiling:round(Math.max(0,gap)),unallocatedMonthly:unallocated,totalSimulated:total,differenceFromTarget:round(total-target)},
      links:{perRegularDayAtFullCare:marginalRegular,perExtraDayAtFactor:target/std*ke,perCareCoefficientUnit:allowance*careRatio,impliedCareCoefficientForTarget:implied},
      issues:warnings,errors:[],payrollWriteAllowed:false
    };
  }
  return Object.freeze({CATEGORIES:CATEGORIES,CARE_LEVELS:CARE_LEVELS,careByLevel:careByLevel,compute:compute});
});
