// ===== DYNAMIC PAYROLL FORMULA ENGINE — hàm có sẵn (Master Prompt mục III.3) =====
// Chỉ các hàm khai báo ở đây (+ hàm nghiệp vụ đăng ký thêm qua registerBusinessFunction) được phép
// gọi trong công thức — formula-validator.js chặn mọi tên hàm khác trước khi công thức được lưu.
// IF được evaluator xử lý riêng (lazy — chỉ tính nhánh được chọn, xem formula-evaluator.js); các hàm
// còn lại ở đây đều "eager" (tính hết đối số trước khi gọi impl).
(function (root) {
  "use strict";

  function toBool(n) { return !!n; } // 0/NaN = false, khác 0 = true (giống AND/OR của evaluator)

  // { minArgs, maxArgs (null = không giới hạn), impl(args: number[]) → number }
  var BUILTIN = {
    MIN: { minArgs: 1, maxArgs: null, impl: function (a) { return Math.min.apply(null, a); } },
    MAX: { minArgs: 1, maxArgs: null, impl: function (a) { return Math.max.apply(null, a); } },
    ABS: { minArgs: 1, maxArgs: 1, impl: function (a) { return Math.abs(a[0]); } },
    ROUND: { minArgs: 1, maxArgs: 2, impl: function (a) { var p = Math.pow(10, a[1] || 0); return Math.round(a[0] * p) / p; } },
    FLOOR: { minArgs: 1, maxArgs: 1, impl: function (a) { return Math.floor(a[0]); } },
    CEIL: { minArgs: 1, maxArgs: 1, impl: function (a) { return Math.ceil(a[0]); } },
    // SUM/COUNT nhận trực tiếp danh sách đối số (không phải 1 vùng ô như Excel) — SUM cộng giá trị,
    // COUNT đếm SỐ ĐỐI SỐ (dùng khi muốn đếm số điều kiện/khoản đang được truyền vào công thức).
    SUM: { minArgs: 1, maxArgs: null, impl: function (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; } },
    COUNT: { minArgs: 1, maxArgs: null, impl: function (a) { return a.length; } }
  };

  // Hàm nghiệp vụ (mục III.3: SUM_ATTENDANCE/SUM_PRODUCTION/COUNT_VALID_DAYS/SUM_APPROVED_TRIPS…) —
  // tên được CHO PHÉP qua cú pháp ngay từ đầu (để công thức dùng được), nhưng chưa có cách tính cụ
  // thể (phụ thuộc cách mỗi nghiệp vụ tổng hợp dữ liệu nguồn) — đăng ký impl thật khi migrate từng
  // nghiệp vụ (Giai đoạn migrate DM_TANGCA/DM_PHUCAP/DM_HOTRO), KHÔNG suy đoán trước.
  var BUSINESS = {};
  ["SUM_ATTENDANCE", "SUM_PRODUCTION", "COUNT_VALID_DAYS", "SUM_APPROVED_TRIPS"].forEach(function (n) { BUSINESS[n] = null; });

  function isKnown(name) { return !!BUILTIN[name] || Object.prototype.hasOwnProperty.call(BUSINESS, name); }
  function arityOf(name) { return BUILTIN[name] || null; }
  /** Gọi hàm (không phải IF — IF do evaluator xử lý riêng để lazy). args đã được tính giá trị. */
  function call(name, args) {
    var f = BUILTIN[name];
    if (f) return f.impl(args);
    if (Object.prototype.hasOwnProperty.call(BUSINESS, name)) {
      if (!BUSINESS[name]) throw new Error("Hàm nghiệp vụ \"" + name + "\" chưa được triển khai cho ngữ cảnh này");
      return BUSINESS[name](args);
    }
    throw new Error("Hàm \"" + name + "\" không tồn tại");
  }
  /** Đăng ký cách tính thật cho 1 hàm nghiệp vụ (xem BUSINESS ở trên). impl(args) → number. */
  function registerBusinessFunction(name, impl) {
    if (!Object.prototype.hasOwnProperty.call(BUSINESS, name)) throw new Error("\"" + name + "\" không phải tên hàm nghiệp vụ đã khai báo");
    BUSINESS[name] = impl;
  }

  var api = { BUILTIN_NAMES: Object.keys(BUILTIN), BUSINESS_NAMES: Object.keys(BUSINESS), isKnown: isKnown, arityOf: arityOf, call: call, registerBusinessFunction: registerBusinessFunction, toBool: toBool };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else { root.HAKCore = root.HAKCore || {}; root.HAKCore.formulaFunctions = api; }
})(typeof window !== "undefined" ? window : this);
