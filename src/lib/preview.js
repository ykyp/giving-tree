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
/** As small a JPEG as needed to fit, starting from good quality. */
export function toJpeg(canvas) { for (const q of [.8, .65, .5, .38]) { const d = canvas.toDataURL('image/jpeg', q); if (d.length - 23 <= MAX_CHARS) return d } return canvas.toDataURL('image/jpeg', .25) }

export async function uploadCardPreview(token, kind, words, canvas = document.createElement('canvas')) {
  try { await document.fonts?.ready } catch (e) {}
  drawCardPreview(canvas, words)
  return post(`me/${token}/preview`, { kind, jpeg: toJpeg(canvas) }).catch(() => {})
}
