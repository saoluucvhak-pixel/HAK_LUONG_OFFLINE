// Tái hiện A01 + A02 trên mã v2.0.29 (trước khi sửa). Dữ liệu giả.
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const R=process.env.APPDIR+"/";
const {createSqliteStorage}=require(R+"main/sqlite-storage.js");
const {createStorage}=require(R+"main/storage.js");
const worker=require(R+"main/year-archive-worker.js");
const C=require(R+"core/payroll-close"),IR=require(R+"core/input-review");
const {fixture}=require(R+"tests/fixtures/production-carry");
function seed(){const db=fixture();db.auditlog=[];db.baomat=[];db.schemaVersion=2;
 db.nhanvien=[{_id:"n1","Mã NV":"SYN01","Họ và tên":"Synthetic Person","Trạng thái":"Đang làm việc"}];
 db.chamcong=[{_id:"a1","Kỳ":"2023-01","Mã NV":"SYN01","1":"1"},{_id:"a2","Kỳ":"2026-01","Mã NV":"SYN01","1":"1"}];
 db.psluong=Array.from({length:50},(_,i)=>({_id:"p"+i,"Ngày hạch toán":"2023-01-15","Mã NV":"SYN01","Thưởng":"1000"}));
 db.kyluong=[C.buildSnapshot(db,"2023-01",{bangluong:[{"Mã NV":"SYN01","Họ và tên":"Synthetic Person","Thực lĩnh":1000000}],bhxh:[],tncn:[],canhbao:[]},db.nhanvien,{user:"tester"})];
 IR.initialize(db);IR.approve(db,"chamcong","2023-01","","fx");IR.approve(db,"chamcong","2026-01","","fx");return db;}
const realRename=fs.renameSync;
const failExport=()=>{fs.renameSync=function(a,b){ if(String(b).endsWith("data.json")){const e=new Error("EACCES: permission denied");e.code="EACCES";throw e;} return realRename.apply(this,arguments);};};
const okExport=()=>{fs.renameSync=realRename;};
(async()=>{
 // ---- A01
 let dir=fs.mkdtempSync(path.join(os.tmpdir(),"rep-a01-")); const s=createSqliteStorage(dir,{exportDelayMs:600000});
 const d=seed(); s.save(JSON.stringify(d)); s.syncJson();
 d.chamcong.push({_id:"new","Kỳ":"2026-02","Mã NV":"SYN01","1":"1"}); const r1=s.save(JSON.stringify(d));
 failExport(); const sync=s.syncJson(); // mô phỏng main.js: bỏ qua kết quả
 const res=await worker.run(dir,"preview",[2023]); const adopt=s.adoptJson(); okExport();
 const has=(JSON.parse(s.load().text).chamcong||[]).some(r=>r._id==="new");
 console.log("A01:",JSON.stringify({saveOk:r1===true,syncJsonResult:sync,previewOk:res&&res.ok,adoptResult:adopt,newRowStillInState:has}));
 // ---- A02
 dir=fs.mkdtempSync(path.join(os.tmpdir(),"rep-a02-")); const t=createSqliteStorage(dir,{exportDelayMs:600000});
 const e=seed(); t.save(JSON.stringify(e)); t.syncJson();
 e.nhanvien[0]["Họ và tên"]="DỮ LIỆU MỚI"; t.save(JSON.stringify(e)); const latest=JSON.stringify(e);
 failExport(); const f=t.backup("manual"); okExport();
 const text=f?t.readBackup(f).text:null;
 console.log("A02:",JSON.stringify({backupReturned:f,backupReportedSuccess:!!f,backupEqualsLatest:text===latest,sqliteEqualsLatest:t.load().text===latest}));
 process.exit(0);
})();
