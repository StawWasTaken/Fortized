#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   THE ICON GUARD
   ───────────────────────────────────────────────────────────────────────────
     node tools/check-icons.mjs          report
     node tools/check-icons.mjs --strict fail on any violation (CI / pre-commit)

   Two standing rules, and this makes them checkable instead of remembered:

   1. Icons are INLINED FontAwesome solid SVG paths via _faIcon(). Never
      <i class="fa-…">. FontAwesome is a CDN dependency and an icon that fails
      to draw is a broken control — the close button on a modal is the way OUT
      of that modal.
   2. Never an OS emoji as an icon. It is a different typeface on every machine
      and it cannot take our colours.

   It also fails on an _faIcon('name') whose glyph is not in _FA_ICON_PATHS,
   which node --check can NEVER catch: those calls sit inside template
   literals, so a typo is a silent empty string at runtime, and the control
   just draws nothing.

   ⚠️ On the FontAwesome CSS-class backlog: converting a site needs the real
   FA path data, which is not in this repo and cannot be fetched from the
   sandbox (the CDN is blocked by egress policy). So the backlog is REPORTED,
   not auto-failed, and each phase of the rework converts the sites it touches.
   Pass --strict once the count reaches zero to keep it there.
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STRICT = process.argv.includes('--strict');
const FILES = ['app/app.js', 'app/index.html', 'app/kit/kit.js'];

// Emoji, as distinct from the punctuation and symbols we legitimately use
// (· ‹ › × ✓ are typography, not icons).
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

const src = {};
for (const f of FILES) src[f] = fs.readFileSync(path.join(ROOT, f), 'utf8');

// ── The registry ──────────────────────────────────────────────────────────
const appjs = src['app/app.js'];
const regStart = appjs.indexOf('const _FA_ICON_PATHS = {');
if (regStart < 0) {
  console.error('FAIL: _FA_ICON_PATHS not found in app/app.js. The icon registry IS the icon set.');
  process.exit(1);
}
const regEnd = appjs.indexOf('\n};', regStart);
const regBody = appjs.slice(regStart, regEnd);
const known = new Set([...regBody.matchAll(/^\s*'([a-z0-9-]+)':/gm)].map(m => m[1]));

// ── 1. Unknown glyph names ────────────────────────────────────────────────
// The one that node --check is blind to. A miss returns '' and draws nothing.
const unknown = new Map();
for (const [f, text] of Object.entries(src)) {
  if (f.includes('/kit/')) continue; // kit.js names the helper in a string, on purpose
  for (const m of text.matchAll(/_faIcon\(\s*'([^']+)'/g)) {
    if (!known.has(m[1])) {
      const line = text.slice(0, m.index).split('\n').length;
      if (!unknown.has(m[1])) unknown.set(m[1], []);
      unknown.get(m[1]).push(`${f}:${line}`);
    }
  }
}

// ── 2. FontAwesome CSS-class icons (the conversion backlog) ───────────────
// ⚠️ Scan for EVERY fa-* token and filter the keywords out afterwards. An
// alternation like /fa-(?:solid)\s+fa-(\w+)|class="fa-(\w+)/ looks right and is
// not: on `class="fa-solid fa-flag"` the second branch matches first at the
// earlier position, captures "solid", consumes it, and the real glyph is never
// seen. That reported 5 sites where there are 162.
const FA_KEYWORDS = new Set(['solid', 'regular', 'brands', 'light', 'thin', 'duotone', 'sharp',
  'fw', 'lg', 'sm', 'xs', '2x', '3x', 'spin', 'pulse', 'beat', 'fade', 'flip', 'rotate-90', 'stack']);
const faClass = new Map();
for (const [f, text] of Object.entries(src)) {
  if (f.includes('/kit/')) continue; // the kit documents the rule, in escaped prose
  for (const m of text.matchAll(/class="[^"]*\bfa-[a-z0-9- ]+"/g)) {
    for (const t of m[0].matchAll(/\bfa-([a-z0-9-]+)/g)) {
      if (FA_KEYWORDS.has(t[1])) continue;
      faClass.set(t[1], (faClass.get(t[1]) || 0) + 1);
    }
  }
}
const faTotal = [...faClass.values()].reduce((a, b) => a + b, 0);
const faAlreadyInRegistry = [...faClass.keys()].filter(n => known.has(n));

// ── 3. Emoji standing in for an icon ──────────────────────────────────────
// Only where it reads as an icon: alone inside a tag, or as a button's whole
// label. Emoji inside a sentence of copy is prose and is left alone.
const emojiHits = [];
for (const [f, text] of Object.entries(src)) {
  if (f.includes('/kit/')) continue;
  const lines = text.split('\n');
  lines.forEach((ln, i) => {
    for (const m of ln.matchAll(/>\s*([^<>\s]{1,4})\s*<|button[^>]*>\s*([^<>\s]{1,4})\s*</g)) {
      const g = m[1] || m[2] || '';
      if (EMOJI.test(g)) emojiHits.push({ file: f, line: i + 1, glyph: g, ctx: ln.trim().slice(0, 110) });
    }
  });
}

// ── Report ────────────────────────────────────────────────────────────────
const R = [];
R.push(`Icon registry: ${known.size} glyphs inlined.`);
R.push('');

let fatal = 0;

if (unknown.size) {
  fatal += unknown.size;
  R.push(`✗ ${unknown.size} _faIcon() call(s) name a glyph that is NOT in the registry.`);
  R.push('  These return an empty string at runtime — the control draws nothing, and');
  R.push('  node --check cannot see it because the call sits in a template literal.');
  for (const [name, where] of unknown) R.push(`    '${name}'  ← ${where.slice(0, 4).join(', ')}`);
  R.push('');
} else {
  R.push('✓ Every _faIcon() call names a glyph that exists.');
  R.push('');
}

if (emojiHits.length) {
  fatal += emojiHits.length;
  R.push(`✗ ${emojiHits.length} emoji used where an icon belongs:`);
  for (const h of emojiHits.slice(0, 20)) R.push(`    ${h.file}:${h.line}  ${h.glyph}  ${h.ctx}`);
  if (emojiHits.length > 20) R.push(`    … and ${emojiHits.length - 20} more`);
  R.push('');
} else {
  R.push('✓ No emoji standing in for an icon.');
  R.push('');
}

R.push(`FontAwesome CSS-class backlog: ${faTotal} site(s) across ${faClass.size} glyph(s).`);
R.push('  Each is a <i class="fa-…"> that must become an inlined _faIcon() path.');
R.push('  Converting one needs the real FA path data, which is not in this repo and');
R.push('  cannot be fetched here (the CDN is blocked by egress policy), so these are');
R.push('  converted phase by phase as each surface is rebuilt.');
if (faAlreadyInRegistry.length) {
  R.push('');
  R.push(`  ${faAlreadyInRegistry.length} of them can be converted RIGHT NOW — their path is`);
  R.push('  already in the registry, so it is a pure markup swap:');
  R.push('    ' + faAlreadyInRegistry.sort().join(' · '));
}
R.push('');
const top = [...faClass.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
R.push('  Most-used, i.e. worth having the path data for first:');
R.push('    ' + top.map(([n, c]) => `${n} (${c})`).join(' · '));

console.log(R.join('\n'));

if (fatal && STRICT) process.exit(1);
if (fatal) { console.log(`\n${fatal} violation(s). Run with --strict to fail on them.`); process.exit(1); }
