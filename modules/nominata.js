/* -------------------------------------------------------------------------- */
/* NOMINATA                                                                    */
/* -------------------------------------------------------------------------- */
function nominataItemCard(i){
  const isAut=i.TIPO_ITEM==='AUTORIDADE';
  const isFam=i.TIPO_ITEM==='FAMILIAR';
  const isMsg=i.TIPO_ITEM==='MENSAGEM'||i.TIPO_ITEM==='TEXTO';
  const avatar=isAut?photoHtml(i):`<div class="avatar placeholder">${isMsg?'MSG':esc(i.ORDEM)}</div>`;

  let click='';
  if(isAut)click=`onclick="openGuestOperationDetail('${i.REF}')"`;
  else if(isFam)click=`onclick="openNominataFamilyDetail('${i.REF}')"`;
  else if(isMsg)click=`onclick="openNominataMessage('${i.ID_ITEM}')"`;

  let pres='';
  if(isAut||isFam){
    pres=i.PRESENTE
      ? '<span class="badge present">PRESENTE</span>'
      : '<span class="badge pending">SEM PRESENÇA</span>';
  }

  return `<div class="person-card ${isAut||isFam||isMsg?'clickable':''} nominata-card ${isFam?'sgcm-family-card':''}" ${click}>${avatar}<div class="grow"><div class="person-name">${esc(i.TITULO)}</div><div class="person-meta-line"><span class="badge">${esc(i.TIPO_ITEM)}</span>${pres}</div></div><div class="order-controls"><button onclick="event.stopPropagation();removeNom('${i.ID_ITEM}')">REMOVER</button></div></div>`;
}

async function renderNominata(){
  const c=contextCeremony();if(!c){$('#main').innerHTML='<div class="empty">Nenhuma cerimônia ativa.</div>';return;}
  const data=await server('apiNominataPainel',c.ID_CERIMONIA),items=data.items||[],guests=data.guests||[],fams=data.fams||[],msgs=data.msgs||[];
  state.nomData={items,guests,fams,msgs};state.nomItems=items;
  let html=`<div class="page-head"><div><div class="section-title">NOMINATA</div><div class="small muted">${esc(c.NOME_EVENTO)} | ${items.length} itens</div></div></div><div class="page-actions nominata-actions"><button class="btn primary" onclick="openBulkNominata()">ADICIONAR AUTORIDADES</button><button class="btn outline" onclick="openAddNominataItem()">OUTRO ITEM</button><button class="btn outline" onclick="openMessageBank()">MENSAGENS</button></div><div class="notice">As autoridades permanecem sempre na ordem de precedência da cerimônia. Clique em uma autoridade ou familiar para confirmar/cancelar presença. Clique em uma mensagem para editar ou reposicionar.</div>`;
  html+=items.length?`<div class="person-list nominata-list">${items.map(nominataItemCard).join('')}</div>`:'<div class="empty">A nominata está vazia.</div>';
  $('#main').innerHTML=html;
}


function openNominataFamilyDetail(id){
  const d=state.nomData||{};
  const f=(d.fams||[]).find(x=>String(x.ID_FAMILIAR)===String(id));
  const it=(state.nomItems||[]).find(x=>x.TIPO_ITEM==='FAMILIAR'&&String(x.REF)===String(id));
  if(!f)return;

  const presente=!!(it?it.PRESENTE:f.PRESENCA);
  const rel=String(f.AUTORIDADE_RESUMO||f.AUTORIDADE||'').toUpperCase();
  const nome=String(f.NOME||'').toUpperCase();
  const vinculo=String(f.VINCULO||'').toUpperCase();
  const titulo=[nome,vinculo].filter(Boolean).join(' — ');

  openModal(`${modalCloseButton()}<h2 class="sgcm-family-modal-title">${esc(titulo)}</h2>
    ${rel?`<div class="sgcm-family-related"><span class="sgcm-family-related-label">Relacionado a</span><span class="sgcm-family-related-value">${esc(rel)}</span></div>`:''}
    <div class="sgcm-family-modal-fields">
      <div class="sgcm-family-field"><span class="sgcm-family-field-label">Nome</span><span class="sgcm-family-field-value">${esc(nome)}</span></div>
      <div class="sgcm-family-field"><span class="sgcm-family-field-label">Vínculo</span><span class="sgcm-family-field-value">${esc(vinculo)}</span></div>
      <div class="sgcm-family-field"><span class="sgcm-family-field-label">Presença</span><span class="sgcm-family-field-value">${presente?'PRESENTE':'SEM PRESENÇA'}</span></div>
    </div>
    <button class="btn ${presente?'danger':'ok'} block sgcm-family-modal-action" onclick="toggleNominataFamilyPresence('${esc(id)}',${presente?'false':'true'})">${presente?'CANCELAR PRESENÇA':'CONFIRMAR PRESENÇA'}</button>`,true);
}

async function toggleNominataFamilyPresence(id,on){
  const c=contextCeremony();if(!c)return;
  closeModal();
  showToast(on?'Confirmando presença...':'Cancelando presença...');
  try{
    await server(on?'apiMarcarPresencaFamiliar':'apiCancelarPresencaFamiliar',c.ID_CERIMONIA,id);
    atualizarFamiliarLocal(id,{PRESENCA:!!on,PRESENTE_EM:on?new Date().toISOString():''});
    showToast(on?'Presença do familiar confirmada.':'Presença do familiar cancelada.');
    await renderNominata();
  }catch(e){
    showToast('Não foi possível confirmar a alteração.');
    throw e;
  }
}

function openBulkNominata(){
  const d=state.nomData||{guests:[]},usados=new Set((state.nomItems||[]).filter(i=>i.TIPO_ITEM==='AUTORIDADE').map(i=>i.REF));
  const guests=(d.guests||[]).filter(g=>!usados.has(g.ID_CONVIDADO)&&(g.STATUS_CONFIRMACAO==='CONFIRMADO'||g.STATUS_CONFIRMACAO==='PENDENTE'));
  openModal(`${modalCloseButton()}<h2>Adicionar várias autoridades</h2><p class="small muted">Apenas PENDENTES e CONFIRMADAS são exibidas. Independentemente da ordem de seleção, elas entram sempre na ordem de precedência da cerimônia.</p><div class="actions compact"><button class="btn outline sm" onclick="bulkNomSelect('CONFIRMADOS')">MARCAR CONFIRMADOS</button><button class="btn outline sm" onclick="bulkNomSelect('PENDENTES')">MARCAR PENDENTES</button><button class="btn outline sm" onclick="bulkNomSelect('TODOS')">MARCAR TODOS</button><button class="btn outline sm" onclick="bulkNomSelect('NENHUM')">LIMPAR</button></div><div class="bulk-list">${guests.map(g=>`<label class="bulk-row"><input type="checkbox" class="nom-bulk" value="${esc(g.ID_CONVIDADO)}" data-status="${esc(g.STATUS_CONFIRMACAO)}"><span><strong>${esc((g.POSTO?g.POSTO+' ':'')+(g.NOME_GUERRA||g.NOME_COMPLETO))}</strong><small>${esc(g.CARGO_ATUAL||g.NOME_COMPLETO)}</small></span>${badgeStatus(g.STATUS_CONFIRMACAO)}</label>`).join('')||'<div class="empty">Não há autoridades pendentes ou confirmadas disponíveis para inclusão.</div>'}</div><button class="btn primary block" onclick="submitBulkNominata()">ADICIONAR SELECIONADAS</button>`,true);
}
function bulkNomSelect(mode){document.querySelectorAll('.nom-bulk').forEach(cb=>{if(mode==='TODOS')cb.checked=true;else if(mode==='NENHUM')cb.checked=false;else if(mode==='CONFIRMADOS')cb.checked=String(cb.dataset.status)==='CONFIRMADO';else if(mode==='PENDENTES')cb.checked=String(cb.dataset.status)==='PENDENTE';});}
async function submitBulkNominata(){const ids=[...document.querySelectorAll('.nom-bulk:checked')].map(x=>x.value);if(!ids.length){showToast('Selecione ao menos uma autoridade.');return;}const c=contextCeremony();await server('apiAdicionarItensNominataLote',c.ID_CERIMONIA,ids);closeModal();showToast(ids.length+' autoridade(s) adicionada(s).');renderNominata();}

function nominataAuthorityOptions(selected=''){
  const auts=(state.nomItems||[]).filter(i=>i.TIPO_ITEM==='AUTORIDADE');
  return auts.map(a=>`<option value="${esc(a.REF)}" ${a.REF===selected?'selected':''}>${esc(a.REF_NOME||a.TITULO)}</option>`).join('');
}
function anchorFieldsHtml(anchorRef='',anchorSide='ANTES'){
  const opts=nominataAuthorityOptions(anchorRef);
  if(!opts)return '<div class="notice">Adicione pelo menos uma autoridade à nominata antes de posicionar mensagens.</div>';
  return `<div class="grid2"><div class="field"><label>Posição</label><select id="nAnchorSide"><option value="ANTES" ${anchorSide==='ANTES'?'selected':''}>ANTES DE</option><option value="DEPOIS" ${anchorSide==='DEPOIS'?'selected':''}>DEPOIS DE</option></select></div><div class="field"><label>Autoridade de referência</label><select id="nAnchorRef">${opts}</select></div></div>`;
}
function openAddNominataItem(){
  const d=state.nomData||{guests:[],fams:[],msgs:[]};
  openModal(`${modalCloseButton()}<h2>Adicionar item à nominata</h2><div class="field"><label>Tipo</label><select id="nType" onchange="updateNomRef()"><option value="AUTORIDADE">Uma autoridade</option><option value="FAMILIAR">Familiar</option><option value="MENSAGEM">Mensagem predefinida</option><option value="TEXTO">Texto livre</option></select></div><div class="field" id="nRefWrap"><label>Referência</label><select id="nRef"></select></div><div class="field" id="nTextWrap"><label>Texto / edição</label><textarea id="nText" style="text-transform:uppercase"></textarea></div><div id="nAnchorWrap"></div><button class="btn primary block" onclick="submitNomItem()">ADICIONAR</button>`);updateNomRef();
}
function updateNomRef(){
  const type=$('#nType').value,d=state.nomData||{};let opts='';
  if(type==='AUTORIDADE')opts=(d.guests||[]).filter(g=>g.STATUS_CONFIRMACAO==='CONFIRMADO'||g.STATUS_CONFIRMACAO==='PENDENTE').map(g=>`<option value="${g.ID_CONVIDADO}">${esc(g.POSTO+' '+g.NOME_GUERRA)}</option>`).join('');
  if(type==='FAMILIAR')opts=(d.fams||[]).map(f=>`<option value="${f.ID_FAMILIAR}">${esc((f.ROTULO_REFERENCIA||[f.NOME,'—',f.VINCULO,'DE',(f.AUTORIDADE_RESUMO||f.AUTORIDADE||'')].filter(Boolean).join(' ')).toUpperCase())}</option>`).join('');
  if(type==='MENSAGEM')opts=(d.msgs||[]).map(m=>`<option value="${m.ID_MENSAGEM}">${esc(m.TEXTO)}</option>`).join('');
  $('#nRef').innerHTML=opts;$('#nRefWrap').classList.toggle('hidden',type==='TEXTO');
  const msg=type==='MENSAGEM'||type==='TEXTO';$('#nTextWrap').classList.toggle('hidden',type==='AUTORIDADE'||type==='FAMILIAR');$('#nAnchorWrap').innerHTML=msg?anchorFieldsHtml() : '';
}
async function submitNomItem(){
  const c=contextCeremony(),type=$('#nType').value,msg=type==='MENSAGEM'||type==='TEXTO';
  await server('apiAdicionarItemNominata',{ID_CERIMONIA:c.ID_CERIMONIA,TIPO_ITEM:type,REFERENCIA_ID:$('#nRef')?.value||'',TEXTO_CUSTOMIZADO:($('#nText')?.value||'').toUpperCase(),ANCHOR_REF:msg?($('#nAnchorRef')?.value||''):'',ANCHOR_SIDE:msg?($('#nAnchorSide')?.value||'ANTES'):''});
  closeModal();renderNominata();
}
async function removeNom(id){const c=contextCeremony();await server('apiRemoverItemNominata',c.ID_CERIMONIA,id);renderNominata();}

function openNominataMessage(id){
  const it=(state.nomItems||[]).find(x=>x.ID_ITEM===id);if(!it)return;
  openModal(`${modalCloseButton()}<h2>Editar mensagem</h2><div class="field"><label>Texto</label><textarea id="editNomText" style="text-transform:uppercase">${esc(it.TITULO)}</textarea></div>${anchorFieldsHtml(it.ANCHOR_REF,it.ANCHOR_SIDE||'ANTES')}<div class="actions"><button class="btn outline" onclick="moveNomMessage('${id}',-1)">SUBIR MENSAGEM</button><button class="btn outline" onclick="moveNomMessage('${id}',1)">DESCER MENSAGEM</button><button class="btn primary" onclick="saveNomMessage('${id}')">SALVAR</button></div>`);
}
async function saveNomMessage(id){const c=contextCeremony();await server('apiEditarItemNominata',c.ID_CERIMONIA,id,{TEXTO:($('#editNomText').value||'').toUpperCase(),ANCHOR_REF:$('#nAnchorRef')?.value||'',ANCHOR_SIDE:$('#nAnchorSide')?.value||'ANTES'});closeModal();renderNominata();}
async function moveNomMessage(id,d){const c=contextCeremony();await server('apiMoverItemNominata',c.ID_CERIMONIA,id,d);closeModal();renderNominata();}

async function openMessageBank(){
  const msgs=await server('apiListarMensagensNominata');
  openModal(`${modalCloseButton()}<h2>Mensagens predefinidas</h2><div class="field"><label>Nova mensagem</label><textarea id="mbText" style="text-transform:uppercase"></textarea></div><button class="btn primary" onclick="addMessageBank()">ADICIONAR</button><div class="section-title">CADASTRADAS</div>${msgs.map(m=>`<div class="row between card"><div class="small nominata-uppercase">${esc(m.TEXTO)}</div><button class="btn danger sm" onclick="deleteMessageBank('${m.ID_MENSAGEM}')">EXCLUIR</button></div>`).join('')}`);
}
async function addMessageBank(){await server('apiAdicionarMensagemPadrao',($('#mbText').value||'').toUpperCase());closeModal();await renderNominata();showToast('Mensagem adicionada.');}
async function deleteMessageBank(id){await server('apiExcluirMensagemPadrao',id);closeModal();await renderNominata();showToast('Mensagem removida.');}

