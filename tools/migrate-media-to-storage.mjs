#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// One-time migration: move base64 pfp/banner data-URLs OUT of the users
// table and INTO Supabase Storage, replacing each column with its public URL.
//
// WHY: images stored inline as base64 in the `users` row are the root of the
// Supabase egress blowout — every friend-list / memberlist / search read
// drags the bytes across the wire. After this runs, rows carry a ~100-byte
// URL instead of a ~13 KB (pfp) / multi-MB (banner) blob, and the image bytes
// are served (and CDN-cached) from Storage instead of the DB API.
//
// This is the bulk backfill for rows that already exist. New saves offload
// themselves once the client flag is on (see docs/media-storage.md).
//
// SAFETY:
//   • Dry-run by default. Pass --commit to actually write.
//   • Never deletes anything; only uploads files + rewrites two columns.
//   • Idempotent: rows whose pfp/banner are already https URLs are skipped.
//   • Uploads first, and only rewrites the column after the upload succeeds,
//     so a failure mid-run leaves the row's working data URL untouched.
//
// REQUIREMENTS:
//   • Node 18+ (global fetch/Blob).
//   • npm i @supabase/supabase-js
//   • Env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role — needed
//     to read every row and write past RLS). NEVER commit the service key.
//
// USAGE:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node tools/migrate-media-to-storage.mjs            # dry run (reports only)
//
//   ...same env... node tools/migrate-media-to-storage.mjs --commit   # writes
// ─────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMMIT = process.argv.includes('--commit');
const BUCKET = 'attachments'; // same public bucket the app's uploadFile() uses

if (!URL || !KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const norm = (s) => String(s || '').trim().toLowerCase();

function dataUrlToBuffer(dataUrl) {
  const comma = dataUrl.indexOf(',');
  const meta = dataUrl.slice(5, comma);            // e.g. image/webp;base64
  const mime = meta.split(';')[0] || 'image/webp';
  const b64 = dataUrl.slice(comma + 1);
  return { buf: Buffer.from(b64, 'base64'), mime, ext: (mime.split('/')[1] || 'webp') };
}

async function uploadMedia(username, kind, dataUrl) {
  const { buf, mime, ext } = dataUrlToBuffer(dataUrl);
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const path = `user-media/${norm(username)}/${kind}-${stamp}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, buf, { contentType: mime, upsert: true });
  if (error) throw new Error(`upload ${kind} for ${username}: ${error.message}`);
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { url: pub.publicUrl, bytes: buf.length };
}

async function run() {
  console.log(`\nMedia → Storage migration  (${COMMIT ? 'COMMIT' : 'DRY RUN'})\n`);
  const PAGE = 200;
  let from = 0, scanned = 0, changedRows = 0, savedBytes = 0, failures = 0;

  for (;;) {
    const { data, error } = await sb
      .from('users')
      .select('username,pfp,banner')
      .order('username', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) { console.error('Read failed:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;

    for (const row of data) {
      scanned++;
      const patch = {};
      for (const col of ['pfp', 'banner']) {
        const v = row[col];
        if (typeof v === 'string' && v.startsWith('data:')) {
          try {
            if (COMMIT) {
              const { url, bytes } = await uploadMedia(row.username, col, v);
              patch[col] = url;
              savedBytes += bytes;
            } else {
              savedBytes += Math.floor((v.length - v.indexOf(',')) * 0.75); // approx decoded size
            }
          } catch (e) {
            failures++;
            console.warn('  ! ' + e.message);
          }
        }
      }
      if (Object.keys(patch).length) {
        changedRows++;
        if (COMMIT) {
          const { error: upErr } = await sb.from('users').update(patch).eq('username', row.username);
          if (upErr) { failures++; console.warn(`  ! update ${row.username}: ${upErr.message}`); }
          else console.log(`  ✓ ${row.username}: ${Object.keys(patch).join(', ')}`);
        } else {
          console.log(`  • ${row.username}: would offload ${Object.keys(patch).join(', ')}`);
        }
      }
    }

    from += PAGE;
  }

  const mb = (savedBytes / (1024 * 1024)).toFixed(1);
  console.log(`\nScanned ${scanned} users. ${changedRows} row(s) ${COMMIT ? 'migrated' : 'would migrate'}.`);
  console.log(`≈ ${mb} MB of inline image data ${COMMIT ? 'removed from' : 'still in'} user rows` +
              ` (that weight left the DB on every read).`);
  if (failures) console.log(`${failures} failure(s) — safe to re-run; migrated rows are skipped.`);
  if (!COMMIT) console.log(`\nDry run only. Re-run with --commit to apply.\n`);
}

run().catch((e) => { console.error(e); process.exit(1); });
