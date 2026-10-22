'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {_electron}=require('playwright'),APP=path.resolve(__dirname,'../..'),C=require('../../core/payroll-close');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hak-year-e2e-')),downloads=path.join(dir,'downloads'),results=[],dialogs=[];let app;
function check(name,condition){results.push({name,pass:!!condition});assert.ok(condition,name);console.log('PASS '+name);}
async function login(w){
 await w.waitForSelector('#main > *');const title=await w.locator('#top h2').innerText();
 if(/Thiết lập/.test(title)){for(const[k,v]of[['cty','Synthetic Archive Test'],['ma','YEART'],['u','admin'],['n','Archive Tester'],['p','ArchiveTest2026'],['p2','ArchiveTest2026']])await w.fill('#main input[data-f='+k+']',v);await w.click('#main button.big');await w.waitForSelector('[data-recovery]');await w.click('.dlg footer button.pri');}
 else if(/Đăng nhập/.test(title)){await w.fill('#main input[data-f=u]','admin');await w.fill('#main input[data-f=p]','ArchiveTest2026');await w.click('#main button.big');}
 await w.waitForSelector('#nav button[data-k=backup]');
}
async function launch(){app=await _electron.launch({executablePath:require('electron'),args:['--no-sandbox',APP],env:{...process.env,HAK_USER_DATA:dir,HAK_DOWNLOAD_DIR:downloads,HAK_NO_SHELL:'1'}});const w=await app.firstWindow();w.on('dialog',d=>{dialogs.push(d.message());return d.accept(d.type()==='prompt'?'Review archived year':undefined);});await login(w);return w;}
(async()=>{
 let w=await launch();await app.close();app=null;
 const file=path.join(dir,'data.json'),db=JSON.parse(fs.readFileSync(file,'utf8'));
 db.nhanvien=[{_id:'n1','Mã NV':'SYN01','Họ và tên':'Synthetic Person','Trạng thái':'Đang làm việc'}];
 db.chamcong=[{_id:'a1','Kỳ':'2023-01','Mã NV':'SYN01','1':'1'},{_id:'a2','Kỳ':'2026-01','Mã NV':'SYN01','1':'1'}];
 db.psluong=Array.from({length:1000},(_,i)=>({_id:'p'+i,'Ngày hạch toán':'2023-01-15','Mã NV':'SYN01','Thưởng':'1000','Ghi chú':'Synthetic historical record '+i}));
 db.kyluong=[C.buildSnapshot(db,'2023-01',{bangluong:[{'Mã NV':'SYN01','Họ và tên':'Synthetic Person','Thực lĩnh':1000000}],bhxh:[],tncn:[],canhbao:[]},db.nhanvien,{user:'tester'})];
 const expected=JSON.stringify(db.kyluong);fs.writeFileSync(file,JSON.stringify(db));const before=fs.statSync(file).size;
 w=await launch();await w.click('#nav button[data-k=backup]');await w.waitForSelector('[data-year-archive] select');
 await w.selectOption('[aria-label="Năm cần lưu trữ"]','2023');
 await w.locator('[data-year-archive] button:has-text("Kiểm tra trước khi chuyển")').click();
 await w.waitForTimeout(1500);await login(w);await w.click('#nav button[data-k=backup]');
 await w.waitForSelector('[data-year-archive] button:has-text("Mở hồ sơ năm")');
 let live=JSON.parse(fs.readFileSync(file,'utf8'));
 const afterArchiveBytes=fs.statSync(file).size;
 check('archive removes historical transactions from active data, retains current period',live.psluong.length===0&&live.chamcong.length===1&&live.chamcong[0]['Kỳ']==='2026-01');
 check('active file becomes smaller and schema protects against older apps',fs.statSync(file).size<before/2&&live.schemaVersion===3);
 check('year registry points to an immutable package',live._yearArchives.length===1&&fs.existsSync(path.join(dir,'year-archives',live._yearArchives[0].file)));
 await w.locator('[data-year-archive] button:has-text("Mở hồ sơ năm")').click();await w.waitForSelector('[data-year-view] tbody tr');
 check('archived year viewer has no editable data inputs',await w.locator('[data-year-view] input, [data-year-view] textarea, [data-year-view] [contenteditable=true]').count()===0);
 await w.selectOption('[aria-label="Loại hồ sơ năm"]','bangluong');await w.waitForFunction(()=>document.querySelector('[data-year-view] tbody')?.textContent.includes('1000000'));
 check('closed payroll is available on demand without restoring active data',(await w.locator('[data-year-view]').innerText()).includes('1000000')&&JSON.parse(fs.readFileSync(file,'utf8')).kyluong.length===0);
 await w.locator('[data-year-view] button:has-text("Xuất Excel hồ sơ")').click();
 let excel=false;for(let i=0;i<50&&!excel;i++){await w.waitForTimeout(100);excel=fs.existsSync(downloads)&&fs.readdirSync(downloads).some(n=>/^HoSoNam_2023_bangluong.*\.xlsx$/.test(n));}
 check('archived payroll exports to Excel',excel);
 const xlsxName=fs.readdirSync(downloads).find(n=>/^HoSoNam_2023_bangluong.*\.xlsx$/.test(n)),XLSX=require('../../xlsx.full.min.js'),book=XLSX.read(fs.readFileSync(path.join(downloads,xlsxName)),{type:'buffer'});
 check('Excel contains the immutable archived payroll value',XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]])[0]['Thực lĩnh']===1000000);
 await w.locator('[data-year-view] button:has-text("In trang đang xem")').click();let pdf=false;
 for(let i=0;i<100&&!pdf;i++){await w.waitForTimeout(100);pdf=fs.readdirSync(downloads).some(n=>/^HoSoNam_2023_bangluong.*\.pdf$/.test(n));}
 check('archived payroll prints to PDF',pdf);
 await w.selectOption('[aria-label="Loại hồ sơ năm"]','psluong');await w.waitForFunction(()=>document.querySelectorAll('[data-year-view] tbody tr').length===50);
 check('large historical table renders only 50 rows per page',await w.locator('[data-year-view] tbody tr').count()===50);
 await w.locator('[data-year-view] button:has-text("Sau")').click();await w.waitForFunction(()=>document.querySelector('[data-year-view] tbody')?.textContent.includes('Synthetic historical record 50'));
 check('next page loads requested archived rows',await w.locator('[data-year-view] tbody tr').count()===50);
 const stale={...live,chamcong:db.chamcong};const blocked=await w.evaluate(text=>window.hakStore.save(text),JSON.stringify(stale));check('main blocks attempts to reintroduce archived rows through ordinary save',blocked!==true);
 if(process.env.E2E_SHOTS){fs.mkdirSync(process.env.E2E_SHOTS,{recursive:true});await w.locator('[data-year-view]').scrollIntoViewIfNeeded();await w.screenshot({path:path.join(process.env.E2E_SHOTS,'year-archive-readonly.png')});}
 await w.locator('[data-year-archive] button:has-text("Đưa về vùng đang làm")').click();await w.locator('.dlg textarea, .dlg input').fill('Review archived year');await w.locator('.dlg footer button.pri').click();await w.waitForTimeout(1500);await login(w);
 live=JSON.parse(fs.readFileSync(file,'utf8'));
 if(live._yearArchives[0].active)console.log('Restore diagnostics: '+JSON.stringify(dialogs.slice(-4)));
 check('controlled restore returns historical rows and original locked payroll snapshot',live.psluong.length===1000&&JSON.stringify(live.kyluong)===expected&&live._yearArchives[0].active===false);
 const authDenied=await w.evaluate(async()=>{window.hakStore.logout();return window.hakYears.archive(2023,'invalid');});check('main requires authenticated admin for archival',authDenied&&authDenied.ok===false);
 fs.writeFileSync(path.join(__dirname,'year-archive-result.json'),JSON.stringify({tests:results,beforeBytes:before,afterArchiveBytes,archivedYear:2023,note:'Synthetic only; no real records were archived'},null,2));
 await app.close();app=null;console.log('Year archive E2E: '+results.length+'/'+results.length+' passed');
})().catch(async e=>{console.error(e.stack||e);if(app)await app.close().catch(()=>{});process.exitCode=1;});
