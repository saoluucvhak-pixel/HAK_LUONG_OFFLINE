(function(root){
  'use strict';
  var node=typeof module!=='undefined'&&module.exports,V=node?require('./validate.js'):root.HAKCore.validate;
  var tables=['chamcong','sanluong','bandam'];
  function issues(db,table,period){
    var out=[],seen=Object.create(null),receipt=Object.create(null);
    (db[table]||[]).forEach(function(r,i){
      var p=V.rowPeriod(table,r),label=table+' dòng '+(i+1)+': ';
      if(!p){out.push(label+'ngày/kỳ không hợp lệ — sửa hoặc xóa dòng lỗi trước khi tính lương');return;}
      if(p!==period||table==='chamcong')return;
      var id=String(r['Phiếu cân']||'').trim(),ma=String(r['Mã NV']||'').trim(),key=id+'|'+ma;
      if(!id)return;
      if(seen[key])out.push(label+'trùng khóa Phiếu cân + Mã NV ('+id+')');seen[key]=true;
      if(table==='bandam'&&receipt[id]!==undefined&&receipt[id]!==!!ma)out.push(label+'phiếu '+id+' bị trộn phân bổ theo tổ và trực tiếp');
      receipt[id]=!!ma;
    });return out;
  }
  function problems(db,period){var periods=[period],out=[];(db.sl_chuyenky||[]).forEach(function(r){if(r.target===period)periods.push(r.source);});periods.forEach(function(p){tables.forEach(function(t){issues(db,t,p).forEach(function(m){if(out.indexOf(m)<0)out.push(m);});});});return out;}
  function assertPeriod(db,period){var p=problems(db,period);if(p.length)throw Error(p.join('; '));}
  // Keep drafts incomplete while typing, but never erase their period or change pump mode implicitly.
  function mutation(db,table,before,after){
    if(['sanluong','bandam'].indexOf(table)<0||!after)return '';
    if(!V.normDate(after['Ngày cân']))return 'Ngày cân không được trống hoặc sai; dòng chưa bị thay đổi';
    if(table==='bandam'&&before&&!!before['Mã NV']!==!!after['Mã NV'])return 'Không đổi cách phân bổ bằng cách xóa/thêm Mã NV. Xóa phiếu rồi tạo lại ở đúng tab.';
    var id=String(after['Phiếu cân']||'').trim(),ma=String(after['Mã NV']||'').trim(),p=V.rowPeriod(table,after);
    if(id&&(db[table]||[]).some(function(r){return r!==before&&V.rowPeriod(table,r)===p&&String(r['Phiếu cân']||'').trim()===id&&(String(r['Mã NV']||'').trim()===ma||(table==='bandam'&&(!r['Mã NV']||!ma)));}))return 'Phiếu trùng người nhận hoặc trộn hai cách phân bổ; sửa phiếu cũ thay vì nhập thêm';
    return '';
  }
  var api={issues:issues,problems:problems,assertPeriod:assertPeriod,mutation:mutation};if(node)module.exports=api;else root.HAKCore.inputSafety=api;
})(typeof window!=='undefined'?window:this);
