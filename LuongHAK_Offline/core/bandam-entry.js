(function(root){
  'use strict';
  var node=typeof module!=='undefined'&&module.exports,V=node?require('./validate.js'):root.HAKCore.validate;
  function build(db,input,target){
    var mode=input.mode;if(!['direct','team'].includes(mode))throw Error('Chọn cách phân bổ');
    var row={'Phiếu cân':String(input['Phiếu cân']||'').trim(),'Ngày cân':V.normDate(input['Ngày cân'])||'','Biển số':String(input['Biển số']||'').trim()};
    if(!row['Phiếu cân']||!row['Ngày cân'])throw Error('Cần số phiếu và ngày cân hợp lệ');
    var value=V.normCell('KL hàng (Tấn)',input['KL hàng (Tấn)']);
    if(value.error||!Number.isFinite(V.parseMoney(value.value))||!(V.parseMoney(value.value)>0))throw Error('Số xe được giao phải lớn hơn 0');
    row['KL hàng (Tấn)']=value.value;
    row['Mã NV']=mode==='direct'?String(input['Mã NV']||'').trim():'';
    row['Mã phòng ban']=mode==='team'?String(input['Mã phòng ban']||'').trim():'';
    row['NV vắng']=mode==='team'?String(input['NV vắng']||'').trim():'';
    if(mode==='direct'&&!(db.nhanvien||[]).some(function(n){return n['Mã NV']===row['Mã NV'];}))throw Error('Chọn đúng Mã NV nhận phiếu');
    if(mode==='team'&&!(db.dm_phongban||[]).some(function(p){return p['Mã phòng ban']===row['Mã phòng ban'];}))throw Error('Chọn đúng tổ/phòng ban');
    if((db.bandam||[]).some(function(r){return r!==target&&String(r['Phiếu cân']||'').trim()===row['Phiếu cân']&&(!r['Mã NV']||!row['Mã NV']||r['Mã NV']===row['Mã NV']);}))throw Error('Phiếu trùng người nhận hoặc đang chia theo tổ; hãy sửa phiếu cũ thay vì nhập thêm');
    return row;
  }
  var api={build:build};if(node)module.exports=api;else root.HAKCore.bandamEntry=api;
})(typeof window!=='undefined'?window:this);
