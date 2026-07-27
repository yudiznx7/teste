/**
 * ============================================================================
 * SOLARIS OS — ORDENS DE SERVIÇO
 * ============================================================================
 */

const OSState = { page: 1, perPage: 6, termo: '', status: '' };
let modalOS;

document.addEventListener('DOMContentLoaded', async () => {
  await Seed.run();
  AppShell.mount({ title: 'Ordens de Serviço', breadcrumb: 'Ordens de Serviço' });
  AppShell.setPageActions(`<button class="btn btn-solaris px-4" id="btn-nova-os"><i class="fa-solid fa-plus me-2"></i>Nova OS</button>`);

  modalOS = new bootstrap.Modal(document.getElementById('modal-os'));
  document.getElementById('btn-nova-os').addEventListener('click', () => abrirModalOS());
  document.getElementById('form-os').addEventListener('submit', salvarOS);
  document.getElementById('btn-add-checklist').addEventListener('click', () => addChecklistRow());
  document.getElementById('btn-add-material').addEventListener('click', () => addMaterialRow());

  document.getElementById('busca-os').addEventListener('input', Utils.debounce((e) => {
    OSState.termo = e.target.value; OSState.page = 1; renderOS();
  }, 200));

  document.querySelectorAll('.nav-tabs-solaris .nav-link').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-tabs-solaris .nav-link').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      OSState.status = tab.dataset.status;
      OSState.page = 1;
      renderOS();
    });
  });

  await popularSelects();
  await renderOS();
});

async function popularSelects() {
  const clientes = await DB.get('clientes');
  const equipe = await DB.get('equipe');
  const equipesConfig = await DB.get('equipes_config');

  document.getElementById('os-cliente').innerHTML = clientes.map((c) => `<option value="${c.id}">${Utils.escapeHtml(c.nome)}</option>`).join('');
  document.getElementById('os-resp-tecnico').innerHTML = equipe.map((e) => `<option value="${Utils.escapeHtml(e.nome)}">${Utils.escapeHtml(e.nome)}</option>`).join('');
  document.getElementById('os-equipe').innerHTML = equipesConfig.map((e) => `<option value="${Utils.escapeHtml(e.nome)}">${Utils.escapeHtml(e.nome)}</option>`).join('');

  document.getElementById('os-cliente').addEventListener('change', async (e) => {
    const c = await DB.find('clientes', e.target.value);
    document.getElementById('os-endereco').value = c?.endereco || '';
  });
}

async function getOSFiltradas() {
  let list = await DB.get('ordens');
  if (OSState.status) list = list.filter((o) => o.status === OSState.status);
  if (OSState.termo) {
    const t = OSState.termo.toLowerCase();
    const filtered = [];
    for (const o of list) {
      const cliente = await DB.find('clientes', o.clienteId);
      if (String(o.numero).includes(t) || o.responsavelTecnico.toLowerCase().includes(t) || (cliente?.nome || '').toLowerCase().includes(t)) filtered.push(o);
    }
    list = filtered;
  }
  return list.slice().sort((a, b) => b.numero - a.numero);
}

async function renderOS() {
  const all = await getOSFiltradas();
  const totalPages = Math.max(1, Math.ceil(all.length / OSState.perPage));
  OSState.page = Math.min(OSState.page, totalPages);
  const start = (OSState.page - 1) * OSState.perPage;
  const pageItems = all.slice(start, start + OSState.perPage);

  document.getElementById('contador-os').textContent = `${all.length} ordem(ns) de serviço`;
  const grid = document.getElementById('grid-os');

  if (!pageItems.length) {
    grid.innerHTML = `<div class="col-12">${Utils.emptyState('fa-clipboard-list', 'Nenhuma OS encontrada', 'Crie uma nova ordem de serviço para começar.')}</div>`;
  } else {
    const cards = await Promise.all(pageItems.map(async (o) => {
      const cliente = await DB.find('clientes', o.clienteId);
      const color = Utils.statusColor(o.status);
      const doneCount = (o.checklist || []).filter((c) => c.feito).length;
      const totalCk = (o.checklist || []).length || 1;
      const pct = Math.round((doneCount / totalCk) * 100);
      return `
      <div class="col-md-6 col-xl-4">
        <div class="card-solaris hoverable p-3 h-100 d-flex flex-column fade-in">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <div class="text-muted small" style="font-family:var(--font-mono)">#${String(o.numero).padStart(4, '0')}</div>
              <div class="fw-semibold">${Utils.escapeHtml(cliente?.nome || 'Cliente removido')}</div>
            </div>
            <div class="sun-arc arc-sm" style="--arc-pct:${pct}; --arc-color:var(--blue-600)"><span>${pct}%</span></div>
          </div>
          <div class="small text-muted mb-1"><i class="fa-solid fa-location-dot me-1"></i>${Utils.escapeHtml(o.endereco || '—')}</div>
          <div class="small text-muted mb-1"><i class="fa-solid fa-user-gear me-1"></i>${Utils.escapeHtml(o.responsavelTecnico)}</div>
          <div class="small text-muted mb-3"><i class="fa-regular fa-calendar me-1"></i>${Utils.formatDate(o.data)}</div>
          <span class="status-pill ${color} mb-3" style="width:fit-content"><span class="ray"></span>${o.status}</span>
          <div class="mt-auto d-flex flex-wrap gap-1">
            <button class="btn-icon-sm" title="Abrir localização do cliente" onclick="abrirLocalizacaoOS('${o.id}')"><i class="fa-solid fa-location-dot"></i></button>
            <button class="btn-icon-sm" title="Enviar endereço via WhatsApp" style="color:var(--green-600)" onclick="compartilharOSWhatsApp('${o.id}')"><i class="fa-brands fa-whatsapp"></i></button>
            <button class="btn-icon-sm" title="Editar" onclick="abrirModalOS('${o.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon-sm" title="Duplicar" onclick="duplicarOS('${o.id}')"><i class="fa-solid fa-copy"></i></button>
            ${o.status !== 'Concluída' ? `<button class="btn-icon-sm" title="Concluir" onclick="concluirOS('${o.id}')" style="color:var(--green-600)"><i class="fa-solid fa-check"></i></button>` : ''}
            ${o.status !== 'Concluída' ? `<button class="btn-icon-sm" title="Cancelar" onclick="cancelarOS('${o.id}')" style="color:var(--amber-600)"><i class="fa-solid fa-ban"></i></button>` : ''}
            <button class="btn-icon-sm" title="Excluir" onclick="excluirOS('${o.id}')" style="color:var(--red-600)"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`;
    }));
    grid.innerHTML = cards.join('');
  }

  const pagi = document.getElementById('paginacao-os');
  pagi.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    pagi.innerHTML += `<li class="page-item ${i === OSState.page ? 'active' : ''}"><a href="#" class="page-link" onclick="event.preventDefault(); OSState.page=${i}; renderOS();">${i}</a></li>`;
  }
}

function addChecklistRow(item = { item: '', feito: false }) {
  const container = document.getElementById('checklist-container');
  const rowId = Utils.uid();
  const row = document.createElement('div');
  row.className = 'checklist-item' + (item.feito ? ' done' : '');
  row.dataset.rowId = rowId;
  row.innerHTML = `
    <input type="checkbox" class="form-check-input flex-shrink-0" ${item.feito ? 'checked' : ''} onchange="this.closest('.checklist-item').classList.toggle('done', this.checked)">
    <input type="text" class="form-control form-control-sm border-0 bg-transparent" placeholder="Descrição do item" value="${Utils.escapeHtml(item.item)}">
    <button type="button" class="btn-icon-sm flex-shrink-0" onclick="this.closest('.checklist-item').remove()"><i class="fa-solid fa-xmark"></i></button>`;
  container.appendChild(row);
}

async function addMaterialRow(mat = { produtoId: '', quantidade: 1 }) {
  const produtos = await DB.get('produtos');
  const container = document.getElementById('materiais-container');
  const row = document.createElement('div');
  row.className = 'd-flex gap-2 align-items-center mb-2';
  row.innerHTML = `
    <select class="form-select form-select-sm material-produto">
      <option value="">Selecione um produto</option>
      ${produtos.map((p) => `<option value="${p.id}" ${p.id === mat.produtoId ? 'selected' : ''}>${Utils.escapeHtml(p.nome)} (${p.quantidade} em estoque)</option>`).join('')}
    </select>
    <input type="number" min="1" class="form-control form-control-sm material-qtd" style="max-width:90px" value="${mat.quantidade}">
    <button type="button" class="btn-icon-sm flex-shrink-0" onclick="this.closest('div').remove()"><i class="fa-solid fa-xmark"></i></button>`;
  container.appendChild(row);
}

async function abrirModalOS(id) {
  const form = document.getElementById('form-os');
  form.reset();
  document.getElementById('os-id').value = '';
  document.getElementById('checklist-container').innerHTML = '';
  document.getElementById('materiais-container').innerHTML = '';
  document.getElementById('modal-os-title').textContent = id ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço';

  if (id) {
    const o = await DB.find('ordens', id);
    document.getElementById('os-id').value = o.id;
    document.getElementById('os-numero').value = '#' + String(o.numero).padStart(4, '0');
    document.getElementById('os-cliente').value = o.clienteId;
    document.getElementById('os-data').value = o.data;
    document.getElementById('os-endereco').value = o.endereco || '';
    document.getElementById('os-resp-tecnico').value = o.responsavelTecnico;
    document.getElementById('os-resp-geral').value = o.responsavelGeral;
    document.getElementById('os-equipe').value = o.equipe;
    document.getElementById('os-status').value = o.status;
    document.getElementById('os-obs').value = o.observacoes || '';
    document.getElementById('os-fotos').value = (o.fotos || []).join('\n');
    (o.checklist || []).forEach((c) => addChecklistRow(c));
    for (const m of (o.materiais || [])) await addMaterialRow(m);
  } else {
    document.getElementById('os-numero').value = '(gerado ao salvar)';
    document.getElementById('os-data').value = new Date().toISOString().slice(0, 10);
    [{ item: 'Vistoria do telhado', feito: false }, { item: 'Instalação da estrutura', feito: false }, { item: 'Instalação dos módulos', feito: false }, { item: 'Ligação elétrica e testes', feito: false }].forEach((c) => addChecklistRow(c));
  }
  modalOS.show();
}

function coletarChecklist() {
  return Array.from(document.querySelectorAll('#checklist-container .checklist-item')).map((row) => ({
    item: row.querySelector('input[type=text]').value.trim(),
    feito: row.querySelector('input[type=checkbox]').checked,
  })).filter((c) => c.item);
}
function coletarMateriais() {
  return Array.from(document.querySelectorAll('#materiais-container > div')).map((row) => ({
    produtoId: row.querySelector('.material-produto').value,
    quantidade: Number(row.querySelector('.material-qtd').value || 0),
  })).filter((m) => m.produtoId && m.quantidade > 0);
}

async function salvarOS(e) {
  e.preventDefault();
  const id = document.getElementById('os-id').value;
  const data = {
    clienteId: document.getElementById('os-cliente').value,
    endereco: document.getElementById('os-endereco').value.trim(),
    responsavelTecnico: document.getElementById('os-resp-tecnico').value,
    responsavelGeral: document.getElementById('os-resp-geral').value.trim(),
    equipe: document.getElementById('os-equipe').value,
    data: document.getElementById('os-data').value,
    status: document.getElementById('os-status').value,
    checklist: coletarChecklist(),
    materiais: coletarMateriais(),
    observacoes: document.getElementById('os-obs').value.trim(),
    fotos: document.getElementById('os-fotos').value.split('\n').map((s) => s.trim()).filter(Boolean),
  };
  if (id) {
    await DB.update('ordens', id, data);
    Utils.toast('Ordem de serviço atualizada.');
  } else {
    data.numero = await DB.nextSequence('os');
    await DB.insert('ordens', data);
    Utils.toast('Ordem de serviço criada.');
  }
  modalOS.hide();
  await renderOS();
}

async function duplicarOS(id) {
  const o = await DB.find('ordens', id);
  const clone = { ...o };
  delete clone.id;
  clone.numero = await DB.nextSequence('os');
  clone.status = 'Pendente';
  clone.data = new Date().toISOString().slice(0, 10);
  await DB.insert('ordens', clone);
  Utils.toast('OS duplicada com sucesso.');
  await renderOS();
}

async function concluirOS(id) {
  const o = await DB.find('ordens', id);
  const ok = await Utils.confirm({
    title: 'Concluir OS',
    message: 'Ao concluir, os materiais utilizados serão descontados do estoque automaticamente. Deseja continuar?',
    confirmText: 'Concluir OS', danger: false,
  });
  if (!ok) return;

  for (const m of (o.materiais || [])) {
    const produto = await DB.find('produtos', m.produtoId);
    if (!produto) continue;
    const novaQtd = Math.max(0, produto.quantidade - m.quantidade);
    await DB.update('produtos', produto.id, { quantidade: novaQtd, ultimaUtilizacao: new Date().toISOString().slice(0, 10) });
    await DB.insert('movimentacoes', {
      produtoId: produto.id, tipo: 'saida', quantidade: m.quantidade,
      motivo: `Uso na OS #${String(o.numero).padStart(4, '0')}`, osId: o.id,
      responsavel: o.responsavelTecnico, data: new Date().toISOString().slice(0, 10),
    });
  }

  await DB.update('ordens', id, { status: 'Concluída', concluidaEm: new Date().toISOString() });
  Utils.toast('OS concluída! Estoque atualizado e histórico registrado.', 'success');
  await renderOS();
}

async function cancelarOS(id) {
  const ok = await Utils.confirm({ title: 'Cancelar OS', message: 'Deseja marcar esta ordem de serviço como cancelada?' });
  if (!ok) return;
  await DB.update('ordens', id, { status: 'Cancelada' });
  Utils.toast('OS cancelada.', 'warning');
  await renderOS();
}

async function excluirOS(id) {
  const ok = await Utils.confirm({ title: 'Excluir OS', message: 'Esta ação não pode ser desfeita. Deseja continuar?' });
  if (!ok) return;
  await DB.remove('ordens', id);
  Utils.toast('OS excluída.', 'warning');
  await renderOS();
}

/** Abre o Maps/Waze (conforme preferência salva no cliente) com o endereço desta OS. */
async function abrirLocalizacaoOS(id) {
  const o = await DB.find('ordens', id);
  const cliente = o ? await DB.find('clientes', o.clienteId) : null;
  const alvo = cliente || { endereco: o?.endereco, nome: 'cliente' };
  window.open(Utils.clienteLocationLink(alvo), '_blank');
}

/** Compartilha o endereço + localização desta OS via WhatsApp, junto com o nº da OS e o técnico responsável. */
async function compartilharOSWhatsApp(id) {
  const o = await DB.find('ordens', id);
  if (!o) return;
  const cliente = await DB.find('clientes', o.clienteId);
  const alvo = cliente || { endereco: o.endereco, nome: 'Cliente' };
  Utils.compartilharLocalizacaoCliente(alvo, {
    extra: `OS #${String(o.numero).padStart(4, '0')} · Técnico: ${o.responsavelTecnico}`,
  });
}
