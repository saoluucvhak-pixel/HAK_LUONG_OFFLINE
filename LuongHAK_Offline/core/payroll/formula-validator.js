// ===== DYNAMIC PAYROLL FORMULA ENGINE — kiểm tra công thức trước khi lưu (Master Prompt mục III.3/VII.2) =====
// Chạy trước khi LƯU công thức (không phải lúc tính lương) — gom ĐỦ lỗi một lần để người nhập sửa
// hết trong 1 lượt: biến/hàm chưa khai báo, sai số lượng đối số, công thức quá dài/quá sâu.
(function (root) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var P = isNode ? require("./formula-parser.js") : root.HAKCore.formulaParser;
  var VARLIB = isNode ? require("./formula-variables.js") : root.HAKCore.formulaVariables;
  var FN = isNode ? require("./formula-functions.js") : root.HAKCore.formulaFunctions;

  var DEFAULTS = { maxLength: 2000, maxDepth: 20, maxNodes: 300 };

  function countNodes(ast) {
    if (!ast || typeof ast !== "object") return 0;
    var n = 1;
    if (ast.type === "unary") n += countNodes(ast.arg);
    else if (ast.type === "binary") n += countNodes(ast.left) + countNodes(ast.right);
    else if (ast.type === "call") ast.args.forEach(function (a) { n += countNodes(a); });
    return n;
  }
  function depthOf(ast) {
    if (!ast || typeof ast !== "object") return 0;
    if (ast.type === "unary") return 1 + depthOf(ast.arg);
    if (ast.type === "binary") return 1 + Math.max(depthOf(ast.left), depthOf(ast.right));
    if (ast.type === "call") { var m = 0; ast.args.forEach(function (a) { m = Math.max(m, depthOf(a)); }); return 1 + m; }
    return 1;
  }

  /**
   * @param src chuỗi công thức HOẶC AST đã parse() sẵn
   * @param opts { variables: [tên biến được phép] (mặc định: toàn bộ formula-variables.js),
   *               functions: [tên hàm được phép thêm ngoài IF/hàm có sẵn] (mặc định: toàn bộ),
   *               maxLength, maxDepth, maxNodes }
   * @returns { ok, errors: [{code,message}], ast } — ast = null nếu lỗi cú pháp (không parse được)
   */
  function validate(src, opts) {
    opts = opts || {};
    var maxLength = opts.maxLength != null ? opts.maxLength : DEFAULTS.maxLength;
    var maxDepth = opts.maxDepth != null ? opts.maxDepth : DEFAULTS.maxDepth;
    var maxNodes = opts.maxNodes != null ? opts.maxNodes : DEFAULTS.maxNodes;
    var allowVar = opts.variables ? toSet(opts.variables) : null; // null = cho phép mọi biến đã khai báo trong formula-variables.js
    var allowFn = opts.functions ? toSet(opts.functions) : null; // null = cho phép mọi hàm đã khai báo (BUILTIN + BUSINESS)
    var errors = [];

    if (typeof src === "string") {
      if (!src.trim()) { errors.push({ code: "EMPTY", message: "Công thức trống" }); return { ok: false, errors: errors, ast: null }; }
      if (src.length > maxLength) errors.push({ code: "TOO_LONG", message: "Công thức dài " + src.length + " ký tự, vượt giới hạn " + maxLength });
    }
    var ast;
    try { ast = typeof src === "string" ? P.parse(src) : src; }
    catch (e) { errors.push({ code: e.code || "SYNTAX", message: e.message || String(e) }); return { ok: false, errors: errors, ast: null }; }

    var nodes = countNodes(ast), depth = depthOf(ast);
    if (nodes > maxNodes) errors.push({ code: "TOO_COMPLEX", message: "Công thức có " + nodes + " phần tử, vượt giới hạn " + maxNodes });
    if (depth > maxDepth) errors.push({ code: "TOO_DEEP", message: "Công thức lồng sâu " + depth + " cấp, vượt giới hạn " + maxDepth });

    function toSet(list) { var o = {}; list.forEach(function (x) { o[x] = 1; }); return o; }
    function walk(n) {
      if (!n || typeof n !== "object") return;
      if (n.type === "var") {
        if (!VARLIB.isKnown(n.name)) errors.push({ code: "UNKNOWN_VAR", message: "Biến \"" + n.name + "\" không tồn tại — kiểm tra lại tên biến (xem Thư viện biến)" });
        else if (allowVar && !allowVar[n.name]) errors.push({ code: "VAR_NOT_ALLOWED", message: "Biến \"" + n.name + "\" không dùng được cho loại công thức này" });
      } else if (n.type === "call") {
        if (n.name === "IF") {
          if (n.args.length !== 3) errors.push({ code: "ARITY", message: "IF() cần đúng 3 đối số (điều kiện, giá trị đúng, giá trị sai) — đang có " + n.args.length });
        } else if (FN.isKnown(n.name)) {
          if (allowFn && !allowFn[n.name]) errors.push({ code: "FN_NOT_ALLOWED", message: "Hàm \"" + n.name + "\" không dùng được cho loại công thức này" });
          var a = FN.arityOf(n.name);
          if (a) {
            if (n.args.length < a.minArgs || (a.maxArgs != null && n.args.length > a.maxArgs)) {
              errors.push({ code: "ARITY", message: n.name + "() cần " + (a.maxArgs == null ? "ít nhất " + a.minArgs : (a.minArgs === a.maxArgs ? "đúng " + a.minArgs : a.minArgs + "–" + a.maxArgs)) + " đối số — đang có " + n.args.length });
            }
          }
        } else errors.push({ code: "UNKNOWN_FN", message: "Hàm \"" + n.name + "\" không tồn tại — kiểm tra lại tên hàm" });
        n.args.forEach(walk);
      } else if (n.type === "unary") walk(n.arg);
      else if (n.type === "binary") { walk(n.left); walk(n.right); }
    }
    walk(ast);

    return { ok: errors.length === 0, errors: errors, ast: ast };
  }

  var api = { validate: validate, DEFAULTS: DEFAULTS };
  if (isNode) module.exports = api;
  else { root.HAKCore = root.HAKCore || {}; root.HAKCore.formulaValidator = api; }
})(typeof window !== "undefined" ? window : this);
