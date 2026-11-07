/* ===== App: autenticação, layout, rotas, tema, PWA, inicialização ===== */
const Auth = {
  user: null, fails: 0, lock: 0,
  login(login, senha) {
    if (Date.now() < this.lock) throw new UserError(`Muitas tentativas. Aguarde ${Math.ceil((this.lock - Date.now()) / 1000)}s.`);
    const u = Store.all('users').find(x => x.login === String(login).trim().toLowerCase() && x.ativo !== false);
    if (!u || u.senhaHash !== hashSenha(u.login, senha)) { if (++this.fails >= 5) { this.lock = Date.now() + 30000; this.fails = 0; } throw new UserError('Usuário ou senha inválidos.'); }
    this.fails = 0; this.user = u; try { localStorage.setItem('bs_session', JSON.stringify({ id: u.id, exp: Date.now() + 12 * 3600e3 })); localStorage.setItem('bs_lastlogin', u.login); } catch (e) { }
  },
  restore() { try { const s = JSON.parse(localStorage.getItem('bs_session') || 'null'); if (s && s.exp > Date.now()) { const u = Store.get('users', s.id); if (u && u.ativo !== false) { this.user = u; return true; } } } catch (e) { } return false; },
  logout() { this.user = null; try { localStorage.removeItem('bs_session'); } catch (e) { } },
  can(m) { return !!this.user && (this.user.perfil === 'admin' || (this.user.permissoes || []).includes(m)); }
};
function seedBase() {
  Store.seed('config', { ...DEFAULT_CFG });
  Store.seed('users', { id: 'u_admin', nome: 'Administrador', login: APP_CONFIG.ADMIN_LOGIN, senhaHash: APP_CONFIG.ADMIN_HASH, perfil: 'admin', permissoes: [], ativo: true });
}
let deferredInstall = null;

const App = {
  page: null, name: null,
  setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('bs_theme', t); } catch (e) { } const b = $('#themeBtn'); if (b) b.innerHTML = ic(t === 'dark' ? 'sun' : 'moon', 18); const m = $('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#0d0c0b' : '#faf6ef'; },
  toggleTheme() { this.setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); },
  buildNav() {
    const nav = $('#nav'); if (!nav) return;
    nav.innerHTML = MODS.filter(m => Auth.can(m[0])).map(([k, l, i]) => `<a href="#/${k}" data-nav="${k}">${ic(i, 19)}<span>${l}</span>${k === 'notificacoes' ? '<em id="nbadge" class="nbadge" hidden></em>' : ''}</a>`).join('');
    $('#uName').textContent = Auth.user.nome; $('#uRole').textContent = ROLES[Auth.user.perfil]; $('#uAv').textContent = initials(Auth.user.nome);
    this.updateBadge(); this.markNav();
  },
  markNav() { $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === this.name)); },
  updateBadge() { const n = notifications().filter(x => x.level === 'danger' || x.level === 'warn').length; [$('#nbadge'), $('#bellCount')].forEach(b => { if (b) { b.textContent = n > 99 ? '99+' : n; b.hidden = !n; } }); },
  route() {
    if (!Auth.user) return;
    let name = (location.hash.replace(/^#\/?/, '') || '').split('?')[0];
    if (!Pages[name] || !Auth.can(name)) { name = MODS.map(m => m[0]).find(m => Auth.can(m) && Pages[m]); if (location.hash !== '#/' + name) { location.hash = '#/' + name; return; } }
    this.name = name; this.page = Pages[name]; $('#sidebar').classList.remove('open'); $('#scrim').hidden = true;
    $('#pageTitle').textContent = this.page.title; document.title = `${this.page.title} · Bridal Store`; this.markNav();
    const v = $('#view'); v.classList.remove('fade'); void v.offsetWidth; v.classList.add('fade'); v.scrollTop = 0; window.scrollTo(0, 0);
    try { this.page.render(v); } catch (e) { console.error(e); v.innerHTML = `<div class="card"><p>Erro ao abrir a página: ${esc(e.message)}</p></div>`; }
  },
  refresh: debounce(() => { if (!Auth.user || !App.page) return; App.updateBadge(); try { if (App.page.refresh) App.page.refresh(); } catch (e) { console.error(e); } }, 120),
  syncInfo() { const el = $('#sync-info'); if (!el) return; const m = { off: 'Sincronização desativada (dados só neste dispositivo).', ok: 'Sincronizado com a planilha' + (Sync.last ? ' às ' + Sync.last.toLocaleTimeString('pt-BR') : '') + '.', pending: `${Store.dirtyCount()} alteração(ões) aguardando envio.`, busy: 'Sincronizando…', error: 'Erro: ' + Sync.msg }; el.textContent = m[Sync.state] || ''; },
  updateSyncDot() { const d = $('#syncBtn'); if (!d) return; const m = { off: ['Sem planilha', 'off'], ok: ['Sincronizado', 'ok'], pending: ['Pendente', 'warn'], busy: ['Sincronizando…', 'busy'], error: ['Erro de sincronização', 'err'] }[Sync.state]; d.className = 'sync ' + m[1]; d.title = m[0] + (Sync.msg ? ': ' + Sync.msg : ''); $('span', d).textContent = m[0]; this.syncInfo(); },
  updateInstall() { ['#btnInstall', '#btnInstall2', '#btnInstallL'].forEach(s => { const b = $(s); if (b) b.style.display = deferredInstall ? '' : 'none'; }); },
  showApp() {
    $('#login').hidden = true; $('#app').hidden = false; this.buildNav(); this.setTheme(document.documentElement.dataset.theme);
    if (!location.hash || location.hash === '#/') { const first = MODS.map(m => m[0]).find(m => Auth.can(m) && Pages[m]); location.hash = '#/' + first; } else this.route();
    this.updateSyncDot(); this.updateInstall(); browserNotify();
  },
  showLogin() {
    $('#app').hidden = true; $('#login').hidden = false; const u = $('#lg_user'); u.value = localStorage.getItem('bs_lastlogin') || ''; setTimeout(() => (u.value ? $('#lg_pass') : u).focus(), 100);
  }
};

/* ---------- eventos globais ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return; const fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'A' && !el.getAttribute('href')) e.preventDefault(); else if (el.tagName === 'BUTTON') e.preventDefault();
  try { const r = fn(el.dataset, el, e); if (r && r.catch) r.catch(handleErr); } catch (err) { handleErr(err); }
});
document.addEventListener('change', e => { const el = e.target.closest('[data-chg]'); if (el && CHG[el.dataset.chg]) { try { CHG[el.dataset.chg](el.dataset, el, e); } catch (er) { handleErr(er); el.value = el.defaultValue; } } });
const onFlt = e => { const el = e.target.closest('[data-flt]'); if (el && App.page && App.page.onFilter) { try { App.page.onFilter(el.dataset.flt, el.value); } catch (er) { handleErr(er); } } };
document.addEventListener('input', onFlt); document.addEventListener('change', onFlt);
ACT['app:install'] = async () => { if (!deferredInstall) return toast('Use o menu do navegador → “Adicionar à tela inicial”.', 'warn'); deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; App.updateInstall(); };
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; App.updateInstall(); });
window.addEventListener('appinstalled', () => { deferredInstall = null; App.updateInstall(); toast('Aplicativo instalado!'); });
window.addEventListener('hashchange', () => App.route());
document.addEventListener('syncstate', () => App.updateSyncDot());
Store.on(() => App.refresh());
document.addEventListener('keydown', e => { if (e.key === 'Escape' && Modal.stack.length) Modal.stack[Modal.stack.length - 1].close(); });

/* ---------- inicialização ---------- */
(async function boot() {
  try { App.setTheme(localStorage.getItem('bs_theme') || 'dark'); } catch (e) { App.setTheme('dark'); }
  $('#themeBtn').onclick = $('#themeBtnL').onclick = () => App.toggleTheme();
  $('#menuBtn').onclick = () => { $('#sidebar').classList.add('open'); $('#scrim').hidden = false; }; $('#scrim').onclick = () => { $('#sidebar').classList.remove('open'); $('#scrim').hidden = true; };
  $('#bellBtn').onclick = () => { location.hash = '#/notificacoes'; }; $('#syncBtn').onclick = () => { if (Sync.enabled()) Sync.sync(true); else location.hash = '#/config'; };
  $('#logoutBtn').onclick = () => { Auth.logout(); location.hash = ''; App.showLogin(); };
  $('#togglePass').onclick = () => { const p = $('#lg_pass'); p.type = p.type === 'password' ? 'text' : 'password'; };
  $('#loginForm').onsubmit = e => {
    e.preventDefault(); const err = $('#lg_err'); err.textContent = '';
    try { Auth.login($('#lg_user').value, $('#lg_pass').value); $('#lg_pass').value = ''; App.showApp(); }
    catch (er) { err.textContent = er.message; const c = $('.login-card'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }
  };
  await Store.init(); seedBase();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
  if (Sync.enabled()) { $('#lg_status').textContent = 'Conectando à planilha…'; try { await Promise.race([Sync.pull(true), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 9000))]); $('#lg_status').textContent = ''; } catch (e) { $('#lg_status').textContent = 'Modo offline — usando dados deste dispositivo.'; } }
  $('#splash').remove();
  if (Auth.restore()) App.showApp(); else App.showLogin();
  Sync.start(); setInterval(() => { App.updateBadge(); browserNotify(); }, 3600e3); setInterval(() => { if (Auth.user && App.name === 'dashboard') App.refresh(); }, 60000);
})();
