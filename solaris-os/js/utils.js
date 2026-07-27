/**
 * ============================================================================
 * SOLARIS OS — UTILITÁRIOS COMPARTILHADOS
 * ============================================================================
 */

const Utils = {
  uid() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  },

  formatMoney(v) {
    return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  formatDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = String(iso).slice(0, 10).split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  },

  initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  },

  debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },

  escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  },

  /** Toast Bootstrap 5, empilhável, no canto inferior direito. */
  toast(message, type = 'success') {
    const icons = {
      success: 'fa-circle-check',
      danger: 'fa-circle-exclamation',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info',
    };
    let container = document.getElementById('toast-stack');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-stack';
      container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      container.style.zIndex = 2000;
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast align-items-center border-0 toast-${type}`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `
      <div class="d-flex">
        <div class="toast-body"><i class="fa-solid ${icons[type] || icons.info} me-2"></i>${Utils.escapeHtml(message)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>`;
    container.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 3500 });
    t.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  },

  /** Modal de confirmação assíncrono (substitui window.confirm). Retorna Promise<boolean>. */
  confirm({ title = 'Confirmar ação', message = 'Tem certeza?', confirmText = 'Confirmar', danger = true } = {}) {
    return new Promise((resolve) => {
      let modalEl = document.getElementById('confirm-modal');
      if (modalEl) modalEl.remove();
      modalEl = document.createElement('div');
      modalEl.id = 'confirm-modal';
      modalEl.className = 'modal fade';
      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content glass-modal">
            <div class="modal-header border-0">
              <h5 class="modal-title">${Utils.escapeHtml(title)}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">${Utils.escapeHtml(message)}</div>
            <div class="modal-footer border-0">
              <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-modal-ok">${Utils.escapeHtml(confirmText)}</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modalEl);
      const bsModal = new bootstrap.Modal(modalEl);
      let resolved = false;
      modalEl.querySelector('#confirm-modal-ok').addEventListener('click', () => {
        resolved = true;
        bsModal.hide();
        resolve(true);
      });
      modalEl.addEventListener('hidden.bs.modal', () => {
        modalEl.remove();
        if (!resolved) resolve(false);
      });
      bsModal.show();
    });
  },

  /** Marcação de status -> classe de cor do sistema (sun-status). */
  statusColor(status) {
    const map = {
      'Pendente': 'amber', 'Em andamento': 'blue', 'Concluída': 'green', 'Atrasada': 'red',
      'Ativo': 'green', 'Em instalação': 'blue', 'Concluído': 'green', 'Inativo': 'red',
      'ok': 'green', 'baixo': 'amber', 'zerado': 'red',
    };
    return map[status] || 'blue';
  },

  /** Monta um link de busca no Google Maps a partir de um endereço em texto. */
  buildMapsLink(query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  },

  /** Monta um link de navegação no Waze a partir de um endereço em texto. */
  buildWazeLink(query) {
    return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
  },

  /**
   * Retorna o link de localização de um cliente, respeitando o app preferido
   * (Maps ou Waze). Se o cliente tiver um link personalizado salvo, ele tem
   * prioridade; caso contrário, o link é gerado a partir do endereço/cidade.
   */
  clienteLocationLink(cliente) {
    if (cliente.mapsLink && /^https?:\/\//i.test(cliente.mapsLink)) return cliente.mapsLink;
    const query = [cliente.endereco, cliente.cidade].filter(Boolean).join(', ') || cliente.nome;
    return cliente.localizacaoTipo === 'waze' ? Utils.buildWazeLink(query) : Utils.buildMapsLink(query);
  },

  /** Monta um link wa.me para compartilhar uma mensagem via WhatsApp. Se um telefone (BR) for passado, abre já na conversa com esse número. */
  whatsappShareLink(texto, telefone) {
    const digits = (telefone || '').replace(/\D/g, '');
    const numero = digits ? (digits.length <= 11 ? '55' + digits : digits) : '';
    const base = numero ? `https://wa.me/${numero}` : 'https://wa.me/';
    return `${base}?text=${encodeURIComponent(texto)}`;
  },

  /** Abre em nova aba a mensagem pronta no WhatsApp com o endereço/localização de um cliente. */
  compartilharLocalizacaoCliente(cliente, opts = {}) {
    const link = Utils.clienteLocationLink(cliente);
    const appNome = cliente.localizacaoTipo === 'waze' ? 'Waze' : 'Google Maps';
    const linhas = [
      `📍 *${cliente.nome}*`,
      [cliente.endereco, cliente.cidade].filter(Boolean).join(', '),
      opts.extra || '',
      `Abrir no ${appNome}: ${link}`,
    ].filter(Boolean);
    window.open(Utils.whatsappShareLink(linhas.join('\n')), '_blank');
  },

  emptyState(icon, title, subtitle) {
    return `
      <div class="empty-state text-center py-5">
        <div class="empty-state-icon"><i class="fa-solid ${icon}"></i></div>
        <h6 class="mt-3 mb-1">${Utils.escapeHtml(title)}</h6>
        <p class="text-muted small mb-0">${Utils.escapeHtml(subtitle || '')}</p>
      </div>`;
  },

  /** Filtra uma lista de objetos por texto livre em campos indicados. */
  searchFilter(list, term, fields) {
    if (!term) return list;
    const t = term.toLowerCase();
    return list.filter((item) => fields.some((f) => String(item[f] || '').toLowerCase().includes(t)));
  },

  qs(id) {
    return document.getElementById(id);
  },
};

/** Requer sessão ativa — redireciona ao login se não houver usuário logado. */
function requireAuth() {
  const session = sessionStorage.getItem('solaris_session') || localStorage.getItem('solaris_session');
  if (!session) {
    window.location.href = getBasePath() + 'index.html';
    return null;
  }
  return JSON.parse(session);
}

/** Calcula o prefixo relativo até a raiz, funciona em /pages/*.html e /index.html */
function getBasePath() {
  return window.location.pathname.includes('/pages/') ? '../' : '';
}
