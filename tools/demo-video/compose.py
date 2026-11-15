# Composite real gameplay clips + synced voiceover captions into numbered frames.
import json,os
from PIL import Image,ImageDraw,ImageFont,ImageFilter
FPS=30
SEG=[('title',0,81),('tap',3,30),('hold',0,30),('zoom',4,30),('studio',10,97),('mix',10,104),('launch',6,36),('solar',30,36),('factory',0,102),('ship',15,87),('panels',20,36),('he3',25,51),('end',0,165)]
L=json.load(open('script.json'));STARTS=[1.6,5.7,11.0,14.8,18.25,21.15]
DUR=[3.809,5.080,3.421,3.178,2.599,2.070]
FONT='/usr/share/fonts/truetype/sand-box/google/Exo 2/Exo2-VariableFont_wght.ttf'
f=ImageFont.truetype(FONT,66)
try:f.set_variation_by_name('ExtraBold')
except Exception as e:print('var',e,f.get_variation_names())
def wrap(t,maxw,d):
    out=[];cur=''
    for w in t.split():
        test=(cur+' '+w).strip()
        if d.textlength(test,font=f)<=maxw:cur=test
        else:out.append(cur);cur=w
    out.append(cur);return out
cache={}
def capimg(i):
    if i in cache:return cache[i]
    W,H=1080,1920;im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im)
    lines=wrap(L[i]['cap'],940,d);lh=82;th=lh*len(lines);y0=H-170-th
    box=Image.new('RGBA',(W,H),(0,0,0,0));bd=ImageDraw.Draw(box)
    bd.rounded_rectangle((40,y0-36,W-40,y0+th+30),radius=34,fill=(2,8,22,200),outline=(62,240,255,170),width=4)
    im=Image.alpha_composite(im,box);d=ImageDraw.Draw(im)
    glow=Image.new('RGBA',(W,H),(0,0,0,0));gd=ImageDraw.Draw(glow)
    for k,l in enumerate(lines):
        tw=d.textlength(l,font=f);gd.text(((W-tw)/2,y0+k*lh),l,font=f,fill=(62,240,255,255))
    glow=glow.filter(ImageFilter.GaussianBlur(9));im=Image.alpha_composite(im,glow);d=ImageDraw.Draw(im)
    for k,l in enumerate(lines):
        tw=d.textlength(l,font=f);d.text(((W-tw)/2,y0+k*lh),l,font=f,fill=(255,255,255,255),stroke_width=3,stroke_fill=(0,10,25,255))
    cache[i]=im;return im
def capAt(t):
    for i in range(len(L)-1,-1,-1):
        end=STARTS[i+1]-0.05 if i+1<len(L) else STARTS[i]+DUR[i]+0.6
        if STARTS[i]-0.08<=t<end:return i
    return None
os.makedirs('out',exist_ok=True);n=0;changes=[];last=-2
for clip,s0,cnt in SEG:
    for k in range(cnt):
        t=n/FPS;im=Image.open(f'frames/{clip}/{s0+k:04d}.jpg').convert('RGBA')
        ci=capAt(t)
        if ci!=last:changes.append((round(t,2),n,ci,clip));last=ci
        if ci is not None:im=Image.alpha_composite(im,capimg(ci))
        im.convert('RGB').save(f'out/{n:05d}.jpg',quality=93);n+=1
print('frames',n,n/FPS);print(changes)
json.dump(changes,open('changes.json','w'))
