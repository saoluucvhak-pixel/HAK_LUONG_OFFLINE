// Styled insurance workbook. Presentation only; supplied report values are preserved.
(function(root){
  'use strict';
  var node=typeof module!=='undefined'&&module.exports;
  var RX=node?require('./report-xlsx'):root.HAKUi.reportXlsx;
  var TITLES={TongHop:'TỔNG HỢP BẢO HIỂM THEO KHOẢN',TangGiam:'BIẾN ĐỘNG BẢO HIỂM',TheoPhongBan:'TỔNG HỢP BẢO HIỂM THEO PHÒNG BAN',ChiTiet:'CHI TIẾT BẢO HIỂM NGƯỜI LAO ĐỘNG'};
  var EMPTY={TongHop:['Khoản','Công ty đóng','Người lao động đóng (trừ lương)','Cộng'],TangGiam:['Loại','Mã NV','Họ và tên','Phòng ban','Lương đóng kỳ trước','Lương đóng kỳ này'],TheoPhongBan:['Phòng ban','Số người','Cộng BH công ty đóng','Cộng BH NLĐ đóng','Truy thu bảo hiểm'],ChiTiet:['STT','Mã NV','Họ và tên','Phòng ban','Lương đóng BHXH','NLĐ.BHXH','NLĐ.BHYT','NLĐ.BHTN','Cộng BH NLĐ đóng']};
  function build(X,sheets,meta){
    meta=meta||{};
    var vms=sheets.map(function(sh){
      var rows=(sh.rows||[]).slice(),keys=rows.length?Object.keys(rows[0]):EMPTY[sh.name],total=null;
      if(rows.length&&keys.some(function(k){return /^TỔNG/i.test(String(rows[rows.length-1][k]||''));})) total=rows.pop();
      var money=function(k){return /^(CTY\.|NLĐ\.)|đóng|bảo hiểm|truy thu|lương|^Cộng$|^Tổng BH/i.test(k)&&!/^Mã|^Số sổ|^Ghi chú|^Loại/.test(k);};
      var cols=keys.map(function(k){return{key:k,label:k,kind:money(k)?'money':/^(STT|Số người)$/.test(k)?'qty':'text'};});
      var tong={};if(total)cols.forEach(function(c){if(c.kind!=='text'&&typeof total[c.key]==='number')tong[c.key]=total[c.key];});
      return{sheetName:sh.name,title:TITLES[sh.name],congTy:meta.congTy||'',kyText:meta.kyText||'',trangThai:meta.trangThai||'',phamVi:meta.phamVi||'Toàn bộ',donVi:'Đồng (VND)',ngayLap:meta.ngayLap||'',cols:cols,rows:rows,tong:tong,chuKy:['Người lập','Kế toán trưởng']};
    });
    var wb=RX.buildMany(X,vms,{chuKy:['Người lập','Kế toán trưởng'],nguoiLap:meta.nguoiLap});
    wb.worksheets.forEach(function(ws,index){
      var vm=vms[index],nc=vm.cols.length,hr=7,end=hr+vm.rows.length;
      ws.views=[{state:'frozen',ySplit:hr,showGridLines:false}];
      ws.getRow(hr).height=46;
      vm.cols.forEach(function(c,i){
        var col=ws.getColumn(i+1);col.width=c.kind==='money'?22:/^STT$/.test(c.key)?7:/^Số người$/.test(c.key)?12:/^Mã NV$/.test(c.key)?17:/^Số sổ/.test(c.key)?22:/^Ghi chú$/.test(c.key)?38:30;
        var h=ws.getCell(hr,i+1);h.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF17365D'}};h.font={name:'Calibri',size:11,bold:true,color:{argb:'FFFFFFFF'}};
        for(var r=hr+1;r<=end;r++){
          var cell=ws.getCell(r,i+1);cell.font={name:'Calibri',size:11};cell.alignment={vertical:'middle',horizontal:c.kind==='text'?'left':'right',wrapText:c.kind==='text'};
          if(r%2===0)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF1F5FA'}};
          ws.getRow(r).height=32;
        }
        if(vm.rows.length){var t=ws.getCell(end+1,i+1);t.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFDDEBF7'}};t.font={name:'Calibri',bold:true,size:11};}
      });
      if(vm.rows.length){var stop=1;while(stop<nc&&ws.getCell(end+1,stop+1).value==null)stop++;if(stop>1)ws.mergeCells(end+1,1,end+1,stop);}
      ws.getRow(4).height=30;
      if(!vm.rows.length){ws.mergeCells(6,1,6,nc);ws.getCell(6,1).value='Không có dữ liệu trong phạm vi đã chọn';ws.getRow(6).height=28;}
      ws.pageSetup.paperSize=9;ws.pageSetup.orientation='landscape';ws.pageSetup.fitToWidth=1;
    });
    return wb;
  }
  var api={build:build};if(node)module.exports=api;else root.HAKUi.bhXlsx=api;
})(typeof window!=='undefined'?window:this);
