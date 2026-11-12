// A tree's address, made from its name: "The Georgiou family" → georgiou-family-k3f9x.
// Readable when shared, unique without asking again, and not guessable from the name alone.
const TAIL = 'abcdefghijkmnpqrstuvwxyz23456789'
export const slugTail = () => [...crypto.getRandomValues(new Uint8Array(5))].map(b => TAIL[b % TAIL.length]).join('')
export function treeSlug(name, tail = slugTail()) {
  const base = String(name).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24).replace(/-+$/, '')
  return `${base || 'tree'}-${tail}`
}
