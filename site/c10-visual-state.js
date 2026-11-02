/* Sin City C10.0.6 — preservação de estado visual, preview e integração com imagens. */
'use strict';

window.SinCityVisualState = (function () {
  const VERSION = 'C10.0.6';
  let highlightTimer = 0;

  function categoryCards() {
    return [...document.querySelectorAll('#cats > details.item')];
  }

  function snapshot() {
    const openCategories = [];
    const openSubcategories = [];

    categoryCards().forEach(card => {
      const categoryId = String(card.dataset.categoryId || '');
      if (card.open && categoryId) openCategories.push(categoryId);
      [...card.querySelectorAll(':scope > .sub-list > details.subitem')].forEach(subcard => {
        const subcategoryId = String(subcard.dataset.subcategoryId || '');
        if (subcard.open && subcategoryId) openSubcategories.push(subcategoryId);
      });
    });

    const workspace = document.getElementById('editorWorkspace') || document.querySelector('.sidebar') || document.scrollingElement;
    const active = document.activeElement;
    let focus = null;
    if (active && active !== document.body && active instanceof HTMLElement) {
      const categoryCard = active.closest('details.item');
      const subcard = active.closest('details.subitem');
      focus = {
        categoryId: String(categoryCard?.dataset.categoryId || ''),
        subcategoryId: String(subcard?.dataset.subcategoryId || ''),
        selector: active.matches('input,textarea,select,button') ? active.tagName.toLowerCase() + (active.getAttribute('data-k') ? `[data-k="${CSS.escape(active.getAttribute('data-k'))}"]` : '') : ''
      };
    }

    return {openCategories,openSubcategories,scrollTop:Number(workspace?.scrollTop || 0),focus};
  }

  function restore(state) {
    if (!state) return false;
    const categorySet = new Set(state.openCategories || []);
    const subcategorySet = new Set(state.openSubcategories || []);

    categoryCards().forEach(card => {
      const categoryId = String(card.dataset.categoryId || '');
      if (categorySet.has(categoryId)) card.open = true;
      [...card.querySelectorAll(':scope > .sub-list > details.subitem')].forEach(subcard => {
        const subcategoryId = String(subcard.dataset.subcategoryId || '');
        if (subcategorySet.has(subcategoryId)) { card.open = true; subcard.open = true; }
      });
    });

    const workspace = document.getElementById('editorWorkspace') || document.querySelector('.sidebar') || document.scrollingElement;
    if (workspace && Number.isFinite(state.scrollTop)) workspace.scrollTop = state.scrollTop;

    const focus = state.focus;
    if (focus?.selector) {
      let root = document;
      if (focus.categoryId) root = categoryCards().find(card => card.dataset.categoryId === focus.categoryId) || root;
      if (focus.subcategoryId) root = [...root.querySelectorAll('details.subitem')].find(card => card.dataset.subcategoryId === focus.subcategoryId) || root;
      try { root.querySelector(focus.selector)?.focus({preventScroll:true}); } catch {}
    }
    return true;
  }

  function installStyles() {
    if (document.getElementById('c10VisualStateStyles')) return;
    const style = document.createElement('style');
    style.id = 'c10VisualStateStyles';
    style.textContent = `.c10-moved-highlight{animation:c10MovedHighlight 1.45s ease-out}@keyframes c10MovedHighlight{0%{outline:2px solid #d0d6df;outline-offset:4px;box-shadow:0 0 0 5px #ffffff12}100%{outline-color:transparent;box-shadow:none}}`;
    document.head.appendChild(style);
  }

  function highlightMoved(meta={}) {
    installStyles();
    let target = null;
    if (meta.kind === 'category' && meta.id) {
      target = categoryCards().find(card => card.dataset.categoryId === meta.id) || null;
    } else if (meta.kind === 'subcategory' && meta.id) {
      target = [...document.querySelectorAll('#cats details.subitem')].find(card => card.dataset.subcategoryId === meta.id) || null;
      target?.closest('details.item')?.setAttribute('open','');
      if (target) target.open = true;
    } else if ((meta.kind === 'direct-rule' || meta.kind === 'nested-rule') && meta.ruleRef) {
      const data = window.SinCityReorderEngine?.getData?.();
      if (data) {
        categoryCards().forEach((categoryCard, ci) => {
          if (target) return;
          if (meta.kind === 'direct-rule') {
            const ri = (data.categories?.[ci]?.rules || []).indexOf(meta.ruleRef);
            if (ri >= 0) target = [...categoryCard.querySelectorAll(':scope > .direct-list > .rule')][ri] || null;
          } else {
            [...categoryCard.querySelectorAll(':scope > .sub-list > details.subitem')].forEach((subcard, si) => {
              if (target) return;
              const ri = (data.categories?.[ci]?.subcategories?.[si]?.rules || []).indexOf(meta.ruleRef);
              if (ri >= 0) target = [...subcard.querySelectorAll(':scope > .rule')][ri] || null;
            });
          }
        });
      }
    }
    if (!target) return false;
    target.classList.remove('c10-moved-highlight'); void target.offsetWidth; target.classList.add('c10-moved-highlight');
    clearTimeout(highlightTimer); highlightTimer=setTimeout(()=>target?.classList?.remove('c10-moved-highlight'),1500);
    return true;
  }

  function refreshImageBindings() {
    try { return window.SinCityRuleImages?.refreshBindings?.() || []; } catch { return []; }
  }

  function afterRender(state, meta={}, options={}) {
    try { window.SinCityOrdering?.refresh?.({preview:false}); } catch {}
    try { window.SinCityFlowGuard?.flush?.(); } catch {}
    refreshImageBindings();
    try { window.SinCityRuleFallback?.refresh?.(); } catch {}
    restore(state);
    highlightMoved(meta);
    if (options.preview !== false) { try { if (typeof sendPreview === 'function') sendPreview(); } catch {} }
    document.documentElement.dataset.sinCityVisualState = VERSION;
  }

  installStyles();
  document.documentElement.dataset.sinCityVisualState = VERSION;
  return {version:VERSION,snapshot,restore,highlightMoved,refreshImageBindings,afterRender};
})();
