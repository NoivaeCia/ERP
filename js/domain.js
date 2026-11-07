/* ===== Regras de negócio, integrações entre módulos e notificações ===== */
const CATEGORIAS = ['Vestido de Noiva', 'Vestido de Festa', 'Terno', 'Smoking', 'Roupa Social', 'Sapato', 'Véu', 'Grinalda', 'Acessório', 'Outro'];
const CAT_PREFIX = { 'Vestido de Noiva': 'VN', 'Vestido de Festa': 'VF', 'Terno': 'TR', 'Smoking': 'SM', 'Roupa Social': 'RS', 'Sapato': 'SP', 'Véu': 'VU', 'Grinalda': 'GR', 'Acessório': 'AC', 'Outro': 'OT' };
const CONSERVACAO = ['Novo', 'Excelente', 'Bom', 'Regular', 'Necessita reparo'];
const ITEM_STATUS = { disponivel: ['Disponível', 'ok'], reservado: ['Reservado', 'info'], alugado: ['Alugado', 'gold'], manutencao: ['Manutenção', 'warn'], lavagem: ['Lavagem', 'silver'], vendido: ['Vendido', 'muted'] };
const FORMAS = [['dinheiro', 'Dinheiro'], ['pix', 'PIX'], ['debito', 'Cartão de débito'], ['credito', 'Cartão de crédito'], ['parcelado', 'Crédito parcelado'], ['transferencia', 'Transferência'], ['outro', 'Outro']];
const formaLabel = f => (FORMAS.find(x => x[0] === f) || [, f || '—'])[1];
const DESPESA_CATS = ['Aluguel do estabelecimento', 'Água', 'Energia', 'Internet', 'Fornecedores', 'Funcionários', 'Impostos', 'Manutenção', 'Lavanderia', 'Outras despesas'];
const MODS = [
  ['dashboard', 'Painel', 'dashboard'], ['estoque', 'Estoque', 'hanger'], ['alugueis', 'Aluguéis', 'rent'], ['vendas', 'Vendas', 'cart'],
  ['caixa', 'Caixa', 'wallet'], ['pagar', 'Contas a Pagar', 'pagar'], ['receber', 'Contas a Receber', 'receber'], ['clientes', 'Clientes', 'users'],
  ['agenda', 'Agenda', 'calendar'], ['relatorios', 'Relatórios', 'chart'], ['notificacoes', 'Notificações', 'bell'], ['usuarios', 'Usuários', 'shield'], ['config', 'Configurações', 'settings']
];
const ROLES = { admin: 'Administrador', gerente: 'Gerente', vendedor: 'Vendedor', financeiro: 'Financeiro' };
const ROLE_PERMS = {
  admin: MODS.map(m => m[0]),
  gerente: ['dashboard', 'estoque', 'alugueis', 'vendas', 'caixa', 'pagar', 'receber', 'clientes', 'agenda', 'relatorios', 'notificacoes'],
  vendedor: ['vendas', 'clientes', 'alugueis', 'agenda', 'notificacoes'],
  financeiro: ['dashboard', 'caixa', 'pagar', 'receber', 'notificacoes']
};
const DEFAULT_CONTRATO = `1. O LOCATÁRIO recebe as peças descritas em perfeito estado de conservação e limpeza, comprometendo-se a devolvê-las na data prevista.
2. O atraso na devolução acarretará cobrança de diária adicional, a critério da loja.
3. Danos, manchas permanentes, rasgos, extravio ou perda de peças ou acessórios serão cobrados pelo valor de reposição.
4. É proibido realizar ajustes, cortes ou reparos nas peças sem autorização expressa da loja.
5. O sinal pago garante a reserva e não é reembolsável em caso de desistência do LOCATÁRIO, salvo acordo por escrito.
6. A caução/garantia será devolvida após a conferência das peças na devolução.
7. O LOCATÁRIO declara ter conferido as peças e concorda com as condições deste contrato.`;
const DEFAULT_CFG = { id: 'config', loja: 'Noiva & Cia.', slogan: 'by Adriana Leal', cnpj: '', tel: '', endereco: '', email: '', bufferDias: 1, exigirCaixa: true, lavagemAposDevolucao: true, contrato: DEFAULT_CONTRATO, rodape: 'Obrigado pela preferência!' };
const cfg = () => ({ ...DEFAULT_CFG, ...(Store.get('config', 'config') || {}) });

/* ---------- Caixa / lançamentos ---------- */
const openCaixa = () => Store.all('caixas').find(c => c.status === 'aberto');
function ensureCaixa(forma, tipo = 'entrada') {
  if (cfg().exigirCaixa && !openCaixa() && (tipo === 'entrada' || forma === 'dinheiro')) throw new UserError('Abra o caixa antes de registrar este lançamento (menu Caixa → Abrir caixa).');
}
function addLedger(o) {
  const cx = openCaixa();
  return Store.save('ledger', { data: todayStr(), hora: nowTime(), caixaId: cx ? cx.id : null, userId: Auth.user ? Auth.user.id : null, ...o, valor: r2(o.valor) });
}
function nextNum(col) { return Store.raw(col).reduce((m, r) => Math.max(m, r.num || 0), 0) + 1; }
const padNum = (p, n) => `${p}-${String(n).padStart(4, '0')}`;

/* ---------- Estoque ---------- */
const prodOf = it => Store.get('products', it.productId);
const unitsOf = pid => Store.all('items').filter(i => i.productId === pid);
function itemLabel(it) { const p = prodOf(it) || {}; return `${p.nome || '?'} · Tam ${it.tamanho || '-'} · ${it.cor || '-'}`; }
const activeRentals = () => Store.all('rentals').filter(r => r.status === 'reservado' || r.status === 'retirado');
const rentalSpan = r => { let to = r.devolucao; if (r.status === 'retirado' && to < todayStr()) to = todayStr(); return [r.retirada, to]; };
function rentalConflicts(itemId, from, to, ignoreId) {
  const b = num(cfg().bufferDias);
  return activeRentals().filter(r => r.id !== ignoreId && (r.itemIds || []).includes(itemId)).filter(r => { const [a, z] = rentalSpan(r); return from <= addDays(z, b) && a <= addDays(to, b); });
}
function itemEffStatus(it) {
  if (it.status !== 'disponivel') return it.status;
  return activeRentals().some(r => r.status === 'reservado' && (r.itemIds || []).includes(it.id) && rentalSpan(r)[1] >= todayStr()) ? 'reservado' : 'disponivel';
}
function genSku(cat) {
  const p = CAT_PREFIX[cat] || 'OT'; const used = Store.raw('products').map(x => x.sku);
  let n = Store.raw('products').filter(x => x.sku && x.sku.startsWith(p + '-')).length + 1; while (used.includes(`${p}-${String(n).padStart(3, '0')}`)) n++;
  return `${p}-${String(n).padStart(3, '0')}`;
}
function addUnits(product, { tamanho, cor, qtd, localizacao }) {
  const base = Store.raw('items').filter(i => i.productId === product.id).length;
  for (let i = 1; i <= qtd; i++) Store.save('items', { productId: product.id, codigo: `${product.sku}-${String(base + i).padStart(2, '0')}`, tamanho, cor, status: 'disponivel', localizacao: localizacao || product.localizacao || '' });
}
const itemInUse = id => Store.all('rentals').some(r => r.status !== 'cancelado' && (r.itemIds || []).includes(id)) || Store.all('sales').some(s => s.status === 'concluida' && (s.itens || []).some(l => l.itemId === id));

/* ---------- Aluguel ---------- */
const rentalPaid = r => sum(r.payments || [], p => p.valor);
const rentalSaldo = r => r2(num(r.total) - rentalPaid(r));
function rentalState(r) { if (r.status === 'retirado' && r.devolucao < todayStr()) return 'atrasado'; return r.status; }
const RENT_BADGE = { reservado: ['Reservado', 'gold'], retirado: ['Retirado', 'ok'], atrasado: ['Atrasado', 'danger'], devolvido: ['Devolvido', 'muted'], cancelado: ['Cancelado', 'muted'] };
function syncRentalReceivable(r) {
  Store.all('receivables').filter(x => x.rootId === r.id && x.origem === 'aluguel' && x.status === 'pendente' && !x.multa).forEach(x => Store.remove('receivables', x.id));
  const rest = rentalSaldo(r);
  if (rest > 0.004 && r.status !== 'cancelado' && r.status !== 'devolvido') Store.save('receivables', { descricao: `Restante do aluguel #${r.num}`, customerId: r.customerId, origem: 'aluguel', rootId: r.id, valor: rest, vencimento: r.vencRestante || r.retirada, status: 'pendente' });
}
function saveRental(d, editing) {
  // d: {customerId, vendedorId, retirada, evento, devolucao, lines:[{itemId,valor}], desconto, sinal, forma, vencRestante, caucao, caucaoTipo, obs}
  const bad = [];
  d.lines.forEach(l => { const cf = rentalConflicts(l.itemId, d.retirada, d.devolucao, editing && editing.id); if (cf.length) { const it = Store.get('items', l.itemId); bad.push(`${itemLabel(it)} — já reservado no aluguel #${cf[0].num} (${fmtDate(cf[0].retirada)} a ${fmtDate(cf[0].devolucao)})`); } });
  if (bad.length) throw new UserError('Conflito de reserva: ' + bad.join(' | '));
  const subtotal = sum(d.lines, l => l.valor); const total = r2(Math.max(0, subtotal - num(d.desconto)));
  if (total <= 0) throw new UserError('O valor total do aluguel deve ser maior que zero.');
  const sinal = editing ? 0 : r2(d.sinal); if (sinal > total + 0.004) throw new UserError('O sinal não pode ser maior que o total.');
  if (sinal > 0) ensureCaixa(d.forma);
  const base = editing ? { ...editing } : { num: nextNum('rentals'), status: 'reservado', payments: [] };
  const r = Store.save('rentals', { ...base, customerId: d.customerId, vendedorId: d.vendedorId, retirada: d.retirada, evento: d.evento, devolucao: d.devolucao, itens: d.lines, itemIds: d.lines.map(l => l.itemId), subtotal, desconto: r2(d.desconto), total, caucao: r2(d.caucao), caucaoTipo: d.caucaoTipo, vencRestante: d.vencRestante || d.retirada, obs: d.obs, formaSinal: d.forma || base.formaSinal });
  if (sinal > 0) {
    const pay = { id: uid(), data: todayStr(), valor: sinal, forma: d.forma, tipo: 'sinal' };
    Store.save('rentals', { ...r, payments: [...(r.payments || []), pay] });
    addLedger({ tipo: 'entrada', natureza: 'receita', origem: 'aluguel', forma: d.forma, valor: sinal, descricao: `Sinal do aluguel #${r.num}`, rootId: r.id, customerId: r.customerId });
  }
  const fresh = Store.get('rentals', r.id); syncRentalReceivable(fresh);
  if (fresh.evento) { /* evento aparece na agenda automaticamente */ }
  return fresh;
}
function pickupRental(id, { receber, forma, data }) {
  const r = Store.get('rentals', id); if (!r || r.status !== 'reservado') throw new UserError('Este aluguel não está reservado.');
  if (receber && rentalSaldo(r) > 0) { const rc = Store.all('receivables').find(x => x.rootId === r.id && x.status === 'pendente' && x.origem === 'aluguel'); if (rc) receiveReceivable(rc.id, { forma, valor: rc.valor }); }
  const fresh = Store.get('rentals', id);
  (r.itemIds || []).forEach(iid => { const it = Store.get('items', iid); if (it) Store.save('items', { ...it, status: 'alugado' }); });
  Store.save('rentals', { ...fresh, status: 'retirado', retiradaReal: data || todayStr() });
}
function returnRental(id, { data, estado, destino, multa, caucaoDevolvida, obs }) {
  const r = Store.get('rentals', id); if (!r || r.status !== 'retirado') throw new UserError('Este aluguel não está retirado.');
  (r.itemIds || []).forEach(iid => { const it = Store.get('items', iid); if (it) Store.save('items', { ...it, status: destino }); });
  Store.save('rentals', { ...r, status: 'devolvido', devolucaoReal: data, estadoDevolucao: estado, caucaoDevolvida: !!caucaoDevolvida, obsDevolucao: obs });
  Store.all('receivables').filter(x => x.rootId === id && x.origem === 'aluguel' && x.status === 'pendente' && !x.multa).forEach(x => { /* mantém saldo em aberto como conta a receber */ });
  if (num(multa) > 0) Store.save('receivables', { descricao: `Multa/atraso do aluguel #${r.num}`, customerId: r.customerId, origem: 'aluguel', rootId: id, valor: r2(multa), vencimento: data, status: 'pendente', multa: true });
}
function cancelRental(id, devolver) {
  const r = Store.get('rentals', id); if (!r) return;
  if (devolver) { const pagos = Store.all('ledger').filter(l => l.rootId === id && l.natureza === 'receita' && l.tipo === 'entrada' && !l.estornado); if (pagos.length) ensureCaixa('x', 'saida'); pagos.forEach(l => estornar(l, `Estorno – cancelamento do aluguel #${r.num}`)); }
  Store.all('receivables').filter(x => x.rootId === id && x.status === 'pendente').forEach(x => Store.save('receivables', { ...x, status: 'cancelado' }));
  if (r.status === 'retirado') (r.itemIds || []).forEach(iid => { const it = Store.get('items', iid); if (it && it.status === 'alugado') Store.save('items', { ...it, status: 'disponivel' }); });
  Store.save('rentals', { ...r, status: 'cancelado' });
}
function estornar(l, desc) {
  Store.save('ledger', { ...l, estornado: true });
  addLedger({ tipo: 'saida', natureza: 'estorno', origem: l.origem, forma: l.forma, valor: l.valor, descricao: desc, rootId: l.rootId, estornoDe: l.id });
}

/* ---------- Vendas ---------- */
function createSale(d) {
  // d: {customerId, vendedorId, linhas:[{itemId?,nome,preco,custo}], desconto, forma, parcelas, entrada, entradaForma, obs}
  if (!d.linhas.length) throw new UserError('Adicione ao menos um item.');
  const subtotal = sum(d.linhas, l => l.preco); const total = r2(Math.max(0, subtotal - num(d.desconto)));
  if (total <= 0) throw new UserError('O total da venda deve ser maior que zero.');
  const cred = d.forma === 'crediario';
  if (cred && !d.customerId) throw new UserError('Selecione o cliente para vender no crediário.');
  const entrada = cred ? r2(d.entrada) : total; if (entrada > total + 0.004) throw new UserError('Entrada maior que o total.');
  const formaPag = cred ? d.entradaForma : d.forma;
  if (entrada > 0) ensureCaixa(formaPag);
  const sale = Store.save('sales', { num: nextNum('sales'), data: todayStr(), hora: nowTime(), customerId: d.customerId || '', vendedorId: d.vendedorId, itens: d.linhas, subtotal, desconto: r2(d.desconto), total, forma: d.forma, parcelas: num(d.parcelas) || 1, entrada, status: 'concluida', obs: d.obs || '' });
  d.linhas.forEach(l => { if (l.itemId) { const it = Store.get('items', l.itemId); if (it) Store.save('items', { ...it, status: 'vendido', saleId: sale.id }); } });
  if (entrada > 0) addLedger({ tipo: 'entrada', natureza: 'receita', origem: 'venda', forma: formaPag, valor: entrada, descricao: `Venda #${sale.num}${cred ? ' (entrada)' : ''}`, rootId: sale.id, customerId: d.customerId || '' });
  if (cred && total - entrada > 0.004) {
    const n = Math.max(1, num(d.parcelas)); const rest = r2(total - entrada); const base = Math.floor(rest / n * 100) / 100;
    for (let i = 1; i <= n; i++) { const v = i === n ? r2(rest - base * (n - 1)) : base; Store.save('receivables', { descricao: `Venda #${sale.num} – parcela ${i}/${n}`, customerId: d.customerId, origem: 'venda', rootId: sale.id, valor: v, vencimento: addDays(todayStr(), 30 * i), status: 'pendente', parcela: `${i}/${n}` }); }
  }
  return sale;
}
function cancelSale(id) {
  const s = Store.get('sales', id); if (!s || s.status !== 'concluida') return;
  const pagos = Store.all('ledger').filter(l => l.rootId === id && l.natureza === 'receita' && l.tipo === 'entrada' && !l.estornado);
  if (pagos.length) ensureCaixa('x', 'saida');
  pagos.forEach(l => estornar(l, `Estorno – cancelamento da venda #${s.num}`));
  Store.all('receivables').filter(x => x.rootId === id && x.status === 'pendente').forEach(x => Store.save('receivables', { ...x, status: 'cancelado' }));
  (s.itens || []).forEach(l => { if (l.itemId) { const it = Store.get('items', l.itemId); if (it) Store.save('items', { ...it, status: 'disponivel', saleId: '' }); } });
  Store.save('sales', { ...s, status: 'cancelada' });
}

/* ---------- Contas ---------- */
function receiveReceivable(id, { forma, valor, data }) {
  const r = Store.get('receivables', id); if (!r || r.status !== 'pendente') throw new UserError('A conta não está pendente.');
  valor = r2(valor); if (!(valor > 0)) throw new UserError('Informe um valor válido.'); if (valor > r.valor + 0.004) throw new UserError('Valor maior que o saldo da conta.');
  ensureCaixa(forma); data = data || todayStr();
  if (valor < r.valor - 0.004) Store.save('receivables', { descricao: r.descricao, customerId: r.customerId, origem: r.origem, rootId: r.rootId, valor: r2(r.valor - valor), vencimento: r.vencimento, status: 'pendente', parcela: r.parcela, multa: r.multa });
  Store.save('receivables', { ...r, valor, status: 'recebido', dataRecebimento: data, forma });
  addLedger({ tipo: 'entrada', natureza: 'receita', origem: r.origem || 'receber', forma, valor, descricao: r.descricao, rootId: r.rootId || r.id, refId: r.id, customerId: r.customerId, data });
  if (r.origem === 'aluguel' && r.rootId) { const rent = Store.get('rentals', r.rootId); if (rent) Store.save('rentals', { ...rent, payments: [...(rent.payments || []), { id: uid(), data, valor, forma, tipo: 'recebimento' }] }); }
}
function payPayable(id, { data, forma, valor, comprovante }) {
  const p = Store.get('payables', id); if (!p || (p.status !== 'pendente')) throw new UserError('A conta não está pendente.');
  ensureCaixa(forma, 'saida'); valor = r2(valor || p.valor);
  Store.save('payables', { ...p, status: 'pago', pagamento: data, forma, valorPago: valor, comprovante: comprovante || p.comprovante || '' });
  addLedger({ tipo: 'saida', natureza: 'despesa', origem: 'conta_pagar', forma, valor, descricao: p.descricao, categoria: p.categoria, refId: p.id, data });
}
function reopenPayable(id) {
  const p = Store.get('payables', id); if (!p) return;
  Store.all('ledger').filter(l => l.refId === id && l.origem === 'conta_pagar').forEach(l => Store.remove('ledger', l.id));
  Store.save('payables', { ...p, status: 'pendente', pagamento: '', forma: '', valorPago: 0 });
}
const payStatus = p => p.status === 'pendente' && p.vencimento < todayStr() ? 'vencido' : p.status;
const recStatus = r => r.status === 'pendente' && r.vencimento < todayStr() ? 'vencido' : r.status;
const PAY_BADGE = { pendente: ['Pendente', 'warn'], pago: ['Pago', 'ok'], vencido: ['Vencido', 'danger'], cancelado: ['Cancelado', 'muted'], recebido: ['Recebido', 'ok'] };
const custName = id => (Store.get('customers', id) || {}).nome || '—';
const userName = id => (Store.get('users', id) || {}).nome || '—';

/* ---------- Caixa ---------- */
function cashSummary(cx) {
  const L = Store.all('ledger').filter(l => l.caixaId === cx.id);
  const s = f => sum(L.filter(f), l => l.valor); const rec = l => l.tipo === 'entrada' && l.natureza === 'receita';
  const cartao = ['debito', 'credito', 'parcelado'];
  const out = {
    dinheiro: s(l => rec(l) && l.forma === 'dinheiro'), pix: s(l => rec(l) && l.forma === 'pix'), cartoes: s(l => rec(l) && cartao.includes(l.forma)),
    outros: s(l => rec(l) && !['dinheiro', 'pix', ...cartao].includes(l.forma)),
    saidas: s(l => l.tipo === 'saida'), reforcos: s(l => l.origem === 'reforco'), sangrias: s(l => l.origem === 'sangria'),
    entDin: s(l => l.tipo === 'entrada' && l.forma === 'dinheiro'), saiDin: s(l => l.tipo === 'saida' && l.forma === 'dinheiro')
  };
  out.esperado = r2(num(cx.saldoInicial) + out.entDin - out.saiDin); out.lista = L; return out;
}

/* ---------- Indicadores ---------- */
const ledgerRec = (L) => r2(sum(L.filter(l => l.natureza === 'receita' && l.tipo === 'entrada'), l => l.valor) - sum(L.filter(l => l.natureza === 'estorno'), l => l.valor));
const ledgerDesp = L => sum(L.filter(l => l.natureza === 'despesa'), l => l.valor);
function periodSales(from, to) { return Store.all('sales').filter(s => s.status === 'concluida' && s.data >= from && s.data <= to); }
function cmv(sales) { return sum(sales.flatMap(s => s.itens || []), l => l.custo); }
function kpis() {
  const t = todayStr(), m0 = t.slice(0, 8) + '01', L = Store.all('ledger');
  const Ld = L.filter(l => l.data === t), Lm = L.filter(l => l.data >= m0 && l.data <= t.slice(0, 8) + '31');
  const sm = periodSales(m0, t.slice(0, 8) + '31'); const items = Store.all('items'); const eff = items.map(itemEffStatus);
  const isDT = it => { const p = prodOf(it); return p && /vestido|terno|smoking/i.test(p.categoria || ''); };
  const pend = Store.all('payables').filter(p => p.status === 'pendente'); const venc = pend.filter(p => p.vencimento < t);
  const prox = pend.filter(p => { const d = diffDays(p.vencimento, t); return d >= 0 && d <= 7; });
  const rpend = Store.all('receivables').filter(r => r.status === 'pendente'); const rvenc = rpend.filter(r => r.vencimento < t);
  const rents = Store.all('rentals'); const ativos = rents.filter(r => r.status === 'retirado');
  const fatMes = ledgerRec(Lm), despMes = ledgerDesp(Lm);
  return {
    fatDia: ledgerRec(Ld), fatMes, vendasQtd: sm.length, vendasVal: sum(sm, s => s.total), alugAtivos: ativos.length, alugReservados: rents.filter(r => r.status === 'reservado').length,
    alugProx: ativos.filter(r => diffDays(r.devolucao, t) <= 3).length, dispDT: items.filter((it, i) => eff[i] === 'disponivel' && isDT(it)).length, alugados: items.filter(i => i.status === 'alugado').length,
    pagarVal: sum(pend, p => p.valor), pagarQtd: pend.length, pagarProx: prox.length, vencVal: sum(venc, p => p.valor), vencQtd: venc.length,
    receberVal: sum(rpend, r => r.valor), receberQtd: rpend.length, receberVenc: rvenc.length, despMes, lucro: r2(fatMes - despMes - cmv(sm)), clientes: Store.all('customers').length
  };
}
function monthSeries(n = 6) {
  const out = []; const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push({ key: `${x.getFullYear()}-${pad(x.getMonth() + 1)}`, label: `${MESES[x.getMonth()].slice(0, 3)}/${String(x.getFullYear()).slice(2)}` }); }
  const L = Store.all('ledger');
  out.forEach(m => { const Lm = L.filter(l => l.data.startsWith(m.key)); m.fat = ledgerRec(Lm); m.desp = ledgerDesp(Lm); m.vendas = ledgerRec(Lm.filter(l => l.origem === 'venda')); m.alug = ledgerRec(Lm.filter(l => l.origem === 'aluguel')); });
  return out;
}

/* ---------- Notificações ---------- */
const LV = { danger: 0, warn: 1, info: 2, ok: 3 };
function notifications() {
  const t = todayStr(), N = []; const add = (level, icon, title, text, link, key) => N.push({ level, icon, title, text, link, key });
  Store.all('payables').filter(p => p.status === 'pendente').forEach(p => {
    const d = diffDays(p.vencimento, t);
    if (d < 0) add('danger', 'alert', 'Conta vencida', `${p.descricao} — ${money(p.valor)} venceu há ${-d} dia(s)`, 'pagar', `p:${p.id}:late`);
    else if (d === 0) add('danger', 'clock', 'Conta vence hoje', `${p.descricao} — ${money(p.valor)}`, 'pagar', `p:${p.id}:0`);
    else if (d <= 3) add('warn', 'clock', `Conta vence em ${d} dia(s)`, `${p.descricao} — ${money(p.valor)}`, 'pagar', `p:${p.id}:3`);
    else if (d <= 7) add('info', 'clock', `Conta vence em ${d} dias`, `${p.descricao} — ${money(p.valor)}`, 'pagar', `p:${p.id}:7`);
  });
  Store.all('receivables').filter(r => r.status === 'pendente').forEach(r => {
    const d = diffDays(r.vencimento, t);
    if (d < 0) add('danger', 'receber', 'Pagamento atrasado', `${custName(r.customerId)} — ${money(r.valor)} (${-d} dia(s) de atraso) · ${r.descricao}`, 'receber', `r:${r.id}:late`);
    else if (d <= 3) add(d === 0 ? 'warn' : 'info', 'receber', d === 0 ? 'Recebimento hoje' : `Recebimento em ${d} dia(s)`, `${custName(r.customerId)} — ${money(r.valor)} · ${r.descricao}`, 'receber', `r:${r.id}:3`);
  });
  Store.all('rentals').forEach(r => {
    if (r.status === 'retirado') { const d = diffDays(r.devolucao, t); if (d < 0) add('danger', 'rent', 'Devolução atrasada', `Aluguel #${r.num} de ${custName(r.customerId)} — previsto ${fmtDate(r.devolucao)}`, 'alugueis', `a:${r.id}:late`); else if (d <= 2) add('warn', 'rent', d === 0 ? 'Devolução hoje' : `Devolução em ${d} dia(s)`, `Aluguel #${r.num} de ${custName(r.customerId)}`, 'alugueis', `a:${r.id}:ret`); }
    if (r.status === 'reservado') { const d = diffDays(r.retirada, t); if (d < 0) add('danger', 'rent', 'Retirada não registrada', `Aluguel #${r.num} de ${custName(r.customerId)} — era para ${fmtDate(r.retirada)}`, 'alugueis', `a:${r.id}:miss`); else if (d <= 3) add(d <= 1 ? 'warn' : 'info', 'rent', d === 0 ? 'Retirada hoje' : `Retirada em ${d} dia(s)`, `Aluguel #${r.num} de ${custName(r.customerId)}`, 'alugueis', `a:${r.id}:pick`); }
  });
  Store.all('items').filter(i => i.status === 'manutencao').forEach(i => add('warn', 'settings', 'Peça em manutenção', itemLabel(i) + ' · ' + (i.codigo || ''), 'estoque', `m:${i.id}`));
  Store.all('products').filter(p => p.ativo !== false && num(p.minimo) > 0).forEach(p => { const disp = unitsOf(p.id).filter(u => itemEffStatus(u) === 'disponivel').length; if (disp < num(p.minimo)) add('warn', 'box', 'Estoque baixo', `${p.nome}: ${disp} disponível(is) (mínimo ${p.minimo})`, 'estoque', `s:${p.id}`); });
  Store.all('appointments').filter(a => a.status !== 'cancelado' && a.status !== 'concluido').forEach(a => { const d = diffDays(a.data, t); if (d === 0) add('info', 'calendar', `Hoje às ${a.hora || '--:--'}`, `${a.titulo || a.tipo}${a.customerId ? ' — ' + custName(a.customerId) : ''}`, 'agenda', `g:${a.id}:0`); else if (d === 1) add('info', 'calendar', `Amanhã às ${a.hora || '--:--'}`, `${a.titulo || a.tipo}${a.customerId ? ' — ' + custName(a.customerId) : ''}`, 'agenda', `g:${a.id}:1`); });
  return N.sort((a, b) => LV[a.level] - LV[b.level]);
}
function browserNotify() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  let seen = {}; try { seen = JSON.parse(localStorage.getItem('bs_notified') || '{}'); } catch (e) { }
  const t = todayStr(); Object.keys(seen).forEach(k => { if (seen[k] !== t) delete seen[k]; });
  notifications().filter(n => n.level !== 'info' || /^p:/.test(n.key)).forEach(n => {
    if (seen[n.key] === t) return; seen[n.key] = t;
    const opts = { body: n.text, icon: 'icons/icon-192.png', tag: n.key };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(n.title, opts)); else new Notification(n.title, opts);
  });
  localStorage.setItem('bs_notified', JSON.stringify(seen));
}

/* ---------- Dados de exemplo ---------- */
function seedDemo() {
  if (!openCaixa()) Store.save('caixas', { abertura: todayStr(), hora: nowTime(), saldoInicial: 200, status: 'aberto', abertoPor: Auth.user.id });
  const P = (nome, categoria, marca, compra, venda, aluguel, sizes, cor, loc, desc) => { const p = Store.save('products', { sku: genSku(categoria), nome, categoria, marca, descricao: desc || '', compra, venda, aluguel, conservacao: 'Excelente', localizacao: loc, minimo: 1, ativo: true, fotos: [] }); sizes.forEach(t => addUnits(p, { tamanho: t, cor, qtd: 1, localizacao: loc })); return p; };
  const p1 = P('Vestido Sereia Renda Francesa', 'Vestido de Noiva', 'Pronovias', 2800, 6500, 1800, ['38', '40', '42'], 'Off-white', 'Arara A1');
  const p2 = P('Vestido Princesa Cristais', 'Vestido de Noiva', 'Cymbeline', 3500, 8900, 2400, ['36', '40'], 'Champagne', 'Arara A2');
  const p3 = P('Vestido Longo Madrinha Esmeralda', 'Vestido de Festa', 'Maria Valentina', 600, 1400, 450, ['38', '40', '44'], 'Verde', 'Arara B1');
  const p4 = P('Smoking Clássico Preto', 'Smoking', 'Colombo', 900, 2200, 600, ['48', '50', '52'], 'Preto', 'Arara C1');
  const p5 = P('Terno Slim Azul Marinho', 'Terno', 'Zara Man', 700, 1700, 420, ['46', '48', '50'], 'Azul', 'Arara C2');
  const p6 = P('Véu Catedral Bordado', 'Véu', 'Atelier', 150, 480, 120, ['Único'], 'Marfim', 'Gaveta V1');
  const p7 = P('Sapato Scarpin Prata', 'Sapato', 'Arezzo', 120, 320, 80, ['35', '36', '37'], 'Prata', 'Prateleira S1');
  const C = (nome, tel, extra = {}) => Store.save('customers', { nome, cpf: '', tel, whats: tel, email: '', endereco: '', nasc: '', pref: '', medidas: {}, obs: '', ...extra });
  const c1 = C('Mariana Souza', '(11) 98888-1111', { email: 'mariana@email.com', medidas: { busto: '88', cintura: '66', quadril: '94', altura: '1,65' } });
  const c2 = C('Camila Ferreira', '(11) 97777-2222'); const c3 = C('Rafael Lima', '(11) 96666-3333', { medidas: { manequim: '50' } }); const c4 = C('Juliana Prado', '(11) 95555-4444');
  const it = (p, i = 0) => unitsOf(p.id)[i]; const t = todayStr(); const me = Auth.user.id;
  saveRental({ customerId: c1.id, vendedorId: me, retirada: addDays(t, 6), evento: addDays(t, 8), devolucao: addDays(t, 10), lines: [{ itemId: it(p1, 1).id, valor: 1800 }, { itemId: it(p6).id, valor: 120 }], desconto: 0, sinal: 600, forma: 'pix', vencRestante: addDays(t, 6), caucao: 500, caucaoTipo: 'Dinheiro', obs: 'Prova final agendada.' });
  const r2_ = saveRental({ customerId: c3.id, vendedorId: me, retirada: addDays(t, -3), evento: addDays(t, -1), devolucao: addDays(t, 1), lines: [{ itemId: it(p4, 1).id, valor: 600 }], desconto: 0, sinal: 300, forma: 'dinheiro', vencRestante: addDays(t, -3), caucao: 300, caucaoTipo: 'Cheque', obs: '' });
  pickupRental(r2_.id, { receber: false, data: addDays(t, -3) });
  createSale({ customerId: c2.id, vendedorId: me, linhas: [{ itemId: it(p7, 0).id, nome: itemLabel(it(p7, 0)), preco: 320, custo: 120 }, { nome: 'Ajuste de barra', preco: 60, custo: 0 }], desconto: 20, forma: 'pix' });
  createSale({ customerId: c4.id, vendedorId: me, linhas: [{ itemId: it(p3, 2).id, nome: itemLabel(it(p3, 2)), preco: 1400, custo: 600 }], desconto: 0, forma: 'crediario', parcelas: 3, entrada: 400, entradaForma: 'dinheiro' });
  Store.save('items', { ...it(p2, 1), status: 'manutencao', obs: 'Reparar barra' });
  const B = (descricao, categoria, valor, dias, fornecedor = '') => Store.save('payables', { descricao, categoria, fornecedor, valor, vencimento: addDays(t, dias), status: 'pendente', obs: '' });
  B('Aluguel da loja', 'Aluguel do estabelecimento', 4200, 2, 'Imobiliária Central'); B('Energia elétrica', 'Energia', 520, -2, 'Enel'); B('Internet fibra', 'Internet', 180, 6, 'Vivo'); B('Lavanderia – lote de vestidos', 'Lavanderia', 340, 0, 'Lavanderia Branca'); B('Salário costureira', 'Funcionários', 2100, 9);
  Store.save('appointments', { tipo: 'Prova de vestido', titulo: 'Prova final – Mariana', customerId: c1.id, data: t, hora: '16:00', duracao: 60, status: 'agendado', obs: '' });
  Store.save('appointments', { tipo: 'Prova de terno', titulo: 'Medidas do noivo', customerId: c3.id, data: addDays(t, 1), hora: '10:30', duracao: 45, status: 'agendado', obs: '' });
  addLedger({ tipo: 'saida', natureza: 'despesa', origem: 'manual', forma: 'dinheiro', valor: 45, descricao: 'Material de limpeza', categoria: 'Outras despesas' });
}
