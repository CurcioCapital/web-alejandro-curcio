import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        # reduced motion
        pg=await b.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce')
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/trebol-work/proto/index.html'); await pg.wait_for_timeout(500)
        print('RM live?', await pg.evaluate("document.querySelector('.trb').classList.contains('is-live')"), 'h', await pg.evaluate("document.querySelector('.trb').offsetHeight"))
        await pg.evaluate("document.querySelector('.trb').scrollIntoView()"); await pg.wait_for_timeout(300)
        await pg.screenshot(path='../shots/rm-desktop.png')
        await pg.evaluate("window.scrollBy(0,2500)"); await pg.wait_for_timeout(300)
        await pg.screenshot(path='../shots/rm-desktop2.png')
        # live: skip link + errors + text in DOM
        pg2=await b.new_page(viewport={'width':1440,'height':900})
        pg2.on('pageerror',lambda e:errs.append(str(e)))
        await pg2.goto('file:///home/claude/trebol-work/proto/index.html'); await pg2.wait_for_timeout(500)
        await pg2.evaluate("window.scrollTo(0, document.querySelector('.trb').offsetTop+300)"); await pg2.wait_for_timeout(400)
        await pg2.click('.trb-skip'); await pg2.wait_for_timeout(900)
        print('after skip y', await pg2.evaluate("scrollY"), 'final?', await pg2.evaluate("document.querySelector('.trb').classList.contains('is-final')"), 'focus', await pg2.evaluate("document.activeElement.id"))
        await pg2.screenshot(path='../shots/skip.png')
        txt=await pg2.evaluate("document.querySelector('.trb-reel').innerText.length")
        print('reel text chars',txt, 'info', await pg2.evaluate("window.__trbInfo"))
        # scroll through to end, measure frame times
        t=await pg2.evaluate("""async()=>{const s=document.querySelector('.trb');let y=s.offsetTop-900, end=s.offsetTop+s.offsetHeight; let worst=0, n=0; let last=performance.now();
          while(y<end){window.scrollTo(0,y); await new Promise(r=>requestAnimationFrame(r)); const now=performance.now(); worst=Math.max(worst,now-last); last=now; y+=60; n++;} return {n,worst};}""")
        print('scroll sweep', t)
        print('errors', errs)
        await b.close()
asyncio.run(main())
