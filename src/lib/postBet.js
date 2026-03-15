const GAS_URL =
  'https://script.google.com/macros/s/AKfycbycKZyzdNYpbi6DZVkHFZbPGA13F2B8A2w08n6zkr2Oo0u19vLNdlfX5UYBjxqiiWpI/exec'

/**
 * Post a single bet object to the Apps Script endpoint.
 * Returns { ok: true } or { ok: false, error: string }
 */
async function postOneBet(bet) {
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(bet),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`)
      return { ok: false, error: text }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message ?? 'Network error' }
  }
}

/**
 * Post an array of bets in parallel.
 * Returns an array of { bookie, ok, error? } results.
 */
export async function postBets(bets) {
  const results = await Promise.all(
    bets.map(async (bet) => {
      const result = await postOneBet(bet)
      return { bookie: bet.bookie, ...result }
    })
  )
  return results
}
