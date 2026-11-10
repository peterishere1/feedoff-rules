#!/usr/bin/env node
// Load the built Chrome extension in Chromium and check what it hides on each desktop site.
// Structure only: counts of visible/hidden elements, no screenshots, no page text.
// Usage (from rules/): FEEDOFF_STATE_YOUTUBE=... node scripts/check-extension.mjs [platform]
import { chromium } from 'playwright';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ext = join(here, '../../extension');
const rules = JSON.parse(readFileSync(join(here, '../desktop.json'), 'utf8'));
const only = process.argv[2];

const PLAN = {
  youtube: [
    { url: 'https://www.youtube.com/', expectRedirect: '/feed/subscriptions' },
    { url: 'https://www.youtube.com/shorts/', expectRedirect: '/feed/subscriptions' },
    { url: 'https://www.youtube.com/results?search_query=cooking', toggles: ['shorts', 'ads'] },
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', toggles: ['ads'], visible: ['ytd-comments#comments', '#secondary ytd-watch-next-secondary-results-renderer'] },
  ],
  x: [
    { url: 'https://x.com/home', toggles: ['trending', 'extras'], ready: "[data-testid='primaryColumn']" },
    { url: 'https://x.com/explore', toggles: ['trending'], ready: "[data-testid='primaryColumn']" },
  ],
  reddit: [
    { url: 'https://www.reddit.com/', toggles: ['homefeed', 'ads', 'recommended'], ready: 'shreddit-feed', note: 'shreddit-feed' },
    { url: 'https://www.reddit.com/r/popular/', expectRedirect: '/' },
    { url: 'https://www.reddit.com/r/AskCulinary/', toggles: ['ads'], ready: 'shreddit-post', visible: ['shreddit-feed shreddit-post'] },
  ],
  instagram: [
    { url: 'https://www.instagram.com/', toggles: ['reels', 'explore', 'suggested'], ready: 'article', visible: ['main article'], login: true },
    { url: 'https://www.instagram.com/reels/', expectRedirect: '/', login: true },
    { url: 'https://www.instagram.com/explore/', toggles: ['explore'], ready: 'main input', visible: ['main input'], login: true },
  ],
  linkedin: [
    { url: 'https://www.linkedin.com/feed/', toggles: ['homefeed', 'news', 'ads'], ready: "[data-testid='mainFeed']", visible: ["[componentkey='shareboxProfilePictureComponentRef']"], login: true },
    { url: 'https://www.linkedin.com/mynetwork/grow/', toggles: ['pymk'], ready: "[data-testid='lazy-column']", visible: ["[componentkey='pending-invitations-preview'] button"], login: true },
  ],
  facebook: [
    { url: 'https://www.facebook.com/', toggles: ['homefeed', 'reels'], ready: "[role='main'] h3", visible: ["[role='main'] [role='region']"], note: "[role='main'] div:has(> h3:first-child + div)", login: true },
    { url: 'https://www.facebook.com/reel/', expectRedirect: '/', login: true },
  ],
};

const userDir = mkdtempSync(join(tmpdir(), 'feedoff-ext-'));
const ctx = await chromium.launchPersistentContext(userDir, {
  headless: false,
  args: ['--headless=new', `--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  viewport: { width: 1440, height: 900 }, locale: 'en-US',
  // X answers the HeadlessChrome user agent with an error page; present as ordinary desktop Chrome.
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
});
let failed = 0;
for (const [id, steps] of Object.entries(PLAN)) {
  if (only && only !== id) continue;
  const stateEnv = process.env[`FEEDOFF_STATE_${id.toUpperCase()}`];
  if (!stateEnv && steps.some((s) => s.login)) { console.log(`skip ${id} no login state provided`); continue; }
  if (stateEnv) await ctx.addCookies(JSON.parse(stateEnv).cookies.map((c) => ({ ...c, sameSite: ['Strict', 'Lax', 'None'].includes(c.sameSite) ? c.sameSite : 'Lax' })));
  for (const step of steps) {
    const page = await ctx.newPage();
    try {
      await page.goto(step.url, { waitUntil: 'domcontentloaded' });
      if (step.ready) await page.waitForSelector(step.ready, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(6000);
      const path = new URL(page.url()).pathname;
      if (step.expectRedirect) {
        const ok = path === step.expectRedirect;
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${id} ${step.url} -> ${path}`); if (!ok) failed++;
        continue;
      }
      const r = await page.evaluate(({ toggles, visible, note, plat }) => {
        const vis = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(el).display !== 'none'; };
        const out = { style: !!document.getElementById('__feedoff_style'), runtime: !!window.__feedoff, toggles: {}, visible: {} };
        for (const t of toggles) {
          const sels = plat.toggles[t].css;
          let matched = 0, stillVisible = 0;
          for (const s of sels) { let els = []; try { els = [...document.querySelectorAll(s)]; } catch (e) {} matched += els.length; stillVisible += els.filter(vis).length; }
          out.toggles[t] = { matched, stillVisible, hiddenByText: document.querySelectorAll('[data-feedoff-hidden]').length };
        }
        for (const s of visible || []) { const el = document.querySelector(s); out.visible[s] = el ? vis(el) : null; }
        // `note`: the element that should carry the "feed hidden" note in place of the feed.
        if (note) { const el = document.querySelector(note); out.note = !!el && el.getAttribute('data-feedoff-hidden') === 'end' && el.getBoundingClientRect().height <= 130; }
        out.classes = document.documentElement.className.split(/\s+/).filter((c) => c.indexOf('feedoff') === 0);
        return out;
      }, { toggles: step.toggles || [], visible: step.visible, note: step.note, plat: rules.platforms[id] });
      let bad = !r.style || Object.values(r.toggles).some((t) => t.stillVisible > 0) || Object.values(r.visible).some((v) => !v) || r.note === false;
      console.log(`${bad ? 'FAIL' : 'ok  '} ${id} ${step.url}`, JSON.stringify(r)); if (bad) failed++;
    } catch (e) { console.log(`FAIL ${id} ${step.url} ${e.message}`); failed++; }
    finally { await page.close(); }
  }
}
await ctx.close();
rmSync(userDir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
