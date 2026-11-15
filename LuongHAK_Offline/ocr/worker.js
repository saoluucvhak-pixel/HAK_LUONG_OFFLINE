// Luồng phụ OCR (worker_threads) — bọc worker gốc của tesseract.js (5.x và 7.x).
// Trong Electron, tesseract.js tự nhận là "electron" và coi langPath (thư mục trên máy) là URL → cố tải qua mạng, treo.
// Ở đây là luồng phụ của tiến trình chính (Node đầy đủ) → báo cho thư viện đây là Node để đọc dữ liệu ngôn ngữ từ đĩa. Không tải gì từ mạng.
// File nằm trong ocr/ (ngoài asar: build.asarUnpack) vì worker_threads không chạy được file trong asar.
"use strict";
const Module = require("module");
const path = require("path");
const tdir = path.dirname(require.resolve("tesseract.js/package.json"));
// tesseract.js 5.x nhận diện Electron bằng gói "is-electron"; từ 6.x gói này không còn (thư viện chỉ phân biệt browser / webworker / node),
// nên chỉ thay gói đó khi nó có mặt. Luồng phụ này không có document nên bản 7 tự nhận là Node.
let isElectronId = null;
try { isElectronId = require.resolve("is-electron", { paths: [tdir] }); } catch (e) { /* tesseract.js >= 6: không dùng is-electron */ }
if (isElectronId) {
  const stub = new Module(isElectronId);
  stub.filename = isElectronId; stub.loaded = true; stub.exports = () => false;
  require.cache[isElectronId] = stub;
}
require(path.join(tdir, "src", "worker-script", "node", "index.js"));
