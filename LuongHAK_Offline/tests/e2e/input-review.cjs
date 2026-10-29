'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{_electron}=require('playwright'),{fixture}=require('../fixtures/production-carry'),G=require('../../main/payroll-gate');
(async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hak-bandam-direct-')),download=path.join(dir,'downloads'),shots=process.env.E2E_SHOTS||path.join(dir,'shots');fs.mkdirSync(shots,{recursive:true});const d=fixture();d.dm_luong[0]['Đơn giá bơm dăm']=30000;d.auditlog=[];d.baomat=[];d.schemaVersion=2;const salt=crypto.randomBytes(16).toString('hex'),iter=210000,password='PumpTest2026';d.nguoidung=[{id:'ADMIN',tenDangNhap:'admin',hoTen:'Synthetic Admin',vaiTro:'admin',salt,iter,hash:crypto.pbkdf2Sync(password,Buffer.from(salt,'hex'),iter,32,'sha256').toString('hex')}];fs.writeFileSync(path.join(dir,'data.json'),JSON.stringify(d));const read=()=>JSON.parse(fs.readFileSync(path.join(dir,'data.json'),'utf8'));let app;try{app=await _electron.launch({executablePath:require('electron'),args:['--no-sandbox',path.resolve(__dirname,'../..')],env:{...process.env,HAK_USER_DATA:dir,HAK_DOWNLOAD_DIR:download,HAK_NO_SHELL:'1'}});const w=await app.firstWindow(),errors=[],dialogs=[];w.on('pageerror',e=>errors.push(e.message));w.on('dialog',x=>{dialogs.push(x.message());x.accept();});await w.waitForSelector('#main input[data-f=u]');await w.fill('#main input[data-f=u]','admin');await w.fill('#main input[data-f=p]',password);await w.click('#main button.big');await w.waitForSelector('#nav button[data-k=bandam]');await w.click('#nav button[data-k=bandam]');await w.selectOption('#top select','9');await w.fill('#top input[type=number]','2026');await w.dispatchEvent('#top input[type=number]','change');

const IR=require('../../core/input-review');
for(const key of ['chamcong','sanluong']) {
 await w.click('#nav button[data-k='+key+']');
 assert.equal(await w.getByRole('button',{name:'✕',exact:true}).count(),0);
 await w.getByRole('button',{name:'Sửa',exact:true}).first().click();
 await w.locator('.dlg input[aria-label="'+(key==='chamcong'?'01':'KL hàng (Tấn)')+'"]').fill(key==='chamcong'?'0.5':'12');
 await w.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
 assert.match(await w.locator('[data-input-review='+key+']').innerText(),/Nháp/);
 assert.throws(()=>G.computeKy(read(),'2026-09',{}),/Nháp/);
 await w.click('#nav button[data-k=luong]');await w.getByRole('button',{name:/Tính lương tháng/}).click();assert.ok(dialogs.some(m=>/Chưa tính lương.*Nháp/.test(m)));
 await w.click('#nav button[data-k='+key+']');
 // Inject disk failure in isolated Electron main; approval must roll back to draft.
 await app.evaluate(()=>{const f=process.getBuiltinModule('fs');globalThis._reviewRename=f.renameSync;f.renameSync=function(){throw Error('SYNTHETIC_DISK_FAILURE');};});
 await w.getByRole('button',{name:'Lưu để tính lương',exact:true}).click();
 await app.evaluate(()=>{process.getBuiltinModule('fs').renameSync=globalThis._reviewRename;delete globalThis._reviewRename;});
 assert.ok(IR.changed(read(),key,'2026-09',''));assert.ok(dialogs.some(m=>/Chưa lưu để tính lương/.test(m)));
 await w.getByRole('button',{name:'Lưu để tính lương',exact:true}).click();assert.equal(IR.changed(read(),key,'2026-09',''),false,JSON.stringify(dialogs));assert.doesNotThrow(()=>G.computeKy(read(),'2026-09',{}));
 console.log('PASS '+key+': draft blocks renderer/main payroll; failed save retains draft; retry approves');
}
// Real Excel upload remains draft; reload preserves it, then approval unlocks calculation.
await w.click('#nav button[data-k=sanluong]');const X=require('../../xlsx.full.min.js'),b=X.utils.book_new(),file=path.join(dir,'input.xlsx');X.utils.book_append_sheet(b,X.utils.json_to_sheet([{'Phiếu cân':'UPLOAD','Ngày cân':'2026-09-01','KL hàng (Tấn)':3,'Mã phòng ban':'02.01'}]),'Sản lượng');fs.writeFileSync(file,X.write(b,{type:'buffer',bookType:'xlsx'}));
const fc=w.waitForEvent('filechooser');await w.getByRole('button',{name:/Nhập Excel/,exact:false}).first().click();await(await fc).setFiles(file);await w.locator('.dlg').getByRole('button',{name:/Ghi/}).last().click();
assert.equal(IR.changed(read(),'sanluong','2026-09',''),true);await w.reload();await w.waitForSelector('#main input[data-f=u]');await w.fill('#main input[data-f=u]','admin');await w.fill('#main input[data-f=p]',password);await w.click('#main button.big');await w.waitForSelector('#nav button[data-k=sanluong]');await w.click('#nav button[data-k=sanluong]');assert.match(await w.locator('[data-input-review=sanluong]').innerText(),/Nháp/);await w.getByRole('button',{name:'Lưu để tính lương',exact:true}).click();assert.equal(IR.changed(read(),'sanluong','2026-09',''),false);assert.deepEqual(errors,[]);console.log('PASS actual Excel upload stays draft across restart until explicit approval');
}finally{if(app)await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
