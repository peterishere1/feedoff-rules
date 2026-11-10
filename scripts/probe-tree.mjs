#!/usr/bin/env node
// Mobile DOM outline (WebKit, iPhone profile). Structure only: tags, stable attributes, child
// counts and short UI headings. Never post text, names or screenshots.
// Usage: node scripts/probe-tree.mjs <url> [rootSelector] [depth]
import { webkit, devices } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const [url, root = 'main', depth = '7'] = process.argv.slice(2);
const id = ['instagram', 'youtube', 'x', 'reddit', 'linkedin', 'facebook'].find((p) => new URL(url).hostname.includes(p === 'x' ? 'x.com' : p));
const stateFile = join(here, `../.state/${id}.json`);
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 14'], locale: process.env.LOCALE || 'en-US', storageState: existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : undefined });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((e) => console.error('goto:', e.message));
await page.waitForTimeout(Number(process.env.WAIT || 6000));
for (let i = 0; i < Number(process.env.SCROLLS || 0); i++) { await page.evaluate(() => { window.scrollBy(0, 2500); document.querySelectorAll("main, main *").forEach((e) => { if (e.scrollHeight > e.clientHeight + 200) e.scrollTop += 2500; }); }); await page.waitForTimeout(1500); }
const out = await page.evaluate(({ root, depth }) => {
  const lines = [location.pathname];
  const named = (v) => v && v.length < 60 && !/[0-9a-f]{8}-[0-9a-f]{4}/.test(v);
  const sig = (e) => {
    let s = e.tagName.toLowerCase();
    if (e.id && named(e.id)) s += '#' + e.id;
    for (const a of ['componentkey', 'data-view-name', 'data-testid', 'role', 'aria-label', 'data-id', 'data-urn', 'href']) {
      const v = e.getAttribute(a); if (!v) continue;
      if (a === 'href') { s += '[href=' + v.replace(/[?#].*/, '').replace(/[0-9A-Za-z_-]{12,}/g, '…').slice(0, 40) + ']'; continue; }
      // Labels inside list items / posts can carry people's names: report presence only.
      if (a === 'aria-label' && (e.closest('[role=listitem], article, li') || v.split(/\s+/).length > 4)) { s += '[aria-label]'; continue; }
      if (named(v)) s += '[' + a + '=' + v.slice(0, 50) + ']';
      else s += '[' + a + ']';
    }
    return s;
  };
  const walk = (e, d) => {
    if (d > depth) return;
    const kids = [...e.children];
    let label = '';
    if (/^H[1-4]$/.test(e.tagName) || e.getAttribute('role') === 'heading') { const t = (e.textContent || '').trim().replace(/\s+/g, ' '); if (t.length < 70 && !e.closest('[role=listitem], article, li')) label = '  "' + t + '"'; }
    lines.push('  '.repeat(d) + sig(e) + ' (' + kids.length + ')' + label);
    // Collapse runs of same-signature siblings.
    let prev = '', run = 0;
    for (const k of kids) {
      const s = sig(k) + k.children.length;
      if (s === prev) { run++; continue; }
      if (run) lines.push('  '.repeat(d + 1) + '… +' + run + ' similar'); run = 0; prev = s;
      walk(k, d + 1);
    }
    if (run) lines.push('  '.repeat(d + 1) + '… +' + run + ' similar');
  };
  const el = document.querySelector(root);
  if (!el) return ['no ' + root + ' on ' + location.pathname + ' title-len ' + document.title.length];
  walk(el, 0);
  return lines;
}, { root, depth: Number(depth) });
console.log(out.join('\n'));
await browser.close();
