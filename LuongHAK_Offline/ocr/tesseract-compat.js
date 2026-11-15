// Lớp tương thích cho tesseract.js >= 6 (đang dùng 7.0.0).
//
// Từ bản 6, recognize() không còn trả data.words: muốn có danh sách từ phải yêu cầu output "blocks" và lấy từ
// blocks → paragraphs → lines → words. main/ocr-service.js (file dùng chung với HAK_OCR_ENGINE, bị khóa bởi
// shared-ocr.lock.json) đọc data.words khi đoán chiều ảnh cả trang. Lớp này bọc thư viện để data.words có lại
// đúng như bản 5, nên không phải sửa file dùng chung. Truyền vào createOcrService({ tesseract: compat(require("tesseract.js")) }).
//
// Chỉ worker đọc cả trang (PSM.AUTO) mới xin "blocks"; worker đọc từng ô không cần danh sách từ nên giữ nguyên tốc độ.
"use strict";

function wordsOf(data) {
  const out = [];
  ((data && data.blocks) || []).forEach((b) => (b.paragraphs || []).forEach((p) => (p.lines || []).forEach((l) => (l.words || []).forEach((w) => out.push(w)))));
  return out;
}

function compat(T) {
  const AUTO = T.PSM && T.PSM.AUTO;
  return Object.assign({}, T, {
    async createWorker() {
      const worker = await T.createWorker.apply(T, arguments);
      const setParameters = worker.setParameters.bind(worker), recognize = worker.recognize.bind(worker);
      let wholePage = false;
      worker.setParameters = function (params) {
        if (params && "tessedit_pageseg_mode" in params) wholePage = String(params.tessedit_pageseg_mode) === String(AUTO);
        return setParameters.apply(null, arguments);
      };
      worker.recognize = async function (image, options, output) {
        if (!wholePage) return recognize(image, options, output);
        const result = await recognize(image, options || {}, Object.assign({ text: true, blocks: true }, output));
        if (result && result.data && !Array.isArray(result.data.words)) result.data.words = wordsOf(result.data);
        return result;
      };
      return worker;
    }
  });
}

module.exports = compat;
module.exports.wordsOf = wordsOf;
