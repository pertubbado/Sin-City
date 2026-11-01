/* Sin City C9.0.6 — espelhamento da numeração estrutural no portal público. */
'use strict';

window.SinCityPublicOrdering=(function(){
 const VERSION='C9.0.6';
 let refreshFrame=0;

 const pad=value=>String(Number(value)||0).padStart(2,'0');
 const categoryNumber=index=>pad(index+1);
 const subcategoryNumber=(categoryIndex,subcategoryIndex)=>`${categoryNumber(categoryIndex)}.${pad(subcategoryIndex+1)}`;
 const slugify=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,72)||'item';

 function subcategoryIndexFromTarget(target,categoryId){
  const value=String(target||'');
  const safeCategory=slugify(categoryId);
  const rulePrefix=`rule-${safeCategory}-`;
  const emptyPrefix=`sub-${safeCategory}-`;
  let rest='';
  if(value.startsWith(rulePrefix))rest=value.slice(rulePrefix.length);
  else if(value.startsWith(emptyPrefix))rest=value.slice(emptyPrefix.length);
  else return null;
  const token=rest.split('-')[0];
  if(token==='direct')return null;
  const index=Number(token);
  return Number.isInteger(index)&&index>=0?index:null;
 }

 function refresh(){
  const nav=document.getElementById('nav');
  if(!nav){
   document.documentElement.dataset.sinCityPublicOrdering=VERSION;
   return {groups:0,structuralLinks:0,directLinks:0};
  }

  const groups=[...nav.querySelectorAll(':scope > .nav-group')];
  let structuralLinks=0;
  let directLinks=0;

  groups.forEach((group,categoryIndex)=>{
   const categoryId=String(group.dataset.navGroup||'');
   group.dataset.structuralCategoryNumber=categoryNumber(categoryIndex);

   group.querySelectorAll('.nav-rule-link').forEach(link=>{
    const codeEl=link.querySelector('.nav-rule-code');
    if(!codeEl)return;
    if(!codeEl.dataset.ruleCodeOriginal)codeEl.dataset.ruleCodeOriginal=String(codeEl.textContent||'');

    const subcategoryIndex=subcategoryIndexFromTarget(link.dataset.navRule,categoryId);
    if(subcategoryIndex===null){
     directLinks++;
     link.removeAttribute('data-structural-subcategory-number');
     const original=String(codeEl.dataset.ruleCodeOriginal||'');
     if(codeEl.textContent!==original)codeEl.textContent=original;
     return;
    }

    const structural=subcategoryNumber(categoryIndex,subcategoryIndex);
    structuralLinks++;
    link.dataset.structuralSubcategoryNumber=structural;
    if(codeEl.textContent!==structural)codeEl.textContent=structural;
   });
  });

  document.documentElement.dataset.sinCityPublicOrdering=VERSION;
  return {groups:groups.length,structuralLinks,directLinks};
 }

 function scheduleRefresh(){
  if(refreshFrame)return;
  refreshFrame=requestAnimationFrame(()=>{
   refreshFrame=0;
   refresh();
  });
 }

 function boot(){
  refresh();
  const nav=document.getElementById('nav');
  if(nav){
   const observer=new MutationObserver(scheduleRefresh);
   observer.observe(nav,{childList:true,subtree:true});
  }
  window.addEventListener('message',event=>{
   if(event.data?.type==='sin-city-preview')requestAnimationFrame(scheduleRefresh);
  });
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();

 return {version:VERSION,categoryNumber,subcategoryNumber,subcategoryIndexFromTarget,refresh};
})();
