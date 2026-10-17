// FSC/PEFC dossier score and day-difference scenario only. No payroll edits.
(function(root,factory){var api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else{root.HAKKPI=root.HAKKPI||{};root.HAKKPI.forestDossier=api;}})(typeof window!=="undefined"?window:this,function(){"use strict";
function n(x){if(x==null||x===""||typeof x==="boolean")return null;var v=Number(x);return Number.isFinite(v)?v:null;}
function evaluate(o){o=o||{};var e=[];var done=n(o.checked),ok=n(o.compliant),worked=n(o.workedDays),rate=n(o.ratePerDay),target=n(o.target),std=n(o.salaryDays),scheduled=n(o.scheduledDays),calendar=n(o.calendarDays);
if(done===null||done<=0||ok===null||ok<0||ok>done)e.push("Thiếu số hồ sơ kiểm và số hồ sơ đạt");
if(target===null||target<=0||target>1)e.push("Mục tiêu phải trong khoảng (0,1]");
if(worked===null||worked<0||worked>31)e.push("Ngày công thực tế không hợp lệ");
if(std===null||std<=0||std>31)e.push("Mốc công lương phải từ 1 đến 31");
if(calendar===null||calendar<28||calendar>31)e.push("Ngày lịch của tháng phải là 28 đến 31");
if(scheduled===null||scheduled<0||scheduled>calendar||scheduled<std)e.push("Công theo lịch phải từ mốc công lương đến số ngày lịch");
if(worked!==null&&calendar!==null&&worked>calendar)e.push("Công thực tế vượt ngày lịch");
if(rate===null||rate<0)e.push("Chưa có mức quy đổi/ngày hợp lệ");
if(!String(o.unit||"").trim())e.push("Phải khai báo đơn vị mức 100,200 (điểm, nghìn đồng hay đồng)");
if(e.length)return {ok:false,errors:e,payrollWriteAllowed:false};
var salaryDays=Math.min(worked,std),days=Math.min(Math.max(0,worked-std),scheduled-std),outsideScheduleDays=Math.max(0,worked-scheduled);
var ratio=ok/done,score=Math.min(120,100*ratio/target),equivalent=days*rate;
return {ok:true,ratio:ratio,score:score,calendarDays:calendar,scheduledDays:scheduled,workedDays:worked,salaryDays:salaryDays,fscDays:days,dayDifference:days,outsideScheduleDays:outsideScheduleDays,unit:String(o.unit),equivalent:equivalent,mode:"COMPARE_ONLY",payrollWriteAllowed:false,warnings:["24 công lương + 2 công FSC trong lịch 26/30 chỉ là cách phân bổ nội bộ, không bỏ nghĩa vụ lương ngày làm bình thường và không tạo ra giờ tăng ca.","KPI FSC phải có chứng từ và duyệt riêng; nếu đã nằm trong mức lương tháng bảo đảm thì không tự cộng thêm ngoài mức đó."]};
}
return Object.freeze({evaluate:evaluate});});