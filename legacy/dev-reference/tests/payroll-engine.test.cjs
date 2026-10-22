const { test } = require('node:test'), assert = require('node:assert/strict');
global.window = global; global.HAK = {};
const P = require('../app/js/payroll-engine.js');

const SUN = [7, 14, 21, 28];                           // Chủ nhật tháng 6/2026
const ngayLam = (extra) => { const r = { 'Ngày tính công': '2026-06-01', 'Hình thức công': 'BT' }; for (let d = 1; d <= 30; d++) if (!SUN.includes(d)) r[('0' + d).slice(-2)] = 1; return Object.assign(r, extra || {}); };
const base = () => ({
  nam: 2026, thang: 6,
  t: {
    NL_NHANSU: [{ 'Mã nhân viên': 'NV1', 'Họ và tên': 'A', 'Mã PB': 'PB1', 'Mã CV': 'CV1', 'Lương cơ bản': 5000000, 'Lương thỏa thuận': 20800000, 'Mã tiền lương 1': 'TG1', 'Mã phụ cấp': 'PC1', 'Mã BHXH': 'BH1', 'Mã TNCN': 'TNCN2' }],
    NL_CHITIET_NS: [{ 'Mã nhân viên': 'NV1', 'Mã GT_TNCN_BT': 'GTBT', 'Mã GT_TNCN_PT': 'GTPT', 'Người phụ thuộc': 1 }],
    NL_CHAMCONG: [Object.assign({ 'Mã NV': 'NV1' }, ngayLam())],
    DM_LUONG: [{ 'Mã lương': 'TG1', 'Mã hình thức lương': 'TG', 'Cách tính': 'Số ngày của tháng - tất cả ngày CN' }],
    DM_PHUCAP: [{ 'Mã phụ cấp': 'PC1', 'Số tiền': 500000, 'Cách tính': 'Cố định' }, { 'Mã phụ cấp': 'QC', 'Số tiền': 100000, 'Cách tính': 'Cố định' }],
    DM_BAOHIEM: [{ 'Mã bảo hiểm': 'BH1', 'DN.BHXH': 0.175, 'DN.BHYT': 0.03, 'DN.BHTN': 0.01, 'DN.KPCD': 0.02, 'NLD.BHXH': 0.08, 'NLD.BHYT': 0.015, 'NLD.BHTN': 0.01, 'NLD.KPCD': 0 }],
    DM_TNCN: [{ 'Bậc': 1, 'Tỷ lệ đóng thuế': 0.05, 'Thu nhập tháng (Min)': 0, 'Thu nhập tháng (Max)': 5000000 }, { 'Bậc': 2, 'Tỷ lệ đóng thuế': 0.1, 'Thu nhập tháng (Min)': 5000000, 'Thu nhập tháng (Max)': 10000000 }, { 'Bậc': 3, 'Tỷ lệ đóng thuế': 0.15, 'Thu nhập tháng (Min)': 10000000, 'Thu nhập tháng (Max)': '' }],
    DM_GT_TNCN: [{ 'Mã giảm trừ': 'GTBT', 'Số tiền': 11000000 }, { 'Mã giảm trừ': 'GTPT', 'Số tiền': 4400000 }],
    DM_PHONGBAN: [{ 'Mã phòng ban': 'PB1', 'Tên phòng ban': 'Sản xuất' }], DM_CHUCVU: [{ 'Mã chức vụ': 'CV1', 'Tên chức vụ': 'Công nhân' }]
  }
});

test('công: tách số + nhãn, đếm Chủ nhật, công chuẩn = ngày tháng − CN', () => {
  assert.deepEqual(P.tachSoCongVaNhan('1QC'), { soCong: 1, nhan: 'QC' });
  assert.deepEqual(P.tachSoCongVaNhan('0,5'), { soCong: 0.5, nhan: '' });
  assert.equal(P.layCongChuan({ 'Mã tiền lương 1': 'TG1' }, 6, 2026, { TG1: { 'Cách tính': 'Số ngày của tháng - 4' } }, 0), 22);   // 30 − 4 CN − 4
  assert.equal(P.layCongChuan({ 'Mã tiền lương 1': 'X' }, 6, 2026, {}, 0), 26);
  assert.equal(P.layCongChuan({ 'Mã tiền lương 1': 'TG1' }, 6, 2026, { TG1: { 'Cách tính': 'Thực tế ngày công' } }, 24), 24);
  const t = P.tongHopChamCong(base().t.NL_CHAMCONG, 2026, 6).NV1;
  assert.equal(t.tongCong, 26); assert.equal(t.congChuNhat, 0);
});

test('bảng lương TG1 + phụ cấp + BHXH + thuế luỹ tiến TNCN2 + làm tròn thực lĩnh', () => {
  const r = P.tinhBangLuong(base()), l = r.bangLuong[0];
  assert.equal(l['Công chuẩn'], 26); assert.equal(l['Lương thời gian'], 20800000); assert.equal(l['Phụ cấp'], 500000);
  assert.equal(l['Tổng thu nhập (trước trừ)'], 21300000);
  assert.equal(l['BHXH/BHYT/BHTN trừ NLĐ'], 525000);                       // 5.000.000 × 10,5%
  assert.equal(r.tncn[0]['Thu nhập tính thuế'], 5375000);                  // 21.300.000 − 525.000 − 11.000.000 − 4.400.000
  assert.equal(l['Thuế TNCN'], 287500);                                    // 5tr×5% + 375k×10%
  assert.equal(l['Thực lĩnh'], 20488000);                                  // 20.487.500 → làm tròn nghìn
  assert.equal(l['Phòng ban'], 'Sản xuất'); assert.equal(r.bhxh[0]['Cộng BH công ty đóng'], 5000000 * 0.235);
});

test('nhãn công tác "1QC" cộng phụ cấp theo mã QC', () => {
  const d = base(); d.t.NL_CHAMCONG = [ngayLam({ 'Mã NV': 'NV1', '03': '1QC', '04': '1QC' })];
  assert.equal(P.tinhBangLuong(d).bangLuong[0]['Phụ cấp công tác'], 200000);
  assert.equal(P.tinhBangLuong(d).bangLuong[0]['Tổng công'], 26);          // vẫn đủ 26 công (không mất công của ô có nhãn)
});

test('tăng ca TC1: công tăng ca × hệ số × đơn giá', () => {
  const d = base(); d.t.NL_NHANSU[0]['Mã tăng ca'] = 'TC1'; d.t.DM_TANGCA = [{ 'Mã tăng ca': 'TC1', 'Hệ số tăng ca': '50%' }];
  d.t.NL_CHAMCONG.push({ 'Mã NV': 'NV1', 'Ngày tính công': '2026-06-01', 'Hình thức công': 'TC', '02': 2, '05': 2 });
  const l = P.tinhBangLuong(d).bangLuong[0];
  assert.equal(l['Công tăng ca'], 4);
  assert.equal(l['Tiền tăng ca'], Math.round(800000 * 4 * 0.5));          // đơn giá 20,8tr/26 = 800.000
});

test('truy thu BH khi chưa đủ ngưỡng công; TNCN1 = 10% gộp; TNCN0 = miễn', () => {
  const d = base(); d.t.DM_LUONG[0]['Ngưỡng truy thu BH (công)'] = 27;      // làm 26 < 27
  const l = P.tinhBangLuong(d).bangLuong[0];
  assert.equal(l['Truy thu bảo hiểm'], 1175000); assert.equal(l['BHXH/BHYT/BHTN trừ NLĐ'], 0);
  const d1 = base(); d1.t.NL_NHANSU[0]['Mã TNCN'] = 'TNCN1';
  assert.equal(P.tinhBangLuong(d1).bangLuong[0]['Thuế TNCN'], 2130000);
  const d0 = base(); d0.t.NL_NHANSU[0]['Mã TNCN'] = 'TNCN0';
  assert.equal(P.tinhBangLuong(d0).bangLuong[0]['Thuế TNCN'], 0);
});

test('lương sản lượng + bù theo tháng và theo ngày', () => {
  const mk = () => { const d = base(); d.t.NL_NHANSU[0]['Mã tiền lương 1'] = 'SP'; d.t.NL_NHANSU[0]['Lương thỏa thuận'] = 0;
    d.t.DM_LUONG.push({ 'Mã lương': 'SP', 'Mã hình thức lương': 'LSP', 'Số tiền khoán': 10000, 'ĐK_Bù lương (công tối thiểu)': 10, 'Đơn giá bù lương': 300000, 'Cách tính': 'Cố định' });
    d.t.DL_SANLUONG = [{ 'Ngày cân': '2026-06-02', 'KL hàng (Tấn)': 100, 'Mã NV': 'NV1' }, { 'Ngày cân': '2026-06-03', 'KL hàng (Tấn)': 5, 'Mã NV': 'NV1' }]; return d; };
  let l = P.tinhBangLuong(mk()).bangLuong[0];                              // 105 tấn / 26 công = 4,04 < 10 → bù theo tháng
  assert.equal(l['Lương sản lượng'], 1050000); assert.equal(l['Lương bù SL (nếu dưới ngưỡng)'], 26 * 300000 - 1050000);
  const dd = mk(); dd.buTheoNgay = true; l = P.tinhBangLuong(dd).bangLuong[0];
  // 24 ngày không có sản lượng bù 300.000; ngày 2 (100 tấn) ≥ ngưỡng nên không bù; ngày 3 (5 tấn < 10) bù 300.000 − 5×10.000
  assert.equal(l['Lương bù SL (nếu dưới ngưỡng)'], 24 * 300000 + (300000 - 50000));
});

test('danh mục có hiệu lực theo ngày: lấy đúng phiên bản của kỳ', () => {
  const list = [{ 'Mã lương': 'TG1', 'Hiệu lực từ': '2026-01-01', 'Hiệu lực đến': '2026-05-31', 'Số tiền khoán': 1 }, { 'Mã lương': 'TG1', 'Hiệu lực từ': '2026-06-01', 'Số tiền khoán': 2 }];
  assert.equal(P.locTheoHieuLuc(list, 'Mã lương', 2026, 5).TG1['Số tiền khoán'], 1);
  assert.equal(P.locTheoHieuLuc(list, 'Mã lương', 2026, 6).TG1['Số tiền khoán'], 2);
});

test('nhân sự nhiều dòng theo hiệu lực: mỗi người 1 dòng lương, đúng mức của kỳ', () => {
  const d = base(), ns = d.t.NL_NHANSU[0];
  d.t.NL_NHANSU = [Object.assign({}, ns, { 'Lương thỏa thuận': 18200000, 'Hiệu lực từ': '2026-01-01', 'Hiệu lực đến': '2026-05-31' }), Object.assign({}, ns, { 'Hiệu lực từ': '2026-06-01' })];
  let r = P.tinhBangLuong(d);
  assert.equal(r.bangLuong.length, 1); assert.equal(r.bhxh.length, 1);
  assert.equal(r.bangLuong[0]['Lương thỏa thuận'], 20800000);
  d.thang = 5; r = P.tinhBangLuong(d);
  assert.equal(r.bangLuong.length, 1); assert.equal(r.bangLuong[0]['Lương thỏa thuận'], 18200000);
});

test('nhân viên vào làm sau kỳ lương không có trong bảng lương; vào giữa kỳ vẫn tính', () => {
  const d = base(); d.t.NL_NHANSU[0]['Mã tiền lương 1'] = 'CĐ'; d.t.NL_CHAMCONG = [];
  d.t.NL_NHANSU[0]['Ngày vào làm'] = '2026-07-01';
  let r = P.tinhBangLuong(d);
  assert.equal(r.bangLuong.length, 0); assert.equal(r.bhxh.length, 0); assert.equal(r.tongThucLinh, 0);
  d.t.NL_NHANSU[0]['Ngày vào làm'] = '2026-06-30';
  r = P.tinhBangLuong(d);
  assert.equal(r.bangLuong.length, 1);
});

test('khấu trừ vượt thu nhập: thực lĩnh 0 và ghi rõ số còn thiếu', () => {
  const d = base(); d.t.NL_UNGLUONG = [{ 'Mã NV': 'NV1', 'Ngày hạch toán': '2026-06-10', 'Tạm ứng': 30000000 }];
  const l = P.tinhBangLuong(d).bangLuong[0];
  assert.equal(l['Thực lĩnh'], 0);
  assert.equal(l['Còn thiếu (thực lĩnh âm)'], 9512500);                  // 21.300.000 − 525.000 − 287.500 − 30.000.000
  assert.equal(P.tinhBangLuong(base()).bangLuong[0]['Còn thiếu (thực lĩnh âm)'], 0);
});

test('danh mục mẫu: biểu thuế 5 bậc + giảm trừ 15,5tr/6,2tr từ 2026; kỳ 2025 vẫn ra mức cũ', () => {
  const dm = require('../app/js/sample-data.js').dm;
  const bieu = (nam) => Object.values(P.locTheoHieuLuc(dm.DM_TNCN, 'Bậc', nam, 1)).sort((a, b) => a['Thu nhập tháng (Min)'] - b['Thu nhập tháng (Min)']);
  const gt = (nam) => P.locTheoHieuLuc(dm.DM_GT_TNCN, 'Mã giảm trừ', nam, 1);
  assert.equal(bieu(2026).length, 5); assert.equal(bieu(2025).length, 7);
  assert.equal(gt(2026)['GTBT.01']['Số tiền'], 15500000); assert.equal(gt(2026)['GTNPT.01']['Số tiền'], 6200000);
  assert.equal(gt(2025)['GTBT.01']['Số tiền'], 11000000);
  assert.equal(P.tinhThueTNCNLuyTien(25000000, bieu(2026)), 2000000);    // 10tr×5% + 15tr×10%
  assert.equal(P.tinhThueTNCNLuyTien(150000000, bieu(2026)), 38000000);  // 0,5 + 2 + 6 + 12 + 50×35% (triệu)
  assert.equal(P.tinhThueTNCNLuyTien(25000000, bieu(2025)), 3350000);    // 0,25 + 0,5 + 1,2 + 1,4 (triệu)
  assert.equal(P.tinhThueTNCNLuyTien(2000000000, bieu(2025)), Math.round(18150000 + (2000000000 - 80000000) * 0.35));  // thuế luỹ kế tới 80tr = 18,15tr; bậc cao nhất không còn bị chặn ở 1 tỷ
});

test('cảnh báo đầu vào: nhân sự trùng, ô ngày ngoài tháng, CĐ vào giữa kỳ, danh mục thuế cũ', () => {
  const d = base(), ns = d.t.NL_NHANSU[0];
  assert.deepEqual(P.canhBaoDauVao(d).map((x) => x[1]).filter((s) => !/thuế TNCN còn mức cũ/.test(s)), []);   // dữ liệu chuẩn: chỉ còn cảnh báo thuế (fixture dùng giảm trừ 11tr)
  d.t.NL_NHANSU = [ns, Object.assign({}, ns, { 'Mã tiền lương 1': 'CĐ', 'Ngày vào làm': '2026-06-15' })];
  d.t.NL_CHAMCONG = [ngayLam({ 'Mã NV': 'NV1', '31': 1 })];
  d.t.DM_GT_TNCN = [{ 'Mã giảm trừ': 'GTBT', 'Số tiền': 11000000 }];
  const w = P.canhBaoDauVao(d).map((x) => x[1]).join('\n');
  assert.match(w, /Nhân sự trùng mã.*NV1/); assert.match(w, /ngày không có trong tháng 6.*NV1/); assert.match(w, /CĐ.*NV1/); assert.match(w, /thuế TNCN còn mức cũ/);
  d.nam = 2025; assert.doesNotMatch(P.canhBaoDauVao(d).map((x) => x[1]).join('\n'), /mức cũ/);   // trước 2026 thì mức cũ là đúng
});

test('ô ngày không có trong tháng (31/06) không được cộng công', () => {
  const d = base(); d.t.NL_CHAMCONG = [ngayLam({ 'Mã NV': 'NV1', '31': 1 }), { 'Mã NV': 'NV1', 'Ngày tính công': '2026-06-01', 'Hình thức công': 'TC', '31': 2 }];
  const t = P.tongHopChamCong(d.t.NL_CHAMCONG, 2026, 6).NV1;
  assert.equal(t.tongCong, 26); assert.equal(t.congTangCa, 0);
  assert.equal(P.layCongChinhTheoNgay(d.t.NL_CHAMCONG, 2026, 6).NV1['31'], undefined);
  assert.equal(P.tinhBangLuong(d).bangLuong[0]['Tổng công'], 26);
});
