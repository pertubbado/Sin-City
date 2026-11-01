/* Sin City C9.0.9 — compatibilidade de rascunho, backup e publicação com a estrutura C9. */
'use strict';

window.SinCityPersistence=(function(){
 const VERSION='C9.0.9';
 const DRAFT_KEY='sin-city-editor-draft';
 let installed=false;

 function flowReady(){
  return Boolean(window.SinCityFlowGuard&&typeof window.SinCityFlowGuard.flush==='function');
 }

 function prepare(){
  if(!flowReady())return false;
  try{
   window.SinCityFlowGuard.flush();
   document.documentElement.dataset.sinCityPersistence=VERSION;
   return true;
  }catch(error){
   console.warn('[Sin City C9.0.9] Falha ao preparar dados para persistência.',error);
   return false;
  }
 }

 function getData(){
  try{return typeof data!=='undefined'&&data&&Array.isArray(data.categories)?data:null;}
  catch{return null;}
 }

 function snapshotData(){
  prepare();
  const current=getData();
  return current?JSON.parse(JSON.stringify(current)):null;
 }

 function draftSnapshot(){
  try{
   const raw=localStorage.getItem(DRAFT_KEY);
   return raw?JSON.parse(raw):null;
  }catch{return null;}
 }

 function structuralDigest(value){
  const source=value?.data||value;
  const categories=Array.isArray(source?.categories)?source.categories:[];
  return categories.map((category,ci)=>({
   id:String(category?.id||''),
   code:String(category?.code||''),
   rules:(Array.isArray(category?.rules)?category.rules:[]).map(rule=>({code:String(rule?.code||''),title:String(rule?.title||'')})),
   subcategories:(Array.isArray(category?.subcategories)?category.subcategories:[]).map((sub,si)=>({
    id:String(sub?.id||''),
    number:window.SinCityOrdering?.subcategoryNumber?.(ci,si)||'',
    rules:(Array.isArray(sub?.rules)?sub.rules:[]).map(rule=>({code:String(rule?.code||''),title:String(rule?.title||'')}))
   }))
  }));
 }

 function equivalent(a,b){
  return JSON.stringify(structuralDigest(a))===JSON.stringify(structuralDigest(b));
 }

 function captureBeforePersistence(event){
  const target=event.target?.closest?.('#draftBtn,#backupBtn,#publishBtn,[data-dashboard-action]');
  if(!target)return;
  if(target.matches('[data-dashboard-action]')){
   const action=target.dataset.dashboardAction;
   if(action!=='draft'&&action!=='backup')return;
  }
  prepare();
 }

 function install(){
  if(installed)return true;
  if(!document.getElementById('panel-rules')||!flowReady())return false;
  document.addEventListener('click',captureBeforePersistence,true);
  installed=true;
  prepare();
  document.documentElement.dataset.sinCityPersistence=VERSION;
  return true;
 }

 function boot(){
  let attempts=0;
  const retry=()=>{
   attempts++;
   if(install()||attempts>240)return;
   requestAnimationFrame(retry);
  };
  retry();
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();

 return {
  version:VERSION,
  prepare,
  install,
  isInstalled:()=>installed,
  snapshotData,
  draftSnapshot,
  structuralDigest,
  equivalent
 };
})();
