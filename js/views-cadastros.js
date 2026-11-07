/* ===== views-cadastros.js – Produtos, Peças (unidades) e Clientes ===== */
const nextSku=()=>'P'+pad((Store.db.produtos.length||0)+1,4);
let _gen=null;
function genPecas(prod,tams,qtd){
  const list=String(tams||'').split(/[,;\/]+/).map(s=>s.trim()).filter(Boolean); if(!list.length) list.push('Único');
  let n=0; list.forEach(t=>{ for(let i=0;i<Math.max(1,num(qtd)||1);i++){
    const seq=Store.all('pecas').filter(p=>p.produtoId===prod.id&&p.tamanho===t).length+1;
    Store.save('pecas',{produtoId:prod.id,codigo:`${prod.sku}-${t}-${seq}`,tamanho:t,status:'disponivel',conservacao:prod.conservacao,localizacao:prod.localizacao||'',obs:''}); n++; } });
  return n;
}
const pecaEmUso=id=>Store.all('alugueis').some(a=>a.itens.some(i=>i.pecaId===id))||Store.all('vendas').some(v=>v.itens.some(i=>i.pecaId===id));

/* ---------- PRODUTOS ---------- */
Views.produtos=crudView({
  key:'produtos',col:'produtos',title:'Produtos e estoque',singular:'Produto',wide:true,newLabel:'Novo produto',
  sub:'Modelos com fotos, preços e controle individual de cada unidade (tamanho).',
  label:r=>r.nome, defaults:()=>({sku:nextSku(),categoria:'Vestido de noiva',conservacao:'Novo',qtd:1}),
  fields:old=>[
    {section:'Identificação'},
    {k:'sku',label:'Código / SKU',required:true},{k:'nome',label:'Nome do produto',required:true,span:2},
    {k:'categoria',label:'Categoria',type:'select',options:CATEGORIAS,required:true,blank:false},{k:'marca',label:'Marca'},{k:'cor',label:'Cor'},
    {k:'descricao',label:'Descrição',type:'textarea',span:3},{k:'fotos',label:'Fotos',type:'photos',span:3},
    {section:'Valores e conservação'},
    {k:'compra',label:'Valor de compra',type:'money'},{k:'venda',label:'Preço de venda',type:'money'},{k:'aluguel',label:'Preço de aluguel',type:'money'},
    {k:'conservacao',label:'Estado de conservação',type:'select',options:CONSERV,blank:false},{k:'localizacao',label:'Localização no estoque',ph:'Ex.: Arara 3 / Prateleira B',span:2},
    {section:old?'Adicionar mais unidades':'Unidades e tamanhos'},
    {k:'tamanhos',label:'Tamanhos',span:2,ph:'Ex.: 36, 38, 40',hint:'Separe por vírgula – será criada uma peça individual para cada tamanho. Em branco = 1 peça "Único".'},
    {k:'qtd',label:'Unidades por tamanho',type:'number',min:1}
  ],
  validate:(d,old)=>Store.all('produtos').some(p=>p.sku===d.sku&&p.id!==d.id)?'Já existe um produto com este código/SKU.':null,
  before:(d,old)=>{ _gen={t:d.tamanhos,q:d.qtd}; delete d.tamanhos; delete d.qtd; if(old&&!String(_gen.t||'').trim()) _gen=null; },
  after:(saved,old)=>{ if(_gen){ const n=genPecas(saved,_gen.t,_gen.q); toast(`${n} unidade(s) criada(s).`); _gen=null; } },
  text:r=>[r.sku,r.nome,r.categoria,r.marca,r.cor,r.localizacao].join(' '),
  sort:by(r=>norm(r.nome)),
  filters:[{k:'cat',label:'Categoria',options:()=>CATEGORIAS.map(c=>[c,c]),match:(r,v)=>r.categoria===v},
           {k:'est',label:'Estoque',options:()=>[['com','Com disponível'],['sem','Sem disponível']],match:(r,v)=>(B.estoqueProduto(r.id).disp>0)===(v==='com')}],
  cols:[
    {h:'',f:r=>r.fotos&&r.fotos[0]?`<img class="thumb" src="${esc(r.fotos[0])}" alt="" loading="lazy">`:`<div class="thumb ph0">${ico('shirt',20)}</div>`},
    {h:'SKU',f:r=>`<b class="nowrap">${esc(r.sku)}</b>`},
    {h:'Produto',f:r=>`<b>${esc(r.nome)}</b><br><small class="muted">${esc(r.categoria)}${r.marca?' · '+esc(r.marca):''}${r.cor?' · '+esc(r.cor):''}</small>`},
    {h:'Tamanhos',f:r=>{ const g={}; B.estoqueProduto(r.id).ps.forEach(p=>g[p.tamanho]=(g[p.tamanho]||0)+1); return Object.entries(g).map(([t,n])=>`<span class="badge muted">${esc(t)}${n>1?' ×'+n:''}</span>`).join(' ')||'—'; }},
    {h:'Disponíveis',f:r=>{ const e=B.estoqueProduto(r.id); return badge(`${e.disp} / ${e.total}`,e.disp===0?'danger':e.disp<=num(B.cfg().estoqueMin)?'warn':'ok'); }},
    {h:'Venda',cls:'r',f:r=>brl(r.venda)},{h:'Aluguel',cls:'r',f:r=>brl(r.aluguel)}
  ],
  actions:r=>iconBtn('prod-pecas',r.id,'box','Ver peças / unidades'),
  canDelete:r=>B.estoqueProduto(r.id).ps.some(p=>pecaEmUso(p.id))?'Não é possível excluir: há peças deste produto em vendas ou aluguéis.':null,
  onDelete:r=>B.estoqueProduto(r.id).ps.forEach(p=>Store.remove('pecas',p.id))
});
Act['prod-pecas']=el=>{ CrudState.pecas={q:'',f:{produto:el.dataset.id}}; Router.go('pecas'); };

/* ---------- PEÇAS ---------- */
Views.pecas=crudView({
  key:'pecas',col:'pecas',title:'Peças / unidades',singular:'Peça',newLabel:'Nova peça',
  sub:'Controle individual: disponível, reservada, alugada, em manutenção, em lavagem ou vendida.',
  label:r=>r.codigo, defaults:()=>({status:'disponivel',conservacao:'Bom'}),
  fields:[
    {k:'produtoId',label:'Produto (modelo)',type:'select',required:true,span:2,options:()=>Store.all('produtos').sort(by(p=>norm(p.nome))).map(p=>[p.id,`${p.sku} – ${p.nome}`])},
    {k:'tamanho',label:'Tamanho',required:true},{k:'codigo',label:'Código da peça',hint:'Deixe em branco para gerar automaticamente.'},
    {k:'status',label:'Situação',type:'select',options:Object.entries(PECA_ST).map(([k,v])=>[k,v[0]]),blank:false},
    {k:'conservacao',label:'Conservação',type:'select',options:CONSERV,blank:false},
    {k:'localizacao',label:'Localização',span:2},{k:'obs',label:'Observações',type:'textarea',span:3}
  ],
  before:d=>{ if(!d.codigo){ const pr=B.produto(d.produtoId); const seq=Store.all('pecas').filter(p=>p.produtoId===d.produtoId&&p.tamanho===d.tamanho).length+1; d.codigo=`${pr.sku}-${d.tamanho}-${seq}`; } },
  validate:d=>Store.all('pecas').some(p=>p.codigo===d.codigo&&p.id!==d.id)?'Já existe uma peça com este código.':null,
  after:s=>{ if(s.status==='disponivel') B.refreshPeca(s.id); },
  text:r=>{ const p=B.produto(r.produtoId)||{}; return [r.codigo,r.tamanho,p.nome,p.sku,r.localizacao].join(' '); },
  sort:by(r=>r.codigo),
  filters:[{k:'status',label:'Situação',options:()=>Object.entries(PECA_ST).map(([k,v])=>[k,v[0]]),match:(r,v)=>r.status===v},
           {k:'produto',label:'Produto',options:()=>Store.all('produtos').sort(by(p=>norm(p.nome))).map(p=>[p.id,p.nome]),match:(r,v)=>r.produtoId===v},
           {k:'cat',label:'Categoria',options:()=>CATEGORIAS.map(c=>[c,c]),match:(r,v)=>(B.produto(r.produtoId)||{}).categoria===v}],
  cols:[
    {h:'Código',f:r=>`<b class="nowrap">${esc(r.codigo)}</b>`},
    {h:'Produto',f:r=>{ const p=B.produto(r.produtoId)||{}; return `${esc(p.nome||'—')}<br><small class="muted">${esc(p.categoria||'')}</small>`; }},
    {h:'Tam.',f:r=>esc(r.tamanho)},
    {h:'Situação',f:r=>`<select class="sel-sm" data-chg="peca-st" data-id="${r.id}" aria-label="Situação">${Object.entries(PECA_ST).map(([k,v])=>`<option value="${k}" ${r.status===k?'selected':''}>${v[0]}</option>`).join('')}</select>`},
    {h:'Conservação',f:r=>esc(r.conservacao||'—')},{h:'Local',f:r=>esc(r.localizacao||'—')}
  ],
  canDelete:r=>pecaEmUso(r.id)?'Esta peça possui histórico de venda/aluguel e não pode ser excluída. Altere a situação.':null
});
Chg['peca-st']=el=>{ Store.patch('pecas',el.dataset.id,{status:el.value}); if(el.value==='disponivel') B.refreshPeca(el.dataset.id); toast('Situação atualizada.'); Router.refresh(true); };

/* ---------- CLIENTES ---------- */
Views.clientes=crudView({
  key:'clientes',col:'clientes',title:'Clientes',singular:'Cliente',wide:true,newLabel:'Novo cliente',
  sub:'Cadastro completo, medidas corporais e histórico de compras e aluguéis.',
  label:r=>r.nome,
  fields:[
    {section:'Dados pessoais'},
    {k:'nome',label:'Nome completo',required:true,span:2},{k:'cpf',label:'CPF',type:'cpf'},
    {k:'telefone',label:'Telefone',type:'tel'},{k:'whatsapp',label:'WhatsApp',type:'tel'},{k:'nascimento',label:'Data de nascimento',type:'date'},
    {k:'email',label:'E-mail',type:'email',span:2},{k:'endereco',label:'Endereço',span:3,ph:'Rua, número, bairro, cidade/UF'},
    {section:'Medidas corporais (cm)'},
    {k:'altura',label:'Altura',type:'number',step:.1},{k:'busto',label:'Busto',type:'number',step:.1},{k:'cintura',label:'Cintura',type:'number',step:.1},
    {k:'quadril',label:'Quadril',type:'number',step:.1},{k:'ombros',label:'Ombros',type:'number',step:.1},{k:'manga',label:'Manga / braço',type:'number',step:.1},
    {k:'calca',label:'Comprimento da calça',type:'number',step:.1},{k:'sapato',label:'Nº do calçado',type:'number',step:.5},{k:'manequim',label:'Manequim / tamanho'},
    {section:'Preferências e observações'},
    {k:'preferencias',label:'Preferências',type:'textarea',span:3,ph:'Estilo, cores, silhueta, orçamento…'},{k:'obs',label:'Observações',type:'textarea',span:3}
  ],
  validate:d=>d.cpf&&Store.all('clientes').some(c=>c.cpf===d.cpf&&c.id!==d.id)?'Já existe um cliente com este CPF.':null,
  text:r=>[r.nome,r.cpf,r.telefone,r.whatsapp,r.email,r.endereco].join(' '), sort:by(r=>norm(r.nome)),
  cols:[
    {h:'Cliente',f:r=>`<b>${esc(r.nome)}</b><br><small class="muted">${esc(r.cpf||'')}</small>`},
    {h:'Contato',f:r=>`${esc(r.telefone||r.whatsapp||'—')}<br><small class="muted">${esc(r.email||'')}</small>`},
    {h:'Aluguéis',f:r=>Store.all('alugueis').filter(a=>a.clienteId===r.id).length},
    {h:'Compras',f:r=>Store.all('vendas').filter(v=>v.clienteId===r.id&&v.status==='concluida').length},
    {h:'Em aberto',cls:'r',f:r=>{ const v=sum(Store.all('receber').filter(x=>x.clienteId===r.id&&x.status==='pendente'),x=>x.valor); return v?`<span class="neg">${brl(v)}</span>`:'—'; }}
  ],
  actions:r=>iconBtn('cli-hist',r.id,'eye','Histórico do cliente')+(digits(r.whatsapp||r.telefone).length>=10?`<a class="icon-btn" title="WhatsApp" aria-label="WhatsApp" target="_blank" rel="noopener" href="https://wa.me/55${digits(r.whatsapp||r.telefone)}">${ico('phone',16)}</a>`:''),
  canDelete:r=>Store.all('alugueis').some(a=>a.clienteId===r.id)||Store.all('vendas').some(v=>v.clienteId===r.id)?'Cliente com histórico de vendas/aluguéis não pode ser excluído.':null
});
Act['cli-hist']=el=>clienteHistorico(el.dataset.id);
function clienteHistorico(id){
  const c=B.cliente(id); if(!c) return;
  const als=Store.all('alugueis').filter(a=>a.clienteId===id).sort(by(a=>a.evento,-1)), vds=Store.all('vendas').filter(v=>v.clienteId===id).sort(by(v=>v.data,-1));
  const recs=Store.all('receber').filter(r=>r.clienteId===id&&r.status==='pendente'), ags=Store.all('agenda').filter(a=>a.clienteId===id).sort(by(a=>a.data,-1)).slice(0,8);
  const med=[['Altura',c.altura],['Busto',c.busto],['Cintura',c.cintura],['Quadril',c.quadril],['Ombros',c.ombros],['Manga',c.manga],['Calça',c.calca],['Calçado',c.sapato],['Manequim',c.manequim]].filter(x=>x[1]);
  const m=modal({title:esc(c.nome),xl:true,body:`
   <div class="grid g2"><div><h4 class="gold">Dados</h4><dl class="dl"><dt>CPF</dt><dd>${esc(c.cpf||'—')}</dd><dt>Telefone</dt><dd>${esc(c.telefone||'—')}</dd><dt>WhatsApp</dt><dd>${esc(c.whatsapp||'—')}</dd><dt>E-mail</dt><dd>${esc(c.email||'—')}</dd><dt>Nascimento</dt><dd>${fdate(c.nascimento)}</dd><dt>Endereço</dt><dd>${esc(c.endereco||'—')}</dd></dl></div>
   <div><h4 class="gold">Medidas</h4>${med.length?`<dl class="dl">${med.map(([a,b])=>`<dt>${a}</dt><dd>${esc(b)}${typeof b==='number'&&a!=='Calçado'?' cm':''}</dd>`).join('')}</dl>`:'<p class="muted">Sem medidas cadastradas.</p>'}${c.preferencias?`<p><b>Preferências:</b> ${esc(c.preferencias)}</p>`:''}${c.obs?`<p><b>Obs.:</b> ${esc(c.obs)}</p>`:''}</div></div>
   <h4 class="gold" style="margin-top:14px">Aluguéis (${als.length})</h4>${tbl([{h:'Nº',f:a=>a.numero},{h:'Evento',f:a=>fdate(a.evento)},{h:'Peças',f:a=>a.itens.map(i=>{ const p=B.peca(i.pecaId); return esc(p?B.pecaLabel(p):'—'); }).join('<br>')},{h:'Situação',f:a=>{ const s=B.alStatus(a); return badge(AL_ST[s][0],AL_ST[s][1]); }},{h:'Total',cls:'r',f:a=>brl(a.total)}],als,{empty:'Nenhum aluguel.'})}
   <h4 class="gold" style="margin-top:14px">Compras (${vds.length})</h4>${tbl([{h:'Nº',f:v=>v.numero},{h:'Data',f:v=>fdate(v.dia)},{h:'Itens',f:v=>v.itens.map(i=>esc(i.nome)).join(', ')},{h:'Status',f:v=>badge(v.status==='concluida'?'Concluída':'Cancelada',v.status==='concluida'?'ok':'muted')},{h:'Total',cls:'r',f:v=>brl(v.total)}],vds,{empty:'Nenhuma compra.'})}
   ${recs.length?`<h4 class="gold" style="margin-top:14px">Pagamentos pendentes</h4>${tbl([{h:'Descrição',f:r=>esc(r.descricao)},{h:'Vencimento',f:r=>fdate(r.vencimento)},{h:'Valor',cls:'r',f:r=>brl(r.valor)}],recs)}`:''}
   ${ags.length?`<h4 class="gold" style="margin-top:14px">Agenda</h4>${tbl([{h:'Data',f:a=>fdate(a.data)+' '+esc(a.hora||'')},{h:'Tipo',f:a=>esc(a.tipo)},{h:'Título',f:a=>esc(a.titulo||'')}],ags)}`:''}`,
   footer:`<button class="btn ghost" data-close>Fechar</button><button class="btn primary" data-novo-al>${ico('gem',16)} Novo aluguel</button>`});
  $('[data-novo-al]',m).onclick=()=>{ m.close(); Router.go('alugueis'); setTimeout(()=>aluguelForm(null,{clienteId:id}),150); };
}
