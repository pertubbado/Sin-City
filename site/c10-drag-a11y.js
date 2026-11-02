/* Sin City C10.0.7 — acessibilidade, feedback textual e fallback responsivo do drag-and-drop. */
'use strict';

window.SinCityDragA11y = (function () {
  const VERSION = 'C10.0.7';
  let observer = null;
  let refreshFrame = 0;

  function ensureInfrastructure() {
    const panel = document.getElementById('panel-rules');
    if (!panel) return false;

    let help = document.getElementById('c10DragHelp');
    if (!help) {
      help = document.createElement('div');
      help.id = 'c10DragHelp';
      help.className = 'fixed-note c10-drag-help';
      help.innerHTML = '<strong>↕ Organização visual</strong><br>Em computador, use “⋮⋮ Arrastar”. Para teclado, celular ou touch, use “↑ Subir” e “↓ Descer”. Cada item permanece dentro do seu próprio nível estrutural.';
      const cats = document.getElementById('cats');
      if (cats) cats.before(help);
      else panel.prepend(help);
    }

    let live = document.getElementById('c10DragLive');
    if (!live) {
      live = document.createElement('div');
      live.id = 'c10DragLive';
      live.className = 'c10-visually-hidden';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      panel.appendChild(live);
    }

    return true;
  }

  function installStyles() {
    if (document.getElementById('c10DragA11yStyles')) return;
    const style = document.createElement('style');
    style.id = 'c10DragA11yStyles';
    style.textContent = `
      .c10-visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
      .c10-drag-help{margin:0 0 10px;line-height:1.5}
      .c10-category-drag-handle:focus-visible,.c10-subcategory-drag-handle:focus-visible,.c10-rule-drag-handle:focus-visible,.c10-rule-move-controls .btn:focus-visible,.c9-category-move-controls .btn:focus-visible,.c9-subcategory-move-controls .btn:focus-visible{outline:3px solid #fff;outline-offset:2px;box-shadow:0 0 0 5px #111}
      .c10-drop-before,.c10-drop-after,.c10-sub-drop-before,.c10-sub-drop-after,.c10-rule-drop-before,.c10-rule-drop-after{position:relative}
      .c10-drop-before::before,.c10-sub-drop-before::before,.c10-rule-drop-before::before,.c10-drop-after::after,.c10-sub-drop-after::after,.c10-rule-drop-after::after{content:attr(data-c10-drop-label);display:block;position:absolute;left:8px;right:8px;z-index:30;padding:4px 8px;border:1px solid #d6dbe2;border-radius:6px;background:#101216;color:#fff;font-size:10px;font-weight:900;letter-spacing:.05em;text-align:center;pointer-events:none;box-shadow:0 5px 15px #0008}
      .c10-drop-before::before,.c10-sub-drop-before::before,.c10-rule-drop-before::before{top:-13px}
      .c10-drop-after::after,.c10-sub-drop-after::after,.c10-rule-drop-after::after{bottom:-13px}
      @media(max-width:720px),(pointer:coarse){.c10-drag-help{font-size:10px}.c10-rule-move-controls{display:inline-flex!important}.c10-rule-move-controls .btn{min-height:30px}}
      @media(prefers-reduced-motion:reduce){.c10-moved-highlight{animation:none!important;outline:2px solid #d0d6df!important;outline-offset:3px!important}.toast{transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  function announce(message) {
    const live = document.getElementById('c10DragLive');
    if (!live || !message) return;
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = String(message); });
  }

  function markerLabel(node) {
    if (node.classList.contains('c10-drop-before') || node.classList.contains('c10-sub-drop-before') || node.classList.contains('c10-rule-drop-before')) return 'SOLTAR ANTES';
    if (node.classList.contains('c10-drop-after') || node.classList.contains('c10-sub-drop-after') || node.classList.contains('c10-rule-drop-after')) return 'SOLTAR DEPOIS';
    return '';
  }

  function syncDropLabels(root=document) {
    root.querySelectorAll?.('#cats > details.item,#cats details.subitem,#cats .rule').forEach(node => {
      const label = markerLabel(node);
      if (label) {
        const changed = node.dataset.c10DropLabel !== label;
        node.dataset.c10DropLabel = label;
        node.setAttribute('aria-dropeffect', 'move');
        if (changed) announce(label === 'SOLTAR ANTES' ? 'Soltar antes deste item.' : 'Soltar depois deste item.');
      } else {
        delete node.dataset.c10DropLabel;
        node.removeAttribute('aria-dropeffect');
      }
    });
  }

  function enhanceHandles(root=document) {
    root.querySelectorAll?.('.c10-category-drag-handle,.c10-subcategory-drag-handle,.c10-rule-drag-handle').forEach(handle => {
      handle.setAttribute('aria-describedby', 'c10DragHelp');
      if (!handle.hasAttribute('tabindex')) handle.tabIndex = 0;
    });
    root.querySelectorAll?.('.c10-rule-move-controls').forEach(group => {
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', 'Mover regra sem arrastar');
    });
  }

  function announceDragState() {
    const html = document.documentElement;
    if (html.dataset.c10CategoryDragging === 'true') announce('Categoria em movimento. Escolha uma posição e solte.');
    else if (html.dataset.c10SubcategoryDragging === 'true') announce('Subcategoria em movimento dentro da categoria atual. Escolha uma posição e solte.');
    else if (html.dataset.c10RuleDragging === 'true') announce('Regra em movimento dentro do bloco atual. Escolha uma posição e solte.');
  }

  function refresh() {
    if (!ensureInfrastructure()) return false;
    installStyles();
    enhanceHandles();
    syncDropLabels();
    document.documentElement.dataset.sinCityDragA11y = VERSION;
    return true;
  }

  function scheduleRefresh() {
    if (refreshFrame) return;
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0;
      refresh();
      announceDragState();
    });
  }

  function install() {
    if (!refresh()) return false;
    if (!observer) {
      observer = new MutationObserver(scheduleRefresh);
      observer.observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['class','data-c10-category-dragging','data-c10-subcategory-dragging','data-c10-rule-dragging']});
    }
    return true;
  }

  function boot() {
    let attempts = 0;
    const retry = () => {
      attempts++;
      if (install() || attempts > 240) return;
      requestAnimationFrame(retry);
    };
    retry();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();

  return {version:VERSION,refresh,announce,syncDropLabels,enhanceHandles};
})();
