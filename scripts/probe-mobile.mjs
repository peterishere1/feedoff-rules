#!/usr/bin/env node
// Mobile DOM probe for the iPhone rules (WebKit, iPhone profile). Structure only: prints
// attribute/tag counts and short UI headings, never post text, names or screenshots.
// Usage: node scripts/probe-mobile.mjs <url> [selector ...]   (session read from .state/<platform>.json)
import { webkit, devices } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const [url, ...sels] = process.argv.slice(2);
const id = ['instagram', 'youtube', 'x', 'reddit', 'linkedin', 'facebook'].find((p) => new URL(url).hostname.includes(p === 'x' ? 'x.com' : p));
const stateFile = join(here, `../.state/${id}.json`);
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 14'], locale: process.env.LOCALE || 'en-US', storageState: existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : undefined });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((e) => console.error('goto:', e.message));
await page.waitForTimeout(Number(process.env.WAIT || 6000));
for (let i = 0; i < Number(process.env.SCROLLS || 0); i++) { await page.evaluate(() => { window.scrollBy(0, 2500); document.querySelectorAll("main, main *").forEach((e) => { if (e.scrollHeight > e.clientHeight + 200) e.scrollTop += 2500; }); }); await page.waitForTimeout(1500); }
const out = await page.evaluate((sels) => {
  const r = { url: location.pathname + location.search.slice(0, 40), counts: {} };
  for (const s of sels) { try { r.counts[s] = document.querySelectorAll(s).length; } catch (e) { r.counts[s] = 'INVALID'; } }
  const tally = (attr) => { const o = {}; document.querySelectorAll('[' + attr + ']').forEach((e) => { const t = e.getAttribute(attr); if (t.length < 60 && !/\d{5,}/.test(t)) o[t] = (o[t] || 0) + 1; }); return o; };
  r.viewNames = tally('data-view-name'); r.testids = tally('data-testid'); r.componentKeys = tally('componentkey');
  r.roles = tally('role');
  const sig = (e) => e.tagName.toLowerCase() + (e.id && e.id.length < 30 ? '#' + e.id : '') + (e.getAttribute('data-view-name') ? '[dvn=' + e.getAttribute('data-view-name') + ']' : '') + (e.getAttribute('role') ? '[role=' + e.getAttribute('role') + ']' : '');
  const chain = (e) => { const a = []; for (let n = e; n && n !== document.body && a.length < 7; n = n.parentElement) a.push(sig(n) + '(' + n.children.length + ')'); return a.join(' < '); };
  r.headings = [];
  document.querySelectorAll('h1,h2,h3,h4,[role=heading]').forEach((h) => { const t = (h.textContent || '').trim().replace(/\s+/g, ' '); if (t && t.length < 70 && !h.closest('[role=listitem], article, li')) r.headings.push(t + '  ::  ' + chain(h)); });
  r.headings = r.headings.slice(0, 60);
  r.landmarks = [...document.querySelectorAll('main,section,nav,aside,header,footer,[role=main],[role=region],[role=list]')].slice(0, 60).map((e) => sig(e) + (e.getAttribute('aria-label') ? '{' + e.getAttribute('aria-label').slice(0, 40) + '}' : '') + ' kids=' + e.children.length + ' textLen=' + (e.textContent || '').length);
  r.classSample = [...new Set([...document.querySelectorAll('main *, body > div *')].slice(0, 400).flatMap((e) => [...e.classList]))].filter((c) => /^[a-z][a-z-]+(__[a-z-]+)?(--[a-z-]+)?$/.test(c)).slice(0, 80);
  return r;
}, sels);
console.log(JSON.stringify(out, null, 1));
await browser.close();
