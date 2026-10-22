"use strict";
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),registry=require('../docs/CONSOLIDATED_BRANCHES.json'),pkg=require('../LuongHAK_Offline/package.json');
assert.equal(registry.canonicalApp,'LuongHAK_Offline');
for(const f of pkg.build.files){assert.ok(!/legacy|experimental|\.\./.test(f),'Reference or draft source must not be shipped: '+f);}
const index=fs.readFileSync(path.join(root,'LuongHAK_Offline/index.html'),'utf8');
assert.ok(!/experimental|legacy|kpi-/.test(index),'Draft KPI is not connected to payroll');
assert.ok(!fs.existsSync(path.join(root,'.github/workflows/build-setup.yml')),'Old dev release workflow must not be active');
for(const branch of registry.branches){cp.execFileSync('git',['-c','safe.directory=*','merge-base','--is-ancestor',branch.commit,'HEAD'],{cwd:root,stdio:'pipe'});}
assert.equal(cp.execFileSync('git',['-c','safe.directory=*','diff','--name-only','f93ffc42a24a8ec30b24493178368471d310c63f','HEAD','--','LuongHAK_Offline/engine.js','LuongHAK_Offline/hr.js'],{cwd:root,encoding:'utf8'}).trim(),'','Payroll formulas changed during consolidation');
console.log('PASS consolidation: '+registry.branches.length+' branch heads retained, legacy/KPI excluded from installer, payroll formulas unchanged');
