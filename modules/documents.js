/* -------------------------------------------------------------------------- */
/* DOCUMENTOS / GUIA                                                           */
/* -------------------------------------------------------------------------- */
async function renderDocumentos(){
  const c=contextCeremony();
  if(!c){$('#main').innerHTML='<div class="empty">Nenhuma cerimônia ativa.</div>';return;}
  $('#main').innerHTML=`
    <div class="page-head">
      <div><div class="section-title">GERAR ARQUIVOS</div><div class="small muted">${esc(c.NOME_EVENTO)}</div></div>
    </div>
    <div class="card">
      <p class="small muted">Os documentos são gerados com base na situação atual da cerimônia. Na emissão, o sistema considera os convidados que estiverem PRESENTES. O Anexo à Locução Agrupado consolida automaticamente embaixadores acreditados e autoridades consecutivas do mesmo cargo, preservando a ordem da Nominata.</p>
      <div class="actions">
        <button class="btn primary" onclick="genDoc('nominata')">GERAR ANEXO À LOCUÇÃO</button>
        <button id="btnAnexoAgrupado" class="btn primary" onclick="gerarAnexoLocucaoAgrupado()">GERAR ANEXO À LOCUÇÃO AGRUPADO</button>
        <button class="btn primary" onclick="gerarNominataFamiliares()">GERAR NOMINATA COM FAMILIARES</button>
        <button class="btn primary" onclick="genDoc('tribuna')">GERAR TRIBUNA DE HONRA</button>
      </div>
      <div id="docResult"></div>
    </div>`;
}

async function gerarAnexoLocucaoAgrupado(){
  const c=contextCeremony();if(!c)return;
  const btn=$('#btnAnexoAgrupado');
  if(btn&&btn.disabled)return;
  const textoOriginal=btn?btn.textContent:'';
  if(btn){btn.disabled=true;btn.textContent='AGUARDE...';}
  $('#docResult').innerHTML='<p class="small muted">Gerando Anexo à Locução agrupado...</p>';
  try{
    const r=await server('apiGerarAnexoLocucaoAgrupado',c.ID_CERIMONIA);
    $('#docResult').innerHTML=`<p><a class="btn outline" href="${esc(r.url)}" target="_blank">ABRIR DOCUMENTO GERADO</a></p><p class="small muted">${esc(r.nome)}</p>`;
  }catch(e){
    $('#docResult').innerHTML=`<div class="notice danger-notice">${esc(e.message||e)}</div>`;
  }finally{
    if(btn){btn.disabled=false;btn.textContent=textoOriginal||'GERAR ANEXO À LOCUÇÃO AGRUPADO';}
  }
}

async function gerarNominataFamiliares(){
  const c=contextCeremony();if(!c)return;
  $('#docResult').innerHTML='<p class="small muted">Gerando nominata com familiares...</p>';
  try{
    const r=await server('apiGerarNominataComFamiliares',c.ID_CERIMONIA);
    $('#docResult').innerHTML=`<p><a class="btn outline" href="${esc(r.url)}" target="_blank">ABRIR DOCUMENTO GERADO</a></p><p class="small muted">${esc(r.nome)}</p>`;
  }catch(e){
    $('#docResult').innerHTML=`<div class="notice danger-notice">${esc(e.message||e)}</div>`;
  }
}

async function genDoc(type){ const c=contextCeremony(); $('#docResult').innerHTML='<p class="small muted">Gerando documento...</p>'; try{ const r=await server(type==='tribuna'?'apiGerarTribunaDocumento':'apiGerarNominata',c.ID_CERIMONIA); $('#docResult').innerHTML=`<p><a class="btn outline" href="${esc(r.url)}" target="_blank">ABRIR DOCUMENTO GERADO</a></p><p class="small muted">${esc(r.nome)}</p>`; }catch(e){ $('#docResult').innerHTML=`<div class="notice danger-notice">${esc(e.message)}</div>`; } }
