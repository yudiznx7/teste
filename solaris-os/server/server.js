/**
 * ============================================================================
 * SOLARIS OS — BACKEND (Node.js + Express + MySQL)
 * ============================================================================
 * Implementa o mesmo contrato que js/storage.js espera no modo 'api':
 *
 *   GET    /api/:collection            -> lista todos os registros
 *   GET    /api/:collection/:id        -> um registro
 *   POST   /api/:collection            -> cria um registro (gera id se faltar)
 *   PUT    /api/:collection/:id        -> atualiza (merge) um registro
 *   DELETE /api/:collection/:id        -> remove um registro
 *   POST   /api/_sequence/:name        -> incrementa e retorna um contador
 *                                          (usado para o número automático da OS)
 *
 * Cada "coleção" (clientes, produtos, ordens, etc.) é guardada como um
 * documento JSON dentro da tabela `records` (ver schema.sql). Isso evita
 * modelar 13 tabelas relacionais diferentes e mantém o backend compatível
 * com o mesmo formato de dados que o frontend já usa no localStorage.
 * ============================================================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',') }));
app.use(express.json({ limit: '5mb' }));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'solaris_os',
  waitForConnections: true,
  connectionLimit: 10,
});

function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// Nomes de coleção só podem ter letras, números e underline — evita SQL/URL malformada.
function validCollection(name) {
  return /^[a-zA-Z0-9_]+$/.test(name);
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'solaris-os-server' }));

// --- LISTAR ---------------------------------------------------------------
app.get('/api/:collection', async (req, res) => {
  const { collection } = req.params;
  if (!validCollection(collection)) return res.status(400).json({ error: 'Coleção inválida.' });
  try {
    const [rows] = await pool.query(
      'SELECT id, data, created_at, updated_at FROM records WHERE collection = ? ORDER BY created_at ASC',
      [collection]
    );
    res.json(rows.map(rowToRecord));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao consultar o banco de dados.' });
  }
});

// --- BUSCAR UM ---------------------------------------------------------------
app.get('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  if (!validCollection(collection)) return res.status(400).json({ error: 'Coleção inválida.' });
  try {
    const [rows] = await pool.query(
      'SELECT id, data, created_at, updated_at FROM records WHERE collection = ? AND id = ?',
      [collection, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Registro não encontrado.' });
    res.json(rowToRecord(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao consultar o banco de dados.' });
  }
});

// --- CRIAR ---------------------------------------------------------------
app.post('/api/:collection', async (req, res) => {
  const { collection } = req.params;
  if (!validCollection(collection)) return res.status(400).json({ error: 'Coleção inválida.' });
  try {
    const id = req.body.id || uid();
    const data = { ...req.body, id };
    await pool.query(
      'INSERT INTO records (collection, id, data, created_at) VALUES (?, ?, CAST(? AS JSON), NOW())',
      [collection, id, JSON.stringify(data)]
    );
    const [rows] = await pool.query('SELECT id, data, created_at, updated_at FROM records WHERE collection=? AND id=?', [collection, id]);
    res.status(201).json(rowToRecord(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar registro.' });
  }
});

// --- ATUALIZAR (merge) ---------------------------------------------------------------
app.put('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  if (!validCollection(collection)) return res.status(400).json({ error: 'Coleção inválida.' });
  try {
    const [rows] = await pool.query('SELECT data FROM records WHERE collection=? AND id=?', [collection, id]);
    if (!rows.length) return res.status(404).json({ error: 'Registro não encontrado.' });
    const current = JSON.parse(rows[0].data);
    const merged = { ...current, ...req.body, id };
    await pool.query(
      'UPDATE records SET data = CAST(? AS JSON), updated_at = NOW() WHERE collection=? AND id=?',
      [JSON.stringify(merged), collection, id]
    );
    const [after] = await pool.query('SELECT id, data, created_at, updated_at FROM records WHERE collection=? AND id=?', [collection, id]);
    res.json(rowToRecord(after[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao atualizar registro.' });
  }
});

// --- REMOVER ---------------------------------------------------------------
app.delete('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  if (!validCollection(collection)) return res.status(400).json({ error: 'Coleção inválida.' });
  try {
    await pool.query('DELETE FROM records WHERE collection=? AND id=?', [collection, id]);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao remover registro.' });
  }
});

// --- SEQUÊNCIA (número automático de OS, etc.) ---------------------------------------------------------------
app.post('/api/_sequence/:name', async (req, res) => {
  const { name } = req.params;
  if (!validCollection(name)) return res.status(400).json({ error: 'Nome de sequência inválido.' });
  try {
    await pool.query('INSERT INTO sequences (name, value) VALUES (?, 1) ON DUPLICATE KEY UPDATE value = value + 1', [name]);
    const [rows] = await pool.query('SELECT value FROM sequences WHERE name = ?', [name]);
    res.json({ name, value: rows[0].value });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao gerar sequência.' });
  }
});

function rowToRecord(row) {
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  return { ...data, id: row.id, createdAt: row.created_at, updatedAt: row.updated_at || undefined };
}

app.listen(PORT, () => {
  console.log(`✅ Solaris OS server rodando em http://localhost:${PORT}`);
  console.log(`   Endpoints em http://localhost:${PORT}/api/:collection`);
});
