/* SGCM 3.0 — Tribuna */
function fitTribunaStage(){
  const vp=$('.tribuna-viewport'),stage=$('.tribuna-stage');if(!vp||!stage)return;
  const base=Number(stage.dataset.baseWidth)||stage.scrollWidth||1;
  const isMobile=window.matchMedia('(pointer: coarse)').matches||window.innerWidth<=900;

  stage.style.transform='none';
  stage.style.left='auto';
  stage.style.position='relative';
  stage.style.transformOrigin='top center';

  if(isMobile){
    // Em celular, não reduzimos os círculos a ponto de ficarem ilegíveis.
    // A composição permanece em tamanho útil e o usuário desloca horizontalmente.
    vp.style.overflowX='auto';
    vp.style.overflowY='hidden';
    vp.style.height='auto';
    stage.style.width=base+'px';
    stage.style.margin='0 auto';
    return;
  }

  // Desktop: centraliza o palco e reduz somente o necessário para caber integralmente.
  vp.style.overflow='hidden';
  const avail=Math.max(1,vp.clientWidth-24);
  const scale=Math.min(1,avail/base);
  stage.style.width=base+'px';
  stage.style.left='50%';
  stage.style.margin='0';
  stage.style.transform=`translateX(-50%) scale(${scale})`;
  vp.style.height=Math.ceil(stage.scrollHeight*scale+16)+'px';
}
async function renderTribuna(){
  const c=contextCeremony();if(!c){$('#main').innerHTML='<div class="empty">Nenhuma cerimônia ativa.</div>';return;}
  const data=await server('apiObterTribuna',c.ID_CERIMONIA);
  let html=`<div class="page-head"><div><div class="section-title">TRIBUNA</div><div class="small muted">${esc(c.NOME_EVENTO)}</div></div></div><div class="card"><div class="grid3"><div class="field"><label>Lógica</label><select id="tLogic"><option value="IMPAR" ${data.config.LOGICA_TRIBUNA==='IMPAR'?'selected':''}>ÍMPAR</option><option value="PAR" ${data.config.LOGICA_TRIBUNA==='PAR'?'selected':''}>PAR</option></select></div><div class="field"><label>Fileiras</label><input id="tRows" type="number" min="1" max="3" value="${data.config.NUM_FILEIRAS}"></div><div class="field"><label>Pessoas por fileira</label><input id="tSeats" type="number" min="1" max="25" value="${data.config.QTD_POR_FILEIRA}"></div></div><button class="btn primary" onclick="saveTribunaConfig()">ATUALIZAR COMPOSIÇÃO</button></div>`;
  if(data.avisos?.length)html+=data.avisos.map(a=>`<div class="notice">${esc(a)}</div>`).join('');
  if(data.fileiras?.length){
    const maxSeats=Math.max(...data.fileiras.map(fr=>fr.posicoes.length),1),baseWidth=Math.max(360,maxSeats*96);
    html+=`<div class="tribuna-wrap"><div class="tropa">FRENTE DA TROPA</div><div class="tribuna-viewport"><div class="tribuna-stage" data-base-width="${baseWidth}" style="width:${baseWidth}px">${data.fileiras.map(fr=>`<div class="fileira-label">FILEIRA ${fr.numero}</div><div class="tribuna-row" style="--seat-count:${fr.posicoes.length}">${fr.posicoes.map(tribunaCircleHtml).join('')}</div>`).join('')}</div></div></div>`;
  } else html+='<div class="empty">A composição ainda não pode ser exibida.</div>';
  $('#main').innerHTML=html;requestAnimationFrame(fitTribunaStage);
}
async function saveTribunaConfig(){const c=contextCeremony();await server('apiSalvarConfigTribuna',c.ID_CERIMONIA,{LOGICA_TRIBUNA:$('#tLogic').value,NUM_FILEIRAS:$('#tRows').value,QTD_POR_FILEIRA:$('#tSeats').value});renderTribuna();}

