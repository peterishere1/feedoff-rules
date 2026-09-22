#!/usr/bin/env node
// Assemble rules/rules.json from rules/src/rules.base.json + rules/src/js/*.js
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const base = JSON.parse(readFileSync(join(here, 'src/rules.base.json'), 'utf8'));
const jsDir = join(here, 'src/js');
const jsLibrary = {};
for (const f of readdirSync(jsDir).filter((f) => f.endsWith('.js')).sort()) {
  jsLibrary[basename(f, '.js')] = readFileSync(join(jsDir, f), 'utf8');
}
// Every js behaviour referenced by a platform must exist.
for (const [id, p] of Object.entries(base.platforms)) {
  for (const name of p.js || []) {
    if (!jsLibrary[name]) throw new Error(`${id} references missing js behaviour "${name}"`);
  }
  for (const [tid, t] of Object.entries(p.toggles || {})) {
    if (typeof t.label !== 'string' || typeof t.default !== 'boolean') throw new Error(`${id}.${tid}: label/default required`);
  }
  for (const r of p.redirects || []) {
    new RegExp(r.match); // throws on invalid regex
    if (r.toggle && !p.toggles[r.toggle]) throw new Error(`${id}: redirect toggle "${r.toggle}" is not a toggle`);
  }
}
const out = { ...base, jsLibrary };
writeFileSync(join(here, 'rules.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`rules.json v${out.version}: ${Object.keys(out.platforms).length} platforms, ${Object.keys(jsLibrary).length} js behaviours`);
