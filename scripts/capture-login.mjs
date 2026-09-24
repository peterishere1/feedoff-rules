#!/usr/bin/env node
// One-time: open a real WebKit window, let a human log in, then save the session for the nightly
// selector check.  Usage:  node scripts/capture-login.mjs instagram|youtube|x|reddit|linkedin
// The saved JSON goes to rules/.state/<platform>.json (git-ignored). Store it as the GitHub secret
// FEEDOFF_STATE_<PLATFORM>:   gh secret set FEEDOFF_STATE_INSTAGRAM < .state/instagram.json
import { webkit, devices } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const platform = process.argv[2];
const rules = JSON.parse(readFileSync(join(here, '../rules.json'), 'utf8'));
const p = rules.platforms[platform];
if (!p) { console.error('unknown platform; one of', Object.keys(rules.platforms).join(', ')); process.exit(1); }

const b = await webkit.launch({ headless: false });
const ctx = await b.newContext({ ...devices['iPhone 14'] });
const page = await ctx.newPage();
await page.goto(p.home);
console.log(`\nLog in to ${p.name} in the window that just opened.`);
console.log('When you can see your own feed / inbox, come back here and press Enter.');
process.stdin.setRawMode?.(false);
await new Promise((r) => process.stdin.once('data', r));
mkdirSync(join(here, '../.state'), { recursive: true });
const out = join(here, `../.state/${platform}.json`);
await ctx.storageState({ path: out });
await b.close();
console.log(`Saved ${out}\nNow: gh secret set FEEDOFF_STATE_${platform.toUpperCase()} < rules/.state/${platform}.json`);
process.exit(0);
