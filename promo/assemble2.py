# Cut 2: timeline driven by the real voiceover (vo/voice_clean.wav) and its transcript chunks.
import json, subprocess, os
FPS = 30; AUDIO_SHIFT = -0.5   # video_t = audio_t + AUDIO_SHIFT (speech starts at 1.0s in the take)
meta = json.load(open('raw/meta.json')); chunks = json.load(open('vo/chunks.json')); words = json.load(open('vo/words_edit.json'))
marks = json.load(open('marks.json')) if os.path.exists('marks.json') else {}
import re
norm = lambda x: re.sub(r'[^a-z0-9 ]', '', x.lower())
def at(phrase, nth=0):
    toks = norm(phrase).split(); hits = [i for i in range(len(words)-len(toks)+1) if [norm(w['w']) for w in words[i:i+len(toks)]] == toks]
    return words[hits[nth]]['s']
V = lambda a: a + AUDIO_SHIFT
END = words[-1]['e'] + AUDIO_SHIFT + 1.2
# scene plan in video time, from the narration
plan = [
  ('ph1',     'photo', 0.0,                 V(at('They have'))),
  ('ph2',     'photo', V(at('They have')),  V(at('I thought'))),
  ('ph3',     'photo', V(at('I thought')),  V(at('In this'))),
  ('forest',  'clip',  V(at('In this')),    V(at('upgrade', 0)),   {'skip': 0.2}),
  ('camp',    'clip',  V(at('upgrade', 0)), V(at('hit the')),      {'skip': marks.get('buy', 1.2)}),
  ('forest',  'clip',  V(at('hit the')),    V(at('And you can')),  {'skip': 3.6}),
  ('trail',   'clip',  V(at('And you can')), V(at('And then')),    {'skip': 3.4}),
  ('results', 'clip',  V(at('And then')),   V(at('upgrade', 1)),   {'skip': marks.get('show', 2.0)}),
  ('camp',    'clip',  V(at('upgrade', 1)), V(at("It's pretty")),  {'skip': marks.get('crew', 5.0)}),
  ('forest',  'clip',  V(at("It's pretty")), V(at("I don't")),    {'skip': 6.4}),
  ('camp',    'clip',  V(at("I don't")),    V(at('but the')),     {'skip': 6.0}),
  ('title',   'still', V(at('but the')),    END),
]
TOTAL = END
# Ken Burns frames for the 3 photo beats
from PIL import Image
src = Image.open('photo_anon.jpg'); W, H = src.size
def ease(t): return t*t*(3-2*t)
def render(folder, n, fn):
    if os.path.isdir(folder) and len(os.listdir(folder)) == n: return
    os.makedirs(folder, exist_ok=True); [os.remove(os.path.join(folder, f)) for f in os.listdir(folder)]
    for k in range(n):
        z, cx, cy = fn(ease(k/max(1, n-1))); cw, ch = W/z, H/z
        x0 = min(max(cx-cw/2, 0), W-cw); y0 = min(max(cy-ch/2, 0), H-ch)
        src.crop((int(x0), int(y0), int(x0+cw), int(y0+ch))).resize((1080, 1920), Image.LANCZOS).save(f'{folder}/{k:04d}.jpg', quality=90)
durs = {p[0]: p[3]-p[2] for p in plan if p[1] == 'photo'}
import shutil; [shutil.rmtree(d, ignore_errors=True) for d in ['ph1','ph2','ph3']]
render('ph1', int(durs['ph1']*FPS), lambda t: (1.0+0.14*t, W*0.5, H*0.45-H*0.06*t))
render('ph2', int(durs['ph2']*FPS), lambda t: (1.85+0.1*t, W*0.55-W*0.04*t, H*0.1))
render('ph3', int(durs['ph3']*FPS), lambda t: (1.95-0.35*t, W*0.55+(972-W*0.55)*t, H*0.1+(2118-H*0.1)*t))
print('photo frames rendered')

inputs = []; idx = {}
def add(key, args): idx[key] = len([a for a in inputs if a == '-i']); inputs.extend(args)
for ph in ['ph1', 'ph2', 'ph3']: add(ph, ['-framerate', str(FPS), '-i', f'{ph}/%04d.jpg'])
for c in ['forest', 'camp', 'trail', 'results']: add(c, ['-i', f'raw/{c}.webm'])
add('title', ['-loop', '1', '-framerate', str(FPS), '-t', '8', '-i', 'raw/title.png'])
for c in chunks: add(c['id'], ['-i', f"capw_{c['id']}.png"])
add('voice', ['-i', 'vo/voice_edit.wav']); add('music', ['-i', 'music.wav'])

f = []; labels = []
for k, p in enumerate(plan):
    name, kind, a, b = p[:4]; d = b - a; lab = f'[s{k}]'
    if kind == 'photo': f.append(f"[{idx[name]}:v]fps={FPS},trim=duration={d:.3f},setpts=PTS-STARTPTS,setsar=1,format=yuv420p{lab}")
    elif kind == 'still': f.append(f"[{idx[name]}:v]scale=1080:1920,fps={FPS},trim=duration={d:.3f},setpts=PTS-STARTPTS,setsar=1,format=yuv420p{lab}")
    else:
        m = meta[name]; st = m['start']['real']; skip = p[4]['skip']
        f.append(f"[{idx[name]}:v]trim=start={st:.2f},mpdecimate=hi=768:lo=320:frac=0.33,setpts=N/({FPS}*TB),trim=start={skip:.2f}:duration={d:.3f},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=4,trim=duration={d:.3f},fps={FPS},scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p{lab}")
    labels.append(lab)
f.append(''.join(labels) + f"concat=n={len(labels)}:v=1:a=0[v0]")
cur = '[v0]'
for k, c in enumerate(chunks):
    out = f'[v{k+1}]'; f.append(f"{cur}[{idx[c['id']]}:v]overlay=0:1230:enable='between(t,{V(c['s']):.2f},{V(c['e'])-0.02:.2f})'{out}"); cur = out
f.append(f"{cur}fade=t=out:st={TOTAL-0.6:.2f}:d=0.6[vout]")
# audio: voice shifted onto the timeline, music ducked under it
shift_ms = int(max(0, AUDIO_SHIFT) * 1000); trim = max(0, -AUDIO_SHIFT)
f.append(f"[{idx['voice']}:a]atrim=start={trim:.2f},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=mono,adelay={shift_ms}|{shift_ms}[av]")
f.append(f"[{idx['music']}:a]aformat=sample_rates=44100:channel_layouts=mono,volume=0.11,atrim=duration={TOTAL:.2f},afade=t=out:st={TOTAL-1.5:.2f}:d=1.5[am]")
f.append("[av][am]amix=inputs=2:normalize=0:dropout_transition=0,alimiter=limit=0.95[aout]")
cmd = ['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(f), '-map', '[vout]', '-map', '[aout]', '-t', f'{TOTAL:.2f}', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', 'big_timber_tiktok_v2.mp4']
subprocess.check_call(cmd); print('wrote big_timber_tiktok_v2.mp4')
