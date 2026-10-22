const { test } = require('node:test'), assert = require('node:assert/strict');
global.window = global; global.HAK = {};
const N = require('../app/js/numfmt.js');
const X = require('../app/js/excel-io.js');
require('../app/js/store.js'); require('../app/js/db.js');
const S = require('../app/js/schema.js');
const D = require('../app/js/data.js');

test('đọc số kiểu Việt: "." hàng nghìn, "," thập phân', () => {
  assert.equal(N.parse('20.800.000', 'num'), 20800000);
  assert.equal(N.parse('6.500', 'num'), 6500);
  assert.equal(N.parse('13.010,81', 'num'), 13010.81);
  assert.equal(N.parse('0,123', 'num'), 0.123);
  assert.equal(N.parse('1,5', 'num'), 1.5);
  assert.equal(N.parse('1.5', 'num'), 1.5);                 // không đúng dạng nhóm 3 số → thập phân
  assert.equal(N.parse('-1.250.000', 'num'), -1250000);
  assert.equal(N.parse('1,234,567', 'num'), 1234567);       // dán từ Excel tiếng Anh
  assert.equal(N.parse('abc', 'num'), null); assert.equal(N.parse('1.2.3x', 'num'), null);
  assert.equal(N.parse('49,981', 'dec'), 49.981);
  assert.equal(N.parse(N.txt(20800000, 'num'), 'num'), 20800000);   // hiển thị rồi đọc lại không đổi giá trị
});

test('Excel: nhận bảng theo tiêu đề, chuẩn hóa ngày / số', () => {
  assert.equal(X.toISO('05/06/2026'), '2026-06-05'); assert.equal(X.toISO(46178), '2026-06-05'); assert.equal(X.toISO('xx'), '');
  assert.equal(X.toNum('20.800.000'), 20800000);
  const m = [['BẢNG NHÂN SỰ'], ['Mã nhân viên', 'Họ và tên', 'Lương thỏa thuận', 'Ngày vào làm', 'Mã tiền lương 1'], ['NV1', ' An ', '20.800.000', '01/06/2026', 'TG1'], ['', '', '', '', '']];
  const d = X.detect(m, S.TABLES);
  assert.equal(d.table.id, 'NL_NHANSU'); assert.equal(d.headerAt, 1);
  const rows = X.toRows(d.table, m, d.headerAt);
  assert.equal(rows.length, 1);                              // dòng trống bị bỏ
  assert.equal(rows[0]['Họ và tên'], 'An'); assert.equal(rows[0]['Lương thỏa thuận'], 20800000); assert.equal(rows[0]['Ngày vào làm'], '2026-06-01');
});

test('sao lưu: từ chối file lạ / hỏng, nhận file đúng', async () => {
  assert.equal(D.checkBackup(null).ok, false);
  assert.equal(D.checkBackup({ app: 'khac', v: 1, tables: [], results: [] }).ok, false);
  assert.equal(D.checkBackup({ app: 'hak-luong', v: 1, tables: [{ id: 'hak|KHONG_CO', rows: [] }], results: [] }).ok, false);
  assert.equal(D.checkBackup({ app: 'hak-luong', v: 1, tables: [{ id: 'hak|NL_NHANSU', rows: 'x' }], results: [] }).ok, false);
  const good = { app: 'hak-luong', v: 1, tables: [{ id: 'hak|NL_NHANSU', rows: [{ 'Mã nhân viên': 'NV1' }] }, { id: 'dh|DM_LUONG', rows: [] }], results: [{ id: 'hak|2026-06', res: { bangLuong: [] } }], kv: { 'hak.period': { nam: 2026, thang: 6 }, 'la.key': 1 } };
  const c = D.checkBackup(good);
  assert.equal(c.ok, true); assert.deepEqual(c.units, ['dh', 'hak']); assert.equal(c.kv, 1);
  await assert.rejects(D.importAll({ app: 'khac' }), /Không phải file sao lưu/);
  await D.importAll(good, { replace: true });
  assert.equal((await HAK.DB.get('tables', 'hak|NL_NHANSU')).rows[0]['Mã nhân viên'], 'NV1');
  assert.equal(HAK.Store.get('la.key', 'không có'), 'không có');   // khóa ngoài "hak." không được nạp
});

test('chốt kỳ: không tính lại được; mở chốt rồi tính lại thì giữ lịch sử', async () => {
  const res = (n) => ({ bangLuong: [], soNguoi: n, tongThucLinh: n });
  await HAK.DB.clear('results');
  await D.saveResult(2026, 7, res(1), { bu: 'THANG' }, 'hak');
  await D.saveResult(2026, 7, res(2), { bu: 'THANG' }, 'hak');
  let r = await D.getResult(2026, 7, 'hak');
  assert.equal(r.res.soNguoi, 2); assert.equal(r.history.length, 1); assert.equal(r.history[0].res.soNguoi, 1);
  await D.lockResult(2026, 7, true, 'hak');
  await assert.rejects(D.saveResult(2026, 7, res(3), {}, 'hak'), /đã chốt/);
  assert.equal((await D.getResult(2026, 7, 'hak')).res.soNguoi, 2);   // kết quả đã chốt giữ nguyên
  await D.lockResult(2026, 7, false, 'hak');
  await D.saveResult(2026, 7, res(3), {}, 'hak');
  r = await D.getResult(2026, 7, 'hak');
  assert.equal(r.res.soNguoi, 3); assert.equal(r.history.length, 2); assert.equal(r.lockLog.length, 2); assert.equal(r.locked, undefined);
  for (let i = 4; i < 12; i++) await D.saveResult(2026, 7, res(i), {}, 'hak');
  assert.equal((await D.getResult(2026, 7, 'hak')).history.length, 5);   // giữ tối đa 5 lần trước
  await assert.rejects(D.lockResult(2026, 8, true, 'hak'), /chưa tính lương/);
});
