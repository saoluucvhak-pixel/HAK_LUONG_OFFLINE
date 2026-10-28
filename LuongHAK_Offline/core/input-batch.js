(function(root){
  'use strict';
  var node=typeof module!=='undefined'&&module.exports,V=node?require('./validate.js'):root.HAKCore.validate,I=node?require('./importer.js'):root.HAKCore.importer;
  function plan(db,key,period,cols,raw){
    if(!['chamcong','sanluong'].includes(key)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw Error('Bảng hoặc kỳ không hợp lệ');
    if((db.kyluong||[]).some(function(x){return x.ky===period;}))throw Error('Kỳ đã chốt — mở chốt trước khi thay/xóa');
    var remove=(db[key]||[]).filter(function(r){return V.rowPeriod(key,r)===period;}),rows=[];
    if(raw){
      if(!raw.length)throw Error('File không có dữ liệu; dùng nút Xóa kỳ nếu muốn xóa');
      var d=Object.assign({},db);d[key]=(db[key]||[]).filter(function(r){return remove.indexOf(r)<0;});
      var p=I.plan(d,key,cols,raw,{lockedPeriods:{},mode:'replace'});
      if(p.items.some(function(it){return !['add','merged'].includes(it.action);}))throw Error('File có dòng lỗi/trùng/xung đột. Chưa thay dữ liệu. '+p.items.filter(function(it){return !['add','merged'].includes(it.action);}).map(function(it){return it.reason||it.action;}).slice(0,3).join('; '));
      rows=p.items.filter(function(it){return it.action==='add';}).map(function(it){return it.row;});
      if(!rows.length||rows.some(function(r){return V.rowPeriod(key,r)!==period;}))throw Error('Mọi dòng trong file phải thuộc đúng kỳ '+period+'; không chấp nhận thiếu kỳ/ngày');
    }
    return{key:key,period:period,remove:remove,rows:rows,token:JSON.stringify(db[key]||[])};
  }
  var api={plan:plan};if(node)module.exports=api;else root.HAKCore.inputBatch=api;
})(typeof window!=='undefined'?window:this);
