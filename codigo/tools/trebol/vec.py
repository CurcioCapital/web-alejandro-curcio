import cv2, numpy as np, json
S=4
im=cv2.imread('/home/claude/web-alejandro-curcio/web/media/marca/trebol.png',cv2.IMREAD_UNCHANGED)
a=cv2.resize(im[:,:,3],(256*S,256*S),interpolation=cv2.INTER_CUBIC)
a=cv2.GaussianBlur(a,(5,5),0)
m=(a>127).astype(np.uint8)
ys,xs=np.nonzero(m); print('bbox',xs.min()/S,xs.max()/S,ys.min()/S,ys.max()/S)
C=[(80,62),(182,62),(72,165),(178,160)]  # TL TR BL BR (256 space)
H,W=m.shape
yy,xx=np.mgrid[0:H,0:W]/S
d=np.stack([(xx-cx)**2+(yy-cy)**2 for cx,cy in C])
lab=np.argmin(d,0)
vis=np.zeros((H,W,3),np.uint8)
cols=[(60,60,230),(60,200,60),(230,120,40),(40,200,220)]
paths=[]
for i in range(4):
    mi=((lab==i)&(m>0)).astype(np.uint8)
    vis[mi>0]=cols[i]
    cs,_=cv2.findContours(mi,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    ds=[]
    for c in cs:
        if cv2.contourArea(c)<20*S*S: continue
        c=cv2.approxPolyDP(c,0.6,True)[:,0,:]/S
        ds.append('M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in c)+'Z')
    paths.append(' '.join(ds))
# full outline too
cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
full=' '.join('M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in cv2.approxPolyDP(c,0.6,True)[:,0,:]/S)+'Z' for c in cs if cv2.contourArea(c)>20*S*S)
cv2.imwrite('/home/claude/trebol-work/shots/labels.png',cv2.resize(vis,(768,768)))
json.dump({'leaves':paths,'full':full},open('/home/claude/trebol-work/tools/trebol-paths.json','w'))
print([len(p) for p in paths], len(full))
