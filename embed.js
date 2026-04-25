/* Fortized Embed — drop-in widget loader.
 *
 * Usage on any third-party site:
 *
 *   <script src="https://fortized.com/embed.js" async></script>
 *
 * Then either:
 *
 *   1. Member-list / bastion card:
 *      <div data-fortized-bastion="<BASTION_ID>"
 *           data-fortized-key="ftz_…"></div>
 *
 *   2. Join-Bastion button:
 *      <a class="fortized-join"
 *         data-bastion="<BASTION_ID>"
 *         data-fortized-key="ftz_…"></a>
 *
 * The script auto-scans the DOM on load, fetches public bastion data
 * through /api/v1/bastions/:id, and renders the widget. Hosts can call
 * window.Fortized.scan() after dynamically inserting elements.
 */
(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────
  // The API host is inferred from the script's own src so the embed
  // works on any deployment (production, preview, self-hosted, etc.).
  // A page can override via window.FortizedConfig = { apiBase: '…' }.
  const API_BASE = (function () {
    if (typeof window !== 'undefined' && window.FortizedConfig && window.FortizedConfig.apiBase) {
      return String(window.FortizedConfig.apiBase).replace(/\/+$/, '');
    }
    if (typeof document !== 'undefined') {
      const scripts = document.querySelectorAll('script[src*="embed.js"]');
      for (const s of scripts) {
        try { return new URL(s.src).origin; } catch (_) {}
      }
    }
    return 'https://fortized.com';
  })();

  // ── Stylesheet (single inject) ──────────────────────────────────
  const STYLE = `
.fortized-embed,.fortized-join{
  --ftz-accent:#fff93e;
  --ftz-bg:#1a1d26;
  --ftz-bg-2:#0f1119;
  --ftz-border:rgba(255,255,255,.08);
  --ftz-muted:rgba(255,255,255,.55);
  --ftz-text:#fff;
  font-family:system-ui,-apple-system,'Segoe UI','DM Sans',sans-serif;
  -webkit-font-smoothing:antialiased;
  box-sizing:border-box;
}
.fortized-embed *,.fortized-join *{box-sizing:border-box;}

/* Member-list / bastion card */
.fortized-embed{
  display:block;
  max-width:380px;
  background:var(--ftz-bg);
  border:1px solid var(--ftz-border);
  border-radius:16px;
  padding:18px 18px 16px;
  color:var(--ftz-text);
  position:relative;
  overflow:hidden;
}
.fortized-embed::before{
  content:"";
  position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent 0%,rgba(255,249,62,.25) 12%,var(--ftz-accent) 50%,rgba(255,249,62,.25) 88%,transparent 100%);
  box-shadow:0 0 14px rgba(255,249,62,.35);
}
.fortized-embed-loading{
  font-size:13px;color:var(--ftz-muted);text-align:center;padding:24px 0;
}
.fortized-embed-error{
  font-size:12.5px;color:#f87171;background:rgba(248,113,113,.08);
  border:1px solid rgba(248,113,113,.18);border-radius:10px;
  padding:10px 12px;line-height:1.5;
}
.fortized-embed-header{
  display:flex;align-items:center;gap:12px;margin-bottom:14px;
}
.fortized-embed-icon{
  width:48px;height:48px;border-radius:12px;object-fit:cover;
  background:var(--ftz-bg-2);flex-shrink:0;
}
.fortized-embed-icon-fallback{
  width:48px;height:48px;border-radius:12px;flex-shrink:0;
  background:rgba(255,249,62,.08);
  border:1px solid rgba(255,249,62,.2);
  display:flex;align-items:center;justify-content:center;
  font-size:20px;font-weight:800;color:var(--ftz-accent);
}
.fortized-embed-info{min-width:0;flex:1;}
.fortized-embed-name{
  font-size:16px;font-weight:800;color:var(--ftz-text);
  letter-spacing:-.01em;line-height:1.2;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.fortized-embed-stats{
  display:flex;align-items:center;gap:6px;
  font-size:11.5px;color:var(--ftz-muted);margin-top:4px;
}
.fortized-embed-dot{
  width:6px;height:6px;border-radius:50%;background:#3ecf6e;
  box-shadow:0 0 6px rgba(62,207,110,.5);flex-shrink:0;
}
.fortized-embed-cta{
  display:block;width:100%;padding:10px 14px;
  background:var(--ftz-accent);color:var(--ftz-bg-2);
  border:none;border-radius:10px;
  font-family:inherit;font-size:13px;font-weight:800;
  text-decoration:none;text-align:center;letter-spacing:.01em;
  cursor:pointer;transition:filter .15s,transform .15s;
}
.fortized-embed-cta:hover{filter:brightness(1.06);transform:translateY(-1px);}

/* Drop-in Join button (anchor variant) */
a.fortized-join{
  display:inline-flex;align-items:center;gap:8px;
  padding:10px 18px;border-radius:10px;
  background:var(--ftz-accent);color:var(--ftz-bg-2);
  text-decoration:none;
  font-family:system-ui,-apple-system,'Segoe UI','DM Sans',sans-serif;
  font-size:13px;font-weight:800;letter-spacing:.01em;
  border:none;cursor:pointer;
  transition:filter .15s,transform .15s,box-shadow .15s;
  vertical-align:middle;
}
a.fortized-join:hover{
  filter:brightness(1.08);
  transform:translateY(-1px);
  box-shadow:0 8px 24px rgba(255,249,62,.18);
}
a.fortized-join img{
  width:18px;height:18px;border-radius:5px;object-fit:cover;display:block;
}
a.fortized-join .fortized-join-online{
  font-size:11px;font-weight:600;opacity:.7;letter-spacing:0;
}
a.fortized-join.fortized-join-error{
  background:rgba(248,113,113,.12);
  color:#f87171;
  border:1px solid rgba(248,113,113,.3);
}
`;

  function injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('fortized-embed-styles')) return;
    const s = document.createElement('style');
    s.id = 'fortized-embed-styles';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  // ── Helpers ─────────────────────────────────────────────────────
  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatCount(n) {
    n = Number(n) || 0;
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    return n.toLocaleString();
  }

  // Single-flight cache so repeated widgets pointing at the same bastion
  // (or the same Join button rendered twice) share one HTTP request.
  const _cache = new Map(); // key: bastionId+'|'+ftzKey -> Promise<bastionData>

  function fetchBastion(bastionId, key) {
    const k = bastionId + '|' + key;
    if (_cache.has(k)) return _cache.get(k);
    const url = API_BASE + '/api/v1/bastions/' + encodeURIComponent(bastionId) +
                '?key=' + encodeURIComponent(key);
    const p = fetch(url, { credentials: 'omit' })
      .then(r => r.json())
      .then(b => {
        if (b && b.error) throw new Error(b.error);
        return b;
      });
    _cache.set(k, p);
    // Drop the cache entry after 60s so subsequent loads see fresh data
    // (online count, member count, etc.) without forcing a full reload.
    setTimeout(() => { _cache.delete(k); }, 60 * 1000);
    return p;
  }

  function joinUrl(bastion) {
    if (!bastion) return API_BASE + '/app';
    // Prefer the vanity slug (/join/:vanity resolves it to an active
    // invite). Fall back to the in-app bastion route, which can also
    // open a bastion by global id.
    if (bastion.vanity) return API_BASE + '/join/' + encodeURIComponent(bastion.vanity);
    if (bastion.id)     return API_BASE + '/app/bastion?' + encodeURIComponent(bastion.id);
    return API_BASE + '/app';
  }

  // ── Renderers ───────────────────────────────────────────────────
  function renderBastionCard(el) {
    if (el.dataset.fortizedRendered === '1') return;
    el.dataset.fortizedRendered = '1';

    const bastionId = el.getAttribute('data-fortized-bastion');
    const key       = el.getAttribute('data-fortized-key');
    el.classList.add('fortized-embed');

    if (!bastionId || !key) {
      el.innerHTML = '<div class="fortized-embed-error">Missing data-fortized-bastion or data-fortized-key.</div>';
      return;
    }

    el.innerHTML = '<div class="fortized-embed-loading">Loading…</div>';

    fetchBastion(bastionId, key)
      .then(b => {
        const icon = b.icon
          ? '<img class="fortized-embed-icon" src="' + escapeHTML(b.icon) + '" alt="">'
          : '<div class="fortized-embed-icon-fallback">' + escapeHTML((b.name || '?').slice(0, 1).toUpperCase()) + '</div>';
        const online = formatCount(b.online);
        const total  = formatCount(b.memberCount);
        el.innerHTML =
          '<div class="fortized-embed-header">' +
            icon +
            '<div class="fortized-embed-info">' +
              '<div class="fortized-embed-name">' + escapeHTML(b.name || 'Bastion') + '</div>' +
              '<div class="fortized-embed-stats">' +
                '<span class="fortized-embed-dot"></span>' +
                online + ' online · ' + total + ' member' + (b.memberCount === 1 ? '' : 's') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<a class="fortized-embed-cta" href="' + escapeHTML(joinUrl(b)) + '" target="_blank" rel="noopener">' +
            'Join on Fortized' +
          '</a>';
      })
      .catch(err => {
        el.innerHTML = '<div class="fortized-embed-error">Could not load bastion: ' + escapeHTML(err.message || 'unknown') + '</div>';
      });
  }

  function renderJoinAnchor(el) {
    if (el.dataset.fortizedRendered === '1') return;
    el.dataset.fortizedRendered = '1';

    const bastionId = el.getAttribute('data-bastion');
    const key       = el.getAttribute('data-fortized-key');

    if (!bastionId || !key) {
      el.classList.add('fortized-join-error');
      el.textContent = 'Missing data-bastion or data-fortized-key';
      el.removeAttribute('href');
      return;
    }

    if (!el.getAttribute('target')) el.setAttribute('target', '_blank');
    if (!el.getAttribute('rel'))    el.setAttribute('rel', 'noopener');

    // If the host gave us their own copy ("Join on Fortized" etc.),
    // keep it. We still wire the href to the live invite URL.
    const hadCustomText = !!el.textContent.trim();

    fetchBastion(bastionId, key)
      .then(b => {
        el.setAttribute('href', joinUrl(b));
        if (!hadCustomText) {
          let html = '';
          if (b.icon) html += '<img src="' + escapeHTML(b.icon) + '" alt="">';
          html += '<span>Join ' + escapeHTML(b.name || 'on Fortized') + '</span>';
          if (b.online > 0) html += '<span class="fortized-join-online">· ' + formatCount(b.online) + ' online</span>';
          el.innerHTML = html;
        }
      })
      .catch(() => {
        // Fall back to a generic Fortized link rather than leaving the
        // anchor href-less. The host's text (if any) is preserved.
        el.setAttribute('href', API_BASE + '/app');
        if (!hadCustomText) el.textContent = 'Open on Fortized';
      });
  }

  // ── Init ────────────────────────────────────────────────────────
  function scan(root) {
    injectStyles();
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('[data-fortized-bastion]').forEach(renderBastionCard);
    scope.querySelectorAll('a.fortized-join').forEach(renderJoinAnchor);
  }

  if (typeof window !== 'undefined') {
    window.Fortized = window.Fortized || {};
    window.Fortized.scan    = scan;
    window.Fortized.refresh = function () { _cache.clear(); scan(); };

    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { scan(); });
      } else {
        scan();
      }
    }
  }
})();
