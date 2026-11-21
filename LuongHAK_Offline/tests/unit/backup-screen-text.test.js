// P2.11 — T-28: Sửa các chữ lỗi thời / sai ở màn Sao lưu (25-khoi-phuc-kiem-tra.js, 24-trang-chu-sao-luu.js, screens/tabSaoLuu.js).
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "../..");
const f24 = fs.readFileSync(path.join(ROOT, "app-src/24-trang-chu-sao-luu.js"), "utf8");
const f25 = fs.readFileSync(path.join(ROOT, "app-src/25-khoi-phuc-kiem-tra.js"), "utf8");
const fTab = fs.readFileSync(path.join(ROOT, "app-src/screens/tabSaoLuu.js"), "utf8");

function loadFormatStorageMoveMsg() {
  const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  const i = app.indexOf("// STG-MSG-BEGIN");
  const j = app.indexOf("// STG-MSG-END");
  if (i < 0 || j < i) return null;
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(app.slice(i, j) + "\nthis.f = formatStorageMoveMsg;", ctx);
  return ctx.f;
}

test("T-28.1: không còn chuỗi 'chưa có (làm ở bước 012-B)' / 'chưa có (012-B)' ở màn Sao lưu", () => {
  for (const [name, src] of [["24-trang-chu-sao-luu.js", f24], ["25-khoi-phuc-kiem-tra.js", f25], ["screens/tabSaoLuu.js", fTab]]) {
    assert.ok(!/chưa có\s*\([^)]*012-B/i.test(src), name + " vẫn còn chuỗi 'chưa có (...012-B)'");
  }
});

test("T-28.2: hint khôi phục không còn bảo bấm Khôi phục ở dòng .sqlite, nói đúng cơ chế tự hiện khi data.sqlite hỏng", () => {
  assert.ok(!/bản SQLite hoặc JSON.*bấm.*Khôi phục/.test(f25), "vẫn hướng dẫn bấm Khôi phục cho bản SQLite");
  assert.match(f25, /màn hình khôi phục tự hiện/);
});

test("T-28.3: hint thư mục lưu trữ dùng đúng nhãn nút 'Chọn / Chuyển…' thay vì 'Đổi…'", () => {
  assert.ok(!/Bấm \\?"Đổi…"/.test(f25), "vẫn dùng chữ 'Đổi…' lỗi thời");
  assert.match(f25, /Bấm \\?"Chọn \/ Chuyển…\\?"/);
});

test("T-28.4: nêu rõ data.sqlite là nơi lưu chính, data.json chỉ là bản xuất", () => {
  assert.ok(!/Dữ liệu tự lưu tại:/.test(fTab), "vẫn dùng chữ 'Dữ liệu tự lưu tại:' gây hiểu nhầm data.json là nơi lưu chính");
  assert.match(fTab, /data\.sqlite/);
  assert.match(fTab, /nơi lưu chính/i);
  assert.match(fTab, /data\.json/);
  assert.match(fTab, /chỉ là bản xuất/i);
});

test("T-28.5: thông báo chuyển thư mục khi đường dẫn cũ rỗng (0 file) hiển thị thay thế rõ ràng", () => {
  const fn = loadFormatStorageMoveMsg();
  assert.ok(fn, "thiếu helper formatStorageMoveMsg (STG-MSG-BEGIN/END) trong app.js");
  const emptyRes = fn({
    ok: true,
    files: 0,
    from: "",
    to: "D:\\Backup\\Mirror",
    note: "Dữ liệu cũ vẫn còn nguyên ở  (app không tự xóa) — có thể xóa tay sau khi đã kiểm tra thư mục mới."
  });
  assert.equal(emptyRes.bad, false);
  assert.ok(!/còn nguyên ở\s+\(app không tự xóa\)/.test(emptyRes.text), "vẫn hiển thị chuỗi lỗi đường dẫn rỗng");
  assert.ok(!/Đã chuyển 0 file/.test(emptyRes.text), "vẫn hiển thị 'Đã chuyển 0 file' khi chưa có thư mục cũ");
  assert.match(emptyRes.text, /D:\\Backup\\Mirror/);

  const normalRes = fn({
    ok: true,
    files: 5,
    from: "C:\\Old",
    to: "D:\\New",
    note: "Dữ liệu cũ vẫn còn nguyên ở C:\\Old (app không tự xóa) — có thể xóa tay sau khi đã kiểm tra thư mục mới."
  });
  assert.equal(normalRes.bad, false);
  assert.match(normalRes.text, /Đã chuyển 5 file sang D:\\New/);
  assert.match(normalRes.text, /C:\\Old/);
});

test("T-28.6: làm rõ 'giữ N bản đầu ngày' thay cho 'giữ N ngày'", () => {
  assert.ok(!/dLab = function \(v\) \{ return v \+ " ngày"; \}/.test(f25), "dLab vẫn hiển thị 'N ngày'");
  assert.match(f25, /dLab = function \(v\) \{ return v \+ " bản đầu ngày"; \}/);
  assert.ok(!/giữ " \+ \w+ \+ " ngày theo Lịch/.test(fTab), "tabSaoLuu vẫn hiển thị 'giữ N ngày'");
  assert.match(fTab, /bản đầu ngày/);
});
