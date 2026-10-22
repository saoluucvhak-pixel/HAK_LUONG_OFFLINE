"use strict";
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {_electron}=require('playwright'),APP=path.resolve(__dirname,'../..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'hak-form-review-'));
let app;const checks=[];function check(name,v){assert.ok(v,name);checks.push({name,pass:true});console.log('PASS '+name);}
(async()=>{
 app=await _electron.launch({executablePath:require('electron'),args:['--no-sandbox',APP],env:{...process.env,HAK_USER_DATA:dir,HAK_DOWNLOAD_DIR:path.join(dir,'downloads'),HAK_NO_SHELL:'1'}});
 const page=await app.firstWindow();page.on('dialog',d=>d.accept());await page.waitForSelector('#main > *');
 for(const[k,v]of[['cty','Synthetic form review'],['ma','FORMTEST'],['u','admin'],['n','Form Tester'],['p','FormTest2026'],['p2','FormTest2026']])await page.fill('#main input[data-f='+k+']',v);
 await page.click('#main button.big');await page.waitForSelector('[data-recovery]');await page.click('.dlg footer button.pri');await page.click('#nav button[data-k=ocr]');
 // UI fixture: the parser is real, recognition is mocked; real-photo accuracy is measured privately.
 await page.evaluate(()=>{window.HAKCore.tsocr.analyze=()=>Promise.resolve({rot:0,scale:1,g:new Uint8Array(10000).fill(255),w:100,h:100,cells:[],table:{layout:null,lines:[],days:[],warnings:[]},title:[],period:'',documentReview:window.HAKCore.tsparse.documentReview('GIẤY XÁC NHẬN VÂN TAY\nTôi tên là: Synthetic Person\n7h00 ngày 6/7/2026')});});
 const file=path.join(dir,'synthetic.png');fs.writeFileSync(file,require('../../main/ocr-service').encodeGrayPNG(new Uint8Array(10000).fill(255),100,100));
 const chooser=page.waitForEvent('filechooser');await page.locator('#main button:has-text("Chọn ảnh / PDF")').click();await(await chooser).setFiles(file);
 const panel=page.locator('[data-document-review]');await panel.waitFor();
 check('form type is displayed',/Giấy xác nhận vân tay/.test(await panel.innerText()));
 const box=panel.locator('input[type=checkbox]').first();check('candidates default to pending',!(await box.isChecked()));await box.check();
 await panel.locator('input.i').first().fill('Corrected synthetic value');check('editing revokes earlier confirmation',!(await box.isChecked()));
 await panel.locator('button:has-text("Thêm giờ")').click();check('missing fields can be added as unconfirmed drafts',await panel.locator('input.i').count()===4&&!await panel.locator('input[type=checkbox]').last().isChecked());
 check('form review has no attendance import action',!await panel.locator('button:has-text("Đưa vào")').count());
 await panel.locator('button:has-text("Xuất phiếu đối chiếu JSON")').click();await page.waitForTimeout(300);
 const find=p=>fs.existsSync(p)?fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?find(path.join(p,e.name)):[path.join(p,e.name)]):[];
 const exported=find(path.join(dir,'downloads')).find(f=>/HAK_OCR_DoiChieu_.*\.json$/.test(f));assert.ok(exported);const draft=JSON.parse(fs.readFileSync(exported,'utf8'));
 check('export remains review only after edits',draft.status==='REVIEW_ONLY'&&draft.canAutoImport===false&&draft.fields[0].confirmed===false);
 const db=JSON.parse(fs.readFileSync(path.join(dir,'data.json'),'utf8'));check('no attendance is imported',(db.chamcong||[]).length===0);
 const shots=path.join(__dirname,'screenshots');fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:path.join(shots,'document-review-synthetic.png')});
 fs.writeFileSync(path.join(__dirname,'document-review-result.json'),JSON.stringify({fixture:'Synthetic UI fixture; recognition mocked, parser real',checks},null,2));await app.close();app=null;
})().catch(async e=>{console.error(e);if(app)await app.close().catch(()=>{});process.exitCode=1;});
