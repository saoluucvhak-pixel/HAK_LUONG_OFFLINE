  // ---------- Trang chủ ----------
  // @screen tabHome

  // ---------- Sao lưu ----------
  // @screen tabSaoLuu
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
      [["kyluong","Kỳ lương đã chốt"],["bangluong","Bảng lương đã chốt"],["chamcong","Chấm công"],["sanluong","Sản lượng"],["bandam","Bàn dầm"],["psluong","Phát sinh lương"],["ungluong","Tạm ứng"],["tiencom","Suất cơm"],["kyluong_lichsu","Lịch sử chốt"]].forEach(function(x){kind.appendChild(h("option",{value:x[0],text:x[1]}));});
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
