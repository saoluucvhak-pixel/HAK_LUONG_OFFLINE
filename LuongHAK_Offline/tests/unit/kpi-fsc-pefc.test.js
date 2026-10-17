"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const x=require("../../core/kpi-fsc-pefc.js");
test("98/100 compliant dossier meets target and 1x100 unit-sensitive preview",()=>{const r=x.evaluate({checked:100,compliant:98,target:.98,extraDays:1,standardDays:24,ratePerDay:100,unit:"điểm"});assert.equal(r.ok,true);assert.equal(r.score,100);assert.equal(r.equivalent,100);assert.equal(r.payrollWriteAllowed,false);});
test("2x200 equivalent does not assert overtime",()=>{const r=x.evaluate({checked:10,compliant:9,target:.98,extraDays:2,standardDays:24,ratePerDay:200,unit:"nghìn đồng"});assert.equal(r.equivalent,400);assert.equal(r.mode,"COMPARE_ONLY");});
test("no denominator / unspecified rate unit / invalid day counts fail closed",()=>{const base={checked:10,compliant:10,target:.98,extraDays:1,standardDays:24,ratePerDay:100,unit:"điểm"};for(const patch of [{checked:0},{compliant:11},{target:0},{extraDays:-1},{ratePerDay:-3},{unit:""}])assert.equal(x.evaluate({...base,...patch}).ok,false,JSON.stringify(patch));});
