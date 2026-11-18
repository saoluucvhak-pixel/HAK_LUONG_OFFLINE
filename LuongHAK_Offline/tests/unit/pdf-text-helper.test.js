// Bộ trích văn bản PDF dùng cho kiểm thử nội dung PDF (tests/helpers/pdf-text.cjs): kiểm trên PDF TỰ DỰNG (không cần Electron), phủ cả hai dạng phông:
// Type0/Identity-H (mã 2 byte — thường gặp với phông TrueType trên Windows) và Type3/đơn giản (mã 1 byte — Skia dùng khi không nhúng được phông). Dữ liệu GIẢ.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");
const P = require("../helpers/pdf-text.cjs");

function pdf(opts) { // opts: { font: "type0"|"type3", content, cmap, flate }
  const objs = [];
  const add = (body, stream) => { objs.push({ body, stream }); return objs.length; };
  add("<< /Type /Catalog /Pages 2 0 R >>"); add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>");
  add("<<", opts.content);
  add(opts.font === "type3" ? "<< /Type /Font /Subtype /Type3 /FirstChar 0 /LastChar 255 /ToUnicode 6 0 R >>" : "<< /Type /Font /Subtype /Type0 /BaseFont /X /Encoding /Identity-H /ToUnicode 6 0 R >>");
  add("<<", opts.cmap);
  let out = "%PDF-1.7\n"; const parts = [Buffer.from(out, "latin1")];
  objs.forEach((o, i) => {
    let data = o.stream != null ? Buffer.from(o.stream, "latin1") : null, dict = o.body;
    if (data && opts.flate) { data = zlib.deflateSync(data); dict = "<< /Filter /FlateDecode"; } else if (data) dict = "<<";
    parts.push(Buffer.from((i + 1) + " 0 obj\n", "latin1"));
    if (data) { parts.push(Buffer.from(dict + " /Length " + data.length + " >>\nstream\n", "latin1"), data, Buffer.from("\nendstream\nendobj\n", "latin1")); } else parts.push(Buffer.from(dict + "\nendobj\n", "latin1"));
  });
  parts.push(Buffer.from("trailer\n<< /Root 1 0 R >>\n%%EOF\n", "latin1")); return Buffer.concat(parts);
}
const CMAP2 = "/CIDInit /ProcSet findresource begin 12 dict begin begincmap 1 begincodespacerange <0000> <FFFF> endcodespacerange 3 beginbfrange <0001> <0003> <0041> <0010> <0012> [<0110> <1EA0> <00D4>] <0020> <0021> <0030> endbfrange 2 beginbfchar <0004> <0020> <0005> <002C> endbfchar endcmap end end";
const CMAP1 = "begincmap 1 begincodespacerange <00> <FF> endcodespacerange 2 beginbfchar <41> <0058> <42> <1EA0> endbfchar 1 beginbfrange <30> <39> <0030> endbfrange endcmap";

test("U-PDFT-01 Type0/Identity-H: TJ = một ô; vị trí Tm tách ô; ô ghép từ nhiều mã; bfrange (cả dạng mảng) và bfchar; sắp theo chiều đọc (trên → dưới)", () => {
  const content = "BT /F1 10 Tf 1 0 0 1 100 700 Tm [<0001> -20 <0002>] TJ 1 0 0 1 300 700 Tm <0003> Tj 1 0 0 1 100 680 Tm <0010> Tj 1 0 0 1 300 680 Tm <00200021> Tj 1 0 0 1 100 660 Tm <00110012> Tj ET";
  for (const flate of [false, true]) {
    const L = P.lines(pdf({ font: "type0", content, cmap: CMAP2, flate }));
    assert.deepEqual(L, [["AB", "C"], ["Đ", "01"], ["ẠÔ"]], "flate=" + flate + " " + JSON.stringify(L));
  }
});

test("U-PDFT-02 Type3/mã 1 byte: ghép các ký tự rời liền kề thành một ô, khoảng cách lớn = sang ô khác; ma trận cm lật trục vẫn đọc từ trên xuống", () => {
  // trục lật (cm âm): dòng "trên" có y NHỎ; mỗi ký tự là một Tj riêng như Skia
  const chars = (txt, x, y) => [...txt].map((c, i) => "1 0 0 1 " + (x + i * 6) + " " + y + " Tm <" + c.charCodeAt(0).toString(16).padStart(2, "0") + "> Tj").join(" ");
  const content = "q 1 0 0 -1 0 800 cm BT /F1 8 Tf " + chars("A3", 50, 100) + " " + chars("B", 200, 100) + " " + chars("AB", 50, 120) + " " + chars("12", 50, 140) + " " + chars("5", 50, 160) + " ET Q";
  const L = P.lines(pdf({ font: "type3", content, cmap: CMAP1, flate: true }));
  assert.deepEqual(L, [["X3", "Ạ"], ["XẠ"], ["12"], ["5"]], JSON.stringify(L));
});

test("U-PDFT-03 hasRow/missingRows: đúng thứ tự trong một dòng; sai số bị phát hiện; ô ngắt dòng khớp theo từ; canon bỏ dấu gạch/vùng riêng/dấu : ( ) nhưng GIỮ dấu chấm-phẩy của số", () => {
  assert.equal(P.canon("2026\ue088" + "09-12 (a):"), "20260912a"); assert.equal(P.canon("1.500,5"), "1.500,5");
  const L = [["STT", "Mã NV", "Tên"], ["1", "NV001", "NguyễnVăn", "1.500.000"], ["Ánh"], ["2", "NV002", "Lê", "2.000.000"]];
  assert.equal(P.hasRow(L, ["1", "NV001", "1.500.000"]), true); assert.equal(P.hasRow(L, ["1", "NV001", "1.500.001"]), false); assert.equal(P.hasRow(L, ["1.500.000", "NV001"]), false, "sai thứ tự");
  const c = { expect: [["1", "NV001", "Nguyễn Văn Ánh", "1.500.000"], ["2", "NV002", "Lê", "2.000.000"]] };
  const m = P.missingRows(L, c); assert.equal(m.length, 0, JSON.stringify(m)); assert.equal(m.tally.block >= 1, true, "dòng có ô ngắt dòng khớp theo khối");
  const bad = { expect: [["1", "NV001", "Nguyễn Văn Ánh", "1.500.001"]] }; assert.equal(P.missingRows(L, bad).length, 1);
});
