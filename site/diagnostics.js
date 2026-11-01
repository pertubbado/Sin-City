(function () {
'use strict';
const REQUIRED_FILES=['site/index.html','site/editor.html','site/app.js','site/style.css','site/theme-controls.css','site/editor-studio.css','site/saved-themes.js','site/content/site.json','site/rules.json','site/content/rules.json','.github/workflows/deploy.yml'];
const DEFAULT_ASSETS=['site/assets/cemetery-halloween.svg','site/assets/cemetery-night.webp','site/assets/cursor-esqueleto.png','site/assets/logo-sin-city.webp','site/assets/particle-bat.svg','site/assets/particle-pumpkin.svg','site/assets/pumpkin-cursor.svg','site/assets/sin-city-mark.svg'];
const THEME_PACKS=['halloween','natal','pascoa','carnaval-brasil','namorados','lgbtqia'];
const STATUS={ok:{label:'APROVADO'},attention:{label:'ATENÇÃO'},error:{label:'ERRO'},unavailable:{label:'INDISPONÍVEL'}};
const el=id=>document.getElementById(id);
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);

function create(options){
 const repo=options.repo,branch=options.branch||'main',toast=options.toast||function(){};
 let running=false,lastReport='';

 const item=(status,title,detail,recommendation)=>({status,title,detail,recommendation});
 async function textFile(path){
  const url=new URL(path,document.baseURI);url.searchParams.set('_sc_diagnostic',String(Date.now()));
  const response=await fetch(url.toString(),{cache:'no-store'});
  if(!response.ok)throw new Error('HTTP '+response.status+' ao ler '+path);
  return response.text();
 }
 async function treeData(){
  const url='https://api.github.com/repos/'+repo+'/git/trees/'+encodeURIComponent(branch)+'?recursive=1';
  const response=await fetch(url,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
  if(!response.ok)throw new Error('GitHub respondeu HTTP '+response.status+(response.status===403?'; o limite público de consultas pode ter sido atingido.':'.'));
  const body=await response.json();if(!Array.isArray(body.tree))throw new Error('O GitHub não retornou a lista de arquivos esperada.');
  return body;
 }
 function parse(text,path){try{return JSON.parse(text);}catch(error){throw new Error(path+' contém JSON inválido: '+error.message);}}
 function canonical(v){
  if(Array.isArray(v))return v.map(canonical);
  if(isObject(v)){const o={};Object.keys(v).sort().forEach(k=>o[k]=canonical(v[k]));return o;}
  return v;
 }
 function sameJson(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}
 function validateSite(site){
  if(!isObject(site))return [item('error','Estrutura principal do site','O arquivo de configuração não contém um objeto JSON.','Verifique site/content/site.json antes de publicar.')];
  const out=[],required=['site_name','site_title','hero_title','logo','favicon','hero_image'];
  const missing=required.filter(k=>typeof site[k]!=='string'||!site[k].trim());
  const invalid=['theme','layout','cursor'].filter(k=>!isObject(site[k]));
  out.push(missing.length?item('attention','Campos principais da configuração','Campos ausentes ou vazios: '+missing.join(', ')+'.','Confira esses campos nas configurações do site.'):item('ok','Campos principais da configuração','Nome, título, capa, logo e favicon estão preenchidos.','Nenhuma ação necessária.'));
  out.push(invalid.length?item('error','Estrutura de aparência e comportamento','Seções ausentes ou inválidas: '+invalid.join(', ')+'.','Confira theme, layout e cursor em site/content/site.json.'):item('ok','Estrutura de aparência e comportamento','As seções theme, layout e cursor estão presentes.','Nenhuma ação necessária.'));
  if(site.background_image!==undefined&&typeof site.background_image!=='string')out.push(item('error','Referência do plano de fundo','background_image não é um texto válido.','Corrija o caminho da imagem nas configurações do site.'));
  return out;
 }
 function validateRules(data){
  if(!isObject(data))return [item('error','Estrutura principal das regras','O arquivo não contém um objeto JSON.','Verifique site/rules.json antes de publicar.')];
  if(!Array.isArray(data.categories))return [item('error','Lista de categorias','categories não existe ou não é uma lista.','Restaure a estrutura de categorias antes de publicar.')];
  const out=[],bad=[],incomplete=[],seen=new Set(),duplicates=new Set();
  data.categories.forEach((c,i)=>{
   if(!isObject(c)){bad.push('categoria '+(i+1)+' não é um objeto');return;}
   if(c.rules!==undefined&&!Array.isArray(c.rules))bad.push('regras da categoria '+(i+1)+' não são uma lista');
   if(c.subcategories!==undefined&&!Array.isArray(c.subcategories))bad.push('subcategorias da categoria '+(i+1)+' não são uma lista');
   if(!String(c.id||'').trim()||!String(c.code||'').trim()||!String(c.name||c.short||'').trim())incomplete.push('categoria '+(i+1)+' sem ID, código ou nome');
   const id=String(c.id||'').trim();if(id&&seen.has(id))duplicates.add(id);if(id)seen.add(id);
   (Array.isArray(c.subcategories)?c.subcategories:[]).forEach((s,j)=>{
    if(!isObject(s))bad.push('subcategoria '+(i+1)+'.'+(j+1)+' não é um objeto');
    else if(s.rules!==undefined&&!Array.isArray(s.rules))bad.push('regras da subcategoria '+(i+1)+'.'+(j+1)+' não são uma lista');
   });
  });
  out.push(bad.length?item('error','Estrutura interna das categorias',bad.slice(0,5).join('; ')+(bad.length>5?' e mais '+(bad.length-5)+' problema(s).':'.'),'Corrija as listas e os objetos indicados antes de publicar.'):item('ok','Estrutura interna das categorias','As categorias, subcategorias e listas de regras possuem tipos válidos.','Nenhuma ação necessária.'));
  if(incomplete.length||duplicates.size){
   const d=[];if(incomplete.length)d.push(incomplete.slice(0,4).join('; '));if(duplicates.size)d.push('IDs repetidos: '+Array.from(duplicates).join(', '));
   out.push(item('attention','Identificação das categorias',d.join('. ')+'.','Revise identificadores, códigos e nomes no painel Regras.'));
  }else out.push(item('ok','Identificação das categorias','As categorias possuem identificadores e nomes; não foram encontrados IDs repetidos.','Nenhuma ação necessária.'));
  if(data.updates!==undefined&&!Array.isArray(data.updates))out.push(item('error','Lista de atualizações','updates existe, mas não é uma lista.','Corrija a estrutura de updates.'));
  else out.push(item('ok','Lista de atualizações',(Array.isArray(data.updates)?data.updates.length:0)+' atualização(ões) encontrada(s).','Nenhuma ação necessária.'));
  let subs=0,direct=0,nested=0;
  data.categories.forEach(c=>{if(!isObject(c))return;if(Array.isArray(c.rules))direct+=c.rules.length;if(Array.isArray(c.subcategories)){subs+=c.subcategories.length;c.subcategories.forEach(s=>{if(isObject(s)&&Array.isArray(s.rules))nested+=s.rules.length;});}});
  out.push(item('ok','Resumo do conteúdo',data.categories.length+' categorias, '+subs+' subcategorias, '+(direct+nested)+' regras e '+(Array.isArray(data.updates)?data.updates.length:0)+' atualizações carregadas.','Nenhuma ação necessária.'));
  return out;
 }
 function assetPath(value){
  let p=String(value||'').trim().split(/[?#]/)[0].replace(/\\/g,'/').replace(/^\.\//,'').replace(/^\/+/,'');
  if(p.startsWith('Sin-City/'))p=p.slice(9);
  if(p.startsWith('site/'))return p;
  if(p.startsWith('assets/'))return 'site/'+p;
  return p?'site/'+p:'';
 }
 function collect(site,data){
  const refs=[],add=(v,label)=>{if(typeof v==='string'&&v.trim())refs.push({value:v.trim(),label:label});};
  if(isObject(site)){add(site.logo,'Logo do site');add(site.favicon,'Favicon');add(site.hero_image,'Banner principal');add(site.background_image,'Fundo do site');if(isObject(site.cursor))add(site.cursor.image,'Cursor personalizado');}
  (Array.isArray(data&&data.categories)?data.categories:[]).forEach((c,i)=>{
   if(!isObject(c))return;const name=c.code||c.short||c.name||('categoria '+(i+1));add(c.image,'Imagem da categoria '+name);
   (Array.isArray(c.rules)?c.rules:[]).forEach((r,j)=>{if(isObject(r))add(r.image,'Imagem da regra '+(r.code||r.title||(j+1)));});
   (Array.isArray(c.subcategories)?c.subcategories:[]).forEach((s,j)=>{if(!isObject(s))return;add(s.image,'Imagem da subcategoria '+(s.name||(j+1)));(Array.isArray(s.rules)?s.rules:[]).forEach((r,k)=>{if(isObject(r))add(r.image,'Imagem da regra '+(r.code||r.title||(k+1)));});});
  });
  return refs;
 }
 function aggregate(list){
  if(list.some(x=>x.status==='error'))return {status:'error',label:'ERRO'};
  if(list.some(x=>x.status==='attention'))return {status:'attention',label:'ATENÇÃO'};
  if(list.some(x=>x.status==='unavailable'))return {status:'unavailable',label:'PARCIAL'};
  return {status:list.length?'ok':'unavailable',label:list.length?'APROVADO':'AGUARDANDO'};
 }
 function badge(id,list){const node=el(id);if(!node)return;const s=aggregate(list);node.className='diagnostic-planned diagnostic-state diagnostic-state-'+s.status;node.textContent=s.label;}
 function appendRow(host,entry){
  const row=document.createElement('article');row.className='diagnostic-result diagnostic-result-'+entry.status;
  const head=document.createElement('div');head.className='diagnostic-result-head';
  const title=document.createElement('strong');title.textContent=entry.title;
  const state=document.createElement('span');state.className='diagnostic-result-badge diagnostic-result-badge-'+entry.status;state.textContent=STATUS[entry.status].label;
  head.append(title,state);const detail=document.createElement('p');detail.textContent=entry.detail;
  const next=document.createElement('small');next.textContent='Próximo passo: '+entry.recommendation;row.append(head,detail,next);host.appendChild(row);
 }
 function renderList(id,list){
  const host=el(id);if(!host)return;host.replaceChildren();
  if(!list.length){const p=document.createElement('p');p.className='diagnostic-empty';p.textContent='Nenhuma verificação disponível.';host.appendChild(p);return;}
  list.slice(0,6).forEach(entry=>appendRow(host,entry));
  if(list.length>6){const more=document.createElement('details');more.className='diagnostic-more';const summary=document.createElement('summary');summary.textContent='Ver mais '+(list.length-6)+' verificações';const rest=document.createElement('div');rest.className='diagnostic-more-list';list.slice(6).forEach(entry=>appendRow(rest,entry));more.append(summary,rest);host.appendChild(more);}
 }
 function summary(health,media,when){
  const all=health.concat(media),count={ok:0,attention:0,error:0,unavailable:0};all.forEach(x=>count[x.status]++);
  if(el('diagnosticsPassCount'))el('diagnosticsPassCount').textContent=String(count.ok);
  if(el('diagnosticsAttentionCount'))el('diagnosticsAttentionCount').textContent=String(count.attention+count.unavailable);
  if(el('diagnosticsErrorCount'))el('diagnosticsErrorCount').textContent=String(count.error);
  if(el('diagnosticsRunMeta'))el('diagnosticsRunMeta').textContent='Última execução: '+when+' · somente leitura';
  if(el('diagnosticsSummaryText')){
   let message='Foram executadas '+all.length+' verificações nos módulos Saúde do projeto e Imagens e mídias.';
   if(count.error)message+=' Existem '+count.error+' erro(s) que merecem revisão.';
   else if(count.attention||count.unavailable)message+=' Existem pontos de atenção ou verificações indisponíveis.';
   else message+=' Todos os itens executados foram aprovados.';
   message+=' Os outros quatro módulos continuam planejados para as próximas etapas.';
   el('diagnosticsSummaryText').textContent=message;
  }
  const lines=['SIN CITY STUDIO — DIAGNÓSTICO LOCAL C8.0.3','Data: '+when,'Resumo: '+count.ok+' aprovado(s), '+count.attention+' atenção, '+count.error+' erro(s), '+count.unavailable+' indisponível(is).','','01 — SAÚDE DO PROJETO'];
  health.forEach(x=>lines.push('['+STATUS[x.status].label+'] '+x.title+'\n'+x.detail+'\nPróximo passo: '+x.recommendation));
  lines.push('','03 — IMAGENS E MÍDIAS');
  media.forEach(x=>lines.push('['+STATUS[x.status].label+'] '+x.title+'\n'+x.detail+'\nPróximo passo: '+x.recommendation));
  lines.push('','Somente leitura: nenhum arquivo, tema, regra ou publicação foi alterado.');
  lastReport=lines.join('\n');if(el('copyDiagnosticsReportBtn'))el('copyDiagnosticsReportBtn').disabled=false;
 }
 async function copyReport(){
  if(!lastReport){toast('Execute o diagnóstico antes de copiar o relatório.','error');return;}
  try{
   if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(lastReport);
   else{const field=document.createElement('textarea');field.value=lastReport;field.setAttribute('readonly','');field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();const ok=document.execCommand('copy');field.remove();if(!ok)throw new Error('O navegador não permitiu copiar automaticamente.');}
   toast('Relatório de diagnóstico copiado.','ok');
  }catch(error){toast('Não foi possível copiar o relatório: '+error.message,'error');}
 }
 async function run(){
  if(running)return;running=true;
  const runButton=el('runLocalDiagnosticsBtn'),copyButton=el('copyDiagnosticsReportBtn');
  if(runButton){runButton.disabled=true;runButton.textContent='DIAGNOSTICANDO...';}
  if(copyButton)copyButton.disabled=true;
  if(el('diagnosticsSummaryText'))el('diagnosticsSummaryText').textContent='Consultando arquivos publicados e validando os dados. Nenhuma alteração será realizada.';
  if(el('diagnosticHealthStatus'))el('diagnosticHealthStatus').textContent='ANALISANDO';
  if(el('diagnosticMediaStatus'))el('diagnosticMediaStatus').textContent='ANALISANDO';
  const health=[],media=[];let tree=null,fileMap=new Map(),siteData=null,rulesData=null;
  const settled=await Promise.allSettled([treeData(),textFile('./content/site.json'),textFile('./rules.json')]);
  if(settled[0].status==='fulfilled'){
   tree=settled[0].value;fileMap=new Map(tree.tree.filter(x=>x.type==='blob').map(x=>[x.path,x]));
   if(tree.truncated)health.push(item('attention','Índice do repositório','O GitHub informou que a listagem de arquivos foi truncada; ausências não podem ser confirmadas com segurança.','Execute novamente mais tarde ou confira o repositório diretamente.'));
   REQUIRED_FILES.forEach(path=>{const found=fileMap.has(path);health.push(item(found?'ok':tree.truncated?'unavailable':'error','Arquivo essencial: '+path,found?'Arquivo encontrado na branch '+branch+'.':tree.truncated?'O índice incompleto não permite confirmar a presença.':'Arquivo não localizado no repositório.',found?'Nenhuma ação necessária.':'Confira o caminho e restaure o arquivo antes de publicar.'));});
  }else{
   health.push(item('unavailable','Índice do repositório','Não foi possível consultar os arquivos do GitHub: '+settled[0].reason.message,'Verifique a conexão e tente novamente; o token do editor não é utilizado.'));
   REQUIRED_FILES.forEach(path=>health.push(item('unavailable','Arquivo essencial: '+path,'A presença não pôde ser confirmada sem o índice do repositório.','Tente novamente quando o GitHub estiver acessível.')));
  }
  if(settled[1].status==='fulfilled'){
   try{siteData=parse(settled[1].value,'site/content/site.json');health.push(item('ok','Leitura e sintaxe de site.json','O arquivo publicado foi lido e o JSON pôde ser interpretado.','Nenhuma ação necessária.'));validateSite(siteData).forEach(x=>health.push(x));}
   catch(error){health.push(item('error','Leitura e sintaxe de site.json',error.message,'Revise site/content/site.json; nenhum dado foi corrigido automaticamente.'));}
  }else health.push(item('error','Leitura de site.json','Não foi possível carregar site/content/site.json: '+settled[1].reason.message,'Verifique o arquivo e a disponibilidade do site publicado.'));
  if(settled[2].status==='fulfilled'){
   try{rulesData=parse(settled[2].value,'site/rules.json');health.push(item('ok','Leitura e sintaxe de rules.json','O arquivo publicado foi lido e o JSON pôde ser interpretado.','Nenhuma ação necessária.'));validateRules(rulesData).forEach(x=>health.push(x));}
   catch(error){health.push(item('error','Leitura e sintaxe de rules.json',error.message,'Revise site/rules.json; nenhum dado foi corrigido automaticamente.'));}
  }else health.push(item('error','Leitura de rules.json','Não foi possível carregar site/rules.json: '+settled[2].reason.message,'Verifique o arquivo e a disponibilidade do site publicado.'));
  const first=fileMap.get('site/rules.json'),second=fileMap.get('site/content/rules.json');
  if(first&&second&&first.sha===second.sha)health.push(item('ok','Sincronização das cópias de rules.json','As duas cópias possuem o mesmo SHA na branch '+branch+'.','Nenhuma ação necessária.'));
  else if(rulesData){
   try{const duplicate=parse(await textFile('./content/rules.json'),'site/content/rules.json');health.push(sameJson(rulesData,duplicate)?item('attention','Sincronização das cópias de rules.json','Os arquivos não são idênticos byte a byte, mas representam o mesmo conteúdo JSON.','Mantenha as cópias sincronizadas.'):item('error','Sincronização das cópias de rules.json','As duas cópias possuem conteúdos diferentes.','Não publique até sincronizar as duas cópias.'));}
   catch(error){health.push(item('unavailable','Sincronização das cópias de rules.json','Não foi possível comparar as cópias: '+error.message,'Tente novamente quando os arquivos estiverem acessíveis.'));}
  }else health.push(item('unavailable','Sincronização das cópias de rules.json','Não foi possível confirmar a igualdade das cópias.','Verifique o índice do repositório e tente novamente.'));

  const refs=collect(siteData,rulesData),referenceMap=new Map(),used=new Set();
  refs.forEach(ref=>{
   const raw=ref.value;
   if(/^data:image\//i.test(raw)){media.push(item('ok',ref.label,'Imagem incorporada diretamente no conteúdo.','Nenhuma ação necessária.'));return;}
   if(/^https?:\/\//i.test(raw)){let host='servidor externo';try{host=new URL(raw).hostname;}catch{}media.push(item('attention',ref.label,'Referência externa ('+host+'); servidores de terceiros não são acessados.','Confirme se o endereço continua válido e prefira HTTPS.'));return;}
   if(/^(javascript:|data:text\/html)/i.test(raw)){media.push(item('error',ref.label,'A referência usa um protocolo não permitido para imagens.','Substitua por um caminho local ou endereço HTTPS confiável.'));return;}
   const path=assetPath(raw);if(!path)return;used.add(path);
   if(!referenceMap.has(path))referenceMap.set(path,{labels:[],value:raw});
   referenceMap.get(path).labels.push(ref.label);
  });
  if(tree){
   referenceMap.forEach((info,path)=>{
    const found=fileMap.has(path);
    media.push(item(found?'ok':tree.truncated?'unavailable':'error',info.labels.join(' / '),found?path+' foi encontrado no repositório.':tree.truncated?'O índice incompleto não permite confirmar '+path+'.':path+' não existe no repositório.','Se estiver ausente, corrija a referência ou restaure o arquivo; nada será alterado automaticamente.'));
   });
   THEME_PACKS.forEach(theme=>['background.svg','cursor.svg','hero.svg'].forEach(file=>{
    const path='site/assets/themes/'+theme+'/'+file,found=fileMap.has(path);
    media.push(item(found?'ok':tree.truncated?'unavailable':'error','Pacote de tema: '+theme+' / '+file,found?'Recurso temático encontrado.':tree.truncated?'Não foi possível confirmar no índice incompleto.':'Recurso esperado não encontrado.','Confira o pacote do tema; nenhum arquivo será recriado automaticamente.'));
   }));
   DEFAULT_ASSETS.forEach(path=>{
    const found=fileMap.has(path);
    media.push(item(found?'ok':tree.truncated?'unavailable':'error','Recurso padrão: '+path.split('/').pop(),found?'Recurso padrão encontrado.':tree.truncated?'Não foi possível confirmar no índice incompleto.':'Recurso padrão ausente.','Confira o arquivo antes de usar os recursos padrão.'));
   });
   const uploads=Array.from(fileMap.keys()).filter(path=>path.startsWith('site/assets/uploads/')),unused=uploads.filter(path=>!used.has(path));
   media.push(unused.length?item('attention','Possíveis uploads sem referência',unused.length+' arquivo(s) não aparecem nas referências verificadas: '+unused.slice(0,8).map(p=>p.split('/').pop()).join(', ')+(unused.length>8?' e outros.':'.'),'Confira manualmente antes de decidir se ainda são necessários. Nenhum arquivo foi removido.'):item('ok','Uploads sem referência','Todos os '+uploads.length+' arquivos da pasta uploads aparecem nas referências verificadas.','Nenhuma ação necessária.'));
  }else{
   referenceMap.forEach((info,path)=>media.push(item('unavailable',info.labels.join(' / '),'Não foi possível confirmar '+path+' sem o índice do repositório.','Tente novamente quando o GitHub estiver acessível.')));
   media.push(item('unavailable','Pacotes dos temas oficiais','A lista de arquivos do repositório não ficou disponível.','Tente novamente para verificar os seis pacotes visuais.'));
   media.push(item('unavailable','Recursos padrão do site','A lista de arquivos do repositório não ficou disponível.','Tente novamente para verificar os recursos padrão.'));
  }
  const live=Array.from(referenceMap.entries()).filter(([path])=>fileMap.has(path));
  await Promise.all(live.map(async([path,info])=>{
   const row=media.find(x=>x.title===info.labels.join(' / '));if(!row)return;
   try{
    const response=await fetch(new URL(info.value,document.baseURI).toString(),{method:'HEAD',cache:'no-store'});
    if(response.ok)row.detail=path+' existe no repositório e responde HTTP '+response.status+' no site publicado.';
    else if(response.status===404){row.status='error';row.detail=path+' existe no repositório, mas o endereço publicado respondeu HTTP 404.';row.recommendation='Confira a implantação e o caminho da imagem.';}
    else{row.status='attention';row.detail=path+' existe no repositório, mas a verificação HTTP respondeu '+response.status+'.';row.recommendation='Confirme o carregamento no navegador; o servidor pode limitar requisições HEAD.';}
   }catch(error){row.status='attention';row.detail=path+' existe no repositório, mas o carregamento não pôde ser confirmado: '+error.message;row.recommendation='Abra a imagem no site; a falha pode ser uma limitação do navegador.';}
  }));
  renderList('diagnosticHealthResults',health);renderList('diagnosticMediaResults',media);
  badge('diagnosticHealthStatus',health);badge('diagnosticMediaStatus',media);
  summary(health,media,new Date().toLocaleString('pt-BR'));
  if(runButton){runButton.disabled=false;runButton.textContent='↻ EXECUTAR NOVAMENTE';}
  running=false;toast('Diagnóstico local concluído. Nenhum dado foi alterado.','ok');
  return {health:health,media:media,report:lastReport};
 }
 function bind(){
  const runButton=el('runLocalDiagnosticsBtn'),copyButton=el('copyDiagnosticsReportBtn');
  if(runButton&&runButton.dataset.bound!=='1'){runButton.dataset.bound='1';runButton.addEventListener('click',run);}
  if(copyButton&&copyButton.dataset.bound!=='1'){copyButton.dataset.bound='1';copyButton.addEventListener('click',copyReport);}
 }
 return {bind:bind,run:run,copyReport:copyReport};
}
return {create:create};
})();