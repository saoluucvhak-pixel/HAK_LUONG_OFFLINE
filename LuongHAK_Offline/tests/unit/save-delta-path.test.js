// Kiểm thử đường ghi Delta của save(table) & saveFlush() (Direction 1 - Delta Write Path)
// Tuân thủ thiết kế docs/WRITE_PATH_DELTA_DESIGN.md
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");

const src = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8");

function setupSaveEnv({ deltaResult = { ok: true, baseSig: "sqlite:2" }, saveNowResult = true, hakSave = "", legacyDb = false } = {}) {
  const events = [];
  let scheduledFn = null;
  const c = {
    db: legacyDb ? {
      auditlog: [{ action: "khoi-tao" }],
      nhanvien: [{ _id: "nv-01", "Mã NV": "0001", "Họ và tên": "Nguyễn Văn A" }],
      chamcong: [{ _id: "cc-01", "Mã NV": "0001", "Kỳ": "2026-11" }],
      congty: [{ ten: "Cty HAK" }],
      schemaVersion: 2
    } : {
      auditlog: [{ action: "khoi-tao" }],
      nhanvien: [{ _id: "nv-01", "Mã NV": "0001", "Họ và tên": "Nguyễn Văn A" }],
      chamcong: [{ _id: "cc-01", "Mã NV": "0001", "Kỳ": "2026-11" }],
      congty: [{ ten: "Cty HAK" }],
      _inputReviews: [],
      schemaVersion: 5
    },
    dirty: false,
    dirtyTables: null,
    inputReviewsSaved: !legacyDb,
    dbRev: 0,
    st: { kqStale: false },
    baseSig: "sqlite:1",
    lastTxnError: "",
    lastSaveError: "",
    readOnly: false,
    staleDeclined: false,
    closingNow: false,
    lastSaveStale: false,
    saveTimer: null,
    KEY: "test_key",
    clearTimeout: () => { scheduledFn = null; },
    setTimeout: (fn) => { scheduledFn = fn; return 1; },
    toast: (m) => events.push("toast:" + m),
    alert: (m) => events.push("alert:" + m),
    confirm: () => false,
    store: {
      save: (str, sig) => {
        events.push({ action: "store.save", sig });
        return saveNowResult;
      },
      saveDelta: (mutation, baseSig) => {
        events.push({ action: "saveDelta", mutation, baseSig });
        return typeof deltaResult === "function" ? deltaResult(mutation, baseSig) : deltaResult;
      },
      sig: () => "sqlite:2"
    },
    session: null,
    window: { HAK_SAVE: hakSave },
    fireTimer: () => { if (scheduledFn) { const fn = scheduledFn; scheduledFn = null; return fn(); } }
  };

  vm.createContext(c);

  const start = src.indexOf("  function isStale(");
  const end = src.indexOf("  function backupNow(", start);
  vm.runInContext(src.slice(start, end), c);

  return { c, events };
}

test("U-SAVE-DELTA-01: save(table) kích hoạt debounced saveFlush() chỉ gửi bảng thay đổi qua saveDelta", () => {
  const { c, events } = setupSaveEnv();

  c.db.nhanvien.push({ _id: "nv-02", "Mã NV": "0002", "Họ và tên": "Trần Thị B" });
  c.save("nhanvien");

  assert.equal(c.dirty, true);
  assert.equal(c.dbRev, 1);
  assert.equal(c.st.kqStale, true);

  // Kích hoạt timer debounced
  c.fireTimer();

  assert.equal(c.dirty, false);
  const deltaCalls = events.filter((e) => e.action === "saveDelta");
  assert.equal(deltaCalls.length, 1);
  assert.equal(events.some((e) => e.action === "store.save"), false, "Không được gọi store.save full");

  const call = deltaCalls[0];
  assert.equal(call.baseSig, "sqlite:1");
  assert.ok(call.mutation.tables);
  assert.deepEqual(Object.keys(call.mutation.tables).sort(), ["auditlog", "nhanvien"]);
  assert.equal(call.mutation.tables.nhanvien.length, 2);
  assert.equal(call.mutation.tables.congty, undefined, "Bảng congty không đổi không được gửi");
  assert.equal(call.mutation.tables.chamcong, undefined, "Bảng chamcong không đổi không được gửi");
});

test("U-SAVE-DELTA-02: Nhiều lần gọi save(table) gom cụm các bảng đổi vào 1 lượt saveDelta duy nhất", () => {
  const { c, events } = setupSaveEnv();

  c.db.nhanvien[0]["Họ và tên"] = "Tên Mới";
  c.save("nhanvien");

  c.db.chamcong[0]["Hình thức công"] = "CC";
  c.save("chamcong");

  assert.equal(c.dirty, true);
  assert.equal(c.dbRev, 2);

  // Chạy timer debounced gom cụm
  c.fireTimer();

  assert.equal(c.dirty, false);
  const deltaCalls = events.filter((e) => e.action === "saveDelta");
  assert.equal(deltaCalls.length, 1);
  assert.equal(events.some((e) => e.action === "store.save"), false);

  const call = deltaCalls[0];
  assert.deepEqual(Object.keys(call.mutation.tables).sort(), ["auditlog", "chamcong", "nhanvien"]);
});

test("U-SAVE-DELTA-03: save() không đối số chuyển sang saveNow() an toàn lưu toàn bộ tài liệu", () => {
  const { c, events } = setupSaveEnv();

  c.db.nhanvien.push({ _id: "nv-03", "Mã NV": "0003" });
  c.save("nhanvien");
  // Gọi save() không truyền bảng
  c.save();

  c.fireTimer();

  assert.equal(c.dirty, false);
  assert.equal(events.some((e) => e.action === "saveDelta"), false, "Không dùng saveDelta khi có lệnh save() toàn phần");
  assert.equal(events.filter((e) => e.action === "store.save").length, 1, "Phải gọi store.save full");
});

test("U-SAVE-DELTA-04: Cờ khẩn cấp window.HAK_SAVE = 'full' ép save(table) chuyển sang full save", () => {
  const { c, events } = setupSaveEnv({ hakSave: "full" });

  c.save("nhanvien");
  c.fireTimer();

  assert.equal(c.dirty, false);
  assert.equal(events.some((e) => e.action === "saveDelta"), false);
  assert.equal(events.filter((e) => e.action === "store.save").length, 1);
});

test("U-SAVE-DELTA-05: saveDelta thất bại không do stale tự động fallback sang saveNow()", () => {
  const { c, events } = setupSaveEnv({
    deltaResult: { ok: false, error: "Lỗi delta tạm thời" }
  });

  c.save("nhanvien");
  c.fireTimer();

  assert.equal(events.some((e) => e.action === "saveDelta"), true);
  assert.equal(events.some((e) => e.action === "store.save"), true, "Phải fallback sang store.save khi delta lỗi");
  assert.equal(c.dirty, false);
});
