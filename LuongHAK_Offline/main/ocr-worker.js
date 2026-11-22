// ===== MAIN / OCR-WORKER (V11.4, v2.0.99) — bể luồng phụ (worker_threads) chạy OCR song song, tiến trình chính không bị chiếm =====
// Trước đây mỗi ô OCR chạy tuần tự trong tiến trình chính: mã hóa PNG, CNN chữ số viết tay, ghép kết quả đều chiếm vòng lặp sự kiện của
// cửa sổ chính, và chỉ 1 ô được đọc tại một thời điểm. Nay mỗi luồng phụ chứa MỘT bản nguyên vẹn của dịch vụ OCR dùng chung
// (main/ocr-service.js, bị khóa băm — KHÔNG sửa, KHÔNG đổi ocr/lang, ocr/models) với các worker Tesseract riêng; bể chia ô cho các luồng,
// trả kết quả ĐÚNG THỨ TỰ như lô gửi vào. Giao diện (interface) giống createOcrService: batch(items) / selfTest() / terminate().
// "Ý kiến thứ hai" (Umi-OCR) và bộ nhớ đệm của nó vẫn ở tiến trình chính: luồng phụ gọi qua tin nhắn (không nhân đôi trạng thái).
// Không khởi động được luồng (VD môi trường đóng gói không nạp được script) → tự chạy trực tiếp trong tiến trình hiện tại như bản cũ.
"use strict";
/* global setTimeout, clearTimeout */
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const os = require("os");

// ---------- Phần chạy BÊN TRONG luồng phụ ----------
function buildService(wd, secondOpinion) {
  if (wd.serviceModule) return require(wd.serviceModule).create({ appDir: wd.appDir, secondOpinion }); // chỉ để kiểm thử (dịch vụ giả)
  const { createOcrService } = require("./ocr-service.js");
  return createOcrService({ appDir: wd.appDir, secondOpinion, tesseract: require("../ocr/tesseract-compat.js")(require("tesseract.js")) });
}

if (!isMainThread && workerData && workerData.__ocrWorker) {
  const wd = workerData, waiting = new Map();
  let rid = 0;
  const proxy = wd.hasSecondOpinion ? { read(png) { return new Promise((resolve) => { const id = ++rid; waiting.set(id, resolve); parentPort.postMessage({ type: "umi", rid: id, png: Uint8Array.from(png) }); }); } } : null;
  let svc = null;
  const get = () => svc || (svc = buildService(wd, proxy));
  parentPort.on("message", (m) => {
    if (m.type === "umi-result") { const f = waiting.get(m.rid); if (f) { waiting.delete(m.rid); f(m.result); } return; }
    if (m.type === "run") {
      Promise.resolve().then(() => get().batch([m.item])).then((r) => parentPort.postMessage({ type: "result", id: m.id, result: r[0] }),
        (e) => parentPort.postMessage({ type: "error", id: m.id, error: String((e && e.message) || e) }));
    } else if (m.type === "selftest") {
      Promise.resolve().then(() => get().selfTest()).then((r) => parentPort.postMessage({ type: "result", id: m.id, result: r }),
        (e) => parentPort.postMessage({ type: "error", id: m.id, error: String((e && e.message) || e) }));
    } else if (m.type === "terminate") {
      Promise.resolve().then(() => svc && svc.terminate()).catch(() => {}).then(() => { parentPort.postMessage({ type: "bye" }); process.exit(0); });
    }
  });
  parentPort.postMessage({ type: "ready" });
}

// ---------- Phần ở tiến trình chính: bể luồng ----------
/** Số luồng mặc định: HAK_OCR_THREADS (1–8) hoặc min(số nhân − 1, 3), tối thiểu 1. */
function defaultSize() {
  const e = +process.env.HAK_OCR_THREADS;
  if (e >= 1 && e <= 8) return Math.floor(e);
  return Math.max(1, Math.min(3, os.cpus().length - 1));
}

/**
 * opts: { appDir, secondOpinion (đối tượng có read(png) — ở tiến trình chính), size?, serviceModule? (kiểm thử), workerFile? (kiểm thử) }
 * Trả { batch(items, { onProgress(done,total), shouldCancel() }) → Promise<kết quả đúng thứ tự>, selfTest(), terminate(), stats() }
 */
function createOcrPool(opts) {
  opts = opts || {};
  const size = Math.max(1, opts.size || defaultSize());
  const file = opts.workerFile || __filename;
  const slots = [], queue = [], inflight = new Map();
  let nextId = 0, broken = false, direct = null, directQueue = Promise.resolve(), terminated = false;
  const stat = { done: 0, failed: 0, retried: 0, spawned: 0, peakBusy: 0 };

  function directService() {
    if (direct) return direct;
    if (opts.serviceModule) direct = require(opts.serviceModule).create({ appDir: opts.appDir, secondOpinion: opts.secondOpinion });
    else { const { createOcrService } = require("./ocr-service.js"); direct = createOcrService({ appDir: opts.appDir, secondOpinion: opts.secondOpinion, tesseract: require("../ocr/tesseract-compat.js")(require("tesseract.js")) }); }
    return direct;
  }
  const busyCount = () => slots.filter((s) => s.task).length;

  function spawn() {
    let w;
    const slot = { w: null, task: null, online: false, dead: false };
    try {
      w = new Worker(file, { workerData: { __ocrWorker: true, appDir: opts.appDir, hasSecondOpinion: !!opts.secondOpinion, serviceModule: opts.serviceModule || null } });
    } catch (e) { broken = true; return null; }
    slot.w = w; stat.spawned++;
    w.on("message", (m) => {
      if (m.type === "ready") { slot.online = true; return; }
      if (m.type === "umi") {
        Promise.resolve().then(() => opts.secondOpinion.read(Buffer.from(m.png))).catch(() => ({ status: "UNAVAILABLE" }))
          .then((r) => { if (!slot.dead) w.postMessage({ type: "umi-result", rid: m.rid, result: r }); });
        return;
      }
      if (m.type === "result" || m.type === "error") {
        const t = inflight.get(m.id); if (!t) return;
        inflight.delete(m.id); if (slot.task === t) slot.task = null;
        if (m.type === "result") finish(t, m.result); else fail(t, new Error(m.error));
        pump();
      }
    });
    const died = (err) => {
      if (slot.dead) return; slot.dead = true;
      const i = slots.indexOf(slot); if (i >= 0) slots.splice(i, 1);
      const t = slot.task; slot.task = null;
      if (!slot.online) broken = true; // chưa từng chạy được: môi trường không nạp được script luồng → dùng đường trực tiếp
      if (t) {
        inflight.delete(t.id); unstart(t);
        if (t.attempts < 2 && !terminated) { t.attempts++; stat.retried++; queue.unshift(t); } else fail(t, err || new Error("Luồng OCR dừng đột ngột"));
      }
      pump();
    };
    w.on("error", died); w.on("exit", () => died(null));
    slots.push(slot);
    return slot;
  }

  function unstart(t) { if (t.started) { t.started = false; t.batch.running--; } }
  function finish(t, r) { unstart(t); stat.done++; t.batch.out[t.index] = r; t.batch.left--; if (t.batch.onProgress) { try { t.batch.onProgress(t.batch.total - t.batch.left, t.batch.total); } catch (e) { /* tiến độ không làm hỏng OCR */ } } settle(t.batch); }
  function fail(t, e) { unstart(t); stat.failed++; t.batch.error = t.batch.error || e; t.batch.left--; settle(t.batch); }
  function settle(b) {
    if (b.settled) return;
    const cancelled = b.shouldCancel && safeCancel(b);
    if (b.left <= 0 || (cancelled && !b.running)) { b.settled = true; if (b.error) b.reject(b.error); else if (cancelled) b.reject(new Error("OCR_CANCELLED")); else b.resolve(b.out); }
  }
  function safeCancel(b) { try { return !!b.shouldCancel(); } catch (e) { return true; } }

  function pump() {
    if (terminated) return;
    if (broken) { // đường trực tiếp: tuần tự như bản cũ
      while (queue.length) { const t = queue.shift(); if (dropIfCancelled(t)) continue; directQueue = directQueue.then(() => runDirect(t)); }
      return;
    }
    while (queue.length) {
      let slot = slots.find((s) => !s.task && !s.dead);
      if (!slot && slots.length < size) slot = spawn();
      if (!slot) { if (broken) return pump(); break; }
      if (slot.task) break;
      const t = queue.shift(); if (dropIfCancelled(t)) continue;
      slot.task = t; inflight.set(t.id, t); t.started = true; t.batch.running++;
      stat.peakBusy = Math.max(stat.peakBusy, busyCount());
      slot.w.postMessage({ type: "run", id: t.id, item: t.item });
    }
  }
  function dropIfCancelled(t) {
    if (t.batch.settled) { return true; }
    if (t.batch.shouldCancel && safeCancel(t.batch)) { t.batch.left--; settle(t.batch); return true; }
    return false;
  }
  async function runDirect(t) {
    t.started = true; t.batch.running++;
    try { const r = await directService().batch([t.item]); finish(t, r[0]); } catch (e) { fail(t, e); }
  }

  const api = {
    batch(items, o) {
      o = o || {};
      if (!Array.isArray(items) || !items.length) return Promise.resolve([]);
      return new Promise((resolve, reject) => {
        const b = { out: new Array(items.length), left: items.length, total: items.length, running: 0, onProgress: o.onProgress, shouldCancel: o.shouldCancel, resolve, reject, error: null, settled: false };
        items.forEach((item, index) => queue.push({ id: ++nextId, batch: b, item, index, attempts: 0, started: false }));
        pump();
      });
    },
    async selfTest() {
      if (broken || terminated) return directService().selfTest();
      let slot = slots.find((s) => !s.task && !s.dead) || (slots.length < size ? spawn() : slots[0]);
      if (!slot) return directService().selfTest();
      return new Promise((resolve, reject) => {
        const t = { id: ++nextId, batch: { out: [], left: 1, total: 1, running: 0, resolve: (o) => resolve(o[0]), reject, error: null, settled: false }, item: null, index: 0, attempts: 2, started: false };
        const waitFree = () => { if (slot.dead) { directService().selfTest().then(resolve, reject); return; } if (slot.task) { setTimeout(waitFree, 20); return; } slot.task = t; inflight.set(t.id, t); slot.w.postMessage({ type: "selftest", id: t.id }); };
        waitFree();
      });
    },
    async terminate() {
      terminated = true; queue.length = 0;
      const ws = slots.splice(0);
      await Promise.all(ws.map((s) => new Promise((done) => {
        s.dead = true; let fin = false; const end = () => { if (!fin) { fin = true; clearTimeout(tm); done(); } };
        const tm = setTimeout(() => { try { s.w.terminate(); } catch (e) { /* đã dừng */ } end(); }, 5000);
        s.w.once("exit", end); try { s.w.postMessage({ type: "terminate" }); } catch (e) { end(); }
      })));
      if (direct && direct.terminate) await direct.terminate().catch(() => {});
    },
    stats() { return { size, threads: slots.length, busy: busyCount(), done: stat.done, failed: stat.failed, retried: stat.retried, spawned: stat.spawned, peakBusy: stat.peakBusy, fallback: broken }; }
  };
  return api;
}

module.exports = { createOcrPool, defaultSize };
