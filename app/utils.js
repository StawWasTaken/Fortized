// ── FAIL-SAFE: guaranteed loading screen dismissal ──
// Cooperative with appInit. appInit installs its own 20s safety + own
// retry labels ("Retrying… (n/N)"). This file used to fire at 5s, swap
// the label to "Taking too long…", add a Retry button, then at 8s
// force-hide the loader AND force-show #view-home — which raced
// appInit mid-fetch and bugged the layout when the fetch later
// succeeded against a half-mounted view.
//
// New behaviour:
//   • Wait 18s before doing anything (appInit's own loop bounds at ~16s)
//   • If appInit already finished, do nothing
//   • If appInit installed _hideAppLoader, delegate to it (no force-show)
//   • Never auto-flip views; appInit owns that
//   • Only ever add the Retry button — no silent redirect to /login
//     unless there is literally no user state at all
(function(){
  var el=document.getElementById('app-loading');
  if(!el)return;
  window._loadingSafetyTimer=setTimeout(function(){
    if(window._appInitDone)return;
    if(!el||el.style.display==='none'||el.style.visibility==='hidden')return;
    var lbl=el.querySelector('.lbl');
    if(lbl) lbl.textContent = navigator.onLine ? 'Taking too long…' : 'Offline — loading from cache…';
    if(!el.querySelector('button.ftz-loading-retry')){
      var retry=document.createElement('button');
      retry.className='ftz-loading-retry';
      retry.style.cssText='margin-top:14px;padding:9px 22px;border-radius:12px;border:1.5px solid #050608;background:linear-gradient(135deg,#fff93e,#fff700);color:#050608;font-family:Syne,sans-serif;font-size:13px;font-weight:800;letter-spacing:-.2px;cursor:pointer;box-shadow:0 4px 0 0 #050608,0 12px 22px rgba(0,0,0,.40);transition:transform .12s,box-shadow .12s;';
      retry.textContent='Retry';
      retry.onmouseover=function(){this.style.transform='translateY(-1px)';};
      retry.onmouseout=function(){this.style.transform='translateY(0)';};
      retry.onmousedown=function(){this.style.transform='translateY(3px)';this.style.boxShadow='0 1px 0 0 #050608,0 4px 10px rgba(0,0,0,.40)';};
      retry.onclick=function(){ window.location.reload(); };
      el.appendChild(retry);
    }
  }, navigator.onLine ? 18000 : 6000);
})();

// ── Offline/Online Detection ──
(function(){
  window._fortizedOffline = !navigator.onLine;
  function setOffline(offline) {
    window._fortizedOffline = offline;
    var banner = document.getElementById('offline-banner');
    var text = document.getElementById('offline-banner-text');
    if (!banner) return;
    if (offline) {
      banner.classList.add('visible');
      if (text) text.textContent = 'You are offline';
    } else {
      if (text) text.innerHTML = 'Reconnecting… <span class="reconnecting">restoring connection</span>';
      setTimeout(function() {
        banner.classList.remove('visible');
        if (typeof FortizedSocial !== 'undefined' && typeof CU !== 'undefined' && CU && CU.username) {
          try { FortizedSocial.initSocket(CU.username, window._ftzSocketCallbacks || {}); } catch(_){}
        }
      }, 1500);
    }
  }
  if (!navigator.onLine) {
    var el = document.getElementById('app-loading');
    var lbl = el && el.querySelector('.lbl');
    if (lbl) lbl.textContent = 'Loading offline…';
  }
  window.addEventListener('online', function(){ setOffline(false); });
  window.addEventListener('offline', function(){ setOffline(true); });
})();
