// The picture that shows when someone's link is pasted into a chat: a close-up of their own ornament, taken from the
// 3D scene, with their name. Made as soon as the ornament is on the tree and again whenever the share screen opens.
import { post } from './api'
import { shared } from '../three/shared'

export const PREVIEW_W = 1200, PREVIEW_H = 630
const MAX_CHARS = 279000 // the server's limit for one picture

/** Draws the card onto a 1200×630 canvas. `title` is the big handwritten line, `line` the small one under it. */
export function drawCardPreview(canvas, { title, line }) {
  const x = canvas.getContext('2d'), W = PREVIEW_W, H = PREVIEW_H, snap = shared.snapshot?.()
  canvas.width = W; canvas.height = H
  x.fillStyle = '#0a1030'; x.fillRect(0, 0, W, H)
  if (snap) x.drawImage(snap, 0, 0, W, H)
  // darken the edges and the lower third so the words read on any ornament
  const v = x.createRadialGradient(W / 2, H * .42, H * .2, W / 2, H * .5, W * .62); v.addColorStop(0, 'rgba(5,8,25,0)'); v.addColorStop(1, 'rgba(5,8,25,.55)'); x.fillStyle = v; x.fillRect(0, 0, W, H)
  const g = x.createLinearGradient(0, H * .5, 0, H); g.addColorStop(0, 'rgba(5,8,25,0)'); g.addColorStop(.75, 'rgba(5,8,25,.82)'); g.addColorStop(1, 'rgba(5,8,25,.92)'); x.fillStyle = g; x.fillRect(0, 0, W, H)
  x.textAlign = 'center'; x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 18
  // the big line shrinks to fit long names
  let size = 132; x.font = `${size}px "Great Vibes", cursive`
  while (x.measureText(title).width > W - 160 && size > 60) { size -= 6; x.font = `${size}px "Great Vibes", cursive` }
  const gold = x.createLinearGradient(0, H - 190, 0, H - 90); gold.addColorStop(0, '#fff3d6'); gold.addColorStop(1, '#f2c46d'); x.fillStyle = gold
  x.fillText(title, W / 2, H - 112)
  x.shadowBlur = 8; x.fillStyle = '#eef0f8'; x.font = '400 40px "Instrument Serif", Georgia, serif'
  x.fillText(line, W / 2, H - 52, W - 120)
  // the site's name, small, top left
  x.textAlign = 'left'; x.shadowBlur = 6; x.fillStyle = 'rgba(244,240,231,.92)'; x.font = '500 26px "Bricolage Grotesque", system-ui, sans-serif'; x.fillText('The Giving Tree', 44, 58)
  x.shadowBlur = 0
  return canvas
}
export const STORY_W = 1080, STORY_H = 1920
/** Breaks words into lines no wider than `max`, at most `rows` of them; the last ends in … if words were left over. */
function wrap(x, words, max, rows) {
  const out = []; let line = ''
  for (const w of String(words).split(/\s+/)) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width <= max || !line) line = t; else { out.push(line); line = w } }
  if (line) out.push(line)
  if (out.length > rows) { out.length = rows; let l = out[rows - 1]; while (l && x.measureText(l + '…').width > max) l = l.slice(0, -1); out[rows - 1] = l.trimEnd() + '…' }
  return out
}
/**
 * A 9:16 picture for an Instagram story (or any other): the ornament, the name, the wish, and where to find it.
 * Instagram covers about 250px at the top and 340px at the bottom with its own controls, so every word sits between.
 * A story picture cannot carry a tappable link, so the address is written out and the person adds a Link sticker.
 */
export function drawStory(canvas, { name, wish, tree, top, ask, host }) {
  const x = canvas.getContext('2d'), W = STORY_W, H = STORY_H; let snap = null
  try { snap = shared.snapshot?.({ tall: true }) } catch (e) {}
  canvas.width = W; canvas.height = H
  const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#16204a'); sky.addColorStop(1, '#070b1c'); x.fillStyle = sky; x.fillRect(0, 0, W, H)
  if (snap) x.drawImage(snap, 0, 0, W, H)
  const up = x.createLinearGradient(0, 0, 0, 520); up.addColorStop(0, 'rgba(5,8,25,.78)'); up.addColorStop(1, 'rgba(5,8,25,0)'); x.fillStyle = up; x.fillRect(0, 0, W, 520)
  const down = x.createLinearGradient(0, H * .46, 0, H); down.addColorStop(0, 'rgba(5,8,25,0)'); down.addColorStop(.42, 'rgba(5,8,25,.84)'); down.addColorStop(1, 'rgba(5,8,25,.96)'); x.fillStyle = down; x.fillRect(0, H * .46, W, H * .54)
  x.textAlign = 'center'; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 16
  x.fillStyle = 'rgba(244,240,231,.95)'; x.font = '500 40px "Bricolage Grotesque", system-ui, sans-serif'; x.fillText(tree, W / 2, 286, W - 200)
  if (top) { x.fillStyle = '#f2c46d'; x.font = '400 46px "Instrument Serif", Georgia, serif'; x.fillText(top, W / 2, 346, W - 200) }
  // from the bottom of the safe area upwards: address, what to do, the wish, the name
  let y = H - 370
  x.shadowBlur = 0; x.font = '600 34px "Bricolage Grotesque", system-ui, sans-serif'
  const pw = Math.min(W - 160, x.measureText(host).width + 80); x.fillStyle = 'rgba(242,196,109,.16)'; x.strokeStyle = 'rgba(242,196,109,.7)'; x.lineWidth = 2
  x.beginPath(); x.roundRect((W - pw) / 2, y - 50, pw, 76, 38); x.fill(); x.stroke(); x.fillStyle = '#ffe3ad'; x.fillText(host, W / 2, y, pw - 40)
  y -= 96; x.shadowBlur = 12; x.fillStyle = '#eef0f8'; x.font = '400 46px "Instrument Serif", Georgia, serif'; x.fillText(ask, W / 2, y, W - 160)
  y -= 84
  if (wish) { x.font = 'italic 400 54px "Instrument Serif", Georgia, serif'; x.fillStyle = '#fff6e0'
    const lines = wrap(x, `“${wish}”`, W - 200, 4); for (let i = lines.length - 1; i >= 0; i--) { x.fillText(lines[i], W / 2, y); y -= 68 }
    y -= 26 }
  let size = 190; x.font = `${size}px "Great Vibes", cursive`
  while (x.measureText(name).width > W - 160 && size > 80) { size -= 8; x.font = `${size}px "Great Vibes", cursive` }
  const gold = x.createLinearGradient(0, y - size * .8, 0, y); gold.addColorStop(0, '#fff3d6'); gold.addColorStop(1, '#f2c46d'); x.fillStyle = gold; x.shadowBlur = 22
  x.fillText(name, W / 2, y); x.shadowBlur = 0
  return canvas
}
/** The story picture as a file a phone can hand to Instagram. */
export async function storyFile(words, canvas = document.createElement('canvas')) {
  try { await document.fonts?.ready } catch (e) {}
  drawStory(canvas, words)
  const blob = await new Promise(done => canvas.toBlob(done, 'image/jpeg', .9))
  return blob && new File([blob], 'my-ornament-story.jpg', { type: 'image/jpeg' })
}
/** As small a JPEG as needed to fit, starting from good quality. */
export function toJpeg(canvas) { for (const q of [.8, .65, .5, .38]) { const d = canvas.toDataURL('image/jpeg', q); if (d.length - 23 <= MAX_CHARS) return d } return canvas.toDataURL('image/jpeg', .25) }

export async function uploadCardPreview(token, kind, words, canvas = document.createElement('canvas')) {
  try { await document.fonts?.ready } catch (e) {}
  drawCardPreview(canvas, words)
  return post(`me/${token}/preview`, { kind, jpeg: toJpeg(canvas) }).catch(() => {})
}
