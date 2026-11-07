/* ===== Aluguéis (lista, calendário, contrato) e Vendas (PDV, histórico, comprovante) ===== */
const printHead = () => { const c = cfg(); return `<div class="pr-head"><div><h1>${esc(c.loja)}</h1><small>${esc(c.slogan)}</small></div><div class="pr-meta">${c.cnpj ? 'CNPJ ' + esc(c.cnpj) + '<br>' : ''}${esc(c.endereco)}${c.endereco ? '<br>' : ''}${esc(c.tel)} ${esc(c.email)}</div></div>`; };

function contractHTML(r) {
  const c = Store.get('customers', r.customerId) || {}; const cf = cfg();
  const itens = (r.itens || []).map(l => { const it = Store.get('items', l.itemId) || {}; return `<tr><td>${esc(itemLabel(it))}</td><td>${esc(it.codigo || '')}</td><td class="r">${money(l.valor)}</td></tr>`; }).join('');
  return `<div class="print-doc">${printHead()}<h2>CONTRATO DE LOCAÇÃO Nº ${String(r.num).padStart(4, '0')}</h2>
  <table class="pr-t"><tr><th>Locatário</th><td>${esc(c.nome)}</td><th>CPF</th><td>${esc(c.cpf || '—')}</td></tr><tr><th>Telefone</th><td>${esc(c.tel || '—')}</td><th>E-mail</th><td>${esc(c.email || '—')}</td></tr><tr><th>Endereço</th><td colspan="3">${esc(c.endereco || '—')}</td></tr></table>
  <h3>Peças locadas</h3><table class="pr-t"><thead><tr><th>Descrição</th><th>Código</th><th class="r">Valor</th></tr></thead><tbody>${itens}</tbody></table>
  <table class="pr-t"><tr><th>Retirada</th><td>${fmtDate(r.retirada)}</td><th>Evento</th><td>${fmtDate(r.evento)}</td><th>Devolução</th><td>${fmtDate(r.devolucao)}</td></tr></table>
  <table class="pr-t"><tr><th>Desconto</th><td>${money(r.desconto)}</td><th>Valor total</th><td><b>${money(r.total)}</b></td></tr><tr><th>Pago</th><td>${money(rentalPaid(r))}</td><th>Restante</th><td><b>${money(rentalSaldo(r))}</b> ${r.vencRestante ? '(venc. ' + fmtDate(r.vencRestante) + ')' : ''}</td></tr><tr><th>Caução / garantia</th><td>${money(r.caucao)} ${r.caucao ? '(' + esc(r.caucaoTipo || '') + ')' : ''}</td><th>Vendedor</th><td>${esc(userName(r.vendedorId))}</td></tr></table>
  ${r.obs ? `<p><b>Observações:</b> ${esc(r.obs)}</p>` : ''}<h3>Condições</h3><div class="clauses">${esc(cf.contrato).replace(/\n/g, '<br>')}</div>
  <p class="c" style="margin-top:14px">${esc(cf.loja)}, ${fmtDate(todayStr())}</p>
  <div class="sign"><div><hr>${esc(c.nome || 'Locatário')}<br><small>Locatário</small></div><div><hr>${esc(cf.loja)}<br><small>Locador</small></div></div></div>`;
}
function receiptHTML(s) {
  const c = Store.get('customers', s.customerId); const cf = cfg();
  return `<div class="print-doc receipt-doc">${printHead()}<h2>COMPROVANTE DE VENDA Nº ${String(s.num).padStart(4, '0')}</h2><p>${fmtDate(s.data)} ${esc(s.hora || '')} · Vendedor: ${esc(userName(s.vendedorId))}${c ? '<br>Cliente: ' + esc(c.nome) : ''}</p>
  <table class="pr-t"><thead><tr><th>Item</th><th class="r">Valor</th></tr></thead><tbody>${(s.itens || []).map(l => `<tr><td>${esc(l.nome)}</td><td class="r">${money(l.preco)}</td></tr>`).join('')}</tbody>
  <tfoot><tr><td class="r">Subtotal</td><td class="r">${money(s.subtotal)}</td></tr>${s.desconto ? `<tr><td class="r">Desconto</td><td class="r">- ${money(s.desconto)}</td></tr>` : ''}<tr><td class="r"><b>TOTAL</b></td><td class="r"><b>${money(s.total)}</b></td></tr></tfoot></table>
  <p>Pagamento: <b>${s.forma === 'crediario' ? 'Crediário da loja' : esc(formaLabel(s.forma))}${s.forma === 'parcelado' ? ' em ' + s.parcelas + 'x' : ''}</b>${s.forma === 'crediario' ? `<br>Entrada: ${money(s.entrada)} · Saldo em ${s.parcelas}x de ${money((s.total - s.entrada) / s.parcelas)}` : ''}</p>
  ${s.status === 'cancelada' ? '<p><b>VENDA CANCELADA</b></p>' : ''}<p class="c">${esc(cf.rodape)}</p></div>`;
}

/* ================= ALUGUÉIS ================= */
const rentalCustomer = r => custName(r.customerId);
Pages.alugueis = {
  title: 'Aluguéis',
  render(el) {
    const s = PS.alug = PS.alug || { tab: 'lista', q: '', status: '', cal: todayStr().slice(0, 7) };
    el.innerHTML = `<div class="page-h"><div><h1>Aluguéis</h1><p>Reservas, retiradas, devoluções e contratos</p></div><div class="page-actions"><button class="btn gold" data-act="rent:new">${ic('plus')}<span>Novo aluguel</span></button></div></div>
    <div class="tabs"><button class="${s.tab === 'lista' ? 'on' : ''}" data-act="rent:tab" data-tab="lista">Lista</button><button class="${s.tab === 'cal' ? 'on' : ''}" data-act="rent:tab" data-tab="cal">Calendário de reservas</button></div>
    ${s.tab === 'lista' ? `<div class="card toolbar"><div class="search">${ic('search', 16)}<input class="input" data-flt="q" placeholder="Buscar por cliente, nº, peça…" value="${esc(s.q)}"></div><select class="input" data-flt="status">${optList([['', 'Todos os status'], ['reservado', 'Reservados'], ['retirado', 'Retirados'], ['atrasado', 'Atrasados'], ['devolvido', 'Devolvidos'], ['cancelado', 'Cancelados']]).map(o => `<option value="${o.v}" ${s.status === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}</select></div>` : ''}<div id="lst"></div>`;
    this.list();
  },
  list() {
    const s = PS.alug; if (!$('#lst')) return;
    if (s.tab === 'cal') return this.cal();
    const q = (s.q || '').toLowerCase();
    const rows = Store.all('rentals').filter(r => (!s.status || rentalState(r) === s.status) && (!q || [r.num, rentalCustomer(r), (r.itemIds || []).map(i => itemLabel(Store.get('items', i) || {})).join(' ')].join(' ').toLowerCase().includes(q))).sort((a, b) => b.retirada.localeCompare(a.retirada));
    $('#lst').innerHTML = `<div class="card nopad">${table([
      { h: 'Nº', c: r => `<b>#${r.num}</b>` }, { h: 'Cliente', c: r => esc(rentalCustomer(r)) },
      { h: 'Peças', c: r => (r.itemIds || []).map(i => `<small class="line">${esc(itemLabel(Store.get('items', i) || {}))}</small>`).join('') },
      { h: 'Retirada', c: r => fmtDate(r.retirada) }, { h: 'Evento', c: r => fmtDate(r.evento) }, { h: 'Devolução', c: r => fmtDate(r.devolucao) },
      { h: 'Total', cls: 'num', c: r => money(r.total) }, { h: 'Saldo', cls: 'num', c: r => rentalSaldo(r) > 0.004 && r.status !== 'cancelado' ? `<span class="neg">${money(rentalSaldo(r))}</span>` : '—' },
      { h: 'Status', c: r => badge(...RENT_BADGE[rentalState(r)]) },
      { h: '', cls: 'act', c: r => `<div class="row-actions">${iconBtn('rent:view', r.id, 'eye', 'Detalhes / ações')}${iconBtn('rent:contract', r.id, 'print', 'Contrato')}${r.status === 'reservado' ? iconBtn('rent:edit', r.id, 'edit', 'Editar') : ''}${iconBtn('rent:del', r.id, 'trash', 'Excluir', 'danger')}</div>` }
    ], rows, 'Nenhum aluguel registrado.')}</div>`;
  },
  cal() {
    const s = PS.alug; const [y, m] = s.cal.split('-').map(Number); const first = new Date(y, m - 1, 1); const dim = new Date(y, m, 0).getDate(); const off = first.getDay();
    const rents = Store.all('rentals').filter(r => r.status !== 'cancelado'); let cells = '';
    const total = Math.ceil((off + dim) / 7) * 7;
    for (let i = 0; i < total; i++) {
      const dn = i - off + 1; if (dn < 1 || dn > dim) { cells += '<div class="cal-c out"></div>'; continue; }
      const ds = `${y}-${pad(m)}-${pad(dn)}`; const list = rents.filter(r => ds >= r.retirada && ds <= ((r.status === 'devolvido' && r.devolucaoReal) ? r.devolucaoReal : r.devolucao));
      cells += `<div class="cal-c ${ds === todayStr() ? 'today' : ''}"><span class="dn">${dn}</span>${list.slice(0, 4).map(r => { const st = rentalState(r); const first_ = ds === r.retirada; return `<div class="pill st-${st} ${first_ ? 'start' : ''}" data-act="rent:view" data-id="${r.id}" title="#${r.num} ${esc(rentalCustomer(r))} — ${RENT_BADGE[st][0]}">${first_ ? esc(rentalCustomer(r).split(' ')[0]) : ''}${ds === r.evento ? ic('heart', 11) : ''}${ds === r.devolucao && !first_ ? 'dev.' : ''}</div>`; }).join('')}${list.length > 4 ? `<a class="more" data-act="rent:day" data-d="${ds}">+${list.length - 4}</a>` : ''}</div>`;
    }
    $('#lst').innerHTML = `<div class="card"><div class="cal-h"><button class="icon-btn" data-act="rent:nav" data-dir="-1">${ic('chevL')}</button><h3>${MESES[m - 1]} de ${y}</h3><button class="icon-btn" data-act="rent:nav" data-dir="1">${ic('chevR')}</button><button class="btn sm ghost" data-act="rent:nav" data-dir="0">Hoje</button></div>
    <div class="cal-g">${DIAS.map(d => `<div class="cal-w">${d}</div>`).join('')}${cells}</div>
    <div class="legend cal-lg"><span><i class="st-reservado"></i>Reservado</span><span><i class="st-retirado"></i>Retirado (com o cliente)</span><span><i class="st-atrasado"></i>Atrasado</span><span><i class="st-devolvido"></i>Devolvido</span><span>${ic('heart', 12)} Dia do evento</span></div></div>`;
  },
  refresh() { this.list(); },
  onFilter(k, v) { PS.alug[k] = v; this.list(); }
};
ACT['rent:tab'] = d => { PS.alug.tab = d.tab; Pages.alugueis.render($('#view')); };
ACT['rent:nav'] = d => { const s = PS.alug; if (+d.dir === 0) s.cal = todayStr().slice(0, 7); else { const [y, m] = s.cal.split('-').map(Number); const x = new Date(y, m - 1 + (+d.dir), 1); s.cal = `${x.getFullYear()}-${pad(x.getMonth() + 1)}`; } Pages.alugueis.cal(); };
ACT['rent:day'] = d => { const rs = Store.all('rentals').filter(r => r.status !== 'cancelado' && d.d >= r.retirada && d.d <= r.devolucao); Modal.open({ title: `Reservas em ${fmtDate(d.d)}`, html: table([{ h: 'Nº', c: r => '#' + r.num }, { h: 'Cliente', c: r => esc(rentalCustomer(r)) }, { h: 'Status', c: r => badge(...RENT_BADGE[rentalState(r)]) }, { h: '', c: r => iconBtn('rent:view', r.id, 'eye', 'Detalhes') }], rs), buttons: [{ label: 'Fechar', cls: 'gold' }] }); };
ACT['rent:new'] = () => rentalModal(); ACT['rent:edit'] = d => rentalModal(d.id);
ACT['rent:view'] = d => { Modal.closeAll(); rentalView(d.id); };
ACT['rent:contract'] = d => printHTML(contractHTML(Store.get('rentals', d.id)), `Contrato ${Store.get('rentals', d.id).num}`);
ACT['rent:del'] = async d => {
  const r = Store.get('rentals', d.id); if (r.status === 'retirado') throw new UserError('Aluguel retirado: registre a devolução ou cancele antes de excluir.');
  if (!(await confirmBox(`Excluir o aluguel <b>#${r.num}</b> de ${esc(rentalCustomer(r))}? Pagamentos já lançados no caixa permanecem registrados.`, { ok: 'Excluir', danger: true }))) return;
  Store.all('receivables').filter(x => x.rootId === r.id && x.status === 'pendente').forEach(x => Store.remove('receivables', x.id)); Store.remove('rentals', r.id); toast('Aluguel excluído');
};

function rentalModal(id, pre = {}) {
  const ed = id ? Store.get('rentals', id) : null; let lines = ed ? (ed.itens || []).map(l => ({ ...l })) : [];
  const cuOpts = () => optList(selOpts(custOptions(), 'Selecione o cliente…')).map(o => `<option value="${esc(o.v)}">${esc(o.l)}</option>`).join('');
  const F = [
    { html: `<div class="fld" style="--span:4"><label>Cliente <b>*</b></label><div class="inline"><select class="input" name="customerId">${cuOpts()}</select><button type="button" class="btn sm" id="newCust">${ic('plus', 14)} Novo</button></div></div>` },
    { k: 'vendedorId', label: 'Vendedor responsável', type: 'select', options: userOptions(), blank: false, span: 2 },
    { k: 'retirada', label: 'Data da retirada', type: 'date', req: true, span: 2 }, { k: 'evento', label: 'Data do evento', type: 'date', req: true, span: 2 }, { k: 'devolucao', label: 'Devolução prevista', type: 'date', req: true, span: 2 },
    { html: `<div class="fld" style="--span:6"><label>Peças <b>*</b></label><div class="inline"><select class="input" id="itemSel"></select><button type="button" class="btn sm gold" id="addItem">${ic('plus', 14)} Adicionar</button></div><small class="hint" id="availNote"></small><div id="lines"></div></div>` },
    { k: 'desconto', label: 'Desconto (R$)', type: 'money', span: 2 }, { k: 'totalv', label: 'Valor total do aluguel', type: 'money', ro: true, span: 2 },
    ...(ed ? [{ k: 'pago', label: 'Já pago', type: 'money', ro: true, span: 2 }] : [{ k: 'sinal', label: 'Valor do sinal (R$)', type: 'money', span: 1 }, { k: 'forma', label: 'Forma de pagamento', type: 'select', options: FORMAS, blank: false, span: 1 }]),
    { k: 'restante', label: 'Valor restante', type: 'money', ro: true, span: 2 }, { k: 'vencRestante', label: 'Vencimento do restante', type: 'date', span: 2 },
    { k: 'caucao', label: 'Caução / garantia (R$)', type: 'money', span: 2 }, { k: 'caucaoTipo', label: 'Tipo de garantia', type: 'select', options: ['Dinheiro', 'Cheque', 'Documento com foto', 'Cartão', 'Outro'], blank: false, span: 2 },
    { k: 'obs', label: 'Observações', type: 'textarea', rows: 2, span: 6 }
  ];
  const data = ed ? { ...ed, totalv: ed.total, pago: rentalPaid(ed), restante: rentalSaldo(ed) } : { vendedorId: Auth.user.id, forma: 'pix', caucaoTipo: 'Dinheiro', ...pre };
  Modal.open({
    title: ed ? `Editar aluguel #${ed.num}` : 'Novo aluguel', size: 'xl', html: Form.html(F, data),
    onOpen: api => {
      const f = n => $(`[name=${n}]`, api.el); const sel = $('#itemSel', api.el);
      const subtotal = () => sum(lines, l => l.valor); const total = () => r2(Math.max(0, subtotal() - num(f('desconto').value)));
      const upd = () => { const t = total(); f('totalv').value = t.toFixed(2); const paid = ed ? rentalPaid(ed) : num(f('sinal') && f('sinal').value); f('restante').value = Math.max(0, r2(t - paid)).toFixed(2); };
      const dates = () => [f('retirada').value, f('devolucao').value];
      const drawLines = () => {
        const [a, z] = dates();
        $('#lines', api.el).innerHTML = lines.length ? `<table class="tbl sm"><tbody>${lines.map((l, i) => { const it = Store.get('items', l.itemId) || {}; const cf = a && z ? rentalConflicts(l.itemId, a, z, ed && ed.id) : []; return `<tr><td>${esc(itemLabel(it))} <code>${esc(it.codigo || '')}</code>${cf.length ? `<div class="neg small">⚠ Conflito com aluguel #${cf[0].num} (${fmtDate(cf[0].retirada)} a ${fmtDate(cf[0].devolucao)})</div>` : ''}</td><td style="width:140px"><input class="input sm" type="number" min="0" step="0.01" value="${l.valor}" data-li="${i}"></td><td style="width:40px"><button type="button" class="icon-btn danger" data-lr="${i}">${ic('x', 14)}</button></td></tr>`; }).join('')}</tbody></table>` : '<p class="muted small">Nenhuma peça adicionada.</p>';
        $$('[data-li]', api.el).forEach(inp => inp.oninput = () => { lines[+inp.dataset.li].valor = num(inp.value); upd(); });
        $$('[data-lr]', api.el).forEach(b => b.onclick = () => { lines.splice(+b.dataset.lr, 1); drawLines(); fillSel(); upd(); });
      };
      const fillSel = () => {
        const [a, z] = dates(); if (!a || !z) { sel.innerHTML = '<option value="">Defina retirada e devolução primeiro…</option>'; $('#availNote', api.el).textContent = ''; return; }
        if (z < a) { sel.innerHTML = '<option value="">Datas inválidas</option>'; return; }
        const all = Store.all('items').filter(i => i.status !== 'vendido' && i.status !== 'manutencao' && (prodOf(i) || {}).ativo !== false && !lines.some(l => l.itemId === i.id));
        const ok = all.filter(i => !rentalConflicts(i.id, a, z, ed && ed.id).length).sort((x, y) => itemLabel(x).localeCompare(itemLabel(y)));
        sel.innerHTML = `<option value="">Selecione a peça disponível…</option>` + ok.map(i => `<option value="${i.id}">${esc(itemLabel(i))} (${esc(i.codigo)}) — ${money((prodOf(i) || {}).aluguel)}</option>`).join('');
        $('#availNote', api.el).textContent = `${ok.length} peça(s) disponível(is) de ${fmtDate(a)} a ${fmtDate(z)}; ${all.length - ok.length} indisponível(is) nesse período.`;
      };
      if (ed) { f('customerId').value = ed.customerId; f('vendedorId').value = ed.vendedorId; }
      else if (pre.customerId) f('customerId').value = pre.customerId;
      ['retirada', 'devolucao'].forEach(n => f(n).addEventListener('change', () => { drawLines(); fillSel(); }));
      f('retirada').addEventListener('change', () => { if (!f('vencRestante').value) f('vencRestante').value = f('retirada').value; });
      f('desconto').addEventListener('input', upd); if (f('sinal')) f('sinal').addEventListener('input', upd);
      $('#addItem', api.el).onclick = () => { if (!sel.value) return toast('Selecione uma peça', 'warn'); const it = Store.get('items', sel.value); lines.push({ itemId: it.id, valor: num((prodOf(it) || {}).aluguel) }); drawLines(); fillSel(); upd(); };
      $('#newCust', api.el).onclick = () => customerModal(null, c => { const s = f('customerId'); s.innerHTML = cuOpts(); s.value = c.id; });
      drawLines(); fillSel(); upd();
    },
    buttons: [{ label: 'Cancelar', cls: 'ghost' }, {
      label: `${ic('check', 16)} ${ed ? 'Salvar alterações' : 'Reservar'}`, cls: 'gold', onClick: api => {
        const v = Form.read(api.body, F.filter(x => x.k !== 'pago')); if (!v) return false;
        if (!v.customerId) { $('[name=customerId]', api.el).classList.add('invalid'); throw new UserError('Selecione o cliente.'); }
        if (v.devolucao < v.retirada || v.evento < v.retirada || v.devolucao < v.evento) throw new UserError('Verifique as datas: retirada ≤ evento ≤ devolução.');
        if (!lines.length) throw new UserError('Adicione ao menos uma peça.');
        const r = saveRental({ customerId: v.customerId, vendedorId: v.vendedorId, retirada: v.retirada, evento: v.evento, devolucao: v.devolucao, lines, desconto: v.desconto, sinal: v.sinal, forma: v.forma, vencRestante: v.vencRestante, caucao: v.caucao, caucaoTipo: v.caucaoTipo, obs: v.obs }, ed);
        toast(ed ? 'Aluguel atualizado' : `Aluguel #${r.num} reservado`);
        if (!ed) setTimeout(() => rentalView(r.id), 200);
      }
    }]
  });
}
