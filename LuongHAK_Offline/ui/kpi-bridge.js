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
    function keyFor(id,metric){return periodKey+"|"+companyOf()+"|"+id+"|"+metric;}
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
      var preview=make("div","card");preview.append(make("h3","","Mô phỏng lương thời gian · Vệ sinh / Bảo dưỡng"));
      preview.append(make("p","hint","Tách B (BHXH tham chiếu), M (mục tiêu tháng), D (ngày công), K (hệ số vệ sinh); khoản vượt 24 chỉ là mô phỏng, không mặc nhiên là tăng ca. Không ghi vào bảng lương."));
      var sim=root.HAKKPI.timeStructure, catSel=make("select","i");
      Object.keys(sim.CATEGORIES).forEach(function(key){catSel.append(new root.Option(sim.CATEGORIES[key],key));});
      var config=[["B – Mức lương BHXH tham chiếu","insuranceBase","6000000"],["M – Thu nhập tháng mục tiêu","monthlyTarget","8000000"],["D – Công hưởng hợp lệ","paidDays","24"],["Công chuẩn","standardDays","24"],["K – Hệ số vệ sinh/bảo dưỡng","careCoefficient","1"],["Hệ số công vượt chuẩn","extraCoefficient","1"],["Mức vệ sinh tháng được duyệt","careMonthly","1500000"],["Các khoản cố định khác","otherMonthly","500000"]];
      var pvValues={}, panel=make("div","bar");row(panel,"Loại công việc",catSel);
      config.forEach(function(it){var e=input("number",it[2]);e.step="any";pvValues[it[1]]=e;row(panel,it[0],e);});
      var gradeMode=make("select","i");
      gradeMode.append(new root.Option("Nhập hệ số K trực tiếp","MANUAL"));
      gradeMode.append(new root.Option("Xếp mức A/B/C/D cả tháng","MONTH"));
      gradeMode.append(new root.Option("Xếp mức A/B/C/D theo ngày","BY_DAY"));
      gradeMode.value="BY_DAY";row(panel,"Phương thức tính vệ sinh",gradeMode);
      var gradeMonth=make("select","i"), gradeDays={};
      Object.keys(sim.CARE_LEVELS).forEach(function(key){
        gradeMonth.append(new root.Option("Mức "+key+" – K="+sim.CARE_LEVELS[key],key));
        var field=input("number",key==="A"?"24":"0");field.min="0";field.step="0.5";gradeDays[key]=field;
        row(panel,"Số ngày mức "+key+" (K="+sim.CARE_LEVELS[key]+")",field);
      });
      row(panel,"Xếp mức cả tháng",gradeMonth);
      preview.append(panel);var out=make("div","hint");
      preview.append(button("Tính thử cơ cấu & biến liên kết",function(){
        var args={category:catSel.value,policyApproved:false,evidenceReviewed:false,contractVerified:false};
        config.forEach(function(it){args[it[1]]=pvValues[it[1]].value;});
        args.careLevelMode=gradeMode.value;args.careLevel=gradeMonth.value;
        args.careLevelDays={};Object.keys(gradeDays).forEach(function(key){args.careLevelDays[key]=gradeDays[key].value;});
        var z=sim.compute(args);out.replaceChildren();
        if(!z.ok){out.textContent="Dữ liệu không hợp lệ: "+z.errors.join("; ");return;}
        var labels=[["Lương theo mức BH tham chiếu (mô phỏng)",z.components.baseTime],["Vệ sinh / bảo dưỡng",z.components.careMaintenance],["Khoản cố định khác",z.components.otherFixed],["Công vượt chuẩn – chỉ báo kiểm tra",z.components.overStandardPreview],["Tổng mô phỏng",z.comparison.totalSimulated],["Lệch với thu nhập mục tiêu",z.comparison.differenceFromTarget],["Phần mục tiêu chưa phân loại",z.comparison.unallocatedMonthly],["Biến thiên mỗi 1 công trong chuẩn",z.links.perRegularDayAtFullCare],["Biến thiên mỗi 1 đơn vị hệ số K",z.links.perCareCoefficientUnit]];
        labels.forEach(function(it){out.append(make("p","",it[0]+": "+Math.round(it[1]).toLocaleString("vi-VN")+" đ"));});
        if(z.careLevels){
          out.append(make("p","","Ngày quy đổi theo K: "+z.careLevels.weightedDays.toLocaleString("vi-VN")+
            " · K bình quân: "+z.careLevels.averageCoefficient.toLocaleString("vi-VN")+
            " · Ngày chưa xếp mức: "+z.careLevels.pendingDays));
        }
        z.issues.forEach(function(s){out.append(make("p","", "⚠ "+s));});
      }));preview.append(out);el.append(preview);
      var guarantee=make("div","card");guarantee.append(make("h3","","Bảo đảm thu nhập tháng + KPI ngoài bảo đảm"));
      guarantee.append(make("p","hint","Bù bảo đảm không phụ thuộc hệ số vệ sinh hay KPI. Nhập riêng lương hợp đồng, lương bảo đảm và quỹ thưởng; không dùng mức BHXH thay lương hợp đồng."));
      var gFields=[["Lương bảo đảm tháng","guaranteeMonthly","8000000"],["Lương thời gian theo hợp đồng","contractualBaseMonthly","6000000"],["Tỷ lệ quyền hưởng bảo đảm","entitledRatio","1"],["Công hưởng trong kỳ","paidDays","24"],["Công chuẩn","standardDays","24"],["Vệ sinh/bảo dưỡng đã tính","careEarned","1050000"],["Khoản khác nằm trong bảo đảm (mức tháng)","otherMonthly","500000"],["KPI mục tiêu ngoài bảo đảm","kpiTarget","1200000"],["Hệ số KPI đã đánh giá","kpiCoefficient","0.95"],["Công được hưởng KPI","kpiEligibleDays","24"]];
      var gInputs={},gPanel=make("div","bar");gFields.forEach(function(item){var e=input("number",item[2]);e.step="any";gInputs[item[1]]=e;row(gPanel,item[0],e);});guarantee.append(gPanel);
      var gOutput=make("div","hint");guarantee.append(button("Tính mức bù bảo đảm + KPI mô phỏng",function(){
        var x={contractVerified:false,guaranteeApproved:false,kpiApproved:false,careReviewed:false};
        gFields.forEach(function(item){x[item[1]]=gInputs[item[1]].value;});
        var resultG=root.HAKKPI.guarantee.calc(x);gOutput.replaceChildren();
        if(!resultG.ok){gOutput.textContent=resultG.errors.join("; ");return;}
        [["Lương thời gian",resultG.components.contractBaseTime],["Tiền vệ sinh/bảo dưỡng",resultG.components.careMaintenance],
         ["Khoản khác trong bảo đảm",resultG.components.otherInsideGuarantee],["Bù bảo đảm",resultG.components.guaranteeTopup],
         ["Tổng trước KPI",resultG.components.protectedAfterTopup],["Thưởng KPI mô phỏng",resultG.components.kpiPreview],
         ["Tổng bao gồm KPI",resultG.comparison.totalPreviewWithKpi]].forEach(function(item){
           gOutput.append(make("p","",item[0]+": "+item[1].toLocaleString("vi-VN")+" đ"));
         });resultG.issues.forEach(function(s){gOutput.append(make("p","","⚠ "+s));});
      }));guarantee.append(gOutput);el.append(guarantee);
      var incBox=make("div","card");incBox.append(make("h3","","Phương án đã chốt: Lương cố định bao gồm KPI"));
      incBox.append(make("p","hint","Lương cơ cấu C+V+P+F=M; hệ số không làm giảm mức bảo đảm. KPI không cộng ngoài tổng sau bù. Suy ngược cần tổng trước bù và đúng một hệ số đã biết."));
      var incFields=[["Thu nhập tháng bảo đảm M","guaranteedMonthly","8000000"],["Lương thời gian hợp đồng C","baseMonthly","6000000"],["Vệ sinh mục tiêu V","hygieneTarget","1200000"],["KPI mục tiêu P (nằm trong M)","kpiTarget","800000"],["Khoản khác F (nằm trong M)","otherInsideTarget","0"],["Công chuẩn N","standardDays","24"],["Công hưởng D","paidDays","24"],["Ngày vệ sinh DV","hygieneDays","24"],["Ngày KPI DP","kpiDays","24"],["Hệ số vệ sinh KV","hygieneFactor","0.9"],["Hệ số KPI KP","kpiFactor","0.75"],["Tỷ lệ quyền hưởng bảo đảm H","guaranteeEntitlementRatio","1"]];
      var incValues={},incPanel=make("div","bar");incFields.forEach(function(f){var control=input("number",f[2]);control.step="any";incValues[f[1]]=control;row(incPanel,f[0],control);});
      incBox.append(incPanel);var incOutput=make("div","hint");
      incBox.append(button("Tính cơ cấu có KPI trong lương",function(){
        var inputArgs={};incFields.forEach(function(f){inputArgs[f[1]]=incValues[f[1]].value;});
        var z=root.HAKKPI.included.calc(inputArgs);incOutput.replaceChildren();
        if(!z.ok){incOutput.textContent=z.errors.join("; ");return;}
        [["Lương thời gian",z.components.baseTime],["Vệ sinh thực đạt",z.components.hygieneEarned],["KPI thực đạt (nằm trong M)",z.components.kpiEarned],["Tổng trước bù",z.components.beforeTopup],["Bù bảo đảm",z.components.guaranteeTopup],["Thu nhập sau bù (KPI đã bao gồm)",z.components.afterTopup],["Phần vượt cần đối chiếu",z.components.excessBeforeTopup]].forEach(function(a){incOutput.append(make("p","",a[0]+": "+a[1].toLocaleString("vi-VN")+"đ"));});
        z.warnings.forEach(function(s){incOutput.append(make("p","","⚠ "+s));});
      }));incBox.append(incOutput);el.append(incBox);
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
