// HAK KPI Bridge — Offline draft tracking screen, no payroll writes.
(function(root){ "use strict";
  function mount(el, ctx) {
    var cat=root.HAKKPI.catalog, core=root.HAKKPI.bridge, db=ctx.db, doc=el.ownerDocument, period=ctx.period(), employee=null, roleId="", selectedMetric="";
    if (!cat || !core) {el.textContent="Thiếu module KPI, vui lòng cài lại ứng dụng.";return;}
    var periodKey="KPI|"+period;
    function make(tag,cls,text){var e=doc.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
    function row(parent,label,elem){var wrap=make("label","kpi-field");wrap.append(make("span","",label),elem);parent.append(wrap);return elem;}
    function input(type,value){var e=make("input");e.type=type;e.value=value||"";e.className="i";return e;}
    function button(label,fn){var e=make("button","b",label);e.type="button";e.onclick=fn;return e;}
    function assignKey(id){return periodKey+"|"+companyOf()+"|"+id;}
    function assignment(id){return (db.kpi_assignments||[]).find(function(x){return x.key===assignKey(id);})||null;}
    function saveAssignment(id,role){if(!ctx.can("dm.edit")){ctx.toast("Cần quyền sửa danh mục để giao KPI");return false;}
      if(ctx.closed(period)){ctx.toast("Kỳ đã khóa");return false;}
      var old=assignment(id),idx=old?(db.kpi_assignments||[]).indexOf(old):-1,now=new Date().toISOString();
      return ctx.txn(["kpi_assignments"],function(){var e={key:assignKey(id),employeeId:id,companyId:companyOf(),period:period,roleId:role,status:"ASSIGNED_DRAFT",assignedAt:now};
        if(idx>=0)db.kpi_assignments[idx]=e;else db.kpi_assignments.push(e);
        ctx.audit("KPI_ASSIGN_DRAFT",e.key+" | "+role);return true;});
    }
    function keyFor(id,metric){return periodKey+"|"+id+"|"+metric;}
    function getEntry(id,metric){return (db.kpi_evidence||[]).find(function(x){return x.key===keyFor(id,metric);})||null;}
    function storeEntry(e){if(!ctx.can("dm.edit")){ctx.toast("Cần quyền sửa danh mục để lưu dự thảo KPI");return false;}
      if(ctx.closed(period)){ctx.toast("Kỳ đã khóa; không thể sửa KPI");return false;}
      var old=getEntry(e.employeeId,e.metricId), oldIndex=old?(db.kpi_evidence||[]).indexOf(old):-1;
      return ctx.txn(["kpi_evidence"],function(){ if(oldIndex>=0)db.kpi_evidence[oldIndex]=e;else db.kpi_evidence.push(e);ctx.audit("KPI_DRAFT_EDIT",e.key+" | "+String(e.status));return true;});
    }
    function companyOf(){return String((db.congty&&db.congty[0]&&db.congty[0]["Mã công ty"])||"");}
    function render(){
      el.replaceChildren();
      var title=make("div","hak-catalog-heading");title.append(make("h2","","KPI Bridge – Theo dõi & đối chiếu"));title.append(make("small","","Thử nghiệm · Chưa ban hành · Không cộng vào bảng lương"));el.append(title);
      var banner=make("div","hint","Dữ liệu mẫu 26 vai trò / 104 chỉ tiêu. Quy chế CHƯA hiệu lực: tất cả kết quả là dự thảo và không được ghi sang bảng lương.");el.append(banner);
      var toolbar=make("div","bar"), staffSel=make("select","i");staffSel.append(new root.Option("Chọn nhân viên…",""));
      (db.nhanvien||[]).forEach(function(e){var id=String(e["Mã NV"]||"");if(id)staffSel.append(new root.Option(id+" – "+String(e["Họ và tên"]||""),id));});
      staffSel.value=employee||"";staffSel.onchange=function(){employee=staffSel.value;roleId=(assignment(employee)||{}).roleId||"";selectedMetric="";render();};row(toolbar,"Nhân viên",staffSel);
      var roles=make("select","i");roles.append(new root.Option("Chọn vai trò…",""));
      cat.roles.forEach(function(r){roles.append(new root.Option(r.id+" – "+r.name+" ("+r.mode+")",r.id));});
      roles.value=roleId;roles.onchange=function(){roleId=roles.value;selectedMetric="";render();};row(toolbar,"Vai trò KPI",roles);
      el.append(toolbar);
      if(employee&&roleId){var asg=assignment(employee);
        var assignBar=make("div","bar");assignBar.append(make("span","","Giao KPI: "+(asg&&asg.roleId===roleId?"Đã giao – dự thảo":"Chưa giao/khác vai trò")));
        assignBar.append(button("Giao vai trò KPI (dự thảo)",function(){if(saveAssignment(employee,roleId)){ctx.toast("Đã giao KPI dự thảo");render();}}));el.append(assignBar);
      }
      if(!employee||!roleId){el.append(make("div","card","Chọn nhân viên và vai trò để xem 4 KPI của chức danh. Chưa có dữ liệu nào được ghi khi chỉ chọn."));return;}
      var role=cat.roles.find(function(x){return x.id===roleId;}),metrics=cat.indicators.filter(function(x){return x.roleId===roleId;});
      var table=make("table","kpi-table");var head=make("tr");
      ["Chỉ tiêu KPI","Trọng số","Mục tiêu","Kết quả","Trạng thái"].forEach(function(s){head.append(make("th","",s));});table.append(head);
      var entries={};metrics.forEach(function(m){var entry=getEntry(employee,m.id)||{};entries[m.id]=entry;var tr=make("tr");[m.name,m.weight+"%",String(m.target),entry.actual==null?"—":String(entry.actual),entry.status==="REVIEWED"?"Đã kiểm chứng":entry.status==="APPROVED"?"Đã duyệt":"Dự thảo"].forEach(function(v){tr.append(make("td","",v));});tr.tabIndex=0;tr.onclick=function(){selectedMetric=m.id;render();};table.append(tr);});
      el.append(table);
      var result=core.evaluate(role,cat.indicators,entries,{policyActive:false,assignmentAccepted:false});
      var summary=make("div","card");summary.append(make("h3","","Kết quả mô phỏng · "+period));summary.append(make("p","","Điểm tạm tính: "+(result.score==null?"Chưa đủ dữ liệu":result.score.toLocaleString("vi-VN"))+" · Hệ số tham khảo: "+(result.previewCoefficient==null?"—":result.previewCoefficient)));
      summary.append(make("p","","Trạng thái: CHƯA ĐỦ ĐIỀU KIỆN TRẢ LƯƠNG · Không tích hợp vào engine chính thức."));
      el.append(summary);
      if(!selectedMetric)return;
      var metric=metrics.find(function(x){return x.id===selectedMetric;}),e=getEntry(employee,selectedMetric)||{};
      var form=make("div","card");form.append(make("h3","",metric.id+" – "+metric.name));
      var actual=input("number",e.actual==null?"":e.actual);actual.step="any";row(form,"Số thực hiện (cùng đơn vị mục tiêu)",actual);
      var evidence=input("text",e.evidence||"");row(form,"Mã chứng từ / bằng chứng",evidence);
      form.append(make("p","hint","Nguồn yêu cầu: "+metric.source+". Mục tiêu: "+metric.target+". Quy tắc: "+metric.direction+"."));
      if(ctx.can("hr.approve")||ctx.can("formula.approve")){
        form.append(button("Xác nhận chứng từ (chưa duyệt tiền)",function(){
          if(ctx.closed(period)){ctx.toast("Kỳ đã khóa");return;}
          if(!assignment(employee)||assignment(employee).roleId!==roleId){ctx.toast("Phải giao vai trò trước khi xác nhận");return;}
          var current=getEntry(employee,selectedMetric);
          if(!current||!String(current.evidence||"").trim()||!Number.isFinite(Number(current.actual))){ctx.toast("Cần lưu kết quả và chứng từ hợp lệ trước");return;}
          if(!ctx.confirm("Xác nhận đã kiểm tra chứng từ "+selectedMetric+"? Kết quả vẫn chỉ là DỰ THẢO, không đưa vào lương."))return;
          var idx=db.kpi_evidence.indexOf(current);
          if(ctx.txn(["kpi_evidence"],function(){db.kpi_evidence[idx]=Object.assign({},current,{status:"REVIEWED",reviewedAt:new Date().toISOString()});ctx.audit("KPI_EVIDENCE_REVIEW",current.key);return true;})){ctx.toast("Đã kiểm tra chứng từ; chưa phê duyệt KPI trả lương");render();}
        }));
      }
      form.append(button("Lưu dự thảo",function(){
        var n=actual.value.trim()?Number(actual.value):null;
        if(n===null||!Number.isFinite(n)||n<0){ctx.toast("Số thực hiện không hợp lệ");return;}
        if(!evidence.value.trim()){ctx.toast("Cần cung cấp mã chứng từ");return;}
        if(storeEntry({key:keyFor(employee,selectedMetric),employeeId:employee,companyId:companyOf(),period:period,metricId:selectedMetric,roleId:roleId,actual:n,evidence:evidence.value.trim(),status:"DRAFT",updatedAt:new Date().toISOString()})){ctx.toast("Đã lưu dự thảo KPI, chưa phê duyệt");render();}
      }));el.append(form);
    }
    render();
  }
  root.HAKKPI=root.HAKKPI||{};root.HAKKPI.ui={mount:mount};
})(window);
