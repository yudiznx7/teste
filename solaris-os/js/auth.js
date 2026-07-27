/**
 * ============================================================================
 * SOLARIS OS — AUTENTICAÇÃO (tela de login)
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  applyBrand();
  await Seed.run();

  // Se já existe sessão ativa, pula direto pro dashboard.
  if (sessionStorage.getItem('solaris_session') || localStorage.getItem('solaris_session')) {
    window.location.href = 'pages/dashboard.html';
    return;
  }

  setTimeout(() => document.getElementById('loading-screen')?.classList.add('hide'), 400);

  const views = {
    login: document.getElementById('login-view'),
    register: document.getElementById('register-view'),
    forgot: document.getElementById('forgot-view'),
  };
  function showView(name) {
    Object.values(views).forEach((v) => v.classList.add('d-none'));
    views[name].classList.remove('d-none');
  }
  document.getElementById('show-register-link').addEventListener('click', (e) => { e.preventDefault(); showView('register'); });
  document.getElementById('show-login-link').addEventListener('click', (e) => { e.preventDefault(); showView('login'); });
  document.getElementById('forgot-pass-link').addEventListener('click', (e) => { e.preventDefault(); showView('forgot'); });
  document.getElementById('back-to-login-link').addEventListener('click', (e) => { e.preventDefault(); showView('login'); });

  // Mostrar/ocultar senha
  document.getElementById('toggle-pass').addEventListener('click', () => {
    const input = document.getElementById('login-pass');
    const icon = document.querySelector('#toggle-pass i');
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
  });

  // LOGIN
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const usuario = document.getElementById('login-user').value.trim();
    const senha = document.getElementById('login-pass').value;
    const remember = document.getElementById('remember-me').checked;
    const errorBox = document.getElementById('login-error');
    const btn = document.getElementById('login-submit-btn');
    const spinner = document.getElementById('login-spinner');

    errorBox.classList.add('d-none');
    btn.disabled = true;
    spinner.classList.remove('d-none');

    try {
      const users = await DB.get('usuarios');
      const found = users.find((u) => u.usuario.toLowerCase() === usuario.toLowerCase() && u.senha === senha);
      if (!found) {
        errorBox.textContent = 'Usuário ou senha inválidos. Verifique e tente novamente.';
        errorBox.classList.remove('d-none');
        btn.disabled = false;
        spinner.classList.add('d-none');
        return;
      }
      const session = JSON.stringify({ id: found.id, nome: found.nome, usuario: found.usuario, cargo: found.cargo });
      if (remember) localStorage.setItem('solaris_session', session);
      else sessionStorage.setItem('solaris_session', session);
      window.location.href = 'pages/dashboard.html';
    } catch (err) {
      errorBox.textContent = 'Não foi possível conectar ao servidor de autenticação. Verifique a configuração da API em js/config.js.';
      errorBox.classList.remove('d-none');
      btn.disabled = false;
      spinner.classList.add('d-none');
      console.error(err);
    }
  });

  // CADASTRO
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('reg-nome').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const usuario = document.getElementById('reg-user').value.trim();
    const senha = document.getElementById('reg-pass').value;
    const errorBox = document.getElementById('register-error');

    const users = await DB.get('usuarios');
    if (users.some((u) => u.usuario.toLowerCase() === usuario.toLowerCase())) {
      errorBox.textContent = 'Este nome de usuário já está em uso.';
      errorBox.classList.remove('d-none');
      return;
    }
    await DB.insert('usuarios', { nome, email, usuario, senha, cargo: 'Usuário', foto: '' });
    Utils.toast('Conta criada com sucesso! Faça login para continuar.', 'success');
    showView('login');
    document.getElementById('login-user').value = usuario;
    document.getElementById('register-form').reset();
  });

  // ESQUECI SENHA
  document.getElementById('forgot-form').addEventListener('submit', (e) => {
    e.preventDefault();
    Utils.toast('Se o usuário existir, enviaremos instruções de redefinição por e-mail.', 'info');
    document.getElementById('forgot-form').reset();
    showView('login');
  });
});

/** Aplica nome da marca e logo (definidos em js/config.js) na tela de login. */
function applyBrand() {
  const cfg = window.SOLARIS_CONFIG || {};
  document.querySelectorAll('[data-brand-name]').forEach((el) => { el.textContent = cfg.brandName || 'Solaris OS'; });
  document.querySelectorAll('[data-brand-tagline]').forEach((el) => { el.textContent = cfg.brandTagline || ''; });
  if (cfg.logoUrl) {
    document.querySelectorAll('[data-brand-logo]').forEach((el) => {
      el.innerHTML = `<img src="${cfg.logoUrl}" alt="${cfg.brandName || 'Logo'}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
    });
  }
  document.title = document.title.replace('Solaris OS', cfg.brandName || 'Solaris OS');
}
