'use strict';
function install(win,{dialog,isBusy=()=>false}) {
  let approved=false,checking=false,lost=false,unresponsive=false,generation=0;
  const exitChoice=()=>{
    checking=false;generation++;
    if(win.isDestroyed())return;
    const choice=dialog.showMessageBoxSync(win,{type:'warning',title:'Giao diện không phản hồi',message:'Không thể xác nhận lưu từ giao diện.',detail:'Bạn có thể giữ cửa sổ để chờ hoặc thoát rồi mở lại ứng dụng. Thay đổi chưa lưu có thể bị mất; dữ liệu đã ghi trên đĩa được giữ nguyên.',buttons:['Giữ cửa sổ','Thoát ứng dụng'],defaultId:0,cancelId:0,noLink:true});
    if(choice===1&&!isBusy()&&!win.isDestroyed())win.destroy();
  };
  win.webContents.on('render-process-gone',()=>{lost=true;checking=false;generation++;});
  win.webContents.on('did-finish-load',()=>{lost=false;unresponsive=false;checking=false;generation++;});
  win.on('unresponsive',()=>{unresponsive=true;checking=false;generation++;});
  win.on('responsive',()=>{unresponsive=false;});
  win.on('close',e=>{
    if(isBusy()){e.preventDefault();return;}
    if(approved||win.webContents.isDestroyed())return;
    e.preventDefault();
    if(lost||unresponsive){exitChoice();return;}
    if(checking)return;
    checking=true;const request=++generation;
    win.webContents.executeJavaScript("typeof window.hakFlushBeforeClose === 'function' ? window.hakFlushBeforeClose() : true").then(ok=>{
      if(request!==generation)return;
      checking=false;
      if(ok===true&&!win.isDestroyed()){approved=true;win.close();}
    }).catch(()=>{if(request===generation)exitChoice();});
  });
}
module.exports={install};
