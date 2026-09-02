const state = {
  screen: 'recepcao',
  bootstrap: null,
  currentGuest: null,
  eventGuests: [],
  visiblePeople: [],
  authorityPage: { query: '', items: [], nextOffset: null, total: 0 },
  authoritySearchTimer: null,
  nomData: null,
  nomItems: [],
  statsConfig: null,
  addGuestSelectedAuthority: null,
  operation: { idCer:'', versao:'0', convidados:[], familiares:[], atualizadoEm:'', ready:false }
};

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

const CACHE_PREFIX='SGCM30_';
function cacheSet(key,value){
  try{localStorage.setItem(CACHE_PREFIX+key,JSON.stringify({at:Date.now(),value}));}catch(e){}
}
function cacheGet(key,maxAgeMs=12*60*60*1000){
  try{
    const raw=localStorage.getItem(CACHE_PREFIX+key); if(!raw)return null;
    const obj=JSON.parse(raw); if(!obj||!obj.at)return null;
    if(Date.now()-obj.at>maxAgeMs)return null;
    return obj.value;
  }catch(e){return null}
}
function cacheRemove(key){try{localStorage.removeItem(CACHE_PREFIX+key)}catch(e){}}
function ceremonyCacheKey(kind,id){return kind+'_'+String(id||'');}
const SGCM_READ_ACTIONS = new Set([
  'apiBootstrap','apiStatusSistema','apiOperacaoSnapshot','apiListarCerimonias','apiListarConvidados','apiListarConvidadosResumo',
  'apiObterConvidado','apiObterConvidadoResumo','apiListarAutoridades','apiListarAutoridadesPagina',
  'apiObterAutoridade','apiListarFamiliares','apiObterTribuna','apiListarNominata','apiNominataPainel',
  'apiListarMensagensNominata','apiEstatisticas','apiListarGruposEstatistica',
  'apiOpcoesEstatistica','apiDashboard','apiDashboardVersao','apiFotoBase64','apiFotosBase64Lote'
]);

function apiUrl(){
  const u = String(window.SGCM_CONFIG?.WEB_APP_URL || '').trim();
  if(!u || u.includes('COLE_AQUI')) throw new Error('Configure WEB_APP_URL em config.js.');
  return u;
}

let __sgcmBridge=null;
const transportState={mode:'INICIANDO',lastError:'',lastChange:Date.now()};
function setTransportMode(mode,error=''){transportState.mode=mode;transportState.lastError=String(error||'');transportState.lastChange=Date.now();}
function transportLabel(){return transportState.mode==='BRIDGE'?'BRIDGE CONECTADO':transportState.mode==='OFFLINE'?'BRIDGE INDISPONÍVEL':'CONECTANDO';}

async function initBridgeTransport(timeoutMs=6500,forceRestart=false){
  try{
    if(typeof window.SGCMBridgeClient!=='function')throw new Error('Cliente do Bridge não foi carregado.');
    if(!__sgcmBridge)__sgcmBridge=new window.SGCMBridgeClient(apiUrl(),{origin:location.origin});
    else if(forceRestart)__sgcmBridge.restart();
    const ok=await __sgcmBridge.waitReady(timeoutMs);
    if(!ok)throw new Error('O Bridge do Apps Script não respondeu.');
    setTransportMode('BRIDGE');
    return true;
  }catch(e){setTransportMode('OFFLINE',e);return false;}
}
function bridgeReady(){return !!(__sgcmBridge&&__sgcmBridge.ready);}

async function server(fn,...args){
  const leitura=SGCM_READ_ACTIONS.has(fn);
  if(!bridgeReady()){
    const ok=await initBridgeTransport(6500,false);
    if(!ok)throw new Error('Não foi possível conectar ao Apps Script. Verifique WEB_APP_URL, a implantação e a origem do frontend.');
  }
  try{
    const value=await __sgcmBridge.request(fn,args,leitura?22000:45000);
    setTransportMode('BRIDGE');
    return value;
  }catch(e){
    // Uma escrita nunca é repetida automaticamente, pois a confirmação pode ter
    // se perdido depois de o servidor já ter gravado a alteração.
    if(!leitura){setTransportMode('OFFLINE',e);throw e;}

    // Leituras são idempotentes: uma reconexão única é segura.
    const ok=await initBridgeTransport(6500,true);
    if(!ok)throw e;
    try{
      const value=await __sgcmBridge.request(fn,args,22000);
      setTransportMode('BRIDGE');
      return value;
    }catch(e2){setTransportMode('OFFLINE',e2);throw e2;}
  }
}

function showToast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),2600); }
function openModal(html,wide=false){ $('#modal').classList.toggle('modal-wide',!!wide); $('#modal').innerHTML=html; $('#modalBackdrop').classList.remove('hidden'); }
function closeModal(e){ if(e && e.target!==$('#modalBackdrop'))return; $('#modalBackdrop').classList.add('hidden'); $('#modal').classList.remove('modal-wide'); $('#modal').innerHTML=''; }
function modalCloseButton(){ return '<button class="modal-close" onclick="closeModal()">FECHAR</button>'; }
function toggleDrawer(on){ $('#drawer').classList.toggle('open',on); $('#drawerBackdrop').classList.toggle('hidden',!on); }
function sideNavigate(s){ toggleDrawer(false); navigate(s); }
function activeCeremony(){ return state.bootstrap && state.bootstrap.ativa; }
function contextCeremony(){ return activeCeremony(); }

function operacaoAtual(){return state.operation||{idCer:'',versao:'0',convidados:[],familiares:[],ready:false};}
function convidadosOperacao(){const c=contextCeremony(),o=operacaoAtual();return c&&o.idCer===String(c.ID_CERIMONIA)?(o.convidados||[]):[];}
function familiaresOperacao(){const c=contextCeremony(),o=operacaoAtual();return c&&o.idCer===String(c.ID_CERIMONIA)?(o.familiares||[]):[];}
function convidadoOperacaoPorId(id){return convidadosOperacao().find(g=>String(g.ID_CONVIDADO)===String(id))||null;}
function familiarOperacaoPorId(id){return familiaresOperacao().find(f=>String(f.ID_FAMILIAR)===String(id))||null;}

function aplicarSnapshotOperacional(snap,fromCache=false){
  if(!snap)return false;
  if(snap.bootstrap)state.bootstrap=snap.bootstrap;
  state.operation={
    idCer:String(snap.idCer||''),versao:String(snap.versao||'0'),
    convidados:Array.isArray(snap.convidados)?snap.convidados:[],
    familiares:Array.isArray(snap.familiares)?snap.familiares:[],
    atualizadoEm:snap.atualizadoEm||'',ready:true,fromCache:!!fromCache
  };
  state.eventGuests=state.operation.convidados;
  updateHeader();
  return true;
}

function salvarSnapshotOperacional(snap){
  try{localStorage.setItem(CACHE_PREFIX+'operation_snapshot',JSON.stringify({at:Date.now(),value:snap}));}catch(e){}
}
function carregarSnapshotOperacionalCache(maxAgeMs=24*60*60*1000){
  try{
    const raw=localStorage.getItem(CACHE_PREFIX+'operation_snapshot');if(!raw)return null;
    const obj=JSON.parse(raw);if(!obj||!obj.at||Date.now()-obj.at>maxAgeMs)return null;
    return obj.value||null;
  }catch(e){return null;}
}

async function reloadOperationalSnapshot(options={}){
  const silent=!!options.silent;
  try{
    const snap=await server('apiOperacaoSnapshot');
    aplicarSnapshotOperacional(snap,false);salvarSnapshotOperacional(snap);cacheSet('bootstrap',state.bootstrap);
    return snap;
  }catch(e){
    const cached=carregarSnapshotOperacionalCache();
    if(cached){
      aplicarSnapshotOperacional(cached,true);
      if(!silent)showToast('Sem resposta do backend. Exibindo a última sincronização operacional.');
      return cached;
    }
    throw e;
  }
}

function atualizarConvidadoLocal(id,patch){
  const o=operacaoAtual(),idx=(o.convidados||[]).findIndex(g=>String(g.ID_CONVIDADO)===String(id));
  if(idx<0)return null;
  o.convidados[idx]=Object.assign({},o.convidados[idx],patch||{});
  state.eventGuests=o.convidados;
  salvarSnapshotOperacional({bootstrap:state.bootstrap,idCer:o.idCer,versao:o.versao,convidados:o.convidados,familiares:o.familiares,atualizadoEm:new Date().toISOString()});
  return o.convidados[idx];
}
function atualizarFamiliarLocal(id,patch){
  const o=operacaoAtual(),idx=(o.familiares||[]).findIndex(f=>String(f.ID_FAMILIAR)===String(id));
  if(idx<0)return null;
  o.familiares[idx]=Object.assign({},o.familiares[idx],patch||{});
  salvarSnapshotOperacional({bootstrap:state.bootstrap,idCer:o.idCer,versao:o.versao,convidados:o.convidados,familiares:o.familiares,atualizadoEm:new Date().toISOString()});
  return o.familiares[idx];
}

function filtroOperacao(tipo){
  const list=convidadosOperacao();
  if(tipo==='RECEPCAO')return list.filter(g=>!g.PRESENCA&&(g.STATUS_CONFIRMACAO==='CONFIRMADO'||g.STATUS_CONFIRMACAO==='PENDENTE'));
  if(tipo==='PRESENTES')return list.filter(g=>!!g.PRESENCA);
  return list;
}

function formatDate(s){ if(!s)return''; const p=String(s).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:s; }
function badgeStatus(s){ const u=String(s||'').toUpperCase(); if(u.includes('NÃO'))return '<span class="badge no">NÃO COMPARECERÁ</span>'; if(u.includes('CONFIRM'))return '<span class="badge active">CONFIRMADO</span>'; return '<span class="badge pending">PENDENTE</span>'; }

const AUTHORITY_FORCES=['Presidente da República','Vice-Presidente da República','Presidente do Senado Federal','Presidente da Câmara dos Deputados','Presidente do Supremo Tribunal Federal','Ministro de Estado da Defesa','Autoridade Civil','Aeronáutica','Exército','Marinha'];
function authorityForceOptions(selected){
  const list=selected&&!AUTHORITY_FORCES.includes(selected)?[selected].concat(AUTHORITY_FORCES):AUTHORITY_FORCES;
  return list.map(x=>`<option ${selected===x?'selected':''}>${x}</option>`).join('');
}
function readImageForUpload(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onerror=reject;
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>resolve({data:reader.result,name:file.name,mime:file.type||'image/jpeg'});
      img.onload=()=>{
        const max=1000,scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
        canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        resolve({data:canvas.toDataURL('image/jpeg',.82),name:(file.name.replace(/\.[^.]+$/,'')||'foto')+'.jpg',mime:'image/jpeg'});
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function openAuthorityFormLazy(id='',addAfter=false){
  await loadFeature('authorities');
  return openAuthorityForm(id,addAfter);
}

function photoHtml(p,cls='avatar'){
  if(!p || !p.FOTO_FILE_ID) return `<div class="${cls} placeholder">SEM<br>FOTO</div>`;
  const url=p.FOTO_URL||'';
  return `<img class="${cls}" src="${esc(url)}" data-file-id="${esc(p.FOTO_FILE_ID)}" loading="lazy" decoding="async" onerror="fallbackPhoto(this)" alt="Foto">`;
}

const __photoFallbackQueue=new Map();
const __photoFallbackMemory=new Map();
let __photoFallbackTimer=null;

/* Cache persistente de fotos de contingência.
 * A foto original continua no Drive; o navegador guarda somente a versão
 * Base64 já usada naquele aparelho, evitando novo Drive -> Apps Script em
 * aberturas posteriores no iPhone/iPad/PWA.
 */
const __PHOTO_DB_NAME='SGCM30_PHOTOS';
const __PHOTO_DB_STORE='photos';
let __photoDbPromise=null;
function photoDbOpen(){
  if(!('indexedDB' in window))return Promise.resolve(null);
  if(__photoDbPromise)return __photoDbPromise;
  __photoDbPromise=new Promise(resolve=>{
    try{
      const req=indexedDB.open(__PHOTO_DB_NAME,1);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(__PHOTO_DB_STORE))db.createObjectStore(__PHOTO_DB_STORE,{keyPath:'id'});};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>resolve(null);
    }catch(e){resolve(null);}
  });
  return __photoDbPromise;
}
async function photoDbGet(id){
  const db=await photoDbOpen();if(!db)return'';
  return new Promise(resolve=>{
    try{
      const tx=db.transaction(__PHOTO_DB_STORE,'readonly');
      const req=tx.objectStore(__PHOTO_DB_STORE).get(String(id));
      req.onsuccess=()=>{
        const r=req.result;
        if(!r||!r.data){resolve('');return;}
        if(Date.now()-Number(r.ts||0)>90*24*60*60*1000){resolve('');return;}
        resolve(String(r.data||''));
      };
      req.onerror=()=>resolve('');
    }catch(e){resolve('');}
  });
}
async function photoDbPut(id,data){
  if(!data||!String(data).startsWith('data:image/'))return;
  // Evita armazenar acidentalmente blobs muito grandes por autoridade.
  if(String(data).length>1200000)return;
  const db=await photoDbOpen();if(!db)return;
  try{
    const tx=db.transaction(__PHOTO_DB_STORE,'readwrite');
    tx.objectStore(__PHOTO_DB_STORE).put({id:String(id),data:String(data),ts:Date.now()});
  }catch(e){}
}

async function fallbackPhoto(img){
  if(!img||img.dataset.fallback==='1'||img.dataset.fallback==='queued')return;
  const id=String(img.dataset.fileId||'').trim();
  if(!id){img.replaceWith(placeholderNode(img.className));return;}

  if(__photoFallbackMemory.has(id)){
    const data=__photoFallbackMemory.get(id);
    if(data){img.dataset.fallback='1';img.src=data;}
    else img.replaceWith(placeholderNode(img.className,'FOTO<br>INDISP.'));
    return;
  }

  img.dataset.fallback='cache';
  const cached=await photoDbGet(id);
  if(!img.isConnected)return;
  if(cached){
    __photoFallbackMemory.set(id,cached);
    img.dataset.fallback='1';img.src=cached;return;
  }

  img.dataset.fallback='queued';
  const list=__photoFallbackQueue.get(id)||[];
  list.push(img);
  __photoFallbackQueue.set(id,list);

  clearTimeout(__photoFallbackTimer);
  __photoFallbackTimer=setTimeout(flushPhotoFallbackQueue,80);
}

async function flushPhotoFallbackQueue(){
  const entries=[...__photoFallbackQueue.entries()];
  __photoFallbackQueue.clear();
  if(!entries.length)return;

  for(let i=0;i<entries.length;i+=10){
    const chunk=entries.slice(i,i+10);
    const ids=chunk.map(x=>x[0]);
    let map={};
    try{map=await server('apiFotosBase64Lote',ids)||{};}catch(e){map={};}

    chunk.forEach(([id,imgs])=>{
      const data=map[id]||'';
      __photoFallbackMemory.set(id,data);
      if(data)photoDbPut(id,data);
      imgs.forEach(img=>{
        if(!img||!img.isConnected)return;
        if(data){
          img.dataset.fallback='1';
          img.src=data;
        }else{
          img.replaceWith(placeholderNode(img.className,'FOTO<br>INDISP.'));
        }
      });
    });
  }
}
function placeholderNode(className,label='SEM<br>FOTO'){
  const d=document.createElement('div');
  d.className=className+' placeholder';
  d.innerHTML=label;
  return d;
}

function guestWarningsHtml(g){
  if(!g)return'';
  const out=[];
  if(g.CADASTRADO_BANCO===false) out.push('<span class="data-warning missing-bank">NÃO CADASTRADO NO BANCO</span>');
  else if(g.TEM_FOTO===false) out.push('<span class="data-warning no-photo">SEM FOTO</span>');
  const extras=(g.DADOS_FALTANTES||[]).filter(x=>x!=='FOTO' && x!=='NÃO CADASTRADO EM AUTORIDADES');
  if(extras.length) out.push(`<span class="data-warning">FALTA: ${esc(extras.join(', '))}</span>`);
  return out.length?'<div class="data-warnings">'+out.join('')+'</div>':'';
}

async function reloadBootstrap(options={}){
  if(options.operational!==false)return reloadOperationalSnapshot(options);
  try{
    state.bootstrap=await server('apiBootstrap');cacheSet('bootstrap',state.bootstrap);
  }catch(e){
    const cached=cacheGet('bootstrap',24*60*60*1000);if(!cached)throw e;
    state.bootstrap=cached;if(!options.silent)showToast('Sem resposta do backend. Exibindo última sincronização.');
  }
  updateHeader();return state.bootstrap;
}
function updateHeader(){
  const a=activeCeremony(), h=$('#headerContext'), b=$('#contextBanner');
  h.textContent=a ? `${a.NOME_EVENTO}${a.DATA?' | '+formatDate(a.DATA):''}` : 'Nenhuma cerimônia ativa';
  if(!a){ b.textContent='Nenhuma cerimônia está ATIVA. Ative uma cerimônia antes da operação.'; b.classList.remove('hidden'); }
  else b.classList.add('hidden');
}


const FEATURE_FILES={
  operation:'modules/operation.js?v=3.0.4',
  ceremonies:'modules/ceremonies.js?v=3.0.0',
  authorities:'modules/authorities.js?v=3.0.0',
  tribuna:'modules/tribuna.js?v=3.0.3',
  nominata:'modules/nominata.js?v=3.0.0',
  stats:'modules/stats.js?v=3.0.0',
  documents:'modules/documents.js?v=3.0.0',
  guide:'modules/guide.js?v=3.0.0'
};
const SCREEN_FEATURE={evento:'operation',recepcao:'operation',presentes:'operation',familiares:'operation',cerimonias:'ceremonies',autoridades:'authorities',tribuna:'tribuna',nominata:'nominata',estatisticas:'stats',documentos:'documents',guia:'guide'};
const SCREEN_RENDERER={evento:'renderEvento',recepcao:'renderRecepcao',presentes:'renderPresentes',familiares:'renderFamiliares',cerimonias:'renderCerimonias',autoridades:'renderAutoridades',tribuna:'renderTribuna',nominata:'renderNominata',estatisticas:'renderEstatisticas',documentos:'renderDocumentos',guia:'renderGuia'};
const __loadedFeatures=new Set();
const __featurePromises=new Map();
function loadFeature(name){
  if(__loadedFeatures.has(name))return Promise.resolve(true);
  if(__featurePromises.has(name))return __featurePromises.get(name);
  const src=FEATURE_FILES[name];if(!src)return Promise.resolve(false);
  const p=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=src;script.async=true;
    script.onload=()=>{__loadedFeatures.add(name);__featurePromises.delete(name);resolve(true);};
    script.onerror=()=>{__featurePromises.delete(name);reject(new Error('Não foi possível carregar o módulo '+name+'.'));};
    document.head.appendChild(script);
  });
  __featurePromises.set(name,p);return p;
}
async function ensureScreenFeature(screen){
  const feature=SCREEN_FEATURE[screen];
  // Nominata abre o mesmo detalhe operacional de autoridades/familiares.
  if(feature==='nominata')await loadFeature('operation');
  return loadFeature(feature);
}
function rendererForScreen(screen){return window[SCREEN_RENDERER[screen]];}
async function boot(){
  try{
    apiUrl();
    const cachedSnap=carregarSnapshotOperacionalCache();
    const cachedBoot=cacheGet('bootstrap',7*24*60*60*1000);

    if(cachedSnap){
      aplicarSnapshotOperacional(cachedSnap,true);
      const first=activeCeremony()?'recepcao':'cerimonias';
      await navigate(first,{keepContent:false,quiet:true});
    }else if(cachedBoot){
      state.bootstrap=cachedBoot;updateHeader();
      await navigate(activeCeremony()?'recepcao':'cerimonias',{keepContent:false,quiet:true});
    }

    // O Bridge conecta em segundo plano; o snapshot local mantém a operação responsiva.
    const bridgePromise=initBridgeTransport(6500);
    if(!cachedSnap){
      await Promise.race([bridgePromise,new Promise(r=>setTimeout(r,700))]);
      $('#main').innerHTML='<div class="loading">Sincronizando cerimônia...</div>';
    }

    try{
      await bridgePromise;
      await reloadOperationalSnapshot({silent:!!cachedSnap});
      startOperationRevisionWatch();
      if(!cachedSnap || OPERATION_SCREENS.has(state.screen))await navigate(activeCeremony()?state.screen:'cerimonias',{quiet:true});
      else updateHeader();
    }catch(e){
      if(!cachedSnap&&!cachedBoot)throw e;
      setTransportMode('OFFLINE',e);
      showToast('Bridge indisponível. O SGCM permanece com a última sincronização salva neste aparelho.');
    }
  }catch(e){
    $('#main').innerHTML=`<div class="notice danger-notice">${esc(e.message)}</div><div class="card"><p class="small">Confira WEB_APP_URL em <b>config.js</b> e execute o diagnóstico no menu SGCM da planilha.</p></div>`;
  }
}

async function navigate(s,options={}){
  state.screen=s;
  document.querySelectorAll('[data-nav-screen]').forEach(b=>b.classList.toggle('active',b.dataset.navScreen===s));
  const operational=['evento','recepcao','presentes','familiares'].includes(s);
  if(!options.quiet && !(operational&&operacaoAtual().ready))$('#main').innerHTML='<div class="loading">Carregando...</div>';
  try{
    await ensureScreenFeature(s);
    const render=rendererForScreen(s);
    if(typeof render!=='function')throw new Error('Tela não disponível: '+s);
    await render();
    if(operational)setTimeout(checkOperationRevision,80);
  }catch(e){$('#main').innerHTML=`<div class="notice danger-notice">${esc(e.message)}</div>`;}
}

function refreshCurrent(){ reloadOperationalSnapshot().then(()=>navigate(state.screen,{quiet:true})); }

let __operationWatchTimer=null,__operationWatchBusy=false;
const OPERATION_SCREENS=new Set(['evento','recepcao','presentes','familiares']);
function startOperationRevisionWatch(){
  clearTimeout(__operationWatchTimer);
  __operationWatchTimer=setTimeout(checkOperationRevision,7000);
}
async function checkOperationRevision(){
  clearTimeout(__operationWatchTimer);
  try{
    if(document.hidden||__operationWatchBusy||!activeCeremony()||!OPERATION_SCREENS.has(state.screen)){startOperationRevisionWatch();return;}
    __operationWatchBusy=true;
    const v=await server('apiDashboardVersao');
    const o=operacaoAtual();
    if(String(v.idCer||'')!==String(o.idCer||'')||String(v.versao||'0')!==String(o.versao||'0')){
      await reloadOperationalSnapshot({silent:true});
      if(OPERATION_SCREENS.has(state.screen)){
        const map={evento:renderEvento,recepcao:renderRecepcao,presentes:renderPresentes,familiares:renderFamiliares};
        if(map[state.screen])await map[state.screen]();
      }
    }
  }catch(e){console.warn('SGCM sincronização operacional:',e.message||e);}
  finally{__operationWatchBusy=false;startOperationRevisionWatch();}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(checkOperationRevision,300);});
window.addEventListener('focus',()=>setTimeout(checkOperationRevision,250));

window.addEventListener('resize',()=>{if(state.screen==='tribuna')fitTribunaStage();});


/* ========================================================================== */
/* SGCM 3.0 — transporte resiliente e cache local de leitura                  */
/* ========================================================================== */
(function(){
  'use strict';
  if(typeof window.server!=='function'||window.__SGCM_CLIENT_30__)return;
  window.__SGCM_CLIENT_30__=true;

  const baseServer=window.server,mem=new Map(),inflight=new Map();
  const READS=SGCM_READ_ACTIONS;
  const TTL={apiBootstrap:3000,apiListarCerimonias:4000,apiListarAutoridadesPagina:15000,apiObterAutoridade:7000,apiListarMensagensNominata:30000,apiListarGruposEstatistica:30000,apiOpcoesEstatistica:7000};
  const PERSIST=new Set(['apiListarAutoridadesPagina','apiObterAutoridade','apiObterTribuna','apiNominataPainel','apiEstatisticas','apiListarMensagensNominata','apiListarGruposEstatistica']);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const key=(action,args)=>{try{return action+'|'+JSON.stringify(args||[])}catch(e){return action+'|'+String(args||'')}};
  function transient(e){const m=String((e&&e.message)||e||'').toLowerCase();return /(backend|indispon|tempor|timeout|tempo excedido|network|failed|conex|acessar|servidor|429|502|503|504)/i.test(m);}
  function persistentKey(k){let h=2166136261;for(let i=0;i<k.length;i++){h^=k.charCodeAt(i);h=Math.imul(h,16777619);}return 'read_'+(h>>>0).toString(36);}
  function clear(){mem.clear();}
  window.sgcmLimparCacheLocal=clear;

  async function readWithRetry(action,args){
    let last;
    for(const delay of [0,350,900]){
      if(delay)await wait(delay);
      try{
        const value=await baseServer(action,...args);
        if(PERSIST.has(action))cacheSet(persistentKey(key(action,args)),value);
        return value;
      }catch(e){last=e;if(!transient(e))throw e;}
    }
    if(PERSIST.has(action)){
      const stale=cacheGet(persistentKey(key(action,args)),7*24*60*60*1000);
      if(stale!==null){showToast('Bridge indisponível. Exibindo a última leitura salva.');return stale;}
    }
    throw last;
  }

  window.server=function(action,...args){
    if(!READS.has(action))return Promise.resolve(baseServer(action,...args)).then(v=>{clear();return v;});
    const ttl=TTL[action]||0,k=key(action,args),now=Date.now();
    if(ttl){
      const hit=mem.get(k);if(hit&&now-hit.at<ttl)return Promise.resolve(hit.value);
      if(inflight.has(k))return inflight.get(k);
      const p=readWithRetry(action,args).then(v=>{mem.set(k,{at:Date.now(),value:v});return v;}).finally(()=>inflight.delete(k));
      inflight.set(k,p);return p;
    }
    return readWithRetry(action,args);
  };
})();

// Inicialização local-first após instalar transporte/cache.
boot();
