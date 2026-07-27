/**
 * ============================================================================
 * SOLARIS OS — ESTOQUE
 * ============================================================================
 */

const EstoqueState = { page: 1, perPage: 8, termo: '', categoria: '', statusEstoque: '' };
let modalProduto, modalMovimentacao;

document.addEventListener('DOMContentLoaded', async () => {
  await Seed.run();
  AppShell.mount({ title: 'Estoque', breadcrumb: 'Estoque' });
  AppShell.setPageActions(`<button class="btn btn-solaris px-4" id="btn-novo-produto"><i class="fa-solid fa-plus me-2"></i>Novo produto</button>`);

  modalProduto = new bootstrap.Modal(document.getElementById('modal-produto'));
  modalMovimentacao = new bootstrap.Modal(document.getElementById('modal-movimentacao'));

  document.getElementById('btn-novo-produto').addEventListener('click', () => abrirModalProduto());
  document.getElementById('form-produto').addEventListener('submit', salvarProduto);
  document.getElementById('form-movimentacao').addEventListener('submit', salvarMovimentacao);

  document.getElementById('busca-produto').addEventListener('input', Utils.debounce((e) => {
    EstoqueState.termo = e.target.value; EstoqueState.page = 1; renderProdutos();
  }, 200));
  document.getElementById('filtro-categoria').addEventListener('change', (e) => { EstoqueState.categoria = e.target.value; renderProdutos(); });
  document.getElementById('filtro-status-estoque').addEventListener('change', (e) => { EstoqueState.statusEstoque = e.target.value; renderProdutos(); });

  await popularSelectsEstoque();
  await renderProdutos();
});

function statusEstoqueDe(p) {
  if (p.quantidade === 0) return 'vermelho';
  if (p.quantidade <= p.minimo) return 'amarelo';
  return 'verde';
}
function corDe(statusEstoque) {
  return { verde: '#16A34A', amarelo: '#D97706', vermelho: '#DC2626' }[statusEstoque];
}

async function popularSelectsEstoque() {
  const categorias = await DB.get('categorias');
  const fornecedores = await DB.get('fornecedores');
  document.getElementById('filtro-categoria').innerHTML += categorias.map((c) => `<option value="${Utils.escapeHtml(c.nome)}">${Utils.escapeHtml(c.nome)}</option>`).join('');
  document.getElementById('p-categoria').innerHTML = categorias.map((c) => `<option value="${Utils.escapeHtml(c.nome)}">${Utils.escapeHtml(c.nome)}</option>`).join('');
  document.getElementById('p-fornecedor').innerHTML = fornecedores.map((f) => `<option value="${Utils.escapeHtml(f.nome)}">${Utils.escapeHtml(f.nome)}</option>`).join('');
}

async function getProdutosFiltrados() {
  let list = await DB.get('produtos');
  if (EstoqueState.categoria) list = list.filter((p) => p.categoria === EstoqueState.categoria);
  if (EstoqueState.statusEstoque) list = list.filter((p) => statusEstoqueDe(p) === EstoqueState.statusEstoque);
  list = Utils.searchFilter(list, EstoqueState.termo, ['nome', 'codigo']);
  return list;
}

async function renderProdutos() {
  const all = await getProdutosFiltrados();
  const totalPages = Math.max(1, Math.ceil(all.length / EstoqueState.perPage));
  EstoqueState.page = Math.min(EstoqueState.page, totalPages);
  const start = (EstoqueState.page - 1) * EstoqueState.perPage;
  const pageItems = all.slice(start, start + EstoqueState.perPage);

  document.getElementById('contador-produtos').textContent = `${all.length} produto(s) encontrado(s)`;
  const grid = document.getElementById('grid-produtos');

  if (!pageItems.length) {
    grid.innerHTML = `<div class="col-12">${Utils.emptyState('fa-box-open', 'Nenhum produto encontrado', 'Ajuste os filtros ou cadastre um novo produto.')}</div>`;
  } else {
    grid.innerHTML = pageItems.map((p) => {
      const se = statusEstoqueDe(p);
      return `
      <div class="col-sm-6 col-lg-4 col-xl-3">
        <div class="product-card fade-in">
          <div class="thumb" style="cursor:pointer" onclick="verProduto('${p.id}')">
            ${p.imagem ? `<img src="${p.imagem}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">` : `<i class="fa-solid fa-solar-panel"></i>`}
            <div class="stock-dot" style="background:${corDe(se)}" title="Estoque ${se}"></div>
          </div>
          <div class="body">
            <div class="code">${Utils.escapeHtml(p.codigo)}</div>
            <div class="name">${Utils.escapeHtml(p.nome)}</div>
            <div class="d-flex justify-content-between small text-muted mb-1">
              <span>${p.quantidade} un.</span><span>${Utils.formatMoney(p.valor)}</span>
            </div>
            <div class="small text-muted">${Utils.escapeHtml(p.categoria)}</div>
          </div>
          <div class="foot">
            <button class="btn-icon-sm" title="Visualizar" onclick="verProduto('${p.id}')"><i class="fa-solid fa-eye"></i></button>
            <button class="btn-icon-sm" title="Editar" onclick="abrirModalProduto('${p.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon-sm" title="Movimentação" onclick="abrirModalMovimentacao('${p.id}')"><i class="fa-solid fa-right-left"></i></button>
            <button class="btn-icon-sm" title="Excluir" onclick="excluirProduto('${p.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  const pagi = document.getElementById('paginacao-produtos');
  pagi.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    pagi.innerHTML += `<li class="page-item ${i === EstoqueState.page ? 'active' : ''}"><a href="#" class="page-link" onclick="event.preventDefault(); EstoqueState.page=${i}; renderProdutos();">${i}</a></li>`;
  }
}

function verProduto(id) {
  window.location.href = 'produto-detalhes.html?id=' + id;
}

async function abrirModalProduto(id) {
  const form = document.getElementById('form-produto');
  form.reset();
  document.getElementById('p-id').value = '';
  document.getElementById('modal-produto-title').textContent = id ? 'Editar Produto' : 'Novo Produto';
  if (id) {
    const p = await DB.find('produtos', id);
    document.getElementById('p-id').value = p.id;
    document.getElementById('p-nome').value = p.nome;
    document.getElementById('p-categoria').value = p.categoria;
    document.getElementById('p-codigo').value = p.codigo;
    document.getElementById('p-fornecedor').value = p.fornecedor;
    document.getElementById('p-quantidade').value = p.quantidade;
    document.getElementById('p-minimo').value = p.minimo;
    document.getElementById('p-valor').value = p.valor;
    document.getElementById('p-local').value = p.local || '';
    document.getElementById('p-imagem').value = p.imagem || '';
    document.getElementById('p-obs').value = p.observacoes || '';
  }
  modalProduto.show();
}

async function salvarProduto(e) {
  e.preventDefault();
  const id = document.getElementById('p-id').value;
  const data = {
    nome: document.getElementById('p-nome').value.trim(),
    categoria: document.getElementById('p-categoria').value,
    codigo: document.getElementById('p-codigo').value.trim(),
    fornecedor: document.getElementById('p-fornecedor').value,
    quantidade: Number(document.getElementById('p-quantidade').value || 0),
    minimo: Number(document.getElementById('p-minimo').value || 0),
    valor: Number(document.getElementById('p-valor').value || 0),
    local: document.getElementById('p-local').value.trim(),
    imagem: document.getElementById('p-imagem').value.trim(),
    observacoes: document.getElementById('p-obs').value.trim(),
  };
  if (id) {
    await DB.update('produtos', id, data);
    Utils.toast('Produto atualizado.');
  } else {
    await DB.insert('produtos', data);
    Utils.toast('Produto cadastrado.');
  }
  modalProduto.hide();
  await renderProdutos();
}

async function excluirProduto(id) {
  const ok = await Utils.confirm({ title: 'Excluir produto', message: 'Produtos com histórico de movimentação não devem ser excluídos facilmente. Deseja realmente continuar?' });
  if (!ok) return;
  await DB.remove('produtos', id);
  Utils.toast('Produto excluído.', 'warning');
  await renderProdutos();
}

async function abrirModalMovimentacao(produtoId) {
  const p = await DB.find('produtos', produtoId);
  document.getElementById('form-movimentacao').reset();
  document.getElementById('m-produto-id').value = produtoId;
  document.getElementById('m-produto-nome').innerHTML = `<strong>${Utils.escapeHtml(p.nome)}</strong> · estoque atual: ${p.quantidade} un.`;
  document.getElementById('m-data').value = new Date().toISOString().slice(0, 10);
  modalMovimentacao.show();
}

async function salvarMovimentacao(e) {
  e.preventDefault();
  const produtoId = document.getElementById('m-produto-id').value;
  const tipo = document.getElementById('m-tipo').value;
  const quantidade = Number(document.getElementById('m-quantidade').value || 0);
  const p = await DB.find('produtos', produtoId);
  if (!p) return;

  const novaQtd = tipo === 'entrada' ? p.quantidade + quantidade : Math.max(0, p.quantidade - quantidade);
  await DB.update('produtos', produtoId, {
    quantidade: novaQtd,
    ...(tipo === 'entrada' ? { ultimaCompra: document.getElementById('m-data').value } : { ultimaUtilizacao: document.getElementById('m-data').value }),
  });
  await DB.insert('movimentacoes', {
    produtoId, tipo, quantidade,
    motivo: document.getElementById('m-motivo').value.trim() || (tipo === 'entrada' ? 'Entrada manual' : 'Saída manual'),
    osId: '', responsavel: JSON.parse(sessionStorage.getItem('solaris_session') || localStorage.getItem('solaris_session') || '{}').nome || 'Usuário',
    data: document.getElementById('m-data').value,
  });
  Utils.toast('Movimentação registrada com sucesso.');
  modalMovimentacao.hide();
  await renderProdutos();
}
