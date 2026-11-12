import { useStore } from '../store'
import { BRANDS } from '../config'
import { api } from '../lib/api'

const DATES = [['', 'Today'], ['2026-12-05T10:00', '5 Dec · visit 1'], ['2026-12-25T09:00', '25 Dec · visit 2'], ['2026-12-31T18:30', '31 Dec · fireworks'], ['2027-01-01T00:02', 'Midnight, New Year'], ['2027-01-02T10:00', '2 Jan · keepsake']]

export default function Panel({ tier }) {
  const view = useStore(s => s.view), brandKey = useStore(s => s.brandKey), from = useStore(s => s.from), live = useStore(s => s.live), tierPref = useStore(s => s.tier)
  const st = useStore.getState()
  const info = useStore(s => s.apiInfo), mine = useStore(s => s.mine), demoDate = useStore(s => s.demoDate)
  const go = v => v === 'open' ? st.openDemo() : v === 'me' ? (mine ? st.openMe(mine.token) : st.toastMsg('Hang your ornament first.')) : st.restart(v)
  return (
    <section className="notes">
      <div className="eyebrow">MosaicAds · Christmas 2026 · two visits</div>
      <h1>The Giving Tree</h1>
      <p className="lede">Hang an ornament in December and seal a wish inside it. Come back on Christmas morning to open the wishes your friends and family left you. Every invitation and every thank-you still gives.</p>
      <div className="ctl">
        <div>
          <span className="h" id="viewLbl">View</span>
          <div className="seg" role="group" aria-labelledby="viewLbl">
            {[['send', '1 · Hang'], ['open', '2 · Invited'], ['me', '3 · My branch'], ['tree', '4 · Tree']].map(([v, l]) =>
              <button key={v} type="button" aria-pressed={view === v} onClick={() => go(v)}>{l}</button>)}
          </div>
        </div>
        <div className="row">
          <div><label className="h" htmlFor="brandSel">Tree</label>
            <select id="brandSel" className="field" value={brandKey} onChange={e => st.setBrand(e.target.value)}>
              {Object.values(BRANDS).map(b => <option key={b.slug} value={b.slug}>{b.slug === 'mosaicads' ? 'MosaicAds community' : `${b.name} (example)`}</option>)}
            </select></div>
          <div><label className="h" htmlFor="fromIn">Card is from</label>
            <input id="fromIn" className="field" defaultValue={from} maxLength={12} autoComplete="off" onBlur={e => st.setFrom(e.target.value)} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} /></div>
        </div>
        {info?.devClock && <div className="row">
          <div><label className="h" htmlFor="dateSel">Pretend it's</label>
            <select id="dateSel" className="field" value={demoDate} onChange={e => st.setDemoDate(e.target.value)}>
              {DATES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
          <button type="button" className="mini-btn" onClick={() => st.demoFriend()}>A friend hangs and wishes</button>
        </div>}
        {info && api.local && <p className="demo-note">Demo mode: no server connected, so everything is saved in this browser only.</p>}
        <div className="row" style={{ alignItems: 'center' }}>
          <button type="button" className="switch" role="switch" aria-checked={live} onClick={() => useStore.setState({ live: !live })}><span className="t" /><span>Gifts from other people</span></button>
          <button type="button" className="mini-btn" onClick={() => st.resetDevice()}>Reset this phone</button>
        </div>
        <div className="row" style={{ alignItems: 'center' }}>
          <label className="h" htmlFor="tierSel" style={{ margin: 0 }}>Quality</label>
          <select id="tierSel" className="field small-field" value={tierPref} onChange={e => useStore.setState({ tier: e.target.value })}>
            <option value="auto">Auto ({tier})</option><option value="high">High</option><option value="mid">Mid</option><option value="low">Low</option>
          </select>
        </div>
      </div>
      <div className="proto">
        <h2>The flow</h2>
        <ol>
          <li>1 to 24 December: light the tree, pick an ornament, write your name, hang it. The hooks around it stay free for the people you invite.</li>
          <li>Seal a wish for yourself, invite people to your branch, and save your Christmas link.</li>
          <li>Invited people meet your ornament, hang theirs on your branch and leave you a sealed wish.</li>
          <li>From 25 December: a short flight to your branch, open your parcels one by one, see what your branch gave, send a thank-you.</li>
          <li>31 December brings fireworks; after that the tree becomes a keepsake page.</li>
        </ol>
        <h2 style={{ marginTop: 18 }}>Notes</h2>
        <ul>
          <li>Everything here is built in code. Bought models drop in through the asset pipeline when they arrive.</li>
          <li>The other ornaments on the tree are sample data until real cards fill it.</li>
          <li>Older phones and no-3D browsers get the <a href="https://claude.ai/artifact/SfR2824myak6ju7z7BjVCQ" target="_blank" rel="noopener">previous single-page version</a>.</li>
        </ul>
      </div>
    </section>
  )
}
