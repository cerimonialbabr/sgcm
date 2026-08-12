const CACHE_NAME='sgcm-v3-shell-3.0.1';
const CORE=[
  './','./index.html','./styles.css','./bridge-client.js','./core.js','./config.js','./dashboard.html','./manifest.webmanifest',
  './modules/operation.js','./assets/logo.png','./assets/icon-192.png','./assets/icon-512.png'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sgcm-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
async function networkFirst(request){
  const cache=await caches.open(CACHE_NAME);
  try{const response=await fetch(request,{cache:'no-store'});if(response&&response.ok)cache.put(request,response.clone());return response;}
  catch(e){return (await caches.match(request))||(await caches.match('./index.html'));}
}
async function staleWhileRevalidate(request){
  const cache=await caches.open(CACHE_NAME),cached=await caches.match(request);
  const network=fetch(request,{cache:'no-cache'}).then(response=>{if(response&&response.ok)cache.put(request,response.clone());return response;}).catch(()=>null);
  return cached||network||Response.error();
}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  const path=url.pathname,isNav=event.request.mode==='navigate';
  if(isNav||path.endsWith('/index.html')||path.endsWith('/dashboard.html')||path.endsWith('/config.js')){event.respondWith(networkFirst(event.request));return;}
  if(path.endsWith('.js')||path.endsWith('.css')||path.endsWith('.webmanifest')){event.respondWith(staleWhileRevalidate(event.request));return;}
  event.respondWith(caches.match(event.request).then(c=>c||fetch(event.request).then(r=>{if(r&&r.ok){const copy=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}return r;})));
});
