/* Sin City C9.0.4 — numeração estrutural, IDs internos e movimentação de categorias. */
'use strict';

window.SinCityOrdering=(function(){
 const VERSION='C9.0.4';
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

 function showOrderingToast(message,type='ok'){
  try{
   if(typeof toast==='function'){toast(message,type);return;}
  }catch{}
  const el=document.getElementById('toast');
  if(!el)return;
  el.textContent=message;
  el.className=`toast show ${type}`;
  clearTimeout(window.__c9OrderingToast);
  window.__c9OrderingToast=setTimeout(()=>{el.className='toast';},4200);
 }

 function duplicateId(kind,value,currentObject){
  const current=getData();
  if(!current)return false;
  if(kind==='category')return current.categories.some(category=>category!==currentObject&&String(category?.id||'')===value);
  return current.categories.some(category=>(category.subcategories||[]).some(sub=>sub!==currentObject&&String(sub?.id||'')===value));
 }

 function validateManualId(input){
  const current=getData();
  if(!current||!input)return;
  const isCategory=input.matches('[data-cat][data-k="id"]');
  const kind=isCategory?'category':'subcategory';
  let target=null;
  if(isCategory){
   target=current.categories[Number(input.dataset.cat)];
  }else{
   const [ci,si]=String(input.dataset.sub||'').split(':').map(Number);
   target=current.categories[ci]?.subcategories?.[si];
  }
  if(!target)return;

  const previous=String(input.dataset.previousInternalId||target.id||'').trim();
  const raw=String(input.value||'').trim();
  if(raw===previous)return;
  if(!raw){
   target.id=previous;input.value=previous;
   showOrderingToast('O ID interno não pode ficar vazio. O valor anterior foi restaurado.','error');
   return;
  }

  const normalized=slugify(raw);
  if(duplicateId(kind,normalized,target)){
   target.id=previous;input.value=previous;
   showOrderingToast(`O ID “${normalized}” já está em uso. O valor anterior foi restaurado.`,'error');
   return;
  }

  target.id=normalized;
  input.value=normalized;
  input.dataset.previousInternalId=normalized;
  const card=input.closest('details.item');
  if(isCategory&&card)card.dataset.categoryId=normalized;
  const subcard=input.closest('details.subitem');
  if(!isCategory&&subcard)subcard.dataset.subcategoryId=normalized;
  try{if(typeof sendPreview==='function')sendPreview();}catch{}
  showOrderingToast(`✓ ID interno atualizado para ${normalized}.`,'ok');
 }

 function configureInternalIdInput(input,value,label){
  if(!input)return;
  const next=String(value||'');
  if(document.activeElement!==input&&input.value!==next)input.value=next;
  input.readOnly=false;
  input.removeAttribute('aria-readonly');
  input.title='ID interno/rota. Pode ser editado com cuidado; deve permanecer único.';
  input.dataset.internalId='true';
  if(!input.dataset.previousInternalId)input.dataset.previousInternalId=next;
  const field=input.closest('.field');
  const fieldLabel=field?.querySelector('label');
  if(fieldLabel&&fieldLabel.textContent!==label)fieldLabel.textContent=label;
  input.setAttribute('aria-label',label);
  if(input.dataset.c9IdValidationBound!=='true'){
   input.dataset.c9IdValidationBound='true';
   input.addEventListener('focus',()=>{input.dataset.previousInternalId=String(input.value||'').trim();});
   input.addEventListener('blur',()=>validateManualId(input));
  }
 }

 function categoryLabel(category,index){
  return `${categoryNumber(index)} — ${String(category?.short||category?.name||'Categoria')}`;
 }

 function ensureCategoryMoveControls(card,category,categoryIndex,total){
  const actionRow=card.querySelector(':scope > .inline');
  if(!actionRow)return;
  let controls=actionRow.querySelector(':scope > .c9-category-move-controls');
  if(!controls){
   controls=document.createElement('span');
   controls.className='c9-category-move-controls inline';
   controls.dataset.c9CategoryControls='true';

   const up=document.createElement('button');
   up.type='button';up.className='btn mini';up.textContent='↑ Subir';up.dataset.c9MoveCategory='up';
   up.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    moveCategory(Number(up.dataset.categoryIndex),-1);
   });

   const down=document.createElement('button');
   down.type='button';down.className='btn mini';down.textContent='↓ Descer';down.dataset.c9MoveCategory='down';
   down.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    moveCategory(Number(down.dataset.categoryIndex),1);
   });

   controls.append(up,down);
   actionRow.prepend(controls);
  }

  const label=categoryLabel(category,categoryIndex);
  const up=controls.querySelector('[data-c9-move-category="up"]');
  const down=controls.querySelector('[data-c9-move-category="down"]');
  if(up){
   up.dataset.categoryIndex=String(categoryIndex);
   up.disabled=categoryIndex===0;
   up.style.cursor=up.disabled?'not-allowed':'';
   up.setAttribute('aria-label',`Subir categoria ${label}`);
   up.title=up.disabled?'Esta categoria já está na primeira posição':`Mover ${label} uma posição para cima`;
  }
  if(down){
   down.dataset.categoryIndex=String(categoryIndex);
   down.disabled=categoryIndex===total-1;
   down.style.cursor=down.disabled?'not-allowed':'';
   down.setAttribute('aria-label',`Descer categoria ${label}`);
   down.title=down.disabled?'Esta categoria já está na última posição':`Mover ${label} uma posição para baixo`;
  }
 }

 function updateRuleDomIndexes(){
  const cards=[...document.querySelectorAll('#cats > details.item')];
  cards.forEach((card,ci)=>{
   card.querySelectorAll('[data-cat]').forEach(el=>el.dataset.cat=String(ci));
   card.querySelectorAll('[data-add-sub]').forEach(el=>el.dataset.addSub=String(ci));
   card.querySelectorAll('[data-add-rule]').forEach(el=>el.dataset.addRule=String(ci));
   card.querySelectorAll('[data-del-cat]').forEach(el=>el.dataset.delCat=String(ci));

   [...card.querySelectorAll(':scope > .sub-list > details.subitem')].forEach((subcard,si)=>{
    const subKey=`${ci}:${si}`;
    subcard.querySelectorAll('[data-sub]').forEach(el=>el.dataset.sub=subKey);
    subcard.querySelectorAll('[data-add-sub-rule]').forEach(el=>el.dataset.addSubRule=subKey);
    subcard.querySelectorAll('[data-del-sub]').forEach(el=>el.dataset.delSub=subKey);
    [...subcard.querySelectorAll(':scope > .rule')].forEach((rule,k)=>{
     const ruleKey=`${ci}:${si}:${k}`;
     rule.querySelectorAll('[data-sub-rule]').forEach(el=>el.dataset.subRule=ruleKey);
     rule.querySelectorAll('[data-del-sub-rule]').forEach(el=>el.dataset.delSubRule=ruleKey);
    });
   });

   [...card.querySelectorAll(':scope > .direct-list > .rule')].forEach((rule,j)=>{
    const ruleKey=`${ci}:${j}`;
    rule.querySelectorAll('[data-rule]').forEach(el=>el.dataset.rule=ruleKey);
    rule.querySelectorAll('[data-del-rule]').forEach(el=>el.dataset.delRule=ruleKey);
   });
  });
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
    const next=`${number} — ${String(category.short||category.name||'Categoria')}`;
    if(summary.textContent!==next)summary.textContent=next;
   }

   configureInternalIdInput(card.querySelector('input[data-cat][data-k="id"]'),category.id,'ID interno / rota (editável)');

   const codeInput=card.querySelector('input[data-cat][data-k="code"]');
   if(codeInput){
    if(codeInput.value!==number)codeInput.value=number;
    codeInput.readOnly=true;
    codeInput.setAttribute('aria-readonly','true');
    codeInput.title='Numeração automática baseada na posição da categoria';
   }

   ensureCategoryMoveControls(card,category,categoryIndex,categories.length);

   const subcards=[...card.querySelectorAll(':scope > .sub-list > details.subitem')];
   subcards.forEach((subcard,subcategoryIndex)=>{
    const sub=category.subcategories?.[subcategoryIndex];
    if(!sub)return;
    const subNumber=subcategoryNumber(categoryIndex,subcategoryIndex);
    subcard.dataset.subcategoryNumber=subNumber;
    subcard.dataset.subcategoryId=String(sub.id||'');
    const subSummary=subcard.querySelector(':scope > summary b');
    if(subSummary){
     const next=`📂 ${subNumber} — ${String(sub.name||'Nova subcategoria')}`;
     if(subSummary.textContent!==next)subSummary.textContent=next;
    }
    configureInternalIdInput(subcard.querySelector('input[data-sub][data-k="id"]'),sub.id,'ID interno da subcategoria / rota (editável)');
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
  updateRuleDomIndexes();
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

 function moveCardInDom(from,to){
  const cards=[...document.querySelectorAll('#cats > details.item')];
  const moved=cards[from];
  const target=cards[to];
  if(!moved||!target)return false;
  if(to<from)target.before(moved);else target.after(moved);
  return true;
 }

 function moveCategory(index,direction,options={}){
  const current=getData();
  const step=direction<0?-1:direction>0?1:0;
  const from=Number(index);
  if(!current||!step||!Number.isInteger(from))return {moved:false,reason:'invalid'};
  const to=from+step;
  if(from<0||from>=current.categories.length||to<0||to>=current.categories.length)return {moved:false,reason:'boundary'};

  normalizeCategories();
  const movedObject=current.categories[from];
  const movedId=String(movedObject?.id||'');
  const [moved]=current.categories.splice(from,1);
  current.categories.splice(to,0,moved);
  normalizeCategories();

  const domMoved=moveCardInDom(from,to);
  if(!domMoved){
   try{if(typeof renderRules==='function')renderRules();}catch{}
   try{if(typeof bindEditor==='function')bindEditor();}catch{}
  }
  updateRuleDomIndexes();
  updateEditorLabels(current.categories);

  const movedCard=[...document.querySelectorAll('#cats > details.item')].find(card=>card.dataset.categoryId===movedId);
  if(movedCard)movedCard.open=true;
  try{if(typeof sendPreview==='function')sendPreview();}catch{}

  const position=categoryNumber(to);
  const result={moved:true,from,to,position,id:movedId};
  if(options.notify!==false)showOrderingToast(`✓ Categoria movida para ${position} — numeração reorganizada automaticamente.`);
  return result;
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
   if(!event.target?.closest?.('#panel-rules'))return;
   if(event.target.matches?.('[data-internal-id="true"]'))return;
   scheduleRefresh();
  },true);
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();

 return {version:VERSION,categoryNumber,subcategoryNumber,normalizeCategories,normalizeIds,moveCategory,refresh};
})();
