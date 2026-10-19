const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
for(const f of fs.readdirSync('app/js').filter(f=>f.endsWith('.js'))) execFileSync(process.execPath,['--check',path.join('app/js',f)]);
const html=fs.readFileSync('app/index.html','utf8');
for(const [,asset] of html.matchAll(/(?:src|href)="((?:js|css|libs)\/[^"?#]+)"/g)) if(!fs.existsSync(path.join('app',asset))) throw Error('Missing asset: '+asset);
console.log('All application scripts parse; local entry assets exist.');
