#!/usr/bin/env node
// Nightly selector check: load each platform's mobile site in headless WebKit with an
// iPhone profile and assert every CSS selector in rules.json still matches something.
// Logged-in checks use a Playwright storage state passed via FEEDOFF_STATE_<PLATFORM>
// (JSON string) — without it, only logged-out pages are checked and login-only
// selectors are reported as "skipped", not failed.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit, devices } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const rules = JSON.parse(readFileSync(join(here, '../rules.json'), 'utf8'));

// Pages to visit per platform and the toggles whose selectors should match there.
const PLAN = {
  instagram: {
    loginRequired: true,
    pages: [{ url: 'https://www.instagram.com/', toggles: ['reels', 'explore', 'suggested'] }],
  },
  youtube: {
    loginRequired: false,
    pages: [
      { url: 'https://m.youtube.com/', toggles: ['shorts', 'homefeed'] },
      { url: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ', toggles: ['related', 'comments', 'ads'] },
    ],
  },
  x: {
    loginRequired: true,
    pages: [{ url: 'https://x.com/home', toggles: ['foryou', 'trending', 'extras'] }],
  },
  reddit: {
    loginRequired: false,
    pages: [{ url: 'https://www.reddit.com/r/popular/', toggles: ['ads', 'apppromo'] }],
  },
  linkedin: {
    loginRequired: true,
    pages: [{ url: 'https://www.linkedin.com/feed/', toggles: ['pymk', 'news'] }],
  },
};

const results = [];
const browser = await webkit.launch();
for (const [id, platform] of Object.entries(rules.platforms)) {
  const plan = PLAN[id];
  if (!plan) continue;
  const stateEnv = process.env[`FEEDOFF_STATE_${id.toUpperCase()}`];
  if (plan.loginRequired && !stateEnv) {
    results.push({ platform: id, status: 'skipped', reason: 'no login state provided' });
    continue;
  }
  const context = await browser.newContext({
    ...devices['iPhone 14'],
    storageState: stateEnv ? JSON.parse(stateEnv) : undefined,
  });
  const page = await context.newPage();
  for (const step of plan.pages) {
    await page.goto(step.url, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    for (const toggleId of step.toggles) {
      const toggle = platform.toggles[toggleId];
      if (!toggle) continue;
      for (const selector of toggle.css) {
        let count = -1;
        try { count = await page.locator(selector).count(); } catch (e) { count = -1; }
        results.push({ platform: id, toggle: toggleId, selector, url: step.url, count, status: count > 0 ? 'ok' : count === 0 ? 'nomatch' : 'invalid' });
      }
    }
  }
  await context.close();
}
await browser.close();

mkdirSync(join(here, '../report'), { recursive: true });
writeFileSync(join(here, '../report/selectors.json'), JSON.stringify(results, null, 2));

let failed = 0;
for (const r of results) {
  const tag = r.status === 'ok' ? '✅' : r.status === 'skipped' ? '⏭' : '❌';
  if (r.status === 'nomatch' || r.status === 'invalid') failed++;
  console.log(`${tag} ${r.platform}${r.toggle ? '.' + r.toggle : ''} ${r.selector ?? r.reason} ${r.count ?? ''}`);
}
// A selector that matches nothing is a warning, not a hard failure: several selectors per
// toggle overlap on purpose. Fail only if an entire toggle has no matching selector.
const byToggle = {};
for (const r of results.filter((r) => r.selector)) {
  const k = `${r.platform}.${r.toggle}`;
  byToggle[k] = byToggle[k] || { ok: 0, total: 0 };
  byToggle[k].total++;
  if (r.status === 'ok') byToggle[k].ok++;
}
const dead = Object.entries(byToggle).filter(([, v]) => v.ok === 0);
if (dead.length) {
  console.error(`\nToggles with no live selector: ${dead.map(([k]) => k).join(', ')}`);
  process.exit(1);
}
console.log(`\n${failed} selector(s) matched nothing; every toggle still has at least one live selector.`);
