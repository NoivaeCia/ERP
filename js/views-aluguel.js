/* ===== views-aluguel.js – locações, disponibilidade, calendário de reservas, contrato ===== */
const AlState={tab:'lista',q:'',st:''};
const CAUCAO=['Nenhuma','Dinheiro','Cheque','Documento com foto','Cartão (pré-autorização)','Outra'];
const firstName=n=>String(n||'').trim().split(/\s+/)[0]||'';

Views.alugueis=main=>{
  main.innerHTML=`<div class="page-head"><div><h1>Aluguéis</h1><p class="sub">Reservas, retiradas, devoluções e contratos – com checagem automática de disponibilidade.</p></div>
  <div class="head-actions"><button class="btn primary" data-act="al-new">${ico('plus')} Novo aluguel</button></div></div>
  <div class="tabs"><button class="tab ${AlState.tab==='lista'?'active':''}" data-act="al-tab" data-t="lista">Lista</button><button class="tab ${AlState.tab==='cal'?'active':''}" data-act="al-tab" data-t="cal">Calendário de reservas</button></div>
  <div id="al-body"></div>`;
  alBody();
};
function alBody(){
  const box=$('#al-body'); if(!box) return;
  if(AlState.tab==='cal'){
    box.innerHTML=`<div class="card"><div id="cal-al"></div></div>`;
    const cal=Cals['cal-al']||Calendar('cal-al',{
      modes:[['month','Mês'],['week','Semana']],
      events:(from,to)=>{ const out=[];
        Store.all('alugueis').filter(a=>a.status!=='cancelado').forEach(a=>{ const s=B.alStatus(a), cl=firstName(B.nomeCliente(a.clienteId)); const ttl=`${a.numero} · ${B.nomeCliente(a.clienteId)} (${AL_ST[s][0]})`;
          for(let d=a.retirada;d<=a.devolucao&&d<=to;d=addDays(d,1)){ if(d<from) continue;
            out.push({date:d,id:a.id,cls:'c-'+s,title:ttl,label:d===a.retirada?`↑ ${cl}`:d===a.devolucao?`↓ ${cl}`:''}); }
          if(a.evento>=from&&a.evento<=to) out.push({date:a.evento,id:a.id,cls:'c-evento',title:'Evento – '+ttl,label:`★ ${cl}`}); });
        return out; },
      onDay:d=>aluguelForm(null,{retirada:d}), onEvent:id=>aluguelDetalhe(id),
      legend:`<span><i style="background:var(--gold)"></i>Reservado</span><span><i style="background:var(--info)"></i>Retirado</span><span><i style="background:var(--ok)"></i>Devolvido</span><span><i style="background:var(--danger)"></i>Atrasado</span><span><i style="background:var(--rose)"></i>Data do evento</span><span>↑ retirada · ↓ devolução · clique no dia para reservar</span>`});
    cal.render(); return;
  }
  box.innerHTML=`<div class="card"><div class="toolbar"><div class="search">${ico('search',16)}<input data-inp="al-q" placeholder="Buscar por cliente, nº ou peça…" value="${esc(AlState.q)}" aria-label="Buscar"></div>
  <select data-chg="al-st" aria-label="Situação"><option value="">Situação: todas</option>${Object.entries(AL_ST).map(([k,v])=>`<option value="${k}" ${AlState.st===k?'selected':''}>${v[0]}</option>`).join('')}</select></div><div id="al-list"></div></div>`;
  alList();
}
function alList(){
  const el=$('#al-list'); if(!el) return; const q=norm(AlState.q);
  let rows=Store.all('alugueis').filter(a=>(!AlState.st||B.alStatus(a)===AlState.st)&&(!q||norm([a.numero,B.nomeCliente(a.clienteId),a.itens.map(i=>{ const p=B.peca(i.pecaId); return p?B.pecaLabel(p):''; }).join(' ')].join(' ')).includes(q)));
  rows.sort(by(a=>a.evento,-1)); rows.forEach(a=>{ const s=B.alStatus(a); a._cls=s==='atrasado'?'late':''; });
  el.innerHTML=`<div class="count">${rows.length} aluguel(is)</div>`+tbl([
    {h:'Nº',f:a=>`<b>${a.numero}</b>`},{h:'Cliente',f:a=>esc(B.nomeCliente(a.clienteId))},
    {h:'Peças',f:a=>a.itens.map(i=>{ const p=B.peca(i.pecaId); const pr=p?B.produto(p.produtoId):null; return `<small>${esc(pr?pr.nome:'—')} (${esc(p?p.tamanho:'')})</small>`; }).join('<br>')},
    {h:'Retirada',f:a=>fdate(a.retirada)},{h:'Evento',f:a=>fdate(a.evento)},{h:'Devolução',f:a=>fdate(a.devolucao)},
    {h:'Total',cls:'r',f:a=>brl(a.total)},{h:'Restante',cls:'r',f:a=>{ const r=r2(a.total-B.alPago(a)); return r>0?`<span class="neg">${brl(r)}</span>`:'<span class="pos">Quitado</span>'; }},
    {h:'Situação',f:a=>{ const s=B.alStatus(a); return badge(AL_ST[s][0],AL_ST[s][1]); }},
    {h:'',cls:'act',f:a=>`<div class="row-actions">${iconBtn('al-view',a.id,'eye','Ver detalhes')}${a.status==='reservado'?iconBtn('al-edit',a.id,'edit','Editar'):''}${iconBtn('al-contrato',a.id,'print','Contrato')}${a.status==='cancelado'&&Auth.can('excluir')?iconBtn('al-del',a.id,'trash','Excluir'):''}</div>`}
  ],rows,{empty:'Nenhum aluguel encontrado.'});
}
Act['al-tab']=el=>{ AlState.tab=el.dataset.t; Router.render(); };
Act['al-new']=()=>aluguelForm(null);
Act['al-view']=el=>aluguelDetalhe(el.dataset.id);
Act['al-edit']=el=>aluguelForm(el.dataset.id);
Act['al-contrato']=el=>{ const a=Store.get('alugueis',el.dataset.id); a&&printHtml(B.contratoAluguel(a),'Contrato '+a.numero); };
Act['al-del']=async el=>{ if(await confirmBox('Excluir definitivamente este aluguel cancelado?',{danger:true,ok:'Excluir'})){ Store.remove('alugueis',el.dataset.id); toast('Aluguel excluído.'); Router.refresh(true); } };
Inp['al-q']=el=>{ AlState.q=el.value; alList(); };
Chg['al-st']=el=>{ AlState.st=el.value; alList(); };

/* ---------- formulário de aluguel ---------- */
function aluguelForm(id,presets={}){
  const old=id?Store.get('alugueis',id):null;
  if(old&&old.status!=='reservado'){ aluguelDetalhe(id); return; }
  if(!Auth.user) return;
  const v=Object.assign({clienteId:'',vendedorId:Auth.user.id,retirada:'',evento:'',devolucao:'',desconto:0,sinal:0,formaSinal:'pix',formaPagamento:'pix',caucaoTipo:'Nenhuma',caucaoValor:0,obs:''},old||{},presets);
  const st={itens:old?old.itens.map(i=>({...i})):[]};
  const clientesOpts=()=>Store.all('clientes').sort(by(c=>norm(c.nome))).map(c=>`<option value="${c.id}" ${c.id===v.clienteId?'selected':''}>${esc(c.nome)}${c.cpf?' – '+esc(c.cpf):''}</option>`).join('');
  const m=modal({title:old?`Editar aluguel ${old.numero}`:'Novo aluguel',xl:true,body:`<form class="form-grid" novalidate onsubmit="return false">
   <div class="field span2"><label>Cliente <i class="req">*</i></label><div style="display:flex;gap:8px"><select name="clienteId"><option value="">Selecione…</option>${clientesOpts()}</select><button type="button" class="btn ghost sm" data-new-cli>${ico('plus',15)} Novo</button></div></div>
   <div class="field"><label>Vendedor / atendente</label><select name="vendedorId">${Store.all('usuarios').filter(u=>u.ativo!==false).map(u=>`<option value="${u.id}" ${u.id===v.vendedorId?'selected':''}>${esc(u.nome)}</option>`).join('')}</select></div>
   <div class="field"><label>Data da retirada <i class="req">*</i></label><input type="date" name="retirada" value="${v.retirada}"></div>
   <div class="field"><label>Data do evento <i class="req">*</i></label><input type="date" name="evento" value="${v.evento}"></div>
   <div class="field"><label>Devolução prevista <i class="req">*</i></label><input type="date" name="devolucao" value="${v.devolucao}"></div>
   <h4 class="form-sec span3">Peças</h4>
   <div class="field span3"><div style="display:flex;gap:8px"><select name="addPeca" aria-label="Peça"></select><button type="button" class="btn" data-add>${ico('plus',15)} Adicionar</button></div><small>A lista mostra a disponibilidade para o período escolhido. Peças reservadas em datas conflitantes ficam bloqueadas.</small></div>
   <div class="span3" id="al-itens"></div>
   <h4 class="form-sec span3">Valores e pagamento</h4>
   <div class="field"><label>Desconto</label><input name="desconto" data-money inputmode="decimal" value="${v.desconto?String(v.desconto).replace('.',','):''}" placeholder="0,00"></div>
   <div class="field"><label>Sinal ${old?'(já recebido)':''}</label><input name="sinal" data-money inputmode="decimal" ${old?'readonly':''} value="${v.sinal?String(v.sinal).replace('.',','):''}" placeholder="0,00"></div>
   <div class="field"><label>Forma do sinal</label><select name="formaSinal" ${old?'disabled':''}>${FORMAS.map(([a,b])=>`<option value="${a}" ${v.formaSinal===a?'selected':''}>${b}</option>`).join('')}</select></div>
   <div class="span3"><div class="totals"><div><span>Subtotal</span><b id="t-sub"></b></div><div><span>Desconto</span><b id="t-desc"></b></div><div><span>Sinal</span><b id="t-sinal"></b></div><div class="big"><span>Total</span><span id="t-tot"></span></div><div><span>Restante a pagar na retirada</span><b id="t-rest" class="gold"></b></div></div></div>
   <div class="field"><label>Forma de pagamento do restante</label><select name="formaPagamento">${FORMAS.map(([a,b])=>`<option value="${a}" ${v.formaPagamento===a?'selected':''}>${b}</option>`).join('')}</select></div>
   <div class="field"><label>Caução / garantia</label><select name="caucaoTipo">${CAUCAO.map(c=>`<option ${v.caucaoTipo===c?'selected':''}>${c}</option>`).join('')}</select></div>
   <div class="field"><label>Valor da caução</label><input name="caucaoValor" data-money inputmode="decimal" value="${v.caucaoValor?String(v.caucaoValor).replace('.',','):''}" placeholder="0,00"></div>
   <div class="field span3"><label>Observações</label><textarea name="obs" rows="2">${esc(v.obs)}</textarea></div></form>`,
   footer:`<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>${ico('check',16)} ${old?'Salvar alterações':'Reservar'}</button>`});
  const f=$('form',m), q=n=>f.elements[n];
  const dates=()=>({ini:q('retirada').value,fim:q('devolucao').value});
  const check=pid=>{ const {ini,fim}=dates(); if(!ini||!fim) return {ok:true}; return B.pecaLivre(pid,ini,fim,old&&old.id); };
  const subtotal=()=>sum(st.itens,i=>i.valor);
  const draw=()=>{
    const sel=q('addPeca'), {ini,fim}=dates(), inCart=new Set(st.itens.map(i=>i.pecaId)); const groups={};
    Store.all('pecas').filter(p=>p.status!=='vendida'&&!inCart.has(p.id)).forEach(p=>{ const pr=B.produto(p.produtoId)||{nome:'?'}; (groups[pr.nome]=groups[pr.nome]||[]).push(p); });
    sel.innerHTML='<option value="">Selecione uma peça…</option>'+Object.keys(groups).sort().map(n=>`<optgroup label="${esc(n)}">${groups[n].map(p=>{ const r=check(p.id); return `<option value="${p.id}" ${r.ok?'':'disabled'}>Tam ${esc(p.tamanho)} · ${esc(p.codigo)} · ${brl((B.produto(p.produtoId)||{}).aluguel)}${r.ok?'':' — INDISPONÍVEL: '+esc(r.motivo)}</option>`; }).join('')}</optgroup>`).join('');
    $('#al-itens').innerHTML=st.itens.length?st.itens.map((i,ix)=>{ const p=B.peca(i.pecaId), r=check(i.pecaId); return `<div class="itm"><div class="itm-n"><b>${esc(p?B.pecaLabel(p):'?')}</b>${r.ok?'':`<div class="bad">${ico('alert',14)} ${esc(r.motivo)}</div>`}</div><input data-v="${ix}" data-money inputmode="decimal" value="${String(r2(i.valor)).replace('.',',')}" aria-label="Valor"><button type="button" class="icon-btn" data-rm="${ix}" aria-label="Remover">${ico('trash',16)}</button></div>`; }).join(''):'<div class="empty"><p>Nenhuma peça adicionada.</p></div>';
    totals();
  };
  const totals=()=>{ const sub=subtotal(), desc=Math.min(num(q('desconto').value),sub), sinal=num(q('sinal').value), tot=r2(sub-desc);
    $('#t-sub').textContent=brl(sub); $('#t-desc').textContent='- '+brl(desc); $('#t-sinal').textContent=brl(sinal); $('#t-tot').textContent=brl(tot); $('#t-rest').textContent=brl(Math.max(0,tot-sinal)); };
  f.addEventListener('click',e=>{ const a=e.target.closest('[data-add]'), r=e.target.closest('[data-rm]'), n=e.target.closest('[data-new-cli]');
    if(a){ const pid=q('addPeca').value; if(!pid){ toast('Selecione uma peça.','warn'); return; } if(!q('retirada').value||!q('devolucao').value){ toast('Informe antes as datas de retirada e devolução.','warn'); return; } const p=B.peca(pid); st.itens.push({pecaId:pid,valor:num((B.produto(p.produtoId)||{}).aluguel)}); draw(); }
    if(r){ st.itens.splice(+r.dataset.rm,1); draw(); }
    if(n){ const before=Store.all('clientes').length; const mm=crudOpen(Crud.clientes); const oc=mm.close; mm.close=function(){ oc.call(mm); const all=Store.all('clientes'); const sel=q('clienteId'); const cur=sel.value; sel.innerHTML='<option value="">Selecione…</option>'+all.sort(by(c=>norm(c.nome))).map(c=>`<option value="${c.id}">${esc(c.nome)}${c.cpf?' – '+esc(c.cpf):''}</option>`).join(''); if(all.length>before){ sel.value=all.slice().sort(by(c=>c._u,-1))[0].id; } else sel.value=cur; }; } });
  f.addEventListener('input',e=>{ if(e.target.dataset.v!=null){ st.itens[+e.target.dataset.v].valor=num(e.target.value); } totals(); });
  f.addEventListener('change',e=>{ const n=e.target.name;
    if(n==='evento'&&e.target.value){ if(!q('retirada').value) q('retirada').value=addDays(e.target.value,-2); if(!q('devolucao').value) q('devolucao').value=addDays(e.target.value,2); }
    if(['retirada','evento','devolucao'].includes(n)) draw(); });
  draw();
  $('[data-save]',m).onclick=()=>{
    const d={clienteId:q('clienteId').value,vendedorId:q('vendedorId').value,retirada:q('retirada').value,evento:q('evento').value,devolucao:q('devolucao').value,
      desconto:num(q('desconto').value),sinal:old?old.sinal:num(q('sinal').value),formaSinal:old?old.formaSinal:q('formaSinal').value,formaPagamento:q('formaPagamento').value,
      caucaoTipo:q('caucaoTipo').value,caucaoValor:num(q('caucaoValor').value),obs:q('obs').value.trim()};
    const err=(msg)=>toast(msg,'err',5000);
    if(!d.clienteId) return err('Selecione o cliente.');
    if(!d.retirada||!d.evento||!d.devolucao) return err('Informe as datas de retirada, evento e devolução.');
    if(d.retirada>d.evento) return err('A retirada deve ser anterior ou igual à data do evento.');
    if(d.devolucao<d.evento) return err('A devolução deve ser igual ou posterior à data do evento.');
    if(!st.itens.length) return err('Adicione ao menos uma peça.');
    for(const i of st.itens){ const r=B.pecaLivre(i.pecaId,d.retirada,d.devolucao,old&&old.id); if(!r.ok) return err(`Conflito: ${B.pecaLabel(B.peca(i.pecaId))} – ${r.motivo}.`); }
    const sub=sum(st.itens,i=>i.valor); if(d.desconto>sub) return err('O desconto não pode ser maior que o subtotal.');
    d.total=r2(sub-d.desconto); if(d.sinal<0||d.sinal>d.total) return err('O sinal não pode ser maior que o total.');
    if(!old&&d.sinal>0&&!B.caixaAberto()) return err('Abra o caixa (menu Caixa) para registrar o sinal recebido.');
    const rec=Object.assign({},old||{},d,{itens:st.itens.map(i=>({pecaId:i.pecaId,valor:r2(i.valor)}))});
    if(!old){ rec.numero=B.nextNum('alugueis','A'); rec.status='reservado'; rec.criadoEm=nowISO(); }
    const saved=Store.save('alugueis',rec);
    if(!old&&d.sinal>0) B.mov({tipo:'aluguel',forma:d.formaSinal,valor:d.sinal,descricao:`Sinal do aluguel ${saved.numero} – ${B.nomeCliente(d.clienteId)}`,origemTipo:'aluguel',origemId:saved.id});
    const ids=new Set([...(old?old.itens.map(i=>i.pecaId):[]),...saved.itens.map(i=>i.pecaId)]); ids.forEach(pid=>B.refreshPeca(pid));
    B.syncReceberAluguel(saved); m.close(); toast(old?'Aluguel atualizado.':`Reserva ${saved.numero} criada.`); Router.refresh(true);
    if(!old) aluguelDetalhe(saved.id);
  };
}

/* ---------- detalhes e ações ---------- */
function aluguelDetalhe(id){
  const a=Store.get('alugueis',id); if(!a) return; const s=B.alStatus(a), pago=B.alPago(a), rest=r2(a.total-pago);
  const rec=Store.all('receber').find(r=>r.origemTipo==='aluguel'&&r.origemId===a.id&&r.status==='pendente');
  const m=modal({title:`Aluguel ${a.numero} ${badge(AL_ST[s][0],AL_ST[s][1])}`,wide:true,body:`
    <div class="grid g2"><dl class="dl"><dt>Cliente</dt><dd><b>${esc(B.nomeCliente(a.clienteId))}</b></dd><dt>Atendente</dt><dd>${esc(B.nomeUser(a.vendedorId))}</dd><dt>Retirada</dt><dd>${fdate(a.retirada)}${a.retiradaEm?` <small class="muted">(feita ${fdt(a.retiradaEm)})</small>`:''}</dd><dt>Evento</dt><dd>${fdate(a.evento)}</dd><dt>Devolução prevista</dt><dd>${fdate(a.devolucao)}${a.devolvidoEm?` <small class="muted">(devolvido ${fdt(a.devolvidoEm)})</small>`:''}</dd></dl>
    <dl class="dl"><dt>Total</dt><dd><b>${brl(a.total)}</b>${a.desconto?` <small class="muted">(desconto ${brl(a.desconto)})</small>`:''}</dd><dt>Sinal</dt><dd>${brl(a.sinal)} (${esc(FORMA_L[a.formaSinal]||'—')})</dd><dt>Total pago</dt><dd class="pos">${brl(pago)}</dd><dt>Restante</dt><dd class="${rest>0?'neg':'pos'}"><b>${rest>0?brl(rest):'Quitado'}</b></dd><dt>Caução</dt><dd>${a.caucaoTipo&&a.caucaoTipo!=='Nenhuma'?esc(a.caucaoTipo)+(a.caucaoValor?' – '+brl(a.caucaoValor):'')+(a.caucaoDevolvida?' (devolvida)':''):'—'}</dd></dl></div>
    <h4 class="gold" style="margin:14px 0 6px">Peças</h4>${tbl([{h:'Peça',f:i=>{ const p=B.peca(i.pecaId); return esc(p?B.pecaLabel(p):'—'); }},{h:'Valor',cls:'r',f:i=>brl(i.valor)}],a.itens)}
    ${a.obs?`<p><b>Observações:</b> ${esc(a.obs)}</p>`:''}${a.multa?`<p class="neg"><b>Multa/avarias cobradas:</b> ${brl(a.multa)}</p>`:''}`,
    footer:`<button class="btn ghost" data-close>Fechar</button><button class="btn" data-c>${ico('print',16)} Contrato</button>
    ${rec?`<button class="btn" data-rec>${ico('down',16)} Receber saldo</button>`:''}
    ${a.status==='reservado'?`<button class="btn" data-e>${ico('edit',16)} Editar</button><button class="btn ok" data-ret>${ico('check',16)} Registrar retirada</button>`:''}
    ${a.status==='retirado'?`<button class="btn ok" data-dev>${ico('undo',16)} Registrar devolução</button>`:''}
    ${['reservado','retirado'].includes(a.status)?`<button class="btn danger" data-x>Cancelar aluguel</button>`:''}`});
  const on=(s,fn)=>{ const b=$(s,m); if(b) b.onclick=fn; };
  on('[data-c]',()=>printHtml(B.contratoAluguel(a),'Contrato '+a.numero));
  on('[data-rec]',()=>{ m.close(); receberConta(rec.id); });
  on('[data-e]',()=>{ m.close(); aluguelForm(a.id); });
  on('[data-ret]',async()=>{ const msg=rest>0?`Há <b>${brl(rest)}</b> ainda a receber. Registrar a retirada mesmo assim?`:'Confirmar a retirada das peças pelo cliente?'; if(!await confirmBox(msg,{ok:'Registrar retirada'})) return;
    Store.patch('alugueis',a.id,{status:'retirado',retiradaEm:nowISO()}); a.itens.forEach(i=>B.refreshPeca(i.pecaId)); m.close(); toast('Retirada registrada.'); Router.refresh(true); });
  on('[data-dev]',()=>{ m.close(); devolucaoForm(a.id); });
  on('[data-x]',async()=>{ if(!await confirmBox(`Cancelar o aluguel <b>${a.numero}</b>? As peças serão liberadas.${a.sinal?`<br><br>O sinal de ${brl(a.sinal)} <b>não</b> é devolvido automaticamente – registre uma saída no Caixa se for reembolsar.`:''}`,{danger:true,ok:'Cancelar aluguel'})) return;
    Store.patch('alugueis',a.id,{status:'cancelado'}); Store.all('receber').filter(r=>r.origemTipo==='aluguel'&&r.origemId===a.id&&r.status==='pendente').forEach(r=>Store.patch('receber',r.id,{status:'cancelado'}));
    a.itens.forEach(i=>B.refreshPeca(i.pecaId)); m.close(); toast('Aluguel cancelado.'); Router.refresh(true); });
}
function devolucaoForm(id){
  const a=Store.get('alugueis',id); const hoje=today(); const atraso=Math.max(0,diffDays(a.devolucao,hoje)); const sug=atraso?r2(a.total*0.1*atraso):0;
  const m=modal({title:`Devolução – ${a.numero}`,body:`<form class="form-grid" onsubmit="return false" style="grid-template-columns:1fr 1fr">
    <div class="field"><label>Data da devolução</label><input type="date" name="data" value="${hoje}"></div>
    <div class="field"><label>Multa / avarias (R$)</label><input name="multa" data-money inputmode="decimal" value="${sug?String(sug).replace('.',','):''}" placeholder="0,00"><small>${atraso?`Atraso de ${atraso} dia(s): sugestão de 10% do total por dia (cláusula 3 do contrato). Ajuste se necessário.`:'Preencha se houver danos ou cobrança extra.'}</small></div>
    <label class="check field"><input type="checkbox" name="lav" checked><span>Enviar peças para lavagem</span></label>
    ${a.caucaoTipo&&a.caucaoTipo!=='Nenhuma'?`<label class="check field"><input type="checkbox" name="cau" checked><span>Caução devolvida ao cliente</span></label>`:''}
    <div class="field" style="grid-column:1/-1"><label>Observações da devolução</label><textarea name="obs" rows="2"></textarea></div></form>`,
    footer:`<button class="btn ghost" data-close>Cancelar</button><button class="btn ok" data-ok>${ico('check',16)} Confirmar devolução</button>`});
  const f=$('form',m);
  $('[data-ok]',m).onclick=()=>{
    const multa=num(f.elements.multa.value), d=f.elements.data.value||hoje;
    Store.patch('alugueis',a.id,{status:'devolvido',devolvidoEm:d+'T12:00:00',multa,caucaoDevolvida:f.elements.cau?f.elements.cau.checked:false,obsDevolucao:f.elements.obs.value.trim()});
    a.itens.forEach(i=>{ if(f.elements.lav.checked) Store.patch('pecas',i.pecaId,{status:'lavagem'}); else B.refreshPeca(i.pecaId); });
    if(multa>0) Store.save('receber',{descricao:`Multa/avarias do aluguel ${a.numero}`,clienteId:a.clienteId,valor:multa,vencimento:hoje,status:'pendente',origemTipo:'multa',origemId:a.id,parcela:''});
    m.close(); toast('Devolução registrada.'); Router.refresh(true);
  };
}
