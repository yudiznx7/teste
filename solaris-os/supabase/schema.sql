-- ============================================================================
-- SOLARIS OS — SCHEMA SUPABASE (PostgreSQL)
-- ============================================================================
-- Rode este script inteiro em: Supabase → SQL Editor → New query → Run.
--
-- Modelo genérico "coleção + documento JSON": cada linha guarda um registro
-- (cliente, produto, OS, etc.) dentro de uma coluna `jsonb`, exatamente como
-- o localStorage guardava no frontend. Isso evita modelar 13 tabelas
-- relacionais diferentes e mantém 100% de compatibilidade com o formato que
-- js/storage.js já usa — nenhuma tela do sistema precisa mudar.
-- ============================================================================

create table if not exists records (
  collection  text        not null,
  id          text        not null,
  data        jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  primary key (collection, id)
);

create index if not exists idx_records_collection on records (collection);

create table if not exists sequences (
  name  text primary key,
  value integer not null default 0
);

-- ----------------------------------------------------------------------------
-- Função usada por DB.nextSequence() (ex: número automático da OS).
-- Incrementa e retorna o novo valor de forma atômica.
-- ----------------------------------------------------------------------------
create or replace function next_sequence(seq_name text)
returns integer
language plpgsql
as $$
declare
  new_value integer;
begin
  insert into sequences (name, value) values (seq_name, 1)
  on conflict (name) do update set value = sequences.value + 1
  returning value into new_value;
  return new_value;
end;
$$;

-- ----------------------------------------------------------------------------
-- RLS (Row Level Security)
-- ----------------------------------------------------------------------------
-- Este projeto é um sistema interno (login próprio, não usa o Auth do
-- Supabase), então liberamos leitura/escrita para a chave "anon" — a mesma
-- chave pública usada pelo frontend em js/config.js. Isso é adequado para um
-- sistema de uso interno da equipe, mas ATENÇÃO: qualquer pessoa com a
-- anon key consegue ler/gravar nessas tabelas. Se o sistema for exposto
-- publicamente, considere migrar o login para o Supabase Auth e trocar estas
-- policies por regras baseadas em auth.uid().
alter table records enable row level security;
alter table sequences enable row level security;

drop policy if exists "records_all_anon" on records;
create policy "records_all_anon" on records
  for all using (true) with check (true);

drop policy if exists "sequences_all_anon" on sequences;
create policy "sequences_all_anon" on sequences
  for all using (true) with check (true);

-- ----------------------------------------------------------------------------
-- DADOS INICIAIS — usuário admin + cadastros básicos, para você já conseguir
-- entrar no sistema assim que ligar o modo 'supabase' em js/config.js.
-- ----------------------------------------------------------------------------
insert into records (collection, id, data, created_at) values
  ('usuarios', 'u1', jsonb_build_object(
      'nome', 'Admin Solaris', 'usuario', 'admin', 'senha', '123456',
      'cargo', 'Administrador', 'email', '[email protected]', 'foto', ''
    ), now())
on conflict (collection, id) do update set data = excluded.data;

insert into records (collection, id, data, created_at) values
  ('categorias', 'cat1', jsonb_build_object('nome', 'Módulos'), now()),
  ('categorias', 'cat2', jsonb_build_object('nome', 'Inversores'), now()),
  ('categorias', 'cat3', jsonb_build_object('nome', 'Estruturas'), now()),
  ('categorias', 'cat4', jsonb_build_object('nome', 'Cabos'), now()),
  ('categorias', 'cat5', jsonb_build_object('nome', 'Conectores'), now()),
  ('categorias', 'cat6', jsonb_build_object('nome', 'Ferramentas'), now())
on conflict (collection, id) do update set data = excluded.data;

insert into records (collection, id, data, created_at) values
  ('fornecedores', 'forn1', jsonb_build_object('nome', 'Canadian Solar'), now()),
  ('fornecedores', 'forn2', jsonb_build_object('nome', 'Growatt'), now()),
  ('fornecedores', 'forn3', jsonb_build_object('nome', 'Romagnole'), now())
on conflict (collection, id) do update set data = excluded.data;

insert into records (collection, id, data, created_at) values
  ('modelos_inversores', 'inv1', jsonb_build_object('nome', 'Growatt MIN 5000TL-X'), now()),
  ('modelos_inversores', 'inv2', jsonb_build_object('nome', 'Deye SUN 5K'), now())
on conflict (collection, id) do update set data = excluded.data;

insert into records (collection, id, data, created_at) values
  ('modelos_modulos', 'mod1', jsonb_build_object('nome', 'Canadian Solar 550W'), now()),
  ('modelos_modulos', 'mod2', jsonb_build_object('nome', 'Jinko Tiger Neo 555W'), now())
on conflict (collection, id) do update set data = excluded.data;

insert into records (collection, id, data, created_at) values
  ('equipes_config', 'eq1', jsonb_build_object('nome', 'Equipe Alpha'), now()),
  ('equipes_config', 'eq2', jsonb_build_object('nome', 'Equipe Beta'), now())
on conflict (collection, id) do update set data = excluded.data;

insert into sequences (name, value) values ('os', 0)
on conflict (name) do nothing;
