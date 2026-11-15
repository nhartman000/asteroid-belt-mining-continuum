# Operation Cosmoform demo v3 composer: clips -> xfade chain -> grade/vignette -> captions -> VO + ducked Stage 1 music.
import json,subprocess,os
from PIL import Image,ImageDraw,ImageFont,ImageFilter
os.chdir('/workspace/video3');os.makedirs('comp',exist_ok=True)
FPS=30;W,H=1080,1920
def sh(c):print('>',c[:160]);subprocess.run(c,shell=True,check=True)
# timeline: (clip, source dir/file, source start s, kenburns zoom end)
CL=[('title','frames/title',0.2,1.07),('studio','/workspace/video2/frames/studio',0.3,1.12),('swarm','frames/swarm',0.0,None),
    ('factory','frames/factory',0.55,None),('ship','frames/ship',0.1,None),('flyA','frames/flyA',0.0,None),('flyB','frames/flyB',0.0,None),
    ('cartoon','cartoon.mp4',0.0,None),('deepship','frames/deepship',0.1,None),('end','frames/end',0.0,None)]
B=[2.4,5.0,7.3,9.5,12.9,14.7,16.9,22.4,25.4];END=29.5
D=[0.4,0.35,0.15,0.3,0.4,0.35,0.4,0.3,0.6]
T=['zoomin','fadewhite','fade','hblur','zoomin','dissolve','zoomin','hblur','fade']
bnd=[0]+B+[END];dd=[0]+D+[0]
for i,(n,src,s0,kb) in enumerate(CL):
    L=(bnd[i+1]+dd[i+1]/2)-(bnd[i]-dd[i]/2);L=round(L,3)
    vf=f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}'
    if kb:vf=f"scale=w='trunc({W}*(1+{kb-1}*t/{L})/2)*2':h=-2:eval=frame,crop={W}:{H},setsar=1"
    if src.endswith('.mp4'):inp=f'-ss {s0} -i {src}'
    else:inp=f'-framerate {FPS} -start_number {int(s0*FPS)} -i {src}/%04d.jpg'
    sh(f'ffmpeg -y -loglevel error {inp} -t {L} -vf "{vf},fps={FPS},format=yuv420p" -an -c:v libx264 -crf 14 -preset fast comp/{i:02d}.mp4')
    print(n,'len',L)
# xfade chain
ins=' '.join(f'-i comp/{i:02d}.mp4' for i in range(len(CL)));fc=[];prev='[0:v]'
for i in range(len(B)):
    off=round(B[i]-D[i]/2,3);out=f'[x{i}]';fc.append(f'{prev}[{i+1}:v]xfade=transition={T[i]}:duration={D[i]}:offset={off}{out}');prev=out
grade="eq=contrast=1.07:saturation=1.14:brightness=0.005,colorbalance=bs=0.05:bm=0.02:rh=0.04:gh=0.01,vignette=angle=PI/4.6"
fc.append(f'{prev}{grade},format=yuv420p[v]')
sh(f'ffmpeg -y -loglevel error {ins} -filter_complex "{";".join(fc)}" -map "[v]" -c:v libx264 -crf 14 -preset fast comp/graded.mp4')
# captions = exact VO script
S=json.load(open('script.json'));ST=[0.5,5.3,9.8,13.6,17.4]
VD=[float(subprocess.check_output(f'ffprobe -v error -show_entries format=duration -of csv=p=0 vo/{i}.wav',shell=True)) for i in range(5)]
FONT='/usr/share/fonts/truetype/sand-box/google/Exo 2/Exo2-VariableFont_wght.ttf';f=ImageFont.truetype(FONT,64)
try:f.set_variation_by_name('ExtraBold')
except Exception:pass
def wrap(t,d):
    out=[];cur=''
    for w in t.split():
        tt=(cur+' '+w).strip()
        if d.textlength(tt,font=f)<=920:cur=tt
        else:out.append(cur);cur=w
    out.append(cur);return out
for i,s in enumerate(S):
    im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im);lines=wrap(s['cap'],d);lh=80;th=lh*len(lines);y0=H-200-th
    d.rounded_rectangle((40,y0-34,W-40,y0+th+28),radius=34,fill=(2,8,22,195),outline=(62,240,255,170),width=4)
    g=Image.new('RGBA',(W,H),(0,0,0,0));gd=ImageDraw.Draw(g)
    for k,l in enumerate(lines):gd.text(((W-d.textlength(l,font=f))/2,y0+k*lh),l,font=f,fill=(62,240,255,255))
    im=Image.alpha_composite(im,g.filter(ImageFilter.GaussianBlur(9)));d=ImageDraw.Draw(im)
    for k,l in enumerate(lines):d.text(((W-d.textlength(l,font=f))/2,y0+k*lh),l,font=f,fill=(255,255,255,255),stroke_width=3,stroke_fill=(0,10,25,255))
    im.save(f'comp/cap{i}.png')
win=[]
for i in range(5):
    a=ST[i]-0.08;b=ST[i]+VD[i]+0.45
    if i<4:b=min(b,ST[i+1]-0.1)
    win.append((round(a,2),round(b,2)))
json.dump({'starts':ST,'vo_dur':VD,'caption_windows':win},open('comp/timing.json','w'),indent=1);print('captions',win)
ci=' '.join(f'-i comp/cap{i}.png' for i in range(5));fc=[];prev='[0:v]'
for i,(a,b) in enumerate(win):
    o=f'[c{i}]';fc.append(f"{prev}[{i+1}:v]overlay=0:0:enable='between(t,{a},{b})'{o}");prev=o
# audio: VO placed at starts, Stage 1 'calm' music ducked under it
vin=' '.join(f'-i vo/{i}.wav' for i in range(5));n=6
for i in range(5):fc.append(f'[{n+i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(ST[i]*1000)}|{int(ST[i]*1000)},apad[v{i}]')
fc.append(''.join(f'[v{i}]' for i in range(5))+'amix=inputs=5:normalize=0:duration=longest,atrim=0:29.5,volume=1.0[vo]')
fc.append('[vo]asplit=2[vo1][vosc]')
fc.append(f'[{n+5}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:29.5,volume=0.55,afade=t=in:d=0.6,afade=t=out:st=27.6:d=1.9[mu]')
fc.append('[mu][vosc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350:makeup=1[duck]')
fc.append('[duck][vo1]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]')
sh(f'ffmpeg -y -loglevel error -i comp/graded.mp4 {ci} {vin} -i /workspace/video2/music.wav -filter_complex "{";".join(fc)}" -map "{prev}" -map "[a]" -t 29.5 -c:v libx264 -crf 25 -maxrate 5M -bufsize 10M -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k operation-cosmoform-demo.mp4')
