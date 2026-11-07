/* ===== Relatórios, Usuários, Notificações, Configurações ===== */

/* ================= RELATÓRIOS ================= */
const inP = (d, f, t) => d && d >= f && d <= t;
const grp = (arr, keyf) => { const m = new Map(); arr.forEach(x => { const k = keyf(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return [...m.entries()]; };
const REPORTS = {
  resumo: ['Resumo financeiro', (f, t) => {
    const L = Store.all('ledger').filter(l => inP(l.data, f, t)), S = periodSales(f, t), A = Store.all('rentals').filter(r => r.status !== 'cancelado' && inP(r.retirada, f, t));
    const rec = ledgerRec(L), desp = ledgerDesp(L), c = cmv(S);
    return { cols: ['Indicador', 'Valor'], rows: [['Faturamento (recebido)', money(rec)], ['  • de vendas', money(ledgerRec(L.filter(l => l.origem === 'venda')))], ['  • de aluguéis', money(ledgerRec(L.filter(l => l.origem === 'aluguel')))], ['  • outras entradas', money(ledgerRec(L.filter(l => !['venda', 'aluguel'].includes(l.origem))))], ['Despesas pagas', money(desp)], ['Custo das peças vendidas', money(c)], ['Lucro estimado', money(rec - desp - c)], ['Vendas realizadas', S.length], ['Ticket médio das vendas', money(S.length ? sum(S, s => s.total) / S.length : 0)], ['Aluguéis (retiradas no período)', A.length], ['Valor contratado em aluguéis', money(sum(A, r => r.total))]] };
  }],
  vendas: ['Vendas realizadas', (f, t) => { const S = Store.all('sales').filter(s => inP(s.data, f, t)).sort((a, b) => a.data.localeCompare(b.data)); return { cols: ['Nº', 'Data', 'Cliente', 'Vendedor', 'Itens', 'Pagamento', 'Desconto', 'Total', 'Situação'], rows: S.map(s => [s.num, fmtDate(s.data), custName(s.customerId), userName(s.vendedorId), (s.itens || []).map(l => l.nome).join('; '), s.forma === 'crediario' ? 'Crediário' : formaLabel(s.forma), money(s.desconto), money(s.total), s.status === 'concluida' ? 'Concluída' : 'Cancelada']), foot: ['TOTAL (concluídas)', '', '', '', '', '', '', money(sum(S.filter(s => s.status === 'concluida'), s => s.total)), '']  }; }],
  alugueis: ['Aluguéis realizados', (f, t) => { const R = Store.all('rentals').filter(r => inP(r.retirada, f, t)).sort((a, b) => a.retirada.localeCompare(b.retirada)); return { cols: ['Nº', 'Cliente', 'Peças', 'Retirada', 'Evento', 'Devolução', 'Total', 'Pago', 'Saldo', 'Situação'], rows: R.map(r => [r.num, custName(r.customerId), (r.itemIds || []).map(i => itemLabel(Store.get('items', i) || {})).join('; '), fmtDate(r.retirada), fmtDate(r.evento), fmtDate(r.devolucao), money(r.total), money(rentalPaid(r)), money(rentalSaldo(r)), RENT_BADGE[rentalState(r)][0]]), foot: ['TOTAL', '', '', '', '', '', money(sum(R.filter(r => r.status !== 'cancelado'), r => r.total)), money(sum(R.filter(r => r.status !== 'cancelado'), r => rentalPaid(r))), '', ''] }; }],
  faturamento: ['Faturamento por origem e forma de pagamento', (f, t) => { const L = Store.all('ledger').filter(l => inP(l.data, f, t) && (l.natureza === 'receita' || l.natureza === 'estorno')); const g = grp(L, l => `${l.origem}|${l.forma}`).map(([k, a]) => { const [o, fm] = k.split('|'); return [({ venda: 'Vendas', aluguel: 'Aluguéis', manual: 'Entradas manuais', receber: 'Recebimentos' })[o] || o, formaLabel(fm), a.length, r2(ledgerRec(a))]; }); return { cols: ['Origem', 'Forma de pagamento', 'Lançamentos', 'Valor líquido'], rows: g.map(r => [r[0], r[1], r[2], money(r[3])]), foot: ['TOTAL', '', g.reduce((a, r) => a + r[2], 0), money(sum(g, r => r[3]))] }; }],
  despesas: ['Despesas por categoria', (f, t) => { const L = Store.all('ledger').filter(l => l.natureza === 'despesa' && inP(l.data, f, t)); const g = grp(L, l => l.categoria || 'Sem categoria').map(([k, a]) => [k, a.length, sum(a, x => x.valor)]).sort((a, b) => b[2] - a[2]); return { cols: ['Categoria', 'Lançamentos', 'Total'], rows: g.map(r => [r[0], r[1], money(r[2])]), foot: ['TOTAL', g.reduce((a, r) => a + r[1], 0), money(sum(g, r => r[2]))] }; }],
  pagas: ['Contas pagas', (f, t) => { const P = Store.all('payables').filter(p => p.status === 'pago' && inP(p.pagamento, f, t)).sort((a, b) => a.pagamento.localeCompare(b.pagamento)); return { cols: ['Pagamento', 'Vencimento', 'Descrição', 'Categoria', 'Fornecedor', 'Forma', 'Valor'], rows: P.map(p => [fmtDate(p.pagamento), fmtDate(p.vencimento), p.descricao, p.categoria, p.fornecedor || '', formaLabel(p.forma), money(p.valorPago || p.valor)]), foot: ['TOTAL', '', '', '', '', '', money(sum(P, p => p.valorPago || p.valor))] }; }],
  pendentes: ['Contas pendentes (por vencimento)', (f, t) => { const P = Store.all('payables').filter(p => p.status === 'pendente' && inP(p.vencimento, f, t)).sort((a, b) => a.vencimento.localeCompare(b.vencimento)); return { cols: ['Vencimento', 'Descrição', 'Categoria', 'Fornecedor', 'Situação', 'Valor'], rows: P.map(p => [fmtDate(p.vencimento), p.descricao, p.categoria, p.fornecedor || '', payStatus(p) === 'vencido' ? 'Vencida' : 'A vencer', money(p.valor)]), foot: ['TOTAL', '', '', '', '', money(sum(P, p => p.valor))] }; }],
  maisVendidos: ['Produtos mais vendidos', (f, t) => { const lines = periodSales(f, t).flatMap(s => s.itens || []); const g = grp(lines, l => { const it = l.itemId && Store.get('items', l.itemId); const p = it && prodOf(it); return p ? p.nome : l.nome; }).map(([k, a]) => [k, a.length, sum(a, x => x.preco)]).sort((a, b) => b[1] - a[1] || b[2] - a[2]); return { cols: ['Produto', 'Qtd vendida', 'Valor vendido'], rows: g.map(r => [r[0], r[1], money(r[2])]) }; }],
  maisAlugados: ['Vestidos / trajes mais alugados', (f, t) => { const lines = Store.all('rentals').filter(r => r.status !== 'cancelado' && inP(r.retirada, f, t)).flatMap(r => r.itens || []); const g = grp(lines, l => { const it = Store.get('items', l.itemId); const p = it && prodOf(it); return p ? p.nome : '(removido)'; }).map(([k, a]) => [k, a.length, sum(a, x => x.valor)]).sort((a, b) => b[1] - a[1] || b[2] - a[2]); return { cols: ['Produto', 'Vezes alugado', 'Valor locado'], rows: g.map(r => [r[0], r[1], money(r[2])]) }; }],
  vendedores: ['Desempenho dos vendedores', (f, t) => { const S = periodSales(f, t), R = Store.all('rentals').filter(r => r.status !== 'cancelado' && inP(r.retirada, f, t)); const rows = Store.all('users').map(u => { const s = S.filter(x => x.vendedorId === u.id), r = R.filter(x => x.vendedorId === u.id); return [u.nome, s.length, sum(s, x => x.total), r.length, sum(r, x => x.total), sum(s, x => x.total) + sum(r, x => x.total)]; }).filter(r => r[1] || r[3]).sort((a, b) => b[5] - a[5]); return { cols: ['Vendedor', 'Vendas', 'Valor vendido', 'Aluguéis', 'Valor alugado', 'Total geral'], rows: rows.map(r => [r[0], r[1], money(r[2]), r[3], money(r[4]), money(r[5])]), foot: ['TOTAL', rows.reduce((a, r) => a + r[1], 0), money(sum(rows, r => r[2])), rows.reduce((a, r) => a + r[3], 0), money(sum(rows, r => r[4])), money(sum(rows, r => r[5]))] }; }],
  fluxo: ['Fluxo de caixa diário', (f, t) => { const L = Store.all('ledger').filter(l => inP(l.data, f, t) && l.natureza !== 'movimento'); const days = [...new Set(L.map(l => l.data))].sort(); let acc = 0; const rows = days.map(d => { const x = L.filter(l => l.data === d); const e = ledgerRec(x), s = ledgerDesp(x); acc += e - s; return [fmtDate(d), money(e), money(s), money(e - s), money(acc)]; }); const all = L; return { cols: ['Data', 'Entradas', 'Saídas', 'Saldo do dia', 'Acumulado'], rows, foot: ['TOTAL', money(ledgerRec(all)), money(ledgerDesp(all)), money(ledgerRec(all) - ledgerDesp(all)), ''] }; }]
};
const REP_PERIOD = { hoje: () => [todayStr(), todayStr()], '7': () => [addDays(todayStr(), -6), todayStr()], mes: () => [todayStr().slice(0, 8) + '01', todayStr()], ant: () => { const d = new Date(); const a = new Date(d.getFullYear(), d.getMonth() - 1, 1), b = new Date(d.getFullYear(), d.getMonth(), 0); return [ymd(a), ymd(b)]; }, ano: () => [todayStr().slice(0, 4) + '-01-01', todayStr()], tudo: () => ['2000-01-01', '2999-12-31'] };
const isNumCell = v => /^(-?R\$\s|[\d.,%-]+$)/.test(String(v).trim());
Pages.relatorios = {
  title: 'Relatórios',
  data() { const s = PS.rel; const [name, fn] = REPORTS[s.rep]; return { name, ...fn(s.from, s.to) }; },
  render(el) {
    const s = PS.rel = PS.rel || { rep: 'resumo', from: REP_PERIOD.mes()[0], to: todayStr() };
    el.innerHTML = `<div class="page-h"><div><h1>Relatórios gerenciais</h1><p>Filtre por período e exporte em Excel ou PDF</p></div><div class="page-actions"><button class="btn" data-act="rel:xls">${ic('download', 16)} Excel</button><button class="btn gold" data-act="rel:pdf">${ic('print', 16)} PDF / Imprimir</button></div></div>
    <div class="card toolbar wrapx"><select class="input" data-flt="rep">${Object.entries(REPORTS).map(([k, v]) => `<option value="${k}" ${s.rep === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select><label class="inl">De <input class="input" type="date" data-flt="from" value="${s.from}"></label><label class="inl">Até <input class="input" type="date" data-flt="to" value="${s.to}"></label>
    <div class="seg">${[['hoje', 'Hoje'], ['7', '7 dias'], ['mes', 'Mês'], ['ant', 'Mês ant.'], ['ano', 'Ano'], ['tudo', 'Tudo']].map(([k, l]) => `<button data-act="rel:p" data-p="${k}">${l}</button>`).join('')}</div></div><div id="lst"></div>`;
    this.list();
  },
  list() {
    if (!$('#lst')) return; const d = this.data();
    const rows = d.rows.map(r => `<tr>${r.map((c, i) => `<td class="${i && isNumCell(c) ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('');
    $('#lst').innerHTML = `<div class="card nopad"><div class="card-th pad"><h3 class="card-t">${esc(d.name)}</h3><small class="muted">${fmtDate(PS.rel.from)} a ${fmtDate(PS.rel.to)} · ${d.rows.length} linha(s)</small></div>${d.rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${d.cols.map((c, i) => `<th class="${i && d.rows[0] && isNumCell(d.rows[0][i]) ? 'num' : ''}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>${d.foot ? `<tfoot><tr>${d.foot.map((c, i) => `<td class="${i && isNumCell(c) ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr></tfoot>` : ''}</table></div>` : `<div class="empty">${ic('search', 28)}<p>Sem dados no período.</p></div>`}</div>`;
  },
  refresh() { this.list(); },
  onFilter(k, v) { PS.rel[k] = v; if (PS.rel.from > PS.rel.to && (k === 'from' || k === 'to')) return; this.list(); }
};
ACT['rel:p'] = d => { const [f, t] = REP_PERIOD[d.p](); Object.assign(PS.rel, { from: f, to: t }); Pages.relatorios.render($('#view')); };
ACT['rel:xls'] = () => { const d = Pages.relatorios.data(); exportXLS(`relatorio-${PS.rel.rep}-${PS.rel.from}_a_${PS.rel.to}`, d.cols, d.foot ? [...d.rows, d.foot] : d.rows, `${cfg().loja} — ${d.name} (${fmtDate(PS.rel.from)} a ${fmtDate(PS.rel.to)})`); toast('Arquivo Excel gerado'); };
ACT['rel:pdf'] = () => { const d = Pages.relatorios.data(); printHTML(`<div class="print-doc">${printHead()}<h2>${esc(d.name)}</h2><p>Período: ${fmtDate(PS.rel.from)} a ${fmtDate(PS.rel.to)} · emitido em ${fmtDate(todayStr())} por ${esc(Auth.user.nome)}</p><table class="pr-t"><thead><tr>${d.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${d.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>${d.foot ? `<tfoot><tr>${d.foot.map(c => `<th>${esc(c)}</th>`).join('')}</tr></tfoot>` : ''}</table></div>`, `Relatório ${d.name}`); };

/* ================= USUÁRIOS ================= */
Pages.usuarios = listPage({
  key: 'us', title: 'Usuários e permissões', sub: 'Quem acessa o sistema e o que pode fazer', newLabel: 'Novo usuário',
  rows: () => Store.all('users'), text: u => [u.nome, u.login, ROLES[u.perfil]].join(' '), sort: (a, b) => a.nome.localeCompare(b.nome),
  cols: [{ h: 'Usuário', c: u => `<div class="who"><span class="avatar">${esc(initials(u.nome))}</span><div><b>${esc(u.nome)}</b><small class="sub">@${esc(u.login)}</small></div></div>` }, { h: 'Perfil', c: u => badge(ROLES[u.perfil] || u.perfil, u.perfil === 'admin' ? 'gold' : 'silver') }, { h: 'Acessos', c: u => u.perfil === 'admin' ? 'Todos' : (u.permissoes || []).map(p => (MODS.find(m => m[0] === p) || [, p])[1]).join(', ') }, { h: 'Situação', c: u => u.ativo === false ? badge('Inativo', 'muted') : badge('Ativo', 'ok') }],
  actions: u => `${iconBtn('us:edit', u.id, 'edit', 'Editar')}${u.id !== Auth.user.id ? iconBtn('us:del', u.id, 'trash', 'Excluir', 'danger') : ''}`
});
ACT['us:new'] = () => userModal(); ACT['us:edit'] = d => userModal(d.id);
ACT['us:del'] = async d => { const u = Store.get('users', d.id); if (u.perfil === 'admin' && Store.all('users').filter(x => x.perfil === 'admin' && x.ativo !== false).length < 2) throw new UserError('Não é possível excluir o único administrador.'); if (await confirmBox(`Excluir o usuário <b>${esc(u.nome)}</b>?`, { ok: 'Excluir', danger: true })) { Store.remove('users', d.id); toast('Usuário excluído'); } };
function userModal(id) {
  const u = id ? Store.get('users', id) : null;
  const F = [{ k: 'nome', label: 'Nome', req: true, span: 3 }, { k: 'login', label: 'Login (usuário)', req: true, span: 3, ro: !!u, validate: v => /^[a-z0-9._-]{3,20}$/.test(v) ? '' : 'Use 3–20 letras minúsculas, números, ponto, hífen ou _' },
  { k: 'perfil', label: 'Perfil de acesso', type: 'select', options: Object.entries(ROLES), blank: false, span: 3 }, { k: 'senha', label: u ? 'Nova senha (deixe vazio para manter)' : 'Senha', type: 'password', span: 3, req: !u, validate: v => v.length >= 6 ? '' : 'Mínimo 6 caracteres' }, { k: 'ativo', label: 'Usuário ativo', type: 'checkbox', span: 6 },
  { html: `<div class="fld" style="--span:6"><label>Permissões por módulo</label><div class="perms">${MODS.map(([k, l, i]) => `<label class="chk"><input type="checkbox" data-perm="${k}"><span>${l}</span></label>`).join('')}</div><small class="hint">O administrador sempre tem acesso total. Ajuste individualmente para os demais perfis.</small></div>` }];
  Modal.open({
    title: u ? 'Editar usuário' : 'Novo usuário', size: 'lg', html: Form.html(F, u || { perfil: 'vendedor', ativo: true }),
    onOpen: api => { const setP = (role, list) => $$('[data-perm]', api.el).forEach(c => { c.checked = role === 'admin' || list.includes(c.dataset.perm); c.disabled = role === 'admin'; }); const pf = $('[name=perfil]', api.el); setP(pf.value, u ? u.permissoes || [] : ROLE_PERMS[pf.value]); pf.onchange = () => setP(pf.value, ROLE_PERMS[pf.value]); },
    buttons: [{ label: 'Cancelar', cls: 'ghost' }, {
      label: `${ic('check', 16)} Salvar`, cls: 'gold', onClick: api => {
        const v = Form.read(api.body, F.map(f => f.k === 'senha' && u ? { ...f, req: false } : f)); if (!v) return false; v.login = v.login.toLowerCase();
        if (Store.all('users').some(x => x.login === v.login && x.id !== (u && u.id))) throw new UserError('Este login já está em uso.');
        if (u && v.senha && v.senha.length < 6) throw new UserError('Senha com no mínimo 6 caracteres.');
        const perms = $$('[data-perm]', api.el).filter(c => c.checked).map(c => c.dataset.perm);
        if (u && u.perfil === 'admin' && (v.perfil !== 'admin' || !v.ativo) && Store.all('users').filter(x => x.perfil === 'admin' && x.ativo !== false).length < 2) throw new UserError('Deve existir ao menos um administrador ativo.');
        const rec = { ...(u || {}), nome: v.nome, login: v.login, perfil: v.perfil, ativo: v.ativo, permissoes: v.perfil === 'admin' ? [] : perms }; if (v.senha) rec.senhaHash = hashSenha(v.login, v.senha);
        const s = Store.save('users', rec); if (Auth.user && s.id === Auth.user.id) { Auth.user = s; App.buildNav(); } toast('Usuário salvo');
      }
    }]
  });
}

/* ================= NOTIFICAÇÕES ================= */
Pages.notificacoes = {
  title: 'Notificações',
  render(el) {
    const N = notifications(); const lv = { danger: 'Urgente', warn: 'Atenção', info: 'Informativo' };
    el.innerHTML = `<div class="page-h"><div><h1>Central de notificações</h1><p>${N.length} aviso(s) ativo(s) · atualizado automaticamente</p></div><div class="page-actions">${'Notification' in window && Notification.permission !== 'granted' ? `<button class="btn" data-act="notif:perm">${ic('bell', 16)} Ativar avisos no dispositivo</button>` : ''}</div></div>` +
      (N.length ? ['danger', 'warn', 'info'].map(l => { const a = N.filter(n => n.level === l); return a.length ? `<h4 class="sec lv-${l}">${lv[l]} (${a.length})</h4><div class="card nopad"><ul class="alerts big">${a.map(n => `<li class="al ${n.level}" data-act="go" data-p="${n.link}"><span>${ic(n.icon, 20)}</span><div><b>${esc(n.title)}</b><small>${esc(n.text)}</small></div>${ic('chevR', 16)}</li>`).join('')}</ul></div>` : ''; }).join('') : `<div class="card"><div class="empty">${ic('check', 34)}<p>Tudo em dia! Nenhum aviso no momento.</p></div></div>`);
  },
  refresh() { this.render($('#view')); }
};
ACT['go'] = d => { location.hash = '#/' + d.p; };
ACT['notif:perm'] = async () => { const p = await Notification.requestPermission(); toast(p === 'granted' ? 'Avisos ativados neste dispositivo' : 'Permissão negada', p === 'granted' ? 'ok' : 'warn'); if (p === 'granted') browserNotify(); Pages.notificacoes.render($('#view')); };

/* ================= CONFIGURAÇÕES ================= */
Pages.config = {
  title: 'Configurações',
  render(el) {
    const c = cfg(); const sc = Sync.cfg();
    const F1 = [{ k: 'loja', label: 'Nome da loja', span: 3 }, { k: 'slogan', label: 'Assinatura', span: 3 }, { k: 'cnpj', label: 'CNPJ', span: 2 }, { k: 'tel', label: 'Telefone', span: 2 }, { k: 'email', label: 'E-mail', span: 2 }, { k: 'endereco', label: 'Endereço', span: 6 }];
    const F2 = [{ k: 'bufferDias', label: 'Dias de folga entre aluguéis da mesma peça (lavagem/preparo)', type: 'number', min: 0, maxv: 15, span: 6 }, { k: 'exigirCaixa', label: 'Exigir caixa aberto para registrar recebimentos e pagamentos em dinheiro', type: 'checkbox', span: 6 }, { k: 'lavagemAposDevolucao', label: 'Enviar peças para lavagem automaticamente após devolução em bom estado', type: 'checkbox', span: 6 }, { k: 'rodape', label: 'Mensagem do rodapé dos comprovantes', span: 6 }, { k: 'contrato', label: 'Cláusulas do contrato de locação', type: 'textarea', rows: 9, span: 6 }];
    el.innerHTML = `<div class="page-h"><div><h1>Configurações</h1><p>Loja, regras, sincronização com Google Sheets e backup</p></div></div>
    <div class="grid2 top">
    <div class="card"><h3 class="card-t">${ic('tag', 18)} Dados da loja</h3>${Form.html(F1, c)}<div class="mt"><button class="btn gold" data-act="cfg:save1">${ic('check', 16)} Salvar</button></div></div>
    <div class="card"><h3 class="card-t">${ic('settings', 18)} Regras e contrato</h3>${Form.html(F2, c)}<div class="mt"><button class="btn gold" data-act="cfg:save2">${ic('check', 16)} Salvar</button></div></div>
    <div class="card"><h3 class="card-t">${ic('cloud', 18)} Banco de dados — Google Sheets</h3><p class="muted small">Cole a URL do app da web do Apps Script e o token. Os dados ficam salvos no navegador e sincronizam automaticamente com a planilha.</p>
      <div class="fgrid"><div class="fld" style="--span:6"><label>URL do Apps Script (termina em /exec)</label><input class="input" id="s_url" value="${esc(sc.url)}" placeholder="https://script.google.com/macros/s/.../exec"></div><div class="fld" style="--span:6"><label>Token de segurança</label><input class="input" id="s_tok" type="password" value="${esc(sc.token)}" autocomplete="off"></div></div>
      <div class="row-actions wrap mt"><button class="btn gold sm" data-act="cfg:sync-save">${ic('check', 14)} Salvar conexão</button><button class="btn sm" data-act="cfg:sync-test">${ic('cloud', 14)} Testar</button><button class="btn sm" data-act="cfg:sync-now">${ic('refresh', 14)} Sincronizar agora</button><button class="btn sm" data-act="cfg:sync-all">${ic('upload', 14)} Enviar tudo p/ planilha</button></div><p id="sync-info" class="muted small mt"></p></div>
    <div class="card"><h3 class="card-t">${ic('db', 18)} Backup e dados</h3><div class="stack">
      <button class="btn" data-act="cfg:export">${ic('download', 16)} Baixar backup (JSON)</button>
      <label class="btn upl">${ic('upload', 16)} Restaurar backup (JSON)<input id="bkf" type="file" accept=".json,application/json" hidden></label>
      <button class="btn" data-act="cfg:drive">${ic('cloud', 16)} Criar cópia de segurança da planilha (Drive)</button>
      <button class="btn" data-act="cfg:demo">${ic('plus', 16)} Carregar dados de exemplo</button>
      <button class="btn" data-act="notif:perm">${ic('bell', 16)} Ativar avisos no dispositivo</button>
      <button class="btn" data-act="app:install" id="btnInstall2" style="display:none">${ic('download', 16)} Instalar aplicativo</button>
      <button class="btn danger" data-act="cfg:wipe">${ic('trash', 16)} Limpar dados deste dispositivo</button></div></div></div>`;
    $('#bkf').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const o = JSON.parse(await f.text()); if (!(await confirmBox('Restaurar este backup? Os registros do arquivo serão mesclados e substituirão os de mesmo ID.', { ok: 'Restaurar' }))) return; Store.importAll(o); toast('Backup restaurado'); } catch (er) { handleErr(er instanceof SyntaxError ? new UserError('Arquivo inválido.') : er); } e.target.value = ''; };
    App.syncInfo(); App.updateInstall();
  }
};
const saveCfg = (F, root) => { const v = Form.read(root, F); if (!v) return; Store.save('config', { ...cfg(), ...v, id: 'config' }); toast('Configurações salvas'); };
ACT['cfg:save1'] = (d, el) => saveCfg([{ k: 'loja' }, { k: 'slogan' }, { k: 'cnpj' }, { k: 'tel' }, { k: 'email' }, { k: 'endereco' }], el.closest('.card'));
ACT['cfg:save2'] = (d, el) => saveCfg([{ k: 'bufferDias', type: 'number', min: 0 }, { k: 'exigirCaixa', type: 'checkbox' }, { k: 'lavagemAposDevolucao', type: 'checkbox' }, { k: 'rodape' }, { k: 'contrato' }], el.closest('.card'));
ACT['cfg:sync-save'] = () => { localStorage.setItem('bs_sync', JSON.stringify({ url: $('#s_url').value.trim(), token: $('#s_tok').value.trim() })); toast('Conexão salva'); Sync.touch(); if (Sync.enabled()) Sync.sync(true); App.syncInfo(); };
ACT['cfg:sync-test'] = async () => { ACT['cfg:sync-save'](); try { const j = await Sync.call('ping'); toast(`Conectado à planilha “${j.sheet}”`); } catch (e) { handleErr(e); } };
ACT['cfg:sync-now'] = async () => { await Sync.sync(true); toast(Sync.state === 'ok' ? 'Sincronizado' : (Sync.msg || 'Verifique a conexão'), Sync.state === 'ok' ? 'ok' : 'warn'); };
ACT['cfg:sync-all'] = async () => { if (!Sync.enabled()) throw new UserError('Configure a conexão primeiro.'); Store.markAllDirty(); await Sync.sync(true); toast(Sync.state === 'ok' ? 'Todos os dados enviados' : (Sync.msg || 'Falha'), Sync.state === 'ok' ? 'ok' : 'warn'); };
ACT['cfg:export'] = () => { download(`backup-bridal-store-${todayStr()}.json`, JSON.stringify(Store.exportAll()), 'application/json'); toast('Backup gerado'); };
ACT['cfg:drive'] = async () => { const j = await Sync.call('backup'); toast('Cópia criada: ' + j.name); };
ACT['cfg:demo'] = async () => { if (await confirmBox('Carregar produtos, clientes, aluguéis, vendas e contas de exemplo? (útil para testar)', { ok: 'Carregar' })) { seedDemo(); toast('Dados de exemplo carregados'); } };
ACT['cfg:wipe'] = async () => { if (!(await confirmBox('Apagar TODOS os dados armazenados <b>neste dispositivo</b>? Se a sincronização estiver ativa, eles serão baixados de novo da planilha; sem ela, serão perdidos (faça backup antes).', { ok: 'Apagar', danger: true }))) return; await Store.wipe(); seedBase(); Auth.logout(); location.reload(); };
