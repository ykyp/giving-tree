import { create } from 'zustand'
import { BRANDS, NAMES } from './config'
import { hashStr, now } from './lib/util'

// ---- simulated server rules (the live site does these in /api/open) ----
const DEV = { created: new Set(), opened: new Set() }
try { const s = JSON.parse(localStorage.getItem('gt3-device') || 'null'); if (s) { s.created.forEach(x => DEV.created.add(x)); s.opened.forEach(x => DEV.opened.add(x)) } } catch (e) {}
const saveDev = () => { try { localStorage.setItem('gt3-device', JSON.stringify({ created: [...DEV.created], opened: [...DEV.opened] })) } catch (e) {} }
export const cardKey = (b, n) => b + ':' + n.trim().toLowerCase()
export const cardId = (b, n) => hashStr(cardKey(b, n)).toString(36).slice(0, 7)

for (const b of Object.values(BRANDS)) b.extra = []

/**
 * Flow phases
 * sender:    arrival → dark → lighting → choose → engrave → hang → settling → crown → crowning → greeting → (explore)
 * recipient: arrival → dark → lighting → gift → unwrap → hang → settling → crown → crowning → greeting → (explore)
 * tree page: explore (with sheet)
 */
export const useStore = create((set, get) => ({
  view: 'send', brandKey: 'mosaicads', from: 'Maria',
  phase: 'arrival', phaseAt: 0, run: 0,
  sel: 0, design: 0, myName: '', engraveTimes: [],
  heroHook: -1, openResult: null,
  live: true, sound: true, tier: 'auto', fps: 60,
  focus: null, poi: null, exploreMode: 'walk', toast: null, toastAt: 0, sheetOpen: false, linkPreview: null,
  tick: 0,

  brand: () => BRANDS[get().brandKey],
  setPhase: phase => set({ phase, phaseAt: now() }),
  restart: (view = get().view) => set(s => ({ view, phase: view === 'tree' ? 'explore' : 'arrival', phaseAt: now(), run: s.run + 1, heroHook: -1, openResult: null, focus: null, poi: null, exploreMode: 'walk',
    engraveTimes: [], myName: view === 'send' ? '' : s.myName, design: view === 'open' ? hashStr(s.from.toLowerCase()) % 8 : s.design })),
  setBrand: brandKey => { set({ brandKey }); get().restart() },
  setFrom: from => { set({ from: (from.trim().split(/\s+/)[0] || 'Maria').slice(0, 12) }); if (get().view === 'open') get().restart() },
  toastMsg: msg => set({ toast: msg, toastAt: now() }),
  typeName: name => set(s => {
    const t = [...s.engraveTimes]; const n = now()
    for (let i = 0; i < name.length; i++) if (name[i] !== s.myName[i] || t[i] === undefined) t[i] = n
    t.length = name.length; return { myName: name, engraveTimes: t }
  }),
  createCard: () => { const s = get(); DEV.created.add(cardKey(s.brandKey, s.myName)); saveDev(); return `https://christmas.mosaicads.ai/c/${cardId(s.brandKey, s.myName)}` },
  tryOpen: () => {
    const s = get(), b = BRANDS[s.brandKey], k = cardKey(b.slug, s.from)
    let r
    if (DEV.created.has(k)) r = { counted: false, reason: 'own' }
    else if (DEV.opened.has(k)) r = { counted: false, reason: 'again' }
    else if (b.opened * b.per >= b.cap) r = { counted: false, reason: 'cap' }
    else { DEV.opened.add(k); saveDev(); b.opened++; b.extra.unshift({ n: s.from, you: true }); r = { counted: true } }
    set({ openResult: r, tick: s.tick + 1 }); return r
  },
  resetDevice: () => { DEV.created.clear(); DEV.opened.clear(); saveDev(); for (const b of Object.values(BRANDS)) b.extra = []; set({ myName: '' }); get().toastMsg('This phone is reset. Cards can give again.'); get().restart() },
  bump: () => set(s => ({ tick: s.tick + 1 })),
}))

export const randomName = () => NAMES[Math.floor(Math.random() * NAMES.length)]
