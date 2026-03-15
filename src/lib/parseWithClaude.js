/**
 * Parse a transcript into an array of bet objects.
 * Delegates to the /api/parse serverless function — the API key never
 * leaves the server and is never bundled into the frontend JS.
 *
 * @param {string} transcript - The spoken text to parse
 * @param {string[]} bookieList - Available bookies for name matching
 * @param {object|null} previousBet - Last confirmed bet (for "same as last" variations)
 * @returns {Promise<object[]>}
 */
export async function parseWithClaude(transcript, bookieList = [], previousBet = null) {
  const res = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, bookieList, previousBet }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  const bets = await res.json()
  return Array.isArray(bets) ? bets : [bets]
}
