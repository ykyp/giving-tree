// Every sentence that changes with giving. `giving` is null for a wishes-only tree (the default), so nothing here may
// mention money, a charity or a sponsor unless a giving object is passed. Used by the page, the link previews and the
// calendar file, and checked by tests/server/wishes-first.test.js.
export const SITE = 'The Giving Tree'
export const money = p => '£' + (p / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const amt = p => p < 100 ? p + 'p' : money(p)
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`
const shortCharity = g => g.charity.name.replace(/^a UK /, 'a ')

export const copy = {
  /** The message someone sends to invite people to their branch. */
  invite: ({ late }) => `I hung an ornament on the Giving Tree. Hang yours next to mine and leave me a wish${late ? '' : ' for Christmas morning'} 🎄`,
  /** The thank-you message on and after 25 December. */
  thanks: ({ giving, given, nye }) => {
    const gave = giving && given > 0 ? ` ${nye ? 'We' : 'Our branch'} gave ${money(given)} to ${shortCharity(giving)}.` : ''
    return nye ? `Happy New Year from our branch!${gave} Open yours →` : `Opened your wish, thank you!${gave} Open yours →`
  },
  /** Link preview for a card. */
  previewTitle: ({ name, branchName, thanks }) => thanks ? `Thank you from ${branchName || `${name}'s branch`}` : `${name} hung an ornament on the Giving Tree`,
  previewText: ({ giving, thanks, waiting, given, late }) => {
    if (thanks) return giving && given > 0 ? `Our branch gave ${money(given)} to ${giving.charity.name}. Open yours.` : 'Open the wishes waiting for you.'
    const wishes = late ? 'Leave them a wish.' : waiting > 0 ? `${plural(waiting, 'wish', 'wishes')} waiting.` : 'Leave them a wish for Christmas morning.'
    return giving ? `${wishes} Open it and ${giving.sponsor} gives ${amt(giving.perGift)} to ${giving.charity.name}.` : `${wishes} Hang yours next to theirs.`
  },
  /** Link preview for a tree. */
  treeTitle: ({ name }) => name,
  treeText: ({ ornaments }) => ornaments > 0 ? `${plural(ornaments, 'ornament')} so far. Hang yours, and send wishes to the people you love.` : 'Hang an ornament, and send wishes to the people you love.',
  /** Shown under the greeting once your ornament is on the tree. */
  greetingNote: ({ giving }) => giving ? `${giving.sponsor} gives ${amt(giving.perGift)} to ${giving.charity.name} each time someone new opens your card, up to ${money(giving.cap)} in total.` : 'Invite the people you love. Their wishes wait under your ornament until Christmas morning.',
  /** What an invited person is told about the open. Null means say nothing. */
  openLine: ({ giving, result, from }) => {
    if (!giving || !result) return null
    if (result.counted) return { given: true, text: `Opening ${from}'s card just gave ${amt(giving.perGift)} to ${giving.charity.name}, from ${giving.sponsor}.` }
    const why = { own: "This is your own card, so opening it here doesn't give. It gives when someone else opens it.", again: 'This card has already given from this phone.', cap: 'The pot is complete: thank you.', paused: 'Giving is paused just now.', closed: 'Giving on this tree has ended.' }[result.reason]
    return why ? { given: false, text: why } : null
  },
  /** The Christmas summary under "Your branch". */
  summary: ({ giving, stats }) => giving
    ? { figures: [[stats.ornaments, plural(stats.ornaments, 'ORNAMENT').split(' ')[1]], [stats.gifts, 'CARDS OPENED'], [money(stats.given), 'GIVEN']], line: `to ${giving.charity.name}. The whole tree has given ${money(giving.given)}${giving.given >= giving.cap ? '. The pot is complete: thank you.' : '.'}` }
    : { figures: [[stats.ornaments, stats.ornaments === 1 ? 'ORNAMENT' : 'ORNAMENTS'], [stats.wishes, stats.wishes === 1 ? 'WISH SHARED' : 'WISHES SHARED']], line: stats.ornaments > 1 ? 'Yours, and one for everyone who joined you.' : 'Invite people and watch it grow.' },
  /** The tree's details and the keepsake. */
  treeLine: ({ giving, counts }) => giving ? `${money(giving.given)} given · ${plural(counts.ornaments, 'ornament')}` : `${plural(counts.ornaments, 'ornament')} · ${plural(counts.wishes, 'wish', 'wishes')}`,
  disclosure: ({ giving }) => giving ? `${giving.sponsor} gives ${amt(giving.perGift)} to ${giving.charity.name} (reg. ${giving.charity.reg}) for every card opened, up to ${money(giving.cap)}${giving.starts ? `, ${giving.starts} to ${giving.ends}` : ''}.${giving.payout ? ` ${giving.payout}.` : ''}` : null,
  keepsake: ({ giving, counts }) => giving ? `${money(giving.given)} given to ${giving.charity.name} by ${giving.sponsor}.` : `${plural(counts.ornaments, 'ornament')} hung and ${plural(counts.wishes, 'wish', 'wishes')} shared.`,
  calendar: ({ url }) => ({ summary: 'Open your Christmas wishes 🎁', description: `Your wishes are waiting on the Giving Tree: ${url}` }),
  reminderEmail: ({ url }) => ({ subject: 'Open your Christmas wishes 🎁', text: `Your wishes are ready on the Giving Tree: ${url}\n\nThis is the one email we said we'd send.` }),
}
/** Words that must never reach a visitor of a wishes-only tree. */
export const MONEY_WORDS = /£|\bpence\b|\dp\b|\bgives?\b|\bgave\b|\bpot\b|charit|donat|sponsor|mosaicads/i
