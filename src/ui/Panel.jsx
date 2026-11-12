// The team's test controls. Shown only in test mode (local development, the testing deployment, the single-file demo),
// never on the public site.
import { useStore } from '../store'
import { api } from '../lib/api'

const DATES = [['', 'Today'], ['2026-12-05T10:00', '5 Dec · visit 1'], ['2026-12-25T09:00', '25 Dec · visit 2'], ['2026-12-31T18:30', '31 Dec · fireworks'], ['2027-01-01T00:02', 'Midnight, New Year'], ['2027-01-02T10:00', '2 Jan · keepsake']]
const TREES = [['global', 'The global tree'], ['demo-family', 'A community tree'], ['demo-giving', 'A tree with giving on']]
const FRIENDS = ['Aisha', 'Tom', 'Eleni', 'Priya', 'Sam', 'Jonas', 'Chloe', 'Nikos', 'Fatima', 'Leo', 'Grace', 'Omar']
const WISHES = ['A year with fewer spreadsheets and more sea swims.', 'I hope the new house feels like home by spring.', 'Health for your mum, and time for you.', 'More long lunches. You deserve them.', 'That you finally get that dog.', 'Good news, kind people, and enough sleep.']
const pick = list => list[Math.floor(Math.random() * list.length)]

export default function Panel({ tier }) {
  const view = useStore(s => s.view), tree = useStore(s => s.tree), tierPref = useStore(s => s.tier), mine = useStore(s => s.mine), demoDate = useStore(s => s.demoDate)
  const st = useStore.getState()
  const go = v => v === 'send' ? st.openTree(tree.slug, { fresh: true }) : v === 'open' ? st.openDemo(pick(FRIENDS)) : v === 'me' ? (mine ? st.openMe(mine.token) : st.toastMsg('Hang your ornament first.')) : st.restart(v)
  return (
    <section className="notes">
      <div className="eyebrow">Test mode · not shown to the public</div>
      <h1>The Giving Tree</h1>
      <p className="lede">Hang an ornament and seal a wish inside it. Come back on Christmas morning to open the wishes your friends and family left you.</p>
      <div className="ctl">
        <div>
          <span className="h" id="viewLbl">View</span>
          <div className="seg" role="group" aria-labelledby="viewLbl">
            {[['send', '1 · Hang'], ['open', '2 · Invited'], ['me', '3 · My branch'], ['tree', '4 · Tree']].map(([v, l]) =>
              <button key={v} type="button" aria-pressed={view === v} onClick={() => go(v)}>{l}</button>)}
          </div>
        </div>
        <div className="row">
          <div><label className="h" htmlFor="treeSel">Tree</label>
            <select id="treeSel" className="field" value={tree.slug} onChange={e => st.openTree(e.target.value)}>
              {TREES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
          <div><label className="h" htmlFor="dateSel">Pretend it's</label>
            <select id="dateSel" className="field" value={demoDate} onChange={e => st.setDemoDate(e.target.value)}>
              {DATES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
        </div>
        <div className="row" style={{ alignItems: 'center' }}>
          <button type="button" className="mini-btn" onClick={() => st.demoFriend(pick(FRIENDS), pick(WISHES))}>A friend hangs and wishes</button>
          <button type="button" className="mini-btn" onClick={() => st.resetDevice()}>Reset this phone</button>
        </div>
        {api.local && <p className="demo-note">No server connected: everything is saved in this browser only.</p>}
        <div className="row" style={{ alignItems: 'center' }}>
          <label className="h" htmlFor="tierSel" style={{ margin: 0 }}>Quality</label>
          <select id="tierSel" className="field small-field" value={tierPref} onChange={e => useStore.setState({ tier: e.target.value })}>
            <option value="auto">Auto ({tier})</option><option value="high">High</option><option value="mid">Mid</option><option value="low">Low</option>
          </select>
        </div>
      </div>
      <div className="proto">
        <h2>What to try</h2>
        <ol>
          <li>Hang an ornament, seal a wish for yourself, and invite people. The tree shows only ornaments that were really hung.</li>
          <li>"A friend hangs and wishes" adds someone to your branch. "Reset this phone" makes this browser a new visitor.</li>
          <li>Set the date to 25 December to open the wishes; 31 December for fireworks; 2 January for the keepsake.</li>
          <li>The community tree keeps its own ornaments. The tree with giving on shows the sponsor, charity and pot; the others never mention money.</li>
        </ol>
      </div>
    </section>
  )
}
