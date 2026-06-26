# Ordinary Japanese Dictionary — website

Static landing/marketing site for the **Ordinary Japanese Dictionary** (普通の辞書) app — a
Japanese–Russian / Japanese–English dictionary — plus a public issue tracker (GitHub Issues).

Lives on **GitHub Pages** at **https://dict.notononoto.com**.

The app's source lives in a separate private repository; this repo holds only the website and the
issue tracker.

## Structure

Trilingual site: `/ru/`, `/en/`, `/ja/`; the root is a language dispatcher.

```
index.html        — ROOT: auto-detects language (JS → /ru/, /en/ or /ja/) + manual picker (no-JS)
styles.css        — shared styles (no build step)
analytics.js      — Cloudflare Web Analytics (cookieless); token lives in one place
assets/           — icon, og image (shared across languages)
screenshots/      — landing screenshots
docs/             — od-dict-format.md (the "full contract" the format pages link to)
CNAME .nojekyll   — for GitHub Pages
.github/ISSUE_TEMPLATE/ — bug / idea + redirect to Warodai/JMdict for content errors
STORE-DATA.md     — crib sheet for Play Data Safety / Apple App Privacy (local only, gitignored)

ru/   index.html · privacy.html (hub) · privacy-{play,appstore,rustore}.html · support.html · format.html
en/   index.html · privacy.html (hub) · privacy-{play,appstore}.html · support.html · format.html
ja/   index.html · privacy.html (hub) · privacy-{play,appstore}.html · support.html · format.html
```

- **Name:** RU/EN use the full **«Обычный японский словарь» / Ordinary Japanese Dictionary**; JA uses
  **普通の辞書** + the descriptor **和露・和英辞典** (NOT 普通の日本語辞書 — to a Japanese reader that
  reads as a monolingual Japanese dictionary). The header logo uses the short name everywhere.
- **EN/JA differ:** positioning (EN Japanese–English, JA 和露・和英) and no RuStore policy (RF-only
  channel). Sources are the same — Warodai ships in the build, so it is credited in every language.
- Assets are referenced absolutely (`/styles.css`, `/assets/…`); in-language links are relative;
  every page has `hreflang` + a language switcher (the two other versions) in the header.

Plain HTML + CSS, no build step. Edit a file and it's published as-is.

## Deploy on GitHub Pages (one-time)

1. A **public** repo `dancing-elf/ordinary-jp-dict-site` on GitHub holds this folder.
2. **Settings → Pages**: Source = "Deploy from a branch", branch = `main`, folder = `/ (root)`.
3. **Settings → Pages → Custom domain** = `dict.notononoto.com` → Save (the `CNAME` file is already in
   the repo, so GitHub picks this up automatically).
4. Add a DNS record for `notononoto.com` (at Porkbun):
   ```
   CNAME   dict   →   dancing-elf.github.io.
   ```
   (If DNS sits behind Cloudflare, keep it **DNS only** / grey cloud — do not proxy.)
5. Wait for the domain check to go green → enable **Enforce HTTPS** (Let's Encrypt cert issues
   automatically, sometimes up to an hour).

A subdomain needs no apex A-records and no nameserver move.

> Before the custom domain resolves, `dancing-elf.github.io/ordinary-jp-dict-site/` renders broken
> (root-absolute asset paths) — that's expected. The site only looks right at `dict.notononoto.com`
> (or locally via `python3 -m http.server`).

## Publishing updates

```sh
cd ~/ordinary-dict-site
git add .
git commit -m "site: <what changed>"
git push
```

## Pre-launch checklist

- [ ] replace the store-link placeholders in each `index.html` (`.stores` block);
- [ ] add screenshots to `screenshots/` and the icon/og image to `assets/` (see `screenshots/README.md`);
- [ ] **verify the "Services" section of each `privacy-*.html` against the actually-shipped build** —
      these are legally meaningful pages; add/remove providers per the real release;
- [ ] put the correct per-listing privacy-policy URL in each store console (table below);
- [ ] fill the Data Safety (Play) and App Privacy (Apple) forms per `STORE-DATA.md`;
- [ ] check the "effective date" in every `privacy-*.html`;
- [ ] contact in the policies = `notononoto@gmail.com` (bug reports go through GitHub Issues only);
- [ ] paste the Cloudflare Web Analytics token into `analytics.js` (dash.cloudflare.com → Web Analytics
      → Add a site, JS beacon method, no DNS move). Cookieless → no consent banner needed.

## Privacy-policy URLs per listing

Base: `https://dict.notononoto.com`

| Listing | URL |
|---|---|
| Google Play (RU / EN / JA) | `/ru/privacy-play.html` · `/en/privacy-play.html` · `/ja/privacy-play.html` |
| App Store (RU / EN / JA) | `/ru/privacy-appstore.html` · `/en/privacy-appstore.html` · `/ja/privacy-appstore.html` |
| RuStore | `/ru/privacy-rustore.html` |

(Google Play has a single privacy-URL field per app → use your primary listing's language; the page has
a switcher. Apple allows a localized privacy URL per locale.)
