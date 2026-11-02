/* Sin City C10 — ponte robusta entre galeria de imagens e reordenação do Studio. */
'use strict';

window.SinCityImageReorderBridge = (function () {
  const VERSION = 'C10.0-image-reorder-fix-2';
  let observer = null;
  let observedRoot = null;
  let rebuildFrame = 0;
  let rebuilding = false;

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

  function refreshControls() {
    const panel = document.getElementById('panel-rules');
    if (!panel) return false;
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
  }

  function observe() {
    observedRoot = document.getElementById('cats') || document.getElementById('panel-rules');
    if (!observedRoot) return false;
    if (!observer) {
      observer = new MutationObserver(mutations => {
        if (rebuilding) return;
        if (mutations.some(imageMutation)) scheduleRebuild();
      });
    }
    observer.disconnect();
    observer.observe(observedRoot, {childList:true, subtree:true});
    return true;
  }

  function rebuildAfterImageChange(options={}) {
    if (rebuilding) return false;
    const panel = document.getElementById('panel-rules');
    if (!panel) return false;

    rebuilding = true;
    const state = (() => {
      try { return window.SinCityVisualState?.snapshot?.() || null; }
      catch { return null; }
    })();

    observer?.disconnect();
    try {
      if (typeof renderRules === 'function') renderRules();
      if (typeof bindEditor === 'function') bindEditor();
      refreshControls();
      try { window.SinCityRuleImages?.refreshBindings?.(); } catch {}
      try { window.SinCityVisualState?.restore?.(state); } catch {}
      disableNativeImageDrag(panel);
      if (options.preview !== false) {
        try { if (typeof sendPreview === 'function') sendPreview(); } catch {}
      }
      document.documentElement.dataset.sinCityImageReorderBridge = VERSION;
      return true;
    } finally {
      rebuilding = false;
      observe();
    }
  }

  function scheduleRebuild() {
    if (rebuildFrame || rebuilding) return;
    rebuildFrame = requestAnimationFrame(() => {
      rebuildFrame = 0;
      rebuildAfterImageChange({preview:true});
    });
  }

  function refresh() {
    return refreshControls();
  }

  function install() {
    if (!document.getElementById('panel-rules')) return false;
    refreshControls();
    return observe();
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

  return {
    version:VERSION,
    refresh,
    install,
    refreshControls,
    rebuildAfterImageChange,
    disableNativeImageDrag
  };
})();
