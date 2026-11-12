import test from 'node:test'
import assert from 'node:assert/strict'
import { copy, MONEY_WORDS } from '../../shared/copy.js'
import { world } from './helpers.js'

const clean = (text, where) => assert.equal(MONEY_WORDS.test(text), false, `${where} mentions money or a sponsor: ${text}`)

test('wishes first: with giving off, no sentence the page can show mentions money, a charity or a sponsor', () => {
  const counts = { ornaments: 3, wishes: 2 }, stats = { ornaments: 3, wishes: 2, opened: 4 }
  for (const late of [false, true]) { clean(copy.invite({ late }), 'invite'); for (const waiting of [0, 1, 4]) clean(copy.previewText({ giving: null, thanks: false, waiting, late }), 'preview') }
  for (const nye of [false, true]) clean(copy.thanks({ giving: null, given: 0, nye }), 'thanks')
  clean(copy.previewText({ giving: null, thanks: true, given: 0 }), 'thanks preview'); clean(copy.previewTitle({ name: 'Maria', thanks: true }), 'title')
  clean(copy.greetingNote({ giving: null }), 'greeting'); clean(copy.treeLine({ giving: null, counts }), 'tree line'); clean(copy.keepsake({ giving: null, counts }), 'keepsake')
  clean(copy.treeText(counts), 'tree preview'); clean(copy.treeText({ ornaments: 0 }), 'empty tree preview')
  const s = copy.summary({ giving: null, stats }); clean(JSON.stringify(s), 'summary'); assert.deepEqual(s.figures, [[3, 'ORNAMENTS'], [2, 'WISHES SHARED']])
  assert.equal(copy.disclosure({ giving: null }), null)
  for (const reason of ['off', 'own', 'again', 'bot']) assert.equal(copy.openLine({ giving: null, result: { counted: false, reason }, from: 'Maria' }), null)
  const c = copy.calendar({ url: 'https://x/me/t' }); clean(c.summary + c.description, 'calendar')
})

test('wishes first: previews, the calendar file and every API answer for a default tree are free of money wording', async () => {
  const { call, card } = world(), A = await card('Maria', 'A'); await call('POST', 'open', { body: { id: A.id }, dev: 'B' })
  await call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'A calm year' }, dev: 'B' })
  for (const q of [undefined, { t: '1' }]) clean((await call('GET', `preview/${A.id}`, { query: q })).text, 'card preview')
  clean((await call('GET', 'preview/tree/global')).text, 'tree preview'); clean((await call('GET', `ics/${A.token}`)).text, 'calendar file')
  for (const path of ['tree/global', 'keepsake/global', `card/${A.id}`, `me/${A.token}`]) {
    const j = (await call('GET', path)).json
    assert.equal(j.tree.giving, null); assert.equal(/given|perGift|sponsor|charity|"cap"/.test(JSON.stringify(j).replace('"giving":null', '')), false, path)
  }
})

test('giving on: the same sentences name the sponsor, the charity and exact amounts', async () => {
  const { call, card, givingTree } = world(); await givingTree()
  const A = await card('Maria', 'A', { tree: 'coffee' }); await call('POST', 'open', { body: { id: A.id }, dev: 'B' })
  const giving = (await call('GET', 'tree/coffee')).json.tree.giving
  assert.deepEqual(giving, { sponsor: 'Larkfield Coffee', charity: { name: 'Shelter Example', reg: '123456' }, perGift: 10, cap: 500, given: 10, status: 'live', starts: null, ends: null, payout: null })
  assert.match((await call('GET', `preview/${A.id}`)).text, /Larkfield Coffee gives 10p to Shelter Example/)
  assert.match((await call('GET', `preview/${A.id}`, { query: { t: '1' } })).text, /Our branch gave £0\.10 to Shelter Example/)
  assert.match(copy.disclosure({ giving }), /Shelter Example \(reg\. 123456\).*up to £5\.00/)
  assert.equal(copy.openLine({ giving, result: { counted: true }, from: 'Maria' }).text, "Opening Maria's card just gave 10p to Shelter Example, from Larkfield Coffee.")
  assert.equal(copy.openLine({ giving, result: { counted: false, reason: 'cap' }, from: 'Maria' }).text, 'The pot is complete: thank you.')
  assert.equal(copy.thanks({ giving, given: 90 }), 'Opened your wish, thank you! Our branch gave £0.90 to Shelter Example. Open yours →')
})

test('link previews: thank-you titles use the branch name; every preview has an image', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  assert.match((await call('GET', `preview/${A.id}`, { query: { t: '1' } })).text, /Thank you from Maria&#39;s branch/)
  await call('POST', `me/${A.token}/branch`, { body: { name: 'The Georgiou family' } })
  const p = (await call('GET', `preview/${A.id}`, { query: { t: '1' } })).text
  assert.match(p, /Thank you from The Georgiou family/); assert.match(p, /og:image" content="[^"]+\/og\.jpg"/)
  assert.match((await call('GET', 'preview/tree/global')).text, /og:title" content="The Giving Tree"/)
})
