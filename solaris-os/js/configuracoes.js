/**
 * ============================================================================
 * SOLARIS OS — CONFIGURAÇÕES
 * ============================================================================
 */

const CONFIG_LABELS = {
  categorias: 'categoria', fornecedores: 'fornecedor', modelos_inversores: 'modelo de inversor',
  modelos_modulos: 'modelo de módulo', equipes_config: 'equipe', usuarios: 'usuário',
};
let currentCollection = 'categorias';

document.addEventListener('DOMContentLoaded', async () => {
  await Seed.run();
  AppShell.mount({ title: 'Configurações', breadcrumb: 'Configurações' });

  document.querySelectorAll('.nav-tabs-solaris .nav-link').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-tabs-solaris .nav-link').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentCollection = tab.dataset.collection;
      renderTela();
    });
  });

  document.getElementById('form-config-simples').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('config-nome').value.trim();
    if (!nome) return;
    await DB.insert(currentCollection, { nome });
    document.getElementById('config-nome').value = '';
    Utils.toast('Item adicionado com sucesso.');
    await renderTabela();
  });

  document.getElementById('form-config-usuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const usuario = document.getElementById('cu-usuario').value.trim();
    const users = await DB.get('usuarios');
    if (users.some((u) => u.usuario.toLowerCase() === usuario.toLowerCase())) {
      Utils.toast('Este nome de usuário já existe.', 'danger');
      return;
    }
    await DB.insert('usuarios', {
      nome: document.getElementById('cu-nome').value.trim(),
      usuario, senha: document.getElementById('cu-senha').value,
      cargo: document.getElementById('cu-cargo').value.trim() || 'Usuário',
    });
    document.getElementById('form-config-usuario').reset();
    Utils.toast('Usuário adicionado com sucesso.');
    await renderTabela();
  });

  await renderTela();
});

async function renderTela() {
  const isUsuarios = currentCollection === 'usuarios';
  document.getElementById('form-config-simples').classList.toggle('d-none', isUsuarios);
  document.getElementById('form-config-usuario').classList.toggle('d-none', !isUsuarios);
  document.getElementById('form-config-title').textContent = isUsuarios ? 'Novo usuário' : `Nova ${CONFIG_LABELS[currentCollection]}`;
  document.querySelector('#tabela-config thead tr').innerHTML = isUsuarios
    ? '<th>Nome</th><th>Usuário</th><th>Cargo</th><th class="text-end">Ações</th>'
    : '<th>Nome</th><th class="text-end">Ações</th>';
  await renderTabela();
}

async function renderTabela() {
  const items = await DB.get(currentCollection);
  const tbody = document.getElementById('tbody-config');
  const isUsuarios = currentCollection === 'usuarios';

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="4">${Utils.emptyState('fa-gear', 'Nenhum item cadastrado', 'Adicione o primeiro item usando o formulário ao lado.')}</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map((item) => isUsuarios ? `
    <tr>
      <td class="small fw-semibold">${Utils.escapeHtml(item.nome)}</td>
      <td class="small">${Utils.escapeHtml(item.usuario)}</td>
      <td class="small">${Utils.escapeHtml(item.cargo || '—')}</td>
      <td class="text-end"><button class="btn-icon-sm" onclick="excluirConfigItem('${item.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button></td>
    </tr>` : `
    <tr>
      <td class="small fw-semibold">${Utils.escapeHtml(item.nome)}</td>
      <td class="text-end"><button class="btn-icon-sm" onclick="excluirConfigItem('${item.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`).join('');
}

async function excluirConfigItem(id) {
  const ok = await Utils.confirm({ title: 'Excluir item', message: `Deseja remover este ${CONFIG_LABELS[currentCollection]}?` });
  if (!ok) return;
  await DB.remove(currentCollection, id);
  Utils.toast('Item removido.', 'warning');
  await renderTabela();
}
