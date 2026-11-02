/* Sin City C10 — ponte de compatibilidade entre galeria de imagens e reordenação do Studio. */
'use strict';

window.SinCityImageReorderBridge = (function () {
  const VERSION = 'C10.0-image-reorder-fix';
  let observer = null;
  let refreshFrame = 0;
  let refreshing = false;

  function imageMutation(mutation) {
    const target = mutation?.target;
    if (target?.closest?.('.rule-image-manager')) return true;
    for (const node of [...(mutation?.addedNodes || []), ...(mutation?.removedNodes || [])]) {
      if (!(node instanceof Element)) continue;
      if (node.matches?.('.rule-image-manager,.rule-image-card,.rule-image-grid')) return true;
      if (node.querySelector?.('.rule-image-manager,.rule-image-card,.rule-image-grid')) return true;
    }
    return false;
  }

  function disableNativeImageDrag(root=document) {
    root.querySelectorAll?.('.rule-image-card img').forEach(img => {
      img.draggable = false;
      img.setAttribute('draggable', 'false');
      img.ondragstart = event => event.preventDefault();
    });
  }

  function refresh() {
    if (refreshing) return false;
    const panel = document.getElementById('panel-rules');
    if (!panel) return false;
    refreshing = true;
    try {
      disableNativeImageDrag(panel);
      try { window.SinCityOrdering?.refresh?.({preview:false}); } catch {}
      try { window.SinCityFlowGuard?.syncRuleCodePolicy?.(); } catch {}
      try { window.SinCityCategoryDrag?.refresh?.(); } catch {}
      try { window.SinCitySubcategoryDrag?.refresh?.(); } catch {}
      try { window.SinCityRuleDrag?.refresh?.(); } catch {}
      try { window.SinCityRuleFallback?.refresh?.(); } catch {}
      try { window.SinCityDragA11y?.refresh?.(); } catch {}
      document.documentElement.dataset.sinCityImageReorderBridge = VERSION;
      return true;
    } finally {
      refreshing = false;
    }
  }

  function scheduleRefresh() {
    if (refreshFrame) return;
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0;
      refresh();
    });
  }

  function install() {
    const root = document.getElementById('cats') || document.getElementById('panel-rules');
    if (!root) return false;
    refresh();
    if (!observer) {
      observer = new MutationObserver(mutations => {
        if (mutations.some(imageMutation)) scheduleRefresh();
      });
      observer.observe(root, {childList:true, subtree:true});
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

  return {version:VERSION, refresh, install, disableNativeImageDrag};
})();
