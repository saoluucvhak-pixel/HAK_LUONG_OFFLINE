"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const catalog=require("../../core/kpi-catalog.js");
const kpi=require("../../core/kpi-bridge.js");
test("26 roles, 104 metrics, 4 unique metrics and 100% per role",()=>{
 assert.equal(catalog.roles.length,26);assert.equal(catalog.indicators.length,104);
 for(const role of catalog.roles) assert.equal(kpi.validRole(role,catalog.indicators),true,role.id);
});
test("No KPI money before policy and approval",()=>{
 const role=catalog.roles.find(x=>x.mode==="KPI_TIME");
 const ms=catalog.indicators.filter(x=>x.roleId===role.id);
 const rows={};ms.forEach(m=>rows[m.id]={actual:m.target,evidence:"DOC-"+m.id,status:"APPROVED"});
 const preliminary=kpi.evaluate(role,catalog.indicators,rows,{policyActive:false,assignmentAccepted:true});
 assert.equal(preliminary.ok,false);assert.equal(preliminary.previewCoefficient,1);
 assert.equal(kpi.timeKpi({target:2000000,paidDays:22,standardDays:24,evaluation:preliminary,entitlementConfirmed:true}).ok,false);
 const approved=kpi.evaluate(role,catalog.indicators,rows,{policyActive:true,assignmentAccepted:true});
 assert.equal(approved.ok,true);assert.equal(approved.score,100);
 assert.deepEqual(kpi.timeKpi({target:2400000,paidDays:12,standardDays:24,evaluation:approved,entitlementConfirmed:true}),
 {ok:true,ratio:0.5,amount:1200000,coefficient:1});
});
test("Missing evidence / null result cannot become 0.7 approved",()=>{
 const role=catalog.roles.find(x=>x.mode==="KPI_TIME");
 const ms=catalog.indicators.filter(x=>x.roleId===role.id);const rows={};
 ms.forEach(m=>rows[m.id]={actual:m.target,evidence:"DOC",status:"APPROVED"});
 rows[ms[2].id]={actual:"",evidence:"DOC",status:"APPROVED"};
 const result=kpi.evaluate(role,catalog.indicators,rows,{policyActive:true,assignmentAccepted:true});
 assert.equal(result.ok,false);assert.equal(result.score,null);assert.equal(result.coefficient,null);
});
test("Tracking-only role cannot generate payroll coefficient",()=>{
 const role=catalog.roles.find(x=>x.mode==="THEO_DOI");const rows={};
 catalog.indicators.filter(x=>x.roleId===role.id).forEach(m=>rows[m.id]={actual:m.target,evidence:"DOC",status:"APPROVED"});
 assert.equal(kpi.evaluate(role,catalog.indicators,rows,{policyActive:true,assignmentAccepted:true}).ok,false);
});
test("Wrong indicator direction, zero target, negative actual blocked",()=>{
 assert.equal(kpi.scoreMetric({target:1,direction:"CÀNG THẤP CÀNG TỐT"},{actual:1}).ok,false);
 assert.equal(kpi.scoreMetric({target:0,direction:"CÀNG CAO CÀNG TỐT"},{actual:1}).ok,false);
 assert.equal(kpi.scoreMetric({target:1,direction:"CÀNG CAO CÀNG TỐT"},{actual:-1}).ok,false);
});
test("Bridge diff cannot invent residual KPI, rejects incomplete simulation",()=>{
 assert.equal(kpi.bridgeDiff(1000,[{name:"Lương chức danh",amount:800},{name:"Khoản riêng",amount:100}]).difference,-100);
 assert.equal(kpi.bridgeDiff(1000,[{name:"KPI",amount:""}]).ok,false);
});
