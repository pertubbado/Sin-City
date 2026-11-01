/* Sin City C10.0.3 — drag-and-drop de categorias no Studio. */
'use strict';

window.SinCityCategoryDrag = (function () {
  const VERSION = 'C10.0.3';
  let dragState = null;
  let refreshFrame = 0;
  let observer = null;

  function engineReady() {
    return Boolean(window.SinCityReorderEngine && typeof window.SinCityReorderEngine.moveCategoryTo === 'function');
  }

  function categoryCards() {
    return [...document.querySelectorAll('#cats > details.item')];
  }

  function cardIndex(card) {
    return categoryCards().indexOf(card);
  }

  function categoryLabel(card, index) {
    const heading = card?.querySelector(':scope > summary b');
    return String(heading?.textContent || `Categoria ${index + 1}`).trim();
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
    if (document.getElementById('c10CategoryDragStyles')) return;
    const style = document.createElement('style');
    style.id = 'c10CategoryDragStyles';
    style.textContent = `
      .c10-category-drag-handle{display:inline-flex;align-items:center;gap:5px;border-style:dashed!important;cursor:grab;user-select:none;touch-action:none}
      .c10-category-drag-handle:active{cursor:grabbing}
      #cats>details.item.c10-category-dragging{opacity:.5;outline:1px dashed #8e97a3;outline-offset:3px}
      #cats>details.item.c10-drop-before{box-shadow:inset 0 3px 0 #b7bec8,0 -5px 15px #0004}
      #cats>details.item.c10-drop-after{box-shadow:inset 0 -3px 0 #b7bec8,0 5px 15px #0004}
      #cats>details.item.c10-drop-before::before,#cats>details.item.c10-drop-after::after{display:block;height:0;content:"";pointer-events:none}
      @media(pointer:coarse){.c10-category-drag-handle{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function clearDropMarkers() {
    categoryCards().forEach(card => card.classList.remove('c10-drop-before', 'c10-drop-after'));
  }

  function clearDragState() {
    categoryCards().forEach(card => card.classList.remove('c10-category-dragging', 'c10-drop-before', 'c10-drop-after'));
    dragState = null;
    document.documentElement.removeAttribute('data-c10-category-dragging');
  }

  function dropPosition(card, event) {
    const rect = card.getBoundingClientRect();
    if (!rect.height) return 'before';
    return event.clientY >= rect.top + rect.height / 2 ? 'after' : 'before';
  }

  function onDragStart(event, card, handle) {
    if (!engineReady()) {
      event.preventDefault();
      return;
    }
    const from = cardIndex(card);
    if (from < 0) {
      event.preventDefault();
      return;
    }

    dragState = {
      from,
      id: String(card.dataset.categoryId || ''),
      label: categoryLabel(card, from)
    };
    card.classList.add('c10-category-dragging');
    document.documentElement.dataset.c10CategoryDragging = 'true';

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try { event.dataTransfer.setData('text/plain', dragState.id || dragState.label); } catch {}
      try { event.dataTransfer.setDragImage(card, 26, 18); } catch {}
    }
    handle.setAttribute('aria-grabbed', 'true');
  }

  function onDragOver(event, card) {
    if (!dragState || card.classList.contains('c10-category-dragging')) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    clearDropMarkers();
    card.classList.add(dropPosition(card, event) === 'after' ? 'c10-drop-after' : 'c10-drop-before');
  }

  function onDragLeave(event, card) {
    if (event.relatedTarget && card.contains(event.relatedTarget)) return;
    card.classList.remove('c10-drop-before', 'c10-drop-after');
  }

  function onDrop(event, card) {
    if (!dragState || !engineReady()) return;
    event.preventDefault();

    const cards = categoryCards();
    const target = cards.indexOf(card);
    const position = dropPosition(card, event);
    const to = computeDropIndex(dragState.from, target, position, cards.length);
    const from = dragState.from;

    clearDropMarkers();
    if (to < 0 || to === from) {
      clearDragState();
      return;
    }

    const result = window.SinCityReorderEngine.moveCategoryTo(from, to, {notify:true, preview:true, render:true});
    clearDragState();
    if (result?.moved) {
      requestAnimationFrame(() => refresh());
    }
  }

  function bindCard(card, index) {
    if (!card || card.dataset.c10CategoryDragBound === VERSION) return;
    const actionRow = card.querySelector(':scope > .inline');
    if (!actionRow) return;

    let handle = actionRow.querySelector(':scope > .c10-category-drag-handle');
    if (!handle) {
      handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'btn mini c10-category-drag-handle';
      handle.draggable = true;
      handle.innerHTML = '<span aria-hidden="true">⋮⋮</span> Arrastar';
      actionRow.prepend(handle);
    }

    const label = categoryLabel(card, index);
    handle.draggable = true;
    handle.dataset.categoryIndex = String(index);
    handle.title = `Arrastar ${label} para outra posição`;
    handle.setAttribute('aria-label', `Arrastar ${label}. Para teclado ou celular, use os botões Subir e Descer.`);
    handle.setAttribute('aria-grabbed', 'false');
    handle.onclick = event => event.preventDefault();
    handle.ondragstart = event => onDragStart(event, card, handle);
    handle.ondragend = () => {
      handle.setAttribute('aria-grabbed', 'false');
      clearDragState();
    };

    card.ondragover = event => onDragOver(event, card);
    card.ondragleave = event => onDragLeave(event, card);
    card.ondrop = event => onDrop(event, card);
    card.dataset.c10CategoryDragBound = VERSION;
  }

  function refresh() {
    if (!document.getElementById('panel-rules') || !engineReady()) return false;
    installStyles();
    const cards = categoryCards();
    cards.forEach((card, index) => bindCard(card, index));
    document.documentElement.dataset.sinCityCategoryDrag = VERSION;
    return cards.length > 0;
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
    clearDragState,
    isDragging: () => Boolean(dragState)
  };
})();
