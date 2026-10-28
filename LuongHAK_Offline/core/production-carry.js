// Sổ chuyển toàn bộ sản lượng giữa hai kỳ cùng năm. Căn cứ người/công/phiếu nguồn bất biến;
// đơn giá và quy chế bù lấy ở kỳ trả. Chỉ tách thu nhập SL/bù, không dời ngày cân hay công.
(function(root){
  'use strict';
  var node=typeof module!=='undefined'&&module.exports;
  function deps(){return node?{H:require('../hr.js'),E:require('../engine.js')}:{H:root.HRM||root.HRModule,E:root.LuongEngine};}
  function period(s){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(s||''))throw Error('Kỳ không hợp lệ');return{y:+s.slice(0,4),m:+s.slice(5,7)};}
  function closed(db,k){return(db.kyluong||[]).some(function(x){return x.ky===k;});}
  function collect(db,source){var p=period(source),d=deps(),staff=d.H.staffForPayroll(db,p.y,p.m),sl=d.H.sanLuongKy(db,p.y,p.m,'sanluong'),cc=(db.chamcong||[]).filter(function(x){return x['Kỳ']===source;});return{staff:staff.list,sl:sl,cc:cc,basis:JSON.stringify([(db.sanluong||[]).filter(function(x){return String(x['Ngày cân']||'').slice(0,7)===source;}),cc,staff.list.map(function(n){return [n['Mã nhân viên'],n['Mã PB'],n['Mã tiền lương 1'],n['Mã tiền lương 2']];}),sl.rows.map(function(r){return [r['Mã NV'],r['Ngày cân'],r['KL hàng (Tấn)']];}),d.H.sanLuongKy(db,p.y,p.m,'bandam').rows])};}
  function assertSource(db,source,c){
    if(!c.sl.rows.length||c.sl.chuaGan.length||c.sl.alloc.unallocated>0.000001||(c.sl.alloc.warnings||[]).length)throw Error('Kỳ nguồn chưa phân bổ sạch: kiểm tra công thực tế, tổ và NV vắng trước');
    var seen={};(db.sanluong||[]).filter(function(r){return String(r['Ngày cân']||'').slice(0,7)===source;}).forEach(function(r){if(!(node?require('./validate.js'):root.HAKCore.validate).normDate(r['Ngày cân']))throw Error('Ngày cân nguồn không hợp lệ');var id=String(r['Phiếu cân']||'').trim(),key=id+'|'+String(r['Mã NV']||'');if(!(deps().E.num(r['KL hàng (Tấn)'])>0))throw Error('Khối lượng nguồn phải lớn hơn 0');if(!id||seen[key])throw Error('Phiếu nguồn thiếu số phiếu hoặc trùng khóa; đối soát trước khi chuyển');seen[key]=1;});
    c.sl.rows.forEach(function(r){var dd=String(r['Ngày cân']).slice(8,10);if(!c.cc.some(function(cc){return cc['Mã NV']===r['Mã NV']&&!['PN','CL','CC'].includes(String(cc['Hình thức công']||'BT').trim().toUpperCase())&&parseFloat(String(cc[dd]||'').replace(',','.'))>0;}))throw Error('Thiếu công thực tế ngày cân của '+r['Mã NV']+' tại kỳ nguồn');});
  }
  function validate(db,previous,allowUnreviewed){var list=db.sl_chuyenky||[],seen={};if(db.sl_chuyenky!==undefined&&!Array.isArray(db.sl_chuyenky))throw Error('Sổ chuyển sản lượng sai cấu trúc');if(list.length&&!(db.schemaVersion>=4))throw Error('Sổ chuyển kỳ cần cấu trúc dữ liệu 4');
    list.forEach(function(r){period(r.source);period(r.target);if(r.id!=='SL-'+r.source+'-'+r.target||r.target<=r.source||r.source.slice(0,4)!==r.target.slice(0,4)||seen[r.source])throw Error('Kỳ chi trả phải sau kỳ phát sinh; mỗi kỳ phát sinh chỉ chuyển một lần');seen[r.source]=1;
      if((db._yearArchives||[]).some(function(a){return a.active&&(String(a.year)===r.source.slice(0,4)||String(a.year)===r.target.slice(0,4));}))throw Error('Đưa hồ sơ năm nguồn và năm chi trả về vùng đang làm trước');
      if(!allowUnreviewed){var targetPeriod=period(r.target),tax=deps().E.taxResolver(db,targetPeriod.y,targetPeriod.m);payments(db,r.target).filter(function(x){return x.id===r.id&&x.retired;}).forEach(function(x){if(!x.taxCode||tax.phuongPhap(x.taxCode).kieu==='LOI')throw Error('Chọn mã thuế kỳ chi trả cho người đã nghỉ: '+x.ma);});}
      var old=(previous&&previous.sl_chuyenky||[]).find(function(x){return x.id===r.id;});
      if(previous&&closed(db,r.target)&&(!old||JSON.stringify(old)!==JSON.stringify(r)))throw Error('Kỳ chi trả đã chốt');
      var sourceData=collect(db,r.source);assertSource(db,r.source,sourceData);
      if(r.basis!==sourceData.basis)throw Error('Công/phiếu/hồ sơ kỳ '+r.source+' đã đổi sau khi chuyển. Hủy chuyển và lập lại trước khi sửa.');
      if(!old&&closed(db,r.source)){var k=(db.kyluong||[]).find(function(x){return x.ky===r.source;});if(!k.kq||!Array.isArray(k.kq.bangluong)||k.kq.bangluong.some(function(x){return +x['Lương sản lượng']>0||+x['Lương bù SL']>0;}))throw Error('Kỳ nguồn đã có tiền sản lượng/bù hoặc thiếu đối soát — mở chốt và đối soát trước, không chuyển trùng');}
    });
    if(previous)(previous.sl_chuyenky||[]).forEach(function(r){if(!list.some(function(x){return x.id===r.id;})&&(closed(previous,r.target)||closed(previous,r.source)))throw Error('Không hủy chuyển khi kỳ nguồn hoặc kỳ chi trả đã chốt');});
    return true;
  }
  function draft(db,source,target){period(source);period(target);if(source.slice(0,4)!==target.slice(0,4))throw Error('Bản này hỗ trợ chuyển kỳ trong cùng năm');if(target<=source||closed(db,target))throw Error('Chọn kỳ chi trả sau kỳ phát sinh và chưa chốt');var c=collect(db,source);
    assertSource(db,source,c);
    var r={id:'SL-'+source+'-'+target,source:source,target:target,basis:c.basis};var n=Object.assign({},db,{schemaVersion:4,sl_chuyenky:(db.sl_chuyenky||[]).concat([r])});validate(n,db,true);return r;
  }
  function payments(db,ky,bu,opts){if(!(db.sl_chuyenky||[]).some(function(r){return r.target===ky;}))return [];var d=deps(),E=d.E,H=d.H,target=period(ky),out=[],targetStaff=H.staffForPayroll(db,target.y,target.m).list;
    (db.sl_chuyenky||[]).filter(function(r){return r.target===ky;}).forEach(function(r){var p=period(r.source),c=collect(db,r.source),rate=E.hieuLuc(db.dm_luong||[],'Mã lương',target.y,target.m),dm=Object.keys(rate).map(function(k){return Object.assign({},rate[k],{'Hiệu lực từ':r.source+'-01','Hiệu lực đến':''});});
      c.sl.rows.forEach(function(x){var ns=c.staff.find(function(n){return n['Mã nhân viên']===x['Mã NV'];}),code=ns&&ns['Mã tiền lương 1'],rec=rate[code];if(!rec||!/SP/i.test(rec['Mã hình thức lương']||'')||!(E.money(rec['Số tiền khoán'])>0))throw Error('Thiếu mã SP/đơn giá SL hiệu lực kỳ chi trả cho '+x['Mã NV']);});
      var qc=E.quyCheBuChinhThuc(db.dm_quychebu,target.y,target.m),method=qc&&qc['Cách bù'];if(!['to','daihiep'].includes(method))throw Error('Cần quy chế bù chính thức kỳ chi trả '+ky);
      var data=Object.assign({},db,{dm_luong:dm,nhansu:c.staff,sanluong:c.sl.rows,bandam:H.sanLuongKy(db,p.y,p.m,'bandam').rows,chamcong:c.cc,psluong:[],ungluong:[],tiencom:[]});
      var result=E.tinhBangLuong(data,p.y,p.m,method,Object.assign({},opts,{productionPayDays:new Date(target.y,target.m,0).getDate()}));
      if((result.loiCongThuc||[]).length||(result.loiCongChuan||[]).length)throw Error('Công thức/công chuẩn kỳ nguồn còn lỗi');
      result.bangluong.forEach(function(x){if(!(x['Sản lượng (tấn)']>0)&&!(x['Lương bù SL']>0))return;var ns=c.staff.find(function(n){return n['Mã nhân viên']===x['Mã NV'];});out.push({id:r.id,source:r.source,target:ky,ma:x['Mã NV'],name:x['Họ và tên'],quantity:x['Sản lượng (tấn)'],salary:x['Lương sản lượng'],topup:x['Lương bù SL'],staff:ns,taxCode:(r.taxOverrides||{})[x['Mã NV']]||'',retired:!targetStaff.some(function(n){return n['Mã nhân viên']===x['Mã NV'];})});});
    });return out;
  }
  function prepare(db,ky,staff,sl,bu,opts){if(db.sl_chuyenky!==undefined&&!Array.isArray(db.sl_chuyenky))throw Error('Sổ chuyển sai cấu trúc');if(Array.isArray(db.sl_chuyenky||[])&&!(db.sl_chuyenky||[]).length)return{data:Object.assign({},db,{nhansu:staff,sanluong:sl}),staff:staff,pay:[],suppress:false};validate(db,db);var pay=payments(db,ky,bu,opts),list=staff.slice(),ps=(db.psluong||[]).slice(),ghost=Object.create(null);
    pay.forEach(function(x){if(!list.some(function(n){return n['Mã nhân viên']===x.ma;})){var n={};['Mã nhân viên','Họ và tên','Mã PB','Mã CV','Mã TNCN','Mã GT_TNCN_BT','Mã GT_TNCN_PT','Người phụ thuộc','HTTT','Số tài khoản','Tên Ngân hàng','Số HĐLĐ'].forEach(function(k){n[k]=x.staff[k];});n['Mã TNCN']=x.taxCode;n['Người phụ thuộc']=deps().H.dsNguoiPhuThuoc(db,x.ma,ky+'-01',ky+'-31').length;list.push(n);ghost[x.ma]=1;}ps.push({'Ngày hạch toán':ky+'-01','Số chứng từ':x.id+'-'+x.ma,'Mã NV':x.ma,'Thu nhập khác':x.salary+x.topup});});
    var source=(db.sl_chuyenky||[]).some(function(r){return r.source===ky;});
    return{data:Object.assign({},db,{nhansu:list,sanluong:source?[]:sl,psluong:ps,chamcong:(db.chamcong||[]).filter(function(r){return !ghost[r['Mã NV']]||r['Kỳ']!==ky;})}),staff:list,pay:pay,suppress:source};
  }
  function annotate(kq,pay){kq.bangluong.forEach(function(r){var rows=pay.filter(function(x){return x.ma===r['Mã NV'];});if(rows.length){r['Kỳ sản lượng chuyển']=rows.map(function(x){return x.source;}).join(', ');r['SL kỳ trước (tấn)']=rows.reduce(function(n,x){return n+x.quantity;},0);r['Lương SL kỳ trước']=rows.reduce(function(n,x){return n+x.salary;},0);r['Bù SL kỳ trước']=rows.reduce(function(n,x){return n+x.topup;},0);}});return kq;}
  var api={draft:draft,validate:validate,payments:payments,prepare:prepare,annotate:annotate};if(node)module.exports=api;else root.HAKCore.productionCarry=api;
})(typeof window!=='undefined'?window:this);
