/* Sin City C7.8 — Biblioteca local de visuais, independente dos 7 presets. */
'use strict';
window.SinCitySavedThemes=(function(){
 const KEY='sin-city-saved-visual-themes-v1';
 const PREVIOUS_KEY='sin-city-saved-visual-before-v1';
 const MAX=12;
 const LAYOUT_KEYS=['show_hero_image','clean_mode','halloween_mode','natal_mode','pascoa_mode','carnaval_mode','namorados_mode','lgbtqia_mode'];
 const COLOR=/^(#[0-9a-f]{6}|)$/i;
 const NAME_LIMIT=60;
 const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const normName=v=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().replace(/\s+/g,' ').slice(0,NAME_LIMIT):'';
 const number=(v,min,max,def)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.round(Number(v)))):def;
 const color=(v,def='')=>typeof v==='string'&&COLOR.test(v)?v:def;
 const url=v=>typeof v==='string'&&v.length<=1024&&(!v||/^(https:\/\/[^\s"<>]+|\.\/assets\/[a-z0-9\/_-]+\.(png|jpe?g|webp|gif|svg))$/i.test(v))?v:null;
 const id=()=> 'visual-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);

 function normalizeVisual(v){
  if(!isObject(v)||!isObject(v.theme)||!isObject(v.layout)||!isObject(v.cursor))return null;
  const theme={};
  for(const [k,val] of Object.entries(v.theme)){
   if(/^[a-z][a-z0-9_]{0,49}$/.test(k)&&typeof val==='string'&&COLOR.test(val))theme[k]=val;
  }
  if(!Object.keys(theme).length)return null;
  const hero=url(v.hero_image),background=url(v.background_image),image=url(v.cursor.image);
  if(hero===null||background===null||image===null)return null;
  const layout={};
  for(const k of LAYOUT_KEYS)layout[k]=typeof v.layout[k]==='boolean'?v.layout[k]:(k==='show_hero_image');
  const particles=isObject(v.cursor.falling_particles)?v.cursor.falling_particles:{};
  const cursor={
   enabled:v.cursor.enabled===true,
   trail_enabled:v.cursor.trail_enabled===true,
   size:number(v.cursor.size,24,64,38),
   image,
   trail_type:typeof v.cursor.trail_type==='string'?v.cursor.trail_type.slice(0,24):'glow',
   trail_color:color(v.cursor.trail_color,'#2D1243'),
   glow_color:color(v.cursor.glow_color,''),
   trail_count:number(v.cursor.trail_count,0,30,16),
   falling_particles:{
    enabled:particles.enabled===true,
    type:['letters','logo','mixed','spark'].includes(particles.type)?particles.type:'mixed',
    color:color(particles.color,'#AF7AFF'),
    count:number(particles.count,0,30,9),
    size:number(particles.size,1,50,12)
   }
  };
  return {theme,layout,hero_image:hero,background_image:background,cursor};
 }
 function read(){
  const raw=localStorage.getItem(KEY);
  if(!raw)return [];
  let parsed;
  try{parsed=JSON.parse(raw);}catch{throw new Error('Biblioteca local inválida. Faça uma cópia antes de corrigir os dados do navegador.');}
  if(!isObject(parsed)||parsed.version!==1||!Array.isArray(parsed.items)||parsed.items.length>MAX)throw new Error('A biblioteca local não pôde ser lida com segurança.');
  return parsed.items.map(item=>{
   const visual=normalizeVisual(item&&item.visual);
   const name=normName(item&&item.name);
   if(!name||!visual||typeof item.id!=='string'||!/^visual-[a-z0-9-]{4,80}$/.test(item.id))throw new Error('Há um tema salvo inválido. Nenhum dado foi sobrescrito.');
   return {id:item.id,name,updatedAt:typeof item.updatedAt==='string'?item.updatedAt:'',visual};
  });
 }
 function write(items){localStorage.setItem(KEY,JSON.stringify({version:1,items}));}
 function swatches(theme){
  return ['accent','accent_light','background','surface','text'].map(k=>
   '<span class="saved-theme-swatch" title="'+k+'" style="background:'+(color(theme[k],'#777777')||'#777777')+'"></span>'
  ).join('');
 }
 function create(host){
  function listMarkup(){
   let entries;
   try{entries=read();}catch(err){return '<p class="saved-theme-warning" role="alert">'+host.esc(err.message)+'</p>';}
   if(!entries.length)return '<p class="saved-theme-empty">Nenhum visual salvo ainda. Personalize sua cidade e use o botão acima para guardar sua primeira versão.</p>';
   return entries.map(item=>
    '<div class="saved-theme-entry" data-saved-id="'+item.id+'">'+
     '<div class="saved-theme-entry-head"><strong>'+host.esc(item.name)+'</strong><div class="saved-theme-swatches" aria-label="Paleta salva">'+swatches(item.visual.theme)+'</div></div>'+
     '<p class="saved-theme-date">'+(item.updatedAt?'Salvo em '+host.esc(new Date(item.updatedAt).toLocaleDateString('pt-BR')):'Visual personalizado')+'</p>'+
     '<div class="saved-theme-actions">'+
      '<button class="btn mini" type="button" data-saved-action="apply" data-saved-id="'+item.id+'">👁️ Aplicar na prévia</button>'+
      '<button class="btn mini" type="button" data-saved-action="update" data-saved-id="'+item.id+'">↻ Atualizar</button>'+
      '<button class="btn mini" type="button" data-saved-action="rename" data-saved-id="'+item.id+'">✎ Renomear</button>'+
      '<button class="btn mini danger" type="button" data-saved-action="delete" data-saved-id="'+item.id+'">Excluir</button>'+
     '</div></div>'
   ).join('');
  }
  function countLabel(){
   try{return read().length+' de '+MAX+' visuais salvos';}catch{return 'Erro ao ler visuais salvos';}
  }
  function managerMarkup(){
   return '<section class="saved-theme-manager" id="savedThemeManager" aria-label="Meus temas salvos">'+
    '<div class="saved-theme-heading"><div><strong>💾 Meus Temas Salvos</strong><p>Guarde suas versões favoritas antes de experimentar outros temas.</p></div><span id="savedThemeCount">'+countLabel()+'</span></div>'+
    '<label class="saved-theme-label" for="savedThemeNewName">Nome do visual</label>'+
    '<div class="saved-theme-create"><input id="savedThemeNewName" maxlength="60" autocomplete="off" placeholder="Ex.: Minha cidade — versão oficial"><button class="btn saved-theme-save-btn" id="saveCurrentVisualBtn" type="button">💾 SALVAR VISUAL ATUAL</button></div>'+
    '<p class="saved-theme-note">Salva cores, banner, fundo, cursor, efeitos e estilos de tema — sem alterar textos, regras, logo ou favicon. As versões ficam neste navegador; exporte um backup para guardar fora dele.</p>'+
    '<div id="savedThemeList" class="saved-theme-list">'+listMarkup()+'</div>'+
    '<div class="saved-theme-tools"><button class="btn mini" id="exportSavedThemesBtn" type="button">↓ Exportar meus temas (.json)</button>'+
    '<button class="btn mini" id="importSavedThemesBtn" type="button">↑ Importar temas (.json)</button>'+
    '<input id="importSavedThemesFile" type="file" accept=".json,application/json" hidden></div>'+
    '</section>';
  }
  function refresh(){
   const list=document.getElementById('savedThemeList');
   if(list)list.innerHTML=listMarkup();
   const count=document.getElementById('savedThemeCount');
   if(count)count.textContent=countLabel();
  }
  function safeCapture(){
   if(!host.canSwitch()){host.toast('Existem imagens locais pendentes. Publique-as pelo editor ou remova-as antes de guardar ou trocar de visual.','error');return null;}
   const visual=normalizeVisual(host.capture());
   if(!visual){host.toast('Alguma imagem usa um endereço não portátil. Use HTTPS ou ./assets/ e tente novamente.','error');return null;}
   return visual;
  }
  function save(){
   const nameInput=document.getElementById('savedThemeNewName');
   const name=normName(nameInput&&nameInput.value);
   if(!name){host.toast('Digite um nome para o visual antes de salvar.','error');if(nameInput)nameInput.focus();return;}
   const visual=safeCapture();if(!visual)return;
   try{
    const items=read();
    if(items.length>=MAX){host.toast('Limite de '+MAX+' visuais. Exporte ou remova um para salvar outro.','error');return;}
    if(items.some(t=>t.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){host.toast('Este nome já existe. Use Atualizar para substituir a versão existente.','error');return;}
    items.unshift({id:id(),name,updatedAt:new Date().toISOString(),visual});
    write(items);
    nameInput.value='';
    refresh();
    host.toast('Visual "'+name+'" salvo neste navegador!','ok');
   }catch(err){host.toast('Não foi possível salvar: '+err.message,'error');}
  }
  function action(type,key){
   try{
    const items=read(),i=items.findIndex(item=>item.id===key);
    if(i<0){host.toast('Visual não encontrado.','error');return;}
    const item=items[i];
    if(type==='apply'){
     if(!host.canSwitch()){host.toast('Resolva os uploads locais pendentes antes de trocar o visual.','error');return;}
     if(!confirm('Aplicar "'+item.name+'"? Isso substitui apenas a aparência atual. Salve antes alterações visuais que quiser guardar.'))return;
     if(!host.apply(item.visual))return;
     host.toast('Visual "'+item.name+'" aplicado somente na prévia.','ok');
    }else if(type==='update'){
     const visual=safeCapture();if(!visual)return;
     if(!confirm('Substituir o visual salvo em "'+item.name+'" pela aparência atual?'))return;
     item.visual=visual;item.updatedAt=new Date().toISOString();write(items);refresh();
     host.toast('Visual salvo atualizado.','ok');
    }else if(type==='rename'){
     const name=normName(prompt('Novo nome do visual:',item.name));
     if(!name)return;
     if(items.some((t,j)=>i!==j&&t.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){host.toast('Já existe outro visual com esse nome.','error');return;}
     item.name=name;write(items);refresh();host.toast('Visual renomeado.','ok');
    }else if(type==='delete'){
     if(!confirm('Excluir "'+item.name+'"? Essa ação remove a versão salva deste navegador.'))return;
     items.splice(i,1);write(items);refresh();host.toast('Tema personalizado excluído.','ok');
    }
   }catch(err){host.toast('Operação não concluída: '+err.message,'error');}
  }
  function exportAll(){
   try{
    const items=read();
    if(!items.length){host.toast('Não há visuais para exportar.','error');return;}
    const payload={kind:'sin-city-saved-visual-themes',version:1,exportedAt:new Date().toISOString(),items};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const u=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=u;a.download='sin-city-meus-temas-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),1200);
    host.toast('Backup de visuais exportado!','ok');
   }catch(err){host.toast('Falha ao exportar: '+err.message,'error');}
  }
  async function importAll(file){
   if(!file)return;
   if(file.size>1024*1024){host.toast('O arquivo JSON ultrapassa 1 MB.','error');return;}
   try{
    const parsed=JSON.parse(await file.text());
    if(!isObject(parsed)||parsed.kind!=='sin-city-saved-visual-themes'||parsed.version!==1||!Array.isArray(parsed.items)||!parsed.items.length||parsed.items.length>MAX)throw new Error('Arquivo de temas incompatível.');
    const valid=parsed.items.map(item=>{
     const name=normName(item&&item.name),visual=normalizeVisual(item&&item.visual);
     if(!name||!visual)throw new Error('O arquivo contém um visual inválido.');
     return {name,visual};
    });
    const items=read();let added=0;
    for(const entry of valid){
     if(items.length>=MAX)break;
     let name=entry.name,number=2;
     while(items.some(t=>t.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){
      const suffix=' ('+number++ +')';
      name=entry.name.slice(0,NAME_LIMIT-suffix.length)+suffix;
     }
     items.unshift({id:id(),name,updatedAt:new Date().toISOString(),visual:entry.visual});added++;
    }
    if(!added){host.toast('A biblioteca já está cheia. Exporte ou exclua versões antes de importar.','error');return;}
    write(items);refresh();
    host.toast(added+' visual(is) importado(s) neste navegador.','ok');
   }catch(err){host.toast('Não foi possível importar: '+err.message,'error');}
  }
  function bind(){
   const container=document.getElementById('savedThemeManager');
   if(!container||container.dataset.bound==='1')return;
   container.dataset.bound='1';
   document.getElementById('saveCurrentVisualBtn').addEventListener('click',save);
   document.getElementById('savedThemeNewName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();save();}});
   container.addEventListener('click',e=>{
    const button=e.target.closest('[data-saved-action]');
    if(button&&container.contains(button))action(button.dataset.savedAction,button.dataset.savedId);
   });
   document.getElementById('exportSavedThemesBtn').addEventListener('click',exportAll);
   const file=document.getElementById('importSavedThemesFile');
   document.getElementById('importSavedThemesBtn').addEventListener('click',()=>file.click());
   file.addEventListener('change',async()=>{const f=file.files&&file.files[0];await importAll(f);file.value='';});
  }
  return {managerMarkup,bind,refresh};
 }
 return {create,normalizeVisual,LAYOUT_KEYS};
})();
