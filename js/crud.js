/* ===== crud.js – tela CRUD genérica (lista + busca + filtros + formulário modal) ===== */
const Crud={}, CrudState={}, Views={}, Act={}, Inp={}, Chg={};
function crudView(def){
  Crud[def.key]=def;
  return main=>{
    const st=CrudState[def.key]||(CrudState[def.key]={q:'',f:Object.assign({},def.presetFilters)});
    const filters=(def.filters||[]).map(f=>`<select data-chg="crud-f" data-k="${def.key}" data-f="${f.k}" aria-label="${esc(f.label)}"><option value="">${esc(f.label)}: todos</option>${f.options().map(([v,l])=>`<option value="${esc(v)}" ${st.f[f.k]===v?'selected':''}>${esc(l)}</option>`).join('')}</select>`).join('');
    main.innerHTML=`<div class="page-head"><div><h1>${def.title}</h1><p class="sub">${def.sub||''}</p></div><div class="head-actions">${def.headExtra||''}<button class="btn primary" data-act="crud-new" data-k="${def.key}">${ico('plus')} ${def.newLabel||'Novo'}</button></div></div>
    ${def.top?def.top():''}<div class="card"><div class="toolbar"><div class="search">${ico('search',16)}<input data-inp="crud-q" data-k="${def.key}" placeholder="Buscar…" value="${esc(st.q)}" aria-label="Buscar"></div>${filters}</div><div id="crud-body"></div></div>`;
    crudBody(def);
  };
}
function crudRows(def){
  const st=CrudState[def.key]; let rows=def.rows?def.rows():Store.all(def.col); const q=norm(st.q);
  if(q) rows=rows.filter(r=>norm(def.text?def.text(r):JSON.stringify(r)).includes(q));
  (def.filters||[]).forEach(f=>{ const v=st.f[f.k]; if(v) rows=rows.filter(r=>f.match(r,v)); });
  return def.sort?rows.slice().sort(def.sort):rows;
}
function crudBody(def){
  const body=$('#crud-body'); if(!body) return; const rows=crudRows(def);
  const cols=def.cols.concat([{h:'',cls:'act',f:r=>`<div class="row-actions">${def.actions?def.actions(r):''}${def.canEdit&&!def.canEdit(r)?'':iconBtn('crud-edit',r.id,'edit','Editar',`data-k="${def.key}"`)}${Auth.can('excluir')?iconBtn('crud-del',r.id,'trash','Excluir',`data-k="${def.key}"`):''}</div>`}]);
  body.innerHTML=`<div class="count">${rows.length} registro(s)${def.footer?` · ${def.footer(rows)}`:''}</div>`+tbl(cols,rows,{empty:def.empty});
}
function crudOpen(def,id,presets){
  const old=id?Store.get(def.col,id):null; const vals=old||Object.assign(def.defaults?def.defaults():{},presets||{});
  const fields=typeof def.fields==='function'?def.fields(old):def.fields;
  const m=modal({title:(old?'Editar ':'Novo(a) ')+def.singular,wide:def.wide,body:formHtml(fields,vals),footer:`<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>${ico('check',16)} Salvar</button>`});
  const form=$('form',m); initForm(form,fields,vals);
  const save=async()=>{
    const r=readForm(form,fields); if(!r.ok){ toast(r.errors[0],'err'); return; }
    const data=Object.assign({},old||{},r.data);
    const err=def.validate&&def.validate(data,old); if(err){ toast(err,'err'); return; }
    if(def.before){ const e2=await def.before(data,old); if(typeof e2==='string'){ toast(e2,'err'); return; } }
    const saved=Store.save(def.col,data);
    if(def.after) await def.after(saved,old,data);
    m.close(); toast(old?'Registro atualizado.':'Registro criado.'); if(def.afterClose) def.afterClose(saved,old); Router.refresh(true);
  };
  $('[data-save]',m).onclick=save; form.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'){ e.preventDefault(); save(); } });
  return m;
}
Act['crud-new']=el=>crudOpen(Crud[el.dataset.k]);
Act['crud-edit']=el=>crudOpen(Crud[el.dataset.k],el.dataset.id);
Act['crud-del']=async el=>{
  const def=Crud[el.dataset.k], rec=Store.get(def.col,el.dataset.id); if(!rec) return;
  if(!Auth.can('excluir')){ toast('Sem permissão para excluir.','err'); return; }
  const blk=def.canDelete&&def.canDelete(rec); if(blk){ toast(blk,'err',5000); return; }
  if(await confirmBox(`Excluir ${def.singular.toLowerCase()} <b>${esc(def.label?def.label(rec):'')}</b>? Esta ação não pode ser desfeita.`,{danger:true,ok:'Excluir'})){
    if(def.onDelete) await def.onDelete(rec); Store.remove(def.col,rec.id); toast('Registro excluído.'); Router.refresh(true);
  }
};
Inp['crud-q']=el=>{ CrudState[el.dataset.k].q=el.value; crudBody(Crud[el.dataset.k]); };
Chg['crud-f']=el=>{ CrudState[el.dataset.k].f[el.dataset.f]=el.value; crudBody(Crud[el.dataset.k]); };
