import { create } from 'zustand'
import { BRANDS, NAMES } from './config'
import { hashStr, now } from './lib/util'
import { api, bootApi, get as apiGet, post as apiPost, newDeviceId } from './lib/api'
import { clockOf, localDay } from '../shared/season.js'

const lsGet = k => { try { return localStorage.getItem(k) } catch (e) { return null } }
const lsSet = (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} }
/** The device remembers its own branch for each tree, so the original link finds it again. */
const allMine = () => { try { return JSON.parse(lsGet('gt3-mine') || '{}') } catch (e) { return {} } }
const saveMine = c => lsSet('gt3-mine', JSON.stringify({ ...allMine(), [c.brand]: { id: c.id, token: c.token, name: c.name, design: c.design, hook: c.hook, parent: c.parent } }))
export const mineFor = brand => allMine()[brand] || null

for (const b of Object.values(BRANDS)) b.extra = []

let demoDate = lsGet('gt-demo-date') || '', ticking = null
const clockNow = () => demoDate ? new Date(demoDate) : new Date()
const today = () => localDay(clockNow())
const SAMPLE_WISHES = ['A year with fewer spreadsheets and more sea swims.', 'I hope the new house feels like home by spring.', 'Health for your mum, and time for you.', 'More long lunches. You deserve them.', 'That you finally get that dog.', 'Good news, kind people, and enough sleep.']

const wrapUp = s => s.parcels.find(p => p.kind === 'self' && !p.opened) ? 'selfwish' : 'explore'

/**
 * Flow phases
 * sender:    arrival → dark → lighting → choose → engrave → hang → settling → seal → crown → crowning → greeting → (explore)
 * invited:   arrival → dark → lighting → gift → unwrap → meet → choose → engrave → hang (on the sender's branch) → settling → wishfor → crown → crowning → greeting
 * my branch: mearrive → branch (before Christmas) | parcels → gave → thanks → selfwish → explore (from Christmas)
 * tree page, keepsake: explore
 */
export const useStore = create((set, get) => ({
  view: 'send', brandKey: 'mosaicads', from: 'Maria',
  phase: 'arrival', phaseAt: 0, run: 0,
  sel: 0, design: 0, myName: '', engraveTimes: [],
  heroHook: -1, openResult: null,
  live: false, sound: true, tier: 'auto', fps: 60,
  focus: null, poi: null, exploreMode: 'walk', toast: null, toastAt: 0, sheetOpen: false, linkPreview: null,
  tick: 0,
  // the two visits
  apiInfo: null, unreachable: false, clock: clockOf(clockNow()), demoDate,
  mine: null, cardP: null, parent: null, thanksFrom: null, me: null, parcels: [], wishOpen: null, branchName: null,
  branchView: null, // { hook, owner?, kids } the branch shown on the tree (no owner: the hero ornament is the owner)

  brand: () => BRANDS[get().brandKey],
  setPhase: phase => set({ phase, phaseAt: now() }),
  restart: (view = get().view) => set(s => ({ view, phase: view === 'tree' || view === 'keepsake' ? 'explore' : 'arrival', phaseAt: now(), run: s.run + 1, heroHook: -1, openResult: null, focus: null, poi: null, exploreMode: view === 'keepsake' ? 'orbit' : 'walk',
    engraveTimes: [], myName: view === 'send' ? '' : s.myName, design: view === 'open' ? (s.parent ? s.parent.design : hashStr(s.from.toLowerCase()) % 8) : s.design,
    parent: view === 'open' ? s.parent : null, branchView: view === 'open' ? s.branchView : null, cardP: null, me: null, parcels: [], wishOpen: null, branchName: null, mine: mineFor(s.brandKey) })),
  setBrand: brandKey => { set({ brandKey }); get().syncTree(); get().restart(get().view === 'open' || get().view === 'me' ? 'send' : get().view) },
  setFrom: from => { set({ from: (from.trim().split(/\s+/)[0] || 'Maria').slice(0, 12) }); if (get().view === 'open') get().openDemo() },
  toastMsg: msg => set({ toast: msg, toastAt: now() }),
  typeName: name => set(s => {
    const t = [...s.engraveTimes]; const n = now()
    for (let i = 0; i < name.length; i++) if (name[i] !== s.myName[i] || t[i] === undefined) t[i] = n
    t.length = name.length; return { myName: name, engraveTimes: t }
  }),
  bump: () => set(s => ({ tick: s.tick + 1 })),

  // ---- start-up and routing ----
  boot: async () => {
    await bootApi()
    if (!api.info.ok) return set({ unreachable: true }) // the server exists but can't serve: say so rather than pretend
    api.clockIso = demoDate && api.info.devClock ? new Date(demoDate).toISOString() : null
    if (!api.info.devClock) demoDate = ''
    set({ apiInfo: api.info, unreachable: false, live: !!api.info.devClock, demoDate }); get().tickClock()
    if (!ticking) ticking = setInterval(() => get().tickClock(), 30000)
    await get().syncTree(); await get().route()
  },
  route: async () => {
    const m = location.pathname.match(/^\/(c|me)\/([\w-]+)/), q = new URLSearchParams(location.search)
    if (m?.[1] === 'me') return get().openMe(m[2])
    if (m?.[1] === 'c') return get().openCard(m[2], { thanks: q.has('t'), preview: q.has('preview') })
    get().restart(get().clock.phase === 'keepsake' ? 'keepsake' : 'send')
  },
  tickClock: () => { const c = clockOf(clockNow()), o = get().clock; if (c.phase !== o.phase || c.pulse !== o.pulse || c.day !== o.day) set({ clock: c }) },
  setDemoDate: v => { demoDate = v; lsSet('gt-demo-date', v); api.clockIso = v ? new Date(v).toISOString() : null; set({ demoDate: v }); get().tickClock(); const s = get()
    if (s.view === 'me' && s.mine) return get().openMe(s.mine.token); if (s.clock.phase === 'keepsake') return get().restart('keepsake'); if (s.view === 'keepsake') get().restart('send'); else get().restart() },
  syncTree: async () => { const k = get().brandKey; try { const t = await apiGet(`tree/${k}`); BRANDS[k].opened = t.opened; get().bump() } catch (e) {} },

  /** Someone arrives on a card link. */
  openCard: async (id, { thanks = false, preview = false } = {}) => {
    let card; try { card = await apiGet(`card/${id}`) } catch (e) { get().toastMsg("We couldn't find that card."); return get().restart('send') }
    set({ brandKey: card.brand }); await get().syncTree()
    const mine = mineFor(card.brand)
    // This phone already has a branch: go straight to it when the link is its own card, a thank-you, or the card it was
    // invited by and has already wished. If it skipped the wish earlier, the link still lets it leave one.
    if (mine && !preview && (mine.id === id || thanks || (mine.parent === id && card.left))) {
      if (thanks) apiPost('open', { id }).catch(() => {})
      return get().openMe(mine.token, thanks ? card.name : null)
    }
    if (get().clock.phase === 'keepsake') return get().restart('keepsake')
    set({ parent: card, from: card.name, design: card.design, sel: card.design, thanksFrom: thanks ? card.name : null, branchView: { hook: card.hook, owner: card, kids: card.branch.kids } })
    get().restart('open')
  },
  openDemo: async () => { const s = get(); const { id } = await apiPost('demo/card', { brand: s.brandKey, name: s.from, design: hashStr(s.from.toLowerCase()) % 8, hook: 24 }); get().openCard(id, { preview: true }) },

  /** Someone arrives on their private Christmas link. */
  openMe: async (token, thanksFrom = null) => {
    let m; try { m = await apiGet(`me/${token}?day=${today()}`) } catch (e) { get().toastMsg("We couldn't find that branch."); return get().restart('send') }
    const c = m.card, b = BRANDS[c.brand]; b.opened = m.tree.opened; saveMine(c)
    if (get().clock.phase === 'keepsake' && !m.wishes.length) { set({ brandKey: c.brand }); return get().restart('keepsake') }
    set(s => ({ view: 'me', brandKey: c.brand, me: m, mine: mineFor(c.brand), myName: c.name, design: c.design, sel: c.design, heroHook: c.hook, parcels: m.wishes, wishOpen: null, branchName: m.branch.name, parent: null, focus: null, poi: null, exploreMode: 'walk',
      branchView: { hook: c.hook, kids: m.branch.kids }, thanksFrom, phase: 'mearrive', phaseAt: now(), run: s.run + 1 }))
    if (thanksFrom) get().toastMsg(`${thanksFrom} says thank you`)
  },
  afterArrive: s => !s.me?.released ? 'branch' : s.parcels.some(p => p.kind === 'friend') ? 'parcels' : 'gave',
  myHome: () => { const s = get(); return s.me?.released ? 'parcels' : 'branch' },
  nextAfterThanks: () => { const s = get(); s.setPhase(wrapUp(s)) },

  // ---- visit 1 ----
  /** Saves the ornament as soon as it is on the tree. Everything after this hangs off the card. */
  createCard: () => {
    const s = get(); if (s.cardP) return s.cardP
    const p = apiPost('card', { brand: s.brandKey, name: s.myName, design: s.design, hook: s.heroHook, parent: s.parent?.id }).then(c => { saveMine(c); set({ mine: mineFor(c.brand) }); return c }).catch(e => { set({ cardP: null }); throw e })
    set({ cardP: p }); return p
  },
  cardLink: (id, thanks) => `${location.origin}/c/${id}${thanks ? '?t=1' : ''}`,
  tryOpen: () => {
    const s = get(), b = BRANDS[s.brandKey]; if (!s.parent) return
    apiPost('open', { id: s.parent.id }).then(r => { if (r.tree) b.opened = r.tree.opened; if (r.counted) b.extra.unshift({ n: s.from, you: true }); set(st => ({ openResult: r, tick: st.tick + 1 })) }).catch(() => set({ openResult: { counted: false, reason: 'error' } }))
  },
  sealSelf: async text => { const c = await get().createCard(); const r = await apiPost(`me/${c.token}/wish`, { text }); set(s => ({ parcels: [...s.parcels, { id: r.id, from: s.myName, kind: 'self', opened: false }] })) },
  sealFriend: async text => { const s = get(); await apiPost('wish', { to: s.parent.id, from: s.myName || s.mine?.name, text }); set(st => ({ parent: { ...st.parent, left: true } })) },
  nameBranch: async name => { const c = get().mine || await get().createCard(); const r = await apiPost(`me/${c.token}/branch`, { name }); set({ branchName: r.name }) },

  // ---- visit 2 ----
  openParcel: id => { const s = get(), p = s.parcels.find(x => x.id === id); if (!p) return; set({ wishOpen: id })
    if (!p.opened) { set(st => ({ parcels: st.parcels.map(x => x.id === id ? { ...x, opened: true } : x) })); apiPost(`me/${s.mine.token}/opened`, { id, day: today() }).catch(() => {}) } },
  reportWish: async id => { const s = get(); try { await apiPost(`me/${s.mine.token}/report`, { id, day: today() }); set(st => ({ parcels: st.parcels.filter(p => p.id !== id), wishOpen: null })); get().toastMsg("Thanks. We've taken it down and will review it.") } catch (e) { get().toastMsg("That didn't send. Try again.") } },

  // ---- demo panel ----
  resetDevice: () => { newDeviceId(); lsSet('gt3-mine', '{}'); for (const b of Object.values(BRANDS)) b.extra = []; set({ myName: '', mine: null }); get().toastMsg('This phone is reset. Cards can give again.'); get().restart('send') },
  demoFriend: async () => { const s = get(); if (!s.mine) return get().toastMsg('Hang your ornament first.')
    const name = NAMES[Math.floor(Math.random() * NAMES.length)]
    await apiPost('demo/friend', { to: s.mine.id, name, design: Math.floor(Math.random() * 8), hook: s.mine.hook + 1, text: SAMPLE_WISHES[Math.floor(Math.random() * SAMPLE_WISHES.length)] })
    get().toastMsg(`${name} hung an ornament and left a wish`); if (s.view === 'me') get().openMe(s.mine.token) },
}))

export const randomName = () => NAMES[Math.floor(Math.random() * NAMES.length)]
