# Wedding RSVP form

Single self-contained page. Deploy the contents of this folder to any static host
(GitHub Pages, Netlify, Cloudflare Pages) — `index.html` must sit at the site root.

## Files

- `index.html` — the whole form (no build step, no dependencies)
- `apps-script.gs` — the Google Apps Script bound to the responses spreadsheet
- `oembed.json` — lets embed tools treat the page as embeddable (optional)

## How it works

- The form POSTs/GETs to a Google Apps Script web app (URL is baked into `index.html`).
- **Sheet 1** = responses. **Sheet 2** = guest list: column A name/family, column B number of people.
- Guest list and per-family caps are read live from sheet 2 on page load — edit the sheet,
  no redeploy needed.
- Names containing `/` (e.g. `Bihu/Rumman Khan`) are treated as two people sharing one allocation.
- Duplicate names are rejected server-side; the guest can choose to replace their earlier response.

## Changing the form

Edit `index.html` only if you know what you're doing — it is generated output.
The editable source lives in the design project this was exported from.

## Publishing on GitHub Pages

1. Create a repo, put these files at the repo root.
2. Settings → Pages → Source: `main` branch, `/ (root)`.
3. The site appears at `https://<user>.github.io/<repo>/`.
4. Update the iframe `src` in Genially to that URL and republish.
