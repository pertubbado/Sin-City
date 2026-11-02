/* Sin City C10.0.2 + C10.0.6 — motor de reordenação com preservação visual e integração de preview/imagens. */
'use strict';

window.SinCityReorderEngine = (function () {
  const VERSION = 'C10.0.6';

  function getData() {
    try { return typeof data !== 'undefined' && data && Array.isArray(data.categories) ? data : null; }
    catch { return null; }
  }

  function validIndex(index, length) {
    return Number.isInteger(index) && index >= 0 && index < length;
  }

  function reorderArray(array, fromIndex, toIndex) {
    if (!Array.isArray(array)) return {moved:false, reason:'invalid-array'};
    const from = Number(fromIndex), to = Number(toIndex);
    if (!Number.isInteger(from) || !Number.isInteger(to)) return {moved:false, reason:'invalid-index'};
    if (!validIndex(from, array.length) || !validIndex(to, array.length)) return {moved:false, reason:'boundary', from, to};
    if (from === to) return {moved:false, reason:'same-position', from, to, item:array[from]};
    const item = array[from];
    const beforeLength = array.length;
    array.splice(from, 1);
    array.splice(to, 0, item);
    if (array.length !== beforeLength || array[to] !== item) return {moved:false, reason:'reorder-failed', from, to, item};
    return {moved:true, from, to, item};
  }

  function showToast(message, type='ok') {
    try { if (typeof toast === 'function') { toast(message, type); return; } } catch {}
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className = `toast show ${type}`;
    clearTimeout(window.__c10ReorderToast);
    window.__c10ReorderToast = setTimeout(() => { el.className = 'toast'; }, 4200);
  }

  function visualSnapshot() {
    try { return window.SinCityVisualState?.snapshot?.() || null; }
    catch { return null; }
  }

  function syncEditor(options={}, meta={}) {
    const render = options.render !== false;
    const preview = options.preview !== false;
    const state = options.visualState || visualSnapshot();

    if (render) {
      try { if (typeof renderRules === 'function') renderRules(); } catch {}
      try { if (typeof bindEditor === 'function') bindEditor(); } catch {}
    }

    if (window.SinCityVisualState?.afterRender) {
      try {
        window.SinCityVisualState.afterRender(state, meta, {preview});
        return;
      } catch (error) {
        console.warn('[Sin City C10.0.6] Falha ao restaurar estado visual; usando fallback.', error);
      }
    }

    try { window.SinCityOrdering?.refresh?.({preview:false}); } catch {}
    try { window.SinCityFlowGuard?.flush?.(); } catch {}
    try { window.SinCityRuleImages?.refreshBindings?.(); } catch {}
    if (preview) {
      try { if (typeof sendPreview === 'function') sendPreview(); } catch {}
    }
  }

  function categoryPosition(index) {
    try { return window.SinCityOrdering?.categoryNumber?.(index) || String(index + 1).padStart(2, '0'); }
    catch { return String(index + 1).padStart(2, '0'); }
  }

  function subcategoryPosition(categoryIndex, subcategoryIndex) {
    try { return window.SinCityOrdering?.subcategoryNumber?.(categoryIndex, subcategoryIndex) || `${categoryPosition(categoryIndex)}.${String(subcategoryIndex + 1).padStart(2, '0')}`; }
    catch { return `${categoryPosition(categoryIndex)}.${String(subcategoryIndex + 1).padStart(2, '0')}`; }
  }

  function moveCategoryTo(fromIndex, toIndex, options={}) {
    const current = getData();
    if (!current) return {moved:false, reason:'data-unavailable'};
    const state = visualSnapshot();
    const result = reorderArray(current.categories, fromIndex, toIndex);
    if (!result.moved) return result;
    const id = String(result.item?.id || '');
    const finalResult = {...result, kind:'category', id, position:categoryPosition(result.to)};
    syncEditor({...options,visualState:state}, finalResult);
    if (options.notify !== false) showToast(`✓ Categoria movida para ${finalResult.position} — numeração reorganizada automaticamente.`);
    return finalResult;
  }

  function moveSubcategoryTo(categoryIndex, fromIndex, toIndex, options={}) {
    const current = getData();
    const ci = Number(categoryIndex);
    if (!current || !validIndex(ci, current.categories.length)) return {moved:false, reason:'invalid-category'};
    const subs = current.categories[ci]?.subcategories;
    if (!Array.isArray(subs)) return {moved:false, reason:'invalid-subcategories'};
    const state = visualSnapshot();
    const result = reorderArray(subs, fromIndex, toIndex);
    if (!result.moved) return result;
    const id = String(result.item?.id || '');
    const finalResult = {...result, kind:'subcategory', categoryIndex:ci, id, position:subcategoryPosition(ci, result.to)};
    syncEditor({...options,visualState:state}, finalResult);
    if (options.notify !== false) showToast(`✓ Subcategoria movida para ${finalResult.position} — numeração reorganizada automaticamente.`);
    return finalResult;
  }

  function moveDirectRuleTo(categoryIndex, fromIndex, toIndex, options={}) {
    const current = getData();
    const ci = Number(categoryIndex);
    if (!current || !validIndex(ci, current.categories.length)) return {moved:false, reason:'invalid-category'};
    const rules = current.categories[ci]?.rules;
    if (!Array.isArray(rules)) return {moved:false, reason:'invalid-rules'};
    const state = visualSnapshot();
    const result = reorderArray(rules, fromIndex, toIndex);
    if (!result.moved) return result;
    const code = String(result.item?.code || '');
    const title = String(result.item?.title || 'Regra');
    const finalResult = {...result, kind:'direct-rule', categoryIndex:ci, code, title, ruleRef:result.item, position:result.to + 1};
    syncEditor({...options,visualState:state}, finalResult);
    if (options.notify !== false) showToast(`✓ Regra “${title}” movida para a posição ${String(finalResult.position).padStart(2, '0')}.`);
    return finalResult;
  }

  function moveNestedRuleTo(categoryIndex, subcategoryIndex, fromIndex, toIndex, options={}) {
    const current = getData();
    const ci = Number(categoryIndex), si = Number(subcategoryIndex);
    if (!current || !validIndex(ci, current.categories.length)) return {moved:false, reason:'invalid-category'};
    const subs = current.categories[ci]?.subcategories;
    if (!Array.isArray(subs) || !validIndex(si, subs.length)) return {moved:false, reason:'invalid-subcategory'};
    const rules = subs[si]?.rules;
    if (!Array.isArray(rules)) return {moved:false, reason:'invalid-rules'};
    const state = visualSnapshot();
    const result = reorderArray(rules, fromIndex, toIndex);
    if (!result.moved) return result;
    const code = String(result.item?.code || '');
    const title = String(result.item?.title || 'Regra');
    const finalResult = {...result, kind:'nested-rule', categoryIndex:ci, subcategoryIndex:si, code, title, ruleRef:result.item, position:result.to + 1};
    syncEditor({...options,visualState:state}, finalResult);
    if (options.notify !== false) showToast(`✓ Regra “${title}” movida para a posição ${String(finalResult.position).padStart(2, '0')}.`);
    return finalResult;
  }

  function moveRuleTo(scope, categoryIndex, subcategoryIndex, fromIndex, toIndex, options={}) {
    if (scope === 'direct') return moveDirectRuleTo(categoryIndex, fromIndex, toIndex, options);
    if (scope === 'nested') return moveNestedRuleTo(categoryIndex, subcategoryIndex, fromIndex, toIndex, options);
    return {moved:false, reason:'invalid-scope'};
  }

  document.documentElement.dataset.sinCityReorderEngine = VERSION;

  return {version:VERSION,getData,reorderArray,moveCategoryTo,moveSubcategoryTo,moveDirectRuleTo,moveNestedRuleTo,moveRuleTo,syncEditor};
})();
