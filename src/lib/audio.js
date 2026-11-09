// Small Web Audio bell synth: a music-box bed plus chimes for each beat. Starts on the first tap.
let ac = null, bed = null, enabled = true
export function setSound(on) { enabled = on; if (on) { ensure(); ac?.resume?.() } }
export function ensure() { if (ac || !enabled) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); startBed() } catch (e) { ac = null } }
function bell(f, t, g = .1, dur = 1.6) {
  const o = ac.createOscillator(), o2 = ac.createOscillator(), G = ac.createGain(), G2 = ac.createGain()
  o.type = o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2.76; G2.gain.value = .16
  o2.connect(G2).connect(G); o.connect(G).connect(ac.destination)
  G.gain.setValueAtTime(0, t); G.gain.linearRampToValueAtTime(g, t + .008); G.gain.exponentialRampToValueAtTime(.0001, t + dur)
  o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + dur)
}
export function chime(fs, gap = .11, g = .1) { if (!enabled || !ac) return; const t = ac.currentTime; fs.forEach((f, i) => bell(f, t + i * gap, g)) }
export function whoosh() { if (!enabled || !ac) return; const n = ac.sampleRate * 1.2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n) * .25
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; s.buffer = b; s.connect(f).connect(ac.destination); s.start() }
function startBed() { clearInterval(bed); const sc = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; let i = 2
  bed = setInterval(() => { if (!enabled || !ac || document.hidden) return; i = Math.max(0, Math.min(sc.length - 1, i + [-1, 1, 1, -2, 2, 0][Math.floor(Math.random() * 6)])); bell(sc[i], ac.currentTime, .022, 2.2); if (Math.random() < .3) bell(sc[i] / 2, ac.currentTime + .01, .016, 2.4) }, 560) }
