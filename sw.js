const CACHE='kintore-cache-v1';
const SHELL=['./','./index.html','./manifest.webmanifest'];

self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL).catch(function(){});}));
});

self.addEventListener('activate',function(e){
  e.waitUntil((async function(){
    var keys=await caches.keys();
    await Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);
  var isFont=url.hostname.indexOf('fonts.googleapis.com')>-1||url.hostname.indexOf('fonts.gstatic.com')>-1;
  var isDoc=req.mode==='navigate'||(url.origin===location.origin&&(url.pathname.charAt(url.pathname.length-1)==='/'||url.pathname.indexOf('.html')>-1));

  if(isDoc){
    e.respondWith((async function(){
      try{
        var fresh=await fetch(req);
        var c=await caches.open(CACHE);
        c.put('./index.html',fresh.clone());
        c.put('./',fresh.clone());
        return fresh;
      }catch(err){
        var cached=await caches.match('./index.html')||await caches.match('./')||await caches.match(req);
        return cached||Response.error();
      }
    })());
    return;
  }

  if(isFont){
    e.respondWith((async function(){
      var cached=await caches.match(req);
      if(cached)return cached;
      try{
        var res=await fetch(req);
        var c=await caches.open(CACHE);
        c.put(req,res.clone());
        return res;
      }catch(err){return cached||Response.error();}
    })());
    return;
  }

  e.respondWith((async function(){
    var cached=await caches.match(req);
    return cached||fetch(req);
  })());
});
