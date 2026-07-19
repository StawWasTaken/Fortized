# Fix: `[getDMMessages] dms table is missing optional column(s)`

The client selects these optional columns from `dms` and self-heals when one
is missing (strips it and retries), which is where the console warning comes
from — the feature data (forwards, replies, reactions, flags) is silently
dropped for DMs until the columns exist.

Run this once in the Supabase SQL editor (idempotent — safe to re-run):

```sql
alter table dms add column if not exists edited       boolean;
alter table dms add column if not exists new_text     text;
alter table dms add column if not exists reactions    jsonb;
alter table dms add column if not exists forwarded    boolean;
alter table dms add column if not exists forwarded_by text;
alter table dms add column if not exists reply_to     jsonb;
alter table dms add column if not exists flags        jsonb;
```

After running it, hard-refresh the app (the working column set is cached per
session in `_dmWorkingCols`). The warning disappears and DM forwards/replies
(including FortGified's reply metadata) persist across reloads.

Related console noise that needs no action:
- `Cookie "__cf_bm" has been rejected…` — a Cloudflare bot-management cookie
  set by third-party hosts (Supabase realtime, cdn3.emoji.gg). Browsers now
  reject/partition third-party cookies; harmless, not fixable client-side.
- `[AVATAR-TRACE] … 500 chars … rejected corrupt/truncated incoming pfp` —
  this is the guard WORKING (it refuses the corrupt echo and keeps the good
  avatar). The permanent cure is still the Media→Storage rollout
  (`docs/media-storage.md`).
- `[Embed] All strategies failed for code: stawMMQR7S3JEOC` — that invite
  code no longer resolves anywhere (expired or revoked). The embed already
  degrades to the "Invalid Invite" card by design; the warn is informational.
