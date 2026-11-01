/* Sin City C10.0.4 — drag-and-drop de subcategorias dentro da própria categoria. */
'use strict';

window.SinCitySubcategoryDrag = (function () {
  const VERSION = 'C10.0.4';
  let dragState = null;
  let refreshFrame = 0;
  let observer = null;

  function engineReady() {
    return Boolean(window.SinCityReorderEngine && typeof window.SinCityReorderEngine.moveSubcategoryTo === 'function');
  }

  function categoryCards() {
    return [...document.querySelectorAll('#cats > details.item')];
  }

  function categoryIndex(card) {
    return categoryCards().indexOf(card);
  }

  function subcategoryList(card) {
    return card?.querySelector(':scope > .sub-list') || null;
  }

  function subcategoryCards(card) {
    const list = subcategoryList(card);
    return list ? [...list.querySelectorAll(':scope > details.subitem')] : [];
  }

  function subcategoryIndex(card, subcard) {
    return subcategoryCards(card).indexOf(subcard);
  }

  function subcategoryLabel(subcard, categoryPosition, subcategoryPosition) {
    const heading = subcard?.querySelector(':scope > summary b');
    return String(heading?.textContent || `Subcategoria ${categoryPosition + 1}.${subcategoryPosition + 1}`).trim();
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

  function installStyles() {
    if (document.getElementById('c10SubcategoryDragStyles')) return;
    const style = document.createElement('style');
    style.id = 'c10SubcategoryDragStyles';
    style.textContent = `
      .c10-subcategory-drag-handle{display:inline-flex;align-items:center;gap:5px;border-style:dashed!important;cursor:grab;user-select:none;touch-action:none}
      .c10-subcategory-drag-handle:active{cursor:grabbing}
      details.subitem.c10-subcategory-dragging{opacity:.5;outline:1px dashed #8e97a3;outline-offset:3px}
      details.subitem.c10-sub-drop-before{box-shadow:inset 0 3px 0 #b7bec8,0 -5px 15px #0003}
      details.subitem.c10-sub-drop-after{box-shadow:inset 0 -3px 0 #b7bec8,0 5px 15px #0003}
      @media(pointer:coarse){.c10-subcategory-drag-handle{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function clearDropMarkers() {
    document.querySelectorAll('#cats details.subitem').forEach(subcard => {
      subcard.classList.remove('c10-sub-drop-before', 'c10-sub-drop-after');
    });
  }

  function clearDragState() {
    document.querySelectorAll('#cats details.subitem').forEach(subcard => {
      subcard.classList.remove('c10-subcategory-dragging', 'c10-sub-drop-before', 'c10-sub-drop-after');
    });
    document.querySelectorAll('.c10-subcategory-drag-handle[aria-grabbed="true"]').forEach(handle => handle.setAttribute('aria-grabbed', 'false'));
    dragState = null;
    document.documentElement.removeAttribute('data-c10-subcategory-dragging');
  }

  function dropPosition(subcard, event) {
    const rect = subcard.getBoundingClientRect();
    if (!rect.height) return 'before';
    return event.clientY >= rect.top + rect.height / 2 ? 'after' : 'before';
  }

  function sameCategory(card) {
    if (!dragState || !card) return false;
    return String(card.dataset.categoryId || '') === dragState.categoryId;
  }

  function onDragStart(event, card, subcard, handle) {
    if (!engineReady()) {
      event.preventDefault();
      return;
    }

    const ci = categoryIndex(card);
    const si = subcategoryIndex(card, subcard);
    if (ci < 0 || si < 0) {
      event.preventDefault();
      return;
    }

    dragState = {
      categoryIndex: ci,
      from: si,
      categoryId: String(card.dataset.categoryId || ''),
      subcategoryId: String(subcard.dataset.subcategoryId || ''),
      label: subcategoryLabel(subcard, ci, si)
    };

    subcard.classList.add('c10-subcategory-dragging');
    document.documentElement.dataset.c10SubcategoryDragging = 'true';
    handle.setAttribute('aria-grabbed', 'true');

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try { event.dataTransfer.setData('text/plain', dragState.subcategoryId || dragState.label); } catch {}
      try { event.dataTransfer.setDragImage(subcard, 30, 16); } catch {}
    }
  }

  function onDragOver(event, card, subcard) {
    if (!dragState || !sameCategory(card) || subcard.classList.contains('c10-subcategory-dragging')) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    clearDropMarkers();
    subcard.classList.add(dropPosition(subcard, event) === 'after' ? 'c10-sub-drop-after' : 'c10-sub-drop-before');
  }

  function onDragLeave(event, subcard) {
    if (event.relatedTarget && subcard.contains(event.relatedTarget)) return;
    subcard.classList.remove('c10-sub-drop-before', 'c10-sub-drop-after');
  }

  function onDrop(event, card, subcard) {
    if (!dragState || !engineReady() || !sameCategory(card)) return;
    event.preventDefault();
    event.stopPropagation();

    const cards = subcategoryCards(card);
    const target = cards.indexOf(subcard);
    const position = dropPosition(subcard, event);
    const to = computeDropIndex(dragState.from, target, position, cards.length);
    const from = dragState.from;
    const ci = dragState.categoryIndex;

    clearDropMarkers();
    if (to < 0 || to === from) {
      clearDragState();
      return;
    }

    const result = window.SinCityReorderEngine.moveSubcategoryTo(ci, from, to, {notify:true, preview:true, render:true});
    clearDragState();
    if (result?.moved) requestAnimationFrame(() => refresh());
  }

  function bindSubcategory(card, subcard, ci, si) {
    if (!subcard) return;
    const actionRow = subcard.querySelector(':scope > .inline');
    if (!actionRow) return;

    let handle = actionRow.querySelector(':scope > .c10-subcategory-drag-handle');
    if (!handle) {
      handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'btn mini c10-subcategory-drag-handle';
      handle.draggable = true;
      handle.innerHTML = '<span aria-hidden="true">⋮⋮</span> Arrastar';
      actionRow.prepend(handle);
    }

    const label = subcategoryLabel(subcard, ci, si);
    handle.draggable = true;
    handle.dataset.categoryIndex = String(ci);
    handle.dataset.subcategoryIndex = String(si);
    handle.title = `Arrastar ${label} para outra posição nesta categoria`;
    handle.setAttribute('aria-label', `Arrastar ${label} dentro desta categoria. Para teclado ou celular, use os botões Subir e Descer.`);
    handle.setAttribute('aria-grabbed', 'false');
    handle.onclick = event => event.preventDefault();
    handle.ondragstart = event => onDragStart(event, card, subcard, handle);
    handle.ondragend = () => clearDragState();

    subcard.ondragover = event => onDragOver(event, card, subcard);
    subcard.ondragleave = event => onDragLeave(event, subcard);
    subcard.ondrop = event => onDrop(event, card, subcard);
    subcard.dataset.c10SubcategoryDragBound = VERSION;
  }

  function refresh() {
    if (!document.getElementById('panel-rules') || !engineReady()) return false;
    installStyles();
    let count = 0;
    categoryCards().forEach((card, ci) => {
      subcategoryCards(card).forEach((subcard, si) => {
        bindSubcategory(card, subcard, ci, si);
        count++;
      });
    });
    document.documentElement.dataset.sinCitySubcategoryDrag = VERSION;
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
    refresh,
    install,
    computeDropIndex,
    sameCategory,
    clearDragState,
    isDragging: () => Boolean(dragState)
  };
})();
