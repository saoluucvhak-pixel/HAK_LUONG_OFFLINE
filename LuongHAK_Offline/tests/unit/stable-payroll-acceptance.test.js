'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../engine');
const M = require('../../main/payroll-gate');
const Review = require('../../core/input-review');
const { fixture } = require('../fixtures/production-carry');
const { baseDb, staff } = require('../fixtures/build');

test('Closing blocks both production types when a receipt has no payroll recipient', () => {
  for (const table of ['sanluong', 'bandam']) {
    for (const recipient of ['', 'UNKNOWN', 'C']) {
      const db = fixture();
      const receipt = db.sanluong.pop();
      delete receipt['Mã phòng ban'];
      if (recipient) receipt['Mã NV'] = recipient;
      db[table].push(receipt);
      Review.initialize(db);
      const blocker = M.blockers(db, '2026-09', { bu: 'to' }).find(x => x.code === 'SAN_LUONG_CHUA_PHAN_BO');
      assert.ok(blocker);
      assert.match(blocker.items[0], /P9.*2026-09-01.*10/);
    }
  }
});

test('Conflicting labels block closing regardless of order and overlapping meals retain both quantities', () => {
  const db = baseDb();
  db.nhansu = [staff({ 'Mã hỗ trợ': 'HT.01' })];
  db.dm_phucap = [{ 'Mã phụ cấp': 'A', 'Số tiền': 10000 }, { 'Mã phụ cấp': 'B', 'Số tiền': 50000 }];
  const day = (type, quantity) => ({ 'Kỳ': '2026-10', 'Mã NV': 'NV', 'Hình thức công': type, '01': quantity });
  db.tiencom = [{ 'Ngày': '2026-10-01', 'Mã NV': 'NV', 'Số suất cơm': 1 }];
  for (const rows of [[day('BT', '1A'), day('TC', '1B')], [day('TC', '1B'), day('BT', '1A')]]) {
    db.chamcong = rows.concat(day('CC', 1));
    const result = E.tinhBangLuong(db, 2026, 10, 'to', { quyChe: '2026' });
    assert.ok(result.inputErrors.some(x => x.includes('A, B')));
    assert.equal(result.bangluong[0]['Phụ cấp công tác'], 0);
    assert.equal(result.bangluong[0]['Tiền cơm'], 40000);
    assert.ok(result.canhbao.some(x => x.includes('cả công CC')));
    assert.ok(result.canhbao.some(x => x.includes('chưa gán mã tăng ca')));
  }
});

test('Bad active catalog money and rates are reported with their code', () => {
  const db = baseDb();
  db.nhansu = [staff({ 'Mã phụ cấp': 'PC', 'Mã tăng ca': 'TC4', 'Mã hỗ trợ': 'HT' })];
  db.dm_phucap = [{ 'Mã phụ cấp': 'PC', 'Số tiền': 'abc' }];
  db.dm_tangca = [{ 'Mã tăng ca': 'TC4', 'Hệ số tăng ca': '1.5abc' }];
  db.dm_hotro = [{ 'Mã hỗ trợ': 'HT', 'Số tiền': 'xyz' }];
  const result = E.tinhBangLuong(db, 2026, 10, 'to', { quyChe: '2026' });
  for (const text of ['Phụ cấp PC', 'Tăng ca TC4', 'Hỗ trợ HT']) assert.ok(result.inputErrors.some(x => x.includes(text)));
});

test('Legacy production dates allocate correctly and invalid quantities or contracts block closing', () => {
  for (const table of ['sanluong', 'bandam']) {
    const db = fixture();
    const row = db.sanluong.pop();
    row['Ngày cân'] = '01/09/2026';
    row['Mã NV'] = 'A';
    db[table].push(row);
    const H = require('../../hr');
    assert.equal(H.sanLuongKy(db, 2026, 9, table).rows[0]['Ngày cân'], '2026-09-01');
    for (const quantity of ['abc', -3, 0]) {
      row['KL hàng (Tấn)'] = quantity;
      assert.ok(M.blockers(db, '2026-09', { bu: 'to' })[0].items.some(x => /P9.*không hợp lệ/.test(x)));
    }
    row['KL hàng (Tấn)'] = 10;
    db.hopdong.find(x => x['Mã NV'] === 'A')['Ngày vào làm'] = '2026-09-15';
    assert.equal(H.sanLuongKy(db, 2026, 9, table).rows.length, 0);
    assert.ok(M.blockers(db, '2026-09', { bu: 'to' }).some(x => x.items.some(s => /P9.*hợp đồng hiệu lực ngày cân/.test(s))));
  }
});

test('Excel rejects cross-period updates but can repair an existing blank date', () => {
  const I = require('../../core/importer');
  const db = fixture();
  const row = db.sanluong[0];
  const candidate = { ...row, 'Ngày cân': '2026-10-01' };
  const plan = () => I.plan(db, 'sanluong', Object.keys(candidate), [candidate]).items[0];
  assert.equal(plan().action, 'conflict');
  assert.match(plan().reason, /2026-09.*2026-10/);
  assert.equal(row['Ngày cân'], '2026-09-01');
  row['Ngày cân'] = '';
  assert.equal(plan().action, 'update');
});
