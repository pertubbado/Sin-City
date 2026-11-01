/* Sin City C9.0.8 — política explícita de códigos: subcategorias automáticas, regras diretas manuais. */
'use strict';

window.SinCityFlowGuard=(function(){
 const VERSION='C9.0.8';
 let installed=false;
 let originalSendPreview=null;
 let attempts=0;

 function orderingReady(){
  return Boolean(window.SinCityOrdering&&typeof window.SinCityOrdering.refresh==='function');
 }

 function getData(){
  try{return typeof data!=='undefined'&&data&&Array.isArray(data.categories)?data:null;}
  catch{return null;}
 }

 function syncNestedRuleCodes(){
  const current=getData();
  if(!current||!orderingReady())return {changed:false,rules:0};
  let changed=false;
  let rules=0;
  const categoryCards=[...document.querySelectorAll('#cats > details.item')];

  current.categories.forEach((category,categoryIndex)=>{
   const subcategories=Array.isArray(category?.subcategories)?category.subcategories:[];
   const categoryCard=categoryCards[categoryIndex];
   const subcards=[...categoryCard?.querySelectorAll(':scope > .sub-list > details.subitem')||[]];

   subcategories.forEach((sub,subcategoryIndex)=>{
    const expected=window.SinCityOrdering.subcategoryNumber(categoryIndex,subcategoryIndex);
    const subRules=Array.isArray(sub?.rules)?sub.rules:[];
    const ruleCards=[...subcards[subcategoryIndex]?.querySelectorAll(':scope > .rule')||[]];

    subRules.forEach((rule,ruleIndex)=>{
     if(!rule||typeof rule!=='object')return;
     rules++;
     if(String(rule.code||'')!==expected){rule.code=expected;changed=true;}

     const ruleCard=ruleCards[ruleIndex];
     if(!ruleCard)return;
     const codeInput=ruleCard.querySelector('input[data-sub-rule][data-k="code"]');
     if(codeInput){
      if(codeInput.value!==expected)codeInput.value=expected;
      codeInput.readOnly=true;
      codeInput.setAttribute('aria-readonly','true');
      codeInput.dataset.autoRuleCode='true';
      delete codeInput.dataset.manualRuleCode;
      codeInput.title='Código automático herdado da posição estrutural da subcategoria';
      codeInput.setAttribute('aria-label','Código automático da regra');
     }
     const heading=ruleCard.querySelector(':scope > .item-head strong');
     if(heading){
      const next=`${expected} • ${String(rule.title||'Sem título')}`;
      if(heading.textContent!==next)heading.textContent=next;
     }
    });
   });
  });

  document.documentElement.dataset.sinCityAutoRuleCodes='true';
  return {changed,rules};
 }

 function configureDirectRuleCodes(){
  const current=getData();
  if(!current)return {rules:0};
  let rules=0;
  const categoryCards=[...document.querySelectorAll('#cats > details.item')];

  current.categories.forEach((category,categoryIndex)=>{
   const directRules=Array.isArray(category?.rules)?category.rules:[];
   const categoryCard=categoryCards[categoryIndex];
   const ruleCards=[...categoryCard?.querySelectorAll(':scope > .direct-list > .rule')||[]];

   directRules.forEach((rule,ruleIndex)=>{
    if(!rule||typeof rule!=='object')return;
    rules++;
    const ruleCard=ruleCards[ruleIndex];
    if(!ruleCard)return;
    const codeInput=ruleCard.querySelector('input[data-rule][data-k="code"]');
    if(!codeInput)return;
    codeInput.readOnly=false;
    codeInput.removeAttribute('aria-readonly');
    codeInput.dataset.manualRuleCode='true';
    delete codeInput.dataset.autoRuleCode;
    codeInput.title='Código manual da regra direta. Não muda quando a categoria é reorganizada.';
    codeInput.setAttribute('aria-label','Código manual da regra direta');
   });
  });

  document.documentElement.dataset.sinCityManualDirectRuleCodes='true';
  return {rules};
 }

 function syncRuleCodePolicy(){
  const nested=syncNestedRuleCodes();
  const direct=configureDirectRuleCodes();
  document.documentElement.dataset.sinCityRuleCodePolicy=VERSION;
  return {nested,direct};
 }

 function flush(){
  if(!orderingReady())return false;
  try{
   window.SinCityOrdering.refresh({preview:false});
   syncRuleCodePolicy();
   document.documentElement.dataset.sinCityFlowGuard=VERSION;
   return true;
  }catch(error){
   console.warn('[Sin City C9.0.8] Falha ao aplicar política de códigos antes da prévia.',error);
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
  syncNestedRuleCodes,
  configureDirectRuleCodes,
  syncRuleCodePolicy,
  isInstalled:()=>installed,
  originalSendPreview:()=>originalSendPreview
 };
})();
