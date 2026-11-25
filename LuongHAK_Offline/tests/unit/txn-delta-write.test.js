// Kiểm thử tích hợp txn() với Delta Write Path (PROMPT V11 / WRITE_PATH_DELTA_DESIGN.md)
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");

const src = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8");

function setupTxnEnv({ deltaResult = { ok: true, baseSig: "sqlite:2" }, saveNowResult = true, hakSave = "" } = {}) {
  const events = [];
  const c = {
    db: {
      auditlog: [],
      nhanvien: [{ _id: "nv-01", "Mã NV": "0001", "Họ và tên": "Nguyễn Văn A" }],
      congty: [{ ten: "Cty HAK" }]
    },
    dirty: false,
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
    clearTimeout: () => {},
    setTimeout: () => 1,
    toast: (m) => events.push("toast:" + m),
    alert: (m) => events.push("alert:" + m),
    confirm: () => false,
    store: {
      save: (str, sig) => {
        events.push("store.save");
        return saveNowResult;
      },
      saveDelta: (mutation, baseSig) => {
        events.push({ action: "saveDelta", mutation, baseSig });
        return typeof deltaResult === "function" ? deltaResult(mutation, baseSig) : deltaResult;
      },
      sig: () => "sqlite:2"
    },
    session: null,
    window: { HAK_SAVE: hakSave }
  };

  vm.createContext(c);

  // Trích xuất từ isStale đến hết txn()
  const start = src.indexOf("  function isStale(");
  const end = src.indexOf("  function save()", start);
  vm.runInContext(src.slice(start, end), c);

  return { c, events };
}

test("U-TXN-DELTA-01: txn() tự động phát sinh delta payload chứa chỉ các bảng thay đổi và auditlog", () => {
  const { c, events } = setupTxnEnv();

  const ok = c.txn(["nhanvien"], () => {
    c.db.nhanvien.push({ _id: "nv-02", "Mã NV": "0002", "Họ và tên": "Trần Thị B" });
    c.db.auditlog.push({ action: "them-nv", ma: "0002" });
  });

  assert.equal(ok, true);
  assert.equal(c.dirty, false);
  assert.equal(c.dbRev, 1);
  assert.equal(c.st.kqStale, true);

  // Kiểm tra sự kiện: chỉ gọi saveDelta, KHÔNG gọi store.save (full save)
  const deltaCalls = events.filter((e) => e.action === "saveDelta");
  assert.equal(deltaCalls.length, 1);
  assert.equal(events.includes("store.save"), false);

  const call = deltaCalls[0];
  assert.equal(call.baseSig, "sqlite:1");
  assert.ok(call.mutation.tables);
  assert.deepEqual(Object.keys(call.mutation.tables).sort(), ["auditlog", "nhanvien"]);
  assert.equal(call.mutation.tables.nhanvien.length, 2);
  assert.equal(call.mutation.tables.auditlog.length, 1);
  assert.equal(call.mutation.tables.congty, undefined, "Bảng congty không đổi không được gửi");
});

test("U-TXN-DELTA-02: txn() hoàn tác bộ nhớ khi saveDelta báo STALE_BASE", () => {
  const { c } = setupTxnEnv({
    deltaResult: { ok: false, conflict: true, code: "STALE_BASE", error: "STALE_BASE: Bản nền đã cũ" }
  });

  const ok = c.txn(["nhanvien"], () => {
    c.db.nhanvien.push({ _id: "nv-99", "Mã NV": "0099" });
  });

  assert.equal(ok, false);
  assert.equal(c.db.nhanvien.length, 1, "Dữ liệu nhanvien phải được hoàn tác");
  assert.equal(c.db.nhanvien[0]["Mã NV"], "0001");
  assert.equal(c.lastSaveStale, true);
  assert.match(c.lastTxnError, /STALE_BASE/);
});

test("U-TXN-DELTA-03: Cờ khẩn cấp window.HAK_SAVE = 'full' ép txn() chuyển sang saveNow()", () => {
  const { c, events } = setupTxnEnv({ hakSave: "full" });

  const ok = c.txn(["nhanvien"], () => {
    c.db.nhanvien.push({ _id: "nv-03", "Mã NV": "0003" });
  });

  assert.equal(ok, true);
  assert.ok(events.includes("store.save"), "Phải gọi store.save (full)");
  assert.equal(events.some((e) => e.action === "saveDelta"), false, "Không được gọi saveDelta khi có cờ full");
});

test("U-TXN-DELTA-04: Khi có thay đổi dở dang (dirty === true), txn() an toàn chuyển sang saveNow() để không sót bảng khác", () => {
  const { c, events } = setupTxnEnv();
  c.dirty = true;

  const ok = c.txn(["nhanvien"], () => {
    c.db.nhanvien.push({ _id: "nv-04", "Mã NV": "0004" });
  });

  assert.equal(ok, true);
  assert.ok(events.includes("store.save"), "Phải gọi store.save (full) để lưu trọn vẹn dữ liệu");
  assert.equal(events.some((e) => e.action === "saveDelta"), false, "Không dùng saveDelta khi dirty đang bật");
});
