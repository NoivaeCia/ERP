/* ===== Infra de páginas + Dashboard + Estoque + Clientes ===== */
const ACT = {}, CHG = {}, PS = {}, Pages = {};
const waLink = (tel, msg = '') => { let d = String(tel || '').replace(/\D/g, ''); if (!d) return ''; if (d.length <= 11) d = '55' + d; return `https://wa.me/${d}${msg ? '?text=' + encodeURIComponent(msg) : ''}`; };
const selOpts = (arr, blank) => (blank ? [['', blank]] : []).concat(arr.map(x => Array.isArray(x) ? x : [x, x]));
const custOptions = () => Store.all('customers').sort((a, b) => a.nome.localeCompare(b.nome)).map(c => [c.id, c.nome]);
const userOptions = () => Store.all('users').filter(u => u.ativo !== false).map(u => [u.id, u.nome]);

function listPage(def) {
  const st = () => PS[def.key] = PS[def.key] || { q: '', ...(def.state || {}) };
  const page = {
    title: def.title,
    render(el) {
      const s = st();
      el.innerHTML = `<div class="page-h"><div><h1>${def.title}</h1><p>${def.sub || ''}</p></div><div class="page-actions">${def.extra ? def.extra() : ''}${def.newLabel ? `<button class="btn gold" data-act="${def.key}:new">${ic('plus')}<span>${def.newLabel}</span></button>` : ''}</div></div><div id="lsum"></div>
      <div class="card toolbar"><div class="search">${ic('search', 16)}<input class="input" data-flt="q" placeholder="Buscar…" value="${esc(s.q)}"></div>${(def.filters || []).map(f => `<select class="input" data-flt="${f.k}" title="${f.t || ''}">${optList(f.options).map(o => `<option value="${esc(o.v)}" ${String(s[f.k] ?? '') === String(o.v) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`).join('')}</div><div id="lst"></div>`;
      page.list();
    },
    list() {
      const s = st(); if (!$('#lst')) return;
      const rows = def.rows().filter(r => def.pass ? def.pass(r, s) : true).filter(r => !s.q || def.text(r).toLowerCase().includes(s.q.toLowerCase()));
      if (def.sort) rows.sort(def.sort);
      $('#lsum').innerHTML = def.summary ? def.summary(rows) : '';
      const cols = def.cols.concat(def.actions ? [{ h: '', cls: 'act', c: r => `<div class="row-actions">${def.actions(r)}</div>` }] : []);
      $('#lst').innerHTML = `<div class="card nopad">${table(cols, rows.slice(0, 400), def.empty, def.rowCls)}</div>` + (rows.length > 400 ? `<p class="muted c">Mostrando 400 de ${rows.length}. Refine a busca.</p>` : '');
    },
    refresh() { page.list(); },
    onFilter(k, v) { st()[k] = v; page.list(); }
  };
  return page;
}
const attachPhotos = (api, arr, max = 4) => {
  const box = $('#ph', api.el); const draw = () => { box.innerHTML = arr.map((f, i) => `<div class="ph"><img src="${esc(f)}" alt=""><button type="button" data-rm="${i}">${ic('x', 12)}</button></div>`).join('') || '<span class="muted">Nenhuma foto</span>'; $$('[data-rm]', box).forEach(b => b.onclick = () => { arr.splice(+b.dataset.rm, 1); draw(); }); };
  draw(); $('#phf', api.el).onchange = async e => { for (const f of e.target.files) { if (arr.length >= max) { toast(`Máximo de ${max} fotos`, 'warn'); break; } try { arr.push(await compressImage(f)); } catch (er) { handleErr(er); } } e.target.value = ''; draw(); };
};

/* ================= DASHBOARD ================= */
Pages.dashboard = {
  title: 'Painel',
  render(el) {
    const k = kpis(), ms = monthSeries(6), N = notifications().slice(0, 7);
    const card = (i, l, v, sub, tone = '') => `<div class="kpi ${tone}"><div class="kpi-ic">${ic(i, 20)}</div><div class="kpi-t"><span>${l}</span><b>${v}</b><small>${sub || '&nbsp;'}</small></div></div>`;
    el.innerHTML = `<div class="page-h"><div><h1>Painel principal</h1><p>${DIAS[new Date().getDay()]}, ${fmtDate(todayStr())} · indicadores em tempo real</p></div></div>
    <div class="kpis">
      ${card('dollar', 'Faturamento do dia', money(k.fatDia), 'recebido hoje', 'gold')}
      ${card('chart', 'Faturamento do mês', money(k.fatMes), 'recebido no mês', 'gold')}
      ${card('cart', 'Total de vendas', k.vendasQtd, money(k.vendasVal) + ' no mês')}
      ${card('rent', 'Aluguéis ativos', k.alugAtivos, k.alugReservados + ' reservado(s)')}
      ${card('clock', 'Devoluções próximas', k.alugProx, 'em até 3 dias / atrasadas', k.alugProx ? 'warn' : '')}
      ${card('hanger', 'Vestidos e ternos disponíveis', k.dispDT, 'peças prontas para uso')}
      ${card('tag', 'Produtos alugados', k.alugados, 'peças fora da loja')}
      ${card('pagar', 'Contas a pagar', money(k.pagarVal), `${k.pagarQtd} conta(s) · ${k.pagarProx} vencem em 7 dias`)}
      ${card('alert', 'Contas vencidas', money(k.vencVal), `${k.vencQtd} conta(s) em atraso`, k.vencQtd ? 'danger' : '')}
      ${card('receber', 'Contas a receber', money(k.receberVal), `${k.receberQtd} conta(s) · ${k.receberVenc} atrasada(s)`, k.receberVenc ? 'warn' : '')}
      ${card('wallet', 'Lucro estimado (mês)', money(k.lucro), 'receitas − despesas − custo das vendas', k.lucro < 0 ? 'danger' : 'ok')}
      ${card('users', 'Clientes cadastrados', k.clientes, 'na base')}
    </div>
    <div class="grid2">
      <div class="card"><h3 class="card-t">Faturamento mensal</h3>${chartBars(ms.map(m => m.label), [{ name: 'Faturamento', color: 'var(--c1)', data: ms.map(m => m.fat) }])}</div>
      <div class="card"><h3 class="card-t">Vendas × Aluguéis</h3>${chartBars(ms.map(m => m.label), [{ name: 'Vendas', color: 'var(--c1)', data: ms.map(m => m.vendas) }, { name: 'Aluguéis', color: 'var(--c2)', data: ms.map(m => m.alug) }])}</div>
    </div>
    <div class="grid2">
      <div class="card"><h3 class="card-t">Despesas × Receitas</h3>${chartLines(ms.map(m => m.label), [{ name: 'Receitas', color: 'var(--ok)', data: ms.map(m => m.fat) }, { name: 'Despesas', color: 'var(--danger)', data: ms.map(m => m.desp) }])}</div>
      <div class="card"><div class="card-th"><h3 class="card-t">Avisos importantes</h3><a class="link" href="#/notificacoes">Ver todos</a></div>
        ${N.length ? `<ul class="alerts">${N.map(n => `<li class="al ${n.level}"><span>${ic(n.icon, 18)}</span><div><b>${esc(n.title)}</b><small>${esc(n.text)}</small></div></li>`).join('')}</ul>` : `<div class="empty small">${ic('check', 26)}<p>Tudo em dia. Nenhum aviso pendente.</p></div>`}</div>
    </div>`;
  },
  refresh() { Pages.dashboard.render($('#view')); }
};

/* ================= ESTOQUE ================= */
const statusBadges = pid => { const c = {}; unitsOf(pid).forEach(u => { const s = itemEffStatus(u); c[s] = (c[s] || 0) + 1; }); return Object.entries(c).map(([s, n]) => `<span class="badge ${ITEM_STATUS[s][1]}" title="${ITEM_STATUS[s][0]}">${n} ${ITEM_STATUS[s][0].toLowerCase()}</span>`).join(' ') || '<span class="muted">sem unidades</span>'; };
const thumb = (p, cls = '') => `<div class="thumb ${cls}">${p && p.fotos && p.fotos[0] ? `<img loading="lazy" src="${esc(p.fotos[0])}" alt="">` : ic('hanger', 22)}</div>`;
Pages.estoque = {
  title: 'Estoque',
  render(el) {
    const s = PS.estoque = PS.estoque || { tab: 'modelos', q: '', cat: '', status: '' };
    el.innerHTML = `<div class="page-h"><div><h1>Produtos e estoque</h1><p>Modelos, unidades por tamanho e controle individual das peças</p></div><div class="page-actions"><button class="btn gold" data-act="est:new">${ic('plus')}<span>Novo produto</span></button></div></div>
    <div class="tabs"><button class="${s.tab === 'modelos' ? 'on' : ''}" data-act="est:tab" data-tab="modelos">Modelos</button><button class="${s.tab === 'pecas' ? 'on' : ''}" data-act="est:tab" data-tab="pecas">Peças individuais</button></div>
    <div class="card toolbar"><div class="search">${ic('search', 16)}<input class="input" data-flt="q" placeholder="Buscar por nome, SKU, marca, cor, tamanho…" value="${esc(s.q)}"></div>
    <select class="input" data-flt="cat">${optList(selOpts(CATEGORIAS, 'Todas as categorias')).map(o => `<option value="${esc(o.v)}" ${s.cat === o.v ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>
    ${s.tab === 'pecas' ? `<select class="input" data-flt="status">${optList(selOpts(Object.entries(ITEM_STATUS).map(([k, v]) => [k, v[0]]), 'Todos os status')).map(o => `<option value="${esc(o.v)}" ${s.status === o.v ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>` : ''}</div><div id="lst"></div>`;
    this.list();
  },
  list() {
    const s = PS.estoque; const q = (s.q || '').toLowerCase(); if (!$('#lst')) return;
    if (s.tab === 'modelos') {
      const rows = Store.all('products').filter(p => (!s.cat || p.categoria === s.cat) && (!q || [p.nome, p.sku, p.marca, p.descricao].join(' ').toLowerCase().includes(q) || unitsOf(p.id).some(u => [u.cor, u.tamanho, u.codigo].join(' ').toLowerCase().includes(q)))).sort((a, b) => a.nome.localeCompare(b.nome));
      $('#lst').innerHTML = `<div class="card nopad">${table([
        { h: '', c: p => thumb(p) }, { h: 'SKU', c: p => `<code>${esc(p.sku)}</code>` },
        { h: 'Produto', c: p => `<b>${esc(p.nome)}</b><small class="sub">${esc(p.categoria)}${p.marca ? ' · ' + esc(p.marca) : ''}${p.ativo === false ? ' · <i>inativo</i>' : ''}</small>` },
        { h: 'Compra', cls: 'num', c: p => money(p.compra) }, { h: 'Venda', cls: 'num', c: p => money(p.venda) }, { h: 'Aluguel', cls: 'num', c: p => money(p.aluguel) },
        { h: 'Unidades', c: p => `<div class="chips">${statusBadges(p.id)}</div>` },
        { h: '', cls: 'act', c: p => `<div class="row-actions"><button class="btn sm" data-act="est:units" data-id="${p.id}">${ic('box', 14)} Unidades (${unitsOf(p.id).length})</button>${iconBtn('est:edit', p.id, 'edit', 'Editar')}${iconBtn('est:del', p.id, 'trash', 'Excluir', 'danger')}</div>` }
      ], rows, 'Nenhum produto cadastrado. Clique em “Novo produto”.')}</div>`;
    } else {
      const rows = Store.all('items').map(i => ({ ...i, p: prodOf(i) || {}, eff: itemEffStatus(i) })).filter(i => (!s.cat || i.p.categoria === s.cat) && (!s.status || i.eff === s.status) && (!q || [i.p.nome, i.p.sku, i.codigo, i.cor, i.tamanho, i.localizacao].join(' ').toLowerCase().includes(q))).sort((a, b) => (a.p.nome || '').localeCompare(b.p.nome || '') || String(a.tamanho).localeCompare(String(b.tamanho), 'pt', { numeric: true }));
      $('#lst').innerHTML = `<div class="card nopad">${table([
        { h: '', c: i => thumb(i.p, 'sm') }, { h: 'Código', c: i => `<code>${esc(i.codigo)}</code>` }, { h: 'Produto', c: i => `<b>${esc(i.p.nome || '?')}</b><small class="sub">${esc(i.p.categoria || '')}</small>` },
        { h: 'Tam.', c: i => esc(i.tamanho) }, { h: 'Cor', c: i => esc(i.cor) }, { h: 'Local', c: i => esc(i.localizacao) },
        { h: 'Status', c: i => `<select class="input sm st-${i.eff}" data-chg="est:itemstatus" data-id="${i.id}">${Object.entries(ITEM_STATUS).map(([k, v]) => `<option value="${k}" ${i.status === k || (i.status === 'disponivel' && i.eff === k) ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>` },
        { h: '', cls: 'act', c: i => `<div class="row-actions">${iconBtn('est:unitedit', i.id, 'edit', 'Editar peça')}${iconBtn('est:unitdel', i.id, 'trash', 'Excluir peça', 'danger')}</div>` }
      ], rows.slice(0, 500), 'Nenhuma peça encontrada.')}</div>`;
    }
  },
  refresh() { this.list(); },
  onFilter(k, v) { PS.estoque[k] = v; this.list(); }
};
ACT['est:tab'] = d => { PS.estoque.tab = d.tab; Pages.estoque.render($('#view')); };
ACT['est:new'] = () => productModal();
ACT['est:edit'] = d => productModal(d.id);
ACT['est:units'] = d => unitsModal(d.id);
ACT['est:del'] = async d => {
  const p = Store.get('products', d.id); const us = unitsOf(d.id);
  if (us.some(u => itemInUse(u.id))) throw new UserError('Este produto tem peças com histórico de aluguel/venda. Desative-o (editar → desmarcar “Ativo”) em vez de excluir.');
  if (!(await confirmBox(`Excluir <b>${esc(p.nome)}</b> e suas ${us.length} unidade(s)?`, { ok: 'Excluir', danger: true }))) return;
  us.forEach(u => Store.remove('items', u.id)); Store.remove('products', d.id); toast('Produto excluído');
};
CHG['est:itemstatus'] = (d, el) => { const it = Store.get('items', d.id); Store.save('items', { ...it, status: el.value }); toast('Status atualizado'); };
ACT['est:unitedit'] = d => unitEditModal(d.id);
ACT['est:unitdel'] = async d => { const it = Store.get('items', d.id); if (itemInUse(d.id)) throw new UserError('A peça possui histórico. Marque-a como indisponível em vez de excluir.'); if (!(await confirmBox(`Excluir a peça <b>${esc(it.codigo)}</b>?`, { ok: 'Excluir', danger: true }))) return; Store.remove('items', d.id); toast('Peça excluída'); refreshUnits(); };

function productModal(id) {
  const p = id ? Store.get('products', id) : null; const fotos = [...(p && p.fotos || [])];
  const F = [
    { k: 'nome', label: 'Nome do produto', req: true, span: 4, max: 80 }, { k: 'sku', label: 'Código / SKU', span: 2, ph: 'Gerado automaticamente', max: 24 },
    { k: 'categoria', label: 'Categoria', type: 'select', options: CATEGORIAS, blank: false, req: true, span: 2 }, { k: 'marca', label: 'Marca', span: 2 }, { k: 'conservacao', label: 'Estado de conservação', type: 'select', options: CONSERVACAO, blank: false, span: 2 },
    { k: 'descricao', label: 'Descrição', type: 'textarea', span: 6, rows: 2 },
    { k: 'compra', label: 'Valor de compra (R$)', type: 'money', span: 2 }, { k: 'venda', label: 'Preço de venda (R$)', type: 'money', span: 2 }, { k: 'aluguel', label: 'Preço de aluguel (R$)', type: 'money', span: 2 },
    { k: 'localizacao', label: 'Localização no estoque', span: 2, ph: 'Ex.: Arara A1' }, { k: 'minimo', label: 'Alertar se disponíveis <', type: 'number', min: 0, span: 2, hint: '0 = sem alerta' }, { k: 'ativo', label: 'Produto ativo', type: 'checkbox', span: 2 },
    { html: `<div class="fld" style="--span:6"><label>Fotos (até 4)</label><div class="photos" id="ph"></div><label class="btn sm ghost upl">${ic('image', 14)} Adicionar fotos<input id="phf" type="file" accept="image/*" multiple hidden></label></div>` }
  ];
  if (!p) F.push({ html: '<div class="fld sep" style="--span:6"><h4>Primeira unidade (você pode adicionar mais depois)</h4></div>' }, { k: 'tamanho', label: 'Tamanho', span: 2, ph: 'Ex.: 40' }, { k: 'cor', label: 'Cor', span: 2 }, { k: 'qtd', label: 'Quantidade', type: 'number', min: 0, maxv: 100, span: 2, def: 1 });
  Modal.open({
    title: p ? 'Editar produto' : 'Novo produto', size: 'lg', html: Form.html(F, p ? { ...p } : { categoria: 'Vestido de Noiva', conservacao: 'Novo', ativo: true, minimo: 1, qtd: 1 }),
    onOpen: api => attachPhotos(api, fotos),
    buttons: [{ label: 'Cancelar', cls: 'ghost' }, {
      label: `${ic('check', 16)} Salvar`, cls: 'gold', onClick: api => {
        const v = Form.read(api.body, F); if (!v) return false;
        const sku = (v.sku || '').toUpperCase() || genSku(v.categoria);
        if (Store.all('products').some(x => x.sku === sku && x.id !== (p && p.id))) throw new UserError('Já existe um produto com este SKU.');
        const rec = Store.save('products', { ...(p || {}), nome: v.nome, sku, categoria: v.categoria, marca: v.marca, conservacao: v.conservacao, descricao: v.descricao, compra: v.compra, venda: v.venda, aluguel: v.aluguel, localizacao: v.localizacao, minimo: v.minimo, ativo: v.ativo, fotos });
        if (!p && v.qtd > 0) addUnits(rec, { tamanho: v.tamanho, cor: v.cor, qtd: v.qtd, localizacao: v.localizacao });
        toast('Produto salvo'); if (!p && v.qtd > 0) setTimeout(() => unitsModal(rec.id), 200);
      }
    }]
  });
}
function unitsModal(pid) {
  const p = Store.get('products', pid); const F = [{ k: 'tamanho', label: 'Tamanho', span: 2, req: true }, { k: 'cor', label: 'Cor', span: 2, req: true }, { k: 'qtd', label: 'Quantidade', type: 'number', min: 1, maxv: 100, span: 1, def: 1 }, { k: 'localizacao', label: 'Local', span: 1 }];
  const draw = api => {
    const us = unitsOf(pid).sort((a, b) => String(a.tamanho).localeCompare(String(b.tamanho), 'pt', { numeric: true }));
    api.body.innerHTML = `<p class="muted">${esc(p.categoria)} · SKU <code>${esc(p.sku)}</code></p>${table([
      { h: 'Código', c: i => `<code>${esc(i.codigo)}</code>` }, { h: 'Tam.', c: i => esc(i.tamanho) }, { h: 'Cor', c: i => esc(i.cor) }, { h: 'Local', c: i => esc(i.localizacao) },
      { h: 'Status', c: i => { const e = itemEffStatus(i); return `<select class="input sm st-${e}" data-chg="est:itemstatus" data-id="${i.id}">${Object.entries(ITEM_STATUS).map(([k, v]) => `<option value="${k}" ${i.status === k || (i.status === 'disponivel' && e === k) ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>`; } },
      { h: '', cls: 'act', c: i => `<div class="row-actions">${iconBtn('est:unitedit', i.id, 'edit', 'Editar')}${iconBtn('est:unitdel', i.id, 'trash', 'Excluir', 'danger')}</div>` }], us, 'Nenhuma unidade. Adicione abaixo.')}
      <div class="sep"><h4>Adicionar unidades</h4></div>${Form.html(F, { qtd: 1, localizacao: p.localizacao })}<div class="mt"><button class="btn gold" id="addU">${ic('plus', 16)} Adicionar</button></div>`;
    $('#addU', api.body).onclick = () => { const v = Form.read(api.body, F); if (!v) return; addUnits(p, v); toast(`${v.qtd} unidade(s) adicionada(s)`); draw(api); };
  };
  const api = Modal.open({ title: `Unidades — ${esc(p.nome)}`, size: 'lg', html: '', buttons: [{ label: 'Fechar', cls: 'ghost' }] }); api.el.dataset.units = pid; draw(api); api.redraw = () => draw(api);
}
function refreshUnits() { Modal.stack.filter(m => m.redraw).forEach(m => m.redraw()); }
Store.on(() => refreshUnits());
function unitEditModal(id) {
  const it = Store.get('items', id);
  const F = [{ k: 'tamanho', label: 'Tamanho', req: true, span: 2 }, { k: 'cor', label: 'Cor', req: true, span: 2 }, { k: 'status', label: 'Status', type: 'select', options: Object.entries(ITEM_STATUS).map(([k, v]) => [k, v[0]]), blank: false, span: 2 }, { k: 'localizacao', label: 'Localização', span: 3 }, { k: 'obs', label: 'Observações', span: 3 }];
  Modal.open({ title: `Peça ${esc(it.codigo)}`, html: Form.html(F, it), buttons: [{ label: 'Cancelar', cls: 'ghost' }, { label: 'Salvar', cls: 'gold', onClick: api => { const v = Form.read(api.body, F); if (!v) return false; Store.save('items', { ...it, ...v }); toast('Peça atualizada'); } }] });
}

/* ================= CLIENTES ================= */
const MEDIDAS = [['busto', 'Busto'], ['cintura', 'Cintura'], ['quadril', 'Quadril'], ['ombro', 'Ombro'], ['altura', 'Altura'], ['manequim', 'Manequim'], ['paleto', 'Paletó'], ['calca', 'Calça'], ['calcado', 'Calçado']];
Pages.clientes = listPage({
  key: 'cli', title: 'Clientes', sub: 'Cadastro completo e histórico de cada cliente', newLabel: 'Novo cliente',
  rows: () => Store.all('customers'), text: c => [c.nome, c.cpf, c.tel, c.whats, c.email].join(' '), sort: (a, b) => a.nome.localeCompare(b.nome), empty: 'Nenhum cliente cadastrado.',
  cols: [
    { h: 'Cliente', c: c => `<div class="who"><span class="avatar">${esc(initials(c.nome))}</span><div><b>${esc(c.nome)}</b><small class="sub">${esc(c.cpf || 'sem CPF')}</small></div></div>` },
    { h: 'Telefone', c: c => esc(c.tel || '—') }, { h: 'E-mail', c: c => esc(c.email || '—') },
    { h: 'Aluguéis', cls: 'num', c: c => Store.all('rentals').filter(r => r.customerId === c.id && r.status !== 'cancelado').length }, { h: 'Compras', cls: 'num', c: c => Store.all('sales').filter(s => s.customerId === c.id && s.status === 'concluida').length },
    { h: 'Em aberto', cls: 'num', c: c => { const v = sum(Store.all('receivables').filter(r => r.customerId === c.id && r.status === 'pendente'), r => r.valor); return v ? `<span class="neg">${money(v)}</span>` : '—'; } }
  ],
  actions: c => `${iconBtn('cli:view', c.id, 'eye', 'Ver histórico')}${c.whats || c.tel ? `<a class="icon-btn" target="_blank" rel="noopener" href="${waLink(c.whats || c.tel)}" title="WhatsApp">${ic('chat', 16)}</a>` : ''}${iconBtn('cli:edit', c.id, 'edit', 'Editar')}${iconBtn('cli:del', c.id, 'trash', 'Excluir', 'danger')}`
});
ACT['cli:new'] = () => customerModal(); ACT['cli:edit'] = d => customerModal(d.id); ACT['cli:view'] = d => customerView(d.id);
ACT['cli:del'] = async d => {
  const c = Store.get('customers', d.id); if (Store.all('rentals').some(r => r.customerId === d.id && r.status !== 'cancelado') || Store.all('sales').some(s => s.customerId === d.id && s.status === 'concluida') || Store.all('receivables').some(r => r.customerId === d.id && r.status === 'pendente')) throw new UserError('Cliente possui aluguéis, compras ou valores em aberto. Não é possível excluir.');
  if (await confirmBox(`Excluir o cliente <b>${esc(c.nome)}</b>?`, { ok: 'Excluir', danger: true })) { Store.remove('customers', d.id); toast('Cliente excluído'); }
};
function customerModal(id, after) {
  const c = id ? Store.get('customers', id) : null;
  const F = [
    { k: 'nome', label: 'Nome completo', req: true, span: 4, max: 90 }, { k: 'nasc', label: 'Data de nascimento', type: 'date', span: 2 },
    { k: 'cpf', label: 'CPF', span: 2, ph: '000.000.000-00', validate: v => cpfValido(v) ? '' : 'CPF inválido' }, { k: 'tel', label: 'Telefone', span: 2 }, { k: 'whats', label: 'WhatsApp', span: 2 },
    { k: 'email', label: 'E-mail', type: 'email', span: 3 }, { k: 'endereco', label: 'Endereço', span: 3 },
    { k: 'pref', label: 'Preferências (estilos, cores, marcas…)', type: 'textarea', rows: 2, span: 3 }, { k: 'obs', label: 'Observações', type: 'textarea', rows: 2, span: 3 },
    { html: '<div class="fld sep" style="--span:6"><h4>Medidas corporais</h4></div>' }, ...MEDIDAS.map(([k, l]) => ({ k: 'm_' + k, label: l, span: 2, max: 12 }))
  ];
  const data = c ? { ...c, ...Object.fromEntries(MEDIDAS.map(([k]) => ['m_' + k, (c.medidas || {})[k] || ''])) } : {};
  Modal.open({
    title: c ? 'Editar cliente' : 'Novo cliente', size: 'lg', html: Form.html(F, data),
    onOpen: api => { $('[name=cpf]', api.el).dataset.mask = 'cpf'; ['tel', 'whats'].forEach(n => $(`[name=${n}]`, api.el).dataset.mask = 'tel'); },
    buttons: [{ label: 'Cancelar', cls: 'ghost' }, {
      label: `${ic('check', 16)} Salvar`, cls: 'gold', onClick: api => {
        const v = Form.read(api.body, F); if (!v) return false;
        if (v.cpf && Store.all('customers').some(x => x.cpf === v.cpf && x.id !== (c && c.id))) throw new UserError('Já existe cliente com este CPF.');
        const medidas = {}; MEDIDAS.forEach(([k]) => { if (v['m_' + k]) medidas[k] = v['m_' + k]; });
        const rec = { ...(c || {}) }; ['nome', 'nasc', 'cpf', 'tel', 'whats', 'email', 'endereco', 'pref', 'obs'].forEach(k => rec[k] = v[k]); rec.medidas = medidas;
        const s = Store.save('customers', rec); toast('Cliente salvo'); if (after) after(s);
      }
    }]
  });
}
function customerView(id) {
  const c = Store.get('customers', id); const rents = Store.all('rentals').filter(r => r.customerId === id).sort((a, b) => b.retirada.localeCompare(a.retirada));
  const sales = Store.all('sales').filter(s => s.customerId === id).sort((a, b) => b.data.localeCompare(a.data)); const recs = Store.all('receivables').filter(r => r.customerId === id && r.status === 'pendente');
  const ap = Store.all('appointments').filter(a => a.customerId === id && a.status !== 'cancelado').sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8);
  const med = Object.entries(c.medidas || {}).map(([k, v]) => `<span class="badge silver">${esc((MEDIDAS.find(m => m[0] === k) || [, k])[1])}: ${esc(v)}</span>`).join(' ') || '<span class="muted">Sem medidas registradas</span>';
  const m = Modal.open({
    title: esc(c.nome), size: 'lg', html: `
    <div class="cust-head"><span class="avatar lg">${esc(initials(c.nome))}</span><div class="grow"><div class="kv"><span>CPF</span><b>${esc(c.cpf || '—')}</b></div><div class="kv"><span>Telefone</span><b>${esc(c.tel || '—')}</b></div><div class="kv"><span>WhatsApp</span><b>${esc(c.whats || '—')}</b></div><div class="kv"><span>E-mail</span><b>${esc(c.email || '—')}</b></div><div class="kv"><span>Nascimento</span><b>${fmtDate(c.nasc)}</b></div><div class="kv wide"><span>Endereço</span><b>${esc(c.endereco || '—')}</b></div></div></div>
    <div class="actions-row"><button class="btn gold sm" data-act="cli:rent" data-id="${id}">${ic('rent', 14)} Novo aluguel</button><button class="btn sm" data-act="cli:appt" data-id="${id}">${ic('calendar', 14)} Agendar prova</button>${c.whats || c.tel ? `<a class="btn sm" target="_blank" rel="noopener" href="${waLink(c.whats || c.tel)}">${ic('chat', 14)} WhatsApp</a>` : ''}</div>
    <h4 class="sec">Medidas</h4><div class="chips">${med}</div>${c.pref ? `<h4 class="sec">Preferências</h4><p>${esc(c.pref)}</p>` : ''}${c.obs ? `<h4 class="sec">Observações</h4><p>${esc(c.obs)}</p>` : ''}
    <h4 class="sec">Histórico de aluguéis (${rents.length})</h4>${table([{ h: 'Nº', c: r => '#' + r.num }, { h: 'Retirada', c: r => fmtDate(r.retirada) }, { h: 'Evento', c: r => fmtDate(r.evento) }, { h: 'Peças', c: r => (r.itemIds || []).map(i => esc(itemLabel(Store.get('items', i) || {}))).join('<br>') }, { h: 'Total', cls: 'num', c: r => money(r.total) }, { h: 'Status', c: r => badge(...RENT_BADGE[rentalState(r)]) }], rents, 'Nenhum aluguel.')}
    <h4 class="sec">Histórico de compras (${sales.length})</h4>${table([{ h: 'Nº', c: s => '#' + s.num }, { h: 'Data', c: s => fmtDate(s.data) }, { h: 'Itens', c: s => (s.itens || []).map(l => esc(l.nome)).join('<br>') }, { h: 'Total', cls: 'num', c: s => money(s.total) }, { h: 'Status', c: s => s.status === 'concluida' ? badge('Concluída', 'ok') : badge('Cancelada', 'muted') }], sales, 'Nenhuma compra.')}
    <h4 class="sec">Pagamentos em aberto (${recs.length})</h4>${table([{ h: 'Descrição', c: r => esc(r.descricao) }, { h: 'Vencimento', c: r => fmtDate(r.vencimento) }, { h: 'Valor', cls: 'num', c: r => money(r.valor) }, { h: 'Situação', c: r => badge(...PAY_BADGE[recStatus(r)]) }], recs, 'Nada em aberto.')}
    <h4 class="sec">Agendamentos</h4>${table([{ h: 'Data', c: a => fmtDate(a.data) + ' ' + esc(a.hora || '') }, { h: 'Tipo', c: a => esc(a.tipo) }, { h: 'Situação', c: a => esc(a.status) }], ap, 'Nenhum agendamento.')}`,
    buttons: [{ label: 'Editar', cls: 'ghost', close: true, onClick: () => { setTimeout(() => customerModal(id), 50); } }, { label: 'Fechar', cls: 'gold' }]
  });
  ACT['cli:rent'] = d => { m.close(); rentalModal(null, { customerId: d.id }); };
  ACT['cli:appt'] = d => { m.close(); apptModal(null, { customerId: d.id }); };
}
