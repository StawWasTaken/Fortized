// ── FAIL-SAFE: guaranteed loading screen dismissal ──
// If appInit hasn't finished after the timeout, auto-refresh instead of
// showing a retry button — the user shouldn't have to do anything.
(function(){
  var el=document.getElementById('app-loading');
  if(!el)return;
  window._loadingSafetyTimer=setTimeout(function(){
    if(window._appInitDone)return;
    if(!el||el.style.display==='none'||el.style.visibility==='hidden')return;
    // Just refresh — don't show retry UI or cache messages
    window.location.reload();
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
    // Offline — the loading screen stays as-is with animated dots
    // and will auto-refresh via the safety timer above
  }
  window.addEventListener('online', function(){ setOffline(false); });
  window.addEventListener('offline', function(){ setOffline(true); });
})();
