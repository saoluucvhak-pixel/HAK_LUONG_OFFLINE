// ===== GIAO DIỆN APP TÍNH LƯƠNG HAK (offline) =====
// FILE NÀY ĐƯỢC GHÉP TỪ app-src/*.js — KHÔNG SỬA TRỰC TIẾP. Sửa trong app-src/ rồi chạy: npm run build:app
(function () {
  "use strict";
  // Hàm trợ giúp không dùng trạng thái của app: định nghĩa ở ui/app-helpers.js (nạp trước file này).
  var APPH = window.HAKAppHelpers;
  var cleanImportedData = APPH.cleanImportedData, applyTheme = APPH.applyTheme, $ = APPH.$, toast = APPH.toast, qtyText = APPH.qtyText, fmt = APPH.fmt, esc = APPH.esc, sheetName = APPH.sheetName, slug = APPH.slug, pwWeak = APPH.pwWeak, dateFix = APPH.dateFix, dateIso = APPH.dateIso;
  var moneyText = APPH.moneyText, moneyLive = APPH.moneyLive, catPass = APPH.catPass, missingReq = APPH.missingReq, retroText = APPH.retroText, thueIsCha = APPH.thueIsCha, ctVarFromRow = APPH.ctVarFromRow, ctRefVars = APPH.ctRefVars, kyLabel = APPH.kyLabel, fmtTime = APPH.fmtTime, kyKey = APPH.kyKey, n0 = APPH.n0;
  var addTotal = APPH.addTotal, pdfFallbackPrint = APPH.pdfFallbackPrint, opsFmtCell = APPH.opsFmtCell, loadScript = APPH.loadScript, canvasOf = APPH.canvasOf, attRecordId = APPH.attRecordId, grayOf = APPH.grayOf, grayCanvas = APPH.grayCanvas, titleName = APPH.titleName, ocrRef = APPH.ocrRef, libEnrich = APPH.libEnrich, layoutCheck = APPH.layoutCheck;
  var markStopped = APPH.markStopped, ocrImportedCells = APPH.ocrImportedCells, summarize = APPH.summarize, chotSummary = APPH.chotSummary, fold = APPH.fold, fmtSize = APPH.fmtSize, fileGone = APPH.fileGone;
  var KEY = "luonghak_db_v1";
  var E = window.LuongEngine, C = window.HAKCore, VAL = C.validate, IMP = C.importer, INT = C.integrity, ID = C.identity, CLS = C.close, GRD = C.guard, SCH = C.schema, PERM = C.perm, RP = C.repo, ALLOC = C.alloc, BHR = C.bh, RC = C.reconcile, PCC = C.preClose, FML = C.formula, FAP = C.formulaApproval, RF = C.reportFilter, IPAY = C.internalPayroll, RH = C.reportHtml, TCFG = C.taxcfg, GATE = C.gate, HDD = C.hdld, LF = C.lf, CMP = C.company;
  var DAYS = []; for (var i = 1; i <= 31; i++) DAYS.push(("0" + i).slice(-2));

  // ---------- Định nghĩa bảng ----------
  var S = {
    chamcong: { ten: "Chấm công", icon: "🗓", cols: ["Kỳ", "Mã NV", "Hình thức công"].concat(DAYS), kyCol: "Kỳ", hide: ["Kỳ"], def: { "Hình thức công": "BT" }, showName: true, total: true, hint: "Mỗi dòng = 1 nhân viên × 1 hình thức công trong tháng. Hình thức: BT (bình thường), CL (lễ), PN (phép năm), CC (tính cơm), TC/TC1–TC6 (tăng ca). Ô ngày nhập 1, 0.5, hoặc 1QC (1 công + nhãn QC). Cột đỏ nhạt là Chủ nhật." },
    sanluong: { ten: "Sản lượng", icon: "⚖", cols: ["Phiếu cân", "Ngày cân", "Biển số", "KL hàng (Tấn)", "Mã NV", "Mã phòng ban", "NV vắng", "Cân lần 1", "Cân lần 2"], dateCol: "Ngày cân", showName: true, hint: "Cách 1 (như công cụ phân bổ): ghi Mã phòng ban (tổ) + NV vắng → khối lượng chia ĐỀU cho người của tổ có mặt ngày cân (vắng: ghi tên cuối, VD 'Long, Định', hoặc Mã NV). Người có đơn nghỉ đã duyệt (nghỉ phép, không lương, ốm) tự không nhận phiếu những ngày nghỉ — không cần ghi NV vắng. Cách 2: ghi Mã NV → giao đúng người đó. Xem kết quả chia ở Báo cáo lương → Phân bổ sản lượng." },
    bandam: { ten: "Ban dăm xuất hàng", icon: "🚛", cols: ["Phiếu cân", "Ngày cân", "Biển số", "KL hàng (Tấn)", "Mã NV", "Mã phòng ban", "NV vắng", "Cân lần 1", "Cân lần 2"], dateCol: "Ngày cân", showName: true, hint: "Cột 'KL hàng (Tấn)' ở bảng này là SỐ XE (mỗi phiếu thường = 1 xe), nhân với đơn giá bơm dăm. Chọn tab Phân bổ theo tổ hoặc Phân bổ trực tiếp nhân viên; mỗi tab có mẫu Excel và bước Lưu để tính lương riêng. Nhập Excel trực tiếp: điền Mã NV, để trống Mã phòng ban và NV vắng." },
    psluong: { ten: "Thưởng / Trừ", icon: "🎁", cols: ["Ngày hạch toán", "Số chứng từ", "Mã NV", "Diễn giải", "Thưởng", "Thu nhập khác", "Trừ khác"], dateCol: "Ngày hạch toán", showName: true },
    ungluong: { ten: "Tạm ứng", icon: "💵", cols: ["Ngày hạch toán", "Số chứng từ", "Mã NV", "Diễn giải", "Tạm ứng"], dateCol: "Ngày hạch toán", showName: true },
    tiencom: { ten: "Suất cơm", icon: "🍚", cols: ["Ngày", "Mã NV", "Số suất cơm", "Ghi chú", "Suất bổ sung"], dateCol: "Ngày", showName: true }
  };
  var DM = {
    dm_luong: { ten: "Mã lương", cols: ["Hiệu lực từ", "Hiệu lực đến", "Mã lương", "Mã hình thức lương", "Hình thức lương", "Loại công thức", "Số tiền khoán", "Lương phụ", "Ngưỡng truy thu BH (công)", "ĐK_Bù lương (công tối thiểu)", "Đơn giá bù lương", "Ngưỡng công bù theo tổ", "Đơn giá bơm dăm", "Số ngày giảm trừ", "Cách tính"], hint: "Quy chế 2026: công chuẩn = số ngày của tháng − 'Số ngày giảm trừ' (riêng 'tất cả ngày CN' = trừ Chủ nhật); công nhật tính tăng ca theo công chuẩn này. 'Mã hình thức lương' chứa chữ SP (vd LSP) = lương sản phẩm. 'Đơn giá bù lương' = mức sàn đ/ngày công. Bù theo tháng / ngày (cách cũ) dùng 'ĐK_Bù lương' (tấn/công); bù theo bình quân tổ dùng 'Ngưỡng công bù theo tổ' (công BT tối thiểu/tháng); bù theo ngày bậc thang không xét ngưỡng. 'Cách tính' quyết định công chuẩn: 'Số ngày của tháng - tất cả ngày CN', 'Thực tế ngày công'... 'Loại công thức' (chỉ áp dụng cho mã SP, quy chế 2026): để trống = Lương TG tính theo Công lễ + Công phép (hành vi hiện tại) · TG_LE_TANGCA = tính theo Công lễ + Công tăng ca (đúng M thật HAK_DN — chỉ chọn khi đã xác nhận đúng cho dữ liệu công ty mình)." },
    dm_phucap: { ten: "Phụ cấp", cols: ["Hiệu lực từ", "Hiệu lực đến", "Mã phụ cấp", "Tên phụ cấp", "Loại công thức", "Số tiền", "Tỷ lệ", "Tham chiếu", "Cách tính", "Công chuẩn 2"], hint: "'Công chuẩn 2' (để trống = không đổi công chuẩn): nếu người có chấm công BT mang nhãn của mã này và mã có Công chuẩn 2 > 0 → công chuẩn của người đó = Công chuẩn 2 (ảnh hưởng lương thời gian, tăng ca) và mã này được tính 1 lần/kỳ (không nhân số ngày) · 'Loại công thức' (để trống = hành vi cũ, không đổi số liệu): CO_DINH = luôn tính cố định dù 'Cách tính' ghi gì · TYLE_KHONG_TRU = tỷ lệ theo công, không trừ gì khi dưới ngưỡng · TYLE_TRU_PHEP_TANGCA = tỷ lệ, dưới ngưỡng trừ phép+tăng ca (quy chế 2026/C6, đã đối chiếu CNHAK/HAKQN thật) · TYLE_TRU_LE_PHEP = tỷ lệ, dưới ngưỡng trừ lễ+phép (đối chiếu M thật HAK_DN — chỉ dùng khi đã xác nhận đúng cho mã/công ty đó)." },
    dm_tangca: { ten: "Tăng ca", cols: ["Hiệu lực từ", "Hiệu lực đến", "Mã tăng ca", "Nội dung tăng ca", "Loại công thức", "Hệ số tăng ca", "Tiền tăng ca (nếu tính cố định)", "Cách tính"], hint: "'Loại công thức': để trống = dùng đúng công thức của tên Mã tăng ca (TC1-TC6, như trước đây). Thêm mã MỚI muốn dùng lại 1 trong các công thức TC1/TC2/TC3/TC4/TC5/TC6 đã có — ghi đúng tên công thức đó vào đây, không cần sửa phần mềm." },
    dm_hotro: { ten: "Hỗ trợ", cols: ["Hiệu lực từ", "Hiệu lực đến", "Mã hỗ trợ", "Tên hỗ trợ", "Loại công thức", "Số tiền", "Cách tính"], hint: "'Loại công thức' (để trống = đúng công thức cũ theo vị trí gán — 'Mã hỗ trợ' = theo ngày, 'Mã hỗ trợ 2' = bù thiếu công chuẩn): HT_THEO_NGAY = Số tiền × số ngày (cơm...) · HT_THIEU_CHUAN = (Công chuẩn − Tổng công) × Số tiền khi thiếu công, 0 khi đủ/thừa. Cho phép 1 mã dùng công thức khác vị trí gán mặc định." },
    dm_baohiem: { ten: "Bảo hiểm", cols: ["Hiệu lực từ", "Hiệu lực đến", "Mã bảo hiểm", "Nội dung", "DN.BHXH", "DN.BHYT", "DN.BHTN", "DN.KPCD", "NLD.BHXH", "NLD.BHYT", "NLD.BHTN", "NLD.KPCD", "Trần lương đóng BHXH, BHYT", "Trần lương đóng BHTN"], hint: "Trần lương đóng: để trống cột BHXH, BHYT = 46.800.000đ trước 07/2026, 50.600.000đ từ 07/2026. Khai trần BHTN theo vùng nếu lương đóng vượt mức trần thấp nhất trong các vùng. Nhập 0 khi cấu hình cần bỏ trần. Nhập tỷ lệ dạng 0.08 hoặc 8%. DN = công ty đóng, NLD = người lao động đóng." },
    dm_tncn: { ten: "Thuế TNCN", cols: ["Hiệu lực từ", "Hiệu lực đến", "Mã thuế TNCN", "Nội dung", "Phương pháp", "Mức thuế", "Trạng thái", "Loại HĐLĐ", "Đối tượng áp dụng", "Căn cứ", "Ghi chú"], hint: "DM_TNCN (bảng cha): mỗi dòng = 1 phiên bản của 1 mã thuế. 'Phương pháp': LUY_TIEN (lũy tiến từng phần) · LUY_TIEN_TRU_NHANH (lũy tiến rút gọn, dùng cột 'Trừ nhanh' của biểu thuế) · VANG_LAI (khấu trừ theo 'Mức thuế', mặc định 10%) · MIEN (không khấu trừ). Để trống Phương pháp = đọc theo 'Nội dung' như cũ. 'Trạng thái': Nháp (chưa dùng) · Hiệu lực · Ngừng. Biểu thuế (bảng con) nằm ngay bên dưới." },
    dm_bacthue: { ten: "Biểu thuế lũy tiến", cols: ["Hiệu lực từ", "Hiệu lực đến", "Mã thuế TNCN", "Bậc", "Thu nhập từ", "Thu nhập đến", "Tỷ lệ", "Trừ nhanh", "Số tiền cố định", "Điều kiện áp dụng", "Loại đối tượng", "Trạng thái", "Ghi chú"], hint: "DM_TNCN_BIEUTHUE (bảng con của Thuế TNCN). Bậc cao nhất để 'Thu nhập đến' = 0 hoặc trống (không giới hạn). Mỗi bộ biểu thuế có 'Hiệu lực từ/đến' riêng. 'Mã thuế TNCN' trỏ về bảng cha; để trống = áp dụng chung cho mọi mã lũy tiến. 'Trừ nhanh' chỉ dùng khi mã cha có Phương pháp LUY_TIEN_TRU_NHANH. 'Điều kiện áp dụng'/'Loại đối tượng' hiện chỉ để ghi chú, engine chưa đọc." },
    dm_giamtru: { ten: "Giảm trừ gia cảnh", cols: ["Hiệu lực từ", "Hiệu lực đến", "Mã giảm trừ", "Số người", "Số tiền"], hint: "Mã bắt đầu GTBT = bản thân, GTNPT = mỗi người phụ thuộc. Số người phụ thuộc lấy từ hồ sơ Nhân thân (Đăng ký phụ thuộc = Có)." },
    dm_phongban: { ten: "Phòng ban", cols: ["Mã khối", "Tên khối", "Mã phòng ban", "Tên phòng ban", "Tài khoản chi phí", "Hiệu lực từ", "Hiệu lực đến"], hint: "'Tài khoản chi phí' dùng cho Bảng hạch toán lương (VD 622 sản xuất, 627 quản lý PX, 641 bán hàng, 642 quản lý DN). Để trống: khối Sản xuất → 622, còn lại → 642." },
    dm_chucvu: { ten: "Chức vụ", cols: ["Mã chức vụ", "Tên chức vụ", "Hiệu lực từ", "Hiệu lực đến"] },
    dm_cc: { ten: "Hình thức công", cols: ["Mã CC", "Nội dung", "Hình thức công", "Diễn giải", "Hiệu lực từ", "Hiệu lực đến"], hint: "Danh sách mã hình thức công dùng trong bảng chấm công (BT, PN, CL, TC, CC…)." },
    // V10.2: ca kiểm thử công thức tăng ca (khóa kết quả kỳ vọng để kiểm thử hồi quy) — quản lý trong modal Danh mục tăng ca, không hiện ở Danh mục
    dm_congthuc_kiemthu: { ten: "Ca kiểm thử công thức", cols: ["Mã tăng ca", "Loại", "Mã cha", "Tên ca", "Công quy đổi kỳ vọng", "Kết quả kỳ vọng", "Nguồn", "Người tạo", "Ngày tạo"], hint: "Các ca kiểm thử của công thức tăng ca (biến lấy từ dữ liệu thật lúc lưu)." },
    // Master Prompt mục III/VII: Dynamic Payroll Formula Engine — thêm/sửa công thức tăng ca, phụ cấp, hỗ trợ KHÔNG cần sửa code.
    dm_congthuc: {
      ten: "Công thức tiền lương",
      cols: ["Hiệu lực từ", "Hiệu lực đến", "Mã công thức", "Mã tăng ca cha", "Mã phụ cấp cha", "Mã hỗ trợ cha", "Tên công thức", "Loại", "Công ty", "Biểu thức", "Tham số", "Đơn vị tính", "Mức tiền", "Hệ số", "Đối tượng áp dụng", "Trạng thái", "Phiên bản", "Người lập", "Ngày lập", "Người duyệt", "Thời điểm duyệt", "Người kích hoạt", "Thời điểm kích hoạt", "Người ngừng", "Thời điểm ngừng", "Lý do thay đổi", "Mô tả"],
      def: { "Trạng thái": "Nháp" },
      hint: "'Loại': OVERTIME (tăng ca) · ALLOWANCE (phụ cấp) · SUPPORT (hỗ trợ) — khớp đúng 'Mã công thức' đã gán cho nhân viên (Mã tăng ca / Mã phụ cấp / Mã hỗ trợ), engine tự tra công thức này TRƯỚC, không cần sửa phần mềm. 'Trạng thái': chỉ 'Hiệu lực' mới được dùng để tính lương chính thức — 'Nháp'/'Đã duyệt' dùng để soạn & chạy thử (tab Kiểm tra công thức) trước khi kích hoạt; 'Ngừng' = thôi áp dụng. 'Công ty': để trống = áp dụng mọi công ty; ghi cụ thể để ưu tiên hơn bản chung. 'Biểu thức' dùng tên biến ở tab Thư viện biến (CONG_TC, MUC_PHU_CAP, HE_SO_TC…), hàm MIN/MAX/ROUND/IF… Xem tab Mẫu công thức để copy công thức có sẵn."
    },
    // Master Prompt mục VIII: CompanyID → PolicyVersion → PayrollMethod — phương pháp bù sản lượng
    // CHÍNH THỨC (dùng khi chốt kỳ) không được quyết định bởi lựa chọn tự do trên màn hình Tính
    // lương; phải lấy từ đây (bản "Hiệu lực"). Màn hình Tính lương vẫn cho chọn tự do để XEM THỬ.
    dm_quychebu: {
      ten: "Quy chế bù sản lượng",
      cols: ["Hiệu lực từ", "Hiệu lực đến", "Cách bù", "Trạng thái", "Người phê duyệt", "Mô tả"],
      def: { "Trạng thái": "Nháp" },
      hint: "'Cách bù' (đúng 1 trong 4 mã, xem Tính lương để biết tên hiển thị): false = theo THÁNG (từng người) · true = theo NGÀY liên tục (cách cũ) · daihiep = theo NGÀY bậc thang (công cụ HAK/Đại Hiệp) · to = theo BÌNH QUÂN TỔ (công cụ HAK). Chỉ bản 'Trạng thái'='Hiệu lực' mới được dùng để CHỐT kỳ — màn hình Tính lương vẫn cho chọn phương pháp khác để xem thử/so sánh, nhưng khi chốt phương pháp đang xem phải khớp bản Hiệu lực; nếu khác thì app chặn, không tự chuyển hoặc tính lại. Chưa có bản Hiệu lực nào cho kỳ đang chốt (và kỳ đó có sản lượng cần bù) → KHÔNG chốt được."
    }
  };
  var HRT = {}; Object.keys(HRM.HR).forEach(function (k) { HRT[k] = { ten: HRM.HR[k].ten, cols: HRM.HR[k].store, hr: true }; });
  var ALL = Object.assign({}, S, DM, HRT);
  // Q-20: bảng có Số chứng từ → trên lưới chặn 2 dòng cùng Số chứng từ + Mã NV (dòng chưa có số chứng từ không bị ảnh hưởng)
  var CT_KEY = { psluong: true, ungluong: true };
  // Mọi thêm / sửa / xóa bản ghi nghiệp vụ đi qua repository (core/repository.js): quyền → ô ngày → trùng khóa → Q-15 → kỳ chốt / hồi tố, kiểm tra xong mới sửa dữ liệu
  var REPO = RP.createRepo({ transaction: txn, db: function () { return db; }, can: function (p) { return can(p); }, audit: function (a, d) { audit(a, d); }, uid: function () { return HRM.uid(); }, user: function () { return session ? session.tenDangNhap : currentUser(); },
    tableName: function (t) { return ALL[t] ? ALL[t].ten : t; }, hdChildren: HRM.HD_TABS });
  /** Ghi theo kế hoạch của repository: bị chặn → báo lý do; hồi tố + o.confirm → hỏi xác nhận (Hủy = không đổi gì). Trả kết quả hoặc null. */
  function commit(p, o) {
    o = o || {};
    if (!p.ok) { alert(p.msg); return null; }
    if (p.retro && o.confirm && !confirm(p.confirmMsg)) return null;
    var r = REPO.apply(p, o);
    if (!r.ok) { alert(r.msg); return null; }
    return r;
  }
  var DATECOLS = /^(Ngày|Hiệu lực)/;
  var NUMCOLS = /(Trừ nhanh|Lương|Số tiền|Số suất|KL hàng|Thưởng|Thu nhập|Trừ khác|Tạm ứng|Đơn giá|Tỷ lệ|DN\.|NLD\.|Bậc|Người phụ thuộc|Số người|Tham chiếu|Hệ số|Ngưỡng|ĐK_|Tiền)/;
  var COLW = { "Mã NV": 96, "Họ và tên": 170, "Diễn giải": 200, "Cách tính": 260, "Tên phụ cấp": 160, "Hình thức lương": 150, "Nội dung": 180, "Nội dung tăng ca": 160, "Nội dung khấu trừ": 160, "Tên hỗ trợ": 150, "Tên phòng ban": 200, "Tên chức vụ": 200, "Ghi chú": 200, "Hình thức công": 90, "Mã nhân viên": 110, "Tên Ngân hàng": 150 };

  // ---------- Lưu trữ ----------
  // Bản cài (.exe): lưu ra file data.json trong thư mục dữ liệu của app (window.hakStore, xem preload.js).
  // Mở bằng trình duyệt: lưu trong localStorage.
  var store = window.hakStore || null, fromLocal = false, loadError = null, readOnly = false;
  var db = (function () {
    if (store) {
      var res = store.load();
      if (res && res.ok === false) { loadError = res; readOnly = true; return {}; } // file hỏng: KHÔNG ghi đè, chuyển sang màn hình khôi phục
      if (res && res.text) { try { return JSON.parse(res.text); } catch (e) { loadError = { error: "Không đọc được dữ liệu: " + e.message, backups: store.listBackups() }; readOnly = true; return {}; } }
    }
    var s = null; try { s = localStorage.getItem(KEY); } catch (e) { s = null; }
    if (s) {
      // Dữ liệu trong trình duyệt bị hỏng: KHÔNG coi là rỗng (sẽ bị ghi đè) — chuyển sang màn hình khôi phục
      try { fromLocal = !!store; return JSON.parse(s); } catch (e) { loadError = { error: "Dữ liệu lưu trong trình duyệt bị hỏng: " + e.message, backups: [] }; readOnly = true; return {}; }
    }
    return {};
  })();
  // Kiểm tra CẤU TRÚC trước khi nâng cấp/chuẩn hóa: bảng sai kiểu, file của bản mới hơn… → chỉ xem, không ghi đè
  var schemaReport = null;
  if (!readOnly) {
    schemaReport = SCH.validate(db, { tables: Object.keys(ALL), hrTables: Object.keys(HRT) });
    if (schemaReport.fatal.length) { loadError = { error: "Cấu trúc dữ liệu không an toàn để mở:\n- " + schemaReport.fatal.join("\n- "), backups: store && store.listBackups ? store.listBackups() : [], schema: schemaReport }; readOnly = true; }
  }
  // Sao lưu TRƯỚC NÂNG CẤP: chụp nguyên trạng file dữ liệu của bản cũ trước khi chuyển đổi (1 lần cho mỗi lần nâng schema)
  if (!readOnly && store && store.backup && db && Object.keys(db).length && (!db.schemaVersion || db.schemaVersion < 2)) { try { store.backup("truoc-nang-cap"); } catch (e) { /* không chặn mở app */ } }
  /** Làm sạch dữ liệu đưa vào từ hệ thống cũ: chữ "null" trong ô chấm công → ô trống; dòng Tổng (Total) lẫn trong Sản lượng / Bơm dăm → loại bỏ. Trả danh sách thông báo. */
  var migMsg = [];
  if (!readOnly) {
    try { migMsg = HRM.migrate(db).concat(INT.normalizeDataset(db).messages, cleanImportedData(db)); }
    catch (e) { loadError = { error: "Lỗi khi chuyển đổi dữ liệu cũ: " + e.message + " — dữ liệu KHÔNG bị ghi đè", backups: store && store.listBackups ? store.listBackups() : [] }; readOnly = true; }
  }
  // Chỉ TẠO bảng còn thiếu; bảng có nhưng sai kiểu đã bị chặn ở bước kiểm tra cấu trúc (không bao giờ thay bằng bảng rỗng)
  function ensureTables() {
    Object.keys(ALL).concat(["sl_chuyenky", "congty", "kyluong", "kyluong_lichsu", "auditlog", "nguoidung", "baomat", "chungtu", "ocr_ten", "chungtu_lienket", "hdld_tailieu", "ttluong"]).forEach(function (k) {
      if (db[k] === undefined) db[k] = [];
      else if (!Array.isArray(db[k])) throw new Error("Bảng " + k + " sai cấu trúc — không tự thay thế");
    });
    db.schemaVersion = Math.max(2,db.schemaVersion||2);
  }
  if (!readOnly) {
    // Không để lỗi cấu trúc thoát ra làm sập cả app khi khởi động → chuyển sang chế độ chỉ xem / khôi phục (như bước chuyển đổi ở trên)
    try { ensureTables(); }
    catch (e) { loadError = { error: "Lỗi khi kiểm tra bảng dữ liệu: " + e.message + " — dữ liệu KHÔNG bị ghi đè", backups: store && store.listBackups ? store.listBackups() : [] }; readOnly = true; }
  }
  // Phiên bản kho mà giao diện đã nạp/lưu gần nhất; gửi kèm mỗi lần lưu để tiến trình chính từ chối ghi đè khi kho đã đổi ở nơi khác (STALE_BASE).
  var baseSig; try { baseSig = (store && !loadError && store.sig) ? String(store.sig()) : undefined; } catch (e) { baseSig = undefined; }
  var lastSaveStale = false, staleDeclined = false, closingNow = false;
  function isStale(r) { return typeof r === "string" && r.indexOf("STALE_BASE") === 0; }
  /** Kho đã đổi ở nơi khác: bản trong bộ nhớ là bản CŨ. Không ghi; hỏi tải lại (bỏ thay đổi chưa lưu ở màn hình này) hoặc giữ màn hình để xử lý tay. */
  function onStaleBase() {
    if (staleDeclined) return;
    if (confirm("Dữ liệu đã được thay đổi ở nơi khác (ví dụ khôi phục, lưu trữ năm hoặc thao tác khác) nên bản đang mở là bản CŨ. App KHÔNG ghi để tránh ghi đè dữ liệu mới.\n\nBấm OK để tải lại dữ liệu mới (thay đổi chưa lưu ở màn hình này sẽ bị bỏ).\nBấm Hủy để giữ màn hình này (sao lưu ra file nếu cần).")) { dirty = false; clearTimeout(saveTimer); window.location.reload(); }
    else staleDeclined = true;
  }
  var saveTimer = null, dirty = false, lastSaveError = "", lastTxnError = "";
  /** Ghi dữ liệu xuống nơi lưu bền vững. Trả true nếu chắc chắn đã lưu. */
  function saveNow() {
    clearTimeout(saveTimer);
    lastSaveError = "";
    if (readOnly) { lastSaveError = "Đang ở chế độ khôi phục — chưa ghi dữ liệu"; toast("⚠ " + lastSaveError); return false; }
    var str = JSON.stringify(db);
    if (store) { var r; lastSaveStale = false; try { r = store.save(str, baseSig); } catch (e) { r = e && e.message || String(e); } if (r !== true) { lastSaveError = String(r && r.error || r || "Nơi lưu dữ liệu không xác nhận đã ghi thành công"); dirty = true; if (isStale(r)) { lastSaveStale = true; toast("⛔ " + lastSaveError); if (!closingNow) onStaleBase(); return false; } toast("⚠ KHÔNG LƯU ĐƯỢC dữ liệu: " + lastSaveError); return false; } try { if (store.sig) baseSig = String(store.sig()); } catch (e) { /* giữ baseSig cũ */ } dirty = false; return true; }
    try { localStorage.setItem(KEY, str); dirty = false; return true; } catch (e) { lastSaveError = "Không ghi được bộ nhớ trình duyệt: " + (e && e.message || String(e)); dirty = true; toast("⚠ " + lastSaveError + " — hãy bấm Sao lưu ra file ngay!"); return false; }
  }
  var dbRev = 0; // V9.4: tăng mỗi lần dữ liệu đổi → làm hết hiệu lực bản tính lương tạm đang nhớ (kqKy)
  /** V10.1: giao dịch nhiều bước. Chụp các bảng liên quan (+ nhật ký), chạy fn; fn thất bại/ném lỗi HOẶC tiến trình chính từ chối lưu ⇒ HOÀN TÁC toàn bộ trong bộ nhớ.
   * Ghi xuống đĩa NGAY trong một lần lưu duy nhất — main thấy trọn bộ thay đổi (vd. duyệt nghỉ việc = phiếu + hợp đồng + nhân viên) hoặc không thấy gì. */
  function txn(tables, fn) {
    lastTxnError = "";
    var names = tables.concat(["auditlog"]), snap = {}, ok = false, wasDirty = dirty, sessionName = session && session.tenDangNhap;
    names.forEach(function (k) { snap[k] = JSON.stringify(db[k] || []); });
    try { ok = fn() !== false; if (!ok) lastTxnError = "Thao tác kiểm tra dữ liệu không cho phép ghi"; } catch (e) { ok = false; lastTxnError = String(e && e.message || e); toast("⛔ Lỗi khi xử lý: " + lastTxnError); }
    if (ok) { ok = saveNow(); if (!ok) lastTxnError = lastSaveError; if (ok) { dbRev++; st.kqStale = true; } } // dữ liệu đã đổi → làm hết hiệu lực bản tính lương tạm
    if (!ok) { names.forEach(function (k) { db[k] = JSON.parse(snap[k]); }); dbRev++; st.kqStale = true; dirty = wasDirty; if (names.indexOf("nguoidung") >= 0) session = sessionName ? PERM.findUser(db, sessionName) : null; if (wasDirty) { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 400); } }
    return ok;
  }
  function save() { dbRev++; dirty = true; st.kqStale = true; clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 400); }
  function backupNow(tag) { if (!store || !store.backup) return null; if (dirty && !saveNow()) return null; return store.backup(tag); }
  // P0: backupNow() có thể âm thầm thất bại (đĩa đầy, mất quyền ghi…) và trả null — các hành động KHÔNG THỂ
  // HOÀN TÁC (xóa hẳn dữ liệu) phải DỪNG LẠI khi sao lưu thất bại, không được tiếp tục xóa như chưa có gì xảy ra.
  function backupOrBlock(tag, label) {
    var n = backupNow(tag);
    // Máy mới chưa có file dữ liệu (khôi phục/nhập lần đầu): không có gì để sao lưu — không phải lỗi đĩa, đừng chặn
    if (!n && !dirty && store && store.hasDataFile && store.hasDataFile() === false) return true;
    if (!n) { alert("⛔ KHÔNG tạo được bản sao lưu trước khi " + label + " — dữ liệu CHƯA bị xóa, để tránh mất không thể khôi phục.\nKiểm tra dung lượng đĩa / quyền ghi ở Công ty & Sao lưu rồi thử lại."); return false; }
    return true;
  }
  // Người thực hiện: tên người dùng khai báo trên máy này (Công ty & Sao lưu) hoặc tài khoản Windows
  var winUser = (function () { try { return store && store.whoami ? store.whoami() : null; } catch (e) { return null; } })();
  // ---------- Đăng nhập & phân quyền (core/permissions.js) ----------
  var session = null, lastActive = Date.now(), IDLE_MS = 30 * 60 * 1000;
  function currentUser() {
    var w = winUser ? winUser.user + "@" + winUser.host : "";
    if (session) return session.hoTen + " [" + session.tenDangNhap + "]" + (w ? " (" + w + ")" : "");
    return w || "Người dùng trình duyệt";
  }
  function can(p) { return PERM.can(session, p); }
  /** Q-24: được thấy lương cá nhân (lương thỏa thuận / lương cơ bản) nếu có quyền Xem bảng lương hoặc Sửa hồ sơ (Nhân sự cần để lập phụ lục) */
  function canSeePay() { return can("payroll.view") || can("hr.edit"); }
  /** Kiểm tra quyền ở tầng nghiệp vụ — gọi ở đầu mọi thao tác ghi/xuất dữ liệu. Trả false (và báo) nếu không có quyền. */
  function need(p, what) {
    try { PERM.need(session, p, what); return true; } catch (e) { alert("⛔ " + e.message + "."); return false; }
  }
  // Băm mật khẩu: bản cài dùng tiến trình chính (Node crypto); bản trình duyệt dùng WebCrypto
  var AUTH = {
    salt: function () {
      if (store && store.authSalt) return store.authSalt();
      var a = new Uint8Array(16); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    },
    hash: function (pw, salt, iter) {
      if (store && store.authHash) return Promise.resolve(store.authHash(pw, salt, iter));
      var enc = new TextEncoder(), sb = new Uint8Array(salt.match(/../g).map(function (x) { return parseInt(x, 16); }));
      return crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]).then(function (k) {
        return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sb, iterations: iter }, k, 256);
      }).then(function (bits) { return Array.prototype.map.call(new Uint8Array(bits), function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); });
    },
    verify: function (pw, u) {
      if (store && store.authVerify) return Promise.resolve(store.authVerify(pw, u.salt, u.iter, u.hash));
      return AUTH.hash(pw, u.salt, u.iter).then(function (h0) { return h0 === u.hash; });
    },
    make: function (pw) { var salt = AUTH.salt(), iter = PERM.ITER; return AUTH.hash(pw, salt, iter).then(function (hash) { return { salt: salt, iter: iter, hash: hash }; }); }
  };
  function randomCode() { var a = AUTH.salt().toUpperCase(); return a.slice(0, 4) + "-" + a.slice(4, 8) + "-" + a.slice(8, 12) + "-" + a.slice(12, 16); }
  /** V9: xin tiến trình chính cấp phiên tin cậy (main tự kiểm mật khẩu với dữ liệu đã lưu trên đĩa). Bản trình duyệt không có main → true. */
  function mainLogin(name, pw) {
    if (!store || !store.login) return true;
    try { var r = store.login(name, pw); if (r && r.ok) return true; toast("⛔ " + ((r && r.error) || "Tiến trình chính từ chối phiên đăng nhập")); } catch (e) { toast("⛔ Không thiết lập được phiên đăng nhập tin cậy"); }
    return false;
  }
  function logout(reason, forceLock) {
    var pendingFailed = !readOnly && dirty && !saveNow();
    if (pendingFailed && !forceLock) { alert("Chưa đăng xuất: chưa lưu được thay đổi. " + lastSaveError + "\nGiữ ứng dụng mở để thử lưu lại."); return false; }
    if (!pendingFailed && !readOnly && session && !txn([], function () { audit("Đăng xuất", reason || ""); }) && !forceLock) { alert("Chưa đăng xuất: " + lastTxnError); return false; }
    try { if (store && store.logout) store.logout(); } catch (e) { /* main hết phiên cũng được */ }
    session = null; st.kq = null; render();
    if (pendingFailed) toast("Đã khóa phiên; còn thay đổi chưa lưu — giữ app mở và đăng nhập lại để lưu.");
    return true;
  }
  var sessionActivityAt = 0;
  function noteUserActivity(e) {
    if (!e.isTrusted) return;
    lastActive = Date.now();
    if (!session || !store || !store.activity || lastActive - sessionActivityAt < 60000) return;
    sessionActivityAt = lastActive;
    try {
      var r = store.activity();
      if (!r || !r.ok) toast("Phiên đăng nhập đã hết hiệu lực — giữ lại nội dung đang nhập và đăng nhập lại trước khi lưu");
    } catch (err) { toast("Không liên lạc được với phiên đăng nhập — giữ lại nội dung đang nhập trước khi thử lại"); }
  }
  ["mousedown", "keydown"].forEach(function (ev) { document.addEventListener(ev, noteUserActivity, true); });
  // Ctrl+F: nhảy tới ô tìm kiếm của màn hình đang mở (nếu có)
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "k" || e.key === "K") && session && !loadError) { e.preventDefault(); quickSearch(); return; }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "f" || e.key === "F")) { var sb = document.querySelector("#main input.search, main input.search"); if (sb) { e.preventDefault(); sb.focus(); sb.select(); } }
  });
  setInterval(function () { if (session && Date.now() - lastActive > IDLE_MS) { logout("tự khóa sau 30 phút không thao tác", true); toast("Đã tự khóa sau 30 phút không thao tác — đăng nhập lại"); } }, 30000);
  var AUDIT_MAX = 20000;
  function audit(action, detail) {
    db.auditlog.push({ luc: new Date().toISOString(), nguoi: currentUser(), thaoTac: action, chiTiet: detail || "" });
    if (db.auditlog.length > AUDIT_MAX) {
      // Không xóa im lặng: chuyển phần cũ ra bản sao lưu nhật ký trước khi cắt bớt
      if (store && store.backup) { try { store.backup("nhat-ky-truoc-cat"); } catch (e) { /* vẫn cắt để file không phình vô hạn */ } }
      db.auditlog.splice(0, db.auditlog.length - AUDIT_MAX);
    }
  }
  window.hakFlushBeforeClose = function () {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    // 009-C: danh mục đang có bản nháp CHƯA LƯU (danh mục không tự lưu khi nhập) — hỏi trước khi đóng cửa sổ, không để mất nháp âm thầm.
    var catDraft = typeof catDirtyKeys === "function" ? catDirtyKeys() : [];
    if (catDraft.length && !confirm("Có thay đổi CHƯA LƯU ở danh mục " + catDraft.map(function (k) { return (ALL[k] && ALL[k].ten) || k; }).join(", ") + ".\nBấm OK để ĐÓNG ứng dụng và bỏ thay đổi này; bấm Hủy để quay lại lưu.")) return false;
    closingNow = true; var okSave = !dirty || saveNow(); closingNow = false;
    if (okSave) return true;
    // Bản nền cũ (kho đã đổi ở nơi khác): KHÔNG ghi đè; cho đóng nếu người dùng đồng ý bỏ thay đổi chưa lưu của màn hình này, nếu không giữ cửa sổ.
    if (lastSaveStale) { if (confirm("Dữ liệu đã được thay đổi ở nơi khác nên bản đang mở là bản CŨ; app không ghi để tránh ghi đè dữ liệu mới.\n\nBấm OK để ĐÓNG và bỏ thay đổi chưa lưu của màn hình này. Bấm Hủy để giữ cửa sổ.")) { dirty = false; return true; } return false; }
    toast("Chưa lưu được dữ liệu — app giữ cửa sổ mở. " + lastSaveError); return false;
  };
  window.addEventListener("beforeunload", function (e) {
    if (!dirty) return;
    closingNow = true; var okSave = saveNow(); closingNow = false;
    if (okSave) return;
    // Bản nền cũ (kho đã đổi ở nơi khác, thường vì chính app vừa khôi phục/lưu trữ rồi tải lại giao diện): KHÔNG ghi đè và KHÔNG giữ trang.
    // Chromium chặn hộp thoại confirm() trong beforeunload nên không hỏi ở đây (đường đóng cửa sổ hỏi ở hakFlushBeforeClose; đường lưu thường hỏi ở onStaleBase).
    if (lastSaveStale) { dirty = false; return; }
    e.preventDefault(); e.returnValue = false; toast("Chưa lưu được dữ liệu — giữ app mở để thử lại hoặc sao lưu. " + lastSaveError);
  });
  if (!readOnly && (fromLocal || migMsg.length)) saveNow();
  var now = new Date();
  var st = { tab: "home", dm: "dm_luong", nam: now.getFullYear(), thang: now.getMonth() + 1, bu: "to", kq: null, compact: true, q: "", qs: {}, pg: {}, pageSize: 100 };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY + "_ui") || "{}"), { kq: null, q: "", pg: {} }); } catch (e) {}
  if (!st.qs || typeof st.qs !== "object") st.qs = {};
  if ([50, 100, 200, 500].indexOf(+st.pageSize) < 0) st.pageSize = 100;
  function saveUi() { try { localStorage.setItem(KEY + "_ui", JSON.stringify({ tab: st.tab === "nv" ? "nhansu" : st.tab === "slips" && st.kqFull ? "luong" : st.tab, dm: st.dm, nam: st.nam, thang: st.thang, bu: st.bu, compact: st.compact, qs: st.qs, pageSize: st.pageSize })); } catch (e) {} }
  // Giao diện sáng / tối (2.0-α15): ghi nhớ theo máy, mặc định sáng
  function curTheme() { try { return localStorage.getItem(KEY + "_theme") === "dark" ? "dark" : "light"; } catch (e) { return "light"; } }
  function toggleTheme() { var t = curTheme() === "dark" ? "light" : "dark"; try { localStorage.setItem(KEY + "_theme", t); } catch (e) { /* vẫn đổi cho phiên này */ } applyTheme(t); render(); }
  var HAK_SKINS = [["luxe", "Luxury V10.3"], ["classic", "Xanh ngọc"], ["neutral", "Trung tính"], ["champagne", "Vàng champagne"]];
  function curSkin() { try { var k = localStorage.getItem(KEY + "_skin"); return HAK_SKINS.some(function (v) { return v[0] === k; }) ? k : "luxe"; } catch (e) { return "luxe"; } }
  function applySkin(k) { document.documentElement.setAttribute("data-skin", HAK_SKINS.some(function (v) { return v[0] === k; }) ? k : "luxe"); }
  function setSkin(k) { if (!HAK_SKINS.some(function (v) { return v[0] === k; })) return; try { localStorage.setItem(KEY + "_skin", k); } catch (e) {} applySkin(k); render(); }
  applySkin(curSkin());
  applyTheme(curTheme());
  // ---------- Phân trang + tìm kiếm (PERF-03: 1.000 NV mở lưới chấm công 6,9 s, gõ 4 ký tự 19,9 s khi vẽ toàn bộ) ----------
  var PAGE_SIZES = [50, 100, 200, 500];
  function qOf(key) { return fold(String(st.qs[key] || "").trim()); }
  /** Thanh phân trang. Trả { start, end, el }; trang hiện tại nhớ theo bảng trong phiên làm việc. */
  function pager(key, total, onChange) {
    var size = +st.pageSize || 100, pages = Math.max(1, Math.ceil(total / size));
    var p = Math.min(Math.max(0, st.pg[key] || 0), pages - 1); st.pg[key] = p;
    var go = function (x) { st.pg[key] = Math.min(Math.max(0, x), pages - 1); onChange(); };
    var sel = h("select", { title: "Số dòng mỗi trang" }); PAGE_SIZES.forEach(function (n) { sel.appendChild(h("option", { value: n, text: n + " dòng/trang" })); }); sel.value = size;
    sel.addEventListener("change", function () { var first = p * size; st.pageSize = +sel.value; st.pg[key] = Math.floor(first / st.pageSize); saveUi(); onChange(); });
    var el = total <= PAGE_SIZES[0] ? null : h("div", { class: "pager noprint" }, [
      btn("«", "ghost", function () { go(0); }, "Trang đầu"), btn("‹", "ghost", function () { go(p - 1); }, "Trang trước"),
      h("span", { text: "Trang " + (p + 1) + "/" + pages + " · dòng " + (p * size + 1) + "–" + Math.min(total, (p + 1) * size) + " / " + total }),
      btn("›", "ghost", function () { go(p + 1); }, "Trang sau"), btn("»", "ghost", function () { go(pages - 1); }, "Trang cuối"), sel]);
    return { start: p * size, end: Math.min(total, (p + 1) * size), el: el };
  }

  // ---------- Tiện ích ----------
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "on") Object.keys(attrs.on).forEach(function (ev) { el.addEventListener(ev, attrs.on[ev]); });
      else if (k === "text") el.textContent = (typeof attrs[k] === "number" && isFinite(attrs[k]) && !Number.isInteger(attrs[k])) ? qtyText(attrs[k]) : attrs[k]; else if (k === "html") el.innerHTML = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }); // chữ → nút văn bản (icon emoji đầu chuỗi vẫn được đổi)
    return el;
  }
  function btn(text, cls, fn, title) { return h("button", { class: "b " + (cls || ""), text: text, title: title || "", on: { click: fn } }); }
  /** Số lượng (tấn…): làm tròn 3 số lẻ, dấu phẩy thập phân, dấu chấm hàng nghìn — không để lộ sai số dấu phẩy động (17.049999999999997). */
  function ky2() { return ("0" + st.thang).slice(-2); }
  function kyStr() { return st.nam + "-" + ky2(); }
  function rowInKy(r, def) {
    if (def.kyCol) return r[def.kyCol] === kyStr();
    if (def.dateCol) return (VAL.normDate(r[def.dateCol]) || "").slice(0, 7) === kyStr();
    return true;
  }
  function tenNV(ma) { for (var i = 0; i < db.nhanvien.length; i++) if (db.nhanvien[i]["Mã NV"] === ma) return db.nhanvien[i]["Họ và tên"] || ""; return ""; }
  function download(name, mime, content) {
    if(/^LuongHAK_backup_.*\.json$/.test(name)&&(db._yearArchives||[]).length){alert("Dữ liệu có kho hồ sơ năm. Hãy dùng Full Backup để mang theo cả hồ sơ năm và chứng từ khi đổi máy.");return;}
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type: mime })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  // ---------- Excel thật (.xlsx) ----------
  var SAMPLES = {
    nhanvien: [{ "Mã NV": "NV001", "Họ và tên": "Nguyễn Văn An", "Số CCCD": "049090001234", "Ngày tạo hồ sơ": "2024-03-01", "Trạng thái": "Đang làm việc" }],
    canhan: [{ "Mã NV": "NV001", "Số CCCD": "049090001234", "Ngày cấp": "2021-05-10", "Nơi cấp": "Cục CS QLHC về TTXH", "Ngày sinh": "1990-06-15", "Giới tính": "Nam", "Quốc tịch": "Việt Nam", "Dân tộc": "Kinh", "Thường trú": "Quế Sơn, Quảng Nam", "Địa chỉ hiện tại": "Liên Chiểu, Đà Nẵng", "Số điện thoại": "0905123456", "Hiệu lực từ": "2024-03-01" }],
    nhanthan: [{ "Mã NV": "NV001", "Họ tên nhân thân": "Nguyễn Thị Bình", "Quan hệ": "Con", "Ngày sinh": "2018-02-01", "Đăng ký phụ thuộc": "Có", "Hiệu lực từ": "2024-03-01" }],
    thanhtoan: [{ "Mã NV": "NV001", "Số tài khoản": "0123456789", "Tên ngân hàng": "Vietcombank", "Chi nhánh": "Đà Nẵng", "Hiệu lực từ": "2024-03-01" }],
    hopdong: [{ "Mã NV": "NV001", "Số HĐLĐ": "NV001/HĐ01", "Hình thức HĐLĐ": "Xác định thời hạn", "Ngày vào làm": "2024-03-01", "Ngày hết hạn": "2027-02-28" }],
    chitiethd: [{ "Mã NV": "NV001", "Số HĐLĐ": "NV001/HĐ01", "Mã công tác": "NV001/HĐ01-PL01", "Loại phụ lục": "Hợp đồng gốc", "Hiệu lực từ": "2024-03-01", "Phòng ban": "02.01", "Chức vụ": "8", "Mã hình thức lương": "LTG", "Mã lương": "TG1", "Lương cơ bản": 5000000, "Lương thỏa thuận": 9000000, "HTTT": "Chuyển khoản", "Mức đóng bảo hiểm": "BH01", "Thuế TNCN": "LT01", "Phụ cấp": "TN.02", "Hỗ trợ": "HT.01", "Tăng ca": "TC4" }],
    chamcong: [{ "Kỳ": "2026-09", "Mã NV": "NV001", "Hình thức công": "BT", "01": 1, "02": 1, "03": 1, "04": 1, "05": 1, "06": "", "07": 1, "08": 1, "09": "1QC" }, { "Kỳ": "2026-09", "Mã NV": "NV001", "Hình thức công": "TC", "01": 2, "02": 2 }],
    sanluong: [{ "Phiếu cân": 4979, "Ngày cân": "2026-09-01", "Biển số": "43A-97033", "KL hàng (Tấn)": 3.13, "Mã NV": "", "Mã phòng ban": "02.02", "NV vắng": "Kiểu, Long, Lynh, Định", "Cân lần 1": 7540, "Cân lần 2": 4410 },
      { "Phiếu cân": 4980, "Ngày cân": "2026-09-01", "Biển số": "92K-9181", "KL hàng (Tấn)": 9.11, "Mã NV": "", "Mã phòng ban": "02.02", "NV vắng": "", "Cân lần 1": 13770, "Cân lần 2": 4660 },
      { "Phiếu cân": "PC0001", "Ngày cân": "2026-09-15", "Biển số": "43C-12345", "KL hàng (Tấn)": 28.5, "Mã NV": "NV001", "Mã phòng ban": "", "NV vắng": "" }],
    bandam: [{ "Phiếu cân": 201, "Ngày cân": "2026-09-01", "Biển số": "43A-97033", "KL hàng (Tấn)": 1, "Mã NV": "", "Mã phòng ban": "02.02", "NV vắng": "Kiểu, Long, Lynh, Định" },
      { "Phiếu cân": 202, "Ngày cân": "2026-09-01", "Biển số": "92K-9181", "KL hàng (Tấn)": 1, "Mã NV": "", "Mã phòng ban": "02.01", "NV vắng": "" }],
    psluong: [{ "Ngày hạch toán": "2026-09-30", "Số chứng từ": "QĐ-KT/09-01", "Mã NV": "NV001", "Diễn giải": "Thưởng chuyên cần", "Thưởng": 500000, "Thu nhập khác": 0, "Trừ khác": 0 }],
    ungluong: [{ "Ngày hạch toán": "2026-09-15", "Số chứng từ": "PC-0915-01", "Mã NV": "NV001", "Diễn giải": "Tạm ứng kỳ 1", "Tạm ứng": 2000000 }],
    tiencom: [{ "Ngày": "2026-09-15", "Mã NV": "NV001", "Số suất cơm": 1, "Ghi chú": "" }],
    dm_luong: null, dm_phucap: null, dm_tangca: null, dm_hotro: null, dm_baohiem: null, dm_tncn: null, dm_bacthue: null, dm_giamtru: null, dm_phongban: null, dm_chucvu: null, dm_cc: null
  };
  (function () { var sd = HRM.seedDanhMuc(); Object.keys(sd).forEach(function (k) { if (SAMPLES[k] === null) SAMPLES[k] = sd[k]; }); })();
  function excelCell(col, v) { // số thì lưu số, còn lại lưu chữ
    if (v === "" || v == null) return "";
    if (typeof v === "number") return v;
    if (NUMCOLS.test(col) && !DATECOLS.test(col) && /^[\d.,%\s-]+$/.test(String(v)) && String(v).indexOf("%") < 0) return MONEYCOLS.test(col) ? E.money(v) : E.num(v);
    if (/^\d\d$/.test(col) && /^\d+([.,]\d+)?$/.test(String(v))) return E.num(v);
    return v;
  }
  /** V9: bảng lương CÓ FORMULA_ERROR (kỳ chưa chốt) không được xuất như bản chính thức — chặn xuất, yêu cầu sửa công thức trước. */
  function formulaErrorsBlock(what, reportKy) {
    try {
      if (!GATE.requiresPayrollExportCheck(what)) return false;
      if (!db.nhanvien || !db.nhanvien.length) return false;
      var parts = reportKy ? reportKy.split("-").map(Number) : [st.nam, st.thang];
      var src = kqKy(parts[0], parts[1]); if (src.chot) return false;
      var bl = GATE.blockers(src.kq); if (!bl.length) return false;
      alert("⛔ Không xuất được: bảng lương kỳ " + st.thang + "/" + st.nam + " đang có lỗi chặn nên số liệu CHƯA đáng tin cậy:\n\n" +
        bl.map(function (b) { return "• " + b.code + " — " + b.ten + " (" + b.count + "): " + b.items.slice(0, 2).join(" | "); }).join("\n") + "\n\nSửa cấu hình/dữ liệu rồi tính lại. Kỳ đã chốt xuất theo bản chốt.");
      return true;
    } catch (e) { return false; }
  }
  function saveXlsx(filename, sheets, kind) { // sheets: [{name, cols, rows}] · kind "template" = file mẫu trống (không chứa dữ liệu)
    if (kind !== "template" && !need("export", "xuất dữ liệu ra Excel")) return;
    if (kind !== "template" && formulaErrorsBlock(filename)) return;
    if (kind === "pro" && sheets.length === 1 && proXlsx(filename, sheets[0])) return;
    if (kind === "template" && styledTemplate(filename, sheets)) return;
    if (!window.XLSX) { alert("Thiếu thư viện Excel"); return; }
    var wb = XLSX.utils.book_new();
    sheets.forEach(function (sh) {
      var aoa = [sh.cols].concat(sh.rows.map(function (r) { return sh.cols.map(function (c) { return excelCell(c, r[c]); }); }));
      var ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = sh.cols.map(function (c) { return { wch: Math.max(/^\d\d$/.test(c) ? 4 : 10, Math.min(30, c.length + 3)) }; });
      XLSX.utils.book_append_sheet(wb, ws, sheetName(sh.name));
    });
    XLSX.writeFile(wb, filename);
  }
  /** File mẫu nhập liệu có định dạng (tiêu đề tô màu, cố định dòng đầu, dòng ví dụ nền vàng). Cùng tên sheet/cột/giá trị như bản thô. Trả true nếu đã xử lý. */
  function styledTemplate(filename, sheets) {
    if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.templateXlsx) return false;
    var prepared = sheets.map(function (sh) { return { name: sheetName(sh.name), cols: sh.cols, sampleMark: true, rows: sh.rows.map(function (r) { var o = {}; sh.cols.forEach(function (c) { o[c] = excelCell(c, r[c]); }); return o; }) }; });
    window.HAKUi.templateXlsx.build(window.ExcelJS, prepared, { creator: currentUser() }).xlsx.writeBuffer().then(function (buf) {
      download(filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
    }, function (e) { alert("Không tạo được file mẫu: " + e.message); });
    return true;
  }
  /** V10: xuất 1 bảng bằng mẫu Excel chuyên nghiệp (tiêu đề công ty, tên báo cáo, ngày lập, dòng tổng, chữ ký, A4, lặp tiêu đề). Trả true nếu đã xử lý. */
  function proXlsx(filename, sh) {
    if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.reportXlsx || !sh.rows || !sh.rows.length) return false;
    var isoVn = function (v) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(String(v == null ? "" : v)); return m ? m[3] + "/" + m[2] + "/" + m[1] : v; };
    var cols = sh.cols.map(function (c, i) {
      var vals = sh.rows.map(function (r) { return r[c]; }).filter(function (v) { return v !== "" && v != null; });
      var allNum = vals.length > 0 && vals.every(function (v) { return typeof v === "number" || (/^-?\d+(\.\d+)?$/.test(String(v)) && String(v).replace(/^-/, "").charAt(0) !== "0") || String(v) === "0"; });
      var kind = MONEYCOLS.test(c) && allNum ? "money" : allNum && !/^(Mã|Số|CCCD|STK|MST)/.test(c) ? "num" : "text";
      return { key: "c" + i, label: c, kind: kind };
    });
    var rows = sh.rows.map(function (r) { var o = {}; sh.cols.forEach(function (c, i) { o["c" + i] = cols[i].kind === "text" ? isoVn(r[c]) : (r[c] === "" || r[c] == null ? "" : +r[c]); }); return o; });
    var tong = {}; cols.forEach(function (c) { if (c.kind === "money") tong[c.key] = rows.reduce(function (a, r) { return a + (+r[c.key] || 0); }, 0); });
    var d = new Date(), pad = function (n) { return ("0" + n).slice(-2); };
    var vm = { title: String(sh.name || filename).toLocaleUpperCase("vi-VN"), congTy: congTy()["Tên công ty"] || "", kyText: "Kỳ làm việc: " + kyLabel(kyStr()), phamVi: "Theo bộ lọc đang chọn", ngayLap: pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear(), cols: cols, rows: rows, tong: tong, nguoiLap: currentUser() };
    window.HAKUi.reportXlsx.build(window.ExcelJS, vm, { chuKy: ["Người lập", "Kế toán trưởng", "Giám đốc"], nguoiLap: currentUser() }).xlsx.writeBuffer().then(function (buf) {
      download(filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
    }, function (e) { alert("Không tạo được file: " + e.message); });
    return true;
  }
  function templateSheet(key) { var d = ALL[key]; return { name: d.ten, cols: d.cols, rows: SAMPLES[key] || [] }; }
  function downloadTemplate(key) {
    var d = ALL[key];
    var guide = [{ "Cột": "Cách dùng", "Giải thích": "Nhập dữ liệu thật ở dòng mới bên dưới. KHÔNG đổi tên cột (dòng 1). Có thể bỏ bớt cột không dùng. Dòng nền vàng là ví dụ (cột 'Dòng ví dụ' ghi VÍ DỤ): app tự bỏ qua khi nhập." },
      { "Cột": "Số 0 đầu", "Giải thích": "Các cột Mã (Mã NV, Mã phòng ban…), Số tài khoản, Số CCCD, Số HĐLĐ đã định dạng Text: nhập 0005 hay 00123 sẽ giữ nguyên số 0 đầu. Đừng đổi định dạng các cột này sang Number." }];
    if (d.hint) guide.push({ "Cột": "Lưu ý", "Giải thích": d.hint });
    guide.push({ "Cột": "Ngày tháng", "Giải thích": "Nhập kiểu ngày Excel bình thường hoặc 2026-09-15." });
    guide.push({ "Cột": "Nhập vào app", "Giải thích": "Mở app → mục \"" + d.ten + "\" → nút ⬆ Nhập Excel → chọn file này." });
    saveXlsx("Mau_" + slug(d.ten) + ".xlsx", [templateSheet(key), { name: "Hướng dẫn", cols: ["Cột", "Giải thích"], rows: guide }], "template");
  }
  function downloadAllTemplates() { saveXlsx("Mau_TatCa_LuongHAK.xlsx", Object.keys(ALL).map(templateSheet), "template"); toast("Đã tải file mẫu — mỗi bảng là 1 sheet"); }

  // ---------- Trung tâm nhập Excel: đọc → chuẩn hóa → kiểm tra → xem trước → xác nhận → ghi ----------
  function lockedMap() { var m = {}; db.kyluong.forEach(function (k) { m[k.ky] = true; }); return m; }
  function readWorkbook(cb) {
    var f = h("input", { type: "file", accept: ".xlsx,.xls,.csv,.txt" });
    f.addEventListener("change", function () {
      var file = f.files[0]; if (!file) return;
      // Giảm rủi ro thư viện đọc Excel (SheetJS 0.20.3; vẫn giới hạn dung lượng để tránh hết bộ nhớ)
      if (file.size > 20 * 1024 * 1024) { alert("File quá lớn (" + Math.round(file.size / 1048576) + " MB). Giới hạn 20 MB — hãy tách file."); return; }
      var fr = new FileReader();
      fr.onload = function () { try { cb(XLSX.read(fr.result, { type: "array", cellDates: true }), file.name); } catch (e) { alert("Không đọc được file: " + e.message); } };
      fr.readAsArrayBuffer(file);
    });
    f.click();
  }
  /** Dòng ví dụ của file mẫu mới có cột "Dòng ví dụ" = "VÍ DỤ": bỏ qua khi nhập để không ghi nhầm dữ liệu mẫu. */
  var SAMPLE_COL = "Dòng ví dụ";
  function isSampleMarked(row) { return fold(row[SAMPLE_COL]) === "vi du"; }
  function stripSampleAoa(aoa) {
    var hi = -1, ci = -1;
    for (var i = 0; i < Math.min(aoa.length, 30) && ci < 0; i++) { var at = (aoa[i] || []).indexOf(SAMPLE_COL); if (at >= 0) { hi = i; ci = at; } }
    if (ci < 0) return { aoa: aoa, skipped: 0 };
    var out = aoa.filter(function (r, i) { return i <= hi || fold((r || [])[ci]) !== "vi du"; });
    return { aoa: out, skipped: aoa.length - out.length };
  }
  /** File mẫu CŨ (không có cột đánh dấu): dòng trùng hệt dòng ví dụ của app vẫn được giữ (có thể là dữ liệu thật) nhưng được báo để người dùng xem lại. */
  function sampleLookalikes(key, rows) {
    var samples = SAMPLES[key] || []; if (!samples.length) return [];
    var cols = ALL[key].cols, same = function (a, b) { return cols.every(function (c) { return String(a[c] == null ? "" : a[c]).trim() === String(b[c] == null ? "" : b[c]).trim(); }); };
    return rows.filter(function (r) { return !isSampleMarked(r) && samples.some(function (sm) { return same(r, sm); }); });
  }
  // Thứ tự nhập: danh mục → nhân viên → hồ sơ con → dữ liệu phát sinh (để kiểm tra tham chiếu Mã NV đúng)
  function importOrder(keys) { var rank = function (k) { return /^dm_/.test(k) ? 0 : k === "nhanvien" ? 1 : HRT[k] ? 2 : 3; }; return keys.slice().sort(function (a, b) { return rank(a) - rank(b); }); }
  function planWorkbook(wb, onlyKey, mode, pumpMode) {
    var plans = [], extraEmp = {};
    var keys = onlyKey ? [onlyKey] : importOrder(Object.keys(ALL));
    keys.forEach(function (k) {
      var alt = { sanluong: ["Khoi luong", "Khối lượng"], bandam: ["Bom ban dam", "Bơm dăm", "Ban dăm xuất hàng"] }[k] || []; // tên sheet trong mẫu công cụ phân bổ
      var name = wb.SheetNames.filter(function (x) { return x === sheetName(ALL[k].ten); })[0] || wb.SheetNames.filter(function (x) { return alt.indexOf(x) >= 0; })[0];
      if (!name && onlyKey) name = wb.SheetNames[0];
      if (!name) return;
      // α19: Sản lượng / Bơm dăm đọc được cả file theo mẫu công cụ phân bổ (dòng tiêu đề phía trên, tên cột khác: "Ngày cân 1", "Số xe", "Mã phòng ban"…)
      var skipped = 0, aoa = null;
      if (k === "sanluong" || k === "bandam") { var st0 = stripSampleAoa(XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: "" })); aoa = st0.aoa; skipped = st0.skipped; }
      var raw = aoa ? IMP.rowsFromAoa(aoa, k, ALL[k].cols).rows : XLSX.utils.sheet_to_json(wb.Sheets[name], { raw: true, defval: "" });
      if (!aoa) { var kept = raw.filter(function (r) { return !isSampleMarked(r); }); skipped = raw.length - kept.length; raw = kept; }
      if (k === "bandam" && pumpMode && raw.some(function (r) { return C.inputReview.mode(r) !== pumpMode; })) throw Error("File không đúng cách phân bổ đang mở. Theo tổ cần Mã phòng ban, để trống Mã NV; Trực tiếp cần Mã NV.");
      var p = IMP.plan(db, k, ALL[k].cols, C.inputBatch.blankRows(raw), { lockedPeriods: lockedMap(), defaultKy: kyStr(), extraEmployees: extraEmp, mode: mode });
      if (k === "bandam" && pumpMode && p.items.some(function (it) { return it.target && C.inputReview.mode(it.target) !== pumpMode; })) throw Error("File cập nhật khác cách phân bổ. Mở đúng tab để sửa phiếu.");
      p.sheet = name; p.sampleSkipped = skipped; p.sampleLike = sampleLookalikes(k, raw);
      if (k === "nhanvien") p.items.forEach(function (it) { if (it.action === "add" || it.action === "update") extraEmp[it.row["Mã NV"]] = 1; });
      plans.push(p);
    });
    return plans;
  }
  // replan(mode) → danh sách kế hoạch theo chế độ cập nhật ("merge" | "replace")
  var impBusy = false;
  // IMPORT-EXTRA-WARN-BEGIN (009-2/009-3, issue #98): cảnh báo (KHÔNG chặn) ở bản xem trước nhập Excel; chạy ngoài core/importer.js (tệp được CI bảo vệ). Hàm thuần, không phụ thuộc biến ngoài.
  var IMPORT_MONEY_COLS = { psluong: ["Thưởng", "Thu nhập khác", "Trừ khác"], ungluong: ["Tạm ứng"] };
  function importExtraWarn(database, table, row) {
    var out = [], ma = String(row && row["Mã NV"] || "").trim();
    if (["psluong", "ungluong", "tiencom"].indexOf(table) >= 0 && ma) {
      var emp = (database.nhanvien || []).filter(function (n) { return String(n["Mã NV"] || "").trim() === ma; })[0];
      if (emp && /nghỉ/i.test(String(emp["Trạng thái"] || ""))) out.push("NV đã nghỉ việc: kiểm lại (có thể là khoản quyết toán sau nghỉ việc)");
    }
    (IMPORT_MONEY_COLS[table] || []).forEach(function (c) {
      var n = Number(String(row[c] == null ? "" : row[c]).replace(/\s/g, ""));
      if (isFinite(n) && n < 0 && String(row[c]).trim() !== "") out.push("Số tiền âm ở " + c + " (" + row[c] + "): kiểm lại (có thể là điều chỉnh/hoàn ứng hợp lệ)");
    });
    return out.join("; ");
  }
  // IMPORT-EXTRA-WARN-END
  // IMPORT-NEARDUP-BEGIN (013-B, issue #114): "Nghi trùng" — dòng `add` có khóa chuẩn hóa (nv01 = NV 01 = ＮＶ01; pc-001 = PC - 001) trùng dòng đang có hoặc dòng trước trong file thì KHÔNG ghi. Chạy ngoài core/importer.js (tệp được CI bảo vệ); chỉ so sánh, không đổi giá trị đã lưu.
  function importNearDup(database, plans) {
    if (!IMP.LABEL.neardup) IMP.LABEL.neardup = "Nghi trùng (không ghi)";
    plans.forEach(function (p) {
      var cols = VAL.NEAR_COLS && VAL.NEAR_COLS[p.table]; if (!cols) return;
      var text = function (r) { return cols.map(function (c) { return String(r[c] == null ? "" : r[c]).trim(); }).join(" / "); }, seen = {};
      (database[p.table] || []).forEach(function (r) { var k = VAL.nearKeyOf(p.table, r); if (k && !seen[k]) seen[k] = text(r); });
      p.summary.neardup = 0;
      p.items.forEach(function (it) {
        if (it.action !== "add" && it.action !== "update") return;
        var k = VAL.nearKeyOf(p.table, it.row);
        if (!k) return;
        if (seen[k] && it.action === "add") { it.action = "neardup"; it.reason = "Nghi trùng: giống " + seen[k] + " đã có — chỉ khác chữ hoa/thường, khoảng trắng hoặc ký tự; không ghi để tránh nhân đôi"; return; }
        if (!seen[k]) seen[k] = text(it.row);
      });
      Object.keys(p.summary).forEach(function (k) { p.summary[k] = 0; }); p.items.forEach(function (it) { p.summary[it.action] = (p.summary[it.action] || 0) + 1; });
    });
  }
  // IMPORT-NEARDUP-END
  function importPreview(replan, fileName, done, mode) {
    impBusy = false;
    mode = mode || "merge";
    var plans; try { plans = replan(mode); } catch (e) { alert(e.message); return; }
    plans.forEach(function (p) { p.items.forEach(function (it) { if (it.action !== "add" && it.action !== "update") return; var w = importExtraWarn(db, p.table, it.row); if (w) it.warn = (it.warn ? it.warn + "; " : "") + w; }); });
    // 1 người 1 Mã NV: dòng gán CCCD của người khác (đã có, hoặc dòng khác trong file) → Xung đột (không ghi) — core/identity.js
    plans.forEach(function (p) { ID.blockImportItems(db, p.table, p.items); });
    importNearDup(db, plans); // 013-B: nghi trùng theo khóa chuẩn hóa
    // Quyền theo từng bảng + chỉ Admin được ghi dữ liệu hồi tố (Q-14): dòng không đủ quyền → không ghi
    plans.forEach(function (p) {
      var perm = /^dm_/.test(p.table) ? "dm.edit" : (S[p.table] ? "input.edit" : "hr.edit"), okT = can(perm);
      p.items.forEach(function (it) {
        if (it.action !== "add" && it.action !== "update") return;
        if (!okT) { it.action = "locked"; it.reason = "Vai trò của bạn không có quyền ghi bảng này (" + PERM.PERMS[perm] + ")"; return; }
        if (p.table === "chamcong") {
          var leaveError = C.leaveReconciliation.attendanceMutation(db, it.target || null, Object.assign({}, it.target || {}, it.row));
          if (leaveError) { it.action = "locked"; it.reason = leaveError; return; }
        }
        if (it.action === "update" && p.table === "chitiethd" && GRD.frozenAppendix(db, it.target).length) { it.action = "locked"; it.reason = "Phụ lục đã dùng tính lương kỳ đã chốt " + GRD.frozenAppendix(db, it.target).map(GRD.label).join(", ") + " — không sửa được, hãy thêm phụ lục mới (Q-15)"; return; }
        if (!can("retro.edit")) {
          var imp0 = GRD.impactChange(db, p.table, it.target || null, Object.assign({}, it.target || {}, it.row));
          if (imp0.kind === "retro") { it.action = "locked"; it.reason = "HỒI TỐ kỳ đã chốt " + imp0.periods.map(GRD.label).join(", ") + " — chỉ Admin được ghi"; }
        }
      });
      Object.keys(p.summary).forEach(function (k) { p.summary[k] = 0; }); p.items.forEach(function (it) { p.summary[it.action] = (p.summary[it.action] || 0) + 1; });
    });
    if (!plans.length) { alert("Không thấy sheet nào đúng tên (Nhân viên, Chấm công, Mã lương...). Hãy dùng file mẫu của app."); return; }
    var body = h("div"), tot = {};
    Object.keys(IMP.LABEL).forEach(function (k) { tot[k] = 0; });
    plans.forEach(function (p) { Object.keys(tot).forEach(function (k) { tot[k] += p.summary[k] || 0; }); });
    body.appendChild(h("div", { class: "hint", html: "File <b>" + esc(fileName) + "</b> — kiểm tra trước khi ghi. Chỉ dòng <b>Thêm mới</b> và <b>Cập nhật</b> được ghi; dòng <b>Gộp</b> đã được cộng vào dòng cùng khóa; các dòng lỗi/trùng/xung đột/kỳ đã chốt bị bỏ qua." }));
    // Q-13 (chủ sở hữu xác nhận): khi file có dòng TRÙNG với dữ liệu đã có → người dùng chọn Bổ sung hay Ghi đè
    var nSame = 0; plans.forEach(function (p) { p.items.forEach(function (it) { if (it.target) nSame++; }); });
    var choice = h("div", { class: nSame ? "warn" : "hint", style: "margin:8px 0 12px" });
    choice.appendChild(h("div", { html: nSame ? "<b>File có " + nSame + " dòng trùng với dữ liệu đã có.</b> Chọn cách xử lý:" : "Cách xử lý nếu có dòng trùng với dữ liệu đã có:" }));
    [["merge", "Bổ sung", "chỉ thêm/sửa ô có dữ liệu trong file — ô để trống GIỮ NGUYÊN số đang có (mặc định, an toàn)"],
      ["replace", "Ghi đè", "thay cả dòng theo file — ô để trống trong file sẽ XÓA số đang có"]].forEach(function (o) {
      var r0 = h("input", { type: "radio", name: "impmode", value: o[0], "data-mode": o[0] }); r0.checked = mode === o[0];
      r0.addEventListener("change", function () { if (r0.checked) importPreview(replan, fileName, done, o[0]); });
      choice.appendChild(h("label", { style: "display:flex;gap:8px;align-items:flex-start;margin:6px 0;cursor:pointer" }, [r0, h("span", { html: "<b>" + o[1] + "</b> — " + o[2] })]));
    });
    body.appendChild(choice);
    var sumRows = plans.map(function (p) { var o = { "Bảng": ALL[p.table].ten, "Sheet": p.sheet }; Object.keys(IMP.LABEL).forEach(function (k) { o[IMP.LABEL[k]] = p.summary[k] || 0; }); return o; });
    body.appendChild(simpleTable(sumRows));
    var recon = importTotals(plans, E.num), reconRows = [];
    recon.forEach(function (t) {
      var money = importMoneyEq(t, IMPORT_SUM_COLS[t.table] || [], fmt);
      reconRows.push({ "Bảng": ALL[t.table].ten, "Dòng trong file": t.file.rows, "Sẽ ghi": t.ghi.rows, "Gộp vào dòng khác": t.gop.rows, "Không ghi": t.khong.rows, "Tổng (file = ghi + gộp + không ghi)": money || "—" });
    });
    body.appendChild(h("div", { class: "fh", text: "Đối chiếu với file nguồn" })); body.appendChild(h("div", { "data-imp-recon": "1" }, [simpleTable(reconRows)]));
    var skipTotal = 0, lookTotal = 0; plans.forEach(function (p) { skipTotal += p.sampleSkipped || 0; lookTotal += (p.sampleLike || []).length; });
    if (skipTotal) body.appendChild(h("div", { class: "hint", "data-imp-sample": "skipped", text: "Đã bỏ qua " + skipTotal + " dòng ví dụ của file mẫu (cột 'Dòng ví dụ' ghi VÍ DỤ) — không ghi vào dữ liệu." }));
    if (lookTotal) body.appendChild(h("div", { class: "warn", "data-imp-sample": "lookalike", text: "⚠ " + lookTotal + " dòng trùng hệt dòng ví dụ của file mẫu (" + plans.filter(function (p) { return (p.sampleLike || []).length; }).map(function (p) { return ALL[p.table].ten + ": " + p.sampleLike.slice(0, 3).map(function (r) { return r["Mã NV"] || r[ALL[p.table].cols[0]] || "?"; }).join(", "); }).join(" · ") + "). Vẫn được ghi nếu là dữ liệu thật — kiểm tra lại trước khi bấm Ghi, và xóa dòng ví dụ khỏi file." }));
    var clears = 0, retro = {};
    plans.forEach(function (p) { p.items.forEach(function (it) {
      if (it.action === "update" && it.diff) clears += it.diff.clear.length;
      if (it.action !== "add" && it.action !== "update") return;
      var imp = GRD.impactChange(db, p.table, it.target || null, Object.assign({}, it.target || {}, it.row));
      if (imp.kind === "retro") { it.reason = (it.reason ? it.reason + " · " : "") + "HỒI TỐ kỳ đã chốt " + imp.periods.map(GRD.label).join(", "); imp.periods.forEach(function (x) { retro[x] = 1; }); }
    }); });
    if (Object.keys(retro).length) body.appendChild(h("div", { class: "warn", text: "⚠ Có dòng có hiệu lực hồi tố trong kỳ đã chốt " + Object.keys(retro).sort().map(GRD.label).join(", ") + ". Bảng lương đã chốt KHÔNG thay đổi — muốn áp dụng phải mở chốt và chốt lại." }));
    if (clears) body.appendChild(h("div", { class: "warn", text: "⚠ Chế độ ghi đè sẽ XÓA " + clears + " ô đang có dữ liệu (ô trống trong file). Kiểm tra cột 'Lý do' bên dưới." }));
    var rows = [];
    var nWarn = 0;
    plans.forEach(function (p) { p.items.forEach(function (it) { if (it.warn && (it.action === "add" || it.action === "update")) nWarn++; if (it.action !== "add" || /HỒI TỐ/.test(it.reason) || it.warn) rows.push({ "Bảng": ALL[p.table].ten, "Dòng Excel": it.line, "Phân loại": IMP.LABEL[it.action], "Lý do": it.reason, "Cách sửa": importFixHint(it.action, it.reason), "Cảnh báo": it.warn || "", "Mã NV": it.row["Mã NV"] || "" }); }); });
    if (nWarn) body.appendChild(h("div", { class: "warn", text: "⚠ " + nWarn + " dòng sẽ ghi nhưng có ô bất thường (VD quá " + VAL.MAX_CONG_NGAY + " công/ngày, nhãn chưa có mã phụ cấp) — xem cột 'Cảnh báo'." }));
    var order = { conflict: 0, neardup: 0, invalid: 1, refError: 2, locked: 3, update: 4, add: 4, merged: 5, duplicate: 6 }, byLabel = {};
    Object.keys(IMP.LABEL).forEach(function (k) { byLabel[IMP.LABEL[k]] = k; });
    rows.sort(function (a, b) { return order[byLabel[a["Phân loại"]]] - order[byLabel[b["Phân loại"]]]; });
    if (rows.length) { body.appendChild(h("div", { class: "fh", text: "Chi tiết các dòng cập nhật / không ghi (" + rows.length + ")" })); body.appendChild(simpleTable(rows.slice(0, 200))); if (rows.length > 200) body.appendChild(h("div", { class: "hint", text: "… và " + (rows.length - 200) + " dòng nữa — bấm 'Tải chi tiết' để xem đủ." })); }
    var nWrite = tot.add + tot.update, previewRev = dbRev;
    modal("Xem trước nhập Excel", body, function (close) {
      return [
        importErrorSheets(plans, function (t) { return ALL[t].cols; }, function (t) { return sheetName(ALL[t].ten); }).length ? btn("⬇ Tải file lỗi để sửa & nhập lại", "", function () { saveXlsx("LoiNhapExcel_CanSua.xlsx", importErrorSheets(plans, function (t) { return ALL[t].cols; }, function (t) { return sheetName(ALL[t].ten); })); }) : null,
        rows.length ? btn("⬇ Tải chi tiết", "", function () { saveXlsx("KiemTraNhapExcel.xlsx", [{ name: "ChiTiet", cols: Object.keys(rows[0]), rows: rows }]); }) : null,
        btn("Hủy", "", close),
        btn(nWrite ? "✔ Ghi " + nWrite + " dòng" : "Không có dòng nào để ghi", "pri", function () {
          if (!nWrite) { close(); return; }
          if (impBusy) return;
          if (previewRev !== dbRev) { alert("Dữ liệu đã đổi. Kiểm tra lại bản xem trước trước khi ghi."); importPreview(replan, fileName, done, mode); return; }
          impBusy = true; // V9: chống bấm 2 lần → không nhân đôi dòng
          // P1: thao tác này đã có "before" + hoàn tác riêng khi saveNow() thất bại (an toàn dù sao lưu
          // dưới đây có thất bại hay không) — nên chỉ CẢNH BÁO, không chặn, nếu không tạo được bản sao lưu.
          var bkOk = !!backupNow("truoc-nhap-excel");
          var result;
          try { result = REPO.importWorkbook(plans, fileName, mode, function (table) { return !!(ALL[table] && ALL[table].hr); }); }
          finally { impBusy = false; }
          if (!result.ok) {
            close(); (done || render)();
            alert("⚠ Chưa nhập Excel. Dữ liệu trước khi nhập vẫn được giữ: " + (result.msg || lastTxnError));
            return;
          }
          var n = result.value;
          close(); if (done) done(true, plans); else render();
          toast("Đã ghi " + n + " dòng" + (plans.some(function (p) { return ["chamcong", "sanluong", "bandam"].indexOf(p.table) >= 0; }) ? " Nháp — cần Lưu để tính lương" : "") + " (" + tot.add + " mới, " + tot.update + " cập nhật" + (tot.merged ? ", gộp " + tot.merged : "") + ")" + " · Đối chiếu: file " + recon.reduce(function (n, t) { return n + t.file.rows; }, 0) + " dòng = ghi " + recon.reduce(function (n, t) { return n + t.ghi.rows; }, 0) + " + gộp " + recon.reduce(function (n, t) { return n + t.gop.rows; }, 0) + " + không ghi " + recon.reduce(function (n, t) { return n + t.khong.rows; }, 0) + (bkOk ? "" : " · ⚠ KHÔNG tạo được bản sao lưu trước khi nhập — kiểm tra dung lượng đĩa"));
        })];
    });
  }
  // IMPORT-REPORT-BEGIN (009-B, issue #98): "sửa thế nào", file lỗi để sửa-rồi-nhập-lại, đối chiếu tổng với file nguồn. Hàm thuần (không phụ thuộc biến ngoài) — test lấy nguyên văn từ app.js.
  var IMPORT_SUM_COLS = { sanluong: ["KL hàng (Tấn)"], bandam: ["KL hàng (Tấn)"], psluong: ["Thưởng", "Thu nhập khác", "Trừ khác"], ungluong: ["Tạm ứng"], tiencom: ["Số suất cơm"] };
  var IMPORT_BAD = { invalid: 1, refError: 1, conflict: 1, locked: 1, neardup: 1 };
  function importFixHint(action, reason) {
    var r = String(reason || ""), m;
    if (action === "invalid") {
      if ((m = r.match(/Thiếu ([^;]+)/))) return "Điền giá trị cho cột " + m[1].trim() + " rồi nhập lại file này";
      if (/phải là số/.test(r)) return "Nhập số (ví dụ 2 hoặc 1,5), không nhập chữ";
      if (/Số tiền không đọc được/.test(r)) return "Nhập số tiền như 500000 hoặc 500.000 (không chữ, không ký hiệu lạ)";
      if (/Ngày không hợp lệ/.test(r)) return "Nhập ngày dạng 15/09/2026 hoặc 2026-09-15 (ngày phải có thật trong tháng)";
      if (/Kỳ không hợp lệ/.test(r)) return "Nhập kỳ dạng 2026-09";
      if (/Ngày \d\d/.test(r)) return "Ô ngày chấm công: nhập số công như 1, 0.5, 1,5 hoặc 1QC (không số âm/chữ lạ)";
      return "Sửa ô nêu ở cột Lý do rồi nhập lại file này";
    }
    if (action === "refError") return "Thêm nhân viên này ở màn Nhân sự trước, hoặc sửa Mã NV cho đúng (giữ số 0 đầu, đúng chữ hoa/thường)";
    if (action === "neardup") return "Dòng này giống một bản ghi đã có (chỉ khác chữ hoa/thường/khoảng trắng). Nếu là người/phiếu mới: đổi Mã/Số phiếu cho khác hẳn rồi nhập lại; nếu là dòng cũ: bỏ dòng này";
    if (action === "conflict") return "Giữ một dòng; xóa hoặc sửa dòng còn lại để khác khóa (hoặc cho cùng số liệu)";
    if (action === "locked") return "Kỳ đã chốt lương: nếu cần sửa thì mở chốt (ghi lý do) trước, không thì bỏ dòng này";
    if (action === "duplicate") return "Không cần làm gì (dòng đã có)";
    return "";
  }
  /** Đối chiếu theo bảng: số dòng + tổng các cột số của FILE NGUỒN = ghi + gộp + không ghi. num: hàm đọc số (engine.num). */
  function importTotals(plans, num) {
    return plans.map(function (p) {
      var cols = IMPORT_SUM_COLS[p.table] || [], z = function () { var o = { rows: 0, sums: {} }; cols.forEach(function (c) { o.sums[c] = 0; }); return o; };
      var t = { table: p.table, file: z(), ghi: z(), khong: z(), gop: z() };
      (p.items || []).forEach(function (it) {
        var g = it.action === "add" || it.action === "update" ? t.ghi : it.action === "merged" ? t.gop : t.khong;
        [t.file, g].forEach(function (b) { b.rows++; cols.forEach(function (c) { b.sums[c] += num(it.row && it.row[c]); }); });
      });
      return t;
    });
  }
  /** Các sheet "lỗi để sửa": đúng cột của bảng (đọc lại được bằng chính chức năng Nhập Excel) + Dòng Excel / Lỗi / Cách sửa ở cuối (cột lạ bị bỏ qua khi nhập lại). */
  function importErrorSheets(plans, colsOf, nameOf) {
    var sheets = [];
    plans.forEach(function (p) {
      var bad = (p.items || []).filter(function (it) { return IMPORT_BAD[it.action]; });
      if (!bad.length) return;
      var cols = colsOf(p.table);
      sheets.push({ name: nameOf(p.table), cols: cols.concat(["Dòng Excel", "Lỗi", "Cách sửa"]), rows: bad.map(function (it) {
        var o = {}; cols.forEach(function (c) { o[c] = it.row && it.row[c] != null ? it.row[c] : ""; });
        o["Dòng Excel"] = it.line; o["Lỗi"] = it.reason || ""; o["Cách sửa"] = importFixHint(it.action, it.reason); return o;
      }) });
    });
    return sheets;
  }
  /** Chuỗi đối chiếu TIỀN của một bảng: "<cột>: file X = ghi Y + gộp Z + không ghi W" (đủ ba số hạng để phương trình luôn đúng, kể cả khi có dòng gộp). fmt: hàm định dạng số. */
  function importMoneyEq(t, cols, fmt) {
    return (cols || []).map(function (c) { return c + ": file " + fmt(t.file.sums[c]) + " = ghi " + fmt(t.ghi.sums[c]) + " + gộp " + fmt(t.gop.sums[c]) + " + không ghi " + fmt(t.khong.sums[c]); }).join(" · ");
  }
  // IMPORT-REPORT-END
  function importFile(key, done, pumpMode) { if (!need("import", "nhập Excel")) return; readWorkbook(function (wb, name) { importPreview(function (m) { return planWorkbook(wb, key, m, pumpMode); }, name, done); }); }
  function importAllFile() { if (!need("import", "nhập Excel")) return; readWorkbook(function (wb, name) { importPreview(function (m) { return planWorkbook(wb, null, m); }, name, render); }); }

  function modal(title, body, footer, opts) {
    if (opts && opts.drawer && st.hdModal && !opts.onClose) opts = Object.assign({}, opts, { onClose: function () { hdReopen(); } });
    var m = $("#modal"); m.innerHTML = ""; m.className = (opts && opts.drawer ? "drawer" : "") + (opts && opts.stable ? " stable-modal" : "");
    var close = function () { m.className = "hide"; m.innerHTML = ""; if (opts && opts.onClose) opts.onClose(); };
    var d = h("div", { class: "dlg" + (opts && opts.wide ? " wide" : "") + (opts && opts.stable ? " stable-edit" : ""), role: "dialog", "aria-modal": "true", "aria-label": title }, [h("header", {}, [h("h3", { text: title }), btn("✕", "ghost", close)]), h("div", { class: "bd" }, [body]), footer ? h("footer", {}, footer(close)) : null]);
    // Form nhập liệu chỉ đóng bằng nút rõ ràng. Kéo chọn chữ rồi thả ngoài dlg
    // có thể tạo click với target là nền modal và làm mất toàn bộ bản nháp.
    m.appendChild(d); m.onclick = null;
    return close;
  }
  // Hộp nhập chữ của app (Electron KHÔNG hỗ trợ window.prompt — trả về null nên các nút dùng prompt sẽ không chạy)
  function askText(title, message, opts, cb) {
    opts = opts || {};
    var body = h("div"), inp = h(opts.multiline ? "textarea" : "input", { class: "i", style: "width:100%", placeholder: opts.placeholder || "" });
    if (opts.type) inp.type = opts.type;
    inp.value = opts.value || "";
    String(message || "").split("\n").forEach(function (ln) { body.appendChild(h("div", { class: ln.trim() ? "" : "hint", text: ln || " ", style: "margin:2px 0" })); });
    body.appendChild(h("div", { class: "fld", style: "margin-top:10px" }, [h("label", { text: (opts.label || "Nội dung") + (opts.required ? " *" : "") }), inp]));
    var closeFn = modal(title, body, function (close) {
      return [btn("Hủy", "", close), btn(opts.okText || "Đồng ý", "pri", function () {
        var v = inp.value.trim();
        if (opts.required && !v) { inp.focus(); toast("Vui lòng nhập " + (opts.label || "nội dung")); return; }
        if (opts.pattern && v && !opts.pattern.test(v)) { inp.focus(); toast(opts.patternMsg || "Giá trị không hợp lệ"); return; }
        close(); cb(v);
      })];
    });
    setTimeout(function () { inp.focus(); }, 30);
    return closeFn;
  }
  // Hộp nhập MẬT KHẨU (che ký tự, KHÔNG cắt khoảng trắng, không ghi vào dữ liệu/nhật ký). opts: confirm (nhập 2 lần), optional (cho phép bỏ trống), okText
  function askPassword(title, message, opts, cb) {
    opts = opts || {};
    var body = h("div"), p1 = h("input", { class: "i", type: "password", style: "width:100%", autocomplete: "off", "data-pw": "1" }), p2 = opts.confirm ? h("input", { class: "i", type: "password", style: "width:100%", autocomplete: "off", "data-pw2": "1" }) : null;
    String(message || "").split("\n").forEach(function (ln) { body.appendChild(h("div", { class: ln.trim() ? "" : "hint", text: ln || " ", style: "margin:2px 0" })); });
    body.appendChild(h("div", { class: "fld", style: "margin-top:10px" }, [h("label", { text: "Mật khẩu" + (opts.optional ? " (bỏ trống = không mã hóa)" : "") }), p1]));
    if (p2) body.appendChild(h("div", { class: "fld" }, [h("label", { text: "Nhập lại mật khẩu" }), p2]));
    var closeFn = modal(title, body, function (close) {
      return [btn("Hủy", "", close), btn(opts.okText || "Đồng ý", "pri", function () {
        var v = p1.value;
        if (!v && opts.optional) { close(); cb(""); return; }
        if (!v) { p1.focus(); toast("Vui lòng nhập mật khẩu"); return; }
        if (p2 && p2.value !== v) { p2.focus(); toast("Hai lần nhập mật khẩu không giống nhau"); return; }
        if (opts.check) { var bad = opts.check(v); if (bad) { p1.focus(); toast(bad); return; } }
        close(); cb(v);
      })];
    });
    setTimeout(function () { p1.focus(); }, 30);
    return closeFn;
  }
  function countOf(k) { return db[k] ? db[k].length : 0; }

  // ---------- Ô nhập dùng chung ----------
  function datalistFor(col, tableKey) {
    var src = { "Mã PB": ["dm_phongban", "Mã phòng ban"], "Mã CV": ["dm_chucvu", "Mã chức vụ"], "Mã tiền lương 1": ["dm_luong", "Mã lương"], "Mã tiền lương 2": ["dm_luong", "Mã lương"], "Mã tăng ca": ["dm_tangca", "Mã tăng ca"], "Mã phụ cấp": ["dm_phucap", "Mã phụ cấp"], "Mã hỗ trợ": ["dm_hotro", "Mã hỗ trợ"], "Mã hỗ trợ 2": ["dm_hotro", "Mã hỗ trợ"], "Mã BHXH": ["dm_baohiem", "Mã bảo hiểm"], "Mã GT_TNCN_BT": ["dm_giamtru", "Mã giảm trừ"], "Mã GT_TNCN_PT": ["dm_giamtru", "Mã giảm trừ"], "Mã thuế TNCN": ["dm_tncn", "Mã thuế TNCN"], "Mã TNCN": null };
    if (col === "Mã TNCN") return ["TNCN0", "TNCN1", "TNCN2"];
    if (col === "Hình thức công") { var hs = db.dm_cc.map(function (r) { return r["Hình thức công"]; }).filter(Boolean); return hs.length ? hs.filter(function (v, i) { return hs.indexOf(v) === i; }) : ["BT", "CL", "PN", "CC", "TC", "DC", "TRCH"]; }
    if (col === "Mã hình thức lương") return ["LTG", "LSP"];
    if (tableKey === "dm_congthuc" && col === "Loại") return ["OVERTIME", "ALLOWANCE", "SUPPORT"];
    if ((tableKey === "dm_congthuc" || tableKey === "dm_quychebu") && col === "Trạng thái") return ["Nháp", "Đã duyệt", "Hiệu lực", "Ngừng"];
    if (tableKey === "dm_quychebu" && col === "Cách bù") return BU_OPTS.map(function (o) { return o[0]; });
    var s = src[col]; if (!s) return null;
    var seen = {}, out = []; db[s[0]].forEach(function (r) { var v = r[s[1]]; if (v && !seen[v]) { seen[v] = 1; out.push(v); } });
    return out;
  }
  // ---------- Ô nhập ngày dd/MM/yyyy (V10): gõ tay được (01/02/2026, 1-2-2026, 01022026), kiểm tra ngày thật (năm nhuận), không lệch múi giờ ----------
  /** Dựng ô nhập ngày: hiển thị dd/MM/yyyy; ngày sai → viền đỏ + gợi ý, KHÔNG tự đổi thành ngày khác. */
  function dateField(iso, attrs) {
    var i = h("input", Object.assign({ type: "text", inputmode: "numeric", placeholder: "dd/MM/yyyy", maxlength: "10", autocomplete: "off", class: "dateinp" }, attrs || {}));
    var n0 = VAL.normDate(iso); i.value = n0 ? n0.slice(8, 10) + "/" + n0.slice(5, 7) + "/" + n0.slice(0, 4) : (iso || "");
    i.addEventListener("blur", function () { dateFix(i); });
    i.addEventListener("change", function () { dateFix(i); });
    return i;
  }
  /** "" nếu trống · "YYYY-MM-DD" nếu đúng · null nếu SAI (ngày không tồn tại). */
  // Cột tiền: hiển thị 15.000.000 / 1.250,5 (dấu chấm phân nghìn, phẩy thập phân), canh phải; lưu số thuần
  var MONEYCOLS = /^(Thưởng|Thu nhập (khác|từ|đến)|Trừ khác|Tạm ứng|Số tiền.*|Đơn giá.*|Lương (phụ|thỏa thuận)|Trừ nhanh|Tiền tăng ca.*|Mức tiền)$/;
  /** Gõ tới đâu chèn dấu chấm phân nghìn tới đó (giữ vị trí con trỏ). Chỉ đụng chuỗi chỉ gồm chữ số, hoặc đã nhóm 3 chữ số vừa gõ thêm 1 chữ số; "1.5" (thập phân) giữ nguyên. */
  var dlId = 0;
  function makeInput(col, value, onchange, opts, tableKey) {
    var isDate = DATECOLS.test(col), inp = isDate ? dateField(value == null ? "" : value) : h("input", { value: value == null ? "" : value });
    if (NUMCOLS.test(col) && !isDate) inp.className = "num";
    var isMoney = (MONEYCOLS.test(col) || VAL.isMoneyCol(col)) && !isDate;
    if (isMoney) { inp.className = "num money"; inp.value = moneyText(inp.value); inp.addEventListener("input", function () { moneyLive(inp); }); inp.addEventListener("blur", function () { inp.value = moneyText(inp.value); }); }
    var list = col === "Mã NV" ? "dsnv" : null, opts2 = list ? null : datalistFor(col, tableKey);
    if (list) inp.setAttribute("list", "dsnv");
    else if (opts2 && opts2.length) { var id = "dl" + (++dlId), dl = h("datalist", { id: id }); opts2.forEach(function (o) { dl.appendChild(h("option", { value: o })); }); inp.setAttribute("list", id); inp._dl = dl; }
    if (col === "KL hàng (Tấn)") inp.addEventListener("change", function () {
      var t = inp.value.trim(), bad = t !== "" && !/^\d+([.,]\d+)?$/.test(t) && !/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t);
      inp.classList.toggle("invalid", bad); if (bad) inp.title = "Khối lượng phải là số (ví dụ 12,5)"; else inp.title = "";
      if (/^\d{1,3}[.,]\d{3}$/.test(t)) toast("Ô tấn \"" + t + "\" được hiểu là " + t.replace(",", ".") + " tấn (dấu , hoặc . là dấu thập phân). Nếu ý bạn là hàng nghìn thì nhập " + t.replace(/[.,]/, "") + ".");
    });
    inp.addEventListener("change", function () { var iv = isDate ? dateIso(inp) : null, raw = inp.value.trim(); if (isMoney && raw && !isNaN(VAL.parseMoney(raw))) raw = String(VAL.parseMoney(raw)); onchange(isDate && iv ? iv : raw); });
    return inp;
  }
  function refreshNVList() {
    var dl = $("#dsnv"); if (!dl) { dl = h("datalist", { id: "dsnv" }); document.body.appendChild(dl); }
    dl.innerHTML = ""; db.nhanvien.forEach(function (r) { dl.appendChild(h("option", { value: r["Mã NV"], label: r["Họ và tên"] || "" })); });
  }

  // ---------- HAK Smart Filter (V10.3): lõi HAKCore.sf + giao diện HAKUI.smartFilter; cấu hình từng màn hình đặt cạnh màn hình đó ----------
  var SFC = window.HAKCore.sf;
  var sfUi = window.HAKUI.smartFilter.create({ h: h, btn: btn, toast: toast, askText: askText, dateField: dateField, dateIso: dateIso });
  /** Danh sách kỳ cho ô "Kỳ lương": các kỳ đã có trong kỳ lương, trong dữ liệu của bảng và kỳ đang chọn (mới → cũ). */
  function sfPeriods(rows, dateCol) {
    var ids = {}; (db.kyluong || []).forEach(function (k) { if (k.ky) ids[k.ky] = 1; });
    if (dateCol) (rows || []).forEach(function (r) { var d = LF.isoDay(r[dateCol]); if (d) ids[d.slice(0, 7)] = 1; }); ids[kyStr()] = 1;
    return Object.keys(ids).sort().reverse().map(function (k) { return { value: k, label: "Kỳ " + k.slice(5) + "/" + k.slice(0, 4) + (kyChot(k) ? " 🔒" : "") }; });
  }
  /** Ô chọn kỳ dạng "Kỳ MM/YYYY" (cùng kiểu bộ lọc Smart Filter) — dùng thay ô tháng gốc của trình duyệt (hiện tiếng Anh, không đồng bộ giao diện). */
  function kyPicker(value, attrs) {
    var ids = {}, sel = h("select", Object.assign({ "aria-label": "Kỳ lương" }, attrs || {}));
    (db.kyluong || []).forEach(function (k) { if (k.ky) ids[k.ky] = 1; });
    for (var d = -36; d <= 6; d++) { var dt = new Date(st.nam, st.thang - 1 + d, 1); ids[dt.getFullYear() + "-" + ("0" + (dt.getMonth() + 1)).slice(-2)] = 1; }
    if (value) ids[value] = 1;
    Object.keys(ids).sort().reverse().forEach(function (k) { var o = h("option", { value: k, text: "Kỳ " + k.slice(5) + "/" + k.slice(0, 4) + (kyChot(k) ? " 🔒" : "") }); if (k === value) o.selected = true; sel.appendChild(o); });
    return sel;
  }
  function plfOf(key) { st.plf = st.plf || {}; return st.plf[key] = st.plf[key] || { pb: [], tu: "", den: "", thang: "", ky: "" }; }
  function catF(key) { st.catf = st.catf || {}; return st.catf[key] = st.catf[key] || { tt: "", hl: "" }; }
  /** Danh mục: lọc theo Trạng thái và Hiệu lực (đang / chưa / đã hết) tại ngày hôm nay — chỉ chọn dòng hiển thị. */
  var INPUT_FILTER = { psluong: "Ngày hạch toán", ungluong: "Ngày hạch toán", tiencom: "Ngày" };
  var INPUT_SUM = { psluong: ["Thưởng", "Thu nhập khác", "Trừ khác"], ungluong: ["Tạm ứng"], tiencom: ["Số suất cơm"] };
  function moneySourceTable(key, rows, editable, after) {
    return simpleTable(rows.map(function (r) {
      var line = {};
      S[key].cols.forEach(function (c) {
        line[c] = c === "Ngày hạch toán" ? fmtDate(r[c]) : INPUT_SUM[key].indexOf(c) >= 0 ? fmt(E.money(r[c])) : r[c];
      });
      if (editable && !kyChot(VAL.rowPeriod(key, r))) line["Thao tác"] = btn("Sửa dòng", "", function () {
        var index = db[key].indexOf(r);
        if (index < 0) { alert("Dòng đã thay đổi. Hãy mở lại đối soát."); return; }
        inputRowEdit(key, S[key], index, after);
      });
      return line;
    }), null, editable ? S[key].cols.concat("Thao tác") : S[key].cols);
  }

  function moneyInputReview(key, rows, nameOf) {
    var scope = inputScopeText(key);
    var groups = new Map(), table = h("table");
    var cols = ["Mã NV", "Họ và tên", "Số dòng"].concat(INPUT_SUM[key], ["Chi tiết"]);
    table.appendChild(h("thead", {}, [h("tr", {}, cols.map(function (c) { return h("th", { text: c }); }))]));
    var body = h("tbody");
    rows.forEach(function (r) {
      var code = String(r["Mã NV"] || "").trim();
      if (!groups.has(code)) groups.set(code, []);
      groups.get(code).push(r);
    });
    Array.from(groups.keys()).sort().forEach(function (code) {
      var source = groups.get(code), name = nameOf(code);
      var cells = [code || "Thiếu mã NV", name, source.length].concat(INPUT_SUM[key].map(function (c) {
        return fmt(source.reduce(function (total, r) { return total + E.money(r[c]); }, 0));
      }));
      var tr = h("tr", {}, cells.map(function (v) { return h("td", { text: v }); }));
      tr.appendChild(h("td", {}, [btn("Xem dòng gốc", "", function () {
        modal(S[key].ten + " — " + (code || "Thiếu mã NV"), moneySourceTable(key, source, can("input.edit"), render), function (close) {
          return [btn("Về tổng hợp", "", function () { close(); moneyInputReview(key, rows, nameOf); }), btn("Đóng", "", close)];
        }, { wide: true });
      })]));
      body.appendChild(tr);
    });
    table.appendChild(body);
    var dataset = {}; dataset[key] = rows;
    var warnings = INT.check(dataset).filter(function (item) { return item.area === key && item.level === "Medium"; });
    var content = h("div", { "data-money-input-review": key }, [h("p", { class: "hint", text: "Theo bộ lọc: " + scope + " · " + rows.length + " dòng" })]);
    warnings.forEach(function (item) { content.appendChild(h("p", { class: "warn", text: item.msg })); });
    content.appendChild(h("div", { class: "tw" }, [table]));
    modal("Đối soát " + S[key].ten + " theo nhân viên", content, function (close) { return [btn("Đóng", "", close)]; }, { wide: true });
  }

  function inputF(key) { var m = (st.inf = st.inf || {}); return m[key] = m[key] || { pb: [], nv: [], tu: "", den: "" }; }
  var INDEX_PB = null;
  function inputPass(key, r) {
    var f = inputF(key), col = INPUT_FILTER[key], d = String(r[col] || "").slice(0, 10);
    if (f.tu || f.den) { if (!d || (f.tu && d < f.tu) || (f.den && d > f.den)) return false; }
    else if (!rowInKy(r, S[key])) return false;
    if (f.nv.length && f.nv.indexOf(r["Mã NV"]) < 0) return false;
    if (f.pb.length) { var pb = INDEX_PB ? INDEX_PB.at(r["Mã NV"], VAL.normDate(r[col]) || d).pb : ""; if (!LF.inSet(f.pb, pb)) return false; }
    return true;
  }
  // Tổ/phòng ban theo NGÀY của từng dòng (không dùng tổ hiện tại cho dữ liệu kỳ cũ); thiếu căn cứ lịch sử thì để trống (lọc "(không)").
  function inputPbMap() { return window.HAKUi.inputDept.create(db, HRM); }
  function kyEndDay() { return kyStr() + "-" + String(new Date(st.nam, st.thang, 0).getDate()).padStart(2, "0"); }

  function inputScopeText(key) { var f = inputF(key), p = [(f.tu || f.den) ? (f.tu ? fmtDate(f.tu) : "…") + " → " + (f.den ? fmtDate(f.den) : "…") : "kỳ " + st.thang + "/" + st.nam]; if (f.pb.length) p.push("PB: " + f.pb.length + " mục"); if (f.nv.length) p.push("NV: " + f.nv.length + " người"); return p.join(" · "); }

  /** Có điều kiện ngày/tháng/kỳ riêng thì KHÔNG bó theo kỳ đang chọn trên thanh trên cùng. */
  function pcScopeText(key) {
    var f = (st.plf && st.plf[key]) || {}, p = [];
    if (f.tu || f.den) p.push((f.tu || "…") + " → " + (f.den || "…")); if (f.thang) p.push("tháng " + f.thang); if (f.ky) p.push("kỳ " + f.ky);
    if (f.pb && f.pb.length) p.push("PB: " + f.pb.map(function (x) { return x === LF.NONE ? "(không)" : x; }).join(", "));
    if (!p.length) p.push("kỳ " + st.thang + "/" + st.nam);
    return p.join(" · ");
  }
  function plfScoped(key) { var f = st.plf && st.plf[key]; return !!(f && (f.tu || f.den || f.thang || f.ky)); }

  // ---------- Danh mục: Xem → Sửa → Lưu/Hủy (V9.4) — KHÔNG tự lưu khi nhập ----------
  /** Trạng thái sửa từng bảng danh mục: { mode:"edit"|"new", ri, draft, dirty, state:"EDITING"|"VALIDATING"|"SAVING" , err } */
  function cedit(key) { st.cedit = st.cedit || {}; return st.cedit[key] || null; }
  function catDirtyKeys() { return Object.keys(st.cedit || {}).filter(function (k) { return st.cedit[k] && st.cedit[k].dirty; }); }
  /** Hỏi trước khi bỏ thay đổi chưa lưu (chuyển menu). Trả true nếu được phép đi tiếp. */
  function leaveOk() {
    var d = catDirtyKeys(); if (!d.length) { st.cedit = {}; return true; }
    if (!confirm("Có thay đổi CHƯA LƯU ở danh mục " + d.map(function (k) { return (ALL[k] && ALL[k].ten) || k; }).join(", ") + ".\nBỏ thay đổi và chuyển đi?")) return false;
    st.cedit = {}; return true;
  }
  /** Mã đã được dùng ở đâu (để quyết định Xóa hay Ngừng hiệu lực). Quét các bảng nghiệp vụ + bảng lương đã chốt. */
  function catUsage(key, row, def) {
    var codes = []; (def.cols || []).forEach(function (c) { if (/^Mã/.test(c) && String(row[c] == null ? "" : row[c]).trim().length >= 2) codes.push(String(row[c]).trim()); });
    var out = { n: 0, where: [], closed: false };
    if (!codes.length) return out;
    var skip = { auditlog: 1, nguoidung: 1, baomat: 1, kyluong: 1, kyluong_lichsu: 1 };
    Object.keys(db).forEach(function (t) {
      if (t === key || skip[t] || !Array.isArray(db[t]) || /^dm_/.test(t)) return;
      var hit = 0; db[t].forEach(function (r) { for (var k in r) { if (typeof r[k] === "string" && codes.indexOf(r[k].trim()) >= 0) { hit++; break; } } });
      if (hit) { out.n += hit; out.where.push(((ALL[t] && ALL[t].ten) || (HR[t] && HR[t].ten) || t) + " (" + hit + ")"); }
    });
    var js = ""; try { js = JSON.stringify(db.kyluong || []); } catch (e) { js = ""; }
    if (js && codes.some(function (c2) { return js.indexOf('"' + c2 + '"') >= 0; })) { out.closed = true; out.where.push("kỳ lương đã chốt"); }
    return out;
  }
  function catHistory(key, row, def) {
    var codes = []; (def.cols || []).forEach(function (c) { if (/^Mã/.test(c) && row[c]) codes.push(String(row[c])); });
    var tn = (def.ten || key), rows = (db.auditlog || []).filter(function (e) { var s = String(e.chiTiet || "") + " " + String(e.thaoTac || ""); return s.indexOf(key) >= 0 || s.indexOf(tn) >= 0 ? (!codes.length || codes.some(function (c) { return s.indexOf(c) >= 0; })) : false; }).slice(-80).reverse();
    var body = h("div"); if (!rows.length) body.appendChild(h("div", { class: "hint", text: "Chưa có thao tác nào được ghi cho dòng này." }));
    else body.appendChild(simpleTable(rows.map(function (e) { return { "Lúc": fmtTime(e.luc), "Người": e.nguoi || "", "Thao tác": e.thaoTac || "", "Chi tiết": String(e.chiTiet || "").slice(0, 160) }; })));
    modal("Lịch sử — " + tn + (codes.length ? " · " + codes.join(" / ") : ""), body, function (close) { return [btn("Đóng", "", close)]; });
  }
  function productionReperiodScreen(after) {
    if (!need("input.edit")) return;
    var source = kyStr(), body = h("div"), target = h("input", { type: "month", value: st.nam + "-" + ("0" + Math.min(12, st.thang + 1)).slice(-2), "aria-label": "Kỳ sản lượng mới" });
    body.appendChild(h("p", { text: "Chuyển hẳn sản lượng " + source + " sang kỳ mới: người/tổ/công, đơn giá và bù đều theo kỳ mới. Giữ số ngày trong tháng (ví dụ 09/09 → 09/10), giữ ngày gốc để tra cứu. Kỳ nguồn không còn các phiếu này. Dữ liệu chuyển ở trạng thái Nháp, cần kiểm tra và Lưu để tính lương." }));
    body.appendChild(target);
    modal("Chuyển thành sản lượng kỳ mới", body, function (close) { return [btn("Đóng", "", close), btn("Xem trước", "pri", function () {
      var plan, preview;
      try {
        plan = C.productionCarry.reperiod(db, source, target.value);
        preview = C.productionCarry.previewReperiod(db, plan);
      } catch (e) { alert(e.message); return; }
      var revision = dbRev;
      var detail = h("div");
      detail.appendChild(h("p", { text: "Chuyển " + plan.rows.length + " phiếu: " + source + " → " + plan.target + ". Kiểm tra ngày phân bổ và cột NV vắng trước khi xác nhận. Phiếu chờ phân bổ vẫn được chuyển ở trạng thái Nháp." }));
      var pending = preview.receipts.filter(function (r) { return r.pending > 0; });
      detail.appendChild(h("p", { text: pending.length + " phiếu chờ phân bổ · " + qtyText(pending.reduce(function (total, r) { return total + r.pending; }, 0)) + " tấn." }));
      detail.appendChild(h("h3", { text: "Chi tiết phiếu và nhân viên vắng" }));
      detail.appendChild(simpleTable(preview.receipts.map(function (entry) {
        var r = entry.row;
        return { "Phiếu": r["Phiếu cân"], "Ngày cân gốc": fmtDate(r["Ngày cân gốc"]), "Ngày phân bổ": fmtDate(r["Ngày cân"]), "Tấn": entry.quantity, "Tổ": r["Mã phòng ban"], "Mã NV trực tiếp": r["Mã NV"], "NV vắng": r["NV vắng"], "Số người nhận": entry.count, "Tấn chờ phân bổ": entry.pending, "Ghi chú": entry.note };
      })));
      if (preview.warnings.length) {
        detail.appendChild(h("details", {}, [h("summary", { text: "Cảnh báo phân bổ (" + preview.warnings.length + ")" }), h("ul", {}, preview.warnings.map(function (warning) { return h("li", { text: warning }); }))]));
      }
      detail.appendChild(h("h3", { text: "Tổng khối lượng theo nhân viên" }));
      detail.appendChild(simpleTable(preview.employees.map(function (r) { return { "Mã NV": r.code, "Họ tên": r.name, "Tấn": r.quantity }; })));
      modal("Xem trước chuyển hẳn sản lượng", detail, function (finish) { return [btn("Hủy", "", finish), btn("Xác nhận chuyển hẳn", "pri", function () {
        if (!need("input.edit")) return;
        if (dbRev !== revision || JSON.stringify(db.sanluong || []) !== plan.token) { alert("Dữ liệu đã đổi; hãy xem trước lại."); return; }
        if (!backupOrBlock("truoc-chuyen-han-sl-" + source, "chuyển hẳn sản lượng")) return;
        if (!txn(["sanluong", "_inputReviews", "schemaVersion"], function () {
          var fresh = C.productionCarry.reperiod(db, source, plan.target);
          C.inputReview.initialize(db);
          db.sanluong = db.sanluong.filter(function (r) { return fresh.moving.indexOf(r) < 0; }).concat(fresh.rows);
          audit("Chuyển hẳn sản lượng", source + " → " + plan.target + "; " + fresh.rows.length + " phiếu; phân bổ theo kỳ mới; Nháp");
        })) { alert("Chưa chuyển: " + lastTxnError); return; }
        finish(); close(); after(); render(); toast("Đã chuyển thành SL " + plan.target + ". Kiểm tra rồi Lưu để tính lương ở cả kỳ nguồn và kỳ mới.");
      })]; });
    })]; });
  }

  function productionCarryScreen(after) {
    if (!need("payroll.calc")) return;
    var closeCarry, body = h("div"), source = kyStr(), target = h("input", { type: "month", value: st.nam + "-" + ("0" + Math.min(12, st.thang + 1)).slice(-2), "aria-label": "Kỳ chi trả sản lượng" });
    body.appendChild(h("p", { text: "Kỳ phát sinh " + source + ": chia theo người, tổ và công thực tế kỳ này. Đơn giá và bù theo kỳ chi trả. Chuyển toàn bộ sản lượng của kỳ; không đổi ngày cân." }));
    body.appendChild(h("label", { text: "Kỳ tính vào lương: " })); body.appendChild(target);
    (db.sl_chuyenky || []).forEach(function (r) { body.appendChild(h("div", { class: "bar" }, [h("span", { text: r.source + " → " + r.target }), btn("Hủy chuyển", "red ghost", function () {
      if (!need("payroll.calc") || !confirm("Hủy chuyển " + r.source + " → " + r.target + "?")) return;
      if (!backupOrBlock("truoc-huy-chuyen-sl", "hủy chuyển SL")) return;
      if (!txn(["sl_chuyenky"], function () { var ix = (db.sl_chuyenky || []).findIndex(function (x) { return x.id === r.id; }); if (ix < 0) return false; db.sl_chuyenky.splice(ix, 1); C.productionCarry.validate(db, { sl_chuyenky: [r], kyluong: db.kyluong }); audit("Hủy chuyển SL", r.source + " → " + r.target); })) { alert("Chưa hủy: " + lastTxnError); return; }
      closeCarry(); after(); render(); toast("Đã hủy chuyển kỳ");
    })])); });
    closeCarry = modal("Sản lượng phát sinh / kỳ chi trả", body, function (close) { return [btn("Đóng", "", close), btn("Xem trước chuyển kỳ", "pri", function () {
      var record, pays, temp, targetKy = target.value;
      try { record = C.productionCarry.draft(db, source, targetKy); temp = Object.assign({}, db, { sl_chuyenky: (db.sl_chuyenky || []).concat([record]) }); pays = C.productionCarry.payments(temp, targetKy, st.bu, { quyChe: quyChe() }).filter(function (p) { return p.id === record.id; }); } catch (e) { alert(e.message); return; }
      var detail = h("div", {}, [h("p", { text: "Phát sinh " + source + " → lương " + targetKy + ". Đơn giá và quy chế bù chính thức kỳ chi trả; công/người/ngày làm theo kỳ phát sinh. Khoản chuyển ghi vào Thu nhập khác và chịu xử lý thuế của kỳ chi trả. Kỳ nguồn không tính lại khoản SL/bù đã chuyển." })]);
      var warningAck = null;
      if ((record.warnings || []).length) {
        detail.appendChild(h("div", { class: "warn", text: "Sản lượng đã phân bổ đủ nhưng còn cảnh báo cần đối chiếu:\n" + record.warnings.join("\n"), style: "white-space:pre-wrap" }));
        warningAck = h("input", { type: "checkbox", "aria-label": "Đã kiểm tra cảnh báo phân bổ" });
        detail.appendChild(h("label", {}, [warningAck, document.createTextNode(" Tôi đã kiểm tra các cảnh báo và xác nhận danh sách người nhận, công và phần sản lượng trong bảng dưới là đúng.")]));
      }
      var taxInputs = Object.create(null);
      pays.filter(function (p) { return p.retired; }).forEach(function (p) { var select = h("select", { "aria-label": "Mã thuế chi trả " + p.ma }, [h("option", { value: "", text: "— Chọn mã thuế kỳ chi trả —" })].concat((db.dm_tncn || []).map(function (r) { return h("option", { value: r["Mã thuế TNCN"], text: r["Mã thuế TNCN"] + " — " + (r["Tên thuế TNCN"] || "") }); }))); taxInputs[p.ma] = select; detail.appendChild(h("div", { class: "fld" }, [h("label", { text: p.ma + " — đã nghỉ: cần chọn mã thuế khi chi trả khoản cũ" }), select])); });
      detail.appendChild(simpleTable(pays.map(function (p) { return { "Mã NV": p.ma, "Họ tên": p.name, "Tấn": p.quantity, "Lương SL": p.salary, "Bù SL": p.topup, "Tổng trước thuế": p.salary + p.topup, "Lưu ý": p.retired ? "Chỉ nhận khoản chuyển" : "Đang có HĐ" }; })));
      var revision = dbRev;
      modal("Xem trước: chia " + source + ", trả " + targetKy, detail, function (finish) { return [btn("Hủy", "", finish), btn("Xác nhận chuyển kỳ", "pri", function () {
        if (!need("payroll.calc")) return;
        if (dbRev !== revision) { alert("Dữ liệu đã đổi; hãy xem trước lại."); return; }
        var missingTax = Object.keys(taxInputs).filter(function (ma) { return !taxInputs[ma].value; }); if (missingTax.length) { alert("Chọn mã thuế chi trả cho " + missingTax.join(", ")); return; }
        if (warningAck && !warningAck.checked) { alert("Hãy kiểm tra cảnh báo và xác nhận danh sách phân bổ trước khi chuyển kỳ."); return; }
        if (!backupOrBlock("truoc-chuyen-sl-" + source, "chuyển kỳ chi trả")) return;
        if (!txn(["sl_chuyenky", "schemaVersion"], function () { var r = C.productionCarry.draft(db, source, targetKy); r.warningsAcknowledged = !!(warningAck && warningAck.checked); r.taxOverrides = Object.create(null); Object.keys(taxInputs).forEach(function (ma) { r.taxOverrides[ma] = taxInputs[ma].value; }); db.schemaVersion = Math.max(4, db.schemaVersion || 0); db.sl_chuyenky.push(r); C.productionCarry.validate(db, db); audit("Chuyển kỳ chi trả SL", source + " → " + targetKy + "; đơn giá/bù kỳ chi trả; người/công kỳ phát sinh"); })) { alert("Chưa chuyển: " + lastTxnError); return; }
        finish(); close(); after(); render(); toast("Đã chuyển kỳ chi trả; kiểm tra lại lương " + targetKy);
      })]; });
    })]; });
  }

  function bandamDirectExcelTemplate() {
    if (!window.ExcelJS) { alert("Thiếu thư viện Excel — chưa tạo mẫu."); return; }
    var book = new window.ExcelJS.Workbook(), sheet = book.addWorksheet("Ban dăm xuất hàng");
    sheet.columns = [{ header: "Phiếu cân", key: "phieu", width: 20 }, { header: "Ngày cân", key: "ngay", width: 16 }, { header: "Biển số", key: "xe", width: 18 }, { header: "Số xe", key: "soxe", width: 16 }, { header: "Mã NV", key: "ma", width: 24 }];
    [1, 3, 5].forEach(function (n) { sheet.getColumn(n).numFmt = "@"; });
    sheet.getColumn(2).numFmt = "dd/mm/yyyy"; sheet.getColumn(4).numFmt = "0.###";
    sheet.views = [{ state: "frozen", ySplit: 1 }]; sheet.getRow(1).font = { bold: true };
    var guide = book.addWorksheet("Hướng dẫn"); guide.getColumn(1).width = 110;
    guide.addRow(["Điền số phiếu, ngày cân, số xe được giao và Mã NV có trong Nhân sự. Mỗi dòng là phần xe giao cho nhân viên đó; không ghi thêm dòng chia tổ cho cùng phiếu."]);
    guide.addRow(["Mã NV, số phiếu và biển số đã định dạng Chữ để giữ số 0 đầu. Không đổi tên cột. Nhập tại Ban dăm xuất hàng → Nhập Excel."]);
    guide.eachRow(function (r) { r.alignment = { wrapText: true }; r.height = 40; });
    book.xlsx.writeBuffer().then(function (buf) { download("Mau_BomDam_GiaoTrucTiep.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf); }).catch(function (e) { alert("Không tạo được mẫu: " + e.message); });
  }

  function bandamEntryForm(ri, after, initialMode) {
    if (!need("input.edit")) return;
    var row = ri == null ? null : db.bandam[ri], token = row ? JSON.stringify(row) : "", body = h("div"), f = {};
    var mode = h("select", { "aria-label": "Cách phân bổ Ban dăm xuất hàng" }, [h("option", { value: "direct", text: "Trực tiếp theo Mã NV" }), h("option", { value: "team", text: "Chia theo tổ / phòng ban" })]);
    mode.value = row ? (row["Mã NV"] ? "direct" : "team") : initialMode || "team"; mode.disabled = true;
    body.appendChild(h("div", { class: "fld" }, [h("label", { text: "Cách phân bổ" }), mode]));
    body.appendChild(h("p", { class: "hint", text: "Trực tiếp: số xe của dòng này giao cho đúng nhân viên đã chọn, không chia lại cho tổ. Theo tổ: chia theo người có mặt và NV vắng như hiện tại. Hồ sơ và đơn giá kỳ lương vẫn được áp dụng." }));
    ["Phiếu cân", "Ngày cân", "Biển số", "KL hàng (Tấn)"].forEach(function (col) {
      f[col] = h("input", { class: "i", "aria-label": col === "KL hàng (Tấn)" ? "Số xe được giao" : col, type: col === "Ngày cân" ? "date" : "text", value: row ? row[col] || "" : col === "Ngày cân" ? kyStr() + "-01" : col === "KL hàng (Tấn)" ? "1" : "" });
      body.appendChild(h("div", { class: "fld" }, [h("label", { text: col === "KL hàng (Tấn)" ? "Số xe được giao" : col }), f[col]]));
    });
    var direct = h("div", { class: "fld" }), team = h("div");
    f["Mã NV"] = h("select", { "aria-label": "Nhân viên nhận Ban dăm xuất hàng" }, [h("option", { value: "", text: "— Chọn nhân viên —" })].concat(db.nhanvien.map(function (n) { return h("option", { value: n["Mã NV"], text: n["Mã NV"] + " — " + (n["Họ và tên"] || "") }); })));
    f["Mã NV"].value = row && row["Mã NV"] || "";
    direct.appendChild(h("label", { text: "Nhân viên nhận phiếu" })); direct.appendChild(f["Mã NV"]); body.appendChild(direct);
    f["Mã phòng ban"] = h("select", { "aria-label": "Tổ nhận Ban dăm xuất hàng" }, [h("option", { value: "", text: "— Chọn tổ —" })].concat((db.dm_phongban || []).map(function (r) { return h("option", { value: r["Mã phòng ban"], text: r["Mã phòng ban"] + " — " + (r["Tên phòng ban"] || "") }); })));
    f["Mã phòng ban"].value = row && row["Mã phòng ban"] || ""; f["NV vắng"] = h("input", { class: "i", "aria-label": "NV vắng Ban dăm xuất hàng", value: row && row["NV vắng"] || "" });
    team.appendChild(h("div", { class: "fld" }, [h("label", { text: "Tổ / phòng ban" }), f["Mã phòng ban"]])); team.appendChild(h("div", { class: "fld" }, [h("label", { text: "NV vắng" }), f["NV vắng"]])); body.appendChild(team);
    var drawMode = function () { direct.style.display = mode.value === "direct" ? "" : "none"; team.style.display = mode.value === "team" ? "" : "none"; }; mode.addEventListener("change", drawMode); drawMode();
    modal((row ? "Sửa" : "Thêm") + " phiếu Ban dăm xuất hàng", body, function (close) { return [btn("Hủy", "", close), btn("Lưu phiếu Ban dăm xuất hàng", "pri", function () {
      if (!need("input.edit")) return;
      if (row && JSON.stringify(db.bandam[ri]) !== token) { alert("Phiếu đã thay đổi — mở lại để sửa."); return; }
      var input = { mode: mode.value }; Object.keys(f).forEach(function (k) { input[k] = f[k].value; }); var data;
      try { data = C.bandamEntry.build(db, input, row ? db.bandam[ri] : null); } catch (e) { alert(e.message); return; }
      if (!txn(["bandam"], function () { return !!commit(REPO.plan(row ? "update" : "insert", "bandam", row ? db.bandam[ri] : null, data), { action: "Lưu phiếu Ban dăm xuất hàng " + (mode.value === "direct" ? "trực tiếp" : "theo tổ") }); })) { alert("Chưa lưu phiếu: " + lastTxnError); return; }
      close(); after(); toast("Đã giữ phiếu ở Nháp — bấm Lưu để tính lương");
    })]; });
  }

  function inputRowEdit(key, def, ri, after) {
    var original = JSON.stringify(db[key][ri]), body = h("div"), fields = {};
    def.cols.forEach(function (col) { var input = h("input", { class: "i", value: db[key][ri][col] == null ? "" : db[key][ri][col], "aria-label": col }); fields[col] = input; body.appendChild(h("div", { class: "fld" }, [h("label", { text: col }), input])); });
    modal("Sửa " + def.ten, body, function (close) { return [btn("Hủy", "", close), btn("Lưu thay đổi", "pri", function () {
      if (!need("input.edit")) return;
      if (JSON.stringify(db[key][ri]) !== original) { alert("Dữ liệu đã đổi; hãy mở lại dòng."); return; }
      var values = {}, bad = [];
      def.cols.forEach(function (col) { var n = VAL.normCell(col, fields[col].value); if (n.error) bad.push(col + ": " + n.error); values[col] = n.value; });
      if (bad.length) { alert(bad.join("\n")); return; }
      if (!txn([key], function () { var result = commit(REPO.plan("update", key, db[key][ri], values), { action: "Sửa dòng nhập liệu" }); return !!result; })) { alert("Chưa lưu: " + lastTxnError); return; }
      close(); after(); toast("Đã giữ thay đổi — kiểm tra trạng thái Lưu để tính lương");
    })]; });
  }
  function leaveReviewModal(locked, after) {
    var ky = kyStr(), snap = kyChot(ky), saved = snap && snap.input;
    var review = snap ? saved && saved.leaveReview : C.leaveReconciliation.reconcile(db, ky);
    var body = h("div", { "data-leave-review": ky });
    if (!review) body.appendChild(h("p", { class: "hint", text: "Bản chốt này chưa lưu bảng đối chiếu đơn nghỉ." }));
    var choices = [];
    if (review) {
      review.warnings.forEach(function (warning) {
        body.appendChild(h("p", { class: "warn", text: warning.ma + " · " + tenNV(warning.ma) + (warning.contract ? " · HĐ " + warning.contract : "") + ": phép đến hết kỳ " +
          fmt(warning.used) + " / " + fmt(warning.limit) + " ngày theo Quyền lợi phép, vượt " + fmt(warning.excess) + " ngày. Phần vượt cần đổi sang loại nghỉ phù hợp trước khi chốt." }));
      });
      body.appendChild(h("p", { class: "hint", text: "Đơn và công PN khớp chỉ tính một lần. Chọn từng ngày cần bổ sung. Với đơn chưa rõ lịch nghỉ từng ngày, hãy kiểm tra và chấm tay." }));
      var cols = ["Mã NV", "Ngày", "Loại nghỉ", "Công theo đơn", "Từng hình thức công", "Đối chiếu", "Chọn áp dụng", "Dữ liệu nguồn"];
      var rows = review.entries.map(function (entry) {
        var controls = h("div", { class: "bar" }), check;
        if (entry.apply && !locked && !review.warnings.some(function (x) { return x.ma === entry.ma && x.contract === entry.contract; })) {
          check = h("input", { type: "checkbox", "aria-label": "Áp dụng " + entry.ma + " ngày " + entry.date });
          choices.push({ entry: entry, check: check });
        }
        if (!snap && can("hr.edit") && entry.orders.length) {
          entry.orders.slice(0, 3).forEach(function (order) {
            controls.appendChild(btn("Mở đơn " + order.type, "", function () {
              if (db[order.table].indexOf(order.row) >= 0) hrForm(order.table, order.row, {}, function () { after(); leaveReviewModal(locked, after); });
            }));
          });
        }
        if (!locked) {
          var field = entry.date.slice(8);
          db.chamcong.filter(function (r) {
            return VAL.normKy(r["Kỳ"]) === ky && r["Mã NV"] === entry.ma && E.tachCong(r[field]).soCong > 0;
          }).forEach(function (r) {
            controls.appendChild(btn("Mở dòng " + (r["Hình thức công"] || "BT"), "", function () {
              var index = db.chamcong.indexOf(r);
              if (index >= 0) inputRowEdit("chamcong", S.chamcong, index, function () { after(); leaveReviewModal(locked, after); });
            }));
          });
        }
        return { "Mã NV": entry.ma, "Ngày": fmtDate(entry.date), "Loại nghỉ": entry.orders.map(function (o) { return o.type; }).join(", "),
          "Công theo đơn": entry.expected ?? (entry.orders.length === 1 ? entry.orders[0].amount : null),
          "Từng hình thức công": Object.keys(entry.forms || {}).sort().map(function (code) { return code + ": " + fmt(entry.forms[code]); }).join(" · "),
          "Đối chiếu": entry.status, "Chọn áp dụng": check, "Dữ liệu nguồn": controls };
      });
      body.appendChild(simpleTable(rows, null, cols));
    }
    modal("Đối chiếu đơn nghỉ — " + kyLabel(ky), body, function (close) {
      var actions = [btn("Đóng", "", close)];
      if (choices.length) actions.push(btn("Áp dụng phép đã duyệt", "pri", function () {
        if (!need("input.edit") || kyStr() !== ky || kyChot(ky)) return;
        var picked = new Set(choices.filter(function (x) { return x.check.checked; }).map(function (x) { return x.entry.ma + "|" + x.entry.date; }));
        if (!picked.size) { toast("Chọn ngày phép cần bổ sung."); return; }
        var current = C.leaveReconciliation.reconcile(db, ky);
        var live = current.entries.filter(function (x) {
          return x.apply && picked.has(x.ma + "|" + x.date) && !current.warnings.some(function (w) { return w.ma === x.ma && w.contract === x.contract; });
        });
        if (live.length !== picked.size) { alert("Dữ liệu đã đổi. Mở lại đối chiếu trước khi áp dụng."); return; }
        if (!txn(["chamcong", "_inputReviews"], function () {
          var byEmployee = new Map();
          live.forEach(function (x) {
            if (!byEmployee.has(x.ma)) byEmployee.set(x.ma, {});
            byEmployee.get(x.ma)[x.date.slice(8)] = x.expected;
          });
          for (var pair of byEmployee) {
            var ma = pair[0], values = pair[1], rows = db.chamcong.filter(function (r) {
              return VAL.normKy(r["Kỳ"]) === ky && r["Mã NV"] === ma && String(r["Hình thức công"] || "").trim().toUpperCase() === "PN";
            });
            if (rows.length > 1 || (rows.length && Object.keys(values).some(function (d) {
              return String(rows[0][d] ?? "").trim() !== "" && String(rows[0][d]).trim() !== "0";
            }))) { alert(ma + ": dòng PN đã có dữ liệu hoặc có nhiều dòng PN. Kiểm tra trên bảng công."); return false; }
            var plan = rows.length ? REPO.plan("update", "chamcong", rows[0], values) :
              REPO.plan("insert", "chamcong", null, Object.assign({ "Kỳ": ky, "Mã NV": ma, "Hình thức công": "PN" }, values));
            if (!commit(plan, { action: "Áp dụng phép đã duyệt" })) return false;
          }
          return true;
        })) { alert(lastTxnError || "Chưa áp dụng công phép."); return; }
        close(); after(); toast("Đã bổ sung " + live.length + " ngày theo lựa chọn. Kiểm tra và bấm Lưu để tính lương.");
      }));
      return actions;
    }, { wide: true });
  }

  function inputPeriodBatch(key, replacing, after) {
    if (!need("input.edit")) return;
    var period = kyStr();
    var preview = function (raw, name) {
      var plan; try { plan = C.inputBatch.plan(db, key, period, ALL[key].cols, raw); } catch (e) { alert(e.message); return; }
      var body = h("div", {}, [h("p", { text: ALL[key].ten + " — " + kyLabel(period) }), h("p", { text: "Sẽ xóa " + plan.remove.length + " dòng; thêm " + plan.rows.length + " dòng. Các kỳ khác giữ nguyên." }), h("p", { text: name || "Xóa dữ liệu của kỳ đã chọn" })]);
      if (plan.totals.length) body.appendChild(h("p", { text: "Trong số dòng sẽ xóa có " + plan.totals.length + " dòng tổng không có ngày cân đang lưu: " + plan.totals.map(function (r) { return r["Phiếu cân"]; }).join(", ") }));
      if (plan.unresolved.length) body.appendChild(h("p", { class: "warn", text: plan.unresolved.length + " phiếu đang lưu thiếu ngày hợp lệ vẫn cần đối chiếu. Các phiếu này chưa được xóa vì chưa xác định được kỳ." }));
      if (plan.ignored.length) body.appendChild(h("p", { text: "Bỏ qua dòng tổng trong Excel — " + plan.ignored.map(function (r) { return "dòng " + r.line + " (" + r.label + ")"; }).join(", ") }));
      modal(replacing ? "Thay toàn bộ dữ liệu kỳ" : "Xóa dữ liệu kỳ", body, function (close) { return [btn("Hủy", "", close), btn("Xác nhận " + (replacing ? "thay dữ liệu" : "xóa kỳ"), "red", function () {
        if (!need("input.edit")) return;
        if (period !== kyStr() || JSON.stringify(db[key] || []) !== plan.token) { alert("Dữ liệu hoặc kỳ đã đổi — mở lại xem trước."); return; }
        if (!backupOrBlock("truoc-thay-" + key + "-" + period, "thay/xóa " + ALL[key].ten)) return;
        if (!txn([key], function () {
          var now = C.inputBatch.plan(db, key, period, ALL[key].cols, raw);
          for (var i = 0; i < now.remove.length; i++) if (!commit(REPO.plan("remove", key, now.remove[i], null), { audit: false })) return false;
          for (var j = 0; j < now.rows.length; j++) if (!commit(REPO.plan("insert", key, null, now.rows[j]), { audit: false })) return false;
          audit("Thay/xóa dữ liệu kỳ", key + " " + period + ": xóa " + now.remove.length + " (dòng tổng: " + now.totals.length + "), thêm " + now.rows.length);
        })) { alert("Chưa thay dữ liệu: " + lastTxnError); return; }
        close(); after(); toast("Đã lưu dữ liệu kỳ " + period);
      })]; });
    };
    if (!replacing) { preview(null, ""); return; }
    readWorkbook(function (wb, name) {
      var sheet = wb.SheetNames.filter(function (n) { return n === sheetName(ALL[key].ten); })[0] || wb.SheetNames[0];
      var raw = key === "sanluong" ? IMP.rowsFromAoa(XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, raw: true, defval: "" }), key, ALL[key].cols).rows : XLSX.utils.sheet_to_json(wb.Sheets[sheet], { raw: true, defval: "" });
      preview(raw, name);
    });
  }

  // ---------- Bảng nhập liệu ----------
  function grid(key, def) {
    var wrap = h("div"), card = h("div", { class: "card hak-in" }), bar = h("div", { class: "bar" }), body = h("div", { class: "tw" });
    var inputReview = ["chamcong", "sanluong", "bandam"].indexOf(key) >= 0, pumpMode = key === "bandam" ? (st.pumpMode || "team") : "", reviewState = h("div", { class: "hint", "data-input-review": key });
    if (key === "bandam") {
      var tabs = h("div", { class: "bar hak-tabs", "aria-label": "Phân bổ Ban dăm xuất hàng" });
      [["team", "Phân bổ theo tổ"], ["direct", "Phân bổ trực tiếp nhân viên"]].forEach(function (m) { tabs.appendChild(btn(m[1], pumpMode === m[0] ? "pri" : "", function () { st.pumpMode = m[0]; render(); })); }); wrap.appendChild(tabs);
      def = Object.assign({}, def, { cols: def.cols.filter(function (c) { return pumpMode === "direct" ? ["Mã phòng ban", "NV vắng"].indexOf(c) < 0 : c !== "Mã NV"; }) });
    }
    var theoKy = !!(def.kyCol || def.dateCol), cnt = h("span", { class: "hint", style: "margin:0" });
    var editPerm = S[key] ? "input.edit" : "dm.edit", noRight = !can(editPerm), isCat = !S[key];
    var locked = (theoKy && !!kyChot(kyStr())) || noRight || (["chamcong", "sanluong", "bandam"].indexOf(key) >= 0 && (db.sl_chuyenky || []).some(function (r) { return r.source === kyStr(); }));
    var inMode = !!INPUT_FILTER[key], pcMode = key === "sanluong" || key === "bandam", pcTot = h("div", { class: "card", "data-pc-totals": key, style: "margin:6px 0;padding:8px" });
    if (key === "chamcong" && st.attendanceReviewDay && st.attendanceReviewDay.slice(0, 7) === kyStr()) {
      card.appendChild(h("p", { class: "hint", text: "Ngày cần đối chiếu: " + fmtDate(st.attendanceReviewDay) }));
    }
    var shared = key === "chamcong"; // Chấm công dùng bộ lọc chung (phòng ban, từ khóa) như Báo cáo lương
    var deptOf = {};
    // Phòng ban của dòng chấm công = tổ hiệu lực tại ngày cuối kỳ (từ hồ sơ/phụ lục), KHÔNG lấy từ bảng lương: lọc không phụ thuộc quyền xem lương hay việc tính lương thành công.
    if (shared) { var deptRes = window.HAKUi.inputDept.create(db, HRM), endDay = kyEndDay(); db.nhanvien.forEach(function (n) { deptOf[n["Mã NV"]] = deptRes.at(n["Mã NV"], endDay).pb; }); }
    if (st.ktReturn && ["chamcong", "sanluong", "bandam"].indexOf(key) >= 0) {
      bar.appendChild(btn("Quay lại kiểm tra kỳ lương", "ghost", function () {
        if (!leaveOk()) return;
        var period = st.ktReturn; st.ktReturn = null;
        st.nam = Number(period.slice(0, 4)); st.thang = Number(period.slice(5, 7));
        st.tab = "ktbl"; saveUi(); render();
      }));
    }
    var q = h("span"); // ô tìm nằm trong HAK Smart Filter (sfm) — cùng một trạng thái st.qs[key]
    var sfm = null, lastScan = null;
    var newRow = function () { var r = Object.assign({}, def.def || {}); if (def.kyCol) r[def.kyCol] = kyStr(); if (def.dateCol) r[def.dateCol] = kyStr() + "-01"; return r; };
    if (!locked && isCat) bar.appendChild(btn("＋ Thêm mới", "pri", function () { if (!need(editPerm)) return; var e0 = cedit(key); if (e0 && e0.dirty && !confirm("Đang có thay đổi chưa lưu — bỏ để thêm mới?")) return; st.cedit = st.cedit || {}; st.cedit[key] = { mode: "new", ri: -1, draft: newRow(), dirty: false, state: "EDITING" }; draw(); }, "Tạo dòng mới ở chế độ nháp — chỉ ghi khi bấm Lưu"));
    else if (!locked) bar.appendChild(btn(key === "bandam" && pumpMode === "direct" ? "Giao trực tiếp cho Mã NV…" : "＋ Thêm dòng", "pri", function () { if (!need(editPerm)) return; if (key === "bandam") { bandamEntryForm(null, draw, pumpMode); return; } if (!commit(REPO.plan("insert", key, null, newRow(), { what: "thêm dòng" }), { audit: theoKy ? false : "retro", action: "Thêm dòng danh mục" })) return; save(); st.qs[key] = ""; q.value = ""; st.pg[key] = 1e9; draw(); var tw = body; tw.scrollTop = tw.scrollHeight; }));
    bar.appendChild(q); bar.appendChild(cnt); bar.appendChild(h("span", { class: "sp" }));
    if (key === "sanluong" || (key === "bandam" && pumpMode === "team")) bar.appendChild(btn(key === "bandam" ? "Mẫu Excel chia tổ" : "📄 Tải file mẫu", "", function () { downloadPBTemplate(key); }, "Mẫu phiếu cân như công cụ phân bổ khối lượng: Mã phòng ban (tổ) + NV vắng"));
    else if (key !== "bandam") bar.appendChild(btn("📄 Tải file mẫu", "", function () { downloadTemplate(key); }, "File Excel mẫu có sẵn tên cột + dòng ví dụ"));
    if (!locked) bar.appendChild(btn("⬆ Nhập Excel", "", function () { importFile(key, draw, pumpMode); }, "Nhập từ file .xlsx / .xls / .csv"));
    if (["chamcong", "sanluong"].indexOf(key) >= 0 && !locked) { bar.appendChild(btn("Thay toàn bộ kỳ từ Excel…", "", function () { inputPeriodBatch(key, true, draw); })); bar.appendChild(btn("Xóa dữ liệu kỳ…", "red ghost", function () { inputPeriodBatch(key, false, draw); })); }
    if (key === "bandam" && pumpMode === "direct") bar.appendChild(btn("Mẫu Excel giao trực tiếp", "", bandamDirectExcelTemplate));
    if (key === "sanluong") { bar.appendChild(btn("Chuyển thành SL kỳ mới…", "", function () { productionReperiodScreen(draw); })); bar.appendChild(btn("Chỉ đổi kỳ chi trả SL…", "", function () { productionCarryScreen(draw); })); }
    var tiencomHint = key === "tiencom" ? h("p", { class: "hint", text: "Khi cùng nhân viên và ngày đã có công CC, chỉ điền Có ở cột Suất bổ sung nếu thực sự có thêm suất. Dòng trùng chưa xác nhận sẽ được báo khi kiểm tra trước chốt." }) : null;
    if (key === "chamcong") bar.appendChild(btn("Đối chiếu đơn nghỉ", "", function () { leaveReviewModal(locked, draw); }));
    if (inputReview) {
      bar.appendChild(btn("Lưu để tính lương", "pri", function () {
        if (!need("input.edit")) return;
        if (locked) { alert("Kỳ đang khóa — không thay đổi trạng thái lưu."); return; }
        try { C.inputReview.assertValid(db, key, kyStr(), pumpMode); } catch (e) { alert(e.message); return; }
        var errors = INT.check(db).filter(function (x) { return x.level === "Critical" && (x.area === key || x.area === ALL[key].ten); });
        if (errors.length) { alert("Kiểm tra dữ liệu trước khi lưu: " + errors.map(function (x) { return x.msg; }).join("; ")); return; }
        if (!txn(["_inputReviews"], function () { C.inputReview.approve(db, key, kyStr(), pumpMode, currentUser()); audit("Lưu để tính lương", key + " " + kyStr() + " " + pumpMode); })) { alert("Chưa lưu để tính lương: " + lastTxnError); return; }
        draw(); toast("Đã lưu để tính lương kỳ " + kyStr());
      }));
      card.appendChild(reviewState);
    }
    function refreshInputReview() { if (inputReview) { var pending = C.inputReview.changed(db, key, kyStr(), pumpMode); reviewState.textContent = inputReportSource(key, kyStr(), pumpMode) + (pending ? " — kiểm tra rồi bấm Lưu để tính lương cho kỳ đang chọn." : ""); reviewState.className = pending ? "warn" : "hint"; } }
    /** MỘT phép quét duy nhất cho: bảng hiển thị · tổng · Excel · PDF · in (hiển thị = tổng = Excel = PDF = in). */
    function scan() {
      var idx = [], qq = qOf(key), names = {}, LKMAP = key === "chamcong" ? linkMapNow() : {}, total = 0;
      if (inMode) INDEX_PB = INDEX_PB || inputPbMap();
      db.nhanvien.forEach(function (n) { if (!(n["Mã NV"] in names)) names[n["Mã NV"]] = n["Họ và tên"] || ""; }); // tra tên 1 lần / lượt quét
      var nameOf = function (ma) { return Object.prototype.hasOwnProperty.call(names, ma) ? names[ma] : ""; };
      var scoped = pcMode ? plfScoped(key) : inMode ? !!(inputF(key).tu || inputF(key).den) : false, cf = isCat ? catF(key) : null;
      db[key].forEach(function (r, i) {
        if (key === "bandam" && C.inputReview.mode(r) !== pumpMode) return;
        if (def.rowFilter && !def.rowFilter(r)) return;
        if (theoKy && !scoped && !rowInKy(r, def)) return;
        total++; // dòng thuộc phạm vi gốc của màn hình (kỳ đang chọn hoặc khoảng ngày) — mẫu số của "Hiển thị x / y"
        if (inMode && !inputPass(key, r)) return;
        if (pcMode && !LF.phieuCan([r], plfOf(key)).length) return;
        if (shared && !RF.isEmpty(st.rf)) { var nm = nameOf(r["Mã NV"]); if (!RF.applyGeneric([{ "Mã NV": r["Mã NV"], "Họ và tên": nm, "Phòng ban": deptOf[r["Mã NV"]] || "" }], st.rf).rows.length) return; }
        if (key === "chamcong" && st.ccf) {
          if (!LF.inSet(st.ccf.ht, r["Hình thức công"])) return;
          if (st.ccf.warn === "bad" && !DAYS.some(function (d) { return r[d] != null && r[d] !== "" && VAL.dayCell(d, r[d], VAL.normKy(r["Kỳ"])).error; })) return;
          if (st.ccf.src) {
            var rid = attRecordId("chamcong", r), lk = DAYS.map(function (d) { return LKMAP[rid + "|" + d]; }).filter(Boolean);
            if (st.ccf.src === "has" && !lk.length) return; if (st.ccf.src === "none" && lk.length) return;
            if (st.ccf.src === "edited" && !lk.some(function (l) { return String(r[l.day] == null ? "" : r[l.day]).replace(".", ",") !== String(l.value == null ? "" : l.value).replace(".", ","); })) return;
          }
        }
        if (cf && !catPass(def, r, cf)) return;
        if (qq && def.cols.every(function (c) { return fold(r[c]).indexOf(qq) < 0; }) && fold(nameOf(r["Mã NV"])).indexOf(qq) < 0) return;
        idx.push(i);
      });
      lastScan = { idx: idx, nameOf: nameOf, LKMAP: LKMAP, total: total, kept: idx.length };
      return lastScan;
    }
    var scanRows = function () { return scan().idx.map(function (i) { return db[key][i]; }); };
    var inRows = scanRows, pcRows = scanRows;
    if (inMode) {
      var inPdfRows = function () { return inRows().map(function (r) { var o = {}; def.cols.forEach(function (c) { o[c] = r[c] == null ? "" : r[c]; }); o["Họ và tên"] = tenNV(r["Mã NV"]); return o; }); };
      bar.appendChild(btn("⬇ PDF", "", function () { exportSheetsPdf({ title: def.ten.toLocaleUpperCase("vi-VN") + " (đã lọc)", ky: inputScopeText(key), sheets: [{ name: def.ten, rows: inPdfRows() }] }, slug(def.ten) + "_loc.pdf"); }, "Xuất đúng các dòng đang lọc"));
      bar.appendChild(btn("🖨 In", "", function () { if (!need("export", "in")) return; window.print(); }));
    }
    if (pcMode) bar.appendChild(btn("⬇ PDF", "", function () { var rows = pcRows(); exportSheetsPdf({ title: def.ten + " (đã lọc)", ky: pcScopeText(key), sheets: [{ name: def.ten, rows: rows.map(function (r) { var o = {}; def.cols.forEach(function (c) { o[c] = r[c] == null ? "" : r[c]; }); return o; }) }] }, slug(def.ten) + "_loc.pdf"); }, "Xuất đúng các dòng đang lọc"));
    bar.appendChild(btn("⬇ Xuất Excel", "", function () { var rows = scanRows(), loc = sfm && !SFC.isEmpty(sfm.cfg.state.get()); saveXlsx(slug(def.ten) + (inMode ? (inputF(key).tu || inputF(key).den ? "_loc" : "_" + kyStr()) : theoKy && !(pcMode && plfScoped(key)) ? "_" + kyStr() : (pcMode ? "_loc" : "")) + (loc && !pcMode && !inMode ? "_loc" : "") + ".xlsx", [{ name: def.ten, cols: def.cols, rows: rows }], key === "sanluong" || key === "bandam" ? undefined : "pro"); }));
    card.appendChild(bar);
    if (key === "sanluong") (db.sl_chuyenky || []).filter(function (r) { return r.source === kyStr() || r.target === kyStr(); }).forEach(function (r) { card.appendChild(h("div", { class: "warn", text: "Sản lượng phát sinh " + r.source + " → tính vào lương " + r.target + ". Người/công theo kỳ phát sinh; đơn giá/bù theo kỳ chi trả. Không tính hai lần." })); });
    if (inMode) INDEX_PB = null;
    sfm = mountGridSF(); card.appendChild(sfm.el);
    if (pcMode || inMode) card.appendChild(pcTot);
    /** Cấu hình HAK Smart Filter cho lưới nhập liệu / danh mục. Trạng thái nằm ở chính các đối tượng cũ (st.plf / st.inf / st.rf+st.ccf / st.qs / st.catf) — không tạo kho dữ liệu thứ hai. */
    function mountGridSF() {
      var fr = [], kind = pcMode ? "pc" : inMode ? "in" : shared ? "cc" : "cat";
      var deptOpts = function () { var d = {}; db[key].forEach(function (r) { var v = String(r["Mã phòng ban"] || "").trim(); if (v) d[v] = 1; }); return Object.keys(d).sort(); };
      var fields = [], quick = ["q"], adv = ["q"];
      var add = function (f, isQuick) { fields.push(f); adv.push(f.key); if (isQuick) quick.push(f.key); };
      if (pcMode || inMode) { quick.push("period"); adv.push("period"); }
      if (pcMode) add({ key: "pb", label: "Phòng ban", type: "multi", withNone: true, options: deptOpts }, true);
      if (inMode) {
        add({ key: "pb", label: "Phòng ban", type: "multi", withNone: true, options: function () { var d = {}; (db.dm_phongban || []).forEach(function (r) { var v = String(r["Mã phòng ban"] || "").trim(); if (v) d[v] = 1; }); db[key].forEach(function (r) { INDEX_PB = INDEX_PB || inputPbMap(); var v = INDEX_PB.at(r["Mã NV"], VAL.normDate(r[INPUT_FILTER[key]])).pb; if (v) d[v] = 1; }); return Object.keys(d).sort(); } }, true);
        add({ key: "nv", label: "Nhân viên", type: "multi", options: function () { return db.nhanvien.map(function (n) { return { value: n["Mã NV"], label: n["Mã NV"] + " — " + (n["Họ và tên"] || "") }; }).sort(function (x, y) { return x.value < y.value ? -1 : 1; }); } }, false);
      }
      if (shared) {
        RF.setContext(rfContext());
        db.chamcong.forEach(function (r) { if (rowInKy(r, def)) fr.push({ "Mã NV": r["Mã NV"], "Họ và tên": "", "Phòng ban": deptOf[r["Mã NV"]] || "" }); });
        var op = RF.options(fr), hts = {}; db.chamcong.forEach(function (r) { if (rowInKy(r, def)) hts[String(r["Hình thức công"] || "").trim().toUpperCase()] = 1; });
        if (op.khoi.length) add({ key: "khoi", label: "Khối", type: "multi", options: function () { return op.khoi; } }, false);
        add({ key: "phongBan", label: "Phòng ban", type: "multi", options: function () { return op.phongBan; } }, true);
        if (op.to.length) add({ key: "to", label: "Tổ", type: "multi", options: function () { return op.to; } }, false);
        add({ key: "ht", label: "Hình thức công", type: "multi", withNone: true, options: function () { return Object.keys(hts).filter(Boolean).sort(); } }, true);
        add({ key: "warn", label: "Cảnh báo", type: "enum", options: [{ value: "bad", label: "Chỉ dòng có ô lỗi / bất thường" }] }, false);
        add({ key: "src", label: "Nguồn OCR", type: "enum", options: [{ value: "has", label: "Có nguồn OCR (chứng từ gốc)" }, { value: "none", label: "Không có nguồn OCR" }, { value: "edited", label: "Đã sửa tay sau khi nhập OCR" }] }, false);
        if (op.nhanVien.length <= 3000) add({ key: "maNV", label: "Nhân viên", type: "multi", options: function () { return op.nhanVien; } }, false);
      }
      if (kind === "cat") {
        var hasTT = def.cols.indexOf("Trạng thái") >= 0, hasHL = def.cols.indexOf("Hiệu lực từ") >= 0 || def.cols.indexOf("Hiệu lực đến") >= 0;
        if (hasTT) add({ key: "tt", label: "Trạng thái", type: "enum", options: function () { var d = {}; db[key].forEach(function (r) { var v = String(r["Trạng thái"] || "").trim(); if (v) d[v] = 1; }); return Object.keys(d).sort(); } }, true);
        if (hasHL) add({ key: "hl", label: "Hiệu lực", type: "enum", options: [{ value: "dang", label: "Đang hiệu lực" }, { value: "chua", label: "Chưa hiệu lực" }, { value: "het", label: "Đã hết hiệu lực" }] }, true);
      }
      var get, set;
      if (kind === "pc" || kind === "in") {
        var f0 = function () { return pcMode ? plfOf(key) : inputF(key); };
        get = function () { var f = f0(), s = SFC.empty(); s = SFC.setDates(s, f.tu, f.den); s.q = st.qs[key] || ""; if ((f.pb || []).length) s.sel.pb = f.pb.slice(); if (inMode && (f.nv || []).length) s.sel.nv = f.nv.slice(); return s; };
        set = function (s) { var f = f0(); f.pb = (s.sel.pb || []).slice(); if (inMode) f.nv = (s.sel.nv || []).slice(); f.tu = s.tu; f.den = s.den; f.thang = ""; f.ky = ""; st.qs[key] = s.q; saveUi(); };
      } else if (kind === "cc") {
        get = function () { var c = st.ccf || {}, s = rfStateGet(); if ((c.ht || []).length) s.sel.ht = c.ht.slice(); if (c.warn) s.one.warn = c.warn; if (c.src) s.one.src = c.src; return s; };
        set = function (s) { rfStateSet(s); st.ccf = { ht: (s.sel.ht || []).slice(), warn: s.one.warn || "", src: s.one.src || "" }; };
      } else {
        get = function () { var c = catF(key), s = SFC.empty(); s.q = st.qs[key] || ""; if (c.tt) s.one.tt = c.tt; if (c.hl) s.one.hl = c.hl; return s; };
        set = function (s) { st.catf = st.catf || {}; st.catf[key] = { tt: s.one.tt || "", hl: s.one.hl || "" }; st.qs[key] = s.q; saveUi(); };
      }
      var cfg = {
        screenId: key, attrs: pcMode ? { "data-pc-filter": key } : inMode ? { "data-in-filter": key } : shared ? { "data-cc-filter": "1", "data-rf": "1" } : { "data-cat-filter": key }, qAttrs: shared ? { "data-rf-key": "tuKhoa" } : {}, qCommit: shared, fields: fields, quickFields: quick, advancedFields: adv, state: { get: get, set: set },
        searchPlaceholder: kind === "cc" ? "🔍 Tìm mã NV / tên…" : "🔍 Tìm trong bảng…", periodNoneLabel: "Kỳ: kỳ đang chọn",
        periods: function () { return sfPeriods(db[key], def.dateCol || ""); }, labelOf: function (k) { return RF_LABEL[k] || k; },
        scopeFallback: function () { return theoKy ? "kỳ " + st.thang + "/" + st.nam : "tất cả"; },
        dataSource: function () { var sc = lastScan || scan(); return { kept: sc.kept, total: sc.total, unsupported: [] }; },
        onApply: function () { st.pg[key] = 0; draw(); }
      };
      var m = sfUi.mount(cfg); m.cfg = cfg; return m;
    }
    if (noRight) card.appendChild(h("div", { class: "locked", html: "👁 Chế độ <b>chỉ xem</b> — vai trò của bạn không có quyền sửa bảng này." }));
    else if (locked) card.appendChild(h("div", { class: "locked", html: "🔒 <b>" + kyLabel(kyStr()) + " đã chốt lương</b> — dữ liệu kỳ này chỉ xem, không sửa được. Muốn sửa: vào <b>Kỳ lương đã chốt</b> → Mở chốt." }));
    var guideBox = h("details", { class: "hak-fold" }, [h("summary", { text: "ⓘ Hướng dẫn nhập liệu" })]); card.insertBefore(guideBox, card.firstChild && card.firstChild.className === "hint" ? card.firstChild.nextSibling : card.firstChild); // 005B-UI002: gấp hướng dẫn/chú giải để bảng có chỗ (mở bằng bấm)
    if (tiencomHint) guideBox.appendChild(tiencomHint);
    guideBox.appendChild(h("div", { class: "hint", text: (def.hint ? def.hint + " " : "") + "Nhập hàng loạt: bấm '📄 Tải file mẫu' → điền Excel → '⬆ Nhập Excel'. Hoặc copy nhiều dòng từ Excel rồi Ctrl+V vào một ô." }));
    if (key === "chamcong") guideBox.appendChild(h("div", { class: "legend", html: "<b>Màu ô:</b> <span><i class='c1'>1</i>đủ công</span><span><i class='cH'>0,5</i>nửa công</span><span><i class='cX'>1QC</i>có nhãn / dòng tăng ca</span><span><i class='cP'>1</i>dòng phép (PN)</span><span><i class='cO'>1</i>dòng lễ (CL)</span><span><i class='cE'>?</i>không đọc được số công</span><span><i class='we'>&nbsp;</i>Chủ nhật</span>" }));
    card.appendChild(body); wrap.appendChild(card);
    var vis = def.cols.filter(function (c) { return (def.hide || []).indexOf(c) < 0; });
    // Tô màu ô chấm công theo số công + loại dòng (Hình thức công) — chỉ hiển thị, không đổi dữ liệu
    var dayCls = function (v, ht) {
      if (v === "" || v == null) return "";
      var t = E.tachCong(v); if (!t.soCong) return "cv cE";
      ht = String(ht || "BT").trim().toUpperCase();
      if (ht === "PN") return "cv cP"; if (ht === "CL") return "cv cO"; if (/^TC/.test(ht) || t.nhan) return "cv cX";
      return t.soCong >= 1 ? "cv c1" : "cv cH";
    };

    var todayIso = function () { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
    function catSave() {
      var e = cedit(key); if (!e || !need(editPerm)) return;
      e.state = "VALIDATING"; var cleaned = {}, errs = [];
      def.cols.forEach(function (c) { var v = e.draft[c], n = VAL.normCell(c, v == null ? "" : String(v)); if (n.error) errs.push(c + ": " + n.error); else cleaned[c] = n.value; });
      if (errs.length) { e.state = "EDITING"; e.err = errs.join(" · "); draw(); return; }
      e.state = "SAVING";
      var plan = e.mode === "new" ? REPO.plan("insert", key, null, Object.assign({}, e.draft, cleaned), { what: "thêm danh mục" }) : REPO.plan("update", key, db[key][e.ri], cleaned, { what: "sửa danh mục" });
      if (!plan.ok) { e.state = "EDITING"; e.err = plan.msg; draw(); alert(plan.msg); return; }
      if (plan.retro && !can("retro.edit")) { e.state = "EDITING"; alert("⛔ Không thể lưu: dữ liệu có hiệu lực trong kỳ lương đã chốt.\nChỉ Admin được sửa dữ liệu hồi tố (quy tắc Q-14)."); draw(); return; }
      if (plan.retro && !confirm("⚠ " + retroText(plan.impact) + "\n\nTiếp tục lưu?")) { e.state = "EDITING"; draw(); return; }
      if (!commit(plan, { audit: "always", action: e.mode === "new" ? "Thêm danh mục" : "Sửa danh mục" })) { e.state = "EDITING"; e.err = "Không lưu được — dữ liệu nháp được giữ để sửa tiếp"; draw(); return; }
      save(); delete st.cedit[key]; draw(); updateNav(); toast("✓ Đã lưu " + (def.ten || key));
    }
    function catCancel() { var e = cedit(key); if (e && e.dirty && !confirm("Bỏ các thay đổi chưa lưu?")) return; delete st.cedit[key]; draw(); }
    function catRemove(ri, r) {
      if (!need(editPerm)) return;
      var u = catUsage(key, r, def), stopCol = def.cols.indexOf("Trạng thái") >= 0 ? "Trạng thái" : (def.cols.indexOf("Hiệu lực đến") >= 0 ? "Hiệu lực đến" : null);
      if (u.n || u.closed) {
        if (!stopCol) { alert("⛔ Mã này đã được dùng ở: " + u.where.join(", ") + ".\nBảng này không có cột Trạng thái/Hiệu lực đến nên không thể Ngừng hiệu lực, và KHÔNG được xóa để giữ khả năng xem lại kỳ lương cũ."); return; }
        if (!confirm("Mã đã được dùng ở: " + u.where.join(", ") + ".\nKhông xóa — chỉ NGỪNG HIỆU LỰC (vẫn giữ lịch sử). Tiếp tục?")) return;
        var patch = {}; patch[stopCol] = stopCol === "Trạng thái" ? "Ngừng" : todayIso();
        var pS = REPO.plan("update", key, r, patch, { what: "ngừng hiệu lực" }); if (!pS.ok) { alert(pS.msg); return; }
        if (!commit(pS, { audit: "always", action: "Ngừng hiệu lực danh mục" })) return;
        save(); draw(); toast("Đã ngừng hiệu lực"); return;
      }
      var pX = REPO.plan("remove", key, r, null, { what: "xóa danh mục" }); if (!pX.ok) { alert(pX.msg); return; }
      if (!confirm("Mã chưa được dùng ở đâu. Xóa dòng này?" + (pX.retro ? "\n\n" + retroText(pX.impact) : ""))) return;
      if (!commit(pX, { audit: "always", action: "Xóa dòng danh mục" })) return;
      save(); draw(); updateNav();
    }
    function catActions(ri, r, editing) {
      var td = h("td", { class: "catact", style: "white-space:nowrap;text-align:center" }), e = cedit(key);
      if (editing) {
        td.appendChild(btn("Lưu", "pri", catSave, "Kiểm tra hợp lệ rồi ghi")); td.appendChild(btn("Hủy", "ghost", catCancel, "Bỏ thay đổi, giữ dữ liệu gốc"));
        td.appendChild(h("div", { class: "hint", "data-cat-state": e.state, style: "margin:2px 0" , text: e.dirty ? "● Có thay đổi chưa lưu" : "Đang sửa" }));
        if (e.err) td.appendChild(h("div", { class: "warn", style: "margin:2px 0;white-space:normal", text: e.err }));
        return td;
      }
      if (locked) return td;
      var busy = !!cedit(key);
      if (key !== "dm_tncn") td.appendChild(btn("Chi tiết", "ghost", function () {
        var b = h("div", { "data-cat-detail": key }), t = h("table");
        def.cols.filter(function (c) { return (def.hide || []).indexOf(c) < 0; }).forEach(function (c) { t.appendChild(h("tr", {}, [h("th", { text: c, style: "text-align:left;width:38%" }), h("td", { class: "t", text: r[c] == null ? "" : String(r[c]) })])); });
        b.appendChild(h("div", { class: "tw" }, [t]));
        modal("Chi tiết — " + def.ten, b, function (close) { return [btn("Đóng", "pri", close)]; });
      }, "Xem toàn bộ trường của dòng (chỉ xem)"));
      td.appendChild(btn("Sửa", "ghost", function () { if (busy && !confirm("Đang sửa một dòng khác" + (cedit(key).dirty ? " (có thay đổi chưa lưu)" : "") + " — bỏ để sửa dòng này?")) return; if (!need(editPerm)) return; st.cedit = st.cedit || {}; st.cedit[key] = { mode: "edit", ri: ri, draft: Object.assign({}, r), dirty: false, state: "EDITING" }; draw(); }, "Sửa dòng này (chưa ghi cho tới khi bấm Lưu)"));
      td.appendChild(btn("Sao chép", "ghost", function () { if (!need(editPerm)) return; var c2 = Object.assign({}, r); delete c2._id; st.cedit = st.cedit || {}; st.cedit[key] = { mode: "new", ri: -1, draft: c2, dirty: true, state: "EDITING" }; draw(); }, "Tạo dòng mới từ dòng này (nháp)"));
      td.appendChild(btn("Lịch sử", "ghost", function () { catHistory(key, r, def); }));
      td.appendChild(btn("Xóa / Ngừng", "red ghost", function () { catRemove(ri, r); }, "Mã chưa dùng: xóa · đã dùng: ngừng hiệu lực"));
      return td;
    }

    function draw() {
      refreshNVList();
      body.innerHTML = "";
      if (inputReview) {
        var badRows = (db[key] || []).map(function (r, i) { return {r:r,i:i}; }).filter(function (x) { return !VAL.rowPeriod(key,x.r); });
        if (badRows.length) { var badBox = h("div", {class:"warn", "data-invalid-input":key}, [h("b",{text:badRows.length + " dòng lỗi ngày/kỳ — cần sửa trước khi tính lương"})]); badRows.forEach(function (x) { badBox.appendChild(h("div", {}, [h("span",{text:(x.r["Phiếu cân"] || x.r["Mã NV"] || "Dòng " + (x.i+1)) + " · "}), btn("Sửa dòng lỗi", "", function () { if(key === "bandam")bandamEntryForm(x.i,draw);else inputRowEdit(key,ALL[key],x.i,draw); }), btn("Xóa dòng lỗi", "red ghost", function () { if(!need(editPerm)||!confirm("Xóa dòng lỗi này?"))return;if(!txn([key],function(){return !!commit(REPO.plan("remove",key,db[key][x.i],null));})){alert(lastTxnError);return;}draw(); })])); }); body.appendChild(badBox); }
      }
      var sc = scan(), idx = sc.idx.slice(), qq = qOf(key), nameOf = sc.nameOf, LKMAP = sc.LKMAP;
      if (pcMode) {
        var T = LF.tongPhieuCan(idx.map(function (i2) { return db[key][i2]; })), unit = key === "bandam" ? " xe" : " tấn";
        pcTot.innerHTML = "";
        pcTot.appendChild(h("div", { html: "<b>Tổng theo bộ lọc (" + esc(pcScopeText(key)) + "):</b> " + T.soPhieu + " phiếu · <b>" + fmt(T.tongKL) + unit + "</b> · đã phân bổ " + fmt(T.daPhanBo) + " · chờ phân bổ " + fmt(T.choPhanBo) + (T.trung.length ? " · <span style='color:#b00'>⚠ " + T.trung.length + " phiếu trùng khóa (chỉ tính 1 lần): " + esc(T.trung.slice(0, 5).join(", ")) + "</span>" : "") }));
        var fl = function (o) { return Object.keys(o).sort().map(function (k2) { return k2 + ": " + fmt(o[k2]); }).join(" · "); };
        pcTot.appendChild(h("details", { class: "hak-fold" }, [h("summary", { text: "Chi tiết theo ngày / phòng ban" }), h("div", { class: "hint", text: "Theo ngày — " + (fl(T.theoNgay) || "—") }), h("div", { class: "hint", text: "Theo phòng ban — " + (fl(T.theoPhongBan) || "—") })])); // 005B-UI002: gấp để bảng có chỗ
      }
      if (inMode) {
        pcTot.innerHTML = ""; var sums = INPUT_SUM[key].map(function (c) { var t = 0; idx.forEach(function (i2) { t += E.money(db[key][i2][c]); }); return "<b>" + esc(c) + ":</b> " + fmt(t); });
        pcTot.appendChild(h("div", { "data-in-totals": key, html: "<b>Tổng theo bộ lọc (" + esc(inputScopeText(key)) + "):</b> " + idx.length + " dòng · " + sums.join(" · ") }));
        if (CT_KEY[key] && idx.length) pcTot.appendChild(btn("Đối soát theo nhân viên", "", function () {
          moneyInputReview(key, idx.map(function (i) { return db[key][i]; }), nameOf);
        }));
      }
      if (isCat && cedit(key) && cedit(key).mode === "new") idx.unshift(-1);
      cnt.textContent = idx.length + " dòng" + (theoKy ? " (kỳ " + st.thang + "/" + st.nam + ")" : "") + (qq ? " · đang lọc \"" + st.qs[key] + "\"" : "");
      if (sfm) sfm.refresh(); // chip / số điều kiện / dòng kết quả — không dựng lại ô đang nhập
      refreshInputReview();
      if (!idx.length) { body.appendChild(h("div", { class: "empty", html: qq ? "Không có dòng nào khớp \"" + esc(st.qs[key]) + "\"." : "Chưa có dữ liệu" + (theoKy ? " cho kỳ " + st.thang + "/" + st.nam : "") + ".<br>Bấm <b>＋ Thêm dòng</b> hoặc dán từ Excel." })); return; }
      var pg = pager(key, idx.length, draw);
      if (pg.el) body.appendChild(pg.el);
      var t = h("table"), trh = h("tr");
      trh.appendChild(h("th", { class: "stk", text: "#", style: "width:36px" }));
      if (["chamcong", "sanluong", "bandam"].indexOf(key) >= 0) trh.appendChild(h("th", { text: "Thao tác", style: "position:sticky;left:36px;z-index:4;background:var(--bg,#fff)" }));
      vis.forEach(function (c) {
        var isDay = /^\d\d$/.test(c), cls = isDay ? "day" : (NUMCOLS.test(c) && !DATECOLS.test(c) ? "r" : "");
        if (isDay) { var dt = new Date(st.nam, st.thang - 1, +c); if (dt.getMonth() === st.thang - 1 && dt.getDay() === 0) cls += " we"; }
        if (key === "sanluong" && c === "Ngày cân") trh.appendChild(h("th", { text: "Ngày cân gốc", style: "min-width:110px" }));
        var th = h("th", { class: cls, text: isDay ? String(+c) : key === "bandam" && c === "KL hàng (Tấn)" ? "Số xe" : key === "sanluong" && c === "Ngày cân" ? "Ngày phân bổ" : c });
        if (COLW[c]) th.style.minWidth = COLW[c] + "px"; else if (MONEYCOLS.test(c)) th.style.minWidth = "120px";
        trh.appendChild(th);
        if (c === "Mã NV" && def.showName) trh.appendChild(h("th", { text: "Họ tên", style: "min-width:150px" }));
      });
      if (def.total) trh.appendChild(h("th", { class: "r", text: "Tổng" }));
      if (!inputReview) trh.appendChild(h("th", { text: "" }));
      t.appendChild(h("thead", {}, [trh]));
      var tb = h("tbody");
      idx.slice(pg.start, pg.end).forEach(function (ri, n0) {
        var n = pg.start + n0; // vị trí trong TOÀN BỘ danh sách đã lọc (dán nhiều dòng tiếp sang trang sau đúng thứ tự)
        var ced = isCat ? cedit(key) : null, editing = !!ced && ced.ri === ri, r = ri === -1 ? ced.draft : db[key][ri], tr = h("tr", { class: editing ? "catedit" : "" }), tot = h("td", { class: "r" });
        var rowLocked = locked || (["chamcong", "sanluong", "bandam"].indexOf(key) >= 0 && (db.sl_chuyenky || []).some(function (x) { return x.source === VAL.rowPeriod(key, r); }));
        tr.appendChild(h("td", { class: "t stk", text: n + 1 }));
        if (["chamcong", "sanluong", "bandam"].indexOf(key) >= 0) tr.appendChild(h("td", { style: "position:sticky;left:36px;z-index:1;background:var(--bg,#fff)" }, rowLocked ? [h("span", { text: "Đã khóa" })] : [btn("Sửa", "ghost", function () { if (key === "bandam") bandamEntryForm(ri, draw); else inputRowEdit(key, def, ri, draw); }), btn("Xóa", "red ghost", function () { if (!need(editPerm) || !confirm("Xóa dòng này?")) return; if (!txn([key], function () { return !!commit(REPO.plan("remove", key, db[key][ri], null), { action: "Xóa dòng nhập liệu" }); })) { alert("Chưa xóa: " + lastTxnError); return; } draw(); })]));
        var updTot = function () { var s = 0; DAYS.forEach(function (d) { s += E.tachCong(r[d]).soCong; }); tot.textContent = s ? fmt(Math.round(s * 100) / 100) : ""; };
        vis.forEach(function (c, ci) {
          var isDay = /^\d\d$/.test(c), cls = isDay ? "day" : "";
          if (isDay) { var dt = new Date(st.nam, st.thang - 1, +c); if (dt.getMonth() === st.thang - 1 && dt.getDay() === 0) cls += " we"; }
          var nameTd;
          var inp = makeInput(c, r[c], function (v) {
            if (isCat) { // danh mục: chỉ cập nhật bản nháp, KHÔNG ghi dữ liệu
              if (!editing) { inp.value = r[c] == null ? "" : r[c]; return; }
              var nc = VAL.normCell(c, v); if (nc.error) { toast("⚠ " + c + ": " + nc.error); inp.value = ced.draft[c] == null ? "" : ced.draft[c]; return; }
              ced.draft[c] = nc.value; ced.dirty = true; ced.err = ""; if (inp.value !== nc.value) inp.value = nc.value;
              var st0 = tr.querySelector("[data-cat-state]"); if (st0) { st0.textContent = "● Có thay đổi chưa lưu"; st0.setAttribute("data-cat-state", "EDITING"); }
              return;
            }
            if (!need(editPerm)) { inp.value = r[c] == null ? "" : r[c]; return; }
            var n = VAL.normCell(c, v);
            if (n.error) { toast("⚠ " + c + ": " + n.error); inp.value = r[c] == null ? "" : r[c]; return; }
            var patch = {}; patch[c] = n.value;
            // Kỳ đã chốt, ô ngày sai, quyền, hồi tố (danh mục chồng lên kỳ đã chốt: chỉ Admin, cảnh báo + nhật ký) — repository kiểm tra
            var idE = ID.checkWrite(db, key, r, patch); if (idE) { alert(idE); inp.value = r[c] == null ? "" : r[c]; return; } // 1 người 1 Mã NV (CCCD)
            var pE = REPO.plan("update", key, r, patch, { what: "sửa dòng này", checkDup: CT_KEY[key] });
            if (!pE.ok) { alert(pE.msg); inp.value = r[c] == null ? "" : r[c]; return; }
            var dc = isDay && key === "chamcong" ? VAL.dayCell(c, n.value, r["Kỳ"]) : null;
            if (dc && dc.warn) toast("⚠ " + dc.warn);
            if (pE.retro) toast("⚠ Hồi tố: dòng này có hiệu lực trong kỳ đã chốt " + pE.impact.periods.map(GRD.label).join(", ") + " — bảng lương đã chốt không đổi");
            if (!commit(pE, { audit: theoKy ? false : "retro", action: "Sửa danh mục" })) { inp.value = r[c] == null ? "" : r[c]; return; }
            if (inp.value !== n.value && !isDay) inp.value = n.value;
            save(); refreshInputReview(); if (c === "Mã NV" && nameTd) nameTd.textContent = tenNV(n.value) || (n.value ? "⚠ chưa có trong Nhân sự" : ""); if (isDay) updTot();
          }, null, key);
          if (key === "chamcong" && isDay) { var lkc = LKMAP[attRecordId("chamcong", r) + "|" + c]; if (lkc) { inp.classList.add("has-src"); inp.title = "Nguồn: " + lkc.docId + " trang " + lkc.page + " — chuột phải (hoặc Alt+bấm) để xem ảnh/PDF gốc"; inp.addEventListener("contextmenu", function (ev) { ev.preventDefault(); openCellSource(lkc); }); inp.addEventListener("click", function (ev) { if (ev.altKey) { ev.preventDefault(); openCellSource(lkc); } }); } }
          inp.addEventListener("paste", function (ev) {
            if (isCat) return; // danh mục: dán nhiều dòng không được ghi ngầm; dùng Nhập Excel (có xem trước)
            var txt = (ev.clipboardData || window.clipboardData).getData("text");
            if (txt.indexOf("\t") < 0 && txt.indexOf("\n") < 0) return;
            ev.preventDefault();
            if (!need(editPerm)) return;
            if (!theoKy && GRD.closedPeriods(db).length && !can("retro.edit")) { alert("⛔ Đã có kỳ lương chốt — chỉ Admin được dán hàng loạt vào danh mục (có thể hồi tố)."); return; }
            var lines = txt.replace(/\r/g, "").replace(/\n$/, "").split("\n"), start = def.cols.indexOf(c);
            var bad = 0, skip = 0, retro = 0, retroKy = {};
            lines.forEach(function (ln, li) {
              var tgt = idx[n + li], cand = tgt == null ? newRow() : Object.assign({}, db[key][tgt]);
              ln.split("\t").forEach(function (v, k) { var col = def.cols[start + k]; if (col && col !== def.kyCol) { var nc = VAL.normCell(col, v); if (nc.error || (key === "chamcong" && /^\d\d$/.test(col) && VAL.dayCell(col, nc.value, cand["Kỳ"]).error)) { bad++; return; } cand[col] = nc.value; } });
              var cur0 = tgt == null ? null : db[key][tgt]; if (ID.checkWrite(db, key, cur0, cand)) { skip++; return; } // CCCD đã thuộc người khác: không ghi dòng này
              var pP = tgt == null ? REPO.plan("insert", key, null, cand, { what: "dán dữ liệu", checkDup: CT_KEY[key] }) : REPO.plan("update", key, db[key][tgt], cand, { what: "dán dữ liệu", checkDup: CT_KEY[key] });
              var rP = pP.ok ? REPO.apply(pP, { audit: theoKy ? false : "retro", action: "Dán dữ liệu" }) : pP;
              if (!rP.ok) { skip++; return; }
              // Danh mục chồng lên kỳ đã chốt: repository đã ghi nhật ký [HỒI TỐ] từng dòng — đếm lại để cảnh báo (không chặn)
              if (rP.retro) { retro++; rP.impact.periods.forEach(function (p) { retroKy[p] = 1; }); }
              if (tgt == null) idx.push(db[key].length - 1);
            });
            save(); draw(); toast("Đã dán " + (lines.length - skip) + " dòng" + (skip ? " · bỏ qua " + skip + " dòng (thuộc kỳ đã chốt / không đủ quyền / không hợp lệ)" : "") + (bad ? " · " + bad + " ô sai định dạng / ngày không hợp lệ — KHÔNG dán, kiểm tra lại" : "") +
              (retro ? " · ⚠ " + retro + " dòng hồi tố kỳ đã chốt " + Object.keys(retroKy).sort().map(GRD.label).join(", ") + " — bảng lương đã chốt không đổi" : ""));
          });
          if (isDay && key === "chamcong") {
            var paint = function () { inp.className = dayCls(inp.value, r["Hình thức công"]); };
            paint(); inp.addEventListener("input", paint); inp.addEventListener("change", function () { setTimeout(paint, 0); });
          }
          if (rowLocked || (isCat && !editing)) inp.disabled = true; if (isCat && editing) inp.classList.add("editing");
          // Ngày không có trong tháng (VD 31/09): không cho nhập; nếu dữ liệu cũ có giá trị thì vẫn cho sửa để xóa
          if (isDay && key === "chamcong" && +c > VAL.daysInKy(r["Kỳ"]) && (r[c] === "" || r[c] == null)) { inp.disabled = true; inp.title = "Tháng này không có ngày " + c; cls += " dis"; }
          var td = h("td", { class: cls }, [inp]); if (inp._dl) td.appendChild(inp._dl);
          if (key === "sanluong" && c === "Ngày cân") tr.appendChild(h("td", { class: "dis", text: fmtDate(r["Ngày cân gốc"] || r["Ngày cân"]) }));
          tr.appendChild(td);
          if (c === "Mã NV" && def.showName) { var nm = nameOf(r["Mã NV"]); nameTd = h("td", { class: "dis", text: nm || (r["Mã NV"] ? "⚠ chưa có trong Nhân sự" : "") }); tr.appendChild(nameTd); }
        });
        if (def.total) { updTot(); tr.appendChild(tot); }
        if (isCat) tr.appendChild(catActions(ri, r, editing));
        else if (!inputReview) tr.appendChild(h("td", { style: "text-align:center" }, [rowLocked ? null : btn("✕", "red ghost", function () {
          if (!need(editPerm)) return;
          var pX = REPO.plan("remove", key, db[key][ri], null, { what: "xóa dòng này" });
          if (!pX.ok) { alert(pX.msg); return; }
          if (!confirm("Xóa dòng này?" + (pX.retro ? "\n\n" + retroText(pX.impact) : ""))) return;
          if (!commit(pX, { audit: theoKy ? false : "always", action: "Xóa dòng danh mục" })) return;
          save(); draw(); updateNav();
        }, "Xóa dòng")]));
        tb.appendChild(tr);
      });
      // Bàn phím như Excel: Enter = xuống ô cùng cột dòng dưới, Shift+Enter = lên (ô đang gõ được ghi khi rời ô)
      tb.addEventListener("keydown", function (ev) {
        if (ev.key !== "Enter" || ev.target.tagName !== "INPUT") return;
        var td = ev.target.closest("td"), tr = td && td.parentNode; if (!tr) return;
        var col = Array.prototype.indexOf.call(tr.children, td), nx = ev.shiftKey ? tr.previousElementSibling : tr.nextElementSibling;
        var nxIn = nx && nx.children[col] && nx.children[col].querySelector("input:not([disabled])");
        if (nxIn) { ev.preventDefault(); nxIn.focus(); nxIn.select(); }
      });
      t.appendChild(tb); body.appendChild(t);
      if (pg.el && pg.end - pg.start > 20) body.appendChild(pager(key, idx.length, draw).el);
      updateNav();
    }
    draw();
    return wrap;
  }

  // ---------- NHÂN SỰ (mô hình QL_NHANSU) ----------
  var HR = HRM.HR;
  function refOptions(ref) {
    var c = HRM.REFS[ref], seen = {}, out = [];
    (db[ref] || []).forEach(function (r) { var v = r[c[0]]; if (v && !seen[v]) { seen[v] = 1; out.push([v, r[c[1]] || ""]); } });
    return out;
  }
  function dispVal(f, v) {
    if (v === "" || v == null) return "";
    if (f.t === "ref") return v + (HRM.refName(db, f.ref, v) !== v ? " — " + HRM.refName(db, f.ref, v) : "");
    if (f.t === "multi") return HRM.split(v).join(", ");
    if (f.t === "money") return fmt(E.money(v));
    if (f.t === "date") { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v)); if (m) return m[3] + "/" + m[2] + "/" + m[1]; }
    return String(v);
  }
  // Tạo các ô nhập cho danh sách field; trả về hàm lấy dữ liệu
  function fieldInputs(container, fields, data) {
    var getters = {};
    fields.forEach(function (f) {
      var v = data[f.k] == null ? "" : String(data[f.k]), el, wrap = h("div", { class: "fld" + (f.t === "area" || f.t === "multi" ? " wide" : ""), "data-k": f.k });
      wrap.appendChild(h("label", { text: (f.label || f.k) + (f.req ? " *" : "") + (f.hint ? " — " + f.hint : "") }));
      if (f.t === "sel" || f.t === "yesno" || f.t === "ref") {
        el = h("select");
        el.appendChild(h("option", { value: "", text: "— chọn —" }));
        var opts = f.t === "ref" ? refOptions(f.ref) : (f.t === "yesno" ? [["Có", ""], ["Không", ""]] : f.o.map(function (o) { return [o, ""]; }));
        if (v && !opts.some(function (o) { return o[0] === v; })) opts.push([v, "(không có trong danh mục)"]);
        opts.forEach(function (o) { el.appendChild(h("option", { value: o[0], text: o[1] ? o[0] + " — " + o[1] : o[0] })); });
        el.value = v;
        getters[f.k] = function () { return el.value; };
      } else if (f.t === "multi") {
        el = h("div", { class: "chips" });
        var cur = HRM.split(v), opts2 = refOptions(f.ref);
        cur.forEach(function (c) { if (!opts2.some(function (o) { return o[0] === c; })) opts2.push([c, "(không có trong danh mục)"]); });
        var boxes = opts2.map(function (o) {
          var cb = h("input", { type: "checkbox", value: o[0] }); cb.checked = cur.indexOf(o[0]) >= 0;
          el.appendChild(h("label", { class: "chip" }, [cb, document.createTextNode(" " + o[0] + (o[1] ? " — " + o[1] : ""))]));
          return cb;
        });
        if (!opts2.length) el.appendChild(h("span", { class: "hint", text: "Danh mục trống — vào Danh mục để thêm" }));
        getters[f.k] = function () { return boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; }).join(", "); };
      } else if (f.t === "area") {
        el = h("textarea", { rows: 2 }); el.value = v; getters[f.k] = function () { return el.value.trim(); };
      } else {
        el = f.t === "date" ? dateField(v) : h("input", { value: v });
        if (f.t === "month") el.type = "month";
        if (f.t === "num" || f.t === "money" || f.t === "pct") el.className = "num";
        if (f.t === "money") { el.addEventListener("blur", function () { var n = VAL.parseMoney(el.value); if (el.value && !isNaN(n)) el.value = fmt(n); }); if (v) { var n0v = VAL.parseMoney(v); el.value = isNaN(n0v) ? v : fmt(n0v); } }
        getters[f.k] = function () { var x = el.value.trim(); if (f.t === "date" && x) { var di = VAL.normDate(x); return di === null ? x : di; } return f.t === "money" && x ? VAL.normMoney(x) : x; };
      }
      wrap.appendChild(el); container.appendChild(wrap);
    });
    return function () { var o = {}; Object.keys(getters).forEach(function (k) { o[k] = getters[k](); }); return o; };
  }

  // ---------- Kiểm soát thay đổi ảnh hưởng kỳ lương đã chốt (core/period-guard.js) ----------
  /** Hỏi trước khi ghi 1 thay đổi. Trả true nếu được phép ghi. */
  function guardChange(table, before, after, what) {
    var imp = GRD.impactChange(db, table, before, after);
    if (imp.kind === "locked") { alert("Không thể " + what + ": dữ liệu thuộc kỳ " + imp.periods.map(GRD.label).join(", ") + " đã chốt lương. Hãy mở chốt trước."); return false; }
    if (imp.kind === "retro" && !can("retro.edit")) { alert("⛔ Không thể " + what + ": dữ liệu có hiệu lực trong kỳ lương đã chốt " + imp.periods.map(GRD.label).join(", ") + ".\nChỉ Admin được sửa dữ liệu hồi tố (quy tắc Q-14)."); return false; }
    if (imp.kind === "retro") return confirm(what.charAt(0).toUpperCase() + what.slice(1) + "?\n\n" + retroText(imp) + "\n\nVẫn lưu thay đổi?");
    return true;
  }
  /** Ghi nhật ký thay đổi có trước/sau; đánh dấu HỒI TỐ nếu chạm kỳ đã chốt. */
  function auditChange(action, table, before, after, ident) {
    var imp = GRD.impactChange(db, table, before, after), ch = GRD.changedFields(before, after);
    audit(action, (ALL[table] ? ALL[table].ten : table) + (ident ? " · " + ident : "") + (ch.length ? " · " + ch.slice(0, 12).join("; ") : "") +
      (imp.kind === "retro" ? " · [HỒI TỐ kỳ đã chốt " + imp.periods.map(GRD.label).join(", ") + "]" : ""));
  }

  /** Khung "Sẽ lưu N thay đổi": so giá trị đang nhập với bản cũ, tô viền ô đã đổi. Trả hàm cập nhật. */
  function liveDiff(body, get, fields, orig) {
    var box = h("section", { class: "diff none", "aria-live": "polite" }), heading = h("div"), list = h("dl"), entries = {}, signature = null;
    box.appendChild(heading); box.appendChild(list);
    var show = function (f, v) { var s = dispVal(f, v); return s === "" ? "(trống)" : s; };
    var upd = function () {
      var d = get(), ch = fields.filter(function (f) { return String(orig[f.k] == null ? "" : orig[f.k]) !== String(d[f.k] == null ? "" : d[f.k]); });
      body.querySelectorAll(".fld[data-k]").forEach(function (w) { w.classList.toggle("chg", ch.some(function (f) { return f.k === w.getAttribute("data-k"); })); });
      var next = JSON.stringify(ch.map(function (f) { return [f.k, d[f.k]]; }));
      if (signature === next) return ch;
      signature = next;
      var scroller = body.closest(".bd"), scrollTop = scroller ? scroller.scrollTop : 0;
      box.className = "diff" + (ch.length ? "" : " none");
      var label = ch.length ? "Sẽ lưu " + ch.length + " thay đổi" : "Chưa có thay đổi nào";
      if (heading.textContent !== label) heading.textContent = label;
      Object.keys(entries).forEach(function (key) { if (!ch.some(function (f) { return f.k === key; })) { entries[key].row.remove(); delete entries[key]; } });
      ch.forEach(function (f) {
        var entry = entries[f.k];
        if (!entry) {
          var value = h("ins", { text: show(f, d[f.k]) });
          var row = h("div", {}, [h("dt", { text: f.label || f.k }), h("dd", {}, [h("del", { text: show(f, orig[f.k]) }), " → ", value])]);
          entry = entries[f.k] = { row: row, value: value }; list.appendChild(row);
        }
        var text = show(f, d[f.k]); if (entry.value.textContent !== text) entry.value.textContent = text;
      });
      if (scroller) scroller.scrollTop = scrollTop;
      return ch;
    };
    body.addEventListener("input", upd); body.addEventListener("change", upd);
    body.appendChild(box); upd();
    return upd;
  }
  // Bảng hồ sơ lưu theo "Hiệu lực từ" (giữ lịch sử): khi sửa được chọn "Thông tin mới" (thêm bản mới) hay "Sửa lỗi nhập sai" (ghi đè)
  var VERSIONED = { canhan: 1, thanhtoan: 1 };
  function hrForm(key, row, base, onDone) {
    var rowIndex = row ? db[key].indexOf(row) : -1;
    var cfg = HR[key], isNew = !row, data = Object.assign({}, base || {}, row || {});
    if (isNew && cfg.defaults) Object.assign(data, cfg.defaults(base));
    var body = h("div");
    if (cfg.desc) body.appendChild(h("div", { class: "hint", text: cfg.desc }));
    var ver = !isNew && VERSIONED[key], mode = { v: ver ? "new" : "fix" };
    if (ver) {
      var mk = function (val, title, sub) {
        var r = h("input", { type: "radio", name: "hrmode", value: val }); r.checked = mode.v === val;
        r.addEventListener("change", function () { mode.v = val; var hl = body.querySelector('.fld[data-k="Hiệu lực từ"] input'); if (hl && val === "new" && hl.value === (row["Hiệu lực từ"] || "")) hl.value = HRM.today(); if (hl && val === "fix") hl.value = row["Hiệu lực từ"] || ""; if (upd) upd(); });
        return h("label", {}, [r, h("span", {}, [h("b", { text: title }), h("small", { text: sub })])]);
      };
      body.appendChild(h("div", { class: "mode", role: "radiogroup", "aria-label": "Loại thay đổi" }, [
        mk("new", "Thông tin mới", "Đổi CCCD, địa chỉ, tài khoản… — thêm bản mới từ ngày 'Hiệu lực từ', bản cũ giữ làm lịch sử"),
        mk("fix", "Sửa lỗi nhập sai", "Ghi đè bản này; nhật ký vẫn lưu giá trị cũ")]));
      data["Hiệu lực từ"] = HRM.today();
    }
    // Q-24: không có quyền xem lương → không hiện ô lương (người này cũng không có quyền lưu hồ sơ)
    var fs = canSeePay() ? cfg.f : cfg.f.filter(function (f) { return !HRM.isPayField(key, f.k); });
    if (fs.length < cfg.f.length) body.appendChild(h("div", { class: "hint", text: "🔒 Các ô lương được ẩn vì vai trò của bạn không có quyền xem lương." }));
    var g = h("div", { class: "fgrid" }); body.appendChild(g);
    var get = fieldInputs(g, fs, data), upd = null;
    if (!isNew) upd = liveDiff(body, get, fs, Object.assign({}, row));
    // Bản ghi bị khóa (Q-15 phụ lục đã dùng cho kỳ chốt / kỳ đã chốt): báo ngay khi mở, không đợi bấm Lưu
    var p0 = isNew ? null : REPO.plan("update", key, row, {}, { what: "sửa " + cfg.ten });
    if (p0 && !p0.ok && (p0.code === "frozen" || p0.code === "locked")) body.insertBefore(h("div", { class: "locked", text: p0.msg }), body.firstChild);
    modal((isNew ? "Thêm: " : "Sửa: ") + cfg.ten, body, function (close) {
      return [btn("Hủy", "", close), btn("💾 Lưu", "pri", function () {
        var d = get(), miss = missingReq(fs, d);
        if (miss.length) { alert("Cần nhập: " + miss.join(", ")); return; }
        var bad = fs.filter(function (f) { return f.t === "money" && d[f.k] && isNaN(VAL.parseMoney(d[f.k])); }).map(function (f) { return f.label || f.k; });
        if (bad.length) { alert("Số tiền không hợp lệ: " + bad.join(", ")); return; }
        if (!need("hr.edit", "sửa hồ sơ nhân sự")) return;
        var asNew = ver && mode.v === "new";
        if (asNew && !(String(d["Hiệu lực từ"] || "") > String(row["Hiệu lực từ"] || ""))) { alert("Thông tin mới phải có 'Hiệu lực từ' SAU bản đang có (" + dispVal({ t: "date" }, row["Hiệu lực từ"]) + ").\nNếu chỉ sửa lỗi nhập sai của bản này, chọn 'Sửa lỗi nhập sai'."); return; }
        if (!isNew && !asNew && upd && !upd().length) { if (p0 && !p0.ok && (p0.code === "frozen" || p0.code === "locked")) { alert(p0.msg); return; } close(); return; }
        // Trùng khóa, Q-15, kỳ chốt / hồi tố, đổi Số HĐLĐ kéo theo phụ lục: repository kiểm tra HẾT rồi mới ghi (A3-01)
        var vals = isNew ? Object.assign({}, base || {}, d) : asNew ? Object.assign({}, row, d) : d;
        if (asNew) delete vals._id;
        if (key === "nghiphep") {
          var quota = C.leaveReconciliation.checkRequest(db, Object.assign({}, row || {}, vals), isNew ? null : row);
          if (quota) { alert(quota); return; }
        }
        var idF = ID.checkWrite(db, key, isNew || asNew ? null : row, vals); if (idF) { alert(idF); return; } // 1 người 1 Mã NV (CCCD)
        var pF = REPO.plan(isNew || asNew ? "insert" : "update", key, isNew || asNew ? null : row, vals, { what: (isNew ? "thêm " : asNew ? "cập nhật thông tin mới — " : "sửa ") + cfg.ten, checkDup: true });
        if (!pF.ok) { alert(pF.msg); return; }
        if (pF.retro && !confirm(pF.confirmMsg)) return;
        var tables = Object.keys(HRT).concat([key]).filter(function (t,i,a) { return a.indexOf(t) === i; });
        if (!txn(tables, function () { return !!commit(pF, { action: isNew ? "Thêm hồ sơ" : asNew ? "Cập nhật hồ sơ (bản mới)" : "Sửa hồ sơ" }); })) {
          if (rowIndex >= 0) row = db[key][rowIndex];
          alert("Chưa lưu hồ sơ: " + lastTxnError + ". Form giữ nguyên để bạn sửa hoặc thử lại."); return;
        }
        close(); toast(asNew ? "Đã thêm thông tin mới từ " + dispVal({ t: "date" }, d["Hiệu lực từ"]) + " — bản cũ giữ làm lịch sử" : "Đã lưu"); (onDone || render)();
      })];
    }, { drawer: true, stable: true });
  }
  // Mặc định khi thêm mới phụ lục: chép từ phụ lục gần nhất
  HR.chitiethd.defaults = function (base, effective) {
    var prev = (db.chitiethd || []).filter(function (r) { return r["Mã NV"] === base["Mã NV"] && r["Số HĐLĐ"] === base["Số HĐLĐ"]; })
      .sort(function (a, b) { return String(a["Hiệu lực từ"]) < String(b["Hiệu lực từ"]) ? -1 : 1; });
    var last = effective || prev[prev.length - 1], o = last ? Object.assign({}, last) : {};
    delete o._id; delete o["Ghi chú"];
    o["Loại phụ lục"] = last ? "Phụ lục sửa đổi" : "Hợp đồng gốc";
    o["Mã công tác"] = base["Số HĐLĐ"] + "-PL" + ("0" + (prev.length + 1)).slice(-2);
    o["Hiệu lực từ"] = last ? HRM.today() : ((db.hopdong.filter(function (r) { return r["Mã NV"] === base["Mã NV"] && r["Số HĐLĐ"] === base["Số HĐLĐ"]; })[0] || {})["Ngày vào làm"] || HRM.today());
    if (!last) { o["HTTT"] = "Chuyển khoản"; o["Mã hình thức lương"] = "LTG"; }
    return o;
  };
  HR.hopdong.defaults = function (base) {
    var n = db.hopdong.filter(function (r) { return r["Mã NV"] === base["Mã NV"]; }).length + 1;
    return { "Số HĐLĐ": base["Mã NV"] + "/HĐ" + ("0" + n).slice(-2), "Ngày vào làm": HRM.today(), "Hình thức HĐLĐ": n === 1 ? "Thử việc" : "Xác định thời hạn" };
  };

  // ---------- Tài liệu đính kèm HĐLĐ (V9.2) ----------
  /** Thêm nhiều file PDF/ảnh vào kho chứng từ gốc rồi ghi liên kết. replaceRow = thay thế một tài liệu (phiên bản mới). */
  function hdldAdd(files, ma, hd, loai, replaceRow, done) {
    var list = Array.prototype.slice.call(files), res = { ok: 0, dup: 0, err: [] }, soHD = hd["Số HĐLĐ"];
    var next = function (i) {
      if (i >= list.length) { done(res); return; }
      var f = list[i], e = HDD.checkFile(f.name, f.size);
      if (e) { res.err.push(e); next(i + 1); return; }
      f.arrayBuffer().then(function (buf) {
        return window.hakDocs.add(new Uint8Array(buf), { name: f.name, docType: "HDLD", company: congTy()["Mã công ty"] || "HAK", dept: "NHANSU", note: "HĐLĐ " + soHD + " · " + ma, user: currentUser() });
      }).then(function (r) {
        if (!r || !r.ok) { res.err.push(f.name + ": " + ((r && r.error) || "lỗi không rõ")); next(i + 1); return; }
        var dupRow = HDD.duplicate(db.hdld_tailieu, ma, soHD, r.sha256);
        if (dupRow) { res.dup++; next(i + 1); return; } // cùng nội dung đã gắn với hợp đồng này
        var rec = HDD.newLink({ maNV: ma, soHD: soHD, doc: { id: r.id, name: f.name, size: r.size, sha256: r.sha256 }, ten: f.name, loai: loai, user: currentUser() });
        try { if (replaceRow) HDD.replace(replaceRow, rec, currentUser()); } catch (ex) { res.err.push(f.name + ": " + ex.message); next(i + 1); return; }
        db.hdld_tailieu.push(rec);
        audit(replaceRow ? "Thay thế tài liệu HĐLĐ" : "Đính kèm tài liệu HĐLĐ", ma + " · " + soHD + " · " + f.name + " · " + r.id + " · SHA-256 " + r.sha256.slice(0, 12) + "…" + (replaceRow ? " · thay " + replaceRow["DocumentID"] : ""));
        res.ok++; next(i + 1);
      }, function (ex) { res.err.push(f.name + ": " + (ex && ex.message || ex)); next(i + 1); });
    };
    next(0);
  }
  /** Xem trước theo yêu cầu (không nạp file khi chỉ hiển thị danh sách). PDF: dựng từng trang bằng pdf.js; ảnh: giải mã trực tiếp. */
  function hdldPreview(row) {
    if (!can("hr.view")) { alert("Bạn không có quyền xem tài liệu nhân sự."); return; }
    var body = h("div"), meta = h("div", { class: "hint", text: "Đang mở " + row["Tên tài liệu"] + "…" }), cv = h("canvas", { style: "max-width:100%;border:1px solid var(--bd,#ccc)" }), nav = h("div", { class: "bar" });
    body.appendChild(meta); body.appendChild(nav); body.appendChild(cv);
    modal("Xem trước — " + row["Tên tài liệu"], body, function (close) { return [btn("Đóng", "pri", close)]; });
    Promise.all([window.hakDocs.read(row["DocumentID"]), window.hakDocs.verify([row["DocumentID"]])]).then(function (rs) {
      var r = rs[0], v = rs[1] && rs[1].items && rs[1].items[0];
      if (!r || !r.ok) { meta.textContent = "⚠ Không mở được: " + ((r && r.error) || "mất file"); return; }
      var bytes = new Uint8Array(r.data), isPdf = /pdf/i.test((r.meta || {}).ext || "") || (bytes[0] === 0x25 && bytes[1] === 0x50);
      meta.textContent = row["Tên file gốc"] + " · " + HDD.sizeText(row["Dung lượng (byte)"]) + " · SHA-256 " + String(row["SHA256"]).slice(0, 16) + "… · toàn vẹn: " + (v ? (v.status === "ok" ? "✓ khớp" : "⚠ " + v.status) : "?");
      if (!isPdf) { window.createImageBitmap(new Blob([bytes])).then(function (bm) { cv.width = bm.width; cv.height = bm.height; cv.getContext("2d").drawImage(bm, 0, 0); }, function () { meta.textContent = "⚠ Không giải mã được ảnh"; }); return; }
      loadScript("vendor/pdfjs/pdf.min.js").then(function () {
        var lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.js";
        return lib.getDocument({ data: bytes }).promise;
      }).then(function (pdf) {
        var cur = 1, info = h("span", { class: "hint", style: "margin:0" });
        var show = function (n) { cur = n; info.textContent = "Trang " + n + "/" + pdf.numPages; pdf.getPage(n).then(function (pg) { var vp = pg.getViewport({ scale: 1.5 }); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height); return pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise; }); };
        nav.appendChild(btn("◀", "", function () { if (cur > 1) show(cur - 1); })); nav.appendChild(info); nav.appendChild(btn("▶", "", function () { if (cur < pdf.numPages) show(cur + 1); }));
        show(1);
      }).catch(function (e) { meta.textContent = "⚠ Không dựng được PDF: " + (e && e.message || e); });
    });
  }
  function hdldHistory(row) {
    var rows = HDD.history(db.hdld_tailieu, row).map(function (r) { return { "Phiên bản": r["Phiên bản"], "Tên file": r["Tên file gốc"], "DocumentID": r["DocumentID"], "SHA-256": String(r["SHA256"]).slice(0, 16) + "…", "Thêm lúc": fmtTime(r["Thêm lúc"]), "Người thêm": r["Người thêm"], "Trạng thái": r["Trạng thái"], "Ghi chú": r["Lý do gỡ"] || (r["Thay thế bởi"] ? "Thay bởi " + r["Thay thế bởi"] : "") }; });
    modal("Lịch sử tài liệu — " + row["Tên tài liệu"], simpleTable(rows), function (close) { return [btn("Đóng", "", close)]; });
  }
  function hdldPanel(ma, hd) {
    var cfg = HR.hdld_tailieu, soHD = hd["Số HĐLĐ"], card = h("div", { class: "card" }), canV = can("hr.view"), canE = can("hr.edit");
    var bar = h("div", { class: "bar" }, [h("h3", { text: cfg.icon + " " + cfg.ten, style: "margin:0" }), h("span", { class: "sp" })]);
    card.appendChild(bar); card.appendChild(h("div", { class: "hint", text: cfg.desc + " Tối đa " + (HDD.MAX_BYTES / 1048576) + " MB/file; hệ thống kiểm tra NỘI DUNG thật của file và từ chối PDF chứa mã chủ động." }));
    if (!window.hakDocs) { card.appendChild(h("div", { class: "warn", text: "Đính kèm tài liệu chỉ có trong bản cài (.exe): file được lưu vào kho chứng từ gốc trên máy." })); return card; }
    if (!canV) { card.appendChild(h("div", { class: "locked", text: "👁 Vai trò của bạn không có quyền xem hồ sơ nhân sự nên không xem được tài liệu đính kèm." })); return card; }
    var loaiSel = h("select", { "aria-label": "Loại tài liệu" }); HDD.LOAI.forEach(function (x) { loaiSel.appendChild(h("option", { value: x, text: x })); });
    var fi = h("input", { type: "file", multiple: "multiple", accept: ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg", style: "display:none" });
    var finish = function (res) {
      if (res.ok) save(); render();
      toast("Đã đính kèm " + res.ok + " tài liệu" + (res.dup ? " · bỏ qua " + res.dup + " file trùng nội dung" : "") + (res.err.length ? " · " + res.err.length + " file lỗi" : ""));
      if (res.err.length) alert("Không đính kèm được:\n• " + res.err.join("\n• "));
    };
    fi.addEventListener("change", function () { if (!fi.files.length) return; if (!need("hr.edit")) return; hdldAdd(fi.files, ma, hd, loaiSel.value, null, finish); fi.value = ""; });
    if (canE) { bar.appendChild(loaiSel); bar.appendChild(btn("＋ Thêm tài liệu (chọn nhiều PDF/ảnh)", "pri", function () { fi.click(); })); bar.appendChild(fi); }
    var verBtn = btn("🛡 Kiểm tra toàn vẹn", "", function () {
      var ids = HDD.active(db.hdld_tailieu, ma, soHD).map(function (r) { return r["DocumentID"]; });
      window.hakDocs.verify(ids).then(function (r) { var bad = ((r && r.items) || []).filter(function (x) { return x.status !== "ok"; }); alert(bad.length ? "⚠ " + bad.length + " tài liệu có vấn đề:\n" + bad.map(function (x) { return "• " + x.name + " — " + x.status; }).join("\n") : "✓ " + ids.length + " tài liệu: file còn đủ, SHA-256 khớp."); });
    });
    bar.appendChild(verBtn);
    var showAll = h("input", { type: "checkbox" }); showAll.checked = !!st.hdldAll; showAll.addEventListener("change", function () { st.hdldAll = showAll.checked; render(); });
    bar.appendChild(h("label", { class: "chip" }, [showAll, document.createTextNode(" Hiện cả bản cũ / đã gỡ")]));
    var rows = HDD.ofContract(db.hdld_tailieu, ma, soHD).filter(function (r) { return st.hdldAll || r["Trạng thái"] === HDD.TT.OK; }).sort(function (a, b) { return String(b["Thêm lúc"]) < String(a["Thêm lúc"]) ? -1 : 1; });
    if (!rows.length) { card.appendChild(h("div", { class: "empty", style: "padding:16px", text: "Chưa có tài liệu đính kèm." })); return card; }
    var t = h("table"), tr = h("tr");
    ["Tên tài liệu", "Loại", "Phiên bản", "Dung lượng", "Thêm lúc", "Người thêm", "Trạng thái", ""].forEach(function (c) { tr.appendChild(h("th", { text: c })); });
    t.appendChild(h("thead", {}, [tr]));
    var tb = h("tbody");
    rows.forEach(function (r) {
      var x = h("tr", { class: r["Trạng thái"] === HDD.TT.OK ? "" : "muted" });
      [r["Tên tài liệu"], r["Loại tài liệu"], "v" + (r["Phiên bản"] || 1), HDD.sizeText(r["Dung lượng (byte)"]), fmtTime(r["Thêm lúc"]), r["Người thêm"], r["Trạng thái"]].forEach(function (v) { x.appendChild(h("td", { class: "t", text: v == null ? "" : String(v) })); });
      var a = h("td", { style: "text-align:right;white-space:nowrap" });
      a.appendChild(btn("👁", "ghost", function () { hdldPreview(r); }, "Xem trước (chỉ nạp file khi bấm)"));
      a.appendChild(btn("↗", "ghost", function () { if (can("hr.view")) window.hakDocs.open(r["DocumentID"]); }, "Mở bằng chương trình mặc định"));
      a.appendChild(btn("🕘", "ghost", function () { hdldHistory(r); }, "Lịch sử các phiên bản"));
      if (canE && r["Trạng thái"] === HDD.TT.OK) {
        var rf = h("input", { type: "file", accept: ".pdf,.png,.jpg,.jpeg", style: "display:none" });
        rf.addEventListener("change", function () { if (!rf.files.length || !need("hr.edit")) return; hdldAdd([rf.files[0]], ma, hd, r["Loại tài liệu"], r, function (res) { if (res.ok) save(); render(); toast(res.ok ? "Đã thay thế bằng phiên bản mới" : res.dup ? "File giống hệt tài liệu đang có — không thay" : "Không thay được"); if (res.err.length) alert(res.err.join("\n")); }); });
        a.appendChild(rf);
        a.appendChild(btn("🔁", "ghost", function () { rf.click(); }, "Thay thế bằng file mới (giữ bản cũ trong lịch sử)"));
        a.appendChild(btn("✕", "red ghost", function () {
          if (!need("hr.edit")) return;
          askText("Gỡ liên kết tài liệu", "Tài liệu \"" + r["Tên tài liệu"] + "\" sẽ không còn hiện trong hợp đồng. File gốc VẪN nằm trong kho chứng từ và xem lại được ở Lịch sử.", { label: "Lý do gỡ", required: true, okText: "Gỡ liên kết" }, function (why) {
            try { HDD.unlink(r, currentUser(), why); } catch (ex) { alert(ex.message); return; }
            audit("Gỡ liên kết tài liệu HĐLĐ", ma + " · " + soHD + " · " + r["Tên file gốc"] + " · " + r["DocumentID"] + " — " + why); save(); render();
          });
        }, "Gỡ liên kết (không xóa file)"));
      }
      x.appendChild(a); tb.appendChild(x);
    });
    t.appendChild(tb); card.appendChild(h("div", { class: "tw" }, [t]));
    return card;
  }

  function subTable(key, base, opts) {
    opts = opts || {};
    var cfg = HR[key], rows = (db[key] || []).filter(function (r) { return Object.keys(base).every(function (k) { return r[k] === base[k]; }); });
    var dateF = cfg.cols.filter(function (c) { return /Hiệu lực từ|Ngày vào làm|Từ ngày|^Ngày/.test(c); })[0];
    if (dateF) rows.sort(function (a, b) { return String(a[dateF] || "") < String(b[dateF] || "") ? 1 : -1; });
    var card = h("div", { class: "card" });
    var bar = h("div", { class: "bar" }, [h("h3", { text: cfg.icon + " " + cfg.ten, style: "margin:0" }), h("span", { class: "sp" }), btn("＋ Thêm", "pri", function () { hrForm(key, null, base); })]);
    card.appendChild(bar);
    if (cfg.desc) card.appendChild(h("div", { class: "hint", text: cfg.desc }));
    if (!rows.length) { card.appendChild(h("div", { class: "empty", style: "padding:16px", text: "Chưa có dữ liệu." })); return card; }
    var fmap = {}; cfg.f.forEach(function (f) { fmap[f.k] = f; });
    var t = h("table"), tr = h("tr");
    cfg.cols.forEach(function (c) { tr.appendChild(h("th", { class: fmap[c] && fmap[c].t === "money" ? "r" : "", text: (fmap[c] && fmap[c].label) || c })); });
    tr.appendChild(h("th", { text: "" })); t.appendChild(h("thead", {}, [tr]));
    var tb = h("tbody");
    rows.forEach(function (r, i) {
      var x = h("tr", { class: "click" + (opts.selected && opts.selected === r ? " sel" : ""), on: { click: function () { if (opts.onPick) opts.onPick(r); else hrForm(key, r, base); } } });
      cfg.cols.forEach(function (c) { var f = fmap[c] || {}; x.appendChild(h("td", { class: f.t === "money" ? "r" : "t", text: HRM.isPayField(key, c) && !canSeePay() ? HRM.PAY_HIDDEN : dispVal(f, r[c]) })); });
      var acts = h("td", { style: "text-align:right;white-space:nowrap" });
      if (opts.onPick) acts.appendChild(btn("✎", "ghost", function (ev) { ev.stopPropagation(); hrForm(key, r, base); }, "Sửa"));
      acts.appendChild(btn("✕", "red ghost", function (ev) {
        ev.stopPropagation();
        if (!need("hr.edit", "xóa hồ sơ nhân sự")) return;
        var pD = REPO.plan("remove", key, r, null, { what: "xóa " + cfg.ten });
        if (!pD.ok) { alert(pD.msg); return; }
        if (!confirm("Xóa dòng này?" + (key === "hopdong" ? "\nToàn bộ phụ lục lương, nghỉ phép… của hợp đồng này cũng bị xóa." : "") + (pD.retro ? "\n\n" + retroText(pD.impact) : ""))) return;
        if (!commit(pD, { action: "Xóa hồ sơ" })) return;
        save(); render();
      }, "Xóa"));
      x.appendChild(acts); tb.appendChild(x);
    });
    t.appendChild(tb); card.appendChild(h("div", { class: "tw", style: "max-height:none" }, [t]));
    return card;
  }

  function nextMaNV() {
    var max = 0, pre = "NV", w = 3;
    db.nhanvien.forEach(function (r) { var m = String(r["Mã NV"] || "").match(/^(\D*)(\d+)$/); if (m && +m[2] >= max) { max = +m[2]; pre = m[1]; w = m[2].length; } });
    return pre + String(max + 1).padStart(w, "0");
  }

  // Thêm nhân viên mới: 1 form gồm thông tin cơ bản + cá nhân + hợp đồng + lương + tài khoản
  function wizardNV() {
    var ma = nextMaNV(), body = h("div");
    var sec = function (title) { body.appendChild(h("div", { class: "fh", text: title })); var g = h("div", { class: "fgrid" }); body.appendChild(g); return g; };
    var pick = function (key, names) { return HR[key].f.filter(function (f) { return names.indexOf(f.k) >= 0; }); };
    var fBase = HR.nhanvien.f.filter(function (f) { return f.k !== "Số CCCD" && f.k !== "Ngày tạo hồ sơ"; });
    // α18: đủ các trường sổ quản lý lao động (NĐ 145/2020 Đ3) ngay khi thêm mới — quốc tịch, dân tộc, số sổ BHXH, trình độ
    var fCN = pick("canhan", ["Số CCCD", "Ngày cấp", "Nơi cấp", "Ngày sinh", "Giới tính", "Quốc tịch", "Dân tộc", "Số điện thoại", "Thường trú", "Địa chỉ hiện tại", "Mã số thuế", "Số sổ BHXH"]);
    var fHV = pick("hocvan", ["Trình độ học vấn", "Chuyên môn", "Bậc trình độ kỹ năng nghề", "Bằng cấp"]);
    var fHD = pick("hopdong", ["Số HĐLĐ", "Hình thức HĐLĐ", "Ngày vào làm", "Ngày hết hạn"]);
    var fCT = HR.chitiethd.f.filter(function (f) { return ["Mã công tác", "Loại phụ lục", "Loại biến động", "Số quyết định", "Hiệu lực từ", "Ghi chú"].indexOf(f.k) < 0; });
    var fTK = pick("thanhtoan", ["Số tài khoản", "Tên ngân hàng", "Chi nhánh"]);
    var gB = fieldInputs(sec("1. Thông tin cơ bản"), fBase, { "Mã NV": ma, "Trạng thái": "Đang làm việc" });
    var gC = fieldInputs(sec("2. Thông tin cá nhân"), fCN, { "Quốc tịch": "Việt Nam" });
    var gV = fieldInputs(sec("2b. Trình độ (sổ quản lý lao động)"), fHV.map(function (f) { return Object.assign({}, f, { req: 0 }); }), {});
    var gH = fieldInputs(sec("3. Hợp đồng lao động"), fHD, { "Số HĐLĐ": ma + "/HĐ01", "Hình thức HĐLĐ": "Thử việc", "Ngày vào làm": HRM.today() });
    var gL = fieldInputs(sec("4. Lương, bảo hiểm, thuế"), fCT, { "HTTT": "Chuyển khoản", "Mã hình thức lương": "LTG", "Mức đóng bảo hiểm": "BH01", "Thuế TNCN": "LT01" });
    var gT = fieldInputs(sec("5. Tài khoản nhận lương (nếu chuyển khoản)"), fTK, {});
    body.appendChild(h("div", { class: "hint", text: "Các mục khác (nhân thân/người phụ thuộc, quá trình công tác, nghỉ phép…) bổ sung sau trong hồ sơ nhân viên. Báo cáo nhân sự → Sổ quản lý lao động cho biết ai còn thiếu thông tin." }));
    modal("Thêm nhân viên mới", body, function (close) {
      return [btn("Hủy", "", close), btn("💾 Lưu nhân viên", "pri", function () {
        if (!need("hr.edit", "thêm nhân viên")) return;
        var b = gB(), c = gC(), hd = gH(), l = gL(), tk = gT(), hv = gV();
        var miss = missingReq(fBase, b).concat(missingReq(fHD, hd), missingReq(fCT, l));
        var inp = { b: b, c: c, hv: hv, hd: hd, l: l, tk: tk, today: HRM.today() }, errs = C.hrCreate.validate(inp, db);
        miss.forEach(function (x) { if (errs.indexOf(x) < 0 && !/ngày không hợp lệ/.test(x)) errs.unshift("Cần nhập: " + x); });
        miss.filter(function (x) { return /ngày không hợp lệ/.test(x); }).forEach(function (x) { if (!errs.some(function (y) { return y.indexOf(x.split(" (")[0]) >= 0; })) errs.push(x); });
        // KHÔNG lưu nửa chừng: có lỗi → giữ nguyên form (dữ liệu đang nhập), báo rõ từng trường, chưa ghi gì
        if (errs.length) { alert("⛔ Chưa lưu nhân viên — sửa " + errs.length + " lỗi sau:\n\n" + errs.slice(0, 12).map(function (x) { return "• " + x; }).join("\n")); return; }
        var m = b["Mã NV"], result = REPO.createEmployee(inp), okNV = result.ok;
        if (!okNV) { alert("⛔ KHÔNG lưu được nhân viên " + m + ".\n\nLý do: " + (lastTxnError || "Nơi lưu dữ liệu chưa xác nhận thành công") + "\n\nDữ liệu chưa được ghi (không có hồ sơ dở dang). Form vẫn giữ nguyên để bạn sửa/thử lại. Giữ form mở và gửi phần Lý do nếu cần hỗ trợ."); return; }
        close(); st.tab = "nv"; st.nv = m; st.nvTab = "canhan"; render(); toast("Đã thêm nhân viên " + b["Họ và tên"]);
      })];
    });
  }

  function editBaseNV(nv) {
    var body = h("div"), g = h("div", { class: "fgrid" }); body.appendChild(g);
    var get = fieldInputs(g, HR.nhanvien.f, nv);
    liveDiff(body, get, HR.nhanvien.f, Object.assign({}, nv));
    body.appendChild(h("div", { class: "hint", style: "margin-top:10px", html: "Đổi CCCD, địa chỉ… → tab <b>Thông tin cá nhân</b>. Đổi lương, chức vụ, phòng ban → <b>Lập phụ lục lương</b> (lập phụ lục mới)." }));
    modal("Sửa thông tin cơ bản", body, function (close) {
      return [btn("Hủy", "", close), btn("💾 Lưu", "pri", function () {
        if (!need("hr.edit", "sửa thông tin nhân viên")) return;
        var d = get(), miss = missingReq(HR.nhanvien.f, d);
        if (miss.length) { alert("Cần nhập: " + miss.join(", ")); return; }
        // NV có trong bảng lương đã chốt → hỏi xác nhận hồi tố TRƯỚC khi ghi bất cứ gì (như hrForm / sửa ô / xóa dòng); Hủy = không lưu, không ghi nhật ký
        var aNV = Object.assign({}, nv, d);
        if (GRD.changedFields(nv, aNV).length && !guardChange("nhanvien", nv, aNV, "sửa thông tin cơ bản của " + (nv["Họ và tên"] || nv["Mã NV"]))) return;
        var old = nv["Mã NV"];
        if (d["Mã NV"] !== old) {
          if (db.nhanvien.some(function (r) { return r !== nv && r["Mã NV"] === d["Mã NV"]; })) { alert("Mã NV đã tồn tại"); return; }
          var refs = GRD.references(db, old);
          if (refs.kyluong || refs.kyluong_lichsu) { alert("Không đổi được Mã NV " + old + ": mã này đã có trong bảng lương ĐÃ CHỐT (" + (refs.kyluong || 0) + " kỳ hiện hành, " + (refs.kyluong_lichsu || 0) + " bản lịch sử). Đổi mã sẽ làm dữ liệu kỳ đã chốt không còn khớp với hồ sơ.\nNếu thật sự cần mã mới: tạo nhân viên mới và chấm dứt hồ sơ cũ."); return; }
          var refTxt = Object.keys(refs).map(function (k) { return (ALL[k] ? ALL[k].ten : k) + ": " + refs[k]; }).join(", ");
          if (!confirm("Đổi Mã NV " + old + " → " + d["Mã NV"] + "?\nApp sẽ đổi theo ở: " + (refTxt || "(không có dữ liệu liên quan)"))) return;
        }
        var nvIndex = db.nhanvien.indexOf(nv), bNV = Object.assign({}, nv);
        var touched = Object.keys(db).filter(function (k) { return Array.isArray(db[k]); });
        if (!txn(touched, function () {
          if (d["Mã NV"] !== old) {
            Object.keys(db).forEach(function (k) { if (Array.isArray(db[k]) && k !== "auditlog" && k !== "kyluong" && k !== "kyluong_lichsu") db[k].forEach(function (r) { if (r && r !== nv && r["Mã NV"] === old) r["Mã NV"] = d["Mã NV"]; }); });
            audit("Đổi Mã NV", old + " → " + d["Mã NV"] + " (" + (refTxt || "không có dữ liệu liên quan") + ")");
          }
          Object.assign(nv, d); auditChange("Sửa thông tin cơ bản", "nhanvien", bNV, nv, nv["Mã NV"]);
        })) { nv = db.nhanvien[nvIndex]; alert("Chưa lưu hồ sơ: " + lastTxnError + ". Form giữ nguyên để thử lại."); return; }
        st.nv = d["Mã NV"]; close(); render();
      })];
    }, { drawer: true, stable: true });
  }
  /** Tăng lương / điều chuyển / đổi chức vụ / đổi mức đóng BH: lập PHỤ LỤC MỚI (không sửa phụ lục cũ — Q-15), có so sánh trước → sau. */
  function bienDongForm(nv, hd) {
    if (!need("hr.edit", "lập phụ lục biến động")) return;
    var base = { "Mã NV": nv["Mã NV"], "Số HĐLĐ": hd["Số HĐLĐ"] };
    var today = HRM.today();
    var cur = db.chitiethd.filter(function (r) { var effective = VAL.normDate(r["Hiệu lực từ"]); return (!r["Hiệu lực từ"] || (effective && effective <= today)) && r["Mã NV"] === base["Mã NV"] && r["Số HĐLĐ"] === base["Số HĐLĐ"]; }).sort(function (a, b) { return String(a["Hiệu lực từ"]) < String(b["Hiệu lực từ"]) ? 1 : -1; })[0];
    if (!cur) { hrForm("chitiethd", null, base); return; }
    var draft = Object.assign(HR.chitiethd.defaults(base, cur), { "Hiệu lực từ": "", "Số quyết định": "" }), body = h("div"), loai = { v: "" };
    body.appendChild(h("div", { class: "hint", html: "Lập <b>phụ lục mới " + esc(draft["Mã công tác"]) + "</b> từ phụ lục hiện tại <b>" + esc(cur["Mã công tác"] || "") + "</b> (hiệu lực " + esc(dispVal({ t: "date" }, cur["Hiệu lực từ"])) + "). Phụ lục cũ giữ nguyên; bảng lương tự lấy phụ lục mới từ ngày hiệu lực." }));
    var chips = h("div", { class: "chips", role: "radiogroup", "aria-label": "Loại biến động", style: "margin:4px 0 14px" });
    HRM.BIEN_DONG.filter(function (L) { return !/điều chuyển|chức vụ|bổ nhiệm/i.test(L); }).forEach(function (L) { var r = h("input", { type: "radio", name: "bd", value: L }); r.addEventListener("change", function () { loai.v = L; }); chips.appendChild(h("label", { class: "chip" }, [r, " " + L])); });
    body.appendChild(h("div", { class: "fh", text: "Loại biến động" })); body.appendChild(chips);
    var keys = ["Hiệu lực từ", "Số quyết định", "Lương thỏa thuận", "Lương cơ bản", "Mức đóng bảo hiểm", "Vị trí việc làm", "Cách áp dụng trong tháng hiệu lực", "Ghi chú"];
    var fs = keys.map(function (k) { return HR.chitiethd.f.filter(function (f) { return f.k === k; })[0]; }).filter(Boolean).map(function (f) { return f.k === "Ghi chú" ? Object.assign({}, f, { label: "Lý do / ghi chú" }) : f; });
    if (!canSeePay()) fs = fs.filter(function (f) { return !HRM.isPayField("chitiethd", f.k); });
    var g = h("div", { class: "fgrid" }); body.appendChild(g);
    var get = fieldInputs(g, fs, draft);
    var pctBox = h("div", { class: "ok", style: "margin:8px 0" });
    var upd = liveDiff(body, get, fs.filter(function (f) { return f.k !== "Hiệu lực từ" && f.k !== "Số quyết định" && f.k !== "Ghi chú"; }), cur);
    var showPct = function () {
      var d = get(), a = E.money(cur["Lương thỏa thuận"]), b = E.money(d["Lương thỏa thuận"]);
      pctBox.style.display = a && b && a !== b && canSeePay() ? "" : "none";
      if (a && b) pctBox.textContent = "Lương thỏa thuận " + (b > a ? "+" : "") + fmt(b - a) + " (" + (b > a ? "+" : "") + String(Math.round((b - a) / a * 1000) / 10).replace(".", ",") + "%)" + (E.money(d["Lương cơ bản"]) !== E.money(cur["Lương cơ bản"]) ? " · lương đóng BH đổi → báo điều chỉnh mức đóng BHXH" : "");
    };
    body.addEventListener("input", showPct); body.addEventListener("change", showPct); body.appendChild(pctBox); showPct();
    modal("Tăng lương / biến động — " + (nv["Họ và tên"] || nv["Mã NV"]), body, function (close) {
      return [btn("Hủy", "", close), btn("💾 Lập phụ lục " + draft["Mã công tác"], "pri", function () {
        var d = get(), ch = upd();
        if (!d["Hiệu lực từ"]) { alert("Cần nhập 'Hiệu lực từ'"); return; }
        if (!(String(d["Hiệu lực từ"]) > String(cur["Hiệu lực từ"] || ""))) { alert("Phụ lục mới phải có 'Hiệu lực từ' SAU phụ lục hiện tại (" + dispVal({ t: "date" }, cur["Hiệu lực từ"]) + ")."); return; }
        if (!ch.length) { alert("Chưa thay đổi gì so với phụ lục hiện tại."); return; }
        var L = loai.v || (function () { var a = E.money(cur["Lương thỏa thuận"]), b = E.money(d["Lương thỏa thuận"]); return b > a ? "Tăng lương" : b < a ? "Giảm lương" : d["Phòng ban"] !== cur["Phòng ban"] ? "Điều chuyển phòng ban" : d["Chức vụ"] !== cur["Chức vụ"] ? "Bổ nhiệm / đổi chức vụ" : "Điều chỉnh mức đóng BH"; })();
        var rec = Object.assign({}, draft, d, { "Loại biến động": L, "Loại phụ lục": "Phụ lục sửa đổi" }); delete rec._id;
        var pF = REPO.plan("insert", "chitiethd", null, rec, { what: "lập phụ lục " + L.toLowerCase(), checkDup: true });
        if (!pF.ok) { alert(pF.msg); return; }
        if (pF.retro && !confirm(pF.confirmMsg)) return;
        if (!txn(["chitiethd"], function () { return !!commit(pF, { action: "Biến động: " + L }); })) { alert("Chưa lưu phụ lục: " + lastTxnError + ". Form giữ nguyên để thử lại."); return; }
        close(); st.nvTab = "hopdong"; st.hd = hd["Số HĐLĐ"]; st.hdTab = "chitiethd"; render(); toast("Đã lập phụ lục " + rec["Mã công tác"] + " · " + L + " từ " + dispVal({ t: "date" }, rec["Hiệu lực từ"]));
      })];
    }, { drawer: true, stable: true });
  }
  /** Lịch sử 1 nhân viên: quá trình lương + dòng thời gian thay đổi hồ sơ (từ nhật ký, chỉ đọc). */
  function lichSuNV(nv) {
    var ma = nv["Mã NV"], body = h("div"), pay = canSeePay(), R = HRM.reports(db, { hidePay: !pay });
    var ql = R.quaTrinhLuong(ma);
    if (pay && ql.length) {
      var mx = Math.max.apply(null, ql.map(function (x) { return +x["Lương thỏa thuận"] || 0; })) || 1, bars = h("div", { class: "salbar", "aria-label": "Quá trình lương" });
      ql.forEach(function (x) { var v = +x["Lương thỏa thuận"] || 0; bars.appendChild(h("div", {}, [h("b", { text: (v / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " tr" }), h("i", { style: "height:" + Math.max(8, Math.round(v / mx * 110)) + "px" }), h("span", { text: dispVal({ t: "date" }, x["Hiệu lực từ"]).slice(3) + (x["Thay đổi (%)"] !== "" ? " · " + (x["Thay đổi (%)"] > 0 ? "+" : "") + String(x["Thay đổi (%)"]).replace(".", ",") + "%" : "") })])); });
      body.appendChild(h("div", { class: "fh", text: "Quá trình lương" })); body.appendChild(bars);
    }
    // Nhật ký: dòng có Mã NV này; số tiền lương bị che nếu không có quyền xem lương (Q-24)
    var re = new RegExp("(^|[\\s·/(])" + ma.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[\\s·/)])");
    var nameKey = {}; Object.keys(ALL).forEach(function (k) { nameKey[ALL[k].ten] = k; });
    var ev = (db.auditlog || []).filter(function (a) { return re.test(String(a.chiTiet || "")); }).slice(-300).reverse();
    var parts = [["", "Tất cả"], ["luong", "Lương & phụ lục"], ["hd", "Hợp đồng"], ["cn", "Cá nhân"], ["khac", "Khác"]], sel = { v: "" };
    var partOf = function (t) { return t === "chitiethd" ? "luong" : t === "hopdong" ? "hd" : t === "canhan" || t === "nhanvien" || t === "thanhtoan" || t === "nhanthan" ? "cn" : "khac"; };
    var items = ev.map(function (a) {
      var seg = String(a.chiTiet || "").split(" · "), table = nameKey[seg[0]] || "", ch = [];
      seg.forEach(function (s) { if (/→/.test(s)) s.split("; ").forEach(function (c) { var m = /^([^:]+):\s*(.*?)\s*→\s*(.*)$/.exec(c); if (m) ch.push({ f: m[1], a: m[2], b: m[3] }); }); });
      var ff = {}; ((HR[table] || {}).f || []).forEach(function (f) { ff[f.k] = f; });
      ch = ch.filter(function (c) { return ["Mã NV", "Số HĐLĐ"].indexOf(c.f) < 0; });
      ch.forEach(function (c) { var f = ff[c.f]; if (f && (f.t === "money" || f.t === "date")) ["a", "b"].forEach(function (k) { if (c[k] && c[k] !== "∅") c[k] = dispVal(f, c[k]); }); });
      if (!pay) ch.forEach(function (c) { if (table && HRM.isPayField(table, c.f)) { c.a = HRM.PAY_HIDDEN; c.b = HRM.PAY_HIDDEN; } });
      var isAdd = ch.length && ch.every(function (c) { return c.a === "∅"; });
      var retro = /HỒI TỐ/.test(a.chiTiet || "");
      return { a: a, table: table, part: partOf(table), ch: ch, isAdd: isAdd, retro: retro, txt: ch.length ? "" : seg.slice(1).filter(function (s) { return !/→/.test(s); }).join(" · ") };
    });
    var chipBar = h("div", { class: "chips", style: "margin:14px 0 6px" }), list = h("ul", { class: "tl" });
    var draw = function () {
      list.innerHTML = "";
      var xs = items.filter(function (it) { return !sel.v || it.part === sel.v; });
      if (!xs.length) list.appendChild(h("li", { class: "empty", text: "Chưa có thay đổi nào được ghi nhật ký cho nhân viên này." }));
      xs.forEach(function (it) {
        var ul = h("ul", { class: "ch" });
        it.ch.slice(0, 12).forEach(function (c) { ul.appendChild(h("li", {}, it.isAdd ? [h("span", { class: "hint", style: "margin:0", text: c.f + ": " }), h("ins", { text: c.b })] : [h("span", { class: "hint", style: "margin:0", text: c.f + ": " }), h("del", { text: c.a === "∅" ? "(trống)" : c.a }), " → ", h("ins", { text: c.b === "∅" ? "(trống)" : c.b })])); });
        list.appendChild(h("li", {}, [h("span", { class: "ti", text: { luong: "PL", hd: "HĐ", cn: "CN", khac: "•" }[it.part] }), h("div", { class: "tb" }, [
          h("div", {}, [h("b", { text: it.a.thaoTac + (it.table && ALL[it.table] ? " — " + ALL[it.table].ten : "") }), it.retro ? h("span", { class: "tag t-retro", style: "margin-left:8px", text: "HỒI TỐ" }) : null]),
          h("small", { text: (it.a.nguoi || "") + " · " + fmtTime(it.a.luc) + (it.txt ? " · " + it.txt : "") }), it.ch.length ? ul : null])]));
      });
    };
    parts.forEach(function (p) { var r = h("input", { type: "radio", name: "lsp", value: p[0] }); r.checked = !p[0]; r.addEventListener("change", function () { sel.v = p[0]; draw(); }); chipBar.appendChild(h("label", { class: "chip" }, [r, " " + p[1]])); });
    body.appendChild(h("div", { class: "fh", text: "Thay đổi hồ sơ" })); body.appendChild(chipBar); body.appendChild(list); draw();
    body.appendChild(h("div", { class: "hint", style: "margin-top:10px", text: "Nhật ký chỉ thêm, không sửa / xóa được — kể cả Admin." }));
    modal("Lịch sử — " + (nv["Họ và tên"] || ma), body, function (close) {
      return [btn("📋 Bảng toàn bộ hồ sơ theo thời gian", "", function () { close(); st.tab = "baocao"; st.bc = "lichsu"; st.bcNV = ma; render(); }), btn("Đóng", "pri", close)];
    }, { drawer: true });
  }
  /** Master–Detail dạng cửa sổ: HĐLĐ (cha) → lương & phụ lục, quyền lợi, nghỉ phép, tài liệu… (con). */
  function hdChiTietModal(ma, soHD) {
    var cur = db.hopdong.filter(function (r) { return r["Mã NV"] === ma && r["Số HĐLĐ"] === soHD; })[0];
    if (!cur) { st.hdModal = null; return; }
    st.hdModal = { ma: ma, so: soHD };
    var body = h("div", { "data-hd-detail": soHD }), tabs = h("div", { class: "subtabs" }), content = h("div");
    st.hdTab = st.hdTab || "chitiethd";
    var draw = function () {
      tabs.innerHTML = "";
      HRM.HD_TABS.forEach(function (k) {
        var n = (db[k] || []).filter(function (r) { return r["Mã NV"] === ma && r["Số HĐLĐ"] === soHD; }).length;
        tabs.appendChild(h("button", { class: st.hdTab === k ? "on" : "", on: { click: function () { st.hdTab = k; draw(); } } }, [document.createTextNode(HR[k].icon + " " + HR[k].ten), n ? h("span", { class: "n", text: n }) : null]));
      });
      tabs.appendChild(btn("Tiêu chuẩn phúc lợi", st.hdTab === "phucloi" ? "on" : "", function () { st.hdTab = "phucloi"; draw(); }));
      content.innerHTML = "";
      content.appendChild(st.hdTab === "phucloi" ? benefitContractPanel(ma, soHD, draw) : st.hdTab === "hdld_tailieu" ? hdldPanel(ma, cur) : subTable(st.hdTab, { "Mã NV": ma, "Số HĐLĐ": soHD }));
    };
    body.appendChild(h("div", { class: "hint", html: "Cha: hợp đồng <b>" + esc(soHD) + "</b> · " + esc(cur["Hình thức HĐLĐ"] || "") + " · vào làm " + esc(cur["Ngày vào làm"] || "") + ". Các mục con bên dưới tự gắn Mã NV và Số HĐLĐ của hợp đồng này." }));
    body.appendChild(tabs); body.appendChild(content); draw();
    modal("Chi tiết hợp đồng " + soHD + " — " + ma, body, function (close) { return [btn("Đóng", "pri", close)]; }, { wide: true, stable: true, onClose: function () { st.hdModal = null; render(); } });
  }
  function hdReopen() { if (!st.hdModal) return; if (st.hdModal.npt) nptModal(st.hdModal.ma); else hdChiTietModal(st.hdModal.ma, st.hdModal.so); }
  /** Master–Detail dạng cửa sổ: Nhân viên (cha) → Người phụ thuộc (con). Mã NV tự gán theo nhân viên cha. */
  function nptModal(ma) {
    var nv = db.nhanvien.filter(function (r) { return r["Mã NV"] === ma; })[0];
    if (!nv) { st.hdModal = null; return; }
    st.hdModal = { ma: ma, npt: 1 };
    var body = h("div", { "data-npt-detail": ma });
    body.appendChild(h("div", { class: "hint", html: "Cha: nhân viên <b>" + esc(ma) + "</b> — " + esc(nv["Họ và tên"] || "") + ". Mã NV của người phụ thuộc tự gán theo nhân viên này." }));
    body.appendChild(subTable("nhanthan", { "Mã NV": ma }));
    modal("Người phụ thuộc — " + ma, body, function (close) { return [btn("Đóng", "pri", close)]; }, { wide: true, onClose: function () { st.hdModal = null; render(); } });
  }

  function tabNhanVien() {
    var nv = db.nhanvien.filter(function (r) { return r["Mã NV"] === st.nv; })[0];
    if (!nv) { st.tab = "nhansu"; return tabNhanSu(); }
    var ma = nv["Mã NV"], today = HRM.today(), hh = HRM.hienHanh(db, ma, today), w = h("div");
    var active = HRM.activeHD(db, ma, today, today);
    var effective = hh.ct && (!hh.ct["Hiệu lực từ"] || VAL.normDate(hh.ct["Hiệu lực từ"]) <= today) ? hh.ct : null;
    var endDate = hh.hd && VAL.normDate(hh.hd["Ngày chấm dứt"]);
    var expiry = active && VAL.normDate(active["Ngày hết hạn"]);
    var head = h("div", { class: "card nvhead" });
    head.appendChild(h("div", { class: "bar", style: "margin:0" }, [
      btn("← Danh sách", "", function () { st.tab = "nhansu"; render(); }),
      h("div", { class: "avatar", text: String(nv["Họ và tên"] || "?").trim().split(/\s+/).pop().charAt(0).toUpperCase() }),
      h("div", { html: "<b style='font-size:18px'>" + esc(nv["Họ và tên"]) + "</b> <span class='tag " + (nv["Trạng thái"] === "Đã nghỉ việc" ? "off" : "on") + "'>" + esc(nv["Trạng thái"] || "") + "</span><br><span class='hint' style='margin:0'>" +
        esc(ma) + (hh.tenPB ? " · " + esc(hh.tenPB) : "") + (hh.tenCV ? " · " + esc(hh.tenCV) : "") + (hh.hd ? " · HĐ " + esc(hh.hd["Số HĐLĐ"]) + " (" + esc(hh.hd["Hình thức HĐLĐ"] || "") + ")" : " · chưa có hợp đồng") +
        (active && effective && canSeePay() ? " · Lương " + fmt(E.money(effective["Lương thỏa thuận"])) : "") + "</span>" }),
      h("span", { class: "sp" }),
      active && can("hr.edit") ? btn("Lập phụ lục lương", "pri", function () { bienDongForm(nv, active); }) : null,
      active && can("hr.edit") ? btn("Đề nghị điều chuyển", "", function () { nvnsForm(null, { "Mã NV": ma, "Loại nghiệp vụ": "Điều chuyển bộ phận" }); }) : null,
      btn("✎ Sửa cơ bản", "", function () { editBaseNV(nv); }),
      btn("🕘 Lịch sử", "", function () { lichSuNV(nv); }),
      nv["Trạng thái"] !== "Đã nghỉ việc" && can("hr.edit") ? btn("Đề nghị nghỉ việc", "", function () { nvnsForm(null, { "Mã NV": ma, "Loại nghiệp vụ": "Nghỉ việc" }); }) : null,
      btn("🗑", "red", function () {
        if (!need("hr.edit", "xóa nhân viên")) return;
        var refs = GRD.references(db, ma), inClosed = refs.kyluong || refs.kyluong_lichsu;
        if (inClosed && !can("retro.edit")) { alert("⛔ Nhân viên " + ma + " đã có trong bảng lương ĐÃ CHỐT. Chỉ Admin được xóa hồ sơ này (bảng lương đã chốt vẫn giữ nguyên)."); return; }
        if (!confirm("XÓA hẳn nhân viên " + nv["Họ và tên"] + " và toàn bộ hồ sơ (không xóa chấm công/sản lượng)?" + (inClosed ? "\n\n⚠ Nhân viên này có trong " + inClosed + " bảng lương đã chốt — số đã chốt KHÔNG đổi, nhưng hồ sơ gốc sẽ không còn để đối chiếu." : ""))) return;
        if (!backupOrBlock("truoc-xoa-nhan-vien", "xóa nhân viên")) return;
        var result = REPO.removeEmployee(nv, Object.keys(HR));
        if (!result.ok) { alert("Chưa xóa nhân viên: " + (result.msg || lastTxnError)); render(); return; }
        st.tab = "nhansu"; render();
      }, "Xóa nhân viên")]));
    w.appendChild(head);
    var horizon = new Date(today + "T00:00:00Z");
    horizon.setUTCDate(horizon.getUTCDate() + 30);
    var notice = !hh.hd ? "Chưa có hợp đồng lao động."
      : !active ? "Hồ sơ đang hiển thị hợp đồng gần nhất. Hôm nay không có hợp đồng hiệu lực."
      : !effective ? "Hợp đồng chưa có phụ lục lương hiệu lực hôm nay."
      : endDate && endDate >= today ? "Ngày chấm dứt hợp đồng: " + endDate + "."
      : expiry && expiry < today ? "Hợp đồng đã quá hạn: " + expiry + "."
      : expiry && expiry <= horizon.toISOString().slice(0, 10) ? "Hợp đồng sắp hết hạn: " + expiry + "."
      : "";
    if (notice) w.appendChild(h("div", { class: "warn" }, [
      h("span", { text: notice + " " }),
      btn("Mở hợp đồng", "ghost", function () { st.nvTab = "hopdong"; st.hd = hh.hd ? hh.hd["Số HĐLĐ"] : null; render(); })
    ]));
    if (active && effective) head.appendChild(h("p", { class: "hint", text: "Phụ lục hiện hành" +
      (effective["Mã công tác"] ? " " + effective["Mã công tác"] : "") +
      (effective["Hiệu lực từ"] ? " · Hiệu lực từ " + effective["Hiệu lực từ"] : "") }));
    var tabs = h("div", { class: "subtabs" });
    st.nvTab = st.nvTab || "canhan";
    HRM.NV_TABS.forEach(function (k) {
      var n = (db[k] || []).filter(function (r) { return r["Mã NV"] === ma; }).length;
      tabs.appendChild(h("button", { class: st.nvTab === k ? "on" : "", on: { click: function () { st.nvTab = k; render(); } } }, [document.createTextNode(HR[k].icon + " " + HR[k].ten), n ? h("span", { class: "n", text: n }) : null]));
    });
    var upcoming = db.chitiethd.filter(function (row) {
      return row["Mã NV"] === ma && VAL.normDate(row["Hiệu lực từ"]) > today;
    }).sort(function (a, b) { return String(a["Hiệu lực từ"]).localeCompare(String(b["Hiệu lực từ"])); });
    if (upcoming.length) {
      var next = upcoming[0];
      w.appendChild(h("div", { class: "hint", "data-hr-upcoming": "1" }, [
        h("span", { text: "Sắp hiệu lực: " + fmtDate(next["Hiệu lực từ"]) + " · " + (next["Loại biến động"] || "Phụ lục") +
          " · " + (HRM.refName(db, "dm_phongban", next["Phòng ban"]) || next["Phòng ban"] || "") + " " }),
        btn("Xem phụ lục", "ghost", function () { st.nvTab = "hopdong"; st.hd = next["Số HĐLĐ"]; st.hdTab = "chitiethd"; render(); })
      ]));
    }
    w.appendChild(tabs);
    if (st.nvTab === "nhanthan") {
      var nptRows = db.nhanthan.filter(function (r) { return r["Mã NV"] === ma; });
      var nc = h("div", { class: "card", "data-npt-master": ma });
      nc.appendChild(h("div", { class: "bar", style: "margin:0" }, [
        h("div", { html: "Nhân viên <b>" + esc(ma) + "</b> có <b>" + nptRows.length + "</b> người thân / người phụ thuộc đã khai." }),
        h("span", { class: "sp" }),
        btn("Chi tiết người phụ thuộc", "pri", function () { if (!leaveOk()) return; nptModal(ma); }, "Mở cửa sổ cha–con để xem, thêm, sửa người phụ thuộc của nhân viên này")]));
      if (nptRows.length) {
        var nt = h("table"); nt.appendChild(h("tr", {}, [h("th", { text: "Họ tên" }), h("th", { text: "Quan hệ" })]));
        nptRows.forEach(function (r) { nt.appendChild(h("tr", {}, [h("td", { class: "t", text: r["Họ tên nhân thân"] || "" }), h("td", { class: "t", text: r["Quan hệ"] || "" })])); });
        nc.appendChild(h("div", { class: "tw" }, [nt]));
      }
      w.appendChild(nc); return w;
    }
    if (st.nvTab !== "hopdong") { w.appendChild(subTable(st.nvTab, { "Mã NV": ma })); return w; }
    // Tab hợp đồng: danh sách HĐ + mục con của HĐ đang chọn
    var hds = db.hopdong.filter(function (r) { return r["Mã NV"] === ma; });
    var cur = hds.filter(function (r) { return r["Số HĐLĐ"] === st.hd; })[0] || hh.hd || hds[0];
    w.appendChild(subTable("hopdong", { "Mã NV": ma }, { selected: cur, onPick: function (r) { st.hd = r["Số HĐLĐ"]; render(); } }));
    if (!cur) return w;
    st.hd = cur["Số HĐLĐ"];
    var nPL = db.chitiethd.filter(function (r) { return r["Mã NV"] === ma && r["Số HĐLĐ"] === cur["Số HĐLĐ"]; }).length;
    var mc = h("div", { class: "card", "data-hd-master": cur["Số HĐLĐ"] });
    mc.appendChild(h("div", { class: "bar", style: "margin:0" }, [
      h("div", { html: "Hợp đồng đang chọn: <b>" + esc(cur["Số HĐLĐ"]) + "</b> (" + esc(cur["Hình thức HĐLĐ"] || "") + ") · " + nPL + " dòng lương & phụ lục. Bấm vào hợp đồng khác ở bảng trên để chuyển." }),
      h("span", { class: "sp" }),
      btn("📂 Chi tiết hợp đồng", "pri", function () { if (!leaveOk()) return; hdChiTietModal(ma, cur["Số HĐLĐ"]); }, "Mở cửa sổ cha–con: lương & phụ lục, nghỉ phép, tài liệu… của đúng hợp đồng này")]));
    w.appendChild(mc);
    return w;
  }

  function tabNhanSu() {
    var wrap = h("div"), card = h("div", { class: "card" }), bar = h("div", { class: "bar" }), sf = null, lastN = { kept: 0, total: 0 };
    bar.appendChild(btn("＋ Thêm nhân viên", "pri", wizardNV)); bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("📄 Tải file mẫu", "", function () { saveXlsx("Mau_HoSoNhanSu.xlsx", Object.keys(HR).map(templateSheet), "template"); toast("File mẫu có 1 sheet cho mỗi loại hồ sơ"); }, "Mỗi loại hồ sơ là 1 sheet"));
    bar.appendChild(btn("⬆ Nhập Excel", "", importAllFile, "Nhập file Excel nhiều sheet (Nhân viên, Thông tin cá nhân, Hợp đồng…)"));
    bar.appendChild(btn("⬇ Sổ lao động", "", function () { var rows = HRM.reports(db, { hidePay: !canSeePay() }).soLaoDong(st.nam); saveXlsx("SoQuanLyLaoDong.xlsx", [{ name: "Sổ quản lý lao động", cols: rows[0] ? Object.keys(rows[0]) : [], rows: rows }]); }));
    bar.appendChild(btn("⬇ Excel danh sách đang lọc", "", function () { var rows = nsRows().map(nsExportRow); saveXlsx("DanhSachNhanSu_loc.xlsx", [{ name: "Nhân sự", cols: rows[0] ? Object.keys(rows[0]) : [], rows: rows }]); }, "Xuất đúng các dòng đang hiển thị"));
    bar.appendChild(btn("⬇ PDF", "", function () { exportSheetsPdf({ title: "DANH SÁCH NHÂN SỰ (đã lọc)", ky: SFC.scopeText(sf.cfg, sf.cfg.state.get(), "tất cả"), sheets: [{ name: "Nhân sự", rows: nsRows().map(nsExportRow) }] }, "DanhSachNhanSu_loc.pdf"); }, "Xuất đúng các dòng đang hiển thị"));
    bar.appendChild(btn("🖨 In", "", function () { if (!need("export", "in")) return; window.print(); }));
    card.appendChild(bar);
    var nsf = function () { return (st.nsf = st.nsf || { pb: [], cv: [], hd: [], hh: "" }); };
    var today = function () { return HRM.today(); };
    var isoLocal = function (d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }; // ngày theo giờ máy (không dùng UTC)
    var rowsAll = function () { var ix = HRM.buildIndex(db); return db.nhanvien.map(function (r) { return { r: r, hh: HRM.hienHanh(db, r["Mã NV"], null, ix) }; }); };
    /** MỘT hàm chọn dòng cho bảng, Excel, PDF và in. */
    function nsRows() {
      var qq = qOf("nhansu"), f = nsf(), t0 = today(), in30 = function (n) { return isoLocal(new Date(Date.now() + n * 864e5)); };
      var all = rowsAll(); lastN = { total: all.length, kept: 0 };
      var out = all.filter(function (x) {
        if (st.ft && x.r["Trạng thái"] !== st.ft) return false;
        if (f.pb.length && !SFC.inSet(f.pb, x.hh.tenPB)) return false;
        if (f.cv.length && !SFC.inSet(f.cv, x.hh.tenCV)) return false;
        var hd = x.hh.hd || {}, het = SFC.isoDay(hd["Ngày hết hạn"]), ct = !!hd["Ngày chấm dứt"];
        if (f.hd.length && !SFC.inSet(f.hd, hd["Hình thức HĐLĐ"])) return false;
        if (f.hh === "quahan" && !(het && !ct && het < t0)) return false;
        if (/^(30|60|90)$/.test(f.hh) && !(het && !ct && het >= t0 && het <= in30(+f.hh))) return false;
        if (f.hh === "khong" && het) return false;
        return !qq || SFC.hay([x.r["Mã NV"], x.r["Họ và tên"], x.hh.tenPB, x.hh.tenCV]).indexOf(qq) >= 0;
      });
      lastN.kept = out.length; return out;
    }
    function nsExportRow(x) { var hd = x.hh.hd || {}, o = { "Mã NV": x.r["Mã NV"], "Họ và tên": x.r["Họ và tên"], "Phòng ban": x.hh.tenPB || "", "Chức vụ": x.hh.tenCV || "", "Loại HĐ": hd["Hình thức HĐLĐ"] || "", "Hết hạn HĐ": hd["Ngày hết hạn"] || "" }; if (canSeePay()) o["Lương thỏa thuận"] = x.hh.ct ? E.money(x.hh.ct["Lương thỏa thuận"]) : ""; o["Trạng thái"] = x.r["Trạng thái"] || ""; return o; }
    var distinct = function (fn) { return function () { var d = {}; rowsAll().forEach(function (x) { var v = String(fn(x) || "").trim(); if (v) d[v] = 1; }); return Object.keys(d).sort(); }; };
    var cfg = {
      screenId: "nhansu", searchPlaceholder: "🔍 Tìm mã, tên, phòng ban…",
      fields: [
        { key: "tt", label: "Trạng thái", type: "enum", options: ["Đang làm việc", "Tạm hoãn HĐLĐ", "Đã nghỉ việc"] },
        { key: "pb", label: "Phòng ban", type: "multi", withNone: true, options: distinct(function (x) { return x.hh.tenPB; }) },
        { key: "cv", label: "Chức vụ", type: "multi", withNone: true, options: distinct(function (x) { return x.hh.tenCV; }) },
        { key: "hd", label: "Loại hợp đồng", type: "multi", withNone: true, options: distinct(function (x) { return (x.hh.hd || {})["Hình thức HĐLĐ"]; }) },
        { key: "hh", label: "Hạn hợp đồng", type: "enum", options: [{ value: "quahan", label: "Đã quá hạn (chưa chấm dứt)" }, { value: "30", label: "Hết hạn trong 30 ngày" }, { value: "60", label: "Hết hạn trong 60 ngày" }, { value: "90", label: "Hết hạn trong 90 ngày" }, { value: "khong", label: "Không có ngày hết hạn" }] }
      ],
      quickFields: ["q", "tt", "pb"], advancedFields: ["q", "tt", "pb", "cv", "hd", "hh"], scopeFallback: function () { return "tất cả nhân viên"; },
      state: {
        get: function () { var f = nsf(), s = SFC.empty(); s.q = st.qs.nhansu || ""; if (st.ft) s.one.tt = st.ft; if (f.pb.length) s.sel.pb = f.pb.slice(); if (f.cv.length) s.sel.cv = f.cv.slice(); if (f.hd.length) s.sel.hd = f.hd.slice(); if (f.hh) s.one.hh = f.hh; return s; },
        set: function (s) { st.ft = s.one.tt || ""; st.nsf = { pb: (s.sel.pb || []).slice(), cv: (s.sel.cv || []).slice(), hd: (s.sel.hd || []).slice(), hh: s.one.hh || "" }; st.qs.nhansu = s.q; saveUi(); }
      },
      dataSource: function () { return { kept: lastN.kept, total: lastN.total, unsupported: [] }; },
      onApply: function () { st.pg.nhansu = 0; draw(); }
    };
    sf = sfUi.mount(cfg); sf.cfg = cfg; card.appendChild(sf.el);
    card.appendChild(h("div", { class: "hint", text: "Bấm vào một nhân viên để mở hồ sơ đầy đủ (cá nhân, hợp đồng, phụ lục lương, người phụ thuộc, nghỉ phép…). Lương được tính theo phụ lục hợp đồng đang hiệu lực." }));
    var tw = h("div", { class: "tw" }); card.appendChild(tw); wrap.appendChild(card);
    function draw() {
      tw.innerHTML = "";
      var rows = nsRows(); sf.refresh();
      if (!rows.length) { tw.appendChild(h("div", { class: "empty", html: db.nhanvien.length ? "Không tìm thấy." : "Chưa có nhân viên nào.<br>Bấm <b>＋ Thêm nhân viên</b> hoặc nhập từ file Excel." })); return; }
      var pgN = pager("nhansu", rows.length, draw); if (pgN.el) tw.appendChild(pgN.el);
      var seePay = canSeePay(), cols = ["Mã NV", "Họ và tên", "Phòng ban", "Chức vụ", "Loại HĐ", "Hết hạn HĐ"].concat(seePay ? ["Lương thỏa thuận"] : [], ["Trạng thái"]);
      var t = h("table"), tr = h("tr"); cols.forEach(function (c) { tr.appendChild(h("th", { class: c === "Lương thỏa thuận" ? "r" : "", text: c })); });
      t.appendChild(h("thead", {}, [tr])); var tb = h("tbody");
      rows.slice(pgN.start, pgN.end).forEach(function (x) {
        var r = x.r, hd = x.hh.hd || {}, het = hd["Ngày hết hạn"] || "", soon = het && !hd["Ngày chấm dứt"] && het <= isoLocal(new Date(Date.now() + 30 * 864e5));
        var e = h("tr", { class: "click", on: { click: function () { st.tab = "nv"; st.nv = r["Mã NV"]; st.nvTab = "canhan"; st.hd = null; render(); } } });
        [r["Mã NV"], r["Họ và tên"], x.hh.tenPB, x.hh.tenCV, hd["Hình thức HĐLĐ"] || "", het].forEach(function (v, i) { e.appendChild(h("td", { class: "t", text: v || "", style: i === 5 && soon ? "color:#c0362c;font-weight:600" : "" })); });
        if (seePay) e.appendChild(h("td", { class: "r", text: x.hh.ct ? fmt(E.money(x.hh.ct["Lương thỏa thuận"])) : "" }));
        e.appendChild(h("td", { class: "t" }, [h("span", { class: "tag " + (r["Trạng thái"] === "Đã nghỉ việc" ? "off" : "on"), text: r["Trạng thái"] || "" })]));
        tb.appendChild(e);
      });
      t.appendChild(tb); tw.appendChild(t);
    }
    draw(); return wrap;
  }

  // ---------- Báo cáo nhân sự ----------
  var BC = [["biendong", "📶 Biến động nhân sự"], ["hethan", "⏰ HĐLĐ sắp hết hạn"], ["tinhhinh", "👥 Tình hình nhân sự"], ["nghi", "🌴 Nghỉ phép / ốm"], ["vipham", "⚠️ Vi phạm chưa xử lý"], ["sinhnhat", "🎂 Sinh nhật trong tháng"], ["solaodong", "📋 Sổ quản lý lao động"], ["lichsu", "🕘 Lịch sử nhân sự"]];
  function simpleTable(rows, moneyCols, columns) {
    if (!rows.length) return h("div", { class: "empty", text: "Không có dữ liệu." });
    var cols = columns || Object.keys(rows[0]), t = h("table"), tr = h("tr");
    cols.forEach(function (c) { tr.appendChild(h("th", { text: c })); }); t.appendChild(h("thead", {}, [tr]));
    var tb = h("tbody");
    rows.forEach(function (r) { var x = h("tr"); cols.forEach(function (c) { var v = r[c]; var cell = h("td", { class: typeof v === "number" ? "r" : "t", text: v instanceof HTMLElement ? "" : (typeof v === "number" ? qtyText(v) : (v == null ? "" : v)), style: v === "ĐÃ QUÁ HẠN" ? "color:#c0362c;font-weight:700" : "" }); if (v instanceof HTMLElement) cell.appendChild(v); x.appendChild(cell); }); tb.appendChild(x); });
    t.appendChild(tb); return h("div", { class: "tw" }, [t]);
  }
  /** Sổ lao động (α18): ai còn thiếu thông tin bắt buộc + nút mở đúng tab hồ sơ để bổ sung */
  var TAB_TEN = { canhan: "Thông tin cá nhân", hocvan: "Trình độ học vấn", hopdong: "Hợp đồng lao động", chitiethd: "Lương & phụ lục HĐ" };
  function goHoSo(ma, tab) {
    st.tab = "nv"; st.nv = ma;
    if (tab === "chitiethd" || tab === "hopdong") { var hh = HRM.hienHanh(db, ma); st.nvTab = "hopdong"; st.hd = hh.hd ? hh.hd["Số HĐLĐ"] : null; st.hdTab = tab === "chitiethd" ? "chitiethd" : st.hdTab; }
    else st.nvTab = tab;
    saveUi(); render();
  }
  function soLaoDongThieuCard(list) {
    var box = h("div", { "data-sld-thieu": String(list.length) });
    if (!list.length) { box.appendChild(h("div", { class: "ok", text: "✓ Mọi nhân viên đã đủ thông tin bắt buộc của sổ quản lý lao động." })); return box; }
    var show = !!st.sldThieu;
    box.appendChild(h("div", { class: "warn" }, [h("b", { text: "⚠ " + list.length + " người còn thiếu thông tin sổ lao động" }), document.createTextNode(" — bấm tên mục để mở đúng tab hồ sơ và bổ sung (hoặc dùng file mẫu Excel của Nhân sự). "), btn(show ? "Thu gọn" : "Xem danh sách", "ghost", function () { st.sldThieu = !show; render(); })]));
    if (!show) return box;
    var t = h("table", { class: "sld-thieu" }), tb = h("tbody");
    t.appendChild(h("thead", {}, [h("tr", {}, [h("th", { text: "Mã NV" }), h("th", { text: "Họ và tên" }), h("th", { text: "Còn thiếu (bấm để bổ sung)" })])]));
    list.forEach(function (x) {
      var by = {}; x.thieu.forEach(function (m) { (by[m.tab] = by[m.tab] || []).push(m.field); });
      var cell = h("td", { class: "t" });
      Object.keys(by).forEach(function (tab) { cell.appendChild(btn(TAB_TEN[tab] + ": " + by[tab].join(", "), "chipbtn", function () { goHoSo(x["Mã NV"], tab); }, "Mở hồ sơ " + x["Họ và tên"] + " → " + TAB_TEN[tab])); });
      tb.appendChild(h("tr", {}, [h("td", { class: "t", text: x["Mã NV"] }), h("td", { class: "t", text: x["Họ và tên"] }), cell]));
    });
    t.appendChild(tb); box.appendChild(h("div", { class: "tw", style: "max-height:360px" }, [t]));
    return box;
  }
  function tabBaoCao() {
    var w = h("div"), bar = h("div", { class: "bar" }), R = HRM.reports(db, { hidePay: !canSeePay() });
    st.bc = st.bc || "hethan";
    BC.forEach(function (b) { bar.appendChild(btn(b[1], st.bc === b[0] ? "pri" : "", function () { st.bc = b[0]; render(); })); });
    w.appendChild(bar);
    var card = h("div", { class: "card" }), tools = h("div", { class: "bar" }), rows = [], title = BC.filter(function (b) { return b[0] === st.bc; })[0][1].replace(/^\S+\s/, "");
    card.appendChild(tools);
    if (st.bc === "biendong") {
      var mk = function (v, set) { var i = kyPicker(v); i.addEventListener("change", function () { if (i.value) { set(i.value); render(); } }); return i; };
      var den0 = st.bdDen || kyStr(), tu0 = st.bdTu || (function () { var d = new Date(+den0.slice(0, 4), +den0.slice(5, 7) - 3, 1); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2); })();
      tools.appendChild(h("label", { text: "Từ " })); tools.appendChild(mk(tu0, function (v) { st.bdTu = v; }));
      tools.appendChild(h("label", { text: "đến " })); tools.appendChild(mk(den0, function (v) { st.bdDen = v; }));
      var all = R.biendong(tu0 < den0 ? tu0 : den0, tu0 < den0 ? den0 : tu0), loai = st.bdLoai || "";
      var tiles = h("div", { class: "kpis", role: "group", "aria-label": "Lọc theo loại biến động" });
      [""].concat(["Tăng mới", "Nghỉ việc"], HRM.BIEN_DONG.filter(function (x) { return x !== "Khác"; })).forEach(function (L) {
        var n = all.filter(function (r) { return !L || r["Loại biến động"] === L; }).length;
        if (L && !n) return;
        tiles.appendChild(h("button", { type: "button", class: "kpi qcard", "aria-pressed": loai === L ? "true" : "false", style: loai === L ? "border-color:var(--brand);background:var(--brandSoft)" : "", on: { click: function () { st.bdLoai = L; render(); } } }, [h("small", { text: L || "Tất cả" }), h("b", { text: String(n) })]));
      });
      card.appendChild(tiles);
      rows = all.filter(function (r) { return !loai || r["Loại biến động"] === loai; });
      card.appendChild(h("div", { class: "hint", text: "Tự nhận biết từ hợp đồng (vào làm / chấm dứt) và từ mỗi phụ lục so với phụ lục liền trước — dữ liệu cũ không phải nhập lại. Dùng để theo dõi tăng / giảm lao động, tăng lương, báo tăng / giảm mức đóng BHXH hằng tháng." }));
      card.appendChild(simpleTable(rows));
    } else if (st.bc === "hethan") {
      var nd = h("select"); [15, 30, 60, 90].forEach(function (n) { nd.appendChild(h("option", { value: n, text: "Trong " + n + " ngày tới" })); });
      nd.value = st.bcDays || 30; nd.addEventListener("change", function () { st.bcDays = +nd.value; render(); });
      tools.appendChild(nd); rows = R.hethan(+(st.bcDays || 30));
      card.appendChild(h("div", { class: "hint", text: "Gồm cả hợp đồng đã quá hạn mà chưa ký tiếp/chưa chấm dứt. Lấy theo 'Ngày hết hạn' của hợp đồng đang hiệu lực." }));
      card.appendChild(simpleTable(rows));
    } else if (st.bc === "tinhhinh") {
      var th = R.tinhhinh(), g = h("div", { class: "kpis" });
      [["Theo trạng thái", th.trangthai], ["Theo phòng ban (đang làm)", th.phongban], ["Theo giới tính (đang làm)", th.gioitinh], ["Theo loại HĐ (đang làm)", th.loaihd]].forEach(function (p) {
        var c = h("div", { class: "kpi" }); c.appendChild(h("small", { text: p[0] }));
        p[1].forEach(function (x) { c.appendChild(h("div", { class: "kv", html: "<span>" + esc(x["Nhóm"]) + "</span><b>" + x["Số người"] + "</b>" })); });
        g.appendChild(c);
        rows = rows.concat(p[1].map(function (x) { return { "Tiêu chí": p[0], "Nhóm": x["Nhóm"], "Số người": x["Số người"] }; }));
      });
      card.appendChild(g);
    } else if (st.bc === "nghi") {
      var yy = h("input", { class: "i", type: "number", value: st.nam, style: "width:90px" }); yy.addEventListener("change", function () { st.nam = +yy.value; render(); });
      tools.appendChild(h("label", { text: "Năm " })); tools.appendChild(yy);
      rows = R.nghi(st.nam);
      card.appendChild(h("div", { class: "hint", text: "Chỉ đếm các lần nghỉ 'Đã duyệt'. Phép được cấp = Số ngày được cấp + cộng dồn năm trước (mục Quyền lợi phép của hợp đồng)." }));
      card.appendChild(simpleTable(rows));
    } else if (st.bc === "vipham") { rows = R.vipham(); card.appendChild(simpleTable(rows)); }
    else if (st.bc === "sinhnhat") { rows = R.sinhnhat(st.thang); card.appendChild(h("div", { class: "hint", text: "Theo kỳ lương đang chọn: tháng " + st.thang })); card.appendChild(simpleTable(rows)); }
    else if (st.bc === "solaodong") {
      rows = R.soLaoDong(st.nam);
      card.appendChild(soLaoDongThieuCard(R.soLaoDongThieu()));
      card.appendChild(h("div", { class: "hint", text: "Nội dung theo khoản 2 Điều 3 Nghị định 145/2020/NĐ-CP (lập sổ trong 30 ngày kể từ ngày bắt đầu hoạt động; cập nhật từ ngày người lao động bắt đầu làm việc; xuất trình khi cơ quan có thẩm quyền yêu cầu). Các cột nghỉ / làm thêm / đào tạo / kỷ luật / tai nạn lấy theo năm " + st.nam + " (năm của kỳ đang chọn). Bấm 'Xuất Excel' để in / lưu sổ." }));
      card.appendChild(simpleTable(rows));
    }
    else if (st.bc === "lichsu") {
      var sel = h("select"); sel.appendChild(h("option", { value: "", text: "— chọn nhân viên —" }));
      db.nhanvien.forEach(function (n) { sel.appendChild(h("option", { value: n["Mã NV"], text: n["Mã NV"] + " — " + n["Họ và tên"] })); });
      sel.value = st.bcNV || ""; sel.addEventListener("change", function () { st.bcNV = sel.value; render(); });
      tools.appendChild(sel);
      rows = st.bcNV ? R.lichsu(st.bcNV) : [];
      card.appendChild(st.bcNV ? simpleTable(rows) : h("div", { class: "empty", text: "Chọn nhân viên để xem toàn bộ lịch sử hồ sơ." }));
    }
    tools.appendChild(h("span", { class: "sp" }));
    tools.appendChild(btn("⬇ Xuất Excel", "", function () {
      if (!rows.length) { toast("Không có dữ liệu"); return; }
      if (!need("export", "xuất dữ liệu ra Excel")) return;
      if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.reportXlsx) { alert("Thiếu thư viện Excel"); return; }
      var vm = opsRowsVm(title, rows, "BaoCaoNhanSu_" + slug(title));
      window.HAKUi.reportXlsx.build(window.ExcelJS, vm, { chuKy: vm.chuKy }).xlsx.writeBuffer().then(function (buf) {
        download(vm.file + "_" + vm.kyKey + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf); audit("Xuất Excel " + vm.title, vm.soDong + " dòng");
      }, function (e) { alert("Không tạo được file: " + e.message); });
    }));
    tools.appendChild(btn("⬇ Xuất PDF", "", function () {
      if (!rows.length) { toast("Không có dữ liệu"); return; }
      var vm = opsRowsVm(title, rows, "BaoCaoNhanSu_" + slug(title));
      exportSheetsPdf({ title: vm.title, ky: vm.kyText, loc: [], sheets: OPS.toSheets(vm) }, vm.file + "_" + vm.kyKey + ".pdf", { chuKy: vm.chuKy });
    }));
    tools.appendChild(h("span", { class: "hint", style: "margin:0", text: rows.length + " dòng" }));
    w.appendChild(card); return w;
  }

  // ---------- Hồ sơ công ty ----------
  var CONGTY_F = [{ k: "Tên công ty", req: 1 }, { k: "Địa chỉ" }, { k: "Mã số thuế" }, { k: "Số điện thoại" }, { k: "Người đại diện pháp luật" }];
  function congTy() { return (db.congty && db.congty[0]) || {}; }
  function cardCongTy() {
    var c = h("div", { class: "card" }), g = h("div", { class: "fgrid" });
    c.appendChild(h("h3", { text: "🏢 Hồ sơ công ty" }));
    c.appendChild(h("div", { class: "hint", text: "Tên công ty hiện trên thanh bên trái và trên phiếu lương." }));
    c.appendChild(g);
    var get = fieldInputs(g, CONGTY_F, congTy());
    c.appendChild(h("div", { class: "bar" }, [btn("💾 Lưu hồ sơ công ty", "pri", function () { if (!need("system.admin")) return; db.congty = [Object.assign({}, congTy(), get())]; save(); /* giữ trường ngoài form (VD Quy chế tính lương) */ render(); toast("Đã lưu"); })]));
    return c;
  }

  function cardAudit() {
    var c = h("div", { class: "card" }), list = (db.auditlog || []).slice().reverse();
    c.appendChild(h("h3", { text: "🕘 Nhật ký thao tác" }));
    c.appendChild(h("div", { class: "hint", text: list.length + " thao tác được ghi (chốt / mở chốt, nhập Excel, khôi phục, sửa hồ sơ & danh mục — kèm trước/sau, đánh dấu HỒI TỐ khi chạm kỳ đã chốt)." }));
    if (!list.length) return c;
    var rows = list.map(function (a) { return { "Thời điểm": fmtTime(a.luc), "Người thực hiện": a.nguoi || "(bản cũ — không ghi)", "Thao tác": a.thaoTac, "Chi tiết": a.chiTiet }; });
    c.appendChild(h("div", { class: "bar" }, [btn("⬇ Xuất Excel nhật ký", "", function () { saveXlsx("NhatKyThaoTac.xlsx", [{ name: "NhatKy", cols: Object.keys(rows[0]), rows: rows }]); })]));
    c.appendChild(h("div", { class: "tw", style: "max-height:320px" }, [simpleTable(rows.slice(0, 300))]));
    return c;
  }

  // ---------- Hướng dẫn, quy trình, dự thảo quy chế (ui/guide.js) ----------
  function tabHuongDan() {
    var G = window.HAKGuide, w = h("div"), tabs = h("div", { class: "subtabs noprint" }), key = st.hd2 || "start";
    G.TABS.forEach(function (t) { tabs.appendChild(h("button", { class: key === t[0] ? "on" : "", text: t[1], on: { click: function () { st.hd2 = t[0]; render(); } } })); });
    w.appendChild(tabs);
    var ctx = { db: db, E: E, nam: st.nam, thang: st.thang, congTy: congTy() };
    var bar = h("div", { class: "bar noprint" }, [btn("🖨 In", "", function () { window.print(); })]);
    if (key === "rules") {
      bar.appendChild(btn("⬇ Tải file Word (.doc) để chỉnh sửa", "pri", function () { download("Du_thao_Quy_che_tra_luong_" + kyKey(st.nam, st.thang) + ".doc", "application/msword", G.regulationDoc(ctx)); audit("Tải dự thảo Quy chế trả lương", kyLabel(kyKey(st.nam, st.thang))); }));
      bar.appendChild(h("span", { class: "hint", style: "margin:0", text: "Bảng mức lương, phụ cấp, BH, thuế lấy theo danh mục đang có hiệu lực ở kỳ " + st.thang + "/" + st.nam + " (đổi kỳ ở góc phải trên)." }));
    }
    w.appendChild(bar);
    w.appendChild(h("div", { class: "card guide" + (key === "rules" ? " g-doc" : ""), html: G.section(key, ctx) }));
    return w;
  }

  // ---------- Danh mục ----------
  function tabDanhMuc() {
    var w = h("div"), bar = h("div", { class: "bar" });
    if (DM_CAI_DAT[st.dm]) st.dm = Object.keys(DM).filter(function (k) { return !DM_CAI_DAT[k]; })[0];
    Object.keys(DM).filter(function (k) { return !DM_CAI_DAT[k]; }).forEach(function (k) { bar.appendChild(btn(DM[k].ten + (countOf(k) ? " (" + countOf(k) + ")" : ""), st.dm === k ? "pri" : "", function () { if (st.dm !== k && !leaveOk()) return; st.dm = k; st.benefitCatalog = false; saveUi(); render(); })); });
    bar.appendChild(h("div", { class: "hak-catalog-side-title", text: "CẤP PHÁT" }));
    bar.appendChild(btn("Tiêu chuẩn phúc lợi", st.benefitCatalog === "std" ? "pri" : "", function () { if (!leaveOk()) return; st.benefitCatalog = st.benefitCatalog === "std" ? false : "std"; render(); }));
    bar.appendChild(btn("Đồ bảo hộ lao động", st.benefitCatalog === "ppe" ? "pri" : "", function () { if (!leaveOk()) return; st.benefitCatalog = st.benefitCatalog === "ppe" ? false : "ppe"; render(); }));
    var layout = h("div", { class: "hak-catalog-layout" });
    var side = h("aside", { class: "hak-catalog-side", "aria-label": "Chọn danh mục" });
    side.appendChild(h("div", { class: "hak-catalog-side-title", text: "DANH MỤC HỆ THỐNG" }));
    side.appendChild(bar);
    layout.appendChild(side);
    var workspace = h("section", { class: "hak-catalog-main", "aria-label": "Nội dung danh mục" });
    workspace.appendChild(h("div", { class: "hak-catalog-heading" }, [h("small", { text: "QUẢN LÝ DANH MỤC" }), h("h2", { text: st.benefitCatalog === "ppe" ? "Đồ bảo hộ lao động" : st.benefitCatalog ? "Tiêu chuẩn phúc lợi" : DM[st.dm] ? DM[st.dm].ten : "Danh mục" })]));
    workspace.appendChild(st.benefitCatalog === "ppe" ? ppeCatalog() : st.benefitCatalog ? benefitCatalog() : st.dm === "dm_tncn" ? thuePanel() : FM_TABLE[st.dm] ? fmUi(FM_TABLE[st.dm]).masterView() : grid(st.dm, DM[st.dm]));
    layout.appendChild(workspace);
    w.appendChild(layout);
    return w;
  }
  /** V10.2/V10.3: Danh mục Tăng ca · Phụ cấp · Hỗ trợ dạng Master–Detail dùng chung (ui/formula-master.js). Phụ thuộc đưa vào qua một đối tượng — module không đụng DOM/db ngoài luồng repository. */
  var FM_TABLE = { dm_tangca: "OVERTIME", dm_phucap: "ALLOWANCE", dm_hotro: "SUPPORT" }, FMUI = {};
  function fmUi(type) {
    return FMUI[type] || (FMUI[type] = window.HAKUI.formulaMaster.create({
      h: h, btn: btn, esc: esc, fmt: fmt, $: $, st: st, db: function () { return db; }, can: can, user: function () { return session ? session.tenDangNhap : currentUser(); },
      REPO: REPO, commit: commit, txn: txn, save: save, render: render, audit: audit, toast: toast, alert: function (m) { alert(m); }, fmtTime: fmtTime,
      dateField: dateField, dateIso: dateIso, kqKy: kqKy, closedPeriods: function () { return db.kyluong.map(function (k) { return k.ky; }); }, pct: E.pct,
      backup: function (tag) { if (store && store.backup) store.backup(tag); }, dirtyBump: function () { dbRev++; st.kqStale = true; }
    }, type));
  }

  // ---------- Kiểm tra bảng lương (V10): ERROR / WARNING / INFO, đi tới dữ liệu, kiểm tra lại, xuất Excel ----------
  var KT_GOTO = { 1: ["caidat"], 2: ["dm", "dm_luong"], 3: ["dm", "dm_tangca"], 4: ["nhansu"], 5: ["nhansu"], 6: ["dm", "dm_luong"], 7: ["sanluong"], 8: ["sanluong"], 9: ["sanluong"], 10: ["chamcong"], 15: ["chamcong"], 16: ["dm", "dm_tncn"], 17: ["dm", "dm_baohiem"], 18: ["luong"], 19: ["luong"], 20: ["luong"], 21: ["caidat"], 22: ["dm", "dm_luong"] };
  var KT_SEV = { loi: "ERROR", canhbao: "WARNING", ok: "INFO" };
  function ktChay() {
    var kq = tinhLuong(), slA = pbAlloc(st.nam, st.thang, "sanluong"), bdA = pbAlloc(st.nam, st.thang, "bandam");
    var ck = PCC ? PCC.run({ db: db, kq: kq, slAlloc: slA, bdAlloc: bdA, quyChe: quyChe() }) : { items: [] };
    var out = ck.items.map(function (x) { return { id: "KT-" + ("0" + x.id).slice(-2), muc: KT_SEV[x.trangThai] || "INFO", ten: x.ten, chiTiet: x.chiTiet || [], goto: KT_GOTO[x.id] || null }; });
    INT.check(db).filter(function (i) { return i.level === "Critical" || /CỘNG (2 LẦN|NHIỀU LẦN)/.test(i.msg); }).forEach(function (i, n) { out.push({ id: "DL-" + (n + 1), muc: "ERROR", ten: "Lỗi dữ liệu nghiêm trọng (chặn chốt kỳ)", chiTiet: [i.msg], goto: ["backup"] }); });
    if (kq.canhbao.length) out.push({ id: "CB-01", muc: "WARNING", ten: "Cảnh báo dữ liệu khi tính lương (" + kq.canhbao.length + ")", chiTiet: kq.canhbao.slice(), goto: ["luong"] });
    (kq.loiTyLeBH || []).forEach(function (message, i) {
      out.push({ id: "BH-" + (i + 1), muc: "ERROR", ten: "Thiếu tỷ lệ bảo hiểm người lao động — chặn chốt kỳ", chiTiet: [message], goto: ["dm", "dm_baohiem"] });
    });
    (kq.inputErrors || []).forEach(function (message, i) {
      var match = /^(chamcong|sanluong|bandam) dòng (\d+):/.exec(message);
      if (match) out.push({ id: "NL-" + (i + 1), muc: "ERROR", ten: "Lỗi dữ liệu đầu vào",
        chiTiet: [message], goto: [match[1], null, Number(match[2]) - 1] });
    });
    [["sanluong", slA], ["bandam", bdA]].forEach(function (entry, index) {
      var receipts = entry[1].attendanceReview || [];
      if (receipts.length) out.push({ id: "CC-SL-" + (index + 1), muc: "WARNING",
        ten: ALL[entry[0]].ten + " · Phiếu cần đối chiếu chấm công (" + receipts.length + ")",
        chiTiet: receipts.map(function (receipt) { return receipt.phieu + " · " + receipt.ngay + " · " + receipt.maPB + " · " +
          receipt.employees.map(function (employee) { return employee.ma + " — " + employee.hoTen; }).join(", "); }),
        goto: ["baocaoluong", entry[0]] });
    });
    var order = { ERROR: 0, WARNING: 1, INFO: 2 };
    out.sort(function (a, b) { return order[a.muc] - order[b.muc]; });
    st.kt = { ky: kyStr(), rev: dbRev, at: new Date().toISOString(), rows: out };
  }
  function ktDi(g) {
    if (!g) return; if (!leaveOk()) return;
    if (g[0] === "dm" && g[1]) st.dm = g[1];
    if (!tabAllowed(g[0])) return;
    if (g[0] === "baocaoluong" && g[1]) {
      st.bcl = "sanluong"; st.bclLoai = g[1]; st.attendanceReceiptFilters = {};
    }
    var row = Number.isInteger(g[2]) && (db[g[0]] || [])[g[2]];
    if (row) {
      var period = VAL.rowPeriod(g[0], row);
      if (period) { st.nam = Number(period.slice(0, 4)); st.thang = Number(period.slice(5, 7)); }
      if (g[0] === "bandam") st.pumpMode = row["Mã NV"] ? "direct" : "team";
      st.ktReturn = st.kt.ky;
      st.qs[g[0]] = row["Phiếu cân"] || row["Mã NV"] || "";
      st.pg[g[0]] = 1;
    }
    st.tab = g[0]; saveUi(); render();
  }
  function tabKiemTra() {
    var w = h("div"), card = h("div", { class: "card" });
    if (!st.kt || st.kt.ky !== kyStr() || st.kt.rev !== dbRev) ktChay();
    var K = st.kt, cnt = { ERROR: 0, WARNING: 0, INFO: 0 }; K.rows.forEach(function (r) { cnt[r.muc]++; });
    if (!st.ktSev) st.ktSev = "";
    var bar = h("div", { class: "bar" });
    bar.appendChild(btn("↻ Kiểm tra lại", "pri", function () { ktChay(); render(); toast("Đã kiểm tra lại kỳ " + st.thang + "/" + st.nam); }));
    [["", "Tất cả"], ["ERROR", "Lỗi (" + cnt.ERROR + ")"], ["WARNING", "Cảnh báo (" + cnt.WARNING + ")"], ["INFO", "Thông tin (" + cnt.INFO + ")"]].forEach(function (x) { bar.appendChild(btn(x[1], st.ktSev === x[0] ? "pri" : "", function () { st.ktSev = x[0]; render(); })); });
    bar.appendChild(btn("⬇ Xuất Excel", "", function () {
      var rows = []; K.rows.forEach(function (r) { (r.chiTiet.length ? r.chiTiet : [""]).forEach(function (d) { rows.push({ "Mã": r.id, "Mức": r.muc, "Nội dung kiểm tra": r.ten, "Chi tiết": d }); }); });
      saveXlsx("KiemTraBangLuong_" + K.ky + ".xlsx", [{ name: "Kiem tra bang luong", cols: ["Mã", "Mức", "Nội dung kiểm tra", "Chi tiết"], rows: rows }]);
    }));
    card.appendChild(bar);
    card.appendChild(h("div", { class: cnt.ERROR ? "warn" : "ok", text: (cnt.ERROR ? "⛔ Còn " + cnt.ERROR + " lỗi — lỗi mức ERROR chặn việc chốt kỳ và xuất báo cáo chính thức. " : "✔ Không có lỗi chặn chốt kỳ. ") + cnt.WARNING + " cảnh báo, " + cnt.INFO + " mục thông tin · Kỳ " + st.thang + "/" + st.nam + " · kiểm tra lúc " + fmtTime(K.at) }));
    var t = h("table", { class: "kt" });
    t.appendChild(h("thead", {}, [h("tr", {}, ["Mã", "Mức", "Nội dung kiểm tra", "Chi tiết", ""].map(function (c) { return h("th", { text: c }); }))]));
    var tb = h("tbody");
    K.rows.filter(function (r) { return !st.ktSev || r.muc === st.ktSev; }).forEach(function (r) {
      var tr = h("tr", { "data-sev": r.muc });
      tr.appendChild(h("td", { text: r.id }));
      tr.appendChild(h("td", { class: "kt-" + r.muc.toLowerCase(), html: "<b>" + (r.muc === "ERROR" ? "⛔ ERROR" : r.muc === "WARNING" ? "⚠ WARNING" : "✓ INFO") + "</b>" }));
      tr.appendChild(h("td", { class: "t", html: "<b>" + esc(r.ten) + "</b>" }));
      tr.appendChild(h("td", { class: "t", html: r.chiTiet.slice(0, 8).map(esc).join("<br>") + (r.chiTiet.length > 8 ? "<br>…(" + (r.chiTiet.length - 8) + " dòng nữa — xem trong file Excel)" : "") }));
      var act = h("td"); if (r.goto && r.muc !== "INFO") act.appendChild(btn("Đi tới dữ liệu", "", function () { ktDi(r.goto); })); tr.appendChild(act);
      tb.appendChild(tr);
    });
    t.appendChild(tb); card.appendChild(h("div", { class: "tw" }, [t]));
    w.appendChild(card); return w;
  }

  // ---------- Nghiệp vụ nhân sự (V10): đề nghị → chờ duyệt → duyệt/từ chối; duyệt xong mới ghi vào hồ sơ ----------
  var NVNS_LOAI = HR.nghiepvu_nhansu.f.filter(function (f) { return f.k === "Loại nghiệp vụ"; })[0].o;
  var NVNS_NGHI = { "Nghỉ phép năm": "Nghỉ hằng năm", "Nghỉ việc riêng có lương": "Nghỉ việc riêng có hưởng lương", "Nghỉ không lương": "Nghỉ không hưởng lương", "Nghỉ thai sản": "Nghỉ thai sản" };
  function fmtDate(v) { return v ? dispVal({ t: "date" }, v) : ""; }
  function nvnsTen(ma) { var n = db.nhanvien.filter(function (r) { return r["Mã NV"] === ma; })[0]; return n ? n["Họ và tên"] : ""; }
  function nvnsNextMa() { var mx = 0; (db.nghiepvu_nhansu || []).forEach(function (r) { var m = /(\d+)$/.exec(r["Mã phiếu"] || ""); if (m && +m[1] > mx) mx = +m[1]; }); return "NVNS" + ("00000" + (mx + 1)).slice(-5); }
  function nvnsCongTrung(r) {
    var tu = VAL.normDate(r["Từ ngày"]), den = VAL.normDate(r["Đến ngày"]) || tu, ma = r["Mã NV"];
    if (!tu || !NVNS_NGHI[r["Loại nghiệp vụ"]] && r["Loại nghiệp vụ"] !== "Nghỉ ốm") return 0;
    var days = new Set();
    (db.chamcong || []).forEach(function (c) {
      if (c["Mã NV"] !== ma) return;
      var ky = VAL.normKy(c["Kỳ"]);
      if (!ky) return;
      var maxDay = new Date(+ky.slice(0, 4), +ky.slice(5), 0).getDate();
      DAYS.slice(0, maxDay).forEach(function (field) {
        var date = ky + "-" + field;
        if (date >= tu && date <= den && E.tachCong(c[field]).soCong > 0) days.add(date);
      });
    });
    return days.size;
  }
  function nvnsGhiHoSo(r) {
    var ma = r["Mã NV"], loai = r["Loại nghiệp vụ"], tu = String(r["Từ ngày"] || "").slice(0, 10), den = String(r["Đến ngày"] || "").slice(0, 10);
    var nv = db.nhanvien.filter(function (x) { return x["Mã NV"] === ma; })[0];
    if (!nv) return { ok: false, msg: "Không tìm thấy nhân viên " + ma };
    if (!VAL.normDate(tu)) return { ok: false, msg: "Ngày hiệu lực không hợp lệ." };
    var hh = HRM.hienHanh(db, ma, tu);
    hh.hd = HRM.activeHD(db, ma, tu, tu);
    if (!hh.hd) return { ok: false, msg: "Nhân viên " + ma + " chưa có hợp đồng hiệu lực vào " + tu + "." };
    var soHD = hh.hd["Số HĐLĐ"], tag = "Từ " + r["Mã phiếu"];
    if (NVNS_NGHI[loai] || loai === "Nghỉ ốm") {
      var isOm = loai === "Nghỉ ốm", tb = isOm ? "nghiom" : "nghiphep";
      var vals = { "Mã NV": ma, "Số HĐLĐ": soHD, "Từ ngày": tu, "Đến ngày": den, "Số ngày nghỉ": r["Số ngày"] || "", "Trạng thái duyệt": "Đã duyệt", "Ghi chú": tag + ": " + (r["Lý do"] || "") };
      if (!isOm) { vals["Loại nghỉ"] = NVNS_NGHI[loai]; vals["Người duyệt"] = currentUser(); } else vals["Có giấy chứng nhận BHXH"] = "Không";
      var p = REPO.plan("insert", tb, null, vals, { what: "ghi " + loai.toLowerCase() + " vào hồ sơ" });
      if (!commit(p, { action: "Nghiệp vụ nhân sự — ghi " + loai + " " + ma })) return { ok: false, msg: "Repository từ chối ghi " + HR[tb].ten + " (xem thông báo)." };
      return { ok: true, msg: "Đã ghi vào " + HR[tb].ten + " của hợp đồng " + soHD };
    }
    if (loai === "Nghỉ việc") {
      if (!tu) return { ok: false, msg: "Thiếu ngày nghỉ việc" };
      if (!commit(REPO.plan("update", "hopdong", hh.hd, { "Ngày chấm dứt": tu }, { what: "chấm dứt hợp đồng" }), { confirm: true, action: "Nghiệp vụ nhân sự — nghỉ việc " + ma + " từ " + tu })) return { ok: false, msg: "Không ghi được ngày chấm dứt hợp đồng." };
      if (!commit(REPO.plan("update", "nhanvien", nv, { "Trạng thái": "Đã nghỉ việc" }, { what: "trạng thái nhân viên" }), { audit: false })) return { ok: false, msg: "Không đổi được trạng thái nhân viên." };
      return { ok: true, msg: "Đã ghi ngày chấm dứt hợp đồng " + soHD + " và chuyển nhân viên sang 'Đã nghỉ việc'" };
    }
    var isTransfer = loai === "Điều chuyển bộ phận";
    var isRole = loai === "Đổi chức vụ";
    if (!isTransfer && !isRole) return { ok: false, msg: "Loại nghiệp vụ chưa được hỗ trợ." };
    var revisions = db.chitiethd.filter(function (row) { return row["Mã NV"] === ma && row["Số HĐLĐ"] === soHD; });
    var prior = revisions.filter(function (row) {
      return !row["Hiệu lực từ"] || VAL.normDate(row["Hiệu lực từ"]) < tu;
    }).sort(function (a, b) { return String(b["Hiệu lực từ"] || "").localeCompare(String(a["Hiệu lực từ"] || "")); })[0];
    if (!prior) return { ok: false, msg: "Cần phụ lục gốc hiệu lực trước ngày biến động." };
    if (revisions.some(function (row) { return VAL.normDate(row["Hiệu lực từ"]) >= tu; })) {
      return { ok: false, msg: "Đã có phụ lục từ ngày hiệu lực này trở đi. Kiểm tra lịch sử phụ lục trước khi duyệt." };
    }
    var pb = r["Phòng ban mới"] || prior["Phòng ban"], cv = r["Chức vụ mới"] || prior["Chức vụ"];
    if (isTransfer && !r["Phòng ban mới"]) return { ok: false, msg: "Thiếu phòng ban mới." };
    if (isRole && !r["Chức vụ mới"]) return { ok: false, msg: "Thiếu chức vụ mới." };
    if (pb === prior["Phòng ban"] && cv === prior["Chức vụ"]) return { ok: false, msg: "Phòng ban và chức vụ trùng phụ lục hiện hành." };
    var annex = Object.assign(HR.chitiethd.defaults({ "Mã NV": ma, "Số HĐLĐ": soHD }, prior), {
      "Hiệu lực từ": tu, "Phòng ban": pb, "Chức vụ": cv, "Loại biến động": loai,
      "Số quyết định": r["Mã phiếu"], "Ghi chú": tag + ": " + (r["Lý do"] || "")
    });
    var plan = REPO.plan("insert", "chitiethd", null, annex, { what: "áp dụng phụ lục " + r["Mã phiếu"], checkDup: true });
    if (!commit(plan, { action: "Nghiệp vụ nhân sự — phụ lục " + r["Mã phiếu"] })) return { ok: false, msg: "Không ghi được phụ lục lương." };
    var pc = REPO.plan("insert", "congtac", null, { "Mã NV": ma, "Từ ngày": tu, "Phòng ban": pb, "Chức vụ": cv, "Loại biến động": isRole ? "Bổ nhiệm" : "Điều chuyển", "Số quyết định": r["Mã phiếu"], "Ghi chú": r["Lý do"] || "" }, { what: "ghi quá trình công tác" });
    if (!commit(pc, { action: "Nghiệp vụ nhân sự — " + loai + " " + ma + " từ " + tu })) return { ok: false, msg: "Không ghi được Quá trình công tác." };
    return { ok: true, msg: "Đã ghi quá trình công tác và phụ lục " + annex["Mã công tác"] + " từ " + fmtDate(tu) + "." };
  }
  function nvnsForm(row, defaults) {
    var isNew = !row, data = Object.assign({ "Mã phiếu": nvnsNextMa(), "Trạng thái": "Nháp", "Người đề nghị": currentUser(), "Ngày đề nghị": HRM.today() }, defaults || {}, row || {});
    var fs = HR.nghiepvu_nhansu.f.filter(function (f) { return ["Trạng thái", "Người đề nghị", "Ngày đề nghị", "Người duyệt", "Ngày duyệt", "Lý do từ chối", "Đã ghi vào hồ sơ"].indexOf(f.k) < 0; });
    fs = [{ k: "Mã NV", t: "ref", ref: "nhanvien", req: 1 }].concat(fs);
    var body = h("div"), g = h("div", { class: "fgrid" }); body.appendChild(g);
    var get = fieldInputs(g, fs, data);
    modal(isNew ? "Lập đề nghị nghiệp vụ nhân sự" : "Sửa đề nghị " + row["Mã phiếu"], body, function (close) {
      return [btn("Hủy", "", close), btn("💾 Lưu nháp", "pri", function () {
        if (!need("hr.edit", "lập nghiệp vụ nhân sự")) return;
        var d = get(), miss = missingReq(fs, d); if (miss.length) { alert("Cần nhập: " + miss.join(", ")); return; }
        if (d["Đến ngày"] && d["Đến ngày"] < d["Từ ngày"]) { alert("'Đến ngày' phải sau hoặc bằng 'Từ ngày'."); return; }
        var quota = C.leaveReconciliation.checkRequest(db, d);
        if (quota) { alert(quota); return; }
        var vals = isNew ? Object.assign({}, data, d) : d;
        if (!commit(REPO.plan(isNew ? "insert" : "update", "nghiepvu_nhansu", isNew ? null : row, vals, { what: (isNew ? "lập " : "sửa ") + "đề nghị nhân sự", checkDup: true }), { action: isNew ? "Lập đề nghị nhân sự" : "Sửa đề nghị nhân sự" })) return;
        close(); save();
        var Fn = st.nvf; if (Fn && vals["Từ ngày"] && ((Fn.tu && vals["Từ ngày"] < Fn.tu) || (Fn.den && vals["Từ ngày"] > Fn.den))) { Fn.tu = ""; Fn.den = ""; Fn.tuManual = Fn.denManual = true; } // đề nghị mới nằm ngoài khoảng ngày đang lọc → bỏ khoảng ngày để người lập thấy ngay phiếu vừa lưu
        render(); toast("Đã lưu đề nghị " + vals["Mã phiếu"]);
      })];
    }, { drawer: true });
  }
  function nvnsDoiRaw(r, tt, extra) {
    if (tt === "Chờ duyệt") {
      var quota = C.leaveReconciliation.checkRequest(db, r);
      if (quota) { alert(quota); return false; }
    }
    var p = REPO.plan("update", "nghiepvu_nhansu", r, Object.assign({ "Trạng thái": tt }, extra || {}), { what: "đổi trạng thái đề nghị" });
    if (!commit(p, { action: "Nghiệp vụ nhân sự — " + tt + " " + r["Mã phiếu"] })) return false;
    return true;
  }
  /** Đổi trạng thái 1 phiếu và ghi đĩa NGAY (từng bước Nháp→Chờ duyệt→… phải tới main đúng thứ tự, không gộp theo thời gian trễ). */
  function nvnsDoi(r, tt, extra) { return txn(["nghiepvu_nhansu"], function () { return nvnsDoiRaw(r, tt, extra); }); }
  function nvnsDuyet(r) {
    if (!need("hr.approve", "duyệt nghiệp vụ nhân sự")) return;
    if (r["Người đề nghị"] && r["Người đề nghị"] === currentUser() && !can("system.admin")) { alert("Người đề nghị không được tự duyệt phiếu của mình — nhờ người có quyền duyệt khác."); return; }
    var quota = C.leaveReconciliation.checkRequest(db, r);
    if (quota) { alert(quota); return; }
    var updatesAnnex = r["Loại nghiệp vụ"] === "Điều chuyển bộ phận" || r["Loại nghiệp vụ"] === "Đổi chức vụ";
    if (!can("hr.edit")) {
      alert("Phiếu này ghi vào hồ sơ nhân sự. Chuyển cho người có cả quyền duyệt và quyền sửa hồ sơ.");
      return;
    }
    var ccTrung = nvnsCongTrung(r), msg = "Duyệt " + r["Loại nghiệp vụ"] + " cho " + r["Mã NV"] + " — " + nvnsTen(r["Mã NV"]) + "?\nSau khi duyệt hệ thống ghi vào hồ sơ và KHÔNG sửa/xóa phiếu nữa." + (ccTrung ? "\n\n⚠ Có dữ liệu chấm công ở " + ccTrung + " ngày trong khoảng nghỉ. Sau khi duyệt, mở Chấm công → Đối chiếu đơn nghỉ để kiểm tra từng hình thức." : "");
    if (updatesAnnex) {
      var old = HRM.hienHanh(db, r["Mã NV"], r["Từ ngày"]);
      msg += "\n\nHiệu lực: " + fmtDate(r["Từ ngày"]) + " · Kỳ " + String(r["Từ ngày"]).slice(0, 7) +
        "\nPhòng ban: " + (old.pb || "—") + " → " + (r["Phòng ban mới"] || old.pb || "—") +
        "\nChức vụ: " + (old.cv || "—") + " → " + (r["Chức vụ mới"] || old.cv || "—") +
        "\nLý do: " + (r["Lý do"] || "—");
    }
    if (!confirm(msg)) return;
    var msgOk = "";
    var done = txn(["nghiepvu_nhansu", "nhanvien", "hopdong", "nghiphep", "nghiom", "congtac", "chitiethd"], function () {
      var kq = nvnsGhiHoSo(r);
      if (!kq.ok) { alert("Không duyệt được: " + kq.msg); return false; }
      msgOk = kq.msg;
      return nvnsDoiRaw(r, "Đã duyệt", { "Người duyệt": currentUser(), "Ngày duyệt": HRM.today(), "Đã ghi vào hồ sơ": kq.msg });
    });
    if (!done) { render(); return; }
    render(); toast(msgOk);
  }
  function tabNghiepVuNS() {
    var w = h("div"), card = h("div", { class: "card" }), bar = h("div", { class: "bar" });
    // Cấp phát sữa / bảo hộ có một nơi duy nhất (tab Cấp phát); lối cũ chuyển về danh sách chung với bộ lọc Sữa phúc lợi.
    bar.appendChild(btn("Cấp phát sữa phúc lợi", "", function () { cpGoto("milk"); }, "Mở danh sách phiếu cấp phát với bộ lọc Sữa phúc lợi"));
    bar.appendChild(btn("Cấp phát bảo hộ lao động", "", function () { cpGoto("ppe"); }));
    var F = st.nvf = st.nvf || { q: "", loai: "", tt: "", tu: "", den: "" };
    var kb = SFC.periodBounds(kyStr()) || ["", ""]; // Từ–Đến mặc định = ngày đầu và cuối của kỳ lương đang chọn; người dùng sửa tay thì giữ nguyên
    if (!F.tuManual) F.tu = kb[0]; if (!F.denManual) F.den = kb[1];
    var q = h("input", { class: "i", placeholder: "🔍 Tìm mã / tên nhân viên, mã phiếu (không cần dấu)", value: F.q, style: "min-width:260px", "aria-label": "Tìm nhân viên" });
    var sel = function (key, lab, opts) { var e = h("select", { "aria-label": lab }); e.appendChild(h("option", { value: "", text: lab + ": tất cả" })); opts.forEach(function (o) { e.appendChild(h("option", { value: o, text: o })); }); e.value = F[key]; e.addEventListener("change", function () { F[key] = e.value; render(); }); return e; };
    var dt = function (key, lab) { var e = dateField(F[key], { "aria-label": lab, title: lab }); e.addEventListener("change", function () { var iv = dateIso(e); if (iv === null) { toast("⚠ Ngày không hợp lệ — nhập dd/MM/yyyy"); return; } F[key] = iv; F[key + "Manual"] = true; render(); }); return e; };
    q.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { F.q = q.value; render(); } }); q.addEventListener("change", function () { F.q = q.value; render(); });
    if (can("hr.edit")) bar.appendChild(btn("＋ Lập đề nghị", "pri", function () { nvnsForm(null); }));
    bar.appendChild(q); bar.appendChild(sel("loai", "Loại", NVNS_LOAI)); bar.appendChild(sel("tt", "Trạng thái", ["Nháp", "Chờ duyệt", "Đã duyệt", "Từ chối"]));
    bar.appendChild(h("label", { text: "Từ" })); bar.appendChild(dt("tu", "Từ ngày")); bar.appendChild(h("label", { text: "đến" })); bar.appendChild(dt("den", "Đến ngày"));
    bar.appendChild(btn("Đặt lại", "", function () { st.nvf = null; render(); }));
    card.appendChild(bar);
    var qf = fold(F.q);
    var rows = (db.nghiepvu_nhansu || []).filter(function (r) {
      if (F.loai && r["Loại nghiệp vụ"] !== F.loai) return false; if (F.tt && r["Trạng thái"] !== F.tt) return false;
      if (F.tu && String(r["Từ ngày"] || "") < F.tu) return false; if (F.den && String(r["Từ ngày"] || "") > F.den) return false;
      return !qf || fold(r["Mã NV"] + " " + nvnsTen(r["Mã NV"]) + " " + r["Mã phiếu"]).indexOf(qf) >= 0;
    }).sort(function (a, b) { return String(b["Từ ngày"] || "") < String(a["Từ ngày"] || "") ? -1 : 1; });
    var out = rows.map(function (r) { return { "Mã phiếu": r["Mã phiếu"], "Mã NV": r["Mã NV"], "Họ và tên": nvnsTen(r["Mã NV"]), "Loại nghiệp vụ": r["Loại nghiệp vụ"], "Từ ngày": fmtDate(r["Từ ngày"]), "Đến ngày": fmtDate(r["Đến ngày"]), "Số ngày": r["Số ngày"] || "", "Lý do": r["Lý do"] || "", "Trạng thái": r["Trạng thái"], "Người đề nghị": r["Người đề nghị"] || "", "Người duyệt": r["Người duyệt"] || "", "Ngày duyệt": fmtDate(r["Ngày duyệt"]), "Ghi vào hồ sơ": r["Đã ghi vào hồ sơ"] || "" }; });
    var cols = ["Mã phiếu", "Mã NV", "Họ và tên", "Loại nghiệp vụ", "Từ ngày", "Đến ngày", "Số ngày", "Lý do", "Trạng thái", "Người đề nghị", "Người duyệt", "Ngày duyệt", "Ghi vào hồ sơ"];
    var tools = h("div", { class: "bar noprint" });
    tools.appendChild(h("span", { class: "hint", style: "margin:0", text: rows.length + " phiếu" }));
    tools.appendChild(h("span", { class: "sp" }));
    tools.appendChild(btn("⬇ Excel", "", function () { saveXlsx("NghiepVuNhanSu.xlsx", [{ name: "Nghiep vu nhan su", cols: cols, rows: out }]); }));
    tools.appendChild(btn("⬇ PDF", "", function () { exportSheetsPdf({ title: "BÁO CÁO NGHIỆP VỤ NHÂN SỰ", ky: (F.tu || F.den) ? "Từ " + (F.tu ? fmtDate(F.tu) : "…") + " đến " + (F.den ? fmtDate(F.den) : "…") : "Tất cả thời gian", sheets: [{ name: "Nghiệp vụ nhân sự", rows: out }] }, "NghiepVuNhanSu.pdf"); }));
    tools.appendChild(btn("🖨 In", "", function () { if (!need("export", "in")) return; window.print(); }));
    card.appendChild(tools);
    var t = h("table", { class: "nvns" }), hr = h("tr");
    cols.concat([""]).forEach(function (c) { hr.appendChild(h("th", { text: c })); }); t.appendChild(h("thead", {}, [hr]));
    var tb = h("tbody");
    rows.forEach(function (r, i) {
      var tr = h("tr", { "data-nvns": r["Mã phiếu"] });
      cols.forEach(function (c) { var v = out[i][c]; tr.appendChild(h("td", { class: "t", text: v == null ? "" : v })); });
      var act = h("td", { class: "t noprint", style: "white-space:nowrap" }), tt = r["Trạng thái"];
      if (can("hr.edit") && tt === "Nháp") { act.appendChild(btn("Sửa", "", function () { nvnsForm(r); })); act.appendChild(btn("Gửi duyệt", "pri", function () { if (nvnsDoi(r, "Chờ duyệt")) { save(); render(); toast("Đã gửi duyệt " + r["Mã phiếu"]); } })); act.appendChild(btn("✕", "red ghost", function () { if (!confirm("Xóa nháp " + r["Mã phiếu"] + "?")) return; if (commit(REPO.plan("remove", "nghiepvu_nhansu", r, null, { what: "xóa đề nghị nháp" }), { action: "Xóa đề nghị nhân sự nháp" })) { save(); render(); } }, "Xóa nháp")); }
      if (tt === "Chờ duyệt" && can("hr.approve")) {
        if (can("hr.edit")) act.appendChild(btn("Duyệt", "pri", function () { nvnsDuyet(r); }));
        else act.appendChild(h("span", { class: "hint", text: "Cần người có quyền ghi hồ sơ" }));
        act.appendChild(btn("Từ chối", "red", function () { if (!need("hr.approve", "từ chối nghiệp vụ nhân sự")) return; askText("Từ chối " + r["Mã phiếu"], "Phiếu chuyển sang 'Từ chối', không ghi vào hồ sơ.", { label: "Lý do từ chối", required: true, multiline: true, okText: "Từ chối" }, function (ly) { if (nvnsDoi(r, "Từ chối", { "Người duyệt": currentUser(), "Ngày duyệt": HRM.today(), "Lý do từ chối": ly })) { save(); render(); toast("Đã từ chối " + r["Mã phiếu"]); } }); }));
      }
      act.appendChild(btn("Lịch sử", "ghost", function () {
        var hist = (db.auditlog || []).filter(function (a) { return ((a.chiTiet || "") + (a.thaoTac || "")).indexOf(r["Mã phiếu"]) >= 0 || /nhân sự/i.test(a.thaoTac || "") && ((a.chiTiet || "").indexOf(r["Mã NV"]) >= 0); }).slice(-30).reverse();
        var b = h("div"); b.appendChild(hist.length ? simpleTable(hist.map(function (a) { return { "Thời điểm": fmtTime(a.luc || ""), "Người": a.nguoi || "", "Thao tác": a.thaoTac || "", "Chi tiết": a.chiTiet || "" }; })) : h("div", { class: "empty", text: "Chưa có lịch sử." }));
        modal("Lịch sử phiếu " + r["Mã phiếu"], b, function (close) { return [btn("Đóng", "", close)]; }, { wide: true });
      }));
      tr.appendChild(act); tb.appendChild(tr);
    });
    t.appendChild(tb);
    card.appendChild(rows.length ? h("div", { class: "tw" }, [t]) : h("div", { class: "empty", text: "Chưa có phiếu nghiệp vụ nhân sự nào khớp bộ lọc." }));
    card.appendChild(h("div", { class: "hint", text: "Quy trình: Nháp → Chờ duyệt → Đã duyệt / Từ chối. Chỉ khi Đã duyệt hệ thống mới ghi vào hồ sơ (nghỉ phép/ốm → Nghỉ phép/Nghỉ ốm của hợp đồng hiện hành; nghỉ việc → ngày chấm dứt hợp đồng; điều chuyển/đổi chức vụ → Quá trình công tác và phụ lục lương theo ngày hiệu lực). Người đề nghị không tự duyệt phiếu của mình (trừ Admin)." }));
    w.appendChild(card); return w;
  }

  // ---------- Cài đặt (V10): công thức lương + phương pháp bù sản lượng — KHÔNG nằm trong Danh mục ----------
  var DM_CAI_DAT = { dm_congthuc: 1, dm_quychebu: 1, dm_congthuc_kiemthu: 1 };
  /** Mô tả 2 phương pháp bù sản lượng chính thức (V10). Mã lưu giữ nguyên "to" / "daihiep" để không đổi engine. */
  var BU_METHODS = [
    { ma: "to", ten: "BÙ THEO ĐƠN GIÁ BÌNH QUÂN TỔ CỐ ĐỊNH NGÀY CÔNG THÁNG",
      nguon: ["Đơn giá khoán (đ/tấn): Danh mục → Mã lương, cột “Số tiền khoán” của mã lương gán cho từng nhân viên.", "Mức sàn: Danh mục → Mã lương, cột “Đơn giá bù lương” — MỖI MÃ LƯƠNG MỘT MỨC, lấy theo mã lương của nhân viên (đồng/công BT). Để trống hoặc 0 thì không bù.", "Ngưỡng công: Danh mục → Mã lương, cột “Ngưỡng công bù theo tổ”.", "Công BT: màn hình Chấm công. Tấn: màn hình Sản lượng. Tổ: phòng ban/tổ của nhân viên."],
      mota: "Tính bình quân tiền sản lượng của cả tổ mỗi người mỗi ngày; nếu thấp hơn mức sàn thì người đủ ngưỡng công được bù phần chênh × công BT.",
      buoc: ["Tiền sản lượng cả tổ = Σ(tấn × đơn giá khoán) của người hưởng lương sản phẩm trong tổ.", "Bình quân tổ = Tiền sản lượng cả tổ ÷ số ngày của tháng ÷ số người hưởng lương SP của tổ có công BT trong tháng > 0.", "Điều kiện bù: công BT của người ≥ 'Ngưỡng công bù theo tổ' và Bình quân tổ < 'Đơn giá bù lương' (mức sàn, lấy ở Danh mục → Mã lương — xem mục “Số liệu lấy từ đâu”).", "Tiền bù = (Mức sàn − Bình quân tổ) × công BT của người."],
      vd: function () { var tien = 31000000, ngay = 31, nguoi = 10, bq = tien / ngay / nguoi, san = 150000, cong = 26; return { dong: ["Tiền sản lượng cả tổ: " + fmt(tien) + " đ · tháng " + ngay + " ngày · tổ " + nguoi + " người", "Bình quân tổ = " + fmt(tien) + " ÷ " + ngay + " ÷ " + nguoi + " = " + fmt(Math.round(bq)) + " đ/người/ngày", "Mức sàn " + fmt(san) + " đ > bình quân → được bù", "Tiền bù = (" + fmt(san) + " − " + fmt(Math.round(bq)) + ") × " + cong + " công = " + fmt(Math.round((san - bq) * cong)) + " đ"] }; } },
    { ma: "daihiep", ten: "BÙ SẢN LƯỢNG THEO NGÀY",
      nguon: ["Đơn giá khoán (đ/tấn): Danh mục → Mã lương, cột “Số tiền khoán” của mã lương gán cho từng nhân viên.", "Mức sàn: Danh mục → Mã lương, cột “Đơn giá bù lương” — MỖI MÃ LƯƠNG MỘT MỨC, lấy theo mã lương của nhân viên (đồng/công BT). Để trống hoặc 0 thì không bù.", "Bậc thang theo công BT từng ngày: cố định trong hệ thống (không cấu hình ở đây). Công BT và sản lượng theo ngày: màn hình Chấm công và Sản lượng."],
      mota: "Mỗi ngày có sản lượng: tiền ngày = lớn hơn giữa (tấn ngày × đơn giá) và (bậc thang công BT ngày × mức sàn); bù = tổng phần chênh các ngày.",
      buoc: ["Với từng ngày có sản lượng: Tiền sản lượng ngày = tấn ngày × đơn giá khoán.", "Tiền sàn ngày = bậc thang(công BT ngày, chủ nhật?) × Đơn giá bù lương.", "Nếu Tiền sàn ngày > Tiền sản lượng ngày thì ngày đó được bù phần chênh.", "Tiền bù = Σ phần chênh các ngày. Không xét ngưỡng công. Ngày có sản lượng mà chưa chấm công BT → cảnh báo, tính bù 0."],
      vd: function () { var tan = 1.2, dg = 90000, bt = 1, san = 150000; return { dong: ["Ngày 05: " + tan + " tấn × " + fmt(dg) + " đ = " + fmt(Math.round(tan * dg)) + " đ · công BT ngày = " + bt, "Tiền sàn ngày = bậc thang(" + bt + ") × " + fmt(san) + " = " + fmt(san) + " đ", "Bù ngày 05 = " + fmt(san) + " − " + fmt(Math.round(tan * dg)) + " = " + fmt(san - Math.round(tan * dg)) + " đ", "Cộng dồn các ngày khác trong tháng → Tiền bù cả tháng."] }; } }
  ];
  function buMethodOf(ma) { return BU_METHODS.filter(function (m) { return m.ma === String(ma); })[0] || null; }
  function xemCachTinhBu(m) {
    var body = h("div", { class: "bu-explain" });
    body.appendChild(h("p", { text: m.mota }));
    var ol = h("ol"); m.buoc.forEach(function (x) { ol.appendChild(h("li", { text: x })); }); body.appendChild(ol);
    body.appendChild(h("div", { class: "hint", text: "Số liệu lấy từ đâu:" }));
    var ul0 = h("ul"); (m.nguon || []).forEach(function (x) { ul0.appendChild(h("li", { text: x })); }); body.appendChild(ul0);
    body.appendChild(h("div", { class: "hint", text: "Ví dụ bằng số:" }));
    var ul = h("ul"); m.vd().dong.forEach(function (x) { ul.appendChild(h("li", { text: x })); }); body.appendChild(ul);
    body.appendChild(h("div", { class: "hint", text: "Số liệu trong ví dụ chỉ minh hoạ. Số thật lấy từ Chấm công, Sản lượng và Danh mục hình thức lương của từng nhân viên." }));
    modal("Xem cách tính — " + m.ten, body, function (close) { return [btn("Đóng", "", close)]; });
  }
  /** Bản đang HIỆU LỰC của kỳ đang chọn (lưu nội bộ trong dm_quychebu — không còn là danh mục để người dùng sửa tay). */
  function buChinhThucPanel() {
    var w = h("div", { class: "card" }), cur = E.quyCheBuChinhThuc(db.dm_quychebu, st.nam, st.thang);
    w.appendChild(h("h3", { text: "Phương pháp bù sản lượng" }));
    w.appendChild(h("div", { class: "hint", text: "Chỉ có 2 phương pháp. Phương pháp chính thức được áp dụng khi chốt kỳ; bảng lương đã chốt giữ nguyên số liệu của kỳ đó." }));
    var curMa = cur ? String(cur["Cách bù"]) : "";
    if (cur && !buMethodOf(curMa)) w.appendChild(h("div", { class: "warn", text: "⚠ Cấu hình cũ '" + curMa + "' không còn thuộc 2 phương pháp chuẩn. Hãy chọn lại một trong hai phương pháp bên dưới (kỳ đã chốt không bị ảnh hưởng)." }));
    else if (!cur) w.appendChild(h("div", { class: "warn", text: "⚠ Kỳ " + st.thang + "/" + st.nam + " chưa có phương pháp bù chính thức. Kỳ có sản lượng cần bù sẽ không chốt được cho đến khi chọn." }));
    BU_METHODS.forEach(function (m) {
      var on = curMa === m.ma;
      var row = h("div", { class: "bu-method" + (on ? " on" : ""), style: "border:1px solid var(--line,#ccc);border-radius:8px;padding:10px;margin:8px 0" }, [
        h("div", { html: "<b>" + esc(m.ten) + "</b>" + (on ? " — <span class=\"ok\">đang áp dụng chính thức</span>" : "") }),
        h("div", { class: "hint", text: m.mota })
      ]);
      var bar = h("div", { class: "bar", style: "margin:6px 0 0" });
      bar.appendChild(btn("Xem cách tính", "", function () { xemCachTinhBu(m); }));
      if (!on) bar.appendChild(btn("Áp dụng từ kỳ " + st.thang + "/" + st.nam, "pri", function () { datBuChinhThuc(m); }));
      row.appendChild(bar); w.appendChild(row);
    });
    return w;
  }
  function datBuChinhThuc(m) {
    if (!need("dm.edit", "đổi phương pháp bù sản lượng")) return;
    if (kyChot(kyStr())) { alert("Kỳ " + kyLabel(kyStr()) + " đã chốt — không đổi phương pháp. Mở chốt nếu cần tính lại."); return; }
    askText("Áp dụng " + m.ten, "Từ kỳ " + st.thang + "/" + st.nam + " trở đi. Các kỳ đã chốt trước đó giữ nguyên.", { label: "Lý do / người duyệt", required: true, multiline: true, okText: "Áp dụng" }, function (reason) {
      var tu = st.nam + "-" + ("0" + st.thang).slice(-2) + "-01", truoc = new Date(st.nam, st.thang - 1, 0), den = truoc.getFullYear() + "-" + ("0" + (truoc.getMonth() + 1)).slice(-2) + "-" + ("0" + truoc.getDate()).slice(-2);
      var vals = { "Hiệu lực từ": tu, "Hiệu lực đến": "", "Cách bù": m.ma, "Trạng thái": "Hiệu lực", "Người phê duyệt": currentUser(), "Mô tả": reason };
      var cungKy = db.dm_quychebu.filter(function (r) { return r["Trạng thái"] === "Hiệu lực" && String(r["Hiệu lực từ"] || "") === tu; })[0];
      var ok = true;
      db.dm_quychebu.forEach(function (r) { if (ok && r["Trạng thái"] === "Hiệu lực" && String(r["Hiệu lực từ"] || "") < tu && !r["Hiệu lực đến"]) ok = !!commit(REPO.plan("update", "dm_quychebu", r, { "Hiệu lực đến": den }, { what: "kết thúc phương pháp bù cũ" }), { action: "Cài đặt — kết thúc phương pháp bù cũ" }); });
      if (ok) ok = !!(cungKy ? commit(REPO.plan("update", "dm_quychebu", cungKy, vals, { what: "phương pháp bù sản lượng" }), { action: "Cài đặt — đổi phương pháp bù sản lượng" }) : commit(REPO.plan("insert", "dm_quychebu", null, vals, { what: "phương pháp bù sản lượng" }), { action: "Cài đặt — phương pháp bù sản lượng" }));
      if (!ok) return;
      st.bu = m.ma; saveUi(); audit("Đổi phương pháp bù sản lượng", m.ten + " từ " + tu + " — " + reason); st.kq = null; render(); toast("Đã áp dụng: " + m.ten);
    });
  }
  function tabCaiDat() {
    var w = h("div"), bar = h("div", { class: "bar" });
    var SUBS = [["ct", "Công thức lương / tăng ca / phụ cấp / hỗ trợ"], ["bu", "Phương pháp bù sản lượng"], ["qc", "Quy chế tính lương"], ["workflow", "Chế độ sử dụng"]];
    if (!st.cd) st.cd = "ct";
    SUBS.forEach(function (x) { bar.appendChild(btn(x[1], st.cd === x[0] ? "pri" : "", function () { if (st.cd !== x[0] && !leaveOk()) return; st.cd = x[0]; render(); })); });
    w.appendChild(bar);
    if (st.cd === "bu") w.appendChild(buChinhThucPanel());
    else if (st.cd === "workflow") {
      var panel = h("div", { class: "card" }), mode = C.workflowApproval.mode(db);
      panel.appendChild(h("h3", { text: "Chế độ sử dụng" }));
      panel.appendChild(h("p", { class: "hint", text: mode === "roles" ? "Đang sử dụng phân quyền. Bảng lương và chứng từ chi cần người duyệt khác người lập." :
        mode === "single" ? "Một người sử dụng. Quản trị có thể chốt kỳ và tự duyệt chứng từ do mình lập." : "Đang dùng quy trình hiện có. Quản trị có thể chọn chế độ phù hợp." }));
      if (can("system.admin")) {
        var notReady = C.workflowApproval.readiness(db);
        if (notReady) panel.appendChild(h("p", { class: "warn", text: notReady }));
      }
      if (can("system.admin")) [["single", "Một người sử dụng"], ["roles", "Sử dụng phân quyền"]].forEach(function (option) {
        if (option[0] === mode) return;
        panel.appendChild(btn(option[1], "", function () {
          if (option[0] === "roles") {
            var error = C.workflowApproval.readiness(db);
            if (error) { alert(error); return; }
          }
          askText(option[1], "Thay đổi áp dụng cho các kỳ chưa chốt và chứng từ chưa duyệt.", { label: "Lý do thay đổi", required: true }, function (reason) {
            reason = String(reason || "").trim();
            if (!reason || !need("system.admin")) { if (!reason) alert("Cần nhập lý do thay đổi."); return; }
            if (!saveNow()) { alert(lastSaveError); return; }
            if (!txn(["workflowSettings"], function () {
              db.workflowSettings = [{ mode: option[0], reason: reason, user: C.workflowApproval.account(session.tenDangNhap), changedAt: new Date().toISOString() }];
              audit("Đổi chế độ sử dụng", option[1] + " · " + reason);
            })) { alert(lastTxnError); return; }
            render();
          });
        }));
      });
      w.appendChild(panel);
    } else if (st.cd === "qc") {
      var c = h("div", { class: "card" }); c.appendChild(h("h3", { text: "Quy chế tính lương" }));
      c.appendChild(h("div", { class: "hint", text: "Quy chế đang áp dụng: " + qcLabel(quyChe()) + ". Đổi tại màn hình Tính lương theo kỳ; kỳ đã chốt giữ nguyên." })); w.appendChild(c);
    } else w.appendChild(congThucPanel());
    return w;
  }

  // ---------- Thuế TNCN cha–con (V9.2): DM_TNCN → DM_TNCN_BIEUTHUE ----------
  function thueBo(ma, tu) { return db.dm_bacthue.filter(function (r) { return r["Mã thuế TNCN"] === ma && String(r["Hiệu lực từ"] || "") === String(tu || ""); }); }
  /** Master–Detail dạng cửa sổ: DM_TNCN (cha) → DM_TNCN_BIEUTHUE (con). Mã thuế & hiệu lực tự gán theo bảng cha. */
  function thueChiTietModal(cha) {
    var ma = cha["Mã thuế TNCN"], tu = cha["Hiệu lực từ"] || "";
    var childDef = Object.assign({}, DM.dm_bacthue, { ten: "Biểu thuế mã " + ma + " · hiệu lực từ " + (tu || "—"), def: { "Mã thuế TNCN": ma, "Hiệu lực từ": tu, "Trạng thái": cha["Trạng thái"] || "Hiệu lực" },
      rowFilter: function (r) { return r["Mã thuế TNCN"] === ma && String(r["Hiệu lực từ"] || "") === tu; } });
    var body = h("div", { "data-tax-child": ma });
    body.appendChild(h("div", { class: "hint", text: "Cha: mã " + ma + " · " + (cha["Nội dung"] || "") + " · hiệu lực từ " + (tu || "—") + " · " + (cha["Trạng thái"] || "Hiệu lực") + ". Các bậc bên dưới tự gắn mã thuế và ngày hiệu lực của bảng cha, không cần nhập lại." }));
    body.appendChild(grid("dm_bacthue", childDef));
    modal("Biểu thuế TNCN — mã " + ma, body, function (close) { return [btn("Đóng", "pri", close)]; }, { wide: true, onClose: function () { render(); } });
  }
  function thuePanel() {
    var w = h("div"), codes = [];
    db.dm_tncn.filter(thueIsCha).forEach(function (r) { if (codes.indexOf(r["Mã thuế TNCN"]) < 0) codes.push(r["Mã thuế TNCN"]); });
    if (!st.thueMa || codes.indexOf(st.thueMa) < 0) st.thueMa = codes[0] || "";
    var note = h("div", { class: "hint", text: "Cấu trúc cha–con: chọn mã thuế ở bảng cha, biểu thuế (các bậc) của mã đó hiện ở bảng con bên dưới. HĐLĐ/phụ lục tham chiếu Mã thuế TNCN; bảng lương tự lấy biểu thuế hiệu lực đúng kỳ và khấu trừ vào thực lĩnh theo kết quả công thức. Thiếu mã/biểu thuế → TAX_CONFIG_ERROR, chặn chốt và xuất bảng lương." });
    w.appendChild(note);
    w.appendChild(grid("dm_tncn", DM.dm_tncn));
    var card = h("div", { class: "card" }), bar = h("div", { class: "bar" });
    var sel = h("select", { "aria-label": "Mã thuế TNCN" });
    codes.forEach(function (c) { sel.appendChild(h("option", { value: c, text: c })); }); sel.value = st.thueMa;
    sel.addEventListener("change", function () { st.thueMa = sel.value; render(); });
    bar.appendChild(h("b", { text: "Biểu thuế của mã: " })); bar.appendChild(sel); bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("✔ Kiểm tra cấu hình thuế", "", function () {
      var rs = TCFG.check(db), body = h("div");
      body.appendChild(h("div", { class: rs.length ? "warn" : "ok", text: rs.length ? rs.length + " vấn đề trong cấu hình thuế TNCN (cha–con)." : "Cấu hình thuế hợp lệ: không chồng/hở bậc, mã cha–con khớp nhau." }));
      if (rs.length) body.appendChild(simpleTable(rs.map(function (x) { return { "Mức": x.level, "Nội dung": x.msg }; })));
      modal("Kiểm tra cấu hình thuế TNCN", body, function (close) { return [btn("Đóng", "", close)]; });
    }));
    bar.appendChild(btn("📐 Thử tính thuế", "", function () {
      var inp = h("input", { class: "i", value: "20000000", style: "width:200px" }), out = h("div", { style: "margin-top:10px" });
      var body = h("div", {}, [h("div", { class: "hint", text: "Nhập thu nhập TÍNH THUẾ (sau các khoản giảm trừ) để xem thuế theo mã " + st.thueMa + " ở kỳ " + st.thang + "/" + st.nam + ". Chỉ tính thử — không ghi dữ liệu." }),
        h("div", { class: "fld" }, [h("label", { text: "Thu nhập tính thuế (đ)" }), inp]), out]);
      var calc = function () {
        out.innerHTML = ""; var tn = VAL.parseMoney(inp.value);
        if (isNaN(tn) || tn < 0) { out.appendChild(h("div", { class: "warn", text: "Số tiền không hợp lệ" })); return; }
        var t = E.thuThuTNCN(db, st.thueMa, st.nam, st.thang, tn);
        if (!t.ok) { out.appendChild(h("div", { class: "warn", text: "TAX_CONFIG_ERROR — " + t.loi })); return; }
        out.appendChild(h("div", { class: "ok", text: "Thuế TNCN = " + fmt(t.thue) + " đ · Phương pháp " + t.phuongPhap }));
        if (t.bieu) out.appendChild(simpleTable(t.bieu.map(function (b) { return { "Bậc": b["Bậc"], "Từ": E.money(b["Thu nhập từ"]), "Đến": E.money(b["Thu nhập đến"]) || "không giới hạn", "Thuế suất": E.pct(b["Tỷ lệ"]) * 100 + "%", "Trừ nhanh": E.money(b["Trừ nhanh"]) }; })));
      };
      inp.addEventListener("input", calc); calc();
      modal("Thử tính thuế TNCN", body, function (close) { return [btn("Đóng", "", close)]; });
    }));
    card.appendChild(bar);
    // Danh sách phiên bản của mã đang chọn + thao tác
    var vers = db.dm_tncn.filter(function (r) { return thueIsCha(r) && r["Mã thuế TNCN"] === st.thueMa; })
      .sort(function (a, b) { return String(a["Hiệu lực từ"] || "") < String(b["Hiệu lực từ"] || "") ? 1 : -1; });
    var can2 = can("dm.edit");
    var vt = h("table"), vh = h("tr");
    ["Hiệu lực từ", "Hiệu lực đến", "Phương pháp", "Trạng thái", "Số bậc", ""].forEach(function (x) { vh.appendChild(h("th", { text: x })); });
    vt.appendChild(h("thead", {}, [vh]));
    var vb = h("tbody");
    var setTT = function (r, tt) {
      if (!need("dm.edit")) return;
      if (tt === "Hiệu lực") {
        var pbl = TCFG.check(db).filter(function (x) { return x.level === "High" && x.msg.indexOf(st.thueMa) >= 0; });
        if (pbl.length) { alert("Không duyệt được — cấu hình mã " + st.thueMa + " còn lỗi:\n" + pbl.slice(0, 6).map(function (x) { return "• " + x.msg; }).join("\n")); return; }
      }
      var rows = [r].concat(thueBo(r["Mã thuế TNCN"], r["Hiệu lực từ"]));
      for (var i = 0; i < rows.length; i++) {
        var tbl = i === 0 ? "dm_tncn" : "dm_bacthue", pl = REPO.plan("update", tbl, rows[i], { "Trạng thái": tt }, { what: "đổi trạng thái biểu thuế" });
        if (!commit(pl, { confirm: true, action: "Thuế TNCN — " + tt + " " + r["Mã thuế TNCN"] + " từ " + (r["Hiệu lực từ"] || "") })) return;
      }
      save(); render(); toast("Đã chuyển mã " + r["Mã thuế TNCN"] + " (từ " + (r["Hiệu lực từ"] || "") + ") sang '" + tt + "'");
    };
    var copyVer = function (r) {
      if (!need("dm.edit")) return;
      askText("Sao chép phiên bản biểu thuế", "Tạo bản NHÁP của mã " + r["Mã thuế TNCN"] + " (kèm toàn bộ bậc) với ngày hiệu lực mới. Bản nháp chưa được dùng để tính lương cho đến khi duyệt.", { label: "Hiệu lực từ (YYYY-MM-DD)", required: true, pattern: /^\d{4}-\d{2}-\d{2}$/, patternMsg: "Nhập ngày dạng 2027-01-01", okText: "Sao chép" }, function (d) {
        var cha = Object.assign({}, r, { "Hiệu lực từ": d, "Hiệu lực đến": "", "Trạng thái": "Nháp" }); delete cha._id;
        if (!commit(REPO.plan("insert", "dm_tncn", null, cha, { what: "sao chép phiên bản thuế" }), { action: "Thuế TNCN — sao chép phiên bản " + r["Mã thuế TNCN"] + " → " + d })) return;
        thueBo(r["Mã thuế TNCN"], r["Hiệu lực từ"]).forEach(function (b) { var c = Object.assign({}, b, { "Hiệu lực từ": d, "Hiệu lực đến": "", "Trạng thái": "Nháp" }); delete c._id; commit(REPO.plan("insert", "dm_bacthue", null, c, { what: "sao chép bậc thuế" }), { audit: false }); });
        save(); render(); toast("Đã tạo bản nháp từ " + d);
      });
    };
    vers.forEach(function (r) {
      var tr = h("tr"); tr.appendChild(h("td", { class: "t", text: r["Hiệu lực từ"] || "" })); tr.appendChild(h("td", { class: "t", text: r["Hiệu lực đến"] || "" }));
      tr.appendChild(h("td", { class: "t", text: r["Phương pháp"] || "(theo Nội dung: " + (r["Nội dung"] || "") + ")" })); tr.appendChild(h("td", { class: "t", text: r["Trạng thái"] || "Hiệu lực" }));
      tr.appendChild(h("td", { class: "r", text: String(thueBo(r["Mã thuế TNCN"], r["Hiệu lực từ"]).length) }));
      var act = h("td", { class: "t" });
      if (can2) {
        if (/^nh[áa]p/i.test(r["Trạng thái"] || "")) act.appendChild(btn("Duyệt", "pri", function () { setTT(r, "Hiệu lực"); }));
        else if (!/^ng[ừu]ng/i.test(r["Trạng thái"] || "")) act.appendChild(btn("Ngừng", "", function () { setTT(r, "Ngừng"); }));
        act.appendChild(btn("Sao chép", "", function () { copyVer(r); }));
      }
      act.appendChild(btn("Chi tiết", "", function () { if (!leaveOk()) return; thueChiTietModal(r); }, "Mở biểu thuế (các bậc) của đúng phiên bản này trong cửa sổ cha–con"));
      tr.appendChild(act); vb.appendChild(tr);
    });
    vt.appendChild(vb);
    if (vers.length) card.appendChild(h("div", { class: "tw" }, [vt])); else card.appendChild(h("div", { class: "empty", text: "Chưa có mã thuế nào ở bảng cha. Thêm dòng ở bảng trên." }));
    w.appendChild(card);
    if (st.thueMa) w.appendChild(h("div", { class: "hint", text: "Bấm 'Chi tiết' ở một phiên bản phía trên để xem và sửa các bậc thuế của đúng phiên bản đó (cửa sổ cha–con)." }));
    // Lịch sử thay đổi (nhật ký) liên quan mã đang chọn
    var hist = (db.auditlog || []).filter(function (a) { return /Thuế TNCN|biểu thuế|dm_tncn|dm_bacthue/i.test((a.thaoTac || "") + " " + (a.chiTiet || "")) && ((a.chiTiet || "") + (a.thaoTac || "")).indexOf(st.thueMa) >= 0; }).slice(-15).reverse();
    if (hist.length) { var hc = h("div", { class: "card" }); hc.appendChild(h("h3", { text: "Lịch sử thay đổi mã " + st.thueMa })); hc.appendChild(simpleTable(hist.map(function (a) { return { "Thời điểm": fmtTime(a.luc || ""), "Người": a.nguoi || "", "Thao tác": a.thaoTac || "", "Chi tiết": a.chiTiet || "" }; }))); w.appendChild(hc); }
    return w;
  }

  // ---------- Công thức tiền lương — Formula management UI (Master Prompt mục VII) ----------
  var CT_LOAI = [["OVERTIME", "Tăng ca"], ["ALLOWANCE", "Phụ cấp"], ["SUPPORT", "Hỗ trợ"]];
  function ctLoaiTen(v) { var o = CT_LOAI.filter(function (x) { return x[0] === v; })[0]; return o ? o[1] : (v || ""); }
  var CT_SUBTABS = [["wz", "Trình thiết lập công thức"], ["tangca", "Tăng ca"], ["phucap", "Phụ cấp"], ["hotro", "Hỗ trợ"], ["vars", "Thư viện biến"], ["mau", "Mẫu công thức"], ["test", "Kiểm tra công thức"], ["lichsu", "Lịch sử phiên bản"]];
  var CT_SUBTAB_LOAI = { tangca: "OVERTIME", phucap: "ALLOWANCE", hotro: "SUPPORT" };
  function congThucPanel() {
    var w = h("div"), bar2 = h("div", { class: "bar sub" });
    st.ct = st.ct || "wz";
    CT_SUBTABS.forEach(function (t) { bar2.appendChild(btn(t[1], st.ct === t[0] ? "pri" : "", function () { st.ct = t[0]; render(); })); });
    w.appendChild(bar2);
    var loai = CT_SUBTAB_LOAI[st.ct];
    if (loai) w.appendChild(ctLibraryPanel(loai));
 else if (st.ct === "wz") w.appendChild(ctWizardPanel());
    else if (st.ct === "vars") w.appendChild(ctVarsPanel());
    else if (st.ct === "mau") w.appendChild(ctTemplatesPanel());
    else if (st.ct === "test") w.appendChild(ctTestPanel());
    else if (st.ct === "lichsu") w.appendChild(ctHistoryPanel());
    return w;
  }
  /** Trình thiết lập công thức (V10): chọn loại → chọn mẫu → nhập số mẫu để xem giải thích bằng số thật → lưu Nháp (qua REPO, vẫn phải duyệt/kích hoạt). */
  var WZ_SAMPLE = { CONG_CHUAN: 26, CONG_TINH_LUONG: 28, CONG_TC: 2, CONG_LE: 0, CONG_PHEP: 0, CONG_TRUNG_CHUYEN: 0, CONG_DI_CHUYEN: 0, CONG_CHU_NHAT: 1, CONG_CHUAN_2: 0, HE_SO_TC: 1.5, MUC_PHU_CAP: 500000, NGUONG_PHU_CAP: 2, CONG_HUONG_PHU_CAP: 24, SO_NGAY_DUOC_HUONG: 10, MUC_HO_TRO: 50000, CONG_THUC_TE: 24, SO_XE_HOP_LE: 8, DON_GIA_HO_TRO: 20000 };
  function ctWizardPanel() {
    var Wz = st.ctWz = st.ctWz || { loai: "OVERTIME", mau: -1, vars: {}, ma: "", ten: "", tu: "" };
    var box = h("div", { class: "card", "data-ct-wizard": "1" });
    box.appendChild(h("div", { class: "hint", text: "Tạo công thức mới: (1) chọn loại, (2) viết biểu thức — muốn có sẵn khung thì chọn “Điền sẵn từ mẫu”, KHÔNG bắt buộc, (3) nhập số ví dụ để thử, (4) đặt mã/tên và lưu Nháp. Công thức lưu ở trạng thái Nháp, vẫn phải Gửi duyệt → Duyệt → Kích hoạt; kỳ lương đã chốt không bị đổi. Sau đó ở Danh mục (Tăng ca / Phụ cấp / Hỗ trợ) chỉ cần chọn mã công thức này." }));
    var step = function (n, t) { box.appendChild(h("div", { class: "fh", text: "Bước " + n + " — " + t })); };
    step(1, "Loại công thức");
    var bar = h("div", { class: "bar" });
    CT_LOAI.forEach(function (lo) { bar.appendChild(btn(ctLoaiTen(lo[0]), Wz.loai === lo[0] ? "pri" : "", function () { Wz.loai = lo[0]; Wz.mau = -1; Wz.vars = {}; Wz.expr = null; render(); })); });
    box.appendChild(bar);
    var mau = CT_TEMPLATES.filter(function (x) { return x.loai === Wz.loai && !x.chuaKetNoi; });
    step(2, "Biểu thức công thức");
    var sel = h("select", { "aria-label": "Điền sẵn từ mẫu", style: "max-width:100%" });
    sel.appendChild(h("option", { value: "-1", text: "— Không dùng mẫu: tự viết biểu thức —" }));
    mau.forEach(function (x, i) { sel.appendChild(h("option", { value: i, text: "Điền sẵn từ mẫu: " + x.ten })); }); sel.value = String(Wz.mau);
    sel.addEventListener("change", function () { Wz.mau = +sel.value; Wz.vars = {}; Wz.expr = null; render(); });
    box.appendChild(h("div", { class: "fld" }, [h("label", { text: "Mẫu có sẵn (không bắt buộc)" }), sel]));
    var T = Wz.mau >= 0 && mau[Wz.mau] ? mau[Wz.mau] : { custom: true, ten: "", moTa: "", bieuThuc: "" };
    if (T.moTa) box.appendChild(h("div", { class: "hint", text: T.moTa }));
    var biThuc = Wz.expr != null ? Wz.expr : T.bieuThuc;
    var taE = h("textarea", { rows: 2, "aria-label": "Biểu thức", style: "width:100%;font-family:monospace", "data-ct-wizard-expr": "1" }); taE.value = biThuc;
    taE.addEventListener("change", function () { Wz.expr = taE.value; Wz.vars = {}; render(); });
    box.appendChild(h("div", { class: "fld" }, [h("label", { text: "Biểu thức" }), taE]));
    if (Wz.expr != null && Wz.expr !== T.bieuThuc && T.bieuThuc) box.appendChild(btn("↺ Khôi phục biểu thức của mẫu", "", function () { Wz.expr = null; Wz.vars = {}; render(); }));
    var vrW = FML.validate(biThuc || "");
    if (!biThuc.trim()) { box.appendChild(h("div", { class: "hint", text: "Nhập biểu thức ở ô trên để thử và lưu (VD: ROUND(MUC_PHU_CAP * CONG_HUONG_PHU_CAP / CONG_CHUAN))." })); return box; }
    if (!vrW.ok) { box.appendChild(h("div", { class: "warn", text: "⚠ Biểu thức không hợp lệ: " + vrW.errors.map(function (e) { return e.message; }).join("; ") })); return box; }
    step(3, "Thử bằng số ví dụ");
    var names = ctRefVars(biThuc), ctx = {}, vt = h("table");
    vt.appendChild(h("tr", {}, [h("th", { text: "Biến" }), h("th", { text: "Ý nghĩa" }), h("th", { text: "Số ví dụ" })]));
    names.forEach(function (n) {
      if (Wz.vars[n] === undefined) Wz.vars[n] = WZ_SAMPLE[n] != null ? WZ_SAMPLE[n] : 0;
      ctx[n] = +Wz.vars[n] || 0;
      var inp = h("input", { class: "num", value: Wz.vars[n] });
      inp.addEventListener("change", function () { Wz.vars[n] = E.num(inp.value); render(); });
      vt.appendChild(h("tr", {}, [h("td", { class: "t", html: "<code>" + esc(n) + "</code>" }), h("td", { class: "t", text: (FML.variables.get(n) || {}).label || "" }), h("td", {}, [inp])]));
    });
    box.appendChild(h("div", { class: "tw" }, [vt]));
    var kq = null, loi = null;
    try { kq = Math.round(FML.evaluate(biThuc, ctx)); } catch (e) { loi = e.message; }
    var cuThe = biThuc; names.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (n) { cuThe = cuThe.split(n).join(String(ctx[n])); });
    var ex = h("div", { class: "slip", "data-ct-wizard-explain": "1" });
    ex.appendChild(h("div", { html: "<b>Giải thích bằng số:</b> thay số ví dụ vào công thức:" }));
    ex.appendChild(h("div", { style: "font-family:monospace;word-break:break-all;margin:4px 0", text: cuThe }));
    ex.appendChild(h("div", { html: loi ? "⚠ Lỗi: " + esc(loi) : "<b>Kết quả: " + esc(fmt(kq)) + "</b> (đơn vị: " + (Wz.loai === "OVERTIME" ? "công/tiền tăng ca theo mẫu" : "VND") + ")" }));
    box.appendChild(ex);
    step(4, "Đặt tên và lưu Nháp");
    var f = h("div", { class: "fgrid", style: "align-items:end" });
    var fld = function (lab, ctl, wide) { return h("div", { class: "fld" + (wide ? " wide" : "") }, [h("label", { text: lab }), ctl]); };
    var iMa = h("input", { placeholder: "VD: TC7", value: Wz.ma, "aria-label": "Mã công thức", autocomplete: "off" });
    var iTen = h("input", { placeholder: "Tên công thức", value: Wz.ten || (T.custom ? "" : T.ten), "aria-label": "Tên công thức", autocomplete: "off" });
    var iTu = dateField(Wz.tu, { "aria-label": "Hiệu lực từ", title: "Hiệu lực từ" });
    iMa.addEventListener("change", function () { Wz.ma = iMa.value.trim(); }); iTen.addEventListener("change", function () { Wz.ten = iTen.value; }); iTu.addEventListener("change", function () { Wz.tu = iTu.value; });
    f.appendChild(fld("Mã công thức *", iMa)); f.appendChild(fld("Tên công thức", iTen)); f.appendChild(fld("Hiệu lực từ", iTu));
    f.appendChild(btn("Lưu thành Nháp", "pri", function () {
      Wz.ma = iMa.value.trim(); Wz.ten = iTen.value; Wz.tu = iTu.value;
      if (!Wz.ma) { alert("Nhập Mã công thức."); return; }
      if (loi) { alert("Công thức đang lỗi, chưa lưu được."); return; }
      var tuIso = Wz.tu ? VAL.normDate(Wz.tu) : ""; if (Wz.tu && !tuIso) { alert("Hiệu lực từ không đúng dạng dd/MM/yyyy."); return; }
      var fenv = { can: can, user: session ? session.tenDangNhap : "", db: db };
      var vals = { "Mã công thức": Wz.ma, "Tên công thức": Wz.ten || (T.custom ? Wz.ma : T.ten), "Loại": Wz.loai, "Biểu thức": biThuc, "Hiệu lực từ": tuIso, "Trạng thái": "Nháp", "Phiên bản": FAP.nextVersion(db, Wz.ma, Wz.loai), "Người lập": fenv.user, "Mô tả": T.moTa };
      if (!commit(REPO.plan("insert", "dm_congthuc", null, vals, { what: "tạo công thức từ trình thiết lập" }), { action: "Công thức tiền lương — Tạo Nháp " + Wz.ma })) return;
      save(); toast("Đã lưu công thức " + Wz.ma + " ở trạng thái Nháp. Bước tiếp: Gửi duyệt → Duyệt → Kích hoạt (tab " + ctLoaiTen(Wz.loai) + "), rồi chọn mã công thức này ở Danh mục → cột “Mã công thức”."); st.ctWz = null; render();
    }));
    box.appendChild(f);
    return box;
  }
  /** Tab "Thư viện biến" (mục VII, tab 4) — danh sách biến được khai báo, chỉ xem. */
  function ctVarsPanel() {
    var box = h("div", { class: "card" });
    box.appendChild(h("div", { class: "hint", text: "Tên biến dùng trong ô 'Biểu thức' ở các tab Tăng ca / Phụ cấp / Hỗ trợ. Biến không có trong danh sách này sẽ báo lỗi khi lưu công thức (không âm thầm coi là 0)." }));
    var t = h("table");
    t.appendChild(h("tr", {}, [h("th", { text: "Biến" }), h("th", { text: "Tên" }), h("th", { text: "Đơn vị" }), h("th", { text: "Nguồn" }), h("th", { text: "Diễn giải" })]));
    FML.variables.VARS.forEach(function (v) {
      t.appendChild(h("tr", {}, [h("td", { class: "t", html: "<code>" + esc(v.name) + "</code>" }), h("td", { class: "t", text: v.label }), h("td", { class: "t", text: v.unit }), h("td", { class: "t", style: "color:#6c7a74", text: v.source }), h("td", { class: "t", text: v.desc })]));
    });
    box.appendChild(h("div", { class: "tw" }, [t])); return box;
  }
  /** Tab "Mẫu công thức" (mục VII, tab 5) — công thức có sẵn để copy, transcribe đúng từ switch/case gốc. */
  var CT_TEMPLATES = window.HAKCore.formulaTemplates.TEMPLATES; // V10.2: dữ liệu mẫu ở core/payroll/formula-templates.js

  function ctTemplatesPanel() {
    var box = h("div", { class: "card" });
    box.appendChild(h("div", { class: "hint", text: "Công thức có sẵn để tham khảo / copy vào ô 'Biểu thức' ở tab tương ứng (Tăng ca / Phụ cấp / Hỗ trợ), hoặc dùng ngay ở tab 'Kiểm tra công thức' để chạy thử." }));
    CT_LOAI.forEach(function (lo) {
      box.appendChild(h("div", { class: "fh", text: ctLoaiTen(lo[0]) }));
      CT_TEMPLATES.filter(function (x) { return x.loai === lo[0]; }).forEach(function (x) {
        var card = h("div", { class: "slip", style: "margin-bottom:8px" });
        card.appendChild(h("div", { html: "<b>" + esc(x.ten) + "</b>" }));
        card.appendChild(h("div", { style: "font-family:monospace;background:var(--brandSoft, #eef3e8);padding:6px;border-radius:6px;margin:4px 0;word-break:break-all", text: x.bieuThuc }));
        card.appendChild(h("div", { class: "hint", style: "margin:0", text: x.moTa }));
        box.appendChild(card);
      });
    });
    return box;
  }
  /** Giá trị mặc định của 1 biến, lấy từ danh mục (mã tăng ca/phụ cấp/hỗ trợ cùng mã công thức) nếu có,
   * không thì lấy từ dữ liệu đã tính của 1 nhân viên/kỳ cụ thể (_ct — không tính lại), còn lại = nhập tay. */
  function ctVarFromCode(name, loai, ma, nam, thang) {
    if (!ma) return null;
    if (loai === "OVERTIME") {
      var rTC = E.hieuLuc(db.dm_tangca, "Mã tăng ca", nam, thang)[ma];
      if (rTC) { if (name === "HE_SO_TC") return E.pct(rTC["Hệ số tăng ca"]); if (name === "TIEN_TC_CO_DINH") return E.money(rTC["Tiền tăng ca (nếu tính cố định)"]); }
    } else if (loai === "ALLOWANCE") {
      var rPC = E.hieuLuc(db.dm_phucap, "Mã phụ cấp", nam, thang)[ma];
      if (rPC) { if (name === "MUC_PHU_CAP") return E.money(rPC["Số tiền"]); if (name === "NGUONG_PHU_CAP") return E.num(rPC["Tham chiếu"]); }
    } else if (loai === "SUPPORT") {
      var rHT = E.hieuLuc(db.dm_hotro, "Mã hỗ trợ", nam, thang)[ma];
      if (rHT) { if (name === "MUC_HO_TRO" || name === "DON_GIA_HO_TRO") return E.money(rHT["Số tiền"]); }
    }
    return null;
  }
  function ctDefaultVar(name, b, loai, ma, nam, thang) {
    var vc = ctVarFromCode(name, loai, ma, nam, thang);
    if (vc != null) return { value: Math.round(vc * 1000) / 1000, source: "Danh mục " + ctLoaiTen(loai) + " (mã " + ma + ")" };
    var vr = ctVarFromRow(name, b, nam, thang);
    if (vr != null) return { value: Math.round(vr * 1000) / 1000, source: b ? ("Nhân viên " + b["Mã NV"] + " · kỳ " + thang + "/" + nam) : "" };
    return { value: 0, source: "chưa có nguồn tự động — nhập tay" };
  }
  /** Tên biến có trong formula-variables.js xuất hiện trong 1 biểu thức (để biết cần hỏi giá trị biến nào). */
  /** Tab "Kiểm tra công thức" (mục VII, tab 6 / mục VII.2-3) — chạy thử KHÔNG ghi vào bảng lương thật. */
  function ctTestPanel() {
    st.ctTest = st.ctTest || { nam: st.nam, thang: st.thang, loai: "OVERTIME", ma: "", maNV: "", maCT: "", expr: "", vars: {} };
    var T = st.ctTest, box = h("div", { class: "card" });
    box.appendChild(h("div", { class: "hint", text: "Thử công thức với dữ liệu của 1 nhân viên đã tính (hoặc giả lập, nếu không chọn nhân viên) — KHÔNG ghi/đổi bảng lương thật. Chọn 'Mã công thức' có sẵn để nạp biểu thức, hoặc tự sửa trực tiếp." }));
    refreshNVList();
    var fg = h("div", { class: "fgrid", style: "grid-template-columns:repeat(auto-fit,minmax(220px,1fr))" });
    var fld = function (label, ctl, cls) { return h("div", { class: "fld" + (cls ? " " + cls : "") }, [h("label", { text: label }), ctl]); };
    var selLoai = h("select"); CT_LOAI.forEach(function (x) { selLoai.appendChild(h("option", { value: x[0], text: x[1] })); }); selLoai.value = T.loai;
    selLoai.addEventListener("change", function () { T.loai = selLoai.value; T.maCT = ""; T.vars = {}; render(); });
    var rows = db.dm_congthuc.filter(function (r) { return (r["Loại"] || "") === T.loai; });
    var selMa = h("select"); selMa.appendChild(h("option", { value: "", text: "— Tự nhập biểu thức —" }));
    rows.forEach(function (r) { selMa.appendChild(h("option", { value: r._id, text: (r["Mã công thức"] || "") + " — " + (r["Tên công thức"] || "") + " (" + (r["Trạng thái"] || "") + ")" })); });
    selMa.value = T.maCT;
    selMa.addEventListener("change", function () {
      T.maCT = selMa.value; var r = rows.filter(function (x) { return x._id === T.maCT; })[0];
      if (r) { T.ma = r["Mã công thức"] || ""; T.expr = r["Biểu thức"] || ""; T.vars = {}; }
      render();
    });
    // Nhân viên: danh sách chọn "Mã — Họ tên" (không phải gõ tay mã), để trống = chạy giả lập
    var inNV = h("select", { "aria-label": "Nhân viên" }); inNV.appendChild(h("option", { value: "", text: "— Giả lập —" }));
    var coNV = false; db.nhanvien.forEach(function (r) { var ma = r["Mã NV"]; if (!ma) return; if (ma === T.maNV) coNV = true; inNV.appendChild(h("option", { value: ma, text: ma + " — " + (r["Họ và tên"] || "") })); });
    if (T.maNV && !coNV) inNV.appendChild(h("option", { value: T.maNV, text: T.maNV + " (không có trong Nhân sự)" }));
    inNV.value = T.maNV || "";
    inNV.addEventListener("change", function () { T.maNV = inNV.value; render(); });
    var inKy = kyPicker(T.nam + "-" + ("0" + T.thang).slice(-2), { "aria-label": "Kỳ" });
    inKy.addEventListener("change", function () { if (inKy.value) { var m = inKy.value.split("-"); T.nam = +m[0]; T.thang = +m[1]; render(); } });
    [fld("Loại công thức", selLoai), fld("Mã công thức", selMa), fld("Nhân viên (bỏ trống = giả lập)", inNV), fld("Kỳ lương", inKy)].forEach(function (x) { fg.appendChild(x); });
    box.appendChild(fg);
    box.appendChild(h("div", { class: "bar", style: "margin-top:0" }, [btn("↺ Lấy lại giá trị theo nhân viên/kỳ", "", function () { T.vars = {}; render(); })]));
    box.appendChild(h("div", { class: "fld" }, [h("label", { text: "Biểu thức (sửa trực tiếp để thử, không ảnh hưởng danh mục)" })]));
    var ta = h("textarea", { rows: 2, style: "width:100%;font-family:monospace" }); ta.value = T.expr;
    ta.addEventListener("change", function () { T.expr = ta.value; render(); });
    box.appendChild(ta);
    var vr = FML.validate(T.expr || "");
    if (!T.expr) { box.appendChild(h("div", { class: "hint", text: "Nhập hoặc chọn một công thức để thử." })); return box; }
    if (!vr.ok) { box.appendChild(h("div", { class: "warn", text: "⚠ Công thức không hợp lệ: " + vr.errors.map(function (e) { return e.message; }).join("; ") })); return box; }
    var b = null, kqB = null;
    if (T.maNV) { kqB = kqKy(T.nam, T.thang); b = (kqB.kq.bangluong || []).filter(function (x) { return x["Mã NV"] === T.maNV; })[0] || null; if (!b) box.appendChild(h("div", { class: "warn", text: "⚠ Không thấy " + T.maNV + " trong bảng lương kỳ " + T.thang + "/" + T.nam + " — dùng giá trị giả lập (0), có thể tự sửa." })); }
    var names = ctRefVars(T.expr);
    if (!names.length) box.appendChild(h("div", { class: "warn", text: "Công thức không dùng biến nào trong Thư viện biến — kết quả sẽ là hằng số." }));
    var ctx = {}, vt = h("table");
    vt.appendChild(h("tr", {}, [h("th", { text: "Biến" }), h("th", { text: "Giá trị" }), h("th", { text: "Nguồn" })]));
    names.forEach(function (name) {
      var cur = T.vars[name];
      if (cur === undefined) { var d = ctDefaultVar(name, b, T.loai, T.ma, T.nam, T.thang); cur = d.value; T.vars[name] = cur; T.vars["_src_" + name] = d.source; }
      ctx[name] = +cur || 0;
      var inp = h("input", { class: "num", value: cur });
      inp.addEventListener("change", function () { T.vars[name] = E.num(inp.value); T.vars["_src_" + name] = "nhập tay"; render(); });
      vt.appendChild(h("tr", {}, [h("td", { class: "t", html: "<code>" + esc(name) + "</code> — " + esc((FML.variables.get(name) || {}).label || "") }), h("td", {}, [inp]), h("td", { class: "t", style: "color:#6c7a74", text: T.vars["_src_" + name] || "" })]));
    });
    box.appendChild(h("div", { class: "tw" }, [vt]));
    var ketQuaMoi = null, loi = null;
    try { ketQuaMoi = Math.round(FML.evaluate(T.expr, ctx)); } catch (e) { loi = e.message; }
    var fieldCu = T.loai === "OVERTIME" ? "Tiền tăng ca" : T.loai === "ALLOWANCE" ? "Phụ cấp" : "Lương hỗ trợ";
    var ketQuaCu = b ? b[fieldCu] : null;
    var kq = h("div", { class: "kpis" });
    kq.appendChild(h("div", { class: "kpi" }, [h("small", { text: "Kết quả công thức này" }), h("b", { text: loi ? "⚠ lỗi" : fmt(ketQuaMoi) })]));
    if (b) kq.appendChild(h("div", { class: "kpi" }, [h("small", { text: "Đang áp dụng cho " + T.maNV + " (" + fieldCu + ")" }), h("b", { text: fmt(ketQuaCu) })]));
    if (b && !loi) kq.appendChild(h("div", { class: "kpi" }, [h("small", { text: "Chênh lệch" }), h("b", { style: ketQuaMoi - ketQuaCu ? "color:#c0362c" : "", text: (ketQuaMoi - ketQuaCu > 0 ? "+" : "") + fmt(ketQuaMoi - ketQuaCu) })]));
    box.appendChild(kq);
    if (loi) box.appendChild(h("div", { class: "warn", text: "⚠ Lỗi khi tính: " + loi }));
    box.appendChild(h("div", { class: "hint", style: "margin-top:8px", text: "Chỉ chạy thử trong màn hình này — chưa lưu, chưa đổi bảng lương/kỳ đã chốt. Muốn áp dụng thật: lưu biểu thức này vào tab " + ctLoaiTen(T.loai) + " (Trạng thái = Hiệu lực)." }));
    return box;
  }
  /** Tab "Lịch sử phiên bản" (mục VII, tab 7 / mục VII.4) — mọi dòng cùng Mã công thức (mọi Trạng thái) +
   * nhật ký chỉnh sửa liên quan (ai, khi nào, nội dung trước/sau — lấy từ nhật ký chung của app). */
  var CT_LBL = { "Chờ duyệt": "Gửi duyệt", "Nháp": "Trả về nháp", "Đã duyệt": "Duyệt", "Hiệu lực": "Kích hoạt", "Ngừng": "Ngừng" };
  function ctFenv() { return { can: can, user: session ? session.tenDangNhap : "", db: db }; }
  function ctChuyen(r, to) {
    var reason = String(st.ctReason || "").trim(); // Electron không hỗ trợ prompt() → lý do nhập ở ô phía trên bảng
    if ((to === "Hiệu lực" || to === "Ngừng") && !reason) { alert("Nhập 'Lý do thay đổi' vào ô phía trên bảng trước khi " + CT_LBL[to].toLowerCase() + " công thức."); return; }
    var vals = { "Trạng thái": to }; if (reason) vals["Lý do thay đổi"] = reason;
    // V10.2: lưu NGAY từng bước chuyển trạng thái (txn) — tiến trình chính kiểm từng bước một, không gộp nhiều bước vào một lần lưu trễ
    if (!txn(["dm_congthuc"], function () { return !!commit(REPO.plan("update", "dm_congthuc", r, vals, { what: CT_LBL[to].toLowerCase() + " công thức" }), { confirm: true, action: "Công thức tiền lương — " + CT_LBL[to] + " " + (r["Mã công thức"] || "") }); })) return;
    st.ctReason = ""; toast(CT_LBL[to] + " công thức " + (r["Mã công thức"] || "") + ": xong."); render();
  }
  function ctSaoChep(r) {
    if (!txn(["dm_congthuc"], function () { return !!commit(REPO.plan("insert", "dm_congthuc", null, FAP.copyAsDraft(r, ctFenv()), { what: "sao chép công thức" }), { action: "Công thức tiền lương — Sao chép thành phiên bản mới " + (r["Mã công thức"] || "") }); })) return;
    toast("Đã tạo phiên bản mới (Nháp) — bấm 'Sửa nháp' để chỉnh biểu thức rồi 'Gửi duyệt'."); render();
  }
  /** Sửa bản NHÁP (tên, biểu thức, hiệu lực). Bản đã gửi duyệt trở đi không sửa — dùng "Sao chép bản mới". */
  function ctSuaNhap(r) {
    var body = h("div"), g = h("div", { class: "fgrid" }); body.appendChild(g);
    var fld = function (lab, ctl, cls) { return h("div", { class: "fld" + (cls ? " " + cls : "") }, [h("label", { text: lab }), ctl]); };
    var iTen = h("input", { value: r["Tên công thức"] || "", "aria-label": "Tên công thức", autocomplete: "off" });
    var iTu = dateField(r["Hiệu lực từ"] || "", { "aria-label": "Hiệu lực từ" }), iDen = dateField(r["Hiệu lực đến"] || "", { "aria-label": "Hiệu lực đến" });
    var ta = h("textarea", { rows: 3, "aria-label": "Biểu thức", style: "width:100%;font-family:monospace", "data-ct-edit-expr": "1" }); ta.value = r["Biểu thức"] || "";
    var msg = h("div", { class: "hint" });
    var chk = function () { var v = FML.validate(ta.value || ""); msg.className = v.ok ? "hint" : "warn"; msg.textContent = v.ok ? "✓ Biểu thức hợp lệ" : "⚠ " + v.errors.map(function (e) { return e.message; }).join("; "); return v.ok; };
    ta.addEventListener("input", chk); chk();
    g.appendChild(fld("Mã công thức", h("input", { value: r["Mã công thức"] || "", disabled: "disabled" })));
    g.appendChild(fld("Tên công thức", iTen)); g.appendChild(fld("Hiệu lực từ", iTu)); g.appendChild(fld("Hiệu lực đến", iDen));
    body.appendChild(fld("Biểu thức", ta)); body.appendChild(msg);
    modal("Sửa bản nháp — " + (r["Mã công thức"] || "") + " v" + (r["Phiên bản"] || 1), body, function (close) {
      return [btn("Hủy", "", close), btn("Lưu nháp", "pri", function () {
        if (!chk()) { alert("Biểu thức chưa hợp lệ."); return; }
        var tu = iTu.value.trim() ? VAL.normDate(iTu.value) : "", den = iDen.value.trim() ? VAL.normDate(iDen.value) : "";
        if ((iTu.value.trim() && !tu) || (iDen.value.trim() && !den)) { alert("Ngày không đúng dạng dd/MM/yyyy."); return; }
        var vals = { "Tên công thức": iTen.value, "Biểu thức": ta.value.trim(), "Hiệu lực từ": tu || "", "Hiệu lực đến": den || "" };
        if (!txn(["dm_congthuc"], function () { return !!commit(REPO.plan("update", "dm_congthuc", r, vals, { what: "sửa công thức nháp" }), { action: "Công thức tiền lương — Sửa nháp " + (r["Mã công thức"] || "") }); })) return;
        close(); toast("Đã lưu bản nháp " + (r["Mã công thức"] || "")); render();
      })];
    });
  }
  /** Thư viện công thức theo loại (Cài đặt): nơi DUY NHẤT tạo / sửa nháp / sao chép / gửi duyệt / duyệt / kích hoạt / ngừng. Danh mục chỉ chọn mã công thức. */
  function ctLibraryPanel(loai) {
    var box = h("div", { class: "card", "data-ct-library": loai });
    var noun = loai === "OVERTIME" ? "tăng ca" : loai === "ALLOWANCE" ? "phụ cấp" : "hỗ trợ";
    box.appendChild(h("div", { class: "hint", text: "Thư viện công thức " + noun + ": tạo mới, sửa nháp, duyệt và kích hoạt ở đây. Ở Danh mục, mỗi mã " + noun + " chỉ cần chọn Mã công thức. Chỉ bản “Hiệu lực” được dùng để tính lương." }));
    var inReason = h("input", { class: "i reason-in", value: st.ctReason || "", placeholder: "Lý do thay đổi (bắt buộc khi Kích hoạt / Ngừng)", "data-ct-reason": "1", "aria-label": "Lý do thay đổi" });
    inReason.addEventListener("input", function () { st.ctReason = inReason.value; });
    var bar = h("div", { class: "bar" });
    if (can("dm.edit")) bar.appendChild(btn("＋ Tạo công thức " + noun + " mới", "pri", function () { st.ctWz = { loai: loai, mau: -1, vars: {}, ma: "", ten: "", tu: "" }; st.ct = "wz"; render(); })).setAttribute("data-ct-lib-new", "1");
    bar.appendChild(h("label", { class: "reason-lbl", text: "Lý do thay đổi" })); bar.appendChild(inReason); box.appendChild(bar);
    var rows = db.dm_congthuc.filter(function (r) { return (r["Loại"] || "") === loai; }).slice().sort(function (a, b) { var ca = String(a["Mã công thức"] || ""), cb = String(b["Mã công thức"] || ""); return ca < cb ? -1 : ca > cb ? 1 : (+b["Phiên bản"] || 1) - (+a["Phiên bản"] || 1); });
    if (!rows.length) { box.appendChild(h("div", { class: "empty", text: "Chưa có công thức " + noun + " nào do bạn tạo. Công thức có sẵn của hệ thống vẫn dùng được khi chọn ở Danh mục." })); return box; }
    var t = h("table", { "data-ct-lib-table": loai });
    t.appendChild(h("tr", {}, ["Mã công thức", "Phiên bản", "Tên công thức", "Biểu thức", "Trạng thái", "Hiệu lực từ", "Hiệu lực đến", "Người lập", "Người duyệt", "Thao tác"].map(function (x) { return h("th", { text: x }); })));
    rows.forEach(function (r) {
      var acts = h("td", { class: "t", style: "white-space:normal;min-width:260px" }), tt = r["Trạng thái"] || "Nháp";
      if (tt === "Nháp" && can("dm.edit")) acts.appendChild(btn("Sửa nháp", "", function () { ctSuaNhap(r); }));
      FAP.actionsFor(r, ctFenv()).forEach(function (to) { acts.appendChild(btn(CT_LBL[to], to === "Hiệu lực" ? "pri" : "", function () { ctChuyen(r, to); })); });
      if (can("dm.edit")) acts.appendChild(btn("⎘ Sao chép bản mới", "", function () { ctSaoChep(r); }));
      if (can("dm.edit") && tt !== "Hiệu lực" && tt !== "Ngừng") acts.appendChild(btn("Xóa", "red ghost", function () { ctXoa(r); }, "Chỉ xóa được bản chưa áp dụng (Nháp / Chờ duyệt / Đã duyệt)")).setAttribute("data-ct-del", "1");
      t.appendChild(h("tr", { "data-ct-ver": (r["Mã công thức"] || "") + "#" + (r["Phiên bản"] || 1) }, [
        h("td", { class: "t", html: "<b>" + esc(r["Mã công thức"] || "") + "</b>" }), h("td", { class: "t", text: "v" + (r["Phiên bản"] || 1) }), h("td", { class: "t", text: r["Tên công thức"] || "" }),
        h("td", { class: "t", style: "font-family:monospace;max-width:340px;word-break:break-all", text: r["Biểu thức"] || "" }),
        h("td", { class: "t", html: "<span class='tag " + (tt === "Hiệu lực" ? "on" : "off") + "'>" + esc(tt) + "</span>" }),
        h("td", { class: "t", text: r["Hiệu lực từ"] || "" }), h("td", { class: "t", text: r["Hiệu lực đến"] || "" }), h("td", { class: "t", text: r["Người lập"] || "" }), h("td", { class: "t", text: r["Người duyệt"] || "" }), acts]));
    });
    box.appendChild(h("div", { class: "tw" }, [t]));
    box.appendChild(h("div", { class: "hint", text: "Quy trình: Nháp → Gửi duyệt → Duyệt (người khác người lập) → Kích hoạt. Bản đã gửi duyệt trở đi không sửa nội dung — dùng “Sao chép bản mới”. Nhật ký chi tiết ở tab “Lịch sử phiên bản”." }));
    return box;
  }
  /** Xóa 1 phiên bản công thức CHƯA áp dụng (Nháp / Chờ duyệt / Đã duyệt). Hiệu lực / Ngừng → dùng "Ngừng" để giữ lịch sử. */
  function ctXoa(r) {
    var ma = r["Mã công thức"] || "", loai = r["Loại"] || "", ref = [];
    var P = FAP.PARENT[loai]; if (P) (db[P.table] || []).forEach(function (x) { if (String(x["Loại công thức"] || "").trim() === ma) ref.push(String(x[P.code] || "")); });
    var p = REPO.plan("remove", "dm_congthuc", r, null, { what: "xóa công thức chưa áp dụng" });
    if (!p.ok) { alert("⛔ Không xóa được: " + p.msg); return; }
    if (!confirm("Xóa công thức " + ma + " v" + (r["Phiên bản"] || 1) + " (" + (r["Trạng thái"] || "Nháp") + ")?\n\nBản này chưa áp dụng vào lương nên không ảnh hưởng số liệu." + (ref.length ? "\n\nLưu ý: mã " + ref.join(", ") + " đang chọn mã công thức này; sau khi xóa mã đó sẽ không còn công thức này để tra (dùng cách tính có sẵn của hệ thống)." : "") + "\nThao tác được ghi vào nhật ký.")) return;
    if (!txn(["dm_congthuc"], function () { return !!commit(p, { action: "Công thức tiền lương — xóa bản chưa áp dụng " + ma + " v" + (r["Phiên bản"] || 1) }); })) return;
    save(); toast("Đã xóa công thức " + ma); render();
  }
  function ctHistoryPanel() {
    var box = h("div", { class: "card" });
    var codes = []; db.dm_congthuc.forEach(function (r) { var c = r["Mã công thức"]; if (c && codes.indexOf(c) < 0) codes.push(c); });
    if (!codes.length) { box.appendChild(h("div", { class: "empty", text: "Chưa có công thức nào trong danh mục." })); return box; }
    st.ctHist = st.ctHist && codes.indexOf(st.ctHist) >= 0 ? st.ctHist : codes[0];
    var sel = h("select"); codes.forEach(function (c) { sel.appendChild(h("option", { value: c, text: c })); }); sel.value = st.ctHist;
    sel.addEventListener("change", function () { st.ctHist = sel.value; render(); });
    box.appendChild(h("label", { text: "Mã công thức " })); box.appendChild(sel);
    var vers = FML.versionsOf(db.dm_congthuc, st.ctHist);
    box.appendChild(h("div", { class: "fh", text: "Các phiên bản (mới nhất trước)" }));
    var inReason = h("input", { class: "i reason-in", value: st.ctReason || "", placeholder: "Lý do thay đổi (bắt buộc khi Kích hoạt / Ngừng)", "data-ct-reason": "1", "aria-label": "Lý do thay đổi" });
    inReason.addEventListener("input", function () { st.ctReason = inReason.value; });
    box.appendChild(h("div", { class: "bar" }, [h("label", { class: "reason-lbl", text: "Lý do thay đổi" }), inReason]));
    var t = h("table");
    t.appendChild(h("tr", {}, ["Phiên bản", "Hiệu lực từ", "Hiệu lực đến", "Trạng thái", "Công ty", "Biểu thức", "Người lập", "Người duyệt", "Kích hoạt", "Thao tác"].map(function (x) { return h("th", { text: x }); })));
    vers.forEach(function (r) {
      var acts = h("td", { class: "t" });
      FAP.actionsFor(r, ctFenv()).forEach(function (to) { acts.appendChild(btn(CT_LBL[to], to === "Hiệu lực" ? "pri" : "", function () { ctChuyen(r, to); })); });
      if (can("dm.edit")) acts.appendChild(btn("⎘ Sao chép bản mới", "", function () { ctSaoChep(r); }));
      t.appendChild(h("tr", { "data-ct-ver": (r["Mã công thức"] || "") + "#" + (r["Phiên bản"] || 1) }, [h("td", { class: "t", text: "v" + (r["Phiên bản"] || 1) }), h("td", { class: "t", text: r["Hiệu lực từ"] || "" }), h("td", { class: "t", text: r["Hiệu lực đến"] || "" }),
        h("td", { class: "t", html: "<span class='tag " + (r["Trạng thái"] === "Hiệu lực" ? "on" : "off") + "'>" + esc(r["Trạng thái"] || "Nháp") + "</span>" }),
        h("td", { class: "t", text: r["Công ty"] || "(mọi công ty)" }), h("td", { class: "t", style: "font-family:monospace", text: r["Biểu thức"] || "" }),
        h("td", { class: "t", text: (r["Người lập"] || "") + (r["Ngày lập"] ? " · " + fmtTime(r["Ngày lập"]) : "") }),
        h("td", { class: "t", text: (r["Người duyệt"] || "") + (r["Thời điểm duyệt"] ? " · " + fmtTime(r["Thời điểm duyệt"]) : "") }),
        h("td", { class: "t", text: (r["Người kích hoạt"] || "") + (r["Thời điểm kích hoạt"] ? " · " + fmtTime(r["Thời điểm kích hoạt"]) : "") + (r["Lý do thay đổi"] ? " — " + r["Lý do thay đổi"] : "") }), acts]));
    });
    box.appendChild(h("div", { class: "tw" }, [t]));
    box.appendChild(h("div", { class: "hint", text: "Quy trình: Nháp → Gửi duyệt → Duyệt (người khác người lập) → Kích hoạt. Chỉ bản 'Hiệu lực' được dùng để tính lương. Bản đã gửi duyệt trở đi không sửa nội dung — dùng 'Sao chép bản mới'. Kích hoạt bản có ngày hiệu lực trong kỳ đã chốt là hồi tố (chỉ Admin) và không làm đổi bảng lương đã chốt." }));
    var logs = (db.auditlog || []).filter(function (a) { return a.chiTiet && a.chiTiet.indexOf("Công thức tiền lương") >= 0 && a.chiTiet.indexOf(st.ctHist) >= 0; }).slice(-30).reverse();
    box.appendChild(h("div", { class: "fh", text: "Nhật ký chỉnh sửa (ai, khi nào, nội dung trước/sau)" }));
    if (!logs.length) box.appendChild(h("div", { class: "hint", text: "Chưa có nhật ký khớp mã này (nhật ký chỉ ghi được khi thao tác đổi/trống trường 'Mã công thức' trong dòng sửa)." }));
    else {
      var t2 = h("table"); t2.appendChild(h("tr", {}, [h("th", { text: "Lúc" }), h("th", { text: "Người" }), h("th", { text: "Thao tác" }), h("th", { text: "Nội dung" })]));
      logs.forEach(function (a) { t2.appendChild(h("tr", {}, [h("td", { class: "t", text: fmtTime(a.luc) }), h("td", { class: "t", text: a.nguoi || "" }), h("td", { class: "t", text: a.thaoTac || "" }), h("td", { class: "t", text: a.chiTiet || "" })])); });
      box.appendChild(h("div", { class: "tw" }, [t2]));
    }
    return box;
  }

  // ---------- Tính lương ----------
  var COLS_FULL = ["Kỳ sản lượng chuyển", "SL kỳ trước (tấn)", "Lương SL kỳ trước", "Bù SL kỳ trước", "Mã NV", "Họ và tên", "Phòng ban", "Công chuẩn", "Tổng công", "Lương thời gian", "Lương phụ", "Sản lượng (tấn)", "Lương sản lượng", "Lương bù SL", "Lương bơm dăm", "Tiền tăng ca", "Phụ cấp", "Phụ cấp công tác", "Lương hỗ trợ", "Tiền cơm", "Thưởng", "Thu nhập khác", "Tổng thu nhập", "BH trừ NLĐ", "KPCĐ trừ NLĐ", "Truy thu BH", "Thuế TNCN", "Trừ khác", "Tạm ứng", "Thực lĩnh", "Còn thiếu (thực lĩnh âm)"];
  var COLS_COMPACT = ["Mã NV", "Họ và tên", "Phòng ban", "Tổng công", "Tổng thu nhập", "BH trừ NLĐ", "KPCĐ trừ NLĐ", "Truy thu BH", "Thuế TNCN", "Tạm ứng", "Trừ khác", "Thực lĩnh", "Còn thiếu (thực lĩnh âm)"];
  var TEXTCOLS = { "Mã NV": 1, "Họ và tên": 1, "Phòng ban": 1 };

  // Cách bù lương sản lượng (α19 thêm 2 cách của công cụ phân bổ khối lượng; 2 cách cũ giữ nguyên)
  var BU_OPTS = [["to", "BÙ THEO ĐƠN GIÁ BÌNH QUÂN TỔ CỐ ĐỊNH NGÀY CÔNG THÁNG"], ["daihiep", "BÙ SẢN LƯỢNG THEO NGÀY"]];
  var BU_LEGACY = { "false": "Cách bù cũ theo THÁNG (không còn hỗ trợ — cần rà soát)", "true": "Cách bù cũ theo NGÀY liên tục (không còn hỗ trợ — cần rà soát)" };
  // Quy chế tính lương (R-68): "2026" = quy chế HAK Group (HAK, CNHAK, HAKQN — chủ sở hữu duyệt 11/10/2026) · "1.7" = cách tính trước đó (đối chiếu)
  var QC_OPTS = [["2026", "Quy chế lương HAK Group 2026"], ["1.7", "Cách tính cũ (engine 1.7 — để đối chiếu)"]];
  function quyChe() { var v = congTy()["Quy chế tính lương"]; return v === "1.7" ? "1.7" : "2026"; }
  /** Chi tiết 2 quy chế tính lương (đúng như engine.js — các mục C1…C10). */
  var QC_RULES = [
    ["Công chuẩn", "Số ngày của tháng − “Số ngày giảm trừ” khai ở Danh mục → Mã lương (VD TG3: 30 − 4 = 26). Mã “tất cả ngày CN” = số ngày − số Chủ nhật.", "Trừ Chủ nhật rồi trừ tiếp số sau dấu “-” trong cột Cách tính (VD tháng 30 ngày: 30 − 4 CN − 4 = 22).", "C2"],
    ["Lương thời gian", "Trả đủ số công đi làm, KHÔNG cắt ở công chuẩn: đơn giá ngày × công thực tế.", "Công tính lương = nhỏ hơn giữa công thực tế và công chuẩn (cắt ở công chuẩn).", "C1"],
    ["Công nhân sản phẩm (SP)", "Lương thời gian chỉ tính cho công lễ + công phép. Mã lương chọn “Loại công thức” = TG_LE_TANGCA thì tính lễ + tăng ca.", "Tính theo công thời gian thông thường.", "C3"],
    ["Bù theo đơn giá bình quân tổ", "Tiền của tổ chỉ gồm sản lượng (tấn × đơn giá khoán), không cộng tiền bơm dăm.", "Tiền của tổ gồm cả sản lượng và bơm dăm.", "C4"],
    ["Công nhật (CN1, CN2)", "Tăng ca tính theo công thức của mã tăng ca (nhân hệ số); công chuẩn = số ngày − Số ngày giảm trừ (CN2: 30 − 4 = 26) cho tăng ca, phụ cấp, hỗ trợ. Lương vẫn = đơn giá × công.", "Công chuẩn = công thực tế.", "C5, C9"],
    ["Phụ cấp để trống “Cách tính”", "Chia theo công chuẩn (không tính phép, tăng ca): đủ công thì đủ tiền.", "Hiểu là phụ cấp cố định.", "C6"],
    ["Bảo hiểm — lương đóng", "Chỉ lấy “Lương cơ bản” khai ở phụ lục hợp đồng. Có mã BHXH mà chưa khai Lương cơ bản thì KHÔNG tính BH / truy thu và có cảnh báo.", "Không có Lương cơ bản thì lấy lương thỏa thuận làm lương đóng BH.", "C8"],
    ["Mã tăng ca TC5", "Công TC5 (ca vị trí khác) đã trả riêng nên KHÔNG cộng vào công tính lương thời gian.", "Cộng vào tổng công.", "C10"],
    ["KPCĐ người lao động đóng", "Trừ riêng, không gộp vào “BH NLĐ đóng” — áp dụng cho CẢ HAI quy chế.", "Như bên cạnh.", "—"]
  ];
  function xemQuyChe(cur) {
    var body = h("div", { class: "bu-explain" });
    body.appendChild(h("p", { text: "Quy chế được chọn áp dụng cho mọi kỳ CHƯA chốt của dữ liệu này; kỳ đã chốt giữ nguyên số đã lưu. Đang chọn: " + qcLabel(cur) + ". Dùng “Cách tính cũ” chỉ để đối chiếu số với bản trước." }));
    var t = h("table", { class: "tbl" }), hd = h("tr");
    ["Nội dung", "Quy chế lương HAK Group 2026", "Cách tính cũ (engine 1.7)", "Mã"].forEach(function (c) { hd.appendChild(h("th", { text: c })); });
    t.appendChild(h("thead", {}, [hd]));
    var tb = h("tbody"); QC_RULES.forEach(function (r) { var tr = h("tr"); r.forEach(function (c, i) { tr.appendChild(h("td", { text: c, style: i === 0 ? "font-weight:600" : "" })); }); tb.appendChild(tr); });
    t.appendChild(tb); body.appendChild(h("div", { class: "tw" }, [t]));
    body.appendChild(h("div", { class: "hint", text: "Số tiền / tỷ lệ / ngưỡng cụ thể của từng nhân viên nằm ở Danh mục (Mã lương, Phụ cấp, Tăng ca, Bảo hiểm…) và Cài đặt → Công thức lương. Muốn xem số tính ra của từng người: bấm vào tên trong bảng lương → “📐 Xem cách tính”." }));
    modal("Quy chế tính lương", body, function (close) { return [btn("Đóng", "", close)]; });
  }
  function qcLabel(v) { var o = QC_OPTS.filter(function (x) { return x[0] === String(v); })[0]; return o ? o[1] : "Cách tính cũ (trước quy chế 2026)"; }
  function buLabel(v) { var o = BU_OPTS.filter(function (x) { return x[0] === String(v); })[0]; return o ? o[1] : (BU_LEGACY[String(v)] || String(v)); }
  function tinhLuong(nam, thang, qcDung, phuongPhapBu) {
    if (phuongPhapBu === undefined) phuongPhapBu = st.bu;
    nam = nam || st.nam; thang = thang || st.thang;
    var invalid = C.inputSafety.problems(db, kyKey(nam, thang));
    if (invalid.length) return { ky: kyKey(nam, thang), bangluong: [], bhxh: [], tncn: [], canhbao: invalid, inputErrors: invalid };
    var reviewMessage = C.inputReview.message(db, kyKey(nam, thang));
    if (reviewMessage) return { ky: kyKey(nam, thang), bangluong: [], bhxh: [], tncn: [], canhbao: ["Còn dữ liệu Nháp: " + reviewMessage + ". Bấm Lưu để tính lương tại bảng nhập liệu."], nhapLieuChuaLuu: [reviewMessage] };
    var sp = HRM.staffForPayroll(db, nam, thang);
    // α19: phiếu cân ghi Mã phòng ban → chia đều cho tổ (như công cụ phân bổ khối lượng) trước khi tính
    var slK = HRM.sanLuongKy(db, nam, thang, "sanluong"), bdK = HRM.sanLuongKy(db, nam, thang, "bandam");
    var qc = qcDung || quyChe(), carry;
    try { carry = C.productionCarry.prepare(db, kyKey(nam, thang), sp.list, slK.rows, phuongPhapBu, { quyChe: qc }); }
    catch (e) { return { ky: kyKey(nam, thang), bangluong: [], bhxh: [], tncn: [], canhbao: [e.message], inputErrors: [e.message] }; }
    sp.list = carry.staff;
    var kq = E.tinhBangLuong(Object.assign({}, carry.data, { bandam: bdK.rows }), nam, thang, phuongPhapBu, { quyChe: qc, suppressProduction: carry.suppress });
    C.productionCarry.annotate(kq, carry.pay);
    slK.alloc.warnings.forEach(function (w) { kq.canhbao.push("Sản lượng — " + w); });
    // α22: người có đơn nghỉ đã duyệt (mọi loại) tự không nhận phiếu ngày nghỉ — ghi rõ để kế toán thấy
    var dmN = function (x) { return x.slice(8, 10) + "/" + x.slice(5, 7); };
    [["Sản lượng", slK], ["Ban dăm xuất hàng", bdK]].forEach(function (p) { (p[1].alloc.nghi || []).forEach(function (x) {
      if (x.khongCong) kq.canhbao.push(p[0] + " — " + x.hoTen + " (" + x.ma + "): công = 0 / trống " + x.ngay.length + " ngày có phiếu của tổ (" + x.ngay.slice(0, 8).map(dmN).join(", ") + (x.ngay.length > 8 ? "…" : "") + ") — coi như nghỉ nguyên ngày, KHÔNG chia sản lượng các ngày này; kiểm tra lại chấm công");
      else kq.canhbao.push(p[0] + " — " + x.hoTen + " (" + x.ma + "): " + x.loai + " (đơn đã duyệt) — không chia " + x.ngay.length + " ngày cân " + dmN(x.ngay[0]) + (x.ngay.length > 1 ? " → " + dmN(x.ngay[x.ngay.length - 1]) : ""));
    }); });
    bdK.alloc.warnings.forEach(function (w) { kq.canhbao.push("Ban dăm xuất hàng — " + w); });
    kq.cheDoBu = String(phuongPhapBu); kq.quyChe = qc;
    var by = {}; sp.list.forEach(function (x) { by[x["Mã nhân viên"]] = x; });
    kq.bangluong.forEach(function (r) { var x = by[r["Mã NV"]] || {}; r["HTTT"] = x["HTTT"] || ""; r["Số tài khoản"] = x["Số tài khoản"] || ""; r["Ngân hàng"] = x["Tên Ngân hàng"] || ""; r["Người phụ thuộc"] = x["Người phụ thuộc"] || 0; r["Số HĐLĐ"] = x["Số HĐLĐ"] || ""; r["Mã PB"] = x["Mã PB"] || ""; });
    // V9.2: truy ngược người phụ thuộc được giảm trừ trong kỳ (chỉ tên — không đưa CCCD/MST vào bản chốt)
    var ixNPT = HRM.buildIndex ? HRM.buildIndex(db) : null, bDau = nam + "-" + ("0" + thang).slice(-2) + "-01", bCuoi = nam + "-" + ("0" + thang).slice(-2) + "-31";
    kq.bangluong.forEach(function (r) { if (r._ct) r._ct.nguoiPhuThuoc = HRM.dsNguoiPhuThuoc(db, r["Mã NV"], bDau, bCuoi, ixNPT).map(function (x) { return x["Họ tên nhân thân"] || ""; }).join("; "); });
    kq.loiTyLeBH = GATE.insuranceRateIssues({ kq: kq, staff: sp.list, catalog: E.hieuLuc(db.dm_baohiem, "Mã bảo hiểm", nam, thang) }); // tỷ lệ BH NLĐ để trống ở mã đang dùng → chặn chốt (BH_TY_LE_THIEU)
    var productionIssues = HRM.productionPayrollIssues(slK, bdK, kq.bangluong);
    if (productionIssues.length) kq.inputErrors = (kq.inputErrors || []).concat(productionIssues);
    kq.canhbao = sp.warn.concat(kq.canhbao, productionIssues); kq.ky = nam + "-" + ("0" + thang).slice(-2);
    var leave = C.leaveReconciliation.reconcile(db, kq.ky);
    kq.canhbao = kq.canhbao.filter(function (message) { return message.indexOf(HRM.LEAVE_TAG) < 0; });
    leave.entries.filter(function (entry) { return entry.status !== "Khớp"; }).forEach(function (entry) {
      kq.canhbao.push(entry.ma + " · " + fmtDate(entry.date) + ": " + entry.status);
    });
    leave.warnings.forEach(function (item) {
      kq.canhbao.push(item.ma + (item.contract ? " · HĐ " + item.contract : "") + ": phép vượt " + fmt(item.excess) + " ngày theo Quyền lợi phép (" + fmt(item.used) + "/" + fmt(item.limit) + ").");
    });
    Object.defineProperty(kq, "_staff", { value: sp.list, enumerable: false });
    return kq;
  }
  // ---------- Chốt kỳ lương ----------
  function kyChot(ky) { return db.kyluong.filter(function (k) { return k.ky === ky; })[0] || null; }
  function excelSheets(r, ky) {
    var mm = String(ky).split("-");
    var ck = r.bangluong.filter(function (x) { return x["HTTT"] === "Chuyển khoản" && x["Thực lĩnh"] > 0; }).map(function (x, i) { return { "STT": i + 1, "Mã NV": x["Mã NV"], "Họ và tên": x["Họ và tên"], "Số tài khoản": x["Số tài khoản"], "Ngân hàng": x["Ngân hàng"], "Số tiền": x["Thực lĩnh"], "Nội dung": "Luong T" + (+mm[1]) + "/" + mm[0] + " " + x["Mã NV"] }; });
    return {
      bl: { name: "BangLuong", cols: COLS_FULL.concat(["HTTT", "Số tài khoản", "Ngân hàng"]), rows: r.bangluong },
      bh: { name: "BHXH", cols: r.bhxh[0] ? Object.keys(r.bhxh[0]) : ["Mã NV"], rows: r.bhxh },
      tn: { name: "ThueTNCN", cols: r.tncn[0] ? Object.keys(r.tncn[0]) : ["Mã NV"], rows: r.tncn },
      ck: { name: "ChuyenKhoan", cols: ["STT", "Mã NV", "Họ và tên", "Số tài khoản", "Ngân hàng", "Số tiền", "Nội dung"], rows: ck }
    };
  }
  function payrollReportDetails(nam, thang, payroll) {
    var end = kyKey(nam, thang) + "-" + new Date(nam, thang, 0).getDate();
    var ix = HRM.buildIndex(db), taxIds = Object.create(null);
    payroll.forEach(function (r) {
      var ma = r["Mã NV"], personal = HRM.hienHanh(db, ma, end, ix).cn;
      if (personal && (!personal["Hiệu lực từ"] || personal["Hiệu lực từ"] <= end)) taxIds[ma] = personal["Mã số thuế"] || "";
    });
    var production = ["sanluong", "bandam"].map(function (type) {
      var allocation = pbAlloc(nam, thang, type), report = bcSanLuong(nam, thang, type, allocation);
      return { type: type, allocation: allocation, employees: report.nv.filter(function (r) { return !C.totalRow.is(r); }), audit: report.audit };
    });
    var ky = kyKey(nam, thang), codes = new Set();
    Object.values(OPS.closedTables).forEach(function (table) {
      (db[table] || []).forEach(function (row) { if (row["Mã NV"] && VAL.rowPeriod(table, row) === ky) codes.add(String(row["Mã NV"])); });
    });
    var people = db.nhanvien.filter(function (row) { return codes.has(String(row["Mã NV"])); }).map(function (row) {
      var ma = row["Mã NV"], job = HRM.hienHanh(db, ma, end, ix);
      return { "Mã NV": ma, "Họ và tên": row["Họ và tên"], "Mã PB": job.pb, "Phòng ban": job.tenPB };
    });
    return { taxIds: taxIds, production: production, people: people };
  }

  function payrollDetailSheets(result, ky, snapshot) {
    var parts = ky.split("-").map(Number), nam = parts[0], thang = parts[1];
    var saved = snapshot && snapshot.input;
    var details = snapshot ? saved && saved.payrollReports : payrollReportDetails(nam, thang, result.bangluong);
    var attendance = snapshot ? saved && saved.data && saved.data.chamcong : db.chamcong;
    var people = new Map(result.bangluong.map(function (r) { return [r["Mã NV"], r]; }));
    var days = DAYS.slice(0, new Date(nam, thang, 0).getDate());
    var workRows = (attendance || []).filter(function (r) { return VAL.rowPeriod("chamcong", r) === ky; }).map(function (r) {
      var employee = people.get(r["Mã NV"]) || {};
      var out = { "Mã NV": r["Mã NV"], "Họ và tên": employee["Họ và tên"] || "", "Hình thức công": String(r["Hình thức công"] || "BT").trim().toUpperCase() };
      out["Tổng công"] = days.reduce(function (sum, day) {
        out[day] = r[day] == null ? "" : r[day];
        return sum + E.tachCong(out[day]).soCong;
      }, 0);
      return out;
    }).sort(function (a, b) { return a["Hình thức công"].localeCompare(b["Hình thức công"]) || String(a["Mã NV"]).localeCompare(String(b["Mã NV"])); });
    var production = details && details.production;
    var employeeRows = production ? production.flatMap(function (g) {
      return g.employees.map(function (e) { return { "Loại": g.type === "bandam" ? "Ban dăm xuất hàng" : "Sản lượng",
        "Mã phòng ban": e["Mã phòng ban"], "Mã NV": e["Mã NV"], "Họ và tên": e["Họ và tên"],
        "Số ngày có SL": e["Số ngày có SL"], "Sản lượng (tấn)": e["Sản lượng (tấn)"], "Số xe": e["Số xe"] }; });
    }) : result.bangluong.filter(function (r) { return n0(r["Sản lượng (tấn)"]) || n0(r["Số xe bơm dăm"]); }).map(function (r) {
      return { "Loại": "Tổng theo bảng lương", "Mã NV": r["Mã NV"], "Họ và tên": r["Họ và tên"],
        "Sản lượng (tấn)": r["Sản lượng (tấn)"], "Số xe": r["Số xe bơm dăm"] };
    });
    var audit = (production || []).flatMap(function (g) {
      return g.audit.map(function (r) { return Object.assign({ "Loại": g.type === "bandam" ? "Ban dăm xuất hàng" : "Sản lượng" }, r); });
    });
    var topup = result.bangluong.filter(function (r) { return (r._ct && r._ct.laSanLuong) || n0(r["Lương bù SL"]) || n0(r["Bù SL kỳ trước"]); }).map(function (r) {
      var c = r._ct || {};
      return { "Mã NV": r["Mã NV"], "Họ và tên": r["Họ và tên"], "Phòng ban": r["Phòng ban"], "Phương pháp bù": c.phuongPhapBu ? buLabel(c.phuongPhapBu) : "",
        "Công BT": c.congBT, "Sản lượng (tấn)": r["Sản lượng (tấn)"], "Đơn giá khoán": c.donGiaKhoan, "Mức sàn bù": c.mucBuDmLuong,
        "Đơn giá bình quân tổ": c.binhQuanTo, "Lương sản lượng": r["Lương sản lượng"], "Lương bù SL": r["Lương bù SL"], "Bù SL kỳ trước": r["Bù SL kỳ trước"] };
    });
    var oldTax = new Map((result.tncn || []).map(function (r) { return [r["Mã NV"], r]; }));
    var taxRows = result.bangluong.map(function (r) {
      var c = r._ct || {}, old = oldTax.get(r["Mã NV"]) || {};
      return { "Mã NV": r["Mã NV"], "Họ và tên": r["Họ và tên"], "Phòng ban": r["Phòng ban"],
        "Mã số thuế": details && details.taxIds && details.taxIds[r["Mã NV"]] || "", "Mã TNCN": c.maThueTNCN,
        "Phương pháp thuế": c.phuongPhapThue, "Tổng thu nhập": r["Tổng thu nhập"], "Tiền cơm": r["Tiền cơm"],
        "BH trừ NLĐ": r["BH trừ NLĐ"], "KPCĐ trừ NLĐ": r["KPCĐ trừ NLĐ"], "Thu nhập chịu thuế": c.thuNhapChiuThue ?? old["Thu nhập chịu thuế"],
        "Giảm trừ bản thân": c.giamTruBanThan ?? old["Giảm trừ bản thân"], "Số người phụ thuộc": c.soNPT ?? old["Số người phụ thuộc"],
        "Giảm trừ người phụ thuộc": c.giamTruPhuThuoc ?? old["Giảm trừ người phụ thuộc"],
        "Thu nhập tính thuế": c.thuNhapTinhThue ?? old["Thu nhập tính thuế"], "Thuế TNCN khấu trừ": r["Thuế TNCN"] ?? old["Thuế TNCN phải nộp"] };
    });
    function sheet(name, title, cols, rows, source, groupBy) {
      return { name: name, title: title, cols: cols.split("|"), rows: rows, source: source, groupBy: groupBy };
    }
    return [
      sheet("ChamCongTheoHinhThuc", "Chấm công theo từng hình thức công", "Mã NV|Họ và tên|Hình thức công|Tổng công|" + days.join("|"), workRows,
        !attendance ? "Bản chốt cũ chưa lưu bảng chấm công" : snapshot ? "Chấm công lưu trong bản chốt" : "Chấm công hiện tại", "Hình thức công"),
      sheet("PhanBoSanLuong", "Phân bổ sản lượng và bơm dăm theo nhân viên", "Loại|Mã phòng ban|Mã NV|Họ và tên|Số ngày có SL|Sản lượng (tấn)|Số xe", employeeRows,
        production ? (snapshot ? "Chi tiết phân bổ theo ngày cân lưu lúc chốt" : "Phân bổ từ dữ liệu hiện tại") : "Bản chốt cũ chỉ có tổng theo nhân viên từ bảng lương"),
      sheet("DoiSoatPhieuCan", "Đối soát chi tiết phiếu cân", "Loại|Phiếu|Ngày|Mã phòng ban|KL / số xe|Số người nhận|Mỗi người|Người nhận|Ghi chú", audit,
        production ? (snapshot ? "Chi tiết phiếu lưu lúc chốt" : "Chi tiết phiếu hiện tại") : "Bản chốt cũ chưa lưu chi tiết theo phiếu"),
      sheet("BuSanLuong", "Bù sản lượng theo nhân viên", "Mã NV|Họ và tên|Phòng ban|Phương pháp bù|Công BT|Sản lượng (tấn)|Đơn giá khoán|Mức sàn bù|Đơn giá bình quân tổ|Lương sản lượng|Lương bù SL|Bù SL kỳ trước", topup, "Kết quả bù trong bảng lương của kỳ"),
      sheet("ThueTNCN", "Chi tiết khấu trừ thuế thu nhập cá nhân", "Mã NV|Họ và tên|Phòng ban|Mã số thuế|Mã TNCN|Phương pháp thuế|Tổng thu nhập|Tiền cơm|BH trừ NLĐ|KPCĐ trừ NLĐ|Thu nhập chịu thuế|Giảm trừ bản thân|Số người phụ thuộc|Giảm trừ người phụ thuộc|Thu nhập tính thuế|Thuế TNCN khấu trừ", taxRows,
        snapshot && !details ? "Bảng lương đã chốt. Mã số thuế trống nếu bản chốt cũ chưa lưu." : "Kết quả thuế và mã số thuế của kỳ")
    ];
  }

  function payrollBundle(r, ky) {
    var x = excelSheets(r, ky), parts = ky.split("-"), snapshot = kyChot(ky);
    var accounting = bcHachToan(r, Number(parts[0]), Number(parts[1]));
    var balance = PLG.outstanding(r.bangluong, payLines(), ky).map(function (o) {
      return { "Mã NV": o.maNV, "Họ và tên": o.hoTen, "Phải trả": o.thucLinh, "Đã chi": o.daTra,
        "Đang chờ chi": o.dangCho, "Còn phải trả": o.conPhaiTraRaw };
    });
    var departments = ALLOC.byDepartment(r).rows;
    var meta = { "Kỳ": ky, "Phiên bản": snapshot ? snapshot.version || 1 : "", "Nguồn bảng lương": snapshot ? "Bản đã chốt" : "Dữ liệu tính tạm",
      "Nguồn chi lương": "Sổ chứng từ tại thời điểm xuất", "Ngày xuất": HRM.today(), "Chênh lệch TK 334": accounting.lech, "Nguồn tài khoản chi phí": accounting.fallback || !snapshot ? "Danh mục hiện tại" : "Danh mục bản chốt" };
    var supplemental = payrollDetailSheets(r, ky, snapshot);
    var folder = [
      { name: "ThongTinKy", title: "Thông tin kỳ và nguồn số liệu", cols: ["Nội dung", "Giá trị"], rows: Object.keys(meta).map(function (key) { return { "Nội dung": key, "Giá trị": meta[key] }; }) },
      Object.assign({ title: "Bảng lương" }, x.bl),
      Object.assign({ title: "Bảo hiểm" }, x.bh),
      supplemental.pop(),
      { name: "PhanBoPhongBan", title: "Phân bổ lương theo phòng ban", cols: departments[0] ? Object.keys(departments[0]) : ["Phòng ban"], rows: departments },
      { name: "HachToan", title: "Bảng hạch toán lương", cols: ["Kỳ", "TK Nợ", "TK Có", "Diễn giải", "Số tiền"], rows: accounting.rows },
      { name: "DoiChieuChiLuong", title: "Đối chiếu chi lương", cols: ["Mã NV", "Họ và tên", "Phải trả", "Đã chi", "Đang chờ chi", "Còn phải trả"], rows: balance }
    ];
    folder = folder.concat(supplemental);
    var company = snapshot && snapshot.input && snapshot.input.danhmuc && (snapshot.input.danhmuc.congty || [])[0];
    var info = {
      congTy: (company || congTy())["Tên công ty"] || "", kyText: kyLabel(ky),
      trangThai: snapshot ? "Đã chốt · v" + (snapshot.version || 1) : "Dữ liệu tính tạm", ngayLap: fmtDate(HRM.today()),
      nguoiLap: currentUser()
    };
    return { sheets: folder, info: info };
  }

  function exportPayrollBundlePdf(r, ky) {
    if (!need("export", "in bộ báo cáo kỳ")) return;
    var bundle = payrollBundle(r, ky);
    exportSheetsPdf({
      title: "Bộ báo cáo kỳ lương", ky: bundle.info.kyText, congTy: bundle.info.congTy,
      trangThai: bundle.info.trangThai, sheets: bundle.sheets.map(function (sheet) {
        var ids = ["STT", "Mã NV", "Họ và tên"].filter(function (key) { return sheet.cols.indexOf(key) >= 0; });
        var cols = ids.concat(sheet.cols.filter(function (key) { return ids.indexOf(key) < 0; }));
        return Object.assign({}, sheet, { name: sheet.title || sheet.name, cols: cols, repeatColumns: ids.length });
      })
    }, "KyLuong_" + ky + ".pdf", { sectionPages: true, period: ky });
  }

  function exportAll(r, ky) {
    if (!need("export", "xuất bộ báo cáo kỳ")) return;
    if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.reportXlsx) { alert("Thiếu thư viện định dạng Excel."); return; }
    var bundle = payrollBundle(r, ky);
    window.HAKUi.reportXlsx.buildPayrollBundle(window.ExcelJS, bundle.sheets, bundle.info).xlsx.writeBuffer().then(function (buf) {
      download("KyLuong_" + ky + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
    }, function (e) { alert("Không tạo được bộ báo cáo kỳ: " + e.message); });
  }
  /**
   * Checklist trước khi chốt kỳ (Master Prompt mục XIV/XVIII). Chỉ hiện khi có điểm cần xem (lỗi
   * hoặc cảnh báo) — dữ liệu sạch thì bỏ qua thẳng, không thêm bước cho trường hợp bình thường.
   * "loi" (⛔) = BLOCKER mục XIV — không có nút vượt qua, phải sửa dữ liệu rồi tính lại.
   * "canhbao" (⚠) = WARNING — được chốt nếu đã kiểm tra là đúng. onContinue() chỉ được gọi khi
   * người dùng chủ động xác nhận tiếp tục (hoặc không có gì phải xem).
   */
  function preChotChecklist(fresh, onContinue) {
    if (!PCC) { onContinue(); return; }
    var slA = pbAlloc(st.nam, st.thang, "sanluong"), bdA = pbAlloc(st.nam, st.thang, "bandam");
    var ck = PCC.run({ db: db, kq: fresh, slAlloc: slA, bdAlloc: bdA, quyChe: quyChe() });
    if (!ck.loiCount && !ck.canhbaoCount) { onContinue(); return; }
    var ICON = { ok: "✔", canhbao: "⚠", loi: "⛔" };
    var body = h("div");
    body.appendChild(h("div", { class: ck.loiCount ? "warn" : "hint", html: "Checklist trước khi chốt kỳ — <b>" + ck.loiCount + " lỗi</b>, <b>" + ck.canhbaoCount + "</b> cảnh báo trên " + ck.items.length + " điểm." +
      (ck.loiCount ? " ⛔ Lỗi là BLOCKER (mục XIV) — phải sửa dữ liệu rồi tính lại, KHÔNG thể vượt qua." : " Cảnh báo có thể chốt nếu đã kiểm tra là đúng.") }));
    var t = h("table");
    ck.items.forEach(function (x) {
      var tr = h("tr");
      tr.appendChild(h("td", { text: ICON[x.trangThai] + " " + x.id }));
      tr.appendChild(h("td", { class: "t", html: "<b>" + esc(x.ten) + "</b>" + (x.chiTiet.length ? "<br><span style='color:#6c7a74;font-size:12px'>" + x.chiTiet.slice(0, 5).map(esc).join("<br>") + (x.chiTiet.length > 5 ? "<br>…(" + (x.chiTiet.length - 5) + " dòng nữa)" : "") + "</span>" : "") }));
      t.appendChild(tr);
    });
    body.appendChild(h("div", { class: "tw" }, [t]));
    modal("Checklist trước khi chốt kỳ lương", body, function (close) {
      // BLOCKER (còn "loi"): chỉ có nút đóng để quay lại sửa — không có đường nào bấm qua được (mục XIV).
      return ck.loiCount ? [btn("Đóng — sửa dữ liệu rồi tính lại", "pri", close)]
        : [btn("Hủy, để tôi kiểm tra lại", "", close), btn("Đã kiểm tra, tiếp tục chốt", "pri", function () { close(); onContinue(); })];
    });
  }
  function selectTopupMethod(value) {
    st.bu = value === "true" ? true : value === "false" ? false : value;
    st.kqStale = true;
    saveUi();
    render();
  }

  function checkCloseTopup(result, ky) {
    var parts = ky.split("-").map(Number);
    var policy = E.quyCheBuChinhThuc(db.dm_quychebu, parts[0], parts[1]);
    var official = policy && String(policy["Cách bù"] || "").trim();
    var used = result.cheDoBu;
    var production = result.bangluong.some(function (row) { return row._ct && row._ct.laSanLuong; });
    if (official !== "daihiep" && official !== "to") {
      if (production) {
        alert("⛔ KHÔNG THỂ CHỐT — kỳ " + kyLabel(ky) + " có sản lượng cần bù nhưng chưa có Phương pháp bù sản lượng chính thức hợp lệ. Vào Cài đặt → Phương pháp bù sản lượng, áp dụng phương pháp cho kỳ rồi bấm Tính lương lại.");
        return false;
      }
    } else if (used !== official) {
      var body = h("div", { class: "warn" }, [
        h("p", { text: "Đã tính bảng lương theo: " + buLabel(used) }),
        h("p", { text: "Cài đặt kỳ " + kyLabel(ky) + ": " + buLabel(official) }),
        h("p", { text: "Bấm Tính lương lại sau khi chọn đúng phương pháp, rồi kiểm tra bảng trước khi chốt." })
      ]);
      modal("Phương pháp bù chưa khớp", body, function (close) {
        var actions = [btn("Đóng", "", close)];
        if (String(st.bu) !== official) actions.push(btn("Dùng phương pháp trong Cài đặt", "pri", function () {
          close();
          if (kyStr() !== ky || kyChot(ky)) return;
          selectTopupMethod(official);
          toast("Đã chọn phương pháp trong Cài đặt. Bấm Tính lương lại.");
        }));
        return actions;
      });
      return false;
    }
    if (used !== String(st.bu)) {
      alert("⛔ KHÔNG THỂ CHỐT — phương pháp bù vừa chọn khác phương pháp đã dùng để tính bảng lương. Bấm Tính lương lại rồi chốt.");
      return false;
    }
    return true;
  }
  function payrollApprovalInfo(snap) {
    var a = snap.input && snap.input.approval;
    return a ? "Người lập: " + a.preparer + " · Người duyệt: " + a.approver + " · Duyệt lúc: " + fmtTime(a.approvedAt) + " · Phiên bản duyệt: v" + a.version : "";
  }
  function approvalDigest(ky, result, legacy) {
    var snapshot = CLS.buildSnapshot(db, ky, result, result._staff, { buTheoNgay: st.bu, quyChe: result.quyChe, engineVersion: E.ENGINE_VERSION });
    return C.workflowApproval.fingerprint(db, snapshot, legacy);
  }

  function savePayrollApproval(approve) {
    if (!need(approve ? "payroll.approve" : "payroll.calc") || C.workflowApproval.mode(db) !== "roles") return;
    var ky = kyStr(), prior = C.workflowApproval.ticket(db, ky), user = C.workflowApproval.account(session.tenDangNhap);
    if (!st.kq || st.kq.ky !== ky || kyChot(ky) || !checkCloseTopup(st.kq, ky)) return;
    var fresh = tinhLuong(st.nam, st.thang, undefined, st.bu);
    if (GATE.blockers(fresh).length || !fresh.bangluong.length) { alert("Cần xử lý lỗi đầu vào và có bảng lương trước khi gửi hoặc duyệt."); return; }
    var digest = approvalDigest(ky, fresh);
    if (digest !== approvalDigest(ky, st.kq)) { st.kq = fresh; render(); alert("Bảng lương đã thay đổi. Kiểm tra bảng mới rồi thao tác lại."); return; }
    if (approve && (!prior || prior.approver || prior.preparer === user || (prior.digest !== digest && prior.digest !== approvalDigest(ky, fresh, true)))) {
      alert("Cần yêu cầu còn hiệu lực từ người lập khác. Kiểm tra phương pháp bù, quy chế và dữ liệu của kỳ."); return;
    }
    var row = approve ? Object.assign({}, prior, { approver: user, approvedAt: new Date().toISOString() }) : { ky: ky, digest: digest, preparer: user, approver: "" };
    if (!txn(["payrollApprovals"], function () {
      db.payrollApprovals = (db.payrollApprovals || []).filter(function (item) { return item.ky !== ky; }).concat(row);
      audit(approve ? "Duyệt bảng lương" : "Gửi duyệt bảng lương", ky);
    })) { alert(lastTxnError); return; }
    st.kqStale = false;
    render();
  }

  function chotKy() {
    if (!st.kq || !need("payroll.close")) return;
    var ky = kyStr();
    if (kyChot(ky)) { alert(kyLabel(ky) + " đã chốt."); return; }
    if (st.kq.ky !== ky || !checkCloseTopup(st.kq, ky)) return;
    var method = st.bu;
    // P0 (BLOCKER — mục IV.2): lỗi dữ liệu NGHIÊM TRỌNG phải CHẶN CỨNG, không cho chốt bằng 1 hộp
    // thoại xác nhận như cảnh báo thường — gồm mức "Critical" (Mã NV trùng) VÀ các dòng "High" mà
    // core/integrity.js đã tự xác định là tiền bị CỘNG TRÙNG (phiếu cân / số chứng từ trùng khóa
    // → sản lượng, thưởng, tạm ứng bị tính 2 lần) — khớp đúng BLOCKER "sản lượng/chấm công bị cộng
    // trùng" của mục IV.2, dù mức integrity.js gán là High (ảnh hưởng tiền trực tiếp như Critical).
    var critIssues = INT.check(db).filter(function (i) { return i.level === "Critical" || /CỘNG (2 LẦN|NHIỀU LẦN)/.test(i.msg); });
    // 1 người 2 Mã NV (CCCD trùng giữa các nhân viên CÓ TRONG BẢNG LƯƠNG kỳ này) = trả lương 2 lần → chặn cứng như Mã NV trùng (core/identity.js)
    ID.payrollDuplicates(db, HRM.staffForPayroll(db, st.nam, st.thang).list.map(function (x) { return x["Mã nhân viên"]; })).forEach(function (d) { critIssues.push({ level: "Critical", msg: d.msg }); });
    if (critIssues.length) {
      alert("⛔ KHÔNG THỂ CHỐT — có " + critIssues.length + " lỗi dữ liệu NGHIÊM TRỌNG cần sửa trước:\n" +
        critIssues.slice(0, 10).map(function (i) { return "• " + i.msg; }).join("\n") + (critIssues.length > 10 ? "\n…" : "") +
        "\n\nVào Công ty & Sao lưu → Kiểm tra dữ liệu để xem đầy đủ và sửa, rồi tính lại.");
      return;
    }
    // Luôn tính lại từ dữ liệu mới nhất: tránh chốt nhầm bảng lương cũ đang hiển thị.
    // P0: so sánh TỪNG chỉ tiêu của TỪNG nhân viên (CLS.diffDetailed), không chỉ tổng thực lĩnh/số NV —
    // 2 người đổi lương ngược dấu nhau (A +1tr, B -1tr) làm tổng & số NV y nguyên nhưng bảng lương đã khác.
    var fresh = tinhLuong(st.nam, st.thang, undefined, method), now2 = CLS.totals(fresh), diffRows = CLS.diffDetailed(st.kq, fresh);
    if (diffRows.length) {
      st.kq = fresh; render();
      var dBody = h("div");
      dBody.appendChild(h("div", { class: "warn", text: "Dữ liệu đã thay đổi sau lần tính trước — " + diffRows.length + " chênh lệch theo từng nhân viên/chỉ tiêu (không chỉ tổng). App đã TÍNH LẠI: " + now2.soNV + " NV, tổng thực lĩnh " + fmt(now2.thucLinh) + ".\nHãy xem kỹ bảng dưới rồi bấm Chốt lần nữa." }));
      dBody.appendChild(simpleTable(diffRows));
      modal("⚠ Dữ liệu đã đổi trước khi chốt " + kyLabel(ky), dBody, function (close) { return [btn("Đóng", "", close)]; });
      return;
    }
    // P0 (BLOCKER — mục IV.2): ô chấm công không hợp lệ trong kỳ đang chốt phải chặn cứng, không chỉ cảnh báo.
    // Chạy TRƯỚC checklist mềm (preChotChecklist) để không hiện "tiếp tục được" rồi mới chặn cứng ngay sau.
    var badDay = 0;
    db.chamcong.forEach(function (r) { if (VAL.normKy(r["Kỳ"]) === ky) DAYS.forEach(function (d) { if (VAL.dayCell(d, r[d], ky).error) badDay++; }); });
    if (badDay) { alert("⛔ KHÔNG THỂ CHỐT — có " + badDay + " ô chấm công không hợp lệ (số âm, chữ lạ, ngày không có trong tháng) trong kỳ " + kyLabel(ky) + ".\nSửa ở Chấm công (hoặc xem Công ty & Sao lưu → Kiểm tra dữ liệu) rồi tính lại."); return; }
    // P0 (BLOCKER — mục IV.2 "thiếu mã lương/tham số thiết yếu"): mã BHXH không có trong Danh mục
    // bảo hiểm → cả khối BH (NLĐ + công ty) bị BỎ QUA HOÀN TOÀN cho người đó (engine.js), không chỉ
    // tính sai — công ty có thể thiếu nghĩa vụ đóng BHXH thật. Chặn cứng, không cho bấm qua.
    var gateBl = GATE.blockers(fresh);
    if (gateBl.length) {
      alert("⛔ KHÔNG THỂ CHỐT " + kyLabel(ky) + " — có lỗi chặn:\n" + gateBl.map(function (b) { return "• " + b.code + " — " + b.ten + " (" + b.count + "): " + b.items.slice(0, 2).join(" | "); }).join("\n") + "\n\nSửa cấu hình/dữ liệu rồi tính lại. Không có cách bỏ qua.");
      return;
    }
    var missingBH = fresh.canhbao.filter(function (w2) { return /chưa có trong Danh mục bảo hiểm/.test(w2); });
    if (missingBH.length) {
      alert("⛔ KHÔNG THỂ CHỐT — " + missingBH.length + " người có mã BHXH không có trong Danh mục bảo hiểm (toàn bộ BHXH/BHYT/BHTN của người đó đang bị BỎ QUA, không chỉ tính sai):\n" +
        missingBH.slice(0, 10).map(function (m) { return "• " + m; }).join("\n") + (missingBH.length > 10 ? "\n…" : "") +
        "\n\nSửa Mã BHXH hoặc bổ sung mã vào Danh mục bảo hiểm rồi tính lại.");
      return;
    }
    var leaveReview = C.leaveReconciliation.reconcile(db, ky);
    if (leaveReview.quotaBlockers.length) {
      alert("Không thể chốt: " + leaveReview.quotaBlockers.map(function (x) {
        return x.ma + (x.contract ? " · HĐ " + x.contract : "") + " vượt " + fmt(x.excess) + " ngày phép";
      }).join("; ") + ". Vào Chấm công → Đối chiếu đơn nghỉ và xử lý phần vượt theo loại nghỉ phù hợp.");
      return;
    }
    if (leaveReview.blockers.length) {
      alert("Không thể chốt: " + leaveReview.blockers.length + " ngày nghỉ có chênh lệch ảnh hưởng công tính lương. Vào Chấm công → Đối chiếu đơn nghỉ, sửa rồi tính lại.");
      return;
    }
    var revision = dbRev;
    var previous = CLS.history(db, ky).slice().sort(function (a, b) { return (b.version || 0) - (a.version || 0); })[0];
    var rows = PLG.reconciliation(previous?.kq?.bangluong, fresh.bangluong, payLines(), ky);
    var proceed = function () { preChotChecklist(fresh, function () { chotKyTiep(ky, fresh, now2, method, revision, leaveReview); }); };
    if (!rows.length) { proceed(); return; }
    var conflicting = rows.some(function (row) { return row["Chờ chi cần điều chỉnh"] > 0; });
    var body = h("div", {}, [
      h("p", { class: conflicting ? "warn" : "hint", text: conflicting ?
        "Chứng từ đang chờ chi vượt số còn phải trả. Hủy chứng từ chờ chi bị dư trong Sổ chứng từ trước khi chốt." :
        "Đối chiếu thực lĩnh với chứng từ đã chi. Khi lập chứng từ, chỉ lập phần cần chi thêm; khoản đã trả thừa cần xử lý riêng." }),
      simpleTable(rows)
    ]);
    modal("Đối chiếu tiền đã chi trước khi chốt lại", body, function (close) {
      return [btn("Đóng", "", close), conflicting ? null : btn("Tiếp tục kiểm tra chốt", "pri", function () { close(); proceed(); })];
    }, { wide: true });
  }
  function chotKyTiep(ky, fresh, now2, method, revision, leaveReview) {
    var w = fresh.canhbao.length;
    askText("Chốt " + kyLabel(ky), now2.soNV + " nhân viên · Tổng thực lĩnh " + fmt(now2.thucLinh) + " đ" +
      (w ? "\n⚠ Còn " + w + " cảnh báo dữ liệu chưa xử lý (xem trên màn hình Tính lương)." : "") +
      "\nSau khi chốt: lưu bảng lương + dữ liệu đầu vào của kỳ, khóa chấm công/sản lượng/thưởng/tạm ứng của kỳ.", { label: "Ghi chú (không bắt buộc)", okText: "🔒 Chốt kỳ lương" }, function (note) {
    if (w && !confirm("Xác nhận CHỐT dù còn " + w + " cảnh báo?")) return;
    if (kyChot(ky)) { alert(kyLabel(ky) + " đã được chốt (có thể do bấm 2 lần) — không chốt lại."); return; } // V9: chống chốt 2 lần
    if (kyStr() !== ky || !checkCloseTopup(fresh, ky)) return;
    if (revision !== dbRev) { alert("Dữ liệu đã thay đổi. Bấm Tính lương lại trước khi chốt."); return; }
    var snap = CLS.buildSnapshot(db, ky, fresh, fresh._staff, { note: note, leaveReview: leaveReview, payrollReports: payrollReportDetails(st.nam, st.thang, fresh.bangluong), buTheoNgay: method, quyChe: fresh.quyChe || quyChe(), engineVersion: E.ENGINE_VERSION, user: currentUser() });
    if (C.workflowApproval.mode(db) === "roles") {
      var approved = C.workflowApproval.ticket(db, ky);
      var approval = C.workflowApproval.approvalRecord(approved, snap.version);
      if (!approval || !C.workflowApproval.matchesFingerprint(db, snap, approval.digest)) {
        alert("Kỳ lương cần được người khác duyệt trên đúng dữ liệu hiện tại trước khi chốt."); return;
      }
      snap.input.approval = approval;
      snap.inputChecksum = CLS.checksum(snap.input);
    }
    CLS.close(db, snap); audit("Chốt kỳ lương", ky + " v" + snap.version + " — " + now2.soNV + " NV, thực lĩnh " + now2.thucLinh);
    if (!saveNow()) { CLS.rollbackClose(db, snap); db.auditlog.pop(); alert("CHỐT KHÔNG THÀNH CÔNG: chưa lưu được dữ liệu xuống đĩa. Kỳ lương vẫn ở trạng thái chưa chốt."); render(); return; }
    // Bản sao lưu SAU CHỐT KỲ: giữ vĩnh viễn, tự chép sang thư mục sao lưu thứ hai nếu đã chọn (main/storage.js)
    var bkChot = null; try { bkChot = store && store.backup ? store.backup("sau-chot-" + ky) : null; } catch (e) { bkChot = null; }
    var bs = bkChot && store.backupStatus ? store.backupStatus() : null;
    st.kq = null; render(); toast("Đã chốt và lưu " + kyLabel(ky) + " (phiên bản " + snap.version + ")" + (bkChot ? " · đã tạo bản sao lưu sau chốt" + (bs && bs.mirrorDir && !bs.lastMirrorError ? " và chép sang thư mục thứ hai" : "") : ""));
    if (bs && bs.mirrorDir && bs.lastMirrorError) alert("⚠ Đã chốt và sao lưu trên máy, nhưng KHÔNG chép được sang thư mục sao lưu thứ hai:\n" + bs.lastMirrorError + "\n\nCắm USB / kết nối ổ mạng rồi vào Công ty & Sao lưu → 'Chép sang thư mục thứ hai ngay'.");
    });
  }
  function viewPaidReconciliation(snap) {
    var previous = CLS.history(db, snap.ky).slice().sort(function (a, b) { return (b.version || 0) - (a.version || 0); })[0];
    var rows = PLG.reconciliation(previous ? previous.kq.bangluong : snap.kq.bangluong, snap.kq.bangluong, payLines(), snap.ky);
    var cols = rows[0] ? Object.keys(rows[0]) : [];
    if (cols.length) cols[cols.indexOf("Thực lĩnh tính lại")] = "Thực lĩnh đã chốt";
    rows = rows.map(function (row) {
      return Object.assign({}, row, { "Thực lĩnh đã chốt": row["Thực lĩnh tính lại"] });
    });
    modal("Đối chiếu tiền đã chi — " + kyLabel(snap.ky), simpleTable(rows, null, cols), function (close) {
      return [rows.length && can("export") ? btn("Xuất Excel", "", function () {
        saveXlsx("DoiChieuDaChi_" + snap.ky + ".xlsx", [{ name: "DoiChieu", rows: rows, cols: cols }]);
      }) : null, btn("Đóng", "", close)];
    }, { wide: true });
  }
  function showDeficitRegister() {
    var reg = PLG.deficitRegister(db), target = kyStr();
    var rows = reg.rows.map(function (r) {
      var remaining = Math.max(0, r.amount - r.recovered - r.pending);
      var actions = remaining > 0 && target > r.ky && !kyChot(target) && can("input.edit") ?
        btn("Lập khoản trừ nháp", "ghost", function () { prepareDeficit(r, target, remaining); }) : "";
      return { "Kỳ phát sinh": r.ky, "Mã NV": r.ma, "Họ và tên": r.name, "Còn thiếu lúc chốt": r.amount,
        "Đã trừ qua kỳ chốt": r.recovered, "Đang chờ chốt": r.pending, "Còn có thể xử lý": remaining, "Thao tác": actions };
    });
    var body = h("div", {}, [h("p", { class: "hint", text: "Chọn kỳ xử lý trên thanh Kỳ lương (" + target +
      "). Khoản thiếu chỉ được trừ khi có chứng từ Thưởng / Trừ do người dùng lập và kỳ xử lý được chốt." }), simpleTable(rows)]);
    if ((db._yearArchives || []).some(function (ref) { return ref.active && !Array.isArray(ref.deficits); })) body.appendChild(h("p", { class: "warn", text: "Có hồ sơ năm được lưu bằng bản cũ chưa có số dư theo dõi. Nếu cần đối chiếu khoản thiếu của năm đó, đưa hồ sơ về vùng đang làm rồi lưu trữ lại." }));
    if (reg.errors.length) body.appendChild(h("div", { class: "warn", text: reg.errors.join(" | ") }));
    modal("Theo dõi khoản khấu trừ còn thiếu", body, function (close) { return [btn("Đóng", "", close)]; }, { wide: true });
  }
  function prepareDeficit(debt, target, maximum) {
    var no = PLG.deficitVoucher(debt.ky, target);
    askText("Lập khoản trừ nháp", "Kỳ xử lý " + target + " · giới hạn " + fmt(maximum) + " đ.\nKiểm tra tại Thưởng / Trừ rồi tính lại.", { label: "Số tiền (đồng)", required: true }, function (value) {
      var amount = VAL.parseMoney(value), latest = PLG.deficitRegister(db).rows.find(function (r) { return r.ky === debt.ky && r.ma === debt.ma; });
      if (!latest || kyStr() !== target || kyChot(target) || !Number.isInteger(amount) || amount <= 0 || amount > latest.amount - latest.recovered - latest.pending) {
        alert("Số tiền hoặc kỳ xử lý không còn hợp lệ."); return;
      }
      var row = { "Ngày hạch toán": target + "-01", "Mã NV": debt.ma, "Số chứng từ": no,
        "Diễn giải": "Xử lý khoản khấu trừ còn thiếu kỳ " + debt.ky, "Trừ khác": amount };
      var plan = REPO.plan("insert", "psluong", null, row);
      if (!plan.ok) { alert(plan.msg); return; }
      if (!txn(["psluong"], function () { return !!commit(plan); })) { alert(lastTxnError); return; }
      st.tab = "psluong"; saveUi(); render();
      toast("Đã lập khoản trừ. Kiểm tra chứng từ rồi tính lại kỳ " + target + ".");
    });
  }

  function moChot(ky) {
    var c = kyChot(ky); if (!c || !need("payroll.reopen")) return;
    askText("Mở chốt " + kyLabel(ky) + " (phiên bản " + (c.version || 1) + ")", "Bản chốt hiện tại KHÔNG bị xóa — được chuyển vào lịch sử chốt kỳ.\nDữ liệu kỳ được mở khóa để sửa, tính lại và chốt thành phiên bản mới.", { label: "Lý do mở chốt", required: true, multiline: true, okText: "🔓 Mở chốt" }, function (reason) {
    // P1: reopen() có rollbackReopen() riêng khi saveNow() thất bại — chỉ cảnh báo, không chặn, nếu
    // không tạo được bản sao lưu phòng hộ thêm này.
    var bkOk = !!backupNow("truoc-mo-chot");
    var hrec = CLS.reopen(db, ky, reason, { user: currentUser() }); audit("Mở chốt kỳ lương", ky + " v" + hrec.version + " — " + reason);
    if (!saveNow()) { CLS.rollbackReopen(db, hrec); db.auditlog.pop(); alert("Không mở chốt được vì chưa lưu được dữ liệu xuống đĩa."); render(); return; }
    st.kq = null; render(); toast("Đã mở chốt " + kyLabel(ky) + " — bản cũ lưu trong lịch sử" + (bkOk ? "" : " · ⚠ KHÔNG tạo được bản sao lưu phòng hộ trước khi mở chốt — kiểm tra dung lượng đĩa"));
    });
  }
  function doiChieu(chot) {
    var ky = chot.ky.split("-");
    var hienTai = tinhLuong(Number(ky[0]), Number(ky[1]), chot.quyChe || "1.7", chot.buTheoNgay || false);
    var blockers = (hienTai.inputErrors || []).concat(hienTai.nhapLieuChuaLuu || []);
    if (blockers.length) {
      alert("Chưa thể đối chiếu kỳ " + kyLabel(chot.ky) + ":\n" + blockers.join("\n"));
      return;
    }
    var rows = CLS.diffDetailed(chot.kq, hienTai).map(function (r) {
      return { "Mã NV": r["Mã NV"], "Họ và tên": r["Họ và tên"], "Chỉ tiêu": r["Chỉ tiêu"],
        "Đã chốt": r["Giá trị đang xem"], "Tính lại hôm nay": r["Giá trị tính lại"], "Chênh lệch": r["Chênh lệch"] };
    });
    var body = h("div");
    body.appendChild(h("div", { class: rows.length ? "warn" : "ok", text: rows.length ? rows.length + " chỉ tiêu thay đổi so với bảng lương đã chốt." : "Các chỉ tiêu đối chiếu khớp với bảng lương đã chốt." }));
    if (rows.length) body.appendChild(simpleTable(rows));
    modal("Đối chiếu " + kyLabel(chot.ky) + " với dữ liệu hiện tại", body, function (close) { return [btn("Đóng", "", close)]; });
  }
  function tabKyLuong() {
    var c = h("div", { class: "card" });
    c.appendChild(h("div", { class: "hint", text: "Các kỳ lương đã chốt được lưu nguyên bảng lương, BHXH, thuế TNCN tại thời điểm chốt — sửa hồ sơ hay danh mục về sau không làm thay đổi số đã chốt." }));
    var ky = kyStr(), snap = kyChot(ky), pending = snap ? [] : C.inputReview.pending(db, ky);
    var current = !snap && !pending.length && st.kq && st.kq.ky === ky && !st.kqStale ? st.kq : null;
    var summary = h("div", { class: "card", "data-payroll-period-summary": ky });
    summary.appendChild(h("h3", { text: kyLabel(ky) + (snap ? " · Đã chốt v" + (snap.version || 1) : " · Chưa chốt") }));
    function periodLink(label, screen, input) {
      return tabAllowed(screen) ? btn(label, "ghost", function () {
        if (input) {
          var parts = input.period.split("-").map(Number); st.nam = parts[0]; st.thang = parts[1];
          if (input.kind) st.pumpMode = input.kind;
        }
        st.tab = screen; saveUi(); render();
      }) : null;
    }
    if (snap) {
      var lines = payLines(), balances = PLG.outstanding(snap.kq.bangluong, lines, ky);
      var paid = lines.filter(function (line) { return line["Kỳ"] === ky && line["Trạng thái"] === PLG.TT.TRA; })
        .reduce(function (sum, line) { return sum + n0(line["Số tiền"]); }, 0);
      var due = balances.reduce(function (sum, row) { return sum + row.conPhaiTra; }, 0);
      summary.appendChild(h("p", { text: "Đã chi " + fmt(paid) + " đ · Còn phải trả " + fmt(due) + " đ" }));
      summary.appendChild(btn("Xem đối chiếu tiền đã chi", "", function () { viewPaidReconciliation(snap); }));
    } else {
      var blockers = current ? GATE.blockers(current) : null;
      summary.appendChild(h("p", { text: pending.length ? "Còn " + pending.length + " đầu vào nháp, cần lưu để tính lương." :
        blockers ? "Lỗi chặn theo lần tính hiện tại: " + blockers.length : "Chưa có kết quả kiểm tra cho dữ liệu hiện tại." }));
      var actions = pending.map(function (row) {
        var title = row.table === "chamcong" ? "Chấm công" : row.table === "sanluong" ? "Sản lượng" : "Ban dăm xuất hàng";
        return periodLink(title + " · " + row.period + (row.kind ? (row.kind === "team" ? " · theo tổ" : " · trực tiếp") : ""), row.table, row);
      });
      actions.push(periodLink("Tính lương", "luong"), periodLink("Kiểm tra bảng lương", "ktbl"));
      summary.appendChild(h("div", { class: "bar" }, actions));
    }
    c.appendChild(summary);
    c.appendChild(btn("Theo dõi khoản khấu trừ còn thiếu", "", showDeficitRegister));
    if (!db.kyluong.length) {
      c.appendChild(h("div", { class: "empty", text: db.kyluong_lichsu.length ? "Hiện không có kỳ đã chốt đang hiệu lực." : "Chưa chốt kỳ nào. Vào Tính lương rồi bấm Chốt kỳ lương." }));
    } else {
      var t = h("table"), tr = h("tr");
      ["Kỳ lương", "Phiên bản", "Ngày chốt", "Số NV", "Tổng thu nhập", "BH NLĐ", "Thuế TNCN", "Tổng thực lĩnh", "Toàn vẹn", "Ghi chú", ""].forEach(function (x, i) { tr.appendChild(h("th", { class: i >= 3 && i <= 7 ? "r" : "", text: x })); });
      t.appendChild(h("thead", {}, [tr])); var tb = h("tbody");
      db.kyluong.forEach(function (k) {
        var bl = k.kq.bangluong, sm = function (f) { return bl.reduce(function (a, x) { return a + (+x[f] || 0); }, 0); };
        var go = function () { var m = k.ky.split("-"); st.nam = +m[0]; st.thang = +m[1]; st.tab = "luong"; st.kq = null; saveUi(); render(); };
        var x = h("tr", { class: "click", on: { click: go } });
        [kyLabel(k.ky), "v" + (k.version || 1), fmtTime(k.ngayChot)].forEach(function (v) { x.appendChild(h("td", { class: "t", text: v })); });
        [bl.length, sm("Tổng thu nhập"), sm("BH trừ NLĐ"), sm("Thuế TNCN"), sm("Thực lĩnh")].forEach(function (v, i) { x.appendChild(h("td", { class: "r", text: fmt(v), style: i === 4 ? "font-weight:700" : "" })); });
        var vf = CLS.verify(k);
        x.appendChild(h("td", { class: "t", html: vf === "ok" ? "<span class='tag on'>Nguyên vẹn</span>" : vf === "legacy" ? "<span class='tag'>Bản cũ</span>" : "<span class='tag off'>BỊ SỬA</span>" }));
        x.appendChild(h("td", { class: "t", text: [k.ghiChu, payrollApprovalInfo(k)].filter(Boolean).join(" · ") }));
        x.appendChild(h("td", { style: "text-align:right;white-space:nowrap" }, [
          btn("Xem", "", function (e) { e.stopPropagation(); go(); }),
          btn("Đối chiếu đã chi", "", function (e) { e.stopPropagation(); viewPaidReconciliation(k); }),
          btn("⬇ Excel", "", function (e) { e.stopPropagation(); exportAll(k.kq, k.ky); }),
          btn("PDF trọn kỳ", "", function (e) { e.stopPropagation(); exportPayrollBundlePdf(k.kq, k.ky); }),
          btn("⬇ PDF", "", function (e) {
            e.stopPropagation(); var m = k.ky.split("-");
            exportSheetsPdf({ title: "Bảng lương kỳ đã chốt", ky: "Kỳ " + (+m[1]) + "/" + m[0] + " · v" + (k.version || 1), trangThai: "Đã chốt " + fmtTime(k.ngayChot) + (CLS.verify(k) === "ok" ? " · nguyên vẹn" : ""), loc: [], sheets: [{ name: "BangLuong_" + k.ky, rows: addTotal(k.kq.bangluong.map(function (r) { var o = {}; COLS_COMPACT.forEach(function (c) { o[c] = r[c] == null ? "" : r[c]; }); return o; })) }] }, "BangLuongDaChot_" + k.ky + "_v" + (k.version || 1) + ".pdf");
          }, "PDF bảng lương đúng như lúc chốt"),
          btn("Mở chốt", "red ghost", function (e) { e.stopPropagation(); moChot(k.ky); })]));
        tb.appendChild(x);
      });
      t.appendChild(tb); c.appendChild(h("div", { class: "tw" }, [t]));
    }
    if (db.kyluong_lichsu.length) {
      c.appendChild(h("h3", { text: "🕘 Lịch sử các lần mở chốt", style: "margin-top:18px" }));
      c.appendChild(h("div", { class: "hint", text: "Bản chốt cũ được giữ lại nguyên vẹn khi mở chốt — dùng để đối chiếu trước/sau điều chỉnh." }));
      var hrows = db.kyluong_lichsu.slice().sort(function (a, b) { return a.ky < b.ky ? 1 : (a.ky > b.ky ? -1 : (b.version || 0) - (a.version || 0)); }).map(function (k) {
        var t2 = k.totals || CLS.totals(k.kq);
        return { "Kỳ": kyLabel(k.ky), "Phiên bản": "v" + (k.version || 1), "Chốt lúc": fmtTime(k.ngayChot), "Mở chốt lúc": fmtTime(k.moChot && k.moChot.luc), "Lý do mở chốt": (k.moChot && k.moChot.lyDo) || "", "Phê duyệt": payrollApprovalInfo(k), "Số NV": t2.soNV, "Tổng thực lĩnh": t2.thucLinh };
      });
      c.appendChild(simpleTable(hrows));
      var cur = h("div", { class: "bar", style: "margin-top:8px" });
      db.kyluong_lichsu.forEach(function (k) {
        var c2 = kyChot(k.ky); if (!c2) return;
        cur.appendChild(btn("↔ So sánh " + kyLabel(k.ky) + " v" + (k.version || 1) + " → v" + (c2.version || "?"), "", function () {
          var rows = CLS.diff(k.kq, c2.kq);
          var body = h("div"); body.appendChild(h("div", { class: rows.length ? "warn" : "ok", text: rows.length ? rows.length + " nhân viên thay đổi thực lĩnh" : "Không có chênh lệch thực lĩnh" }));
          if (rows.length) body.appendChild(simpleTable(addTotal(rows)));
          modal("Trước / sau điều chỉnh — " + kyLabel(k.ky), body, function (close) { return [btn("⬇ Excel", "", function () { if (rows.length) saveXlsx("DieuChinh_" + k.ky + ".xlsx", [{ name: "TruocSau", cols: Object.keys(rows[0]), rows: rows }]); }), btn("Đóng", "", close)]; });
        }));
      });
      c.appendChild(cur);
    }
    return c;
  }
  // ---------- BÁO CÁO LƯƠNG ----------
  // Kết quả lương của 1 kỳ: kỳ đã chốt lấy bản đã lưu, chưa chốt thì tính tạm
  var kqMemo = null;
  function kqKy(nam, thang) {
    var c = kyChot(kyKey(nam, thang));
    if (c) return { kq: c.kq, chot: true };
    if (!db.nhanvien.length) return { kq: { bangluong: [], bhxh: [], tncn: [], canhbao: [] }, chot: false };
    // V9.4: đổi bộ lọc / tab báo cáo KHÔNG tính lại engine — chỉ tính lại khi dữ liệu, quy chế hoặc cách bù đổi
    var mk = [nam, thang, dbRev, st.bu, quyChe()].join("|");
    if (!kqMemo || kqMemo.key !== mk) kqMemo = { key: mk, val: tinhLuong(nam, thang) };
    return { kq: kqMemo.val, chot: false };
  }

  var BCL = [
    ["cong", "🗓 Tổng hợp công"], ["sanluong", "⚖ Phân bổ sản lượng"],
    ["baohiem", "🛡 Báo cáo bảo hiểm"], ["hachtoan", "📒 Bảng hạch toán"], ["sosanh", "↔ So sánh với kỳ trước"],
    ["thang", "📅 Lương 12 tháng"], ["nvnam", "👤 Thu nhập năm theo NV"], ["thuenam", "🧾 Thuế TNCN cả năm"]
  ];
  var BCL_NAM = { thang: 1, nvnam: 1, thuenam: 1 };

  function bcCong(nam, thang) {
    var snapshot = kyChot(kyKey(nam, thang));
    if (!snapshot) return C.periodReports.bcCong(db.chamcong, nam, thang, tenNV);
    var names = new Map(snapshot.kq.bangluong.map(function (r) { return [r["Mã NV"], r["Họ và tên"]]; }));
    return C.periodReports.bcCong(snapshot.input?.data?.chamcong || [], nam, thang, function (ma) { return names.get(ma) || ""; });
  }
  /**
   * (α19) Phân bổ sản lượng / bơm dăm của kỳ — như công cụ "Phân bổ khối lượng tính lương":
   * phiếu ghi Mã phòng ban → chia đều cho tổ (trừ NV vắng); phiếu ghi Mã NV → giao trực tiếp.
   */
  function pbAlloc(nam, thang, loai) {
    var PA = C.palloc, k = HRM.sanLuongKy(db, nam, thang, loai), cache = {};
    var pbOf = function (ma, d) { var key = ma + "\u0001" + d; if (!(key in cache)) { var hh = HRM.hienHanh(db, ma, d); cache[key] = hh.pb || ""; } return cache[key]; };
    var tenPB = function (pb) { return HRM.refName(db, "dm_phongban", pb) || ""; };
    var al = PA.withDirect(k.alloc, k.direct.map(function (r) { return { phieu: r["Phiếu cân"] || "", ngay: String(r["Ngày cân"] || "").slice(0, 10), kl: r["KL hàng (Tấn)"], ma: r["Mã NV"] }; }), pbOf, tenNV, tenPB);
    var sp = HRM.staffForPayroll(db, nam, thang), cnt = {};
    sp.list.forEach(function (x) { if (x["Mã PB"]) cnt[x["Mã PB"]] = (cnt[x["Mã PB"]] || 0) + 1; });
    al.empCount = cnt; al.chuaGan = k.chuaGan; al.raw = (db[loai] || []).filter(function (r) { return VAL.rowPeriod(loai, r) === kyKey(nam, thang); });
    return al;
  }
  function inputReportSource(table, ky, kind) {
    if (kyChot(ky)) return "Đã chốt · dữ liệu lưu khi chốt";
    var counts = C.inputReview.summary(db, table, ky).filter(function (item) { return !kind || item.kind === kind; });
    if (!counts.some(function (item) { return item.current || item.previousOnly; })) return "Chưa có dữ liệu trong kỳ";
    if (!counts.some(function (item) { return item.draft || item.previousOnly; })) return "Đã lưu để tính lương · kỳ chưa chốt";
    return "Nháp · dữ liệu hiện hành · " + counts.map(function (item) {
      var kind = item.kind === "team" ? "Theo tổ: " : item.kind === "direct" ? "Trực tiếp: " : "";
      return kind + item.approved + " dòng đã lưu giữ nguyên, " + item.draft + " dòng nháp" + (item.previousOnly ? ", " + item.previousOnly + " dòng bản lưu cũ đã sửa/xóa" : "");
    }).join(" · ");
  }
  function allocationReportSource(table, ky) {
    var source = inputReportSource(table, ky);
    if (!kyChot(ky) && C.inputReview.changed(db, "chamcong", ky, "")) {
      return "Phiếu: " + source + " | Chấm công dùng để chia: " + inputReportSource("chamcong", ky);
    }
    return source;
  }
  function reportAllocation(nam, thang, loai) {
    var snapshot = kyChot(kyKey(nam, thang));
    if (!snapshot) return pbAlloc(nam, thang, loai);
    return snapshot.input?.payrollReports?.production?.find(function (g) { return g.type === loai; })?.allocation || null;
  }
  function confirmProductionAttendance(visible, allocation, selectedTable) {
    if (!need("input.edit") || kyChot(kyStr())) return;
    var service = C.productionAttendance, period = kyStr(), revision = dbRev, candidates = new Map();
    allocation.attendanceReview.forEach(function (receipt) {
      if (!visible.some(function (row) { return row["Phiếu cân"] === receipt.phieu && row["Ngày cân"] === receipt.ngay && row["Mã phòng ban"] === receipt.maPB; })) return;
      receipt.employees.forEach(function (employee) {
        var row = { date: receipt.ngay, team: receipt.maPB, employee: employee.ma };
        candidates.set(service.key(row), { row: row, name: employee.hoTen });
      });
    });
    var body = h("div"), list = h("div"), checked = new Map();
    candidates.forEach(function (item, key) {
      var box = h("input", { type: "checkbox" }); checked.set(key, box);
      list.appendChild(h("label", { class: "fld" }, [box, item.row.date + " · " + item.row.team + " · " + item.row.employee + " — " + item.name]));
    });
    var reason = h("textarea", { class: "i", "aria-label": "Lý do xác nhận", placeholder: "Lý do, ví dụ Làm ca dài qua ngày" });
    body.appendChild(list); body.appendChild(reason);
    modal("Xác nhận có làm để chia sản lượng", body, function (close) {
      return [btn("Hủy", "", close), btn("Xem trước phân bổ", "pri", function () {
        if (kyStr() !== period || dbRev !== revision || kyChot(period)) { alert("Dữ liệu kỳ đã thay đổi. Mở lại bảng đối chiếu."); return; }
        var rows = Array.from(candidates).filter(function (entry) { return checked.get(entry[0]).checked; }).map(function (entry) {
          return Object.assign({}, entry[1].row, { reason: reason.value.trim(), user: session.tenDangNhap.toLowerCase() });
        });
        if (!rows.length || !reason.value.trim()) { alert("Chọn nhân viên và ghi lý do."); return; }
        var next = Object.assign({}, db, { productionAttendance: (db.productionAttendance || []).concat(rows) });
        var issue = service.checkChanges(db, next, { user: session.tenDangNhap, perms: ["input.edit"] });
        if (issue) { alert(issue); return; }
        var all = ["sanluong", "bandam"], pairs = new Map();
        all.forEach(function (table) {
          pairs.set(table, [HRM.sanLuongKy(db, st.nam, st.thang, table).alloc.audit, HRM.sanLuongKy(next, st.nam, st.thang, table).alloc.audit]);
        });
        var affected = new Map();
        service.affected(db, rows).forEach(function (match) {
          var r = match.receipt, key = JSON.stringify([r.table, r.phieu, r.ngay, r.maPB]);
          if (affected.has(key)) return;
          var matches = function (item) { return item.phieu === r.phieu && item.ngay === r.ngay && item.maPB === r.maPB; };
          var pair = pairs.get(r.table), before = pair[0].find(matches), after = pair[1].find(matches);
          if (!before || !after) return;
          affected.set(key, { "Bảng": ALL[r.table].ten, "Phiếu": r.phieu, "Ngày": r.ngay, "Tổ": r.maPB,
            "Người chia trước": before.names.join(", "), "Người chia sau": after.names.join(", "),
            "Số người trước": before.soNguoi, "Số người sau": after.soNguoi, "Phần mỗi người trước": before.share, "Phần mỗi người sau": after.share });
        });
        close();
        modal("Xem trước tất cả phiếu bị ảnh hưởng — " + ALL[selectedTable].ten, simpleTable(Array.from(affected.values())), function (done) {
          return [btn("Hủy", "", done), btn("Lưu xác nhận", "pri", function () {
            if (kyStr() !== period || dbRev !== revision || kyChot(period)) { alert("Dữ liệu kỳ đã thay đổi. Mở lại bảng đối chiếu."); return; }
            var detail = rows.map(function (row) { return row.employee + " · " + row.date + " · " + row.team; }).join("; ") + " · " + reason.value.trim();
            if (!REPO.saveWorkflowRows("productionAttendance", next.productionAttendance, "Xác nhận có làm để chia sản lượng", detail).ok) { alert(lastTxnError); return; }
            done(); render();
          })];
        }, { wide: true });
      })];
    }, { wide: true });
  }

  function bcSanLuong(nam, thang, loai, allocation) {
    return C.periodReports.bcSanLuong(allocation || reportAllocation(nam, thang, loai), loai);
  }
  /** File Excel "Phân bổ khối lượng tính lương" — bố cục như công cụ (ExcelJS). */
  function exportPBKL(nam, thang) {
    if (!need("export", "xuất dữ liệu ra Excel")) return;
    if (!window.ExcelJS || !window.HAKUi) { alert("Thiếu thư viện Excel (ExcelJS)"); return; }
    var sl = reportAllocation(nam, thang, "sanluong"), bd = reportAllocation(nam, thang, "bandam"), src = kqKy(nam, thang);
    if (!sl || !bd) { alert("Bản chốt cũ thiếu chi tiết phân bổ để xuất bộ toàn kỳ. Xem dữ liệu đã lưu ở Kỳ lương đã chốt."); return; }
    var snapshot = src.chot ? kyChot(kyKey(nam, thang)) : null;
    var saved = (snapshot && snapshot.input) || {};
    var catalog = snapshot ? (saved.danhmuc || {}) : db;
    var hours = snapshot ? ((saved.data || {}).chamcong || []) : db.chamcong;
    var rules = window.HAKUi.pbklRules.resolve(E, catalog, nam, thang, { need: (bd.audit && bd.audit.length) ? ["SP", "BD"] : ["SP"] }); // đơn giá/mức sàn/ngưỡng theo hiệu lực của kỳ (không chọn dòng đầu/cuối)
    var bc = {}; hours.filter(function (r) { return r["Kỳ"] === kyKey(nam, thang) && String(r["Hình thức công"] || "BT").toUpperCase() === "BT"; })
      .forEach(function (r) { for (var d = 1; d <= new Date(nam, thang, 0).getDate(); d++) bc[r["Mã NV"]] = (bc[r["Mã NV"]] || 0) + E.tachCong(r[("0" + d).slice(-2)]).soCong; });
    var rows = src.kq.bangluong.filter(function (b) { return n0(b["Lương sản lượng"]) || n0(b["Lương bơm dăm"]) || n0(b["Lương bù SL"]) || n0(b["Sản lượng (tấn)"]) || n0(b["Số xe bơm dăm"]); })
      .map(function (b) { var pb = b["Mã PB"] || ""; return { maPB: pb, tenPB: b["Phòng ban"] || pb, ma: b["Mã NV"], hoTen: b["Họ và tên"], soCong: b._ct && b._ct.congBT != null ? b._ct.congBT : (bc[b["Mã NV"]] ?? (snapshot && !Array.isArray((saved.data || {}).chamcong) ? null : 0)), tan: n0(b["Sản lượng (tấn)"]), xe: n0(b["Số xe bơm dăm"]), luongSL: n0(b["Lương sản lượng"]), luongBD: n0(b["Lương bơm dăm"]), bu: n0(b["Lương bù SL"]), tong: n0(b["Lương sản lượng"]) + n0(b["Lương bơm dăm"]) + n0(b["Lương bù SL"]) }; });
    var coChe = src.chot ? String(snapshot.buTheoNgay || false) : String(st.bu);
    // Master Prompt V3 mục XVII: chi tiết bù lương Đại Hiệp theo NGÀY bậc thang (chỉ khi đúng cơ chế này)
    var daihiepDetail = null;
    if (!snapshot && coChe === "daihiep") {
      var sp2 = HRM.staffForPayroll(db, nam, thang), slK2 = HRM.sanLuongKy(db, nam, thang, "sanluong");
      var chiTiet = E.chiTietBuNgayDaiHiep(Object.assign({}, db, { nhansu: sp2.list, sanluong: slK2.rows }), nam, thang);
      if (chiTiet.length) daihiepDetail = chiTiet.map(function (x) { return Object.assign({ tenPB: HRM.refName(db, "dm_phongban", x.maPB) || x.maPB }, x); });
    }
    var company = snapshot ? (catalog.congty || [])[0] || {} : congTy();
    var meta = { donVi: company["Tên công ty"] || "", thang: "Tháng " + thang + "/" + nam, nguoiLap: session ? session.hoTen : "" };
    var attendanceReview = [["sanluong", sl, "Sản lượng"], ["bandam", bd, "Ban dăm xuất hàng"]].flatMap(function (item) {
      return bcSanLuong(nam, thang, item[0], item[1]).attendanceReview.map(function (r) {
        return Object.assign({ "Loại": item[2] }, r);
      });
    });
    var wb = window.HAKUi.pbkl.report(window.ExcelJS, { sl: sl, bd: bd, raw: { sl: sl.raw, bd: bd.raw },
      luong: rows.length ? { rows: rows, coChe: coChe, note: (src.chot ? "Số liệu lấy từ bảng lương ĐÃ CHỐT." : "Kỳ CHƯA chốt — số liệu tính tạm.") + " Số công = công BT trong chấm công." } : null,
      daihiepDetail: daihiepDetail, attendanceReview: attendanceReview,
      ctx: { coChe: coChe, chot: src.chot, source: allocationReportSource("sanluong", kyKey(nam, thang)) + " | Ban dăm xuất hàng: " + inputReportSource("bandam", kyKey(nam, thang)), giaKl: rules.giaKl, giaBd: rules.giaBd, mucSan: rules.mucSan, nguong: rules.nguong, rules: rules, soNgay: new Date(nam, thang, 0).getDate() } }, meta);
    wb.xlsx.writeBuffer().then(function (buf) {
      download("Phan_bo_khoi_luong_" + kyKey(nam, thang) + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
      audit("Xuất Excel phân bổ khối lượng", kyLabel(kyKey(nam, thang)));
    }, function (e) { alert("Không tạo được file: " + e.message); });
  }
  /** File mẫu phiếu cân / bơm dăm như công cụ (ExcelJS) */
  function downloadPBTemplate(key) {
    if (!window.ExcelJS || !window.HAKUi) { downloadTemplate(key); return; }
    var wb = window.HAKUi.pbkl.template(window.ExcelJS, key, { donVi: congTy()["Tên công ty"] || "", thang: "Tháng " + st.thang + "/" + st.nam, mau: "01/" + ("0" + st.thang).slice(-2) + "/" + st.nam });
    wb.xlsx.writeBuffer().then(function (buf) { download(key === "bandam" ? "mau_bang_bom_ban_dam.xlsx" : "mau_bang_khoi_luong.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf); });
  }
  function bcHachToan(r, nam, thang) { return C.periodReports.bcHachToan(r, nam, thang, kyChot(kyKey(nam, thang)), db.dm_phongban, payLines()); }
  function bcSoSanh(nam, thang) { return C.periodReports.bcSoSanh(nam, thang, kqKy); }
  function chotTrongNam(nam) { return db.kyluong.filter(function (k) { return k.ky.slice(0, 4) === String(nam); }).sort(function (a, b) { return a.ky < b.ky ? -1 : 1; }); }
  function bc12Thang(nam) { return C.periodReports.bc12Thang(nam, kyChot); }
  function bcNVNam(nam, field) { return C.periodReports.bcNVNam(chotTrongNam(nam), field); }
  function bcThueNam(nam) { return C.periodReports.bcThueNam(chotTrongNam(nam)); }

  function tabBaoCaoLuong() {
    var w = h("div"), bar = h("div", { class: "bar" });
    if (!BCL.some(function (b) { return b[0] === st.bcl; })) st.bcl = "cong";
    BCL.forEach(function (b) { bar.appendChild(btn(b[1], st.bcl === b[0] ? "pri" : "", function () { st.bcl = b[0]; render(); })); });
    [["rp_pb", "Tổng hợp theo phòng ban"], ["rp_soct", "Sổ chứng từ thanh toán"]].forEach(function (link) {
      if (tabAllowed(link[0])) bar.appendChild(btn(link[1] + " ↗", "ghost", function () {
        st.tab = link[0]; saveUi(); render();
      }));
    });
    w.appendChild(bar);
    var card = h("div", { class: "card" }), tools = h("div", { class: "bar" }), sheets = [], title = BCL.filter(function (b) { return b[0] === st.bcl; })[0][1].replace(/^\S+\s/, "");
    card.appendChild(tools);
    var rfHint = h("div", { class: "hint", "data-rf-hint": "1" }), rfSkip = {};
    if (st.bcl !== "sanluong") card.appendChild(reportFilterBar(kqKy(st.nam, st.thang).kq.bangluong));
    card.appendChild(rfHint);
    /** Lọc 1 bảng báo cáo theo bộ lọc dùng chung (chỉ tiêu chí mà bảng có cột); dòng tổng tính lại sau lọc */
    function FX(rows) {
      var g = RF.applyGeneric(rows, st.rf); g.skipped.forEach(function (x) { rfSkip[x] = 1; });
      if (!g.filtered) return rows;
      var lab = g.hadTotal ? String(rows[rows.length - 1][Object.keys(rows[rows.length - 1])[0]]) : "";
      return g.hadTotal && g.rows.length ? addTotal(g.rows, lab) : g.rows;
    }
    var nam = st.nam, thang = st.thang, snapshot = kyChot(kyKey(nam, thang)), info = function (t, cls) { card.appendChild(h("div", { class: cls || "hint", html: t })); };
    if (BCL_NAM[st.bcl]) {
      var ks = chotTrongNam(nam);
      info("Năm <b>" + nam + "</b> (đổi năm ở ô Kỳ lương phía trên). Báo cáo cả năm chỉ cộng các <b>kỳ đã chốt</b>: " + (ks.length ? ks.map(function (k) { return "T" + (+k.ky.slice(5)); }).join(", ") : "chưa có kỳ nào") + ".", ks.length ? "hint" : "warn");
    } else {
      var src = st.bcl === "cong" || st.bcl === "sanluong" ? null : kqKy(nam, thang);
      if (src) info(src.chot ? "🔒 Số liệu kỳ <b>" + thang + "/" + nam + "</b> lấy từ bảng lương <b>đã chốt</b>." : "⚠ Kỳ <b>" + thang + "/" + nam + "</b> <b>chưa chốt</b> — số liệu tính tạm từ dữ liệu hiện tại, có thể thay đổi.", src.chot ? "locked" : "warn");
    }
    var dataSource = st.bcl === "cong" ? inputReportSource("chamcong", kyKey(nam, thang)) : "";
    if (dataSource) info(esc(dataSource));
    if (st.bcl === "cong") { var r2 = FX(bcCong(nam, thang)); if (snapshot && !Array.isArray(snapshot.input?.data?.chamcong)) info("Bản chốt cũ thiếu dữ liệu chấm công.", "warn"); info("Tổng hợp từ bảng chấm công kỳ " + thang + "/" + nam + ". Ngày có nhãn: VD QC×7 = 7 ngày công tác QC."); card.appendChild(simpleTable(r2)); sheets.push({ name: "TongHopCong", rows: r2 }); }
    else if (st.bcl === "sanluong") {
      st.bclLoai = st.bclLoai || "sanluong";
      var ls = h("select"); [["sanluong", "Sản lượng gỗ (tấn)"], ["bandam", "Ban dăm xuất hàng (số xe)"]].forEach(function (o) { ls.appendChild(h("option", { value: o[0], text: o[1] })); });
      ls.value = st.bclLoai; ls.addEventListener("change", function () { st.bclLoai = ls.value; render(); }); tools.appendChild(ls);
      var allocation = reportAllocation(nam, thang, st.bclLoai);
      if (!allocation) {
        info("Bản chốt cũ thiếu chi tiết phân bổ để dựng báo cáo này. Xem dữ liệu đã lưu ở Kỳ lương đã chốt.", "warn");
        w.appendChild(card);
        return w;
      }
      var r3 = bcSanLuong(nam, thang, st.bclLoai, allocation);
      dataSource = allocationReportSource(st.bclLoai, kyKey(nam, thang));
      info(esc(dataSource));
      info("Phân bổ cho biết ai nhận, ai không nhận và phần chưa phân bổ. Tổng phiếu gốc và tổng phân bổ cùng nguồn, không cộng lại.");
      var receiptRows = r3.al.attendanceReview.flatMap(function (receipt, index) {
        return receipt.employees.map(function (e) {
          return { index: index, "Mã NV": e.ma, "Họ và tên": e.hoTen + " " + receipt.phieu,
            "Phòng ban": HRM.refName(snapshot ? (snapshot.input?.danhmuc || {}) : db, "dm_phongban", receipt.maPB) || receipt.maPB };
        });
      });
      tools.appendChild(btn("⬇ Xuất bộ phân bổ toàn kỳ", "", function () { exportPBKL(nam, thang); },
        "Toàn kỳ: sản lượng và Ban dăm xuất hàng, không áp dụng bộ lọc đang xem"));
      info("Excel/PDF đang xem xuất loại đã chọn và giữ bộ lọc của bảng đối chiếu chấm công. Bộ phân bổ toàn kỳ xuất cả sản lượng và Ban dăm xuất hàng.");

      info("Phiếu ghi <b>Mã phòng ban</b> (tổ) → chia đều cho người của tổ đang làm việc ngày cân, trừ người trong <b>NV vắng</b> (như công cụ phân bổ khối lượng). Phiếu ghi <b>Mã NV</b> → giao trực tiếp. Cách bù lương đang chọn ở Tính lương: <b>" + esc(buLabel(snapshot ? snapshot.buTheoNgay : st.bu)) + "</b>.");
      if (r3.warnings.length) card.appendChild(h("div", { class: "warn", html: "<b>⚠ Cần kiểm tra (" + r3.warnings.length + "):</b><br>" + r3.warnings.map(esc).join("<br>") }));
      card.appendChild(h("div", { class: "fh", text: "Theo phòng ban (tổ)" })); card.appendChild(simpleTable(r3.pb));
      card.appendChild(h("div", { class: "fh", text: "Theo công nhân" })); card.appendChild(simpleTable(r3.nv));
      card.appendChild(h("div", { class: "fh", text: "Đối soát từng phiếu" }));
      var origin = st.bclLoai === "bandam" ? "rp_bd" : "rp_sl", originType = OPS_SCREENS[origin];
      var linkedAudit = tabAllowed(origin) ? r3.audit.map(function (row) {
        if (!row["Phiếu"] || !row["Ngày"]) return row;
        return Object.assign({}, row, { "Phiếu": btn(row["Phiếu"], "ghost", function () {
          st.opsReceipt = { type: originType, number: String(row["Phiếu"]).trim(), date: String(row["Ngày"]).slice(0, 10), ky: kyKey(nam, thang) };
          st.opsKw = ""; st.opsPB = ""; st.tab = origin; saveUi(); render();
        }, "Xem phiếu gốc " + row["Phiếu"]) });
      }) : r3.audit;
      card.appendChild(simpleTable(linkedAudit));
      if (r3.chuaGan.length) { card.appendChild(h("div", { class: "warn", html: "<b>⚠ " + r3.chuaGan.length + " phiếu cân chưa có Mã NV hoặc Mã phòng ban</b> — chưa được tính lương cho ai:" })); card.appendChild(simpleTable(r3.chuaGan)); }
      if (r3.attendanceReview.length) {
        var reviewFilter = reportFilterBar(receiptRows, { compact: true, showEmployees: true, screenId: "phieu-doi-chieu", searchPlaceholder: "Tìm phiếu, mã hoặc tên người cần kiểm tra…" });
        var matchingReceipts = new Set(FX(receiptRows).map(function (row) { return row.index; }));
        var fields = [["receipt", "Số phiếu"], ["plate", "Biển số xe"], ["team", "Mã tổ"], ["date", "Ngày phân bổ"]];
        if (st.bclLoai === "bandam") fields.push(["quantity", "Số lượng xe"]);
        var filters = st.attendanceReceiptFilters || {}, controls = {}, filterBar = h("form", { class: "bar" });
        fields.forEach(function (field) {
          var input = h("input", { class: "i", type: field[0] === "date" ? "date" : field[0] === "quantity" ? "number" : "text",
            "aria-label": field[1], placeholder: field[1], value: filters[field[0]] || "" });
          if (field[0] === "quantity") { input.min = "0"; input.step = "any"; }
          controls[field[0]] = input;
          filterBar.appendChild(h("label", { class: "fld" }, [field[1], input]));
        });
        filterBar.appendChild(h("button", { type: "submit", class: "pri", text: "Lọc phiếu" }));
        filterBar.appendChild(btn("Xóa bộ lọc phiếu", "ghost", function (event) {
          event.preventDefault(); st.attendanceReceiptFilters = {}; render();
        }));
        filterBar.addEventListener("submit", function (event) {
          event.preventDefault();
          st.attendanceReceiptFilters = {};
          fields.forEach(function (field) { st.attendanceReceiptFilters[field[0]] = controls[field[0]].value.trim(); });
          render();
        });
        var original = new Map((r3.al.raw || []).map(function (row) {
          return [[String(row["Phiếu cân"] || "").trim(), VAL.normDate(row["Ngày cân"]), String(row["Mã phòng ban"] || "").trim()].join("|"), row];
        }));
        function contains(value, query) { return !query || String(value || "").toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")); }
        var visibleReview = r3.attendanceReview.map(function (row, index) {
          var key = [String(row["Phiếu cân"] || "").trim(), row["Ngày cân"], row["Mã phòng ban"]].join("|");
          var receipt = original.get(key);
          return { index: index, row: Object.assign({ "Biển số xe": receipt ? receipt["Biển số"] || "" : "" }, row) };
        }).filter(function (entry) {
          var row = entry.row;
          return matchingReceipts.has(entry.index) && contains(row["Phiếu cân"], filters.receipt) &&
            contains(row["Biển số xe"], filters.plate) && contains(row["Mã phòng ban"], filters.team) &&
            (!filters.date || filters.date === row["Ngày cân"]) &&
            (st.bclLoai !== "bandam" || !filters.quantity || Number(filters.quantity) === row["KL / số xe"]);
        }).map(function (entry) { return entry.row; });
        card.appendChild(h("div", { class: "fh", text: "Phiếu cần đối chiếu chấm công" }));
        card.appendChild(h("p", { class: "hint", text: "Người có ô chấm công ghi bằng 0 hoặc để trống và chưa có tên hoặc mã trong NV vắng. Kiểm tra chấm công trước khi điều chỉnh." }));
        card.appendChild(filterBar);
        card.appendChild(reviewFilter);
        if (Object.keys(rfSkip).length) card.appendChild(h("div", { class: "hint", text: "Tiêu chí không áp dụng cho bảng này: " + Object.keys(rfSkip).join(", ") }));
        var actionableReview = visibleReview.map(function (row) {
          var entry = r3.al.attendanceReview.find(function (item) {
            return item.phieu === row["Phiếu cân"] && item.ngay === row["Ngày cân"] && item.maPB === row["Mã phòng ban"];
          });
          var actions = [];
          if (tabAllowed(origin)) actions.push(btn("Mở phiếu cân", "ghost", function () {
            st.opsReceipt = { type: originType, number: String(row["Phiếu cân"]).trim(), date: row["Ngày cân"], ky: kyKey(nam, thang) };
            st.opsKw = ""; st.opsPB = ""; st.tab = origin; saveUi(); render();
          }));
          if (!snapshot && entry && tabAllowed("chamcong")) entry.employees.forEach(function (employee) {
            actions.push(btn("Mở công " + employee.ma, "ghost", function () {
              st.rf = RF.normalize({ maNV: [employee.ma] });
              st.attendanceReviewDay = row["Ngày cân"];
              st.tab = "chamcong"; saveUi(); render();
            }));
          });
          return Object.assign({}, row, { "Thao tác": h("div", { class: "bar" }, actions) });
        });
        var reviewTable = visibleReview.length ? simpleTable(actionableReview) : h("div", { class: "empty", text: "Không có phiếu khớp bộ lọc." });
        reviewTable.classList.add("attendance-review-table");
        card.appendChild(reviewTable);
        if (!snapshot && visibleReview.length && can("input.edit")) card.appendChild(btn("Xác nhận có làm", "pri", function () {
          confirmProductionAttendance(visibleReview, r3.al, st.bclLoai);
        }));
        sheets.push({ name: "DoiChieuChamCong", rows: visibleReview });
      }
      var recorded = ((snapshot ? snapshot.input?.data?.productionAttendance : db.productionAttendance) || []).filter(function (row) {
        return row.date.slice(0, 7) === kyKey(nam, thang);
      });
      if (recorded.length) {
        card.appendChild(h("div", { class: "fh", text: "Xác nhận làm ca dài đã lưu" }));
        card.appendChild(simpleTable(recorded.map(function (row) {
          return { "Ngày phân bổ": row.date, "Mã tổ": row.team, "Mã NV": row.employee, "Lý do": row.reason, "Người xác nhận": row.user,
            "Thao tác": !snapshot && can("input.edit") ? btn("Thu hồi", "ghost", function () {
              askText("Thu hồi xác nhận ca dài", row.employee + " · " + row.date + " · " + row.team, { label: "Lý do thu hồi", required: true }, function (reason) {
                var service = C.productionAttendance;
                var next = db.productionAttendance.filter(function (item) { return service.key(item) !== service.key(row); });
                var error = service.checkChanges(db, Object.assign({}, db, { productionAttendance: next }), { user: session.tenDangNhap, perms: ["input.edit"] });
                if (error) { alert(error); return; }
                if (!REPO.saveWorkflowRows("productionAttendance", next, "Thu hồi xác nhận ca dài", row.employee + " · " + row.date + " · " + row.team + " · " + reason).ok) { alert(lastTxnError); return; }
                render();
              });
            }) : "" };
        })));
      }
      sheets.push({ name: "TheoPhongBan", rows: r3.pb }, { name: "TheoCongNhan", rows: r3.nv }, { name: "DoiSoatPhieu", rows: r3.audit }, { name: "ChuaGanNguoi", rows: r3.chuaGan });
    }
    else if (st.bcl === "hachtoan") {
      var ht = bcHachToan(src.kq, nam, thang);
      info("Lương phải trả: <b>" + fmt(ht.phaiTra) + "</b> · Đã chi theo sổ chứng từ: <b>" + fmt(ht.daChi) + "</b> · Còn phải trả: <b>" + fmt(ht.conLai) + "</b>.");
      if (ht.fallback) info("Bản chốt cũ thiếu danh mục phòng ban. Tài khoản chi phí đang lấy từ danh mục hiện tại.", "warn");
      card.appendChild(simpleTable(addTotal(ht.rows)));
      if (Math.abs(ht.lech) >= 1) info("Chênh lệch giữa số phải trả sau khấu trừ và thực lĩnh = <b>" + fmt(ht.lech) + "</b> — do thực lĩnh được làm tròn đến 1.000đ hoặc thực lĩnh âm được để 0.", "warn");
      sheets.push({ name: "HachToan", rows: ht.rows });
    }
    else if (st.bcl === "baohiem") {
      // α18: chỉ cộng / so sánh bảng BHXH engine đã tính của kỳ (không tính lại) — báo cáo nội bộ, không thay mẫu D02-LT / C12-TS
      var pn = thang === 1 ? nam - 1 : nam, pt = thang === 1 ? 12 : thang - 1, prv = kqKy(pn, pt);
      var th = BHR.tongHop(src.kq), bd = BHR.bienDong(src.kq, prv.kq), pbB = BHR.theoPhongBan(src.kq), ctB = BHR.chiTiet(src.kq); bd = FX(bd); pbB = FX(pbB); ctB = FX(ctB);
      info("Số người đóng BH: <b>" + th.soNguoi + "</b>" + (th.chuaDuNguong ? " · <b>" + th.chuaDuNguong + "</b> người chưa đủ ngưỡng công (vẫn trừ khoản NLĐ đóng; truy thu " + fmt(th.truyThu) + ")" : "") + ". Báo cáo nội bộ để đối chiếu trước khi kê khai / nộp — <b>không thay mẫu chính thức</b> của cơ quan BHXH (D02-LT, C12-TS…).");
      card.appendChild(h("div", { class: "fh", text: "Tổng hợp theo khoản" })); card.appendChild(simpleTable(th.rows));
      if (Math.abs(th.lechNLD) >= 1) info("Chênh lệch làm tròn giữa 'Cộng BH NLĐ đóng' và tổng từng khoản: " + fmt(th.lechNLD) + "đ.", "warn");
      card.appendChild(h("div", { class: "fh", text: "Tăng / giảm / điều chỉnh so với tháng " + pt + "/" + pn + (prv.chot ? " (đã chốt)" : " (chưa chốt — tính tạm)") }));
      card.appendChild(bd.length ? simpleTable(bd) : h("div", { class: "hint", text: "Không có biến động so với kỳ trước." }));
      card.appendChild(h("div", { class: "fh", text: "Theo phòng ban" })); card.appendChild(simpleTable(pbB));
      card.appendChild(h("div", { class: "fh", text: "Chi tiết từng người" })); card.appendChild(simpleTable(ctB));
      sheets.push({ name: "TongHop", rows: th.rows }, { name: "TangGiam", rows: bd }, { name: "TheoPhongBan", rows: pbB }, { name: "ChiTiet", rows: ctB });
    }
    else if (st.bcl === "sosanh") { var ss = bcSoSanh(nam, thang); ss.rows = FX(ss.rows); info("So sánh <b>" + ss.prev + "</b> → <b>" + ss.cur + "</b>, sắp theo mức chênh lớn nhất."); card.appendChild(simpleTable(ss.rows)); sheets.push({ name: "SoSanh", rows: ss.rows }); }
    else if (st.bcl === "thang") { var r7 = bc12Thang(nam); card.appendChild(simpleTable(r7)); sheets.push({ name: "Luong12Thang", rows: r7 }); }
    else if (st.bcl === "nvnam") {
      st.bclF = st.bclF || "Thực lĩnh";
      var fs = h("select"); ["Thực lĩnh", "Tổng thu nhập", "Thuế TNCN", "BH trừ NLĐ", "KPCĐ trừ NLĐ", "Tổng công", "Tạm ứng"].forEach(function (f) { fs.appendChild(h("option", { value: f, text: f })); });
      fs.value = st.bclF; fs.addEventListener("change", function () { st.bclF = fs.value; render(); }); tools.appendChild(h("label", { text: "Chỉ tiêu " })); tools.appendChild(fs);
      var r8 = FX(bcNVNam(nam, st.bclF)); card.appendChild(simpleTable(r8)); sheets.push({ name: slug(st.bclF) + "_" + nam, rows: r8 });
    }
    else if (st.bcl === "thuenam") {
      var r9 = FX(bcThueNam(nam));
      info("Số liệu hỗ trợ quyết toán thuế TNCN năm " + nam + " — cộng từ các kỳ đã chốt. Kế toán đối chiếu thêm với tờ khai 05/KK đã nộp.");
      card.appendChild(simpleTable(r9)); sheets.push({ name: "ThueTNCN_" + nam, rows: r9 });
    }
    tools.appendChild(h("span", { class: "sp" }));
    if (st.bcl !== "sanluong" && !RF.isEmpty(st.rf)) rfHint.textContent = "Đang lọc: " + RF.describe(st.rf).join(" · ") + " — áp cho bảng nào có cột tương ứng; Excel và PDF xuất ra theo đúng bộ lọc này." + (Object.keys(rfSkip).length ? " Không áp được (báo cáo này không có cột): " + Object.keys(rfSkip).join(", ") + "." : "");
    tools.appendChild(btn("⬇ Xuất PDF", "", function () {
      exportSheetsPdf({ title: title, ky: BCL_NAM[st.bcl] ? "Năm " + nam : "Kỳ " + thang + "/" + nam, trangThai: dataSource || (src && !BCL_NAM[st.bcl] ? (src.chot ? "Đã chốt" : "Chưa chốt — tính tạm") : ""), loc: st.bcl === "sanluong" ? RF.describe(st.rf).map(function (label) { return "Đối chiếu chấm công: " + label; }) : RF.describe(st.rf), sheets: sheets }, "BaoCao_" + slug(title) + "_" + (BCL_NAM[st.bcl] ? nam : kyKey(nam, thang)) + ".pdf");
    }, "PDF theo đúng bộ lọc đang chọn"));
    tools.appendChild(btn(st.bcl === "sanluong" ? "⬇ Xuất báo cáo đang xem (Excel)" : "⬇ Xuất Excel", "pri", function () {
      if (st.bcl === "baohiem") {
        if (!window.ExcelJS || !window.HAKUi.bhXlsx) { alert("Thiếu thư viện Excel báo cáo bảo hiểm"); return; }
        window.HAKUi.bhXlsx.build(window.ExcelJS, sheets, { congTy: congTy()["Tên công ty"] || "", kyText: "THÁNG " + thang + "/" + nam, trangThai: src.chot ? "Đã chốt" : "Chưa chốt — tính tạm", phamVi: RF.describe(st.rf).join("; ") || "Toàn bộ", ngayLap: new Date().toLocaleDateString("vi-VN"), nguoiLap: currentUser() }).xlsx.writeBuffer().then(function (buf) {
          download("BaoCao_BaoHiem_" + kyKey(nam, thang) + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
          audit("Xuất Excel bảo hiểm", kyKey(nam, thang));
        }, function (e) { alert("Không xuất được Excel: " + (e.message || e)); });
        return;
      }
      var sh = sheets.filter(function (x) { return x.rows.length; }).map(function (x) { return { name: x.name, cols: Object.keys(x.rows[0]), rows: x.rows }; });
      if (!sh.length) { toast("Không có dữ liệu"); return; }
      if (dataSource) sh.unshift({ name: "NguonDuLieu", cols: ["Nguồn số liệu"], rows: [{ "Nguồn số liệu": dataSource }] });
      saveXlsx("BaoCao_" + slug(title) + "_" + (BCL_NAM[st.bcl] ? nam : kyKey(nam, thang)) + ".xlsx", sh);
    }));
    w.appendChild(card); return w;
  }

  /**
   * Đối chiếu lương Power Query (Master Prompt V3 mục XVII): nhập 1 bảng lương Excel đã xác nhận
   * đúng (công cụ cũ / Power Query) → so với kết quả app, theo TỪNG nhân viên, TỪNG chỉ tiêu — không
   * chỉ so tổng công ty. Chỉ ĐỌC, không sửa/tính lại dữ liệu.
   */
  function tabDoiChieu() {
    var w = h("div"), src = kqKy(st.nam, st.thang);
    var card = h("div", { class: "card" });
    card.appendChild(h("div", { class: "hint", html: "Nhập bảng lương Excel <b>đã xác nhận đúng</b> (vd file công cụ cũ, Power Query) để so với kết quả app — theo từng nhân viên, từng chỉ tiêu, không chỉ so tổng. App tự nhận cột theo tiêu đề (không phân biệt hoa/thường/dấu); cột lạ sẽ báo rõ để biết đã bỏ qua, không âm thầm bỏ sót." }));
    if (!RC) { card.appendChild(h("div", { class: "warn", text: "Thiếu module đối chiếu (core/reconcile.js)." })); w.appendChild(card); return w; }
    if (!src.kq || !src.kq.bangluong.length) { card.appendChild(h("div", { class: "empty", text: "Chưa có bảng lương kỳ " + st.thang + "/" + st.nam + " — vào Tính lương trước." })); w.appendChild(card); return w; }
    card.appendChild(h("div", { class: src.chot ? "locked" : "warn", text: src.chot ? "🔒 Đang đối chiếu với bảng lương ĐÃ CHỐT " + kyLabel(kyKey(st.nam, st.thang)) + "." : "⚠ Kỳ " + st.thang + "/" + st.nam + " chưa chốt — đang đối chiếu với số tính tạm, có thể thay đổi." }));
    var bar = h("div", { class: "bar" });
    bar.appendChild(btn("⬆ Chọn file Excel đối chiếu", "pri", function () {
      readWorkbook(function (wb, fileName) {
        st.dcFile = fileName; st.dcWb = wb;
        st.dcSheet = wb.SheetNames.map(function (n) { return { n: n, len: (XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 }) || []).length }; }).sort(function (a, b) { return b.len - a.len; })[0].n;
        render();
      });
    }));
    if (st.dcWb) {
      if (st.dcWb.SheetNames.length > 1) {
        var selS = h("select");
        st.dcWb.SheetNames.forEach(function (n) { selS.appendChild(h("option", { value: n, text: n })); });
        selS.value = st.dcSheet; selS.addEventListener("change", function () { st.dcSheet = selS.value; render(); });
        bar.appendChild(h("label", { text: "Sheet " })); bar.appendChild(selS);
      }
      bar.appendChild(h("span", { class: "hint", text: st.dcFile }));
    }
    card.appendChild(bar);
    if (st.dcWb) {
      var arr = XLSX.utils.sheet_to_json(st.dcWb.Sheets[st.dcSheet], { header: 1 });
      var ref = XLSX.utils.decode_range(st.dcWb.Sheets[st.dcSheet]["!ref"] || "A1"), firstRow = ref.s.r; // dòng Excel thật = chỉ số mảng + dòng đầu của vùng dữ liệu
      var parsed = RC.parseSheet(arr, null, { firstRow: firstRow });
      if (parsed.headerRow < 0) {
        card.appendChild(h("div", { class: "warn", text: "Không nhận ra dòng tiêu đề (cần có cột 'Mã NV' hoặc 'Họ và tên') trong sheet '" + st.dcSheet + "'. Thử chọn sheet khác." }));
      } else {
        card.appendChild(h("div", { class: "hint", html: "Đã đọc <b>" + parsed.rows.length + "</b> dòng, nhận ra <b>" + parsed.matched.length + "</b> chỉ tiêu: " + esc(parsed.matched.join(", ") || "(không có)") + (parsed.unmatched.length ? ". Cột KHÔNG nhận ra (bỏ qua): " + esc(parsed.unmatched.slice(0, 15).join(", ")) + (parsed.unmatched.length > 15 ? "…" : "") : "") }));
        var cmp = RC.compare(src.kq.bangluong, parsed.rows), tk = cmp.tongKet;
        var lech = cmp.rows.filter(function (r) { return r["Chênh lệch"] !== 0; });
        var sach = !lech.length && !tk.thieuTrongExcel && !tk.khongKhopApp && cmp.rows.length;
        card.appendChild(h("div", { class: sach ? "ok" : "warn", "data-dc-tongket": "1", html: "<b>Tổng kết đối chiếu</b>: app có <b>" + tk.tongApp + "</b> nhân viên, Excel có <b>" + tk.tongExcel + "</b> dòng người · đã đối chiếu <b>" + tk.daDoiChieu + "</b> người · thiếu trong Excel <b>" + tk.thieuTrongExcel + "</b> · Excel không khớp app <b>" + tk.khongKhopApp + "</b> · có chênh lệch <b>" + tk.coChenhLech + "</b> người (<b>" + lech.length + "</b> dòng chênh lệch trên " + cmp.rows.length + " dòng chỉ tiêu đã đối chiếu)." + (sach ? " Khớp hoàn toàn." : "") + (!cmp.rows.length ? " Không có chỉ tiêu nào đối chiếu được — kiểm tra lại cột trong file." : "") }));
        if (cmp.thieuTrongExcel.length) card.appendChild(thieuTrongExcelPanel(cmp));
        if (cmp.khongKhop.length) card.appendChild(khongKhopPanel(cmp));
        if (lech.length) {
          var onlyLech = h("input", { type: "checkbox" }); onlyLech.checked = st.dcOnlyLech !== false;
          onlyLech.addEventListener("change", function () { st.dcOnlyLech = onlyLech.checked; render(); });
          card.appendChild(h("label", { class: "chk" }, [onlyLech, " Chỉ hiện dòng lệch"]));
        }
        var showRows = (st.dcOnlyLech !== false) ? lech : cmp.rows;
        card.appendChild(simpleTable(showRows));
        card.appendChild(btn("⬇ Xuất Excel đối chiếu", "", function () {
          saveXlsx("DoiChieu_" + kyKey(st.nam, st.thang) + ".xlsx", doiChieuSheets(cmp));
          audit("Xuất Excel đối chiếu lương", kyLabel(kyKey(st.nam, st.thang)) + " · file nguồn: " + st.dcFile);
        }));
        // Riêng tăng ca: đối chiếu chi tiết hơn nếu file có đủ cột (mục XVII)
        var parsedTC = RC.parseSheet(arr, RC.CHI_TIEU_TANGCA, { firstRow: firstRow });
        if (parsedTC.matched.length) {
          var cmpTC = RC.compare(src.kq.bangluong, parsedTC.rows, RC.CHI_TIEU_TANGCA);
          var lechTC = cmpTC.rows.filter(function (r) { return r["Chênh lệch"] !== 0; });
          card.appendChild(h("div", { class: "fh", text: "Đối chiếu chi tiết tăng ca" }));
          card.appendChild(h("div", { class: lechTC.length ? "warn" : "ok", text: lechTC.length ? lechTC.length + " dòng chênh lệch tăng ca." : "Khớp hoàn toàn." }));
          card.appendChild(simpleTable(lechTC.length ? lechTC : cmpTC.rows));
        }
      }
    }
    card.appendChild(h("div", { class: "hint", style: "margin-top:10px", text: "Chưa hỗ trợ đối chiếu Đại Hiệp theo từng ngày ở màn hình này — dùng sheet \"Bu luong theo ngay - DH\" trong file Excel Phân bổ khối lượng (Báo cáo lương → Sản lượng) để so sánh thủ công theo ngày." }));
    w.appendChild(card); return w;
  }
  /** Các dòng Excel không đối chiếu được, nhóm theo lý do; mỗi dòng nêu số dòng Excel, mã NV và họ tên để đối chiếu với file. */
  function khongKhopPanel(cmp) {
    var box = h("div", { class: "warn", "data-dc-khongkhop": "1" }, [h("div", { html: "<b>⚠ Có trong Excel, không khớp app: " + cmp.khongKhop.length + " dòng KHÔNG đối chiếu được</b> — không tự đoán người; sửa mã NV hoặc họ tên trong file rồi đối chiếu lại:" })]);
    Object.keys(RC.LOAI).map(function (k) { return RC.LOAI[k]; }).forEach(function (loai) {
      var items = cmp.khongKhop.filter(function (x) { return x.loai === loai; }); if (!items.length) return;
      box.appendChild(h("div", { class: "fh", text: loai + " (" + items.length + ")" }));
      var list = h("ul");
      items.slice(0, 30).forEach(function (x) {
        list.appendChild(h("li", { text: "Dòng " + (x.dong || "?") + " · Mã NV: " + (x.ma || "(trống)") + " · " + (x.hoTen || "(không có họ tên)") + (x.ghiChu ? " — " + x.ghiChu : "") }));
      });
      if (items.length > 30) list.appendChild(h("li", { text: "… và " + (items.length - 30) + " dòng nữa (xem đầy đủ trong file Excel đối chiếu)." }));
      box.appendChild(list);
    });
    return box;
  }
  /** Người có trong app nhưng không có dòng Excel nào khớp (chiều ngược lại của "không khớp app"). */
  function thieuTrongExcelPanel(cmp) {
    var items = cmp.thieuTrongExcel, box = h("div", { class: "warn", "data-dc-thieu": "1" }, [h("div", { html: "<b>⚠ Có trong app, thiếu trong Excel: " + items.length + " người</b> — chưa có dòng Excel nào được đối chiếu với họ (kể cả khi các số còn lại đều khớp):" })]);
    var list = h("ul");
    items.slice(0, 30).forEach(function (x) { list.appendChild(h("li", { text: (x.ma || "(không có mã)") + " · " + (x.hoTen || "(không có họ tên)") + (x.ghiChu ? " — " + x.ghiChu : "") })); });
    if (items.length > 30) list.appendChild(h("li", { text: "… và " + (items.length - 30) + " người nữa (xem đầy đủ trong file Excel đối chiếu)." }));
    box.appendChild(list);
    return box;
  }
  /** Các sheet của file Excel đối chiếu — cùng số liệu với màn hình (tổng kết, thiếu trong Excel, không khớp app, chênh lệch). */
  function doiChieuSheets(cmp) {
    var tk = cmp.tongKet, sheets = [{ name: "TongKet", cols: ["Chỉ tiêu", "Số lượng"], rows: [
      { "Chỉ tiêu": "Nhân viên trong app", "Số lượng": tk.tongApp }, { "Chỉ tiêu": "Dòng người trong Excel", "Số lượng": tk.tongExcel },
      { "Chỉ tiêu": "Đã đối chiếu (người)", "Số lượng": tk.daDoiChieu }, { "Chỉ tiêu": "Có trong app, thiếu trong Excel (người)", "Số lượng": tk.thieuTrongExcel },
      { "Chỉ tiêu": "Có trong Excel, không khớp app (dòng)", "Số lượng": tk.khongKhopApp }, { "Chỉ tiêu": "Người có chênh lệch", "Số lượng": tk.coChenhLech }] }];
    sheets.push({ name: "ThieuTrongExcel", cols: ["Mã NV", "Họ tên", "Ghi chú"], rows: cmp.thieuTrongExcel.map(function (x) { return { "Mã NV": x.ma, "Họ tên": x.hoTen, "Ghi chú": x.ghiChu }; }) });
    sheets.push({ name: "KhongKhopNguoi", cols: ["Dòng Excel", "Mã NV", "Họ tên", "Loại", "Ghi chú"], rows: cmp.khongKhop.map(function (x) { return { "Dòng Excel": x.dong || "", "Mã NV": x.ma, "Họ tên": x.hoTen, "Loại": x.loai, "Ghi chú": x.ghiChu }; }) });
    sheets.push({ name: "DoiChieu", cols: cmp.rows.length ? Object.keys(cmp.rows[0]) : ["Dòng Excel", "Mã NV", "Họ và tên", "Chỉ tiêu", "Excel", "App", "Chênh lệch", "Loại lệch"], rows: cmp.rows });
    return sheets;
  }
  /** Thanh 7 bước Tính lương (V10.1): trạng thái THẬT tính từ dữ liệu (core/payroll-steps.js) — xong / đang ở / bị chặn / chưa tới. */
  var STEP_CACHE = { key: "", v: null };
  /** Trạng thái duyệt bảng lương của kỳ (chỉ chế độ phân quyền): null | "chua_gui" | "cho_duyet" | "het_hieu_luc" | "da_duyet". Cùng phép so mã băm với savePayrollApproval(). */
  function approvalStateIn(ky) {
    if (C.workflowApproval.mode(db) !== "roles") return null;
    var t = C.workflowApproval.ticket(db, ky);
    if (!t) return "chua_gui";
    try {
      if (t.digest !== approvalDigest(ky, st.kq) && t.digest !== approvalDigest(ky, st.kq, true)) return "het_hieu_luc";
    } catch (e) { return "het_hieu_luc"; }
    return t.approver ? "da_duyet" : "cho_duyet";
  }
  function luongStepsIn(chot) {
    var ky = kyStr(), daTinh = !!(st.kq && !st.kqStale && st.kq.ky === ky);
    var key = [ky, dbRev, daTinh ? 1 : 0, chot ? 1 : 0, (db.ttluong || []).length].join("|");
    if (STEP_CACHE.key === key) return STEP_CACHE.v;
    var loiDauVao = 0, loiChan = 0, duyet = null, tt = { soNV: 0, soCT: 0, nguoiDaTraDu: 0 };
    if (!chot) {
      try { loiDauVao = INT.check(db).filter(function (x) { return x.level === "Critical" || /CỘNG (2 LẦN|NHIỀU LẦN)/.test(x.msg); }).length; } catch (e) { loiDauVao = 1; }
      if (daTinh) { try { loiChan = GATE.blockers(st.kq).length; } catch (e) { loiChan = 1; } }
      if (daTinh && !loiChan && !loiDauVao) duyet = approvalStateIn(ky);
    } else {
      var os = PLG.outstanding(chot.kq.bangluong || [], db.ttluong || [], ky);
      tt = { soNV: os.length, soCT: (db.ttluong || []).filter(function (l) { return l["Kỳ"] === ky && l["Trạng thái"] !== PLG.TT.HUY; }).length, nguoiDaTraDu: os.filter(function (o) { return o.thucLinh > 0 ? o.daTra >= o.thucLinh : true; }).length };
    }
    var v = C.payrollSteps.compute({ chot: !!chot, daTinh: daTinh, loiDauVao: loiDauVao, loiChan: loiChan, duyet: duyet, thanhToan: tt });
    STEP_CACHE = { key: key, v: v }; return v;
  }
  function luongSteps(chot) {
    var steps = luongStepsIn(chot), go = [null, "ktbl", null, "ktbl", null, "rp_thanhtoan", "slips"];
    var bar = h("ol", { class: "steps7", "data-steps7": "1", "aria-label": "7 bước tính lương" });
    steps.forEach(function (x, i) {
      var cls = x.trangThai === "xong" ? "done" : x.trangThai === "dang" ? "now" : x.trangThai === "chan" ? "block" : "";
      var li = h("li", { class: cls, "data-step-state": x.trangThai, title: x.ly || "" }, [h("span", { class: "n", text: x.trangThai === "xong" ? "✓" : x.trangThai === "chan" ? "!" : String(i + 1) }), h("span", { text: x.ten })]);
      if (go[i]) { li.classList.add("go"); li.addEventListener("click", function () { if (!leaveOk()) return; st.tab = go[i]; render(); }); }
      bar.appendChild(li);
    });
    return bar;
  }
  function tabLuong() {
    var box = h("div"), chot = kyChot(kyStr());
    var hub = h("div", { class: "card", "data-payroll-hub": "1", "data-payroll-closed": chot ? "1" : "0" });
    hub.appendChild(h("h3", { text: "Kỳ lương " + st.thang + "/" + st.nam }));
    hub.appendChild(h("p", { class: "hint", text: (chot ? "Đã chốt · v" + (chot.version || 1) + " · " + fmtTime(chot.ngayChot) : "Chưa chốt") +
      " · " + buLabel(chot ? chot.buTheoNgay || false : st.bu) }));
    hub.appendChild(luongSteps(chot));
    var links = h("div", { class: "bar" });
    [["chamcong", "Đầu vào chấm công"], ["sanluong", "Đầu vào sản lượng"], ["ktbl", "Kiểm tra"],
      ["rp_tonghop", "Báo cáo lương"], ["rp_thanhtoan", "Thanh toán"], ["rp_soct", "Sổ chứng từ"]].forEach(function (item) {
      if (tabAllowed(item[0])) links.appendChild(btn(item[1], "ghost", function () {
        if (!leaveOk()) return;
        st.tab = item[0]; saveUi(); render();
      }));
    });
    hub.appendChild(links);
    if (!chot) {
      var work = h("div", { class: "bar", "data-period-work": "1" });
      C.inputReview.pending(db, kyStr()).forEach(function (r) {
        if (!tabAllowed(r.table)) return;
        work.appendChild(btn("Nháp: " + ALL[r.table].ten + " · " + kyLabel(r.period), "ghost", function () {
          if (!leaveOk()) return;
          st.tab = r.table; st.nam = +r.period.slice(0, 4); st.thang = +r.period.slice(5, 7);
          if (r.kind) st.pumpMode = r.kind;
          saveUi(); render();
        }));
      });
      if (st.kt && st.kt.ky === kyStr() && st.kt.rev === dbRev) {
        [["ERROR", "lỗi chặn"], ["WARNING", "cảnh báo"]].forEach(function (m) {
          var count = st.kt.rows.filter(function (row) { return row.muc === m[0]; }).length;
          if (count && tabAllowed("ktbl")) work.appendChild(btn(count + " " + m[1], m[0] === "ERROR" ? "red ghost" : "ghost", function () {
            st.ktSev = m[0]; ktDi(["ktbl"]);
          }));
        });
      }
      if (st.kq && st.kqStale) work.appendChild(h("span", { class: "warn", text: "Dữ liệu đã đổi. Tính lương lại trước khi chốt." }));
      if (work.childNodes.length) hub.appendChild(work);
    }
    if (!chot && C.workflowApproval.mode(db) === "roles") {
      var approval = C.workflowApproval.ticket(db, kyStr()), actions = h("div", { class: "bar" });
      var reviewState = !approval ? "Chưa gửi duyệt" : approval.approver ? "Người lập: " + approval.preparer + " · Người duyệt: " + approval.approver : "Chờ duyệt · Người lập: " + approval.preparer;
      if (approval && approval.approver && !approval.approvedAt) reviewState = "Cần gửi duyệt lại để ghi nhận thời điểm duyệt";
      if (approval && st.kq && st.kq.ky === kyStr() && approval.digest !== approvalDigest(kyStr(), st.kq) && approval.digest !== approvalDigest(kyStr(), st.kq, true)) reviewState = "Cần gửi duyệt lại · Bảng hiện tại khác bản đã gửi";
      actions.appendChild(h("span", { class: "hint", text: reviewState }));
      if (st.kq && can("payroll.calc")) actions.appendChild(btn(approval ? "Gửi duyệt lại" : "Gửi duyệt", "", function () { savePayrollApproval(false); }));
      if (st.kq && approval && !approval.approver && can("payroll.approve") && approval.preparer !== C.workflowApproval.account(session.tenDangNhap)) {
        actions.appendChild(btn("Duyệt bảng lương", "pri", function () { savePayrollApproval(true); }));
      }
      hub.appendChild(actions);
    }
    box.appendChild(hub);
    var card = h("div", { class: "card" }), bar = h("div", { class: "bar" });
    if (chot) {
      st.kq = Object.assign({ ky: chot.ky }, chot.kq);
      hub.appendChild(h("p", { class: "hint", text: "Quy chế: " + qcLabel(chot.quyChe || "") + (chot.ghiChu ? " · " + chot.ghiChu : "") }));
      var approvalInfo = payrollApprovalInfo(chot);
      if (approvalInfo) hub.appendChild(h("p", { class: "hint", text: approvalInfo }));
      hub.appendChild(h("div", { class: "bar" }, [
        btn("⬇ Xuất trọn bộ Excel", "pri", function () { exportAll(chot.kq, chot.ky); }),
        btn("In trọn bộ PDF kỳ lương", "", function () { exportPayrollBundlePdf(chot.kq, chot.ky); }),
        btn("🔍 Đối chiếu với dữ liệu hiện tại", "", function () { doiChieu(chot); }),
        btn("🔓 Mở chốt để sửa", "red ghost", function () { moChot(chot.ky); })
      ]));
      card.appendChild(bar);
      return renderKq(box, card, bar);
    }
    var sel = h("select", { "aria-label": "Cách bù lương sản lượng" }); BU_OPTS.forEach(function (o) { sel.appendChild(h("option", { value: o[0], text: o[1] })); });
    if (!buMethodOf(st.bu)) sel.appendChild(h("option", { value: String(st.bu), text: buLabel(st.bu) }));
    sel.value = String(st.bu); sel.addEventListener("change", function () { selectTopupMethod(sel.value); });
    var calcPermission = !can("payroll.calc") && C.workflowApproval.mode(db) === "roles" ? "payroll.approve" : "payroll.calc";
    if (can(calcPermission)) bar.appendChild(btn((calcPermission === "payroll.approve" ? "Xem bảng để duyệt · " : "▶ Tính lương tháng ") + st.thang + "/" + st.nam, "pri big", function () {
      if (!need(calcPermission)) return;
      if (!db.nhanvien.length) { alert("Chưa có nhân viên. Hãy nhập ở mục Nhân sự trước."); return; }
      var invalid = C.inputSafety.problems(db, kyStr()); if (invalid.length) { alert("Chưa tính lương: " + invalid.join("; ")); return; }
      var reviewMessage = C.inputReview.message(db, kyStr()); if (reviewMessage) { alert("Chưa tính lương: " + reviewMessage + " còn Nháp. Mở bảng và bấm Lưu để tính lương."); return; }
      if (st.dangTinh) return; st.dangTinh = true;
      try { st.kq = tinhLuong(); st.kqStale = false; } finally { st.dangTinh = false; }
      render(); toast("Đã tính xong " + st.kq.bangluong.length + " nhân viên");
    }));
    bar.appendChild(sel);
    bar.appendChild(btn("Xem cách bù", "", function () { var m = buMethodOf(st.bu); if (m) xemCachTinhBu(m); else alert(buLabel(st.bu)); }));
    var qs = h("select", { "aria-label": "Quy chế tính lương", title: "Áp dụng cho mọi kỳ chưa chốt của dữ liệu này (kỳ đã chốt giữ nguyên số)" }); QC_OPTS.forEach(function (o) { qs.appendChild(h("option", { value: o[0], text: o[1] })); });
    qs.value = quyChe();
    qs.addEventListener("change", function () {
      if (!need("dm.edit", "đổi quy chế tính lương")) { qs.value = quyChe(); return; }
      var cu = quyChe(); db.congty = [Object.assign({}, congTy(), { "Quy chế tính lương": qs.value })]; save();
      audit("Đổi quy chế tính lương", qcLabel(cu) + " → " + qcLabel(qs.value)); st.kq = null; render(); toast("Đã đổi: " + qcLabel(qs.value) + " — bấm Tính lương lại");
    });
    bar.appendChild(qs); bar.appendChild(btn("Xem quy chế", "", function () { xemQuyChe(qs.value); })); card.appendChild(bar);
    // Mục VIII: lựa chọn "Cách bù lương sản lượng" ở trên chỉ để XEM THỬ/so sánh — khi Chốt kỳ, app
    // kiểm tra phương pháp đã dùng để tính khớp bản "Hiệu lực" trong Cài đặt.
    // Chỉ hiện khi công ty này có dùng lương sản phẩm (mã hình thức lương chứa SP) — không làm phiền
    // công ty không bù sản lượng.
    if (db.dm_luong.some(function (l) { return /SP/.test(l["Mã hình thức lương"] || ""); })) {
      var qcBu = E.quyCheBuChinhThuc(db.dm_quychebu, st.nam, st.thang);
      if (qcBu) {
        var dungPP = String(qcBu["Cách bù"]) === String(st.bu);
        card.appendChild(h("div", { class: dungPP ? "hint" : "warn", "data-bu-trial": dungPP ? "0" : "1", text: (dungPP ? "✓ " : "⚠ ") + "Phương pháp bù sản lượng CHÍNH THỨC kỳ " + st.thang + "/" + st.nam + ": " + buLabel(qcBu["Cách bù"]) + (dungPP ? " — đang xem đúng phương pháp này." : " — đang XEM THỬ phương pháp khác (" + buLabel(st.bu) + ") để so sánh; chưa được chốt. Bạn cần chọn phương pháp chính thức, bấm Tính lương và kiểm tra lại trước khi chốt.") }));
      } else card.appendChild(h("div", { class: "warn", text: "⚠ Chưa có Phương pháp bù sản lượng CHÍNH THỨC (Cài đặt → Phương pháp bù sản lượng) cho kỳ " + st.thang + "/" + st.nam + " — lựa chọn ở trên chỉ để xem thử/so sánh. Nếu kỳ này có sản lượng cần bù, sẽ KHÔNG chốt được cho đến khi khai báo quy chế." }));
    }
    if (!st.kq) {
      card.appendChild(h("div", { class: "hint", text: "Kiểm tra dữ liệu kỳ " + st.thang + "/" + st.nam + " rồi bấm nút xanh. Có thể tính lại bất cứ lúc nào." }));
      var cc = db.chamcong.filter(function (r) { return r["Kỳ"] === kyStr(); }).length;
      var sp = HRM.staffForPayroll(db, st.nam, st.thang);
      card.appendChild(h("div", { class: cc ? "ok" : "warn", html: "Chấm công kỳ này: <b>" + cc + "</b> dòng · Nhân viên có hợp đồng hiệu lực trong kỳ: <b>" + sp.list.length + "</b> người" + (cc ? "" : " — <b>chưa có dữ liệu chấm công kỳ này</b>.") }));
      if (sp.warn.length) card.appendChild(h("div", { class: "warn", html: "<b>⚠ Hồ sơ cần bổ sung:</b><br>" + sp.warn.map(esc).join("<br>") }));
      box.appendChild(card); return box;
    }
    if (can("payroll.close")) bar.appendChild(btn("🔒 Chốt kỳ lương", "pri", chotKy, "Lưu bảng lương kỳ này để xem lại về sau và khóa dữ liệu kỳ"));
    var qcOf = db.dm_luong.some(function (l) { return /SP/.test(l["Mã hình thức lương"] || ""); }) ? E.quyCheBuChinhThuc(db.dm_quychebu, st.nam, st.thang) : null;
    if (qcOf && String(qcOf["Cách bù"]) !== String(st.kq.cheDoBu)) box.appendChild(h("div", { class: "warn", "data-bu-result-trial": "1", html: "<b>⚠ KẾT QUẢ XEM THỬ</b> — bảng dưới tính theo <b>" + esc(buLabel(st.kq.cheDoBu)) + "</b>, KHÔNG phải phương pháp chính thức (<b>" + esc(buLabel(qcOf["Cách bù"])) + "</b>). Không dùng số này để thanh toán; app chặn chốt bảng xem thử. Hãy chọn phương pháp chính thức, bấm Tính lương và kiểm tra lại trước khi chốt." }));
    return renderKq(box, card, bar);
  }
  // ---------- Bộ lọc báo cáo dùng chung + xuất PDF (Master V5) ----------
  /** Thanh lọc dùng chung: cùng một st.rf cho Tính lương, Bảng tính lương nội bộ, Excel và PDF. */
  // ---- Bộ lọc dùng chung (V8): chọn NHIỀU giá trị, tìm không dấu, chọn tất cả/bỏ chọn, lưu bộ lọc, đặt lại ----
  var RFCTX_KEY = "", RFCTX_LAST = {};
  function rfContext() {
    var key = st.nam + "-" + st.thang + "|" + (db.chamcong || []).length + "|" + (db.dm_phongban || []).length;
    if (key === RFCTX_KEY) return RFCTX_LAST;
    var kmap = {}; (db.dm_phongban || []).forEach(function (p) { if (p && p["Tên phòng ban"]) kmap[p["Tên phòng ban"]] = p["Tên khối"] || ""; });
    var forms = {}, ky = st.nam + "-" + ("0" + st.thang).slice(-2);
    (db.chamcong || []).forEach(function (r) { if (r && r["Kỳ"] === ky && r["Mã NV"]) { var f = (forms[r["Mã NV"]] = forms[r["Mã NV"]] || []); var c = r["Hình thức công"] || "BT"; if (f.indexOf(c) < 0) f.push(c); } });
    RFCTX_KEY = key; RFCTX_LAST = { khoiOf: function (pb) { return kmap[pb] || ""; }, formsOf: function (ma) { return forms[ma] || []; } };
    return RFCTX_LAST;
  }
  /** st.rf ⇄ trạng thái Smart Filter. Đọc ĐỦ mọi tiêu chí của st.rf (kể cả tiêu chí màn hình này không lọc được) để không có điều kiện ẩn. */
  var RF_LABEL = { khoi: "Khối", phongBan: "Phòng ban", to: "Tổ", maLuong: "Mã lương", httt: "Thanh toán", hinhThucCong: "Hình thức công", maNV: "Nhân viên", tn: "Chỉ người có thu nhập" };
  var RF_SEL = ["khoi", "phongBan", "to", "maLuong", "httt", "hinhThucCong", "maNV"];
  function rfStateGet() {
    var r = RF.normalize(st.rf), s = SFC.empty(); s.q = r.tuKhoa;
    RF_SEL.forEach(function (k) { if (r[k].length) s.sel[k] = r[k].slice(); });
    if (r.chiCoThuNhap) s.flag.tn = true; return s;
  }
  function rfStateSet(s) {
    var o = { tuKhoa: s.q, chiCoThuNhap: !!s.flag.tn }; RF_SEL.forEach(function (k) { o[k] = (s.sel[k] || []).slice(); });
    st.rf = Object.assign({}, RF.normalize(st.rf), o);
  }
  var RFSUM = ["Tổng thu nhập", "Thực lĩnh"];
  /** Thanh lọc dùng chung của Tính lương / Bảng lương / Báo cáo: cùng một st.rf cho màn hình, Excel và PDF. Lọc chỉ chọn dòng — không tính lại lương. */
  function reportFilterBar(allRows, opt) {
    opt = opt || {}; RF.setContext(rfContext());
    var op = RF.options(allRows), fields = [], quick = ["q"], adv = ["q"];
    var add = function (f, isQuick) { fields.push(f); adv.push(f.key); if (isQuick) quick.push(f.key); };
    var list = function (arr) { return function () { return arr; }; };
    if (op.khoi.length) add({ key: "khoi", label: "Khối", type: "multi", options: list(op.khoi) }, true);
    add({ key: "phongBan", label: "Phòng ban", type: "multi", options: list(op.phongBan) }, true);
    if (op.to.length) add({ key: "to", label: "Tổ", type: "multi", options: list(op.to) }, false);
    if (!opt.compact) {
      add({ key: "maLuong", label: "Mã lương", type: "multi", options: list(op.maLuong) }, false); add({ key: "httt", label: "Thanh toán", type: "multi", options: list(op.httt) }, false);
      if (op.hinhThucCong.length) add({ key: "hinhThucCong", label: "Hình thức công", type: "multi", options: list(op.hinhThucCong) }, false);
      add({ key: "tn", label: "Chỉ người có thu nhập", type: "bool" }, false);
    }
    if ((!opt.compact || opt.showEmployees) && op.nhanVien.length <= 3000) {
      add({ key: "maNV", label: "Nhân viên", type: "multi", options: list(op.nhanVien) }, false);
    }
    var cfg = {
      screenId: "rf:" + (opt.screenId || st.tab || ""), attrs: { "data-rf": "1" }, qAttrs: { "data-rf-key": "tuKhoa" }, fields: fields, quickFields: quick, advancedFields: adv, qCommit: true, legacyPresets: true, searchPlaceholder: opt.searchPlaceholder || "🔍 Tìm mã / tên…",
      labelOf: function (k) { return RF_LABEL[k] || k; }, scopeFallback: function () { return "tất cả"; },
      state: { get: rfStateGet, set: rfStateSet },
      dataSource: function () {
        var g = RF.apply(allRows, st.rf), info = { kept: g.kept, total: g.total, unsupported: [], rows: g.rows };
        return info;
      },
      summary: function (info) {
        var rows = info.rows || [], out = [];
        (opt.summaryCols || RFSUM).forEach(function (c) { if (rows.length && rows[0] && rows[0][c] != null && typeof rows[0][c] === "number") out.push({ label: c, value: fmt(rows.reduce(function (a, x) { return a + (+x[c] || 0); }, 0)) }); });
        return out;
      },
      fromLegacy: function (spec) { var r = RF.normalize(spec), s = SFC.empty(); s.q = r.tuKhoa; RF_SEL.forEach(function (k) { if (r[k].length) s.sel[k] = r[k].slice(); }); if (r.chiCoThuNhap) s.flag.tn = true; return s; },
      onApply: function () { render(); }
    };
    var m = sfUi.mount(cfg); m.cfg = cfg; return m.el;
  }
  /** Xuất PDF: bản cài (.exe) → file PDF thật trong thư mục xuất; chạy bằng trình duyệt → hộp thoại In (chọn "Lưu thành PDF"). */
  function exportPdf(vm, fileName, opt) {
    if (!need("export", "xuất PDF")) return;
    if (formulaErrorsBlock((fileName || "") + " " + (vm && vm.title || ""), opt && opt.period)) return;
    var html = RH.table(vm, opt);
    if (!window.hakReport) { pdfFallbackPrint(html); toast("Bản chạy bằng trình duyệt: chọn “Lưu thành PDF” trong hộp thoại In"); return; }
    toast("Đang tạo PDF…");
    window.hakReport.pdf({ html: html, name: fileName, landscape: true, footer: (vm.congTy ? vm.congTy + " · " : "") + vm.title + " · " + vm.ky }).then(function (r) {
      if (r && r.ok) { audit("Xuất PDF", vm.title + " · " + vm.ky + " · " + r.name); toast("Đã lưu PDF: " + r.name + " (" + r.pages + " trang)"); }
      else alert("Không xuất được PDF: " + (r && r.error || "lỗi không rõ"));
    }, function (e) { alert("Không xuất được PDF: " + (e && e.message || e)); });
  }
  /** PDF cho báo cáo dạng nhiều bảng (mảng đối tượng): dùng chung đường xuất với exportPdf. */
  function exportSheetsPdf(vm, fileName, opt) {
    if (!need("export", "xuất PDF")) return;
    if (formulaErrorsBlock((fileName || "") + " " + (vm && vm.title || ""))) return;
    vm = Object.assign({ congTy: congTy()["Tên công ty"] || "" }, vm);
    if (!vm.sheets.some(function (x) { return x.rows && x.rows.length; })) { toast("Không có dữ liệu để xuất PDF"); return; }
    var html = RH.sheets(vm, opt || {});
    if (!window.hakReport) { pdfFallbackPrint(html); toast("Bản chạy bằng trình duyệt: chọn “Lưu thành PDF” trong hộp thoại In"); return; }
    toast("Đang tạo PDF…");
    window.hakReport.pdf({ html: html, name: fileName, landscape: true, footer: (vm.congTy ? vm.congTy + " · " : "") + vm.title + " · " + (vm.ky || "") }).then(function (r) {
      if (r && r.ok) { audit("Xuất PDF", vm.title + " · " + (vm.ky || "") + " · " + r.name); toast("Đã lưu PDF: " + r.name + " (" + r.pages + " trang)"); }
      else alert("Không xuất được PDF: " + (r && r.error || "lỗi không rõ"));
    }, function (e) { alert("Không xuất được PDF: " + (e && e.message || e)); });
  }
  // ---------- V9.4: BÁO CÁO LƯƠNG — tổng hợp, thanh toán, kê chuyển khoản, tiền mặt + sổ chứng từ thanh toán ----------
  var PLG = C.payledger, PRP = C.payrollReports, OPS = C.opsReports;
  var PAY_SCREENS = { rp_tonghop: "TONG_HOP_NV", rp_pb: "TONG_HOP", rp_tncn: "THUE_TNCN", rp_ctnv: "CHI_TIET_NV", rp_thanhtoan: "THANH_TOAN", rp_cttt: "CHI_TIET_TT", rp_soct: "SO_CHUNG_TU", rp_ck: "CHUYEN_KHOAN", rp_tm: "TIEN_MAT" };
  function payLines() { return db.ttluong || []; }
  function ledgerSet(mut) { var next = payLines().map(function (x) { return Object.assign({}, x); }); mut(next); db.ttluong = next; }
  function nvByMa() { var m = {}; (db.nhanvien || []).forEach(function (r) { if (r["Mã NV"]) m[r["Mã NV"]] = r; }); return m; }
  function payVm(type, src) {
    var bl = src.chot ? [] : GATE.blockers(src.kq);
    var snapshot = src.chot ? kyChot(kyStr()) : null;
    var vm = PRP.build(type, { bangluong: src.kq.bangluong, bhxh: src.kq.bhxh, chot: src.chot, blockers: bl }, { nam: st.nam, thang: st.thang, filter: st.rf, tenCongTy: congTy()["Tên công ty"] || "", lines: payLines(), ngay: new Date().toLocaleDateString("vi-VN"), nguoiLap: session ? session.hoTen : "", nhomPB: type === "TONG_HOP_NV" && !!st.thNhom, nhanVien: type === "THUE_TNCN" ? nvByMa() : null });
    if (snapshot) vm.trangThai += " | v" + (snapshot.version || 1);
    if (type === "CHUYEN_KHOAN" || type === "TIEN_MAT") vm.trangThai += " | Đề nghị chi";
    return vm;
  }
  /** Xuất chính thức chỉ khi không có lỗi nghiêm trọng; bảng thanh toán/kê chỉ xuất từ kỳ ĐÃ CHỐT. */
  function payExportOk(vm, type) {
    if (!need("export", "xuất báo cáo lương")) return false;
    if (!PRP.KHONG_CAN_CHOT[type] && !vm.chot) { alert("⛔ " + vm.title + " chỉ xuất chính thức từ kỳ ĐÃ CHỐT. Kỳ " + vm.ky + " chưa chốt — chốt kỳ rồi xuất."); return false; }
    if (vm.loi.length) { alert("⛔ Không xuất chính thức được — " + vm.loi.length + " lỗi nghiêm trọng:\n\n" + vm.loi.slice(0, 10).map(function (x) { return "• " + x; }).join("\n") + (vm.loi.length > 10 ? "\n…" : "") + "\n\nSửa dữ liệu rồi mở lại báo cáo."); return false; }
    if (!vm.rows.length) { toast("Không có dòng nào để xuất"); return false; }
    return true;
  }
  function payXlsx(vm, type) {
    if (!payExportOk(vm, type)) return;
    if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.reportXlsx) { alert("Thiếu thư viện Excel"); return; }
    var wb = window.HAKUi.reportXlsx.build(window.ExcelJS, vm, { chuKy: type === "TIEN_MAT" || type === "THANH_TOAN" ? ["Người lập", "Kế toán trưởng", "Thủ quỹ", "Giám đốc"] : ["Người lập", "Kế toán trưởng", "Giám đốc"], nguoiLap: vm.nguoiLap });
    wb.xlsx.writeBuffer().then(function (buf) {
      download(vm.file + "_" + vm.kyKey + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
      audit("Xuất Excel " + vm.title, vm.ky + " · " + vm.soDong + " dòng · phạm vi: " + vm.phamVi);
    }, function (e) { alert("Không tạo được file: " + e.message); });
  }
  function payPdf(vm, type) {
    if (!payExportOk(vm, type)) return;
    if (vm.nhom) { exportPdf(Object.assign({}, vm, { groups: vm.nhom }), vm.file + "_" + vm.kyKey + "_theoPhongBan.pdf", { chuKy: ["Người lập", "Kế toán trưởng", "Giám đốc"] }); return; }
    exportSheetsPdf({ title: vm.title, ky: vm.kyText, trangThai: vm.trangThai, loc: vm.loc, sheets: [{ name: vm.title, cols: vm.cols.map(function (c) { return c.label; }), rows: PRP.toRows(vm), groups: vm.groups || null }] }, vm.file + "_" + vm.kyKey + ".pdf",
      { chuKy: type === "TIEN_MAT" || type === "THANH_TOAN" ? ["Người lập", "Kế toán trưởng", "Thủ quỹ", "Giám đốc"] : ["Người lập", "Kế toán trưởng", "Giám đốc"] });
  }
  function payLap(ht, src) {
    if (!need("payment.record", "lập chứng từ thanh toán lương")) return;
    var ky = kyStr(), candidates = RF.apply(src.kq.bangluong, st.rf).rows;
    var pl = PLG.lapChungTu({ ky: ky, ht: ht, rows: candidates, lines: payLines(), nguoi: session ? session.tenDangNhap : "", ngay: HRM.today(), chot: src.chot, blockers: src.chot ? [] : GATE.blockers(src.kq).map(function (b) { return b.code; }) });
    if (!pl.ok) { alert("⛔ " + pl.msg + (pl.boQua && pl.boQua.length ? "\n\nBỏ qua:\n" + pl.boQua.slice(0, 8).map(function (x) { return "• " + x.maNV + ": " + x.ly; }).join("\n") : "")); return; }
    var preview = h("div", { "data-pay-preview": "1" }, [
      h("p", { text: ht + " · " + pl.dong.length + " người · " + fmt(pl.tong) + " đ" }),
      simpleTable(pl.dong.map(function (r) { return { "Mã NV": r["Mã NV"], "Họ và tên": r["Họ và tên"], "Số tiền": r["Số tiền"] }; }))
    ]);
    if (pl.boQua.length) preview.appendChild(h("p", { class: "hint", text: "Bỏ qua " + pl.boQua.length + " người: " + pl.boQua.map(function (r) { return r.maNV + " — " + r.ly; }).join(", ") }));
    modal("Xem trước chứng từ " + pl.so, preview, function (close) {
      return [btn("Hủy", "", close), btn("Lập chứng từ", "pri", function () {
        var lapOk = txn(["ttluong"], function () {
          ledgerSet(function (next) { pl.dong.forEach(function (d) { next.push(d); }); });
          audit("Lập chứng từ thanh toán lương", pl.so + " · " + ht + " · " + pl.dong.length + " người · " + fmt(pl.tong) + " đ");
          return true;
        });
        close(); render(); if (lapOk) toast("Đã lập chứng từ " + pl.so);
      })];
    }, { wide: true });
  }
  function payChuyen(so, to) {
    var mode = C.workflowApproval.mode(db);
    if (!need(to === PLG.TT.DUYET && mode === "roles" ? "payment.approve" : "payment.record", "xử lý chứng từ thanh toán lương")) return;
    var run = function (lyDo) {
      var rs = PLG.chuyen(payLines(), so, to, { nguoi: session ? session.tenDangNhap : "", ngay: HRM.today(), lyDo: lyDo, admin: can("system.admin"), mode: mode });
      if (!rs.ok) { alert("⛔ " + rs.msg); return; }
      txn(["ttluong"], function () {
        ledgerSet(function (next) { next.forEach(function (l, i) { if (l["Số chứng từ"] === so) next[i] = Object.assign({}, l, rs.patch); }); });
        audit("Chứng từ thanh toán lương → " + to, so + (lyDo ? " · lý do: " + lyDo : "")); return true;
      });
      render();
    };
    if (to === PLG.TT.HUY) { askText("Hủy chứng từ " + so, "Chứng từ hủy sẽ trả lại khoản phải thanh toán. Ghi rõ lý do.", { label: "Lý do hủy", required: true }, function (d) { run(d); }); return; }
    if (to === PLG.TT.TRA && !confirm("Xác nhận ĐÃ CHI chứng từ " + so + "? Sau khi ghi nhận, chứng từ bị khóa, không sửa/hủy được.")) return;
    run("");
  }
  /** Master–detail: chứng từ thanh toán (cha) → các dòng nhân viên (con). Cha hiển thị trên đầu, con ở bảng bên trong. */
  function payVoucherModal(so) {
    var L = payLines().filter(function (l) { return l["Số chứng từ"] === so; });
    if (!L.length) return;
    var f = L[0], body = h("div", { "data-voucher-detail": so }), tong = L.reduce(function (a, x) { return a + (+x["Số tiền"] || 0); }, 0);
    var head = h("table", { class: "kv" });
    [["Số chứng từ", so], ["Kỳ", f["Kỳ"]], ["Hình thức", f["Hình thức"]], ["Trạng thái", f["Trạng thái"]], ["Số người", String(L.length)], ["Tổng tiền", fmt(tong) + " đ"], ["Người lập", f["Người lập"] || ""], ["Ngày lập", f["Ngày lập"] || ""], ["Người duyệt", f["Người duyệt"] || ""], ["Ngày duyệt", f["Ngày duyệt"] || ""], ["Người ghi nhận", f["Người ghi nhận"] || ""], ["Ngày thanh toán", f["Ngày thanh toán"] || ""], ["Lý do hủy", f["Lý do hủy"] || ""]].forEach(function (x) { if (x[1]) head.appendChild(h("tr", {}, [h("td", { class: "t", text: x[0] }), h("td", { class: "r", text: x[1] })])); });
    body.appendChild(head); body.appendChild(h("h4", { text: "Các dòng nhân viên (" + L.length + ")" }));
    body.appendChild(simpleTable(L.map(function (x, i) { return { "STT": i + 1, "Mã NV": x["Mã NV"], "Họ và tên": x["Họ và tên"], "Số tiền": fmt(x["Số tiền"]), "Trạng thái": x["Trạng thái"] }; })));
    modal("CHỨNG TỪ " + so, body, function (close) {
      var actions = [btn("Đóng", "", close)];
      if (f["Trạng thái"] === PLG.TT.DUYET && f["Hình thức"] === PLG.HT.CK && can("export")) {
        actions.push(btn("Xuất bảng kê chuyển khoản", "pri", function () {
          if (L.some(function (r) { return !r["Số tài khoản"] || !r["Ngân hàng"]; })) {
            alert("Chứng từ này thiếu thông tin tài khoản đã lưu lúc lập. Kiểm tra chứng từ trước khi chuyển khoản.");
            return;
          }
          var cols = ["Số chứng từ", "Kỳ", "Mã NV", "Họ và tên", "Số tài khoản", "Ngân hàng", "Số tiền"];
          saveXlsx("ChuyenKhoan_" + so + ".xlsx", [{ name: "ChuyenKhoan", cols: cols, rows: L }]);
        }));
      }
      return actions;
    }, { wide: true });
  }
  function payLedgerPanel(type, ky) {
    var ht = type === "CHUYEN_KHOAN" ? PLG.HT.CK : type === "TIEN_MAT" ? PLG.HT.TM : "";
    var ls = payLines().filter(function (l) { return l["Kỳ"] === ky && (!ht || l["Hình thức"] === ht); }), by = {}, ord = [];
    ls.forEach(function (l) { if (!by[l["Số chứng từ"]]) { by[l["Số chứng từ"]] = []; ord.push(l["Số chứng từ"]); } by[l["Số chứng từ"]].push(l); });
    var card = h("div", { class: "card", "data-pay-ledger": "1" });
    card.appendChild(h("h3", { text: "SỔ CHỨNG TỪ THANH TOÁN LƯƠNG KỲ " + st.thang + "/" + st.nam }));
    if (!ord.length) { card.appendChild(h("div", { class: "hint", text: "Chưa có chứng từ nào cho kỳ này. Trạng thái thanh toán chỉ thay đổi khi lập / duyệt / ghi nhận chi chứng từ — không thay đổi khi xuất file." })); return card; }
    var t = h("table"), hr = h("tr");
    card.appendChild(h("p", { class: "hint", text: "Mở Chi tiết để xem từng người nhận. Bảng chi tiết và xuất báo cáo nằm bên dưới." }));
    ["Số chứng từ", "Hình thức", "Số người", "Tổng tiền", "Trạng thái", "Người lập", "Người duyệt", "Ngày thanh toán", ""].forEach(function (x) { hr.appendChild(h("th", { text: x })); });
    t.appendChild(h("thead", {}, [hr])); var tb = h("tbody");
    ord.forEach(function (so) {
      var L = by[so], f = L[0], tr = h("tr", { "data-so": so }), canR = can("payment.record");
      [so, f["Hình thức"], String(L.length), fmt(L.reduce(function (a, x) { return a + (+x["Số tiền"] || 0); }, 0)) + " đ", f["Trạng thái"], f["Người lập"] || "", f["Người duyệt"] || "", f["Ngày thanh toán"] || ""].forEach(function (x, i) { tr.appendChild(h("td", { class: i === 3 ? "r" : "t", text: x })); });
      var act = h("td", { class: "t" });
      act.appendChild(btn("Chi tiết", "ghost", function () { payVoucherModal(so); }));
      if ((C.workflowApproval.mode(db) === "roles" ? can("payment.approve") : canR) && f["Trạng thái"] === PLG.TT.LAP) act.appendChild(btn("Duyệt", "pri", function () { payChuyen(so, PLG.TT.DUYET); }));
      if (canR && f["Trạng thái"] === PLG.TT.DUYET) act.appendChild(btn("Ghi nhận đã chi", "pri", function () { payChuyen(so, PLG.TT.TRA); }));
      if (canR && (f["Trạng thái"] === PLG.TT.LAP || f["Trạng thái"] === PLG.TT.DUYET)) act.appendChild(btn("Hủy", "red ghost", function () { payChuyen(so, PLG.TT.HUY); }));
      tr.appendChild(act); tb.appendChild(tr);
    });
    t.appendChild(tb); card.appendChild(h("div", { class: "tw" }, [t])); return card;
  }
  /** Cửa sổ "CHI TIẾT THANH TOÁN LƯƠNG — [HỌ TÊN]": thu nhập, khấu trừ, thanh toán và các chứng từ của nhân viên trong kỳ. */
  function payDetailModal(r, src) {
    var ky = kyStr(), body = h("div", { "data-pay-detail": r["Mã NV"] });
    function sec(title, keys) {
      var t = h("table", { class: "kv" });
      keys.forEach(function (k) { var v = r[k]; if (v === "" || v == null) return; t.appendChild(h("tr", {}, [h("td", { class: "t", text: k }), h("td", { class: "r", text: typeof v === "number" ? fmt(v) : String(v) })])); });
      body.appendChild(h("h4", { text: title })); body.appendChild(t);
    }
    sec("Nhân viên", ["Mã NV", "Họ và tên", "Công ty", "Phòng ban", "Hình thức lương", "Kỳ lương"]);
    sec("Thu nhập", ["Lương thời gian", "Lương phụ", "Lương sản lượng", "Lương bù SL", "Lương bơm dăm", "Tiền tăng ca", "Phụ cấp", "Phụ cấp công tác", "Lương hỗ trợ", "Tiền cơm", "Thưởng", "Thu nhập khác", "Tổng thu nhập"]);
    sec("Khấu trừ", ["BHXH NLĐ", "BHYT NLĐ", "BHTN NLĐ", "BH trừ NLĐ", "KPCĐ trừ NLĐ", "Truy thu BH", "Thuế TNCN", "Tạm ứng", "Trừ khác", "Tổng khấu trừ"]);
    sec("Thanh toán", ["Thực lĩnh", "Đã thanh toán", "Đang chờ chi", "Còn phải thanh toán", "Có thể lập đề nghị chi", "Hình thức thanh toán", "Ngân hàng", "Số tài khoản", "Trạng thái", "Ghi chú"]);
    var ls = payLines().filter(function (l) { return l["Kỳ"] === ky && l["Mã NV"] === r["Mã NV"]; });
    body.appendChild(h("h4", { text: "Chứng từ liên quan (" + ls.length + ")" }));
    if (!ls.length) body.appendChild(h("div", { class: "hint", text: "Chưa có chứng từ thanh toán nào cho nhân viên này trong kỳ." }));
    else { var t = h("table"), hh = h("tr"); ["Số chứng từ", "Hình thức", "Số tiền", "Trạng thái", "Ngày lập", "Ngày thanh toán", "Lý do hủy"].forEach(function (x) { hh.appendChild(h("th", { text: x })); }); t.appendChild(h("thead", {}, [hh]));
      var tb = h("tbody"); ls.forEach(function (l) { tb.appendChild(h("tr", {}, ["Số chứng từ", "Hình thức", "Số tiền", "Trạng thái", "Ngày lập", "Ngày thanh toán", "Lý do hủy"].map(function (k, i) { return h("td", { class: i === 2 ? "r" : "t", text: i === 2 ? fmt(l[k]) : (l[k] || "") }); }))); }); t.appendChild(tb); body.appendChild(h("div", { class: "tw" }, [t])); }
    modal("CHI TIẾT THANH TOÁN LƯƠNG — " + String(r["Họ và tên"]).toLocaleUpperCase("vi-VN"), body, function (close) { return [btn("Đóng", "pri", close)]; }, { wide: true });
  }
  function tabPayReport(type) {
    var w = h("div"), card = h("div", { class: "card" }), src = kqKy(st.nam, st.thang);
    var vm = payVm(type, src), ky = vm.kyKey;
    if (type === "SO_CHUNG_TU") {
      w.appendChild(payLedgerPanel(type, ky));
      card.classList.add("pay-ledger-export");
    }
    card.appendChild(h("h3", { "data-report-title": type, text: type === "SO_CHUNG_TU" ? "Chi tiết theo nhân viên · Xuất báo cáo" : vm.title + (type === "CHUYEN_KHOAN" || type === "TIEN_MAT" ? " · Đề nghị chi" : "") }));
    card.appendChild(h("div", { class: "hint", html: (src.chot ? "🔒 Kỳ <b>đã chốt</b> — lấy đúng bảng lương đã chốt." : "⚠ Kỳ <b>chưa chốt</b> — số liệu tính tạm" + (PRP.KHONG_CAN_CHOT[type] ? "." : ", <b>không xuất / không lập chứng từ</b> cho tới khi chốt.")) + (["THANH_TOAN", "CHI_TIET_TT", "CHUYEN_KHOAN", "TIEN_MAT"].indexOf(type) >= 0 ? " Số tiền đề nghị chi = thực lĩnh − đã chi − đang chờ chi." : "") }));
    card.appendChild(reportFilterBar(src.kq.bangluong));
    var tools = h("div", { class: "bar" });
    tools.appendChild(btn("⬇ Xuất Excel", "pri", function () { payXlsx(vm, type); }));
    tools.appendChild(btn("⬇ Xuất PDF", "", function () { payPdf(vm, type); }));
    if (type === "CHUYEN_KHOAN" || type === "TIEN_MAT") tools.appendChild(btn("Mở Bảng thanh toán lương để lập chứng từ", "ghost", function () {
      st.tab = "rp_thanhtoan"; saveUi(); render();
    }));
    if (type === "TONG_HOP_NV") { var cb = h("input", { type: "checkbox", "data-th-nhom": "1" }); cb.checked = !!st.thNhom; cb.addEventListener("change", function () { st.thNhom = cb.checked; render(); }); tools.appendChild(h("label", { class: "chip", title: "Mỗi phòng ban một nhóm, có dòng cộng từng phòng; in và Excel theo đúng dạng nhóm" }, [cb, document.createTextNode(" Nhóm theo phòng ban")])); }
    if (type === "THANH_TOAN") { tools.appendChild(btn("Lập chứng từ chuyển khoản", "", function () { payLap(PLG.HT.CK, src); })); tools.appendChild(btn("Lập phiếu chi tiền mặt", "", function () { payLap(PLG.HT.TM, src); })); }
    card.appendChild(tools);
    var kp = [h("div", { class: "kpi", html: "<small>Số dòng" + (vm.loc.length ? " (đang lọc)" : "") + "</small><b>" + vm.soDong + (vm.loc.length ? "/" + vm.soDongGoc : "") + "</b>" })];
    Object.keys(vm.tong).filter(function (k) { return k !== "Số người"; }).slice(-2).forEach(function (k) { kp.push(h("div", { class: "kpi", html: "<small>" + esc(k) + "</small><b>" + fmt(vm.tong[k]) + "</b>" })); });
    card.appendChild(h("div", { class: "kpis" }, kp));
    if (vm.loi.length) card.appendChild(h("div", { class: "warn", "data-pay-errors": String(vm.loi.length), html: "<b>⛔ " + vm.loi.length + " lỗi nghiêm trọng — chặn xuất chính thức:</b><br>" + vm.loi.slice(0, 8).map(esc).join("<br>") + (vm.loi.length > 8 ? "<br>…" : "") }));
    if (vm.canhbao.length) card.appendChild(h("div", { class: "hint", html: "⚠ " + vm.canhbao.slice(0, 5).map(esc).join(" · ") }));
    var t = h("table", { "data-pay-report": type }), hr = h("tr");
    vm.cols.forEach(function (c) { hr.appendChild(h("th", { class: c.kind === "text" ? "" : "r", text: c.label })); });
    var head = [];
    if (vm.groups) head.push(h("tr", {}, vm.groups.map(function (g) { return h("th", { colspan: String(g.to - g.from + 1), class: "th-grp", text: g.label }); })));
    head.push(hr); t.appendChild(h("thead", {}, head)); var tb = h("tbody");
    var drawRow = function (r) { var trw = h("tr", type === "CHI_TIET_TT" ? { "data-ma": r["Mã NV"], style: "cursor:pointer", title: "Bấm để xem chi tiết thanh toán" } : {}, vm.cols.map(function (c) { var v = r[c.key]; return h("td", { class: c.kind === "text" ? "t" : "r", text: c.kind === "money" ? fmt(v) : c.kind === "qty" ? qtyText(v) : (v == null ? "" : String(v)) }); }));
      if (type === "CHI_TIET_TT") trw.addEventListener("click", function () { payDetailModal(r, src); });
      tb.appendChild(trw); };
    if (vm.nhom) vm.nhom.forEach(function (g) {
      tb.appendChild(h("tr", {}, [h("td", { class: "td-grp", colspan: vm.cols.length, text: g.ten + " (" + g.rows.length + " người)" })]));
      g.rows.forEach(drawRow);
      var iN = Math.max(0, vm.cols.map(function (c) { return c.key; }).indexOf("Họ và tên"));
      tb.appendChild(h("tr", { class: "tr-sum" }, vm.cols.map(function (c, i) { return h("td", { class: c.kind === "text" || c.kind === "qty" ? "t" : "r", text: i === iN ? "Cộng " + g.ten : (g.tong[c.key] != null ? fmt(g.tong[c.key]) : "") }); })));
    }); else vm.rows.forEach(drawRow);
    if (vm.rows.length) tb.appendChild(h("tr", { class: "tr-sum" }, vm.cols.map(function (c, i) { return h("td", { class: i === 0 ? "t" : "r", text: i === 0 ? "TỔNG CỘNG" : (vm.tong[c.key] != null ? fmt(vm.tong[c.key]) : "") }); })));
    t.appendChild(tb);
    if (!vm.rows.length) card.appendChild(h("div", { class: "empty", text: "Không có dòng nào cần thanh toán theo bộ lọc hiện tại." }));
    card.appendChild(h("div", { class: "tw" }, [t])); w.appendChild(card);
    if (["CHUYEN_KHOAN", "TIEN_MAT", "THANH_TOAN", "CHI_TIET_TT"].indexOf(type) >= 0) {
      tools.appendChild(btn("Mở sổ chứng từ", "ghost", function () { st.tab = "rp_soct"; saveUi(); render(); }));
    }
    return w;
  }

  // ---------- V10.1: MẪU BÁO CÁO RIÊNG — nhân sự · sản lượng · bơm dăm · thưởng/trừ · tạm ứng · suất cơm ----------
  var OPS_SCREENS = { rp_ns: "NHAN_SU", rp_sl: "SAN_LUONG", rp_bd: "BOM_DAM", rp_th: "THUONG", rp_tu: "TAM_UNG", rp_com: "SUAT_COM" };
  var OPS_KPI = { SAN_LUONG: ["KL hàng (Tấn)"], BOM_DAM: ["Số xe"], THUONG: ["Thưởng", "Thu nhập khác", "Trừ khác", "Thực nhận"], TAM_UNG: ["Tạm ứng"], SUAT_COM: ["Tổng suất"] };
  function opsVm(type) {
    var opt = { nam: st.nam, thang: st.thang, tenCongTy: congTy()["Tên công ty"] || "", ngay: new Date().toLocaleDateString("vi-VN"), nguoiLap: session ? session.hoTen : "", chot: !!kyChot(kyKey(st.nam, st.thang)),
      hr: HRM, num: E.num, money: E.money, phongBan: st.opsPB || "", tuKhoa: st.opsKw || "", trangThaiNV: st.opsTT || "dang", homNay: HRM.today() };
    var snapshot = OPS.closedTables[type] && kyChot(kyKey(st.nam, st.thang));
    if ((type === "THUONG" || type === "TAM_UNG") && can("payroll.view")) {
      if (snapshot) opt.bangluong = snapshot.kq.bangluong;
      else if (db.nhanvien.length) opt.bangluong = kqKy(st.nam, st.thang).kq.bangluong;
    }
    var table = OPS.closedTables[type], production = type === "SAN_LUONG" || type === "BOM_DAM";
    if (production && st.opsReceipt?.type === type && st.opsReceipt.ky === kyStr()) opt.receipt = st.opsReceipt;
    if (snapshot) return OPS.buildClosed(type, snapshot, opt);
    if (production) opt.alloc = reportAllocation(st.nam, st.thang, table);
    var report = OPS.build(type, db, opt);
    if (production) report.trangThai = allocationReportSource(table, kyStr());
    return report;
  }
  function opsExportOk(vm) {
    if (!need("export", "xuất báo cáo")) return false;
    if (vm.loi.length) { alert("⛔ Không xuất được — " + vm.loi.length + " lỗi dữ liệu làm báo cáo sai:\n\n" + vm.loi.slice(0, 10).map(function (x) { return "• " + x; }).join("\n") + (vm.loi.length > 10 ? "\n…" : "") + "\n\nSửa dữ liệu nguồn rồi mở lại báo cáo."); return false; }
    if (!vm.rows.length && !vm.extras.some(function (sheet) { return sheet.rows.length; })) { toast("Không có dòng nào để xuất"); return false; }
    return true;
  }
  function opsXlsx(vm) {
    if (!opsExportOk(vm)) return;
    if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.reportXlsx) { alert("Thiếu thư viện Excel"); return; }
    window.HAKUi.reportXlsx.buildMany(window.ExcelJS, OPS.sheetVms(vm), { nguoiLap: vm.nguoiLap }).xlsx.writeBuffer().then(function (buf) {
      download(vm.file + "_" + vm.kyKey + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
      audit("Xuất Excel " + vm.title, (vm.ky || vm.kyText) + " · " + vm.soDong + " dòng · phạm vi: " + vm.phamVi);
    }, function (e) { alert("Không tạo được file: " + e.message); });
  }
  function opsPdf(vm) {
    if (!opsExportOk(vm)) return;
    exportSheetsPdf({ title: vm.title, ky: vm.kyText, trangThai: vm.trangThai, loc: vm.loc, ghiChu: vm.ghiChu, sheets: OPS.toSheets(vm) }, vm.file + "_" + vm.kyKey + ".pdf", { chuKy: vm.chuKy });
  }
  /** Xuất bảng dạng mảng đối tượng (báo cáo nhân sự có sẵn) theo mẫu chung: tiêu đề công ty / TÊN IN HOA / chữ ký / A4 ngang. */
  function opsRowsVm(title, rows, file) {
    return OPS.fromRows(title, rows, { tenCongTy: congTy()["Tên công ty"] || "", ngay: new Date().toLocaleDateString("vi-VN"), nguoiLap: session ? session.hoTen : "", file: file, kyKey: HRM.today(), kyText: "Tính đến ngày " + new Date().toLocaleDateString("vi-VN") });
  }
  function opsTable(attr, type, cols, groups, rows, tong, tongNhan) {
    var t = h("table", { "data-ops-report": attr }), hr = h("tr");
    cols.forEach(function (c) { hr.appendChild(h("th", { class: c.kind === "text" ? "" : "r", text: c.label })); });
    var head = [];
    if (groups) head.push(h("tr", {}, groups.map(function (g) { return h("th", { colspan: String(g.to - g.from + 1), class: "th-grp", text: g.label }); })));
    head.push(hr); t.appendChild(h("thead", {}, head));
    var tb = h("tbody");
    rows.forEach(function (r) { tb.appendChild(h("tr", {}, cols.map(function (c) { return h("td", { class: c.kind === "text" ? "t" : "r", text: opsFmtCell(c, r[c.key]) }); }))); });
    if (rows.length) tb.appendChild(h("tr", { class: "tr-sum" }, cols.map(function (c, i) { return h("td", { class: i === 0 ? "t" : "r", text: i === 0 ? (tongNhan || "TỔNG CỘNG") : (tong && tong[c.key] != null ? opsFmtCell(c, tong[c.key]) : "") }); })));
    t.appendChild(tb); return t;
  }
  function tabOpsReport(type) {
    var w = h("div"), card = h("div", { class: "card" }), T = OPS.TYPES[type], vm = opsVm(type);
    card.appendChild(h("h3", { "data-report-title": type, text: vm.title }));
    if (type === "SAN_LUONG" || type === "BOM_DAM") {
      card.appendChild(h("p", { class: "hint", text: "Phiếu gốc để kiểm kê. Kết quả phân bổ là chi tiết chia của cùng các phiếu này." }));
      var inputTable = OPS.closedTables[type];
      if (!kyChot(kyStr()) && tabAllowed(inputTable)) card.appendChild(btn("Mở bảng nhập phiếu", "ghost", function () {
        st.opsReceipt = null; st.tab = inputTable; saveUi(); render();
      }));
      if (st.opsReceipt?.type === type && st.opsReceipt.ky === kyStr()) {
        card.appendChild(btn("Bỏ lọc phiếu " + st.opsReceipt.number, "ghost", function () { st.opsReceipt = null; render(); }));
      }
    }
    if ((type === "SAN_LUONG" || type === "BOM_DAM") && tabAllowed("baocaoluong")) {
      card.appendChild(btn("Xem kết quả phân bổ", "ghost", function () {
        st.tab = "baocaoluong"; st.bcl = "sanluong"; st.bclLoai = type === "BOM_DAM" ? "bandam" : "sanluong";
        saveUi(); render();
      }));
    }
    card.appendChild(h("div", { class: "hint", text: (T.theoKy ? "Kỳ " + vm.ky + " (đổi ở ô Kỳ lương phía trên) · " + vm.trangThai + ". " : "") + (vm.ghiChu || []).join(" ") + " Excel và PDF xuất đúng theo bộ lọc đang chọn." }));
    var bar = h("div", { class: "bar" }), pbs = {};
    var snapshot = OPS.closedTables[type] && kyChot(kyKey(st.nam, st.thang));
    var departments = snapshot ? snapshot.input?.danhmuc?.dm_phongban : db.dm_phongban;
    (departments || []).forEach(function (p) { if (p && p["Tên phòng ban"]) pbs[p["Tên phòng ban"]] = 1; });
    var pbSel = h("select", { "aria-label": "Phòng ban", "data-ops-key": "phongBan" }); pbSel.appendChild(h("option", { value: "", text: "— Tất cả phòng ban —" }));
    Object.keys(pbs).sort().forEach(function (n) { pbSel.appendChild(h("option", { value: n, text: n })); });
    pbSel.value = st.opsPB || ""; pbSel.addEventListener("change", function () { st.opsPB = pbSel.value; render(); }); bar.appendChild(pbSel);
    if (type === "NHAN_SU") {
      var ttSel = h("select", { "aria-label": "Trạng thái", "data-ops-key": "trangThaiNV" });
      [["dang", "Đang làm việc"], ["nghi", "Đã nghỉ việc"], ["tatca", "Tất cả"]].forEach(function (o) { ttSel.appendChild(h("option", { value: o[0], text: o[1] })); });
      ttSel.value = st.opsTT || "dang"; ttSel.addEventListener("change", function () { st.opsTT = ttSel.value; render(); }); bar.appendChild(ttSel);
    }
    var q = h("input", { class: "i", placeholder: "Tìm mã / tên / số chứng từ…", value: st.opsKw || "", "data-ops-key": "tuKhoa" });
    q.addEventListener("change", function () { st.opsKw = q.value; render(); }); bar.appendChild(q);
    bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("⬇ Xuất Excel", "pri", function () { opsXlsx(vm); }));
    bar.appendChild(btn("⬇ Xuất PDF", "", function () { opsPdf(vm); }));
    card.appendChild(bar);
    var kp = [h("div", { class: "kpi", html: "<small>Số dòng" + (vm.loc.length ? " (đang lọc)" : "") + "</small><b>" + vm.soDong + (vm.loc.length ? "/" + vm.soDongGoc : "") + "</b>" })];
    if (type === "NHAN_SU" && vm.thongKe) { kp.push(h("div", { class: "kpi", html: "<small>Đang làm việc (toàn công ty)</small><b>" + vm.thongKe.dang + "</b>" })); kp.push(h("div", { class: "kpi", html: "<small>Đã nghỉ việc</small><b>" + vm.thongKe.nghi + "</b>" })); }
    (OPS_KPI[type] || []).forEach(function (k) { if (vm.tong[k] != null) kp.push(h("div", { class: "kpi" + (k === "Thực nhận" ? " main" : ""), html: "<small>" + esc(k) + "</small><b>" + opsFmtCell({ kind: type === "THUONG" || type === "TAM_UNG" ? "money" : "qty3", label: k }, vm.tong[k]) + "</b>" })); });
    card.appendChild(h("div", { class: "kpis" }, kp));
    if (vm.loi.length) card.appendChild(h("div", { class: "warn", "data-ops-errors": String(vm.loi.length), html: "<b>⛔ " + vm.loi.length + " lỗi dữ liệu — chặn xuất file:</b><br>" + vm.loi.slice(0, 8).map(esc).join("<br>") + (vm.loi.length > 8 ? "<br>…" : "") }));
    if (vm.canhbao.length) card.appendChild(h("div", { class: "hint", "data-ops-warns": String(vm.canhbao.length), html: "⚠ " + vm.canhbao.slice(0, 6).map(esc).join(" · ") + (vm.canhbao.length > 6 ? " · … (" + vm.canhbao.length + " cảnh báo)" : "") }));
    if (!vm.rows.length) card.appendChild(h("div", { class: "empty", text: "Không có dòng nào" + (T.theoKy ? " trong kỳ " + vm.ky : "") + (vm.loc.length ? " theo bộ lọc hiện tại." : ".") }));
    card.appendChild(h("div", { class: "tw" }, [opsTable(type, type, vm.cols, vm.groups, vm.rows, vm.tong, vm.tongNhan)]));
    (vm.extras || []).forEach(function (e) { card.appendChild(h("div", { class: "fh", text: e.title })); card.appendChild(h("div", { class: "tw" }, [opsTable(type + "_" + e.name, type, e.cols, null, e.rows, e.tong, null)])); });
    w.appendChild(card); return w;
  }
  function tabBangTinhNoiBo() {
    var w = h("div"), card = h("div", { class: "card" }), src = kqKy(st.nam, st.thang);
    card.appendChild(h("div", { class: "hint", html: (src.chot ? "🔒 Kỳ <b>đã chốt</b>" : "⚠ Kỳ <b>chưa chốt</b> — tính tạm") + " · Chỉ các khoản <b>tính ra thu nhập</b> (không BH, thuế, tạm ứng, thực lĩnh). Cùng một bộ lọc với Tính lương, Excel và PDF." }));
    card.appendChild(reportFilterBar(src.kq.bangluong, { summaryCols: ["Tổng thu nhập"] }));
    var vm = IPAY.build(src.kq, { nam: st.nam, thang: st.thang, filter: st.rf, tenCongTy: congTy()["Tên công ty"] || "", chot: src.chot, cheDoBu: src.kq.cheDoBu });
    var tools = h("div", { class: "bar" });
    tools.appendChild(btn("⬇ Xuất PDF", "pri", function () { exportPdf(vm, "BangTinhLuong_" + kyStr() + ".pdf", { chuKy: ["Người lập", "Kế toán trưởng", "Giám đốc"] }); }));
    tools.appendChild(btn("⬇ Xuất Excel", "", function () {
      if (!need("export", "xuất dữ liệu ra Excel") || formulaErrorsBlock("BangTinhLuong")) return;
      if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.reportXlsx) { alert("Thiếu thư viện Excel"); return; }
      window.HAKUi.reportXlsx.build(window.ExcelJS, IPAY.toXlsxVm(vm, { ngayLap: new Date().toLocaleDateString("vi-VN"), nguoiLap: session ? session.hoTen : "" }), { chuKy: ["Người lập", "Kế toán trưởng", "Giám đốc"] }).xlsx.writeBuffer().then(function (buf) {
        download("BangTinhLuong_" + kyStr() + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf); audit("Xuất Excel BẢNG TÍNH LƯƠNG", kyStr() + " · " + vm.soDong + " dòng");
      }, function (e) { alert("Không tạo được file: " + e.message); });
    }));
    card.appendChild(tools);
    if (vm.kiemTra.lech.length) card.appendChild(h("div", { class: "warn", html: "<b>⚠ " + vm.kiemTra.lech.length + " dòng có tổng các khoản ≠ Tổng thu nhập engine:</b> " + vm.kiemTra.lech.slice(0, 8).map(function (x) { return esc(x.maNV); }).join(", ") }));
    card.appendChild(h("div", { class: "kpis" }, [h("div", { class: "kpi", html: "<small>Số người" + (vm.loc.length ? " (đang lọc)" : "") + "</small><b>" + vm.soDong + (vm.loc.length ? "/" + vm.soDongGoc : "") + "</b>" }), h("div", { class: "kpi main", html: "<small>Tổng thu nhập</small><b>" + fmt(vm.tong["Tổng thu nhập"] || 0) + "</b>" })]));
    var t = h("table", { "data-bangtinh": "1" }), hr = h("tr");
    vm.cols.forEach(function (c, i) { hr.appendChild(h("th", { class: (c.kind === "text" ? "" : "r") + (i === 0 ? " stk" : ""), text: c.label })); });
    t.appendChild(h("thead", {}, [hr])); var tb = h("tbody");
    vm.groups.forEach(function (g) {
      tb.appendChild(h("tr", {}, [h("td", { class: "td-grp", colspan: vm.cols.length, text: g.ten + " (" + g.rows.length + " người)" })]));
      g.rows.forEach(function (r) { tb.appendChild(h("tr", {}, vm.cols.map(function (c, i) { var v = r[c.key]; return h("td", { class: (c.kind === "text" ? "t" : "r") + (i === 0 ? " stk" : ""), style: c.strong ? "font-weight:700" : "", text: c.kind === "text" ? (v == null ? "" : v) : (!v ? "–" : fmt(v)) }); }))); });
      tb.appendChild(h("tr", { class: "tr-sum" }, vm.cols.map(function (c, i) { return h("td", { class: i < 3 ? "t" : "r", text: i === 1 ? "Cộng " + g.ten : (g.tong[c.key] != null ? fmt(g.tong[c.key]) : "") }); })));
    });
    t.appendChild(tb);
    t.appendChild(h("tfoot", {}, [h("tr", {}, vm.cols.map(function (c, i) { return h("td", { class: i < 3 ? "t" : "r", text: i === 0 ? "TỔNG" : (vm.tong[c.key] != null ? fmt(vm.tong[c.key]) : "") }); }))]));
    if (!vm.soDong) card.appendChild(h("div", { class: "empty", text: "Không có dòng nào khớp bộ lọc." }));
    card.appendChild(h("div", { class: "tw" }, [t])); w.appendChild(card); return w;
  }

  function renderKq(box, card, bar) {
    var rAll = st.kq, rf = RF.apply(rAll.bangluong, st.rf), r = Object.assign({}, rAll, { bangluong: rf.rows }), sum = function (c) { return r.bangluong.reduce(function (a, x) { return a + (+x[c] || 0); }, 0); };
    box.appendChild(h("div", { class: "kpis" }, [
      h("div", { class: "kpi", html: "<small>Số nhân viên</small><b>" + r.bangluong.length + "</b>" }),
      h("div", { class: "kpi", html: "<small>Tổng thu nhập</small><b>" + fmt(sum("Tổng thu nhập")) + "</b>" }),
      h("div", { class: "kpi", html: "<small>Khấu trừ (BH + KPCĐ + thuế)</small><b>" + fmt(sum("BH trừ NLĐ") + sum("KPCĐ trừ NLĐ") + sum("Thuế TNCN") + sum("Truy thu BH")) + "</b>" }),
      h("div", { class: "kpi main", html: "<small>Tổng thực lĩnh</small><b>" + fmt(sum("Thực lĩnh")) + "</b>" })]));
    card.appendChild(reportFilterBar(rAll.bangluong));
    if (!RF.isEmpty(st.rf)) card.appendChild(h("div", { class: "hint", text: "Đang lọc: " + RF.describe(st.rf).join(" · ") + " — " + rf.kept + "/" + rf.total + " dòng (Excel xuất ra cũng theo bộ lọc này)." }));
    if (r.canhbao.length) card.appendChild(h("div", { class: "warn", html: "<b>⚠ Cần kiểm tra dữ liệu:</b><br>" + r.canhbao.map(esc).join("<br>") }));
    var noC = r.bangluong.filter(function (x) { return !x["Tổng công"]; });
    if (noC.length) card.appendChild(h("div", { class: "warn", html: "<b>⚠ " + noC.length + " nhân viên chưa có công trong kỳ:</b> " + noC.slice(0, 12).map(function (x) { return esc(x["Họ và tên"]); }).join(", ") + (noC.length > 12 ? "…" : "") }));
    var cols = st.compact ? COLS_COMPACT : COLS_FULL;
    bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn(st.compact ? "Xem đủ cột" : "Xem gọn", "", function () { st.compact = !st.compact; saveUi(); render(); }));
    bar.appendChild(btn("🖨 In phiếu lương", "", function () { st.tab = "slips"; render(); }));
    var mn = h("select", { style: "min-width:150px" }); mn.appendChild(h("option", { text: "⬇ Xuất Excel…" }));
    [["Bảng lương", "bl"], ["BHXH", "bh"], ["Thuế TNCN", "tn"], ["Danh sách chuyển khoản", "ck"]].forEach(function (o) { mn.appendChild(h("option", { value: o[1], text: o[0] })); });
    mn.addEventListener("change", function () {
      var m = excelSheets(r, r.ky || kyStr())[mn.value];
      if (m) saveXlsx(m.name + "_" + (r.ky || kyStr()) + ".xlsx", [m]); mn.selectedIndex = 0;
    });
    bar.appendChild(mn);
    bar.appendChild(btn("⬇ Xuất PDF…", "", function () {
      var pick = excelSheets(r, r.ky || kyStr()), ds = [["Bảng lương", "bl"], ["BHXH", "bh"], ["Thuế TNCN", "tn"], ["Danh sách chuyển khoản", "ck"]];
      var which = st.pdfPick || "bl"; var o = ds.filter(function (x) { return x[1] === which; })[0] || ds[0], m = pick[o[1]];
      exportSheetsPdf({ title: o[0] + " lương", ky: "Kỳ " + (r.ky || kyStr()), trangThai: (kqKy(st.nam, st.thang).chot ? "Đã chốt" : "Chưa chốt — tính tạm"), loc: RF.describe(st.rf), sheets: [{ name: o[0], cols: o[1] === "bl" ? (st.compact ? COLS_COMPACT : COLS_FULL) : m.cols, rows: m ? m.rows : [] }] }, m.name + "_" + (r.ky || kyStr()) + ".pdf");
    }, "PDF của bảng lương đang xem (theo bộ lọc)"));
    var pm = h("select", { "aria-label": "Loại PDF", style: "min-width:140px" });
    [["Bảng lương", "bl"], ["BHXH", "bh"], ["Thuế TNCN", "tn"], ["Danh sách chuyển khoản", "ck"]].forEach(function (o) { pm.appendChild(h("option", { value: o[1], text: o[0] })); });
    pm.value = st.pdfPick || "bl"; pm.addEventListener("change", function () { st.pdfPick = pm.value; }); bar.appendChild(pm);
    card.appendChild(h("div", { class: "hint", text: "Bấm vào một dòng để xem chi tiết cách tính và in phiếu lương của người đó." }));
    var tw = h("div", { class: "tw" }), t = h("table"), tr = h("tr");
    cols.forEach(function (c, i) { tr.appendChild(h("th", { class: (TEXTCOLS[c] ? "" : "r") + (i === 0 ? " stk" : ""), text: c })); });
    t.appendChild(h("thead", {}, [tr])); var tb = h("tbody");
    r.bangluong.forEach(function (row) {
      var x = h("tr", { class: "click", on: { click: function () { slipDialog(row); } } });
      cols.forEach(function (c, i) {
        var v = row[c], cl = (TEXTCOLS[c] ? "t" : "r") + (i === 0 ? " stk" : "");
        if (!TEXTCOLS[c] && !v) { x.appendChild(h("td", { class: cl + " z", text: "–" })); return; }
        x.appendChild(h("td", { class: cl + (c === "Thực lĩnh" ? "" : ""), style: c === "Thực lĩnh" ? "font-weight:700" : "", text: fmt(v) }));
      });
      tb.appendChild(x);
    });
    t.appendChild(tb);
    var tf = h("tr"); cols.forEach(function (c, i) { tf.appendChild(h("td", { text: i === 0 ? "TỔNG" : (TEXTCOLS[c] || c === "Công chuẩn" ? "" : fmt(Math.round(sum(c) * 1000) / 1000)), style: i === 0 ? "text-align:left;left:0" : "" })); });
    t.appendChild(h("tfoot", {}, [tf])); tw.appendChild(t); card.appendChild(tw); box.appendChild(card);
    return box;
  }

  var SLIP_LINES = [["Lương thời gian", "Lương thời gian"], ["Lương phụ", "Lương phụ"], ["Lương sản lượng", "Lương sản lượng"], ["Lương bù SL", "Lương bù sản lượng"], ["Lương bơm dăm", "Lương bơm dăm"], ["Tiền tăng ca", "Tiền tăng ca"], ["Phụ cấp", "Phụ cấp"], ["Phụ cấp công tác", "Phụ cấp công tác"], ["Lương hỗ trợ", "Lương hỗ trợ"], ["Tiền cơm", "Tiền cơm"], ["Thưởng", "Thưởng"], ["Thu nhập khác", "Thu nhập khác"], ["Tổng thu nhập", "TỔNG THU NHẬP", 1], ["BH trừ NLĐ", "− BHXH/BHYT/BHTN"], ["KPCĐ trừ NLĐ", "− KPCĐ"], ["Truy thu BH", "− Truy thu bảo hiểm"], ["Thuế TNCN", "− Thuế TNCN"], ["Trừ khác", "− Trừ khác"], ["Tạm ứng", "− Tạm ứng"], ["Thực lĩnh", "THỰC LĨNH", 1]];
  /** Phiếu lương chia 3 phần: I. THU NHẬP · II. KHẤU TRỪ · III. TẠM ỨNG, rồi dòng THỰC LĨNH. Chỉ đọc số engine đã tính; không tính lại tiền. */
  var SLIP_TN = [["Lương thời gian", "Lương thời gian"], ["Lương phụ", "Lương phụ"], ["Lương sản lượng", "Lương sản lượng"], ["Lương bù SL", "Lương bù sản lượng"], ["Lương bơm dăm", "Lương bơm dăm"], ["Tiền tăng ca", "Tiền tăng ca"], ["Phụ cấp", "Phụ cấp"], ["Phụ cấp công tác", "Phụ cấp công tác"], ["Lương hỗ trợ", "Lương hỗ trợ"], ["Tiền cơm", "Tiền cơm"], ["Thưởng", "Thưởng"], ["Thu nhập khác", "Thu nhập khác"]];
  var SLIP_KT = [["BH trừ NLĐ", "Bảo hiểm (BHXH/BHYT/BHTN) người lao động"], ["KPCĐ trừ NLĐ", "Kinh phí công đoàn (KPCĐ)"], ["Truy thu BH", "Truy thu bảo hiểm"], ["Thuế TNCN", "Thuế thu nhập cá nhân"], ["Trừ khác", "Khấu trừ khác"]];
  function slipLines(b) {
    var out = [], n = function (k) { return +b[k] || 0; }, sum = function (L) { return L.reduce(function (a, l) { return a + n(l[0]); }, 0); };
    out.push({ sec: "I. THU NHẬP" });
    SLIP_TN.forEach(function (l) { if (b[l[0]]) out.push({ label: l[1], value: n(l[0]) }); });
    out.push({ label: "Tổng thu nhập", value: n("Tổng thu nhập"), tot: true });
    out.push({ sec: "II. KHẤU TRỪ" });
    SLIP_KT.forEach(function (l) { if (b[l[0]]) out.push({ label: l[1], value: n(l[0]) }); });
    out.push({ label: "Cộng khấu trừ", value: sum(SLIP_KT), tot: true });
    out.push({ sec: "III. TẠM ỨNG" });
    out.push({ label: "Tạm ứng đã nhận trong kỳ", value: n("Tạm ứng") });
    out.push({ label: "Cộng tạm ứng", value: n("Tạm ứng"), tot: true });
    var thieu = n("Còn thiếu (thực lĩnh âm)");
    if (thieu > 0) out.push({ label: "Còn thiếu — chưa tự chuyển sang kỳ sau", value: thieu });
    var lech = n("Thực lĩnh") - (n("Tổng thu nhập") - sum(SLIP_KT) - n("Tạm ứng")) - thieu;
    if (Math.abs(lech) >= 1) out.push({ label: "Làm tròn", value: lech });
    out.push({ label: "THỰC LĨNH (I − II − III)", value: n("Thực lĩnh"), tot: true, grand: true });
    return out;
  }
  function slipEl(b) {
    var s = h("div", { class: "slip" });
    if (congTy()["Tên công ty"]) s.appendChild(h("div", { text: congTy()["Tên công ty"], style: "font-weight:700;text-transform:uppercase;font-size:13px" }));
    s.appendChild(h("h3", { text: "PHIẾU LƯƠNG THÁNG " + st.thang + "/" + st.nam, style: "text-align:center;margin:4px 0 10px" }));
    s.appendChild(h("div", { class: "head", html: "<b>" + esc(b["Họ và tên"]) + "</b> · Mã NV: " + esc(b["Mã NV"]) + (b["Phòng ban"] ? " · " + esc(b["Phòng ban"]) : "") + "<br><span style='color:#6c7a74'>Tổng công: " + b["Tổng công"] + " / Công chuẩn: " + b["Công chuẩn"] + (b["Sản lượng (tấn)"] ? " · Sản lượng: " + b["Sản lượng (tấn)"] + " tấn" : "") + "</span>" }));
    var t = h("table");
    slipLines(b).forEach(function (l) {
      if (l.sec) t.appendChild(h("tr", { class: "sec" }, [h("td", { colspan: 2, text: l.sec })]));
      else t.appendChild(h("tr", { class: l.grand ? "tot grand" : l.tot ? "tot" : "" }, [h("td", { text: l.label }), h("td", { text: fmt(l.value) })]));
    });
    s.appendChild(t); return s;
  }
  /**
   * Master Prompt V3 mục 16.3 ("Xem chi tiết cách tính"): từng chỉ tiêu hiện công thức + giá trị đã
   * thế vào. Đọc từ b["_ct"] (biến trung gian engine.js đã chụp lại khi tính lương) + các cột tiền đã
   * có sẵn trên b — KHÔNG tính lại, chỉ diễn giải.
   */
  var PP_THUE = { VL: "Khấu trừ vãng lai (10% tổng thu nhập, hoặc mức riêng trong danh mục)", LT: "Lũy tiến theo biểu thuế hiệu lực", MIEN: "Miễn / tạm không trừ thuế" };
  function ctRow(tc, congThuc, giaTri, ketQua, bold) {
    return h("tr", { style: bold ? "font-weight:700" : "" }, [
      h("td", { text: tc }), h("td", { style: "color:#6c7a74;font-size:12px", text: congThuc || "" }),
      h("td", { style: "color:#6c7a74", text: giaTri == null ? "" : String(giaTri) }), h("td", { class: "r", text: ketQua == null ? "" : fmt(ketQua) })
    ]);
  }
  function ctSection(ten) { return h("tr", {}, [h("td", { colspan: 4, text: ten, style: "font-weight:700;padding-top:10px;border-bottom:1px solid #d3dcc7" })]); }
  function cachTinhEl(b) {
    var c = b["_ct"] || {}, box = h("div", { class: "slip" }), t = h("table");
    t.appendChild(h("tr", {}, [h("th", { text: "Chỉ tiêu" }), h("th", { text: "Công thức" }), h("th", { text: "Giá trị đã thế" }), h("th", { class: "r", text: "Kết quả" })]));
    t.appendChild(ctSection("1. Lương thời gian"));
    t.appendChild(ctRow("Mã lương", "", c.maLuong + (c.hinhThucLuong ? " (" + c.hinhThucLuong + ")" : "")));
    t.appendChild(ctRow("Công chuẩn", "theo \"Cách tính\" của mã lương trong danh mục", c.congChuan + " công", c.congChuan));
    t.appendChild(ctRow("Công BT", "tổng công hình thức BT trong chấm công kỳ này", c.congBT + " công", c.congBT));
    var ctTG = c.maLuong === "CĐ" ? "= Lương thỏa thuận (cố định)" : (c.maLuong === "CN1" || c.maLuong === "CN2" || c.maLuong === "SP") ? "Lương thỏa thuận × Công tính TG" : "Đơn giá TG × Công tính TG";
    if (c.maLuong !== "CĐ") t.appendChild(ctRow("Đơn giá TG", "Lương thỏa thuận ÷ Công chuẩn", fmt(b["Lương thỏa thuận"]) + " ÷ " + c.congChuan, c.donGiaTG));
    t.appendChild(ctRow("Công tính TG", c.maLuong === "SP" ? "(xem Danh mục lương, cột \"Loại công thức\" — lễ+phép hoặc lễ+tăng ca)" : "công đi làm trong kỳ, đã trừ phần tính riêng (nếu có)", c.congTinhTG + " công", c.congTinhTG));
    t.appendChild(ctRow("Lương thời gian", ctTG, "", b["Lương thời gian"], true));
    if (c.maTangCa) {
      t.appendChild(ctSection("2. Tăng ca"));
      t.appendChild(ctRow("Mã tăng ca", "", c.maTangCa + (c.loaiCongThucTangCa && c.loaiCongThucTangCa !== c.maTangCa ? " (dùng công thức " + c.loaiCongThucTangCa + ")" : "")));
      t.appendChild(ctRow("Hệ số tăng ca", "theo Danh mục tăng ca", Math.round(c.heSoTangCa * 1000) / 10 + "%"));
      if (c.congChuan2) t.appendChild(ctRow("Công chuẩn 2", "chấm công có nhãn \"DQ\" → dùng thay Công chuẩn khi tính vượt chuẩn", c.congChuan2 + " công", c.congChuan2));
      t.appendChild(ctRow("Công tăng ca (thô)", "tổng công hình thức TC trong chấm công", b["Công tăng ca"] + " công", b["Công tăng ca"]));
      t.appendChild(ctRow("Công tăng ca quy đổi", "đã qua công thức " + (c.loaiCongThucTangCa || c.maTangCa) + " + hệ số " + Math.round(c.heSoTangCa * 1000) / 10 + "%", c.congTangCaQuyDoi + " công", c.congTangCaQuyDoi));
      t.appendChild(ctRow("Tiền tăng ca", "Đơn giá (TG hoặc Lương thỏa thuận) × Công tăng ca quy đổi", "", b["Tiền tăng ca"], true));
    }
    if (c.laSanLuong) {
      t.appendChild(ctSection("3. Sản lượng & bù lương"));
      t.appendChild(ctRow("Sản lượng", "tổng khối lượng đã phân bổ cho người này trong kỳ", b["Sản lượng (tấn)"] + " tấn", b["Sản lượng (tấn)"]));
      t.appendChild(ctRow("Đơn giá khoán", "theo Danh mục lương (\"Số tiền khoán\")", fmt(c.donGiaKhoan) + " đ/tấn", c.donGiaKhoan));
      t.appendChild(ctRow("Lương sản lượng", "Sản lượng × Đơn giá khoán", b["Sản lượng (tấn)"] + " × " + fmt(c.donGiaKhoan), b["Lương sản lượng"], true));
      if (c.phuongPhapBu) {
        var ppbTen = c.phuongPhapBu === "daihiep" ? "theo ngày bậc thang (Đại Hiệp)" : c.phuongPhapBu === "to" ? "bình quân tổ (HAK)" : c.phuongPhapBu === "ngay" ? "theo ngày (liên tục)" : "theo tháng";
        t.appendChild(ctRow("Phương pháp bù", "", ppbTen));
        t.appendChild(ctRow("Mức bù (DM_LUONG)", "\"Đơn giá bù lương\" trong Danh mục lương", fmt(c.mucBuDmLuong) + " đ", c.mucBuDmLuong));
        if (c.binhQuanTo != null) t.appendChild(ctRow("Bình quân tổ", "tổng tiền sản lượng cả tổ ÷ số ngày lịch tháng ÷ số người SP có công BT > 0", fmt(c.binhQuanTo) + " đ/người/ngày", c.binhQuanTo));
        if (c.phuongPhapBu === "daihiep") t.appendChild(ctRow("SL tham chiếu", "theo bậc thang công BT TỪNG NGÀY — xem sheet \"Bu luong theo ngay - DH\" trong file Excel Phân bổ khối lượng để xem chi tiết từng ngày", "", null));
        t.appendChild(ctRow("Tiền bù", "", "", b["Lương bù SL"], true));
      }
    }
    if (c.maPhuCap) {
      t.appendChild(ctSection("4. Phụ cấp"));
      t.appendChild(ctRow("Mã phụ cấp", "theo Danh mục phụ cấp, cột \"Loại công thức\"", c.maPhuCap + " (" + c.loaiCongThucPhuCap + ")"));
      t.appendChild(ctRow("Phụ cấp", "", "", b["Phụ cấp"], true));
    }
    t.appendChild(ctSection("5. Thuế & bảo hiểm"));
    if (c.maThueTNCN) {
      t.appendChild(ctRow("Mã thuế TNCN", "", c.maThueTNCN + " — " + (PP_THUE[c.phuongPhapThue] || c.phuongPhapThue)));
      t.appendChild(ctRow("Thu nhập chịu thuế", "Tổng thu nhập − BH NLĐ − KPCĐ NLĐ − Tiền cơm (vãng lai: = tổng thu nhập)", "", c.thuNhapChiuThue));
      t.appendChild(ctRow("Thu nhập tính thuế", "Thu nhập chịu thuế − giảm trừ bản thân − giảm trừ người phụ thuộc (không âm)", "", c.thuNhapTinhThue));
      t.appendChild(ctRow("Thuế khấu trừ", "áp biểu thuế / tỷ lệ của mã " + c.maThueTNCN, "", b["Thuế TNCN"], true));
    }
    t.appendChild(ctRow("Thuế TNCN", "", "", b["Thuế TNCN"], true));
    t.appendChild(ctRow("BH trừ NLĐ", "theo Danh mục bảo hiểm, tỷ lệ NLĐ đóng", "", b["BH trừ NLĐ"], true));
    t.appendChild(ctSection("6. Thực lĩnh"));
    t.appendChild(ctRow("Tổng thu nhập", "cộng mọi khoản thu nhập (lương TG + tăng ca + SL + bù + phụ cấp + hỗ trợ + cơm + thưởng + khác)", "", b["Tổng thu nhập"]));
    var giamTru = (b["Truy thu BH"] || 0) + (b["BH trừ NLĐ"] || 0) + (b["KPCĐ trừ NLĐ"] || 0) + (b["Thuế TNCN"] || 0) + (b["Trừ khác"] || 0) + (b["Tạm ứng"] || 0);
    t.appendChild(ctRow("Tổng giảm trừ", "BH + KPCĐ + Truy thu BH + Thuế TNCN + Trừ khác + Tạm ứng", "", giamTru));
    t.appendChild(ctRow("Thực lĩnh", "Tổng thu nhập − Tổng giảm trừ, làm tròn 1.000đ", "", b["Thực lĩnh"], true));
    if (b["Còn thiếu (thực lĩnh âm)"] > 0) t.appendChild(ctRow("Còn thiếu", "Khoản trừ vượt thu nhập; ghi nhận để đối chiếu, chưa tự khấu trừ kỳ sau", "", b["Còn thiếu (thực lĩnh âm)"], true));
    box.appendChild(t);
    box.appendChild(h("div", { class: "hint", style: "margin-top:8px", text: "Số liệu lấy đúng từ bảng lương đã tính của kỳ này — không tính lại. Đối chiếu công thức gốc: menu Hướng dẫn & Quy chế lương." }));
    return box;
  }
  /** V9.4 — XEM CHI TIẾT TÍNH THUẾ: luồng Nhân viên → Mã TNCN → biểu thuế → bậc → giảm trừ → thuế (số lấy từ bảng lương đã tính). */
  function taxDetailEl(b, snapshot) {
    var c = b._ct || {}, box = h("div", { "data-tax-detail": "1" }), t = h("table");
    var row = function (k, v, note) { t.appendChild(h("tr", {}, [h("td", { class: "t", text: k }), h("td", { class: "r", text: v }), h("td", { class: "t hint", text: note || "" })])); };
    var sec = function (x) { t.appendChild(h("tr", {}, [h("td", { colspan: 3, text: x, style: "font-weight:700;padding-top:8px;border-bottom:1px solid #d3dcc7" })])); };
    var nv = snapshot ? {} : (db.nhanvien || []).filter(function (n) { return n["Mã NV"] === b["Mã NV"]; })[0] || {};
    sec("1. Hồ sơ & cấu hình");
    row("Nhân viên", b["Mã NV"] + " — " + b["Họ và tên"], "kỳ " + st.thang + "/" + st.nam);
    row("Mã TNCN", c.maThueTNCN || "(chưa có)", c.maThueTNCN ? (PP_THUE[c.phuongPhapThue] || c.phuongPhapThue || "") : "Chưa gán mã thuế — KHÔNG tự chọn mã khác");
    row("Mã giảm trừ bản thân / phụ thuộc", (c.maGTBT || "—") + " / " + (c.maGTPT || "—"), "tra theo hiệu lực trong kỳ");
    row("Số người phụ thuộc (kỳ này)", String(c.soNPT || 0), nv["Người phụ thuộc"] != null ? "hồ sơ ghi " + nv["Người phụ thuộc"] : "");
    sec("2. Ba chỉ tiêu thuế (tách riêng)");
    row("Thu nhập chịu thuế", fmt(c.thuNhapChiuThue) + " đ", "= Tổng thu nhập " + fmt(b["Tổng thu nhập"]) + " − BH NLĐ " + fmt(b["BH trừ NLĐ"]) + " − KPCĐ NLĐ " + fmt(b["KPCĐ trừ NLĐ"]) + (c.phuongPhapThue === "VL" ? " (vãng lai: không trừ)" : " − Tiền cơm " + fmt(b["Tiền cơm"])));
    row("Giảm trừ bản thân", fmt(c.giamTruBanThan) + " đ", "");
    row("Giảm trừ người phụ thuộc", fmt(c.giamTruPhuThuoc) + " đ", c.soNPT + " người");
    row("Thu nhập tính thuế", fmt(c.thuNhapTinhThue) + " đ", "= max(0, chịu thuế − giảm trừ)");
    row("Thuế khấu trừ", fmt(b["Thuế TNCN"]) + " đ", c.phuongPhapThue === "VL" ? "tỷ lệ " + Math.round((c.tyLeVangLai || 0) * 1000) / 10 + "% × tổng thu nhập" : "");
    if (c.phuongPhapThue && c.phuongPhapThue !== "VL" && c.phuongPhapThue !== "MIEN" && c.maThueTNCN) {
      sec("3. Biểu thuế & bậc áp dụng");
      var config = snapshot ? snapshot.input && snapshot.input.danhmuc : db;
      var tt = config ? E.thuThuTNCN(config, c.maThueTNCN, st.nam, st.thang, c.thuNhapTinhThue) : null;
      if (!tt) row("Biểu thuế", "—", "Bản chốt cũ chưa lưu danh mục thuế.");
      else if (!tt.ok) row("TAX_CONFIG_ERROR", "—", tt.loi);
      else {
        row("Phương pháp", tt.phuongPhap, "biểu hiệu lực trong kỳ");
        (tt.bieu || []).forEach(function (bk) {
          var tu = E.money(bk["Thu nhập từ"]), den = E.money(bk["Thu nhập đến"]), tl = E.pct(bk["Tỷ lệ"]);
          var trong = c.thuNhapTinhThue > tu && (!den || c.thuNhapTinhThue <= den);
          row("Bậc " + bk["Bậc"] + (trong ? "  ◄ áp dụng" : ""), Math.round(tl * 1000) / 10 + "%", fmt(tu) + " → " + (den ? fmt(den) : "không giới hạn") + (E.money(bk["Trừ nhanh"]) ? " · trừ nhanh " + fmt(E.money(bk["Trừ nhanh"])) : ""));
        });
        row("Thuế tính lại từ biểu", fmt(tt.thue) + " đ", tt.thue === b["Thuế TNCN"] ? "khớp bảng lương" : "LỆCH bảng lương " + fmt(b["Thuế TNCN"]) + " — biểu đã đổi sau khi tính, cần tính lại");
      }
    }
    (c.loiThueNV || []).forEach(function (m) { row("Lỗi cấu hình", "—", m); });
    box.appendChild(t);
    box.appendChild(h("div", { class: "hint", style: "margin-top:8px", text: "KPCĐ NLĐ được trừ khi xác định thu nhập chịu thuế; KPCĐ công ty đóng không ảnh hưởng thuế NLĐ. Kỳ đã chốt hiển thị số đã chốt, không đổi theo cấu hình hiện hành." }));
    return box;
  }
  function employeePayrollReview(b, ky) {
    var snapshot = kyChot(ky);
    var source = snapshot ? snapshot.input && snapshot.input.data : db;
    var box = h("div", { "data-payroll-source-review": snapshot ? "closed" : "open" });
    box.appendChild(h("p", { class: "hint", text: snapshot ? "Nguồn: Bản chốt v" + (snapshot.version || 1) : "Đối chiếu bảng lương đang xem với chứng từ hiện tại. Nếu đã sửa dữ liệu, hãy tính lương lại." }));
    var totals = ["Tổng công", "Sản lượng (tấn)", "Số xe bơm dăm", "Lương bù SL", "Bù SL kỳ trước", "BH trừ NLĐ", "Truy thu BH", "Thuế TNCN", "Thực lĩnh"];
    box.appendChild(simpleTable(totals.map(function (c) { return { "Chỉ tiêu": c, "Bảng lương": b[c] }; })));
    var parts = ky.split("-").map(Number), reports = snapshot && snapshot.input && snapshot.input.payrollReports;
    var allocated = snapshot ? reports && reports.production : payrollReportDetails(parts[0], parts[1], [b]).production;
    box.appendChild(h("h3", { text: "Nguồn phân bổ sản lượng và bơm dăm" }));
    if (!allocated) box.appendChild(h("p", { class: "hint", text: "Bản chốt này chưa lưu chi tiết phân bổ." }));
    else box.appendChild(simpleTable(allocated.flatMap(function (group) {
      return group.employees.filter(function (r) { return r["Mã NV"] === b["Mã NV"]; }).map(function (r) {
        return { "Nguồn": S[group.type].ten, "Mã phòng ban": r["Mã phòng ban"], "Sản lượng (tấn)": r["Sản lượng (tấn)"], "Số xe": r["Số xe"] };
      });
    })));
    var attendance = source && source.chamcong;
    if (Array.isArray(attendance)) {
      var byKind = new Map();
      var days = DAYS.slice(0, new Date(parts[0], parts[1], 0).getDate());
      attendance.filter(function (r) { return VAL.rowPeriod("chamcong", r) === ky && r["Mã NV"] === b["Mã NV"]; }).forEach(function (r) {
        var kind = String(r["Hình thức công"] || "BT").trim().toUpperCase();
        var total = days.reduce(function (sum, day) { return sum + E.tachCong(r[day]).soCong; }, 0);
        byKind.set(kind, (byKind.get(kind) || 0) + total);
      });
      box.appendChild(h("h3", { text: "Công theo hình thức" }));
      box.appendChild(simpleTable(Array.from(byKind, function (entry) { return { "Hình thức công": entry[0], "Công từ bảng chấm công": entry[1] }; })));
    }
    ["psluong", "ungluong"].forEach(function (key) {
      box.appendChild(h("h3", { text: S[key].ten }));
      if (!source || !Array.isArray(source[key])) {
        box.appendChild(h("p", { class: "hint", text: "Bản chốt này chưa lưu chi tiết chứng từ." }));
        return;
      }
      var rows = source[key].filter(function (r) { return VAL.rowPeriod(key, r) === ky && r["Mã NV"] === b["Mã NV"]; });
      var diffs = INPUT_SUM[key].map(function (c) {
        var sum = rows.reduce(function (total, r) { return total + E.money(r[c]); }, 0);
        var payroll = E.money(b[c]);
        return { "Khoản": c, "Bảng lương": payroll, "Chứng từ": sum, "Chênh lệch (chứng từ − lương)": sum - payroll };
      });
      box.appendChild(simpleTable(diffs));
      box.appendChild(moneySourceTable(key, rows, !snapshot && can("input.edit"), function () {
        render();
        employeePayrollReview(b, ky);
      }));
    });
    modal("Đối soát nguồn — " + b["Họ và tên"] + " — " + kyLabel(ky), box, function (close) {
      return [btn("Về chi tiết lương", "", function () { close(); slipDialog(b); }), btn("Đóng", "", close)];
    }, { wide: true });
  }

  function slipDialog(b) {
    var xemCT = false;
    var render2 = function () {
      return modal((xemCT ? "Chi tiết cách tính — " : "Chi tiết lương — ") + b["Họ và tên"], xemCT ? cachTinhEl(b) : slipEl(b), function (close) {
        return [btn("Đóng", "", close), btn("Đối soát nguồn", "", function () { employeePayrollReview(b, st.kq.ky || kyStr()); }), btn(xemCT ? "🧾 Xem phiếu lương" : "📐 Xem cách tính", "", function () { xemCT = !xemCT; render2(); }),
          btn("XEM CHI TIẾT TÍNH THUẾ", "", function () { modal("CHI TIẾT TÍNH THUẾ TNCN — " + b["Họ và tên"], taxDetailEl(b, kyChot(st.kq.ky || kyStr())), function (cl) { return [btn("Đóng", "", cl)]; }); }),
          btn("🖨 In phiếu này", "pri", function () { var one = st.kq; st.kq = { bangluong: [b], ky: one.ky, bhxh: [], tncn: [], canhbao: [] }; st.tab = "slips"; st.kqFull = one; close(); render(); })];
      });
    };
    render2();
  }
  /**
   * Phiếu lương (α18): màn hình riêng trong menu. Kỳ đã chốt → lấy đúng bảng lương đã chốt; chưa chốt → tính tạm (báo rõ).
   * Lọc phòng ban / tìm người, in (mỗi phiếu 1 trang hoặc in gọn nhiều phiếu / trang), xuất Excel. Mở từ Tính lương (1 phiếu) vẫn như cũ.
   */
  function tabSlips() {
    var w = h("div"), bar = h("div", { class: "bar" });
    var single = !!st.kqFull, fresh = st.kq && st.kq.ky === kyStr() && !st.kqStale && !kyChot(kyStr());
    var src = single ? { kq: st.kq, chot: !!kyChot(kyStr()) } : fresh ? { kq: st.kq, chot: false } : kqKy(st.nam, st.thang); // vừa tính ở Tính lương → dùng đúng kết quả đó
    var all = (src.kq && src.kq.bangluong) || [];
    if (single) bar.appendChild(btn("← Quay lại bảng lương", "", function () { st.kq = st.kqFull; st.kqFull = null; st.tab = "luong"; render(); }));
    var pbs = []; all.forEach(function (b) { if (b["Phòng ban"] && pbs.indexOf(b["Phòng ban"]) < 0) pbs.push(b["Phòng ban"]); });
    var selPB = h("select", { "aria-label": "Phòng ban" }); selPB.appendChild(h("option", { value: "", text: "Tất cả phòng ban" }));
    pbs.sort().forEach(function (p) { selPB.appendChild(h("option", { value: p, text: p })); });
    selPB.value = st.slipPB || ""; selPB.addEventListener("change", function () { st.slipPB = selPB.value; render(); });
    var q = h("input", { class: "i", type: "search", placeholder: "Tìm mã / tên nhân viên…", value: st.slipQ || "", style: "width:220px" });
    q.addEventListener("change", function () { st.slipQ = q.value; render(); });
    var gon = h("input", { type: "checkbox" }); gon.checked = !!st.slipGon; gon.addEventListener("change", function () { st.slipGon = gon.checked; render(); });
    var qq = fold(st.slipQ || "").trim();
    var list = all.filter(function (b) { return (single || !st.slipPB || b["Phòng ban"] === st.slipPB) && (single || !qq || fold(b["Mã NV"] + " " + b["Họ và tên"]).indexOf(qq) >= 0); });
    if (!single) { bar.appendChild(selPB); bar.appendChild(q); }
    bar.appendChild(h("label", { class: "chk", title: "Bỏ ngắt trang sau mỗi phiếu — in nhiều phiếu trên 1 tờ A4 rồi cắt" }, [gon, " In gọn (nhiều phiếu / trang)"]));
    bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("⬇ Xuất Excel", "", function () {
      if (!list.length) { toast("Không có phiếu nào"); return; }
      var cols = ["Mã NV", "Họ và tên", "Phòng ban", "Tổng công", "Công chuẩn"].concat(SLIP_LINES.map(function (l) { return l[0]; }));
      var fileP = "PhieuLuong_" + kyStr() + (st.slipPB && !single ? "_" + slug(st.slipPB) : "") + ".xlsx";
      if (window.ExcelJS && window.HAKUi && window.HAKUi.slipXlsx) {
        if (!need("export", "xuất phiếu lương")) return;
        var vmP = { congTy: congTy()["Tên công ty"] || "", kyText: "tháng " + st.thang + "/" + st.nam, trangThai: src.chot ? "Bảng lương đã chốt" : "Chưa chốt — tính tạm",
          rawCols: cols, rawRows: list, slips: list.map(function (b) { return { maNV: b["Mã NV"], hoTen: b["Họ và tên"], phongBan: b["Phòng ban"], tongCong: b["Tổng công"], congChuan: b["Công chuẩn"], sanLuong: b["Sản lượng (tấn)"],
            lines: slipLines(b) }; }) };
        window.HAKUi.slipXlsx.build(window.ExcelJS, vmP, { perPage: st.slipGon ? 2 : 1, rawName: "PhieuLuong_" + kyStr(), nguoiLap: currentUser() }).xlsx.writeBuffer().then(function (buf) {
          download(fileP, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
        }, function (e) { alert("Không tạo được file: " + e.message); });
      } else saveXlsx(fileP, [{ name: "PhieuLuong_" + kyStr(), cols: cols, rows: list.map(function (b) { var o = {}; cols.forEach(function (c) { o[c] = b[c] == null ? "" : b[c]; }); return o; }) }]);
      audit("Xuất phiếu lương Excel", kyLabel(kyStr()) + " · " + list.length + " phiếu");
    }));
    bar.appendChild(btn("⬇ PDF", "", function () {
      if (!list.length) { toast("Không có phiếu nào"); return; }
      var colsP = ["Mã NV", "Họ và tên", "Phòng ban", "Tổng công", "Công chuẩn"].concat(SLIP_LINES.map(function (l) { return l[0]; }));
      exportSheetsPdf({ title: "Phiếu lương", ky: "Kỳ " + st.thang + "/" + st.nam, trangThai: src.chot ? "Đã chốt" : "Chưa chốt — tính tạm", loc: st.slipPB ? ["Phòng ban: " + st.slipPB] : [], sheets: [{ name: "PhieuLuong", rows: list.map(function (b) { var o = {}; colsP.forEach(function (c) { o[c] = b[c] == null ? "" : b[c]; }); return o; }) }] }, "PhieuLuong_" + kyStr() + (st.slipPB && !single ? "_" + slug(st.slipPB) : "") + ".pdf");
    }, "PDF danh sách phiếu theo đúng bộ lọc đang chọn"));
    bar.appendChild(btn("🖨 In " + list.length + " phiếu", "pri", function () { if (!list.length) { toast("Không có phiếu nào"); return; } audit("In phiếu lương", kyLabel(kyStr()) + " · " + list.length + " phiếu"); window.print(); }));
    w.appendChild(bar);
    if (!single) w.appendChild(h("div", { class: src.chot ? "locked noprint" : "warn noprint", html: src.chot ? "🔒 Phiếu lương <b>tháng " + st.thang + "/" + st.nam + "</b> lấy từ bảng lương <b>đã chốt</b>." : "⚠ Tháng " + st.thang + "/" + st.nam + " <b>chưa chốt</b> — phiếu tính tạm từ dữ liệu hiện tại, có thể thay đổi. Nên chốt kỳ trước khi gửi phiếu cho người lao động." }));
    if (!all.length) { w.appendChild(h("div", { class: "card" }, [h("div", { class: "empty", text: "Chưa có bảng lương tháng " + st.thang + "/" + st.nam + " (chưa có nhân viên / chấm công)." })])); return w; }
    var box = h("div", { class: "slips" + (st.slipGon ? " gon" : ""), "data-slips": String(list.length) });
    if (!list.length) box.appendChild(h("div", { class: "card" }, [h("div", { class: "empty", text: "Không có phiếu nào khớp bộ lọc." })]));
    list.forEach(function (b) { var c = h("div", { class: "card" }); c.appendChild(slipEl(b)); box.appendChild(c); });
    w.appendChild(box);
    return w;
  }

  // ---------- Đọc ảnh bảng chấm công / chấm cơm (OCR offline, 2.0-α20) ----------
  // Ảnh / PDF → tìm ô (core/table-grid) → Tesseract ở tiến trình chính (window.hakOcr) → bảng xem trước SỬA ĐƯỢC
  // → Xuất Excel, hoặc đưa vào Chấm công / Suất cơm qua màn hình xem trước nhập Excel (khóa kỳ chốt, quyền, sao lưu như nhập Excel).
  var OCRS = { pages: [], more: [], sel: 0, busy: false, reading: false, stop: false, mode: "so" }; // reading: đang chạy hàng đợi đọc; stop: người dùng bấm Dừng đọc
  // Cách đọc ô ngày (α22, chủ sở hữu duyệt): số công viết tay · dấu x = 1 công (xx = 2, xxx = 3), ô ghi giờ = giờ / 8 · lịch ca: 1 ca = 1 công, "1+2" = 2 công
  var OCR_MODES = [["so", "Số công (1, 0,5…)"], ["mark", "Dấu x (x = 1 công) · giờ / 8"], ["ca", "Số ca (1 ca = 1 công, 1+2 = 2)"]];
  var OCR_KIND = [["Công", "Chấm công — BT"], ["Tăng ca", "Chấm công — TC"], ["Cơm", "Suất cơm"], ["", "(bỏ qua dòng)"]];
  var OCR_CHUNK = 30; // số trang PDF dựng ảnh mỗi lượt (giữ bộ nhớ ổn định); phần còn lại đọc tiếp bằng nút "Đọc tiếp" — KHÔNG bỏ trang nào
  function renderPdfPages(src) {
    var pdf = src.pdf, end = Math.min(pdf.numPages, src.next + OCR_CHUNK - 1), out = [], chainP = Promise.resolve();
    for (var i = src.next; i <= end; i++) (function (i) {
      chainP = chainP.then(function () { return OCRS.stop ? null : pdf.getPage(i); }).then(function (pg) {
        if (!pg) return; // đã bấm Dừng đọc
        var v0 = pg.getViewport({ scale: 1 }), sc = Math.min(4, 2400 / Math.max(v0.width, v0.height)), vp = pg.getViewport({ scale: sc }), cv = canvasOf(Math.round(vp.width), Math.round(vp.height));
        var cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height);
        return pg.render({ canvasContext: cx, viewport: vp }).promise.then(function () {
          // lớp chữ của PDF (nếu có): đổi sang toạ độ ảnh trang để dựng bảng không cần OCR
          return (pg.getTextContent ? pg.getTextContent().then(function (tc) { return tc.items.filter(function (it) { return it.str && it.transform; }).map(function (it) { return C.pdfText.toRect(it, vp.transform); }); }, function () { return null; }) : Promise.resolve(null)).then(function (ti) {
            out.push({ name: src.file.name + " — trang " + i, canvas: cv, docId: src.docId || "", trang: i, textItems: ti, pdfScale: sc }); src.next = i + 1;
          });
        });
      });
    })(i);
    return chainP.then(function () {
      if (src.next <= pdf.numPages && !OCRS.stop) OCRS.more.push(src); // còn trang chưa dựng → chờ "Đọc tiếp"
      return out;
    });
  }
  function fileToPages(file, docId) {
    var name = file.name;
    if (/\.pdf$/i.test(name) || file.type === "application/pdf") {
      return loadScript("vendor/pdfjs/pdf.min.js").then(function () {
        var lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.js";
        return file.arrayBuffer().then(function (buf) { return lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true }).promise; });
      }).then(function (pdf) { return renderPdfPages({ file: file, pdf: pdf, next: 1, docId: docId }); });
    }
    return window.createImageBitmap(file).then(function (bm) { var cv = canvasOf(bm.width, bm.height); cv.getContext("2d").drawImage(bm, 0, 0); return [{ name: name, canvas: cv, docId: docId || "", trang: 1 }]; });
  }
  // ===== Liên kết ô chấm công ↔ chứng từ gốc (V8): AttendanceRecordID → DocumentID → PageNumber → CellKey → OCRRunID (→ SampleID tra theo CellKey) =====
  // AttendanceRecordID là khóa tự nhiên ổn định: CC|kỳ|mã NV|hình thức công (chấm công) hoặc SC|ngày|mã NV (suất cơm). Lưu trong db.chungtu_lienket nên đi cùng dữ liệu & Full Backup.
  // Nhập lại ô đó từ chứng từ khác: liên kết cũ được GIỮ (current=false) làm lịch sử, liên kết mới là hiện hành.
  function linkMapNow() { return C.attLinks.mapOf(db.chungtu_lienket); }
  function recordCellLinks(cells, batchId) { db.chungtu_lienket = db.chungtu_lienket || []; return C.attLinks.record(db.chungtu_lienket, cells, { batchId: batchId, by: currentUser(), makeId: function (n) { return "LK-" + Date.now().toString(36) + "-" + n; } }); }
  /** Mở lại ảnh/PDF gốc của 1 ô chấm công, khoanh đúng vị trí ô OCR đã đọc. */
  function openCellSource(link) {
    if (!window.hakDocs) { alert("Xem chứng từ gốc chỉ có trong bản cài (.exe)."); return; }
    if (!can("input.view")) { alert("Bạn không có quyền xem chứng từ gốc."); return; }
    var hist = C.attLinks.history(db.chungtu_lienket, link.recordId, link.day);
    var body = h("div"), cv = h("canvas", { style: "max-width:100%;border:1px solid var(--bd,#ccc)" }), meta = h("div", { class: "hint" });
    body.appendChild(meta);
    body.appendChild(h("div", { class: "hint", text: "Giá trị đã nhập: " + link.value + " · ngày " + link.day + " · bản ghi " + link.recordId }));
    body.appendChild(cv);
    if (hist.length > 1) body.appendChild(h("div", { class: "hint", text: "Lịch sử nguồn của ô này: " + hist.map(function (l) { return l.docId + " tr." + l.page + " (" + fmtTime(l.at) + (l.current === false ? ", đã thay" : ", hiện hành") + ")"; }).join(" → ") }));
    modal("Chứng từ gốc của ô", body, function (close) { return [btn("Đóng", "pri", close)]; });
    meta.textContent = "Đang mở " + link.docId + " trang " + link.page + "…";
    window.hakDocs.read(link.docId).then(function (r) {
      if (!r || !r.ok) { meta.textContent = "⚠ Không mở được chứng từ " + link.docId + ": " + ((r && r.error) || "mất file"); return; }
      var m = r.meta || {}, bytes = new Uint8Array(r.data), isPdf = /pdf/i.test(m.ext || "") || (bytes[0] === 0x25 && bytes[1] === 0x50);
      meta.textContent = (m.name || link.docId) + " · trang " + link.page + " · nhập lúc " + fmtTime(link.at) + " bởi " + (link.by || "");
      var draw = function (srcCanvas) {
        var W = link.imgW || srcCanvas.width, H = link.imgH || srcCanvas.height, rot = ((link.rot || 0) % 360 + 360) % 360, swap = rot === 90 || rot === 270;
        cv.width = W; cv.height = H; var cx = cv.getContext("2d"), sw = swap ? srcCanvas.height : srcCanvas.width, sh = swap ? srcCanvas.width : srcCanvas.height;
        cx.save(); cx.translate(W / 2, H / 2); cx.rotate(rot * Math.PI / 180); cx.scale(W / sw, H / sh); cx.drawImage(srcCanvas, -srcCanvas.width / 2, -srcCanvas.height / 2); cx.restore();
        if (link.bbox) { cx.strokeStyle = "#e11d48"; cx.lineWidth = Math.max(3, W / 300); cx.strokeRect(link.bbox.x0, link.bbox.y0, link.bbox.x1 - link.bbox.x0, link.bbox.y1 - link.bbox.y0); }
      };
      if (!isPdf) { window.createImageBitmap(new Blob([bytes])).then(function (bm) { var c0 = canvasOf(bm.width, bm.height); c0.getContext("2d").drawImage(bm, 0, 0); draw(c0); }, function () { meta.textContent = "⚠ Không giải mã được ảnh"; }); return; }
      loadScript("vendor/pdfjs/pdf.min.js").then(function () {
        var lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.js";
        return lib.getDocument({ data: bytes }).promise;
      }).then(function (pdf) { return pdf.getPage(link.page || 1); }).then(function (pg) {
        var vp = pg.getViewport({ scale: link.pdfScale || 2 }), c1 = canvasOf(Math.ceil(vp.width), Math.ceil(vp.height));
        return pg.render({ canvasContext: c1.getContext("2d"), viewport: vp }).promise.then(function () { draw(c1); });
      }).catch(function (e) { meta.textContent = "⚠ Không dựng được trang PDF: " + (e && e.message || e); });
    });
  }
  /** Lưu NGUYÊN BẢN file vào kho chứng từ (SHA-256, không xóa) và ghi siêu dữ liệu vào db.chungtu. Lỗi lưu → báo, KHÔNG chặn đọc OCR. */
  function archiveOriginal(file) {
    if (!window.hakDocs) return Promise.resolve("");
    return file.arrayBuffer().then(function (buf) { return window.hakDocs.add(new Uint8Array(buf), { name: file.name, user: currentUser(), note: "OCR chấm công kỳ " + kyStr(), ky: kyStr(), company: congTy()["Mã công ty"] || "HAK", docType: "BANGCONG", dept: "ALL" }); }).then(function (r) {
      if (!r || !r.ok) { toast("Chưa lưu được bản gốc " + file.name + ": " + ((r && r.error) || "lỗi không rõ")); return ""; }
      if (!db.chungtu.some(function (c) { return c.id === r.id; })) {
        db.chungtu.push({ id: r.id, sha256: r.sha256, name: file.name, size: r.size, addedAt: new Date().toISOString(), addedBy: currentUser(), nguon: "OCR", ky: kyStr() });
        audit("Lưu chứng từ gốc", r.id + " · " + file.name + " · SHA-256 " + r.sha256.slice(0, 12) + "…"); save();
      } else if (r.duplicate) toast("File " + file.name + " đã có trong kho chứng từ (" + r.id + ") — dùng lại bản đã lưu");
      if (r.sameNameDifferent && r.sameNameDifferent.length) toast("⚠ Đã có chứng từ CÙNG TÊN \"" + file.name + "\" nhưng NỘI DUNG KHÁC (" + r.sameNameDifferent.join(", ") + ") — bản mới được lưu thêm, không ghi đè");
      return r.id;
    }, function (e) { toast("Chưa lưu được bản gốc: " + e.message); return ""; });
  }
  function nvChoices() { return db.nhanvien.filter(function (n) { return n["Trạng thái"] !== "Đã nghỉ việc"; }).concat(db.nhanvien.filter(function (n) { return n["Trạng thái"] === "Đã nghỉ việc"; })).map(function (n) { return { ma: n["Mã NV"], ten: n["Họ và tên"] || "" }; }); }
  // Tự học từ chỉnh sửa (V7): mỗi ô OCR người dùng sửa tự ghi 1 mẫu "chờ duyệt"; duyệt khi ghi bảng vào Chấm công
  var OCRL = null;
  function ocrLearn() { if (!OCRL && window.hakOcrLib && C.ocrLearn) OCRL = C.ocrLearn.createService({ api: window.hakOcrLib, user: function () { return session ? session.tenDangNhap : currentUser(); }, cfg: function () { return { saveConfirmed: !!congTy()["OCR lưu mẫu xác nhận"] }; }, ocrVersion: "tsocr-v10.4+mnist-cnn-v1" }); if (OCRL && !OCRL._restored) { OCRL._restored = true; OCRL.restoreQueue().then(function (r) { if (r && r.restored) { toast("⚠ Có " + r.restored + " mẫu học từ lần trước chưa ghi vào thư viện — đã nạp lại, bấm \"Thử lại\" ở màn OCR"); } }); } return OCRL; }
  // ---- Trạng thái lưu mẫu OCR hiển thị cho người dùng (V9.4) ----
  var OCR_ST = { saved: ["lrn-saved", "Đã ghi mẫu — chờ xác minh (PENDING_VERIFICATION)"], missing: ["lrn-miss", "Thiếu ảnh nguồn — chỉ ghi lịch sử sửa, chưa tạo mẫu"], queued: ["lrn-q", "Chưa ghi được — đang giữ để thử lại"], error: ["lrn-err", "Lỗi lưu mẫu — hãy bấm Thử lại"] };
  /** Khóa ổn định của ô: dòng chưa ghép NV vẫn có khóa riêng theo vị trí dòng (không trùng nhau). */
  function ocrMark(inp, ref) {
    var lr = ocrLearn(), e = lr && lr.stateOf ? lr.stateOf(ref) : null; if (!e || !inp) return;
    Object.keys(OCR_ST).forEach(function (k) { inp.classList.remove(OCR_ST[k][0]); });
    var st2 = OCR_ST[e.state]; if (st2) { inp.classList.add(st2[0]); inp.title = st2[1] + (e.error ? " — " + e.error : ""); inp.setAttribute("data-learn", e.state); }
    var bar = document.querySelector("[data-ocr-learn-status]"); if (bar) ocrStatusFill(bar);
  }
  function ocrStatusFill(box) {
    var lr = ocrLearn(); box.innerHTML = ""; if (!lr || !lr.stats) return;
    var s2 = lr.stats(), tot = s2.saved + s2.missing + s2.queued + s2.error;
    if (!tot) { box.appendChild(h("span", { class: "hint", style: "margin:0", text: "Sửa một ô OCR → hệ thống tự ghi mẫu (không cần bấm Lưu mẫu). Mẫu mới ở trạng thái chờ xác minh và chưa được dùng để tự quyết định công." })); return; }
    box.appendChild(h("b", { text: "Mẫu học từ ô đã sửa: " }));
    [["saved", "đã ghi (chờ xác minh)"], ["missing", "thiếu ảnh nguồn"], ["queued", "đang thử lại"], ["error", "lỗi lưu"]].forEach(function (x) { if (s2[x[0]]) box.appendChild(h("span", { class: "chip " + OCR_ST[x[0]][0], text: s2[x[0]] + " " + x[1] })); });
    box.appendChild(btn("Mở thư viện mẫu", "ghost", function () { OLS.tab = "cho"; OLS.page = 0; OLS.loaded = false; st.tab = "ocrlib"; render(); }, "Xem các mẫu vừa ghi trong Thư viện mẫu OCR"));
  }
  /** Tra cứu thư viện mẫu cho các ô số: AUTO_ACCEPT → dùng nhãn thư viện (ghi rõ nguồn); SUGGESTED → đánh dấu "không chắc" + gợi ý; còn lại giữ nguyên kết quả OCR. */
  /** So khớp bố cục bảng với thư viện bố cục: MISMATCH → không tự nhận ô bằng thư viện và không học từ trang này (trừ khi người dùng xác nhận bố cục mới) */
  function analyzePage(pg, rot) {
    pg.status = "Đang đọc…"; pg.err = ""; pg.stopped = false; OCRS.busy = true; render();
    var t0 = Date.now();
    var onErr = function (e) { if (e === OCR_STOP || /OCR_CANCELLED/.test(String(e && e.message || e))) { markStopped(pg); return; } pg.status = "Lỗi"; pg.err = String(e && e.message || e); }, onDone = function () { OCRS.busy = false; render(); };
    var gimg = grayOf(pg.canvas), tx = pg.textItems && !pg.noText && C.pdfText ? C.pdfText.analyze(pg.textItems, { w: gimg.w, h: gimg.h }) : null;
    pg.srcKind = tx && tx.usable ? "pdf-text" : "ocr"; pg.srcNote = tx && !tx.usable && pg.textItems && pg.textItems.length ? tx.reason : "";
    if (tx && tx.usable) { // chữ lấy thẳng từ PDF: chính xác tuyệt đối, bỏ qua OCR ảnh
      var resT = { rot: 0, scale: pg.pdfScale || 1, g: gimg.g, clean: gimg.g, w: gimg.w, h: gimg.h, cells: tx.cells, table: tx.table, title: tx.title, period: tx.period || (tx.table && tx.table.period) || "", box: tx.box, cellMode: pg.mode || "so", textLayer: true };
      return Promise.resolve(resT).then(function (res) { return layoutCheck(res, pg).then(function () { return res; }); }).then(function (res) { return finishPage(pg, res, t0); }).then(null, onErr).then(onDone);
    }
    return C.tsocr.analyze(gimg, { ocr: function (items) { return OCRS.stop ? Promise.reject(OCR_STOP) : window.hakOcr.batch(items, function (p) { var el = $("#ocr-status"); if (el) el.textContent = "Đang đọc ô " + p.done + "/" + p.total; }).then(function (r) { if (OCRS.stop) throw OCR_STOP; return r; }); } }, { rotate: rot, cellMode: pg.mode || "so", onProgress: function (m) { pg.status = m; var el = $("#ocr-status"); if (el) el.textContent = m; } }).then(function (res) { return layoutCheck(res, pg).then(function () { return res; }); }).then(function (res) { var lr = ocrLearn(); return lr && pg.layoutStatus !== "MISMATCH" ? libEnrich(lr, res, pg).then(function () { return res; }, function () { return res; }) : res; }).then(function (res) { return finishPage(pg, res, t0); }, onErr).then(onDone);
  }
  function finishPage(pg, res, t0) {
      pg.formDraft = null; pg.res = res; pg.rot = res.rot; pg.view = grayCanvas(res.g, res.w, res.h); pg.ms = Date.now() - t0; pg.runId = "RUN-" + t0.toString(36); pg.page = pg.trang || 1; pg.layoutSuspect = !res.table || !res.table.layout;
      var T = res.table, list = nvChoices(), nm0 = T.layout === "B" ? titleName(res.title) : "";
      pg.lines = (T.lines || []).map(function (l) {
        var nm = l.name || nm0, sug = C.tsparse.matchName(nm, list), memo = C.ocrNameMemory && C.ocrNameMemory.suggest(db.ocr_ten || [], nm, list);
        // V9: bộ nhớ tên đã xác nhận → đưa lên đầu gợi ý (chỉ chọn sẵn khi xác nhận ≥ 2 chứng từ, không trùng tên, không xung đột)
        if (memo && memo.ma) { sug = [{ ma: memo.ma, ten: memo.ten, score: memo.preselect ? 0.99 : 0.59, memo: memo.why }].concat(sug.filter(function (x) { return x.ma !== memo.ma; })); }
        // V9: hai người cùng điểm cao nhất (trùng họ tên) → không tự chọn, người dùng chọn theo mã
        var nameDup = sug.length > 1 && sug[0].score >= 0.6 && sug[1].score === sug[0].score && C.ocrNameMemory && C.ocrNameMemory.fold(sug[0].ten) === C.ocrNameMemory.fold(sug[1].ten);
        // bảng dọc: tiêu đề cột viết tay không đọc được nhưng cột có ≥ 5 ô có số (cách đọc dấu x / số ca) → coi là cột chấm công của 1 người
        var nNum = Object.keys(l.values).filter(function (d) { return typeof l.values[d] === "number" && l.values[d] > 0; }).length;
        var kind = T.layout === "B" ? l.kind || (!l.skip && pg.mode && pg.mode !== "so" && nNum >= 5 ? "Công" : "") : (l.kind || "Công");
        var vals = {}; T.days.forEach(function (d) { var v = l.values[d]; vals[d] = v == null ? "" : (typeof v === "number" && isFinite(v) ? String(v).replace(".", ",") : "?"); });
        return { src: l, name: nm, rawName: nm, ma: !nameDup && sug[0] && sug[0].score >= 0.6 ? sug[0].ma : "", maAuto: !nameDup && sug[0] && sug[0].score >= 0.6 ? sug[0].ma : "", nameDup: nameDup, memo: memo ? memo.why : "", sug: sug.slice(0, 5), kind: kind, vals: vals, orig: Object.assign({}, vals) };
      });
      pg.days = T.days.slice(); pg.ky = pg.ky || res.period || kyStr();
      pg.status = !T.layout && res.documentReview && res.documentReview.kind !== "UNKNOWN" ? "Đã nhận diện biểu mẫu · " + res.documentReview.candidates.length + " trường chờ đối chiếu" : T.layout ? "Đã đọc " + pg.lines.length + " dòng · " + Math.round(pg.ms / 1000) + " giây" : "Không dựng được bảng";
      if (window.console && res.table.warnings && res.table.warnings.length) console.info("OCR:", res.table.warnings.join(" | "));
  }
  var OCR_STOP = { stop: true };
  /** Đọc lần lượt các trang chưa đọc; bấm Dừng đọc → trang đang đọc dừng sau lô ô hiện tại, các trang sau không đọc */
  function readQueue(single) {
    OCRS.stop = false; OCRS.reading = true; render();
    var todo = single ? [single.pg] : OCRS.pages.filter(function (p) { return !p.res && !p.err && !p.stopped; });
    return todo.reduce(function (p, pg) { return p.then(function () { if (OCRS.stop) { markStopped(pg); return; } return analyzePage(pg, single ? single.rot : undefined); }); }, Promise.resolve())
      // ⚠ "st" ĐÃ ĐỔI TÊN (trước là "var st = OCRS.stop;") — "st" là biến trạng thái
      // render TOÀN CỤC của module (khai báo đầu file: "var st = { tab: ... }").
      // Tên trùng che khuất biến toàn cục trong scope này — chưa gây lỗi vì không
      // ai đọc "st" (toàn cục) ở đây, nhưng là cái bẫy cho người sửa code sau.
      .then(function () { var wasStop = OCRS.stop; OCRS.reading = false; OCRS.stop = false; render(); if (wasStop) toast("Đã dừng đọc — trang đã đọc xong vẫn giữ nguyên"); });
  }
  function ocrNum(v) { if (C.ocrRules && C.ocrRules.number) return C.ocrRules.number(v); var s0 = String(v == null ? "" : v).trim(); if (!s0) return null; var n = +s0.replace(",", "."); return isFinite(n) ? n : NaN; }
  function lineSum(L, days) { var s0 = 0, bad = 0; days.forEach(function (d) { var n = ocrNum(L.vals[d]); if (n == null) return; if (isNaN(n)) bad++; else s0 += n; }); return { sum: Math.round(s0 * 100) / 100, bad: bad }; }
  /** Dòng dữ liệu sẵn sàng ghi: { chamcong: [...], tiencom: [...], skip: [...] } */
  function ocrRows(pages) {
    var cc = [], tc = [], skip = [], review = [], mcc = [], mtc = [];
    var maSet = {}; db.nhanvien.forEach(function (nv) { maSet[nv["Mã NV"]] = 1; });
    pages.forEach(function (pg) {
      var check = C.ocrRules.check({ ky: pg.ky || kyStr(), mode: pg.mode, days: pg.days, lines: pg.lines }, { maSet: maSet, sumOf: function (line) { return lineSum(line, pg.days).sum; } });
      if (check.layoutSuspect) { skip.push(pg.name + ": " + check.issues.filter(function (i) { return i.struct; }).map(function (i) { return i.msg; }).join("; ")); return; }
      check.issues.filter(function (i) { return i.level === "WARN" && i.code !== "CHUA_CHON_NV"; }).forEach(function (i) { review.push(pg.name + ": " + i.msg); });
      (pg.lines || []).forEach(function (L, lineIndex) {
        var blocked = check.issues.filter(function (i) { return i.level === "ERROR" && i.line === lineIndex; });
        if (blocked.length) { skip.push(pg.name + ": " + blocked.map(function (i) { return i.msg; }).join("; ")); return; }
        if (!L.kind) return;
        if (!L.ma) { skip.push(pg.name + ": " + (L.name || "(không tên)") + " — chưa chọn nhân viên"); return; }
        var bad = pg.days.filter(function (d) { var n = ocrNum(L.vals[d]); return n !== null && (isNaN(n) || n < 0); });
        if (bad.length) { skip.push(pg.name + ": " + (L.name || L.ma) + " — ô ngày " + bad.join(", ") + " chưa sửa (dấu ?)"); return; }
        var ky = pg.ky || kyStr();
        var nameEv = nameEventOf(pg, L, ky);
        // meta[] song song với dòng ghi: __line = vị trí+1 → sau khi nhập biết CHÍNH XÁC ô OCR nào đã được ghi (ImportBatch → ô → mẫu)
        function cellsOf(days, recId) {
          var out = [];
          days.forEach(function (d) {
            var cell = L.src && L.src.cells ? L.src.cells[d] : null, v = String(L.vals[d] == null ? "" : L.vals[d]).trim();
            if (!v) return;
            out.push({ key: C.ocrLearn.cellKey(pg.docId, pg.trang || 1, cell, pg.rot || 0, L.ma + "|" + d), value: v, day: ("0" + d).slice(-2), recordId: recId, docId: pg.docId || "", page: pg.trang || 1, runId: pg.runId || "",
              bbox: cell ? { x0: cell.x0, y0: cell.y0, x1: cell.x1, y1: cell.y1 } : null, imgW: pg.res ? pg.res.w : 0, imgH: pg.res ? pg.res.h : 0, rot: pg.rot || 0, pdfScale: pg.pdfScale || 0, srcName: pg.name || "" });
          });
          return out;
        }
        if (L.kind === "Cơm") pg.days.forEach(function (d) { var n = ocrNum(L.vals[d]); if (n) { mtc.push({ cells: cellsOf([d], ["SC", ky + "-" + ("0" + d).slice(-2), L.ma].join("|")), nameEv: nameEv }); tc.push({ "Ngày": ky + "-" + ("0" + d).slice(-2), "Mã NV": L.ma, "Số suất cơm": n, "Ghi chú": "OCR: " + pg.name, __line: mtc.length }); } });
        else {
          var row = { "Kỳ": ky, "Mã NV": L.ma, "Hình thức công": L.kind === "Tăng ca" ? "TC" : "BT" }, any = false;
          pg.days.forEach(function (d) { var n = ocrNum(L.vals[d]); if (n != null) { row[("0" + d).slice(-2)] = String(n).replace(".", ","); any = true; } });
          if (any) { mcc.push({ cells: cellsOf(pg.days, ["CC", ky, L.ma, row["Hình thức công"]].join("|")), nameEv: nameEv }); row.__line = mcc.length; cc.push(row); }
        }
      });
    });
    return { chamcong: cc, tiencom: tc, skip: skip, review: review, meta: { chamcong: mcc, tiencom: mtc } };
  }
  /** Sự kiện "chuỗi tên trên giấy ↔ Mã NV" của 1 dòng OCR (chỉ ghi vào bộ nhớ khi dòng đã được nhập thật). */
  function nameEventOf(pg, L, ky) {
    var raw = String(L.rawName || (L.src && L.src.name) || L.name || "").trim(); if (!raw || !L.ma) return null;
    var emp = db.nhanvien.filter(function (n) { return n["Mã NV"] === L.ma; })[0], nc = L.src && L.src.nameCell;
    return { raw: raw, typed: L.name, ma: L.ma, tenDM: emp ? emp["Họ và tên"] : "", docId: pg.docId || "", page: pg.trang || 1, runId: pg.runId || "", ky: ky,
      cellKey: C.ocrLearn.cellKey(pg.docId, pg.trang || 1, nc || null, pg.rot || 0, "name|" + (pg.lines ? pg.lines.indexOf(L) : 0)), sua: L.ma !== L.maAuto || String(L.name).trim() !== raw,
      bbox: nc ? { x0: nc.x0, y0: nc.y0, x1: nc.x1, y1: nc.y1 } : null };
  }
  function recordNameLinks(plans, meta) {
    if (!C.ocrNameMemory) return 0; db.ocr_ten = db.ocr_ten || []; var n = 0, who = session ? session.tenDangNhap : currentUser();
    (plans || []).forEach(function (p) { var m = meta[p.table]; if (!m) return; p.items.forEach(function (it) { if (it.action !== "add" && it.action !== "update" && it.action !== "merged") return; var mm = m[(it.line || 0) - 1]; if (mm && mm.nameEv && C.ocrNameMemory.record(db.ocr_ten, Object.assign({ user: who }, mm.nameEv))) n++; }); });
    return n;
  }
  /** Ô OCR đã THỰC SỰ nằm trong dữ liệu vừa ghi (dòng add/update/merged của kế hoạch nhập đã commit) — dòng lỗi/bỏ qua/trùng/khóa không tính. */
  function ocrApply(pages) {
    if (!need("input.edit", "ghi chấm công / suất cơm")) return;
    var rr = ocrRows(pages);
    if (!rr.chamcong.length && !rr.tiencom.length) { alert("Chưa có dòng nào ghi được." + (rr.skip.length ? "\n\n" + rr.skip.join("\n") : "")); return; }
    if (rr.review.length && !confirm("HAK OCR Engine — cần đối chiếu trước khi ghi:\n" + rr.review.slice(0, 20).join("\n") + (rr.review.length > 20 ? "\n… và " + (rr.review.length - 20) + " cảnh báo khác" : "") + "\n\nBạn đã đối chiếu với chứng từ và muốn mở bảng xem trước?")) return;
    var lrChk = ocrLearn(); if (lrChk && lrChk.pending() && !confirm("⚠ Còn " + lrChk.pending() + " mẫu học từ các ô đã sửa CHƯA ghi vào thư viện OCR (lỗi: " + lrChk.lastError() + ").\nChấm công vẫn ghi được, nhưng những mẫu này chưa được tính là đã học và sẽ không được duyệt.\n\nVẫn tiếp tục ghi chấm công?")) return;
    if (rr.skip.length && !confirm("Các dòng sau CHƯA ghi được (sửa xong bấm lại):\n" + rr.skip.join("\n") + "\n\nVẫn ghi các dòng còn lại?")) return;
    importPreview(function (mode) {
      var pl = [];
      if (rr.chamcong.length) { var p1 = IMP.plan(db, "chamcong", ALL.chamcong.cols, C.inputBatch.blankRows(rr.chamcong), { lockedPeriods: lockedMap(), defaultKy: kyStr(), mode: mode }); p1.sheet = "Ảnh chấm công"; pl.push(p1); }
      if (rr.tiencom.length) { var p2 = IMP.plan(db, "tiencom", ALL.tiencom.cols, C.inputBatch.blankRows(rr.tiencom), { lockedPeriods: lockedMap(), defaultKy: kyStr(), mode: mode }); p2.sheet = "Ảnh chấm cơm"; pl.push(p2); }
      return pl;
    }, "OCR " + pages.map(function (p) { return p.name + (p.docId ? " [" + p.docId + "]" : ""); }).join(", "), function (ok, donePlans) { if (ok && window.hakOcrLib && window.hakOcrLib.layoutSave) pages.forEach(function (p) { if (p.layoutSig && p.layoutStatus !== "MISMATCH" && !p.layoutSuspect) window.hakOcrLib.layoutSave(p.layoutSig, "", session ? session.tenDangNhap : ""); }); var lr = ok && ocrLearn(); if (lr) { var nNames = recordNameLinks(donePlans, rr.meta); if (nNames) save(); var impCells = ocrImportedCells(donePlans, rr.meta), batchId = "IMP-" + Date.now().toString(36); if (recordCellLinks(impCells, batchId)) save(); lr.approveCells(impCells, batchId).then(function (r) { if (r && (r.verified || r.unsaved)) toast((r.verified ? "Thư viện mẫu OCR: " + r.verified + " mẫu của ô đã nhập được xác nhận" + (r.conflict ? " · " + r.conflict + " mẫu xung đột cần xem" : "") : "") + (r.unsaved ? " · ⚠ còn " + r.unsaved + " mẫu học CHƯA ghi được — bấm \"Thử lại\" ở màn OCR" : "")); }); } render(); });
  }
  function ocrExport(pages) {
    var sheets = pages.filter(function (p) { return p.lines && p.lines.length; }).map(function (pg, i) {
      var nm = {}; db.nhanvien.forEach(function (n) { nm[n["Mã NV"]] = n["Họ và tên"]; });
      var rows = pg.lines.map(function (L) {
        var o = { "Tên trên giấy": L.name, "Mã NV": L.ma, "Họ tên (app)": nm[L.ma] || "", "Loại": L.kind || "(bỏ qua)" }, ls = lineSum(L, pg.days);
        pg.days.forEach(function (d) { o[String(d)] = ocrNum(L.vals[d]) == null ? "" : (isNaN(ocrNum(L.vals[d])) ? "?" : ocrNum(L.vals[d])); });
        o["Tổng tính"] = ls.sum; Object.keys(L.src.totals || {}).forEach(function (k) { o["Tổng trên giấy (" + k + ")"] = L.src.totals[k] == null || isNaN(L.src.totals[k]) ? "" : L.src.totals[k]; });
        o["Ô chưa đọc được"] = ls.bad; return o;
      });
      var cols = []; rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
      return { name: ("T" + (i + 1) + " " + pg.name).replace(/[\\/?*[\]:]/g, " ").slice(0, 31), cols: cols, rows: rows };
    });
    if (!sheets.length) { toast("Chưa có trang nào đọc xong"); return; }
    saveXlsx("OCR_ChamCong_" + kyStr() + ".xlsx", sheets);
  }
  function modeSel(v, label, onCh) {
    var s0 = h("select", { "aria-label": label, title: "Số công: ô ghi 1 / 0,5 · Dấu x: x = 1 công, xx = 2, xxx = 3, ô ghi giờ (7h→15h) = giờ / 8 · Số ca: 1 ca = 1 công, \"1+2\" = 2 công, X = nghỉ" });
    OCR_MODES.forEach(function (o) { s0.appendChild(h("option", { value: o[0], text: o[1] })); }); s0.value = v;
    s0.addEventListener("change", function () { onCh(s0.value); }); return s0;
  }
  // ---------- Thư viện mẫu OCR (V7): xem / duyệt / từ chối / đổi nhãn / khôi phục — KHÔNG có thao tác xóa mẫu ----------
  var OLS = { tab: "so", loaded: false, loading: false, samples: [], edits: [], stats: null, confusions: [], page: 0, q: "", err: "", urls: {} };
  var OL_TABS = [["so", "Số"], ["kyhieu", "Ký hiệu"], ["chu", "Chữ viết tay"], ["bocuc", "Bố cục"], ["cho", "Chờ xác nhận"], ["nham", "Dễ nhầm"], ["xuly", "Cần xử lý"], ["lichsu", "Lịch sử sửa"], ["thongke", "Thống kê"]];
  var OL_ST = { PENDING_APPROVAL: "Chờ xác nhận", VERIFIED: "Đã xác nhận", SUPERSEDED: "Đã bị thay thế", REJECTED: "Bị từ chối", CONFLICT: "Xung đột" };
  function olLoad(force) {
    if (!window.hakOcrLib || OLS.loading || (OLS.loaded && !force)) return;
    OLS.loading = true;
    Promise.all([window.hakOcrLib.list({}), window.hakOcrLib.edits(), window.hakOcrLib.layouts ? window.hakOcrLib.layouts() : Promise.resolve({ ok: true, layouts: [] })]).then(function (r) {
      OLS.loading = false; OLS.loaded = true; OLS.err = r[0] && r[0].ok ? "" : (r[0] && r[0].error || "không đọc được thư viện");
      if (r[0] && r[0].ok) { OLS.samples = r[0].samples; OLS.stats = r[0].stats; OLS.confusions = r[0].confusions; }
      if (r[1] && r[1].ok) OLS.edits = r[1].edits; OLS.layouts = r[2] && r[2].ok ? r[2].layouts : [];
      if (st.tab === "ocrlib") render();
    }, function (e) { OLS.loading = false; OLS.err = String(e && e.message || e); if (st.tab === "ocrlib") render(); });
  }
  function olThumb(sha) {
    var im = h("img", { class: "olthumb", alt: "ảnh ô mẫu", style: "height:44px;max-width:90px;image-rendering:pixelated;background:#fff;border:1px solid var(--bd,#ccc)" });
    if (OLS.urls[sha]) { im.src = OLS.urls[sha]; return im; }
    window.hakOcrLib.image(sha).then(function (r) { if (r && r.ok && r.data) { OLS.urls[sha] = URL.createObjectURL(new Blob([r.data], { type: "image/png" })); im.src = OLS.urls[sha]; } });
    return im;
  }
  function olAct(fn, msg) { return function () { if (!need("ocr.library", "quản lý thư viện mẫu OCR")) return; fn().then(function (r) { if (r && r.ok) { audit("Thư viện mẫu OCR", msg); OLS.loaded = false; olLoad(true); } else toast("⚠ " + ((r && r.error) || "không thực hiện được")); }); }; }
  function tabOcrLib() {
    var w = h("div");
    if (!window.hakOcrLib) { w.appendChild(h("div", { class: "card" }, [h("div", { class: "warn", text: "Thư viện mẫu OCR chỉ có trong bản cài (.exe) — dữ liệu lưu offline trên máy." })])); return w; }
    olLoad();
    var tabs = h("div", { class: "subtabs" });
    OL_TABS.forEach(function (t) { tabs.appendChild(h("button", { class: OLS.tab === t[0] ? "on" : "", "data-oltab": t[0], on: { click: function () { OLS.tab = t[0]; OLS.page = 0; render(); } } }, [document.createTextNode(t[1])])); });
    w.appendChild(tabs);
    var c = h("div", { class: "card" }); w.appendChild(c);
    if (OLS.err) c.appendChild(h("div", { class: "warn", text: "⚠ " + OLS.err }));
    if (!OLS.loaded) { c.appendChild(h("div", { class: "hint", text: "Đang đọc thư viện mẫu…" })); return w; }
    var S0 = OLS.stats || { total: 0, byStatus: {} };
    if (OLS.tab === "thongke") {
      var by = S0.byStatus || {}, rows = [["Tổng số mẫu", S0.total], ["Chờ xác nhận", by.PENDING_APPROVAL || 0], ["Đã xác nhận (dùng để nhận dạng)", by.VERIFIED || 0], ["Bị thay thế (lịch sử)", by.SUPERSEDED || 0], ["Bị từ chối", by.REJECTED || 0], ["Xung đột cần xử lý", by.CONFLICT || 0], ["Số nhãn khác nhau", S0.labels || 0], ["Lần sửa đã ghi", S0.edits || 0], ["Lần mẫu được dùng để nhận dạng", S0.refs || 0], ["Cặp dễ nhầm", S0.confusions || 0], ["Bố cục đã lưu", (OLS.layouts || []).length]];
      var t = h("table", { class: "t" }); rows.forEach(function (r) { t.appendChild(h("tr", {}, [h("td", { text: r[0] }), h("td", { class: "r", text: String(r[1]) })])); });
      c.appendChild(h("h3", { text: "Hiệu quả OCR & Thư viện mẫu" })); c.appendChild(t);
      c.appendChild(h("div", { class: "hint", text: "Độ chính xác thực tế chỉ đo được khi có chứng từ viết tay thật đã xác nhận; số liệu này là số lượng mẫu, không phải tỷ lệ đúng." }));
      var cb = h("input", { type: "checkbox", "aria-label": "Lưu cả ô OCR đọc đúng đã xem" }); cb.checked = !!congTy()["OCR lưu mẫu xác nhận"];
      cb.addEventListener("change", function () { if (!need("ocr.library", "đổi cấu hình thư viện mẫu OCR")) { cb.checked = !cb.checked; return; } db.congty = [Object.assign({}, congTy(), { "OCR lưu mẫu xác nhận": cb.checked })]; audit("Cấu hình thư viện mẫu OCR", "lưu mẫu xác nhận = " + cb.checked); save(); toast(cb.checked ? "Bật: ô OCR đọc đúng mà bạn đã xem sẽ được lưu thành mẫu 'Đã xác nhận đúng'" : "Tắt: chỉ lưu mẫu từ ô bạn sửa"); });
      c.appendChild(h("label", { class: "hint", style: "display:block;margin:8px 0" }, [cb, document.createTextNode(" Lưu cả ô OCR đọc ĐÚNG mà người dùng đã mở xem (mẫu \"đã xác nhận đúng\"). Mặc định tắt — chỉ ô bạn sửa mới thành mẫu.")]));
      c.appendChild(btn("Kiểm tra toàn vẹn thư viện", "ghost", function () { window.hakOcrLib.verify().then(function (r) { var rp = r && r.report; toast(rp ? (rp.ok ? "✓ Thư viện toàn vẹn: " + rp.samples + " mẫu" : "⚠ Lỗi: " + rp.bad.length + " ảnh, " + rp.corruptLines + " dòng nhật ký") : "Không kiểm tra được"); }); }));
      return w;
    }
    if (OLS.tab === "nham") {
      c.appendChild(h("h3", { text: "Cặp dễ nhầm (OCR đọc A, người dùng sửa thành B)" }));
      if (!OLS.confusions.length) c.appendChild(h("div", { class: "hint", text: "Chưa có cặp nhầm lẫn nào." }));
      else { var tc = h("table", { class: "t" }); tc.appendChild(h("tr", {}, ["OCR đọc", "Sửa thành", "Số lần"].map(function (x) { return h("th", { text: x }); }))); OLS.confusions.forEach(function (x) { tc.appendChild(h("tr", {}, [h("td", { text: x.ocr || "(trống)" }), h("td", { text: x.corrected }), h("td", { class: "r", text: String(x.count) })])); }); c.appendChild(tc); }
      return w;
    }
    if (OLS.tab === "xuly") {
      var miss = OLS.edits.filter(function (e) { return e.flags && e.flags.indexOf("MISSING_SOURCE_IMAGE") >= 0; }).reverse();
      c.appendChild(h("h3", { text: "Ô đã sửa nhưng KHÔNG có ảnh nguồn (" + miss.length + ")" }));
      c.appendChild(h("div", { class: "hint", text: "Các lần sửa này đã được ghi vào lịch sử nhưng không tạo mẫu học (không có ảnh ô thật). Không nằm trong tập mẫu chính thức. Mở lại chứng từ gốc để kiểm tra nếu cần." }));
      var tx = h("table", { class: "t" });
      tx.appendChild(h("tr", {}, ["Lúc", "Người sửa", "Chứng từ / trang", "Mã NV", "Từ", "Thành", "Ghi chú"].map(function (x) { return h("th", { text: x }); })));
      miss.slice(OLS.page * 50, OLS.page * 50 + 50).forEach(function (e) { tx.appendChild(h("tr", {}, [fmtTime(e.at), e.by, (e.docId || "-") + " / " + (e.page || ""), e.employeeId, e.from, e.to, e.note].map(function (x) { return h("td", { text: String(x == null ? "" : x) }); }))); });
      c.appendChild(tx); olPager(c, miss.length); return w;
    }
    if (OLS.tab === "lichsu") {
      c.appendChild(h("h3", { text: "Lịch sử sửa ô (mới nhất trước)" }));
      var ed = OLS.edits.slice().reverse().slice(OLS.page * 50, OLS.page * 50 + 50), te = h("table", { class: "t" });
      te.appendChild(h("tr", {}, ["Lúc", "Người sửa", "Chứng từ / trang", "Mã NV", "OCR đọc", "Từ", "Thành", "Ghi chú"].map(function (x) { return h("th", { text: x }); })));
      ed.forEach(function (e) { te.appendChild(h("tr", {}, [fmtTime(e.at), e.by, (e.docId || "-") + " / " + (e.page || ""), e.employeeId, e.ocr, e.from, e.to, e.note].map(function (x) { return h("td", { text: String(x == null ? "" : x) }); }))); });
      c.appendChild(te); olPager(c, OLS.edits.length); return w;
    }
    if (OLS.tab === "bocuc") {
      c.appendChild(h("h3", { text: "Bố cục đã lưu (khung bảng, số cột/dòng, vị trí ô)" }));
      var ls = OLS.layouts || [];
      if (!ls.length) c.appendChild(h("div", { class: "hint", text: "Chưa có bố cục. Bố cục được lưu khi bảng OCR được duyệt; trang có bố cục lệch sẽ không được dùng để học mẫu." }));
      else { var tl = h("table", { class: "t" }); tl.appendChild(h("tr", {}, ["Tên", "Cột", "Dòng", "Số lần dùng", "Lần cuối"].map(function (x) { return h("th", { text: x }); }))); ls.forEach(function (l) { tl.appendChild(h("tr", {}, [l.name, l.cols, l.rows, l.uses, fmtTime(l.lastUsed)].map(function (x) { return h("td", { text: String(x == null ? "" : x) }); }))); }); c.appendChild(tl); }
      return w;
    }
    var f = OLS.samples.filter(function (x) {
      if (OLS.tab === "so") return x.cellType === "digit" && x.status !== "PENDING_APPROVAL" && x.status !== "CONFLICT";
      if (OLS.tab === "kyhieu") return x.cellType === "mark" || x.labelKind === "SYMBOL" && x.cellType !== "digit";
      if (OLS.tab === "chu") return x.cellType === "text";
      if (OLS.tab === "cho") return x.status === "PENDING_APPROVAL" || x.status === "CONFLICT";
      return true;
    });
    if (OLS.q) f = f.filter(function (x) { return String(x.label).indexOf(OLS.q) >= 0 || String(x.employeeId).toLowerCase().indexOf(OLS.q.toLowerCase()) >= 0; });
    var qi = h("input", { class: "i", placeholder: "Lọc theo nhãn / mã NV", value: OLS.q, "aria-label": "Lọc mẫu" }); qi.addEventListener("change", function () { OLS.q = qi.value.trim(); OLS.page = 0; render(); });
    c.appendChild(h("div", { class: "bar" }, [qi, h("span", { class: "hint", text: f.length + " mẫu" })]));
    if (!f.length) { c.appendChild(h("div", { class: "hint", text: OLS.tab === "cho" ? "Không có mẫu nào chờ xác nhận." : "Chưa có mẫu trong mục này. Mẫu tự được ghi khi bạn sửa một ô trong màn hình Đọc ảnh chấm công." })); return w; }
    var tb = h("table", { class: "t", "data-olsamples": "1" }); tb.appendChild(h("tr", {}, ["Ảnh ô", "Nhãn", "Loại nhãn", "Trạng thái", "Nguồn", "OCR đọc", "Chứng từ / trang", "Mã NV", "Kỳ", "Dùng", "Thao tác"].map(function (x) { return h("th", { text: x }); })));
    f.slice().reverse().slice(OLS.page * 50, OLS.page * 50 + 50).forEach(function (x) {
      var lab = h("input", { class: "i", value: x.label, style: "width:56px", "aria-label": "Nhãn mẫu" }), ops = h("td", {});
      var user = function () { return session ? session.tenDangNhap : ""; };
      if (x.status === "PENDING_APPROVAL" || x.status === "CONFLICT") ops.appendChild(btn("Duyệt", "pri", olAct(function () { return window.hakOcrLib.setStatus(x.id, "VERIFIED", user(), "duyệt thủ công"); }, "duyệt mẫu " + x.id)));
      if (x.status !== "REJECTED") ops.appendChild(btn("Từ chối", "ghost", olAct(function () { return window.hakOcrLib.setStatus(x.id, "REJECTED", user(), "từ chối thủ công"); }, "từ chối mẫu " + x.id)));
      if (x.status === "REJECTED" || x.status === "SUPERSEDED") ops.appendChild(btn("Khôi phục", "ghost", olAct(function () { return window.hakOcrLib.setStatus(x.id, "PENDING_APPROVAL", user(), "khôi phục"); }, "khôi phục mẫu " + x.id)));
      ops.appendChild(btn("Lưu nhãn", "ghost", olAct(function () { return window.hakOcrLib.relabel(x.id, lab.value, x.labelKind === "UNKNOWN" ? "SYMBOL" : x.labelKind, user(), "đổi nhãn thủ công"); }, "đổi nhãn mẫu " + x.id)));
      tb.appendChild(h("tr", { "data-olid": x.id }, [h("td", {}, [olThumb(x.pngSha)]), h("td", {}, [lab]), h("td", { text: x.labelKind === "UNKNOWN" ? "chưa rõ (ký hiệu hay giá trị công)" : "ký hiệu / số" }), h("td", { text: OL_ST[x.status] || x.status }), h("td", { text: x.source === "CONFIRMED" ? "Đã xác nhận đúng" : "Do sửa tay" }), h("td", { text: x.ocrValue || "" }), h("td", { text: (x.docId || "-") + " / " + (x.page || "") }), h("td", { text: x.employeeId || "" }), h("td", { text: x.ky || "" }), h("td", { class: "r", text: String(x.uses || 0) }), ops]));
    });
    c.appendChild(h("div", { class: "tw" }, [tb])); olPager(c, f.length);
    return w;
  }
  function olPager(c, n) { if (n <= 50) return; c.appendChild(h("div", { class: "bar" }, [btn("‹ Trước", "ghost", function () { if (OLS.page > 0) { OLS.page--; render(); } }), h("span", { class: "hint", text: "Trang " + (OLS.page + 1) + "/" + Math.ceil(n / 50) }), btn("Sau ›", "ghost", function () { if ((OLS.page + 1) * 50 < n) { OLS.page++; render(); } })])); }

  function tabOCR() {
    var w = h("div");
    if (!window.hakOcr) { w.appendChild(h("div", { class: "card" }, [h("div", { class: "warn", text: "Chỉ có trong bản cài (.exe) — OCR chạy offline trên máy." })])); return w; }
    var card = h("div", { class: "card" }), bar = h("div", { class: "bar" });
    if (window.hakOcr.options) {
      var umiToggle = h("input", { type: "checkbox", "aria-label": "Đọc thêm bằng Umi-OCR" });
      umiToggle.disabled = true;
      window.hakOcr.options().then(function (o) { umiToggle.checked = o.enabled; umiToggle.disabled = !o.available || OCRS.reading || OCRS.busy; });
      umiToggle.addEventListener("change", function () { umiToggle.disabled = true; window.hakOcr.options(umiToggle.checked).then(function (o) { umiToggle.checked = o.enabled; umiToggle.disabled = !o.available; }); });
      bar.appendChild(h("label", { title: "Ý kiến thứ hai cho ô số; chỉ trên máy này. Thiết lập áp dụng trong phiên mở app." }, [umiToggle, document.createTextNode(" Đọc thêm bằng Umi-OCR")]));
    }
    // ⚠ LỖI THẬT ĐÃ PHÁT HIỆN VÀ SỬA: nút này trước đây KHÔNG BAO GIỜ bị khoá khi
    // đang xử lý (OCRS.busy — đọc file thành trang ảnh; OCRS.reading — đang OCR
    // từng trang) — bấm lại trong lúc đó mở thêm 1 luồng đọc file độc lập, rồi gọi
    // readQueue() lần 2 chạy SONG SONG với luồng đầu trên CÙNG các trang (điều
    // kiện lọc "chưa đọc" của readQueue() không phân biệt được 2 luồng), kết quả
    // cuối phụ thuộc luồng nào ghi đè pg.res sau cùng. Khoá nút trong lúc đang xử
    // lý — mở lại ngay khi cả 2 cờ về false (render() đã gọi ở mọi nơi đổi cờ).
    var pickBtn = btn("📂 Chọn ảnh / PDF…", "pri", function () {
      var f = h("input", { type: "file", accept: "image/*,.pdf,application/pdf", multiple: "multiple" });
      f.addEventListener("change", function () {
        var files = Array.prototype.slice.call(f.files || []); if (!files.length) return;
        var big = files.filter(function (x) { return x.size > 40 * 1048576; }); if (big.length) { alert("File quá lớn (> 40 MB): " + big.map(function (x) { return x.name; }).join(", ")); return; }
        OCRS.busy = true; OCRS.stop = false; OCRS.reading = true; render();
        files.reduce(function (p, file) { return p.then(function () { if (OCRS.stop) return; return archiveOriginal(file).then(function (docId) { return fileToPages(file, docId); }).then(function (pgs) { pgs.forEach(function (x) { x.mode = OCRS.mode; OCRS.pages.push(x); }); }); }); }, Promise.resolve())
          .then(function () {
            OCRS.busy = false;
            if (OCRS.stop) { OCRS.pages.forEach(function (x) { if (!x.res && !x.err) x.stopped = true; }); OCRS.reading = false; OCRS.stop = false; render(); toast("Đã dừng — chưa mở hết các file đã chọn; trang chưa đọc bấm Đọc lại khi cần"); return; }
            return readQueue(); // đọc lần lượt các trang mới
          }, function (e) { OCRS.busy = false; OCRS.reading = false; alert("Không mở được file: " + e.message); render(); });
      });
      f.click();
    }, "Ảnh chụp (JPG, PNG) hoặc PDF quét — nhiều file cùng lúc");
    pickBtn.disabled = OCRS.busy || OCRS.reading;
    bar.appendChild(pickBtn);
    bar.appendChild(h("label", { text: "Cách đọc ô " })); bar.appendChild(modeSel(OCRS.mode, "Cách đọc ô cho file mới", function (v) { OCRS.mode = v; }));
    if (OCRS.reading) bar.appendChild(btn(OCRS.stop ? "Đang dừng…" : "■ Dừng đọc", "red", function () { OCRS.stop = true; if (window.hakOcr.cancel) window.hakOcr.cancel(); render(); }, "Dừng sau ô đang đọc; các trang đã đọc xong giữ nguyên, trang chưa đọc bấm Đọc lại sau"));
    if (OCRS.more.length && !OCRS.reading) {
      var left = OCRS.more.reduce(function (n, m) { return n + (m.pdf.numPages - m.next + 1); }, 0);
      bar.appendChild(btn("▶ Đọc tiếp " + Math.min(left, OCR_CHUNK) + " trang (còn " + left + ")", "pri", function () {
        var src = OCRS.more.shift(); OCRS.busy = true; OCRS.stop = false; OCRS.reading = true; render();
        renderPdfPages(src).then(function (pgs) { pgs.forEach(function (x) { x.mode = OCRS.mode; OCRS.pages.push(x); }); OCRS.busy = false; if (OCRS.stop) { OCRS.reading = false; OCRS.stop = false; OCRS.more.unshift(src); render(); return; } return readQueue(); }, function (e) { OCRS.busy = false; OCRS.reading = false; alert("Không dựng được trang: " + e.message); render(); });
      }, "PDF nhiều trang được mở từng lượt " + OCR_CHUNK + " trang để không đầy bộ nhớ — không trang nào bị bỏ"));
    }
    if (OCRS.pages.length) {
      bar.appendChild(btn("⬇ Xuất Excel", "", function () { ocrExport(OCRS.pages); }, "Mỗi trang 1 sheet: tên, nhân viên, ngày 1…31, tổng"));
      bar.appendChild(btn("Xuất phiếu nghiệm thu OCR", "ghost", function () {
        var stamp = Date.now().toString(36), pages = OCRS.pages.filter(function (p) { return p.res && p.lines && p.lines.length; }).map(function (p, pi) {
          var cells = [];
          p.lines.forEach(function (L, li) { p.days.forEach(function (d) {
            var c = L.src.cells && L.src.cells[d], candidate = c && c.handwriting;
            var raw = String(L.orig && L.orig[d] != null ? L.orig[d] : L.vals[d]);
            var entry = { row: "row-" + (li + 1), day: d, expected: null, read: raw, aligned: null,
              needsReview: raw === "?" || ocrNum(raw) > 3 || !!(c && (c.conf < 60 || c.unsure || c.src === "nét")) || !!(candidate && (candidate.offered || candidate.status === "NEEDS_REVIEW" || candidate.status === "UNSUPPORTED")) || !!(c && c.secondOpinion && c.secondOpinion.offered) };
            if (candidate && candidate.status === "CANDIDATE" && (!p.mode || p.mode === "so")) entry.suggestion = candidate.text;
            cells.push(entry);
          }); });
          return { id: stamp + "-page-" + (pi + 1), group: "SET_DOCUMENT_WRITER_GROUP", split: "test", quality: "SET_clear_OR_hard", cells: cells };
        });
        if (!pages.length) { toast("Chưa có trang nào đọc xong"); return; }
        download("ocr-acceptance-private-" + stamp + ".json", "application/json", JSON.stringify({ schema: 1, kind: "unclassified", version: "2.0.0-alpha.39", pages: pages }, null, 2));
        toast("Đã xuất phiếu không chứa tên hoặc ảnh. Người kiểm tra cần điền đáp án, xác nhận người/ngày và phân nhóm tài liệu trước khi đánh giá; giữ file riêng, không đưa lên repo.");
      }, "Xuất kết quả OCR ban đầu theo dòng/ngày, không chứa tên hoặc ảnh; đáp án và bố cục để trống cho người nghiệm thu"));
      bar.appendChild(btn("✔ Đưa vào Chấm công / Suất cơm…", "pri", function () { ocrApply(OCRS.pages); }, "Qua màn hình xem trước như nhập Excel"));
      if (!OCRS.reading) bar.appendChild(btn("Xóa danh sách", "ghost", function () { if (confirm("Xóa các trang đã đọc khỏi màn hình này? (Dữ liệu đã ghi vào Chấm công không bị ảnh hưởng)")) { OCRS.pages = []; OCRS.more = []; OCRS.sel = 0; render(); } }));
    }
    bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("Kiểm tra OCR", "ghost", function () { window.hakOcr.selfTest().then(function (r) {
      var u = r.umi, umiTxt = !u ? "" : u.ok ? "\nUmi-OCR: đang chạy trên máy này — ô số được đọc thêm làm ý kiến thứ hai (" + (u.languages || []).join(", ") + ")" : u.disabled ? "\nUmi-OCR: đã tắt" : "\nUmi-OCR: không thấy (tuỳ chọn — cài và chạy Umi-OCR để có ý kiến thứ hai cho ô số)";
      alert((r.ok ? "OCR hoạt động — đọc thử được \"" + r.text + "\" trong " + r.ms + " ms" : "OCR lỗi: " + r.error) + umiTxt); }); }));
    card.appendChild(bar);
    card.appendChild(h("div", { class: "hint", text: "Đọc được: bảng chấm công / chấm cơm có KẺ Ô — dòng = người, cột = ngày 1…31 (có thể có Tổng công, Tổng cơm, Công / Tăng ca), hoặc dòng = ngày, cột = Công / Cơm (Lịch làm) hay mỗi cột 1 người (bảng tay của tổ, có thể 2 khối ngày 1–15 và 16–31). Chọn Cách đọc ô: số công, dấu x (x = 1 công, xx = 2, xxx = 3; ô ghi giờ = giờ / 8) hoặc số ca (1 ca = 1 công, 1+2 = 2 công). Chữ in đọc tốt; chữ viết tay và ảnh chụp nhỏ / nghiêng đọc kém hơn — ô nghi ngờ tô vàng, ô không đọc được có dấu ?, dòng lệch tổng tô đỏ. Luôn xem lại trước khi ghi. Ảnh nên chụp thẳng, đủ sáng, bảng chiếm gần hết khung (hoặc quét PDF ≥ 200 dpi)." }));
    if (OCRS.busy) card.appendChild(h("div", { class: "ok", id: "ocr-status", text: (OCRS.pages[OCRS.sel] && OCRS.pages[OCRS.sel].status) || "Đang xử lý…" }));
    w.appendChild(card);
    if (!OCRS.pages.length) return w;
    var tabs = h("div", { class: "subtabs" });
    OCRS.pages.forEach(function (pg, i) {
      var cls = pg.err ? " bad" : !pg.res ? " wait" : "";
      tabs.appendChild(h("button", { class: (OCRS.sel === i ? "on" : "") + cls, on: { click: function () { OCRS.sel = i; render(); } } }, [document.createTextNode((i + 1) + ". " + pg.name), h("span", { class: "n", text: pg.res ? String((pg.lines || []).length) : pg.err ? "!" : pg.stopped ? "■" : "…" })]));
    });
    w.appendChild(tabs);
    var pg = OCRS.pages[Math.min(OCRS.sel, OCRS.pages.length - 1)], pc = h("div", { class: "card ocrpage", "data-ocr-page": String(OCRS.sel) });
    w.appendChild(pc);
    var tb = h("div", { class: "bar" });
    tb.appendChild(h("b", { text: pg.name }));
    tb.appendChild(h("span", { class: "hint", style: "margin:0", text: pg.status || "" }));
    tb.appendChild(h("span", { class: "sp" }));
    if ((pg.res || pg.err || pg.stopped) && !OCRS.reading) {
      tb.appendChild(btn("↺ Xoay trái", "ghost", function () { readQueue({ pg: pg, rot: ((pg.rot || 0) + 3) % 4 }); }, "Đọc lại sau khi xoay ảnh 90° ngược chiều kim đồng hồ"));
      tb.appendChild(btn("↻ Xoay phải", "ghost", function () { readQueue({ pg: pg, rot: ((pg.rot || 0) + 1) % 4 }); }));
      tb.appendChild(modeSel(pg.mode || "so", "Cách đọc ô của trang", function (v) { pg.mode = v; readQueue({ pg: pg, rot: pg.res ? pg.rot || 0 : undefined }); }));
      tb.appendChild(btn("↶ Hoàn tác ô đã sửa", "ghost", function () {
        var u = (pg.undo || []).pop(); if (!u) { toast("Chưa có ô nào để hoàn tác"); return; }
        var lr = ocrLearn(); u.L.vals[u.d] = u.prev; u.inp.value = u.prev;
        if (lr && window.hakOcrLib) window.hakOcrLib.undo(C.ocrLearn.cellKey(pg.docId, pg.trang || 1, u.cell, pg.rot || 0, ocrRef(u.L, u.li, u.d)), session ? session.tenDangNhap : "").then(function () { toast("Đã hoàn tác ô và mẫu học của lần sửa đó"); });
        render();
      }, "Trả ô về giá trị trước khi sửa; mẫu học của lần sửa gần nhất chuyển sang 'Bị từ chối' (vẫn giữ lịch sử)"));
      var lrq = ocrLearn(); if (lrq && lrq.pending()) tb.appendChild(btn("⚠ " + lrq.pending() + " mẫu học chưa ghi được — Thử lại", "ghost", function () { lrq.flush().then(function (r) { toast(r.left ? "Vẫn còn " + r.left + " mẫu chưa ghi được: " + lrq.lastError() : "Đã ghi " + r.sent + " mẫu"); render(); }); }));
      if (pg.srcKind === "pdf-text") tb.appendChild(btn("Đọc lại bằng OCR ảnh", "ghost", function () { pg.noText = true; readQueue({ pg: pg, rot: pg.rot || 0 }); }, "Trang này lấy chữ trực tiếp từ lớp chữ của PDF; bấm để bỏ qua lớp chữ và nhận dạng ảnh"));
      tb.appendChild(btn("Đọc lại", "ghost", function () { readQueue({ pg: pg, rot: pg.stopped && !pg.res ? undefined : pg.rot || 0 }); }));
    }
    pc.appendChild(tb);
    var lbox = h("div", { class: "bar", "data-ocr-learn-status": "1" }); if(pg.res && pg.res.documentReview) lbox.appendChild(h("div",{class:"hint",text:"Trường biểu mẫu chỉ dùng trong phiếu đối chiếu; không tự học vào thư viện ô công."})); else ocrStatusFill(lbox); pc.appendChild(lbox);
    if (pg.err) { pc.appendChild(h("div", { class: "warn", text: "Lỗi khi đọc: " + pg.err })); return w; }
    if (!pg.res) { pc.appendChild(h("div", { class: "hint", text: pg.stopped ? "Trang này chưa đọc (đã bấm Dừng đọc). Bấm Đọc lại khi cần." : "Đang chờ đọc…" })); return w; }
    var T = pg.res.table;
    (T.warnings || []).forEach(function (x) { pc.appendChild(h("div", { class: "warn", text: "⚠ " + x })); });
    if (!T.layout && pg.res.documentReview) {
      var dr=pg.res.documentReview;
      var titles={FINGERPRINT_EXCEPTION:"Giấy xác nhận vân tay",OVERTIME_SLIP:"Phiếu xác nhận tăng ca",OVERTIME_SUMMARY:"Danh sách tổng giờ tăng ca",UNKNOWN:"Chưa xác định loại hồ sơ"};
      var review=h("section",{class:"card","data-document-review":"1"});
      review.appendChild(h("h3",{text:(titles[dr.kind]||titles.UNKNOWN)+" · Chờ đối chiếu"}));
      review.appendChild(h("div",{class:"warn",text:"Gợi ý OCR chưa được xác nhận. Đối chiếu ảnh gốc; không tự ghi vào chấm công, không tự tính giờ qua đêm và không xác nhận chữ ký."}));
      if(!pg.formDraft)pg.formDraft=dr.candidates.map(function(c){return {field:c.field,value:c.value,source:c.source,confirmed:false};});
      var rt=h("table");rt.appendChild(h("tr",{},["Trường","Gợi ý / giá trị đã sửa","Dòng nguồn OCR","Đã đối chiếu ảnh"].map(function(t){return h("th",{text:t});})));
      pg.formDraft.forEach(function(c){
        var value=h("input",{class:"i",value:c.value,"aria-label":"Giá trị "+c.field});
        var checked=h("input",{type:"checkbox","aria-label":"Đã đối chiếu "+c.field});checked.checked=c.confirmed;
        value.addEventListener("input",function(){c.value=value.value;c.confirmed=false;checked.checked=false;});checked.addEventListener("change",function(){c.confirmed=checked.checked;});
        rt.appendChild(h("tr",{},[h("td",{text:({date:"Ngày",time:"Giờ",name:"Họ tên"})[c.field]||c.field}),h("td",{},[value]),h("td",{text:c.source}),h("td",{},[checked])]));
      });review.appendChild(h("div",{class:"tw"},[rt]));
      var addFields=h("div",{class:"bar"});
      [["name","Thêm họ tên"],["date","Thêm ngày"],["time","Thêm giờ"]].forEach(function(item){addFields.appendChild(btn(item[1],"ghost",function(){pg.formDraft.push({field:item[0],value:"",source:"Người dùng bổ sung từ ảnh gốc",confirmed:false});render();}));});review.appendChild(addFields);
      if(!pg.formDraft.length)review.appendChild(h("div",{class:"hint",text:"Chưa đọc được trường đáng tin để gợi ý. Xem chữ OCR bên dưới và nhập hồ sơ theo ảnh gốc; không coi đây là kết quả trống hợp lệ."}));
      var raw=h("details",{},[h("summary",{text:"Xem toàn bộ chữ OCR để đối chiếu"}),h("pre",{text:dr.rawText,style:"white-space:pre-wrap;max-height:260px;overflow:auto"})]);review.appendChild(raw);
      if(can("export"))review.appendChild(btn("Xuất phiếu đối chiếu JSON","",function(){download("HAK_OCR_DoiChieu_"+Date.now()+".json","application/json",JSON.stringify({kind:dr.kind,status:"REVIEW_ONLY",canAutoImport:false,source:pg.name,fields:pg.formDraft},null,2));}));
      pc.appendChild(review);
    } else if (!T.layout) { pc.appendChild(h("div", { class: "hint", text: "Thử xoay ảnh hoặc chụp lại rõ hơn; trang chưa dựng được bảng, không tự nhập dữ liệu." })); }

    var meta = h("div", { class: "bar" }), kyI = h("input", { class: "i", type: "month", value: pg.ky || kyStr(), "aria-label": "Kỳ của trang", style: "width:170px" });
    kyI.addEventListener("change", function () { pg.ky = kyI.value; });
    meta.appendChild(h("label", { text: "Kỳ " })); meta.appendChild(kyI);
    if (pg.srcKind === "pdf-text") meta.appendChild(h("span", { class: "hint", "data-src-kind": "pdf-text", style: "margin:0", text: "Nguồn: lớp chữ của PDF (không OCR ảnh)" }));
    else if (pg.srcNote) meta.appendChild(h("span", { class: "hint", style: "margin:0", text: "Lớp chữ PDF không dùng được: " + pg.srcNote }));
    if (pg.res.title && pg.res.title.length) meta.appendChild(h("span", { class: "hint", style: "margin:0", text: "Tiêu đề đọc được: " + pg.res.title.join(" · ") }));
    pc.appendChild(meta);
    if (!pg.lines || !pg.lines.length) return w;
    // ảnh gốc (đã xoay) + ô đang chọn
    var reviewInputs = [], reviewIndex = -1;
    var prevBox = h("div", { class: "ocrprev", "data-ocr-review": "1", role: "region", "aria-label": "Đối chiếu ô chấm công" }), zoom = canvasOf(10, 10), zcap = h("div", { class: "hint", "aria-live": "polite", text: "Bấm vào 1 ô để xem ảnh gốc của ô đó" });
    var reviewBar = h("div", { class: "bar" }), reviewCount = h("span", { class: "hint" });
    function nextReview() {
      if (!reviewInputs.length) return;
      reviewIndex = (reviewIndex + 1) % reviewInputs.length;
      reviewInputs[reviewIndex].focus();
      reviewInputs[reviewIndex].scrollIntoView({ block: "nearest", inline: "center" });
      reviewCount.textContent = "Ô cần đối chiếu " + (reviewIndex + 1) + "/" + reviewInputs.length + " · xem ảnh rồi sửa nếu cần";
    }
    reviewBar.appendChild(btn("Ô cần kiểm tra tiếp theo", "ghost", nextReview, "Chuyển đến ô chưa đọc được, độ tin cậy thấp hoặc có gợi ý chữ tay; không tự xác nhận ô"));
    reviewBar.appendChild(reviewCount); prevBox.appendChild(reviewBar);
    prevBox.appendChild(zoom); prevBox.appendChild(zcap);
    var showCell = function (cell, label) {
      if (!cell || !pg.view) { zcap.textContent = label + " — không có ảnh ô"; return; }
      var pad = 6, x0 = Math.max(0, cell.x0 - pad), y0 = Math.max(0, cell.y0 - pad), cw = Math.min(pg.view.width, cell.x1 + pad) - x0, ch = Math.min(pg.view.height, cell.y1 + pad) - y0, sc0 = Math.min(6, 120 / Math.max(1, ch));
      zoom.width = Math.round(cw * sc0); zoom.height = Math.round(ch * sc0);
      var zx = zoom.getContext("2d"); zx.imageSmoothingEnabled = true; zx.drawImage(pg.view, x0, y0, cw, ch, 0, 0, zoom.width, zoom.height);
      zcap.textContent = label + " · OCR: \"" + (cell.text || "") + "\" · tin cậy " + (cell.conf || 0) + (cell.handwriting && cell.handwriting.text ? " · gợi ý chữ tay: " + cell.handwriting.text + " (chưa xác nhận)" : "") + (cell.secondOpinion && cell.secondOpinion.status === "DISAGREE" ? " · Umi-OCR đọc KHÁC: " + cell.secondOpinion.text + " (xem lại)" : cell.secondOpinion && cell.secondOpinion.status === "AGREE" ? " · Umi-OCR đọc giống" : "") + (cell.src === "nét" ? " · nhận theo nét (số 1 viết tay)" : "") + (cell.valSrc ? " · tính: " + cell.valSrc : "") + (cell.libStatus === "AUTO" ? " · thư viện mẫu tự nhận (" + Math.round(cell.libScore * 100) + "%)" + (cell.libFrom != null ? ", OCR đọc: " + cell.libFrom : "") : cell.libStatus === "SUG" ? " · thư viện gợi ý: " + cell.libLabel + " (" + Math.round(cell.libScore * 100) + "%)" : "") + (cell.unsure ? " · không chắc — xem lại" : "");
    };
    var tw = h("div", { class: "tw ocrgrid" }), t = h("table"), hr = h("tr");
    ["Tên trên giấy", "Nhân viên", "Loại"].concat(pg.days.map(String), ["Tổng tính", "Tổng giấy"]).forEach(function (x) { hr.appendChild(h("th", { text: x })); });
    hr.appendChild(h("th", { text: "" })); // cột "Bỏ dòng"
    t.appendChild(h("thead", {}, [hr]));
    var tbody = h("tbody"), list = nvChoices();
    pg.lines.forEach(function (L, li) {
      var tr = h("tr"), sel = h("select", { "aria-label": "Nhân viên dòng " + (li + 1) });
      sel.appendChild(h("option", { value: "", text: "— chọn —" }));
      var seen = {};
      L.sug.forEach(function (s0) { seen[s0.ma] = 1; sel.appendChild(h("option", { value: s0.ma, text: "≈ " + s0.ma + " · " + s0.ten + (s0.memo ? " — " + s0.memo : " (" + Math.round(s0.score * 100) + "%)") })); });
      list.forEach(function (n) { if (!seen[n.ma]) sel.appendChild(h("option", { value: n.ma, text: n.ma + " · " + n.ten })); });
      sel.value = L.ma; if (L.nameDup) sel.title = "Trùng họ tên với nhân viên khác — hãy chọn đúng theo MÃ NV"; sel.addEventListener("change", function () { L.ma = sel.value; tr.classList.toggle("nomatch", !L.ma); });
      var ks = h("select", { "aria-label": "Loại dòng " + (li + 1) }); OCR_KIND.forEach(function (o) { ks.appendChild(h("option", { value: o[0], text: o[1] })); }); ks.value = L.kind; ks.addEventListener("change", function () { L.kind = ks.value; });
      var nmI = h("input", { class: "i", value: L.name, style: "width:150px" }); nmI.addEventListener("change", function () { L.name = nmI.value; });
      nmI.addEventListener("focus", function () { showCell(L.src.nameCell, "Tên"); });
      tr.appendChild(h("td", {}, [nmI])); tr.appendChild(h("td", {}, [sel])); tr.appendChild(h("td", {}, [ks]));
      var sumTd = h("td", { class: "r" }), totTd = h("td", { class: "r" });
      var upd = function () {
        var ls = lineSum(L, pg.days), tk = Object.keys(L.src.totals || {}).filter(function (k) { var f = C.tsparse.fold(k); return L.kind === "Cơm" ? /com/.test(f) : !/com/.test(f) || /cong/.test(f); })[0];
        var tv = tk != null ? L.src.totals[tk] : null;
        sumTd.textContent = String(ls.sum).replace(".", ",") + (ls.bad ? " (+" + ls.bad + " ?)" : "");
        totTd.textContent = tv == null || isNaN(tv) ? "" : String(tv).replace(".", ",");
        tr.classList.toggle("mismatch", tv != null && !isNaN(tv) && Math.abs(tv - ls.sum) > 0.01);
      };
      pg.days.forEach(function (d) {
        var cell = L.src.cells ? L.src.cells[d] : null, inp = h("input", { class: "i oc", value: L.vals[d], "data-day": String(d) });
        if (String(L.vals[d]).trim() && ((cell && (cell.conf < 60 || cell.src === "nét" || cell.unsure)) || ocrNum(L.vals[d]) > 3)) inp.classList.add("low"); // > 3 công / suất 1 ngày: hay là "0.5" mất dấu chấm
        if (L.vals[d] === "?") inp.classList.add("bad");
        inp.addEventListener("paste", function (ev) { // dán nhiều ô (từ Excel): tab = sang ô kế, xuống dòng = sang dòng kế; mỗi ô đổi giá trị đều đi qua đường sửa ô thường (ghi mẫu)
          var txt = (ev.clipboardData || window.clipboardData || {}).getData ? (ev.clipboardData || window.clipboardData).getData("text") : ""; if (!/[\t\n]/.test(txt.replace(/\n$/, ""))) return;
          ev.preventDefault(); var rowsT = txt.replace(/\r/g, "").replace(/\n$/, "").split("\n").map(function (r) { return r.split("\t"); });
          var trs = [].slice.call(tbody.querySelectorAll("tr")), r0 = trs.indexOf(inp.closest("tr")), days = pg.days, d0 = days.indexOf(d);
          rowsT.forEach(function (cells, ri) { var tr2 = trs[r0 + ri]; if (!tr2) return; cells.forEach(function (v, ci) { var dd = days[d0 + ci]; if (dd == null) return; var t2 = tr2.querySelector("input[data-day='" + dd + "']"); if (t2 && t2.value !== v.trim()) { t2.value = v.trim(); t2.dispatchEvent(new window.Event("change")); } }); });
        });
        inp.addEventListener("focus", function () { inp._viewed = true; inp._changed = false; showCell(cell, (L.name || "Dòng " + (li + 1)) + " · ngày " + d); });
        inp.addEventListener("blur", function () { var lr = ocrLearn(); if (lr && cell && inp._viewed && !inp._changed && String(L.vals[d]).trim() && String(L.vals[d]) === String(L.orig ? L.orig[d] : "")) lr.onViewedUnchanged({ res: pg.res, cell: cell, pg: pg, ma: L.ma, value: L.vals[d] }); inp._viewed = false; });
        inp.addEventListener("change", function () { var prevV = L.vals[d]; inp._changed = true; if (prevV !== inp.value.trim()) { (pg.undo = pg.undo || []).push({ L: L, d: d, prev: prevV, cell: cell, inp: inp }); } L.vals[d] = inp.value.trim(); var lr = ocrLearn(); if (lr) lr.onEdit({ res: pg.res, cell: cell, ref: ocrRef(L, li, d), pg: pg, ma: L.ma, before: prevV, after: L.vals[d], ocrValue: L.orig ? L.orig[d] : prevV }).then(function (r) { ocrMark(inp, ocrRef(L, li, d)); if (r && r.ok === false) toast("⚠ Chưa lưu được mẫu học từ ô vừa sửa — " + (r.durable ? "đã giữ lại trên đĩa, sẽ thử lại" : "CHỈ giữ tạm trong bộ nhớ, hãy bấm Thử lại trước khi đóng") + " (" + (r.error || "") + ")"); else if (r && r.missingSource) toast("Ô này không có ảnh nguồn — chỉ ghi lịch sử sửa, chưa tạo mẫu học"); }); inp.classList.remove("low"); inp.classList.toggle("bad", isNaN(ocrNum(L.vals[d])) && ocrNum(L.vals[d]) !== null); upd(); });
        var contents = [inp], candidate = cell && cell.handwriting;
        if (inp.classList.contains("low") || inp.classList.contains("bad") || (candidate && (candidate.offered || candidate.status === "NEEDS_REVIEW" || candidate.status === "UNSUPPORTED"))) reviewInputs.push(inp);
        if ((!pg.mode || pg.mode === "so") && candidate && candidate.offered && candidate.status === "CANDIDATE" && ocrNum(L.vals[d]) !== ocrNum(candidate.text)) {
          var useCandidate = btn("✎ " + candidate.text, "ghost", function () {
            showCell(cell, (L.name || "Dòng " + (li + 1)) + " · ngày " + d);
            inp.value = candidate.text; inp.dispatchEvent(new window.Event("change"));
            useCandidate.disabled = true; useCandidate.textContent = "Đã chọn " + candidate.text;
          }, "Gợi ý chữ số viết tay CNN: " + candidate.text + ". " + candidate.warning + " Điểm mô hình không phải xác nhận độ chính xác.");
          useCandidate.setAttribute("data-handwriting-candidate", candidate.text);
          useCandidate.setAttribute("aria-label", "Dùng gợi ý chữ tay " + candidate.text + " cho ngày " + d);
          contents.push(useCandidate);
        }
        // Umi-OCR (tuỳ chọn) đọc ô số KHÁC Tesseract → tô vàng, đưa vào "Ô cần kiểm tra tiếp theo", nút gợi ý (không tự thay)
        var second = cell && cell.secondOpinion;
        if ((!pg.mode || pg.mode === "so") && second && second.offered && second.status === "DISAGREE" && ocrNum(L.vals[d]) !== ocrNum(second.text)) {
          inp.classList.add("low"); inp.title = "Tesseract đọc \"" + (cell.text || "") + "\", Umi-OCR đọc \"" + second.text + "\" — xem ảnh ô rồi chọn";
          if (reviewInputs.indexOf(inp) < 0) reviewInputs.push(inp);
          var useSecond = btn("⇄ " + second.text, "ghost", function () {
            showCell(cell, (L.name || "Dòng " + (li + 1)) + " · ngày " + d);
            inp.value = second.text; inp.dispatchEvent(new window.Event("change"));
            useSecond.disabled = true; useSecond.textContent = "Đã chọn " + second.text;
          }, "Umi-OCR (engine thứ hai, chạy trên máy này) đọc ô này là " + second.text + ", khác Tesseract. Đối chiếu ảnh ô trước khi chọn.");
          useSecond.setAttribute("data-umi-candidate", second.text);
          useSecond.setAttribute("aria-label", "Dùng kết quả Umi-OCR " + second.text + " cho ngày " + d);
          contents.push(useSecond);
        }
        tr.appendChild(h("td", { class: "oc" }, contents));
      });
      tr.appendChild(sumTd); tr.appendChild(totTd); upd();
      tr.appendChild(h("td", {}, [btn("✕ Bỏ dòng", "ghost", function () { if (!confirm("Bỏ dòng \"" + (L.name || "(không tên)") + "\" khỏi trang này? (Chỉ bỏ khỏi màn hình, không ảnh hưởng ảnh gốc và chưa ghi vào Chấm công.)")) return; pg.lines.splice(li, 1); render(); }, "Bỏ dòng này khỏi trang OCR (không ghi vào Chấm công)")]));
      if (!L.ma) tr.classList.add("nomatch");
      tbody.appendChild(tr);
    });
    t.appendChild(tbody); tw.appendChild(t);
    if ((!pg.mode || pg.mode === "so") && pg.res && pg.res.cells && pg.res.cells.some(function (c) { return c.handwriting && c.handwriting.model; })) pc.appendChild(h("div", { class: "hint", "data-handwriting-model": "1", text: "Nhận dạng chữ số viết tay chạy offline. Nút ✎ gợi ý chữ số đơn hoặc số thập phân có dấu phân cách và các chữ số tách rời. Chỉ khi bạn chọn thì giá trị ô mới đổi. Chưa hỗ trợ tên tiếng Việt hoặc chữ số dính nét; cần đối chiếu ảnh gốc." }));
    if (C.ocrRules) { // kiểm tra nghiệp vụ (V7): kỳ, ngày trong tháng, mã NV, trùng dòng, ô không phải số — lỗi cấu trúc thì KHÔNG học mẫu từ trang này
      var maSet = {}; list.forEach(function (n) { maSet[n.ma] = 1; });
      var chk = C.ocrRules.check({ ky: pg.ky, mode: pg.mode, days: pg.days, lines: pg.lines.map(function (L) { return { name: L.name, ma: L.ma, kind: L.kind, vals: L.vals, src: L.src }; }) }, { maSet: maSet, sumOf: function (L) { return lineSum(L, pg.days).sum; } });
      pg.layoutSuspect = !!(chk.layoutSuspect || pg.layoutStatus === "MISMATCH" || (pg.res && pg.res.table && !pg.res.table.layout));
      if (pg.layoutStatus === "MISMATCH") pc.appendChild(h("div", { class: "warn", "data-ocr-layout": "1" }, [document.createTextNode("Bố cục bảng " + pg.layoutInfo + " — thư viện mẫu không tự nhận ô và KHÔNG học từ trang này. "), btn("Đây là bố cục mới — lưu", "ghost", function () { window.hakOcrLib.layoutSave(pg.layoutSig, "", session ? session.tenDangNhap : "").then(function (r) { if (r && r.ok) { pg.layoutStatus = "MATCH"; pg.layoutId = r.id; pg.layoutSuspect = false; toast("Đã lưu bố cục mới"); OLS.loaded = false; render(); } }); })]));
      if (chk.issues.length) pc.appendChild(h("div", { class: chk.errors ? "warn" : "hint", "data-ocr-rules": "1", html: "<b>Kiểm tra nghiệp vụ · HAK OCR Engine:</b> " + chk.errors + " lỗi, " + chk.warns + " cảnh báo" + (chk.layoutSuspect ? " — <b>nghi lỗi bố cục: trang này không được dùng để học mẫu</b>" : "") + "<br>" + chk.issues.slice(0, 8).map(function (i) { return esc(i.msg); }).join("<br>") + (chk.issues.length > 8 ? "<br>… và " + (chk.issues.length - 8) + " mục nữa" : "") }));
    }
    pc.appendChild(h("div", { class: "legend", html: "<span><i class='low'>1</i>OCR không chắc / nhận theo nét</span><span><i class='bad'>?</i>không đọc được — nhập lại</span><span><i class='mm'>&nbsp;</i>dòng lệch tổng trên giấy</span><span><i class='nm'>&nbsp;</i>chưa chọn nhân viên</span>" }));
    reviewCount.textContent = reviewInputs.length + " ô cần đối chiếu · không tự xác nhận";
    pc.appendChild(prevBox);
    pc.appendChild(tw);
    return w;
  }

  // ---------- Trang chủ ----------
  function tabHome() {
    var w = h("div", { class: "hak-dashboard" }), go = function (tab, extra) { return function () { st.tab = tab; if (extra) extra(); saveUi(); render(); }; };
    var chot = kyChot(kyStr()), ky = "tháng " + st.thang + "/" + st.nam;
    var sp = tabAllowed("luong") ? HRM.staffForPayroll(db, st.nam, st.thang) : null;
    var iss = INT.check(db).filter(function (i) { return i.level === "Critical" || i.level === "High"; });
    var het = tabAllowed("baocao") || can("hr.view") ? HRM.reports(db).hethan(30) : [];
    // Banner
    var kqNow = chot ? null : (st.kq && st.kq.ky === kyStr() && !st.kqStale ? st.kq : null);
    var tl = chot ? chot.totals && chot.totals.thucLinh : kqNow ? kqNow.bangluong.reduce(function (t, x) { return t + (+x["Thực lĩnh"] || 0); }, 0) : null;
    var hb = [];
    if (tabAllowed("luong")) hb.push(btn(chot ? "🔒 Xem bảng lương đã chốt" : "▶ Tính lương " + ky, "", go("luong")));
    else if (tabAllowed("nhansu")) hb.push(btn("👥 Mở Nhân sự", "", go("nhansu")));
    if (tabAllowed("chamcong")) hb.push(btn("🗓 Mở chấm công", "ghost", go("chamcong")));
    var dl = h("dl", {}, [
      h("div", {}, [h("dt", { text: "Người tính lương" }), h("dd", { text: sp ? String(sp.list.length) : "—" })]),
      h("div", {}, [h("dt", { text: "Cần xử lý" }), h("dd", { text: String(iss.length + het.length + (sp ? sp.warn.length : 0)) })]),
      h("div", { class: "w" }, [h("dt", { text: chot ? "Tổng thực lĩnh (đã chốt)" : "Tổng thực lĩnh (lần tính gần nhất)" }), h("dd", { text: !canSeePay() ? HRM.PAY_HIDDEN : tl == null ? "Chưa tính" : fmt(tl) })])
    ]);
    w.appendChild(h("section", { class: "hero" }, [
      h("div", { class: "htxt" }, [h("div", { class: "ey", text: "Kỳ lương " + ky + " · " + (chot ? "Đã chốt" : "Chưa chốt") }),
        h("h1", { text: "Tính lương từ hồ sơ & chấm công" }),
        h("p", { text: "Nhập chấm công, sản lượng, thưởng / trừ, tạm ứng của tháng rồi bấm Tính lương. Lương, BHXH, thuế TNCN và thực lĩnh được tính tự động theo hồ sơ và danh mục — chạy hoàn toàn offline trên máy này." }),
        h("div", { class: "hbtns" }, hb)]),
      dl]));
    // Workspace overview: display only values already calculated by the current engine.
    var metrics = h("section", { class: "hak-dashboard-metrics", "aria-label": "Tổng quan kỳ lương" });
    [["Nhân sự", String((db.nhanvien || []).filter(function (x) { return x["Trạng thái"] !== "Đã nghỉ việc"; }).length), "Nhân viên đang làm việc"], ["Đầu vào còn nháp", String(C.inputReview.pending(db, kyStr()).length), "Bảng hoặc chế độ phân bổ cần lưu"], ["Cần xử lý", String(iss.length + het.length + (sp ? sp.warn.length : 0)), "Cảnh báo dữ liệu và hồ sơ"], ["Thực lĩnh", !canSeePay() ? HRM.PAY_HIDDEN : tl == null ? "Chưa tính" : fmt(tl), chot ? "Bảng lương đã chốt" : "Lần tính gần nhất"]].forEach(function (v) {
      metrics.appendChild(h("div", { class: "hak-dashboard-metric" }, [h("small", { text: v[0] }), h("strong", { text: v[1] }), h("span", { text: v[2] })]));
    });
    w.appendChild(metrics);
    // Các bước
    var steps = [
      ["backup", "Nạp danh mục chuẩn HAK", "Phòng ban, chức vụ, mã lương, phụ cấp, BH, thuế", countOf("dm_baohiem") > 0],
      ["dm", "Kiểm tra Danh mục", "Đơn giá, phụ cấp, ngưỡng BH theo đơn vị", countOf("dm_luong") > 0],
      ["nhansu", "Hồ sơ & hợp đồng", countOf("nhanvien") + " nhân viên — lương lấy từ phụ lục đang hiệu lực", countOf("nhanvien") > 0 && countOf("chitiethd") > 0],
      ["chamcong", "Chấm công tháng " + st.thang, "Dán từ Excel hoặc nhập tay", db.chamcong.some(function (r) { return r["Kỳ"] === kyStr(); })],
      ["sanluong", "Sản lượng · Thưởng · Tạm ứng", "Nếu có phát sinh trong tháng", db.sanluong.length + db.bandam.length + db.psluong.length + db.ungluong.length > 0],
      ["luong", "Tính → kiểm tra → Chốt kỳ", "Chốt để lưu bảng lương, xem lại về sau", !!chot]
    ].filter(function (s) { return tabAllowed(s[0]); });
    var ol = h("ol", { class: "flow", "aria-label": "Các bước kỳ lương" });
    steps.forEach(function (s, i) { ol.appendChild(h("li", { class: s[3] ? "done" : "", tabindex: "0", role: "button", on: { click: go(s[0]), keydown: function (e) { if (e.key === "Enter") go(s[0])(); } } }, [h("span", { class: "n", text: s[3] ? "✓" : String(i + 1) }), h("div", {}, [h("b", { text: s[1] }), h("small", { text: s[2] })])])); });
    w.appendChild(ol);
    // Mở nhanh
    var Q = [["chamcong", "g1", "🗓", "Chấm công", "Bảng công theo ngày, dán từ Excel."], ["luong", "g2", "📄", "Bảng lương", "Tính, kiểm tra cảnh báo, xuất Excel, chốt kỳ."],
      ["kyluong", "g4", "🔒", "Kỳ lương đã chốt", "Xem lại, so sánh phiên bản, xuất Excel."], ["baocaoluong", "g6", "📈", "Báo cáo lương", "Theo phòng ban, BHXH, thuế, hạch toán."],
      ["nhansu", "g5", "👥", "Hồ sơ nhân sự", "Hợp đồng, phụ lục lương, nhân thân, nghỉ phép."], ["baocao", "g7", "📋", "Báo cáo nhân sự", "Biến động, sổ quản lý lao động, hết hạn HĐ."],
      ["dm", "g8", "📚", "Danh mục", "Mã lương, phụ cấp, BH, thuế, phòng ban."], ["backup", "g3", "🛡", "Sao lưu & hệ thống", "Sao lưu, khôi phục, người dùng, kiểm tra dữ liệu."]]
      .filter(function (q) { return tabAllowed(q[0]); });
    if (Q.length) {
      w.appendChild(h("div", { class: "sec-title", text: "Mở nhanh" }));
      var qg = h("div", { class: "qcards" });
      Q.forEach(function (q) { qg.appendChild(h("button", { type: "button", class: "qcard", on: { click: go(q[0]) } }, [h("span", { class: "qi " + q[1], text: q[2] }), h("b", { text: q[3] }), h("small", { text: q[4] })])); });
      w.appendChild(qg);
    }
    // Cần xử lý + An toàn dữ liệu
    var todo = h("ul", { class: "todo" }), nTodo = 0;
    var addTodo = function (hi, title, sub, label, fn) { nTodo++; todo.appendChild(h("li", {}, [h("span", { class: "dot" + (hi ? " hi" : "") }), h("div", { class: "tx" }, [h("b", { text: title }), h("small", { text: sub })]), btn(label, "ghost", fn)])); };
    if (iss.length) addTodo(true, iss.length + " vấn đề dữ liệu mức Critical / High", iss.slice(0, 2).map(function (i) { return i.msg; }).join(" · "), "Kiểm tra dữ liệu", go("backup"));
    if (het.length) addTodo(true, het.length + " hợp đồng sắp hết hạn / đã quá hạn trong 30 ngày", het.slice(0, 3).map(function (r) { return r["Mã NV"]; }).join(", "), "Xem báo cáo", go("baocao", function () { st.bc = "hethan"; }));
    if (sp && sp.warn.length) addTodo(false, sp.warn.length + " cảnh báo hồ sơ khi tính lương " + ky, sp.warn[0], "Mở Tính lương", go("luong"));
    var left = h("section", { class: "card" }, [h("h3", {}, ["Cần xử lý trước khi chốt", nTodo ? h("span", { class: "cnt", text: String(nTodo) }) : null])]);
    left.appendChild(nTodo ? todo : h("div", { class: "hint", text: "Không có việc nào đang chờ — dữ liệu kỳ này sẵn sàng." }));
    var safe = h("section", { class: "card" }, [h("h3", { text: "An toàn dữ liệu" })]);
    safe.appendChild(h("div", { class: "hint", text: store ? "App tự lưu và tự giữ bản sao lưu mỗi ngày trên máy này (có file kiểm tra SHA-256)." : "Dữ liệu nằm trong trình duyệt của máy này — hãy sao lưu ra file cuối mỗi kỳ." }));
    var bst = store && store.backupStatus && (can("backup.restore") || can("system.admin")) ? store.backupStatus() : null;
    if (bst && (bst.daysSinceExternal == null || bst.daysSinceExternal > 7 || bst.lastMirrorError)) safe.appendChild(h("div", { class: "locked", html: "⚠ <b>" +
      (bst.lastMirrorError ? "Không chép được sang thư mục sao lưu thứ hai" : bst.daysSinceExternal == null ? "Chưa có bản sao lưu nào ra ngoài máy" : "Đã " + bst.daysSinceExternal + " ngày chưa sao lưu ra ngoài máy") +
      "</b> — hỏng ổ cứng / mất máy / mã độc sẽ mất cả dữ liệu lẫn bản sao lưu trên máy. Vào <b>Sao lưu &amp; hệ thống</b>: chọn <b>thư mục sao lưu thứ hai</b> (USB, ổ mạng, Google Drive) hoặc bấm <b>Sao lưu ra file</b>." +
      (bst.lastMirrorError ? "<br><span>" + esc(bst.lastMirrorError) + "</span>" : "") }));
    else if (bst) safe.appendChild(h("div", { class: "ok", text: "✓ Đã sao lưu ra ngoài máy " + bst.daysSinceExternal + " ngày trước" + (bst.mirrorDir ? " · thư mục thứ hai: " + bst.mirrorDir : "") }));
    if (tabAllowed("backup")) safe.appendChild(h("div", { class: "bar", style: "margin:10px 0 0" }, [btn("🛡 Mở Sao lưu", "", go("backup"))]));
    if (can("import")) safe.appendChild(h("div", { class: "bar", style: "margin:8px 0 0" }, [btn("📄 Tải file mẫu Excel", "", downloadAllTemplates), btn("⬆ Nhập từ file Excel tổng", "", importAllFile)]));
    w.appendChild(h("div", { class: "cols2" }, [left, safe]));
    return w;
  }

  // ---------- Sao lưu ----------
  function tabSaoLuu() {
    var c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "Dữ liệu hiện có & nhập từ Excel" }));
    if (store) {
      var inf = store.info(), sch0 = (store.scheduleGet && store.scheduleGet()) || {}, keepDays = sch0.keepDaily || 60;
      c.appendChild(h("div", { class: "ok", html: "Dữ liệu tự lưu tại: <code>" + esc(inf.dataFile) + "</code><br>Bản sao lưu tự động mỗi ngày (giữ " + keepDays + " ngày theo Lịch ở mục 3): <code>" + esc(inf.backupDir) + "</code>" }));
      c.appendChild(h("div", { class: "bar", style: "margin-top:8px" }, [btn("📂 Mở thư mục dữ liệu", "", function () { store.openFolder(); })]));
    }
    var bar = h("div", { class: "bar" });
    bar.appendChild(btn("📋 Nạp danh mục chuẩn HAK", "", napMau));
    c.appendChild(bar);
    c.appendChild(h("h3", { text: "Nhập dữ liệu từ Excel", style: "margin-top:18px" }));
    c.appendChild(h("div", { class: "hint", text: "Cách nhanh nhất: tải 1 file mẫu có đủ các sheet (Nhân sự, Chấm công, Mã lương...), điền dữ liệu rồi nhập lại 1 lần. Hoặc vào từng mục và dùng nút 'Tải file mẫu' riêng." }));
    bar = h("div", { class: "bar" });
    bar.appendChild(btn("📄 Tải toàn bộ file mẫu", "pri", downloadAllTemplates));
    bar.appendChild(btn("⬆ Nhập từ file Excel tổng", "", importAllFile));
    bar.appendChild(h("span", { class: "sp" }));
    bar.appendChild(btn("🏢 Gán Mã công ty cho dữ liệu cũ", "", function () {
      if (!need("system.admin")) return;
      var p = CMP.plan(db);
      if (p.status !== "READY") { alert((p.status === "BLOCKED" ? "⛔ Chưa thể gán: " : "") + p.reason + (p.foreign.length ? "\n\nDòng mang mã lạ: " + p.foreign.slice(0, 5).map(function (x) { return x.bang + "#" + (x.index + 1) + "=" + x.giaTri; }).join(", ") : "")); return; }
      var ds = Object.keys(p.counts).map(function (k) { return k + ": " + p.counts[k]; }).join("\n");
      if (!confirm("Gán Mã công ty \"" + p.companyId + "\" cho " + p.total + " dòng chưa có mã:\n" + ds + "\n\nChỉ điền ô còn trống, không ghi đè. Bảng lương đã chốt không đổi. Hệ thống sẽ sao lưu trước. Tiếp tục?")) return;
      if (!backupOrBlock("truoc-gan-ma-cong-ty", "gán Mã công ty")) return;
      var r = CMP.apply(db); audit("Gán Mã công ty", p.companyId + " · " + JSON.stringify(r.changed)); save(); render(); toast("Đã gán Mã công ty cho " + p.total + " dòng");
    }, "Migration có kiểm tra: chỉ chạy khi xác định được duy nhất một công ty"));
    bar.appendChild(btn("🗑 Xóa toàn bộ dữ liệu", "red", function () { if (!need("system.admin")) return; if ((db._yearArchives || []).length) { alert("Đang có kho hồ sơ năm. Không thể xóa toàn bộ dữ liệu vì sẽ mất liên kết hồ sơ. Hãy tạo Full Backup để lưu đầy đủ trước khi chuyển máy."); return; } if (confirm("XÓA TOÀN BỘ dữ liệu? Không thể hoàn tác!\n(Tài khoản người dùng được giữ lại.)") && confirm("Chắc chắn chứ?")) { if (!backupOrBlock("truoc-xoa-toan-bo", "xóa toàn bộ dữ liệu")) return; var beforeDelete = db, wasDirty = dirty; db = { nguoidung: db.nguoidung, baomat: db.baomat, auditlog: JSON.parse(JSON.stringify(db.auditlog || [])) }; ensureTables(); audit("Xóa toàn bộ dữ liệu", "đã sao lưu trước khi xóa"); if (!saveNow()) { db = beforeDelete; dirty = wasDirty; alert("Chưa xóa dữ liệu: " + lastSaveError); return; } st.kq = null; render(); } }));
    c.appendChild(bar);
    c.appendChild(h("div", { class: "hint", text: "Hiện có — " + Object.keys(ALL).map(function (k) { return ALL[k].ten + ": " + countOf(k); }).join(" · ") }));
    // 012-A: một màn, 5 khu — mỗi chức năng chỉ xuất hiện MỘT lần: 1 Sao lưu ngay · 2 Khôi phục · 3 Tự sao lưu · 4 Thư mục · 5 Danh sách & kiểm tra; sau đó "Lưu trữ năm" và các mục khác
    var w = h("div"); w.appendChild(cardBackupNow()); w.appendChild(cardRestore()); var fbm = fbMsgBox(); if (fbm) w.appendChild(fbm);
    w.appendChild(cardSchedule()); w.appendChild(cardStorage()); w.appendChild(cardOffsite()); w.appendChild(cardBackups()); w.appendChild(cardYearArchive());
    w.appendChild(c); w.appendChild(cardCongTy()); if (can("system.admin")) w.appendChild(cardUsers()); w.appendChild(cardIntegrity()); w.appendChild(cardAudit());
    return w;
  }
  function cardYearArchive(){
    var card=h("section",{class:"card","data-year-archive":"1"},[h("h3",{text:"Kho hồ sơ theo năm"}),h("div",{class:"hint",text:"Chuyển năm cũ đã chốt ra khỏi dữ liệu đang làm để giảm dung lượng phải tải. Hồ sơ chỉ mở khi chọn năm, ở chế độ chỉ xem. Chứng từ gốc giữ nguyên trong kho; dùng Full Backup khi đổi máy."})]);
    if(!window.hakYears||!can("backup.restore"))return card;
    var body=h("div");card.appendChild(body);
    function clean(){if(dirty){saveNow();if(dirty){alert("Chưa lưu được dữ liệu đang làm; hãy xử lý lỗi lưu trước.");return false;}}return true;}
    function waiting(text){body.setAttribute("aria-busy","true");toast(text);}
    function show(result){body.removeAttribute("aria-busy");if(!result||!result.ok){alert(result&&result.error||"Không đọc được kho năm");return false;}return true;}
    window.hakYears.list().then(function(info){
      if(!show(info))return;
      body.appendChild(h("div",{class:"hint",text:"Dữ liệu đang làm: "+Math.round(info.activeBytes/1024)+" KB · "+info.years.length+" năm trong kho"}));
      var year=h("select",{"aria-label":"Năm cần lưu trữ"});info.candidates.forEach(function(y){year.appendChild(h("option",{value:String(y),text:String(y)}));});
      var controls=h("div",{class:"bar"},[year]);
      if(can("system.admin"))controls.appendChild(btn("Kiểm tra trước khi chuyển","",function(){
        if(!clean())return;
        waiting("Đang kiểm tra hồ sơ năm ở nền…");
        window.hakYears.preview(Number(year.value)).then(function(p){if(!show(p))return;
          var details=Object.keys(p.counts).map(function(t){return t+": "+p.counts[t];}).join("\n");
          if(!confirm("Chuyển hồ sơ năm "+p.year+" vào kho chỉ xem?\nKỳ: "+p.periods.join(", ")+"\n"+details+"\nDữ liệu đang làm dự kiến: "+Math.round(p.beforeBytes/1024)+" → "+Math.round(p.afterBytes/1024)+" KB.\nApp sẽ sao lưu và kiểm tra hồ sơ trước khi chuyển. Tiếp tục?"))return;
          waiting("Đang sao lưu, kiểm tra và chuyển hồ sơ năm… Vui lòng giữ ứng dụng mở.");
          window.hakYears.archive(p.year,p.token).then(function(r){if(show(r)){alert("Đã lưu trữ năm "+p.year+". Dữ liệu đang làm còn "+Math.round(r.afterBytes/1024)+" KB. App sẽ tải lại.");window.location.reload();}});
        });
      }));
      if(info.candidates.length)body.appendChild(controls);
      info.years.forEach(function(ref){
        var row=h("div",{class:"bar"},[h("b",{text:"Hồ sơ "+ref.year})]);
        row.appendChild(btn("Mở hồ sơ năm","",function(){openYear(ref.year);}));
        if(can("system.admin"))row.appendChild(btn("Đưa về vùng đang làm","ghost",function(){
          if(!clean())return;
          askText("Đưa hồ sơ về vùng đang làm","Lý do đưa hồ sơ năm "+ref.year+" về vùng đang làm? Các kỳ vẫn giữ trạng thái đã chốt.",{required:true},function(reason){
            if(!reason||!reason.trim())return;
            window.hakYears.list().then(function(fresh){if(!show(fresh))return;if(!confirm("Đưa toàn bộ hồ sơ năm "+ref.year+" về dữ liệu đang làm? Hệ thống sẽ sao lưu trước và không ghi đè khi có dữ liệu trùng."))return;window.hakYears.restore(ref.year,reason,fresh.token).then(function(r){if(show(r))window.location.reload();});});
          });
        }));body.appendChild(row);
      });
    }).catch(function(e){body.appendChild(h("div",{class:"warn",text:e.message}));});
    function openYear(y){
      var panel=h("div",{"data-year-view":"1"}),title=h("h4",{text:"Hồ sơ "+y+" · Chỉ xem"});panel.appendChild(title);
      var kind=h("select",{"aria-label":"Loại hồ sơ năm"}),period=h("select",{"aria-label":"Kỳ hồ sơ năm"}),page=0,rowsBox=h("div"),status=h("span",{class:"hint"});
      [["kyluong","Kỳ lương đã chốt"],["bangluong","Bảng lương đã chốt"],["chamcong","Chấm công"],["sanluong","Sản lượng"],["bandam","Ban dăm xuất hàng"],["psluong","Phát sinh lương"],["ungluong","Tạm ứng"],["tiencom","Suất cơm"],["kyluong_lichsu","Lịch sử chốt"]].forEach(function(x){kind.appendChild(h("option",{value:x[0],text:x[1]}));});
      function fill(r){rowsBox.replaceChildren();var cols=[];r.rows.forEach(function(row){Object.keys(row).forEach(function(k){if(k!=="_id"&&typeof row[k]!=="object"&&cols.indexOf(k)<0)cols.push(k);});});var t=h("table"),head=h("tr");cols.forEach(function(k){head.appendChild(h("th",{text:k}));});t.appendChild(h("thead",{},[head]));var tb=h("tbody");r.rows.forEach(function(row){var tr=h("tr");cols.forEach(function(k){tr.appendChild(h("td",{text:row[k]==null?"":String(row[k])}));});tb.appendChild(tr);});t.appendChild(tb);rowsBox.appendChild(h("div",{class:"tw"},[t]));status.textContent="Trang "+(page+1)+" · "+r.total+" dòng · 50 dòng/trang";}
      function load(){waiting("Đang mở trang hồ sơ năm…");if(kind.value==="bangluong"&&!period.value&&period.options.length>1)period.selectedIndex=1;window.hakYears.table(y,kind.value,period.value,page).then(function(r){if(show(r))fill(r);});}
      kind.addEventListener("change",function(){page=0;load();});period.addEventListener("change",function(){page=0;load();});
      var tools=h("div",{class:"bar"},[kind,period,btn("Trước","ghost",function(){if(page){page--;load();}}),btn("Sau","ghost",function(){page++;load();}),status]);
      if(can("export"))tools.appendChild(btn("Xuất Excel hồ sơ","",function(){window.hakYears.export(y,kind.value,period.value,"xlsx",page).then(function(r){if(show(r))toast("Đã lưu Excel hồ sơ: "+r.name);});}));
      if(can("export"))tools.appendChild(btn("In trang đang xem","ghost",function(){window.hakYears.export(y,kind.value,period.value,"pdf",page).then(function(r){if(show(r))toast("Đã lưu bản in: "+r.name);});}));
      tools.appendChild(btn("Đóng hồ sơ năm","ghost",function(){panel.remove();window.hakYears.release();}));
      panel.appendChild(tools);panel.appendChild(rowsBox);body.appendChild(panel);
      window.hakYears.table(y,"kyluong","",0).then(function(r){if(!show(r))return;period.appendChild(h("option",{value:"",text:"Cả năm"}));r.periods.forEach(function(ky){period.appendChild(h("option",{value:ky,text:ky}));});fill(r);});
    }
    return card;
  }
  // ---------- Khôi phục / sao lưu / kiểm tra dữ liệu ----------
  // opts.quarantine: cất file dữ liệu hỏng hiện tại (chỉ làm SAU khi người dùng đã xác nhận khôi phục)
  function restoreFromText(text, label, opts) {
    opts = opts || {};
    if (session && !need("backup.restore")) return opts.onCancel && opts.onCancel(); // màn hình khôi phục khi file hỏng: chưa đăng nhập được (xem RISK-05)
    var o;
    try { o = JSON.parse(text); } catch (e) { alert("File không phải dữ liệu hợp lệ (JSON lỗi)."); return opts.onCancel && opts.onCancel(); }
    if (!o || typeof o !== "object" || Array.isArray(o)) { alert("File không đúng cấu trúc dữ liệu của app."); return opts.onCancel && opts.onCancel(); }
    var known = Object.keys(ALL).concat(["kyluong", "nhansu", "congty"]).filter(function (k) { return Array.isArray(o[k]); });
    if (!known.length) { alert("File không chứa bảng dữ liệu nào của app — không khôi phục."); return opts.onCancel && opts.onCancel(); }
    var rep = SCH.validate(o, { tables: Object.keys(ALL), hrTables: Object.keys(HRT) });
    if (rep.fatal.length) { alert("KHÔNG khôi phục được — cấu trúc file không an toàn:\n- " + rep.fatal.join("\n- ")); return opts.onCancel && opts.onCancel(); }
    // So sánh các kỳ lương đã chốt: khôi phục bản cũ có thể làm MẤT bản chốt mới hơn
    var cur = loadError ? {} : chotSummary(db), nxt = chotSummary(o), diff = [];
    Object.keys(cur).forEach(function (k) { if (!nxt[k]) diff.push("MẤT bản chốt " + kyLabel(k) + " (" + cur[k] + ")"); else if (nxt[k] !== cur[k]) diff.push(kyLabel(k) + ": " + cur[k] + " → " + nxt[k]); });
    Object.keys(nxt).forEach(function (k) { if (!cur[k]) diff.push("Thêm bản chốt " + kyLabel(k) + " (" + nxt[k] + ")"); });
    if (!confirm("KHÔI PHỤC từ " + label + "\n\nFile này: " + summarize(o) + "\nHiện tại: " + (loadError ? "(không đọc được)" : summarize(db)) +
      (diff.length ? "\n\n⚠ KỲ LƯƠNG ĐÃ CHỐT thay đổi:\n- " + diff.join("\n- ") : "\n\nKỳ lương đã chốt: không thay đổi.") +
      (rep.errors.length ? "\n\n⚠ File có " + rep.errors.length + " vấn đề dữ liệu (xem Kiểm tra dữ liệu sau khi khôi phục)." : "") +
      "\n\nToàn bộ dữ liệu hiện tại sẽ được THAY THẾ. App sẽ tự sao lưu dữ liệu hiện tại trước khi khôi phục. Tiếp tục?")) return opts.onCancel && opts.onCancel();
    // P1: hộp thoại trên hứa "App sẽ tự sao lưu dữ liệu hiện tại trước khi khôi phục" — khác với nhập
    // Excel/mở chốt/gộp chấm công (có "before" + hoàn tác riêng), một khi đã ghi đè `db` và saveNow()
    // thành công thì KHÔNG còn đường nào lấy lại dữ liệu hiện tại ngoài chính bản sao lưu này — nên
    // CHẶN CỨNG nếu không tạo được, đúng với lời hứa đã đưa ra.
    if (opts.quarantine && store && store.quarantine) store.quarantine();
    else if (!readOnly && !backupOrBlock("truoc-khoi-phuc", "khôi phục dữ liệu")) return opts.onCancel && opts.onCancel();
    var apply = function () {
      var prev = db, prevRO = readOnly, prevErr = loadError, prevSession = session, prevDirty = dirty;
      var revert = function (why, writeBack) {
        db = prev; readOnly = prevRO; loadError = prevErr; session = prevSession;
        try { ensureTables(); } catch (e0) { /* giữ nguyên */ }
        st.kq = null; st.kqStale = true; dirty = prevDirty;
        if (writeBack && !saveNow()) why += "\nKhông ghi lại được dữ liệu trước khôi phục: " + lastSaveError;
        render();
        if (opts.onFail) opts.onFail(why); else alert(why);
      };
      // File chỉ có bảng dữ liệu (xuất/nhập bảng, không phải Full Backup) thì không có tài khoản/công ty/nhật ký.
      // Chỉ lấy phần của máy khi FILE KHÔNG CÓ (file bản sao lưu đầy đủ thì dùng nguyên tài khoản/nhật ký trong file — cài lại Windows không mất).
      if (prev && !prevErr) ["nguoidung", "baomat", "congty", "auditlog", "kyluong", "kyluong_lichsu", "ttluong"].forEach(function (k) { if (o[k] === undefined && prev[k] !== undefined) o[k] = JSON.parse(JSON.stringify(prev[k])); });
      try { db = o; var mm = HRM.migrate(db).concat(INT.normalizeDataset(db).messages, cleanImportedData(db)); readOnly = false; loadError = null; ensureTables(); }
      catch (e) { db = prev; readOnly = prevRO; loadError = prevErr; render(); if (opts.onFail) opts.onFail("Không nạp được dữ liệu: " + e.message); else alert("Không khôi phục được: " + e.message); return; }
      // Tài khoản lấy theo dữ liệu vừa khôi phục: người đang đăng nhập phải có trong đó, nếu không phải đăng nhập lại
      var me = session && PERM.findUser(db, session.tenDangNhap);
      session = me && !me.khoa ? me : null;
      audit("Khôi phục dữ liệu", label + (diff.length ? " — kỳ chốt thay đổi: " + diff.join("; ") : ""));
      if (!saveNow()) {
        revert("KHÔI PHỤC KHÔNG THÀNH CÔNG — chưa xác nhận ghi được xuống đĩa. Đã trả lại dữ liệu trước khôi phục trên giao diện.\n\nLý do: " + (lastSaveError || "Nơi lưu không xác nhận thành công"), false);
        return;
      }
      var fin = function () { st.kq = null; st.tab = "home"; render(); toast("Đã khôi phục từ " + label); if (mm.length) alert(mm.join("\n")); if (opts.after) opts.after(); };
      if (opts.verify) opts.verify().then(function (r) { if (r && r.ok) fin(); else revert((r && r.msg) || "Kiểm tra sau khôi phục không đạt", true); }, function (e) { revert(String(e && e.message || e), true); });
      else fin();
    };
    if (opts.prepare) opts.prepare().then(function (r) { if (r && r.ok) apply(); else if (opts.onFail) opts.onFail((r && r.msg) || "Không chuẩn bị được"); }, function (e) { if (opts.onFail) opts.onFail(String(e && e.message || e)); });
    else apply();
  }
  /** Lịch sao lưu tự động (α17) — cấu hình theo máy; chỉ Admin đổi được */
  function cardSchedule() {
    var c = h("div", { class: "card", "data-schedule": "1" });
    c.appendChild(h("h3", { text: "3 · 🕘 Tự sao lưu (SQLite) — Lịch sao lưu tự động" }));
    if (!store || !store.scheduleGet) { c.appendChild(h("div", { class: "hint", text: "Chỉ có trong bản cài (.exe). Bản chạy trình duyệt: dùng Sao lưu toàn bộ → JSON ở mục 1." })); return c; }
    var sc = store.scheduleGet() || {}, admin = can("system.admin");
    c.appendChild(h("div", { class: "hint", text: "Luôn có: sao lưu mỗi lần mở app, đầu mỗi ngày, trước thao tác lớn, sau chốt kỳ. Thêm dưới đây (chỉ khi dữ liệu ĐÃ THAY ĐỔI so với bản sao lưu gần nhất, không tạo bản trùng). App chạy offline nên chỉ sao lưu được khi app đang mở. Có thư mục thứ hai thì bản mới cũng tự chép sang." }));
    var set = function (o, msg) { var r = store.scheduleSet(o); if (r && r.ok) { audit("Đổi lịch sao lưu", msg); toast("Đã lưu lịch sao lưu: " + msg); } else alert("⚠ " + ((r && r.error) || "Không lưu được")); render(); };
    var sel = function (vals, cur, lab, on) { var s0 = h("select", { class: "i" }); vals.forEach(function (v) { var o = h("option", { value: String(v), text: lab(v) }); if (v === cur) o.selected = true; s0.appendChild(o); }); s0.disabled = !admin; s0.addEventListener("change", function () { on(+s0.value); }); return s0; };
    var hLab = function (v) { return v ? "Mỗi " + v + " giờ" : "Tắt"; }, dLab = function (v) { return v + " ngày"; };
    var every = sel([0, 1, 2, 4, 8], sc.everyHours, hLab, function (v) { set({ everyHours: v }, "định kỳ " + hLab(v).toLowerCase()); });
    var keep = sel([30, 60, 90, 180, 365], sc.keepDaily, dLab, function (v) { set({ keepDaily: v }, "giữ bản đầu ngày " + dLab(v)); });
    var cb = h("input", { type: "checkbox" }); cb.checked = !!sc.onClose; cb.disabled = !admin;
    cb.addEventListener("change", function () { set({ onClose: cb.checked }, cb.checked ? "sao lưu khi đóng app" : "không sao lưu khi đóng app"); });
    var g = h("div", { class: "schedg" }, [
      h("div", { class: "fld" }, [h("label", { text: "Sao lưu định kỳ khi app đang mở" }), every]),
      h("div", { class: "fld" }, [h("label", { text: "Giữ bản sao lưu đầu ngày" }), keep]),
      h("div", { class: "fld" }, [h("label", { text: "Khi đóng app" }), h("label", { class: "schk" }, [cb, h("span", { text: "Sao lưu khi đóng app" })])])]);
    c.appendChild(g);
    c.appendChild(h("div", { class: "hint", text: "Lần kiểm tra định kỳ gần nhất: " + (sc.lastAuto ? fmtTime(sc.lastAuto) : "chưa có") + " · Bản định kỳ giữ 48 bản, bản khi đóng app giữ 10 bản gần nhất." + (admin ? "" : " Chỉ Admin đổi được lịch.") }));
    return c;
  }
  function cardOffsite() {
    var c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "🛡 Sao lưu ra ngoài máy — trạng thái chép (thư mục chọn ở mục 4)" }));
    if (!store || !store.backupStatus) { c.appendChild(h("div", { class: "hint", text: "Chỉ có trong bản cài (.exe). Bản chạy trình duyệt: dùng Sao lưu toàn bộ → JSON ở mục 1." })); return c; }
    var bs = store.backupStatus() || {};
    c.appendChild(h("div", { class: "hint", text: "Chọn 1 thư mục KHÁC ổ đĩa của máy này: USB, ổ cứng ngoài, ổ mạng (NAS) hoặc thư mục Google Drive đã đồng bộ. Mỗi bản sao lưu (đầu ngày, trước thao tác lớn, sau chốt kỳ…) sẽ tự chép sang thư mục con 'TinhLuongHAK-SaoLuu' và được kiểm tra SHA-256. Bản sau chốt kỳ được giữ vĩnh viễn." }));
    var rows = [
      ["Thư mục thứ hai", bs.mirrorDir || "— chưa chọn —"],
      ["Lần chép tốt gần nhất", bs.lastMirrorOk ? fmtTime(bs.lastMirrorOk) : "—"],
      ["Lần sao lưu ra ngoài gần nhất", bs.lastExternal ? fmtTime(bs.lastExternal) + (bs.daysSinceExternal != null ? " (" + bs.daysSinceExternal + " ngày trước)" : "") : "chưa có"],
      ["Bản sao lưu sau chốt kỳ (giữ vĩnh viễn)", String(bs.permanent || 0)]];
    var t = h("table"), tb = h("tbody"); rows.forEach(function (r) { tb.appendChild(h("tr", {}, [h("td", { class: "t", text: r[0] }), h("td", { class: "t", text: r[1] })])); }); t.appendChild(tb); c.appendChild(t);
    if (bs.lastMirrorError) c.appendChild(h("div", { class: "warn", text: "⚠ Lần chép gần nhất bị lỗi: " + bs.lastMirrorError }));
    var bar = h("div", { class: "bar" });
    if (bs.mirrorDir && can("backup.restore")) bar.appendChild(btn("⇪ Chép sang thư mục thứ hai ngay", "", function () {
      var r = store.mirrorSync(); if (r && r.ok) toast("Đã chép " + (r.copied || 0) + " bản sao lưu"); else alert("⚠ " + ((r && r.error) || "Không chép được")); render();
    }));
    c.appendChild(bar);
    return c;
  }
  /** Full Backup (GĐ5): 1 gói ZIP gồm dữ liệu + chứng từ gốc + manifest SHA-256. Khôi phục qua bước kiểm tra, chứng từ chỉ thêm không ghi đè. */
  var STG = { data: null, busy: false, msg: null };
  /** Cài đặt "Lưu trữ & Sao lưu": 4 thư mục. Đổi = chép + kiểm SHA-256 rồi mới chuyển; không xóa dữ liệu cũ. */
  function cardStorage() {
    var c = h("div", { class: "card", "data-card": "storage" });
    c.appendChild(h("h3", { text: "4 · 🗂 Thư mục sao lưu & lưu trữ (một bảng duy nhất)" }));
    if (!window.hakPaths) { c.appendChild(h("div", { class: "hint", text: "Chỉ có trong bản cài (.exe)." })); return c; }
    if (!STG.data) { window.hakPaths.get().then(function (r) { if (r && r.ok) { STG.data = r; if (st.tab === "backup") render(); } }); c.appendChild(h("div", { class: "hint", text: "Đang đọc cấu hình…" })); return c; }
    c.appendChild(h("div", { class: "hint", text: "Bấm \"Đổi…\" để chọn thư mục mới. App chép toàn bộ dữ liệu sang thư mục mới, kiểm tra SHA-256 từng file, chỉ khi đạt mới chuyển; dữ liệu cũ KHÔNG bị xóa. Chỉ Admin / người có quyền khôi phục thao tác được." }));
    if (!STG.json && window.hakJson) { window.hakJson.get().then(function (r) { if (r && r.ok) { STG.json = r; if (st.tab === "backup") render(); } }); }
    if (!STG.info) { window.hakPaths.info().then(function (r) { if (r && r.ok) { STG.info = r.info; STG.exportDir = r.exportDir; if (st.tab === "backup") render(); } }); }
    var fmtB = function (n) { return n >= 1073741824 ? (n / 1073741824).toFixed(2) + " GB" : n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.ceil(n / 1024) + " KB"; };
    var t = h("table", { class: "t" });
    t.appendChild(h("tr", {}, ["Thư mục", "Đường dẫn hiện tại", "Dung lượng", "Thao tác"].map(function (x) { return h("th", { text: x }); })));
    var KS = [["sqlite", "Sao lưu SQLite (các bản tự động + bấm Sao lưu)"], ["json", "Sao lưu JSON"], ["backup", "Full Backup (có chứng từ, OCR)"], ["mirror", "Dự phòng ngoài máy (USB / NAS / Drive)"], ["docs", "Chứng từ gốc"], ["ocrLib", "Thư viện mẫu OCR"], ["export", "Thư mục xuất file"]];
    KS.forEach(function (kk) {
      var k = kk[0], movable = k !== "export" && k !== "sqlite", inf = STG.info && STG.info[k];
      var verify = STG.ver && STG.ver[k];
      var acts = h("td", {}, [h("div", { style: "display:flex;flex-wrap:wrap;gap:4px" }, [
        movable ? btn("Chọn / Chuyển…", "ghost", function () {
          if (!need("backup.restore", "đổi thư mục lưu trữ") || STG.busy) return;
          window.hakPaths.pick(k).then(function (p) {
            if (!p || !p.ok) return;
            if (!confirm("Chuyển \"" + kk[1] + "\" sang:\n" + p.dir + "\n\nDữ liệu sẽ được CHÉP và kiểm tra SHA-256, kho mới được mở thử trước khi đổi cấu hình; dữ liệu cũ vẫn giữ nguyên. Tiếp tục?")) return;
            STG.busy = true; toast("Đang chép và kiểm tra dữ liệu…");
            (k === "json" ? window.hakJson.setDir(p.dir) : window.hakPaths.move(k, p.dir)).then(function (r) {
              if (k === "mirror" && r && r.ok && store && store.mirrorSync) { var ms = store.mirrorSync(); if (ms && ms.ok) r.note = (r.note || "") + " Đã chép " + (ms.copied || 0) + " bản sao lưu sang thư mục dự phòng."; }
              STG.busy = false; STG.data = null; STG.info = null; STG.ver = null; STG.json = null;
              STG.msg = r && r.ok ? { bad: false, text: "✓ Đã chuyển " + r.files + " file sang " + r.to + " (đã kiểm SHA-256). " + r.note } : { bad: true, text: "⚠ " + ((r && r.error) || "không chuyển được") + " — giữ nguyên thư mục cũ" };
              audit("Đổi thư mục lưu trữ", k + " → " + p.dir + " · " + (r && r.ok ? "đạt" : "không đạt")); render();
            });
          });
        }, "Chọn thư mục mới và chuyển dữ liệu sang (chép + kiểm SHA-256, không xóa dữ liệu cũ)") : null,
        k === "mirror" && STG.data.paths.mirror && can("system.admin") ? btn("Bỏ thư mục dự phòng", "ghost", function () { if (!confirm("Bỏ thư mục sao lưu dự phòng? (Các bản đã chép ở đó vẫn giữ nguyên)")) return; store.mirrorClear(); audit("Bỏ thư mục sao lưu dự phòng", STG.data.paths.mirror); STG.data = null; STG.info = null; render(); }, "Ngừng chép sang thư mục dự phòng") : null,
        btn("Mở", "ghost", function () { window.hakPaths.open(k).then(function (r) { if (!r || !r.ok) toast("⚠ " + ((r && r.error) || "không mở được")); }); }, "Mở thư mục trong Windows Explorer"),
        btn("Kiểm tra", "ghost", function () {
          STG.ver = STG.ver || {}; STG.ver[k] = { text: "Đang kiểm tra…" }; render();
          window.hakPaths.verify(k).then(function (r) { STG.ver[k] = r && r.ok ? { good: r.good, text: r.text } : { good: false, text: (r && r.error) || "lỗi" }; render(); });
        }, "Kiểm tra toàn vẹn (chỉ đọc, không sửa gì)"),
        btn("↻ Dung lượng", "ghost", function () { STG.info = null; render(); })])]);
      t.appendChild(h("tr", { "data-stg": k }, [h("td", { text: kk[1] }), h("td", { text: (k === "mirror" ? (STG.data.paths.mirror || "(chưa chọn)") : k === "export" ? STG.exportDir || "(thư mục xuất file mặc định)" : k === "sqlite" ? ((store && store.info && store.info().backupDir) || "…") : k === "json" ? (STG.json ? STG.json.dir : "…") : STG.data.paths[k]), style: "word-break:break-all" }),
        h("td", { text: inf ? (inf.exists ? inf.files + " file · " + fmtB(inf.bytes) + (inf.free != null ? " · trống " + fmtB(inf.free) : "") : "chưa tạo") : "…" }),
        acts]));
      if (k === "sqlite") t.appendChild(h("tr", {}, [h("td"), h("td", { colspan: 3, class: "hint", "data-stg-note": "sqlite", text: "Cố định trong thư mục dữ liệu; muốn có bản ở nơi khác hãy đặt Thư mục dự phòng" })])); // CEO chọn (a) ở #113: thư mục SQLite chỉ xem/mở/kiểm
      if (verify) t.appendChild(h("tr", {}, [h("td"), h("td", { colspan: 3, class: verify.good === false ? "warn" : "ok", "data-stg-verify": k, text: (verify.good === false ? "✕ " : verify.good ? "✓ " : "") + verify.text })]));
    });
    c.appendChild(h("div", { style: "overflow-x:auto;max-width:100%" }, [t])); // cửa sổ hẹp: bảng cuộn ngang, không tràn khỏi khung
    if (STG.msg) c.appendChild(h("div", { class: STG.msg.bad ? "warn" : "ok", "data-stg-msg": "1", text: STG.msg.text }));
    return c;
  }
  /** Tạo Full Backup (gói .zip: dữ liệu + chứng từ gốc + thư viện OCR + manifest SHA-256). Gọi từ khu 1 "Sao lưu ngay". */
  function fullCreate() {
        if (!need("backup.restore", "tạo Full Backup")) return;
        if (st.fbBusy) { toast("Đang tạo Full Backup — chờ xong hoặc bấm Hủy"); return; } // V9: chống chạy 2 lần
        if (!saveNow()) { alert("Chưa lưu được dữ liệu hiện tại xuống đĩa — không tạo Full Backup."); return; }
        askPassword("Bảo vệ gói sao lưu bằng mật khẩu", "Nhập mật khẩu để MÃ HÓA gói Full Backup (AES-256), hoặc bỏ trống để tạo gói không mã hóa.\nAPP KHÔNG LƯU mật khẩu — mất mật khẩu thì không mở lại được gói. Hãy ghi mật khẩu ở nơi an toàn, tách khỏi gói.", { optional: true, confirm: true, check: function (v) { return pwWeak(v); }, okText: "Tạo Full Backup" }, function (pw) {
        st.fbBusy = true; st.fbMsg = { text: "Đang đóng gói…" }; render();
        var offProg = window.hakFull.onProgress ? window.hakFull.onProgress(function (m) { var tx = "Đang đóng gói… " + ((m && m.text) || m || ""); st.fbMsg = { text: tx }; var el = document.querySelector("[data-fb-msg]"); if (el) el.textContent = tx; }) : null;
        window.hakFull.create({ user: currentUser(), password: pw }).then(function (r) {
          if (r && r.status === "FAILED" && r.missing && r.missing.length) {
            // thiếu/hỏng thành phần: KHÔNG tạo Full Backup; chỉ tạo gói PARTIAL khi người dùng xác nhận rõ ràng
            var list = r.missing.slice(0, 15).map(function (x) { return "• " + x.kind + " " + x.id + (x.name ? " (" + x.name + ")" : "") + " — " + x.problem; }).join("\n");
            if (confirm("KHÔNG thể tạo Full Backup đầy đủ — thiếu/hỏng " + r.missing.length + " thành phần:\n" + list + (r.missing.length > 15 ? "\n…" : "") + "\n\nBạn có thể tạo gói SAO LƯU MỘT PHẦN (PARTIAL): chỉ gồm phần còn nguyên vẹn, KHÔNG tính là Full Backup, không thay được bản sao lưu đầy đủ.\n\nTạo gói một phần?")) {
              return window.hakFull.create({ user: currentUser(), allowPartial: true, password: pw });
            }
          }
          return r;
        }).then(function (r) {
          if (!r || (!r.ok && r.status !== "PARTIAL")) { st.fbMsg = { bad: true, text: "⚠ " + (r && r.status === "CANCELLED" ? "Đã hủy sao lưu." : "KHÔNG tạo được Full Backup: " + ((r && r.error) || "lỗi không rõ")) }; }
          else if (r.status === "PARTIAL") { audit("Tạo gói sao lưu MỘT PHẦN", r.name + " · thiếu " + r.missing.length + " thành phần"); save(); st.fbMsg = { bad: true, text: "⚠ Đã tạo gói MỘT PHẦN " + r.name + " — KHÔNG phải Full Backup. Thiếu: " + r.missing.map(function (x) { return x.kind + " " + x.id; }).join(", ") }; }
          else { audit("Tạo Full Backup", r.name + " · " + r.docs + " chứng từ · SHA-256 " + r.sha256.slice(0, 12) + "…"); save(); st.fbMsg = { text: "✓ Full Backup ĐẦY ĐỦ " + (r.encrypted ? "🔒 (ĐÃ MÃ HÓA) " : "") + r.name + " (" + Math.round(r.size / 1024) + " KB, " + r.docs + " chứng từ, " + (r.ocrSamples || 0) + " mẫu OCR, " + (r.yearArchives || 0) + " gói hồ sơ năm) trong thư mục xuất file" + (r.mirrored ? " và chép sang " + r.mirrored : "") + (r.warnings.length ? " — ⚠ " + r.warnings.join("; ") : "") + ". SHA-256: " + r.sha256 }; }
          render();
        }, function (e) { st.fbMsg = { bad: true, text: "⚠ " + e.message }; render(); }).then(function () { st.fbBusy = false; if (offProg) offProg(); render(); });
        });
  }
  /** Khôi phục từ gói Full Backup (.zip / .hakenc): kiểm tra → xác nhận → ghi. Gọi từ khu 2 "Khôi phục". */
  function fullRestore() {
        if (!need("backup.restore")) return;
        var fail = function (msg) { st.fbMsg = { bad: true, text: msg }; render(); alert(msg); };
        var run = function (acceptPartial, pw, retry) {
          window.hakFull.stage({ acceptPartial: !!acceptPartial, password: pw }).then(function (r) {
            if (r && r.cancelled) return;
            if (r && (r.needPassword || r.wrongPassword)) { // gói mã hóa (.hakenc): hỏi mật khẩu; sai thì hỏi lại, không ghi gì
              askPassword("Gói sao lưu được mã hóa", (r.wrongPassword ? "⚠ Sai mật khẩu hoặc gói đã bị sửa. Nhập lại.\n" : "") + "Nhập mật khẩu đã dùng khi tạo gói. Gói được giải mã vào thư mục tạm, kiểm tra xong sẽ xóa bản giải mã.", { okText: "Mở gói" }, function (p) { run(acceptPartial, p); });
              return;
            }
            if (r && r.needsPartialAck) {
              if (confirm("Gói này là SAO LƯU MỘT PHẦN (không phải Full Backup). Thiếu:\n" + (r.missing || []).map(function (x) { return "• " + x.kind + " " + x.id + " — " + x.problem; }).join("\n") + "\n\nVẫn tiếp tục khôi phục phần có trong gói?")) run(true);
              return;
            }
            if (!r || !r.ok) { st.fbMsg = { bad: true, text: "⚠ Gói KHÔNG đạt kiểm tra (" + ((r && r.phase) || "") + ") — chưa ghi gì: " + ((r && (r.error || (r.problems || []).join("; "))) || "lỗi không rõ") }; render(); return; }
            var cnt = { new: 0, same: 0, conflict: 0 }; (r.docs || []).forEach(function (d) { cnt[d.state] = (cnt[d.state] || 0) + 1; });
            var info = "Gói " + r.label + " — tạo " + fmtTime(r.manifest.createdAt) + (r.manifest.createdBy ? " bởi " + r.manifest.createdBy : "") + (r.partial ? " · ⚠ GÓI MỘT PHẦN" : "") + ".\n" +
              r.phases.map(function (p) { return "✓ " + p.name + ": " + p.detail; }).join("\n") +
              "\nChứng từ: " + cnt.new + " mới sẽ được thêm, " + cnt.same + " đã có sẵn, " + cnt.conflict + " trùng mã nhưng khác nội dung (giữ bản đang có, không ghi đè)." + (r.warnings && r.warnings.length ? "\n⚠ " + r.warnings.join("\n⚠ ") : "");
            if (!confirm(info + "\n\nGói đã được giải nén & kiểm tra ở thư mục tạm, CHƯA ghi gì vào dữ liệu đang chạy. Tiếp tục sang bước ghi?")) { window.hakFull.discard(r.rid); return; }
            restoreFromText(r.text, "Full Backup " + r.label, {
              strict: true,
              // COMMIT tài sản (chứng từ + thư viện OCR, có nhật ký hoàn tác) chạy SAU xác nhận & sao lưu "trước khôi phục" và TRƯỚC khi thay dữ liệu lương
              prepare: function () {
                return window.hakFull.commit(r.rid).then(function (c) { if (c && c.ok) r._commit = c; return c && c.ok ? { ok: true } : { ok: false, msg: "Không ghi được chứng từ/thư viện OCR: " + ((c && c.error) || "lỗi không rõ") }; });
              },
              verify: function () { // POSTCHECK sau khi dữ liệu lương đã ghi xuống đĩa
                return window.hakFull.postcheck(r.rid).then(function (p) { return p && p.ok ? { ok: true } : { ok: false, msg: "Kiểm tra sau khôi phục KHÔNG đạt: " + ((p && p.checks) || []).filter(function (k) { return !k.ok; }).map(function (k) { return k.name + " (" + k.detail + ")"; }).join("; ") }; });
              },
              onCancel: function () { window.hakFull.discard(r.rid); },
              onFail: function (why) { window.hakFull.rollback(r.rid).then(function () { fail("⚠ Khôi phục KHÔNG hoàn tất — đã hoàn tác, dữ liệu như trước khi khôi phục. Lý do: " + why); }); },
              after: function () {
                window.hakFull.finish(r.rid).then(function () {
                  var d = (r._commit || {}).docs || { added: 0, same: 0, conflict: [] }, o2 = (r._commit || {}).ocr;
                  st.fbMsg = { bad: (d.conflict || []).length > 0, text: "✓ Khôi phục xong. Chứng từ: thêm " + d.added + ", đã có " + d.same + ((d.conflict || []).length ? ", TRÙNG MÃ KHÁC NỘI DUNG (giữ bản cũ): " + d.conflict.join(", ") : "") + (o2 ? ". Thư viện mẫu OCR: thêm " + o2.addedSamples + " mẫu, " + o2.addedEdits + " lần sửa" : "") + (r.partial ? ". ⚠ Đây là gói MỘT PHẦN." : "") + ". Đã kiểm tra mở lại nhân viên, bảng chấm công, kỳ lương, chứng từ, mẫu OCR." };
                  audit("Khôi phục Full Backup", st.fbMsg.text); save(); render(); if (st.fbMsg.bad) alert(st.fbMsg.text); else toast(st.fbMsg.text);
                });
              }
            });
          });
        };
        run(false);
  }
  /** Sao lưu JSON: ghi vào THƯ MỤC JSON đã đặt (tên có ngày giờ); bản chạy trình duyệt (không có app) mới dùng hộp thoại tải về. */
  function jsonBackup(viaDownload) {
    if (!need("backup.restore", "sao lưu toàn bộ dữ liệu ra file")) return;
    if (viaDownload || !window.hakJson) { download("LuongHAK_backup_" + HRM.today() + ".json", "application/json", JSON.stringify(db)); audit("Sao lưu ra file", viaDownload ? "lưu vào chỗ khác" : ""); if (store && store.noteExternal) store.noteExternal(); return; }
    if (!saveNow()) { alert("Chưa lưu được dữ liệu hiện tại xuống đĩa — không sao lưu JSON."); return; }
    window.hakJson.backup().then(function (r) {
      if (r && r.ok) { audit("Sao lưu JSON", r.name); st.fbMsg = { text: "✓ Đã ghi " + r.name + " (" + Math.round(r.size / 1024) + " KB) vào " + r.dir + " · SHA-256 " + r.sha256.slice(0, 12) + "… — chỉ có DỮ LIỆU, không có chứng từ gốc và thư viện mẫu OCR (muốn đủ: chọn Full Backup)." }; }
      else st.fbMsg = { bad: true, text: "⚠ KHÔNG ghi được file JSON: " + ((r && r.error) || "lỗi không rõ") };
      render();
    });
  }
  /** Khôi phục từ file JSON (hộp thoại chọn file) — kiểm tra + xác nhận nằm trong restoreFromText. */
  function jsonRestore() {
    if (!need("backup.restore")) return;
    var f = h("input", { type: "file", accept: ".json" });
    f.addEventListener("change", function () { var fr = new FileReader(); fr.onload = function () { restoreFromText(fr.result, f.files[0].name); }; fr.readAsText(f.files[0]); });
    f.click();
  }
  // ===== 012-B2 (issue #113): SAO LƯU / KHÔI PHỤC THEO KỲ LƯƠNG — giao diện trên lõi HAKCore.repo.period (012-B1) =====
  function periodBackup() {
    if (!need("backup.restore", "sao lưu kỳ lương")) return;
    if (!window.hakPeriod) { alert("Sao lưu kỳ lương chỉ có trong bản cài (.exe)."); return; }
    var ky = kyStr();
    var go = function (pw) {
      if (dirty && !saveNow()) { alert("⚠ Chưa lưu được dữ liệu đang sửa — chưa tạo gói kỳ " + ky + "."); return; }
      window.hakPeriod.create({ ky: ky, user: session ? session.tenDangNhap : "", password: pw || "" }).then(function (r) {
        if (r && r.ok) { audit("Sao lưu kỳ lương", ky + " → " + r.name + (r.encrypted ? " (có mật khẩu)" : "")); save(); st.fbMsg = { text: "✓ Đã tạo gói kỳ " + ky + ": " + r.name + " (" + Math.max(1, Math.round((r.size || 0) / 1024)) + " KB) trong thư mục Full Backup ở mục 4." }; }
        else st.fbMsg = { bad: true, text: "⚠ Không tạo được gói kỳ " + ky + ": " + ((r && r.error) || "không rõ lý do") };
        render();
      }, function (e) { st.fbMsg = { bad: true, text: "⚠ Không tạo được gói kỳ: " + String(e && e.message || e) }; render(); });
    };
    if (st.kyPw) askText("Mật khẩu cho gói kỳ " + ky, "Mất mật khẩu = không mở được gói (không có cửa hậu). Tối thiểu 10 ký tự, kết hợp ít nhất 2 loại: chữ thường, chữ hoa, số, ký tự đặc biệt.", { type: "password", required: true, label: "Mật khẩu" }, go);
    else go("");
  }
  function periodRestore(name, pw) {
    if (!need("backup.restore")) return;
    if (!window.hakPeriod) { alert("Khôi phục kỳ lương chỉ có trong bản cài (.exe)."); return; }
    window.hakPeriod.inspect(name || "", pw || "").then(function (r) {
      if (!r || r.cancelled) return;
      if (r.needPassword || r.wrongPassword) return askText("Gói kỳ có mật khẩu", r.wrongPassword ? "Mật khẩu chưa đúng. Nhập lại:" : "Gói được mã hóa. Nhập mật khẩu đã đặt khi sao lưu:", { type: "password", required: true, label: "Mật khẩu" }, function (p) { periodRestore(":last", p); });
      if (!r.ok) { alert("⛔ Không dùng được gói kỳ: " + (r.error || "không rõ lý do") + "\n\nDữ liệu hiện tại KHÔNG bị thay đổi."); return; }
      periodPreview(r, { allowDelete: false, confirmReclose: false, ackGlobal: false });
    }, function (e) { alert("⛔ Không đọc được gói kỳ: " + String(e && e.message || e)); });
  }
  /** Màn xem trước: mọi thay đổi cũ → mới, ô "cho phép xóa" TẮT sẵn, hàng bị chặn xóa (đỏ), cảnh báo chốt lại kỳ và ảnh hưởng kỳ khác — mỗi cảnh báo có ô xác nhận riêng. */
  function periodPreview(r, opt) {
    var P = window.HAKCore.repo.period, ky = r.manifest && r.manifest.ky, plan = P.plan(db, r.payload, ky, { allowDelete: opt.allowDelete });
    var body = h("div", { "data-ky-preview": "1" }), redraw = function () { periodPreview(r, opt); };
    body.appendChild(h("div", { class: "hint", text: "Gói: " + (r.label || "") + " · kỳ " + ky + " · tạo lúc " + ((r.manifest && r.manifest.tao) || "?") + " · bản app " + ((r.manifest && r.manifest.phienBanApp) || "?") + (r.encrypted ? " · có mật khẩu" : "") }));
    if (!plan.ok) {
      body.appendChild(h("div", { class: "warn", "data-ky-blocked": "1", text: "⛔ " + (plan.blocked || plan.errors.join(" ")) }));
      modal("Khôi phục kỳ " + ky + " — không thực hiện được", body, function (close) { return [btn("Đóng", "pri", close)]; }, { wide: true });
      return;
    }
    var rows = Object.keys(plan.period).map(function (t) { var x = plan.period[t]; return { "Bảng (phát sinh của kỳ)": (ALL[t] && ALL[t].ten) || t, "Ở máy (sẽ thay)": x.before, "Trong gói": x.after }; });
    body.appendChild(h("div", { class: "fh", text: "1. Dữ liệu phát sinh của kỳ " + ky + " — thay toàn bộ; các kỳ khác KHÔNG đổi" }));
    body.appendChild(rows.length ? simpleTable(rows) : h("div", { class: "hint", text: "Gói và máy đều không có dữ liệu phát sinh của kỳ này." }));
    var chg = [];
    Object.keys(plan.global).forEach(function (t) {
      var g = plan.global[t], ten = (HRT && HRT[t] && HRT[t].ten) || (ALL[t] && ALL[t].ten) || t;
      g.add.forEach(function (x) { chg.push({ "Bảng": ten, "Thay đổi": "Thêm", "Dòng": canonShort(x), "Cũ → mới": "" }); });
      g.change.forEach(function (c) { chg.push({ "Bảng": ten, "Thay đổi": "Sửa", "Dòng": String(c.key), "Cũ → mới": c.fields.map(function (f) { return f + ": " + shortV(c.before[f]) + " → " + shortV(c.after[f]); }).join("; ") }); });
    });
    body.appendChild(h("div", { class: "fh", text: "2. Nhân sự, danh mục, công thức — GHI ĐÈ theo gói: thêm " + plan.counts.add + ", sửa " + plan.counts.change }));
    body.appendChild(chg.length ? h("div", { "data-ky-changes": String(chg.length) }, [simpleTable(chg.slice(0, 200))]) : h("div", { class: "hint", text: "Không có thay đổi." }));
    if (chg.length > 200) body.appendChild(h("div", { class: "hint", text: "… còn " + (chg.length - 200) + " thay đổi nữa." }));
    var nDel = plan.deletes.rows.length + plan.deletes.blocked.length;
    if (nDel) {
      body.appendChild(h("div", { class: "fh", text: "3. Có ở máy nhưng KHÔNG có trong gói: " + nDel + " hàng" }));
      var cbD = h("input", { type: "checkbox", "data-ky-allow-delete": "1" }); cbD.checked = !!opt.allowDelete; cbD.addEventListener("change", function () { opt.allowDelete = cbD.checked; redraw(); });
      body.appendChild(h("label", { class: "schk" }, [cbD, h("span", { text: "Cho phép XÓA " + plan.deletes.rows.length + " hàng không còn được dùng (mặc định: giữ lại)" })]));
      if (plan.deletes.blocked.length) body.appendChild(h("div", { class: "warn", "data-ky-del-blocked": String(plan.deletes.blocked.length), text: "Không bao giờ xóa (đang được dùng): " + plan.deletes.blocked.slice(0, 20).map(function (b) { return ((HRT && HRT[b.table] && HRT[b.table].ten) || b.table) + " " + canonShort(b.row) + " — " + b.reason; }).join(" · ") + (plan.deletes.blocked.length > 20 ? " …" : "") }));
    }
    if (plan.slOther.length) body.appendChild(h("div", { class: "hint", "data-ky-sl-other": String(plan.slOther.length), text: "Chuyển sản lượng TỪ kỳ " + ky + " sang kỳ khác (giữ nguyên ở máy): " + plan.slOther.map(function (s) { return s.id + " (" + s.status + ") — " + s.note; }).join(" · ") }));
    var cbR = null, cbG = null, needG = plan.counts.add + plan.counts.change + (opt.allowDelete ? plan.deletes.rows.length : 0) > 0;
    if (plan.reclose) { cbR = h("input", { type: "checkbox", "data-ky-confirm-reclose": "1" }); cbR.checked = !!opt.confirmReclose; cbR.addEventListener("change", function () { opt.confirmReclose = cbR.checked; }); body.appendChild(h("div", { class: "warn", "data-ky-reclose": "1" }, [h("div", { text: "⚠ Gói chứa BẢN CHỐT của kỳ " + ky + " (lúc sao lưu kỳ đã chốt). Ở máy kỳ đang MỞ." }), h("label", { class: "schk" }, [cbR, h("span", { text: "CHỐT LẠI kỳ bằng số liệu trong gói (bỏ trống = chỉ khôi phục dữ liệu, kỳ vẫn mở)" })])])); }
    if (needG) { cbG = h("input", { type: "checkbox", "data-ky-ack-global": "1" }); cbG.checked = !!opt.ackGlobal; cbG.addEventListener("change", function () { opt.ackGlobal = cbG.checked; }); body.appendChild(h("div", { class: "warn", "data-ky-warn-global": "1" }, [h("div", { text: "⚠ Nhân sự, danh mục, công thức được ghi đè theo gói" + (plan.otherOpenPeriods.length ? ": sẽ ảnh hưởng cả các kỳ khác CHƯA chốt (" + plan.otherOpenPeriods.join(", ") + ")" : "") + ". Kỳ đã chốt không đổi." }), h("label", { class: "schk" }, [cbG, h("span", { text: "Tôi đã xem các thay đổi ở mục 2" + (opt.allowDelete ? "–3" : "") + " và đồng ý ghi đè" })])])); }
    body.appendChild(h("div", { class: "hint", text: "Trước khi ghi, app tự SAO LƯU TOÀN BỘ dữ liệu hiện tại; nếu không sao lưu được thì dừng, không ghi gì." }));
    modal("Xem trước khôi phục kỳ " + ky, body, function (close) {
      var goBtn = btn("📥 Khôi phục kỳ " + ky, "pri", function () {
        if (cbG && !cbG.checked) { toast("Hãy tích ô xác nhận ghi đè nhân sự / danh mục / công thức"); return; }
        if (!backupOrBlock("truoc-khoi-phuc-ky", "khôi phục kỳ " + ky)) return;
        var fresh = P.plan(db, r.payload, ky, { allowDelete: opt.allowDelete }), res = null;
        var tables = P.PERIOD_TABLES.concat(Object.keys(fresh.global || {}));
        var ok = txn(tables, function () { res = P.apply(db, fresh, r.payload, { confirmReclose: !!(cbR && cbR.checked) }); if (!res.ok) throw new Error(res.error); audit("Khôi phục kỳ lương", res.audit + " · từ " + (r.label || "gói")); });
        close();
        if (ok) { st.fbMsg = { text: "✓ " + res.audit + ". Đã sao lưu toàn bộ trước khi khôi phục." }; toast("Đã khôi phục kỳ " + ky); }
        else st.fbMsg = { bad: true, text: "⛔ KHÔNG khôi phục được kỳ " + ky + ": " + (lastTxnError || "không rõ lý do") + ". Dữ liệu đã trả về như trước." };
        render();
      }, "Sao lưu toàn bộ rồi ghi theo gói");
      goBtn.setAttribute("data-ky-apply", "1");
      return [btn("Hủy", "", close), goBtn];
    }, { wide: true });
  }
  function canonShort(r) { var keys = Object.keys(r || {}).slice(0, 3); return keys.map(function (k) { return shortV(r[k]); }).join(" / "); }
  function shortV(v) { var s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return s.length > 40 ? s.slice(0, 39) + "…" : s; }
  var BK_HINT = {
    sqlite: "Tạo bản chụp .sqlite đã kiểm (toàn vẹn + khớp số dòng) kèm bản JSON đối chứng, ghi vào thư mục sao lưu SQLite ở mục 4. Mọi lần sao lưu tự động (định kỳ, khi đóng app, đầu ngày) cũng tạo bản chụp. Giữ 10 bản chụp gần nhất; bản sau chốt kỳ / theo năm giữ vĩnh viễn; tự chép sang thư mục dự phòng nếu đã đặt. Chỉ có DỮ LIỆU; chứng từ gốc và thư viện OCR nằm trong Full Backup.",
    full: "Một file .zip gồm TOÀN BỘ dữ liệu + chứng từ gốc + thư viện mẫu OCR + bảng kê SHA-256, có thể mã hóa (.hakenc). Dùng khi đổi máy / cài lại Windows. Gói được kiểm tra lại ngay sau khi tạo.",
    json: "File .json chỉ có DỮ LIỆU (nhân sự, hợp đồng, danh mục, công thức, cài đặt, người dùng, nhật ký) — KHÔNG có chứng từ gốc và thư viện OCR. Ghi vào thư mục sao lưu JSON ở mục 4."
  };
  /** Khu 1 — SAO LƯU NGAY (012-A): một nút, chọn loại. Phạm vi "Toàn bộ" = mọi bảng. */
  function cardBackupNow() {
    var c = h("div", { class: "card", "data-zone": "now", "data-fullbackup": "1" });
    c.appendChild(h("h3", { text: "1 · 💾 Sao lưu ngay — toàn bộ dữ liệu" }));
    var kinds = [];
    if (store && store.listBackups) kinds.push(["sqlite", "SQLite — bản chụp .sqlite đã kiểm + JSON đối chứng (mặc định)"]);
    if (window.hakFull) kinds.push(["full", "Full Backup .zip (có chứng từ gốc + thư viện OCR)"]);
    kinds.push(["json", "JSON (chỉ dữ liệu)"]);
    var cur = kinds.some(function (k) { return k[0] === st.bkKind; }) ? st.bkKind : kinds[0][0];
    var sel = h("select", { class: "i", "data-backup-kind": "1", "aria-label": "Loại sao lưu" }); kinds.forEach(function (k) { var o = h("option", { value: k[0], text: k[1] }); if (k[0] === cur) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", function () { st.bkKind = sel.value; render(); });
    var go = btn("💾 Sao lưu toàn bộ", "pri", function () {
      if (sel.value === "full") return fullCreate();
      if (sel.value === "json") return jsonBackup(false);
      if (!need("backup.restore", "tạo bản sao lưu")) return;
      var n = backupNow("thu-cong"), ss = n && store.snapshotStatus ? store.snapshotStatus() : null;
      // P1: backupNow() trả null cho cả "chưa có file dữ liệu" và "ghi thất bại" — phân biệt rõ bằng store.hasDataFile()
      toast(n ? "Đã tạo " + n : ((store && store.hasDataFile && store.hasDataFile()) ? "⚠ KHÔNG tạo được bản sao lưu — kiểm tra dung lượng đĩa / quyền ghi" : "Chưa có dữ liệu để sao lưu"));
      // Nơi lưu chính là SQLite: báo rõ có bản chụp .sqlite hay không (lỗi bản chụp không được im lặng)
      if (ss) st.fbMsg = ss.lastError ? { bad: true, text: "⚠ Đã tạo bản JSON " + n + " nhưng: " + ss.lastError } : ss.latest ? { text: "✓ Đã sao lưu: bản chụp " + ss.latest.name + " (" + ss.latest.records + " dòng, đã kiểm) + bản JSON " + n } : null;
      render();
    }, "Sao lưu theo loại đã chọn, ghi vào thư mục ở mục 4");
    go.setAttribute("data-backup-now", "1");
    var bar = h("div", { class: "bar" }, [sel, go]);
    if (st.fbBusy) bar.appendChild(btn("✕ Hủy sao lưu", "", function () { window.hakFull.cancel().then(function (r) { toast(r && r.ok ? "Đang hủy…" : (r && r.error) || "Không hủy được"); }); }, "Dừng đóng gói; file tạm được xóa, dữ liệu không đổi"));
    if (cur === "json" && window.hakJson) bar.appendChild(btn("Lưu vào chỗ khác…", "ghost", function () { jsonBackup(true); }, "Mở hộp thoại tải về thay vì ghi vào thư mục JSON"));
    c.appendChild(bar);
    c.appendChild(h("div", { class: "hint", text: BK_HINT[cur] }));
    if (store && store.snapshotStatus) { // trạng thái bản chụp SQLite (nơi lưu chính) — gồm cả lỗi của lần sao lưu TỰ ĐỘNG chạy ngầm
      var ss0 = store.snapshotStatus() || {};
      c.appendChild(h("div", { class: "hint", "data-snap-status": String((ss0.history || []).length), text: ss0.latest ? "Bản chụp SQLite mới nhất: " + (ss0.latest.at ? fmtTime(ss0.latest.at) : "?") + " · " + ss0.latest.records + " dòng · " + (ss0.history || []).length + " bản trong lịch sử (giữ " + (ss0.keep || 10) + " bản gần nhất; bản sau chốt kỳ / theo năm giữ vĩnh viễn)." : "Chưa có bản chụp SQLite — bấm Sao lưu toàn bộ để tạo." }));
      if (ss0.lastError) c.appendChild(h("div", { class: "warn", "data-snap-error": "1", text: "⚠ " + ss0.lastError }));
    }
    if (window.hakPeriod) { // 012-B2: sao lưu THEO KỲ — phát sinh của kỳ đang chọn + toàn bộ nhân sự / danh mục / công thức
      var cbP = h("input", { type: "checkbox", "data-ky-pw": "1" }); cbP.checked = !!st.kyPw; cbP.addEventListener("change", function () { st.kyPw = cbP.checked; });
      var kb = btn("🗓 Sao lưu kỳ " + kyStr(), "", periodBackup, "Gói .zip gồm dữ liệu phát sinh của kỳ đang chọn + toàn bộ nhân sự, danh mục, công thức"); kb.setAttribute("data-ky-backup", "1");
      c.appendChild(h("div", { class: "bar" }, [kb, h("label", { class: "schk" }, [cbP, h("span", { text: "Đặt mật khẩu (.hakenc)" })])]));
      c.appendChild(h("div", { class: "hint", text: "Gói kỳ (.zip): chấm công, sản lượng, bán dăm, phát sinh, tạm ứng, tiền cơm, kết quả và bản chốt của kỳ + TOÀN BỘ nhân sự, danh mục, công thức lúc sao lưu. Đổi kỳ ở thanh trên." }));
    }
    c.appendChild(h("div", { class: "hint", text: "Trước khi cài lại Windows / đổi máy: sao lưu rồi cất file sang USB/Drive (thư mục dự phòng ở mục 4 tự chép giúp). Sang máy mới: cài app rồi Khôi phục ở mục 2. Sao lưu theo KỲ LƯƠNG: chưa có (làm ở bước 012-B)." }));
    return c;
  }
  /** Khu 2 — KHÔI PHỤC (012-A): một nút, chọn loại. Luôn có bước kiểm tra + xác nhận, tự sao lưu bản hiện tại trước khi ghi. */
  function cardRestore() {
    var c = h("div", { class: "card", "data-zone": "restore" });
    c.appendChild(h("h3", { text: "2 · 📥 Khôi phục toàn bộ" }));
    var kinds = []; if (window.hakFull) kinds.push(["full", "Gói Full Backup (.zip / .hakenc)"]); kinds.push(["json", "File JSON (.json)"]);
    var cur = kinds.some(function (k) { return k[0] === st.rsKind; }) ? st.rsKind : kinds[0][0];
    var sel = h("select", { class: "i", "data-restore-kind": "1", "aria-label": "Loại file khôi phục" }); kinds.forEach(function (k) { var o = h("option", { value: k[0], text: k[1] }); if (k[0] === cur) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", function () { st.rsKind = sel.value; });
    var go = btn("📥 Khôi phục toàn bộ…", "", function () { return sel.value === "full" ? fullRestore() : jsonRestore(); }, "Chọn file → kiểm tra toàn vẹn → xác nhận → ghi (tự sao lưu bản hiện tại trước)");
    go.setAttribute("data-restore-now", "1");
    c.appendChild(h("div", { class: "bar" }, [sel, go]));
    if (window.hakPeriod) { var kr = btn("🗓 Khôi phục kỳ lương…", "", function () { periodRestore("", ""); }, "Chọn gói kỳ (.zip / .hakenc) → kiểm tra → xem trước từng thay đổi → xác nhận"); kr.setAttribute("data-ky-restore", "1"); c.appendChild(h("div", { class: "bar" }, [kr])); }
    c.appendChild(h("div", { class: "hint", text: "Muốn khôi phục từ một bản SQLite hoặc JSON đã có trên máy: bấm \"Khôi phục\" ở dòng đó trong danh sách (mục 5). Luôn có bước kiểm tra và xác nhận; app sao lưu bản hiện tại trước khi ghi. Khôi phục theo KỲ LƯƠNG: chưa có (012-B)." }));
    return c;
  }
  /** Một chỗ duy nhất hiện kết quả sao lưu/khôi phục (Full Backup, JSON). */
  function fbMsgBox() { return st.fbMsg ? h("div", { class: st.fbMsg.bad ? "warn" : "ok", "data-fb-msg": "1", text: st.fbMsg.text }) : null; }
  function cardBackups() {
    var c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "5 · 🗂 Danh sách bản sao lưu trên máy & kiểm tra" }));
    if (!store || !store.listBackups) { c.appendChild(h("div", { class: "hint", text: "Chỉ có trong bản cài (.exe). Bản chạy trình duyệt: dùng Sao lưu toàn bộ → JSON ở mục 1." })); return c; }
    c.appendChild(h("div", { class: "hint", text: "daily = đầu mỗi ngày (giữ theo Lịch sao lưu) · startup = mỗi lần mở app (giữ 10) · dinh-ky = định kỳ (giữ 48) · khi-dong = khi đóng app (giữ 10) · nam-YYYY = bản theo năm (giữ vĩnh viễn) · truoc-… = tự sao lưu trước thao tác lớn (nhập Excel, mở chốt, khôi phục, xóa) · sau-chot-… = ngay sau khi chốt kỳ (giữ VĨNH VIỄN)." }));
    var STATUS = { ok: "✓ Nguyên vẹn (SHA-256)", unverified: "Bản cũ — chưa có mã kiểm tra", mismatch: "✕ HỎNG / bị sửa", invalid: "✕ Không đọc được" };
    c.appendChild(h("div", { class: "bar" }, [
      store.verifyBackups ? btn("🩺 Kiểm tra tất cả bản sao lưu", "", function () { st.bkVerify = true; render(); }) : null]));
    // Sao lưu THEO NĂM: bản "nam-<năm>" giữ vĩnh viễn (tự tạo ở lần lưu đầu tiên của mỗi năm; tạo tay cho năm đang chọn)
    var all = (st.bkVerify && store.verifyBackups ? store.verifyBackups() : store.listBackups()), nowY = new Date().getFullYear();
    var years = []; all.forEach(function (b) { if (b.year && years.indexOf(b.year) < 0) years.push(b.year); }); if (years.indexOf(String(nowY)) < 0) years.push(String(nowY)); years.sort().reverse();
    var ySel = h("select", {}, years.map(function (y) { return h("option", { value: y, text: "Năm " + y }); })); ySel.value = st.bkYear || String(nowY);
    ySel.addEventListener("change", function () { st.bkYear = ySel.value; render(); });
    c.appendChild(h("div", { class: "bar" }, [ySel, btn("📅 Sao lưu năm " + ySel.value + " (giữ vĩnh viễn)", "", function () {
      if (!need("backup.restore", "tạo bản sao lưu theo năm")) return;
      var n = backupNow("nam-" + ySel.value);
      toast(n ? "Đã tạo " + n : "⚠ KHÔNG tạo được bản sao lưu theo năm — kiểm tra dung lượng đĩa / quyền ghi"); render();
    }), btn("Xem tất cả năm", "", function () { st.bkYear = ""; render(); })]));
    // 012-C: gộp bản JSON và LỊCH SỬ BẢN CHỤP SQLite vào một danh sách; cột Định dạng + Phạm vi, lọc theo định dạng
    var scopeOf = function (tag) { tag = String(tag || ""); return /^nam-\d{4}$/.test(tag) ? "Năm " + tag.slice(4) + " (vĩnh viễn)" : /^sau-chot/.test(tag) ? "Sau chốt kỳ (vĩnh viễn)" : "Toàn bộ"; };
    var rowsAll = all.map(function (b) { return { kind: "json", name: b.name, tag: b.tag, year: b.year, at: b.created || b.mtime, size: b.size, status: b.status ? STATUS[b.status] || b.status : "—", b: b }; });
    var snap = store.snapshotStatus ? store.snapshotStatus() : null;
    ((snap && snap.history) || []).forEach(function (x) { var m = x.name.match(/^snap_(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/), at = m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : x.mtime; rowsAll.push({ kind: "sqlite", name: x.name, tag: x.tag, year: m ? m[1] : "", at: at, size: x.size, status: "✓ Đã kiểm khi tạo (toàn vẹn + số dòng)" }); });
    rowsAll.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    var KINDS = { all: "Tất cả định dạng", sqlite: "SQLite (.sqlite)", json: "JSON (.json)" }, kSel = h("select", { class: "i", "data-bk-kind-filter": "1", "aria-label": "Lọc theo định dạng" }, Object.keys(KINDS).map(function (k) { return h("option", { value: k, text: KINDS[k] }); }));
    kSel.value = st.bkKindF || "all"; kSel.addEventListener("change", function () { st.bkKindF = kSel.value; render(); });
    c.appendChild(h("div", { class: "bar" }, [kSel, h("span", { class: "hint", text: "Bản chụp .sqlite dùng khi data.sqlite hỏng (màn hình khôi phục tự hiện). Gói Full Backup và gói kỳ nằm ở thư mục Full Backup (mục 4 → Mở), khôi phục ở mục 2." })]));
    var list = rowsAll.filter(function (r) { return (!st.bkYear || r.year === st.bkYear) && (!st.bkKindF || st.bkKindF === "all" || r.kind === st.bkKindF); }).slice(0, 60);
    if (st.bkVerify) { var nb = list.filter(function (b) { return b.status === "mismatch" || b.status === "invalid"; }).length; c.appendChild(h("div", { class: nb ? "warn" : "ok", text: nb ? "⚠ " + nb + " bản sao lưu bị hỏng — không dùng để khôi phục." : "Đã kiểm tra " + list.length + " bản sao lưu gần nhất: đọc được, đủ điều kiện khôi phục." })); }
    if (!list.length) { c.appendChild(h("div", { class: "empty", text: "Chưa có bản sao lưu." })); return c; }
    var t = h("table"), tr = h("tr"); ["Tên file", "Định dạng", "Phạm vi", "Nhãn", "Thời điểm", "Dung lượng", "Tình trạng", ""].forEach(function (x) { tr.appendChild(h("th", { text: x })); }); t.appendChild(h("thead", {}, [tr]));
    var tb = h("tbody");
    list.forEach(function (r) {
      var x = h("tr", { "data-bk-row": r.kind });
      [r.name, r.kind === "sqlite" ? "SQLite (.sqlite)" : "JSON (.json)", scopeOf(r.tag), r.tag, r.at ? fmtTime(r.at) : "—", Math.max(1, Math.round((r.size || 0) / 1024)) + " KB", r.status].forEach(function (v) { x.appendChild(h("td", { class: "t", text: v })); });
      var b = r.b;
      x.appendChild(h("td", { style: "text-align:right" }, [r.kind === "json" ? btn("Khôi phục", "", function () { if (!need("backup.restore")) return; var rr = store.readBackup(b.name); if (!rr.ok) { alert(rr.error); return; } restoreFromText(rr.text, b.name); }) : h("span", { class: "hint", text: "dùng khi data.sqlite hỏng" })]));
      tb.appendChild(x);
    });
    t.appendChild(tb); c.appendChild(h("div", { class: "tw", style: "max-height:320px" }, [t]));
    return c;
  }
  function cardIntegrity() {
    var c = h("div", { class: "card" }), issues = INT.check(db);
    var sch = SCH.validate(db, { tables: Object.keys(ALL), hrTables: Object.keys(HRT) });
    sch.errors.forEach(function (e) { issues.push({ level: "High", area: (ALL[e.table] ? ALL[e.table].ten : e.table) + " (cấu trúc)", msg: e.msg }); });
    sch.info.forEach(function (m) { issues.push({ level: "Low", area: "Cấu trúc", msg: m }); });
    VAL.nearDuplicateGroups(db).forEach(function (g) { issues.push({ level: "High", area: (ALL[g.table] ? ALL[g.table].ten : g.table), msg: "NGHI TRÙNG (013-B): " + g.rows + " dòng có khóa giống nhau nhưng viết khác (" + g.keys.slice(0, 4).join(" ≈ ") + (g.keys.length > 4 ? " …" : "") + ") — kiểm tra rồi sửa/gộp theo quy trình có sẵn; app KHÔNG tự gộp." }); });
    var ord = { Critical: 0, High: 1, Medium: 2, Low: 3 }; issues.sort(function (a, b) { return ord[a.level] - ord[b.level]; });
    c.appendChild(h("h3", { text: "🩺 Kiểm tra dữ liệu" }));
    c.appendChild(h("div", { class: "hint", text: "Kiểm tra cấu trúc (phiên bản, bảng, kiểu ngày/tiền/kỳ, Mã NV, quan hệ hợp đồng–phụ lục, toàn vẹn kỳ đã chốt) và nghiệp vụ (trùng mã, trùng chấm công, lương nghi lỗi…). App KHÔNG tự xóa dữ liệu lỗi — bạn tự sửa theo danh sách." }));
    var dupCC = issues.some(function (i) { return i.area === "chamcong" && /nên gộp|Gộp dòng chấm công trùng/.test(i.msg); });
    if (dupCC) c.appendChild(h("div", { class: "bar" }, [btn("🔀 Gộp dòng chấm công trùng (không trùng ngày)", "pri", function () {
      if (!need("input.edit")) return;
      if (!confirm("Gộp các dòng chấm công cùng Kỳ + Mã NV + Hình thức công thành 1 dòng?\n• Ngày nhập trùng (cùng số công) → tính 1 lần (hiện đang bị cộng 2 lần).\n• Cùng ngày nhưng KHÁC số công, hoặc thuộc kỳ đã chốt → giữ nguyên để bạn tự xử lý.\nApp sao lưu trước khi gộp.")) return;
      // P1: có "before" + hoàn tác riêng khi saveNow() thất bại — chỉ cảnh báo, không chặn.
      var bkOk = !!backupNow("truoc-gop-cham-cong");
      var merged = REPO.mergeAttendance();
      if (!merged.ok) { alert("Không lưu được — đã hủy thao tác gộp."); render(); return; }
      var r = merged.value;
      render(); alert("Đã gộp " + r.groups + " nhóm (bỏ " + r.removed + " dòng thừa" + (r.dupDays ? "; " + r.dupDays + " ngày nhập trùng nay tính 1 lần" : "") + ")." + (r.skipped.length ? "\nGiữ nguyên " + r.skipped.length + " nhóm: " + r.skipped.slice(0, 8).map(function (x) { return x.key.replace(/\|/g, " ") + " — " + x.reason; }).join("; ") : "") + (bkOk ? "" : "\n⚠ KHÔNG tạo được bản sao lưu trước khi gộp — kiểm tra dung lượng đĩa"));
    })]));
    if (!issues.length) { c.appendChild(h("div", { class: "ok", text: "Không phát hiện vấn đề về cấu trúc và toàn vẹn dữ liệu." })); return c; }
    c.appendChild(h("div", { class: "hint", text: issues.length + " vấn đề cần xem xét. Critical/High có thể làm sai tiền lương." }));
    c.appendChild(simpleTable(issues.map(function (i) { return { "Mức độ": i.level, "Khu vực": i.area, "Nội dung": i.msg }; })));
    return c;
  }
  // ---------- Màn hình đăng nhập / khởi tạo Admin ----------
  function authCard(title, hint, fields, okText, onOk, extra) {
    var w = h("div", { style: "max-width:440px;margin:40px auto" }), c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: title }));
    if (hint) c.appendChild(h("div", { class: "hint", text: hint }));
    var inputs = {}, msg = h("div", { class: "warn", style: "display:none" });
    fields.forEach(function (f) {
      var inp = h("input", { class: "i", style: "width:100%", type: f.type || "text", autocomplete: f.ac || "off", "data-f": f.k });
      inputs[f.k] = inp;
      c.appendChild(h("div", { class: "fld", style: "margin:8px 0" }, [h("label", { text: f.label }), inp]));
    });
    var busy = false, okBtn = btn(okText, "pri big", function () {
      if (busy) return; var v = {}; Object.keys(inputs).forEach(function (k) { v[k] = inputs[k].value; });
      busy = true; okBtn.disabled = true; msg.style.display = "none";
      Promise.resolve().then(function () { return onOk(v); }).catch(function (e) { msg.textContent = "⚠ " + (e && e.message || e); msg.style.display = ""; })
        .then(function () { busy = false; okBtn.disabled = false; });
    });
    c.appendChild(msg); c.appendChild(h("div", { class: "bar", style: "margin-top:12px" }, [okBtn].concat(extra || [])));
    c.addEventListener("keydown", function (e) { if (e.key === "Enter") okBtn.click(); });
    w.appendChild(c);
    setTimeout(function () { var f0 = c.querySelector("input"); if (f0) f0.focus(); }, 0);
    return w;
  }
  function showRecoveryCode(code, then) {
    var body = h("div");
    body.appendChild(h("div", { class: "warn", html: "Ghi lại <b>mã khôi phục</b> này và cất ở nơi an toàn (két, sổ tay của giám đốc).<br>Khi quên mật khẩu Admin, đây là cách DUY NHẤT để vào lại app. Mã chỉ hiện 1 lần." }));
    body.appendChild(h("div", { style: "font-size:26px;font-weight:700;letter-spacing:2px;text-align:center;margin:16px 0", text: code, "data-recovery": "1" }));
    modal("Mã khôi phục quản trị", body, function (close) { return [btn("Tôi đã ghi lại mã", "pri", function () { close(); (then || render)(); })]; });
  }
  function setRecovery(code) {
    return AUTH.make(code.replace(/-/g, "")).then(function (k) { db.baomat = [{ khoiPhuc: k, taoLuc: new Date().toISOString() }]; });
  }
  /** Hai lựa chọn khi mở app lần đầu: 1) tạo dữ liệu + tài khoản mới (mặc định), 2) khôi phục từ dữ liệu cũ. */
  function setupChooser(active) {
    var pick = function (mode) { return function () { st.setupMode = mode; st.setupRestored = false; render(); }; };
    return h("div", { class: "bar", style: "margin:0 0 12px;gap:8px;flex-wrap:wrap" }, [
      btn("1. Tạo dữ liệu và tài khoản mới", active === "new" ? "pri" : "", pick("new")),
      btn("2. Khôi phục từ dữ liệu cũ", active === "restore" ? "pri" : "", pick("restore"))]);
  }
  function restoreFirstRunScreen() {
    var w = h("div", { style: "max-width:440px;margin:40px auto" }), c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "Thiết lập ban đầu" })); c.appendChild(setupChooser("restore"));
    c.appendChild(h("div", { class: "hint", text: "Chọn file dữ liệu cũ (.json — \"Sao lưu ra file\" hoặc file dữ liệu đã xuất). Khôi phục bình thường, không đối chiếu nhật ký thao tác. Nếu file có tài khoản, đăng nhập bằng tài khoản cũ; nếu file chỉ có bảng dữ liệu, bước sau sẽ yêu cầu tạo tài khoản Admin." }));
    c.appendChild(h("div", { class: "bar", style: "margin-top:12px" }, [btn("⬆ Chọn file dữ liệu cũ…", "pri big", function () {
      var f = h("input", { type: "file", accept: ".json" });
      f.addEventListener("change", function () {
        if (!f.files[0]) return;
        var fr = new FileReader(); fr.onload = function () {
          restoreFromText(fr.result, f.files[0].name, { after: function () { st.setupMode = "new"; st.setupRestored = !(db.nguoidung || []).length; render(); } });
        }; fr.readAsText(f.files[0]);
      });
      f.click();
    })]));
    w.appendChild(c); return w;
  }
  function setupAdminScreen() {
    if (st.setupMode === "restore") return restoreFirstRunScreen();
    var scr = setupAdminForm();
    var card = scr.firstChild; card.insertBefore(setupChooser("new"), card.children[1] || null);
    return scr;
  }
  function setupAdminForm() {
    return authCard("Thiết lập ban đầu", st.setupRestored ? "Đã khôi phục dữ liệu cũ. File không có tài khoản nên cần tạo tài khoản Admin — dữ liệu đã khôi phục được giữ nguyên." : "Nhập thông tin công ty và tạo tài khoản Admin đầu tiên. Dữ liệu được tạo mới với danh mục chuẩn — không cần file. Nếu đã có dữ liệu cũ, chọn \"2. Khôi phục từ dữ liệu cũ\" ở trên.",
      [{ k: "cty", label: "Tên công ty (đầy đủ, dùng trên báo cáo)" }, { k: "ma", label: "Mã công ty (viết tắt, ví dụ HAKQN)" },
        { k: "u", label: "Tên đăng nhập Admin" }, { k: "n", label: "Họ tên Admin" }, { k: "p", label: "Mật khẩu (≥ 8 ký tự, có chữ và số)", type: "password", ac: "new-password" }, { k: "p2", label: "Nhập lại mật khẩu", type: "password", ac: "new-password" }],
      "Tạo dữ liệu và tài khoản Admin", function (v) {
        if (!v.cty.trim()) throw new Error("Cần nhập tên công ty");
        if (!/^[A-Za-z0-9_-]{2,20}$/.test(v.ma.trim())) throw new Error("Mã công ty 2–20 ký tự: chữ không dấu, số, _ hoặc -");
        if (!/^[a-z0-9._-]{3,30}$/i.test(v.u.trim())) throw new Error("Tên đăng nhập 3–30 ký tự: chữ không dấu, số, . _ -");
        if (!v.n.trim()) throw new Error("Cần nhập họ tên");
        var bad = PERM.validatePassword(v.p); if (bad) throw new Error(bad);
        if (v.p !== v.p2) throw new Error("Hai lần nhập mật khẩu không khớp");
        if ((db.nguoidung || []).length) throw new Error("Đã có tài khoản — hãy đăng nhập");
        var code = randomCode(), snap = JSON.parse(JSON.stringify(db));
        return AUTH.make(v.p).then(function (k) {
          var u = Object.assign({ id: HRM.uid(), tenDangNhap: v.u.trim(), hoTen: v.n.trim(), vaiTro: "admin", khoa: false, taoLuc: new Date().toISOString() }, k);
          HRM.khoiTaoMoi(db, v.cty, v.ma);
          db.nguoidung.push(u);
          return setRecovery(code).then(function () {
            session = u; audit("Khởi tạo dữ liệu công ty mới", v.cty.trim() + " (" + v.ma.trim() + ")"); audit("Khởi tạo tài khoản Admin", u.tenDangNhap);
            if (!saveNow()) { db.nguoidung = []; db.baomat = []; Object.keys(db).forEach(function (key) { delete db[key]; }); Object.assign(db, snap); session = null; throw new Error("Không lưu được xuống đĩa — chưa tạo dữ liệu"); }
            if (!mainLogin(u.tenDangNhap, v.p)) { session = null; throw new Error("Đã tạo tài khoản nhưng chưa thiết lập được phiên — đăng nhập lại"); }
            showRecoveryCode(code);
          });
        });
      });
  }
  function loginScreen() {
    return authCard("Đăng nhập", congTy()["Tên công ty"] || "", [{ k: "u", label: "Tên đăng nhập", ac: "username" }, { k: "p", label: "Mật khẩu", type: "password", ac: "current-password" }], "Đăng nhập", function (v) {
      var wait = PERM.lockedFor(v.u); if (wait) throw new Error("Sai mật khẩu quá 5 lần — chờ " + Math.ceil(wait / 1000) + " giây");
      var u = PERM.findUser(db, v.u);
      return (u ? AUTH.verify(v.p, u) : AUTH.hash(v.p, "00".repeat(16), PERM.ITER).then(function () { return false; })).then(function (ok) {
        if (!ok) { PERM.noteFail(v.u); throw new Error("Sai tên đăng nhập hoặc mật khẩu"); }
        if (u.khoa) throw new Error("Tài khoản đã bị khóa — liên hệ Admin");
        PERM.noteOk(v.u); session = u; lastActive = Date.now(); u.dangNhapLuc = new Date().toISOString();
        audit("Đăng nhập", u.tenDangNhap); saveNow();
        if (!mainLogin(u.tenDangNhap, v.p)) { session = null; throw new Error("Tiến trình chính không xác nhận được phiên đăng nhập — thử lại"); }
        if (u.phaiDoiMK) { render(); changePassword(true); return; }
        render();
      });
    }, [btn("Quên mật khẩu Admin…", "ghost", function () { st.authView = "recover"; render(); })]);
  }
  function recoverAdminScreen() {
    return authCard("Khôi phục quyền Admin", "Nhập mã khôi phục được cấp khi tạo Admin đầu tiên. App đặt lại mật khẩu cho tài khoản Admin bạn chọn và cấp MÃ KHÔI PHỤC MỚI.",
      [{ k: "c", label: "Mã khôi phục (XXXX-XXXX-XXXX-XXXX)" }, { k: "u", label: "Tên đăng nhập Admin cần đặt lại" }, { k: "p", label: "Mật khẩu mới", type: "password", ac: "new-password" }, { k: "p2", label: "Nhập lại", type: "password", ac: "new-password" }],
      "Đặt lại mật khẩu", function (v) {
        var wait = PERM.lockedFor("#recovery"); if (wait) throw new Error("Nhập sai quá 5 lần — chờ " + Math.ceil(wait / 1000) + " giây");
        var rec = (db.baomat || [])[0], u = PERM.findUser(db, v.u);
        if (!rec || !rec.khoiPhuc) throw new Error("Dữ liệu này không có mã khôi phục");
        var bad = PERM.validatePassword(v.p); if (bad) throw new Error(bad);
        if (v.p !== v.p2) throw new Error("Hai lần nhập mật khẩu không khớp");
        return AUTH.verify(v.c.trim().toUpperCase().replace(/-/g, ""), rec.khoiPhuc).then(function (ok) {
          if (!ok) { PERM.noteFail("#recovery"); throw new Error("Mã khôi phục không đúng"); }
          if (!u || u.vaiTro !== "admin") throw new Error("Không có tài khoản Admin tên này");
          // V10.1: tiến trình chính xác minh lại mã trên dữ liệu đĩa và cấp phiên khôi phục; không có phiên này main từ chối ghi đặt lại Admin
          if (store && store.recover) { var rr = store.recover(v.c, u.tenDangNhap); if (!rr || !rr.ok) throw new Error((rr && rr.error) || "Tiến trình chính từ chối khôi phục"); }
          PERM.noteOk("#recovery");
          var code = randomCode();
          return Promise.all([AUTH.make(v.p), AUTH.make(code.replace(/-/g, ""))]).then(function (keys) {
            if (!txn(["nguoidung", "baomat"], function () {
              Object.assign(u, keys[0], { khoa: false, phaiDoiMK: false, doiMKLuc: new Date().toISOString() });
              db.baomat = [{ khoiPhuc: keys[1], taoLuc: new Date().toISOString() }];
              audit("Khôi phục quyền Admin bằng mã khôi phục", u.tenDangNhap + " — đã cấp mã khôi phục mới");
            })) throw new Error("Chưa khôi phục quyền Admin: " + lastTxnError);
            session = u;
            return Promise.resolve().then(function () {
              st.authView = ""; if (!mainLogin(u.tenDangNhap, v.p)) { session = null; throw new Error("Đã đặt lại mật khẩu nhưng chưa thiết lập được phiên — đăng nhập lại"); }
              showRecoveryCode(code);
            });
          });
        });
      }, [btn("← Quay lại đăng nhập", "ghost", function () { st.authView = ""; render(); })]);
  }
  function changePassword(forced) {
    var body = h("div"), f = {};
    if (forced) body.appendChild(h("div", { class: "warn", text: "Admin yêu cầu bạn đổi mật khẩu trước khi làm việc." }));
    [["o", "Mật khẩu hiện tại"], ["p", "Mật khẩu mới (≥ 8 ký tự, có chữ và số)"], ["p2", "Nhập lại mật khẩu mới"]].forEach(function (x) { f[x[0]] = h("input", { class: "i", type: "password", style: "width:100%" }); body.appendChild(h("div", { class: "fld", style: "margin:8px 0" }, [h("label", { text: x[1] }), f[x[0]]])); });
    modal("Đổi mật khẩu — " + session.tenDangNhap, body, function (close) {
      return [forced ? btn("Đăng xuất", "", function () { if (logout("không đổi mật khẩu bắt buộc")) close(); }) : btn("Hủy", "", close), btn("Đổi mật khẩu", "pri", function () {
        var bad = PERM.validatePassword(f.p.value); if (bad) { alert(bad); return; }
        if (f.p.value !== f.p2.value) { alert("Hai lần nhập không khớp"); return; }
        AUTH.verify(f.o.value, session).then(function (ok) {
          if (!ok) { alert("Mật khẩu hiện tại không đúng"); return; }
          return AUTH.make(f.p.value).then(function (k) { if (!txn(["nguoidung"], function () { Object.assign(session, k, { phaiDoiMK: false, doiMKLuc: new Date().toISOString() }); audit("Đổi mật khẩu", session.tenDangNhap); })) { alert("Chưa đổi mật khẩu: " + lastTxnError); return; } close(); toast("Đã đổi mật khẩu"); render(); });
        });
      })];
    });
  }
  // ---------- Quản trị người dùng (Admin) ----------
  function userForm(u) {
    var isNew = !u, body = h("div"), g = h("div", { class: "fgrid" }); body.appendChild(g);
    var f = { u: h("input", { class: "i", style: "width:100%", value: u ? u.tenDangNhap : "" }), n: h("input", { class: "i", style: "width:100%", value: u ? u.hoTen : "" }),
      r: h("select", { style: "width:100%" }, Object.keys(PERM.ROLES).map(function (k) { return h("option", { value: k, text: PERM.ROLES[k].ten }); })),
      k: h("select", { style: "width:100%" }, [h("option", { value: "", text: "Đang hoạt động" }), h("option", { value: "1", text: "Khóa tài khoản" })]),
      p: h("input", { class: "i", type: "password", style: "width:100%", placeholder: isNew ? "" : "Để trống = giữ mật khẩu" }) };
    f.r.value = u ? u.vaiTro : "ketoanluong"; f.k.value = u && u.khoa ? "1" : ""; if (u) f.u.disabled = true;
    [["Tên đăng nhập", f.u], ["Họ tên", f.n], ["Vai trò", f.r], ["Trạng thái", f.k], [isNew ? "Mật khẩu tạm (người dùng phải đổi khi đăng nhập)" : "Đặt lại mật khẩu tạm", f.p]].forEach(function (x) { g.appendChild(h("div", { class: "fld" }, [h("label", { text: x[0] }), x[1]])); });
    var perm = h("div", { class: "hint" }), showPerm = function () { perm.textContent = "Quyền: " + PERM.ROLES[f.r.value].perms.map(function (p) { return PERM.PERMS[p]; }).join(" · "); };
    f.r.addEventListener("change", showPerm); showPerm(); body.appendChild(perm);
    modal(isNew ? "Thêm người dùng" : "Sửa người dùng — " + u.tenDangNhap, body, function (close) {
      return [btn("Hủy", "", close), btn("💾 Lưu", "pri", function () {
        if (!need("system.admin")) return;
        var name = f.u.value.trim(), next = { vaiTro: f.r.value, khoa: f.k.value === "1" };
        if (isNew && !/^[a-z0-9._-]{3,30}$/i.test(name)) { alert("Tên đăng nhập 3–30 ký tự: chữ không dấu, số, . _ -"); return; }
        if (isNew && PERM.findUser(db, name)) { alert("Tên đăng nhập đã tồn tại"); return; }
        if (!f.n.value.trim()) { alert("Cần nhập họ tên"); return; }
        if ((isNew || f.p.value) && PERM.validatePassword(f.p.value)) { alert(PERM.validatePassword(f.p.value)); return; }
        if (u && PERM.wouldRemoveLastAdmin(db, u, next)) { alert("Không thể: đây là Admin đang hoạt động cuối cùng."); return; }
        var done = function (k) {
          var savedId = u && u.id;
          var saved = txn(["nguoidung"], function () {
          var before = u ? { "Vai trò": u.vaiTro, "Khóa": u.khoa ? "Có" : "Không", "Họ tên": u.hoTen } : null;
          if (isNew) { u = Object.assign({ id: HRM.uid(), tenDangNhap: name, taoLuc: new Date().toISOString(), phaiDoiMK: true }, k); db.nguoidung.push(u); }
          else if (k) Object.assign(u, k, { phaiDoiMK: true });
          Object.assign(u, { hoTen: f.n.value.trim() }, next);
          audit(isNew ? "Thêm người dùng" : "Sửa người dùng", u.tenDangNhap + " · " + GRD.changedFields(before, { "Vai trò": u.vaiTro, "Khóa": u.khoa ? "Có" : "Không", "Họ tên": u.hoTen }).join("; ") + (k ? " · đặt mật khẩu tạm" : ""));
          });
          if (!saved) { u = isNew ? null : (db.nguoidung || []).find(function (x) { return x.id === savedId; }); alert("Chưa lưu người dùng: " + lastTxnError); return; }
          close(); render(); toast("Đã lưu người dùng");
        };
        if (isNew || f.p.value) AUTH.make(f.p.value).then(done); else done(null);
      })];
    });
  }
  function cardUsers() {
    var c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "👥 Người dùng & phân quyền" }));
    c.appendChild(h("div", { class: "hint", text: "Chỉ Admin quản lý. Quyền được kiểm tra ở mọi thao tác ghi/xuất dữ liệu. Chỉ Admin được sửa dữ liệu hồi tố vào kỳ đã chốt, khôi phục dữ liệu, quản trị hệ thống." }));
    c.appendChild(h("div", { class: "bar" }, [btn("＋ Thêm người dùng", "pri", function () { userForm(null); })]));
    var rows = (db.nguoidung || []).map(function (u) { return { u: u, o: { "Tên đăng nhập": u.tenDangNhap, "Họ tên": u.hoTen, "Vai trò": (PERM.ROLES[u.vaiTro] || {}).ten || u.vaiTro, "Trạng thái": u.khoa ? "Khóa" : "Hoạt động", "Đăng nhập gần nhất": fmtTime(u.dangNhapLuc) } }; });
    var t = h("table"), tr = h("tr"); Object.keys(rows[0].o).concat([""]).forEach(function (x) { tr.appendChild(h("th", { text: x })); }); t.appendChild(h("thead", {}, [tr]));
    var tb = h("tbody"); rows.forEach(function (x) { var r = h("tr", { class: "click", on: { click: function () { userForm(x.u); } } }); Object.keys(x.o).forEach(function (k) { r.appendChild(h("td", { class: "t", text: x.o[k] })); }); r.appendChild(h("td", { class: "t", text: "Sửa ›" })); tb.appendChild(r); });
    t.appendChild(tb); c.appendChild(h("div", { class: "tw", style: "max-height:300px" }, [t]));
    c.appendChild(h("div", { class: "bar", style: "margin-top:10px" }, [btn("🔑 Cấp lại mã khôi phục Admin", "", function () {
      if (!need("system.admin")) return;
      if (!confirm("Cấp mã khôi phục MỚI? Mã cũ sẽ hết hiệu lực.")) return;
      var code = randomCode(); AUTH.make(code.replace(/-/g, "")).then(function (k) { if (!txn(["baomat"], function () { db.baomat = [{ khoiPhuc: k, taoLuc: new Date().toISOString() }]; audit("Cấp lại mã khôi phục Admin", ""); })) { alert("Chưa cấp mã khôi phục mới: " + lastTxnError); return; } showRecoveryCode(code); });
    })]));
    return c;
  }
  function recoveryScreen() {
    var w = h("div"), c = h("div", { class: "card" });
    c.appendChild(h("h3", { text: "⚠ Không mở được file dữ liệu" }));
    c.appendChild(h("div", { class: "warn", html: esc(loadError.error) + "<br>App <b>chưa ghi đè</b> file này. Hãy khôi phục từ một bản sao lưu bên dưới, hoặc từ file sao lưu bạn đã cất (USB/Drive)." }));
    var bar = h("div", { class: "bar" });
    bar.appendChild(btn("⬆ Khôi phục từ file…", "pri", function () { var f = h("input", { type: "file", accept: ".json" }); f.addEventListener("change", function () { var fr = new FileReader(); fr.onload = function () { restoreFromText(fr.result, f.files[0].name, { quarantine: true }); }; fr.readAsText(f.files[0]); }); f.click(); }));
    var sn = loadError.snapshot;
    if (sn && sn.exists) {
      c.appendChild(h("div", { class: sn.ok ? "hint" : "warn", "data-snapshot": sn.ok ? "ok" : "bad", text: sn.ok ? "Bản chụp SQLite gần nhất: " + fmtTime(sn.mtime) + ", " + sn.records + " dòng dữ liệu, " + Math.round(sn.size / 1024) + " KB. Đã kiểm hợp lệ." : "Có bản chụp SQLite nhưng KHÔNG dùng được: " + (sn.error || "") }));
      if (sn.ok && store && store.restoreSnapshot) bar.appendChild(btn("⬆ Khôi phục từ bản chụp SQLite", "pri", function () {
        if (!confirm("KHÔI PHỤC từ bản chụp SQLite (" + fmtTime(sn.mtime) + ", " + sn.records + " dòng).\n\nDữ liệu thay đổi SAU thời điểm này sẽ không có trong bản chụp. File dữ liệu hiện tại KHÔNG bị xóa: được cất cạnh với tên có 'truoc-khoi-phuc'. Tiếp tục?")) return;
        var r = store.restoreSnapshot();
        if (r && r.ok) { alert("Đã khôi phục từ bản chụp SQLite: " + r.records + " dòng (trước đó: " + (r.before == null ? "không đọc được" : r.before) + "). File cũ được cất: " + (r.kept || []).join(", ")); window.location.reload(); }
        else alert("Không khôi phục được: " + ((r && r.error) || "không rõ lý do"));
      }));
    }
    if (store && store.restorePackageSnapshot) bar.appendChild(btn("⬆ Khôi phục từ gói Full Backup (bản chụp SQLite)…", "", function () {
      if (!confirm("Chọn một gói Full Backup (.zip) có bản chụp SQLite (gói tạo từ bản 2.0.38 trở lên).\n\nDữ liệu thay đổi SAU thời điểm tạo gói sẽ không có. File dữ liệu hiện tại KHÔNG bị xóa: được cất cạnh với tên có 'truoc-khoi-phuc'. Tiếp tục?")) return;
      var r = store.restorePackageSnapshot();
      if (r && r.cancelled) return;
      if (r && r.ok) { alert("Đã khôi phục từ gói: " + r.records + " dòng (trước đó: " + (r.before == null ? "không đọc được" : r.before) + "). File cũ được cất: " + (r.kept || []).join(", ")); window.location.reload(); }
      else alert("Không khôi phục được: " + ((r && r.error) || "không rõ lý do"));
    }));
    if (store) bar.appendChild(btn("📂 Mở thư mục dữ liệu", "", function () { store.openFolder(); }));
    bar.appendChild(btn("Bắt đầu với dữ liệu trống", "red", function () {
      if (!confirm("Cất file hỏng sang tên khác (KHÔNG xóa) và bắt đầu với dữ liệu trống?")) return;
      var q = store && store.quarantine && store.quarantine(); db = {}; readOnly = false; loadError = null; ensureTables(); saveNow(); render(); alert("File hỏng đã được giữ lại với tên: " + (q || "(không có)"));
    }));
    c.appendChild(bar);
    var list = (loadError.backups || []).slice(0, 30);
    if (list.length) {
      var t = h("table"), tr = h("tr"); ["Bản sao lưu", "Thời điểm", "Dung lượng", ""].forEach(function (x) { tr.appendChild(h("th", { text: x })); }); t.appendChild(h("thead", {}, [tr]));
      var tb = h("tbody");
      list.forEach(function (b) {
        var x = h("tr"); [b.name, fmtTime(b.mtime), Math.round(b.size / 1024) + " KB"].forEach(function (v) { x.appendChild(h("td", { class: "t", text: v })); });
        x.appendChild(h("td", {}, [btn("Khôi phục bản này", "pri", function () { var r = store.readBackup(b.name); if (!r.ok) { alert(r.error); return; } restoreFromText(r.text, b.name, { quarantine: true }); })]));
        tb.appendChild(x);
      });
      t.appendChild(tb); c.appendChild(h("div", { class: "tw" }, [t]));
    } else c.appendChild(h("div", { class: "empty", text: "Không tìm thấy bản sao lưu tự động." }));
    w.appendChild(c); return w;
  }
  function napMau() {
    if (!need("dm.edit", "nạp danh mục")) return;
    var sd = HRM.seedDanhMuc(), done = [], skip = [];
    if (!txn(Object.keys(sd), function () {
      Object.keys(sd).forEach(function (k) { if (!db[k].length) { db[k] = sd[k]; done.push(DM[k].ten); } else skip.push(DM[k].ten); });
      if (done.length) audit("Nạp danh mục chuẩn", done.join(", "));
    })) { alert("Chưa nạp danh mục: " + lastTxnError); return; }
    render();
    alert((done.length ? "Đã nạp: " + done.join(", ") + "\n" : "") + (skip.length ? "Giữ nguyên (đã có dữ liệu): " + skip.join(", ") + "\n" : "") + "\nSố liệu lấy theo danh mục thật của HAK (QL_NHANSU). Kế toán kiểm tra lại đơn giá, tỷ lệ BH, biểu thuế theo quy định hiện hành.");
  }

  // ---------- Khung & điều hướng ----------
  var NAV = [
    ["grp", "Tổng quan"], ["home", "🏠", "Tổng quan"],
    ["grp", "Nhân sự"], ["nhansu", "👥", "Danh sách nhân viên & hồ sơ"], ["nvns", "📝", "Nghiệp vụ nhân sự"], ["capphat", "📦", "Cấp phát"],
    ["grp", "Chấm công"], ["chamcong", "🗓", "Bảng chấm công"], ["ocr", "📷", "Đọc ảnh chấm công"], ["ocrlib", "🗂", "Thư viện mẫu OCR"],
    ["grp", "Sản lượng"], ["sanluong", "⚖", "Sản lượng"], ["bandam", "🚛", "Ban dăm xuất hàng"], ["rp_sl", "⚖", "Phiếu gốc sản lượng"], ["rp_bd", "🚛", "Phiếu gốc Ban dăm xuất hàng"],
    ["grp", "Nghiệp vụ tiền lương"], ["psluong", "🎁", "Thưởng / Trừ"], ["ungluong", "💵", "Tạm ứng"], ["tiencom", "🍚", "Suất cơm"],
    ["grp", "Tính lương"], ["luong", "▶", "Tính lương theo kỳ"], ["ktbl", "✔", "Kiểm tra bảng lương"], ["kyluong", "🔒", "Kỳ lương đã chốt"], ["doichieu", "↔", "Đối chiếu Excel"],
    ["grp", "Thanh toán lương"], ["rp_thanhtoan", "💼", "Bảng thanh toán lương"], ["rp_cttt", "📒", "Chi tiết thanh toán"], ["rp_soct", "🗂", "Sổ chứng từ thanh toán"], ["rp_ck", "🏦", "Bảng kê chuyển khoản"], ["rp_tm", "💵", "Thanh toán tiền mặt"],
    ["grp", "Báo cáo lương"], ["bangtinh", "📋", "Bảng tính lương"], ["rp_tonghop", "📑", "Bảng tổng hợp lương"], ["rp_ctnv", "📃", "Tổng hợp chi tiết nhân viên"], ["slips", "🧾", "Phiếu lương chi tiết"], ["rp_tncn", "🧮", "Khấu trừ thuế TNCN"],
    ["grp", "Báo cáo khác"], ["rp_pb", "🏢", "Tổng hợp theo phòng ban"], ["baocaoluong", "📈", "Báo cáo lương khác"], ["baocao", "📊", "Báo cáo nhân sự"],
    ["grp", "Báo cáo nghiệp vụ"], ["rp_ns", "👥", "Danh sách nhân sự"], ["rp_th", "🎁", "Bảng kê thưởng / trừ"], ["rp_tu", "💵", "Bảng kê tạm ứng"], ["rp_com", "🍚", "Tổng hợp suất cơm"],
    ["grp", "Danh mục"], ["dm", "📚", "Danh mục"],
    ["grp", "Cài đặt"], ["caidat", "🛠", "Công thức & phương pháp"], ["backup", "⚙", "Công ty & Sao lưu"], ["huongdan", "📖", "Hướng dẫn & Quy chế"]
  ];
  // Tab nào cần quyền xem nào (kiểm tra cả khi mở bằng trạng thái đã lưu, không chỉ ẩn menu)
  var TAB_PERM = { ocr: "input.edit", ocrlib: "input.view", luong: "payroll.view", bangtinh: "payroll.view", slips: "payroll.view", rp_tonghop: "payroll.view", rp_pb: "payroll.view", rp_tncn: "payroll.view", rp_ctnv: "payroll.view", rp_cttt: "payroll.view", rp_soct: "payroll.view", rp_thanhtoan: "payroll.view", rp_ck: "payroll.view", rp_tm: "payroll.view", kyluong: "payroll.view", baocaoluong: "payroll.view", doichieu: "payroll.view", nhansu: "hr.view", nv: "hr.view", baocao: "report.view", nvns: "hr.view", capphat: "hr.view", caidat: "payroll.view", ktbl: "payroll.view" };
  Object.keys(OPS_SCREENS).forEach(function (k) { TAB_PERM[k] = OPS.TYPES[OPS_SCREENS[k]].perm; });
  function tabAllowed(t) {
    if (t === "home") return true;
    if (t === "backup") return can("system.admin") || can("backup.restore");
    if (t === "dm") return can("dm.edit") || can("payroll.view") || can("hr.view");
    if (t === "caidat") return can("dm.edit") || can("payroll.view");
    if (S[t]) return can("input.view");
    return TAB_PERM[t] ? can(TAB_PERM[t]) : true;
  }
  var TITLES = { nvns: "Nghiệp vụ nhân sự", capphat: "Cấp phát sữa phúc lợi và bảo hộ lao động", ktbl: "Kiểm tra bảng lương", caidat: "Cài đặt — Công thức & phương pháp tính lương", ocr: "Đọc ảnh bảng chấm công / chấm cơm (OCR)", ocrlib: "OCR & Chứng từ — Thư viện mẫu", home: "Tổng quan", luong: "Tính lương", bangtinh: "Bảng tính lương", rp_tonghop: "Bảng tổng hợp lương", rp_pb: "Bảng tổng hợp lương theo phòng ban", rp_tncn: "Báo cáo khấu trừ thuế TNCN", rp_ctnv: "Bảng tổng hợp chi tiết lương toàn bộ nhân viên", rp_thanhtoan: "Bảng thanh toán lương", rp_cttt: "Chi tiết thanh toán", rp_soct: "Sổ chứng từ thanh toán", rp_ck: "Bảng kê chuyển khoản", rp_tm: "Bảng thanh toán lương tiền mặt", slips: "Phiếu lương chi tiết", dm: "Danh mục", backup: "Công ty & Sao lưu", nhansu: "Nhân sự", nv: "Hồ sơ nhân viên", baocao: "Báo cáo nhân sự", rp_ns: "Danh sách nhân sự", rp_sl: "Bảng kê phiếu cân sản lượng", rp_bd: "Bảng kê Ban dăm xuất hàng", rp_th: "Bảng kê thưởng / trừ", rp_tu: "Bảng kê tạm ứng lương", rp_com: "Tổng hợp suất cơm", kyluong: "Kỳ lương đã chốt", baocaoluong: "Báo cáo lương", doichieu: "Đối chiếu lương Power Query", huongdan: "Hướng dẫn & Quy chế lương" };
  function updateNav() { document.querySelectorAll("#nav button[data-k]").forEach(function (b) { var k = b.getAttribute("data-k"), n = $(".n", b); if (n && ALL[k]) n.textContent = countOf(k); }); }
  function periodBox() {
    var m = h("select"), y = h("input", { class: "i", type: "number", style: "width:80px", value: st.nam });
    for (var i = 1; i <= 12; i++) m.appendChild(h("option", { value: i, text: "Tháng " + i }));
    m.value = st.thang;
    var ch = function () { st.thang = +m.value; st.nam = +y.value || st.nam; st.kq = null; st.pg = {}; saveUi(); render(); };
    m.addEventListener("change", ch); y.addEventListener("change", ch);
    return h("div", { class: "period" }, [h("label", { text: "Kỳ lương" }), m, y]);
  }
  function sideFoot(ver) {
    var f = $("#sidefoot"); f.innerHTML = "";
    f.appendChild(h("button", { class: "themebtn", type: "button", on: { click: toggleTheme } }, [curTheme() === "dark" ? "🏖 Giao diện sáng" : "🌙 Giao diện tối"]));
    var skinSelect = h("select", { class: "themebtn hak-skin-select", "aria-label": "Chọn phong cách giao diện", title: "Bộ giao diện HAK Enterprise V10.4" });
    HAK_SKINS.forEach(function (v) { var o = h("option", { value: v[0], text: v[1] }); if (curSkin() === v[0]) o.selected = true; skinSelect.appendChild(o); });
    skinSelect.addEventListener("change", function () { setSkin(skinSelect.value); });
    f.appendChild(skinSelect);
    f.appendChild(h("div", { class: "ver", "data-storage-label": ver, text: ver }));
  }
  /** Tìm nhanh (Ctrl+K): màn hình, nhân viên, báo cáo — gõ không dấu cũng được, Enter để mở. */
  function quickSearch() {
    if (!session || loadError) return;
    var items = [];
    NAV.forEach(function (n) { if (n[0] !== "grp" && tabAllowed(n[0])) items.push({ ic: n[1], t: n[2], s: "Màn hình", go: function () { st.tab = n[0]; } }); });
    if (tabAllowed("baocao")) BC.forEach(function (b) { items.push({ ic: "📊", t: b[1].replace(/^\S+\s/, ""), s: "Báo cáo nhân sự", go: function () { st.tab = "baocao"; st.bc = b[0]; } }); });
    if (tabAllowed("nv")) db.nhanvien.forEach(function (nv) { items.push({ ic: "👤", t: (nv["Mã NV"] || "") + " · " + (nv["Họ và tên"] || ""), s: nv["Trạng thái"] || "Nhân viên", go: function () { st.tab = "nv"; st.nv = nv["Mã NV"]; st.nvTab = "canhan"; } }); });
    items.push({ ic: "🌙", t: "Đổi giao diện sáng / tối", s: "Giao diện", go: null, act: toggleTheme });
    if (FILES) items.push({ ic: "📂", t: "File đã tải (Excel, báo cáo, phiếu lương)", s: "Mở file / thư mục", go: null, act: filesDrawer });
    items.forEach(function (it) { it.k = fold(it.t + " " + it.s); });
    var body = h("div", { class: "cmdk" }), inp = h("input", { type: "search", placeholder: "Gõ tên màn hình, mã / tên nhân viên, báo cáo… (không dấu cũng được)", "aria-label": "Tìm nhanh" }), ul = h("ul", { role: "listbox" });
    body.appendChild(inp); body.appendChild(ul);
    var close = modal("Tìm nhanh", body), shown = [], sel = 0;
    var open = function (it) { close(); if (it.act) { it.act(); return; } it.go(); saveUi(); render(); };
    var draw = function () {
      var q = fold(inp.value).trim().split(/\s+/).filter(Boolean);
      shown = items.filter(function (it) { return q.every(function (w) { return it.k.indexOf(w) >= 0; }); }).slice(0, 40);
      if (sel >= shown.length) sel = 0;
      ul.innerHTML = "";
      if (!shown.length) ul.appendChild(h("li", { class: "empty", text: "Không tìm thấy" }));
      shown.forEach(function (it, i) { ul.appendChild(h("li", {}, [h("button", { type: "button", class: i === sel ? "on" : "", on: { click: function () { open(it); } } }, [it.ic + " " + it.t, h("small", { text: it.s })])])); });
    };
    inp.addEventListener("input", function () { sel = 0; draw(); });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); draw(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
      else if (e.key === "Enter" && shown[sel]) { e.preventDefault(); open(shown[sel]); }
      else if (e.key === "Escape") close();
    });
    draw(); setTimeout(function () { inp.focus(); }, 30);
  }
  // ---------- File đã tải (2.0-α16): Excel / báo cáo / phiếu lương lưu vào 1 thư mục, mở file hoặc mở thư mục ngay trong app ----------
  var FILES = window.hakFiles || null; // chỉ có ở bản cài (.exe); trình duyệt thì tải file theo cách của trình duyệt
  function openFile(name) { if (!FILES.open(name)) fileGone(); }
  function showFile(name) { if (!FILES.show(name)) fileGone(); }
  /** Thẻ báo sau mỗi lần tải: tên file + nơi lưu + [Mở file] [Mở thư mục] */
  function downloadCard(info) {
    var old = $("#dlcard"); if (old) old.remove();
    var c = h("div", { id: "dlcard", class: info.ok ? "" : "bad", role: "status" });
    var close = function () { c.remove(); };
    if (info.ok) {
      c.appendChild(h("div", { class: "t" }, ["✓ Đã lưu file", btn("✕", "ghost", close)]));
      c.appendChild(h("div", { class: "nm", text: info.name, title: info.name }));
      c.appendChild(h("div", { class: "hint", text: "Tại: " + info.dir + (info.opened ? " — đã mở thư mục, chọn sẵn file" : "") }));
      c.appendChild(h("div", { class: "bar" }, [btn("📄 Mở file", "pri", function () { openFile(info.name); close(); }), btn("📂 Mở thư mục", "", function () { showFile(info.name); close(); }), btn("Xem file đã tải", "ghost", function () { close(); filesDrawer(); })]));
    } else {
      c.appendChild(h("div", { class: "t" }, ["⚠ Không lưu được file", btn("✕", "ghost", close)]));
      c.appendChild(h("div", { class: "hint", text: (info.name || "") + " — " + (info.state === "blocked" ? "BỊ CHẶN bởi tiến trình chính: kỳ còn lỗi chặn xuất bảng lương (" + (info.blocked || "") + "). Sửa rồi tính lại." : info.state === "cancelled" ? "đã hủy" : "lỗi khi ghi file (thư mục lưu có thể không ghi được; đổi thư mục trong “File đã tải”)") }));
    }
    ($("#app") || document.body).appendChild(c); // trong #app: icon SVG tự đổi như các nút khác
    clearTimeout(downloadCard.t); downloadCard.t = setTimeout(close, 12000);
  }
  if (FILES) FILES.onDone(downloadCard);
  /** Ngăn "File đã tải": danh sách file trong thư mục lưu, mở / mở thư mục, đổi thư mục lưu */
  function filesDrawer() {
    if (!FILES) return;
    var body = h("div", { class: "files" }), closeFn = null;
    var draw = function () {
      var inf = FILES.info(); body.innerHTML = "";
      if (!inf || !inf.ok) { body.appendChild(h("div", { class: "warn", text: "Không đọc được thư mục lưu: " + ((inf && inf.error) || "") })); return; }
      body.appendChild(h("div", { class: "fdir" }, [h("span", { class: "hint", text: "Thư mục lưu" }), h("b", { text: inf.dir, title: inf.dir })]));
      var cb = h("input", { type: "checkbox" }); cb.checked = inf.openAfterDownload;
      cb.addEventListener("change", function () { FILES.setOpenAfter(cb.checked); toast(cb.checked ? "Tải xong sẽ tự mở thư mục" : "Tải xong chỉ báo trong app, không tự mở thư mục"); });
      body.appendChild(h("label", { class: "chk" }, [cb, " Tự mở thư mục (chọn sẵn file) sau mỗi lần tải"]));
      if (!inf.files.length) { body.appendChild(h("div", { class: "empty", text: "Chưa có file nào. Bấm xuất Excel / báo cáo / phiếu lương — file sẽ lưu vào thư mục trên." })); return; }
      var ul = h("ul", { class: "flist" });
      inf.files.forEach(function (f) {
        var ext = (f.name.split(".").pop() || "").toLowerCase();
        ul.appendChild(h("li", {}, [h("span", { class: "fx x-" + ext, text: ext.toUpperCase() }),
          h("div", { class: "fm" }, [h("b", { text: f.name, title: f.name }), h("small", { text: fmtTime(f.mtime) + " · " + fmtSize(f.size) })]),
          btn("Mở", "", function () { openFile(f.name); }, "Mở bằng Excel / ứng dụng mặc định"), btn("📂", "ghost", function () { showFile(f.name); }, "Mở thư mục, chọn sẵn file này")]));
      });
      body.appendChild(ul);
    };
    draw();
    closeFn = modal("📂 File đã tải", body, function (close) {
      return [btn("📂 Mở thư mục", "pri", function () { if (!FILES.openDir()) toast("Không mở được thư mục"); }),
        btn("Đổi thư mục lưu…", "", function () { var r = FILES.chooseDir(); if (r && r.ok) { toast("Từ giờ file lưu vào: " + r.dir); audit("Đổi thư mục lưu file xuất", ""); draw(); } else if (r && r.error) toast(r.error); }),
        btn("Dùng thư mục mặc định", "ghost", function () { var r = FILES.resetDir(); if (r && r.ok) { toast("Dùng thư mục mặc định: " + r.dir); draw(); } }),
        btn("Đóng", "", close)];
    }, { drawer: true });
    return closeFn;
  }
  /** V9: quyền do TIẾN TRÌNH CHÍNH quyết định. Giao diện chỉ hỏi lại; nếu main đã thu hồi/hết hạn phiên → đăng xuất. */
  var sessChecked = 0;
  function syncSession() {
    if (!store || !store.authState || !session) return;
    var t = Date.now(); if (t - sessChecked < 2000) return; sessChecked = t;
    try { var r = store.authState(); if (r && !r.ok) { session = null; toast("Phiên đăng nhập đã hết hiệu lực hoặc quyền đã bị thu hồi — đăng nhập lại"); } } catch (e) { /* lần vẽ sau thử lại */ }
  }
  function render() {
    if(st.tab !== "backup" && window.hakYears) window.hakYears.release().catch(function(){});
    if (window.HAKUI && window.HAKUI.filter) window.HAKUI.filter.close();
    syncSession();
    try { renderInner(); }
    catch (e) {
      var m = $("#main"); if (!m) return;
      m.innerHTML = "";
      m.appendChild(h("div", { class: "card" }, [h("h3", { text: "⚠ Có lỗi khi hiển thị màn hình này" }),
        h("div", { class: "warn", text: String(e && e.message || e) }),
        h("div", { class: "hint", text: "Dữ liệu KHÔNG bị mất. Hãy quay về Trang chủ; nếu lỗi lặp lại, bấm Sao lưu ra file và gửi file + ảnh màn hình cho người hỗ trợ." }),
        h("div", { class: "bar" }, [btn("🏠 Về Trang chủ", "pri", function () { st.tab = "home"; render(); }), btn("⬇ Sao lưu ra file", "", function () { if (!need("backup.restore", "sao lưu toàn bộ dữ liệu ra file")) return; download("LuongHAK_backup_" + HRM.today() + ".json", "application/json", JSON.stringify(db)); if (store && store.noteExternal) store.noteExternal(); })])]));
      if (window.console) console.error(e);
    }
  }
  function renderInner() {
    applySkin(curSkin()); applyTheme(curTheme());
    if (loadError) { $("#nav").innerHTML = ""; $("#top").innerHTML = "<h2>Khôi phục dữ liệu</h2>"; var mm = $("#main"); mm.innerHTML = ""; mm.appendChild(recoveryScreen()); return; }
    if (!session) {
      // Chưa đăng nhập: không hiện menu, không hiện dữ liệu nào
      $("#nav").innerHTML = ""; var t0 = $("#top"); t0.innerHTML = ""; t0.appendChild(h("h2", { text: !(db.nguoidung || []).length ? "Thiết lập ban đầu" : "Đăng nhập" }));
      var m0 = $("#main"); m0.innerHTML = "";
      m0.appendChild(!(db.nguoidung || []).length ? setupAdminScreen() : st.authView === "recover" ? recoverAdminScreen() : loginScreen());
      sideFoot(""); return;
    }
    if (!readOnly && can("input.edit")) C.inputReview.initialize(db);
    if (!tabAllowed(st.tab)) st.tab = "home";
    var nav = $("#nav"); nav.innerHTML = "";
    var activeNav = st.tab === "slips" && st.kqFull ? "luong" : (st.tab === "nv" ? "nhansu" : st.tab);
    // Navigation accordion: persistent presentation preference, no payroll/database mutation.
    var collapsed = {};
    try { collapsed = JSON.parse(localStorage.getItem(KEY + "_nav_collapsed") || "{}") || {}; } catch (e) { collapsed = {}; }
    var groupKey = "", groupLabel = "", groupIndex = 0;
    NAV.forEach(function (n, i) {
      if (n[0] === "grp") {
        groupKey = "group_" + (++groupIndex);
        groupLabel = n[1];
        var visible = false, containsActive = false, groupCount = 0;
        for (var j = i + 1; j < NAV.length && NAV[j][0] !== "grp"; j++) {
          if (tabAllowed(NAV[j][0])) { visible = true; groupCount++; if (activeNav === NAV[j][0]) containsActive = true; }
        }
        if (visible) {
          let gk = groupKey, gl = groupLabel, gc = groupCount;
          var isClosed = !!collapsed[gk] && !containsActive;
          var heading = h("button", { class: "grp hak-nav-group" + (isClosed ? " is-collapsed" : ""), type: "button", "aria-expanded": isClosed ? "false" : "true", title: "Thu gọn / mở rộng " + gl, on: { click: function () {
            var nowClosed = this.getAttribute("aria-expanded") === "true";
            collapsed[gk] = nowClosed;
            try { localStorage.setItem(KEY + "_nav_collapsed", JSON.stringify(collapsed)); } catch (e) {}
            render();
          } } }, [h("span", { text: gl }), h("span", { class: "hak-nav-group-count", text: String(gc) }), h("span", { class: "hak-nav-chevron", text: isClosed ? "▸" : "▾" })]);
          nav.appendChild(heading);
        }
        return;
      }
      if (!tabAllowed(n[0])) return;
      if (groupKey && collapsed[groupKey] && activeNav !== n[0]) {
        var activeInGroup = false;
        for (var k = i; k >= 0 && NAV[k][0] !== "grp"; k--) if (NAV[k][0] === activeNav) activeInGroup = true;
        if (!activeInGroup) return;
      }
      var b = h("button", { class: activeNav === n[0] ? "on" : "", "data-k": n[0], on: { click: function () { if (!leaveOk()) return; if (st.kqFull) { st.kq = st.kqFull; st.kqFull = null; } st.tab = n[0]; saveUi(); render(); } } }, [h("span", { class: "ic", text: n[1] }), h("span", { text: n[2] })]);
      if (S[n[0]]) b.appendChild(h("span", { class: "n", text: countOf(n[0]) }));
      if (n[0] === "kyluong") b.appendChild(h("span", { class: "n", text: db.kyluong.length }));
      if (n[0] === "nhansu") b.appendChild(h("span", { class: "n", text: db.nhanvien.filter(function (r) { return r["Trạng thái"] !== "Đã nghỉ việc"; }).length }));
      nav.appendChild(b);
    });
    sideFoot(store ? "Tự lưu ra file trên máy" : "Dữ liệu lưu trong trình duyệt");
    var bb = $(".brand small"); if (bb) bb.textContent = congTy()["Tên công ty"] || "Chạy offline";
    var top = $("#top"); top.innerHTML = "";
    var title = TITLES[st.tab] || (S[st.tab] && S[st.tab].ten) || "";
    top.appendChild(h("h2", { title: title, text: ["bangtinh", "rp_tonghop", "rp_pb", "rp_tncn", "rp_ctnv", "rp_thanhtoan", "rp_cttt", "rp_soct", "rp_ck", "rp_tm", "slips", "baocaoluong", "rp_ns", "rp_sl", "rp_bd", "rp_th", "rp_tu", "rp_com"].indexOf(st.tab) >= 0 ? String(title).toLocaleUpperCase("vi-VN") : title }));
    top.appendChild(h("button", { class: "topbtn srch", type: "button", "aria-label": "Tìm kiếm", title: "Tìm nhanh màn hình, nhân viên, báo cáo (Ctrl+K)", on: { click: quickSearch } }, ["🔍 Tìm kiếm", h("kbd", { text: "Ctrl K" })]));
    if (["nhansu", "nv", "dm", "caidat", "backup", "kyluong"].indexOf(st.tab) < 0) top.appendChild(periodBox());
    if (FILES) top.appendChild(h("button", { class: "topbtn", type: "button", "data-files": "1", title: "Xem / mở các file Excel, báo cáo đã tải", "aria-label": "File đã tải", on: { click: filesDrawer } }, ["📂", h("span", { class: "lbl", text: " File đã tải" })])); // 005B-UI001: chữ ẩn khi hẹp, giữ biểu tượng
    var roleName = (PERM.ROLES[session.vaiTro] || {}).ten || "vai trò không hợp lệ — liên hệ Admin";
    top.appendChild(h("span", { class: "who", text: roleName, title: session.hoTen + " · " + roleName, "data-user": session.tenDangNhap }));
    top.appendChild(h("button", { class: "topbtn icon", type: "button", title: "Đổi mật khẩu của " + session.hoTen, "aria-label": "Đổi mật khẩu", on: { click: function () { changePassword(false); } } }, ["🔑"]));
    top.appendChild(h("button", { class: "topbtn", type: "button", "data-logout": "1", title: "Đăng xuất", "aria-label": "Đăng xuất", on: { click: function () { logout(); } } }, ["⏻", h("span", { class: "lbl", text: " Đăng xuất" })]));
    top.appendChild(h("button", { class: "topbtn icon", type: "button", title: "Đổi giao diện sáng / tối", "aria-label": "Đổi giao diện sáng / tối", on: { click: toggleTheme } }, [curTheme() === "dark" ? "🏖" : "🌙"]));
    var m = $("#main"); m.innerHTML = ""; refreshNVList();
    if((db._yearArchives||[]).some(function(r){return r.active&&r.year===Number(st.nam);})&&st.tab!=="backup")m.appendChild(h("div",{class:"warn","data-archived-year-notice":"1"},[document.createTextNode("Hồ sơ năm "+st.nam+" đã nằm trong kho riêng. Dữ liệu năm này không được tải vào vùng đang làm. "),btn("Mở kho hồ sơ năm","",function(){st.tab="backup";saveUi();render();})]));
    if (st.tab === "home") m.appendChild(tabHome());
    else if (st.tab === "luong") m.appendChild(tabLuong());
    else if (st.tab === "bangtinh") m.appendChild(tabBangTinhNoiBo());
    else if (PAY_SCREENS[st.tab]) m.appendChild(tabPayReport(PAY_SCREENS[st.tab]));
    else if (OPS_SCREENS[st.tab]) m.appendChild(tabOpsReport(OPS_SCREENS[st.tab]));
    else if (st.tab === "slips") m.appendChild(tabSlips());
    else if (st.tab === "ocr") m.appendChild(tabOCR());
    else if (st.tab === "ocrlib") m.appendChild(tabOcrLib());
    else if (st.tab === "backup") m.appendChild(tabSaoLuu());
    else if (st.tab === "dm") m.appendChild(tabDanhMuc());
    else if (st.tab === "caidat") m.appendChild(tabCaiDat());
    else if (st.tab === "ktbl") m.appendChild(tabKiemTra());
    else if (st.tab === "nvns") m.appendChild(tabNghiepVuNS());
    else if (st.tab === "capphat") m.appendChild(tabCapPhat());
    else if (st.tab === "nhansu") m.appendChild(tabNhanSu());
    else if (st.tab === "nv") m.appendChild(tabNhanVien());
    else if (st.tab === "baocao") m.appendChild(tabBaoCao());
    else if (st.tab === "kyluong") m.appendChild(tabKyLuong());
    else if (st.tab === "baocaoluong") m.appendChild(tabBaoCaoLuong());
    else if (st.tab === "doichieu") m.appendChild(tabDoiChieu());
    else if (st.tab === "huongdan") m.appendChild(tabHuongDan());
    else if (S[st.tab]) m.appendChild(grid(st.tab, S[st.tab]));
    else { st.tab = "home"; render(); }
    if (st.hdModal) { if (st.tab === "nv" && !$("#modal").classList.contains("hide") && !$("#modal").classList.contains("drawer") && $("#modal").innerHTML) hdReopen(); else if (st.tab !== "nv") st.hdModal = null; }
  }
  // ---------- Cấp phát thống nhất: sữa phúc lợi + bảo hộ lao động ----------
  // Một nơi lập và nhập phiếu (Nghiệp vụ nhân sự → Cấp phát). Số liệu và quy tắc nằm ở C.benefits (dùng chung với tiến trình chính).
  var CP_TYPES = [["all", "Tất cả"], ["milk", "Sữa phúc lợi"], ["ppe", "Bảo hộ lao động"]];
  var CP_STATUS = [{ value: "draft", label: "Nháp" }, { value: "issued", label: "Đã cấp" }, { value: "recalled", label: "Đã thu hồi" }];
  /** Trạng thái giao diện: bộ lọc, trang, màn hình đang mở và nơi quay lại được giữ trong phiên (st.cp, st.pg.capphat). */
  function cpState() { return (st.cp = st.cp || { type: "all", view: "list", returnView: "list", mode: "summary", bySize: false, f: SFC.empty(), draft: null, open: null, back: null }); }
  function cpDeptOf() {
    var ix = HRM.buildIndex(db);
    return function (ma, date) { var hh = HRM.hienHanh(db, ma, date, ix); return hh && hh.pb ? { code: hh.pb, name: hh.tenPB || hh.pb } : null; };
  }
  /** Bộ lọc dùng chung cho danh sách phiếu và báo cáo (HAK Smart Filter). */
  function cpFilters() {
    var s = SFC.normalize(cpState().f);
    return { q: s.q, tu: s.tu, den: s.den, thang: s.one.thang || "", dept: s.sel.pb || [], place: s.sel.dd || [], item: s.sel.mh || [], size: s.sel.co || [], status: s.sel.tt || [] };
  }
  function cpMilkItems() {
    var seen = {}, out = [];
    (db.benefitStandards || []).slice().sort(function (a, b) { return String(a.from).localeCompare(String(b.from)); }).forEach(function (rule) {
      rule.items.forEach(function (item) { seen[item.code] = { value: item.code, label: item.name, unit: item.unit }; });
    });
    Object.keys(seen).sort().forEach(function (k) { out.push(seen[k]); });
    return out;
  }
  function cpPpeItems(onlyActive) { return (db.benefitPpeItems || []).filter(function (item) { return !onlyActive || item.active !== false; }); }
  function cpItemsFor(type, keep) {
    if (type === "ppe") return cpPpeItems(true).concat(cpPpeItems(false).filter(function (item) { return item.active === false && item.code === keep; })).map(function (item) { return { value: item.code, label: item.name + (item.active === false ? " (ngừng sử dụng)" : ""), unit: item.unit, sizes: item.sizes || [] }; });
    return cpMilkItems().map(function (item) { return { value: item.value, label: item.label, unit: item.unit, sizes: [] }; });
  }
  function cpPeriods() {
    var set = {}; set[kyStr()] = 1;
    (db.benefitIssues || []).forEach(function (doc) { if (doc.period) set[doc.period] = 1; });
    return Object.keys(set).sort().reverse().map(function (k) { return { value: k, label: "Tháng " + k.slice(5) + "/" + k.slice(0, 4) }; });
  }
  function cpConfig(onApply, kept) {
    var distinct = function (fn) { return function () { var d = {}; (db.benefitIssues || []).forEach(function (doc) { var v = fn(doc); if (v) d[v] = 1; }); return Object.keys(d).sort(); }; };
    var all = function (x) { return x; };
    return {
      screenId: "capphat", searchPlaceholder: "🔍 Tìm mã phiếu, mã hoặc tên nhân viên (không cần dấu)…",
      fields: [
        { key: "tt", label: "Trạng thái", type: "multi", options: CP_STATUS },
        { key: "thang", label: "Tháng hưởng", type: "enum", options: function () { return cpPeriods().map(function (p) { return { value: p.value, label: p.label }; }); } },
        { key: "pb", label: "Phòng ban / tổ", type: "multi", options: function () { return (db.dm_phongban || []).map(function (r) { return { value: r["Mã phòng ban"], label: r["Tên phòng ban"] || r["Mã phòng ban"] }; }); } },
        { key: "dd", label: "Địa điểm", type: "multi", options: distinct(function (doc) { return doc.place; }) },
        { key: "mh", label: "Mặt hàng", type: "multi", options: function () { return cpMilkItems().map(function (i) { return { value: i.value, label: i.label + " (sữa)" }; }).concat(cpPpeItems(false).map(function (i) { return { value: i.code, label: i.name + " (bảo hộ)" }; })); } },
        { key: "co", label: "Kích cỡ", type: "multi", options: function () { var d = {}; cpPpeItems(false).forEach(function (i) { (i.sizes || []).forEach(function (sz) { d[sz] = 1; }); }); return Object.keys(d).sort().map(all); } }
      ],
      quickFields: ["q", "period", "tt", "pb"], advancedFields: ["q", "period", "thang", "tt", "pb", "dd", "mh", "co"],
      periods: cpPeriods, periodNoneLabel: "Ngày giao: tất cả", scopeFallback: function () { return "tất cả phiếu"; },
      state: { get: function () { return cpState().f; }, set: function (s) { cpState().f = s; } },
      dataSource: function () { return { kept: kept().kept, total: kept().total, unsupported: [] }; },
      onApply: function () { st.pg.capphat = 0; onApply(); }
    };
  }
  /** Mở phiếu gốc bằng cùng màn chi tiết; back = nơi quay lại (hồ sơ nhân viên, báo cáo…). Bộ lọc và trang trước đó được giữ nguyên. */
  function cpOpen(id, back) {
    var s = cpState(), doc = (db.benefitIssues || []).find(function (row) { return row.id === id; });
    if (!doc) { toast("Không tìm thấy phiếu " + id); return; }
    if (s.view !== "detail") s.returnView = s.view;
    s.view = "detail"; s.open = id; s.back = back || null;
    s.draft = doc.status === "draft" && can("hr.edit") && doc.maker === session.tenDangNhap.toLowerCase() ? cpDraftOf(doc) : null;
    st.tab = "capphat"; render();
  }
  function cpClose() {
    var s = cpState(), back = s.back;
    s.view = s.returnView || "list"; s.open = null; s.draft = null; s.back = null;
    if (back && back.tab) st.tab = back.tab;
    render();
  }
  function cpGoto(type) { var s = cpState(); s.type = type || "all"; s.view = "list"; s.open = null; s.draft = null; st.tab = "capphat"; render(); }
  function cpDraftOf(doc) {
    return { isNew: false, type: C.benefits.docType(doc), id: doc.id, date: doc.date, place: doc.place || "", purpose: doc.purpose || "", note: doc.note || "", maker: doc.maker,
      lines: (doc.lines || []).map(function (l) { return { employee: l.employee, item: l.item, size: l.size || "", quantity: l.quantity, note: l.note || "" }; }) };
  }
  function cpSuggestId(type) {
    var prefix = (type === "ppe" ? "BH-" : "SUA-") + HRM.today().replace(/-/g, ""), n = 1, ids = {};
    (db.benefitIssues || []).forEach(function (doc) { ids[doc.id] = 1; });
    while (ids[prefix + "-" + ("0" + n).slice(-2)]) n++;
    return prefix + "-" + ("0" + n).slice(-2);
  }
  function cpNewVoucher(type) {
    var s = cpState();
    if (s.view !== "detail") s.returnView = s.view;
    s.view = "detail"; s.open = "new"; s.back = null;
    s.draft = { isNew: true, type: type, id: cpSuggestId(type), date: HRM.today(), place: "", purpose: "", note: "", maker: session.tenDangNhap.toLowerCase(), lines: [] };
    render();
  }
  function cpStatusText(doc) { return C.benefits.STATUS_LABEL[doc.status] || doc.status; }

  // ---------- Danh sách phiếu ----------
  function cpVoucherList() {
    var s = cpState(), box = h("div"), bar = h("div", { class: "bar" }), tw = h("div", { class: "tw" }), kept = { kept: 0, total: 0 }, sf = null;
    if (can("hr.edit")) {
      CP_TYPES.slice(1).filter(function (t) { return s.type === "all" || s.type === t[0]; }).forEach(function (t) { bar.appendChild(btn("＋ Lập phiếu " + t[1].toLowerCase(), "pri", function () { cpNewVoucher(t[0]); })); });
      bar.appendChild(btn("⬆ Nhập Excel", "", function () { cpImportFlow(s.type === "all" ? "" : s.type); }, "Nhập phiếu từ file Excel mẫu: xem trước theo phiếu rồi lưu nháp"));
    }
    CP_TYPES.slice(1).filter(function (t) { return s.type === "all" || s.type === t[0]; }).forEach(function (t) { bar.appendChild(btn("📄 Tải mẫu " + t[1].toLowerCase(), "", function () { cpDownloadTemplate(t[0]); })); });
    box.appendChild(bar);
    var deptOf = cpDeptOf();
    sf = sfUi.mount(cpConfig(draw, function () { return kept; })); sf.cfg = null;
    box.appendChild(sf.el); box.appendChild(tw);
    function draw() {
      tw.innerHTML = "";
      var rows = C.benefits.listVouchers(db, { type: s.type, filters: cpFilters(), deptOf: deptOf });
      kept.kept = rows.length; kept.total = (db.benefitIssues || []).filter(function (doc) { return s.type === "all" || C.benefits.docType(doc) === s.type; }).length; sf.refresh();
      if (!rows.length) { tw.appendChild(h("div", { class: "empty", html: kept.total ? "Không có phiếu khớp bộ lọc." : "Chưa có phiếu cấp phát nào.<br>Bấm <b>＋ Lập phiếu</b> hoặc <b>⬆ Nhập Excel</b>." })); return; }
      var pg = pager("capphat", rows.length, draw); if (pg.el) tw.appendChild(pg.el);
      var cols = ["Mã phiếu", "Loại", "Ngày cấp", "Địa điểm", "Số người nhận", "Trạng thái", "Người lập", "Người xác nhận"], t = h("table"), tr = h("tr");
      cols.forEach(function (c) { tr.appendChild(h("th", { class: c === "Số người nhận" ? "r" : "", text: c })); }); t.appendChild(h("thead", {}, [tr]));
      var tb = h("tbody");
      rows.slice(pg.start, pg.end).forEach(function (r) {
        var x = h("tr", { "data-cp-voucher": r.id });
        x.appendChild(h("td", {}, [btn(r.id, "ghost", function () { cpOpen(r.id); }, "Mở chi tiết phiếu")]));
        [C.benefits.LABEL[r.type], fmtDate(r.date), r.place, r.people, C.benefits.STATUS_LABEL[r.status] || r.status, r.maker, r.reviewer].forEach(function (v, i) { x.appendChild(h("td", { class: i === 3 ? "r" : "t", text: v })); });
        tb.appendChild(x);
      });
      t.appendChild(tb); tw.appendChild(h("div", { class: "tw" }, [t]));
    }
    draw();
    return box;
  }

  // ---------- Chi tiết phiếu: thông tin phiếu · người nhận · thao tác ----------
  function cpVoucherDetail() {
    var s = cpState(), doc = (db.benefitIssues || []).find(function (row) { return row.id === s.open; }) || null, d = s.draft, box = h("div", { "data-cp-detail": "1" });
    var type = d ? d.type : (doc ? C.benefits.docType(doc) : "milk"), me = session.tenDangNhap.toLowerCase();
    var back = h("div", { class: "bar" }, [btn("← " + (s.back && s.back.label ? "Quay lại " + s.back.label : "Quay lại danh sách"), "", cpClose)]);
    if (!doc && !d) { box.appendChild(back); box.appendChild(h("div", { class: "empty", text: "Không tìm thấy phiếu." })); return box; }
    box.appendChild(back);
    box.appendChild(h("h3", { text: (doc ? "Phiếu " + doc.id + " — " + cpStatusText(doc) : "Phiếu mới " + (type === "ppe" ? "bảo hộ lao động" : "sữa phúc lợi")) }));
    var editable = !!d;
    // ----- 1. Thông tin phiếu -----
    var info = h("div", { class: "card", "data-cp-zone": "info" }), grid = h("div", { class: "bar" });
    info.appendChild(h("h4", { text: "1. Thông tin phiếu" }));
    var field = function (label, key, kind, value, ro) {
      var input = h("input", { class: "i", type: kind || "text", value: value == null ? "" : value, "aria-label": label });
      if (!editable || ro) { input.setAttribute("readonly", "readonly"); }
      else input.addEventListener("change", function () { d[key] = input.value.trim(); if (key === "date") { redrawLines(); } });
      grid.appendChild(h("label", { class: "fld" }, [label, input])); return input;
    };
    field("Mã phiếu", "id", "text", d ? d.id : doc.id, d && !d.isNew);
    grid.appendChild(h("label", { class: "fld" }, ["Loại cấp phát", h("input", { class: "i", value: C.benefits.LABEL[type], readonly: "readonly", "aria-label": "Loại cấp phát" })]));
    field("Ngày giao", "date", "date", d ? d.date : doc.date);
    field("Địa điểm", "place", "text", d ? d.place : doc.place);
    field("Lý do", "purpose", "text", d ? d.purpose : doc.purpose);
    field("Ghi chú", "note", "text", d ? d.note : doc.note);
    if (doc) { grid.appendChild(h("label", { class: "fld" }, ["Người lập / xác nhận", h("input", { class: "i", value: (doc.maker || "") + (doc.reviewer ? " → " + doc.reviewer : ""), readonly: "readonly", "aria-label": "Người lập và xác nhận" })])); }
    info.appendChild(grid); box.appendChild(info);
    // ----- 2. Người nhận -----
    var recv = h("div", { class: "card", "data-cp-zone": "lines" }); recv.appendChild(h("h4", { text: "2. Danh sách người nhận" }));
    var linesHost = h("div", { class: "tw" });
    var deptOf = cpDeptOf();
    function itemInfo(code) { return cpItemsFor(type, code).filter(function (i) { return i.value === code; })[0] || null; }
    function redrawLines() {
      linesHost.innerHTML = "";
      var lines = d ? d.lines : (doc.lines || []), date = d ? d.date : doc.date, preview = null;
      if (type === "milk" && d && d.id && /^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
        var tmp = { id: d.id, type: "milk", date: d.date, period: d.date.slice(0, 7), lines: d.lines.filter(function (l) { return l.employee && l.item && l.quantity > 0; }).map(function (l) { return { employee: l.employee, item: l.item, quantity: Number(l.quantity) }; }) };
        try { preview = C.benefits.reviewIssue(Object.assign({}, db, { benefitIssues: (db.benefitIssues || []).filter(function (row) { return row.id !== d.id; }) }), tmp); } catch (e) { preview = null; }
      }
      var cols = ["Mã NV", "Họ và tên", "Tổ/Phòng ban tại ngày giao", "Mặt hàng", "Đơn vị"].concat(type === "ppe" ? ["Kích cỡ"] : [], ["Số lượng"], type === "milk" ? ["Định mức", "Đã cấp trước phiếu", "Còn trước", "Còn sau"] : [], ["Ghi chú"], editable ? [""] : []);
      var t = h("table", { "data-cp-lines": "1" }), tr = h("tr"); cols.forEach(function (c) { tr.appendChild(h("th", { text: c })); }); t.appendChild(h("thead", {}, [tr]));
      var tb = h("tbody");
      lines.forEach(function (l, idx) {
        var row = h("tr"), emp = (db.nhanvien || []).find(function (r) { return r["Mã NV"] === l.employee; });
        var dept = l.deptName != null ? l.deptName : ((deptOf(l.employee, date) || {}).name || "");
        var item = itemInfo(l.item), td = function (node) { row.appendChild(h("td", {}, [node])); }, text = function (v, cls) { row.appendChild(h("td", { class: cls || "t", text: v == null ? "" : v })); };
        if (editable) {
          var code = h("input", { class: "i", value: l.employee || "", list: "cp-employees", "aria-label": "Mã NV", style: "min-width:90px" });
          code.addEventListener("change", function () { l.employee = code.value.trim(); redrawLines(); }); td(code);
        } else text(l.employee);
        text(l.employeeName != null ? l.employeeName : (emp ? emp["Họ và tên"] : "")); text(dept);
        if (editable) {
          var sel = h("select", { "aria-label": "Mặt hàng" }, [h("option", { value: "", text: "Chọn mặt hàng" })].concat(cpItemsFor(type, l.item).map(function (i) { return h("option", { value: i.value, text: i.label }); })));
          sel.value = l.item || ""; sel.addEventListener("change", function () { l.item = sel.value; l.size = ""; redrawLines(); }); td(sel);
        } else text(l.itemName || (item ? item.label : l.item));
        text(l.unit || (item ? item.unit : ""));
        if (type === "ppe") {
          if (editable && item && item.sizes.length) {
            var sz = h("select", { "aria-label": "Kích cỡ" }, [h("option", { value: "", text: "Chọn cỡ" })].concat(item.sizes.map(function (v) { return h("option", { value: v, text: v }); })));
            sz.value = l.size || ""; sz.addEventListener("change", function () { l.size = sz.value; }); td(sz);
          } else text(l.size || (item && item.sizes.length ? "(cần chọn cỡ)" : ""));
        }
        if (editable) {
          var q = h("input", { class: "i", type: "number", min: "1", step: "1", value: l.quantity == null ? "" : l.quantity, "aria-label": "Số lượng", style: "width:80px" });
          q.addEventListener("change", function () { l.quantity = q.value === "" ? "" : Number(q.value); redrawLines(); }); td(q);
        } else text(l.quantity, "r");
        if (type === "milk") {
          var ent = preview && preview.entries.filter(function (e) { return e.employee === l.employee && e.item === l.item; })[0];
          [ent ? ent.allowance : "", ent ? ent.allowance - ent.before : "", ent ? ent.before : "", ent ? ent.after : ""].forEach(function (v) { text(v, "r"); });
        }
        if (editable) { var note = h("input", { class: "i", value: l.note || "", "aria-label": "Ghi chú" }); note.addEventListener("change", function () { l.note = note.value; }); td(note); td(btn("Xóa", "ghost", function () { d.lines.splice(idx, 1); redrawLines(); })); }
        else text(l.note);
        tb.appendChild(row);
      });
      t.appendChild(tb); linesHost.appendChild(lines.length ? t : h("div", { class: "empty", text: "Chưa có người nhận." }));
      if (preview && preview.issues.length) linesHost.appendChild(h("div", { class: "warn", "data-cp-issues": "1" }, preview.issues.map(function (m) { return h("div", { text: m }); })));
    }
    if (editable) {
      var list = h("datalist", { id: "cp-employees" }); (db.nhanvien || []).forEach(function (r) { list.appendChild(h("option", { value: r["Mã NV"], label: r["Họ và tên"] || "" })); }); recv.appendChild(list);
      var tools = h("div", { class: "bar" });
      tools.appendChild(btn("＋ Thêm dòng", "", function () { d.lines.push({ employee: "", item: "", size: "", quantity: 1, note: "" }); redrawLines(); }));
      var dept = h("select", { "aria-label": "Tổ cấp phát" }, [h("option", { value: "", text: "Chọn tổ / phòng ban" })].concat((db.dm_phongban || []).map(function (r) { return h("option", { value: r["Mã phòng ban"], text: r["Tên phòng ban"] || r["Mã phòng ban"] }); })));
      var item = h("select", { "aria-label": "Mặt hàng cấp theo tổ" }, [h("option", { value: "", text: "Mặt hàng" })].concat(cpItemsFor(type).map(function (i) { return h("option", { value: i.value, text: i.label }); })));
      var size = h("select", { "aria-label": "Kích cỡ cấp theo tổ" }, [h("option", { value: "", text: "Kích cỡ" })]);
      item.addEventListener("change", function () { size.innerHTML = ""; size.appendChild(h("option", { value: "", text: "Kích cỡ" })); var info0 = itemInfo(item.value); (info0 ? info0.sizes : []).forEach(function (v) { size.appendChild(h("option", { value: v, text: v })); }); });
      var qty = h("input", { class: "i", type: "number", min: "1", step: "1", value: "1", "aria-label": "Số lượng mỗi người", style: "width:90px" });
      tools.appendChild(h("span", { class: "hint", style: "margin:0", text: "Chọn nhanh theo tổ:" })); [dept, item].forEach(function (e) { tools.appendChild(e); });
      if (type === "ppe") tools.appendChild(size);
      tools.appendChild(qty);
      tools.appendChild(btn("Điền cho cả tổ", "", function () {
        var info0 = itemInfo(item.value), n = Number(qty.value);
        if (!dept.value || !item.value || !Number.isSafeInteger(n) || n <= 0 || (type === "ppe" && info0 && info0.sizes.length && !size.value)) { alert("Chọn tổ, mặt hàng" + (type === "ppe" ? ", kích cỡ (nếu có)" : "") + " và số lượng nguyên dương."); return; }
        var have = {}; d.lines.forEach(function (l) { have[l.employee + "|" + l.item + "|" + (l.size || "")] = 1; });
        var added = 0;
        (db.nhanvien || []).forEach(function (r) {
          var ma = r["Mã NV"]; if (r["Trạng thái"] && r["Trạng thái"] !== "Đang làm việc") return;
          var hh = HRM.hienHanh(db, ma, d.date); if (hh.pb !== dept.value || have[ma + "|" + item.value + "|" + (type === "ppe" ? size.value : "")]) return;
          if (type === "milk" && !C.benefits.entitlement(db, ma, d.date.slice(0, 7)).some(function (e) { return e.code === item.value && e.allowance > 0; })) return;
          d.lines.push({ employee: ma, item: item.value, size: type === "ppe" ? size.value : "", quantity: n, note: "" }); added++;
        });
        if (!added) alert("Không có thêm người phù hợp trong tổ."); else toast("Đã thêm " + added + " người — sửa từng dòng nếu cần.");
        redrawLines();
      }));
      recv.appendChild(tools);
    }
    recv.appendChild(linesHost); box.appendChild(recv); redrawLines();
    // ----- 3. Thao tác -----
    var act = h("div", { class: "card", "data-cp-zone": "actions" }), bar = h("div", { class: "bar" });
    act.appendChild(h("h4", { text: "3. Thao tác" }));
    var mode = C.workflowApproval.mode(db), canConfirm = doc && (mode === "roles" ? can("hr.approve") && doc.maker !== me : can("system.admin"));
    if (d) {
      bar.appendChild(btn("Lưu nháp", "pri", function () { cpSaveDraft(d); }));
      bar.appendChild(btn("Bỏ thay đổi", "", cpClose));
    }
    if (doc && doc.status === "draft") {
      if (canConfirm) bar.appendChild(btn("Xác nhận cấp phát", "pri", function () { cpTransition(doc, { status: "issued", reviewer: me, confirmedAt: new Date().toISOString() }, "Xác nhận cấp phát"); }));
      else bar.appendChild(h("span", { class: "hint", "data-cp-confirm-hint": "1", style: "margin:0", text: mode === "roles" ? "Cần người có quyền xác nhận khác người lập." : "Cần quyền Quản trị để xác nhận." }));
      if (can("hr.edit") || canConfirm) bar.appendChild(btn("Hủy phiếu nháp", "ghost", function () {
        askText("Hủy phiếu nháp " + doc.id, "Ghi rõ lý do hủy.", { label: "Lý do", required: true }, function (reason) { cpTransition(doc, { status: "recalled", recalledBy: me, reason: reason }, "Hủy phiếu nháp"); });
      }));
    }
    if (doc && doc.status === "issued" && canConfirm) bar.appendChild(btn("Thu hồi / điều chỉnh", "", function () { cpAdjustDialog(doc); }, "Thu hồi một phần hoặc toàn bộ" + (type === "ppe" ? ", đổi cỡ" : "")));
    if (doc && doc.status === "issued" && !canConfirm) bar.appendChild(h("span", { class: "hint", style: "margin:0", text: "Thu hồi / điều chỉnh cần người có quyền xác nhận" + (mode === "roles" ? " khác người lập." : ".") }));
    if (doc && doc.status === "recalled") bar.appendChild(h("span", { class: "hint", style: "margin:0", text: "Phiếu đã thu hồi" + (doc.reason ? ": " + doc.reason : "") + "." }));
    act.appendChild(bar);
    var history = (db.benefitAdjustments || []).filter(function (adj) { return doc && adj.ref === doc.id; });
    if (history.length) {
      act.appendChild(h("h4", { text: "Lịch sử thu hồi / điều chỉnh" }));
      act.appendChild(simpleTable(history.map(function (adj) {
        return { "Thời điểm": C.benefits.adjustmentDate(adj) + " · ghi nhận " + C.benefits.adjustmentClock(adj.at) + " (giờ Việt Nam)", "Người thao tác": adj.by, "Loại": adj.kind === "resize" ? "Đổi cỡ" : "Thu hồi", "Lý do": adj.reason,
          "Chi tiết": adj.lines.map(function (l) { return l.employee + " · " + l.item + (l.size ? " cỡ " + l.size : "") + " × " + l.quantity; }).join("; ") + (adj.to && adj.to.length ? " → " + adj.to.map(function (l) { return "cỡ " + l.size + " × " + l.quantity; }).join("; ") : "") };
      })));
    }
    box.appendChild(act);
    return box;
  }
  function cpTransition(doc, patch, label) {
    benefitSave("benefitIssues", (db.benefitIssues || []).map(function (row) { return row.id === doc.id ? Object.assign({}, row, patch) : row; }), label, doc.id, function () { render(); });
  }
  function cpSaveDraft(d) {
    var id = String(d.id || "").trim();
    if (!id) { alert("Nhập mã phiếu."); return; }
    if (!VAL.normDate(d.date)) { alert("Ngày giao không hợp lệ."); return; }
    var lines = d.lines.filter(function (l) { return l.employee || l.item || l.quantity || l.note; }).map(function (l) { return { employee: l.employee, item: l.item, size: l.size || "", quantity: Number(l.quantity), note: l.note || "" }; });
    if (!lines.length) { alert("Phiếu chưa có người nhận."); return; }
    var others = (db.benefitIssues || []).filter(function (row) { return row.id !== id; });
    if (d.isNew && others.length !== (db.benefitIssues || []).length) { alert("Mã phiếu đã tồn tại."); return; }
    var doc = C.benefits.buildVoucher(db, { type: d.type, id: id, date: d.date, place: d.place, purpose: d.purpose, note: d.note, lines: lines, maker: d.maker }, cpDeptOf());
    if (d.type === "milk") doc.lines.forEach(function (l) { delete l.size; });
    var check = C.benefits.reviewIssue(Object.assign({}, db, { benefitIssues: others }), doc);
    if (check.issues.length) { modal("Phiếu chưa hợp lệ", h("div", {}, check.issues.map(function (m) { return h("p", { class: "warn", text: m }); })), function (close) { return [btn("Đóng", "", close)]; }); return; }
    var rows = d.isNew ? (db.benefitIssues || []).concat(doc) : (db.benefitIssues || []).map(function (row) { return row.id === id ? doc : row; });
    benefitSave("benefitIssues", rows, d.isNew ? "Lập phiếu cấp phát" : "Sửa phiếu nháp cấp phát", id, function () { var s = cpState(); s.open = id; s.draft = null; toast("Đã lưu nháp " + id); cpOpen(id, s.back); });
  }

  // ---------- Thu hồi một phần / đổi cỡ ----------
  function cpAdjustDialog(doc) {
    var type = C.benefits.docType(doc), rows = C.benefits.recallable(db, doc.id).filter(function (r) { return r.remaining > 0; }), me = session.tenDangNhap.toLowerCase();
    if (!rows.length) { alert("Phiếu này đã thu hồi hết."); return; }
    var table = h("table", { "data-cp-adjust": "1" }), tr = h("tr");
    ["Mã NV", "Họ và tên", "Mặt hàng", "Kích cỡ", "Đã cấp", "Đã thu hồi", "Còn lại", "Thu hồi", type === "ppe" ? "Đổi sang cỡ" : ""].filter(Boolean).forEach(function (c) { tr.appendChild(h("th", { text: c })); });
    table.appendChild(h("thead", {}, [tr]));
    var controls = [], tb = h("tbody");
    rows.forEach(function (r) {
      var line = doc.lines.filter(function (l) { return l.employee === r.employee && l.item === r.item && (l.size || "") === r.size; })[0] || {}, row = h("tr");
      var qty = h("input", { class: "i", type: "number", min: "0", max: String(r.remaining), step: "1", value: "0", "aria-label": "Số thu hồi " + r.employee + " " + r.item, style: "width:80px" });
      var newSize = null, catalog = (db.benefitPpeItems || []).filter(function (i) { return i.code === r.item; })[0];
      [r.employee, line.employeeName || tenNV(r.employee), line.itemName || r.item, r.size, r.issued, r.recalled, r.remaining].forEach(function (v, i) { row.appendChild(h("td", { class: i >= 4 ? "r" : "t", text: v })); });
      row.appendChild(h("td", {}, [qty]));
      if (type === "ppe") {
        newSize = h("select", { "aria-label": "Đổi sang cỡ " + r.employee + " " + r.item }, [h("option", { value: "", text: "— không đổi —" })].concat(((catalog && catalog.sizes) || []).filter(function (v) { return v !== r.size; }).map(function (v) { return h("option", { value: v, text: v }); })));
        row.appendChild(h("td", {}, [newSize]));
      }
      controls.push({ r: r, qty: qty, newSize: newSize }); tb.appendChild(row);
    });
    table.appendChild(tb);
    var transactionDate = h("input", { class: "i", type: "date", min: doc.date, value: C.benefits.adjustmentDate({ at: new Date().toISOString() }), "aria-label": "Ngày giao dịch thu hồi hoặc đổi cỡ" });
    var reason = h("input", { class: "i", "aria-label": "Lý do thu hồi hoặc điều chỉnh", placeholder: "Lý do (bắt buộc)", style: "min-width:320px" });
    modal("Thu hồi / điều chỉnh phiếu " + doc.id, h("div", {}, [h("p", { class: "hint", text: "Nhập số thu hồi cho từng dòng (không vượt số còn lại)." + (type === "ppe" ? " Chọn cỡ mới để ghi hai lượt: thu hồi cỡ cũ và cấp cỡ mới." : "") }), h("div", { class: "tw" }, [table]), h("label", { class: "fld" }, ["Ngày giao dịch", transactionDate]), h("label", { class: "fld" }, ["Lý do", reason])]), function (close) {
      return [btn("Hủy", "", close), btn("Ghi thu hồi / điều chỉnh", "pri", function () {
        var recall = [], resizeOut = [], resizeIn = [], why = reason.value.trim();
        controls.forEach(function (c) {
          var n = Number(c.qty.value); if (!n) return;
          if (!Number.isSafeInteger(n) || n < 0) { recall.push({ bad: true }); return; }
          var line = { employee: c.r.employee, item: c.r.item, size: c.r.size, quantity: n };
          if (c.newSize && c.newSize.value) { resizeOut.push(line); resizeIn.push({ employee: c.r.employee, item: c.r.item, size: c.newSize.value, quantity: n }); } else recall.push(line);
        });
        if (recall.some(function (l) { return l.bad; })) { alert("Số thu hồi phải là số nguyên dương."); return; }
        if (!why) { alert("Ghi lý do thu hồi hoặc điều chỉnh."); return; }
        if (!recall.length && !resizeOut.length) { alert("Chưa nhập số thu hồi nào."); return; }
        var seq = (db.benefitAdjustments || []).filter(function (a) { return a.ref === doc.id; }).length, at = new Date().toISOString(), made = [];
        var make = function (kind, lines, to) { seq++; var a = { id: "DC-" + doc.id + "-" + ("0" + seq).slice(-2), ref: doc.id, kind: kind, reason: why, by: me, at: at, date: transactionDate.value, lines: lines }; if (to) a.to = to; made.push(a); };
        if (recall.length) make("recall", recall);
        if (resizeOut.length) make("resize", resizeOut, resizeIn);
        var problem = made.map(function (a) { return C.benefits.adjustmentProblem(db, a); }).filter(Boolean)[0];
        if (problem) { alert(problem); return; }
        benefitSave("benefitAdjustments", (db.benefitAdjustments || []).concat(made), "Thu hồi / điều chỉnh phiếu phúc lợi", doc.id + " · " + why, function () { close(); render(); });
      })];
    }, { wide: true });
  }

  // ---------- Danh mục đồ bảo hộ lao động ----------
  function ppeCatalog() {
    var body = h("div", { "data-cp-ppe": "1" }), q = benefitField("Lọc mã, tên hoặc nhóm", "text", st.ppeQuery || "");
    q.input.addEventListener("change", function () { st.ppeQuery = q.input.value; render(); });
    body.appendChild(q.field);
    var items = cpPpeItems(false).filter(function (i) { return !st.ppeQuery || fold([i.code, i.name, i.group].join(" ")).indexOf(fold(st.ppeQuery)) >= 0; });
    var used = {}; (db.benefitIssues || []).forEach(function (doc) { (doc.lines || []).forEach(function (l) { used[l.item] = 1; }); });
    var rows = items.map(function (i) {
      var row = { "Mã vật tư": i.code, "Tên vật tư": i.name, "Nhóm hàng": i.group, "Đơn vị": i.unit, "Quy cách": i.spec || "", "Kích cỡ": (i.sizes || []).join(", "), "Trạng thái": i.active === false ? "Ngừng sử dụng" : "Đang sử dụng", "Đã cấp": used[i.code] ? "Có" : "" };
      if (can("dm.edit")) row["Thao tác"] = btn("Sửa", "ghost", function () { ppeDialog(i); });
      return row;
    });
    if (can("dm.edit")) body.appendChild(btn("＋ Thêm vật tư", "pri", function () { ppeDialog(null); }));
    body.appendChild(h("p", { class: "hint", text: "Vật tư đã cấp chỉ ngừng sử dụng (không xóa) để phiếu cũ vẫn tra cứu được. Đổi tên vật tư không làm đổi báo cáo cũ: phiếu giữ tên tại ngày cấp. Phạm vi đợt này: ghi nhận cấp phát thực tế; tồn kho và chu kỳ thay thế cần quy chế riêng." }));
    body.appendChild(simpleTable(rows));
    return body;
  }
  function ppeDialog(item) {
    var isNew = !item, code = benefitField("Mã vật tư", "text", item ? item.code : ""), name = benefitField("Tên vật tư", "text", item ? item.name : "");
    var group = h("select", { "aria-label": "Nhóm hàng" }, C.benefits.GROUPS.concat(item && C.benefits.GROUPS.indexOf(item.group) < 0 ? [item.group] : []).concat(["Nhóm khác"]).map(function (g) { return h("option", { value: g, text: g }); }));
    group.value = item ? item.group : C.benefits.GROUPS[0];
    var other = benefitField("Tên nhóm bổ sung", "text", ""), unit = benefitField("Đơn vị tính", "text", item ? item.unit : ""), spec = benefitField("Quy cách", "text", item ? item.spec || "" : ""), sizes = benefitField("Kích cỡ hợp lệ (cách nhau dấu phẩy; để trống nếu không có)", "text", item ? (item.sizes || []).join(", ") : "");
    var active = h("input", { type: "checkbox", "aria-label": "Đang sử dụng" }); active.checked = item ? item.active !== false : true;
    if (!isNew) code.input.setAttribute("readonly", "readonly");
    modal(isNew ? "Thêm vật tư bảo hộ" : "Sửa vật tư " + item.code, h("div", {}, [code.field, name.field, h("label", { class: "fld" }, ["Nhóm hàng", group]), other.field, unit.field, spec.field, sizes.field, h("label", { class: "chk" }, [active, " Đang sử dụng"])]), function (close) {
      return [btn("Hủy", "", close), btn("Lưu vật tư", "pri", function () {
        var row = { code: code.input.value.trim(), name: name.input.value.trim(), group: group.value === "Nhóm khác" ? other.input.value.trim() : group.value, unit: unit.input.value.trim(), spec: spec.input.value.trim(),
          active: active.checked, sizes: sizes.input.value.split(",").map(function (v) { return v.trim(); }).filter(Boolean) };
        var rows = (db.benefitPpeItems || []);
        benefitSave("benefitPpeItems", isNew ? rows.concat(row) : rows.map(function (r) { return r.code === item.code ? row : r; }), isNew ? "Thêm vật tư bảo hộ" : "Sửa vật tư bảo hộ", row.code, function () { close(); render(); });
      })];
    }, { wide: true });
  }
  /** Hồ sơ nhân viên: các phiếu đã có của người này, mở đúng phiếu gốc và quay lại hồ sơ. */
  function cpEmployeeVouchers(ma, back) {
    var rows = (db.benefitIssues || []).filter(function (doc) { return (doc.lines || []).some(function (l) { return l.employee === ma; }); }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var box = h("div", { "data-cp-employee": ma }, [h("h4", { text: "Phiếu cấp phát của nhân viên" })]);
    if (!rows.length) { box.appendChild(h("div", { class: "empty", text: "Chưa có phiếu cấp phát." })); return box; }
    box.appendChild(simpleTable(rows.slice(0, 20).map(function (doc) {
      var mine = doc.lines.filter(function (l) { return l.employee === ma; });
      return { "Mã phiếu": btn(doc.id, "ghost", function () { cpOpen(doc.id, back); }), "Loại": C.benefits.LABEL[C.benefits.docType(doc)], "Ngày giao": fmtDate(doc.date), "Mặt hàng": mine.map(function (l) { return (l.itemName || l.item) + (l.size ? " cỡ " + l.size : "") + " × " + l.quantity; }).join("; "), "Trạng thái": cpStatusText(doc) };
    })));
    return box;
  }
  // ---------- Cấp phát: mẫu Excel, nhập Excel theo phiếu, báo cáo tổng hợp / chi tiết ----------
  var CP_SAMPLES = {
    milk: [{ "Mã phiếu": "SUA-VD-01", "Ngày cấp": "2026-11-15", "Địa điểm": "Kho nhân sự", "Mã NV": "0005", "Mã mặt hàng": "MILK", "Số lượng": 2, "Ghi chú": "" },
      { "Mã phiếu": "SUA-VD-01", "Ngày cấp": "2026-11-15", "Địa điểm": "Kho nhân sự", "Mã NV": "00123", "Mã mặt hàng": "MILK", "Số lượng": 2, "Ghi chú": "" }],
    ppe: [{ "Mã phiếu": "BH-VD-01", "Ngày cấp": "2026-11-15", "Địa điểm": "Kho vật tư", "Mã NV": "0005", "Mã vật tư": "GIAY", "Kích cỡ": "40", "Số lượng": 1, "Lý do": "Cấp đợt 11", "Ghi chú": "" },
      { "Mã phiếu": "BH-VD-01", "Ngày cấp": "2026-11-15", "Địa điểm": "Kho vật tư", "Mã NV": "00123", "Mã vật tư": "MUBH", "Kích cỡ": "", "Số lượng": 1, "Lý do": "Cấp đợt 11", "Ghi chú": "" }]
  };
  var CP_SHEET = { milk: "Cấp phát sữa", ppe: "Cấp phát bảo hộ" };
  function cpDownloadTemplate(type) {
    var cols = C.benefits.TEMPLATE_COLUMNS[type], guide = [
      { "Cột": "Cách dùng", "Giải thích": "Mỗi dòng là MỘT người nhận MỘT " + (type === "ppe" ? "vật tư (và một cỡ)" : "mặt hàng") + ". Các dòng cùng Mã phiếu được gom vào một phiếu nháp. Dòng nền vàng là ví dụ (cột 'Dòng ví dụ' ghi VÍ DỤ): app tự bỏ qua khi nhập." },
      { "Cột": "Đầu phiếu", "Giải thích": "Ngày cấp, địa điểm" + (type === "ppe" ? ", lý do" : "") + " phải giống nhau ở mọi dòng của cùng một Mã phiếu." },
      { "Cột": "Mã (số 0 đầu)", "Giải thích": "Mã phiếu, Mã NV, " + (type === "ppe" ? "Mã vật tư, Kích cỡ" : "Mã mặt hàng") + " đã định dạng Text: nhập 0005 hay 00123 sẽ giữ nguyên." },
      { "Cột": "Nhập vào app", "Giải thích": "Nghiệp vụ nhân sự → Cấp phát → Phiếu cấp phát → ⬆ Nhập Excel → xem trước theo phiếu → sửa lỗi theo số dòng Excel → Lưu nháp. Nhập lại cùng file không cộng số lượng lần hai." }];
    if (type === "ppe") guide.push({ "Cột": "Kích cỡ", "Giải thích": "Chỉ ghi khi vật tư có danh sách kích cỡ trong Danh mục → Cấp phát → Đồ bảo hộ lao động; sai cỡ sẽ báo đúng số dòng." });
    saveXlsx("Mau_CapPhat_" + (type === "ppe" ? "BaoHo" : "Sua") + ".xlsx", [{ name: CP_SHEET[type], cols: cols, rows: CP_SAMPLES[type] }, { name: "Hướng dẫn", cols: ["Cột", "Giải thích"], rows: guide }], "template");
  }

  // ---------- Nhập Excel: Chọn file → Xem trước theo phiếu → Xử lý lỗi → Lưu nháp ----------
  function cpImportFlow(type) {
    if (!type) {
      modal("Nhập Excel cấp phát", h("p", { text: "Chọn loại phiếu trong file Excel:" }), function (close) {
        return [btn("Hủy", "", close), btn("Sữa phúc lợi", "pri", function () { close(); cpImportFlow("milk"); }), btn("Bảo hộ lao động", "pri", function () { close(); cpImportFlow("ppe"); })];
      }); return;
    }
    readWorkbook(function (wb, fileName) {
      var cols = C.benefits.TEMPLATE_COLUMNS[type], optional = { "Ghi chú": 1, "Lý do": 1, "Kích cỡ": 1 };
      var name = wb.SheetNames.filter(function (n) { return n === CP_SHEET[type]; })[0] || wb.SheetNames.filter(function (n) { return n !== "Hướng dẫn"; })[0];
      if (!name) { alert("File không có sheet dữ liệu."); return; }
      var ws = wb.Sheets[name], aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }), first = XLSX.utils.decode_range(ws["!ref"] || "A1").s.r, hi = -1;
      for (var i = 0; i < Math.min(aoa.length, 30) && hi < 0; i++) if ((aoa[i] || []).indexOf("Mã phiếu") >= 0) hi = i;
      if (hi < 0) { alert("Không thấy dòng tiêu đề có cột 'Mã phiếu' trong sheet '" + name + "'. Hãy dùng file mẫu của app."); return; }
      var head = aoa[hi].map(function (c) { return String(c == null ? "" : c).trim(); }), missing = cols.filter(function (c) { return !optional[c] && head.indexOf(c) < 0; });
      if (missing.length) { alert("File thiếu cột bắt buộc: " + missing.join(", ") + ". Hãy dùng đúng mẫu " + (type === "ppe" ? "bảo hộ lao động" : "sữa phúc lợi") + "."); return; }
      var skipped = 0, rows = [], markAt = head.indexOf("Dòng ví dụ");
      aoa.slice(hi + 1).forEach(function (cells, k) {
        if (!(cells || []).some(function (c) { return String(c == null ? "" : c).trim() !== ""; })) return;
        if (markAt >= 0 && fold(cells[markAt]) === "vi du") { skipped++; return; }
        var values = {}; head.forEach(function (c, ci) { if (c) values[c] = cells[ci]; });
        rows.push({ row: first + hi + k + 2, values: values });
      });
      if (!rows.length) { alert(skipped ? "File chỉ có " + skipped + " dòng ví dụ. Nhập dữ liệu thật ở dòng mới bên dưới." : "File chưa có dòng cấp phát."); return; }
      cpImportPreview(type, rows, fileName, skipped);
    });
  }
  function cpImportPreview(type, rows, fileName, skipped) {
    var me = session.tenDangNhap.toLowerCase(), plan = C.benefits.planImport(db, type, rows, me, cpDeptOf());
    var ACTION = { new: "Phiếu nháp mới", same: "Đã có, không đổi", replace: "Cập nhật phiếu nháp", error: "Có lỗi" };
    var counts = { new: 0, same: 0, replace: 0, error: 0 }; plan.vouchers.forEach(function (v) { counts[v.action]++; });
    var errors = plan.errors.slice(); plan.vouchers.forEach(function (v) { v.issues.forEach(function (m) { errors.push(m); }); });
    var body = h("div", { "data-cp-import": "1" });
    body.appendChild(h("div", { class: errors.length ? "warn" : "hint", text: "File " + fileName + " — " + rows.length + " dòng dữ liệu, " + plan.vouchers.length + " phiếu: " + counts.new + " mới, " + counts.replace + " cập nhật nháp, " + counts.same + " đã có (không đổi), " + counts.error + " lỗi." + (skipped ? " Đã bỏ qua " + skipped + " dòng ví dụ của file mẫu." : "") }));
    body.appendChild(simpleTable(plan.vouchers.map(function (v) {
      return { "Mã phiếu": v.id, "Xử lý": ACTION[v.action], "Số dòng": v.rows.length, "Dòng Excel": v.rows.length > 6 ? v.rows[0] + "–" + v.rows[v.rows.length - 1] : v.rows.join(", "), "Ngày cấp": v.doc ? fmtDate(v.doc.date) : "", "Số người nhận": v.doc ? new Set(v.doc.lines.map(function (l) { return l.employee; })).size : "" };
    })));
    if (errors.length) { body.appendChild(h("div", { class: "fh", text: "Lỗi cần sửa trong file (" + errors.length + ")" })); body.appendChild(h("ul", { "data-cp-errors": "1" }, errors.slice(0, 80).map(function (m) { return h("li", { text: m }); }))); if (errors.length > 80) body.appendChild(h("div", { class: "hint", text: "… và " + (errors.length - 80) + " lỗi nữa (tải chi tiết lỗi)." })); }
    var writable = plan.vouchers.filter(function (v) { return v.action === "new" || v.action === "replace"; });
    modal("Xem trước nhập Excel cấp phát", body, function (close) {
      return [
        errors.length ? btn("⬇ Tải chi tiết lỗi", "", function () { saveXlsx("LoiNhapCapPhat.xlsx", [{ name: "Loi", cols: ["Lỗi"], rows: errors.map(function (m) { return { "Lỗi": m }; }) }]); }) : null,
        btn("Đóng", "", close),
        btn(errors.length ? "Sửa lỗi trong file rồi chọn lại" : writable.length ? "✔ Lưu nháp " + writable.length + " phiếu" : "Không có phiếu nào để lưu", "pri", function () {
          if (errors.length) { close(); return; }
          if (!writable.length) { close(); return; }
          var byId = {}; writable.forEach(function (v) { byId[v.id] = v.doc; });
          var out = (db.benefitIssues || []).map(function (row) { return byId[row.id] || row; }).concat(writable.filter(function (v) { return v.action === "new"; }).map(function (v) { return v.doc; }));
          benefitSave("benefitIssues", out, "Nhập Excel cấp phát (nháp)", writable.map(function (v) { return v.id; }).join(", "), function () { close(); toast("Đã lưu nháp " + writable.length + " phiếu"); render(); });
        })];
    }, { wide: true });
  }

  // ---------- Báo cáo cấp phát: Tổng hợp / Chi tiết, dùng chung bộ lọc với danh sách phiếu ----------
  function cpReport() {
    var s = cpState();
    return C.benefits.report(db, { type: s.type, mode: s.mode, bySize: s.bySize, filters: cpFilters(), deptOf: cpDeptOf() });
  }
  function cpReportCtx(rep) {
    var s = cpState(), cfg = cpConfig(function () {}, function () { return { kept: 0, total: 0 }; });
    return { filters: cpFilters(), type: s.type, bySize: s.bySize, labels: C.benefits.LABEL, fmtDate: fmtDate, scopeText: SFC.scopeText(cfg, SFC.normalize(s.f, cfg), "tất cả phiếu"), rep: rep };
  }
  function cpExportXlsx(rep) {
    if (!need("export", "xuất dữ liệu ra Excel")) return;
    if (!window.ExcelJS || !window.HAKUi || !window.HAKUi.reportXlsx || !window.HAKUi.dispenseReport) { alert("Thiếu thư viện định dạng Excel."); return; }
    var DR = window.HAKUi.dispenseReport, meta = DR.meta(rep, cpReportCtx(rep)), vm = DR.excelVm(rep, meta, { congTy: congTy()["Tên công ty"] || "", user: currentUser() });
    window.HAKUi.reportXlsx.build(window.ExcelJS, vm, { chuKy: DR.SIGN, nguoiLap: currentUser() }).xlsx.writeBuffer().then(function (buf) {
      download(meta.file + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf); audit("Xuất Excel báo cáo cấp phát", meta.title + " · " + meta.scope);
    }, function (e) { alert("Không tạo được file: " + e.message); });
  }
  function cpExportPdf(rep) {
    var DR = window.HAKUi.dispenseReport, meta = DR.meta(rep, cpReportCtx(rep));
    exportSheetsPdf(DR.pdfVm(rep, meta, { congTy: congTy()["Tên công ty"] || "" }), meta.file + ".pdf", { chuKy: DR.SIGN });
  }
  function cpReportView() {
    var s = cpState(), box = h("div", { "data-cp-report": s.mode }), bar = h("div", { class: "bar" }), tw = h("div", { class: "tw" }), kept = { kept: 0, total: 0 }, rep = null;
    [["summary", "Tổng hợp"], ["detail", "Chi tiết"]].forEach(function (m) { bar.appendChild(btn(m[1], s.mode === m[0] ? "pri" : "", function () { s.mode = m[0]; st.pg.capphat = 0; render(); })); });
    if (s.mode === "summary" && s.type !== "milk") {
      var cb = h("input", { type: "checkbox", "aria-label": "Tách theo kích cỡ", "data-cp-bysize": "1" }); cb.checked = !!s.bySize;
      cb.addEventListener("change", function () { s.bySize = cb.checked; st.pg.capphat = 0; draw(); });
      bar.appendChild(h("label", { class: "chk" }, [cb, " Tách theo kích cỡ (bảo hộ)"]));
    }
    bar.appendChild(h("span", { class: "sp" }));
    if (can("export")) { bar.appendChild(btn("⬇ Excel", "", function () { cpExportXlsx(cpReport()); })); bar.appendChild(btn("⬇ PDF", "", function () { cpExportPdf(cpReport()); })); }
    box.appendChild(bar);
    var sf = sfUi.mount(cpConfig(draw, function () { return kept; })); box.appendChild(sf.el); box.appendChild(tw);
    function draw() {
      tw.innerHTML = ""; rep = cpReport(); sf.refresh();
      var body = rep.rows.filter(function (r) { return !r._total; }), totals = rep.rows.filter(function (r) { return r._total; });
      kept.kept = body.length; kept.total = body.length; sf.refresh();
      if (!rep.rows.length) { tw.appendChild(h("div", { class: "empty", text: "Không có dữ liệu cấp phát khớp bộ lọc." })); return; }
      var pg = pager("capphat", body.length, draw); if (pg.el) tw.appendChild(pg.el);
      var t = h("table", { "data-cp-table": rep.mode }), tr = h("tr"); rep.columns.forEach(function (c) { tr.appendChild(h("th", { text: c })); }); t.appendChild(h("thead", {}, [tr]));
      var tb = h("tbody");
      body.slice(pg.start, pg.end).forEach(function (r) {
        var x = h("tr");
        rep.columns.forEach(function (c) {
          var v = r[c];
          if (c === "Mã phiếu" && r._voucher) x.appendChild(h("td", {}, [btn(v, "ghost", function () { cpOpen(r._voucher, { tab: "capphat", label: "báo cáo" }); }, "Mở phiếu gốc")]));
          else x.appendChild(h("td", { class: typeof v === "number" ? "r" : "t", text: v == null ? "" : v }));
        });
        tb.appendChild(x);
      });
      totals.forEach(function (r) { var x = h("tr", { class: "tot" }); rep.columns.forEach(function (c) { x.appendChild(h("td", { class: typeof r[c] === "number" ? "r" : "t", text: r[c] == null ? "" : r[c] })); }); tb.appendChild(x); });
      t.appendChild(tb); tw.appendChild(h("div", { class: "tw" }, [t]));
      tw.appendChild(h("div", { class: "hint", text: "Phiếu nháp không tính vào thực cấp. Thực cấp = đã cấp − thu hồi. Tổ/phòng ban và tên mặt hàng lấy theo thông tin đã lưu tại ngày cấp." }));
    }
    draw();
    return box;
  }
  function tabCapPhat() {
    var s = cpState(), w = h("div", { "data-cp-tab": s.view }), card = h("div", { class: "card" });
    if (s.view === "detail") { card.appendChild(cpVoucherDetail()); w.appendChild(card); return w; }
    var types = h("div", { class: "bar", role: "group", "aria-label": "Loại cấp phát" }), views = h("div", { class: "bar", role: "group", "aria-label": "Màn hình cấp phát" });
    CP_TYPES.forEach(function (t) { types.appendChild(btn(t[1], s.type === t[0] ? "pri" : "", function () { s.type = t[0]; st.pg.capphat = 0; render(); }, "Lọc theo loại cấp phát")); });
    [["list", "Phiếu cấp phát"], ["report", "Báo cáo cấp phát"]].forEach(function (v) { views.appendChild(btn(v[1], s.view === v[0] ? "pri" : "", function () { s.view = v[0]; st.pg.capphat = 0; render(); })); });
    card.appendChild(h("div", { class: "hak-catalog-heading" }, [h("small", { text: "NGHIỆP VỤ NHÂN SỰ → CẤP PHÁT" }), h("h2", { text: s.view === "report" ? "Báo cáo cấp phát" : "Phiếu cấp phát" })]));
    card.appendChild(views); card.appendChild(types);
    card.appendChild(s.view === "report" ? cpReportView() : cpVoucherList());
    w.appendChild(card); return w;
  }
  // ---------- Tiêu chuẩn và phiếu cấp phát phúc lợi ----------
  function benefitSave(table, rows, action, detail, done) {
    var user = session && session.tenDangNhap.toLowerCase();
    var next = Object.assign({}, db, { [table]: rows });
    var error = C.benefits.validateChanges(table, db, next, { user: user, perms: Object.keys(PERM.PERMS).filter(can) }, C.workflowApproval.mode(db));
    if (error) { alert(error); return; }
    if (!REPO.saveWorkflowRows(table, rows, action, detail).ok) { alert(lastTxnError); return; }
    if (done) done();
  }
  function benefitField(label, type, value) {
    var input = h("input", { class: "i", type: type, value: value || "", "aria-label": label });
    return { input: input, field: h("label", { class: "fld" }, [label, input]) };
  }
  function benefitLineEditor(headers) {
    var tbl = h("table"), rows = h("tbody"), controls = [];
    tbl.appendChild(h("thead", {}, [h("tr", {}, headers.map(function (column) { return h("th", { text: column[0] }); }).concat(h("th")))]));
    tbl.appendChild(rows);
    function add(values) {
      var inputs = headers.map(function (column, index) { return benefitField(column[0], column[1], Array.isArray(values) ? values[index] : "").input; });
      var record = { inputs: inputs, active: true }, tr = h("tr", {}, inputs.map(function (input) { return h("td", {}, [input]); }));
      tr.appendChild(h("td", {}, [btn("Xóa dòng", "ghost", function () { record.active = false; tr.remove(); })]));
      controls.push(record); rows.appendChild(tr);
    }
    add();
    return { panel: h("div", { class: "tw" }, [tbl, btn("Thêm dòng", "", function () { add(); })]), add: add, rows: function () {
      return controls.filter(function (row) { return row.active; }).map(function (row) {
        return row.inputs.map(function (input) { return input.value.trim(); });
      });
    } };
  }
  function benefitCatalog() {
    var standards = db.benefitStandards || [], rows = standards.flatMap(function (rule) {
      return rule.items.map(function (item) { return { "Mã tiêu chuẩn": rule.code, "Hiệu lực từ": rule.from, "Hiệu lực đến": rule.until || "",
        "Mã mặt hàng": item.code, "Mặt hàng phúc lợi": item.name, "Đơn vị": item.unit, "Số lượng/tháng": item.quantity }; });
    });
    var body = h("div", {}, [simpleTable(rows)]);
    if (can("dm.edit")) body.appendChild(btn("Thêm phiên bản tiêu chuẩn", "pri", function () {
      var code = benefitField("Mã tiêu chuẩn", "text"), from = benefitField("Hiệu lực từ", "date", HRM.today());
      var until = benefitField("Hiệu lực đến", "date");
      var editor = benefitLineEditor([["Mã mặt hàng", "text"], ["Mặt hàng phúc lợi", "text"], ["Đơn vị", "text"], ["Số lượng/tháng", "number"]]);
      modal("Tiêu chuẩn phúc lợi", h("div", {}, [code.field, from.field, until.field, editor.panel]), function (close) {
        return [btn("Hủy", "", close), btn("Lưu tiêu chuẩn", "pri", function () {
          var rule = { code: code.input.value.trim(), from: from.input.value, until: until.input.value, items: editor.rows().map(function (row) {
            return { code: row[0], name: row[1], unit: row[2], quantity: row[3] === "" ? null : Number(row[3]) };
          }) };
          benefitSave("benefitStandards", (db.benefitStandards || []).concat(rule), "Thêm tiêu chuẩn phúc lợi", rule.code + " · " + rule.from, function () { close(); render(); });
        })];
      }, { wide: true });
    }));
    return body;
  }
  function benefitContractPanel(ma, contract, refresh) {
    var history = (db.benefitAssignments || []).filter(function (row) { return row.employee === ma && row.contract === contract; });
    var body = h("div", {}, [simpleTable(history.map(function (row) { return { "Hiệu lực từ": row.from, "Mã tiêu chuẩn": row.code }; })),
      h("h4", { text: "Định mức kỳ " + kyStr() }), simpleTable(C.benefits.entitlement(db, ma, kyStr()).map(function (item) {
        return { "Mặt hàng": item.name, "Đơn vị": item.unit, "Được cấp": item.allowance };
      })),
      cpEmployeeVouchers(ma, { tab: st.tab, label: "hồ sơ nhân viên" })]);
    if (can("hr.edit")) {
      var code = h("select", { "aria-label": "Mã tiêu chuẩn phúc lợi" }, [h("option", { value: "", text: "Chọn mã tiêu chuẩn" })]);
      Array.from(new Set((db.benefitStandards || []).map(function (row) { return row.code; }))).sort().forEach(function (value) {
        code.appendChild(h("option", { value: value, text: value }));
      });
      var from = benefitField("Hiệu lực từ", "date", HRM.today());
      // Phiên bản tiêu chuẩn có hiệu lực tại ngày bắt đầu áp dụng: hiện mặt hàng, định mức và khoảng hiệu lực TRƯỚC khi lưu.
      // Cùng hàm kiểm tra (C.benefits.standardProblem) với tiến trình chính, nên giao diện không cho qua điều mà main sẽ từ chối.
      var preview = h("div", { "data-benefit-preview": "1" });
      function previewRows(rule) { return rule.items.map(function (item) { return { "Mặt hàng": item.name, "Đơn vị": item.unit, "Định mức/tháng": item.quantity }; }); }
      function rangeText(rule) { return "từ " + rule.from + " đến " + (rule.until || "chưa giới hạn"); }
      function showPreview() {
        var found = code.value && from.input.value ? C.benefits.standardAt(db, code.value, from.input.value) : null;
        preview.textContent = "";
        if (!found) return;
        var problem = C.benefits.standardProblem(db, code.value, from.input.value);
        if (problem) { preview.appendChild(h("p", { class: "warn", text: problem })); if (found.rule) preview.appendChild(h("p", { class: "hint", text: "Phiên bản gần nhất: " + rangeText(found.rule) + "." })); return; }
        preview.appendChild(h("p", { class: "hint", text: "Tiêu chuẩn " + code.value + " có hiệu lực " + rangeText(found.rule) + ":" }));
        preview.appendChild(simpleTable(previewRows(found.rule)));
      }
      code.addEventListener("change", showPreview); from.input.addEventListener("input", showPreview); from.input.addEventListener("change", showPreview);
      body.appendChild(h("div", { class: "bar" }, [code, from.field, btn("Gắn tiêu chuẩn", "pri", function () {
        var row = { employee: ma, contract: contract, code: code.value, from: from.input.value };
        if (!row.code || !row.from) { alert("Chọn mã tiêu chuẩn và ngày bắt đầu áp dụng."); return; }
        var problem = C.benefits.standardProblem(db, row.code, row.from);
        if (problem) { showPreview(); alert(problem); return; }
        var rule = C.benefits.standardAt(db, row.code, row.from).rule;
        modal("Xác nhận gắn tiêu chuẩn", h("div", {}, [
          h("p", { text: ma + " · hợp đồng " + contract + " · tiêu chuẩn " + row.code + " áp dụng từ " + row.from + "." }),
          h("p", { class: "hint", text: "Phiên bản có hiệu lực " + rangeText(rule) + (rule.until ? ". Hết hạn thì ngừng áp dụng, không tự quay lại định mức cũ." : ".") }),
          simpleTable(previewRows(rule))
        ]), function (close) {
          return [btn("Hủy", "", close), btn("Lưu", "pri", function () {
            benefitSave("benefitAssignments", (db.benefitAssignments || []).concat(row), "Gắn tiêu chuẩn phúc lợi", ma + " · " + contract + " · " + row.code, function () { close(); refresh(); });
          })];
        }, { wide: true });
      })]));
      body.appendChild(preview); showPreview();
    }
    return body;
  }

  if (window.HAKIcons) { window.HAKIcons.watch($("#app")); window.HAKIcons.watch($("#modal")); }
  render();
  if (migMsg.length) setTimeout(function () { alert("Đã nâng cấp dữ liệu:\n- " + migMsg.join("\n- ")); }, 300);
})();
