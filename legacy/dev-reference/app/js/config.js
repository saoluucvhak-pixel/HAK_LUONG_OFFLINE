/** config.js — HAK.Config: danh sách ĐƠN VỊ (công ty / chi nhánh) dùng cho đăng nhập và tách dữ liệu lương. Sửa được ở Cài đặt → Đơn vị. */
(function (root) {
  'use strict';
  const HAK = (root.HAK = root.HAK || {});
  const KEY = 'hak.config.v1';
  const DEFAULT_COMPANIES = [
    { id: 'hak', kind: 'Công ty', name: 'Công ty TNHH Hoàng Anh Khôi', short: 'HAK', tax: '0401447476', address: 'Xã Bà Nà, TP. Đà Nẵng' },
    { id: 'dh', kind: 'Công ty', name: 'Công ty TNHH SX-TM-DV Đại Hiệp', short: 'Đại Hiệp', tax: '4000858740', address: 'Xã Đại Lộc, TP. Đà Nẵng' },
    { id: 'qn', kind: 'Công ty', name: 'Công ty TNHH Hoàng Anh Khôi Quảng Nam', short: 'HAKQN', tax: '4000956057', address: 'Cụm Công nghiệp Quế Cường, TP. Đà Nẵng' },
    { id: 'cn', kind: 'Chi nhánh', name: 'Chi Nhánh Công ty TNHH Hoàng Anh Khôi', short: 'CN Quế Sơn', tax: '0401447476-001', address: 'Cụm Công nghiệp Đông Phú, TP. Đà Nẵng' }
  ];
  const saved = HAK.Store && HAK.Store.get(KEY, null);
  const data = { companies: saved && Array.isArray(saved.companies) && saved.companies.length ? saved.companies : JSON.parse(JSON.stringify(DEFAULT_COMPANIES)) };
  HAK.Config = { data, save() { HAK.Store.set(KEY, { companies: data.companies }); }, DEFAULT_COMPANIES };
})(typeof window !== 'undefined' ? window : globalThis);
