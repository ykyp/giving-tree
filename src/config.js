// Brand trees (spec §5 of v2). Brands below are fictional examples; charities are placeholders until an agreement is signed.
export const BRANDS = {
  mosaicads: { slug: 'mosaicads', name: 'MosaicAds', title: 'The MosaicAds Giving Tree', accent: '#ff4f8b', star: 'classic', mono: null,
    palette: ['#a5122a', '#0e5a3c', '#1b2d6b', '#ff4f8b', '#b8891c', '#c9ced8'],
    charity: { name: 'a UK food charity', reg: 'to be confirmed' }, per: 10, cap: 50000, start: '1 Dec', end: '31 Dec 2026', opened: 3142, payout: 'Paid to the charity every Monday' },
  larkfield: { slug: 'larkfield', name: 'Larkfield Coffee', title: 'The Larkfield Giving Tree', accent: '#e0703f', star: 'logo', mono: 'L',
    palette: ['#8f2318', '#e0703f', '#efdcc0', '#3b2a20', '#b8891c', '#0e5a3c'],
    charity: { name: 'a UK homelessness charity', reg: 'to be confirmed' }, per: 10, cap: 25000, start: '1 Dec', end: '24 Dec 2026', opened: 2390, payout: 'Larkfield pays the charity weekly' },
  fernfield: { slug: 'fernfield', name: 'Fern & Field', title: 'The Fern & Field Giving Tree', accent: '#8fd0b0', star: 'classic', mono: 'F',
    palette: ['#2f6b4f', '#8fd0b0', '#efe9da', '#a5122a', '#b8891c', '#1b2d6b'],
    charity: { name: 'a UK wildlife charity', reg: 'to be confirmed' }, per: 20, cap: 40000, start: '1 Dec', end: '31 Dec 2026', opened: 880, payout: 'Fern & Field pays the charity weekly' },
}
export const NAMES = ['Aisha','Tom','Eleni','Priya','Sam','Jonas','Chloe','Nikos','Fatima','Leo','Grace','Omar','Hana','Ben','Maya','Ollie','Zara','Theo','Ines','Kofi','Lucy','Arjun','Sofia','Dan','Mei','Elias','Ruth','Yusuf','Anna','Felix','Nora','Kwame','Ivy','Marco','Lena','Josh','Amara','Pavel','Rosa','Tariq']
export const DESIGN_META = [
  { id: 'glass', label: 'Glass bauble', sub: 'Name engraved in gold script' },
  { id: 'stripe', label: 'Candy stripe', sub: 'Hand-painted band with your name' },
  { id: 'finial', label: 'Teardrop finial', sub: 'Ribbed metal, engraved band' },
  { id: 'mosaic', label: 'Mosaic mirror ball', sub: 'Our signature, with a name tag' },
  { id: 'star', label: 'Gold star', sub: 'Brushed gold, with a name tag' },
  { id: 'flake', label: 'Pearl snowflake', sub: 'Pearl white, with a name tag' },
  { id: 'icicle', label: 'Glass icicle', sub: 'Frosted glass drop, engraved' },
  { id: 'brand', label: 'Brand bauble', sub: 'Brand mark on one side, you on the other' },
]
// World layout (metres). Square centred on the origin, the lane runs along +z.
export const TREE = { base: 0.9, top: 9.0 }
export const CRATE = [0, 0, 4.9]
export const HELD = [0, 1.75, 5.6]
export const BLOCK = /(fuck|shit|cunt|nazi|hitler|admin|mosaicads|official)/i
