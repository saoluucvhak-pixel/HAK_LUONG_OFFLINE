  // ---------- Kiểm tra bảng lương (V10): ERROR / WARNING / INFO, đi tới dữ liệu, kiểm tra lại, xuất Excel ----------
  var KT_GOTO = { 1: ["caidat"], 2: ["dm", "dm_luong"], 3: ["dm", "dm_tangca"], 4: ["nhansu"], 5: ["nhansu"], 6: ["dm", "dm_luong"], 7: ["sanluong"], 8: ["sanluong"], 9: ["sanluong"], 10: ["chamcong"], 15: ["chamcong"], 16: ["dm", "dm_tncn"], 17: ["dm", "dm_baohiem"], 18: ["luong"], 19: ["luong"], 20: ["luong"], 21: ["caidat"], 22: ["dm", "dm_luong"] };
  var KT_SEV = { loi: "ERROR", canhbao: "WARNING", ok: "INFO" };
  function ktChay() {
    var kq = tinhLuong(), slA = pbAlloc(st.nam, st.thang, "sanluong"), bdA = pbAlloc(st.nam, st.thang, "bandam");
    var ck = PCC ? PCC.run({ db: db, kq: kq, slAlloc: slA, bdAlloc: bdA, quyChe: quyChe() }) : { items: [] };
    var out = ck.items.map(function (x) { return { id: "KT-" + ("0" + x.id).slice(-2), muc: KT_SEV[x.trangThai] || "INFO", ten: x.ten, chiTiet: x.chiTiet || [], goto: KT_GOTO[x.id] || null }; });
    INT.check(db).filter(function (i) { return i.level === "Critical" || /CỘNG (2 LẦN|NHIỀU LẦN)/.test(i.msg); }).forEach(function (i, n) { out.push({ id: "DL-" + (n + 1), muc: "ERROR", ten: "Lỗi dữ liệu nghiêm trọng (chặn chốt kỳ)", chiTiet: [i.msg], goto: ["backup"] }); });
    if (kq.canhbao.length) out.push({ id: "CB-01", muc: "WARNING", ten: "Cảnh báo dữ liệu khi tính lương (" + kq.canhbao.length + ")", chiTiet: kq.canhbao.slice(), goto: ["luong"] });
    (kq.inputErrors || []).forEach(function (message, i) {
      var match = /^(chamcong|sanluong|bandam) dòng (\d+):/.exec(message);
      if (match) out.push({ id: "NL-" + (i + 1), muc: "ERROR", ten: "Lỗi dữ liệu đầu vào",
        chiTiet: [message], goto: [match[1], null, Number(match[2]) - 1] });
    });
    var order = { ERROR: 0, WARNING: 1, INFO: 2 };
    out.sort(function (a, b) { return order[a.muc] - order[b.muc]; });
    st.kt = { ky: kyStr(), rev: dbRev, at: new Date().toISOString(), rows: out };
  }
  function ktDi(g) {
    if (!g) return; if (!leaveOk()) return;
    if (g[0] === "dm" && g[1]) st.dm = g[1];
    if (!tabAllowed(g[0])) return;
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
  // @screen tabKiemTra

