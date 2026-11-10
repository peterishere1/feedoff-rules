// Print the ancestor chain (tag, role, child count, height) for the first match of each selector. Structure only.
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
const [url, plat, ...sels] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--headless=new'], headless: false });
const sf = `.state/${plat}.json`;
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', storageState: existsSync(sf) ? JSON.parse(readFileSync(sf, 'utf8')) : undefined });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((e) => console.log('goto', e.message.split('\n')[0]));
await page.waitForTimeout(Number(process.env.WAIT || 8000));
for (let i = 0; i < Number(process.env.SCROLLS || 0); i++) { await page.mouse.wheel(0, 3000); await page.waitForTimeout(1500); }
const out = await page.evaluate((sels) => sels.map((s) => {
  let els; try { els = [...document.querySelectorAll(s)]; } catch (e) { return s + ' INVALID'; }
  if (!els.length) return s + ' → 0';
  const chain = []; for (let n = els[0]; n && n !== document.documentElement && chain.length < 14; n = n.parentElement) { const b = n.getBoundingClientRect(); chain.push(n.tagName.toLowerCase() + (n.id && n.id.length < 25 && !/\d{4,}|^_|^:/.test(n.id) ? '#' + n.id : '') + ['role', 'data-testid', 'data-pagelet', 'aria-label', 'componentkey', 'data-view-name'].map((a) => { const v = n.getAttribute(a); return v && v.length < 45 && !/[0-9a-f]{8}-/.test(v) ? '[' + a + '=' + v + ']' : ''; }).join('') + '(' + n.children.length + ' ' + Math.round(b.width) + 'x' + Math.round(b.height) + ')'); }
  return s + ' → ' + els.length + '\n     ' + chain.join('\n   < ');
}), sels);
console.log(page.url().replace(/\?.*/, '')); out.forEach((o) => console.log(o));
await browser.close();
