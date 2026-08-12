/* -------------------------------------------------------------------------- */
/* AUTORIDADES                                                                 */
/* -------------------------------------------------------------------------- */
function overrideOptions(selected){ return ['AUTO','SIM','NÃO'].map(x=>`<option ${selected===x?'selected':''}>${x}</option>`).join(''); }

function renderAuthorityPage(page){
  state.authorityPage={query:page.query||'',items:page.items||[],nextOffset:page.proximoOffset,total:page.total||0};
  $('#main').innerHTML=`<div class="page-head mobile-inline-head"><div><div class="section-title">AUTORIDADES</div><div class="small muted"><strong>${state.authorityPage.total}</strong> autoridades no banco, na mesma ordem da planilha.</div></div><div class="page-actions single"><button class="btn primary" onclick="openAuthorityForm()">NOVA AUTORIDADE</button></div></div><div class="searchbar"><input id="autSearch" placeholder="Pesquisar por nome, posto, cargo ou força" oninput="scheduleAuthoritySearch(this.value)"></div><div id="autArea">${authorityList(state.authorityPage.items)}</div><div id="autMore" class="load-more-wrap">${state.authorityPage.nextOffset!==null?'<button class="btn outline" onclick="loadMoreAuthorities()">CARREGAR MAIS</button>':''}</div>`;
}
async function renderAutoridades(){
  const cached=cacheGet('authority_first_page',24*60*60*1000);
  if(cached) renderAuthorityPage(cached);
  try{
    const page=await server('apiListarAutoridadesPagina','',0,40);
    page.query=''; cacheSet('authority_first_page',page); renderAuthorityPage(page);
  }catch(e){if(!cached)throw e;showToast('Sem conexão. Exibindo banco salvo neste aparelho.');}
}

function authorityList(list){
  if(!list.length)return'<div class="empty">Nenhuma autoridade encontrada.</div>';
  return `<div class="authority-grid">${list.map(a=>`<div class="person-card clickable" onclick="openAuthorityDetail('${a.ID_AUTORIDADE}')">${photoHtml(a)}<div class="grow"><div class="person-name">${esc((a.POSTO?a.POSTO+' ':'')+(a.NOME_GUERRA||a.NOME_COMPLETO))}</div><div class="person-sub">${esc(a.CARGO_ATUAL)}</div></div><div class="person-right">${esc(a.FORCA)}</div></div>`).join('')}</div>`;
}

function scheduleAuthoritySearch(q){ clearTimeout(state.authoritySearchTimer); state.authoritySearchTimer=setTimeout(()=>searchAuthorities(q),420); }
async function searchAuthorities(q){ const query=String(q||'').trim(); const page=await server('apiListarAutoridadesPagina',query,0,40); state.authorityPage={query,items:page.items,nextOffset:page.proximoOffset,total:page.total}; $('#autArea').innerHTML=authorityList(page.items); $('#autMore').innerHTML=page.proximoOffset!==null?'<button class="btn outline" onclick="loadMoreAuthorities()">CARREGAR MAIS</button>':''; }
async function loadMoreAuthorities(){ const p=state.authorityPage; if(p.nextOffset===null)return; const page=await server('apiListarAutoridadesPagina',p.query,p.nextOffset,40); p.items=p.items.concat(page.items); p.nextOffset=page.proximoOffset; p.total=page.total; $('#autArea').innerHTML=authorityList(p.items); $('#autMore').innerHTML=p.nextOffset!==null?'<button class="btn outline" onclick="loadMoreAuthorities()">CARREGAR MAIS</button>':''; }

async function openAuthorityDetail(id){
  const a=await server('apiObterAutoridade',id); if(!a)return;
  openModal(`${modalCloseButton()}${photoHtml(a,'modal-photo')}<h2>${esc((a.POSTO?a.POSTO+' ':'')+(a.NOME_GUERRA||a.NOME_COMPLETO))}</h2><dl class="detail-grid"><dt>Nome completo</dt><dd>${esc(a.NOME_COMPLETO||'—')}</dd><dt>Posto / tratamento</dt><dd>${esc(a.POSTO||'—')}</dd><dt>Posto por extenso</dt><dd>${esc(a.POSTO_EXTENSO||'—')}</dd><dt>Cargo atual</dt><dd>${esc(a.CARGO_ATUAL||'—')}</dd><dt>Força / tipo</dt><dd>${esc(a.FORCA||'—')}</dd><dt>Situação</dt><dd>${esc(a.SITUACAO||'—')}</dd><dt>Sexo</dt><dd>${esc(a.SEXO||'—')}</dd><dt>Vocativo</dt><dd>${esc(a.VOCATIVO||'—')}</dd><dt>Faz jus a honras</dt><dd>${a.FAZ_JUS_HONRAS?'SIM':'NÃO'} <span class="small muted">(controle: ${esc(a.HONRAS_OVERRIDE||'AUTO')})</span></dd><dt>Pode presidir</dt><dd>${a.PODE_PRESIDIR?'SIM':'NÃO'} <span class="small muted">(controle: ${esc(a.PRESIDIR_OVERRIDE||'AUTO')})</span></dd></dl><div class="actions"><button class="btn primary" onclick="openAuthorityForm('${id}')">EDITAR AUTORIDADE</button></div>`,true);
}

async function openAuthorityForm(id='',addAfter=false){
  const a=id?await server('apiObterAutoridade',id):{};
  openModal(`${modalCloseButton()}<h2>${id?'Editar':'Nova'} autoridade</h2>${a&&a.FOTO_FILE_ID?photoHtml(a,'modal-photo'):''}${id?`<div class="record-id">ID: ${esc(a.ID_AUTORIDADE||id)}</div>`:''}<div class="grid2"><div class="field"><label>Posto / tratamento</label><input id="aPosto" value="${esc(a?.POSTO||'')}"></div><div class="field"><label>Nome de guerra</label><input id="aGuerra" value="${esc(a?.NOME_GUERRA||'')}"></div></div><div class="field"><label>Nome completo</label><input id="aNome" value="${esc(a?.NOME_COMPLETO||'')}"></div><div class="grid2"><div class="field"><label>Posto / tratamento por extenso</label><input id="aPostoExt" value="${esc(a?.POSTO_EXTENSO||'')}" readonly><div class="small muted" style="margin-top:4px">Calculado automaticamente pela aba POSTOS.</div></div><div class="field"><label>Vocativo</label><input id="aVoc" value="${esc(a?.VOCATIVO||'')}"></div></div><div class="field"><label>Cargo atual</label><input id="aCargo" value="${esc(a?.CARGO_ATUAL||'')}"></div><div class="grid2"><div class="field"><label>Força / tipo</label><select id="aForca"><option value="">Selecione</option>${authorityForceOptions(a?.FORCA||'')}</select></div><div class="field"><label>Situação</label><select id="aSit"><option value="">Selecione</option><option ${a?.SITUACAO==='ATIVA'?'selected':''}>ATIVA</option><option ${a?.SITUACAO==='RESERVA'?'selected':''}>RESERVA</option></select></div></div><div class="grid2"><div class="field"><label>Sexo</label><select id="aSexo"><option value=""></option><option ${a?.SEXO==='MASCULINO'?'selected':''}>MASCULINO</option><option ${a?.SEXO==='FEMININO'?'selected':''}>FEMININO</option></select></div><div class="field"><label>Foto</label><input id="aFoto" type="file" accept="image/*" capture="environment"></div></div><div class="grid2"><div class="field"><label>Faz jus a honras</label><select id="aHonras">${overrideOptions(a?.HONRAS_OVERRIDE||'AUTO')}</select><div class="small muted" style="margin-top:4px">AUTO aplica a regra; SIM/NÃO força a correção imediata.</div></div><div class="field"><label>Pode presidir</label><select id="aPresidir">${overrideOptions(a?.PRESIDIR_OVERRIDE||'AUTO')}</select><div class="small muted" style="margin-top:4px">AUTO aplica a regra; SIM/NÃO força a correção imediata.</div></div></div><div class="notice">Alterações feitas aqui são gravadas diretamente no banco AUTORIDADES e passam a valer para a cerimônia.</div><button class="btn primary block" onclick="saveAuthority('${esc(id)}',${addAfter?'true':'false'})">SALVAR ALTERAÇÕES</button>`,true);
}

async function saveAuthority(id,addAfter){
  const f=$('#aFoto').files[0];
  const payload={ID_AUTORIDADE:id,POSTO:$('#aPosto').value,NOME_COMPLETO:$('#aNome').value,NOME_GUERRA:$('#aGuerra').value,CARGO_ATUAL:$('#aCargo').value,FORCA:$('#aForca').value,SITUACAO:$('#aSit').value,SEXO:$('#aSexo').value,VOCATIVO:$('#aVoc').value,HONRAS_OVERRIDE:$('#aHonras').value,PRESIDIR_OVERRIDE:$('#aPresidir').value};
  if(f){const img=await readImageForUpload(f);payload.FOTO_NOME=img.name;payload.FOTO_MIME=img.mime;payload.FOTO_BASE64=img.data;}
  const a=await server('apiSalvarAutoridade',payload); closeModal(); showToast('Autoridade salva.');
  cacheRemove('authority_first_page');
  if(activeCeremony())try{await reloadOperationalSnapshot({silent:true});}catch(e){}
  if(addAfter){ await openAddGuest(a.ID_AUTORIDADE); $('#agSearch').value=a.NOME_COMPLETO; await searchAuthorityForGuest(); }
  else if(state.screen==='autoridades') renderAutoridades();
  else if(state.screen==='evento') renderEvento();
}
