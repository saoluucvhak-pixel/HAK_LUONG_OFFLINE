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
 for(const ws of out.worksheets){assert.equal(ws.getCell('A1').value,'CÔNG TY MẪU');assert.equal(ws.getCell('A3').value,'THÁNG 09/2026');assert.equal(ws.getCell('A7').fill.fgColor.argb,'FF17365D');assert.equal(ws.pageSetup.paperSize,9);assert.equal(ws.pageSetup.orientation,'landscape');assert.equal(ws.views[0].ySplit,7);}
 const sh=out.getWorksheet('TongHop');assert.equal(sh.getCell('B8').value,32819850);assert.match(sh.getCell('B8').numFmt,/#,##0/);assert.equal(sh.getCell('B9').value,32819850);assert.equal(sh.getCell('B9').fill.fgColor.argb,'FFDDEBF7');
 const ct=out.getWorksheet('ChiTiet');assert.equal(ct.getCell('B8').value,'00123');assert.equal(ct.getCell('E8').value,'0012345678');assert.equal(ct.getCell('I8').value,62100);assert.equal(ct.getCell('I9').value,62100);assert.equal(ct.getCell('J8').numFmt,'@');
 assert.match(out.getWorksheet('TangGiam').getCell('A6').value,/Không có dữ liệu/);
});
module.exports={sheets};
