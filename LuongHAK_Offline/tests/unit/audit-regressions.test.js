'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../../engine'),I=require('../../core/importer'),G=require('../../main/payroll-gate'),CLS=require('../../core/payroll-close');
const {baseDb,staff,ccRow}=require('../fixtures/build');
test('Percent insurance equals fractional insurance',()=>{
 function run(p){const d=baseDb();d.nhansu=[staff({'Lương cơ bản':5000000,'Lương thỏa thuận':10000000,'Mã BHXH':'TEST'})];d.dm_baohiem=[{'Mã bảo hiểm':'TEST','NLD.BHXH':p?'8%':0.08,'NLD.BHYT':p?'1,5%':0.015,'DN.BHXH':p?'17,5%':0.175,'NLD.KPCD':p?'1%':0.01}];d.chamcong=[ccRow('NV',2026,10)];return E.tinhBangLuong(d,2026,10,false);}
 const a=run(true),b=run(false);assert.deepEqual(a.bhxh,b.bhxh);assert.deepEqual(a.bangluong,b.bangluong);assert.equal(a.bhxh[0]['NLĐ.BHXH'],400000);
});
test('Tax bracket imports separate parent tax codes',()=>{
 const a={'Mã thuế TNCN':'A','Bậc':'1','Hiệu lực từ':'2026-01-01','Thuế suất':'0.05'},b={...a,'Mã thuế TNCN':'B','Thuế suất':'0.1'};
 assert.equal(I.plan({dm_bacthue:[a]},'dm_bacthue',Object.keys(a),[b]).items[0].action,'add');
 assert.equal(I.plan({dm_bacthue:[a,b]},'dm_bacthue',Object.keys(a),[{...b,'Thuế suất':'0.2'}]).items[0].target,b);
 assert.equal(I.plan({dm_bacthue:[]},'dm_bacthue',Object.keys(a),[a,b]).summary.add,2);
});
test('Snapshot rejects altered detail with recomputed checksum',()=>{
 const d=require('../fixtures/production-carry').fixture(),r=G.computeKy(d,'2026-10',{quyChe:'2026',bu:'daihiep'}).kq;
 const base=CLS.buildSnapshot(d,'2026-10',r,[],{buTheoNgay:'daihiep',quyChe:'2026'});assert.deepEqual(G.verifySnapshot(d,base),[]);
 for(const table of ['bangluong','bhxh','tncn']){const s=JSON.parse(JSON.stringify(base));if(!s.kq[table].length)s.kq[table].push({'Mã NV':'C'});s.kq[table][0]['Lương thời gian']=99999999;s.checksum=CLS.checksum(s.kq);assert.ok(G.verifySnapshot(d,s).some(x=>x.includes('chi tiết '+table)));}
});
test('Close mismatch cannot change method or recalculate',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../../app.js'),'utf8'),start=s.indexOf('if (String(buChinhThuc) !== String(st.bu))'),end=s.indexOf('\n      }',start),block=s.slice(start,end);
 assert.ok(start>0);assert.match(block,/return;/);assert.doesNotMatch(block,/st\.bu\s*=|tinhLuong\(|saveUi\(/);
});

