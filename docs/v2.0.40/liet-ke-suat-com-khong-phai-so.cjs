"use strict";
// CHỈ ĐỌC (009-1, issue #98): liệt kê các dòng Suất cơm ĐÃ LƯU có "Số suất cơm" không phải số (ví dụ "hai") —
// engine đọc những ô này thành 0 suất. Không sửa, không ghi, không đụng kỳ đã chốt: chủ sở hữu tự đối chiếu rồi tự sửa trong app.
// Dùng: node docs/v2.0.40/liet-ke-suat-com-khong-phai-so.cjs <đường dẫn data.json | tệp sao lưu .json>   (thoát 0 = không có dòng nào; 1 = có dòng đáng ngờ; 2 = lỗi đọc)
const fs = require("node:fs"), path = require("node:path");
const V = require(path.join(__dirname, "../../LuongHAK_Offline/core/validate.js"));
const file = process.argv[2];
if (!file) { console.error("Thiếu đường dẫn data.json / tệp sao lưu .json"); process.exit(2); }
let db; try { db = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { console.error("Không đọc được " + file + ": " + e.message); process.exit(2); }
const closed = {}; (db.kyluong || []).forEach((k) => { if (k && k.ky) closed[k.ky] = true; });
const bad = [];
(db.tiencom || []).forEach((r, i) => {
  const v = r["Số suất cơm"], res = V.normCell("Số suất cơm", v == null ? "" : v);
  if (!res.error) return;
  const ky = V.rowPeriod("tiencom", r) || "(không rõ kỳ)";
  bad.push({ dong: i + 1, ky, ngay: r["Ngày"], maNV: r["Mã NV"], giaTri: v, kyDaChot: !!closed[ky] });
});
console.log("Tệp: " + file + " — " + (db.tiencom || []).length + " dòng Suất cơm; " + bad.length + " dòng có 'Số suất cơm' không phải số (engine tính 0 suất).");
bad.forEach((b) => console.log("  dòng " + b.dong + " · kỳ " + b.ky + (b.kyDaChot ? " [ĐÃ CHỐT — không tự sửa]" : "") + " · ngày " + b.ngay + " · NV " + b.maNV + " · giá trị " + JSON.stringify(b.giaTri)));
console.log("Chỉ đọc: script không thay đổi dữ liệu nào.");
process.exit(bad.length ? 1 : 0);
