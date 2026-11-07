/* ============================================================
   Bridal Store – Gestão Inteligente  |  Configuração do app
   Cole aqui a URL do Apps Script (implantação "App da Web") e o
   mesmo TOKEN definido no Code.gs. Assim TODOS os dispositivos
   (computador, tablet, celular) já abrem conectados à planilha.
   ============================================================ */
const APP_CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzv1h63ugthMkBZZuJ37HHAYw0CTPpMJ5H-rlDKQtoknS6wi5-931b0Gu7WaT95xdIl/exec',                 // ex.: 'https://script.google.com/macros/s/AKfycb.../exec'
  TOKEN: '',                      // ex.: 'meu-token-secreto'  (igual ao TOKEN do Code.gs)
  ADMIN_LOGIN: 'admin',
  // SHA-256 de "bridal|admin|<senha>" – senha inicial do administrador
  ADMIN_HASH: 'e301199dd3f45c278bda232b7e3b13cc50dc0dbc515324078d1c6ec9fe6ba356'
};
