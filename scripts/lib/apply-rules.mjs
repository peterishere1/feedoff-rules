// Apply FeedOff to a Playwright context the way the app does: the filter engine and the platform's
// behaviours run at document start on every page, with every default-on toggle enabled.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export function payloadFor(platform, overrides = {}) {
  const enabled = [], css = [], textRules = [];
  for (const [tid, t] of Object.entries(platform.toggles)) {
    const on = tid in overrides ? overrides[tid] : t.default;
    if (!on) continue;
    enabled.push(tid);
    css.push(...(t.css || []));
    textRules.push(...(t.hideIfText || []));
  }
  return {
    enabled,
    css: css.map((s) => s + '{display:none !important;}').join('\n'),
    textRules,
    redirects: (platform.redirects || []).filter((r) => !r.toggle || enabled.includes(r.toggle)),
    allow: platform.allow || [],
    home: platform.home,
  };
}

export async function applyFeedOff(context, rules, platformId, overrides = {}) {
  const platform = rules.platforms[platformId];
  const runtime = readFileSync(join(here, 'runtime.js'), 'utf8');
  const payload = payloadFor(platform, overrides);
  const src = (names) => (names || []).map((n) => `try{${rules.jsLibrary[n]}\n}catch(e){console.warn('feedoff behaviour ${n}', e)}`).join('\n');
  await context.addInitScript({
    content: `(function boot(){
      if (!document.documentElement) { document.addEventListener('readystatechange', boot, { once: true }); return; }
      if (window.__feedoff) return;
      ${runtime}
      window.__feedoff.apply(${JSON.stringify(payload)});
      ${src(platform.jsAtStart)}
      var later = function () { ${src(platform.js)} };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later); else later();
    })();`,
  });
  return payload;
}
