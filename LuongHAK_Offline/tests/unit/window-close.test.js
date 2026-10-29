'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),{EventEmitter}=require('node:events'),{install}=require('../../main/window-close');
function setup(reply,choice=0,busy=false){const w=new EventEmitter(),c=new EventEmitter();let prompts=0,calls=0;w.webContents=c;c.isDestroyed=()=>false;c.executeJavaScript=()=>{calls++;return reply();};w.isDestroyed=()=>!!w.destroyed;w.destroy=()=>{w.destroyed=true;};w.close=()=>{let prevented=false;w.emit('close',{preventDefault:()=>{prevented=true;}});if(!prevented)w.closed=true;};install(w,{dialog:{showMessageBoxSync:()=>{prompts++;return choice;}},isBusy:()=>busy});return {w,c,prompts:()=>prompts,calls:()=>calls};}
const {setImmediate}=require('node:timers');
const tick=()=>new Promise(r=>setImmediate(r));
test('failed flush keeps healthy window open without force-exit prompt',async()=>{const s=setup(()=>Promise.resolve(false));s.w.close();await tick();a.equal(s.w.closed,undefined);a.equal(s.prompts(),0);});
test('successful flush closes once after acknowledgement',async()=>{const s=setup(()=>Promise.resolve(true));s.w.close();await tick();a.equal(s.w.closed,true);a.equal(s.calls(),1);});
test('crash can keep window or confirm exit without running renderer code',()=>{for(const choice of [0,1]){const s=setup(()=>Promise.resolve(true),choice);s.c.emit('render-process-gone');s.w.close();a.equal(!!s.w.destroyed,!!choice);a.equal(s.prompts(),1);a.equal(s.calls(),0);}});
test('rejected renderer flush offers controlled exit',async()=>{const s=setup(()=>Promise.reject(Error('renderer unavailable')),1);s.w.close();await tick();a.equal(s.w.destroyed,true);});
test('active yearly operation blocks forced exit',()=>{const s=setup(()=>Promise.resolve(true),1,true);s.c.emit('render-process-gone');s.w.close();a.equal(s.w.destroyed,undefined);a.equal(s.prompts(),0);});
test('unresponsive renderer uses controlled exit; responsive restores flush path',async()=>{const s=setup(()=>Promise.resolve(true));s.w.emit('unresponsive');s.w.close();a.equal(s.calls(),0);s.w.emit('responsive');s.w.close();await tick();a.equal(s.w.closed,true);});

test('crash during pending flush allows choice and ignores stale successful reply',async()=>{let resolve;const s=setup(()=>new Promise(r=>{resolve=r;}));s.w.close();s.c.emit('render-process-gone');s.w.close();a.equal(s.prompts(),1);resolve(true);await tick();a.equal(s.w.closed,undefined);});
test('unresponsive pending flush does not trap confirmed exit',()=>{const s=setup(()=>new Promise(()=>{}),1);s.w.close();s.w.emit('unresponsive');s.w.close();a.equal(s.w.destroyed,true);});
