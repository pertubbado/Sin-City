/* Sin City C9.0.7 — guarda síncrona para criar/excluir/mover sem estados intermediários inválidos. */
'use strict';

window.SinCityFlowGuard=(function(){
 const VERSION='C9.0.7';
 let installed=false;
 let originalSendPreview=null;
 let attempts=0;

 function orderingReady(){
  return Boolean(window.SinCityOrdering&&typeof window.SinCityOrdering.refresh==='function');
 }

 function flush(){
  if(!orderingReady())return false;
  try{
   window.SinCityOrdering.refresh({preview:false});
   document.documentElement.dataset.sinCityFlowGuard=VERSION;
   return true;
  }catch(error){
   console.warn('[Sin City C9.0.7] Falha ao normalizar fluxo antes da prévia.',error);
   return false;
  }
 }

 function install(){
  if(installed)return true;
  if(typeof window.sendPreview!=='function'||!orderingReady())return false;

  originalSendPreview=window.sendPreview;
  function guardedSendPreview(){
   flush();
   return originalSendPreview.apply(this,arguments);
  }
  guardedSendPreview.__sinCityFlowGuard=VERSION;
  guardedSendPreview.__originalSendPreview=originalSendPreview;
  window.sendPreview=guardedSendPreview;
  installed=true;
  flush();
  document.documentElement.dataset.sinCityFlowGuard=VERSION;
  return true;
 }

 function boot(){
  if(install())return;
  const retry=()=>{
   attempts++;
   if(install()||attempts>240)return;
   requestAnimationFrame(retry);
  };
  requestAnimationFrame(retry);
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();

 return {
  version:VERSION,
  flush,
  install,
  isInstalled:()=>installed,
  originalSendPreview:()=>originalSendPreview
 };
})();
