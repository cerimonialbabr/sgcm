/* -------------------------------------------------------------------------- */
/* EVENTO                                                                      */
/* -------------------------------------------------------------------------- */
function eventOrderMap(guests){
  const map={};
  const president=guests.find(g=>g.PODE_PRESIDIR && !String(g.STATUS_CONFIRMACAO||'').includes('NÃO')) || null;
  let n=1;
  guests.forEach(g=>{
    if(president && g.ID_CONVIDADO===president.ID_CONVIDADO) map[g.ID_CONVIDADO]='PRESIDENTE';
    else if(g.ANFITRIAO) map[g.ID_CONVIDADO]='ANFITRIÃO';
    else if(g.COANFITRIAO) map[g.ID_CONVIDADO]='COANFITRIÃO';
    else map[g.ID_CONVIDADO]=String(n++);
  });
  return map;
}

function renderEventoConteudo(c,guests){
  state.eventGuests=guests||[];
  const labels=eventOrderMap(state.eventGuests);
  $('#main').innerHTML=`
    <div class="section-title">EVENTO</div>
    <div class="card active-card event-summary">
      <div><div class="event-name">${esc(c.NOME_EVENTO)}</div><div class="small muted">${esc(formatDate(c.DATA))}${c.LOCAL?' | '+esc(c.LOCAL):''}</div><div class="metric" style="margin-top:8px"><span>Total de convidados</span><strong>${state.eventGuests.length}</strong></div></div>
      <div class="event-actions compact-actions"><button class="btn primary" onclick="openAddGuest()">ADICIONAR CONVIDADO</button><button class="btn outline" onclick="navigate('tribuna')">TRIBUNA</button><button class="btn outline" onclick="navigate('nominata')">NOMINATA</button></div>
    </div>
    <div class="section-title">CONVIDADOS DA CERIMÔNIA</div>
    <div class="event-people">${state.eventGuests.map(g=>eventPersonCard(g,labels[g.ID_CONVIDADO])).join('')}</div>`;
}
async function renderEvento(){
  const c=contextCeremony(); if(!c){$('#main').innerHTML='<div class="empty">Nenhuma cerimônia ativa.</div>';return;}
  if(!operacaoAtual().ready||operacaoAtual().idCer!==String(c.ID_CERIMONIA)) await reloadOperationalSnapshot({silent:true});
  renderEventoConteudo(c,convidadosOperacao());
}

function eventPersonCard(g,label){
  return `<div class="person-card clickable" onclick="openGuestEventDetail('${g.ID_CONVIDADO}')">${photoHtml(g)}<div class="grow"><div class="person-name">${esc((g.POSTO?g.POSTO+' ':'')+(g.NOME_GUERRA||g.NOME_COMPLETO))}</div><div class="person-sub">${esc(g.CARGO_ATUAL||g.NOME_COMPLETO)}</div>${guestWarningsHtml(g)}</div><div class="person-right">${g.PRESENCA?'<span class="badge present">PRESENTE</span>':badgeStatus(g.STATUS_CONFIRMACAO)}<span class="order-label ${/PRESIDENTE|ANFITRIÃO|COANFITRIÃO/.test(label)?'special':''}">${esc(label)}</span></div></div>`;
}

async function openGuestEventDetail(id){
  const c=contextCeremony(), g=convidadoOperacaoPorId(id)||await server('apiObterConvidado',c.ID_CERIMONIA,id); if(!g)return;
  state.currentGuest=g;
  const labels=eventOrderMap(state.eventGuests.length?state.eventGuests:convidadosOperacao());
  const label=labels[id]||'';
  const missing=(g.DADOS_FALTANTES||[]);
  const warning=missing.length?`<div class="notice ${g.CADASTRADO_BANCO?'':'danger-notice'}"><b>Cadastro:</b> ${esc(missing.join(', '))}. Isso não bloqueia a participação na cerimônia.</div>`:'';
  const bankAction=!g.CADASTRADO_BANCO
    ? `<button class="btn warning" onclick="openRegisterGuestAuthority('${id}')">CADASTRAR NO BANCO</button>`
    : (g.ID_AUTORIDADE?`<button class="btn outline" onclick="openAuthorityFormLazy('${g.ID_AUTORIDADE}')">EDITAR CADASTRO</button>`:'');
  openModal(`${modalCloseButton()}${photoHtml(g,'modal-photo')}<h2>${esc((g.POSTO?g.POSTO+' ':'')+(g.NOME_GUERRA||g.NOME_COMPLETO))}</h2>${warning}
  <dl class="detail-grid"><dt>Ordem no evento</dt><dd><span class="order-label special">${esc(label)}</span></dd><dt>Nome completo</dt><dd>${esc(g.NOME_COMPLETO)}</dd><dt>Cargo</dt><dd>${esc(g.CARGO_ATUAL||'—')}</dd><dt>Força / tipo</dt><dd>${esc(g.FORCA||'—')}</dd><dt>Status</dt><dd>${badgeStatus(g.STATUS_CONFIRMACAO)}</dd><dt>Honras</dt><dd>${g.FAZ_JUS_HONRAS?'SIM':'NÃO'}</dd><dt>Pode presidir</dt><dd>${g.PODE_PRESIDIR?'SIM':'NÃO'}</dd></dl>
  <div class="detail-section"><h3>Operação</h3><div class="action-grid">${bankAction}${g.PRESENCA?`<button class="btn danger" onclick="guestPresence('${id}',false)">CANCELAR PRESENÇA</button>`:`<button class="btn ok" onclick="guestPresence('${id}',true)">CONFIRMAR PRESENÇA</button>`}<button class="btn secondary" onclick="changeGuestStatus('${id}')">ALTERAR STATUS</button><button class="btn outline" onclick="setRole('${id}','ANFITRIAO')">ANFITRIÃO</button><button class="btn outline" onclick="setRole('${id}','COANFITRIAO')">COANFITRIÃO</button><button class="btn outline" onclick="setRole('${id}','CORTE')">CORTE DA TRIBUNA</button><button class="btn outline" onclick="toggleExclude('${id}')">${g.EXCLUIR_TRIBUNA?'REINCLUIR NA TRIBUNA':'EXCLUIR DA TRIBUNA'}</button><button class="btn outline" onclick="addGuestToNominata('${id}')">ADICIONAR À NOMINATA</button><button class="btn secondary" onclick="moveGuest('${id}',-1)">SUBIR NA ORDEM</button><button class="btn secondary" onclick="moveGuest('${id}',1)">DESCER NA ORDEM</button></div></div>`,true);
}

async function guestPresence(id,on){
  const c=contextCeremony(); if(!c)return;
  const antigo=convidadoOperacaoPorId(id);if(!antigo)return;
  const anterior=Object.assign({},antigo);
  closeModal();

  atualizarConvidadoLocal(id,{PRESENCA:!!on,PRESENTE_EM:on?new Date().toISOString():''});
  if(state.screen==='recepcao')renderOperationScreen(c,filtroOperacao('RECEPCAO'),'RECEPCAO');
  else if(state.screen==='presentes')renderOperationScreen(c,filtroOperacao('PRESENTES'),'PRESENTES');
  else if(state.screen==='evento')renderEventoConteudo(c,convidadosOperacao());

  showToast(on?'Confirmando presença...':'Cancelando presença...');
  try{
    await server(on?'apiMarcarPresenca':'apiCancelarPresenca',c.ID_CERIMONIA,id);
    showToast(on?'Presença confirmada.':'Presença cancelada.');
  }catch(e){
    atualizarConvidadoLocal(id,anterior);
    if(state.screen==='recepcao')renderOperationScreen(c,filtroOperacao('RECEPCAO'),'RECEPCAO');
    else if(state.screen==='presentes')renderOperationScreen(c,filtroOperacao('PRESENTES'),'PRESENTES');
    else if(state.screen==='evento')renderEventoConteudo(c,convidadosOperacao());
    showToast('Não foi possível confirmar a alteração.');
    throw e;
  }
}
async function changeGuestStatus(id){ const c=contextCeremony(); const g=state.currentGuest||convidadoOperacaoPorId(id)||await server('apiObterConvidado',c.ID_CERIMONIA,id); openModal(`${modalCloseButton()}<h2>Alterar status</h2><div class="field"><label>Status da confirmação</label><select id="statusGuest">${['CONFIRMADO','PENDENTE','NÃO COMPARECERÁ'].map(x=>`<option ${g.STATUS_CONFIRMACAO===x?'selected':''}>${x}</option>`).join('')}</select></div><button class="btn primary block" onclick="saveGuestStatus('${id}')">SALVAR</button>`); }
async function saveGuestStatus(id){ const c=contextCeremony(),status=$('#statusGuest').value; await server('apiAtualizarStatusConvidado',c.ID_CERIMONIA,id,status); atualizarConvidadoLocal(id,{STATUS_CONFIRMACAO:status}); closeModal(); showToast('Status atualizado.'); navigate(state.screen); }
async function setRole(id,role){ const c=contextCeremony(); await server('apiDefinirPapelConvidado',c.ID_CERIMONIA,id,role); await reloadOperationalSnapshot({silent:true}); closeModal(); showToast('Definição atualizada.'); renderEvento(); }
async function toggleExclude(id){ const c=contextCeremony(); await server('apiToggleExcluirTribuna',c.ID_CERIMONIA,id); await reloadOperationalSnapshot({silent:true}); closeModal(); renderEvento(); }
async function addGuestToNominata(id){ const c=contextCeremony(); await server('apiAdicionarItemNominata',{ID_CERIMONIA:c.ID_CERIMONIA,TIPO_ITEM:'AUTORIDADE',REFERENCIA_ID:id}); closeModal(); showToast('Autoridade adicionada à nominata.'); }
async function moveGuest(id,d){ const c=contextCeremony(); await server('apiMoverConvidado',c.ID_CERIMONIA,id,d); await reloadOperationalSnapshot({silent:true}); closeModal(); renderEvento(); }

/* -------------------------------------------------------------------------- */
/* RECEPÇÃO / PRESENTES                                                        */
/* -------------------------------------------------------------------------- */
function operationPersonList(list,showStatus){
  if(!list.length)return'<div class="empty">Nenhum registro.</div>';
  return `<div class="person-list two-col">${list.map(g=>`<div class="person-card clickable" onclick="openGuestOperationDetail('${g.ID_CONVIDADO}')">${photoHtml(g)}<div class="grow"><div class="person-name">${esc((g.POSTO?g.POSTO+' ':'')+(g.NOME_GUERRA||g.NOME_COMPLETO))}</div><div class="person-sub">${esc(g.CARGO_ATUAL||g.NOME_COMPLETO)}</div></div><div class="person-right">${g.PRESENCA?'<span class="badge present">PRESENTE</span>':(showStatus?badgeStatus(g.STATUS_CONFIRMACAO):'')}</div></div>`).join('')}</div>`;
}

function renderOperationScreen(c,list,tipo){
  const recepcao=tipo==='RECEPCAO';
  state.visiblePeople=list||[];
  $('#main').innerHTML=`<div class="page-head"><div><div class="section-title">${recepcao?'RECEPÇÃO':'PRESENTES'}</div><div class="small muted">${esc(c.NOME_EVENTO)} | ${state.visiblePeople.length} ${recepcao?'aguardando chegada':'presentes'}</div></div></div><div class="searchbar"><input placeholder="Pesquisar por nome, posto ou cargo" oninput="filterVisiblePeople(this.value,${recepcao?'true':'false'})"></div><div id="peopleArea">${operationPersonList(state.visiblePeople,recepcao)}</div>`;
}
async function renderRecepcao(){
  const c=contextCeremony(); if(!c){$('#main').innerHTML='<div class="empty">Nenhuma cerimônia ativa.</div>';return;}
  if(!operacaoAtual().ready||operacaoAtual().idCer!==String(c.ID_CERIMONIA))await reloadOperationalSnapshot({silent:true});
  renderOperationScreen(c,filtroOperacao('RECEPCAO'),'RECEPCAO');
}
async function renderPresentes(){
  const c=contextCeremony(); if(!c){$('#main').innerHTML='<div class="empty">Nenhuma cerimônia ativa.</div>';return;}
  if(!operacaoAtual().ready||operacaoAtual().idCer!==String(c.ID_CERIMONIA))await reloadOperationalSnapshot({silent:true});
  renderOperationScreen(c,filtroOperacao('PRESENTES'),'PRESENTES');
}

function filterVisiblePeople(q,showStatus){
  const key=String(q||'').trim().toUpperCase();
  const list=(state.visiblePeople||[]).filter(g=>!key || [g.POSTO,g.NOME_COMPLETO,g.NOME_GUERRA,g.CARGO_ATUAL,g.FORCA].some(v=>String(v||'').toUpperCase().includes(key)));
  $('#peopleArea').innerHTML=operationPersonList(list,showStatus);
}

async function openGuestOperationDetail(id){
  const c=contextCeremony(), g=convidadoOperacaoPorId(id)||await server('apiObterConvidadoResumo',c.ID_CERIMONIA,id); if(!g)return;
  const isPresent=state.screen==='presentes' || g.PRESENCA;
  openModal(`${modalCloseButton()}${photoHtml(g,'modal-photo')}<h2>${esc((g.POSTO?g.POSTO+' ':'')+(g.NOME_GUERRA||g.NOME_COMPLETO))}</h2><dl class="detail-grid compact"><dt>Posto</dt><dd>${esc(g.POSTO||'—')}</dd><dt>Nome de guerra</dt><dd>${esc(g.NOME_GUERRA||'—')}</dd><dt>Nome completo</dt><dd>${esc(g.NOME_COMPLETO||'—')}</dd><dt>Cargo</dt><dd>${esc(g.CARGO_ATUAL||'—')}</dd><dt>Força / tipo</dt><dd>${esc(g.FORCA||'—')}</dd></dl><div class="actions">${isPresent?`<button class="btn danger block" onclick="guestPresence('${id}',false)">CANCELAR PRESENÇA</button>`:`<button class="btn ok block" onclick="guestPresence('${id}',true)">CONFIRMAR PRESENÇA</button>`}</div>`);
}

/* -------------------------------------------------------------------------- */
/* ADICIONAR CONVIDADO / CADASTRAR NO BANCO                                   */
/* -------------------------------------------------------------------------- */
function addGuestIdentityKey(v){
  return String(v||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toUpperCase().replace(/[^A-Z0-9]+/g,' ')
    .replace(/\s+/g,' ').trim();
}
function guestAlreadyInCeremony(authority){
  if(!authority)return null;
  const id=String(authority.ID_AUTORIDADE||'').trim();
  const nameKey=addGuestIdentityKey(authority.NOME_COMPLETO);
  return convidadosOperacao().find(g=>{
    const sameId=id && String(g.ID_AUTORIDADE||'').trim()===id;
    const sameName=nameKey && addGuestIdentityKey(g.NOME_COMPLETO)===nameKey;
    return sameId||sameName;
  })||null;
}
function addGuestAuthorityResultHtml(a){
  const existing=guestAlreadyInCeremony(a);
  const selected=!existing && state.addGuestSelectedAuthority===a.ID_AUTORIDADE;
  const cls=existing?' already-in-ceremony':(selected?' selected':'');
  const click=existing?'':` onclick="selectAuthorityForGuest('${a.ID_AUTORIDADE}')"`;
  const accessible=existing?' aria-disabled="true"':` role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectAuthorityForGuest('${a.ID_AUTORIDADE}');}"`;
  const badge=existing
    ? '<span class="badge already">JÁ ESTÁ NA CERIMÔNIA</span>'
    : `<span class="badge ${selected?'present':'active'}">${selected?'SELECIONADA':'SELECIONAR'}</span>`;
  return `<div class="person-card selectable-authority${existing?'':' clickable'}${cls}"${click}${accessible}>${photoHtml(a)}<div class="grow"><div class="person-name">${esc((a.POSTO?a.POSTO+' ':'')+(a.NOME_GUERRA||a.NOME_COMPLETO))}</div><div class="person-sub">${esc(a.CARGO_ATUAL)}</div></div><div class="person-right">${badge}</div></div>`;
}
async function openAddGuest(preselectId=''){
  const c=contextCeremony(), guests=convidadosOperacao();
  const labels=eventOrderMap(guests);
  state.addGuestSelectedAuthority=preselectId||null;
  openModal(`${modalCloseButton()}<h2>Adicionar convidado</h2><p class="small muted">Selecione a autoridade, escolha onde ela entrará e somente depois confirme em ADICIONAR À CERIMÔNIA.</p><div class="field"><label>Pesquisar no banco de autoridades</label><input id="agSearch" oninput="searchAuthorityForGuest()" placeholder="Nome, posto ou cargo"></div><div id="agSelected" class="selected-guest-box">${preselectId?'<div class="small muted">Carregando autoridade selecionada...</div>':'<div class="small muted">Nenhuma autoridade selecionada.</div>'}</div><div id="agResults" class="person-list add-guest-results"></div><div class="grid2 add-guest-position"><div class="field"><label>Inserir em relação a</label><select id="agRef"><option value="">Final da lista</option>${guests.map(g=>`<option value="${g.ID_CONVIDADO}">${esc(labels[g.ID_CONVIDADO]+' — '+g.POSTO+' '+g.NOME_GUERRA)}</option>`).join('')}</select></div><div class="field"><label>Posição</label><select id="agPos"><option value="DEPOIS">Depois</option><option value="ANTES">Antes</option></select></div></div><div class="modal-action-row"><button class="btn outline" onclick="openAuthorityFormLazy('',true)">NOVA AUTORIDADE</button><button id="agAddBtn" class="btn primary" onclick="confirmAddSelectedAuthority()" ${preselectId?'':'disabled'}>ADICIONAR À CERIMÔNIA</button></div>`,true);
  if(preselectId) await selectAuthorityForGuest(preselectId);
}
async function searchAuthorityForGuest(){
  const q=$('#agSearch').value; if(q.length<2){$('#agResults').innerHTML='';return;}
  const page=await server('apiListarAutoridadesPagina',q,0,30);
  $('#agResults').innerHTML=page.items.map(addGuestAuthorityResultHtml).join('')||'<div class="empty">Nenhuma autoridade encontrada.</div>';
}
async function selectAuthorityForGuest(id){
  const a=await server('apiObterAutoridade',id);
  const existing=guestAlreadyInCeremony(a);
  if(existing){
    state.addGuestSelectedAuthority=null;
    if($('#agSelected')) $('#agSelected').innerHTML=`<div class="notice"><b>Já está na cerimônia.</b> ${esc((a.POSTO?a.POSTO+' ':'')+(a.NOME_GUERRA||a.NOME_COMPLETO))} já consta na relação de convidados.</div>`;
    if($('#agAddBtn')) $('#agAddBtn').disabled=true;
    showToast('Esta autoridade já está na cerimônia.');
    if($('#agSearch') && $('#agSearch').value.length>=2) await searchAuthorityForGuest();
    return;
  }
  state.addGuestSelectedAuthority=id;
  if($('#agSelected')) $('#agSelected').innerHTML=`<div class="selected-authority">${photoHtml(a)}<div class="grow"><div class="small muted">AUTORIDADE SELECIONADA</div><div class="person-name">${esc((a.POSTO?a.POSTO+' ':'')+(a.NOME_GUERRA||a.NOME_COMPLETO))}</div><div class="person-sub">${esc(a.CARGO_ATUAL||a.NOME_COMPLETO)}</div></div></div>`;
  if($('#agAddBtn')) $('#agAddBtn').disabled=false;
  if($('#agSearch') && $('#agSearch').value.length>=2) await searchAuthorityForGuest();
}
async function confirmAddSelectedAuthority(){
  if(state.addGuestSaving)return;
  const id=state.addGuestSelectedAuthority; if(!id){showToast('Selecione uma autoridade.');return;}

  const btn=$('#agAddBtn');
  const textoAnterior=btn?btn.textContent:'ADICIONAR À CERIMÔNIA';
  state.addGuestSaving=true;
  if(btn){btn.disabled=true;btn.textContent='AGUARDE...';}
  const selected=$('#agSelected');
  if(selected)selected.insertAdjacentHTML('beforeend','<div id="agSavingNotice" class="small muted" style="margin-top:8px">Salvando convidado. Aguarde a confirmação.</div>');

  try{
    const localAuthority=state.addGuestSelectedAuthority
      ? {ID_AUTORIDADE:state.addGuestSelectedAuthority}
      : null;
    const localExisting=localAuthority && convidadosOperacao().find(g=>String(g.ID_AUTORIDADE||'')===String(localAuthority.ID_AUTORIDADE||''));
    if(localExisting){
      const aviso=$('#agSavingNotice');if(aviso)aviso.remove();
      state.addGuestSelectedAuthority=null;
      if(selected)selected.innerHTML='<div class="notice"><b>Já está na cerimônia.</b> Esta autoridade já consta na relação de convidados.</div>';
      if(btn){btn.disabled=true;btn.textContent=textoAnterior;}
      showToast('Esta autoridade já está na cerimônia.');
      return;
    }

    const c=contextCeremony();
    const result=await server('apiAdicionarConvidado',c.ID_CERIMONIA,{ID_AUTORIDADE:id,REFERENCIA_ID:$('#agRef').value,POSICAO:$('#agPos').value,STATUS_CONFIRMACAO:'PENDENTE'});
    await reloadOperationalSnapshot({silent:true});

    if(result&&result._JA_EXISTIA_NA_CERIMONIA){
      const aviso=$('#agSavingNotice');if(aviso)aviso.remove();
      state.addGuestSelectedAuthority=null;
      if(selected)selected.innerHTML='<div class="notice"><b>Já está na cerimônia.</b> A relação foi atualizada e nenhuma duplicidade foi criada.</div>';
      if(btn){btn.disabled=true;btn.textContent=textoAnterior;}
      if($('#agSearch')&&$('#agSearch').value.length>=2)await searchAuthorityForGuest();
      showToast('Esta autoridade já está na cerimônia.');
      return;
    }

    closeModal();
    state.addGuestSelectedAuthority=null;
    showToast('Convidado adicionado.');
    renderEvento();
  }catch(e){
    const aviso=$('#agSavingNotice');if(aviso)aviso.remove();
    if(btn){btn.disabled=false;btn.textContent=textoAnterior;}
    showToast((e&&e.message)||'Não foi possível adicionar o convidado.');
    throw e;
  }finally{
    state.addGuestSaving=false;
  }
}

async function openRegisterGuestAuthority(id){
  const c=contextCeremony(),g=convidadoOperacaoPorId(id)||await server('apiObterConvidado',c.ID_CERIMONIA,id); if(!g)return;
  openModal(`${modalCloseButton()}<h2>Cadastrar convidado no banco</h2><p class="small muted">A autoridade será inserida fisicamente em AUTORIDADES na mesma posição relativa da cerimônia. Nenhum campo abaixo é requisito para manter o convidado na formatura.</p><div class="grid2"><div class="field"><label>Posto / tratamento</label><input id="rgPosto" value="${esc(g.POSTO||'')}"></div><div class="field"><label>Nome de guerra</label><input id="rgGuerra" value="${esc(g.NOME_GUERRA||'')}"></div></div><div class="field"><label>Nome completo</label><input id="rgNome" value="${esc(g.NOME_COMPLETO||'')}"></div><div class="field"><label>Cargo atual</label><input id="rgCargo" value="${esc(g.CARGO_ATUAL||'')}"></div><div class="grid2"><div class="field"><label>Força / tipo</label><select id="rgForca"><option value="">Selecione</option>${authorityForceOptions('')}</select></div><div class="field"><label>Situação</label><select id="rgSit"><option value="">Selecione</option><option>ATIVA</option><option>RESERVA</option></select></div></div><div class="grid2"><div class="field"><label>Sexo</label><select id="rgSexo"><option value=""></option><option>MASCULINO</option><option>FEMININO</option></select></div><div class="field"><label>Foto</label><input id="rgFoto" type="file" accept="image/*" capture="environment"></div></div><button class="btn primary block" onclick="saveGuestToBank('${id}')">SALVAR EM AUTORIDADES</button>`,true);
}
async function saveGuestToBank(id){
  const c=contextCeremony(),f=$('#rgFoto').files[0],payload={POSTO:$('#rgPosto').value,NOME_COMPLETO:$('#rgNome').value,NOME_GUERRA:$('#rgGuerra').value,CARGO_ATUAL:$('#rgCargo').value,FORCA:$('#rgForca').value,SITUACAO:$('#rgSit').value,SEXO:$('#rgSexo').value,HONRAS_OVERRIDE:'AUTO',PRESIDIR_OVERRIDE:'AUTO'};
  if(f){const img=await readImageForUpload(f);payload.FOTO_NOME=img.name;payload.FOTO_MIME=img.mime;payload.FOTO_BASE64=img.data;}
  await server('apiCadastrarConvidadoNoBanco',c.ID_CERIMONIA,id,payload);
  await reloadOperationalSnapshot({silent:true});
  closeModal(); showToast('Autoridade cadastrada no banco.');
  navigate(state.screen);
}


/* -------------------------------------------------------------------------- */
/* FAMILIARES                                                                  */
/* -------------------------------------------------------------------------- */
async function renderFamiliares(){
  const c=contextCeremony();if(!c){$('#main').innerHTML='<div class="empty">Nenhuma cerimônia ativa.</div>';return;}
  if(!operacaoAtual().ready||operacaoAtual().idCer!==String(c.ID_CERIMONIA))await reloadOperationalSnapshot({silent:true});
  const list=familiaresOperacao();
  $('#main').innerHTML=`<div class="page-head mobile-inline-head"><div><div class="section-title">FAMILIARES</div><div class="small muted">${esc(c.NOME_EVENTO)} | ${list.length} cadastrados</div></div><div class="page-actions single"><button class="btn primary" onclick="openFamilyForm()">ADICIONAR</button></div></div>${familyList(list)}`;
}
function familyList(list){ if(!list.length)return'<div class="empty">Nenhum familiar cadastrado.</div>'; return`<div class="person-list two-col">${list.map(f=>`<div class="person-card clickable" onclick="openFamilyDetail('${f.ID_FAMILIAR}')"><div class="avatar placeholder">FAM.</div><div class="grow"><div class="person-name">${esc(f.NOME)}</div><div class="person-sub">${esc(f.VINCULO+' de '+f.AUTORIDADE)}</div></div><div class="person-right">${f.PRESENCA?'<span class="badge present">PRESENTE</span>':badgeStatus(f.STATUS_CONFIRMACAO)}</div></div>`).join('')}</div>`; }
async function openFamilyForm(id=''){
  const c=contextCeremony();if(!c)return;
  if(!operacaoAtual().ready)await reloadOperationalSnapshot({silent:true});
  const fams=familiaresOperacao(),guests=convidadosOperacao(),f=fams.find(x=>x.ID_FAMILIAR===id)||{};
  openModal(`${modalCloseButton()}<h2>${id?'Editar':'Adicionar'} familiar</h2><div class="field"><label>Nome</label><input id="fNome" value="${esc(f.NOME||'')}"></div><div class="grid2"><div class="field"><label>Vínculo</label><select id="fVinc">${['ESPOSA','ESPOSO','FILHO','FILHA','PAI','MÃE','OUTRO'].map(x=>`<option ${f.VINCULO===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Status</label><select id="fStatus">${['CONFIRMADO','PENDENTE','NÃO COMPARECERÁ'].map(x=>`<option ${f.STATUS_CONFIRMACAO===x?'selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><label>Autoridade vinculada</label><select id="fAut">${guests.map(g=>`<option value="${esc(g.NOME_COMPLETO)}" ${f.AUTORIDADE===g.NOME_COMPLETO?'selected':''}>${esc(g.POSTO+' '+g.NOME_GUERRA)}</option>`).join('')}</select></div><button class="btn primary block" onclick="saveFamily('${id}',${Number.isFinite(Number(f.PRECEDENCIA))?Number(f.PRECEDENCIA):''})">SALVAR</button>`);
}
async function saveFamily(id,prec){
  const c=contextCeremony();await server('apiSalvarFamiliar',c.ID_CERIMONIA,{ID_FAMILIAR:id,NOME:$('#fNome').value,VINCULO:$('#fVinc').value,AUTORIDADE:$('#fAut').value,PRECEDENCIA:prec||'',STATUS_CONFIRMACAO:$('#fStatus').value});
  await reloadOperationalSnapshot({silent:true});closeModal();renderFamiliares();
}
async function openFamilyDetail(id){
  const f=familiarOperacaoPorId(id);if(!f)return;
  openModal(`${modalCloseButton()}<h2>${esc(f.NOME)}</h2><p class="muted">${esc(f.VINCULO)} de ${esc(f.AUTORIDADE)}</p><dl class="detail-grid compact"><dt>Status</dt><dd>${badgeStatus(f.STATUS_CONFIRMACAO)}</dd></dl><div class="actions">${f.PRESENCA?`<button class="btn danger" onclick="familyPresence('${id}',false)">CANCELAR PRESENÇA</button>`:`<button class="btn ok" onclick="familyPresence('${id}',true)">CONFIRMAR PRESENÇA</button>`}<button class="btn outline" onclick="addFamilyToNominata('${id}')">ADICIONAR À NOMINATA</button><button class="btn outline" onclick="openFamilyForm('${id}')">EDITAR</button><button class="btn danger" onclick="deleteFamily('${id}')">EXCLUIR</button></div>`);
}
async function familyPresence(id,on){
  const c=contextCeremony(),old=familiarOperacaoPorId(id);if(!c||!old)return;
  const anterior=Object.assign({},old);atualizarFamiliarLocal(id,{PRESENCA:!!on,PRESENTE_EM:on?new Date().toISOString():''});closeModal();renderFamiliares();
  try{await server(on?'apiMarcarPresencaFamiliar':'apiCancelarPresencaFamiliar',c.ID_CERIMONIA,id);showToast(on?'Presença do familiar confirmada.':'Presença do familiar cancelada.');}
  catch(e){atualizarFamiliarLocal(id,anterior);renderFamiliares();showToast('Não foi possível confirmar a alteração.');throw e;}
}
async function addFamilyToNominata(id){ const c=contextCeremony(); await server('apiAdicionarItemNominata',{ID_CERIMONIA:c.ID_CERIMONIA,TIPO_ITEM:'FAMILIAR',REFERENCIA_ID:id}); closeModal(); showToast('Familiar adicionado à nominata.'); }
async function deleteFamily(id){ if(!confirm('Excluir este familiar?'))return; const c=contextCeremony(); await server('apiExcluirFamiliar',c.ID_CERIMONIA,id); await reloadOperationalSnapshot({silent:true}); closeModal(); renderFamiliares(); }
