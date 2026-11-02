/* Sin City C10.0.5 — drag-and-drop de regras dentro do próprio bloco. */
'use strict';

window.SinCityRuleDrag = (function () {
  const VERSION = 'C10.0.5';
  const DRAG_IMAGE_STRATEGY = 'handle-only';
  let dragState = null;
  let refreshFrame = 0;
  let observer = null;

  function engineReady() {
    return Boolean(
      window.SinCityReorderEngine &&
      typeof window.SinCityReorderEngine.moveDirectRuleTo === 'function' &&
      typeof window.SinCityReorderEngine.moveNestedRuleTo === 'function'
    );
  }

  function categoryCards() {
    return [...document.querySelectorAll('#cats > details.item')];
  }

  function subcategoryCards(categoryCard) {
    return [...(categoryCard?.querySelectorAll(':scope > .sub-list > details.subitem') || [])];
  }

  function directRuleCards(categoryCard) {
    const list = categoryCard?.querySelector(':scope > .direct-list');
    return list ? [...list.querySelectorAll(':scope > .rule')] : [];
  }

  function nestedRuleCards(subcard) {
    return [...(subcard?.querySelectorAll(':scope > .rule') || [])];
  }

  function ruleLabel(ruleCard, index) {
    const heading = ruleCard?.querySelector(':scope > .item-head strong');
    return String(heading?.textContent || `Regra ${index + 1}`).trim();
  }

  function computeDropIndex(fromIndex, targetIndex, position, total) {
    const from = Number(fromIndex);
    const target = Number(targetIndex);
    const length = Number(total);
    if (!Number.isInteger(from) || !Number.isInteger(target) || !Number.isInteger(length) || length < 1) return -1;
    if (from < 0 || target < 0 || from >= length || target >= length) return -1;

    let insertion = target + (position === 'after' ? 1 : 0);
    if (from < insertion) insertion -= 1;
    return Math.max(0, Math.min(length - 1, insertion));
  }

  function sameContainer(a, b) {
    return Boolean(a && b && a.scope === b.scope && String(a.containerKey || '') === String(b.containerKey || ''));
  }

  function installStyles() {
    if (document.getElementById('c10RuleDragStyles')) return;
    const style = document.createElement('style');
    style.id = 'c10RuleDragStyles';
    style.textContent = `
      .rule>.item-head{justify-content:flex-start}
      .rule>.item-head>strong{flex:1;min-width:0}
      .c10-rule-drag-handle{display:inline-flex;align-items:center;gap:4px;border-style:dashed!important;cursor:grab;user-select:none;touch-action:none;flex:0 0 auto}
      .c10-rule-drag-handle:active{cursor:grabbing}
      .rule.c10-rule-dragging{opacity:.48;outline:1px dashed #8e97a3;outline-offset:3px}
      .rule.c10-rule-drop-before{box-shadow:inset 0 3px 0 #b7bec8,0 -4px 12px #0003}
      .rule.c10-rule-drop-after{box-shadow:inset 0 -3px 0 #b7bec8,0 4px 12px #0003}
      @media(pointer:coarse){.c10-rule-drag-handle{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function clearDropMarkers() {
    document.querySelectorAll('#cats .rule').forEach(ruleCard => {
      ruleCard.classList.remove('c10-rule-drop-before', 'c10-rule-drop-after');
    });
  }

  function clearDragState() {
    document.querySelectorAll('#cats .rule').forEach(ruleCard => {
      ruleCard.classList.remove('c10-rule-dragging', 'c10-rule-drop-before', 'c10-rule-drop-after');
    });
    document.querySelectorAll('.c10-rule-drag-handle[aria-grabbed="true"]').forEach(handle => handle.setAttribute('aria-grabbed', 'false'));
    dragState = null;
    document.documentElement.removeAttribute('data-c10-rule-dragging');
  }

  function dropPosition(ruleCard, event) {
    const rect = ruleCard.getBoundingClientRect();
    if (!rect.height) return 'before';
    return event.clientY >= rect.top + rect.height / 2 ? 'after' : 'before';
  }

  function contextForDirect(categoryCard, categoryIndex) {
    return {
      scope: 'direct',
      categoryIndex,
      subcategoryIndex: null,
      containerKey: `D:${String(categoryCard?.dataset.categoryId || categoryIndex)}`
    };
  }

  function contextForNested(categoryCard, subcard, categoryIndex, subcategoryIndex) {
    return {
      scope: 'nested',
      categoryIndex,
      subcategoryIndex,
      containerKey: `S:${String(categoryCard?.dataset.categoryId || categoryIndex)}:${String(subcard?.dataset.subcategoryId || subcategoryIndex)}`
    };
  }

  function applyLightweightDragImage(event, handle) {
    if (!event?.dataTransfer || !handle) return false;
    try {
      const rect = handle.getBoundingClientRect();
      event.dataTransfer.setDragImage(handle, Math.max(8, Math.min(28, rect.width / 2 || 18)), Math.max(6, Math.min(18, rect.height / 2 || 12)));
      return true;
    } catch {
      return false;
    }
  }

  function onDragStart(event, ruleCard, context, fromIndex, handle) {
    if (!engineReady() || fromIndex < 0) {
      event.preventDefault();
      return;
    }

    dragState = {
      ...context,
      from: fromIndex,
      label: ruleLabel(ruleCard, fromIndex)
    };

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try { event.dataTransfer.setData('text/plain', `${dragState.containerKey}:${dragState.from}`); } catch {}
      applyLightweightDragImage(event, handle);
    }

    ruleCard.classList.add('c10-rule-dragging');
    document.documentElement.dataset.c10RuleDragging = 'true';
    handle.setAttribute('aria-grabbed', 'true');
  }

  function onDragOver(event, ruleCard, targetContext) {
    if (!dragState || !sameContainer(dragState, targetContext) || ruleCard.classList.contains('c10-rule-dragging')) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    clearDropMarkers();
    ruleCard.classList.add(dropPosition(ruleCard, event) === 'after' ? 'c10-rule-drop-after' : 'c10-rule-drop-before');
  }

  function onDragLeave(event, ruleCard) {
    if (event.relatedTarget && ruleCard.contains(event.relatedTarget)) return;
    ruleCard.classList.remove('c10-rule-drop-before', 'c10-rule-drop-after');
  }

  function onDrop(event, ruleCard, targetContext, ruleCards) {
    if (!dragState || !engineReady() || !sameContainer(dragState, targetContext)) return;
    event.preventDefault();
    event.stopPropagation();

    const target = ruleCards.indexOf(ruleCard);
    const position = dropPosition(ruleCard, event);
    const to = computeDropIndex(dragState.from, target, position, ruleCards.length);
    const from = dragState.from;
    const state = {...dragState};

    clearDropMarkers();
    if (to < 0 || to === from) {
      clearDragState();
      return;
    }

    let result;
    if (state.scope === 'direct') {
      result = window.SinCityReorderEngine.moveDirectRuleTo(state.categoryIndex, from, to, {notify:true, preview:true, render:true});
    } else {
      result = window.SinCityReorderEngine.moveNestedRuleTo(state.categoryIndex, state.subcategoryIndex, from, to, {notify:true, preview:true, render:true});
    }

    clearDragState();
    if (result?.moved) requestAnimationFrame(() => refresh());
  }

  function bindRule(ruleCard, context, index, ruleCards) {
    if (!ruleCard) return;
    const head = ruleCard.querySelector(':scope > .item-head');
    if (!head) return;

    let handle = head.querySelector(':scope > .c10-rule-drag-handle');
    if (!handle) {
      handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'btn mini c10-rule-drag-handle';
      handle.draggable = true;
      handle.innerHTML = '<span aria-hidden="true">⋮⋮</span> Arrastar';
      const deleteButton = head.querySelector(':scope > button.danger');
      if (deleteButton) deleteButton.before(handle);
      else head.appendChild(handle);
    }

    const label = ruleLabel(ruleCard, index);
    handle.draggable = true;
    handle.dataset.ruleScope = context.scope;
    handle.dataset.categoryIndex = String(context.categoryIndex);
    if (context.subcategoryIndex === null) delete handle.dataset.subcategoryIndex;
    else handle.dataset.subcategoryIndex = String(context.subcategoryIndex);
    handle.dataset.ruleIndex = String(index);
    handle.dataset.ruleContainer = context.containerKey;
    handle.dataset.c10DragImage = DRAG_IMAGE_STRATEGY;
    handle.title = `Arrastar ${label} para outra posição neste bloco`;
    handle.setAttribute('aria-label', `Arrastar ${label} dentro deste mesmo bloco de regras.`);
    handle.setAttribute('aria-grabbed', 'false');
    handle.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
    };
    handle.ondragstart = event => {
      event.stopPropagation();
      onDragStart(event, ruleCard, context, index, handle);
    };
    handle.ondragend = event => {
      event.stopPropagation();
      clearDragState();
    };

    ruleCard.ondragover = event => onDragOver(event, ruleCard, context);
    ruleCard.ondragleave = event => onDragLeave(event, ruleCard);
    ruleCard.ondrop = event => onDrop(event, ruleCard, context, ruleCards);
    ruleCard.dataset.c10RuleDragBound = VERSION;
    ruleCard.dataset.c10RuleScope = context.scope;
    ruleCard.dataset.c10RuleContainer = context.containerKey;
  }

  function refresh() {
    if (!document.getElementById('panel-rules') || !engineReady()) return false;
    installStyles();
    let count = 0;

    categoryCards().forEach((categoryCard, ci) => {
      const directCards = directRuleCards(categoryCard);
      const directContext = contextForDirect(categoryCard, ci);
      directCards.forEach((ruleCard, ri) => {
        bindRule(ruleCard, directContext, ri, directCards);
        count++;
      });

      subcategoryCards(categoryCard).forEach((subcard, si) => {
        const nestedCards = nestedRuleCards(subcard);
        const nestedContext = contextForNested(categoryCard, subcard, ci, si);
        nestedCards.forEach((ruleCard, ri) => {
          bindRule(ruleCard, nestedContext, ri, nestedCards);
          count++;
        });
      });
    });

    document.documentElement.dataset.sinCityRuleDrag = VERSION;
    return count > 0 || categoryCards().length > 0;
  }

  function scheduleRefresh() {
    if (refreshFrame) return;
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0;
      refresh();
    });
  }

  function install() {
    if (!document.getElementById('panel-rules')) return false;
    if (!refresh()) return false;
    if (!observer) {
      observer = new MutationObserver(scheduleRefresh);
      observer.observe(document.getElementById('cats') || document.getElementById('panel-rules'), {childList:true, subtree:true});
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

  return {
    version: VERSION,
    dragImageStrategy: DRAG_IMAGE_STRATEGY,
    refresh,
    install,
    computeDropIndex,
    sameContainer,
    applyLightweightDragImage,
    clearDragState,
    isDragging: () => Boolean(dragState)
  };
})();
