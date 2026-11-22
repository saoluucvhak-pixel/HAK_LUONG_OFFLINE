// Kiểm thử Delta Write Path & cơ chế baseSig (Prompt 1 - V11 Performance Engine)
// Tuân thủ thiết kế docs/WRITE_PATH_DELTA_DESIGN.md
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { createSqliteStorage } = require("../../main/sqlite-storage.js");
const { createRepo } = require("../../core/repository.js");
const { fixture } = require("../fixtures/production-carry");

const tmpdir = () => fs.mkdtempSync(path.join(os.tmpdir(), "hak-delta-test-"));

function baseSample() {
  const d = fixture();
  d.benefitStandards = [
    { id: "std-1", code: "AN_TRUA", name: "Ăn trưa", amount: 35000, active: 1 }
  ];
  return d;
}

test("U-DELTA-01: store-load phát sinh baseSig; saveDelta kiểm soát phiên bản nền chống ghi đè", () => {
  const dir = tmpdir();
  const storage = createSqliteStorage(dir, { exportSync: true });
  const sample = baseSample();

  // Khởi tạo lưu lần đầu
  assert.equal(storage.save(JSON.stringify(sample)), true);
  const initialSig = storage.sig();
  assert.match(initialSig, /^sqlite:\d+$/);

  // Load phát sinh baseSig
  const loaded = storage.load();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.baseSig, initialSig);
  assert.equal(loaded.rev, 1);

  // Ghi delta với baseSig đúng -> Thành công, baseSig tăng
  const deltaPayload = {
    table: "benefitStandards",
    action: "saveRows",
    delta: [
      { id: "std-1", code: "AN_TRUA", name: "Ăn trưa", amount: 40000, active: 1 },
      { id: "std-2", code: "XANG_XE", name: "Xăng xe", amount: 500000, active: 1 }
    ],
    baseSig: loaded.baseSig
  };
  const res1 = storage.saveDelta(deltaPayload);
  assert.equal(res1.ok, true);
  assert.equal(res1.rev, 2);
  assert.equal(res1.baseSig, "sqlite:2");
  assert.equal(storage.sig(), "sqlite:2");

  // Ghi delta với baseSig cũ (stale baseSig) -> Bị từ chối có cấu trúc rõ ràng
  const stalePayload = {
    table: "benefitStandards",
    action: "saveRows",
    delta: [{ id: "std-1", code: "AN_TRUA", name: "Ghi đè sai", amount: 0, active: 0 }],
    baseSig: loaded.baseSig // vẫn là sqlite:1
  };
  const resStale = storage.saveDelta(stalePayload);
  assert.equal(resStale.ok, false);
  assert.equal(resStale.conflict, true);
  assert.equal(resStale.code, "STALE_BASE");
  assert.match(resStale.error, /STALE_BASE/);

  // Dữ liệu trên đĩa không bị thay đổi bởi lệnh ghi stale
  const reloaded = storage.load();
  const currentDoc = JSON.parse(reloaded.text);
  assert.equal(currentDoc.benefitStandards.length, 2);
  assert.equal(currentDoc.benefitStandards[0].amount, 40000);

  storage.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("U-DELTA-02: Mutation Payload hỗ trợ các thao tác insert / update / delete / batch", () => {
  const dir = tmpdir();
  const storage = createSqliteStorage(dir, { exportSync: true });
  const sample = baseSample();
  storage.save(JSON.stringify(sample));

  // 1. Insert row
  const newStaff = { _id: "nv-new-99", "Mã NV": "0099", "Họ và tên": "Nhân viên Mới", "Trạng thái": "Đang làm việc" };
  const resIns = storage.saveDelta({
    table: "nhanvien",
    action: "insert",
    delta: newStaff,
    baseSig: storage.sig()
  });
  assert.equal(resIns.ok, true);

  let doc = JSON.parse(storage.load().text);
  const foundIns = doc.nhanvien.find((r) => r["Mã NV"] === "0099");
  assert.ok(foundIns);
  assert.equal(foundIns["Họ và tên"], "Nhân viên Mới");

  // 2. Update row
  const resUpd = storage.saveDelta({
    table: "nhanvien",
    action: "update",
    keys: { "Mã NV": "0099" },
    delta: { "Họ và tên": "Nhân viên Đã Đổi Tên", "Ghi chú": "Cập nhật delta" },
    baseSig: storage.sig()
  });
  assert.equal(resUpd.ok, true);

  doc = JSON.parse(storage.load().text);
  const foundUpd = doc.nhanvien.find((r) => r["Mã NV"] === "0099");
  assert.equal(foundUpd["Họ và tên"], "Nhân viên Đã Đổi Tên");
  assert.equal(foundUpd["Ghi chú"], "Cập nhật delta");

  // 3. Delete row
  const resDel = storage.saveDelta({
    table: "nhanvien",
    action: "delete",
    keys: { "Mã NV": "0099" },
    baseSig: storage.sig()
  });
  assert.equal(resDel.ok, true);

  doc = JSON.parse(storage.load().text);
  assert.equal(doc.nhanvien.some((r) => r["Mã NV"] === "0099"), false);

  // 4. Batch mutations (nhiều thao tác trong 1 payload)
  const resBatch = storage.saveDelta({
    mutations: [
      { table: "dm_phucap", action: "insert", delta: { "Mã phụ cấp": "PC_TEST", "Tên phụ cấp": "Kiểm thử delta" } },
      { table: "dm_chucvu", action: "insert", delta: { "Mã chức vụ": "CV_TEST", "Tên chức vụ": "Chức vụ delta" } }
    ],
    baseSig: storage.sig()
  });
  assert.equal(resBatch.ok, true);

  doc = JSON.parse(storage.load().text);
  assert.ok(doc.dm_phucap.some((r) => r["Mã phụ cấp"] === "PC_TEST"));
  assert.ok(doc.dm_chucvu.some((r) => r["Mã chức vụ"] === "CV_TEST"));

  storage.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("U-DELTA-03: Repository phát sinh Mutation Payload và phối hợp với saveDelta", () => {
  const d = baseSample();
  let dispatchedMutation = null;
  let simulatedStorageSig = "sqlite:10";

  const repo = createRepo({
    db: () => d,
    can: () => true,
    audit: (action, detail) => { d.auditlog = d.auditlog || []; d.auditlog.push({ action, detail }); },
    uid: () => "id-test-" + Date.now(),
    baseSig: () => simulatedStorageSig,
    saveDelta: (mutation) => {
      dispatchedMutation = mutation;
      if (mutation.baseSig !== simulatedStorageSig) {
        return { ok: false, conflict: true, code: "STALE_BASE", error: "STALE_BASE" };
      }
      simulatedStorageSig = "sqlite:" + (Number(simulatedStorageSig.slice(7)) + 1);
      return { ok: true, baseSig: simulatedStorageSig };
    }
  });

  // 1. saveWorkflowRows phát sinh delta saveRows
  const nextBenefitRows = [
    { id: "std-1", code: "AN_TRUA", name: "Ăn trưa", amount: 45000, active: 1 }
  ];
  const r1 = repo.saveWorkflowRows("benefitStandards", nextBenefitRows, "Sửa định mức", "Cập nhật ăn trưa");
  assert.equal(r1.ok, true);
  assert.deepEqual(dispatchedMutation, {
    table: "benefitStandards",
    action: "saveRows",
    keys: null,
    delta: nextBenefitRows,
    baseSig: "sqlite:10"
  });
  assert.deepEqual(d.benefitStandards, nextBenefitRows);

  // 2. insert phát sinh delta insert
  const insertStaff = { "Mã NV": "0088", "Họ và tên": "Nguyễn Văn Tám", "Trạng thái": "Đang làm việc" };
  const r2 = repo.insert("nhanvien", insertStaff);
  assert.equal(r2.ok, true);
  assert.equal(dispatchedMutation.table, "nhanvien");
  assert.equal(dispatchedMutation.action, "insert");
  assert.equal(dispatchedMutation.delta["Mã NV"], "0088");
  assert.ok(d.nhanvien.some((x) => x["Mã NV"] === "0088"));

  // 3. update phát sinh delta update
  const targetStaff = d.nhanvien.find((x) => x["Mã NV"] === "0088");
  const r3 = repo.update("nhanvien", targetStaff, { "Ghi chú": "Cập nhật repo delta" });
  assert.equal(r3.ok, true);
  assert.equal(dispatchedMutation.table, "nhanvien");
  assert.equal(dispatchedMutation.action, "update");
  assert.equal(dispatchedMutation.delta["Ghi chú"], "Cập nhật repo delta");
  assert.equal(targetStaff["Ghi chú"], "Cập nhật repo delta");

  // 4. deleteRow phát sinh delta delete
  const r4 = repo.delete("nhanvien", targetStaff);
  assert.equal(r4.ok, true);
  assert.equal(dispatchedMutation.table, "nhanvien");
  assert.equal(dispatchedMutation.action, "delete");
  assert.equal(d.nhanvien.some((x) => x["Mã NV"] === "0088"), false);

  // 5. Thử phát sinh khi baseSig lệch (server đã lên sqlite:100, nhưng client vẫn giữ sqlite:13) -> Repo báo lỗi
  let clientSig = "sqlite:13";
  let serverSig = "sqlite:100";
  const repoStale = createRepo({
    db: () => d,
    can: () => true,
    audit: () => {},
    uid: () => "id-x",
    baseSig: () => clientSig,
    saveDelta: (m) => {
      if (m.baseSig !== serverSig) {
        return { ok: false, conflict: true, code: "STALE_BASE", error: "STALE_BASE: Bản nền đã cũ" };
      }
      return { ok: true };
    }
  });
  const rStale = repoStale.saveWorkflowRows("benefitStandards", [], "Xóa", "Xóa sạch");
  assert.equal(rStale.ok, false);
  assert.equal(rStale.code, "STALE_BASE");
});

test("U-DELTA-04: Hiệu năng Delta Write Path ở 5.000 nhân viên (p50 < 150 ms)", () => {
  const dir = tmpdir();
  const storage = createSqliteStorage(dir, { exportDelayMs: 5000 }); // debounce export

  // Dựng dữ liệu 5.000 nhân viên
  const largeDoc = baseSample();
  const count = 5000;
  largeDoc.nhanvien = [];
  largeDoc.chamcong = [];

  for (let i = 1; i <= count; i++) {
    const ma = String(i).padStart(4, "0");
    largeDoc.nhanvien.push({
      _id: "nv-" + ma,
      "Mã NV": ma,
      "Họ và tên": "Nhân viên số " + ma,
      "Phòng ban": "Xưởng " + ((i % 10) + 1),
      "Chức vụ": "Công nhân",
      "Trạng thái": "Đang làm việc",
      "Lương cơ bản": 7000000 + (i % 20) * 100000
    });
    largeDoc.chamcong.push({
      _id: "cc-" + ma,
      "Kỳ": "2026-11",
      "Mã NV": ma,
      "Hình thức công": "BT",
      "01": "1", "02": "1", "03": "1", "04": "1", "05": "1"
    });
  }

  // Lưu ban đầu (full write)
  const t0 = Date.now();
  assert.equal(storage.save(JSON.stringify(largeDoc)), true);
  const initialDuration = Date.now() - t0;
  console.log(`\n  [Benchmark 5.000 NV] Full save lần đầu: ${initialDuration} ms`);

  // Đo 15 lần ghi delta (sửa 1 dòng / 1 bảng nhỏ)
  const times = [];
  for (let round = 1; round <= 15; round++) {
    const start = performance.now();
    const res = storage.saveDelta({
      table: "benefitStandards",
      action: "saveRows",
      delta: [
        { id: "std-1", code: "AN_TRUA", name: "Ăn trưa", amount: 35000 + round * 1000, active: 1 }
      ],
      baseSig: storage.sig()
    });
    const elapsed = performance.now() - start;
    assert.equal(res.ok, true);
    times.push(elapsed);
  }

  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length / 2)];
  const p95 = times[Math.floor(times.length * 0.95)];

  console.log(`  [Benchmark 5.000 NV] Delta write p50: ${p50.toFixed(2)} ms (Mục tiêu: < 150 ms)`);
  console.log(`  [Benchmark 5.000 NV] Delta write p95: ${p95.toFixed(2)} ms`);
  console.log(`  [Benchmark 5.000 NV] Các lần ghi: ${times.map((x) => x.toFixed(1) + "ms").join(", ")}`);

  assert.ok(p50 < 150, `Thời gian ghi p50 (${p50.toFixed(2)} ms) phải nhỏ hơn 150 ms`);

  storage.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
