"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const src=fs.readFileSync(path.join(__dirname,"../../app.js"),"utf8");
function env(initial,saveOK,hasFile=true){
  const alerts=[],toasts=[],writes=[];
  const c={db:initial,dirty:hasFile,session:null,readOnly:false,loadError:null,ALL:{nhanvien:{}},HRT:{},need:()=>true,
    SCH:{validate:()=>({fatal:[],errors:[]})},chotSummary:()=>({}),summarize:()=>"synthetic",confirm:()=>true,
    backupNow:()=>hasFile?"synthetic-backup.json":null,store:{hasDataFile:()=>hasFile},
    HRM:{migrate:()=>[]},INT:{normalizeDataset:()=>({messages:[]})},ensureTables:()=>{if(!c.db.auditlog)c.db.auditlog=[];},
    PERM:{findUser:()=>null},audit:()=>c.db.auditlog.push({thaoTac:"Restore test"}),
    saveNow:()=>{writes.push(JSON.stringify(c.db));c.lastSaveError=saveOK?"":"SIMULATED_WRITE_FAILURE";return saveOK;},
    alert:m=>alerts.push(m),toast:m=>toasts.push(m),render:()=>{},st:{kq:{stale:true}}};
  vm.createContext(c);
  vm.runInContext(src.slice(src.indexOf("  function backupOrBlock("),src.indexOf("  // Người thực hiện:")),c);
  vm.runInContext(src.slice(src.indexOf("  function restoreFromText("),src.indexOf("  /** Lịch sao lưu")),c);
  return {c,alerts,toasts,writes};
}
for(const strict of [undefined,true])test("Restore write failure rolls back, does not run success/verify; strict="+strict,()=>{
  const before={nhanvien:[{"Mã NV":"OLD_TEST"}],auditlog:[{thaoTac:"Keep original"}]},snapshot=JSON.stringify(before);
  const {c,alerts,toasts,writes}=env(before,false);let after=0,verify=0,fail="";
  c.restoreFromText(JSON.stringify({nhanvien:[{"Mã NV":"NEW_TEST"}]}),"synthetic.json",{strict,after:()=>after++,verify:()=>{verify++;return Promise.resolve({ok:true});},onFail:m=>{fail=m;}});
  assert.equal(JSON.stringify(c.db),snapshot);assert.equal(JSON.stringify(before),snapshot,"shared journal must not mutate rollback state");
  assert.equal(after,0);assert.equal(verify,0);assert.equal(writes.length,1);assert.equal(toasts.length,0);assert.equal(alerts.length,0);assert.match(fail,/SIMULATED_WRITE_FAILURE/);
});
for(const journal of [undefined,[],[{thaoTac:"Old machine history"}]])test("New machine restores independently of journal: "+JSON.stringify(journal),()=>{
  const incoming={nhanvien:[{"Mã NV":"RESTORED_TEST"}]};if(journal!==undefined)incoming.auditlog=journal;
  const {c,toasts,writes}=env({},true,false);let after=0;
  c.restoreFromText(JSON.stringify(incoming),"synthetic.json",{after:()=>after++});
  assert.equal(c.db.nhanvien[0]["Mã NV"],"RESTORED_TEST");assert.equal(writes.length,1);assert.equal(after,1);assert.equal(toasts.length,1);
  assert.equal(c.db.auditlog.length,(journal||[]).length+1);
});
test("New machine write failure stays in original setup, never reports restore success",()=>{
  const {c,toasts,alerts}=env({},false,false);let after=0;
  c.restoreFromText(JSON.stringify({nhanvien:[{"Mã NV":"NEW_TEST"}]}),"synthetic.json",{after:()=>after++});
  assert.equal(c.db.nhanvien,undefined);assert.equal(after,0);assert.equal(toasts.length,0);assert.match(alerts[0],/KHÔI PHỤC KHÔNG THÀNH CÔNG/);
});
test("Post-restore verification failure restores original data and never runs success callback",async()=>{
  const before={nhanvien:[{"Mã NV":"OLD_TEST"}],auditlog:[]},snapshot=JSON.stringify(before);
  const {c,toasts,writes}=env(before,true);let after=0,fail="";
  c.restoreFromText(JSON.stringify({nhanvien:[{"Mã NV":"NEW_TEST"}]}),"synthetic.json",{after:()=>after++,verify:()=>Promise.resolve({ok:false,msg:"VERIFY_FAILED"}),onFail:m=>{fail=m;}});
  await Promise.resolve();assert.equal(JSON.stringify(c.db),snapshot);assert.equal(writes.length,2);assert.equal(after,0);assert.equal(toasts.length,0);assert.match(fail,/VERIFY_FAILED/);
});
