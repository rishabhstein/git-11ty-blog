---
name: project-css-source
description: The actual CSS file the site loads is assets/css/style.css, not src/style.css
metadata:
  type: project
---

The HTML template (`src/_includes/base.njk`) loads `/assets/css/style.css?v=2.1`. This file lives at `assets/css/style.css` in the repo root and is served as a static asset.

`src/style.css` is a separate file that Eleventy builds to `_site/style.css` (at the site root, `/style.css`) — it is NOT the stylesheet the pages actually use.

**Why:** Wasted a session adding cat cursor CSS to `src/style.css` and it had no effect because the page loads a different file entirely.

**How to apply:** Always edit `assets/css/style.css` for visual changes. Never edit `src/style.css` expecting it to affect the main site styles.
