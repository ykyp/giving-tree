// Redis over its REST API (Upstash, from the Vercel Marketplace). No SDK needed for this handful of commands.
export function redisKv(url, token) {
  const cmd = async (...args) => {
    const r = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(args) })
    const j = await r.json()
    if (j.error) throw new Error(j.error)
    return j.result
  }
  return {
    get: k => cmd('GET', k),
    mget: keys => keys.length ? cmd('MGET', ...keys) : [],
    set: async (k, v, { nx, exat } = {}) => (await cmd('SET', k, v, ...(nx ? ['NX'] : []), ...(exat ? ['EXAT', Math.floor(exat / 1000)] : []))) === 'OK',
    del: k => cmd('DEL', k),
    incrby: (k, n) => cmd('INCRBY', k, n),
    rpush: (k, v) => cmd('RPUSH', k, v),
    lrange: k => cmd('LRANGE', k, 0, -1),
    expireat: (k, ms) => cmd('EXPIREAT', k, Math.floor(ms / 1000)),
  }
}
