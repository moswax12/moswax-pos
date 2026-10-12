const C='mx7';const U=['./','./index.html','./app.js','./pos.js','./inv.js','./fin.js','./usr.js','./set.js','./manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(U)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r.status===200){const cl=r.clone();caches.open(C).then(ca=>ca.put(e.request,cl))}return r}).catch(()=>c)))});
