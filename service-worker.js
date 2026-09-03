const CACHE='soraya-letterhead-v1';
const STATIC=['./','./index.html','./styles.css','./stage7.css','./stage7.js.gz.b64','./stage8.css','./stage8.js.gz.b64','./stage8-1.css','./stage8-1.js','./stage8-2.css','./stage8-2.js','./stage8-3.css','./stage8-3.js','./stage8-4.css','./stage8-4.js','./stage8-5.css','./stage8-5.js','./stage8-6.css','./stage8-6.js','./ui-professional.css','./ui-professional.js','./ui-team-v3.css','./ui-team-v3-brand.css','./ui-team-v4.js','./dashboard-executive.css','./dashboard-executive.js','./performance-v2.js','./agenda-stability.js','./help-guide.css','./help-guide.js','./google-calendar-link.css','./google-calendar-link.js','./google-unified-sync.css','./google-unified-sync.js','./task-teamwork.css','./task-teamwork.js','./soraya-i18n.js','./soraya-brand.css','./soraya-brand.js','./quick-add.css','./quick-add-v2.js','./quick-task.css','./quick-task.js','./quick-schedule.css','./quick-schedule.js','./quick-schedule-hook.js','./app.js','./letterhead-template.js','./config.js','./admin-users.js','./manifest.webmanifest','./assets/logo-juventud-flores.png','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
async function appWithLetterhead(req){
  let r;
  try{r=await fetch(req);const c=await caches.open(CACHE);c.put(req,r.clone()).catch(()=>{})}
  catch(_){r=await caches.match(req)}
  if(!r)return new Response('',{status:503});
  let text=await r.text();
  if(!text.includes("letterhead-template.js'))")) text += "\n;(()=>{const s=document.createElement('script');s.src='./letterhead-template.js';s.defer=true;document.head.appendChild(s)})();\n";
  const h=new Headers(r.headers);h.delete('content-length');h.delete('content-encoding');
  return new Response(text,{status:r.status,statusText:r.statusText,headers:h});
}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.hostname.endsWith('supabase.co')||u.hostname.includes('googleapis.com')||u.hostname.includes('jsdelivr.net'))return;
  if(u.origin===self.location.origin&&u.pathname.endsWith('/app.js')){e.respondWith(appWithLetterhead(e.request));return}
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))
});
