/* Sin City C8.0.7 — camada isolada de acessibilidade e gerenciamento de foco. */
'use strict';

window.SinCityAccessibility=(function(){
 const VERSION='C8.0.7';
 const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
 let refreshFrame=0;

 const text=node=>String(node?.textContent||'').replace(/\s+/g,' ').trim();
 const visible=node=>Boolean(node)&&!node.hidden&&node.getAttribute('aria-hidden')!=='true'&&node.getClientRects().length>0;

 function focusables(container){
  if(!container)return [];
  return [...container.querySelectorAll(FOCUSABLE)].filter(visible);
 }

 function trapTab(container,event){
  if(event.key!=='Tab')return;
  const items=focusables(container);
  if(!items.length){event.preventDefault();container.focus?.();return;}
  const first=items[0],last=items[items.length-1],active=document.activeElement;
  if(event.shiftKey&&(active===first||!container.contains(active))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(active===last||!container.contains(active))){event.preventDefault();first.focus();}
 }

 function hasAccessibleName(control){
  if(String(control.getAttribute('aria-label')||'').trim())return true;
  if(String(control.getAttribute('aria-labelledby')||'').trim())return true;
  return Boolean(control.labels?.length);
 }

 function fieldName(control){
  const field=control.closest('.field');
  const label=field?.querySelector('label');
  const base=text(label);
  if(!base)return '';
  if(control.matches('input[type="color"]'))return base+' — seletor de cor';
  if(control.closest('.color-row')&&control.matches('input:not([type="color"])'))return base+' — valor hexadecimal';
  return base;
 }

 function ensureStudioControlNames(root=document){
  root.querySelectorAll('input,select,textarea').forEach(control=>{
   if(control.type==='hidden'||hasAccessibleName(control))return;
   const name=fieldName(control);
   if(name)control.setAttribute('aria-label',name);
  });
 }

 function setupToast(){
  const toast=document.getElementById('toast');
  if(!toast)return false;
  toast.setAttribute('role','status');
  toast.setAttribute('aria-live','polite');
  toast.setAttribute('aria-atomic','true');
  toast.dataset.accessibilityReady=VERSION;
  return true;
 }

 function setupTokenModal(){
  const modal=document.getElementById('tokenModal');
  if(!modal||modal.dataset.focusManaged==='true')return Boolean(modal);
  const card=modal.querySelector('.auth-card')||modal;
  const token=document.getElementById('tokenInput');
  const login=document.getElementById('loginBtn');
  let returnFocus=null;
  let previousHidden=modal.hidden;

  modal.dataset.focusManaged='true';
  modal.dataset.accessibilityReady=VERSION;

  modal.addEventListener('keydown',event=>{
   if(modal.hidden)return;
   if(event.key==='Tab')trapTab(card,event);
   if(event.key==='Escape'){
    event.preventDefault();
    event.stopImmediatePropagation();
    modal.hidden=true;
    if(token)token.value='';
   }
  },true);

  const observer=new MutationObserver(()=>{
   const nowHidden=modal.hidden;
   if(previousHidden&&!nowHidden){
    const active=document.activeElement;
    returnFocus=active&&active!==document.body&&!modal.contains(active)?active:login;
   }
   if(!previousHidden&&nowHidden){
    const target=returnFocus?.isConnected?returnFocus:login;
    requestAnimationFrame(()=>target?.focus());
   }
   previousHidden=nowHidden;
  });
  observer.observe(modal,{attributes:true,attributeFilter:['hidden']});
  return true;
 }

 function setupPublicSearch(){
  const globalSearch=document.getElementById('searchInput');
  const quickSearch=document.getElementById('overlaySearch');
  if(globalSearch&&!hasAccessibleName(globalSearch))globalSearch.setAttribute('aria-label','Pesquisar em todas as regras');
  if(quickSearch&&!hasAccessibleName(quickSearch))quickSearch.setAttribute('aria-label','Pesquisar regras rapidamente');

  const overlay=document.getElementById('searchOverlay');
  const modal=overlay?.querySelector('.search-modal');
  if(!overlay||!modal)return false;
  if(overlay.dataset.focusManaged!=='true'){
   overlay.dataset.focusManaged='true';
   overlay.dataset.accessibilityReady=VERSION;
   overlay.addEventListener('keydown',event=>{
    if(overlay.hidden)return;
    if(event.key==='Tab')trapTab(modal,event);
   },true);
  }
  return true;
 }

 function loadOrderingLayer(){
  if(!document.getElementById('panel-rules')||window.SinCityOrdering||document.querySelector('script[data-sin-city-ordering]'))return;
  const script=document.createElement('script');
  script.src='./c9-ordering.js';
  script.dataset.sinCityOrdering='C9.0.5';
  document.head.appendChild(script);
 }

 function loadFlowGuardLayer(){
  if(!document.getElementById('panel-rules')||window.SinCityFlowGuard||document.querySelector('script[data-sin-city-flow-guard]'))return;
  const script=document.createElement('script');
  script.src='./c9-flow-guard.js';
  script.dataset.sinCityFlowGuard='C9.0.7';
  document.head.appendChild(script);
 }

 function loadPublicOrderingLayer(){
  if(!document.getElementById('nav')||window.SinCityPublicOrdering||document.querySelector('script[data-sin-city-public-ordering]'))return;
  const script=document.createElement('script');
  script.src='./c9-public-ordering.js';
  script.dataset.sinCityPublicOrdering='C9.0.6';
  document.head.appendChild(script);
 }

 function refresh(){
  ensureStudioControlNames();
  setupToast();
  setupTokenModal();
  setupPublicSearch();
  document.documentElement.dataset.sinCityAccessibility=VERSION;
 }

 function scheduleRefresh(){
  if(refreshFrame)return;
  refreshFrame=requestAnimationFrame(()=>{refreshFrame=0;refresh();});
 }

 function boot(){
  refresh();
  loadOrderingLayer();
  loadFlowGuardLayer();
  loadPublicOrderingLayer();
  const observer=new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement,{childList:true,subtree:true});
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();

 return {version:VERSION,refresh};
})();
