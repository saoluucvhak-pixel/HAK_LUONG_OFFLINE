'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createStorage}=require('../../main/storage'),Y=require('../../main/year-archive'),C=require('../../core/payroll-close'),FB=require('../../main/fullbackup');
function setup(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hak-year-test-')),storage=createStorage(dir),db={schemaVersion:2,nhanvien:[{'Mã NV':'SYN01','Họ và tên':'Synthetic Person'}],dm_luong:[{name:'retained'}],chamcong:[{_id:'old','Mã NV':'SYN01','Kỳ':'2023-01','1':1},{_id:'new','Mã NV':'SYN01','Kỳ':'2026-01','1':1}],kyluong:[],kyluong_lichsu:[]};
 const kq={bangluong:[{'Mã NV':'SYN01','Thực lĩnh':123}],bhxh:[],tncn:[],canhbao:[]};
 db.kyluong.push(C.buildSnapshot(db,'2023-01',kq,db.nhanvien,{user:'tester'}));
 assert.equal(storage.save(JSON.stringify(db)),true);
 return {dir,storage,db,years:Y.createYearArchive({storage,dir,now:()=>new Date('2026-10-19T00:00:00Z')})};
}
const current=s=>JSON.parse(s.storage.load().text);
const move=s=>s.years.archive(2023,s.years.preview(2023).token,'tester');
test('year archive: verified package reduces active data; masters and current year unchanged, snapshots immutable',()=>{
 const s=setup(),before=s.storage.load().text,p=s.years.preview(2023);assert.equal(s.storage.load().text,before);
 assert.equal(p.counts.chamcong,1);const r=move(s),after=current(s);assert.equal(r.ok,true);assert.ok(r.afterBytes<r.beforeBytes);
 assert.deepEqual(after.nhanvien,s.db.nhanvien);assert.deepEqual(after.dm_luong,s.db.dm_luong);assert.deepEqual(after.chamcong,[s.db.chamcong[1]]);assert.equal(after.kyluong.length,0);
 const archived=s.years.read(after._yearArchives[0]);assert.deepEqual(archived.data.kyluong,s.db.kyluong);assert.equal(s.years.table(2023,'bangluong','2023-01').rows[0]['Thực lĩnh'],123);
 assert.equal(s.storage.verifyBackup(r.backupName).status,'ok');
});
test('year archive: current/future years, missing close, modified snapshot and malformed period are blocked',()=>{
 for(const kind of ['open','modified','invalid']){const s=setup(),db=current(s);if(kind==='open')db.kyluong=[];if(kind==='modified')db.kyluong[0].kq.bangluong[0]['Thực lĩnh']=99;if(kind==='invalid')db.chamcong[0]['Kỳ']='nonsense';s.storage.save(JSON.stringify(db));assert.throws(()=>s.years.preview(2023));}
 const s=setup();assert.throws(()=>s.years.preview(2026));assert.throws(()=>s.years.preview('../2023'));
});
test('year archive: stale preview and failed backup leave active records untouched',()=>{
 const s=setup(),p=s.years.preview(2023);s.storage.save(JSON.stringify({...current(s),auditlog:[{text:'changed'}]}));const text=s.storage.load().text;
 assert.throws(()=>s.years.archive(2023,p.token,'tester'),/đã đổi/);assert.equal(s.storage.load().text,text);
 s.storage.backup=()=>null;assert.throws(()=>move(s),/sao lưu/);assert.equal(s.storage.load().text,text);
});
test('year archive: failed active save retains original data plus recoverable package',()=>{
 const s=setup(),before=s.storage.load().text;s.storage.save=()=> 'disk failure';assert.throws(()=>move(s),/disk failure/);assert.equal(s.storage.load().text,before);
 assert.equal(fs.readdirSync(s.years.root).length,1);assert.doesNotThrow(()=>Y.decode(fs.readFileSync(path.join(s.years.root,fs.readdirSync(s.years.root)[0]))));
});
test('year archive: startup/list do not load year package; corruption is explicit on read',()=>{
 const s=setup();move(s);const ref=current(s)._yearArchives[0];fs.writeFileSync(path.join(s.years.root,ref.file),'corrupted');
 const fresh=Y.createYearArchive({storage:s.storage,dir:s.dir});assert.equal(fresh.list().years.length,1);assert.throws(()=>fresh.table(2023,'chamcong',''),/SHA256/);
});
test('year archive: stale renderer cannot reintroduce archived transactions or remove registry',()=>{
 const s=setup();move(s);const db=current(s);s.years.checkWrite(JSON.stringify(db));
 assert.throws(()=>s.years.checkWrite(JSON.stringify({...db,chamcong:s.db.chamcong})),/đã lưu trữ/);
 assert.throws(()=>s.years.checkWrite(JSON.stringify({...db,_yearArchives:[]})),/danh sách/);
 assert.throws(()=>s.years.checkWrite(JSON.stringify({...db,schemaVersion:2})),/hạ phiên bản/);
});
test('year archive: restore requires reason, token and no overlap, preserves locked snapshot and original package',()=>{
 const s=setup();move(s);assert.throws(()=>s.years.restore(2023,'',s.years.token()));assert.throws(()=>s.years.restore(2023,'review','stale'));
 const file=current(s)._yearArchives[0].file;const r=s.years.restore(2023,'correction review',s.years.token());
 assert.equal(r.ok,true);assert.deepEqual(current(s).kyluong,s.db.kyluong);assert.equal(current(s)._yearArchives[0].active,false);assert.ok(fs.existsSync(path.join(s.years.root,file)));
});
test('year archive: missing employee or conflicting active year blocks restore',()=>{
 for(const conflict of ['employee','year']){const s=setup();move(s);const db=current(s);if(conflict==='employee')db.nhanvien=[];else db.chamcong.push(s.db.chamcong[0]);s.storage.save(JSON.stringify(db));assert.throws(()=>s.years.restore(2023,'review',s.years.token()));}
});
test('year archive: Full Backup contains year packages and refuses missing/corrupt source even in partial mode',()=>{
 const s=setup();move(s);const o={dataText:s.storage.load().text,yearArchiveDir:s.years.root,destDir:path.join(s.dir,'export')};const r=FB.create(o);assert.equal(r.ok,true);const rep=FB.inspect(r.file);assert.equal(rep.ok,true);assert.equal(rep.manifest.version,2);assert.equal(rep.manifest.yearArchives.length,1);
 assert.equal(FB.create({...o,yearArchiveDir:undefined}).ok,false);fs.writeFileSync(path.join(s.years.root,current(s)._yearArchives[0].file),'broken');assert.equal(FB.create({...o,allowPartial:true}).ok,false);
});
test('year archive: Full Backup restores year files on another machine before active registry, then reopens locked year',()=>{
 const s=setup();move(s);const pkg=FB.create({dataText:s.storage.load().text,yearArchiveDir:s.years.root,destDir:path.join(s.dir,'export')});assert.equal(pkg.ok,true);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hak-year-target-')),storage=createStorage(dir),{createVault}=require('../../main/documents'),{createStore}=require('../../main/ocr-library'),{createRestorer}=require('../../main/restore');
 const vault=createVault(path.join(dir,'documents')),lib=createStore(path.join(dir,'ocr_library'));
 storage.save(JSON.stringify({schemaVersion:2,nhanvien:[],chamcong:[],kyluong:[]}));
 const rs=createRestorer({userData:dir,getVault:()=>vault,getOcrLib:()=>lib,readData:()=>storage.load(),maxSchema:3});
 const st=rs.stage(pkg.file);assert.equal(st.ok,true,st.error);assert.equal(rs.commitAssets(st.rid).ok,true);
 const years=Y.createYearArchive({storage,dir});assert.doesNotThrow(()=>years.checkWrite(st.text,true));assert.equal(storage.save(st.text),true);
 assert.equal(years.table(2023,'bangluong','2023-01').rows[0]['Thực lĩnh'],123);assert.equal(rs.finish(st.rid).ok,true);
 assert.equal(years.restore(2023,'audit',years.token()).ok,true);assert.deepEqual(JSON.parse(storage.load().text).kyluong,s.db.kyluong);
});
test('year archive: schema 3 protects archived data from older versions; ordinary schema 2 remains compatible',()=>{
 const s=setup();assert.equal(current(s).schemaVersion,2);move(s);assert.equal(current(s).schemaVersion,3);
});
