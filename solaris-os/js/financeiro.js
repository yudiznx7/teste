/**
 * ============================================================================
 * SOLARIS OS — FINANCEIRO
 * ============================================================================
 */

let modalDespesa;
const FinState = { categoria: '', data: '' };

document.addEventListener('DOMContentLoaded', async () => {
  await Seed.run();
  AppShell.mount({ title: 'Financeiro', breadcrumb: 'Financeiro' });
  AppShell.setPageActions(`<button class="btn btn-solaris px-4" id="btn-nova-despesa"><i class="fa-solid fa-plus me-2"></i>Nova despesa</button>`);

  modalDespesa = new bootstrap.Modal(document.getElementById('modal-despesa'));
  document.getElementById('filtro-categoria-desp').innerHTML += ['Refeição', 'Combustível', 'Ferramentas', 'Compra de Material', 'Outros'].map((c) => `<option>${c}</option>`).join('');

  document.getElementById('btn-nova-despesa').addEventListener('click', () => abrirModalDespesa());
  document.getElementById('form-despesa').addEventListener('submit', salvarDespesa);
  document.getElementById('filtro-categoria-desp').addEventListener('change', (e) => { FinState.categoria = e.target.value; renderDespesas(); });
  document.getElementById('filtro-data-desp').addEventListener('change', (e) => { FinState.data = e.target.value; renderDespesas(); });

  await renderKpisFinanceiro();
  await renderChartsFinanceiro();
  await renderDespesas();
});

async function getDespesasFiltradas() {
  let list = await DB.get('despesas');
  if (FinState.categoria) list = list.filter((d) => d.categoria === FinState.categoria);
  if (FinState.data) list = list.filter((d) => d.data === FinState.data);
  return list.slice().sort((a, b) => new Date(b.data) - new Date(a.data));
}

async function renderKpisFinanceiro() {
  const despesas = await DB.get('despesas');
  const total = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const maior = despesas.slice().sort((a, b) => b.valor - a.valor)[0];
  const catCount = new Set(despesas.map((d) => d.categoria)).size;

  document.getElementById('kpi-financeiro').innerHTML = `
    <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-icon tone-blue"><i class="fa-solid fa-sack-dollar"></i></div><div class="kpi-content"><div class="kpi-value">${Utils.formatMoney(total)}</div><div class="kpi-label">Total do mês</div></div></div></div>
    <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-icon tone-amber"><i class="fa-solid fa-receipt"></i></div><div class="kpi-content"><div class="kpi-value">${despesas.length}</div><div class="kpi-label">Despesas lançadas</div></div></div></div>
    <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-icon tone-yellow"><i class="fa-solid fa-arrow-trend-up"></i></div><div class="kpi-content"><div class="kpi-value">${Utils.formatMoney(maior?.valor || 0)}</div><div class="kpi-label">Maior despesa</div></div></div></div>
    <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-icon tone-green"><i class="fa-solid fa-layer-group"></i></div><div class="kpi-content"><div class="kpi-value">${catCount}</div><div class="kpi-label">Categorias ativas</div></div></div></div>
  `;
}

async function renderChartsFinanceiro() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = dark ? '#8C9AB4' : '#6B7280';

  const despesas = await DB.get('despesas');
  const cats = ['Refeição', 'Combustível', 'Ferramentas', 'Compra de Material', 'Outros'];
  const values = cats.map((c) => despesas.filter((d) => d.categoria === c).reduce((s, d) => s + Number(d.valor), 0));

  new Chart(document.getElementById('chart-financeiro-cat'), {
    type: 'bar',
    data: { labels: cats, datasets: [{ data: values, backgroundColor: ['#FFC845', '#1B4B8C', '#16A34A', '#3B82C4', '#D1D5DB'], borderRadius: 8, maxBarThickness: 40 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(120,140,170,.12)' } }, x: { grid: { display: false } } } },
  });

  const byDate = {};
  despesas.forEach((d) => { byDate[d.data] = (byDate[d.data] || 0) + Number(d.valor); });
  const sortedDates = Object.keys(byDate).sort();
  new Chart(document.getElementById('chart-financeiro-linha'), {
    type: 'line',
    data: {
      labels: sortedDates.map((d) => Utils.formatDate(d)),
      datasets: [{ data: sortedDates.map((d) => byDate[d]), borderColor: '#1B4B8C', backgroundColor: 'rgba(27,75,140,.12)', fill: true, tension: 0.35, pointRadius: 3 }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(120,140,170,.12)' } }, x: { grid: { display: false } } } },
  });
}

async function renderDespesas() {
  const list = await getDespesasFiltradas();
  document.getElementById('contador-despesas').textContent = `${list.length} despesa(s)`;
  const tbody = document.getElementById('tbody-despesas');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6">${Utils.emptyState('fa-file-invoice-dollar', 'Nenhuma despesa encontrada', 'Ajuste os filtros ou cadastre uma nova despesa.')}</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map((d) => `
    <tr>
      <td class="small fw-semibold">${Utils.escapeHtml(d.descricao)}</td>
      <td><span class="badge-soft-blue rounded-pill px-2 py-1 small">${Utils.escapeHtml(d.categoria)}</span></td>
      <td class="small">${Utils.formatMoney(d.valor)}</td>
      <td class="small">${Utils.formatDate(d.data)}</td>
      <td class="small">${Utils.escapeHtml(d.responsavel || '—')}</td>
      <td class="text-end">
        <button class="btn-icon-sm" onclick="abrirModalDespesa('${d.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-icon-sm" onclick="excluirDespesa('${d.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

async function abrirModalDespesa(id) {
  const form = document.getElementById('form-despesa');
  form.reset();
  document.getElementById('d-id').value = '';
  document.getElementById('modal-despesa-title').textContent = id ? 'Editar Despesa' : 'Nova Despesa';
  if (id) {
    const d = await DB.find('despesas', id);
    document.getElementById('d-id').value = d.id;
    document.getElementById('d-descricao').value = d.descricao;
    document.getElementById('d-categoria').value = d.categoria;
    document.getElementById('d-valor').value = d.valor;
    document.getElementById('d-data').value = d.data;
    document.getElementById('d-responsavel').value = d.responsavel || '';
  } else {
    document.getElementById('d-data').value = new Date().toISOString().slice(0, 10);
  }
  modalDespesa.show();
}

async function salvarDespesa(e) {
  e.preventDefault();
  const id = document.getElementById('d-id').value;
  const data = {
    descricao: document.getElementById('d-descricao').value.trim(),
    categoria: document.getElementById('d-categoria').value,
    valor: Number(document.getElementById('d-valor').value || 0),
    data: document.getElementById('d-data').value,
    responsavel: document.getElementById('d-responsavel').value.trim(),
  };
  if (id) { await DB.update('despesas', id, data); Utils.toast('Despesa atualizada.'); }
  else { await DB.insert('despesas', data); Utils.toast('Despesa cadastrada.'); }
  modalDespesa.hide();
  await renderKpisFinanceiro();
  await renderDespesas();
}

async function excluirDespesa(id) {
  const ok = await Utils.confirm({ title: 'Excluir despesa', message: 'Deseja remover esta despesa?' });
  if (!ok) return;
  await DB.remove('despesas', id);
  Utils.toast('Despesa excluída.', 'warning');
  await renderKpisFinanceiro();
  await renderDespesas();
}
