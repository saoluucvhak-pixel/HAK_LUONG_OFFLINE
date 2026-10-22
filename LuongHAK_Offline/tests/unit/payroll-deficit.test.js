"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const E=require('../../engine'),CLS=require('../../core/payroll-close'),F=require('../fixtures/build');
function fixture(){const db=F.baseDb();db.nhansu=[F.staff({'Lương thỏa thuận':800000})];db.ungluong=[{'Mã NV':'NV','Ngày hạch toán':'2026-09-10','Tạm ứng':5000000}];return db;}
test('800k income and 5m advance preserve 4.2m deficit in immutable payroll snapshot without altering net pay',()=>{
 const db=fixture(),kq=E.tinhBangLuong(db,2026,9,false),row=kq.bangluong[0];
 assert.equal(row['Tổng thu nhập'],800000);assert.equal(row['Tạm ứng'],5000000);assert.equal(row['Thực lĩnh'],0);assert.equal(row['Còn thiếu (thực lĩnh âm)'],4200000);
 const snap=CLS.buildSnapshot(db,'2026-09',kq,db.nhansu,{user:'tester'});row['Còn thiếu (thực lĩnh âm)']=0;
 const saved=JSON.parse(JSON.stringify(snap));assert.equal(saved.kq.bangluong[0]['Còn thiếu (thực lĩnh âm)'],4200000);assert.equal(CLS.verify(saved),'ok');
 const next=E.tinhBangLuong(db,2026,10,false).bangluong[0];assert.equal(next['Thực lĩnh'],800000);assert.equal(next['Còn thiếu (thực lĩnh âm)']||0,0);
});
test('payslip distinguishes deficit from rounding and payroll export columns include deficit',()=>{
 const src=fs.readFileSync(path.resolve(__dirname,'../../app.js'),'utf8'),start=src.indexOf('  var SLIP_TN ='),end=src.indexOf('  function slipEl(',start);assert.ok(start>0&&end>start);
 const context={};vm.createContext(context);vm.runInContext(src.slice(start,end),context);
 const row=E.tinhBangLuong(fixture(),2026,9,false).bangluong[0],lines=context.slipLines(row);
 assert.ok(lines.some(x=>/Còn thiếu/.test(x.label)&&x.value===4200000));assert.ok(!lines.some(x=>x.label==='Làm tròn'&&Math.abs(x.value)>=1000));
 for(const name of ['COLS_FULL','COLS_COMPACT']){const m=src.match(new RegExp('var '+name+' = (\\[[^;]+);'));assert.ok(m);assert.ok(JSON.parse(m[1]).includes('Còn thiếu (thực lĩnh âm)'));}
});
