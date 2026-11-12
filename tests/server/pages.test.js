import test from 'node:test'
import assert from 'node:assert/strict'
import { pages, page, sitemap } from '../../shared/shell.js'
import { MONEY_WORDS } from '../../shared/copy.js'
import { world, ADMIN } from './helpers.js'

const words = html => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<head>[\s\S]*?<\/head>/, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
const body = html => html.slice(html.indexOf('<body>'))

test('pages: the home page has its own title, description and at least 50 readable words, and is indexable', () => {
  const html = page(pages.home(), 'https://tree.test')
  assert.match(html, /<title>The Giving Tree: hang an ornament, send a wish<\/title>/); assert.match(html, /<meta name="description" content="[^"]{60,}"/)
  assert.match(html, /<link rel="canonical" href="https:\/\/tree\.test\/">/); assert.equal(/noindex/.test(html), false)
  assert.ok(words(html) >= 50, `${words(html)} words`); assert.equal(MONEY_WORDS.test(body(html)), false)
  for (const href of ['/t/global', '/?start=tree', '/?start=wish']) assert.ok(html.includes(`href="${href}"`), href)
})

test('pages: the shared tree is indexable with real words; a tree someone created is not listed', async () => {
  const { call, card } = world(); await card('Maria', 'A')
  const g = await call('GET', 'page/t/global')
  assert.equal(g.status, 200); assert.match(g.text, /<title>The Giving Tree<\/title>/); assert.match(g.text, /1 ornament hung so far/); assert.equal(/noindex/.test(g.text), false); assert.ok(words(g.text) >= 50, `${words(g.text)} words`)
  const made = (await call('POST', 'tree', { body: { name: 'The Georgiou family' }, dev: 'T' })).json
  const t = await call('GET', `page/t/${made.slug}`)
  assert.match(t.text, /<title>The Georgiou family · The Giving Tree<\/title>/); assert.match(t.text, /<meta name="robots" content="noindex">/); assert.equal(t.headers['x-robots-tag'], 'noindex')
  const none = await call('GET', 'page/t/nope'); assert.equal(none.status, 404); assert.match(none.text, /couldn&#39;t find that tree|couldn't find that tree/)
})

test('pages: card, thank-you and sent-wish pages describe themselves, are not listed, and never carry tokens or wishes', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  await call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'SECRETWORDS for you' }, dev: 'B' })
  const sent = (await call('POST', 'sent', { body: { tree: 'global', from: 'Eleni', to: 'Tom', text: 'HIDDENWISH for Tom' }, dev: 'S' })).json
  const c = (await call('GET', `page/c/${A.id}`)).text, th = (await call('GET', `page/c/${A.id}`, { query: { t: '1' } })).text, w = (await call('GET', `page/w/${sent.token}`)).text
  assert.match(c, /<title>Maria hung an ornament on the Giving Tree<\/title>/); assert.match(th, /Thank you from Maria&#39;s branch/); assert.match(w, /<title>A wish for Tom, from Eleni<\/title>/)
  for (const html of [c, th, w]) { assert.match(html, /noindex/); assert.equal(html.includes(A.token), false); assert.equal(/SECRETWORDS|HIDDENWISH/.test(html), false); assert.equal(MONEY_WORDS.test(body(html)), false); assert.match(html, /og:image" content="[^"]+\/og\.jpg"/) }
  assert.equal(w.includes(sent.token), false)
  assert.equal((await call('GET', 'page/c/nope')).status, 404); assert.equal((await call('GET', 'page/w/nope')).status, 404)
})

test('pages: people and search engines get the same document', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  for (const path of ['page/t/global', `page/c/${A.id}`]) {
    const person = (await call('GET', path, { ua: 'Mozilla/5.0 (iPhone)' })).text, crawler = (await call('GET', path, { ua: 'Googlebot/2.1' })).text, chat = (await call('GET', path, { ua: 'WhatsApp/2.23' })).text
    assert.equal(person, crawler); assert.equal(person, chat)
  }
})

test('pages: the sitemap lists only the public pages', () => {
  const xml = sitemap('https://tree.test')
  assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]), ['https://tree.test/', 'https://tree.test/t/global'])
})
