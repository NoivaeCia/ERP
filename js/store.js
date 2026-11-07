/* ===== Banco de dados local (IndexedDB) + sincronização com Google Sheets ===== */
const COLS = ['config', 'users', 'products', 'items', 'customers', 'rentals', 'sales', 'ledger', 'caixas', 'payables', 'receivables', 'appointments'];

const Store = (() => {
  const maps = {}; COLS.forEach(c => maps[c] = new Map());
  let meta = { lastPull: 0, dirty: {} }; COLS.forEach(c => meta.dirty[c] = {});
  const listeners = []; let saveT, emitT; const pendingCols = new Set();

  const idb = () => new Promise((res, rej) => { const r = indexedDB.open('bridal-store', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const idbGet = async k => { const db = await idb(); return new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); };
  const idbSet = async (k, v) => { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); };

  function snapshot() { const db = {}; COLS.forEach(c => db[c] = [...maps[c].values()]); return { db, meta }; }
  async function persist() {
    const s = snapshot();
    try { await idbSet('state', s); } catch (e) { try { localStorage.setItem('bs_state', JSON.stringify(s)); } catch (e2) { console.warn('Falha ao salvar localmente', e2); } }
  }
  const schedule = () => { clearTimeout(saveT); saveT = setTimeout(persist, 350); };
  function emit(col) { pendingCols.add(col); clearTimeout(emitT); emitT = setTimeout(() => { const c = [...pendingCols]; pendingCols.clear(); listeners.forEach(f => f(c)); }, 40); }

  return {
    async init() {
      let s = null; try { s = await idbGet('state'); } catch (e) { }
      if (!s) { try { s = JSON.parse(localStorage.getItem('bs_state') || 'null'); } catch (e) { } }
      if (s) { COLS.forEach(c => (s.db[c] || []).forEach(r => maps[c].set(r.id, r))); meta = { lastPull: 0, ...s.meta }; COLS.forEach(c => meta.dirty[c] = meta.dirty[c] || {}); }
    },
    on(f) { listeners.push(f); },
    all: col => [...maps[col].values()].filter(r => !r.deleted),
    raw: col => [...maps[col].values()],
    get: (col, id) => { const r = maps[col].get(id); return r && !r.deleted ? r : null; },
    save(col, rec) {
      const old = rec.id ? maps[col].get(rec.id) : null; const now = Date.now();
      const r = { ...(old || {}), ...rec }; if (!r.id) r.id = uid(); if (!r.createdAt) r.createdAt = now;
      r.updatedAt = Math.max(now, (old ? old.updatedAt || 0 : 0) + 1); r.deleted = false;
      maps[col].set(r.id, r); meta.dirty[col][r.id] = r.updatedAt; schedule(); emit(col); Sync.touch(); return r;
    },
    remove(col, id) {
      const old = maps[col].get(id); if (!old) return; const r = { ...old, deleted: true, updatedAt: Math.max(Date.now(), (old.updatedAt || 0) + 1) };
      maps[col].set(id, r); meta.dirty[col][id] = r.updatedAt; schedule(); emit(col); Sync.touch();
    },
    /* registro inicial sem marcar como "sujo" (updatedAt 0: qualquer versão remota prevalece) */
    seed(col, rec) { if (!maps[col].has(rec.id)) { maps[col].set(rec.id, { ...rec, createdAt: 0, updatedAt: 0 }); schedule(); } },
    merge(col, recs, force = false) {
      let n = 0;
      recs.forEach(r => { const l = maps[col].get(r.id); if (!l || r.updatedAt > (l.updatedAt || 0) || (force && r.updatedAt === l.updatedAt)) { maps[col].set(r.id, r); if (meta.dirty[col][r.id] && meta.dirty[col][r.id] <= r.updatedAt) delete meta.dirty[col][r.id]; n++; } });
      if (n) { schedule(); emit(col); } return n;
    },
    dirty: () => meta.dirty,
    dirtyCount: () => COLS.reduce((a, c) => a + Object.keys(meta.dirty[c]).length, 0),
    clearDirty(col, id, ts) { if (meta.dirty[col][id] === ts) delete meta.dirty[col][id]; schedule(); },
    markAllDirty() { COLS.forEach(c => maps[c].forEach(r => { if (r.updatedAt > 0) meta.dirty[c][r.id] = r.updatedAt; })); schedule(); },
    get lastPull() { return meta.lastPull; }, set lastPull(v) { meta.lastPull = v; schedule(); },
    exportAll() { const o = { app: 'bridal-store', versao: 1, geradoEm: new Date().toISOString() }; COLS.forEach(c => o[c] = [...maps[c].values()]); return o; },
    importAll(o) {
      if (!o || o.app !== 'bridal-store') throw new UserError('Arquivo de backup inválido.');
      const now = Date.now(); let i = 0;
      COLS.forEach(c => (o[c] || []).forEach(r => { const rr = { ...r, updatedAt: now + (i++) }; maps[c].set(rr.id, rr); meta.dirty[c][rr.id] = rr.updatedAt; }));
      schedule(); COLS.forEach(emit); Sync.touch();
    },
    async wipe() { COLS.forEach(c => { maps[c].clear(); meta.dirty[c] = {}; }); meta.lastPull = 0; await persist(); COLS.forEach(emit); },
    flush: persist
  };
})();

/* ---------- Sincronização com Apps Script ---------- */
const Sync = {
  state: 'off', msg: '', busy: false, timer: null, last: null,
  cfg() { let l = {}; try { l = JSON.parse(localStorage.getItem('bs_sync') || '{}'); } catch (e) { } return { url: l.url || APP_CONFIG.SCRIPT_URL || '', token: l.token || APP_CONFIG.TOKEN || '' }; },
  enabled() { const c = this.cfg(); return !!(c.url && c.token); },
  setState(s, m = '') { this.state = s; this.msg = m; document.dispatchEvent(new CustomEvent('syncstate')); },
  async call(action, payload = {}) {
    const c = this.cfg(); if (!c.url || !c.token) throw new UserError('Sincronização não configurada.');
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 60000);
    try {
      const r = await fetch(c.url, { method: 'POST', body: JSON.stringify({ action, token: c.token, ...payload }), redirect: 'follow', signal: ctrl.signal });
      const j = await r.json(); if (!j.ok) throw new UserError(j.error || 'Erro no servidor'); return j;
    } catch (e) { if (e.name === 'AbortError') throw new UserError('Tempo esgotado ao falar com a planilha'); if (e instanceof TypeError) throw new UserError('Sem conexão com a planilha'); throw e; }
    finally { clearTimeout(to); }
  },
  touch() { if (!this.enabled()) { this.setState('off'); return; } this.setState('pending'); clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(), 2500); },
  async push() {
    const dirty = Store.dirty(); let sent = 0;
    for (const col of COLS) {
      const ids = Object.keys(dirty[col]); if (!ids.length) continue;
      const map = new Map(Store.raw(col).map(r => [r.id, r])); const list = ids.map(id => map.get(id)).filter(Boolean);
      let batch = [], size = 0;
      const flush = async () => {
        if (!batch.length) return; const sent_ = batch; batch = []; size = 0;
        const j = await this.call('push', { col, records: sent_ });
        sent_.forEach(r => Store.clearDirty(col, r.id, r.updatedAt));
        if (j.updated && j.updated.length) Store.merge(col, j.updated, true);
        sent += sent_.length;
      };
      for (const r of list) { const l = JSON.stringify(r).length; if (size + l > 700000 && batch.length) await flush(); batch.push(r); size += l; if (batch.length >= 60) await flush(); }
      await flush();
    }
    return sent;
  },
  async pull(full = false) {
    const since = full ? 0 : Math.max(0, Store.lastPull - 300000);
    const j = await this.call('pull', { since });
    let n = 0; COLS.forEach(c => { if (j.data && j.data[c]) n += Store.merge(c, j.data[c]); });
    Store.lastPull = j.serverTime || Date.now(); return n;
  },
  async sync(full = false) {
    if (!this.enabled()) { this.setState('off'); return; }
    if (this.busy) { this.again = true; return; } this.busy = true; this.setState('busy');
    try { await this.push(); await this.pull(full); this.last = new Date(); this.setState(Store.dirtyCount() ? 'pending' : 'ok'); }
    catch (e) { this.setState('error', e.message); }
    finally { this.busy = false; if (this.again) { this.again = false; setTimeout(() => this.sync(), 500); } }
  },
  start() {
    if (!this.enabled()) { this.setState('off'); return; }
    this.sync(true);
    setInterval(() => { if (!document.hidden) this.sync(); }, 60000);
    window.addEventListener('online', () => this.sync()); document.addEventListener('visibilitychange', () => { if (!document.hidden) this.sync(); });
  }
};
