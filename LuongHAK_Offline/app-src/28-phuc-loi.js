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
      }))]);
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
  var BENEFIT_COLUMNS = ["Mã phiếu", "Ngày cấp", "Địa điểm", "Mã NV", "Mã mặt hàng", "Số lượng", "Ghi chú"];
  function benefitPreview(docs, done) {
    var original = db.benefitIssues || [], errors = [], rows = [], seen = new Set(original.map(function (doc) { return doc.id; }));
    var projected = Object.assign({}, db, { benefitIssues: original.slice() });
    docs.forEach(function (doc) {
      if (seen.has(doc.id)) errors.push("Mã phiếu đã có: " + doc.id);
      seen.add(doc.id);
      var summary = C.benefits.reviewIssue(projected, doc);
      if (!summary.issues.length) projected.benefitIssues.push(Object.assign({}, doc, { status: "issued" }));
      summary.issues.forEach(function (message) { errors.push(doc.id + " · " + message); });
      summary.entries.forEach(function (line) { rows.push({ "Mã phiếu": doc.id, "Mã NV": line.employee, "Mặt hàng": line.item,
        "Thực cấp": line.quantity, "Trước phiếu": line.before, "Sau phiếu": line.after }); });
    });
    var body = h("div", {}, [simpleTable(rows)].concat(errors.map(function (message) { return h("p", { class: "warn", text: message }); })));
    modal("Xem trước các phiếu cấp phát", body, function (close) {
      return [btn("Đóng", "", close), errors.length ? null : btn("Lưu nháp", "pri", function () {
        if ((db.benefitIssues || []).some(function (doc) { return docs.some(function (incoming) { return incoming.id === doc.id; }); })) {
          alert("Mã phiếu đã tồn tại."); return;
        }
        benefitSave("benefitIssues", (db.benefitIssues || []).concat(docs), "Lập phiếu phúc lợi", docs.map(function (doc) { return doc.id; }).join(", "), function () { close(); done(); });
      })];
    }, { wide: true });
  }
  function benefitDocument(id, date, place, lines) {
    return { id: id, date: date, period: date.slice(0, 7), place: place, lines: lines, maker: session.tenDangNhap.toLowerCase(), status: "draft" };
  }
  function benefitIssueScreen() {
    var body = h("div"), tools = h("div", { class: "bar" }), current = kyStr();
    body.appendChild(tools);
    tools.appendChild(btn("Tải mẫu Excel cấp phát", "", function () {
      saveXlsx("MauCapPhatPhucLoi.xlsx", [{ name: "Cấp phát phúc lợi", cols: BENEFIT_COLUMNS, rows: [] }], "template");
    }));
    if (can("hr.edit")) {
      tools.appendChild(btn("Lập phiếu cấp phát", "pri", function () {
        var id = benefitField("Mã phiếu", "text"), day = benefitField("Ngày cấp", "date", HRM.today()), place = benefitField("Địa điểm", "text");
        var editor = benefitLineEditor([["Mã NV", "text"], ["Mã mặt hàng", "text"], ["Số lượng thực cấp", "number"], ["Ghi chú", "text"]]);
        var dept = h("select", { "aria-label": "Tổ cấp phát" }, [h("option", { value: "", text: "Chọn tổ / phòng ban" })]);
        (db.dm_phongban || []).forEach(function (row) { dept.appendChild(h("option", { value: row["Mã phòng ban"], text: row["Tên phòng ban"] || row["Mã phòng ban"] })); });
        var item = benefitField("Mã mặt hàng cấp theo tổ", "text"), qty = benefitField("Số lượng mỗi người", "number");
        var quick = h("div", { class: "bar" }, [dept, item.field, qty.field, btn("Thêm người đủ điều kiện trong tổ", "", function () {
          var month = day.input.value.slice(0, 7), code = item.input.value.trim();
          if (!dept.value || !VAL.normDate(day.input.value) || !code || !Number.isSafeInteger(Number(qty.input.value)) || +qty.input.value <= 0) {
            alert("Chọn ngày, tổ, mặt hàng và số lượng nguyên dương."); return;
          }
          var existing = new Set(editor.rows().filter(function (row) { return row[1] === code; }).map(function (row) { return row[0]; }));
          var people = (db.nhanvien || []).filter(function (row) {
            var ma = row["Mã NV"];
            return !existing.has(ma) && HRM.hienHanh(db, ma, day.input.value).pb === dept.value &&
              C.benefits.entitlement(db, ma, month).some(function (rule) { return rule.code === code && rule.allowance > 0; });
          });
          people.forEach(function (row) { editor.add([row["Mã NV"], code, qty.input.value, ""]); });
          if (!people.length) alert("Không có thêm người phù hợp trong tổ.");
        })]);
        modal("Lập phiếu cấp phát", h("div", {}, [id.field, day.field, place.field, quick, editor.panel]), function (close) {
          return [btn("Hủy", "", close), btn("Xem trước", "pri", function () {
            var doc = benefitDocument(id.input.value.trim(), day.input.value, place.input.value.trim(), editor.rows().map(function (row) {
              return { employee: row[0], item: row[1], quantity: Number(row[2]), note: row[3] };
            }).filter(function (line) { return line.employee || line.item || line.quantity || line.note; }));
            close(); benefitPreview([doc], render);
          })];
        }, { wide: true });
      }));
      tools.appendChild(btn("Nhập Excel cấp phát", "", function () {
        readWorkbook(function (book) {
          var groups = new Map(), sheet = book.Sheets[book.SheetNames[0]];
          XLSX.utils.sheet_to_json(sheet, { raw: false, defval: "" }).forEach(function (row) {
            var id = String(row["Mã phiếu"] || "").trim(), date = VAL.normDate(row["Ngày cấp"]) || "", place = String(row["Địa điểm"] || "").trim();
            if (!groups.has(id)) groups.set(id, benefitDocument(id, date, place, []));
            var doc = groups.get(id);
            if (doc.date !== date || doc.place !== place) throw Error("Mã phiếu " + id + " có ngày cấp hoặc địa điểm khác nhau.");
            doc.lines.push({ employee: String(row["Mã NV"] || "").trim(), item: String(row["Mã mặt hàng"] || "").trim(), quantity: Number(row["Số lượng"]), note: String(row["Ghi chú"] || "") });
          });
          if (!groups.size) { alert("Tệp chưa có dòng cấp phát."); return; }
          benefitPreview(Array.from(groups.values()), render);
        });
      }));
    }
    var all = db.benefitIssues || [], mode = C.workflowApproval.mode(db);
    var rows = all.filter(function (doc) { return doc.period === current; }).map(function (doc) {
      var user = session.tenDangNhap.toLowerCase(), canConfirm = mode === "roles" ? can("hr.approve") && doc.maker !== user : can("system.admin");
      function transition(patch, label, close) {
        benefitSave("benefitIssues", (db.benefitIssues || []).map(function (row) {
          return row.id === doc.id ? Object.assign({}, row, patch) : row;
        }), label, doc.id, function () { if (close) close(); render(); });
      }
      return { "Mã phiếu": doc.id, "Ngày cấp": doc.date, "Địa điểm": doc.place, "Tháng hưởng": doc.period,
        "Số người": new Set(doc.lines.map(function (line) { return line.employee; })).size,
        "Trạng thái": { draft: "Nháp", issued: "Đã cấp", recalled: "Đã thu hồi" }[doc.status], "Người xác nhận": doc.reviewer || "",
        "Thao tác": h("div", { class: "bar" }, [btn("Xem chi tiết", "", function () {
          modal("Phiếu " + doc.id, simpleTable(doc.lines.map(function (line) { return { "Mã NV": line.employee, "Mặt hàng": line.item, "Số lượng": line.quantity, "Ghi chú": line.note }; })), function (close) {
            return [btn("Đóng", "", close), doc.status === "draft" && canConfirm ? btn("Xác nhận cấp phát", "pri", function () {
              transition({ status: "issued", reviewer: user, confirmedAt: new Date().toISOString() }, "Xác nhận cấp phát", close);
            }) : null];
          });
        }), doc.status !== "recalled" && canConfirm ? btn("Thu hồi", "ghost", function () {
          askText("Thu hồi phiếu " + doc.id, "Ghi rõ lý do điều chỉnh sổ cấp phát.", { label: "Lý do", required: true }, function (reason) {
            transition({ status: "recalled", recalledBy: user, reason: reason }, "Thu hồi phiếu phúc lợi");
          });
        }) : null]) };
    });
    body.appendChild(simpleTable(rows));
    // Báo cáo tháng: định mức còn hiệu lực + MỌI khoản đã cấp theo phiếu đã xác nhận (kể cả mặt hàng không còn định mức)
    var summary = C.benefits.monthlyReport(db, current).map(function (row) {
      return { "Mã NV": row.employee, "Họ và tên": row.name, "Mặt hàng": row.itemName, "Đơn vị": row.unit, "Định mức": row.allowance,
        "Đã cấp": row.given, "Còn lại": row.remaining, "Vượt": row.over, "Phiếu cấp": row.docs.join(", "), "Ghi chú": row.note, _docs: row.docs };
    });
    function openIssueDoc(id) {
      var doc = (db.benefitIssues || []).find(function (row) { return row.id === id; }); if (!doc) { toast("Không tìm thấy phiếu " + id); return; }
      modal("Phiếu " + doc.id + " — " + { draft: "Nháp", issued: "Đã cấp", recalled: "Đã thu hồi" }[doc.status], simpleTable(doc.lines.map(function (line) { return { "Mã NV": line.employee, "Mặt hàng": line.item, "Số lượng": line.quantity, "Ghi chú": line.note }; })), function (close) { return [btn("Đóng", "", close)]; });
    }
    body.appendChild(h("h3", { text: "Đối chiếu phúc lợi kỳ " + current }));
    var search = benefitField("Lọc mã NV, họ tên hoặc mặt hàng", "text", st.benefitQuery || "");
    search.input.addEventListener("change", function () { st.benefitQuery = search.input.value; render(); });
    body.appendChild(search.field);
    if (st.benefitQuery) summary = summary.filter(function (row) {
      return fold([row["Mã NV"], row["Họ và tên"], row["Mặt hàng"]].join(" ")).includes(fold(st.benefitQuery));
    });
    var exportRows = summary.map(function (row) { var o = Object.assign({}, row); delete o._docs; return o; });
    if (can("export") && summary.length) body.appendChild(h("div", { class: "bar" }, [
      btn("Xuất Excel đối chiếu", "", function () { saveXlsx("DoiChieuPhucLoi_" + current + ".xlsx", [{ name: "Đối chiếu phúc lợi", rows: exportRows }]); }),
      btn("Xuất PDF đối chiếu", "", function () { exportSheetsPdf({ title: "ĐỐI CHIẾU PHÚC LỢI", ky: current,
        sheets: [{ name: "Đối chiếu phúc lợi", rows: exportRows }] }, "DoiChieuPhucLoi_" + current + ".pdf"); })
    ]));
    body.appendChild(simpleTable(summary.map(function (row) {
      var shown = Object.assign({}, row); delete shown._docs;
      shown["Mở phiếu"] = h("div", { class: "bar" }, row._docs.map(function (id) { return btn(id, "ghost", function () { openIssueDoc(id); }); }));
      return shown;
    })));
    return body;
  }

  if (window.HAKIcons) { window.HAKIcons.watch($("#app")); window.HAKIcons.watch($("#modal")); }
  render();
  if (migMsg.length) setTimeout(function () { alert("Đã nâng cấp dữ liệu:\n- " + migMsg.join("\n- ")); }, 300);
})();
