/* Sin City C9.0.3 — numeração estrutural + IDs internos únicos e permanentes. */
'use strict';

window.SinCityOrdering=(function(){
 const VERSION='C9.0.3';
 const CATEGORY_PLACEHOLDERS=new Set(['nova-categoria']);
 const SUBCATEGORY_PLACEHOLDERS=new Set(['nova-subcategoria']);
 let refreshFrame=0;
 let lastSignature='';

 const pad=value=>String(Number(value)||0).padStart(2,'0');
 const categoryNumber=index=>pad(index+1);
 const subcategoryNumber=(categoryIndex,subcategoryIndex)=>`${categoryNumber(categoryIndex)}.${pad(subcategoryIndex+1)}`;
 const slugify=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||'item';

 function randomToken(){
  try{
   if(globalThis.crypto?.getRandomValues){
    const bytes=new Uint8Array(5);crypto.getRandomValues(bytes);
    return [...bytes].map(byte=>byte.toString(36).padStart(2,'0')).join('').slice(0,8);
   }
   if(globalThis.crypto?.randomUUID)return crypto.randomUUID().replace(/-/g,'').slice(0,8);
  }catch{}
  return Math.random().toString(36).slice(2,10).padEnd(8,'0');
 }

 function uniqueId(prefix,label,used){
  const base=`${prefix}-${slugify(label)}`;
  let candidate='';
  do{candidate=`${base}-${randomToken()}`;}while(used.has(candidate));
  used.add(candidate);
  return candidate;
 }

 function getData(){
  try{return typeof data!=='undefined'&&data&&Array.isArray(data.categories)?data:null;}
  catch{return null;}
 }

 function needsReplacement(value,placeholders,used){
  const id=String(value??'').trim();
  if(!id)return true;
  if(placeholders.has(id.toLowerCase()))return true;
  if(used.has(id))return true;
  used.add(id);
  return false;
 }

 function normalizeIds(categories){
  const usedCategoryIds=new Set();
  const usedSubcategoryIds=new Set();
  let changed=false;
  let categoryChanges=0;
  let subcategoryChanges=0;

  categories.forEach(category=>{
   if(!category||typeof category!=='object')return;
   if(needsReplacement(category.id,CATEGORY_PLACEHOLDERS,usedCategoryIds)){
    category.id=uniqueId('cat',category.short||category.name||'categoria',usedCategoryIds);
    changed=true;categoryChanges++;
   }
   const subs=Array.isArray(category.subcategories)?category.subcategories:[];
   subs.forEach(sub=>{
    if(!sub||typeof sub!=='object')return;
    if(needsReplacement(sub.id,SUBCATEGORY_PLACEHOLDERS,usedSubcategoryIds)){
     sub.id=uniqueId('sub',sub.name||'subcategoria',usedSubcategoryIds);
     changed=true;subcategoryChanges++;
    }
   });
  });

  return {changed,categoryChanges,subcategoryChanges};
 }

 function normalizeCategories(){
  const current=getData();
  if(!current)return {changed:false,categories:[],idChanges:{categoryChanges:0,subcategoryChanges:0}};
  let changed=false;
  current.categories.forEach((category,index)=>{
   if(!category||typeof category!=='object')return;
   const calculated=categoryNumber(index);
   if(String(category.code||'')!==calculated){category.code=calculated;changed=true;}
   if(!Array.isArray(category.subcategories)){category.subcategories=[];changed=true;}
  });
  const idChanges=normalizeIds(current.categories);
  if(idChanges.changed)changed=true;
  return {changed,categories:current.categories,idChanges};
 }

 function makeInternalIdReadonly(input,value,label){
  if(!input)return;
  input.value=String(value||'');
  input.readOnly=true;
  input.setAttribute('aria-readonly','true');
  input.title='ID interno automático e permanente. Não depende da numeração visual.';
  input.dataset.internalId='true';
  const field=input.closest('.field');
  const fieldLabel=field?.querySelector('label');
  if(fieldLabel)fieldLabel.textContent=label;
  input.setAttribute('aria-label',label);
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
   card.dataset.categoryId=String(category.id||'');

   const summary=card.querySelector(':scope > summary b');
   if(summary){
    const name=String(category.short||category.name||'Categoria');
    summary.textContent=`${number} — ${name}`;
   }

   makeInternalIdReadonly(card.querySelector('input[data-cat][data-k="id"]'),category.id,'ID interno (automático)');

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
    if(!sub)return;
    const subNumber=subcategoryNumber(categoryIndex,subcategoryIndex);
    subcard.dataset.subcategoryNumber=subNumber;
    subcard.dataset.subcategoryId=String(sub.id||'');
    const subSummary=subcard.querySelector(':scope > summary b');
    if(subSummary){
     const name=String(sub.name||'Nova subcategoria');
     subSummary.textContent=`📂 ${subNumber} — ${name}`;
    }
    makeInternalIdReadonly(subcard.querySelector('input[data-sub][data-k="id"]'),sub.id,'ID interno da subcategoria (automático)');
   });
  });
 }

 function signature(categories){
  return categories.map((category,index)=>{
   const subs=Array.isArray(category?.subcategories)?category.subcategories:[];
   return `${categoryNumber(index)}:${String(category?.id||'')}:${String(category?.short||category?.name||'')}[${subs.map((sub,subIndex)=>`${subcategoryNumber(index,subIndex)}:${String(sub?.id||'')}:${String(sub?.name||'')}`).join('|')}]`;
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

 return {version:VERSION,categoryNumber,subcategoryNumber,normalizeCategories,normalizeIds,refresh};
})();
