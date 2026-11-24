(function(root){
  'use strict';
  var node=typeof module!=='undefined'&&module.exports,V=node?require('./validate.js'):root.HAKCore.validate;
  var tables=['chamcong','sanluong','bandam'];
  var TABLE_NAMES={chamcong:'Chấm công',sanluong:'Sản lượng',bandam:'Ban dăm'};
  function employeeIssues(db){
    var out=[],seen=Object.create(null);
    (db&&db.nhanvien||[]).forEach(function(r,i){
      var ma=String(r&&r['Mã NV']||'').trim();
      if(!ma)return;
      if(seen[ma])out.push('Nhân sự dòng '+(i+1)+': trùng Mã NV "'+ma+'" — xóa hoặc sửa mã trùng trước khi tính lương');
      seen[ma]=true;
    });
    return out;
  }
  function issues(db,table,period){
    if(table==='nhanvien')return employeeIssues(db);
    var out=[],seen=Object.create(null),receipt=Object.create(null);
    (db[table]||[]).forEach(function(r,i){
      var p=V.rowPeriod(table,r),label=(TABLE_NAMES[table]||table)+' dòng '+(i+1)+': ';
      if(!p){out.push(label+'ngày/kỳ không hợp lệ — sửa hoặc xóa dòng lỗi trước khi tính lương');return;}
      if(p!==period||table==='chamcong')return;
      var id=String(r['Phiếu cân']||'').trim(),ma=String(r['Mã NV']||'').trim(),key=V.nearKey(id)+'|'+V.nearKey(ma),nid=V.nearKey(id);
      var quantity=String(r['KL hàng (Tấn)']==null?'':r['KL hàng (Tấn)']).trim();
      if(!/^\d+(?:[.,]\d+)?$/.test(quantity)||!(Number(quantity.replace(',','.'))>0)||!Number.isFinite(Number(quantity.replace(',','.'))))
        out.push(label+'phiếu '+(id||'(thiếu số)')+' có '+(table==='bandam'?'số xe':'khối lượng')+' không hợp lệ: '+(quantity||'(trống)')+' — nhập số lớn hơn 0 và kiểm tra các ô đỏ');
      if(!id)return;
      if(seen[key])out.push(label+'trùng khóa Phiếu cân + Mã NV ('+id+')');seen[key]=true;
      if(receipt[nid]!==undefined&&receipt[nid]!==!!ma)out.push(label+'phiếu '+id+' bị trộn phân bổ theo tổ và trực tiếp');
      receipt[nid]=!!ma;
    });return out;
  }
  function problems(db,period){var periods=[period],out=employeeIssues(db);(db.sl_chuyenky||[]).forEach(function(r){if(r.target===period)periods.push(r.source);});periods.forEach(function(p){tables.forEach(function(t){issues(db,t,p).forEach(function(m){if(out.indexOf(m)<0)out.push(m);});});});return out;}
  function assertPeriod(db,period){var p=problems(db,period);if(p.length)throw Error(p.join('; '));}
  // Keep drafts incomplete while typing, but never erase their period or change pump mode implicitly.
  function mutation(db,table,before,after){
    // v2.1.16 (mục 7, chủ chọn "chặn"): Thưởng/Trừ, Tạm ứng, Suất cơm không được lưu với Mã NV sai hoa/thường hoặc không có trong Nhân sự (trước đây engine bỏ qua im lặng).
    // Chỉ chặn khi Mã NV là giá trị MỚI/đổi — sửa ô khác của dòng cũ đã có mã mồ côi vẫn được (không bắt người dùng sửa dữ liệu cũ; cổng Chốt kỳ vẫn chặn, xem ui/input-orphans.js).
    if(after&&['psluong','ungluong','tiencom'].indexOf(table)>=0){
      var oma=String(after['Mã NV']==null?'':after['Mã NV']),prev=before?String(before['Mã NV']==null?'':before['Mã NV']):null;
      if(oma!==''&&oma!==prev){
        var emp={},low={};(db.nhanvien||[]).forEach(function(n){var m=n&&n['Mã NV'];if(m!=null&&m!==''){emp[String(m)]=1;low[String(m).trim().toLowerCase()]=String(m);}});
        if(!emp[oma]){var gan=low[oma.trim().toLowerCase()];return 'Mã NV "'+oma+'" không khớp Nhân sự'+(gan?' (gần giống "'+gan+'" — sai hoa/thường hoặc có khoảng trắng)':' (mã không tồn tại)')+' — không lưu vì khoản này sẽ bị BỎ QUA khi tính lương. Sửa Mã NV cho đúng.';}
      }
    }
    if(['sanluong','bandam'].indexOf(table)<0||!after)return '';
    if(!V.normDate(after['Ngày cân']))return 'Ngày cân không được trống hoặc sai; dòng chưa bị thay đổi';
    if(before&&!!before['Mã NV']!==!!after['Mã NV'])return 'Không đổi cách phân bổ bằng cách xóa/thêm Mã NV. Xóa phiếu rồi tạo lại ở đúng tab.';
    var id=String(after['Phiếu cân']||'').trim(),ma=String(after['Mã NV']||'').trim(),p=V.rowPeriod(table,after);
    if(id&&(db[table]||[]).some(function(r){return r!==before&&V.rowPeriod(table,r)===p&&V.nearKey(r['Phiếu cân'])===V.nearKey(id)&&(V.nearKey(r['Mã NV'])===V.nearKey(ma)||(!r['Mã NV']||!ma));}))return 'Phiếu trùng người nhận hoặc trộn hai cách phân bổ; sửa phiếu cũ thay vì nhập thêm';
    return '';
  }
  var api={issues:issues,problems:problems,assertPeriod:assertPeriod,mutation:mutation};if(node)module.exports=api;else root.HAKCore.inputSafety=api;
})(typeof window!=='undefined'?window:this);
