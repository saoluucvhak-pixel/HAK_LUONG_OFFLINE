// ===== DYNAMIC PAYROLL FORMULA ENGINE — bộ phân tích biểu thức (Master Prompt mục III.3) =====
// Chuyển chuỗi công thức người dùng nhập thành AST (cây cú pháp). KHÔNG dùng eval()/new Function()
// và KHÔNG thực thi bất kỳ mã JavaScript nào từ chuỗi — chỉ nhận dạng đúng các token đã khai báo
// (số, biến, hàm, toán tử) rồi dựng cây; formula-evaluator.js mới là nơi walk cây và tính giá trị.
(function (root) {
  "use strict";

  /** Lỗi công thức (cú pháp / kiểm tra / thực thi) — luôn có .code để phân loại, .message để hiển thị. */
  function FormulaError(code, message, pos) {
    this.name = "FormulaError"; this.code = code; this.message = message; this.pos = pos;
  }
  FormulaError.prototype = Object.create(Error.prototype);

  var TOKEN_RE = /\s*(?:([0-9]+(?:\.[0-9]+)?)|([A-Za-zÀ-ỹ_][A-Za-zÀ-ỹ0-9_]*)|(>=|<=|!=|[><=])|([+\-*/(),]))/;
  var WORD_OP = { AND: "AND", OR: "OR", NOT: "NOT" };

  /** Tách chuỗi công thức thành danh sách token. Ký tự không nhận dạng được → FormulaError "LEX". */
  function tokenize(src) {
    var s = String(src == null ? "" : src), i = 0, out = [];
    while (i < s.length) {
      var rest = s.slice(i);
      var skip = /^\s+/.exec(rest);
      if (skip) { i += skip[0].length; continue; }
      if (!rest.length) break;
      var m = TOKEN_RE.exec(rest);
      if (!m || m.index !== 0 || m[0].replace(/^\s+/, "") === "") { throw new FormulaError("LEX", "Ký tự không hợp lệ trong công thức tại vị trí " + i + ": \"" + rest.slice(0, 10) + "\"", i); }
      var consumed = m[0].length;
      if (m[1] != null) out.push({ t: "NUM", v: parseFloat(m[1]), pos: i });
      else if (m[2] != null) {
        var up = m[2].toUpperCase();
        if (WORD_OP[up]) out.push({ t: WORD_OP[up], v: up, pos: i });
        else out.push({ t: "IDENT", v: up, pos: i });
      } else if (m[3] != null) out.push({ t: m[3], v: m[3], pos: i });
      else if (m[4] != null) out.push({ t: m[4], v: m[4], pos: i });
      i += consumed;
    }
    out.push({ t: "EOF", v: null, pos: s.length });
    return out;
  }

  /**
   * parse(src) → AST. Ngữ pháp (ưu tiên thấp → cao):
   *   expr := or ; or := and (OR and)* ; and := not (AND not)* ; not := NOT not | cmp
   *   cmp := add ((>|<|>=|<=|=|!=) add)? ; add := mul ((+|-) mul)* ; mul := unary ((*|/) unary)*
   *   unary := '-' unary | primary ; primary := NUM | IDENT ['(' args ')'] | '(' expr ')'
   * Nút AST: {type:"num",value} | {type:"var",name} | {type:"unary",op,arg} |
   *          {type:"binary",op,left,right} | {type:"call",name,args:[...]}
   */
  function parse(src) {
    var toks = tokenize(src), pos = 0;
    function peek() { return toks[pos]; }
    function next() { return toks[pos++]; }
    function expect(t) { var tok = next(); if (tok.t !== t) throw new FormulaError("SYNTAX", "Công thức sai cú pháp: cần \"" + t + "\" nhưng gặp \"" + tok.v + "\" (vị trí " + tok.pos + ")", tok.pos); return tok; }

    function parseOr() {
      var left = parseAnd();
      while (peek().t === "OR") { next(); left = { type: "binary", op: "OR", left: left, right: parseAnd() }; }
      return left;
    }
    function parseAnd() {
      var left = parseNot();
      while (peek().t === "AND") { next(); left = { type: "binary", op: "AND", left: left, right: parseNot() }; }
      return left;
    }
    function parseNot() {
      if (peek().t === "NOT") { next(); return { type: "unary", op: "NOT", arg: parseNot() }; }
      return parseCmp();
    }
    var CMP_OPS = { ">": 1, "<": 1, ">=": 1, "<=": 1, "=": 1, "!=": 1 };
    function parseCmp() {
      var left = parseAdd();
      if (CMP_OPS[peek().t]) { var op = next().t; return { type: "binary", op: op, left: left, right: parseAdd() }; }
      return left;
    }
    function parseAdd() {
      var left = parseMul();
      while (peek().t === "+" || peek().t === "-") { var op = next().t; left = { type: "binary", op: op, left: left, right: parseMul() }; }
      return left;
    }
    function parseMul() {
      var left = parseUnary();
      while (peek().t === "*" || peek().t === "/") { var op = next().t; left = { type: "binary", op: op, left: left, right: parseUnary() }; }
      return left;
    }
    function parseUnary() {
      if (peek().t === "-") { next(); return { type: "unary", op: "-", arg: parseUnary() }; }
      return parsePrimary();
    }
    function parsePrimary() {
      var tok = peek();
      if (tok.t === "NUM") { next(); return { type: "num", value: tok.v }; }
      if (tok.t === "(") { next(); var e = parseOr(); expect(")"); return e; }
      if (tok.t === "IDENT") {
        next();
        if (peek().t === "(") {
          next();
          var args = [];
          if (peek().t !== ")") { args.push(parseOr()); while (peek().t === ",") { next(); args.push(parseOr()); } }
          expect(")");
          return { type: "call", name: tok.v, args: args };
        }
        return { type: "var", name: tok.v };
      }
      throw new FormulaError("SYNTAX", "Công thức sai cú pháp: không đọc được tại vị trí " + tok.pos + " (\"" + (tok.v == null ? "hết chuỗi" : tok.v) + "\")", tok.pos);
    }

    var ast = parseOr();
    expect("EOF");
    return ast;
  }

  var api = { parse: parse, tokenize: tokenize, FormulaError: FormulaError };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else { root.HAKCore = root.HAKCore || {}; root.HAKCore.formulaParser = api; }
})(typeof window !== "undefined" ? window : this);
