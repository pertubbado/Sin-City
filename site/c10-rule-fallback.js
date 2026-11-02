/* Sin City C10.0.7 — fallback de reordenação de regras por botões ↑/↓. */
'use strict';

window.SinCityRuleFallback = (function () {
  const VERSION = 'C10.0.7';
  let observer = null;
  let refreshFrame = 0;

  function engineReady() {
    return Boolean(window.SinCityReorderEngine && typeof window.SinCityReorderEngine.moveDirectRuleTo === 'function');
  }

  function categoryCards() {
    return [...document.querySelectorAll('#cats > details.item')];
  }

  function directRules(categoryCard) {
    return [...(categoryCard?.querySelectorAll(':scope > .direct-list > .rule') || [])];
  }

  function subcategoryCards(categoryCard) {
    return [...(categoryCard?.querySelectorAll(':scope > .sub-list > details.subitem') || [])];
  }

  function nestedRules(subcard) {
    return [...(subcard?.querySelectorAll(':scope > .rule') || [])];
  }

  function label(ruleCard, index) {
    const heading = ruleCard?.querySelector(':scope > .item-head strong');
    return String(heading?.textContent || `Regra ${index + 1}`).trim();
  }

  function move(context, index, direction) {
    const to = index + direction;
    if (context.scope === 'direct') {
      return window.SinCityReorderEngine.moveDirectRuleTo(context.categoryIndex, index, to, {notify:true, preview:true, render:true});
    }
    return window.SinCityReorderEngine.moveNestedRuleTo(context.categoryIndex, context.subcategoryIndex, index, to, {notify:true, preview:true, render:true});
  }

  function ensureControls(ruleCard, context, index, total) {
    const head = ruleCard?.querySelector(':scope > .item-head');
    if (!head) return;

    let controls = head.querySelector(':scope > .c10-rule-move-controls');
    if (!controls) {
      controls = document.createElement('span');
      controls.className = 'c10-rule-move-controls inline';
      controls.dataset.c10RuleFallback = VERSION;

      const up = document.createElement('button');
      up.type = 'button';
      up.className = 'btn mini';
      up.dataset.c10RuleMove = 'up';
      up.textContent = '↑ Subir';

      const down = document.createElement('button');
      down.type = 'button';
      down.className = 'btn mini';
      down.dataset.c10RuleMove = 'down';
      down.textContent = '↓ Descer';

      controls.append(up, down);
      const handle = head.querySelector(':scope > .c10-rule-drag-handle');
      const danger = head.querySelector(':scope > button.danger');
      if (handle) handle.before(controls);
      else if (danger) danger.before(controls);
      else head.appendChild(controls);
    }

    const ruleLabel = label(ruleCard, index);
    const up = controls.querySelector('[data-c10-rule-move="up"]');
    const down = controls.querySelector('[data-c10-rule-move="down"]');

    [up, down].forEach(button => {
      if (!button) return;
      button.dataset.ruleScope = context.scope;
      button.dataset.categoryIndex = String(context.categoryIndex);
      button.dataset.ruleIndex = String(index);
      if (context.subcategoryIndex == null) delete button.dataset.subcategoryIndex;
      else button.dataset.subcategoryIndex = String(context.subcategoryIndex);
    });

    if (up) {
      up.disabled = index === 0;
      up.title = up.disabled ? 'Esta regra já está na primeira posição deste bloco' : `Mover ${ruleLabel} uma posição para cima`;
      up.setAttribute('aria-label', `Subir ${ruleLabel}`);
      up.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        move(context, index, -1);
      };
    }

    if (down) {
      down.disabled = index === total - 1;
      down.title = down.disabled ? 'Esta regra já está na última posição deste bloco' : `Mover ${ruleLabel} uma posição para baixo`;
      down.setAttribute('aria-label', `Descer ${ruleLabel}`);
      down.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        move(context, index, 1);
      };
    }
  }

  function refresh() {
    if (!document.getElementById('panel-rules') || !engineReady()) return false;
    let count = 0;

    categoryCards().forEach((categoryCard, ci) => {
      const direct = directRules(categoryCard);
      direct.forEach((ruleCard, ri) => {
        ensureControls(ruleCard, {scope:'direct', categoryIndex:ci, subcategoryIndex:null}, ri, direct.length);
        count++;
      });

      subcategoryCards(categoryCard).forEach((subcard, si) => {
        const nested = nestedRules(subcard);
        nested.forEach((ruleCard, ri) => {
          ensureControls(ruleCard, {scope:'nested', categoryIndex:ci, subcategoryIndex:si}, ri, nested.length);
          count++;
        });
      });
    });

    document.documentElement.dataset.sinCityRuleFallback = VERSION;
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

  return {version:VERSION, refresh, install};
})();
