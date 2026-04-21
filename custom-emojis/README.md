# Custom Emojis

PNG overrides for specific Twemoji unicode glyphs. These live in a folder
SEPARATE from `fortized emojis/`, which is reserved exclusively for the
Fortized Guide set.

Anything dropped here is served via jsDelivr at:

```
https://cdn.jsdelivr.net/gh/StawWasTaken/Fortized@main/custom-emojis/<filename>
```

## Current overrides

| Unicode | Filename                 | Replaces           |
| ------- | ------------------------ | ------------------ |
| 💰      | `moneybag.png`           | money_bag          |
| 🤑      | `money mouth.png`        | money_mouth_face   |
| 💸      | `money with wings.png`   | money_with_wings   |

The mapping lives in `app/app.js` under `EMOJI_URL_OVERRIDES` — updating
that map is the only step required to add a new override.
