# Editorial cuts on the freestyle take: remove filler phrases, rebuild the audio and the word timeline.
import json, subprocess, re
words = json.load(open('vo/_words.json'))
norm = lambda s: re.sub(r'[^a-z0-9 ]', '', s.lower())
def find(phrase, nth=0):
    toks = norm(phrase).split(); hits = []
    for i in range(len(words) - len(toks) + 1):
        if [norm(w['w']) for w in words[i:i+len(toks)]] == toks: hits.append(i)
    return hits[nth]
CUTS = ["and information about his life and what he got up to.", "you know,", "and learn more about it.", "they were introducing at the Tree of Mystery."]
cut_idx = set()
for c in CUTS:
    i = find(c); n = len(c.split()); cut_idx.update(range(i, i + n))
kept = [i for i in range(len(words)) if i not in cut_idx]
# keep-ranges in source time: split halfway through the gaps around cut words
ranges = []; start = 0.0; i = 0
while i < len(words):
    if i in cut_idx:
        j = i
        while j < len(words) and j in cut_idx: j += 1
        a = (words[i-1]['e'] + words[i]['s']) / 2 if i > 0 else words[i]['s']
        b = (words[j-1]['e'] + words[j]['s']) / 2 if j < len(words) else words[j-1]['e'] + 0.3
        ranges.append((start, a)); start = b; i = j
    else: i += 1
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', 'vo/voice_clean.wav']))
ranges.append((start, dur))
print('keep ranges', [(round(a, 2), round(b, 2)) for a, b in ranges])
# new timeline mapping
def remap(t):
    acc = 0.0
    for a, b in ranges:
        if t <= b: return acc + max(0, t - a)
        acc += b - a
    return acc
new_words = [{'w': words[i]['w'], 's': round(remap(words[i]['s']), 2), 'e': round(remap(words[i]['e']), 2)} for i in kept]
json.dump(new_words, open('vo/words_edit.json', 'w'))
# audio: concat kept ranges with 15 ms fades at the seams
parts = []; fc = []
for k, (a, b) in enumerate(ranges):
    fc.append(f"[0:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st={b-a-0.015:.3f}:d=0.015[p{k}]"); parts.append(f'[p{k}]')
fc.append(''.join(parts) + f"concat=n={len(parts)}:v=0:a=1[out]")
subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', 'vo/voice_clean.wav', '-filter_complex', ';'.join(fc), '-map', '[out]', 'vo/voice_edit.wav'])
nd = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', 'vo/voice_edit.wav']))
print('edited voice', round(nd, 2), 's;', len(new_words), 'words; last word ends', new_words[-1]['e'])
# re-chunk captions
chunks = []; cur = []
for w in new_words:
    cur.append(w)
    nxt = new_words[new_words.index(w)+1]['w'] if new_words.index(w)+1 < len(new_words) else ''
    if len(cur) >= 4 or (re.search(r'[.,!?]$', w['w']) and len(cur) >= 2) or (nxt[:1].isupper() and nxt not in ('I', 'Paul', 'Bunyan', 'Trees', 'Mystery', 'Tree') and len(cur) >= 2): chunks.append(cur); cur = []
if cur: chunks.append(cur)
out = []
for i, c in enumerate(chunks):
    s = c[0]['s']; e = chunks[i+1][0]['s'] if i+1 < len(chunks) else c[-1]['e'] + 0.6
    out.append({'id': f'w{i:02d}', 'text': ' '.join(x['w'] for x in c), 's': s, 'e': max(e, s + 0.45)})
json.dump(out, open('vo/chunks.json', 'w'), indent=1)
print('\n'.join(f"{c['s']:5.2f} {c['text']}" for c in out))
