/* ===== views-vendas.js – PDV rápido + histórico de vendas ===== */
const addMonths=(iso,n)=>{ const [y,m,d]=iso.split('-').map(Number); const t=new Date(y,m-1+n,1); const last=new Date(t.getFullYear(),t.getMonth()+1,0).getDate(); return isoDate(new Date(t.getFullYear(),t.getMonth(),Math.min(d,last))); };
const PDV={cart:[],q:'',cat:'',clienteId:'',vendedorId:'',descTipo:'valor',desc:'',forma:'dinheiro',parcelas:2,entrada:'',formaEntrada:'dinheiro',venc1:'',recebido:'',obs:''};
const VdState={tab:'pdv',q:'',st:''};

Views.vendas=main=>{
  if(!PDV.vendedorId&&Auth.user) PDV.vendedorId=Auth.user.id;
  main.innerHTML=`<div class="page-head"><div><h1>Vendas</h1><p class="sub">Ponto de venda rápido – o estoque e o caixa são atualizados automaticamente.</p></div></div>
  <div class="tabs"><button class="tab ${VdState.tab==='pdv'?'active':''}" data-act="vd-tab" data-t="pdv">Nova venda</button><button class="tab ${VdState.tab==='hist'?'active':''}" data-act="vd-tab" data-t="hist">Histórico de vendas</button></div><div id="vd-body"></div>`;
  VdState.tab==='pdv'?pdvRender():histRender();
};
Act['vd-tab']=el=>{ VdState.tab=el.dataset.t; Router.render(); };

/* ---------- PDV ---------- */
function pdvCalc(){
  const sub=sum(PDV.cart,i=>i.preco); let desc=PDV.descTipo==='pct'?r2(sub*Math.min(100,num(PDV.desc))/100):Math.min(num(PDV.desc),sub);
  const total=r2(Math.max(0,sub-desc)); const entrada=Math.min(num(PDV.entrada),total); const n=Math.max(2,Math.min(24,parseInt(PDV.parcelas)||2));
  return {sub,desc,total,entrada,n,parc:r2((total-entrada)/n)};
}
function pdvRender(){
  const cats=[...new Set(Store.all('produtos').map(p=>p.categoria))];
  $('#vd-body').innerHTML=`<div class="pdv"><div class="card"><div class="toolbar"><div class="search">${ico('search',16)}<input data-inp="pdv-q" placeholder="Buscar produto, SKU, cor, tamanho…" value="${esc(PDV.q)}" aria-label="Buscar produto"></div>
    <select data-chg="pdv-cat" aria-label="Categoria"><option value="">Todas as categorias</option>${cats.map(c=>`<option ${PDV.cat===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div><div id="pdv-grid"></div></div>
   <div class="card cart"><h3>Carrinho</h3><div id="pdv-lines"></div>
    <div class="field"><label>Cliente (opcional)</label><select data-chg="pdv-f" data-f="clienteId"><option value="">Consumidor final</option>${Store.all('clientes').sort(by(c=>norm(c.nome))).map(c=>`<option value="${c.id}" ${PDV.clienteId===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}</select></div>
    <div class="field"><label>Vendedor responsável</label><select data-chg="pdv-f" data-f="vendedorId">${Store.all('usuarios').filter(u=>u.ativo!==false).map(u=>`<option value="${u.id}" ${PDV.vendedorId===u.id?'selected':''}>${esc(u.nome)}</option>`).join('')}</select></div>
    <div class="field"><label>Desconto</label><div style="display:flex;gap:8px"><input data-inp="pdv-f" data-f="desc" data-money inputmode="decimal" placeholder="0,00" value="${esc(PDV.desc)}"><select data-chg="pdv-f" data-f="descTipo" style="width:90px"><option value="valor" ${PDV.descTipo==='valor'?'selected':''}>R$</option><option value="pct" ${PDV.descTipo==='pct'?'selected':''}>%</option></select></div></div>
    <div id="pdv-totals" class="totals"></div><label style="font-size:11.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted)">Forma de pagamento</label><div class="pay-btns" id="pdv-paybtns"></div><div id="pdv-pay"></div>
    <div class="field"><label>Observações</label><input data-inp="pdv-f" data-f="obs" value="${esc(PDV.obs)}"></div>
    <button class="btn primary block lg" data-act="pdv-finish">${ico('check')} Finalizar venda</button><button class="btn ghost sm block" style="margin-top:8px" data-act="pdv-clear">Limpar carrinho</button></div></div>`;
  pdvGrid(); pdvLines(); pdvTotals(); pdvPay();
}
function pdvGrid(){
  const el=$('#pdv-grid'); if(!el) return; const q=norm(PDV.q), inCart=new Set(PDV.cart.map(i=>i.pecaId));
  const list=B.pecasDisponiveis().filter(p=>{ const pr=B.produto(p.produtoId)||{}; return (!PDV.cat||pr.categoria===PDV.cat)&&(!q||norm([pr.nome,pr.sku,pr.cor,pr.marca,p.tamanho,p.codigo].join(' ')).includes(q)); }).sort(by(p=>norm((B.produto(p.produtoId)||{}).nome)));
  el.innerHTML=list.length?`<div class="pgrid">${list.map(p=>{ const pr=B.produto(p.produtoId)||{}; return `<button class="pcard ${inCart.has(p.id)?'in':''}" data-act="pdv-add" data-id="${p.id}"><div class="pimg" style="${pr.fotos&&pr.fotos[0]?`background-image:url('${esc(pr.fotos[0])}')`:''}">${pr.fotos&&pr.fotos[0]?'':ico('shirt',34)}</div><div class="pinfo"><b>${esc(pr.nome)}</b><small>Tam ${esc(p.tamanho)}${pr.cor?' · '+esc(pr.cor):''}</small><div class="pp">${brl(pr.venda)}</div></div></button>`; }).join('')}</div>`:`<div class="empty"><p>Nenhuma peça disponível para venda${Store.all('produtos').length?'.':' – cadastre produtos em Produtos e estoque.'}</p></div>`;
}
function pdvLines(){
  const el=$('#pdv-lines'); if(!el) return;
  el.innerHTML=PDV.cart.length?PDV.cart.map((i,ix)=>{ const p=B.peca(i.pecaId), pr=p?B.produto(p.produtoId):{}; return `<div class="cart-line"><div class="cl-i"><b>${esc(pr.nome||'?')}</b><br><small>Tam ${esc(p?p.tamanho:'')} · ${esc(p?p.codigo:'')}</small></div><input style="width:96px" data-inp="pdv-price" data-i="${ix}" data-money inputmode="decimal" value="${String(r2(i.preco)).replace('.',',')}" aria-label="Preço"><button class="icon-btn" data-act="pdv-rm" data-i="${ix}" aria-label="Remover">${ico('x',16)}</button></div>`; }).join(''):'<div class="empty"><p>Clique em uma peça para adicioná-la.</p></div>';
}
function pdvTotals(){
  const c=pdvCalc(), el=$('#pdv-totals'); if(!el) return;
  el.innerHTML=`<div><span>Subtotal (${PDV.cart.length} item/ns)</span><span>${brl(c.sub)}</span></div>${c.desc?`<div><span>Desconto</span><span class="neg">- ${brl(c.desc)}</span></div>`:''}<div class="big"><span>Total</span><span>${brl(c.total)}</span></div>`;
  const tr=$('#pdv-troco'); if(tr){ const rec=num(PDV.recebido); tr.textContent=rec?(rec>=c.total?`Troco: ${brl(rec-c.total)}`:`Falta: ${brl(c.total-rec)}`):''; }
  const pp=$('#pdv-parc'); if(pp) pp.textContent=`${c.n}x de ${brl(c.parc)} (saldo ${brl(c.total-c.entrada)})`;
}
function pdvPay(){
  const b=$('#pdv-paybtns'); if(!b) return; const L=[['dinheiro','Dinheiro','cash'],['pix','PIX','phone'],['credito','Crédito','wallet'],['debito','Débito','wallet'],['parcelado','Parcelado','calendar']];
  b.innerHTML=L.map(([k,l,i])=>`<button class="btn ${PDV.forma===k?'sel':''}" data-act="pdv-forma" data-k="${k}">${ico(i,16)}${l}</button>`).join('');
  const p=$('#pdv-pay'); const f=PDV.forma;
  p.innerHTML=f==='dinheiro'?`<div class="field"><label>Valor recebido</label><input data-inp="pdv-f" data-f="recebido" data-money inputmode="decimal" value="${esc(PDV.recebido)}" placeholder="0,00"><small id="pdv-troco" class="gold"></small></div>`
   :f==='parcelado'?`<div class="grid g2" style="gap:8px"><div class="field"><label>Parcelas</label><input type="number" min="2" max="24" data-inp="pdv-f" data-f="parcelas" value="${esc(PDV.parcelas)}"></div><div class="field"><label>1º vencimento</label><input type="date" data-chg="pdv-f" data-f="venc1" value="${PDV.venc1||addMonths(today(),1)}"></div>
    <div class="field"><label>Entrada (R$)</label><input data-inp="pdv-f" data-f="entrada" data-money inputmode="decimal" value="${esc(PDV.entrada)}" placeholder="0,00"></div><div class="field"><label>Forma da entrada</label><select data-chg="pdv-f" data-f="formaEntrada">${FORMAS.map(([a,l])=>`<option value="${a}" ${PDV.formaEntrada===a?'selected':''}>${l}</option>`).join('')}</select></div></div><div class="hint" id="pdv-parc"></div>`:'';
  pdvTotals();
}
Act['pdv-add']=el=>{ const i=PDV.cart.findIndex(x=>x.pecaId===el.dataset.id); if(i>=0) PDV.cart.splice(i,1); else { const p=B.peca(el.dataset.id); PDV.cart.push({pecaId:p.id,preco:num((B.produto(p.produtoId)||{}).venda)}); } pdvGrid(); pdvLines(); pdvTotals(); };
Act['pdv-rm']=el=>{ PDV.cart.splice(+el.dataset.i,1); pdvGrid(); pdvLines(); pdvTotals(); };
Act['pdv-clear']=()=>{ Object.assign(PDV,{cart:[],desc:'',entrada:'',recebido:'',obs:'',clienteId:''}); pdvRender(); };
Act['pdv-forma']=el=>{ PDV.forma=el.dataset.k; pdvPay(); };
Inp['pdv-q']=el=>{ PDV.q=el.value; pdvGrid(); };
Chg['pdv-cat']=el=>{ PDV.cat=el.value; pdvGrid(); };
Inp['pdv-price']=el=>{ PDV.cart[+el.dataset.i].preco=num(el.value); pdvTotals(); };
Inp['pdv-f']=el=>{ PDV[el.dataset.f]=el.value; pdvTotals(); };
Chg['pdv-f']=el=>{ PDV[el.dataset.f]=el.value; if(el.dataset.f==='descTipo') pdvTotals(); };
Act['pdv-finish']=()=>{
  const c=pdvCalc(); if(!PDV.cart.length){ toast('Adicione ao menos um item ao carrinho.','err'); return; }
  if(PDV.cart.some(i=>i.preco<=0)){ toast('Há item com preço zerado.','err'); return; }
  if(PDV.cart.some(i=>{ const p=B.peca(i.pecaId); return !p||p.status!=='disponivel'; })){ toast('Alguma peça do carrinho não está mais disponível.','err'); return; }
  const parc=PDV.forma==='parcelado'; const receber=parc?c.entrada:c.total;
  if(parc){ if(!PDV.clienteId){ toast('Venda parcelada exige selecionar o cliente.','err'); return; } if(c.entrada>=c.total){ toast('A entrada deve ser menor que o total.','err'); return; } }
  if(receber>0&&!B.caixaAberto()){ toast('Abra o caixa (menu Caixa) antes de receber vendas.','err',5000); return; }
  if(PDV.forma==='dinheiro'&&num(PDV.recebido)&&num(PDV.recebido)<c.total){ toast('O valor recebido é menor que o total.','err'); return; }
  const itens=PDV.cart.map(i=>{ const p=B.peca(i.pecaId), pr=B.produto(p.produtoId)||{}; return {pecaId:p.id,produtoId:pr.id,nome:pr.nome,tam:p.tamanho,codigo:p.codigo,preco:r2(i.preco)}; });
  const dt=nowISO();
  const v=Store.save('vendas',{numero:B.nextNum('vendas','V'),clienteId:PDV.clienteId,vendedorId:PDV.vendedorId||Auth.user.id,itens,subtotal:c.sub,desconto:c.desc,total:c.total,forma:PDV.forma,parcelas:parc?c.n:1,entrada:parc?c.entrada:0,formaEntrada:PDV.formaEntrada,obs:PDV.obs.trim(),data:dt,dia:isoDate(new Date(dt)),status:'concluida'});
  itens.forEach(i=>Store.patch('pecas',i.pecaId,{status:'vendida'}));
  const cli=PDV.clienteId?B.nomeCliente(PDV.clienteId):'Consumidor';
  if(receber>0) B.mov({tipo:'venda',forma:parc?PDV.formaEntrada:PDV.forma,valor:receber,descricao:`Venda ${v.numero} – ${cli}${parc?' (entrada)':''}`,origemTipo:'venda',origemId:v.id});
  if(parc){ const venc=PDV.venc1||addMonths(today(),1); let acc=0; for(let i=1;i<=c.n;i++){ const val=i===c.n?r2(c.total-c.entrada-acc):c.parc; acc=r2(acc+val); Store.save('receber',{descricao:`Venda ${v.numero} – parcela ${i}/${c.n}`,clienteId:PDV.clienteId,valor:val,vencimento:addMonths(venc,i-1),status:'pendente',origemTipo:'venda',origemId:v.id,parcela:`${i}/${c.n}`}); } }
  Object.assign(PDV,{cart:[],desc:'',entrada:'',recebido:'',obs:'',clienteId:''});
  toast(`Venda ${v.numero} concluída!`); vendaComprovante(v.id); pdvRender();
};
function vendaComprovante(id){ const v=Store.get('vendas',id); if(!v) return;
  const m=modal({title:`Venda ${v.numero}`,body:`<div style="background:#fff;color:#222;padding:16px;border-radius:10px;font-family:Georgia,serif">${B.comprovanteVenda(v)}</div>`,footer:`<button class="btn ghost" data-close>Fechar</button><button class="btn primary" data-p>${ico('print',16)} Imprimir comprovante</button>`});
  $('[data-p]',m).onclick=()=>printHtml(B.comprovanteVenda(v),'Comprovante '+v.numero); }

/* ---------- histórico ---------- */
function histRender(){
  $('#vd-body').innerHTML=`<div class="card"><div class="toolbar"><div class="search">${ico('search',16)}<input data-inp="vd-q" placeholder="Buscar por nº, cliente, vendedor ou item…" value="${esc(VdState.q)}" aria-label="Buscar"></div>
  <select data-chg="vd-st" aria-label="Status"><option value="">Status: todos</option><option value="concluida" ${VdState.st==='concluida'?'selected':''}>Concluídas</option><option value="cancelada" ${VdState.st==='cancelada'?'selected':''}>Canceladas</option></select></div><div id="vd-list"></div></div>`; histList();
}
function histList(){
  const el=$('#vd-list'); if(!el) return; const q=norm(VdState.q);
  const rows=Store.all('vendas').filter(v=>(!VdState.st||v.status===VdState.st)&&(!q||norm([v.numero,B.nomeCliente(v.clienteId),B.nomeUser(v.vendedorId),v.itens.map(i=>i.nome).join(' ')].join(' ')).includes(q))).sort(by(v=>v.data,-1));
  el.innerHTML=`<div class="count">${rows.length} venda(s) · total ${brl(sum(rows.filter(v=>v.status==='concluida'),v=>v.total))}</div>`+tbl([
    {h:'Nº',f:v=>`<b>${v.numero}</b>`},{h:'Data',f:v=>fdt(v.data)},{h:'Cliente',f:v=>v.clienteId?esc(B.nomeCliente(v.clienteId)):'<span class="muted">Consumidor</span>'},{h:'Vendedor',f:v=>esc(B.nomeUser(v.vendedorId))},
    {h:'Itens',f:v=>v.itens.map(i=>`<small>${esc(i.nome)} (${esc(i.tam)})</small>`).join('<br>')},{h:'Pagamento',f:v=>esc(FORMA_L[v.forma]||v.forma)+(v.forma==='parcelado'?` ${v.parcelas}x`:'')},
    {h:'Total',cls:'r',f:v=>brl(v.total)},{h:'Status',f:v=>badge(v.status==='concluida'?'Concluída':'Cancelada',v.status==='concluida'?'ok':'muted')},
    {h:'',cls:'act',f:v=>`<div class="row-actions">${iconBtn('vd-view',v.id,'print','Comprovante')}${v.status==='concluida'?iconBtn('vd-cancel',v.id,'undo','Cancelar venda'):''}${v.status==='cancelada'&&Auth.can('excluir')?iconBtn('vd-del',v.id,'trash','Excluir'):''}</div>`}
  ],rows,{empty:'Nenhuma venda registrada.'});
}
Inp['vd-q']=el=>{ VdState.q=el.value; histList(); }; Chg['vd-st']=el=>{ VdState.st=el.value; histList(); };
Act['vd-view']=el=>vendaComprovante(el.dataset.id);
Act['vd-del']=async el=>{ if(await confirmBox('Excluir definitivamente esta venda cancelada?',{danger:true,ok:'Excluir'})){ Store.remove('vendas',el.dataset.id); Router.refresh(true); } };
Act['vd-cancel']=async el=>{
  const v=Store.get('vendas',el.dataset.id); if(!v) return;
  const movs=Store.all('movimentos').filter(m=>m.origemTipo==='venda'&&m.origemId===v.id&&(m.tipo==='venda'||m.tipo==='recebimento'));
  if(movs.length&&!B.caixaAberto()){ toast('Abra o caixa para registrar o estorno dos valores recebidos.','err',5000); return; }
  if(!await confirmBox(`Cancelar a venda <b>${v.numero}</b> (${brl(v.total)})? As peças voltam ao estoque${movs.length?` e será lançado um estorno de ${brl(sum(movs,m=>m.valor))} no caixa`:''}.`,{danger:true,ok:'Cancelar venda'})) return;
  Store.patch('vendas',v.id,{status:'cancelada'}); v.itens.forEach(i=>{ const p=B.peca(i.pecaId); if(p&&p.status==='vendida') Store.patch('pecas',p.id,{status:'disponivel'}); });
  movs.forEach(m=>B.mov({tipo:'estorno',forma:m.forma,valor:m.valor,descricao:`Estorno da venda ${v.numero}`,origemTipo:'venda',origemId:v.id}));
  Store.all('receber').filter(r=>r.origemTipo==='venda'&&r.origemId===v.id&&r.status==='pendente').forEach(r=>Store.patch('receber',r.id,{status:'cancelado'}));
  toast('Venda cancelada.'); Router.refresh(true);
};
