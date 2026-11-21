'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),X=require('../../exceljs.min'),BX=require('../../ui/bh-xlsx');
const sheets=()=>[
{name:'TongHop',rows:[{'Khoản':'BHXH','Công ty đóng':32819850,'Người lao động đóng (trừ lương)':15003360,'Cộng':47823210},{'Khoản':'TỔNG','Công ty đóng':32819850,'Người lao động đóng (trừ lương)':15003360,'Cộng':47823210}]},
{name:'TangGiam',rows:[]},
{name:'TheoPhongBan',rows:[{'Phòng ban':'Sản xuất','Số người':1,'Cộng BH NLĐ đóng':62100},{'Phòng ban':'TỔNG CỘNG','Số người':1,'Cộng BH NLĐ đóng':62100}]},
{name:'ChiTiet',rows:[{'STT':1,'Mã NV':'00123','Họ và tên':'Nhân viên mẫu','Phòng ban':'Tổ sản xuất','Số sổ BHXH':'0012345678','NLĐ.BHXH':0,'NLĐ.BHYT':62100,'NLĐ.BHTN':0,'Cộng BH NLĐ đóng':62100,'Ghi chú':'Chưa đủ ngưỡng (2/14 công)'},{'STT':'','Mã NV':'','Họ và tên':'TỔNG CỘNG (1 người)','Phòng ban':'','Số sổ BHXH':'','NLĐ.BHXH':0,'NLĐ.BHYT':62100,'NLĐ.BHTN':0,'Cộng BH NLĐ đóng':62100,'Ghi chú':''}]}];
test('Insurance workbook round-trip preserves values, identifiers, four sheets and print layout',async()=>{
 const data=sheets(),before=JSON.stringify(data),wb=BX.build(X,data,{congTy:'CÔNG TY MẪU',kyText:'THÁNG 09/2026',ngayLap:'03/11/2026'}),b=await wb.xlsx.writeBuffer(),out=new X.Workbook();await out.xlsx.load(b);
 assert.equal(JSON.stringify(data),before);assert.equal(out.worksheets.length,4);
 for(const ws of out.worksheets){assert.equal(ws.getCell('A1').value,'CÔNG TY MẪU');assert.equal(ws.getCell('A3').value,'THÁNG 09/2026');assert.equal(ws.getCell('A5').fill.fgColor.argb,'FF17365D');assert.equal(ws.pageSetup.paperSize,9);assert.equal(ws.pageSetup.orientation,'landscape');assert.equal(ws.views[0].ySplit,5);}
 const sh=out.getWorksheet('TongHop');assert.equal(sh.getCell('B6').value,32819850);assert.match(sh.getCell('B6').numFmt,/#,##0/);assert.equal(sh.getCell('B7').value,32819850);assert.equal(sh.getCell('B7').fill.fgColor.argb,'FFDDEBF7');
 const ct=out.getWorksheet('ChiTiet');assert.equal(ct.getCell('B6').value,'00123');assert.equal(ct.getCell('E6').value,'0012345678');assert.equal(ct.getCell('I6').value,62100);assert.equal(ct.getCell('I7').value,62100);assert.equal(ct.getCell('J6').numFmt,'@');
 assert.match(out.getWorksheet('TangGiam').getCell('A6').value,/Không có dữ liệu/);
});
test('P4.9 bh-xlsx layout: STT center, money width ~15, no fixed height 32, wide sheet fitToWidth 2',async()=>{
 const wideChiTiet={name:'ChiTiet',rows:[{'STT':1,'Mã NV':'00123','Họ và tên':'Nguyễn Văn An','Phòng ban':'SX','Số sổ BHXH':'0012345678','Lương đóng BHXH':5000000,'CTY.BHXH':875000,'CTY.BHTNLĐ':25000,'CTY.BHYT':150000,'CTY.BHTN':50000,'NLĐ.BHXH':400000,'NLĐ.BHYT':75000,'NLĐ.BHTN':50000,'Cộng BH công ty đóng':1100000,'Cộng BH NLĐ đóng':525000,'Truy thu bảo hiểm':0,'Ghi chú':''}]};
 const wb=BX.build(X,[wideChiTiet],{congTy:'CÔNG TY MẪU',kyText:'THÁNG 09/2026',ngayLap:'03/11/2026'});
 const ws=wb.getWorksheet('ChiTiet'),hr=ws.views[0].ySplit;
 assert.equal(ws.getCell(hr+1,1).alignment.horizontal,'center','STT phải căn giữa');
 assert.ok(ws.getColumn(6).width<=16,'cột tiền rộng hợp lý (~15)');
 assert.notEqual(ws.getRow(hr+1).height,32,'không ép height=32 cứng cho hàng dữ liệu');
 assert.equal(ws.pageSetup.fitToWidth,2,'bảng rộng dùng fitToWidth=2 thay vì ép 1 trang');
});
module.exports={sheets};
