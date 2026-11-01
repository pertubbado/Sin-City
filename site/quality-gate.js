/* Sin City C8.0.6 — quality gate de integração, acessibilidade e regressão.
   Não grava armazenamento, não publica e não altera conteúdo do projeto. */
'use strict';

window.SinCityQualityGate=(function(){
 let installed=false;
 let fieldObserver=null;
 let editorModalObserver=null;
 let editorModalOpener=null;
 let generatedId=0;

 const item=(status,title,detail,recommendation)=>({status,title,detail,recommendation});
 const text=node=>String(node?.textContent||'').replace(/\s+/g,' ').trim();
 const safeId=value=>String(value||'campo').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,54)||'campo';
 const isHiddenControl=control=>control?.type==='hidden'||control?.hidden===true||control?.getAttribute?.('aria-hidden')==='true';

 function makeId(control,prefix='sc-field'){
  if(control.id)return control.id;
  const source=control.dataset?.path||control.dataset?.cat||control.dataset?.sub||control.dataset?.rule||control.dataset?.subRule||control.dataset?.upd||control.name||control.type||'campo';
  let candidate=prefix+'-'+safeId(source);
  while(document.getElementById(candidate))candidate=prefix+'-'+safeId(source)+'-'+(++generatedId);
  control.id=candidate;
  return candidate;
 }

 function associateField(field){
  const label=field.querySelector('label');
  if(!label)return;
  const controls=[...field.querySelectorAll('input,textarea,select')].filter(control=>!isHiddenControl(control));
  if(!controls.length)return;
  let primary=null;
  if(label.htmlFor)primary=document.getElementById(label.htmlFor);
  if(!primary){
   primary=field.querySelector('.check input:not([type="hidden"])')
    ||field.querySelector('textarea[data-path],select[data-path],input[data-path]:not([type="color"]):not([type="hidden"])')
    ||field.querySelector('textarea,select,input:not([type="color"]):not([type="file"]):not([type="hidden"])')
    ||controls[0];
   if(primary)label.htmlFor=makeId(primary);
  }
  const labelText=text(label)||'Campo';
  controls.forEach(control=>{
   if(control===primary)return;
   if(control.type==='color'&&!control.getAttribute('aria-label'))control.setAttribute('aria-label','Seletor de cor — '+labelText);
   else if(control.type==='file'&&!control.getAttribute('aria-label'))control.setAttribute('aria-label','Selecionar arquivo — '+labelText);
  });
 }

 function enhanceEditorFields(root=document){
  root.querySelectorAll?.('.field').forEach(associateField);
 }

 function setLiveRegions(){
  const toast=document.getElementById('toast');
  if(toast){toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true');}
  const auth=document.getElementById('authStatus');
  if(auth){auth.setAttribute('role','status');auth.setAttribute('aria-live','polite');auth.setAttribute('aria-atomic','true');}
 }

 function focusableInside(root){
  return [...root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
   .filter(node=>!node.hidden&&node.getAttribute('aria-hidden')!=='true');
 }

 function trapTab(event,root){
  if(event.key!=='Tab')return;
  const nodes=focusableInside(root);
  if(!nodes.length){event.preventDefault();root.focus?.();return;}
  const first=nodes[0],last=nodes[nodes.length-1],active=document.activeElement;
  if(event.shiftKey&&active===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&active===last){event.preventDefault();first.focus();}
 }

 function installEditorModal(){
  const modal=document.getElementById('tokenModal');
  if(!modal||modal.dataset.c806Bound==='1')return;
  modal.dataset.c806Bound='1';
  const warning=modal.querySelector('.auth-warning');
  if(warning){if(!warning.id)warning.id='tokenModalWarning';modal.setAttribute('aria-describedby',warning.id);}
  const login=document.getElementById('loginBtn');
  login?.addEventListener('click',()=>{editorModalOpener=document.activeElement instanceof HTMLElement?document.activeElement:login;},{capture:true});
  modal.addEventListener('keydown',event=>{
   trapTab(event,modal);
   if(event.key==='Escape'){
    const cancel=document.getElementById('cancelTokenBtn');
    if(cancel){event.preventDefault();cancel.click();}
   }
  });
  const sync=()=>{
   const open=!modal.hidden;
   const shell=document.querySelector('.shell');
   if(shell&&'inert' in shell)shell.inert=open;
   if(!open&&editorModalOpener&&document.contains(editorModalOpener)){
    const target=editorModalOpener;editorModalOpener=null;
    requestAnimationFrame(()=>target.focus());
   }
  };
  editorModalObserver=new MutationObserver(sync);
  editorModalObserver.observe(modal,{attributes:true,attributeFilter:['hidden']});
  sync();
 }

 function installSearchAccessibility(){
  const searchInput=document.getElementById('searchInput');
  if(searchInput&&!searchInput.getAttribute('aria-label'))searchInput.setAttribute('aria-label','Pesquisar regras');
  const overlayInput=document.getElementById('overlaySearch');
  if(overlayInput&&!overlayInput.getAttribute('aria-label'))overlayInput.setAttribute('aria-label','Pesquisar regras na janela de pesquisa rápida');
  const overlay=document.getElementById('searchOverlay');
  const dialog=overlay?.querySelector('[role="dialog"]');
  if(!overlay||!dialog||dialog.dataset.c806Bound==='1')return;
  dialog.dataset.c806Bound='1';
  dialog.addEventListener('keydown',event=>trapTab(event,dialog));
 }

 function observeDynamicEditor(){
  const workspace=document.getElementById('editorWorkspace');
  if(!workspace||workspace.dataset.c806Observed==='1')return;
  workspace.dataset.c806Observed='1';
  fieldObserver=new MutationObserver(records=>{
   records.forEach(record=>record.addedNodes.forEach(node=>{
    if(!(node instanceof Element))return;
    if(node.matches('.field'))associateField(node);
    enhanceEditorFields(node);
   }));
  });
  fieldObserver.observe(workspace,{childList:true,subtree:true});
 }

 function install(){
  if(installed){enhanceEditorFields();installSearchAccessibility();return;}
  installed=true;
  document.documentElement.dataset.c806Quality='installed';
  setLiveRegions();
  enhanceEditorFields();
  observeDynamicEditor();
  installEditorModal();
  installSearchAccessibility();
 }

 function accessibleName(control){
  const aria=String(control.getAttribute('aria-label')||'').trim();if(aria)return aria;
  const labelledBy=String(control.getAttribute('aria-labelledby')||'').trim();
  if(labelledBy){const value=labelledBy.split(/\s+/).map(id=>text(document.getElementById(id))).filter(Boolean).join(' ');if(value)return value;}
  if(control.labels?.length){const value=[...control.labels].map(text).filter(Boolean).join(' ');if(value)return value;}
  if(control.tagName==='BUTTON'||control.tagName==='A'){const value=text(control);if(value)return value;}
  const title=String(control.getAttribute('title')||'').trim();if(title)return title;
  return '';
 }

 function checkUniqueIds(){
  const map=new Map();
  document.querySelectorAll('[id]').forEach(node=>map.set(node.id,(map.get(node.id)||0)+1));
  const duplicates=[...map.entries()].filter(([,count])=>count>1).map(([id])=>id);
  return duplicates.length
   ?item('error','IDs únicos no Studio','Foram encontrados IDs duplicados: '+duplicates.slice(0,8).join(', ')+(duplicates.length>8?' e outros.':'.'),'Corrija IDs duplicados antes da integração final.')
   :item('ok','IDs únicos no Studio','Não foram encontrados IDs duplicados no documento do editor.','Nenhuma ação necessária.');
 }

 function checkAccessibleControls(){
  enhanceEditorFields();installSearchAccessibility();
  const controls=[...document.querySelectorAll('button,input,select,textarea')].filter(control=>!isHiddenControl(control));
  const unnamed=controls.filter(control=>!accessibleName(control));
  return unnamed.length
   ?item('error','Nomes acessíveis dos controles',unnamed.length+' controle(s) interativo(s) não possuem nome acessível. Exemplos: '+unnamed.slice(0,6).map(node=>node.id||node.tagName.toLowerCase()).join(', ')+'.','Associe labels ou aria-label aos controles indicados.')
   :item('ok','Nomes acessíveis dos controles',controls.length+' controles verificados; todos possuem nome acessível.','Nenhuma ação necessária.');
 }

 function checkLandmarks(){
  const problems=[];
  if(document.documentElement.lang.toLowerCase()!=='pt-br')problems.push('lang pt-BR');
  if(!document.querySelector('main'))problems.push('main');
  const nav=document.getElementById('studioNav');if(nav&&!nav.getAttribute('aria-label'))problems.push('rótulo da navegação do Studio');
  const preview=document.getElementById('preview');if(preview&&!preview.getAttribute('title'))problems.push('title do iframe de prévia');
  return problems.length
   ?item('error','Estrutura semântica e landmarks','Itens ausentes ou incompletos: '+problems.join(', ')+'.','Revise a estrutura semântica antes da integração final.')
   :item('ok','Estrutura semântica e landmarks','Idioma, região principal, navegação e título da prévia estão identificados.','Nenhuma ação necessária.');
 }

 function checkDiagnosticsIntegration(){
  const modules=[...document.querySelectorAll('.diagnostics-grid .diagnostic-module')];
  const required=['diagnosticHealthStatus','diagnosticAccessStatus','diagnosticMediaStatus','diagnosticStorageStatus','diagnosticPreviewStatus','diagnosticDeployStatus'];
  const missing=required.filter(id=>!document.getElementById(id));
  if(modules.length!==6||missing.length)return item('error','Integração dos seis módulos','Foram encontrados '+modules.length+' cartões de módulo; estados ausentes: '+(missing.join(', ')||'nenhum')+'.','Restaure a estrutura dos seis módulos antes de avançar.');
  return item('ok','Integração dos seis módulos','Os seis cartões e seus seis estados de diagnóstico estão presentes na mesma central.','Nenhuma ação necessária.');
 }

 function checkPrimaryFlows(){
  const required=['reloadBtn','draftBtn','backupBtn','siteBtn','loginBtn','publishBtn','runLocalDiagnosticsBtn','copyDiagnosticsReportBtn','preview','previewFullscreenBtn'];
  const missing=required.filter(id=>!document.getElementById(id));
  const panelCount=document.querySelectorAll('.editor-workspace .panel.active').length;
  if(missing.length||panelCount!==1)return item('error','Controles principais e painel ativo','Controles ausentes: '+(missing.join(', ')||'nenhum')+'; painéis ativos: '+panelCount+'.','Revise a regressão da navegação e das ações principais.');
  return item('ok','Controles principais e painel ativo','Rascunho, backup, sessão, publicação, diagnóstico e prévia continuam disponíveis; há um único painel ativo.','Nenhuma ação necessária.');
 }

 function checkAriaState(){
  const missing=[];
  document.querySelectorAll('[data-preview-device]').forEach(button=>{if(!button.hasAttribute('aria-pressed'))missing.push('preview '+text(button));});
  const navToggle=document.getElementById('toggleNavBtn');if(navToggle&&!navToggle.hasAttribute('aria-expanded'))missing.push('toggle da navegação');
  const fullscreen=document.getElementById('previewFullscreenBtn');if(fullscreen&&!fullscreen.hasAttribute('aria-pressed'))missing.push('tela cheia');
  const summary=document.getElementById('diagnosticsSummaryText');if(summary&&summary.getAttribute('aria-live')!=='polite')missing.push('resumo aria-live');
  const toast=document.getElementById('toast');if(toast&&toast.getAttribute('aria-live')!=='polite')missing.push('toast aria-live');
  return missing.length
   ?item('error','Estados ARIA e mensagens ao vivo','Estados incompletos: '+missing.join(', ')+'.','Restaure os estados ARIA antes da integração final.')
   :item('ok','Estados ARIA e mensagens ao vivo','Controles de dispositivo, navegação, tela cheia e mensagens dinâmicas expõem seus estados.','Nenhuma ação necessária.');
 }

 function checkModal(){
  const modal=document.getElementById('tokenModal');
  if(!modal)return item('unavailable','Diálogo de conexão GitHub','O diálogo de token não existe neste documento.','Esta verificação só se aplica ao Studio.');
  const labelled=modal.getAttribute('aria-labelledby'),labelNode=labelled&&document.getElementById(labelled);
  const ok=modal.getAttribute('role')==='dialog'&&modal.getAttribute('aria-modal')==='true'&&Boolean(labelNode)&&modal.dataset.c806Bound==='1';
  return ok
   ?item('ok','Diálogo de conexão GitHub','O diálogo é modal, possui nome acessível, ciclo de foco e restauração do foco ao fechar.','Nenhuma ação necessária.')
   :item('error','Diálogo de conexão GitHub','A semântica ou o gerenciamento de foco do diálogo está incompleto.','Revise role/aria-modal/aria-labelledby e o ciclo de foco.');
 }

 function checkSharedApis(){
  const missing=[];
  if(!window.SinCityDiagnostics?.create)missing.push('SinCityDiagnostics');
  if(!window.SinCitySavedThemes?.create)missing.push('SinCitySavedThemes');
  if(!window.SinCityQualityGate?.run)missing.push('SinCityQualityGate');
  return missing.length
   ?item('error','Módulos JavaScript compartilhados','APIs indisponíveis: '+missing.join(', ')+'.','Confira a ordem e o carregamento dos scripts.')
   :item('ok','Módulos JavaScript compartilhados','Diagnóstico, temas salvos e quality gate estão carregados sem substituir uns aos outros.','Nenhuma ação necessária.');
 }

 function checkPublicPreview(){
  const frame=document.getElementById('preview');
  if(!frame?.contentWindow)return item('unavailable','Acessibilidade da prévia pública','A janela da prévia ainda não está disponível.','Aguarde o iframe carregar e execute novamente.');
  try{
   const doc=frame.contentDocument||frame.contentWindow.document;
   if(!doc)return item('unavailable','Acessibilidade da prévia pública','O documento da prévia não pôde ser acessado.','Abra editor e prévia na mesma origem.');
   const problems=[];
   if(doc.documentElement.lang.toLowerCase()!=='pt-br')problems.push('idioma');
   if(!doc.querySelector('main'))problems.push('main');
   const search=doc.getElementById('searchInput');if(search&&!String(search.getAttribute('aria-label')||'').trim())problems.push('nome da pesquisa global');
   const overlay=doc.getElementById('overlaySearch');if(overlay&&!String(overlay.getAttribute('aria-label')||'').trim())problems.push('nome da pesquisa rápida');
   const dialog=doc.querySelector('.search-modal[role="dialog"][aria-modal="true"]');if(!dialog)problems.push('diálogo de pesquisa');
   const loadError=doc.getElementById('loadError');if(loadError&&loadError.getAttribute('role')!=='alert')problems.push('alerta de carregamento');
   return problems.length
    ?item('error','Acessibilidade da prévia pública','Itens incompletos na prévia: '+problems.join(', ')+'.','Corrija os itens antes da integração final.')
    :item('ok','Acessibilidade da prévia pública','Idioma, landmarks, pesquisas, diálogo e alerta básico da prévia estão identificados.','Nenhuma ação necessária.');
  }catch(error){return item('unavailable','Acessibilidade da prévia pública','O navegador bloqueou a inspeção de mesma origem da prévia.','Execute o teste pelo mesmo servidor/origem do editor.');}
 }

 function run(){
  install();
  return [
   checkUniqueIds(),
   checkAccessibleControls(),
   checkLandmarks(),
   checkDiagnosticsIntegration(),
   checkPrimaryFlows(),
   checkAriaState(),
   checkModal(),
   checkSharedApis(),
   checkPublicPreview(),
   item('ok','Segurança do quality gate','A camada C8.0.6 atua apenas no DOM e em leitura de estado. Não usa localStorage, não chama GitHub e não executa publicação.','Nenhuma ação necessária.')
  ];
 }

 return {install,run};
})();

(function bootQualityGate(){
 const start=()=>window.SinCityQualityGate?.install();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
