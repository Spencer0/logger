# Build the TikTok: photo intro -> gameplay clips (speed-corrected) -> end card, with captions, VO and music.
import json, subprocess, sys
FPS = 30
lines = json.load(open('vo/lines.json')); meta = json.load(open('raw/meta.json'))
vo = {l['id']: l for l in lines}
def seg_vo(ids, pad=0.45, gap=0.25):
    return sum(vo[i]['dur'] for i in ids) + gap * (len(ids) - 1) + pad
segs = [
    {'name': 'photo1', 'kind': 'photo', 'vo': ['s1'], 'dur': seg_vo(['s1'])},
    {'name': 'photo2', 'kind': 'photo', 'vo': ['s2', 's3'], 'dur': seg_vo(['s2', 's3'])},
    {'name': 'forest', 'kind': 'clip', 'vo': ['s4', 's5'], 'dur': max(6.0, seg_vo(['s4', 's5']))},
    {'name': 'trail', 'kind': 'clip', 'vo': ['s6', 's7'], 'dur': max(8.0, seg_vo(['s6', 's7']))},
    {'name': 'camp', 'kind': 'clip', 'vo': ['s8', 's9'], 'dur': max(6.5, seg_vo(['s8', 's9']))},
    {'name': 'title', 'kind': 'clip', 'vo': ['s10', 's11'], 'dur': seg_vo(['s10', 's11'], pad=0.8)},
]
# timeline
t = 0.0; events = []  # (id, start)
for s in segs:
    s['start'] = t; tt = t + 0.15
    for i in s['vo']:
        events.append((i, tt)); tt += vo[i]['dur'] + 0.25
    t += s['dur']
TOTAL = t
print('total', round(TOTAL, 2), 'segments', [(s['name'], round(s['dur'], 2)) for s in segs])

inputs = ['-framerate', '30', '-i', 'ph1/%04d.jpg', '-framerate', '30', '-i', 'ph2/%04d.jpg']
clips = ['forest', 'trail', 'camp', 'title']
for c in clips: inputs += (['-loop', '1', '-framerate', '30', '-t', '6', '-i', 'raw/title.png'] if c == 'title' else ['-i', f'raw/{c}.webm'])
cap_ids = [e[0] for e in events]
for i in cap_ids: inputs += ['-i', f'cap_{i}.png']
for i in cap_ids: inputs += ['-i', f'vo/{i}.wav']
inputs += ['-i', 'music.wav']
idx_clip = {c: 2 + k for k, c in enumerate(clips)}
idx_cap = {i: 2 + len(clips) + k for k, i in enumerate(cap_ids)}
idx_vo = {i: 2 + len(clips) + len(cap_ids) + k for k, i in enumerate(cap_ids)}
idx_music = 2 + len(clips) + 2 * len(cap_ids)

f = []
f.append(f"[0:v]fps={FPS},setsar=1,format=yuv420p[p1]")
f.append(f"[1:v]fps={FPS},setsar=1,format=yuv420p[p2]")
# gameplay clips: cut at the action start, drop duplicate frames (virtual 30fps clock), retime, upscale
labels = ['[p1]', '[p2]']
for s in segs[2:]:
    if s['name'] == 'title':
        f.append(f"[{idx_clip['title']}:v]scale=1080:1920,setsar=1,format=yuv420p,trim=duration={s['dur']:.2f}[titlev]"); labels.append('[titlev]'); continue
    m = meta[s['name']]; st = m['start']['real']
    skip = {'trail': 3.4, 'forest': 0.2}.get(s['name'], 0)
    f.append(f"[{idx_clip[s['name']]}:v]trim=start={st:.2f},mpdecimate=hi=768:lo=320:frac=0.33,setpts=N/({FPS}*TB),trim=start={skip:.2f}:duration={s['dur']:.2f},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=3,trim=duration={s['dur']:.2f},fps={FPS},scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[{s['name']}v]")
    labels.append(f"[{s['name']}v]"); print(s['name'], 'start', st, 'game secs recorded', round(m['end']['game'] - m['start']['game'], 1))
f.append(''.join(labels) + f"concat=n={len(labels)}:v=1:a=0[v0]")
# captions
cur = '[v0]'
for k, (i, start) in enumerate(events):
    end = start + vo[i]['dur'] + 0.35
    out = f'[v{k + 1}]'
    f.append(f"{cur}[{idx_cap[i]}:v]overlay=0:1180:enable='between(t,{start:.2f},{end:.2f})'{out}"); cur = out
f.append(f"{cur}fade=t=out:st={TOTAL - 0.5:.2f}:d=0.5[vout]")
# audio: VO sentences placed on the timeline + music bed
alabels = []
for i, start in events:
    ms = int(start * 1000)
    f.append(f"[{idx_vo[i]}:a]aformat=sample_rates=44100:channel_layouts=mono,volume=1.6,adelay={ms}|{ms}[a_{i}]"); alabels.append(f'[a_{i}]')
f.append(f"[{idx_music}:a]aformat=sample_rates=44100:channel_layouts=mono,volume=0.13,atrim=duration={TOTAL:.2f},afade=t=out:st={TOTAL - 1.5:.2f}:d=1.5[am]"); alabels.append('[am]')
f.append(''.join(alabels) + f"amix=inputs={len(alabels)}:normalize=0:dropout_transition=0,alimiter=limit=0.95[aout]")
cmd = ['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(f), '-map', '[vout]', '-map', '[aout]', '-t', f'{TOTAL:.2f}', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', 'big_timber_tiktok.mp4']
subprocess.check_call(cmd); print('wrote big_timber_tiktok.mp4')
