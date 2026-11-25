# BYD — Building the Future of Mobility

A **static presentation site**. There is no build step, no framework and no server-side code.
Upload the folder as-is and any static web host will serve it.

## What is in this folder

| Path | Purpose |
| --- | --- |
| `index.html` | The whole presentation |
| `css/` | `styles.css`, `sections.css`, `responsive.css` |
| `js/app.js` | All interactions (intro, navigation, tabs, chart, dashboard) |
| `assets/byd-logo.svg` | Logo used in the intro, header and footer |
| `qa/` | Screenshots from development — not needed by the site |

Everything is referenced with **relative paths**, so the site works at a domain root
(`https://example.com/`) and in a subfolder (`https://example.com/byd-future-of-mobility/`).

The only external request is the Google Fonts stylesheet in `index.html`. If the host or
visitor blocks it, the site still works with the fallback system fonts.

## Deploy

### Netlify (fastest)

1. Go to <https://app.netlify.com/drop>.
2. Drag this **whole folder** onto the page.
3. You get a live URL immediately. Set your own name under *Site settings → Change site name*.

No build command and no publish directory override are needed — `index.html` is already at the root.

### Vercel

1. Push the folder to a Git repository.
2. Import the repo at <https://vercel.com/new>.
3. Framework preset: **Other**. Build command: leave empty. Output directory: `.` (root).
4. Deploy.

Or from the terminal in this folder: `npx vercel --prod`.

### GitHub Pages

1. Push this folder as the root of a repository (or copy its contents into `docs/`).
2. Repository → **Settings → Pages → Source: Deploy from a branch**.
3. Pick `main` / `/` (root) — or `/docs` if you used `docs/` — and save.
4. The `.nojekyll` file in this folder disables Jekyll processing so nothing is stripped.

Site URL will be `https://<username>.github.io/<repo-name>/`.

### Any other static host / Your own server

Upload the contents of this folder (not the folder itself) to the web root. For example:

```bash
# Local preview, from this folder
python -m http.server 8000
# then open http://localhost:8000
```

```bash
# rsync to a server
rsync -av --exclude 'qa/' --exclude 'qa-desktop-full.png' ./ user@host:/var/www/html/
```

Do **not** open `index.html` with a `file://` URL if you want the full experience —
session state and some browser features behave differently there. Use an HTTP server.

## Before deploying

Optional but recommended: delete `qa/` and `qa-desktop-full.png`. They are development
screenshots (~29 MB) and are not used by the page.

## Quick checks after deploying

- The intro animation appears on a first visit, then is skipped for the rest of the session.
- The side rail and top navigation jump to all seven sections.
- Tabs under *Project resources* and *Organizing* switch panels.
- The KPI dashboard under *Control* renders and "Reset sample data" works.
- No 404s in the browser Network tab for `css/*.css`, `js/app.js` or `assets/byd-logo.svg`.
