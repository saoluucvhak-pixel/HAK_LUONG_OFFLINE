"use strict";
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const {_electron}=require("playwright"),APP=path.resolve(__dirname,"../.."),results=[];
const password="RestoreTest2026",username="oldadmin";
function account(){const salt=crypto.randomBytes(16).toString("hex"),iter=210000;return {id:"RESTORE_ADMIN",tenDangNhap:username,hoTen:"Synthetic old admin",vaiTro:"admin",khoa:false,salt,iter,hash:crypto.pbkdf2Sync(password,Buffer.from(salt,"hex"),iter,32,"sha256").toString("hex")};}
async function run(withAccounts,journal){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hak-first-restore-")),file=path.join(dir,"synthetic-input.json");
  const incoming={schemaVersion:2,nhanvien:[{"Mã NV":"RESTORED_TEST","Họ và tên":"Synthetic restored person","Trạng thái":"Đang làm việc"}],chamcong:[]};
  if(withAccounts){incoming.nguoidung=[account()];incoming.congty=[{"Tên công ty":"Synthetic restored company","Mã công ty":"RESTORE"}];incoming.baomat=[];}
  if(journal!==undefined)incoming.auditlog=journal;
  fs.writeFileSync(file,JSON.stringify(incoming));
  let app;
  try{
    app=await _electron.launch({executablePath:require("electron"),args:["--no-sandbox",APP],env:{...process.env,HAK_USER_DATA:dir,HAK_DOWNLOAD_DIR:path.join(dir,"downloads"),HAK_NO_SHELL:"1"}});
    const page=await app.firstWindow();page.on("dialog",d=>d.accept());await page.waitForSelector("#main > *");
    await page.getByRole("button",{name:"2. Khôi phục từ dữ liệu cũ",exact:true}).click();
    const chooser=page.waitForEvent("filechooser");await page.getByRole("button",{name:/Chọn file dữ liệu cũ/}).click();await(await chooser).setFiles(file);
    if(withAccounts){
      await page.getByRole("button",{name:"Đăng nhập",exact:true}).waitFor();
      await page.fill("#main input[data-f=u]",username);await page.fill("#main input[data-f=p]",password);await page.getByRole("button",{name:"Đăng nhập",exact:true}).click();
    }else{
      await page.getByRole("button",{name:"Tạo dữ liệu và tài khoản Admin",exact:true}).waitFor();
      for(const[k,v]of[["cty","Synthetic new company"],["ma","NEWTEST"],["u","newadmin"],["n","Synthetic new admin"],["p",password],["p2",password]])await page.fill("#main input[data-f="+k+"]",v);
      await page.getByRole("button",{name:"Tạo dữ liệu và tài khoản Admin",exact:true}).click();await page.waitForSelector("[data-recovery]");await page.click(".dlg footer button.pri");
    }
    await page.waitForSelector("#nav button[data-k=home]");
    const disk=JSON.parse(fs.readFileSync(path.join(dir,"data.json"),"utf8"));
    assert.ok(disk.nhanvien.some(r=>r["Mã NV"]==="RESTORED_TEST"),"restored staff persists after login/setup");
    assert.ok(disk.nguoidung.some(r=>r.tenDangNhap===(withAccounts?username:"newadmin")));
    if(journal&&journal.length)assert.ok(disk.auditlog.some(r=>r.thaoTac==="Synthetic old history"),"old journal retained without matching local journal");
    const row={withAccounts,journal:journal===undefined?"absent":journal.length,pass:true};results.push(row);console.log("PASS new machine restore "+JSON.stringify(row));
  }finally{if(app)await app.close();}
}
(async()=>{await run(true,[{luc:"2020-01-01",nguoi:"old-user",thaoTac:"Synthetic old history"}]);await run(false,undefined);await run(true,[]);console.log("First-run restore E2E: "+results.length+"/3 passed");})().catch(e=>{console.error(e);process.exitCode=1;});
