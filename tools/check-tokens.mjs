#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   THE TOKEN GUARD
   ───────────────────────────────────────────────────────────────────────────
     node tools/check-tokens.mjs              report
     node tools/check-tokens.mjs --new-only   only rules added after the baseline
     node tools/check-tokens.mjs --baseline   re-stamp the baseline (deliberate)

   The appearance system rewrites the :root tokens at runtime. A component that
   hardcodes a colour therefore stops recolouring — which is exactly how the
   Discover hero ended up meeting the page at a seam under every appearance but
   the default, and why the three stat plates came out three different colours.

   20,000 lines of legacy CSS cannot be converted in one pass, and a checker
   that always fails is a checker everybody ignores. So it works off a
   BASELINE: the count at the moment the guard was introduced. Anything above
   the baseline is new debt and fails; the baseline itself falls phase by phase
   as each surface is rebuilt. It can only ever go down.
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = path.join(ROOT, 'app', 'styles.css');
const BASELINE = path.join(ROOT, 'tools', 'token-baseline.json');
const css = fs.readFileSync(CSS, 'utf8');

// Colours that are legitimately literal, not a missing token:
//  · pure black/white at an alpha — a scrim, a neutral shadow, a specular
//  · #13161d — the ink the accent-filled controls print their glyph in, which
//    must stay dark whatever the surface behind it does
//  · currentColor and transparent
const ALLOWED = /^(?:transparent|currentcolor|inherit|none|#13161d)$/i;
const isNeutralRgba = (s) => /^rgba?\(\s*(0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255)\s*[,)]/i.test(s);

// Strip comments and the :root blocks — a token DEFINITION is not a violation.
let body = css.replace(/\/\*[\s\S]*?\*\//g, '');
body = body.replace(/:root[^{]*\{[^}]*\}/g, '');

const lineOf = (idx) => css.slice(0, idx).split('\n').length;

const hits = [];
// Hex literals.
for (const m of body.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
  if (ALLOWED.test(m[0])) continue;
  if (/^#(fff|ffffff|000|000000)$/i.test(m[0])) { hits.push({ kind: 'neutral-hex', v: m[0], i: m.index }); continue; }
  hits.push({ kind: 'hex', v: m[0], i: m.index });
}
// rgb()/rgba() literals that are not neutral.
for (const m of body.matchAll(/rgba?\([^)]*\)/g)) {
  if (isNeutralRgba(m[0])) continue;
  hits.push({ kind: 'rgb', v: m[0].slice(0, 40), i: m.index });
}
// hsl() literals.
for (const m of body.matchAll(/hsla?\([^)]*\)/g)) hits.push({ kind: 'hsl', v: m[0].slice(0, 40), i: m.index });

const counts = hits.reduce((a, h) => { a[h.kind] = (a[h.kind] || 0) + 1; return a; }, {});
const total = hits.length;

// Also worth naming: font-weight 800/900, which the design language caps at 700.
const heavy = [...body.matchAll(/font-weight\s*:\s*(800|900)/g)].length;
// And coloured glow halos, which are banned outright.
// ⚠️ Offsets are frequently written unitless (`0 0 12px …`), so a pattern
// demanding three `\d+px` values matches nothing and reports a clean zero —
// which is worse than no check. Parse the declaration properly instead: a glow
// is a NON-INSET shadow with a real blur whose colour is not neutral black.
// Neutral = black OR white. A white haze at low alpha is a hairline or a
// specular, not a coloured halo; the rule is about accent and status colours.
const NEUTRAL = /^(?:rgba?\(\s*(?:0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255)|#(?:000000|000|ffffff|fff)\b|transparent|currentcolor)/i;
const glowHits = [];
for (const m of body.matchAll(/(?:box-shadow|text-shadow)\s*:\s*([^;}]+)|drop-shadow\(([^)]*)\)/g)) {
  const decl = m[1] || m[2] || '';
  for (const layer of decl.split(/,(?![^(]*\))/)) {
    if (/inset/i.test(layer)) continue;
    // offsets then blur: the third length is the blur.
    const lens = layer.match(/-?\d*\.?\d+(?:px|rem|em)?/g) || [];
    const blur = lens[2] ? parseFloat(lens[2]) : 0;
    if (!(blur > 0)) continue;
    const col = (layer.match(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}\b|currentcolor|transparent/i) || [])[0];
    if (!col || NEUTRAL.test(col)) continue;
    if (/var\(--/.test(layer) && !col) continue;
    glowHits.push({ v: layer.trim().slice(0, 60), i: m.index });
  }
}
const glows = glowHits.length;

const now = { total, ...counts, heavyWeights: heavy, colouredShadows: glows };

if (process.argv.includes('--baseline')) {
  fs.writeFileSync(BASELINE, JSON.stringify({ stampedAt: new Date().toISOString().slice(0, 10), ...now }, null, 2) + '\n');
  console.log('Baseline stamped:\n' + JSON.stringify(now, null, 2));
  process.exit(0);
}

let base = null;
try { base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch (_) {}

console.log(`app/styles.css · hardcoded colour literals outside :root\n`);
const rows = [['total', total], ['hex', counts.hex || 0], ['neutral #fff / #000', counts['neutral-hex'] || 0],
  ['rgb / rgba', counts.rgb || 0], ['hsl', counts.hsl || 0],
  ['font-weight 800/900', heavy], ['coloured shadow declarations', glows]];
const pad = (s, n) => String(s).padEnd(n);
for (const [k, v] of rows) {
  const b = base ? base[k === 'total' ? 'total' : ({ 'hex': 'hex', 'neutral #fff / #000': 'neutral-hex',
    'rgb / rgba': 'rgb', 'hsl': 'hsl', 'font-weight 800/900': 'heavyWeights',
    'coloured shadow declarations': 'colouredShadows' })[k]] : undefined;
  const delta = (b === undefined) ? '' : (v === b ? '  =' : (v < b ? `  ↓ ${b - v}` : `  ↑ ${v - b}  NEW DEBT`));
  console.log(`  ${pad(k, 30)} ${pad(v, 6)}${delta}`);
}

if (glows) {
  console.log('\n  Coloured shadows — a coloured blur halo, banned outright.');
  console.log('  ⚠️ These are DECLARATIONS, not computed styles: some are already dead,');
  console.log('     overridden later in the cascade (the notification badges, for one).');
  console.log('     A dead declaration is still debt — the next person who edits that rule');
  console.log('     re-enables a glow without meaning to. Retire them, do not just override.');
  for (const g of glowHits.slice(0, 12)) console.log(`    styles.css:${lineOf(g.i)}  ${g.v}`);
  if (glowHits.length > 12) console.log(`    … and ${glowHits.length - 12} more`);
}

if (!base) {
  console.log('\nNo baseline yet. Stamp one with:  node tools/check-tokens.mjs --baseline');
  process.exit(0);
}

console.log(`\nBaseline stamped ${base.stampedAt}. It may only ever go down.`);
const worse = ['total', 'heavyWeights', 'colouredShadows'].filter(k => now[k] > base[k]);
if (worse.length) {
  console.error('\nFAIL: ' + worse.map(k => `${k} ${base[k]} → ${now[k]}`).join(', '));
  console.error('New hardcoded colours, 800-weight type or coloured shadows were added.');
  console.error('Use a token, dial the weight to 700, or make the shadow neutral black.');
  process.exit(1);
}
if (now.total < base.total) {
  console.log(`\n${base.total - now.total} literal(s) retired since the baseline. Re-stamp with --baseline.`);
}
