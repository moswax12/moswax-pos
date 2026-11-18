const C='mx9';
const U=['./','./index.html','./app.js','./pos.js','./inv.js','./fin.js','./usr.js','./set.js','./profit.js','./manifest.json'];
self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(C)
      .then(c=>Promise.all(U.map(u=>fetch(u,{cache:'reload'}).then(r=>{if(r.ok)return c.put(u,r)}).catch(()=>{}))))
      .then(()=>self.skipWaiting())
  );
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
  e.respondWith((async()=>{
    const c=await caches.open(C);
    try{
      const ctl=new AbortController();
      const t=setTimeout(()=>ctl.abort(),4000);
      const r=await fetch(req,{cache:'no-cache',signal:ctl.signal});
      clearTimeout(t);
      if(r&&r.status===200)c.put(req,r.clone());
      return r;
    }catch(err){
      const m=await c.match(req,{ignoreSearch:true});
      if(m)return m;
      if(req.mode==='navigate'){
        const i=(await c.match('./index.html'))||(await c.match('./'));
        if(i)return i;
      }
      return new Response('Offline, and this file was never saved. Open the app once while online.',{status:503});
    }
  })());
});
