/* DX Studios — C11.0.1
 * Camada visual/semântica isolada. Não altera dados, publicação, regras ou preview.
 */
'use strict';

window.DXStudiosShell = (function () {
  const VERSION = 'C11.0.1';

  function ensureStylesheet() {
    if (document.querySelector('link[data-dx-studios-shell]')) return true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './c11-dx-shell.css';
    link.dataset.dxStudiosShell = VERSION;
    document.head.appendChild(link);
    return true;
  }

  function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
    return el;
  }

  function labelNav(button, text, title) {
    if (!button) return;
    const label = button.querySelector('.nav-label');
    if (label) label.textContent = text;
    button.title = title || text;
    button.setAttribute('aria-label', title || text);
  }

  function applyBranding() {
    document.title = 'DX Studios • Central de Regras';

    setText('.topbar .brand-mark', 'DX');
    setText('.topbar .brand h1', 'DX STUDIOS');
    setText('.topbar .brand p', 'Central de regras e conteúdo');

    setText('.studio-nav-mark', 'DX');
    setText('.studio-nav-heading-label', 'STUDIOS');

    const nav = document.getElementById('studioNav');
    const dashboard = nav?.querySelector('[data-tab="dashboard"]');
    const site = nav?.querySelector('[data-tab="site"]');
    const rules = nav?.querySelector('[data-tab="rules"]');
    const themes = nav?.querySelector('[data-nav-key="themes"]');
    const media = nav?.querySelector('[data-nav-key="media"]');
    const diagnostics = nav?.querySelector('[data-tab="diagnostics"]');

    labelNav(dashboard, 'Início', 'Início do DX Studios');
    labelNav(rules, 'Gerenciar Regras', 'Gerenciar regras');
    labelNav(site, 'Configurar o Site', 'Configurar o site');
    labelNav(themes, 'Biblioteca de Temas', 'Biblioteca de temas');
    labelNav(media, 'Central de Imagens', 'Central de imagens');
    labelNav(diagnostics, 'Segurança e Diagnóstico', 'Segurança e diagnóstico');

    const captions = nav ? [...nav.querySelectorAll('.studio-nav-caption')] : [];
    if (captions[0]) captions[0].textContent = 'EDITOR DE CONTEÚDO';
    if (captions[1]) captions[1].textContent = 'FERRAMENTAS';

    const navNote = nav?.querySelector('.studio-nav-note');
    if (navNote) navNote.textContent = 'DX STUDIOS · C11';

    const toggle = document.getElementById('toggleNavBtn');
    if (toggle) {
      const label = toggle.querySelector('.nav-label');
      if (label && !label.textContent.trim()) label.textContent = 'Expandir navegação';
    }
  }

  function applyDashboardCopy() {
    setText('.dashboard-hero .dashboard-eyebrow', 'CENTRAL DE CONTROLE · DX STUDIOS');
    setText('#dashboardTitle', 'Seu Studio, do seu jeito.');

    const intro = document.querySelector('.dashboard-hero-copy > p:not(.dashboard-eyebrow)');
    if (intro) intro.textContent = 'Gerencie regras, aparência, imagens e ferramentas do projeto em uma central mais organizada e confortável.';

    const mark = document.querySelector('.dashboard-hero-mark');
    if (mark) {
      const main = mark.querySelector('span');
      const small = mark.querySelector('small');
      if (main) main.textContent = 'DX';
      if (small) small.textContent = 'STUDIOS';
      mark.setAttribute('aria-label', 'DX Studios');
    }

    const shortcuts = [...document.querySelectorAll('.dashboard-shortcut')];
    shortcuts.forEach(button => {
      const copy = button.querySelector('.shortcut-copy strong')?.textContent?.trim();
      if (copy === 'Configurar o site') button.dataset.dxOrder = '2';
      if (copy === 'Gerenciar regras') button.dataset.dxOrder = '1';
      if (copy === 'Biblioteca de temas') button.dataset.dxOrder = '3';
      if (copy === 'Central de imagens') button.dataset.dxOrder = '4';
      if (copy === 'Segurança e diagnóstico') button.dataset.dxOrder = '5';
    });

    const roadmap = document.querySelector('.dashboard-roadmap');
    if (roadmap) {
      const eyebrow = roadmap.querySelector('.dashboard-eyebrow');
      const title = roadmap.querySelector('h3');
      const text = roadmap.querySelector('p:not(.dashboard-eyebrow)');
      const tags = roadmap.querySelector('.dashboard-roadmap-tags');
      if (eyebrow) eyebrow.textContent = 'DX STUDIOS';
      if (title) title.textContent = 'Uma base estável para as próximas evoluções.';
      if (text) text.textContent = 'A nova interface será construída por etapas, preservando os recursos que já funcionam.';
      if (tags) tags.innerHTML = '<span>Dashboard</span><span>Preview inteligente</span><span>Editor avançado</span>';
    }
  }

  function addCrownMark() {
    const heroMark = document.querySelector('.dashboard-hero-mark');
    if (!heroMark || heroMark.querySelector('.dx-crown')) return;
    const crown = document.createElement('span');
    crown.className = 'dx-crown';
    crown.setAttribute('aria-hidden', 'true');
    crown.textContent = '♕';
    heroMark.prepend(crown);
  }

  function install() {
    const shell = document.querySelector('.shell');
    if (!shell) return false;

    ensureStylesheet();
    document.documentElement.dataset.dxStudios = VERSION;
    document.body.classList.add('dx-studios');
    shell.classList.add('dx-shell');

    applyBranding();
    applyDashboardCopy();
    addCrownMark();

    return true;
  }

  ensureStylesheet();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, {once:true});
  } else {
    install();
  }

  return {version: VERSION, install, ensureStylesheet};
})();
