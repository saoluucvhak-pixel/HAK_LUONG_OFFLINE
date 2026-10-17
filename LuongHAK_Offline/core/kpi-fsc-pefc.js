// FSC/PEFC dossier score and day-difference scenario only. No payroll edits.
(function(root,factory){var api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else{root.HAKKPI=root.HAKKPI||{};root.HAKKPI.forestDossier=api;}})(typeof window!=="undefined"?window:this,function(){"use strict";
function n(x){if(x==null||x===""||typeof x==="boolean")return null;var v=Number(x);return Number.isFinite(v)?v:null;}
function evaluate(o){o=o||{};var e=[];var done=n(o.checked),ok=n(o.compliant),days=n(o.extraDays),rate=n(o.ratePerDay),target=n(o.target),std=n(o.standardDays);
if(done===null||done<=0||ok===null||ok<0||ok>done)e.push("Thiếu số hồ sơ kiểm và số hồ sơ đạt");
if(target===null||target<=0||target>1)e.push("Mục tiêu phải trong khoảng (0,1]");
if(days===null||days<0||days>31)e.push("Ngày công chênh không hợp lệ");
if(std===null||std<=0||std>31)e.push("Công chuẩn không hợp lệ");
if(rate===null||rate<0)e.push("Chưa có mức quy đổi/ngày hợp lệ");
if(!String(o.unit||"").trim())e.push("Phải khai báo đơn vị mức 100,200 (điểm, nghìn đồng hay đồng)");
if(e.length)return {ok:false,errors:e,payrollWriteAllowed:false};
var ratio=ok/done,score=Math.min(120,100*ratio/target),equivalent=days*rate;
return {ok:true,ratio:ratio,score:score,dayDifference:days,unit:String(o.unit),equivalent:equivalent,mode:"COMPARE_ONLY",payrollWriteAllowed:false,warnings:["Quy đổi ngày chênh không phải giờ tăng ca thực tế và không phát sinh tiền lương khi chưa duyệt.","Kết quả phải đối chiếu hồ sơ FSC/PEFC, tình trạng chứng nhận và trách nhiệm từng bộ phận."]};
}
return Object.freeze({evaluate:evaluate});});