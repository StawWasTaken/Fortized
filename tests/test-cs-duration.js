// Verify the custom-status duration math + sync-expiry logic in isolation.
const CUSTOM_DURATIONS = [
  { id: '30m', ms: 30*60000 }, { id: '1h', ms: 60*60000 },
  { id: '8h', ms: 8*60*60000 }, { id: '24h', ms: 24*60*60000 },
  { id: '3d', ms: 3*24*60*60000 }, { id: 'today', ms: null }, { id: 'forever', ms: Infinity },
];
function durationMs(id){ if(id==='today'){const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate()+1)-n;} const d=CUSTOM_DURATIONS.find(d=>d.id===id); return d?d.ms:Infinity; }

// mirrors _ftzCspSave duration→clearAtMs
function computeClearAt(dur, now, customAmt, customUnit, statusExpiry){
  const opts = {};
  if (dur === 'sync') { opts.syncWithStatus = true; if (statusExpiry) opts.clearAtMs = statusExpiry; }
  else if (dur === 'custom') { const perUnit={min:60000,h:3600000,d:86400000}[customUnit]||3600000; opts.clearAtMs = now + customAmt*perUnit; }
  // For real durations, setCustom computes clearAt from durationMs
  const durForSetCustom = (dur==='custom'||dur==='sync') ? 'forever' : dur;
  if (!opts.clearAtMs) { const ms = durationMs(durForSetCustom); if (ms!==Infinity && ms>0) opts.clearAtMs = now+ms; }
  return opts;
}

let pass=0,fail=0; const now=1_700_000_000_000;
function ok(c,n){ c?(pass++,console.log('  ✓',n)):(fail++,console.log('  ✗ FAIL',n)); }

ok(computeClearAt('1h',now).clearAtMs===now+3600000,'1h → +1h');
ok(computeClearAt('8h',now).clearAtMs===now+8*3600000,'8h → +8h');
ok(computeClearAt('24h',now).clearAtMs===now+24*3600000,'24h → +24h');
ok(computeClearAt('3d',now).clearAtMs===now+3*86400000,'3d → +3d');
ok(computeClearAt('forever',now).clearAtMs===undefined,'forever → no expiry');
ok(computeClearAt('custom',now,2,'d').clearAtMs===now+2*86400000,'custom 2 days');
ok(computeClearAt('custom',now,45,'min').clearAtMs===now+45*60000,'custom 45 min');
const s=computeClearAt('sync',now,0,'h',now+5000); ok(s.syncWithStatus===true && s.clearAtMs===now+5000,'sync → syncWithStatus + status expiry');
const s2=computeClearAt('sync',now,0,'h',0); ok(s2.syncWithStatus===true && s2.clearAtMs===undefined,'sync w/ no status expiry → flag only');
console.log(pass+' passed, '+fail+' failed'); process.exit(fail?1:0);
