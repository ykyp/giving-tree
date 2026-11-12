// What someone sees when they open a wish that was sent to them: who it's from, a wrapped parcel, and how to keep it.
// The words are never on this page. They arrive under the person's ornament, sealed like every other wish.
import { useEffect, useState } from 'react'
import { bootApi, get, post, myBranches } from '../lib/api'
import { SITE } from '../../shared/copy.js'
import { clockOf } from '../../shared/season.js'

export default function SentWish() {
  const token = location.pathname.split('/')[2] || '', [d, setD] = useState(null), [state, setState] = useState('loading'), [err, setErr] = useState('')
  const late = clockOf(new Date()).phase !== 'advent'
  useEffect(() => { (async () => {
    const info = await bootApi(); if (!info.ok) return setState('down')
    try {
      let w = await get(`sent/${token}`); const mine = myBranches().find(b => b.tree === w.tree.slug)
      if (mine) w = { ...(await get(`sent/${token}?me=${mine.token}`)), branch: mine }
      setD(w); setState('ready')
    } catch (e) { setState(e.code === 'no_wish' ? 'missing' : 'down') }
  })() }, [])
  if (state === 'loading') return <main className="pre home"><h1>{SITE}</h1><p className="fine">Loading.</p></main>
  if (state === 'down') return <main className="pre home"><h1>{SITE}</h1><p className="err" role="alert">The tree can't be reached just now. Please try again in a moment.</p></main>
  if (state === 'missing') return <main className="pre home"><h1>We couldn't find that wish</h1><p className="lede">It may have been removed, or the link may be incomplete.</p><a className="btn primary" href="/t/global">Go to the Giving Tree</a></main>
  const treeHref = `/t/${d.tree.slug}`
  const keep = () => { try { sessionStorage.setItem('gt-sent', JSON.stringify({ token, tree: d.tree.slug, from: d.from })) } catch (e) {} location.href = treeHref }
  const claim = async () => { setErr(''); try { await post(`sent/${token}/claim`, { me: d.branch.token }); location.href = `/me/${d.branch.token}` } catch (e) { setErr(e.code === 'claimed' ? 'This wish has already been opened.' : e.code === 'already' ? `${d.from} has already left you a wish.` : "That didn't work. Try again.") } }
  return (
    <main className="pre home sent">
      <span className="pk" aria-hidden="true"><i className="pk-box" /><i className="pk-rv" /><i className="pk-lid"><i className="pk-rl" /><i className="pk-bow" /></i></span>
      <div className="tag"><small>To</small> {d.to}<br /><small>from</small> {d.from}</div>
      {d.mine ? <><h1>You sent this wish to {d.to}</h1><p className="lede">It's waiting for {d.to} to hang an ornament.</p><a className="btn primary" href={d.branch ? `/me/${d.branch.token}` : treeHref}>{d.branch ? 'Go to my branch' : 'Hang your own ornament'}</a></>
        : d.claimed ? <><h1>This wish has been opened</h1><p className="lede">The person it was for has it now.</p><a className="btn primary" href={d.branch ? `/me/${d.branch.token}` : treeHref}>{d.branch ? 'Go to my branch' : `Go to ${d.tree.name}`}</a></>
        : d.closed ? <><h1>A wish for {d.to}, from {d.from}</h1><p className="lede">The tree has closed for this year, so this wish can no longer be opened.</p><a className="btn primary" href={treeHref}>See {d.tree.name}</a></>
        : <><h1>A wish for {d.to}, from {d.from}</h1>
          <p className="lede">{late ? 'Hang an ornament to open it.' : 'It is sealed until Christmas morning. Hang an ornament to keep it safe until then.'}</p>
          {d.canClaimHere ? <button type="button" className="btn primary" onClick={claim}>Put it under my ornament</button> : <button type="button" className="btn primary" onClick={keep}>Hang an ornament to keep it</button>}
          <p className="err" role="alert">{err}</p>
          <p className="fine">On {d.tree.name}. First names only, no account.</p></>}
    </main>
  )
}
