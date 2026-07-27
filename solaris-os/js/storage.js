/**
 * ============================================================================
 * SOLARIS OS — CAMADA DE DADOS (DATA LAYER)
 * ============================================================================
 * Toda a persistência do sistema passa por este arquivo através do objeto DB.
 * Todos os métodos são ASSÍNCRONOS (retornam Promises) — mesmo no modo
 * 'local' — para que a troca de backend (js/config.js → dbMode) não exija
 * nenhuma mudança nas telas.
 *
 *   DB.get(collection)                 -> Promise<Array>
 *   DB.find(collection, id)            -> Promise<Object|null>
 *   DB.insert(collection, data)        -> Promise<Object>
 *   DB.update(collection, id, patch)   -> Promise<Object|null>
 *   DB.remove(collection, id)          -> Promise<boolean>
 *   DB.nextSequence(key)               -> Promise<number>
 *
 * Modo 'local' (padrão): dados no localStorage do navegador.
 * Modo 'api': dados em um backend Node.js + MySQL próprio (pasta /server).
 * Modo 'supabase': dados direto num projeto Supabase (Postgres gerenciado),
 * sem precisar rodar nenhum servidor — veja /supabase/README.md.
 * ============================================================================
 */

const DB_PREFIX = 'solaris_';
const DB_VERSION = 'v1';

function cfg() {
  return window.SOLARIS_CONFIG || { dbMode: 'local', apiBaseUrl: 'http://localhost:3001/api' };
}

let _sbClient = null;
/** Retorna (e cria, na primeira chamada) o cliente JS do Supabase. */
function sbClient() {
  if (_sbClient) return _sbClient;
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    throw new Error('Biblioteca do Supabase não carregada. Inclua <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script> antes de js/storage.js.');
  }
  const { supabaseUrl, supabaseAnonKey } = cfg();
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('SEU-PROJETO')) {
    throw new Error('Preencha supabaseUrl e supabaseAnonKey em js/config.js com os dados do seu projeto Supabase.');
  }
  _sbClient = supabase.createClient(supabaseUrl, supabaseAnonKey);
  return _sbClient;
}

/** Converte uma linha da tabela `records` (Supabase/Postgres) para o formato usado pelo frontend. */
function sbRowToRecord(row) {
  return { ...row.data, id: row.id, createdAt: row.created_at, updatedAt: row.updated_at || undefined };
}

const DB = {
  async get(collection) {
    if (cfg().dbMode === 'supabase') {
      const { data, error } = await sbClient().from('records').select('*').eq('collection', collection).order('created_at', { ascending: true });
      if (error) throw error;
      return data.map(sbRowToRecord);
    }
    if (cfg().dbMode === 'api') return apiRequest('GET', `/${collection}`);
    return localGet(collection);
  },

  /** Sobrescreve uma coleção inteira. Usado apenas no modo local (seed). */
  async set(collection, arr) {
    if (cfg().dbMode === 'api' || cfg().dbMode === 'supabase') {
      throw new Error(`DB.set() não é suportado no modo "${cfg().dbMode}" — use insert/update/remove, ou popule o banco via SQL de seed.`);
    }
    localStorage.setItem(DB_PREFIX + collection, JSON.stringify(arr));
    return arr;
  },

  async find(collection, id) {
    if (cfg().dbMode === 'supabase') {
      const { data, error } = await sbClient().from('records').select('*').eq('collection', collection).eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? sbRowToRecord(data) : null;
    }
    if (cfg().dbMode === 'api') {
      try { return await apiRequest('GET', `/${collection}/${id}`); }
      catch (e) { return null; }
    }
    const list = await localGet(collection);
    return list.find((item) => String(item.id) === String(id)) || null;
  },

  async insert(collection, data) {
    if (cfg().dbMode === 'supabase') {
      const id = data.id || Utils.uid();
      const record = { ...data, id };
      const { data: row, error } = await sbClient().from('records').insert({ collection, id, data: record }).select().single();
      if (error) throw error;
      return sbRowToRecord(row);
    }
    if (cfg().dbMode === 'api') return apiRequest('POST', `/${collection}`, data);
    const items = await localGet(collection);
    const record = { id: data.id || Utils.uid(), createdAt: new Date().toISOString(), ...data };
    items.push(record);
    await this.set(collection, items);
    return record;
  },

  async update(collection, id, patch) {
    if (cfg().dbMode === 'supabase') {
      const current = await this.find(collection, id);
      if (!current) return null;
      const merged = { ...current, ...patch, id };
      const { data: row, error } = await sbClient().from('records').update({ data: merged, updated_at: new Date().toISOString() }).eq('collection', collection).eq('id', id).select().single();
      if (error) throw error;
      return sbRowToRecord(row);
    }
    if (cfg().dbMode === 'api') return apiRequest('PUT', `/${collection}/${id}`, patch);
    const items = await localGet(collection);
    const idx = items.findIndex((i) => String(i.id) === String(id));
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
    await this.set(collection, items);
    return items[idx];
  },

  async remove(collection, id) {
    if (cfg().dbMode === 'supabase') {
      const { error } = await sbClient().from('records').delete().eq('collection', collection).eq('id', id);
      if (error) throw error;
      return true;
    }
    if (cfg().dbMode === 'api') { await apiRequest('DELETE', `/${collection}/${id}`); return true; }
    const items = (await localGet(collection)).filter((i) => String(i.id) !== String(id));
    await this.set(collection, items);
    return true;
  },

  /** Próximo número sequencial (usado para número automático de OS). */
  async nextSequence(key) {
    if (cfg().dbMode === 'supabase') {
      const { data, error } = await sbClient().rpc('next_sequence', { seq_name: key });
      if (error) throw error;
      return data;
    }
    if (cfg().dbMode === 'api') {
      const res = await apiRequest('POST', `/_sequence/${key}`);
      return res.value;
    }
    const seqKey = DB_PREFIX + 'seq_' + key;
    const current = parseInt(localStorage.getItem(seqKey) || '0', 10) + 1;
    localStorage.setItem(seqKey, String(current));
    return current;
  },
};

function localGet(collection) {
  try {
    const raw = localStorage.getItem(DB_PREFIX + collection);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('DB.get (local) error', collection, e);
    return [];
  }
}

async function apiRequest(method, path, body) {
  const url = cfg().apiBaseUrl.replace(/\/$/, '') + path;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${method} ${path} falhou (${res.status}): ${msg}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * ============================================================================
 * SEED — dados de demonstração, criados apenas na primeira execução
 * Roda SOMENTE no modo 'local'. Nos modos 'api' e 'supabase', popule o banco
 * usando o SQL de seed correspondente (/server/schema.sql ou
 * /supabase/schema.sql), que já incluem os mesmos dados de exemplo.
 * ============================================================================
 */
const Seed = {
  async run() {
    if (cfg().dbMode === 'api' || cfg().dbMode === 'supabase') return;

    const versionKey = DB_PREFIX + 'seeded_' + DB_VERSION;
    if (localStorage.getItem(versionKey)) return;

    await Seed.usuarios();
    await Seed.clientes();
    await Seed.equipe();
    await Seed.produtos();
    await Seed.ordens();
    await Seed.financeiro();
    await Seed.compras();
    await Seed.config();

    localStorage.setItem(versionKey, '1');
  },

  async usuarios() {
    await DB.set('usuarios', [
      { id: 'u1', nome: 'Admin Solaris', usuario: 'admin', senha: '123456', cargo: 'Administrador', email: '[email protected]', foto: '' },
      { id: 'u2', nome: 'Marcos Vinícius', usuario: 'marcos', senha: '123456', cargo: 'Técnico', email: '[email protected]', foto: '' },
    ]);
  },

  async clientes() {
    const cidades = ['Luziânia - GO', 'Goiânia - GO', 'Brasília - DF', 'Águas Lindas - GO', 'Formosa - GO'];
    const nomes = ['Carlos Menezes', 'Fernanda Alves', 'João Pedro Souza', 'Rita Camargo', 'Eduardo Lima', 'Patrícia Nunes'];
    const arr = nomes.map((nome, i) => ({
      id: Utils.uid(),
      nome,
      telefone: '(61) 9' + (8000 + i) + '-00' + (10 + i),
      documento: '000.000.00' + i + '-0' + i,
      cidade: cidades[i % cidades.length],
      endereco: 'Rua das Acácias, ' + (100 + i * 12),
      localizacaoTipo: i % 2 === 0 ? 'maps' : 'waze',
      mapsLink: '',
      potenciaSistema: (3.5 + i).toFixed(1) + ' kWp',
      qtdModulos: 8 + i * 2,
      modeloModulo: 'Canadian Solar 550W',
      modeloInversor: 'Growatt MIN 5000TL-X',
      qtdStrings: 2,
      status: i % 3 === 0 ? 'Concluído' : i % 3 === 1 ? 'Em instalação' : 'Ativo',
      observacoes: '',
      createdAt: new Date().toISOString(),
    }));
    await DB.set('clientes', arr);
  },

  async equipe() {
    await DB.set('equipe', [
      { id: Utils.uid(), nome: 'Marcos Vinícius', telefone: '(61) 99111-2233', cargo: 'Técnico Instalador', equipe: 'Equipe Alpha', instalacoesRealizadas: 42, instalacoesPendentes: 3, foto: '' },
      { id: Utils.uid(), nome: 'Renata Ferreira', telefone: '(61) 99222-3344', cargo: 'Engenheira Elétrica', equipe: 'Equipe Alpha', instalacoesRealizadas: 30, instalacoesPendentes: 1, foto: '' },
      { id: Utils.uid(), nome: 'Diego Ramos', telefone: '(61) 99333-4455', cargo: 'Auxiliar Técnico', equipe: 'Equipe Beta', instalacoesRealizadas: 18, instalacoesPendentes: 4, foto: '' },
      { id: Utils.uid(), nome: 'Aline Souza', telefone: '(61) 99444-5566', cargo: 'Técnica Instaladora', equipe: 'Equipe Beta', instalacoesRealizadas: 25, instalacoesPendentes: 2, foto: '' },
    ]);
  },

  async produtos() {
    const arr = [
      { nome: 'Módulo Fotovoltaico 550W', categoria: 'Módulos', codigo: 'MOD-550', quantidade: 42, minimo: 20, fornecedor: 'Canadian Solar', valor: 780, local: 'Galpão A - Prateleira 1' },
      { nome: 'Inversor Growatt 5kW', categoria: 'Inversores', codigo: 'INV-5000', quantidade: 8, minimo: 10, fornecedor: 'Growatt', valor: 3200, local: 'Galpão A - Prateleira 3' },
      { nome: 'Estrutura Fixação Telhado Cerâmico', categoria: 'Estruturas', codigo: 'EST-CER', quantidade: 15, minimo: 15, fornecedor: 'Romagnole', valor: 45, local: 'Galpão B' },
      { nome: 'Cabo Solar 6mm (rolo 100m)', categoria: 'Cabos', codigo: 'CAB-6MM', quantidade: 3, minimo: 8, fornecedor: 'Ficap', valor: 410, local: 'Galpão B - Prateleira 2' },
      { nome: 'Conector MC4 (par)', categoria: 'Conectores', codigo: 'CON-MC4', quantidade: 0, minimo: 30, fornecedor: 'Staubli', valor: 18, local: 'Galpão B - Prateleira 2' },
      { nome: 'Furadeira de Impacto', categoria: 'Ferramentas', codigo: 'FER-FUR', quantidade: 6, minimo: 2, fornecedor: 'Bosch', valor: 590, local: 'Almoxarifado' },
      { nome: 'String Box CC 2 Entradas', categoria: 'Estruturas', codigo: 'STR-BOX2', quantidade: 12, minimo: 10, fornecedor: 'Clamper', valor: 260, local: 'Galpão A - Prateleira 4' },
    ];
    const withMeta = arr.map((p) => ({
      id: Utils.uid(), imagem: '', observacoes: '', createdAt: new Date().toISOString(),
      ultimaCompra: '2026-06-10', ultimaUtilizacao: '2026-07-15', ...p,
    }));
    await DB.set('produtos', withMeta);
    await DB.set('movimentacoes', [
      { id: Utils.uid(), produtoId: withMeta[0].id, tipo: 'entrada', quantidade: 20, motivo: 'Compra fornecedor', osId: '', responsavel: 'Admin Solaris', data: '2026-06-10' },
      { id: Utils.uid(), produtoId: withMeta[0].id, tipo: 'saida', quantidade: 8, motivo: 'Uso em instalação', osId: '', responsavel: 'Marcos Vinícius', data: '2026-07-15' },
      { id: Utils.uid(), produtoId: withMeta[4].id, tipo: 'saida', quantidade: 30, motivo: 'Uso em instalação', osId: '', responsavel: 'Diego Ramos', data: '2026-07-14' },
    ]);
  },

  async ordens() {
    const clientes = await DB.get('clientes');
    const equipe = await DB.get('equipe');
    const status = ['Pendente', 'Em andamento', 'Concluída', 'Atrasada'];
    const arr = clientes.slice(0, 5).map((c, i) => ({
      id: Utils.uid(),
      numero: (i + 1),
      clienteId: c.id,
      endereco: c.endereco,
      localizacao: c.mapsLink,
      responsavelTecnico: equipe[i % equipe.length].nome,
      responsavelGeral: 'Admin Solaris',
      equipe: equipe[i % equipe.length].equipe,
      data: `2026-07-${10 + i}`,
      status: status[i % status.length],
      checklist: [
        { item: 'Vistoria do telhado', feito: true },
        { item: 'Instalação da estrutura', feito: i % 2 === 0 },
        { item: 'Instalação dos módulos', feito: false },
        { item: 'Ligação elétrica e testes', feito: false },
      ],
      observacoes: '', fotos: [], materiais: [], createdAt: new Date().toISOString(),
    }));
    await DB.set('ordens', arr);
    localStorage.setItem(DB_PREFIX + 'seq_os', String(arr.length));
  },

  async financeiro() {
    const cats = ['Refeição', 'Combustível', 'Ferramentas', 'Compra de Material', 'Outros'];
    const arr = [];
    for (let i = 0; i < 12; i++) {
      arr.push({
        id: Utils.uid(), descricao: cats[i % cats.length] + ' #' + i, categoria: cats[i % cats.length],
        valor: [45, 180, 590, 1200, 60][i % 5], data: `2026-07-${(i % 28) + 1}`,
        responsavel: i % 2 === 0 ? 'Admin Solaris' : 'Marcos Vinícius',
      });
    }
    await DB.set('despesas', arr);
  },

  async compras() {
    await DB.set('compras_realizadas', []);
  },

  async config() {
    await DB.set('categorias', ['Módulos', 'Inversores', 'Estruturas', 'Cabos', 'Conectores', 'Ferramentas'].map((n) => ({ id: Utils.uid(), nome: n })));
    await DB.set('fornecedores', ['Canadian Solar', 'Growatt', 'Romagnole', 'Ficap', 'Staubli', 'Bosch', 'Clamper'].map((n) => ({ id: Utils.uid(), nome: n })));
    await DB.set('modelos_inversores', ['Growatt MIN 5000TL-X', 'Deye SUN 5K', 'Fronius Primo 5.0'].map((n) => ({ id: Utils.uid(), nome: n })));
    await DB.set('modelos_modulos', ['Canadian Solar 550W', 'Jinko Tiger Neo 555W', 'Trina Vertex 545W'].map((n) => ({ id: Utils.uid(), nome: n })));
    await DB.set('equipes_config', ['Equipe Alpha', 'Equipe Beta', 'Equipe Gama'].map((n) => ({ id: Utils.uid(), nome: n })));
  },
};
