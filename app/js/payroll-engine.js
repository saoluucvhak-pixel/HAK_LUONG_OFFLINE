/**
 * payroll-engine.js — BỘ MÁY TÍNH LƯƠNG (hàm thuần, không DOM, chạy được trong Node để kiểm thử).
 * Port nguyên logic từ hệ thống Google Apps Script LUONG_HAK (TinhCong.gs, TinhLuong.gs, DanhMuc.gs).
 * Khác biệt duy nhất: dữ liệu vào là các mảng object {Tên cột: giá trị} (như từng sheet), NGÀY lưu dạng chuỗi ISO "YYYY-MM-DD".
 *
 * input = { nam, thang, buTheoNgay, t: { NL_NHANSU, NL_CHITIET_NS, NL_CHAMCONG, NL_PSLUONG, NL_UNGLUONG, DL_SANLUONG, DL_BANDAM, DL_TIENCOM,
 *           DM_LUONG, DM_PHUCAP, DM_TANGCA, DM_HOTRO, DM_BAOHIEM, DM_TNCN, DM_GT_TNCN, DM_PHONGBAN, DM_CHUCVU } }
 * trả về { bangLuong[], bhxh[], tncn[], soNguoi, tongThucLinh }
 */
(function (root) {
  'use strict';
  const HAK = (root.HAK = root.HAK || {});
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const pad2 = (n) => ('0' + n).slice(-2);

  /* ---------- Ngày (chuỗi ISO) ---------- */
  const isoOf = (v) => (typeof v === 'string' && /^\d{4}-\d\d-\d\d/.test(v) ? v.slice(0, 10) : '');
  const inMonth = (v, nam, thang) => { const s = isoOf(v); return !!s && Number(s.slice(0, 4)) === Number(nam) && Number(s.slice(5, 7)) === Number(thang); };
  const dayOf = (v) => Number(isoOf(v).slice(8, 10));
  const soNgayThang = (nam, thang) => new Date(Number(nam), Number(thang), 0).getDate();

  /** Số ô chấm công có thể là số thuần (1, 0.5) hoặc số kèm NHÃN chữ ("1QC", "0.5CL") — tách phần số và phần nhãn. */
  function tachSoCongVaNhan(giaTri) {
    if (giaTri === '' || giaTri === null || giaTri === undefined) return { soCong: 0, nhan: '' };
    if (typeof giaTri === 'number') return { soCong: giaTri, nhan: '' };
    const chuoi = String(giaTri).trim();
    const m = chuoi.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
    if (!m) return { soCong: 0, nhan: chuoi };
    return { soCong: parseFloat(m[1].replace(',', '.')) || 0, nhan: m[2].trim() };
  }

  /** "50%" hoặc 0.5 → 0.5 */
  function soTuChuoiPhanTram(giaTri) {
    if (giaTri === '' || giaTri === null || giaTri === undefined) return 0;
    if (typeof giaTri === 'number') return giaTri;
    const chuoi = String(giaTri).trim();
    if (chuoi.endsWith('%')) { const so = parseFloat(chuoi.slice(0, -1).replace(',', '.')); return isNaN(so) ? 0 : so / 100; }
    const so = parseFloat(chuoi.replace(',', '.'));
    return isNaN(so) ? 0 : so;
  }

  /* ---------- Danh mục có hiệu lực theo ngày ---------- */
  /** Mỗi mã chọn đúng 1 dòng đang hiệu lực tại ngày mùng 1 của kỳ (hoặc hôm nay nếu không truyền). Hiệu lực trống = có hiệu lực mọi lúc. */
  function locTheoHieuLuc(list, cotMa, nam, thang) {
    const moc = nam && thang ? nam + '-' + pad2(thang) + '-01' : new Date().toISOString().slice(0, 10);
    const theoMa = {};
    (list || []).forEach((r) => {
      const ma = r[cotMa]; if (!ma) return;
      const tu = isoOf(r['Hiệu lực từ']), den = isoOf(r['Hiệu lực đến']);
      if ((tu && tu > moc) || (den && den < moc)) return;
      const cur = theoMa[ma];
      if (!cur || (tu || '0000-00-00') >= (isoOf(cur['Hiệu lực từ']) || '0000-00-00')) theoMa[ma] = r;
    });
    return theoMa;
  }
  const mapTheoMa = (list, cot) => { const m = {}; (list || []).forEach((r) => { m[r[cot]] = r; }); return m; };

  /* ---------- Chấm công ---------- */
  function tongHopChamCong(list, nam, thang) {
    const kq = {};
    const soNgay = soNgayThang(nam, thang);   // ô ngày không có trong tháng (vd 31/06) bỏ qua
    const rong = () => ({ tongCong: 0, congChuNhat: 0, congTangCa: 0, congLe: 0, congPhep: 0, congCom: 0, congDiChuyen: 0, congTrungChuyen: 0, congTheoHinhThuc: {}, nhanTheoNgay: {} });
    (list || []).forEach((row) => {
      const maNV = row['Mã NV']; if (!maNV || !inMonth(row['Ngày tính công'], nam, thang)) return;
      if (!kq[maNV]) kq[maNV] = rong();
      const hinhThuc = String(row['Hình thức công'] || 'BT').trim().toUpperCase();
      const laCong = hinhThuc !== 'CC', laTangCa = /TC/i.test(hinhThuc);
      let tong = 0;
      for (let ngay = 1; ngay <= soNgay; ngay++) {
        const ten = pad2(ngay), { soCong, nhan } = tachSoCongVaNhan(row[ten]);
        if (soCong === 0 && !nhan) continue;
        tong += soCong;
        if (nhan) kq[maNV].nhanTheoNgay[ten] = nhan;
        if (!laTangCa && laCong) { const d = new Date(Number(nam), thang - 1, ngay); if (d.getMonth() === thang - 1 && d.getDay() === 0) kq[maNV].congChuNhat += soCong; }
      }
      if (laCong) kq[maNV].tongCong += tong;
      if (laTangCa) kq[maNV].congTangCa += tong;
      if (hinhThuc === 'CL') kq[maNV].congLe += tong;
      if (hinhThuc === 'PN') kq[maNV].congPhep += tong;
      if (hinhThuc === 'CC') kq[maNV].congCom += tong;
      if (hinhThuc === 'DC') kq[maNV].congDiChuyen += tong;
      if (hinhThuc === 'TRCH') kq[maNV].congTrungChuyen += tong;
      kq[maNV].congTheoHinhThuc[hinhThuc] = (kq[maNV].congTheoHinhThuc[hinhThuc] || 0) + tong;
    });
    return kq;
  }
  /** Công CHÍNH (không gồm dòng tăng ca) theo từng ngày — cho phương án bù sản lượng theo ngày. */
  function layCongChinhTheoNgay(list, nam, thang) {
    const kq = {}, soNgay = soNgayThang(nam, thang);
    (list || []).forEach((row) => {
      const maNV = row['Mã NV']; if (!maNV || !inMonth(row['Ngày tính công'], nam, thang)) return;
      if (/TC/i.test(String(row['Hình thức công'] || 'BT').trim())) return;
      if (!kq[maNV]) kq[maNV] = {};
      for (let ngay = 1; ngay <= soNgay; ngay++) { const ten = pad2(ngay), { soCong } = tachSoCongVaNhan(row[ten]); if (soCong === 0) continue; kq[maNV][ten] = (kq[maNV][ten] || 0) + soCong; }
    });
    return kq;
  }

  /** "Công tính tăng ca" theo mã TC1/TC2/TC3/TC4/TC6 (đã gồm hệ số). TC5 xử lý riêng ở tinhBangLuong. */
  function tinhHeSoTangCa(ma, congTinhLuong, congTrungChuyen, congLe, congChuan, congChuNhat, congTangCa, heSo, congPhep, congDiChuyen) {
    const cCTL = congTinhLuong || 0, cTC = congTrungChuyen || 0, cLe = congLe || 0, cChuan = congChuan || 0, cCN = congChuNhat || 0, cTang = congTangCa || 0, cHS = heSo || 0, cPhep = congPhep || 0, cDC = congDiChuyen || 0;
    switch (ma) {
      case 'TC1': { const du = cCTL - cLe - cTC - cPhep - cTang - cChuan; return (du > 0 ? du * cHS : 0) + cTang * cHS; }
      case 'TC2': { const du = cCTL - cLe - cTC - cPhep - cTang - cDC - cChuan; return (du > 0 ? du * cHS : 0) + cTang * cHS; }
      case 'TC6': { const du = cCTL - cTC - cLe - cChuan; return du > 0 ? du : 0; }
      case 'TC3': return (cTang + cCN) * cHS;
      case 'TC4': return cTang * cHS;
      default: return cTang * cHS;
    }
  }

  /** Công chuẩn theo cột "Cách tính" của mã lương (xem ghi chú trong TinhLuong.gs gốc). */
  function layCongChuan(nhanSu, thang, nam, dmLuong, congThucTe) {
    const info = dmLuong[nhanSu['Mã tiền lương 1']];
    const text = (info ? String(info['Cách tính'] || '') : '').toLowerCase();
    if (/thực tế/.test(text)) return congThucTe && congThucTe > 0 ? congThucTe : 26;
    const soNgay = new Date(Number(nam), thang, 0).getDate();
    if (/^\s*số ngày của tháng\s*$/.test(text)) return soNgay;
    let soCN = 0;
    for (let d = 1; d <= soNgay; d++) if (new Date(Number(nam), thang - 1, d).getDay() === 0) soCN++;
    let kq = soNgay - soCN;
    const m = text.match(/-\s*(\d+)\s*$/); if (m) kq -= parseInt(m[1], 10);
    return kq > 0 ? kq : 26;
  }

  /** Thuế TNCN luỹ tiến từng phần theo biểu bậc thang (đã sort tăng dần theo Min). */
  function tinhThueTNCNLuyTien(thuNhapTinhThue, bieuThue) {
    if (!thuNhapTinhThue || thuNhapTinhThue <= 0) return 0;
    let thue = 0;
    for (const bac of bieuThue || []) {
      const min = bac['Thu nhập tháng (Min)'] || 0, max = bac['Thu nhập tháng (Max)'], tyLe = soTuChuoiPhanTram(bac['Tỷ lệ đóng thuế']);
      if (thuNhapTinhThue <= min) continue;
      const tran = max === '' || max === null || max === undefined ? thuNhapTinhThue : Math.min(thuNhapTinhThue, max);
      if (tran - min > 0) thue += (tran - min) * tyLe;
    }
    return Math.round(thue);
  }

  /* ---------- Tổng hợp theo Mã NV ---------- */
  function tongHopNgayCom(list, nam, thang) { const m = {}; (list || []).forEach((r) => { if (!inMonth(r['Ngày'], nam, thang) || !r['Mã NV']) return; m[r['Mã NV']] = (m[r['Mã NV']] || 0) + num(r['Số suất cơm']); }); return m; }
  function tongHopSanLuong(list, nam, thang) { const m = {}; (list || []).forEach((r) => { if (!inMonth(r['Ngày cân'], nam, thang) || !r['Mã NV']) return; m[r['Mã NV']] = (m[r['Mã NV']] || 0) + num(r['KL hàng (Tấn)']); }); return m; }
  function tongHopSanLuongTheoNgay(list, nam, thang) { const m = {}; (list || []).forEach((r) => { if (!inMonth(r['Ngày cân'], nam, thang) || !r['Mã NV']) return; const t = pad2(dayOf(r['Ngày cân'])); (m[r['Mã NV']] = m[r['Mã NV']] || {})[t] = ((m[r['Mã NV']] || {})[t] || 0) + num(r['KL hàng (Tấn)']); }); return m; }
  function tongHopTheoMaNV(list, cotNgay, nam, thang, cacCot) {
    const m = {};
    (list || []).forEach((r) => {
      if (!inMonth(r[cotNgay], nam, thang)) return;
      const ma = r['Mã NV'] || r['Mã NV2']; if (!ma) return;
      if (!m[ma]) { m[ma] = {}; cacCot.forEach((c) => { m[ma][c] = 0; }); }
      cacCot.forEach((c) => { m[ma][c] += num(r[c]); });
    });
    return m;
  }

  /* ---------- BẢNG LƯƠNG ---------- */
  function tinhBangLuong(input) {
    const nam = Number(input.nam), thang = Number(input.thang), buTheoNgay = !!input.buTheoNgay, T = input.t || {};
    // Nhân sự có hiệu lực theo ngày như danh mục: mỗi mã NV lấy đúng 1 dòng của kỳ, giữ thứ tự nhập
    const nhanSuKy = locTheoHieuLuc(T.NL_NHANSU, 'Mã nhân viên', nam, thang), nhanSuList = (T.NL_NHANSU || []).filter((r) => nhanSuKy[r['Mã nhân viên']] === r);
    const chiTietNS = mapTheoMa(T.NL_CHITIET_NS, 'Mã nhân viên');
    const dmLuong = locTheoHieuLuc(T.DM_LUONG, 'Mã lương', nam, thang), dmPhuCap = locTheoHieuLuc(T.DM_PHUCAP, 'Mã phụ cấp', nam, thang),
      dmTangCa = locTheoHieuLuc(T.DM_TANGCA, 'Mã tăng ca', nam, thang), dmHoTro = locTheoHieuLuc(T.DM_HOTRO, 'Mã hỗ trợ', nam, thang),
      dmBaoHiem = locTheoHieuLuc(T.DM_BAOHIEM, 'Mã bảo hiểm', nam, thang), dmGiamTru = locTheoHieuLuc(T.DM_GT_TNCN, 'Mã giảm trừ', nam, thang),
      dmPhongBan = mapTheoMa(T.DM_PHONGBAN, 'Mã phòng ban'), dmChucVu = mapTheoMa(T.DM_CHUCVU, 'Mã chức vụ');
    const bieuThue = Object.values(locTheoHieuLuc(T.DM_TNCN, 'Bậc', nam, thang)).sort((a, b) => (a['Thu nhập tháng (Min)'] || 0) - (b['Thu nhập tháng (Min)'] || 0));
    const chamCongMap = tongHopChamCong(T.NL_CHAMCONG, nam, thang), sanLuongMap = tongHopSanLuong(T.DL_SANLUONG, nam, thang), banDamMap = tongHopSanLuong(T.DL_BANDAM, nam, thang);
    const congTheoNgayMap = buTheoNgay ? layCongChinhTheoNgay(T.NL_CHAMCONG, nam, thang) : null, slTheoNgayMap = buTheoNgay ? tongHopSanLuongTheoNgay(T.DL_SANLUONG, nam, thang) : null;
    const psMap = tongHopTheoMaNV(T.NL_PSLUONG, 'Ngày hạch toán', nam, thang, ['Thưởng', 'Thu nhập khác', 'Trừ khác']);
    const ungMap = tongHopTheoMaNV(T.NL_UNGLUONG, 'Ngày hạch toán', nam, thang, ['Tạm ứng']);
    const comMap = tongHopNgayCom(T.DL_TIENCOM, nam, thang);
    const tenPB = (ma) => (dmPhongBan[ma] ? dmPhongBan[ma]['Tên phòng ban'] : ma), tenCV = (ma) => (dmChucVu[ma] ? dmChucVu[ma]['Tên chức vụ'] : ma);
    const bangLuong = [], bhxh = [], tncn = []; let tongThucLinh = 0;
    const dauKy = nam + '-' + pad2(thang) + '-01', cuoiKy = nam + '-' + pad2(thang) + '-' + pad2(soNgayThang(nam, thang));

    nhanSuList.forEach((ns) => {
      const maNV = ns['Mã nhân viên']; if (!maNV) return;
      const nghi = isoOf(ns['Ngày nghỉ/thay đổi']); if (nghi && nghi < dauKy) return;
      const vao = isoOf(ns['Ngày vào làm']); if (vao && vao > cuoiKy) return;
      const cong = chamCongMap[maNV] || { tongCong: 0, congChuNhat: 0, congTangCa: 0, congCom: 0, congLe: 0, congPhep: 0, congDiChuyen: 0, congTrungChuyen: 0, nhanTheoNgay: {} };
      const congChuan = layCongChuan(ns, thang, nam, dmLuong, cong.tongCong), luongTT = num(ns['Lương thỏa thuận']);
      const dmL = dmLuong[ns['Mã tiền lương 1']] || dmLuong[ns['Mã tiền lương 2']] || null, maTL1 = ns['Mã tiền lương 1'] || '';
      const laSL = !!(dmL && /SP/i.test(dmL['Mã hình thức lương'] || ''));

      // Lương thời gian: CĐ = cố định; CN1/CN2/SP = đơn giá ngày × công; còn lại = (lương/công chuẩn) × công
      const donGiaLTG = congChuan > 0 ? luongTT / congChuan : 0, congTinhLTG = Math.min(cong.tongCong, congChuan) || cong.tongCong;
      let luongThoiGian = 0;
      if (maTL1 === 'CĐ') luongThoiGian = luongTT;
      else if (maTL1 === 'CN1' || maTL1 === 'CN2' || maTL1 === 'SP') luongThoiGian = Math.round(luongTT * congTinhLTG);
      else luongThoiGian = Math.round(donGiaLTG * congTinhLTG);
      const luongPhu = dmL ? num(dmL['Lương phụ']) : 0;

      // Lương sản lượng + bù
      const slTan = sanLuongMap[maNV] || 0, donGiaSL = dmL ? num(dmL['Số tiền khoán']) : 0;
      let luongSL = 0, luongBu = 0;
      if (laSL) {
        luongSL = Math.round(slTan * donGiaSL);
        const nguong = num(dmL['ĐK_Bù lương (công tối thiểu)']), donGiaBu = num(dmL['Đơn giá bù lương']);
        if (buTheoNgay) {
          if (nguong > 0 && donGiaBu > 0) {
            const cN = (congTheoNgayMap && congTheoNgayMap[maNV]) || {}, sN = (slTheoNgayMap && slTheoNgayMap[maNV]) || {};
            for (let ngay = 1; ngay <= 31; ngay++) {
              const t = pad2(ngay), c = cN[t] || 0; if (c <= 0) continue;
              const s = sN[t] || 0;
              if (s / c < nguong) { const bu = Math.round(donGiaBu * c) - Math.round(s * donGiaSL); if (bu > 0) luongBu += bu; }
            }
          }
        } else if (nguong > 0 && cong.tongCong > 0 && slTan / cong.tongCong < nguong) {
          luongBu = Math.max(0, Math.round(donGiaBu * cong.tongCong) - luongSL);
        }
      }
      // Bơm dăm
      const soXe = banDamMap[maNV] || 0, dmL2 = dmLuong[ns['Mã tiền lương 2']] || null, laL2SP = !!(dmL2 && /SP/i.test(dmL2['Mã hình thức lương'] || ''));
      const donGiaBD = laL2SP ? num(dmL2['Số tiền khoán']) : dmL ? num(dmL['Đơn giá bơm dăm']) : 0, luongBD = Math.round(soXe * donGiaBD);

      // Tăng ca
      const dmTC = dmTangCa[ns['Mã tăng ca']] || null; let tienTangCa = 0;
      if (congChuan > 0) {
        if (maTL1 === 'CN1' || maTL1 === 'CN2') tienTangCa = Math.round(luongTT * cong.congTangCa);
        else if (ns['Mã tăng ca'] === 'TC5' && dmTC) tienTangCa = Math.round((num(dmTC['Tiền tăng ca (nếu tính cố định)']) / congChuan) * cong.congTangCa);
        else if (dmTC) {
          const heSo = soTuChuoiPhanTram(dmTC['Hệ số tăng ca']);
          tienTangCa = Math.round(donGiaLTG * tinhHeSoTangCa(ns['Mã tăng ca'], cong.tongCong, cong.congTrungChuyen, cong.congLe, congChuan, cong.congChuNhat, cong.congTangCa, heSo, cong.congPhep, cong.congDiChuyen));
        }
      }
      // Phụ cấp (cố định hoặc theo tỷ lệ công)
      const pc = dmPhuCap[ns['Mã phụ cấp']]; let tienPC = 0;
      if (pc) {
        const soTien = num(pc['Số tiền']), coDinh = /cố định/i.test(String(pc['Cách tính'] || '')) || !pc['Cách tính'];
        if (coDinh) tienPC = soTien || Math.round(luongTT * soTuChuoiPhanTram(pc['Tỷ lệ']));
        else if (congChuan > 0) { const nguongDu = congChuan - num(pc['Tham chiếu']); tienPC = cong.tongCong >= nguongDu ? soTien : Math.round((soTien / congChuan) * cong.tongCong); }
      }
      // Lương hỗ trợ (Mã hỗ trợ 2) — bù khi thiếu công
      const ht2 = dmHoTro[ns['Mã hỗ trợ 2']]; let luongHoTro = 0;
      if (ht2 && congChuan > 0 && cong.tongCong - congChuan <= 0) luongHoTro = Math.round((congChuan - cong.tongCong) * num(ht2['Số tiền']));
      // Tiền cơm (Mã hỗ trợ × ngày cơm)
      const ht1 = dmHoTro[ns['Mã hỗ trợ']], ngayCom = (cong.congCom || 0) + (comMap[maNV] || 0), tienCom = ht1 ? Math.round(ngayCom * num(ht1['Số tiền'])) : 0;
      // Phụ cấp công tác theo NHÃN chấm công ("1QC" → mã phụ cấp QC)
      let tienPCCT = 0; const dem = {};
      Object.keys(cong.nhanTheoNgay || {}).forEach((t) => { const n = cong.nhanTheoNgay[t]; if (n) dem[n] = (dem[n] || 0) + 1; });
      Object.keys(dem).forEach((n) => { const p = dmPhuCap[n]; if (p) tienPCCT += dem[n] * num(p['Số tiền']); });

      const ps = psMap[maNV] || { 'Thưởng': 0, 'Thu nhập khác': 0, 'Trừ khác': 0 }, ung = ungMap[maNV] || { 'Tạm ứng': 0 };
      const tongThuNhap = luongThoiGian + luongPhu + luongSL + luongBu + luongBD + tienTangCa + tienPC + tienPCCT + luongHoTro + tienCom + num(ps['Thưởng']) + num(ps['Thu nhập khác']);

      // Bảo hiểm
      const bh = dmBaoHiem[ns['Mã BHXH']], luongDongBH = num(ns['Lương cơ bản']) || luongTT;
      let bhTru = 0, kpcdTru = 0, truyThu = 0;
      if (bh) {
        const tyLeNLD = num(bh['NLD.BHXH']) + num(bh['NLD.BHYT']) + num(bh['NLD.BHTN']);
        const nguongBH = dmL ? Number(dmL['Ngưỡng truy thu BH (công)']) : null, duNguong = !nguongBH || cong.tongCong >= nguongBH;
        const congTyDong = Math.round(luongDongBH * (num(bh['DN.BHXH']) + num(bh['DN.BHYT']) + num(bh['DN.BHTN']) + num(bh['DN.KPCD'])));
        if (duNguong) { bhTru = Math.round(luongDongBH * tyLeNLD); kpcdTru = Math.round(luongDongBH * num(bh['NLD.KPCD'])); } else truyThu = congTyDong;
        bhxh.push({ 'Mã NV': maNV, 'Họ và tên': ns['Họ và tên'], 'Phòng ban': tenPB(ns['Mã PB']), 'Lương đóng BHXH': luongDongBH,
          'CTY.BHXH': Math.round(luongDongBH * num(bh['DN.BHXH'])), 'CTY.BHYT': Math.round(luongDongBH * num(bh['DN.BHYT'])), 'CTY.BHTN': Math.round(luongDongBH * num(bh['DN.BHTN'])), 'CTY.KPCĐ': Math.round(luongDongBH * num(bh['DN.KPCD'])), 'Cộng BH công ty đóng': congTyDong,
          'NLĐ.BHXH': Math.round(luongDongBH * num(bh['NLD.BHXH'])), 'NLĐ.BHYT': Math.round(luongDongBH * num(bh['NLD.BHYT'])), 'NLĐ.BHTN': Math.round(luongDongBH * num(bh['NLD.BHTN'])), 'NLĐ.KPCĐ': kpcdTru, 'Cộng BH NLĐ đóng': bhTru,
          'Truy thu bảo hiểm': truyThu, 'Ghi chú ngưỡng công': duNguong ? 'Đủ ngưỡng' : 'Chưa đủ ngưỡng (' + cong.tongCong + '/' + nguongBH + ' công) — truy thu ' + truyThu.toLocaleString('vi-VN') + 'đ' });
      }
      // Thuế TNCN
      const ct = chiTietNS[maNV] || {}, maTNCN = ns['Mã TNCN'] || '', soNPT = num(ct['Người phụ thuộc']);
      const gtBT = dmGiamTru[ct['Mã GT_TNCN_BT']], gtPT = dmGiamTru[ct['Mã GT_TNCN_PT']];
      const giamTruBT = gtBT ? num(gtBT['Số tiền']) : 0, giamTruNPT = soNPT * (gtPT ? num(gtPT['Số tiền']) : 0);
      let chiuThue = 0, tinhThue = 0, thue = 0;
      if (maTNCN === 'TNCN1') { chiuThue = tongThuNhap; tinhThue = tongThuNhap; thue = Math.round(tongThuNhap * 0.1); }
      else if (maTNCN === 'TNCN0' || !maTNCN) { chiuThue = tongThuNhap - bhTru - kpcdTru; }
      else { chiuThue = tongThuNhap - bhTru - kpcdTru - tienCom; tinhThue = Math.max(0, chiuThue - giamTruBT - giamTruNPT); thue = tinhThueTNCNLuyTien(tinhThue, bieuThue); }
      if (thue > 0) tncn.push({ 'Mã NV': maNV, 'Họ và tên': ns['Họ và tên'], 'Thu nhập chịu thuế': chiuThue, 'Giảm trừ bản thân': maTNCN === 'TNCN1' ? 0 : giamTruBT, 'Số người phụ thuộc': soNPT, 'Giảm trừ người phụ thuộc': maTNCN === 'TNCN1' ? 0 : giamTruNPT, 'Thu nhập tính thuế': tinhThue, 'Thuế TNCN phải nộp': thue });

      // Thực lĩnh (làm tròn hàng nghìn, không âm); khấu trừ vượt thu nhập → ghi số còn thiếu để thu / chuyển kỳ sau
      const truKhac = num(ps['Trừ khác']), tamUng = num(ung['Tạm ứng']);
      const chenh = tongThuNhap - bhTru - kpcdTru - truyThu - thue - truKhac - tamUng, thucLinh = chenh >= 0 ? Math.round(chenh / 1000) * 1000 : 0, conThieu = chenh < 0 ? Math.round(-chenh) : 0;
      tongThucLinh += thucLinh;
      bangLuong.push({ 'Mã NV': maNV, 'Họ và tên': ns['Họ và tên'], 'Phòng ban': tenPB(ns['Mã PB']), 'Chức vụ': tenCV(ns['Mã CV']),
        'Lương thỏa thuận': luongTT, 'Công chuẩn': congChuan, 'Đơn giá lương TG': Math.round(donGiaLTG), 'Công tính LTG': congTinhLTG, 'Lương thời gian': luongThoiGian, 'Lương phụ': luongPhu,
        'Sản lượng (tấn)': slTan, 'Đơn giá SL': donGiaSL, 'Lương sản lượng': luongSL, 'Lương bù SL (nếu dưới ngưỡng)': luongBu, 'Phương pháp bù SL': laSL ? (buTheoNgay ? 'Theo ngày' : 'Theo tháng') : '',
        'Số xe bơm dăm': soXe, 'Lương bơm dăm': luongBD, 'Tổng công': cong.tongCong, 'Công Chủ nhật': cong.congChuNhat, 'Công tăng ca': cong.congTangCa, 'Tiền tăng ca': tienTangCa,
        'Phụ cấp': tienPC, 'Phụ cấp công tác': tienPCCT, 'Lương hỗ trợ': luongHoTro, 'Ngày cơm': ngayCom, 'Tiền cơm': tienCom, 'Thưởng': num(ps['Thưởng']), 'Thu nhập khác': num(ps['Thu nhập khác']),
        'Tổng thu nhập (trước trừ)': tongThuNhap, 'BHXH/BHYT/BHTN trừ NLĐ': bhTru, 'KPCĐ trừ NLĐ': kpcdTru, 'Truy thu bảo hiểm': truyThu, 'Thuế TNCN': thue, 'Trừ khác': truKhac, 'Tạm ứng': tamUng, 'Thực lĩnh': thucLinh, 'Còn thiếu (thực lĩnh âm)': conThieu });
    });
    return { bangLuong, bhxh, tncn, soNguoi: bangLuong.length, tongThucLinh };
  }

  HAK.Payroll = { tachSoCongVaNhan, soTuChuoiPhanTram, locTheoHieuLuc, tongHopChamCong, layCongChinhTheoNgay, tinhHeSoTangCa, layCongChuan, tinhThueTNCNLuyTien, tinhBangLuong, isoOf, inMonth };
  if (typeof module === 'object' && module.exports) module.exports = HAK.Payroll;
})(typeof window !== 'undefined' ? window : globalThis);
