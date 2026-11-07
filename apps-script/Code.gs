/**
 * Bridal Store – Gestão Inteligente  |  Backend no Google Apps Script
 * Banco de dados = esta planilha (uma aba por módulo). Fotos e comprovantes vão para o Google Drive.
 *
 * COMO USAR (resumo – detalhes no README.md):
 *  1. Crie uma planilha Google → Extensões → Apps Script → cole este arquivo.
 *  2. Troque o TOKEN abaixo por uma senha longa (a mesma vai em js/config.js do app).
 *  3. Implantar → Nova implantação → Tipo "App da Web" → Executar como: EU → Quem tem acesso: QUALQUER PESSOA.
 *  4. Copie a URL terminada em /exec e cole em js/config.js (SCRIPT_URL).
 */
const TOKEN = 'TROQUE-ESTE-TOKEN-POR-UMA-SENHA-LONGA';
const FOLDER_NAME = 'BridalStore_Arquivos';
const COLLECTIONS = ['config', 'users', 'products', 'items', 'customers', 'rentals', 'sales', 'ledger', 'caixas', 'payables', 'receivables', 'appointments'];
const FIXED = ['id', 'updatedAt', 'deleted', '_json'];

function doGet() { return out_({ ok: true, app: 'Bridal Store – Gestão Inteligente', time: new Date().toISOString() }); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const req = JSON.parse(e.postData.contents);
    if (req.token !== TOKEN) return out_({ ok: false, error: 'Token inválido. Confira o TOKEN no Code.gs e em js/config.js.' });
    switch (req.action) {
      case 'ping': return out_({ ok: true, sheet: SpreadsheetApp.getActive().getName(), serverTime: Date.now() });
      case 'pull': return out_(pull_(Number(req.since) || 0));
      case 'push': return out_(push_(req.col, req.records || []));
      case 'backup': {
        const name = 'Backup Bridal Store ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH-mm');
        DriveApp.getFileById(SpreadsheetApp.getActive().getId()).makeCopy(name);
        return out_({ ok: true, name: name });
      }
      default: return out_({ ok: false, error: 'Ação desconhecida' });
    }
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) { }
  }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function sheet_(name) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, FIXED.length).setValues([FIXED]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, FIXED.length).setFontWeight('bold').setBackground('#e8d5a8');
  }
  return sh;
}

function pull_(since) {
  const data = {};
  COLLECTIONS.forEach(function (c) {
    const sh = SpreadsheetApp.getActive().getSheetByName(c);
    data[c] = [];
    if (!sh || sh.getLastRow() < 2) return;
    const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const jcol = header.indexOf('_json') + 1;
    const ucol = header.indexOf('updatedAt') + 1;
    const n = sh.getLastRow() - 1;
    const ups = sh.getRange(2, ucol, n, 1).getValues();
    const js = sh.getRange(2, jcol, n, 1).getValues();
    for (let i = 0; i < n; i++) {
      if (Number(ups[i][0]) > since && js[i][0]) {
        try { data[c].push(JSON.parse(js[i][0])); } catch (e) { }
      }
    }
  });
  return { ok: true, data: data, serverTime: Date.now() };
}

function isScalar_(v) { return v === null || ['string', 'number', 'boolean'].indexOf(typeof v) >= 0; }

function folder_() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

// Envia imagens/PDF (data:URL) para o Drive e troca por um link
function upload_(dataUrl, name) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return dataUrl;
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name);
  const file = folder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return m[1].indexOf('image/') === 0
    ? 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1000'
    : 'https://drive.google.com/file/d/' + file.getId() + '/view';
}

function externalize_(r) {
  let changed = false;
  if (Array.isArray(r.fotos)) {
    r.fotos = r.fotos.map(function (f, i) {
      if (typeof f === 'string' && f.indexOf('data:') === 0) { changed = true; return upload_(f, (r.sku || r.id) + '_' + (i + 1)); }
      return f;
    });
  }
  if (typeof r.comprovante === 'string' && r.comprovante.indexOf('data:') === 0) { changed = true; r.comprovante = upload_(r.comprovante, 'comprovante_' + r.id); }
  return changed;
}

function push_(col, recs) {
  if (COLLECTIONS.indexOf(col) < 0) throw new Error('Coleção inválida: ' + col);
  const sh = sheet_(col);
  const updated = [];
  recs.forEach(function (r) { if (externalize_(r)) updated.push(r); });

  let values = sh.getDataRange().getValues();
  const header = values[0];
  recs.forEach(function (r) {
    Object.keys(r).forEach(function (k) {
      if (isScalar_(r[k]) && header.indexOf(k) < 0 && FIXED.indexOf(k) < 0) header.push(k);
    });
  });
  values = values.map(function (row) { while (row.length < header.length) row.push(''); return row; });
  const idx = {};
  for (let i = 1; i < values.length; i++) idx[values[i][0]] = i;

  recs.forEach(function (r) {
    const json = JSON.stringify(r);
    if (json.length > 49000) throw new Error('Registro muito grande para uma célula (' + col + ' ' + r.id + ').');
    const row = header.map(function (h) {
      if (h === 'id') return r.id;
      if (h === 'updatedAt') return r.updatedAt;
      if (h === 'deleted') return r.deleted ? 1 : 0;
      if (h === '_json') return json;
      const v = r[h];
      return isScalar_(v) && v !== null ? (typeof v === 'string' && v.length > 300 ? v.slice(0, 300) : v) : '';
    });
    if (idx[r.id] !== undefined) {
      if (Number(values[idx[r.id]][1]) > r.updatedAt) return; // já existe versão mais nova
      values[idx[r.id]] = row;
    } else { values.push(row); idx[r.id] = values.length - 1; }
  });
  sh.getRange(1, 1, values.length, header.length).setValues(values);
  return { ok: true, saved: recs.length, updated: updated };
}

/** Rode uma vez manualmente (▶) para autorizar Planilhas e Drive e criar as abas. */
function setup() {
  COLLECTIONS.forEach(sheet_);
  folder_();
  Logger.log('Abas criadas e pasta do Drive pronta.');
}
