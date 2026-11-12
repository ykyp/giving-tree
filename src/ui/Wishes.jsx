import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { hashStr } from '../lib/util'
import { copy, money } from '../../shared/copy.js'
const words = { ...copy, money }
import { chime, ensure } from '../lib/audio'
import { api, get, post, track, addToCalendar } from '../lib/api'
import { shared } from '../three/shared'
import { WISH_MAX, BRANCH_MAX } from '../../shared/moderation.js'
import { YEAR } from '../../shared/season.js'

const FORM_ERRORS = { already: "You've already left a wish here.", own_card: "This is your own card. Ask someone else to leave you a wish.", bad_wish: 'Keep it to 140 characters.', frozen: 'The tree has closed for this year.', slow_down: 'Slow down a little and try again shortly.' }
const formError = e => FORM_ERRORS[e.code] || "That didn't send. Check your connection and try again."
const HANDS = ['Caveat', 'Kalam', '"Shadows Into Light"']
const handFor = name => HANDS[hashStr(name.toLowerCase()) % HANDS.length]
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`
const Share = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="m16 6-4-4-4 4" /><path d="M12 2v13" /></svg>

/** A wrapped parcel in the page. `open` unties the ribbon and lifts the lid. */
function Pk({ open, small }) { return <span className={'pk' + (open ? ' open' : '') + (small ? ' small' : '')} aria-hidden="true"><i className="pk-box" /><i className="pk-rv" /><i className="pk-lid"><i className="pk-rl" /><i className="pk-bow" /></i></span> }

/* ---------- writing a wish ---------- */
function WishForm({ title, sub, placeholder, skip, onSkip, submit, to, from, sealedLine, onDone }) {
  const [text, setText] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [sent, setSent] = useState(false), ref = useRef()
  useEffect(() => { const t = setTimeout(() => ref.current?.focus(), 700); return () => clearTimeout(t) }, [])
  const go = async e => { e.preventDefault(); const t = text.trim(); if (!t || busy) return; ensure(); setBusy(true); setErr('')
    try { await submit(t); ref.current?.blur(); setSent(true); chime([784, 988, 1318.5], .12); setTimeout(onDone, 2600) } catch (x) { setErr(formError(x)); setBusy(false) } }
  if (sent) return <div className="sealed" role="status"><Pk /><div className="tag"><small>To</small> {to}{from && <><br /><small>from</small> {from}</>}</div><p>{sealedLine}</p></div>
  return (
    <form className="wishform" onSubmit={go}>
      <h3>{title}</h3><p className="sub">{sub}</p>
      <label className="vh" htmlFor="wishIn">{title}</label>
      <textarea id="wishIn" ref={ref} rows={3} value={text} maxLength={WISH_MAX} placeholder={placeholder} onChange={e => { setErr(''); setText(e.target.value) }} />
      <div className="wf-meta"><span className="err" role="alert">{err}</span><span className="count">{text.length}/{WISH_MAX}</span></div>
      <div className="btnrow"><button type="button" className="btn ghost" onClick={onSkip}>{skip}</button><button type="submit" className="btn primary" disabled={!text.trim() || busy}>Seal it</button></div>
    </form>
  )
}

export function SealSelf() {
  const s = useStore(), next = () => useStore.getState().setPhase('crown')
  return <WishForm title="Seal a wish for yourself" sub="It opens on Christmas morning." placeholder="What do you hope for next year?" skip="Skip" onSkip={next} submit={s.sealSelf} to="You" sealedLine="Sealed until Christmas morning." onDone={next} />
}
export function WishFor() {
  const s = useStore(), late = s.clock.phase !== 'advent', me = s.myName || s.mine?.name
  const next = () => { const st = useStore.getState(); if (st.view === 'open') st.openMe(st.mine.token); else st.setPhase('crown') }
  return <WishForm title={`Leave ${s.from} a wish`} sub={late ? 'They can open it straight away.' : 'It stays sealed until Christmas morning.'} placeholder={`What do you wish for ${s.from}?`} skip="Not now" onSkip={next} submit={s.sealFriend} to={s.from} from={me}
    sealedLine={late ? "It's on its way to them." : `Sealed. Only ${s.from} can read it, on 25 December.`} onDone={next} />
}

/* ---------- the invited person's first moment ---------- */
export function Meet({ brand }) {
  const s = useStore(), r = s.openResult, p = s.parent
  // a line about giving appears only on a tree that has giving switched on
  const line = words.openLine({ giving: s.tree.giving, result: r, from: s.from })
  const beginOwn = () => { ensure(); useStore.setState(st => ({ view: 'send', myName: '', engraveTimes: [], heroHook: -1, focus: null, poi: null, cardP: null, run: st.run + 1 })); useStore.getState().setPhase('choose') }
  const late = s.clock.phase !== 'advent' // from 25 December wishes open at once, so nothing is "waiting"
  const waitingLine = !late && p.waiting > 0 ? ` ${plural(p.waiting, 'wish', 'wishes')} waiting for them already.` : ''
  return (
    <div className="finale on">
      <div className="greet"><div className="hc small">{s.thanksFrom ? `Thank you from ${s.from}` : `${s.from}'s ornament`}</div>{p.branch.name && <div className="nm small">{p.branch.name}</div>}</div>
      <div className="foot">
        {line && <div className={'gift' + (line.given ? '' : ' muted')}><span className="tile" /><p>{line.text}</p></div>}
        {p.own || p.left ? <>
          <p className="note">{p.left ? (late ? `You've left ${s.from} a wish.` : `Your wish for ${s.from} is sealed.`) : 'This is the page the people you invite will see.'}</p>
          {s.mine && <button type="button" className="btn primary" onClick={() => s.openMe(s.mine.token)}>Go to my branch</button>}
        </> : s.mine ? <button type="button" className="btn primary" onClick={() => s.setPhase('wishfor')}>Leave {s.from} a wish</button>
          : <><p className="note">Hang yours next to {s.from}'s and leave them a wish{late ? '' : ' for Christmas morning'}.{waitingLine}</p><button type="button" className="btn primary" onClick={beginOwn}>Hang yours next to {s.from}'s</button></>}
      </div>
    </div>
  )
}

/* ---------- your branch ---------- */
export function BranchCounter({ count }) {
  const s = useStore(), [edit, setEdit] = useState(false), [v, setV] = useState(''), [err, setErr] = useState('')
  const save = async e => { e.preventDefault(); try { await s.nameBranch(v.trim()); setEdit(false) } catch (x) { setErr(x.code === 'bad_name' ? "That name can't go on a branch." : "That didn't save. Try again.") } }
  return (
    <div className="bcount">
      <div className="bc-l"><span>{s.branchName || 'Your branch'}: <b>{plural(count, 'ornament')}</b></span>
        <span className="hooks" aria-label="Three empty hooks, waiting for the people you invite">{[0, 1, 2].map(i => <svg key={i} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v6a3 3 0 1 1-3 3" /></svg>)}</span></div>
      {edit ? <form className="bc-f" onSubmit={save}><label className="vh" htmlFor="brIn">Branch name</label><input id="brIn" autoFocus value={v} maxLength={BRANCH_MAX} placeholder="The Georgiou family" onChange={e => { setErr(''); setV(e.target.value) }} /><button type="submit" className="btn text">Save</button>{err && <span className="err" role="alert">{err}</span>}</form>
        : <button type="button" className="btn text" onClick={() => { setV(s.branchName || ''); setEdit(true) }}>{s.branchName ? 'Rename' : 'Name your branch'}</button>}
    </div>
  )
}

/** End of visit 1: the invitation, then keeping your own link. */
export function Greeting({ brand }) {
  const s = useStore(), [share, setShare] = useState(false), [save, setSave] = useState(false), asked = useRef(false), walkAfter = useRef(false)
  const withCard = async fn => { try { await s.createCard(); fn() } catch (e) { s.toastMsg("We couldn't save your ornament. Check your connection.") } }
  const closeSave = () => { setSave(false); if (walkAfter.current) s.setPhase('explore') }
  const walk = () => { if (asked.current) return s.setPhase('explore'); asked.current = true; walkAfter.current = true; withCard(() => setSave(true)) }
  const closeShare = () => { setShare(false); if (!asked.current) { asked.current = true; setSave(true) } }
  return (<>
    <div className="finale on">
      <div className="greet"><div className="hc">{s.clock.phase === 'nye' ? 'Happy New Year' : 'Happy Christmas'}</div><div className="nm">from {s.myName}</div></div>
      <div className="foot">
        <BranchCounter count={1} />
        <p className="note">{words.greetingNote({ giving: s.tree.giving })}</p>
        <button type="button" className="btn primary" onClick={() => withCard(() => setShare(true))}><Share />Invite people to your branch</button>
        <div className="btnrow"><button type="button" className="btn ghost" onClick={walk}>Walk around</button><button type="button" className="btn ghost" onClick={() => { asked.current = true; withCard(() => setSave(true)) }}>Save my link</button></div>
      </div>
    </div>
    {share && <ShareSheet kind="invite" brand={brand} onClose={closeShare} />}
    {save && <SaveLink brand={brand} onClose={closeSave} />}
  </>)
}

export function ShareSheet({ kind, brand, onClose }) {
  const s = useStore(), cv = useRef(), thanks = kind === 'thanks', c = s.mine, stats = s.me?.stats, nye = s.clock.phase === 'nye'
  const link = s.cardLink(c.id, thanks), waiting = s.parcels.filter(p => p.kind === 'friend').length, names = s.me?.branch.kids.map(k => k.name) || []
  const giving = s.tree.giving, late = s.clock.phase !== 'advent', given = stats?.given || 0
  const text = thanks ? words.thanks({ giving, given, nye }) : words.invite({ late })
  useEffect(() => { const snap = shared.snapshot?.(); const x = cv.current?.getContext('2d'); if (!x) return
    x.fillStyle = '#0a1030'; x.fillRect(0, 0, 600, 314); if (snap) x.drawImage(snap, 0, 0, 600, 314)
    const g = x.createLinearGradient(0, 150, 0, 314); g.addColorStop(0, 'rgba(5,8,25,0)'); g.addColorStop(1, 'rgba(5,8,25,.88)'); x.fillStyle = g; x.fillRect(0, 0, 600, 314)
    x.fillStyle = '#ffe3ad'; x.font = '56px "Great Vibes", cursive'; x.fillText(thanks ? `${s.branchName || `${s.myName}'s branch`}` : s.myName, 26, 268)
    x.fillStyle = '#e8ebf5'; x.font = '500 21px "Bricolage Grotesque", sans-serif'; x.fillText(thanks ? `${names.slice(0, 5).join(' · ')}${names.length > 5 ? ' …' : ''}` : late ? 'Leave me a wish' : `${plural(waiting, 'wish', 'wishes')} waiting`, 28, 298)
    post(`me/${c.token}/preview`, { kind, jpeg: cv.current.toDataURL('image/jpeg', .72) }).catch(() => {}) }, [])
  const sent = () => track(thanks ? 'share_v2' : 'share_v1', s.tree.slug)
  const tryShare = async () => { sent(); try { if (navigator.share) { await navigator.share({ title: 'The Giving Tree', text, url: link }); return } } catch (e) { return } s.toastMsg("Your phone's share sheet opens here on the live site.") }
  const copy = () => { sent(); try { navigator.clipboard.writeText(`${text} ${link}`).then(() => s.toastMsg('Link copied'), () => s.toastMsg(link)) } catch (e) { s.toastMsg(link) } }
  return (
    <div className="sheetmodal" role="dialog" aria-label={thanks ? 'Send your thank-you card' : 'Invite people to your branch'}>
      <div className="sm-in">
        <button type="button" className="x" aria-label="Close" onClick={onClose}>×</button>
        <h3>{thanks ? (nye ? 'Happy New Year from our branch' : 'Your thank-you card') : 'Your invitation is ready'}</h3>
        <p className="sub">{thanks ? 'One card for everyone on your branch, or send it to the family group.' : 'This is what it looks like when you send it.'}</p>
        <div className="chat"><div className="bubble">
          <div className="prev"><canvas ref={cv} width={600} height={314} /><div className="pt"><b>{words.previewTitle({ name: s.myName, branchName: s.branchName, thanks })}</b><span>{words.previewText({ giving, thanks, waiting, given, late })} Best with the sound on.</span><em>{location.host}</em></div></div>
          <div className="msg">{text} <span className="u">{link}</span></div><div className="time">✓✓</div>
        </div></div>
        <div className="btnrow"><button type="button" className="btn primary" onClick={tryShare}>Share</button><button type="button" className="btn ghost" onClick={copy}>Copy link</button></div>
        {!thanks && <button type="button" className="btn text" onClick={() => s.openCard(c.id, { preview: true })}>See what they'll see →</button>}
      </div>
    </div>
  )
}

/** Three ways to find your branch again on 25 December. None needs an account. */
export function SaveLink({ brand, onClose }) {
  const s = useStore(), c = s.mine, url = `${location.origin}/me/${c.token}`, [email, setEmail] = useState(''), [news, setNews] = useState(false), [err, setErr] = useState(''), [saved, setSaved] = useState(!!s.me?.reminded)
  const self = async () => { track('saved_selfsend', s.tree.slug); const text = `My Giving Tree wishes open on Christmas morning 🎁 ${url}`
    try { if (navigator.share) { await navigator.share({ title: 'My Christmas link', text }); return } } catch (e) { return } window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener') }
  const remind = async e => { e.preventDefault(); try { await post(`me/${c.token}/reminder`, { email, news }); setSaved(true) } catch (x) { setErr(x.code === 'bad_email' ? "That doesn't look like an email address." : "That didn't save. Try again.") } }
  return (
    <div className="sheetmodal" role="dialog" aria-label="Save your Christmas link">
      <div className="sm-in">
        <button type="button" className="x" aria-label="Close" onClick={onClose}>×</button>
        <h3>Save your Christmas link</h3>
        <p className="sub">Your wishes open on 25 December, on your own private page.</p>
        <button type="button" className="btn primary" onClick={() => { track('saved_calendar', s.tree.slug); addToCalendar(c.token) }}>Add to calendar</button>
        <button type="button" className="btn ghost" onClick={self}>Send it to myself</button>
        {api.info.email && (saved ? <p className="note">We'll email you once, on 25 December, with your link.</p> :
          <form className="remind" onSubmit={remind}>
            <label htmlFor="remIn">We'll email you once, on 25 December, with your link. Nothing else.</label>
            <div className="btnrow"><input id="remIn" className="field" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => { setErr(''); setEmail(e.target.value) }} /><button type="submit" className="btn ghost" disabled={!email}>Remind me</button></div>
            {s.tree.giving && <label className="tick"><input type="checkbox" checked={news} onChange={e => setNews(e.target.checked)} /> Also send me news from {s.tree.giving.sponsor}</label>}
            <p className="err" role="alert">{err}</p>
          </form>)}
        <p className="fine">If you lose this link and change phones, your wishes can't be recovered. On this phone, your original card link will still find your branch. {api.info.email ? 'Emails are deleted on 1 February.' : ''}</p>
      </div>
    </div>
  )
}

const Tags = ({ list }) => <div className="tags">{list.map(p => <span key={p.id} className="tagchip"><Pk small />{p.kind === 'self' ? 'You' : p.from}</span>)}</div>

/** Coming back before Christmas: the parcels pile up, but nothing opens. */
export function Home({ brand }) {
  const s = useStore(), [share, setShare] = useState(false), [save, setSave] = useState(false), friends = s.parcels.filter(p => p.kind === 'friend')
  return (<>
    <div className="finale on">
      <div className="greet"><div className="hc small">{s.branchName || `${s.myName}'s branch`}</div></div>
      <div className="foot">
        {s.parcels.length > 0 && <Tags list={s.parcels} />}
        <p className="waiting">{friends.length ? plural(friends.length, 'wish', 'wishes') + ' waiting' : 'No wishes yet'} · opens 25 December</p>
        <BranchCounter count={s.me.stats.ornaments} />
        <button type="button" className="btn primary" onClick={() => setShare(true)}><Share />Invite more people</button>
        <div className="btnrow"><button type="button" className="btn ghost" onClick={() => s.setPhase('explore')}>Walk around</button><button type="button" className="btn ghost" onClick={() => setSave(true)}>Save my link</button></div>
      </div>
    </div>
    {share && <ShareSheet kind="invite" brand={brand} onClose={() => setShare(false)} />}
    {save && <SaveLink brand={brand} onClose={() => setSave(false)} />}
  </>)
}

/* ---------- Christmas morning ---------- */
function WishCard({ p, closeLabel, onClose, canReport }) {
  const s = useStore(), self = p.kind === 'self', [confirm, setConfirm] = useState(false)
  useEffect(() => { chime([1046.5, 1318.5, 1568], .1, .09) }, [p.id])
  return (
    <div className="wishmodal" role="dialog" aria-label={self ? 'The wish you sealed' : `Wish from ${p.from}`}>
      <Pk open />
      <div className="paper">
        <p className="w-text" style={{ fontFamily: handFor(p.from) }}>{p.text}</p>
        <p className="w-from" style={{ fontFamily: handFor(p.from) }}>{self ? 'You, in December' : p.from}</p>
      </div>
      <div className="w-actions">
        <button type="button" className="btn primary" onClick={onClose}>{closeLabel}</button>
        {canReport && (confirm ? <button type="button" className="btn text" onClick={() => s.reportWish(p.id)}>Yes, report this wish</button> : <button type="button" className="btn text" onClick={() => setConfirm(true)}>Report</button>)}
      </div>
    </div>
  )
}

export function Parcels() {
  const s = useStore(), friends = s.parcels.filter(p => p.kind === 'friend'), left = friends.filter(p => !p.opened), open = s.parcels.find(p => p.id === s.wishOpen)
  return (<>
    <div className="finale on">
      <div className="greet"><div className="hc small">{s.clock.phase === 'nye' ? 'Happy New Year' : 'Happy Christmas'}, {s.myName}</div></div>
      <div className="foot">
        <p className="waiting">{left.length ? `${plural(left.length, 'wish', 'wishes')} to open` : 'All your wishes are open'}</p>
        <div className="rail">{friends.map(p => <button key={p.id} type="button" className={'ptag' + (p.opened ? ' done' : '')} aria-label={`${p.opened ? 'Read again' : 'Open'} the wish from ${p.from}`} onClick={() => { ensure(); s.openParcel(p.id) }}><Pk small open={p.opened} /><span>{p.from}</span></button>)}</div>
        {left.length ? <button type="button" className="btn text" onClick={() => s.setPhase('gave')}>Save the rest for later</button>
          : <button type="button" className="btn primary" onClick={() => s.setPhase('gave')}>See what your branch gave</button>}
      </div>
    </div>
    {open && <WishCard p={open} canReport closeLabel={left.length ? 'Next wish' : 'Close'} onClose={() => useStore.setState({ wishOpen: null })} />}
  </>)
}

export function Gave() {
  const s = useStore(), sum = words.summary({ giving: s.tree.giving, stats: s.me.stats })
  return (
    <div className="finale on">
      <div className="greet" />
      <div className="foot">
        <div className="gavecard">
          <h3>{s.branchName || 'Your branch'}</h3>
          <div className={'stats ' + (sum.figures.length === 3 ? 'three' : '')}>{sum.figures.map(([n, label]) => <div className="stat" key={label}><b>{n}</b><span>{label}</span></div>)}</div>
          <p>{sum.line}</p>
        </div>
        <button type="button" className="btn primary" onClick={() => s.setPhase('thanks')}>Say thank you</button>
      </div>
    </div>
  )
}

export function Thanks({ brand }) {
  const s = useStore(), [share, setShare] = useState(false), names = s.me.branch.kids.map(k => k.name), nye = s.clock.phase === 'nye'
  return (<>
    <div className="finale on">
      <div className="greet" />
      <div className="foot">
        <div className="tycard">
          <div className="hc small">{nye ? 'Happy New Year' : 'Thank you'}</div>
          <div className="nm small">from {s.branchName || 'our branch'}</div>
          {names.length > 0 && <p className="ty-names">{[s.myName, ...names].join(' · ')}</p>}
        </div>
        <button type="button" className="btn primary" onClick={() => setShare(true)}><Share />Send a thank-you card</button>
        <button type="button" className="btn ghost" onClick={s.nextAfterThanks}>Not now</button>
      </div>
    </div>
    {share && <ShareSheet kind="thanks" brand={brand} onClose={() => { setShare(false); s.nextAfterThanks() }} />}
  </>)
}

export function SelfCoda() {
  const s = useStore(), p = s.parcels.find(x => x.kind === 'self'), open = s.wishOpen === p?.id
  if (!p) return null
  return (<>
    <div className="finale on"><div className="greet" /><div className="foot">
      <p className="waiting">One more. You sealed this in December.</p>
      <div className="rail"><button type="button" className="ptag" aria-label="Open the wish you wrote yourself" onClick={() => s.openParcel(p.id)}><Pk small /><span>You</span></button></div>
    </div></div>
    {open && <WishCard p={p} closeLabel="Close" onClose={() => { useStore.setState({ wishOpen: null }); useStore.getState().setPhase('explore') }} />}
  </>)
}

/* ---------- after New Year ---------- */
export function Keepsake() {
  const s = useStore(), [d, setD] = useState(null), slug = s.tree.slug
  useEffect(() => { let on = true; get(`keepsake/${slug}`).then(r => on && setD(r)).catch(() => on && setD({ tree: s.tree, counts: s.counts, names: [] })); return () => { on = false } }, [slug])
  return (
    <div className="keepsake">
      <div className="ks-in">
        <h2>{d && d.tree.kind !== 'global' ? `${d.tree.name}, ${YEAR}` : `The ${YEAR} Giving Tree`}</h2>
        {d && <><p className="ks-total">{d.tree.giving ? words.money(d.tree.giving.given) : d.counts.ornaments.toLocaleString('en-GB')}</p><p className="sub">{words.keepsake({ giving: d.tree.giving, counts: d.counts })}</p>
          {s.mine && <button type="button" className="btn primary" onClick={() => s.openMe(s.mine.token)}>See my branch</button>}
          {d.names.length > 0 && <p className="ks-names">{d.names.join(' · ')}</p>}</>}
      </div>
    </div>
  )
}
