/**
 * ============================================================================
 * SOLARIS OS — RELATÓRIOS
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Seed.run();
  AppShell.mount({ title: 'Relatórios', breadcrumb: 'Relatórios' });

  document.getElementById('btn-gerar-relatorio').addEventListener('click', gerarRelatorio);
  document.getElementById('relatorio-tipo').addEventListener('change', gerarRelatorio);
  document.getElementById('btn-imprimir').addEventListener('click', () => window.print());
  document.getElementById('btn-exportar-pdf').addEventListener('click', exportarPDF);

  await gerarRelatorio();
});

function dentroDoPeriodo(dataStr) {
  const de = document.getElementById('relatorio-de').value;
  const ate = document.getElementById('relatorio-ate').value;
  if (de && dataStr < de) return false;
  if (ate && dataStr > ate) return false;
  return true;
}

async function gerarRelatorio() {
  const tipo = document.getElementById('relatorio-tipo').value;
  const titulos = {
    instalacoes: 'Instalações por período', materiais: 'Materiais utilizados', compras: 'Produtos comprados',
    despesas: 'Despesas', tecnicos: 'Ranking de Técnicos', clientes: 'Relatório de Clientes',
  };
  document.getElementById('relatorio-titulo').textContent = titulos[tipo];
  document.getElementById('relatorio-subtitulo').textContent = `Gerado em ${Utils.formatDate(new Date().toISOString())} · Solaris OS`;

  const map = {
    instalacoes: relatorioInstalacoes, materiais: relatorioMateriais, compras: relatorioCompras,
    despesas: relatorioDespesas, tecnicos: relatorioTecnicos, clientes: relatorioClientes,
  };
  document.getElementById('relatorio-conteudo').innerHTML = await map[tipo]();
}

function tableWrap(headers, rows) {
  if (!rows.length) return Utils.emptyState('fa-chart-column', 'Sem dados no período', 'Ajuste o período selecionado.');
  return `<div class="table-responsive"><table class="table table-solaris mb-0">
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table></div>`;
}

async function relatorioInstalacoes() {
  const ordens = (await DB.get('ordens')).filter((o) => dentroDoPeriodo(o.data));
  const rows = await Promise.all(ordens.map(async (o) => {
    const cliente = await DB.find('clientes', o.clienteId);
    return `<tr><td>#${String(o.numero).padStart(4, '0')}</td><td>${Utils.escapeHtml(cliente?.nome || '—')}</td><td>${Utils.escapeHtml(o.responsavelTecnico)}</td><td>${Utils.formatDate(o.data)}</td><td>${o.status}</td></tr>`;
  }));
  return tableWrap(['Nº OS', 'Cliente', 'Técnico', 'Data', 'Status'], rows);
}

async function relatorioMateriais() {
  const mov = (await DB.get('movimentacoes')).filter((m) => m.tipo === 'saida' && dentroDoPeriodo(m.data));
  const rows = await Promise.all(mov.map(async (m) => {
    const p = await DB.find('produtos', m.produtoId);
    return `<tr><td>${Utils.escapeHtml(p?.nome || 'Produto removido')}</td><td>${m.quantidade}</td><td>${Utils.escapeHtml(m.motivo)}</td><td>${Utils.formatDate(m.data)}</td><td>${Utils.escapeHtml(m.responsavel)}</td></tr>`;
  }));
  return tableWrap(['Produto', 'Qtd.', 'Motivo', 'Data', 'Responsável'], rows);
}

async function relatorioCompras() {
  const compras = (await DB.get('compras_realizadas')).filter((c) => dentroDoPeriodo(c.data));
  const rows = compras.map((c) => `<tr><td>${Utils.escapeHtml(c.produtoNome)}</td><td>${c.quantidade}</td><td>${Utils.escapeHtml(c.fornecedor)}</td><td>${Utils.formatMoney(c.valorTotal)}</td><td>${Utils.formatDate(c.data)}</td></tr>`);
  return tableWrap(['Produto', 'Qtd.', 'Fornecedor', 'Valor', 'Data'], rows);
}

async function relatorioDespesas() {
  const despesas = (await DB.get('despesas')).filter((d) => dentroDoPeriodo(d.data));
  const total = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const rows = despesas.map((d) => `<tr><td>${Utils.escapeHtml(d.descricao)}</td><td>${Utils.escapeHtml(d.categoria)}</td><td>${Utils.formatMoney(d.valor)}</td><td>${Utils.formatDate(d.data)}</td></tr>`);
  return tableWrap(['Descrição', 'Categoria', 'Valor', 'Data'], rows) + `<div class="text-end fw-bold mt-3">Total: ${Utils.formatMoney(total)}</div>`;
}

async function relatorioTecnicos() {
  const equipe = await DB.get('equipe');
  const ranking = equipe.slice().sort((a, b) => b.instalacoesRealizadas - a.instalacoesRealizadas);
  const rows = ranking.map((m, i) => `<tr><td>${i + 1}º</td><td>${Utils.escapeHtml(m.nome)}</td><td>${Utils.escapeHtml(m.cargo)}</td><td>${m.instalacoesRealizadas}</td><td>${m.instalacoesPendentes}</td></tr>`);
  return tableWrap(['Posição', 'Técnico', 'Cargo', 'Concluídas', 'Pendentes'], rows);
}

async function relatorioClientes() {
  const clientes = await DB.get('clientes');
  const rows = clientes.map((c) => `<tr><td>${Utils.escapeHtml(c.nome)}</td><td>${Utils.escapeHtml(c.cidade)}</td><td>${Utils.escapeHtml(c.potenciaSistema || '—')}</td><td>${c.qtdModulos ?? '—'}</td><td>${c.status}</td></tr>`);
  return tableWrap(['Cliente', 'Cidade', 'Sistema', 'Módulos', 'Status'], rows);
}

function exportarPDF() {
  const el = document.getElementById('relatorio-area');
  const titulo = document.getElementById('relatorio-titulo').textContent.toLowerCase().replace(/\s+/g, '-');
  Utils.toast('Gerando PDF...', 'info');
  html2pdf().set({
    margin: 12,
    filename: `relatorio-${titulo}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(el).save();
}
