/**
 * ============================================================================
 * SOLARIS OS — DASHBOARD
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Seed.run();
  AppShell.mount({ title: 'Dashboard', breadcrumb: 'Dashboard' });
  await renderKpis();
  await renderCharts();
  await renderMovimentacoes();
  await renderUltimasOS();
});

function kpiCard({ icon, tone, value, label }) {
  return `
    <div class="col-6 col-md-3">
      <div class="kpi-card fade-in">
        <div class="kpi-icon tone-${tone}"><i class="fa-solid ${icon}"></i></div>
        <div class="kpi-content">
          <div class="kpi-value">${value}</div>
          <div class="kpi-label">${label}</div>
        </div>
      </div>
    </div>`;
}

async function renderKpis() {
  const ordens = await DB.get('ordens');
  const produtos = await DB.get('produtos');
  const despesas = await DB.get('despesas');

  const osPend = ordens.filter((o) => o.status === 'Pendente').length;
  const osAnd = ordens.filter((o) => o.status === 'Em andamento').length;
  const osConc = ordens.filter((o) => o.status === 'Concluída').length;
  const osAtr = ordens.filter((o) => o.status === 'Atrasada').length;

  document.getElementById('kpi-row-os').innerHTML = [
    kpiCard({ icon: 'fa-hourglass-half', tone: 'amber', value: osPend, label: 'OS Pendentes' }),
    kpiCard({ icon: 'fa-person-digging', tone: 'blue', value: osAnd, label: 'OS Em andamento' }),
    kpiCard({ icon: 'fa-circle-check', tone: 'green', value: osConc, label: 'OS Concluídas' }),
    kpiCard({ icon: 'fa-triangle-exclamation', tone: 'red', value: osAtr, label: 'OS Atrasadas' }),
  ].join('');

  const emEstoque = produtos.length;
  const baixo = produtos.filter((p) => p.quantidade > 0 && p.quantidade <= p.minimo).length;
  const zerado = produtos.filter((p) => p.quantidade === 0).length;
  const valorTotal = produtos.reduce((s, p) => s + p.quantidade * p.valor, 0);

  document.getElementById('kpi-row-estoque').innerHTML = [
    kpiCard({ icon: 'fa-boxes-stacked', tone: 'blue', value: emEstoque, label: 'Produtos em Estoque' }),
    kpiCard({ icon: 'fa-arrow-trend-down', tone: 'amber', value: baixo, label: 'Estoque Baixo' }),
    kpiCard({ icon: 'fa-ban', tone: 'red', value: zerado, label: 'Produtos Zerados' }),
    kpiCard({ icon: 'fa-warehouse', tone: 'yellow', value: Utils.formatMoney(valorTotal), label: 'Valor em estoque' }),
  ].join('');

  const totalMes = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const byCat = (cat) => despesas.filter((d) => d.categoria === cat).reduce((s, d) => s + Number(d.valor), 0);

  document.getElementById('kpi-row-financeiro').innerHTML = [
    kpiCard({ icon: 'fa-sack-dollar', tone: 'blue', value: Utils.formatMoney(totalMes), label: 'Gasto do mês' }),
    kpiCard({ icon: 'fa-utensils', tone: 'yellow', value: Utils.formatMoney(byCat('Refeição')), label: 'Refeições' }),
    kpiCard({ icon: 'fa-gas-pump', tone: 'amber', value: Utils.formatMoney(byCat('Combustível')), label: 'Combustível' }),
    kpiCard({ icon: 'fa-toolbox', tone: 'green', value: Utils.formatMoney(byCat('Ferramentas') + byCat('Compra de Material')), label: 'Ferramentas e Materiais' }),
  ].join('');
}

function chartDefaults() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = dark ? '#8C9AB4' : '#6B7280';
  return dark;
}

async function renderCharts() {
  chartDefaults();
  const ordens = await DB.get('ordens');
  const produtos = await DB.get('produtos');
  const despesas = await DB.get('despesas');
  const movimentacoes = await DB.get('movimentacoes');

  new Chart(document.getElementById('chart-instalacoes'), {
    type: 'bar',
    data: {
      labels: ['Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'],
      datasets: [{
        label: 'Instalações concluídas',
        data: [6, 9, 7, 11, 14, ordens.filter((o) => o.status === 'Concluída').length + 10],
        backgroundColor: '#1B4B8C',
        borderRadius: 8,
        maxBarThickness: 36,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: 'rgba(120,140,170,.12)' } }, x: { grid: { display: false } } },
    },
  });

  const cats = ['Refeição', 'Combustível', 'Ferramentas', 'Compra de Material', 'Outros'];
  const catValues = cats.map((c) => despesas.filter((d) => d.categoria === c).reduce((s, d) => s + Number(d.valor), 0));
  new Chart(document.getElementById('chart-gastos'), {
    type: 'doughnut',
    data: { labels: cats, datasets: [{ data: catValues, backgroundColor: ['#FFC845', '#1B4B8C', '#16A34A', '#3B82C4', '#D1D5DB'], borderWidth: 0 }] },
    options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }, cutout: '65%' },
  });

  const catProd = ['Módulos', 'Inversores', 'Estruturas', 'Cabos', 'Conectores', 'Ferramentas'];
  const saida = catProd.map((c) => {
    const ids = produtos.filter((p) => p.categoria === c).map((p) => p.id);
    return movimentacoes.filter((m) => m.tipo === 'saida' && ids.includes(m.produtoId)).reduce((s, m) => s + Number(m.quantidade), 0);
  });
  new Chart(document.getElementById('chart-consumo'), {
    type: 'polarArea',
    data: { labels: catProd, datasets: [{ data: saida.map((v) => v || 1), backgroundColor: ['#1B4B8C99', '#FFC84599', '#16A34A99', '#3B82C499', '#D9770699', '#DC262699'] }] },
    options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 9 } } } } },
  });

  const usageMap = {};
  movimentacoes.filter((m) => m.tipo === 'saida').forEach((m) => {
    usageMap[m.produtoId] = (usageMap[m.produtoId] || 0) + Number(m.quantidade);
  });
  const ranked = Object.entries(usageMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const rankedLabels = await Promise.all(ranked.map(async ([id]) => ((await DB.find('produtos', id))?.nome || 'Produto').slice(0, 16)));
  new Chart(document.getElementById('chart-mais-usados'), {
    type: 'bar',
    data: { labels: rankedLabels, datasets: [{ data: ranked.map(([, v]) => v), backgroundColor: '#FFC845', borderRadius: 6 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(120,140,170,.12)' } }, y: { grid: { display: false } } } },
  });
}

async function renderMovimentacoes() {
  const mov = (await DB.get('movimentacoes')).slice().reverse().slice(0, 6);
  const container = document.getElementById('lista-movimentacoes');
  if (!mov.length) {
    container.innerHTML = Utils.emptyState('fa-arrow-right-arrow-left', 'Sem movimentações', 'Nenhuma entrada ou saída registrada ainda.');
    return;
  }
  const rows = await Promise.all(mov.map(async (m) => {
    const produto = await DB.find('produtos', m.produtoId);
    const isEntrada = m.tipo === 'entrada';
    return `
      <div class="d-flex align-items-center gap-2 py-2 border-bottom">
        <div class="icon-btn" style="width:34px;height:34px;border-color:transparent;background:${isEntrada ? 'var(--green-100)' : 'var(--red-100)'};color:${isEntrada ? 'var(--green-600)' : 'var(--red-600)'}">
          <i class="fa-solid ${isEntrada ? 'fa-arrow-down' : 'fa-arrow-up'}" style="font-size:.75rem"></i>
        </div>
        <div class="flex-grow-1">
          <div class="small fw-semibold">${Utils.escapeHtml(produto?.nome || 'Produto removido')}</div>
          <div class="small text-muted">${isEntrada ? 'Entrada' : 'Saída'} de ${m.quantidade} un. · ${Utils.formatDate(m.data)}</div>
        </div>
      </div>`;
  }));
  container.innerHTML = rows.join('');
}

async function renderUltimasOS() {
  const ordens = (await DB.get('ordens')).slice().reverse().slice(0, 6);
  const tbody = document.getElementById('tbody-ultimas-os');
  if (!ordens.length) {
    tbody.innerHTML = `<tr><td colspan="5">${Utils.emptyState('fa-clipboard-list', 'Nenhuma OS cadastrada', 'Crie sua primeira ordem de serviço.')}</td></tr>`;
    return;
  }
  const rows = await Promise.all(ordens.map(async (o) => {
    const cliente = await DB.find('clientes', o.clienteId);
    const color = Utils.statusColor(o.status);
    return `
      <tr>
        <td class="text-mono" style="font-family:var(--font-mono)">#${String(o.numero).padStart(4, '0')}</td>
        <td>${Utils.escapeHtml(cliente?.nome || '—')}</td>
        <td>${Utils.escapeHtml(o.responsavelTecnico)}</td>
        <td>${Utils.formatDate(o.data)}</td>
        <td><span class="status-pill ${color}"><span class="ray"></span>${o.status}</span></td>
      </tr>`;
  }));
  tbody.innerHTML = rows.join('');
}
