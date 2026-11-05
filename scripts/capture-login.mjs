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
// Or --tokens: paste the session cookies from a browser you are already logged in on (X blocks
// logins made inside an automated browser). Input is hidden and never echoed.
const useTokens = process.argv.includes('--tokens');
const TOKENS = { x: { domain: '.x.com', names: ['auth_token', 'ct0'], lengths: { auth_token: 40, ct0: 160 } } };
const rules = JSON.parse(readFileSync(join(here, '../rules.json'), 'utf8'));
const p = rules.platforms[platform];
if (!p) { console.error('unknown platform; one of', Object.keys(rules.platforms).join(', ')); process.exit(1); }

if (useTokens) {
  const spec = TOKENS[platform];
  if (!spec) { console.error(`--tokens is set up for: ${Object.keys(TOKENS).join(', ')}`); process.exit(1); }
  console.log(`In Chrome, open ${p.home}, press Cmd-Option-I, choose Application > Cookies > https://x.com, and copy each value below.`);
  // Hidden line reader: raw mode on a TTY so nothing is echoed; leftover characters carry over to the next prompt.
  const pending = []; let buf = ''; const waiters = [];
  process.stdin.setRawMode?.(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    for (const ch of chunk) {
      if (ch === '\u0003') process.exit(1);
      if (ch === '\r' || ch === '\n') { pending.push(buf); buf = ''; if (waiters.length) waiters.shift()(pending.shift()); continue; }
      if (ch === '\u007f') { buf = buf.slice(0, -1); continue; }
      buf += ch;
    }
  });
  process.stdin.on('end', () => { if (buf) pending.push(buf); while (waiters.length) waiters.shift()(pending.shift() || ''); });
  const ask = (name) => new Promise((resolve) => {
    process.stdout.write(`${name}: `);
    const done = (v) => { process.stdout.write('\n'); resolve((v || '').trim()); };
    if (pending.length) done(pending.shift()); else waiters.push(done);
  });
  const cookies = [];
  for (const name of spec.names) {
    let value = await ask(name);
    if (!value) { console.error(`${name} is required`); process.exit(1); }
    // Some terminals deliver a paste more than once; a known-length token is cut back to one copy.
    const want = spec.lengths && spec.lengths[name];
    if (want && value.length > want) { console.log(`${name}: got ${value.length} characters, keeping the first ${want}`); value = value.slice(0, want); }
    if (want && value.length < want) console.log(`${name}: expected ${want} characters, got ${value.length}; X may reject it`);
    cookies.push({ name, value, domain: spec.domain, path: '/', secure: true, httpOnly: name === 'auth_token', sameSite: 'None', expires: Math.floor(Date.now() / 1000) + 180 * 86400 });
  }
  mkdirSync(join(here, '../.state'), { recursive: true });
  const out = join(here, `../.state/${platform}.json`);
  writeFileSync(out, JSON.stringify({ cookies, origins: [] }, null, 1));
  process.stdin.setRawMode?.(false);
  console.log(`Saved ${cookies.length} cookies to ${out} (git-ignored). Nothing was sent anywhere.`);
  process.exit(0);
}

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
