// Service worker : l'appli s'ouvre même avec une connexion faible.
// Changer VERSION à chaque mise à jour importante pour vider l'ancien cache.
const VERSION='de-v2',CACHE=VERSION;
const SHELL=['./','index.html','css/style.css','js/config.js','js/auth.js','js/app.js','js/pwa.js','js/import.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
const CDN=['cdnjs.cloudflare.com','cdn.jsdelivr.net'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET')return;
  // Supabase (comptes, base, fichiers) : toujours en direct, jamais en cache
  if(!(u.origin===location.origin||CDN.includes(u.hostname)))return;
  // Réseau d'abord (mises à jour immédiates), cache en secours hors connexion
  e.respondWith(fetch(r).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy));return res}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))));
});
