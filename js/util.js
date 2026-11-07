/* ===== Utilitários, ícones, UI (modal, formulários, gráficos, impressão) ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
const r2 = v => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const money = v => num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => ymd(new Date());
const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const parseD = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => Math.round((parseD(a) - parseD(b)) / 864e5);
const fmtDate = s => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '—';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const sum = (arr, f = x => x) => r2(arr.reduce((a, x) => a + num(f(x)), 0));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
class UserError extends Error { constructor(m) { super(m); this.user = true; } }

/* ---------- SHA-256 (funciona em qualquer contexto, inclusive http/file) ---------- */
function sha256raw(ascii) {
  const rr = (v, a) => (v >>> a) | (v << (32 - a)); const mw = Math.pow(2, 32);
  let result = ''; const words = []; const bl = ascii.length * 8; let hash = [], k = []; let pc = 0; const comp = {};
  for (let c = 2; pc < 64; c++) {
    if (!comp[c]) { for (let i = 0; i < 313; i += c) comp[i] = c; hash[pc] = (Math.pow(c, .5) * mw) | 0; k[pc++] = (Math.pow(c, 1 / 3) * mw) | 0; }
  }
  ascii += '\x80'; while (ascii.length % 64 - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) { const j = ascii.charCodeAt(i); words[i >> 2] |= j << ((3 - i) % 4) * 8; }
  words[words.length] = ((bl / mw) | 0); words[words.length] = bl;
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16); const old = hash; hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2]; const a = hash[0], e = hash[4];
      const t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
        (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
  }
  for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) { const b = (hash[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : '') + b.toString(16); }
  return result;
}
const sha256 = s => sha256raw(unescape(encodeURIComponent(s)));
const hashSenha = (login, senha) => sha256(`bridal|${String(login).trim().toLowerCase()}|${senha}`);

/* ---------- Ícones ---------- */
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  rent: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/>',
  wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M16 15h2"/>',
  receber: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M8 13l4 4 4-4"/>',
  pagar: '<circle cx="12" cy="12" r="9"/><path d="M12 17V7M8 11l4-4 4 4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2.2.7 3.5 2.6 3.5 5.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 16V5M7 9l5-5 5 5M4 20h16"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><rect x="7" y="14" width="10" height="7"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 10a4 4 0 0 1 0 8z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  ring: '<circle cx="9" cy="14" r="5.5"/><circle cx="15.5" cy="14" r="5.5"/><path d="M8 5l1-2h2l1 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>',
  dollar: '<path d="M12 3v18M16.5 7.5C15.5 6.4 14 6 12 6c-2.5 0-4 1.2-4 3s1.5 2.5 4 3 4 1.2 4 3-1.5 3-4 3c-2 0-3.8-.6-4.8-1.8"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>', chevR: '<path d="M9 5l7 7-7 7"/>',
  heart: '<path d="M12 20s-7.5-4.6-9-9.5C2 7 4.5 4.5 7.5 4.5c2 0 3.5 1 4.500 2.500 1-1.500 2.500-2.500 4.500-2.500 3 0 5.500 2.500 4.500 6C19.500 15.400 12 20 12 20z"/>',
  hanger: '<path d="M12 8a2.5 2.5 0 1 1 2.500-2.500M12 8v2l9 6a1.500 1.500 0 0 1-.8 2.700H3.800A1.500 1.500 0 0 1 3 16l9-6"/>',
  db: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.700 3.600 3 8 3s8-1.300 8-3V6M4 12v6c0 1.700 3.600 3 8 3s8-1.300 8-3v-6"/>'
};
const ic = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- Toast ---------- */
function toast(msg, type = 'ok', ms = 3600) {
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast ' + type;
  t.innerHTML = `<span>${type === 'ok' ? ic('check', 16) : ic('alert', 16)}</span><div>${esc(msg)}</div>`;
  box.appendChild(t); requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, ms);
}
function handleErr(e) { if (e && e.user) toast(e.message, 'warn', 5000); else { console.error(e); toast('Erro: ' + (e && e.message || e), 'err', 6000); } }

/* ---------- Modal ---------- */
const Modal = {
  stack: [],
  open({ title, html, size = 'md', buttons = [], onOpen }) {
    const back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true"><div class="modal-h"><h3>${title}</h3><button class="icon-btn" data-close aria-label="Fechar">${ic('x')}</button></div><div class="modal-b">${html || ''}</div>${buttons.length ? '<div class="modal-f"></div>' : ''}</div>`;
    document.body.appendChild(back);
    const api = { el: back, body: $('.modal-b', back), close() { back.remove(); Modal.stack = Modal.stack.filter(m => m !== api); } };
    buttons.forEach(b => {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn ' + (b.cls || ''); btn.innerHTML = b.label;
      btn.onclick = async () => {
        if (b.onClick) { btn.disabled = true; try { const r = await b.onClick(api); if (r === false) { btn.disabled = false; return; } } catch (e) { btn.disabled = false; handleErr(e); return; } }
        if (b.close !== false) api.close();
      };
      $('.modal-f', back).appendChild(btn);
    });
    $$('[data-close]', back).forEach(b => b.onclick = api.close);
    Modal.stack.push(api); if (onOpen) onOpen(api); return api;
  },
  closeAll() { [...Modal.stack].forEach(m => m.close()); }
};
function confirmBox(msg, { ok = 'Confirmar', danger = false, title = 'Confirmação' } = {}) {
  return new Promise(res => {
    let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    const m = Modal.open({ title, size: 'sm', html: `<p class="confirm-msg">${msg}</p>`, buttons: [{ label: 'Cancelar', cls: 'ghost', onClick: () => fin(false) }, { label: ok, cls: danger ? 'danger' : 'gold', onClick: () => fin(true) }] });
    $('[data-close]', m.el).addEventListener('click', () => fin(false));
  });
}

/* ---------- Formulários ---------- */
const optList = o => (o || []).map(x => Array.isArray(x) ? { v: x[0], l: x[1] } : (typeof x === 'object' ? x : { v: x, l: x }));
const Form = {
  field(f, v) {
    if (f.html) return f.html;
    const span = f.span || 3; const val = v ?? f.def ?? '';
    let inp;
    const common = `name="${f.k}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} ${f.ro ? 'readonly' : ''} ${f.max ? `maxlength="${f.max}"` : ''}`;
    if (f.type === 'select') inp = `<select class="input" ${common}>${f.blank !== false ? `<option value="">${esc(f.blank || 'Selecione…')}</option>` : ''}${optList(f.options).map(o => `<option value="${esc(o.v)}" ${String(o.v) === String(val) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
    else if (f.type === 'textarea') inp = `<textarea class="input" rows="${f.rows || 3}" ${common}>${esc(val)}</textarea>`;
    else if (f.type === 'checkbox') inp = `<label class="chk"><input type="checkbox" name="${f.k}" ${val ? 'checked' : ''}><span>${esc(f.label)}</span></label>`;
    else if (f.type === 'money' || f.type === 'number') inp = `<input class="input" type="number" inputmode="decimal" step="${f.step || (f.type === 'money' ? '0.01' : '1')}" ${f.min != null ? `min="${f.min}"` : (f.type === 'money' ? 'min="0"' : '')} ${f.maxv != null ? `max="${f.maxv}"` : ''} ${common} value="${esc(val)}">`;
    else inp = `<input class="input" type="${f.type || 'text'}" ${common} value="${esc(val)}" ${f.list ? `list="${f.list}"` : ''}>`;
    if (f.type === 'checkbox') return `<div class="fld" style="--span:${span}">${inp}</div>`;
    return `<div class="fld" style="--span:${span}"><label>${esc(f.label)}${f.req ? ' <b>*</b>' : ''}</label>${inp}${f.hint ? `<small class="hint">${f.hint}</small>` : ''}</div>`;
  },
  html(fields, data = {}) { return `<form class="fgrid" onsubmit="return false">${fields.map(f => Form.field(f, data[f.k])).join('')}</form>`; },
  read(root, fields) {
    const out = {}; let bad = null;
    $$('.ferr', root).forEach(e => e.remove()); $$('.invalid', root).forEach(e => e.classList.remove('invalid'));
    for (const f of fields) {
      if (f.html || !f.k) continue; const el = root.querySelector(`[name="${f.k}"]`); if (!el) continue;
      let v = el.type === 'checkbox' ? el.checked : el.value.trim(); let msg = '';
      if (f.type === 'number' || f.type === 'money') v = v === '' ? (f.req ? '' : 0) : Number(v);
      if (f.req && (v === '' || v === null)) msg = 'Obrigatório';
      else if (f.type === 'email' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) msg = 'E-mail inválido';
      else if ((f.type === 'number' || f.type === 'money') && v !== '' && (isNaN(v) || (f.min != null && v < f.min) || (f.maxv != null && v > f.maxv) || (f.type === 'money' && v < 0))) msg = 'Valor inválido';
      else if (f.validate && v !== '' && v !== false) msg = f.validate(v) || '';
      if (msg) { el.classList.add('invalid'); const s = document.createElement('div'); s.className = 'ferr'; s.textContent = msg; (el.closest('.fld') || el.parentNode).appendChild(s); bad = bad || el; }
      out[f.k] = v;
    }
    if (bad) { bad.focus(); toast('Verifique os campos destacados', 'warn'); return null; }
    return out;
  }
};
function cpfValido(c) {
  c = String(c).replace(/\D/g, ''); if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (let t = 9; t < 11; t++) { let s = 0; for (let i = 0; i < t; i++) s += c[i] * (t + 1 - i); const d = ((s * 10) % 11) % 10; if (d != c[t]) return false; }
  return true;
}
const maskCPF = v => String(v || '').replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
const maskTel = v => { v = String(v || '').replace(/\D/g, '').slice(0, 11); return v.length > 10 ? v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : v.length > 6 ? v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3') : v.replace(/(\d{2})(\d*)/, '($1) $2'); };
document.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.mask) { const p = t.selectionStart; t.value = t.dataset.mask === 'cpf' ? maskCPF(t.value) : maskTel(t.value); } });

/* ---------- Tabelas, badges ---------- */
const badge = (t, k = 'muted') => `<span class="badge ${k}">${esc(t)}</span>`;
function table(cols, rows, empty = 'Nenhum registro encontrado.', rowCls) {
  if (!rows.length) return `<div class="empty">${ic('search', 28)}<p>${empty}</p></div>`;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map(c => `<th class="${c.cls || ''}">${c.h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr ${rowCls && rowCls(r) ? `class="${rowCls(r)}"` : ''}>${cols.map(c => `<td class="${c.cls || ''}" data-l="${esc(String(c.h).replace(/<[^>]+>/g, ''))}">${c.c(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const iconBtn = (act, id, icon, title, cls = '') => `<button class="icon-btn ${cls}" data-act="${act}" data-id="${esc(id)}" title="${title}" aria-label="${title}">${ic(icon, 16)}</button>`;

/* ---------- Imagens ---------- */
function compressImage(file, max = 900, q = .72) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => { const img = new Image(); img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', q)); }; img.onerror = () => rej(new UserError('Imagem inválida')); img.src = fr.result; };
    fr.onerror = () => rej(new UserError('Falha ao ler arquivo')); fr.readAsDataURL(file);
  });
}
function readFileData(file) {
  if (file.type.startsWith('image/')) return compressImage(file, 1100, .7);
  return new Promise((res, rej) => { if (file.size > 1.5e6) return rej(new UserError('Arquivo acima de 1,5 MB')); const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
}

/* ---------- Download / impressão ---------- */
function download(name, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime + ';charset=utf-8' }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function printHTML(html, title) {
  let root = $('#print-root'); if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
  root.innerHTML = html; const old = document.title; if (title) document.title = title;
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); document.title = old; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done); setTimeout(() => window.print(), 120);
}
function exportXLS(name, cols, rows, title = '') {
  const t = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">${title ? `<tr><th colspan="${cols.length}">${esc(title)}</th></tr>` : ''}<tr>${cols.map(c => `<th style="background:#e8d5a8">${esc(c)}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${esc(String(c).replace(/<[^>]+>/g, ''))}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
  download(name + '.xls', t, 'application/vnd.ms-excel');
}

/* ---------- Gráficos SVG ---------- */
const shortMoney = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(v >= 1e4 ? 0 : 1).replace('.0', '') + 'k' : String(Math.round(v));
function niceMax(m) { if (m <= 0) return 1; const mag = Math.pow(10, Math.floor(Math.log10(m))); const n = m / mag; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag; }
function chartFrame(labels, max, inner, W = 640, H = 230) {
  const pl = 46, pr = 10, pt = 12, pb = 26; const iw = W - pl - pr, ih = H - pt - pb; let g = '';
  for (let i = 0; i <= 4; i++) { const y = pt + ih - ih * i / 4; g += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" class="gl"/><text x="${pl - 6}" y="${y + 4}" text-anchor="end" class="gt">${shortMoney(max * i / 4)}</text>`; }
  const step = iw / labels.length; labels.forEach((l, i) => g += `<text x="${pl + step * i + step / 2}" y="${H - 8}" text-anchor="middle" class="gt">${esc(l)}</text>`);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">${g}${inner(pl, pt, iw, ih, step)}</svg>`;
}
function chartBars(labels, series) {
  const max = niceMax(Math.max(0, ...series.flatMap(s => s.data)));
  return chartFrame(labels, max, (pl, pt, iw, ih, step) => {
    const bw = Math.min(26, (step * .7) / series.length); let o = '';
    series.forEach((s, si) => s.data.forEach((v, i) => { const h = ih * v / max; const x = pl + step * i + step / 2 - (bw * series.length) / 2 + si * bw; o += `<rect x="${x + 1}" y="${pt + ih - h}" width="${bw - 2}" height="${Math.max(h, 0)}" rx="3" fill="${s.color}"><title>${esc(s.name)}: ${money(v)}</title></rect>`; }));
    return o;
  }, 640, 230) + legend(series);
}
function chartLines(labels, series) {
  const max = niceMax(Math.max(0, ...series.flatMap(s => s.data)));
  return chartFrame(labels, max, (pl, pt, iw, ih, step) => {
    let o = '';
    series.forEach(s => { const pts = s.data.map((v, i) => [pl + step * i + step / 2, pt + ih - ih * v / max]); o += `<path d="M${pts[0][0]},${pt + ih} ${pts.map(p => 'L' + p.join(',')).join(' ')} L${pts[pts.length - 1][0]},${pt + ih}Z" fill="${s.color}" opacity=".12"/><polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linejoin="round"/>${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.6" fill="${s.color}"><title>${esc(s.name)}: ${money(s.data[i])}</title></circle>`).join('')}`; });
    return o;
  }, 640, 230) + legend(series);
}
const legend = s => `<div class="legend">${s.map(x => `<span><i style="background:${x.color}"></i>${esc(x.name)}</span>`).join('')}</div>`;
