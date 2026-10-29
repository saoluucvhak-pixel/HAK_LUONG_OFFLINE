(function(root){
  'use strict';
  var node=typeof module!=='undefined'&&module.exports,V=node?require('./validate.js'):root.HAKCore.validate;
  var tables=['chamcong','sanluong','bandam'];
  function mode(r){return r['Mã NV']?'direct':'team';}
  function rows(db,table,period,kind){return (db[table]||[]).filter(function(r){return V.rowPeriod(table,r)===period&&(table!=='bandam'||mode(r)===kind);});}
  function entry(db,table,period,kind){return (db._inputReviews||[]).find(function(r){return r.table===table&&r.period===period&&r.kind===(kind||'');});}
  function changed(db,table,period,kind){if(!db._inputReviews)return false;var e=entry(db,table,period,kind);return JSON.stringify(rows(db,table,period,kind))!==JSON.stringify(e?e.rows:[]);}
  function approve(db,table,period,kind,user){
    if(tables.indexOf(table)<0||!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw Error('Bảng hoặc kỳ không hợp lệ');
    if(table==='bandam'&&['direct','team'].indexOf(kind)<0)throw Error('Chọn loại phân bổ bơm dăm');
    var e=entry(db,table,period,kind);if(!rows(db,table,period,kind).length){if(e)db._inputReviews.splice(db._inputReviews.indexOf(e),1);db.schemaVersion=Math.max(5,db.schemaVersion||0);return;}if(!e){e={table:table,period:period,kind:kind||''};db._inputReviews.push(e);}
    e.rows=JSON.parse(JSON.stringify(rows(db,table,period,kind)));e.user=user||'';e.at=new Date().toISOString();db.schemaVersion=Math.max(5,db.schemaVersion||0);
  }
  // Dữ liệu đã dùng ở bản cũ được giữ là đã lưu. Chỉ chuyển một lần, trước mọi chỉnh sửa/nhập mới.
  function initialize(db){if(db._inputReviews!==undefined)return;db._inputReviews=[];tables.forEach(function(t){var seen={};(db[t]||[]).forEach(function(r){var p=V.rowPeriod(t,r),k=t==='bandam'?mode(r):'';if(p&&!seen[p+'|'+k]){seen[p+'|'+k]=true;approve(db,t,p,k,'Chuyển từ bản cũ');}});});db.schemaVersion=Math.max(5,db.schemaVersion||0);}
  function pending(db,period){var periods=[period];(db.sl_chuyenky||[]).forEach(function(r){if(r.target===period)periods.push(r.source);});var out=[];periods.filter(function(p,i,a){return a.indexOf(p)===i;}).forEach(function(p){tables.forEach(function(t){(t==='bandam'?['team','direct']:['']).forEach(function(k){if(changed(db,t,p,k))out.push({table:t,period:p,kind:k});});});});return out;}
  function message(db,period){return pending(db,period).map(function(r){return ({chamcong:'Chấm công',sanluong:'Sản lượng',bandam:'Bơm dăm'})[r.table]+(r.kind==='team'?' theo tổ':r.kind==='direct'?' trực tiếp':'')+' kỳ '+r.period;}).join('; ');}
  function assertReady(db,period){validate(db);var m=message(db,period);if(m)throw Error('Còn dữ liệu Nháp: '+m+'. Mở bảng và bấm Lưu để tính lương.');}
  function validate(db){if(db._inputReviews===undefined){if(db.schemaVersion>=5)throw Error('Thiếu trạng thái lưu nhập liệu');return;}if(!Array.isArray(db._inputReviews)||!(db.schemaVersion>=5))throw Error('Trạng thái lưu nhập liệu sai cấu trúc');var seen={};db._inputReviews.forEach(function(r){if(!r||tables.indexOf(r.table)<0||!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.period)||!Array.isArray(r.rows)||(r.table==='bandam'?['team','direct'].indexOf(r.kind)<0:r.kind!=='')||r.rows.some(function(x){return !x||V.rowPeriod(r.table,x)!==r.period||(r.table==='bandam'&&mode(x)!==r.kind);}))throw Error('Bản xác nhận nhập liệu không hợp lệ');var k=r.table+'|'+r.period+'|'+r.kind;if(seen[k])throw Error('Trùng bản xác nhận nhập liệu');seen[k]=true;});}
  function assertValid(db,table,period,kind){rows(db,table,period,kind).forEach(function(r,i){var label='Dòng '+(i+1)+': ';if(table==='chamcong'){if(!(db.nhanvien||[]).some(function(n){return n['Mã NV']===r['Mã NV'];}))throw Error(label+'Mã NV không có trong Nhân sự');for(var day=1;day<=31;day++){var k=('0'+day).slice(-2),v=V.dayCell(k,r[k],period);if(v.error)throw Error(label+v.error);}}else{if(!r['Phiếu cân']||!V.normDate(r['Ngày cân'])||!(V.parseMoney(r['KL hàng (Tấn)'])>0))throw Error(label+'cần số phiếu, ngày cân và số lượng lớn hơn 0');if(r['Mã NV']){if(!(db.nhanvien||[]).some(function(n){return n['Mã NV']===r['Mã NV'];}))throw Error(label+'Mã NV không có trong Nhân sự');}else if(!r['Mã phòng ban'])throw Error(label+'chưa chọn tổ');}});}
  var api={initialize:initialize,approve:approve,changed:changed,pending:pending,message:message,assertReady:assertReady,assertValid:assertValid,validate:validate,rows:rows,mode:mode};if(node)module.exports=api;else root.HAKCore.inputReview=api;
})(typeof window!=='undefined'?window:this);
