#!/usr/bin/env node
// Desktop DOM probe for the Chrome extension rules. Structure only: prints tag/selector counts, never text or screenshots.
// Usage: FEEDOFF_STATE_X=... node scripts/probe-desktop.mjs <url> [selector ...]
import { chromium, webkit } from 'playwright';
import { readFileSync } from 'node:fs';
const [url, ...sels] = process.argv.slice(2);
const stateEnv = Object.entries(process.env).find(([k]) => k.startsWith('FEEDOFF_STATE_') && url.includes(k.replace('FEEDOFF_STATE_', '').toLowerCase()));
const browser = await (process.env.BROWSER === 'webkit' ? webkit : chromium).launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', storageState: stateEnv ? JSON.parse(stateEnv[1]) : undefined, locale: 'en-US' });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(Number(process.env.WAIT || 6000));
const out = await page.evaluate((sels) => {
  const r = { url: location.href, title: document.title.length, counts: {} };
  for (const s of sels) { try { r.counts[s] = document.querySelectorAll(s).length; } catch (e) { r.counts[s] = 'INVALID'; } }
  // Custom-element census: which yt*/custom tags exist and how many
  const tags = {};
  document.querySelectorAll('*').forEach((e) => { const t = e.tagName.toLowerCase(); if (t.includes('-')) tags[t] = (tags[t] || 0) + 1; });
  r.customTags = Object.fromEntries(Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 80));
  r.testids = {};
  document.querySelectorAll('[data-testid]').forEach((e) => { const t = e.getAttribute('data-testid'); r.testids[t] = (r.testids[t] || 0) + 1; });
  r.ariaLabels = {};
  document.querySelectorAll('[aria-label]').forEach((e) => { const t = e.getAttribute('aria-label'); if (t.length < 40) r.ariaLabels[t] = (r.ariaLabels[t] || 0) + 1; });
  return r;
}, sels);
console.log(JSON.stringify(out, null, 1));
await browser.close();
