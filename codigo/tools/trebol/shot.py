import sys, asyncio
from playwright.async_api import async_playwright
# usage: shot.py url outprefix WxH frac1,frac2,... [selector-for-range]
async def main():
    url, out, size, fracs = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    w,h = map(int,size.split('x'))
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--allow-file-access-from-files'])
        pg = await b.new_page(viewport={'width':w,'height':h}, device_scale_factor=1)
        logs=[]
        pg.on('console', lambda m: logs.append(m.text))
        pg.on('pageerror', lambda e: logs.append('ERR '+str(e)))
        await pg.goto(url); await pg.wait_for_timeout(800)
        for f in fracs.split(','):
            if f.startswith('px'):
                y=float(f[2:])
            else:
                y = await pg.evaluate(f"(()=>{{const s=document.querySelector('.trb'); if(!s) return document.documentElement.scrollHeight*{f}; const r=s.getBoundingClientRect(); const top=r.top+scrollY; return top + (s.offsetHeight-innerHeight)*{f};}})()")
            await pg.evaluate(f"window.scrollTo(0,{y})")
            await pg.wait_for_timeout(900)
            await pg.screenshot(path=f"{out}-{f}.png")
        print('\n'.join(logs[:20]))
        await b.close()
asyncio.run(main())
