/**
 * ============================================================================
 * SOLARIS OS — CONFIGURAÇÃO CENTRAL
 * ============================================================================
 * Edite este arquivo para:
 *  1) Trocar o nome do sistema e a logo (usados no login e na sidebar).
 *  2) Escolher onde os dados ficam guardados: no navegador (localStorage),
 *     em um projeto Supabase, ou em uma API própria (Node.js + MySQL).
 *
 * Este é o ÚNICO arquivo que você precisa tocar para "trocar a marca" ou
 * "ligar o banco de dados" — nenhuma outra tela precisa ser alterada.
 * ============================================================================
 */

window.SOLARIS_CONFIG = {
  // -------------------------------------------------------------------------
  // MARCA
  // -------------------------------------------------------------------------
  // Nome exibido no login, na sidebar e no título das páginas.
  brandName: 'PowerGrid Solar OS',

  // Texto pequeno abaixo do nome (ex: "ENERGIA SOLAR", "GESTÃO INTELIGENTE").
  brandTagline: 'ENERGIA SOLAR',

  // URL de uma imagem de logo (PNG/SVG/JPG). Deixe '' (vazio) para usar o
  // ícone padrão (sol/painel solar) desenhado em CSS.
  // Ex: 'assets/images/minha-logo.png' (a partir da raiz do projeto).
  logoUrl: '',

  // -------------------------------------------------------------------------
  // BANCO DE DADOS
  // -------------------------------------------------------------------------
  // 'local'    → usa o localStorage do navegador (padrão, funciona sem servidor)
  // 'supabase' → usa um projeto Supabase (Postgres gerenciado), sem precisar
  //              rodar nenhum servidor próprio — veja /supabase/README.md
  // 'api'      → usa uma API própria (Node.js + MySQL incluído em /server)
  dbMode: 'local',

  // Usado apenas quando dbMode = 'supabase'. Pegue esses valores em
  // Supabase → Project Settings → API.
  supabaseUrl: 'https://xxjqoisfcrdpvmbtltxe.supabase.co',
  supabaseAnonKey: 'sb_publishable_YOLlUmnbv53dg6HhAiGk-g_JfquWGW5',

  // Usado apenas quando dbMode = 'api'. Endereço do backend Node.js incluído
  // na pasta /server (veja /server/server.js).
  apiBaseUrl: 'http://localhost:3001/api',
};
