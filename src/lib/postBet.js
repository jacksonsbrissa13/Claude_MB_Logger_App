const GAS_URL =
  'https://script.google.com/macros/s/AKfycbycKZyzdNYpbi6DZVkHFZbPGA13F2B8A2w08n6zkr2Oo0u19vLNdlfX5UYBjxqiiWpI/exec'

const RETRY_DELAY_MS = 1000

/**
 * Single HTTP attempt. Throws on network error or non-OK response.
 */
async function attempt(bet) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(bet),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(body || `HTTP ${res.status}`)
  }
}

/**
 * Post a single bet with one automatic retry on failure.
 * Returns { ok: true } or { ok: false, error: string }
 */
async function postOneBet(bet) {
  try {
    await attempt(bet)
    return { ok: true }
  } catch (firstErr) {
    const firstMsg = firstErr?.message ?? 'Network error'
    console.warn(`[postBet] ${bet.bookie} — first attempt failed: ${firstMsg}. Retrying in ${RETRY_DELAY_MS}ms…`)

    await new Promise(r => setTimeout(r, RETRY_DELAY_MS))

    try {
      await attempt(bet)
      console.info(`[postBet] ${bet.bookie} — retry succeeded.`)
      return { ok: true }
    } catch (retryErr) {
      const error = retryErr?.message ?? 'Network error'
      console.error(`[postBet] ${bet.bookie} — retry also failed: ${error}`)
      return { ok: false, error }
    }
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
