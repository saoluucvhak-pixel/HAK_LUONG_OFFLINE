'use strict';
// Immutable year packages; data.json holds only their small registry. Never read packages at startup.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const V = require('../core/validate'), C = require('../core/payroll-close');
const MONTHLY = ['chamcong','sanluong','bandam','psluong','ungluong','tiencom','sl_chuyenky'];
const TABLES = [...MONTHLY,'kyluong','kyluong_lichsu'];
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const yearOf = (table,row) => String(MONTHLY.includes(table) ? V.rowPeriod(table,row) || '' : row.ky || '').slice(0,4);
const validFile = name => /^year-\d{4}-[a-f0-9]{32}\.json$/.test(name);
function decode(bytes) {
  const envelope = JSON.parse(bytes.toString('utf8')), p = envelope.payload;
  if (!p || p.format !== 'HAK-YEAR-ARCHIVE' || p.version !== 1 || sha(JSON.stringify(p)) !== envelope.sha256) throw Error('Hồ sơ năm hỏng hoặc sai mã kiểm tra');
  if (!/^\d{4}$/.test(String(p.year)) || !p.data || !p.context) throw Error('Cấu trúc hồ sơ năm không hợp lệ');
  if(p.data.sl_chuyenky===undefined)p.data.sl_chuyenky=[]; // archives before alpha.45
  for (const t of TABLES) if (!Array.isArray(p.data[t]) || p.data[t].some(r=>yearOf(t,r)!==String(p.year))) throw Error('Hồ sơ có dữ liệu ngoài năm');
  for (const s of p.data.kyluong) if(C.verify(s)!=='ok') throw Error('Bản chốt trong hồ sơ bị hỏng');
  return p;
}
function createYearArchive({ storage, dir, now = ()=>new Date() }) {
  const root = path.join(dir,'year-archives'); let cache = null;
  const current = () => { const r=storage.load();if(!r.ok||!r.text)throw Error('Không đọc được dữ liệu đang làm');return {text:r.text,db:JSON.parse(r.text)}; };
  const refs = db => { if(db._yearArchives!==undefined && !Array.isArray(db._yearArchives))throw Error('Danh sách hồ sơ năm không hợp lệ');return db._yearArchives||[]; };
  function read(ref) {
    if(!ref || !validFile(ref.file))throw Error('Tên hồ sơ năm không hợp lệ');
    const file=path.join(root,ref.file); if(fs.lstatSync(file).isSymbolicLink())throw Error('Hồ sơ không được là liên kết');
    const stat=fs.statSync(file), signature=stat.mtimeMs+':'+stat.size;
    if(cache && cache.file===file && cache.signature===signature) return cache.payload;
    const bytes=fs.readFileSync(file);if(sha(bytes)!==ref.sha256)throw Error('Hồ sơ năm sai SHA256');
    const payload=decode(bytes);if(payload.year!==ref.year)throw Error('Hồ sơ không đúng năm');
    cache={file,signature,payload};return payload;
  }
  function plan(year) {
    year=Number(year);if(!Number.isInteger(year)||year<1900||year>=now().getFullYear())throw Error('Chỉ lưu trữ năm cũ, trước năm hiện tại');
    const {db,text}=current(); if(refs(db).some(r=>r.year===year && r.active))throw Error('Năm này đã nằm trong kho hồ sơ');
    const data={}, counts={}, periods=new Set();
    for(const t of TABLES){
      if(db[t]!==undefined&&!Array.isArray(db[t]))throw Error('Bảng '+t+' sai cấu trúc');
      data[t]=(db[t]||[]).filter(r=>yearOf(t,r)===String(year));counts[t]=data[t].length;
      if(MONTHLY.includes(t))for(const r of db[t]||[])if(!V.rowPeriod(t,r))throw Error('Có dòng không xác định được kỳ tại '+t+'; cần sửa trước khi chuyển');
      for(const r of data[t]) periods.add(MONTHLY.includes(t)?V.rowPeriod(t,r):r.ky);
    }
    if(!Object.values(counts).some(Boolean))throw Error('Năm này không có dữ liệu để chuyển');
    for(const ky of periods){const snaps=data.kyluong.filter(s=>s.ky===ky);if(snaps.length!==1||C.verify(snaps[0])!=='ok')throw Error('Kỳ '+ky+' chưa chốt hoặc bản chốt không nguyên vẹn');}
    const context={};for(const k of Object.keys(db))if(!TABLES.includes(k)&&!['_yearArchives','nguoidung','baomat','auditlog'].includes(k))context[k]=db[k];
    const payload={format:'HAK-YEAR-ARCHIVE',version:1,year,createdAt:now().toISOString(),data,context};
    const next={...db};for(const t of TABLES)next[t]=(db[t]||[]).filter(r=>yearOf(t,r)!==String(year));
    return {year,token:sha(text),counts,periods:[...periods].sort(),payload,next,beforeBytes:Buffer.byteLength(text)};
  }
  function preview(year){const p=plan(year);return {ok:true,year:p.year,token:p.token,counts:p.counts,periods:p.periods,beforeBytes:p.beforeBytes,afterBytes:Buffer.byteLength(JSON.stringify(p.next))};}
  function saveChecked(next) {const text=JSON.stringify(next),r=storage.save(text);if(r!==true)throw Error(String(r));const check=current();if(sha(check.text)!==sha(text))throw Error('Dữ liệu sau chuyển không khớp');}
  function backup(tag){const name=storage.backup(tag);if(!name||storage.verifyBackup(name).status!=='ok')throw Error('Không tạo/kiểm tra được bản sao lưu trước chuyển');return name;}
  function archive(year,token,user) {
    const p=plan(year);if(p.token!==token)throw Error('Dữ liệu đã đổi; hãy xem lại bảng kiểm trước khi chuyển');
    const backupName=backup('truoc-luu-tru-nam');fs.mkdirSync(root,{recursive:true});if(fs.lstatSync(root).isSymbolicLink())throw Error('Kho hồ sơ không được là liên kết');
    p.payload.createdBy=String(user||'');const text=JSON.stringify({payload:p.payload,sha256:sha(JSON.stringify(p.payload))});
    const file='year-'+p.year+'-'+crypto.randomBytes(16).toString('hex')+'.json', target=path.join(root,file);
    let fd;try{fd=fs.openSync(target,'wx');fs.writeFileSync(fd,text);fs.fsyncSync(fd);}finally{if(fd!==undefined)fs.closeSync(fd);}
    let directoryFd;try{directoryFd=fs.openSync(root,'r');fs.fsyncSync(directoryFd);}catch(e){/* Directory fsync is unavailable on Windows. */}finally{if(directoryFd!==undefined)fs.closeSync(directoryFd);}
    decode(fs.readFileSync(target));const ref={year:p.year,file,sha256:sha(text),active:true,createdAt:p.payload.createdAt,createdBy:String(user||''),counts:p.counts,backupName};
    read(ref);p.next._yearArchives=[...refs(p.next),ref];p.next.schemaVersion=3;
    p.next.auditlog=[...(p.next.auditlog||[]),{luc:now().toISOString(),nguoi:String(user||''),thaoTac:'Lưu trữ hồ sơ năm',chiTiet:String(p.year)}];
    saveChecked(p.next);cache=null;
    return {ok:true,year:p.year,counts:p.counts,backupName,beforeBytes:p.beforeBytes,afterBytes:Buffer.byteLength(JSON.stringify(p.next))};
  }
  function list(){const {db,text}=current();const candidates=new Set();for(const t of TABLES)for(const row of db[t]||[]){const y=Number(yearOf(t,row));if(y>=1900&&y<now().getFullYear())candidates.add(y);}return {ok:true,activeBytes:Buffer.byteLength(text),years:refs(db).filter(r=>r.active).map(r=>({year:r.year,counts:r.counts,createdAt:r.createdAt})),candidates:[...candidates].sort()};}
  function table(year,kind,period,page=0,all=false){
    const ref=refs(current().db).find(r=>r.active&&r.year===Number(year));const p=read(ref);
    if(![...TABLES,'bangluong'].includes(kind))throw Error('Loại hồ sơ không hợp lệ');
    let rows=kind==='bangluong'?((p.data.kyluong.find(s=>s.ky===period)||{}).kq||{}).bangluong||[]:p.data[kind];
    if(kind!=='bangluong'&&period)rows=rows.filter(r=>String(MONTHLY.includes(kind)?V.rowPeriod(kind,r):r.ky)===period);
    const total=rows.length;page=Number.isInteger(page)&&page>=0?page:0;
    // Closed snapshots are summarized here; detailed payroll is available via bangluong.
    if(['kyluong','kyluong_lichsu'].includes(kind)) rows=rows.map(s=>({ky:s.ky,version:s.version,ngayChot:s.ngayChot,nguoiChot:s.nguoiChot,...s.totals}));
    return {ok:true,year:p.year,periods:p.data.kyluong.map(s=>s.ky),total,page,rows:all?rows:rows.slice(page*50,page*50+50)};
  }
  function restore(year,reason,token,user) {
    if(!String(reason||'').trim())throw Error('Phải ghi lý do đưa hồ sơ về vùng đang làm');
    const {db,text}=current();if(sha(text)!==token)throw Error('Dữ liệu đã đổi, hãy tải lại danh sách');
    const ref=refs(db).find(r=>r.active&&r.year===Number(year)),p=read(ref);
    for(const t of TABLES)if((db[t]||[]).some(r=>yearOf(t,r)===String(year)))throw Error('Vùng đang làm đã có dữ liệu năm này; không ghi đè');
    const employees=new Set((db.nhanvien||[]).map(r=>r['Mã NV']));
    for(const t of MONTHLY)for(const r of p.data[t])if(r['Mã NV']&&!employees.has(r['Mã NV']))throw Error('Hồ sơ nhân viên của năm cũ không còn trong danh mục; cần đối chiếu trước khi đưa về');
    const next={...db};for(const t of TABLES){const ids=new Set((db[t]||[]).map(r=>r._id).filter(Boolean));if(p.data[t].some(r=>r._id&&ids.has(r._id)))throw Error('Trùng mã bản ghi; không tự ghép');next[t]=[...(db[t]||[]),...p.data[t]];}
    const backupName=backup('truoc-mo-ho-so-nam');next._yearArchives=refs(db).map(r=>r===ref?{...r,active:false,restoredAt:now().toISOString(),restoredBy:String(user||''),restoreReason:String(reason).trim()}:r);
    next.auditlog=[...(db.auditlog||[]),{luc:now().toISOString(),nguoi:String(user||''),thaoTac:'Đưa hồ sơ năm về vùng đang làm',chiTiet:year+': '+String(reason).trim()}];
    saveChecked(next);cache=null;return {ok:true,backupName};
  }
  function checkWrite(text,restoring=false){const next=JSON.parse(text),prev=current().db;
    if(refs(next).length&&!(next.schemaVersion>=3))throw Error('Dữ liệu có kho năm không được hạ phiên bản cấu trúc');
    if(!restoring && JSON.stringify(next._yearArchives||[])!==JSON.stringify(prev._yearArchives||[]))throw Error('Không được sửa danh sách kho năm qua thao tác lưu thường');
    for(const ref of refs(next).filter(r=>r.active)){
      if(restoring)read(ref);
      for(const t of TABLES)if((next[t]||[]).some(r=>yearOf(t,r)===String(ref.year)))throw Error('Năm '+ref.year+' đã lưu trữ; đưa hồ sơ về vùng đang làm trước khi nhập/sửa');
    }
  }
  return {root,preview,archive,list,table,restore,checkWrite,token:()=>sha(current().text),read,release:()=>{cache=null;return {ok:true};}};
}
module.exports={createYearArchive,decode,validFile,TABLES};
