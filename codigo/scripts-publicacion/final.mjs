import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const bad = [];
const B = process.env.BASE || 'http://localhost:4173/';  // BASE=http://localhost:PUERTO/ node final.mjs
const pages = ['index.html','historia/index.html','negocios/index.html','deportista/index.html','aventura/index.html','solidario/index.html','libros/index.html','capital-de-vida/index.html','ceo-de-tu-vida/index.html','prensa/index.html','seguime/index.html','preguntale/index.html'];
for (const vp of [{width:1440,height:900},{width:390,height:844}]) {
  const p = await b.newPage({viewport: vp});
  p.on('pageerror', e => bad.push('JS ' + p.url() + ' ' + e.message));
  p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  for (const r of pages) {
    await p.goto(B + r, {waitUntil: 'load'}); await p.waitForTimeout(1500);
    const ow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (ow > 1) bad.push('overflow ' + vp.width + ' ' + r + ' ' + ow);
    if (vp.width === 390 && r === 'index.html') await p.screenshot({path: 'f-mobile.png'});
  }
  await p.close();
}
const p = await b.newPage({viewport: {width:1440, height:900}});
await p.goto(B + 'index.html', {waitUntil: 'load'}); await p.waitForTimeout(4000);
await p.screenshot({path: 'f-hero.png'});
await p.mouse.move(640, 330);
for (let i = 0; i < 20; i++) { await p.mouse.move(640 + i*6, 330 + i*4); await p.waitForTimeout(16); }
await p.screenshot({path: 'f-hover.png'});
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(800);
const a = await p.$('footer a[href*="historia"]');
if (a) { await a.click(); await p.waitForLoadState('load'); await p.waitForTimeout(2500);
  console.log('historia scrollY', await p.evaluate(() => scrollY), p.url()); }
await p.goto(B + 'libros/index.html', {waitUntil: 'load'}); await p.waitForTimeout(1500);
const t = await p.$('#chispa button');
if (t) { await t.scrollIntoViewIfNeeded(); await t.click(); await p.waitForTimeout(1200); await p.screenshot({path: 'f-chispa.png'}); }
else console.log('no chispa trigger');
console.log(bad.join('\n') || 'no errors'); await b.close();
