/**
 * ============================================================================
 * SOLARIS OS — EQUIPE
 * ============================================================================
 */

let modalMembro;
const EquipeState = { termo: '' };

document.addEventListener('DOMContentLoaded', async () => {
  await Seed.run();
  AppShell.mount({ title: 'Equipe', breadcrumb: 'Equipe' });
  AppShell.setPageActions(`<button class="btn btn-solaris px-4" id="btn-novo-membro"><i class="fa-solid fa-plus me-2"></i>Novo membro</button>`);

  modalMembro = new bootstrap.Modal(document.getElementById('modal-membro'));
  document.getElementById('eq-equipe').innerHTML = (await DB.get('equipes_config')).map((e) => `<option value="${Utils.escapeHtml(e.nome)}">${Utils.escapeHtml(e.nome)}</option>`).join('');

  document.getElementById('btn-novo-membro').addEventListener('click', () => abrirModalMembro());
  document.getElementById('form-membro').addEventListener('submit', salvarMembro);
  document.getElementById('busca-equipe').addEventListener('input', Utils.debounce((e) => { EquipeState.termo = e.target.value; renderEquipe(); }, 200));

  await renderEquipe();
});

async function renderEquipe() {
  const list = Utils.searchFilter(await DB.get('equipe'), EquipeState.termo, ['nome', 'cargo', 'equipe']);
  document.getElementById('contador-equipe').textContent = `${list.length} membro(s) da equipe`;
  const grid = document.getElementById('grid-equipe');

  if (!list.length) {
    grid.innerHTML = `<div class="col-12">${Utils.emptyState('fa-people-group', 'Nenhum membro encontrado', 'Cadastre um novo membro da equipe técnica.')}</div>`;
    return;
  }

  grid.innerHTML = list.map((m) => {
    const total = m.instalacoesRealizadas + m.instalacoesPendentes || 1;
    const pct = Math.round((m.instalacoesRealizadas / total) * 100);
    return `
    <div class="col-sm-6 col-lg-4 col-xl-3">
      <div class="card-solaris hoverable p-3 text-center fade-in">
        <div class="avatar mx-auto mb-2" style="width:64px;height:64px;font-size:1.1rem;overflow:hidden">
          ${m.foto ? `<img src="${m.foto}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.textContent='${Utils.initials(m.nome)}'">` : Utils.initials(m.nome)}
        </div>
        <div class="fw-semibold">${Utils.escapeHtml(m.nome)}</div>
        <div class="small text-muted mb-1">${Utils.escapeHtml(m.cargo)}</div>
        <span class="badge-soft-blue rounded-pill px-2 py-1 small mb-3 d-inline-block">${Utils.escapeHtml(m.equipe)}</span>
        <div class="sun-arc mx-auto mb-2" style="--arc-pct:${pct}; --arc-color:var(--yellow-500)"><span>${pct}%</span></div>
        <div class="d-flex justify-content-between small text-muted px-2">
          <span><i class="fa-solid fa-check text-success"></i> ${m.instalacoesRealizadas}</span>
          <span><i class="fa-solid fa-clock text-warning"></i> ${m.instalacoesPendentes}</span>
        </div>
        <div class="small text-muted mt-2"><i class="fa-solid fa-phone me-1"></i>${Utils.escapeHtml(m.telefone)}</div>
        <div class="mt-3 d-flex justify-content-center gap-1">
          <button class="btn-icon-sm" onclick="abrirModalMembro('${m.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-icon-sm" onclick="excluirMembro('${m.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function abrirModalMembro(id) {
  const form = document.getElementById('form-membro');
  form.reset();
  document.getElementById('eq-id').value = '';
  document.getElementById('modal-membro-title').textContent = id ? 'Editar Membro' : 'Novo Membro';
  if (id) {
    const m = await DB.find('equipe', id);
    document.getElementById('eq-id').value = m.id;
    document.getElementById('eq-nome').value = m.nome;
    document.getElementById('eq-telefone').value = m.telefone;
    document.getElementById('eq-cargo').value = m.cargo;
    document.getElementById('eq-equipe').value = m.equipe;
    document.getElementById('eq-foto').value = m.foto || '';
    document.getElementById('eq-realizadas').value = m.instalacoesRealizadas;
    document.getElementById('eq-pendentes').value = m.instalacoesPendentes;
  }
  modalMembro.show();
}

async function salvarMembro(e) {
  e.preventDefault();
  const id = document.getElementById('eq-id').value;
  const data = {
    nome: document.getElementById('eq-nome').value.trim(),
    telefone: document.getElementById('eq-telefone').value.trim(),
    cargo: document.getElementById('eq-cargo').value.trim(),
    equipe: document.getElementById('eq-equipe').value,
    foto: document.getElementById('eq-foto').value.trim(),
    instalacoesRealizadas: Number(document.getElementById('eq-realizadas').value || 0),
    instalacoesPendentes: Number(document.getElementById('eq-pendentes').value || 0),
  };
  if (id) { await DB.update('equipe', id, data); Utils.toast('Membro atualizado.'); }
  else { await DB.insert('equipe', data); Utils.toast('Membro cadastrado.'); }
  modalMembro.hide();
  await renderEquipe();
}

async function excluirMembro(id) {
  const ok = await Utils.confirm({ title: 'Excluir membro', message: 'Deseja remover este membro da equipe?' });
  if (!ok) return;
  await DB.remove('equipe', id);
  Utils.toast('Membro excluído.', 'warning');
  await renderEquipe();
}
