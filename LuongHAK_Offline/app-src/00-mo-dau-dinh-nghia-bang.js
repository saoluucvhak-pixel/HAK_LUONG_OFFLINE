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
  var COLW = { "Mã NV": 96, "Họ và tên": 170, "Biển số": 130, "Số xe": 130, "Diễn giải": 200, "Cách tính": 260, "Tên phụ cấp": 160, "Hình thức lương": 150, "Nội dung": 180, "Nội dung tăng ca": 160, "Nội dung khấu trừ": 160, "Tên hỗ trợ": 150, "Tên phòng ban": 200, "Tên chức vụ": 200, "Ghi chú": 200, "Hình thức công": 90, "Mã nhân viên": 110, "Tên Ngân hàng": 150 };

