#!/usr/bin/env node
// One-time: open a real WebKit window, let a human log in, then save the session for the nightly
// selector check.  Usage:  node scripts/capture-login.mjs instagram|youtube|x|reddit|linkedin
// The saved JSON goes to rules/.state/<platform>.json (git-ignored). Store it as the GitHub secret
// FEEDOFF_STATE_<PLATFORM>:   gh secret set FEEDOFF_STATE_INSTAGRAM -R peterishere1/feedoff < .state/instagram.json
import { webkit, devices } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const platform = process.argv[2];
// Alternative to a live login: --from-cookies <netscape cookies.txt exported from a browser>.
const ci = process.argv.indexOf('--from-cookies');
const cookieFile = ci !== -1 ? process.argv[ci + 1] : null;
const rules = JSON.parse(readFileSync(join(here, '../rules.json'), 'utf8'));
const p = rules.platforms[platform];
if (!p) { console.error('unknown platform; one of', Object.keys(rules.platforms).join(', ')); process.exit(1); }

if (cookieFile) {
  const lines = readFileSync(cookieFile, 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
  const cookies = lines.map((l) => {
    const [domain, , path, secure, expires, name, value] = l.split('\t');
    return { name, value, domain, path, secure: secure === 'TRUE', expires: Number(expires) || -1, httpOnly: false, sameSite: 'Lax' };
  }).filter((c) => c.name && c.value);
  mkdirSync(join(here, '../.state'), { recursive: true });
  const out = join(here, `../.state/${platform}.json`);
  writeFileSync(out, JSON.stringify({ cookies, origins: [] }, null, 1));
  console.log(`Saved ${cookies.length} cookies to ${out}\nNow: cd ~/feedoff && gh secret set FEEDOFF_STATE_${platform.toUpperCase()} -R peterishere1/feedoff-rules < rules/.state/${platform}.json`);
  process.exit(0);
}

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
console.log(`Saved ${out}\nNow: cd ~/feedoff && gh secret set FEEDOFF_STATE_${platform.toUpperCase()} -R peterishere1/feedoff < rules/.state/${platform}.json`);
process.exit(0);
