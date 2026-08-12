/* -------------------------------------------------------------------------- */
/* CERIMÔNIAS                                                                  */
/* -------------------------------------------------------------------------- */
async function renderCerimonias(){
  const list=(state.bootstrap?.cerimonias||[]);
  let html=`<div class="page-head mobile-inline-head"><div><div class="section-title">CERIMÔNIAS</div><div class="small muted">Prepare várias cerimônias; somente uma pode permanecer ativa.</div></div><div class="page-actions single"><button class="btn primary" onclick="openCeremonyForm()">NOVA CERIMÔNIA</button></div></div>`;
  if(!list.length) html+='<div class="empty">Nenhuma cerimônia cadastrada.</div>';
  else html+=`<div class="ceremony-grid">${list.map(c=>`<div class="card ${c.STATUS==='ATIVA'?'active-card':'standby-card'}"><div class="row between"><div class="grow"><div class="event-name">${esc(c.NOME_EVENTO)}</div><div class="small muted">${esc(formatDate(c.DATA))}${c.LOCAL?' | '+esc(c.LOCAL):''}</div></div><span class="badge ${c.STATUS==='ATIVA'?'active':''}">${esc(c.STATUS)}</span></div><div class="actions compact">${c.STATUS==='ATIVA'?'<span class="small muted">Cerimônia operacional.</span>':`<button class="btn primary sm" onclick="activateCeremony('${c.ID_CERIMONIA}')">ATIVAR</button><button class="btn danger sm" onclick="deleteCeremony('${c.ID_CERIMONIA}')">EXCLUIR</button>`}<button class="btn outline sm" onclick="openCeremonyForm('${c.ID_CERIMONIA}')">EDITAR</button></div></div>`).join('')}</div>`;
  $('#main').innerHTML=html;
}

function openCeremonyForm(id=''){
  const c=(state.bootstrap?.cerimonias||[]).find(x=>x.ID_CERIMONIA===id)||{};
  openModal(`${modalCloseButton()}<h2>${id?'Editar':'Nova'} cerimônia</h2><div class="field"><label>Nome</label><input id="ceName" value="${esc(c.NOME_EVENTO||'')}"></div><div class="grid2"><div class="field"><label>Data</label><input id="ceDate" type="date" value="${esc(c.DATA||'')}"></div><div class="field"><label>Local</label><input id="ceLocal" value="${esc(c.LOCAL||'')}"></div></div><button class="btn primary block" onclick="saveCeremony('${esc(id)}')">SALVAR</button>`);
}
async function saveCeremony(id){ await server('apiSalvarCerimonia',{ID_CERIMONIA:id,NOME_EVENTO:$('#ceName').value,DATA:$('#ceDate').value,LOCAL:$('#ceLocal').value}); closeModal(); await reloadOperationalSnapshot({silent:true}); renderCerimonias(); }
async function activateCeremony(id){ const atual=activeCeremony(); if(atual&&!confirm(`A cerimônia atualmente ativa é "${atual.NOME_EVENTO}". Colocá-la em STANDBY e ativar a selecionada?`))return; await server('apiAtivarCerimonia',id); await reloadOperationalSnapshot({silent:true}); showToast('Cerimônia ativada.'); renderCerimonias(); }
async function deleteCeremony(id){ if(!confirm('Excluir a cerimônia e suas duas abas de planejamento? Esta operação não pode ser desfeita.'))return; await server('apiExcluirCerimonia',id); await reloadOperationalSnapshot({silent:true}); renderCerimonias(); }

