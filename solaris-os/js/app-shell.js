/**
 * ============================================================================
 * SOLARIS OS — APP SHELL (sidebar + topbar), compartilhado por todas as páginas
 * ============================================================================
 * Cada página interna define no <body data-page="dashboard"> qual item do menu
 * fica ativo, e chama AppShell.mount({ title, breadcrumb }) no seu próprio JS.
 */

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high', href: 'dashboard.html' },
  { key: 'ordens', label: 'Ordens de Serviço', icon: 'fa-screwdriver-wrench', href: 'ordens-servico.html' },
  { key: 'clientes', label: 'Clientes', icon: 'fa-users', href: 'clientes.html' },
  { key: 'estoque', label: 'Estoque', icon: 'fa-boxes-stacked', href: 'estoque.html' },
  { key: 'compras', label: 'Compras', icon: 'fa-cart-shopping', href: 'compras.html' },
  { key: 'equipe', label: 'Equipe', icon: 'fa-people-group', href: 'equipe.html' },
  { key: 'financeiro', label: 'Financeiro', icon: 'fa-sack-dollar', href: 'financeiro.html' },
  { key: 'relatorios', label: 'Relatórios', icon: 'fa-chart-column', href: 'relatorios.html' },
  { key: 'configuracoes', label: 'Configurações', icon: 'fa-gear', href: 'configuracoes.html' },
];

const AppShell = {
  mount({ title, breadcrumb }) {
    const session = requireAuth();
    if (!session) return;

    const activeKey = document.body.dataset.page;
    const base = getBasePath();

    document.body.insertAdjacentHTML('afterbegin', `
      <div id="loading-screen"><div class="sun-loader"><div class="ring"></div><div class="core"></div></div></div>
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    `);

    const navHtml = MENU_ITEMS.map((item) => `
      <a href="${base ? '' : 'pages/'}${item.href}" class="nav-link ${item.key === activeKey ? 'active' : ''}" title="${item.label}">
        <i class="fa-solid ${item.icon}"></i><span>${item.label}</span>
      </a>`).join('');

    const cfg = window.SOLARIS_CONFIG || {};
    const brandName = cfg.brandName || 'Solaris OS';
    const brandTagline = cfg.brandTagline || 'ENERGIA SOLAR';
    const logoInner = cfg.logoUrl
      ? `<img src="${cfg.logoUrl}" alt="${brandName}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`
      : `<i class="fa-solid fa-solar-panel"></i>`;
    document.title = document.title.replace('Solaris OS', brandName);

    const sidebarHtml = `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-toggle-desktop" id="sidebar-collapse-btn"><i class="fa-solid fa-chevron-left"></i></div>
        <div class="brand-row">
          <div class="logo-mark">${logoInner}</div>
          <div class="brand-text"><strong>${Utils.escapeHtml(brandName)}</strong><span>${Utils.escapeHtml(brandTagline)}</span></div>
        </div>
        <nav class="sidebar-nav">${navHtml}</nav>
        <div class="sidebar-foot">
          <a href="#" class="nav-link" id="logout-btn"><i class="fa-solid fa-right-from-bracket"></i><span>Sair</span></a>
        </div>
      </aside>`;

    const topbarHtml = `
      <header class="topbar">
        <div class="d-flex align-items-center gap-3">
          <button class="icon-btn d-lg-none" id="mobile-menu-btn"><i class="fa-solid fa-bars"></i></button>
          <div class="topbar-search d-none d-md-block">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="global-search" placeholder="Pesquisar clientes, OS, produtos...">
          </div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button class="icon-btn" id="theme-toggle-btn" title="Alternar tema"><i class="fa-solid fa-moon"></i></button>
          <button class="icon-btn" title="Notificações"><i class="fa-solid fa-bell"></i><span class="dot"></span></button>
          <div class="user-chip dropdown">
            <div class="avatar">${Utils.initials(session.nome)}</div>
            <div class="who d-none d-sm-block"><strong>${Utils.escapeHtml(session.nome)}</strong><span>${Utils.escapeHtml(session.cargo || 'Usuário')}</span></div>
          </div>
        </div>
      </header>`;

    const main = document.createElement('div');
    main.className = 'main-area';
    main.innerHTML = `${topbarHtml}<main class="page-content" id="page-content-wrap"></main>`;

    // Move existing page body content into the new main content area
    const existing = document.getElementById('page-body');
    document.body.insertAdjacentHTML('beforeend', sidebarHtml);
    document.body.appendChild(main);
    if (existing) {
      main.querySelector('#page-content-wrap').innerHTML = `
        <div class="breadcrumb-row fade-in">
          <div>
            <nav aria-label="breadcrumb"><ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="${base ? '' : 'pages/'}dashboard.html" class="text-decoration-none">Início</a></li>
              <li class="breadcrumb-item active">${breadcrumb || title}</li>
            </ol></nav>
            <h1>${title}</h1>
          </div>
          <div id="page-actions"></div>
        </div>
        <div id="page-body-slot"></div>
      `;
      main.querySelector('#page-body-slot').appendChild(existing);
      existing.removeAttribute('hidden');
      existing.classList.add('fade-in');
    }

    AppShell.bindEvents();
    AppShell.applyStoredTheme();

    setTimeout(() => {
      const ls = document.getElementById('loading-screen');
      if (ls) ls.classList.add('hide');
      setTimeout(() => ls && ls.remove(), 500);
    }, 350);
  },

  bindEvents() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      backdrop.classList.add('show');
      document.body.style.overflow = 'hidden';
    });
    backdrop?.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('show');
      document.body.style.overflow = '';
    });
    // Fecha o menu automaticamente ao navegar (evita ficar "preso" aberto ao voltar)
    sidebar?.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('show');
        document.body.style.overflow = '';
      });
    });
    document.getElementById('sidebar-collapse-btn')?.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const icon = document.querySelector('#sidebar-collapse-btn i');
      icon.classList.toggle('fa-chevron-left');
      icon.classList.toggle('fa-chevron-right');
      localStorage.setItem('solaris_sidebar_collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
    });
    if (localStorage.getItem('solaris_sidebar_collapsed') === '1') {
      sidebar.classList.add('collapsed');
      document.querySelector('#sidebar-collapse-btn i')?.classList.replace('fa-chevron-left', 'fa-chevron-right');
    }

    document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      const ok = await Utils.confirm({ title: 'Sair do sistema', message: 'Deseja encerrar sua sessão?', confirmText: 'Sair', danger: false });
      if (ok) {
        sessionStorage.removeItem('solaris_session');
        localStorage.removeItem('solaris_session');
        window.location.href = getBasePath() + 'index.html';
      }
    });

    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
      const html = document.documentElement;
      const isDark = html.getAttribute('data-theme') === 'dark';
      html.setAttribute('data-theme', isDark ? 'light' : 'dark');
      localStorage.setItem('solaris_theme', isDark ? 'light' : 'dark');
      const icon = document.querySelector('#theme-toggle-btn i');
      icon.className = `fa-solid ${isDark ? 'fa-moon' : 'fa-sun'}`;
    });

    const searchInput = document.getElementById('global-search');
    searchInput?.addEventListener('input', Utils.debounce((e) => {
      document.dispatchEvent(new CustomEvent('solaris:globalsearch', { detail: e.target.value }));
    }, 200));
  },

  applyStoredTheme() {
    const theme = localStorage.getItem('solaris_theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.querySelector('#theme-toggle-btn i');
    if (icon) icon.className = `fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`;
  },

  setPageActions(html) {
    const el = document.getElementById('page-actions');
    if (el) el.innerHTML = html;
  },
};

// Apply theme immediately (before mount) to avoid flash of wrong theme.
(function () {
  const theme = localStorage.getItem('solaris_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
})();
