'use strict';
// Export only rows read and verified by the main-process archive service, never renderer data.
const fs=require('node:fs'),path=require('node:path'),XLSX=require('../xlsx.full.min.js');
const escape=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function exportYear({years,exportsDir,year,kind,period,format='xlsx',page=0,renderPdf}){
 if(!['xlsx','pdf'].includes(format))throw Error('Định dạng xuất không hợp lệ');
 const data=years.table(year,kind,period,page,format==='xlsx'),cols=[];
 for(const row of data.rows)for(const k of Object.keys(row))if(k!=='_id'&&typeof row[k]!=='object'&&!cols.includes(k))cols.push(k);
 const name='HoSoNam_'+data.year+'_'+kind+(period?'_'+period:'')+(format==='pdf'?'_trang_'+(data.page+1):'')+'.'+format;
 let bytes;
 if(format==='xlsx'){
  const book=XLSX.utils.book_new(),sheet=XLSX.utils.aoa_to_sheet([cols,...data.rows.map(row=>cols.map(k=>row[k]==null?'':row[k]))]);
  sheet['!cols']=cols.map(k=>({wch:Math.min(30,Math.max(12,k.length+2))}));XLSX.utils.book_append_sheet(book,sheet,'Hồ sơ năm');bytes=XLSX.write(book,{type:'buffer',bookType:'xlsx'});
 }else{
  const html="<!doctype html><html><head><meta charset='utf-8'><style>body{font:11px sans-serif}table{border-collapse:collapse}td,th{border:1px solid #777;padding:4px}thead{display:table-header-group}</style></head><body><h1>Hồ sơ năm "+data.year+"</h1><p>"+escape(period||'Cả năm')+' · Trang '+(data.page+1)+' · '+data.total+' dòng</p><table><thead><tr>'+cols.map(k=>'<th>'+escape(k)+'</th>').join('')+'</tr></thead><tbody>'+data.rows.map(row=>'<tr>'+cols.map(k=>'<td>'+escape(row[k])+'</td>').join('')+'</tr>').join('')+'</tbody></table></body></html>';
  bytes=await renderPdf({html,landscape:true});
 }
 const target=exportsDir.target(name);fs.writeFileSync(target,bytes);return {ok:true,name:path.basename(target),dir:path.dirname(target),size:bytes.length};
}
module.exports={exportYear};
