/**
 * ============================================================================
 * SOLARIS OS — COMPRAS (tela exclusiva ADM)
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Seed.run();
  AppShell.mount({ title: 'Compras', breadcrumb: 'Compras' });

  document.querySelectorAll('.nav-tabs-solaris .nav-link').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-tabs-solaris .nav-link').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-lista').classList.toggle('d-none', tab.dataset.tab !== 'lista');
      document.getElementById('tab-historico').classList.toggle('d-none', tab.dataset.tab !== 'historico');
    });
  });

  await renderAlerta();
  await renderListaComprar();
  await renderHistoricoCompras();
});

async function produtosAbaixoDoMinimo() {
  return (await DB.get('produtos')).filter((p) => p.quantidade <= p.minimo);
}

async function renderAlerta() {
  const baixos = await produtosAbaixoDoMinimo();
  const el = document.getElementById('alerta-estoque-baixo');
  if (!baixos.length) {
    el.innerHTML = `<div class="alert alert-success d-flex align-items-center gap-2 mb-0"><i class="fa-solid fa-circle-check"></i> Todos os produtos estão com estoque saudável.</div>`;
    return;
  }
  el.innerHTML = `<div class="alert alert-warning d-flex align-items-center gap-2 mb-0"><i class="fa-solid fa-triangle-exclamation"></i> <strong>${baixos.length} produto(s)</strong> atingiram o estoque mínimo e precisam de reposição.</div>`;
}

async function renderListaComprar() {
  const baixos = await produtosAbaixoDoMinimo();
  const tbody = document.getElementById('tbody-comprar');
  if (!baixos.length) {
    tbody.innerHTML = `<tr><td colspan="7">${Utils.emptyState('fa-cart-shopping', 'Nada para comprar', 'Nenhum produto atingiu o estoque mínimo.')}</td></tr>`;
    return;
  }
  tbody.innerHTML = baixos.map((p) => {
    const sugestao = Math.max(p.minimo * 2 - p.quantidade, p.minimo);
    return `
    <tr>
      <td class="fw-semibold small">${Utils.escapeHtml(p.nome)}</td>
      <td><span class="status-pill ${p.quantidade === 0 ? 'red' : 'amber'}"><span class="ray"></span>${p.quantidade} un.</span></td>
      <td class="small">${p.minimo}</td>
      <td class="small">${sugestao} un.</td>
      <td class="small">${Utils.escapeHtml(p.fornecedor)}</td>
      <td class="small">${Utils.formatMoney(sugestao * p.valor)}</td>
      <td class="text-end"><button class="btn btn-sm btn-solaris" onclick="marcarComprado('${p.id}', ${sugestao})">Compra realizada</button></td>
    </tr>`;
  }).join('');
}

async function renderHistoricoCompras() {
  const compras = (await DB.get('compras_realizadas')).slice().reverse();
  const tbody = document.getElementById('tbody-historico-compras');
  if (!compras.length) {
    tbody.innerHTML = `<tr><td colspan="5">${Utils.emptyState('fa-receipt', 'Nenhuma compra registrada', 'As compras confirmadas aparecerão aqui.')}</td></tr>`;
    return;
  }
  tbody.innerHTML = compras.map((c) => `
    <tr>
      <td class="small fw-semibold">${Utils.escapeHtml(c.produtoNome)}</td>
      <td class="small">${c.quantidade} un.</td>
      <td class="small">${Utils.escapeHtml(c.fornecedor)}</td>
      <td class="small">${Utils.formatMoney(c.valorTotal)}</td>
      <td class="small">${Utils.formatDate(c.data)}</td>
    </tr>`).join('');
}

async function marcarComprado(produtoId, sugestao) {
  const p = await DB.find('produtos', produtoId);
  const ok = await Utils.confirm({
    title: 'Confirmar compra',
    message: `Confirmar entrada de ${sugestao} un. de "${p.nome}" no estoque?`,
    confirmText: 'Confirmar compra', danger: false,
  });
  if (!ok) return;

  await DB.update('produtos', produtoId, { quantidade: p.quantidade + sugestao, ultimaCompra: new Date().toISOString().slice(0, 10) });
  await DB.insert('movimentacoes', { produtoId, tipo: 'entrada', quantidade: sugestao, motivo: 'Compra de reposição', osId: '', responsavel: 'Admin Solaris', data: new Date().toISOString().slice(0, 10) });
  await DB.insert('compras_realizadas', { produtoId, produtoNome: p.nome, quantidade: sugestao, fornecedor: p.fornecedor, valorTotal: sugestao * p.valor, data: new Date().toISOString().slice(0, 10) });

  Utils.toast('Compra registrada e estoque atualizado.', 'success');
  await renderAlerta();
  await renderListaComprar();
  await renderHistoricoCompras();
}
