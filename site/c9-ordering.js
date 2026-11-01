/* Sin City C9.0.2 — motor isolado de numeração estrutural. */
'use strict';

window.SinCityOrdering=(function(){
 const VERSION='C9.0.2';
 let refreshFrame=0;
 let lastSignature='';

 const pad=value=>String(Number(value)||0).padStart(2,'0');
 const categoryNumber=index=>pad(index+1);
 const subcategoryNumber=(categoryIndex,subcategoryIndex)=>`${categoryNumber(categoryIndex)}.${pad(subcategoryIndex+1)}`;

 function getData(){
  try{return typeof data!=='undefined'&&data&&Array.isArray(data.categories)?data:null;}
  catch{return null;}
 }

 function normalizeCategories(){
  const current=getData();
  if(!current)return {changed:false,categories:[]};
  let changed=false;
  current.categories.forEach((category,index)=>{
   if(!category||typeof category!=='object')return;
   const calculated=categoryNumber(index);
   if(String(category.code||'')!==calculated){category.code=calculated;changed=true;}
   if(!Array.isArray(category.subcategories))category.subcategories=[];
  });
  return {changed,categories:current.categories};
 }

 function updateEditorLabels(categories){
  const panel=document.getElementById('panel-rules');
  if(!panel)return;
  const categoryCards=[...panel.querySelectorAll('#cats > details.item')];
  categoryCards.forEach((card,categoryIndex)=>{
   const category=categories[categoryIndex];
   if(!category)return;
   const number=categoryNumber(categoryIndex);
   card.dataset.categoryNumber=number;

   const summary=card.querySelector(':scope > summary b');
   if(summary){
    const name=String(category.short||category.name||'Categoria');
    summary.textContent=`${number} — ${name}`;
   }

   const codeInput=card.querySelector('input[data-cat][data-k="code"]');
   if(codeInput){
    codeInput.value=number;
    codeInput.readOnly=true;
    codeInput.setAttribute('aria-readonly','true');
    codeInput.title='Numeração automática baseada na posição da categoria';
   }

   const subcards=[...card.querySelectorAll(':scope > .sub-list > details.subitem')];
   subcards.forEach((subcard,subcategoryIndex)=>{
    const sub=category.subcategories?.[subcategoryIndex];
    const subNumber=subcategoryNumber(categoryIndex,subcategoryIndex);
    subcard.dataset.subcategoryNumber=subNumber;
    const subSummary=subcard.querySelector(':scope > summary b');
    if(subSummary){
     const name=String(sub?.name||'Nova subcategoria');
     subSummary.textContent=`📂 ${subNumber} — ${name}`;
    }
   });
  });
 }

 function signature(categories){
  return categories.map((category,index)=>{
   const subs=Array.isArray(category?.subcategories)?category.subcategories:[];
   return `${categoryNumber(index)}:${String(category?.short||category?.name||'')}[${subs.map((sub,subIndex)=>`${subcategoryNumber(index,subIndex)}:${String(sub?.name||'')}`).join('|')}]`;
  }).join('||');
 }

 function refresh(options={}){
  const normalized=normalizeCategories();
  if(!normalized.categories.length){
   document.documentElement.dataset.sinCityOrdering=VERSION;
   return false;
  }
  updateEditorLabels(normalized.categories);
  const nextSignature=signature(normalized.categories);
  const structuralChange=nextSignature!==lastSignature;
  lastSignature=nextSignature;
  document.documentElement.dataset.sinCityOrdering=VERSION;
  if(normalized.changed&&options.preview!==false){
   try{if(typeof sendPreview==='function')sendPreview();}catch{}
  }
  return normalized.changed||structuralChange;
 }

 function scheduleRefresh(){
  if(refreshFrame)return;
  refreshFrame=requestAnimationFrame(()=>{
   refreshFrame=0;
   refresh();
  });
 }

 function boot(){
  if(!document.getElementById('panel-rules'))return;
  refresh();
  const panel=document.getElementById('panel-rules');
  const observer=new MutationObserver(scheduleRefresh);
  observer.observe(panel,{childList:true,subtree:true});
  document.addEventListener('input',event=>{
   if(event.target?.closest?.('#panel-rules'))scheduleRefresh();
  },true);
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();

 return {version:VERSION,categoryNumber,subcategoryNumber,normalizeCategories,refresh};
})();
