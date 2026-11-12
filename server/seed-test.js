// Trees for the team's test mode only (local development, the testing deployment, the single-file demo).
// The public site starts with the global tree and nothing else.
import { GIVING_OFF } from './repo-memory.js'
export const TEST_TREES = [
  { slug: 'demo-family', kind: 'community', name: 'The Georgiou family', published: true, giving: { ...GIVING_OFF } },
  { slug: 'demo-giving', kind: 'community', name: 'Coffee Club', published: true,
    giving: { ...GIVING_OFF, enabled: true, status: 'live', sponsor: 'Example Coffee Co', charityName: 'Example Shelter', charityReg: '000000', perGift: 10, cap: 500, agreementSigned: true, payout: 'Paid to the charity every Monday' } },
]
