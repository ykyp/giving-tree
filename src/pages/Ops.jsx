// The team's screen: wishes waiting for a decision, the trees, and the ornaments on a tree. Not linked from anywhere.
// Signing in is a link sent by email (Supabase Auth); the server then checks the address against the operators table
// on every request, so this page holds no rights of its own.
import { useEffect, useState } from 'react'

const KEY = 'gt-ops'
const read = () => { try { const t = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return t && t.until > Date.now() ? t : null } catch (e) { return null } }
/** The email link comes back with the session in the address's fragment. Keep it for this tab only, and clean the address. */
function fromLink() {
  const h = new URLSearchParams(location.hash.slice(1)), token = h.get('access_token'), error = h.get('error_description')
  if (token) { try { sessionStorage.setItem(KEY, JSON.stringify({ token, until: Date.now() + (Number(h.get('expires_in')) || 3600) * 1000 })) } catch (e) {} }
  if (token || error) history.replaceState(null, '', '/ops')
  return error
}
async function call(token, method, path, body) {
  const r = await fetch('/api/' + path, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined })
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || 'failed'), { status: r.status }); return j
}
const when = at => new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function SignIn({ auth, error }) {
  const [email, setEmail] = useState(''), [secret, setSecret] = useState(''), [state, setState] = useState(error ? 'error' : 'idle')
  const send = async e => { e.preventDefault(); setState('busy')
    try {
      const r = await fetch(`${auth.url}/auth/v1/otp?redirect_to=${encodeURIComponent(location.origin + '/ops')}`, { method: 'POST', headers: { apikey: auth.key, 'content-type': 'application/json' }, body: JSON.stringify({ email, create_user: true }) })
      setState(r.ok ? 'sent' : r.status === 429 ? 'slow' : 'error')
    } catch (x) { setState('error') } }
  // local development has no email: the dev server's own secret signs in
  const dev = e => { e.preventDefault(); sessionStorage.setItem(KEY, JSON.stringify({ token: secret, until: Date.now() + 36e5 })); location.reload() }
  if (!auth) return <form className="card-form" onSubmit={dev}><h2>Team sign-in (development)</h2><label htmlFor="opsS">Secret</label><input id="opsS" className="field" type="password" value={secret} onChange={e => setSecret(e.target.value)} /><button type="submit" className="btn primary" disabled={!secret}>Sign in</button></form>
  if (state === 'sent') return <div className="card-form" role="status"><h2>Check your email</h2><p className="sub">We sent a sign-in link to {email}. Open it on this device.</p></div>
  return (
    <form className="card-form" onSubmit={send}>
      <h2>Team sign-in</h2>
      <p className="sub">We'll email you a link. Only addresses on the team list can do anything here.</p>
      <label htmlFor="opsE">Email</label>
      <input id="opsE" className="field" type="email" autoComplete="email" value={email} onChange={e => { setState('idle'); setEmail(e.target.value) }} />
      <p className="err" role="alert">{state === 'error' ? (error || "That didn't send. Try again.") : state === 'slow' ? 'Too many tries. Wait a minute and try again.' : ''}</p>
      <button type="submit" className="btn primary" disabled={!email || state === 'busy'}>Send me a link</button>
    </form>
  )
}

function Review({ api, note }) {
  const [list, setList] = useState(null)
  const load = () => api('GET', 'admin/review').then(r => setList(r.wishes))
  useEffect(() => { load() }, [])
  const decide = async (w, action) => { await api('POST', `admin/review/${w.id}`, { action }); note(action === 'approve' ? 'Shown again.' : 'Rejected. Nobody will see it.'); load() }
  return (
    <section className="ops-sec" aria-label="Wishes waiting for a decision">
      <h2>Wishes waiting {list && <small>{list.length}</small>}</h2>
      {list && !list.length && <p className="sub">Nothing is waiting.</p>}
      {(list || []).map(w => <article key={w.id} className="ops-item">
        <p className="ops-text">{w.text}</p>
        <p className="fine">From {w.from} {w.kind === 'self' ? `· on their own ornament, open to everyone` : `· left for ${w.toName || 'someone'}, private`} · {w.treeName || w.tree} · {when(w.at)} · {w.reported ? 'reported by a visitor' : 'held by the word check'}</p>
        <div className="btnrow"><button type="button" className="btn ghost" onClick={() => decide(w, 'approve')}>Approve</button><button type="button" className="btn ghost danger" onClick={() => decide(w, 'reject')}>Reject</button></div>
      </article>)}
    </section>
  )
}

// how the 3D scene behaved on visitors' devices: counts only
const SCENE = [['no_webgl', 'no 3D'], ['gl_lost', 'picture lost'], ['gl_restored', 'came back'], ['scene_error', 'crashed'], ['chunk_error', 'script failed'], ['tier_low', 'dropped to low detail']]

function Trees({ api, note }) {
  const [trees, setTrees] = useState(null), [open, setOpen] = useState(null), [orns, setOrns] = useState([])
  const load = () => api('GET', 'admin/trees').then(r => setTrees(r.trees))
  useEffect(() => { load() }, [])
  const show = async slug => { if (open === slug) return setOpen(null); setOpen(slug); setOrns([]); try { setOrns((await api('GET', `tree/${slug}`)).ornaments) } catch (e) { setOrns([]) } }
  const takeDown = async t => { if (!confirm(`Take down "${t.name}"? Its link will stop working.`)) return; await api('POST', `admin/trees/${t.slug}/takedown`); note('Taken down.'); load() }
  const hide = async o => { await api('POST', `admin/cards/${o.id}/hide`, { hidden: true }); note(`${o.name}'s ornament is hidden.`); setOrns(l => l.filter(x => x.id !== o.id)) }
  const remove = async o => { if (!confirm(`Remove ${o.name}'s ornament and delete its wishes? This cannot be undone.`)) return; await api('POST', `admin/cards/${o.id}/remove`, { note: 'removed by an operator' }); note(`${o.name}'s ornament is removed.`); setOrns(l => l.filter(x => x.id !== o.id)) }
  return (
    <section className="ops-sec" aria-label="Trees">
      <h2>Trees {trees && <small>{trees.length}</small>}</h2>
      {(trees || []).map(t => <article key={t.slug} className="ops-item">
        <p className="ops-name"><a href={`/t/${t.slug}`}>{t.name}</a> {!t.published && <em>taken down</em>}</p>
        <p className="fine">{t.counts.ornaments} ornaments · {t.counts.wishes} wishes · /t/{t.slug}</p>
        {t.measures?.scene && <p className="fine">Scene health (all time, last 24 h): {SCENE.map(([k, label]) => `${label} ${t.measures.scene[k].total}, ${t.measures.scene[k].day}`).join(' · ')}</p>}
        <div className="btnrow"><button type="button" className="btn ghost" aria-expanded={open === t.slug} onClick={() => show(t.slug)}>{open === t.slug ? 'Hide ornaments' : 'Ornaments'}</button>
          {t.kind !== 'global' && t.published && <button type="button" className="btn ghost danger" onClick={() => takeDown(t)}>Take down</button>}</div>
        {open === t.slug && <ul className="ops-orns">{orns.length ? orns.map(o => <li key={o.id}><div><b>{o.name}</b>{o.wish && <span>{o.wish}</span>}</div>
          <button type="button" className="btn text" onClick={() => hide(o)}>Hide</button><button type="button" className="btn text danger" onClick={() => remove(o)}>Remove</button></li>) : <li><span>No ornaments to show.</span></li>}</ul>}
      </article>)}
    </section>
  )
}

export default function Ops() {
  const [linkError] = useState(fromLink), [auth, setAuth] = useState(undefined), [session, setSession] = useState(read), [state, setState] = useState('checking'), [msg, setMsg] = useState('')
  useEffect(() => { fetch('/api/ops/config').then(r => r.json()).then(j => setAuth(j.auth || null)).catch(() => setAuth(null)) }, [])
  useEffect(() => { if (!session) return setState('out'); call(session.token, 'GET', 'admin/review').then(() => setState('in'), e => setState(e.status === 401 ? 'refused' : 'down')) }, [session])
  const out = () => { sessionStorage.removeItem(KEY); setSession(null) }
  const api = (m, p, b) => call(session.token, m, p, b).catch(e => { setMsg(e.status === 401 ? 'Your sign-in has ended. Sign in again.' : "That didn't work. Try again."); if (e.status === 401) out(); throw e })
  return (
    <main className="pre home ops">
      <h1>The Giving Tree team</h1>
      {state === 'out' && auth !== undefined && <SignIn auth={auth} error={linkError} />}
      {state === 'refused' && <div className="card-form"><h2>This address isn't on the team list</h2><p className="sub">Ask whoever runs the site to add it, then sign in again.</p><button type="button" className="btn ghost" onClick={out}>Sign out</button></div>}
      {state === 'down' && <p className="err" role="alert">The tree can't be reached just now.</p>}
      {state === 'in' && <>
        <p className="fine" role="status">{msg || 'Signed in.'} <button type="button" className="btn text" onClick={out}>Sign out</button></p>
        <Review api={api} note={setMsg} /><Trees api={api} note={setMsg} />
      </>}
    </main>
  )
}
