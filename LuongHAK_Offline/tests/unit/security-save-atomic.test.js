'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../../app.js'),'utf8');
function env(ok){const events=[];const c={db:{nguoidung:[{id:'admin',tenDangNhap:'admin',hash:'old',vaiTro:'admin'}],baomat:[{khoiPhuc:{hash:'old-code'}}],auditlog:[]},dirty:false,dbRev:0,st:{},lastTxnError:'',lastSaveError:'DISK_FAILURE',saveTimer:null,clearTimeout:()=>{},setTimeout:()=>{events.push('retry');return 1;},PERM:{findUser:(d,n)=>d.nguoidung.find(x=>x.tenDangNhap===n)},toast:m=>events.push(m),alert:m=>events.push(m),close:()=>events.push('close'),render:()=>{},saveNow:()=>ok,audit:()=>c.db.auditlog.push({action:'test'}),HRM:{uid:()=> 'new'},GRD:{changedFields:()=>[]}};c.session=c.db.nguoidung[0];vm.createContext(c);vm.runInContext(src.slice(src.indexOf('  function txn('),src.indexOf('  function save()')),c);return{c,events};}
test('Failed password transaction restores session object and previous dirty changes',()=>{const {c,events}=env(false);c.dirty=true;c.db.psluong=[{note:'unsaved'}];vm.runInContext('txn(["nguoidung"], function(){ session.hash="new"; audit(); })',c);assert.equal(c.session,c.db.nguoidung[0]);assert.equal(c.session.hash,'old');assert.equal(c.dirty,true);assert.equal(c.db.psluong[0].note,'unsaved');assert.equal(c.db.auditlog.length,0);assert.ok(events.includes('retry'));});
test('Failed recovery transaction preserves accounts, old code and logged-out state',()=>{const {c}=env(false);c.session=null;const before=JSON.stringify(c.db);vm.runInContext('txn(["nguoidung","baomat"],function(){db.nguoidung[0].hash="new";db.baomat=[{khoiPhuc:{hash:"new-code"}}];audit();})',c);assert.equal(JSON.stringify(c.db),before);assert.equal(c.session,null);});

for(const ok of [false,true])test('Password UI keeps form and old password on failed write '+ok,()=>{const {c,events}=env(ok);c.k={hash:'new'};const start=src.indexOf('if (!txn(["nguoidung"], function () { Object.assign(session, k');const end=src.indexOf(' });',src.indexOf('toast("Đã đổi mật khẩu")',start));vm.runInContext('(function(){'+src.slice(start,end)+'})()',c);assert.equal(c.session.hash,ok?'new':'old');assert.equal(events.includes('close'),ok);assert.equal(events.includes('Đã đổi mật khẩu'),ok);});

for(const ok of [false,true])test('Delete-all rolls back memory on failed write '+ok,()=>{const {c,events}=env(ok);c.db.nhanvien=[{id:'preserve'}];const before=JSON.stringify(c.db);c.ensureTables=()=>{};const start=src.indexOf('var beforeDelete = db, wasDirty = dirty;');const end=src.indexOf('st.kq = null; render();',start)+'st.kq = null; render();'.length;vm.runInContext('(function(){'+src.slice(start,end)+'})()',c);if(!ok){assert.equal(JSON.stringify(c.db),before);assert.match(events.join(' '),/DISK_FAILURE/);}else assert.equal(c.db.nhanvien,undefined);});

for (const ok of [false, true]) test('Access mode transition updates the UI only after a durable save ' + ok, () => {
  const { c, events } = env(true);
  c.baseSig = 'sqlite:5';
  c.window = { location: { reload: () => events.push('reload') } };
  c.store = { configureAccess: (request, sig) => {
    assert.equal(request.mode, 'direct');
    assert.equal(sig, 'sqlite:5');
    return { ok, error: 'DISK_FAILURE' };
  } };
  const start = src.indexOf('  function submitAccess('), end = src.indexOf('  function accountFields(', start);
  vm.runInContext(src.slice(start, end), c);
  const before = JSON.stringify(c.db);
  if (ok) c.submitAccess({ mode: 'direct' });
  else assert.throws(() => c.submitAccess({ mode: 'direct' }), /DISK_FAILURE/);
  assert.equal(events.includes('reload'), ok);
  assert.equal(JSON.stringify(c.db), before);
});
