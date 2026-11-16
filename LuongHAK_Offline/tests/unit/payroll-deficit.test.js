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

test("Đối chiếu chốt lại giữ người đã chi nhưng bị loại và tách chờ chi với trả thừa", () => {
  const P = require("../../core/payment-ledger");
  const ky = "2026-10";
  const line = (ma, so, amount, status) => ({ "Kỳ": ky, "Mã NV": ma, "Số chứng từ": so, "Số tiền": amount, "Trạng thái": status });
  const before = [{ "Mã NV": "A", "Thực lĩnh": 400 }, { "Mã NV": "B", "Thực lĩnh": 200 }];
  const after = [{ "Mã NV": "A", "Thực lĩnh": 500 }];
  const rows = P.reconciliation(before, after, [line("A","PC1",100,P.TT.TRA), line("A","PC2",450,P.TT.DUYET), line("B","PC3",200,P.TT.TRA), line("B","PC4",100,P.TT.HUY)], ky);
  assert.equal(rows[0]["Còn phải trả"], 400);
  assert.equal(rows[0]["Chờ chi cần điều chỉnh"], 50);
  assert.equal(rows[0]["Cần lập thêm"], 0);
  assert.equal(rows[1]["Đã trả thừa"], 200);
  assert.equal(rows[1]["Chứng từ gốc"], "PC3");
});

test("Sổ khoản thiếu gộp đúng chứng từ nháp và chứng từ đã chốt, không khấu trừ lặp", () => {
  const P = require("../../core/payment-ledger");
  const source = "2026-09", target = "2026-10";
  const origin = { ky: source, kq: { bangluong: [{ "Mã NV": "A", "Còn thiếu (thực lĩnh âm)": 4200000 }] } };
  const row = { "Mã NV": "A", "Số chứng từ": P.deficitVoucher(source,target), "Ngày hạch toán": target + "-01", "Trừ khác": 1000000 };
  const wage = { "Mã NV": "A", "Trừ khác": 1000000 };
  const db = { kyluong: [origin], psluong: [row] };
  assert.equal(P.deficitRegister(db).rows[0].pending, 1000000);
  assert.equal(P.deficitRegister(db, target, [wage]).rows[0].recovered, 1000000);
  assert.match(P.deficitRegister(db, target, [{ ...wage, "Còn thiếu (thực lĩnh âm)": 200 }]).errors[0], /chưa đủ thu nhập/);
  db.kyluong.push({ ky: target, input: { data: { psluong: [row] } }, kq: { bangluong: [wage] } });
  const reg = P.deficitRegister(db);
  assert.equal(reg.rows[0].recovered, 1000000);
  assert.equal(reg.rows[0].pending, 0);
  assert.deepEqual(reg.errors, []);
  assert.match(P.deficitRegister(db, source, [{ "Mã NV": "A", "Còn thiếu (thực lĩnh âm)": 200 }]).errors[0], /vượt khoản thiếu/);
});
