// HAK KPI Bridge — guaranteed contractual pay + independent KPI incentive.
// Pure calculator: simulation-only. Never updates salary, insurance base or closed periods.
(function(root,factory){
  "use strict";
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else { root.HAKKPI=root.HAKKPI||{}; root.HAKKPI.guarantee=api; }
})(typeof window!=="undefined"?window:this,function(){
  "use strict";
  function num(value){
    if(value==null||value===""||typeof value==="boolean")return null;
    var n=Number(value);return Number.isFinite(n)?n:null;
  }
  function money(v){return Math.round(v);}
  function calc(input){
    input=input||{};
    var errors=[],issues=[];
    var fields={
      guaranteeMonthly:num(input.guaranteeMonthly),
      contractualBaseMonthly:num(input.contractualBaseMonthly),
      entitledRatio:num(input.entitledRatio),
      paidDays:num(input.paidDays),
      standardDays:num(input.standardDays),
      careEarned:num(input.careEarned),
      otherMonthly:num(input.otherMonthly),
      kpiTarget:num(input.kpiTarget),
      kpiCoefficient:num(input.kpiCoefficient),
      kpiEligibleDays:num(input.kpiEligibleDays)
    };
    Object.keys(fields).forEach(function(k){
      if(fields[k]===null||fields[k]<0)errors.push("Thiếu hoặc sai "+k);
    });
    if(fields.standardDays===null||fields.standardDays<=0||fields.standardDays>31)errors.push("Công chuẩn phải >0 và <=31");
    if(fields.paidDays!==null&&fields.paidDays>31)errors.push("Công hưởng không thể vượt 31 ngày lịch");
    if(fields.entitledRatio!==null&&fields.entitledRatio>1)errors.push("Tỷ lệ quyền hưởng bảo đảm phải từ 0 đến 1");
    if(fields.kpiCoefficient!==null&&fields.kpiCoefficient>2)errors.push("Hệ số KPI mô phỏng vượt dải cho phép");
    if(fields.kpiEligibleDays!==null&&fields.paidDays!==null&&fields.kpiEligibleDays>fields.paidDays)errors.push("Công KPI không được lớn hơn công hưởng hợp lệ");
    if(fields.entitledRatio>0&&fields.paidDays===0&&!String(input.guaranteeEntitlementReason||"").trim())
      errors.push("Không có công hưởng nhưng vẫn giữ bảo đảm: cần nêu căn cứ pháp lý/loại nghỉ hưởng lương");
    if(fields.careEarned!==null&&fields.careEarned>0&&!input.careReviewed)
      issues.push("Tiền vệ sinh chưa có kết quả duyệt công việc: giá trị chỉ để thử");
    if(!input.contractVerified)issues.push("Chưa đối chiếu hợp đồng và phạm vi mức lương bảo đảm");
    if(!input.guaranteeApproved)issues.push("Chưa xác nhận điều khoản bảo đảm thu nhập của nhân viên/kỳ");
    if(!input.kpiApproved)issues.push("Thưởng KPI chưa phê duyệt: tiền thưởng chỉ là mô phỏng");
    if(fields.entitledRatio!==null&&fields.entitledRatio<1)issues.push("Giảm tỷ lệ bảo đảm cần căn cứ quyền hưởng, không suy từ K vệ sinh/KPI");
    if(fields.paidDays!==null&&fields.standardDays!==null&&fields.paidDays>fields.standardDays)
      issues.push("Ngày công vượt chuẩn phải đối chiếu OT và số tiền đã trả; không cộng phần vượt tự động");
    if(errors.length)return {ok:false,status:"INVALID",errors:errors,issues:issues,mode:"COMPARE_ONLY",payrollWriteAllowed:false};
    var regDays=Math.min(fields.paidDays,fields.standardDays),
        ratio=regDays/fields.standardDays,
        floor=money(fields.guaranteeMonthly*fields.entitledRatio),
        basePay=money(fields.contractualBaseMonthly*ratio),
        otherPay=money(fields.otherMonthly*ratio),
        carePay=money(fields.careEarned);
    var subtotal=basePay+carePay+otherPay;
    var supplement=Math.max(0,floor-subtotal);
    var protectedPay=subtotal+supplement;
    var kpiRatio=Math.min(fields.kpiEligibleDays,fields.standardDays)/fields.standardDays;
    var kpiPreview=money(fields.kpiTarget*kpiRatio*fields.kpiCoefficient);
    var insuranceRef=num(input.insuranceBase);
    if(insuranceRef!==null)issues.push("Lương đóng BHXH chỉ là tham chiếu; không tự xác định căn cứ đóng từ tên khoản");
    return {
      ok:true,status:"SIMULATION_ONLY",mode:"GUARANTEE_PLUS_KPI",payrollWriteAllowed:false,
      inputs:fields,
      components:{contractBaseTime:basePay,careMaintenance:carePay,otherInsideGuarantee:otherPay,
        protectedBeforeTopup:subtotal,guaranteeTopup:supplement,protectedAfterTopup:protectedPay,
        kpiPreview:kpiPreview},
      comparison:{guaranteeFloor:floor,guaranteeMonthly:fields.guaranteeMonthly,
        protectedBelowFloor:Math.max(0,floor-subtotal),
        wageAtOrAboveFloor:protectedPay>=floor,
        totalPreviewWithKpi:protectedPay+kpiPreview,
        totalPreviewWithoutKpi:protectedPay,
        kpiIncludedInGuarantee:false},
      sensitivity:{
        decreaseCareByOne:subtotal<=floor?0:Math.max(0,Math.min(1,subtotal-floor)),
        floorIndependentOfKpi:true,
        additionalKpiEffect:kpiPreview
      },
      issues:issues,errors:[]
    };
  }
  return Object.freeze({calc:calc});
});
