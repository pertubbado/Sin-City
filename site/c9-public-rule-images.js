/* C9.0.13 — galeria pública de imagens vinculadas às regras. */
'use strict';

(() => {
  const MAX_RULE_IMAGES = 3;
  let latestData = null;
  let decorateFrame = 0;

  const slugify = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'item';
  const categoryId = (category, index) => String(category?.id || slugify(category?.short || category?.name) || `categoria-${index + 1}`);
  const ruleDomId = (categoryIdValue, si, ri, rule) => `rule-${slugify(categoryIdValue)}-${si}-${ri}-${slugify(rule?.code || rule?.title)}`;

  function installStyles() {
    if (document.getElementById('c9PublicRuleImagesStyles')) return;
    const style = document.createElement('style');
    style.id = 'c9PublicRuleImagesStyles';
    style.textContent = `
      .rule-image-gallery{display:grid;gap:12px;margin-top:18px}
      .rule-image-gallery[data-count="1"]{grid-template-columns:minmax(0,1fr)}
      .rule-image-gallery[data-count="2"]{grid-template-columns:repeat(2,minmax(0,1fr))}
      .rule-image-gallery[data-count="3"]{grid-template-columns:repeat(3,minmax(0,1fr))}
      .rule-image-figure{margin:0;min-width:0;overflow:hidden;border:1px solid color-mix(in srgb,var(--custom-edge-color,var(--accent-light)) 42%,transparent);border-radius:14px;background:color-mix(in srgb,var(--surface) 86%,#000);box-shadow:0 10px 28px #0002}
      .rule-image-figure img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#09090b;cursor:zoom-in}
      .rule-image-gallery[data-count="1"] .rule-image-figure img{max-height:560px}
      .rule-image-lightbox[hidden]{display:none!important}
      .rule-image-lightbox{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;background:rgba(0,0,0,.88);backdrop-filter:blur(8px)}
      .rule-image-lightbox img{display:block;max-width:min(1400px,94vw);max-height:88vh;object-fit:contain;border-radius:14px;box-shadow:0 25px 90px #000}
      .rule-image-lightbox button{position:absolute;top:18px;right:18px;width:42px;height:42px;border:1px solid #ffffff55;border-radius:50%;background:#111c;color:#fff;font-size:28px;line-height:1;cursor:pointer}
      @media(max-width:760px){.rule-image-gallery[data-count="2"],.rule-image-gallery[data-count="3"]{grid-template-columns:1fr}.rule-image-gallery{gap:9px}.rule-image-figure img{aspect-ratio:auto;max-height:70vh}}
    `;
    document.head.appendChild(style);
  }

  function safeImageSrc(value) {
    const src = String(value || '').trim();
    if (!src) return '';
    if (/^blob:/i.test(src)) return src;
    if (/^data:image\/(png|jpeg|webp);base64,/i.test(src)) return src;
    if (/^https:\/\/[^\s"<>]+$/i.test(src)) return src;
    if (/^\.?\/?assets\/[a-z0-9\/_-]+\.(png|jpe?g|webp|gif|svg)$/i.test(src)) return src.replace(/^\//, './');
    return '';
  }

  function imagesForRule(rule) {
    let images = Array.isArray(rule?.images) ? rule.images.slice() : [];
    if (!images.length && typeof rule?.image === 'string' && rule.image.trim()) images = [rule.image.trim()];
    return images.map(safeImageSrc).filter(Boolean).slice(0, MAX_RULE_IMAGES);
  }

  function buildRuleMap(data) {
    const map = new Map();
    (data?.categories || []).forEach((category, ci) => {
      const catId = categoryId(category, ci);
      (category.subcategories || []).forEach((sub, si) => {
        (sub.rules || []).forEach((rule, ri) => map.set(ruleDomId(catId, si, ri, rule), rule));
      });
      (category.rules || []).forEach((rule, ri) => map.set(ruleDomId(catId, 'direct', ri, rule), rule));
    });
    return map;
  }

  function galleryMarkup(images, rule) {
    if (!images.length) return '';
    const title = String(rule?.title || 'Regra');
    return `<div class="rule-image-gallery" data-count="${images.length}" aria-label="Imagens da regra ${escapeHtml(title)}">${images.map((src, index) => `<figure class="rule-image-figure"><img src="${escapeHtml(src)}" alt="Imagem ${index + 1} da regra ${escapeHtml(title)}" loading="lazy" data-rule-lightbox-src="${escapeHtml(src)}"></figure>`).join('')}</div>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function decorate(data = latestData) {
    if (!data) return;
    latestData = data;
    const map = buildRuleMap(data);
    document.querySelectorAll('.rule-card[id]').forEach(card => {
      card.querySelector(':scope > .rule-image-gallery')?.remove();
      const rule = map.get(card.id);
      if (!rule) return;
      const images = imagesForRule(rule);
      if (!images.length) return;
      card.insertAdjacentHTML('beforeend', galleryMarkup(images, rule));
    });
    bindLightboxTriggers();
  }

  function scheduleDecorate(data = latestData) {
    if (data) latestData = data;
    cancelAnimationFrame(decorateFrame);
    decorateFrame = requestAnimationFrame(() => decorate(latestData));
  }

  function ensureLightbox() {
    let box = document.getElementById('ruleImageLightbox');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'ruleImageLightbox';
    box.className = 'rule-image-lightbox';
    box.hidden = true;
    box.innerHTML = '<button type="button" aria-label="Fechar imagem">×</button><img alt="Imagem ampliada da regra">';
    document.body.appendChild(box);
    const close = () => { box.hidden = true; box.querySelector('img').removeAttribute('src'); document.body.style.overflow = ''; };
    box.querySelector('button').onclick = close;
    box.addEventListener('click', event => { if (event.target === box) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !box.hidden) close(); });
    return box;
  }

  function bindLightboxTriggers() {
    const box = ensureLightbox();
    document.querySelectorAll('[data-rule-lightbox-src]').forEach(image => {
      image.onclick = () => {
        const src = safeImageSrc(image.dataset.ruleLightboxSrc);
        if (!src) return;
        const target = box.querySelector('img');
        target.src = src;
        target.alt = image.alt || 'Imagem ampliada da regra';
        box.hidden = false;
        document.body.style.overflow = 'hidden';
      };
    });
  }

  async function loadPublishedData() {
    try {
      const response = await fetch(`./rules.json?v=${Date.now()}`, {cache:'no-store'});
      if (!response.ok) return;
      const loaded = await response.json();
      latestData = loaded;
      scheduleDecorate(loaded);
    } catch (error) {
      console.warn('[Sin City] C9.0.13: não foi possível carregar as imagens das regras.', error);
    }
  }

  function install() {
    installStyles();
    ensureLightbox();
    loadPublishedData();

    const observer = new MutationObserver(mutations => {
      if (mutations.some(mutation => [...mutation.addedNodes].some(node => node.nodeType === 1 && (node.matches?.('.rule-card') || node.querySelector?.('.rule-card'))))) {
        scheduleDecorate();
      }
    });
    observer.observe(document.getElementById('ruleList') || document.body, {childList:true,subtree:true});

    window.addEventListener('message', event => {
      if (event.origin !== location.origin) return;
      if (event.data?.type !== 'sin-city-preview' || !event.data.data) return;
      scheduleDecorate(event.data.data);
    });

    console.info('[Sin City] C9.0.13 ativa: galerias de imagens por regra.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
