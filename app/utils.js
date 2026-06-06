// ── FAIL-SAFE: guaranteed loading screen dismissal ──
// This MUST run regardless of any CDN/script failures.
// Three layers of protection:
// 1. CSS animation (forceHideLoading) at 12s — no JS needed
// 2. This timer at 8s — shows retry + forces hide at 12s
// 3. appInit's own _st timer at 8s
(function(){
  var el=document.getElementById('app-loading');
  if(!el)return;
  // Layer 2: JS fail-safe
  window._loadingSafetyTimer=setTimeout(function(){
    if(!el||el.style.display==='none'||el.style.visibility==='hidden')return;
    if(window._appInitDone){el.style.display='none';return;}
    var lbl=el.querySelector('.lbl');
    if(lbl) lbl.textContent = navigator.onLine ? 'Taking too long…' : 'Offline — loading from cache…';
    var retry=document.createElement('button');
    retry.style.cssText='margin-top:12px;padding:8px 20px;border-radius:10px;border:1px solid rgba(255,249,62,.2);background:rgba(255,249,62,.06);color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;';
    retry.textContent='Retry';
    retry.onclick=function(){ window.location.reload(); };
    if(!el.querySelector('button')) el.appendChild(retry);
    // Force-hide after 3 more seconds whether or not appInit ever finishes.
    // Better to drop a user into a half-mounted view they can interact with
    // than to leave them staring at a splash forever.
    setTimeout(function(){
      if(el){el.style.display='none';}
      if(!localStorage.getItem('ftz_current')&&!localStorage.getItem('fortized_current_user')){
        window.location.href='/login';
      }
      var vh=document.getElementById('view-home');
      if(vh&&vh.style.display!=='flex'){vh.style.display='flex';vh.style.opacity='1';vh.classList.add('active');}
    },3000);
  }, navigator.onLine ? 5000 : 2500);
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
        // Re-init socket if it was lost
        if (typeof FortizedSocial !== 'undefined' && typeof CU !== 'undefined' && CU && CU.username) {
          try { FortizedSocial.initSocket(CU.username, window._ftzSocketCallbacks || {}); } catch(_){}
        }
      }, 1500);
    }
  }
  // If already offline at load time, accelerate the loading screen
  if (!navigator.onLine) {
    var el = document.getElementById('app-loading');
    var lbl = el && el.querySelector('.lbl');
    if (lbl) lbl.textContent = 'Loading offline…';
  }
  window.addEventListener('online', function(){ setOffline(false); });
  window.addEventListener('offline', function(){ setOffline(true); });
})();
