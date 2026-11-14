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
const alpha56='7094be19c46d3615da30c8d42906ec85d54ac08c';
const normalize=s=>s.replace(/\r\n/g,'\n');
const original=normalize(cp.execFileSync('git',['-c','safe.directory=*','show',baseline+':LuongHAK_Offline/engine.js'],{cwd:root,encoding:'utf8'}));
// Pin approved alpha.57 payroll and HR files. Keep the historical engine comparison below.
const hashFile = file => require('node:crypto').createHash('sha256').update(normalize(fs.readFileSync(path.join(root, 'LuongHAK_Offline', file), 'utf8'))).digest('hex');
assert.equal(hashFile('engine.js'), '6d0e651a7846d30d9778ba8930285a71bd7339e0c4c8766e6fc85b38edd6a7ec', 'Unapproved engine changes after v2.0.0');
assert.equal(hashFile('hr.js'), 'fb0d9af1105425df07eafa24e29072df63655fcf2a81083715cd5868beb1a47f', 'Unapproved HR changes after v2.0.3');
// alpha.58 (chủ sở hữu duyệt): chỉ đổi cách lấy 'hôm nay' của kiểm tra người phụ thuộc sang giờ máy (trước là UTC).
assert.equal(hashFile('core/integrity.js'), 'f40d5706a4957bfded548bb534b976bb9d1a3eac5bdb7e47ff098e45adc539ce', 'Unapproved integrity changes after alpha.58');
const engine=normalize(cp.execFileSync('git',['-c','safe.directory=*','show',alpha56+':LuongHAK_Offline/engine.js'],{cwd:root,encoding:'utf8'}));
const allowed='      if (cl < 0) out.bangluong[out.bangluong.length - 1]["Còn thiếu (thực lĩnh âm)"] = -cl;\n';
assert.equal(engine.split(allowed).length,2,'Expected exactly one additive deficit-output line');
const suppress='      if (opts && opts.suppressProduction) { luongSL = 0; luongBu = 0; }\n';
assert.equal(engine.split(suppress).length,2,'Expected exactly one opt-in production deferral guard');
// Approved alpha.50 rule: only positive-BT staff count in the team denominator.
const activeHeadcount='if (cc[ma] && cc[ma].congBT > 0) o.n++; // Chỉ người có công BT trong kỳ tham gia mẫu số; tiền SL tổ giữ nguyên. 2026 (C4): tiền tổ chỉ tính sản lượng';
const priorHeadcount='o.n++; // 2026 (C4): tiền tổ chỉ tính sản lượng';
assert.equal(engine.split(activeHeadcount).length,2,'Expected exactly one approved active-worker headcount rule');
// alpha.56 (chủ sở hữu duyệt): tổng báo cáo cộng đúng các thành phần ĐÃ áp trần lương đóng.
const reportTotal='"Cộng BH NLĐ đóng": nldV.BHXH + nldV.BHYT + nldV.BHTN';
assert.equal(engine.split(reportTotal).length,2,'Expected exactly one additive insurance report total');
const insuranceStart='      // BHXH\n', insuranceEnd='      // TNCN\n';
assert.equal(engine.split(insuranceStart).length,2); assert.equal(engine.split(insuranceEnd).length,2);
const normalizeInsurance=src=>src.slice(0,src.indexOf(insuranceStart))+original.slice(original.indexOf(insuranceStart),original.indexOf(insuranceEnd))+src.slice(src.indexOf(insuranceEnd));
// alpha.56 (chủ sở hữu duyệt): 3 đoạn THÊM ngoài khối bảo hiểm — kiểm ô tiền không đọc được, tỷ lệ BH > 100%, trần lương đóng.
// Nội dung bị khóa bằng SHA-256: sửa bất kỳ ký tự nào trong các đoạn này phải được duyệt lại và cập nhật mã băm.
const a56=/[ ]*\/\/ \[alpha\.56:start\][^\n]*\n[\s\S]*?[ ]*\/\/ \[alpha\.56:end\]\n/g, a56Blocks=engine.match(a56)||[];
assert.equal(a56Blocks.length,3,'Expected exactly three approved alpha.56 guard blocks');
assert.equal(require('node:crypto').createHash('sha256').update(a56Blocks.join(''),'utf8').digest('hex'),'8f6c1747a34fff0a34d15bbd71b29209ae4e4864aa5192c56a91f3ce267b7258','Approved alpha.56 guard blocks changed');
const defaultEngine=normalizeInsurance(engine.replace(a56,'')).replace(reportTotal,'"Cộng BH NLĐ đóng": bhNLD').replace(activeHeadcount,priorHeadcount).replace(allowed,'').replace(suppress,'').replace('var soNgayThang = opts && opts.productionPayDays || new Date(nam, thang, 0).getDate(), binhQuanTo = {};','var soNgayThang = new Date(nam, thang, 0).getDate(), binhQuanTo = {};');
assert.equal(defaultEngine,original,'Existing default payroll formulas changed');

console.log('PASS consolidation: '+registry.branches.length+' branch heads retained, legacy/KPI excluded from installer, payroll formulas preserved except explicitly approved deficit, carry, active-worker headcount, approved insurance reconciliation and alpha.56 input/contribution guards and alpha.57 overtime, support and payroll checks');

const oldImporter=normalize(cp.execFileSync('git',['-c','safe.directory=*','show','c389ef4ffcfd13a4f867cb070db2069314617dc7:LuongHAK_Offline/core/importer.js'],{cwd:root,encoding:'utf8'}));
const currentImporter=normalize(fs.readFileSync(path.join(root,'LuongHAK_Offline/core/importer.js'),'utf8'));
const productionPeriodGuard = "        var nextPeriod = V.rowPeriod(table, r);\n        if ((table === \"sanluong\" || table === \"bandam\") && p0 && nextPeriod && p0 !== nextPeriod) {\n          item.action = \"conflict\";\n          item.reason = \"Phiếu \" + r[\"Phiếu cân\"] + \" đổi kỳ từ \" + p0 + \" sang \" + nextPeriod + \". Hãy đối chiếu và xác nhận bằng thao tác chuyển kỳ hoặc sửa phiếu trên app.\";\n          return;\n        }\n";
assert.equal(currentImporter.split(productionPeriodGuard).length, 2);
assert.equal(currentImporter.replace(productionPeriodGuard, "").replace('dm_bacthue: ["Mã thuế TNCN", "Bậc", "Hiệu lực từ"]','dm_bacthue: ["Bậc", "Hiệu lực từ"]'),oldImporter,'Importer changed beyond approved parent tax key');
