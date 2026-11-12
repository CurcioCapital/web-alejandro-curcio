import cv2, numpy as np, json, networkx as nx
from skimage.morphology import skeletonize
S=4
im=None
a=cv2.imread('/home/claude/trebol-work/hq/alpha1024.png',0)
a=cv2.GaussianBlur(a,(3,3),0)
m=(a>127).astype(np.uint8)
n,l,st,cen=cv2.connectedComponentsWithStats(m)
H,W=m.shape; yy,xx=np.mgrid[0:H,0:W]/S
comp={}
for i in range(1,n):
    cx,cy=cen[i]/S
    if cx>150: comp['TR']=(l==i)
    elif cy>150: comp['BL']=(l==i)
    else: pink=(l==i)
tlreg=((xx<128)&(yy<124))|(yy<95)
comp['TL']=pink&tlreg
comp['BR']=pink&~tlreg
dist=cv2.distanceTransform(m,cv2.DIST_L2,5)
out={}
def fmt(pts): return ' L'.join(f'{x:.1f} {y:.1f}' for x,y in pts)
for k in ['TL','TR','BR','BL']:
    mk=comp[k].astype(np.uint8)
    mkd=(cv2.dilate(mk,np.ones((5,5),np.uint8))&m)
    cs,_=cv2.findContours(mkd,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    fill=' '.join('M'+fmt(cv2.approxPolyDP(c,0.8,True)[:,0,:]/S)+'Z' for c in cs if cv2.contourArea(c)>50)
    sk=skeletonize(mk>0)
    ys,xs=np.nonzero(sk)
    G=nx.Graph(); pts=set(zip(ys,xs))
    for y,x in pts:
        for dy in(-1,0,1):
            for dx in(-1,0,1):
                if (dy or dx) and (y+dy,x+dx) in pts: G.add_edge((y,x),(y+dy,x+dx),weight=(dy*dy+dx*dx)**.5)
    G=G.subgraph(max(nx.connected_components(G),key=len))
    # longest path approx: double BFS by weighted distance
    s0=next(iter(G.nodes)); d=nx.single_source_dijkstra_path_length(G,s0); u=max(d,key=d.get)
    d2,p2=nx.single_source_dijkstra(G,u); v=max(d2,key=d2.get); path=p2[v]
    P=np.array([(x/S,y/S) for y,x in path],float)
    # smooth
    k5=np.ones(9)/9
    Ps=np.stack([np.convolve(np.pad(P[:,i],4,mode='edge'),k5,'valid') for i in range(2)],1)
    Ps=cv2.approxPolyDP(Ps.astype(np.float32).reshape(-1,1,2),0.35,False)[:,0,:]
    if k=='BL': Ps=Ps[::-1]
    v0=Ps[0]-Ps[2]; v0=v0/np.linalg.norm(v0); v1=Ps[-1]-Ps[-3]; v1=v1/np.linalg.norm(v1)
    Ps=np.vstack([Ps[0]+v0*7,Ps,Ps[-1]+v1*7])
    wmax=float(dist[comp[k]].max())*2/S
    out[k]={'fill':fill,'center':'M'+fmt(Ps),'w':round(wmax,1),'start':Ps[0].tolist(),'end':Ps[-1].tolist(),'len':len(Ps)}
    print(k,out[k]['w'],out[k]['start'],out[k]['end'],len(Ps),len(fill))
cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
out['full']=' '.join('M'+fmt(cv2.approxPolyDP(c,0.8,True)[:,0,:]/S)+'Z' for c in cs if cv2.contourArea(c)>50)
json.dump(out,open('trebol-leaves.json','w'))
