/* SGCM 3.0 — comunicação direta com Apps Script
 * O GitHub Pages hospeda a interface; um iframe invisível do Web App executa
 * as chamadas por google.script.run.
 */
(function(){
  'use strict';

  class SGCMBridgeClient{
    constructor(webAppUrl,options={}){
      this.webAppUrl=String(webAppUrl||'').trim();
      this.parentOrigin=options.origin||location.origin;
      this.ready=false;
      this.iframe=null;
      this.pending=new Map();
      this.seq=0;
      this.readyWaiters=[];
      this._onMessage=this._onMessage.bind(this);
      window.addEventListener('message',this._onMessage);
    }

    bridgeUrl(){
      const sep=this.webAppUrl.includes('?')?'&':'?';
      return this.webAppUrl+sep+new URLSearchParams({bridge:'1',origin:this.parentOrigin,v:'3.0'}).toString();
    }

    _createFrame(){
      if(this.iframe){try{this.iframe.remove();}catch(e){}}
      this.ready=false;
      const f=document.createElement('iframe');
      f.id='sgcmBridgeFrame';
      f.title='SGCM Bridge';
      f.setAttribute('aria-hidden','true');
      f.tabIndex=-1;
      f.style.cssText='position:fixed!important;width:1px!important;height:1px!important;left:-10000px!important;top:-10000px!important;border:0!important;opacity:0!important;pointer-events:none!important;';
      f.src=this.bridgeUrl();
      this.iframe=f;
      (document.body||document.documentElement).appendChild(f);
    }

    start(){if(!this.iframe)this._createFrame();}

    restart(){
      for(const [id,p] of this.pending){clearTimeout(p.timer);p.reject(new Error('Comunicação reiniciada.'));}
      this.pending.clear();
      this._createFrame();
    }

    _onMessage(ev){
      const m=ev.data||{};
      if(!m||typeof m!=='object'||!this.iframe||ev.source!==this.iframe.contentWindow)return;
      if(m.type==='SGCM_BRIDGE_READY'){
        this.ready=true;
        const waiters=this.readyWaiters.splice(0);
        waiters.forEach(x=>x(true));
        return;
      }
      if(m.type!=='SGCM_BRIDGE_RESULT'||!m.id)return;
      const p=this.pending.get(m.id);if(!p)return;
      this.pending.delete(m.id);clearTimeout(p.timer);
      if(!m.ok){p.reject(new Error(m.error||'Falha na comunicação com o Apps Script.'));return;}
      try{
        const payload=JSON.parse(String(m.raw||'{}'));
        if(payload&&payload.ok!==false)p.resolve(payload.data);
        else p.reject(new Error(payload?.error||'Erro no backend do SGCM.'));
      }catch(e){p.reject(new Error('Resposta inválida do Apps Script.'));}
    }

    waitReady(timeoutMs=6500){
      this.start();
      if(this.ready)return Promise.resolve(true);
      return new Promise(resolve=>{
        let done=false;
        const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value);};
        const timer=setTimeout(()=>finish(false),timeoutMs);
        this.readyWaiters.push(finish);
      });
    }

    request(action,args=[],timeoutMs=30000){
      if(!this.ready||!this.iframe||!this.iframe.contentWindow){
        return Promise.reject(new Error('Bridge do Apps Script indisponível.'));
      }
      const id='B'+Date.now().toString(36)+(++this.seq).toString(36)+Math.random().toString(36).slice(2,7);
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{
          this.pending.delete(id);
          reject(new Error('Tempo excedido na comunicação com o Apps Script.'));
        },timeoutMs);
        this.pending.set(id,{resolve,reject,timer});
        this.iframe.contentWindow.postMessage({type:'SGCM_BRIDGE_CALL',id,action:String(action||''),args:Array.isArray(args)?args:[]},'*');
      });
    }
  }

  window.SGCMBridgeClient=SGCMBridgeClient;
})();
