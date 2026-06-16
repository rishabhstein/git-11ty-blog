---
name: project-oneko
description: Pixel cat cursor (oneko.js) added — sprite at assets/images/oneko.gif, script at assets/js/cat-cursor.js
metadata:
  type: project
---

Added the classic oneko.js pixel cat cursor to the blog. Based on adryd325's implementation: https://github.com/adryd325/oneko.js

**Files:**
- `assets/js/cat-cursor.js` — oneko.js source (sprite path hardcoded to `/assets/images/oneko.gif` since `document.currentScript` is null with `defer`)
- `assets/images/oneko.gif` — 256×128 pixel sprite sheet
- Script tag already in `src/_includes/base.njk`

**How to apply:** If the user wants to tweak the cat speed, edit `nekoSpeed` in `cat-cursor.js`. To swap the sprite, replace `oneko.gif`.
