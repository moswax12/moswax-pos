const C='mx8';
const U=['./','./index.html','./app.js','./pos.js','./inv.js','./fin.js','./usr.js','./set.js','./manifest.json'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(C).then(c=>Promise.all(U.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    fetch(e.request,{cache:'no-cache'}).then(r=>{
      if(r&&r.status===200){const cl=r.clone();caches.open(C).then(c=>c.put(e.request,cl))}
      return r;
    }).catch(()=>caches.match(e.request).then(m=>m||caches.match('./index.html')))
  );
});
