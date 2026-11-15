// The front door: your ornaments if this phone has any, and three ways in. Plain HTML first; the same words are in
// the page before this script runs (shared/shell.js), so it reads the same to people and search engines.
import { useEffect, useState } from 'react'
import { bootApi, get, post, myBranches } from '../lib/api'
import { copy, SITE } from '../../shared/copy.js'
import { LEDE, WAYS, FINE, STEPS, ICONS, HERO_ALT } from '../../shared/shell.js'
import { DESIGN_META } from '../config'
import ShareRow from '../ui/ShareRow'
import { clockOf, daysToChristmas, YEAR } from '../../shared/season.js'
import { WISH_MAX } from '../../shared/moderation.js'

const ERRORS = { bad_name: "That name can't be used. Try a first name, or a plain name for the tree.", bad_wish: 'Write a wish of up to 140 characters.', slow_down: 'Slow down a little and try again shortly.', frozen: 'The tree has closed for this year.', no_tree: "We couldn't find that tree." }
const say = e => ERRORS[e.code] || "That didn't work. Check your connection and try again."
const Icon = ({ k }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[k]} /></svg>
const firstWord = v => v.replace(/[^\p{L}' -]/gu, '').replace(/\s.*/, '').slice(0, 12)

function StartTree({ onBack }) {
  const [name, setName] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const go = async e => { e.preventDefault(); if (!name.trim() || busy) return; setBusy(true); setErr('')
    try { const t = await post('tree', { name }); location.href = `/t/${t.slug}` } catch (x) { setErr(x.code === 'slow_down' ? "You've started two trees today. Try again tomorrow." : say(x)); setBusy(false) } }
  return (
    <form className="card-form" onSubmit={go}>
      <h2>Start a tree for your people</h2>
      <p className="sub">Name it after the people it's for. You hang the first ornament and get a link to share. Everyone adds a wish and can open each other's.</p>
      <label htmlFor="treeName">The tree's name</label>
      <input id="treeName" className="field" autoFocus value={name} maxLength={40} placeholder="The Georgiou family" autoComplete="off" onChange={e => { setErr(''); setName(e.target.value) }} />
      <p className="err" role="alert">{err}</p>
      <div className="btnrow"><button type="button" className="btn ghost" onClick={onBack}>Back</button><button type="submit" className="btn primary" disabled={!name.trim() || busy}>Create the tree</button></div>
      <p className="fine">Only people with the link can find it. It isn't listed anywhere.</p>
    </form>
  )
}

function SendWish({ branches, onBack }) {
  const [from, setFrom] = useState(branches[0]?.name || ''), [to, setTo] = useState(''), [text, setText] = useState(''), [tree, setTree] = useState('global'), [design, setDesign] = useState(0), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [sent, setSent] = useState(null)
  const late = clockOf(new Date()).phase !== 'advent'
  const go = async e => { e.preventDefault(); if (busy) return; setBusy(true); setErr('')
    try { const r = await post('sent', { tree, from, to, text, design }); setSent({ link: `${location.origin}/w/${r.token}`, to, tree }) } catch (x) { setErr(say(x)); setBusy(false) } }
  if (sent) {
    const message = copy.sentMessage({ to: sent.to, late })
    return (
      <div className="card-form" role="status">
        <span className="pk" aria-hidden="true"><i className="pk-box" /><i className="pk-rv" /><i className="pk-lid"><i className="pk-rl" /><i className="pk-bow" /></i></span>
        <h2>{sent.to}'s ornament is ready</h2>
        <p className="sub">Send {sent.to} this link. They hang the ornament, and your wish goes under it{late ? '.' : ', wrapped until Christmas morning.'}</p>
        <p className="linkbox">{sent.link}</p>
        <ShareRow text={message} link={sent.link} />
        <p className="fine">Only the first person to hang it keeps the wish, so send it just to {sent.to}.</p>
        <a className="btn text" href={`/t/${sent.tree}`}>Hang your own ornament, so {sent.to} can send one back →</a>
      </div>
    )
  }
  return (
    <form className="card-form" onSubmit={go}>
      <h2>Make an ornament for a friend</h2>
      <p className="sub">Pick one, add their name and a wish. They hang it themselves{late ? '.' : ', and open the wish on Christmas morning.'}</p>
      <fieldset className="designs"><legend>Their ornament</legend>
        {DESIGN_META.map((d, i) => <label key={d.id}><input type="radio" name="design" checked={design === i} onChange={() => setDesign(i)} /><span>{d.label}</span></label>)}
      </fieldset>
      <div className="two">
        <div><label htmlFor="wFrom">Your first name</label><input id="wFrom" className="field" value={from} maxLength={12} autoComplete="given-name" onChange={e => { setErr(''); setFrom(firstWord(e.target.value)) }} /></div>
        <div><label htmlFor="wTo">Their first name</label><input id="wTo" className="field" value={to} maxLength={12} autoComplete="off" onChange={e => { setErr(''); setTo(firstWord(e.target.value)) }} /></div>
      </div>
      <label htmlFor="wText">Your wish for them</label>
      <textarea id="wText" className="field" rows={3} value={text} maxLength={WISH_MAX} placeholder="What do you wish for them?" onChange={e => { setErr(''); setText(e.target.value) }} />
      <div className="wf-meta"><span className="err" role="alert">{err}</span><span className="count">{text.length}/{WISH_MAX}</span></div>
      {branches.length > 0 && <><label htmlFor="wTree">Which tree?</label>
        <select id="wTree" className="field" value={tree} onChange={e => setTree(e.target.value)}>
          <option value="global">{SITE}</option>{branches.filter(b => b.tree !== 'global').map(b => <option key={b.tree} value={b.tree}>{b.treeName || b.tree}</option>)}
        </select></>}
      <div className="btnrow"><button type="button" className="btn ghost" onClick={onBack}>Back</button><button type="submit" className="btn primary" disabled={!from || !to || !text.trim() || busy}>Make it</button></div>
    </form>
  )
}

export default function Home() {
  const [mode, setMode] = useState(() => new URLSearchParams(location.search).get('start')), [ready, setReady] = useState(null), branches = myBranches()
  const closed = clockOf(new Date()).phase === 'keepsake'
  // how many ornaments are really on the shared tree, once the server has said
  const [count, setCount] = useState(0)
  useEffect(() => { bootApi().then(i => { setReady(!!i.ok); if (i.ok) get('tree/global').then(t => setCount(t.counts.ornaments)).catch(() => {}) }) }, [])
  const pick = m => e => { e.preventDefault(); history.replaceState(null, '', m ? `/?start=${m}` : '/'); setMode(m); window.scrollTo(0, 0) }
  if (!closed && ready && mode === 'tree') return <main className="pre home formpage"><StartTree onBack={pick(null)} /></main>
  if (!closed && ready && mode === 'wish') return <main className="pre home formpage"><SendWish branches={branches} onBack={pick(null)} /></main>
  const days = daysToChristmas(new Date()), on = clockOf(new Date()).phase
  const eyebrow = closed ? `Christmas ${YEAR}` : on === 'advent' ? (days === 1 ? 'Christmas is tomorrow' : `${days} days to Christmas`) : 'Happy Christmas'
  const year = new Date().getFullYear() - (new Date().getMonth() < 6 ? 1 : 0)
  return (
    <main className="landing">
      <header className="hero">
        <picture><img className="hero-img" src="/hero.jpg" alt={HERO_ALT} width="1920" height="1157" fetchpriority="high" /></picture>
        <div className="snow" aria-hidden="true" />
        <div className="hero-top">
          <p className="eyebrow">{eyebrow}{count > 0 && ` · ${count.toLocaleString('en-GB')} ${count === 1 ? 'ornament' : 'ornaments'} so far`}</p>
          <h1>{SITE}</h1>
          <p className="lede">{closed ? 'The tree is resting until next December. Everything that was hung this year is still here to look at.' : LEDE}</p>
        </div>
        <nav className="dock" aria-label={closed ? 'Look back' : 'Ways to begin'}>
          {branches.map(b => <a key={b.tree} className="glass return" href={`/me/${b.token}`}><Icon k="ornament" /><span><small>Welcome back, {b.name}</small>Open your ornament on {b.treeName || (b.tree === 'global' ? SITE : 'your tree')}</span><Icon k="arrow" /></a>)}
          {closed ? <a className="cta" href="/t/global"><Icon k="tree" /><span>See the {year} Giving Tree</span></a> : <>
            <a className="cta" href={WAYS[0].href}><Icon k="ornament" /><span>{branches.some(b => b.tree === 'global') ? 'Visit the Giving Tree' : WAYS[0].short}</span></a>
            <div className="dock-row">{WAYS.slice(1).map(w => <a key={w.href} className="glass" href={w.href} onClick={pick(w.mode)}><Icon k={w.icon} /><span>{w.short}</span></a>)}</div>
          </>}
          {ready === false && <p className="err" role="alert">The tree can't be reached just now. Please try again in a moment.</p>}
        </nav>
      </header>
      {!closed && <>
        <section className="band" aria-labelledby="how"><h2 id="how">How it works</h2>
          <ol className="steps">{STEPS.map((st, i) => <li key={st.title} className="step"><span className="num">{i + 1}</span><Icon k={st.icon} /><h3>{st.title}</h3><p>{st.text}</p></li>)}</ol></section>
        <section className="band" aria-labelledby="ways"><h2 id="ways">Three ways to begin</h2>
          <div className="paths">{WAYS.map(w => <a key={w.href} className="path" href={w.href} onClick={w.mode ? pick(w.mode) : undefined}><Icon k={w.icon} /><h3>{w.title}</h3><p>{w.text}</p><span className="go">{w.short} <Icon k="arrow" /></span></a>)}</div></section>
      </>}
      <footer className="foot-note"><p>{FINE}</p></footer>
    </main>
  )
}
