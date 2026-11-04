'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{_electron}=require('playwright'),{fixture}=require('../fixtures/production-carry'),G=require('../../main/payroll-gate');
(async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hak-bandam-direct-')),download=path.join(dir,'downloads'),shots=process.env.E2E_SHOTS||path.join(dir,'shots');fs.mkdirSync(shots,{recursive:true});const d=fixture();d.dm_luong[0]['Đơn giá bơm dăm']=30000;for(let i=0;i<35;i++)d.chitiethd.push({...d.chitiethd[0],'Hiệu lực từ':'2024-'+String(1+i%12).padStart(2,'0')+'-'+String(1+Math.floor(i/12)).padStart(2,'0')});d.auditlog=[];d.baomat=[];d.schemaVersion=2;const salt=crypto.randomBytes(16).toString('hex'),iter=210000,password='PumpTest2026';d.nguoidung=[{id:'ADMIN',tenDangNhap:'admin',hoTen:'Synthetic Admin',vaiTro:'admin',salt,iter,hash:crypto.pbkdf2Sync(password,Buffer.from(salt,'hex'),iter,32,'sha256').toString('hex')}];fs.writeFileSync(path.join(dir,'data.json'),JSON.stringify(d));const read=()=>JSON.parse(fs.readFileSync(path.join(dir,'data.json'),'utf8'));let app;try{app=await _electron.launch({executablePath:require('electron'),args:['--no-sandbox',path.resolve(__dirname,'../..')],env:{...process.env,HAK_USER_DATA:dir,HAK_DOWNLOAD_DIR:download,HAK_NO_SHELL:'1'}});const w=await app.firstWindow(),errors=[],dialogs=[];w.on('pageerror',e=>errors.push(e.message));w.on('dialog',x=>{dialogs.push(x.message());x.accept();});await w.waitForSelector('#main input[data-f=u]');await w.fill('#main input[data-f=u]','admin');await w.fill('#main input[data-f=p]',password);await w.click('#main button.big');await w.waitForSelector('#nav button[data-k=bandam]');await w.click('#nav button[data-k=bandam]');await w.selectOption('#top select','9');await w.fill('#top input[type=number]','2026');await w.dispatchEvent('#top input[type=number]','change');
await w.setViewportSize({width:1366,height:768});
await w.click('#nav button[data-k=nhansu]');await w.locator('#main table tbody tr').first().click();
await w.locator('.subtabs button').filter({hasText:'Hợp đồng lao động'}).first().click();
await w.getByRole('button',{name:/Chi tiết hợp đồng/}).click();
async function probe(label){
 await w.waitForTimeout(250);
 await w.evaluate(()=>{window._scrollDlg=document.querySelector('#modal .dlg');window._scrollBody=document.querySelector('#modal .dlg>.bd');window._dialogRect=window._scrollDlg.getBoundingClientRect().toJSON();window._mainScroll=document.querySelector('main').scrollTop;});
 const bd=w.locator('#modal .dlg>.bd'),box=await bd.boundingBox();
 await w.mouse.move(box.x+box.width/2,box.y+box.height/2);await w.mouse.wheel(0,600);await w.waitForTimeout(200);
 const scroll=await bd.evaluate(el=>el.scrollTop);
 const state=await w.evaluate(()=>({same:window._scrollDlg===document.querySelector('#modal .dlg'),sameBody:window._scrollBody===document.querySelector('#modal .dlg>.bd'),blur:getComputedStyle(document.querySelector('#modal')).backdropFilter,chain:getComputedStyle(window._scrollBody).overscrollBehavior,rect:window._scrollDlg.getBoundingClientRect().toJSON(),oldRect:window._dialogRect,main:document.querySelector('main').scrollTop,oldMain:window._mainScroll}));
 assert.equal(state.same,true);assert.equal(state.sameBody,true);assert.equal(state.blur,'none');assert.equal(state.chain,'contain');assert.equal(state.main,state.oldMain);assert.equal(state.rect.x,state.oldRect.x);assert.equal(state.rect.y,state.oldRect.y);assert.equal(state.rect.width,state.oldRect.width);
 await w.mouse.move(box.x+box.width-5,box.y+30);await w.mouse.down();await w.mouse.move(box.x+box.width-5,box.y+box.height-30,{steps:15});await w.mouse.up();await w.waitForTimeout(200);
 assert.equal(await w.locator('#modal .dlg').evaluate(el=>el===window._scrollDlg),true);
 console.log('PASS',label,'wheel/scrollbar drag retains dialog/body, position, width and background scroll; blur disabled; scrollTop',scroll);
}
await probe('parent contract detail');
await w.locator('#modal .bd').evaluate(el=>el.scrollTop=0);
await w.locator('[data-hd-detail] table tbody tr').first().click();
await probe('contract edit drawer');
const input=w.locator('#modal .fld[data-k="Ghi chú"] textarea');
if(await input.count()){await input.fill('Drag selection test');await input.scrollIntoViewIfNeeded();const b=await input.boundingBox();await w.mouse.move(b.x+8,b.y+10);await w.mouse.down();await w.mouse.move(b.x+b.width-8,b.y+15,{steps:20});await w.mouse.up();assert.equal(await input.inputValue(),'Drag selection test');assert.equal(await w.locator('#modal .dlg').evaluate(el=>el===window._scrollDlg),true);}
assert.deepEqual(errors,[]);console.log('PASS text selection preserves editor and draft');
}finally{if(app){await app.evaluate(({BrowserWindow})=>{for(const win of BrowserWindow.getAllWindows())win.destroy();}).catch(()=>{});await app.close().catch(()=>{});}}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
