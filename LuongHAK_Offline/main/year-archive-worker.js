"use strict";
/* global __filename */
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
if(!isMainThread && workerData && workerData.yearJob){
 try {
  const storage=require('./storage').createStorage(workerData.dir);
  const years=require('./year-archive').createYearArchive({storage,dir:workerData.dir});
  if(!['preview','archive','restore','table'].includes(workerData.method))throw Error('Lệnh kho năm không hợp lệ');
  parentPort.postMessage(years[workerData.method](...workerData.args));
 }catch(e){parentPort.postMessage({ok:false,error:String(e.message||e)});}
}
function run(dir,method,args){return new Promise(resolve=>{
 let settled=false;const finish=r=>{if(!settled){settled=true;resolve(r);}};
 let w;try{w=new Worker(__filename,{workerData:{yearJob:true,dir,method,args}});}catch(e){finish({ok:false,error:String(e.message||e)});return;}
 w.once('message',finish);w.once('error',e=>finish({ok:false,error:String(e.message||e)}));
 w.once('exit',code=>finish({ok:false,error:'Tiến trình kho năm dừng trước khi trả kết quả ('+code+'). Hãy tải lại dữ liệu để kiểm tra trạng thái.'}));
});}
module.exports={run};
