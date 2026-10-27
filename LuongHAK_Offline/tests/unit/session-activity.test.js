"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),{pathToFileURL}=require("node:url");
const {createGuard}=require("../../main/ipc-guard");
const app=path.resolve(__dirname,"../.."),src=fs.readFileSync(path.join(app,"main.js"),"utf8");
function setup(){let time=100000;const user={tenDangNhap:"synthetic",vaiTro:"admin",khoa:false},event={sender:{id:1},senderFrame:{url:pathToFileURL(path.join(app,"index.html")).href}};
  const guard=createGuard(app,{now:()=>time,readUsers:()=>[user],rolePerms:()=>["hr.edit"],verify:()=>true});guard.login(event,"synthetic","fake");
  let activity;vm.runInNewContext(src.split("\n").find(l=>l.includes('ipcMain.on("auth-activity"')),{guard,ipcMain:{on:(_n,fn)=>{activity=fn;}}});
  return {guard,event,user,tick:ms=>{time+=ms;},activity};
}
test("Main session survives 40 minutes of real input activity; still expires after idle",()=>{
  const s=setup();for(let i=0;i<40;i++){s.tick(60000);s.activity(s.event);assert.equal(s.event.returnValue.ok,true);}
  assert.equal(s.guard.deny(s.event,"hr.edit"),"");s.tick(31*60000);s.activity(s.event);assert.equal(s.event.returnValue.ok,false);
  s.activity(s.event);assert.equal(s.event.returnValue.ok,false,"cannot resurrect expired session");
});
test("Activity does not create login, trust foreign pages or revive revoked users",()=>{
  const s=setup(),foreign={sender:s.event.sender,senderFrame:{url:"https://evil.invalid"}};
  s.activity(foreign);assert.equal(foreign.returnValue.ok,false);
  s.user.khoa=true;s.activity(s.event);assert.equal(s.event.returnValue.ok,false);
  s.user.khoa=false;s.activity(s.event);assert.equal(s.event.returnValue.ok,false);
});
test("Renderer sends activity only for trusted input, throttled, never from background timer",()=>{
  const code=fs.readFileSync(path.join(app,"app.js"),"utf8");let time=100000,calls=0;
  const c={session:{},sessionActivityAt:0,lastActive:0,Date:{now:()=>time},store:{activity:()=>{calls++;return {ok:true};}},toast:()=>{}};vm.createContext(c);
  vm.runInContext(code.slice(code.indexOf("  function noteUserActivity("),code.indexOf('  ["mousedown", "keydown"]')),c);
  c.noteUserActivity({isTrusted:false});assert.equal(calls,0);assert.equal(c.lastActive,0);
  c.noteUserActivity({isTrusted:true});assert.equal(calls,1);time+=1000;c.noteUserActivity({isTrusted:true});assert.equal(calls,1);
  time+=60000;c.noteUserActivity({isTrusted:true});assert.equal(calls,2);c.session=null;time+=60000;c.noteUserActivity({isTrusted:true});assert.equal(calls,2);
});
