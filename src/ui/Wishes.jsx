import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { hashStr } from '../lib/util'
import { copy, money } from '../../shared/copy.js'
const words = { ...copy, money }
import { chime, ensure } from '../lib/audio'
import { api, get, post, track, addToCalendar } from '../lib/api'
import { uploadCardPreview, PREVIEW_W, PREVIEW_H } from '../lib/preview'
import { WISH_MAX } from '../../shared/moderation.js'
import { YEAR } from '../../shared/season.js'
import { daysToChristmas } from '../../shared/season.js'
import ShareRow from './ShareRow'

const FORM_ERRORS = { bad_name: "That name can't be used. Try your first name.", already: "You've already left a wish here.", own_card: "This is your own ornament. Ask someone else to leave you a wish.", bad_wish: 'Keep it to 140 characters.', frozen: 'The tree has closed for this year.', slow_down: 'Slow down a little and try again shortly.' }
const formError = e => FORM_ERRORS[e.code] || "That didn't send. Check your connection and try again."
const HANDS = ['Caveat', 'Kalam', '"Shadows Into Light"']
const handFor = name => HANDS[hashStr(name.toLowerCase()) % HANDS.length]
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`
/** The two lines on a card's picture. */
const previewWords = (s, thanks) => thanks
  ? { title: s.branchName || s.myName, line: (() => { const n = (s.me?.branch.kids || []).map(k => k.name); return n.length ? `Thank you, ${n.slice(0, 4).join(', ')}${n.length > 4 ? ' and everyone' : ''}` : 'Thank you' })() }
  : { title: s.myName, line: s.clock.phase === 'advent' ? 'hung an ornament. Leave a wish for Christmas.' : 'hung an ornament. Leave a wish.' }
const firstWord = v => v.replace(/[^\p{L}' -]/gu, '').replace(/\s.*/, '').slice(0, 12)
/** Days to Christmas by the page's clock (which the test panel can move). */
const daysLeft = s => { const [y, m, d] = s.clock.day.split('-').map(Number); return daysToChristmas(new Date(y, m - 1, d)) }
const Share = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="m16 6-4-4-4 4" /><path d="M12 2v13" /></svg>

/** A wrapped parcel in the page. `open` unties the ribbon and lifts the lid. */
function Pk({ open, small }) { return <span className={'pk' + (open ? ' open' : '') + (small ? ' small' : '')} aria-hidden="true"><i className="pk-box" /><i className="pk-rv" /><i className="pk-lid"><i className="pk-rl" /><i className="pk-bow" /></i></span> }

/* ---------- writing a wish ---------- */
/** `askName`: this phone has no ornament here, so the wish is signed with a first name typed in the form. */
function WishForm({ title, sub, placeholder, skip, onSkip, submit, to, from, askName, sealedLine, onDone }) {
  const [text, setText] = useState(''), [name, setName] = useState(() => useStore.getState().wisher), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [sent, setSent] = useState(false), ref = useRef(), nameRef = useRef()
  useEffect(() => { const t = setTimeout(() => (askName && !name ? nameRef : ref).current?.focus(), 700); return () => clearTimeout(t) }, [])
  const signed = askName ? name.trim() : from
  const go = async e => { e.preventDefault(); const t = text.trim(); if (!t || busy || !signed) return; ensure(); setBusy(true); setErr('')
    try { await submit(t, signed); ref.current?.blur(); setSent(true); chime([784, 988, 1318.5], .12); setTimeout(onDone, 2600) } catch (x) { setErr(formError(x)); setBusy(false) } }
  if (sent) return <div className="sealed" role="status"><Pk /><div className="tag"><small>To</small> {to}{signed && <><br /><small>from</small> {signed}</>}</div><p>{sealedLine}</p></div>
  return (
    <form className="wishform" onSubmit={go}>
      <h3>{title}</h3><p className="sub">{sub}</p>
      {askName && <div className="wf-name"><label htmlFor="wishName">Your first name</label><input id="wishName" ref={nameRef} className="field" value={name} maxLength={12} autoComplete="given-name" autoCapitalize="words" onChange={e => { setErr(''); setName(firstWord(e.target.value)) }} /></div>}
      <label className="vh" htmlFor="wishIn">{title}</label>
      <textarea id="wishIn" ref={ref} rows={3} value={text} maxLength={WISH_MAX} placeholder={placeholder} onChange={e => { setErr(''); setText(e.target.value) }} />
      <div className="wf-meta"><span className="err" role="alert">{err}</span><span className="count">{text.length}/{WISH_MAX}</span></div>
      <div className="btnrow"><button type="button" className="btn ghost" onClick={onSkip}>{skip}</button><button type="submit" className="btn primary" disabled={!text.trim() || !signed || busy}>Seal it</button></div>
    </form>
  )
}

export function SealSelf() {
  const s = useStore(), next = () => useStore.getState().setPhase('crown')
  return <WishForm title="Seal a wish for yourself" sub="It opens on Christmas morning." placeholder="What do you hope for next year?" skip="Skip" onSkip={next} submit={s.sealSelf} to="You" sealedLine="Sealed until Christmas morning." onDone={next} />
}
export function WishFor() {
  // signed with this phone's ornament if it has one (or the one being hung right now); otherwise the form asks
  const s = useStore(), late = s.clock.phase !== 'advent', me = s.mine?.name || (s.view === 'send' ? s.myName : '')
  // wished before hanging: back to the friend's ornament, which now offers to hang yours
  const next = () => { const st = useStore.getState(); if (st.view !== 'open') st.setPhase('crown'); else if (st.mine) st.openMe(st.mine.token); else st.setPhase('meet') }
  return <WishForm title={`Leave ${s.from} a wish`} sub={late ? 'They can open it straight away.' : 'It stays sealed until Christmas morning.'} placeholder={`What do you wish for ${s.from}?`} skip="Not now" onSkip={next} submit={s.sealFriend} to={s.from} from={me} askName={!me}
    sealedLine={late ? "It's on its way to them." : `Sealed. Only ${s.from} can read it, on 25 December.`} onDone={next} />
}

/* ---------- the invited person's first moment ---------- */
export function Meet({ brand }) {
  const s = useStore(), r = s.openResult, p = s.parent
  // a line about giving appears only on a tree that has giving switched on
  const line = words.openLine({ giving: s.tree.giving, result: r, from: s.from })
  const late = s.clock.phase !== 'advent' // from 25 December wishes open at once, so nothing is "waiting"
  const waitingLine = !late && p.waiting > 0 ? ` ${plural(p.waiting, 'wish', 'wishes')} waiting for them already.` : ''
  const mine = s.mine && <button type="button" className="btn primary" onClick={() => s.openMe(s.mine.token)}>Go to my ornament</button>
  return (
    <div className="finale on">
      <div className="greet"><div className="hc small">{s.thanksFrom ? `Thank you from ${s.from}` : `${s.from}'s ornament`}</div></div>
      <div className="foot">
        {line && <div className={'gift' + (line.given ? '' : ' muted')}><span className="tile" /><p>{line.text}</p></div>}
        {p.own ? <><p className="note">This is what the people you ask will see.</p>{mine}</>
          // the wish is left: now the ornament
          : p.left ? <><p className="note">{late ? `You've left ${s.from} a wish.` : `Your wish for ${s.from} is sealed until Christmas morning.`}{!s.mine && ` Now hang yours next to ${s.from}'s, so they can send one back.`}</p>
            {mine || <button type="button" className="btn primary" onClick={s.beginOwn}>Hang my ornament</button>}</>
          // the wish comes first: it is what they were asked for
          : <><p className="note">{late ? `${s.from} would love a wish from you.` : `${s.from} would love a wish from you. It stays wrapped until Christmas morning.`}{waitingLine}</p>
            <button type="button" className="btn primary" onClick={() => s.setPhase('wishfor')}>Leave {s.from} a wish</button>
            {!s.mine && <button type="button" className="btn text" onClick={s.beginOwn}>Hang my ornament first</button>}</>}
      </div>
    </div>
  )
}

/* ---------- once your ornament is on the tree ---------- */
/** What to do next. On the shared tree: ask friends for a wish. On a tree for your people: bring them in, and wish each other. */
function NextSteps({ onAsk, onKey, onWalk }) {
  const s = useStore(), own = s.tree.kind === 'community', others = s.ornaments.some(o => o.id !== s.mine?.id), [people, setPeople] = useState(false)
  return (<>
    {own ? <><button type="button" className="btn primary" onClick={() => useStore.setState({ treeShare: true })}><Share />Invite people to this tree</button>
      {others && <button type="button" className="btn ghost" onClick={() => setPeople(true)}>Wish someone on this tree</button>}</>
      : <button type="button" className="btn primary" onClick={onAsk}><Share />Ask friends for a wish</button>}
    <div className="btnrow"><button type="button" className="btn ghost" onClick={onWalk}>Walk around</button><button type="button" className="btn ghost" onClick={onKey}>Keep my key</button></div>
    {people && <People onClose={() => setPeople(false)} />}
  </>)
}

/** End of visit 1: what to do next, then keeping your key. */
export function Greeting({ brand }) {
  useEffect(() => { const t = setTimeout(() => { const st = useStore.getState(); st.createCard().then(c => uploadCardPreview(c.token, 'invite', previewWords(useStore.getState(), false))).catch(() => {}) }, 1200); return () => clearTimeout(t) }, [])
  const s = useStore(), [share, setShare] = useState(false), [save, setSave] = useState(false), asked = useRef(false), walkAfter = useRef(false)
  const withCard = async fn => { try { await s.createCard(); fn() } catch (e) { s.toastMsg("We couldn't save your ornament. Check your connection.") } }
  const closeSave = () => { setSave(false); if (walkAfter.current) s.setPhase('explore') }
  const walk = () => { if (asked.current) return s.setPhase('explore'); asked.current = true; walkAfter.current = true; withCard(() => setSave(true)) }
  const closeShare = () => { setShare(false); if (!asked.current) { asked.current = true; setSave(true) } }
  return (<>
    <div className="finale on">
      <div className="greet"><div className="hc">{s.clock.phase === 'nye' ? 'Happy New Year' : 'Happy Christmas'}</div><div className="nm">from {s.myName}</div></div>
      <div className="foot">
        <p className="note">{words.greetingNote({ giving: s.tree.giving, own: s.tree.kind === 'community' })}</p>
        <NextSteps onAsk={() => withCard(() => setShare(true))} onWalk={walk} onKey={() => { asked.current = true; withCard(() => setSave(true)) }} />
      </div>
    </div>
    {share && <ShareSheet kind="invite" brand={brand} onClose={closeShare} />}
    {save && <SaveLink brand={brand} onClose={closeSave} />}
  </>)
}

export function ShareSheet({ kind, brand, onClose }) {
  const s = useStore(), cv = useRef(), thanks = kind === 'thanks', c = s.mine, stats = s.me?.stats, nye = s.clock.phase === 'nye'
  const link = s.cardLink(c.id, thanks), waiting = s.parcels.filter(p => p.kind === 'friend').length
  const giving = s.tree.giving, late = s.clock.phase !== 'advent', given = stats?.given || 0
  const text = thanks ? words.thanks({ giving, given, nye }) : words.invite({ late })
  // the picture a chat app will show for this link: drawn here so they see it, and sent to the server
  useEffect(() => { if (cv.current) uploadCardPreview(c.token, kind, previewWords(s, thanks), cv.current) }, [])
  return (
    <div className="sheetmodal" role="dialog" aria-label={thanks ? 'Send your thank-you card' : 'Ask friends for a wish'}>
      <div className="sm-in">
        <button type="button" className="x" aria-label="Close" onClick={onClose}>×</button>
        <h3>{thanks ? (nye ? 'Happy New Year' : 'Your thank-you card') : 'Ask for a wish'}</h3>
        <p className="sub">{thanks ? 'One card for everyone who left you a wish, or send it to the group.' : 'This is what your friends will see. They leave you a wish, then hang their own.'}</p>
        <div className="chat"><div className="bubble">
          <div className="prev"><canvas ref={cv} width={PREVIEW_W} height={PREVIEW_H} /><div className="pt"><b>{words.previewTitle({ name: s.myName, branchName: s.branchName, thanks })}</b><span>{words.previewText({ giving, thanks, waiting, given, late })}</span><em>{location.host}</em></div></div>
          <div className="msg">{text} <span className="u">{link}</span></div><div className="time">✓✓</div>
        </div></div>
        <ShareRow text={text} link={link} onShare={() => track(thanks ? 'share_v2' : 'share_v1', s.tree.slug)} />
        {!thanks && <button type="button" className="btn text" onClick={() => s.openCard(c.id, { preview: true })}>See what they'll see →</button>}
      </div>
    </div>
  )
}

/** The link of a tree made for a group: anyone who has it can hang an ornament there. */
export function TreeSheet({ onClose }) {
  const s = useStore(), link = `${location.origin}/t/${s.tree.slug}`
  return (
    <div className="sheetmodal" role="dialog" aria-label={`Invite people to ${s.tree.name}`}>
      <div className="sm-in">
        <button type="button" className="x" aria-label="Close" onClick={onClose}>×</button>
        <h3>Invite people</h3>
        <p className="sub">Anyone with this link can hang an ornament on {s.tree.name}, and everyone on the tree can leave each other a wish.</p>
        <p className="linkbox">{link}</p>
        <ShareRow text={words.treeInvite({ name: s.tree.name })} link={link} />
      </div>
    </div>
  )
}

/** Everyone else on a tree made for a group, each with one wish to leave. The same as tapping their ornament. */
export function People({ onClose }) {
  const s = useStore(), list = s.ornaments.filter(o => o.id !== s.mine?.id), late = s.clock.phase !== 'advent'
  return (
    <div className="sheetmodal" role="dialog" aria-label="Wish someone on this tree">
      <div className="sm-in">
        <button type="button" className="x" aria-label="Close" onClick={onClose}>×</button>
        <h3>Wish someone</h3>
        <p className="sub">{list.length ? (late ? 'They can open it straight away.' : 'Each wish stays wrapped under their ornament until Christmas morning.') : 'Nobody else has hung an ornament here yet.'}</p>
        <ul className="people">{list.map(o => <li key={o.id}><span>{o.name}</span>
          {s.wished.includes(o.id) ? <em>Wished ✓</em> : <button type="button" className="btn ghost" aria-label={`Leave ${o.name} a wish`} onClick={() => useStore.setState({ wishTo: { id: o.id, name: o.name } })}>Leave a wish</button>}</li>)}</ul>
      </div>
    </div>
  )
}

/** The wish form for one person on the tree, from the list or from their ornament. */
export function WishTo() {
  const s = useStore(), w = s.wishTo, late = s.clock.phase !== 'advent', me = s.mine?.name, close = () => useStore.setState({ wishTo: null })
  return (
    <div className="sheetmodal" role="dialog" aria-label={`Leave ${w.name} a wish`}>
      <div className="sm-in">
        <WishForm title={`Leave ${w.name} a wish`} sub={late ? 'They can open it straight away.' : 'It stays sealed until Christmas morning.'} placeholder={`What do you wish for ${w.name}?`} skip="Cancel" onSkip={close}
          submit={(text, from) => s.sealTo(w.id, text, from)} to={w.name} from={me} askName={!me} sealedLine={late ? "It's on its way to them." : `Sealed. Only ${w.name} can read it, on 25 December.`} onDone={close} />
      </div>
    </div>
  )
}

/** Your key: the private link that finds your ornament and its wishes again. None of the ways to keep it needs an account. */
export function SaveLink({ brand, onClose }) {
  const s = useStore(), c = s.mine, url = `${location.origin}/me/${c.token}`, [email, setEmail] = useState(''), [news, setNews] = useState(false), [err, setErr] = useState(''), [saved, setSaved] = useState(!!s.me?.reminded)
  const self = async () => { track('saved_selfsend', s.tree.slug); const text = `My key to the Giving Tree. My wishes open on Christmas morning 🎁 ${url}`
    try { if (navigator.share) { await navigator.share({ title: 'My key to the Giving Tree', text }); return } } catch (e) { return } window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener') }
  const remind = async e => { e.preventDefault(); try { await post(`me/${c.token}/reminder`, { email, news }); setSaved(true) } catch (x) { setErr(x.code === 'bad_email' ? "That doesn't look like an email address." : "That didn't save. Try again.") } }
  return (
    <div className="sheetmodal" role="dialog" aria-label="Keep your key">
      <div className="sm-in">
        <button type="button" className="x" aria-label="Close" onClick={onClose}>×</button>
        <h3>Keep your key</h3>
        <p className="sub">Your key is a private link to your ornament. It is how you come back on 25 December to open your wishes.</p>
        <button type="button" className="btn primary" onClick={() => { track('saved_calendar', s.tree.slug); addToCalendar(c.token) }}>Add to my calendar</button>
        <button type="button" className="btn ghost" onClick={self}>Send it to myself</button>
        {api.info.email && (saved ? <p className="note">We'll email you once, on 25 December, with your key.</p> :
          <form className="remind" onSubmit={remind}>
            <label htmlFor="remIn">We'll email you once, on 25 December, with your key. Nothing else.</label>
            <div className="btnrow"><input id="remIn" className="field" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => { setErr(''); setEmail(e.target.value) }} /><button type="submit" className="btn ghost" disabled={!email}>Remind me</button></div>
            {s.tree.giving && <label className="tick"><input type="checkbox" checked={news} onChange={e => setNews(e.target.checked)} /> Also send me news from {s.tree.giving.sponsor}</label>}
            <p className="err" role="alert">{err}</p>
          </form>)}
        <p className="fine">This phone remembers your ornament, so coming back here works too. If you change phones without your key, your wishes can't be recovered. {api.info.email ? 'Emails are deleted on 1 February.' : ''}</p>
      </div>
    </div>
  )
}

const Tags = ({ list }) => <div className="tags">{list.map(p => <span key={p.id} className="tagchip"><Pk small />{p.kind === 'self' ? 'You' : p.from}</span>)}</div>

/** Coming back before Christmas: the parcels pile up, but nothing opens. */
export function Home({ brand }) {
  const s = useStore(), [share, setShare] = useState(false), [save, setSave] = useState(false), friends = s.parcels.filter(p => p.kind === 'friend'), beside = s.me.branch.kids.length
  return (<>
    <div className="finale on">
      <div className="greet"><div className="hc small">{s.myName}'s ornament</div></div>
      <div className="foot">
        {s.parcels.length > 0 && <Tags list={s.parcels} />}
        <p className="waiting">{friends.length ? plural(friends.length, 'wish', 'wishes') + ' waiting' : 'No wishes yet'} · {words.opens({ days: daysLeft(s) })}</p>
        {beside > 0 && <p className="note">{beside === 1 ? `${s.me.branch.kids[0].name} hung theirs next to yours.` : `${beside} people hung theirs next to yours.`}</p>}
        <NextSteps onAsk={() => setShare(true)} onWalk={() => s.setPhase('explore')} onKey={() => setSave(true)} />
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
          : <button type="button" className="btn primary" onClick={() => s.setPhase('gave')}>See your Christmas</button>}
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
          <h3>Your Christmas</h3>
          <div className={'stats ' + (sum.figures.length === 3 ? 'three' : '')}>{sum.figures.map(([n, label]) => <div className="stat" key={label}><b>{n}</b><span>{label}</span></div>)}</div>
          <p>{sum.line}</p>
        </div>
        <button type="button" className="btn primary" onClick={() => s.setPhase('thanks')}>Say thank you</button>
      </div>
    </div>
  )
}

export function Thanks({ brand }) {
  useEffect(() => { const st = useStore.getState(); if (st.mine) uploadCardPreview(st.mine.token, 'thanks', previewWords(st, true)) }, [])
  const s = useStore(), [share, setShare] = useState(false), names = s.me.branch.kids.map(k => k.name), nye = s.clock.phase === 'nye'
  return (<>
    <div className="finale on">
      <div className="greet" />
      <div className="foot">
        <div className="tycard">
          <div className="hc small">{nye ? 'Happy New Year' : 'Thank you'}</div>
          <div className="nm small">from {s.branchName || s.myName}</div>
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
          {s.mine && <button type="button" className="btn primary" onClick={() => s.openMe(s.mine.token)}>See my ornament</button>}
          {d.names.length > 0 && <p className="ks-names">{d.names.join(' · ')}</p>}</>}
      </div>
    </div>
  )
}
