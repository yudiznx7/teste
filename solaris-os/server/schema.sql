-- ============================================================================
-- SOLARIS OS — SCHEMA MySQL
-- ============================================================================
-- Modelo genérico "coleção + JSON": cada linha guarda um registro (cliente,
-- produto, OS, etc.) como um documento JSON, exatamente como o localStorage
-- guardava no frontend. Isso permite migrar o app inteiro para um banco real
-- SEM redesenhar 13 tabelas diferentes nem tocar em uma linha do frontend.
--
-- Se no futuro você quiser tabelas relacionais "de verdade" (ex: uma tabela
-- `clientes` com colunas tipadas), este schema serve como ponto de partida:
-- basta criar as tabelas específicas e trocar as queries em server.js —
-- o contrato REST consumido pelo frontend (js/storage.js) não muda.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS solaris_os CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE solaris_os;

CREATE TABLE IF NOT EXISTS records (
  collection   VARCHAR(64)  NOT NULL,
  id           VARCHAR(64)  NOT NULL,
  data         JSON         NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NULL,
  PRIMARY KEY (collection, id),
  INDEX idx_collection (collection)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sequences (
  name   VARCHAR(64) NOT NULL PRIMARY KEY,
  value  INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- DADOS INICIAIS — usuário admin + cadastros básicos de configuração,
-- para você já conseguir entrar no sistema assim que ligar a API.
-- ----------------------------------------------------------------------------

INSERT INTO records (collection, id, data, created_at) VALUES
  ('usuarios', 'u1', JSON_OBJECT(
      'nome', 'Admin Solaris', 'usuario', 'admin', 'senha', '123456',
      'cargo', 'Administrador', 'email', '[email protected]', 'foto', ''
    ), NOW())
ON DUPLICATE KEY UPDATE data = VALUES(data);

INSERT INTO records (collection, id, data, created_at) VALUES
  ('categorias', 'cat1', JSON_OBJECT('nome', 'Módulos'), NOW()),
  ('categorias', 'cat2', JSON_OBJECT('nome', 'Inversores'), NOW()),
  ('categorias', 'cat3', JSON_OBJECT('nome', 'Estruturas'), NOW()),
  ('categorias', 'cat4', JSON_OBJECT('nome', 'Cabos'), NOW()),
  ('categorias', 'cat5', JSON_OBJECT('nome', 'Conectores'), NOW()),
  ('categorias', 'cat6', JSON_OBJECT('nome', 'Ferramentas'), NOW())
ON DUPLICATE KEY UPDATE data = VALUES(data);

INSERT INTO records (collection, id, data, created_at) VALUES
  ('fornecedores', 'forn1', JSON_OBJECT('nome', 'Canadian Solar'), NOW()),
  ('fornecedores', 'forn2', JSON_OBJECT('nome', 'Growatt'), NOW()),
  ('fornecedores', 'forn3', JSON_OBJECT('nome', 'Romagnole'), NOW())
ON DUPLICATE KEY UPDATE data = VALUES(data);

INSERT INTO records (collection, id, data, created_at) VALUES
  ('modelos_inversores', 'inv1', JSON_OBJECT('nome', 'Growatt MIN 5000TL-X'), NOW()),
  ('modelos_inversores', 'inv2', JSON_OBJECT('nome', 'Deye SUN 5K'), NOW())
ON DUPLICATE KEY UPDATE data = VALUES(data);

INSERT INTO records (collection, id, data, created_at) VALUES
  ('modelos_modulos', 'mod1', JSON_OBJECT('nome', 'Canadian Solar 550W'), NOW()),
  ('modelos_modulos', 'mod2', JSON_OBJECT('nome', 'Jinko Tiger Neo 555W'), NOW())
ON DUPLICATE KEY UPDATE data = VALUES(data);

INSERT INTO records (collection, id, data, created_at) VALUES
  ('equipes_config', 'eq1', JSON_OBJECT('nome', 'Equipe Alpha'), NOW()),
  ('equipes_config', 'eq2', JSON_OBJECT('nome', 'Equipe Beta'), NOW())
ON DUPLICATE KEY UPDATE data = VALUES(data);

INSERT INTO sequences (name, value) VALUES ('os', 0)
ON DUPLICATE KEY UPDATE value = value;
