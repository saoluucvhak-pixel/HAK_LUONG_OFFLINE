// FSC/PEFC dossier score and day-difference scenario only. No payroll edits.
(function(root,factory){var api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else{root.HAKKPI=root.HAKKPI||{};root.HAKKPI.forestDossier=api;}})(typeof window!=="undefined"?window:this,function(){"use strict";
function n(x){if(x==null||x===""||typeof x==="boolean")return null;var v=Number(x);return Number.isFinite(v)?v:null;}
function evaluate(o){o=o||{};var e=[];var done=n(o.checked),ok=n(o.compliant),target=n(o.target),assigned=n(o.assignedFscUnits);
if(done===null||done<=0||ok===null||ok<0||ok>done)e.push("Thiếu số hồ sơ kiểm và số hồ sơ đạt");
if(target===null||target<=0||target>1)e.push("Mục tiêu phải trong khoảng (0,1]");
if(assigned===null||assigned<0) e.push("Thiếu khối lượng hồ sơ FSC được giao và xác nhận");
if(e.length)return {ok:false,errors:e,payrollWriteAllowed:false};
var ratio=ok/done,score=Math.min(120,100*ratio/target),qualityCoefficient=Math.min(1,ratio/target);
var fund=n(o.fscFundVnd),unitRate=n(o.fscUnitRateVnd);
var approved=o.unit==="VND"&&fund!==null&&fund>=0&&unitRate!==null&&unitRate>=0&&o.evidenceReviewed===true&&o.fundApproved===true;
var singleFscPay=approved?Math.round(Math.min(fund,assigned*unitRate*qualityCoefficient)):null;
return {ok:true,ratio:ratio,score:score,qualityCoefficient:qualityCoefficient,assignedFscUnits:assigned,
singleFscPayVnd:singleFscPay,fundRemainingVnd:singleFscPay===null?null:fund-singleFscPay,
monetaryReady:approved,mode:"COMPARE_ONLY",payrollWriteAllowed:false,
warnings:["KPI FSC tính theo số hồ sơ/nhiệm vụ FSC được giao và chất lượng đã duyệt, KHÔNG tính từ công vượt chuẩn.",
"Giờ/công vượt chuẩn phải đối chiếu riêng với lịch công và giờ tăng ca thực tế.",
"Khoản FSC chỉ được phân bổ MỘT LẦN trong quỹ KPI nằm trong lương tháng bảo đảm."]};
}
return Object.freeze({evaluate:evaluate});});