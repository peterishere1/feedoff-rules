# FeedOff filter rules

The filter rules for [FeedOff](https://feedoff.app), the free iPhone app that shows Instagram,
YouTube, X, Reddit and LinkedIn without their feeds. This folder is published from the app's
repository to [github.com/peterishere1/feedoff-rules](https://github.com/peterishere1/feedoff-rules)
so anyone can read what the app hides and send a fix when a site changes. MIT licensed.

`rules.json` is the only thing the FeedOff app downloads. It tells the app which parts of
Instagram and YouTube's mobile sites to hide, which paths to redirect, and which requests to
block. It is bundled into the app as a fallback and fetched from
`https://feedoff.app/v1/rules.json` on launch and every 6 hours.

## Layout

- `src/rules.base.json`: the rules, hand-edited
- `src/js/*.js`: small page behaviours referenced by name from `platforms.<id>.js`
- `build.mjs`: inlines the JS into `rules.json` and validates the file
- `scripts/check-selectors.mjs`: nightly Playwright check that every selector still matches

## Editing a rule

1. Edit `src/rules.base.json` (or a file in `src/js/`)
2. Bump `version`
3. `npm run build` (from this folder) and commit `rules.json` with the source
4. Merge to `main`; the deploy workflow publishes it. Apps pick it up within 6 hours or on next launch

## Schema

```
version        integer, bump on every change
minAppVersion  apps older than this ignore the file and keep their bundled copy
platforms.<id>
  name         display name
  home         URL the tab opens and redirects land on
  hosts        hostnames (suffix match) treated as "inside" this platform; other links open in Safari
  redirects[]  { match: regex on pathname, to: path, toggle?: only when that toggle is on }
  allow[]      { match: regex on pathname } paths that never redirect (e.g. a single /reel/ID)
  blockRequests[]  glob URL patterns turned into a WKContentRuleList block list
  toggles.<id> { label, detail, default, css[], hideIfText[] }
    css         selectors hidden with display:none !important (must be valid WebKit CSS; :has() ok)
    hideIfText  { selector, contains[], maxTextLength? } elements hidden when their text contains a phrase
  js[]         names of behaviours from jsLibrary to inject on this platform
jsLibrary      name -> JavaScript source (generated from src/js by build.mjs)
```

## Sending a fix

Open a pull request against `src/rules.base.json` (or a file in `src/js/`) with a one-line note on
what changed on the site. Bump `version`. The nightly check runs against the live sites; a green run
plus a quick look is all it takes to merge, and the app picks it up within 6 hours.

## Finding a broken selector

Open the site in Safari on an iPhone simulator, enable Web Inspector on the Mac (Safari →
Develop → Simulator), and inspect the element that should be hidden. Prefer stable hooks:
`href` prefixes, `aria-label`s and custom element names (`ytm-*`) over generated class names.
