# ☀️ Solaris OS

Sistema web completo para gestão de **Ordens de Serviço, Estoque, Compras, Equipes e Financeiro** de empresas de energia solar. Interface no estilo SaaS moderno (Monday / Notion / ClickUp / Tiny ERP), 100% responsiva, com login, dashboard analítico e relatórios exportáveis em PDF.

> **Stack (frontend):** HTML5 · CSS3 · JavaScript (ES6+) · Bootstrap 5 · Font Awesome 6 · Chart.js 4
> **Banco de dados (opcional):** Supabase (Postgres gerenciado, sem servidor próprio — recomendado) **ou** Node.js + Express + MySQL (pasta `/server`)
> **Persistência:** alterna entre `localStorage` (padrão, sem servidor), Supabase e API própria, com **uma única linha** em `js/config.js` — veja a seção *Banco de dados*.

---

## 🚀 Como rodar localmente (modo padrão, sem servidor)

Como o frontend é 100% estático, basta servir a pasta com qualquer servidor HTTP local (não abra `index.html` direto com `file://`, pois `fetch`/rotas relativas funcionam melhor com um servidor):

```bash
# Opção 1 — Python
python3 -m http.server 8080

# Opção 2 — Node
npx serve .

# Opção 3 — VS Code
# Instale a extensão "Live Server" e clique em "Go Live"
```

Acesse `http://localhost:8080` e entre com o usuário de demonstração:

- **Usuário:** `admin`
- **Senha:** `123456`

Na primeira execução, o sistema popula automaticamente o `localStorage` com dados de exemplo (clientes, produtos, ordens de serviço, equipe e despesas), então você já pode testar todas as telas imediatamente. Esse é o modo `dbMode: 'local'` (padrão) em `js/config.js`.

---

## 📁 Estrutura de pastas

```
/
├── index.html                  → Tela de login (entrada do sistema)
├── 404.html                    → Página de erro personalizada
├── netlify.toml                → Configuração de deploy (Netlify)
├── README.md
│
├── css/
│   └── style.css               → Design system completo (tokens, componentes, dark mode)
│
├── js/
│   ├── config.js                 → ⭐ ARQUIVO DE CONFIGURAÇÃO — nome, logo e modo do banco de dados
│   ├── storage.js                → Camada de dados (DB), assíncrona, fala com localStorage OU com a API
│   ├── utils.js                  → Toasts, modais de confirmação, formatação, helpers
│   ├── auth.js                   → Login, cadastro de usuário, recuperação de senha
│   ├── app-shell.js              → Sidebar + Topbar + tema + logout (compartilhado)
│   ├── dashboard.js, clientes.js, ordens.js, estoque.js, produto-detalhes.js,
│   │   compras.js, equipe.js, financeiro.js, relatorios.js, configuracoes.js
│
├── pages/                      → Todas as telas internas (pós-login)
│   ├── dashboard.html
│   ├── clientes.html
│   ├── ordens-servico.html
│   ├── estoque.html
│   ├── produto-detalhes.html
│   ├── compras.html
│   ├── equipe.html
│   ├── financeiro.html
│   ├── relatorios.html
│   └── configuracoes.html
│
├── components/                 → Reservado para fragmentos HTML reutilizáveis futuros
├── assets/
│   ├── images/favicon.svg      → Ícone/logo padrão do sistema (marca "sol + painel")
│   └── icons/                  → Reservado para ícones customizados
│
├── supabase/                    → BANCO DE DADOS VIA SUPABASE (recomendado, sem servidor)
│   ├── schema.sql                → Tabelas, RLS, função de sequência e dados iniciais
│   └── README.md                 → Passo a passo de configuração
│
└── server/                     → BACKEND ALTERNATIVO (Node.js + Express + MySQL)
    ├── server.js                → API REST genérica que substitui o localStorage
    ├── schema.sql               → Script de criação do banco + dados iniciais
    ├── package.json
    └── .env.example             → Modelo de variáveis de ambiente (copie para .env)
```

---

## 🧩 Módulos implementados

| Módulo | Funcionalidades |
|---|---|
| **Login** | Usuário/senha, mostrar senha, lembrar login, cadastro, recuperação de senha, animações |
| **Dashboard** | KPIs de OS/estoque/financeiro + 4 gráficos Chart.js + últimas movimentações e OS |
| **Clientes** | CRUD completo, busca, filtro por status, paginação, localização via Google Maps ou Waze (link próprio ou gerado a partir do endereço) e botão de compartilhar endereço via WhatsApp |
| **Ordens de Serviço** | Numeração automática, checklist, materiais com baixa automática de estoque ao concluir, duplicar, cancelar, excluir, abrir localização do cliente e enviar endereço por WhatsApp para o técnico |
| **Estoque** | Cards com status (verde/amarelo/vermelho), página de detalhes com histórico de entradas/saídas |
| **Compras** | Alerta e lista automática de reposição por estoque mínimo, histórico de compras |
| **Equipe** | Cadastro de técnicos, indicador visual de instalações realizadas x pendentes |
| **Financeiro** | Lançamento de despesas por categoria, gráficos, filtros |
| **Relatórios** | 6 tipos de relatório com filtro por período, impressão e exportação em PDF |
| **Configurações** | Cadastro de categorias, fornecedores, modelos de inversor/módulo, equipes e usuários |

### 🎨 Identidade visual
- **Paleta:** azul profundo (`#0B1E3D`→`#1B4B8C`) + amarelo solar (`#FFC845`) + branco, com verde/âmbar/vermelho para status.
- **Tipografia:** *Sora* (títulos), *Inter* (corpo), *JetBrains Mono* (códigos e números de OS).
- **Assinatura visual:** o **arco solar** — um anel de progresso circular usado consistentemente para representar conclusão de checklist e produtividade da equipe, reforçando a identidade "energia solar" em vez de badges genéricos.
- Dark mode, glassmorphism leve, toasts, modais de confirmação (sem `alert`/`confirm` nativos), loading screen animada, sidebar recolhível/responsiva.

---

## ☁️ Deploy na Netlify

1. Suba esta pasta para um repositório Git (GitHub/GitLab/Bitbucket).
2. Na Netlify: **Add new site → Import an existing project**.
3. Build command: *(vazio — não há build)*. Publish directory: `.` (raiz).
4. Deploy. O `netlify.toml` já está configurado com cache de assets e o `404.html` customizado é detectado automaticamente.

Também é possível arrastar a pasta inteira na área de *Deploys* do Netlify (drag-and-drop) para publicar sem Git.

---

## 🎨 Como trocar o nome e a logo do sistema

Tudo isso fica em **um único arquivo**: `js/config.js`.

```js
window.SOLARIS_CONFIG = {
  brandName: 'Solaris OS',        // ← troque pelo nome da sua empresa/sistema
  brandTagline: 'ENERGIA SOLAR',  // ← texto pequeno abaixo do nome
  logoUrl: '',                    // ← ex: 'assets/images/minha-logo.png'
  dbMode: 'local',
  apiBaseUrl: 'http://localhost:3001/api',
};
```

- **Nome:** edite `brandName`. Ele é aplicado automaticamente no login, na sidebar e no título da aba do navegador.
- **Logo:** coloque seu arquivo (PNG, JPG ou SVG) dentro de `assets/images/` e informe o caminho em `logoUrl` (ex: `assets/images/minha-logo.png`). Deixe `''` para continuar usando o ícone padrão de sol/painel solar.
- **Ícone da aba do navegador (favicon):** substitua o arquivo `assets/images/favicon.svg` pelo seu próprio ícone, mantendo o mesmo nome — ou aponte `<link rel="icon" href="...">` para outro arquivo em cada página.

Nenhum outro arquivo precisa ser tocado para isso.

---

## 🗄️ Banco de dados — como ligar um banco de verdade

O sistema tem **3 modos**, trocados em uma única linha (`dbMode`) no arquivo `js/config.js`. Nenhuma tela precisa mudar em nenhum dos casos — todas conversam apenas com o objeto `DB` em `js/storage.js`.

| Modo | Onde os dados ficam | Precisa de servidor? |
|---|---|---|
| `'local'` (padrão) | `localStorage` do navegador | Não |
| `'supabase'` **(recomendado)** | Projeto Supabase (Postgres gerenciado) | Não |
| `'api'` | Seu próprio backend (Node.js + MySQL, incluído em `/server`) | Sim |

### Opção recomendada: Supabase (sem precisar hospedar nada)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No **SQL Editor** do projeto, rode o script `/supabase/schema.sql` (cria as tabelas, a função de sequência, as políticas de acesso e já deixa um usuário `admin`/`123456` pronto para login).
3. Em `js/config.js`:
   ```js
   dbMode: 'supabase',
   supabaseUrl: 'https://SEU-PROJETO.supabase.co',
   supabaseAnonKey: 'SUA-CHAVE-ANON-PUBLICA',   // Project Settings → API
   ```
4. Pronto — todo o sistema passa a ler/gravar direto no Postgres do seu projeto Supabase.

Passo a passo completo, com capturas do que copiar de onde, em [`/supabase/README.md`](./supabase/README.md).

### Alternativa: backend próprio (Node.js + MySQL)

Se preferir hospedar seu próprio servidor em vez de usar o Supabase, a pasta `/server` já traz uma API Express + MySQL pronta:

```bash
cd server
npm install
cp .env.example .env
# edite o .env com o host/usuário/senha do seu MySQL
mysql -u root -p < schema.sql    # cria o banco e as tabelas
npm start                        # sobe em http://localhost:3001
```

Depois, em `js/config.js`:
```js
dbMode: 'api',
apiBaseUrl: 'http://localhost:3001/api',   // ou a URL do seu servidor publicado
```

O backend expõe estes endpoints (consumidos automaticamente pelo frontend):
```
GET    /api/:collection          → lista registros (clientes, produtos, ordens, ...)
GET    /api/:collection/:id      → um registro
POST   /api/:collection          → cria um registro
PUT    /api/:collection/:id      → atualiza um registro
DELETE /api/:collection/:id      → remove um registro
POST   /api/_sequence/:name      → gera número sequencial (nº automático da OS)
```

### Por que isso funciona sem reescrever as telas

Toda a persistência do sistema passa **exclusivamente** pelo objeto `DB` em `js/storage.js`:

```js
DB.get('clientes')          // lista uma coleção
DB.find('clientes', id)     // busca um registro
DB.insert('clientes', data) // cria um registro
DB.update('clientes', id, patch)
DB.remove('clientes', id)
DB.nextSequence('os')       // gera número sequencial (ex: nº da OS)
```

Dependendo do `dbMode`, essas funções leem/gravam no `localStorage`, fazem chamadas ao Supabase (`supabase-js`), ou fazem `fetch()` para o backend em `/server`. Nenhuma tela ou componente acessa o armazenamento diretamente — todas usam essa mesma API, então a troca entre os três modos é transparente e pode ser feita a qualquer momento.

### Estrutura de dados

Tanto o `/supabase/schema.sql` quanto o `/server/schema.sql` usam o mesmo modelo genérico "coleção + documento JSON" (uma tabela `records` com colunas `collection`, `id`, `data`), o que evita modelar 13 tabelas relacionais diferentes e mantém total compatibilidade com o formato que o frontend já usa. Se no futuro você quiser tabelas 100% relacionais (colunas tipadas por entidade), use esses schemas como ponto de partida.

> ⚠️ **Segurança:** tanto o backend próprio quanto o schema do Supabase são pontos de partida funcionais para uso interno da equipe, mas as senhas de usuário são salvas em texto puro (igual ao protótipo em `localStorage`) e o acesso à API/tabelas não exige token de autenticação. Antes de expor o sistema publicamente na internet, adicione hash de senha (ex: `bcrypt`), autenticação (JWT ou Supabase Auth) e restrinja as origens permitidas (`CORS_ORIGIN` no `/server`, ou políticas de RLS mais específicas no Supabase).

---

## ✅ Qualidade

- Código modularizado por página/responsabilidade, comentado em português.
- Sem dependências desnecessárias — apenas Bootstrap, Font Awesome, Chart.js e html2pdf.js (todos via CDN).
- Totalmente responsivo: desktop, notebook, tablet e celular (sidebar vira drawer, grids reempilham, cards do dashboard reduzem fonte/ícone em telas pequenas para nunca sobrepor os números).
- Acessibilidade básica: foco visível, `prefers-reduced-motion` respeitado, textos alternativos em ícones informativos.
