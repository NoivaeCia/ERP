/* ===== Caixa, Contas a pagar, Contas a receber, Agenda ===== */

/* ---------- Arquivo (comprovante) ---------- */
const fileField = (label = 'Comprovante (imagem ou PDF até 1,5 MB)') => `<div class="fld" style="--span:6"><label>${label}</label><div class="inline"><label class="btn sm ghost upl">${ic('upload', 14)} Anexar<input id="cmpf" type="file" accept="image/*,application/pdf" hidden></label><span id="cmpn" class="muted small">Nenhum arquivo</span></div></div>`;
function bindFile(api, holder) { const inp = $('#cmpf', api.el); if (!inp) return; inp.onchange = async e => { const f = e.target.files[0]; if (!f) return; try { holder.v = await readFileData(f); $('#cmpn', api.el).textContent = f.name; } catch (er) { handleErr(er); } }; if (holder.v) $('#cmpn', api.el).textContent = 'Arquivo anexado'; }
const cmpLink = u => u ? `<a class="icon-btn" href="${esc(u)}" target="_blank" rel="noopener" download="comprovante" title="Ver comprovante">${ic('file', 16)}</a>` : '';

/* ================= CAIXA ================= */
Pages.caixa = {
  title: 'Caixa',
  render(el) {
    const cx = openCaixa(); const hist = Store.all('caixas').filter(c => c.status === 'fechado').sort((a, b) => (b.fechamento || '').localeCompare(a.fechamento || ''));
    let top;
    if (!cx) top = `<div class="card center-card">${ic('lock', 34)}<h3>Caixa fechado</h3><p class="muted">Abra o caixa para registrar vendas, recebimentos e pagamentos.</p><button class="btn gold lg" data-act="cx:open">${ic('wallet', 18)} Abrir caixa</button></div>`;
    else {
      const S = cashSummary(cx); const card = (l, v, tone = '', sub = '') => `<div class="kpi ${tone}"><div class="kpi-t"><span>${l}</span><b>${money(v)}</b><small>${sub || '&nbsp;'}</small></div></div>`;
      top = `<div class="card cx-bar"><div><span class="badge ok">Caixa aberto</span> <small class="muted">desde ${fmtDate(cx.abertura)} ${esc(cx.hora || '')} por ${esc(userName(cx.abertoPor))}</small></div><div class="row-actions wrap"><button class="btn sm" data-act="cx:in">${ic('plus', 14)} Entrada</button><button class="btn sm" data-act="cx:out">${ic('pagar', 14)} Saída / despesa</button><button class="btn sm" data-act="cx:reforco">${ic('upload', 14)} Reforço</button><button class="btn sm" data-act="cx:sangria">${ic('download', 14)} Sangria</button><button class="btn gold sm" data-act="cx:close">${ic('lock', 14)} Fechar caixa</button></div></div>
      <div class="kpis k4">${card('Saldo inicial', cx.saldoInicial)}${card('Recebido em dinheiro', S.dinheiro, 'gold')}${card('Recebido em PIX', S.pix, 'gold')}${card('Recebido em cartões', S.cartoes, 'gold')}${card('Outros recebimentos', S.outros)}${card('Total de saídas', S.saidas, 'danger', `sangrias ${money(S.sangrias)}`)}${card('Saldo esperado (dinheiro)', S.esperado, 'ok', 'inicial + entradas − saídas em espécie')}</div>
      <div class="card nopad"><div class="card-th pad"><h3 class="card-t">Movimentações do caixa atual</h3></div>${table([{ h: 'Hora', c: l => esc(l.hora || '') }, { h: 'Tipo', c: l => l.tipo === 'entrada' ? badge('Entrada', 'ok') : badge('Saída', 'danger') }, { h: 'Origem', c: l => esc(({ venda: 'Venda', aluguel: 'Aluguel', conta_pagar: 'Conta paga', manual: 'Manual', sangria: 'Sangria', reforco: 'Reforço', receber: 'Recebimento' })[l.origem] || l.origem) }, { h: 'Forma', c: l => esc(formaLabel(l.forma)) }, { h: 'Descrição', c: l => esc(l.descricao) }, { h: 'Valor', cls: 'num', c: l => `<span class="${l.tipo === 'entrada' ? 'pos' : 'neg'}">${l.tipo === 'entrada' ? '+' : '−'} ${money(l.valor)}</span>` }], S.lista.sort((a, b) => (b.hora || '').localeCompare(a.hora || '')), 'Nenhuma movimentação ainda.')}</div>`;
    }
    el.innerHTML = `<div class="page-h"><div><h1>Caixa</h1><p>Controle financeiro diário</p></div></div>${top}
    <div class="card nopad mt"><div class="card-th pad"><h3 class="card-t">Histórico de fechamentos</h3></div>${table([{ h: 'Data', c: c => fmtDate(c.abertura) }, { h: 'Aberto por', c: c => esc(userName(c.abertoPor)) }, { h: 'Saldo inicial', cls: 'num', c: c => money(c.saldoInicial) }, { h: 'Esperado', cls: 'num', c: c => money(c.saldoEsperado) }, { h: 'Informado', cls: 'num', c: c => money(c.saldoInformado) }, { h: 'Diferença', cls: 'num', c: c => `<span class="${Math.abs(c.diferenca) < .005 ? '' : c.diferenca < 0 ? 'neg' : 'pos'}">${money(c.diferenca)}</span>` }, { h: 'Obs.', c: c => esc(c.obsFechamento || '') }, { h: '', cls: 'act', c: c => iconBtn('cx:hist', c.id, 'eye', 'Ver movimentações') }], hist.slice(0, 60), 'Nenhum fechamento registrado.')}</div>`;
  },
  refresh() { this.render($('#view')); }
};
const moneyModal = (title, F, onSave, data = {}) => Modal.open({ title, size: 'sm', html: Form.html(F, data), buttons: [{ label: 'Cancelar', cls: 'ghost' }, { label: `${ic('check', 16)} Confirmar`, cls: 'gold', onClick: api => { const v = Form.read(api.body, F); if (!v) return false; onSave(v); } }] });
ACT['cx:open'] = () => {
  if (openCaixa()) throw new UserError('Já existe um caixa aberto.');
  const last = Store.all('caixas').filter(c => c.status === 'fechado').sort((a, b) => (b.fechamento || '').localeCompare(a.fechamento || ''))[0];
  moneyModal('Abrir caixa', [{ k: 'saldo', label: 'Saldo inicial em dinheiro (R$)', type: 'money', req: true, span: 6, hint: last ? `Último informado no fechamento: ${money(last.saldoInformado)}` : '' }], v => { Store.save('caixas', { abertura: todayStr(), hora: nowTime(), saldoInicial: r2(v.saldo), status: 'aberto', abertoPor: Auth.user.id }); toast('Caixa aberto'); }, { saldo: last ? last.saldoInformado : 0 });
};
ACT['cx:in'] = () => moneyModal('Registrar entrada', [{ k: 'descricao', label: 'Descrição', req: true, span: 6 }, { k: 'valor', label: 'Valor (R$)', type: 'money', req: true, span: 3, min: 0.01 }, { k: 'forma', label: 'Forma', type: 'select', options: FORMAS, blank: false, span: 3 }], v => { ensureCaixa(v.forma); addLedger({ tipo: 'entrada', natureza: 'receita', origem: 'manual', forma: v.forma, valor: v.valor, descricao: v.descricao }); toast('Entrada registrada'); }, { forma: 'dinheiro' });
ACT['cx:out'] = () => moneyModal('Registrar saída / despesa', [{ k: 'descricao', label: 'Descrição', req: true, span: 6 }, { k: 'categoria', label: 'Categoria', type: 'select', options: DESPESA_CATS, blank: false, span: 2 }, { k: 'valor', label: 'Valor (R$)', type: 'money', req: true, span: 2, min: 0.01 }, { k: 'forma', label: 'Forma', type: 'select', options: FORMAS, blank: false, span: 2 }], v => { ensureCaixa(v.forma, 'saida'); addLedger({ tipo: 'saida', natureza: 'despesa', origem: 'manual', forma: v.forma, valor: v.valor, descricao: v.descricao, categoria: v.categoria }); toast('Saída registrada'); }, { forma: 'dinheiro' });
ACT['cx:reforco'] = () => moneyModal('Reforço de caixa', [{ k: 'valor', label: 'Valor (R$)', type: 'money', req: true, min: 0.01, span: 6 }, { k: 'descricao', label: 'Motivo', span: 6 }], v => { ensureCaixa('dinheiro'); addLedger({ tipo: 'entrada', natureza: 'movimento', origem: 'reforco', forma: 'dinheiro', valor: v.valor, descricao: v.descricao || 'Reforço de caixa' }); toast('Reforço registrado'); });
ACT['cx:sangria'] = () => { const S = cashSummary(openCaixa()); moneyModal('Sangria de caixa', [{ k: 'valor', label: 'Valor retirado (R$)', type: 'money', req: true, min: 0.01, span: 6, hint: `Dinheiro esperado em caixa: ${money(S.esperado)}` }, { k: 'descricao', label: 'Motivo / destino', span: 6 }], v => { if (v.valor > S.esperado + 0.004) throw new UserError('A sangria é maior que o dinheiro esperado em caixa.'); ensureCaixa('dinheiro', 'saida'); addLedger({ tipo: 'saida', natureza: 'movimento', origem: 'sangria', forma: 'dinheiro', valor: v.valor, descricao: v.descricao || 'Sangria de caixa' }); toast('Sangria registrada'); }); };
ACT['cx:close'] = () => {
  const cx = openCaixa(); const S = cashSummary(cx);
  Modal.open({
    title: 'Fechamento e conferência do caixa', html: `<div class="totals"><div class="row"><span>Saldo inicial</span><b>${money(cx.saldoInicial)}</b></div><div class="row"><span>Recebido em dinheiro</span><b>${money(S.dinheiro)}</b></div><div class="row"><span>Reforços</span><b>${money(S.reforcos)}</b></div><div class="row"><span>Saídas / sangrias em dinheiro</span><b>− ${money(S.saiDin)}</b></div><div class="row big"><span>Saldo esperado em dinheiro</span><b>${money(S.esperado)}</b></div><div class="row"><span>PIX · Cartões · Outros (não entram na gaveta)</span><b>${money(S.pix)} · ${money(S.cartoes)} · ${money(S.outros)}</b></div></div>
    <div class="fgrid mt"><div class="fld" style="--span:3"><label>Saldo informado (contagem) <b>*</b></label><input class="input" type="number" step="0.01" min="0" id="inf" placeholder="0,00"></div><div class="fld" style="--span:3"><label>Diferença</label><input class="input" id="dif" readonly></div><div class="fld" style="--span:6"><label>Observações</label><textarea class="input" id="obsf" rows="2"></textarea></div></div>`,
    onOpen: api => { const upd = () => { const v = $('#inf', api.el).value; const d = r2(num(v) - S.esperado); const e = $('#dif', api.el); e.value = v === '' ? '' : (d === 0 ? 'Caixa confere ✔' : money(d) + (d < 0 ? ' (falta)' : ' (sobra)')); e.className = 'input ' + (d < 0 ? 'neg' : d > 0 ? 'pos' : ''); }; $('#inf', api.el).oninput = upd; },
    buttons: [{ label: 'Cancelar', cls: 'ghost' }, { label: `${ic('lock', 16)} Fechar caixa`, cls: 'gold', onClick: api => { const v = $('#inf', api.el).value; if (v === '' || num(v) < 0) { $('#inf', api.el).classList.add('invalid'); throw new UserError('Informe o saldo contado.'); } Store.save('caixas', { ...cx, status: 'fechado', fechamento: new Date().toISOString(), fechadoPor: Auth.user.id, saldoEsperado: S.esperado, saldoInformado: r2(v), diferenca: r2(num(v) - S.esperado), obsFechamento: $('#obsf', api.el).value.trim(), totais: { dinheiro: S.dinheiro, pix: S.pix, cartoes: S.cartoes, outros: S.outros, saidas: S.saidas } }); toast('Caixa fechado'); } }]
  });
};
ACT['cx:hist'] = d => { const cx = Store.get('caixas', d.id); const S = cashSummary(cx); Modal.open({ title: `Caixa de ${fmtDate(cx.abertura)}`, size: 'lg', html: `<div class="chips"><span class="badge silver">Dinheiro ${money(S.dinheiro)}</span><span class="badge silver">PIX ${money(S.pix)}</span><span class="badge silver">Cartões ${money(S.cartoes)}</span><span class="badge silver">Saídas ${money(S.saidas)}</span></div>` + table([{ h: 'Hora', c: l => esc(l.hora) }, { h: 'Tipo', c: l => l.tipo }, { h: 'Forma', c: l => esc(formaLabel(l.forma)) }, { h: 'Descrição', c: l => esc(l.descricao) }, { h: 'Valor', cls: 'num', c: l => (l.tipo === 'entrada' ? '+ ' : '− ') + money(l.valor) }], S.lista, 'Sem movimentações.'), buttons: [{ label: 'Fechar', cls: 'gold' }] }); };

/* ================= CONTAS A PAGAR ================= */
Pages.pagar = listPage({
  key: 'pg', title: 'Contas a pagar', sub: 'Despesas da loja com alertas automáticos de vencimento', newLabel: 'Nova conta',
  state: { st: 'abertas', cat: '' },
  filters: [{ k: 'st', options: [['abertas', 'Em aberto (pendentes + vencidas)'], ['vencido', 'Vencidas'], ['pago', 'Pagas'], ['cancelado', 'Canceladas'], ['', 'Todas']] }, { k: 'cat', options: selOpts(DESPESA_CATS, 'Todas as categorias') }],
  rows: () => Store.all('payables'), text: p => [p.descricao, p.fornecedor, p.categoria].join(' '), sort: (a, b) => a.vencimento.localeCompare(b.vencimento),
  pass: (p, f) => (!f.cat || p.categoria === f.cat) && (!f.st || (f.st === 'abertas' ? ['pendente', 'vencido'].includes(payStatus(p)) : payStatus(p) === f.st)),
  rowCls: p => payStatus(p) === 'vencido' ? 'row-late' : '',
  summary: () => { const all = Store.all('payables'), t = todayStr(); const pend = all.filter(p => p.status === 'pendente'); const m = t.slice(0, 7); return `<div class="mini-kpis"><div><span>Pendente</span><b>${money(sum(pend, p => p.valor))}</b></div><div class="late"><span>Vencidas</span><b>${money(sum(pend.filter(p => p.vencimento < t), p => p.valor))}</b></div><div class="soon"><span>Vencem em 7 dias</span><b>${money(sum(pend.filter(p => p.vencimento >= t && p.vencimento <= addDays(t, 7)), p => p.valor))}</b></div><div><span>Pagas no mês</span><b>${money(sum(all.filter(p => p.status === 'pago' && (p.pagamento || '').startsWith(m)), p => p.valorPago || p.valor))}</b></div></div>`; },
  cols: [{ h: 'Vencimento', c: p => { const d = diffDays(p.vencimento, todayStr()); return `${fmtDate(p.vencimento)}${p.status === 'pendente' ? `<small class="sub">${d < 0 ? `há ${-d} dia(s)` : d === 0 ? 'hoje' : `em ${d} dia(s)`}</small>` : ''}`; } }, { h: 'Descrição', c: p => `<b>${esc(p.descricao)}</b>${p.fornecedor ? `<small class="sub">${esc(p.fornecedor)}</small>` : ''}` }, { h: 'Categoria', c: p => esc(p.categoria) }, { h: 'Valor', cls: 'num', c: p => money(p.valor) }, { h: 'Pagamento', c: p => p.status === 'pago' ? `${fmtDate(p.pagamento)}<small class="sub">${esc(formaLabel(p.forma))}</small>` : '—' }, { h: 'Status', c: p => badge(...PAY_BADGE[payStatus(p)]) }],
  actions: p => `${['pendente'].includes(p.status) ? `<button class="btn sm gold" data-act="pg:pay" data-id="${p.id}">${ic('check', 14)} Pagar</button>` : ''}${cmpLink(p.comprovante)}${p.status === 'pago' ? iconBtn('pg:reopen', p.id, 'undo', 'Desfazer pagamento') : ''}${p.status === 'pendente' ? iconBtn('pg:cancel', p.id, 'x', 'Cancelar conta') : ''}${p.status !== 'pago' ? iconBtn('pg:edit', p.id, 'edit', 'Editar') : ''}${iconBtn('pg:del', p.id, 'trash', 'Excluir', 'danger')}`,
  empty: 'Nenhuma conta encontrada.'
});
ACT['pg:new'] = () => payableModal(); ACT['pg:edit'] = d => payableModal(d.id);
function payableModal(id) {
  const p = id ? Store.get('payables', id) : null; const hold = { v: p ? p.comprovante : '' };
  const F = [{ k: 'descricao', label: 'Descrição', req: true, span: 4 }, { k: 'categoria', label: 'Categoria', type: 'select', options: DESPESA_CATS, blank: false, span: 2 }, { k: 'fornecedor', label: 'Fornecedor / beneficiário', span: 3, list: 'dl-forn' }, { k: 'valor', label: 'Valor (R$)', type: 'money', req: true, min: 0.01, span: 1 }, { k: 'vencimento', label: 'Vencimento', type: 'date', req: true, span: 2 },
    ...(p ? [] : [{ k: 'repetir', label: 'Repetir mensalmente por mais (meses)', type: 'number', min: 0, maxv: 60, span: 3, hint: 'Ex.: aluguel, internet, salários' }]), { k: 'obs', label: 'Observações', type: 'textarea', rows: 2, span: 6 }, { html: fileField() }];
  const forn = [...new Set(Store.all('payables').map(x => x.fornecedor).filter(Boolean))];
  Modal.open({
    title: p ? 'Editar conta' : 'Nova conta a pagar', size: 'lg', html: `<datalist id="dl-forn">${forn.map(f => `<option value="${esc(f)}">`).join('')}</datalist>` + Form.html(F, p || { categoria: DESPESA_CATS[0], repetir: 0 }), onOpen: api => bindFile(api, hold),
    buttons: [{ label: 'Cancelar', cls: 'ghost' }, {
      label: `${ic('check', 16)} Salvar`, cls: 'gold', onClick: api => {
        const v = Form.read(api.body, F); if (!v) return false; const base = { descricao: v.descricao, categoria: v.categoria, fornecedor: v.fornecedor, valor: r2(v.valor), obs: v.obs, comprovante: hold.v || '' };
        if (p) Store.save('payables', { ...p, ...base, vencimento: v.vencimento });
        else for (let i = 0; i <= num(v.repetir); i++) { const dt = parseD(v.vencimento); dt.setMonth(dt.getMonth() + i); Store.save('payables', { ...base, descricao: v.repetir > 0 ? `${v.descricao} (${i + 1}/${v.repetir + 1})` : v.descricao, vencimento: ymd(dt), status: 'pendente' }); }
        toast('Conta salva');
      }
    }]
  });
}
ACT['pg:pay'] = d => {
  const p = Store.get('payables', d.id); const hold = { v: '' };
  const F = [{ k: 'data', label: 'Data do pagamento', type: 'date', req: true, span: 3 }, { k: 'forma', label: 'Forma de pagamento', type: 'select', options: FORMAS, blank: false, span: 3 }, { k: 'valor', label: 'Valor pago (R$)', type: 'money', req: true, min: 0.01, span: 3 }, { html: '<div class="fld" style="--span:3"></div>' }, { html: fileField('Anexar comprovante (opcional)') }];
  Modal.open({ title: `Pagar — ${esc(p.descricao)}`, html: Form.html(F, { data: todayStr(), forma: 'pix', valor: p.valor }), onOpen: api => bindFile(api, hold), buttons: [{ label: 'Cancelar', cls: 'ghost' }, { label: `${ic('check', 16)} Confirmar pagamento`, cls: 'gold', onClick: api => { const v = Form.read(api.body, F); if (!v) return false; payPayable(d.id, { ...v, comprovante: hold.v }); toast('Conta paga — financeiro atualizado'); } }] });
};
ACT['pg:reopen'] = async d => { if (await confirmBox('Desfazer o pagamento? O lançamento de saída será removido do caixa.', { ok: 'Desfazer' })) { reopenPayable(d.id); toast('Pagamento desfeito'); } };
ACT['pg:cancel'] = async d => { if (await confirmBox('Cancelar esta conta?', { ok: 'Cancelar conta', danger: true })) { Store.save('payables', { ...Store.get('payables', d.id), status: 'cancelado' }); toast('Conta cancelada'); } };
ACT['pg:del'] = async d => { const p = Store.get('payables', d.id); if (p.status === 'pago') throw new UserError('Conta paga: desfaça o pagamento antes de excluir.'); if (await confirmBox(`Excluir <b>${esc(p.descricao)}</b>?`, { ok: 'Excluir', danger: true })) { Store.remove('payables', d.id); toast('Conta excluída'); } };

/* ================= CONTAS A RECEBER ================= */
Pages.receber = listPage({
  key: 'rc', title: 'Contas a receber', sub: 'Parcelas, sinais, saldos de contratos e atrasos', newLabel: 'Nova conta',
  state: { st: 'abertas' }, filters: [{ k: 'st', options: [['abertas', 'Em aberto'], ['vencido', 'Atrasadas'], ['recebido', 'Recebidas (histórico)'], ['cancelado', 'Canceladas'], ['', 'Todas']] }, { k: 'og', options: [['', 'Todas as origens'], ['venda', 'Vendas'], ['aluguel', 'Aluguéis'], ['manual', 'Manuais']] }],
  rows: () => Store.all('receivables'), text: r => [r.descricao, custName(r.customerId)].join(' '), sort: (a, b) => a.status === 'recebido' ? (b.dataRecebimento || '').localeCompare(a.dataRecebimento || '') : a.vencimento.localeCompare(b.vencimento),
  pass: (r, f) => (!f.og || r.origem === f.og) && (!f.st || (f.st === 'abertas' ? r.status === 'pendente' : recStatus(r) === f.st)),
  rowCls: r => recStatus(r) === 'vencido' ? 'row-late' : '',
  summary: () => { const all = Store.all('receivables'), t = todayStr(), pend = all.filter(r => r.status === 'pendente'); return `<div class="mini-kpis"><div><span>A receber</span><b>${money(sum(pend, r => r.valor))}</b></div><div class="late"><span>Atrasado</span><b>${money(sum(pend.filter(r => r.vencimento < t), r => r.valor))}</b></div><div><span>Recebido no mês</span><b>${money(sum(all.filter(r => r.status === 'recebido' && (r.dataRecebimento || '').startsWith(t.slice(0, 7))), r => r.valor))}</b></div></div>`; },
  cols: [{ h: 'Vencimento', c: r => fmtDate(r.vencimento) }, { h: 'Cliente', c: r => esc(custName(r.customerId)) }, { h: 'Descrição', c: r => esc(r.descricao) }, { h: 'Valor', cls: 'num', c: r => money(r.valor) }, { h: 'Recebimento', c: r => r.status === 'recebido' ? `${fmtDate(r.dataRecebimento)}<small class="sub">${esc(formaLabel(r.forma))}</small>` : '—' }, { h: 'Status', c: r => badge(...PAY_BADGE[recStatus(r)]) }],
  actions: r => { const c = Store.get('customers', r.customerId); return `${r.status === 'pendente' ? `<button class="btn sm gold" data-act="rc:recv" data-id="${r.id}">${ic('check', 14)} Receber</button>` : ''}${r.status === 'pendente' && c && (c.whats || c.tel) ? `<a class="icon-btn" target="_blank" rel="noopener" title="Cobrar por WhatsApp" href="${waLink(c.whats || c.tel, `Olá ${c.nome.split(' ')[0]}, tudo bem? Aqui é da ${cfg().loja}. Identificamos um valor de ${money(r.valor)} (${r.descricao}) com vencimento em ${fmtDate(r.vencimento)}. Podemos ajudar com o pagamento?`)}">${ic('chat', 16)}</a>` : ''}${r.status === 'pendente' && r.origem === 'manual' ? iconBtn('rc:edit', r.id, 'edit', 'Editar') : ''}${r.status === 'pendente' ? iconBtn('rc:cancel', r.id, 'x', 'Cancelar') : ''}${r.origem === 'manual' && r.status !== 'recebido' ? iconBtn('rc:del', r.id, 'trash', 'Excluir', 'danger') : ''}`; },
  empty: 'Nenhuma conta a receber.'
});
function receiveModal(id) {
  const r = Store.get('receivables', id);
  const F = [{ k: 'data', label: 'Data do recebimento', type: 'date', req: true, span: 3 }, { k: 'forma', label: 'Forma', type: 'select', options: FORMAS, blank: false, span: 3 }, { k: 'valor', label: 'Valor recebido (R$)', type: 'money', req: true, min: 0.01, span: 6, hint: 'Valor menor que o saldo gera uma nova conta com o restante.' }];
  Modal.open({ title: `Receber — ${esc(r.descricao)}`, size: 'sm', html: `<p class="muted">${esc(custName(r.customerId))} · saldo ${money(r.valor)}</p>` + Form.html(F, { data: todayStr(), forma: 'pix', valor: r.valor }), buttons: [{ label: 'Cancelar', cls: 'ghost' }, { label: `${ic('check', 16)} Confirmar`, cls: 'gold', onClick: api => { const v = Form.read(api.body, F); if (!v) return false; receiveReceivable(id, v); toast('Recebimento registrado'); } }] });
}
ACT['rc:recv'] = d => receiveModal(d.id);
ACT['rc:new'] = () => recModal(); ACT['rc:edit'] = d => recModal(d.id);
function recModal(id) {
  const r = id ? Store.get('receivables', id) : null;
  const F = [{ k: 'customerId', label: 'Cliente', type: 'select', options: custOptions(), req: true, span: 3 }, { k: 'descricao', label: 'Descrição', req: true, span: 3 }, { k: 'valor', label: 'Valor (R$)', type: 'money', req: true, min: 0.01, span: 3 }, { k: 'vencimento', label: 'Vencimento', type: 'date', req: true, span: 3 }];
  Modal.open({ title: r ? 'Editar conta a receber' : 'Nova conta a receber', html: Form.html(F, r || {}), buttons: [{ label: 'Cancelar', cls: 'ghost' }, { label: 'Salvar', cls: 'gold', onClick: api => { const v = Form.read(api.body, F); if (!v) return false; Store.save('receivables', { ...(r || { status: 'pendente', origem: 'manual' }), ...v, valor: r2(v.valor) }); toast('Conta salva'); } }] });
}
ACT['rc:cancel'] = async d => { if (await confirmBox('Cancelar esta conta a receber?', { ok: 'Cancelar conta', danger: true })) { Store.save('receivables', { ...Store.get('receivables', d.id), status: 'cancelado' }); toast('Conta cancelada'); } };
ACT['rc:del'] = async d => { if (await confirmBox('Excluir esta conta?', { ok: 'Excluir', danger: true })) { Store.remove('receivables', d.id); toast('Conta excluída'); } };

/* ================= AGENDA ================= */
const AG_TIPOS = ['Prova de vestido', 'Prova de terno', 'Ajuste', 'Retirada', 'Devolução', 'Atendimento', 'Casamento / Evento', 'Outro'];
function agendaEvents(ds) {
  const ev = [];
  Store.all('appointments').filter(a => a.data === ds && a.status !== 'cancelado').forEach(a => ev.push({ k: 'appt', id: a.id, hora: a.hora || '', t: a.titulo || a.tipo, s: a.customerId ? custName(a.customerId) : a.tipo, cls: a.status === 'concluido' ? 'done' : 'appt' }));
  Store.all('rentals').filter(r => r.status === 'reservado' || r.status === 'retirado').forEach(r => {
    if (r.status === 'reservado' && r.retirada === ds) ev.push({ k: 'rent', id: r.id, hora: '', t: `Retirada #${r.num}`, s: rentalCustomer(r), cls: 'ret' });
    if (r.devolucao === ds) ev.push({ k: 'rent', id: r.id, hora: '', t: `Devolução #${r.num}`, s: rentalCustomer(r), cls: 'dev' });
    if (r.evento === ds) ev.push({ k: 'rent', id: r.id, hora: '', t: `Evento — ${rentalCustomer(r).split(' ')[0]}`, s: `Aluguel #${r.num}`, cls: 'evt' });
  });
  return ev.sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
}
Pages.agenda = {
  title: 'Agenda',
  render(el) {
    const s = PS.ag = PS.ag || { view: 'month', date: todayStr() }; const d = parseD(s.date); let title, body = '';
    const chip = (e, ds) => `<div class="chip-ev ${e.cls}" data-act="ag:open" data-k="${e.k}" data-id="${e.id}" title="${esc(e.t)} — ${esc(e.s)}">${e.hora ? `<b>${esc(e.hora)}</b> ` : ''}${esc(e.t)}</div>`;
    if (s.view === 'month') {
      title = `${MESES[d.getMonth()]} de ${d.getFullYear()}`; const first = new Date(d.getFullYear(), d.getMonth(), 1), dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), off = first.getDay(), tot = Math.ceil((off + dim) / 7) * 7; let cells = '';
      for (let i = 0; i < tot; i++) { const dn = i - off + 1; if (dn < 1 || dn > dim) { cells += '<div class="cal-c out"></div>'; continue; } const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(dn)}`; const ev = agendaEvents(ds); cells += `<div class="cal-c ${ds === todayStr() ? 'today' : ''}"><a class="dn" data-act="ag:day" data-d="${ds}">${dn}</a>${ev.slice(0, 3).map(e => chip(e, ds)).join('')}${ev.length > 3 ? `<a class="more" data-act="ag:day" data-d="${ds}">+${ev.length - 3}</a>` : ''}</div>`; }
      body = `<div class="cal-g">${DIAS.map(x => `<div class="cal-w">${x}</div>`).join('')}${cells}</div>`;
    } else if (s.view === 'week') {
      const st = new Date(d); st.setDate(d.getDate() - d.getDay()); const days = [...Array(7)].map((_, i) => { const x = new Date(st); x.setDate(st.getDate() + i); return ymd(x); }); title = `Semana de ${fmtDate(days[0])} a ${fmtDate(days[6])}`;
      body = `<div class="week-g">${days.map(ds => `<div class="week-c ${ds === todayStr() ? 'today' : ''}"><a class="wh" data-act="ag:day" data-d="${ds}">${DIAS[parseD(ds).getDay()]} <b>${ds.slice(8)}</b></a>${agendaEvents(ds).map(e => chip(e, ds)).join('') || '<small class="muted">—</small>'}</div>`).join('')}</div>`;
    } else {
      title = `${DIAS[d.getDay()]}, ${fmtDate(s.date)}`; const ev = agendaEvents(s.date);
      body = `<div class="day-list">${ev.map(e => `<div class="day-ev ${e.cls}" data-act="ag:open" data-k="${e.k}" data-id="${e.id}"><span class="h">${esc(e.hora || 'dia todo')}</span><div><b>${esc(e.t)}</b><small>${esc(e.s)}</small></div></div>`).join('') || `<div class="empty small">${ic('calendar', 26)}<p>Nenhum compromisso neste dia.</p></div>`}</div>`;
    }
    el.innerHTML = `<div class="page-h"><div><h1>Agenda</h1><p>Provas, ajustes, retiradas, devoluções e eventos</p></div><div class="page-actions"><button class="btn gold" data-act="ag:new">${ic('plus')}<span>Novo compromisso</span></button></div></div>
    <div class="card"><div class="cal-h"><button class="icon-btn" data-act="ag:nav" data-dir="-1">${ic('chevL')}</button><h3>${title}</h3><button class="icon-btn" data-act="ag:nav" data-dir="1">${ic('chevR')}</button><button class="btn sm ghost" data-act="ag:nav" data-dir="0">Hoje</button><div class="seg">${[['month', 'Mês'], ['week', 'Semana'], ['day', 'Dia']].map(([v, l]) => `<button class="${s.view === v ? 'on' : ''}" data-act="ag:view" data-v="${v}">${l}</button>`).join('')}</div></div>${body}
    <div class="legend cal-lg"><span><i class="c-appt"></i>Compromisso</span><span><i class="c-ret"></i>Retirada</span><span><i class="c-dev"></i>Devolução</span><span><i class="c-evt"></i>Evento</span><span><i class="c-done"></i>Concluído</span></div></div>`;
  },
  refresh() { this.render($('#view')); }
};
ACT['ag:view'] = d => { PS.ag.view = d.v; Pages.agenda.render($('#view')); };
ACT['ag:day'] = d => { PS.ag.view = 'day'; PS.ag.date = d.d; Pages.agenda.render($('#view')); };
ACT['ag:nav'] = d => { const s = PS.ag; const dir = +d.dir; if (!dir) s.date = todayStr(); else { const x = parseD(s.date); if (s.view === 'month') x.setMonth(x.getMonth() + dir, 1); else x.setDate(x.getDate() + dir * (s.view === 'week' ? 7 : 1)); s.date = ymd(x); } Pages.agenda.render($('#view')); };
ACT['ag:new'] = () => apptModal(null, { data: PS.ag ? PS.ag.date : todayStr() });
ACT['ag:open'] = d => d.k === 'rent' ? rentalView(d.id) : apptModal(d.id);
function apptModal(id, pre = {}) {
  const a = id ? Store.get('appointments', id) : null; const cu = () => optList(selOpts(custOptions(), 'Sem cliente')).map(o => `<option value="${esc(o.v)}">${esc(o.l)}</option>`).join('');
  const F = [{ k: 'tipo', label: 'Tipo', type: 'select', options: AG_TIPOS, blank: false, span: 3 }, { k: 'titulo', label: 'Título (opcional)', span: 3 },
  { html: `<div class="fld" style="--span:6"><label>Cliente</label><div class="inline"><select class="input" name="customerId">${cu()}</select><button type="button" class="btn sm" id="nc">${ic('plus', 14)} Novo</button></div></div>` },
  { k: 'data', label: 'Data', type: 'date', req: true, span: 2 }, { k: 'hora', label: 'Horário', type: 'time', req: true, span: 2 }, { k: 'duracao', label: 'Duração (min)', type: 'number', min: 5, span: 2, def: 60 },
  { k: 'status', label: 'Situação', type: 'select', options: [['agendado', 'Agendado'], ['concluido', 'Concluído'], ['cancelado', 'Cancelado']], blank: false, span: 3 }, { k: 'obs', label: 'Observações', type: 'textarea', rows: 2, span: 6 }];
  const btns = [{ label: 'Cancelar', cls: 'ghost' }];
  if (a) btns.unshift({ label: 'Excluir', cls: 'danger', onClick: async () => { if (!(await confirmBox('Excluir este compromisso?', { ok: 'Excluir', danger: true }))) return false; Store.remove('appointments', a.id); toast('Compromisso excluído'); } });
  btns.push({ label: `${ic('check', 16)} Salvar`, cls: 'gold', onClick: api => { const v = Form.read(api.body, F); if (!v) return false; Store.save('appointments', { ...(a || {}), ...v }); toast('Compromisso salvo'); } });
  Modal.open({ title: a ? 'Editar compromisso' : 'Novo compromisso', html: Form.html(F, a || { tipo: 'Prova de vestido', status: 'agendado', duracao: 60, hora: '10:00', data: todayStr(), ...pre }), buttons: btns, onOpen: api => { const s = $('[name=customerId]', api.el); s.value = (a && a.customerId) || pre.customerId || ''; $('#nc', api.el).onclick = () => customerModal(null, c => { s.innerHTML = cu(); s.value = c.id; }); } });
}
