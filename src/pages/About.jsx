// "About and privacy": the same sentences the server sends for /about (shared/shell.js), so it reads the same with or
// without the script. Who runs the site comes from the deployment's settings.
import { useEffect, useState } from 'react'
import { about } from '../../shared/shell.js'
import { SITE } from '../../shared/copy.js'
import { get } from '../lib/api'

export default function About() {
  const [who, setWho] = useState({})
  useEffect(() => { document.title = `About and privacy · ${SITE}`; get('site').then(setWho).catch(() => {}) }, [])
  return (
    <main className="pre about">
      <p className="fine"><a href="/">{SITE}</a></p>
      <h1>About and privacy</h1>
      {about(who).map(s => <section key={s.h}><h2>{s.h}</h2>{s.p.map(t => <p key={t}>{t}</p>)}</section>)}
    </main>
  )
}
