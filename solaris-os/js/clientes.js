/**
 * ============================================================================
 * SOLARIS OS — CLIENTES
 * ============================================================================
 */

const ClientesState = { page: 1, perPage: 6, termo: '', status: '' };
let modalCliente;

document.addEventListener('DOMContentLoaded', async () => {
  await Seed.run();
  AppShell.mount({ title: 'Clientes', breadcrumb: 'Clientes' });
  AppShell.setPageActions(`<button class="btn btn-solaris px-4" id="btn-novo-cliente"><i class="fa-solid fa-plus me-2"></i>Novo cliente</button>`);

  modalCliente = new bootstrap.Modal(document.getElementById('modal-cliente'));
  document.getElementById('btn-novo-cliente').addEventListener('click', () => abrirModalCliente());

  document.getElementById('busca-cliente').addEventListener('input', Utils.debounce((e) => {
    ClientesState.termo = e.target.value; ClientesState.page = 1; renderClientes();
  }, 200));
  document.getElementById('filtro-status').addEventListener('change', (e) => {
    ClientesState.status = e.target.value; ClientesState.page = 1; renderClientes();
  });

  document.getElementById('form-cliente').addEventListener('submit', salvarCliente);

  await renderClientes();
});

async function getClientesFiltrados() {
  let list = await DB.get('clientes');
  if (ClientesState.status) list = list.filter((c) => c.status === ClientesState.status);
  list = Utils.searchFilter(list, ClientesState.termo, ['nome', 'cidade', 'documento']);
  return list;
}

async function renderClientes() {
  const all = await getClientesFiltrados();
  const totalPages = Math.max(1, Math.ceil(all.length / ClientesState.perPage));
  ClientesState.page = Math.min(ClientesState.page, totalPages);
  const start = (ClientesState.page - 1) * ClientesState.perPage;
  const pageItems = all.slice(start, start + ClientesState.perPage);

  document.getElementById('contador-clientes').textContent = `${all.length} cliente(s) encontrado(s)`;
  const tbody = document.getElementById('tbody-clientes');

  if (!pageItems.length) {
    tbody.innerHTML = `<tr><td colspan="6">${Utils.emptyState('fa-user-slash', 'Nenhum cliente encontrado', 'Ajuste os filtros ou cadastre um novo cliente.')}</td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map((c) => {
      const color = Utils.statusColor(c.status);
      return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="avatar" style="width:36px;height:36px;font-size:.7rem">${Utils.initials(c.nome)}</div>
            <div>
              <div class="fw-semibold small">${Utils.escapeHtml(c.nome)}</div>
              <div class="text-muted small">${Utils.escapeHtml(c.telefone)}</div>
            </div>
          </div>
        </td>
        <td>${Utils.escapeHtml(c.cidade)}</td>
        <td class="small">${Utils.escapeHtml(c.potenciaSistema || '—')}</td>
        <td class="small">${c.qtdModulos ?? '—'}</td>
        <td><span class="status-pill ${color}"><span class="ray"></span>${c.status}</span></td>
        <td class="text-end">
          <button class="btn-icon-sm" title="Abrir localização" onclick="abrirLocalizacaoCliente('${c.id}')"><i class="fa-solid fa-location-dot"></i></button>
          <button class="btn-icon-sm" title="Compartilhar no WhatsApp" style="color:var(--green-600)" onclick="compartilharClienteWhatsApp('${c.id}')"><i class="fa-brands fa-whatsapp"></i></button>
          <button class="btn-icon-sm" title="Editar" onclick="abrirModalCliente('${c.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-icon-sm" title="Excluir" onclick="excluirCliente('${c.id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  }

  const pagi = document.getElementById('paginacao-clientes');
  pagi.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    pagi.innerHTML += `<li class="page-item ${i === ClientesState.page ? 'active' : ''}"><a href="#" class="page-link" onclick="event.preventDefault(); ClientesState.page=${i}; renderClientes();">${i}</a></li>`;
  }
}

/** Abre o Google Maps ou o Waze (conforme preferência do cliente) em uma nova aba. */
async function abrirLocalizacaoCliente(id) {
  const c = await DB.find('clientes', id);
  if (!c) return;
  window.open(Utils.clienteLocationLink(c), '_blank');
}

/** Compartilha o endereço/localização do cliente via WhatsApp (abre com mensagem pronta). */
async function compartilharClienteWhatsApp(id) {
  const c = await DB.find('clientes', id);
  if (!c) return;
  Utils.compartilharLocalizacaoCliente(c);
}

async function abrirModalCliente(id) {
  const form = document.getElementById('form-cliente');
  form.reset();
  document.getElementById('c-id').value = '';
  document.getElementById('modal-cliente-title').textContent = id ? 'Editar Cliente' : 'Novo Cliente';

  if (id) {
    const c = await DB.find('clientes', id);
    document.getElementById('c-id').value = c.id;
    document.getElementById('c-nome').value = c.nome || '';
    document.getElementById('c-telefone').value = c.telefone || '';
    document.getElementById('c-documento').value = c.documento || '';
    document.getElementById('c-cidade').value = c.cidade || '';
    document.getElementById('c-endereco').value = c.endereco || '';
    document.getElementById('c-loc-tipo').value = c.localizacaoTipo || 'maps';
    document.getElementById('c-maps').value = c.mapsLink || '';
    document.getElementById('c-potencia').value = c.potenciaSistema || '';
    document.getElementById('c-qtdmodulos').value = c.qtdModulos || '';
    document.getElementById('c-modmodulo').value = c.modeloModulo || '';
    document.getElementById('c-modinversor').value = c.modeloInversor || '';
    document.getElementById('c-strings').value = c.qtdStrings || '';
    document.getElementById('c-status').value = c.status || 'Ativo';
    document.getElementById('c-obs').value = c.observacoes || '';
  }
  modalCliente.show();
}

async function salvarCliente(e) {
  e.preventDefault();
  const id = document.getElementById('c-id').value;
  const data = {
    nome: document.getElementById('c-nome').value.trim(),
    telefone: document.getElementById('c-telefone').value.trim(),
    documento: document.getElementById('c-documento').value.trim(),
    cidade: document.getElementById('c-cidade').value.trim(),
    endereco: document.getElementById('c-endereco').value.trim(),
    localizacaoTipo: document.getElementById('c-loc-tipo').value,
    mapsLink: document.getElementById('c-maps').value.trim(),
    potenciaSistema: document.getElementById('c-potencia').value.trim(),
    qtdModulos: Number(document.getElementById('c-qtdmodulos').value || 0),
    modeloModulo: document.getElementById('c-modmodulo').value.trim(),
    modeloInversor: document.getElementById('c-modinversor').value.trim(),
    qtdStrings: Number(document.getElementById('c-strings').value || 0),
    status: document.getElementById('c-status').value,
    observacoes: document.getElementById('c-obs').value.trim(),
  };
  if (id) {
    await DB.update('clientes', id, data);
    Utils.toast('Cliente atualizado com sucesso.');
  } else {
    await DB.insert('clientes', data);
    Utils.toast('Cliente cadastrado com sucesso.');
  }
  modalCliente.hide();
  await renderClientes();
}

async function excluirCliente(id) {
  const ok = await Utils.confirm({ title: 'Excluir cliente', message: 'Esta ação não pode ser desfeita. Deseja continuar?' });
  if (!ok) return;
  await DB.remove('clientes', id);
  Utils.toast('Cliente excluído.', 'warning');
  await renderClientes();
}
