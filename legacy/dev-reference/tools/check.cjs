const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
for(const f of fs.readdirSync('app/js').filter(f=>f.endsWith('.js'))) execFileSync(process.execPath,['--check',path.join('app/js',f)]);
const html=fs.readFileSync('app/index.html','utf8');
for(const [,asset] of html.matchAll(/(?:src|href)="((?:js|css|libs)\/[^"?#]+)"/g)) if(!fs.existsSync(path.join('app',asset))) throw Error('Missing asset: '+asset);
const appVer=(fs.readFileSync('app/js/version.js','utf8').match(/HAK\.VERSION\s*=\s*'([^']+)'/)||[])[1],nsiVer=(fs.readFileSync('installer/setup.nsi','utf8').match(/!define VERSION "([^"]+)"/)||[])[1];
if(!appVer||!nsiVer||appVer!==nsiVer) throw Error('Version mismatch: app/js/version.js='+appVer+' installer/setup.nsi='+nsiVer);
console.log('All application scripts parse; local entry assets exist; version '+appVer+' matches installer.');
