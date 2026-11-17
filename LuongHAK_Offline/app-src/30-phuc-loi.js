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
