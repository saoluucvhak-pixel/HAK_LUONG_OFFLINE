"use strict";
// TÁI HIỆN (Linux, app chưa đóng gói, dữ liệu giả): ghi vào kho qua IPC "ngoài" trạng thái bộ nhớ của giao diện rồi đóng bình thường → bản ghi bị GIAO DIỆN ghi đè (nó giữ bản cũ và ghi cả tài liệu khi đóng).
// Chạy: xvfb-run -a node docs/v2.0.34/tai-hien-ghi-de-khi-dong.cjs
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const R=require("node:path").resolve(__dirname,"../../LuongHAK_Offline")+require("node:path").sep;
const { _electron } = require("playwright");
const { fixture } = require(R+"tests/fixtures/production-carry");
const { createStorage } = require(R+"main/storage.js");
const { DatabaseSync } = require("node:sqlite");
const PASS="InstalledSetup2026", WAIT=+process.argv[2]||0;
const account=(u,n,r)=>{const salt=crypto.randomBytes(16).toString("hex"),iter=210000;return{id:u.toUpperCase(),tenDangNhap:u,hoTen:n,vaiTro:r,khoa:false,salt,iter,hash:crypto.pbkdf2Sync(PASS,Buffer.from(salt,"hex"),iter,32,"sha256").toString("hex")};};
const seed=()=>{const d=fixture();d.auditlog=[];d.baomat=[];d.schemaVersion=2;d.sanluong=[];d.chamcong=[];d.nguoidung=[account("admin","Q","admin")];return d;};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const nv=(D)=>{const db=new DatabaseSync(path.join(D,"data.sqlite"),{readOnly:true});try{return db.prepare("SELECT json FROM records WHERE tbl='nhanvien'").all().map(r=>JSON.parse(r.json)["Mã NV"]);}finally{db.close();}};
(async()=>{
  const D=fs.mkdtempSync(path.join(os.tmpdir(),"repro-"));fs.mkdirSync(path.join(D,"downloads"));createStorage(D).save(JSON.stringify(seed()));
  const app=await _electron.launch({executablePath:require(R+"node_modules/electron"),args:["--no-sandbox",R],env:{...process.env,HAK_USER_DATA:D,HAK_DOWNLOAD_DIR:path.join(D,"downloads"),HAK_NO_SHELL:"1",HAK_SQLITE_EXPORT_SYNC:"0",HAK_SQLITE_ADOPT_EXTERNAL:"0",HAK_STORAGE:""}});
  const w=await app.firstWindow();w.on("dialog",x=>x.accept());await w.waitForSelector("#main > *");
  await w.waitForSelector("#main input[data-f=u]");await w.fill("#main input[data-f=u]","admin");await w.fill("#main input[data-f=p]",PASS);await w.click("#main button.big");await w.waitForSelector("#nav button[data-k=home]");
  if(WAIT)await sleep(WAIT);
  const sv=await w.evaluate(()=>{const r=window.hakStore.load();const d=JSON.parse(r.text);d.nhanvien.push({"Mã NV":"0099","Họ và tên":"X","Trạng thái":"Đang làm việc"});return window.hakStore.save(JSON.stringify(d));});
  console.log("save",sv,"ngay sau lưu có 0099:",nv(D).includes("0099"));
  await sleep(1500); console.log("sau 1,5s còn 0099:",nv(D).includes("0099"));
  await app.close(); await sleep(1500);
  console.log("WAIT="+WAIT+"ms; sau đóng còn 0099:",nv(D).includes("0099"));
})().catch(e=>{console.error(e);process.exit(2);});
