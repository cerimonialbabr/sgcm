/* SGCM 3.0 — Bridge direto Apps Script (build 3.0.1)
 * O HTML Service do Apps Script pode usar uma camada interna de iframe.
 * O handshake captura a janela interna real, onde google.script.run existe.
 */
(function(){
  'use strict';

  class SGCMBridgeClient{
    constructor(webAppUrl,options={}){
      this.webAppUrl=String(webAppUrl||'').trim();
      this.parentOrigin=options.origin||location.origin;
      this.ready=false;
      this.iframe=null;
      this.bridgeWindow=null;
      this.token='';
      this.pending=new Map();
      this.seq=0;
      this.readyWaiters=[];
      this._onMessage=this._onMessage.bind(this);
      window.addEventListener('message',this._onMessage);
    }

    _newToken(){
      const a=new Uint32Array(4);
      try{crypto.getRandomValues(a);return Array.from(a,x=>x.toString(36)).join('');}
      catch(e){return Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);}
    }

    bridgeUrl(){
      const sep=this.webAppUrl.includes('?')?'&':'?';
      return this.webAppUrl+sep+new URLSearchParams({
        bridge:'1',
        origin:this.parentOrigin,
        token:this.token,
        v:'3.0.1'
      }).toString();
    }

    _createFrame(){
      if(this.iframe){try{this.iframe.remove();}catch(e){}}
      this.ready=false;
      this.bridgeWindow=null;
      this.token=this._newToken();

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
      if(!m||typeof m!=='object'||!this.iframe)return;
      if(!this.token||m.token!==this.token)return;

      if(m.type==='SGCM_BRIDGE_READY'){
        // IMPORTANTE: em HTML Service, event.source pode ser a janela interna
        // do sandbox e não iframe.contentWindow. Guardamos exatamente a janela
        // que enviou READY e falamos diretamente com ela nas próximas chamadas.
        this.bridgeWindow=ev.source;
        this.ready=!!this.bridgeWindow;
        const waiters=this.readyWaiters.splice(0);
        waiters.forEach(x=>x(this.ready));
        return;
      }

      if(m.type!=='SGCM_BRIDGE_RESULT'||!m.id)return;
      if(this.bridgeWindow&&ev.source!==this.bridgeWindow)return;
      const p=this.pending.get(m.id);if(!p)return;
      this.pending.delete(m.id);clearTimeout(p.timer);
      if(!m.ok){p.reject(new Error(m.error||'Falha na comunicação com o Apps Script.'));return;}
      try{
        const payload=JSON.parse(String(m.raw||'{}'));
        if(payload&&payload.ok!==false)p.resolve(payload.data);
        else p.reject(new Error(payload?.error||'Erro no backend do SGCM.'));
      }catch(e){p.reject(new Error('Resposta inválida do Apps Script.'));}
    }

    waitReady(timeoutMs=8000){
      this.start();
      if(this.ready&&this.bridgeWindow)return Promise.resolve(true);
      return new Promise(resolve=>{
        let done=false;
        const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value);};
        const timer=setTimeout(()=>finish(false),timeoutMs);
        this.readyWaiters.push(finish);
      });
    }

    request(action,args=[],timeoutMs=30000){
      if(!this.ready||!this.bridgeWindow){
        return Promise.reject(new Error('Bridge do Apps Script indisponível.'));
      }
      const id='B'+Date.now().toString(36)+(++this.seq).toString(36)+Math.random().toString(36).slice(2,7);
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{
          this.pending.delete(id);
          reject(new Error('Tempo excedido na comunicação com o Apps Script.'));
        },timeoutMs);
        this.pending.set(id,{resolve,reject,timer});
        this.bridgeWindow.postMessage({
          type:'SGCM_BRIDGE_CALL',
          token:this.token,
          id,
          action:String(action||''),
          args:Array.isArray(args)?args:[]
        },'*');
      });
    }
  }

  window.SGCMBridgeClient=SGCMBridgeClient;
})();
