/*
 * SGCM — senha simples de acesso
 * Barreira visual simples, sem usuário/login.
 * A senha é administrada pela planilha no menu "SGCM Segurança".
 */
(function(){
  'use strict';

  const STORAGE_KEY='SGCM_ACESSO_SIMPLES_V1';
  let statusAtual=null;
  let bridge=null;

  function css(){
    const style=document.createElement('style');
    style.textContent=`
      #sgcmSecurityGate{position:fixed;inset:0;z-index:2147483647;background:#f4f7fb;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Arial,sans-serif}
      #sgcmSecurityGate.sgcm-security-hidden{display:none!important}
      .sgcm-security-box{width:min(420px,100%);background:#fff;border:1px solid #dce3ee;border-radius:18px;box-shadow:0 18px 50px rgba(16,36,66,.15);padding:30px 26px;text-align:center}
      .sgcm-security-logo{width:82px;height:82px;object-fit:contain;margin:0 auto 14px;display:block}
      .sgcm-security-box h1{font-size:21px;line-height:1.25;margin:0 0 5px;color:#16253d}
      .sgcm-security-box p{font-size:13px;line-height:1.45;color:#6a778b;margin:0 0 22px}
      .sgcm-security-input{width:100%;box-sizing:border-box;border:1px solid #cad5e4;border-radius:10px;padding:13px 14px;font-size:16px;outline:none;background:#fff}
      .sgcm-security-input:focus{border-color:#4979b8;box-shadow:0 0 0 3px rgba(73,121,184,.12)}
      .sgcm-security-btn{width:100%;border:0;border-radius:10px;padding:13px 16px;margin-top:12px;font-size:14px;font-weight:800;cursor:pointer;background:#173d6b;color:#fff}
      .sgcm-security-btn:disabled{opacity:.55;cursor:wait}
      .sgcm-security-error{min-height:20px;margin-top:10px;font-size:12px;font-weight:700;color:#ad2731}
      .sgcm-security-loading{font-size:12px;color:#68758a;margin-top:12px}
      @media(max-width:520px){#sgcmSecurityGate{padding:16px}.sgcm-security-box{padding:25px 20px;border-radius:15px}.sgcm-security-logo{width:72px;height:72px}.sgcm-security-box h1{font-size:19px}}
    `;
    document.head.appendChild(style);
  }

  function gate(){
    let el=document.getElementById('sgcmSecurityGate');
    if(el)return el;
    el=document.createElement('div');
    el.id='sgcmSecurityGate';
    el.innerHTML=`
      <div class="sgcm-security-box">
        <img class="sgcm-security-logo" src="assets/logo.png" alt="SGCM" onerror="this.onerror=null;this.src='assets/icon-192.png'">
        <h1>Sistema de Gerenciamento de Cerimonial Militar</h1>
        <p>Acesso à cerimônia</p>
        <form id="sgcmSecurityForm" autocomplete="off">
          <input id="sgcmSecurityPassword" class="sgcm-security-input" type="password" placeholder="Senha de acesso" autocomplete="current-password" aria-label="Senha de acesso">
          <button id="sgcmSecurityButton" class="sgcm-security-btn" type="submit">ACESSAR</button>
          <div id="sgcmSecurityError" class="sgcm-security-error"></div>
        </form>
        <div id="sgcmSecurityLoading" class="sgcm-security-loading">Verificando acesso...</div>
      </div>`;
    document.body.appendChild(el);
    document.getElementById('sgcmSecurityForm').addEventListener('submit',validarDigitacao);
    return el;
  }

  function liberacaoLocal(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch(e){return null;}
  }
  function salvarLiberacao(versao){
    localStorage.setItem(STORAGE_KEY,JSON.stringify({versao:String(versao||'0'),em:Date.now()}));
  }
  function limparLiberacao(){try{localStorage.removeItem(STORAGE_KEY);}catch(e){}}

  function liberar(){
    gate().classList.add('sgcm-security-hidden');
    document.documentElement.classList.add('sgcm-security-ok');
  }
  function bloquear(){
    gate().classList.remove('sgcm-security-hidden');
    const inp=document.getElementById('sgcmSecurityPassword');
    const loading=document.getElementById('sgcmSecurityLoading');
    if(loading)loading.style.display='none';
    if(inp)setTimeout(()=>inp.focus(),40);
  }

  async function obterStatus(){
    const cfg=window.SGCM_CONFIG||{};
    const url=String(cfg.WEB_APP_URL||cfg.API_URL||'').trim();
    if(!url || url.includes('COLE_AQUI')) throw new Error('WEB_APP_URL não configurada.');
    if(typeof window.SGCMBridgeClient!=='function') throw new Error('Bridge do SGCM não carregado.');

    bridge=new window.SGCMBridgeClient(url,{origin:location.origin});
    const ready=await bridge.waitReady(5000);
    if(!ready)throw new Error('Não foi possível verificar a senha no Apps Script.');
    return await bridge.request('apiSegurancaStatus',[],12000);
  }

  async function validarDigitacao(ev){
    ev.preventDefault();
    if(!statusAtual)return;
    const input=document.getElementById('sgcmSecurityPassword');
    const btn=document.getElementById('sgcmSecurityButton');
    const err=document.getElementById('sgcmSecurityError');
    const digitada=String(input.value||'');
    err.textContent='';
    btn.disabled=true;
    try{
      if(digitada===String(statusAtual.senha||'')){
        salvarLiberacao(statusAtual.versao);
        input.value='';
        liberar();
      }else{
        err.textContent='Senha incorreta.';
        input.select();
      }
    }finally{btn.disabled=false;}
  }

  async function iniciar(){
    css();
    gate();
    try{
      statusAtual=await obterStatus();
      if(!statusAtual || !statusAtual.ativa){
        limparLiberacao();
        liberar();
        return;
      }
      const local=liberacaoLocal();
      if(local && String(local.versao)===String(statusAtual.versao)){
        liberar();
        return;
      }
      limparLiberacao();
      bloquear();
    }catch(e){
      bloquear();
      const err=document.getElementById('sgcmSecurityError');
      if(err)err.textContent='Não foi possível verificar a senha. Atualize a página.';
      console.warn('SGCM Segurança:',e);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});
  else iniciar();
})();
