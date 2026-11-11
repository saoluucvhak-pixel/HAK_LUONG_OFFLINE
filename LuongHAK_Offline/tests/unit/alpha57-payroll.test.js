'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../engine');
const H = require('../../hr');
const Checklist = require('../../core/pre-close-checklist');
const { baseDb, ccRow, staff } = require('../fixtures/build');

test('Aliases of TC5 apply the same exclusion from time pay', () => {
  function run(code) {
    const db = baseDb();
    db.dm_tangca = [{ 'Mã tăng ca': code, 'Loại công thức': 'TC5', 'Hệ số tăng ca': 1.5, 'Tiền tăng ca (nếu tính cố định)': 5200000 }];
    db.nhansu = [staff({ 'Mã tiền lương 1': 'TG1', 'Mã tăng ca': code, 'Lương thỏa thuận': 5200000 })];
    db.chamcong = [ccRow('NV', 2026, 10, 'BT', 1, 10), ccRow('NV', 2026, 10, 'TC', 1, 2)];
    const row = E.tinhBangLuong(db, 2026, 10, 'to', { quyChe: '2026' }).bangluong[0];
    return [row._ct.congTinhTG, row['Lương thời gian'], row['Tiền tăng ca']];
  }
  assert.deepEqual(run('TC5'), [10, 1925926, 577778]);
  assert.deepEqual(run('TC7'), run('TC5'));
});

test('Support slots use the period-effective catalog and report omitted codes', () => {
  const db = baseDb();
  db.nhanvien = [{ 'Mã NV': 'NV' }];
  db.hopdong = [{ 'Mã NV': 'NV', 'Số HĐLĐ': 'H', 'Ngày vào làm': '2026-01-01' }];
  db.chitiethd = [{ 'Mã NV': 'NV', 'Số HĐLĐ': 'H', 'Hiệu lực từ': '2026-01-01', 'Hỗ trợ': 'HT.A, HT.B, HT.C' }];
  db.dm_hotro = [
    { 'Mã hỗ trợ': 'HT.A', 'Tên hỗ trợ': 'Tiền cơm', 'Hiệu lực từ': '2026-01-01' },
    { 'Mã hỗ trợ': 'HT.A', 'Tên hỗ trợ': 'Hỗ trợ cơ giới', 'Hiệu lực từ': '2027-01-01' },
    { 'Mã hỗ trợ': 'HT.B', 'Tên hỗ trợ': 'Hỗ trợ thường' },
    { 'Mã hỗ trợ': 'HT.C', 'Tên hỗ trợ': 'Hỗ trợ thường' }
  ];
  const { list: [row], warn } = H.staffForPayroll(db, 2026, 2);
  assert.equal(row['Mã hỗ trợ'], 'HT.A');
  assert.equal(row['Mã hỗ trợ 2'], 'HT.B');
  assert.ok(warn.some(message => message.includes('HT.C')));
});

test('Invalid calendar days are excluded and missing allowance and support are visible', () => {
  const db = baseDb();
  db.nhansu = [staff({ 'Mã phụ cấp': 'PC-X', 'Mã hỗ trợ': 'HT-X', 'Mã hỗ trợ 2': 'HT-Y' })];
  db.chamcong = [{ 'Kỳ': '2026-02', 'Mã NV': 'NV', 'Hình thức công': 'BT', '01': 1, '30': 2 }];
  const kq = E.tinhBangLuong(db, 2026, 2, 'to', { quyChe: '2026' });
  assert.equal(kq.bangluong[0]['Tổng công'], 1);
  assert.match(kq.inputErrors[0], /NV: ngày 30 .*2\/2026/);
  const item = Checklist.run({ db, kq }).items.find(row => row.id === 6);
  assert.equal(item.trangThai, 'canhbao');
  for (const code of ['PC-X', 'HT-X', 'HT-Y']) assert.ok(item.chiTiet.some(message => message.includes(code)));
});

test('KT-19 detects mismatches even when rounding hides them from KT-20', () => {
  const db = baseDb();
  const kq = { bangluong: [{ 'Mã NV': 'NV', 'Tổng thu nhập': 1000, 'Tạm ứng': 100, _ct: { tongGiamTru: 150 }, 'Thực lĩnh': 1000 }] };
  const items = Checklist.run({ db, kq }).items;
  assert.equal(items.find(row => row.id === 19).trangThai, 'loi');
  assert.equal(items.find(row => row.id === 20).trangThai, 'ok');
});
