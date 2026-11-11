'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../../core/production-carry'),H=require('../../hr'),R=require('../../core/input-review'),E=require('../../engine'),{fixture}=require('../fixtures/production-carry');
test('Move September production to October allocates only to October workers at October prices',()=>{
 const d=fixture();R.initialize(d);const p=C.reperiod(d,'2026-09','2026-10');assert.equal(p.rows[0]['Ngày cân'],'2026-10-01');assert.equal(p.rows[0]['Ngày cân gốc'],'2026-09-01');assert.equal(d.sanluong[0]['Ngày cân'],'2026-09-01');
 d.sanluong=d.sanluong.filter(r=>!p.moving.includes(r)).concat(p.rows);
 assert.equal(H.sanLuongKy(d,2026,9,'sanluong').rows.length,0);
 const sl=H.sanLuongKy(d,2026,10,'sanluong').rows;assert.deepEqual(sl.map(r=>[r['Mã NV'],r['KL hàng (Tấn)']]),[['C',10]]);
 assert.ok(R.changed(d,'sanluong','2026-09'));assert.ok(R.changed(d,'sanluong','2026-10'));
 const out=E.tinhBangLuong({...d,nhansu:H.staffForPayroll(d,2026,10).list,sanluong:sl},2026,10,'daihiep',{quyChe:'2026'});assert.equal(out.bangluong.find(x=>x['Mã NV']==='C')['Lương sản lượng'],2000);assert.ok(!out.bangluong.some(x=>x['Mã NV']==='B'));
});
test('Move preserves quantity, attendance, original dates and existing target receipts',()=>{const d=fixture();d.sanluong.push({'Phiếu cân':'OCT','Ngày cân':'2026-10-01','KL hàng (Tấn)':7,'Mã phòng ban':'02.01'});const before=JSON.stringify(d.chamcong),p=C.reperiod(d,'2026-09','2026-10');assert.equal(p.rows.length,1);assert.equal(p.rows[0]['KL hàng (Tấn)'],10);assert.equal(JSON.stringify(d.chamcong),before);});
test('Move rejects closed periods, duplicate receipts, active payment carries and invalid destination dates',()=>{
 for(const ky of ['2026-09','2026-10']){const d=fixture();d.kyluong=[{ky}];assert.throws(()=>C.reperiod(d,'2026-09','2026-10'),/đã chốt/);}
 const d=fixture();d.sanluong.push({...d.sanluong[0],'Ngày cân':'2026-10-01'});assert.throws(()=>C.reperiod(d,'2026-09','2026-10'),/trùng khóa/);
 const e=fixture();e.sl_chuyenky=[{source:'2026-09',target:'2026-10'}];assert.throws(()=>C.reperiod(e,'2026-09','2026-10'),/sổ chuyển/);
 const f=fixture();f.sanluong[0]['Ngày cân']='2026-01-31';assert.throws(()=>C.reperiod(f,'2026-01','2026-02'),/ngày tương ứng/);
});

test('Transfer preview reports moved quantities by employee and pending receipts without writing data', () => {
  const d = fixture();
  const receipt = d.sanluong[0];
  d.sanluong.push({ ...receipt, 'Phiếu cân': 'ABSENT', 'NV vắng': 'C' });
  d.sanluong.push({ ...receipt, 'Phiếu cân': 'UNASSIGNED', 'Mã phòng ban': '' });
  d.sanluong.push({ ...receipt, 'Phiếu cân': 'DIRECT', 'Mã NV': 'C', 'KL hàng (Tấn)': 2 });
  d.sanluong.push({ ...receipt, 'Phiếu cân': 'EXISTING', 'Ngày cân': '2026-10-01' });
  const before = JSON.stringify(d);
  const plan = C.reperiod(d, '2026-09', '2026-10');
  const preview = C.previewReperiod(d, plan);
  assert.deepEqual(preview.employees, [{ code: 'C', name: 'C', quantity: 12 }]);
  assert.deepEqual(preview.receipts.map(r => [r.row['Phiếu cân'], r.count, r.pending]), [
    ['P9', 1, 0], ['ABSENT', 0, 10], ['UNASSIGNED', 0, 10], ['DIRECT', 1, 0]
  ]);
  assert.equal(JSON.stringify(d), before);
});
