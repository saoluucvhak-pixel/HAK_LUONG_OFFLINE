'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),E=require('../../engine'),BH=require('../../core/bh-report'),{baseDb,staff,ccRow}=require('../fixtures/build');
for(const enough of [false,true]) for(const rates of [[0,.015,0],[.08,.015,.01]]) test('Insurance report adds rounded components; enough='+enough+' rates='+rates,()=>{
 const d=baseDb();d.nhansu=[staff({'Mã nhân viên':'NV','Mã tiền lương 1':'SP','Mã BHXH':'TEST','Lương cơ bản':4140000})];
 d.dm_luong=[{'Mã lương':'SP','Mã hình thức lương':'LSP','Ngưỡng truy thu BH (công)':14}];
 d.dm_baohiem=[{'Mã bảo hiểm':'TEST','NLD.BHXH':rates[0],'NLD.BHYT':rates[1],'NLD.BHTN':rates[2]}];
 d.chamcong=[ccRow('NV',2026,9,'BT',1,enough?20:1)];
 const k=E.tinhBangLuong(d,2026,9,'to',{quyChe:'2026'}),r=k.bhxh[0];
 const total=r['NLĐ.BHXH']+r['NLĐ.BHYT']+r['NLĐ.BHTN'];
 assert.equal(r['Cộng BH NLĐ đóng'],total);
 assert.equal(total,rates[0]===0?62100:434700);
 assert.equal(k.bangluong[0]['BH trừ NLĐ'],total);
 assert.equal(BH.chiTiet(k).at(-1)['Cộng BH NLĐ đóng'],total);
 assert.equal(BH.tongHop(k).lechNLD,0);
});

function computeInsurance(cong,nld,dn,base=4140000){
 const d=baseDb();d.nhansu=[staff({'Mã nhân viên':'NV','Mã tiền lương 1':'SP','Mã BHXH':'TEST','Lương cơ bản':base,'Mã TNCN':'TNCN0'})];
 d.dm_luong=[{'Mã lương':'SP','Mã hình thức lương':'LSP','Ngưỡng truy thu BH (công)':14}];
 d.dm_baohiem=[Object.assign({'Mã bảo hiểm':'TEST'},nld,dn)];d.chamcong=[ccRow('NV',2026,9,'BT',1,cong)];
 return E.tinhBangLuong(d,2026,9,'to',{quyChe:'2026'});
}
for(const cong of [0,13,14,15])test('BHYT deduction always applies; arrears only below threshold: '+cong,()=>{
 const k=computeInsurance(cong,{'NLD.BHYT':.015},{'DN.BHYT':.03}),r=k.bangluong[0];
 assert.equal(r['BH trừ NLĐ'],62100);assert.equal(r['Truy thu BH'],cong<14?124200:0);
 const t=BH.tongHop(k).rows.find(x=>x['Khoản']==='BHYT');assert.equal(t['Người lao động đóng (trừ lương)'],62100);
 assert.equal(BH.theoPhongBan(k)[0]['Tổng BH (công ty + NLĐ)'],186300);
});
test('No employee insurance deduction or no employer contribution means no arrears',()=>{
 for(const [nld,dn]of [[{}, {'DN.BHYT':.03}],[{'NLD.BHYT':.015},{}],[{},{}]])assert.equal(computeInsurance(1,nld,dn).bangluong[0]['Truy thu BH'],0);
});
test('Rounded components reconcile with deduction and actual net pay including arrears',()=>{
 const k=computeInsurance(1,{'NLD.BHXH':.08,'NLD.BHYT':.015,'NLD.BHTN':.01},{'DN.BHXH':.175,'DN.BHYT':.03,'DN.BHTN':.01},4141005),r=k.bangluong[0],b=k.bhxh[0];
 assert.equal(r['BH trừ NLĐ'],434805);assert.equal(r['BH trừ NLĐ'],b['Cộng BH NLĐ đóng']);
 const net=r['Tổng thu nhập']-r['BH trừ NLĐ']-r['KPCĐ trừ NLĐ']-r['Truy thu BH']-r['Thuế TNCN']-r['Trừ khác']-r['Tạm ứng'];
 assert.equal(r['Thực lĩnh'],net<0?0:Math.round(net/1000)*1000);if(net<0)assert.equal(r['Còn thiếu (thực lĩnh âm)'],-net);
});
