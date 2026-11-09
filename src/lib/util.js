export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const ease = t => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
export const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3)
export const easeBack = t => { t = clamp(t, 0, 1); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) }
export const now = () => performance.now() / 1000
export const hashStr = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
export function seeded(seed) { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647 }
export const money = p => '£' + (p / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const amt = p => p < 100 ? p + 'p' : money(p)
export const ago = min => min < 1 ? 'just now' : min < 60 ? `${min}m ago` : min < 1440 ? `${Math.floor(min / 60)}h ago` : `${Math.floor(min / 1440)}d ago`
export const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
