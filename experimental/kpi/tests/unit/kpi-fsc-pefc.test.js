"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),f=require("../../core/kpi-fsc-pefc.js");
const a={checked:100,compliant:98,target:.98,assignedFscUnits:100,fscFundVnd:200000,fscUnitRateVnd:2000,unit:"VND"};
test("FSC quality measures dossiers rather than excess days",()=>{const r=f.evaluate(a);assert.equal(r.ok,true);assert.equal(r.qualityCoefficient,1);assert.equal(r.singleFscPayVnd,null);assert.equal(r.payrollWriteAllowed,false);assert.equal("fscDays" in r,false);});
test("one capped FSC pay after evidence review and allocation approval",()=>{let x=f.evaluate({...a,compliant:90,target:1,evidenceReviewed:true,fundApproved:true,fscFundVnd:160000});assert.equal(x.qualityCoefficient,.9);assert.equal(x.singleFscPayVnd,160000);});
test("without evidence or currency cannot create payment",()=>{assert.equal(f.evaluate({...a,fundApproved:true}).singleFscPayVnd,null);assert.equal(f.evaluate({...a,evidenceReviewed:true,fundApproved:true,unit:"điểm"}).singleFscPayVnd,null);});
test("missing dossier counts and assignments block simulation",()=>{for(const x of [{checked:0},{compliant:200},{assignedFscUnits:-1},{target:0}])assert.equal(f.evaluate({...a,...x}).ok,false);});
