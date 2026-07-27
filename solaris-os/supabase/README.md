# 🗄️ Solaris OS — Banco de dados via Supabase

Esta é a forma **mais simples** de ligar um banco de dados de verdade ao sistema — não precisa instalar nem hospedar nenhum servidor (diferente da opção `/server`, que usa Node.js + MySQL). O Supabase já expõe uma API REST pronta em cima de um banco PostgreSQL gerenciado.

## Passo a passo

### 1) Crie um projeto no Supabase
Acesse [supabase.com](https://supabase.com), crie uma conta gratuita e clique em **New project**. Anote a senha do banco que você definir.

### 2) Rode o schema
No painel do seu projeto, vá em **SQL Editor → New query**, cole todo o conteúdo do arquivo [`schema.sql`](./schema.sql) (que está nesta mesma pasta) e clique em **Run**.

Isso cria:
- a tabela `records` (guarda clientes, produtos, ordens de serviço, etc. — cada coleção como documentos JSON)
- a tabela `sequences` (usada para o número automático da OS)
- a função `next_sequence()` (incrementa contadores de forma segura)
- as políticas de RLS liberando acesso para a chave pública (`anon`) — veja o aviso de segurança abaixo
- um usuário de demonstração (`admin` / `123456`) e alguns cadastros básicos (categorias, fornecedores, modelos, equipes)

### 3) Pegue as chaves do projeto
Em **Project Settings → API**, copie:
- **Project URL** (ex: `https://xxxxxxxx.supabase.co`)
- **anon public key** (uma chave longa, começando com `eyJ...`)

### 4) Configure o frontend
Abra `js/config.js` na raiz do projeto e edite:

```js
window.SOLARIS_CONFIG = {
  // ...
  dbMode: 'supabase',
  supabaseUrl: 'https://xxxxxxxx.supabase.co',
  supabaseAnonKey: 'eyJ...',
};
```

Salve, atualize a página e pronto — o sistema inteiro (clientes, OS, estoque, financeiro, etc.) passa a ler e gravar direto no seu projeto Supabase, sem precisar rodar nada localmente.

## Popular mais dados de exemplo (opcional)

O `schema.sql` já cria o usuário admin e alguns cadastros básicos, mas não cria clientes/produtos/OS de demonstração (para você começar com uma base limpa). Se quiser os mesmos dados de exemplo usados no modo local, veja os métodos `Seed.clientes()`, `Seed.produtos()`, etc. em `js/storage.js` — são só objetos JavaScript simples que podem ser adaptados para `insert into records (...)`.

## ⚠️ Segurança

O acesso está liberado para a chave `anon` (a mesma chave pública usada no frontend), o que é adequado para um **sistema interno de uso da equipe** — mas qualquer pessoa que tiver essa chave consegue ler/gravar nas tabelas. Antes de expor o sistema publicamente na internet:

- Considere migrar o login para o **Supabase Auth** e trocar as policies de RLS por regras baseadas em `auth.uid()`.
- Adicione hash de senha (a coleção `usuarios` hoje guarda senha em texto puro, igual ao protótipo local).
- Restrinja o domínio de onde as requisições podem vir, se possível.

## Trocar de volta para o modo local

Basta voltar `dbMode: 'local'` em `js/config.js`. Nenhum dado é perdido — cada modo guarda os dados em um lugar diferente (navegador vs. Supabase), então você pode alternar entre eles a qualquer momento durante o desenvolvimento.
