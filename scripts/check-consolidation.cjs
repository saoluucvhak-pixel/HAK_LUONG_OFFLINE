"use strict";
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),registry=require('../docs/CONSOLIDATED_BRANCHES.json'),pkg=require('../LuongHAK_Offline/package.json');
assert.equal(registry.canonicalApp,'LuongHAK_Offline');
// Script đối chiếu với lịch sử git (merge-base, git show). Clone nông (--depth) làm mất các commit này và git chỉ báo "Not a valid commit name".
// Kiểm tra trước để báo lỗi rõ cách khắc phục thay vì dừng giữa chừng.
{
  const git = args => cp.execFileSync('git', ['-c', 'safe.directory=*', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  let shallow;
  try { shallow = git(['rev-parse', '--is-shallow-repository']); }
  catch (e) { console.error('Không chạy được git trong ' + root + ' — script này cần chạy trong bản clone có thư mục .git.\n' + e.message); process.exit(1); }
  const need = [...new Set([...registry.branches.map(b => b.commit), 'f93ffc42a24a8ec30b24493178368471d310c63f', '7094be19c46d3615da30c8d42906ec85d54ac08c', 'c389ef4ffcfd13a4f867cb070db2069314617dc7'])];
  const missing = need.filter(c => { try { git(['cat-file', '-e', c + '^{commit}']); return false; } catch (e) { return true; } });
  if (missing.length) {
    console.error('Thiếu ' + missing.length + ' commit cần để đối chiếu lịch sử: ' + missing.map(c => c.slice(0, 7)).join(', ') + '.\n' +
      (shallow === 'true' ? 'Repo đang là bản clone NÔNG. Chạy: git fetch --unshallow (hoặc clone đầy đủ). Trong CI: actions/checkout với fetch-depth: 0.'
        : 'Hãy chạy git fetch --all --tags để lấy đủ lịch sử, hoặc kiểm tra docs/CONSOLIDATED_BRANCHES.json.'));
    process.exit(1);
  }
}
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
assert.equal(hashFile('engine.js'), '00a431eec3ebf5daccb4a9ab18faa5479e9de1dbcac24b3b05a6741738490c2b', 'Unapproved engine changes after v2.0.0');
// v2.0.7 (chủ sở hữu duyệt): đối chiếu chấm công báo cả ô công TRỐNG như ô ghi 0 (kể cả không có dòng chấm công hoặc chỉ có PN/CL/CC).
assert.equal(hashFile('hr.js'), '847d52a96d734638e57c135572c763f4bb956e40557858402b385c02b9ab3113', 'Unapproved HR changes after v2.0.7');
// alpha.58 (chủ sở hữu duyệt): chỉ đổi cách lấy 'hôm nay' của kiểm tra người phụ thuộc sang giờ máy (trước là UTC).
assert.equal(hashFile('core/integrity.js'), 'f40d5706a4957bfded548bb534b976bb9d1a3eac5bdb7e47ff098e45adc539ce', 'Unapproved integrity changes after alpha.58');
assert.equal(hashFile('core/production-alloc.js'), '23d85bc7884a5f3091dfb3b658a2ea56ddf843f29ed10e2f3507e91700d838dd', 'Production allocation diagnostics changed');
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
const crossPeriodHelper = "  function crossPeriod(table, before, after) {\n    if (!before || !after || ![\"sanluong\", \"bandam\", \"psluong\", \"ungluong\"].includes(table)) return \"\";\n    var from = V.rowPeriod(table, before), to = V.rowPeriod(table, after);\n    if (!from || !to || from === to) return \"\";\n    return \"Chứng từ đổi kỳ từ \" + from + \" sang \" + to + \". Kiểm tra số chứng từ và kỳ nguồn trước khi ghi.\";\n  }\n";
const crossPeriodGuard = "        var move = crossPeriod(table, tgt, r);\n        if (move) {\n          item.action = \"conflict\";\n          item.reason = move;\n          return;\n        }\n";
assert.equal(currentImporter.split(crossPeriodHelper).length, 2);
assert.equal(currentImporter.split(crossPeriodGuard).length, 2);
assert.equal(currentImporter.replace(crossPeriodHelper, "").replace(crossPeriodGuard, "").replace("keyOf: keyOf, crossPeriod: crossPeriod, plan:", "keyOf: keyOf, plan:").replace('dm_bacthue: ["Mã thuế TNCN", "Bậc", "Hiệu lực từ"]','dm_bacthue: ["Bậc", "Hiệu lực từ"]'),oldImporter,"Importer changed beyond approved period guard and parent tax key");
