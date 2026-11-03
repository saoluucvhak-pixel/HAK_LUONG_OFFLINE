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
 assert.equal(k.bangluong[0]['BH trừ NLĐ'],enough?total:0);
 assert.equal(BH.chiTiet(k).at(-1)['Cộng BH NLĐ đóng'],total);
 assert.equal(BH.tongHop(k).lechNLD,0);
});
