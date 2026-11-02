/* C9.0.13 + C10.0.6 — upload/galeria de imagens por regra e ponte segura de rebind. */
'use strict';

(() => {
  const MAX_RULE_IMAGES = 3;
  const MAX_RULE_IMAGE_BYTES = 3 * 1024 * 1024;
  const RECOMMENDED_WIDTH = 1600;
  const RECOMMENDED_HEIGHT = 900;
  const pendingRuleImageUploads = new Map();

  function installStyles() {
    if (document.getElementById('c9RuleImagesStyles')) return;
    const style = document.createElement('style');
    style.id = 'c9RuleImagesStyles';
    style.textContent = `
      .rule-image-manager{margin:12px 0 2px;padding:12px;border:1px solid #343840;border-radius:10px;background:#111317}
      .rule-image-manager-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
      .rule-image-manager-head strong{font-size:11px;letter-spacing:.05em;text-transform:uppercase}
      .rule-image-manager-head span{font-size:10px;color:#9da3ab;white-space:nowrap}
      .rule-image-help{margin:0 0 10px;color:#aeb4bc;font-size:10px;line-height:1.55}
      .rule-image-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0}
      .rule-image-card{position:relative;min-width:0;border:1px solid #363b43;border-radius:9px;overflow:hidden;background:#090a0c}
      .rule-image-card img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#08090b}
      .rule-image-card-footer{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px 7px}
      .rule-image-card-footer span{font-size:9px;color:#aeb4bc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .rule-image-empty{padding:12px;border:1px dashed #3b414a;border-radius:8px;color:#8f969f;font-size:10px;text-align:center}
      .rule-image-add{width:100%;margin-top:8px;border-style:dashed!important;font-weight:800}
      .rule-image-add:disabled{opacity:.48;cursor:not-allowed}
      .rule-image-file{display:none!important}
      @media(max-width:720px){.rule-image-grid{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function isPublishedImage(value) {
    return /^(https:\/\/[^\s"<>]+|\.?\/?assets\/[a-z0-9\/_-]+\.(png|jpe?g|webp|gif|svg))$/i.test(String(value || '').trim());
  }

  function normalizeRuleImages(rule) {
    if (!rule || typeof rule !== 'object') return [];
    let images = Array.isArray(rule.images) ? rule.images.slice() : [];
    if (!images.length && typeof rule.image === 'string' && rule.image.trim()) images = [rule.image.trim()];
    images = images
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .filter(value => isPublishedImage(value) || pendingRuleImageUploads.has(value))
      .slice(0, MAX_RULE_IMAGES);
    rule.images = images;
    rule.image = images[0] || '';
    return images;
  }

  function allRules(root = data) {
    const rules = [];
    (root?.categories || []).forEach((category, ci) => {
      (category.rules || []).forEach((rule, ri) => rules.push({rule, key:`D:${ci}:${ri}`}));
      (category.subcategories || []).forEach((sub, si) => {
        (sub.rules || []).forEach((rule, ri) => rules.push({rule, key:`S:${ci}:${si}:${ri}`}));
      });
    });
    return rules;
  }

  function ruleByKey(key, root = data) {
    const parts = String(key || '').split(':');
    if (parts[0] === 'D' && parts.length === 3) return root?.categories?.[+parts[1]]?.rules?.[+parts[2]] || null;
    if (parts[0] === 'S' && parts.length === 4) return root?.categories?.[+parts[1]]?.subcategories?.[+parts[2]]?.rules?.[+parts[3]] || null;
    return null;
  }

  function keyFromAttrs(attrs) {
    let match = String(attrs || '').match(/data-sub-rule="([^"]+)"/);
    if (match) return `S:${match[1]}`;
    match = String(attrs || '').match(/data-rule="([^"]+)"/);
    if (match) return `D:${match[1]}`;
    return '';
  }

  function shortImageLabel(value, index) {
    const pending = pendingRuleImageUploads.get(value);
    if (pending?.name) return pending.name;
    const clean = String(value || '').split('?')[0].split('#')[0];
    const last = clean.split('/').pop();
    return last || `Imagem ${index + 1}`;
  }

  function ruleImagesMarkup(rule, key) {
    const images = normalizeRuleImages(rule);
    const count = images.length;
    const cards = images.map((src, index) => `
      <div class="rule-image-card">
        <img src="${esc(src)}" alt="Prévia da imagem ${index + 1} da regra">
        <div class="rule-image-card-footer">
          <span title="${esc(shortImageLabel(src, index))}">${esc(shortImageLabel(src, index))}</span>
          <button class="btn mini danger" type="button" data-rule-image-remove="${esc(key)}:${index}">Remover</button>
        </div>
      </div>`).join('');
    return `<div class="rule-image-manager" data-rule-images-box="${esc(key)}">
      <div class="rule-image-manager-head"><strong>🖼️ Imagens da regra</strong><span>${count} / ${MAX_RULE_IMAGES}</span></div>
      <p class="rule-image-help">PNG, JPG/JPEG ou WebP · até 3 MB por imagem · máximo de 3 imagens. Tamanho recomendado: ${RECOMMENDED_WIDTH} × ${RECOMMENDED_HEIGHT} px (16:9). Outras dimensões são aceitas e ajustadas sem bloquear a publicação.</p>
      ${count ? `<div class="rule-image-grid">${cards}</div>` : '<div class="rule-image-empty">Nenhuma imagem adicionada nesta regra.</div>'}
      <input class="rule-image-file" type="file" multiple accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" data-rule-image-file="${esc(key)}">
      <button class="btn rule-image-add" type="button" data-rule-image-add="${esc(key)}" ${count >= MAX_RULE_IMAGES ? 'disabled' : ''}>${count >= MAX_RULE_IMAGES ? 'Limite de 3 imagens atingido' : '+ ADICIONAR IMAGEM'}</button>
    </div>`;
  }

  function refreshRuleImageBox(key) {
    const rule = ruleByKey(key);
    const current = document.querySelector(`[data-rule-images-box="${CSS.escape(key)}"]`);
    if (!rule || !current) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = ruleImagesMarkup(rule, key).trim();
    current.replaceWith(wrap.firstElementChild);
    bindRuleImageControls();
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
      reader.readAsDataURL(file);
    });
  }

  async function prepareRuleImage(file) {
    const extension = ({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'})[file.type];
    if (!extension) throw new Error('Formato não aceito. Use PNG, JPG/JPEG ou WebP.');
    if (!file.size || file.size > MAX_RULE_IMAGE_BYTES) throw new Error('Cada imagem deve ter no máximo 3 MB.');
    const dataUrl = await readFileAsDataURL(file);
    const dimensions = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({width:img.naturalWidth,height:img.naturalHeight});
      img.onerror = () => reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      img.src = dataUrl;
    });
    const objectUrl = URL.createObjectURL(file);
    return {objectUrl,base64:dataUrl.split(',')[1],extension,name:file.name || `imagem.${extension}`,dimensions};
  }

  async function addRuleImages(key, input) {
    const rule = ruleByKey(key);
    if (!rule) return;
    const images = normalizeRuleImages(rule);
    const remaining = MAX_RULE_IMAGES - images.length;
    if (remaining <= 0) { toast('Esta regra já atingiu o limite de 3 imagens.','error'); return; }
    const selected = [...(input.files || [])];
    if (!selected.length) return;
    if (selected.length > remaining) toast(`Somente ${remaining} imagem(ns) serão adicionadas para respeitar o limite de 3.`);
    let added = 0;
    for (const file of selected.slice(0, remaining)) {
      try {
        const item = await prepareRuleImage(file);
        pendingRuleImageUploads.set(item.objectUrl, item);
        images.push(item.objectUrl);
        added++;
      } catch (error) { toast(error.message || 'Não foi possível adicionar uma das imagens.','error'); }
    }
    rule.images = images.slice(0, MAX_RULE_IMAGES);
    rule.image = rule.images[0] || '';
    input.value = '';
    refreshRuleImageBox(key);
    sendPreview();
    if (added) toast(`${added} imagem(ns) adicionada(s) à regra. Publique para enviar ao GitHub.`,'ok');
  }

  function removeRuleImage(key, index) {
    const rule = ruleByKey(key);
    if (!rule) return;
    const images = normalizeRuleImages(rule);
    const [removed] = images.splice(index, 1);
    if (removed && pendingRuleImageUploads.has(removed)) {
      try { URL.revokeObjectURL(removed); } catch {}
      pendingRuleImageUploads.delete(removed);
    }
    rule.images = images;
    rule.image = images[0] || '';
    refreshRuleImageBox(key);
    sendPreview();
  }

  function bindRuleImageControls() {
    document.querySelectorAll('[data-rule-image-add]').forEach(button => {
      button.onclick = () => document.querySelector(`[data-rule-image-file="${CSS.escape(button.dataset.ruleImageAdd)}"]`)?.click();
    });
    document.querySelectorAll('[data-rule-image-file]').forEach(input => { input.onchange = () => addRuleImages(input.dataset.ruleImageFile, input); });
    document.querySelectorAll('[data-rule-image-remove]').forEach(button => {
      button.onclick = () => {
        const raw = button.dataset.ruleImageRemove || '';
        const index = Number(raw.split(':').pop());
        const key = raw.split(':').slice(0, -1).join(':');
        if (Number.isInteger(index)) removeRuleImage(key, index);
      };
    });
  }

  function cleanRulesForStorage(source = data) {
    const copy = structuredClone(source);
    allRules(copy).forEach(({rule}) => {
      let images = Array.isArray(rule.images) ? rule.images : (rule.image ? [rule.image] : []);
      images = images.filter(value => isPublishedImage(value)).slice(0, MAX_RULE_IMAGES);
      rule.images = images;
      rule.image = images[0] || '';
    });
    return copy;
  }

  function countPendingRuleImages() {
    const referenced = new Set();
    allRules().forEach(({rule}) => normalizeRuleImages(rule).forEach(value => { if (pendingRuleImageUploads.has(value)) referenced.add(value); }));
    return referenced.size;
  }

  function imageBindingSnapshot() {
    return allRules().map(({rule,key}) => ({key,rule,images:normalizeRuleImages(rule).slice()}));
  }

  function refreshBindings() {
    allRules().forEach(({rule}) => normalizeRuleImages(rule));
    bindRuleImageControls();
    return imageBindingSnapshot();
  }

  async function publishC9013() {
    if (!githubToken) { login(); toast('Entre com GitHub para publicar.'); return; }
    if (!confirm('Publicar as alterações e imagens no GitHub? Isso atualiza o site para todos os visitantes.')) return;
    const btn = $('#publishBtn');
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'PUBLICANDO...';
    try {
      const publishedSite = mergeSite(structuredClone(site));
      const publishedData = structuredClone(data);
      const entries = [];
      const stampId = Date.now().toString(36);

      for (const [path, item] of pendingImageUploads) {
        const key = Object.entries(IMAGE_SPECS).find(([, spec]) => spec.path === path)?.[0];
        if (!key || !item.base64) throw new Error('Arquivo de imagem do site pendente inválido. Selecione-o novamente.');
        const fileName = `${key}-${stampId}-${Math.random().toString(36).slice(2,9)}.${item.extension}`;
        const remotePath = `site/assets/uploads/${fileName}`;
        const blob = await gh(`/repos/${REPO}/git/blobs`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:item.base64,encoding:'base64'})});
        entries.push({path:remotePath,mode:'100644',type:'blob',sha:blob.sha});
        const parts = path.split('.');
        let target = publishedSite;
        for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]];
        target[parts.at(-1)] = `./assets/uploads/${fileName}`;
      }

      const pendingUsed = new Set();
      allRules(publishedData).forEach(({rule}) => {
        let images = Array.isArray(rule.images) ? rule.images.slice() : (rule.image ? [rule.image] : []);
        rule.images = images.slice(0, MAX_RULE_IMAGES);
      });

      for (const {rule} of allRules(publishedData)) {
        const finalImages = [];
        for (const value of rule.images || []) {
          const pending = pendingRuleImageUploads.get(value);
          if (!pending) { if (isPublishedImage(value)) finalImages.push(value); continue; }
          if (!pending.base64) throw new Error('Uma imagem da regra precisa ser selecionada novamente.');
          const fileName = `rule-${stampId}-${Math.random().toString(36).slice(2,10)}.${pending.extension}`;
          const remotePath = `site/assets/uploads/${fileName}`;
          const blob = await gh(`/repos/${REPO}/git/blobs`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:pending.base64,encoding:'base64'})});
          entries.push({path:remotePath,mode:'100644',type:'blob',sha:blob.sha});
          finalImages.push(`./assets/uploads/${fileName}`);
          pendingUsed.add(value);
        }
        rule.images = finalImages.slice(0, MAX_RULE_IMAGES);
        rule.image = rule.images[0] || '';
      }

      const siteText = JSON.stringify(publishedSite, null, 2) + '\n';
      const rulesText = JSON.stringify(publishedData, null, 2) + '\n';
      toast(`Preparando conteúdo e ${entries.length} imagem(ns) para publicação...`);
      const ref = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
      const parent = await gh(`/repos/${REPO}/git/commits/${ref.object.sha}`);
      const [siteBlob, rulesBlob, contentRulesBlob] = await Promise.all([createBlob(siteText), createBlob(rulesText), createBlob(rulesText)]);
      entries.unshift(
        {path:SITE_PATH,mode:'100644',type:'blob',sha:siteBlob.sha},
        {path:RULES_PATH,mode:'100644',type:'blob',sha:rulesBlob.sha},
        {path:CONTENT_RULES_PATH,mode:'100644',type:'blob',sha:contentRulesBlob.sha}
      );
      const tree = await gh(`/repos/${REPO}/git/trees`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_tree:parent.tree.sha,tree:entries})});
      const stamp = new Date().toLocaleString('pt-BR');
      const commit = await gh(`/repos/${REPO}/git/commits`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`Sin City Editor: atualizar imagens e conteúdo (${stamp})`,tree:tree.sha,parents:[ref.object.sha]})});
      await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({sha:commit.sha,force:false})});

      pendingUsed.forEach(value => { try { URL.revokeObjectURL(value); } catch {} });
      pendingRuleImageUploads.clear();
      pendingImageUploads.clear();
      site = publishedSite;
      data = publishedData;
      render();
      sendPreview();
      localStorage.removeItem('sin-city-editor-draft');
      toast('Publicado no GitHub! Conteúdo e imagens das regras foram enviados juntos.','ok');
    } catch (error) {
      console.error(error);
      let message = error.message || 'Erro ao publicar.';
      if (/403|Resource not accessible|permission|Forbidden/i.test(message)) message = 'A conta não tem permissão de escrita nesse repositório.';
      if (/409|422|fast.forward|reference update failed/i.test(message)) message += ' A branch mudou durante a publicação; recarregue os dados antes de tentar novamente.';
      toast(message,'error');
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  function install() {
    try {
      installStyles();
      const originalRuleEditor = ruleEditor;
      const originalBindEditor = bindEditor;

      ruleEditor = function(rule, attrs, delAttr) {
        if (!rule || typeof rule !== 'object') return originalRuleEditor(rule, attrs, delAttr);
        const key = keyFromAttrs(attrs);
        normalizeRuleImages(rule);
        return `<div class="rule"><div class="item-head"><strong>${esc(rule.code||'')} • ${esc(rule.title||'Sem título')}</strong><button class="btn mini danger" ${delAttr}>Excluir</button></div><div class="field-row"><div class="field"><label>Código</label><input ${attrs} data-k="code" value="${esc(rule.code||'')}"></div><div class="field"><label>Tag</label><input ${attrs} data-k="tag" value="${esc(rule.tag||'REGRA')}"></div></div><div class="field"><label>Título</label><input ${attrs} data-k="title" value="${esc(rule.title||'')}"></div><div class="field"><label>Texto da regra (Markdown permitido)</label><textarea ${attrs} data-k="text">${esc(rule.text||'')}</textarea></div>${ruleImagesMarkup(rule,key)}</div>`;
      };

      bindEditor = function() { originalBindEditor(); bindRuleImageControls(); };
      saveDraft = function() {
        const cleanData = cleanRulesForStorage();
        localStorage.setItem('sin-city-editor-draft', JSON.stringify({site:snapshotForStorage(),data:cleanData,savedAt:new Date().toISOString()}));
        const pending = pendingImageUploads.size + countPendingRuleImages();
        toast(pending ? 'Rascunho salvo. Imagens locais pendentes precisam ser selecionadas/publicadas antes de fechar o editor.' : 'Rascunho salvo somente neste navegador.','ok');
        updateDashboard();
      };
      backup = function() {
        const payload = {exportedAt:new Date().toISOString(),site:snapshotForStorage(),data:cleanRulesForStorage()};
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
        a.download = 'sin-city-editor-backup.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href),1500);
        toast('Backup baixado. Imagens locais ainda não publicadas não entram no arquivo.','ok');
      };

      publish = publishC9013;
      $('#publishBtn').onclick = publishC9013;
      $('#draftBtn').onclick = saveDraft;
      $('#backupBtn').onclick = backup;

      allRules().forEach(({rule}) => normalizeRuleImages(rule));
      window.SinCityRuleImages = {
        version:'C9.0.13+C10.0.6',
        refreshBindings,
        imageBindingSnapshot,
        pendingCount:countPendingRuleImages,
        ruleByKey,
        normalizeRuleImages
      };
      if ($('#panel-rules')) { renderRules(); bindEditor(); sendPreview(); }
      console.info('[Sin City Studio] C9.0.13 ativa: galeria de até 3 imagens por regra.');
    } catch (error) { console.error('[Sin City Studio] C9.0.13 não pôde ser inicializada:', error); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
