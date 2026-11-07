/* ===== Aluguel: detalhes/ações  +  VENDAS (PDV) ===== */
function rentalView(id) {
  const r = Store.get('rentals', id); if (!r) return; const st = rentalState(r); const c = Store.get('customers', r.customerId) || {};
  const pend = Store.all('receivables').find(x => x.rootId === id && x.status === 'pendente' && x.origem === 'aluguel');
  const pays = (r.payments || []).map(p => `<tr><td>${fmtDate(p.data)}</td><td>${esc(p.tipo)}</td><td>${esc(formaLabel(p.forma))}</td><td class="num">${money(p.valor)}</td></tr>`).join('');
  const tl = [['Reservado em', fmtDate((r.createdAt ? ymd(new Date(r.createdAt)) : r.retirada))], ['Retirada prevista', fmtDate(r.retirada)], ['Retirada real', fmtDate(r.retiradaReal)], ['Evento', fmtDate(r.evento)], ['Devolução prevista', fmtDate(r.devolucao)], ['Devolução real', fmtDate(r.devolucaoReal)]];
  const act = (a, ic_, l, cls = '') => `<button class="btn sm ${cls}" data-act="${a}" data-id="${id}">${ic(ic_, 14)} ${l}</button>`;
  Modal.open({
    title: `Aluguel #${r.num} ${badge(...RENT_BADGE[st])}`, size: 'lg', html: `
    <div class="actions-row">${r.status === 'reservado' ? act('rent:pickup', 'check', 'Registrar retirada', 'gold') : ''}${r.status === 'retirado' ? act('rent:return', 'undo', 'Registrar devolução', 'gold') : ''}${pend && r.status !== 'cancelado' ? act('rent:receive', 'dollar', 'Receber pagamento') : ''}${act('rent:contract', 'print', 'Contrato')}${r.status === 'reservado' ? act('rent:edit', 'edit', 'Editar') : ''}${r.status === 'reservado' || r.status === 'retirado' ? act('rent:cancel', 'x', 'Cancelar aluguel', 'danger') : ''}${c.whats || c.tel ? `<a class="btn sm" target="_blank" rel="noopener" href="${waLink(c.whats || c.tel, `Olá ${(c.nome || '').split(' ')[0]}! Aqui é da ${cfg().loja}. Sobre o seu aluguel #${r.num}: `)}">${ic('chat', 14)} WhatsApp</a>` : ''}</div>
    <div class="cust-head"><div class="grow"><div class="kv"><span>Cliente</span><b>${esc(c.nome || '—')}</b></div><div class="kv"><span>Vendedor</span><b>${esc(userName(r.vendedorId))}</b></div><div class="kv"><span>Total</span><b>${money(r.total)}</b></div><div class="kv"><span>Pago</span><b>${money(rentalPaid(r))}</b></div><div class="kv"><span>Saldo</span><b class="${rentalSaldo(r) > 0.004 ? 'neg' : ''}">${money(rentalSaldo(r))}</b></div><div class="kv"><span>Caução</span><b>${r.caucao ? money(r.caucao) + ' (' + esc(r.caucaoTipo || '') + ')' + (r.caucaoDevolvida ? ' — devolvida' : '') : '—'}</b></div></div></div>
    <h4 class="sec">Datas</h4><div class="chips">${tl.map(([k, v]) => `<span class="badge silver">${k}: ${v}</span>`).join('')}</div>
    <h4 class="sec">Peças</h4>${table([{ h: 'Peça', c: l => esc(itemLabel(Store.get('items', l.itemId) || {})) }, { h: 'Código', c: l => `<code>${esc((Store.get('items', l.itemId) || {}).codigo || '')}</code>` }, { h: 'Valor', cls: 'num', c: l => money(l.valor) }], r.itens || [])}
    <h4 class="sec">Pagamentos</h4>${pays ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Tipo</th><th>Forma</th><th class="num">Valor</th></tr></thead><tbody>${pays}</tbody></table></div>` : '<p class="muted">Nenhum pagamento registrado.</p>'}
    ${r.obs ? `<h4 class="sec">Observações</h4><p>${esc(r.obs)}</p>` : ''}${r.estadoDevolucao ? `<h4 class="sec">Devolução</h4><p>Estado: <b>${esc(r.estadoDevolucao)}</b>${r.obsDevolucao ? ' — ' + esc(r.obsDevolucao) : ''}</p>` : ''}`,
    buttons: [{ label: 'Fechar', cls: 'ghost' }]
  });
}
ACT['rent:receive'] = d => { const p = Store.all('receivables').find(x => x.rootId === d.id && x.status === 'pendente' && x.origem === 'aluguel'); if (p) { Modal.closeAll(); receiveModal(p.id); } };
ACT['rent:pickup'] = d => {
  const r = Store.get('rentals', d.id); const saldo = rentalSaldo(r); Modal.closeAll();
  const F = [{ k: 'data', label: 'Data da retirada', type: 'date', req: true, span: 3, def: todayStr() }, ...(saldo > 0.004 ? [{ k: 'receber', label: `Receber o saldo de ${money(saldo)} agora`, type: 'checkbox', span: 3 }, { k: 'forma', label: 'Forma de pagamento', type: 'select', options: FORMAS, blank: false, span: 3 }] : [])];
  Modal.open({ title: `Retirada — aluguel #${r.num}`, html: (saldo > 0.004 ? `<p class="warn-box">Há saldo de <b>${money(saldo)}</b> em aberto. Recomenda-se receber antes de entregar as peças.</p>` : '') + Form.html(F, { data: todayStr(), receber: true, forma: 'pix' }), buttons: [{ label: 'Cancelar', cls: 'ghost' }, { label: 'Confirmar retirada', cls: 'gold', onClick: api => { const v = Form.read(api.body, F); if (!v) return false; pickupRental(d.id, v); toast('Retirada registrada'); } }] });
};
ACT['rent:return'] = d => {
  const r = Store.get('rentals', d.id); Modal.closeAll(); const atraso = Math.max(0, diffDays(todayStr(), r.devolucao));
  const dest = e => e === 'Perfeito' ? (cfg().lavagemAposDevolucao ? 'lavagem' : 'disponivel') : e === 'Necessita lavagem' ? 'lavagem' : 'manutencao';
  const F = [{ k: 'data', label: 'Data da devolução', type: 'date', req: true, span: 2, def: todayStr() }, { k: 'estado', label: 'Estado das peças', type: 'select', options: ['Perfeito', 'Necessita lavagem', 'Pequenos reparos', 'Dano grave'], blank: false, span: 2 }, { k: 'destino', label: 'Destino das peças', type: 'select', options: [['lavagem', 'Lavagem'], ['disponivel', 'Disponível'], ['manutencao', 'Manutenção']], blank: false, span: 2 },
    { k: 'multa', label: 'Multa / atraso / danos (R$)', type: 'money', span: 3, hint: atraso ? `Devolução com ${atraso} dia(s) de atraso.` : 'Gera uma conta a receber.' }, ...(r.caucao ? [{ k: 'caucaoDevolvida', label: `Caução de ${money(r.caucao)} devolvida`, type: 'checkbox', span: 3 }] : []), { k: 'obs', label: 'Observações da conferência', type: 'textarea', rows: 2, span: 6 }];
  Modal.open({
    title: `Devolução — aluguel #${r.num}`, html: Form.html(F, { data: todayStr(), estado: 'Perfeito', destino: dest('Perfeito'), caucaoDevolvida: true }),
    onOpen: api => $('[name=estado]', api.el).addEventListener('change', e => $('[name=destino]', api.el).value = dest(e.target.value)),
    buttons: [{ label: 'Cancelar', cls: 'ghost' }, { label: 'Confirmar devolução', cls: 'gold', onClick: api => { const v = Form.read(api.body, F); if (!v) return false; returnRental(d.id, v); toast('Devolução registrada'); } }]
  });
};
ACT['rent:cancel'] = d => {
  const r = Store.get('rentals', d.id); Modal.closeAll(); const pago = rentalPaid(r);
  const F = [{ html: `<div class="fld" style="--span:6"><p>Cancelar o aluguel <b>#${r.num}</b> de ${esc(rentalCustomer(r))}? As peças serão liberadas.</p></div>` }, ...(pago > 0 ? [{ k: 'devolver', label: `Devolver ao cliente os ${money(pago)} já recebidos (gera saída no caixa)`, type: 'checkbox', span: 6 }] : [])];
  Modal.open({ title: 'Cancelar aluguel', size: 'sm', html: Form.html(F, {}), buttons: [{ label: 'Voltar', cls: 'ghost' }, { label: 'Cancelar aluguel', cls: 'danger', onClick: api => { const v = Form.read(api.body, F); cancelRental(d.id, v && v.devolver); toast('Aluguel cancelado'); } }] });
};

/* ================= VENDAS ================= */
const vs = () => PS.vend = PS.vend || { tab: 'pdv', q: '', cat: '', cart: [], customerId: '', vendedorId: '', descTipo: 'v', desconto: 0, forma: 'pix', parcelas: 1, entrada: 0, entradaForma: 'dinheiro', hq: '', hper: 'mes' };
const vendTabs = () => { const s = vs(); return `<div class="tabs"><button class="${s.tab === 'pdv' ? 'on' : ''}" data-act="vend:tab" data-tab="pdv">${ic('cart', 15)} Nova venda</button><button class="${s.tab === 'hist' ? 'on' : ''}" data-act="vend:tab" data-tab="hist">${ic('file', 15)} Histórico de vendas</button></div>`; };
const salesHist = listPage({
  key: 'vh', title: 'Vendas', sub: 'Histórico e comprovantes', extra: () => '', rows: () => Store.all('sales'), text: s => [s.num, custName(s.customerId), userName(s.vendedorId), (s.itens || []).map(l => l.nome).join(' ')].join(' '), sort: (a, b) => (b.data + b.hora).localeCompare(a.data + a.hora),
  filters: [{ k: 'per', options: [['hoje', 'Hoje'], ['mes', 'Este mês'], ['all', 'Todas']] }, { k: 'st', options: [['', 'Todas'], ['concluida', 'Concluídas'], ['cancelada', 'Canceladas']] }], state: { per: 'mes', st: '' },
  pass: (s, f) => (f.per === 'all' || (f.per === 'hoje' ? s.data === todayStr() : s.data.slice(0, 7) === todayStr().slice(0, 7))) && (!f.st || s.status === f.st),
  summary: rows => { const ok = rows.filter(s => s.status === 'concluida'); return `<div class="mini-kpis"><div><span>Vendas</span><b>${ok.length}</b></div><div><span>Total vendido</span><b>${money(sum(ok, s => s.total))}</b></div><div><span>Ticket médio</span><b>${money(ok.length ? sum(ok, s => s.total) / ok.length : 0)}</b></div></div>`; },
  cols: [{ h: 'Nº', c: s => `<b>#${s.num}</b>` }, { h: 'Data', c: s => fmtDate(s.data) + ' ' + esc(s.hora || '') }, { h: 'Cliente', c: s => esc(custName(s.customerId)) }, { h: 'Itens', c: s => (s.itens || []).map(l => `<small class="line">${esc(l.nome)}</small>`).join('') }, { h: 'Vendedor', c: s => esc(userName(s.vendedorId)) }, { h: 'Pagamento', c: s => s.forma === 'crediario' ? 'Crediário' : esc(formaLabel(s.forma)) }, { h: 'Total', cls: 'num', c: s => money(s.total) }, { h: 'Status', c: s => s.status === 'concluida' ? badge('Concluída', 'ok') : badge('Cancelada', 'muted') }],
  actions: s => `${iconBtn('vend:receipt', s.id, 'print', 'Comprovante')}${s.status === 'concluida' ? iconBtn('vend:cancel', s.id, 'undo', 'Cancelar venda', 'danger') : ''}`,
  empty: 'Nenhuma venda no período.'
});
Pages.vendas = {
  title: 'Vendas',
  render(el) {
    const s = vs(); if (!s.vendedorId) s.vendedorId = Auth.user.id;
    if (s.tab === 'hist') { salesHist.render(el); el.insertAdjacentHTML('afterbegin', vendTabs()); const h = $('.page-h', el); if (h) el.insertBefore($('.tabs', el), h.nextSibling); return; }
    el.innerHTML = `<div class="page-h"><div><h1>Vendas</h1><p>Ponto de venda rápido</p></div></div>${vendTabs()}
    <div class="pdv"><div class="pdv-l"><div class="card toolbar"><div class="search">${ic('search', 16)}<input class="input" data-flt="q" placeholder="Buscar peça, SKU, cor, tamanho…" value="${esc(s.q)}"></div><select class="input" data-flt="cat">${optList(selOpts(CATEGORIAS, 'Todas as categorias')).map(o => `<option value="${esc(o.v)}" ${s.cat === o.v ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select><button class="btn sm" data-act="vend:avulso">${ic('plus', 14)} Item avulso</button></div><div id="pgrid" class="pgrid"></div></div>
    <div class="pdv-r card"><h3 class="card-t">${ic('cart', 18)} Carrinho</h3><div id="cart"></div>
      <div class="fgrid tight"><div class="fld" style="--span:6"><label>Cliente <small>(opcional)</small></label><div class="inline"><select class="input" data-flt="customerId" id="pcust">${optList(selOpts(custOptions(), 'Consumidor final')).map(o => `<option value="${esc(o.v)}" ${s.customerId === o.v ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select><button class="btn sm" data-act="vend:newcust">${ic('plus', 14)}</button></div></div>
      <div class="fld" style="--span:6"><label>Vendedor responsável</label><select class="input" data-flt="vendedorId">${userOptions().map(o => `<option value="${o[0]}" ${s.vendedorId === o[0] ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>
      <div class="fld" style="--span:3"><label>Desconto</label><div class="inline"><input class="input" type="number" min="0" step="0.01" data-flt="desconto" value="${s.desconto || ''}" placeholder="0"><select class="input sm" data-flt="descTipo" style="width:70px"><option value="v" ${s.descTipo === 'v' ? 'selected' : ''}>R$</option><option value="p" ${s.descTipo === 'p' ? 'selected' : ''}>%</option></select></div></div>
      <div class="fld" style="--span:3"><label>Forma de pagamento</label><select class="input" data-flt="forma">${[...FORMAS.filter(f => ['dinheiro', 'pix', 'debito', 'credito', 'parcelado'].includes(f[0])), ['crediario', 'Crediário da loja']].map(f => `<option value="${f[0]}" ${s.forma === f[0] ? 'selected' : ''}>${f[1]}</option>`).join('')}</select></div>
      <div class="fld" id="pParc" style="--span:3"><label>Parcelas</label><select class="input" data-flt="parcelas">${[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => `<option ${+s.parcelas === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="fld" id="pEnt" style="--span:3"><label>Entrada (R$)</label><input class="input" type="number" min="0" step="0.01" data-flt="entrada" value="${s.entrada || ''}"></div>
      <div class="fld" id="pEntF" style="--span:3"><label>Forma da entrada</label><select class="input" data-flt="entradaForma">${FORMAS.filter(f => ['dinheiro', 'pix', 'debito', 'credito'].includes(f[0])).map(f => `<option value="${f[0]}" ${s.entradaForma === f[0] ? 'selected' : ''}>${f[1]}</option>`).join('')}</select></div></div>
      <div id="tot"></div><button class="btn gold block lg" data-act="vend:finish">${ic('check', 18)} Finalizar venda</button></div></div>`;
    this.grid(); this.cart();
  },
  grid() {
    const s = vs(); const g = $('#pgrid'); if (!g) return; const q = (s.q || '').toLowerCase(); const inCart = new Set(s.cart.map(l => l.itemId));
    const items = Store.all('items').map(i => ({ i, p: prodOf(i) || {} })).filter(({ i, p }) => i.status === 'disponivel' && p.ativo !== false && !inCart.has(i.id) && (!s.cat || p.categoria === s.cat) && (!q || [p.nome, p.sku, p.marca, i.cor, i.tamanho, i.codigo].join(' ').toLowerCase().includes(q))).sort((a, b) => a.p.nome.localeCompare(b.p.nome));
    g.innerHTML = items.slice(0, 80).map(({ i, p }) => `<button class="ptile" data-act="vend:add" data-id="${i.id}">${thumb(p, 'lg')}<b>${esc(p.nome)}</b><small>Tam ${esc(i.tamanho)} · ${esc(i.cor)}</small><span class="price">${money(p.venda)}</span></button>`).join('') || `<div class="empty">${ic('search', 28)}<p>Nenhuma peça disponível para venda.</p></div>`;
  },
  cart() {
    const s = vs(); const c = $('#cart'); if (!c) return;
    c.innerHTML = s.cart.length ? s.cart.map((l, i) => `<div class="cline"><div class="grow"><b>${esc(l.nome)}</b></div><input class="input sm" type="number" min="0" step="0.01" data-flt="price:${i}" value="${l.preco}"><button class="icon-btn danger" data-act="vend:rm" data-i="${i}">${ic('x', 14)}</button></div>`).join('') : '<p class="muted c">Clique nas peças ao lado para adicionar.</p>';
    this.totals();
  },
  calc() { const s = vs(); const sub = sum(s.cart, l => l.preco); const d = s.descTipo === 'p' ? r2(sub * Math.min(100, num(s.desconto)) / 100) : Math.min(sub, r2(s.desconto)); return { sub, d, total: r2(sub - d) }; },
  totals() {
    const s = vs(); const t = this.calc(); const el = $('#tot'); if (!el) return;
    const show = (id, on) => { const e = $('#' + id); if (e) e.style.display = on ? '' : 'none'; };
    show('pParc', ['parcelado', 'crediario'].includes(s.forma)); show('pEnt', s.forma === 'crediario'); show('pEntF', s.forma === 'crediario');
    let extra = ''; if (s.forma === 'parcelado' && t.total) extra = `<div class="row"><span>${s.parcelas}x de</span><b>${money(t.total / s.parcelas)}</b></div>`;
    if (s.forma === 'crediario' && t.total) { const rest = Math.max(0, t.total - num(s.entrada)); extra = `<div class="row"><span>Saldo a receber</span><b>${money(rest)}</b></div><div class="row"><span>${s.parcelas}x de</span><b>${money(rest / s.parcelas)}</b></div>`; }
    el.innerHTML = `<div class="totals"><div class="row"><span>Subtotal</span><b>${money(t.sub)}</b></div><div class="row"><span>Desconto</span><b>- ${money(t.d)}</b></div>${extra}<div class="row big"><span>TOTAL</span><b>${money(t.total)}</b></div></div>`;
  },
  refresh() { if (vs().tab === 'hist') salesHist.list(); else this.grid(); },
  onFilter(k, v) {
    const s = vs();
    if (s.tab === 'hist') return salesHist.onFilter(k, v);
    if (k.startsWith('price:')) { s.cart[+k.slice(6)].preco = num(v); return this.totals(); }
    if (k === 'q' || k === 'cat') { s[k] = v; return this.grid(); }
    s[k] = ['desconto', 'entrada', 'parcelas'].includes(k) ? num(v) : v; this.totals();
  }
};
ACT['vend:tab'] = d => { vs().tab = d.tab; Pages.vendas.render($('#view')); };
ACT['vend:add'] = d => { const s = vs(); const it = Store.get('items', d.id); const p = prodOf(it) || {}; if (s.cart.some(l => l.itemId === d.id)) return; s.cart.push({ itemId: it.id, nome: itemLabel(it), preco: num(p.venda), custo: num(p.compra) }); Pages.vendas.grid(); Pages.vendas.cart(); };
ACT['vend:rm'] = d => { vs().cart.splice(+d.i, 1); Pages.vendas.grid(); Pages.vendas.cart(); };
ACT['vend:newcust'] = () => customerModal(null, c => { vs().customerId = c.id; Pages.vendas.render($('#view')); });
ACT['vend:avulso'] = () => {
  const F = [{ k: 'nome', label: 'Descrição (ex.: ajuste de barra)', req: true, span: 4 }, { k: 'preco', label: 'Valor (R$)', type: 'money', req: true, span: 2 }];
  Modal.open({ title: 'Item avulso / serviço', size: 'sm', html: Form.html(F, {}), buttons: [{ label: 'Cancelar', cls: 'ghost' }, { label: 'Adicionar', cls: 'gold', onClick: api => { const v = Form.read(api.body, F); if (!v) return false; vs().cart.push({ nome: v.nome, preco: v.preco, custo: 0, avulso: true }); Pages.vendas.cart(); } }] });
};
ACT['vend:finish'] = () => {
  const s = vs(); const t = Pages.vendas.calc();
  const sale = createSale({ customerId: s.customerId, vendedorId: s.vendedorId || Auth.user.id, linhas: s.cart, desconto: t.d, forma: s.forma, parcelas: s.parcelas, entrada: s.entrada, entradaForma: s.entradaForma });
  Object.assign(s, { cart: [], desconto: 0, entrada: 0, customerId: '', q: '' }); toast(`Venda #${sale.num} concluída`);
  Pages.vendas.render($('#view')); showReceipt(sale.id);
};
function showReceipt(id) { const s = Store.get('sales', id); Modal.open({ title: 'Comprovante de venda', size: 'md', html: `<div class="receipt-prev">${receiptHTML(s)}</div>`, buttons: [{ label: 'Fechar', cls: 'ghost' }, { label: `${ic('print', 16)} Imprimir / PDF`, cls: 'gold', close: false, onClick: () => printHTML(receiptHTML(s), `Venda ${s.num}`) }] }); }
ACT['vend:receipt'] = d => showReceipt(d.id);
ACT['vend:cancel'] = async d => { const s = Store.get('sales', d.id); if (!(await confirmBox(`Cancelar a venda <b>#${s.num}</b>? As peças voltam ao estoque e os valores recebidos serão estornados no caixa.`, { ok: 'Cancelar venda', danger: true }))) return; cancelSale(d.id); toast('Venda cancelada'); };
