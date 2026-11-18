(function(root){
  'use strict';
  var node=typeof module!=='undefined'&&module.exports,V=node?require('./validate.js'):root.HAKCore.validate,I=node?require('./importer.js'):root.HAKCore.importer;
  function isProductionTotal(row){
    var label=String(row['Phiếu cân']||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ');
    var empty=function(c){return row[c]==null||String(row[c]).trim()==='';};
    return /^(total|grand total|tong|tong cong)$/.test(label)&&
      ['Ngày cân','Biển số','Mã phòng ban','Mã NV','NV vắng'].every(empty);
  }
  /** Ô chỉ có khoảng trắng là TRỐNG (không thành 0 âm thầm, dòng toàn khoảng trắng không thành dòng rác). Giữ số dòng gốc __line. */
  function blankRows(rows){
    return (rows||[]).map(function(r){
      if(!r||typeof r!=='object')return r;
      var o={};Object.keys(r).forEach(function(k){var v=r[k];o[k]=(typeof v==='string'&&v.trim()==='')?'':v;});
      if(r.__line!=null)Object.defineProperty(o,'__line',{value:r.__line});
      return o;
    });
  }
  function plan(db,key,period,cols,raw){
    if(!['chamcong','sanluong'].includes(key)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw Error('Bảng hoặc kỳ không hợp lệ');
    if((db.kyluong||[]).some(function(x){return x.ky===period;}))throw Error('Kỳ đã chốt — mở chốt trước khi thay/xóa');
    var stored=db[key]||[];
    var remove=[],totals=[],unresolved=[],rows=[],ignored=[],candidates=[];
    stored.forEach(function(row){
      var rowPeriod=V.rowPeriod(key,row);
      if(rowPeriod===period)remove.push(row);
      else if(key==='sanluong'&&isProductionTotal(row)){remove.push(row);totals.push(row);}
      else if(!rowPeriod)unresolved.push(row);
    });
    if(raw){
      if(!raw.length)throw Error('File không có dữ liệu; dùng nút Xóa kỳ nếu muốn xóa');
      var removed=new Set(remove),d=Object.assign({},db);
      d[key]=stored.filter(function(row){return !removed.has(row);});
      raw.forEach(function(row,i){
        if(key==='sanluong'&&isProductionTotal(row)){
          ignored.push({line:row.__line||i+2,label:row['Phiếu cân']});
          return;
        }
        candidates.push(row.__line?row:Object.defineProperty(Object.assign({},row),'__line',{value:i+2}));
      });
      var p=I.plan(d,key,cols,blankRows(candidates),{lockedPeriods:{},mode:'replace'});
      if(p.items.some(function(it){return !['add','merged'].includes(it.action);}))throw Error('File có dòng lỗi/trùng/xung đột. Chưa thay dữ liệu. '+p.items.filter(function(it){return !['add','merged'].includes(it.action);}).map(function(it){return it.reason||it.action;}).slice(0,3).join('; '));
      rows=p.items.filter(function(it){return it.action==='add';}).map(function(it){return it.row;});
      if(!rows.length||rows.some(function(r){return V.rowPeriod(key,r)!==period;}))throw Error('Mọi dòng trong file phải thuộc đúng kỳ '+period+'; không chấp nhận thiếu kỳ/ngày');
    }
    return{key:key,period:period,remove:remove,totals:totals,unresolved:unresolved,rows:rows,ignored:ignored,token:JSON.stringify(db[key]||[])};
  }
  /** Loại khỏi Sản lượng / Bơm dăm các dòng TỔNG (Total / Tổng cộng, không ngày cân, tổ, người) lẫn vào khi nhập file. Trả danh sách dòng đã loại. */
  function removeTotals(db){
    var out=[];
    ['sanluong','bandam'].forEach(function(key){
      var keep=[];(db[key]||[]).forEach(function(r){if(r&&isProductionTotal(r))out.push({table:key,row:r});else keep.push(r);});
      if(keep.length!==(db[key]||[]).length)db[key]=keep;
    });
    return out;
  }
  var api={plan:plan,removeTotals:removeTotals,blankRows:blankRows};if(node)module.exports=api;else root.HAKCore.inputBatch=api;
})(typeof window!=='undefined'?window:this);
