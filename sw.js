/* Calla Field App — offline service worker.
   Caches the app shell so it opens with NO internet after the first online load.
   Stale-while-revalidate: serve from cache instantly, refresh in the background. */
const CACHE='calla-v8';
const CORE=['./','./index.html','./manifest.webmanifest'];
self.addEventListener('install',e=>{ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{})); });
self.addEventListener('activate',e=>{ e.waitUntil((async()=>{ const ks=await caches.keys(); await Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))); await self.clients.claim(); })()); });
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  let url; try{ url=new URL(req.url); }catch(_){ return; }
  if(url.origin!==location.origin) return; // leave cross-origin (share/upload) alone
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(req,{ignoreSearch:true});
    const net=fetch(req).then(res=>{ if(res&&res.ok) cache.put(req,res.clone()); return res; }).catch(()=>null);
    if(hit) return hit;                       // offline-first: instant, works with no signal
    const res=await net; if(res) return res;
    if(req.mode==='navigate') return (await cache.match('./index.html'))||(await cache.match('./'));
    return new Response('',{status:504});
  })());
});
