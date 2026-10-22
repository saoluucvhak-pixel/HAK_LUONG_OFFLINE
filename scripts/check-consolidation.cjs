"use strict";
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),registry=require('../docs/CONSOLIDATED_BRANCHES.json'),pkg=require('../LuongHAK_Offline/package.json');
assert.equal(registry.canonicalApp,'LuongHAK_Offline');
for(const f of pkg.build.files){assert.ok(!/legacy|experimental|\.\./.test(f),'Reference or draft source must not be shipped: '+f);}
const lock=require('../LuongHAK_Offline/package-lock.json');
assert.equal(lock.version,pkg.version,'Package lock version mismatch');assert.equal(lock.packages[''].version,pkg.version,'Root lock entry mismatch');
assert.ok(fs.readFileSync(path.join(root,'LuongHAK_Offline/ui/workspace-v104.js'),'utf8').includes('v'+pkg.version),'UI version mismatch');
assert.ok(fs.existsSync(path.join(root,'docs/releases/v'+pkg.version+'.md')),'Missing versioned release notes');
const index=fs.readFileSync(path.join(root,'LuongHAK_Offline/index.html'),'utf8');
assert.ok(!/experimental|legacy|kpi-/.test(index),'Draft KPI is not connected to payroll');
assert.ok(!fs.existsSync(path.join(root,'.github/workflows/build-setup.yml')),'Old dev release workflow must not be active');
for(const branch of registry.branches){cp.execFileSync('git',['-c','safe.directory=*','merge-base','--is-ancestor',branch.commit,'HEAD'],{cwd:root,stdio:'pipe'});}
const baseline='f93ffc42a24a8ec30b24493178368471d310c63f';
assert.equal(cp.execFileSync('git',['-c','safe.directory=*','diff','--name-only',baseline,'HEAD','--','LuongHAK_Offline/hr.js'],{cwd:root,encoding:'utf8'}).trim(),'','HR formulas changed');
const normalize=s=>s.replace(/\r\n/g,'\n');
const original=normalize(cp.execFileSync('git',['-c','safe.directory=*','show',baseline+':LuongHAK_Offline/engine.js'],{cwd:root,encoding:'utf8'}));
const engine=normalize(fs.readFileSync(path.join(root,'LuongHAK_Offline/engine.js'),'utf8'));
const allowed='      if (cl < 0) out.bangluong[out.bangluong.length - 1]["Còn thiếu (thực lĩnh âm)"] = -cl;\n';
assert.equal(engine.split(allowed).length,2,'Expected exactly one additive deficit-output line');
assert.equal(engine.replace(allowed,''),original,'Existing payroll calculations changed beyond the explicit deficit output');

console.log('PASS consolidation: '+registry.branches.length+' branch heads retained, legacy/KPI excluded from installer, payroll formulas unchanged');
