"use strict";
// Dịch vụ OCR GIẢ cho test bể luồng (main/ocr-worker.js): không nạp Tesseract, nhanh, quyết định bằng trường của ô.
const { threadId } = require("worker_threads"), fs = require("fs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
exports.create = function (o) {
  return {
    async batch(items) {
      const out = [];
      for (const it of items) {
        if (it.delay) await sleep(it.delay);
        if (it.crash && !fs.existsSync(it.crash)) { fs.writeFileSync(it.crash, "x"); process.exit(3); } // luồng chết đột ngột đúng MỘT lần (đánh dấu bằng tệp tạm, vì mỗi luồng có globalThis riêng)
        if (it.crashAlways) process.exit(3);
        if (it.fail) throw new Error("lỗi giả lập " + it.fail);
        const r = { text: String(it.text), conf: 90, thread: threadId };
        if (it.umi) r.second = await o.secondOpinion.read(Buffer.from([1, 2, 3]));
        out.push(r);
      }
      return out;
    },
    async selfTest() { return { ok: true, text: "12", thread: threadId }; },
    async terminate() {}
  };
};
