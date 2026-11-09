import { useStore } from '../store'
import { BRANDS } from '../config'

export default function Panel({ tier }) {
  const view = useStore(s => s.view), brandKey = useStore(s => s.brandKey), from = useStore(s => s.from), live = useStore(s => s.live), tierPref = useStore(s => s.tier)
  const st = useStore.getState()
  return (
    <section className="notes">
      <div className="eyebrow">MosaicAds · Christmas 2026 · v3, phase A</div>
      <h1>The Giving Tree</h1>
      <p className="lede">Fly into a snowy town square, light the tree, pick an ornament, write your name on it, then drag it onto a branch yourself. Every ornament on the tree carries the name of a card that gave.</p>
      <div className="ctl">
        <div>
          <span className="h" id="viewLbl">View</span>
          <div className="seg" role="group" aria-labelledby="viewLbl">
            {[['send', '1 · Send a card'], ['open', '2 · Open a card'], ['tree', '3 · The tree']].map(([v, l]) =>
              <button key={v} type="button" aria-pressed={view === v} onClick={() => st.restart(v)}>{l}</button>)}
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
          <li>Fly in over the rooftops, down the lane, under the arch. Tap to light the tree.</li>
          <li>Sender: pick from the crate, then type your name. It appears on the ornament letter by letter. Recipient: unwrap the box; the sender's ornament rises out.</li>
          <li>Drag the ornament onto a glowing hook. It swings on its thread and settles. "Auto-hang" if you'd rather not drag.</li>
          <li>Tap the star. Then send: the share sheet opens straight away, with no second form.</li>
          <li>Explore: drag, pinch, tap any ornament to see whose card gave.</li>
        </ol>
        <h2 style={{ marginTop: 18 }}>Phase A notes</h2>
        <ul>
          <li>Everything here is built in code. Bought models drop in through the asset pipeline when they arrive.</li>
          <li>Names, totals and other people's gifts are sample data; counting rules run in the page.</li>
          <li>Older phones and no-3D browsers get the <a href="https://claude.ai/artifact/SfR2824myak6ju7z7BjVCQ" target="_blank" rel="noopener">previous single-page version</a>.</li>
        </ul>
      </div>
    </section>
  )
}
