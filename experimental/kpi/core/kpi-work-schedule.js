// HAK KPI Bridge — work calendars and verified overtime. No payroll writes.
// Calendar day-equivalents are NOT automatically overtime hours or pay.
(function(root,factory){
  "use strict";
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else{root.HAKKPI=root.HAKKPI||{};root.HAKKPI.workSchedule=api;}
})(typeof window!=="undefined"?window:this,function(){
  "use strict";
  var POLICY_VERSION="2026-DRAFT-WORK-SCHEDULE-01";
  var PROFILES=Object.freeze({
    OFFICE_WEEKLY:"OFFICE_WEEKLY",
    WEIGHBRIDGE_26:"WEIGHBRIDGE_26",
    XNK_22:"XNK_22",
    KTT_22:"KTT_22",
    EXECUTIVE_22:"EXECUTIVE_22",
    CUSTOM:"CUSTOM"
  });
  var ROLE_DEFAULTS=Object.freeze({
    KT:"OFFICE_WEEKLY",THU_QUY:"OFFICE_WEEKLY",NHAN_SU:"OFFICE_WEEKLY",
    HANH_CHINH:"OFFICE_WEEKLY",IT:"OFFICE_WEEKLY",VAT_TU:"OFFICE_WEEKLY",
    KINH_DOANH:"OFFICE_WEEKLY",
    TRAM_CAN:"WEIGHBRIDGE_26",XNK:"XNK_22",KTT:"KTT_22",GD:"EXECUTIVE_22",
    QUAN_DOC:"EXECUTIVE_22",QL_XE:"EXECUTIVE_22"
  });
  function n(v){if(v==null||v===""||typeof v==="boolean")return null;var x=Number(v);return Number.isFinite(x)?x:null;}
  function daysIn(month){var m=/^(\d{4})-(\d{2})$/.exec(String(month||""));if(!m)return null;var y=+m[1],mo=+m[2];if(y<2020||mo<1||mo>12)return null;return new Date(Date.UTC(y,mo,0)).getUTCDate();}
  function standard(opts){
    opts=opts||{};var errors=[],count=daysIn(opts.period);
    if(count===null)errors.push("Kỳ phải có dạng YYYY-MM");
    var profile=String(opts.profile||ROLE_DEFAULTS[opts.roleId]||"");
    if(!Object.prototype.hasOwnProperty.call(PROFILES,profile))errors.push("Chưa có nhóm lịch công; cần gán nhóm hoặc lịch riêng");
    var norm=null,calendar=[];
    if(count!==null&&profile==="OFFICE_WEEKLY"){
      var year=+opts.period.slice(0,4),month=+opts.period.slice(5,7);
      norm=0;
      for(var d=1;d<=count;d++){
        var dow=new Date(Date.UTC(year,month-1,d)).getUTCDay();
        var work=dow===0?0:dow===6?0.5:1;
        norm+=work;calendar.push({day:d,weekday:dow,standardDays:work});
      }
    }else if(profile==="WEIGHBRIDGE_26")norm=26;
    else if(profile==="XNK_22"||profile==="KTT_22"||profile==="EXECUTIVE_22")norm=22;
    else if(profile==="CUSTOM")norm=n(opts.customStandardDays);
    if(norm===null||norm<=0||(count!==null&&norm>count))errors.push("Công chuẩn không hợp lệ");
    var actual=n(opts.workedDays);
    if(actual===null||actual<0||(count!==null&&actual>count))errors.push("Công thực tế phải từ 0 đến số ngày lịch");
    if(errors.length)return {ok:false,errors:errors,payrollWriteAllowed:false};
    var ordinary=Math.min(actual,norm),excess=Math.max(0,actual-norm);
    return {ok:true,mode:"COMPARE_ONLY",payrollWriteAllowed:false,policyVersion:POLICY_VERSION,
      period:opts.period,profile:profile,roleId:opts.roleId||null,calendarDays:count,
      standardDays:norm,workedDays:actual,ordinaryAllocationDays:ordinary,
      candidateExcessDays:excess,calendar:calendar,
      overtimeHours:null,overtimePayVnd:null,
      warnings:["Công vượt chuẩn chỉ là chỉ báo kiểm tra; cần đối chiếu giờ làm thêm thực tế theo ngày/ca và loại ngày.","Công chuẩn theo nhóm là dự thảo; cần xác nhận lịch, HĐLĐ và thời gian làm bình thường của từng công ty/người.","Không chuyển công vượt chuẩn thành KPI FSC hoặc tự khấu trừ lương bảo đảm."]};
  }
  function overtime(args){
    args=args||{};var error=[],hourRate=n(args.eligibleHourlyRateVnd);
    var ordinary=n(args.weekdayHours),weeklyRest=n(args.weeklyRestHours),holiday=n(args.holidayHours);
    if(hourRate===null||hourRate<0)error.push("Thiếu đơn giá giờ hợp lệ theo bản chất tiền lương");
    [["ngày thường",ordinary],["ngày nghỉ hằng tuần",weeklyRest],["lễ/tết",holiday]].forEach(function(p){
      if(p[1]===null||p[1]<0||p[1]>744)error.push("Giờ làm thêm "+p[0]+" không hợp lệ");
    });
    if(!args.timeLogReviewed||!args.overtimeApproved||!String(args.evidenceId||"").trim())
      error.push("Thiếu nhật ký giờ/ca, chứng từ hoặc phê duyệt tăng ca");
    if(args.nightHours&&n(args.nightHours)>0)error.push("Tăng ca ban đêm yêu cầu công thức riêng, chưa hỗ trợ ở mô phỏng này");
    if(error.length)return {ok:false,errors:error,mode:"COMPARE_ONLY",payrollWriteAllowed:false};
    var amount=Math.round(hourRate*(1.5*ordinary+2*weeklyRest+3*holiday));
    return {ok:true,mode:"OVERTIME_PREVIEW",payrollWriteAllowed:false,
      hours:ordinary+weeklyRest+holiday,payVnd:amount,rate:hourRate,
      byType:{weekday:ordinary,weeklyRest:weeklyRest,holiday:holiday},
      warnings:["Số tiền chỉ là mô phỏng; phải rà soát làm đêm, giới hạn giờ, ngày lễ và phần lương giờ thực trả.","Tăng ca là khoản ngoài mức lương bảo đảm có KPI, không dùng bù bảo đảm thay tăng ca."]};
  }
  return Object.freeze({POLICY_VERSION:POLICY_VERSION,PROFILES:PROFILES,ROLE_DEFAULTS:ROLE_DEFAULTS,standard:standard,overtime:overtime});
});
