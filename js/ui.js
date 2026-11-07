/* ===== ui.js – utilitários, ícones, modais, formulários, tabelas, calendário, impressão ===== */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{ if(typeof v==='number') return isFinite(v)?v:0; if(v==null||v==='') return 0; let s=String(v).replace(/[R$\s]/g,''); if(s.includes(',')) s=s.replace(/\./g,'').replace(',','.'); const n=parseFloat(s); return isNaN(n)?0:n; };
const r2=n=>Math.round((num(n)+Number.EPSILON)*100)/100;
const brl=n=>(Number(n)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pad=(n,l=2)=>String(n).padStart(l,'0');
const isoDate=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>isoDate(new Date());
const nowISO=()=>new Date().toISOString();
const addDays=(iso,n)=>{ const [y,m,d]=iso.split('-').map(Number); return isoDate(new Date(y,m-1,d+n)); };
const diffDays=(a,b)=>Math.round((Date.UTC(...b.split('-').map((x,i)=>i===1?x-1:+x))-Date.UTC(...a.split('-').map((x,i)=>i===1?x-1:+x)))/864e5);
const fdate=iso=>{ if(!iso) return '—'; const p=String(iso).slice(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:iso; };
const ftime=iso=>{ if(!iso) return ''; const d=new Date(iso); return isNaN(d)?'':pad(d.getHours())+':'+pad(d.getMinutes()); };
const fdt=iso=>iso?fdate(isoDate(new Date(iso)))+' '+ftime(iso):'—';
const ymOf=iso=>String(iso).slice(0,7);
const monthName=(y,m)=>['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m]+' '+y;
const digits=s=>String(s||'').replace(/\D/g,'');
const sum=(a,f)=>a.reduce((s,x)=>s+num(f?f(x):x),0);
const by=(f,dir=1)=>(a,b)=>{ const x=f(a),y=f(b); return (x>y?1:x<y?-1:0)*dir; };
const debounce=(f,ms=150)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>f(...a),ms); }; };
const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();

/* ---------- ícones ---------- */
const IC={
 grid:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
 box:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
 calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
 bag:'<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
 wallet:'<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
 down:'<circle cx="12" cy="12" r="10"/><path d="m8 12 4 4 4-4M12 8v8"/>',
 up:'<circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4M12 16V8"/>',
 chart:'<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
 bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 edit:'<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
 trash:'<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
 search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 x:'<path d="M18 6 6 18M6 6l12 12"/>',
 menu:'<path d="M3 12h18M3 6h18M3 18h18"/>',
 check:'<path d="M20 6 9 17l-5-5"/>',
 logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
 download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
 upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
 refresh:'<path d="M21 12a9 9 0 0 0-15-6.7L3 8M3 3v5h5M3 12a9 9 0 0 0 15 6.7L21 16M21 21v-5h-5"/>',
 cloud:'<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 0 1 0 9z"/>',
 eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 eyeoff:'<path d="M17.9 17.9A10 10 0 0 1 12 19C5.6 19 2 12 2 12a18 18 0 0 1 5.1-5.9M9.9 4.2A9 9 0 0 1 12 4c6.4 0 10 7 10 7a18 18 0 0 1-2.2 3.2M1 1l22 22M14.1 14.1a3 3 0 0 1-4.2-4.2"/>',
 print:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
 phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
 clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 alert:'<path d="m10.3 3.9-8.5 14.7A2 2 0 0 0 3.5 22h17a2 2 0 0 0 1.7-3.4L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
 cash:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
 tag:'<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01"/>',
 sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
 chevL:'<path d="m15 18-6-6 6-6"/>', chevR:'<path d="m9 18 6-6-6-6"/>',
 undo:'<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
 gem:'<path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6M2 9h20"/>',
 shirt:'<path d="M20.4 6.7 16 3.5a4 4 0 0 1-8 0L3.6 6.7a1 1 0 0 0-.4 1.2l1.4 3.3a1 1 0 0 0 1 .6H7V21h10v-9.2h1.4a1 1 0 0 0 1-.6l1.4-3.3a1 1 0 0 0-.4-1.2z"/>',
 star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1z"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
};
const ico=(n,s=18)=>`<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]||''}</svg>`;

/* ---------- toasts, modal, confirm ---------- */
function toast(msg,type='ok',ms=3600){
  const box=$('#toasts'); if(!box) return; const t=document.createElement('div'); t.className='toast '+type;
  t.innerHTML=`${ico(type==='err'?'alert':type==='warn'?'alert':'check',16)}<span>${esc(msg)}</span>`; box.appendChild(t);
  requestAnimationFrame(()=>t.classList.add('show')); setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),250); },ms);
}
function modal({title,body,footer,wide,xl,onClose}){
  const el=document.createElement('div'); el.className='modal-back';
  el.innerHTML=`<div class="modal ${xl?'xl':wide?'wide':''}" role="dialog" aria-modal="true"><header><h3>${title}</h3><button class="icon-btn" data-close aria-label="Fechar">${ico('x')}</button></header><div class="modal-body">${body}</div>${footer?`<footer>${footer}</footer>`:''}</div>`;
  document.body.appendChild(el); requestAnimationFrame(()=>el.classList.add('show'));
  el.close=()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),180); onClose&&onClose(); };
  el.addEventListener('click',e=>{ if(e.target.closest('[data-close]')) el.close(); });
  const f=el.querySelector('input,select,textarea'); if(f&&!f.readOnly) setTimeout(()=>{ try{f.focus({preventScroll:true});}catch(e){} },60);
  return el;
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ const m=$$('.modal-back').pop(); if(m&&m.close) m.close(); } });
function confirmBox(msg,{ok='Confirmar',danger=false,title='Confirmação'}={}){
  return new Promise(res=>{
    const m=modal({title,body:`<p class="confirm-msg">${msg}</p>`,footer:`<button class="btn ghost" data-close>Cancelar</button><button class="btn ${danger?'danger':'primary'}" data-ok>${ok}</button>`,onClose:()=>res(false)});
    $('[data-ok]',m).onclick=()=>{ m.onclose=null; res(true); const c=m.close; m.close=()=>{}; c.call(m); };
  });
}

/* ---------- badges / tabelas ---------- */
const badge=(t,k='muted')=>`<span class="badge ${k}">${esc(t)}</span>`;
function tbl(cols,rows,{empty='Nenhum registro encontrado.',cls=''}={}){
  if(!rows.length) return `<div class="empty">${ico('info',22)}<p>${empty}</p></div>`;
  return `<div class="table-wrap"><table class="${cls}"><thead><tr>${cols.map(c=>`<th class="${c.cls||''}">${c.h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr ${r._cls?`class="${r._cls}"`:''}>${cols.map(c=>`<td class="${c.cls||''}" data-l="${esc(c.h.replace(/<[^>]*>/g,''))}">${c.f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const iconBtn=(act,id,icon,title,extra='')=>`<button class="icon-btn" data-act="${act}" data-id="${id}" ${extra} title="${esc(title)}" aria-label="${esc(title)}">${ico(icon,16)}</button>`;

/* ---------- formulários ---------- */
const MASKS={
  cpf:v=>{ v=digits(v).slice(0,11); return v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'); },
  tel:v=>{ v=digits(v).slice(0,11); if(v.length>10) return v.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3'); return v.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3').replace(/-$/,''); }
};
function validCPF(c){ c=digits(c); if(c.length!==11||/^(\d)\1+$/.test(c)) return false; for(let t=9;t<11;t++){ let s=0; for(let i=0;i<t;i++) s+=c[i]*(t+1-i); if((s*10%11)%10!=c[t]) return false; } return true; }
function optList(f){ let o=typeof f.options==='function'?f.options():f.options||[]; return o.map(x=>Array.isArray(x)?x:[x,x]); }
function fieldHtml(f,v){
  const id='f_'+f.k, val=v==null?'':v, req=f.required?' <i class="req">*</i>':'', span=f.span===2?' span2':f.span===3?' span3':'';
  let inp='';
  switch(f.type){
    case 'select': inp=`<select name="${f.k}" id="${id}">${f.blank!==false?`<option value="">${f.blank||'Selecione…'}</option>`:''}${optList(f).map(([a,b])=>`<option value="${esc(a)}" ${String(a)===String(val)?'selected':''}>${esc(b)}</option>`).join('')}</select>`; break;
    case 'textarea': inp=`<textarea name="${f.k}" id="${id}" rows="${f.rows||3}" placeholder="${esc(f.ph||'')}">${esc(val)}</textarea>`; break;
    case 'money': inp=`<input name="${f.k}" id="${id}" data-money inputmode="decimal" placeholder="0,00" value="${val===''?'':String(r2(val)).replace('.',',')}">`; break;
    case 'number': inp=`<input name="${f.k}" id="${id}" type="number" step="${f.step||1}" min="${f.min==null?0:f.min}" value="${esc(val)}" placeholder="${esc(f.ph||'')}">`; break;
    case 'checkbox': return `<label class="field check${span}"><input type="checkbox" name="${f.k}" ${val?'checked':''}><span>${f.label}</span></label>`;
    case 'photos': inp=`<div class="photos" data-photos="${f.k}"></div><input type="file" accept="image/*" multiple hidden data-photo-in="${f.k}"><button type="button" class="btn ghost sm" data-pick="${f.k}">${ico('upload',15)} Adicionar fotos</button>`; break;
    case 'file': inp=`<div class="filebox" data-filebox="${f.k}"></div><input type="file" accept="image/*,application/pdf" hidden data-file-in="${f.k}"><button type="button" class="btn ghost sm" data-pick="${f.k}">${ico('upload',15)} Anexar arquivo</button>`; break;
    default: inp=`<input name="${f.k}" id="${id}" type="${['date','time','email','password'].includes(f.type)?f.type:'text'}" ${f.type==='tel'?'inputmode="tel"':''} ${f.type==='cpf'?'inputmode="numeric"':''} placeholder="${esc(f.ph||'')}" value="${esc(val)}" autocomplete="off">`;
  }
  return `<div class="field${span}"><label for="${id}">${f.label}${req}</label>${inp}${f.hint?`<small>${f.hint}</small>`:''}</div>`;
}
function formHtml(fields,vals={}){ return `<form class="form-grid" novalidate onsubmit="return false">${fields.map(f=>f.section?`<h4 class="form-sec span3">${f.section}</h4>`:fieldHtml(f,vals[f.k])).join('')}</form>`; }
function initForm(form,fields,vals={}){
  form._files={};
  fields.forEach(f=>{
    if(f.type==='photos'){ form._files[f.k]=(vals[f.k]||[]).slice(); }
    if(f.type==='file'){ form._files[f.k]=vals[f.k]||''; }
  });
  const draw=()=>{
    $$('[data-photos]',form).forEach(box=>{ const k=box.dataset.photos; box.innerHTML=(form._files[k]||[]).map((s,i)=>`<div class="ph"><img src="${esc(s)}" alt=""><button type="button" data-rm-photo="${k}" data-i="${i}" aria-label="Remover foto">×</button></div>`).join(''); });
    $$('[data-filebox]',form).forEach(box=>{ const k=box.dataset.filebox, v=form._files[k]; box.innerHTML=v?`<div class="fileline">${ico('file',15)} ${v.startsWith('data:')?'Arquivo anexado (será enviado ao salvar)':`<a href="${esc(v)}" target="_blank" rel="noopener">Ver anexo</a>`} <button type="button" data-rm-file="${k}" aria-label="Remover anexo">×</button></div>`:''; });
  };
  draw();
  form.addEventListener('click',e=>{
    const p=e.target.closest('[data-pick]'); if(p){ const i=$(`[data-photo-in="${p.dataset.pick}"],[data-file-in="${p.dataset.pick}"]`,form); i&&i.click(); }
    const r=e.target.closest('[data-rm-photo]'); if(r){ form._files[r.dataset.rmPhoto].splice(+r.dataset.i,1); draw(); }
    const rf=e.target.closest('[data-rm-file]'); if(rf){ form._files[rf.dataset.rmFile]=''; draw(); }
  });
  form.addEventListener('change',async e=>{
    const t=e.target;
    if(t.dataset.photoIn){ for(const file of t.files){ try{ form._files[t.dataset.photoIn].push(await resizeImage(file)); }catch(err){ toast('Não foi possível ler a imagem','err'); } } t.value=''; draw(); }
    if(t.dataset.fileIn&&t.files[0]){ const f=t.files[0]; if(f.size>6e6){ toast('Arquivo acima de 6 MB','err'); return; } form._files[t.dataset.fileIn]=f.type.startsWith('image/')?await resizeImage(f,1100,.75):await readAsDataURL(f); t.value=''; draw(); }
  });
  $$('input',form).forEach(inp=>{ const f=fields.find(x=>x.k===inp.name); if(f&&MASKS[f.type]) inp.addEventListener('input',()=>inp.value=MASKS[f.type](inp.value)); });
}
function readForm(form,fields){
  const data={}, errors=[];
  for(const f of fields){
    if(f.section) continue;
    if(f.type==='photos'||f.type==='file'){ data[f.k]=form._files[f.k]; continue; }
    const el=form.elements[f.k]; if(!el) continue;
    let v;
    if(f.type==='checkbox') v=el.checked;
    else if(f.type==='money') v=el.value.trim()===''?'':r2(num(el.value));
    else if(f.type==='number') v=el.value===''?'':Number(el.value);
    else v=el.value.trim();
    const label=String(f.label).replace(/<[^>]*>/g,'');
    if(f.required&&(v===''||v==null)) errors.push(`Preencha o campo "${label}".`);
    if(v!==''&&v!=null){
      if(f.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors.push(`E-mail inválido em "${label}".`);
      if(f.type==='cpf'&&!validCPF(v)) errors.push('CPF inválido.');
      if((f.type==='money'||f.type==='number')&&(f.min==null?0:f.min)>v) errors.push(`Valor inválido em "${label}".`);
      if(f.type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(v)) errors.push(`Data inválida em "${label}".`);
    }
    if(f.type==='money'&&v==='') v=0;
    data[f.k]=v;
  }
  return {ok:!errors.length,data,errors};
}
document.addEventListener('focusout',e=>{ const t=e.target; if(t.matches&&t.matches('[data-money]')&&t.value.trim()!=='') t.value=r2(num(t.value)).toFixed(2).replace('.',','); });

/* ---------- imagens / arquivos ---------- */
function readAsDataURL(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }
function resizeImage(file,max=640,q=.7){
  return new Promise((res,rej)=>{ const img=new Image(); const url=URL.createObjectURL(file);
    img.onload=()=>{ const s=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.round(img.width*s); c.height=Math.round(img.height*s); c.getContext('2d').drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg',q)); };
    img.onerror=rej; img.src=url; });
}

/* ---------- impressão / exportação ---------- */
function printHtml(html,title='Documento'){
  const f=document.createElement('iframe'); f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f);
  const d=f.contentWindow.document; d.open(); d.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  body{font:13px/1.5 Georgia,'Times New Roman',serif;color:#222;margin:28px}h1,h2,h3{margin:0}h1{font-size:22px;letter-spacing:1px}.c{text-align:center}.muted{color:#666}
  table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border-bottom:1px solid #ddd;padding:6px 4px;text-align:left}th{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#555}.r{text-align:right}
  .tot td{font-weight:bold;border-top:2px solid #333}.box{border:1px solid #bbb;padding:10px 14px;margin:10px 0;border-radius:4px}.sign{display:flex;gap:40px;margin-top:60px}.sign div{flex:1;border-top:1px solid #333;text-align:center;padding-top:4px;font-size:12px}
  .gold{color:#8a6a24}hr{border:0;border-top:1px solid #c9a864;margin:12px 0}p{margin:6px 0}@media print{body{margin:12mm}}</style></head><body>${html}</body></html>`); d.close();
  setTimeout(()=>{ f.contentWindow.focus(); f.contentWindow.print(); setTimeout(()=>f.remove(),2500); },250);
}
function downloadFile(name,content,mime='application/octet-stream'){
  const b=new Blob([content],{type:mime}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
}

/* ---------- gráficos (Chart.js) ---------- */
const Charts={};
function drawChart(id,cfg){
  const cv=document.getElementById(id); if(!cv) return;
  if(Charts[id]){ Charts[id].destroy(); delete Charts[id]; }
  if(typeof Chart==='undefined'){ cv.replaceWith(Object.assign(document.createElement('div'),{className:'empty',innerHTML:'Gráfico indisponível (biblioteca não carregada).'})); return; }
  const cs=getComputedStyle(document.documentElement), txt=cs.getPropertyValue('--muted').trim(), grid=cs.getPropertyValue('--line').trim();
  Chart.defaults.color=txt; Chart.defaults.font.family="Montserrat, system-ui, sans-serif";
  cfg.options=Object.assign({responsive:true,maintainAspectRatio:false,animation:{duration:500},plugins:{legend:{labels:{boxWidth:10,usePointStyle:true}},tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${brl(c.parsed.y)}`}}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:grid},ticks:{callback:v=>v>=1000?(v/1000)+'k':v}}}},cfg.options||{});
  Charts[id]=new Chart(cv,cfg);
}
const GOLD='#d4af6a', GOLD2='#f0d9a0', SILVER='#b9bcc4', ROSE='#c98a9b', GREEN='#6fbf8e', RED='#e5736b';

/* ---------- calendário reutilizável ---------- */
const Cals={};
function Calendar(id,opt){
  const c={id,mode:opt.mode||'month',date:today(),opt};
  c.range=()=>{ const [y,m,d]=c.date.split('-').map(Number);
    if(c.mode==='month'){ const first=new Date(y,m-1,1); const start=addDays(isoDate(first),-first.getDay()); return {from:start,to:addDays(start,41)}; }
    if(c.mode==='week'){ const dt=new Date(y,m-1,d); const start=addDays(c.date,-dt.getDay()); return {from:start,to:addDays(start,6)}; }
    return {from:c.date,to:c.date}; };
  c.render=()=>{
    const el=document.getElementById(id); if(!el) return; const {from,to}=c.range(); const evs=opt.events(from,to); const [y,m]=c.date.split('-').map(Number);
    const title=c.mode==='month'?monthName(y,m-1):c.mode==='week'?`${fdate(from)} – ${fdate(to)}`:fdate(c.date);
    const byDay={}; evs.forEach(e=>{ (byDay[e.date]=byDay[e.date]||[]).push(e); }); Object.values(byDay).forEach(a=>a.sort((p,q)=>(p.time||'')>(q.time||'')?1:-1));
    const chip=e=>`<div class="cev ${e.cls||''} ${e.label?'':'bar'}" ${e.id?`data-act="cal-ev" data-cal="${id}" data-eid="${esc(e.id)}"`:''} title="${esc(e.title||e.label||'')}">${e.label?`${e.time?`<b>${esc(e.time)}</b> `:''}${esc(e.label)}`:''}</div>`;
    let body='';
    if(c.mode==='month'){
      const wd=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
      body=`<div class="cal-grid">${wd.map(w=>`<div class="cal-wd">${w}</div>`).join('')}${Array.from({length:42},(_,i)=>{ const d=addDays(from,i); const list=byDay[d]||[]; const out=ymOf(d)!==c.date.slice(0,7);
        return `<div class="cal-cell ${out?'out':''} ${d===today()?'today':''}" data-act="cal-day" data-cal="${id}" data-date="${d}"><span class="dn">${+d.slice(8)}</span>${list.slice(0,4).map(chip).join('')}${list.length>4?`<small class="more">+${list.length-4}</small>`:''}</div>`; }).join('')}</div>`;
    } else if(c.mode==='week'){
      body=`<div class="cal-week">${Array.from({length:7},(_,i)=>{ const d=addDays(from,i); return `<div class="wk ${d===today()?'today':''}"><div class="wkh" data-act="cal-day" data-cal="${id}" data-date="${d}">${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][i]} <b>${+d.slice(8)}</b></div>${(byDay[d]||[]).map(chip).join('')||'<small class="muted">—</small>'}</div>`; }).join('')}</div>`;
    } else {
      const list=byDay[c.date]||[]; body=`<div class="cal-day">${list.length?list.map(chip).join(''):'<div class="empty"><p>Nenhum compromisso neste dia.</p></div>'}</div>`;
    }
    el.innerHTML=`<div class="cal-head"><div class="seg"><button class="btn ghost sm" data-act="cal-nav" data-cal="${id}" data-d="-1" aria-label="Anterior">${ico('chevL',16)}</button><button class="btn ghost sm" data-act="cal-nav" data-cal="${id}" data-d="0">Hoje</button><button class="btn ghost sm" data-act="cal-nav" data-cal="${id}" data-d="1" aria-label="Próximo">${ico('chevR',16)}</button></div><h3 class="cal-title">${title}</h3>${opt.modes?`<div class="seg">${opt.modes.map(([k,l])=>`<button class="btn sm ${c.mode===k?'primary':'ghost'}" data-act="cal-mode" data-cal="${id}" data-m="${k}">${l}</button>`).join('')}</div>`:''}</div>${body}${opt.legend?`<div class="legend">${opt.legend}</div>`:''}`;
  };
  Cals[id]=c; return c;
}
function calNav(id,d){ const c=Cals[id]; if(!c) return; const [y,m,dd]=c.date.split('-').map(Number);
  if(d===0) c.date=today(); else if(c.mode==='month') c.date=isoDate(new Date(y,m-1+d,1)); else if(c.mode==='week') c.date=addDays(c.date,7*d); else c.date=addDays(c.date,d); c.render(); }
