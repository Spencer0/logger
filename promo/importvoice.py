# Split one voice-memo take into the 11 VO lines on silences, normalize, update durations.
# Usage: python3 importvoice.py recording.m4a [min_silence_seconds=0.6]
import sys, json, subprocess, re, os
src = sys.argv[1]; min_sil = float(sys.argv[2]) if len(sys.argv) > 2 else 0.6
lines = json.load(open('vo/lines.json'))
# normalize to mono wav, light cleanup (high-pass rumble, de-ess-ish lowpass, loudness)
subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', src, '-ac', '1', '-ar', '44100', '-af', 'highpass=f=80,lowpass=f=12000,afftdn=nf=-28,loudnorm=I=-16:TP=-1.5:LRA=9', 'vo/_take.wav'])
out = subprocess.run(['ffmpeg', '-i', 'vo/_take.wav', '-af', f'silencedetect=noise=-32dB:d={min_sil}', '-f', 'null', '-'], capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]; ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', 'vo/_take.wav']))
# speech chunks = gaps between silences
bounds = []; cur = 0.0 if not starts or starts[0] > 0.2 else None
if cur is None: cur = ends[0]; ends = ends[1:]; starts = starts[1:]
for s, e in zip(starts, ends + [dur]):
    if s - cur > 0.35: bounds.append((cur, s))
    cur = e
if dur - cur > 0.35: bounds.append((cur, dur))
print(f'found {len(bounds)} chunks for {len(lines)} lines')
if len(bounds) != len(lines):
    for i, (a, b) in enumerate(bounds): print(f'  chunk {i+1}: {a:.2f}-{b:.2f} ({b-a:.2f}s)')
    print('Tip: re-run with a different silence length, e.g. python3 importvoice.py file.m4a 0.45'); sys.exit(1)
for l, (a, b) in zip(lines, bounds):
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', 'vo/_take.wav', '-ss', f'{max(0, a - 0.08):.3f}', '-to', f'{min(dur, b + 0.12):.3f}', '-af', 'afade=t=in:d=0.03,afade=t=out:st=0:d=0', f"vo/{l['id']}.wav"])
    l['dur'] = round(min(dur, b + 0.12) - max(0, a - 0.08), 2); print(l['id'], l['dur'], l['text'][:48])
json.dump(lines, open('vo/lines.json', 'w'), indent=1); os.remove('vo/_take.wav')
print('done — now run: python3 assemble.py')
