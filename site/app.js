'use strict';

(() => {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const state = { site: null, data: { categories: [], updates: [] }, categoryId: null, searchIndex: [] };
  let cursorConfig = { enabled:false, trailEnabled:false, color:'#2D1243', count:16 };
  let cursorListenersAttached = false;
  let categoryObserver = null;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const touchPointer = window.matchMedia?.('(hover: none), (pointer: coarse)').matches ?? false;

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const slugify = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'item';
  const assetUrl = path => {
    const value = String(path || '').trim();
    if (!value) return '';
    if (/^(https:\/\/|data:image\/)/i.test(value)) return value;
    if (/^(javascript:|data:text\/html)/i.test(value)) return '';
    return value.replace(/^\/+/, './');
  };
  const categoryId = (category, index) => String(category?.id || slugify(category?.short || category?.name) || `categoria-${index + 1}`);
  const ruleDomId = (categoryIdValue, si, ri, rule) => `rule-${slugify(categoryIdValue)}-${si}-${ri}-${slugify(rule?.code || rule?.title)}`;
  const cleanLegacyEntities = value => String(value ?? '').replace(/&(?:amp;)?#x0*20;/gi, ' ').replace(/&(?:amp;)?#0*32;/gi, ' ');
  const stripLeadingEmoji = value => String(value ?? '').replace(/^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uFE0F|\u200D)+\s*/u, '').trim();

  function inlineMarkdown(value) {
    let text = escapeHTML(cleanLegacyEntities(value));
    text = text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" class="md-inline-image" loading="lazy" referrerpolicy="no-referrer">');
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
    text = text.replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em>$2</em>');
    return text;
  }

  function renderMarkdown(markdown) {
    if (!markdown) return '';
    const lines = cleanLegacyEntities(markdown).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let paragraph = [], listType = null, listItems = [], quoteLines = [], codeLines = [], inCode = false, tableRows = [];
    const flushParagraph = () => {
      if (paragraph.length) { out.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`); paragraph = []; }
    };
    const flushList = () => {
      if (!listItems.length) return;
      const tag = listType === 'ol' ? 'ol' : 'ul';
      out.push(`<${tag}>${listItems.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</${tag}>`);
      listItems = []; listType = null;
    };
    const flushQuote = () => {
      if (!quoteLines.length) return;
      const raw = quoteLines.join('\n').trim();
      let type = 'info', icon = '✦', title = 'OBSERVAÇÃO';
      if (/^(⚠️|⚠|ATENÇÃO|ATENCAO)/i.test(raw)) { type = 'warning'; icon = '⚠'; title = 'ATENÇÃO'; }
      else if (/^(❌|⛔|PROIBIDO|ERRO)/i.test(raw)) { type = 'danger'; icon = '!'; title = 'PROIBIDO'; }
      else if (/^(✅|PERMITIDO|OK)/i.test(raw)) { type = 'success'; icon = '✓'; title = 'PERMITIDO'; }
      let body = raw.replace(/^(⚠️|⚠|ℹ️|❌|⛔|✅)\s*/u, '').replace(/^(ATENÇÃO|ATENCAO|OBSERVAÇÃO|OBSERVACAO|PROIBIDO|PERMITIDO|ERRO|OK)\s*:?\s*/i, '').trim();
      const first = body.split('\n')[0] || '';
      const match = first.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
      if (match) { title = match[1]; body = [match[2], ...body.split('\n').slice(1)].filter(Boolean).join('\n'); }
      out.push(`<div class="rule-callout ${type}"><span class="callout-icon" aria-hidden="true">${icon}</span><div><strong>${escapeHTML(title)}</strong>${body ? `<div>${renderMarkdown(body)}</div>` : ''}</div></div>`);
      quoteLines = [];
    };
    const flushCode = () => {
      if (!codeLines.length) return;
      out.push(`<pre><code>${escapeHTML(codeLines.join('\n'))}</code></pre>`);
      codeLines = [];
    };
    const splitTable = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
    const isTableDivider = line => splitTable(line).length > 0 && splitTable(line).every(cell => /^:?-{3,}:?$/.test(cell));
    const flushTable = () => {
      if (tableRows.length >= 2 && isTableDivider(tableRows[1])) {
        const heads = splitTable(tableRows[0]);
        const rows = tableRows.slice(2).map(splitTable);
        out.push(`<div class="md-table-wrap"><table class="md-table"><thead><tr>${heads.map(h => `<th>${inlineMarkdown(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${heads.map((_, i) => `<td>${inlineMarkdown(row[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      } else tableRows.forEach(row => out.push(`<p>${inlineMarkdown(row)}</p>`));
      tableRows = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i], trimmed = line.trim(), next = (lines[i + 1] || '').trim();
      if (inCode) { if (/^```/.test(trimmed)) { flushCode(); inCode = false; } else codeLines.push(line); continue; }
      if (/^```/.test(trimmed)) { flushParagraph(); flushList(); flushQuote(); inCode = true; continue; }
      if (tableRows.length) {
        if (trimmed.includes('|') && trimmed) { tableRows.push(trimmed); continue; }
        flushTable();
      }
      if (!tableRows.length && trimmed.includes('|') && next.includes('|') && isTableDivider(next)) {
        flushParagraph(); flushList(); flushQuote(); tableRows = [trimmed]; continue;
      }
      if (trimmed.startsWith('>')) { flushParagraph(); flushList(); quoteLines.push(trimmed.replace(/^>\s?/, '')); continue; }
      if (quoteLines.length) flushQuote();
      if (!trimmed) { flushParagraph(); flushList(); continue; }
      if (/^(---+|\*\*\*+|___+)$/.test(trimmed)) { flushParagraph(); flushList(); out.push('<hr>'); continue; }
      const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (heading) { flushParagraph(); flushList(); const level = Math.min(5, heading[1].length + 2); out.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`); continue; }
      const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
      const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (unordered || ordered) {
        flushParagraph(); const nextType = ordered ? 'ol' : 'ul';
        if (listType && listType !== nextType) flushList();
        listType = nextType; listItems.push((unordered || ordered)[1]); continue;
      }
      flushList(); paragraph.push(trimmed);
    }
    flushParagraph(); flushList(); flushQuote(); flushCode(); if (tableRows.length) flushTable();
    return out.join('\n');
  }

  function applyTheme(site) {
    const theme = site.theme || {};
    const root = document.documentElement;
    const safeOverride = (key, fallback) =>
  /^#[0-9a-f]{6}$/i.test(String(theme[key] || ''))
    ? theme[key]
    : fallback;
    const variables = {
      '--accent': theme.accent || '#542287',
      '--accent-light': theme.accent_light || '#AF7AFF',
      '--background': theme.background || '#212121',
      '--surface': theme.surface || '#111111',
      '--text': theme.text || '#FFFFFF',
      '--muted': theme.muted || '#B6A9BF',
      
'--custom-header-bg': safeOverride(
  'header_bg', theme.surface || '#111111'
),
'--custom-sidebar-bg': safeOverride(
  'sidebar_bg', theme.surface || '#111111'
),
'--custom-card-bg': safeOverride(
  'card_bg', theme.surface || '#111111'
),
'--custom-glow': safeOverride(
  'glow_color', theme.accent || '#542287'
)
      
    };
    Object.entries(variables).forEach(([key, value]) => root.style.setProperty(key, value));
    // Fundo opcional independente da cor base do site.
    const backgroundAsset = assetUrl(site.background_image);
    document.body.classList.toggle('sin-city-custom-bg', Boolean(backgroundAsset));
    if (backgroundAsset) root.style.setProperty('--site-background-image', 'url("' + backgroundAsset.replace(/["\\]/g, '') + '")');
    else root.style.removeProperty('--site-background-image');
    root.style.setProperty('--muted-readable', theme.accent_light || '#AF7AFF');
    
const labelColor = theme.label_color;

if (/^#[0-9a-f]{6}$/i.test(String(labelColor || ''))) {
  root.style.setProperty('--custom-label-color', labelColor);
} else {
  root.style.removeProperty('--custom-label-color');
}

// C6.12: controles detalhados; valores vazios restauram o tema.
const detailedColors = {
  '--custom-nav-text': theme.nav_text_color,
  '--custom-action-text': theme.action_text_color,
  '--custom-content-text': theme.content_text_color,
  '--custom-rule-bold-color': theme.rule_bold_color,
  '--custom-category-panel': theme.category_panel_color,
  '--custom-nav-button': theme.navigation_button_color,
  '--custom-search-panel': theme.search_panel_color,
  '--custom-nav-highlight': theme.nav_highlight_color,
  '--custom-edge-color': theme.border_color
};
Object.entries(detailedColors).forEach(([property, value]) => {
  if (/^#[0-9a-f]{6}$/i.test(String(value || ''))) {
    root.style.setProperty(property, value);
  } else {
    root.style.removeProperty(property);
  }
});

// C6.14 — cor individual da assinatura da capa (com modo automático).
const signatureColor = theme.hero_signature_color;
if (/^#[0-9a-f]{6}$/i.test(String(signatureColor || ''))) {
  root.style.setProperty('--custom-hero-signature-color', signatureColor);
} else {
  root.style.removeProperty('--custom-hero-signature-color');
}

const scrollbarColor = theme.scrollbar_color;
if (/^#[0-9a-f]{6}$/i.test(String(scrollbarColor || ''))) {
  root.style.setProperty('--custom-scrollbar-color', scrollbarColor);
} else {
  root.style.removeProperty('--custom-scrollbar-color');
}

// C6.9: cores independentes do rodape lateral.
const sideFooterColors = {
  '--custom-side-footer-top-color': theme.side_footer_top_color,
  '--custom-side-footer-highlight-color': theme.side_footer_highlight_color,
  '--custom-side-footer-bottom-color': theme.side_footer_bottom_color
};
Object.entries(sideFooterColors).forEach(([property, value]) => {
  if (/^#[0-9a-f]{6}$/i.test(String(value || ''))) {
    root.style.setProperty(property, value);
  } else {
    root.style.removeProperty(property);
  }
});
  }

  function updateBrand(site) {
    const setText = (selector, value) => { const element = $(selector); if (element && value !== undefined) element.textContent = String(value); };
    setText('#brandTitle', (site.site_name || 'Sin City Roleplay').replace(/\s+Roleplay$/i, '').toUpperCase());
    setText('#brandSite', 'ROLEPLAY');
    setText('#heroEyebrow', site.hero_eyebrow || 'SIN CITY ROLEPLAY');
    setText('#heroTitle', site.hero_title || 'A CIDADE NÃO DORME.\nAS REGRAS MANTÊM A ORDEM.');
    setText('#heroText', site.hero_text || 'Conheça as diretrizes da cidade.');
    // C6.14 — Assinatura da capa, configurável sem alterar a marca principal.
    setText('#heroSignatureInitials', site.hero_signature_initials ?? 'SC');
    const signaturePrefix = String(site.hero_signature_prefix ?? 'EST.').trim();
    const signatureYear = String(site.hero_signature_year ?? '2026').trim();
    setText('#heroSignatureMeta', [signaturePrefix, signatureYear].filter(Boolean).join(' '));
    setText('#noticeTitle', site.notice_title || 'ANTES DE ENTRAR NA CIDADE');
    setText('#noticeText', site.notice_text || 'O desconhecimento das regras não isenta o cidadão de sua responsabilidade.');
    setText('#footerText', site.footer_text || '© 2026 Sin City Roleplay. Todos os direitos reservados.');
    setText('#sideFooterTop', site.side_footer_top ?? 'CONHEÇA AS REGRAS.');
    setText('#sideFooterHighlight', site.side_footer_highlight ?? 'ESCOLHA SEU CAMINHO.');
    setText('#sideFooterBottom', site.side_footer_bottom ?? 'SIN CITY · 2026');
    const logo = assetUrl(site.logo || './assets/sin-city-mark.svg');
    const logoEl = $('#headerLogo'); if (logoEl) { logoEl.src = logo; logoEl.alt = site.site_name || 'Sin City Roleplay'; }
    const favicon = $('#favicon');
    if (favicon) {
      const faviconURL = assetUrl(site.favicon || site.logo || './assets/sin-city-mark.svg');
      favicon.href = faviconURL;
      favicon.type = /^(data:image\/svg\+xml|.*\.svg(?:[?#].*)?$)/i.test(faviconURL) ? 'image/svg+xml'
        : /^(data:image\/png|.*\.png(?:[?#].*)?$)/i.test(faviconURL) ? 'image/png'
        : /^(data:image\/webp|.*\.webp(?:[?#].*)?$)/i.test(faviconURL) ? 'image/webp'
        : /^(data:image\/jpeg|.*\.jpe?g(?:[?#].*)?$)/i.test(faviconURL) ? 'image/jpeg'
        : /\.ico(?:[?#].*)?$/i.test(faviconURL) ? 'image/x-icon' : '';
    }
    const title = site.site_title || 'Sin City — Central de Regras'; document.title = title;
    const description = $('meta[name="description"]'); if (description) description.content = site.description || 'Central de regras da Sin City Roleplay.';
    const discord = $('#discordBtn');
    if (discord) { const url = /^https:\/\//i.test(site.discord_url || '') ? site.discord_url : ''; discord.href = url || '#'; discord.hidden = !url; }
    const heroImage = assetUrl(site.hero_image || './assets/cemetery-halloween.svg');
    const heroBackdrop = $('.hero-backdrop');
    if (heroBackdrop) {
      heroBackdrop.style.backgroundImage = heroImage ? `url("${heroImage.replace(/["\\]/g, '')}")` : 'none';
      heroBackdrop.style.display = site.layout?.show_hero_image === false ? 'none' : '';
    }
    $('#notice').hidden = site.layout?.show_notice === false;
    $('#updatesWrap').hidden = site.layout?.show_updates === false;
    $('#searchOpen').hidden = site.layout?.show_search === false;
    $('#searchPage').dataset.searchEnabled = String(site.layout?.show_search !== false);
    const cursor = site.cursor || {};
    setupCursor(cursor);
    setupAmbientParticles(cursor.falling_particles || {});
  }

  function renderNavigation() {
    const nav = $('#nav'); if (!nav) return;
    nav.innerHTML = state.data.categories.map((category, index) => {
      const id = categoryId(category, index);
      const icon = category.icon || category.subcategories?.[0]?.icon || '✦';
      const entries = [];
      (category.rules || []).forEach((rule, ri) => entries.push({ rule, si:'direct', ri, label:rule.title || rule.name || 'Regra' }));
      (category.subcategories || []).forEach((sub, si) => {
        const rules = sub.rules || [];
        if (rules.length) {
          rules.forEach((rule, ri) => entries.push({ rule, si, ri, label:stripLeadingEmoji(sub.name || rule.title || rule.name || 'Regra') || rule.title || 'Regra' }));
        } else {
          entries.push({ rule:null, si, ri:0, label:stripLeadingEmoji(sub.name || 'Capítulo'), fallbackId:`sub-${slugify(id)}-${si}-${slugify(sub.id || sub.name)}` });
        }
      });
      const items = entries.map(entry => {
        const target = entry.rule ? ruleDomId(id, entry.si, entry.ri, entry.rule) : entry.fallbackId;
        const code = entry.rule?.code || '';
        return `<button class="nav-rule-link" type="button" data-nav-rule="${escapeHTML(target)}" data-nav-category="${escapeHTML(id)}"><span class="nav-rule-code">${escapeHTML(code)}</span><span class="nav-rule-name">${escapeHTML(entry.label)}</span></button>`;
      }).join('');
      return `<section class="nav-group" data-nav-group="${escapeHTML(id)}">
        <div class="nav-category-row">
          <button class="nav-category" type="button" data-route="categoria:${escapeHTML(id)}" data-category-nav="${escapeHTML(id)}">
            <span class="nav-number">${String(index + 1).padStart(2, '0')}</span>
            <span class="nav-icon">${escapeHTML(icon)}</span>
            <span class="nav-category-name">${escapeHTML(category.short || category.name || 'Categoria')}</span>
          </button>
          <button class="nav-expand" type="button" data-toggle-category="${escapeHTML(id)}" aria-label="Expandir ${escapeHTML(category.short || category.name || 'categoria')}" aria-expanded="false" aria-controls="nav-rules-${escapeHTML(id)}"><span class="nav-chevron" aria-hidden="true">⌄</span></button>
        </div>
        <div class="nav-rule-list" id="nav-rules-${escapeHTML(id)}" hidden>${items || '<span class="nav-no-rules">Nenhum capítulo cadastrado.</span>'}</div>
      </section>`;
    }).join('');
  }

  function renderHome() {
    const grid = $('#homeCategories');
    if (grid) {
      grid.innerHTML = state.data.categories.map((category, index) => {
        const id = categoryId(category, index), count = (category.subcategories || []).reduce((total, sub) => total + Math.max(1, (sub.rules || []).length), 0) + (category.rules || []).length;
        const icon = category.icon || category.subcategories?.[0]?.icon || '✦';
        const name = category.short || category.name || 'Categoria';
        return `<button class="category-card" type="button" data-route="categoria:${escapeHTML(id)}"><span class="card-topline"><span class="card-index">${String(index + 1).padStart(2, '0')} / SC</span><span class="card-icon">${escapeHTML(icon)}</span></span><strong>${escapeHTML(name)}</strong><p>${escapeHTML(category.desc || 'Consulte as diretrizes e informações desta categoria.')}</p><span class="card-bottom"><span>${count} ${count === 1 ? 'TÓPICO' : 'TÓPICOS'}</span><span aria-hidden="true">↗</span></span></button>`;
      }).join('');
    }
    const updates = $('#updatesList');
    if (updates) {
      const items = [...(state.data.updates || [])].reverse();
      updates.innerHTML = items.length ? items.map(item => `<article class="update-card"><div class="update-meta"><span>${escapeHTML(item.date || '')}</span>${item.tag ? `<span class="update-tag">${escapeHTML(item.tag)}</span>` : ''}</div><h3>${escapeHTML(item.title || 'Atualização')}</h3><p>${escapeHTML(item.text || '')}</p></article>`).join('') : '<p class="search-empty">Nenhuma atualização cadastrada.</p>';
    }
  }

  function buildSearchIndex() {
    const result = [];
    state.data.categories.forEach((category, ci) => {
      const catId = categoryId(category, ci);
      const addRule = (rule, sub, ri, si) => {
        const ruleId = `rule-${slugify(catId)}-${si}-${ri}-${slugify(rule.code || rule.title)}`;
        result.push({
          categoryId: catId, category: category.short || category.name || 'Categoria',
          subcategory: sub?.name || category.short || 'Geral', ruleId,
          code: rule.code || '', title: rule.title || rule.name || 'Regra sem título', text: cleanLegacyEntities(rule.text || '')
        });
      };
      (category.rules || []).forEach((rule, ri) => addRule(rule, null, ri, 'direct'));
      (category.subcategories || []).forEach((sub, si) => (sub.rules || []).forEach((rule, ri) => addRule(rule, sub, ri, si)));
    });
  state.searchIndex = result.map(item => ({
  ...item,
  searchText: `${item.code} ${item.title} ${item.category} ${item.subcategory} ${item.text}`.toLocaleLowerCase('pt-BR'),
  titleSearch: item.title.toLocaleLowerCase('pt-BR'),
  codeSearch: item.code.toLocaleLowerCase('pt-BR'),
  subcategorySearch: item.subcategory.toLocaleLowerCase('pt-BR')
}));
  
  }

  function renderRuleCard(rule, categoryIdValue, si, ri, subName) {
    const id = ruleDomId(categoryIdValue, si, ri, rule);
    return `<article class="rule-card" id="${id}"><header class="rule-card-head"><div class="rule-card-title">${rule.code ? `<span class="rule-code">${escapeHTML(rule.code)}</span>` : ''}<h3>${escapeHTML(rule.title || 'Regra sem título')}</h3></div>${rule.tag ? `<span class="rule-tag">${escapeHTML(rule.tag)}</span>` : ''}</header><div class="rule-content">${renderMarkdown(rule.text || '')}</div></article>`;
  }

  function renderCategory(category) {
    const ci = state.data.categories.findIndex((item, index) => categoryId(item, index) === state.categoryId);
    if (ci < 0) { navigate('inicio', true); return; }
    const indexLabel = String(ci + 1).padStart(2, '0');
    const icon = category.icon || category.subcategories?.[0]?.icon || '✦';
    $('#catCode').textContent = `CATEGORIA ${indexLabel} / SIN CITY`;
    $('#catTitle').textContent = category.short || category.name || 'Categoria';
    $('#catDesc').textContent = category.desc || 'Consulte as regras e orientações desta área da cidade.';
    $('#catIcon').textContent = icon;

    const entries = [];
    (category.subcategories || []).forEach((sub, si) => {
      (sub.rules || []).forEach((rule, ri) => entries.push({ rule, si, ri }));
    });
    (category.rules || []).forEach((rule, ri) => entries.push({ rule, si:'direct', ri }));
    $('#ruleList').innerHTML = entries.map(({rule, si, ri}) => renderRuleCard(rule, categoryId(category, ci), si, ri)).join('') || '<p class="search-empty">Esta categoria ainda não possui regras cadastradas.</p>';
    const toc = $('#tocItems');
    if (toc) toc.innerHTML = '';
    const tocPanel = $('#ruleToc');
    if (tocPanel) tocPanel.hidden = true;
    renderCategoryNavigation(ci);
    observeRules();
  }

  function renderCategoryNavigation(index) {
    const previous = state.data.categories[index - 1], next = state.data.categories[index + 1];
    const previousId = previous ? categoryId(previous, index - 1) : '';
    const nextId = next ? categoryId(next, index + 1) : '';
    const html = `${previous ? `<button type="button" data-route="categoria:${escapeHTML(previousId)}"><span>← CATEGORIA ANTERIOR</span>${escapeHTML(previous.short || previous.name)}</button>` : '<span></span>'}${next ? `<button type="button" data-route="categoria:${escapeHTML(nextId)}"><span>PRÓXIMA CATEGORIA →</span>${escapeHTML(next.short || next.name)}</button>` : '<span></span>'}`;
    $('#categoryNavigation').innerHTML = html;
  }

  function setActiveNavigation(route) {
    $$('.nav-category').forEach(button => {
      const active = button.dataset.categoryNav === state.categoryId && route === 'category';
      button.classList.toggle('active', active);
    });
    $$('.nav-group').forEach(group => {
      const isCurrent = group.dataset.navGroup === state.categoryId && route === 'category';
      if (isCurrent) setCategoryExpanded(group, true);
    });
    const home = $('.side-home'); if (home) home.classList.toggle('active', route === 'home');
  }

  function setCategoryExpanded(group, expanded) {
    if (!group) return;
    const list = $('.nav-rule-list', group);
    const toggle = $('[data-toggle-category]', group);
    group.classList.toggle('expanded', expanded);
    if (list) list.hidden = !expanded;
    if (toggle) toggle.setAttribute('aria-expanded', String(expanded));
  }

  function navigate(route, replace = false, targetRule = '') {
    if (!route || route === 'inicio') {
      state.categoryId = null; showPage('#inicio'); setActiveNavigation('home');
      if (!replace) history.pushState({route:'inicio'}, '', '#inicio');
    } else if (route === 'pesquisa') {
      if (state.site?.layout?.show_search === false) return;
      state.categoryId = null; showPage('#searchPage'); setActiveNavigation('search');
      if (!replace) history.pushState({route:'pesquisa'}, '', '#pesquisa');
      requestAnimationFrame(() => $('#searchInput')?.focus());
    } else if (route.startsWith('categoria:')) {
      const id = route.slice('categoria:'.length);
      const category = state.data.categories.find((item, index) => categoryId(item, index) === id);
      if (!category) return;
      state.categoryId = id; renderCategory(category); showPage('#categoryPage'); setActiveNavigation('category');
      if (!replace) history.pushState({route}, '', `#categoria/${encodeURIComponent(id)}`);
      if (targetRule) requestAnimationFrame(() => document.getElementById(targetRule)?.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block:'start'}));
    }
    closeMobileNav();
  }

  function showPage(selector) {
    $$('.page').forEach(page => page.classList.toggle('active', `#${page.id}` === selector));
    window.scrollTo({top:0, behavior: reduceMotion ? 'auto' : 'smooth'});
  }

  function handleHash() {
    const hash = decodeURIComponent(location.hash || '#inicio');
    if (hash.startsWith('#categoria/')) navigate(`categoria:${hash.slice('#categoria/'.length)}`, true);
    else if (hash === '#pesquisa') navigate('pesquisa', true);
    else navigate('inicio', true);
  }

  function createSearchMarkup(item, query, compact = false) {
    const source = cleanLegacyEntities(item.text).replace(/[#>*_`|\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
    const queryIndex = source.toLocaleLowerCase('pt-BR').indexOf(query.toLocaleLowerCase('pt-BR'));
    const start = queryIndex > 42 ? queryIndex - 42 : 0;
    const snippet = source ? (start ? '…' : '') + source.slice(start, start + 190) + (source.length > start + 190 ? '…' : '') : 'Abra para consultar o conteúdo completo desta regra.';
    const label = `${item.category} / ${item.subcategory}`;
    return `<button class="search-result" type="button" data-result-category="${escapeHTML(item.categoryId)}" data-result-rule="${escapeHTML(item.ruleId)}"><div class="search-result-meta"><span>${escapeHTML(item.code || 'REGRA')}</span><span>•</span><span>${escapeHTML(label)}</span></div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(snippet)}</p></button>`;
  }

  function renderSearch(query, targetSelector) {
    const target = $(targetSelector); if (!target) return;
    const q = String(query || '').trim();
    if (!q) { target.innerHTML = '<p class="search-empty">Digite um termo, código ou assunto para pesquisar no regulamento.</p>'; return; }
    const normalized = q.toLocaleLowerCase('pt-BR');
    
  const matches = state.searchIndex.map(item => {
  const score =
    (item.titleSearch.includes(normalized) ? 5 : 0) +
    (item.codeSearch.includes(normalized) ? 4 : 0) +
    (item.subcategorySearch.includes(normalized) ? 2 : 0) +
    (item.searchText.includes(normalized) ? 1 : 0);

  return {item, score};
}).filter(entry => entry.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 40);
  
    target.innerHTML = matches.length ? matches.map(({item}) => createSearchMarkup(item, q)).join('') : '<p class="search-empty">Nenhuma regra encontrada. Experimente outro termo ou código.</p>';
  }


  // C1.2 - Suavizar a digitação na pesquisa
  let searchTimer = null;

  function scheduleSearch(value, targetSelector) {
    clearTimeout(searchTimer);

    if (!String(value).trim()) {
      renderSearch('', targetSelector);
      return;
    }

    searchTimer = setTimeout(() => {
      renderSearch(value, targetSelector);
    }, 120);
  }

  
  function openSearchOverlay() {
    const overlay = $('#searchOverlay'); if (!overlay || overlay.hidden) { if (overlay) overlay.hidden = false; }
    $('#overlaySearch').value = ''; renderSearch('', '#overlayResults');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => $('#overlaySearch')?.focus());
  }

function closeSearchOverlay() {
  clearTimeout(searchTimer);

  const overlay = $('#searchOverlay');
  if (overlay) overlay.hidden = true;

  document.body.style.overflow = '';
  $('#searchOpen')?.focus();
}

  function setupCursor(config = {}) {
    const enabled = config.enabled === true && !reduceMotion && !touchPointer;
    const trailEnabled = config.trail_enabled === true && enabled;
    const root = document.documentElement;
    root.classList.toggle('sin-city-cursor-enabled', enabled);
    const cursor = $('#customCursor');
    const image = cursor ? $('img', cursor) : null;
    if (image && config.image) image.src = assetUrl(config.image);
    if (cursor) {
      const size = Math.max(24, Math.min(64, Number(config.size) || 38));
      cursor.style.width = `${size}px`;
      cursor.style.height = `${size}px`;
      cursor.style.marginLeft = `${-Math.round(size * .22)}px`;
      cursor.style.marginTop = `${-Math.round(size * .2)}px`;
    }
    cursorConfig = {
      enabled,
      trailEnabled,
      color: config.trail_color || '#2D1243',
      count: Math.max(6, Math.min(30, Number(config.trail_count) || 16))
    };
    root.style.setProperty('--trail-color', cursorConfig.color);
    
const cursorGlow = config.glow_color;

if (/^#[0-9a-f]{6}$/i.test(String(cursorGlow || ''))) {
  root.style.setProperty('--cursor-glow-color', cursorGlow);
} else {
  root.style.removeProperty('--cursor-glow-color');
}

    if (!cursorListenersAttached) {
      cursorListenersAttached = true;
      let lastTrail = 0, previousX = 0, previousY = 0, trailNodes = [];
      window.addEventListener('pointermove', event => {
        if (!cursorConfig.enabled || event.pointerType !== 'mouse') return;
        if (cursor) cursor.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`;
        const now = performance.now();
        if (cursorConfig.trailEnabled && now - lastTrail > 24) {
          lastTrail = now;
          const dot = document.createElement('span'); dot.className = 'cursor-trail';
          const dx = event.clientX - previousX, dy = event.clientY - previousY;
          const size = Math.max(4, Math.min(12, 5 + Math.hypot(dx, dy) * .11));
          dot.style.left = `${event.clientX}px`; dot.style.top = `${event.clientY}px`;
          dot.style.width = `${size}px`; dot.style.height = `${size}px`;
          document.body.appendChild(dot); trailNodes.push(dot);
          dot.addEventListener('animationend', () => { dot.remove(); trailNodes = trailNodes.filter(node => node !== dot); }, { once:true });
          while (trailNodes.length > cursorConfig.count) trailNodes.shift()?.remove();
        }
        previousX = event.clientX; previousY = event.clientY;
      }, { passive:true });
      document.addEventListener('pointerover', event => {
        if (event.target.closest('a,button,input,[role="button"]')) cursor?.classList.add('hovering');
        else cursor?.classList.remove('hovering');
      }, { passive:true });
    }
  }


function setupAmbientParticles(config = {}) {
  const host = $('#ambientParticles');
  if (!host) return;

  host.innerHTML = '';
  if (config.enabled === false || reduceMotion) return;

  const rawCount = config.count;
  const parsedCount = rawCount === '' || rawCount === null || rawCount === undefined
    ? 14
    : Number(rawCount);

  const count = Math.max(
    0,
    Math.min(28, Math.trunc(Number.isFinite(parsedCount) ? parsedCount : 14))
  );

  const rawSize = config.size;
  const parsedSize = rawSize === '' || rawSize === null || rawSize === undefined
    ? 13
    : Number(rawSize);

  const size = Math.max(
    8,
    Math.min(22, Number.isFinite(parsedSize) ? parsedSize : 13)
  );

  // A cor da paleta precisa chegar a cada particula, nao so ao contêiner.
  const configuredColor = String(config.color || '').trim();
  const color = /^#[0-9a-f]{6}$/i.test(configuredColor) ? configuredColor : '#AF7AFF';
  host.style.setProperty('--ambient-particle-color', color);

  const particleSets = {
    letters: ['S', 'C'],
    logo: ['🎃'],
    spark: ['✦', '✧', '⋆', '✴'],
    mixed: ['✦', '✧', '·', '🦇', '🎃']
  };

  const symbols = particleSets[config.type] || particleSets.mixed;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('span');
    particle.className = 'ambient-particle';
    const symbol = symbols[i % symbols.length];
    // Emojis coloridos nao obedecem ao CSS color: usar icones vetoriais monocromaticos.
    if (symbol === '🎃' || symbol === '🦇') {
      particle.classList.add('ambient-particle-icon', symbol === '🎃' ? 'particle-pumpkin' : 'particle-bat');
    } else {
      particle.textContent = symbol;
    }
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.fontSize = `${size * (.65 + Math.random() * .6)}px`;
    particle.style.animationDuration = `${13 + Math.random() * 15}s`;
    particle.style.animationDelay = `${-Math.random() * 24}s`;
    particle.style.setProperty(
      '--drift',
      `${Math.round(Math.random() * 100 - 50)}px`
    );

    host.appendChild(particle);
  }
}
  function observeRules() {
    categoryObserver?.disconnect();
    categoryObserver = null;
    const cards = $$('.rule-card');
    if (!cards.length || !('IntersectionObserver' in window)) return;
    categoryObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        $$('.nav-rule-link').forEach(button => button.classList.toggle('active', button.dataset.navRule === entry.target.id));
      });
    }, {rootMargin:'-16% 0px -70% 0px'});
    cards.forEach(card => categoryObserver.observe(card));
  }

  function closeMobileNav() {
    $('#sidebar')?.classList.remove('open');
    $('#mobileMenu')?.setAttribute('aria-expanded', 'false');
  }

  function renderAll() {
    applyTheme(state.site);
    updateBrand(state.site);
    renderNavigation();
    renderHome();
    buildSearchIndex();
    if (state.categoryId) {
      const category = state.data.categories.find((item, index) => categoryId(item,index) === state.categoryId);
      if (category) renderCategory(category);
    }
  }

  async function initialize() {
    try {
      const [siteResponse, rulesResponse] = await Promise.all([
        fetch('./content/site.json', {cache:'no-store'}),
        fetch('./content/rules.json', {cache:'no-store'})
      ]);
      if (!siteResponse.ok) throw new Error(`Não foi possível carregar content/site.json (${siteResponse.status}).`);
      if (!rulesResponse.ok) throw new Error(`Não foi possível carregar content/rules.json (${rulesResponse.status}).`);
      state.site = await siteResponse.json();
      state.data = await rulesResponse.json();
      if (!Array.isArray(state.data.categories)) throw new Error('O arquivo de regras não possui a lista de categorias esperada.');
      if (!Array.isArray(state.data.updates)) state.data.updates = [];
      renderAll(); handleHash();
    } catch (error) {
      console.error(error);
      const errorBox = $('#loadError');
      if (errorBox) { errorBox.hidden = false; errorBox.textContent = `Não foi possível carregar o portal: ${error.message}. Confira se os arquivos de site/content estão publicados no GitHub Pages.`; }
    }
  }

  document.addEventListener('click', event => {
    const expandButton = event.target.closest('[data-toggle-category]');
    if (expandButton) {
      const group = expandButton.closest('.nav-group');
      setCategoryExpanded(group, !group.classList.contains('expanded'));
      return;
    }
    const navRuleButton = event.target.closest('[data-nav-rule]');
    if (navRuleButton) {
      event.preventDefault();
      navigate(`categoria:${navRuleButton.dataset.navCategory}`, false, navRuleButton.dataset.navRule);
      return;
    }
    const routeButton = event.target.closest('[data-route]');
    if (routeButton) { event.preventDefault(); navigate(routeButton.dataset.route); return; }
    const scrollButton = event.target.closest('[data-scroll-rule]');
    if (scrollButton) { document.getElementById(scrollButton.dataset.scrollRule)?.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'}); return; }
    const resultButton = event.target.closest('[data-result-category]');
    if (resultButton) { closeSearchOverlay(); navigate(`categoria:${resultButton.dataset.resultCategory}`, false, resultButton.dataset.resultRule); return; }
  });

  $('#mobileMenu')?.addEventListener('click', () => {
    const sidebar = $('#sidebar'); const opening = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', opening); $('#mobileMenu').setAttribute('aria-expanded', String(opening));
  });
  $('#searchOpen')?.addEventListener('click', openSearchOverlay);
  $('#searchClose')?.addEventListener('click', closeSearchOverlay);
  $('#searchScrim')?.addEventListener('click', closeSearchOverlay);

  $('#overlaySearch')?.addEventListener('input', event =>
    scheduleSearch(event.target.value, '#overlayResults')
  );

  $('#searchInput')?.addEventListener('input', event =>
    scheduleSearch(event.target.value, '#searchResults')
  );

$('#searchInput')?.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    clearTimeout(searchTimer);
    renderSearch(event.target.value, '#searchResults');
  }
});
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('#searchOverlay').hidden) closeSearchOverlay();
    if (event.key === '/' && !/input|textarea/i.test(document.activeElement?.tagName || '') && $('#searchOverlay').hidden && !$('#searchOpen').hidden) { event.preventDefault(); openSearchOverlay(); }
  });
  window.addEventListener('popstate', handleHash);
  window.addEventListener('hashchange', handleHash);

  // O editor visual envia dados temporários para a prévia do iframe, sem gravar nada no visitante.
  window.addEventListener('message', event => {
  if (
    event.source !== window.parent ||
    event.origin !== location.origin ||
    !event.data ||
    event.data.type !== 'sin-city-preview'
  ) return;
    if (event.data.site && event.data.data) {
      state.site = event.data.site;
      state.data = event.data.data;
      if (!Array.isArray(state.data.categories)) state.data.categories = [];
      if (!Array.isArray(state.data.updates)) state.data.updates = [];
      renderAll();
    }
  });

  initialize();
})();
