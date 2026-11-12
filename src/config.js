// How every tree looks. Trees themselves (name, whether giving is on) come from the server.
export const LOOK = { accent: '#f2c46d', star: 'classic', mono: null, palette: ['#a5122a', '#0e5a3c', '#1b2d6b', '#b8891c', '#c9ced8', '#7a2a5a'] }
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
export const TREE = { base: 0.9, top: 13.5 }
export const CRATE = [0, 0, 7.0]
export const HELD = [0, 1.75, 7.9]
export const BLOCK = /(fuck|shit|cunt|nazi|hitler|admin|mosaicads|official)/i
