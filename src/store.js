import { create } from 'zustand'
import { hashStr, now } from './lib/util'
import { api, bootApi, get as apiGet, post as apiPost, newDeviceId } from './lib/api'
import { clockOf, localDay } from '../shared/season.js'

const lsGet = k => { try { return localStorage.getItem(k) } catch (e) { return null } }
const lsSet = (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} }
/** The device remembers its own branch on each tree, so the original link finds it again. */
const allMine = () => { try { return JSON.parse(lsGet('gt3-mine') || '{}') } catch (e) { return {} } }
const saveMine = (c, treeName) => lsSet('gt3-mine', JSON.stringify({ ...allMine(), [c.tree]: { id: c.id, token: c.token, name: c.name, design: c.design, hook: c.hook, parent: c.parent, tree: c.tree, treeName: treeName || allMine()[c.tree]?.treeName } }))
/** A wish someone sent, waiting for this phone to hang an ornament (set by the sent-wish page). */
export const pendingSent = slug => { try { const p = JSON.parse(sessionStorage.getItem('gt-sent') || 'null'); return p && p.tree === slug ? p : null } catch (e) { return null } }
const forgetMine = slug => { const all = allMine(); delete all[slug]; lsSet('gt3-mine', JSON.stringify(all)) }
export const mineFor = slug => allMine()[slug] || null

export const GLOBAL = { slug: 'global', name: 'The Giving Tree', kind: 'global', giving: null }
let demoDate = lsGet('gt-demo-date') || '', ticking = null, polling = null
const clockNow = () => demoDate ? new Date(demoDate) : new Date()
const today = () => localDay(clockNow())
const wrapUp = s => s.parcels.find(p => p.kind === 'self' && !p.opened) ? 'selfwish' : 'explore'
/** Screens where the whole tree is in view, so newly hung ornaments are worth fetching. */
const WATCHING = new Set(['greeting', 'explore', 'branch', 'crown', 'dark'])

/**
 * Flow phases
 * sender:    arrival → dark → lighting → choose → engrave → hang → settling → seal → crown → crowning → greeting → (explore)
 * invited:   arrival → dark → lighting → gift → unwrap → meet → choose → engrave → hang (on the sender's branch) → settling → wishfor → crown → crowning → greeting
 * my branch: mearrive → branch (before Christmas) | parcels → gave → thanks → selfwish → explore (from Christmas)
 * tree page, keepsake: explore
 */
export const useStore = create((set, get) => ({
  view: 'send', from: '',
  phase: 'arrival', phaseAt: 0, run: 0,
  sel: 0, design: 0, myName: '', engraveTimes: [],
  heroHook: -1, openResult: null,
  sound: true, tier: 'auto', fps: 60,
  focus: null, poi: null, exploreMode: 'walk', toast: null, toastAt: 0, sheetOpen: false, linkPreview: null,
  tick: 0,
  // the tree, as the server has it. Nothing here is invented.
  tree: GLOBAL, counts: { ornaments: 0, wishes: 0 }, ornaments: [], cursor: 0, treeRev: 0, arrivals: [],
  // the two visits
  apiInfo: null, unreachable: false, clock: clockOf(clockNow()), demoDate,
  mine: null, cardP: null, parent: null, thanksFrom: null, me: null, parcels: [], wishOpen: null, branchName: null,
  // wishing: the ornaments on this tree this phone has wished, the one being wished now, and the name last signed with
  wished: [], wishTo: null, treeShare: false, wisher: lsGet('gt3-wisher') || '', made: null,
  branchView: null, // { hook, owner?, kids } the branch shown on the tree (no owner: the hero ornament is the owner)

  setPhase: phase => set({ phase, phaseAt: now() }),
  restart: (view = get().view) => set(s => ({ view, phase: view === 'tree' || view === 'keepsake' ? 'explore' : 'arrival', phaseAt: now(), run: s.run + 1, heroHook: -1, openResult: null, focus: null, poi: null, exploreMode: view === 'keepsake' ? 'orbit' : 'walk',
    engraveTimes: [], myName: view === 'send' ? '' : s.myName, design: view === 'open' ? (s.parent ? s.parent.design : hashStr(s.from.toLowerCase()) % 8) : s.design,
    parent: view === 'open' ? s.parent : null, branchView: view === 'open' ? s.branchView : null, cardP: null, me: null, parcels: [], wishOpen: null, branchName: null, mine: mineFor(s.tree.slug) })),
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
    if (!api.info.testMode) demoDate = ''
    set({ apiInfo: api.info, unreachable: false, demoDate }); get().tickClock()
    if (!ticking) ticking = setInterval(() => get().tickClock(), 30000)
    if (!polling) polling = setInterval(() => get().pollTree(), 8000)
    await get().route()
  },
  /**  /  the global tree  ·  /t/{slug}  a community's tree  ·  /c/{id}  a card  ·  /me/{token}  your own branch  */
  route: async () => {
    const m = location.pathname.match(/^\/(c|me|t)\/([\w-]+)/), q = new URLSearchParams(location.search)
    if (m?.[1] === 'me') return get().openMe(m[2])
    if (m?.[1] === 'c') return get().openCard(m[2], { thanks: q.has('t'), preview: q.has('preview') })
    return get().openTree(m?.[1] === 't' ? m[2] : 'global')
  },
  tickClock: () => { const c = clockOf(clockNow()), o = get().clock; if (c.phase !== o.phase || c.pulse !== o.pulse || c.day !== o.day) set({ clock: c }) },

  /** Loads a tree from the server: its name, what it shows of giving (usually nothing), and the ornaments really on it. */
  loadTree: async slug => {
    let t
    try { t = await apiGet(`tree/${slug}`) } catch (e) {
      if (e.code !== 'no_tree' || slug === 'global') throw e
      get().toastMsg("We couldn't find that tree, so here's the Giving Tree."); t = await apiGet('tree/global')
    }
    set(s => ({ tree: t.tree, counts: t.counts, ornaments: t.ornaments, cursor: t.cursor, treeRev: s.treeRev + 1, mine: mineFor(t.tree.slug), wished: t.wished || [] }))
    return t.tree
  },
  /** Arriving at a tree. A phone that already has a branch here goes to it; after New Year everyone gets the keepsake. */
  openTree: async (slug, { fresh = false } = {}) => {
    let tree; try { tree = await get().loadTree(slug) } catch (e) { return set({ unreachable: true }) }
    const mine = mineFor(tree.slug)
    if (mine && !fresh) return get().openMe(mine.token)
    get().restart(get().clock.phase === 'keepsake' ? 'keepsake' : 'send')
    // arriving to hang an ornament a friend made: their choice is selected and the name is on it; both can be changed
    const made = pendingSent(tree.slug)
    if (made && get().view === 'send') { set({ made: Number.isInteger(made.design) ? made : null, ...(Number.isInteger(made.design) ? { sel: made.design, design: made.design } : {}) }); if (made.to) get().typeName(made.to) }
  },
  /** New ornaments hung by other people, while the tree is on screen. */
  pollTree: async () => {
    const s = get(); if (s.unreachable || !s.apiInfo || document.hidden || !WATCHING.has(s.phase)) return
    let t; try { t = await apiGet(`tree/${s.tree.slug}?since=${s.cursor}`) } catch (e) { return }
    if (get().tree.slug !== t.tree.slug) return
    const known = new Set(get().ornaments.map(o => o.id)), fresh = t.ornaments.filter(o => !known.has(o.id))
    set(st => ({ tree: t.tree, counts: t.counts, cursor: t.cursor, ornaments: [...fresh, ...st.ornaments].slice(0, 200), arrivals: fresh.filter(o => o.id !== st.mine?.id), tick: st.tick + 1, wished: t.wished || st.wished }))
  },

  /** Someone arrives on a card link. */
  openCard: async (id, { thanks = false, preview = false } = {}) => {
    let card; try { card = await apiGet(`card/${id}`) } catch (e) { get().toastMsg("We couldn't find that card."); return get().openTree('global') }
    try { await get().loadTree(card.tree.slug) } catch (e) { return set({ unreachable: true }) }
    const mine = mineFor(card.tree.slug)
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

  /** Someone arrives on their private Christmas link. */
  openMe: async (token, thanksFrom = null) => {
    let m; try { m = await apiGet(`me/${token}?day=${today()}`) } catch (e) { get().toastMsg("We couldn't find that ornament."); forgetMine(get().tree.slug); set({ mine: null }); return get().restart('send') }
    if (m.removed) { forgetMine(m.tree.slug); try { await get().loadTree(m.tree.slug) } catch (e) {} get().toastMsg('That ornament has been removed.'); return get().restart('send') }
    const c = m.card; saveMine(c, m.tree.name)
    if (get().tree.slug !== c.tree || !get().treeRev) { try { await get().loadTree(c.tree) } catch (e) {} }
    if (get().clock.phase === 'keepsake' && !m.wishes.length) return get().restart('keepsake')
    set(s => ({ view: 'me', tree: m.tree, counts: m.counts, me: m, mine: mineFor(c.tree), myName: c.name, design: c.design, sel: c.design, heroHook: c.hook, parcels: m.wishes, wishOpen: null, branchName: m.branch.name, parent: null, focus: null, poi: null, exploreMode: 'walk',
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
    const sent = pendingSent(s.tree.slug)
    const p = apiPost('card', { tree: s.tree.slug, name: s.myName, design: s.design, hook: s.heroHook, parent: s.parent?.id, ...(sent ? { sent: sent.token } : {}) })
      .then(c => { saveMine(c, get().tree.name); set(st => ({ made: null, mine: mineFor(c.tree), counts: { ...st.counts, ornaments: st.counts.ornaments + 1 } }))
        if (sent) { try { sessionStorage.removeItem('gt-sent') } catch (e) {}
          if (c.sent === 'ok') { set(st => ({ parcels: [...st.parcels, { id: 'sent-' + sent.token.slice(0, 6), from: sent.from, kind: 'friend', opened: false }] })); get().toastMsg(`${sent.from}'s wish is under your ornament`) } }
        return c }).catch(e => { set({ cardP: null }); throw e })
    set({ cardP: p }); return p
  },
  cardLink: (id, thanks) => `${location.origin}/c/${id}${thanks ? '?t=1' : ''}`,
  /** Tells the server this card was opened. Whether that gives anything is the server's call (usually there is nothing to give). */
  tryOpen: () => {
    const s = get(); if (!s.parent) return
    apiPost('open', { id: s.parent.id }).then(r => set(st => ({ openResult: r, tree: r.tree || st.tree, tick: st.tick + 1 }))).catch(() => set({ openResult: { counted: false, reason: 'error' } }))
  },
  sealSelf: async text => { const c = await get().createCard(); const r = await apiPost(`me/${c.token}/wish`, { text }); set(s => ({ parcels: [...s.parcels, { id: r.id, from: s.myName, kind: 'self', opened: false }] })) },
  /** Leaves a wish under someone's ornament. `from` is the name it is signed with. */
  sealTo: async (id, text, from) => { await apiPost('wish', { to: id, from, text }); lsSet('gt3-wisher', from)
    set(st => ({ wisher: from, wished: st.wished.includes(id) ? st.wished : [...st.wished, id], parent: st.parent?.id === id ? { ...st.parent, left: true } : st.parent })) },
  sealFriend: (text, from) => { const s = get(); return s.sealTo(s.parent.id, text, from || s.mine?.name || s.myName) },
  /** Starts hanging this phone's own ornament, with the name it has already signed a wish with. */
  beginOwn: () => { set(st => ({ view: 'send', myName: '', engraveTimes: [], heroHook: -1, focus: null, poi: null, cardP: null, wishTo: null, run: st.run + 1 })); const s = get(); if (s.wisher) s.typeName(s.wisher); s.setPhase('choose') },
  nameBranch: async name => { const c = get().mine || await get().createCard(); const r = await apiPost(`me/${c.token}/branch`, { name }); set({ branchName: r.name }) },

  // ---- visit 2 ----
  openParcel: id => { const s = get(), p = s.parcels.find(x => x.id === id); if (!p) return; set({ wishOpen: id })
    if (!p.opened) { set(st => ({ parcels: st.parcels.map(x => x.id === id ? { ...x, opened: true } : x) })); apiPost(`me/${s.mine.token}/opened`, { id, day: today() }).catch(() => {}) } },
  reportWish: async id => { const s = get(); try { await apiPost(`me/${s.mine.token}/report`, { id, day: today() }); set(st => ({ parcels: st.parcels.filter(p => p.id !== id), wishOpen: null })); get().toastMsg("Thanks. We've taken it down and will review it.") } catch (e) { get().toastMsg("That didn't send. Try again.") } },

  // ---- test mode only (the panel that calls these is not shown on the public site) ----
  setDemoDate: v => { demoDate = v; lsSet('gt-demo-date', v); api.clockIso = v ? new Date(v).toISOString() : null; set({ demoDate: v }); get().tickClock(); const s = get()
    if (s.view === 'me' && s.mine) return get().openMe(s.mine.token); if (s.clock.phase === 'keepsake') return get().restart('keepsake'); if (s.view === 'keepsake') get().restart('send'); else get().restart() },
  openDemo: async name => { const s = get(); const { id } = await apiPost('demo/card', { tree: s.tree.slug, name, design: hashStr(name.toLowerCase()) % 8, hook: 24 }); get().openCard(id, { preview: true }) },
  resetDevice: () => { newDeviceId(); lsSet('gt3-mine', '{}'); set({ myName: '', mine: null }); get().toastMsg('This phone is reset: it is a new visitor.'); get().openTree(get().tree.slug) },
  demoFriend: async (name, text) => { const s = get(); if (!s.mine) return get().toastMsg('Hang your ornament first.')
    await apiPost('demo/friend', { to: s.mine.id, name, design: Math.floor(Math.random() * 8), hook: s.mine.hook + 1, text })
    get().toastMsg(`${name} hung an ornament and left a wish`); if (s.view === 'me') get().openMe(s.mine.token) },
}))
