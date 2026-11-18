// Chạy thao tác kho năm (tiến trình phụ đọc/ghi data.json bằng kho JSON) AN TOÀN trên kho SQLite chính.
//  - Chỉ chạy khi data.json đã được xuất ĐÚNG revision hiện tại của SQLite; không thì từ chối (không dùng JSON cũ làm đầu vào).
//  - preview/table chỉ đọc: KHÔNG nhận lại dữ liệu; nếu data.json bị đổi thì xuất lại từ SQLite.
//  - archive/restore: ghi marker thao tác (revision + SHA-256 đầu vào) → chạy → chỉ nhận kết quả khi worker báo ok VÀ SQLite chưa đổi; lỗi ở bất kỳ bước nào
//    đều trả JSON về đúng trạng thái SQLite và báo thất bại thật. Gián đoạn giữa chừng được phục hồi theo marker khi mở lại (sqlite-storage.js), không theo ngày giờ file.
//  - Kho JSON (HAK_STORAGE=json) chạy như trước.
"use strict";
const WRITE = new Set(["archive", "restore"]);

function createYearJob({ storage, runWorker }) {
  return async function run(method, args) {
    if (typeof storage.snapshotExported !== "function") return runWorker(method, args); // kho JSON
    const snap = storage.snapshotExported();
    if (!snap) return { ok: false, error: "Chưa chụp được dữ liệu nhất quán từ SQLite (không xuất được data.json). Thao tác kho năm KHÔNG chạy; dữ liệu giữ nguyên. Kiểm tra quyền ghi/ổ đĩa rồi thử lại." };
    const write = WRITE.has(method);
    if (write && !storage.beginExternalOp({ method, baseSha: snap.sha, rev: snap.rev })) return { ok: false, error: "Không ghi được dấu thao tác kho năm vào SQLite; thao tác không chạy." };
    let res;
    try { res = await runWorker(method, args); } catch (e) { res = { ok: false, error: String(e && e.message || e) }; }
    if (!write) { // chỉ đọc: không bao giờ nhận lại dữ liệu
      if (!storage.restoreJsonIfChanged || storage.restoreJsonIfChanged(snap.sha) === false) { /* data.json vẫn là bản xuất đúng */ }
      return res;
    }
    if (!res || !res.ok) { storage.restoreJsonFromSqlite(); storage.endExternalOp(); return res && res.ok === false ? res : { ok: false, error: "Thao tác kho năm không trả kết quả hợp lệ; dữ liệu SQLite giữ nguyên." }; }
    if (!storage.adoptJson({ expectRev: snap.rev })) {
      storage.restoreJsonFromSqlite(); storage.endExternalOp();
      return { ok: false, error: "Worker kho năm báo xong nhưng kết quả KHÔNG được nhận vào SQLite (dữ liệu đã đổi trong lúc chạy hoặc kết quả không hợp lệ). Dữ liệu SQLite giữ nguyên; kiểm tra thư mục kho năm trước khi thử lại." };
    }
    storage.endExternalOp();
    return res;
  };
}
module.exports = { createYearJob, WRITE };
