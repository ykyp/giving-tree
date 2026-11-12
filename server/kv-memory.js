// The same small store in memory, for local development (saved to a file) and the no-server demo (saved in the browser).
export function memoryKv({ load, save, now = Date.now } = {}) {
  const m = new Map(Object.entries(load?.() || {}))
  const persist = () => save?.(Object.fromEntries(m))
  const read = k => { const e = m.get(k); if (e && e.x && e.x <= now()) { m.delete(k); return undefined } return e }
  return {
    get: async k => read(k)?.v ?? null,
    mget: async keys => keys.map(k => read(k)?.v ?? null),
    set: async (k, v, { nx, exat } = {}) => { if (nx && read(k)) return false; m.set(k, { v, x: exat }); persist(); return true },
    del: async k => { m.delete(k); persist() },
    incrby: async (k, n) => { const e = read(k), v = Number(e?.v || 0) + n; m.set(k, { v: String(v), x: e?.x }); persist(); return v },
    rpush: async (k, v) => { const e = read(k) || { v: [] }; e.v = [...e.v, v]; m.set(k, e); persist(); return e.v.length },
    lrange: async k => read(k)?.v || [],
    expireat: async (k, ms) => { const e = read(k); if (e) { e.x = ms; persist() } },
  }
}
