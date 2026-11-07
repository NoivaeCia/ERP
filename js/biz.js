/* ===== biz.js – regras de negócio e integração entre módulos ===== */
const CATEGORIAS=['Vestido de noiva','Vestido de festa','Terno','Smoking','Roupa social','Sapato','Véu','Grinalda','Acessório','Outros'];
const CAT_TRAJE=['Vestido de noiva','Vestido de festa','Terno','Smoking','Roupa social'];
const CONSERV=['Novo','Excelente','Bom','Regular','Necessita reparo'];
const PECA_ST={disponivel:['Disponível','ok'],reservada:['Reservada','gold'],alugada:['Alugada','info'],manutencao:['Em manutenção','warn'],lavagem:['Em lavagem','muted'],vendida:['Vendida','danger']};
const FORMAS=[['dinheiro','Dinheiro'],['pix','PIX'],['credito','Cartão de crédito'],['debito','Cartão de débito'],['transferencia','Transferência']];
const FORMA_L=Object.fromEntries(FORMAS.concat([['parcelado','Parcelado'],['misto','Misto']]));
const CAT_DESPESA=['Aluguel do estabelecimento','Água','Energia','Internet','Fornecedores','Funcionários','Impostos','Manutenção','Lavanderia','Outras despesas'];
const AL_ST={reservado:['Reservado','gold'],retirado:['Retirado','info'],devolvido:['Devolvido','ok'],cancelado:['Cancelado','muted'],atrasado:['Atrasado','danger']};
const AG_TIPOS=['Prova de vestido','Prova de terno','Ajuste','Retirada','Devolução','Atendimento','Casamento / evento'];
const MOV_IN=['venda','aluguel','recebimento','entrada','reforco'];
const MOV_REC=['venda','aluguel','recebimento','entrada'];
const MOV_L={venda:'Venda',aluguel:'Aluguel (sinal)',recebimento:'Recebimento',entrada:'Entrada',reforco:'Reforço',despesa:'Despesa',saida:'Saída',sangria:'Sangria',estorno:'Estorno'};

const B={
  cfg(){ return Store.get('config','cfg')||{}; },
  produto:id=>Store.get('produtos',id), peca:id=>Store.get('pecas',id), cliente:id=>Store.get('clientes',id), usuario:id=>Store.get('usuarios',id),
  nomeCliente(id){ const c=Store.get('clientes',id); return c?c.nome:'—'; },
  nomeUser(id){ const u=Store.get('usuarios',id); return u?u.nome:'—'; },
  pecaLabel(p){ const pr=B.produto(p.produtoId)||{}; return `${pr.nome||'(produto removido)'} · Tam ${p.tamanho||'-'} · ${p.codigo}`; },
  nextNum(col,prefix){ const n=Store.db[col].reduce((m,r)=>Math.max(m,parseInt(String(r.numero||'').replace(/\D/g,''))||0),0)+1; return prefix+pad(n,4); },
  caixaAberto(){ return Store.all('caixas').find(c=>c.status==='aberto')||null; },
  requireCaixa(){ const c=B.caixaAberto(); if(!c){ toast('Abra o caixa antes de registrar recebimentos.','err'); Router.go('caixa'); } return c; },

  /* movimentação financeira (única porta de entrada do dinheiro) */
  mov({tipo,forma='dinheiro',valor,descricao,origemTipo='manual',origemId='',data}){
    const cx=B.caixaAberto(); const dt=data||nowISO();
    return Store.save('movimentos',{tipo,forma,valor:r2(valor),descricao,origemTipo,origemId,caixaId:cx?cx.id:'',data:dt,dia:dt.length===10?dt:isoDate(new Date(dt)),usuarioId:Auth.user?Auth.user.id:''});
  },
  movs(from,to){ return Store.all('movimentos').filter(m=>(!from||m.dia>=from)&&(!to||m.dia<=to)); },
  receita(ms){ return sum(ms.filter(m=>MOV_REC.includes(m.tipo)),m=>m.valor)-sum(ms.filter(m=>m.tipo==='estorno'),m=>m.valor); },
  despesa(ms){ return sum(ms.filter(m=>m.tipo==='despesa'||m.tipo==='saida'),m=>m.valor); },

  /* status efetivo */
  contaSt(c){ if(c.status==='pendente'&&c.vencimento<today()) return 'vencido'; return c.status; },
  alStatus(a){ if(a.status==='retirado'&&a.devolucao<today()) return 'atrasado'; return a.status; },
  alPago(a){ return r2((a.sinal||0)+sum(Store.all('receber').filter(r=>r.origemTipo==='aluguel'&&r.origemId===a.id&&r.status==='pago'),r=>r.valorRecebido||r.valor)); },

  /* disponibilidade de uma peça para um período de aluguel */
  pecaLivre(pecaId,ini,fim,ignoreId){
    const p=B.peca(pecaId); if(!p) return {ok:false,motivo:'Peça não encontrada'};
    if(p.status==='vendida') return {ok:false,motivo:'Peça vendida'};
    if(p.status==='manutencao') return {ok:false,motivo:'Peça em manutenção'};
    const folga=num(B.cfg().folga);
    for(const a of Store.all('alugueis')){
      if(a.id===ignoreId||!['reservado','retirado'].includes(a.status)) continue;
      if(!a.itens.some(i=>i.pecaId===pecaId)) continue;
      const fimEx=a.status==='retirado'&&a.devolucao<today()?today():a.devolucao;
      if(ini<=addDays(fimEx,folga)&&fim>=addDays(a.retirada,-folga)) return {ok:false,motivo:`Reservada em ${fdate(a.retirada)}–${fdate(a.devolucao)} (${a.numero})`,aluguel:a};
    }
    return {ok:true};
  },
  /* recalcula status derivado da peça (disponível/reservada/alugada) */
  refreshPeca(id){
    const p=B.peca(id); if(!p||['manutencao','lavagem','vendida'].includes(p.status)) return;
    const ativos=Store.all('alugueis').filter(a=>['reservado','retirado'].includes(a.status)&&a.itens.some(i=>i.pecaId===id));
    const st=ativos.some(a=>a.status==='retirado')?'alugada':ativos.length?'reservada':'disponivel';
    if(st!==p.status) Store.patch('pecas',id,{status:st});
  },
  /* contas a receber de aluguel: mantém o saldo restante coerente */
  syncReceberAluguel(a){
    const pago=B.alPago(a), need=r2(a.total-pago);
    const abertos=Store.all('receber').filter(r=>r.origemTipo==='aluguel'&&r.origemId===a.id&&r.status==='pendente');
    if(need<=0.009){ abertos.forEach(r=>Store.remove('receber',r.id)); return; }
    if(abertos.length){ Store.patch('receber',abertos[0].id,{valor:need,vencimento:a.retirada,clienteId:a.clienteId}); abertos.slice(1).forEach(r=>Store.remove('receber',r.id)); }
    else Store.save('receber',{descricao:`Saldo do aluguel ${a.numero}`,clienteId:a.clienteId,valor:need,vencimento:a.retirada,status:'pendente',origemTipo:'aluguel',origemId:a.id,parcela:''});
  },
  pecasDisponiveis(){ return Store.all('pecas').filter(p=>p.status==='disponivel'); },
  estoqueProduto(prodId){ const ps=Store.all('pecas').filter(p=>p.produtoId===prodId); return {total:ps.length,disp:ps.filter(p=>p.status==='disponivel').length,ps}; },

  /* ---------- indicadores do painel ---------- */
  kpis(){
    const t=today(), mes=t.slice(0,7), movs=Store.all('movimentos');
    const dia=movs.filter(m=>m.dia===t), mm=movs.filter(m=>m.dia.slice(0,7)===mes);
    const pagar=Store.all('pagar').filter(c=>c.status==='pendente'), venc=pagar.filter(c=>c.vencimento<t);
    const prox=pagar.filter(c=>c.vencimento>=t&&c.vencimento<=addDays(t,7));
    const rec=Store.all('receber').filter(r=>r.status==='pendente');
    const als=Store.all('alugueis'), ativos=als.filter(a=>['reservado','retirado'].includes(a.status));
    const pecas=Store.all('pecas'), traje=p=>CAT_TRAJE.includes((B.produto(p.produtoId)||{}).categoria);
    const vendasMes=Store.all('vendas').filter(v=>v.status==='concluida'&&(v.dia||'').slice(0,7)===mes);
    return {
      fatDia:B.receita(dia), fatMes:B.receita(mm), vendasQtd:vendasMes.length, vendasVal:sum(vendasMes,v=>v.total),
      alAtivos:ativos.length, alRetirados:ativos.filter(a=>a.status==='retirado').length,
      alProx:als.filter(a=>a.status==='retirado'&&a.devolucao>=t&&a.devolucao<=addDays(t,3)).length+als.filter(a=>a.status==='retirado'&&a.devolucao<t).length,
      disponiveis:pecas.filter(p=>p.status==='disponivel'&&traje(p)).length, alugados:pecas.filter(p=>p.status==='alugada').length,
      pagarQtd:pagar.length, pagarVal:sum(pagar,c=>c.valor), vencQtd:venc.length, vencVal:sum(venc,c=>c.valor), proxQtd:prox.length,
      recQtd:rec.length, recVal:sum(rec,r=>r.valor), lucro:B.receita(mm)-B.despesa(mm), clientes:Store.all('clientes').length
    };
  },
  serie(n=6){
    const out=[]; const d=new Date(); d.setDate(1);
    for(let i=n-1;i>=0;i--){ const x=new Date(d.getFullYear(),d.getMonth()-i,1); const ym=x.getFullYear()+'-'+pad(x.getMonth()+1);
      const ms=Store.all('movimentos').filter(m=>m.dia.slice(0,7)===ym);
      out.push({ym,label:['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][x.getMonth()]+'/'+String(x.getFullYear()).slice(2),
        fat:B.receita(ms), vendas:sum(ms.filter(m=>m.origemTipo==='venda'&&MOV_REC.includes(m.tipo)),m=>m.valor)-sum(ms.filter(m=>m.tipo==='estorno'&&m.origemTipo==='venda'),m=>m.valor),
        alug:sum(ms.filter(m=>m.origemTipo==='aluguel'&&MOV_REC.includes(m.tipo)),m=>m.valor), desp:B.despesa(ms)}); }
    return out;
  },

  /* ---------- notificações ---------- */
  notifs(){
    const t=today(), L=[], add=(nivel,icon,titulo,desc,go,grupo)=>L.push({nivel,icon,titulo,desc,go,grupo});
    Store.all('pagar').filter(c=>c.status==='pendente').sort(by(c=>c.vencimento)).forEach(c=>{
      const d=diffDays(t,c.vencimento), v=`${esc(c.descricao)} — ${brl(c.valor)}`;
      if(d<0) add('danger','alert',`Conta atrasada há ${-d} dia(s)`,v,'pagar','Contas a pagar');
      else if(d===0) add('danger','clock','Conta vence hoje',v,'pagar','Contas a pagar');
      else if(d<=3) add('warn','clock',`Conta vence em ${d} dia(s)`,v,'pagar','Contas a pagar');
      else if(d<=7) add('info','clock',`Conta vence em ${d} dias`,v,'pagar','Contas a pagar');
    });
    Store.all('receber').filter(r=>r.status==='pendente'&&r.vencimento<t).forEach(r=>add('danger','wallet',`Pagamento atrasado de ${B.nomeCliente(r.clienteId)}`,`${esc(r.descricao)} — ${brl(r.valor)} (venceu em ${fdate(r.vencimento)})`,'receber','Pagamentos pendentes'));
    Store.all('receber').filter(r=>r.status==='pendente'&&r.vencimento>=t&&r.vencimento<=addDays(t,3)).forEach(r=>add('info','wallet',`A receber em breve: ${B.nomeCliente(r.clienteId)}`,`${esc(r.descricao)} — ${brl(r.valor)} (${fdate(r.vencimento)})`,'receber','Pagamentos pendentes'));
    Store.all('alugueis').forEach(a=>{
      const cl=B.nomeCliente(a.clienteId);
      if(a.status==='retirado'){ const d=diffDays(t,a.devolucao);
        if(d<0) add('danger','undo',`Devolução atrasada (${-d} dia/s)`,`${a.numero} · ${esc(cl)}`,'alugueis','Aluguéis');
        else if(d<=2) add('warn','undo',d===0?'Devolução prevista para hoje':`Devolução em ${d} dia(s)`,`${a.numero} · ${esc(cl)}`,'alugueis','Aluguéis'); }
      if(a.status==='reservado'){ const d=diffDays(t,a.retirada);
        if(d<0) add('warn','alert',`Retirada atrasada (${-d} dia/s)`,`${a.numero} · ${esc(cl)}`,'alugueis','Reservas');
        else if(d<=3) add('info','calendar',d===0?'Retirada hoje':`Retirada em ${d} dia(s)`,`${a.numero} · ${esc(cl)} · evento ${fdate(a.evento)}`,'alugueis','Reservas'); }
    });
    const man=Store.all('pecas').filter(p=>p.status==='manutencao'); if(man.length) add('warn','sliders',`${man.length} peça(s) em manutenção`,man.slice(0,3).map(B.pecaLabel).map(esc).join(' | ')+(man.length>3?'…':''),'produtos','Estoque');
    const lav=Store.all('pecas').filter(p=>p.status==='lavagem'); if(lav.length) add('info','refresh',`${lav.length} peça(s) em lavagem`,'Marque como disponível ao retornar.','produtos','Estoque');
    const min=num(B.cfg().estoqueMin);
    Store.all('produtos').forEach(p=>{ const e=B.estoqueProduto(p.id); if(e.total&&e.disp<=min) add(e.disp===0?'danger':'warn','box',e.disp===0?`Sem estoque disponível: ${p.nome}`:`Estoque baixo: ${p.nome}`,`${e.disp} de ${e.total} unidade(s) disponível(is)`,'produtos','Estoque'); });
    Store.all('agenda').filter(a=>a.data===t&&a.status!=='cancelado'&&a.status!=='concluido').sort(by(a=>a.hora||'')).forEach(a=>add('info','calendar',`Hoje ${a.hora||''} · ${a.tipo}`,`${esc(a.titulo||'')} ${a.clienteId?'— '+esc(B.nomeCliente(a.clienteId)):''}`,'agenda','Compromissos do dia'));
    Store.all('agenda').filter(a=>a.data===addDays(t,1)&&a.status==='agendado').forEach(a=>add('info','calendar',`Amanhã ${a.hora||''} · ${a.tipo}`,`${esc(a.titulo||'')}`,'agenda','Compromissos'));
    const rank={danger:0,warn:1,info:2}; return L.sort((a,b)=>rank[a.nivel]-rank[b.nivel]);
  },

  /* ---------- documentos ---------- */
  headerDoc(){ const c=B.cfg(); return `<div class="c"><h1>${esc(c.nome||'Noiva & Cia.')}</h1><div class="muted">${esc([c.cnpj&&'CNPJ '+c.cnpj,c.telefone,c.email].filter(Boolean).join(' · '))}</div><div class="muted">${esc(c.endereco||'')}</div></div><hr>`; },
  comprovanteVenda(v){
    const cl=v.clienteId?B.cliente(v.clienteId):null;
    return `${B.headerDoc()}<h3 class="c">COMPROVANTE DE VENDA ${esc(v.numero)}</h3><p class="c muted">${fdt(v.data)}</p>
    <p><b>Cliente:</b> ${esc(cl?cl.nome:'Consumidor')} &nbsp; <b>Vendedor:</b> ${esc(B.nomeUser(v.vendedorId))}</p>
    <table><thead><tr><th>Item</th><th>Tam.</th><th class="r">Valor</th></tr></thead><tbody>${v.itens.map(i=>`<tr><td>${esc(i.nome)}<br><small class="muted">${esc(i.codigo||'')}</small></td><td>${esc(i.tam||'')}</td><td class="r">${brl(i.preco)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="2" class="r">Subtotal</td><td class="r">${brl(v.subtotal)}</td></tr>${v.desconto?`<tr><td colspan="2" class="r">Desconto</td><td class="r">- ${brl(v.desconto)}</td></tr>`:''}<tr class="tot"><td colspan="2" class="r">TOTAL</td><td class="r">${brl(v.total)}</td></tr></tfoot></table>
    <p><b>Pagamento:</b> ${esc(FORMA_L[v.forma]||v.forma)}${v.forma==='parcelado'?` — entrada ${brl(v.entrada)} + ${v.parcelas}x`:''}</p>${v.obs?`<p><b>Obs.:</b> ${esc(v.obs)}</p>`:''}
    <p class="c muted" style="margin-top:24px">Obrigado pela preferência! Este documento não possui valor fiscal.</p>`;
  },
  contratoAluguel(a){
    const cl=B.cliente(a.clienteId)||{}, c=B.cfg();
    return `${B.headerDoc()}<h3 class="c">CONTRATO DE LOCAÇÃO ${esc(a.numero)}</h3>
    <div class="box"><b>LOCATÁRIO:</b> ${esc(cl.nome||'')} · CPF ${esc(cl.cpf||'—')} · Tel. ${esc(cl.telefone||cl.whatsapp||'—')}<br>${esc(cl.endereco||'')}</div>
    <table><thead><tr><th>Peça</th><th>Tam.</th><th class="r">Valor</th></tr></thead><tbody>${a.itens.map(i=>{ const p=B.peca(i.pecaId)||{}, pr=B.produto(p.produtoId)||{}; return `<tr><td>${esc(pr.nome||'')} <small class="muted">${esc(p.codigo||'')}</small></td><td>${esc(p.tamanho||'')}</td><td class="r">${brl(i.valor)}</td></tr>`; }).join('')}</tbody>
    <tfoot><tr class="tot"><td colspan="2" class="r">TOTAL</td><td class="r">${brl(a.total)}</td></tr></tfoot></table>
    <div class="box"><b>Retirada:</b> ${fdate(a.retirada)} &nbsp; <b>Evento:</b> ${fdate(a.evento)} &nbsp; <b>Devolução prevista:</b> ${fdate(a.devolucao)}<br>
    <b>Sinal:</b> ${brl(a.sinal)} (${esc(FORMA_L[a.formaSinal]||'—')}) &nbsp; <b>Restante:</b> ${brl(a.total-a.sinal)} &nbsp; <b>Caução/garantia:</b> ${a.caucaoTipo&&a.caucaoTipo!=='Nenhuma'?esc(a.caucaoTipo)+' '+(a.caucaoValor?brl(a.caucaoValor):''):'—'}</div>
    ${a.obs?`<p><b>Observações:</b> ${esc(a.obs)}</p>`:''}
    <h4>Cláusulas</h4>${esc(c.contrato||DEFAULT_CONTRATO).split('\n').map(l=>`<p>${l}</p>`).join('')}
    <p style="margin-top:18px">${esc((c.endereco||'').split(',').pop()||'')}, ${fdate(today())}.</p>
    <div class="sign"><div>LOCADOR<br>${esc(c.nome||'')}</div><div>LOCATÁRIO<br>${esc(cl.nome||'')}</div></div>`;
  }
};
