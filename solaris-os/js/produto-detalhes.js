/**
 * ============================================================================
 * SOLARIS OS — DETALHES DO PRODUTO
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Seed.run();
  const id = new URLSearchParams(window.location.search).get('id');
  const p = await DB.find('produtos', id);

  AppShell.mount({ title: p ? p.nome : 'Produto não encontrado', breadcrumb: 'Estoque / Detalhes' });

  const container = document.getElementById('produto-detalhes-content');
  if (!p) {
    container.innerHTML = Utils.emptyState('fa-triangle-exclamation', 'Produto não encontrado', 'Ele pode ter sido removido do estoque.');
    return;
  }

  const historico = (await DB.get('movimentacoes')).filter((m) => m.produtoId === p.id).sort((a, b) => new Date(b.data) - new Date(a.data));
  const entradas = historico.filter((m) => m.tipo === 'entrada');
  const saidas = historico.filter((m) => m.tipo === 'saida');
  const se = p.quantidade === 0 ? 'vermelho' : p.quantidade <= p.minimo ? 'amarelo' : 'verde';

  container.innerHTML = `
    <div class="row g-3">
      <div class="col-lg-4">
        <div class="card-solaris p-3 text-center">
          <div style="height:220px;border-radius:12px;background:linear-gradient(135deg,var(--blue-50),var(--yellow-100));display:flex;align-items:center;justify-content:center;color:var(--blue-700);font-size:3.5rem;overflow:hidden">
            ${p.imagem ? `<img src="${p.imagem}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">` : `<i class="fa-solid fa-solar-panel"></i>`}
          </div>
          <h5 class="mt-3 mb-0">${Utils.escapeHtml(p.nome)}</h5>
          <div class="text-muted small mb-2" style="font-family:var(--font-mono)">${Utils.escapeHtml(p.codigo)}</div>
          <span class="status-pill ${se === 'verde' ? 'green' : se === 'amarelo' ? 'amber' : 'red'} mx-auto"><span class="ray"></span>Estoque ${se}</span>
        </div>
      </div>

      <div class="col-lg-8">
        <div class="row g-3">
          <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-icon tone-blue"><i class="fa-solid fa-cubes"></i></div><div class="kpi-content"><div class="kpi-value">${p.quantidade}</div><div class="kpi-label">Em estoque</div></div></div></div>
          <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-icon tone-amber"><i class="fa-solid fa-gauge-simple"></i></div><div class="kpi-content"><div class="kpi-value">${p.minimo}</div><div class="kpi-label">Estoque mínimo</div></div></div></div>
          <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-icon tone-green"><i class="fa-solid fa-tag"></i></div><div class="kpi-content"><div class="kpi-value">${Utils.formatMoney(p.valor)}</div><div class="kpi-label">Valor unitário</div></div></div></div>
          <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-icon tone-yellow"><i class="fa-solid fa-warehouse"></i></div><div class="kpi-content"><div class="kpi-value">${Utils.formatMoney(p.quantidade * p.valor)}</div><div class="kpi-label">Valor total</div></div></div></div>
        </div>

        <div class="card-solaris p-3 mt-3">
          <h6 class="mb-3">Descrição e informações</h6>
          <div class="row g-2 small">
            <div class="col-md-4"><span class="text-muted">Categoria:</span> ${Utils.escapeHtml(p.categoria)}</div>
            <div class="col-md-4"><span class="text-muted">Fornecedor:</span> ${Utils.escapeHtml(p.fornecedor)}</div>
            <div class="col-md-4"><span class="text-muted">Local do estoque:</span> ${Utils.escapeHtml(p.local || '—')}</div>
            <div class="col-md-4"><span class="text-muted">Última compra:</span> ${Utils.formatDate(p.ultimaCompra)}</div>
            <div class="col-md-4"><span class="text-muted">Última utilização:</span> ${Utils.formatDate(p.ultimaUtilizacao)}</div>
          </div>
          ${p.observacoes ? `<hr><p class="small mb-0">${Utils.escapeHtml(p.observacoes)}</p>` : ''}
        </div>
      </div>

      <div class="col-md-6">
        <div class="card-solaris p-3">
          <h6 class="mb-3"><i class="fa-solid fa-arrow-down text-success me-1"></i> Entradas</h6>
          ${entradas.length ? entradas.map((m) => `<div class="d-flex justify-content-between border-bottom py-2 small"><span>${Utils.formatDate(m.data)} · ${Utils.escapeHtml(m.motivo)}</span><strong>+${m.quantidade}</strong></div>`).join('') : Utils.emptyState('fa-inbox', 'Sem entradas', '')}
        </div>
      </div>
      <div class="col-md-6">
        <div class="card-solaris p-3">
          <h6 class="mb-3"><i class="fa-solid fa-arrow-up text-danger me-1"></i> Saídas</h6>
          ${saidas.length ? saidas.map((m) => `<div class="d-flex justify-content-between border-bottom py-2 small"><span>${Utils.formatDate(m.data)} · ${Utils.escapeHtml(m.motivo)}</span><strong>-${m.quantidade}</strong></div>`).join('') : Utils.emptyState('fa-inbox', 'Sem saídas', '')}
        </div>
      </div>
    </div>
  `;
});
