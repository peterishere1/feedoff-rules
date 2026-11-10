#!/usr/bin/env node
// Text-hide check: the selector check only proves CSS selectors still match. The hides that
// work by reading a label ("Suggested for you", "Sponsored") have no selector to test, so this
// loads the logged-in feed with the real filter engine applied, scrolls it, and counts posts
// that are still visible but look suggested or sponsored.
//
// Structure only: it reports counts, never post text, usernames or screenshots.
// Sessions come from FEEDOFF_STATE_<PLATFORM>, like check-selectors.mjs.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit, devices } from 'playwright';
import { applyFeedOff } from './lib/apply-rules.mjs';

const here = dirname(fileURLToPath(import.meta.url));
// FEEDOFF_RULES_FILE checks another rules file, e.g. the previous release, to compare.
const rules = JSON.parse(readFileSync(process.env.FEEDOFF_RULES_FILE || join(here, '../rules.json'), 'utf8'));

// `signals` are language-independent-ish tells of a post the account does not follow. The check
// runs in English, so they are English labels on buttons, never post text.
const PLAN = {
  instagram: {
    url: 'https://www.instagram.com/',
    item: 'article',
    // A post's permalink identifies it across scroll steps (the feed recycles its DOM).
    key: "a[href*='/p/'], a[href*='/reel/']",
    minItems: 6,
    signals: {
      follow: ['Follow'],
      cta: ['Learn more', 'Shop now', 'Sign up', 'Install now', 'Book now', 'Get offer', 'Subscribe', 'Download', 'Watch more', 'Contact us', 'Apply now', 'Get quote', 'Order now', 'Send message', 'Play game'],
    },
    // Fail when this many posts, or this share of the visible ones, look suggested or sponsored.
    maxLeaks: 2,
    maxLeakShare: 0.25,
  },
};

const only = process.argv.slice(2);
const results = [];
const browser = await webkit.launch();
for (const [id, plan] of Object.entries(PLAN)) {
  if (only.length && !only.includes(id)) continue;
  const stateEnv = process.env[`FEEDOFF_STATE_${id.toUpperCase()}`];
  if (!stateEnv) { results.push({ platform: id, status: 'skipped', reason: 'no login state provided' }); continue; }
  const context = await browser.newContext({ ...devices['iPhone 14'], locale: 'en-US', storageState: JSON.parse(stateEnv) });
  const payload = await applyFeedOff(context, rules, id);
  const page = await context.newPage();
  await page.goto(plan.url, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
  await page.waitForSelector(plan.item, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const labels = payload.textRules.flatMap((r) => r.exact || []);
  const seen = new Map();
  let stable = 0, last = -1, engine = false;
  for (let step = 0; step < 30 && stable < 4; step++) {
    const snap = await page.evaluate(({ plan, labels }) => {
      const norm = (x) => (x || '').replace(/[‘’ʼ]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
      const want = { label: labels.map(norm), follow: plan.signals.follow.map(norm), cta: plan.signals.cta.map(norm) };
      const out = [];
      document.querySelectorAll(plan.item).forEach((el, i) => {
        const link = el.querySelector(plan.key);
        const flags = { label: false, follow: false, cta: false };
        el.querySelectorAll('span, a, div, button, h2, h3, h4').forEach((leaf) => {
          if (leaf.children.length) return;
          const t = norm(leaf.textContent);
          if (!t || t.length > 60) return;
          for (const k of Object.keys(want)) if (want[k].indexOf(t) !== -1) flags[k] = true;
        });
        // An ad has no timestamp and links off-site, whatever it is labelled.
        const offsite = [...el.querySelectorAll('a[href]')].some((a) => /^https?:/.test(a.getAttribute('href')) && a.hostname.indexOf(location.hostname.replace(/^www\./, '')) === -1);
        flags.adShape = offsite && !el.querySelector('time');
        const img = el.querySelector('img[src]');
        const key = link ? link.getAttribute('href') : img ? img.src.replace(/\?.*/, '').slice(-40) : 'idx' + i;
        const state = el.getAttribute('data-feedoff-hidden');
        out.push({ key, hidden: state || (el.getBoundingClientRect().height < 2 ? 'collapsed' : ''), ...flags });
      });
      return { engine: !!window.__feedoff, items: out, caughtUp: !!document.querySelector('[data-feedoff-hidden="end"]') };
    }, { plan, labels });
    engine = engine || snap.engine;
    // Keep the most hidden state seen for each post: a post is swept a frame or two after it renders.
    for (const it of snap.items) {
      const prev = seen.get(it.key);
      seen.set(it.key, prev ? { ...it, hidden: it.hidden || '', label: prev.label || it.label, follow: prev.follow || it.follow, cta: prev.cta || it.cta, adShape: prev.adShape || it.adShape } : it);
    }
    if (seen.size === last) stable++; else { stable = 0; last = seen.size; }
    if (snap.caughtUp) stable = Math.max(stable, 2);
    await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.9)));
    await page.waitForTimeout(1200);
  }
  await context.close();

  const items = [...seen.values()];
  const visible = items.filter((i) => !i.hidden);
  const r = {
    platform: id,
    engine,
    posts: items.length,
    hidden: items.length - visible.length,
    visible: visible.length,
    // A visible post that still carries one of the rule's own labels: the engine missed it.
    labelled: visible.filter((i) => i.label).length,
    // A visible post from an account the user doesn't follow, or with an ad button.
    follow: visible.filter((i) => i.follow && !i.label).length,
    ad: visible.filter((i) => (i.cta || i.adShape) && !i.label && !i.follow).length,
  };
  r.leaks = r.labelled + r.follow + r.ad;
  if (!engine) { r.status = 'fail'; r.reason = 'filter engine did not load in the page'; }
  else if (items.length < plan.minItems) { r.status = 'skipped'; r.reason = `only ${items.length} post(s) loaded; login expired, bot check or an empty feed`; }
  else if (r.leaks > plan.maxLeaks || (visible.length && r.leaks / visible.length > plan.maxLeakShare)) { r.status = 'fail'; r.reason = `${r.leaks} visible post(s) look suggested or sponsored`; }
  else r.status = 'ok';
  results.push(r);
}
await browser.close();

mkdirSync(join(here, '../report'), { recursive: true });
writeFileSync(join(here, '../report/text.json'), JSON.stringify(results, null, 2));
for (const r of results) {
  const tag = r.status === 'ok' ? '✅' : r.status === 'skipped' ? '⏭' : '❌';
  const nums = r.posts === undefined ? '' : ` posts=${r.posts} hidden=${r.hidden} visible=${r.visible} leaks=${r.leaks} (still labelled ${r.labelled}, follow button ${r.follow}, ad-shaped ${r.ad})`;
  console.log(`${tag} ${r.platform}.text${nums}${r.reason ? ' — ' + r.reason : ''}`);
}
if (results.some((r) => r.status === 'fail')) {
  console.error('\nText-based hides are letting suggested or sponsored posts through.');
  process.exit(1);
}
